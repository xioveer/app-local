-- =====================================================================
-- schema.sql · Estructura y seguridad de la base de datos
-- =====================================================================
-- Supabase → SQL Editor → New query → pegar todo → Run.
-- Es seguro ejecutarlo varias veces: no borra datos.
--
-- Deja la base CERRADA: no se puede leer ni escribir nada sin haber
-- iniciado sesión Y estar registrado en la tabla administradores
-- (ver administrador.sql). Los datos de los estudiantes y de sus
-- acudientes no son visibles para nadie más.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

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

-- search_path fijo: una función sin él puede acabar usando tablas de otro esquema.
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
  estudiante_id  bigint      not null references public.estudiantes (id) on delete cascade,
  fecha          date        not null default current_date,
  asistio        boolean     not null,
  creado_en      timestamptz not null default now(),

  constraint asistencias_un_registro_por_dia unique (estudiante_id, fecha)
);


-- Quién puede entrar al panel. Esta tabla no se toca desde la aplicación:
-- solo desde el SQL Editor (ver administrador.sql).
create table if not exists public.administradores (
  usuario_id  uuid        primary key references auth.users (id) on delete cascade,
  nombre      text,
  creado_en   timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. ÍNDICES
-- ---------------------------------------------------------------------

create index if not exists idx_estudiantes_disciplina on public.estudiantes (disciplina_id);
create index if not exists idx_estudiantes_activo     on public.estudiantes (activo);
create index if not exists idx_asistencias_fecha      on public.asistencias (fecha);


-- ---------------------------------------------------------------------
-- 3. ¿QUIÉN PUEDE ENTRAR?
--    security definer: la función lee la tabla administradores aunque
--    quien pregunta no tenga permiso para leerla.
-- ---------------------------------------------------------------------

create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.administradores where usuario_id = auth.uid()
  );
$$;

revoke execute on function public.es_administrador() from public, anon;
grant execute on function public.es_administrador() to authenticated;


-- ---------------------------------------------------------------------
-- 4. SEGURIDAD: Row Level Security
--    Con RLS activado y sin política para un rol, ese rol no puede nada.
--    Aquí no hay ninguna política para el rol anónimo: sin sesión, nada.
-- ---------------------------------------------------------------------

alter table public.disciplinas     enable row level security;
alter table public.estudiantes     enable row level security;
alter table public.asistencias     enable row level security;
alter table public.administradores enable row level security;

drop policy if exists "Profesor gestiona disciplinas" on public.disciplinas;
drop policy if exists "Profesor gestiona estudiantes" on public.estudiantes;
drop policy if exists "Profesor gestiona asistencias" on public.asistencias;

create policy "Profesor gestiona disciplinas"
  on public.disciplinas for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy "Profesor gestiona estudiantes"
  on public.estudiantes for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy "Profesor gestiona asistencias"
  on public.asistencias for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

-- La tabla administradores no tiene ninguna política: nadie la lee ni la
-- escribe desde la aplicación. Solo el SQL Editor y es_administrador().


-- ---------------------------------------------------------------------
-- 5. PERMISOS (segundo candado, además de RLS)
--    RLS decide qué filas; GRANT decide si el rol puede tocar la tabla.
-- ---------------------------------------------------------------------

revoke all on public.disciplinas     from anon;
revoke all on public.estudiantes     from anon;
revoke all on public.asistencias     from anon;
revoke all on public.administradores from anon, authenticated;

grant select, insert, update, delete on public.disciplinas to authenticated;
grant select, insert, update, delete on public.estudiantes to authenticated;
grant select, insert, update, delete on public.asistencias to authenticated;
