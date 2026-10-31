-- Métricas de asistencia de HOY (una sola consulta; LEFT JOIN conserva a quien no tiene registro)
select
  count(*) filter (where a.asistio)          as presentes,
  count(*) filter (where a.asistio is false) as ausentes,
  count(a.id)                                as registrados,
  count(*) filter (where a.id is null)       as sin_registrar,
  round(100.0 * count(*) filter (where a.asistio) / nullif(count(a.id), 0), 1) as porcentaje
from estudiantes e
left join asistencias a on a.estudiante_id = e.id and a.fecha = '2026-10-12'
where e.activo;
