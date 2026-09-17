import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Mail } from 'lucide-react';
import { EdicionNewsletter, EstadoEdicion, Dossier } from '../types/index.js';

interface EdicionModalProps {
  isOpen: boolean;
  edicionAEditar: EdicionNewsletter | null;
  dossiers: Dossier[];
  onClose: () => void;
  onSave: (edicion: Partial<EdicionNewsletter>) => Promise<void>;
}

export const EdicionModal: React.FC<EdicionModalProps> = ({
  isOpen,
  edicionAEditar,
  dossiers,
  onClose,
  onSave,
}) => {
  const [semana, setSemana] = useState(1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [fechaPublicacion, setFechaPublicacion] = useState(new Date().toISOString().split('T')[0]);
  const [asunto, setAsunto] = useState('');
  const [heroResumen, setHeroResumen] = useState('');
  const [estado, setEstado] = useState<EstadoEdicion>('borrador');
  const [dossiersCubiertos, setDossiersCubiertos] = useState<string[]>([]);
  const [htmlContent, setHtmlContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (edicionAEditar) {
      setSemana(edicionAEditar.semana ?? 1);
      setAnio(edicionAEditar.anio ?? new Date().getFullYear());
      setFechaPublicacion(edicionAEditar.fecha_publicacion || new Date().toISOString().split('T')[0]);
      setAsunto(edicionAEditar.asunto || '');

      const hr = edicionAEditar.hero_resumen;
      if (typeof hr === 'string') {
        setHeroResumen(hr || '');
      } else if (hr && typeof hr === 'object') {
        setHeroResumen(hr.titulo || JSON.stringify(hr) || '');
      } else {
        setHeroResumen('');
      }

      const rawEstado = edicionAEditar.estado as string;
      setEstado(rawEstado === 'enviado_a_suscriptores' ? 'enviado' : edicionAEditar.estado || 'borrador');
      setDossiersCubiertos(edicionAEditar.dossiers_cubiertos || []);
      setHtmlContent(edicionAEditar.html_content || '');
    } else {
      const now = new Date();
      setSemana(1);
      setAnio(now.getFullYear());
      setFechaPublicacion(now.toISOString().split('T')[0]);
      setAsunto('');
      setHeroResumen('');
      setEstado('borrador');
      setDossiersCubiertos([]);
      setHtmlContent('');
    }
  }, [edicionAEditar, isOpen]);

  const toggleDossier = (slug: string) => {
    if (dossiersCubiertos.includes(slug)) {
      setDossiersCubiertos(dossiersCubiertos.filter((s) => s !== slug));
    } else {
      setDossiersCubiertos([...dossiersCubiertos, slug]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asunto.trim() || !heroResumen.trim()) {
      setError('Por favor completa el Asunto y el Hero Resumen.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        semana: Number(semana),
        anio: Number(anio),
        fecha_publicacion: fechaPublicacion,
        asunto: asunto.trim(),
        hero_resumen: heroResumen.trim(),
        estado,
        dossiers_cubiertos: dossiersCubiertos,
        html_content: htmlContent,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error al guardar la edición');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-bold text-slate-800">
              {edicionAEditar ? `Editar Edición: ${edicionAEditar.id}` : 'Nueva Edición de Newsletter'}
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

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Semana (1-52)
              </label>
              <input
                type="number"
                min={1}
                max={52}
                required
                value={semana ?? 1}
                onChange={(e) => setSemana(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Año
              </label>
              <input
                type="number"
                required
                value={anio ?? new Date().getFullYear()}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Fecha Emisión
              </label>
              <input
                type="date"
                required
                value={fechaPublicacion || ''}
                onChange={(e) => setFechaPublicacion(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Estado
              </label>
              <select
                value={estado || 'borrador'}
                onChange={(e) => setEstado(e.target.value as EstadoEdicion)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="borrador">Borrador</option>
                <option value="programado">Programado</option>
                <option value="enviado">Enviado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Asunto del Correo (Subject line) *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Bariloche Semanal #42: El nuevo pliego del cerro y la temporada de invierno"
              value={asunto || ''}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Hero Resumen Ejecutivo (Preheader / Apertura) *
            </label>
            <textarea
              rows={3}
              required
              placeholder="El pulso de la semana en 3 frases con alto impacto y datos clave..."
              value={heroResumen || ''}
              onChange={(e) => setHeroResumen(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          {/* Selección de dossiers cubiertos */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              Dossiers Cubiertos en esta Edición
            </label>
            {dossiers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dossiers.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 text-xs cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={dossiersCubiertos.includes(d.id)}
                      onChange={() => toggleDossier(d.id)}
                      className="rounded text-blue-900"
                    />
                    <span className="font-semibold text-slate-800 truncate">{d.titulo}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No hay dossiers activos para vincular.</p>
            )}
          </div>

          {/* HTML Content */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Contenido HTML de la Edición
            </label>
            <textarea
              rows={8}
              value={htmlContent || ''}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="<div style='font-family:sans-serif;'>...</div>"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>
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
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Edición
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
