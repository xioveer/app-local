import { normalizarTexto } from "../utilidades/texto.js";

const TEMAS = [
  {
    tema: "acciones",
    patron:
      /\bque (hago|debo hacer|hacer|me recomiendas|sugieres)|recomiend|prioridad|priorizar|urgente|por donde empiezo/,
  },
  {
    tema: "sinRegistros",
    patron: /sin registr|nunca|sin asistencia|no tienen? (ninguna )?asistencia|no (he|han) registrado/,
  },
  {
    tema: "pagos",
    patron:
      /cobr|pag[aoóu]|pagar|\bdeb(e|en|iendo)\b|deud|atrasad|moros|mensualidad|plata|dinero|vencid|pendient|al dia/,
  },
  { tema: "riesgo", patron: /riesg|retir|deser|abandon|perder|\bdej(a|ar|ando|aron)\b|\bse va(n|ya|yan)?\b/ },
  {
    tema: "tendencia",
    patron: /tendenc|semana|mejor(o|ando|a)?\b|empeor|\bbaj(o|a|ando)\b|\bsub(e|io|iendo)\b|compar|evolucion/,
  },
  { tema: "faltas", patron: /falt|no vien|no han venido|no vino|no van|ausen|inasist|no asist/ },
  { tema: "asistencia", patron: /asist|vinier|vienen|present|clases/ },
  { tema: "estudiantes", patron: /cuant|activ|estudiant|alumn|inscrit|grupo/ },
];

const PALABRAS_GENERICAS = new Set([
  "clase",
  "clases",
  "grupo",
  "grupos",
  "disciplina",
  "academia",
  "escuela",
  "sin",
]);

const separarPalabras = (texto) =>
  normalizarTexto(texto)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

function contienePalabra(texto, palabra) {
  return new RegExp("\\b" + palabra + "\\b").test(texto);
}

function palabrasClaveDeDisciplina(nombre) {
  return separarPalabras(nombre).filter((palabra) => palabra.length >= 4 && !PALABRAS_GENERICAS.has(palabra));
}

export function detectarTema(texto) {
  const encontrado = TEMAS.find((posible) => posible.patron.test(texto));
  return encontrado ? encontrado.tema : null;
}

export function detectarDisciplina(texto, nombres) {
  const completa = nombres.find((nombre) => texto.includes(normalizarTexto(nombre)));
  if (completa) {
    return completa;
  }
  const porPalabra = nombres.find((nombre) =>
    palabrasClaveDeDisciplina(nombre).some((palabra) => new RegExp("\\b" + palabra).test(texto))
  );
  return porPalabra || null;
}

function puntajeDeNombre(texto, nombreCompleto) {
  const [nombre, ...apellidos] = separarPalabras(nombreCompleto);
  if (!nombre || nombre.length < 3 || !contienePalabra(texto, nombre)) {
    return 0;
  }
  return 1 + apellidos.filter((apellido) => apellido.length >= 3 && contienePalabra(texto, apellido)).length;
}

export function detectarEstudiantes(texto, estudiantes) {
  const conPuntaje = estudiantes
    .map((estudiante) => ({ estudiante, puntaje: puntajeDeNombre(texto, estudiante.nombre_completo) }))
    .filter((fila) => fila.puntaje > 0);
  if (conPuntaje.length === 0) {
    return [];
  }
  const mejor = Math.max(...conPuntaje.map((fila) => fila.puntaje));
  return conPuntaje.filter((fila) => fila.puntaje === mejor).map((fila) => fila.estudiante);
}

export function interpretarPregunta(pregunta, { nombresDeDisciplinas = [], estudiantes = [] } = {}) {
  const texto = normalizarTexto(pregunta);
  const disciplina = detectarDisciplina(texto, nombresDeDisciplinas);
  return {
    tema: detectarTema(texto),
    disciplina,
    estudiantes: detectarEstudiantes(texto, estudiantes),
  };
}
