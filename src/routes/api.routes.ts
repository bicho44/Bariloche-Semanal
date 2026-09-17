import { Router } from 'express';
import multer from 'multer';

import {
  listarFuentes,
  obtenerFuente,
  crearFuente,
  actualizarFuente,
  eliminarFuente,
} from '../controllers/fuentes.controller.js';

import {
  listarNoticias,
  obtenerNoticia,
  crearNoticia,
  actualizarNoticia,
  eliminarNoticia,
} from '../controllers/noticias.controller.js';

import {
  listarAgenda,
  obtenerEventoAgenda,
  crearEventoAgenda,
  actualizarEventoAgenda,
  eliminarEventoAgenda,
} from '../controllers/agenda.controller.js';

import {
  listarDossiers,
  obtenerDossier,
  crearDossier,
  actualizarDossier,
  agregarHitoDossier,
  eliminarDossier,
} from '../controllers/dossiers.controller.js';

import {
  listarEdiciones,
  obtenerEdicion,
  crearEdicion,
  actualizarEdicion,
  eliminarEdicion,
} from '../controllers/ediciones.controller.js';

import { generarDeepDive } from '../controllers/editorial.controller.js';
import { obtenerConfiguracion, actualizarConfiguracion } from '../controllers/branding.controller.js';

import {
  listarAnunciantes,
  obtenerAnunciante,
  crearAnunciante,
  actualizarAnunciante,
  eliminarAnunciante,
  obtenerBloquePreFooter,
} from '../controllers/anunciantes.controller.js';

import { uploadMedia } from '../controllers/media.controller.js';
import { getDatabaseStatus } from '../config/firebase.js';

const router = Router();

// Configuración de Multer para el selector dual de imágenes en memoria (hasta 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 5,
  },
});

// 1. Fuentes
router.get('/fuentes', listarFuentes);
router.post('/fuentes', crearFuente);
router.get('/fuentes/:id', obtenerFuente);
router.patch('/fuentes/:id', actualizarFuente);
router.delete('/fuentes/:id', eliminarFuente);

// 2. Noticias
router.get('/noticias', listarNoticias);
router.post('/noticias', crearNoticia);
router.get('/noticias/:id', obtenerNoticia);
router.patch('/noticias/:id', actualizarNoticia);
router.delete('/noticias/:id', eliminarNoticia);

// 3. Agenda
router.get('/agenda', listarAgenda);
router.post('/agenda', crearEventoAgenda);
router.get('/agenda/:id', obtenerEventoAgenda);
router.patch('/agenda/:id', actualizarEventoAgenda);
router.delete('/agenda/:id', eliminarEventoAgenda);

// 4. Dossiers
router.get('/dossiers', listarDossiers);
router.post('/dossiers', crearDossier);
router.get('/dossiers/:slug', obtenerDossier);
router.patch('/dossiers/:slug', actualizarDossier);
router.post('/dossiers/:slug/hitos', agregarHitoDossier);
router.delete('/dossiers/:slug', eliminarDossier);

// 5. Ediciones
router.get('/ediciones', listarEdiciones);
router.post('/ediciones', crearEdicion);
router.get('/ediciones/:id', obtenerEdicion);
router.patch('/ediciones/:id', actualizarEdicion);
router.delete('/ediciones/:id', eliminarEdicion);

// 6. Editorial AI (Gemini 3)
router.post('/editorial/deep-dive', generarDeepDive);

// 7. Branding & Configuración
router.get('/configuracion', obtenerConfiguracion);
router.patch('/configuracion', actualizarConfiguracion);

// 8. Anunciantes
router.get('/anunciantes', listarAnunciantes);
router.post('/anunciantes', crearAnunciante);
router.get('/anunciantes/compilado/pre-footer', obtenerBloquePreFooter);
router.get('/anunciantes/:id', obtenerAnunciante);
router.patch('/anunciantes/:id', actualizarAnunciante);
router.delete('/anunciantes/:id', eliminarAnunciante);

// 9. Media & Upload (Firebase Storage / Local)
// Soporta multipart/form-data con cualquier campo ('archivo_imagen', 'file', 'image') y JSON base64
router.post('/media/upload', (req, res, next) => {
  // Si la petición es application/json (fallback base64), procesar directo
  if (req.is('application/json')) {
    return uploadMedia(req, res);
  }

  // Si es multipart/form-data, procesar con Multer capturando cualquier error para responder en JSON
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('[API Multer Error]:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'El archivo excede el tamaño máximo permitido de 25MB' });
        }
        return res.status(400).json({ error: `Error al procesar archivo: ${err.message}`, codigo: err.code });
      }
      return res.status(400).json({ error: err.message || 'Error al procesar el archivo multipart' });
    }
    uploadMedia(req, res);
  });
});

// 10. Estado de la base de datos (Firestore / Persistencia Local)
router.get('/database/status', (req, res) => {
  res.json(getDatabaseStatus());
});

// Manejador de errores para rutas API (asegura respuestas JSON limpias)
router.use((err: any, req: any, res: any, next: any) => {
  console.warn('[Router API Error]:', err?.message || 'Error no especificado');
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Error interno en la API',
    codigo: err.code || 'INTERNAL_ERROR',
  });
});

export default router;
