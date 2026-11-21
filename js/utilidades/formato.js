export function formatearFecha(fecha) {
  return fecha.split("-").reverse().join("/");
}

export function formatearFechaLarga(momento) {
  return momento.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function fechaDeUnTexto(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

export function formatearFechaLargaDeTexto(fecha) {
  return formatearFechaLarga(fechaDeUnTexto(fecha));
}

export function nombreDelDia(fecha) {
  return fechaDeUnTexto(fecha).toLocaleDateString("es-CO", { weekday: "long" });
}

export function formatearHora(momento) {
  return momento.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatearPorcentaje(porcentaje) {
  return String(porcentaje).replace(".", ",") + "%";
}
