import { Request, Response } from 'express';
import { climaService } from '../services/clima.service.js';

export async function obtenerClima(req: Request, res: Response): Promise<void> {
  try {
    const latitud = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const longitud = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const ciudad = req.query.ciudad as string | undefined;
    const provincia = req.query.provincia as string | undefined;
    const pais = req.query.pais as string | undefined;
    const forceFresh = req.query.fresh === 'true' || req.query.fresh === '1';

    const datos = await climaService.obtenerClima({
      latitud: !isNaN(latitud!) ? latitud : undefined,
      longitud: !isNaN(longitud!) ? longitud : undefined,
      ciudad,
      provincia,
      pais,
      forceFresh,
    });

    res.json(datos);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ClimaController] Error en obtenerClima:', error.message);
    res.status(500).json({
      error: 'Error al consultar datos meteorológicos',
      detalle: error.message,
    });
  }
}

export async function buscarCiudades(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string) || '';
    const ciudades = await climaService.buscarCiudades(query);
    res.json(ciudades);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ClimaController] Error en buscarCiudades:', error.message);
    res.status(500).json({
      error: 'Error al buscar ciudades',
      detalle: error.message,
    });
  }
}
