
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "asignacion": {
                  Row: {
                    "activa": boolean,"creada_en": string,"id": string,"intervalo": unknown,"mesa_id": string,"reserva_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"creada_en"?: string,"id"?: string,"intervalo": unknown,"mesa_id": string,"reserva_id": string
                  }
                  Update: {
                    "activa"?: boolean,"creada_en"?: string,"id"?: string,"intervalo"?: unknown,"mesa_id"?: string,"reserva_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "asignacion_mesa_id_fkey"
      columns: ["mesa_id"]
isOneToOne: false
      referencedRelation: "mesa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "asignacion_reserva_id_fkey"
      columns: ["reserva_id"]
isOneToOne: false
      referencedRelation: "reserva"
      referencedColumns: ["id"]
    }
                  ]
                },"bloqueo": {
                  Row: {
                    "creado_en": string,"creado_por": string | null,"id": string,"mesa_id": string | null,"motivo": string,"rango": unknown,"turno_nombre": string | null,"zona_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"creado_por"?: string | null,"id"?: string,"mesa_id"?: string | null,"motivo"?: string,"rango": unknown,"turno_nombre"?: string | null,"zona_id"?: string | null
                  }
                  Update: {
                    "creado_en"?: string,"creado_por"?: string | null,"id"?: string,"mesa_id"?: string | null,"motivo"?: string,"rango"?: unknown,"turno_nombre"?: string | null,"zona_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bloqueo_mesa_id_fkey"
      columns: ["mesa_id"]
isOneToOne: false
      referencedRelation: "mesa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bloqueo_zona_id_fkey"
      columns: ["zona_id"]
isOneToOne: false
      referencedRelation: "zona"
      referencedColumns: ["id"]
    }
                  ]
                },"cliente": {
                  Row: {
                    "alergias": string | null,"anonimizado": boolean,"consiente_comercial": boolean,"consiente_comercial_en": string | null,"correo": string | null,"creado_en": string,"id": string,"idioma": string,"nombre": string,"notas_internas": string | null,"preferencias": string | null,"privacidad_aceptada_en": string | null,"telefono": string,"ultima_actividad_en": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alergias"?: string | null,"anonimizado"?: boolean,"consiente_comercial"?: boolean,"consiente_comercial_en"?: string | null,"correo"?: string | null,"creado_en"?: string,"id"?: string,"idioma"?: string,"nombre": string,"notas_internas"?: string | null,"preferencias"?: string | null,"privacidad_aceptada_en"?: string | null,"telefono": string,"ultima_actividad_en"?: string
                  }
                  Update: {
                    "alergias"?: string | null,"anonimizado"?: boolean,"consiente_comercial"?: boolean,"consiente_comercial_en"?: string | null,"correo"?: string | null,"creado_en"?: string,"id"?: string,"idioma"?: string,"nombre"?: string,"notas_internas"?: string | null,"preferencias"?: string | null,"privacidad_aceptada_en"?: string | null,"telefono"?: string,"ultima_actividad_en"?: string
                  }
                  Relationships: [
                    
                  ]
                },"combinacion": {
                  Row: {
                    "capacidad_max": number,"capacidad_min": number,"distribucion_id": string,"id": string,"nombre": string,"reservable_online": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "capacidad_max": number,"capacidad_min"?: number,"distribucion_id": string,"id"?: string,"nombre": string,"reservable_online"?: boolean
                  }
                  Update: {
                    "capacidad_max"?: number,"capacidad_min"?: number,"distribucion_id"?: string,"id"?: string,"nombre"?: string,"reservable_online"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "combinacion_distribucion_id_fkey"
      columns: ["distribucion_id"]
isOneToOne: false
      referencedRelation: "distribucion"
      referencedColumns: ["id"]
    }
                  ]
                },"combinacion_mesa": {
                  Row: {
                    "combinacion_id": string,"mesa_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "combinacion_id": string,"mesa_id": string
                  }
                  Update: {
                    "combinacion_id"?: string,"mesa_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "combinacion_mesa_combinacion_id_fkey"
      columns: ["combinacion_id"]
isOneToOne: false
      referencedRelation: "combinacion"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "combinacion_mesa_mesa_id_fkey"
      columns: ["mesa_id"]
isOneToOne: false
      referencedRelation: "mesa"
      referencedColumns: ["id"]
    }
                  ]
                },"configuracion": {
                  Row: {
                    "actualizada_en": string,"antelacion_max_dias": number,"antelacion_min_min": number,"aparcamiento": NonNullable<Json>,"aviso_conflicto_min": number,"cancelacion_libre_horas": number,"cif": string,"codigo_postal": string,"correo": string,"cortesia_min": number,"direccion": string,"domicilio_social": string,"duracion_desde_5": number,"duracion_hasta_4": number,"espera_plazo_min": number,"id": number,"intervalo_min": number,"latitud": number | null,"localidad": string,"longitud": number | null,"margen_min": number,"max_comensales_online": number,"nombre_local": string,"razon_social": string,"recordatorio_horas": number,"retencion_min": number,"sin_confirmar_horas": number,"telefono": string,"umbral_duracion_larga": number,"url_mapa": string,"url_resenas": string,"whatsapp": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizada_en"?: string,"antelacion_max_dias"?: number,"antelacion_min_min"?: number,"aparcamiento"?: NonNullable<Json>,"aviso_conflicto_min"?: number,"cancelacion_libre_horas"?: number,"cif"?: string,"codigo_postal"?: string,"correo"?: string,"cortesia_min"?: number,"direccion"?: string,"domicilio_social"?: string,"duracion_desde_5"?: number,"duracion_hasta_4"?: number,"espera_plazo_min"?: number,"id"?: number,"intervalo_min"?: number,"latitud"?: number | null,"localidad"?: string,"longitud"?: number | null,"margen_min"?: number,"max_comensales_online"?: number,"nombre_local"?: string,"razon_social"?: string,"recordatorio_horas"?: number,"retencion_min"?: number,"sin_confirmar_horas"?: number,"telefono"?: string,"umbral_duracion_larga"?: number,"url_mapa"?: string,"url_resenas"?: string,"whatsapp"?: string
                  }
                  Update: {
                    "actualizada_en"?: string,"antelacion_max_dias"?: number,"antelacion_min_min"?: number,"aparcamiento"?: NonNullable<Json>,"aviso_conflicto_min"?: number,"cancelacion_libre_horas"?: number,"cif"?: string,"codigo_postal"?: string,"correo"?: string,"cortesia_min"?: number,"direccion"?: string,"domicilio_social"?: string,"duracion_desde_5"?: number,"duracion_hasta_4"?: number,"espera_plazo_min"?: number,"id"?: number,"intervalo_min"?: number,"latitud"?: number | null,"localidad"?: string,"longitud"?: number | null,"margen_min"?: number,"max_comensales_online"?: number,"nombre_local"?: string,"razon_social"?: string,"recordatorio_horas"?: number,"retencion_min"?: number,"sin_confirmar_horas"?: number,"telefono"?: string,"umbral_duracion_larga"?: number,"url_mapa"?: string,"url_resenas"?: string,"whatsapp"?: string
                  }
                  Relationships: [
                    
                  ]
                },"contenido": {
                  Row: {
                    "actualizado_en": string,"clave": string,"valor": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"clave": string,"valor": NonNullable<Json>
                  }
                  Update: {
                    "actualizado_en"?: string,"clave"?: string,"valor"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"distribucion": {
                  Row: {
                    "actualizada_en": string,"borrador": Json | null,"borrador_pendiente": boolean,"creada_en": string,"estado": Database["public"]['Enums']["estado_distribucion"],"id": string,"nombre": string,"predeterminada": boolean,"publicada_en": string | null,"version": number,"zona_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizada_en"?: string,"borrador"?: Json | null,"borrador_pendiente"?: boolean,"creada_en"?: string,"estado"?: Database["public"]['Enums']["estado_distribucion"],"id"?: string,"nombre": string,"predeterminada"?: boolean,"publicada_en"?: string | null,"version"?: number,"zona_id": string
                  }
                  Update: {
                    "actualizada_en"?: string,"borrador"?: Json | null,"borrador_pendiente"?: boolean,"creada_en"?: string,"estado"?: Database["public"]['Enums']["estado_distribucion"],"id"?: string,"nombre"?: string,"predeterminada"?: boolean,"publicada_en"?: string | null,"version"?: number,"zona_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "distribucion_zona_id_fkey"
      columns: ["zona_id"]
isOneToOne: false
      referencedRelation: "zona"
      referencedColumns: ["id"]
    }
                  ]
                },"elemento_fijo": {
                  Row: {
                    "alto": number,"ancho": number,"distribucion_id": string,"etiqueta": string | null,"giro": number,"id": string,"tipo": Database["public"]['Enums']["tipo_elemento"],"x": number,"y": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alto"?: number,"ancho"?: number,"distribucion_id": string,"etiqueta"?: string | null,"giro"?: number,"id"?: string,"tipo": Database["public"]['Enums']["tipo_elemento"],"x"?: number,"y"?: number
                  }
                  Update: {
                    "alto"?: number,"ancho"?: number,"distribucion_id"?: string,"etiqueta"?: string | null,"giro"?: number,"id"?: string,"tipo"?: Database["public"]['Enums']["tipo_elemento"],"x"?: number,"y"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "elemento_fijo_distribucion_id_fkey"
      columns: ["distribucion_id"]
isOneToOne: false
      referencedRelation: "distribucion"
      referencedColumns: ["id"]
    }
                  ]
                },"encargo_arroz": {
                  Row: {
                    "id": string,"plato_id": string,"raciones": number,"reserva_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"plato_id": string,"raciones": number,"reserva_id": string
                  }
                  Update: {
                    "id"?: string,"plato_id"?: string,"raciones"?: number,"reserva_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "encargo_arroz_plato_fk"
      columns: ["plato_id"]
isOneToOne: false
      referencedRelation: "plato"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "encargo_arroz_reserva_id_fkey"
      columns: ["reserva_id"]
isOneToOne: false
      referencedRelation: "reserva"
      referencedColumns: ["id"]
    }
                  ]
                },"limite_intentos": {
                  Row: {
                    "clave": string,"contador": number,"ventana_inicio": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clave": string,"contador"?: number,"ventana_inicio"?: string
                  }
                  Update: {
                    "clave"?: string,"contador"?: number,"ventana_inicio"?: string
                  }
                  Relationships: [
                    
                  ]
                },"lista_espera": {
                  Row: {
                    "avisado_en": string | null,"cliente_id": string | null,"comensales": number,"correo": string | null,"creado_en": string,"estado": Database["public"]['Enums']["estado_espera"],"fecha": string,"hora_preferida": string | null,"id": string,"idioma": string,"nombre": string,"oferta_hasta": string | null,"oferta_inicio": string | null,"oferta_liberada_por": string | null,"oferta_token": string | null,"reserva_id": string | null,"telefono": string,"turno_nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avisado_en"?: string | null,"cliente_id"?: string | null,"comensales": number,"correo"?: string | null,"creado_en"?: string,"estado"?: Database["public"]['Enums']["estado_espera"],"fecha": string,"hora_preferida"?: string | null,"id"?: string,"idioma"?: string,"nombre": string,"oferta_hasta"?: string | null,"oferta_inicio"?: string | null,"oferta_liberada_por"?: string | null,"oferta_token"?: string | null,"reserva_id"?: string | null,"telefono": string,"turno_nombre": string
                  }
                  Update: {
                    "avisado_en"?: string | null,"cliente_id"?: string | null,"comensales"?: number,"correo"?: string | null,"creado_en"?: string,"estado"?: Database["public"]['Enums']["estado_espera"],"fecha"?: string,"hora_preferida"?: string | null,"id"?: string,"idioma"?: string,"nombre"?: string,"oferta_hasta"?: string | null,"oferta_inicio"?: string | null,"oferta_liberada_por"?: string | null,"oferta_token"?: string | null,"reserva_id"?: string | null,"telefono"?: string,"turno_nombre"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lista_espera_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "cliente"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lista_espera_oferta_liberada_por_fkey"
      columns: ["oferta_liberada_por"]
isOneToOne: false
      referencedRelation: "reserva"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lista_espera_reserva_id_fkey"
      columns: ["reserva_id"]
isOneToOne: false
      referencedRelation: "reserva"
      referencedColumns: ["id"]
    }
                  ]
                },"mensaje": {
                  Row: {
                    "asunto": string,"canal": string,"creado_en": string,"cuerpo_texto": string,"destinatario": string,"enviado_en": string | null,"error": string | null,"estado": string,"id": string,"idioma": string,"lista_espera_id": string | null,"proveedor_id": string | null,"reserva_id": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asunto": string,"canal"?: string,"creado_en"?: string,"cuerpo_texto"?: string,"destinatario": string,"enviado_en"?: string | null,"error"?: string | null,"estado"?: string,"id"?: string,"idioma"?: string,"lista_espera_id"?: string | null,"proveedor_id"?: string | null,"reserva_id"?: string | null,"tipo": string
                  }
                  Update: {
                    "asunto"?: string,"canal"?: string,"creado_en"?: string,"cuerpo_texto"?: string,"destinatario"?: string,"enviado_en"?: string | null,"error"?: string | null,"estado"?: string,"id"?: string,"idioma"?: string,"lista_espera_id"?: string | null,"proveedor_id"?: string | null,"reserva_id"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mensaje_lista_espera_id_fkey"
      columns: ["lista_espera_id"]
isOneToOne: false
      referencedRelation: "lista_espera"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mensaje_reserva_id_fkey"
      columns: ["reserva_id"]
isOneToOne: false
      referencedRelation: "reserva"
      referencedColumns: ["id"]
    }
                  ]
                },"mesa": {
                  Row: {
                    "activa": boolean,"alto": number,"ancho": number,"capacidad_max": number,"capacidad_min": number,"distribucion_id": string,"forma": Database["public"]['Enums']["forma_mesa"],"giro": number,"id": string,"nombre": string,"plazas_silla_ruedas": number,"reservable_online": boolean,"sillas": number,"tronas": number,"x": number,"y": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"alto"?: number,"ancho"?: number,"capacidad_max"?: number,"capacidad_min"?: number,"distribucion_id": string,"forma"?: Database["public"]['Enums']["forma_mesa"],"giro"?: number,"id"?: string,"nombre": string,"plazas_silla_ruedas"?: number,"reservable_online"?: boolean,"sillas"?: number,"tronas"?: number,"x"?: number,"y"?: number
                  }
                  Update: {
                    "activa"?: boolean,"alto"?: number,"ancho"?: number,"capacidad_max"?: number,"capacidad_min"?: number,"distribucion_id"?: string,"forma"?: Database["public"]['Enums']["forma_mesa"],"giro"?: number,"id"?: string,"nombre"?: string,"plazas_silla_ruedas"?: number,"reservable_online"?: boolean,"sillas"?: number,"tronas"?: number,"x"?: number,"y"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "mesa_distribucion_id_fkey"
      columns: ["distribucion_id"]
isOneToOne: false
      referencedRelation: "distribucion"
      referencedColumns: ["id"]
    }
                  ]
                },"plantilla_mensaje": {
                  Row: {
                    "asunto": string,"cuerpo": string,"idioma": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asunto": string,"cuerpo": string,"idioma": string,"tipo": string
                  }
                  Update: {
                    "asunto"?: string,"cuerpo"?: string,"idioma"?: string,"tipo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"plato": {
                  Row: {
                    "actualizado_en": string,"alergenos": (string)[],"categoria": string,"descripcion": NonNullable<Json>,"destacado": boolean,"encargable": boolean,"es_ejemplo": boolean,"foto_url": string | null,"id": string,"ingredientes": NonNullable<Json>,"min_comensales": number,"nombre": NonNullable<Json>,"orden": number,"precio": number | null,"precio_por_persona": boolean,"slug": string,"temporada": string | null,"visible": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"alergenos"?: (string)[],"categoria": string,"descripcion"?: NonNullable<Json>,"destacado"?: boolean,"encargable"?: boolean,"es_ejemplo"?: boolean,"foto_url"?: string | null,"id"?: string,"ingredientes"?: NonNullable<Json>,"min_comensales"?: number,"nombre": NonNullable<Json>,"orden"?: number,"precio"?: number | null,"precio_por_persona"?: boolean,"slug": string,"temporada"?: string | null,"visible"?: boolean
                  }
                  Update: {
                    "actualizado_en"?: string,"alergenos"?: (string)[],"categoria"?: string,"descripcion"?: NonNullable<Json>,"destacado"?: boolean,"encargable"?: boolean,"es_ejemplo"?: boolean,"foto_url"?: string | null,"id"?: string,"ingredientes"?: NonNullable<Json>,"min_comensales"?: number,"nombre"?: NonNullable<Json>,"orden"?: number,"precio"?: number | null,"precio_por_persona"?: boolean,"slug"?: string,"temporada"?: string | null,"visible"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"programacion_distribucion": {
                  Row: {
                    "dia_semana": number | null,"distribucion_id": string,"fecha": string | null,"id": string,"turno_nombre": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "dia_semana"?: number | null,"distribucion_id": string,"fecha"?: string | null,"id"?: string,"turno_nombre"?: string | null
                  }
                  Update: {
                    "dia_semana"?: number | null,"distribucion_id"?: string,"fecha"?: string | null,"id"?: string,"turno_nombre"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "programacion_distribucion_distribucion_id_fkey"
      columns: ["distribucion_id"]
isOneToOne: false
      referencedRelation: "distribucion"
      referencedColumns: ["id"]
    }
                  ]
                },"registro_cambios": {
                  Row: {
                    "accion": string,"antes": Json | null,"creado_en": string,"despues": Json | null,"entidad": string,"entidad_id": string | null,"id": number,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accion": string,"antes"?: Json | null,"creado_en"?: string,"despues"?: Json | null,"entidad": string,"entidad_id"?: string | null,"id"?: never,"usuario_id"?: string | null
                  }
                  Update: {
                    "accion"?: string,"antes"?: Json | null,"creado_en"?: string,"despues"?: Json | null,"entidad"?: string,"entidad_id"?: string | null,"id"?: never,"usuario_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"resena": {
                  Row: {
                    "autor": string,"fecha": string | null,"id": string,"orden": number,"origen": string,"puntuacion": number | null,"texto": string,"url": string | null,"visible": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "autor": string,"fecha"?: string | null,"id"?: string,"orden"?: number,"origen"?: string,"puntuacion"?: number | null,"texto": string,"url"?: string | null,"visible"?: boolean
                  }
                  Update: {
                    "autor"?: string,"fecha"?: string | null,"id"?: string,"orden"?: number,"origen"?: string,"puntuacion"?: number | null,"texto"?: string,"url"?: string | null,"visible"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"reserva": {
                  Row: {
                    "actualizada_en": string,"agradecimiento_enviado_en": string | null,"alergias": string | null,"cancelada_en": string | null,"cancelada_por": string | null,"cliente_id": string | null,"codigo_gestion": string,"comensales": number,"correo": string | null,"creada_en": string,"creada_por": string | null,"duracion_min": number,"estado": Database["public"]['Enums']["estado_reserva"],"fin": string,"finalizada_en": string | null,"forzada": boolean,"id": string,"idioma": string,"inicio": string,"nombre": string,"notas": string | null,"notas_internas": string | null,"ocasion": string | null,"origen": Database["public"]['Enums']["origen_reserva"],"reconfirmada_en": string | null,"recordatorio_enviado_en": string | null,"segundos_para_reservar": number | null,"sentada_en": string | null,"silla_ruedas": boolean,"sin_confirmar": boolean,"telefono": string | null,"tronas": number,"turno_nombre": string | null,"zona_preferida_id": string | null,"ocupacion_de": unknown
                  }
                  ComputedFields: "ocupacion_de"
                  Insert: {
                    "actualizada_en"?: string,"agradecimiento_enviado_en"?: string | null,"alergias"?: string | null,"cancelada_en"?: string | null,"cancelada_por"?: string | null,"cliente_id"?: string | null,"codigo_gestion"?: string,"comensales": number,"correo"?: string | null,"creada_en"?: string,"creada_por"?: string | null,"duracion_min": number,"estado"?: Database["public"]['Enums']["estado_reserva"],"fin": string,"finalizada_en"?: string | null,"forzada"?: boolean,"id"?: string,"idioma"?: string,"inicio": string,"nombre": string,"notas"?: string | null,"notas_internas"?: string | null,"ocasion"?: string | null,"origen"?: Database["public"]['Enums']["origen_reserva"],"reconfirmada_en"?: string | null,"recordatorio_enviado_en"?: string | null,"segundos_para_reservar"?: number | null,"sentada_en"?: string | null,"silla_ruedas"?: boolean,"sin_confirmar"?: boolean,"telefono"?: string | null,"tronas"?: number,"turno_nombre"?: string | null,"zona_preferida_id"?: string | null
                  }
                  Update: {
                    "actualizada_en"?: string,"agradecimiento_enviado_en"?: string | null,"alergias"?: string | null,"cancelada_en"?: string | null,"cancelada_por"?: string | null,"cliente_id"?: string | null,"codigo_gestion"?: string,"comensales"?: number,"correo"?: string | null,"creada_en"?: string,"creada_por"?: string | null,"duracion_min"?: number,"estado"?: Database["public"]['Enums']["estado_reserva"],"fin"?: string,"finalizada_en"?: string | null,"forzada"?: boolean,"id"?: string,"idioma"?: string,"inicio"?: string,"nombre"?: string,"notas"?: string | null,"notas_internas"?: string | null,"ocasion"?: string | null,"origen"?: Database["public"]['Enums']["origen_reserva"],"reconfirmada_en"?: string | null,"recordatorio_enviado_en"?: string | null,"segundos_para_reservar"?: number | null,"sentada_en"?: string | null,"silla_ruedas"?: boolean,"sin_confirmar"?: boolean,"telefono"?: string | null,"tronas"?: number,"turno_nombre"?: string | null,"zona_preferida_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reserva_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "cliente"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reserva_zona_preferida_id_fkey"
      columns: ["zona_preferida_id"]
isOneToOne: false
      referencedRelation: "zona"
      referencedColumns: ["id"]
    }
                  ]
                },"retencion": {
                  Row: {
                    "caduca_en": string,"comensales": number,"creada_en": string,"id": string,"ignorar_reserva_id": string | null,"inicio": string,"intervalo": unknown,"mesa_id": string,"token": string,"zona_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "caduca_en": string,"comensales": number,"creada_en"?: string,"id"?: string,"ignorar_reserva_id"?: string | null,"inicio": string,"intervalo": unknown,"mesa_id": string,"token": string,"zona_id": string
                  }
                  Update: {
                    "caduca_en"?: string,"comensales"?: number,"creada_en"?: string,"id"?: string,"ignorar_reserva_id"?: string | null,"inicio"?: string,"intervalo"?: unknown,"mesa_id"?: string,"token"?: string,"zona_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "retencion_ignorar_reserva_id_fkey"
      columns: ["ignorar_reserva_id"]
isOneToOne: false
      referencedRelation: "reserva"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "retencion_mesa_id_fkey"
      columns: ["mesa_id"]
isOneToOne: false
      referencedRelation: "mesa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "retencion_zona_id_fkey"
      columns: ["zona_id"]
isOneToOne: false
      referencedRelation: "zona"
      referencedColumns: ["id"]
    }
                  ]
                },"turno": {
                  Row: {
                    "activo": boolean,"dia_semana": number,"fin": string,"id": string,"inicio": string,"nombre": string,"tope_franja": number,"ultima_hora": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"dia_semana": number,"fin": string,"id"?: string,"inicio": string,"nombre": string,"tope_franja"?: number,"ultima_hora": string
                  }
                  Update: {
                    "activo"?: boolean,"dia_semana"?: number,"fin"?: string,"id"?: string,"inicio"?: string,"nombre"?: string,"tope_franja"?: number,"ultima_hora"?: string
                  }
                  Relationships: [
                    
                  ]
                },"usuario": {
                  Row: {
                    "activo": boolean,"correo": string,"creado_en": string,"debe_cambiar_clave": boolean,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"]
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"correo": string,"creado_en"?: string,"debe_cambiar_clave"?: boolean,"id": string,"nombre": string,"rol"?: Database["public"]['Enums']["rol_usuario"]
                  }
                  Update: {
                    "activo"?: boolean,"correo"?: string,"creado_en"?: string,"debe_cambiar_clave"?: boolean,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_usuario"]
                  }
                  Relationships: [
                    
                  ]
                },"zona": {
                  Row: {
                    "activa": boolean,"id": string,"nombre": string,"orden": number,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"id"?: string,"nombre": string,"orden"?: number,"slug": string
                  }
                  Update: {
                    "activa"?: boolean,"id"?: string,"nombre"?: string,"orden"?: number,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "aceptar_oferta_espera":
{ Args: { "p_token": string }; Returns: Json
                           },
"apuntar_lista_espera":
{ Args: { "p_datos": Json }; Returns: Json
                           },
"asignar_reserva":
{ Args: { "p_forzar"?: boolean,"p_mesas": (string)[],"p_reserva": string }; Returns: Json
                           },
"avisar_lista_espera":
{ Args: { "p_reserva": string }; Returns: Json
                           },
"borrador_de":
{ Args: { "p_dist": string }; Returns: Json
                           },
"caducar_ofertas_espera":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"cambiar_estado":
{ Args: { "p_estado": Database["public"]['Enums']["estado_reserva"],"p_reserva": string }; Returns: Json
                           },
"cancelar_por_codigo":
{ Args: { "p_codigo": string }; Returns: Json
                           },
"candidatos":
{ Args: { "p_comensales": number,"p_dist": string,"p_preferir_no_online"?: boolean,"p_solo_online": boolean }; Returns: {
              "capacidad_max": number,"es_combinacion": boolean,"etiqueta": string,"mesas": (string)[],"online": boolean
            }[]
                           },
"capacidad_maxima_online":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"cfg":
{ Args: Record<PropertyKey, never>; Returns: {
              "actualizada_en": string,
"antelacion_max_dias": number,
"antelacion_min_min": number,
"aparcamiento": NonNullable<Json>,
"aviso_conflicto_min": number,
"cancelacion_libre_horas": number,
"cif": string,
"codigo_postal": string,
"correo": string,
"cortesia_min": number,
"direccion": string,
"domicilio_social": string,
"duracion_desde_5": number,
"duracion_hasta_4": number,
"espera_plazo_min": number,
"id": number,
"intervalo_min": number,
"latitud": number | null,
"localidad": string,
"longitud": number | null,
"margen_min": number,
"max_comensales_online": number,
"nombre_local": string,
"razon_social": string,
"recordatorio_horas": number,
"retencion_min": number,
"sin_confirmar_horas": number,
"telefono": string,
"umbral_duracion_larga": number,
"url_mapa": string,
"url_resenas": string,
"whatsapp": string
            }
                          SetofOptions: {
        from: "*"
        to: "configuracion"
        isOneToOne: true
        isSetofReturn: false
      } },
"clave_cambiada":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"comensales_en_franja":
{ Args: { "p_ignorar_reserva"?: string,"p_ignorar_token"?: string,"p_inicio": string }; Returns: number
                           },
"confirmar_reserva":
{ Args: { "p_datos": Json,"p_token": string }; Returns: Json
                           },
"consumir_intento":
{ Args: { "p_clave": string,"p_maximo": number,"p_ventana_seg": number }; Returns: boolean
                           },
"crear_distribucion":
{ Args: { "p_copiar_de"?: string,"p_nombre": string,"p_zona": string }; Returns: string
                           },
"crear_reserva_personal":
{ Args: { "p_datos": Json,"p_forzar"?: boolean }; Returns: Json
                           },
"descartar_borrador":
{ Args: { "p_dist": string }; Returns: undefined
                           },
"dias_disponibles":
{ Args: { "p_comensales": number,"p_desde": string,"p_hasta": string }; Returns: {
              "estado": string,"fecha": string
            }[]
                           },
"distribucion_a_json":
{ Args: { "p_dist": string }; Returns: Json
                           },
"distribucion_activa":
{ Args: { "p_fecha": string,"p_turno": string,"p_zona": string }; Returns: string
                           },
"duracion_para":
{ Args: { "p_comensales": number }; Returns: number
                           },
"elegir_mesas":
{ Args: { "p_comensales": number,"p_fin": string,"p_ignorar_reserva"?: string,"p_inicio": string,"p_preferir_no_online"?: boolean,"p_zona"?: string }; Returns: (string)[]
                           },
"es_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"es_personal":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"es_servicio":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"exigir_gestion":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"exigir_personal":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"fecha_local":
{ Args: { "p_instante": string }; Returns: string
                           },
"guardar_arroces":
{ Args: { "p_arroces": Json,"p_reserva": string }; Returns: undefined
                           },
"guardar_borrador":
{ Args: { "p_borrador": Json,"p_dist": string }; Returns: undefined
                           },
"hacer_predeterminada":
{ Args: { "p_dist": string }; Returns: undefined
                           },
"hhmm":
{ Args: { "p_instante": string }; Returns: string
                           },
"hora_local":
{ Args: { "p_fecha": string,"p_hora": string }; Returns: string
                           },
"horas_cercanas":
{ Args: { "p_comensales": number,"p_ignorar_reserva"?: string,"p_inicio": string,"p_n"?: number,"p_zona"?: string }; Returns: Json
                           },
"horas_disponibles":
{ Args: { "p_comensales": number,"p_fecha": string,"p_ignorar_reserva"?: string,"p_ignorar_token"?: string,"p_solo_online"?: boolean,"p_zona"?: string }; Returns: {
              "disponible": boolean,"hora": string,"inicio": string,"turno": string,"zonas": (string)[]
            }[]
                           },
"incumple_reglas":
{ Args: { "p_comensales": number,"p_ignorar_reserva"?: string,"p_inicio": string }; Returns: string
                           },
"informe":
{ Args: { "p_desde": string,"p_hasta": string }; Returns: Json
                           },
"intentos_superados":
{ Args: { "p_clave": string,"p_maximo": number,"p_ventana_seg": number }; Returns: boolean
                           },
"liberar_retencion":
{ Args: { "p_token": string }; Returns: undefined
                           },
"local_bloqueado":
{ Args: { "p_inicio": string,"p_turno": string }; Returns: boolean
                           },
"mesa_libre":
{ Args: { "p_estancia": unknown,"p_ignorar_reserva"?: string,"p_ignorar_token"?: string,"p_mesa": string,"p_ocupacion": unknown }; Returns: boolean
                           },
"mesas_libres":
{ Args: { "p_estancia": unknown,"p_ignorar_reserva"?: string,"p_ignorar_token"?: string,"p_mesas": (string)[],"p_ocupacion": unknown }; Returns: boolean
                           },
"mesas_validas":
{ Args: { "p_reserva": string }; Returns: {
              "conflicto": string,"mesa_id": string,"motivo": string,"valida": boolean
            }[]
                           },
"minutos":
{ Args: { "p": number }; Returns: string
                           },
"modificar_por_codigo":
{ Args: { "p_codigo": string,"p_datos": Json,"p_token": string }; Returns: Json
                           },
"modificar_reserva_personal":
{ Args: { "p_datos": Json,"p_forzar"?: boolean,"p_reserva": string }; Returns: Json
                           },
"normalizar_telefono":
{ Args: { "p_telefono": string }; Returns: string
                           },
"ocupacion_de":
{ Args: { "p_r": Omit<Database["public"]['Tables']["reserva"]['Row'], Database["public"]['Tables']["reserva"]['ComputedFields']> }; Returns: unknown
                           },
"oferta_espera":
{ Args: { "p_token": string }; Returns: Json
                           },
"publicar_distribucion":
{ Args: { "p_aplicar"?: boolean,"p_dist": string }; Returns: Json
                           },
"puede_gestionar":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"reconfirmar_por_codigo":
{ Args: { "p_codigo": string }; Returns: Json
                           },
"reorganizar_turno":
{ Args: { "p_aplicar"?: boolean,"p_fecha": string,"p_turno": string,"p_zona": string }; Returns: Json
                           },
"reserva_por_codigo":
{ Args: { "p_codigo": string }; Returns: Json
                           },
"resumen_disponibilidad":
{ Args: { "p_dias"?: number }; Returns: {
              "fecha": string,"libres": number,"turno": string
            }[]
                           },
"retener_mesa":
{ Args: { "p_comensales": number,"p_ignorar_reserva"?: string,"p_inicio": string,"p_token_anterior"?: string,"p_zona"?: string }; Returns: Json
                           },
"rol_actual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["rol_usuario"]
                           },
"solicitar_grupo":
{ Args: { "p_datos": Json }; Returns: Json
                           },
"tick":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"turno_de":
{ Args: { "p_inicio": string }; Returns: string
                           },
"upsert_cliente":
{ Args: { "p_datos": Json }; Returns: string
                           },
"validar_arroces":
{ Args: { "p_arroces": Json,"p_comensales": number }; Returns: string
                           },
"zona_bloqueada":
{ Args: { "p_estancia": unknown,"p_turno": string,"p_zona": string }; Returns: boolean
                           }
          }
          Enums: {
            "estado_distribucion": "borrador"|"publicada","estado_espera": "esperando"|"avisado"|"atendido"|"caducado"|"cancelado","estado_reserva": "pendiente"|"confirmada"|"reconfirmada"|"sentada"|"finalizada"|"cancelada"|"no_presentada","forma_mesa": "redonda"|"cuadrada"|"rectangular","origen_reserva": "web"|"telefono"|"puerta","rol_usuario": "administrador"|"encargado"|"sala","tipo_elemento": "pared"|"barra"|"columna"|"puerta"|"ventana"|"cocina"|"planta"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "estado_distribucion": ["borrador", "publicada"],"estado_espera": ["esperando", "avisado", "atendido", "caducado", "cancelado"],"estado_reserva": ["pendiente", "confirmada", "reconfirmada", "sentada", "finalizada", "cancelada", "no_presentada"],"forma_mesa": ["redonda", "cuadrada", "rectangular"],"origen_reserva": ["web", "telefono", "puerta"],"rol_usuario": ["administrador", "encargado", "sala"],"tipo_elemento": ["pared", "barra", "columna", "puerta", "ventana", "cocina", "planta"]
          }
        }
} as const
