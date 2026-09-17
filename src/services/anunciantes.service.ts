import { Anunciante } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';

export interface AnunciantesFiltros {
  activo?: boolean;
  destino?: 'newsletter' | 'web' | 'ambos';
  ubicacion?: 'pre-footer' | 'footer' | 'header';
}

export class AnunciantesService {
  private repo = new FirestoreRepository<Anunciante>('anunciantes');

  async listar(filtros: AnunciantesFiltros = {}): Promise<Anunciante[]> {
    let anunciantes = await this.repo.getAll();

    if (filtros.activo !== undefined) {
      anunciantes = anunciantes.filter(a => a.activo === filtros.activo);
    }
    if (filtros.destino) {
      anunciantes = anunciantes.filter(a => a.destino === filtros.destino || a.destino === 'ambos');
    }
    if (filtros.ubicacion) {
      anunciantes = anunciantes.filter(a => a.ubicacion === filtros.ubicacion);
    }

    // Ordenar por prioridad desc, luego por menos impresiones (round-robin)
    return anunciantes.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0) || (a.impresiones || 0) - (b.impresiones || 0));
  }

  async obtenerPorId(id: string): Promise<Anunciante | null> {
    return this.repo.getById(id);
  }

  async crear(datos: Omit<Anunciante, 'created_at'> & { created_at?: string }): Promise<Anunciante> {
    const slug = (datos.id || datos.nombre || 'anunciante')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 40);

    const nuevo: Anunciante = {
      ...datos,
      id: slug,
      activo: datos.activo !== undefined ? datos.activo : true,
      prioridad: datos.prioridad || 1,
      impresiones: datos.impresiones || 0,
      created_at: datos.created_at || new Date().toISOString(),
    };

    return this.repo.set(slug, nuevo);
  }

  async actualizar(id: string, partial: Partial<Anunciante>): Promise<Anunciante | null> {
    return this.repo.update(id, partial);
  }

  async eliminar(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async registrarImpresion(id: string): Promise<void> {
    const anunciante = await this.repo.getById(id);
    if (anunciante) {
      await this.repo.update(id, { impresiones: (anunciante.impresiones || 0) + 1 });
    }
  }

  /**
   * Compilador de bloque HTML para newsletters o web:
   * Genera el layout responsivo pre-footer (1 col móvil, 2 col desktop)
   * o rota por menor cantidad de impresiones (round-robin).
   */
  async compilarBloquePreFooterNewsletter(): Promise<{ html: string; anunciantes_usados: Anunciante[] }> {
    const activos = await this.listar({ activo: true, destino: 'newsletter', ubicacion: 'pre-footer' });

    if (activos.length === 0) {
      return { html: '', anunciantes_usados: [] };
    }

    // Registrar impresiones
    for (const a of activos) {
      await this.registrarImpresion(a.id);
    }

    if (activos.length === 1) {
      const a = activos[0];
      const html = `
      <div style="margin: 24px 0; text-align: center;">
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; display: block; margin-bottom: 6px;">Espacio Publicitario</span>
        <a href="${a.enlace_click}" target="_blank" rel="noopener noreferrer" style="display: inline-block; max-width: 100%;">
          <img src="${a.banner_url}" alt="${a.texto_alt}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0;" />
        </a>
      </div>`;
      return { html, anunciantes_usados: activos };
    }

    // 2 o más anunciantes: Grilla responsiva de 2 columnas compatible con clientes de correo (Outlook/Gmail)
    const itemsHtml = activos.map(a => `
      <td class="ad-col" style="width: 50%; padding: 8px; vertical-align: top;" align="center">
        <a href="${a.enlace_click}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block;">
          <img src="${a.banner_url}" alt="${a.texto_alt}" style="width: 100%; max-width: 280px; height: auto; border-radius: 8px; border: 1px solid #e2e8f0; display: block;" />
        </a>
      </td>
    `).join('');

    const html = `
    <!-- Bloque Auspiciantes Pre-Footer Bariloche Semanal -->
    <div style="margin: 32px 0 16px; padding: 16px 0; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1;">
      <div style="text-align: center; margin-bottom: 12px;">
        <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">
          Auspician Bariloche Semanal
        </span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed;">
        <tr>
          ${itemsHtml}
        </tr>
      </table>
    </div>
    `;

    return { html, anunciantes_usados: activos };
  }
}

export const anunciantesService = new AnunciantesService();
