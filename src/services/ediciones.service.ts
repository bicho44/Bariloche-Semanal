import { EdicionNewsletter } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';

export class EdicionesService {
  private repo = new FirestoreRepository<EdicionNewsletter>('ediciones');

  async listar(): Promise<EdicionNewsletter[]> {
    const ediciones = await this.repo.getAll();
    return ediciones
      .map(e => ({
        ...e,
        fecha_publicacion: e.fecha_publicacion || e.despacho?.enviado_at?.split('T')[0] || e.created_at?.split('T')[0] || '',
        semana: e.semana || (e.id && e.id.includes('-w') ? parseInt(e.id.split('-w')[1], 10) : 0),
        anio: e.anio || (e.id && e.id.includes('-') ? parseInt(e.id.split('-')[0], 10) : 2026),
      }))
      .sort((a, b) => {
        const valB = b.fecha_publicacion || b.despacho?.enviado_at || b.created_at || b.id || '';
        const valA = a.fecha_publicacion || a.despacho?.enviado_at || a.created_at || a.id || '';
        return String(valB).localeCompare(String(valA));
      });
  }

  async obtenerPorId(id: string): Promise<EdicionNewsletter | null> {
    const e = await this.repo.getById(id);
    if (!e) return null;
    return {
      ...e,
      fecha_publicacion: e.fecha_publicacion || e.despacho?.enviado_at?.split('T')[0] || e.created_at?.split('T')[0] || '',
      semana: e.semana || (e.id && e.id.includes('-w') ? parseInt(e.id.split('-w')[1], 10) : 0),
      anio: e.anio || (e.id && e.id.includes('-') ? parseInt(e.id.split('-')[0], 10) : 2026),
    };
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
