function TarjetaDashboard({ titulo, valor, colorDelPunto }) {
  return html`
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <span className=${"h-2.5 w-2.5 rounded-full " + colorDelPunto} aria-hidden="true"></span>
        ${titulo}
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">${valor}</p>
    </div>
  `;
}
function PanelDeTarjetas({ metricas }) {
  const v = (campo) => (metricas ? metricas[campo] : "—");   // "—" mientras no hay datos
  return html`
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <${TarjetaDashboard} titulo="Estudiantes activos" valor=${v("activos")}    colorDelPunto="bg-indigo-500" />
      <${TarjetaDashboard} titulo="Pagos al día"        valor=${v("alDia")}      colorDelPunto="bg-emerald-500" />
      <${TarjetaDashboard} titulo="Pagos pendientes"    valor=${v("pendientes")} colorDelPunto="bg-amber-500" />
      <${TarjetaDashboard} titulo="Pagos vencidos"      valor=${v("vencidos")}   colorDelPunto="bg-rose-500" />
    </div>
  `;
}
