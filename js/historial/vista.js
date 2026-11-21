import { FECHA_MINIMA_DE_ASISTENCIA } from "../config/reglas.js";
import { leerAsistenciasEntre } from "../datos/asistencias.js";
import { leerEstudiantes } from "../datos/estudiantes.js";
import { elementos } from "../dom.js";
import { estado } from "../estado.js";
import { descargarLibroDeExcel } from "../servicios/excel.js";
import { mostrarAviso } from "../ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "../ui/cargando.js";
import { llenarSelectDeDisciplinas } from "../ui/selects.js";
import { describirError } from "../utilidades/errores.js";
import { fechaDeHoy, fechaHaceDias } from "../utilidades/fechas.js";
import { formatearFechaLargaDeTexto, formatearPorcentaje } from "../utilidades/formato.js";
import { cargarDisciplinas } from "../vistas/disciplinas.js";
import { armarDias, resumirDias, validarRangoDeFechas } from "./dias.js";
import { hojaDeUnDia, hojasDelRango, nombreDelArchivo } from "./hojas.js";

const DIAS_POR_DEFECTO = 30;

const consulta = { desde: "", hasta: "", registros: [], estudiantes: [], cargada: false };
let diasVisibles = [];

const contar = (cantidad, singular, plural) => cantidad + " " + (cantidad === 1 ? singular : plural);

function nombreDeLaDisciplinaElegida() {
  const opcion = elementos.historialDisciplina.selectedOptions[0];
  return elementos.historialDisciplina.value === "" || !opcion ? "" : opcion.textContent;
}

function crearPersona(persona) {
  const elemento = document.createElement("li");
  elemento.className = "flex items-baseline justify-between gap-3 py-2 text-sm";

  const nombre = document.createElement("span");
  nombre.className = "min-w-0 truncate text-slate-800";
  nombre.textContent = persona.nombre;

  const detalle = document.createElement("span");
  detalle.className = "shrink-0 text-xs text-slate-500";
  detalle.textContent = [persona.disciplina, persona.categoria].filter(Boolean).join(" · ");

  elemento.append(nombre, detalle);
  return elemento;
}

function crearNadie(texto) {
  const elemento = document.createElement("li");
  elemento.className = "py-2 text-sm text-slate-400";
  elemento.textContent = texto;
  return elemento;
}

function llenarLista(lista, personas, textoSiNoHay) {
  lista.replaceChildren(...(personas.length > 0 ? personas.map(crearPersona) : [crearNadie(textoSiNoHay)]));
}

function crearTarjetaDeDia(dia, abierta) {
  const tarjeta = elementos.plantillaDiaHistorial.content.firstElementChild.cloneNode(true);
  const texto = (nombre) => tarjeta.querySelector(`[data-texto="${nombre}"]`);
  const lista = (nombre) => tarjeta.querySelector(`[data-lista="${nombre}"]`);

  tarjeta.open = abierta;
  tarjeta.dataset.fecha = dia.fecha;
  texto("fecha").textContent = formatearFechaLargaDeTexto(dia.fecha);
  texto("presentes").textContent = contar(dia.presentes.length, "presente", "presentes");
  texto("ausentes").textContent = contar(dia.ausentes.length, "ausente", "ausentes");
  texto("porcentaje").textContent = formatearPorcentaje(dia.porcentaje);
  texto("titulo-presentes").textContent = "Vinieron (" + dia.presentes.length + ")";
  texto("titulo-ausentes").textContent = "Faltaron (" + dia.ausentes.length + ")";
  llenarLista(lista("presentes"), dia.presentes, "Nadie vino este día.");
  llenarLista(lista("ausentes"), dia.ausentes, "No faltó nadie.");
  tarjeta.querySelector('[data-accion="descargar-dia"]').dataset.fecha = dia.fecha;
  return tarjeta;
}

function dibujarResumen() {
  const resumen = resumirDias(diasVisibles);
  elementos.historialTotalDias.textContent = String(resumen.cantidadDeDias);
  elementos.historialPorcentaje.textContent = formatearPorcentaje(resumen.porcentaje);
  elementos.historialPresentes.textContent = String(resumen.presentes);
  elementos.historialAusentes.textContent = String(resumen.ausentes);
}

function dibujarHistorial() {
  diasVisibles = armarDias(consulta.registros, consulta.estudiantes, elementos.historialDisciplina.value);
  const hayDias = diasVisibles.length > 0;

  elementos.resumenHistorial.classList.toggle("hidden", !hayDias);
  elementos.mensajeSinHistorial.classList.toggle("hidden", !consulta.cargada || hayDias);
  elementos.listaHistorial.replaceChildren(
    ...diasVisibles.map((dia, indice) => crearTarjetaDeDia(dia, indice === 0))
  );
  if (hayDias) {
    dibujarResumen();
  }
}

async function consultarHistorial() {
  const desde = elementos.historialDesde.value;
  const hasta = elementos.historialHasta.value;
  const problema = validarRangoDeFechas(desde, hasta, fechaDeHoy(), FECHA_MINIMA_DE_ASISTENCIA);
  if (problema !== "") {
    mostrarAviso(problema, "error");
    return;
  }

  mostrarCargando("Cargando historial...");
  try {
    const [registros, estudiantes] = await Promise.all([
      leerAsistenciasEntre(desde, hasta),
      leerEstudiantes(),
    ]);
    Object.assign(consulta, { desde, hasta, registros, estudiantes, cargada: true });
    dibujarHistorial();
  } catch (error) {
    mostrarAviso("No se pudo cargar el historial. " + describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

async function descargar(nombreDelArchivoExcel, hojas) {
  mostrarCargando("Preparando el archivo de Excel...");
  try {
    await descargarLibroDeExcel(nombreDelArchivoExcel, hojas);
    mostrarAviso("Se descargó «" + nombreDelArchivoExcel + "».", "exito");
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

function descargarTodo() {
  if (diasVisibles.length === 0) {
    mostrarAviso("No hay días con asistencia para descargar en esas fechas.", "error");
    return;
  }
  const disciplina = nombreDeLaDisciplinaElegida();
  descargar(
    nombreDelArchivo([consulta.desde, "a", consulta.hasta], disciplina),
    hojasDelRango(diasVisibles, consulta.desde, consulta.hasta, disciplina)
  );
}

function descargarUnDia(evento) {
  const boton = evento.target.closest('[data-accion="descargar-dia"]');
  if (!boton) {
    return;
  }
  const dia = diasVisibles.find((candidato) => candidato.fecha === boton.dataset.fecha);
  if (dia) {
    const disciplina = nombreDeLaDisciplinaElegida();
    descargar(nombreDelArchivo([dia.fecha], disciplina), [hojaDeUnDia(dia, disciplina)]);
  }
}

function ponerFechasPorDefecto() {
  const hoy = fechaDeHoy();
  elementos.historialDesde.min = FECHA_MINIMA_DE_ASISTENCIA;
  elementos.historialHasta.min = FECHA_MINIMA_DE_ASISTENCIA;
  elementos.historialDesde.max = hoy;
  elementos.historialHasta.max = hoy;
  if (elementos.historialDesde.value === "") {
    elementos.historialDesde.value = fechaHaceDias(DIAS_POR_DEFECTO);
  }
  if (elementos.historialHasta.value === "") {
    elementos.historialHasta.value = hoy;
  }
}

export async function abrirVistaHistorial() {
  ponerFechasPorDefecto();
  if (!estado.disciplinasCargadas && !(await cargarDisciplinas())) {
    return;
  }
  llenarSelectDeDisciplinas(elementos.historialDisciplina, estado.disciplinas, "Todas las disciplinas");
  await consultarHistorial();
}

export function conectarEventosDelHistorial() {
  elementos.formularioHistorial.addEventListener("submit", (evento) => {
    evento.preventDefault();
    consultarHistorial();
  });
  elementos.historialDisciplina.addEventListener("change", () => {
    if (consulta.cargada) {
      dibujarHistorial();
    }
  });
  elementos.botonDescargarHistorial.addEventListener("click", descargarTodo);
  elementos.listaHistorial.addEventListener("click", descargarUnDia);
}

export function limpiarVistaDelHistorial() {
  Object.assign(consulta, { desde: "", hasta: "", registros: [], estudiantes: [], cargada: false });
  diasVisibles = [];
  elementos.formularioHistorial.reset();
  elementos.historialDisciplina.replaceChildren();
  elementos.listaHistorial.replaceChildren();
  elementos.resumenHistorial.classList.add("hidden");
  elementos.mensajeSinHistorial.classList.add("hidden");
}
