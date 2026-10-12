-- =====================================================================
-- seed.sql  ·  Datos de PRUEBA (todos ficticios)
-- =====================================================================
-- CÓMO USARLO:
--   Supabase → SQL Editor → New query → pegar este archivo → Run.
--   Ejecutar DESPUÉS de schema.sql.
--   Es seguro ejecutarlo más de una vez: no duplica disciplinas ni
--   estudiantes que ya existan (compara por nombre).
--
-- NOTA: el SQL Editor se ejecuta con un rol administrador, por eso estos
-- INSERT funcionan aunque RLS esté activado. La app, en cambio, solo
-- puede escribir si hay una sesión iniciada.
--
-- CONTENIDO: 3 disciplinas y 10 estudiantes (9 activos y 1 inactivo).
--   Con los 9 activos el dashboard debería mostrar:
--   5 al día · 2 pendientes · 2 vencidos.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Disciplinas
--    "on conflict do nothing": si el nombre ya existe, se omite.
-- ---------------------------------------------------------------------
insert into public.disciplinas (nombre) values
  ('Fútbol'),
  ('Guitarra'),
  ('Danza folclórica')
on conflict (nombre) do nothing;


-- ---------------------------------------------------------------------
-- 2. Estudiantes
--    Se escribe el NOMBRE de la disciplina y el JOIN busca su id.
--    "where not exists": si ya hay un estudiante con ese nombre, se omite.
-- ---------------------------------------------------------------------
insert into public.estudiantes
  (nombre_completo, edad, disciplina_id, categoria,
   acudiente_nombre, acudiente_telefono, estado_pago, activo)
select
  v.nombre_completo, v.edad, d.id, v.categoria,
  v.acudiente_nombre, v.acudiente_telefono, v.estado_pago, v.activo
from (values
  -- Fútbol
  ('Santiago Pérez Mora',   9,  'Fútbol',           'Infantil',     'Marta Mora',     '300 000 0001', 'al_dia',    true),
  ('Mateo Gómez Ruiz',      12, 'Fútbol',           'Sub-12',       'Carlos Gómez',   '300 000 0002', 'pendiente', true),
  ('Valentina Castro Díaz', 15, 'Fútbol',           'Sub-15',       'Luz Díaz',       '300 000 0003', 'al_dia',    true),
  ('Samuel Ortiz Vega',     7,  'Fútbol',           'Infantil',     'Andrea Vega',    '300 000 0004', 'vencido',   true),

  -- Guitarra
  ('Isabella Rojas Peña',   11, 'Guitarra',         'Principiante', 'Julián Rojas',   '300 000 0005', 'al_dia',    true),
  ('Daniel Herrera Lugo',   16, 'Guitarra',         'Intermedio',   'Patricia Lugo',  '300 000 0006', 'pendiente', true),
  -- Estudiante adulto: sin acudiente (el campo es opcional).
  ('Camilo Vargas Soto',    28, 'Guitarra',         'Adultos',      null,             '300 000 0007', 'al_dia',    true),

  -- Danza folclórica
  ('Sofía Martínez León',   8,  'Danza folclórica', 'Infantil',     'Diana León',     '300 000 0008', 'al_dia',    true),
  ('Laura Jiménez Cruz',    14, 'Danza folclórica', 'Juvenil',      'Hernán Jiménez', '300 000 0009', 'vencido',   true),

  -- Estudiante INACTIVO (retirado): sirve para probar "Mostrar inactivos".
  ('Andrés Fuentes Mejía',  10, 'Danza folclórica', 'Infantil',     'Rosa Mejía',     '300 000 0010', 'al_dia',    false)
) as v (nombre_completo, edad, disciplina, categoria,
        acudiente_nombre, acudiente_telefono, estado_pago, activo)
join public.disciplinas d on d.nombre = v.disciplina
where not exists (
  select 1
  from public.estudiantes e
  where e.nombre_completo = v.nombre_completo
);
