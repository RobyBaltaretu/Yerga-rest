-- =============================================================================
-- Permisos por rol (RLS), auditoría y tiempo real
--
-- Roles del personal: administrador > encargado > sala.
--  - sala: opera reservas, clientes, lista de espera y bloqueos de mesa; no toca
--    la distribución, la configuración, la carta ni los usuarios.
--  - encargado: todo salvo usuarios y datos legales.
--  - administrador: todo.
-- La web pública nunca habla con la base de datos con la clave anónima salvo
-- para leer contenido público (carta, textos, horarios, reseñas).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funciones de rol
-- -----------------------------------------------------------------------------
create function public.rol_actual()
returns public.rol_usuario
language sql stable security definer
set search_path = ''
as $$
  select u.rol from public.usuario u where u.id = auth.uid() and u.activo
$$;

create function public.es_personal()
returns boolean
language sql stable
set search_path = ''
as $$ select public.rol_actual() is not null $$;

create function public.puede_gestionar()
returns boolean
language sql stable
set search_path = ''
as $$ select public.rol_actual() in ('administrador', 'encargado') $$;

create function public.es_admin()
returns boolean
language sql stable
set search_path = ''
as $$ select public.rol_actual() = 'administrador' $$;

-- El rol de servicio (servidor de la web pública y tareas programadas).
create function public.es_servicio()
returns boolean
language sql stable
set search_path = ''
as $$ select coalesce(auth.role(), '') = 'service_role' or session_user = 'postgres' $$;

-- -----------------------------------------------------------------------------
-- Datos legales de la configuración: solo administrador
-- -----------------------------------------------------------------------------
create function public.proteger_datos_legales()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.es_servicio() and not public.es_admin() and (
    new.razon_social is distinct from old.razon_social or
    new.cif is distinct from old.cif or
    new.domicilio_social is distinct from old.domicilio_social
  ) then
    raise exception 'Solo un administrador puede cambiar los datos legales'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger proteger_datos_legales before update on public.configuracion
  for each row execute function public.proteger_datos_legales();

-- Contenidos legales (aviso legal, privacidad, cookies): solo administrador.
create function public.proteger_contenido_legal()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_clave text := coalesce(new.clave, old.clave);
begin
  if v_clave like 'legal.%' and not public.es_servicio() and not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar los textos legales'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

create trigger proteger_contenido_legal before insert or update or delete on public.contenido
  for each row execute function public.proteger_contenido_legal();

-- -----------------------------------------------------------------------------
-- Auditoría: cada cambio queda registrado con usuario y hora
-- -----------------------------------------------------------------------------
create function public.registrar_cambio()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_antes jsonb;
  v_despues jsonb;
  v_id text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_antes := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_despues := to_jsonb(new); end if;
  -- El borrador del editor de mesas es voluminoso y cambia a menudo: no se audita.
  if tg_table_name = 'distribucion' then
    v_antes := v_antes - 'borrador';
    v_despues := v_despues - 'borrador';
    if tg_op = 'UPDATE' and v_antes = v_despues then return null; end if;
  end if;
  if tg_op = 'UPDATE' and v_antes = v_despues then return null; end if;
  v_id := coalesce(v_despues ->> 'id', v_antes ->> 'id', v_despues ->> 'clave', v_antes ->> 'clave');
  insert into public.registro_cambios (usuario_id, accion, entidad, entidad_id, antes, despues)
  values (auth.uid(), lower(tg_op), tg_table_name, v_id, v_antes, v_despues);
  return null;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'configuracion', 'zona', 'distribucion', 'programacion_distribucion', 'mesa',
    'combinacion', 'elemento_fijo', 'turno', 'bloqueo', 'cliente', 'reserva',
    'asignacion', 'encargo_arroz', 'lista_espera', 'plato', 'contenido', 'resena',
    'usuario', 'plantilla_mensaje'
  ] loop
    execute format(
      'create trigger auditar after insert or update or delete on public.%I
         for each row execute function public.registrar_cambio()', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'configuracion', 'zona', 'distribucion', 'programacion_distribucion', 'mesa',
    'combinacion', 'combinacion_mesa', 'elemento_fijo', 'turno', 'bloqueo', 'cliente',
    'reserva', 'asignacion', 'retencion', 'encargo_arroz', 'lista_espera', 'plato',
    'contenido', 'resena', 'usuario', 'registro_cambios', 'plantilla_mensaje',
    'mensaje', 'limite_intentos'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Contenido público: lectura para todos.
create policy "lectura publica" on public.configuracion for select using (true);
create policy "lectura publica" on public.zona for select using (true);
create policy "lectura publica" on public.turno for select using (true);
create policy "lectura publica" on public.contenido for select using (true);
create policy "lectura publica" on public.plato for select using (visible or public.es_personal());
create policy "lectura publica" on public.resena for select using (visible or public.es_personal());

-- Configuración y contenidos: encargado y administrador.
create policy "gestion" on public.configuracion for update
  using (public.puede_gestionar()) with check (public.puede_gestionar());
create policy "gestion" on public.zona for all
  using (public.puede_gestionar()) with check (public.puede_gestionar());
create policy "gestion" on public.turno for all
  using (public.puede_gestionar()) with check (public.puede_gestionar());
create policy "gestion" on public.contenido for all
  using (public.puede_gestionar()) with check (public.puede_gestionar());
create policy "gestion" on public.plato for all
  using (public.puede_gestionar()) with check (public.puede_gestionar());
create policy "gestion" on public.resena for all
  using (public.puede_gestionar()) with check (public.puede_gestionar());
create policy "lectura personal" on public.plantilla_mensaje for select using (public.es_personal());
create policy "gestion" on public.plantilla_mensaje for all
  using (public.puede_gestionar()) with check (public.puede_gestionar());

-- Distribución de la sala: el personal la lee; solo encargado y administrador la editan.
do $$
declare
  t text;
begin
  foreach t in array array[
    'distribucion', 'programacion_distribucion', 'mesa', 'combinacion',
    'combinacion_mesa', 'elemento_fijo'
  ] loop
    execute format(
      'create policy "lectura personal" on public.%I for select using (public.es_personal())', t);
    execute format(
      'create policy "gestion" on public.%I for all
         using (public.puede_gestionar()) with check (public.puede_gestionar())', t);
  end loop;
end $$;

-- Bloqueos: la sala puede bloquear y desbloquear mesas concretas; el resto, gestión.
create policy "lectura personal" on public.bloqueo for select using (public.es_personal());
create policy "gestion" on public.bloqueo for all
  using (public.puede_gestionar()) with check (public.puede_gestionar());
create policy "sala bloquea mesas" on public.bloqueo for insert
  with check (public.es_personal() and mesa_id is not null);
create policy "sala desbloquea mesas" on public.bloqueo for delete
  using (public.es_personal() and mesa_id is not null);

-- Operación diaria: todo el personal.
do $$
declare
  t text;
begin
  foreach t in array array['cliente', 'reserva', 'asignacion', 'encargo_arroz', 'lista_espera'] loop
    execute format(
      'create policy "lectura personal" on public.%I for select using (public.es_personal())', t);
    execute format(
      'create policy "alta personal" on public.%I for insert with check (public.es_personal())', t);
    execute format(
      'create policy "edicion personal" on public.%I for update
         using (public.es_personal()) with check (public.es_personal())', t);
  end loop;
end $$;
create policy "borrado admin" on public.cliente for delete using (public.es_admin());
create policy "borrado personal" on public.encargo_arroz for delete using (public.es_personal());
create policy "borrado personal" on public.lista_espera for delete using (public.es_personal());
create policy "borrado personal" on public.asignacion for delete using (public.es_personal());

create policy "lectura personal" on public.retencion for select using (public.es_personal());
create policy "lectura personal" on public.mensaje for select using (public.es_personal());

-- Usuarios: el personal ve a sus compañeros; solo el administrador los gestiona.
create policy "lectura personal" on public.usuario for select
  using (public.es_personal() or id = auth.uid());
create policy "gestion admin" on public.usuario for all
  using (public.es_admin()) with check (public.es_admin());

-- Registro de cambios: encargado y administrador.
create policy "lectura gestion" on public.registro_cambios for select using (public.puede_gestionar());

-- limite_intentos: sin políticas, solo accesible por funciones y el rol de servicio.

-- -----------------------------------------------------------------------------
-- Privilegios: la clave anónima solo lee lo público.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select on public.configuracion, public.zona, public.turno, public.contenido,
  public.plato, public.resena to anon;

-- Columnas legales y de contacto interno: la web las obtiene por el servidor.
revoke select on public.configuracion from anon;
grant select (
  id, intervalo_min, max_comensales_online, antelacion_max_dias, nombre_local, direccion,
  localidad, codigo_postal, telefono, whatsapp, correo, latitud, longitud, url_mapa,
  url_resenas, aparcamiento, razon_social, cif, domicilio_social
) on public.configuracion to anon;

-- Un miembro del personal solo puede cambiar su propia marca de cambio de clave.
create function public.clave_cambiada()
returns void
language sql security definer
set search_path = ''
as $$ update public.usuario set debe_cambiar_clave = false where id = auth.uid() $$;
revoke execute on function public.clave_cambiada() from public, anon;
grant execute on function public.clave_cambiada() to authenticated;

-- -----------------------------------------------------------------------------
-- Tiempo real: el mapa y la lista se actualizan solos en todas las tabletas.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table
  public.reserva, public.asignacion, public.bloqueo, public.lista_espera,
  public.mesa, public.distribucion, public.encargo_arroz;
