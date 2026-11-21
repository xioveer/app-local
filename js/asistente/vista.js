import { leerAsistenciasDesde } from "../datos/asistencias.js";
import { leerDisciplinas } from "../datos/disciplinas.js";
import { leerActivosParaElAsistente } from "../datos/estudiantes.js";
import { elementos } from "../dom.js";
import { mostrarAviso } from "../ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "../ui/cargando.js";
import { describirError } from "../utilidades/errores.js";
import { fechaDeHoy, fechaHaceDias } from "../utilidades/fechas.js";
import { analizar, DIAS_QUE_MIRA } from "./analisis.js";
import { construirHallazgos } from "./hallazgos.js";
import { responderConModelo } from "./modelo.js";
import { interpretarConLosDatos, responderConReglas } from "./respuestas.js";

const PREGUNTAS_FIJAS = ["¿A quién debo cobrarle?", "¿Quién está faltando mucho?", "¿Qué hago primero?"];
const PREGUNTA_SIN_DISCIPLINAS = "¿Cómo va la asistencia esta semana?";

const COLORES_POR_NIVEL = {
  alto: "before:bg-rose-500 before:ring-rose-500/15",
  medio: "before:bg-amber-400 before:ring-amber-400/20",
  bueno: "before:bg-emerald-500 before:ring-emerald-500/15",
};

const TEXTO_BOTON_COPIAR = "Copiar mensaje para el acudiente";

let analisisActual = null;
let preguntando = false;
let modeloDisponible = null;

const listaDeGrupos = () => document.getElementById("lista-grupos-asistente");
const mensajeSinGrupos = () => document.getElementById("mensaje-sin-grupos-asistente");

async function reunirDatos() {
  const [estudiantes, asistencias, disciplinas] = await Promise.all([
    leerActivosParaElAsistente(),
    leerAsistenciasDesde(fechaHaceDias(DIAS_QUE_MIRA)),
    leerDisciplinas(),
  ]);
  return { estudiantes, asistencias, disciplinas, hoy: fechaDeHoy() };
}

function crearElemento(etiqueta, clases, texto) {
  const elemento = document.createElement(etiqueta);
  elemento.className = clases;
  if (texto !== undefined) {
    elemento.textContent = texto;
  }
  return elemento;
}

const crearParrafo = (clases, texto) => crearElemento("p", clases, texto);

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
  const boton = crearElemento("button", "boton boton-chico boton-secundario mt-3", TEXTO_BOTON_COPIAR);
  boton.type = "button";
  boton.addEventListener("click", () => copiarAlPortapapeles(mensaje, boton));
  return boton;
}

function crearHallazgo({ nivel, titulo, detalle, accion, mensajeSugerido }) {
  const elemento = crearElemento(
    "li",
    "relative rounded-lg border border-borde bg-white py-4 pl-10 pr-4 shadow-suave " +
      "before:absolute before:left-4 before:top-[1.4rem] before:h-2.5 before:w-2.5 before:rounded-full " +
      "before:ring-4 before:content-[''] " +
      COLORES_POR_NIVEL[nivel]
  );
  elemento.appendChild(crearParrafo("text-sm font-semibold text-slate-900", titulo));
  elemento.appendChild(crearParrafo("mt-1 text-sm leading-6 text-slate-600", detalle));
  if (accion) {
    const parrafo = crearParrafo("mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700");
    parrafo.append(crearElemento("span", "font-semibold text-slate-900", "Qué hacer: "), accion);
    elemento.appendChild(parrafo);
  }
  if (mensajeSugerido) {
    elemento.appendChild(crearBotonDeCopiar(mensajeSugerido));
  }
  return elemento;
}

function crearDatoDeResumen(etiqueta, valor, nota) {
  const bloque = crearElemento("div", "rounded-lg bg-slate-50 px-3 py-3 ring-1 ring-inset ring-slate-100");
  bloque.appendChild(crearElemento("dt", "text-xs font-medium text-slate-500", etiqueta));
  bloque.appendChild(
    crearElemento("dd", "mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums", valor)
  );
  if (nota) {
    bloque.appendChild(crearParrafo("mt-1 text-xs leading-5 text-slate-500", nota));
  }
  return bloque;
}

function notaDeTendencia(tendencia) {
  if (tendencia.diferencia === null) {
    return tendencia.ultimos.registros > 0 ? "Sin datos de la semana anterior" : "Sin registros esta semana";
  }
  if (tendencia.direccion === "estable") {
    return "Estable frente a la semana anterior";
  }
  const signo = tendencia.diferencia > 0 ? "+" : "−";
  return signo + Math.abs(tendencia.diferencia) + " puntos frente a la semana anterior";
}

function dibujarResumen(analisis) {
  const { tendencia } = analisis;
  elementos.resumenDelAsistente.replaceChildren(
    crearDatoDeResumen("Estudiantes activos", String(analisis.activos)),
    crearDatoDeResumen(
      "Pagos al día",
      analisis.activos === 0 ? "—" : analisis.alDia + " de " + analisis.activos,
      analisis.seguimientoDePagos.length > 0
        ? analisis.vencidos + " vencidos y " + analisis.pendientes + " pendientes"
        : "Nadie debe mensualidad"
    ),
    crearDatoDeResumen(
      "Asistencia promedio",
      analisis.asistenciaPromedio === null ? "—" : analisis.asistenciaPromedio + "%",
      analisis.registrosDeAsistencia > 0
        ? "Sobre " + analisis.registrosDeAsistencia + " registros de los últimos " + DIAS_QUE_MIRA + " días"
        : "Todavía no hay asistencia registrada"
    ),
    crearDatoDeResumen(
      "Últimos 7 días",
      tendencia.ultimos.porcentaje === null ? "—" : tendencia.ultimos.porcentaje + "%",
      notaDeTendencia(tendencia)
    )
  );
}

function crearEtiquetaDePago(texto, cantidad, clases) {
  return crearElemento("span", "chip chip-punto tabular-nums " + clases, cantidad + " " + texto);
}

function crearTarjetaDeGrupo(grupo) {
  const tarjeta = crearElemento("li", "rounded-lg border border-borde bg-white p-4 shadow-suave");
  tarjeta.dataset.disciplina = grupo.nombre;

  const encabezado = crearElemento("div", "flex items-baseline justify-between gap-2");
  encabezado.appendChild(crearParrafo("min-w-0 truncate text-sm font-semibold text-slate-900", grupo.nombre));
  encabezado.appendChild(
    crearParrafo(
      "shrink-0 text-xs font-medium text-slate-500 tabular-nums",
      grupo.activos + (grupo.activos === 1 ? " activo" : " activos")
    )
  );
  tarjeta.appendChild(encabezado);

  tarjeta.appendChild(
    crearParrafo(
      "mt-2 text-sm font-medium text-slate-700 tabular-nums",
      grupo.activos === 0
        ? "Sin estudiantes activos"
        : "Asistencia: " + (grupo.asistenciaPromedio === null ? "sin datos" : grupo.asistenciaPromedio + "%")
    )
  );

  if (grupo.activos > 0) {
    const pagos = crearElemento("div", "mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3");
    pagos.append(
      crearEtiquetaDePago("al día", grupo.alDia, "bg-emerald-50 text-emerald-700 ring-emerald-600/20"),
      crearEtiquetaDePago(
        grupo.pendientes === 1 ? "pendiente" : "pendientes",
        grupo.pendientes,
        "bg-amber-50 text-amber-800 ring-amber-600/25"
      ),
      crearEtiquetaDePago(
        grupo.vencidos === 1 ? "vencido" : "vencidos",
        grupo.vencidos,
        "bg-rose-50 text-rose-700 ring-rose-600/20"
      )
    );
    tarjeta.appendChild(pagos);
  }
  return tarjeta;
}

function dibujarGrupos(analisis) {
  const grupos = analisis.porDisciplina;
  listaDeGrupos().replaceChildren(...grupos.map(crearTarjetaDeGrupo));
  mensajeSinGrupos().classList.toggle("hidden", grupos.length > 0);
}

function escribirEstadoDeLaIa() {
  if (modeloDisponible === true) {
    elementos.estadoIa.textContent =
      "Responde un modelo de lenguaje con las cifras agrupadas de tu academia (sin nombres ni teléfonos).";
  } else if (modeloDisponible === false) {
    elementos.estadoIa.textContent =
      "Responde el análisis local, con reglas sobre tus datos. " +
      "Para usar un modelo de lenguaje, configura la clave en Supabase (ver el README).";
  } else {
    elementos.estadoIa.textContent =
      "Pregunta por pagos, faltas, asistencia, un estudiante o una disciplina. También puedes tocar una sugerencia.";
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

function nombraEstudiantes(pregunta, analisis) {
  return interpretarConLosDatos(pregunta, analisis).estudiantes.length > 0;
}

async function responder(pregunta, analisis) {
  if (nombraEstudiantes(pregunta, analisis)) {
    return responderConReglas(pregunta, analisis);
  }
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
  if (analisisActual === null) {
    mostrarAviso("Todavía no se cargaron los datos. Espera un momento.", "error");
    return;
  }

  marcarBotonPreguntando(true);
  try {
    mostrarRespuesta(await responder(pregunta, analisisActual));
    escribirEstadoDeLaIa();
  } finally {
    marcarBotonPreguntando(false);
  }
}

function crearBotonDeSugerencia(texto) {
  const boton = crearElemento(
    "button",
    "rounded-full border border-borde bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-suave " +
      "transition-colors hover:border-marca-200 hover:bg-marca-50 hover:text-marca-700 " +
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-marca-500 focus-visible:ring-offset-2",
    texto
  );
  boton.type = "button";
  boton.addEventListener("click", () => {
    elementos.campoPregunta.value = texto;
    elementos.formularioPregunta.requestSubmit();
  });
  return boton;
}

function elegirPreguntas(analisis) {
  const grupoPrincipal = analisis ? analisis.porDisciplina.find((grupo) => grupo.activos > 0) : null;
  return [
    ...PREGUNTAS_FIJAS,
    grupoPrincipal ? "¿Cómo va " + grupoPrincipal.nombre + "?" : PREGUNTA_SIN_DISCIPLINAS,
  ];
}

function dibujarSugerencias(analisis) {
  elementos.sugerenciasPregunta.replaceChildren(...elegirPreguntas(analisis).map(crearBotonDeSugerencia));
}

export function conectarEventosDelAsistente() {
  elementos.formularioPregunta.addEventListener("submit", preguntar);
  dibujarSugerencias(null);
}

export async function abrirVistaAsistente() {
  escribirEstadoDeLaIa();
  mostrarCargando("Analizando tus grupos...");
  try {
    analisisActual = analizar(await reunirDatos());
    elementos.listaHallazgos.replaceChildren(...construirHallazgos(analisisActual).map(crearHallazgo));
    dibujarResumen(analisisActual);
    dibujarGrupos(analisisActual);
    dibujarSugerencias(analisisActual);
  } catch (error) {
    mostrarAviso("No se pudo analizar la academia. " + describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

export function cerrarVistaDelAsistente() {
  analisisActual = null;
  modeloDisponible = null;
  elementos.listaHallazgos.replaceChildren();
  elementos.resumenDelAsistente.replaceChildren();
  listaDeGrupos().replaceChildren();
  mensajeSinGrupos().classList.add("hidden");
  dibujarSugerencias(null);
  elementos.campoPregunta.value = "";
  elementos.respuestaAsistente.textContent = "";
  elementos.respuestaAsistente.classList.add("hidden");
  escribirEstadoDeLaIa();
}
