import fs from 'fs';
import path from 'path';
import { getFirebaseStorage, checkStorageAvailability, STORAGE_BUCKET } from '../config/firebase.js';

export interface UploadResult {
  url: string;
  storage_path: string;
}

export interface RemoteFetchResult extends UploadResult {
  original_url: string;
}

const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureUploadsDir(): void {
  if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
    fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Resuelve una URL local o relativa a una URL pública absoluta si APP_URL está configurado.
 */
export function resolvePublicUrl(urlPath: string, hostHeader?: string): string {
  if (!urlPath) return '';
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://') || urlPath.startsWith('data:')) {
    return urlPath;
  }
  const appUrl = process.env.APP_URL || (hostHeader ? `https://${hostHeader}` : '');
  if (appUrl) {
    const cleanBase = appUrl.replace(/\/+$/, '');
    const cleanPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
    return `${cleanBase}${cleanPath}`;
  }
  return urlPath;
}

export class MediaService {
  async uploadImage(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<UploadResult> {
    ensureUploadsDir();

    const timestamp = Date.now();
    const ext = path.extname(originalName) || (mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : mimeType.includes('gif') ? '.gif' : mimeType.includes('svg') ? '.svg' : '.jpg');
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'imagen';
    const fileName = `${timestamp}_${baseName}${ext.toLowerCase()}`;
    const storagePath = `media/${fileName}`;

    // 1. Verificar si Firebase Storage está habilitado y el bucket existe
    const storageActive = await checkStorageAvailability();

    if (storageActive) {
      try {
        const storage = getFirebaseStorage();
        if (storage) {
          const bucket = storage.bucket(STORAGE_BUCKET);
          const file = bucket.file(storagePath);

          await file.save(fileBuffer, {
            metadata: {
              contentType: mimeType,
              cacheControl: 'public, max-age=31536000',
            },
          });

          // Guardar copia local también para redundancia y fallback inmediato
          const localPath = path.join(PUBLIC_UPLOADS_DIR, fileName);
          fs.writeFileSync(localPath, fileBuffer);

          try {
            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${storagePath}`;
            console.info(`[MediaService] Imagen subida a Firebase Storage: ${publicUrl}`);

            return {
              url: publicUrl,
              storage_path: storagePath,
            };
          } catch {
            const [signedUrl] = await file.getSignedUrl({
              action: 'read',
              expires: '03-09-2491',
            });
            return {
              url: signedUrl,
              storage_path: storagePath,
            };
          }
        }
      } catch (err: unknown) {
        const errMsg = (err as Error)?.message || 'Cloud Storage no disponible';
        console.info(`[MediaService] Guardando en servidor local (${errMsg}).`);
      }
    }

    // 2. Almacenamiento local seguro en el servidor (/uploads)
    const localPath = path.join(PUBLIC_UPLOADS_DIR, fileName);
    fs.writeFileSync(localPath, fileBuffer);
    const localUrl = `/uploads/${fileName}`;

    return {
      url: localUrl,
      storage_path: `local/${fileName}`,
    };
  }

  /**
   * Descarga una imagen desde cualquier URL remota (de portales de noticias o anunciantes),
   * y la guarda de forma permanente en el almacenamiento (Firebase Storage / uploads del servidor).
   * Así, la imagen nunca más dependerá de si el portal original la borra, cambia o restringe.
   */
  async fetchAndSaveRemoteImage(remoteUrl: string): Promise<RemoteFetchResult> {
    if (!remoteUrl || (!remoteUrl.startsWith('http://') && !remoteUrl.startsWith('https://'))) {
      throw new Error('La URL remota debe comenzar con http:// o https://');
    }

    const parsed = new URL(remoteUrl);
    const response = await fetch(remoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': `${parsed.protocol}//${parsed.hostname}/`,
      },
    });

    if (!response.ok) {
      throw new Error(`El servidor remoto respondió con estado HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
      throw new Error(`El recurso remoto no es una imagen válida (Content-Type: ${contentType})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let originalName = path.basename(parsed.pathname) || 'remota.jpg';
    if (!originalName.includes('.')) {
      const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
      originalName += ext;
    }

    const uploadResult = await this.uploadImage(buffer, originalName, contentType);

    return {
      ...uploadResult,
      original_url: remoteUrl,
    };
  }

  /**
   * Actúa como proxy resiliente de imágenes externas o locales.
   * Evita bloqueos de CORS, restricciones de Referrer y protección anti-hotlinking
   * de sitios periodísticos de Bariloche y anunciantes.
   */
  async proxyImage(rawUrl: string): Promise<{ buffer: Buffer; contentType: string; status: number }> {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new Error('URL requerida para el proxy de imágenes');
    }

    const cleanUrl = rawUrl.trim();

    // Caso 1: Imagen local /uploads
    if (cleanUrl.startsWith('/uploads/')) {
      const filename = path.basename(cleanUrl);
      const filePath = path.join(PUBLIC_UPLOADS_DIR, filename);

      if (fs.existsSync(filePath)) {
        const ext = path.extname(filename).toLowerCase();
        const contentType =
          ext === '.png' ? 'image/png' :
          ext === '.webp' ? 'image/webp' :
          ext === '.svg' ? 'image/svg+xml' :
          ext === '.gif' ? 'image/gif' : 'image/jpeg';
        const buffer = fs.readFileSync(filePath);
        return { buffer, contentType, status: 200 };
      }
    }

    // Caso 2: URL remota HTTP / HTTPS
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      try {
        const parsed = new URL(cleanUrl);
        const upstream = await fetch(cleanUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': `${parsed.protocol}//${parsed.hostname}/`,
          },
        });

        if (upstream.ok) {
          const contentType = upstream.headers.get('content-type') || 'image/jpeg';
          const arrayBuffer = await upstream.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          return { buffer, contentType, status: 200 };
        }
      } catch (err) {
        console.warn(`[MediaService] Error en proxy para ${cleanUrl}:`, (err as Error)?.message);
      }
    }

    // Fallback dinámico SVG elegante cuando la imagen no se puede obtener
    const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250" fill="#f8fafc">
      <rect width="100%" height="100%" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>
      <path d="M140 160l35-45 30 35 25-30 45 40H135z" fill="#94a3b8"/>
      <circle cx="160" cy="95" r="16" fill="#94a3b8"/>
      <text x="50%" y="200" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#64748b">BARILOCHE SEMANAL</text>
      <text x="50%" y="220" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#94a3b8">Imagen no disponible en origen</text>
    </svg>`;

    return {
      buffer: Buffer.from(svgFallback, 'utf-8'),
      contentType: 'image/svg+xml',
      status: 200,
    };
  }
}

export const mediaService = new MediaService();
