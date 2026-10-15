import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp, { type WebpOptions } from 'sharp';
import { getFirebaseStorage, checkStorageAvailability, getActiveStorageBucket } from '../config/firebase.js';
import { brandingService } from './branding.service.js';
import { ConfiguracionOptimizacionImagenes } from '../types/index.js';

export interface UploadResult {
  url: string;
  storage_path: string;
  folder?: string;
  bucket?: string;
  is_cloud?: boolean;
  formato_original?: string;
  formato_final?: string;
  peso_original_bytes?: number;
  peso_final_bytes?: number;
  ahorro_porcentaje?: number;
  dimensiones?: { width?: number; height?: number };
  canal_alfa?: boolean;
}

export interface RemoteFetchResult extends UploadResult {
  original_url: string;
}

export interface OptimizeOptions extends Partial<ConfiguracionOptimizacionImagenes> {
  nombre_personalizado?: string;
}

export interface ProcessedImageResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  originalFormat: string;
  finalFormat: string;
  originalSizeBytes: number;
  finalSizeBytes: number;
  ahorroPorcentaje: number;
  width?: number;
  height?: number;
  hasAlpha: boolean;
  convertedToWebp: boolean;
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
  let ext = rawExt;

  if (mimeType.includes('webp')) {
    ext = '.webp';
  } else if (!ext) {
    ext = mimeType.includes('png') ? '.png' :
      mimeType.includes('gif') ? '.gif' :
      mimeType.includes('svg') ? '.svg' : '.jpg';
  }

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
  /**
   * Procesa, optimiza y convierte la imagen a formato WebP utilizando Sharp.
   * Respeta o remueve el canal alfa (transparencia) y ajusta la compresión
   * basándose en la configuración de Branding e Identidad o parámetros personalizados.
   */
  async processAndOptimizeImage(
    inputBuffer: Buffer,
    originalMime: string,
    customOptions?: OptimizeOptions
  ): Promise<ProcessedImageResult> {
    const originalSizeBytes = inputBuffer.length;

    // SVG: Nunca convertir con sharp (es formato vectorial que se preserva idéntico)
    if (originalMime.includes('svg') || inputBuffer.toString('utf-8', 0, 100).includes('<svg')) {
      return {
        buffer: inputBuffer,
        mimeType: 'image/svg+xml',
        extension: '.svg',
        originalFormat: 'svg',
        finalFormat: 'svg',
        originalSizeBytes,
        finalSizeBytes: originalSizeBytes,
        ahorroPorcentaje: 0,
        hasAlpha: true,
        convertedToWebp: false,
      };
    }

    // Obtener configuración de branding guardada en Firestore
    let brandingConfig: ConfiguracionOptimizacionImagenes | undefined;
    try {
      const branding = await brandingService.obtener();
      brandingConfig = branding.optimizacion_imagenes;
    } catch (e) {
      console.warn('[MediaService] No se pudo leer configuración de branding, usando valores por defecto:', (e as Error)?.message);
    }

    const autoConvert = customOptions?.auto_convertir_webp ?? brandingConfig?.auto_convertir_webp ?? true;
    const quality = customOptions?.calidad_compresion ?? brandingConfig?.calidad_compresion ?? 80;
    const preserveAlpha = customOptions?.preservar_canal_alfa ?? brandingConfig?.preservar_canal_alfa ?? true;
    const alphaBgColor = customOptions?.color_fondo_alfa ?? brandingConfig?.color_fondo_alfa ?? '#ffffff';
    const maxWidth = customOptions?.max_ancho ?? brandingConfig?.max_ancho ?? 1920;
    const maxHeight = customOptions?.max_alto ?? brandingConfig?.max_alto ?? 1080;

    try {
      const imageInstance = sharp(inputBuffer);
      const metadata = await imageInstance.metadata();

      const originalFormat = metadata.format || originalMime.replace('image/', '') || 'jpeg';
      const hasAlpha = Boolean(metadata.hasAlpha);
      const width = metadata.width;
      const height = metadata.height;

      // Si no se desea convertir y ya es WebP
      if (!autoConvert && originalFormat === 'webp') {
        return {
          buffer: inputBuffer,
          mimeType: 'image/webp',
          extension: '.webp',
          originalFormat,
          finalFormat: 'webp',
          originalSizeBytes,
          finalSizeBytes: originalSizeBytes,
          ahorroPorcentaje: 0,
          width,
          height,
          hasAlpha,
          convertedToWebp: false,
        };
      }

      // Inicializar pipeline de Sharp
      let pipeline = sharp(inputBuffer, { animated: false });

      // 1. Redimensionar si supera límites máximos manteniendo proporciones (sin upscaling)
      if (width && height && (width > maxWidth || height > maxHeight)) {
        pipeline = pipeline.resize({
          width: maxWidth,
          height: maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // 2. Tratamiento de canal alfa (transparencia)
      if (hasAlpha && !preserveAlpha) {
        // Aplanar contra el color sólido seleccionado en Branding
        pipeline = pipeline.flatten({ background: alphaBgColor });
      }

      // 3. Conversión a WebP o compresión en formato original
      let finalFormat = originalFormat;
      let finalMime = originalMime;
      let finalExt = path.extname(originalMime) || '.jpg';

      if (autoConvert || originalFormat === 'webp') {
        finalFormat = 'webp';
        finalMime = 'image/webp';
        finalExt = '.webp';

        const webpConfig: WebpOptions = {
          quality: Math.min(Math.max(quality, 10), 100),
          effort: 4, // Algoritmo balanceado para velocidad y compresión óptima
        };

        if (hasAlpha && preserveAlpha) {
          webpConfig.alphaQuality = 90;
        }

        pipeline = pipeline.webp(webpConfig);
      } else {
        if (originalFormat === 'jpeg' || originalFormat === 'jpg') {
          pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        } else if (originalFormat === 'png') {
          pipeline = pipeline.png({ compressionLevel: 8 });
        }
      }

      const outputBuffer = await pipeline.toBuffer();
      const finalSizeBytes = outputBuffer.length;
      const ahorroPorcentaje = originalSizeBytes > 0
        ? Math.max(0, Math.round(((originalSizeBytes - finalSizeBytes) / originalSizeBytes) * 100))
        : 0;

      const finalMeta = await sharp(outputBuffer).metadata();

      console.info(
        `[MediaService] Imagen optimizada: ${originalFormat} (${(originalSizeBytes / 1024).toFixed(1)} KB) -> ` +
        `${finalFormat} (${(finalSizeBytes / 1024).toFixed(1)} KB). Ahorro: ${ahorroPorcentaje}%. ` +
        `Dimensiones: ${finalMeta.width}x${finalMeta.height} px. Alpha: ${finalMeta.hasAlpha ? 'Preservado' : 'Sin alpha'}.`
      );

      return {
        buffer: outputBuffer,
        mimeType: finalMime,
        extension: finalExt,
        originalFormat,
        finalFormat,
        originalSizeBytes,
        finalSizeBytes,
        ahorroPorcentaje,
        width: finalMeta.width || width,
        height: finalMeta.height || height,
        hasAlpha: Boolean(finalMeta.hasAlpha),
        convertedToWebp: finalFormat === 'webp',
      };
    } catch (sharpError) {
      console.warn('[MediaService] Advertencia en optimización Sharp, usando imagen original:', (sharpError as Error)?.message);
      return {
        buffer: inputBuffer,
        mimeType: originalMime,
        extension: path.extname(originalMime) || '.jpg',
        originalFormat: 'unknown',
        finalFormat: 'unknown',
        originalSizeBytes,
        finalSizeBytes: originalSizeBytes,
        ahorroPorcentaje: 0,
        hasAlpha: false,
        convertedToWebp: false,
      };
    }
  }

  async uploadImage(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = 'noticias',
    subContext?: string,
    customOptions?: OptimizeOptions
  ): Promise<UploadResult> {
    // 1. Optimizar y convertir automáticamente a WebP
    const processed = await this.processAndOptimizeImage(fileBuffer, mimeType, customOptions);

    let effectiveName = originalName;
    if (processed.convertedToWebp && !effectiveName.toLowerCase().endsWith('.webp')) {
      const rawExt = path.extname(effectiveName);
      effectiveName = rawExt ? effectiveName.slice(0, -rawExt.length) + '.webp' : `${effectiveName}.webp`;
    }

    const { storagePath, directory, cleanFolder } = buildOrganizedStoragePath(
      effectiveName,
      processed.mimeType,
      folder,
      subContext
    );

    // Asegurar directorio local correspondiente
    ensureUploadsDir(directory);

    // 2. Verificar si Firebase Storage está habilitado y el bucket existe
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
          await file.save(processed.buffer, {
            metadata: {
              contentType: processed.mimeType,
              cacheControl: 'public, max-age=31536000',
              metadata: {
                firebaseStorageDownloadTokens: downloadToken,
                uploadedBy: 'bariloche-semanal',
                folder: cleanFolder,
                formato_original: processed.originalFormat,
                formato_final: processed.finalFormat,
                ahorro_porcentaje: `${processed.ahorroPorcentaje}%`,
              },
            },
          });

          // Guardar copia local simultánea para redundancia y respuesta ultrarrápida
          const localFilePath = path.join(PUBLIC_UPLOADS_DIR, storagePath);
          fs.writeFileSync(localFilePath, processed.buffer);

          // Intentar marcar público en el bucket
          try {
            await file.makePublic();
          } catch {
            // Ignorado si el bucket usa permisos uniformes de nivel de bucket (UBLA)
          }

          // URL canónica de Firebase Storage accesible en web y OpenGraph con el token permanente
          const canonicalFirebaseUrl = `https://firebasestorage.googleapis.com/v0/b/${activeBucket}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
          console.info(`[MediaService] Imagen WebP en Firebase Storage (${storagePath}): ${canonicalFirebaseUrl}`);

          return {
            url: canonicalFirebaseUrl,
            storage_path: storagePath,
            folder: cleanFolder,
            bucket: activeBucket,
            is_cloud: true,
            formato_original: processed.originalFormat,
            formato_final: processed.finalFormat,
            peso_original_bytes: processed.originalSizeBytes,
            peso_final_bytes: processed.finalSizeBytes,
            ahorro_porcentaje: processed.ahorroPorcentaje,
            dimensiones: { width: processed.width, height: processed.height },
            canal_alfa: processed.hasAlpha,
          };
        }
      } catch (err: unknown) {
        const errMsg = (err as Error)?.message || 'Cloud Storage no disponible';
        console.warn(`[MediaService] Error en Firebase Storage (${errMsg}). Usando almacenamiento local organizado.`);
      }
    }

    // 3. Almacenamiento local seguro en el servidor (/uploads/carpeta/...)
    const localFilePath = path.join(PUBLIC_UPLOADS_DIR, storagePath);
    fs.writeFileSync(localFilePath, processed.buffer);
    const localUrl = `/uploads/${storagePath}`;

    console.info(`[MediaService] Imagen WebP almacenada localmente: ${localUrl}`);

    return {
      url: localUrl,
      storage_path: storagePath,
      folder: cleanFolder,
      is_cloud: false,
      formato_original: processed.originalFormat,
      formato_final: processed.finalFormat,
      peso_original_bytes: processed.originalSizeBytes,
      peso_final_bytes: processed.finalSizeBytes,
      ahorro_porcentaje: processed.ahorroPorcentaje,
      dimensiones: { width: processed.width, height: processed.height },
      canal_alfa: processed.hasAlpha,
    };
  }

  /**
   * Descarga una imagen desde cualquier URL remota (de portales de noticias o anunciantes),
   * la optimiza y convierte a WebP, y la guarda de forma organizada y permanente en Firebase Storage (o local como fallback).
   */
  async fetchAndSaveRemoteImage(
    remoteUrl: string,
    folder: string = 'noticias',
    subContext?: string,
    customOptions?: OptimizeOptions
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

    const uploadResult = await this.uploadImage(buffer, originalName, contentType, folder, subContext, customOptions);

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
