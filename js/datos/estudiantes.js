import { obtenerCliente, datosDeLaRespuesta } from "../servicios/supabase.js";

const tablaEstudiantes = () => obtenerCliente().from("estudiantes");

export async function leerEstudiantes() {
  return datosDeLaRespuesta(
    await tablaEstudiantes().select("*, disciplinas(nombre)").order("nombre_completo", { ascending: true })
  );
}

export async function leerPagosDeLosActivos() {
  return datosDeLaRespuesta(await tablaEstudiantes().select("id, estado_pago").eq("activo", true));
}

export async function leerActivosParaElAsistente() {
  return datosDeLaRespuesta(
    await tablaEstudiantes()
      .select("id, nombre_completo, edad, estado_pago, activo, disciplina_id, disciplinas(nombre)")
      .eq("activo", true)
  );
}

export async function leerActivosParaLaAsistencia() {
  return datosDeLaRespuesta(
    await tablaEstudiantes()
      .select("id, nombre_completo, categoria, disciplina_id, disciplinas(nombre)")
      .eq("activo", true)
      .order("nombre_completo", { ascending: true })
  );
}

export async function crearEstudiante(registro) {
  datosDeLaRespuesta(await tablaEstudiantes().insert(registro));
}

export async function actualizarEstudiante(id, cambios) {
  const filasCambiadas = datosDeLaRespuesta(await tablaEstudiantes().update(cambios).eq("id", id).select());
  if (filasCambiadas.length === 0) {
    throw new Error("No se encontró el estudiante. Puede que ya no exista; recarga la página.");
  }
}
