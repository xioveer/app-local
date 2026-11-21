import { actualizarEstudiante } from "../../datos/estudiantes.js";
import { elementos } from "../../dom.js";
import { estado } from "../../estado.js";
import { mostrarAviso } from "../../ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "../../ui/cargando.js";
import { pedirConfirmacion } from "../../ui/confirmacion.js";
import { describirError } from "../../utilidades/errores.js";
import { cargarDisciplinas } from "../disciplinas.js";
import {
  abrirFormularioEstudiante,
  cerrarFormularioEstudiante,
  conectarEventosDelFormulario,
} from "./formulario.js";
import { cargarEstudiantes, dibujarTablaDeEstudiantes } from "./tabla.js";

export async function abrirVistaEstudiantes() {
  cerrarFormularioEstudiante();
  if (await cargarDisciplinas()) {
    await cargarEstudiantes();
  }
}

async function cambiarEstadoActivo(estudiante, activo) {
  mostrarCargando(activo ? "Reactivando estudiante..." : "Desactivando estudiante...");
  try {
    await actualizarEstudiante(estudiante.id, { activo });
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

const ACCIONES_DE_FILA = {
  editar: abrirFormularioEstudiante,
  desactivar: desactivarEstudiante,
  reactivar: (estudiante) => cambiarEstadoActivo(estudiante, true),
};

function manejarClicEnLaTabla(evento) {
  const boton = evento.target.closest("button[data-accion]");
  if (boton === null) {
    return;
  }
  const estudiante = estado.estudiantes.find((e) => String(e.id) === boton.dataset.id);
  if (estudiante !== undefined) {
    ACCIONES_DE_FILA[boton.dataset.accion](estudiante);
  }
}

export function conectarEventosDeEstudiantes() {
  conectarEventosDelFormulario();
  elementos.campoBusqueda.addEventListener("input", dibujarTablaDeEstudiantes);
  elementos.filtroDisciplina.addEventListener("change", dibujarTablaDeEstudiantes);
  elementos.filtroInactivos.addEventListener("change", dibujarTablaDeEstudiantes);
  elementos.cuerpoTablaEstudiantes.addEventListener("click", manejarClicEnLaTabla);
}

export function limpiarVistaDeEstudiantes() {
  elementos.campoBusqueda.value = "";
  elementos.filtroInactivos.checked = false;
  cerrarFormularioEstudiante();
  dibujarTablaDeEstudiantes();
}
