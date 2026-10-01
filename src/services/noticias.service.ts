import { Noticia, AreaId } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';
import { getFechaArgentina } from '../utils/date.js';

export interface NoticiasFiltros {
  area_id?: AreaId;
  seguimiento_id?: string;
  dossier_id?: string;
  fuente_id?: string;
  fecha?: string;
  con_foto?: boolean;
  curada_manualmente?: boolean;
  estado_redaccion?: 'redactada' | 'pendiente';
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const AREA_MAP_FROM_LABEL: Record<string, AreaId> = {
  'gestión pública': 'gestion-publica',
  'gestion publica': 'gestion-publica',
  'gestion-publica': 'gestion-publica',
  'turismo': 'turismo',
  'pulso turístico': 'turismo',
  'pulso turistico': 'turismo',
  'deportes': 'deportes',
  'legales y comercio': 'legales-comercio',
  'legales & comercio': 'legales-comercio',
  'legales-comercio': 'legales-comercio',
  'alquileres e inmobiliario': 'alquileres-inmobiliario',
  'alquileres & mercado inmobiliario': 'alquileres-inmobiliario',
  'alquileres-inmobiliario': 'alquileres-inmobiliario',
  'vida social y cultura': 'vida-social-cultura',
  'vida social, cultura & comunidad': 'vida-social-cultura',
  'vida-social-cultura': 'vida-social-cultura',
  'en el radar': 'en-el-radar',
  'en-el-radar': 'en-el-radar',
};

const AREA_LABEL_MAP: Record<AreaId, string> = {
  'gestion-publica': 'Gestión Pública',
  'turismo': 'Pulso Turístico',
  'deportes': 'Deportes',
  'legales-comercio': 'Legales & Comercio',
  'alquileres-inmobiliario': 'Alquileres & Mercado Inmobiliario',
  'vida-social-cultura': 'Vida Social, Cultura & Comunidad',
  'en-el-radar': 'En el Radar',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function normalizeNoticia(raw: any): Noticia {
  if (!raw) return raw;

  // 1. Fecha
  const rawDateStr =
    (typeof raw.fecha_publicacion === 'string' && raw.fecha_publicacion.trim()) ||
    (typeof raw.fecha === 'string' && raw.fecha.trim()) ||
    (typeof raw.created_at === 'string' && raw.created_at.split('T')[0]);
  const fechaPublicacion = getFechaArgentina(rawDateStr);

  // 2. Área
  let areaId: AreaId = 'gestion-publica';
  let areaLabel = 'Gestión Pública';

  if (raw.area_id && AREA_LABEL_MAP[raw.area_id as AreaId]) {
    areaId = raw.area_id as AreaId;
    areaLabel = raw.area || AREA_LABEL_MAP[areaId];
  } else {
    const rawArea = (raw.area || raw.area_id || '').toString().toLowerCase().trim();
    if (AREA_MAP_FROM_LABEL[rawArea]) {
      areaId = AREA_MAP_FROM_LABEL[rawArea];
      areaLabel = raw.area || AREA_LABEL_MAP[areaId];
    } else if (rawArea.includes('gestion') || rawArea.includes('publica') || rawArea.includes('pública')) {
      areaId = 'gestion-publica';
      areaLabel = 'Gestión Pública';
    } else if (rawArea.includes('turism') || rawArea.includes('pulso')) {
      areaId = 'turismo';
      areaLabel = 'Pulso Turístico';
    } else if (rawArea.includes('deport')) {
      areaId = 'deportes';
      areaLabel = 'Deportes';
    } else if (rawArea.includes('alquiler') || rawArea.includes('inmobiliari')) {
      areaId = 'alquileres-inmobiliario';
      areaLabel = 'Alquileres & Mercado Inmobiliario';
    } else if (rawArea.includes('social') || rawArea.includes('cultur') || rawArea.includes('comunidad')) {
      areaId = 'vida-social-cultura';
      areaLabel = 'Vida Social, Cultura & Comunidad';
    } else if (rawArea.includes('radar')) {
      areaId = 'en-el-radar';
      areaLabel = 'En el Radar';
    } else if (rawArea.includes('legal') || rawArea.includes('comercio')) {
      areaId = 'legales-comercio';
      areaLabel = 'Legales & Comercio';
    } else if (raw.area) {
      areaLabel = raw.area;
    }
  }

  // 3. Fuente
  let fuenteNombre = 'Fuente Bariloche';
  let fuenteUrl = typeof raw.url === 'string' ? raw.url : '';
  let fuenteId = '';

  if (raw.fuente && typeof raw.fuente === 'object') {
    fuenteNombre = raw.fuente.nombre || fuenteNombre;
    fuenteUrl = raw.fuente.url_nota || fuenteUrl;
    fuenteId = raw.fuente.id || slugify(fuenteNombre);
  } else if (Array.isArray(raw.medio)) {
    if (typeof raw.medio[1] === 'string' && raw.medio[1].trim()) {
      fuenteNombre = raw.medio[1].trim();
    } else {
      const found = raw.medio.find((m: unknown) => typeof m === 'string' && (m as string).trim());
      if (found) fuenteNombre = (found as string).trim();
    }
    if (typeof raw.medio[5] === 'string' && raw.medio[5].startsWith('http')) {
      fuenteUrl = raw.medio[5];
    }
    fuenteId = slugify(fuenteNombre) || 'fuente-local';
  } else if (typeof raw.medio === 'string' && raw.medio.trim()) {
    fuenteNombre = raw.medio.trim();
    fuenteId = slugify(fuenteNombre) || 'fuente-local';
  } else if (raw.medio && typeof raw.medio === 'object' && (raw.medio as any).nombre) {
    fuenteNombre = (raw.medio as any).nombre;
    fuenteId = (raw.medio as any).id || slugify(fuenteNombre);
    fuenteUrl = (raw.medio as any).url_nota || fuenteUrl;
  } else {
    fuenteId = 'fuente-local';
  }

  // 4. Media / Foto
  let imagenUrl = '';
  let creditoFoto = '';

  if (raw.media && typeof raw.media === 'object') {
    imagenUrl = raw.media.imagen_url || raw.imagen_url || raw.foto || raw.imagen || '';
    creditoFoto = raw.media.credito || raw.credito_foto || '';
  } else {
    imagenUrl = raw.imagen_url || raw.foto || raw.imagen || '';
    creditoFoto = raw.credito_foto || raw.credito || '';
  }

  return {
    id: raw.id,
    fecha_publicacion: fechaPublicacion,
    fecha: fechaPublicacion,
    area_id: areaId,
    area: areaLabel,
    fuente: {
      id: fuenteId || 'fuente-local',
      nombre: fuenteNombre,
      url_nota: fuenteUrl,
    },
    medio: raw.medio,
    url: fuenteUrl,
    seguimiento_id: (typeof raw.seguimiento_id === 'string' && raw.seguimiento_id.trim()) || (typeof raw.dossier_id === 'string' && raw.dossier_id.trim()) || null,
    dossier_id: (typeof raw.seguimiento_id === 'string' && raw.seguimiento_id.trim()) || (typeof raw.dossier_id === 'string' && raw.dossier_id.trim()) || null,
    curada_manualmente: Boolean(raw.curada_manualmente),
    titular: raw.titular || 'Sin titular',
    hecho_central: raw.hecho_central || '',
    novedad_respecto_a_dias_previos: raw.novedad_respecto_a_dias_previos || undefined,
    cuerpo_html: raw.cuerpo_html || '',
    datos_duros: raw.datos_duros || {},
    citas: raw.citas || [],
    media: {
      imagen_url: imagenUrl,
      credito: creditoFoto,
    },
    imagen_url: imagenUrl,
    foto: imagenUrl,
    entidades: raw.entidades || { actores: [], lugares: [] },
    tags: raw.tags || [],
    cobertura_cruzada: raw.cobertura_cruzada || 1,
    created_at: raw.created_at || new Date().toISOString(),
  };
}

export class NoticiasService {
  private repo = new FirestoreRepository<Noticia>('noticias');

  async listar(filtros: NoticiasFiltros = {}): Promise<PaginatedResult<Noticia>> {
    const rawNoticias = await this.repo.getAll();
    let noticias = rawNoticias.map(normalizeNoticia);

    // Filtros
    if (filtros.area_id) {
      noticias = noticias.filter(n => n.area_id === filtros.area_id);
    }
    if (filtros.seguimiento_id || filtros.dossier_id) {
      const targetId = filtros.seguimiento_id || filtros.dossier_id;
      noticias = noticias.filter(n => n.seguimiento_id === targetId || n.dossier_id === targetId);
    }
    if (filtros.curada_manualmente !== undefined) {
      noticias = noticias.filter(n => Boolean(n.curada_manualmente) === filtros.curada_manualmente);
    }
    if (filtros.fuente_id) {
      noticias = noticias.filter(n => n.fuente && (n.fuente.id === filtros.fuente_id || slugify(n.fuente.nombre) === filtros.fuente_id));
    }
    if (filtros.fecha) {
      noticias = noticias.filter(n => n.fecha_publicacion === filtros.fecha || n.fecha === filtros.fecha);
    }
    if (filtros.con_foto !== undefined) {
      noticias = noticias.filter(n => filtros.con_foto ? !!n.media?.imagen_url : !n.media?.imagen_url);
    }
    if (filtros.estado_redaccion) {
      if (filtros.estado_redaccion === 'redactada') {
        noticias = noticias.filter(n => !!n.cuerpo_html && n.cuerpo_html.trim().length > 0);
      } else if (filtros.estado_redaccion === 'pendiente') {
        noticias = noticias.filter(n => !n.cuerpo_html || n.cuerpo_html.trim().length === 0);
      }
    }
    if (filtros.search) {
      const q = filtros.search.toLowerCase();
      noticias = noticias.filter(n => 
        (n.titular && n.titular.toLowerCase().includes(q)) || 
        (n.hecho_central && n.hecho_central.toLowerCase().includes(q)) ||
        (n.fuente?.nombre && n.fuente.nombre.toLowerCase().includes(q)) ||
        (n.area && n.area.toLowerCase().includes(q)) ||
        (n.novedad_respecto_a_dias_previos && n.novedad_respecto_a_dias_previos.toLowerCase().includes(q))
      );
    }

    // Orden cronológico inverso (más recientes primero)
    noticias.sort((a, b) => {
      const timeA = new Date(a.fecha_publicacion || a.fecha || 0).getTime();
      const timeB = new Date(b.fecha_publicacion || b.fecha || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    const total = noticias.length;
    const page = Math.max(1, filtros.page || 1);
    const limit = Math.max(1, filtros.limit || 50);
    const startIndex = (page - 1) * limit;
    const paginatedData = noticias.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async obtenerPorId(id: string): Promise<Noticia | null> {
    const raw = await this.repo.getById(id);
    return raw ? normalizeNoticia(raw) : null;
  }

  async crear(datos: Omit<Noticia, 'created_at'> & { created_at?: string }): Promise<Noticia> {
    const titularLimpio = (datos.titular || '').trim();
    if (!titularLimpio || titularLimpio.length < 10) {
      throw new Error('Validación estricta (anti-huérfanas): el titular es obligatorio y debe tener al menos 10 caracteres');
    }

    const slug = titularLimpio
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 40);

    // Forzar zona horaria America/Argentina/Buenos_Aires para evitar saltos de fecha tras 21:00 hs
    const fecha = getFechaArgentina(datos.fecha_publicacion || datos.fecha);
    const id = datos.id || `${fecha}_${slug}`;
    const areaLabel = AREA_LABEL_MAP[datos.area_id] || datos.area || 'Gestión Pública';
    const imagenUrl = datos.media?.imagen_url || datos.imagen_url || '';
    const seguimientoId = datos.seguimiento_id || datos.dossier_id || null;

    const nuevaNoticia: Noticia = {
      ...datos,
      id,
      titular: titularLimpio,
      fecha_publicacion: fecha,
      fecha,
      area_id: datos.area_id,
      area: areaLabel,
      url: datos.fuente?.url_nota || datos.url || '',
      seguimiento_id: seguimientoId,
      dossier_id: seguimientoId, // Retrocompatibilidad con Firestore
      curada_manualmente: true, // Bandera de curaduría humana aprobada
      cobertura_cruzada: datos.cobertura_cruzada || 1,
      citas: datos.citas || [],
      entidades: datos.entidades || { actores: [], lugares: [] },
      datos_duros: datos.datos_duros || {},
      media: {
        imagen_url: imagenUrl,
        credito: datos.media?.credito || '',
      },
      imagen_url: imagenUrl,
      foto: imagenUrl,
      created_at: datos.created_at || new Date().toISOString(),
    };

    const guardada = await this.repo.set(id, nuevaNoticia);
    return normalizeNoticia(guardada);
  }

  async actualizar(id: string, partial: Partial<Noticia>): Promise<Noticia | null> {
    const updates: Record<string, unknown> = { ...partial };

    // Validación estricta anti-huérfanas para titular
    if (partial.titular !== undefined) {
      const titularLimpio = (partial.titular || '').trim();
      if (!titularLimpio || titularLimpio.length < 10) {
        throw new Error('Validación estricta (anti-huérfanas): el titular no puede tener menos de 10 caracteres');
      }
      updates.titular = titularLimpio;
    }

    // Sincronizar campos de fecha con zona horaria Argentina
    if (partial.fecha_publicacion || partial.fecha) {
      const f = getFechaArgentina(partial.fecha_publicacion || partial.fecha);
      updates.fecha = f;
      updates.fecha_publicacion = f;
    }

    // Nomenclatura Temas en Seguimiento con retrocompatibilidad Firestore
    if (partial.seguimiento_id !== undefined || partial.dossier_id !== undefined) {
      const sid = partial.seguimiento_id || partial.dossier_id || null;
      updates.seguimiento_id = sid;
      updates.dossier_id = sid;
    }

    // Bandera de Curaduría Humana (aprobación editorial)
    updates.curada_manualmente = true;

    // Sincronizar campos bidireccionales de área
    if (partial.area_id && AREA_LABEL_MAP[partial.area_id]) {
      updates.area_id = partial.area_id;
      updates.area = AREA_LABEL_MAP[partial.area_id];
    } else if (partial.area) {
      const normArea = partial.area.toLowerCase().trim();
      const resolvedAreaId = AREA_MAP_FROM_LABEL[normArea] || 'gestion-publica';
      updates.area_id = resolvedAreaId;
      updates.area = AREA_LABEL_MAP[resolvedAreaId] || partial.area;
    }

    // Sincronizar Fuente y URL
    if (partial.fuente) {
      const nombre = partial.fuente.nombre || 'Fuente Bariloche';
      const idFuente = partial.fuente.id || slugify(nombre);
      const urlNota = partial.fuente.url_nota || (typeof updates.url === 'string' ? updates.url : '');
      updates.fuente = {
        id: idFuente,
        nombre,
        url_nota: urlNota,
      };
      updates.url = urlNota;
    } else if (partial.url) {
      updates.url = partial.url;
    }

    // Sincronizar Media e Imágenes
    if (partial.media?.imagen_url !== undefined) {
      updates.imagen_url = partial.media.imagen_url;
      updates.foto = partial.media.imagen_url;
      updates.media = {
        imagen_url: partial.media.imagen_url,
        credito: partial.media.credito || '',
      };
    } else if (partial.imagen_url !== undefined || (partial as any).foto !== undefined) {
      const img = partial.imagen_url || (partial as any).foto || '';
      updates.imagen_url = img;
      updates.foto = img;
      updates.media = {
        imagen_url: img,
        credito: partial.media?.credito || '',
      };
    }

    // Mantener array de medio sincronizado si el documento de Firestore lo utilizaba
    try {
      const current = await this.repo.getById(id);
      if (current && Array.isArray((current as any).medio)) {
        const medioArr = [...(current as any).medio];
        if (updates.fuente && typeof (updates.fuente as any).nombre === 'string') {
          medioArr[1] = (updates.fuente as any).nombre;
        }
        if (typeof updates.area === 'string') {
          medioArr[2] = updates.area;
        }
        if (typeof updates.titular === 'string') {
          medioArr[3] = updates.titular;
        }
        if (typeof updates.hecho_central === 'string') {
          medioArr[4] = updates.hecho_central;
        }
        if (typeof updates.url === 'string') {
          medioArr[5] = updates.url;
        }
        updates.medio = medioArr;
      }
    } catch {
      // Si no se puede leer current, continuar con updates
    }

    updates.updated_at = new Date().toISOString();

    const updated = await this.repo.update(id, updates as Partial<Noticia>);
    return updated ? normalizeNoticia(updated) : null;
  }

  async eliminar(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async obtenerUltimasPorDossier(dossierId: string, limit = 10): Promise<Noticia[]> {
    const todasRaw = await this.repo.getAll();
    const todas = todasRaw.map(normalizeNoticia);
    return todas
      .filter(n => n.seguimiento_id === dossierId || n.dossier_id === dossierId)
      .sort((a, b) => new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime())
      .slice(0, limit);
  }
}

export const noticiasService = new NoticiasService();
