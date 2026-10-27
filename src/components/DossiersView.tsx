import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FolderArchive,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  Search,
  Filter,
  Eye,
  X,
  Copy,
  Check,
  Info,
  Users,
  Target,
  Database,
} from 'lucide-react';
import { Dossier, AreaId, EstadoDossier } from '../types/index.js';
import { DossierModal } from './DossierModal.js';
import { handleImageErrorWithProxy } from '../utils/image.js';

interface DossiersViewProps {
  onRefreshDossiers?: () => void;
}

const AREAS: { id: AreaId; label: string }[] = [
  { id: 'gestion-publica', label: 'Gestión Pública' },
  { id: 'turismo', label: 'Turismo' },
  { id: 'deportes', label: 'Deportes' },
  { id: 'legales-comercio', label: 'Legales y Comercio' },
  { id: 'alquileres-inmobiliario', label: 'Alquileres e Inmobiliario' },
  { id: 'vida-social-cultura', label: 'Vida Social y Cultura' },
  { id: 'en-el-radar', label: 'En el Radar' },
  { id: 'poder', label: 'Poder & Obras' },
  { id: 'montana', label: 'Montaña & Turismo' },
  { id: 'urbano', label: 'Pulso Urbano' },
];

const ESTADOS_CONFIG: Record<EstadoDossier, { label: string; badge: string; selectClass: string }> = {
  activo: {
    label: 'Activo',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    selectClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  en_seguimiento: {
    label: 'En Seguimiento',
    badge: 'bg-amber-50 text-amber-800 border-amber-300',
    selectClass: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  latente: {
    label: 'Latente',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    selectClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
  },
  resuelto: {
    label: 'Resuelto',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    selectClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
};

export const DossiersView: React.FC<DossiersViewProps> = ({ onRefreshDossiers }) => {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros unificados estilo Noticias
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [selectedCronica, setSelectedCronica] = useState<string>('');
  const [selectedMedia, setSelectedMedia] = useState<string>('');
  const [selectedCurada, setSelectedCurada] = useState<string>('');

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [dossierAEditar, setDossierAEditar] = useState<Dossier | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [updatingStatusSlug, setUpdatingStatusSlug] = useState<string | null>(null);

  // Modal Popup de Detalle / Timeline Completo
  const [detallePopupDossier, setDetallePopupDossier] = useState<Dossier | null>(null);
  const [copiedContexto, setCopiedContexto] = useState(false);
  const [copiedCronica, setCopiedCronica] = useState(false);

  // Cerrar popup de detalle con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetallePopupDossier(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchDossiers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dossiers', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error('Error al cargar temas en seguimiento de Firestore');
      const data = await res.json();
      setDossiers(Array.isArray(data) ? data : []);
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
      if (!res.ok) throw new Error('Error al actualizar estado del seguimiento');
      const actualizado: Dossier = await res.json();
      setDossiers((prev) => prev.map((d) => (d.id === actualizado.id ? actualizado : d)));
      if (detallePopupDossier?.id === slug) {
        setDetallePopupDossier(actualizado);
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error al cambiar estado: ${errorObj.message}`);
    } finally {
      setUpdatingStatusSlug(null);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el tema en seguimiento '${slug}'?`)) {
      return;
    }

    setDeletingSlug(slug);
    try {
      const res = await fetch(`/api/dossiers/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Error al eliminar tema');
      }
      setDossiers((prev) => prev.filter((d) => d.id !== slug));
      if (detallePopupDossier?.id === slug) {
        setDetallePopupDossier(null);
      }
      if (onRefreshDossiers) onRefreshDossiers();
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error al eliminar: ${errorObj.message}`);
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
      if (!res.ok) throw new Error('Error al actualizar tema en seguimiento');
      const actualizado: Dossier = await res.json();
      setDossiers((prev) => prev.map((d) => (d.id === actualizado.id ? actualizado : d)));
    } else {
      const res = await fetch('/api/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (!res.ok) throw new Error('Error al crear tema en seguimiento');
      const nuevo: Dossier = await res.json();
      setDossiers((prev) => [nuevo, ...prev]);
    }
    fetchDossiers();
    if (onRefreshDossiers) onRefreshDossiers();
  };

  // Filtrado reactivo completo
  const dossiersFiltrados = useMemo(() => {
    let lista = dossiers;

    // Filtro Área
    if (selectedArea) {
      lista = lista.filter((d) => d.area_id === selectedArea);
    }

    // Filtro Estado
    if (selectedEstado) {
      lista = lista.filter((d) => d.estado === selectedEstado);
    }

    // Filtro Crónica
    if (selectedCronica === 'con_cronica') {
      lista = lista.filter((d) => !!(d.cronica_html && d.cronica_html.trim().length > 0));
    } else if (selectedCronica === 'sin_cronica') {
      lista = lista.filter((d) => !(d.cronica_html && d.cronica_html.trim().length > 0));
    }

    // Filtro Media / Arte
    if (selectedMedia === 'con_foto') {
      lista = lista.filter((d) => !!(d.media?.imagen_url && d.media.imagen_url.trim().length > 0));
    } else if (selectedMedia === 'con_nanobanana') {
      lista = lista.filter((d) => !!(d.prompt_nanobanana || d.media?.prompt_nanobanana));
    } else if (selectedMedia === 'sin_media') {
      lista = lista.filter(
        (d) =>
          !(d.media?.imagen_url && d.media.imagen_url.trim().length > 0) &&
          !(d.prompt_nanobanana || d.media?.prompt_nanobanana)
      );
    }

    // Filtro Curadas
    if (selectedCurada === 'curadas') {
      lista = lista.filter((d) => !!d.curada_manualmente);
    }

    // Búsqueda de texto
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      lista = lista.filter(
        (d) =>
          d.titulo.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.resumen_contexto.toLowerCase().includes(q) ||
          (d.actores_clave && d.actores_clave.some((a) => a.toLowerCase().includes(q))) ||
          (d.criterio_inclusion && d.criterio_inclusion.toLowerCase().includes(q))
      );
    }

    return lista;
  }, [dossiers, selectedArea, selectedEstado, selectedCronica, selectedMedia, selectedCurada, search]);

  return (
    <div className="space-y-6">
      {/* Top Bar unificada con Noticias */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Temas en Seguimiento</h1>
          <p className="text-xs text-slate-500">
            Observatorio de conflictos y temas longitudinales en Firestore: colección{' '}
            <code className="text-blue-700 font-mono">dossiers</code> ({dossiers.length} registrados)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchDossiers()}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Seguimiento</span>
          </button>
        </div>
      </div>

      {/* Filters Bar unificada con Noticias */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-blue-700" />
          <span>Filtros y Búsqueda en Vivo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por tema, actor, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Área */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Todas las áreas</option>
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>

          {/* Estado del Dossier */}
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Todos los estados</option>
            <option value="activo">🟢 Activo</option>
            <option value="en_seguimiento">🟡 En Seguimiento</option>
            <option value="latente">🟣 Latente</option>
            <option value="resuelto">⚪ Resuelto</option>
          </select>

          {/* Filtro Crónica */}
          <select
            value={selectedCronica}
            onChange={(e) => setSelectedCronica(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 font-medium"
            title="Estado de Crónica de Fondo"
          >
            <option value="">Crónica: Todas</option>
            <option value="con_cronica">✅ Con crónica redactada</option>
            <option value="sin_cronica">⏳ Sin crónica</option>
          </select>

          {/* Filtro Media / Arte */}
          <select
            value={selectedMedia}
            onChange={(e) => setSelectedMedia(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 font-medium"
            title="Filtro de Media o Nanobanana"
          >
            <option value="">Media: Todos</option>
            <option value="con_foto">📷 Con imagen asignada</option>
            <option value="con_nanobanana">✨ Con arte Nanobanana</option>
            <option value="sin_media">🚫 Sin media</option>
          </select>

          {/* Filtro Curadas / Blindaje */}
          <select
            value={selectedCurada}
            onChange={(e) => setSelectedCurada(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 font-medium"
            title="Curaduría editorial"
          >
            <option value="">Curaduría: Toda</option>
            <option value="curadas">✓ Solo curadas / blindadas</option>
          </select>
        </div>
      </div>

      {/* Table & Empty State unificados */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-800 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Consultando seguimientos en Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : dossiersFiltrados.length === 0 ? (
          /* ESTADO VACÍO LIMPIO UNIFICADO CON NOTICIAS */
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <FolderArchive className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No hay temas en seguimiento</h3>
              <p className="text-xs text-slate-500 mt-1">
                La base de datos Firestore en <code className="font-mono text-blue-700">dossiers</code> no contiene registros que coincidan con los filtros actuales.
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primer Seguimiento</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-28 whitespace-nowrap">Actualizado / ID</th>
                  <th className="py-3 px-2 w-16 text-center">Media</th>
                  <th className="py-3 px-4 w-7/12 min-w-[360px]">Tema / Contexto &amp; Hitos</th>
                  <th className="py-3 px-4 w-52">Área &amp; Actores</th>
                  <th className="py-3 px-3 w-24 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dossiersFiltrados.map((item) => {
                  const fotoUrl = item.media?.imagen_url;
                  const fechaDisplay = item.fecha_ultima_cronica || item.ultima_actualizacion || 'S/F';
                  const areaDisplay = AREAS.find((a) => a.id === item.area_id)?.label || item.area_id;
                  const hasCronica = !!(item.cronica_html && item.cronica_html.trim().length > 0);
                  const hasNanobanana = !!(item.prompt_nanobanana || item.media?.prompt_nanobanana);
                  const estadoCfg = ESTADOS_CONFIG[item.estado] || ESTADOS_CONFIG.activo;
                  const hitosCount = item.timeline?.length || 0;
                  const ultimoHito = item.timeline && item.timeline.length > 0 ? item.timeline[item.timeline.length - 1] : null;
                  const actoresCount = item.actores_clave?.length || 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Actualizado / ID */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-600 font-medium align-top">
                        <div className="font-semibold text-slate-800">
                          {fechaDisplay}
                        </div>
                        <span
                          className="font-mono text-[10px] text-blue-900 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded block truncate max-w-[110px] mt-1"
                          title={`Slug ID: ${item.id}`}
                        >
                          {item.id}
                        </span>
                      </td>

                      {/* 2. Media / Arte (después de la fecha y antes del titular) */}
                      <td className="py-3 px-2 text-center align-top">
                        {fotoUrl && fotoUrl.trim() !== '' ? (
                          <div className="flex flex-col items-center gap-1">
                            <a
                              href={fotoUrl.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block relative group"
                              title="Ver imagen completa"
                            >
                              <img
                                src={fotoUrl.trim()}
                                referrerPolicy="no-referrer"
                                alt={item.titulo}
                                className="w-11 h-11 object-cover rounded-md border border-purple-300 shadow-2xs group-hover:scale-105 transition-transform"
                                onError={(e) => handleImageErrorWithProxy(e, fotoUrl)}
                              />
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border border-white" title="Imagen asignada" />
                            </a>
                            <span className="text-[9px] font-semibold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200/50">
                              Asignada
                            </span>
                          </div>
                        ) : hasNanobanana ? (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="w-11 h-11 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-md flex flex-col items-center justify-center text-[10px] font-bold transition-colors cursor-pointer shadow-2xs group"
                              title="Prompt Nanobanana disponible para generar imagen"
                            >
                              <Sparkles className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                              <span className="text-[8px] mt-0.5">Arte IA</span>
                            </button>
                            <span className="text-[9px] font-bold text-purple-800 bg-purple-100/90 border border-purple-300/80 px-1 py-0.2 rounded whitespace-nowrap">
                              Prompt IA
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs group"
                              title="Cargar imagen o prompt editorial"
                            >
                              <ImageIcon className="w-3 h-3 text-amber-600 group-hover:scale-110 transition-transform" />
                              <span>Cargar</span>
                            </button>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 border border-amber-300/80 px-1 py-0.2 rounded whitespace-nowrap">
                              Sin Media
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. Titular / Contexto (columna ancha ~2/3 con enlace a edición y popup) */}
                      <td className="py-3 px-4 align-top">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="font-bold text-slate-900 hover:text-blue-900 hover:underline text-left text-xs sm:text-sm leading-snug cursor-pointer transition-colors block group"
                          title="Clic para editar este tema en seguimiento"
                        >
                          <span className="group-hover:text-blue-900">{item.titulo}</span>
                        </button>

                        {/* Resumen más corto con disparador del popup */}
                        {item.resumen_contexto && (
                          <div className="mt-1.5 flex flex-wrap items-baseline gap-1 text-[11px] text-slate-600 leading-relaxed">
                            <span className="line-clamp-2">
                              {item.resumen_contexto}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDetallePopupDossier(item)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200/90 px-1.5 py-0.5 rounded transition-colors cursor-pointer shrink-0 ml-0.5"
                              title="Ver contexto completo, timeline y crónica de fondo"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver completo</span>
                            </button>
                          </div>
                        )}

                        {/* Criterio de Inclusión / Alcance Estricto */}
                        {item.criterio_inclusion && (
                          <div className="mt-1 flex items-start gap-1 text-[11px] text-blue-900 bg-blue-50/80 border border-blue-200/70 px-2 py-0.5 rounded-md">
                            <Target className="w-3 h-3 text-blue-700 shrink-0 mt-0.5" />
                            <span className="shrink-0 font-bold">Alcance:</span>
                            <span className="line-clamp-1 italic">{item.criterio_inclusion}</span>
                          </div>
                        )}

                        {/* Badges de soporte: Estado selector rápido, Crónica redactada, Timeline hitos, Curada */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {/* Selector / Pastilla de Estado interactiva */}
                          <div className="relative inline-block">
                            <select
                              value={item.estado}
                              disabled={updatingStatusSlug === item.id}
                              onChange={(e) => handleQuickStatusChange(item.id, e.target.value as EstadoDossier)}
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border cursor-pointer ${estadoCfg.selectClass}`}
                              title="Cambiar estado en Firestore directamente"
                            >
                              <option value="activo">🟢 Activo</option>
                              <option value="en_seguimiento">🟡 En Seguimiento</option>
                              <option value="latente">🟣 Latente</option>
                              <option value="resuelto">⚪ Resuelto</option>
                            </select>
                          </div>

                          {/* Pastilla de estado de crónica de fondo */}
                          {hasCronica ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full"
                              title="Crónica periodística de fondo redactada"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Crónica redactada</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full"
                              title="Pendiente de crónica profunda"
                            >
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Sin crónica</span>
                            </span>
                          )}

                          {/* Globo informativo de Timeline de Hitos */}
                          <div className="relative group/delta inline-block">
                            <button
                              type="button"
                              onClick={() => setDetallePopupDossier(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                              title="Ver timeline de hitos"
                            >
                              <Clock className="w-3 h-3 text-blue-700 shrink-0" />
                              <span>{hitosCount} hitos</span>
                              {ultimoHito && (
                                <span className="truncate max-w-[130px] font-normal italic text-slate-600">
                                  ({ultimoHito.fecha}: {ultimoHito.hito})
                                </span>
                              )}
                            </button>
                            {/* Globo flotante emergente */}
                            {ultimoHito && (
                              <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/delta:block z-30 w-80 p-2.5 bg-slate-900 text-slate-100 text-[11px] rounded-lg shadow-xl border border-slate-700 pointer-events-none leading-relaxed animate-in fade-in duration-150">
                                <span className="font-bold text-amber-300 block mb-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-300" />
                                  <span>Último hito registrado ({ultimoHito.fecha}):</span>
                                </span>
                                <p className="text-slate-200">{ultimoHito.hito}</p>
                                <span className="text-blue-300 text-[10px] block mt-1">
                                  Haz clic para ver la cronología completa de los {hitosCount} hitos.
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Recuento de Actores */}
                          {actoresCount > 0 && (
                            <span className="text-[10px] bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-500" />
                              <span>{actoresCount} actores</span>
                            </span>
                          )}

                          {/* Blindaje Editorial */}
                          {item.curada_manualmente && (
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5" title="Blindado contra sobrescritura automática">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Curada</span>
                            </span>
                          )}

                          {/* Ficha técnica inmutable */}
                          {item.datos_duros_verificados && Object.keys(item.datos_duros_verificados).length > 0 && (
                            <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 border border-teal-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <Database className="w-2.5 h-2.5 text-teal-600" />
                              <span>Ficha ({Object.keys(item.datos_duros_verificados).length})</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Área & Actores Clave */}
                      <td className="py-3 px-4 align-top">
                        <div className="mb-1.5">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-200/60 whitespace-nowrap">
                            {areaDisplay}
                          </span>
                        </div>

                        {item.actores_clave && item.actores_clave.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {item.actores_clave.slice(0, 3).map((actor, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium truncate max-w-[140px]"
                                  title={actor}
                                >
                                  {actor}
                                </span>
                              ))}
                              {item.actores_clave.length > 3 && (
                                <span className="text-[10px] text-slate-400 font-semibold px-1">
                                  +{item.actores_clave.length - 3} más
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Sin actores registrados</span>
                        )}
                      </td>

                      {/* 5. Acciones */}
                      <td className="py-3 px-3 text-right align-top whitespace-nowrap w-24">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botón Ver Detalle */}
                          <button
                            onClick={() => setDetallePopupDossier(item)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Ver detalles, timeline y crónica de fondo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Editar */}
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Editar tema en seguimiento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingSlug === item.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Eliminar de Firestore"
                          >
                            {deletingSlug === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
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
      <DossierModal
        isOpen={modalOpen}
        dossierAEditar={dossierAEditar}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Modal Popup de Detalle Completo de Dossier (estilo NoticiasView) */}
      {detallePopupDossier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDetallePopupDossier(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/80">
              <div className="space-y-1.5 flex-1 pr-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-md">
                    {detallePopupDossier.id}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md">
                    {AREAS.find((a) => a.id === detallePopupDossier.area_id)?.label || detallePopupDossier.area_id}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${ESTADOS_CONFIG[detallePopupDossier.estado]?.badge}`}>
                    {ESTADOS_CONFIG[detallePopupDossier.estado]?.label || detallePopupDossier.estado}
                  </span>
                  {detallePopupDossier.curada_manualmente && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                      ✓ Curada
                    </span>
                  )}
                  {detallePopupDossier.cronica_html && detallePopupDossier.cronica_html.trim().length > 0 ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                      ✅ Crónica redactada
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                      ⏳ Sin crónica
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {detallePopupDossier.titulo}
                </h2>
              </div>
              <button
                onClick={() => setDetallePopupDossier(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Cerrar ventana (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Resumen / Contexto Completo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                    <span>Resumen y Contexto del Conflicto</span>
                  </span>
                  {detallePopupDossier.resumen_contexto && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(detallePopupDossier.resumen_contexto || '');
                        setCopiedContexto(true);
                        setTimeout(() => setCopiedContexto(false), 2000);
                      }}
                      className="text-[11px] text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      {copiedContexto ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedContexto ? 'Copiado' : 'Copiar texto'}</span>
                    </button>
                  )}
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                  {detallePopupDossier.resumen_contexto || (
                    <span className="italic text-slate-400">Sin contexto registrado.</span>
                  )}
                </div>
              </div>

              {/* Criterio de Inclusión Estricto */}
              {detallePopupDossier.criterio_inclusion && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200/70 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-700" />
                    <span>Alcance y Criterio Estricto de Inclusión</span>
                  </span>
                  <p className="text-xs text-blue-950 leading-relaxed italic">
                    {detallePopupDossier.criterio_inclusion}
                  </p>
                  {detallePopupDossier.prohibido_incluir && (
                    <p className="text-[11px] text-rose-800 pt-1 font-medium">
                      🚫 Exclusiones explícitas: {detallePopupDossier.prohibido_incluir}
                    </p>
                  )}
                </div>
              )}

              {/* Actores Clave */}
              {detallePopupDossier.actores_clave && detallePopupDossier.actores_clave.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-700" />
                    <span>Actores Clave Identificados ({detallePopupDossier.actores_clave.length})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {detallePopupDossier.actores_clave.map((a, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-white border border-slate-200 shadow-2xs rounded-md text-xs text-slate-800 font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline Completo de Hitos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-700" />
                    <span>Timeline Cronológico de Hitos ({detallePopupDossier.timeline?.length || 0})</span>
                  </span>
                </div>
                {detallePopupDossier.timeline && detallePopupDossier.timeline.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {detallePopupDossier.timeline.map((h, i) => (
                      <div
                        key={i}
                        className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-mono text-blue-900 font-bold shrink-0">{h.fecha}:</span>
                          <span className="text-slate-700 leading-relaxed">{h.hito}</span>
                        </div>
                        {h.fuente_url && (
                          <a
                            href={h.fuente_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 shrink-0 font-medium"
                            title="Abrir fuente original"
                          >
                            <span>Fuente</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                    No hay hitos registrados en la cronología de este tema.
                  </p>
                )}
              </div>

              {/* Crónica Periodística de Fondo */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Crónica Periodística de Fondo</span>
                  </span>
                  {detallePopupDossier.cronica_html && detallePopupDossier.cronica_html.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const tempEl = document.createElement('div');
                        tempEl.innerHTML = detallePopupDossier.cronica_html || '';
                        navigator.clipboard.writeText(tempEl.textContent || tempEl.innerText || '');
                        setCopiedCronica(true);
                        setTimeout(() => setCopiedCronica(false), 2000);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      {copiedCronica ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCronica ? 'Copiado' : 'Copiar texto'}</span>
                    </button>
                  )}
                </div>

                {detallePopupDossier.cronica_html && detallePopupDossier.cronica_html.trim().length > 0 ? (
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 max-h-56 overflow-y-auto">
                    <div
                      dangerouslySetInnerHTML={{ __html: detallePopupDossier.cronica_html }}
                      className="prose prose-xs max-w-none space-y-2 leading-relaxed text-slate-800"
                    />
                  </div>
                ) : (
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400 italic">
                    Este tema aún no posee una crónica de fondo redactada. Haz clic en "Editar Seguimiento Completo" para redactarla con el editor enriquecido.
                  </div>
                )}
              </div>

              {/* Media y Nanobanana */}
              {(detallePopupDossier.media?.imagen_url || detallePopupDossier.prompt_nanobanana || detallePopupDossier.media?.prompt_nanobanana) && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-700" />
                    <span>Media &amp; Arte Nanobanana</span>
                  </span>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-start">
                    {detallePopupDossier.media?.imagen_url?.trim() ? (
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                        <img
                          src={detallePopupDossier.media.imagen_url.trim()}
                          referrerPolicy="no-referrer"
                          alt={detallePopupDossier.titulo}
                          className="w-full h-full object-cover"
                          onError={(e) => handleImageErrorWithProxy(e, detallePopupDossier.media?.imagen_url)}
                        />
                      </div>
                    ) : null}
                    <div className="space-y-1.5 min-w-0 flex-1 text-xs">
                      {detallePopupDossier.media?.credito && (
                        <p className="text-slate-500 font-medium">
                          Crédito: <span className="text-slate-800">{detallePopupDossier.media.credito}</span>
                        </p>
                      )}
                      {(detallePopupDossier.prompt_nanobanana || detallePopupDossier.media?.prompt_nanobanana) && (
                        <div className="p-2.5 bg-purple-50/70 border border-purple-200/80 rounded-lg">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-purple-900 mb-0.5">
                            <Sparkles className="w-3 h-3 text-purple-700" />
                            <span>Prompt Nanobanana (Ilustración 2D):</span>
                          </div>
                          <p className="font-mono text-[11px] text-purple-950 leading-relaxed italic">
                            "{detallePopupDossier.prompt_nanobanana || detallePopupDossier.media?.prompt_nanobanana}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDetallePopupDossier(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = detallePopupDossier;
                  setDetallePopupDossier(null);
                  handleEdit(d);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Seguimiento Completo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
