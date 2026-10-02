export type AreaId = 
  | 'gestion-publica' 
  | 'turismo' 
  | 'deportes' 
  | 'legales-comercio' 
  | 'alquileres-inmobiliario' 
  | 'vida-social-cultura' 
  | 'en-el-radar';

export type CategoriaAgenda = 'cultura' | 'deportes' | 'institucional' | 'capacitacion';

export type TipoAccesoAgenda = 'gratuito' | 'arancelado' | 'con_inscripcion';

export type TipoFuente = 
  | 'diario' 
  | 'institucional' 
  | 'especializada' 
  | 'diario_digital' 
  | 'radio' 
  | 'organismo_publico' 
  | 'canal_tv' 
  | 'ong' 
  | 'red_social';

export type EstadoDossier = 'activo' | 'en_seguimiento' | 'resuelto';

export interface HitoTimeline {
  fecha: string;
  hito: string;
  noticia_id?: string;
  fuente_url?: string;
}

export type EstadoEdicion = 'borrador' | 'listo_para_despacho' | 'enviado_a_suscriptores' | 'programado' | 'enviado';

export type DestinoAnuncio = 'newsletter' | 'web' | 'ambos';

export type UbicacionAnuncio = 'pre-footer' | 'footer' | 'header';

export type BeatId = 'pulso-urbano' | 'poder-obras' | 'montana-turismo';

export interface ScoutExecutionResult {
  success: boolean;
  beat: BeatId;
  resumen: {
    noticias_ingresadas: number;
    eventos_ingresados: number;
    fuentes_consultadas: number;
    titulares: string[];
    eventos: string[];
    dossiers_vinculados: string[];
  };
  noticias: Noticia[];
  agenda: EventoAgenda[];
  timestamp: string;
  modelo_utilizado: string;
}

// 1. Fuentes dinámicas almacenadas en la colección 'fuentes'
export interface Fuente {
  id: string; // slug único (ej: 'el-cordillerano', 'catedral-alta-patagonia')
  nombre: string;
  url_base: string;
  url_noticias?: string;
  tipo: TipoFuente;
  prioridad: 1 | 2; // 1: Pulso diario activo | 2: Por demanda
  activo: boolean;
  beat_id?: BeatId;
  logo_url?: string;
  frecuencia_monitoreo?: string;
  created_at?: string;
}

// 2. Noticias individuales en la colección 'noticias'
export interface Noticia {
  id: string; // YYYY-MM-DD_slug-del-hecho
  fecha_publicacion: string; // YYYY-MM-DD
  fecha?: string; // Compatibilidad con documentos de Firestore
  fuente: { id: string; nombre: string; url_nota: string };
  medio?: string | unknown[]; // Compatibilidad con documentos de Firestore
  url?: string; // URL directa de la nota original
  area_id: AreaId;
  area?: string; // Nombre descriptivo del área (ej: 'Gestión Pública')
  seguimiento_id?: string | null; // Tema en Seguimiento (nomenclatura preferida)
  dossier_id: string | null; // Retrocompatibilidad con documentos y esquemas previos
  curada_manualmente?: boolean; // Bandera de curaduría humana aprobada por redacción
  titular: string;
  hecho_central: string;
  novedad_respecto_a_dias_previos?: string; // Rastreo diferencial ('El Delta')
  cuerpo_html?: string; // Redacción periodística profunda / cuerpo HTML
  datos_duros?: Record<string, string | number>;
  citas?: Array<{ autor: string; texto: string }>;
  media: { imagen_url: string; credito: string };
  imagen_url?: string; // Atajo directo de imagen
  foto?: string; // Compatibilidad de campo foto
  entidades?: { actores: string[]; lugares: string[] };
  tags?: string[];
  cobertura_cruzada?: number;
  created_at?: string;
}

// 3. Dossiers temáticos en la colección 'dossiers'
export interface Dossier {
  id: string; // slug único (ej: 'catedral-concesion')
  titulo: string;
  area_id: AreaId;
  estado: EstadoDossier;
  resumen_contexto: string;
  actores_clave: string[];
  timeline: HitoTimeline[];
  cronica_html?: string; // Artículo explicativo de fondo / crónica narrativa
  fecha_ultima_cronica?: string;
  ultima_actualizacion?: string;
}

// 4. Eventos de cartelera en la colección 'agenda'
export interface EventoAgenda {
  id: string; // YYYY-MM-DD_slug-evento
  titulo: string;
  categoria: CategoriaAgenda;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;
  horario?: string;
  lugar: string;
  tipo_acceso: TipoAccesoAgenda;
  descripcion_corta: string;
  url_info: string;
  imagen_url?: string;
  destacado?: boolean;
  noticia_origen_id?: string;
  created_at?: string;
}

// 5. Historial de newsletters en la colección 'ediciones'
export interface EdicionNewsletter {
  id: string; // YYYY-wWW (ej: '2026-w37')
  semana: number;
  anio: number;
  fecha_publicacion: string;
  asunto: string;
  hero_resumen: string | { titulo: string; imagen_url?: string; credito?: string; dossier_id?: string };
  dossiers_cubiertos: string[];
  html_content: string;
  estado: EstadoEdicion;
  despacho?: {
    plataforma?: string;
    campaign_id?: number;
    enviado_at?: string;
    destinatarios_totales?: number;
    entregados?: number;
    aperturas_unicas?: number;
    tasa_apertura?: number;
    hora_despacho?: string;
  };
  created_at?: string;
}

// 6. Entidad: Configuración de Branding y Ciudad (Documento 'configuracion/branding')
export interface ConfiguracionClima {
  ciudad: string;
  provincia?: string;
  pais?: string;
  latitud: number;
  longitud: number;
  activo: boolean;
}

export interface PronosticoDia {
  fecha: string;
  dia: string;
  temp_min: number;
  temp_max: number;
  condicion: string;
  codigo_wmo: number;
  icono: string;
}

export interface DatosClima {
  ciudad: string;
  provincia?: string;
  pais?: string;
  latitud: number;
  longitud: number;
  temperatura: number;
  sensacion_termica: number;
  temp_min: number;
  temp_max: number;
  humedad: number;
  viento_kmh: number;
  direccion_viento_grados?: number;
  condicion: string;
  codigo_wmo: number;
  icono: string;
  hora_actualizacion: string;
  pronostico_diario?: PronosticoDia[];
}

export interface ConfiguracionBranding {
  id?: string;
  nombre_medio: string;
  eslogan?: string;
  logo_url: string;
  favicon_url?: string;
  colores: {
    primario: string;
    secundario: string;
    acento: string;
    fondo_newsletter: string;
  };
  contacto: {
    email_redaccion?: string;
    email?: string;
    whatsapp_comercial?: string;
    whatsapp?: string;
    instagram?: string;
    sitio_web?: string;
  };
  clima?: ConfiguracionClima;
  updated_at?: string;
}

// 7. Entidad: Anunciante / Auspiciante (Colección 'anunciantes')
export interface Anunciante {
  id: string; // slug único
  nombre: string;
  activo: boolean;
  destino: DestinoAnuncio;
  ubicacion: UbicacionAnuncio;
  banner_url: string;
  enlace_click: string;
  texto_alt: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  prioridad: number;
  impresiones?: number;
  created_at?: string;
}

// 8. Resumen Global de Dashboard
export interface DashboardResumen {
  timestamp: string;
  noticias: {
    total: number;
    redactadas: number;
    con_foto: number;
    curadas_manualmente?: number;
    por_area: Record<string, number>;
    ultimas: Noticia[];
  };
  agenda: {
    total: number;
    destacados: number;
    ultimos: EventoAgenda[];
  };
  dossiers: {
    total: number;
    activos: number;
    en_seguimiento: number;
    resueltos: number;
    ultimos: Dossier[];
  };
  fuentes: {
    total: number;
    activas: number;
    inactivas: number;
    por_beat: Record<string, number>;
  };
  anunciantes: {
    total: number;
    activos: number;
  };
  ediciones: {
    total: number;
    enviadas: number;
    borradores: number;
    ultima: EdicionNewsletter | null;
  };
  branding: {
    nombre_medio: string;
    eslogan?: string;
    colores: {
      primario: string;
      secundario: string;
      acento: string;
      fondo_newsletter: string;
    };
    logo_url: string;
  };
  dbStatus: {
    mode: string;
    projectId: string;
    storageAvailable?: boolean;
    hasValidServiceAccount?: boolean;
    detectedEmail?: string;
    message?: string;
  } | null;
}

