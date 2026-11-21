const compararNombres = (a, b) => a.nombre.localeCompare(b.nombre, "es");

function describirEstudiante(estudiante) {
  return {
    nombre: estudiante.nombre_completo,
    disciplina: estudiante.disciplinas ? estudiante.disciplinas.nombre : "",
    categoria: estudiante.categoria || "",
  };
}

function perteneceALaDisciplina(estudiante, idDisciplina) {
  return idDisciplina === "" || String(estudiante.disciplina_id) === idDisciplina;
}

export function porcentajeDeAsistencia(presentes, total) {
  if (total === 0) {
    return 0;
  }
  return Math.round((presentes / total) * 1000) / 10;
}

export function armarDias(registros, estudiantes, idDisciplina) {
  const estudiantesPorId = new Map(estudiantes.map((estudiante) => [estudiante.id, estudiante]));
  const diasPorFecha = new Map();

  registros.forEach((registro) => {
    const estudiante = estudiantesPorId.get(registro.estudiante_id);
    if (!estudiante || !perteneceALaDisciplina(estudiante, idDisciplina)) {
      return;
    }
    if (!diasPorFecha.has(registro.fecha)) {
      diasPorFecha.set(registro.fecha, { fecha: registro.fecha, presentes: [], ausentes: [] });
    }
    const dia = diasPorFecha.get(registro.fecha);
    (registro.asistio ? dia.presentes : dia.ausentes).push(describirEstudiante(estudiante));
  });

  return [...diasPorFecha.values()]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((dia) => {
      const total = dia.presentes.length + dia.ausentes.length;
      return {
        fecha: dia.fecha,
        presentes: dia.presentes.sort(compararNombres),
        ausentes: dia.ausentes.sort(compararNombres),
        total,
        porcentaje: porcentajeDeAsistencia(dia.presentes.length, total),
      };
    });
}

export function resumirDias(dias) {
  const presentes = dias.reduce((suma, dia) => suma + dia.presentes.length, 0);
  const total = dias.reduce((suma, dia) => suma + dia.total, 0);
  return {
    cantidadDeDias: dias.length,
    presentes,
    ausentes: total - presentes,
    porcentaje: porcentajeDeAsistencia(presentes, total),
  };
}

function diasEntre(desde, hasta) {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

export const DIAS_MAXIMOS_DEL_RANGO = 366;

export function validarRangoDeFechas(desde, hasta, hoy, fechaMinima) {
  if (desde === "" || hasta === "") {
    return "Elige la fecha de inicio y la fecha final.";
  }
  if (desde < fechaMinima) {
    return "La fecha de inicio no es válida.";
  }
  if (hasta > hoy) {
    return "La fecha final no puede ser posterior a hoy.";
  }
  if (desde > hasta) {
    return "La fecha de inicio debe ser anterior o igual a la fecha final.";
  }
  if (diasEntre(desde, hasta) >= DIAS_MAXIMOS_DEL_RANGO) {
    return "Elige un rango de máximo un año.";
  }
  return "";
}
