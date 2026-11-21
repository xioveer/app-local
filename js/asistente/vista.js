import { leerAsistenciasDesde } from "../datos/asistencias.js";
import { leerActivosParaElAsistente } from "../datos/estudiantes.js";
import { elementos } from "../dom.js";
import { mostrarAviso } from "../ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "../ui/cargando.js";
import { describirError } from "../utilidades/errores.js";
import { fechaHaceDias } from "../utilidades/fechas.js";
import { analizar, DIAS_QUE_MIRA } from "./analisis.js";
import { construirHallazgos } from "./hallazgos.js";
import { responderConModelo, responderConReglas } from "./respuestas.js";

const PREGUNTAS_SUGERIDAS = [
  "¿A quién debo cobrarle?",
  "¿Quién está faltando mucho?",
  "¿Cómo va la asistencia?",
  "¿Cuántos estudiantes activos tengo?",
];

const COLORES_POR_NIVEL = {
  alto: "border-l-rose-500",
  medio: "border-l-orange-400",
  bueno: "border-l-emerald-500",
};

const TEXTO_BOTON_COPIAR = "Copiar mensaje para el acudiente";

let datos = null;
let preguntando = false;
let modeloDisponible = null;

async function reunirDatos() {
  const [estudiantes, asistencias] = await Promise.all([
    leerActivosParaElAsistente(),
    leerAsistenciasDesde(fechaHaceDias(DIAS_QUE_MIRA)),
  ]);
  return { estudiantes, asistencias };
}

function crearParrafo(clases, texto) {
  const parrafo = document.createElement("p");
  parrafo.className = clases;
  parrafo.textContent = texto;
  return parrafo;
}

async function copiarAlPortapapeles(texto, boton) {
  try {
    await navigator.clipboard.writeText(texto);
    boton.textContent = "Mensaje copiado";
    setTimeout(() => {
      boton.textContent = TEXTO_BOTON_COPIAR;
    }, 2500);
  } catch {
    mostrarAviso("El navegador no dejó copiar. Selecciona el texto a mano.", "error");
  }
}

function crearBotonDeCopiar(mensaje) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton boton-chico boton-secundario mt-3";
  boton.textContent = TEXTO_BOTON_COPIAR;
  boton.addEventListener("click", () => copiarAlPortapapeles(mensaje, boton));
  return boton;
}

function crearHallazgo({ nivel, titulo, detalle, mensajeSugerido }) {
  const elemento = document.createElement("li");
  elemento.className =
    "rounded-xl border border-slate-200 border-l-4 bg-white p-4 " + COLORES_POR_NIVEL[nivel];
  elemento.appendChild(crearParrafo("font-semibold text-slate-900", titulo));
  elemento.appendChild(crearParrafo("mt-1 text-sm leading-relaxed text-slate-600", detalle));
  if (mensajeSugerido) {
    elemento.appendChild(crearBotonDeCopiar(mensajeSugerido));
  }
  return elemento;
}

function crearDatoDeResumen(etiqueta, valor, nota) {
  const bloque = document.createElement("div");

  const titulo = document.createElement("dt");
  titulo.className = "text-sm text-slate-500";
  titulo.textContent = etiqueta;
  bloque.appendChild(titulo);

  const dato = document.createElement("dd");
  dato.className = "font-titulo text-3xl font-bold text-tinta";
  dato.textContent = valor;
  bloque.appendChild(dato);

  if (nota) {
    bloque.appendChild(crearParrafo("text-xs text-slate-500", nota));
  }
  return bloque;
}

function dibujarResumen(analisis) {
  elementos.resumenDelAsistente.replaceChildren(
    crearDatoDeResumen("Estudiantes activos", String(analisis.activos)),
    crearDatoDeResumen(
      "Pagos al día",
      analisis.activos === 0 ? "—" : analisis.alDia + " de " + analisis.activos,
      analisis.porCobrar.length > 0 ? analisis.porCobrar.length + " por cobrar" : "Nadie debe mensualidad"
    ),
    crearDatoDeResumen(
      "Asistencia promedio",
      analisis.asistenciaPromedio === null ? "—" : analisis.asistenciaPromedio + "%",
      analisis.registrosDeAsistencia > 0
        ? "Sobre " + analisis.registrosDeAsistencia + " registros de los últimos " + DIAS_QUE_MIRA + " días"
        : "Todavía no hay asistencia registrada"
    )
  );
}

function escribirEstadoDeLaIa() {
  if (modeloDisponible === true) {
    elementos.estadoIa.textContent = "Responde un modelo de lenguaje, con las cifras de tu academia.";
  } else if (modeloDisponible === false) {
    elementos.estadoIa.textContent =
      "Responde el análisis local, con reglas sobre tus datos. " +
      "Para usar un modelo de lenguaje, configura la clave en Supabase (ver el README).";
  } else {
    elementos.estadoIa.textContent = "Pregunta por cobros, asistencia o riesgo de deserción.";
  }
}

function mostrarRespuesta(texto) {
  elementos.respuestaAsistente.textContent = texto;
  elementos.respuestaAsistente.classList.remove("hidden");
}

function marcarBotonPreguntando(estaPreguntando) {
  preguntando = estaPreguntando;
  elementos.botonPreguntar.disabled = estaPreguntando;
  elementos.botonPreguntar.textContent = estaPreguntando ? "Pensando..." : "Preguntar";
}

async function responder(pregunta, analisis) {
  try {
    const delModelo = await responderConModelo(pregunta, analisis);
    modeloDisponible = delModelo !== null;
    return delModelo !== null ? delModelo : responderConReglas(pregunta, analisis);
  } catch {
    modeloDisponible = false;
    return responderConReglas(pregunta, analisis);
  }
}

async function preguntar(evento) {
  evento.preventDefault();
  if (preguntando) {
    return;
  }

  const pregunta = elementos.campoPregunta.value.trim();
  if (pregunta.length < 4) {
    mostrarAviso("Escribe una pregunta un poco más larga.", "error");
    return;
  }
  if (datos === null) {
    mostrarAviso("Todavía no se cargaron los datos. Espera un momento.", "error");
    return;
  }

  marcarBotonPreguntando(true);
  mostrarRespuesta(await responder(pregunta, analizar(datos)));
  escribirEstadoDeLaIa();
  marcarBotonPreguntando(false);
}

function crearBotonDeSugerencia(texto) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className =
    "rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-papel";
  boton.textContent = texto;
  boton.addEventListener("click", () => {
    elementos.campoPregunta.value = texto;
    elementos.formularioPregunta.requestSubmit();
  });
  return boton;
}

export function conectarEventosDelAsistente() {
  elementos.formularioPregunta.addEventListener("submit", preguntar);
  elementos.sugerenciasPregunta.replaceChildren(...PREGUNTAS_SUGERIDAS.map(crearBotonDeSugerencia));
}

export async function abrirVistaAsistente() {
  escribirEstadoDeLaIa();
  mostrarCargando("Analizando tus grupos...");
  try {
    datos = await reunirDatos();
    const analisis = analizar(datos);
    elementos.listaHallazgos.replaceChildren(...construirHallazgos(analisis).map(crearHallazgo));
    dibujarResumen(analisis);
  } catch (error) {
    mostrarAviso("No se pudo analizar la academia. " + describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

export function cerrarVistaDelAsistente() {
  datos = null;
  modeloDisponible = null;
  elementos.listaHallazgos.replaceChildren();
  elementos.resumenDelAsistente.replaceChildren();
  elementos.campoPregunta.value = "";
  elementos.respuestaAsistente.textContent = "";
  elementos.respuestaAsistente.classList.add("hidden");
  escribirEstadoDeLaIa();
}
