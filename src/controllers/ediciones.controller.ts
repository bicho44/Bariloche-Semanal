import { Request, Response } from 'express';
import { edicionesService } from '../services/ediciones.service.js';

export async function listarEdiciones(req: Request, res: Response): Promise<void> {
  try {
    const ediciones = await edicionesService.listar();
    res.json(ediciones);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al listar ediciones', detalle: error.message });
  }
}

export async function obtenerEdicion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const edicion = await edicionesService.obtenerPorId(id);
    if (!edicion) {
      res.status(404).json({ error: `Edición con id '${id}' no encontrada` });
      return;
    }
    res.json(edicion);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al obtener edición', detalle: error.message });
  }
}

export async function crearEdicion(req: Request, res: Response): Promise<void> {
  try {
    const {
      id,
      semana,
      anio,
      fecha_publicacion,
      asunto,
      hero_resumen,
      dossiers_cubiertos,
      html_content,
      estado,
      despacho,
    } = req.body;

    if (!semana || !anio || !fecha_publicacion || !asunto || !hero_resumen) {
      res.status(400).json({
        error: 'Campos requeridos: semana, anio, fecha_publicacion, asunto, hero_resumen',
      });
      return;
    }

    const edicionId = id || `${anio}-w${String(semana).padStart(2, '0')}`;

    const creada = await edicionesService.crear({
      id: edicionId,
      semana: Number(semana),
      anio: Number(anio),
      fecha_publicacion,
      asunto,
      hero_resumen,
      dossiers_cubiertos: dossiers_cubiertos || [],
      html_content: html_content || '',
      estado: estado || 'borrador',
      despacho,
    });

    res.status(201).json(creada);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al crear edición', detalle: error.message });
  }
}

export async function actualizarEdicion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const actualizada = await edicionesService.actualizar(id, req.body);
    if (!actualizada) {
      res.status(404).json({ error: `Edición con id '${id}' no encontrada` });
      return;
    }
    res.json(actualizada);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al actualizar edición', detalle: error.message });
  }
}

export async function eliminarEdicion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const ok = await edicionesService.eliminar(id);
    if (!ok) {
      res.status(404).json({ error: `Edición con id '${id}' no encontrada` });
      return;
    }
    res.json({ mensaje: `Edición '${id}' eliminada exitosamente` });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al eliminar edición', detalle: error.message });
  }
}
