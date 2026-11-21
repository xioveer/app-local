create table if not exists public.disciplinas (
  id           bigint generated always as identity primary key,
  profesor_id  uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  nombre       text        not null,
  creado_en    timestamptz not null default now(),

  constraint disciplinas_nombre_no_vacio check (length(trim(nombre)) > 0),
  constraint disciplinas_nombre_unico_por_profesor unique (profesor_id, nombre)
);


create table if not exists public.estudiantes (
  id                  bigint generated always as identity primary key,
  profesor_id         uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  nombre_completo     text        not null,
  edad                integer     not null,
  disciplina_id       bigint      not null references public.disciplinas (id),
  categoria           text,
  acudiente_nombre    text,
  acudiente_telefono  text,
  estado_pago         text        not null default 'al_dia',
  activo              boolean     not null default true,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),

  constraint estudiantes_nombre_no_vacio check (length(trim(nombre_completo)) > 0),
  constraint estudiantes_edad_valida     check (edad between 3 and 99),
  constraint estudiantes_estado_pago_valido
    check (estado_pago in ('al_dia', 'pendiente', 'vencido')),
  constraint estudiantes_acudiente_menores check (
    edad >= 18
    or (
      nullif(trim(acudiente_nombre), '') is not null
      and nullif(trim(acudiente_telefono), '') is not null
    )
  )
);

create or replace function public.actualizar_fecha_modificacion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists trg_estudiantes_actualizado_en on public.estudiantes;
create trigger trg_estudiantes_actualizado_en
  before update on public.estudiantes
  for each row
  execute function public.actualizar_fecha_modificacion();


create table if not exists public.asistencias (
  id             bigint generated always as identity primary key,
  profesor_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  estudiante_id  bigint      not null references public.estudiantes (id) on delete cascade,
  fecha          date        not null default current_date,
  asistio        boolean     not null,
  creado_en      timestamptz not null default now(),

  constraint asistencias_un_registro_por_dia unique (estudiante_id, fecha)
);


create index if not exists idx_disciplinas_profesor on public.disciplinas (profesor_id);
create index if not exists idx_estudiantes_profesor on public.estudiantes (profesor_id);
create index if not exists idx_estudiantes_disciplina on public.estudiantes (disciplina_id);
create index if not exists idx_asistencias_profesor_fecha on public.asistencias (profesor_id, fecha);


alter table public.disciplinas enable row level security;
alter table public.estudiantes enable row level security;
alter table public.asistencias enable row level security;

drop policy if exists "Cada profesor gestiona sus disciplinas" on public.disciplinas;
drop policy if exists "Cada profesor gestiona sus estudiantes" on public.estudiantes;
drop policy if exists "Cada profesor gestiona sus asistencias" on public.asistencias;

create policy "Cada profesor gestiona sus disciplinas"
  on public.disciplinas for all to authenticated
  using (profesor_id = (select auth.uid()))
  with check (profesor_id = (select auth.uid()));

create policy "Cada profesor gestiona sus estudiantes"
  on public.estudiantes for all to authenticated
  using (profesor_id = (select auth.uid()))
  with check (
    profesor_id = (select auth.uid())
    and exists (
      select 1 from public.disciplinas d
      where d.id = disciplina_id and d.profesor_id = (select auth.uid())
    )
  );

create policy "Cada profesor gestiona sus asistencias"
  on public.asistencias for all to authenticated
  using (profesor_id = (select auth.uid()))
  with check (
    profesor_id = (select auth.uid())
    and exists (
      select 1 from public.estudiantes e
      where e.id = estudiante_id and e.profesor_id = (select auth.uid())
    )
  );


revoke all on public.disciplinas from anon;
revoke all on public.estudiantes from anon;
revoke all on public.asistencias from anon;

grant select, insert, update, delete on public.disciplinas to authenticated;
grant select, insert, update, delete on public.estudiantes to authenticated;
grant select, insert, update, delete on public.asistencias to authenticated;
