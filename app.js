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
     6. ASISTENCIA      → fecha, interruptores presente/ausente y guardar (upsert)
     7. NAVEGACIÓN      → mostrar una vista y ocultar las demás
     8. INICIO          → arranque de la aplicación
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
const estado = {
  vistaActual: "",             // nombre de la vista que se está mostrando ("dashboard", "asistencia"...)
  disciplinas: [],             // filas de la tabla "disciplinas"
  estudiantes: [],             // filas de "estudiantes" (activos e inactivos)
  disciplinasCargadas: false,  // true cuando la carga terminó bien (para no decir "no hay" si falló)
  estudiantesCargados: false,
  idEstudianteEnEdicion: null, // null = el formulario está creando uno nuevo

  // Asistencia
  estudiantesActivos: [],      // estudiantes con activo = true (los que salen en la lista)
  asistenciaGuardada: {},      // id del estudiante → true/false, solo los que ya tienen registro en la fecha
  marcasDeAsistencia: {},      // id del estudiante → true (presente) / false (ausente): lo que muestran los interruptores
  asistenciaCargada: false,    // true cuando la carga de la fecha terminó bien
  asistenciaModificada: false, // true si se movió algún interruptor y todavía no se guardó
  fechaDeAsistencia: "",       // fecha cargada (con ESTA fecha se guarda)
  disciplinaDeAsistencia: ""   // filtro aplicado en la lista ("" = todas)
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
  elementos.avisoConfiguracion = document.getElementById("aviso-configuracion");
  elementos.formularioLogin = document.getElementById("formulario-login");
  elementos.campoCorreo = document.getElementById("login-correo");
  elementos.campoContrasena = document.getElementById("login-contrasena");
  elementos.botonLogin = document.getElementById("boton-login");

  // Aplicación principal
  elementos.appPrincipal = document.getElementById("app-principal");
  elementos.usuarioCorreo = document.getElementById("usuario-correo");
  elementos.botonCerrarSesion = document.getElementById("boton-cerrar-sesion");

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

  // Asistencia
  elementos.campoFechaAsistencia = document.getElementById("campo-fecha-asistencia");
  elementos.botonFechaHoy = document.getElementById("boton-fecha-hoy");
  elementos.filtroDisciplinaAsistencia = document.getElementById("filtro-disciplina-asistencia");
  elementos.mensajeSinAsistencia = document.getElementById("mensaje-sin-asistencia");
  elementos.contenedorAsistencia = document.getElementById("contenedor-asistencia");
  elementos.listaAsistencia = document.getElementById("lista-asistencia");
  elementos.resumenAsistencia = document.getElementById("resumen-asistencia");
  elementos.avisoSinGuardar = document.getElementById("aviso-sin-guardar");
  elementos.botonGuardarAsistencia = document.getElementById("boton-guardar-asistencia");
  elementos.plantillaFilaAsistencia = document.getElementById("plantilla-fila-asistencia");
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
    return "No tienes permiso para hacer esto. Cierra sesión y vuelve a entrar.";
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
function normalizarTexto(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
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
  limpiarAsistenciaEnPantalla();
  elementos.campoFechaAsistencia.value = "";

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

// Actualiza los selects de disciplinas: el filtro de la tabla, el del formulario y el de asistencia.
function llenarSelectsDeDisciplinas() {
  llenarSelectDeDisciplinas(elementos.filtroDisciplina, "Todas las disciplinas");
  llenarSelectDeDisciplinas(elementos.campoDisciplinaEstudiante, "Selecciona una disciplina");
  llenarSelectDeDisciplinas(elementos.filtroDisciplinaAsistencia, "Todas las disciplinas");
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

  // Cada botón guarda el id del estudiante; tabla.addEventListener lo lee al hacer clic
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
   ===================================================================== */

// Fecha más antigua que se acepta (debe coincidir con el atributo min del campo en index.html).
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

// Devuelve los estudiantes que se ven en la lista: los activos que cumplen el filtro de disciplina.
function obtenerEstudiantesDeAsistencia() {
  return estado.estudiantesActivos.filter((estudiante) => {
    return estado.disciplinaDeAsistencia === "" ||
      String(estudiante.disciplina_id) === estado.disciplinaDeAsistencia;
  });
}

// Pone los interruptores como estaban guardados en la base de datos.
// Los estudiantes que todavía no tienen registro en esa fecha empiezan como "presente".
function reiniciarMarcasDeAsistencia() {
  estado.marcasDeAsistencia = {};
  estado.estudiantesActivos.forEach((estudiante) => {
    const guardada = estado.asistenciaGuardada[estudiante.id];
    estado.marcasDeAsistencia[estudiante.id] = guardada === undefined ? true : guardada;
  });
  estado.asistenciaModificada = false;
}

// Vacía todo lo relacionado con la asistencia (datos en memoria y lista en pantalla).
function limpiarAsistenciaEnPantalla() {
  estado.estudiantesActivos = [];
  estado.asistenciaGuardada = {};
  estado.marcasDeAsistencia = {};
  estado.asistenciaCargada = false;
  estado.asistenciaModificada = false;
  estado.fechaDeAsistencia = "";
  estado.disciplinaDeAsistencia = "";
  elementos.filtroDisciplinaAsistencia.value = "";
  dibujarListaDeAsistencia();
}

// Cambia el texto y el color de "Presente / Ausente" junto al interruptor.
function pintarEstadoDelInterruptor(fila, presente) {
  const etiqueta = fila.querySelector('[data-texto="estado"]');
  etiqueta.textContent = presente ? "Presente" : "Ausente";
  etiqueta.className = "w-16 text-sm font-medium " + (presente ? "text-emerald-700" : "text-slate-500");
}

// Crea la fila de un estudiante, copiando la plantilla del HTML.
function crearFilaDeAsistencia(estudiante) {
  const fila = elementos.plantillaFilaAsistencia.content.firstElementChild.cloneNode(true);

  const disciplina = estudiante.disciplinas ? estudiante.disciplinas.nombre : null;
  const detalle = [disciplina, estudiante.categoria].filter(Boolean).join(" · ");

  ponerTextoEnFila(fila, "nombre", estudiante.nombre_completo);
  ponerTextoEnFila(fila, "detalle", detalle || "—");

  // "Sin registrar" aparece mientras ese estudiante no tenga registro guardado en esta fecha.
  const tieneRegistro = estado.asistenciaGuardada[estudiante.id] !== undefined;
  fila.querySelector('[data-texto="sin-registro"]').classList.toggle("hidden", tieneRegistro);

  const interruptor = fila.querySelector('[data-campo="interruptor"]');
  interruptor.dataset.id = estudiante.id;
  interruptor.checked = estado.marcasDeAsistencia[estudiante.id];
  interruptor.setAttribute("aria-label", "Asistencia de " + estudiante.nombre_completo);
  pintarEstadoDelInterruptor(fila, interruptor.checked);

  return fila;
}

// Actualiza el resumen ("Presentes: 8 · Ausentes: 1 · Total: 9") y el aviso de cambios sin guardar.
function actualizarResumenDeAsistencia() {
  const lista = obtenerEstudiantesDeAsistencia();
  const presentes = lista.filter((estudiante) => estado.marcasDeAsistencia[estudiante.id]).length;

  elementos.resumenAsistencia.textContent =
    "Presentes: " + presentes + " · Ausentes: " + (lista.length - presentes) + " · Total: " + lista.length;
  elementos.avisoSinGuardar.classList.toggle("hidden", !estado.asistenciaModificada);
}

// Vuelve a dibujar la lista de asistencia según el filtro de disciplina y las marcas actuales.
function dibujarListaDeAsistencia() {
  const lista = obtenerEstudiantesDeAsistencia();

  elementos.listaAsistencia.replaceChildren();
  lista.forEach((estudiante) => {
    elementos.listaAsistencia.appendChild(crearFilaDeAsistencia(estudiante));
  });

  // El mensaje de "no hay estudiantes" solo se muestra si la carga salió bien.
  const hayFilas = lista.length > 0;
  elementos.contenedorAsistencia.classList.toggle("hidden", !hayFilas);
  elementos.mensajeSinAsistencia.classList.toggle("hidden", !(estado.asistenciaCargada && !hayFilas));
  elementos.mensajeSinAsistencia.textContent = estado.estudiantesActivos.length === 0
    ? "No hay estudiantes activos. Agrégalos en la vista Estudiantes."
    : "No hay estudiantes activos en esta disciplina.";

  actualizarResumenDeAsistencia();
}

// Pide a Supabase los estudiantes activos y la asistencia ya guardada en esa fecha.
// Solo si todo sale bien se cambia la fecha cargada. Devuelve true o false.
async function cargarAsistencia(fecha) {
  mostrarCargando("Cargando asistencia...");
  try {
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

    estado.estudiantesActivos = respuestaEstudiantes.data;
    estado.asistenciaGuardada = {};
    respuestaAsistencias.data.forEach((registro) => {
      estado.asistenciaGuardada[registro.estudiante_id] = registro.asistio;
    });
    estado.fechaDeAsistencia = fecha;
    estado.asistenciaCargada = true;

    reiniciarMarcasDeAsistencia();
    dibujarListaDeAsistencia();
    return true;
  } catch (error) {
    mostrarAviso("No se pudo cargar la asistencia. " + describirError(error), "error");
    return false;
  } finally {
    ocultarCargando();
  }
}

// Si hay interruptores movidos sin guardar, pregunta si se pueden descartar.
// Devuelve true si se puede continuar.
async function confirmarDescartarCambios() {
  if (!estado.asistenciaModificada) {
    return true;
  }
  return await pedirConfirmacion({
    titulo: "¿Descartar cambios?",
    mensaje: "Marcaste asistencia que todavía no guardaste. Si continúas, esos cambios se perderán.",
    textoConfirmar: "Descartar",
  });
}

// Se ejecuta al cambiar la fecha: la valida, pide confirmación si hay cambios sin guardar
// y carga la asistencia de esa fecha. Si algo falla, el campo vuelve a la fecha anterior.
async function cambiarFechaDeAsistencia() {
  const campo = elementos.campoFechaAsistencia;
  const nuevaFecha = campo.value;

  if (nuevaFecha === estado.fechaDeAsistencia) {
    return;
  }

  const problema = validarFechaDeAsistencia(nuevaFecha);
  if (problema !== "") {
    mostrarAviso(problema, "error");
    campo.value = estado.fechaDeAsistencia;
    return;
  }

  if (!(await confirmarDescartarCambios())) {
    campo.value = estado.fechaDeAsistencia;
    return;
  }

  // Si la primera carga había fallado, todavía faltan las disciplinas del filtro: se piden otra vez.
  if (!estado.asistenciaCargada && !(await cargarDisciplinas())) {
    campo.value = estado.fechaDeAsistencia;
    return;
  }

  const cargada = await cargarAsistencia(nuevaFecha);
  if (!cargada) {
    campo.value = estado.fechaDeAsistencia;
  }
}

// Se ejecuta al elegir otra disciplina en el filtro de la lista de asistencia.
async function cambiarDisciplinaDeAsistencia() {
  const select = elementos.filtroDisciplinaAsistencia;
  const nuevaDisciplina = select.value;

  if (nuevaDisciplina === estado.disciplinaDeAsistencia) {
    return;
  }

  if (!(await confirmarDescartarCambios())) {
    select.value = estado.disciplinaDeAsistencia;
    return;
  }

  estado.disciplinaDeAsistencia = nuevaDisciplina;
  reiniciarMarcasDeAsistencia();
  dibujarListaDeAsistencia();
}

// Se ejecuta cuando se mueve un interruptor de la lista.
function manejarCambioDeInterruptor(evento) {
  const interruptor = evento.target;
  if (!interruptor.matches('input[data-campo="interruptor"]')) {
    return;
  }

  estado.marcasDeAsistencia[interruptor.dataset.id] = interruptor.checked;
  estado.asistenciaModificada = true;
  pintarEstadoDelInterruptor(interruptor.closest("li"), interruptor.checked);
  actualizarResumenDeAsistencia();
}

// Guarda la asistencia de los estudiantes que se ven en la lista, con UPSERT:
// si ya existía un registro de ese estudiante en esa fecha lo actualiza; si no, lo crea.
// Funciona gracias a la restricción UNIQUE (estudiante_id, fecha) de la base de datos.
async function guardarAsistencia() {
  // Se usa la fecha CARGADA (no lo que haya escrito en el campo), para que las marcas
  // de un día nunca se guarden bajo la fecha de otro.
  const fecha = estado.fechaDeAsistencia;

  const problema = validarFechaDeAsistencia(fecha);
  if (problema !== "") {
    mostrarAviso(problema, "error");
    return;
  }

  const estudiantes = obtenerEstudiantesDeAsistencia();
  if (estudiantes.length === 0) {
    mostrarAviso("No hay estudiantes en la lista para guardar.", "error");
    return;
  }

  const registros = estudiantes.map((estudiante) => ({
    estudiante_id: estudiante.id,
    fecha: fecha,
    asistio: estado.marcasDeAsistencia[estudiante.id],
  }));

  mostrarCargando("Guardando asistencia...");
  try {
    const { error } = await clienteSupabase
      .from("asistencias")
      .upsert(registros, { onConflict: "estudiante_id,fecha" });
    if (error) throw error;

    const presentes = registros.filter((registro) => registro.asistio).length;
    mostrarAviso(
      "Asistencia del " + formatearFecha(fecha) + " guardada: " +
        presentes + " presentes y " + (registros.length - presentes) + " ausentes.",
      "exito"
    );
    await cargarAsistencia(fecha); // vuelve a leer lo guardado
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

// Se ejecuta al abrir la vista Asistencia: empieza con la fecha de hoy y todos los estudiantes.
async function abrirVistaAsistencia() {
  const hoy = fechaDeHoy();
  limpiarAsistenciaEnPantalla();
  elementos.campoFechaAsistencia.max = hoy; // el calendario no deja elegir días futuros
  elementos.campoFechaAsistencia.value = hoy;

  const disciplinasCargadas = await cargarDisciplinas(); // llena el filtro de disciplinas
  if (disciplinasCargadas) {
    await cargarAsistencia(hoy);
  }
}


/* =====================================================================
   7. NAVEGACIÓN
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

  if (nombreVista === "estudiantes") {
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
  if (estado.vistaActual === "asistencia" && !(await confirmarDescartarCambios())) {
    return;
  }
  mostrarVista(nombreVista);
}


/* =====================================================================
   8. INICIO
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

  // Asistencia
  elementos.campoFechaAsistencia.addEventListener("change", cambiarFechaDeAsistencia);
  elementos.botonFechaHoy.addEventListener("click", () => {
    elementos.campoFechaAsistencia.max = fechaDeHoy();
    elementos.campoFechaAsistencia.value = fechaDeHoy();
    cambiarFechaDeAsistencia();
  });
  elementos.filtroDisciplinaAsistencia.addEventListener("change", cambiarDisciplinaDeAsistencia);
  elementos.listaAsistencia.addEventListener("change", manejarCambioDeInterruptor);
  elementos.botonGuardarAsistencia.addEventListener("click", guardarAsistencia);
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
