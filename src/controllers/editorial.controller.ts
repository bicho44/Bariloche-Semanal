import { Request, Response } from 'express';
import { editorialService } from '../services/editorial.service.js';

export async function generarDeepDive(req: Request, res: Response): Promise<void> {
  try {
    const { dossier_id } = req.body;

    if (!dossier_id) {
      res.status(400).json({ error: 'El campo dossier_id es obligatorio en el cuerpo de la solicitud' });
      return;
    }

    const resultado = await editorialService.generarDeepDive(dossier_id);
    res.json(resultado);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[EditorialController] Error al generar deep dive:', error);
    res.status(500).json({ error: 'Error al generar análisis editorial con Gemini', detalle: error.message });
  }
}
