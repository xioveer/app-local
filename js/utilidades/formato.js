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

export function formatearHora(momento) {
  return momento.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatearPorcentaje(porcentaje) {
  return String(porcentaje).replace(".", ",") + "%";
}
