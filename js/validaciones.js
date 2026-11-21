import {
  EDAD_DE_MAYORIA,
  EDAD_MAXIMA,
  EDAD_MINIMA,
  ESTADOS_DE_PAGO,
  FECHA_MINIMA_DE_ASISTENCIA,
} from "./config/reglas.js";
import { fechaDeHoy } from "./utilidades/fechas.js";
import { normalizarTexto } from "./utilidades/texto.js";

const esNumeroEntero = (texto) => /^\d+$/.test(texto);

export function validarCredenciales(correo, contrasena) {
  if (correo === "") {
    return "Escribe tu correo electrónico.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return "El correo no tiene un formato válido.";
  }
  if (contrasena === "") {
    return "Escribe tu contraseña.";
  }
  return "";
}

export function validarNombreDeDisciplina(nombre, disciplinasExistentes) {
  if (nombre === "") {
    return "Escribe el nombre de la disciplina.";
  }
  if (nombre.length < 2) {
    return "El nombre de la disciplina debe tener al menos 2 letras.";
  }
  if (nombre.length > 50) {
    return "El nombre de la disciplina no puede pasar de 50 letras.";
  }

  const yaExiste = disciplinasExistentes.some(
    (disciplina) => normalizarTexto(disciplina.nombre) === normalizarTexto(nombre)
  );
  if (yaExiste) {
    return "Ya existe una disciplina llamada «" + nombre + "».";
  }
  return "";
}

export function estudianteEsMenor(textoEdad) {
  return esNumeroEntero(textoEdad) && Number(textoEdad) < EDAD_DE_MAYORIA;
}

function edadEsValida(textoEdad) {
  return esNumeroEntero(textoEdad) && Number(textoEdad) >= EDAD_MINIMA && Number(textoEdad) <= EDAD_MAXIMA;
}

function telefonoEsValido(texto) {
  if (!/^[+()\-\s\d]+$/.test(texto)) {
    return false;
  }
  const cantidadDeDigitos = texto.replace(/\D/g, "").length;
  return cantidadDeDigitos >= 7 && cantidadDeDigitos <= 15;
}

function validarAcudiente(datos, errores) {
  const esMenor = estudianteEsMenor(datos.edad);
  const obligatorio = " (obligatorio para menores de " + EDAD_DE_MAYORIA + " años).";

  if (esMenor && datos.acudiente_nombre.length < 3) {
    errores.acudiente_nombre = "Escribe el nombre del acudiente" + obligatorio;
  }
  if (esMenor && datos.acudiente_telefono === "") {
    errores.acudiente_telefono = "Escribe el teléfono del acudiente" + obligatorio;
  } else if (datos.acudiente_telefono !== "" && !telefonoEsValido(datos.acudiente_telefono)) {
    errores.acudiente_telefono =
      "Escribe un teléfono válido (de 7 a 15 dígitos; puedes usar espacios, + y -).";
  }
}

export function validarEstudiante(datos) {
  const errores = {};

  if (datos.nombre_completo.length < 3) {
    errores.nombre_completo = "Escribe el nombre completo (mínimo 3 letras).";
  }
  if (!edadEsValida(datos.edad)) {
    errores.edad = "La edad debe ser un número entero entre " + EDAD_MINIMA + " y " + EDAD_MAXIMA + ".";
  }
  if (datos.disciplina_id === "") {
    errores.disciplina_id = "Selecciona una disciplina.";
  }
  if (!ESTADOS_DE_PAGO.includes(datos.estado_pago)) {
    errores.estado_pago = "Selecciona el estado de pago.";
  }
  validarAcudiente(datos, errores);

  return errores;
}

export function validarFechaDeAsistencia(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return "Elige una fecha válida.";
  }
  if (fecha < FECHA_MINIMA_DE_ASISTENCIA) {
    return "La fecha es demasiado antigua.";
  }
  if (fecha > fechaDeHoy()) {
    return "No se puede registrar asistencia de una fecha futura.";
  }
  return "";
}
