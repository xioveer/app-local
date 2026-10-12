-- =====================================================================
-- schema.sql  ·  Estructura de la base de datos (Supabase / PostgreSQL)
-- =====================================================================
-- CÓMO USARLO:
--   Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   Es seguro ejecutarlo más de una vez: no borra tablas ni datos.
--
-- ANTES DE USAR LA APP (importante para la seguridad):
--   1. Authentication → Sign In / Providers → desactivar
--      "Allow new users to sign up".
--      Las políticas de este archivo dejan entrar a CUALQUIER usuario
--      autenticado. Si los registros públicos siguen abiertos, cualquier
--      persona podría crearse una cuenta y leer o modificar todo.
--   2. Crear a mano el usuario administrador:
--      Authentication → Users → Add user → Create new user
--      (correo + contraseña, marcando "Auto Confirm User").
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLA: disciplinas
--    Cada academia define las suyas (fútbol, guitarra, danza, pintura...).
-- ---------------------------------------------------------------------
create table if not exists public.disciplinas (
  id         bigint generated always as identity primary key,
  nombre     text        not null unique,          -- no se repiten nombres
  creado_en  timestamptz not null default now(),

  -- Evita nombres vacíos o formados solo por espacios.
  constraint disciplinas_nombre_no_vacio check (length(trim(nombre)) > 0)
);


-- ---------------------------------------------------------------------
-- 2. TABLA: estudiantes
--    "activo = false" es el borrado lógico: el registro se conserva
--    (con su historial de asistencia) pero deja de mostrarse.
-- ---------------------------------------------------------------------
create table if not exists public.estudiantes (
  id                  bigint generated always as identity primary key,
  nombre_completo     text        not null,
  edad                integer     not null,
  disciplina_id       bigint      not null references public.disciplinas (id),
  categoria           text,                        -- texto libre: "Infantil", "Sub-12", "Principiante"
  acudiente_nombre    text,                        -- opcional (hay estudiantes adultos)
  acudiente_telefono  text,                        -- opcional
  estado_pago         text        not null default 'al_dia',
  activo              boolean     not null default true,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),

  constraint estudiantes_nombre_no_vacio check (length(trim(nombre_completo)) > 0),
  constraint estudiantes_edad_valida     check (edad between 3 and 99),
  constraint estudiantes_estado_pago_valido
    check (estado_pago in ('al_dia', 'pendiente', 'vencido'))
);

-- Función que pone la fecha y hora actual en "actualizado_en"
-- cada vez que se modifica un estudiante.
create or replace function public.actualizar_fecha_modificacion()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- Trigger: ejecuta la función anterior antes de cada UPDATE.
drop trigger if exists trg_estudiantes_actualizado_en on public.estudiantes;
create trigger trg_estudiantes_actualizado_en
  before update on public.estudiantes
  for each row
  execute function public.actualizar_fecha_modificacion();


-- ---------------------------------------------------------------------
-- 3. TABLA: asistencias
--    Un registro por estudiante y por día.
-- ---------------------------------------------------------------------
create table if not exists public.asistencias (
  id             bigint generated always as identity primary key,
  -- ON DELETE CASCADE: si se borra un estudiante, se borra su asistencia.
  estudiante_id  bigint      not null references public.estudiantes (id) on delete cascade,
  -- OJO: current_date usa la hora UTC del servidor. La app siempre envía
  -- la fecha explícita (calculada con la hora del navegador), así que este
  -- valor por defecto solo aplica si se inserta a mano desde el SQL Editor.
  fecha          date        not null default current_date,
  asistio        boolean     not null,
  creado_en      timestamptz not null default now(),

  -- Impide dos registros del mismo estudiante en el mismo día.
  -- También es lo que permite hacer "upsert" desde la app.
  constraint asistencias_un_registro_por_dia unique (estudiante_id, fecha)
);


-- ---------------------------------------------------------------------
-- 4. ÍNDICES
--    Aceleran las consultas más frecuentes de la app.
--    (El UNIQUE de asistencias ya crea un índice sobre estudiante_id + fecha.)
-- ---------------------------------------------------------------------
create index if not exists idx_estudiantes_disciplina on public.estudiantes (disciplina_id);
create index if not exists idx_estudiantes_activo     on public.estudiantes (activo);
create index if not exists idx_asistencias_fecha      on public.asistencias (fecha);


-- ---------------------------------------------------------------------
-- 5. SEGURIDAD: Row Level Security (RLS)
--    Con RLS activado y SIN política para un rol, ese rol no ve ni
--    modifica nada. La app sin sesión usa el rol "anon" y queda bloqueada.
--    Con sesión iniciada usa el rol "authenticated" y la política le
--    permite leer y escribir.
-- ---------------------------------------------------------------------
alter table public.disciplinas enable row level security;
alter table public.estudiantes enable row level security;
alter table public.asistencias enable row level security;

-- Se borran y se vuelven a crear para poder ejecutar el script varias veces.
drop policy if exists "Autenticados gestionan disciplinas" on public.disciplinas;
drop policy if exists "Autenticados gestionan estudiantes" on public.estudiantes;
drop policy if exists "Autenticados gestionan asistencias" on public.asistencias;

-- using      → qué filas puede LEER / MODIFICAR / BORRAR
-- with check → qué filas puede INSERTAR / dejar tras un UPDATE
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


-- ---------------------------------------------------------------------
-- 6. PERMISOS (segundo candado, además de RLS)
--    RLS decide QUÉ FILAS ve cada rol; GRANT/REVOKE decide si el rol puede
--    siquiera tocar la tabla. Así, "anon" queda bloqueado por dos lados.
-- ---------------------------------------------------------------------
revoke all on public.disciplinas from anon;
revoke all on public.estudiantes from anon;
revoke all on public.asistencias from anon;

grant select, insert, update, delete on public.disciplinas to authenticated;
grant select, insert, update, delete on public.estudiantes to authenticated;
grant select, insert, update, delete on public.asistencias to authenticated;
