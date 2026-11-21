import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config/conexion.js";

const PARAMETROS_DE_ERROR = ["error", "error_code", "error_description"];

export async function googleEstaActivado() {
  try {
    const respuesta = await fetch(SUPABASE_URL.trim() + "/auth/v1/settings", {
      headers: { apikey: SUPABASE_ANON_KEY.trim() },
    });
    if (!respuesta.ok) {
      return false;
    }
    const ajustes = await respuesta.json();
    return Boolean(ajustes.external && ajustes.external.google);
  } catch {
    return false;
  }
}

function buscarError(parametros) {
  if (!PARAMETROS_DE_ERROR.some((nombre) => parametros.has(nombre))) {
    return null;
  }
  return {
    codigo: parametros.get("error") || parametros.get("error_code") || "",
    descripcion: parametros.get("error_description") || "",
  };
}

function quitarParametrosDeError(parametros) {
  PARAMETROS_DE_ERROR.forEach((nombre) => parametros.delete(nombre));
  return parametros.toString();
}

export function sacarErrorDeLaDireccion() {
  const direccion = new URL(window.location.href);
  const consulta = new URLSearchParams(direccion.search);
  const ancla = new URLSearchParams(direccion.hash.replace(/^#/, ""));
  const error = buscarError(consulta) || buscarError(ancla);
  if (error === null) {
    return null;
  }

  const consultaLimpia = quitarParametrosDeError(consulta);
  const anclaLimpia = quitarParametrosDeError(ancla);
  const nuevaDireccion =
    direccion.pathname +
    (consultaLimpia ? "?" + consultaLimpia : "") +
    (anclaLimpia ? "#" + anclaLimpia : "");
  window.history.replaceState(null, "", nuevaDireccion);
  return error;
}
