import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getFirebaseStorage, checkStorageAvailability, getActiveStorageBucket } from '../config/firebase.js';

export interface UploadResult {
  url: string;
  storage_path: string;
  folder?: string;
  bucket?: string;
  is_cloud?: boolean;
}

export interface RemoteFetchResult extends UploadResult {
  original_url: string;
}

const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureUploadsDir(subDir?: string): string {
  const targetDir = subDir ? path.join(PUBLIC_UPLOADS_DIR, subDir) : PUBLIC_UPLOADS_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

/**
 * Genera una ruta jerárquica y ordenada para Firebase Storage y almacenamiento local.
 * Estructuras soportadas:
 * - noticias: noticias/YYYY/MM/slug-de-foto_timestamp.ext
 * - agenda: agenda/YYYY/MM/slug-evento_timestamp.ext
 * - anunciantes: anunciantes/YYYY/slug-marca_timestamp.ext
 * - ediciones: ediciones/YYYY/edicion-semana_timestamp.ext
 * - dossiers: dossiers/{slug-dossier}/slug-foto_timestamp.ext
 * - branding: branding/slug-asset_timestamp.ext
 * - general: media/YYYY/MM/slug-archivo_timestamp.ext
 */
export function buildOrganizedStoragePath(
  originalName: string,
  mimeType: string,
  folder: string = 'noticias',
  subContext?: string
): { storagePath: string; fileName: string; directory: string; cleanFolder: string } {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const timestamp = Date.now();

  const rawExt = path.extname(originalName).toLowerCase();
  const ext = rawExt || (
    mimeType.includes('png') ? '.png' :
    mimeType.includes('webp') ? '.webp' :
    mimeType.includes('gif') ? '.gif' :
    mimeType.includes('svg') ? '.svg' : '.jpg'
  );

  const baseName = path.basename(originalName, rawExt)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos/tildes
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 45) || 'imagen';

  const fileName = `${baseName}_${timestamp}${ext}`;

  let cleanFolder = folder.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'noticias';
  let directory = '';

  if (cleanFolder === 'noticias' || cleanFolder === 'agenda') {
    directory = `${cleanFolder}/${year}/${month}`;
  } else if (cleanFolder === 'anunciantes' || cleanFolder === 'ediciones') {
    directory = `${cleanFolder}/${year}`;
  } else if (cleanFolder === 'dossiers') {
    const cleanSub = subContext
      ? subContext.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40)
      : `${year}`;
    directory = `dossiers/${cleanSub}`;
  } else if (cleanFolder === 'branding') {
    directory = 'branding';
  } else {
    directory = `${cleanFolder}/${year}/${month}`;
  }

  const storagePath = `${directory}/${fileName}`;
  return { storagePath, fileName, directory, cleanFolder };
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
  async uploadImage(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = 'noticias',
    subContext?: string
  ): Promise<UploadResult> {
    const { storagePath, fileName, directory, cleanFolder } = buildOrganizedStoragePath(
      originalName,
      mimeType,
      folder,
      subContext
    );

    // Asegurar directorio local correspondiente
    ensureUploadsDir(directory);

    // 1. Verificar si Firebase Storage está habilitado y el bucket existe
    const storageActive = await checkStorageAvailability();
    const activeBucket = getActiveStorageBucket();

    if (storageActive) {
      try {
        const storage = getFirebaseStorage();
        if (storage) {
          const bucket = storage.bucket(activeBucket);
          const file = bucket.file(storagePath);
          const downloadToken = crypto.randomUUID();

          // Subir a Firebase Storage con metadatos de token permanente y caché optimizada
          await file.save(fileBuffer, {
            metadata: {
              contentType: mimeType,
              cacheControl: 'public, max-age=31536000',
              metadata: {
                firebaseStorageDownloadTokens: downloadToken,
                uploadedBy: 'bariloche-semanal',
                folder: cleanFolder,
              },
            },
          });

          // Guardar copia local simultánea para redundancia y respuesta ultrarrápida
          const localFilePath = path.join(PUBLIC_UPLOADS_DIR, storagePath);
          fs.writeFileSync(localFilePath, fileBuffer);

          // Intentar marcar público en el bucket
          try {
            await file.makePublic();
          } catch {
            // Ignorado si el bucket usa permisos uniformes de nivel de bucket (UBLA)
          }

          // URL canónica de Firebase Storage accesible en web y OpenGraph con el token permanente
          const canonicalFirebaseUrl = `https://firebasestorage.googleapis.com/v0/b/${activeBucket}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
          console.info(`[MediaService] Imagen organizada en Firebase Storage (${storagePath}): ${canonicalFirebaseUrl}`);

          return {
            url: canonicalFirebaseUrl,
            storage_path: storagePath,
            folder: cleanFolder,
            bucket: activeBucket,
            is_cloud: true,
          };
        }
      } catch (err: unknown) {
        const errMsg = (err as Error)?.message || 'Cloud Storage no disponible';
        console.warn(`[MediaService] Error en Firebase Storage (${errMsg}). Usando almacenamiento local organizado.`);
      }
    }

    // 2. Almacenamiento local seguro en el servidor (/uploads/carpeta/...)
    const localFilePath = path.join(PUBLIC_UPLOADS_DIR, storagePath);
    fs.writeFileSync(localFilePath, fileBuffer);
    const localUrl = `/uploads/${storagePath}`;

    console.info(`[MediaService] Imagen almacenada localmente: ${localUrl}`);

    return {
      url: localUrl,
      storage_path: storagePath,
      folder: cleanFolder,
      is_cloud: false,
    };
  }

  /**
   * Descarga una imagen desde cualquier URL remota (de portales de noticias o anunciantes),
   * y la guarda de forma organizada y permanente en Firebase Storage (o local como fallback).
   */
  async fetchAndSaveRemoteImage(
    remoteUrl: string,
    folder: string = 'noticias',
    subContext?: string
  ): Promise<RemoteFetchResult> {
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

    const uploadResult = await this.uploadImage(buffer, originalName, contentType, folder, subContext);

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
