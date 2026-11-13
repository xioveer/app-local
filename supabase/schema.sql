-- =====================================================================
-- schema.sql · Estructura y seguridad de la base de datos
-- =====================================================================
-- Supabase → SQL Editor → New query → pegar todo → Run.
-- Es seguro ejecutarlo varias veces: no borra datos.
--
-- Deja la base SEGURA:
--   · El público (rol anon) solo ve disciplinas y servicios, y puede
--     enviar un mensaje de contacto. No ve ni toca estudiantes.
--   · Los datos de la academia exigen una sesión iniciada Y estar
--     registrado en la tabla administradores (ver administrador.sql).
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

-- search_path fijo: una función sin él puede ejecutar tablas de otro esquema.
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


-- Catálogo que se muestra en la página pública, con su tarifa mensual.
create table if not exists public.servicios (
  id              bigint generated always as identity primary key,
  nombre          text        not null,
  descripcion     text,
  precio_mensual  integer     not null,
  disciplina_id   bigint      references public.disciplinas (id) on delete set null,
  destacado       boolean     not null default false,
  activo          boolean     not null default true,
  orden           integer     not null default 0,
  creado_en       timestamptz not null default now(),

  constraint servicios_nombre_no_vacio check (length(trim(nombre)) between 2 and 80),
  constraint servicios_precio_valido   check (precio_mensual between 0 and 100000000),
  constraint servicios_descripcion_corta check (descripcion is null or length(descripcion) <= 300)
);


-- Formulario de contacto. Los límites de longitud evitan que alguien
-- llene la base con un mensaje enorme, porque cualquiera puede escribir aquí.
create table if not exists public.mensajes (
  id           bigint generated always as identity primary key,
  nombre       text        not null,
  telefono     text,
  correo       text,
  mensaje      text        not null,
  servicio_id  bigint      references public.servicios (id) on delete set null,
  leido        boolean     not null default false,
  creado_en    timestamptz not null default now(),

  constraint mensajes_nombre_valido   check (length(trim(nombre)) between 2 and 100),
  constraint mensajes_mensaje_valido  check (length(trim(mensaje)) between 10 and 1000),
  constraint mensajes_telefono_valido check (telefono is null or length(telefono) <= 25),
  constraint mensajes_correo_valido   check (correo is null or length(correo) <= 120),
  -- Sin teléfono ni correo no hay forma de responderle a la persona.
  constraint mensajes_contacto_minimo check (
    nullif(trim(telefono), '') is not null or nullif(trim(correo), '') is not null
  )
);


-- Quién puede entrar al panel. Esta tabla no se toca desde la aplicación:
-- solo desde el SQL Editor (ver administrador.sql). Es importante porque
-- este proyecto de Supabase puede tener usuarios de otras aplicaciones.
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
create index if not exists idx_servicios_orden        on public.servicios (activo, orden);
create index if not exists idx_mensajes_recientes     on public.mensajes (creado_en desc);


-- ---------------------------------------------------------------------
-- 3. ¿QUIÉN ES ADMINISTRADOR?
--    security definer: la función puede leer la tabla administradores
--    aunque quien pregunta no tenga permiso para leerla.
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
-- ---------------------------------------------------------------------

alter table public.disciplinas     enable row level security;
alter table public.estudiantes     enable row level security;
alter table public.asistencias     enable row level security;
alter table public.servicios       enable row level security;
alter table public.mensajes        enable row level security;
alter table public.administradores enable row level security;

-- Políticas de versiones anteriores (daban acceso total a cualquiera).
drop policy if exists "Autenticados gestionan disciplinas" on public.disciplinas;
drop policy if exists "Autenticados gestionan estudiantes" on public.estudiantes;
drop policy if exists "Autenticados gestionan asistencias" on public.asistencias;
drop policy if exists "Anónimos gestionan disciplinas"     on public.disciplinas;
drop policy if exists "Anónimos gestionan estudiantes"     on public.estudiantes;
drop policy if exists "Anónimos gestionan asistencias"     on public.asistencias;

drop policy if exists "Público ve disciplinas"             on public.disciplinas;
drop policy if exists "Administrador gestiona disciplinas" on public.disciplinas;
drop policy if exists "Administrador gestiona estudiantes" on public.estudiantes;
drop policy if exists "Administrador gestiona asistencias" on public.asistencias;
drop policy if exists "Público ve servicios activos"       on public.servicios;
drop policy if exists "Administrador gestiona servicios"   on public.servicios;
drop policy if exists "Cualquiera envía un mensaje"        on public.mensajes;
drop policy if exists "Administrador gestiona mensajes"    on public.mensajes;

-- Disciplinas y servicios: son el catálogo, se ven sin iniciar sesión.
create policy "Público ve disciplinas"
  on public.disciplinas for select to anon, authenticated
  using (true);

create policy "Público ve servicios activos"
  on public.servicios for select to anon, authenticated
  using (activo);

-- Contacto: cualquiera puede escribir, nadie puede leer salvo el administrador.
create policy "Cualquiera envía un mensaje"
  on public.mensajes for insert to anon, authenticated
  with check (true);

-- Todo lo demás exige ser administrador.
create policy "Administrador gestiona disciplinas"
  on public.disciplinas for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy "Administrador gestiona servicios"
  on public.servicios for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy "Administrador gestiona mensajes"
  on public.mensajes for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy "Administrador gestiona estudiantes"
  on public.estudiantes for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy "Administrador gestiona asistencias"
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
revoke all on public.servicios       from anon;
revoke all on public.mensajes        from anon;
revoke all on public.administradores from anon, authenticated;

grant select on public.disciplinas to anon;
grant select on public.servicios   to anon;
grant insert on public.mensajes    to anon;

grant select, insert, update, delete on public.disciplinas to authenticated;
grant select, insert, update, delete on public.estudiantes to authenticated;
grant select, insert, update, delete on public.asistencias to authenticated;
grant select, insert, update, delete on public.servicios   to authenticated;
grant select, insert, update, delete on public.mensajes    to authenticated;
