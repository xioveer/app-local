import { DIAS_DE_TENDENCIA, DIAS_QUE_MIRA } from "./analisis.js";
import { construirHallazgos } from "./hallazgos.js";
import { interpretarPregunta } from "./preguntas.js";

const MAXIMO_DE_LINEAS = 8;
const TEXTO_DEL_ESTADO = { al_dia: "al día", pendiente: "pendiente", vencido: "vencido" };

const enPlural = (cantidad, singular, plural) => (cantidad === 1 ? singular : plural);
const comoValor = (porcentaje) => (porcentaje === null ? "sin datos" : porcentaje + "%");

function enLista(lineas) {
  const visibles = lineas.slice(0, MAXIMO_DE_LINEAS).map((linea) => "· " + linea);
  const resto = lineas.length - MAXIMO_DE_LINEAS;
  return (resto > 0 ? [...visibles, "· y " + resto + " más"] : visibles).join("\n");
}

const PEDIR_ESTUDIANTES =
  "Todavía no tienes estudiantes activos. Cuando los agregues en la vista Estudiantes " +
  "podré decirte quién no está al día con el pago y quién está faltando.";

const PEDIR_ASISTENCIA =
  "Todavía no hay asistencia registrada. Tómala en la vista Asistencia y podré decirte quién está faltando.";

function describirTendencia(tendencia) {
  const { ultimos, anteriores, diferencia, direccion } = tendencia;
  if (ultimos.porcentaje === null) {
    return "No hay asistencia registrada en los últimos " + DIAS_DE_TENDENCIA + " días.";
  }
  if (diferencia === null) {
    return (
      "En los últimos " +
      DIAS_DE_TENDENCIA +
      " días la asistencia fue del " +
      ultimos.porcentaje +
      "%. No hay datos de la semana anterior para comparar."
    );
  }
  const cambio = {
    sube: "subió " + diferencia + " puntos",
    baja: "bajó " + Math.abs(diferencia) + " puntos",
    estable: "se mantuvo estable",
  }[direccion];
  return (
    "En los últimos " +
    DIAS_DE_TENDENCIA +
    " días la asistencia fue del " +
    ultimos.porcentaje +
    "% (" +
    ultimos.registros +
    " registros) y " +
    cambio +
    " frente a los " +
    DIAS_DE_TENDENCIA +
    " días anteriores (" +
    anteriores.porcentaje +
    "%)."
  );
}

function responderSobrePagos(analisis, alcance) {
  if (analisis.activos === 0) return PEDIR_ESTUDIANTES;
  if (analisis.seguimientoDePagos.length === 0) {
    return "Todos tus estudiantes" + alcance + " están al día con el pago. No tienes nada por cobrar.";
  }
  const cantidad = analisis.seguimientoDePagos.length;
  return (
    cantidad +
    enPlural(cantidad, " estudiante", " estudiantes") +
    alcance +
    enPlural(cantidad, " no está al día", " no están al día") +
    " (" +
    analisis.vencidos +
    " con pago vencido y " +
    analisis.pendientes +
    enPlural(analisis.pendientes, " pendiente", " pendientes") +
    "). En este orden, de más a menos urgente:\n" +
    enLista(
      analisis.seguimientoDePagos.map(
        (fila) => fila.estudiante.nombre_completo + ": " + fila.razones.join(", ")
      )
    ) +
    "\n\nEmpieza por " +
    analisis.seguimientoDePagos[0].estudiante.nombre_completo +
    "; en Hallazgos tienes un mensaje listo para copiar."
  );
}

function responderSobreRiesgo(analisis, alcance) {
  if (analisis.activos === 0) return PEDIR_ESTUDIANTES;
  if (analisis.conRiesgo.length === 0) {
    return "Ningún estudiante" + alcance + " muestra señales de querer retirarse.";
  }
  return (
    "Estos estudiantes" +
    alcance +
    " necesitan atención, del más urgente al menos urgente:\n" +
    enLista(
      analisis.conRiesgo.map((ficha) => ficha.estudiante.nombre_completo + ": " + ficha.razones.join(", "))
    ) +
    "\n\nLlama primero al acudiente de " +
    analisis.conRiesgo[0].estudiante.nombre_completo +
    "."
  );
}

function responderSobreFaltas(analisis, alcance) {
  if (analisis.activos === 0) return PEDIR_ESTUDIANTES;
  if (analisis.registrosDeAsistencia === 0) return PEDIR_ASISTENCIA;
  const bajos = analisis.conRiesgo.filter(
    (ficha) => ficha.faltasSeguidas < 2 && ficha.porcentajeReciente !== null && ficha.porcentajeReciente < 60
  );
  if (analisis.conFaltasSeguidas.length === 0 && bajos.length === 0) {
    return "Nadie" + alcance + " lleva 2 o más faltas seguidas ni tiene la asistencia baja. ¡Buen trabajo!";
  }
  const lineas = [
    ...analisis.conFaltasSeguidas.map(
      (ficha) => ficha.estudiante.nombre_completo + ": " + ficha.faltasSeguidas + " faltas seguidas"
    ),
    ...bajos.map(
      (ficha) =>
        ficha.estudiante.nombre_completo +
        ": asistió al " +
        ficha.porcentajeReciente +
        "% de sus últimas clases"
    ),
  ];
  return (
    "Quienes más están faltando" +
    alcance +
    ":\n" +
    enLista(lineas) +
    "\n\nPregunta por ellos en la próxima clase o escribe a su acudiente."
  );
}

function lineasPorDisciplina(analisis, describir) {
  return analisis.porDisciplina
    .filter((grupo) => grupo.activos > 0)
    .map((grupo) => grupo.nombre + ": " + describir(grupo));
}

function responderSobreAsistencia(analisis, alcance, esGeneral) {
  if (analisis.activos === 0) return PEDIR_ESTUDIANTES;
  if (analisis.asistenciaPromedio === null) return PEDIR_ASISTENCIA;
  const porGrupo = esGeneral
    ? lineasPorDisciplina(analisis, (grupo) => comoValor(grupo.asistenciaPromedio))
    : [];
  return (
    "La asistencia promedio" +
    alcance +
    " de los últimos " +
    DIAS_QUE_MIRA +
    " días es del " +
    analisis.asistenciaPromedio +
    "%, sobre " +
    analisis.registrosDeAsistencia +
    " registros.\n" +
    describirTendencia(analisis.tendencia) +
    (porGrupo.length > 1 ? "\n\nPor disciplina:\n" + enLista(porGrupo) : "")
  );
}

function responderSobreTendencia(analisis, alcance) {
  if (analisis.activos === 0) return PEDIR_ESTUDIANTES;
  if (analisis.registrosDeAsistencia === 0) return PEDIR_ASISTENCIA;
  const consejo =
    analisis.tendencia.direccion === "baja"
      ? "\n\nRevisa en la vista Asistencia qué días faltaron más y recuérdales la próxima clase."
      : "";
  return (
    (alcance ? "En" + alcance.replace(" en", "") + ": " : "") +
    describirTendencia(analisis.tendencia) +
    consejo
  );
}

function responderSobreSinRegistros(analisis, alcance) {
  if (analisis.activos === 0) return PEDIR_ESTUDIANTES;
  if (analisis.registrosDeAsistencia === 0) return PEDIR_ASISTENCIA;
  if (analisis.sinRegistros.length === 0) {
    return "Todos tus estudiantes activos" + alcance + " tienen al menos una asistencia registrada.";
  }
  return (
    "Estos estudiantes" +
    alcance +
    " no tienen ninguna asistencia en los últimos " +
    DIAS_QUE_MIRA +
    " días:\n" +
    enLista(analisis.sinRegistros.map((ficha) => ficha.estudiante.nombre_completo)) +
    "\n\nInclúyelos al tomar asistencia o, si ya no vienen, márcalos como inactivos."
  );
}

function responderSobreEstudiantes(analisis, alcance, esGeneral) {
  if (analisis.activos === 0) return PEDIR_ESTUDIANTES;
  const porGrupo = esGeneral ? lineasPorDisciplina(analisis, (grupo) => grupo.activos + " activos") : [];
  return (
    "Tienes " +
    analisis.activos +
    enPlural(analisis.activos, " estudiante activo", " estudiantes activos") +
    alcance +
    ", " +
    analisis.alDia +
    " de ellos al día con el pago." +
    (porGrupo.length > 1 ? "\n\nPor disciplina:\n" + enLista(porGrupo) : "")
  );
}

function responderConAcciones(analisis) {
  const acciones = construirHallazgos(analisis)
    .filter((hallazgo) => hallazgo.nivel !== "bueno")
    .slice(0, 3)
    .map((hallazgo) => hallazgo.accion);
  if (acciones.length === 0) {
    return "No hay nada urgente. Sigue registrando la asistencia para que pueda avisarte a tiempo.";
  }
  return (
    "Esto es lo que yo haría, en este orden:\n" +
    acciones.map((accion, i) => i + 1 + ". " + accion).join("\n")
  );
}

function responderSobreDisciplina(grupo) {
  if (grupo.activos === 0) {
    return grupo.nombre + " todavía no tiene estudiantes activos. Agrégalos en la vista Estudiantes.";
  }
  const lineas = [
    grupo.activos + enPlural(grupo.activos, " estudiante activo", " estudiantes activos"),
    "Pagos: " +
      grupo.alDia +
      " al día, " +
      grupo.pendientes +
      " pendientes y " +
      grupo.vencidos +
      " vencidos",
    "Asistencia promedio: " + comoValor(grupo.asistenciaPromedio),
    grupo.conRiesgo.length +
      enPlural(grupo.conRiesgo.length, " estudiante en riesgo", " estudiantes en riesgo"),
  ];
  const urgente = grupo.conRiesgo[0];
  return (
    "Así va " +
    grupo.nombre +
    ":\n" +
    enLista(lineas) +
    "\n" +
    describirTendencia(grupo.tendencia) +
    (urgente
      ? "\n\nAtiende primero a " +
        urgente.estudiante.nombre_completo +
        ": " +
        urgente.razones.join(", ") +
        "."
      : "")
  );
}

function describirEstudiante(ficha) {
  const { estudiante } = ficha;
  const partes = [
    "Pago: " + TEXTO_DEL_ESTADO[estudiante.estado_pago],
    ficha.registros === 0
      ? "Sin asistencia registrada en los últimos " + DIAS_QUE_MIRA + " días"
      : "Asistió al " + ficha.porcentajeReciente + "% de sus últimas clases",
  ];
  if (ficha.faltasSeguidas >= 2) {
    partes.push("Lleva " + ficha.faltasSeguidas + " faltas seguidas");
  }
  return estudiante.nombre_completo + ":\n" + enLista(partes);
}

function responderSobreEstudiantesMencionados(estudiantes, analisis) {
  const fichas = estudiantes
    .map((estudiante) => analisis.fichas.find((ficha) => ficha.estudiante.id === estudiante.id))
    .filter(Boolean);
  if (fichas.length > 3) {
    return (
      "Encontré varios estudiantes con ese nombre: " +
      fichas.map((ficha) => ficha.estudiante.nombre_completo).join(", ") +
      ". Escribe también el apellido."
    );
  }
  return fichas.map(describirEstudiante).join("\n\n");
}

function responderConUnResumen(analisis) {
  const resumen =
    analisis.activos === 0
      ? "Esto es lo que veo hoy: todavía no tienes estudiantes activos."
      : "Esto es lo que veo hoy:\n" +
        enLista([
          analisis.activos + " estudiantes activos",
          analisis.seguimientoDePagos.length + " no están al día con el pago",
          analisis.conRiesgo.length + " en riesgo de retirarse",
          comoValor(analisis.asistenciaPromedio) + " de asistencia promedio",
        ]);
  return (
    resumen +
    "\n\nPuedo responderte sobre: pagos (quién debe y en qué orden cobrar), faltas seguidas, " +
    "riesgo de retiro, asistencia y cómo cambió esta semana, estudiantes sin asistencia registrada, " +
    "qué hacer primero, un estudiante por su nombre y cada disciplina (por ejemplo «¿cómo va " +
    (analisis.porDisciplina[0] ? analisis.porDisciplina[0].nombre : "Guitarra") +
    "?»)."
  );
}

const RESPUESTAS_POR_TEMA = {
  acciones: responderConAcciones,
  sinRegistros: responderSobreSinRegistros,
  pagos: responderSobrePagos,
  riesgo: responderSobreRiesgo,
  tendencia: responderSobreTendencia,
  faltas: responderSobreFaltas,
  asistencia: responderSobreAsistencia,
  estudiantes: responderSobreEstudiantes,
};

export function interpretarConLosDatos(pregunta, analisis) {
  return interpretarPregunta(pregunta, {
    nombresDeDisciplinas: analisis.porDisciplina.map((grupo) => grupo.nombre),
    estudiantes: analisis.fichas.map((ficha) => ficha.estudiante),
  });
}

export function responderConReglas(pregunta, analisis) {
  const { tema, disciplina, estudiantes } = interpretarConLosDatos(pregunta, analisis);
  if (estudiantes.length > 0) {
    return responderSobreEstudiantesMencionados(estudiantes, analisis);
  }
  const grupo = disciplina ? analisis.porDisciplina.find((posible) => posible.nombre === disciplina) : null;
  if (grupo && (!tema || grupo.activos === 0)) {
    return responderSobreDisciplina(grupo);
  }
  const responder = RESPUESTAS_POR_TEMA[tema];
  if (!responder) {
    return responderConUnResumen(analisis);
  }
  return grupo ? responder(grupo, " en " + grupo.nombre, false) : responder(analisis, "", true);
}
