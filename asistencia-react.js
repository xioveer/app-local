"use strict";

/* =====================================================================
   asistencia-react.js  ·  La vista "Asistencia" hecha con REACT

   ¿Por qué React solo aquí?
   La asistencia es la parte más "viva" de la aplicación: al mover un interruptor cambian
   a la vez el texto "Presente/Ausente", el resumen, el aviso "Cambios sin guardar" y las
   etiquetas. Con JavaScript vainilla había que actualizar cada cosa a mano. Con React
   solo se guarda el ESTADO (las marcas, la fecha...) y la pantalla se calcula sola a
   partir de él.

   Cómo está armado:
     · Un COMPONENTE es una función que devuelve un trozo de pantalla.
         FilaDeAsistencia   → una fila (nombre + interruptor)
         VistaDeAsistencia  → toda la vista (fecha, filtro, lista y botón de guardar)
     · El ESTADO (useState) son los datos que, cuando cambian, hacen que React vuelva a
       dibujar el componente.
     · Las consultas a Supabase NO están aquí: viven en app.js (consultarAsistenciaDeUnaFecha
       y guardarRegistrosDeAsistencia). Este archivo solo se ocupa de la pantalla.
     · No usamos JSX (necesita compilador). Con la librería "htm" se escribe parecido:
       html`<p>Hola ${nombre}</p>`

   El resto de la aplicación habla con esta vista a través de window.VistaAsistencia
   (abrir, cerrar, tieneCambiosSinGuardar), al final de este archivo.
   ===================================================================== */

// Función que se ejecuta sola, para que los nombres de aquí no se mezclen con los de app.js.
(function () {
  // Si React no se pudo cargar (sin Internet o CDN bloqueado) no se define VistaAsistencia,
  // y app.js muestra un aviso cuando se intenta abrir la vista.
  if (typeof React === "undefined" || typeof ReactDOM === "undefined" || typeof htm === "undefined") {
    return;
  }

  const { useState, useEffect, useRef } = React;
  const html = htm.bind(React.createElement); // html`...` = "HTML dentro de JavaScript"


  /* ---------- Funciones auxiliares ---------- */

  // Calcula cómo empiezan los interruptores: lo que ya está guardado en la base de datos
  // y, para quien todavía no tiene registro en esa fecha, "presente".
  function calcularMarcasIniciales(estudiantes, guardada) {
    const marcas = {};
    estudiantes.forEach((estudiante) => {
      const valorGuardado = guardada[estudiante.id];
      marcas[estudiante.id] = valorGuardado === undefined ? true : valorGuardado;
    });
    return marcas;
  }

  // React junta los cambios de estado y dibuja "un instante después". Pero el indicador de
  // "cargando" NO es de React: se oculta de inmediato. Con flushSync le pedimos a React que
  // dibuje YA, para que, cuando desaparezca el indicador, la lista ya esté en pantalla.
  function aplicarYa(cambios) {
    ReactDOM.flushSync(cambios);
  }


  /* ---------- Componente: una fila de la lista ---------- */

  // Una fila: el nombre, su detalle y el interruptor presente/ausente.
  // Recibe sus datos por "props" y avisa con alCambiar cuando se mueve el interruptor.
  function FilaDeAsistencia({ estudiante, presente, tieneRegistro, alCambiar }) {
    const disciplina = estudiante.disciplinas ? estudiante.disciplinas.nombre : null;
    const detalle = [disciplina, estudiante.categoria].filter(Boolean).join(" · ");

    // El interruptor es un checkbox escondido (sr-only) y dos <span> que dibujan el "riel" y la
    // "bolita". Con "peer", cuando el checkbox está marcado el riel se pone verde y la bolita se mueve.
    return html`
      <li className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p data-texto="nombre" className="truncate font-medium text-slate-900">${estudiante.nombre_completo}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span data-texto="detalle">${detalle || "—"}</span>
            ${!tieneRegistro && html`<span data-texto="sin-registro" className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">Sin registrar</span>`}
          </p>
        </div>

        <label className="relative inline-flex shrink-0 cursor-pointer items-center gap-3">
          <input type="checkbox" role="switch" data-campo="interruptor" className="peer sr-only"
                 aria-label=${"Asistencia de " + estudiante.nombre_completo}
                 checked=${presente}
                 onChange=${(evento) => alCambiar(estudiante.id, evento.target.checked)} />
          <span className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2"></span>
          <span className="pointer-events-none absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></span>
          <span data-texto="estado" className=${"w-16 text-sm font-medium " + (presente ? "text-emerald-700" : "text-slate-500")}>${presente ? "Presente" : "Ausente"}</span>
        </label>
      </li>
    `;
  }


  /* ---------- Componente: toda la vista ---------- */

  // Si hay cambios sin guardar, app.js lo consulta (para preguntar antes de cambiar de vista).
  let hayCambiosSinGuardar = false;

  // La vista completa. Todo lo que se ve sale de estos datos (el ESTADO):
  function VistaDeAsistencia() {
    // Fecha cargada (con ESTA fecha se guarda). Vacía = todavía no se ha cargado nada.
    const [fecha, setFecha] = useState("");
    // Lo que se ve escrito en el campo de fecha (puede ser distinto mientras se valida o se confirma).
    const [campoFecha, setCampoFecha] = useState(fechaDeHoy());
    const [disciplinas, setDisciplinas] = useState([]);
    const [filtro, setFiltro] = useState("");            // id de la disciplina elegida; "" = todas
    const [estudiantes, setEstudiantes] = useState([]);  // los estudiantes activos
    const [guardada, setGuardada] = useState({});        // registros que ya existen: id → true/false
    const [marcas, setMarcas] = useState({});            // lo que muestran los interruptores: id → true/false
    const [cargada, setCargada] = useState(false);       // ¿ya se cargó bien la fecha?
    const [modificada, setModificada] = useState(false); // ¿hay interruptores movidos sin guardar?

    // Para no actuar sobre una pantalla que ya se quitó (por ejemplo, si se cerró sesión).
    const montada = useRef(true);

    // Lo que se calcula a partir del estado. No se guarda: se recalcula en cada dibujo.
    const hoy = fechaDeHoy();
    const visibles = estudiantes.filter(
      (estudiante) => filtro === "" || String(estudiante.disciplina_id) === filtro
    );
    const presentes = visibles.filter((estudiante) => marcas[estudiante.id]).length;


    /* --- Cargar datos --- */

    // Pide la asistencia de una fecha y actualiza todo el estado de una vez.
    // Si algo falla, avisa y deja el campo de fecha como estaba. Devuelve true o false.
    async function cargarFecha(fechaACargar) {
      mostrarCargando("Cargando asistencia...");
      try {
        const datos = await consultarAsistenciaDeUnaFecha(fechaACargar);
        if (!montada.current) {
          return false;
        }

        aplicarYa(() => {
          setEstudiantes(datos.estudiantes);
          setGuardada(datos.guardada);
          setMarcas(calcularMarcasIniciales(datos.estudiantes, datos.guardada));
          setFecha(fechaACargar);
          setCampoFecha(fechaACargar);
          setCargada(true);
          setModificada(false);
        });
        return true;
      } catch (error) {
        if (montada.current) {
          aplicarYa(() => setCampoFecha(fecha));
          mostrarAviso("No se pudo cargar la asistencia. " + describirError(error), "error");
        }
        return false;
      } finally {
        ocultarCargando();
      }
    }

    // Al abrir la vista: carga las disciplinas (para el filtro) y la asistencia de hoy.
    async function cargarAlAbrir() {
      const disciplinasCargadas = await cargarDisciplinas(); // función de app.js
      if (!montada.current) {
        return;
      }
      if (disciplinasCargadas) {
        aplicarYa(() => setDisciplinas(estado.disciplinas));
        await cargarFecha(fechaDeHoy());
      }
    }

    // useEffect con [] se ejecuta UNA vez, cuando la vista aparece. Lo que devuelve se ejecuta
    // cuando desaparece.
    useEffect(() => {
      cargarAlAbrir();
      return () => {
        montada.current = false;
        hayCambiosSinGuardar = false;
      };
    }, []);

    // Cada vez que cambia "modificada", se lo avisamos al resto de la aplicación.
    useEffect(() => {
      hayCambiosSinGuardar = modificada;
    }, [modificada]);


    /* --- Reaccionar a lo que hace la persona --- */

    // Cambia de fecha: la valida, pregunta si hay cambios sin guardar y carga esa fecha.
    // Si algo falla o se cancela, el campo vuelve a la fecha que estaba cargada.
    async function cambiarFechaA(nuevaFecha) {
      setCampoFecha(nuevaFecha);

      if (cargada && nuevaFecha === fecha) {
        return;
      }

      const problema = validarFechaDeAsistencia(nuevaFecha);
      if (problema !== "") {
        mostrarAviso(problema, "error");
        setCampoFecha(fecha);
        return;
      }

      if (!(await confirmarDescartarCambios(modificada))) {
        setCampoFecha(fecha);
        return;
      }

      // Si la primera carga había fallado, todavía faltan las disciplinas del filtro: se piden otra vez.
      if (!cargada) {
        if (!(await cargarDisciplinas())) {
          aplicarYa(() => setCampoFecha(fecha));
          return;
        }
        aplicarYa(() => setDisciplinas(estado.disciplinas));
      }

      await cargarFecha(nuevaFecha);
    }

    // Se eligió una disciplina en el filtro: si hay cambios sin guardar, se pregunta antes.
    // Si se cancela, "filtro" no cambia y React deja el selector como estaba.
    async function cambiarDisciplinaA(nuevaDisciplina) {
      if (nuevaDisciplina === filtro) {
        return;
      }
      if (!(await confirmarDescartarCambios(modificada))) {
        return;
      }

      aplicarYa(() => {
        setFiltro(nuevaDisciplina);
        setMarcas(calcularMarcasIniciales(estudiantes, guardada));
        setModificada(false);
      });
    }

    // Se movió un interruptor: se anota la marca y se avisa que hay cambios sin guardar.
    function anotarMarca(idEstudiante, presente) {
      setMarcas((marcasActuales) => ({ ...marcasActuales, [idEstudiante]: presente }));
      setModificada(true);
    }

    // Guarda la asistencia de los estudiantes que se ven en la lista (upsert, en app.js).
    async function guardar() {
      // Se usa la fecha CARGADA (no lo que haya escrito en el campo), para que las marcas
      // de un día nunca se guarden bajo la fecha de otro.
      const problema = validarFechaDeAsistencia(fecha);
      if (problema !== "") {
        mostrarAviso(problema, "error");
        return;
      }
      if (visibles.length === 0) {
        mostrarAviso("No hay estudiantes en la lista para guardar.", "error");
        return;
      }

      const registros = visibles.map((estudiante) => ({
        estudiante_id: estudiante.id,
        fecha: fecha,
        asistio: marcas[estudiante.id],
      }));

      mostrarCargando("Guardando asistencia...");
      try {
        await guardarRegistrosDeAsistencia(registros);

        const cantidadDePresentes = registros.filter((registro) => registro.asistio).length;
        mostrarAviso(
          "Asistencia del " + formatearFecha(fecha) + " guardada: " +
            cantidadDePresentes + " presentes y " + (registros.length - cantidadDePresentes) + " ausentes.",
          "exito"
        );
        await cargarFecha(fecha); // vuelve a leer lo guardado
      } catch (error) {
        mostrarAviso(describirError(error), "error");
      } finally {
        ocultarCargando();
      }
    }


    /* --- Lo que se ve en pantalla --- */

    const resumen = "Presentes: " + presentes + " · Ausentes: " + (visibles.length - presentes) + " · Total: " + visibles.length;
    const mensajeSinEstudiantes = estudiantes.length === 0
      ? "No hay estudiantes activos. Agrégalos en la vista Estudiantes."
      : "No hay estudiantes activos en esta disciplina.";

    return html`
      <div>
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          <div>
            <label htmlFor="campo-fecha-asistencia" className="block text-sm font-medium text-slate-700">Fecha</label>
            <div className="mt-1 flex gap-2">
              <input id="campo-fecha-asistencia" type="date" min=${FECHA_MINIMA_DE_ASISTENCIA} max=${hoy}
                     value=${campoFecha}
                     onChange=${(evento) => cambiarFechaA(evento.target.value)}
                     className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              <button id="boton-fecha-hoy" type="button" onClick=${() => cambiarFechaA(fechaDeHoy())}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                Hoy
              </button>
            </div>
          </div>
          <div className="sm:w-64">
            <label htmlFor="filtro-disciplina-asistencia" className="block text-sm font-medium text-slate-700">Disciplina</label>
            <select id="filtro-disciplina-asistencia" value=${filtro}
                    onChange=${(evento) => cambiarDisciplinaA(evento.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
              <option value="">Todas las disciplinas</option>
              ${disciplinas.map((disciplina) => html`<option key=${disciplina.id} value=${String(disciplina.id)}>${disciplina.nombre}</option>`)}
            </select>
          </div>
        </div>

        ${cargada && visibles.length === 0 && html`
          <p id="mensaje-sin-asistencia" className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">${mensajeSinEstudiantes}</p>
        `}

        ${visibles.length > 0 && html`
          <div id="contenedor-asistencia" className="mt-4">
            <ul id="lista-asistencia" className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              ${visibles.map((estudiante) => html`
                <${FilaDeAsistencia} key=${estudiante.id} estudiante=${estudiante}
                                     presente=${marcas[estudiante.id]}
                                     tieneRegistro=${guardada[estudiante.id] !== undefined}
                                     alCambiar=${anotarMarca} />
              `)}
            </ul>

            <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-sm">
              <div className="min-w-0">
                <p id="resumen-asistencia" className="text-sm font-medium text-slate-700">${resumen}</p>
                ${modificada && html`<p id="aviso-sin-guardar" className="text-xs font-medium text-amber-600">Cambios sin guardar</p>`}
              </div>
              <button id="boton-guardar-asistencia" type="button" onClick=${guardar}
                      className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                Guardar asistencia
              </button>
            </div>
          </div>
        `}
      </div>
    `;
  }


  /* ---------- Conexión con el resto de la aplicación ---------- */

  const raiz = ReactDOM.createRoot(document.getElementById("raiz-asistencia"));
  let numeroDeAperturas = 0;

  // app.js usa estas tres funciones (ver "El puente con React" en la sección 6 de app.js).
  window.VistaAsistencia = {
    // Muestra la vista desde cero. Cambiar la "key" hace que React cree una vista NUEVA
    // (con el estado vacío) en vez de reutilizar la anterior.
    abrir() {
      numeroDeAperturas++;
      ReactDOM.flushSync(() => raiz.render(html`<${VistaDeAsistencia} key=${numeroDeAperturas} />`));
    },

    // Quita la vista de la pantalla (y con ella todos sus datos).
    cerrar() {
      hayCambiosSinGuardar = false;
      ReactDOM.flushSync(() => raiz.render(null));
    },

    // ¿Hay interruptores movidos sin guardar?
    tieneCambiosSinGuardar() {
      return hayCambiosSinGuardar;
    },
  };
})();
