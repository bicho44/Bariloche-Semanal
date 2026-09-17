import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2, FolderArchive, Clock } from 'lucide-react';
import { Dossier, AreaId, EstadoDossier, HitoTimeline } from '../types/index.js';

interface DossierModalProps {
  isOpen: boolean;
  dossierAEditar: Dossier | null;
  onClose: () => void;
  onSave: (dossier: Partial<Dossier>) => Promise<void>;
}

const AREAS: { id: AreaId; label: string }[] = [
  { id: 'gestion-publica', label: 'Gestión Pública' },
  { id: 'turismo', label: 'Turismo' },
  { id: 'deportes', label: 'Deportes' },
  { id: 'legales-comercio', label: 'Legales y Comercio' },
  { id: 'alquileres-inmobiliario', label: 'Alquileres e Inmobiliario' },
  { id: 'vida-social-cultura', label: 'Vida Social y Cultura' },
  { id: 'en-el-radar', label: 'En el Radar' },
];

export const DossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  dossierAEditar,
  onClose,
  onSave,
}) => {
  const [titulo, setTitulo] = useState('');
  const [areaId, setAreaId] = useState<AreaId>('gestion-publica');
  const [estado, setEstado] = useState<EstadoDossier>('activo');
  const [resumenContexto, setResumenContexto] = useState('');
  const [actoresClave, setActoresClave] = useState<string[]>([]);
  const [nuevoActor, setNuevoActor] = useState('');
  const [timeline, setTimeline] = useState<HitoTimeline[]>([]);

  // Campos para nuevo hito
  const [nuevoHitoFecha, setNuevoHitoFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nuevoHitoTexto, setNuevoHitoTexto] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dossierAEditar) {
      setTitulo(dossierAEditar.titulo || '');
      setAreaId(dossierAEditar.area_id || 'gestion-publica');
      setEstado(dossierAEditar.estado || 'activo');
      setResumenContexto(dossierAEditar.resumen_contexto || '');
      setActoresClave(dossierAEditar.actores_clave || []);
      setTimeline(dossierAEditar.timeline || []);
    } else {
      setTitulo('');
      setAreaId('gestion-publica');
      setEstado('activo');
      setResumenContexto('');
      setActoresClave([]);
      setTimeline([]);
    }
  }, [dossierAEditar, isOpen]);

  const handleAddActor = () => {
    if (!nuevoActor.trim()) return;
    if (!actoresClave.includes(nuevoActor.trim())) {
      setActoresClave([...actoresClave, nuevoActor.trim()]);
    }
    setNuevoActor('');
  };

  const handleRemoveActor = (actor: string) => {
    setActoresClave(actoresClave.filter((a) => a !== actor));
  };

  const handleAddHito = () => {
    if (!nuevoHitoFecha || !nuevoHitoTexto.trim()) return;
    setTimeline([...timeline, { fecha: nuevoHitoFecha, hito: nuevoHitoTexto.trim() }]);
    setNuevoHitoTexto('');
  };

  const handleRemoveHito = (idx: number) => {
    setTimeline(timeline.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !resumenContexto.trim()) {
      setError('Por favor completa el Título y el Resumen de Contexto.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        titulo,
        area_id: areaId,
        estado,
        resumen_contexto: resumenContexto,
        actores_clave: actoresClave,
        timeline,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error al guardar dossier');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-bold text-slate-800">
              {dossierAEditar ? `Editar Dossier: ${dossierAEditar.id}` : 'Nuevo Dossier de Investigación'}
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
              Título del Dossier / Caso *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Licitación del Transporte Urbano Mi Bus y Subsidios"
              value={titulo || ''}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Área Temática *
              </label>
              <select
                value={areaId || 'gestion-publica'}
                onChange={(e) => setAreaId(e.target.value as AreaId)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {AREAS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Estado del Seguimiento *
              </label>
              <select
                value={estado || 'activo'}
                onChange={(e) => setEstado(e.target.value as EstadoDossier)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="activo">Activo (En desarrollo activo)</option>
                <option value="en_seguimiento">En Seguimiento (Latente)</option>
                <option value="resuelto">Resuelto / Concluido</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Resumen de Contexto *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Marco histórico y antecedentes mínimos necesarios para entender el conflicto o tema..."
              value={resumenContexto || ''}
              onChange={(e) => setResumenContexto(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          {/* Actores Clave */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              Actores Clave Vinculados
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre o entidad (ej: Walter Cortés, Concejo Deliberante, UTA Río Negro)"
                value={nuevoActor || ''}
                onChange={(e) => setNuevoActor(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
              <button
                type="button"
                onClick={handleAddActor}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900"
              >
                Agregar
              </button>
            </div>

            {actoresClave.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {actoresClave.map((actor) => (
                  <span
                    key={actor}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-white border border-slate-200 text-slate-700 font-medium"
                  >
                    {actor}
                    <button
                      type="button"
                      onClick={() => handleRemoveActor(actor)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Timeline Dinámico de Hitos */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-800" />
              <span>Línea de Tiempo Dinámica (Hitos Clave)</span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="date"
                value={nuevoHitoFecha || ''}
                onChange={(e) => setNuevoHitoFecha(e.target.value)}
                className="sm:w-40 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
              <input
                type="text"
                placeholder="Descripción del hito (ej: Presentación del proyecto en Comisión legislativa)"
                value={nuevoHitoTexto || ''}
                onChange={(e) => setNuevoHitoTexto(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
              <button
                type="button"
                onClick={handleAddHito}
                className="px-3 py-1.5 bg-blue-900 text-white text-xs font-medium rounded-lg hover:bg-blue-800 flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Hito
              </button>
            </div>

            {timeline.length > 0 ? (
              <div className="space-y-2 pt-2">
                {timeline.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs gap-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-blue-900 font-bold shrink-0">{item.fecha}:</span>
                      <span className="text-slate-700">{item.hito}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveHito(idx)}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No hay hitos registrados en este dossier.</p>
            )}
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
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando en Firestore...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Dossier
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
