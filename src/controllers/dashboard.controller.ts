import { Request, Response } from 'express';
import { noticiasService } from '../services/noticias.service.js';
import { agendaService } from '../services/agenda.service.js';
import { dossiersService } from '../services/dossiers.service.js';
import { fuentesService } from '../services/fuentes.service.js';
import { anunciantesService } from '../services/anunciantes.service.js';
import { edicionesService } from '../services/ediciones.service.js';
import { brandingService } from '../services/branding.service.js';
import { getDatabaseStatus } from '../config/firebase.js';

export async function obtenerResumenDashboard(req: Request, res: Response): Promise<void> {
  try {
    const [
      noticiasResult,
      agendaList,
      dossiersList,
      fuentesList,
      anunciantesList,
      edicionesList,
      brandingConfig,
      dbStatus,
    ] = await Promise.all([
      noticiasService.listar({ limit: 1000 }),
      agendaService.listar(false),
      dossiersService.listar(false),
      fuentesService.listar(false),
      anunciantesService.listar({}),
      edicionesService.listar(),
      brandingService.obtener(),
      Promise.resolve(getDatabaseStatus()),
    ]);

    const todasNoticias = noticiasResult.data;

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
    for (const e of edicionesList) {
      if (e.estado === 'enviado') edicionesEnviadas++;
      else edicionesBorrador++;
    }

    res.json({
      timestamp: new Date().toISOString(),
      noticias: {
        total: noticiasResult.total,
        redactadas,
        con_foto: conFoto,
        curadas_manualmente: curadasManualmente,
        por_area: porArea,
        ultimas: todasNoticias.slice(0, 5),
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
        ultimos: dossiersList.slice(0, 4),
      },
      fuentes: {
        total: fuentesList.length,
        activas: fuentesActivas,
        inactivas: fuentesList.length - fuentesActivas,
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
        ultima: edicionesList[0] || null,
      },
      branding: {
        nombre_medio: brandingConfig.nombre_medio,
        eslogan: brandingConfig.eslogan,
        colores: brandingConfig.colores,
        logo_url: brandingConfig.logo_url,
      },
      dbStatus,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[DashboardController Error]:', error);
    res.status(500).json({ error: 'Error al obtener resumen de dashboard', detalle: error.message });
  }
}
