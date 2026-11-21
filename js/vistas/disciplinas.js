import { crearDisciplina, leerDisciplinas } from "../datos/disciplinas.js";
import { elementos } from "../dom.js";
import { estado } from "../estado.js";
import { mostrarAviso } from "../ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "../ui/cargando.js";
import { llenarSelectDeDisciplinas } from "../ui/selects.js";
import { describirError } from "../utilidades/errores.js";
import { limpiarEspacios } from "../utilidades/texto.js";
import { validarNombreDeDisciplina } from "../validaciones.js";

let guardandoDisciplina = false;

function llenarSelectsDeDisciplinas() {
  llenarSelectDeDisciplinas(elementos.filtroDisciplina, estado.disciplinas, "Todas las disciplinas");
  llenarSelectDeDisciplinas(
    elementos.campoDisciplinaEstudiante,
    estado.disciplinas,
    "Selecciona una disciplina"
  );
}

function crearElementoDeDisciplina(disciplina) {
  const elemento = document.createElement("li");
  elemento.className =
    "tarjeta flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-slate-900 " +
    "before:h-2.5 before:w-2.5 before:shrink-0 before:rounded-full before:bg-marca-500 " +
    "before:ring-4 before:ring-marca-500/15 before:content-['']";
  elemento.textContent = disciplina.nombre;
  return elemento;
}

function dibujarListaDeDisciplinas() {
  const mostrarAvisoDeVacio = estado.disciplinasCargadas && estado.disciplinas.length === 0;
  elementos.mensajeSinDisciplinas.classList.toggle("hidden", !mostrarAvisoDeVacio);
  elementos.listaDisciplinas.replaceChildren(...estado.disciplinas.map(crearElementoDeDisciplina));
}

export async function cargarDisciplinas() {
  mostrarCargando("Cargando disciplinas...");
  try {
    estado.disciplinas = await leerDisciplinas();
    estado.disciplinasCargadas = true;
    llenarSelectsDeDisciplinas();
    dibujarListaDeDisciplinas();
    return true;
  } catch (error) {
    mostrarAviso("No se pudieron cargar las disciplinas. " + describirError(error), "error");
    return false;
  } finally {
    ocultarCargando();
  }
}

async function agregarDisciplina(evento) {
  evento.preventDefault();
  if (guardandoDisciplina) {
    return;
  }

  const nombre = limpiarEspacios(elementos.campoNombreDisciplina.value);
  const problema = validarNombreDeDisciplina(nombre, estado.disciplinas);
  if (problema !== "") {
    mostrarAviso(problema, "error");
    elementos.campoNombreDisciplina.focus();
    return;
  }

  guardandoDisciplina = true;
  mostrarCargando("Guardando disciplina...");
  try {
    await crearDisciplina(nombre);
    elementos.formularioDisciplina.reset();
    mostrarAviso("Disciplina «" + nombre + "» agregada.", "exito");
    await cargarDisciplinas();
  } catch (error) {
    const mensaje =
      error.code === "23505" ? "Ya existe una disciplina con ese nombre." : describirError(error);
    mostrarAviso(mensaje, "error");
  } finally {
    guardandoDisciplina = false;
    ocultarCargando();
  }
}

export function conectarEventosDeDisciplinas() {
  elementos.formularioDisciplina.addEventListener("submit", agregarDisciplina);
}

export function limpiarVistaDeDisciplinas() {
  elementos.formularioDisciplina.reset();
  dibujarListaDeDisciplinas();
  llenarSelectsDeDisciplinas();
}
