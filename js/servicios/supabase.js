import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config/conexion.js";

let cliente = null;

export function sdkDeSupabaseCargado() {
  return typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function";
}

export function conexionEstaEscrita() {
  return SUPABASE_URL.trim() !== "" && SUPABASE_ANON_KEY.trim() !== "";
}

export function conectarConSupabase() {
  cliente = window.supabase.createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "academia-sesion",
    },
  });
}

export function obtenerCliente() {
  return cliente;
}

export function datosDeLaRespuesta({ data, error }) {
  if (error) {
    throw error;
  }
  return data;
}
