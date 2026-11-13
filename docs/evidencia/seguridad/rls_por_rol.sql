-- Propuesta, no aplicada. Asigna los roles solo en app_metadata, nunca en
-- user_metadata, que el usuario puede modificar.
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

create policy "Admin gestiona disciplinas" on public.disciplinas for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "Admin gestiona estudiantes" on public.estudiantes for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "Admin gestiona asistencias" on public.asistencias for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

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
