import { ConfiguracionBranding } from '../types/index.js';
import { FirestoreRepository } from './firestore.repository.js';

export class BrandingService {
  private repo = new FirestoreRepository<ConfiguracionBranding>('configuracion');
  private readonly DOC_ID = 'branding';

  async obtener(): Promise<ConfiguracionBranding> {
    const config = await this.repo.getById(this.DOC_ID);
    if (config) {
      return config;
    }

    // Configuración base de identidad visual para Bariloche Semanal
    const defaultConfig: ConfiguracionBranding = {
      nombre_medio: 'Bariloche Semanal',
      logo_url: '',
      favicon_url: '',
      colores: {
        primario: '#1e3a8a', // Azul cordillerano
        secundario: '#0284c7', // Celeste Nahuel Huapi
        acento: '#f59e0b', // Ámbar patagónico
        fondo_newsletter: '#f8fafc',
      },
      contacto: {
        email_redaccion: 'redaccion@barilochesemanal.com.ar',
        whatsapp_comercial: '+54 9 294 400-0000',
        instagram: '@barilochesemanal',
      },
      updated_at: new Date().toISOString(),
    };

    return this.repo.set(this.DOC_ID, defaultConfig);
  }

  async actualizar(partial: Partial<ConfiguracionBranding>): Promise<ConfiguracionBranding> {
    const actual = await this.obtener();
    const actualizada: ConfiguracionBranding = {
      ...actual,
      ...partial,
      colores: {
        ...actual.colores,
        ...(partial.colores || {}),
      },
      contacto: {
        ...actual.contacto,
        ...(partial.contacto || {}),
      },
      updated_at: new Date().toISOString(),
    };

    return this.repo.set(this.DOC_ID, actualizada);
  }
}

export const brandingService = new BrandingService();
