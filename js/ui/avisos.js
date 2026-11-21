import { elementos } from "../dom.js";

const COLORES_POR_TIPO = {
  exito: "before:bg-emerald-500 before:ring-emerald-500/20",
  error: "before:bg-rose-500 before:ring-rose-500/20",
  info: "before:bg-marca-500 before:ring-marca-500/20",
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
    "pointer-events-auto flex items-start gap-3 rounded-xl border border-borde bg-white px-4 py-3 " +
    "text-sm font-medium leading-5 text-slate-800 shadow-flotante motion-safe:animate-aparecer " +
    "before:mt-1.5 before:h-2 before:w-2 before:shrink-0 before:rounded-full before:ring-4 before:content-[''] " +
    (COLORES_POR_TIPO[tipo] || COLORES_POR_TIPO.info);
  aviso.setAttribute("role", tipo === "error" ? "alert" : "status");
  aviso.textContent = mensaje;
  elementos.contenedorAvisos.appendChild(aviso);

  const milisegundos = tipo === "error" ? 7000 : 4000;
  setTimeout(() => aviso.remove(), milisegundos);
}
