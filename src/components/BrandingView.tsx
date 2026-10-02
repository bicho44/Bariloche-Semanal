import React, { useState, useEffect } from 'react';
import {
  Palette,
  Save,
  Loader2,
  CheckCircle2,
  Mail,
  Phone,
  Instagram,
  Globe,
  Sparkles,
  Layout,
  CloudSun,
  MapPin,
  Search,
} from 'lucide-react';
import { ConfiguracionBranding, ConfiguracionClima } from '../types/index.js';
import { DualImageSelector } from './DualImageSelector.js';
import { handleImageErrorWithProxy } from '../utils/image.js';
import { WeatherWidget } from './WeatherWidget.js';

interface BrandingViewProps {
  branding: ConfiguracionBranding | null;
  onUpdateBranding: (nuevo: ConfiguracionBranding) => void;
}

const CIUDADES_RAPIDAS: ConfiguracionClima[] = [
  { ciudad: 'San Carlos de Bariloche', provincia: 'Río Negro', pais: 'Argentina', latitud: -41.1335, longitud: -71.3103, activo: true },
  { ciudad: 'Dina Huapi', provincia: 'Río Negro', pais: 'Argentina', latitud: -41.0716, longitud: -71.1611, activo: true },
  { ciudad: 'El Bolsón', provincia: 'Río Negro', pais: 'Argentina', latitud: -41.9667, longitud: -71.5333, activo: true },
  { ciudad: 'Villa La Angostura', provincia: 'Neuquén', pais: 'Argentina', latitud: -40.7631, longitud: -71.6441, activo: true },
  { ciudad: 'San Martín de los Andes', provincia: 'Neuquén', pais: 'Argentina', latitud: -40.1581, longitud: -71.3534, activo: true },
  { ciudad: 'Esquel', provincia: 'Chubut', pais: 'Argentina', latitud: -42.9115, longitud: -71.3195, activo: true },
  { ciudad: 'Neuquén Capital', provincia: 'Neuquén', pais: 'Argentina', latitud: -38.9516, longitud: -68.0591, activo: true },
  { ciudad: 'CABA / Buenos Aires', provincia: 'Buenos Aires', pais: 'Argentina', latitud: -34.6037, longitud: -58.3816, activo: true },
];

export const BrandingView: React.FC<BrandingViewProps> = ({ branding, onUpdateBranding }) => {
  const [nombreMedio, setNombreMedio] = useState('Bariloche Semanal');
  const [eslogan, setEslogan] = useState('Observatorio periodístico e inteligencia local');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  // Clima & Ubicación de la Ciudad
  const [ciudadClima, setCiudadClima] = useState('San Carlos de Bariloche');
  const [provinciaClima, setProvinciaClima] = useState('Río Negro');
  const [paisClima, setPaisClima] = useState('Argentina');
  const [latitudClima, setLatitudClima] = useState<number>(-41.1335);
  const [longitudClima, setLongitudClima] = useState<number>(-71.3103);
  const [climaActivo, setClimaActivo] = useState<boolean>(true);
  const [buscandoCoords, setBuscandoCoords] = useState<boolean>(false);
  const [busquedaMsg, setBusquedaMsg] = useState<string | null>(null);

  // Colores
  const [colorPrimario, setColorPrimario] = useState('#1e3a8a');
  const [colorSecundario, setColorSecundario] = useState('#0f172a');
  const [colorAcento, setColorAcento] = useState('#d97706');
  const [colorFondo, setColorFondo] = useState('#ffffff');

  // Contacto
  const [email, setEmail] = useState('contacto@barilochesemanal.com.ar');
  const [whatsapp, setWhatsapp] = useState('+54 9 294 400-0000');
  const [instagram, setInstagram] = useState('@barilochesemanal');
  const [sitioWeb, setSitioWeb] = useState('https://barilochesemanal.com.ar');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branding) {
      setNombreMedio(branding.nombre_medio || 'Bariloche Semanal');
      setEslogan(branding.eslogan || '');
      setLogoUrl(branding.logo_url || '');
      setFaviconUrl(branding.favicon_url || '');
      setColorPrimario(branding.colores?.primario || '#1e3a8a');
      setColorSecundario(branding.colores?.secundario || '#0f172a');
      setColorAcento(branding.colores?.acento || '#d97706');
      setColorFondo(branding.colores?.fondo_newsletter || '#ffffff');
      setEmail(branding.contacto?.email || '');
      setWhatsapp(branding.contacto?.whatsapp || '');
      setInstagram(branding.contacto?.instagram || '');
      setSitioWeb(branding.contacto?.sitio_web || '');

      // Cargar configuración de clima
      if (branding.clima) {
        setCiudadClima(branding.clima.ciudad || 'San Carlos de Bariloche');
        setProvinciaClima(branding.clima.provincia || 'Río Negro');
        setPaisClima(branding.clima.pais || 'Argentina');
        setLatitudClima(typeof branding.clima.latitud === 'number' ? branding.clima.latitud : -41.1335);
        setLongitudClima(typeof branding.clima.longitud === 'number' ? branding.clima.longitud : -71.3103);
        setClimaActivo(branding.clima.activo !== false);
      }
    }
  }, [branding]);

  const aplicarCiudadRapida = (ciudad: ConfiguracionClima) => {
    setCiudadClima(ciudad.ciudad);
    setProvinciaClima(ciudad.provincia || 'Río Negro');
    setPaisClima(ciudad.pais || 'Argentina');
    setLatitudClima(ciudad.latitud);
    setLongitudClima(ciudad.longitud);
    setBusquedaMsg(`Ciudad aplicada: ${ciudad.ciudad}, ${ciudad.provincia}`);
    setTimeout(() => setBusquedaMsg(null), 3000);
  };

  const handleBuscarCoordenadas = async () => {
    if (!ciudadClima.trim()) return;
    setBuscandoCoords(true);
    setBusquedaMsg(null);

    try {
      const res = await fetch(`/api/clima/ciudades?q=${encodeURIComponent(ciudadClima.trim())}`);
      if (res.ok) {
        const data: ConfiguracionClima[] = await res.json();
        if (data && data.length > 0) {
          const mejor = data[0];
          setCiudadClima(mejor.ciudad);
          if (mejor.provincia) setProvinciaClima(mejor.provincia);
          if (mejor.pais) setPaisClima(mejor.pais);
          setLatitudClima(mejor.latitud);
          setLongitudClima(mejor.longitud);
          setBusquedaMsg(`Coordenadas ubicadas: ${mejor.ciudad} (${mejor.latitud.toFixed(4)}, ${mejor.longitud.toFixed(4)})`);
        } else {
          setBusquedaMsg('No se encontraron coordenadas exactas. Puedes ingresarlas manualmente.');
        }
      }
    } catch {
      setBusquedaMsg('Error al consultar geocodificación. Ingresa las coordenadas manualmente.');
    } finally {
      setBuscandoCoords(false);
      setTimeout(() => setBusquedaMsg(null), 4000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    const payload: Partial<ConfiguracionBranding> = {
      nombre_medio: nombreMedio,
      eslogan,
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      colores: {
        primario: colorPrimario,
        secundario: colorSecundario,
        acento: colorAcento,
        fondo_newsletter: colorFondo,
      },
      contacto: {
        email,
        whatsapp,
        instagram,
        sitio_web: sitioWeb,
      },
      clima: {
        ciudad: ciudadClima.trim() || 'San Carlos de Bariloche',
        provincia: provinciaClima.trim() || 'Río Negro',
        pais: paisClima.trim() || 'Argentina',
        latitud: Number(latitudClima),
        longitud: Number(longitudClima),
        activo: climaActivo,
      },
    };

    try {
      const res = await fetch('/api/configuracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar configuración');
      }

      const actualizada = await res.json();
      onUpdateBranding(actualizada);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error al actualizar configuración de branding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Identidad Visual, Ciudad & Branding
          </h1>
          <p className="text-xs text-slate-500">
            Personalización institucional del observatorio, ubicación meteorológica y newsletters en <code className="text-blue-700 font-mono">configuracion/branding</code>
          </p>
        </div>
        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Configuración guardada en Firestore</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Datos, Clima e Imágenes */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Información General */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-900" />
                <span>Datos Generales del Periódico</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Nombre del Medio
                  </label>
                  <input
                    type="text"
                    required
                    value={nombreMedio || ''}
                    onChange={(e) => setNombreMedio(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Eslogan o Subtítulo
                  </label>
                  <input
                    type="text"
                    value={eslogan || ''}
                    onChange={(e) => setEslogan(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* 2. SECTOR DE CIUDAD Y MÓDULO METEOROLÓGICO */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CloudSun className="w-4 h-4 text-amber-500" />
                  <span>Ciudad Meteorológica & Módulo de Clima</span>
                </h2>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={climaActivo}
                    onChange={(e) => setClimaActivo(e.target.checked)}
                    className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Mostrar clima en el frontend
                  </span>
                </label>
              </div>

              <p className="text-xs text-slate-500">
                Define la ciudad que marca el clima del periódico. El sistema consulta en tiempo real temperatura, sensación térmica, viento y pronóstico para mostrarlo en el frontend y dashboard.
              </p>

              {/* Selector Rápido de Ciudades Patagónicas / Argentinas */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Selección rápida de ciudades de la región:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CIUDADES_RAPIDAS.map((c) => (
                    <button
                      key={c.ciudad}
                      type="button"
                      onClick={() => aplicarCiudadRapida(c)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-all cursor-pointer ${
                        ciudadClima.toLowerCase() === c.ciudad.toLowerCase()
                          ? 'bg-blue-900 text-white border-blue-900 shadow-2xs font-semibold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {c.ciudad}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulario de Ubicación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Ciudad / Localidad
                  </label>
                  <input
                    type="text"
                    required
                    value={ciudadClima}
                    onChange={(e) => setCiudadClima(e.target.value)}
                    placeholder="Ej: San Carlos de Bariloche"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Provincia / Región
                  </label>
                  <input
                    type="text"
                    value={provinciaClima}
                    onChange={(e) => setProvinciaClima(e.target.value)}
                    placeholder="Ej: Río Negro"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    País
                  </label>
                  <input
                    type="text"
                    value={paisClima}
                    onChange={(e) => setPaisClima(e.target.value)}
                    placeholder="Ej: Argentina"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Coordenadas Geográficas (Lat / Lon) y Botón de Detección */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Latitud Decimal
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitudClima}
                    onChange={(e) => setLatitudClima(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Longitud Decimal
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitudClima}
                    onChange={(e) => setLongitudClima(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleBuscarCoordenadas}
                    disabled={buscandoCoords}
                    className="w-full py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Obtener coordenadas geográficas buscando la ciudad"
                  >
                    {buscandoCoords ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" />
                    ) : (
                      <Search className="w-3.5 h-3.5 text-blue-700" />
                    )}
                    <span>{buscandoCoords ? 'Detectando...' : 'Autodetectar Coordenadas'}</span>
                  </button>
                </div>
              </div>

              {busquedaMsg && (
                <div className="text-xs text-blue-800 bg-blue-50 p-2.5 rounded-lg border border-blue-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{busquedaMsg}</span>
                </div>
              )}

              {/* Previsualización en Tiempo Real del Clima Configurado */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                  <span>Previsualización del clima en {ciudadClima}:</span>
                  {climaActivo ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                      Módulo Habilitado
                    </span>
                  ) : (
                    <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                      Módulo Deshabilitado
                    </span>
                  )}
                </div>
                <WeatherWidget
                  variant="card"
                  climaConfig={{
                    ciudad: ciudadClima,
                    provincia: provinciaClima,
                    pais: paisClima,
                    latitud: latitudClima,
                    longitud: longitudClima,
                    activo: climaActivo,
                  }}
                />
              </div>
            </div>

            {/* 3. SELECTOR DUAL PARA LOGO Y FAVICON */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-900" />
                <span>Logotipos e Isotipos (Selector Dual Archivo/URL)</span>
              </h2>

              <DualImageSelector
                label="Isologotipo Principal del Medio"
                value={logoUrl || ''}
                onChange={(url) => setLogoUrl(url)}
                helperText="Formato sugerido: PNG transparente o SVG de alta resolución."
              />

              <DualImageSelector
                label="Favicon / Icono de Navegador"
                value={faviconUrl || ''}
                onChange={(url) => setFaviconUrl(url)}
                helperText="Formato sugerido: Cuadrado 1:1 (PNG o ICO)."
              />
            </div>

            {/* 4. Paleta de Colores HEX */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Paleta de Colores (Códigos HEX)</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Color Primario */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Primario
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorPrimario || '#1e3a8a'}
                      onChange={(e) => setColorPrimario(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={colorPrimario || '#1e3a8a'}
                      onChange={(e) => setColorPrimario(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded uppercase"
                    />
                  </div>
                </div>

                {/* Color Secundario */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Secundario
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorSecundario || '#0f172a'}
                      onChange={(e) => setColorSecundario(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={colorSecundario || '#0f172a'}
                      onChange={(e) => setColorSecundario(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded uppercase"
                    />
                  </div>
                </div>

                {/* Color Acento */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Acento
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorAcento || '#d97706'}
                      onChange={(e) => setColorAcento(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={colorAcento || '#d97706'}
                      onChange={(e) => setColorAcento(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded uppercase"
                    />
                  </div>
                </div>

                {/* Fondo Newsletter */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Fondo Email
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorFondo || '#ffffff'}
                      onChange={(e) => setColorFondo(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={colorFondo || '#ffffff'}
                      onChange={(e) => setColorFondo(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Enlaces de Contacto */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-900" />
                <span>Canales de Contacto y Redes</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Email de Redacción</span>
                  </label>
                  <input
                    type="email"
                    value={email || ''}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Línea WhatsApp de Información</span>
                  </label>
                  <input
                    type="text"
                    value={whatsapp || ''}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-pink-600" />
                    <span>Usuario de Instagram</span>
                  </label>
                  <input
                    type="text"
                    value={instagram || ''}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sitio Web Oficial</span>
                  </label>
                  <input
                    type="url"
                    value={sitioWeb || ''}
                    onChange={(e) => setSitioWeb(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Vista Previa de la Cabecera & Clima */}
          <div className="space-y-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4 sticky top-6">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layout className="w-4 h-4 text-blue-900" />
                <span>Previsualización de Cabecera</span>
              </h3>

              <div
                className="p-5 rounded-xl border border-slate-200 shadow-sm text-center space-y-3"
                style={{ backgroundColor: colorFondo }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    referrerPolicy="no-referrer"
                    alt="Logo"
                    className="h-14 mx-auto object-contain"
                    onError={(e) => handleImageErrorWithProxy(e, logoUrl)}
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-bold text-white text-xl shadow-md"
                    style={{ backgroundColor: colorPrimario }}
                  >
                    BS
                  </div>
                )}

                <div>
                  <h4 className="font-extrabold text-base tracking-tight" style={{ color: colorSecundario }}>
                    {nombreMedio || 'Bariloche Semanal'}
                  </h4>
                  <p className="text-xs italic mt-0.5" style={{ color: colorAcento }}>
                    {eslogan || 'Inteligencia local y observatorio'}
                  </p>
                </div>

                {/* Previsualización del módulo de clima en la cabecera */}
                {climaActivo && (
                  <div className="pt-2 flex justify-center">
                    <WeatherWidget
                      variant="compact"
                      climaConfig={{
                        ciudad: ciudadClima,
                        provincia: provinciaClima,
                        pais: paisClima,
                        latitud: latitudClima,
                        longitud: longitudClima,
                        activo: climaActivo,
                      }}
                    />
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                  <span>{email}</span>
                  <span>•</span>
                  <span>{instagram}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando en Firestore...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios de Identidad & Ciudad</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
