import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Newspaper,
  Calendar,
  FolderArchive,
  Radio,
  Megaphone,
  Palette,
  Mail,
  Database,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Clock,
  Plus,
  ExternalLink,
  ChevronRight,
  Layers,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { DashboardResumen, ConfiguracionBranding } from '../types/index.js';
import { AdminTab } from './Sidebar.js';

interface DashboardViewProps {
  onNavigate: (tab: AdminTab) => void;
  branding: ConfiguracionBranding | null;
  dbStatus?: { mode: string; projectId: string; message?: string } | null;
}

const AREA_LABELS: Record<string, { label: string; color: string }> = {
  'gestion-publica': { label: 'Gestión Pública', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'turismo': { label: 'Turismo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'deportes': { label: 'Deportes', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'legales-comercio': { label: 'Legales & Comercio', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'alquileres-inmobiliario': { label: 'Inmobiliario', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'vida-social-cultura': { label: 'Cultura & Comunidad', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  'en-el-radar': { label: 'En el Radar', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  branding,
  dbStatus,
}) => {
  const [stats, setStats] = useState<DashboardResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/dashboard/stats', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Error ${res.status} al obtener estadísticas`);
      }
      const data: DashboardResumen = await res.json();
      setStats(data);
    } catch (err: unknown) {
      const e = err as Error;
      console.error('[DashboardView] Error cargando métricas:', e);
      setError(e.message || 'No se pudieron sincronizar las estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <h3 className="text-base font-semibold text-slate-800">Cargando métricas de Firestore...</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Consultando colecciones de noticias, dossiers, agenda y fuentes en tiempo real.
        </p>
      </div>
    );
  }

  const primaryColor = branding?.colores?.primario || '#1e3a8a';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Executive Welcome */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {stats?.dbStatus?.mode === 'cloud_firestore'
                ? 'Firestore Cloud Conectado'
                : 'Base de Datos Activa'}
            </span>
            {stats?.timestamp && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Actualizado: {new Date(stats.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            {branding?.nombre_medio || 'Bariloche Semanal'}
          </h1>
          <p className="text-xs md:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Centro de control editorial y base de datos. Monitorea el volumen de noticias,
            investigaciones en curso, cartelera y fuentes locales con acceso directo a cada módulo.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
            title="Refrescar métricas ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Sincronizando...' : 'Refrescar'}</span>
          </button>

          <button
            onClick={() => onNavigate('noticias')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all cursor-pointer hover:opacity-95 active:scale-98"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Gestionar Noticias</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Advertencia al sincronizar algunas métricas: {error}</span>
        </div>
      )}

      {/* Grid de Métricas Principales (8 Áreas del Sistema) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Noticias */}
        <div
          onClick={() => onNavigate('noticias')}
          className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform">
                <Newspaper className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Ver área <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Noticias
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {stats?.noticias.total ?? 0}
            </div>
            <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-700">{stats?.noticias.redactadas ?? 0} redactadas</span>
              <span>•</span>
              <span className="text-slate-500 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-slate-400" />
                {stats?.noticias.con_foto ?? 0} fotos
              </span>
              {typeof stats?.noticias.curadasManualmente === 'number' && (
                <>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                    ✓ {stats.noticias.curadasManualmente} curadas
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Listado y redacción</span>
            <span className="font-semibold text-blue-700">Explorar →</span>
          </div>
        </div>

        {/* Card 2: Agenda Bariloche */}
        <div
          onClick={() => onNavigate('agenda')}
          className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-teal-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Ver cartelera <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Agenda Bariloche
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {stats?.agenda.total ?? 0}
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
              <span className="font-medium text-teal-800">{stats?.agenda.destacados ?? 0} destacados</span>
              <span>•</span>
              <span className="text-slate-500">Eventos locales</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cultura, deportes & eventos</span>
            <span className="font-semibold text-teal-700">Ver agenda →</span>
          </div>
        </div>

        {/* Card 3: Temas en Seguimiento */}
        <div
          onClick={() => onNavigate('dossiers')}
          className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform">
                <FolderArchive className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Ver seguimientos <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Temas en Seguimiento
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {stats?.dossiers.total ?? 0}
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {stats?.dossiers.activos ?? 0} activos
              </span>
              <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 text-[10px] font-bold">
                {stats?.dossiers.en_seguimiento ?? 0} en curso
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Investigaciones & timelines</span>
            <span className="font-semibold text-amber-700">Explorar →</span>
          </div>
        </div>

        {/* Card 4: Fuentes y Medios */}
        <div
          onClick={() => onNavigate('fuentes')}
          className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-purple-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Ver fuentes <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Fuentes y Medios
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {stats?.fuentes.total ?? 0}
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
              <span className="font-medium text-emerald-700">{stats?.fuentes.activas ?? 0} activas</span>
              <span>•</span>
              <span className="text-slate-400">{stats?.fuentes.inactivas ?? 0} inactivas</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Medios de Bariloche</span>
            <span className="font-semibold text-purple-700">Gestionar →</span>
          </div>
        </div>

        {/* Card 5: Auspiciantes */}
        <div
          onClick={() => onNavigate('anunciantes')}
          className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                <Megaphone className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Ver sponsors <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Auspiciantes & Banners
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {stats?.anunciantes.total ?? 0}
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
              <span className="font-medium text-emerald-700">{stats?.anunciantes.activos ?? 0} vigentes</span>
              <span>•</span>
              <span className="text-slate-500">Banners newsletter</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Pre-footer y bloques</span>
            <span className="font-semibold text-emerald-700">Administrar →</span>
          </div>
        </div>

        {/* Card 6: Ediciones Newsletter */}
        <div
          onClick={() => onNavigate('ediciones')}
          className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-sky-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Ver despachos <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ediciones Newsletter
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {stats?.ediciones.total ?? 0}
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
              <span className="font-medium text-sky-800">{stats?.ediciones.enviadas ?? 0} enviadas</span>
              <span>•</span>
              <span className="text-slate-500">{stats?.ediciones.borradores ?? 0} borradores</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Historial y compilación</span>
            <span className="font-semibold text-sky-700">Ver ediciones →</span>
          </div>
        </div>

        {/* Card 7: Identidad & Branding */}
        <div
          onClick={() => onNavigate('branding')}
          className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700 group-hover:scale-105 transition-transform">
                <Palette className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-rose-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Ajustar <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Identidad & Branding
            </div>
            <div className="text-base font-bold text-slate-900 mt-2 truncate">
              {branding?.nombre_medio || 'Bariloche Semanal'}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                style={{ backgroundColor: branding?.colores?.primario || '#1e3a8a' }}
                title="Color Primario"
              />
              <span
                className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                style={{ backgroundColor: branding?.colores?.secundario || '#d97706' }}
                title="Color Secundario"
              />
              <span
                className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                style={{ backgroundColor: branding?.colores?.acento || '#0284c7' }}
                title="Color Acento"
              />
              <span className="text-[11px] text-slate-500 ml-1">Paleta institucional</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Logotipo, colores & contacto</span>
            <span className="font-semibold text-rose-700">Configurar →</span>
          </div>
        </div>

        {/* Card 8: API REST & Diagnóstico */}
        <div
          onClick={() => onNavigate('api_docs')}
          className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Consola <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Consola API REST
            </div>
            <div className="text-base font-bold text-slate-900 mt-2 truncate">
              {dbStatus?.projectId || 'bariloche-semanal'}
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-slate-600 font-medium">9 endpoints activos</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Pruebas y documentación</span>
            <span className="font-semibold text-indigo-700">Abrir consola →</span>
          </div>
        </div>
      </div>

      {/* Desglose de Cobertura Periodística por Áreas Temáticas */}
      {stats?.noticias.por_area && Object.keys(stats.noticias.por_area).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-blue-700" />
              Distribución de Noticias por Área Temática
            </h3>
            <span className="text-xs text-slate-500">
              {stats.noticias.total} noticias en base
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {Object.entries(stats.noticias.por_area).map(([areaId, count]) => {
              const meta = AREA_LABELS[areaId] || { label: areaId, color: 'bg-slate-100 text-slate-700 border-slate-200' };
              return (
                <div
                  key={areaId}
                  onClick={() => onNavigate('noticias')}
                  className={`p-3 rounded-xl border transition-all hover:shadow-xs cursor-pointer ${meta.color} flex flex-col justify-between`}
                >
                  <span className="text-[11px] font-semibold leading-tight line-clamp-1">
                    {meta.label}
                  </span>
                  <div className="text-lg font-black mt-1">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actividad Reciente: Dos Columnas Balanceadas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1 y 2: Últimas Noticias Cargadas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Newspaper className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Últimas Noticias Registradas</h3>
                <p className="text-xs text-slate-500">Noticias más recientes en la base de datos de Firestore</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('noticias')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas ({stats?.noticias.total ?? 0})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {stats?.noticias.ultimas && stats.noticias.ultimas.length > 0 ? (
              stats.noticias.ultimas.map((item) => {
                const areaMeta = item.area_id ? AREA_LABELS[item.area_id] : undefined;
                return (
                  <div
                    key={item.id}
                    onClick={() => onNavigate('noticias')}
                    className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {areaMeta && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${areaMeta.color}`}>
                            {areaMeta.label}
                          </span>
                        )}
                        {item.fuente?.nombre && (
                          <span className="text-[11px] font-medium text-slate-500">
                            {item.fuente.nombre}
                          </span>
                        )}
                        {item.fecha && (
                          <span className="text-[11px] text-slate-400">
                            • {item.fecha}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs md:text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600">
                        {item.titular}
                      </h4>

                      {item.hecho_central && (
                        <p className="text-xs text-slate-600 line-clamp-1">
                          {item.hecho_central}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {item.media?.imagen_url ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <ImageIcon className="w-3 h-3" /> Foto
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sin foto</span>
                      )}
                      <span className="text-xs font-semibold text-blue-600 flex items-center">
                        Editar →
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No hay noticias registradas aún.
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: Temas en Seguimiento y Próximos Eventos */}
        <div className="space-y-6">
          {/* Bloque Temas en Seguimiento Prioritarios */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Seguimientos en Foco
                </h3>
              </div>
              <button
                onClick={() => onNavigate('dossiers')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 cursor-pointer"
              >
                Ver todos →
              </button>
            </div>

            <div className="space-y-2.5">
              {stats?.dossiers.ultimos && stats.dossiers.ultimos.length > 0 ? (
                stats.dossiers.ultimos.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => onNavigate('dossiers')}
                    className="p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">
                        {d.titulo}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          d.estado === 'activo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.estado === 'en_seguimiento'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {d.estado.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{d.timeline?.length || 0} hitos en timeline</span>
                      <span className="text-amber-700 font-semibold text-[10px]">Revisar →</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">Sin seguimientos activos</p>
              )}
            </div>
          </div>

          {/* Bloque Próximos Eventos Agenda */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cartelera Bariloche
                </h3>
              </div>
              <button
                onClick={() => onNavigate('agenda')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
              >
                Ver agenda →
              </button>
            </div>

            <div className="space-y-2.5">
              {stats?.agenda.ultimos && stats.agenda.ultimos.length > 0 ? (
                stats.agenda.ultimos.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => onNavigate('agenda')}
                    className="p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">
                        {e.titulo}
                      </span>
                      <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 shrink-0">
                        {e.fecha_inicio}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span className="truncate">{e.lugar || 'Bariloche'}</span>
                      <span className="capitalize text-[10px] text-slate-400">{e.categoria}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">Sin eventos cargados</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
