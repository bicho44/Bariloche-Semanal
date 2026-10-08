import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Search,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Filter,
  DollarSign,
  Star,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { EventoAgenda, CategoriaAgenda, TipoAccesoAgenda, EstadoEventoAgenda } from '../types/index.js';
import { EventoModal } from './EventoModal.js';
import { handleImageErrorWithProxy, DEFAULT_AGENDA_FALLBACK } from '../utils/image.js';

const CATEGORIAS_CONFIG: Record<CategoriaAgenda, { label: string; badge: string }> = {
  cultura: {
    label: 'Cultura',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  deportes: {
    label: 'Deportes',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  capacitacion: {
    label: 'Capacitación',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  institucional: {
    label: 'Institucional',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

const ACCESO_CONFIG: Record<TipoAccesoAgenda, { label: string; badge: string }> = {
  gratuito: {
    label: 'Gratuito',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  arancelado: {
    label: 'Arancelado',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  con_inscripcion: {
    label: 'Con Inscripción',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

const ESTADOS_CONFIG: Record<EstadoEventoAgenda, { label: string; badge: string }> = {
  vigente: {
    label: 'Vigente',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  hoy: {
    label: 'Hoy',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
  },
  concluido: {
    label: 'Concluido',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
  },
};

export const AgendaView: React.FC = () => {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [soloVigentes, setSoloVigentes] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [eventoAEditar, setEventoAEditar] = useState<EventoAgenda | null>(null);

  // Modal de confirmación para eliminar
  const [eventoAEliminar, setEventoAEliminar] = useState<EventoAgenda | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Acción rápida concluyendo
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (soloVigentes) params.append('solo_vigentes', 'true');
      else params.append('todos', 'true');
      if (categoriaFiltro !== 'todas') params.append('categoria', categoriaFiltro);

      const res = await fetch(`/api/agenda?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error('Error al consultar agenda de Firestore');
      const data = await res.json();
      setEventos(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error al conectar con la agenda');
    } finally {
      setLoading(false);
    }
  }, [soloVigentes, categoriaFiltro]);

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

  // Marcar como concluido rápidamente
  const handleMarcarConcluido = async (evento: EventoAgenda) => {
    setMarkingId(evento.id);
    try {
      const nuevoEstado: EstadoEventoAgenda = evento.estado === 'concluido' ? 'vigente' : 'concluido';
      const res = await fetch(`/api/agenda/${encodeURIComponent(evento.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error('Error al actualizar estado en Firestore');
      const actualizado: EventoAgenda = await res.json();
      setEventos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(`No se pudo actualizar el evento: ${errorObj.message}`);
    } finally {
      setMarkingId(null);
    }
  };

  // Confirmar eliminación en modal UI
  const handleConfirmDelete = async () => {
    if (!eventoAEliminar) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agenda/${encodeURIComponent(eventoAEliminar.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar evento en Firestore');
      setEventos((prev) => prev.filter((e) => e.id !== eventoAEliminar.id));
      setEventoAEliminar(null);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(`Error al eliminar evento: ${errorObj.message}`);
    } finally {
      setDeleting(false);
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
      const actualizado: EventoAgenda = await res.json();
      setEventos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
    } else {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al crear evento');
      const nuevo: EventoAgenda = await res.json();
      setEventos((prev) => [nuevo, ...prev]);
    }
    fetchEventos();
  };

  // Filtrado en memoria por búsqueda de texto
  const eventosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return eventos;
    const q = busqueda.toLowerCase().trim();
    return eventos.filter(
      (ev) =>
        ev.titulo.toLowerCase().includes(q) ||
        ev.lugar.toLowerCase().includes(q) ||
        ev.descripcion_corta.toLowerCase().includes(q) ||
        (ev.arancel_estimado && ev.arancel_estimado.toLowerCase().includes(q))
    );
  }, [eventos, busqueda]);

  // Conteo de métricas
  const conteo = useMemo(() => {
    const vigentes = eventos.filter((e) => e.estado !== 'concluido').length;
    const concluidos = eventos.filter((e) => e.estado === 'concluido').length;
    return { vigentes, concluidos, total: eventos.length };
  }, [eventos]);

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              <Calendar className="w-3 h-3 text-blue-700" />
              Colección Firestore: <code className="font-mono">agenda</code>
            </span>
            <span className="text-xs text-slate-400">
              ({conteo.vigentes} vigentes • {conteo.concluidos} concluidos)
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Gestión de Agenda Cultural y Deportiva
          </h1>
          <p className="text-xs md:text-sm text-slate-600 max-w-2xl leading-relaxed mt-0.5">
            Administra la cartelera barilochense en tiempo real. Organiza espectáculos, torneos, charlas y eventos institucionales con soporte para flyers en Storage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchEventos()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refrescar desde Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-700' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-xs transition-all cursor-pointer hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Switch de Vigentes */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Pills de Categoría */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setCategoriaFiltro('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                categoriaFiltro === 'todas'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas las Categorías
            </button>
            {(Object.keys(CATEGORIAS_CONFIG) as CategoriaAgenda[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  categoriaFiltro === cat
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {CATEGORIAS_CONFIG[cat].label}
              </button>
            ))}
          </div>

          {/* Switch: Solo Vigentes vs Todos / Concluidos */}
          <div className="flex items-center gap-2 shrink-0 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSoloVigentes(false)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !soloVigentes
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos / Concluidos
            </button>
            <button
              onClick={() => setSoloVigentes(true)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                soloVigentes
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Solo Vigentes
            </button>
          </div>
        </div>

        {/* Buscador de texto */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar evento por título, lugar físico o arancel..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Vista de Tabla/Listado */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Consultando eventos en Firestore...</p>
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No se encontraron eventos</h3>
              <p className="text-xs text-slate-500 mt-1">
                {busqueda || categoriaFiltro !== 'todas' || soloVigentes
                  ? 'No hay actividades que coincidan con los filtros aplicados.'
                  : 'Aún no se han registrado eventos en la colección agenda.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {(busqueda || categoriaFiltro !== 'todas' || soloVigentes) && (
                <button
                  onClick={() => {
                    setBusqueda('');
                    setCategoriaFiltro('todas');
                    setSoloVigentes(false);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Restablecer Filtros
                </button>
              )}
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Evento</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-3">Horario</th>
                  <th className="py-3.5 px-4">Evento / Flyer</th>
                  <th className="py-3.5 px-3">Categoría</th>
                  <th className="py-3.5 px-3">Lugar</th>
                  <th className="py-3.5 px-3">Tipo de Acceso</th>
                  <th className="py-3.5 px-3">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {eventosFiltrados.map((ev) => {
                  const estadoActual = (ev.estado || 'vigente') as EstadoEventoAgenda;
                  const catCfg = CATEGORIAS_CONFIG[ev.categoria] || { label: ev.categoria, badge: 'bg-slate-100 text-slate-700 border-slate-200' };
                  const accCfg = ACCESO_CONFIG[ev.tipo_acceso] || { label: ev.tipo_acceso, badge: 'bg-slate-100 text-slate-700 border-slate-200' };
                  const estCfg = ESTADOS_CONFIG[estadoActual] || ESTADOS_CONFIG.vigente;

                  const esMismoDia = !ev.fecha_fin || ev.fecha_fin === ev.fecha_inicio;

                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        estadoActual === 'concluido' ? 'opacity-70 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* 1. Fecha */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-800">
                          {ev.fecha_inicio}
                        </div>
                        {!esMismoDia && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            al {ev.fecha_fin}
                          </div>
                        )}
                      </td>

                      {/* 2. Horario */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-600 font-medium font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ev.horario || '—'}</span>
                        </div>
                      </td>

                      {/* 3. Título + Flyer miniatura + Descripción */}
                      <td className="py-3 px-4 max-w-xs md:max-w-md">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                            {ev.imagen_url ? (
                              <img
                                src={ev.imagen_url}
                                referrerPolicy="no-referrer"
                                alt={ev.titulo}
                                className="w-full h-full object-cover"
                                onError={(e) => handleImageErrorWithProxy(e, ev.imagen_url, DEFAULT_AGENDA_FALLBACK)}
                              />
                            ) : (
                              <div className="text-slate-400 text-[10px] flex flex-col items-center">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs hover:text-blue-900 transition-colors">
                                {ev.titulo}
                              </span>
                              {ev.destacado && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Star className="w-2.5 h-2.5 fill-amber-500" /> Destacado
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                              {ev.descripcion_corta}
                            </p>
                            {ev.url_info && (
                              <a
                                href={ev.url_info}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[11px] text-blue-700 hover:underline font-medium"
                              >
                                Info / Entradas <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Categoría */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${catCfg.badge}`}>
                          {catCfg.label}
                        </span>
                      </td>

                      {/* 5. Lugar */}
                      <td className="py-3 px-3 max-w-[160px]">
                        <div className="flex items-center gap-1 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate" title={ev.lugar}>
                            {ev.lugar}
                          </span>
                        </div>
                      </td>

                      {/* 6. Tipo de Acceso & Arancel */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${accCfg.badge}`}>
                            {accCfg.label}
                          </span>
                          {ev.arancel_estimado && (
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-0.5">
                              <span>{ev.arancel_estimado}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. Estado */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${estCfg.badge}`}>
                          {estCfg.label}
                        </span>
                      </td>

                      {/* 8. Botones de Acción */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón rápido: Marcar como Concluido */}
                          <button
                            onClick={() => handleMarcarConcluido(ev)}
                            disabled={markingId === ev.id}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              estadoActual === 'concluido'
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                            }`}
                            title={
                              estadoActual === 'concluido'
                                ? 'Reactivar evento (marcar como vigente)'
                                : 'Marcar evento como concluido'
                            }
                          >
                            {markingId === ev.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : estadoActual === 'concluido' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>

                          {/* Botón Editar */}
                          <button
                            onClick={() => handleEdit(ev)}
                            className="p-1.5 text-slate-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                            title="Editar evento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Eliminar con modal UI */}
                          <button
                            onClick={() => setEventoAEliminar(ev)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            title="Eliminar de Firestore"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Edición y Alta */}
      <EventoModal
        isOpen={modalOpen}
        eventoAEditar={eventoAEditar}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEvento}
      />

      {/* Modal de Confirmación de Eliminación */}
      {eventoAEliminar && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                ¿Eliminar evento de la cartelera?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta acción eliminará de forma irreversible el documento <code className="font-mono text-red-700 bg-red-50 px-1 py-0.5 rounded">{eventoAEliminar.id}</code> de Firestore.
              </p>
              <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 font-semibold">
                {eventoAEliminar.titulo}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setEventoAEliminar(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Confirmar Eliminación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
