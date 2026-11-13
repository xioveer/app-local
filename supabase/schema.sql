
-- Desactiva el registro público en Supabase: las políticas dan acceso completo
-- a cualquier usuario autenticado.
create table if not exists public.disciplinas (
  id         bigint generated always as identity primary key,
  nombre     text        not null unique,
  creado_en  timestamptz not null default now(),

  constraint disciplinas_nombre_no_vacio check (length(trim(nombre)) > 0)
);


create table if not exists public.estudiantes (
  id                  bigint generated always as identity primary key,
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
    check (estado_pago in ('al_dia', 'pendiente', 'vencido'))
);

alter table public.estudiantes drop constraint if exists estudiantes_acudiente_menores;
alter table public.estudiantes add constraint estudiantes_acudiente_menores check (
  edad >= 18
  or (
    nullif(trim(acudiente_nombre), '') is not null
    and nullif(trim(acudiente_telefono), '') is not null
  )
);

create or replace function public.actualizar_fecha_modificacion()
returns trigger
language plpgsql
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
  estudiante_id  bigint      not null references public.estudiantes (id) on delete cascade,
  fecha          date        not null default current_date,
  asistio        boolean     not null,
  creado_en      timestamptz not null default now(),

  constraint asistencias_un_registro_por_dia unique (estudiante_id, fecha)
);


create index if not exists idx_estudiantes_disciplina on public.estudiantes (disciplina_id);
create index if not exists idx_estudiantes_activo     on public.estudiantes (activo);
create index if not exists idx_asistencias_fecha      on public.asistencias (fecha);


alter table public.disciplinas enable row level security;
alter table public.estudiantes enable row level security;
alter table public.asistencias enable row level security;

drop policy if exists "Autenticados gestionan disciplinas" on public.disciplinas;
drop policy if exists "Autenticados gestionan estudiantes" on public.estudiantes;
drop policy if exists "Autenticados gestionan asistencias" on public.asistencias;

drop policy if exists "Anónimos gestionan disciplinas" on public.disciplinas;
drop policy if exists "Anónimos gestionan estudiantes" on public.estudiantes;
drop policy if exists "Anónimos gestionan asistencias" on public.asistencias;

create policy "Autenticados gestionan disciplinas"
  on public.disciplinas
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Autenticados gestionan estudiantes"
  on public.estudiantes
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Autenticados gestionan asistencias"
  on public.asistencias
  for all
  to authenticated
  using (true)
  with check (true);


revoke all on public.disciplinas from anon;
revoke all on public.estudiantes from anon;
revoke all on public.asistencias from anon;

grant select, insert, update, delete on public.disciplinas to authenticated;
grant select, insert, update, delete on public.estudiantes to authenticated;
grant select, insert, update, delete on public.asistencias to authenticated;
