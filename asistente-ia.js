"use strict";

/* =====================================================================
   asistente-ia.js · El asistente del profesor

   Trabaja en dos niveles, y es importante saber cuál es cuál:

   1. ANÁLISIS LOCAL (siempre funciona, sin Internet a ninguna IA).
      Son reglas y cuentas sobre los datos de la academia: quién está
      faltando y a quién hay que cobrarle. No es un modelo de lenguaje:
      cada conclusión se puede explicar con la regla que la produjo, y
      por eso la pantalla las muestra.

   2. MODELO DE LENGUAJE (opcional).
      Si en Supabase está configurada la clave ANTHROPIC_API_KEY, las
      preguntas escritas van a la Edge Function "asistente", que es la
      que habla con el modelo. La clave vive en el servidor: nunca viaja
      al navegador. Sin clave, la pregunta la responde el análisis local.

   Al modelo solo se le envían CIFRAS AGRUPADAS, nunca nombres,
   teléfonos ni datos de los acudientes.
   ===================================================================== */

(function () {
  const DIAS_QUE_MIRA = 45;
  const CLASES_RECIENTES = 6;

  let datos = null;
  let preguntando = false;
  let modeloDisponible = null; // null = todavía no se ha probado

  const panel = {};

  function guardarReferencias() {
    panel.listaHallazgos = document.getElementById("lista-hallazgos");
    panel.resumenNegocio = document.getElementById("resumen-negocio");
    panel.estadoIa = document.getElementById("estado-ia");
    panel.formularioPregunta = document.getElementById("formulario-pregunta");
    panel.campoPregunta = document.getElementById("campo-pregunta");
    panel.botonPreguntar = document.getElementById("boton-preguntar");
    panel.sugerencias = document.getElementById("sugerencias-pregunta");
    panel.respuesta = document.getElementById("respuesta-asistente");
  }

  /* ---------- Reunir los datos ---------- */

  function fechaHaceDias(dias) {
    const momento = new Date();
    momento.setDate(momento.getDate() - dias);
    const anio = momento.getFullYear();
    const mes = String(momento.getMonth() + 1).padStart(2, "0");
    const dia = String(momento.getDate()).padStart(2, "0");
    return anio + "-" + mes + "-" + dia;
  }

  async function reunirDatos() {
    const desde = fechaHaceDias(DIAS_QUE_MIRA);

    const [respuestaEstudiantes, respuestaAsistencias] = await Promise.all([
      clienteSupabase
        .from("estudiantes")
        .select("id, nombre_completo, edad, estado_pago, activo, disciplina_id, disciplinas(nombre)")
        .eq("activo", true),
      clienteSupabase
        .from("asistencias")
        .select("estudiante_id, fecha, asistio")
        .gte("fecha", desde)
        .order("fecha", { ascending: false }),
    ]);

    [respuestaEstudiantes, respuestaAsistencias].forEach((r) => {
      if (r.error) throw r.error;
    });

    return {
      estudiantes: respuestaEstudiantes.data,
      asistencias: respuestaAsistencias.data,
    };
  }

  /* ---------- Análisis: reglas sobre los datos ---------- */

  // Agrupa la asistencia por estudiante, de la más reciente a la más vieja.
  function agruparAsistenciaPorEstudiante(asistencias) {
    const porEstudiante = {};
    asistencias.forEach((registro) => {
      if (!porEstudiante[registro.estudiante_id]) {
        porEstudiante[registro.estudiante_id] = [];
      }
      porEstudiante[registro.estudiante_id].push(registro);
    });
    return porEstudiante;
  }

  // Puntaje de riesgo de que el estudiante deje la academia.
  // Cada punto viene de una regla, y la regla se guarda para poder mostrarla.
  function calcularRiesgo(estudiante, registros) {
    const recientes = registros.slice(0, CLASES_RECIENTES);
    const presentes = recientes.filter((r) => r.asistio).length;
    const porcentaje = recientes.length > 0 ? Math.round((presentes / recientes.length) * 100) : null;

    let faltasSeguidas = 0;
    for (const registro of registros) {
      if (registro.asistio) break;
      faltasSeguidas++;
    }

    let puntos = 0;
    const razones = [];

    if (faltasSeguidas >= 3) {
      puntos += 3;
      razones.push("faltó a las últimas " + faltasSeguidas + " clases seguidas");
    } else if (faltasSeguidas === 2) {
      puntos += 2;
      razones.push("faltó a las últimas 2 clases");
    }

    if (porcentaje !== null && recientes.length >= 3 && porcentaje < 60) {
      puntos += 2;
      razones.push("solo asistió al " + porcentaje + "% de sus últimas clases");
    }

    if (estudiante.estado_pago === "vencido") {
      puntos += 2;
      razones.push("tiene el pago vencido");
    } else if (estudiante.estado_pago === "pendiente") {
      puntos += 1;
      razones.push("tiene el pago pendiente");
    }

    return { puntos, razones, porcentaje, faltasSeguidas };
  }

  function analizar(datosCrudos) {
    const porEstudiante = agruparAsistenciaPorEstudiante(datosCrudos.asistencias);

    const conRiesgo = datosCrudos.estudiantes
      .map((estudiante) => {
        const registros = porEstudiante[estudiante.id] || [];
        return Object.assign({ estudiante: estudiante }, calcularRiesgo(estudiante, registros));
      })
      .filter((fila) => fila.puntos >= 2)
      .sort((a, b) => b.puntos - a.puntos);

    // Primero los vencidos, que llevan más tiempo sin pagar.
    const porCobrar = datosCrudos.estudiantes
      .filter((e) => e.estado_pago !== "al_dia")
      .sort((a, b) => (a.estado_pago === "vencido" ? 0 : 1) - (b.estado_pago === "vencido" ? 0 : 1));

    const vencidos = porCobrar.filter((e) => e.estado_pago === "vencido").length;

    const totalRegistros = datosCrudos.asistencias.length;
    const presentes = datosCrudos.asistencias.filter((a) => a.asistio).length;
    const asistenciaPromedio = totalRegistros > 0 ? Math.round((presentes / totalRegistros) * 100) : null;

    return {
      activos: datosCrudos.estudiantes.length,
      alDia: datosCrudos.estudiantes.filter((e) => e.estado_pago === "al_dia").length,
      conRiesgo: conRiesgo,
      porCobrar: porCobrar,
      vencidos: vencidos,
      asistenciaPromedio: asistenciaPromedio,
      registrosDeAsistencia: totalRegistros,
    };
  }

  /* ---------- Dibujar en pantalla ---------- */

  function crearHallazgo({ nivel, titulo, detalle, mensajeSugerido }) {
    const colores = {
      alto: "border-l-rose-500",
      medio: "border-l-orange-400",
      bueno: "border-l-emerald-500",
    };

    const elemento = document.createElement("li");
    elemento.className = "rounded-xl border border-slate-200 border-l-4 bg-white p-4 " + colores[nivel];

    const encabezado = document.createElement("p");
    encabezado.className = "font-semibold text-slate-900";
    encabezado.textContent = titulo;
    elemento.appendChild(encabezado);

    const cuerpo = document.createElement("p");
    cuerpo.className = "mt-1 text-sm leading-relaxed text-slate-600";
    cuerpo.textContent = detalle;
    elemento.appendChild(cuerpo);

    if (mensajeSugerido) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton boton-chico boton-secundario mt-3";
      boton.textContent = "Copiar mensaje para el acudiente";
      boton.addEventListener("click", () => copiarAlPortapapeles(mensajeSugerido, boton));
      elemento.appendChild(boton);
    }

    return elemento;
  }

  async function copiarAlPortapapeles(texto, boton) {
    try {
      await navigator.clipboard.writeText(texto);
      boton.textContent = "Mensaje copiado";
      setTimeout(() => {
        boton.textContent = "Copiar mensaje para el acudiente";
      }, 2500);
    } catch (error) {
      mostrarAviso("El navegador no dejó copiar. Selecciona el texto a mano.", "error");
    }
  }

  function redactarMensajeDeRiesgo(fila) {
    const nombre = fila.estudiante.nombre_completo.split(" ")[0];
    return (
      "Hola, le escribimos de la academia. Notamos que " +
      nombre +
      " no ha venido a las últimas clases y queremos saber si todo está bien. " +
      "Nos encantaría volver a verlo. ¿Le sirve que conversemos esta semana?"
    );
  }

  function redactarMensajeDeCobro(estudiante) {
    const nombre = estudiante.nombre_completo.split(" ")[0];
    return (
      "Hola, le saludamos de la academia. Le recordamos que la mensualidad de " +
      nombre +
      " está pendiente. Si ya la pagó, por favor ignore este mensaje. ¡Gracias!"
    );
  }

  function dibujarHallazgos(analisis) {
    panel.listaHallazgos.replaceChildren();
    const hallazgos = [];

    if (analisis.activos === 0) {
      hallazgos.push({
        nivel: "medio",
        titulo: "Todavía no hay estudiantes activos",
        detalle: "Agrégalos en la vista Estudiantes para que el asistente pueda analizar tus grupos.",
      });
    }

    const enRiesgoAlto = analisis.conRiesgo.filter((f) => f.puntos >= 4);
    if (enRiesgoAlto.length > 0) {
      const primero = enRiesgoAlto[0];
      hallazgos.push({
        nivel: "alto",
        titulo:
          enRiesgoAlto.length === 1
            ? "1 estudiante podría retirarse"
            : enRiesgoAlto.length + " estudiantes podrían retirarse",
        detalle:
          "El caso más urgente es " +
          primero.estudiante.nombre_completo +
          ": " +
          primero.razones.join(", ") +
          ". Conviene llamar al acudiente esta semana.",
        mensajeSugerido: redactarMensajeDeRiesgo(primero),
      });
    }

    const enRiesgoMedio = analisis.conRiesgo.filter((f) => f.puntos < 4);
    if (enRiesgoMedio.length > 0) {
      hallazgos.push({
        nivel: "medio",
        titulo: enRiesgoMedio.length + " estudiantes para vigilar",
        detalle:
          enRiesgoMedio
            .slice(0, 3)
            .map((f) => f.estudiante.nombre_completo + " (" + f.razones[0] + ")")
            .join("; ") + ".",
      });
    }

    if (analisis.porCobrar.length > 0) {
      hallazgos.push({
        nivel: analisis.vencidos > 0 ? "alto" : "medio",
        titulo:
          analisis.porCobrar.length === 1
            ? "1 estudiante no está al día con el pago"
            : analisis.porCobrar.length + " estudiantes no están al día con el pago",
        detalle:
          (analisis.vencidos > 0
            ? analisis.vencidos + " ya tienen el pago vencido. "
            : "Ninguno llegó todavía a vencido. ") +
          "Empieza por " +
          analisis.porCobrar[0].nombre_completo +
          ".",
        mensajeSugerido: redactarMensajeDeCobro(analisis.porCobrar[0]),
      });
    }

    if (analisis.registrosDeAsistencia === 0 && analisis.activos > 0) {
      hallazgos.push({
        nivel: "medio",
        titulo: "No has registrado asistencia",
        detalle:
          "Sin asistencia no se puede saber quién está faltando. Tómala en la vista Asistencia y vuelve aquí.",
      });
    }

    if (hallazgos.length === 0) {
      hallazgos.push({
        nivel: "bueno",
        titulo: "Todo marcha bien",
        detalle:
          "Nadie está en riesgo de retirarse y todos los pagos están al día. " +
          "Sigue registrando la asistencia para que el asistente pueda avisarte a tiempo.",
      });
    }

    hallazgos.forEach((hallazgo) => panel.listaHallazgos.appendChild(crearHallazgo(hallazgo)));
  }

  function crearDatoDeResumen(etiqueta, valor, nota) {
    const bloque = document.createElement("div");

    const titulo = document.createElement("dt");
    titulo.className = "text-sm text-slate-500";
    titulo.textContent = etiqueta;
    bloque.appendChild(titulo);

    const dato = document.createElement("dd");
    dato.className = "font-titulo text-3xl font-bold text-tinta";
    dato.textContent = valor;
    bloque.appendChild(dato);

    if (nota) {
      const pie = document.createElement("p");
      pie.className = "text-xs text-slate-500";
      pie.textContent = nota;
      bloque.appendChild(pie);
    }

    return bloque;
  }

  function dibujarResumen(analisis) {
    panel.resumenNegocio.replaceChildren();

    panel.resumenNegocio.appendChild(crearDatoDeResumen("Estudiantes activos", String(analisis.activos)));

    panel.resumenNegocio.appendChild(
      crearDatoDeResumen(
        "Pagos al día",
        analisis.activos === 0 ? "—" : analisis.alDia + " de " + analisis.activos,
        analisis.porCobrar.length > 0 ? analisis.porCobrar.length + " por cobrar" : "Nadie debe mensualidad"
      )
    );

    panel.resumenNegocio.appendChild(
      crearDatoDeResumen(
        "Asistencia promedio",
        analisis.asistenciaPromedio === null ? "—" : analisis.asistenciaPromedio + "%",
        analisis.registrosDeAsistencia > 0
          ? "Sobre " + analisis.registrosDeAsistencia + " registros de los últimos " + DIAS_QUE_MIRA + " días"
          : "Todavía no hay asistencia registrada"
      )
    );
  }

  /* ---------- Preguntas ---------- */

  // Lo que se le manda al modelo: solo cifras, sin nombres ni teléfonos.
  function resumenParaElModelo(analisis) {
    return {
      estudiantes_activos: analisis.activos,
      estudiantes_al_dia: analisis.alDia,
      estudiantes_sin_pagar: analisis.porCobrar.length,
      estudiantes_con_pago_vencido: analisis.vencidos,
      estudiantes_en_riesgo: analisis.conRiesgo.length,
      asistencia_promedio_porcentaje: analisis.asistenciaPromedio,
      registros_de_asistencia: analisis.registrosDeAsistencia,
      dias_analizados: DIAS_QUE_MIRA,
    };
  }

  // Respuesta sin modelo: busca palabras clave y contesta con las cifras.
  function responderConReglas(pregunta, analisis) {
    const texto = normalizarTexto(pregunta);

    if (/cobr|pago|deuda|plata|dinero|mensualidad|debe/.test(texto)) {
      if (analisis.porCobrar.length === 0) {
        return "Todos tus estudiantes están al día con el pago. No tienes nada por cobrar.";
      }
      const lista = analisis.porCobrar
        .slice(0, 6)
        .map((e) => "· " + e.nombre_completo + " (" + e.estado_pago.replace("_", " ") + ")")
        .join("\n");
      return (
        analisis.porCobrar.length +
        " estudiantes no están al día" +
        (analisis.vencidos > 0 ? ", y " + analisis.vencidos + " ya tienen el pago vencido" : "") +
        ":\n" +
        lista
      );
    }

    if (/riesgo|retir|desert|falt|abandon/.test(texto)) {
      if (analisis.conRiesgo.length === 0) {
        return "Ningún estudiante muestra señales de querer retirarse. La asistencia viene estable.";
      }
      const lista = analisis.conRiesgo
        .slice(0, 6)
        .map((f) => "· " + f.estudiante.nombre_completo + ": " + f.razones.join(", "))
        .join("\n");
      return "Estos estudiantes necesitan atención:\n" + lista;
    }

    if (/asistenc|vinier|present|ausent/.test(texto)) {
      if (analisis.asistenciaPromedio === null) {
        return "Todavía no hay asistencia registrada. Tómala en la vista Asistencia para poder analizarla.";
      }
      return (
        "La asistencia promedio de los últimos " +
        DIAS_QUE_MIRA +
        " días es del " +
        analisis.asistenciaPromedio +
        "%, sobre " +
        analisis.registrosDeAsistencia +
        " registros."
      );
    }

    if (/cuantos|cuántos|activ|grupo|estudiante/.test(texto)) {
      return (
        "Tienes " +
        analisis.activos +
        " estudiantes activos, " +
        analisis.alDia +
        " de ellos al día con el pago."
      );
    }

    return (
      "Esto es lo que veo hoy:\n" +
      "· " +
      analisis.activos +
      " estudiantes activos\n" +
      "· " +
      analisis.porCobrar.length +
      " sin pagar la mensualidad\n" +
      "· " +
      analisis.conRiesgo.length +
      " en riesgo de retirarse\n" +
      "· " +
      (analisis.asistenciaPromedio === null ? "sin" : analisis.asistenciaPromedio + "% de") +
      " asistencia promedio\n\n" +
      "Puedes preguntarme por cobros, asistencia o riesgo de deserción."
    );
  }

  // Intenta el modelo de lenguaje. Devuelve null si no está disponible,
  // y entonces responde el análisis local.
  async function responderConModelo(pregunta, analisis) {
    const { data: sesion } = await clienteSupabase.auth.getSession();
    if (!sesion.session) {
      return null;
    }

    const respuesta = await fetch(SUPABASE_URL.trim() + "/functions/v1/asistente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + sesion.session.access_token,
        apikey: SUPABASE_ANON_KEY.trim(),
      },
      body: JSON.stringify({ pregunta: pregunta, resumen: resumenParaElModelo(analisis) }),
    });

    if (!respuesta.ok) {
      return null;
    }

    const cuerpo = await respuesta.json();
    if (cuerpo.disponible === false || !cuerpo.respuesta) {
      return null;
    }
    return cuerpo.respuesta;
  }

  function escribirEstadoDeLaIa() {
    if (modeloDisponible === true) {
      panel.estadoIa.textContent = "Responde un modelo de lenguaje, con las cifras de tu academia.";
    } else if (modeloDisponible === false) {
      panel.estadoIa.textContent =
        "Responde el análisis local, con reglas sobre tus datos. " +
        "Para usar un modelo de lenguaje, configura la clave en Supabase (ver el README).";
    } else {
      panel.estadoIa.textContent = "Pregunta por cobros, asistencia o riesgo de deserción.";
    }
  }

  function mostrarRespuesta(texto) {
    panel.respuesta.textContent = texto;
    panel.respuesta.classList.remove("hidden");
  }

  async function preguntar(evento) {
    evento.preventDefault();
    if (preguntando) {
      return;
    }

    const pregunta = panel.campoPregunta.value.trim();
    if (pregunta.length < 4) {
      mostrarAviso("Escribe una pregunta un poco más larga.", "error");
      return;
    }
    if (datos === null) {
      mostrarAviso("Todavía no se cargaron los datos. Espera un momento.", "error");
      return;
    }

    preguntando = true;
    panel.botonPreguntar.disabled = true;
    panel.botonPreguntar.textContent = "Pensando...";

    const analisis = analizar(datos);
    try {
      const delModelo = await responderConModelo(pregunta, analisis);
      modeloDisponible = delModelo !== null;
      mostrarRespuesta(delModelo !== null ? delModelo : responderConReglas(pregunta, analisis));
    } catch (error) {
      modeloDisponible = false;
      mostrarRespuesta(responderConReglas(pregunta, analisis));
    } finally {
      escribirEstadoDeLaIa();
      preguntando = false;
      panel.botonPreguntar.disabled = false;
      panel.botonPreguntar.textContent = "Preguntar";
    }
  }

  function dibujarSugerencias() {
    const preguntas = [
      "¿A quién debo cobrarle?",
      "¿Quién está faltando mucho?",
      "¿Cómo va la asistencia?",
      "¿Cuántos estudiantes activos tengo?",
    ];

    panel.sugerencias.replaceChildren();
    preguntas.forEach((texto) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className =
        "rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-papel";
      boton.textContent = texto;
      boton.addEventListener("click", () => {
        panel.campoPregunta.value = texto;
        panel.formularioPregunta.requestSubmit();
      });
      panel.sugerencias.appendChild(boton);
    });
  }

  /* ---------- Arranque ---------- */

  let eventosConectados = false;

  async function abrir() {
    guardarReferencias();

    if (!eventosConectados) {
      panel.formularioPregunta.addEventListener("submit", preguntar);
      dibujarSugerencias();
      eventosConectados = true;
    }
    escribirEstadoDeLaIa();

    mostrarCargando("Analizando tus grupos...");
    try {
      datos = await reunirDatos();
      const analisis = analizar(datos);
      dibujarHallazgos(analisis);
      dibujarResumen(analisis);
    } catch (error) {
      mostrarAviso("No se pudo analizar la academia. " + describirError(error), "error");
    } finally {
      ocultarCargando();
    }
  }

  window.Asistente = { abrir: abrir };
})();
