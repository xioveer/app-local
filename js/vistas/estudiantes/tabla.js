import { leerEstudiantes } from "../../datos/estudiantes.js";
import { elementos } from "../../dom.js";
import { estado } from "../../estado.js";
import { mostrarAviso } from "../../ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "../../ui/cargando.js";
import { describirError } from "../../utilidades/errores.js";
import { normalizarTexto, obtenerIniciales } from "../../utilidades/texto.js";

const ESTILOS_DE_PAGO = {
  al_dia: { texto: "Al día", clases: "bg-emerald-100 text-emerald-800" },
  pendiente: { texto: "Pendiente", clases: "bg-orange-100 text-orange-800" },
  vencido: { texto: "Vencido", clases: "bg-rose-100 text-rose-800" },
};
const CLASES_DE_PAGO_INACTIVO = "bg-slate-200 text-slate-500";

export async function cargarEstudiantes() {
  mostrarCargando("Cargando estudiantes...");
  try {
    estado.estudiantes = await leerEstudiantes();
    estado.estudiantesCargados = true;
    dibujarTablaDeEstudiantes();
  } catch (error) {
    mostrarAviso("No se pudieron cargar los estudiantes. " + describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

function leerFiltros() {
  return {
    texto: normalizarTexto(elementos.campoBusqueda.value.trim()),
    idDisciplina: elementos.filtroDisciplina.value,
    mostrarInactivos: elementos.filtroInactivos.checked,
  };
}

function cumpleLosFiltros(estudiante, filtros) {
  if (!filtros.mostrarInactivos && !estudiante.activo) {
    return false;
  }
  if (filtros.idDisciplina !== "" && String(estudiante.disciplina_id) !== filtros.idDisciplina) {
    return false;
  }
  return filtros.texto === "" || normalizarTexto(estudiante.nombre_completo).includes(filtros.texto);
}

function ponerTextoEnFila(fila, campo, texto) {
  fila.querySelector('[data-texto="' + campo + '"]').textContent = texto;
}

function pintarEstadoDePago(fila, estudiante) {
  const estilo = ESTILOS_DE_PAGO[estudiante.estado_pago];
  const etiqueta = fila.querySelector('[data-texto="estado-pago"]');
  etiqueta.textContent = estilo.texto;
  etiqueta.className += " " + (estudiante.activo ? estilo.clases : CLASES_DE_PAGO_INACTIVO);
}

function prepararBotonesDeFila(fila, estudiante) {
  fila.querySelectorAll("button[data-accion]").forEach((boton) => {
    boton.dataset.id = estudiante.id;
  });
  fila.querySelector('[data-accion="desactivar"]').classList.toggle("hidden", !estudiante.activo);
  fila.querySelector('[data-accion="reactivar"]').classList.toggle("hidden", estudiante.activo);
}

function crearFilaDeEstudiante(estudiante) {
  const fila = elementos.plantillaFilaEstudiante.content.firstElementChild.cloneNode(true);
  const tieneAcudiente = Boolean(estudiante.acudiente_nombre || estudiante.acudiente_telefono);

  ponerTextoEnFila(fila, "iniciales", obtenerIniciales(estudiante.nombre_completo));
  ponerTextoEnFila(fila, "nombre", estudiante.nombre_completo);
  ponerTextoEnFila(fila, "edad", estudiante.edad + " años");
  ponerTextoEnFila(fila, "disciplina", estudiante.disciplinas ? estudiante.disciplinas.nombre : "—");
  ponerTextoEnFila(fila, "categoria", estudiante.categoria || "—");
  ponerTextoEnFila(fila, "acudiente", tieneAcudiente ? estudiante.acudiente_nombre || "" : "—");
  ponerTextoEnFila(fila, "telefono-acudiente", estudiante.acudiente_telefono || "");
  pintarEstadoDePago(fila, estudiante);

  fila.dataset.inactivo = estudiante.activo ? "false" : "true";
  fila.querySelector('[data-texto="etiqueta-inactivo"]').classList.toggle("hidden", estudiante.activo);
  prepararBotonesDeFila(fila, estudiante);

  return fila;
}

function escribirMensajeYContador(cantidadVisible, totalSinFiltrar) {
  const mostrarMensajeDeVacio = estado.estudiantesCargados && cantidadVisible === 0;
  elementos.contenedorTablaEstudiantes.classList.toggle("hidden", cantidadVisible === 0);
  elementos.mensajeSinEstudiantes.classList.toggle("hidden", !mostrarMensajeDeVacio);
  elementos.mensajeSinEstudiantes.textContent =
    totalSinFiltrar === 0
      ? "Todavía no hay estudiantes. Pulsa «+ Nuevo estudiante» para agregar el primero."
      : "Ningún estudiante coincide con la búsqueda o el filtro.";

  elementos.contadorEstudiantes.textContent = estado.estudiantesCargados
    ? "Mostrando " + cantidadVisible + " de " + totalSinFiltrar
    : "";
}

export function dibujarTablaDeEstudiantes() {
  const filtros = leerFiltros();
  const visibles = estado.estudiantes.filter((estudiante) => cumpleLosFiltros(estudiante, filtros));
  const totalSinFiltrar = estado.estudiantes.filter((e) => filtros.mostrarInactivos || e.activo).length;

  elementos.cuerpoTablaEstudiantes.replaceChildren(...visibles.map(crearFilaDeEstudiante));
  escribirMensajeYContador(visibles.length, totalSinFiltrar);
}
