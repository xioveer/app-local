import { primerNombre } from "../utilidades/texto.js";

const UMBRAL_DE_ASISTENCIA_BAJA = 70;

const enPlural = (cantidad, singular, plural) => (cantidad === 1 ? singular : plural);

function nombrarVarios(nombres, maximo = 3) {
  const visibles = nombres.slice(0, maximo).join(", ");
  const resto = nombres.length - maximo;
  return resto > 0 ? visibles + " y " + resto + " más" : visibles;
}

function redactarMensajeDeRiesgo(estudiante) {
  return (
    "Hola, le escribimos de la academia. Notamos que " +
    primerNombre(estudiante.nombre_completo) +
    " no ha venido a las últimas clases y queremos saber si todo está bien. " +
    "Nos encantaría volver a verlo. ¿Le sirve que conversemos esta semana?"
  );
}

function redactarMensajeDeCobro(estudiante) {
  return (
    "Hola, le saludamos de la academia. Le recordamos que la mensualidad de " +
    primerNombre(estudiante.nombre_completo) +
    " está pendiente. Si ya la pagó, por favor ignore este mensaje. ¡Gracias!"
  );
}

function hallazgoSinEstudiantes(analisis) {
  if (analisis.activos > 0) {
    return null;
  }
  const sinDisciplinas = analisis.disciplinasCreadas === 0;
  return {
    nivel: "medio",
    titulo: "Todavía no hay estudiantes activos",
    detalle:
      "Cuando registres a tus estudiantes y su asistencia, aquí verás quién está faltando, " +
      "quién debe la mensualidad y cómo va cada disciplina.",
    accion: sinDisciplinas
      ? "Crea tu primera disciplina en la vista Disciplinas y luego agrega a tus estudiantes."
      : "Agrega a tus estudiantes en la vista Estudiantes.",
  };
}

function hallazgoDeRiesgoAlto(analisis) {
  const enRiesgoAlto = analisis.conRiesgo.filter((ficha) => ficha.puntos >= 4);
  if (enRiesgoAlto.length === 0) {
    return null;
  }
  const primero = enRiesgoAlto[0];
  return {
    nivel: "alto",
    titulo:
      enRiesgoAlto.length +
      enPlural(enRiesgoAlto.length, " estudiante podría", " estudiantes podrían") +
      " retirarse",
    detalle:
      "El caso más urgente es " +
      primero.estudiante.nombre_completo +
      ": " +
      primero.razones.join(", ") +
      "." +
      (enRiesgoAlto.length > 1
        ? " También: " +
          nombrarVarios(enRiesgoAlto.slice(1).map((ficha) => ficha.estudiante.nombre_completo)) +
          "."
        : ""),
    accion:
      "Llama hoy al acudiente de " +
      primerNombre(primero.estudiante.nombre_completo) +
      " para saber qué pasa.",
    mensajeSugerido: redactarMensajeDeRiesgo(primero.estudiante),
  };
}

function hallazgoParaVigilar(analisis) {
  const fichas = analisis.conRiesgo.filter((ficha) => ficha.puntos < 4 && ficha.puntosDeAsistencia > 0);
  if (fichas.length === 0) {
    return null;
  }
  return {
    nivel: "medio",
    titulo: fichas.length + enPlural(fichas.length, " estudiante para vigilar", " estudiantes para vigilar"),
    detalle:
      nombrarVarios(
        fichas.map((ficha) => ficha.estudiante.nombre_completo + " (" + ficha.razonesDeAsistencia[0] + ")"),
        4
      ) + ".",
    accion: "Pregunta por ellos en la próxima clase o escribe a su acudiente.",
  };
}

function hallazgoDeCobros(analisis) {
  if (analisis.seguimientoDePagos.length === 0) {
    return null;
  }
  const cantidad = analisis.seguimientoDePagos.length;
  const primero = analisis.seguimientoDePagos[0];
  return {
    nivel: analisis.vencidos > 0 ? "alto" : "medio",
    titulo:
      cantidad + enPlural(cantidad, " estudiante no está", " estudiantes no están") + " al día con el pago",
    detalle:
      (analisis.vencidos > 0
        ? analisis.vencidos + enPlural(analisis.vencidos, " tiene", " tienen") + " el pago vencido y "
        : "Ninguno llegó todavía a vencido; ") +
      analisis.pendientes +
      enPlural(analisis.pendientes, " está pendiente", " están pendientes") +
      ". Orden sugerido: " +
      nombrarVarios(
        analisis.seguimientoDePagos.map((fila) => fila.estudiante.nombre_completo),
        4
      ) +
      ".",
    accion: "Empieza por " + primero.estudiante.nombre_completo + " (" + primero.razones.join(", ") + ").",
    mensajeSugerido: redactarMensajeDeCobro(primero.estudiante),
  };
}

function hallazgoDeTendencia(analisis) {
  const { direccion, diferencia, ultimos, anteriores } = analisis.tendencia;
  if (direccion !== "baja" && direccion !== "sube") {
    return null;
  }
  const comparacion =
    " (" + ultimos.porcentaje + "% frente a " + anteriores.porcentaje + "% la semana anterior).";
  if (direccion === "baja") {
    return {
      nivel: "medio",
      titulo: "La asistencia bajó " + Math.abs(diferencia) + " puntos esta semana",
      detalle: "En los últimos 7 días asistió menos gente" + comparacion,
      accion: "Revisa en la vista Asistencia qué días faltaron más y recuerda la próxima clase a tus grupos.",
    };
  }
  return {
    nivel: "bueno",
    titulo: "La asistencia subió " + diferencia + " puntos esta semana",
    detalle: "En los últimos 7 días asistió más gente" + comparacion,
    accion: "Cuéntaselo a tus grupos: reconocer el esfuerzo ayuda a mantenerlo.",
  };
}

function hallazgoDeDisciplinaBaja(analisis) {
  const conDatos = (analisis.porDisciplina || []).filter((grupo) => grupo.asistenciaPromedio !== null);
  if (conDatos.length < 2) {
    return null;
  }
  const masBaja = conDatos.reduce((peor, grupo) =>
    grupo.asistenciaPromedio < peor.asistenciaPromedio ? grupo : peor
  );
  if (masBaja.asistenciaPromedio >= UMBRAL_DE_ASISTENCIA_BAJA) {
    return null;
  }
  return {
    nivel: "medio",
    titulo: masBaja.nombre + " tiene la asistencia más baja (" + masBaja.asistenciaPromedio + "%)",
    detalle:
      "Sobre " +
      masBaja.registrosDeAsistencia +
      " registros de " +
      masBaja.activos +
      enPlural(masBaja.activos, " estudiante.", " estudiantes."),
    accion: "Pregúntale a tu grupo de " + masBaja.nombre + " si el horario les sigue sirviendo.",
  };
}

function hallazgoSinRegistros(analisis) {
  if (analisis.sinRegistros.length === 0) {
    return null;
  }
  const cantidad = analisis.sinRegistros.length;
  return {
    nivel: "medio",
    titulo:
      cantidad +
      enPlural(cantidad, " estudiante no tiene", " estudiantes no tienen") +
      " asistencia registrada",
    detalle:
      nombrarVarios(
        analisis.sinRegistros.map((ficha) => ficha.estudiante.nombre_completo),
        4
      ) + ".",
    accion: "Inclúyelos al tomar asistencia o, si ya no vienen, márcalos como inactivos en Estudiantes.",
  };
}

function hallazgoSinAsistencia(analisis) {
  if (analisis.registrosDeAsistencia > 0 || analisis.activos === 0) {
    return null;
  }
  return {
    nivel: "medio",
    titulo: "No has registrado asistencia",
    detalle: "Sin asistencia no se puede saber quién está faltando ni cómo va cada grupo.",
    accion: "Toma la asistencia de hoy en la vista Asistencia y vuelve aquí.",
  };
}

const TODO_EN_ORDEN = {
  nivel: "bueno",
  titulo: "Todo marcha bien",
  detalle: "Nadie está en riesgo de retirarse y todos los pagos están al día.",
  accion: "Sigue registrando la asistencia para que el asistente pueda avisarte a tiempo.",
};

export function construirHallazgos(analisis) {
  const hallazgos = [
    hallazgoSinEstudiantes(analisis),
    hallazgoDeRiesgoAlto(analisis),
    hallazgoDeCobros(analisis),
    hallazgoParaVigilar(analisis),
    hallazgoDeTendencia(analisis),
    hallazgoDeDisciplinaBaja(analisis),
    hallazgoSinRegistros(analisis),
    hallazgoSinAsistencia(analisis),
  ].filter(Boolean);

  const hayAlgoQueAtender = hallazgos.some((hallazgo) => hallazgo.nivel !== "bueno");
  return hayAlgoQueAtender ? hallazgos : [TODO_EN_ORDEN, ...hallazgos];
}
