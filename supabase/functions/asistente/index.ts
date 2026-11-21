import Anthropic from "npm:@anthropic-ai/sdk@1.4.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODELO = "claude-haiku-5-5";
const LARGO_MINIMO_DE_PREGUNTA = 4;
const LARGO_MAXIMO_DE_PREGUNTA = 300;
const BYTES_MAXIMOS_DEL_RESUMEN = 8 * 1024;
const BYTES_MAXIMOS_DEL_CUERPO = 10 * 1024;

const CABECERAS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INSTRUCCIONES = `Eres el asistente de un profesor de una academia formativa pequeña en Colombia (deportes, música, danza). El profesor lleva el control de sus propios estudiantes: quién asiste, el estado de pago de la mensualidad y quién se está desenganchando.

Recibes un resumen con CIFRAS AGRUPADAS de su academia y una pregunta. El resumen tiene:
- Totales: estudiantes activos, al día, con pago pendiente, con pago vencido, en riesgo de retirarse, con 2 o más faltas seguidas, sin asistencia registrada, asistencia promedio y número de registros de los últimos dias_analizados días.
- tendencia_semanal: asistencia de los últimos 7 días frente a los 7 anteriores y la diferencia en puntos.
- disciplinas: las mismas cifras para cada disciplina.
Un valor null significa que no hay datos suficientes.

Reglas:
- Responde en español de Colombia, con palabras sencillas, en menos de 120 palabras y sin saludos.
- Usa SOLO las cifras del resumen. Si la respuesta necesita un dato que no está, dilo con claridad; nunca inventes, estimes ni calcules cifras nuevas que no se deduzcan directamente.
- Los estados de pago son solo al día, pendiente o vencido. No hay precios ni montos: nunca hables de dinero, valores ni pesos.
- No tienes nombres de estudiantes, teléfonos ni datos de acudientes, y no debes pedirlos. Si preguntan quiénes son, explica que los nombres están en las vistas Estudiantes y Asistencia de la aplicación.
- Si la pregunta no tiene que ver con los estudiantes, la asistencia o los pagos de la academia, dilo en una frase y sugiere qué sí puede preguntar.
- Termina siempre con una sola acción concreta que el profesor pueda hacer hoy, en una línea que empiece por «Acción:».`;

function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CABECERAS_CORS, "Content-Type": "application/json" },
  });
}

const medirBytes = (texto: string) => new TextEncoder().encode(texto).length;

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

async function hayUsuario(autorizacion: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = autorizacion.replace(/^Bearer\s+/i, "");
  const { data, error } = await supabase.auth.getUser(token);
  return !error && data.user !== null;
}

type Entrada = { pregunta: string; resumen: Record<string, unknown> } | { error: string; estado: number };

async function leerEntrada(peticion: Request): Promise<Entrada> {
  const texto = await peticion.text();
  if (medirBytes(texto) > BYTES_MAXIMOS_DEL_CUERPO) {
    return { error: "La petición es demasiado grande.", estado: 413 };
  }

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return { error: "No se entendió la pregunta.", estado: 400 };
  }
  if (!esObjeto(cuerpo)) {
    return { error: "No se entendió la pregunta.", estado: 400 };
  }

  const pregunta = typeof cuerpo.pregunta === "string" ? cuerpo.pregunta.trim() : "";
  if (pregunta.length < LARGO_MINIMO_DE_PREGUNTA || pregunta.length > LARGO_MAXIMO_DE_PREGUNTA) {
    return { error: "La pregunta debe tener entre 4 y 300 letras.", estado: 400 };
  }

  const resumen = cuerpo.resumen ?? {};
  if (!esObjeto(resumen)) {
    return { error: "El resumen debe ser un objeto con cifras.", estado: 400 };
  }
  if (medirBytes(JSON.stringify(resumen)) > BYTES_MAXIMOS_DEL_RESUMEN) {
    return { error: "El resumen es demasiado grande.", estado: 413 };
  }
  return { pregunta, resumen };
}

function textoDeLaRespuesta(mensaje: Anthropic.Message) {
  return mensaje.content
    .filter((parte): parte is Anthropic.TextBlock => parte.type === "text")
    .map((parte) => parte.text)
    .join("\n")
    .trim();
}

async function preguntarAlModelo(clave: string, pregunta: string, resumen: Record<string, unknown>) {
  const cliente = new Anthropic({ apiKey: clave, maxRetries: 1, timeout: 25_000 });
  const mensaje = await cliente.messages.create({
    model: MODELO,
    max_tokens: 1024,
    output_config: { effort: "low" },
    system: INSTRUCCIONES,
    messages: [
      {
        role: "user",
        content:
          "Cifras de la academia hoy:\n" + JSON.stringify(resumen, null, 2) + "\n\nPregunta: " + pregunta,
      },
    ],
  });

  if (mensaje.stop_reason === "refusal") {
    return null;
  }
  return textoDeLaRespuesta(mensaje) || null;
}

Deno.serve(async (peticion) => {
  if (peticion.method === "OPTIONS") {
    return new Response("ok", { headers: CABECERAS_CORS });
  }
  if (peticion.method !== "POST") {
    return responder({ error: "Usa POST." }, 405);
  }

  const autorizacion = peticion.headers.get("Authorization");
  if (!autorizacion || !(await hayUsuario(autorizacion))) {
    return responder({ error: "Necesitas iniciar sesión." }, 401);
  }

  const entrada = await leerEntrada(peticion);
  if ("error" in entrada) {
    return responder({ error: entrada.error }, entrada.estado);
  }

  const clave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!clave) {
    return responder({ disponible: false, motivo: "falta la clave ANTHROPIC_API_KEY" });
  }

  try {
    const texto = await preguntarAlModelo(clave, entrada.pregunta, entrada.resumen);
    if (!texto) {
      return responder({ disponible: false, motivo: "el modelo no devolvió texto" });
    }
    return responder({ disponible: true, respuesta: texto });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("La API respondió", error.status, error.message);
      return responder({ disponible: false, motivo: "la API respondió " + error.status });
    }
    console.error("No se pudo llamar al modelo", error);
    return responder({ disponible: false, motivo: "no se pudo llamar al modelo" });
  }
});
