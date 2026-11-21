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
    "tarjeta flex items-center gap-3 px-4 py-3 font-semibold text-tinta " +
    "before:h-6 before:w-1.5 before:rounded-full before:bg-sol";
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
