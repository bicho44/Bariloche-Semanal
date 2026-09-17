import { Request, Response } from 'express';
import { dossiersService } from '../services/dossiers.service.js';

export async function listarDossiers(req: Request, res: Response): Promise<void> {
  try {
    const soloActivos = req.query.activo === 'true';
    const dossiers = await dossiersService.listar(soloActivos);
    res.json(dossiers);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al listar dossiers', detalle: error.message });
  }
}

export async function obtenerDossier(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const dossier = await dossiersService.obtenerPorSlug(slug);
    if (!dossier) {
      res.status(404).json({ error: `Dossier con slug '${slug}' no encontrado` });
      return;
    }
    res.json(dossier);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al obtener dossier', detalle: error.message });
  }
}

export async function crearDossier(req: Request, res: Response): Promise<void> {
  try {
    const { id, titulo, area_id, estado, resumen_contexto, actores_clave, timeline } = req.body;

    if (!titulo || !area_id || !resumen_contexto) {
      res.status(400).json({
        error: 'Campos obligatorios faltantes: titulo, area_id, resumen_contexto',
      });
      return;
    }

    const creado = await dossiersService.crear({
      id,
      titulo,
      area_id,
      estado: estado || 'activo',
      resumen_contexto,
      actores_clave: actores_clave || [],
      timeline: timeline || [],
    });

    res.status(201).json(creado);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al crear dossier', detalle: error.message });
  }
}

export async function actualizarDossier(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const actualizado = await dossiersService.actualizar(slug, req.body);
    if (!actualizado) {
      res.status(404).json({ error: `Dossier con slug '${slug}' no encontrado` });
      return;
    }
    res.json(actualizado);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al actualizar dossier', detalle: error.message });
  }
}

export async function agregarHitoDossier(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const { fecha, hito, noticia_id } = req.body;

    if (!fecha || !hito) {
      res.status(400).json({ error: 'Campos requeridos: fecha, hito' });
      return;
    }

    const actualizado = await dossiersService.agregarHitoTimeline(slug, { fecha, hito, noticia_id });
    if (!actualizado) {
      res.status(404).json({ error: `Dossier con slug '${slug}' no encontrado` });
      return;
    }
    res.json(actualizado);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al agregar hito al timeline', detalle: error.message });
  }
}

export async function eliminarDossier(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const ok = await dossiersService.eliminar(slug);
    if (!ok) {
      res.status(404).json({ error: `Dossier con slug '${slug}' no encontrado` });
      return;
    }
    res.json({ mensaje: `Dossier '${slug}' eliminado exitosamente` });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al eliminar dossier', detalle: error.message });
  }
}
