-- =============================================================================
-- RGPD de clientes: anonimización completa y exportación de datos.
--
-- Hasta ahora la anonimización por inactividad (24 meses) solo vaciaba la ficha del
-- cliente: sus reservas, la lista de espera, los correos y el registro de cambios
-- conservaban nombre, teléfono y correo. Ahora una sola función lo borra todo y la usan
-- tanto la tarea periódica como el botón «Anonimizar» del administrador (derecho de
-- supresión). Las reservas se conservan sin datos personales para los informes.
-- =============================================================================

create function public.anonimizar_datos_cliente(p_cliente uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_reservas uuid[];
  v_esperas uuid[];
  v_campos text[] := array['nombre', 'telefono', 'correo', 'alergias', 'notas', 'ocasion',
                           'preferencias', 'notas_internas', 'destinatario', 'cuerpo_texto'];
begin
  select coalesce(array_agg(id), '{}') into v_reservas from public.reserva where cliente_id = p_cliente;
  select coalesce(array_agg(id), '{}') into v_esperas from public.lista_espera where cliente_id = p_cliente;

  update public.cliente
     set nombre = 'Cliente anonimizado', telefono = 'anon-' || id::text, correo = null,
         alergias = null, preferencias = null, notas_internas = null,
         consiente_comercial = false, anonimizado = true
   where id = p_cliente;

  update public.reserva
     set nombre = 'Cliente anonimizado', telefono = null, correo = null, alergias = null,
         notas = null, ocasion = null
   where id = any (v_reservas);

  update public.lista_espera
     set nombre = 'Cliente anonimizado', telefono = 'anonimizado', correo = null
   where id = any (v_esperas);

  update public.mensaje
     set destinatario = 'anonimizado', cuerpo_texto = ''
   where reserva_id = any (v_reservas) or lista_espera_id = any (v_esperas);

  -- El registro de cambios guarda copias de las filas: se les quitan los datos personales
  -- (incluidas las que acaban de generar las actualizaciones de arriba).
  update public.registro_cambios
     set antes = antes - v_campos, despues = despues - v_campos
   where (entidad = 'cliente' and entidad_id = p_cliente::text)
      or (entidad = 'reserva' and entidad_id = any (select r::text from unnest(v_reservas) r))
      or (entidad = 'lista_espera' and entidad_id = any (select e::text from unnest(v_esperas) e));
end $$;

revoke execute on function public.anonimizar_datos_cliente(uuid) from public, anon, authenticated;

-- Derecho de supresión, a petición del cliente: solo el administrador.
create function public.anonimizar_cliente(p_cliente uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if not public.es_admin() and not public.es_servicio() then
    raise exception 'Solo el administrador' using errcode = '42501';
  end if;
  if not exists (select 1 from public.cliente where id = p_cliente and not anonimizado) then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  perform public.anonimizar_datos_cliente(p_cliente);
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.anonimizar_cliente(uuid) from public, anon;
grant execute on function public.anonimizar_cliente(uuid) to authenticated;

-- Derecho de acceso: todos los datos de un cliente en un solo documento. Administrador.
create function public.exportar_cliente(p_cliente uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.es_admin() and not public.es_servicio() then
    raise exception 'Solo el administrador' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'generado_en', now(),
      'cliente', to_jsonb(c),
      'reservas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'inicio', r.inicio, 'comensales', r.comensales, 'estado', r.estado, 'origen', r.origen,
          'nombre', r.nombre, 'telefono', r.telefono, 'correo', r.correo, 'alergias', r.alergias,
          'ocasion', r.ocasion, 'notas', r.notas, 'creada_en', r.creada_en,
          'arroces', (select coalesce(jsonb_agg(jsonb_build_object('plato', p.nombre ->> 'es', 'raciones', e.raciones)), '[]')
                        from public.encargo_arroz e join public.plato p on p.id = e.plato_id where e.reserva_id = r.id))
          order by r.inicio)
        from public.reserva r where r.cliente_id = c.id), '[]'),
      'lista_espera', coalesce((
        select jsonb_agg(jsonb_build_object('fecha', e.fecha, 'turno', e.turno_nombre, 'comensales', e.comensales,
                                            'estado', e.estado, 'creado_en', e.creado_en) order by e.creado_en)
        from public.lista_espera e where e.cliente_id = c.id), '[]'),
      'correos', coalesce((
        select jsonb_agg(jsonb_build_object('tipo', m.tipo, 'asunto', m.asunto, 'estado', m.estado, 'creado_en', m.creado_en) order by m.creado_en)
        from public.mensaje m
       where m.reserva_id in (select id from public.reserva where cliente_id = c.id)
          or m.lista_espera_id in (select id from public.lista_espera where cliente_id = c.id)), '[]'))
    from public.cliente c where c.id = p_cliente
  );
end $$;

revoke execute on function public.exportar_cliente(uuid) from public, anon;
grant execute on function public.exportar_cliente(uuid) to authenticated;

-- La tarea periódica usa la misma anonimización completa para los inactivos.
create or replace function public.tick()
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  c public.configuracion := public.cfg();
  v_ret int;
  v_sin int;
  v_anon int := 0;
  v_cliente uuid;
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

  -- RGPD: clientes inactivos durante 24 meses se anonimizan (ficha y todo lo asociado).
  for v_cliente in
    select id from public.cliente
     where not anonimizado and ultima_actividad_en < now() - interval '24 months'
  loop
    perform public.anonimizar_datos_cliente(v_cliente);
    v_anon := v_anon + 1;
  end loop;

  return jsonb_build_object('retenciones_caducadas', v_ret, 'sin_confirmar', v_sin,
                            'clientes_anonimizados', v_anon);
end $$;
