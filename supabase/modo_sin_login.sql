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

grant select, insert, update, delete on public.disciplinas to anon;
grant select, insert, update, delete on public.estudiantes to anon;
grant select, insert, update, delete on public.asistencias to anon;
