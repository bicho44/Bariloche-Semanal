import React, { useState } from 'react';
import { Database, Play, Loader2, Copy, Check, ExternalLink } from 'lucide-react';

interface EndpointDef {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  desc: string;
  sampleBody?: object;
}

const ENDPOINTS: EndpointDef[] = [
  { method: 'GET', path: '/api/noticias', desc: 'Listado paginado con filtros de noticias' },
  { method: 'GET', path: '/api/agenda', desc: 'Próximos eventos de la cartelera' },
  { method: 'GET', path: '/api/dossiers', desc: 'Dossiers activos con hitos' },
  { method: 'GET', path: '/api/fuentes', desc: 'Las 11 fuentes periodísticas de Bariloche' },
  { method: 'GET', path: '/api/anunciantes', desc: 'Auspiciantes con estado y prioridad' },
  { method: 'GET', path: '/api/anunciantes/compilado/pre-footer', desc: 'Compilado HTML de auspiciantes para newsletter' },
  { method: 'GET', path: '/api/configuracion', desc: 'Identidad institucional, logo y colores HEX' },
  { method: 'GET', path: '/api/ediciones', desc: 'Historial de newsletters y despachos' },
  {
    method: 'POST',
    path: '/api/editorial/deep-dive',
    desc: 'Generación con Gemini 3 de análisis en profundidad',
    sampleBody: { dossier_id: 'licitacion-cerro-catedral' },
  },
];

export const ApiDocsView: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(ENDPOINTS[0]);
  const [loading, setLoading] = useState(false);
  const [responseJson, setResponseJson] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResponseJson(null);
    setStatus(null);

    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: { 'Content-Type': 'application/json' },
      };

      if (selectedEndpoint.method === 'POST' && selectedEndpoint.sampleBody) {
        options.body = JSON.stringify(selectedEndpoint.sampleBody);
      }

      const res = await fetch(selectedEndpoint.path, options);
      setStatus(res.status);
      const data = await res.json();
      setResponseJson(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const errorObj = err as Error;
      setStatus(500);
      setResponseJson(JSON.stringify({ error: errorObj.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!responseJson) return;
    navigator.clipboard.writeText(responseJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-900" />
          <span>Consola de Exploración API REST (Firestore + Gemini 3)</span>
        </h1>
        <p className="text-xs text-slate-500">
          Ejecuta y audita en tiempo real las respuestas de la API backend de <code className="text-blue-700 font-mono">bariloche-semanal</code>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Endpoints */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Endpoints Disponibles
          </h2>
          <div className="space-y-1">
            {ENDPOINTS.map((ep, idx) => {
              const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedEndpoint(ep);
                    setResponseJson(null);
                    setStatus(null);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border border-blue-200 text-blue-900 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      ep.method === 'GET'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ep.method === 'POST'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-[11px] truncate">{ep.path}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel de Ejecución */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                    selectedEndpoint.method === 'GET'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {selectedEndpoint.path}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{selectedEndpoint.desc}</p>
            </div>

            <button
              onClick={handleTest}
              disabled={loading}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Probar Endpoint</span>
                </>
              )}
            </button>
          </div>

          {selectedEndpoint.sampleBody && (
            <div>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Cuerpo de Solicitud (JSON):
              </span>
              <pre className="p-3 bg-slate-900 text-amber-300 font-mono text-xs rounded-lg">
                {JSON.stringify(selectedEndpoint.sampleBody, null, 2)}
              </pre>
            </div>
          )}

          {/* Respuesta */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Respuesta JSON en Vivo:
                </span>
                {status && (
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                      status >= 200 && status < 300
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    HTTP {status}
                  </span>
                )}
              </div>

              {responseJson && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              )}
            </div>

            <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl overflow-x-auto max-h-96">
              {loading ? (
                <div className="py-8 text-center text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-400" />
                  <span>Esperando respuesta de Firestore / Gemini...</span>
                </div>
              ) : responseJson ? (
                <pre>{responseJson}</pre>
              ) : (
                <span className="text-slate-500 italic">
                  Haz click en "Probar Endpoint" para disparar la llamada HTTP en vivo.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
