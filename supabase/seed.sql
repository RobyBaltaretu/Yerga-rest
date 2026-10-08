-- =============================================================================
-- Semilla de DEMOSTRACIÓN (solo local y CI; nunca en producción)
--
-- El contenido de ejemplo (local, plano, turnos, carta, textos y plantillas) lo carga
-- la migración `20261009000900_contenido_inicial.sql`. Aquí solo van los usuarios de
-- prueba, con contraseñas conocidas, y unas reservas para ver el panel con vida.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Personal: uno por rol. Contraseñas a cambiar en el primer acceso.
--   administrador@yerga.test / Yerga-Admin-2026
--   encargado@yerga.test     / Yerga-Encargado-2026
--   sala@yerga.test          / Yerga-Sala-2026
-- -----------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-4000-e000-000000000001'::uuid, 'administrador@yerga.test', 'Yerga-Admin-2026', 'Propietario', 'administrador'::public.rol_usuario),
      ('00000000-0000-4000-e000-000000000002'::uuid, 'encargado@yerga.test', 'Yerga-Encargado-2026', 'Jefe de sala', 'encargado'::public.rol_usuario),
      ('00000000-0000-4000-e000-000000000003'::uuid, 'sala@yerga.test', 'Yerga-Sala-2026', 'Recepción', 'sala'::public.rol_usuario)
    ) v (id, correo, clave, nombre, rol)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.correo,
      extensions.crypt(u.clave, extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}', jsonb_build_object('nombre', u.nombre),
      now(), now(), '', '', '', '', '', '', '', '');
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.correo, 'email_verified', true),
            'email', now(), now(), now());
    insert into public.usuario (id, nombre, correo, rol) values (u.id, u.nombre, u.correo, u.rol);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Reservas de ejemplo: unas 30 repartidas en la semana en curso, para ver el
-- panel con vida. Se crean con el propio motor, así respetan las reglas.
-- -----------------------------------------------------------------------------
do $$
declare
  v_nombres text[] := array[
    'Vicent Ferrer', 'Amparo Soler', 'Carmen Ruiz', 'Pep Martí', 'Laura Gómez', 'Toni Navarro',
    'Lucía Peris', 'Hugo Blasco', 'Emma Wilson', 'Jordi Llorens', 'Rosa Climent', 'Álvaro Sanz',
    'Neus Ribes', 'Marc Puig', 'Elena Torres', 'Paco Alemany', 'Julia Fuster', 'Tom Becker',
    'Maite Ortega', 'Xavier Bou', 'Inés Mora', 'Raúl Pastor', 'Clara Vidal', 'Sergi Roig',
    'Pilar Esteve', 'David Gil', 'Anna Sanchis', 'Óscar Belda', 'Sofía Llopis', 'Iván Cano'];
  v_horas text[] := array['13:30', '14:00', '14:00', '14:30', '14:15', '15:00', '21:00', '21:30', '22:00'];
  v_tam int[] := array[2, 2, 4, 3, 4, 6, 2, 5, 8, 4];
  v_ocasion text[] := array[null, null, 'Cumpleaños', null, 'Aniversario', null, null, null];
  v_alergia text[] := array[null, null, null, 'Celiaquía', null, null, 'Marisco (grave)', null, null, null];
  v_dia date;
  v_hora text;
  v_n int;
  v_i int := 0;
  v_res jsonb;
  v_inicio timestamptz;
  v_paella uuid := (select id from public.plato where slug = 'paella-valenciana');
  v_senyoret uuid := (select id from public.plato where slug = 'arros-del-senyoret');
  v_grupo date;
begin
  perform setseed(0.42);
  for v_dia in select g::date from generate_series(current_date - 2, current_date + 5, interval '1 day') g loop
    for k in 1 .. 5 loop
      exit when v_i >= 30;
      v_hora := v_horas[1 + floor(random() * array_length(v_horas, 1))::int];
      v_n := v_tam[1 + floor(random() * array_length(v_tam, 1))::int];
      v_inicio := public.hora_local(v_dia, v_hora::time);
      if public.incumple_reglas(v_inicio, v_n) is not null then continue; end if;
      v_res := public.crear_reserva_personal(jsonb_build_object(
        'inicio', v_inicio, 'comensales', v_n,
        'nombre', v_nombres[1 + v_i],
        'telefono', '6' || lpad((10000000 + v_i * 7919)::text, 8, '0'),
        'correo', lower(replace(split_part(v_nombres[1 + v_i], ' ', 1), 'á', 'a')) || '.' || v_i || '@example.com',
        'origen', case when v_i % 3 = 0 then 'telefono' else 'web' end,
        'idioma', case when v_nombres[1 + v_i] in ('Emma Wilson', 'Tom Becker') then 'en'
                       when v_i % 5 = 0 then 'va' else 'es' end,
        'ocasion', v_ocasion[1 + v_i % array_length(v_ocasion, 1)],
        'alergias', v_alergia[1 + v_i % array_length(v_alergia, 1)],
        'tronas', case when v_n >= 4 and v_i % 4 = 0 then 1 else 0 end,
        'arroces', case
          when v_i % 2 = 0 then jsonb_build_array(jsonb_build_object('plato_id', v_paella, 'raciones', v_n))
          when v_n >= 4 and v_i % 3 = 1 then jsonb_build_array(
            jsonb_build_object('plato_id', v_paella, 'raciones', 2),
            jsonb_build_object('plato_id', v_senyoret, 'raciones', 2))
          else '[]'::jsonb end
      ), false);
      if (v_res ->> 'ok')::boolean then
        v_i := v_i + 1;
      end if;
    end loop;
  end loop;

  -- Lo ya pasado se cierra como en un servicio real: la mayoría finalizadas,
  -- alguna no presentada; lo que está en curso, sentado.
  update public.reserva set estado = 'finalizada', sentada_en = inicio, finalizada_en = fin
   where fin < now() and estado = 'confirmada';
  update public.reserva set estado = 'no_presentada'
   where id in (select id from public.reserva where estado = 'finalizada' order by inicio limit 2);
  update public.asignacion a set activa = false
    from public.reserva r where r.id = a.reserva_id and r.estado = 'no_presentada';
  update public.reserva set estado = 'sentada', sentada_en = inicio
   where inicio <= now() and fin >= now() and estado = 'confirmada';
  -- Algunas futuras ya han respondido al recordatorio.
  update public.reserva set estado = 'reconfirmada', reconfirmada_en = now()
   where id in (select id from public.reserva where estado = 'confirmada' and inicio > now()
                order by inicio limit 3);
  -- Un grupo grande pendiente de aprobación, el próximo domingo.
  v_grupo := current_date + 1 + (7 - extract(dow from current_date + 1)::int) % 7;
  insert into public.reserva (nombre, telefono, correo, inicio, fin, comensales, duracion_min,
                              turno_nombre, estado, origen, notas)
  values ('Peña L''Arrosseret', '+34600111222', 'penya@example.com',
          public.hora_local(v_grupo, '14:00'), public.hora_local(v_grupo, '14:00') + interval '135 minutes',
          14, 135, 'comida', 'pendiente', 'web', 'Solicitud de grupo: comida de la peña.');
end $$;

-- Las reservas de la semilla no deben contar como cambios del personal.
delete from public.registro_cambios;
