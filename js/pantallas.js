import { cerrarVistaDelAsistente } from "./asistente/vista.js";
import { leerSesionGuardada, salirDeSupabase } from "./auth/sesion.js";
import { elementos } from "./dom.js";
import { estado, reiniciarEstado } from "./estado.js";
import { limpiarVistaDelHistorial } from "./historial/vista.js";
import { mostrarVista } from "./navegacion.js";
import { mostrarAviso } from "./ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "./ui/cargando.js";
import { cerrarConfirmacionAbierta } from "./ui/confirmacion.js";
import { describirError } from "./utilidades/errores.js";
import { formatearFechaLarga } from "./utilidades/formato.js";
import { cerrarVistaAsistencia } from "./vistas/asistencia.js";
import { limpiarDashboard } from "./vistas/dashboard.js";
import { limpiarVistaDeDisciplinas } from "./vistas/disciplinas.js";
import { limpiarVistaDeEstudiantes } from "./vistas/estudiantes/vista.js";

function ocultarTodasLasPantallas() {
  elementos.pantallaLogin.classList.add("hidden");
  elementos.appPrincipal.classList.add("hidden");
}

function limpiarDatosDeLaSesion() {
  reiniciarEstado();
  cerrarConfirmacionAbierta();
  elementos.correoUsuario.textContent = "";
  limpiarDashboard();
  limpiarVistaDeDisciplinas();
  limpiarVistaDeEstudiantes();
  cerrarVistaAsistencia();
  limpiarVistaDelHistorial();
  cerrarVistaDelAsistente();
}

export function mostrarProblemaDeInicio(mensaje) {
  elementos.textoProblema.textContent = mensaje;
  elementos.pantallaProblema.classList.remove("hidden");
}

export function escribirFechaEnEncabezado() {
  elementos.fechaEncabezado.textContent = formatearFechaLarga(new Date());
}

export function mostrarLogin() {
  limpiarDatosDeLaSesion();
  ocultarTodasLasPantallas();
  elementos.pantallaLogin.classList.remove("hidden");
  elementos.campoContrasena.value = "";
}

export function mostrarAplicacion(usuario) {
  const yaEstaDentro = estado.usuario !== null && estado.usuario.id === usuario.id;
  if (yaEstaDentro) {
    return;
  }
  if (estado.usuario !== null) {
    limpiarDatosDeLaSesion();
  }

  estado.usuario = usuario;
  ocultarTodasLasPantallas();
  elementos.correoUsuario.textContent = usuario.email || "";
  elementos.appPrincipal.classList.remove("hidden");
  mostrarVista("dashboard");
}

export async function entrarSiHaySesion() {
  mostrarCargando("Revisando tu sesión...");
  try {
    const sesion = await leerSesionGuardada();
    if (sesion) {
      mostrarAplicacion(sesion.user);
    } else {
      mostrarLogin();
    }
  } catch (error) {
    mostrarLogin();
    mostrarAviso(describirError(error), "error");
  } finally {
    ocultarCargando();
  }
}

export async function cerrarSesion() {
  mostrarCargando("Cerrando sesión...");
  try {
    await salirDeSupabase();
  } catch {
    mostrarAviso("La sesión se cerró aquí, pero no se pudo avisar a Supabase.", "info");
  } finally {
    mostrarLogin();
    ocultarCargando();
  }
}
