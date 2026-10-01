import type React from 'react';

/**
 * Utilidades avanzadas para resolución, proxy y resiliencia de imágenes
 * en "Bariloche Semanal".
 *
 * Permite que imágenes de noticias y avisos sean accesibles sin importar
 * dónde estén alojadas (portales de noticias externos con bloqueo de hotlinking,
 * almacenamiento en servidor /uploads o Firebase Storage).
 */

export const DEFAULT_NOTICIA_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80' fill='%23f1f5f9'%3E%3Crect width='100%25' height='100%25' fill='%23f8fafc' stroke='%23cbd5e1'/%3E%3Cpath d='M40 50l12-16 10 12 8-10 12 14H38z' fill='%2394a3b8'/%3E%3Ccircle cx='46' cy='30' r='5' fill='%2394a3b8'/%3E%3Ctext x='50%25' y='72' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='8' font-weight='600' fill='%2364748b'%3ENOTICIA%3C/text%3E%3C/svg%3E";

export const DEFAULT_AVISO_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='60' viewBox='0 0 160 60' fill='%23f1f5f9'%3E%3Crect width='100%25' height='100%25' fill='%23f8fafc' stroke='%23cbd5e1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' font-weight='bold' fill='%2394a3b8'%3EESPACIO PUBLICITARIO%3C/text%3E%3C/svg%3E";

export const DEFAULT_AGENDA_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='120' viewBox='0 0 100 120' fill='%23f1f5f9'%3E%3Crect width='100%25' height='100%25' fill='%23f8fafc' stroke='%23cbd5e1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='11' font-weight='bold' fill='%2394a3b8'%3EEVENTO%3C/text%3E%3C/svg%3E";

/**
 * Genera la URL de proxy de la API para una imagen remota o externa.
 * Evita bloqueos de CORS, restricciones de Referrer y anti-hotlinking de portales periodísticos.
 */
export function getProxiedImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Data URLs y SVGs en línea se leen directamente
  if (trimmed.startsWith('data:')) return trimmed;

  // Si ya es una URL de proxy, retornarla
  if (trimmed.startsWith('/api/media/proxy')) return trimmed;

  // Rutas locales de uploads se pueden servir directo o por proxy
  if (trimmed.startsWith('/uploads/')) return trimmed;

  return `/api/media/proxy?url=${encodeURIComponent(trimmed)}`;
}

/**
 * Resuelve una URL de imagen a absoluta para clientes externos (email, previsualizaciones).
 */
export function resolveAbsoluteImageUrl(url?: string | null, customBaseUrl?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const base = customBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) return trimmed;

  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Manejador inteligente de onError para elementos <img> en React.
 * Si la imagen original falla (por ejemplo por 403 Forbidden o CORS de portales de noticias),
 * reintenta cargarla a través del proxy del backend (/api/media/proxy?url=...).
 * Si el proxy también falla, asigna el fallback SVG provisto.
 */
export function handleImageErrorWithProxy(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  originalUrl?: string | null,
  fallbackSvg: string = DEFAULT_NOTICIA_FALLBACK
): void {
  const target = e.currentTarget;
  const currentSrc = target.src;

  // Si no hay URL original o es data URL, ir al fallback
  if (!originalUrl || originalUrl.startsWith('data:')) {
    target.onerror = null;
    target.src = fallbackSvg;
    return;
  }

  const proxyTarget = getProxiedImageUrl(originalUrl);

  // Si el src actual aún no es el proxy, intentar con el proxy
  if (proxyTarget && !currentSrc.includes('/api/media/proxy?url=')) {
    target.src = proxyTarget;
    // La próxima vez que falle, caerá en el fallback SVG
    return;
  }

  // Ya intentó el proxy y falló: usar fallback SVG limpio
  target.onerror = null;
  target.src = fallbackSvg;
}
