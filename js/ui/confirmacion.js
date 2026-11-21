import { elementos } from "../dom.js";

export function pedirConfirmacion({ titulo, mensaje, textoConfirmar }) {
  const dialogo = elementos.dialogoConfirmacion;

  return new Promise((resolver) => {
    elementos.tituloConfirmacion.textContent = titulo;
    elementos.mensajeConfirmacion.textContent = mensaje;
    elementos.botonConfirmar.textContent = textoConfirmar;

    dialogo.returnValue = "";
    dialogo.addEventListener("close", () => resolver(dialogo.returnValue === "confirmar"), { once: true });
    dialogo.showModal();
  });
}

export async function confirmarDescartarCambios(hayCambios) {
  if (!hayCambios) {
    return true;
  }
  return pedirConfirmacion({
    titulo: "¿Descartar cambios?",
    mensaje: "Marcaste asistencia que todavía no guardaste. Si continúas, esos cambios se perderán.",
    textoConfirmar: "Descartar",
  });
}

export function cerrarConfirmacionAbierta() {
  if (elementos.dialogoConfirmacion.open) {
    elementos.dialogoConfirmacion.close("cancelar");
  }
}
