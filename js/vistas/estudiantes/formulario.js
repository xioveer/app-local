import { EDAD_DE_MAYORIA } from "../../config/reglas.js";
import { actualizarEstudiante, crearEstudiante } from "../../datos/estudiantes.js";
import { elementos } from "../../dom.js";
import { estado } from "../../estado.js";
import { mostrarVista } from "../../navegacion.js";
import { mostrarAviso } from "../../ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "../../ui/cargando.js";
import { describirError } from "../../utilidades/errores.js";
import { limpiarEspacios, textoONulo } from "../../utilidades/texto.js";
import { estudianteEsMenor, validarEstudiante } from "../../validaciones.js";
import { cargarEstudiantes } from "./tabla.js";

let guardandoEstudiante = false;

const campos = () => elementos.formularioEstudiante.elements;

function actualizarAyudaDeAcudiente() {
  const esMenor = estudianteEsMenor(campos().edad.value);

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

function parrafoDeErrorDe(nombreDelCampo) {
  return elementos.formularioEstudiante.querySelector('[data-error-de="' + nombreDelCampo + '"]');
}

function vaciarParrafoDeError(parrafo) {
  parrafo.textContent = "";
  parrafo.classList.add("hidden");
}

function limpiarErroresDelFormulario() {
  const formulario = elementos.formularioEstudiante;
  formulario.querySelectorAll("[aria-invalid]").forEach((campo) => campo.removeAttribute("aria-invalid"));
  formulario.querySelectorAll("[data-error-de]").forEach(vaciarParrafoDeError);
}

function mostrarErroresDelFormulario(errores) {
  const nombresDeCampo = Object.keys(errores);

  nombresDeCampo.forEach((nombre) => {
    campos()[nombre].setAttribute("aria-invalid", "true");
    const parrafoDeError = parrafoDeErrorDe(nombre);
    parrafoDeError.textContent = errores[nombre];
    parrafoDeError.classList.remove("hidden");
  });

  campos()[nombresDeCampo[0]].focus();
}

function quitarErrorDelCampoEditado(evento) {
  const campo = evento.target;
  if (!campo.name) {
    return;
  }
  campo.removeAttribute("aria-invalid");
  const parrafoDeError = parrafoDeErrorDe(campo.name);
  if (parrafoDeError !== null) {
    vaciarParrafoDeError(parrafoDeError);
  }
}

function rellenarConEstudiante(estudiante) {
  campos().nombre_completo.value = estudiante.nombre_completo;
  campos().edad.value = estudiante.edad;
  campos().disciplina_id.value = String(estudiante.disciplina_id);
  campos().categoria.value = estudiante.categoria || "";
  campos().estado_pago.value = estudiante.estado_pago;
  campos().acudiente_nombre.value = estudiante.acudiente_nombre || "";
  campos().acudiente_telefono.value = estudiante.acudiente_telefono || "";
}

function prepararFormulario(estudiante) {
  if (estudiante === null) {
    estado.idEstudianteEnEdicion = null;
    elementos.formularioEstudiante.reset();
    elementos.tituloFormularioEstudiante.textContent = "Nuevo estudiante";
    elementos.botonGuardarEstudiante.textContent = "Guardar estudiante";
  } else {
    estado.idEstudianteEnEdicion = estudiante.id;
    rellenarConEstudiante(estudiante);
    elementos.tituloFormularioEstudiante.textContent = "Editar estudiante";
    elementos.botonGuardarEstudiante.textContent = "Guardar cambios";
  }
}

export function abrirFormularioEstudiante(estudiante = null) {
  if (estado.disciplinas.length === 0) {
    mostrarAviso("Primero agrega al menos una disciplina.", "info");
    mostrarVista("disciplinas");
    return;
  }

  limpiarErroresDelFormulario();
  prepararFormulario(estudiante);
  actualizarAyudaDeAcudiente();
  elementos.panelFormularioEstudiante.classList.remove("hidden");
  elementos.panelFormularioEstudiante.scrollIntoView({ behavior: "smooth", block: "start" });
  campos().nombre_completo.focus({ preventScroll: true });
}

export function cerrarFormularioEstudiante() {
  estado.idEstudianteEnEdicion = null;
  elementos.formularioEstudiante.reset();
  limpiarErroresDelFormulario();
  actualizarAyudaDeAcudiente();
  elementos.panelFormularioEstudiante.classList.add("hidden");
}

function leerDatosDelFormulario() {
  return {
    nombre_completo: limpiarEspacios(campos().nombre_completo.value),
    edad: campos().edad.value.trim(),
    disciplina_id: campos().disciplina_id.value,
    categoria: limpiarEspacios(campos().categoria.value),
    estado_pago: campos().estado_pago.value,
    acudiente_nombre: limpiarEspacios(campos().acudiente_nombre.value),
    acudiente_telefono: campos().acudiente_telefono.value.trim(),
  };
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
      await actualizarEstudiante(estado.idEstudianteEnEdicion, registro);
    } else {
      await crearEstudiante(registro);
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

export function conectarEventosDelFormulario() {
  elementos.botonNuevoEstudiante.addEventListener("click", () => abrirFormularioEstudiante());
  elementos.botonCancelarEstudiante.addEventListener("click", cerrarFormularioEstudiante);
  elementos.formularioEstudiante.addEventListener("submit", guardarEstudiante);
  elementos.formularioEstudiante.addEventListener("input", quitarErrorDelCampoEditado);
  campos().edad.addEventListener("input", actualizarAyudaDeAcudiente);
}
