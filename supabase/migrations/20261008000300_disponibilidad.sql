-- =============================================================================
-- Motor de disponibilidad
--
-- Regla de oro: la disponibilidad se calcula aquí, en el servidor de base de
-- datos, con el estado real del momento. El navegador nunca decide si hay mesa.
-- Cada hora ofrecida tiene detrás una mesa (o combinación) concreta libre durante
-- toda la estancia más el margen de recogida.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ayudas de configuración y turnos
-- -----------------------------------------------------------------------------
create function public.cfg()
returns public.configuracion
language sql stable security definer
set search_path = ''
as $$ select c from public.configuracion c where c.id = 1 $$;

create function public.duracion_para(p_comensales int)
returns int
language sql stable security definer
set search_path = ''
as $$
  select case when p_comensales >= c.umbral_duracion_larga
              then c.duracion_desde_5 else c.duracion_hasta_4 end
  from public.configuracion c where c.id = 1
$$;

create function public.minutos(p int)
returns interval
language sql immutable parallel safe
set search_path = ''
as $$ select make_interval(mins => p) $$;

-- Turno (comida/cena) al que pertenece un instante, según los turnos de ese día.
create function public.turno_de(p_inicio timestamptz)
returns text
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select t.nombre from public.turno t
      where t.dia_semana = extract(dow from public.fecha_local(p_inicio))::int
        and (p_inicio at time zone 'Europe/Madrid')::time between t.inicio and t.fin
      order by t.inicio limit 1),
    case when (p_inicio at time zone 'Europe/Madrid')::time < time '18:00'
         then 'comida' else 'cena' end)
$$;

-- -----------------------------------------------------------------------------
-- Distribución activa para una zona, fecha y turno
-- Prioridad: fecha concreta > día de la semana > turno; si no hay programación
-- que encaje, la predeterminada de la zona.
-- -----------------------------------------------------------------------------
create function public.distribucion_activa(p_zona uuid, p_fecha date, p_turno text)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select d.id
       from public.distribucion d
       join public.programacion_distribucion p on p.distribucion_id = d.id
      where d.zona_id = p_zona and d.estado = 'publicada'
        and (p.fecha is null or p.fecha = p_fecha)
        and (p.dia_semana is null or p.dia_semana = extract(dow from p_fecha)::int)
        and (p.turno_nombre is null or p.turno_nombre = p_turno)
      order by (case when p.fecha is not null then 4 else 0 end
              + case when p.dia_semana is not null then 2 else 0 end
              + case when p.turno_nombre is not null then 1 else 0 end) desc,
               d.publicada_en desc nulls last
      limit 1),
    (select d.id from public.distribucion d
      where d.zona_id = p_zona and d.estado = 'publicada' and d.predeterminada
      limit 1))
$$;

-- -----------------------------------------------------------------------------
-- Candidatos: mesas sueltas y combinaciones definidas que admiten el grupo,
-- de la más ajustada a la más holgada. Así nunca se da una mesa de 6 a dos
-- personas si hay una menor libre.
-- -----------------------------------------------------------------------------
create function public.candidatos(
  p_dist uuid,
  p_comensales int,
  p_solo_online boolean,
  p_preferir_no_online boolean default false
)
returns table (mesas uuid[], capacidad_max int, es_combinacion boolean, etiqueta text, online boolean)
language sql stable security definer
set search_path = ''
as $$
  select * from (
    select array[m.id], m.capacidad_max, false, m.nombre, m.reservable_online
      from public.mesa m
     where m.distribucion_id = p_dist and m.activa
       and p_comensales between m.capacidad_min and m.capacidad_max
       and (not p_solo_online or m.reservable_online)
    union all
    select array_agg(cm.mesa_id order by m.nombre), c.capacidad_max, true, c.nombre,
           c.reservable_online and bool_and(m.reservable_online)
      from public.combinacion c
      join public.combinacion_mesa cm on cm.combinacion_id = c.id
      join public.mesa m on m.id = cm.mesa_id
     where c.distribucion_id = p_dist
       and p_comensales between c.capacidad_min and c.capacidad_max
       and (not p_solo_online or c.reservable_online)
     group by c.id, c.capacidad_max, c.nombre, c.reservable_online
    having bool_and(m.activa) and (not p_solo_online or bool_and(m.reservable_online))
  ) k (mesas, capacidad_max, es_combinacion, etiqueta, online)
  order by
    case when p_preferir_no_online and k.online then 1 else 0 end,
    k.capacidad_max, k.es_combinacion, length(k.etiqueta), k.etiqueta
$$;

-- -----------------------------------------------------------------------------
-- ¿Está libre una mesa durante un intervalo?
--  p_ocupacion: estancia + margen (lo que bloquea la mesa)
--  p_estancia:  estancia sin margen (para bloqueos de mesa)
-- Una reserva sentada que se alarga ocupa la mesa hasta ahora + margen: si la
-- sala no libera la mesa, la web deja de ofrecerla.
-- -----------------------------------------------------------------------------
create function public.mesa_libre(
  p_mesa uuid,
  p_ocupacion tstzrange,
  p_estancia tstzrange,
  p_ignorar_reserva uuid default null,
  p_ignorar_token uuid default null
)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select not exists (
      select 1
        from public.asignacion a
        join public.reserva r on r.id = a.reserva_id
       where a.mesa_id = p_mesa and a.activa
         and r.id is distinct from p_ignorar_reserva
         and (case when r.estado = 'sentada'
                   then tstzrange(lower(a.intervalo),
                                  greatest(upper(a.intervalo),
                                           now() + public.minutos((public.cfg()).margen_min)))
                   else a.intervalo end) && p_ocupacion)
    and not exists (
      select 1 from public.retencion t
       where t.mesa_id = p_mesa and t.caduca_en > now()
         and t.intervalo && p_ocupacion
         and t.token is distinct from p_ignorar_token)
    and not exists (
      select 1 from public.bloqueo b
       where b.mesa_id = p_mesa and b.rango && p_estancia)
$$;

create function public.mesas_libres(
  p_mesas uuid[],
  p_ocupacion tstzrange,
  p_estancia tstzrange,
  p_ignorar_reserva uuid default null,
  p_ignorar_token uuid default null
)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(bool_and(public.mesa_libre(m, p_ocupacion, p_estancia, p_ignorar_reserva, p_ignorar_token)), false)
    from unnest(p_mesas) m
$$;

-- Bloqueo de todo el local (día o turno) para una hora de llegada.
create function public.local_bloqueado(p_inicio timestamptz, p_turno text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bloqueo b
     where b.mesa_id is null and b.zona_id is null
       and b.rango @> p_inicio
       and (b.turno_nombre is null or b.turno_nombre = p_turno))
$$;

-- Bloqueo de una zona (por ejemplo, terraza con lluvia) que solapa la estancia.
create function public.zona_bloqueada(p_zona uuid, p_estancia tstzrange, p_turno text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bloqueo b
     where b.zona_id = p_zona and b.mesa_id is null
       and b.rango && p_estancia
       and (b.turno_nombre is null or b.turno_nombre = p_turno))
$$;

-- Comensales que ya llegan en la franja [p_inicio, p_inicio + intervalo):
-- reservas activas y retenciones vigentes. Protege el ritmo de cocina.
create function public.comensales_en_franja(
  p_inicio timestamptz,
  p_ignorar_reserva uuid default null,
  p_ignorar_token uuid default null
)
returns int
language sql stable security definer
set search_path = ''
as $$
  with franja as (
    select tstzrange(p_inicio, p_inicio + public.minutos((public.cfg()).intervalo_min)) as r
  )
  select coalesce((
      select sum(r.comensales)::int from public.reserva r, franja f
       where f.r @> r.inicio
         and r.estado not in ('cancelada', 'no_presentada')
         and r.id is distinct from p_ignorar_reserva), 0)
       + coalesce((
      select sum(t.comensales)::int from (
        select distinct on (t.token) t.token, t.comensales
          from public.retencion t, franja f
         where f.r @> t.inicio and t.caduca_en > now()
           and t.token is distinct from p_ignorar_token) t), 0)
$$;

-- -----------------------------------------------------------------------------
-- Horas disponibles de un día
-- Devuelve cada hora de cada turno con las zonas que tienen hueco. Las horas
-- completas se devuelven con disponible = false (se muestran tachadas). Las horas
-- fuera de antelación o en días/turnos bloqueados no se devuelven.
-- -----------------------------------------------------------------------------
create function public.horas_disponibles(
  p_fecha date,
  p_comensales int,
  p_zona uuid default null,
  p_ignorar_reserva uuid default null,
  p_ignorar_token uuid default null,
  p_solo_online boolean default true
)
returns table (inicio timestamptz, hora text, turno text, zonas uuid[], disponible boolean)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  c public.configuracion;
  t public.turno;
  v_slot timestamptz;
  v_dur int;
  v_estancia tstzrange;
  v_ocupacion tstzrange;
  v_zona record;
  v_dist uuid;
  v_zonas uuid[];
begin
  c := public.cfg();
  if p_comensales is null or p_comensales < 1 then return; end if;
  if p_solo_online then
    if p_comensales > c.max_comensales_online then return; end if;
    if p_fecha < public.fecha_local(now())
       or p_fecha > public.fecha_local(now()) + c.antelacion_max_dias then
      return;
    end if;
  end if;
  v_dur := public.duracion_para(p_comensales);

  for t in
    select tt.* from public.turno tt
     where tt.dia_semana = extract(dow from p_fecha)::int and tt.activo
     order by tt.inicio
  loop
    for v_slot in
      select g from generate_series(
        public.hora_local(p_fecha, t.inicio),
        public.hora_local(p_fecha, t.ultima_hora),
        public.minutos(c.intervalo_min)) g
    loop
      if p_solo_online and v_slot < now() + public.minutos(c.antelacion_min_min) then
        continue;
      end if;
      if public.local_bloqueado(v_slot, t.nombre) then continue; end if;

      v_estancia := tstzrange(v_slot, v_slot + public.minutos(v_dur));
      v_ocupacion := tstzrange(v_slot, v_slot + public.minutos(v_dur + c.margen_min));
      inicio := v_slot;
      hora := public.hhmm(v_slot);
      turno := t.nombre;

      if public.comensales_en_franja(v_slot, p_ignorar_reserva, p_ignorar_token) + p_comensales
         > t.tope_franja then
        zonas := '{}';
        disponible := false;
        return next;
        continue;
      end if;

      v_zonas := '{}';
      for v_zona in
        select z.id from public.zona z
         where z.activa and (p_zona is null or z.id = p_zona)
         order by z.orden
      loop
        if public.zona_bloqueada(v_zona.id, v_estancia, t.nombre) then continue; end if;
        v_dist := public.distribucion_activa(v_zona.id, p_fecha, t.nombre);
        if v_dist is null then continue; end if;
        if exists (
          select 1 from public.candidatos(v_dist, p_comensales, p_solo_online) k
           where public.mesas_libres(k.mesas, v_ocupacion, v_estancia, p_ignorar_reserva, p_ignorar_token)
        ) then
          v_zonas := v_zonas || v_zona.id;
        end if;
      end loop;

      zonas := v_zonas;
      disponible := cardinality(v_zonas) > 0;
      return next;
    end loop;
  end loop;
end $$;

-- Las tres horas libres más cercanas a una hora pedida (mismo día; si no hay,
-- las primeras de los días siguientes).
create function public.horas_cercanas(
  p_inicio timestamptz,
  p_comensales int,
  p_zona uuid default null,
  p_ignorar_reserva uuid default null,
  p_n int default 3
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_fecha date := public.fecha_local(p_inicio);
  v_res jsonb;
  v_dia int := 0;
begin
  select coalesce(jsonb_agg(jsonb_build_object('inicio', x.inicio, 'hora', x.hora, 'turno', x.turno)
                            order by x.inicio), '[]'::jsonb)
    into v_res
    from (
      select h.inicio, h.hora, h.turno
        from public.horas_disponibles(v_fecha, p_comensales, p_zona, p_ignorar_reserva) h
       where h.disponible and h.inicio <> p_inicio
       order by abs(extract(epoch from h.inicio - p_inicio))
       limit p_n) x;

  while jsonb_array_length(v_res) = 0 and v_dia < 7 loop
    v_dia := v_dia + 1;
    select coalesce(jsonb_agg(jsonb_build_object('inicio', x.inicio, 'hora', x.hora, 'turno', x.turno)
                              order by x.inicio), '[]'::jsonb)
      into v_res
      from (
        select h.inicio, h.hora, h.turno
          from public.horas_disponibles(v_fecha + v_dia, p_comensales, p_zona, p_ignorar_reserva) h
         where h.disponible
         order by h.inicio
         limit p_n) x;
  end loop;
  return v_res;
end $$;

-- Estado de cada día para el calendario: cerrado, completo o disponible.
create function public.dias_disponibles(p_desde date, p_hasta date, p_comensales int)
returns table (fecha date, estado text)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_dia date;
  v_total int;
  v_libres int;
begin
  for v_dia in select g::date from generate_series(p_desde, p_hasta, interval '1 day') g loop
    select count(*), count(*) filter (where h.disponible)
      into v_total, v_libres
      from public.horas_disponibles(v_dia, p_comensales) h;
    fecha := v_dia;
    if v_total = 0 then
      estado := 'cerrado';
    elsif v_libres = 0 then
      estado := 'completo';
    else
      estado := 'disponible';
    end if;
    return next;
  end loop;
end $$;

-- Mayor grupo que se puede sentar online en alguna distribución publicada.
create function public.capacidad_maxima_online()
returns int
language sql stable security definer
set search_path = ''
as $$
  select least((public.cfg()).max_comensales_online, coalesce(max(x.cap), 0))
    from (
      select m.capacidad_max as cap
        from public.mesa m join public.distribucion d on d.id = m.distribucion_id
       where d.estado = 'publicada' and m.activa and m.reservable_online
      union all
      select c.capacidad_max
        from public.combinacion c join public.distribucion d on d.id = c.distribucion_id
       where d.estado = 'publicada' and c.reservable_online
    ) x
$$;

-- -----------------------------------------------------------------------------
-- Retención: al elegir hora, la mesa queda reservada unos minutos mientras el
-- cliente escribe sus datos. Si no termina, caduca sola.
-- -----------------------------------------------------------------------------
create function public.retener_mesa(
  p_inicio timestamptz,
  p_comensales int,
  p_zona uuid default null,
  p_token_anterior uuid default null,
  p_ignorar_reserva uuid default null
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_fecha date := public.fecha_local(p_inicio);
  v_hora record;
  v_zona uuid;
  v_dist uuid;
  v_cand record;
  v_token uuid := gen_random_uuid();
  v_dur int := public.duracion_para(p_comensales);
  v_estancia tstzrange := tstzrange(p_inicio, p_inicio + public.minutos(v_dur));
  v_ocupacion tstzrange := tstzrange(p_inicio, p_inicio + public.minutos(v_dur + c.margen_min));
  v_caduca timestamptz := now() + public.minutos(c.retencion_min);
begin
  delete from public.retencion where caduca_en <= now();
  if p_token_anterior is not null then
    delete from public.retencion where token = p_token_anterior;
  end if;

  select * into v_hora
    from public.horas_disponibles(v_fecha, p_comensales, null, p_ignorar_reserva) h
   where h.inicio = p_inicio;

  if not found or not v_hora.disponible
     or (p_zona is not null and not (p_zona = any (v_hora.zonas))) then
    return jsonb_build_object(
      'ok', false, 'motivo', 'no_disponible',
      'alternativas', public.horas_cercanas(p_inicio, p_comensales, p_zona, p_ignorar_reserva));
  end if;

  for v_zona in
    select z from unnest(v_hora.zonas) with ordinality u(z, o)
     order by (z = p_zona) desc nulls last, o
  loop
    v_dist := public.distribucion_activa(v_zona, v_fecha, v_hora.turno);
    for v_cand in select * from public.candidatos(v_dist, p_comensales, true) loop
      if public.mesas_libres(v_cand.mesas, v_ocupacion, v_estancia, p_ignorar_reserva) then
        begin
          insert into public.retencion
            (token, mesa_id, zona_id, inicio, comensales, intervalo, caduca_en, ignorar_reserva_id)
          select v_token, m, v_zona, p_inicio, p_comensales, v_ocupacion, v_caduca, p_ignorar_reserva
            from unnest(v_cand.mesas) m;
          return jsonb_build_object(
            'ok', true, 'token', v_token, 'caduca_en', v_caduca,
            'zona_id', v_zona, 'turno', v_hora.turno, 'mesas', to_jsonb(v_cand.mesas));
        exception when exclusion_violation then
          -- Otro cliente acaba de retener esta mesa: probamos la siguiente.
          null;
        end;
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok', false, 'motivo', 'ocupada',
    'alternativas', public.horas_cercanas(p_inicio, p_comensales, p_zona, p_ignorar_reserva));
end $$;

create function public.liberar_retencion(p_token uuid)
returns void
language sql volatile security definer
set search_path = ''
as $$ delete from public.retencion where token = p_token $$;

-- -----------------------------------------------------------------------------
-- Cliente: alta o actualización por teléfono. No se sobrescribe el nombre de un
-- cliente existente (un teléfono compartido no mezcla fichas); el correo solo se
-- rellena si faltaba.
-- -----------------------------------------------------------------------------
create function public.upsert_cliente(p_datos jsonb)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_tel text := public.normalizar_telefono(p_datos ->> 'telefono');
  v_id uuid;
begin
  if v_tel is null then return null; end if;
  insert into public.cliente as cl (
    nombre, telefono, correo, idioma, alergias, consiente_comercial,
    consiente_comercial_en, privacidad_aceptada_en)
  values (
    trim(p_datos ->> 'nombre'), v_tel, nullif(trim(p_datos ->> 'correo'), ''),
    coalesce(p_datos ->> 'idioma', 'es'), nullif(trim(p_datos ->> 'alergias'), ''),
    coalesce((p_datos ->> 'consiente_comercial')::boolean, false),
    case when coalesce((p_datos ->> 'consiente_comercial')::boolean, false) then now() end,
    case when coalesce((p_datos ->> 'acepta_privacidad')::boolean, false) then now() end)
  on conflict (telefono) do update set
    nombre = case when cl.anonimizado then excluded.nombre else cl.nombre end,
    correo = coalesce(cl.correo, excluded.correo),
    idioma = excluded.idioma,
    alergias = coalesce(excluded.alergias, cl.alergias),
    consiente_comercial = cl.consiente_comercial or excluded.consiente_comercial,
    consiente_comercial_en = coalesce(cl.consiente_comercial_en, excluded.consiente_comercial_en),
    privacidad_aceptada_en = coalesce(excluded.privacidad_aceptada_en, cl.privacidad_aceptada_en),
    anonimizado = false,
    ultima_actividad_en = now()
  returning id into v_id;
  return v_id;
end $$;

-- Valida los arroces encargados: plato encargable, mínimo de comensales y que
-- no se encarguen más raciones que comensales.
create function public.validar_arroces(p_arroces jsonb, p_comensales int)
returns text
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_plato public.plato;
  v_total int := 0;
begin
  if p_arroces is null or jsonb_typeof(p_arroces) <> 'array' then return null; end if;
  for v_item in select * from jsonb_array_elements(p_arroces) loop
    select * into v_plato from public.plato
     where id = (v_item ->> 'plato_id')::uuid and encargable and visible;
    if not found then return 'arroz_no_disponible'; end if;
    if (v_item ->> 'raciones')::int < v_plato.min_comensales then
      return 'arroz_minimo';
    end if;
    v_total := v_total + (v_item ->> 'raciones')::int;
  end loop;
  if v_total > p_comensales then return 'arroz_raciones'; end if;
  return null;
end $$;

create function public.guardar_arroces(p_reserva uuid, p_arroces jsonb)
returns void
language sql volatile security definer
set search_path = ''
as $$
  delete from public.encargo_arroz where reserva_id = p_reserva;
  insert into public.encargo_arroz (reserva_id, plato_id, raciones)
  select p_reserva, (a ->> 'plato_id')::uuid, (a ->> 'raciones')::int
    from jsonb_array_elements(coalesce(p_arroces, '[]'::jsonb)) a;
$$;

-- -----------------------------------------------------------------------------
-- Confirmación de una reserva online: una única operación atómica.
-- Valida reglas, da de alta al cliente, guarda la reserva y sus asignaciones y
-- borra la retención. Si la restricción contra solapes salta, devuelve las tres
-- horas libres más cercanas.
-- -----------------------------------------------------------------------------
create function public.confirmar_reserva(p_token uuid, p_datos jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_inicio timestamptz := (p_datos ->> 'inicio')::timestamptz;
  v_n int := (p_datos ->> 'comensales')::int;
  v_zona uuid := nullif(p_datos ->> 'zona_id', '')::uuid;
  v_dur int;
  v_fin timestamptz;
  v_mesas uuid[];
  v_token uuid := p_token;
  v_ret jsonb;
  v_cliente uuid;
  v_reserva public.reserva;
  v_error text;
  v_hora record;
begin
  if v_inicio is null or v_n is null then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  end if;
  if coalesce(trim(p_datos ->> 'nombre'), '') = ''
     or public.normalizar_telefono(p_datos ->> 'telefono') is null
     or not coalesce((p_datos ->> 'acepta_privacidad')::boolean, false) then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  end if;
  v_error := public.validar_arroces(p_datos -> 'arroces', v_n);
  if v_error is not null then
    return jsonb_build_object('ok', false, 'motivo', v_error);
  end if;

  delete from public.retencion where caduca_en <= now();

  select array_agg(t.mesa_id), (array_agg(t.zona_id))[1]
    into v_mesas, v_zona
    from public.retencion t
   where t.token = v_token and t.inicio = v_inicio and t.comensales = v_n;

  -- La retención caducó: intentamos retener de nuevo la misma hora.
  if v_mesas is null then
    v_ret := public.retener_mesa(v_inicio, v_n, nullif(p_datos ->> 'zona_id', '')::uuid);
    if not (v_ret ->> 'ok')::boolean then
      return jsonb_build_object('ok', false, 'motivo', 'ocupada',
                                'alternativas', v_ret -> 'alternativas');
    end if;
    v_token := (v_ret ->> 'token')::uuid;
    v_zona := (v_ret ->> 'zona_id')::uuid;
    select array_agg(m::uuid) into v_mesas from jsonb_array_elements_text(v_ret -> 'mesas') m;
  end if;

  -- Revalidación de reglas con el estado actual (sin contar nuestra retención).
  select * into v_hora
    from public.horas_disponibles(public.fecha_local(v_inicio), v_n, v_zona, null, v_token) h
   where h.inicio = v_inicio;
  if not found or not v_hora.disponible then
    delete from public.retencion where token = v_token;
    return jsonb_build_object('ok', false, 'motivo', 'ocupada',
      'alternativas', public.horas_cercanas(v_inicio, v_n));
  end if;

  v_dur := public.duracion_para(v_n);
  v_fin := v_inicio + public.minutos(v_dur);
  v_cliente := public.upsert_cliente(p_datos);

  begin
    insert into public.reserva (
      cliente_id, nombre, telefono, correo, idioma, inicio, fin, comensales, duracion_min,
      turno_nombre, estado, origen, zona_preferida_id, ocasion, tronas, silla_ruedas,
      alergias, notas, segundos_para_reservar)
    values (
      v_cliente, trim(p_datos ->> 'nombre'), public.normalizar_telefono(p_datos ->> 'telefono'),
      nullif(trim(p_datos ->> 'correo'), ''), coalesce(p_datos ->> 'idioma', 'es'),
      v_inicio, v_fin, v_n, v_dur, v_hora.turno, 'confirmada', 'web', v_zona,
      nullif(trim(p_datos ->> 'ocasion'), ''), coalesce((p_datos ->> 'tronas')::int, 0),
      coalesce((p_datos ->> 'silla_ruedas')::boolean, false),
      nullif(trim(p_datos ->> 'alergias'), ''), nullif(trim(p_datos ->> 'notas'), ''),
      (p_datos ->> 'segundos')::int)
    returning * into v_reserva;

    insert into public.asignacion (reserva_id, mesa_id, intervalo)
    select v_reserva.id, m, tstzrange(v_inicio, v_fin + public.minutos(c.margen_min))
      from unnest(v_mesas) m;
  exception when exclusion_violation then
    -- Dos clientes a la vez sobre la última mesa: uno confirma; al otro se le
    -- ofrecen las horas más cercanas.
    delete from public.retencion where token = v_token;
    return jsonb_build_object('ok', false, 'motivo', 'ocupada',
      'alternativas', public.horas_cercanas(v_inicio, v_n));
  end;

  perform public.guardar_arroces(v_reserva.id, p_datos -> 'arroces');
  delete from public.retencion where token = v_token;

  return jsonb_build_object(
    'ok', true, 'reserva_id', v_reserva.id, 'codigo', v_reserva.codigo_gestion,
    'inicio', v_reserva.inicio, 'fin', v_reserva.fin, 'mesas', to_jsonb(v_mesas));
end $$;

-- -----------------------------------------------------------------------------
-- Gestión por el cliente con su código personal
-- -----------------------------------------------------------------------------
create function public.reserva_por_codigo(p_codigo text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'codigo', r.codigo_gestion, 'nombre', r.nombre, 'correo', r.correo,
    'telefono', r.telefono, 'idioma', r.idioma, 'inicio', r.inicio, 'fin', r.fin,
    'comensales', r.comensales, 'estado', r.estado, 'turno', r.turno_nombre,
    'zona_id', r.zona_preferida_id, 'zona', z.nombre, 'alergias', r.alergias,
    'ocasion', r.ocasion, 'tronas', r.tronas, 'silla_ruedas', r.silla_ruedas,
    'notas', r.notas, 'reconfirmada', r.reconfirmada_en is not null,
    'puede_cambiar', r.estado in ('pendiente', 'confirmada', 'reconfirmada')
                     and now() <= r.inicio - make_interval(hours => (public.cfg()).cancelacion_libre_horas),
    'arroces', coalesce((
      select jsonb_agg(jsonb_build_object('plato_id', e.plato_id, 'raciones', e.raciones,
                                          'nombre', p.nombre))
        from public.encargo_arroz e join public.plato p on p.id = e.plato_id
       where e.reserva_id = r.id), '[]'::jsonb))
  from public.reserva r
  left join public.zona z on z.id = r.zona_preferida_id
  where r.codigo_gestion = p_codigo
$$;

create function public.cancelar_por_codigo(p_codigo text)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_r public.reserva;
begin
  select * into v_r from public.reserva where codigo_gestion = p_codigo for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_encontrada'); end if;
  if v_r.estado not in ('pendiente', 'confirmada', 'reconfirmada') then
    return jsonb_build_object('ok', false, 'motivo', 'estado');
  end if;
  if now() > v_r.inicio - make_interval(hours => (public.cfg()).cancelacion_libre_horas) then
    return jsonb_build_object('ok', false, 'motivo', 'fuera_de_plazo');
  end if;
  update public.reserva
     set estado = 'cancelada', cancelada_en = now(), cancelada_por = 'cliente'
   where id = v_r.id;
  update public.asignacion set activa = false where reserva_id = v_r.id and activa;
  return jsonb_build_object('ok', true, 'reserva_id', v_r.id);
end $$;

create function public.reconfirmar_por_codigo(p_codigo text)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_r public.reserva;
begin
  select * into v_r from public.reserva where codigo_gestion = p_codigo for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_encontrada'); end if;
  if v_r.estado not in ('confirmada', 'reconfirmada') then
    return jsonb_build_object('ok', false, 'motivo', 'estado');
  end if;
  update public.reserva
     set estado = 'reconfirmada', reconfirmada_en = coalesce(reconfirmada_en, now()),
         sin_confirmar = false
   where id = v_r.id;
  return jsonb_build_object('ok', true, 'reserva_id', v_r.id);
end $$;

-- Cambio de hora o comensales por el cliente: la nueva hora se retiene antes
-- (ignorando su propia reserva) y aquí se sustituye en una sola transacción.
create function public.modificar_por_codigo(p_codigo text, p_token uuid, p_datos jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_r public.reserva;
  v_inicio timestamptz := (p_datos ->> 'inicio')::timestamptz;
  v_n int := (p_datos ->> 'comensales')::int;
  v_mesas uuid[];
  v_zona uuid;
  v_dur int;
  v_fin timestamptz;
  v_error text;
begin
  select * into v_r from public.reserva where codigo_gestion = p_codigo for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_encontrada'); end if;
  if v_r.estado not in ('pendiente', 'confirmada', 'reconfirmada')
     or now() > v_r.inicio - make_interval(hours => c.cancelacion_libre_horas) then
    return jsonb_build_object('ok', false, 'motivo', 'fuera_de_plazo');
  end if;
  v_error := public.validar_arroces(p_datos -> 'arroces', coalesce(v_n, v_r.comensales));
  if v_error is not null then return jsonb_build_object('ok', false, 'motivo', v_error); end if;

  if p_token is not null then
    delete from public.retencion where caduca_en <= now();
    select array_agg(t.mesa_id), (array_agg(t.zona_id))[1] into v_mesas, v_zona
      from public.retencion t
     where t.token = p_token and t.inicio = v_inicio and t.comensales = v_n
       and t.ignorar_reserva_id = v_r.id;
    if v_mesas is null then
      return jsonb_build_object('ok', false, 'motivo', 'ocupada',
        'alternativas', public.horas_cercanas(v_inicio, v_n, null, v_r.id));
    end if;
    v_dur := public.duracion_para(v_n);
    v_fin := v_inicio + public.minutos(v_dur);
    begin
      delete from public.asignacion where reserva_id = v_r.id;
      update public.reserva
         set inicio = v_inicio, fin = v_fin, comensales = v_n, duracion_min = v_dur,
             turno_nombre = public.turno_de(v_inicio), zona_preferida_id = v_zona,
             recordatorio_enviado_en = case when public.fecha_local(v_inicio) <> public.fecha_local(v_r.inicio)
                                            then null else recordatorio_enviado_en end,
             sin_confirmar = false
       where id = v_r.id;
      insert into public.asignacion (reserva_id, mesa_id, intervalo)
      select v_r.id, m, tstzrange(v_inicio, v_fin + public.minutos(c.margen_min))
        from unnest(v_mesas) m;
    exception when exclusion_violation then
      delete from public.retencion where token = p_token;
      return jsonb_build_object('ok', false, 'motivo', 'ocupada',
        'alternativas', public.horas_cercanas(v_inicio, v_n, null, v_r.id));
    end;
    delete from public.retencion where token = p_token;
  end if;

  update public.reserva set
    alergias = coalesce(nullif(trim(p_datos ->> 'alergias'), ''), alergias),
    notas = coalesce(nullif(trim(p_datos ->> 'notas'), ''), notas),
    ocasion = coalesce(nullif(trim(p_datos ->> 'ocasion'), ''), ocasion)
  where id = v_r.id;
  if p_datos ? 'arroces' then
    perform public.guardar_arroces(v_r.id, p_datos -> 'arroces');
  end if;
  return jsonb_build_object('ok', true, 'reserva_id', v_r.id);
end $$;

-- -----------------------------------------------------------------------------
-- Operaciones del panel (requieren personal identificado)
-- -----------------------------------------------------------------------------
create function public.exigir_personal()
returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if not public.es_personal() and not public.es_servicio() then
    raise exception 'Acceso solo para el personal' using errcode = '42501';
  end if;
end $$;

create function public.exigir_gestion()
returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if not public.puede_gestionar() and not public.es_servicio() then
    raise exception 'Acceso solo para encargado o administrador' using errcode = '42501';
  end if;
end $$;

-- Intervalo que ocupa una reserva en su mesa (incluye margen; si está sentada y
-- se alarga, llega hasta ahora + margen).
create function public.ocupacion_de(p_r public.reserva)
returns tstzrange
language sql stable security definer
set search_path = ''
as $$
  select tstzrange(
    p_r.inicio,
    greatest(p_r.fin, case when p_r.estado = 'sentada' then now() else p_r.fin end)
      + public.minutos((public.cfg()).margen_min))
$$;

-- Primera mesa o combinación libre para una reserva, recorriendo zonas.
create function public.elegir_mesas(
  p_inicio timestamptz,
  p_fin timestamptz,
  p_comensales int,
  p_zona uuid default null,
  p_ignorar_reserva uuid default null,
  p_preferir_no_online boolean default false
)
returns uuid[]
language plpgsql stable security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_fecha date := public.fecha_local(p_inicio);
  v_turno text := public.turno_de(p_inicio);
  v_estancia tstzrange := tstzrange(p_inicio, p_fin);
  v_ocupacion tstzrange := tstzrange(p_inicio, p_fin + public.minutos(c.margen_min));
  v_zona record;
  v_dist uuid;
  v_cand record;
begin
  for v_zona in
    select z.id from public.zona z where z.activa
     order by (z.id = p_zona) desc nulls last, z.orden
  loop
    if public.zona_bloqueada(v_zona.id, v_estancia, v_turno) then continue; end if;
    v_dist := public.distribucion_activa(v_zona.id, v_fecha, v_turno);
    if v_dist is null then continue; end if;
    for v_cand in select * from public.candidatos(v_dist, p_comensales, false, p_preferir_no_online) loop
      if public.mesas_libres(v_cand.mesas, v_ocupacion, v_estancia, p_ignorar_reserva) then
        return v_cand.mesas;
      end if;
    end loop;
  end loop;
  return null;
end $$;

-- Comprueba las reglas que el personal puede saltarse forzando.
create function public.incumple_reglas(p_inicio timestamptz, p_comensales int, p_ignorar_reserva uuid default null)
returns text
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_fecha date := public.fecha_local(p_inicio);
  v_hora time := (p_inicio at time zone 'Europe/Madrid')::time;
  t public.turno;
begin
  select * into t from public.turno
   where dia_semana = extract(dow from v_fecha)::int and activo
     and v_hora between inicio and ultima_hora
   order by inicio limit 1;
  if not found then return 'fuera_de_horario'; end if;
  if public.local_bloqueado(p_inicio, t.nombre) then return 'bloqueado'; end if;
  if public.comensales_en_franja(p_inicio, p_ignorar_reserva) + p_comensales > t.tope_franja then
    return 'tope_franja';
  end if;
  return null;
end $$;

create function public.crear_reserva_personal(p_datos jsonb, p_forzar boolean default false)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_origen public.origen_reserva := coalesce(p_datos ->> 'origen', 'telefono')::public.origen_reserva;
  v_inicio timestamptz := coalesce((p_datos ->> 'inicio')::timestamptz,
                                   case when v_origen = 'puerta' then now() end);
  v_n int := (p_datos ->> 'comensales')::int;
  v_dur int;
  v_fin timestamptz;
  v_estado public.estado_reserva;
  v_mesas uuid[];
  v_regla text;
  v_cliente uuid;
  v_r public.reserva;
  v_aviso text;
  v_error text;
  v_cap int;
begin
  perform public.exigir_personal();
  if v_inicio is null or v_n is null or v_n < 1 then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  end if;
  v_dur := coalesce((p_datos ->> 'duracion_min')::int, public.duracion_para(v_n));
  v_fin := v_inicio + public.minutos(v_dur);
  v_estado := case
    when v_origen = 'puerta' then 'sentada'
    else coalesce(p_datos ->> 'estado', 'confirmada')::public.estado_reserva end;

  v_error := public.validar_arroces(p_datos -> 'arroces', v_n);
  if v_error is not null then return jsonb_build_object('ok', false, 'motivo', v_error); end if;

  -- Reglas (los clientes sin reserva ya están aquí: solo cuenta que haya mesa).
  if v_origen <> 'puerta' and not p_forzar then
    v_regla := public.incumple_reglas(v_inicio, v_n);
    if v_regla is not null then
      return jsonb_build_object('ok', false, 'motivo', v_regla, 'puede_forzar', true);
    end if;
  end if;

  if p_datos ? 'mesas' and jsonb_array_length(p_datos -> 'mesas') > 0 then
    select array_agg(m::uuid) into v_mesas from jsonb_array_elements_text(p_datos -> 'mesas') m;
    select coalesce(sum(capacidad_max), 0) into v_cap from public.mesa where id = any (v_mesas);
    if v_cap < v_n and not p_forzar then
      return jsonb_build_object('ok', false, 'motivo', 'capacidad', 'puede_forzar', true);
    end if;
    if not public.mesas_libres(v_mesas, tstzrange(v_inicio, v_fin + public.minutos(c.margen_min)),
                               tstzrange(v_inicio, v_fin)) then
      return jsonb_build_object('ok', false, 'motivo', 'mesa_ocupada');
    end if;
  elsif v_estado <> 'pendiente' then
    v_mesas := public.elegir_mesas(v_inicio, v_fin, v_n,
                                   nullif(p_datos ->> 'zona_id', '')::uuid, null,
                                   v_origen = 'puerta');
    if v_mesas is null then
      if not p_forzar then
        return jsonb_build_object('ok', false, 'motivo', 'sin_mesa', 'puede_forzar', true);
      end if;
      v_aviso := 'sin_mesa';
    end if;
  end if;

  v_cliente := public.upsert_cliente(p_datos || jsonb_build_object('acepta_privacidad', false));

  begin
    insert into public.reserva (
      cliente_id, nombre, telefono, correo, idioma, inicio, fin, comensales, duracion_min,
      turno_nombre, estado, origen, zona_preferida_id, ocasion, tronas, silla_ruedas, alergias,
      notas, notas_internas, forzada, sentada_en, creada_por)
    values (
      v_cliente, coalesce(nullif(trim(p_datos ->> 'nombre'), ''), 'Sin reserva'),
      public.normalizar_telefono(p_datos ->> 'telefono'), nullif(trim(p_datos ->> 'correo'), ''),
      coalesce(p_datos ->> 'idioma', 'es'), v_inicio, v_fin, v_n, v_dur,
      public.turno_de(v_inicio), v_estado, v_origen,
      nullif(p_datos ->> 'zona_id', '')::uuid, nullif(trim(p_datos ->> 'ocasion'), ''),
      coalesce((p_datos ->> 'tronas')::int, 0), coalesce((p_datos ->> 'silla_ruedas')::boolean, false),
      nullif(trim(p_datos ->> 'alergias'), ''), nullif(trim(p_datos ->> 'notas'), ''),
      nullif(trim(p_datos ->> 'notas_internas'), ''), p_forzar,
      case when v_estado = 'sentada' then now() end, auth.uid())
    returning * into v_r;

    if v_mesas is not null then
      insert into public.asignacion (reserva_id, mesa_id, intervalo)
      select v_r.id, m, public.ocupacion_de(v_r) from unnest(v_mesas) m;
    end if;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'motivo', 'mesa_ocupada');
  end;

  perform public.guardar_arroces(v_r.id, p_datos -> 'arroces');
  return jsonb_build_object('ok', true, 'reserva_id', v_r.id, 'mesas', to_jsonb(v_mesas),
                            'aviso', v_aviso, 'codigo', v_r.codigo_gestion);
end $$;

-- Mesas de la distribución activa con su validez para una reserva concreta:
-- el mapa ilumina las válidas y atenúa las demás explicando el motivo.
create function public.mesas_validas(p_reserva uuid)
returns table (mesa_id uuid, valida boolean, motivo text, conflicto text)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_r public.reserva;
  v_ocupacion tstzrange;
  v_estancia tstzrange;
begin
  perform public.exigir_personal();
  select * into v_r from public.reserva where id = p_reserva;
  if not found then return; end if;
  v_ocupacion := public.ocupacion_de(v_r);
  v_estancia := tstzrange(v_r.inicio, v_r.fin);
  return query
  select m.id,
         m.capacidad_max >= v_r.comensales
           and public.mesa_libre(m.id, v_ocupacion, v_estancia, v_r.id),
         case
           when exists (select 1 from public.bloqueo b where b.mesa_id = m.id and b.rango && v_estancia)
             then 'bloqueada'
           when not public.mesa_libre(m.id, v_ocupacion, v_estancia, v_r.id) then 'ocupada'
           when m.capacidad_max < v_r.comensales then 'capacidad'
           else null end,
         (select r2.nombre || ' · ' || public.hhmm(r2.inicio)
            from public.asignacion a join public.reserva r2 on r2.id = a.reserva_id
           where a.mesa_id = m.id and a.activa and r2.id <> v_r.id
             and a.intervalo && v_ocupacion
           order by r2.inicio limit 1)
    from public.zona z
    join public.mesa m on m.distribucion_id =
         public.distribucion_activa(z.id, public.fecha_local(v_r.inicio), coalesce(v_r.turno_nombre, public.turno_de(v_r.inicio)))
   where z.activa and m.activa;
end $$;

create function public.asignar_reserva(p_reserva uuid, p_mesas uuid[], p_forzar boolean default false)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_r public.reserva;
  v_cap int;
  v_conflicto text;
begin
  perform public.exigir_personal();
  select * into v_r from public.reserva where id = p_reserva for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_encontrada'); end if;
  if v_r.estado in ('finalizada', 'cancelada', 'no_presentada') then
    return jsonb_build_object('ok', false, 'motivo', 'estado');
  end if;
  if p_mesas is null or cardinality(p_mesas) = 0 then
    delete from public.asignacion where reserva_id = p_reserva;
    return jsonb_build_object('ok', true);
  end if;

  select coalesce(sum(capacidad_max), 0) into v_cap from public.mesa where id = any (p_mesas);
  if v_cap < v_r.comensales and not p_forzar then
    return jsonb_build_object('ok', false, 'motivo', 'capacidad', 'puede_forzar', true);
  end if;

  if not public.mesas_libres(p_mesas, public.ocupacion_de(v_r), tstzrange(v_r.inicio, v_r.fin), v_r.id) then
    select r2.nombre || ' · ' || public.hhmm(r2.inicio) into v_conflicto
      from public.asignacion a join public.reserva r2 on r2.id = a.reserva_id
     where a.mesa_id = any (p_mesas) and a.activa and r2.id <> v_r.id
       and a.intervalo && public.ocupacion_de(v_r)
     order by r2.inicio limit 1;
    return jsonb_build_object('ok', false, 'motivo', 'conflicto', 'conflicto', v_conflicto);
  end if;

  begin
    delete from public.asignacion where reserva_id = p_reserva;
    insert into public.asignacion (reserva_id, mesa_id, intervalo)
    select p_reserva, m, public.ocupacion_de(v_r) from unnest(p_mesas) m;
    if p_forzar then update public.reserva set forzada = true where id = p_reserva; end if;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'motivo', 'conflicto');
  end;
  return jsonb_build_object('ok', true);
end $$;

-- Cambios de estado desde la sala: sentar, liberar, cancelar, no presentada...
create function public.cambiar_estado(p_reserva uuid, p_estado public.estado_reserva)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_r public.reserva;
  v_validas text[];
begin
  perform public.exigir_personal();
  select * into v_r from public.reserva where id = p_reserva for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_encontrada'); end if;

  v_validas := case v_r.estado
    when 'pendiente'     then array['confirmada', 'cancelada']
    when 'confirmada'    then array['reconfirmada', 'sentada', 'cancelada', 'no_presentada']
    when 'reconfirmada'  then array['sentada', 'cancelada', 'no_presentada', 'confirmada']
    when 'sentada'       then array['finalizada', 'confirmada']
    when 'finalizada'    then array['sentada']
    when 'cancelada'     then array['confirmada']
    when 'no_presentada' then array['confirmada', 'sentada']
  end;
  if not (p_estado::text = any (v_validas)) then
    return jsonb_build_object('ok', false, 'motivo', 'transicion', 'desde', v_r.estado);
  end if;

  if p_estado = 'sentada' then
    update public.reserva set estado = 'sentada', sentada_en = now(), finalizada_en = null,
                              sin_confirmar = false
     where id = p_reserva;
    -- Si llegan antes de su hora, la mesa queda ocupada desde ya (si está libre).
    begin
      update public.asignacion
         set intervalo = tstzrange(least(lower(intervalo), now()),
                                   greatest(upper(intervalo), v_r.fin + public.minutos(c.margen_min))),
             activa = true
       where reserva_id = p_reserva;
    exception when exclusion_violation then null;
    end;
  elsif p_estado = 'finalizada' then
    update public.reserva set estado = 'finalizada', finalizada_en = now() where id = p_reserva;
    -- Mesa libre de inmediato, aunque sobrara tiempo previsto.
    update public.asignacion
       set intervalo = tstzrange(lower(intervalo), greatest(now(), lower(intervalo) + interval '1 minute'))
     where reserva_id = p_reserva and activa;
  elsif p_estado in ('cancelada', 'no_presentada') then
    update public.reserva
       set estado = p_estado,
           cancelada_en = case when p_estado = 'cancelada' then now() end,
           cancelada_por = case when p_estado = 'cancelada' then 'restaurante' end
     where id = p_reserva;
    update public.asignacion set activa = false where reserva_id = p_reserva and activa;
  elsif p_estado = 'reconfirmada' then
    update public.reserva set estado = 'reconfirmada', reconfirmada_en = now(), sin_confirmar = false
     where id = p_reserva;
  elsif p_estado = 'confirmada' then
    update public.reserva set estado = 'confirmada', sentada_en = null, finalizada_en = null,
                              cancelada_en = null, cancelada_por = null
     where id = p_reserva;
    begin
      update public.asignacion
         set intervalo = tstzrange(v_r.inicio, v_r.fin + public.minutos(c.margen_min)), activa = true
       where reserva_id = p_reserva;
    exception when exclusion_violation then
      -- La mesa ya está ocupada por otra reserva: se queda sin mesa asignada.
      delete from public.asignacion where reserva_id = p_reserva;
      return jsonb_build_object('ok', true, 'aviso', 'sin_mesa');
    end;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Edición de una reserva desde el panel (hora, comensales, duración, datos).
create function public.modificar_reserva_personal(p_reserva uuid, p_datos jsonb, p_forzar boolean default false)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_r public.reserva;
  v_inicio timestamptz;
  v_n int;
  v_dur int;
  v_fin timestamptz;
  v_mesas uuid[];
  v_actuales uuid[];
  v_regla text;
  v_cap int;
  v_aviso text;
  v_error text;
begin
  perform public.exigir_personal();
  select * into v_r from public.reserva where id = p_reserva for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_encontrada'); end if;

  v_inicio := coalesce((p_datos ->> 'inicio')::timestamptz, v_r.inicio);
  v_n := coalesce((p_datos ->> 'comensales')::int, v_r.comensales);
  v_dur := coalesce((p_datos ->> 'duracion_min')::int,
                    case when v_n <> v_r.comensales then public.duracion_para(v_n) else v_r.duracion_min end);
  v_fin := v_inicio + public.minutos(v_dur);

  if p_datos ? 'arroces' then
    v_error := public.validar_arroces(p_datos -> 'arroces', v_n);
    if v_error is not null then return jsonb_build_object('ok', false, 'motivo', v_error); end if;
  end if;

  if (v_inicio, v_n, v_dur) is distinct from (v_r.inicio, v_r.comensales, v_r.duracion_min) then
    if v_r.origen <> 'puerta' and not p_forzar and v_inicio <> v_r.inicio then
      v_regla := public.incumple_reglas(v_inicio, v_n, v_r.id);
      if v_regla is not null then
        return jsonb_build_object('ok', false, 'motivo', v_regla, 'puede_forzar', true);
      end if;
    end if;

    select array_agg(mesa_id) into v_actuales from public.asignacion where reserva_id = v_r.id and activa;
    select coalesce(sum(capacidad_max), 0) into v_cap from public.mesa where id = any (v_actuales);

    if v_actuales is not null and v_cap >= v_n
       and public.mesas_libres(v_actuales, tstzrange(v_inicio, v_fin + public.minutos(c.margen_min)),
                               tstzrange(v_inicio, v_fin), v_r.id) then
      v_mesas := v_actuales;
    else
      v_mesas := public.elegir_mesas(v_inicio, v_fin, v_n, v_r.zona_preferida_id, v_r.id);
    end if;
    if v_mesas is null and not p_forzar then
      return jsonb_build_object('ok', false, 'motivo', 'sin_mesa', 'puede_forzar', true);
    end if;
    if v_mesas is null then v_aviso := 'sin_mesa'; end if;

    begin
      delete from public.asignacion where reserva_id = v_r.id;
      update public.reserva
         set inicio = v_inicio, fin = v_fin, comensales = v_n, duracion_min = v_dur,
             turno_nombre = public.turno_de(v_inicio), forzada = forzada or p_forzar,
             recordatorio_enviado_en = case when public.fecha_local(v_inicio) <> public.fecha_local(v_r.inicio)
                                            then null else recordatorio_enviado_en end
       where id = v_r.id
       returning * into v_r;
      if v_mesas is not null then
        insert into public.asignacion (reserva_id, mesa_id, intervalo)
        select v_r.id, m, public.ocupacion_de(v_r) from unnest(v_mesas) m;
      end if;
    exception when exclusion_violation then
      return jsonb_build_object('ok', false, 'motivo', 'mesa_ocupada');
    end;
  end if;

  update public.reserva set
    nombre = coalesce(nullif(trim(p_datos ->> 'nombre'), ''), nombre),
    telefono = case when p_datos ? 'telefono' then public.normalizar_telefono(p_datos ->> 'telefono') else telefono end,
    correo = case when p_datos ? 'correo' then nullif(trim(p_datos ->> 'correo'), '') else correo end,
    alergias = case when p_datos ? 'alergias' then nullif(trim(p_datos ->> 'alergias'), '') else alergias end,
    notas = case when p_datos ? 'notas' then nullif(trim(p_datos ->> 'notas'), '') else notas end,
    notas_internas = case when p_datos ? 'notas_internas' then nullif(trim(p_datos ->> 'notas_internas'), '') else notas_internas end,
    ocasion = case when p_datos ? 'ocasion' then nullif(trim(p_datos ->> 'ocasion'), '') else ocasion end,
    tronas = coalesce((p_datos ->> 'tronas')::int, tronas),
    silla_ruedas = coalesce((p_datos ->> 'silla_ruedas')::boolean, silla_ruedas),
    zona_preferida_id = case when p_datos ? 'zona_id' then nullif(p_datos ->> 'zona_id', '')::uuid else zona_preferida_id end
  where id = v_r.id;
  if p_datos ? 'arroces' then
    perform public.guardar_arroces(v_r.id, p_datos -> 'arroces');
  end if;
  return jsonb_build_object('ok', true, 'aviso', v_aviso);
end $$;

-- «Reorganizar turno»: recoloca las reservas no sentadas de una zona para
-- aprovechar mejor la sala. Con p_aplicar = false solo devuelve la vista previa.
create function public.reorganizar_turno(p_fecha date, p_turno text, p_zona uuid, p_aplicar boolean default false)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_dist uuid := public.distribucion_activa(p_zona, p_fecha, p_turno);
  v_mesas_dist uuid[];
  v_r record;
  v_cand record;
  v_ocupadas_mesa uuid[] := '{}';
  v_ocupadas_rango tstzrange[] := '{}';
  v_plan jsonb := '[]'::jsonb;
  v_elegidas uuid[];
  v_libre boolean;
  i int;
  m uuid;
  v_item jsonb;
begin
  perform public.exigir_personal();
  if v_dist is null then return jsonb_build_object('ok', false, 'motivo', 'sin_distribucion'); end if;
  select array_agg(id) into v_mesas_dist from public.mesa where distribucion_id = v_dist and activa;

  -- Ocupación fija: lo que no se mueve (sentadas, otros turnos, bloqueos, retenciones).
  select coalesce(array_agg(a.mesa_id), '{}'), coalesce(array_agg(
           case when r.estado = 'sentada'
                then tstzrange(lower(a.intervalo), greatest(upper(a.intervalo), now() + public.minutos(c.margen_min)))
                else a.intervalo end), '{}')
    into v_ocupadas_mesa, v_ocupadas_rango
    from public.asignacion a join public.reserva r on r.id = a.reserva_id
   where a.activa and a.mesa_id = any (v_mesas_dist)
     and not (r.estado in ('confirmada', 'reconfirmada')
              and public.fecha_local(r.inicio) = p_fecha and r.turno_nombre = p_turno);
  select v_ocupadas_mesa || coalesce(array_agg(b.mesa_id), '{}'),
         v_ocupadas_rango || coalesce(array_agg(b.rango), '{}')
    into v_ocupadas_mesa, v_ocupadas_rango
    from public.bloqueo b where b.mesa_id = any (v_mesas_dist);
  select v_ocupadas_mesa || coalesce(array_agg(t.mesa_id), '{}'),
         v_ocupadas_rango || coalesce(array_agg(t.intervalo), '{}')
    into v_ocupadas_mesa, v_ocupadas_rango
    from public.retencion t where t.mesa_id = any (v_mesas_dist) and t.caduca_en > now();

  -- Reservas a recolocar: las grandes primero, después por hora.
  for v_r in
    select r.*, public.ocupacion_de(r) as ocup,
           (select array_agg(a.mesa_id) from public.asignacion a where a.reserva_id = r.id and a.activa) as actuales
      from public.reserva r
     where public.fecha_local(r.inicio) = p_fecha and r.turno_nombre = p_turno
       and r.estado in ('confirmada', 'reconfirmada')
       and (exists (select 1 from public.asignacion a where a.reserva_id = r.id and a.activa
                      and a.mesa_id = any (v_mesas_dist))
            or (not exists (select 1 from public.asignacion a where a.reserva_id = r.id and a.activa)
                and (r.zona_preferida_id is null or r.zona_preferida_id = p_zona)))
     order by r.comensales desc, r.inicio
  loop
    v_elegidas := null;
    for v_cand in select * from public.candidatos(v_dist, v_r.comensales, false) loop
      v_libre := true;
      foreach m in array v_cand.mesas loop
        for i in 1 .. coalesce(cardinality(v_ocupadas_mesa), 0) loop
          if v_ocupadas_mesa[i] = m and v_ocupadas_rango[i] && v_r.ocup then
            v_libre := false; exit;
          end if;
        end loop;
        exit when not v_libre;
      end loop;
      if v_libre then v_elegidas := v_cand.mesas; exit; end if;
    end loop;

    if v_elegidas is not null then
      foreach m in array v_elegidas loop
        v_ocupadas_mesa := v_ocupadas_mesa || m;
        v_ocupadas_rango := v_ocupadas_rango || v_r.ocup;
      end loop;
    end if;

    v_plan := v_plan || jsonb_build_object(
      'reserva_id', v_r.id, 'nombre', v_r.nombre, 'hora', public.hhmm(v_r.inicio),
      'comensales', v_r.comensales,
      'antes', coalesce((select jsonb_agg(nombre order by nombre) from public.mesa where id = any (v_r.actuales)), '[]'),
      'despues', coalesce((select jsonb_agg(nombre order by nombre) from public.mesa where id = any (v_elegidas)), '[]'),
      'mesas', to_jsonb(v_elegidas),
      'sin_sitio', v_elegidas is null,
      'cambia', case when v_elegidas is null then false
                     else v_r.actuales is null
                          or not (v_r.actuales @> v_elegidas and v_r.actuales <@ v_elegidas) end);
  end loop;

  if p_aplicar then
    if exists (select 1 from jsonb_array_elements(v_plan) e where (e ->> 'sin_sitio')::boolean) then
      return jsonb_build_object('ok', false, 'motivo', 'plan_incompleto', 'plan', v_plan);
    end if;
    for v_item in select * from jsonb_array_elements(v_plan) loop
      if (v_item ->> 'cambia')::boolean then
        delete from public.asignacion where reserva_id = (v_item ->> 'reserva_id')::uuid;
      end if;
    end loop;
    for v_item in select * from jsonb_array_elements(v_plan) loop
      if (v_item ->> 'cambia')::boolean and jsonb_typeof(v_item -> 'mesas') = 'array' then
        insert into public.asignacion (reserva_id, mesa_id, intervalo)
        select (v_item ->> 'reserva_id')::uuid, x::uuid,
               public.ocupacion_de(r)
          from jsonb_array_elements_text(v_item -> 'mesas') x,
               public.reserva r where r.id = (v_item ->> 'reserva_id')::uuid;
      end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'plan', v_plan,
    'cambios', (select count(*) from jsonb_array_elements(v_plan) e where (e ->> 'cambia')::boolean));
end $$;

-- -----------------------------------------------------------------------------
-- Tareas periódicas
-- -----------------------------------------------------------------------------
create function public.tick()
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_ret int;
  v_sin int;
  v_anon int;
begin
  delete from public.retencion where caduca_en <= now();
  get diagnostics v_ret = row_count;

  -- Sin respuesta al recordatorio: la sala debe llamar.
  update public.reserva
     set sin_confirmar = true
   where estado = 'confirmada' and not sin_confirmar
     and recordatorio_enviado_en is not null and reconfirmada_en is null
     and inicio - now() <= make_interval(hours => c.sin_confirmar_horas)
     and inicio > now();
  get diagnostics v_sin = row_count;

  -- RGPD: clientes inactivos durante 24 meses se anonimizan.
  update public.cliente
     set nombre = 'Cliente anonimizado', telefono = 'anon-' || id::text, correo = null,
         alergias = null, preferencias = null, notas_internas = null,
         consiente_comercial = false, anonimizado = true
   where not anonimizado and ultima_actividad_en < now() - interval '24 months';
  get diagnostics v_anon = row_count;

  return jsonb_build_object('retenciones_caducadas', v_ret, 'sin_confirmar', v_sin,
                            'clientes_anonimizados', v_anon);
end $$;

-- Límite de intentos por clave (IP, correo...) en una ventana deslizante simple.
create function public.consumir_intento(p_clave text, p_maximo int, p_ventana_seg int)
returns boolean
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_contador int;
begin
  insert into public.limite_intentos as l (clave, ventana_inicio, contador)
  values (p_clave, now(), 1)
  on conflict (clave) do update set
    contador = case when l.ventana_inicio < now() - make_interval(secs => p_ventana_seg)
                    then 1 else l.contador + 1 end,
    ventana_inicio = case when l.ventana_inicio < now() - make_interval(secs => p_ventana_seg)
                          then now() else l.ventana_inicio end
  returning contador into v_contador;
  return v_contador <= p_maximo;
end $$;

-- -----------------------------------------------------------------------------
-- Privilegios de ejecución
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Usadas por las políticas RLS: las evalúa el rol que consulta.
grant execute on function public.rol_actual(), public.es_personal(), public.puede_gestionar(),
  public.es_admin(), public.es_servicio() to anon, authenticated;
grant execute on function public.clave_cambiada() to authenticated;

-- Panel (comprueban el rol dentro).
grant execute on function
  public.horas_disponibles(date, int, uuid, uuid, uuid, boolean),
  public.dias_disponibles(date, date, int),
  public.distribucion_activa(uuid, date, text),
  public.crear_reserva_personal(jsonb, boolean),
  public.mesas_validas(uuid),
  public.asignar_reserva(uuid, uuid[], boolean),
  public.cambiar_estado(uuid, public.estado_reserva),
  public.modificar_reserva_personal(uuid, jsonb, boolean),
  public.reorganizar_turno(date, text, uuid, boolean),
  public.hora_local(date, time), public.fecha_local(timestamptz), public.hhmm(timestamptz),
  public.duracion_para(int), public.turno_de(timestamptz)
to authenticated;
