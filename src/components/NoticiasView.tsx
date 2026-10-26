import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  Calendar,
  AlertCircle,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  Info,
  Eye,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { Noticia, AreaId, Fuente, Dossier } from '../types/index.js';
import { NoticiaModal } from './NoticiaModal.js';
import { handleImageErrorWithProxy } from '../utils/image.js';

interface NoticiasViewProps {
  fuentes: Fuente[];
  dossiers: Dossier[];
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

export const NoticiasView: React.FC<NoticiasViewProps> = ({ fuentes, dossiers }) => {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedFecha, setSelectedFecha] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedFuente, setSelectedFuente] = useState<string>('');
  const [selectedDossier, setSelectedDossier] = useState<string>('');
  const [selectedFoto, setSelectedFoto] = useState<string>('');
  const [selectedEstadoRedaccion, setSelectedEstadoRedaccion] = useState<string>('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [noticiaAEditar, setNoticiaAEditar] = useState<Noticia | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resumenPopupNoticia, setResumenPopupNoticia] = useState<Noticia | null>(null);
  const [copiedResumen, setCopiedResumen] = useState(false);

  // Cerrar popup de resumen con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setResumenPopupNoticia(null);
      }
    };
    if (resumenPopupNoticia) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resumenPopupNoticia]);

  const fetchNoticias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedFecha) params.append('fecha', selectedFecha);
      if (selectedArea) params.append('area_id', selectedArea);
      if (selectedFuente) params.append('fuente_id', selectedFuente);
      if (selectedDossier) {
        params.append('seguimiento_id', selectedDossier);
        params.append('dossier_id', selectedDossier);
      }
      if (selectedFoto === 'con_foto') params.append('con_foto', 'true');
      if (selectedFoto === 'sin_foto') params.append('con_foto', 'false');
      if (selectedEstadoRedaccion) params.append('estado_redaccion', selectedEstadoRedaccion);

      const res = await fetch(`/api/noticias?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error('Error al cargar noticias de Firestore');
      const data = await res.json();
      setNoticias(data.data || []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
    } finally {
      setLoading(false);
    }
  }, [search, selectedFecha, selectedArea, selectedFuente, selectedDossier, selectedFoto, selectedEstadoRedaccion]);

  useEffect(() => {
    fetchNoticias();
  }, [fetchNoticias]);

  const handleCreate = () => {
    setNoticiaAEditar(null);
    setModalOpen(true);
  };

  const handleEdit = (noticia: Noticia) => {
    setNoticiaAEditar(noticia);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la noticia '${id}'?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/noticias/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al eliminar');
      }
      setNoticias((prev) => prev.filter((n) => n.id !== id));
    } catch (err: unknown) {
      const errorObj = err as Error;
      alert(`Error al eliminar noticia: ${errorObj.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveNoticia = async (noticiaData: Partial<Noticia>) => {
    if (noticiaAEditar) {
      // Actualización
      const res = await fetch(`/api/noticias/${encodeURIComponent(noticiaAEditar.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noticiaData),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al actualizar noticia');
      }
      const actualizada: Noticia = await res.json();
      setNoticias((prev) =>
        prev.map((n) => (n.id === actualizada.id ? actualizada : n))
      );
    } else {
      // Creación
      const res = await fetch('/api/noticias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noticiaData),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al crear noticia');
      }
      const nueva: Noticia = await res.json();
      setNoticias((prev) => [nueva, ...prev]);
    }
    fetchNoticias();
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Noticias de Bariloche</h1>
          <p className="text-xs text-slate-500">
            Observatorio periodístico en Firestore: coleccion <code className="text-blue-700 font-mono">noticias</code>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchNoticias()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Noticia</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
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
              placeholder="Buscar por titular, hecho central..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Filtro Fecha */}
          <div className="relative">
            <input
              type="date"
              value={selectedFecha}
              onChange={(e) => setSelectedFecha(e.target.value)}
              title="Filtrar por fecha exacta"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
            />
            {selectedFecha && (
              <button
                onClick={() => setSelectedFecha('')}
                className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                title="Limpiar fecha"
              >
                ✕
              </button>
            )}
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

          {/* Fuente */}
          <select
            value={selectedFuente}
            onChange={(e) => setSelectedFuente(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Todas las fuentes ({fuentes.length})</option>
            {fuentes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>

          {/* Temas en Seguimiento */}
          <select
            value={selectedDossier}
            onChange={(e) => setSelectedDossier(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Todos los seguimientos ({dossiers.length})</option>
            {dossiers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.titulo}
              </option>
            ))}
          </select>

          {/* Filtros Redacción y Foto combinados en 1 celda para mantener 6 columnas */}
          <div className="flex gap-1.5">
            <select
              value={selectedEstadoRedaccion}
              onChange={(e) => setSelectedEstadoRedaccion(e.target.value)}
              className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 font-medium"
              title="Estado de Redacción"
            >
              <option value="">Redacción: Toda</option>
              <option value="redactada">✅ Redactada</option>
              <option value="pendiente">⏳ Pendiente</option>
            </select>

            <select
              value={selectedFoto}
              onChange={(e) => setSelectedFoto(e.target.value)}
              className="w-1/2 px-1.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 font-medium"
              title="Filtro de Foto"
            >
              <option value="">Fotos: Todas</option>
              <option value="con_foto">📷 Con foto</option>
              <option value="sin_foto">🚫 Sin foto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table & Empty State */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-800 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Consultando colección Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : noticias.length === 0 ? (
          /* CERO DATA SIMULADA: ESTADO VACÍO LIMPIO CON BOTÓN DE CREAR */
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No hay noticias en la colección</h3>
              <p className="text-xs text-slate-500 mt-1">
                La base de datos Firestore en <code className="font-mono text-blue-700">noticias</code> no contiene registros que coincidan con los filtros actuales.
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primera Noticia</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-24 whitespace-nowrap">Fecha</th>
                  <th className="py-3 px-2 w-16 text-center">Foto</th>
                  <th className="py-3 px-4 w-7/12 min-w-[360px]">Titular / Resumen</th>
                  <th className="py-3 px-4 w-52">Fuente &amp; Área</th>
                  <th className="py-3 px-3 w-20 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {noticias.map((item) => {
                  const fotoUrl = item.media?.imagen_url || item.imagen_url || item.foto;
                  const fechaDisplay = item.fecha_publicacion || item.fecha || 'S/F';
                  const fuenteNombre = item.fuente?.nombre || (Array.isArray(item.medio) ? (item.medio[1] as string) : typeof item.medio === 'string' ? item.medio : '') || 'S/D';
                  const fuenteUrl = item.fuente?.url_nota || item.url || (Array.isArray(item.medio) && typeof item.medio[5] === 'string' ? item.medio[5] : '');
                  const areaDisplay = item.area || AREAS.find(a => a.id === item.area_id)?.label || item.area_id;
                  const seguimientoId = item.seguimiento_id || item.dossier_id;
                  const dossierMatch = dossiers.find(d => d.id === seguimientoId);

                  // Recopilar todas las fuentes con sus enlaces
                  const allSources: Array<{ nombre: string; url?: string }> = [];
                  if (Array.isArray(item.fuentes_consultadas) && item.fuentes_consultadas.length > 0) {
                    for (const f of item.fuentes_consultadas) {
                      const n = f.nombre || f.medio || '';
                      if (n || f.url_nota) {
                        allSources.push({ nombre: n || 'Fuente', url: f.url_nota });
                      }
                    }
                  }
                  if (allSources.length === 0 && fuenteNombre && fuenteNombre !== 'S/D') {
                    allSources.push({ nombre: fuenteNombre, url: fuenteUrl });
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Fecha */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-600 font-medium align-top">
                        {fechaDisplay}
                      </td>

                      {/* 2. Foto (después de la fecha y antes del titular) */}
                      <td className="py-3 px-2 text-center align-top">
                        {fotoUrl && fotoUrl.trim() !== '' ? (
                          <div className="flex flex-col items-center gap-1">
                            <a
                              href={fotoUrl.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block relative group"
                              title="Ver foto completa"
                            >
                              <img
                                src={fotoUrl.trim()}
                                referrerPolicy="no-referrer"
                                alt={item.titular}
                                className="w-11 h-11 object-cover rounded-md border border-emerald-300 shadow-2xs group-hover:scale-105 transition-transform"
                                onError={(e) => handleImageErrorWithProxy(e, fotoUrl)}
                              />
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" title="Foto asignada" />
                            </a>
                            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/50">
                              Asignada
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs group"
                              title="Asignar foto local o URL manual"
                            >
                              <ImageIcon className="w-3 h-3 text-amber-600 group-hover:scale-110 transition-transform" />
                              <span>Cargar</span>
                            </button>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 border border-amber-300/80 px-1 py-0.2 rounded whitespace-nowrap">
                              Sin Foto
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. Titular (columna ancha ~2/3 con enlace a edición y resumen corto con popup) */}
                      <td className="py-3 px-4 align-top">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="font-bold text-slate-900 hover:text-blue-900 hover:underline text-left text-xs sm:text-sm leading-snug cursor-pointer transition-colors block group"
                          title="Clic para editar esta noticia"
                        >
                          <span className="group-hover:text-blue-900">{item.titular}</span>
                        </button>

                        {/* Resumen más corto con disparador del popup */}
                        {item.hecho_central && (
                          <div className="mt-1.5 flex flex-wrap items-baseline gap-1 text-[11px] text-slate-600 leading-relaxed">
                            <span className="line-clamp-2">
                              {item.hecho_central}
                            </span>
                            <button
                              type="button"
                              onClick={() => setResumenPopupNoticia(item)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200/90 px-1.5 py-0.5 rounded transition-colors cursor-pointer shrink-0 ml-0.5"
                              title="Ver resumen y detalles completos"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver completo</span>
                            </button>
                          </div>
                        )}

                        {/* Criterio del Domingo */}
                        {item.por_que_importa_el_domingo && (
                          <div className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-900 bg-amber-50/80 border border-amber-200/80 px-2 py-0.5 rounded-md">
                            <span className="shrink-0 font-bold">🎯 Domingo:</span>
                            <span className="line-clamp-1 italic">{item.por_que_importa_el_domingo}</span>
                          </div>
                        )}

                        {/* Badges de soporte: Redactada/Pendiente, Delta, Dossier, Curada */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {/* Pastilla de estado de redacción */}
                          {item.cuerpo_html && item.cuerpo_html.trim().length > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full"
                              title="Cuerpo de redacción HTML completo"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Redactada</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full"
                              title="Pendiente de redacción profunda"
                            >
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pendiente</span>
                            </span>
                          )}

                          {/* Globo informativo de Delta / Novedad */}
                          {item.novedad_respecto_a_dias_previos && (
                            <div className="relative group/delta inline-block">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 transition-colors cursor-help">
                                <Info className="w-3 h-3 text-blue-700 shrink-0" />
                                <span>Delta:</span>
                                <span className="truncate max-w-[160px] font-normal italic">
                                  {item.novedad_respecto_a_dias_previos}
                                </span>
                              </span>
                              {/* Globo flotante emergente */}
                              <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/delta:block z-30 w-80 p-2.5 bg-slate-900 text-slate-100 text-[11px] rounded-lg shadow-xl border border-slate-700 pointer-events-none leading-relaxed animate-in fade-in duration-150">
                                <span className="font-bold text-amber-300 block mb-0.5 flex items-center gap-1">
                                  <Info className="w-3 h-3 text-amber-300" />
                                  <span>Rastreo diferencial (El Delta):</span>
                                </span>
                                {item.novedad_respecto_a_dias_previos}
                              </div>
                            </div>
                          )}

                          {seguimientoId && (
                            <span className="text-[10px] bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md font-medium">
                              📂 {dossierMatch?.titulo || seguimientoId}
                            </span>
                          )}

                          {item.curada_manualmente && (
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded-md" title="Curada y aprobada editorialmente">
                              ✓ Curada
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Fuente & Área unificadas con enlaces a cada fuente */}
                      <td className="py-3 px-4 align-top">
                        <div className="mb-1.5">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-200/60 whitespace-nowrap">
                            {areaDisplay}
                          </span>
                        </div>

                        {allSources.length > 0 ? (
                          <div className="space-y-1">
                            {allSources.map((f, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-medium text-slate-800 truncate max-w-[130px]" title={f.nombre}>
                                  {f.nombre}
                                </span>
                                {f.url ? (
                                  <a
                                    href={f.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5 text-[10px] shrink-0 font-medium"
                                    title={`Abrir nota en ${f.nombre}`}
                                  >
                                    <span>Nota</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : null}
                              </div>
                            ))}
                            {allSources.length > 1 && (
                              <span className="inline-block text-[9px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded mt-0.5">
                                {allSources.length} fuentes consultadas
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Sin fuente asignada</span>
                        )}
                      </td>

                      {/* 5. Columna Acciones */}
                      <td className="py-3 px-3 text-right align-top whitespace-nowrap w-20">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Editar / Redactar noticia"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Eliminar de Firestore"
                          >
                            {deletingId === item.id ? (
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

      {/* Modal de Creación / Edición con Selector Dual de Imagen */}
      <NoticiaModal
        isOpen={modalOpen}
        noticiaAEditar={noticiaAEditar}
        fuentes={fuentes}
        dossiers={dossiers}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveNoticia}
      />

      {/* Popup / Modal de Resumen Completo y Criterio Editorial */}
      {resumenPopupNoticia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setResumenPopupNoticia(null)}
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
                    {resumenPopupNoticia.fecha_publicacion || resumenPopupNoticia.fecha || 'S/F'}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md">
                    {AREAS.find((a) => a.id === resumenPopupNoticia.area_id)?.label || resumenPopupNoticia.area_id}
                  </span>
                  {resumenPopupNoticia.curada_manualmente && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                      ✓ Curada
                    </span>
                  )}
                  {resumenPopupNoticia.cuerpo_html && resumenPopupNoticia.cuerpo_html.trim().length > 0 ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                      ✅ Redactada
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                      ⏳ Pendiente
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {resumenPopupNoticia.titular}
                </h2>
              </div>
              <button
                onClick={() => setResumenPopupNoticia(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Cerrar ventana (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Resumen / Hecho Central Completo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                    <span>Resumen / Hecho Central Completo</span>
                  </span>
                  {resumenPopupNoticia.hecho_central && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resumenPopupNoticia.hecho_central || '');
                        setCopiedResumen(true);
                        setTimeout(() => setCopiedResumen(false), 2000);
                      }}
                      className="text-[11px] text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      {copiedResumen ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedResumen ? 'Copiado' : 'Copiar texto'}</span>
                    </button>
                  )}
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                  {resumenPopupNoticia.hecho_central || (
                    <span className="italic text-slate-400">Sin hecho central registrado.</span>
                  )}
                </div>
              </div>

              {/* Criterio Semanario del Domingo */}
              {resumenPopupNoticia.por_que_importa_el_domingo && (
                <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎯 ¿Por qué importa el domingo? (Criterio Semanario)</span>
                  </span>
                  <p className="text-xs text-amber-950 leading-relaxed italic">
                    {resumenPopupNoticia.por_que_importa_el_domingo}
                  </p>
                </div>
              )}

              {/* Novedad / Delta */}
              {resumenPopupNoticia.novedad_respecto_a_dias_previos && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200/70 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-700" />
                    <span>El Delta (Novedad respecto a días previos)</span>
                  </span>
                  <p className="text-xs text-blue-950 leading-relaxed">
                    {resumenPopupNoticia.novedad_respecto_a_dias_previos}
                  </p>
                </div>
              )}

              {/* Redacción profunda preview si existe */}
              {resumenPopupNoticia.cuerpo_html && resumenPopupNoticia.cuerpo_html.trim().length > 0 && (
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cuerpo Redactado ({resumenPopupNoticia.cuerpo_html.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} palabras)</span>
                  </span>
                  <div
                    className="text-xs text-slate-700 max-h-36 overflow-y-auto p-2 bg-white rounded border border-emerald-100 prose prose-xs"
                    dangerouslySetInnerHTML={{ __html: resumenPopupNoticia.cuerpo_html }}
                  />
                </div>
              )}

              {/* Fuentes y Dossier */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <div>
                  <span className="font-medium text-slate-700">Fuente: </span>
                  <span>{resumenPopupNoticia.fuente?.nombre || 'S/D'}</span>
                  {resumenPopupNoticia.fuente?.url_nota && (
                    <a
                      href={resumenPopupNoticia.fuente.url_nota}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-2 inline-flex items-center gap-0.5"
                    >
                      <span>Ver nota original</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {resumenPopupNoticia.dossier_id && (
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700">
                    📂 Dossier: {resumenPopupNoticia.dossier_id}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResumenPopupNoticia(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const noti = resumenPopupNoticia;
                  setResumenPopupNoticia(null);
                  handleEdit(noti);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Noticia Completa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
