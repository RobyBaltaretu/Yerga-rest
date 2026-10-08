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
  ('casa.historia', '{"es": "[Texto de ejemplo] Yerga nació alrededor de un fuego. Tres generaciones cocinando arroz como se ha hecho siempre en la huerta: a leña, sin prisas y para compartir.", "va": "[Text d''exemple] Yerga va nàixer al voltant d''un foc. Tres generacions cuinant arròs com s''ha fet sempre a l''horta: a llenya, sense presses i per a compartir.", "en": "[Sample text] Yerga was born around a fire. Three generations cooking rice the way it has always been done in the huerta: over wood, unhurried, and made for sharing."}'),
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
