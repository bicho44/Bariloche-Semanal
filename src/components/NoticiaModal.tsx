import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Loader2,
  Image as ImageIcon,
  FileText,
  Eye,
  Code,
  Bold,
  Italic,
  Link2,
  Quote,
  Heading,
  List,
  AlertTriangle,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { Noticia, AreaId, Fuente, Dossier } from '../types/index.js';
import { DualImageSelector } from './DualImageSelector.js';
import { getFechaArgentina } from '../utils/date.js';

interface NoticiaModalProps {
  isOpen: boolean;
  noticiaAEditar: Noticia | null;
  fuentes: Fuente[];
  dossiers: Dossier[];
  onClose: () => void;
  onSave: (noticia: Partial<Noticia>) => Promise<void>;
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

export const NoticiaModal: React.FC<NoticiaModalProps> = ({
  isOpen,
  noticiaAEditar,
  fuentes,
  dossiers,
  onClose,
  onSave,
}) => {
  const [titular, setTitular] = useState('');
  const [fechaPublicacion, setFechaPublicacion] = useState(new Date().toISOString().split('T')[0]);
  const [areaId, setAreaId] = useState<AreaId>('gestion-publica');
  const [fuenteId, setFuenteId] = useState('');
  const [fuenteNombre, setFuenteNombre] = useState('');
  const [urlNota, setUrlNota] = useState('');
  const [dossierId, setDossierId] = useState<string>('');
  const [hechoCentral, setHechoCentral] = useState('');
  const [novedadDelta, setNovedadDelta] = useState('');
  const [cuerpoHtml, setCuerpoHtml] = useState('');
  const [tabCuerpo, setTabCuerpo] = useState<'editor' | 'preview'>('editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [imagenUrl, setImagenUrl] = useState('');
  const [creditoFoto, setCreditoFoto] = useState('');
  const [citas, setCitas] = useState<Array<{ autor: string; texto: string }>>([]);
  const [nuevaCitaAutor, setNuevaCitaAutor] = useState('');
  const [nuevaCitaTexto, setNuevaCitaTexto] = useState('');
  const [datosDurosKey, setDatosDurosKey] = useState('');
  const [datosDurosVal, setDatosDurosVal] = useState('');
  const [datosDuros, setDatosDuros] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (noticiaAEditar) {
      setTitular(noticiaAEditar.titular || '');
      setFechaPublicacion(
        getFechaArgentina(
          noticiaAEditar.fecha_publicacion ||
          noticiaAEditar.fecha ||
          noticiaAEditar.created_at
        )
      );

      // Resolución de Área
      let initialArea: AreaId = 'gestion-publica';
      if (noticiaAEditar.area_id && AREAS.some(a => a.id === noticiaAEditar.area_id)) {
        initialArea = noticiaAEditar.area_id;
      } else {
        const rawArea = (noticiaAEditar.area || noticiaAEditar.area_id || '').toLowerCase();
        if (rawArea.includes('gestion') || rawArea.includes('publica')) initialArea = 'gestion-publica';
        else if (rawArea.includes('turism') || rawArea.includes('pulso')) initialArea = 'turismo';
        else if (rawArea.includes('deport')) initialArea = 'deportes';
        else if (rawArea.includes('alquiler') || rawArea.includes('inmobiliari')) initialArea = 'alquileres-inmobiliario';
        else if (rawArea.includes('social') || rawArea.includes('cultur') || rawArea.includes('comunidad')) initialArea = 'vida-social-cultura';
        else if (rawArea.includes('radar')) initialArea = 'en-el-radar';
        else if (rawArea.includes('legal') || rawArea.includes('comercio')) initialArea = 'legales-comercio';
      }
      setAreaId(initialArea);

      // Resolución de Fuente y URL
      const resolvedFuenteNombre =
        noticiaAEditar.fuente?.nombre ||
        (Array.isArray(noticiaAEditar.medio) && typeof noticiaAEditar.medio[1] === 'string'
          ? (noticiaAEditar.medio[1] as string)
          : typeof noticiaAEditar.medio === 'string'
          ? noticiaAEditar.medio
          : '');

      const resolvedUrlNota =
        noticiaAEditar.fuente?.url_nota ||
        noticiaAEditar.url ||
        (Array.isArray(noticiaAEditar.medio) && typeof noticiaAEditar.medio[5] === 'string'
          ? (noticiaAEditar.medio[5] as string)
          : '');

      const matchedFuente = fuentes.find(
        f => f.id === noticiaAEditar.fuente?.id || f.nombre.toLowerCase() === resolvedFuenteNombre.toLowerCase()
      );
      setFuenteId(matchedFuente ? matchedFuente.id : (noticiaAEditar.fuente?.id || ''));
      setFuenteNombre(resolvedFuenteNombre);
      setUrlNota(resolvedUrlNota);

      setDossierId(noticiaAEditar.seguimiento_id || noticiaAEditar.dossier_id || '');
      setHechoCentral(noticiaAEditar.hecho_central || '');
      setNovedadDelta(noticiaAEditar.novedad_respecto_a_dias_previos || '');
      setCuerpoHtml(noticiaAEditar.cuerpo_html || '');
      setTabCuerpo('editor');

      // Resolución de Imagen y Crédito
      const resolvedImg =
        noticiaAEditar.media?.imagen_url ||
        noticiaAEditar.imagen_url ||
        noticiaAEditar.foto ||
        '';
      setImagenUrl(resolvedImg);
      setCreditoFoto(noticiaAEditar.media?.credito || '');

      setCitas(noticiaAEditar.citas || []);
      setDatosDuros(noticiaAEditar.datos_duros || {});
    } else {
      setTitular('');
      // Forzar zona horaria local de Argentina para evitar saltos tras las 21:00 hs
      setFechaPublicacion(getFechaArgentina());
      setAreaId('gestion-publica');
      setFuenteId(fuentes[0]?.id || '');
      setFuenteNombre(fuentes[0]?.nombre || '');
      setUrlNota('');
      setDossierId('');
      setHechoCentral('');
      setNovedadDelta('');
      setCuerpoHtml('');
      setTabCuerpo('editor');
      setImagenUrl('');
      setCreditoFoto('');
      setCitas([]);
      setDatosDuros({});
    }
  }, [noticiaAEditar, isOpen, fuentes]);

  const insertHtmlTag = (openTag: string, closeTag: string, placeholder = 'texto') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = cuerpoHtml.substring(start, end) || placeholder;
    const replacement = `${openTag}${selectedText}${closeTag}`;
    const newHtml = cuerpoHtml.substring(0, start) + replacement + cuerpoHtml.substring(end);
    setCuerpoHtml(newHtml);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selectedText.length);
    }, 0);
  };

  const handleFuenteSelect = (id: string) => {
    setFuenteId(id);
    const fuente = fuentes.find(f => f.id === id);
    if (fuente) {
      setFuenteNombre(fuente.nombre);
    }
  };

  const handleAddCita = () => {
    if (!nuevaCitaAutor || !nuevaCitaTexto) return;
    setCitas([...citas, { autor: nuevaCitaAutor, texto: nuevaCitaTexto }]);
    setNuevaCitaAutor('');
    setNuevaCitaTexto('');
  };

  const handleRemoveCita = (index: number) => {
    setCitas(citas.filter((_, i) => i !== index));
  };

  const handleAddDatoDuro = () => {
    if (!datosDurosKey || !datosDurosVal) return;
    setDatosDuros({ ...datosDuros, [datosDurosKey]: datosDurosVal });
    setDatosDurosKey('');
    setDatosDurosVal('');
  };

  const handleRemoveDatoDuro = (key: string) => {
    const updated = { ...datosDuros };
    delete updated[key];
    setDatosDuros(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitular = titular.trim();
    if (!cleanTitular || cleanTitular.length < 10) {
      setError('Validación estricta (anti-huérfanas): El titular es obligatorio y debe tener al menos 10 caracteres.');
      return;
    }

    if (!hechoCentral.trim()) {
      setError('Por favor completa el hecho central de la noticia.');
      return;
    }

    if (!fechaPublicacion) {
      setError('Por favor define la fecha de publicación.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // Forzar fecha en zona horaria Argentina
      const fechaArg = getFechaArgentina(fechaPublicacion);
      const sid = dossierId.trim() ? dossierId.trim() : null;

      await onSave({
        titular: cleanTitular,
        fecha_publicacion: fechaArg,
        fecha: fechaArg,
        area_id: areaId,
        area: AREAS.find(a => a.id === areaId)?.label || 'Gestión Pública',
        fuente: {
          id: fuenteId || 'fuente-directa',
          nombre: fuenteNombre || 'Fuente Directa',
          url_nota: urlNota || '',
        },
        url: urlNota || '',
        seguimiento_id: sid,
        dossier_id: sid, // Retrocompatibilidad Firestore
        curada_manualmente: true, // Bandera de curaduría humana aprobada
        hecho_central: hechoCentral.trim(),
        novedad_respecto_a_dias_previos: novedadDelta.trim() || undefined,
        cuerpo_html: cuerpoHtml,
        media: {
          imagen_url: imagenUrl,
          credito: creditoFoto || '',
        },
        imagen_url: imagenUrl,
        foto: imagenUrl,
        citas,
        datos_duros: datosDuros,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error al guardar la noticia');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">
                {noticiaAEditar ? 'Editar Noticia / Asignar Media' : 'Alta de Nueva Noticia'}
              </h2>
              {noticiaAEditar?.curada_manualmente && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Curada Manualmente
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Ingreso y curaduría editorial directa en Firestore con zona horaria Argentina
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Fila 1: Titular y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Titular Periodístico *
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    titular.trim().length >= 10
                      ? 'text-emerald-700 font-semibold'
                      : titular.trim().length > 0
                      ? 'text-amber-700 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {titular.trim().length} / mín. 10 car.
                </span>
              </div>
              <input
                type="text"
                required
                value={titular || ''}
                onChange={(e) => setTitular(e.target.value)}
                placeholder="Ej: Aprueban pliego de licitación del Cerro Catedral con cláusula ambiental..."
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent ${
                  titular.trim().length > 0 && titular.trim().length < 10
                    ? 'border-amber-400 bg-amber-50/30 focus:ring-amber-500'
                    : 'border-slate-300 focus:ring-blue-600'
                }`}
              />
              {titular.trim().length > 0 && titular.trim().length < 10 && (
                <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Mínimo 10 caracteres requeridos para evitar notas huérfanas en la base de datos.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Fecha Publicación *
              </label>
              <input
                type="date"
                required
                value={fechaPublicacion || ''}
                onChange={(e) => setFechaPublicacion(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Zona Bs.As. (UTC-3)</span>
            </div>
          </div>

          {/* Fila 2: Área, Fuente y Tema en Seguimiento vinculado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Área Temática *
              </label>
              <select
                value={areaId || 'gestion-publica'}
                onChange={(e) => setAreaId(e.target.value as AreaId)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
              >
                {AREAS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Fuente *
              </label>
              <div className="space-y-1">
                <select
                  value={fuenteId || ''}
                  onChange={(e) => handleFuenteSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Seleccionar fuente existente...</option>
                  {fuentes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} ({f.tipo})
                    </option>
                  ))}
                  {fuenteId && !fuentes.some((f) => f.id === fuenteId) && fuenteId !== 'otra' && (
                    <option value={fuenteId}>{fuenteNombre || fuenteId}</option>
                  )}
                  <option value="otra">Otra / Fuente manual</option>
                </select>
                {(fuenteId === 'otra' || (!fuentes.some((f) => f.id === fuenteId) && fuenteId)) && (
                  <input
                    type="text"
                    placeholder="Nombre del medio / fuente"
                    value={fuenteNombre || ''}
                    onChange={(e) => setFuenteNombre(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Tema en Seguimiento
              </label>
              <select
                value={dossierId || ''}
                onChange={(e) => setDossierId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600"
              >
                <option value="">(Ninguno / Nota autónoma)</option>
                {dossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.titulo} [{d.estado === 'en_seguimiento' ? 'En seguimiento' : d.estado}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* URL Nota Original */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              URL de la Nota Original
            </label>
            <input
              type="url"
              value={urlNota || ''}
              onChange={(e) => setUrlNota(e.target.value)}
              placeholder="https://elcordillerano.com.ar/noticias/..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
            />
          </div>

          {/* Hecho Central y Delta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Hecho Central (Síntesis) *
              </label>
              <textarea
                required
                rows={3}
                value={hechoCentral || ''}
                onChange={(e) => setHechoCentral(e.target.value)}
                placeholder="El núcleo objetivo y verificable del acontecimiento..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Novedad / 'El Delta' respecto a días previos
              </label>
              <textarea
                rows={3}
                value={novedadDelta || ''}
                onChange={(e) => setNovedadDelta(e.target.value)}
                placeholder="Rastreo diferencial: ¿Qué cambió exactamente respecto a lo conocido ayer?"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* EDITOR DE TEXTO / HTML (CUERPO DE LA NOTICIA) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-800" />
                  <span>Cuerpo y Redacción Periodística (HTML)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Desarrollo de fondo de la noticia. Admite etiquetas HTML para citas, subtítulos y enlaces.
                </p>
              </div>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setTabCuerpo('editor')}
                  className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors ${
                    tabCuerpo === 'editor'
                      ? 'bg-blue-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTabCuerpo('preview')}
                  className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors ${
                    tabCuerpo === 'preview'
                      ? 'bg-blue-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Vista Previa</span>
                </button>
              </div>
            </div>

            {tabCuerpo === 'editor' ? (
              <div className="space-y-2">
                {/* Barra de herramientas rápida */}
                <div className="flex flex-wrap items-center gap-1 bg-white p-1.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<b>', '</b>', 'texto en negrita')}
                    className="p-1.5 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded flex items-center gap-0.5"
                    title="Negrita <b>"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<i>', '</i>', 'texto en cursiva')}
                    className="p-1.5 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded flex items-center gap-0.5"
                    title="Cursiva <i>"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<h3>', '</h3>', 'Subtítulo Temático')}
                    className="px-2 py-1 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded flex items-center gap-1 text-[11px] font-bold"
                    title="Subtítulo <h3>"
                  >
                    <Heading className="w-3.5 h-3.5" />
                    <span>H3</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<p>', '</p>', 'Párrafo explicativo')}
                    className="px-2 py-1 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded flex items-center gap-1 text-[11px] font-medium"
                    title="Párrafo <p>"
                  >
                    <span>&lt;p&gt;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<blockquote class="border-l-4 border-blue-800 pl-3 italic text-slate-700 my-2">', '</blockquote>', 'Declaración textual destacada')}
                    className="p-1.5 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded flex items-center gap-0.5"
                    title="Cita <blockquote>"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<a href="https://" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline">', '</a>', 'enlace')}
                    className="p-1.5 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded flex items-center gap-0.5"
                    title="Enlace <a href>"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('<ul class="list-disc pl-5 space-y-1">\n  <li>', '</li>\n</ul>', 'Elemento clave')}
                    className="p-1.5 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded flex items-center gap-0.5"
                    title="Lista con viñetas <ul><li>"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={8}
                  value={cuerpoHtml || ''}
                  onChange={(e) => setCuerpoHtml(e.target.value)}
                  placeholder="<p>Escribe o pega aquí la redacción periodística desarrollada de la noticia...</p>"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg border border-slate-200 min-h-[160px] text-xs text-slate-800">
                {cuerpoHtml && cuerpoHtml.trim().length > 0 ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: cuerpoHtml }}
                    className="prose prose-xs max-w-none space-y-2 leading-relaxed text-slate-800"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <FileText className="w-6 h-6 mb-1 opacity-40" />
                    <p className="italic">El cuerpo de redacción está vacío. Cambia a la pestaña 'Editor' para redactar.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SELECTOR DUAL DE IMAGEN OBLIGATORIO */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-700" />
                <span>Media y Fotografía Periodística (Anti-Bloqueo CDN)</span>
              </h3>
              {!imagenUrl ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Requiere Foto
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Foto Asignada
                </span>
              )}
            </div>

            {!imagenUrl && (
              <div className="p-3 bg-amber-50/80 border border-amber-300/80 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <span>Estado: Requiere Foto</span>
                    <span className="text-[10px] font-normal px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded">Política Estricta</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    Esta noticia no posee imagen de portada. Utiliza las opciones abajo para cargar un archivo local de tu equipo o ingresar la URL de la nota original. <strong className="font-semibold text-amber-950">Queda prohibido el uso de imágenes de relleno genéricas (Unsplash o similares).</strong>
                  </p>
                </div>
              </div>
            )}

            <DualImageSelector
              label="Foto Principal de la Noticia"
              value={imagenUrl || ''}
              onChange={(url) => setImagenUrl(url)}
              helperText="Elige un archivo directo de tu equipo para subir o ingresa una URL web directa. La visualización incorpora referrerpolicy='no-referrer' contra bloqueos de CDN."
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Crédito Fotográfico / Epígrafe
              </label>
              <input
                type="text"
                value={creditoFoto || ''}
                onChange={(e) => setCreditoFoto(e.target.value)}
                placeholder="Ej: Foto gentileza Eugenia Neme / Prensa Municipalidad"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Citas textuales */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              Citas Clave de Actores
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Autor (ej: Intendente Cortés)"
                value={nuevaCitaAutor || ''}
                onChange={(e) => setNuevaCitaAutor(e.target.value)}
                className="sm:w-1/3 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
              <input
                type="text"
                placeholder="Declaración textual destacada..."
                value={nuevaCitaTexto || ''}
                onChange={(e) => setNuevaCitaTexto(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
              <button
                type="button"
                onClick={handleAddCita}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900 flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Cita
              </button>
            </div>

            {citas.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {citas.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{c.autor}: </span>
                      <span className="italic text-slate-600">"{c.texto}"</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCita(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Datos duros */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              Datos Duros y Métricas (Clave / Valor)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Métrica (ej: monto_licitacion, personas_afectadas)"
                value={datosDurosKey || ''}
                onChange={(e) => setDatosDurosKey(e.target.value)}
                className="sm:w-1/2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
              />
              <input
                type="text"
                placeholder="Valor (ej: $450.000.000, 3.200)"
                value={datosDurosVal || ''}
                onChange={(e) => setDatosDurosVal(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
              />
              <button
                type="button"
                onClick={handleAddDatoDuro}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900 flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir Dato
              </button>
            </div>

            {Object.keys(datosDuros).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {Object.entries(datosDuros).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs font-mono"
                  >
                    <span className="text-slate-700 font-semibold">{k}:</span>
                    <span className="text-blue-800 font-bold">{String(v)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDatoDuro(k)}
                      className="text-red-500 hover:text-red-700 p-1 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer actions */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando en Firestore...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Noticia
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
