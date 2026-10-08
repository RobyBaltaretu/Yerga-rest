-- Informes para encargado y administrador: los indicadores de los objetivos del
-- producto (reservas online, plantones, arroz elegido, tiempo de reserva...).
create function public.informe(p_desde date, p_hasta date)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_res jsonb;
begin
  perform public.exigir_gestion();
  with r as (
    select * from public.reserva
     where public.fecha_local(inicio) between p_desde and p_hasta
  ),
  hechas as (select * from r where estado in ('sentada', 'finalizada', 'no_presentada')),
  capacidad as (
    select coalesce(sum(m.capacidad_max), 0) as plazas
      from public.zona z
      join public.mesa m on m.distribucion_id = public.distribucion_activa(z.id, p_hasta, 'comida')
     where z.activa and m.activa
  )
  select jsonb_build_object(
    'total', (select count(*) from r where estado <> 'cancelada'),
    'comensales', (select coalesce(sum(comensales), 0) from r where estado in ('sentada', 'finalizada')),
    'origen', (select coalesce(jsonb_object_agg(origen, n), '{}') from (select origen, count(*) n from r where estado <> 'cancelada' group by origen) x),
    'online_sobre_total', (select round(100.0 * count(*) filter (where origen = 'web') / nullif(count(*) filter (where origen in ('web', 'telefono')), 0), 1) from r where estado <> 'cancelada'),
    'plantones_pct', (select round(100.0 * count(*) filter (where estado = 'no_presentada') / nullif(count(*), 0), 1) from hechas),
    'cancelaciones', (select count(*) from r where estado = 'cancelada'),
    'con_arroz_pct', (select round(100.0 * count(*) filter (where exists (select 1 from public.encargo_arroz e where e.reserva_id = r.id)) / nullif(count(*), 0), 1) from r where estado <> 'cancelada' and origen = 'web'),
    'segundos_reserva', (select round(avg(segundos_para_reservar)) from r where segundos_para_reservar is not null),
    'antelacion_horas', (select round(avg(extract(epoch from inicio - creada_en) / 3600)::numeric, 1) from r where origen <> 'puerta'),
    'sin_mesa_futuras', (select count(*) from public.reserva x where x.inicio > now() and x.estado in ('confirmada', 'reconfirmada')
                           and not exists (select 1 from public.asignacion a where a.reserva_id = x.id and a.activa)),
    'arroces', (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre ->> 'es', 'raciones', raciones) order by raciones desc), '[]')
                  from (select p.nombre, sum(e.raciones) raciones from public.encargo_arroz e join r on r.id = e.reserva_id
                         join public.plato p on p.id = e.plato_id where r.estado <> 'cancelada' group by p.nombre) x),
    'por_turno', (select coalesce(jsonb_agg(jsonb_build_object('fecha', fecha, 'turno', turno_nombre, 'comensales', comensales,
                    'ocupacion', round(100.0 * comensales / nullif((select plazas from capacidad), 0), 1)) order by fecha, turno_nombre), '[]')
                  from (select public.fecha_local(inicio) fecha, turno_nombre, sum(comensales) comensales
                          from r where estado in ('sentada', 'finalizada', 'confirmada', 'reconfirmada')
                         group by 1, 2) x),
    'plazas', (select plazas from capacidad)
  ) into v_res;
  return v_res;
end $$;

revoke execute on function public.informe(date, date) from public, anon;
grant execute on function public.informe(date, date) to authenticated;
