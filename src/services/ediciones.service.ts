import { EdicionNewsletter } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';

export class EdicionesService {
  private repo = new FirestoreRepository<EdicionNewsletter>('ediciones');

  async listar(): Promise<EdicionNewsletter[]> {
    const ediciones = await this.repo.getAll();
    return ediciones.sort((a, b) => b.fecha_publicacion.localeCompare(a.fecha_publicacion));
  }

  async obtenerPorId(id: string): Promise<EdicionNewsletter | null> {
    return this.repo.getById(id);
  }

  async crear(datos: EdicionNewsletter): Promise<EdicionNewsletter> {
    const nuevaEdicion: EdicionNewsletter = {
      ...datos,
      dossiers_cubiertos: datos.dossiers_cubiertos || [],
      estado: datos.estado || 'borrador',
      html_content: datos.html_content || '',
    };
    return this.repo.set(datos.id, nuevaEdicion);
  }

  async actualizar(id: string, partial: Partial<EdicionNewsletter>): Promise<EdicionNewsletter | null> {
    return this.repo.update(id, partial);
  }

  async eliminar(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}

export const edicionesService = new EdicionesService();
