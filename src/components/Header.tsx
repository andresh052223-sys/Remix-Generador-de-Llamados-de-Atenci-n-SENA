import React from 'react';
import { FileSpreadsheet, Layers, Users, Eye, Download, TableProperties } from 'lucide-react';
import { ActiveTab } from '../types';
import { SenaLogo } from './SenaLogo';

interface HeaderProps {
  senaLogoUrl?: string;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  apprenticesCount: number;
  evidencesCount: number;
  codigoFicha: string;
  activeSlotNumber?: number;
  activeProgramName?: string;
  onOpenBulkDownload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  senaLogoUrl,
  activeTab,
  setActiveTab,
  apprenticesCount,
  evidencesCount,
  codigoFicha,
  activeSlotNumber,
  activeProgramName,
  onOpenBulkDownload
}) => {
  return (
    <header className="bg-white border-b-4 border-black sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white border-2 border-black flex items-center justify-center p-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0">
              {senaLogoUrl ? (
                <img src={senaLogoUrl} alt="Logo SENA" className="h-10 w-10 object-contain" />
              ) : (
                <SenaLogo className="h-10 w-10" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 block">
                  Generador Administrativo Institucional
                </span>
                {activeSlotNumber && (
                  <span className="bg-black text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    P{activeSlotNumber}: {activeProgramName || `Ficha ${codigoFicha}`}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic text-black leading-none mt-0.5">
                Llamados de Atención
              </h1>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <button
              id="header-bulk-download-btn"
              onClick={onOpenBulkDownload}
              className="bg-black text-white px-5 py-2.5 font-black text-xs uppercase tracking-wider border-2 border-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Descargar Paquete</span>
              <span className="bg-emerald-400 text-black text-[10px] font-black px-1.5 py-0.2 rounded-none border border-black">
                {apprenticesCount} PDF
              </span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-t-2 border-slate-200 overflow-x-auto py-2 scrollbar-none">
          <button
            id="nav-tab-general"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 ${
              activeTab === 'general'
                ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-slate-100 text-slate-800 border-slate-300 hover:border-black hover:bg-white'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            1. Datos del Programa
          </button>

          <button
            id="nav-tab-evidencias"
            onClick={() => setActiveTab('evidencias')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 ${
              activeTab === 'evidencias'
                ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-slate-100 text-slate-800 border-slate-300 hover:border-black hover:bg-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            2. Evidencias
            <span className={`px-1.5 py-0.2 text-[10px] font-black border ${
              activeTab === 'evidencias'
                ? 'bg-emerald-400 text-black border-black'
                : 'bg-white text-black border-slate-400'
            }`}>
              {evidencesCount}
            </span>
          </button>

          <button
            id="nav-tab-matriz"
            onClick={() => setActiveTab('matriz')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 ${
              activeTab === 'matriz'
                ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-emerald-100 text-emerald-950 border-emerald-400 hover:border-black hover:bg-emerald-200'
            }`}
          >
            <TableProperties className="h-3.5 w-3.5 text-emerald-700" />
            3. Matriz de Evidencias
            <span className="px-1.5 py-0.2 text-[9px] font-black bg-emerald-400 text-black border border-black">
              SI / NO / CORREGIR
            </span>
          </button>

          <button
            id="nav-tab-aprendices"
            onClick={() => setActiveTab('aprendices')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 ${
              activeTab === 'aprendices'
                ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-slate-100 text-slate-800 border-slate-300 hover:border-black hover:bg-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            4. Lista de Aprendices
            <span className={`px-1.5 py-0.2 text-[10px] font-black border ${
              activeTab === 'aprendices'
                ? 'bg-emerald-400 text-black border-black'
                : 'bg-white text-black border-slate-400'
            }`}>
              {apprenticesCount}
            </span>
          </button>

          <button
            id="nav-tab-vista-previa"
            onClick={() => setActiveTab('vista-previa')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 shrink-0 ${
              activeTab === 'vista-previa'
                ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-slate-100 text-slate-800 border-slate-300 hover:border-black hover:bg-white'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            5. Vista Previa & PDF
          </button>
        </div>
      </div>
    </header>
  );
};

