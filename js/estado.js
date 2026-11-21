export const estado = {
  vistaActual: "",
  usuario: null,
  disciplinas: [],
  estudiantes: [],
  disciplinasCargadas: false,
  estudiantesCargados: false,
  idEstudianteEnEdicion: null,
  dashboardCargado: false,
};

export function reiniciarEstado() {
  estado.vistaActual = "";
  estado.usuario = null;
  estado.disciplinas = [];
  estado.estudiantes = [];
  estado.disciplinasCargadas = false;
  estado.estudiantesCargados = false;
  estado.idEstudianteEnEdicion = null;
  estado.dashboardCargado = false;
}
