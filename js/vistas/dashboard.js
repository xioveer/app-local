import { leerAsistenciasDeUnaFecha } from "../datos/asistencias.js";
import { leerPagosDeLosActivos } from "../datos/estudiantes.js";
import { elementos } from "../dom.js";
import { estado } from "../estado.js";
import { mostrarAviso } from "../ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "../ui/cargando.js";
import { describirError } from "../utilidades/errores.js";
import { fechaDeHoy } from "../utilidades/fechas.js";
import { formatearFecha, formatearHora, formatearPorcentaje } from "../utilidades/formato.js";

function calcularPorcentaje(parte, total) {
  const porcentaje = Math.round((parte / total) * 1000) / 10;
  if (parte < total && porcentaje === 100) {
    return 99.9;
  }
  if (parte > 0 && porcentaje === 0) {
    return 0.1;
  }
  return porcentaje;
}

function contarPorEstadoDePago(estudiantes, estadoDePago) {
  return estudiantes.filter((estudiante) => estudiante.estado_pago === estadoDePago).length;
}

function calcularMetricas(estudiantesActivos, asistenciasDeHoy) {
  const idsActivos = new Set(estudiantesActivos.map((estudiante) => estudiante.id));
  const registros = asistenciasDeHoy.filter((registro) => idsActivos.has(registro.estudiante_id));
  const presentes = registros.filter((registro) => registro.asistio).length;

  return {
    activos: estudiantesActivos.length,
    alDia: contarPorEstadoDePago(estudiantesActivos, "al_dia"),
    pendientes: contarPorEstadoDePago(estudiantesActivos, "pendiente"),
    vencidos: contarPorEstadoDePago(estudiantesActivos, "vencido"),
    presentes,
    ausentes: registros.length - presentes,
    registrados: registros.length,
    sinRegistrar: estudiantesActivos.length - registros.length,
    porcentaje: registros.length > 0 ? calcularPorcentaje(presentes, registros.length) : null,
  };
}

function dibujarPagos(metricas) {
  const ancho = (cantidad) => (metricas.activos > 0 ? (cantidad / metricas.activos) * 100 : 0) + "%";

  elementos.dashActivos.textContent = metricas.activos;
  elementos.dashAlDia.textContent = metricas.alDia;
  elementos.dashPendientes.textContent = metricas.pendientes;
  elementos.dashVencidos.textContent = metricas.vencidos;
  elementos.dashTramoAlDia.style.width = ancho(metricas.alDia);
  elementos.dashTramoPendientes.style.width = ancho(metricas.pendientes);
  elementos.dashTramoVencidos.style.width = ancho(metricas.vencidos);
}

function dibujarAsistenciaDeHoy(metricas, fechaHoy) {
  const hayActivos = metricas.activos > 0;
  const hayRegistros = metricas.registrados > 0;

  elementos.dashFecha.textContent = formatearFecha(fechaHoy);
  elementos.dashAsistenciaConDatos.classList.toggle("hidden", !hayRegistros);
  elementos.dashAsistenciaSinDatos.classList.toggle("hidden", !(hayActivos && !hayRegistros));
  elementos.dashAsistenciaSinEstudiantes.classList.toggle("hidden", hayActivos);
  elementos.dashAsistenciaCifras.classList.toggle("hidden", !hayActivos);
  elementos.dashBloquePresentes.classList.toggle("hidden", !hayRegistros);
  elementos.dashBloqueAusentes.classList.toggle("hidden", !hayRegistros);

  if (hayRegistros) {
    elementos.dashPorcentaje.textContent = formatearPorcentaje(metricas.porcentaje);
    elementos.dashBarra.style.width = metricas.porcentaje + "%";
    elementos.dashPresentes.textContent = metricas.presentes;
    elementos.dashAusentes.textContent = metricas.ausentes;
  }
  elementos.dashSinRegistrar.textContent = metricas.sinRegistrar;
}

export async function cargarDashboard() {
  mostrarCargando("Actualizando métricas...");
  try {
    const hoy = fechaDeHoy();
    const estudiantesActivos = await leerPagosDeLosActivos();
    const asistenciasDeHoy = await leerAsistenciasDeUnaFecha(hoy);

    const metricas = calcularMetricas(estudiantesActivos, asistenciasDeHoy);
    dibujarPagos(metricas);
    dibujarAsistenciaDeHoy(metricas, hoy);

    estado.dashboardCargado = true;
    elementos.textoActualizacionDashboard.textContent = "Actualizado a las " + formatearHora(new Date());
    return true;
  } catch (error) {
    mostrarAviso("No se pudieron cargar las métricas. " + describirError(error), "error");
    elementos.textoActualizacionDashboard.textContent = estado.dashboardCargado
      ? "No se pudieron actualizar las métricas. Las cifras que ves pueden estar desactualizadas."
      : "No se pudieron cargar las métricas.";
    return false;
  } finally {
    ocultarCargando();
  }
}

async function actualizarDashboard() {
  if (await cargarDashboard()) {
    mostrarAviso("Métricas actualizadas.", "exito");
  }
}

export function conectarEventosDelDashboard() {
  elementos.botonActualizarDashboard.addEventListener("click", actualizarDashboard);
}

export function limpiarDashboard() {
  [elementos.dashActivos, elementos.dashAlDia, elementos.dashPendientes, elementos.dashVencidos].forEach(
    (cifra) => {
      cifra.textContent = "—";
    }
  );
  [
    elementos.dashTramoAlDia,
    elementos.dashTramoPendientes,
    elementos.dashTramoVencidos,
    elementos.dashBarra,
  ].forEach((barra) => {
    barra.style.width = "0%";
  });
  [
    elementos.dashAsistenciaConDatos,
    elementos.dashAsistenciaSinDatos,
    elementos.dashAsistenciaSinEstudiantes,
    elementos.dashAsistenciaCifras,
  ].forEach((bloque) => bloque.classList.add("hidden"));
  elementos.textoActualizacionDashboard.textContent = "";
  elementos.dashFecha.textContent = "";
}
