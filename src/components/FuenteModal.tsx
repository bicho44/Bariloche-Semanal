import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Radio } from 'lucide-react';
import { Fuente, TipoFuente } from '../types/index.js';

interface FuenteModalProps {
  isOpen: boolean;
  fuenteAEditar: Fuente | null;
  onClose: () => void;
  onSave: (fuente: Partial<Fuente>) => Promise<void>;
}

export const FuenteModal: React.FC<FuenteModalProps> = ({
  isOpen,
  fuenteAEditar,
  onClose,
  onSave,
}) => {
  const [id, setId] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoFuente>('diario_digital');
  const [urlBase, setUrlBase] = useState('');
  const [activo, setActivo] = useState(true);
  const [prioridad, setPrioridad] = useState<1 | 2>(1);
  const [frecuenciaMonitoreo, setFrecuenciaMonitoreo] = useState('diario');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fuenteAEditar) {
      setId(fuenteAEditar.id || '');
      setNombre(fuenteAEditar.nombre || '');
      setTipo(fuenteAEditar.tipo || 'diario_digital');
      setUrlBase(fuenteAEditar.url_base || '');
      setActivo(fuenteAEditar.activo !== false);
      setPrioridad(fuenteAEditar.prioridad ?? 1);
      setFrecuenciaMonitoreo(fuenteAEditar.frecuencia_monitoreo || 'diario');
    } else {
      setId('');
      setNombre('');
      setTipo('diario_digital');
      setUrlBase('');
      setActivo(true);
      setPrioridad(1);
      setFrecuenciaMonitoreo('diario');
    }
  }, [fuenteAEditar, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !urlBase.trim()) {
      setError('Por favor completa el Nombre y la URL Base.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        id: id.trim() || undefined,
        nombre: nombre.trim(),
        tipo,
        url_base: urlBase.trim(),
        activo,
        prioridad,
        frecuencia_monitoreo: frecuenciaMonitoreo,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error al guardar la fuente');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-bold text-slate-800">
              {fuenteAEditar ? `Editar Fuente: ${fuenteAEditar.nombre}` : 'Alta de Fuente Periodística'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {!fuenteAEditar && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Identificador (ID Slug opcional)
              </label>
              <input
                type="text"
                placeholder="ej: anbariloche, el-cordillerano"
                value={id || ''}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Nombre del Medio o Fuente *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Diario Río Negro (Bariloche)"
              value={nombre || ''}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Tipo de Fuente
              </label>
              <select
                value={tipo || 'diario_digital'}
                onChange={(e) => setTipo(e.target.value as TipoFuente)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="diario_digital">Diario Digital</option>
                <option value="radio">Radio</option>
                <option value="organismo_publico">Organismo Público</option>
                <option value="canal_tv">Canal de TV</option>
                <option value="ong">ONG / Vecinal</option>
                <option value="red_social">Red Social / Canal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Prioridad Editorial
              </label>
              <select
                value={prioridad ?? 1}
                onChange={(e) => setPrioridad(Number(e.target.value) as 1 | 2)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value={1}>Prioridad 1 (Principal)</option>
                <option value={2}>Prioridad 2 (Secundario)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              URL Base / Portal Web *
            </label>
            <input
              type="url"
              required
              placeholder="https://rionegro.com.ar"
              value={urlBase || ''}
              onChange={(e) => setUrlBase(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <div className="text-xs font-bold text-slate-800">Estado de Monitoreo</div>
              <div className="text-[11px] text-slate-500">
                Determina si esta fuente está activa para el observatorio
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

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Guardar Fuente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
