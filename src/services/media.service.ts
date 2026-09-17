import fs from 'fs';
import path from 'path';
import { getFirebaseStorage, checkStorageAvailability, STORAGE_BUCKET } from '../config/firebase.js';

export interface UploadResult {
  url: string;
  storage_path: string;
}

const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureUploadsDir(): void {
  if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
    fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
  }
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
}

export const mediaService = new MediaService();
