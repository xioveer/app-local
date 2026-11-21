import { conectarEventosDelAsistente, abrirVistaAsistente } from "./asistente/vista.js";
import { sacarErrorDeLaDireccion } from "./auth/google.js";
import { conectarEventosDelLogin, mostrarAvisoDeGoogle } from "./auth/login.js";
import { vigilarCambiosDeSesion } from "./auth/sesion.js";
import { elementos } from "./dom.js";
import { abrirVistaHistorial, conectarEventosDelHistorial } from "./historial/vista.js";
import { conectarNavegacion, registrarVistas } from "./navegacion.js";
import {
  cerrarSesion,
  entrarSiHaySesion,
  escribirFechaEnEncabezado,
  mostrarAplicacion,
  mostrarLogin,
  mostrarProblemaDeInicio,
} from "./pantallas.js";
import { conectarConSupabase, conexionEstaEscrita, sdkDeSupabaseCargado } from "./servicios/supabase.js";
import { describirErrorDeGoogle } from "./utilidades/errores.js";
import { abrirVistaAsistencia } from "./vistas/asistencia.js";
import { cargarDashboard, conectarEventosDelDashboard } from "./vistas/dashboard.js";
import { cargarDisciplinas, conectarEventosDeDisciplinas } from "./vistas/disciplinas.js";
import { abrirVistaEstudiantes, conectarEventosDeEstudiantes } from "./vistas/estudiantes/vista.js";

function conectarEventos() {
  conectarNavegacion();
  conectarEventosDelLogin();
  conectarEventosDelDashboard();
  conectarEventosDeEstudiantes();
  conectarEventosDeDisciplinas();
  conectarEventosDelHistorial();
  conectarEventosDelAsistente();
  elementos.botonCerrarSesion.addEventListener("click", cerrarSesion);
}

async function iniciar() {
  if (!sdkDeSupabaseCargado()) {
    mostrarProblemaDeInicio("No se pudo cargar la librería de Supabase. Revisa tu conexión a Internet.");
    return;
  }
  if (!conexionEstaEscrita()) {
    mostrarProblemaDeInicio(
      "Faltan los datos de conexión con Supabase. Revisa que el archivo js/config/conexion.js " +
        "tenga escritos SUPABASE_URL y SUPABASE_ANON_KEY."
    );
    return;
  }

  const errorDeGoogle = sacarErrorDeLaDireccion();
  conectarConSupabase();
  registrarVistas({
    dashboard: cargarDashboard,
    estudiantes: abrirVistaEstudiantes,
    asistencia: abrirVistaAsistencia,
    historial: abrirVistaHistorial,
    disciplinas: cargarDisciplinas,
    asistente: abrirVistaAsistente,
  });
  conectarEventos();
  escribirFechaEnEncabezado();
  vigilarCambiosDeSesion({ alEntrar: mostrarAplicacion, alSalir: mostrarLogin });

  if (errorDeGoogle !== null) {
    mostrarAvisoDeGoogle(describirErrorDeGoogle(errorDeGoogle));
  }
  await entrarSiHaySesion();
}

document.addEventListener("DOMContentLoaded", iniciar);
