alter table public.estudiantes drop constraint if exists estudiantes_longitudes;
alter table public.estudiantes add constraint estudiantes_longitudes check (
      char_length(nombre_completo)                 <= 100
  and char_length(coalesce(categoria, ''))          <= 50
  and char_length(coalesce(acudiente_nombre, ''))   <= 100
  and char_length(coalesce(acudiente_telefono, '')) <= 25
);

create or replace function public.rechazar_asistencia_futura()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.fecha > current_date + 1 then
    raise exception 'No se puede registrar asistencia de una fecha futura (%).', new.fecha
      using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists trg_asistencias_no_futuras on public.asistencias;
create trigger trg_asistencias_no_futuras
  before insert or update on public.asistencias
  for each row execute function public.rechazar_asistencia_futura();

create extension if not exists unaccent with schema extensions;

create or replace function public.sin_tildes(texto text)
returns text language sql immutable parallel safe set search_path = '' as
$$ select extensions.unaccent('extensions.unaccent'::regdictionary, texto) $$;

create unique index if not exists disciplinas_nombre_unico_normalizado
  on public.disciplinas (lower(public.sin_tildes(nombre)));
