import { primerNombre } from "../utilidades/texto.js";

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
  return {
    nivel: "medio",
    titulo: "Todavía no hay estudiantes activos",
    detalle: "Agrégalos en la vista Estudiantes para que el asistente pueda analizar tus grupos.",
  };
}

function hallazgoDeRiesgoAlto(analisis) {
  const enRiesgoAlto = analisis.conRiesgo.filter((fila) => fila.puntos >= 4);
  if (enRiesgoAlto.length === 0) {
    return null;
  }
  const primero = enRiesgoAlto[0];
  return {
    nivel: "alto",
    titulo:
      enRiesgoAlto.length === 1
        ? "1 estudiante podría retirarse"
        : enRiesgoAlto.length + " estudiantes podrían retirarse",
    detalle:
      "El caso más urgente es " +
      primero.estudiante.nombre_completo +
      ": " +
      primero.razones.join(", ") +
      ". Conviene llamar al acudiente esta semana.",
    mensajeSugerido: redactarMensajeDeRiesgo(primero.estudiante),
  };
}

function hallazgoDeRiesgoMedio(analisis) {
  const enRiesgoMedio = analisis.conRiesgo.filter((fila) => fila.puntos < 4);
  if (enRiesgoMedio.length === 0) {
    return null;
  }
  return {
    nivel: "medio",
    titulo: enRiesgoMedio.length + " estudiantes para vigilar",
    detalle:
      enRiesgoMedio
        .slice(0, 3)
        .map((fila) => fila.estudiante.nombre_completo + " (" + fila.razones[0] + ")")
        .join("; ") + ".",
  };
}

function hallazgoDeCobros(analisis) {
  if (analisis.porCobrar.length === 0) {
    return null;
  }
  const primero = analisis.porCobrar[0];
  return {
    nivel: analisis.vencidos > 0 ? "alto" : "medio",
    titulo:
      analisis.porCobrar.length === 1
        ? "1 estudiante no está al día con el pago"
        : analisis.porCobrar.length + " estudiantes no están al día con el pago",
    detalle:
      (analisis.vencidos > 0
        ? analisis.vencidos + " ya tienen el pago vencido. "
        : "Ninguno llegó todavía a vencido. ") +
      "Empieza por " +
      primero.nombre_completo +
      ".",
    mensajeSugerido: redactarMensajeDeCobro(primero),
  };
}

function hallazgoSinAsistencia(analisis) {
  if (analisis.registrosDeAsistencia > 0 || analisis.activos === 0) {
    return null;
  }
  return {
    nivel: "medio",
    titulo: "No has registrado asistencia",
    detalle:
      "Sin asistencia no se puede saber quién está faltando. Tómala en la vista Asistencia y vuelve aquí.",
  };
}

const TODO_EN_ORDEN = {
  nivel: "bueno",
  titulo: "Todo marcha bien",
  detalle:
    "Nadie está en riesgo de retirarse y todos los pagos están al día. " +
    "Sigue registrando la asistencia para que el asistente pueda avisarte a tiempo.",
};

export function construirHallazgos(analisis) {
  const hallazgos = [
    hallazgoSinEstudiantes(analisis),
    hallazgoDeRiesgoAlto(analisis),
    hallazgoDeRiesgoMedio(analisis),
    hallazgoDeCobros(analisis),
    hallazgoSinAsistencia(analisis),
  ].filter(Boolean);

  return hallazgos.length > 0 ? hallazgos : [TODO_EN_ORDEN];
}
