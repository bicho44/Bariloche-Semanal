import { Fuente } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';

export class FuentesService {
  private repo = new FirestoreRepository<Fuente>('fuentes');

  async listar(soloActivas = false): Promise<Fuente[]> {
    const fuentes = await this.repo.getAll();
    if (soloActivas) {
      return fuentes.filter(f => f.activo === true);
    }
    // Ordenar por prioridad ascendente (1 primero) y luego por nombre
    return fuentes.sort((a, b) => a.prioridad - b.prioridad || a.nombre.localeCompare(b.nombre));
  }

  async obtenerPorId(id: string): Promise<Fuente | null> {
    return this.repo.getById(id);
  }

  async crear(datos: Omit<Fuente, 'created_at'> & { created_at?: string }): Promise<Fuente> {
    const nuevaFuente: Fuente = {
      ...datos,
      activo: datos.activo !== undefined ? datos.activo : true,
      prioridad: datos.prioridad || 1,
      created_at: datos.created_at || new Date().toISOString(),
    };
    return this.repo.set(nuevaFuente.id, nuevaFuente);
  }

  async actualizar(id: string, partial: Partial<Fuente>): Promise<Fuente | null> {
    return this.repo.update(id, partial);
  }

  async eliminar(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}

export const fuentesService = new FuentesService();
