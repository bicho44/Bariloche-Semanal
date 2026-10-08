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

    // Manejo de compatibilidad si se pasa booleano (true = solo proximos/vigentes)
    let soloVigentes = false;
    let categoria: string | undefined = undefined;

    if (typeof options === 'boolean') {
      soloVigentes = options;
    } else if (typeof options === 'object') {
      soloVigentes = options.soloVigentes === true || options.todos === false;
      categoria = options.categoria;
    }

    // Normalizar estado resuelto en cada evento
    const normalizados = eventos.map(e => ({
      ...e,
      estado: (e.estado as EstadoEventoAgenda) || resolverEstadoEvento(e, hoy),
      arancel_estimado: e.arancel_estimado || (e.tipo_acceso === 'gratuito' ? 'Entrada libre' : ''),
    }));

    let filtrados = normalizados;
    if (soloVigentes) {
      filtrados = filtrados.filter(e => e.estado !== 'concluido' && (e.fecha_fin >= hoy || e.fecha_inicio >= hoy));
    }

    if (categoria && categoria !== 'todas') {
      filtrados = filtrados.filter(e => e.categoria === categoria);
    }

    // Ordenamiento: eventos vigentes por fecha asc, concluidos al final
    filtrados.sort((a, b) => {
      const aConcluido = a.estado === 'concluido';
      const bConcluido = b.estado === 'concluido';
      if (aConcluido && !bConcluido) return 1;
      if (!aConcluido && bConcluido) return -1;
      return String(a.fecha_inicio || a.id || '').localeCompare(String(b.fecha_inicio || b.id || ''));
    });

    return filtrados;
  }

  async obtenerPorId(id: string): Promise<EventoAgenda | null> {
    const evento = await this.repo.getById(id);
    if (!evento) return null;
    const hoy = new Date().toISOString().split('T')[0];
    return {
      ...evento,
      estado: evento.estado || resolverEstadoEvento(evento, hoy),
    };
  }

  async crear(datos: EventoAgenda): Promise<EventoAgenda> {
    const slug = (datos.titulo || 'evento')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 35);

    const id = datos.id || `${datos.fecha_inicio}_${slug}`;
    const hoy = new Date().toISOString().split('T')[0];
    const estado = datos.estado || resolverEstadoEvento(datos, hoy);

    const nuevoEvento: EventoAgenda = {
      ...datos,
      id,
      estado,
      arancel_estimado: datos.arancel_estimado || (datos.tipo_acceso === 'gratuito' ? 'Entrada libre' : ''),
      created_at: datos.created_at || new Date().toISOString(),
    };
    return this.repo.set(id, nuevoEvento);
  }

  async actualizar(id: string, partial: Partial<EventoAgenda>): Promise<EventoAgenda | null> {
    return this.repo.update(id, partial);
  }

  async eliminar(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}

export const agendaService = new AgendaService();
