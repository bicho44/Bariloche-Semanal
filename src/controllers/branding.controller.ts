import { Request, Response } from 'express';
import { brandingService } from '../services/branding.service.js';

export async function obtenerConfiguracion(req: Request, res: Response): Promise<void> {
  try {
    const config = await brandingService.obtener();
    res.json(config);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al obtener configuración de branding', detalle: error.message });
  }
}

export async function actualizarConfiguracion(req: Request, res: Response): Promise<void> {
  try {
    const actualizada = await brandingService.actualizar(req.body);
    res.json(actualizada);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al actualizar configuración de branding', detalle: error.message });
  }
}
