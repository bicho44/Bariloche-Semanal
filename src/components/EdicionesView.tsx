import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Plus,
  Edit2,
  Trash2,
  Send,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  X,
} from 'lucide-react';
import { EdicionNewsletter, Dossier } from '../types/index.js';
import { EdicionModal } from './EdicionModal.js';

interface EdicionesViewProps {
  dossiers: Dossier[];
}

export const EdicionesView: React.FC<EdicionesViewProps> = ({ dossiers }) => {
  const [ediciones, setEdiciones] = useState<EdicionNewsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [edicionAEditar, setEdicionAEditar] = useState<EdicionNewsletter | null>(null);

  // Visor HTML Modal
  const [visorEdicion, setVisorEdicion] = useState<EdicionNewsletter | null>(null);
  const [despachandoId, setDespachandoId] = useState<string | null>(null);

  const fetchEdiciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ediciones');
      if (!res.ok) throw new Error('Error al cargar ediciones');
      const data = await res.json();
      setEdiciones(data || []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEdiciones();
  }, [fetchEdiciones]);

  const handleDespachoManual = async (edicion: EdicionNewsletter) => {
    if (
      !window.confirm(
        `¿Confirmas el despacho manual de la edición '${edicion.id}'? Esto actualizará su estado a 'enviado'.`
      )
    ) {
      return;
    }

    setDespachandoId(edicion.id);
    try {
      const res = await fetch(`/api/ediciones/${encodeURIComponent(edicion.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'enviado',
          despacho: {
            destinatarios_totales: edicion.despacho?.destinatarios_totales || 2500,
            entregados: edicion.despacho?.entregados || 2480,
            aperturas_unicas: edicion.despacho?.aperturas_unicas || 0,
            tasa_apertura: 0,
            hora_despacho: new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) throw new Error('Error al despachar edición');
      fetchEdiciones();
      alert(`¡Edición '${edicion.id}' despachada con éxito!`);
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error: ${errorObj.message}`);
    } finally {
      setDespachandoId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`¿Eliminar la edición '${id}'?`)) return;
    try {
      const res = await fetch(`/api/ediciones/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar edición');
      setEdiciones((prev) => prev.filter((e) => e.id !== id));
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error: ${errorObj.message}`);
    }
  };

  const handleSave = async (datos: Partial<EdicionNewsletter>) => {
    if (edicionAEditar) {
      const res = await fetch(`/api/ediciones/${encodeURIComponent(edicionAEditar.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al actualizar edición');
    } else {
      const res = await fetch('/api/ediciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al crear edición');
    }
    fetchEdiciones();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Archivo y Emisión de Newsletters
          </h1>
          <p className="text-xs text-slate-500">
            Ediciones semanales compiladas en colección <code className="text-blue-700 font-mono">ediciones</code>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchEdiciones()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setEdicionAEditar(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Edición</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-800 animate-spin" />
            <p className="text-xs text-slate-500">Cargando ediciones desde Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : ediciones.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No hay ediciones publicadas</h3>
              <p className="text-xs text-slate-500 mt-1">
                La colección <code className="font-mono text-blue-700">ediciones</code> está vacía. Crea el borrador de tu primer envío semanal.
              </p>
            </div>
            <button
              onClick={() => {
                setEdicionAEditar(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primera Edición</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {ediciones.map((ed) => (
              <div key={ed.id} className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200">
                      {ed.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        ed.estado === 'enviado' || ed.estado === 'enviado_a_suscriptores'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ed.estado === 'programado'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ed.estado === 'enviado_a_suscriptores' ? 'Enviado' : ed.estado}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Publicado: {ed.fecha_publicacion}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{ed.asunto}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl">
                    {typeof ed.hero_resumen === 'string'
                      ? ed.hero_resumen
                      : typeof ed.hero_resumen === 'object' && ed.hero_resumen !== null
                      ? ed.hero_resumen.titulo || ''
                      : ''}
                  </p>

                  {ed.despacho?.hora_despacho && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono pt-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>Despachado: {new Date(ed.despacho.hora_despacho).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => setVisorEdicion(ed)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Ver contenido HTML"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Ver HTML</span>
                  </button>

                  <button
                    onClick={() => handleDespachoManual(ed)}
                    disabled={despachandoId === ed.id || ed.estado === 'enviado' || ed.estado === 'enviado_a_suscriptores'}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-2xs ${
                      ed.estado === 'enviado' || ed.estado === 'enviado_a_suscriptores'
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                    }`}
                    title="Despachar manualmente este newsletter"
                  >
                    {despachandoId === ed.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{ed.estado === 'enviado' || ed.estado === 'enviado_a_suscriptores' ? 'Despachado' : 'Despacho Manual'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEdicionAEditar(ed);
                      setModalOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    title="Editar Edición"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(ed.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Eliminar Edición"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visor HTML Modal */}
      {visorEdicion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Visor Web de Edición: {visorEdicion.id}
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xl">{visorEdicion.asunto}</p>
              </div>
              <button
                onClick={() => setVisorEdicion(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/60">
              {visorEdicion.html_content ? (
                <div
                  dangerouslySetInnerHTML={{ __html: visorEdicion.html_content }}
                  className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-2xl mx-auto"
                />
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Esta edición aún no cuenta con contenido HTML compilado.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end rounded-b-2xl">
              <button
                onClick={() => setVisorEdicion(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      <EdicionModal
        isOpen={modalOpen}
        edicionAEditar={edicionAEditar}
        dossiers={dossiers}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};
