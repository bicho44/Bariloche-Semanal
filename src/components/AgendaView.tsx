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
  CheckCircle2,
  Filter,
  Star,
  Ticket,
  Eye,
  X,
  Copy,
  Check,
  Map,
  Info,
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

export const AgendaView: React.FC = () => {
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros unificados estilo Noticias
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [filtroVigencia, setFiltroVigencia] = useState<'todos' | 'vigentes' | 'vencidos'>('todos');
  const [filtroAcceso, setFiltroAcceso] = useState<string>('');
  const [filtroFoto, setFiltroFoto] = useState<string>('');

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [eventoAEditar, setEventoAEditar] = useState<EventoAgenda | null>(null);
  const [eventoAEliminar, setEventoAEliminar] = useState<EventoAgenda | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal de Purga
  const [showPurgaModal, setShowPurgaModal] = useState(false);
  const [purgando, setPurgando] = useState(false);

  // Acción rápida concluyendo
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Modal Popup de Detalle Completo
  const [detallePopupEvento, setDetallePopupEvento] = useState<EventoAgenda | null>(null);
  const [copiedDescripcion, setCopiedDescripcion] = useState(false);

  // Cerrar popup de detalle con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetallePopupEvento(null);
        setEventoAEliminar(null);
        setShowPurgaModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
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

  // Marcar como concluido o reactivar rápidamente
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

  // Confirmar eliminación
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

  // Purgar eventos vencidos
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

  // Filtrado reactivo completo
  const eventosFiltrados = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0];
    let lista = eventos;

    // Filtro Vigencia
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

    // Filtro Fecha específica
    if (filtroFecha) {
      lista = lista.filter((e) => {
        const ini = e.fecha_inicio;
        const fin = e.fecha_fin || e.fecha_inicio;
        return filtroFecha >= ini && filtroFecha <= fin;
      });
    }

    // Filtro Acceso
    if (filtroAcceso) {
      lista = lista.filter((e) => e.tipo_acceso === filtroAcceso);
    }

    // Filtro Foto
    if (filtroFoto === 'con_foto') {
      lista = lista.filter((e) => !!(e.imagen_url && e.imagen_url.trim()));
    } else if (filtroFoto === 'sin_foto') {
      lista = lista.filter((e) => !(e.imagen_url && e.imagen_url.trim()));
    }

    // Búsqueda de texto
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      lista = lista.filter(
        (ev) =>
          ev.titulo.toLowerCase().includes(q) ||
          ev.lugar.toLowerCase().includes(q) ||
          (ev.direccion && ev.direccion.toLowerCase().includes(q)) ||
          ev.descripcion_corta.toLowerCase().includes(q) ||
          (ev.arancel_estimado && ev.arancel_estimado.toLowerCase().includes(q))
      );
    }

    return lista;
  }, [eventos, filtroVigencia, filtroFecha, filtroAcceso, filtroFoto, busqueda]);

  return (
    <div className="space-y-6">
      {/* Top Bar unificada con Noticias */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agenda Cultural y Deportiva</h1>
          <p className="text-xs text-slate-500">
            Cartelera de Bariloche en Firestore: colección <code className="text-blue-700 font-mono">agenda</code>{' '}
            <span className="font-semibold text-slate-600">
              ({conteo.vigentes} vigentes • {conteo.vencidos} vencidos)
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchEventos()}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Botón Purgar Eventos Vencidos */}
          <button
            onClick={() => setShowPurgaModal(true)}
            disabled={conteo.vencidos === 0 || loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Eliminar masivamente eventos cuya fecha ya expiró"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Purgar vencidos</span>
            <span>({conteo.vencidos})</span>
          </button>

          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
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

      {/* Filters Bar unificada con Noticias */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-blue-700" />
            <span>Filtros y Búsqueda en Vivo</span>
          </div>
          {/* Switch rápido de Vigencia */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
            <button
              onClick={() => setFiltroVigencia('todos')}
              className={`px-2 py-0.5 font-semibold rounded transition-colors ${
                filtroVigencia === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({conteo.total})
            </button>
            <button
              onClick={() => setFiltroVigencia('vigentes')}
              className={`px-2 py-0.5 font-semibold rounded transition-colors ${
                filtroVigencia === 'vigentes' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vigentes ({conteo.vigentes})
            </button>
            <button
              onClick={() => setFiltroVigencia('vencidos')}
              className={`px-2 py-0.5 font-semibold rounded transition-colors ${
                filtroVigencia === 'vencidos' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vencidos ({conteo.vencidos})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar evento, lugar, arancel..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Filtro Fecha */}
          <div className="relative">
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              title="Filtrar por fecha en cartelera"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
            />
            {filtroFecha && (
              <button
                onClick={() => setFiltroFecha('')}
                className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                title="Limpiar fecha"
              >
                ✕
              </button>
            )}
          </div>

          {/* Categoría */}
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
          >
            <option value="todas">Todas las categorías</option>
            {(Object.keys(CATEGORIAS_CONFIG) as CategoriaAgenda[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORIAS_CONFIG[cat].label}
              </option>
            ))}
          </select>

          {/* Tipo de Acceso */}
          <select
            value={filtroAcceso}
            onChange={(e) => setFiltroAcceso(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Acceso: Todos</option>
            <option value="gratuito">Gratuito</option>
            <option value="arancelado">Arancelado</option>
            <option value="con_inscripcion">Con Inscripción</option>
          </select>

          {/* Filtro Afiche / Foto */}
          <select
            value={filtroFoto}
            onChange={(e) => setFiltroFoto(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 font-medium"
            title="Filtro de Afiche"
          >
            <option value="">Afiches: Todos</option>
            <option value="con_foto">📷 Con afiche</option>
            <option value="sin_foto">🚫 Sin afiche</option>
          </select>

          {/* Estado de Vigencia dropdown sincronizado */}
          <select
            value={filtroVigencia}
            onChange={(e) => setFiltroVigencia(e.target.value as 'todos' | 'vigentes' | 'vencidos')}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 font-medium"
            title="Filtro de Vigencia"
          >
            <option value="todos">Vigencia: Todos</option>
            <option value="vigentes">✅ Solo Vigentes</option>
            <option value="vencidos">⏳ Solo Vencidos</option>
          </select>
        </div>
      </div>

      {/* Table & Empty State unificados */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-800 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Consultando eventos en Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : eventosFiltrados.length === 0 ? (
          /* ESTADO VACÍO LIMPIO UNIFICADO CON NOTICIAS */
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No hay eventos en la agenda</h3>
              <p className="text-xs text-slate-500 mt-1">
                La colección Firestore en <code className="font-mono text-blue-700">agenda</code> no contiene registros que coincidan con los filtros actuales.
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primer Evento</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-28 whitespace-nowrap">Fecha &amp; Horario</th>
                  <th className="py-3 px-2 w-16 text-center">Afiche</th>
                  <th className="py-3 px-4 w-7/12 min-w-[360px]">Evento / Resumen</th>
                  <th className="py-3 px-4 w-56">Lugar &amp; Categoría</th>
                  <th className="py-3 px-3 w-24 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {eventosFiltrados.map((item) => {
                  const hoy = new Date().toISOString().split('T')[0];
                  const fechaFinEfectiva = item.fecha_fin || item.fecha_inicio;
                  const esVencido = !fechaFinEfectiva || fechaFinEfectiva < hoy || item.estado === 'concluido';
                  const esMismoDia = !item.fecha_fin || item.fecha_fin === item.fecha_inicio;
                  const catCfg = CATEGORIAS_CONFIG[item.categoria] || { label: item.categoria, badge: 'bg-slate-100 text-slate-700 border-slate-200' };
                  const accCfg = ACCESO_CONFIG[item.tipo_acceso] || { label: item.tipo_acceso, badge: 'bg-slate-100 text-slate-700 border-slate-200' };

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        esVencido ? 'opacity-75 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* 1. Fecha & Horario */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-600 font-medium align-top">
                        <div className="font-semibold text-slate-800">
                          {item.fecha_inicio}
                        </div>
                        {!esMismoDia && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            al {item.fecha_fin}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.horario || 'S/H'}</span>
                        </div>
                      </td>

                      {/* 2. Afiche / Foto (después de la fecha y antes del titular) */}
                      <td className="py-3 px-2 text-center align-top">
                        {item.imagen_url && item.imagen_url.trim() !== '' ? (
                          <div className="flex flex-col items-center gap-1">
                            <a
                              href={item.imagen_url.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block relative group"
                              title="Ver afiche completo"
                            >
                              <img
                                src={item.imagen_url.trim()}
                                referrerPolicy="no-referrer"
                                alt={item.titulo}
                                className="w-11 h-11 object-cover rounded-md border border-purple-300 shadow-2xs group-hover:scale-105 transition-transform"
                                onError={(e) => handleImageErrorWithProxy(e, item.imagen_url, DEFAULT_AGENDA_FALLBACK)}
                              />
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border border-white" title="Afiche asignado" />
                            </a>
                            <span className="text-[9px] font-semibold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200/50">
                              Afiche
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs group"
                              title="Cargar afiche o URL"
                            >
                              <ImageIcon className="w-3 h-3 text-amber-600 group-hover:scale-110 transition-transform" />
                              <span>Cargar</span>
                            </button>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 border border-amber-300/80 px-1 py-0.2 rounded whitespace-nowrap">
                              Sin Afiche
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. Titular / Resumen (columna ancha ~2/3 con enlace a edición y popup) */}
                      <td className="py-3 px-4 align-top">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="font-bold text-slate-900 hover:text-blue-900 hover:underline text-left text-xs sm:text-sm leading-snug cursor-pointer transition-colors block group"
                          title="Clic para editar este evento"
                        >
                          <span className="group-hover:text-blue-900">{item.titulo}</span>
                        </button>

                        {/* Resumen más corto con disparador del popup */}
                        {item.descripcion_corta && (
                          <div className="mt-1.5 flex flex-wrap items-baseline gap-1 text-[11px] text-slate-600 leading-relaxed">
                            <span className="line-clamp-2">
                              {item.descripcion_corta}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDetallePopupEvento(item)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200/90 px-1.5 py-0.5 rounded transition-colors cursor-pointer shrink-0 ml-0.5"
                              title="Ver descripción y detalles completos"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver completo</span>
                            </button>
                          </div>
                        )}

                        {/* Arancel o costo destacado */}
                        {item.arancel_estimado && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-700 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md">
                            <Ticket className="w-3 h-3 text-blue-800 shrink-0" />
                            <span className="font-semibold">Arancel:</span>
                            <span className="italic">{item.arancel_estimado}</span>
                          </div>
                        )}

                        {/* Badges de soporte: Estado/Vigencia, Acceso, Destacado, Candado */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {/* Pastilla de vigencia / estado */}
                          {!esVencido ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full"
                              title="Evento vigente en cartelera"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Vigente</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full"
                              title="Evento concluido o vencido"
                            >
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Concluido</span>
                            </span>
                          )}

                          {/* Tipo de acceso */}
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${accCfg.badge}`}>
                            {accCfg.label}
                          </span>

                          {item.destacado && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Destacado
                            </span>
                          )}

                          {item.curada_manualmente && (
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded-md" title="Candado editorial contra sobrescritura">
                              ✓ Candado v5.5
                            </span>
                          )}

                          {/* Globo informativo de Ubicación y Tips */}
                          {item.direccion && (
                            <div className="relative group/delta inline-block">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 transition-colors cursor-help">
                                <Info className="w-3 h-3 text-blue-700 shrink-0" />
                                <span>Dirección:</span>
                                <span className="truncate max-w-[140px] font-normal italic">
                                  {item.direccion}
                                </span>
                              </span>
                              {/* Globo flotante emergente */}
                              <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/delta:block z-30 w-72 p-2.5 bg-slate-900 text-slate-100 text-[11px] rounded-lg shadow-xl border border-slate-700 pointer-events-none leading-relaxed animate-in fade-in duration-150">
                                <span className="font-bold text-amber-300 block mb-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-amber-300" />
                                  <span>{item.lugar}</span>
                                </span>
                                <p className="text-slate-300">{item.direccion}</p>
                                {item.mapa_url && (
                                  <span className="text-blue-300 text-[10px] block mt-1">
                                    Enlace a Google Maps disponible
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Lugar & Categoría / Enlaces unificados */}
                      <td className="py-3 px-4 align-top">
                        <div className="mb-1.5">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md border whitespace-nowrap ${catCfg.badge}`}>
                            {catCfg.label}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-800 font-medium truncate" title={item.lugar}>
                            <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                            <span className="truncate">{item.lugar}</span>
                          </div>

                          {item.mapa_url && (
                            <div>
                              <a
                                href={item.mapa_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5 text-[10px] font-medium"
                              >
                                <span>Ver Mapa</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}

                          {/* Enlaces de interés */}
                          <div className="pt-1 flex flex-wrap gap-1.5">
                            {item.url_info && (
                              <a
                                href={item.url_info}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded hover:bg-blue-100 transition-colors"
                                title="Ver nota informativa o web oficial"
                              >
                                <span>Info Oficial</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                            {item.url_tickets && (
                              <a
                                href={item.url_tickets}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200/80 px-1.5 py-0.2 rounded hover:bg-purple-100 transition-colors"
                                title="Abrir boletería o inscripción"
                              >
                                <span>Boletería</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 5. Acciones */}
                      <td className="py-3 px-3 text-right align-top whitespace-nowrap w-24">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botón Rápido: Concluir / Vigente */}
                          <button
                            onClick={() => handleMarcarConcluido(item)}
                            disabled={markingId === item.id}
                            className={`p-1.5 rounded-md border transition-all cursor-pointer ${
                              item.estado === 'concluido'
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                            }`}
                            title={
                              item.estado === 'concluido'
                                ? 'Reactivar evento (marcar como vigente)'
                                : 'Marcar evento como concluido'
                            }
                          >
                            {markingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : item.estado === 'concluido' ? (
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>

                          {/* Botón Editar */}
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Editar evento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            onClick={() => setEventoAEliminar(item)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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

      {/* Modal de Creación / Edición */}
      <EventoModal
        isOpen={modalOpen}
        eventoAEditar={eventoAEditar}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEvento}
      />

      {/* Modal Popup de Detalle Completo de Evento (estilo NoticiasView) */}
      {detallePopupEvento && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDetallePopupEvento(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/80">
              <div className="space-y-1.5 flex-1 pr-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-slate-200/90 text-slate-700 rounded-md">
                    {detallePopupEvento.fecha_inicio}
                    {detallePopupEvento.fecha_fin && detallePopupEvento.fecha_fin !== detallePopupEvento.fecha_inicio
                      ? ` al ${detallePopupEvento.fecha_fin}`
                      : ''}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md">
                    {CATEGORIAS_CONFIG[detallePopupEvento.categoria]?.label || detallePopupEvento.categoria}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                    {ACCESO_CONFIG[detallePopupEvento.tipo_acceso]?.label || detallePopupEvento.tipo_acceso}
                  </span>
                  {detallePopupEvento.destacado && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                      ⭐ Destacado
                    </span>
                  )}
                  {detallePopupEvento.curada_manualmente && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                      ✓ Candado v5.5
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {detallePopupEvento.titulo}
                </h2>
              </div>
              <button
                onClick={() => setDetallePopupEvento(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Cerrar ventana (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Afiche miniatura o preview si existe */}
              {detallePopupEvento.imagen_url && detallePopupEvento.imagen_url.trim() !== '' && (
                <div className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl items-center">
                  <img
                    src={detallePopupEvento.imagen_url.trim()}
                    referrerPolicy="no-referrer"
                    alt={detallePopupEvento.titulo}
                    className="w-20 h-24 object-cover rounded-lg border border-purple-200 shadow-xs shrink-0"
                    onError={(e) => handleImageErrorWithProxy(e, detallePopupEvento.imagen_url, DEFAULT_AGENDA_FALLBACK)}
                  />
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Afiche Oficial</span>
                    <p className="text-slate-500 text-[11px]">Imagen asignada en la cartelera de Bariloche Semanal.</p>
                    <a
                      href={detallePopupEvento.imagen_url.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline text-[11px] font-semibold inline-flex items-center gap-1 pt-1"
                    >
                      <span>Abrir imagen en alta resolución</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Descripción / Hecho Central Completo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    <span>Descripción y Detalles del Evento</span>
                  </span>
                  {detallePopupEvento.descripcion_corta && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(detallePopupEvento.descripcion_corta || '');
                        setCopiedDescripcion(true);
                        setTimeout(() => setCopiedDescripcion(false), 2000);
                      }}
                      className="text-[11px] text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      {copiedDescripcion ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDescripcion ? 'Copiado' : 'Copiar texto'}</span>
                    </button>
                  )}
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                  {detallePopupEvento.descripcion_corta || (
                    <span className="italic text-slate-400">Sin descripción registrada.</span>
                  )}
                </div>
              </div>

              {/* Lugar, Dirección y Arancel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-700" />
                    <span>Lugar y Dirección</span>
                  </span>
                  <p className="text-xs font-semibold text-slate-800">{detallePopupEvento.lugar}</p>
                  {detallePopupEvento.direccion && (
                    <p className="text-[11px] text-slate-600">{detallePopupEvento.direccion}</p>
                  )}
                  {detallePopupEvento.mapa_url && (
                    <a
                      href={detallePopupEvento.mapa_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline font-medium text-[11px] inline-flex items-center gap-1 pt-1"
                    >
                      <Map className="w-3 h-3" /> Ver en Google Maps
                    </a>
                  )}
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Acceso y Entrada</span>
                  </span>
                  <p className="text-xs font-semibold text-slate-800">
                    {ACCESO_CONFIG[detallePopupEvento.tipo_acceso]?.label || detallePopupEvento.tipo_acceso}
                  </p>
                  {detallePopupEvento.arancel_estimado && (
                    <p className="text-[11px] text-slate-600">
                      Costo / Arancel: <span className="font-medium text-slate-800">{detallePopupEvento.arancel_estimado}</span>
                    </p>
                  )}
                  {detallePopupEvento.horario && (
                    <p className="text-[11px] text-slate-600">
                      Horario: <span className="font-mono text-slate-800">{detallePopupEvento.horario}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Enlaces Oficiales */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  {detallePopupEvento.url_info && (
                    <a
                      href={detallePopupEvento.url_info}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Web oficial / Nota</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {detallePopupEvento.url_tickets && (
                    <a
                      href={detallePopupEvento.url_tickets}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Boletería / Inscripción</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  ID: {detallePopupEvento.id}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDetallePopupEvento(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const ev = detallePopupEvento;
                  setDetallePopupEvento(null);
                  handleEdit(ev);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Evento Completo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Evento */}
      {eventoAEliminar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEventoAEliminar(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">¿Eliminar evento de la agenda?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Estás por eliminar permanentemente <span className="font-semibold text-slate-900">"{eventoAEliminar.titulo}"</span> de la colección Firestore <code className="font-mono text-blue-900">agenda</code>. Esta acción es irreversible.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEventoAEliminar(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Purga Masiva de Eventos Vencidos */}
      {showPurgaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowPurgaModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">¿Purgar eventos vencidos?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Esta operación eliminará permanentemente los <span className="font-bold text-slate-900">{conteo.vencidos}</span> eventos cuya fecha de finalización ya expiró respecto a hoy.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPurgaModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPurgar}
                disabled={purgando}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {purgando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Purgar {conteo.vencidos} Eventos</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
