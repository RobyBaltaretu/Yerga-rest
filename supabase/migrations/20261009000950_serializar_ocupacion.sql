-- =============================================================================
-- Ocupación de mesas sin interbloqueos.
--
-- Dos inserciones simultáneas que chocan en una restricción de exclusión pueden esperarse
-- la una a la otra: cada una ve la fila sin confirmar de la otra y PostgreSQL aborta una
-- con «deadlock detected». Pasaba cuando dos clientes reservaban la última mesa a la vez:
-- uno recibía un error en vez de las horas alternativas.
--
-- Antes de ocupar una mesa (retención o asignación activa) se toma un bloqueo de
-- transacción por día de servicio. La segunda espera a que la primera termine y entonces
-- ve su fila confirmada: la restricción falla de forma limpia (exclusion_violation) y
-- `retener_mesa` prueba la siguiente mesa o devuelve alternativas.
-- =============================================================================

create function public.serializar_ocupacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Las asignaciones inactivas no ocupan la mesa (y la retención no tiene esa columna).
  if tg_table_name = 'asignacion' then
    if not new.activa then
      return new;
    end if;
  end if;
  perform pg_advisory_xact_lock(
    hashtext('yerga-ocupacion'),
    public.fecha_local(lower(new.intervalo)) - date '2000-01-01');
  return new;
end $$;

revoke execute on function public.serializar_ocupacion() from public, anon, authenticated;

create trigger serializar_ocupacion
  before insert or update of mesa_id, intervalo on public.retencion
  for each row execute function public.serializar_ocupacion();

create trigger serializar_ocupacion
  before insert or update of mesa_id, intervalo, activa on public.asignacion
  for each row execute function public.serializar_ocupacion();
