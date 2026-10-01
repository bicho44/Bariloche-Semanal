import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Loader2,
  Mail,
  Eye,
  Code,
  Heading,
  Bold,
  Italic,
  List,
  Quote,
  Link,
  Sparkles,
  FileText,
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
      setActiveTab('editor');
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
      setActiveTab('editor');
    }
  }, [edicionAEditar, isOpen]);

  const toggleDossier = (slug: string) => {
    if (dossiersCubiertos.includes(slug)) {
      setDossiersCubiertos(dossiersCubiertos.filter((s) => s !== slug));
    } else {
      setDossiersCubiertos([...dossiersCubiertos, slug]);
    }
  };

  const insertHtmlTag = (openTag: string, closeTag: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = htmlContent.substring(start, end);
    const replacement = `${openTag}${selectedText || 'texto'}${closeTag}`;

    const newHtml = htmlContent.substring(0, start) + replacement + htmlContent.substring(end);
    setHtmlContent(newHtml);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + (selectedText.length || 5));
    }, 50);
  };

  const handleCargarPlantillaBase = () => {
    if (htmlContent.trim().length > 0 && !window.confirm('¿Reemplazar el contenido actual con la plantilla base de Bariloche Semanal?')) {
      return;
    }

    const template = `<!-- BARILOCHE SEMANAL - PLANTILLA EDICIÓN -->
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; line-height: 1.6;">
  <div style="border-bottom: 3px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 24px;">
    <p style="text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; color: #1e3a8a; font-weight: 700; margin: 0;">Observatorio Periodístico &bull; San Carlos de Bariloche</p>
    <h1 style="font-size: 26px; color: #0f172a; margin: 6px 0 2px 0;">Bariloche Semanal</h1>
    <p style="font-size: 13px; color: #64748b; margin: 0;">Edición N° ${semana} / ${anio} &bull; ${fechaPublicacion}</p>
  </div>

  <div style="background-color: #f8fafc; border-left: 4px solid #1e3a8a; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
    <h3 style="margin-top: 0; color: #1e3a8a; font-size: 15px;">Apertura Semanal</h3>
    <p style="margin-bottom: 0; font-size: 14px; color: #334155;">${heroResumen || 'Resumen ejecutivo de las claves políticas, económicas y sociales de la semana en Bariloche.'}</p>
  </div>

  <h2 style="font-size: 18px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Temas Clave de la Semana</h2>
  <p style="font-size: 14px; color: #334155;">Análisis de fondo y seguimiento de temas estratégicos de la ciudad...</p>

  <h2 style="font-size: 18px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px;">Agenda & Cartelera</h2>
  <p style="font-size: 14px; color: #334155;">Actividades culturales y comunitarias destacadas para el fin de semana.</p>

  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">Bariloche Semanal &bull; Periodismo de datos y análisis local independiente</p>
  </div>
</div>`;

    setHtmlContent(template);
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-bold text-slate-800">
              {edicionAEditar ? `Editar Edición: ${edicionAEditar.id}` : 'Nueva Edición de Newsletter'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
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
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer"
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

          {/* Selección de temas en seguimiento cubiertos */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                Temas en Seguimiento Cubiertos ({dossiersCubiertos.length})
              </label>
              <span className="text-[11px] text-slate-500">Selecciona los temas de fondo cubiertos</span>
            </div>
            {dossiers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {dossiers.map((d) => (
                  <label
                    key={d.id}
                    className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                      dossiersCubiertos.includes(d.id)
                        ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={dossiersCubiertos.includes(d.id)}
                      onChange={() => toggleDossier(d.id)}
                      className="rounded text-blue-900 cursor-pointer"
                    />
                    <span className="truncate">{d.titulo}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No hay temas en seguimiento activos para vincular.</p>
            )}
          </div>

          {/* HTML Content con Editor Rico y Preview */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-900" />
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Cuerpo HTML Compilado del Newsletter
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCargarPlantillaBase}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded cursor-pointer"
                  title="Insertar maquetado estándar de Bariloche Semanal"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Cargar Plantilla Base</span>
                </button>

                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      activeTab === 'editor'
                        ? 'bg-white text-blue-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>Código HTML</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      activeTab === 'preview'
                        ? 'bg-white text-blue-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Vista Previa</span>
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'editor' ? (
              <div className="space-y-1.5">
                {/* Barra de herramientas HTML */}
                <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<h2>', '</h2>')}
                    className="p-1 px-2 hover:bg-white rounded border border-transparent hover:border-slate-300 font-bold text-slate-700 flex items-center gap-1"
                    title="Título H2"
                  >
                    <Heading className="w-3 h-3" /> H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<h3>', '</h3>')}
                    className="p-1 px-2 hover:bg-white rounded border border-transparent hover:border-slate-300 font-bold text-slate-700"
                    title="Subtítulo H3"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<p>', '</p>')}
                    className="p-1 px-2 hover:bg-white rounded border border-transparent hover:border-slate-300 text-slate-700"
                    title="Párrafo"
                  >
                    Párrafo
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<strong>', '</strong>')}
                    className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-300 text-slate-700"
                    title="Negrita"
                  >
                    <Bold className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<em>', '</em>')}
                    className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-300 text-slate-700"
                    title="Cursiva"
                  >
                    <Italic className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<ul>\n  <li>', '</li>\n</ul>')}
                    className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-300 text-slate-700"
                    title="Lista con viñetas"
                  >
                    <List className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<blockquote style="border-left: 3px solid #1e3a8a; padding-left: 12px; color: #475569; font-style: italic;">', '</blockquote>')}
                    className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-300 text-slate-700"
                    title="Cita o Destacado"
                  >
                    <Quote className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<a href="https://" target="_blank" style="color: #1e3a8a; text-decoration: underline;">', '</a>')}
                    className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-300 text-slate-700"
                    title="Enlace"
                  >
                    <Link className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />\n')}
                    className="p-1 px-2 hover:bg-white rounded border border-transparent hover:border-slate-300 text-slate-700 text-[11px]"
                    title="Separador horizontal"
                  >
                    Línea HR
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={9}
                  value={htmlContent || ''}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="<div style='font-family:sans-serif;'>...</div>"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 leading-relaxed"
                />
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
                {htmlContent ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                    className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs"
                  />
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-10">
                    No hay contenido HTML cargado para previsualizar.
                  </p>
                )}
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
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
