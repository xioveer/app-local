import { obtenerCliente, datosDeLaRespuesta } from "../servicios/supabase.js";

export async function leerDisciplinas() {
  return datosDeLaRespuesta(
    await obtenerCliente().from("disciplinas").select("*").order("nombre", { ascending: true })
  );
}

export async function crearDisciplina(nombre) {
  datosDeLaRespuesta(await obtenerCliente().from("disciplinas").insert({ nombre }));
}
