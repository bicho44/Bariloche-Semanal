import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, AdminTab } from './components/Sidebar.js';
import { DashboardView } from './components/DashboardView.js';
import { NoticiasView } from './components/NoticiasView.js';
import { AgendaView } from './components/AgendaView.js';
import { DossiersView } from './components/DossiersView.js';
import { FuentesView } from './components/FuentesView.js';
import { AnunciantesView } from './components/AnunciantesView.js';
import { BrandingView } from './components/BrandingView.js';
import { EdicionesView } from './components/EdicionesView.js';
import { ApiDocsView } from './components/ApiDocsView.js';
import { WeatherWidget } from './components/WeatherWidget.js';
import { ConfiguracionBranding, Fuente, Dossier } from './types/index.js';
import { ShieldCheck, MapPin, Database } from 'lucide-react';

function getInitialTab(): AdminTab {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname.replace(/^\/admin\/?/, '').replace(/^\//, '');
  const validTabs: AdminTab[] = [
    'dashboard',
    'noticias',
    'agenda',
    'dossiers',
    'fuentes',
    'anunciantes',
    'branding',
    'ediciones',
    'api_docs',
  ];
  if (validTabs.includes(path as AdminTab)) {
    return path as AdminTab;
  }
  return 'dashboard';
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<AdminTab>(getInitialTab);
  const [branding, setBranding] = useState<ConfiguracionBranding | null>(null);
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [dbStatus, setDbStatus] = useState<{
    mode: 'cloud_firestore' | 'local_persistence';
    projectId: string;
    hasValidServiceAccount: boolean;
    detectedEmail?: string | null;
    message?: string;
  } | null>(null);

  const handleSelectTab = useCallback((tab: AdminTab) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      const targetPath = tab === 'dashboard' ? '/admin' : `/admin/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getInitialTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchDbStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/database/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('No se pudo obtener el estado de la base de datos:', err);
    }
  }, []);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/configuracion', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBranding(data);
      }
    } catch (err) {
      console.warn('Error al cargar branding:', err);
    }
  }, []);

  const fetchFuentes = useCallback(async () => {
    try {
      const res = await fetch('/api/fuentes', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setFuentes(data || []);
      }
    } catch (err) {
      console.warn('Error al cargar fuentes:', err);
    }
  }, []);

  const fetchDossiers = useCallback(async () => {
    try {
      const res = await fetch('/api/dossiers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDossiers(data || []);
      }
    } catch (err) {
      console.warn('Error al cargar dossiers:', err);
    }
  }, []);

  useEffect(() => {
    fetchDbStatus();
    fetchBranding();
    fetchFuentes();
    fetchDossiers();
  }, [currentTab, fetchDbStatus, fetchBranding, fetchFuentes, fetchDossiers]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-800">
      {/* Barra Lateral / Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        branding={branding}
        dbStatus={dbStatus}
      />

      {/* Área Principal de Trabajo */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar con Módulo de Clima Integrado */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-900" />
              <button
                type="button"
                onClick={() => handleSelectTab('branding')}
                className="hover:text-blue-900 hover:underline cursor-pointer font-medium text-slate-700"
                title="Configurar ciudad y clima en Identidad & Branding"
              >
                {branding?.clima?.ciudad || 'San Carlos de Bariloche'}
              </button>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700">
                {currentTab === 'dashboard'
                  ? 'Dashboard General'
                  : currentTab === 'api_docs'
                  ? 'Consola API REST'
                  : currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}
              </span>
            </div>
          </div>

          {/* Módulo de Clima en Cabecera */}
          <div className="flex items-center gap-3">
            <WeatherWidget
              variant="compact"
              climaConfig={branding?.clima}
              onOpenBranding={() => handleSelectTab('branding')}
            />
          </div>
        </header>

        {/* Dynamic Main View */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                onNavigate={handleSelectTab}
                branding={branding}
                dbStatus={dbStatus}
              />
            )}

            {currentTab === 'noticias' && (
              <NoticiasView fuentes={fuentes} dossiers={dossiers} />
            )}

            {currentTab === 'agenda' && <AgendaView />}

            {currentTab === 'dossiers' && (
              <DossiersView
                onRefreshDossiers={fetchDossiers}
              />
            )}

            {currentTab === 'fuentes' && (
              <FuentesView onRefreshFuentes={fetchFuentes} />
            )}

            {currentTab === 'anunciantes' && <AnunciantesView />}

            {currentTab === 'branding' && (
              <BrandingView branding={branding} onUpdateBranding={setBranding} />
            )}

            {currentTab === 'ediciones' && <EdicionesView dossiers={dossiers} />}

            {currentTab === 'api_docs' && <ApiDocsView />}
          </div>
        </main>
      </div>
    </div>
  );
}
