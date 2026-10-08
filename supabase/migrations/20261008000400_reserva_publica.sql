-- =============================================================================
-- Reserva pública: solicitudes de grupo y lista de espera
-- =============================================================================

-- Grupos por encima del máximo online: solicitud que el restaurante aprueba.
-- Nace «pendiente» y sin mesa; no bloquea nada hasta que la sala la confirma.
create function public.solicitar_grupo(p_datos jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_inicio timestamptz := (p_datos ->> 'inicio')::timestamptz;
  v_n int := (p_datos ->> 'comensales')::int;
  v_dur int;
  v_cliente uuid;
  v_r public.reserva;
begin
  if v_inicio is null or v_n is null or v_n < 1
     or coalesce(trim(p_datos ->> 'nombre'), '') = ''
     or public.normalizar_telefono(p_datos ->> 'telefono') is null
     or not coalesce((p_datos ->> 'acepta_privacidad')::boolean, false) then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  end if;
  if v_inicio < now() then
    return jsonb_build_object('ok', false, 'motivo', 'fecha_pasada');
  end if;
  v_dur := public.duracion_para(v_n);
  v_cliente := public.upsert_cliente(p_datos);
  insert into public.reserva (
    cliente_id, nombre, telefono, correo, idioma, inicio, fin, comensales, duracion_min,
    turno_nombre, estado, origen, zona_preferida_id, ocasion, tronas, silla_ruedas, alergias, notas)
  values (
    v_cliente, trim(p_datos ->> 'nombre'), public.normalizar_telefono(p_datos ->> 'telefono'),
    nullif(trim(p_datos ->> 'correo'), ''), coalesce(p_datos ->> 'idioma', 'es'),
    v_inicio, v_inicio + public.minutos(v_dur), v_n, v_dur, public.turno_de(v_inicio),
    'pendiente', 'web', nullif(p_datos ->> 'zona_id', '')::uuid,
    nullif(trim(p_datos ->> 'ocasion'), ''), coalesce((p_datos ->> 'tronas')::int, 0),
    coalesce((p_datos ->> 'silla_ruedas')::boolean, false),
    nullif(trim(p_datos ->> 'alergias'), ''), nullif(trim(p_datos ->> 'notas'), ''))
  returning * into v_r;
  return jsonb_build_object('ok', true, 'reserva_id', v_r.id, 'codigo', v_r.codigo_gestion);
end $$;

-- «Avísame si se libera»: el cliente queda en la lista de espera de ese turno.
create function public.apuntar_lista_espera(p_datos jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_tel text := public.normalizar_telefono(p_datos ->> 'telefono');
  v_id uuid;
begin
  if coalesce(trim(p_datos ->> 'nombre'), '') = '' or v_tel is null
     or (p_datos ->> 'fecha') is null or (p_datos ->> 'turno') is null
     or not coalesce((p_datos ->> 'acepta_privacidad')::boolean, false) then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  end if;
  insert into public.lista_espera (
    cliente_id, nombre, telefono, correo, idioma, fecha, turno_nombre, hora_preferida, comensales)
  values (
    public.upsert_cliente(p_datos), trim(p_datos ->> 'nombre'), v_tel,
    nullif(trim(p_datos ->> 'correo'), ''), coalesce(p_datos ->> 'idioma', 'es'),
    (p_datos ->> 'fecha')::date, p_datos ->> 'turno', (p_datos ->> 'hora')::time,
    (p_datos ->> 'comensales')::int)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Al liberarse una mesa, se avisa al primero de la lista de ese turno que ahora
-- tenga hueco. Devuelve a quién avisar (el correo lo envía la aplicación).
create function public.avisar_lista_espera(p_reserva uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_r public.reserva;
  v_e public.lista_espera;
begin
  perform public.exigir_personal();
  select * into v_r from public.reserva where id = p_reserva;
  if not found then return null; end if;
  for v_e in
    select * from public.lista_espera
     where fecha = public.fecha_local(v_r.inicio) and turno_nombre = v_r.turno_nombre
       and estado = 'esperando' and correo is not null
     order by creado_en
  loop
    if exists (
      select 1 from public.horas_disponibles(v_e.fecha, v_e.comensales) h
       where h.disponible and h.turno = v_e.turno_nombre
    ) then
      update public.lista_espera set estado = 'avisado', avisado_en = now() where id = v_e.id;
      return to_jsonb(v_e);
    end if;
  end loop;
  return null;
end $$;

revoke execute on function public.solicitar_grupo(jsonb), public.apuntar_lista_espera(jsonb),
  public.avisar_lista_espera(uuid) from public, anon, authenticated;
grant execute on function public.avisar_lista_espera(uuid) to authenticated;
