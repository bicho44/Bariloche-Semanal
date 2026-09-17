import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { EventoAgenda } from '../types/index.js';
import { EventoModal } from './EventoModal.js';

export const AgendaView: React.FC = () => {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarTodos, setMostrarTodos] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [eventoAEditar, setEventoAEditar] = useState<EventoAgenda | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agenda?todos=${mostrarTodos}`);
      if (!res.ok) throw new Error('Error al consultar agenda de Firestore');
      const data = await res.json();
      setEventos(data || []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
    } finally {
      setLoading(false);
    }
  }, [mostrarTodos]);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  const handleCreate = () => {
    setEventoAEditar(null);
    setModalOpen(true);
  };

  const handleEdit = (evento: EventoAgenda) => {
    setEventoAEditar(evento);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`¿Eliminar el evento '${id}' de la cartelera?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/agenda/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar evento');
      setEventos((prev) => prev.filter((e) => e.id !== id));
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error al eliminar: ${errorObj.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveEvento = async (datos: Partial<EventoAgenda>) => {
    if (eventoAEditar) {
      const res = await fetch(`/api/agenda/${encodeURIComponent(eventoAEditar.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al actualizar evento');
    } else {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al crear evento');
    }
    fetchEventos();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cartelera y Agenda Bariloche</h1>
          <p className="text-xs text-slate-500">
            Eventos culturales, deportivos e institucionales en colección <code className="text-blue-700 font-mono">agenda</code>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
            <button
              onClick={() => setMostrarTodos(false)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                !mostrarTodos ? 'bg-white text-blue-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Próximos
            </button>
            <button
              onClick={() => setMostrarTodos(true)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                mostrarTodos ? 'bg-white text-blue-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Todos (Histórico)
            </button>
          </div>
          <button
            onClick={() => fetchEventos()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* Grid or Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-800 animate-spin" />
            <p className="text-xs text-slate-500">Cargando cartelera desde Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : eventos.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-900 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No hay eventos en la cartelera</h3>
              <p className="text-xs text-slate-500 mt-1">
                La colección <code className="font-mono text-blue-700">agenda</code> no registra actividades. Comienza agregando el primer evento barilochense.
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primer Evento</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {eventos.map((ev) => (
              <div key={ev.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row gap-4 items-start">
                {/* Flyer */}
                <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                  {ev.imagen_url ? (
                    <img
                      src={ev.imagen_url}
                      alt={ev.titulo}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='120' viewBox='0 0 100 120' fill='%23f1f5f9'%3E%3Crect width='100%25' height='100%25' fill='%23f8fafc' stroke='%23cbd5e1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='11' fill='%2394a3b8'%3EFLYER%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-1 text-[10px]">
                      <ImageIcon className="w-6 h-6" />
                      <span>Sin flyer</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      {ev.categoria}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {ev.tipo_acceso}
                    </span>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {ev.fecha_inicio} {ev.fecha_fin && ev.fecha_fin !== ev.fecha_inicio ? `al ${ev.fecha_fin}` : ''}
                    </span>
                    {ev.horario && (
                      <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {ev.horario}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{ev.titulo}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{ev.descripcion_corta}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>{ev.lugar}</span>
                    </div>
                    {ev.url_info && (
                      <a
                        href={ev.url_info}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                      >
                        Más info <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleEdit(ev)}
                    className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                    title="Editar evento o flyer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ev.id)}
                    disabled={deletingId === ev.id}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                    title="Eliminar de cartelera"
                  >
                    {deletingId === ev.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EventoModal
        isOpen={modalOpen}
        eventoAEditar={eventoAEditar}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEvento}
      />
    </div>
  );
};
