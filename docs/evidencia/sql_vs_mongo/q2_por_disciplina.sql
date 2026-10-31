-- Asistencia de hoy por disciplina (JOIN de tres tablas)
select d.nombre as disciplina,
       count(e.id)                               as estudiantes,
       count(*) filter (where a.asistio)         as presentes,
       count(*) filter (where a.id is null)      as sin_registrar
from disciplinas d
join estudiantes e        on e.disciplina_id = d.id and e.activo
left join asistencias a   on a.estudiante_id = e.id and a.fecha = '2026-10-12'
group by d.nombre
order by d.nombre;
