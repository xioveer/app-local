import { googleEstaActivado } from "./google.js";
import { entrarConCorreo, irAGoogle } from "./sesion.js";
import { elementos } from "../dom.js";
import { mostrarAplicacion } from "../pantallas.js";
import { mostrarAviso } from "../ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "../ui/cargando.js";
import { describirError, MENSAJE_GOOGLE_NO_ACTIVADO } from "../utilidades/errores.js";
import { validarCredenciales } from "../validaciones.js";

export function mostrarAvisoDeGoogle(mensaje) {
  elementos.avisoGoogle.textContent = mensaje;
  elementos.avisoGoogle.classList.remove("hidden");
}

function ocultarAvisoDeGoogle() {
  elementos.avisoGoogle.textContent = "";
  elementos.avisoGoogle.classList.add("hidden");
}

async function iniciarSesionConGoogle() {
  ocultarAvisoDeGoogle();
  mostrarCargando("Abriendo Google...");
  try {
    if (!(await googleEstaActivado())) {
      mostrarAvisoDeGoogle(MENSAJE_GOOGLE_NO_ACTIVADO);
      ocultarCargando();
      return;
    }
    await irAGoogle();
  } catch (error) {
    mostrarAvisoDeGoogle(describirError(error));
    ocultarCargando();
  }
}

async function iniciarSesionConCorreo(evento) {
  evento.preventDefault();

  const correo = elementos.campoCorreo.value.trim();
  const contrasena = elementos.campoContrasena.value;
  const problema = validarCredenciales(correo, contrasena);
  if (problema !== "") {
    mostrarAviso(problema, "error");
    return;
  }

  mostrarCargando("Entrando...");
  elementos.botonLogin.disabled = true;
  try {
    const usuario = await entrarConCorreo(correo, contrasena);
    ocultarAvisoDeGoogle();
    mostrarAplicacion(usuario);
  } catch (error) {
    mostrarAviso(describirError(error), "error");
  } finally {
    elementos.botonLogin.disabled = false;
    ocultarCargando();
  }
}

export function conectarEventosDelLogin() {
  elementos.botonGoogle.addEventListener("click", iniciarSesionConGoogle);
  elementos.formularioLogin.addEventListener("submit", iniciarSesionConCorreo);
}
