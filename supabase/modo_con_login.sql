-- =====================================================================
-- modo_con_login.sql  ·  CIERRA la base de datos: vuelve a exigir inicio de sesión
-- =====================================================================
-- Deshace lo que hizo supabase/modo_sin_login.sql: el rol anónimo (sin sesión)
-- deja de poder leer o escribir. Solo los usuarios con sesión iniciada
-- (rol "authenticated") siguen teniendo acceso, como define schema.sql.
--
-- CÓMO USARLO:
--   1. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   2. En tu config.js pon:  const REQUIERE_INICIO_DE_SESION = true;
--   3. Recarga la aplicación: vuelve a pedir correo y contraseña.
--
-- Es seguro ejecutarlo varias veces, y también si nunca ejecutaste modo_sin_login.sql.
-- No borra ningún dato.
-- =====================================================================

-- Se eliminan las políticas que permitían acceso anónimo...
drop policy if exists "Anónimos gestionan disciplinas" on public.disciplinas;
drop policy if exists "Anónimos gestionan estudiantes" on public.estudiantes;
drop policy if exists "Anónimos gestionan asistencias" on public.asistencias;

-- ...y se le quitan al rol anónimo los permisos sobre las tablas (segundo candado).
revoke all on public.disciplinas from anon;
revoke all on public.estudiantes from anon;
revoke all on public.asistencias from anon;
