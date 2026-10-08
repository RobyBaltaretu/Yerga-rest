-- Generado con scripts/sql-vista-previa.sh: migraciones + datos de ejemplo.
-- Solo para un proyecto de Supabase vacío de vista previa. No usar en producción.

-- ===== supabase/migrations/20261008000100_esquema.sql =====
-- =============================================================================
-- Arrocería Yerga — esquema de datos
-- Todas las horas son timestamptz. Fechas y horas de turno se interpretan en
-- Europe/Madrid mediante las funciones hora_local() y fecha_local().
-- =============================================================================

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.rol_usuario as enum ('administrador', 'encargado', 'sala');
create type public.estado_reserva as enum (
  'pendiente', 'confirmada', 'reconfirmada', 'sentada', 'finalizada', 'cancelada', 'no_presentada'
);
create type public.origen_reserva as enum ('web', 'telefono', 'puerta');
create type public.forma_mesa as enum ('redonda', 'cuadrada', 'rectangular');
create type public.tipo_elemento as enum (
  'pared', 'barra', 'columna', 'puerta', 'ventana', 'cocina', 'planta'
);
create type public.estado_distribucion as enum ('borrador', 'publicada');
create type public.estado_espera as enum ('esperando', 'avisado', 'atendido', 'caducado', 'cancelado');

-- -----------------------------------------------------------------------------
-- Utilidades de tiempo (zona horaria explícita)
-- -----------------------------------------------------------------------------
create function public.hora_local(p_fecha date, p_hora time)
returns timestamptz
language sql stable parallel safe
set search_path = ''
as $$ select (p_fecha + p_hora) at time zone 'Europe/Madrid' $$;

create function public.fecha_local(p_instante timestamptz)
returns date
language sql stable parallel safe
set search_path = ''
as $$ select (p_instante at time zone 'Europe/Madrid')::date $$;

create function public.hhmm(p_instante timestamptz)
returns text
language sql stable parallel safe
set search_path = ''
as $$ select to_char(p_instante at time zone 'Europe/Madrid', 'HH24:MI') $$;

-- Normaliza teléfonos españoles e internacionales a formato E.164 sin espacios.
create function public.normalizar_telefono(p_telefono text)
returns text
language plpgsql immutable
set search_path = ''
as $$
declare
  v text := regexp_replace(coalesce(p_telefono, ''), '[^0-9+]', '', 'g');
begin
  if v = '' then return null; end if;
  if v like '00%' then v := '+' || substr(v, 3); end if;
  if v !~ '^\+' then
    if length(v) = 9 then v := '+34' || v;
    else v := '+' || v;
    end if;
  end if;
  return v;
end $$;

-- -----------------------------------------------------------------------------
-- Configuración (fila única): reglas de disponibilidad y datos del local
-- -----------------------------------------------------------------------------
create table public.configuracion (
  id smallint primary key default 1 check (id = 1),
  -- reglas de disponibilidad
  intervalo_min int not null default 15 check (intervalo_min between 5 and 60),
  duracion_hasta_4 int not null default 105 check (duracion_hasta_4 between 30 and 360),
  duracion_desde_5 int not null default 135 check (duracion_desde_5 between 30 and 360),
  umbral_duracion_larga int not null default 5 check (umbral_duracion_larga >= 2),
  margen_min int not null default 15 check (margen_min between 0 and 120),
  antelacion_min_min int not null default 120 check (antelacion_min_min >= 0),
  antelacion_max_dias int not null default 60 check (antelacion_max_dias between 1 and 365),
  max_comensales_online int not null default 10 check (max_comensales_online between 1 and 40),
  retencion_min int not null default 5 check (retencion_min between 1 and 30),
  cortesia_min int not null default 15 check (cortesia_min between 0 and 120),
  cancelacion_libre_horas int not null default 3 check (cancelacion_libre_horas >= 0),
  recordatorio_horas int not null default 24 check (recordatorio_horas between 1 and 96),
  sin_confirmar_horas int not null default 4 check (sin_confirmar_horas between 1 and 48),
  aviso_conflicto_min int not null default 15 check (aviso_conflicto_min between 0 and 120),
  -- datos del local (públicos)
  nombre_local text not null default 'Arrocería Yerga',
  direccion text not null default '',
  localidad text not null default '',
  codigo_postal text not null default '',
  telefono text not null default '',
  whatsapp text not null default '',
  correo text not null default '',
  latitud numeric(9, 6),
  longitud numeric(9, 6),
  url_mapa text not null default '',
  url_resenas text not null default '',
  aparcamiento jsonb not null default '{}'::jsonb,
  -- datos legales (solo administrador)
  razon_social text not null default '',
  cif text not null default '',
  domicilio_social text not null default '',
  actualizada_en timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Sala: zonas, distribuciones, mesas, combinaciones y elementos fijos
-- -----------------------------------------------------------------------------
create table public.zona (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  orden int not null default 0,
  activa boolean not null default true
);

create table public.distribucion (
  id uuid primary key default gen_random_uuid(),
  zona_id uuid not null references public.zona (id) on delete cascade,
  nombre text not null,
  estado public.estado_distribucion not null default 'borrador',
  predeterminada boolean not null default false,
  -- Estado del editor (mesas, combinaciones, elementos). «Publicar» lo vuelca a filas.
  borrador jsonb,
  borrador_pendiente boolean not null default true,
  version int not null default 0,
  publicada_en timestamptz,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  unique (zona_id, nombre)
);
create unique index distribucion_predeterminada_por_zona
  on public.distribucion (zona_id) where predeterminada;

create table public.programacion_distribucion (
  id uuid primary key default gen_random_uuid(),
  distribucion_id uuid not null references public.distribucion (id) on delete cascade,
  fecha date,
  dia_semana smallint check (dia_semana between 0 and 6), -- 0 = domingo
  turno_nombre text check (turno_nombre in ('comida', 'cena')),
  check (fecha is not null or dia_semana is not null or turno_nombre is not null)
);
create index on public.programacion_distribucion (distribucion_id);

create table public.mesa (
  id uuid primary key default gen_random_uuid(),
  distribucion_id uuid not null references public.distribucion (id) on delete cascade,
  nombre text not null,
  forma public.forma_mesa not null default 'cuadrada',
  x numeric not null default 0,
  y numeric not null default 0,
  giro numeric not null default 0,
  ancho numeric not null default 80 check (ancho > 0),
  alto numeric not null default 80 check (alto > 0),
  sillas int not null default 4 check (sillas >= 0),
  capacidad_min int not null default 1 check (capacidad_min >= 1),
  capacidad_max int not null default 4,
  tronas int not null default 0 check (tronas >= 0),
  plazas_silla_ruedas int not null default 0 check (plazas_silla_ruedas >= 0),
  reservable_online boolean not null default true,
  activa boolean not null default true,
  check (capacidad_max >= capacidad_min),
  unique (distribucion_id, nombre)
);
create index on public.mesa (distribucion_id) where activa;

create table public.combinacion (
  id uuid primary key default gen_random_uuid(),
  distribucion_id uuid not null references public.distribucion (id) on delete cascade,
  nombre text not null,
  capacidad_min int not null default 1 check (capacidad_min >= 1),
  capacidad_max int not null,
  reservable_online boolean not null default true,
  check (capacidad_max >= capacidad_min),
  unique (distribucion_id, nombre)
);

create table public.combinacion_mesa (
  combinacion_id uuid not null references public.combinacion (id) on delete cascade,
  mesa_id uuid not null references public.mesa (id) on delete cascade,
  primary key (combinacion_id, mesa_id)
);
create index on public.combinacion_mesa (mesa_id);

create table public.elemento_fijo (
  id uuid primary key default gen_random_uuid(),
  distribucion_id uuid not null references public.distribucion (id) on delete cascade,
  tipo public.tipo_elemento not null,
  x numeric not null default 0,
  y numeric not null default 0,
  giro numeric not null default 0,
  ancho numeric not null default 40 check (ancho > 0),
  alto numeric not null default 40 check (alto > 0),
  etiqueta text
);
create index on public.elemento_fijo (distribucion_id);

-- -----------------------------------------------------------------------------
-- Turnos y bloqueos
-- -----------------------------------------------------------------------------
create table public.turno (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (nombre in ('comida', 'cena')),
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  inicio time not null,
  fin time not null,
  ultima_hora time not null,
  tope_franja int not null default 20 check (tope_franja >= 1),
  activo boolean not null default true,
  unique (dia_semana, nombre),
  check (ultima_hora >= inicio)
);

-- Un bloqueo sin zona ni mesa afecta a todo el local (día o turno); con zona o mesa,
-- solo a ellas. turno_nombre limita el bloqueo a comidas o cenas dentro del rango.
create table public.bloqueo (
  id uuid primary key default gen_random_uuid(),
  rango tstzrange not null check (not isempty(rango)),
  turno_nombre text check (turno_nombre in ('comida', 'cena')),
  zona_id uuid references public.zona (id) on delete cascade,
  mesa_id uuid references public.mesa (id) on delete cascade,
  motivo text not null default '',
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now()
);
create index bloqueo_rango_idx on public.bloqueo using gist (rango);

-- -----------------------------------------------------------------------------
-- Clientes y reservas
-- -----------------------------------------------------------------------------
create table public.cliente (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null unique,
  correo text,
  idioma text not null default 'es' check (idioma in ('es', 'va', 'en')),
  alergias text,
  preferencias text,
  notas_internas text,
  consiente_comercial boolean not null default false,
  consiente_comercial_en timestamptz,
  privacidad_aceptada_en timestamptz,
  anonimizado boolean not null default false,
  creado_en timestamptz not null default now(),
  ultima_actividad_en timestamptz not null default now()
);

create table public.reserva (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.cliente (id) on delete set null,
  nombre text not null,
  telefono text,
  correo text,
  idioma text not null default 'es' check (idioma in ('es', 'va', 'en')),
  inicio timestamptz not null,
  fin timestamptz not null,
  comensales int not null check (comensales between 1 and 200),
  duracion_min int not null check (duracion_min > 0),
  turno_nombre text check (turno_nombre in ('comida', 'cena')),
  estado public.estado_reserva not null default 'confirmada',
  origen public.origen_reserva not null default 'web',
  zona_preferida_id uuid references public.zona (id) on delete set null,
  ocasion text,
  tronas int not null default 0 check (tronas >= 0),
  silla_ruedas boolean not null default false,
  alergias text,
  notas text,
  notas_internas text,
  codigo_gestion text not null unique
    default translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_'),
  sin_confirmar boolean not null default false,
  forzada boolean not null default false,
  segundos_para_reservar int,
  reconfirmada_en timestamptz,
  sentada_en timestamptz,
  finalizada_en timestamptz,
  cancelada_en timestamptz,
  cancelada_por text check (cancelada_por in ('cliente', 'restaurante')),
  recordatorio_enviado_en timestamptz,
  agradecimiento_enviado_en timestamptz,
  creada_por uuid references auth.users (id) on delete set null,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  check (fin > inicio)
);
create index reserva_inicio_idx on public.reserva (inicio);
create index reserva_cliente_idx on public.reserva (cliente_id);
create index reserva_estado_idx on public.reserva (estado);

-- La pieza crítica: una mesa no admite dos intervalos solapados. El intervalo
-- incluye ya el margen entre reservas.
create table public.asignacion (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reserva (id) on delete cascade,
  mesa_id uuid not null references public.mesa (id) on delete cascade,
  intervalo tstzrange not null check (not isempty(intervalo)),
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);
create index on public.asignacion (reserva_id);
alter table public.asignacion
  add constraint asignacion_sin_solape
  exclude using gist (mesa_id with =, intervalo with &&)
  where (activa);

-- Bloqueo temporal de mesa mientras el cliente escribe sus datos.
create table public.retencion (
  id uuid primary key default gen_random_uuid(),
  token uuid not null,
  mesa_id uuid not null references public.mesa (id) on delete cascade,
  zona_id uuid not null references public.zona (id) on delete cascade,
  inicio timestamptz not null,
  comensales int not null,
  intervalo tstzrange not null,
  caduca_en timestamptz not null,
  ignorar_reserva_id uuid references public.reserva (id) on delete cascade,
  creada_en timestamptz not null default now()
);
create index on public.retencion (token);
create index on public.retencion (caduca_en);
alter table public.retencion
  add constraint retencion_sin_solape
  exclude using gist (mesa_id with =, intervalo with &&);

create table public.encargo_arroz (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reserva (id) on delete cascade,
  plato_id uuid not null,
  raciones int not null check (raciones >= 1),
  unique (reserva_id, plato_id)
);

create table public.lista_espera (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.cliente (id) on delete set null,
  nombre text not null,
  telefono text not null,
  correo text,
  idioma text not null default 'es',
  fecha date not null,
  turno_nombre text not null check (turno_nombre in ('comida', 'cena')),
  hora_preferida time,
  comensales int not null check (comensales >= 1),
  estado public.estado_espera not null default 'esperando',
  avisado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index on public.lista_espera (fecha, turno_nombre, estado);

-- -----------------------------------------------------------------------------
-- Carta y contenidos
-- -----------------------------------------------------------------------------
create table public.plato (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('arroz', 'entrante', 'postre', 'menu_grupo', 'bebida')),
  slug text not null unique,
  nombre jsonb not null,          -- {es, va, en}
  descripcion jsonb not null default '{}'::jsonb,
  ingredientes jsonb not null default '{}'::jsonb,
  precio numeric(7, 2),
  precio_por_persona boolean not null default false,
  alergenos text[] not null default '{}',
  min_comensales int not null default 1 check (min_comensales >= 1),
  encargable boolean not null default false,
  foto_url text,
  visible boolean not null default true,
  destacado boolean not null default false,
  temporada text,
  orden int not null default 0,
  es_ejemplo boolean not null default false,
  actualizado_en timestamptz not null default now(),
  check (alergenos <@ array[
    'gluten', 'crustaceos', 'huevo', 'pescado', 'cacahuetes', 'soja', 'lacteos',
    'frutos_cascara', 'apio', 'mostaza', 'sesamo', 'sulfitos', 'altramuces', 'moluscos'
  ]::text[])
);
alter table public.encargo_arroz
  add constraint encargo_arroz_plato_fk foreign key (plato_id) references public.plato (id);

create table public.contenido (
  clave text primary key,
  valor jsonb not null,           -- {es, va, en} o estructura propia
  actualizado_en timestamptz not null default now()
);

create table public.resena (
  id uuid primary key default gen_random_uuid(),
  autor text not null,
  texto text not null,
  puntuacion smallint check (puntuacion between 1 and 5),
  origen text not null default 'Google',
  url text,
  fecha date,
  visible boolean not null default true,
  orden int not null default 0
);

-- -----------------------------------------------------------------------------
-- Personal, auditoría, mensajes y límites
-- -----------------------------------------------------------------------------
create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  correo text not null,
  rol public.rol_usuario not null default 'sala',
  activo boolean not null default true,
  debe_cambiar_clave boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.registro_cambios (
  id bigint generated always as identity primary key,
  usuario_id uuid,
  accion text not null,
  entidad text not null,
  entidad_id text,
  antes jsonb,
  despues jsonb,
  creado_en timestamptz not null default now()
);
create index on public.registro_cambios (entidad, entidad_id);
create index on public.registro_cambios (creado_en desc);

create table public.plantilla_mensaje (
  tipo text not null,
  idioma text not null check (idioma in ('es', 'va', 'en')),
  asunto text not null,
  cuerpo text not null,
  primary key (tipo, idioma)
);

create table public.mensaje (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid references public.reserva (id) on delete cascade,
  lista_espera_id uuid references public.lista_espera (id) on delete cascade,
  tipo text not null,
  canal text not null default 'correo',
  destinatario text not null,
  idioma text not null default 'es',
  asunto text not null,
  cuerpo_texto text not null default '',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'simulado', 'error')),
  proveedor_id text,
  error text,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz
);
create index on public.mensaje (reserva_id);
-- Un único recordatorio y un único agradecimiento por reserva.
create unique index mensaje_unico_por_reserva
  on public.mensaje (reserva_id, tipo) where tipo in ('recordatorio', 'agradecimiento');

create table public.limite_intentos (
  clave text primary key,
  ventana_inicio timestamptz not null default now(),
  contador int not null default 0
);

-- -----------------------------------------------------------------------------
-- Marcas de tiempo de actualización
-- -----------------------------------------------------------------------------
create function public.tocar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'plato' or tg_table_name = 'contenido' then
    new.actualizado_en := now();
  elsif tg_table_name = 'configuracion' then
    new.actualizada_en := now();
  else
    new.actualizada_en := now();
  end if;
  return new;
end $$;

create trigger tocar before update on public.reserva
  for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.distribucion
  for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.configuracion
  for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.plato
  for each row execute function public.tocar_actualizado();
create trigger tocar before update on public.contenido
  for each row execute function public.tocar_actualizado();

-- ===== supabase/migrations/20261008000200_seguridad.sql =====
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

-- ===== supabase/migrations/20261008000300_disponibilidad.sql =====
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

-- ===== supabase/migrations/20261008000400_reserva_publica.sql =====
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

-- ===== supabase/migrations/20261008000500_limite_fallos.sql =====
-- Consulta sin consumir: ¿se ha superado el límite de intentos para esta clave?
-- El acceso al panel solo cuenta los intentos fallidos.
create function public.intentos_superados(p_clave text, p_maximo int, p_ventana_seg int)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((
    select l.contador >= p_maximo
      from public.limite_intentos l
     where l.clave = p_clave
       and l.ventana_inicio >= now() - make_interval(secs => p_ventana_seg)), false)
$$;

revoke execute on function public.intentos_superados(text, int, int) from public, anon, authenticated;

-- ===== supabase/migrations/20261008000600_distribuciones.sql =====
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

-- ===== supabase/migrations/20261008000700_resumen_disponibilidad.sql =====
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

-- ===== supabase/migrations/20261008000800_informes.sql =====
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

-- ===== supabase/seed.sql =====
-- =============================================================================
-- Semilla: datos de ejemplo de Arrocería Yerga
--
-- ÚNICO archivo a sustituir con los datos reales (plano, horarios, carta, textos).
-- Todo lo marcado como «ejemplo» aparece así en la web hasta que se cambie.
-- Coordenadas del plano en centímetros; x/y son el centro de cada pieza.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configuración y datos del local
-- -----------------------------------------------------------------------------
insert into public.configuracion (
  id, nombre_local, direccion, localidad, codigo_postal, telefono, whatsapp, correo,
  latitud, longitud, url_mapa, url_resenas, aparcamiento,
  razon_social, cif, domicilio_social)
values (
  1, 'Arrocería Yerga', '[Calle de ejemplo, 12]', '[Localidad]', '[46000]',
  '+34 960 000 000', '+34 600 000 000', 'reservas@example.com',
  39.469907, -0.376288, 'https://maps.google.com/?q=39.469907,-0.376288',
  'https://g.page/r/ejemplo/review',
  '{"es": "Aparcamiento público gratuito a 200 m (ejemplo).", "va": "Aparcament públic gratuït a 200 m (exemple).", "en": "Free public car park 200 m away (example)."}',
  '[Razón social S.L.]', '[B00000000]', '[Domicilio social]');

-- -----------------------------------------------------------------------------
-- Zonas y distribuciones
-- -----------------------------------------------------------------------------
insert into public.zona (id, nombre, slug, orden) values
  ('00000000-0000-4000-a000-000000000001', 'Sala', 'sala', 1),
  ('00000000-0000-4000-a000-000000000002', 'Terraza', 'terraza', 2);

insert into public.distribucion (id, zona_id, nombre, estado, predeterminada, borrador_pendiente, version, publicada_en) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', 'Diario', 'publicada', true, false, 1, now()),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000002', 'Diario', 'publicada', true, false, 1, now());

-- Sala: 14 mesas. Seis de 2 junto a la ventana, seis de 4 en tres parejas
-- contiguas (se juntan para 8) y dos de 6.
insert into public.mesa (id, distribucion_id, nombre, forma, x, y, ancho, alto, sillas, capacidad_min, capacidad_max, tronas, plazas_silla_ruedas) values
  ('00000000-0000-4000-c000-000000000101', '00000000-0000-4000-b000-000000000001', 'S1',  'cuadrada', 110, 110, 70, 70, 2, 1, 2, 0, 0),
  ('00000000-0000-4000-c000-000000000102', '00000000-0000-4000-b000-000000000001', 'S2',  'cuadrada', 260, 110, 70, 70, 2, 1, 2, 0, 0),
  ('00000000-0000-4000-c000-000000000103', '00000000-0000-4000-b000-000000000001', 'S3',  'cuadrada', 410, 110, 70, 70, 2, 1, 2, 0, 0),
  ('00000000-0000-4000-c000-000000000104', '00000000-0000-4000-b000-000000000001', 'S4',  'cuadrada', 560, 110, 70, 70, 2, 1, 2, 0, 0),
  ('00000000-0000-4000-c000-000000000105', '00000000-0000-4000-b000-000000000001', 'S5',  'redonda',  710, 110, 70, 70, 2, 1, 2, 0, 0),
  ('00000000-0000-4000-c000-000000000106', '00000000-0000-4000-b000-000000000001', 'S6',  'redonda',  860, 110, 70, 70, 2, 1, 2, 0, 0),
  ('00000000-0000-4000-c000-000000000107', '00000000-0000-4000-b000-000000000001', 'S7',  'cuadrada', 140, 320, 90, 90, 4, 1, 4, 1, 1),
  ('00000000-0000-4000-c000-000000000108', '00000000-0000-4000-b000-000000000001', 'S8',  'cuadrada', 232, 320, 90, 90, 4, 1, 4, 0, 0),
  ('00000000-0000-4000-c000-000000000109', '00000000-0000-4000-b000-000000000001', 'S9',  'cuadrada', 440, 320, 90, 90, 4, 1, 4, 1, 0),
  ('00000000-0000-4000-c000-000000000110', '00000000-0000-4000-b000-000000000001', 'S10', 'cuadrada', 532, 320, 90, 90, 4, 1, 4, 0, 0),
  ('00000000-0000-4000-c000-000000000111', '00000000-0000-4000-b000-000000000001', 'S11', 'cuadrada', 740, 320, 90, 90, 4, 1, 4, 0, 1),
  ('00000000-0000-4000-c000-000000000112', '00000000-0000-4000-b000-000000000001', 'S12', 'cuadrada', 832, 320, 90, 90, 4, 1, 4, 0, 0),
  ('00000000-0000-4000-c000-000000000113', '00000000-0000-4000-b000-000000000001', 'S13', 'rectangular', 220, 540, 180, 90, 6, 1, 6, 1, 1),
  ('00000000-0000-4000-c000-000000000114', '00000000-0000-4000-b000-000000000001', 'S14', 'rectangular', 540, 540, 180, 90, 6, 1, 6, 1, 0);

insert into public.combinacion (id, distribucion_id, nombre, capacidad_min, capacidad_max) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-000000000001', 'S7+S8',   5, 8),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-b000-000000000001', 'S9+S10',  5, 8),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-b000-000000000001', 'S11+S12', 5, 8);
insert into public.combinacion_mesa (combinacion_id, mesa_id) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000107'),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000108'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000109'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000110'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000111'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000112');

insert into public.elemento_fijo (distribucion_id, tipo, x, y, giro, ancho, alto, etiqueta) values
  ('00000000-0000-4000-b000-000000000001', 'pared',   500, 10, 0, 1000, 12, null),
  ('00000000-0000-4000-b000-000000000001', 'pared',   500, 690, 0, 1000, 12, null),
  ('00000000-0000-4000-b000-000000000001', 'pared',   6, 350, 0, 12, 680, null),
  ('00000000-0000-4000-b000-000000000001', 'pared',   994, 350, 0, 12, 680, null),
  ('00000000-0000-4000-b000-000000000001', 'ventana', 260, 10, 0, 240, 14, 'Ventana'),
  ('00000000-0000-4000-b000-000000000001', 'ventana', 710, 10, 0, 240, 14, 'Ventana'),
  ('00000000-0000-4000-b000-000000000001', 'barra',   870, 540, 0, 200, 60, 'Barra'),
  ('00000000-0000-4000-b000-000000000001', 'cocina',  994, 230, 0, 16, 120, 'Paso a cocina'),
  ('00000000-0000-4000-b000-000000000001', 'puerta',  760, 690, 0, 120, 16, 'Entrada'),
  ('00000000-0000-4000-b000-000000000001', 'columna', 380, 430, 0, 36, 36, null),
  ('00000000-0000-4000-b000-000000000001', 'planta',  40, 660, 0, 40, 40, null),
  ('00000000-0000-4000-b000-000000000001', 'planta',  960, 40, 0, 40, 40, null),
  -- Terraza
  ('00000000-0000-4000-b000-000000000002', 'pared',   400, 10, 0, 800, 12, 'Fachada'),
  ('00000000-0000-4000-b000-000000000002', 'puerta',  400, 10, 0, 110, 16, 'Acceso a sala'),
  ('00000000-0000-4000-b000-000000000002', 'planta',  30, 420, 0, 40, 40, null),
  ('00000000-0000-4000-b000-000000000002', 'planta',  770, 420, 0, 40, 40, null);

-- Terraza: 8 mesas, cuatro de 2 y cuatro de 4; T4 y T8 quedan para la puerta.
insert into public.mesa (id, distribucion_id, nombre, forma, x, y, ancho, alto, sillas, capacidad_min, capacidad_max, reservable_online) values
  ('00000000-0000-4000-c000-000000000201', '00000000-0000-4000-b000-000000000002', 'T1', 'redonda', 110, 120, 70, 70, 2, 1, 2, true),
  ('00000000-0000-4000-c000-000000000202', '00000000-0000-4000-b000-000000000002', 'T2', 'redonda', 270, 120, 70, 70, 2, 1, 2, true),
  ('00000000-0000-4000-c000-000000000203', '00000000-0000-4000-b000-000000000002', 'T3', 'redonda', 530, 120, 70, 70, 2, 1, 2, true),
  ('00000000-0000-4000-c000-000000000204', '00000000-0000-4000-b000-000000000002', 'T4', 'redonda', 690, 120, 70, 70, 2, 1, 2, false),
  ('00000000-0000-4000-c000-000000000205', '00000000-0000-4000-b000-000000000002', 'T5', 'cuadrada', 110, 310, 90, 90, 4, 1, 4, true),
  ('00000000-0000-4000-c000-000000000206', '00000000-0000-4000-b000-000000000002', 'T6', 'cuadrada', 300, 310, 90, 90, 4, 1, 4, true),
  ('00000000-0000-4000-c000-000000000207', '00000000-0000-4000-b000-000000000002', 'T7', 'cuadrada', 500, 310, 90, 90, 4, 1, 4, true),
  ('00000000-0000-4000-c000-000000000208', '00000000-0000-4000-b000-000000000002', 'T8', 'cuadrada', 690, 310, 90, 90, 4, 1, 4, false);

-- -----------------------------------------------------------------------------
-- Turnos: comida de martes a domingo 13:00–16:30; cena viernes y sábado
-- 20:30–23:30; lunes cerrado. Tope: 20 comensales nuevos cada 15 minutos.
-- -----------------------------------------------------------------------------
insert into public.turno (nombre, dia_semana, inicio, fin, ultima_hora, tope_franja)
select 'comida', d, '13:00', '16:30', '15:30', 20 from unnest(array[2, 3, 4, 5, 6, 0]) d;
insert into public.turno (nombre, dia_semana, inicio, fin, ultima_hora, tope_franja)
select 'cena', d, '20:30', '23:30', '22:30', 20 from unnest(array[5, 6]) d;

-- -----------------------------------------------------------------------------
-- Carta de ejemplo: siete arroces, cinco entrantes y cuatro postres
-- -----------------------------------------------------------------------------
insert into public.plato (categoria, slug, nombre, descripcion, ingredientes, precio, precio_por_persona, alergenos, min_comensales, encargable, destacado, orden, es_ejemplo, temporada) values
  ('arroz', 'paella-valenciana',
   '{"es": "Paella valenciana", "va": "Paella valenciana", "en": "Valencian paella"}',
   '{"es": "La de siempre, a leña de naranjo: pollo, conejo, garrofó y bajoqueta.", "va": "La de sempre, a llenya de taronger: pollastre, conill, garrofó i bajoqueta.", "en": "The classic, over orange-wood fire: chicken, rabbit, butter beans and flat green beans."}',
   '{"es": ["pollo", "conejo", "garrofó", "bajoqueta", "tomate", "pimentón", "azafrán", "romero"], "va": ["pollastre", "conill", "garrofó", "bajoqueta", "tomaca", "pimentó", "safrà", "romer"], "en": ["chicken", "rabbit", "butter beans", "flat green beans", "tomato", "paprika", "saffron", "rosemary"]}',
   16.50, true, '{}', 2, true, true, 1, true, null),
  ('arroz', 'arros-a-banda',
   '{"es": "Arròs a banda", "va": "Arròs a banda", "en": "Arròs a banda"}',
   '{"es": "Arroz meloso de caldo de roca, servido con allioli.", "va": "Arròs amb fumet de peix de roca, servit amb allioli.", "en": "Rice cooked in rockfish stock, served with allioli."}',
   '{"es": ["fumet de roca", "sepia", "ñora", "ajo", "allioli"], "va": ["fumet de roca", "sépia", "nyora", "all", "allioli"], "en": ["rockfish stock", "cuttlefish", "ñora pepper", "garlic", "allioli"]}',
   17.00, true, '{pescado,moluscos,crustaceos,huevo}', 2, true, false, 2, true, null),
  ('arroz', 'arros-del-senyoret',
   '{"es": "Arròs del senyoret", "va": "Arròs del senyoret", "en": "Arròs del senyoret"}',
   '{"es": "Todo pelado, para comer sin mancharse las manos.", "va": "Tot pelat, per a menjar sense embrutar-se les mans.", "en": "Everything peeled, so you never get your hands dirty."}',
   '{"es": ["gamba roja", "sepia", "calamar", "fumet"], "va": ["gamba roja", "sépia", "calamar", "fumet"], "en": ["red prawn", "cuttlefish", "squid", "fish stock"]}',
   19.00, true, '{crustaceos,moluscos,pescado}', 2, true, true, 3, true, null),
  ('arroz', 'arros-negre',
   '{"es": "Arròs negre", "va": "Arròs negre", "en": "Black rice"}',
   '{"es": "Con tinta de sepia y su allioli.", "va": "Amb tinta de sépia i el seu allioli.", "en": "With cuttlefish ink and allioli."}',
   '{"es": ["sepia", "tinta", "ñora", "allioli"], "va": ["sépia", "tinta", "nyora", "allioli"], "en": ["cuttlefish", "squid ink", "ñora pepper", "allioli"]}',
   17.50, true, '{moluscos,pescado,crustaceos,huevo}', 2, true, false, 4, true, null),
  ('arroz', 'fideua',
   '{"es": "Fideuà", "va": "Fideuà", "en": "Fideuà"}',
   '{"es": "Fideo fino tostado en la paella, con marisco.", "va": "Fideu fi torrat a la paella, amb marisc.", "en": "Toasted thin noodles cooked in the paella with seafood."}',
   '{"es": ["fideo", "gamba", "sepia", "fumet", "allioli"], "va": ["fideu", "gamba", "sépia", "fumet", "allioli"], "en": ["noodles", "prawn", "cuttlefish", "fish stock", "allioli"]}',
   16.50, true, '{gluten,crustaceos,moluscos,pescado,huevo}', 2, true, false, 5, true, null),
  ('arroz', 'arros-al-forn',
   '{"es": "Arròs al forn", "va": "Arròs al forn", "en": "Oven-baked rice"}',
   '{"es": "En cazuela de barro: costilla, morcilla, garbanzo y patata.", "va": "En cassola de fang: costella, botifarra, cigró i creïlla.", "en": "In a clay pot: pork rib, black pudding, chickpeas and potato."}',
   '{"es": ["costilla", "morcilla", "garbanzo", "patata", "tomate"], "va": ["costella", "botifarra", "cigró", "creïlla", "tomaca"], "en": ["pork rib", "black pudding", "chickpeas", "potato", "tomato"]}',
   15.50, true, '{}', 2, true, false, 6, true, null),
  ('arroz', 'meloso-de-bogavante',
   '{"es": "Meloso de bogavante", "va": "Melós de llamàntol", "en": "Creamy lobster rice"}',
   '{"es": "Arroz meloso con medio bogavante por persona.", "va": "Arròs melós amb mig llamàntol per persona.", "en": "Creamy rice with half a lobster per person."}',
   '{"es": ["bogavante", "fumet", "tomate", "brandy"], "va": ["llamàntol", "fumet", "tomaca", "brandi"], "en": ["lobster", "fish stock", "tomato", "brandy"]}',
   29.00, true, '{crustaceos,pescado,moluscos,apio,sulfitos}', 2, true, true, 7, true, null),

  ('entrante', 'esgarraet',
   '{"es": "Esgarraet", "va": "Esgarraet", "en": "Esgarraet"}',
   '{"es": "Pimiento rojo asado y bacalao desmigado con buen aceite.", "va": "Pebrot roig torrat i bacallà esmicolat amb bon oli.", "en": "Roasted red pepper and shredded salt cod with olive oil."}',
   '{}', 9.50, false, '{pescado}', 1, false, false, 1, true, null),
  ('entrante', 'titaina',
   '{"es": "Titaina del Cabanyal", "va": "Titaina del Cabanyal", "en": "Cabanyal titaina"}',
   '{"es": "Sofrito de tomate y pimiento con tonyina y piñones.", "va": "Sofregit de tomaca i pebrot amb tonyina i pinyons.", "en": "Tomato and pepper stew with salted tuna and pine nuts."}',
   '{}', 10.00, false, '{pescado,frutos_cascara}', 1, false, false, 2, true, null),
  ('entrante', 'clotxines',
   '{"es": "Clóchinas al vapor", "va": "Clòtxines al vapor", "en": "Steamed Valencian mussels"}',
   '{"es": "Mejillón del puerto de Valencia, solo en temporada (mayo–agosto).", "va": "Clòtxina del port de València, només en temporada (maig–agost).", "en": "Mussels from the port of Valencia, in season only (May–August)."}',
   '{}', 12.00, false, '{moluscos}', 1, false, false, 3, true, 'mayo–agosto'),
  ('entrante', 'all-i-pebre',
   '{"es": "All i pebre", "va": "All i pebre", "en": "All i pebre"}',
   '{"es": "Anguila de la Albufera con patata, ajo y pimentón.", "va": "Anguila de l''Albufera amb creïlla, all i pimentó.", "en": "Albufera eel with potato, garlic and paprika."}',
   '{}', 16.00, false, '{pescado,frutos_cascara}', 1, false, false, 4, true, null),
  ('entrante', 'ensalada-valenciana',
   '{"es": "Ensalada valenciana", "va": "Ensalada valenciana", "en": "Valencian salad"}',
   '{"es": "Tomate de la huerta, cebolla tierna, olivas y huevo.", "va": "Tomaca de l''horta, ceba tendra, olives i ou.", "en": "Garden tomato, spring onion, olives and egg."}',
   '{}', 8.50, false, '{huevo}', 1, false, false, 5, true, null),

  ('postre', 'flan-casero',
   '{"es": "Flan de huevo casero", "va": "Flam d''ou casolà", "en": "Homemade egg flan"}',
   '{}', '{}', 5.00, false, '{huevo,lacteos}', 1, false, false, 1, true, null),
  ('postre', 'tarta-de-queso',
   '{"es": "Tarta de queso al horno", "va": "Pastís de formatge al forn", "en": "Baked cheesecake"}',
   '{}', '{}', 6.00, false, '{lacteos,huevo,gluten}', 1, false, false, 2, true, null),
  ('postre', 'naranja-con-miel',
   '{"es": "Naranja con miel y canela", "va": "Taronja amb mel i canella", "en": "Orange with honey and cinnamon"}',
   '{}', '{}', 4.50, false, '{}', 1, false, false, 3, true, null),
  ('postre', 'arnadi',
   '{"es": "Arnadí", "va": "Arnadí", "en": "Arnadí"}',
   '{"es": "Dulce de calabaza, almendra y canela.", "va": "Dolç de carabassa, ametla i canella.", "en": "Pumpkin, almond and cinnamon sweet."}',
   '{}', 5.50, false, '{huevo,frutos_cascara}', 1, false, false, 4, true, null),

  ('menu_grupo', 'menu-grupo-albufera',
   '{"es": "Menú de grupo «Albufera»", "va": "Menú de grup «Albufera»", "en": "«Albufera» group menu"}',
   '{"es": "Cuatro entrantes al centro, arroz a elegir, postre, bebida y café. Desde 8 personas.", "va": "Quatre entrants al mig, arròs a triar, postre, beguda i café. Des de 8 persones.", "en": "Four sharing starters, rice of your choice, dessert, drinks and coffee. From 8 people."}',
   '{}', 38.00, true, '{pescado,moluscos,huevo}', 8, false, false, 1, true, null);

-- -----------------------------------------------------------------------------
-- Textos editables de la web
-- -----------------------------------------------------------------------------
insert into public.contenido (clave, valor) values
  ('portada.titular', '{"es": "El arroz no espera. Tu mesa, sí.", "va": "L''arròs no espera. La teua taula, sí.", "en": "Rice won''t wait. Your table will."}'),
  ('portada.subtitulo', '{"es": "Paellas a leña hechas al momento para tu mesa. Reserva y elige tu arroz.", "va": "Paelles a llenya fetes al moment per a la teua taula. Reserva i tria el teu arròs.", "en": "Wood-fired paellas cooked to order for your table. Book and choose your rice."}'),
  ('aviso', '{"es": "", "va": "", "en": ""}'),
  ('producto.texto', '{"es": "Arroz con Denominación de Origen Valencia, verdura de l''Horta recogida esa mañana, pescado de la lonja y leña de naranjo. Nada más, y nada menos.", "va": "Arròs amb Denominació d''Origen València, verdura de l''Horta collida eixe matí, peix de la llotja i llenya de taronger. Res més, i res menys.", "en": "Rice with Valencia Designation of Origin, vegetables from l''Horta picked that morning, fish from the market and orange-tree firewood. Nothing more, nothing less."}'),
  ('casa.historia', '{"es": "Yerga es el apellido de mi abuela. Ella me enseñó que el amor se demuestra con comida, que la mesa siempre puede ser un poco más grande y que un plato caliente puede cambiar el día de alguien.", "va": "Yerga és el cognom de la meua àvia. Ella em va ensenyar que l''amor es demostra amb menjar, que la taula sempre pot ser un poc més gran i que un plat calent pot canviar el dia d''algú.", "en": "Yerga is my grandmother''s surname. She taught me that love is shown with food, that the table can always be a little bigger, and that a hot meal can change someone''s day."}'),
  ('casa.equipo', '{"es": "[Texto de ejemplo] En cocina, el paellero mira el fuego; en sala, el equipo se sabe tu nombre.", "va": "[Text d''exemple] En cuina, el paeller mira el foc; en sala, l''equip se sap el teu nom.", "en": "[Sample text] In the kitchen, the paellero watches the fire; in the dining room, the team knows your name."}'),
  ('legal.aviso', '{"es": "", "va": "", "en": ""}'),
  ('legal.privacidad', '{"es": "", "va": "", "en": ""}'),
  ('legal.cookies', '{"es": "", "va": "", "en": ""}');

-- Reseñas de ejemplo (sustituir por reseñas reales enlazadas a su origen).
insert into public.resena (autor, texto, puntuacion, origen, url, fecha, orden) values
  ('[Ejemplo] Marta G.', 'La paella valenciana como la de mi abuela. Pedimos el arroz al reservar y salió en su punto.', 5, 'Google', null, current_date - 20, 1),
  ('[Ejemplo] Joan P.', 'Socarrat de verdad. El arròs del senyoret, perfecte.', 5, 'Google', null, current_date - 34, 2),
  ('[Ejemplo] Sarah L.', 'Best paella we had in Valencia. Booking online took less than a minute.', 5, 'TripAdvisor', null, current_date - 50, 3);

-- -----------------------------------------------------------------------------
-- Plantillas de mensajes. Variables: {nombre} {fecha} {hora} {comensales}
-- {enlace} {telefono} {restaurante} {resena}
-- -----------------------------------------------------------------------------
insert into public.plantilla_mensaje (tipo, idioma, asunto, cuerpo) values
  ('confirmacion', 'es', 'Tu mesa en {restaurante}: {fecha} a las {hora}',
   'Hola, {nombre}:\n\nTu mesa para {comensales} está reservada el {fecha} a las {hora}.\n\nPuedes cambiarla o cancelarla aquí: {enlace}\n\nTe esperamos. Si necesitas algo, llámanos al {telefono}.'),
  ('confirmacion', 'va', 'La teua taula a {restaurante}: {fecha} a les {hora}',
   'Hola, {nombre}:\n\nLa teua taula per a {comensales} està reservada el {fecha} a les {hora}.\n\nPots canviar-la o cancel·lar-la ací: {enlace}\n\nT''esperem. Si necessites alguna cosa, telefona''ns al {telefono}.'),
  ('confirmacion', 'en', 'Your table at {restaurante}: {fecha} at {hora}',
   'Hi {nombre},\n\nYour table for {comensales} is booked on {fecha} at {hora}.\n\nYou can change or cancel it here: {enlace}\n\nSee you soon. If you need anything, call us on {telefono}.'),
  ('recordatorio', 'es', 'Mañana te esperamos en {restaurante}',
   'Hola, {nombre}:\n\nTe recordamos tu mesa para {comensales} el {fecha} a las {hora}.\n\n¿Vienes? Confírmalo o cancela con un toque: {enlace}'),
  ('recordatorio', 'va', 'Demà t''esperem a {restaurante}',
   'Hola, {nombre}:\n\nT''enrecordem la teua taula per a {comensales} el {fecha} a les {hora}.\n\nVens? Confirma-ho o cancel·la amb un toc: {enlace}'),
  ('recordatorio', 'en', 'See you tomorrow at {restaurante}',
   'Hi {nombre},\n\nA reminder of your table for {comensales} on {fecha} at {hora}.\n\nComing? Confirm or cancel in one tap: {enlace}'),
  ('agradecimiento', 'es', 'Gracias por venir a {restaurante}',
   'Hola, {nombre}:\n\nGracias por compartir mesa con nosotros. Si te gustó, nos ayudas mucho dejando una reseña: {resena}\n\nHasta la próxima paella.'),
  ('agradecimiento', 'va', 'Gràcies per vindre a {restaurante}',
   'Hola, {nombre}:\n\nGràcies per compartir taula amb nosaltres. Si t''ha agradat, ens ajudes molt deixant una ressenya: {resena}\n\nFins a la pròxima paella.'),
  ('agradecimiento', 'en', 'Thank you for coming to {restaurante}',
   'Hi {nombre},\n\nThank you for sharing a table with us. If you enjoyed it, a review helps us a lot: {resena}\n\nUntil the next paella.'),
  ('cancelacion', 'es', 'Reserva cancelada en {restaurante}',
   'Hola, {nombre}:\n\nHemos cancelado tu reserva del {fecha} a las {hora}. Esperamos verte pronto.'),
  ('cancelacion', 'va', 'Reserva cancel·lada a {restaurante}',
   'Hola, {nombre}:\n\nHem cancel·lat la teua reserva del {fecha} a les {hora}. Esperem vore''t prompte.'),
  ('cancelacion', 'en', 'Booking cancelled at {restaurante}',
   'Hi {nombre},\n\nYour booking on {fecha} at {hora} has been cancelled. We hope to see you soon.'),
  ('modificacion', 'es', 'Reserva actualizada: {fecha} a las {hora}',
   'Hola, {nombre}:\n\nTu reserva ahora es para {comensales} el {fecha} a las {hora}.\n\nGestiónala aquí: {enlace}'),
  ('modificacion', 'va', 'Reserva actualitzada: {fecha} a les {hora}',
   'Hola, {nombre}:\n\nLa teua reserva ara és per a {comensales} el {fecha} a les {hora}.\n\nGestiona-la ací: {enlace}'),
  ('modificacion', 'en', 'Booking updated: {fecha} at {hora}',
   'Hi {nombre},\n\nYour booking is now for {comensales} on {fecha} at {hora}.\n\nManage it here: {enlace}'),
  ('lista_espera', 'es', 'Se ha liberado una mesa en {restaurante}',
   'Hola, {nombre}:\n\nSe ha liberado una mesa para {comensales} el {fecha}. Si la quieres, resérvala cuanto antes: {enlace}'),
  ('lista_espera', 'va', 'S''ha alliberat una taula a {restaurante}',
   'Hola, {nombre}:\n\nS''ha alliberat una taula per a {comensales} el {fecha}. Si la vols, reserva-la com més prompte millor: {enlace}'),
  ('lista_espera', 'en', 'A table has opened up at {restaurante}',
   'Hi {nombre},\n\nA table for {comensales} has opened up on {fecha}. If you want it, book it quickly: {enlace}'),
  ('solicitud_grupo', 'es', 'Hemos recibido tu solicitud de grupo',
   'Hola, {nombre}:\n\nHemos recibido tu solicitud para {comensales} el {fecha} a las {hora}. Te confirmaremos en cuanto la revisemos.'),
  ('solicitud_grupo', 'va', 'Hem rebut la teua sol·licitud de grup',
   'Hola, {nombre}:\n\nHem rebut la teua sol·licitud per a {comensales} el {fecha} a les {hora}. Te la confirmarem tan prompte com la revisem.'),
  ('solicitud_grupo', 'en', 'We have received your group request',
   'Hi {nombre},\n\nWe have received your request for {comensales} on {fecha} at {hora}. We will confirm as soon as we review it.');

update public.plantilla_mensaje set cuerpo = replace(cuerpo, '\n', E'\n');

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
