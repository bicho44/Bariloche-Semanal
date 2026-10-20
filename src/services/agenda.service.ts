import { EventoAgenda, EstadoEventoAgenda } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';

export function resolverEstadoEvento(evento: Partial<EventoAgenda>, hoyStr?: string): EstadoEventoAgenda {
  if (evento.estado === 'concluido') return 'concluido';
  const hoy = hoyStr || new Date().toISOString().split('T')[0];
  const inicio = evento.fecha_inicio || '';
  const fin = evento.fecha_fin || inicio;

  if (fin && fin < hoy) {
    return 'concluido';
  }
  if (inicio <= hoy && (!fin || fin >= hoy)) {
    return 'hoy';
  }
  return 'vigente';
}

export function generarGoogleMapsUrl(lugar: string, direccion?: string): string {
  const query = `${lugar || ''} ${direccion || ''} San Carlos de Bariloche`.trim().replace(/\s+/g, ' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export interface ListarAgendaOptions {
  soloVigentes?: boolean;
  categoria?: string;
  todos?: boolean;
}

export class AgendaService {
  private repo = new FirestoreRepository<EventoAgenda>('agenda');

  async listar(options: ListarAgendaOptions | boolean = false): Promise<EventoAgenda[]> {
    const eventos = await this.repo.getAll();
    const hoy = new Date().toISOString().split('T')[0];

    // Por defecto, o si se especifica soloVigentes: true o todos: false, filtrar por fecha_fin >= hoy
    let soloVigentes = true;
    let categoria: string | undefined = undefined;

    if (typeof options === 'boolean') {
      soloVigentes = options;
    } else if (typeof options === 'object') {
      if (options.todos === true && options.soloVigentes !== true) {
        soloVigentes = false;
      } else {
        soloVigentes = options.soloVigentes !== false;
      }
      categoria = options.categoria;
    }

    // Normalizar estado resuelto y estado temporal en cada evento
    const normalizados: EventoAgenda[] = eventos.map(e => {
      const fechaFinEfectiva = e.fecha_fin || e.fecha_inicio || '';
      const esVigente = Boolean(fechaFinEfectiva && fechaFinEfectiva >= hoy);
      const estadoTemporal: 'vigente' | 'vencido' = esVigente ? 'vigente' : 'vencido';

      return {
        ...e,
        fecha_fin: fechaFinEfectiva,
        estado_temporal: estadoTemporal,
        estado: (e.estado as EstadoEventoAgenda) || resolverEstadoEvento(e, hoy),
        arancel_estimado: e.arancel_estimado || (e.tipo_acceso === 'gratuito' ? 'Entrada libre y gratuita' : ''),
        mapa_url: e.mapa_url || generarGoogleMapsUrl(e.lugar, e.direccion),
      };
    });

    let filtrados = normalizados;

    // Filtro de vigencia estricto: fecha_fin >= hoy (para exposiciones, muestras o ferias multi-día)
    if (soloVigentes) {
      filtrados = filtrados.filter(e => {
        const fin = e.fecha_fin || e.fecha_inicio;
        return fin && fin >= hoy && e.estado !== 'concluido';
      });
    }

    if (categoria && categoria !== 'todas') {
      filtrados = filtrados.filter(e => e.categoria === categoria);
    }

    // Ordenamiento: eventos vigentes por fecha asc, vencidos/concluidos al final
    filtrados.sort((a, b) => {
      const aVencido = a.estado_temporal === 'vencido' || a.estado === 'concluido';
      const bVencido = b.estado_temporal === 'vencido' || b.estado === 'concluido';
      if (aVencido && !bVencido) return 1;
      if (!aVencido && bVencido) return -1;
      return String(a.fecha_inicio || a.id || '').localeCompare(String(b.fecha_inicio || b.id || ''));
    });

    return filtrados;
  }

  async obtenerPorId(id: string): Promise<EventoAgenda | null> {
    const evento = await this.repo.getById(id);
    if (!evento) return null;
    const hoy = new Date().toISOString().split('T')[0];
    const fechaFinEfectiva = evento.fecha_fin || evento.fecha_inicio || '';
    const esVigente = Boolean(fechaFinEfectiva && fechaFinEfectiva >= hoy);

    return {
      ...evento,
      fecha_fin: fechaFinEfectiva,
      estado_temporal: esVigente ? 'vigente' : 'vencido',
      estado: evento.estado || resolverEstadoEvento(evento, hoy),
      mapa_url: evento.mapa_url || generarGoogleMapsUrl(evento.lugar, evento.direccion),
    };
  }

  async crear(datos: Partial<EventoAgenda> & { titulo: string; categoria: any; fecha_inicio: string; lugar: string; tipo_acceso: any; descripcion_corta: string }): Promise<EventoAgenda> {
    const slug = (datos.titulo || 'evento')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 35);

    const id = datos.id || `${datos.fecha_inicio}_${slug}`;
    const hoy = new Date().toISOString().split('T')[0];
    const fechaFinEfectiva = datos.fecha_fin || datos.fecha_inicio;
    const estado = datos.estado || resolverEstadoEvento(datos, hoy);
    const esVigente = Boolean(fechaFinEfectiva && fechaFinEfectiva >= hoy);

    const mapaUrl = datos.mapa_url?.trim() || generarGoogleMapsUrl(datos.lugar, datos.direccion);

    const nuevoEvento: EventoAgenda = {
      ...datos,
      id,
      titulo: datos.titulo.trim(),
      categoria: datos.categoria,
      fecha_inicio: datos.fecha_inicio,
      fecha_fin: fechaFinEfectiva,
      horario: datos.horario?.trim(),
      lugar: datos.lugar.trim(),
      direccion: datos.direccion?.trim() || undefined,
      mapa_url: mapaUrl,
      tipo_acceso: datos.tipo_acceso,
      arancel_estimado: datos.arancel_estimado?.trim() || (datos.tipo_acceso === 'gratuito' ? 'Entrada libre y gratuita' : ''),
      descripcion_corta: datos.descripcion_corta.trim(),
      url_info: datos.url_info?.trim() || '',
      url_tickets: datos.url_tickets?.trim() || null,
      imagen_url: datos.imagen_url || null,
      destacado: Boolean(datos.destacado),
      estado,
      estado_temporal: esVigente ? 'vigente' : 'vencido',
      noticia_origen_id: datos.noticia_origen_id || undefined,
      curada_manualmente: datos.curada_manualmente !== undefined ? Boolean(datos.curada_manualmente) : true,
      sincronizado_firestore: true,
      created_at: datos.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return this.repo.set(id, nuevoEvento);
  }

  async actualizar(id: string, partial: Partial<EventoAgenda>): Promise<EventoAgenda | null> {
    const dataToUpdate: Partial<EventoAgenda> = {
      ...partial,
      curada_manualmente: partial.curada_manualmente !== undefined ? Boolean(partial.curada_manualmente) : true,
      sincronizado_firestore: true,
      updated_at: new Date().toISOString(),
    };

    if (partial.lugar !== undefined || partial.direccion !== undefined) {
      if (!partial.mapa_url) {
        const actual = await this.repo.getById(id);
        const lugarFinal = partial.lugar ?? actual?.lugar ?? '';
        const direccionFinal = partial.direccion ?? actual?.direccion;
        dataToUpdate.mapa_url = generarGoogleMapsUrl(lugarFinal, direccionFinal);
      }
    }

    if (partial.fecha_fin || partial.fecha_inicio) {
      const hoy = new Date().toISOString().split('T')[0];
      const fin = partial.fecha_fin || partial.fecha_inicio || '';
      dataToUpdate.estado_temporal = (fin && fin >= hoy) ? 'vigente' : 'vencido';
    }

    return this.repo.update(id, dataToUpdate);
  }

  async eliminar(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  /**
   * Elimina todos los eventos cuya fecha_fin sea menor a la fecha actual (hoy)
   */
  async purgarVencidos(): Promise<{ eliminados: number; ids: string[] }> {
    const hoy = new Date().toISOString().split('T')[0];
    const eventos = await this.repo.getAll();
    const vencidos = eventos.filter(e => {
      const fin = e.fecha_fin || e.fecha_inicio;
      return fin && fin < hoy;
    });

    const idsEliminados: string[] = [];
    for (const ev of vencidos) {
      const ok = await this.repo.delete(ev.id);
      if (ok) {
        idsEliminados.push(ev.id);
      }
    }

    return {
      eliminados: idsEliminados.length,
      ids: idsEliminados,
    };
  }
}

export const agendaService = new AgendaService();
