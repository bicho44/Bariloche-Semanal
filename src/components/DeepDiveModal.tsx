import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  Copy,
  Check,
  FileText,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { Dossier } from '../types/index.js';

interface DeepDiveModalProps {
  isOpen: boolean;
  dossiers: Dossier[];
  initialDossierId?: string;
  onClose: () => void;
}

export const DeepDiveModal: React.FC<DeepDiveModalProps> = ({
  isOpen,
  dossiers,
  initialDossierId,
  onClose,
}) => {
  const [selectedDossierId, setSelectedDossierId] = useState<string>(
    initialDossierId || dossiers[0]?.id || ''
  );
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<{
    titulo: string;
    markdown: string;
    palabras_aproximadas: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerar = async () => {
    if (!selectedDossierId) {
      setError('Por favor selecciona un dossier para generar el análisis.');
      return;
    }

    setGenerando(true);
    setError(null);
    setResultado(null);

    try {
      const res = await fetch('/api/editorial/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier_id: selectedDossierId }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || d.detalle || 'Error al generar análisis con Gemini');
      }

      const data = await res.json();
      setResultado(data);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
    } finally {
      setGenerando(false);
    }
  };

  const handleCopy = () => {
    if (!resultado?.markdown) return;
    navigator.clipboard.writeText(resultado.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-400/20 rounded-lg text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Inteligencia Editorial: Deep-Dive Periodístico con Gemini 3
              </h2>
              <p className="text-[11px] text-blue-200">
                Análisis longitudinal de 800 a 1.200 palabras con citas y datos duros de Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Selector de Dossier */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              Seleccionar Dossier de Investigación
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedDossierId || ''}
                onChange={(e) => setSelectedDossierId(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 font-semibold"
              >
                <option value="">Seleccionar un dossier activo...</option>
                {dossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.titulo} ({d.area_id}) [{d.estado}]
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleGenerar}
                disabled={generando || !selectedDossierId}
                className="px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 bg-gradient-to-r from-blue-700 via-indigo-700 to-amber-600 hover:from-blue-600 hover:to-amber-500 shrink-0"
              >
                {generando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analizando con Gemini 3...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generar Deep-Dive</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error al invocar la API de Gemini:</p>
                <p className="text-[11px] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Resultado Generado */}
          {resultado ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <div className="flex items-center gap-2 font-semibold">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  <span>Columna Editorial Generada con Éxito</span>
                  <span className="text-emerald-700 font-mono text-[11px]">
                    (~{resultado.palabras_aproximadas} palabras)
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1 bg-white border border-emerald-300 rounded-md text-emerald-800 font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar Markdown'}</span>
                </button>
              </div>

              <div className="p-5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap select-text">
                {resultado.markdown}
              </div>
            </div>
          ) : (
            !generando && (
              <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl">
                <FileText className="w-8 h-8 mx-auto opacity-40 text-blue-900" />
                <p className="text-xs">
                  Selecciona un dossier y presiona "Generar Deep-Dive" para que Gemini 3 sintetice las noticias de Firestore.
                </p>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
