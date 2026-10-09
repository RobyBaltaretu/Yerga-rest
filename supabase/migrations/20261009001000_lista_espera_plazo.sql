-- =============================================================================
-- Lista de espera con plazo para aceptar (fase 2 de la definición).
--
-- Al liberarse una mesa se retiene para el primero de la lista que cabe, durante
-- `espera_plazo_min` minutos (15 por defecto). Recibe un correo con un enlace de un
-- solo uso para aceptarla con un toque. Si no acepta a tiempo, la oferta caduca, la mesa
-- se libera y el aviso pasa al siguiente (lo hace la tarea periódica).
-- =============================================================================

alter table public.configuracion
  add column espera_plazo_min int not null default 15 check (espera_plazo_min between 5 and 120);

alter table public.lista_espera
  add column oferta_token uuid unique,
  add column oferta_inicio timestamptz,
  add column oferta_hasta timestamptz,
  add column oferta_liberada_por uuid references public.reserva (id) on delete set null,
  add column reserva_id uuid references public.reserva (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Ofrece la mesa liberada al primero que cabe. Devuelve la entrada con la oferta (el
-- correo lo envía la aplicación) o null si nadie cabe.
-- -----------------------------------------------------------------------------
create or replace function public.avisar_lista_espera(p_reserva uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_r public.reserva;
  v_e public.lista_espera;
  v_hora record;
  v_ret jsonb;
  v_token uuid;
  v_hasta timestamptz := now() + public.minutos(c.espera_plazo_min);
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
    -- La hora que se libera si le vale; si no, la libre más cercana a la que pidió.
    for v_hora in
      select h.inicio from public.horas_disponibles(v_e.fecha, v_e.comensales) h
       where h.disponible and h.turno = v_e.turno_nombre
       order by (h.inicio = v_r.inicio) desc,
                abs(extract(epoch from (h.inicio - public.hora_local(v_e.fecha, coalesce(v_e.hora_preferida, (v_r.inicio at time zone 'Europe/Madrid')::time)))))
       limit 3
    loop
      v_ret := public.retener_mesa(v_hora.inicio, v_e.comensales);
      if (v_ret ->> 'ok')::boolean then
        v_token := (v_ret ->> 'token')::uuid;
        update public.retencion set caduca_en = v_hasta where token = v_token;
        update public.lista_espera
           set estado = 'avisado', avisado_en = now(), oferta_token = v_token,
               oferta_inicio = v_hora.inicio, oferta_hasta = v_hasta, oferta_liberada_por = p_reserva
         where id = v_e.id
        returning * into v_e;
        return to_jsonb(v_e);
      end if;
    end loop;
  end loop;
  return null;
end $$;

-- -----------------------------------------------------------------------------
-- Datos de una oferta para la página de aceptación (solo el servidor la llama).
-- -----------------------------------------------------------------------------
create function public.oferta_espera(p_token uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', split_part(e.nombre, ' ', 1), 'idioma', e.idioma, 'comensales', e.comensales,
    'inicio', e.oferta_inicio, 'hasta', e.oferta_hasta,
    'estado', case
      when e.reserva_id is not null then 'aceptada'
      when e.estado <> 'avisado' or e.oferta_hasta <= now() then 'caducada'
      else 'vigente' end,
    'codigo', (select r.codigo_gestion from public.reserva r where r.id = e.reserva_id))
  from public.lista_espera e
  where e.oferta_token = p_token
$$;

-- -----------------------------------------------------------------------------
-- Aceptar la oferta: crea la reserva con los datos de la lista de espera sobre la
-- mesa retenida. Atómico; si caducó o ya se usó, no hace nada.
-- -----------------------------------------------------------------------------
create function public.aceptar_oferta_espera(p_token uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_e public.lista_espera;
  v_res jsonb;
begin
  select * into v_e from public.lista_espera where oferta_token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if v_e.reserva_id is not null then
    return jsonb_build_object('ok', true, 'reserva_id', v_e.reserva_id,
      'codigo', (select codigo_gestion from public.reserva where id = v_e.reserva_id), 'ya_aceptada', true);
  end if;
  if v_e.estado <> 'avisado' or v_e.oferta_hasta <= now() then
    return jsonb_build_object('ok', false, 'motivo', 'caducada');
  end if;

  v_res := public.confirmar_reserva(p_token, jsonb_build_object(
    'inicio', v_e.oferta_inicio, 'comensales', v_e.comensales, 'nombre', v_e.nombre,
    'telefono', v_e.telefono, 'correo', v_e.correo, 'idioma', v_e.idioma,
    'acepta_privacidad', true, 'notas', 'Desde la lista de espera'));
  if (v_res ->> 'ok')::boolean then
    update public.lista_espera
       set estado = 'atendido', reserva_id = (v_res ->> 'reserva_id')::uuid
     where id = v_e.id;
  end if;
  return v_res;
end $$;

-- -----------------------------------------------------------------------------
-- Ofertas sin respuesta: caducan y la mesa vuelve a quedar libre. Devuelve las
-- reservas cuya mesa hay que ofrecer al siguiente de la lista.
-- -----------------------------------------------------------------------------
create function public.caducar_ofertas_espera()
returns uuid[]
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_liberadas uuid[];
begin
  with caducadas as (
    update public.lista_espera
       set estado = 'caducado'
     where estado = 'avisado' and reserva_id is null and oferta_hasta <= now()
    returning oferta_token, oferta_liberada_por
  ), borradas as (
    delete from public.retencion t using caducadas c where t.token = c.oferta_token
  )
  select array_agg(distinct oferta_liberada_por) filter (where oferta_liberada_por is not null)
    into v_liberadas from caducadas;
  return coalesce(v_liberadas, '{}');
end $$;

revoke execute on function public.oferta_espera(uuid), public.aceptar_oferta_espera(uuid),
  public.caducar_ofertas_espera() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- El correo de aviso ahora lleva el plazo y el enlace para aceptar. Solo se cambia la
-- plantilla si sigue siendo la original (no pisa textos editados en el panel).
-- -----------------------------------------------------------------------------
update public.plantilla_mensaje set
  asunto = 'Tienes mesa en {restaurante}: acéptala en {plazo} minutos',
  cuerpo = E'Hola, {nombre}:\n\nSe ha liberado una mesa para {comensales} el {fecha} a las {hora} y te la hemos guardado.\n\nAcéptala con un toque antes de {plazo} minutos: {enlace}\n\nSi no te viene bien, no hagas nada: pasará a la siguiente persona de la lista.'
where tipo = 'lista_espera' and idioma = 'es' and asunto = 'Se ha liberado una mesa en {restaurante}';

update public.plantilla_mensaje set
  asunto = 'Tens taula a {restaurante}: accepta-la en {plazo} minuts',
  cuerpo = E'Hola, {nombre}:\n\nS''ha alliberat una taula per a {comensales} el {fecha} a les {hora} i te l''hem guardada.\n\nAccepta-la amb un toc abans de {plazo} minuts: {enlace}\n\nSi no et va bé, no faces res: passarà a la següent persona de la llista.'
where tipo = 'lista_espera' and idioma = 'va' and asunto = 'S''ha alliberat una taula a {restaurante}';

update public.plantilla_mensaje set
  asunto = 'A table is yours at {restaurante}: accept it within {plazo} minutes',
  cuerpo = E'Hi {nombre},\n\nA table for {comensales} has opened up on {fecha} at {hora} and we are holding it for you.\n\nAccept it with one tap within {plazo} minutes: {enlace}\n\nIf it does not suit you, do nothing: it will go to the next person on the list.'
where tipo = 'lista_espera' and idioma = 'en' and asunto = 'A table has opened up at {restaurante}';
