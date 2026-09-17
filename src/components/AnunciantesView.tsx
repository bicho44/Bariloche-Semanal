import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  Eye,
  AlertCircle,
  RefreshCw,
  LayoutTemplate,
  X,
} from 'lucide-react';
import { Anunciante } from '../types/index.js';
import { AnuncianteModal } from './AnuncianteModal.js';

const DEFAULT_BANNER_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='50' viewBox='0 0 120 50' fill='%23f1f5f9'%3E%3Crect width='100%25' height='100%25' fill='%23f8fafc' stroke='%23cbd5e1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' font-weight='bold' fill='%2394a3b8'%3EBANNER%3C/text%3E%3C/svg%3E";

export const AnunciantesView: React.FC = () => {
  const [anunciantes, setAnunciantes] = useState<Anunciante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [anuncianteAEditar, setAnuncianteAEditar] = useState<Anunciante | null>(null);

  // Pre-footer preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [compiledHtml, setCompiledHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchAnunciantes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/anunciantes');
      if (!res.ok) throw new Error('Error al cargar auspiciantes');
      const data = await res.json();
      setAnunciantes(data || []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnunciantes();
  }, [fetchAnunciantes]);

  const handleToggleActivo = async (item: Anunciante) => {
    const nuevoEstado = !item.activo;
    try {
      const res = await fetch(`/api/anunciantes/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado }),
      });
      if (!res.ok) throw new Error('Error al actualizar estado');
      setAnunciantes((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, activo: nuevoEstado } : a))
      );
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error: ${errorObj.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`¿Eliminar el auspiciante '${id}'?`)) return;
    try {
      const res = await fetch(`/api/anunciantes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setAnunciantes((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error: ${errorObj.message}`);
    }
  };

  const handleSave = async (datos: Partial<Anunciante>) => {
    if (anuncianteAEditar) {
      const res = await fetch(`/api/anunciantes/${encodeURIComponent(anuncianteAEditar.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.detalle || 'Error al actualizar auspiciante');
      }
    } else {
      const res = await fetch('/api/anunciantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.detalle || 'Error al crear auspiciante');
      }
    }
    await fetchAnunciantes();
  };

  const handleOpenPreview = async () => {
    setLoadingPreview(true);
    setPreviewOpen(true);
    try {
      const res = await fetch('/api/anunciantes/compilado/pre-footer');
      if (!res.ok) throw new Error('Error al compilar bloque pre-footer');
      const data = await res.json();
      setCompiledHtml(data.html || '<p>Sin auspiciantes activos para el newsletter</p>');
    } catch (err: unknown) {
      const errorObj = err as Error;
      setCompiledHtml(`<p style="color:red">Error: ${errorObj.message}</p>`);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Auspiciantes y Banners Publicitarios
          </h1>
          <p className="text-xs text-slate-500">
            Pauta institucional y publicitaria en colección <code className="text-blue-700 font-mono">anunciantes</code>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenPreview}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-2xs cursor-pointer"
            title="Previsualizar cómo se compila el bloque de auspiciantes en el newsletter"
          >
            <LayoutTemplate className="w-4 h-4 text-blue-800" />
            <span>Ver Bloque Newsletter</span>
          </button>
          <button
            onClick={() => fetchAnunciantes()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setAnuncianteAEditar(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Auspiciante</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-800 animate-spin" />
            <p className="text-xs text-slate-500">Cargando auspiciantes desde Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : anunciantes.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <Megaphone className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Sin auspiciantes activos</h3>
              <p className="text-xs text-slate-500 mt-1">
                La colección <code className="font-mono text-blue-700">anunciantes</code> no tiene marcas cargadas. Carga tu primer patrocinador institucional o privado.
              </p>
            </div>
            <button
              onClick={() => {
                setAnuncianteAEditar(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primer Auspiciante</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-28">Banner</th>
                  <th className="py-3 px-4">Marca / Empresa</th>
                  <th className="py-3 px-4 w-32">Destino</th>
                  <th className="py-3 px-4 w-28">Ubicación</th>
                  <th className="py-3 px-4 w-24 text-center">Prioridad</th>
                  <th className="py-3 px-4 w-28 text-center">Impresiones</th>
                  <th className="py-3 px-4 w-28 text-center">Estado</th>
                  <th className="py-3 px-4 w-24 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {anunciantes.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="w-24 h-10 rounded bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                        <img
                          src={a.banner_url || DEFAULT_BANNER_FALLBACK}
                          alt={a.texto_alt || a.nombre || 'Banner'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = DEFAULT_BANNER_FALLBACK;
                          }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{a.nombre}</div>
                      <a
                        href={a.enlace_click}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 truncate max-w-xs font-mono mt-0.5"
                      >
                        <span>{a.enlace_click}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {a.destino}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {a.ubicacion}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {a.prioridad}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {a.impresiones || 0}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActivo(a)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          a.activo
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            a.activo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        <span>{a.activo ? 'Activo' : 'Pausado'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setAnuncianteAEditar(a);
                            setModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
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

      {/* Pre-Footer Newsletter Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Compilador de Bloque de Auspiciantes (Pre-Footer)
                </h3>
                <p className="text-xs text-slate-500">
                  Renderizado responsivo para clientes de correo (HTML compatible con Gmail, Apple Mail, Outlook)
                </p>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50">
              {loadingPreview ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-900 mx-auto" />
                  <p className="text-xs text-slate-500 mt-2">Compilando layout responsive...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Vista previa renderizada:
                    </div>
                    <div
                      dangerouslySetInnerHTML={{ __html: compiledHtml }}
                      className="border border-slate-100 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Código HTML Compilado:
                    </div>
                    <textarea
                      readOnly
                      rows={6}
                      value={compiledHtml}
                      className="w-full text-xs font-mono p-3 bg-slate-900 text-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end rounded-b-2xl">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <AnuncianteModal
        isOpen={modalOpen}
        anuncianteAEditar={anuncianteAEditar}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};
