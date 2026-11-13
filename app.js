"use strict";

let clienteSupabase = null;

const estado = {
  vistaActual: "",
  usuario: null,
  disciplinas: [],
  estudiantes: [],
  servicios: [],
  mensajes: [],
  disciplinasCargadas: false,
  estudiantesCargados: false,
  serviciosCargados: false,
  mensajesCargados: false,
  idEstudianteEnEdicion: null,
  idServicioEnEdicion: null,
  dashboardCargado: false,
};

const elementos = {};

function guardarReferenciasDelDOM() {
  elementos.contenedorAvisos = document.getElementById("contenedor-avisos");
  elementos.indicadorCargando = document.getElementById("indicador-cargando");
  elementos.textoCargando = document.getElementById("texto-cargando");
  elementos.dialogoConfirmacion = document.getElementById("dialogo-confirmacion");
  elementos.tituloConfirmacion = document.getElementById("titulo-confirmacion");
  elementos.mensajeConfirmacion = document.getElementById("mensaje-confirmacion");
  elementos.botonConfirmar = document.getElementById("boton-confirmar");

  elementos.appPrincipal = document.getElementById("app-principal");
  elementos.fechaEncabezado = document.getElementById("fecha-encabezado");
  elementos.pantallaProblema = document.getElementById("pantalla-problema");
  elementos.textoProblema = document.getElementById("texto-problema");

  elementos.pantallaLogin = document.getElementById("pantalla-login");
  elementos.formularioLogin = document.getElementById("formulario-login");
  elementos.campoCorreo = document.getElementById("login-correo");
  elementos.campoContrasena = document.getElementById("login-contrasena");
  elementos.botonLogin = document.getElementById("boton-login");
  elementos.botonGoogle = document.getElementById("boton-google");
  elementos.avisoGoogle = document.getElementById("aviso-google");
  elementos.pantallaSinPermiso = document.getElementById("pantalla-sin-permiso");
  elementos.correoSinPermiso = document.getElementById("correo-sin-permiso");
  elementos.botonSalirSinPermiso = document.getElementById("boton-salir-sin-permiso");
  elementos.correoUsuario = document.getElementById("correo-usuario");
  elementos.botonCerrarSesion = document.getElementById("boton-cerrar-sesion");

  elementos.botonNuevoServicio = document.getElementById("boton-nuevo-servicio");
  elementos.panelFormularioServicio = document.getElementById("panel-formulario-servicio");
  elementos.tituloFormularioServicio = document.getElementById("titulo-formulario-servicio");
  elementos.formularioServicio = document.getElementById("formulario-servicio");
  elementos.campoDisciplinaServicio = document.getElementById("campo-servicio-disciplina");
  elementos.botonCancelarServicio = document.getElementById("boton-cancelar-servicio");
  elementos.botonGuardarServicio = document.getElementById("boton-guardar-servicio");
  elementos.contadorServicios = document.getElementById("contador-servicios");
  elementos.listaServiciosAdmin = document.getElementById("lista-servicios-admin");
  elementos.mensajeSinServiciosAdmin = document.getElementById("mensaje-sin-servicios-admin");

  elementos.listaMensajes = document.getElementById("lista-mensajes");
  elementos.contadorMensajes = document.getElementById("contador-mensajes");
  elementos.mensajeSinMensajes = document.getElementById("mensaje-sin-mensajes");
  elementos.filtroNoLeidos = document.getElementById("filtro-no-leidos");
  elementos.globoMensajes = document.getElementById("globo-mensajes");

  elementos.formularioDisciplina = document.getElementById("formulario-disciplina");
  elementos.campoNombreDisciplina = document.getElementById("campo-disciplina-nombre");
  elementos.listaDisciplinas = document.getElementById("lista-disciplinas");
  elementos.mensajeSinDisciplinas = document.getElementById("mensaje-sin-disciplinas");

  elementos.botonNuevoEstudiante = document.getElementById("boton-nuevo-estudiante");
  elementos.panelFormularioEstudiante = document.getElementById("panel-formulario-estudiante");
  elementos.tituloFormularioEstudiante = document.getElementById("titulo-formulario-estudiante");
  elementos.formularioEstudiante = document.getElementById("formulario-estudiante");
  elementos.campoDisciplinaEstudiante = document.getElementById("campo-disciplina");
  elementos.ayudaAcudiente = document.getElementById("ayuda-acudiente");
  elementos.botonCancelarEstudiante = document.getElementById("boton-cancelar-estudiante");
  elementos.botonGuardarEstudiante = document.getElementById("boton-guardar-estudiante");

  elementos.campoBusqueda = document.getElementById("filtro-texto");
  elementos.filtroDisciplina = document.getElementById("filtro-disciplina");
  elementos.filtroInactivos = document.getElementById("filtro-inactivos");
  elementos.contadorEstudiantes = document.getElementById("contador-estudiantes");
  elementos.mensajeSinEstudiantes = document.getElementById("mensaje-sin-estudiantes");
  elementos.contenedorTablaEstudiantes = document.getElementById("contenedor-tabla-estudiantes");
  elementos.cuerpoTablaEstudiantes = document.getElementById("cuerpo-tabla-estudiantes");
  elementos.plantillaFilaEstudiante = document.getElementById("plantilla-fila-estudiante");

  elementos.botonActualizarDashboard = document.getElementById("boton-actualizar-dashboard");
  elementos.textoActualizacionDashboard = document.getElementById("texto-actualizacion-dashboard");
  elementos.dashActivos = document.getElementById("dash-activos");
  elementos.dashAlDia = document.getElementById("dash-al-dia");
  elementos.dashPendientes = document.getElementById("dash-pendientes");
  elementos.dashVencidos = document.getElementById("dash-vencidos");
  elementos.dashTramoAlDia = document.getElementById("dash-tramo-al-dia");
  elementos.dashTramoPendientes = document.getElementById("dash-tramo-pendientes");
  elementos.dashTramoVencidos = document.getElementById("dash-tramo-vencidos");
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

function sdkDeSupabaseCargado() {
  return typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function";
}

function configuracionEsValida() {
  return (
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL.trim() !== "" &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_ANON_KEY.trim() !== ""
  );
}

// El panel sí guarda la sesión. detectSessionInUrl deja que el SDK lea la
// sesión que Google devuelve en la dirección al volver de su pantalla.
function crearClienteSupabase() {
  const opciones = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "academia-sesion",
    },
  };
  clienteSupabase = window.supabase.createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), opciones);
}

function mostrarAviso(mensaje, tipo = "info") {
  const yaEstaEnPantalla = Array.from(elementos.contenedorAvisos.children).some(
    (aviso) => aviso.textContent === mensaje
  );
  if (yaEstaEnPantalla) {
    return;
  }

  const colores = {
    exito: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
    info: "bg-tinta text-white",
  };

  const aviso = document.createElement("div");
  aviso.className =
    "pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg " +
    (colores[tipo] || colores.info);
  aviso.setAttribute("role", tipo === "error" ? "alert" : "status");
  aviso.textContent = mensaje;
  elementos.contenedorAvisos.appendChild(aviso);

  const milisegundos = tipo === "error" ? 7000 : 4000;
  setTimeout(() => aviso.remove(), milisegundos);
}

let operacionesEnCurso = 0;

function mostrarCargando(texto = "Cargando...") {
  operacionesEnCurso++;
  elementos.textoCargando.textContent = texto;
  elementos.indicadorCargando.classList.remove("hidden");
}

function ocultarCargando() {
  operacionesEnCurso = Math.max(0, operacionesEnCurso - 1);
  if (operacionesEnCurso === 0) {
    elementos.indicadorCargando.classList.add("hidden");
  }
}

function describirError(error) {
  const mensaje = error && error.message ? error.message : "";
  const codigo = error && error.code ? error.code : "";

  if (/failed to fetch|networkerror|network request failed|fetch failed/i.test(mensaje)) {
    return (
      "No se pudo conectar con Supabase. Revisa tu conexión a Internet. " +
      "Si sigue fallando, puede que el proyecto esté en pausa: entra a supabase.com y reactívalo."
    );
  }
  if (/estudiantes_acudiente_menores/.test(mensaje)) {
    return (
      "Los estudiantes menores de " + EDAD_DE_MAYORIA + " años necesitan nombre y teléfono del acudiente."
    );
  }
  if (/invalid login credentials/i.test(mensaje)) {
    return "Correo o contraseña incorrectos.";
  }
  if (/email not confirmed/i.test(mensaje)) {
    return "Ese usuario todavía no tiene el correo confirmado en Supabase.";
  }
  if (/provider is not enabled|unsupported provider/i.test(mensaje)) {
    return (
      "El inicio de sesión con Google no está activado en Supabase. " +
      "Actívalo en Authentication → Sign In / Providers, o entra con correo y contraseña."
    );
  }
  if (/jwt expired/i.test(mensaje) || codigo === "PGRST301") {
    return "Tu sesión expiró. Vuelve a entrar.";
  }
  if (codigo === "42501" || codigo === "PGRST116") {
    return "Tu cuenta no tiene permiso para ver estos datos. Pídele al administrador que te autorice.";
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

function fechaDeHoy() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return anio + "-" + mes + "-" + dia;
}

function formatearFecha(fecha) {
  return fecha.split("-").reverse().join("/");
}

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pedirConfirmacion({ titulo, mensaje, textoConfirmar }) {
  return new Promise((resolver) => {
    elementos.tituloConfirmacion.textContent = titulo;
    elementos.mensajeConfirmacion.textContent = mensaje;
    elementos.botonConfirmar.textContent = textoConfirmar;

    elementos.dialogoConfirmacion.returnValue = "";
    elementos.dialogoConfirmacion.addEventListener(
      "close",
      () => resolver(elementos.dialogoConfirmacion.returnValue === "confirmar"),
      { once: true }
    );
    elementos.dialogoConfirmacion.showModal();
  });
}

function obtenerIniciales(nombre) {
  const palabras = nombre.trim().split(/\s+/);
  const primera = palabras[0].charAt(0);
  const segunda = palabras.length > 1 ? palabras[1].charAt(0) : "";
  return (primera + segunda).toUpperCase();
}

function crearOpcion(valor, texto) {
  const opcion = document.createElement("option");
  opcion.value = valor;
  opcion.textContent = texto;
  return opcion;
}

function llenarSelectDeDisciplinas(select, textoDeLaPrimeraOpcion) {
  const seleccionActual = select.value;

  select.replaceChildren(crearOpcion("", textoDeLaPrimeraOpcion));
  estado.disciplinas.forEach((disciplina) => {
    select.appendChild(crearOpcion(String(disciplina.id), disciplina.nombre));
  });

  select.value = seleccionActual;
  if (select.selectedIndex === -1) {
    select.selectedIndex = 0;
  }
}

function llenarSelectsDeDisciplinas() {
  llenarSelectDeDisciplinas(elementos.filtroDisciplina, "Todas las disciplinas");
  llenarSelectDeDisciplinas(elementos.campoDisciplinaEstudiante, "Selecciona una disciplina");
}

function dibujarListaDeDisciplinas() {
  elementos.listaDisciplinas.replaceChildren();
  const mostrarAvisoDeVacio = estado.disciplinasCargadas && estado.disciplinas.length === 0;
  elementos.mensajeSinDisciplinas.classList.toggle("hidden", !mostrarAvisoDeVacio);

  estado.disciplinas.forEach((disciplina) => {
    const elemento = document.createElement("li");
    elemento.className =
      "tarjeta flex items-center gap-3 px-4 py-3 font-semibold text-tinta " +
      "before:h-6 before:w-1.5 before:rounded-full before:bg-sol";
    elemento.textContent = disciplina.nombre;
    elementos.listaDisciplinas.appendChild(elemento);
  });
}

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

  const yaExiste = estado.disciplinas.some(
    (disciplina) => normalizarTexto(disciplina.nombre) === normalizarTexto(nombre)
  );
  if (yaExiste) {
    return "Ya existe una disciplina llamada «" + nombre + "».";
  }
  return "";
}

let guardandoDisciplina = false;

async function agregarDisciplina(evento) {
  evento.preventDefault();
  if (guardandoDisciplina) {
    return;
  }

  const nombre = elementos.campoNombreDisciplina.value.trim().replace(/\s+/g, " ");

  const problema = validarNombreDeDisciplina(nombre);
  if (problema !== "") {
    mostrarAviso(problema, "error");
    elementos.campoNombreDisciplina.focus();
    return;
  }

  guardandoDisciplina = true;
  mostrarCargando("Guardando disciplina...");
  try {
    const { error } = await clienteSupabase.from("disciplinas").insert({ nombre });
    if (error) throw error;

    elementos.formularioDisciplina.reset();
    mostrarAviso("Disciplina «" + nombre + "» agregada.", "exito");
    await cargarDisciplinas();
  } catch (error) {
    const mensaje =
      error.code === "23505" ? "Ya existe una disciplina con ese nombre." : describirError(error);
    mostrarAviso(mensaje, "error");
  } finally {
    guardandoDisciplina = false;
    ocultarCargando();
  }
}

const ESTILOS_DE_PAGO = {
  al_dia: { texto: "Al día", clases: "bg-emerald-100 text-emerald-800" },
  pendiente: { texto: "Pendiente", clases: "bg-orange-100 text-orange-800" },
  vencido: { texto: "Vencido", clases: "bg-rose-100 text-rose-800" },
};
const CLASES_DE_PAGO_INACTIVO = "bg-slate-200 text-slate-500";

const EDAD_DE_MAYORIA = 18;

let guardandoEstudiante = false;

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

function obtenerEstudiantesFiltrados() {
  const textoBuscado = normalizarTexto(elementos.campoBusqueda.value.trim());
  const idDisciplina = elementos.filtroDisciplina.value;
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

function ponerTextoEnFila(fila, campo, texto) {
  fila.querySelector('[data-texto="' + campo + '"]').textContent = texto;
}

function crearFilaDeEstudiante(estudiante) {
  const fila = elementos.plantillaFilaEstudiante.content.firstElementChild.cloneNode(true);
  const estaInactivo = !estudiante.activo;

  ponerTextoEnFila(fila, "iniciales", obtenerIniciales(estudiante.nombre_completo));
  ponerTextoEnFila(fila, "nombre", estudiante.nombre_completo);
  ponerTextoEnFila(fila, "edad", estudiante.edad + " años");
  ponerTextoEnFila(fila, "disciplina", estudiante.disciplinas ? estudiante.disciplinas.nombre : "—");
  ponerTextoEnFila(fila, "categoria", estudiante.categoria || "—");

  const tieneAcudiente = Boolean(estudiante.acudiente_nombre || estudiante.acudiente_telefono);
  ponerTextoEnFila(fila, "acudiente", tieneAcudiente ? estudiante.acudiente_nombre || "" : "—");
  ponerTextoEnFila(fila, "telefono-acudiente", estudiante.acudiente_telefono || "");

  const estiloDePago = ESTILOS_DE_PAGO[estudiante.estado_pago];
  const etiquetaDePago = fila.querySelector('[data-texto="estado-pago"]');
  etiquetaDePago.textContent = estiloDePago.texto;
  etiquetaDePago.className += " " + (estaInactivo ? CLASES_DE_PAGO_INACTIVO : estiloDePago.clases);

  fila.dataset.inactivo = estaInactivo ? "true" : "false";
  fila.querySelector('[data-texto="etiqueta-inactivo"]').classList.toggle("hidden", !estaInactivo);

  fila.querySelectorAll("button[data-accion]").forEach((boton) => {
    boton.dataset.id = estudiante.id;
  });
  fila.querySelector('[data-accion="desactivar"]').classList.toggle("hidden", estaInactivo);
  fila.querySelector('[data-accion="reactivar"]').classList.toggle("hidden", !estaInactivo);

  return fila;
}

function dibujarTablaEstudiantes() {
  const lista = obtenerEstudiantesFiltrados();
  const mostrarInactivos = elementos.filtroInactivos.checked;
  const totalSinFiltrar = estado.estudiantes.filter((e) => mostrarInactivos || e.activo).length;

  elementos.cuerpoTablaEstudiantes.replaceChildren();
  lista.forEach((estudiante) => {
    elementos.cuerpoTablaEstudiantes.appendChild(crearFilaDeEstudiante(estudiante));
  });

  const hayFilas = lista.length > 0;
  const mostrarMensajeDeVacio = estado.estudiantesCargados && !hayFilas;
  elementos.contenedorTablaEstudiantes.classList.toggle("hidden", !hayFilas);
  elementos.mensajeSinEstudiantes.classList.toggle("hidden", !mostrarMensajeDeVacio);
  elementos.mensajeSinEstudiantes.textContent =
    totalSinFiltrar === 0
      ? "Todavía no hay estudiantes. Pulsa «+ Nuevo estudiante» para agregar el primero."
      : "Ningún estudiante coincide con la búsqueda o el filtro.";

  elementos.contadorEstudiantes.textContent = estado.estudiantesCargados
    ? "Mostrando " + lista.length + " de " + totalSinFiltrar
    : "";
}

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

function actualizarAyudaDeAcudiente() {
  const edadEscrita = elementos.formularioEstudiante.elements.edad.value;
  const esMenor = estudianteEsMenor(edadEscrita);

  elementos.formularioEstudiante.querySelectorAll("[data-marca-acudiente]").forEach((marca) => {
    marca.classList.toggle("hidden", !esMenor);
  });

  if (esMenor) {
    elementos.ayudaAcudiente.textContent =
      "Obligatorio: el estudiante es menor de " + EDAD_DE_MAYORIA + " años.";
    elementos.ayudaAcudiente.className = "mt-1 text-xs font-medium text-rose-600";
  } else {
    elementos.ayudaAcudiente.textContent = "Opcional para estudiantes de " + EDAD_DE_MAYORIA + " años o más.";
    elementos.ayudaAcudiente.className = "mt-1 text-xs text-slate-500";
  }
}

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

function cerrarFormularioEstudiante() {
  estado.idEstudianteEnEdicion = null;
  elementos.formularioEstudiante.reset();
  limpiarErroresDelFormulario();
  actualizarAyudaDeAcudiente();
  elementos.panelFormularioEstudiante.classList.add("hidden");
}

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

function edadEsValida(textoEdad) {
  return /^\d+$/.test(textoEdad) && Number(textoEdad) >= 3 && Number(textoEdad) <= 99;
}

function estudianteEsMenor(textoEdad) {
  return /^\d+$/.test(textoEdad) && Number(textoEdad) < EDAD_DE_MAYORIA;
}

function telefonoEsValido(texto) {
  if (!/^[+()\-\s\d]+$/.test(texto)) {
    return false;
  }
  const cantidadDeDigitos = texto.replace(/\D/g, "").length;
  return cantidadDeDigitos >= 7 && cantidadDeDigitos <= 15;
}

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

  const esMenor = estudianteEsMenor(datos.edad);

  if (esMenor && datos.acudiente_nombre.length < 3) {
    errores.acudiente_nombre =
      "Escribe el nombre del acudiente (obligatorio para menores de " + EDAD_DE_MAYORIA + " años).";
  }
  if (esMenor && datos.acudiente_telefono === "") {
    errores.acudiente_telefono =
      "Escribe el teléfono del acudiente (obligatorio para menores de " + EDAD_DE_MAYORIA + " años).";
  } else if (datos.acudiente_telefono !== "" && !telefonoEsValido(datos.acudiente_telefono)) {
    errores.acudiente_telefono =
      "Escribe un teléfono válido (de 7 a 15 dígitos; puedes usar espacios, + y -).";
  }

  return errores;
}

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

function limpiarErroresDelFormulario() {
  const formulario = elementos.formularioEstudiante;

  formulario.querySelectorAll("[aria-invalid]").forEach((campo) => campo.removeAttribute("aria-invalid"));
  formulario.querySelectorAll("[data-error-de]").forEach((parrafo) => {
    parrafo.textContent = "";
    parrafo.classList.add("hidden");
  });
}

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

function textoONulo(texto) {
  return texto === "" ? null : texto;
}

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

async function guardarEstudiante(evento) {
  evento.preventDefault();
  if (guardandoEstudiante) {
    return;
  }
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

  guardandoEstudiante = true;
  mostrarCargando(estaEditando ? "Guardando cambios..." : "Guardando estudiante...");
  try {
    if (estaEditando) {
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
    guardandoEstudiante = false;
    ocultarCargando();
  }
}

async function cambiarEstadoActivo(estudiante, activo) {
  mostrarCargando(activo ? "Reactivando estudiante..." : "Desactivando estudiante...");
  try {
    const { data, error } = await clienteSupabase
      .from("estudiantes")
      .update({ activo })
      .eq("id", estudiante.id)
      .select();
    if (error) throw error;
    if (data.length === 0) {
      throw new Error("No se encontró el estudiante. Puede que ya no exista; recarga la página.");
    }

    mostrarAviso(estudiante.nombre_completo + (activo ? " fue reactivado." : " fue desactivado."), "exito");
    await cargarEstudiantes();
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

async function desactivarEstudiante(estudiante) {
  const confirmado = await pedirConfirmacion({
    titulo: "¿Desactivar estudiante?",
    mensaje:
      estudiante.nombre_completo +
      " dejará de aparecer en la lista, en la asistencia y en el dashboard. " +
      "Podrás reactivarlo marcando «Mostrar inactivos».",
    textoConfirmar: "Desactivar",
  });

  if (confirmado) {
    await cambiarEstadoActivo(estudiante, false);
  }
}

async function reactivarEstudiante(estudiante) {
  await cambiarEstadoActivo(estudiante, true);
}

async function abrirVistaEstudiantes() {
  cerrarFormularioEstudiante();

  const disciplinasCargadas = await cargarDisciplinas();
  if (disciplinasCargadas) {
    await cargarEstudiantes();
  }
}

const FECHA_MINIMA_DE_ASISTENCIA = "2000-01-01";

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

async function consultarAsistenciaDeUnaFecha(fecha) {
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

  return { estudiantes: respuestaEstudiantes.data, guardada };
}

async function guardarRegistrosDeAsistencia(registros) {
  const { error } = await clienteSupabase
    .from("asistencias")
    .upsert(registros, { onConflict: "estudiante_id,fecha" });
  if (error) throw error;
}

async function confirmarDescartarCambios(hayCambios) {
  if (!hayCambios) {
    return true;
  }
  return pedirConfirmacion({
    titulo: "¿Descartar cambios?",
    mensaje: "Marcaste asistencia que todavía no guardaste. Si continúas, esos cambios se perderán.",
    textoConfirmar: "Descartar",
  });
}

function abrirVistaAsistencia() {
  if (!window.VistaAsistencia) {
    mostrarAviso(
      "No se pudo cargar React, que necesita la vista Asistencia. Revisa tu conexión a Internet y recarga la página.",
      "error"
    );
    return;
  }
  window.VistaAsistencia.abrir();
}

function asistenciaTieneCambiosSinGuardar() {
  return Boolean(window.VistaAsistencia) && window.VistaAsistencia.tieneCambiosSinGuardar();
}

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

function formatearPorcentaje(porcentaje) {
  return String(porcentaje).replace(".", ",") + "%";
}

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
    presentes,
    ausentes: registrados - presentes,
    registrados,
    sinRegistrar: estudiantesActivos.length - registrados,
    porcentaje: registrados > 0 ? calcularPorcentaje(presentes, registrados) : null,
  };
}

function dibujarBarraDePagos(metricas) {
  const ancho = (cantidad) => (metricas.activos > 0 ? (cantidad / metricas.activos) * 100 : 0) + "%";

  elementos.dashTramoAlDia.style.width = ancho(metricas.alDia);
  elementos.dashTramoPendientes.style.width = ancho(metricas.pendientes);
  elementos.dashTramoVencidos.style.width = ancho(metricas.vencidos);
}

function dibujarDashboard(metricas, fechaHoy) {
  elementos.dashActivos.textContent = metricas.activos;
  elementos.dashAlDia.textContent = metricas.alDia;
  elementos.dashPendientes.textContent = metricas.pendientes;
  elementos.dashVencidos.textContent = metricas.vencidos;
  dibujarBarraDePagos(metricas);

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
    const hora = new Date().toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
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

async function actualizarDashboard() {
  const actualizado = await cargarDashboard();
  if (actualizado) {
    mostrarAviso("Métricas actualizadas.", "exito");
  }
}

function mostrarVista(nombreVista) {
  estado.vistaActual = nombreVista;

  document.querySelectorAll("[data-vista]").forEach((seccion) => {
    const esLaPedida = seccion.dataset.vista === nombreVista;
    seccion.classList.toggle("hidden", !esLaPedida);
  });

  document.querySelectorAll("nav [data-ir-a]").forEach((boton) => {
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
  } else if (nombreVista === "servicios") {
    abrirVistaServicios();
  } else if (nombreVista === "mensajes") {
    cargarMensajes();
  } else if (nombreVista === "asistente") {
    abrirVistaAsistente();
  }
}

async function navegarAVista(nombreVista) {
  if (
    estado.vistaActual === "asistencia" &&
    !(await confirmarDescartarCambios(asistenciaTieneCambiosSinGuardar()))
  ) {
    return;
  }
  mostrarVista(nombreVista);
}

function conectarEventos() {
  document.querySelectorAll("[data-ir-a]").forEach((boton) => {
    boton.addEventListener("click", () => navegarAVista(boton.dataset.irA));
  });

  elementos.formularioDisciplina.addEventListener("submit", agregarDisciplina);

  elementos.botonNuevoEstudiante.addEventListener("click", () => abrirFormularioEstudiante());
  elementos.botonCancelarEstudiante.addEventListener("click", cerrarFormularioEstudiante);
  elementos.formularioEstudiante.addEventListener("submit", guardarEstudiante);
  elementos.formularioEstudiante.addEventListener("input", quitarErrorDelCampoEditado);
  elementos.formularioEstudiante.elements.edad.addEventListener("input", actualizarAyudaDeAcudiente);

  elementos.campoBusqueda.addEventListener("input", dibujarTablaEstudiantes);
  elementos.filtroDisciplina.addEventListener("change", dibujarTablaEstudiantes);
  elementos.filtroInactivos.addEventListener("change", dibujarTablaEstudiantes);
  elementos.cuerpoTablaEstudiantes.addEventListener("click", manejarClicEnTablaDeEstudiantes);

  elementos.botonActualizarDashboard.addEventListener("click", actualizarDashboard);

  elementos.formularioLogin.addEventListener("submit", iniciarSesionConCorreo);
  elementos.botonGoogle.addEventListener("click", iniciarSesionConGoogle);
  elementos.botonCerrarSesion.addEventListener("click", cerrarSesion);
  elementos.botonSalirSinPermiso.addEventListener("click", cerrarSesion);

  elementos.botonNuevoServicio.addEventListener("click", () => abrirFormularioServicio());
  elementos.botonCancelarServicio.addEventListener("click", cerrarFormularioServicio);
  elementos.formularioServicio.addEventListener("submit", guardarServicio);
  elementos.formularioServicio.addEventListener("input", quitarErrorDelCampoDeServicio);
  elementos.listaServiciosAdmin.addEventListener("click", manejarClicEnServicios);

  elementos.filtroNoLeidos.addEventListener("change", dibujarMensajes);
  elementos.listaMensajes.addEventListener("click", manejarClicEnMensajes);
}

function escribirFechaEnEncabezado() {
  const formato = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  elementos.fechaEncabezado.textContent = new Date().toLocaleDateString("es-CO", formato);
}

function mostrarProblemaDeInicio(mensaje) {
  elementos.textoProblema.textContent = mensaje;
  elementos.pantallaProblema.classList.remove("hidden");
}

async function iniciarAplicacion() {
  guardarReferenciasDelDOM();

  if (!sdkDeSupabaseCargado()) {
    mostrarProblemaDeInicio("No se pudo cargar la librería de Supabase. Revisa tu conexión a Internet.");
    return;
  }

  if (!configuracionEsValida()) {
    mostrarProblemaDeInicio(
      "Faltan los datos de conexión con Supabase. Revisa que el archivo conexion.js esté junto a admin.html " +
        "y que tenga escritos SUPABASE_URL y SUPABASE_ANON_KEY."
    );
    return;
  }

  crearClienteSupabase();
  conectarEventos();
  escribirFechaEnEncabezado();
  vigilarCierreDeSesion();

  await revisarSesion();
}

/* =====================================================================
   AUTENTICACIÓN
   Entrar solo identifica a la persona. El permiso para ver los datos lo
   da la tabla administradores, que se consulta con es_administrador().
   ===================================================================== */

function ocultarTodasLasPantallas() {
  elementos.pantallaLogin.classList.add("hidden");
  elementos.pantallaSinPermiso.classList.add("hidden");
  elementos.appPrincipal.classList.add("hidden");
}

function mostrarLogin() {
  limpiarDatosDeLaSesion();
  ocultarTodasLasPantallas();
  elementos.pantallaLogin.classList.remove("hidden");
  elementos.campoContrasena.value = "";
}

function mostrarSinPermiso(usuario) {
  ocultarTodasLasPantallas();
  elementos.correoSinPermiso.textContent = usuario.email || "esta cuenta";
  elementos.pantallaSinPermiso.classList.remove("hidden");
}

function mostrarAplicacion(usuario) {
  estado.usuario = usuario;
  ocultarTodasLasPantallas();
  elementos.correoUsuario.textContent = usuario.email || "";
  elementos.appPrincipal.classList.remove("hidden");
  mostrarVista("dashboard");
  actualizarGloboDeMensajes();
}

// Borra de la pantalla y de la memoria lo que se cargó: en un computador
// compartido, quien entre después no debe ver los datos del anterior.
function limpiarDatosDeLaSesion() {
  estado.usuario = null;
  estado.disciplinas = [];
  estado.estudiantes = [];
  estado.servicios = [];
  estado.mensajes = [];
  estado.disciplinasCargadas = false;
  estado.estudiantesCargados = false;
  estado.serviciosCargados = false;
  estado.mensajesCargados = false;
  estado.vistaActual = "";

  elementos.campoBusqueda.value = "";
  elementos.filtroInactivos.checked = false;
  elementos.cuerpoTablaEstudiantes.replaceChildren();
  elementos.listaDisciplinas.replaceChildren();
  elementos.listaServiciosAdmin.replaceChildren();
  elementos.listaMensajes.replaceChildren();
  elementos.globoMensajes.classList.add("hidden");
  cerrarFormularioEstudiante();
  cerrarFormularioServicio();
}

// Pregunta a la base de datos si esta cuenta está autorizada.
async function entrarSiEsAdministrador(usuario) {
  const { data, error } = await clienteSupabase.rpc("es_administrador");
  if (error) throw error;

  if (data === true) {
    mostrarAplicacion(usuario);
  } else {
    mostrarSinPermiso(usuario);
  }
}

async function revisarSesion() {
  mostrarCargando("Revisando tu sesión...");
  try {
    const { data, error } = await clienteSupabase.auth.getSession();
    if (error) throw error;

    if (data.session) {
      await entrarSiEsAdministrador(data.session.user);
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

function validarCredenciales(correo, contrasena) {
  if (correo === "") {
    return "Escribe tu correo electrónico.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return "El correo no tiene un formato válido.";
  }
  if (contrasena === "") {
    return "Escribe tu contraseña.";
  }
  return "";
}

async function iniciarSesionConCorreo(evento) {
  evento.preventDefault();

  const correo = elementos.campoCorreo.value.trim();
  const contrasena = elementos.campoContrasena.value;

  const problema = validarCredenciales(correo, contrasena);
  if (problema !== "") {
    mostrarAviso(problema, "error");
    return;
  }

  mostrarCargando("Entrando...");
  elementos.botonLogin.disabled = true;
  try {
    const { data, error } = await clienteSupabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });
    if (error) throw error;

    await entrarSiEsAdministrador(data.user);
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  } finally {
    elementos.botonLogin.disabled = false;
    ocultarCargando();
  }
}

// Lleva a la pantalla de Google y vuelve a esta misma dirección.
// Si el proveedor no está activado en Supabase, no redirige y lo avisamos.
async function iniciarSesionConGoogle() {
  elementos.avisoGoogle.classList.add("hidden");
  mostrarCargando("Abriendo Google...");
  try {
    const { error } = await clienteSupabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw error;
  } catch (error) {
    elementos.avisoGoogle.textContent = describirError(error);
    elementos.avisoGoogle.classList.remove("hidden");
    ocultarCargando();
  }
}

// Cierra la sesión en este navegador aunque falle la red.
async function cerrarSesion() {
  mostrarCargando("Cerrando sesión...");
  try {
    await clienteSupabase.auth.signOut({ scope: "local" });
  } catch (error) {
    mostrarAviso("La sesión se cerró aquí, pero no se pudo avisar a Supabase.", "info");
  } finally {
    mostrarLogin();
    ocultarCargando();
  }
}

// Si la sesión caduca o se cierra en otra pestaña, volvemos al login.
function vigilarCierreDeSesion() {
  clienteSupabase.auth.onAuthStateChange((evento) => {
    if (evento === "SIGNED_OUT") {
      mostrarLogin();
    }
  });
}

/* =====================================================================
   SERVICIOS (el catálogo con tarifas que ve el público)
   ===================================================================== */

function formatearPrecio(pesos) {
  return "$" + Number(pesos).toLocaleString("es-CO");
}

async function cargarServicios() {
  mostrarCargando("Cargando servicios...");
  try {
    const { data, error } = await clienteSupabase
      .from("servicios")
      .select("*, disciplinas(nombre)")
      .order("orden", { ascending: true });
    if (error) throw error;

    estado.servicios = data;
    estado.serviciosCargados = true;
    dibujarServiciosAdmin();
    return true;
  } catch (error) {
    mostrarAviso("No se pudieron cargar los servicios. " + describirError(error), "error");
    return false;
  } finally {
    ocultarCargando();
  }
}

function crearTarjetaDeServicioAdmin(servicio) {
  const elemento = document.createElement("li");
  elemento.className = servicio.activo ? "tarjeta p-4" : "tarjeta bg-slate-50 p-4";
  elemento.dataset.id = String(servicio.id);

  const arriba = document.createElement("div");
  arriba.className = "flex items-start justify-between gap-3";

  const izquierda = document.createElement("div");
  izquierda.className = "min-w-0";

  const nombre = document.createElement("p");
  nombre.className = servicio.activo ? "font-semibold text-slate-900" : "font-semibold text-slate-500";
  nombre.textContent = servicio.nombre;
  izquierda.appendChild(nombre);

  const detalle = document.createElement("p");
  detalle.className = "mt-0.5 text-sm text-slate-500";
  detalle.textContent = servicio.disciplinas ? servicio.disciplinas.nombre : "Sin disciplina";
  izquierda.appendChild(detalle);

  const etiquetas = document.createElement("div");
  etiquetas.className = "mt-2 flex flex-wrap gap-1.5";
  if (servicio.destacado) {
    const destacado = document.createElement("span");
    destacado.className = "chip bg-sol text-tinta";
    destacado.textContent = "El más pedido";
    etiquetas.appendChild(destacado);
  }
  if (!servicio.activo) {
    const oculto = document.createElement("span");
    oculto.className = "chip bg-slate-200 text-slate-600";
    oculto.textContent = "Oculto en la página";
    etiquetas.appendChild(oculto);
  }
  izquierda.appendChild(etiquetas);

  const precio = document.createElement("p");
  precio.className = "shrink-0 font-titulo text-2xl font-bold text-tinta";
  precio.textContent = formatearPrecio(servicio.precio_mensual);

  arriba.appendChild(izquierda);
  arriba.appendChild(precio);
  elemento.appendChild(arriba);

  if (servicio.descripcion) {
    const descripcion = document.createElement("p");
    descripcion.className = "mt-3 text-sm text-slate-600";
    descripcion.textContent = servicio.descripcion;
    elemento.appendChild(descripcion);
  }

  const acciones = document.createElement("div");
  acciones.className = "mt-4 flex flex-wrap gap-2";

  const editar = document.createElement("button");
  editar.type = "button";
  editar.dataset.accion = "editar-servicio";
  editar.className = "boton boton-chico boton-secundario";
  editar.textContent = "Editar";
  acciones.appendChild(editar);

  const visibilidad = document.createElement("button");
  visibilidad.type = "button";
  visibilidad.dataset.accion = "cambiar-visibilidad";
  visibilidad.className = "boton boton-chico boton-secundario";
  visibilidad.textContent = servicio.activo ? "Ocultar de la página" : "Mostrar en la página";
  acciones.appendChild(visibilidad);

  elemento.appendChild(acciones);
  return elemento;
}

function dibujarServiciosAdmin() {
  elementos.listaServiciosAdmin.replaceChildren();
  estado.servicios.forEach((servicio) => {
    elementos.listaServiciosAdmin.appendChild(crearTarjetaDeServicioAdmin(servicio));
  });

  const hayServicios = estado.servicios.length > 0;
  elementos.mensajeSinServiciosAdmin.classList.toggle("hidden", !estado.serviciosCargados || hayServicios);

  const visibles = estado.servicios.filter((servicio) => servicio.activo).length;
  elementos.contadorServicios.textContent = estado.serviciosCargados
    ? visibles + " de " + estado.servicios.length + " visibles en la página"
    : "";
}

function llenarSelectDeDisciplinasDeServicio() {
  llenarSelectDeDisciplinas(elementos.campoDisciplinaServicio, "Sin disciplina");
}

function abrirFormularioServicio(servicio = null) {
  limpiarErroresDelServicio();
  const formulario = elementos.formularioServicio;

  if (servicio === null) {
    estado.idServicioEnEdicion = null;
    formulario.reset();
    formulario.elements.activo.checked = true;
    elementos.tituloFormularioServicio.textContent = "Nuevo servicio";
    elementos.botonGuardarServicio.textContent = "Guardar servicio";
  } else {
    estado.idServicioEnEdicion = servicio.id;
    formulario.elements.nombre.value = servicio.nombre;
    formulario.elements.precio_mensual.value = servicio.precio_mensual;
    formulario.elements.disciplina_id.value = servicio.disciplina_id ? String(servicio.disciplina_id) : "";
    formulario.elements.descripcion.value = servicio.descripcion || "";
    formulario.elements.destacado.checked = servicio.destacado;
    formulario.elements.activo.checked = servicio.activo;
    elementos.tituloFormularioServicio.textContent = "Editar servicio";
    elementos.botonGuardarServicio.textContent = "Guardar cambios";
  }

  elementos.panelFormularioServicio.classList.remove("hidden");
  elementos.panelFormularioServicio.scrollIntoView({ behavior: "smooth", block: "start" });
  formulario.elements.nombre.focus({ preventScroll: true });
}

function cerrarFormularioServicio() {
  estado.idServicioEnEdicion = null;
  elementos.formularioServicio.reset();
  limpiarErroresDelServicio();
  elementos.panelFormularioServicio.classList.add("hidden");
}

function leerDatosDelServicio() {
  const campos = elementos.formularioServicio.elements;
  return {
    nombre: campos.nombre.value.trim().replace(/\s+/g, " "),
    precio_mensual: campos.precio_mensual.value.trim(),
    disciplina_id: campos.disciplina_id.value,
    descripcion: campos.descripcion.value.trim(),
    destacado: campos.destacado.checked,
    activo: campos.activo.checked,
  };
}

// Las mismas reglas que tiene la base de datos (ver supabase/schema.sql).
function validarServicio(datos) {
  const errores = {};

  if (datos.nombre.length < 2 || datos.nombre.length > 80) {
    errores.nombre = "El nombre debe tener entre 2 y 80 letras.";
  }
  if (!/^\d+$/.test(datos.precio_mensual)) {
    errores.precio_mensual = "Escribe el precio en pesos, solo números (ejemplo: 85000).";
  } else if (Number(datos.precio_mensual) > 100000000) {
    errores.precio_mensual = "Ese precio es demasiado alto.";
  }
  if (datos.descripcion.length > 300) {
    errores.descripcion = "La descripción no puede pasar de 300 letras.";
  }

  return errores;
}

function mostrarErroresDelServicio(errores) {
  const formulario = elementos.formularioServicio;
  const nombresDeCampo = Object.keys(errores);

  nombresDeCampo.forEach((nombre) => {
    formulario.elements[nombre].setAttribute("aria-invalid", "true");
    const parrafoDeError = formulario.querySelector('[data-error-de="' + nombre + '"]');
    parrafoDeError.textContent = errores[nombre];
    parrafoDeError.classList.remove("hidden");
  });

  formulario.elements[nombresDeCampo[0]].focus();
}

function limpiarErroresDelServicio() {
  const formulario = elementos.formularioServicio;
  formulario.querySelectorAll("[aria-invalid]").forEach((campo) => campo.removeAttribute("aria-invalid"));
  formulario.querySelectorAll("[data-error-de]").forEach((parrafo) => {
    parrafo.textContent = "";
    parrafo.classList.add("hidden");
  });
}

function quitarErrorDelCampoDeServicio(evento) {
  const campo = evento.target;
  if (!campo.name) {
    return;
  }
  campo.removeAttribute("aria-invalid");

  const parrafoDeError = elementos.formularioServicio.querySelector('[data-error-de="' + campo.name + '"]');
  if (parrafoDeError !== null) {
    parrafoDeError.textContent = "";
    parrafoDeError.classList.add("hidden");
  }
}

let guardandoServicio = false;

async function guardarServicio(evento) {
  evento.preventDefault();
  if (guardandoServicio) {
    return;
  }
  limpiarErroresDelServicio();

  const datos = leerDatosDelServicio();
  const errores = validarServicio(datos);
  if (Object.keys(errores).length > 0) {
    mostrarErroresDelServicio(errores);
    mostrarAviso("Revisa los campos marcados en rojo.", "error");
    return;
  }

  const registro = {
    nombre: datos.nombre,
    precio_mensual: Number(datos.precio_mensual),
    disciplina_id: datos.disciplina_id === "" ? null : Number(datos.disciplina_id),
    descripcion: datos.descripcion === "" ? null : datos.descripcion,
    destacado: datos.destacado,
    activo: datos.activo,
  };
  const estaEditando = estado.idServicioEnEdicion !== null;

  guardandoServicio = true;
  mostrarCargando(estaEditando ? "Guardando cambios..." : "Guardando servicio...");
  try {
    if (estaEditando) {
      const { data, error } = await clienteSupabase
        .from("servicios")
        .update(registro)
        .eq("id", estado.idServicioEnEdicion)
        .select();
      if (error) throw error;
      if (data.length === 0) {
        throw new Error("No se encontró el servicio. Puede que ya no exista; recarga la página.");
      }
    } else {
      // orden: lo nuevo se coloca al final de la lista del público.
      registro.orden = estado.servicios.length + 1;
      const { error } = await clienteSupabase.from("servicios").insert(registro);
      if (error) throw error;
    }

    cerrarFormularioServicio();
    mostrarAviso(estaEditando ? "Servicio actualizado." : "Servicio creado.", "exito");
    await cargarServicios();
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  } finally {
    guardandoServicio = false;
    ocultarCargando();
  }
}

async function cambiarVisibilidadDeServicio(servicio) {
  mostrarCargando("Guardando...");
  try {
    const { error } = await clienteSupabase
      .from("servicios")
      .update({ activo: !servicio.activo })
      .eq("id", servicio.id);
    if (error) throw error;

    mostrarAviso(
      servicio.activo ? "El servicio ya no aparece en la página." : "El servicio ya aparece en la página.",
      "exito"
    );
    await cargarServicios();
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

function manejarClicEnServicios(evento) {
  const boton = evento.target.closest("button[data-accion]");
  if (boton === null) {
    return;
  }

  const fila = boton.closest("li[data-id]");
  const servicio = estado.servicios.find((s) => String(s.id) === fila.dataset.id);
  if (servicio === undefined) {
    return;
  }

  if (boton.dataset.accion === "editar-servicio") {
    abrirFormularioServicio(servicio);
  } else if (boton.dataset.accion === "cambiar-visibilidad") {
    cambiarVisibilidadDeServicio(servicio);
  }
}

async function abrirVistaServicios() {
  cerrarFormularioServicio();
  const disciplinasCargadas = await cargarDisciplinas();
  if (disciplinasCargadas) {
    llenarSelectDeDisciplinasDeServicio();
    await cargarServicios();
  }
}

/* =====================================================================
   MENSAJES (los que llegan del formulario de la página pública)
   ===================================================================== */

function formatearMomento(textoDeFecha) {
  const momento = new Date(textoDeFecha);
  return momento.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function cargarMensajes() {
  mostrarCargando("Cargando mensajes...");
  try {
    const { data, error } = await clienteSupabase
      .from("mensajes")
      .select("*, servicios(nombre)")
      .order("creado_en", { ascending: false })
      .limit(200);
    if (error) throw error;

    estado.mensajes = data;
    estado.mensajesCargados = true;
    dibujarMensajes();
    actualizarGloboDeMensajes();
  } catch (error) {
    mostrarAviso("No se pudieron cargar los mensajes. " + describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

function crearTarjetaDeMensaje(mensaje) {
  const elemento = document.createElement("li");
  elemento.className = mensaje.leido ? "tarjeta p-4" : "tarjeta border-l-4 border-l-sol p-4";
  elemento.dataset.id = String(mensaje.id);

  const arriba = document.createElement("div");
  arriba.className = "flex flex-wrap items-start justify-between gap-2";

  const izquierda = document.createElement("div");
  const nombre = document.createElement("p");
  nombre.className = "font-semibold text-slate-900";
  nombre.textContent = mensaje.nombre;
  izquierda.appendChild(nombre);

  const contacto = document.createElement("p");
  contacto.className = "mt-0.5 text-sm text-slate-600";
  contacto.textContent = [mensaje.telefono, mensaje.correo].filter(Boolean).join(" · ");
  izquierda.appendChild(contacto);

  const derecha = document.createElement("div");
  derecha.className = "text-right";
  const fecha = document.createElement("p");
  fecha.className = "text-xs text-slate-500";
  fecha.textContent = formatearMomento(mensaje.creado_en);
  derecha.appendChild(fecha);
  if (!mensaje.leido) {
    const nuevo = document.createElement("span");
    nuevo.className = "chip mt-1 bg-sol text-tinta";
    nuevo.textContent = "Nuevo";
    derecha.appendChild(nuevo);
  }

  arriba.appendChild(izquierda);
  arriba.appendChild(derecha);
  elemento.appendChild(arriba);

  if (mensaje.servicios) {
    const interes = document.createElement("p");
    interes.className = "mt-2 text-sm text-slate-500";
    interes.textContent = "Le interesa: " + mensaje.servicios.nombre;
    elemento.appendChild(interes);
  }

  const texto = document.createElement("p");
  texto.className = "mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700";
  texto.textContent = mensaje.mensaje;
  elemento.appendChild(texto);

  const acciones = document.createElement("div");
  acciones.className = "mt-4";
  const marcar = document.createElement("button");
  marcar.type = "button";
  marcar.dataset.accion = "cambiar-leido";
  marcar.className = "boton boton-chico boton-secundario";
  marcar.textContent = mensaje.leido ? "Marcar como no leído" : "Marcar como leído";
  acciones.appendChild(marcar);
  elemento.appendChild(acciones);

  return elemento;
}

function dibujarMensajes() {
  const soloNoLeidos = elementos.filtroNoLeidos.checked;
  const lista = estado.mensajes.filter((mensaje) => !soloNoLeidos || !mensaje.leido);

  elementos.listaMensajes.replaceChildren();
  lista.forEach((mensaje) => {
    elementos.listaMensajes.appendChild(crearTarjetaDeMensaje(mensaje));
  });

  const hayMensajes = lista.length > 0;
  elementos.mensajeSinMensajes.classList.toggle("hidden", !estado.mensajesCargados || hayMensajes);
  elementos.mensajeSinMensajes.textContent =
    estado.mensajes.length === 0
      ? "Todavía no has recibido mensajes. Aparecerán aquí cuando alguien escriba desde la página."
      : "No hay mensajes sin leer.";

  const sinLeer = estado.mensajes.filter((mensaje) => !mensaje.leido).length;
  elementos.contadorMensajes.textContent = estado.mensajesCargados
    ? estado.mensajes.length + " en total · " + sinLeer + " sin leer"
    : "";
}

async function cambiarEstadoLeido(mensaje) {
  try {
    const { error } = await clienteSupabase
      .from("mensajes")
      .update({ leido: !mensaje.leido })
      .eq("id", mensaje.id);
    if (error) throw error;

    mensaje.leido = !mensaje.leido;
    dibujarMensajes();
    actualizarGloboDeMensajes();
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  }
}

function manejarClicEnMensajes(evento) {
  const boton = evento.target.closest("button[data-accion]");
  if (boton === null) {
    return;
  }

  const fila = boton.closest("li[data-id]");
  const mensaje = estado.mensajes.find((m) => String(m.id) === fila.dataset.id);
  if (mensaje !== undefined) {
    cambiarEstadoLeido(mensaje);
  }
}

// El globo del menú es un extra: si la consulta falla no se avisa nada.
async function actualizarGloboDeMensajes() {
  try {
    const { count, error } = await clienteSupabase
      .from("mensajes")
      .select("id", { count: "exact", head: true })
      .eq("leido", false);
    if (error) throw error;

    const hay = typeof count === "number" && count > 0;
    elementos.globoMensajes.textContent = hay ? String(count) : "";
    elementos.globoMensajes.classList.toggle("hidden", !hay);
  } catch (error) {
    elementos.globoMensajes.classList.add("hidden");
  }
}

/* =====================================================================
   PUENTE CON EL ASISTENTE (asistente-ia.js)
   ===================================================================== */

function abrirVistaAsistente() {
  if (!window.Asistente) {
    mostrarAviso("No se pudo cargar el asistente. Recarga la página.", "error");
    return;
  }
  window.Asistente.abrir();
}

document.addEventListener("DOMContentLoaded", iniciarAplicacion);
