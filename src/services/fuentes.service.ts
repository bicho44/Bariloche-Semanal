import { Fuente } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';

export class FuentesService {
  private repo = new FirestoreRepository<Fuente>('fuentes');

  async listar(soloActivas = false): Promise<Fuente[]> {
    const fuentes = await this.repo.getAll();
    if (soloActivas) {
      return fuentes.filter(f => f.activo === true);
    }
    // Ordenar por prioridad ascendente (1 primero) y luego por nombre con protección contra valores undefined
    return fuentes.sort((a, b) => {
      const prioDiff = (a.prioridad ?? 1) - (b.prioridad ?? 1);
      if (prioDiff !== 0) return prioDiff;
      const nomA = String(a.nombre || a.id || '');
      const nomB = String(b.nombre || b.id || '');
      return nomA.localeCompare(nomB);
    });
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
