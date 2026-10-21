"use strict";

/* =====================================================================
   app.js  ·  Lógica de la aplicación (JavaScript vainilla)

   Secciones:
     1. CONFIGURACIÓN   → cliente de Supabase, estado y referencias al HTML
     2. UTILIDADES      → avisos, indicador de carga, errores, confirmación
     3. AUTENTICACIÓN   → login, cierre de sesión, revisar sesión
     4. DISCIPLINAS     → listar y agregar disciplinas
     5. ESTUDIANTES     → tabla, buscador, filtros, formulario (crear/editar),
                          desactivar y reactivar
     6. ASISTENCIA      → consultar y guardar (upsert) + puente con la vista hecha en React
     7. DASHBOARD       → métricas: estudiantes, pagos y asistencia de hoy
     8. NAVEGACIÓN      → mostrar una vista y ocultar las demás
     9. INICIO          → arranque de la aplicación
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

// Datos que la aplicación mantiene en memoria mientras hay una sesión iniciada.
// Se vacían al cerrar sesión (ver limpiarDatosDeLaSesion).
// (La vista Asistencia, hecha con React, guarda sus propios datos dentro de su componente.)
const estado = {
  vistaActual: "",             // nombre de la vista que se está mostrando ("dashboard", "asistencia"...)
  disciplinas: [],             // filas de la tabla "disciplinas"
  estudiantes: [],             // filas de "estudiantes" (activos e inactivos)
  disciplinasCargadas: false,  // true cuando la carga terminó bien (para no decir "no hay" si falló)
  estudiantesCargados: false,
  idEstudianteEnEdicion: null, // null = el formulario está creando uno nuevo

  dashboardCargado: false      // true cuando las métricas se cargaron bien al menos una vez
};

// Aquí guardamos los elementos del HTML que usamos con frecuencia.
// Se llena una sola vez en guardarReferenciasDelDOM().
const elementos = {};

// Guarda en "elementos" cada pieza del HTML que el código necesita tocar.
function guardarReferenciasDelDOM() {
  // Utilidades
  elementos.contenedorAvisos = document.getElementById("contenedor-avisos");
  elementos.indicadorCargando = document.getElementById("indicador-cargando");
  elementos.textoCargando = document.getElementById("texto-cargando");
  elementos.dialogoConfirmacion = document.getElementById("dialogo-confirmacion");
  elementos.tituloConfirmacion = document.getElementById("titulo-confirmacion");
  elementos.mensajeConfirmacion = document.getElementById("mensaje-confirmacion");
  elementos.botonConfirmar = document.getElementById("boton-confirmar");

  // Login
  elementos.vistaLogin = document.getElementById("vista-login");
  elementos.loginSubtitulo = document.getElementById("login-subtitulo");
  elementos.avisoConfiguracion = document.getElementById("aviso-configuracion");
  elementos.formularioLogin = document.getElementById("formulario-login");
  elementos.campoCorreo = document.getElementById("login-correo");
  elementos.campoContrasena = document.getElementById("login-contrasena");
  elementos.botonLogin = document.getElementById("boton-login");

  // Aplicación principal
  elementos.appPrincipal = document.getElementById("app-principal");
  elementos.usuarioCorreo = document.getElementById("usuario-correo");
  elementos.botonCerrarSesion = document.getElementById("boton-cerrar-sesion");
  elementos.avisoModoSinLogin = document.getElementById("aviso-modo-sin-login");

  // Disciplinas
  elementos.formularioDisciplina = document.getElementById("formulario-disciplina");
  elementos.campoNombreDisciplina = document.getElementById("campo-disciplina-nombre");
  elementos.listaDisciplinas = document.getElementById("lista-disciplinas");
  elementos.mensajeSinDisciplinas = document.getElementById("mensaje-sin-disciplinas");

  // Estudiantes: formulario
  elementos.botonNuevoEstudiante = document.getElementById("boton-nuevo-estudiante");
  elementos.panelFormularioEstudiante = document.getElementById("panel-formulario-estudiante");
  elementos.tituloFormularioEstudiante = document.getElementById("titulo-formulario-estudiante");
  elementos.formularioEstudiante = document.getElementById("formulario-estudiante");
  elementos.campoDisciplinaEstudiante = document.getElementById("campo-disciplina");
  elementos.ayudaAcudiente = document.getElementById("ayuda-acudiente");
  elementos.botonCancelarEstudiante = document.getElementById("boton-cancelar-estudiante");
  elementos.botonGuardarEstudiante = document.getElementById("boton-guardar-estudiante");

  // Estudiantes: buscador, filtros y tabla
  elementos.campoBusqueda = document.getElementById("filtro-texto");
  elementos.filtroDisciplina = document.getElementById("filtro-disciplina");
  elementos.filtroInactivos = document.getElementById("filtro-inactivos");
  elementos.contadorEstudiantes = document.getElementById("contador-estudiantes");
  elementos.mensajeSinEstudiantes = document.getElementById("mensaje-sin-estudiantes");
  elementos.contenedorTablaEstudiantes = document.getElementById("contenedor-tabla-estudiantes");
  elementos.cuerpoTablaEstudiantes = document.getElementById("cuerpo-tabla-estudiantes");
  elementos.plantillaFilaEstudiante = document.getElementById("plantilla-fila-estudiante");

  // Dashboard
  elementos.botonActualizarDashboard = document.getElementById("boton-actualizar-dashboard");
  elementos.textoActualizacionDashboard = document.getElementById("texto-actualizacion-dashboard");
  elementos.dashActivos = document.getElementById("dash-activos");
  elementos.dashAlDia = document.getElementById("dash-al-dia");
  elementos.dashPendientes = document.getElementById("dash-pendientes");
  elementos.dashVencidos = document.getElementById("dash-vencidos");
  elementos.dashFecha = document.getElementById("dash-fecha");
  elementos.dashAsistenciaConDatos = document.getElementById("dash-asistencia-con-datos");
  elementos.dashAsistenciaSinDatos = document.getElementById("dash-asistencia-sin-datos");
  elementos.dashAsistenciaSinEstudiantes = document.getElementById("dash-asistencia-sin-estudiantes");
  elementos.dashAsistenciaCifras = document.getElementById("dash-asistencia-cifras");
  elementos.dashPorcentaje = document.getElementById("dash-porcentaje");
  elementos.dashBarra = document.getElementById("dash-barra");
  elementos.dashBloquePresentes = document.getElementById("dash-bloque-presentes");
  elementos.dashBloqueAusentes = document.getElementById("dash-bloque-ausentes");
  elementos.dashPresentes = document.getElementById("dash-presentes");
  elementos.dashAusentes = document.getElementById("dash-ausentes");
  elementos.dashSinRegistrar = document.getElementById("dash-sin-registrar");
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

// Indica si la aplicación pide iniciar sesión. Solo NO la pide cuando config.js dice
// exactamente REQUIERE_INICIO_DE_SESION = false (modo sin inicio de sesión, temporal).
// Si la línea no existe o tiene cualquier otro valor, se pide iniciar sesión (lo seguro).
// "typeof" evita un error cuando config.js no tiene esa línea.
function requiereInicioDeSesion() {
  const modoSinLogin = typeof REQUIERE_INICIO_DE_SESION !== "undefined" && REQUIERE_INICIO_DE_SESION === false;
  return !modoSinLogin;
}

// Crea el cliente de Supabase con los datos de config.js.
// Sin inicio de sesión no se guarda ni se usa ninguna sesión: todas las peticiones
// van con el rol anónimo (y la base de datos decide qué le permite).
function crearClienteSupabase() {
  const opciones = requiereInicioDeSesion()
    ? { auth: { storageKey: CLAVE_DE_SESION } }
    : { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

  clienteSupabase = window.supabase.createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), opciones);
}


/* =====================================================================
   2. UTILIDADES
   ===================================================================== */

// Muestra un aviso (toast) en la esquina. tipo: "exito", "error" o "info".
// Usa textContent, así que el mensaje nunca se interpreta como HTML.
function mostrarAviso(mensaje, tipo = "info") {
  // Si ya hay un aviso idéntico en pantalla, no lo repetimos.
  const yaEstaEnPantalla = Array.from(elementos.contenedorAvisos.children)
    .some((aviso) => aviso.textContent === mensaje);
  if (yaEstaEnPantalla) {
    return;
  }

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
// "codigo" es el código de error de PostgreSQL que devuelve Supabase (ej. 23505).
function describirError(error) {
  const mensaje = error && error.message ? error.message : "";
  const codigo = error && error.code ? error.code : "";

  if (/invalid login credentials/i.test(mensaje)) {
    return "Correo o contraseña incorrectos.";
  }
  if (/email not confirmed/i.test(mensaje)) {
    return "Este usuario aún no tiene el correo confirmado en Supabase.";
  }
  if (/failed to fetch|networkerror|network request failed|fetch failed/i.test(mensaje)) {
    return "No se pudo conectar con Supabase. Revisa tu conexión a Internet y los datos de config.js.";
  }
  if (/estudiantes_acudiente_menores/.test(mensaje)) {
    return "Los estudiantes menores de " + EDAD_DE_MAYORIA + " años necesitan nombre y teléfono del acudiente.";
  }
  if (/jwt expired/i.test(mensaje) || codigo === "PGRST301") {
    return "Tu sesión expiró. Cierra sesión y vuelve a entrar.";
  }
  if (codigo === "42501") {
    return requiereInicioDeSesion()
      ? "No tienes permiso para hacer esto. Cierra sesión y vuelve a entrar."
      : "La base de datos no permite el acceso sin iniciar sesión. Ejecuta supabase/modo_sin_login.sql " +
        "en Supabase (o pon REQUIERE_INICIO_DE_SESION = true en config.js).";
  }
  if (codigo === "23505") {
    return "Ya existe un registro con ese valor.";
  }
  if (codigo === "23503") {
    return "Un dato relacionado ya no existe (por ejemplo, la disciplina o el estudiante). Recarga la página e inténtalo de nuevo.";
  }
  if (codigo === "23514") {
    return "Algún dato no cumple las reglas de la base de datos (revisa la edad y el estado de pago).";
  }
  return mensaje || "Ocurrió un error inesperado.";
}

// Devuelve la fecha de hoy como texto "AAAA-MM-DD" usando la hora de ESTE navegador.
// (No usamos toISOString(): eso da la fecha en hora UTC y, de noche, ya sería "mañana".)
function fechaDeHoy() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return anio + "-" + mes + "-" + dia;
}

// Convierte "2026-10-12" en "12/10/2026" para mostrarlo en los avisos.
function formatearFecha(fecha) {
  return fecha.split("-").reverse().join("/");
}

// Deja el texto en minúsculas y sin tildes, para comparar sin importar
// mayúsculas ni acentos ("Sofía" y "sofia" quedan iguales).
// normalize("NFD") separa cada letra de su tilde ("í" → "i" + "´") y el replace borra
// las tildes, que en Unicode son los caracteres de \u0300 a \u036f.
function normalizarTexto(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Muestra el diálogo de confirmación y espera la respuesta de la persona.
// Devuelve una promesa: true si pulsa el botón de confirmar, false si cancela (o pulsa Esc).
function pedirConfirmacion({ titulo, mensaje, textoConfirmar }) {
  return new Promise((resolver) => {
    elementos.tituloConfirmacion.textContent = titulo;
    elementos.mensajeConfirmacion.textContent = mensaje;
    elementos.botonConfirmar.textContent = textoConfirmar;

    // returnValue guarda el "value" del botón con el que se cerró el diálogo.
    elementos.dialogoConfirmacion.returnValue = "";
    elementos.dialogoConfirmacion.addEventListener(
      "close",
      () => resolver(elementos.dialogoConfirmacion.returnValue === "confirmar"),
      { once: true }
    );
    elementos.dialogoConfirmacion.showModal();
  });
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

// Vacía los datos que la app tenía en memoria y en pantalla (lista de estudiantes,
// formularios, búsquedas...). Se usa al volver al login para que, en un computador
// compartido, nadie vea datos de la sesión anterior.
function limpiarDatosDeLaSesion() {
  estado.vistaActual = "";
  estado.disciplinas = [];
  estado.estudiantes = [];
  estado.disciplinasCargadas = false;
  estado.estudiantesCargados = false;
  estado.idEstudianteEnEdicion = null;

  elementos.campoBusqueda.value = "";
  elementos.filtroInactivos.checked = false;
  elementos.formularioDisciplina.reset();
  cerrarFormularioEstudiante();
  cerrarVistaAsistencia();
  limpiarDashboardEnPantalla();

  llenarSelectsDeDisciplinas(); // sin disciplinas en "estado", los selects quedan vacíos
  dibujarListaDeDisciplinas();
  dibujarTablaEstudiantes();
}

// Muestra solo la pantalla de login y oculta la aplicación.
function mostrarLogin() {
  limpiarDatosDeLaSesion();
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

  // En el modo sin inicio de sesión no hay nada que iniciar: solo se muestra el aviso.
  if (!requiereInicioDeSesion()) {
    elementos.formularioLogin.classList.add("hidden");
    elementos.loginSubtitulo.textContent = "Configuración incompleta";
  }
}

// Modo sin inicio de sesión: entra directo a la aplicación, sin pedir correo ni contraseña.
// Se muestra el aviso permanente y se oculta el botón de cerrar sesión (no hay sesión).
function entrarSinInicioDeSesion() {
  elementos.avisoModoSinLogin.classList.remove("hidden");
  elementos.botonCerrarSesion.classList.add("hidden");
  mostrarAplicacion({ email: "Sin inicio de sesión" });
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
   4. DISCIPLINAS
   ===================================================================== */

// Crea un <option> para un <select> (usa textContent: el nombre nunca se interpreta como HTML).
function crearOpcion(valor, texto) {
  const opcion = document.createElement("option");
  opcion.value = valor;
  opcion.textContent = texto;
  return opcion;
}

// Rellena un <select> con las disciplinas. Conserva la opción elegida si todavía existe.
function llenarSelectDeDisciplinas(select, textoDeLaPrimeraOpcion) {
  const seleccionActual = select.value;

  select.replaceChildren(crearOpcion("", textoDeLaPrimeraOpcion));
  estado.disciplinas.forEach((disciplina) => {
    select.appendChild(crearOpcion(String(disciplina.id), disciplina.nombre));
  });

  select.value = seleccionActual;
  if (select.selectedIndex === -1) {
    select.selectedIndex = 0; // la opción elegida ya no existe: vuelve a la primera
  }
}

// Actualiza los selects de disciplinas: el filtro de la tabla y el del formulario.
// (El filtro de la vista Asistencia lo dibuja React.)
function llenarSelectsDeDisciplinas() {
  llenarSelectDeDisciplinas(elementos.filtroDisciplina, "Todas las disciplinas");
  llenarSelectDeDisciplinas(elementos.campoDisciplinaEstudiante, "Selecciona una disciplina");
}

// Dibuja la lista de disciplinas de la vista "Disciplinas".
function dibujarListaDeDisciplinas() {
  elementos.listaDisciplinas.replaceChildren();
  // El aviso "no hay disciplinas" solo se muestra si la carga salió bien y la lista está vacía.
  const mostrarAvisoDeVacio = estado.disciplinasCargadas && estado.disciplinas.length === 0;
  elementos.mensajeSinDisciplinas.classList.toggle("hidden", !mostrarAvisoDeVacio);

  estado.disciplinas.forEach((disciplina) => {
    const elemento = document.createElement("li");
    elemento.className = "rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm";
    elemento.textContent = disciplina.nombre;
    elementos.listaDisciplinas.appendChild(elemento);
  });
}

// Pide las disciplinas a Supabase y actualiza la pantalla.
// Devuelve true si todo salió bien y false si hubo un error.
async function cargarDisciplinas() {
  mostrarCargando("Cargando disciplinas...");
  try {
    const { data, error } = await clienteSupabase
      .from("disciplinas")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw error;

    estado.disciplinas = data;
    estado.disciplinasCargadas = true;
    llenarSelectsDeDisciplinas();
    dibujarListaDeDisciplinas();
    return true;
  } catch (error) {
    mostrarAviso("No se pudieron cargar las disciplinas. " + describirError(error), "error");
    return false;
  } finally {
    ocultarCargando();
  }
}

// Revisa el nombre de una disciplina nueva.
// Devuelve un texto con el problema, o "" si está bien.
function validarNombreDeDisciplina(nombre) {
  if (nombre === "") {
    return "Escribe el nombre de la disciplina.";
  }
  if (nombre.length < 2) {
    return "El nombre de la disciplina debe tener al menos 2 letras.";
  }
  if (nombre.length > 50) {
    return "El nombre de la disciplina no puede pasar de 50 letras.";
  }

  // La base de datos distingue mayúsculas y tildes ("Fútbol" y "futbol" serían distintas),
  // así que aquí comparamos sin ellas para evitar duplicados que se ven iguales.
  const yaExiste = estado.disciplinas.some(
    (disciplina) => normalizarTexto(disciplina.nombre) === normalizarTexto(nombre)
  );
  if (yaExiste) {
    return "Ya existe una disciplina llamada «" + nombre + "».";
  }
  return "";
}

// Se ejecuta al enviar el formulario de disciplinas: valida y guarda la nueva disciplina.
async function agregarDisciplina(evento) {
  evento.preventDefault();

  // trim quita espacios de los extremos; replace junta los espacios repetidos en uno solo.
  const nombre = elementos.campoNombreDisciplina.value.trim().replace(/\s+/g, " ");

  const problema = validarNombreDeDisciplina(nombre);
  if (problema !== "") {
    mostrarAviso(problema, "error");
    elementos.campoNombreDisciplina.focus();
    return;
  }

  mostrarCargando("Guardando disciplina...");
  try {
    const { error } = await clienteSupabase.from("disciplinas").insert({ nombre: nombre });
    if (error) throw error;

    elementos.formularioDisciplina.reset();
    mostrarAviso("Disciplina «" + nombre + "» agregada.", "exito");
    await cargarDisciplinas();
  } catch (error) {
    const mensaje = error.code === "23505"
      ? "Ya existe una disciplina con ese nombre."
      : describirError(error);
    mostrarAviso(mensaje, "error");
  } finally {
    ocultarCargando();
  }
}


/* =====================================================================
   5. ESTUDIANTES
   ===================================================================== */

// Texto y colores de la etiqueta de cada estado de pago.
const ESTILOS_DE_PAGO = {
  al_dia: { texto: "Al día", clases: "bg-emerald-100 text-emerald-800" },
  pendiente: { texto: "Pendiente", clases: "bg-amber-100 text-amber-800" },
  vencido: { texto: "Vencido", clases: "bg-rose-100 text-rose-800" },
};
const CLASES_DE_PAGO_INACTIVO = "bg-slate-200 text-slate-500";

// Edad mínima de la que se considera mayor de edad (por debajo, el acudiente es obligatorio).
const EDAD_DE_MAYORIA = 18;


/* ---------- Cargar y mostrar la tabla ---------- */

// Pide todos los estudiantes (activos e inactivos) a Supabase, con el nombre de su disciplina,
// y actualiza la tabla. El filtro de "Mostrar inactivos" se aplica después, en memoria.
// Nota: Supabase devuelve como máximo 1000 filas por consulta; para una academia es más que suficiente.
async function cargarEstudiantes() {
  mostrarCargando("Cargando estudiantes...");
  try {
    const { data, error } = await clienteSupabase
      .from("estudiantes")
      .select("*, disciplinas(nombre)")
      .order("nombre_completo", { ascending: true });
    if (error) throw error;

    estado.estudiantes = data;
    estado.estudiantesCargados = true;
    dibujarTablaEstudiantes();
  } catch (error) {
    mostrarAviso("No se pudieron cargar los estudiantes. " + describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

// Devuelve los estudiantes que cumplen el filtro de inactivos, la disciplina y el texto buscado.
// Los tres filtros se combinan: un estudiante debe cumplir todos.
function obtenerEstudiantesFiltrados() {
  const textoBuscado = normalizarTexto(elementos.campoBusqueda.value.trim());
  const idDisciplina = elementos.filtroDisciplina.value; // "" significa todas
  const mostrarInactivos = elementos.filtroInactivos.checked;

  return estado.estudiantes.filter((estudiante) => {
    if (!mostrarInactivos && !estudiante.activo) {
      return false;
    }
    if (idDisciplina !== "" && String(estudiante.disciplina_id) !== idDisciplina) {
      return false;
    }
    if (textoBuscado !== "" && !normalizarTexto(estudiante.nombre_completo).includes(textoBuscado)) {
      return false;
    }
    return true;
  });
}

// Pone un texto en el elemento de la fila que tenga data-texto="campo".
function ponerTextoEnFila(fila, campo, texto) {
  fila.querySelector('[data-texto="' + campo + '"]').textContent = texto;
}

// Arma el texto del acudiente: "Nombre · Teléfono", o solo lo que exista, o "—".
function describirAcudiente(estudiante) {
  const partes = [estudiante.acudiente_nombre, estudiante.acudiente_telefono].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : "—";
}

// Crea la fila de la tabla para un estudiante, copiando la plantilla del HTML.
function crearFilaDeEstudiante(estudiante) {
  const fila = elementos.plantillaFilaEstudiante.content.firstElementChild.cloneNode(true);
  const estaInactivo = !estudiante.activo;

  ponerTextoEnFila(fila, "nombre", estudiante.nombre_completo);
  ponerTextoEnFila(fila, "edad", estudiante.edad + " años");
  ponerTextoEnFila(fila, "disciplina", estudiante.disciplinas ? estudiante.disciplinas.nombre : "—");
  ponerTextoEnFila(fila, "categoria", estudiante.categoria || "—");
  ponerTextoEnFila(fila, "acudiente", describirAcudiente(estudiante));

  // Etiqueta del estado de pago (gris si el estudiante está inactivo)
  const estiloDePago = ESTILOS_DE_PAGO[estudiante.estado_pago];
  const etiquetaDePago = fila.querySelector('[data-texto="estado-pago"]');
  etiquetaDePago.textContent = estiloDePago.texto;
  etiquetaDePago.className += " " + (estaInactivo ? CLASES_DE_PAGO_INACTIVO : estiloDePago.clases);

  // La fila se pinta de gris con data-inactivo (lo detectan las clases group-data-[...] del HTML)
  fila.dataset.inactivo = estaInactivo ? "true" : "false";
  fila.querySelector('[data-texto="etiqueta-inactivo"]').classList.toggle("hidden", !estaInactivo);

  // Cada botón guarda el id del estudiante; manejarClicEnTablaDeEstudiantes lo lee al hacer clic
  fila.querySelectorAll("button[data-accion]").forEach((boton) => {
    boton.dataset.id = estudiante.id;
  });
  fila.querySelector('[data-accion="desactivar"]').classList.toggle("hidden", estaInactivo);
  fila.querySelector('[data-accion="reactivar"]').classList.toggle("hidden", !estaInactivo);

  return fila;
}

// Vuelve a dibujar la tabla según los filtros actuales.
function dibujarTablaEstudiantes() {
  const lista = obtenerEstudiantesFiltrados();
  const mostrarInactivos = elementos.filtroInactivos.checked;
  const totalSinFiltrar = estado.estudiantes.filter((e) => mostrarInactivos || e.activo).length;

  elementos.cuerpoTablaEstudiantes.replaceChildren();
  lista.forEach((estudiante) => {
    elementos.cuerpoTablaEstudiantes.appendChild(crearFilaDeEstudiante(estudiante));
  });

  // Mensaje cuando no hay nada que mostrar (solo si la carga salió bien:
  // si falló, ya hay un aviso de error y no queremos decir que "no hay estudiantes").
  const hayFilas = lista.length > 0;
  const mostrarMensajeDeVacio = estado.estudiantesCargados && !hayFilas;
  elementos.contenedorTablaEstudiantes.classList.toggle("hidden", !hayFilas);
  elementos.mensajeSinEstudiantes.classList.toggle("hidden", !mostrarMensajeDeVacio);
  elementos.mensajeSinEstudiantes.textContent = totalSinFiltrar === 0
    ? "Todavía no hay estudiantes. Pulsa «+ Nuevo estudiante» para agregar el primero."
    : "Ningún estudiante coincide con la búsqueda o el filtro.";

  elementos.contadorEstudiantes.textContent = estado.estudiantesCargados
    ? "Mostrando " + lista.length + " de " + totalSinFiltrar + " estudiantes"
    : "";
}

// Se ejecuta al hacer clic en cualquier parte de la tabla.
// Si el clic fue en un botón de acción, busca al estudiante y ejecuta la acción.
function manejarClicEnTablaDeEstudiantes(evento) {
  const boton = evento.target.closest("button[data-accion]");
  if (boton === null) {
    return;
  }

  const estudiante = estado.estudiantes.find((e) => String(e.id) === boton.dataset.id);
  if (estudiante === undefined) {
    return;
  }

  if (boton.dataset.accion === "editar") {
    abrirFormularioEstudiante(estudiante);
  } else if (boton.dataset.accion === "desactivar") {
    desactivarEstudiante(estudiante);
  } else if (boton.dataset.accion === "reactivar") {
    reactivarEstudiante(estudiante);
  }
}


/* ---------- Formulario: abrir, cerrar y leer ---------- */

// Muestra u oculta los asteriscos del acudiente y cambia el texto de ayuda,
// según la edad escrita: el acudiente es obligatorio solo para menores de 18.
function actualizarAyudaDeAcudiente() {
  const edadEscrita = elementos.formularioEstudiante.elements.edad.value;
  const esMenor = estudianteEsMenor(edadEscrita);

  elementos.formularioEstudiante.querySelectorAll("[data-marca-acudiente]").forEach((marca) => {
    marca.classList.toggle("hidden", !esMenor);
  });

  if (esMenor) {
    elementos.ayudaAcudiente.textContent = "Obligatorio: el estudiante es menor de " + EDAD_DE_MAYORIA + " años.";
    elementos.ayudaAcudiente.className = "mt-1 text-xs font-medium text-rose-600";
  } else {
    elementos.ayudaAcudiente.textContent = "Opcional para estudiantes de " + EDAD_DE_MAYORIA + " años o más.";
    elementos.ayudaAcudiente.className = "mt-1 text-xs text-slate-500";
  }
}

// Abre el formulario. Sin argumento crea un estudiante nuevo; con un estudiante, lo edita.
function abrirFormularioEstudiante(estudiante = null) {
  if (estado.disciplinas.length === 0) {
    mostrarAviso("Primero agrega al menos una disciplina.", "info");
    mostrarVista("disciplinas");
    return;
  }

  limpiarErroresDelFormulario();
  const formulario = elementos.formularioEstudiante;

  if (estudiante === null) {
    estado.idEstudianteEnEdicion = null;
    formulario.reset();
    elementos.tituloFormularioEstudiante.textContent = "Nuevo estudiante";
    elementos.botonGuardarEstudiante.textContent = "Guardar estudiante";
  } else {
    estado.idEstudianteEnEdicion = estudiante.id;
    formulario.elements.nombre_completo.value = estudiante.nombre_completo;
    formulario.elements.edad.value = estudiante.edad;
    formulario.elements.disciplina_id.value = String(estudiante.disciplina_id);
    formulario.elements.categoria.value = estudiante.categoria || "";
    formulario.elements.estado_pago.value = estudiante.estado_pago;
    formulario.elements.acudiente_nombre.value = estudiante.acudiente_nombre || "";
    formulario.elements.acudiente_telefono.value = estudiante.acudiente_telefono || "";
    elementos.tituloFormularioEstudiante.textContent = "Editar estudiante";
    elementos.botonGuardarEstudiante.textContent = "Guardar cambios";
  }

  actualizarAyudaDeAcudiente();
  elementos.panelFormularioEstudiante.classList.remove("hidden");
  elementos.panelFormularioEstudiante.scrollIntoView({ behavior: "smooth", block: "start" });
  formulario.elements.nombre_completo.focus({ preventScroll: true });
}

// Oculta el formulario y lo deja limpio.
function cerrarFormularioEstudiante() {
  estado.idEstudianteEnEdicion = null;
  elementos.formularioEstudiante.reset();
  limpiarErroresDelFormulario();
  actualizarAyudaDeAcudiente();
  elementos.panelFormularioEstudiante.classList.add("hidden");
}

// Lee lo que la persona escribió en el formulario (todo como texto, sin espacios sobrantes).
function leerDatosDelFormulario() {
  const campos = elementos.formularioEstudiante.elements;
  const limpiar = (texto) => texto.trim().replace(/\s+/g, " ");

  return {
    nombre_completo: limpiar(campos.nombre_completo.value),
    edad: campos.edad.value.trim(),
    disciplina_id: campos.disciplina_id.value,
    categoria: limpiar(campos.categoria.value),
    estado_pago: campos.estado_pago.value,
    acudiente_nombre: limpiar(campos.acudiente_nombre.value),
    acudiente_telefono: campos.acudiente_telefono.value.trim(),
  };
}


/* ---------- Formulario: validación ---------- */

// Indica si un texto es una edad válida: solo dígitos y un valor entre 3 y 99.
function edadEsValida(textoEdad) {
  return /^\d+$/.test(textoEdad) && Number(textoEdad) >= 3 && Number(textoEdad) <= 99;
}

// Indica si la edad escrita corresponde a un menor de 18 años.
// Si todavía no hay una edad numérica escrita, devuelve false.
function estudianteEsMenor(textoEdad) {
  return /^\d+$/.test(textoEdad) && Number(textoEdad) < EDAD_DE_MAYORIA;
}

// Indica si un teléfono tiene un formato razonable:
// solo dígitos, espacios, +, - y paréntesis, con entre 7 y 15 dígitos.
function telefonoEsValido(texto) {
  if (!/^[+()\-\s\d]+$/.test(texto)) {
    return false;
  }
  const cantidadDeDigitos = texto.replace(/\D/g, "").length;
  return cantidadDeDigitos >= 7 && cantidadDeDigitos <= 15;
}

// Revisa los datos del formulario y devuelve un objeto con los errores encontrados.
// La clave es el nombre del campo y el valor es el mensaje. Si está vacío, no hay errores.
// Las claves se agregan en el mismo orden en que aparecen los campos en pantalla.
function validarEstudiante(datos) {
  const errores = {};

  if (datos.nombre_completo.length < 3) {
    errores.nombre_completo = "Escribe el nombre completo (mínimo 3 letras).";
  }
  if (!edadEsValida(datos.edad)) {
    errores.edad = "La edad debe ser un número entero entre 3 y 99.";
  }
  if (datos.disciplina_id === "") {
    errores.disciplina_id = "Selecciona una disciplina.";
  }
  if (!ESTILOS_DE_PAGO[datos.estado_pago]) {
    errores.estado_pago = "Selecciona el estado de pago.";
  }

  // El acudiente (nombre y teléfono) es obligatorio solo si el estudiante es menor de 18.
  const esMenor = estudianteEsMenor(datos.edad);

  if (esMenor && datos.acudiente_nombre.length < 3) {
    errores.acudiente_nombre = "Escribe el nombre del acudiente (obligatorio para menores de " + EDAD_DE_MAYORIA + " años).";
  }
  if (esMenor && datos.acudiente_telefono === "") {
    errores.acudiente_telefono = "Escribe el teléfono del acudiente (obligatorio para menores de " + EDAD_DE_MAYORIA + " años).";
  } else if (datos.acudiente_telefono !== "" && !telefonoEsValido(datos.acudiente_telefono)) {
    errores.acudiente_telefono = "Escribe un teléfono válido (de 7 a 15 dígitos; puedes usar espacios, + y -).";
  }

  return errores;
}

// Muestra cada error bajo su campo, marca el campo en rojo y pone el cursor en el primero.
function mostrarErroresDelFormulario(errores) {
  const formulario = elementos.formularioEstudiante;
  const nombresDeCampo = Object.keys(errores);

  nombresDeCampo.forEach((nombre) => {
    formulario.elements[nombre].setAttribute("aria-invalid", "true");

    const parrafoDeError = formulario.querySelector('[data-error-de="' + nombre + '"]');
    parrafoDeError.textContent = errores[nombre];
    parrafoDeError.classList.remove("hidden");
  });

  formulario.elements[nombresDeCampo[0]].focus();
}

// Quita todos los errores del formulario.
function limpiarErroresDelFormulario() {
  const formulario = elementos.formularioEstudiante;

  formulario.querySelectorAll("[aria-invalid]").forEach((campo) => campo.removeAttribute("aria-invalid"));
  formulario.querySelectorAll("[data-error-de]").forEach((parrafo) => {
    parrafo.textContent = "";
    parrafo.classList.add("hidden");
  });
}

// Cuando la persona vuelve a escribir en un campo, se le quita su marca de error.
function quitarErrorDelCampoEditado(evento) {
  const campo = evento.target;
  if (!campo.name) {
    return;
  }
  campo.removeAttribute("aria-invalid");

  const parrafoDeError = elementos.formularioEstudiante.querySelector('[data-error-de="' + campo.name + '"]');
  if (parrafoDeError !== null) {
    parrafoDeError.textContent = "";
    parrafoDeError.classList.add("hidden");
  }
}


/* ---------- Guardar, desactivar y reactivar ---------- */

// Convierte un texto vacío en null, para guardar "sin dato" en la base de datos.
function textoONulo(texto) {
  return texto === "" ? null : texto;
}

// Arma el objeto que se envía a Supabase, con los tipos que espera cada columna.
function prepararRegistroDeEstudiante(datos) {
  return {
    nombre_completo: datos.nombre_completo,
    edad: Number(datos.edad),
    disciplina_id: Number(datos.disciplina_id),
    categoria: textoONulo(datos.categoria),
    acudiente_nombre: textoONulo(datos.acudiente_nombre),
    acudiente_telefono: textoONulo(datos.acudiente_telefono),
    estado_pago: datos.estado_pago,
  };
}

// Se ejecuta al enviar el formulario: valida y luego crea o actualiza el estudiante.
async function guardarEstudiante(evento) {
  evento.preventDefault();
  limpiarErroresDelFormulario();

  const datos = leerDatosDelFormulario();
  const errores = validarEstudiante(datos);
  if (Object.keys(errores).length > 0) {
    mostrarErroresDelFormulario(errores);
    mostrarAviso("Revisa los campos marcados en rojo.", "error");
    return;
  }

  const registro = prepararRegistroDeEstudiante(datos);
  const estaEditando = estado.idEstudianteEnEdicion !== null;

  mostrarCargando(estaEditando ? "Guardando cambios..." : "Guardando estudiante...");
  try {
    if (estaEditando) {
      // .select() al final hace que Supabase devuelva las filas modificadas,
      // así podemos avisar si el estudiante ya no existe.
      const { data, error } = await clienteSupabase
        .from("estudiantes")
        .update(registro)
        .eq("id", estado.idEstudianteEnEdicion)
        .select();
      if (error) throw error;
      if (data.length === 0) {
        throw new Error("No se encontró el estudiante. Puede que ya no exista; recarga la página.");
      }
    } else {
      const { error } = await clienteSupabase.from("estudiantes").insert(registro);
      if (error) throw error;
    }

    cerrarFormularioEstudiante();
    mostrarAviso(estaEditando ? "Cambios guardados." : "Estudiante creado.", "exito");
    await cargarEstudiantes();
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

// Cambia el campo "activo" de un estudiante (borrado lógico: el registro no se elimina).
async function cambiarEstadoActivo(estudiante, activo) {
  mostrarCargando(activo ? "Reactivando estudiante..." : "Desactivando estudiante...");
  try {
    const { data, error } = await clienteSupabase
      .from("estudiantes")
      .update({ activo: activo })
      .eq("id", estudiante.id)
      .select();
    if (error) throw error;
    if (data.length === 0) {
      throw new Error("No se encontró el estudiante. Puede que ya no exista; recarga la página.");
    }

    mostrarAviso(
      estudiante.nombre_completo + (activo ? " fue reactivado." : " fue desactivado."),
      "exito"
    );
    await cargarEstudiantes();
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

// Pide confirmación y, si la persona acepta, desactiva al estudiante.
async function desactivarEstudiante(estudiante) {
  const confirmado = await pedirConfirmacion({
    titulo: "¿Desactivar estudiante?",
    mensaje: estudiante.nombre_completo + " dejará de aparecer en la lista, en la asistencia y en el dashboard. " +
      "Podrás reactivarlo marcando «Mostrar inactivos».",
    textoConfirmar: "Desactivar",
  });

  if (confirmado) {
    await cambiarEstadoActivo(estudiante, false);
  }
}

// Reactiva a un estudiante inactivo (no pide confirmación porque se puede deshacer).
async function reactivarEstudiante(estudiante) {
  await cambiarEstadoActivo(estudiante, true);
}

// Se ejecuta al abrir la vista Estudiantes: carga las disciplinas y luego los estudiantes.
async function abrirVistaEstudiantes() {
  cerrarFormularioEstudiante();

  const disciplinasCargadas = await cargarDisciplinas();
  if (disciplinasCargadas) {
    await cargarEstudiantes();
  }
}


/* =====================================================================
   6. ASISTENCIA
   La pantalla (fecha, filtro, interruptores y botón de guardar) está hecha con REACT
   en el archivo asistencia-react.js. Aquí solo quedan:
     · las funciones que hablan con Supabase (consultar y guardar), y
     · el "puente" con React: abrir la vista, cerrarla y saber si hay cambios sin guardar.
   ===================================================================== */

// Fecha más antigua que se acepta (debe coincidir con el atributo min del campo de fecha).
const FECHA_MINIMA_DE_ASISTENCIA = "2000-01-01";

// Revisa la fecha elegida. Devuelve un texto con el problema, o "" si está bien.
// Como las fechas tienen formato AAAA-MM-DD, se pueden comparar como texto.
function validarFechaDeAsistencia(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return "Elige una fecha válida.";
  }
  if (fecha < FECHA_MINIMA_DE_ASISTENCIA) {
    return "La fecha es demasiado antigua.";
  }
  if (fecha > fechaDeHoy()) {
    return "No se puede registrar asistencia de una fecha futura.";
  }
  return "";
}

// Pide a Supabase los estudiantes activos y la asistencia ya guardada en esa fecha.
// Devuelve { estudiantes, guardada }: "guardada" es un objeto id del estudiante → true/false
// con los registros que ya existen. Si algo falla, lanza el error (quien la llama muestra el aviso).
async function consultarAsistenciaDeUnaFecha(fecha) {
  // .eq("activo", true): los estudiantes inactivos no aparecen en la asistencia.
  const respuestaEstudiantes = await clienteSupabase
    .from("estudiantes")
    .select("id, nombre_completo, categoria, disciplina_id, disciplinas(nombre)")
    .eq("activo", true)
    .order("nombre_completo", { ascending: true });
  if (respuestaEstudiantes.error) throw respuestaEstudiantes.error;

  const respuestaAsistencias = await clienteSupabase
    .from("asistencias")
    .select("estudiante_id, asistio")
    .eq("fecha", fecha);
  if (respuestaAsistencias.error) throw respuestaAsistencias.error;

  const guardada = {};
  respuestaAsistencias.data.forEach((registro) => {
    guardada[registro.estudiante_id] = registro.asistio;
  });

  return { estudiantes: respuestaEstudiantes.data, guardada: guardada };
}

// Guarda los registros de asistencia con UPSERT: si ya existía un registro de ese estudiante
// en esa fecha lo actualiza; si no, lo crea. Funciona gracias a la restricción
// UNIQUE (estudiante_id, fecha) de la base de datos. Si algo falla, lanza el error.
async function guardarRegistrosDeAsistencia(registros) {
  const { error } = await clienteSupabase
    .from("asistencias")
    .upsert(registros, { onConflict: "estudiante_id,fecha" });
  if (error) throw error;
}

// Si hay cambios sin guardar (hayCambios = true), pregunta si se pueden descartar.
// Devuelve true si se puede continuar.
async function confirmarDescartarCambios(hayCambios) {
  if (!hayCambios) {
    return true;
  }
  return await pedirConfirmacion({
    titulo: "¿Descartar cambios?",
    mensaje: "Marcaste asistencia que todavía no guardaste. Si continúas, esos cambios se perderán.",
    textoConfirmar: "Descartar",
  });
}


/* ---------- El "puente" con React ---------- */
// asistencia-react.js crea window.VistaAsistencia solo si React se pudo cargar.

// Muestra la vista Asistencia: React la dibuja desde cero, con la fecha de hoy.
function abrirVistaAsistencia() {
  if (!window.VistaAsistencia) {
    mostrarAviso("No se pudo cargar React, que necesita la vista Asistencia. Revisa tu conexión a Internet y recarga la página.", "error");
    return;
  }
  window.VistaAsistencia.abrir();
}

// Quita la vista Asistencia de la pantalla y borra sus datos (se usa al cerrar sesión).
function cerrarVistaAsistencia() {
  if (window.VistaAsistencia) {
    window.VistaAsistencia.cerrar();
  }
}

// Indica si en la vista Asistencia hay interruptores movidos que todavía no se guardaron.
function asistenciaTieneCambiosSinGuardar() {
  return Boolean(window.VistaAsistencia) && window.VistaAsistencia.tieneCambiosSinGuardar();
}


/* =====================================================================
   7. DASHBOARD
   ===================================================================== */

// Calcula el porcentaje de "parte" sobre "total" con un decimal (ejemplo: 77.8).
// El número nunca engaña: no muestra 100 si falta alguien, ni 0 si hay alguien.
function calcularPorcentaje(parte, total) {
  let porcentaje = Math.round((parte / total) * 1000) / 10;
  if (parte < total && porcentaje === 100) {
    porcentaje = 99.9;
  }
  if (parte > 0 && porcentaje === 0) {
    porcentaje = 0.1;
  }
  return porcentaje;
}

// Pasa un porcentaje a texto con coma decimal: 77.8 → "77,8%" y 100 → "100%".
function formatearPorcentaje(porcentaje) {
  return String(porcentaje).replace(".", ",") + "%";
}

// Calcula todas las cifras del dashboard a partir de dos listas:
//   estudiantesActivos → filas con id y estado_pago (solo los activos)
//   asistenciasDeHoy   → filas con estudiante_id y asistio (las guardadas para hoy)
// Solo cuentan los registros de estudiantes activos: si alguien se desactivó después de
// tomar asistencia, su registro se ignora, para que "registrados" + "sin registrar" = activos.
function calcularMetricasDelDashboard(estudiantesActivos, asistenciasDeHoy) {
  const idsActivos = new Set(estudiantesActivos.map((estudiante) => estudiante.id));
  const registros = asistenciasDeHoy.filter((registro) => idsActivos.has(registro.estudiante_id));

  const presentes = registros.filter((registro) => registro.asistio).length;
  const registrados = registros.length;

  return {
    activos: estudiantesActivos.length,
    alDia: estudiantesActivos.filter((e) => e.estado_pago === "al_dia").length,
    pendientes: estudiantesActivos.filter((e) => e.estado_pago === "pendiente").length,
    vencidos: estudiantesActivos.filter((e) => e.estado_pago === "vencido").length,
    presentes: presentes,
    ausentes: registrados - presentes,
    registrados: registrados,
    sinRegistrar: estudiantesActivos.length - registrados,
    // Sin registros no hay porcentaje (null): se muestra un texto en su lugar.
    porcentaje: registrados > 0 ? calcularPorcentaje(presentes, registrados) : null,
  };
}

// Escribe las cifras en las tarjetas. La tarjeta de asistencia tiene tres estados:
//   1) hay registros hoy              → porcentaje, barra, presentes, ausentes y sin registrar
//   2) nadie tiene registro hoy       → "Aún no se ha tomado asistencia hoy" y sin registrar
//   3) no hay estudiantes activos     → "No hay estudiantes activos todavía."
function dibujarDashboard(metricas, fechaHoy) {
  elementos.dashActivos.textContent = metricas.activos;
  elementos.dashAlDia.textContent = metricas.alDia;
  elementos.dashPendientes.textContent = metricas.pendientes;
  elementos.dashVencidos.textContent = metricas.vencidos;

  const hayActivos = metricas.activos > 0;
  const hayRegistros = metricas.registrados > 0;

  elementos.dashFecha.textContent = formatearFecha(fechaHoy);
  elementos.dashAsistenciaConDatos.classList.toggle("hidden", !hayRegistros);
  elementos.dashAsistenciaSinDatos.classList.toggle("hidden", !(hayActivos && !hayRegistros));
  elementos.dashAsistenciaSinEstudiantes.classList.toggle("hidden", hayActivos);
  elementos.dashAsistenciaCifras.classList.toggle("hidden", !hayActivos);
  elementos.dashBloquePresentes.classList.toggle("hidden", !hayRegistros);
  elementos.dashBloqueAusentes.classList.toggle("hidden", !hayRegistros);

  if (hayRegistros) {
    elementos.dashPorcentaje.textContent = formatearPorcentaje(metricas.porcentaje);
    elementos.dashBarra.style.width = metricas.porcentaje + "%";
    elementos.dashPresentes.textContent = metricas.presentes;
    elementos.dashAusentes.textContent = metricas.ausentes;
  }
  elementos.dashSinRegistrar.textContent = metricas.sinRegistrar;
}

// Deja el dashboard en blanco ("—"). Se usa al cerrar sesión para no dejar datos en pantalla.
function limpiarDashboardEnPantalla() {
  estado.dashboardCargado = false;

  [elementos.dashActivos, elementos.dashAlDia, elementos.dashPendientes, elementos.dashVencidos]
    .forEach((tarjeta) => { tarjeta.textContent = "—"; });

  elementos.dashFecha.textContent = "";
  elementos.textoActualizacionDashboard.textContent = "";
  elementos.dashAsistenciaConDatos.classList.add("hidden");
  elementos.dashAsistenciaSinDatos.classList.add("hidden");
  elementos.dashAsistenciaSinEstudiantes.classList.add("hidden");
  elementos.dashAsistenciaCifras.classList.add("hidden");
}

// Pide a Supabase los estudiantes activos y la asistencia guardada para HOY (fecha local),
// calcula las métricas y las muestra. Devuelve true si salió bien y false si hubo un error.
// Las dos consultas deben salir bien: si una falla no se cambia nada en pantalla.
// (Supabase devuelve como máximo 1000 filas por consulta; para una academia es suficiente.)
async function cargarDashboard() {
  mostrarCargando("Actualizando métricas...");
  try {
    const hoy = fechaDeHoy();

    const respuestaEstudiantes = await clienteSupabase
      .from("estudiantes")
      .select("id, estado_pago")
      .eq("activo", true);
    if (respuestaEstudiantes.error) throw respuestaEstudiantes.error;

    const respuestaAsistencias = await clienteSupabase
      .from("asistencias")
      .select("estudiante_id, asistio")
      .eq("fecha", hoy);
    if (respuestaAsistencias.error) throw respuestaAsistencias.error;

    const metricas = calcularMetricasDelDashboard(respuestaEstudiantes.data, respuestaAsistencias.data);
    dibujarDashboard(metricas, hoy);

    estado.dashboardCargado = true;
    const hora = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
    elementos.textoActualizacionDashboard.textContent = "Actualizado a las " + hora;
    return true;
  } catch (error) {
    mostrarAviso("No se pudieron cargar las métricas. " + describirError(error), "error");
    elementos.textoActualizacionDashboard.textContent = estado.dashboardCargado
      ? "No se pudieron actualizar las métricas. Las cifras que ves pueden estar desactualizadas."
      : "No se pudieron cargar las métricas.";
    return false;
  } finally {
    ocultarCargando();
  }
}

// Se ejecuta al pulsar "Actualizar": vuelve a cargar las métricas y confirma con un aviso.
async function actualizarDashboard() {
  const actualizado = await cargarDashboard();
  if (actualizado) {
    mostrarAviso("Métricas actualizadas.", "exito");
  }
}


/* =====================================================================
   8. NAVEGACIÓN
   ===================================================================== */

// Muestra la vista pedida y oculta las demás.
// También marca como activo el botón del menú que le corresponde
// y carga los datos que esa vista necesita.
function mostrarVista(nombreVista) {
  estado.vistaActual = nombreVista;

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

  if (nombreVista === "dashboard") {
    cargarDashboard();
  } else if (nombreVista === "estudiantes") {
    abrirVistaEstudiantes();
  } else if (nombreVista === "disciplinas") {
    cargarDisciplinas();
  } else if (nombreVista === "asistencia") {
    abrirVistaAsistencia();
  }
}

// Se ejecuta al pulsar un botón del menú. Si estás en Asistencia con cambios sin guardar,
// primero pregunta si se pueden descartar (también cuando pulsas el botón de la misma vista,
// porque eso vuelve a cargarla y borraría las marcas).
async function navegarAVista(nombreVista) {
  if (estado.vistaActual === "asistencia" && !(await confirmarDescartarCambios(asistenciaTieneCambiosSinGuardar()))) {
    return;
  }
  mostrarVista(nombreVista);
}


/* =====================================================================
   9. INICIO
   ===================================================================== */

// Conecta cada botón y formulario con la función que debe ejecutar.
function conectarEventos() {
  // Login y sesión
  elementos.formularioLogin.addEventListener("submit", iniciarSesion);
  elementos.botonCerrarSesion.addEventListener("click", cerrarSesion);

  // Menú de navegación
  document.querySelectorAll("[data-ir-a]").forEach((boton) => {
    boton.addEventListener("click", () => navegarAVista(boton.dataset.irA));
  });

  // Disciplinas
  elementos.formularioDisciplina.addEventListener("submit", agregarDisciplina);

  // Estudiantes: formulario
  elementos.botonNuevoEstudiante.addEventListener("click", () => abrirFormularioEstudiante());
  elementos.botonCancelarEstudiante.addEventListener("click", cerrarFormularioEstudiante);
  elementos.formularioEstudiante.addEventListener("submit", guardarEstudiante);
  elementos.formularioEstudiante.addEventListener("input", quitarErrorDelCampoEditado);
  elementos.formularioEstudiante.elements.edad.addEventListener("input", actualizarAyudaDeAcudiente);

  // Estudiantes: buscador, filtros y botones de la tabla
  elementos.campoBusqueda.addEventListener("input", dibujarTablaEstudiantes);
  elementos.filtroDisciplina.addEventListener("change", dibujarTablaEstudiantes);
  elementos.filtroInactivos.addEventListener("change", dibujarTablaEstudiantes);
  elementos.cuerpoTablaEstudiantes.addEventListener("click", manejarClicEnTablaDeEstudiantes);

  // Dashboard
  elementos.botonActualizarDashboard.addEventListener("click", actualizarDashboard);
}

// Punto de entrada: prepara la página y decide si mostrar el login o la aplicación
// (o entrar directo, si config.js desactiva el inicio de sesión).
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

  if (!requiereInicioDeSesion()) {
    entrarSinInicioDeSesion();
    return;
  }

  vigilarCierreDeSesion();
  await revisarSesion();
}

// Cuando el HTML termina de cargar, arranca la aplicación.
document.addEventListener("DOMContentLoaded", iniciarAplicacion);
