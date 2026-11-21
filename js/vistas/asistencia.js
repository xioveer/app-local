import { FECHA_MINIMA_DE_ASISTENCIA } from "../config/reglas.js";
import { guardarAsistencias, leerAsistenciaDeUnaFecha } from "../datos/asistencias.js";
import { elementos } from "../dom.js";
import { estado } from "../estado.js";
import { mostrarAviso } from "../ui/avisos.js";
import { mostrarCargando, ocultarCargando } from "../ui/cargando.js";
import { confirmarDescartarCambios } from "../ui/confirmacion.js";
import { describirError } from "../utilidades/errores.js";
import { fechaDeHoy } from "../utilidades/fechas.js";
import { formatearFecha } from "../utilidades/formato.js";
import { obtenerIniciales } from "../utilidades/texto.js";
import { validarFechaDeAsistencia } from "../validaciones.js";
import { cargarDisciplinas } from "./disciplinas.js";

const reactCargado =
  typeof window.React !== "undefined" &&
  typeof window.ReactDOM !== "undefined" &&
  typeof window.htm !== "undefined";
const html = reactCargado ? window.htm.bind(window.React.createElement) : null;

let raiz = null;
let numeroDeAperturas = 0;
let hayCambiosSinGuardar = false;

function aplicarYa(cambios) {
  window.ReactDOM.flushSync(cambios);
}

function calcularMarcasIniciales(estudiantes, guardada) {
  const marcas = {};
  estudiantes.forEach((estudiante) => {
    const valorGuardado = guardada[estudiante.id];
    marcas[estudiante.id] = valorGuardado === undefined ? true : valorGuardado;
  });
  return marcas;
}

function FilaDeAsistencia({ estudiante, presente, tieneRegistro, alCambiar }) {
  const disciplina = estudiante.disciplinas ? estudiante.disciplinas.nombre : null;
  const detalle = [disciplina, estudiante.categoria].filter(Boolean).join(", ");

  return html`
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="iniciales hidden sm:flex" aria-hidden="true">${obtenerIniciales(estudiante.nombre_completo)}</span>
        <div className="min-w-0">
          <p data-texto="nombre" className="truncate font-semibold text-slate-900">${estudiante.nombre_completo}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span data-texto="detalle">${detalle || "—"}</span>
            ${!tieneRegistro && html`<span data-texto="sin-registro" className="chip bg-orange-100 text-orange-800">Sin registrar</span>`}
          </p>
        </div>
      </div>

      <label className="relative inline-flex shrink-0 cursor-pointer items-center gap-3">
        <input type="checkbox" role="switch" data-campo="interruptor" className="peer sr-only"
               aria-label=${"Asistencia de " + estudiante.nombre_completo}
               checked=${presente}
               onChange=${(evento) => alCambiar(estudiante.id, evento.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-tinta peer-focus-visible:ring-offset-2"></span>
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></span>
        <span data-texto="estado" className=${"w-16 text-sm font-semibold " + (presente ? "text-emerald-700" : "text-slate-500")}>${presente ? "Presente" : "Ausente"}</span>
      </label>
    </li>
  `;
}

function BarraDeGuardado({ presentes, ausentes, total, modificada, alGuardar }) {
  const numero = "font-titulo text-xl font-bold text-white";

  return html`
    <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex items-center justify-between gap-3 bg-tinta px-4 py-3 text-white sm:bottom-4 sm:mx-0 sm:rounded-2xl sm:px-5">
      <div className="min-w-0">
        <p id="resumen-asistencia" className="flex flex-wrap items-baseline gap-x-4 text-sm text-blue-100">
          <span><span className=${numero}>${presentes}</span> presentes</span>
          <span><span className=${numero}>${ausentes}</span> ausentes</span>
          <span className="hidden sm:inline"><span className=${numero}>${total}</span> en total</span>
        </p>
        ${modificada && html`<p id="aviso-sin-guardar" className="text-xs font-semibold text-sol">Cambios sin guardar</p>`}
      </div>
      <button id="boton-guardar-asistencia" type="button" onClick=${alGuardar}
              className="boton boton-sol shrink-0">
        Guardar asistencia
      </button>
    </div>
  `;
}

function SelectorDeFechaYDisciplina({
  campoFecha,
  filtro,
  disciplinas,
  alCambiarFecha,
  alCambiarDisciplina,
}) {
  return html`
    <div className="tarjeta mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
      <div>
        <label htmlFor="campo-fecha-asistencia" className="etiqueta">Fecha</label>
        <div className="flex gap-2">
          <input id="campo-fecha-asistencia" type="date" min=${FECHA_MINIMA_DE_ASISTENCIA} max=${fechaDeHoy()}
                 value=${campoFecha}
                 onChange=${(evento) => alCambiarFecha(evento.target.value)}
                 className="campo" />
          <button id="boton-fecha-hoy" type="button" onClick=${() => alCambiarFecha(fechaDeHoy())}
                  className="boton boton-secundario">
            Hoy
          </button>
        </div>
      </div>
      <div className="sm:w-64">
        <label htmlFor="filtro-disciplina-asistencia" className="etiqueta">Disciplina</label>
        <select id="filtro-disciplina-asistencia" value=${filtro}
                onChange=${(evento) => alCambiarDisciplina(evento.target.value)}
                className="campo">
          <option value="">Todas las disciplinas</option>
          ${disciplinas.map((disciplina) => html`<option key=${disciplina.id} value=${String(disciplina.id)}>${disciplina.nombre}</option>`)}
        </select>
      </div>
    </div>
  `;
}

function VistaDeAsistencia() {
  const { useState, useEffect, useRef } = window.React;
  const [fecha, setFecha] = useState("");
  const [campoFecha, setCampoFecha] = useState(fechaDeHoy());
  const [disciplinas, setDisciplinas] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [estudiantes, setEstudiantes] = useState([]);
  const [guardada, setGuardada] = useState({});
  const [marcas, setMarcas] = useState({});
  const [cargada, setCargada] = useState(false);
  const [modificada, setModificada] = useState(false);
  const montada = useRef(true);

  const visibles = estudiantes.filter(
    (estudiante) => filtro === "" || String(estudiante.disciplina_id) === filtro
  );
  const presentes = visibles.filter((estudiante) => marcas[estudiante.id]).length;

  async function cargarFecha(fechaACargar) {
    mostrarCargando("Cargando asistencia...");
    try {
      const datos = await leerAsistenciaDeUnaFecha(fechaACargar);
      if (!montada.current) {
        return;
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
    } catch (error) {
      if (montada.current) {
        aplicarYa(() => setCampoFecha(fecha));
        mostrarAviso("No se pudo cargar la asistencia. " + describirError(error), "error");
      }
    } finally {
      ocultarCargando();
    }
  }

  async function traerDisciplinas() {
    const disciplinasCargadas = await cargarDisciplinas();
    if (disciplinasCargadas && montada.current) {
      aplicarYa(() => setDisciplinas(estado.disciplinas));
    }
    return disciplinasCargadas && montada.current;
  }

  useEffect(() => {
    traerDisciplinas().then((listas) => listas && cargarFecha(fechaDeHoy()));
    return () => {
      montada.current = false;
      hayCambiosSinGuardar = false;
    };
  }, []);

  useEffect(() => {
    hayCambiosSinGuardar = modificada;
  }, [modificada]);

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
    if (!cargada && !(await traerDisciplinas())) {
      aplicarYa(() => setCampoFecha(fecha));
      return;
    }

    await cargarFecha(nuevaFecha);
  }

  async function cambiarDisciplinaA(nuevaDisciplina) {
    if (nuevaDisciplina === filtro || !(await confirmarDescartarCambios(modificada))) {
      return;
    }
    aplicarYa(() => {
      setFiltro(nuevaDisciplina);
      setMarcas(calcularMarcasIniciales(estudiantes, guardada));
      setModificada(false);
    });
  }

  function anotarMarca(idEstudiante, presente) {
    setMarcas((marcasActuales) => ({ ...marcasActuales, [idEstudiante]: presente }));
    setModificada(true);
  }

  async function guardar() {
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
      fecha,
      asistio: marcas[estudiante.id],
    }));

    mostrarCargando("Guardando asistencia...");
    try {
      await guardarAsistencias(registros);
      const cantidadDePresentes = registros.filter((registro) => registro.asistio).length;
      const cantidadDeAusentes = registros.length - cantidadDePresentes;
      mostrarAviso(
        `Asistencia del ${formatearFecha(fecha)} guardada: ` +
          `${cantidadDePresentes} presentes y ${cantidadDeAusentes} ausentes.`,
        "exito"
      );
      await cargarFecha(fecha);
    } catch (error) {
      mostrarAviso(describirError(error), "error");
    } finally {
      ocultarCargando();
    }
  }

  const mensajeSinEstudiantes =
    estudiantes.length === 0
      ? "No hay estudiantes activos. Agrégalos en la vista Estudiantes."
      : "No hay estudiantes activos en esta disciplina.";

  const filas = visibles.map(
    (estudiante) => html`
      <${FilaDeAsistencia} key=${estudiante.id} estudiante=${estudiante}
                           presente=${marcas[estudiante.id]}
                           tieneRegistro=${guardada[estudiante.id] !== undefined}
                           alCambiar=${anotarMarca} />
    `
  );

  return html`
    <div>
      <${SelectorDeFechaYDisciplina} campoFecha=${campoFecha} filtro=${filtro} disciplinas=${disciplinas}
                                     alCambiarFecha=${cambiarFechaA} alCambiarDisciplina=${cambiarDisciplinaA} />

      ${cargada && visibles.length === 0 && html`<p id="mensaje-sin-asistencia" className="vacio mt-4">${mensajeSinEstudiantes}</p>`}

      ${
        visibles.length > 0 &&
        html`
        <div id="contenedor-asistencia" className="mt-4">
          <ul id="lista-asistencia" className="tarjeta divide-y divide-slate-100 overflow-hidden">
            ${filas}
          </ul>
          <${BarraDeGuardado} presentes=${presentes} ausentes=${visibles.length - presentes} total=${visibles.length}
                              modificada=${modificada} alGuardar=${guardar} />
        </div>
      `
      }
    </div>
  `;
}

export function abrirVistaAsistencia() {
  if (!reactCargado) {
    mostrarAviso(
      "No se pudo cargar React, que necesita la vista Asistencia. Revisa tu conexión a Internet y recarga la página.",
      "error"
    );
    return;
  }
  if (raiz === null) {
    raiz = window.ReactDOM.createRoot(elementos.raizAsistencia);
  }
  numeroDeAperturas++;
  aplicarYa(() => raiz.render(html`<${VistaDeAsistencia} key=${numeroDeAperturas} />`));
}

export function asistenciaTieneCambiosSinGuardar() {
  return hayCambiosSinGuardar;
}

export function cerrarVistaAsistencia() {
  if (raiz !== null) {
    aplicarYa(() => raiz.render(null));
  }
  hayCambiosSinGuardar = false;
}
