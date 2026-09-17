import { EventoAgenda } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';

export class AgendaService {
  private repo = new FirestoreRepository<EventoAgenda>('agenda');

  async listar(proximos = true): Promise<EventoAgenda[]> {
    const eventos = await this.repo.getAll();
    const hoy = new Date().toISOString().split('T')[0];

    let filtrados = eventos;
    if (proximos) {
      filtrados = eventos.filter(e => e.fecha_inicio >= hoy || (e.fecha_fin && e.fecha_fin >= hoy));
      // Orden cronológico ascendente (el más próximo primero)
      filtrados.sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
    } else {
      // Todos los eventos para el panel de administración, ordenados por fecha de inicio desc
      filtrados.sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
    }

    return filtrados;
  }

  async obtenerPorId(id: string): Promise<EventoAgenda | null> {
    return this.repo.getById(id);
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
    const nuevoEvento: EventoAgenda = {
      ...datos,
      id,
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
