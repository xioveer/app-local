import { obtenerCliente } from "../servicios/supabase.js";

const auth = () => obtenerCliente().auth;

export async function leerSesionGuardada() {
  const { data, error } = await auth().getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function entrarConCorreo(correo, contrasena) {
  const { data, error } = await auth().signInWithPassword({ email: correo, password: contrasena });
  if (error) {
    throw error;
  }
  return data.user;
}

export async function irAGoogle() {
  const { error } = await auth().signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) {
    throw error;
  }
}

export async function salirDeSupabase() {
  await auth().signOut({ scope: "local" });
}

export function vigilarCambiosDeSesion({ alEntrar, alSalir }) {
  auth().onAuthStateChange((evento, sesion) => {
    setTimeout(() => {
      if (evento === "SIGNED_OUT") {
        alSalir();
      } else if (evento === "SIGNED_IN" && sesion) {
        alEntrar(sesion.user);
      }
    }, 0);
  });
}
