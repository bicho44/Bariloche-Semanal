import { Request, Response } from 'express';
import { noticiasService } from '../services/noticias.service.js';
import { AreaId } from '../types/index.js';

export async function listarNoticias(req: Request, res: Response): Promise<void> {
  try {
    const { area_id, dossier_id, fuente_id, fecha, con_foto, search, page, limit } = req.query;

    const resultado = await noticiasService.listar({
      area_id: area_id as AreaId,
      dossier_id: dossier_id as string,
      fuente_id: fuente_id as string,
      fecha: fecha as string,
      con_foto: con_foto !== undefined ? con_foto === 'true' : undefined,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    res.json(resultado);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al listar noticias', detalle: error.message });
  }
}

export async function obtenerNoticia(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const noticia = await noticiasService.obtenerPorId(id);
    if (!noticia) {
      res.status(404).json({ error: `Noticia con id '${id}' no encontrada` });
      return;
    }
    res.json(noticia);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al obtener noticia', detalle: error.message });
  }
}

export async function crearNoticia(req: Request, res: Response): Promise<void> {
  try {
    const {
      id,
      fecha_publicacion,
      fuente,
      area_id,
      dossier_id,
      titular,
      hecho_central,
      novedad_respecto_a_dias_previos,
      datos_duros,
      citas,
      media,
      entidades,
      cobertura_cruzada,
    } = req.body;

    if (!fecha_publicacion || !fuente || !area_id || !titular || !hecho_central) {
      res.status(400).json({
        error: 'Campos requeridos faltantes: fecha_publicacion, fuente, area_id, titular, hecho_central',
      });
      return;
    }

    const creada = await noticiasService.crear({
      id,
      fecha_publicacion,
      fuente,
      area_id,
      dossier_id: dossier_id || null,
      titular,
      hecho_central,
      novedad_respecto_a_dias_previos,
      datos_duros: datos_duros || {},
      citas: citas || [],
      media: media || { imagen_url: '', credito: '' },
      entidades: entidades || { actores: [], lugares: [] },
      cobertura_cruzada: cobertura_cruzada || 1,
    });

    res.status(201).json(creada);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al crear noticia', detalle: error.message });
  }
}

export async function actualizarNoticia(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const actualizada = await noticiasService.actualizar(id, req.body);
    if (!actualizada) {
      res.status(404).json({ error: `Noticia con id '${id}' no encontrada` });
      return;
    }
    res.json(actualizada);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al actualizar noticia', detalle: error.message });
  }
}

export async function eliminarNoticia(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const ok = await noticiasService.eliminar(id);
    if (!ok) {
      res.status(404).json({ error: `Noticia con id '${id}' no encontrada` });
      return;
    }
    res.json({ mensaje: `Noticia '${id}' eliminada exitosamente` });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al eliminar noticia', detalle: error.message });
  }
}
