import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar } from 'lucide-react';
import { EventoAgenda, CategoriaAgenda, TipoAccesoAgenda } from '../types/index.js';
import { DualImageSelector } from './DualImageSelector.js';

interface EventoModalProps {
  isOpen: boolean;
  eventoAEditar: EventoAgenda | null;
  onClose: () => void;
  onSave: (evento: Partial<EventoAgenda>) => Promise<void>;
}

const CATEGORIAS: { id: CategoriaAgenda; label: string }[] = [
  { id: 'cultura', label: 'Cultura y Espectáculos' },
  { id: 'deportes', label: 'Deportes y Aventura' },
  { id: 'institucional', label: 'Institucional y Comunitario' },
  { id: 'capacitacion', label: 'Capacitación y Charlas' },
];

const TIPOS_ACCESO: { id: TipoAccesoAgenda; label: string }[] = [
  { id: 'gratuito', label: 'Gratuito / Entrada Libre' },
  { id: 'arancelado', label: 'Arancelado / Con Entrada' },
  { id: 'con_inscripcion', label: 'Con Inscripción Previa' },
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
  const [descripcionCorta, setDescripcionCorta] = useState('');
  const [urlInfo, setUrlInfo] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
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
      setDescripcionCorta(eventoAEditar.descripcion_corta || '');
      setUrlInfo(eventoAEditar.url_info || '');
      setImagenUrl(eventoAEditar.imagen_url || '');
    } else {
      setTitulo('');
      setCategoria('cultura');
      setFechaInicio(new Date().toISOString().split('T')[0]);
      setFechaFin(new Date().toISOString().split('T')[0]);
      setHorario('');
      setLugar('');
      setTipoAcceso('gratuito');
      setDescripcionCorta('');
      setUrlInfo('');
      setImagenUrl('');
    }
  }, [eventoAEditar, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !fechaInicio || !lugar.trim() || !descripcionCorta.trim()) {
      setError('Por favor completa los campos requeridos.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        titulo,
        categoria,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || fechaInicio,
        horario,
        lugar,
        tipo_acceso: tipoAcceso,
        descripcion_corta: descripcionCorta,
        url_info: urlInfo,
        imagen_url: imagenUrl || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error al guardar el evento');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-800" />
            <h2 className="text-base font-bold text-slate-800">
              {eventoAEditar ? 'Editar Evento de Agenda' : 'Nuevo Evento de Cartelera'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Título del Evento *
            </label>
            <input
              type="text"
              required
              value={titulo || ''}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Fiesta Nacional de la Nieve - Apertura Oficial"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Categoría *
              </label>
              <select
                value={categoria || 'cultura'}
                onChange={(e) => setCategoria(e.target.value as CategoriaAgenda)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
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
                Tipo de Acceso *
              </label>
              <select
                value={tipoAcceso || 'gratuito'}
                onChange={(e) => setTipoAcceso(e.target.value as TipoAccesoAgenda)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {TIPOS_ACCESO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Fecha Inicio *
              </label>
              <input
                type="date"
                required
                value={fechaInicio || ''}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Fecha Fin *
              </label>
              <input
                type="date"
                required
                value={fechaFin || ''}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Horario
              </label>
              <input
                type="text"
                placeholder="Ej: 19:30 hs"
                value={horario || ''}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Lugar / Espacio Físico en Bariloche *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Centro Cívico / Sala Rautenstrauch (Camping Musical)"
              value={lugar || ''}
              onChange={(e) => setLugar(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Descripción Corta *
            </label>
            <textarea
              rows={2}
              required
              placeholder="Breve reseña del evento para la agenda comunitaria..."
              value={descripcionCorta || ''}
              onChange={(e) => setDescripcionCorta(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              URL de Más Información / Entradas
            </label>
            <input
              type="url"
              placeholder="https://bariloche.gov.ar/agenda o link a boletería"
              value={urlInfo || ''}
              onChange={(e) => setUrlInfo(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>

          {/* SELECTOR DUAL DE IMAGEN (FLYER) */}
          <DualImageSelector
            label="Flyer o Afiche del Evento (Selector Dual Obligatorio)"
            value={imagenUrl || ''}
            onChange={(url) => setImagenUrl(url)}
            helperText="Sube el archivo del afiche directo a Firebase Storage o ingresa una URL web."
          />
        </form>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando en Firestore...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Evento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
