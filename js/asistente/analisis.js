export const DIAS_QUE_MIRA = 45;
const CLASES_RECIENTES = 6;

function agruparAsistenciaPorEstudiante(asistencias) {
  const porEstudiante = {};
  asistencias.forEach((registro) => {
    if (!porEstudiante[registro.estudiante_id]) {
      porEstudiante[registro.estudiante_id] = [];
    }
    porEstudiante[registro.estudiante_id].push(registro);
  });
  return porEstudiante;
}

function contarFaltasSeguidas(registros) {
  let faltasSeguidas = 0;
  for (const registro of registros) {
    if (registro.asistio) break;
    faltasSeguidas++;
  }
  return faltasSeguidas;
}

function calcularRiesgo(estudiante, registros) {
  const recientes = registros.slice(0, CLASES_RECIENTES);
  const presentes = recientes.filter((registro) => registro.asistio).length;
  const porcentaje = recientes.length > 0 ? Math.round((presentes / recientes.length) * 100) : null;
  const faltasSeguidas = contarFaltasSeguidas(registros);

  let puntos = 0;
  const razones = [];

  if (faltasSeguidas >= 3) {
    puntos += 3;
    razones.push("faltó a las últimas " + faltasSeguidas + " clases seguidas");
  } else if (faltasSeguidas === 2) {
    puntos += 2;
    razones.push("faltó a las últimas 2 clases");
  }

  if (porcentaje !== null && recientes.length >= 3 && porcentaje < 60) {
    puntos += 2;
    razones.push("solo asistió al " + porcentaje + "% de sus últimas clases");
  }

  if (estudiante.estado_pago === "vencido") {
    puntos += 2;
    razones.push("tiene el pago vencido");
  } else if (estudiante.estado_pago === "pendiente") {
    puntos += 1;
    razones.push("tiene el pago pendiente");
  }

  return { estudiante, puntos, razones };
}

const primeroLosVencidos = (estudiante) => (estudiante.estado_pago === "vencido" ? 0 : 1);

export function analizar({ estudiantes, asistencias }) {
  const porEstudiante = agruparAsistenciaPorEstudiante(asistencias);

  const conRiesgo = estudiantes
    .map((estudiante) => calcularRiesgo(estudiante, porEstudiante[estudiante.id] || []))
    .filter((fila) => fila.puntos >= 2)
    .sort((a, b) => b.puntos - a.puntos);

  const porCobrar = estudiantes
    .filter((estudiante) => estudiante.estado_pago !== "al_dia")
    .sort((a, b) => primeroLosVencidos(a) - primeroLosVencidos(b));

  const presentes = asistencias.filter((registro) => registro.asistio).length;

  return {
    activos: estudiantes.length,
    alDia: estudiantes.length - porCobrar.length,
    conRiesgo,
    porCobrar,
    vencidos: porCobrar.filter((estudiante) => estudiante.estado_pago === "vencido").length,
    asistenciaPromedio: asistencias.length > 0 ? Math.round((presentes / asistencias.length) * 100) : null,
    registrosDeAsistencia: asistencias.length,
  };
}
