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
    const {
      id,
      titulo,
      area_id,
      estado,
      criterio_inclusion,
      prohibido_incluir,
      datos_duros_verificados,
      resumen_contexto,
      actores_clave,
      timeline,
      cronica_html,
      fecha_ultima_cronica,
      media,
      prompt_nanobanana,
      curada_manualmente,
    } = req.body;

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
      criterio_inclusion,
      prohibido_incluir,
      datos_duros_verificados: datos_duros_verificados || {},
      resumen_contexto,
      actores_clave: actores_clave || [],
      timeline: timeline || [],
      cronica_html: cronica_html || '',
      fecha_ultima_cronica: fecha_ultima_cronica || (cronica_html ? new Date().toISOString().split('T')[0] : undefined),
      media: media || (prompt_nanobanana ? { imagen_url: '', prompt_nanobanana } : undefined),
      prompt_nanobanana: prompt_nanobanana || media?.prompt_nanobanana || undefined,
      curada_manualmente: curada_manualmente !== undefined ? Boolean(curada_manualmente) : true,
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
    const bodyConCurada = {
      ...req.body,
      curada_manualmente: req.body.curada_manualmente !== undefined ? Boolean(req.body.curada_manualmente) : true,
    };
    const actualizado = await dossiersService.actualizar(slug, bodyConCurada);
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
    const { fecha, hito, noticia_id, fuente_url } = req.body;

    if (!fecha || !hito) {
      res.status(400).json({ error: 'Campos requeridos: fecha, hito' });
      return;
    }

    const actualizado = await dossiersService.agregarHitoTimeline(slug, {
      fecha,
      hito,
      noticia_id,
      fuente_url,
    });
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

/**
 * POST /api/editorial/deep-dive
 * Genera crónica de fondo / deep-dive blindado contra alucinaciones utilizando el SDK @google/genai
 */
export async function generarDeepDiveEditorial(req: Request, res: Response): Promise<void> {
  try {
    const {
      slug,
      dossier_id,
      dossier,
      criterio_inclusion,
      prohibido_incluir,
      datos_duros_verificados,
      instrucciones_adicionales,
      guardar,
    } = req.body || {};

    const targetSlug = slug || dossier_id || dossier?.id;
    if (!targetSlug && !dossier?.titulo) {
      res.status(400).json({
        error: 'Debe especificar el slug del dossier o enviar el objeto dossier con título y contexto para redactar la crónica.',
      });
      return;
    }

    const resultado = await dossiersService.redactarCronicaDeepDive({
      slug: targetSlug,
      dossier,
      criterio_inclusion,
      prohibido_incluir,
      datos_duros_verificados,
      instrucciones_adicionales,
      guardar: Boolean(guardar),
    });

    res.json(resultado);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Editorial Deep-Dive Error]:', error);
    res.status(500).json({
      error: 'Error al redactar deep-dive editorial con Gemini',
      detalle: error.message,
    });
  }
}
