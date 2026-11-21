function fechaEnTexto(momento) {
  const anio = momento.getFullYear();
  const mes = String(momento.getMonth() + 1).padStart(2, "0");
  const dia = String(momento.getDate()).padStart(2, "0");
  return anio + "-" + mes + "-" + dia;
}

export function fechaDeHoy() {
  return fechaEnTexto(new Date());
}

export function fechaHaceDias(dias) {
  const momento = new Date();
  momento.setDate(momento.getDate() - dias);
  return fechaEnTexto(momento);
}
