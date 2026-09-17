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
} from 'lucide-react';
import { ConfiguracionBranding } from '../types/index.js';
import { DualImageSelector } from './DualImageSelector.js';

interface BrandingViewProps {
  branding: ConfiguracionBranding | null;
  onUpdateBranding: (nuevo: ConfiguracionBranding) => void;
}

export const BrandingView: React.FC<BrandingViewProps> = ({ branding, onUpdateBranding }) => {
  const [nombreMedio, setNombreMedio] = useState('Bariloche Semanal');
  const [eslogan, setEslogan] = useState('Observatorio periodístico e inteligencia local');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

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
    }
  }, [branding]);

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
            Identidad Visual & Branding
          </h1>
          <p className="text-xs text-slate-500">
            Personalización institucional del observatorio y newsletters en documento <code className="text-blue-700 font-mono">configuracion/branding</code>
          </p>
        </div>
        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
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
          {/* Columna Izquierda: Datos e Imágenes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información General */}
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

            {/* SELECTOR DUAL PARA LOGO Y FAVICON */}
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

            {/* Paleta de Colores HEX */}
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

            {/* Enlaces de Contacto */}
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

          {/* Columna Derecha: Vista Previa de la Cabecera */}
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
                    alt="Logo"
                    className="h-14 mx-auto object-contain"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='60' viewBox='0 0 180 60' fill='%23f1f5f9'%3E%3Crect width='100%25' height='100%25' fill='%23f8fafc' stroke='%23cbd5e1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' font-weight='bold' fill='%2394a3b8'%3ELOGO%3C/text%3E%3C/svg%3E";
                    }}
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
                    <span>Guardar Cambios de Identidad</span>
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
