import { Request, Response } from 'express';
import { noticiasService } from '../services/noticias.service.js';
import { AreaId } from '../types/index.js';

export async function listarNoticias(req: Request, res: Response): Promise<void> {
  try {
    const {
      area_id,
      seguimiento_id,
      dossier_id,
      fuente_id,
      fecha,
      con_foto,
      curada_manualmente,
      estado_redaccion,
      search,
      page,
      limit,
    } = req.query;

    const resultado = await noticiasService.listar({
      area_id: area_id as AreaId,
      seguimiento_id: (seguimiento_id as string) || (dossier_id as string),
      dossier_id: (dossier_id as string) || (seguimiento_id as string),
      fuente_id: fuente_id as string,
      fecha: fecha as string,
      con_foto: con_foto !== undefined ? con_foto === 'true' : undefined,
      curada_manualmente: curada_manualmente !== undefined ? curada_manualmente === 'true' : undefined,
      estado_redaccion: estado_redaccion as 'redactada' | 'pendiente',
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
      seguimiento_id,
      dossier_id,
      titular,
      hecho_central,
      novedad_respecto_a_dias_previos,
      cuerpo_html,
      datos_duros,
      citas,
      media,
      entidades,
      cobertura_cruzada,
      fuentes_consultadas,
      curada_manualmente,
    } = req.body;

    if (!titular || typeof titular !== 'string' || titular.trim().length < 10) {
      res.status(400).json({
        error: 'Validación estricta (anti-huérfanas): el titular es obligatorio y debe tener al menos 10 caracteres',
      });
      return;
    }

    if (!fuente || !area_id || !hecho_central) {
      res.status(400).json({
        error: 'Campos requeridos faltantes: fuente, area_id, hecho_central',
      });
      return;
    }

    const sid = req.body.dossier_id || req.body.seguimiento_id || null;

    const creada = await noticiasService.crear({
      id,
      fecha_publicacion,
      beat_id: req.body.beat_id,
      fuente,
      area_id,
      seguimiento_id: sid,
      dossier_id: sid,
      titular: titular.trim(),
      hecho_central,
      por_que_importa_el_domingo: req.body.por_que_importa_el_domingo?.trim() || undefined,
      novedad_respecto_a_dias_previos,
      cuerpo_html: cuerpo_html || '',
      datos_duros: datos_duros || {},
      citas: citas || [],
      media: media || { imagen_url: '', credito: '' },
      entidades: entidades || { actores: [], lugares: [] },
      cobertura_cruzada: cobertura_cruzada || (Array.isArray(fuentes_consultadas) && fuentes_consultadas.length > 0 ? fuentes_consultadas.length : 1),
      fuentes_consultadas: Array.isArray(fuentes_consultadas) ? fuentes_consultadas : [],
      curada_manualmente: curada_manualmente !== undefined ? Boolean(curada_manualmente) : true,
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

    if (
      req.body.titular !== undefined &&
      (typeof req.body.titular !== 'string' || req.body.titular.trim().length < 10)
    ) {
      res.status(400).json({
        error: 'Validación estricta (anti-huérfanas): el titular no puede tener menos de 10 caracteres',
      });
      return;
    }

    const sid = req.body.dossier_id !== undefined
      ? (req.body.dossier_id || null)
      : (req.body.seguimiento_id !== undefined ? (req.body.seguimiento_id || null) : undefined);

    const updatePayload: Record<string, unknown> = {
      ...req.body,
      ...(sid !== undefined ? { dossier_id: sid, seguimiento_id: sid } : {}),
      ...(req.body.por_que_importa_el_domingo !== undefined
        ? { por_que_importa_el_domingo: req.body.por_que_importa_el_domingo?.trim() || undefined }
        : {}),
      curada_manualmente: req.body.curada_manualmente !== undefined ? Boolean(req.body.curada_manualmente) : true,
      updated_at: new Date().toISOString(),
    };

    const actualizada = await noticiasService.actualizar(id, updatePayload);
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
