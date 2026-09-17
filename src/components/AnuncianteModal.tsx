import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Megaphone } from 'lucide-react';
import { Anunciante, DestinoAnuncio, UbicacionAnuncio } from '../types/index.js';
import { DualImageSelector } from './DualImageSelector.js';

interface AnuncianteModalProps {
  isOpen: boolean;
  anuncianteAEditar: Anunciante | null;
  onClose: () => void;
  onSave: (anunciante: Partial<Anunciante>) => Promise<void>;
}

export const AnuncianteModal: React.FC<AnuncianteModalProps> = ({
  isOpen,
  anuncianteAEditar,
  onClose,
  onSave,
}) => {
  const [nombre, setNombre] = useState('');
  const [activo, setActivo] = useState(true);
  const [destino, setDestino] = useState<DestinoAnuncio>('ambos');
  const [ubicacion, setUbicacion] = useState<UbicacionAnuncio>('pre-footer');
  const [bannerUrl, setBannerUrl] = useState('');
  const [enlaceClick, setEnlaceClick] = useState('');
  const [textoAlt, setTextoAlt] = useState('');
  const [prioridad, setPrioridad] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = React.useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (anuncianteAEditar) {
      setNombre(anuncianteAEditar.nombre || '');
      setActivo(anuncianteAEditar.activo !== false);
      setDestino(anuncianteAEditar.destino || 'ambos');
      setUbicacion(anuncianteAEditar.ubicacion || 'pre-footer');
      setBannerUrl(anuncianteAEditar.banner_url || '');
      setEnlaceClick(anuncianteAEditar.enlace_click || '');
      setTextoAlt(anuncianteAEditar.texto_alt || '');
      setPrioridad(anuncianteAEditar.prioridad ?? 1);
    } else {
      setNombre('');
      setActivo(true);
      setDestino('ambos');
      setUbicacion('pre-footer');
      setBannerUrl('');
      setEnlaceClick('');
      setTextoAlt('');
      setPrioridad(1);
    }
  }, [anuncianteAEditar, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !bannerUrl.trim() || !enlaceClick.trim()) {
      setError('Por favor completa el Nombre, Banner y el Enlace de Destino.');
      return;
    }

    let safeEnlace = enlaceClick.trim();
    if (safeEnlace && !safeEnlace.startsWith('http://') && !safeEnlace.startsWith('https://') && !safeEnlace.startsWith('/')) {
      safeEnlace = `https://${safeEnlace}`;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        activo,
        destino,
        ubicacion,
        banner_url: bannerUrl.trim(),
        enlace_click: safeEnlace,
        texto_alt: textoAlt.trim() || nombre.trim(),
        prioridad: Number(prioridad),
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      if (isMountedRef.current) {
        setError(errorObj.message || 'Error al guardar anunciante');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-bold text-slate-800">
              {anuncianteAEditar ? `Editar Auspiciante: ${anuncianteAEditar.nombre}` : 'Nuevo Auspiciante / Banner'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Nombre de la Marca / Empresa *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Cervecería Patagonia / INVAP / Banco Patagonia"
              value={nombre || ''}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Destino del Anuncio *
              </label>
              <select
                value={destino || 'ambos'}
                onChange={(e) => setDestino(e.target.value as DestinoAnuncio)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="ambos">Ambos (Newsletter + Web)</option>
                <option value="newsletter">Solo Newsletter</option>
                <option value="web">Solo Web</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Ubicación
              </label>
              <select
                value={ubicacion || 'pre-footer'}
                onChange={(e) => setUbicacion(e.target.value as UbicacionAnuncio)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="pre-footer">Pre-Footer (Recomendado)</option>
                <option value="footer">Footer</option>
                <option value="header">Header</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Prioridad de Aparición
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={prioridad ?? 1}
                onChange={(e) => setPrioridad(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Enlace de Destino (Click URL) *
            </label>
            <input
              type="text"
              required
              placeholder="https://marca-patagonia.com/promo o patagonia.com"
              value={enlaceClick || ''}
              onChange={(e) => setEnlaceClick(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Texto Alternativo (Alt Text para accesibilidad)
            </label>
            <input
              type="text"
              placeholder="Ej: Anuncio Cervecería Patagonia - Descuentos para residentes"
              value={textoAlt || ''}
              onChange={(e) => setTextoAlt(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          {/* SELECTOR DUAL DE BANNER */}
          <DualImageSelector
            label="Banner Publicitario (Selector Dual Obligatorio)"
            value={bannerUrl || ''}
            onChange={(url) => setBannerUrl(url)}
            helperText="Formato recomendado: Banner horizontal (600x120px o 300x250px). Sube el archivo directo o pega su URL."
          />

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <div className="text-xs font-bold text-slate-800">Campaña Activa</div>
              <div className="text-[11px] text-slate-500">
                Al desactivar, el banner deja de compilarse inmediatamente en el newsletter
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-800"></div>
            </label>
          </div>
        </form>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Auspiciante
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
