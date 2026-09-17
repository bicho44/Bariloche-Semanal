import React from 'react';
import {
  Newspaper,
  Calendar,
  FolderArchive,
  Radio,
  Sparkles,
  Megaphone,
  Palette,
  Mail,
  ExternalLink,
  Layers,
  Database,
} from 'lucide-react';
import { ConfiguracionBranding } from '../types/index.js';

export type AdminTab = 
  | 'noticias'
  | 'agenda'
  | 'dossiers'
  | 'fuentes'
  | 'anunciantes'
  | 'branding'
  | 'ediciones'
  | 'api_docs';

interface SidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  branding: ConfiguracionBranding | null;
  onOpenDeepDiveModal: () => void;
  dbStatus?: { mode: string; projectId: string; message: string } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  branding,
  onOpenDeepDiveModal,
  dbStatus,
}) => {
  const menuItems = [
    { id: 'noticias' as AdminTab, label: 'Noticias', icon: Newspaper, countKey: 'noticias' },
    { id: 'agenda' as AdminTab, label: 'Agenda Bariloche', icon: Calendar, countKey: 'agenda' },
    { id: 'dossiers' as AdminTab, label: 'Dossiers', icon: FolderArchive, countKey: 'dossiers' },
    { id: 'fuentes' as AdminTab, label: 'Fuentes y Medios', icon: Radio, countKey: 'fuentes' },
    { id: 'anunciantes' as AdminTab, label: 'Auspiciantes & Banners', icon: Megaphone, countKey: 'anunciantes' },
    { id: 'branding' as AdminTab, label: 'Identidad & Branding', icon: Palette },
    { id: 'ediciones' as AdminTab, label: 'Ediciones Newsletter', icon: Mail },
    { id: 'api_docs' as AdminTab, label: 'Consola API REST', icon: Database },
  ];

  const primaryColor = branding?.colores?.primario || '#1e3a8a';

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt="Logo"
              className="w-9 h-9 rounded-lg object-contain bg-white/10 p-1"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shadow-md text-base"
              style={{ backgroundColor: primaryColor }}
            >
              BS
            </div>
          )}
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm tracking-tight text-white truncate">
              {branding?.nombre_medio || 'Bariloche Semanal'}
            </h1>
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Panel de Administración
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action: AI Deep Dive */}
      <div className="p-3">
        <button
          onClick={onOpenDeepDiveModal}
          type="button"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white rounded-lg transition-all shadow-md bg-gradient-to-r from-blue-700 via-indigo-700 to-amber-600 hover:from-blue-600 hover:to-amber-500 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Deep-Dive Editorial IA</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Módulos de Gestión
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dbStatus?.mode === 'cloud_firestore'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            />
            Firestore:
          </span>
          <span className="font-mono text-[10px] text-slate-300">
            {dbStatus?.projectId || 'bariloche-semanal'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Motor IA:</span>
          <span className="text-[10px] text-amber-400 font-semibold">Gemini 3.8</span>
        </div>
        <div className="pt-1 flex items-center justify-between">
          <a
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
          >
            Estado API <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <span className="text-[10px] text-slate-500">v3.0.0</span>
        </div>
      </div>
    </aside>
  );
};
