import { Dossier, Noticia } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';
import { noticiasService } from './noticias.service.js';

export interface DossierConNoticias extends Dossier {
  noticias_vinculadas: Noticia[];
}

export class DossiersService {
  private repo = new FirestoreRepository<Dossier>('dossiers');

  async listar(soloActivos = false): Promise<Dossier[]> {
    const dossiers = await this.repo.getAll();
    if (soloActivos) {
      return dossiers.filter(d => d.estado === 'activo');
    }
    return dossiers.sort((a, b) => b.ultima_actualizacion.localeCompare(a.ultima_actualizacion));
  }

  async obtenerPorSlug(slug: string): Promise<DossierConNoticias | null> {
    const dossier = await this.repo.getById(slug);
    if (!dossier) return null;

    const noticias = await noticiasService.obtenerUltimasPorDossier(slug, 50);
    return {
      ...dossier,
      noticias_vinculadas: noticias,
    };
  }

  async crear(datos: Omit<Dossier, 'ultima_actualizacion'> & { ultima_actualizacion?: string }): Promise<Dossier> {
    const slug = (datos.id || datos.titulo || 'dossier')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 40);

    const nuevoDossier: Dossier = {
      ...datos,
      id: slug,
      estado: datos.estado || 'activo',
      actores_clave: datos.actores_clave || [],
      timeline: datos.timeline || [],
      ultima_actualizacion: datos.ultima_actualizacion || new Date().toISOString(),
    };
    return this.repo.set(slug, nuevoDossier);
  }

  async actualizar(slug: string, partial: Partial<Dossier>): Promise<Dossier | null> {
    const dataToUpdate = {
      ...partial,
      ultima_actualizacion: new Date().toISOString(),
    };
    return this.repo.update(slug, dataToUpdate);
  }

  async eliminar(slug: string): Promise<boolean> {
    return this.repo.delete(slug);
  }

  async agregarHitoTimeline(slug: string, hito: { fecha: string; hito: string; noticia_id?: string }): Promise<Dossier | null> {
    const dossier = await this.repo.getById(slug);
    if (!dossier) return null;

    const timeline = [...(dossier.timeline || []), hito].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return this.actualizar(slug, { timeline });
  }
}

export const dossiersService = new DossiersService();
