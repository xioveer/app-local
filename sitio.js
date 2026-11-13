"use strict";

/* =====================================================================
   sitio.js · Lógica de la página pública (index.html)

   Secciones:
     1. CONFIGURACIÓN → cliente de Supabase y referencias al HTML
     2. UTILIDADES    → avisos, errores y formato de precios
     3. CATÁLOGO      → disciplinas de la portada y servicios con tarifas
     4. CONTACTO      → validación y envío del formulario
     5. INICIO        → arranque de la página

   Esta página entra sin iniciar sesión, así que la base de datos solo le
   permite leer el catálogo y crear un mensaje. Los datos de los
   estudiantes no son visibles desde aquí (ver supabase/schema.sql).
   ===================================================================== */

/* =====================================================================
   1. CONFIGURACIÓN
   ===================================================================== */

let clienteSupabase = null;

const estado = {
  servicios: [],
  enviandoMensaje: false,
};

const elementos = {};

function guardarReferenciasDelDOM() {
  elementos.contenedorAvisos = document.getElementById("contenedor-avisos");
  elementos.listaDisciplinas = document.getElementById("lista-disciplinas-portada");
  elementos.listaServicios = document.getElementById("lista-servicios");
  elementos.mensajeSinServicios = document.getElementById("mensaje-sin-servicios");
  elementos.formularioContacto = document.getElementById("formulario-contacto");
  elementos.campoServicio = document.getElementById("campo-servicio");
  elementos.botonEnviar = document.getElementById("boton-enviar");
  elementos.mensajeEnviado = document.getElementById("mensaje-enviado");
  elementos.botonOtroMensaje = document.getElementById("boton-otro-mensaje");
}

function sdkDeSupabaseCargado() {
  return typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function";
}

function configuracionEsValida() {
  return (
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL.trim() !== "" &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_ANON_KEY.trim() !== ""
  );
}

// La página pública nunca inicia sesión: le pedimos al SDK que no guarde
// ninguna sesión, para no tocar la que use el panel en la misma máquina.
function crearClienteSupabase() {
  const opciones = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  clienteSupabase = window.supabase.createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), opciones);
}

/* =====================================================================
   2. UTILIDADES
   ===================================================================== */

function mostrarAviso(mensaje, tipo = "info") {
  const yaEstaEnPantalla = Array.from(elementos.contenedorAvisos.children).some(
    (aviso) => aviso.textContent === mensaje
  );
  if (yaEstaEnPantalla) {
    return;
  }

  const colores = {
    exito: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
    info: "bg-tinta text-white",
  };

  const aviso = document.createElement("div");
  aviso.className =
    "pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg " +
    (colores[tipo] || colores.info);
  aviso.setAttribute("role", tipo === "error" ? "alert" : "status");
  aviso.textContent = mensaje;
  elementos.contenedorAvisos.appendChild(aviso);

  setTimeout(() => aviso.remove(), tipo === "error" ? 7000 : 4000);
}

function describirError(error) {
  const mensaje = error && error.message ? error.message : "";

  if (/failed to fetch|networkerror|network request failed|fetch failed/i.test(mensaje)) {
    return "No se pudo conectar con el servidor. Revisa tu conexión a Internet e inténtalo de nuevo.";
  }
  if (/mensajes_mensaje_valido/.test(mensaje)) {
    return "El mensaje debe tener entre 10 y 1000 letras.";
  }
  if (/mensajes_contacto_minimo/.test(mensaje)) {
    return "Escribe al menos un teléfono o un correo.";
  }
  return mensaje || "Ocurrió un error inesperado.";
}

// 70000 → "$70.000". Intl pone los puntos de miles que se usan en Colombia.
function formatearPrecio(pesos) {
  return "$" + Number(pesos).toLocaleString("es-CO");
}

/* =====================================================================
   3. CATÁLOGO
   ===================================================================== */

function dibujarDisciplinasDePortada(disciplinas) {
  elementos.listaDisciplinas.replaceChildren();

  disciplinas.forEach((disciplina) => {
    const elemento = document.createElement("li");
    elemento.className =
      "rounded-full border border-white/25 px-4 py-2 font-titulo text-lg font-semibold text-white";
    elemento.textContent = disciplina.nombre;
    elementos.listaDisciplinas.appendChild(elemento);
  });
}

// Una tarjeta del catálogo. El botón conecta con el formulario de abajo:
// al pulsarlo deja ese servicio ya elegido.
function crearTarjetaDeServicio(servicio) {
  const tarjeta = document.createElement("article");
  tarjeta.className = servicio.destacado
    ? "tarjeta flex flex-col border-2 border-sol p-6"
    : "tarjeta flex flex-col p-6";

  if (servicio.destacado) {
    const etiqueta = document.createElement("p");
    etiqueta.className = "chip mb-3 self-start bg-sol text-tinta";
    etiqueta.textContent = "El más pedido";
    tarjeta.appendChild(etiqueta);
  }

  const nombre = document.createElement("h3");
  nombre.className = "titulo-tarjeta";
  nombre.textContent = servicio.nombre;
  tarjeta.appendChild(nombre);

  if (servicio.disciplinas) {
    const disciplina = document.createElement("p");
    disciplina.className = "mt-1 text-sm text-slate-500";
    disciplina.textContent = servicio.disciplinas.nombre;
    tarjeta.appendChild(disciplina);
  }

  const descripcion = document.createElement("p");
  descripcion.className = "mt-3 grow text-sm leading-relaxed text-slate-600";
  descripcion.textContent = servicio.descripcion || "";
  tarjeta.appendChild(descripcion);

  const precio = document.createElement("p");
  precio.className = "precio mt-5";
  precio.textContent = formatearPrecio(servicio.precio_mensual);
  tarjeta.appendChild(precio);

  const periodo = document.createElement("p");
  periodo.className = "text-sm text-slate-500";
  periodo.textContent = "al mes";
  tarjeta.appendChild(periodo);

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton boton-principal mt-5";
  boton.textContent = "Me interesa";
  boton.addEventListener("click", () => elegirServicioYBajarAlFormulario(servicio.id));
  tarjeta.appendChild(boton);

  return tarjeta;
}

function dibujarServicios() {
  elementos.listaServicios.replaceChildren();
  estado.servicios.forEach((servicio) => {
    elementos.listaServicios.appendChild(crearTarjetaDeServicio(servicio));
  });
}

function llenarSelectDeServicios() {
  const primera = document.createElement("option");
  primera.value = "";
  primera.textContent = "Todavía no lo sé";
  elementos.campoServicio.replaceChildren(primera);

  estado.servicios.forEach((servicio) => {
    const opcion = document.createElement("option");
    opcion.value = String(servicio.id);
    opcion.textContent = servicio.nombre + " · " + formatearPrecio(servicio.precio_mensual);
    elementos.campoServicio.appendChild(opcion);
  });
}

function elegirServicioYBajarAlFormulario(idServicio) {
  elementos.campoServicio.value = String(idServicio);
  document.getElementById("contacto").scrollIntoView({ behavior: "smooth", block: "start" });
  elementos.formularioContacto.elements.nombre.focus({ preventScroll: true });
}

function mostrarCatalogoVacio(texto) {
  elementos.mensajeSinServicios.textContent = texto;
  elementos.mensajeSinServicios.classList.remove("hidden");
}

// Pide disciplinas y servicios. Si falla, la página sigue sirviendo para
// escribir un mensaje: solo se avisa que el catálogo no cargó.
async function cargarCatalogo() {
  try {
    const respuestaDisciplinas = await clienteSupabase
      .from("disciplinas")
      .select("id, nombre")
      .order("nombre", { ascending: true });
    if (respuestaDisciplinas.error) throw respuestaDisciplinas.error;

    const respuestaServicios = await clienteSupabase
      .from("servicios")
      .select("id, nombre, descripcion, precio_mensual, destacado, disciplinas(nombre)")
      .eq("activo", true)
      .order("orden", { ascending: true });
    if (respuestaServicios.error) throw respuestaServicios.error;

    dibujarDisciplinasDePortada(respuestaDisciplinas.data);

    estado.servicios = respuestaServicios.data;
    dibujarServicios();
    llenarSelectDeServicios();

    if (estado.servicios.length === 0) {
      mostrarCatalogoVacio("Estamos actualizando las tarifas. Escríbenos y te las contamos.");
    }
  } catch (error) {
    mostrarCatalogoVacio("No pudimos cargar las tarifas en este momento. Escríbenos y te las contamos.");
    mostrarAviso("No se pudo cargar el catálogo. " + describirError(error), "error");
  }
}

/* =====================================================================
   4. CONTACTO
   ===================================================================== */

function telefonoEsValido(texto) {
  if (!/^[+()\-\s\d]+$/.test(texto)) {
    return false;
  }
  const cantidadDeDigitos = texto.replace(/\D/g, "").length;
  return cantidadDeDigitos >= 7 && cantidadDeDigitos <= 15;
}

function correoEsValido(texto) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);
}

function leerDatosDelFormulario() {
  const campos = elementos.formularioContacto.elements;
  const limpiar = (texto) => texto.trim().replace(/\s+/g, " ");

  return {
    nombre: limpiar(campos.nombre.value),
    telefono: campos.telefono.value.trim(),
    correo: limpiar(campos.correo.value),
    servicio_id: campos.servicio_id.value,
    mensaje: campos.mensaje.value.trim(),
  };
}

// Las mismas reglas que tiene la base de datos, para avisar antes de enviar.
function validarMensaje(datos) {
  const errores = {};

  if (datos.nombre.length < 2) {
    errores.nombre = "Escribe tu nombre.";
  }
  if (datos.telefono === "" && datos.correo === "") {
    errores.telefono = "Escribe un teléfono o un correo para poder responderte.";
  } else {
    if (datos.telefono !== "" && !telefonoEsValido(datos.telefono)) {
      errores.telefono = "Escribe un teléfono válido (de 7 a 15 dígitos).";
    }
    if (datos.correo !== "" && !correoEsValido(datos.correo)) {
      errores.correo = "Escribe un correo válido (ejemplo: nombre@correo.com).";
    }
  }
  if (datos.mensaje.length < 10) {
    errores.mensaje = "Cuéntanos un poco más (mínimo 10 letras).";
  }

  return errores;
}

function mostrarErroresDelFormulario(errores) {
  const formulario = elementos.formularioContacto;
  const nombresDeCampo = Object.keys(errores);

  nombresDeCampo.forEach((nombre) => {
    formulario.elements[nombre].setAttribute("aria-invalid", "true");

    const parrafoDeError = formulario.querySelector('[data-error-de="' + nombre + '"]');
    parrafoDeError.textContent = errores[nombre];
    parrafoDeError.classList.remove("hidden");
  });

  formulario.elements[nombresDeCampo[0]].focus();
}

function limpiarErroresDelFormulario() {
  const formulario = elementos.formularioContacto;

  formulario.querySelectorAll("[aria-invalid]").forEach((campo) => campo.removeAttribute("aria-invalid"));
  formulario.querySelectorAll("[data-error-de]").forEach((parrafo) => {
    parrafo.textContent = "";
    parrafo.classList.add("hidden");
  });
}

function quitarErrorDelCampoEditado(evento) {
  const campo = evento.target;
  if (!campo.name) {
    return;
  }
  campo.removeAttribute("aria-invalid");

  const parrafoDeError = elementos.formularioContacto.querySelector('[data-error-de="' + campo.name + '"]');
  if (parrafoDeError !== null) {
    parrafoDeError.textContent = "";
    parrafoDeError.classList.add("hidden");
  }
}

function textoONulo(texto) {
  return texto === "" ? null : texto;
}

// Oculta los campos y deja el agradecimiento (o vuelve a mostrarlos).
function mostrarPantallaDeGracias(enviado) {
  Array.from(elementos.formularioContacto.children).forEach((hijo) => {
    if (hijo !== elementos.mensajeEnviado) {
      hijo.classList.toggle("hidden", enviado);
    }
  });
  elementos.mensajeEnviado.classList.toggle("hidden", !enviado);
}

async function enviarMensaje(evento) {
  evento.preventDefault();
  if (estado.enviandoMensaje) {
    return;
  }
  limpiarErroresDelFormulario();

  const datos = leerDatosDelFormulario();
  const errores = validarMensaje(datos);
  if (Object.keys(errores).length > 0) {
    mostrarErroresDelFormulario(errores);
    mostrarAviso("Revisa los campos marcados en rojo.", "error");
    return;
  }

  estado.enviandoMensaje = true;
  elementos.botonEnviar.disabled = true;
  elementos.botonEnviar.textContent = "Enviando...";

  try {
    // Sin .select(): el visitante puede escribir un mensaje pero no leerlos.
    const { error } = await clienteSupabase.from("mensajes").insert({
      nombre: datos.nombre,
      telefono: textoONulo(datos.telefono),
      correo: textoONulo(datos.correo),
      mensaje: datos.mensaje,
      servicio_id: datos.servicio_id === "" ? null : Number(datos.servicio_id),
    });
    if (error) throw error;

    elementos.formularioContacto.reset();
    mostrarPantallaDeGracias(true);
    mostrarAviso("Mensaje enviado. Te respondemos hoy mismo.", "exito");
  } catch (error) {
    mostrarAviso("No se pudo enviar el mensaje. " + describirError(error), "error");
  } finally {
    estado.enviandoMensaje = false;
    elementos.botonEnviar.disabled = false;
    elementos.botonEnviar.textContent = "Enviar mensaje";
  }
}

/* =====================================================================
   5. INICIO
   ===================================================================== */

function conectarEventos() {
  elementos.formularioContacto.addEventListener("submit", enviarMensaje);
  elementos.formularioContacto.addEventListener("input", quitarErrorDelCampoEditado);
  elementos.botonOtroMensaje.addEventListener("click", () => {
    mostrarPantallaDeGracias(false);
    elementos.formularioContacto.elements.nombre.focus();
  });
}

async function iniciarSitio() {
  guardarReferenciasDelDOM();
  conectarEventos();

  if (!sdkDeSupabaseCargado() || !configuracionEsValida()) {
    mostrarCatalogoVacio("No pudimos cargar las tarifas en este momento. Escríbenos y te las contamos.");
    elementos.botonEnviar.disabled = true;
    mostrarAviso("La página no se pudo conectar con el servidor. Recarga en unos minutos.", "error");
    return;
  }

  crearClienteSupabase();
  await cargarCatalogo();
}

document.addEventListener("DOMContentLoaded", iniciarSitio);
