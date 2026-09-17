import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Fuente } from '../types/index.js';
import { FuenteModal } from './FuenteModal.js';

interface FuentesViewProps {
  onRefreshFuentes?: () => void;
}

export const FuentesView: React.FC<FuentesViewProps> = ({ onRefreshFuentes }) => {
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fuenteAEditar, setFuenteAEditar] = useState<Fuente | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchFuentes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fuentes');
      if (!res.ok) throw new Error('Error al consultar fuentes');
      const data = await res.json();
      setFuentes(data || []);
      if (onRefreshFuentes) onRefreshFuentes();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
    } finally {
      setLoading(false);
    }
  }, [onRefreshFuentes]);

  useEffect(() => {
    fetchFuentes();
  }, [fetchFuentes]);

  const handleToggleActivo = async (fuente: Fuente) => {
    const nuevoEstado = !fuente.activo;
    setUpdatingId(fuente.id);
    try {
      const res = await fetch(`/api/fuentes/${encodeURIComponent(fuente.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado }),
      });
      if (!res.ok) throw new Error('Error al actualizar estado');
      setFuentes((prev) =>
        prev.map((f) => (f.id === fuente.id ? { ...f, activo: nuevoEstado } : f))
      );
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error: ${errorObj.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleChangePrioridad = async (fuente: Fuente, nuevaPrioridad: 1 | 2) => {
    setUpdatingId(fuente.id);
    try {
      const res = await fetch(`/api/fuentes/${encodeURIComponent(fuente.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prioridad: nuevaPrioridad }),
      });
      if (!res.ok) throw new Error('Error al actualizar prioridad');
      setFuentes((prev) =>
        prev.map((f) => (f.id === fuente.id ? { ...f, prioridad: nuevaPrioridad } : f))
      );
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error: ${errorObj.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`¿Eliminar la fuente '${id}'?`)) return;

    try {
      const res = await fetch(`/api/fuentes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar fuente');
      setFuentes((prev) => prev.filter((f) => f.id !== id));
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error: ${errorObj.message}`);
    }
  };

  const handleSave = async (datos: Partial<Fuente>) => {
    if (fuenteAEditar) {
      const res = await fetch(`/api/fuentes/${encodeURIComponent(fuenteAEditar.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al actualizar fuente');
    } else {
      const res = await fetch('/api/fuentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al dar de alta fuente');
    }
    fetchFuentes();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Fuentes de Información y Medios
          </h1>
          <p className="text-xs text-slate-500">
            Monitoreo periodístico de Bariloche en colección <code className="text-blue-700 font-mono">fuentes</code>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchFuentes()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setFuenteAEditar(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Fuente</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-800 animate-spin" />
            <p className="text-xs text-slate-500">Consultando fuentes en Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : fuentes.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <Radio className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No hay fuentes registradas</h3>
              <p className="text-xs text-slate-500 mt-1">
                La colección <code className="font-mono text-blue-700">fuentes</code> en Firestore está vacía.
              </p>
            </div>
            <button
              onClick={() => {
                setFuenteAEditar(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primera Fuente</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-36">Identificador</th>
                  <th className="py-3 px-4">Nombre del Medio</th>
                  <th className="py-3 px-4 w-36">Tipo</th>
                  <th className="py-3 px-4 w-32">Prioridad</th>
                  <th className="py-3 px-4">URL Base</th>
                  <th className="py-3 px-4 w-28 text-center">Estado</th>
                  <th className="py-3 px-4 w-24 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {fuentes.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 font-semibold">{f.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{f.nombre}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {f.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={f.prioridad}
                        onChange={(e) => handleChangePrioridad(f, Number(e.target.value) as 1 | 2)}
                        disabled={updatingId === f.id}
                        className="px-2 py-1 text-xs border border-slate-300 rounded bg-white font-semibold text-slate-800"
                      >
                        <option value={1}>Prioridad 1</option>
                        <option value={2}>Prioridad 2</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={f.url_base}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <span className="truncate max-w-xs">{f.url_base}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActivo(f)}
                        disabled={updatingId === f.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          f.activo
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            f.activo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        <span>{f.activo ? 'Activo' : 'Pausado'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setFuenteAEditar(f);
                            setModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FuenteModal
        isOpen={modalOpen}
        fuenteAEditar={fuenteAEditar}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};
