insert into public.disciplinas (nombre) values
  ('Fútbol'),
  ('Guitarra'),
  ('Danza folclórica')
on conflict (nombre) do nothing;


insert into public.estudiantes
  (nombre_completo, edad, disciplina_id, categoria,
   acudiente_nombre, acudiente_telefono, estado_pago, activo)
select
  v.nombre_completo, v.edad, d.id, v.categoria,
  v.acudiente_nombre, v.acudiente_telefono, v.estado_pago, v.activo
from (values
  ('Santiago Pérez Mora',   9,  'Fútbol',           'Infantil',     'Marta Mora',     '300 000 0001', 'al_dia',    true),
  ('Mateo Gómez Ruiz',      12, 'Fútbol',           'Sub-12',       'Carlos Gómez',   '300 000 0002', 'pendiente', true),
  ('Valentina Castro Díaz', 15, 'Fútbol',           'Sub-15',       'Luz Díaz',       '300 000 0003', 'al_dia',    true),
  ('Samuel Ortiz Vega',     7,  'Fútbol',           'Infantil',     'Andrea Vega',    '300 000 0004', 'vencido',   true),

  ('Isabella Rojas Peña',   11, 'Guitarra',         'Principiante', 'Julián Rojas',   '300 000 0005', 'al_dia',    true),
  ('Daniel Herrera Lugo',   16, 'Guitarra',         'Intermedio',   'Patricia Lugo',  '300 000 0006', 'pendiente', true),
  ('Camilo Vargas Soto',    28, 'Guitarra',         'Adultos',      null,             '300 000 0007', 'al_dia',    true),

  ('Sofía Martínez León',   8,  'Danza folclórica', 'Infantil',     'Diana León',     '300 000 0008', 'al_dia',    true),
  ('Laura Jiménez Cruz',    14, 'Danza folclórica', 'Juvenil',      'Hernán Jiménez', '300 000 0009', 'vencido',   true),

  ('Andrés Fuentes Mejía',  10, 'Danza folclórica', 'Infantil',     'Rosa Mejía',     '300 000 0010', 'al_dia',   false)
) as v (nombre_completo, edad, disciplina, categoria,
        acudiente_nombre, acudiente_telefono, estado_pago, activo)
join public.disciplinas d on d.nombre = v.disciplina
where not exists (
  select 1
  from public.estudiantes e
  where e.nombre_completo = v.nombre_completo
);


-- Catálogo que ve el público, con la tarifa mensual en pesos colombianos.
insert into public.servicios
  (nombre, descripcion, precio_mensual, disciplina_id, destacado, orden)
select
  v.nombre, v.descripcion, v.precio_mensual, d.id, v.destacado, v.orden
from (values
  ('Fútbol Infantil',      'Para niñas y niños de 5 a 9 años. Dos entrenamientos por semana y partido los sábados.',  70000,  'Fútbol',           false, 1),
  ('Fútbol Competencia',   'Categorías Sub-12 y Sub-15. Tres entrenamientos por semana y torneo intercolegiado.',     95000,  'Fútbol',           true,  2),
  ('Guitarra Grupal',      'Grupos de hasta seis personas. Una clase semanal de hora y media.',                        90000,  'Guitarra',         false, 3),
  ('Guitarra Personalizada','Clase individual de una hora por semana, con plan de estudio propio.',                   130000, 'Guitarra',         false, 4),
  ('Danza Folclórica',     'Bambuco, cumbia y mapalé. Dos clases por semana y muestra al final del semestre.',        85000,  'Danza folclórica', false, 5)
) as v (nombre, descripcion, precio_mensual, disciplina, destacado, orden)
join public.disciplinas d on d.nombre = v.disciplina
where not exists (
  select 1
  from public.servicios s
  where s.nombre = v.nombre
);
