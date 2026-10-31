// EJEMPLO DIDÁCTICO (no se carga en la app). Necesita React, htm y la función normalizarTexto() de app.js.
// const html = htm.bind(React.createElement);
const { useState } = React;

const ETIQUETAS_DE_PAGO = { al_dia: "Al día", pendiente: "Pendiente", vencido: "Vencido" };

// <FilaDeEstudiante/>: una fila. Recibe sus datos por "props" y avisa con funciones.
function FilaDeEstudiante({ estudiante, alEditar, alCambiarActivo }) {
  const acudiente = [estudiante.acudiente_nombre, estudiante.acudiente_telefono]
    .filter(Boolean).join(" · ") || "—";

  return html`
    <tr data-inactivo=${!estudiante.activo}>
      <td>
        ${estudiante.nombre_completo}${" "}
        ${!estudiante.activo && html`<span>Inactivo</span>`}
      </td>
      <td>${estudiante.edad} años</td>
      <td>${estudiante.disciplinas ? estudiante.disciplinas.nombre : "—"}</td>
      <td>${estudiante.categoria || "—"}</td>
      <td>${acudiente}</td>
      <td>${ETIQUETAS_DE_PAGO[estudiante.estado_pago]}</td>
      <td>
        <div className="flex gap-2">
          <button onClick=${() => alEditar(estudiante)}>Editar</button>
          <button onClick=${() => alCambiarActivo(estudiante)}>${estudiante.activo ? "Desactivar" : "Reactivar"}</button>
        </div>
      </td>
    </tr>
  `;
}

// <TablaEstudiantes/>: filtra y dibuja. NO guarda nada: todo sale de sus "props".
function TablaEstudiantes({ estudiantes, texto, idDisciplina, mostrarInactivos, alEditar, alCambiarActivo }) {
  const buscado = normalizarTexto(texto.trim());
  const base = estudiantes.filter((e) => mostrarInactivos || e.activo);
  const visibles = base.filter((e) =>
    (idDisciplina === "" || String(e.disciplina_id) === idDisciplina) &&
    normalizarTexto(e.nombre_completo).includes(buscado));

  if (visibles.length === 0) {
    return html`<p>Ningún estudiante coincide con la búsqueda o el filtro.</p>`;
  }

  return html`
    <div>
      <p>Mostrando ${visibles.length} de ${base.length} estudiantes</p>
      <table>
        <tbody>
          ${visibles.map((e) => html`<${FilaDeEstudiante} key=${e.id} estudiante=${e} alEditar=${alEditar} alCambiarActivo=${alCambiarActivo} />`)}
        </tbody>
      </table>
    </div>
  `;
}

// <PanelDeEstudiantes/>: el ÚNICO que tiene ESTADO (lo que se escribe y el checkbox).
function PanelDeEstudiantes({ estudiantes, alEditar, alCambiarActivo }) {
  const [texto, setTexto] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  return html`
    <div>
      <input placeholder="Buscar por nombre..." value=${texto} onInput=${(evento) => setTexto(evento.target.value)} />
      <label>
        <input type="checkbox" checked=${mostrarInactivos} onChange=${(evento) => setMostrarInactivos(evento.target.checked)} />
        Mostrar inactivos
      </label>
      <${TablaEstudiantes} estudiantes=${estudiantes} texto=${texto} idDisciplina=""
                           mostrarInactivos=${mostrarInactivos} alEditar=${alEditar} alCambiarActivo=${alCambiarActivo} />
    </div>
  `;
}
