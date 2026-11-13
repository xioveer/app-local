
drop policy if exists "Anónimos gestionan disciplinas" on public.disciplinas;
drop policy if exists "Anónimos gestionan estudiantes" on public.estudiantes;
drop policy if exists "Anónimos gestionan asistencias" on public.asistencias;

revoke all on public.disciplinas from anon;
revoke all on public.estudiantes from anon;
revoke all on public.asistencias from anon;
