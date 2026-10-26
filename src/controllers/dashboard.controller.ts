import { Request, Response } from 'express';
import { noticiasService } from '../services/noticias.service.js';
import { agendaService } from '../services/agenda.service.js';
import { dossiersService } from '../services/dossiers.service.js';
import { fuentesService } from '../services/fuentes.service.js';
import { anunciantesService } from '../services/anunciantes.service.js';
import { edicionesService } from '../services/ediciones.service.js';
import { brandingService } from '../services/branding.service.js';
import { getDatabaseStatus } from '../config/firebase.js';

let statsCache: { data: any; timestamp: number } | null = null;
const STATS_CACHE_TTL_MS = 15 * 1000; // 15 segundos de caché en memoria

export async function obtenerResumenDashboard(req: Request, res: Response): Promise<void> {
  try {
    const isFresh = req.query.fresh === '1' || req.query.fresh === 'true';

    // Servir desde caché si está vigente y no se solicitó actualización forzada
    if (!isFresh && statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_TTL_MS) {
      res.json(statsCache.data);
      return;
    }

    const [
      noticiasSettled,
      agendaSettled,
      dossiersSettled,
      fuentesSettled,
      anunciantesSettled,
      edicionesSettled,
      brandingSettled,
      dbStatusSettled,
    ] = await Promise.allSettled([
      noticiasService.listar({ limit: 1000 }),
      agendaService.listar(false),
      dossiersService.listar(false),
      fuentesService.listar(false),
      anunciantesService.listar({}),
      edicionesService.listar(),
      brandingService.obtener(),
      Promise.resolve(getDatabaseStatus()),
    ]);

    const noticiasResult =
      noticiasSettled.status === 'fulfilled'
        ? noticiasSettled.value
        : { data: [], total: 0, page: 1, limit: 1000, totalPages: 1 };
    const agendaList = agendaSettled.status === 'fulfilled' ? agendaSettled.value : [];
    const dossiersList = dossiersSettled.status === 'fulfilled' ? dossiersSettled.value : [];
    const fuentesList = fuentesSettled.status === 'fulfilled' ? fuentesSettled.value : [];
    const anunciantesList = anunciantesSettled.status === 'fulfilled' ? anunciantesSettled.value : [];
    const edicionesList = edicionesSettled.status === 'fulfilled' ? edicionesSettled.value : [];
    const brandingConfig =
      brandingSettled.status === 'fulfilled'
        ? brandingSettled.value
        : {
            nombre_medio: 'Bariloche Semanal',
            eslogan: 'Observatorio periodístico e inteligencia local',
            colores: {
              primario: '#1e3a8a',
              secundario: '#0284c7',
              acento: '#f59e0b',
              fondo_newsletter: '#f8fafc',
            },
            logo_url: '',
          };
    const dbStatus =
      dbStatusSettled.status === 'fulfilled' ? dbStatusSettled.value : getDatabaseStatus();

    const todasNoticias = noticiasResult.data || [];

    // Desglose de noticias por área y atributos
    const porArea: Record<string, number> = {};
    let redactadas = 0;
    let conFoto = 0;
    let curadasManualmente = 0;

    for (const n of todasNoticias) {
      const area = n.area_id || 'otra';
      porArea[area] = (porArea[area] || 0) + 1;
      if (n.cuerpo_html && n.cuerpo_html.trim().length > 0) redactadas++;
      if (n.media?.imagen_url) conFoto++;
      if (n.curada_manualmente) curadasManualmente++;
    }

    // Desglose dossiers
    let dossiersActivos = 0;
    let dossiersSeguimiento = 0;
    let dossiersResueltos = 0;
    for (const d of dossiersList) {
      if (d.estado === 'activo') dossiersActivos++;
      else if (d.estado === 'en_seguimiento') dossiersSeguimiento++;
      else if (d.estado === 'resuelto') dossiersResueltos++;
    }

    // Desglose fuentes
    let fuentesActivas = 0;
    const fuentesPorBeat: Record<string, number> = {
      'pulso-urbano': 0,
      'poder-obras': 0,
      'montana-turismo': 0,
    };
    for (const f of fuentesList) {
      if (f.activo) fuentesActivas++;
      if (f.beat_id && fuentesPorBeat[f.beat_id] !== undefined) {
        fuentesPorBeat[f.beat_id]++;
      }
    }

    // Desglose anunciantes
    let anunciantesActivos = 0;
    for (const a of anunciantesList) {
      if (a.activo) anunciantesActivos++;
    }

    // Desglose ediciones
    let edicionesEnviadas = 0;
    let edicionesBorrador = 0;
    for (const e of edicionesList || []) {
      if (e.estado === 'enviado' || e.estado === 'enviado_a_suscriptores') edicionesEnviadas++;
      else edicionesBorrador++;
    }

    // Sanitizar última edición para no transportar 20KB-100KB de HTML que el dashboard no renderiza
    const ultimaEdicion = edicionesList[0]
      ? {
          ...edicionesList[0],
          html_content: '',
        }
      : null;

    // Sanitizar últimas noticias para el dashboard (titular, hecho_central y fuente) sin cuerpo_html pesado
    const ultimasNoticias = todasNoticias.slice(0, 5).map((n) => ({
      ...n,
      cuerpo_html: '',
    }));

    // Optimizar dossiers últimos (evitar arrays pesados)
    const ultimosDossiers = dossiersList.slice(0, 4).map((d) => ({
      id: d.id,
      titulo: d.titulo || 'Sin título',
      estado: d.estado || 'activo',
      area_id: d.area_id,
      resumen_contexto: d.resumen_contexto || '',
      actores_clave: d.actores_clave || [],
      timeline: (d.timeline || []).slice(0, 10).map((h) => ({
        fecha: h.fecha,
        hito: h.hito,
        noticia_id: h.noticia_id,
        fuente_url: h.fuente_url,
      })),
      media: d.media,
      ultima_actualizacion: d.ultima_actualizacion || new Date().toISOString(),
    }));

    const responseData = {
      timestamp: new Date().toISOString(),
      noticias: {
        total: noticiasResult.total || todasNoticias.length,
        redactadas,
        con_foto: conFoto,
        curadas_manualmente: curadasManualmente,
        por_area: porArea,
        ultimas: ultimasNoticias,
      },
      agenda: {
        total: agendaList.length,
        destacados: agendaList.filter((e) => e.destacado).length,
        ultimos: agendaList.slice(0, 4),
      },
      dossiers: {
        total: dossiersList.length,
        activos: dossiersActivos,
        en_seguimiento: dossiersSeguimiento,
        resueltos: dossiersResueltos,
        ultimos: ultimosDossiers,
      },
      fuentes: {
        total: fuentesList.length,
        activas: fuentesActivas,
        inactivas: Math.max(0, fuentesList.length - fuentesActivas),
        por_beat: fuentesPorBeat,
      },
      anunciantes: {
        total: anunciantesList.length,
        activos: anunciantesActivos,
      },
      ediciones: {
        total: edicionesList.length,
        enviadas: edicionesEnviadas,
        borradores: edicionesBorrador,
        ultima: ultimaEdicion,
      },
      branding: {
        nombre_medio: brandingConfig.nombre_medio || 'Bariloche Semanal',
        eslogan: brandingConfig.eslogan || '',
        colores: brandingConfig.colores || {
          primario: '#1e3a8a',
          secundario: '#0284c7',
          acento: '#f59e0b',
          fondo_newsletter: '#f8fafc',
        },
        logo_url: brandingConfig.logo_url || '',
      },
      dbStatus,
    };

    // Actualizar caché
    statsCache = {
      data: responseData,
      timestamp: Date.now(),
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(responseData);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[DashboardController Error]:', error);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ error: 'Error al obtener resumen de dashboard', detalle: error.message });
  }
}
