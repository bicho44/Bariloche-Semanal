import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderArchive,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Dossier, EstadoDossier } from '../types/index.js';
import { DossierModal } from './DossierModal.js';

interface DossiersViewProps {
  onRefreshDossiers?: () => void;
}

export const DossiersView: React.FC<DossiersViewProps> = ({ onRefreshDossiers }) => {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [dossierAEditar, setDossierAEditar] = useState<Dossier | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [updatingStatusSlug, setUpdatingStatusSlug] = useState<string | null>(null);

  const fetchDossiers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dossiers', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error('Error al cargar dossiers');
      const data = await res.json();
      setDossiers(data || []);
      if (onRefreshDossiers) onRefreshDossiers();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
    } finally {
      setLoading(false);
    }
  }, [onRefreshDossiers]);

  useEffect(() => {
    fetchDossiers();
  }, [fetchDossiers]);

  const handleCreate = () => {
    setDossierAEditar(null);
    setModalOpen(true);
  };

  const handleEdit = (dossier: Dossier) => {
    setDossierAEditar(dossier);
    setModalOpen(true);
  };

  const handleQuickStatusChange = async (slug: string, newStatus: EstadoDossier) => {
    setUpdatingStatusSlug(slug);
    try {
      const res = await fetch(`/api/dossiers/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus }),
      });
      if (!res.ok) throw new Error('Error al actualizar estado del dossier');
      const actualizado = await res.json();
      setDossiers((prev) => prev.map((d) => (d.id === actualizado.id ? actualizado : d)));
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error al cambiar estado: ${errorObj.message}`);
    } finally {
      setUpdatingStatusSlug(null);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm(`¿Deseas eliminar permanentemente el dossier '${slug}'?`)) return;

    setDeletingSlug(slug);
    try {
      const res = await fetch(`/api/dossiers/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar dossier');
      setDossiers((prev) => prev.filter((d) => d.id !== slug));
      if (onRefreshDossiers) onRefreshDossiers();
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error: ${errorObj.message}`);
    } finally {
      setDeletingSlug(null);
    }
  };

  const handleSave = async (datos: Partial<Dossier>) => {
    if (dossierAEditar) {
      const res = await fetch(`/api/dossiers/${encodeURIComponent(dossierAEditar.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al actualizar dossier');
      const actualizado: Dossier = await res.json();
      setDossiers((prev) => prev.map((d) => (d.id === actualizado.id ? actualizado : d)));
    } else {
      const res = await fetch('/api/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al crear dossier');
      const nuevo: Dossier = await res.json();
      setDossiers((prev) => [nuevo, ...prev]);
    }
    fetchDossiers();
    if (onRefreshDossiers) onRefreshDossiers();
  };

  const toggleExpand = (slug: string) => {
    setExpandedSlug(expandedSlug === slug ? null : slug);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Temas en Seguimiento
          </h1>
          <p className="text-xs text-slate-500">
            Seguimiento de conflictos y temas longitudinales en colección Firestore <code className="text-blue-700 font-mono">dossiers</code>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchDossiers()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 cursor-pointer"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Seguimiento</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-800 animate-spin" />
            <p className="text-xs text-slate-500">Consultando seguimientos en Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : dossiers.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-900 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100">
              <FolderArchive className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No hay temas en seguimiento activos</h3>
              <p className="text-xs text-slate-500 mt-1">
                Añade el primer tema en seguimiento para agrupar noticias longitudinales, ordenar hitos temporales y generar análisis periodísticos.
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primer Seguimiento</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {dossiers.map((d) => {
              const isExpanded = expandedSlug === d.id;
              const hasCronica = d.cronica_html && d.cronica_html.trim().length > 0;

              return (
                <div key={d.id} className="p-5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                          {d.id}
                        </span>

                        {/* Selector Rápido de Estado */}
                        <div className="inline-flex items-center">
                          <select
                            value={d.estado}
                            disabled={updatingStatusSlug === d.id}
                            onChange={(e) => handleQuickStatusChange(d.id, e.target.value as EstadoDossier)}
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border cursor-pointer ${
                              d.estado === 'activo'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : d.estado === 'en_seguimiento'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                            title="Cambiar estado en Firestore directamente"
                          >
                            <option value="activo">Activo</option>
                            <option value="en_seguimiento">En Seguimiento</option>
                            <option value="resuelto">Resuelto</option>
                          </select>
                        </div>

                        <span className="text-[11px] font-medium text-slate-500">
                          Área: <span className="font-semibold text-slate-700">{d.area_id}</span>
                        </span>

                        {/* Indicador de Crónica de Fondo */}
                        {hasCronica ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-blue-700" />
                            <span>Crónica redactada ({d.fecha_ultima_cronica || 'Reciente'})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>Sin crónica</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">{d.titulo}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 max-w-3xl">
                        {d.resumen_contexto}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                      <button
                        onClick={() => toggleExpand(d.id)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                        title="Ver Timeline, Crónica y Actores"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleEdit(d)}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Editar Seguimiento"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        disabled={deletingSlug === d.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Eliminar Seguimiento"
                      >
                        {deletingSlug === d.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Detalle Desplegable: Actores Clave, Timeline y Crónica */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 bg-slate-50 p-4 rounded-xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Actores Clave ({d.actores_clave?.length || 0})
                          </h4>
                          {d.actores_clave && d.actores_clave.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {d.actores_clave.map((a, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-700 font-medium"
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No se especificaron actores.</p>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-800" />
                            <span>Timeline de Hitos ({d.timeline?.length || 0})</span>
                          </h4>
                          {d.timeline && d.timeline.length > 0 ? (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                              {d.timeline.map((h, i) => (
                                <div
                                  key={i}
                                  className="text-xs bg-white p-2 rounded border border-slate-200 flex items-start justify-between gap-2"
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="font-mono text-blue-800 font-bold shrink-0">{h.fecha}:</span>
                                    <span className="text-slate-700">{h.hito}</span>
                                  </div>
                                  {h.fuente_url && (
                                    <a
                                      href={h.fuente_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
                                      title="Abrir fuente externa"
                                    >
                                      Fuente <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Sin hitos registrados.</p>
                          )}
                        </div>
                      </div>

                      {/* Sección Crónica Periodística de Fondo */}
                      <div className="border-t border-slate-200 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-800" />
                            <span>Crónica Periodística de Fondo</span>
                          </h4>
                          {d.fecha_ultima_cronica && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              Actualizada el: {d.fecha_ultima_cronica}
                            </span>
                          )}
                        </div>

                        {hasCronica ? (
                          <div className="bg-white p-4 rounded-lg border border-slate-200 max-h-64 overflow-y-auto">
                            <div
                              dangerouslySetInnerHTML={{ __html: d.cronica_html! }}
                              className="prose prose-xs max-w-none space-y-2 leading-relaxed text-slate-800"
                            />
                          </div>
                        ) : (
                          <div className="bg-white p-3 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400 italic">
                            Este tema aún no posee una crónica de fondo redactada. Haz clic en "Editar Seguimiento" para redactarla con el editor HTML.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DossierModal
        isOpen={modalOpen}
        dossierAEditar={dossierAEditar}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};
