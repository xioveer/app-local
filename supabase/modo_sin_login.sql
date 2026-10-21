-- =====================================================================
-- modo_sin_login.sql  ·  ABRE la base de datos para usar la app SIN iniciar sesión
-- =====================================================================
-- ⚠  ADVERTENCIA: LEE ESTO ANTES DE EJECUTARLO
--
--   Este script permite que el rol ANÓNIMO (el que usa la anon key, sin sesión)
--   pueda leer, crear, modificar y BORRAR todo en las tres tablas.
--
--   La anon key es PÚBLICA: cualquiera que abra tu página puede verla. Por lo tanto,
--   mientras este modo esté activo, CUALQUIER PERSONA que conozca la dirección de tu
--   proyecto de Supabase puede ver y cambiar todos los datos (nombres, edades y
--   teléfonos de acudientes incluidos).
--
--   Úsalo SOLO:
--     · temporalmente (por ejemplo, mientras desarrollas o ensayas),
--     · en tu computador,
--     · con datos de PRUEBA (no con datos reales de estudiantes).
--   Y NO publiques la página en Internet mientras esté activo.
--
-- CÓMO USARLO:
--   1. Ejecuta antes supabase/schema.sql (aquí se asume que las tablas ya existen).
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. En tu config.js pon:  const REQUIERE_INICIO_DE_SESION = false;
--   4. Recarga la aplicación: entra directo, sin login.
--
-- PARA VOLVER A LO SEGURO:
--   1. Ejecuta supabase/modo_con_login.sql
--   2. En tu config.js pon:  const REQUIERE_INICIO_DE_SESION = true;
--   (Volver a ejecutar schema.sql completo también cierra la base, pero se recomienda
--    usar modo_con_login.sql, que está hecho justo para eso.)
--
-- Es seguro ejecutarlo más de una vez. RLS sigue ACTIVADO; solo se agregan
-- políticas para el rol "anon". Las restricciones (CHECK, UNIQUE, claves foráneas)
-- siguen aplicando igual.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Políticas: el rol anónimo puede hacer todo (leer, crear, modificar, borrar)
--    Se borran y se vuelven a crear para poder ejecutar el script varias veces.
-- ---------------------------------------------------------------------
drop policy if exists "Anónimos gestionan disciplinas" on public.disciplinas;
drop policy if exists "Anónimos gestionan estudiantes" on public.estudiantes;
drop policy if exists "Anónimos gestionan asistencias" on public.asistencias;

create policy "Anónimos gestionan disciplinas"
  on public.disciplinas
  for all
  to anon
  using (true)
  with check (true);

create policy "Anónimos gestionan estudiantes"
  on public.estudiantes
  for all
  to anon
  using (true)
  with check (true);

create policy "Anónimos gestionan asistencias"
  on public.asistencias
  for all
  to anon
  using (true)
  with check (true);


-- ---------------------------------------------------------------------
-- 2. Permisos: schema.sql se los quitó al rol anónimo; aquí se le devuelven.
--    (Las políticas de arriba no sirven si el rol no puede ni tocar la tabla.)
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.disciplinas to anon;
grant select, insert, update, delete on public.estudiantes to anon;
grant select, insert, update, delete on public.asistencias to anon;
