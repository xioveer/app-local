-- =====================================================================
-- rls_por_rol.sql · PROPUESTA (no aplicada a ninguna base real)
-- Reparte permisos según el rol guardado en app_metadata del usuario:
--   admin    → todo
--   profesor → ve todo, y solo registra/corrige asistencia (no borra, no edita estudiantes)
--   sin rol  → no ve nada (aunque tenga sesión)
-- El rol se asigna a mano en Supabase → Authentication → Users → (usuario) → "app_metadata"
--   ejemplo:  { "rol": "profesor" }
-- NUNCA uses user_metadata para esto: lo puede editar el propio usuario.
-- =====================================================================

-- 1) Quitar la política "todo autenticado". Si se deja, se SUMA a las nuevas
--    (las políticas permisivas se combinan con OR) y el control por rol no sirve de nada.
drop policy if exists "Autenticados gestionan disciplinas" on public.disciplinas;
drop policy if exists "Autenticados gestionan estudiantes" on public.estudiantes;
drop policy if exists "Autenticados gestionan asistencias" on public.asistencias;

drop policy if exists "Admin gestiona disciplinas"  on public.disciplinas;
drop policy if exists "Admin gestiona estudiantes"  on public.estudiantes;
drop policy if exists "Admin gestiona asistencias"  on public.asistencias;
drop policy if exists "Profesor ve disciplinas"     on public.disciplinas;
drop policy if exists "Profesor ve estudiantes"     on public.estudiantes;
drop policy if exists "Profesor ve asistencias"     on public.asistencias;
drop policy if exists "Profesor registra asistencias" on public.asistencias;
drop policy if exists "Profesor corrige asistencias"  on public.asistencias;

-- 2) El administrador puede todo.
--    "(select ...)" hace que Postgres evalúe el rol una vez por consulta y no por fila.
create policy "Admin gestiona disciplinas" on public.disciplinas for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "Admin gestiona estudiantes" on public.estudiantes for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "Admin gestiona asistencias" on public.asistencias for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- 3) El profesor: lee todo; en asistencias además inserta y corrige (no borra).
create policy "Profesor ve disciplinas" on public.disciplinas for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor');
create policy "Profesor ve estudiantes" on public.estudiantes for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor');
create policy "Profesor ve asistencias" on public.asistencias for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor');
create policy "Profesor registra asistencias" on public.asistencias for insert to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor');
create policy "Profesor corrige asistencias" on public.asistencias for update to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'profesor');
