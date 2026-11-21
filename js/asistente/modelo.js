import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config/conexion.js";
import { obtenerCliente } from "../servicios/supabase.js";
import { DIAS_DE_TENDENCIA, DIAS_QUE_MIRA } from "./analisis.js";

const MAXIMO_DE_DISCIPLINAS = 15;
const LARGO_MAXIMO_DEL_NOMBRE = 40;

function cifrasDeGrupo(grupo) {
  return {
    estudiantes_activos: grupo.activos,
    estudiantes_al_dia: grupo.alDia,
    estudiantes_pago_pendiente: grupo.pendientes,
    estudiantes_pago_vencido: grupo.vencidos,
    estudiantes_en_riesgo: grupo.conRiesgo.length,
    estudiantes_con_faltas_seguidas: grupo.conFaltasSeguidas.length,
    asistencia_promedio_porcentaje: grupo.asistenciaPromedio,
    registros_de_asistencia: grupo.registrosDeAsistencia,
  };
}

function cifrasDeTendencia(tendencia) {
  return {
    asistencia_ultimos_7_dias_porcentaje: tendencia.ultimos.porcentaje,
    asistencia_7_dias_anteriores_porcentaje: tendencia.anteriores.porcentaje,
    diferencia_en_puntos: tendencia.diferencia,
    registros_ultimos_7_dias: tendencia.ultimos.registros,
    registros_7_dias_anteriores: tendencia.anteriores.registros,
  };
}

export function resumenParaElModelo(analisis) {
  return {
    ...cifrasDeGrupo(analisis),
    estudiantes_sin_asistencia_registrada: analisis.sinRegistros.length,
    dias_analizados: DIAS_QUE_MIRA,
    dias_de_cada_semana_comparada: DIAS_DE_TENDENCIA,
    tendencia_semanal: cifrasDeTendencia(analisis.tendencia),
    disciplinas: analisis.porDisciplina.slice(0, MAXIMO_DE_DISCIPLINAS).map((grupo) => ({
      disciplina: grupo.nombre.slice(0, LARGO_MAXIMO_DEL_NOMBRE),
      ...cifrasDeGrupo(grupo),
    })),
  };
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
  if (cuerpo.disponible === false || typeof cuerpo.respuesta !== "string" || !cuerpo.respuesta.trim()) {
    return null;
  }
  return cuerpo.respuesta.trim();
}
