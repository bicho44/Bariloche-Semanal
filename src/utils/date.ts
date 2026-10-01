/**
 * Utilidades para manejo de fechas con zona horaria estricta de Argentina
 * (America/Argentina/Buenos_Aires - UTC-3) para evitar saltos de fecha
 * tras las 21:00 hs locales (00:00 UTC).
 */

export const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

/**
 * Retorna la fecha en formato YYYY-MM-DD en la zona horaria de Argentina.
 * Previene saltos hacia el día siguiente después de las 21:00 hs locales.
 */
export function getFechaArgentina(fecha?: Date | string | number): string {
  try {
    const d = fecha ? new Date(fecha) : new Date();
    if (isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: ARGENTINA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    }

    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ARGENTINA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Retorna la fecha y hora formateada para visualización en la zona horaria de Argentina.
 */
export function formatFechaArgentinaVisual(fecha?: Date | string | number): string {
  try {
    const d = fecha ? new Date(fecha) : new Date();
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: ARGENTINA_TIMEZONE,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return String(fecha || '');
  }
}
