export const DIAS_QUE_MIRA = 45;
export const DIAS_DE_TENDENCIA = 7;
const CLASES_RECIENTES = 6;
const DIFERENCIA_QUE_IMPORTA = 5;

export function porcentaje(parte, total) {
  return total > 0 ? Math.round((parte / total) * 100) : null;
}

function restarDias(fechaTexto, dias) {
  const [anio, mes, dia] = fechaTexto.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10);
}

function agruparAsistenciaPorEstudiante(asistencias) {
  const porEstudiante = {};
  asistencias.forEach((registro) => {
    if (!porEstudiante[registro.estudiante_id]) {
      porEstudiante[registro.estudiante_id] = [];
    }
    porEstudiante[registro.estudiante_id].push(registro);
  });
  Object.values(porEstudiante).forEach((registros) =>
    registros.sort((a, b) => b.fecha.localeCompare(a.fecha))
  );
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

function puntosPorAsistencia(faltasSeguidas, recientes, porcentajeReciente) {
  const razones = [];
  let puntos = 0;
  if (faltasSeguidas >= 3) {
    puntos += 3;
    razones.push("faltó a las últimas " + faltasSeguidas + " clases seguidas");
  } else if (faltasSeguidas === 2) {
    puntos += 2;
    razones.push("faltó a las últimas 2 clases");
  }
  if (porcentajeReciente !== null && recientes >= 3 && porcentajeReciente < 60) {
    puntos += 2;
    razones.push("solo asistió al " + porcentajeReciente + "% de sus últimas clases");
  }
  return { puntos, razones };
}

function puntosPorPago(estadoPago) {
  if (estadoPago === "vencido") {
    return { puntos: 2, razones: ["tiene el pago vencido"] };
  }
  if (estadoPago === "pendiente") {
    return { puntos: 1, razones: ["tiene el pago pendiente"] };
  }
  return { puntos: 0, razones: [] };
}

function crearFicha(estudiante, registros) {
  const recientes = registros.slice(0, CLASES_RECIENTES);
  const presentesRecientes = recientes.filter((registro) => registro.asistio).length;
  const porcentajeReciente = porcentaje(presentesRecientes, recientes.length);
  const faltasSeguidas = contarFaltasSeguidas(registros);
  const porAsistencia = puntosPorAsistencia(faltasSeguidas, recientes.length, porcentajeReciente);
  const porPago = puntosPorPago(estudiante.estado_pago);

  return {
    estudiante,
    registros: registros.length,
    faltasSeguidas,
    porcentajeReciente,
    puntosDeAsistencia: porAsistencia.puntos,
    razonesDeAsistencia: porAsistencia.razones,
    puntos: porAsistencia.puntos + porPago.puntos,
    razones: [...porAsistencia.razones, ...porPago.razones],
  };
}

function medirPeriodo(asistencias, desde, hasta) {
  const delPeriodo = asistencias.filter((registro) => registro.fecha >= desde && registro.fecha <= hasta);
  const presentes = delPeriodo.filter((registro) => registro.asistio).length;
  return { registros: delPeriodo.length, porcentaje: porcentaje(presentes, delPeriodo.length) };
}

function describirDireccion(diferencia) {
  if (diferencia === null) return null;
  if (diferencia >= DIFERENCIA_QUE_IMPORTA) return "sube";
  if (diferencia <= -DIFERENCIA_QUE_IMPORTA) return "baja";
  return "estable";
}

function calcularTendencia(asistencias, hoy) {
  const inicioDeLaSemana = restarDias(hoy, DIAS_DE_TENDENCIA - 1);
  const ultimos = medirPeriodo(asistencias, inicioDeLaSemana, hoy);
  const anteriores = medirPeriodo(
    asistencias,
    restarDias(hoy, DIAS_DE_TENDENCIA * 2 - 1),
    restarDias(hoy, DIAS_DE_TENDENCIA)
  );
  const diferencia =
    ultimos.porcentaje !== null && anteriores.porcentaje !== null
      ? ultimos.porcentaje - anteriores.porcentaje
      : null;
  return { ultimos, anteriores, diferencia, direccion: describirDireccion(diferencia) };
}

function prioridadDeCobro(ficha) {
  const base = ficha.estudiante.estado_pago === "vencido" ? 10 : 5;
  return base + ficha.puntosDeAsistencia;
}

function armarSeguimientoDePagos(fichas) {
  return fichas
    .filter((ficha) => ficha.estudiante.estado_pago !== "al_dia")
    .map((ficha) => ({
      estudiante: ficha.estudiante,
      prioridad: prioridadDeCobro(ficha),
      razones: [
        ficha.estudiante.estado_pago === "vencido" ? "pago vencido" : "pago pendiente",
        ...ficha.razonesDeAsistencia,
      ],
    }))
    .sort(
      (a, b) =>
        b.prioridad - a.prioridad || a.estudiante.nombre_completo.localeCompare(b.estudiante.nombre_completo)
    );
}

const porNombre = (a, b) => a.estudiante.nombre_completo.localeCompare(b.estudiante.nombre_completo, "es");

function resumirGrupo(estudiantes, asistencias, hoy) {
  const porEstudiante = agruparAsistenciaPorEstudiante(asistencias);
  const fichas = estudiantes.map((estudiante) => crearFicha(estudiante, porEstudiante[estudiante.id] || []));
  const seguimientoDePagos = armarSeguimientoDePagos(fichas);
  const contarPago = (estado) => estudiantes.filter((estudiante) => estudiante.estado_pago === estado).length;
  const presentes = asistencias.filter((registro) => registro.asistio).length;
  const hayAsistencia = asistencias.length > 0;

  return {
    activos: estudiantes.length,
    fichas,
    alDia: contarPago("al_dia"),
    pendientes: contarPago("pendiente"),
    vencidos: contarPago("vencido"),
    porCobrar: seguimientoDePagos.map((fila) => fila.estudiante),
    seguimientoDePagos,
    conRiesgo: fichas
      .filter((ficha) => ficha.puntos >= 2)
      .sort((a, b) => b.puntos - a.puntos || porNombre(a, b)),
    conFaltasSeguidas: fichas
      .filter((ficha) => ficha.faltasSeguidas >= 2)
      .sort((a, b) => b.faltasSeguidas - a.faltasSeguidas || porNombre(a, b)),
    sinRegistros: hayAsistencia ? fichas.filter((ficha) => ficha.registros === 0).sort(porNombre) : [],
    asistenciaPromedio: porcentaje(presentes, asistencias.length),
    registrosDeAsistencia: asistencias.length,
    tendencia: calcularTendencia(asistencias, hoy),
  };
}

function nombreDeDisciplina(estudiante) {
  return estudiante.disciplinas && estudiante.disciplinas.nombre
    ? estudiante.disciplinas.nombre
    : "Sin disciplina";
}

function analizarPorDisciplina(estudiantes, asistencias, disciplinas, hoy) {
  const nombres = new Set(disciplinas.map((disciplina) => disciplina.nombre));
  estudiantes.forEach((estudiante) => nombres.add(nombreDeDisciplina(estudiante)));

  return [...nombres]
    .map((nombre) => {
      const delGrupo = estudiantes.filter((estudiante) => nombreDeDisciplina(estudiante) === nombre);
      const ids = new Set(delGrupo.map((estudiante) => estudiante.id));
      const asistenciasDelGrupo = asistencias.filter((registro) => ids.has(registro.estudiante_id));
      return { nombre, ...resumirGrupo(delGrupo, asistenciasDelGrupo, hoy) };
    })
    .sort((a, b) => b.activos - a.activos || a.nombre.localeCompare(b.nombre, "es"));
}

export function analizar({ estudiantes = [], asistencias = [], disciplinas = [], hoy }) {
  const ids = new Set(estudiantes.map((estudiante) => estudiante.id));
  const asistenciasDeActivos = asistencias.filter((registro) => ids.has(registro.estudiante_id));

  return {
    ...resumirGrupo(estudiantes, asistenciasDeActivos, hoy),
    disciplinasCreadas: disciplinas.length,
    porDisciplina: analizarPorDisciplina(estudiantes, asistenciasDeActivos, disciplinas, hoy),
  };
}
