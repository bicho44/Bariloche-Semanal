import React, { useState, useEffect, useCallback } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  RefreshCw,
  Settings,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { DatosClima, ConfiguracionClima } from '../types/index.js';

interface WeatherWidgetProps {
  variant?: 'compact' | 'card' | 'discreet';
  climaConfig?: ConfiguracionClima;
  onOpenBranding?: () => void;
  className?: string;
}

export function getWeatherIcon(icono: string, className: string = 'w-4 h-4') {
  switch (icono) {
    case 'sun':
      return <Sun className={`${className} text-amber-500`} />;
    case 'cloud-sun':
      return <CloudSun className={`${className} text-amber-400`} />;
    case 'cloud':
      return <Cloud className={`${className} text-slate-400`} />;
    case 'cloud-rain':
      return <CloudRain className={`${className} text-blue-500`} />;
    case 'cloud-drizzle':
      return <CloudDrizzle className={`${className} text-blue-400`} />;
    case 'cloud-snow':
    case 'snowflake':
      return <Snowflake className={`${className} text-cyan-400`} />;
    case 'cloud-lightning':
      return <CloudLightning className={`${className} text-purple-500`} />;
    case 'cloud-fog':
      return <CloudFog className={`${className} text-slate-400`} />;
    default:
      return <CloudSun className={`${className} text-amber-400`} />;
  }
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  variant = 'compact',
  climaConfig,
  onOpenBranding,
  className = '',
}) => {
  const [clima, setClima] = useState<DatosClima | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClima = useCallback(async (fresh = false) => {
    if (fresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (climaConfig?.latitud !== undefined && climaConfig?.longitud !== undefined) {
        params.append('lat', String(climaConfig.latitud));
        params.append('lon', String(climaConfig.longitud));
      }
      if (climaConfig?.ciudad) {
        params.append('ciudad', climaConfig.ciudad);
      }
      if (climaConfig?.provincia) {
        params.append('provincia', climaConfig.provincia);
      }
      if (fresh) {
        params.append('fresh', '1');
      }

      const queryString = params.toString();
      const res = await fetch(`/api/clima${queryString ? `?${queryString}` : ''}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: DatosClima = await res.json();
      setClima(data);
    } catch (err: unknown) {
      console.warn('[WeatherWidget] Error al cargar clima:', err);
      setError('Clima no disponible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [climaConfig?.latitud, climaConfig?.longitud, climaConfig?.ciudad, climaConfig?.provincia]);

  useEffect(() => {
    fetchClima();
  }, [fetchClima]);

  // Si el clima está explícitamente desactivado en configuración, no renderizar
  if (climaConfig && climaConfig.activo === false) {
    return null;
  }

  // 1. VARIANTE COMPACTA (Para el Header / Topbar)
  if (variant === 'compact') {
    if (loading && !clima) {
      return (
        <div className={`flex items-center gap-1.5 text-xs text-slate-400 animate-pulse ${className}`}>
          <CloudSun className="w-3.5 h-3.5 text-slate-300" />
          <span>Cargando clima...</span>
        </div>
      );
    }

    if (error && !clima) {
      return null;
    }

    const temp = clima?.temperatura ?? 12;
    const ciudad = clima?.ciudad || 'Bariloche';
    const icono = clima?.icono || 'cloud-sun';
    const condicion = clima?.condicion || 'Parcialmente nublado';

    return (
      <div
        className={`flex items-center gap-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 px-2.5 py-1 rounded-lg text-xs transition-colors group cursor-default ${className}`}
        title={`Clima actual en ${ciudad}: ${condicion} (${temp}°C). Sensación térmica: ${clima?.sensacion_termica ?? temp}°C. Viento: ${clima?.viento_kmh ?? 0} km/h.`}
      >
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          {getWeatherIcon(icono, 'w-3.5 h-3.5')}
          <span>{temp}°C</span>
        </div>
        <span className="text-slate-300">•</span>
        <span className="text-slate-600 font-medium truncate max-w-[140px] hidden sm:inline">
          {ciudad}
        </span>
        <span className="text-[11px] text-slate-400 hidden md:inline truncate max-w-[130px]">
          ({condicion})
        </span>
        {onOpenBranding && (
          <button
            type="button"
            onClick={onOpenBranding}
            className="text-slate-400 hover:text-blue-700 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Cambiar ciudad en Identidad y Branding"
          >
            <Settings className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 2. VARIANTE DISCRETA (Optimizada para columna compacta en el Dashboard)
  if (variant === 'discreet') {
    if (loading && !clima) {
      return (
        <div className={`bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 border border-slate-700/50 shadow-xs min-h-[148px] flex flex-col justify-between animate-pulse ${className}`}>
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-700/80 rounded w-28" />
            <div className="h-4 bg-slate-700/80 rounded w-14" />
          </div>
          <div className="flex items-center gap-3 my-2">
            <div className="w-10 h-10 rounded-xl bg-slate-700/80" />
            <div className="space-y-1.5">
              <div className="h-6 bg-slate-700/80 rounded w-16" />
              <div className="h-3 bg-slate-700/80 rounded w-28" />
            </div>
          </div>
          <div className="h-3 bg-slate-700/80 rounded w-36" />
        </div>
      );
    }

    if (error && !clima) {
      return (
        <div className={`bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex flex-col justify-between min-h-[148px] ${className}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {climaConfig?.ciudad || 'Bariloche'}
            </span>
            <button
              onClick={() => fetchClima(true)}
              className="text-blue-600 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Reintentar
            </button>
          </div>
          <p className="text-slate-500 text-[11px]">No se pudo cargar la información del clima actual.</p>
          {onOpenBranding && (
            <button
              onClick={onOpenBranding}
              className="text-blue-600 hover:underline text-[11px] text-left cursor-pointer"
            >
              Ajustar ciudad en Identidad y Branding →
            </button>
          )}
        </div>
      );
    }

    const temp = clima?.temperatura ?? 12;
    const ciudad = clima?.ciudad || climaConfig?.ciudad || 'Bariloche';
    const provincia = clima?.provincia || climaConfig?.provincia || 'Río Negro';
    const condicion = clima?.condicion || 'Parcialmente nublado';
    const icono = clima?.icono || 'cloud-sun';

    return (
      <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-4 sm:p-4.5 border border-slate-700/60 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[148px] ${className}`}>
        {/* Glow sutil de fondo */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

        {/* Encabezado discreto */}
        <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-bold text-xs tracking-tight text-white truncate" title={`${ciudad}, ${provincia}`}>
              {ciudad}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/20 shrink-0">
              {provincia}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fetchClima(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
              title="Refrescar reporte del clima"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-300' : ''}`} />
            </button>
            {onOpenBranding && (
              <button
                type="button"
                onClick={onOpenBranding}
                className="p-1.5 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
                title="Cambiar ciudad en Identidad y Branding"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Cuerpo principal con temperatura actual y condición */}
        <div className="relative z-10 flex items-center justify-between gap-3 my-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 border border-white/10 shrink-0">
              {getWeatherIcon(icono, 'w-7 h-7')}
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {temp}°C
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  ST {clima?.sensacion_termica ?? temp}°C
                </span>
              </div>
              <div className="text-xs text-blue-200 font-medium truncate max-w-[170px] sm:max-w-[220px]">
                {condicion}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[11px] font-semibold text-slate-200">
              <span className="text-blue-300">{clima?.temp_min ?? 4}°</span> / <span className="text-amber-300">{clima?.temp_max ?? 16}°</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
              Min / Max
            </div>
          </div>
        </div>

        {/* Micro-métricas complementarias */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span>{clima?.viento_kmh ?? 15} km/h</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-blue-300 shrink-0" />
            <span>{clima?.humedad ?? 60}% hum.</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate hidden sm:block">
            {clima?.hora_actualizacion ? `Act: ${clima.hora_actualizacion}` : 'En vivo'}
          </div>
        </div>
      </div>
    );
  }

  // 3. VARIANTE CARD (Card extendido con pronóstico para vistas completas)
  return (
    <div className={`bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-blue-900/40 relative overflow-hidden ${className}`}>
      {/* Patrón decorativo cordillerano sutil */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

      {/* Header de la tarjeta */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-300">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-white">
                {clima?.ciudad || climaConfig?.ciudad || 'San Carlos de Bariloche'}
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                {clima?.provincia || climaConfig?.provincia || 'Río Negro'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Datos meteorológicos en tiempo real • Lat: {(clima?.latitud ?? -41.13).toFixed(2)}°, Lon: {(clima?.longitud ?? -71.31).toFixed(2)}°
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchClima(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 bg-white/10 hover:bg-white/15 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refrescar reporte del clima"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-300' : 'text-slate-300'}`} />
            <span className="hidden sm:inline">{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>

          {onOpenBranding && (
            <button
              type="button"
              onClick={onOpenBranding}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 rounded-lg border border-amber-400/30 transition-colors cursor-pointer"
              title="Cambiar ciudad en Identidad y Branding"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Cambiar Ciudad</span>
            </button>
          )}
        </div>
      </div>

      {/* Bloque Principal del Clima Actual */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
        {/* Temperatura y Estado */}
        <div className="flex items-center gap-4 sm:col-span-2">
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 shadow-inner">
            {getWeatherIcon(clima?.icono || 'cloud-sun', 'w-12 h-12')}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                {clima?.temperatura ?? 12}°
              </span>
              <span className="text-sm font-medium text-slate-300">C</span>
              <span className="text-xs text-slate-400 ml-2">
                ST: <strong className="text-slate-200">{clima?.sensacion_termica ?? 11}°C</strong>
              </span>
            </div>
            <div className="text-sm font-semibold text-blue-200 mt-1">
              {clima?.condicion || 'Parcialmente nublado'}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
              <span className="flex items-center gap-0.5 text-blue-300 font-medium">
                <ArrowDown className="w-3 h-3 text-blue-400" /> Min {clima?.temp_min ?? 4}°C
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-amber-300 font-medium">
                <ArrowUp className="w-3 h-3 text-amber-400" /> Max {clima?.temp_max ?? 16}°C
              </span>
            </div>
          </div>
        </div>

        {/* Indicadores complementarios (Viento cordillerano y Humedad) */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 bg-black/20 p-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-xs">
            <Wind className="w-4 h-4 text-cyan-300 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Viento</span>
              <span className="font-semibold text-slate-100">{clima?.viento_kmh ?? 15} km/h</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Droplets className="w-4 h-4 text-blue-300 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Humedad</span>
              <span className="font-semibold text-slate-100">{clima?.humedad ?? 60}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pronóstico Extendido de 3 Días */}
      {clima?.pronostico_diario && clima.pronostico_diario.length > 1 && (
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Pronóstico Extendido para {clima.ciudad}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {clima.pronostico_diario.slice(0, 4).map((dia, idx) => (
              <div
                key={idx}
                className="bg-white/5 hover:bg-white/10 rounded-xl p-2.5 text-center border border-white/10 transition-colors"
              >
                <div className="text-xs font-semibold text-slate-200 mb-1">{dia.dia}</div>
                <div className="flex justify-center my-1.5">
                  {getWeatherIcon(dia.icono, 'w-5 h-5')}
                </div>
                <div className="text-xs font-bold text-white">
                  {dia.temp_min}° / {dia.temp_max}°
                </div>
                <div className="text-[10px] text-slate-300 truncate mt-0.5 font-medium">
                  {dia.condicion}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer de la tarjeta */}
      <div className="relative z-10 mt-4 flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-white/5">
        <span>Última lectura: {clima?.hora_actualizacion || 'Actual'}</span>
        <span className="text-slate-300">Observatorio Meteorológico Bariloche Semanal</span>
      </div>
    </div>
  );
};
