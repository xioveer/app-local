"use strict";

let clienteSupabase = null;

const estado = {
  vistaActual: "",
  disciplinas: [],
  estudiantes: [],
  disciplinasCargadas: false,
  estudiantesCargados: false,
  idEstudianteEnEdicion: null,
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

function crearClienteSupabase() {
  const opciones = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
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
  if (codigo === "42501") {
    return "La base de datos no permite el acceso. Ejecuta supabase/modo_sin_login.sql en el SQL Editor de Supabase.";
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
}

function escribirFechaEnEncabezado() {
  const formato = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  elementos.fechaEncabezado.textContent = new Date().toLocaleDateString("es-CO", formato);
}

function mostrarProblemaDeInicio(mensaje) {
  elementos.textoProblema.textContent = mensaje;
  elementos.pantallaProblema.classList.remove("hidden");
}

function iniciarAplicacion() {
  guardarReferenciasDelDOM();

  if (!sdkDeSupabaseCargado()) {
    mostrarProblemaDeInicio("No se pudo cargar la librería de Supabase. Revisa tu conexión a Internet.");
    return;
  }

  if (!configuracionEsValida()) {
    mostrarProblemaDeInicio(
      "Faltan los datos de conexión con Supabase. Revisa que el archivo conexion.js esté junto a index.html " +
        "y que tenga escritos SUPABASE_URL y SUPABASE_ANON_KEY."
    );
    return;
  }

  crearClienteSupabase();
  conectarEventos();
  escribirFechaEnEncabezado();
  elementos.appPrincipal.classList.remove("hidden");
  mostrarVista("dashboard");
}

document.addEventListener("DOMContentLoaded", iniciarAplicacion);
