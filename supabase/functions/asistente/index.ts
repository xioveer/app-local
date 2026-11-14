// =====================================================================
// Edge Function "asistente"
// =====================================================================
// Es el puente entre el panel y un modelo de lenguaje.
//
// ¿Por qué existe? Porque la clave de la API no puede estar en el
// navegador: cualquiera que abra la página podría verla y gastarla.
// Aquí vive en el servidor, dentro de un secreto de Supabase.
//
// Qué hace, en orden:
//   1. Si no hay clave configurada, responde "disponible: false" y el
//      panel contesta con su análisis local. No es un error.
//   2. Comprueba que quien pregunta tiene sesión Y es administrador.
//   3. Le pasa al modelo la pregunta y unas CIFRAS AGRUPADAS. Nunca
//      nombres, teléfonos ni datos de los acudientes.
//
// CÓMO ACTIVARLO:
//   Supabase → Edge Functions → Secrets → añadir ANTHROPIC_API_KEY
//   con una clave de console.anthropic.com. Sin ese paso todo sigue
//   funcionando con el análisis local.
// =====================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const MODELO = "claude-haiku-5-5";

const CABECERAS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CABECERAS_CORS, "Content-Type": "application/json" },
  });
}

const INSTRUCCIONES = `Eres el asistente de un profesor de una academia formativa
pequeña en Colombia (fútbol, guitarra y danza). Él lleva el control de sus
estudiantes: quién asiste, quién está al día con la mensualidad y quién se
está desenganchando.

Reglas:
- Responde en español, en menos de 120 palabras, directo y sin saludos largos.
- Usa SOLO las cifras del resumen que te entregan. Si algo no está ahí, di
  que no tienes ese dato; nunca lo inventes ni lo estimes.
- No tienes nombres de estudiantes ni datos de contacto, y no debes pedirlos.
  Si te piden nombres, di que esos están en las vistas Estudiantes y Asistencia.
- Termina con una sola acción concreta que el profesor pueda hacer hoy.`;

Deno.serve(async (peticion) => {
  if (peticion.method === "OPTIONS") {
    return new Response("ok", { headers: CABECERAS_CORS });
  }

  if (peticion.method !== "POST") {
    return responder({ error: "Usa POST." }, 405);
  }

  // 1. ¿Hay clave? Sin ella el panel usa su análisis local.
  const clave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!clave) {
    return responder({ disponible: false, motivo: "falta la clave ANTHROPIC_API_KEY" });
  }

  // 2. ¿Quién pregunta? Debe tener sesión y estar en administradores.
  const autorizacion = peticion.headers.get("Authorization");
  if (!autorizacion) {
    return responder({ error: "Necesitas iniciar sesión." }, 401);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: autorizacion } },
  });

  const { data: esAdministrador, error: errorDePermiso } = await supabase.rpc("es_administrador");
  if (errorDePermiso || esAdministrador !== true) {
    return responder({ error: "Esta cuenta no tiene permiso." }, 403);
  }

  // 3. Revisar lo que llega antes de gastar una llamada al modelo.
  let pregunta = "";
  let resumen: unknown = {};
  try {
    const cuerpo = await peticion.json();
    pregunta = typeof cuerpo.pregunta === "string" ? cuerpo.pregunta.trim() : "";
    resumen = cuerpo.resumen ?? {};
  } catch {
    return responder({ error: "No se entendió la pregunta." }, 400);
  }

  if (pregunta.length < 4 || pregunta.length > 300) {
    return responder({ error: "La pregunta debe tener entre 4 y 300 letras." }, 400);
  }

  try {
    const respuestaDelModelo = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": clave,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 400,
        system: INSTRUCCIONES,
        messages: [
          {
            role: "user",
            content:
              "Cifras de la academia hoy:\n" + JSON.stringify(resumen, null, 2) + "\n\nPregunta: " + pregunta,
          },
        ],
      }),
    });

    if (!respuestaDelModelo.ok) {
      const detalle = await respuestaDelModelo.text();
      console.error("La API respondió", respuestaDelModelo.status, detalle);
      return responder({ disponible: false, motivo: "la API respondió " + respuestaDelModelo.status });
    }

    const cuerpo = await respuestaDelModelo.json();
    const texto = (cuerpo.content ?? [])
      .filter((parte: { type: string }) => parte.type === "text")
      .map((parte: { text: string }) => parte.text)
      .join("\n")
      .trim();

    if (!texto) {
      return responder({ disponible: false, motivo: "el modelo no devolvió texto" });
    }

    return responder({ disponible: true, respuesta: texto });
  } catch (error) {
    console.error("No se pudo llamar al modelo", error);
    return responder({ disponible: false, motivo: "no se pudo llamar al modelo" });
  }
});
