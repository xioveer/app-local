import { obtenerCliente, datosDeLaRespuesta } from "../servicios/supabase.js";
import { leerActivosParaLaAsistencia } from "./estudiantes.js";

const tablaAsistencias = () => obtenerCliente().from("asistencias");

export async function leerAsistenciasDeUnaFecha(fecha) {
  return datosDeLaRespuesta(await tablaAsistencias().select("estudiante_id, asistio").eq("fecha", fecha));
}

export async function leerAsistenciasDesde(fecha) {
  return datosDeLaRespuesta(
    await tablaAsistencias()
      .select("estudiante_id, fecha, asistio")
      .gte("fecha", fecha)
      .order("fecha", { ascending: false })
  );
}

const FILAS_POR_PAGINA = 1000;

export async function leerAsistenciasEntre(desde, hasta) {
  const todas = [];
  for (let inicio = 0; ; inicio += FILAS_POR_PAGINA) {
    const pagina = datosDeLaRespuesta(
      await tablaAsistencias()
        .select("id, estudiante_id, fecha, asistio")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: false })
        .order("id", { ascending: true })
        .range(inicio, inicio + FILAS_POR_PAGINA - 1)
    );
    todas.push(...pagina);
    if (pagina.length < FILAS_POR_PAGINA) {
      return todas;
    }
  }
}

export async function guardarAsistencias(registros) {
  datosDeLaRespuesta(await tablaAsistencias().upsert(registros, { onConflict: "estudiante_id,fecha" }));
}

export async function leerAsistenciaDeUnaFecha(fecha) {
  const estudiantes = await leerActivosParaLaAsistencia();
  const registros = await leerAsistenciasDeUnaFecha(fecha);

  const guardada = {};
  registros.forEach((registro) => {
    guardada[registro.estudiante_id] = registro.asistio;
  });

  return { estudiantes, guardada };
}
