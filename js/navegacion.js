import { estado } from "./estado.js";
import { confirmarDescartarCambios } from "./ui/confirmacion.js";
import { asistenciaTieneCambiosSinGuardar } from "./vistas/asistencia.js";

const abridoresDeVista = {};

export function registrarVistas(abridores) {
  Object.assign(abridoresDeVista, abridores);
}

function marcarPestanaActual(nombreVista) {
  document.querySelectorAll("nav [data-ir-a]").forEach((boton) => {
    if (boton.dataset.irA === nombreVista) {
      boton.setAttribute("aria-current", "page");
    } else {
      boton.removeAttribute("aria-current");
    }
  });
}

export function mostrarVista(nombreVista) {
  estado.vistaActual = nombreVista;

  document.querySelectorAll("[data-vista]").forEach((seccion) => {
    seccion.classList.toggle("hidden", seccion.dataset.vista !== nombreVista);
  });
  marcarPestanaActual(nombreVista);

  abridoresDeVista[nombreVista]();
}

async function navegarAVista(nombreVista) {
  const saleDeAsistencia = estado.vistaActual === "asistencia";
  if (saleDeAsistencia && !(await confirmarDescartarCambios(asistenciaTieneCambiosSinGuardar()))) {
    return;
  }
  mostrarVista(nombreVista);
}

export function conectarNavegacion() {
  document.querySelectorAll("[data-ir-a]").forEach((boton) => {
    boton.addEventListener("click", () => navegarAVista(boton.dataset.irA));
  });
}
