import { elementos } from "../dom.js";

let operacionesEnCurso = 0;

export function mostrarCargando(texto = "Cargando...") {
  operacionesEnCurso++;
  elementos.textoCargando.textContent = texto;
  elementos.indicadorCargando.classList.remove("hidden");
}

export function ocultarCargando() {
  operacionesEnCurso = Math.max(0, operacionesEnCurso - 1);
  if (operacionesEnCurso === 0) {
    elementos.indicadorCargando.classList.add("hidden");
  }
}
