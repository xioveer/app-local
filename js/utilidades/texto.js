export function normalizarTexto(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function limpiarEspacios(texto) {
  return texto.trim().replace(/\s+/g, " ");
}

export function textoONulo(texto) {
  return texto === "" ? null : texto;
}

export function obtenerIniciales(nombre) {
  const palabras = nombre.trim().split(/\s+/);
  const primera = palabras[0].charAt(0);
  const segunda = palabras.length > 1 ? palabras[1].charAt(0) : "";
  return (primera + segunda).toUpperCase();
}

export function primerNombre(nombreCompleto) {
  return nombreCompleto.split(" ")[0];
}
