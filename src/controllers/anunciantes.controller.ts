import { Request, Response } from 'express';
import { anunciantesService } from '../services/anunciantes.service.js';

export async function listarAnunciantes(req: Request, res: Response): Promise<void> {
  try {
    const { activo, destino, ubicacion } = req.query;

    const anunciantes = await anunciantesService.listar({
      activo: activo !== undefined ? activo === 'true' : undefined,
      destino: destino as 'newsletter' | 'web' | 'ambos',
      ubicacion: ubicacion as 'pre-footer' | 'footer' | 'header',
    });

    res.json(anunciantes);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al listar anunciantes', detalle: error.message });
  }
}

export async function obtenerAnunciante(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const anunciante = await anunciantesService.obtenerPorId(id);
    if (!anunciante) {
      res.status(404).json({ error: `Anunciante con id '${id}' no encontrado` });
      return;
    }
    res.json(anunciante);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al obtener anunciante', detalle: error.message });
  }
}

export async function crearAnunciante(req: Request, res: Response): Promise<void> {
  try {
    const {
      id,
      nombre,
      activo,
      destino,
      ubicacion,
      banner_url,
      enlace_click,
      texto_alt,
      fecha_inicio,
      fecha_fin,
      prioridad,
    } = req.body;

    if (!nombre || !destino || !ubicacion || !banner_url || !enlace_click) {
      res.status(400).json({
        error: 'Campos obligatorios requeridos: nombre, destino, ubicacion, banner_url, enlace_click',
      });
      return;
    }

    const creado = await anunciantesService.crear({
      id,
      nombre,
      activo: activo !== undefined ? Boolean(activo) : true,
      destino,
      ubicacion,
      banner_url,
      enlace_click,
      texto_alt: texto_alt || nombre,
      fecha_inicio,
      fecha_fin,
      prioridad: prioridad !== undefined ? Number(prioridad) : 1,
    });

    res.status(201).json(creado);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al crear anunciante', detalle: error.message });
  }
}

export async function actualizarAnunciante(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const actualizado = await anunciantesService.actualizar(id, req.body);
    if (!actualizado) {
      res.status(404).json({ error: `Anunciante con id '${id}' no encontrado` });
      return;
    }
    res.json(actualizado);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al actualizar anunciante', detalle: error.message });
  }
}

export async function eliminarAnunciante(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const ok = await anunciantesService.eliminar(id);
    if (!ok) {
      res.status(404).json({ error: `Anunciante con id '${id}' no encontrado` });
      return;
    }
    res.json({ mensaje: `Anunciante '${id}' eliminado exitosamente` });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al eliminar anunciante', detalle: error.message });
  }
}

export async function obtenerBloquePreFooter(req: Request, res: Response): Promise<void> {
  try {
    const bloque = await anunciantesService.compilarBloquePreFooterNewsletter();
    res.json(bloque);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al compilar bloque de auspiciantes', detalle: error.message });
  }
}
