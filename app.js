"use strict";

/* =====================================================================
   app.js  ·  Lógica de la aplicación (JavaScript vainilla)

   Secciones:
     1. CONFIGURACIÓN   → cliente de Supabase y referencias al HTML
     2. UTILIDADES      → avisos, indicador de carga, errores
     3. AUTENTICACIÓN   → login, cierre de sesión, revisar sesión
     4. NAVEGACIÓN      → mostrar una vista y ocultar las demás
     5. INICIO          → arranque de la aplicación
   ===================================================================== */


/* =====================================================================
   1. CONFIGURACIÓN
   ===================================================================== */

// Cliente de Supabase: con él hablamos con la base de datos y la autenticación.
// Se crea en crearClienteSupabase(), cuando ya sabemos que la configuración es válida.
let clienteSupabase = null;

// Nombre con el que el SDK guarda la sesión en el localStorage del navegador.
// Lo fijamos nosotros para saber exactamente qué borrar al cerrar sesión.
const CLAVE_DE_SESION = "academia-sesion";

// Aquí guardamos los elementos del HTML que usamos con frecuencia.
// Se llena una sola vez en guardarReferenciasDelDOM().
const elementos = {};

// Guarda en "elementos" cada pieza del HTML que el código necesita tocar.
function guardarReferenciasDelDOM() {
  elementos.contenedorAvisos = document.getElementById("contenedor-avisos");
  elementos.indicadorCargando = document.getElementById("indicador-cargando");
  elementos.textoCargando = document.getElementById("texto-cargando");

  elementos.vistaLogin = document.getElementById("vista-login");
  elementos.avisoConfiguracion = document.getElementById("aviso-configuracion");
  elementos.formularioLogin = document.getElementById("formulario-login");
  elementos.campoCorreo = document.getElementById("login-correo");
  elementos.campoContrasena = document.getElementById("login-contrasena");
  elementos.botonLogin = document.getElementById("boton-login");

  elementos.appPrincipal = document.getElementById("app-principal");
  elementos.usuarioCorreo = document.getElementById("usuario-correo");
  elementos.botonCerrarSesion = document.getElementById("boton-cerrar-sesion");
}

// Indica si el SDK de Supabase (cargado por CDN en index.html) está disponible.
function sdkDeSupabaseCargado() {
  return typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function";
}

// Indica si config.js existe y tiene la URL y la clave escritas.
// "typeof" evita un error cuando config.js no existe y las variables no están definidas.
function configuracionEsValida() {
  return (
    typeof SUPABASE_URL === "string" && SUPABASE_URL.trim() !== "" &&
    typeof SUPABASE_ANON_KEY === "string" && SUPABASE_ANON_KEY.trim() !== ""
  );
}

// Crea el cliente de Supabase con los datos de config.js.
function crearClienteSupabase() {
  clienteSupabase = window.supabase.createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), {
    auth: { storageKey: CLAVE_DE_SESION },
  });
}


/* =====================================================================
   2. UTILIDADES
   ===================================================================== */

// Muestra un aviso (toast) en la esquina. tipo: "exito", "error" o "info".
// Usa textContent, así que el mensaje nunca se interpreta como HTML.
function mostrarAviso(mensaje, tipo = "info") {
  const colores = {
    exito: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
    info: "bg-slate-800 text-white",
  };

  const aviso = document.createElement("div");
  aviso.className = "pointer-events-auto rounded-lg px-4 py-3 text-sm font-medium shadow-lg " + (colores[tipo] || colores.info);
  aviso.setAttribute("role", tipo === "error" ? "alert" : "status");
  aviso.textContent = mensaje;
  elementos.contenedorAvisos.appendChild(aviso);

  // Los errores se quedan un poco más para que dé tiempo de leerlos.
  const milisegundos = tipo === "error" ? 7000 : 4000;
  setTimeout(() => aviso.remove(), milisegundos);
}

// Cuántas operaciones están cargando al mismo tiempo.
// Con el contador, el indicador solo se oculta cuando termina la última.
let operacionesEnCurso = 0;

// Muestra el indicador de "cargando" sobre la pantalla.
function mostrarCargando(texto = "Cargando...") {
  operacionesEnCurso++;
  elementos.textoCargando.textContent = texto;
  elementos.indicadorCargando.classList.remove("hidden");
}

// Oculta el indicador de "cargando" cuando ya no queda ninguna operación en curso.
function ocultarCargando() {
  operacionesEnCurso = Math.max(0, operacionesEnCurso - 1);
  if (operacionesEnCurso === 0) {
    elementos.indicadorCargando.classList.add("hidden");
  }
}

// Convierte un error técnico (casi siempre en inglés) en un mensaje claro en español.
function describirError(error) {
  const mensaje = error && error.message ? error.message : "";

  if (/invalid login credentials/i.test(mensaje)) {
    return "Correo o contraseña incorrectos.";
  }
  if (/email not confirmed/i.test(mensaje)) {
    return "Este usuario aún no tiene el correo confirmado en Supabase.";
  }
  if (/failed to fetch|networkerror|network request failed|fetch failed/i.test(mensaje)) {
    return "No se pudo conectar con Supabase. Revisa tu conexión a Internet y los datos de config.js.";
  }
  return mensaje || "Ocurrió un error inesperado.";
}


/* =====================================================================
   3. AUTENTICACIÓN
   ===================================================================== */

// Revisa si el correo y la contraseña tienen un formato aceptable.
// Devuelve un texto con el problema, o "" si todo está bien.
function validarCredenciales(correo, contrasena) {
  const formatoDeCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (correo === "") {
    return "Escribe tu correo electrónico.";
  }
  if (!formatoDeCorreo.test(correo)) {
    return "El correo no tiene un formato válido (ejemplo: nombre@dominio.com).";
  }
  if (contrasena === "") {
    return "Escribe tu contraseña.";
  }
  return "";
}

// Muestra solo la pantalla de login y oculta la aplicación.
function mostrarLogin() {
  elementos.appPrincipal.classList.add("hidden");
  elementos.vistaLogin.classList.remove("hidden");
  elementos.campoContrasena.value = "";
}

// Muestra la aplicación (oculta el login) y empieza en el Dashboard.
function mostrarAplicacion(usuario) {
  elementos.vistaLogin.classList.add("hidden");
  elementos.appPrincipal.classList.remove("hidden");
  elementos.usuarioCorreo.textContent = usuario.email;
  mostrarVista("dashboard");
}

// Muestra un aviso amarillo en el login cuando falta algo en la configuración,
// y bloquea el botón porque sin configuración no se puede iniciar sesión.
function mostrarProblemaDeConfiguracion(texto) {
  elementos.avisoConfiguracion.textContent = texto;
  elementos.avisoConfiguracion.classList.remove("hidden");
  elementos.botonLogin.disabled = true;
}

// Pregunta a Supabase si ya hay una sesión guardada en el navegador
// y muestra la pantalla que corresponda.
async function revisarSesion() {
  mostrarCargando("Revisando sesión...");
  try {
    const { data, error } = await clienteSupabase.auth.getSession();
    if (error) throw error;

    if (data.session) {
      mostrarAplicacion(data.session.user);
    } else {
      mostrarLogin();
    }
  } catch (error) {
    mostrarLogin();
    mostrarAviso(describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

// Se ejecuta al enviar el formulario de login: valida, inicia sesión y entra a la app.
async function iniciarSesion(evento) {
  evento.preventDefault(); // evita que el formulario recargue la página

  const correo = elementos.campoCorreo.value.trim();
  const contrasena = elementos.campoContrasena.value;

  const problema = validarCredenciales(correo, contrasena);
  if (problema !== "") {
    mostrarAviso(problema, "error");
    return;
  }

  mostrarCargando("Iniciando sesión...");
  try {
    const { data, error } = await clienteSupabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });
    if (error) throw error;

    mostrarAplicacion(data.user);
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

// Borra la sesión guardada en este navegador. Es la red de seguridad de cerrarSesion():
// así la sesión desaparece aunque el SDK no haya podido hacerlo (por ejemplo, sin Internet).
function borrarSesionDelNavegador() {
  try {
    localStorage.removeItem(CLAVE_DE_SESION);
  } catch (error) {
    // Si el navegador bloquea el almacenamiento no hay nada guardado que borrar.
  }
}

// Cierra la sesión SIEMPRE en este navegador, aunque falle la red (importante en computadores compartidos).
// scope "local" = solo termina la sesión de este navegador (no las de otros dispositivos).
// Si no se pudo avisar al servidor, la persona igual sale al login y ve un aviso.
async function cerrarSesion() {
  mostrarCargando("Cerrando sesión...");
  let avisoDeError = "";
  try {
    const { error } = await clienteSupabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  } catch (error) {
    avisoDeError = "La sesión se cerró en este navegador, pero no se pudo avisar a Supabase. " + describirError(error);
  } finally {
    // Pase lo que pase con el servidor, esto siempre se ejecuta.
    borrarSesionDelNavegador();
    mostrarLogin();
    ocultarCargando();
  }

  if (avisoDeError !== "") {
    mostrarAviso(avisoDeError, "error");
  }
}

// Avisa a la app cuando la sesión se cierra por otro motivo
// (por ejemplo, se cerró en otra pestaña o la sesión caducó).
// Aquí solo tocamos la pantalla; no hacemos consultas a Supabase dentro de este aviso.
function vigilarCierreDeSesion() {
  clienteSupabase.auth.onAuthStateChange((evento) => {
    if (evento === "SIGNED_OUT") {
      mostrarLogin();
    }
  });
}


/* =====================================================================
   4. NAVEGACIÓN
   ===================================================================== */

// Muestra la vista pedida y oculta las demás.
// También marca como activo el botón del menú que le corresponde.
function mostrarVista(nombreVista) {
  document.querySelectorAll("[data-vista]").forEach((seccion) => {
    const esLaPedida = seccion.dataset.vista === nombreVista;
    seccion.classList.toggle("hidden", !esLaPedida);
  });

  document.querySelectorAll("[data-ir-a]").forEach((boton) => {
    if (boton.dataset.irA === nombreVista) {
      boton.setAttribute("aria-current", "page");
    } else {
      boton.removeAttribute("aria-current");
    }
  });
}


/* =====================================================================
   5. INICIO
   ===================================================================== */

// Conecta cada botón y formulario con la función que debe ejecutar.
function conectarEventos() {
  elementos.formularioLogin.addEventListener("submit", iniciarSesion);
  elementos.botonCerrarSesion.addEventListener("click", cerrarSesion);

  document.querySelectorAll("[data-ir-a]").forEach((boton) => {
    boton.addEventListener("click", () => mostrarVista(boton.dataset.irA));
  });
}

// Punto de entrada: prepara la página y decide si mostrar el login o la aplicación.
async function iniciarAplicacion() {
  guardarReferenciasDelDOM();
  conectarEventos();

  if (!sdkDeSupabaseCargado()) {
    mostrarLogin();
    mostrarProblemaDeConfiguracion(
      "No se pudo cargar la librería de Supabase. Revisa tu conexión a Internet y recarga la página."
    );
    return;
  }

  if (!configuracionEsValida()) {
    mostrarLogin();
    mostrarProblemaDeConfiguracion(
      "Falta configurar Supabase. Copia config.example.js como config.js y escribe tu SUPABASE_URL y tu SUPABASE_ANON_KEY."
    );
    return;
  }

  crearClienteSupabase();
  vigilarCierreDeSesion();
  await revisarSesion();
}

// Cuando el HTML termina de cargar, arranca la aplicación.
document.addEventListener("DOMContentLoaded", iniciarAplicacion);
