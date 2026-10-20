import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Loader2,
  FolderArchive,
  Clock,
  FileText,
  Eye,
  Code,
  Bold,
  Italic,
  Heading,
  Quote,
  Link2,
  List,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Database,
  Ban,
  Target,
} from 'lucide-react';
import { Dossier, AreaId, EstadoDossier, HitoTimeline } from '../types/index.js';
import { DualImageSelector } from './DualImageSelector.js';

interface DossierModalProps {
  isOpen: boolean;
  dossierAEditar: Dossier | null;
  onClose: () => void;
  onSave: (dossier: Partial<Dossier>) => Promise<void>;
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

export const DossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  dossierAEditar,
  onClose,
  onSave,
}) => {
  const [titulo, setTitulo] = useState('');
  const [areaId, setAreaId] = useState<AreaId>('gestion-publica');
  const [estado, setEstado] = useState<EstadoDossier>('activo');
  const [resumenContexto, setResumenContexto] = useState('');

  // Blindaje y Alcance Documental
  const [criterioInclusion, setCriterioInclusion] = useState('');
  const [prohibidoIncluir, setProhibidoIncluir] = useState('');
  const [datosDurosKey, setDatosDurosKey] = useState('');
  const [datosDurosVal, setDatosDurosVal] = useState('');
  const [datosDurosVerificados, setDatosDurosVerificados] = useState<Record<string, string | number>>({});

  const [actoresClave, setActoresClave] = useState<string[]>([]);
  const [nuevoActor, setNuevoActor] = useState('');

  // Crónica de Fondo (HTML) y Generación IA
  const [cronicaHtml, setCronicaHtml] = useState('');
  const [fechaUltimaCronica, setFechaUltimaCronica] = useState('');
  const [tabCronica, setTabCronica] = useState<'editor' | 'preview'>('editor');
  const [generatingDeepDive, setGeneratingDeepDive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Media & Ilustración 2D (Prompt Nanobanana)
  const [imagenUrl, setImagenUrl] = useState('');
  const [creditoFoto, setCreditoFoto] = useState('');
  const [promptNanobanana, setPromptNanobanana] = useState('');

  // Blindaje Editorial
  const [curadaManualmente, setCuradaManualmente] = useState<boolean>(true);

  // Timeline Dinámico
  const [timeline, setTimeline] = useState<HitoTimeline[]>([]);
  const [nuevoHitoFecha, setNuevoHitoFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nuevoHitoTexto, setNuevoHitoTexto] = useState('');
  const [nuevoHitoFuenteUrl, setNuevoHitoFuenteUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dossierAEditar) {
      setTitulo(dossierAEditar.titulo || '');
      setAreaId(dossierAEditar.area_id || 'gestion-publica');
      setEstado(dossierAEditar.estado || 'activo');
      setResumenContexto(dossierAEditar.resumen_contexto || '');
      setCriterioInclusion(dossierAEditar.criterio_inclusion || '');
      setProhibidoIncluir(dossierAEditar.prohibido_incluir || '');
      setDatosDurosVerificados(dossierAEditar.datos_duros_verificados || {});
      setActoresClave(dossierAEditar.actores_clave || []);
      setCronicaHtml(dossierAEditar.cronica_html || '');
      setFechaUltimaCronica(dossierAEditar.fecha_ultima_cronica || (dossierAEditar.cronica_html ? new Date().toISOString().split('T')[0] : ''));
      setTabCronica('editor');
      setImagenUrl(dossierAEditar.media?.imagen_url || '');
      setCreditoFoto(dossierAEditar.media?.credito || '');
      setPromptNanobanana(dossierAEditar.prompt_nanobanana || dossierAEditar.media?.prompt_nanobanana || '');
      setCuradaManualmente(dossierAEditar.curada_manualmente !== undefined ? Boolean(dossierAEditar.curada_manualmente) : true);
      setTimeline(dossierAEditar.timeline || []);
    } else {
      setTitulo('');
      setAreaId('gestion-publica');
      setEstado('activo');
      setResumenContexto('');
      setCriterioInclusion('');
      setProhibidoIncluir('');
      setDatosDurosVerificados({});
      setActoresClave([]);
      setCronicaHtml('');
      setFechaUltimaCronica('');
      setTabCronica('editor');
      setImagenUrl('');
      setCreditoFoto('');
      setPromptNanobanana('');
      setCuradaManualmente(true);
      setTimeline([]);
    }
  }, [dossierAEditar, isOpen]);

  const insertCuatroActos = () => {
    const plantilla = `<h3>1. Antecedentes y Marco Estructural</h3>
<p>Contexto de origen, marco normativo, ordenanzas y antecedentes históricos contrastados que dieron inicio al expediente en Bariloche...</p>

<h3>2. Bitácora Documental de Hitos Verificados</h3>
<ul class="space-y-1.5 list-disc pl-5">
  <li><strong>[DD/MM/YYYY]:</strong> Acontecimiento verificado con enlace a la fuente oficial o periodística: <a href="https://" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline">Nota de prensa</a>.</li>
</ul>

<h3>3. Mapa de Posiciones Comprobadas</h3>
<p>Posturas declaradas fehacientemente por el municipio, la provincia, las partes en disputa y los sectores vecinales sin inferir opiniones no comprobadas...</p>

<h3>4. Próximas Instancias Confirmadas</h3>
<p>Fechas oficiales de audiencias, licitaciones o plazos judiciales. Si no existe fecha cierta fijada institucionalmente, consignar: <em>Sin fecha oficial confirmada al cierre</em>.</p>

<aside class="c-dossier-data">
  <h4>Cifras y Ficha Técnica Verificada (Trazabilidad 1:1)</h4>
  <ul>
    <li><strong>Estado del expediente:</strong> En seguimiento documental</li>
  </ul>
</aside>`;
    setCronicaHtml(plantilla);
    if (!fechaUltimaCronica) {
      setFechaUltimaCronica(new Date().toISOString().split('T')[0]);
    }
  };

  const insertHtmlTag = (openTag: string, closeTag: string, placeholder = 'texto') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = cronicaHtml.substring(start, end) || placeholder;
    const replacement = `${openTag}${selectedText}${closeTag}`;
    const newHtml = cronicaHtml.substring(0, start) + replacement + cronicaHtml.substring(end);
    setCronicaHtml(newHtml);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selectedText.length);
    }, 0);
  };

  const handleAddActor = () => {
    if (!nuevoActor.trim()) return;
    if (!actoresClave.includes(nuevoActor.trim())) {
      setActoresClave([...actoresClave, nuevoActor.trim()]);
    }
    setNuevoActor('');
  };

  const handleRemoveActor = (actor: string) => {
    setActoresClave(actoresClave.filter((a) => a !== actor));
  };

  const handleAddDatoDuro = () => {
    if (!datosDurosKey.trim() || !datosDurosVal.trim()) return;
    setDatosDurosVerificados({
      ...datosDurosVerificados,
      [datosDurosKey.trim()]: datosDurosVal.trim(),
    });
    setDatosDurosKey('');
    setDatosDurosVal('');
  };

  const handleRemoveDatoDuro = (key: string) => {
    const updated = { ...datosDurosVerificados };
    delete updated[key];
    setDatosDurosVerificados(updated);
  };

  const handleAddHito = () => {
    if (!nuevoHitoFecha || !nuevoHitoTexto.trim()) return;
    setTimeline([
      ...timeline,
      {
        fecha: nuevoHitoFecha,
        hito: nuevoHitoTexto.trim(),
        fuente_url: nuevoHitoFuenteUrl.trim() || undefined,
      },
    ]);
    setNuevoHitoTexto('');
    setNuevoHitoFuenteUrl('');
  };

  const handleRemoveHito = (idx: number) => {
    setTimeline(timeline.filter((_, i) => i !== idx));
  };

  const handleMoveHitoUp = (idx: number) => {
    if (idx <= 0) return;
    const reordered = [...timeline];
    const temp = reordered[idx - 1];
    reordered[idx - 1] = reordered[idx];
    reordered[idx] = temp;
    setTimeline(reordered);
  };

  const handleMoveHitoDown = (idx: number) => {
    if (idx >= timeline.length - 1) return;
    const reordered = [...timeline];
    const temp = reordered[idx + 1];
    reordered[idx + 1] = reordered[idx];
    reordered[idx] = temp;
    setTimeline(reordered);
  };

  // Redacción y actualización automatizada de Deep-Dive con Gemini API (@google/genai)
  const handleGenerarDeepDive = async () => {
    if (!titulo.trim()) {
      setError('Por favor indica al menos el título del expediente para redactar la crónica con IA.');
      return;
    }

    setGeneratingDeepDive(true);
    setError(null);
    try {
      const res = await fetch('/api/editorial/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: dossierAEditar?.id,
          dossier: {
            id: dossierAEditar?.id,
            titulo: titulo.trim(),
            area_id: areaId,
            resumen_contexto: resumenContexto.trim(),
            criterio_inclusion: criterioInclusion.trim() || undefined,
            prohibido_incluir: prohibidoIncluir.trim() || undefined,
            datos_duros_verificados: datosDurosVerificados,
            actores_clave: actoresClave,
            timeline,
          },
          criterio_inclusion: criterioInclusion.trim() || undefined,
          prohibido_incluir: prohibidoIncluir.trim() || undefined,
          datos_duros_verificados: datosDurosVerificados,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.detalle || 'Error al generar la crónica documental');
      }

      const data = await res.json();
      if (data.cronica_html) {
        setCronicaHtml(data.cronica_html);
        setFechaUltimaCronica(data.fecha_ultima_cronica || new Date().toISOString().split('T')[0]);
        setTabCronica('preview');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(`Error al generar crónica con Gemini: ${errorObj.message}`);
    } finally {
      setGeneratingDeepDive(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !resumenContexto.trim()) {
      setError('Por favor completa el Título y el Resumen de Contexto.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        titulo: titulo.trim(),
        area_id: areaId,
        estado,
        resumen_contexto: resumenContexto.trim(),
        criterio_inclusion: criterioInclusion.trim() || undefined,
        prohibido_incluir: prohibidoIncluir.trim() || undefined,
        datos_duros_verificados: datosDurosVerificados,
        actores_clave: actoresClave,
        cronica_html: cronicaHtml,
        fecha_ultima_cronica: fechaUltimaCronica || (cronicaHtml ? new Date().toISOString().split('T')[0] : undefined),
        media: {
          imagen_url: imagenUrl || '',
          credito: creditoFoto || '',
          prompt_nanobanana: promptNanobanana || '',
        },
        prompt_nanobanana: promptNanobanana || '',
        curada_manualmente: true, // Siempre marcado como true al editar desde el panel web
        timeline,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error al guardar dossier');
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
            <FolderArchive className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-bold text-slate-800">
              {dossierAEditar ? `Editar Seguimiento: ${dossierAEditar.id}` : 'Nuevo Tema en Seguimiento'}
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

          {/* Blindaje Editorial: Curada Manualmente */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl shadow-2xs">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="dossier-curada-manualmente"
                checked={curadaManualmente}
                onChange={(e) => setCuradaManualmente(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-800 border-slate-300 focus:ring-emerald-600 cursor-pointer"
              />
              <label htmlFor="dossier-curada-manualmente" className="text-xs text-slate-800 cursor-pointer select-none">
                <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Curada Manualmente (Blindaje Editorial Activo)
                </span>
                <span className="text-[11px] text-slate-600 block">
                  Al guardar desde el panel web, queda protegida contra sobreescrituras automáticas nocturnas.
                </span>
              </label>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 self-start sm:self-center uppercase tracking-wider">
              Curada Manualmente
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Título del Tema en Seguimiento *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Licitación del Transporte Urbano Mi Bus y Subsidios"
              value={titulo || ''}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Área Temática *
              </label>
              <select
                value={areaId || 'gestion-publica'}
                onChange={(e) => setAreaId(e.target.value as AreaId)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
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
                Estado del Seguimiento *
              </label>
              <select
                value={estado || 'activo'}
                onChange={(e) => setEstado(e.target.value as EstadoDossier)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="activo">Activo (En desarrollo activo)</option>
                <option value="en_seguimiento">En Seguimiento (Vigilancia periódica)</option>
                <option value="latente">Latente (A la espera de resoluciones)</option>
                <option value="resuelto">Resuelto / Concluido</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Resumen de Contexto *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Marco histórico y antecedentes mínimos necesarios para entender el conflicto o tema..."
              value={resumenContexto || ''}
              onChange={(e) => setResumenContexto(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          {/* NUEVOS CAMPOS: CRITERIO DE INCLUSIÓN Y PROHIBIDO INCLUIR (BLINDAJE DE ALCANCE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-blue-900" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Criterio de Inclusión Estricto
                </label>
              </div>
              <textarea
                rows={3}
                placeholder="Qué temas incluye estrictamente este expediente (ej: Plazos de concesión Cerro Catedral, canon municipal a pagar, inversiones en medios de elevación y resoluciones del EAMCEC)..."
                value={criterioInclusion}
                onChange={(e) => setCriterioInclusion(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Define el alcance temático cerrado del dossier frente a redactores y a Gemini.
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Ban className="w-3.5 h-3.5 text-red-700" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Prohibido Incluir (Exclusiones Explícitas)
                </label>
              </div>
              <textarea
                rows={3}
                placeholder="Qué temas cercanos quedan excluidos para evitar derivación (ej: Accidentes de tránsito en la ruta de acceso al cerro, tarifas de pases de esquí comerciales, eventos privados de marcas)..."
                value={prohibidoIncluir}
                onChange={(e) => setProhibidoIncluir(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Evita derivación temática y alucinaciones en la crónica de fondo.
              </span>
            </div>
          </div>

          {/* NUEVO CAMPO: DATOS DUROS VERIFICADOS (FICHA TÉCNICA INMUTABLE) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-900" />
                <span>Datos Duros Verificados (Ficha Técnica Inmutable)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Cifras inmutables que no deben alterarse (expedientes, montos, ordenanzas, plazos)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Dato / Concepto (ej: Inversión Comprometida)"
                  value={datosDurosKey}
                  onChange={(e) => setDatosDurosKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Valor verificado (ej: USD 22.000.000 / Ord. 2929-CM-18)"
                  value={datosDurosVal}
                  onChange={(e) => setDatosDurosVal(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddDatoDuro}
                  className="w-full py-1.5 bg-blue-900 text-white text-xs font-semibold rounded-md hover:bg-blue-800 flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Fijar</span>
                </button>
              </div>
            </div>

            {Object.keys(datosDurosVerificados).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(datosDurosVerificados).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs shadow-2xs"
                  >
                    <span className="text-slate-500 font-medium">{key}:</span>
                    <strong className="text-blue-900 font-semibold">{val}</strong>
                    <button
                      type="button"
                      onClick={() => handleRemoveDatoDuro(key)}
                      className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                      title="Eliminar dato"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actores Clave */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              Actores Clave Vinculados
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre o entidad (ej: Walter Cortés, Concejo Deliberante, Capsa)"
                value={nuevoActor || ''}
                onChange={(e) => setNuevoActor(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
              <button
                type="button"
                onClick={handleAddActor}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900 cursor-pointer"
              >
                Agregar
              </button>
            </div>

            {actoresClave.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {actoresClave.map((actor) => (
                  <span
                    key={actor}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-white border border-slate-200 text-slate-700 font-medium"
                  >
                    {actor}
                    <button
                      type="button"
                      onClick={() => handleRemoveActor(actor)}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* CRÓNICA DE FONDO (HTML) + BOTÓN GENERADOR DEEP-DIVE IA */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-900" />
                  <span>Crónica Periodística de Fondo / Informe Documental (HTML)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Estructura obligatoria: 1. Antecedentes fijos, 2. Bitácora fechada, 3. Mapa de posiciones, 4. Próximas instancias.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerarDeepDive}
                  disabled={generatingDeepDive}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-900 to-indigo-800 text-white text-xs font-bold rounded-lg shadow-xs hover:from-blue-800 hover:to-indigo-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  title="Redactar o actualizar el informe con Gemini aplicando las reglas anti-alucinación"
                >
                  {generatingDeepDive ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Redactando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Redactar con IA (Deep-Dive)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 font-medium">Fecha crónica:</span>
                  <input
                    type="date"
                    value={fechaUltimaCronica || ''}
                    onChange={(e) => setFechaUltimaCronica(e.target.value)}
                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTabCronica('editor')}
                    className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors ${
                      tabCronica === 'editor'
                        ? 'bg-blue-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabCronica('preview')}
                    className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors ${
                      tabCronica === 'preview'
                        ? 'bg-blue-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Vista Previa</span>
                  </button>
                </div>
              </div>
            </div>

            {tabCronica === 'editor' ? (
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
                    onClick={() => insertHtmlTag('<blockquote class="border-l-4 border-blue-900 pl-3 italic text-slate-700 my-2">', '</blockquote>', 'Declaración textual')}
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
                    onClick={() => insertHtmlTag('<ul class="list-disc pl-5 space-y-1">\n  <li>', '</li>\n</ul>', 'Punto de inflexión')}
                    className="p-1.5 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded flex items-center gap-0.5"
                    title="Lista <ul/li>"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-0.5" />
                  <button
                    type="button"
                    onClick={insertCuatroActos}
                    className="px-2 py-1 text-blue-950 bg-blue-100/80 hover:bg-blue-200 rounded flex items-center gap-1 text-[11px] font-bold border border-blue-300 shadow-2xs transition-all cursor-pointer"
                    title="Insertar plantilla narrativa en cuatro actos: Antecedentes, Novedades, Actores en disputa y Hacia dónde va"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-800" />
                    <span>Estructura 4 Bloques</span>
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  rows={10}
                  placeholder="Redacta o edita la crónica de investigación en HTML..."
                  value={cronicaHtml}
                  onChange={(e) => setCronicaHtml(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none leading-relaxed"
                />
              </div>
            ) : (
              <div className="bg-white p-5 rounded-lg border border-slate-200 min-h-[220px]">
                {cronicaHtml ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-800 leading-relaxed space-y-3 font-sans"
                    dangerouslySetInnerHTML={{ __html: cronicaHtml }}
                  />
                ) : (
                  <p className="text-slate-400 italic text-xs text-center py-10">
                    No hay contenido redactado aún para la crónica de este seguimiento.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* MEDIA & ARTE EDITORIAL */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-900" />
                  <span>Media & Arte Editorial (Prompt Nanobanana / 2D)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Flyer o ilustración de portada e instrucción para la generación de arte 2D editorial por IA.
                </p>
              </div>
              {imagenUrl ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Arte Asignado
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Sin imagen
                </span>
              )}
            </div>

            {/* Selector dual de imagen */}
            <DualImageSelector
              label="Arte de Portada del Dossier (Flyer o Ilustración Editorial)"
              value={imagenUrl}
              onChange={(url) => setImagenUrl(url)}
              folder="dossiers"
              subContext={dossierAEditar?.id || 'general'}
              helperText="Sube el archivo a Firebase Storage (dossiers/{slug}) o ingresa una URL web con previsualización en vivo."
            />

            {/* Crédito */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Crédito del Arte / Fotógrafo / Ilustrador
              </label>
              <input
                type="text"
                placeholder="Ej: Ilustración Bariloche Semanal / Nanobanana Gemini"
                value={creditoFoto}
                onChange={(e) => setCreditoFoto(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>

            {/* Campo prompt_nanobanana */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Prompt Nanobanana (Instrucción de ilustración 2D editorial)</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Gemini Imagen / 2D</span>
              </div>
              <textarea
                rows={3}
                placeholder="Instrucción detallada de arte editorial 2D (ej: Ilustración editorial en estilo grabado patagónico 2D, con tonos azules profundos y ocres terrosos, representando el Centro Cívico bajo la nevada y el debate del transporte público...)"
                value={promptNanobanana}
                onChange={(e) => setPromptNanobanana(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Prompt empleado para generar ilustraciones 2D conceptuales que encabezan este dossier en las ediciones del newsletter y en la web.
              </p>
            </div>
          </div>

          {/* GESTOR INTERACTIVO DE TIMELINE CON FUENTE_URL Y REORDENAMIENTO */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-900" />
                <span>Gestor Interactivo de Timeline ({timeline.length} hitos)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Permite registrar acontecimientos clave con fecha, descripción y enlace de respaldo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="sm:col-span-3">
                <input
                  type="date"
                  value={nuevoHitoFecha || ''}
                  onChange={(e) => setNuevoHitoFecha(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                  title="Fecha del hito"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Descripción del hito (ej: Concejo aprueba tarifa)"
                  value={nuevoHitoTexto || ''}
                  onChange={(e) => setNuevoHitoTexto(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="url"
                  placeholder="URL Fuente (opcional)"
                  value={nuevoHitoFuenteUrl || ''}
                  onChange={(e) => setNuevoHitoFuenteUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddHito}
                  className="w-full h-full py-1.5 bg-blue-900 text-white text-xs font-medium rounded-md hover:bg-blue-800 flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Agregar Hito"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {timeline.length > 0 ? (
              <div className="space-y-1.5 pt-1 max-h-56 overflow-y-auto pr-1">
                {timeline.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs gap-2 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveHitoUp(idx)}
                        disabled={idx === 0}
                        className="p-1 hover:text-blue-900 disabled:opacity-20 cursor-pointer"
                        title="Subir"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveHitoDown(idx)}
                        disabled={idx === timeline.length - 1}
                        className="p-1 hover:text-blue-900 disabled:opacity-20 cursor-pointer"
                        title="Bajar"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 flex items-baseline gap-2">
                      <span className="font-mono text-blue-900 font-bold shrink-0">{item.fecha}:</span>
                      <span className="text-slate-800 font-medium truncate">{item.hito}</span>
                      {item.fuente_url && (
                        <a
                          href={item.fuente_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 shrink-0 ml-1"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> Fuente
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveHito(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 shrink-0 cursor-pointer"
                      title="Eliminar hito"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No hay hitos registrados en este dossier.</p>
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
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando en Firestore...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Dossier
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
