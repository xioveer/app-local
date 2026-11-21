function crearOpcion(valor, texto) {
  const opcion = document.createElement("option");
  opcion.value = valor;
  opcion.textContent = texto;
  return opcion;
}

export function llenarSelectDeDisciplinas(select, disciplinas, textoDeLaPrimeraOpcion) {
  const seleccionActual = select.value;

  select.replaceChildren(crearOpcion("", textoDeLaPrimeraOpcion));
  disciplinas.forEach((disciplina) => {
    select.appendChild(crearOpcion(String(disciplina.id), disciplina.nombre));
  });

  select.value = seleccionActual;
  if (select.selectedIndex === -1) {
    select.selectedIndex = 0;
  }
}
