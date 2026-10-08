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
