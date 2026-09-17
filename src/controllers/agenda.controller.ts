import { Request, Response } from 'express';
import { agendaService } from '../services/agenda.service.js';

export async function listarAgenda(req: Request, res: Response): Promise<void> {
  try {
    const todos = req.query.todos === 'true';
    const eventos = await agendaService.listar(!todos);
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
      tipo_acceso,
      descripcion_corta,
      url_info,
      imagen_url,
      noticia_origen_id,
    } = req.body;

    if (!titulo || !categoria || !fecha_inicio || !fecha_fin || !lugar || !tipo_acceso || !descripcion_corta) {
      res.status(400).json({
        error: 'Campos requeridos faltantes: titulo, categoria, fecha_inicio, fecha_fin, lugar, tipo_acceso, descripcion_corta',
      });
      return;
    }

    const creado = await agendaService.crear({
      id,
      titulo,
      categoria,
      fecha_inicio,
      fecha_fin,
      horario,
      lugar,
      tipo_acceso,
      descripcion_corta,
      url_info: url_info || '',
      imagen_url,
      noticia_origen_id,
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
    const actualizado = await agendaService.actualizar(id, req.body);
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
