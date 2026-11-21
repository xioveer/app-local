import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config/conexion.js";
import { obtenerCliente } from "../servicios/supabase.js";
import { normalizarTexto } from "../utilidades/texto.js";
import { DIAS_QUE_MIRA } from "./analisis.js";

function resumenParaElModelo(analisis) {
  return {
    estudiantes_activos: analisis.activos,
    estudiantes_al_dia: analisis.alDia,
    estudiantes_sin_pagar: analisis.porCobrar.length,
    estudiantes_con_pago_vencido: analisis.vencidos,
    estudiantes_en_riesgo: analisis.conRiesgo.length,
    asistencia_promedio_porcentaje: analisis.asistenciaPromedio,
    registros_de_asistencia: analisis.registrosDeAsistencia,
    dias_analizados: DIAS_QUE_MIRA,
  };
}

const enLista = (lineas) => lineas.slice(0, 6).join("\n");

function responderSobreCobros(analisis) {
  if (analisis.porCobrar.length === 0) {
    return "Todos tus estudiantes están al día con el pago. No tienes nada por cobrar.";
  }
  const lista = enLista(
    analisis.porCobrar.map((e) => "· " + e.nombre_completo + " (" + e.estado_pago.replace("_", " ") + ")")
  );
  return (
    analisis.porCobrar.length +
    " estudiantes no están al día" +
    (analisis.vencidos > 0 ? ", y " + analisis.vencidos + " ya tienen el pago vencido" : "") +
    ":\n" +
    lista
  );
}

function responderSobreRiesgo(analisis) {
  if (analisis.conRiesgo.length === 0) {
    return "Ningún estudiante muestra señales de querer retirarse. La asistencia viene estable.";
  }
  const lista = enLista(
    analisis.conRiesgo.map((f) => "· " + f.estudiante.nombre_completo + ": " + f.razones.join(", "))
  );
  return "Estos estudiantes necesitan atención:\n" + lista;
}

function responderSobreAsistencia(analisis) {
  if (analisis.asistenciaPromedio === null) {
    return "Todavía no hay asistencia registrada. Tómala en la vista Asistencia para poder analizarla.";
  }
  return (
    "La asistencia promedio de los últimos " +
    DIAS_QUE_MIRA +
    " días es del " +
    analisis.asistenciaPromedio +
    "%, sobre " +
    analisis.registrosDeAsistencia +
    " registros."
  );
}

function responderSobreEstudiantes(analisis) {
  return (
    "Tienes " + analisis.activos + " estudiantes activos, " + analisis.alDia + " de ellos al día con el pago."
  );
}

function responderConUnResumen(analisis) {
  return (
    "Esto es lo que veo hoy:\n" +
    "· " +
    analisis.activos +
    " estudiantes activos\n" +
    "· " +
    analisis.porCobrar.length +
    " sin pagar la mensualidad\n" +
    "· " +
    analisis.conRiesgo.length +
    " en riesgo de retirarse\n" +
    "· " +
    (analisis.asistenciaPromedio === null ? "sin" : analisis.asistenciaPromedio + "% de") +
    " asistencia promedio\n\n" +
    "Puedes preguntarme por cobros, asistencia o riesgo de deserción."
  );
}

const TEMAS_DE_PREGUNTA = [
  { palabras: /cobr|pago|deuda|plata|dinero|mensualidad|debe/, responder: responderSobreCobros },
  { palabras: /riesgo|retir|desert|falt|abandon/, responder: responderSobreRiesgo },
  { palabras: /asistenc|vinier|present|ausent/, responder: responderSobreAsistencia },
  { palabras: /cuantos|activ|grupo|estudiante/, responder: responderSobreEstudiantes },
];

export function responderConReglas(pregunta, analisis) {
  const texto = normalizarTexto(pregunta);
  const tema = TEMAS_DE_PREGUNTA.find((posible) => posible.palabras.test(texto));
  return tema ? tema.responder(analisis) : responderConUnResumen(analisis);
}

export async function responderConModelo(pregunta, analisis) {
  const { data } = await obtenerCliente().auth.getSession();
  if (!data.session) {
    return null;
  }

  const respuesta = await fetch(SUPABASE_URL.trim() + "/functions/v1/asistente", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + data.session.access_token,
      apikey: SUPABASE_ANON_KEY.trim(),
    },
    body: JSON.stringify({ pregunta, resumen: resumenParaElModelo(analisis) }),
  });
  if (!respuesta.ok) {
    return null;
  }

  const cuerpo = await respuesta.json();
  if (cuerpo.disponible === false || !cuerpo.respuesta) {
    return null;
  }
  return cuerpo.respuesta;
}
