import { Noticia, AreaId } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';

export interface NoticiasFiltros {
  area_id?: AreaId;
  dossier_id?: string;
  fuente_id?: string;
  fecha?: string;
  con_foto?: boolean;
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
  const fechaPublicacion =
    (typeof raw.fecha_publicacion === 'string' && raw.fecha_publicacion.trim()) ||
    (typeof raw.fecha === 'string' && raw.fecha.trim()) ||
    (typeof raw.created_at === 'string' && raw.created_at.split('T')[0]) ||
    new Date().toISOString().split('T')[0];

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
    dossier_id: raw.dossier_id || null,
    titular: raw.titular || 'Sin titular',
    hecho_central: raw.hecho_central || '',
    novedad_respecto_a_dias_previos: raw.novedad_respecto_a_dias_previos || undefined,
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
    if (filtros.dossier_id) {
      noticias = noticias.filter(n => n.dossier_id === filtros.dossier_id);
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
    const slug = (datos.titular || 'nota')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 40);

    const fecha = datos.fecha_publicacion || datos.fecha || new Date().toISOString().split('T')[0];
    const id = datos.id || `${fecha}_${slug}`;
    const areaLabel = AREA_LABEL_MAP[datos.area_id] || datos.area || 'Gestión Pública';
    const imagenUrl = datos.media?.imagen_url || datos.imagen_url || '';

    const nuevaNoticia: Noticia = {
      ...datos,
      id,
      fecha_publicacion: fecha,
      fecha,
      area_id: datos.area_id,
      area: areaLabel,
      url: datos.fuente?.url_nota || datos.url || '',
      dossier_id: datos.dossier_id || null,
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
    const updates: Partial<Noticia> = { ...partial };

    // Sincronizar campos bidireccionales
    if (partial.fecha_publicacion) {
      updates.fecha = partial.fecha_publicacion;
    } else if (partial.fecha) {
      updates.fecha_publicacion = partial.fecha;
    }

    if (partial.area_id && AREA_LABEL_MAP[partial.area_id]) {
      updates.area = AREA_LABEL_MAP[partial.area_id];
    } else if (partial.area && AREA_MAP_FROM_LABEL[partial.area.toLowerCase().trim()]) {
      updates.area_id = AREA_MAP_FROM_LABEL[partial.area.toLowerCase().trim()];
    }

    if (partial.fuente?.url_nota) {
      updates.url = partial.fuente.url_nota;
    }

    if (partial.media?.imagen_url !== undefined) {
      updates.imagen_url = partial.media.imagen_url;
      updates.foto = partial.media.imagen_url;
    } else if (partial.imagen_url !== undefined) {
      updates.media = {
        imagen_url: partial.imagen_url,
        credito: partial.media?.credito || '',
      };
      updates.foto = partial.imagen_url;
    }

    const updated = await this.repo.update(id, updates);
    return updated ? normalizeNoticia(updated) : null;
  }

  async eliminar(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async obtenerUltimasPorDossier(dossierId: string, limit = 10): Promise<Noticia[]> {
    const todasRaw = await this.repo.getAll();
    const todas = todasRaw.map(normalizeNoticia);
    return todas
      .filter(n => n.dossier_id === dossierId)
      .sort((a, b) => new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime())
      .slice(0, limit);
  }
}

export const noticiasService = new NoticiasService();
