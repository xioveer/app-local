import { EDAD_DE_MAYORIA } from "../config/reglas.js";

export const MENSAJE_GOOGLE_NO_ACTIVADO =
  "El inicio con Google todavía no está activado en Supabase. Entra con tu correo y contraseña mientras tanto.";

const MENSAJES_POR_TEXTO = [
  {
    patron: /failed to fetch|networkerror|network request failed|fetch failed/i,
    mensaje:
      "No se pudo conectar con Supabase. Revisa tu conexión a Internet. " +
      "Si sigue fallando, puede que el proyecto esté en pausa: entra a supabase.com y reactívalo.",
  },
  {
    patron: /estudiantes_acudiente_menores/,
    mensaje:
      "Los estudiantes menores de " + EDAD_DE_MAYORIA + " años necesitan nombre y teléfono del acudiente.",
  },
  { patron: /invalid login credentials/i, mensaje: "Correo o contraseña incorrectos." },
  {
    patron: /email not confirmed/i,
    mensaje: "Ese usuario todavía no tiene el correo confirmado en Supabase.",
  },
  {
    patron: /provider is not enabled|unsupported provider/i,
    mensaje: MENSAJE_GOOGLE_NO_ACTIVADO,
  },
  { patron: /jwt expired/i, mensaje: "Tu sesión expiró. Vuelve a entrar." },
];

const MENSAJES_POR_CODIGO = {
  PGRST301: "Tu sesión expiró. Vuelve a entrar.",
  42501: "No tienes permiso para ver o cambiar estos datos. Cierra sesión y vuelve a entrar.",
  23505: "Ya existe un registro con ese valor.",
  23503:
    "Un dato relacionado ya no existe (por ejemplo, la disciplina o el estudiante). Recarga la página e inténtalo de nuevo.",
  23514: "Algún dato no cumple las reglas de la base de datos (revisa la edad y el estado de pago).",
};

export function describirError(error) {
  const mensaje = error && error.message ? error.message : "";
  const codigo = error && error.code ? error.code : "";

  const porTexto = MENSAJES_POR_TEXTO.find((regla) => regla.patron.test(mensaje));
  if (porTexto) {
    return porTexto.mensaje;
  }
  return MENSAJES_POR_CODIGO[codigo] || mensaje || "Ocurrió un error inesperado.";
}

export function describirErrorDeGoogle({ codigo, descripcion }) {
  if (codigo === "access_denied") {
    return "No se completó el inicio con Google (se canceló o no se dio permiso). Inténtalo de nuevo.";
  }
  const porTexto = MENSAJES_POR_TEXTO.find((regla) => regla.patron.test(descripcion));
  if (porTexto) {
    return porTexto.mensaje;
  }
  return (
    "No se pudo entrar con Google: " + (descripcion || codigo) + ". Inténtalo de nuevo o entra con tu correo."
  );
}
