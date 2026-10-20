import { Request, Response } from 'express';
import { agendaService } from '../services/agenda.service.js';

export async function listarAgenda(req: Request, res: Response): Promise<void> {
  try {
    const todos = req.query.todos === 'true';
    const soloVigentesParam = req.query.solo_vigentes;
    const categoria = typeof req.query.categoria === 'string' ? req.query.categoria : undefined;

    // Si el cliente pide explícitamente todos=true (como en /admin/agenda), no filtra vigentes
    // Si no pide todos=true, por defecto filtra por vigencia (fecha_fin >= hoy)
    const soloVigentes = soloVigentesParam !== undefined 
      ? soloVigentesParam === 'true' 
      : !todos;

    const eventos = await agendaService.listar({
      soloVigentes,
      todos,
      categoria,
    });
    res.json(eventos);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al listar agenda', detalle: error.message });
  }
}

export async function obtenerEventoAgenda(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const evento = await agendaService.obtenerPorId(id);
    if (!evento) {
      res.status(404).json({ error: `Evento con id '${id}' no encontrado` });
      return;
    }
    res.json(evento);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al obtener evento', detalle: error.message });
  }
}

export async function crearEventoAgenda(req: Request, res: Response): Promise<void> {
  try {
    const {
      id,
      titulo,
      categoria,
      fecha_inicio,
      fecha_fin,
      horario,
      lugar,
      direccion,
      mapa_url,
      tipo_acceso,
      arancel_estimado,
      descripcion_corta,
      url_info,
      url_tickets,
      imagen_url,
      destacado,
      estado,
      noticia_origen_id,
    } = req.body;

    const effectiveFechaFin = fecha_fin || fecha_inicio;
    if (!titulo || !categoria || !fecha_inicio || !effectiveFechaFin || !lugar || !tipo_acceso || !descripcion_corta) {
      res.status(400).json({
        error: 'Campos requeridos faltantes: titulo, categoria, fecha_inicio, lugar, tipo_acceso, descripcion_corta',
      });
      return;
    }

    if (!url_info || typeof url_info !== 'string' || !url_info.trim().startsWith('http')) {
      res.status(400).json({
        error: 'El campo url_info debe ser un enlace web verificable a la nota o cartelera del evento',
      });
      return;
    }

    const creado = await agendaService.crear({
      id,
      titulo,
      categoria,
      fecha_inicio,
      fecha_fin: effectiveFechaFin,
      horario,
      lugar,
      direccion,
      mapa_url,
      tipo_acceso,
      arancel_estimado,
      descripcion_corta,
      url_info: url_info.trim(),
      url_tickets: url_tickets ? String(url_tickets).trim() : null,
      imagen_url: imagen_url || null,
      destacado: Boolean(destacado),
      estado: estado || 'vigente',
      noticia_origen_id,
      curada_manualmente: true,
      sincronizado_firestore: true,
    });

    res.status(201).json(creado);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al crear evento de agenda', detalle: error.message });
  }
}

export async function actualizarEventoAgenda(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (req.body.url_info !== undefined) {
      const urlInfo = String(req.body.url_info).trim();
      if (urlInfo && !urlInfo.startsWith('http')) {
        res.status(400).json({
          error: 'El campo url_info debe ser un enlace web válido comenzando con http:// o https://',
        });
        return;
      }
    }

    const payload = {
      ...req.body,
      curada_manualmente: true,
      sincronizado_firestore: true,
      updated_at: new Date().toISOString(),
    };

    const actualizado = await agendaService.actualizar(id, payload);
    if (!actualizado) {
      res.status(404).json({ error: `Evento con id '${id}' no encontrado` });
      return;
    }
    res.json(actualizado);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al actualizar evento de agenda', detalle: error.message });
  }
}

export async function eliminarEventoAgenda(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const ok = await agendaService.eliminar(id);
    if (!ok) {
      res.status(404).json({ error: `Evento con id '${id}' no encontrado` });
      return;
    }
    res.json({ mensaje: `Evento '${id}' eliminado exitosamente` });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al eliminar evento de agenda', detalle: error.message });
  }
}

/**
 * Purgar eventos vencidos (fecha_fin < hoy)
 */
export async function purgarEventosVencidos(req: Request, res: Response): Promise<void> {
  try {
    const resultado = await agendaService.purgarVencidos();
    res.json({
      mensaje: `Se purgaron ${resultado.eliminados} eventos vencidos exitosamente`,
      eliminados: resultado.eliminados,
      ids: resultado.ids,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: 'Error al purgar eventos vencidos', detalle: error.message });
  }
}
