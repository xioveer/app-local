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
