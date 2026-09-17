import { Request, Response } from 'express';
import { mediaService } from '../services/media.service.js';

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

    const result = await mediaService.uploadImage(fileBuffer, originalName, mimeType);
    res.status(201).json(result);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[MediaController] Error en uploadMedia:', error);
    res.status(500).json({
      error: 'Error interno al procesar y subir la imagen',
      detalle: error.message,
    });
  }
}

