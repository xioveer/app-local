-- =====================================================================
-- modo_con_login.sql  ·  CIERRA la base de datos al rol anónimo
-- =====================================================================
-- Deshace lo que hizo supabase/modo_sin_login.sql: el rol anónimo (sin sesión)
-- deja de poder leer o escribir. Solo los usuarios con sesión iniciada
-- (rol "authenticated") siguen teniendo acceso, como define schema.sql.
--
-- OJO: la aplicación actual no tiene inicio de sesión. Después de ejecutar este
-- archivo los datos quedan guardados y protegidos, pero la aplicación mostrará
-- «La base de datos no permite el acceso» hasta que vuelvas a ejecutar
-- modo_sin_login.sql. Úsalo para cerrar la base al terminar una demostración.
--
-- CÓMO USARLO:
--   Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
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
