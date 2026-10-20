import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Loader2,
  Calendar,
  Star,
  Tag,
  Clock,
  MapPin,
  DollarSign,
  Globe,
  Info,
  Map,
  Ticket,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { EventoAgenda, CategoriaAgenda, TipoAccesoAgenda, EstadoEventoAgenda } from '../types/index.js';
import { DualImageSelector } from './DualImageSelector.js';

interface EventoModalProps {
  isOpen: boolean;
  eventoAEditar: EventoAgenda | null;
  onClose: () => void;
  onSave: (evento: Partial<EventoAgenda>) => Promise<void>;
}

const CATEGORIAS: { id: CategoriaAgenda; label: string; color: string }[] = [
  { id: 'cultura', label: 'Cultura y Espectáculos', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'deportes', label: 'Deportes y Aventura', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'capacitacion', label: 'Capacitación y Charlas', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'institucional', label: 'Institucional y Comunitario', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
];

const TIPOS_ACCESO: { id: TipoAccesoAgenda; label: string }[] = [
  { id: 'gratuito', label: 'Gratuito (Entrada Libre y Gratuita)' },
  { id: 'arancelado', label: 'Arancelado (Con Entrada / Boletería)' },
  { id: 'con_inscripcion', label: 'Con Inscripción Previa' },
];

const ESTADOS: { id: EstadoEventoAgenda; label: string; badge: string }[] = [
  { id: 'vigente', label: 'Vigente (Próximo / En cartelera)', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'hoy', label: 'Hoy (Se realiza hoy)', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'concluido', label: 'Concluido (Finalizado)', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
];

export const EventoModal: React.FC<EventoModalProps> = ({
  isOpen,
  eventoAEditar,
  onClose,
  onSave,
}) => {
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<CategoriaAgenda>('cultura');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [horario, setHorario] = useState('');
  const [lugar, setLugar] = useState('');
  const [direccion, setDireccion] = useState('');
  const [mapaUrl, setMapaUrl] = useState('');
  const [tipoAcceso, setTipoAcceso] = useState<TipoAccesoAgenda>('gratuito');
  const [arancelEstimado, setArancelEstimado] = useState('Entrada libre y gratuita');
  const [descripcionCorta, setDescripcionCorta] = useState('');
  const [urlInfo, setUrlInfo] = useState('');
  const [urlTickets, setUrlTickets] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [estado, setEstado] = useState<EstadoEventoAgenda>('vigente');
  const [destacado, setDestacado] = useState(false);
  const [noticiaOrigenId, setNoticiaOrigenId] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventoAEditar) {
      setTitulo(eventoAEditar.titulo || '');
      setCategoria(eventoAEditar.categoria || 'cultura');
      setFechaInicio(eventoAEditar.fecha_inicio || new Date().toISOString().split('T')[0]);
      setFechaFin(eventoAEditar.fecha_fin || eventoAEditar.fecha_inicio || '');
      setHorario(eventoAEditar.horario || '');
      setLugar(eventoAEditar.lugar || '');
      setDireccion(eventoAEditar.direccion || '');
      setMapaUrl(eventoAEditar.mapa_url || '');
      setTipoAcceso(eventoAEditar.tipo_acceso || 'gratuito');
      setArancelEstimado(eventoAEditar.arancel_estimado || (eventoAEditar.tipo_acceso === 'gratuito' ? 'Entrada libre y gratuita' : ''));
      setDescripcionCorta(eventoAEditar.descripcion_corta || '');
      setUrlInfo(eventoAEditar.url_info || '');
      setUrlTickets(eventoAEditar.url_tickets || '');
      setImagenUrl(eventoAEditar.imagen_url || '');
      setEstado(eventoAEditar.estado || 'vigente');
      setDestacado(Boolean(eventoAEditar.destacado));
      setNoticiaOrigenId(eventoAEditar.noticia_origen_id || '');
    } else {
      const hoy = new Date().toISOString().split('T')[0];
      setTitulo('');
      setCategoria('cultura');
      setFechaInicio(hoy);
      setFechaFin(hoy);
      setHorario('20:00 hs');
      setLugar('');
      setDireccion('');
      setMapaUrl('');
      setTipoAcceso('gratuito');
      setArancelEstimado('Entrada libre y gratuita');
      setDescripcionCorta('');
      setUrlInfo('');
      setUrlTickets('');
      setImagenUrl('');
      setEstado('vigente');
      setDestacado(false);
      setNoticiaOrigenId('');
    }
    setError(null);
  }, [eventoAEditar, isOpen]);

  // Manejo de cambio en Tipo de Acceso para sugerir arancel
  const handleTipoAccesoChange = (nuevoTipo: TipoAccesoAgenda) => {
    setTipoAcceso(nuevoTipo);
    if (nuevoTipo === 'gratuito' && (!arancelEstimado || arancelEstimado.trim() === '')) {
      setArancelEstimado('Entrada libre y gratuita');
    } else if (nuevoTipo === 'con_inscripcion' && (!arancelEstimado || arancelEstimado === 'Entrada libre y gratuita')) {
      setArancelEstimado('Gratuito c/ inscripción previa');
    }
  };

  // Autogeneración automática del enlace a Google Maps Search
  const handleAutogenerarMapa = () => {
    const query = `${lugar || ''} ${direccion || ''} San Carlos de Bariloche`.trim().replace(/\s+/g, ' ');
    if (!query) {
      setError('Por favor indica primero el Lugar o la Dirección en Bariloche.');
      return;
    }
    const generado = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    setMapaUrl(generado);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitulo = titulo.trim();
    if (!cleanTitulo) {
      setError('El título del evento es obligatorio.');
      return;
    }

    if (!fechaInicio) {
      setError('La fecha de inicio es requerida.');
      return;
    }

    const finEfectivo = fechaFin || fechaInicio;
    if (finEfectivo < fechaInicio) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    if (!lugar.trim()) {
      setError('El lugar o espacio físico en Bariloche es obligatorio.');
      return;
    }

    if (!descripcionCorta.trim()) {
      setError('La descripción corta del evento es obligatoria.');
      return;
    }

    if (descripcionCorta.length > 200) {
      setError('La descripción no puede exceder los 200 caracteres.');
      return;
    }

    // Validación profunda de url_info
    const cleanUrlInfo = urlInfo.trim();
    if (!cleanUrlInfo) {
      setError('El enlace web oficial o de referencia (url_info) es obligatorio.');
      return;
    }
    try {
      const parsed = new URL(cleanUrlInfo);
      if (!parsed.protocol.startsWith('http')) {
        setError('El enlace url_info debe comenzar con http:// o https://');
        return;
      }
    } catch {
      setError('La URL proporcionada en url_info no tiene un formato web válido.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // Autogenerar mapa_url si quedó vacío
      const finalMapaUrl = mapaUrl.trim()
        ? mapaUrl.trim()
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${lugar.trim()} ${direccion.trim()} San Carlos de Bariloche`.trim()
          )}`;

      await onSave({
        titulo: cleanTitulo,
        categoria,
        fecha_inicio: fechaInicio,
        fecha_fin: finEfectivo,
        horario: horario.trim(),
        lugar: lugar.trim(),
        direccion: direccion.trim() || undefined,
        mapa_url: finalMapaUrl,
        tipo_acceso: tipoAcceso,
        arancel_estimado: arancelEstimado.trim() || (tipoAcceso === 'gratuito' ? 'Entrada libre y gratuita' : undefined),
        descripcion_corta: descripcionCorta.trim(),
        url_info: cleanUrlInfo,
        url_tickets: urlTickets.trim() || null,
        imagen_url: imagenUrl || null,
        estado,
        destacado,
        noticia_origen_id: noticiaOrigenId.trim() || undefined,
        curada_manualmente: true,
        sincronizado_firestore: true,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error al guardar el evento en Firestore');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col border border-slate-200">
        {/* Header del Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-900">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {eventoAEditar ? 'Editar Evento de Cartelera' : 'Nuevo Evento de Cartelera'}
              </h2>
              <p className="text-xs text-slate-500">
                Gestión en Firestore <code className="text-blue-800 font-mono">agenda</code> (Filtro por fecha_fin &gt;= hoy)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Título del Evento *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Muestra Textil en el SCUM / Festival Pichi Keche / Concierto en Camping Musical"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Fila: Categoría y Estado Temporal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Categoría Temática *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaAgenda)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Estado Temporal
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoEventoAgenda)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
              >
                {ESTADOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fechas y Horario */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-800" />
              <span>Cronograma & Duración (Vigente mientras fecha_fin &gt;= hoy)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fecha Inicio *
                </label>
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value);
                    if (!fechaFin || fechaFin < e.target.value) {
                      setFechaFin(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fecha Fin *
                </label>
                <input
                  type="date"
                  required
                  min={fechaInicio}
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Horario (Texto libre)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 21:00 hs / 10 a 18 hs"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          {/* UBICACIÓN: Lugar, Dirección y Mapa URL */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-800" />
              <span>Ubicación en Bariloche & Georreferenciación</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Lugar o Espacio Físico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: SCUM / Camping Musical Bariloche / Biblioteca Sarmiento"
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Dirección Exacta (Calle y altura / Km)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Moreno y Villegas / Av. Bustillo Km 25"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Mapa URL con Autogeneración */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Map className="w-3.5 h-3.5 text-blue-900" />
                  <span>Link Directo a Google Maps Search</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutogenerarMapa}
                  className="text-[11px] font-bold text-blue-900 hover:text-blue-700 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs hover:bg-blue-50 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-blue-700" />
                  <span>Autogenerar Mapa</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://www.google.com/maps/search/?api=1&query=..."
                  value={mapaUrl}
                  onChange={(e) => setMapaUrl(e.target.value)}
                  className="w-full pl-3 pr-20 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                {mapaUrl && (
                  <a
                    href={mapaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1.5 text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <ExternalLink className="w-3 h-3" /> Probar
                  </a>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Si se deja vacío, se autogenerará con el lugar y la dirección de San Carlos de Bariloche.
              </span>
            </div>
          </div>

          {/* Acceso y Arancel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Tipo de Acceso *
              </label>
              <select
                value={tipoAcceso}
                onChange={(e) => handleTipoAccesoChange(e.target.value as TipoAccesoAgenda)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {TIPOS_ACCESO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Arancel Estimado / Costo
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Ej: $15.000 / Entrada libre y gratuita / A la gorra"
                  value={arancelEstimado}
                  onChange={(e) => setArancelEstimado(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Descripción Corta con Contador (Max 200) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Descripción Corta * (Resumen para Cartelera)
              </label>
              <span
                className={`text-[11px] font-mono ${
                  descripcionCorta.length > 200
                    ? 'text-red-600 font-bold'
                    : descripcionCorta.length >= 170
                    ? 'text-amber-600 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {descripcionCorta.length} / 200 caracteres
              </span>
            </div>
            <textarea
              rows={2}
              required
              maxLength={200}
              placeholder="Síntesis concisa del evento para la cartelera comunitaria y newsletter..."
              value={descripcionCorta}
              onChange={(e) => setDescripcionCorta(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* URL Info (Profundo) y URL Tickets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Enlace Profundo Verificado (url_info) *
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  required
                  placeholder="https://medio.com/nota-evento o link profundo a cartelera"
                  value={urlInfo}
                  onChange={(e) => setUrlInfo(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Debe ser un enlace profundo a la nota o gacetilla específica.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Boletería / Inscripción (url_tickets)
              </label>
              <div className="relative">
                <Ticket className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  placeholder="https://passline.com/... o entradaweb / formulario"
                  value={urlTickets}
                  onChange={(e) => setUrlTickets(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Opcional: boletería electrónica o inscripción previa.
              </span>
            </div>
          </div>

          {/* Destacado */}
          <div className="flex items-center gap-3 p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
            <input
              type="checkbox"
              id="evento-destacado"
              checked={destacado}
              onChange={(e) => setDestacado(e.target.checked)}
              className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-600 cursor-pointer"
            />
            <label htmlFor="evento-destacado" className="text-xs text-slate-800 cursor-pointer select-none">
              <span className="font-bold flex items-center gap-1.5 text-amber-900">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Evento Destacado
              </span>
              <span className="text-[11px] text-slate-600 block">
                Prioriza la visibilidad en el bloque de cartelera del newsletter y cabecera de la web.
              </span>
            </label>
          </div>

          {/* SELECTOR DUAL DE IMAGEN / FLYER */}
          <div className="pt-2">
            <DualImageSelector
              label="Flyer o Afiche del Evento (Selector Dual Obligatorio)"
              value={imagenUrl}
              onChange={(url) => setImagenUrl(url)}
              folder="agenda"
              helperText="Sube el archivo del afiche directo a Firebase Storage (agenda/YYYY/MM) o ingresa una URL web con previsualización."
            />
          </div>
        </form>

        {/* Footer del Modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between rounded-b-2xl">
          <div className="text-[11px] text-slate-500">
            ID sugerido: <span className="font-mono text-blue-900">{fechaInicio}_...</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Guardar en Agenda
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
