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
} from 'lucide-react';
import { Noticia, AreaId, Fuente, Dossier } from '../types/index.js';
import { NoticiaModal } from './NoticiaModal.js';

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
];

export const NoticiasView: React.FC<NoticiasViewProps> = ({ fuentes, dossiers }) => {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedFuente, setSelectedFuente] = useState<string>('');
  const [selectedDossier, setSelectedDossier] = useState<string>('');
  const [selectedFoto, setSelectedFoto] = useState<string>('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [noticiaAEditar, setNoticiaAEditar] = useState<Noticia | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNoticias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedArea) params.append('area_id', selectedArea);
      if (selectedFuente) params.append('fuente_id', selectedFuente);
      if (selectedDossier) params.append('dossier_id', selectedDossier);
      if (selectedFoto === 'con_foto') params.append('con_foto', 'true');
      if (selectedFoto === 'sin_foto') params.append('con_foto', 'false');

      const res = await fetch(`/api/noticias?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar noticias de Firestore');
      const data = await res.json();
      setNoticias(data.data || []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
    } finally {
      setLoading(false);
    }
  }, [search, selectedArea, selectedFuente, selectedDossier, selectedFoto]);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por titular, hecho central o delta..."
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
            <option value="">Todas las áreas temáticas</option>
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

          {/* Dossier */}
          <select
            value={selectedDossier}
            onChange={(e) => setSelectedDossier(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Todos los dossiers ({dossiers.length})</option>
            {dossiers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.titulo}
              </option>
            ))}
          </select>

          {/* Filtro Foto */}
          <select
            value={selectedFoto}
            onChange={(e) => setSelectedFoto(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 font-medium"
          >
            <option value="">Fotos: Todas</option>
            <option value="con_foto">📷 Con foto asignada</option>
            <option value="sin_foto">🚫 Sin foto asignada</option>
          </select>
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
                  <th className="py-3 px-4 w-28">Fecha</th>
                  <th className="py-3 px-4">Titular / Hecho Central</th>
                  <th className="py-3 px-4 w-40">Fuente</th>
                  <th className="py-3 px-4 w-36">Área</th>
                  <th className="py-3 px-4 w-44">Delta / Novedad</th>
                  <th className="py-3 px-4 w-24 text-center">Foto</th>
                  <th className="py-3 px-4 w-24 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {noticias.map((item) => {
                  const fotoUrl = item.media?.imagen_url || item.imagen_url || item.foto;
                  const fechaDisplay = item.fecha_publicacion || item.fecha || 'S/F';
                  const fuenteNombre = item.fuente?.nombre || (Array.isArray(item.medio) ? (item.medio[1] as string) : typeof item.medio === 'string' ? item.medio : '') || 'S/D';
                  const fuenteUrl = item.fuente?.url_nota || item.url || (Array.isArray(item.medio) && typeof item.medio[5] === 'string' ? item.medio[5] : '');
                  const areaDisplay = item.area || AREAS.find(a => a.id === item.area_id)?.label || item.area_id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 font-medium">
                        {fechaDisplay}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">{item.titular}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {item.hecho_central}
                        </div>
                        {item.dossier_id && (
                          <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                            Dossier: {item.dossier_id}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 truncate" title={fuenteNombre}>
                          {fuenteNombre}
                        </div>
                        {fuenteUrl && (
                          <a
                            href={fuenteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            Nota original <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 text-[10px] font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-200/60 whitespace-nowrap">
                          {areaDisplay}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {item.novedad_respecto_a_dias_previos ? (
                          <span className="line-clamp-2 text-[11px] italic bg-amber-50/70 p-1 rounded-sm border-l-2 border-amber-500">
                            {item.novedad_respecto_a_dias_previos}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Sin delta</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {fotoUrl ? (
                          <div className="flex flex-col items-center gap-1">
                            <a
                              href={fotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block relative group"
                              title="Ver foto completa"
                            >
                              <img
                                src={fotoUrl}
                                alt="Foto"
                                className="w-10 h-10 object-cover rounded-md border border-emerald-300 shadow-2xs group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.onerror = null;
                                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40' fill='%23f1f5f9'%3E%3Crect width='100%25' height='100%25' fill='%23f8fafc' stroke='%23cbd5e1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='8' fill='%2394a3b8'%3EIMG%3C/text%3E%3C/svg%3E";
                                }}
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
                              className="w-10 h-10 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-md flex items-center justify-center border border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer group"
                              title="Hacer clic para asignar una foto"
                            >
                              <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                            <span className="text-[9px] text-slate-400 font-medium">
                              Sin foto
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar o reemplazar foto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
    </div>
  );
};
