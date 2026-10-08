-- =============================================================================
-- Editor de distribuciones: borrador, duplicado y publicación con comprobación
-- de las reservas futuras afectadas.
--
-- El editor trabaja sobre `distribucion.borrador` (jsonb):
--   { "mesas": [{id, nombre, forma, x, y, giro, ancho, alto, sillas,
--                capacidad_min, capacidad_max, tronas, plazas_silla_ruedas,
--                reservable_online}],
--     "combinaciones": [{id, nombre, mesas: [id...], capacidad_min,
--                        capacidad_max, reservable_online}],
--     "elementos": [{id, tipo, x, y, giro, ancho, alto, etiqueta}] }
-- «Publicar» lo vuelca a las tablas reales.
-- =============================================================================

create function public.distribucion_a_json(p_dist uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'mesas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'nombre', m.nombre, 'forma', m.forma, 'x', m.x, 'y', m.y, 'giro', m.giro,
        'ancho', m.ancho, 'alto', m.alto, 'sillas', m.sillas, 'capacidad_min', m.capacidad_min,
        'capacidad_max', m.capacidad_max, 'tronas', m.tronas, 'plazas_silla_ruedas', m.plazas_silla_ruedas,
        'reservable_online', m.reservable_online) order by m.nombre)
        from public.mesa m where m.distribucion_id = p_dist and m.activa), '[]'::jsonb),
    'combinaciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'nombre', c.nombre, 'capacidad_min', c.capacidad_min, 'capacidad_max', c.capacidad_max,
        'reservable_online', c.reservable_online,
        'mesas', (select jsonb_agg(cm.mesa_id) from public.combinacion_mesa cm where cm.combinacion_id = c.id)))
        from public.combinacion c where c.distribucion_id = p_dist), '[]'::jsonb),
    'elementos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'tipo', e.tipo, 'x', e.x, 'y', e.y, 'giro', e.giro, 'ancho', e.ancho,
        'alto', e.alto, 'etiqueta', e.etiqueta))
        from public.elemento_fijo e where e.distribucion_id = p_dist), '[]'::jsonb))
$$;

-- Borrador actual (si no hay, el estado publicado).
create function public.borrador_de(p_dist uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform public.exigir_personal();
  return coalesce((select borrador from public.distribucion where id = p_dist), public.distribucion_a_json(p_dist));
end $$;

create function public.guardar_borrador(p_dist uuid, p_borrador jsonb)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform public.exigir_gestion();
  update public.distribucion
     set borrador = p_borrador, borrador_pendiente = true
   where id = p_dist;
end $$;

create function public.descartar_borrador(p_dist uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform public.exigir_gestion();
  update public.distribucion
     set borrador = null, borrador_pendiente = (estado = 'borrador')
   where id = p_dist;
end $$;

-- Nueva distribución (vacía o copia de otra), siempre como borrador.
create function public.crear_distribucion(p_zona uuid, p_nombre text, p_copiar_de uuid default null)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_json jsonb := '{"mesas": [], "combinaciones": [], "elementos": []}'::jsonb;
  v_mapa jsonb := '{}'::jsonb;
  m jsonb;
  v_nuevo uuid;
begin
  perform public.exigir_gestion();
  if p_copiar_de is not null then
    v_json := coalesce((select borrador from public.distribucion where id = p_copiar_de),
                       public.distribucion_a_json(p_copiar_de));
    -- Identificadores nuevos para que la copia sea independiente del original.
    for m in select * from jsonb_array_elements(v_json -> 'mesas') loop
      v_nuevo := gen_random_uuid();
      v_mapa := v_mapa || jsonb_build_object(m ->> 'id', v_nuevo);
    end loop;
    v_json := jsonb_build_object(
      'mesas', (select coalesce(jsonb_agg(x || jsonb_build_object('id', v_mapa -> (x ->> 'id'))), '[]')
                  from jsonb_array_elements(v_json -> 'mesas') x),
      'combinaciones', (select coalesce(jsonb_agg(c || jsonb_build_object(
                          'id', gen_random_uuid(),
                          'mesas', (select jsonb_agg(v_mapa -> (y #>> '{}')) from jsonb_array_elements(c -> 'mesas') y))), '[]')
                          from jsonb_array_elements(v_json -> 'combinaciones') c),
      'elementos', (select coalesce(jsonb_agg(e || jsonb_build_object('id', gen_random_uuid())), '[]')
                      from jsonb_array_elements(v_json -> 'elementos') e));
  end if;
  insert into public.distribucion (zona_id, nombre, estado, borrador, borrador_pendiente)
  values (p_zona, p_nombre, 'borrador', v_json, true)
  returning id into v_id;
  return v_id;
end $$;

create function public.hacer_predeterminada(p_dist uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_zona uuid;
begin
  perform public.exigir_gestion();
  select zona_id into v_zona from public.distribucion where id = p_dist and estado = 'publicada';
  if v_zona is null then
    raise exception 'Solo una distribución publicada puede ser la predeterminada';
  end if;
  update public.distribucion set predeterminada = false where zona_id = v_zona and predeterminada;
  update public.distribucion set predeterminada = true where id = p_dist;
end $$;

-- -----------------------------------------------------------------------------
-- Publicar. Con p_aplicar = false solo devuelve la vista previa (todo se deshace).
-- Resultado: { ok, publicada, reservas: [{reserva_id, nombre, hora, fecha,
--              comensales, situacion: mantiene|reasignada|sin_sitio, antes, despues}] }
-- No se publica mientras alguna reserva futura no quepa.
-- -----------------------------------------------------------------------------
create function public.publicar_distribucion(p_dist uuid, p_aplicar boolean default false)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  d public.distribucion;
  b jsonb;
  m jsonb;
  k jsonb;
  v_ids uuid[];
  v_r public.reserva;
  v_actuales uuid[];
  v_cap int;
  v_nuevas uuid[];
  v_cand record;
  v_lista jsonb := '[]'::jsonb;
  v_sin_sitio int := 0;
  v_reasignadas int := 0;
  v_situacion text;
  v_resultado jsonb;
  v_combi uuid;
begin
  perform public.exigir_gestion();
  select * into d from public.distribucion where id = p_dist for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_encontrada'); end if;
  b := coalesce(d.borrador, public.distribucion_a_json(p_dist));

  -- Validaciones del borrador.
  if exists (select 1 from jsonb_array_elements(b -> 'mesas') x group by lower(x ->> 'nombre') having count(*) > 1) then
    return jsonb_build_object('ok', false, 'motivo', 'nombres_repetidos');
  end if;
  if exists (select 1 from jsonb_array_elements(b -> 'mesas') x
              where coalesce((x ->> 'capacidad_max')::int, 0) < coalesce((x ->> 'capacidad_min')::int, 1)
                 or coalesce(trim(x ->> 'nombre'), '') = '') then
    return jsonb_build_object('ok', false, 'motivo', 'mesa_invalida');
  end if;

  begin
    -- 1. Mesas: los nombres se liberan antes para permitir intercambios.
    update public.mesa set nombre = nombre || '~' || left(id::text, 8) where distribucion_id = p_dist;
    select coalesce(array_agg((x ->> 'id')::uuid), '{}') into v_ids from jsonb_array_elements(b -> 'mesas') x;
    for m in select * from jsonb_array_elements(b -> 'mesas') loop
      insert into public.mesa as t (
        id, distribucion_id, nombre, forma, x, y, giro, ancho, alto, sillas, capacidad_min,
        capacidad_max, tronas, plazas_silla_ruedas, reservable_online, activa)
      values (
        (m ->> 'id')::uuid, p_dist, trim(m ->> 'nombre'), (m ->> 'forma')::public.forma_mesa,
        (m ->> 'x')::numeric, (m ->> 'y')::numeric, coalesce((m ->> 'giro')::numeric, 0),
        (m ->> 'ancho')::numeric, (m ->> 'alto')::numeric, coalesce((m ->> 'sillas')::int, 0),
        coalesce((m ->> 'capacidad_min')::int, 1), (m ->> 'capacidad_max')::int,
        coalesce((m ->> 'tronas')::int, 0), coalesce((m ->> 'plazas_silla_ruedas')::int, 0),
        coalesce((m ->> 'reservable_online')::boolean, true), true)
      on conflict (id) do update set
        nombre = excluded.nombre, forma = excluded.forma, x = excluded.x, y = excluded.y,
        giro = excluded.giro, ancho = excluded.ancho, alto = excluded.alto, sillas = excluded.sillas,
        capacidad_min = excluded.capacidad_min, capacidad_max = excluded.capacidad_max,
        tronas = excluded.tronas, plazas_silla_ruedas = excluded.plazas_silla_ruedas,
        reservable_online = excluded.reservable_online, activa = true
      where t.distribucion_id = p_dist;
    end loop;
    -- Las mesas quitadas se desactivan (conservan su historial de reservas).
    update public.mesa set activa = false where distribucion_id = p_dist and not (id = any (v_ids));

    -- 2. Combinaciones y elementos fijos: se reescriben.
    delete from public.combinacion where distribucion_id = p_dist;
    for k in select * from jsonb_array_elements(coalesce(b -> 'combinaciones', '[]')) loop
      insert into public.combinacion (distribucion_id, nombre, capacidad_min, capacidad_max, reservable_online)
      values (p_dist, k ->> 'nombre', coalesce((k ->> 'capacidad_min')::int, 1), (k ->> 'capacidad_max')::int,
              coalesce((k ->> 'reservable_online')::boolean, true))
      returning id into v_combi;
      insert into public.combinacion_mesa (combinacion_id, mesa_id)
      select v_combi, (x #>> '{}')::uuid from jsonb_array_elements(k -> 'mesas') x
       where (x #>> '{}')::uuid = any (v_ids);
    end loop;
    delete from public.elemento_fijo where distribucion_id = p_dist;
    insert into public.elemento_fijo (distribucion_id, tipo, x, y, giro, ancho, alto, etiqueta)
    select p_dist, (e ->> 'tipo')::public.tipo_elemento, (e ->> 'x')::numeric, (e ->> 'y')::numeric,
           coalesce((e ->> 'giro')::numeric, 0), (e ->> 'ancho')::numeric, (e ->> 'alto')::numeric,
           nullif(e ->> 'etiqueta', '')
      from jsonb_array_elements(coalesce(b -> 'elementos', '[]')) e;

    update public.distribucion
       set estado = 'publicada', publicada_en = now(), version = version + 1,
           borrador = null, borrador_pendiente = false
     where id = p_dist;

    -- 3. Reservas futuras afectadas: las que tienen mesa de esta distribución y
    --    las que, con la distribución publicada, pasan a depender de ella.
    for v_r in
      select r.*
        from public.reserva r
       where r.inicio > now()
         and r.estado in ('confirmada', 'reconfirmada')
         and (
           exists (select 1 from public.asignacion a join public.mesa mm on mm.id = a.mesa_id
                    where a.reserva_id = r.id and a.activa and mm.distribucion_id = p_dist)
           or (public.distribucion_activa(d.zona_id, public.fecha_local(r.inicio), r.turno_nombre) = p_dist
               and exists (select 1 from public.asignacion a join public.mesa mm on mm.id = a.mesa_id
                             join public.distribucion dd on dd.id = mm.distribucion_id
                            where a.reserva_id = r.id and a.activa and dd.zona_id = d.zona_id
                              and dd.id <> p_dist)))
       order by r.inicio, r.comensales desc
    loop
      select array_agg(a.mesa_id) into v_actuales from public.asignacion a where a.reserva_id = v_r.id and a.activa;
      select coalesce(sum(mm.capacidad_max), 0) into v_cap
        from public.mesa mm where mm.id = any (v_actuales) and mm.activa and mm.distribucion_id = p_dist;
      v_nuevas := null;
      if public.distribucion_activa(d.zona_id, public.fecha_local(v_r.inicio), v_r.turno_nombre) is distinct from p_dist then
        -- Esa fecha usa otra distribución: la reserva no depende de esta.
        if v_cap = 0 then continue; end if;
      end if;
      if v_cap >= v_r.comensales
         and not exists (select 1 from public.mesa mm where mm.id = any (v_actuales) and (not mm.activa or mm.distribucion_id <> p_dist))
         and public.mesas_libres(v_actuales, public.ocupacion_de(v_r), tstzrange(v_r.inicio, v_r.fin), v_r.id) then
        v_situacion := 'mantiene';
        v_nuevas := v_actuales;
      else
        delete from public.asignacion where reserva_id = v_r.id;
        for v_cand in select * from public.candidatos(p_dist, v_r.comensales, false) loop
          if public.mesas_libres(v_cand.mesas, public.ocupacion_de(v_r), tstzrange(v_r.inicio, v_r.fin), v_r.id) then
            v_nuevas := v_cand.mesas;
            exit;
          end if;
        end loop;
        if v_nuevas is null then
          v_situacion := 'sin_sitio';
          v_sin_sitio := v_sin_sitio + 1;
        else
          v_situacion := 'reasignada';
          v_reasignadas := v_reasignadas + 1;
          insert into public.asignacion (reserva_id, mesa_id, intervalo)
          select v_r.id, x, public.ocupacion_de(v_r) from unnest(v_nuevas) x;
        end if;
      end if;
      if v_situacion <> 'mantiene' then
        v_lista := v_lista || jsonb_build_object(
          'reserva_id', v_r.id, 'nombre', v_r.nombre, 'comensales', v_r.comensales,
          'fecha', public.fecha_local(v_r.inicio), 'hora', public.hhmm(v_r.inicio), 'situacion', v_situacion,
          'antes', coalesce((select jsonb_agg(split_part(nombre, '~', 1) order by nombre) from public.mesa where id = any (v_actuales)), '[]'),
          'despues', coalesce((select jsonb_agg(nombre order by nombre) from public.mesa where id = any (v_nuevas)), '[]'));
      end if;
    end loop;

    v_resultado := jsonb_build_object(
      'ok', v_sin_sitio = 0, 'publicada', p_aplicar and v_sin_sitio = 0,
      'motivo', case when v_sin_sitio > 0 then 'reservas_sin_sitio' end,
      'reasignadas', v_reasignadas, 'sin_sitio', v_sin_sitio, 'reservas', v_lista);

    if not p_aplicar or v_sin_sitio > 0 then
      -- Vista previa o conflicto: se deshace todo lo anterior.
      raise exception using errcode = 'YG001', message = 'vista_previa';
    end if;
  exception when sqlstate 'YG001' then
    return v_resultado;
  end;

  return v_resultado;
end $$;

revoke execute on function public.distribucion_a_json(uuid), public.borrador_de(uuid),
  public.guardar_borrador(uuid, jsonb), public.descartar_borrador(uuid),
  public.crear_distribucion(uuid, text, uuid), public.hacer_predeterminada(uuid),
  public.publicar_distribucion(uuid, boolean) from public, anon;
grant execute on function public.borrador_de(uuid), public.guardar_borrador(uuid, jsonb),
  public.descartar_borrador(uuid), public.crear_distribucion(uuid, text, uuid),
  public.hacer_predeterminada(uuid), public.publicar_distribucion(uuid, boolean) to authenticated;
