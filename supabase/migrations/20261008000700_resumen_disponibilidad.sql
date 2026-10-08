-- Mesas online libres en los próximos turnos, para el aviso «Quedan 3 mesas
-- para el domingo a mediodía». Para cada turno se toma la mejor hora: el mayor
-- número de mesas (de 2 o más plazas) libres a la vez. Solo se muestra cuando
-- es cierto, porque se calcula con el estado real.
create function public.resumen_disponibilidad(p_dias int default 3)
returns table (fecha date, turno text, libres int)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  c public.configuracion := public.cfg();
  v_dia date;
  t public.turno;
  v_slot timestamptz;
  v_dur int := public.duracion_para(2);
  v_max int;
  v_n int;
begin
  for v_dia in select g::date from generate_series(public.fecha_local(now()), public.fecha_local(now()) + p_dias, interval '1 day') g loop
    for t in select tt.* from public.turno tt where tt.dia_semana = extract(dow from v_dia)::int and tt.activo order by tt.inicio loop
      v_max := -1;
      for v_slot in select g from generate_series(public.hora_local(v_dia, t.inicio), public.hora_local(v_dia, t.ultima_hora), public.minutos(c.intervalo_min)) g loop
        continue when v_slot < now() + public.minutos(c.antelacion_min_min);
        continue when public.local_bloqueado(v_slot, t.nombre);
        select count(*) into v_n
          from public.zona z
          join public.mesa m on m.distribucion_id = public.distribucion_activa(z.id, v_dia, t.nombre)
         where z.activa and m.activa and m.reservable_online and m.capacidad_max >= 2
           and not public.zona_bloqueada(z.id, tstzrange(v_slot, v_slot + public.minutos(v_dur)), t.nombre)
           and public.mesa_libre(m.id, tstzrange(v_slot, v_slot + public.minutos(v_dur + c.margen_min)),
                                 tstzrange(v_slot, v_slot + public.minutos(v_dur)));
        v_max := greatest(v_max, v_n);
      end loop;
      if v_max >= 0 then
        fecha := v_dia;
        turno := t.nombre;
        libres := v_max;
        return next;
      end if;
    end loop;
  end loop;
end $$;

revoke execute on function public.resumen_disponibilidad(int) from public, anon, authenticated;
