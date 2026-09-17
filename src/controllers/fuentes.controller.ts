import { Request, Response } from 'express';
import { fuentesService } from '../services/fuentes.service.js';

export async function listarFuentes(req: Request, res: Response): Promise<void> {
  try {
    const soloActivas = req.query.activo === 'true';
    const fuentes = await fuentesService.listar(soloActivas);
    res.json(fuentes);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al listar fuentes', detalle: error.message });
  }
}

export async function obtenerFuente(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const fuente = await fuentesService.obtenerPorId(id);
    if (!fuente) {
      res.status(404).json({ error: `Fuente con id '${id}' no encontrada` });
      return;
    }
    res.json(fuente);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al obtener fuente', detalle: error.message });
  }
}

export async function crearFuente(req: Request, res: Response): Promise<void> {
  try {
    const { id, nombre, url_base, url_noticias, tipo, prioridad, activo, logo_url } = req.body;

    if (!id || !nombre || !url_base || !tipo) {
      res.status(400).json({ error: 'Campos obligatorios faltantes: id, nombre, url_base, tipo' });
      return;
    }

    const creada = await fuentesService.crear({
      id,
      nombre,
      url_base,
      url_noticias,
      tipo,
      prioridad: prioridad ? (Number(prioridad) as 1 | 2) : 1,
      activo: activo !== undefined ? Boolean(activo) : true,
      logo_url,
    });

    res.status(201).json(creada);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al crear fuente', detalle: error.message });
  }
}

export async function actualizarFuente(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const actualizada = await fuentesService.actualizar(id, req.body);
    if (!actualizada) {
      res.status(404).json({ error: `Fuente con id '${id}' no encontrada` });
      return;
    }
    res.json(actualizada);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al actualizar fuente', detalle: error.message });
  }
}

export async function eliminarFuente(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const ok = await fuentesService.eliminar(id);
    if (!ok) {
      res.status(404).json({ error: `Fuente con id '${id}' no encontrada` });
      return;
    }
    res.json({ mensaje: `Fuente '${id}' eliminada exitosamente` });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al eliminar fuente', detalle: error.message });
  }
}
