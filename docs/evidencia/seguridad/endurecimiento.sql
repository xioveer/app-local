-- =====================================================================
-- endurecimiento.sql · MEJORAS OPCIONALES (propuestas en la auditoría)
-- Se pueden ejecutar varias veces. Probado en PostgreSQL 16 (con un esquema
-- "extensions" imitando el de Supabase).
-- =====================================================================

-- H1. Límites de longitud: la base ya no acepta un "nombre" de 5 MB.
alter table public.estudiantes drop constraint if exists estudiantes_longitudes;
alter table public.estudiantes add constraint estudiantes_longitudes check (
      char_length(nombre_completo)                 <= 100
  and char_length(coalesce(categoria, ''))          <= 50
  and char_length(coalesce(acudiente_nombre, ''))   <= 100
  and char_length(coalesce(acudiente_telefono, '')) <= 25
);

-- H2. Nada de asistencias del futuro (la regla ya existía, pero solo en el navegador).
--     "+ 1 día" de margen: un navegador en un huso horario adelantado ya está en "mañana".
create or replace function public.rechazar_asistencia_futura()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.fecha > current_date + 1 then
    raise exception 'No se puede registrar asistencia de una fecha futura (%).', new.fecha
      using errcode = '23514';   -- el mismo código que un CHECK: la app ya lo traduce
  end if;
  return new;
end $$;

drop trigger if exists trg_asistencias_no_futuras on public.asistencias;
create trigger trg_asistencias_no_futuras
  before insert or update on public.asistencias
  for each row execute function public.rechazar_asistencia_futura();

-- H3. "Fútbol", "FÚTBOL" y "futbol" son la MISMA disciplina.
create extension if not exists unaccent with schema extensions;

create or replace function public.sin_tildes(texto text)
returns text language sql immutable parallel safe set search_path = '' as
$$ select extensions.unaccent('extensions.unaccent'::regdictionary, texto) $$;

create unique index if not exists disciplinas_nombre_unico_normalizado
  on public.disciplinas (lower(public.sin_tildes(nombre)));
