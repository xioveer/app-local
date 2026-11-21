import { elementos } from "../dom.js";

const COLORES_POR_TIPO = {
  exito: "bg-emerald-600 text-white",
  error: "bg-rose-600 text-white",
  info: "bg-tinta text-white",
};

function yaEstaEnPantalla(mensaje) {
  return Array.from(elementos.contenedorAvisos.children).some((aviso) => aviso.textContent === mensaje);
}

export function mostrarAviso(mensaje, tipo = "info") {
  if (yaEstaEnPantalla(mensaje)) {
    return;
  }

  const aviso = document.createElement("div");
  aviso.className =
    "pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg " +
    (COLORES_POR_TIPO[tipo] || COLORES_POR_TIPO.info);
  aviso.setAttribute("role", tipo === "error" ? "alert" : "status");
  aviso.textContent = mensaje;
  elementos.contenedorAvisos.appendChild(aviso);

  const milisegundos = tipo === "error" ? 7000 : 4000;
  setTimeout(() => aviso.remove(), milisegundos);
}
