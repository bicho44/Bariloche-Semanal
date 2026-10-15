import { Request, Response } from 'express';
import { mediaService, resolvePublicUrl } from '../services/media.service.js';

export async function uploadMedia(req: Request, res: Response): Promise<void> {
  try {
    let fileBuffer: Buffer | null = null;
    let originalName = 'imagen.jpg';
    let mimeType = 'image/jpeg';

    // 1. Detección desde Multer: req.file o primer elemento de req.files
    if (req.file) {
      fileBuffer = req.file.buffer;
      originalName = req.file.originalname;
      mimeType = req.file.mimetype;
    } else if (req.files) {
      const filesArray = Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat();
      if (filesArray.length > 0 && filesArray[0].buffer) {
        fileBuffer = filesArray[0].buffer;
        originalName = filesArray[0].originalname;
        mimeType = filesArray[0].mimetype;
      }
    }

    // 2. Fallback si se envió como JSON (Base64 / Data URL)
    if (!fileBuffer && req.body) {
      const rawBase64 = req.body.base64 || req.body.dataUrl || req.body.archivo_base64;
      if (rawBase64 && typeof rawBase64 === 'string') {
        originalName = req.body.nombre || req.body.name || req.body.originalname || `upload_${Date.now()}.jpg`;

        if (rawBase64.startsWith('data:')) {
          const matches = rawBase64.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            mimeType = matches[1];
            fileBuffer = Buffer.from(matches[2], 'base64');
          } else {
            const parts = rawBase64.split(',');
            fileBuffer = Buffer.from(parts[1] || parts[0], 'base64');
          }
        } else {
          mimeType = req.body.mimeType || req.body.mimetype || 'image/jpeg';
          fileBuffer = Buffer.from(rawBase64, 'base64');
        }
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      res.status(400).json({
        error: 'No se detectó ningún contenido de imagen en la solicitud (se acepta multipart/form-data o JSON base64)',
      });
      return;
    }

    // Validación de tipo MIME
    if (!mimeType.startsWith('image/')) {
      res.status(400).json({
        error: `El formato de archivo '${mimeType}' no es una imagen válida (JPEG, PNG, WEBP, GIF, SVG)`,
      });
      return;
    }

    const folder = (req.body?.folder || req.query?.folder || 'noticias') as string;
    const subContext = (req.body?.subContext || req.query?.subContext) as string | undefined;

    // Opciones de optimización recibidas por query o body
    const customOptions: any = {};
    if (req.body?.calidad_compresion !== undefined || req.query?.calidad_compresion !== undefined) {
      customOptions.calidad_compresion = Number(req.body?.calidad_compresion || req.query?.calidad_compresion);
    } else if (req.body?.calidad !== undefined || req.query?.calidad !== undefined) {
      customOptions.calidad_compresion = Number(req.body?.calidad || req.query?.calidad);
    }

    if (req.body?.auto_convertir_webp !== undefined || req.query?.auto_convertir_webp !== undefined) {
      const val = req.body?.auto_convertir_webp ?? req.query?.auto_convertir_webp;
      customOptions.auto_convertir_webp = val === true || val === 'true' || val === 1 || val === '1';
    }

    if (req.body?.preservar_canal_alfa !== undefined || req.query?.preservar_canal_alfa !== undefined) {
      const val = req.body?.preservar_canal_alfa ?? req.query?.preservar_canal_alfa;
      customOptions.preservar_canal_alfa = val === true || val === 'true' || val === 1 || val === '1';
    } else if (req.body?.preservar_alfa !== undefined || req.query?.preservar_alfa !== undefined) {
      const val = req.body?.preservar_alfa ?? req.query?.preservar_alfa;
      customOptions.preservar_canal_alfa = val === true || val === 'true' || val === 1 || val === '1';
    }

    if (req.body?.color_fondo_alfa || req.query?.color_fondo_alfa) {
      customOptions.color_fondo_alfa = String(req.body?.color_fondo_alfa || req.query?.color_fondo_alfa);
    }

    if (req.body?.max_ancho || req.query?.max_ancho) {
      customOptions.max_ancho = Number(req.body?.max_ancho || req.query?.max_ancho);
    }

    if (req.body?.max_alto || req.query?.max_alto) {
      customOptions.max_alto = Number(req.body?.max_alto || req.query?.max_alto);
    }

    const result = await mediaService.uploadImage(fileBuffer, originalName, mimeType, folder, subContext, customOptions);

    // Adjuntar versión pública absoluta para clientes externos/newsletters
    const publicUrl = resolvePublicUrl(result.url, req.get('host'));

    res.status(201).json({
      ...result,
      public_url: publicUrl,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[MediaController] Error en uploadMedia:', error);
    res.status(500).json({
      error: 'Error interno al procesar y subir la imagen',
      detalle: error.message,
    });
  }
}

/**
 * Proxy de imágenes: Permite solicitar cualquier imagen remota o de noticias
 * a través de Bariloche Semanal, eliminando bloqueos de CORS, restricciones de Referrer
 * y protecciones anti-hotlinking de portales de noticias o anunciantes.
 *
 * GET /api/media/proxy?url=<encoded_url>
 */
export async function proxyMedia(req: Request, res: Response): Promise<void> {
  const targetUrl = (req.query.url as string)?.trim();

  if (!targetUrl) {
    res.status(400).json({ error: 'Parámetro query "url" es requerido' });
    return;
  }

  try {
    const { buffer, contentType, status } = await mediaService.proxyImage(targetUrl);

    // Encabezados para permitir que cualquier cliente (frontend, email web, visor) acceda a la imagen
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400'); // 7 días de caché
    res.setHeader('Content-Length', buffer.length);

    res.status(status).end(buffer);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[MediaController] Error en proxyMedia:', error.message);
    res.status(502).json({
      error: 'No se pudo obtener la imagen remota a través del proxy',
      detalle: error.message,
    });
  }
}

/**
 * Descarga y hospeda permanentemente una imagen remota en el servidor/Firebase.
 * POST /api/media/fetch-remote
 * Body: { url: "https://..." }
 */
export async function fetchRemoteMedia(req: Request, res: Response): Promise<void> {
  const {
    url,
    folder,
    subContext,
    calidad,
    calidad_compresion,
    auto_convertir_webp,
    preservar_alfa,
    preservar_canal_alfa,
    color_fondo_alfa,
  } = req.body || {};

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Campo "url" es requerido en el cuerpo JSON' });
    return;
  }

  const customOptions: any = {};
  if (calidad_compresion !== undefined || calidad !== undefined) {
    customOptions.calidad_compresion = Number(calidad_compresion ?? calidad);
  }
  if (auto_convertir_webp !== undefined) {
    customOptions.auto_convertir_webp = auto_convertir_webp === true || auto_convertir_webp === 'true';
  }
  if (preservar_canal_alfa !== undefined || preservar_alfa !== undefined) {
    const val = preservar_canal_alfa ?? preservar_alfa;
    customOptions.preservar_canal_alfa = val === true || val === 'true';
  }
  if (color_fondo_alfa) {
    customOptions.color_fondo_alfa = String(color_fondo_alfa);
  }

  try {
    const result = await mediaService.fetchAndSaveRemoteImage(
      url.trim(),
      folder || 'noticias',
      subContext,
      customOptions
    );
    const publicUrl = resolvePublicUrl(result.url, req.get('host'));

    res.status(201).json({
      ...result,
      public_url: publicUrl,
      mensaje: 'Imagen remota descargada, convertida y hospedada permanentemente con éxito',
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[MediaController] Error en fetchRemoteMedia:', error.message);
    res.status(400).json({
      error: 'Error al hospedar imagen remota',
      detalle: error.message,
    });
  }
}
