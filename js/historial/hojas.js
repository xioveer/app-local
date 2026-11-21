import { formatearFechaLargaDeTexto, nombreDelDia } from "../utilidades/formato.js";
import { resumirDias } from "./dias.js";

const ENCABEZADO_DEL_DIA = ["Estudiante", "Disciplina", "Categoría", "Asistió"];
const ENCABEZADO_DEL_RESUMEN = ["Fecha", "Día", "Presentes", "Ausentes", "Total", "Asistencia (%)"];

const filaDeEstudiante = (asistio) => (persona) => [
  persona.nombre,
  persona.disciplina,
  persona.categoria,
  asistio ? "Sí" : "No",
];

export function hojaDeUnDia(dia, nombreDeLaDisciplina) {
  const titulo = "Asistencia del " + formatearFechaLargaDeTexto(dia.fecha);
  return {
    nombre: dia.fecha,
    anchos: [34, 22, 18, 12],
    filas: [
      [nombreDeLaDisciplina ? titulo + " · " + nombreDeLaDisciplina : titulo],
      [],
      ENCABEZADO_DEL_DIA,
      ...dia.presentes.map(filaDeEstudiante(true)),
      ...dia.ausentes.map(filaDeEstudiante(false)),
      [],
      ["Presentes", dia.presentes.length],
      ["Ausentes", dia.ausentes.length],
      ["Asistencia (%)", dia.porcentaje],
    ],
  };
}

export function hojaDeResumen(dias, desde, hasta, nombreDeLaDisciplina) {
  const resumen = resumirDias(dias);
  const rango = "Asistencia del " + desde + " al " + hasta;
  return {
    nombre: "Resumen",
    anchos: [14, 14, 12, 12, 10, 16],
    filas: [
      [nombreDeLaDisciplina ? rango + " · " + nombreDeLaDisciplina : rango],
      [],
      ENCABEZADO_DEL_RESUMEN,
      ...dias.map((dia) => [
        dia.fecha,
        nombreDelDia(dia.fecha),
        dia.presentes.length,
        dia.ausentes.length,
        dia.total,
        dia.porcentaje,
      ]),
      [],
      [
        "Total",
        "",
        resumen.presentes,
        resumen.ausentes,
        resumen.presentes + resumen.ausentes,
        resumen.porcentaje,
      ],
    ],
  };
}

export function hojasDelRango(dias, desde, hasta, nombreDeLaDisciplina) {
  return [
    hojaDeResumen(dias, desde, hasta, nombreDeLaDisciplina),
    ...dias.map((dia) => hojaDeUnDia(dia, nombreDeLaDisciplina)),
  ];
}

function nombreSeguroParaArchivo(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function nombreDelArchivo(partes, nombreDeLaDisciplina) {
  const conDisciplina = nombreDeLaDisciplina
    ? [...partes, nombreSeguroParaArchivo(nombreDeLaDisciplina)]
    : partes;
  return ["asistencia", ...conDisciplina].join("-") + ".xlsx";
}
