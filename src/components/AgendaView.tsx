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
  Map,
  Ticket,
  Flame,
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [filtroVigencia, setFiltroVigencia] = useState<'todos' | 'vigentes' | 'vencidos'>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [eventoAEditar, setEventoAEditar] = useState<EventoAgenda | null>(null);

  // Modal de confirmación para eliminar
  const [eventoAEliminar, setEventoAEliminar] = useState<EventoAgenda | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal y acción de Purga de Vencidos
  const [showPurgaModal, setShowPurgaModal] = useState(false);
  const [purgando, setPurgando] = useState(false);

  // Acción rápida concluyendo
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // En /admin/agenda consultamos todos=true para poder gestionar tanto vigentes como vencidos
      params.append('todos', 'true');
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
  }, [categoriaFiltro]);

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
      setSuccessMessage('Evento eliminado exitosamente de Firestore');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(`Error al eliminar evento: ${errorObj.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Purgar eventos vencidos (fecha_fin < hoy)
  const handleConfirmPurgar = async () => {
    setPurgando(true);
    setError(null);
    try {
      const res = await fetch('/api/agenda/purgar-vencidos', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error al purgar eventos vencidos en Firestore');
      const data = await res.json();
      setShowPurgaModal(false);
      setSuccessMessage(`Se purgaron ${data.eliminados} eventos vencidos exitosamente.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchEventos();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(`Error al purgar eventos: ${errorObj.message}`);
    } finally {
      setPurgando(false);
    }
  };

  const handleSaveEvento = async (datos: Partial<EventoAgenda>) => {
    if (eventoAEditar) {
      const res = await fetch(`/api/agenda/${encodeURIComponent(eventoAEditar.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al actualizar evento');
      }
      const actualizado: EventoAgenda = await res.json();
      setEventos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
    } else {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al crear evento');
      }
      const nuevo: EventoAgenda = await res.json();
      setEventos((prev) => [nuevo, ...prev]);
    }
    fetchEventos();
  };

  // Filtrado de eventos considerando filtroVigencia y búsqueda de texto
  const eventosFiltrados = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0];
    let lista = eventos;

    if (filtroVigencia === 'vigentes') {
      lista = lista.filter((e) => {
        const fin = e.fecha_fin || e.fecha_inicio;
        return fin && fin >= hoy && e.estado !== 'concluido';
      });
    } else if (filtroVigencia === 'vencidos') {
      lista = lista.filter((e) => {
        const fin = e.fecha_fin || e.fecha_inicio;
        return !fin || fin < hoy || e.estado === 'concluido';
      });
    }

    if (!busqueda.trim()) return lista;
    const q = busqueda.toLowerCase().trim();
    return lista.filter(
      (ev) =>
        ev.titulo.toLowerCase().includes(q) ||
        ev.lugar.toLowerCase().includes(q) ||
        (ev.direccion && ev.direccion.toLowerCase().includes(q)) ||
        ev.descripcion_corta.toLowerCase().includes(q) ||
        (ev.arancel_estimado && ev.arancel_estimado.toLowerCase().includes(q))
    );
  }, [eventos, filtroVigencia, busqueda]);

  // Conteo de métricas
  const conteo = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0];
    const vigentes = eventos.filter((e) => {
      const fin = e.fecha_fin || e.fecha_inicio;
      return fin && fin >= hoy && e.estado !== 'concluido';
    }).length;
    const vencidos = eventos.length - vigentes;
    return { vigentes, vencidos, total: eventos.length };
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
            <span className="text-xs text-slate-500 font-medium">
              ({conteo.vigentes} vigentes • {conteo.vencidos} vencidos o concluidos)
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Gestión de Agenda Cultural y Deportiva
          </h1>
          <p className="text-xs md:text-sm text-slate-600 max-w-2xl leading-relaxed mt-0.5">
            Administra la cartelera de San Carlos de Bariloche. El filtro público de la API mantiene visibles los eventos multi-día mientras <code className="font-mono text-blue-900">fecha_fin &gt;= hoy</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => fetchEventos()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refrescar desde Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-700' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          {/* Botón Purgar Eventos Vencidos */}
          <button
            onClick={() => setShowPurgaModal(true)}
            disabled={conteo.vencidos === 0 || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            title="Eliminar masivamente eventos cuya fecha de fin ya expiró"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Purgar vencidos ({conteo.vencidos})</span>
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

      {/* Alertas de Éxito o Error */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 text-xs">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-semibold">
            Cerrar
          </button>
        </div>
      )}

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

          {/* Switch: Todos / Solo Vigentes / Solo Vencidos */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFiltroVigencia('todos')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filtroVigencia === 'todos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({conteo.total})
            </button>
            <button
              onClick={() => setFiltroVigencia('vigentes')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filtroVigencia === 'vigentes'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vigentes ({conteo.vigentes})
            </button>
            <button
              onClick={() => setFiltroVigencia('vencidos')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filtroVigencia === 'vencidos'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vencidos ({conteo.vencidos})
            </button>
          </div>
        </div>

        {/* Buscador de texto */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por título, lugar, dirección en Bariloche o arancel..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
          />
        </div>
      </div>

      {/* Vista de Tabla/Listado */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Consultando eventos en Firestore...</p>
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto px-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron eventos</h3>
            <p className="text-xs text-slate-500 mt-1">
              {busqueda
                ? 'No hay eventos que coincidan con el término de búsqueda.'
                : 'No hay eventos en la selección actual.'}
            </p>
            <button
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Evento</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Fecha / Vigencia</th>
                  <th className="py-3 px-3">Horario</th>
                  <th className="py-3 px-4">Evento / Afiche / Resumen</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Lugar & Dirección</th>
                  <th className="py-3 px-3">Acceso / Arancel</th>
                  <th className="py-3 px-3">Enlaces</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {eventosFiltrados.map((ev) => {
                  const hoy = new Date().toISOString().split('T')[0];
                  const fechaFinEfectiva = ev.fecha_fin || ev.fecha_inicio;
                  const esVencido = !fechaFinEfectiva || fechaFinEfectiva < hoy || ev.estado === 'concluido';
                  const estadoActual = (ev.estado || 'vigente') as EstadoEventoAgenda;
                  const catCfg = CATEGORIAS_CONFIG[ev.categoria] || { label: ev.categoria, badge: 'bg-slate-100 text-slate-700 border-slate-200' };
                  const accCfg = ACCESO_CONFIG[ev.tipo_acceso] || { label: ev.tipo_acceso, badge: 'bg-slate-100 text-slate-700 border-slate-200' };
                  const estCfg = ESTADOS_CONFIG[estadoActual] || ESTADOS_CONFIG.vigente;

                  const esMismoDia = !ev.fecha_fin || ev.fecha_fin === ev.fecha_inicio;

                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        esVencido ? 'opacity-75 bg-slate-50/50' : ''
                      }`}
                    >
                      {/* 1. Fecha & Badge Vigencia */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-800">
                          {ev.fecha_inicio}
                        </div>
                        {!esMismoDia && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            al {ev.fecha_fin}
                          </div>
                        )}
                        <span
                          className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            !esVencido
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {!esVencido ? 'Vigente' : 'Vencido'}
                        </span>
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
                            {ev.imagen_url && ev.imagen_url.trim() !== '' ? (
                              <img
                                src={ev.imagen_url.trim()}
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
                              {ev.curada_manualmente && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300" title="Doble candado: curada y protegida en Firestore">
                                  ✓ Candado v5.5
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                              {ev.descripcion_corta}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 4. Categoría */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${catCfg.badge}`}>
                          {catCfg.label}
                        </span>
                      </td>

                      {/* 5. Lugar, Dirección & Google Maps */}
                      <td className="py-3 px-3 max-w-[170px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-800 font-semibold truncate" title={ev.lugar}>
                            <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                            <span className="truncate">{ev.lugar}</span>
                          </div>
                          {ev.direccion && (
                            <p className="text-[10px] text-slate-500 truncate" title={ev.direccion}>
                              {ev.direccion}
                            </p>
                          )}
                          {ev.mapa_url && (
                            <a
                              href={ev.mapa_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-blue-700 hover:underline font-medium pt-0.5"
                            >
                              <Map className="w-2.5 h-2.5" /> Ver Mapa
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 6. Tipo de Acceso & Arancel */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${accCfg.badge}`}>
                            {accCfg.label}
                          </span>
                          {ev.arancel_estimado && (
                            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                              {ev.arancel_estimado}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. Enlaces (url_info + url_tickets) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-1">
                          {ev.url_info && (
                            <div>
                              <a
                                href={ev.url_info}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline font-semibold"
                              >
                                <ExternalLink className="w-3 h-3" /> Info Oficial
                              </a>
                            </div>
                          )}
                          {ev.url_tickets && (
                            <div>
                              <a
                                href={ev.url_tickets}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded font-semibold"
                              >
                                <Ticket className="w-2.5 h-2.5" /> Boletería
                              </a>
                            </div>
                          )}
                        </div>
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
                            className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            title="Editar evento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            onClick={() => setEventoAEliminar(ev)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                            title="Eliminar evento"
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

      {/* Modal de Alta / Edición de Evento */}
      <EventoModal
        isOpen={modalOpen}
        eventoAEditar={eventoAEditar}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEvento}
      />

      {/* Modal de Confirmación para Eliminar Evento */}
      {eventoAEliminar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-800">¿Eliminar este evento de cartelera?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Vas a eliminar el evento <strong className="text-slate-800">"{eventoAEliminar.titulo}"</strong> de la colección <code className="font-mono">agenda</code>. Esta acción es irreversible.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEventoAEliminar(null)}
                disabled={deleting}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Purga Masiva de Eventos Vencidos */}
      {showPurgaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Flame className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">¿Purgar {conteo.vencidos} eventos vencidos?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta acción eliminará de forma permanente todos los eventos de la colección <code className="font-mono">agenda</code> cuya <strong className="text-slate-700">fecha_fin sea anterior a hoy</strong>.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPurgaModal(false)}
                disabled={purgando}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPurgar}
                disabled={purgando}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {purgando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Purgando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, Purgar Vencidos</span>
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
