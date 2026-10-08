import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar, Star, Tag, Clock, MapPin, DollarSign, Globe, Info } from 'lucide-react';
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
  { id: 'gratuito', label: 'Gratuito (Entrada Libre)' },
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
  const [tipoAcceso, setTipoAcceso] = useState<TipoAccesoAgenda>('gratuito');
  const [arancelEstimado, setArancelEstimado] = useState('Entrada libre');
  const [descripcionCorta, setDescripcionCorta] = useState('');
  const [urlInfo, setUrlInfo] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [estado, setEstado] = useState<EstadoEventoAgenda>('vigente');
  const [destacado, setDestacado] = useState(false);

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
      setTipoAcceso(eventoAEditar.tipo_acceso || 'gratuito');
      setArancelEstimado(eventoAEditar.arancel_estimado || (eventoAEditar.tipo_acceso === 'gratuito' ? 'Entrada libre' : ''));
      setDescripcionCorta(eventoAEditar.descripcion_corta || '');
      setUrlInfo(eventoAEditar.url_info || '');
      setImagenUrl(eventoAEditar.imagen_url || '');
      setEstado(eventoAEditar.estado || 'vigente');
      setDestacado(Boolean(eventoAEditar.destacado));
    } else {
      const hoy = new Date().toISOString().split('T')[0];
      setTitulo('');
      setCategoria('cultura');
      setFechaInicio(hoy);
      setFechaFin(hoy);
      setHorario('20:00 hs');
      setLugar('');
      setTipoAcceso('gratuito');
      setArancelEstimado('Entrada libre');
      setDescripcionCorta('');
      setUrlInfo('');
      setImagenUrl('');
      setEstado('vigente');
      setDestacado(false);
    }
    setError(null);
  }, [eventoAEditar, isOpen]);

  // Manejo de cambio en Tipo de Acceso para sugerir arancel
  const handleTipoAccesoChange = (nuevoTipo: TipoAccesoAgenda) => {
    setTipoAcceso(nuevoTipo);
    if (nuevoTipo === 'gratuito' && (!arancelEstimado || arancelEstimado.trim() === '')) {
      setArancelEstimado('Entrada libre');
    } else if (nuevoTipo === 'con_inscripcion' && (!arancelEstimado || arancelEstimado === 'Entrada libre')) {
      setArancelEstimado('Gratuito c/ inscripción');
    }
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

    setError(null);
    setSaving(true);

    try {
      await onSave({
        titulo: cleanTitulo,
        categoria,
        fecha_inicio: fechaInicio,
        fecha_fin: finEfectivo,
        horario: horario.trim(),
        lugar: lugar.trim(),
        tipo_acceso: tipoAcceso,
        arancel_estimado: arancelEstimado.trim() || (tipoAcceso === 'gratuito' ? 'Entrada libre' : undefined),
        descripcion_corta: descripcionCorta.trim(),
        url_info: urlInfo.trim(),
        imagen_url: imagenUrl || undefined,
        estado,
        destacado,
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
                {eventoAEditar ? 'Editar Evento de Agenda' : 'Nuevo Evento de Cartelera'}
              </h2>
              <p className="text-xs text-slate-500">
                Gestión directa en colección Firestore <code className="text-blue-800 font-mono">agenda</code>
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
              placeholder="Ej: Concierto de Primavera en Camping Musical / Carrera 4 Refugios"
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
                Estado Temporal *
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
              <span>Cronograma y Horario</span>
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

          {/* Lugar en Bariloche */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Lugar / Espacio Físico en Bariloche *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="Ej: Sala Rautenstrauch (Camping Musical Bariloche) / Centro Cívico / Cerro Catedral"
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
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
                Arancel Estimado / Boletería
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Ej: Entrada libre / $3.500 anticipadas / $5.000 puerta"
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

          {/* URL Info duradera */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              URL de Más Información / Entradas / Redes
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="url"
                placeholder="https://instagram.com/p/... o link oficial a boletería"
                value={urlInfo}
                onChange={(e) => setUrlInfo(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
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
              helperText="Sube el archivo del afiche directo a Firebase Storage / servidor o ingresa una URL web con previsualización."
            />
          </div>
        </form>

        {/* Footer del Modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between rounded-b-2xl">
          <div className="text-[11px] text-slate-500">
            ID doc sugerido: <span className="font-mono text-blue-900">{fechaInicio}_...</span>
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
