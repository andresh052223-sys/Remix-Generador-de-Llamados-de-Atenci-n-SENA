import React, { useState } from 'react';
import { Apprentice, EvidenceItem, GeneralInfo, SignatureConfig } from '../types';
import { generateSingleApprenticePdf } from '../utils/pdfGenerator';
import { evaluateApprenticeRaps, getRapShortTitle, getEvidenceRapInfo } from '../utils/rapUtils';
import { SenaLogo } from './SenaLogo';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileText,
  PenTool,
  Check,
  X
} from 'lucide-react';

interface DocumentPreviewProps {
  generalInfo: GeneralInfo;
  evidences: EvidenceItem[];
  apprentices: Apprentice[];
  selectedApprentice: Apprentice | null;
  onSelectApprentice: (apprentice: Apprentice) => void;
  signatureConfig: SignatureConfig;
  onOpenBulkDownload: () => void;
  onOpenSignatureModal?: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  generalInfo,
  evidences,
  apprentices,
  selectedApprentice,
  onSelectApprentice,
  signatureConfig,
  onOpenBulkDownload,
  onOpenSignatureModal
}) => {
  const [currentPageView, setCurrentPageView] = useState<1 | 2>(1);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isGeneratingSinglePdf, setIsGeneratingSinglePdf] = useState(false);

  // If no apprentice is selected, fallback to first
  const currentApprentice = selectedApprentice || apprentices[0] || {
    id: 'placeholder',
    nombre: 'Nombre del Aprendiz',
    documento: '12345678',
    correo: 'aprendiz@misena.edu.co',
    evidenciasStatus: {},
    observacionesEspecificas: '',
    juicioEspecifico: 'NO_APROBO'
  };

  const currentIndex = apprentices.findIndex((a) => a.id === currentApprentice.id);

  const handlePrevApprentice = () => {
    if (currentIndex > 0) {
      onSelectApprentice(apprentices[currentIndex - 1]);
    }
  };

  const handleNextApprentice = () => {
    if (currentIndex < apprentices.length - 1) {
      onSelectApprentice(apprentices[currentIndex + 1]);
    }
  };

  const handleDownloadSinglePdf = async () => {
    try {
      setIsGeneratingSinglePdf(true);
      const { blob, filename } = await generateSingleApprenticePdf(
        currentApprentice,
        generalInfo,
        evidences,
        signatureConfig
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Hubo un error generando el PDF individual.');
    } finally {
      setIsGeneratingSinglePdf(false);
    }
  };

  // Dynamic pagination calculation
  // Smart 1-page vs 2-page pagination: If 7 or fewer evidences, fits comfortably on 1 page
  const isSinglePageDoc = evidences.length <= 7;
  const page1Evidences = isSinglePageDoc ? evidences : evidences.slice(0, 7);
  const page2Evidences = isSinglePageDoc ? [] : evidences.slice(7);
  const totalPages = isSinglePageDoc ? 1 : 2;

  const effectiveJuicio = currentApprentice.juicioEspecifico || generalInfo.juicioResultado || 'NO_APROBO';
  const rapSummary = evaluateApprenticeRaps(currentApprentice, generalInfo, evidences);

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="bg-white border-2 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Apprentice Selector */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            id="prev-apprentice-btn"
            type="button"
            onClick={handlePrevApprentice}
            disabled={currentIndex <= 0}
            className="p-2.5 text-black hover:bg-slate-100 border-2 border-black disabled:opacity-20 transition"
            title="Aprendiz anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-64">
            <select
              id="apprentice-preview-select"
              value={currentApprentice.id}
              onChange={(e) => {
                const found = apprentices.find((a) => a.id === e.target.value);
                if (found) onSelectApprentice(found);
              }}
              className="w-full px-3 py-2 text-xs font-black uppercase text-black bg-slate-50 border-2 border-black outline-none focus:bg-white"
            >
              {apprentices.map((app, idx) => (
                <option key={app.id} value={app.id}>
                  {idx + 1}. {app.nombre} {app.documento ? `(CC ${app.documento})` : ''}
                </option>
              ))}
            </select>
          </div>

          <span className="hidden sm:inline-block px-2 py-1 text-[10px] font-black uppercase bg-slate-100 border border-black whitespace-nowrap">
            {currentIndex + 1} / {apprentices.length}
          </span>

          <button
            id="next-apprentice-btn"
            type="button"
            onClick={handleNextApprentice}
            disabled={currentIndex >= apprentices.length - 1}
            className="p-2.5 text-black hover:bg-slate-100 border-2 border-black disabled:opacity-20 transition"
            title="Siguiente aprendiz"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Page Switcher & Zoom */}
        <div className="flex items-center gap-3">
          {!isSinglePageDoc ? (
            <div className="flex items-center border-2 border-black bg-slate-100 p-0.5">
              <button
                id="view-page-1-btn"
                type="button"
                onClick={() => setCurrentPageView(1)}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition ${
                  currentPageView === 1
                    ? 'bg-black text-white'
                    : 'text-black hover:bg-slate-200'
                }`}
              >
                Página 1 (Evidencias 1-{page1Evidences.length})
              </button>
              <button
                id="view-page-2-btn"
                type="button"
                onClick={() => setCurrentPageView(2)}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition ${
                  currentPageView === 2
                    ? 'bg-black text-white'
                    : 'text-black hover:bg-slate-200'
                }`}
              >
                Página 2 (Juicio & Firma)
              </button>
            </div>
          ) : (
            <div className="px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-black text-white border-2 border-black">
              Documento Completo (1 Página • {evidences.length} {evidences.length === 1 ? 'Evidencia' : 'Evidencias'})
            </div>
          )}

          <div className="hidden sm:flex items-center border-2 border-black bg-white p-0.5">
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.max(0.6, prev - 0.1))}
              className="p-1.5 text-black hover:bg-slate-100"
              title="Reducir zoom"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-mono font-black px-1.5 text-black">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.min(1.3, prev + 0.1))}
              className="p-1.5 text-black hover:bg-slate-100"
              title="Aumentar zoom"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Action / Download Buttons */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {onOpenSignatureModal && (
            <button
              id="preview-quick-signature-btn"
              type="button"
              onClick={onOpenSignatureModal}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-white hover:bg-slate-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              title="Cargar o cambiar firma del instructor"
            >
              <PenTool className="h-4 w-4 text-emerald-600" />
              <span>Mi Firma</span>
            </button>
          )}

          <button
            id="download-single-pdf-btn"
            type="button"
            onClick={handleDownloadSinglePdf}
            disabled={isGeneratingSinglePdf}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-white hover:bg-slate-100 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <FileText className="h-4 w-4 text-black" />
            {isGeneratingSinglePdf ? 'Generando...' : 'Descargar PDF (Vertical)'}
          </button>

          <button
            id="download-bulk-from-preview-btn"
            type="button"
            onClick={onOpenBulkDownload}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <Download className="h-4 w-4" />
            Descargar Paquete ({apprentices.length})
          </button>
        </div>
      </div>

      {/* Document Sheet Simulation Container (Portrait Letter) */}
      <div className="overflow-x-auto p-4 sm:p-8 bg-slate-300/80 border-2 border-black flex justify-center shadow-[inset_0px_2px_4px_rgba(0,0,0,0.1)]">
        <div
          id="paper-document-container"
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top center',
            width: '800px',
            minHeight: '1080px'
          }}
          className="bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-8 sm:p-10 text-slate-900 font-sans border-2 border-black transition-all select-none"
        >
          {/* ========================================================= */}
          {/* PAGE 1 RENDER (Vertical / Portrait) */}
          {/* ========================================================= */}
          {(isSinglePageDoc || currentPageView === 1) && (
            <div className="flex flex-col justify-between min-h-[980px]">
              <div>
                {/* Official SENA Emblem & Title */}
                <div className="flex flex-col items-center justify-center mb-3">
                  <div className="h-16 w-auto flex items-center justify-center">
                    {generalInfo.senaLogoUrl ? (
                      <img
                        src={generalInfo.senaLogoUrl}
                        alt="Logo SENA"
                        className="h-14 max-h-14 w-auto object-contain"
                      />
                    ) : (
                      <SenaLogo className="h-14 w-auto" />
                    )}
                  </div>
                  <h2 className="text-base font-black tracking-wider text-black uppercase mt-1">
                    LLAMADO DE ATENCIÓN
                  </h2>
                </div>

                {/* Main Information Table */}
                <div className="border border-black text-xs leading-tight mb-4">
                  {/* Row 1: Programa & Ficha */}
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-3 bg-transparent p-1.5 font-bold border-r border-black">
                      Nombre del Programa:
                    </div>
                    <div className="col-span-5 p-1.5 border-r border-black truncate">
                      {generalInfo.programa}
                    </div>
                    <div className="col-span-2 bg-transparent p-1.5 font-bold border-r border-black text-center">
                      Código Ficha:
                    </div>
                    <div className="col-span-2 p-1.5 font-bold font-mono text-center">
                      {generalInfo.codigoFicha}
                    </div>
                  </div>

                  {/* Row 1.5: Centro de Formación & Modalidad */}
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-3 bg-transparent p-1.5 font-bold border-r border-black">
                      Centro de Formación:
                    </div>
                    <div className="col-span-5 p-1.5 border-r border-black truncate">
                      {generalInfo.centroFormacion || 'Centro de Comercio y Servicios Regional Tolima'}
                    </div>
                    <div className="col-span-2 bg-transparent p-1.5 font-bold border-r border-black text-center">
                      Modalidad:
                    </div>
                    <div className="col-span-2 p-1.5 font-bold text-center">
                      {generalInfo.modalidad || 'Virtual'}
                    </div>
                  </div>

                  {/* Row 2: Aprendiz & Correo */}
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-3 p-1.5 font-bold border-r border-black">
                      Nombre del Aprendiz:
                    </div>
                    <div className="col-span-5 p-1.5 border-r border-black font-medium">
                      {currentApprentice.nombre}{' '}
                      {currentApprentice.documento && `(C.C. ${currentApprentice.documento})`}
                    </div>
                    <div className="col-span-4 p-1.5 text-slate-700 truncate">
                      {currentApprentice.correo}
                    </div>
                  </div>

                  {/* Row 3: Instructor asignado */}
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-4 p-1.5 font-bold border-r border-black">
                      Instructor asignado a la ficha académica:
                    </div>
                    <div className="col-span-8 p-1.5 font-medium">
                      {generalInfo.nombreInstructorAsignado}
                    </div>
                  </div>

                  {/* Row 3.5: Transversal */}
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-4 p-1.5 font-bold border-r border-black">
                      Transversal:
                    </div>
                    <div className="col-span-8 p-1.5 font-medium">
                      {generalInfo.transversal || 'Transversal Inglés'}
                    </div>
                  </div>

                  {/* Row 4: Motivo */}
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-2 p-1.5 font-bold border-r border-black">
                      Motivo
                    </div>
                    <div className="col-span-10 p-1.5 text-slate-800">
                      {generalInfo.motivo}
                    </div>
                  </div>

                  {/* Row 5: Instructor que hace el llamado */}
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-4 p-1.5 font-bold border-r border-black">
                      Instructor que hace el llamado de atención:
                    </div>
                    <div className="col-span-8 p-1.5 font-medium">
                      {generalInfo.nombreInstructorLlamado}
                    </div>
                  </div>

                  {/* Row: Fechas y Plazos Institucionales */}
                  <div className="grid grid-cols-12 border-b border-black bg-slate-50/40">
                    <div className="col-span-3 p-1.5 font-bold border-r border-black">
                      Fecha de Entrega Llamado:
                    </div>
                    <div className="col-span-3 p-1.5 border-r border-black font-semibold font-mono text-slate-900">
                      {generalInfo.fechaEntregaLlamado || generalInfo.fecha || '-'}
                    </div>
                    <div className="col-span-3 p-1.5 font-bold border-r border-black">
                      Fecha Límite / Plazo Evidencias:
                    </div>
                    <div className="col-span-3 p-1.5 font-bold font-mono text-slate-900">
                      {generalInfo.fechaLimiteEvidencias || '-'}
                    </div>
                  </div>

                  {/* Row 6: Competencia */}
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-2 p-1.5 font-bold border-r border-black">
                      Competencia:
                    </div>
                    <div className="col-span-10 p-1.5 text-slate-800 text-[11px] leading-relaxed">
                      {generalInfo.competencia}
                    </div>
                  </div>

                  {/* Row 7: Resultados de Aprendizaje (con estado de aprobación por RAP) */}
                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-2 p-1.5 font-bold border-r border-black flex flex-col justify-start">
                      <span>Resultados de</span>
                      <span>Aprendizaje:</span>
                    </div>
                    <div className="col-span-10 p-2 text-[10.5px] leading-snug space-y-2 font-sans">
                      {rapSummary.raps.length > 0 ? (
                        rapSummary.raps.map((rapEval) => (
                          <div key={rapEval.rapIndex} className="flex items-start gap-2">
                            {rapEval.isApproved ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-[#a9d18e] text-black border border-black font-black text-[9px] shrink-0 mt-0.5">
                                <Check className="h-3 w-3 stroke-[3]" /> APROBÓ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-rose-200 text-rose-950 border border-rose-400 font-black text-[9px] shrink-0 mt-0.5">
                                <X className="h-3 w-3 stroke-[3]" /> NO APROBÓ
                              </span>
                            )}
                            <div className="flex-1">
                              <span className="text-slate-900 font-medium">{rapEval.rapText}</span>
                              {!rapEval.isApproved && rapEval.pendingEvidences.length > 0 && (
                                <span className="block text-[9.5px] text-rose-800 font-bold mt-0.5">
                                  (Evidencias pendientes de entrega o corrección: {rapEval.pendingEvidences.map((e) => `#${e.numero}`).join(', ')})
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        generalInfo.resultadosAprendizaje.map((ra, idx) => (
                          <div key={idx} className="text-slate-900">
                            {ra}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Row 8: Observaciones que hace el aprendiz */}
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 p-1.5 font-bold border-r border-black">
                      Observaciones que hace el aprendiz:
                    </div>
                    <div className="col-span-8 p-1.5 text-slate-600 min-h-6 text-[10.5px]">
                      {currentApprentice.observacionesEspecificas || generalInfo.observacionesAprendiz || ''}
                    </div>
                  </div>
                </div>

                {/* Evidences Table (Render ONLY real registered evidences) */}
                <div className="border border-black text-xs mb-4">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 border-b border-black text-center font-bold text-[10.5px]">
                    <div className="col-span-1 p-1.5 border-r border-black flex items-center justify-center">
                      N°
                    </div>
                    <div className="col-span-3 p-1.5 border-r border-black flex items-center justify-center uppercase text-[9px]">
                      RESULTADO DE APRENDIZAJE
                    </div>
                    <div className="col-span-4 p-1.5 border-r border-black flex items-center justify-center uppercase">
                      EVIDENCIAS
                    </div>
                    <div className="col-span-2 border-r border-black flex flex-col justify-between">
                      <div className="border-b border-black py-0.5 px-0.5 text-[8px] font-black uppercase leading-tight tracking-tight">
                        APROBÓ / PRESENTÓ<br />EVIDENCIA
                      </div>
                      <div className="grid grid-cols-2 text-[10px] font-bold">
                        <div className="border-r border-black py-0.5">SI</div>
                        <div className="py-0.5">NO</div>
                      </div>
                    </div>
                    <div className="col-span-2 p-1.5 flex items-center justify-center uppercase">
                      OBSERVACIONES
                    </div>
                  </div>

                  {/* Evidence Rows (Exact list, zero blank dummy rows) */}
                  {page1Evidences.length === 0 ? (
                    <div className="grid grid-cols-12 min-h-8 items-center text-center">
                      <div className="col-span-1 p-1 border-r border-black font-bold font-mono text-[11px]">1</div>
                      <div className="col-span-3 p-1 border-r border-black text-[10px] text-slate-500">-</div>
                      <div className="col-span-4 p-1.5 border-r border-black text-[11px] text-slate-500 italic">
                        Sin evidencias pendientes registradas
                      </div>
                      <div className="col-span-2 border-r border-black grid grid-cols-2 text-center text-[11px]">
                        <div className="border-r border-black p-1">-</div>
                        <div className="p-1">-</div>
                      </div>
                      <div className="col-span-2 p-1.5 text-[10px] text-slate-500">-</div>
                    </div>
                  ) : (
                    page1Evidences.map((ev, idx) => {
                      const rapInfo = getEvidenceRapInfo(ev, generalInfo);
                      const status = (currentApprentice.evidenciasStatus && currentApprentice.evidenciasStatus[ev.id]) || ev.defaultEstado || 'NO';

                      return (
                        <div
                          key={ev.id || idx}
                          className={`grid grid-cols-12 ${
                            idx < page1Evidences.length - 1 ? 'border-b border-black' : ''
                          } min-h-8 items-center`}
                        >
                          <div className="col-span-1 p-1 border-r border-black text-center font-bold font-mono text-[11px]">
                            {idx + 1}
                          </div>
                          <div className="col-span-3 p-1.5 border-r border-black text-[10px] font-bold text-slate-800 leading-tight">
                            {rapInfo.title}
                          </div>
                          <div className="col-span-4 p-1.5 border-r border-black text-[10.5px] font-medium leading-tight">
                            {ev.nombre}
                          </div>
                          <div className="col-span-2 border-r border-black grid grid-cols-2 text-center font-bold text-[11px]">
                            <div className="border-r border-black p-1">{status === 'SI' ? 'SI' : ''}</div>
                            <div className="p-1">
                              {status === 'CORREGIR' ? (
                                <span className="text-[9px] font-black uppercase bg-white text-black px-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                  CORR
                                </span>
                              ) : status === 'NO' ? (
                                'NO'
                              ) : status === '-' ? (
                                '-'
                              ) : (
                                ''
                              )}
                            </div>
                          </div>
                          <div className="col-span-2 p-1.5 text-[9.5px] text-slate-700 leading-tight">
                            {ev.observacion || (status === 'CORREGIR' ? 'Debe corregir y presentar ajustes' : '')}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* If single page doc, render PLAN DE MEJORAMIENTO, JUICIO and SIGNATURES directly on Page 1 */}
                {isSinglePageDoc && (
                  <>
                    {/* PLAN DE MEJORAMIENTO Section */}
                    {(generalInfo.planMejoramientoActivo ?? true) && (
                      <div className="border border-black text-xs mb-4 mt-3">
                        <div className="bg-slate-100 border-b border-black p-1.5 font-bold text-[10px] uppercase text-center tracking-wider">
                          PLAN DE MEJORAMIENTO {(generalInfo.planMejoramientoTipo || 'Académico').toUpperCase()}
                        </div>
                        <div className="grid grid-cols-12 border-b border-black">
                          <div className="col-span-3 p-1.5 font-bold border-r border-black text-[10px] bg-slate-50/60">
                            Acciones a Desarrollar:
                          </div>
                          <div className="col-span-9 p-1.5 text-[9.5px] text-slate-900 leading-snug">
                            {currentApprentice.planMejoramientoEspecifico || generalInfo.planMejoramientoDescripcion || 'El aprendiz deberá presentar y sustentar la totalidad de las evidencias pendientes o en estado de corrección en la plataforma.'}
                          </div>
                        </div>
                        <div className="grid grid-cols-12 border-b border-black bg-slate-50/30">
                          <div className="col-span-3 p-1.5 font-bold border-r border-black text-[10px]">
                            Fecha Límite Cumplimiento:
                          </div>
                          <div className="col-span-9 p-1.5 font-mono font-bold text-[10px] text-slate-900">
                            {generalInfo.planMejoramientoFechaLimite || generalInfo.fechaLimiteEvidencias || '-'}
                          </div>
                        </div>
                        {generalInfo.planMejoramientoCompromiso && (
                          <div className="grid grid-cols-12">
                            <div className="col-span-3 p-1.5 font-bold border-r border-black text-[10px] bg-slate-50/60">
                              Compromiso Institucional:
                            </div>
                            <div className="col-span-9 p-1.5 text-[9px] text-slate-700 italic leading-snug">
                              {generalInfo.planMejoramientoCompromiso}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* JUICIO Section */}
                    <div className="border border-black text-xs grid grid-cols-12 mb-6 mt-2">
                      <div className="col-span-2 p-2 font-bold border-r border-black flex items-center justify-center uppercase text-center">
                        JUICIO
                      </div>
                      <div className="col-span-4 p-2 border-r border-black text-[10px] flex items-center leading-tight">
                        {generalInfo.juicioTexto || 'Para superar los resultados de aprendizaje a evaluar debe aprobar todas las evidencias asignadas.'}
                      </div>
                      <div className="col-span-6 flex flex-col">
                        {/* Header */}
                        <div className="grid grid-cols-12 border-b border-black text-center font-bold text-[9px] bg-slate-50">
                          <div className="col-span-7 p-1 border-r border-black flex items-center justify-center uppercase">
                            JUICIO RESULTADO(S) DE APRENDIZAJE
                          </div>
                          <div className="col-span-3 p-1 border-r border-black">APROBÓ</div>
                          <div className="col-span-2 p-1">NO APROBÓ</div>
                        </div>

                        {/* Rows per RAP */}
                        {rapSummary.raps.length > 0 ? (
                          rapSummary.raps.map((r, rIdx) => {
                            const cleanRapText = r.rapText
                              .replace(/^(RAP\s*\d+|RAP-\d+|R\.A\.P\.\s*\d+|R\.A\.\s*\d+|RA\s*\d+)[\s:\-\.]*/i, '')
                              .trim();
                            const displayRapText = cleanRapText ? `${r.rapTitle}: ${cleanRapText}` : r.rapText;
                            return (
                              <div
                                key={r.rapIndex}
                                className={`grid grid-cols-12 ${
                                  rIdx < rapSummary.raps.length - 1 ? 'border-b border-black' : ''
                                } text-[10px] items-center`}
                              >
                                <div className="col-span-7 p-1 border-r border-black font-semibold truncate" title={displayRapText}>
                                  {displayRapText}
                                </div>
                                <div className="col-span-3 p-1 border-r border-black text-center font-black text-sm">
                                  {r.isApproved ? <span className="text-emerald-800 font-mono">x</span> : ''}
                                </div>
                                <div className="col-span-2 p-1 text-center font-black text-sm">
                                  {!r.isApproved ? <span className="text-rose-800 font-mono">x</span> : ''}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="grid grid-cols-12 text-[10px] items-center">
                            <div className="col-span-7 p-1 border-r border-black font-semibold">
                              Juicio General
                            </div>
                            <div className="col-span-3 p-1 border-r border-black text-center font-black text-sm">
                              {effectiveJuicio === 'APROBO' ? 'x' : ''}
                            </div>
                            <div className="col-span-2 p-1 text-center font-black text-sm">
                              {effectiveJuicio === 'NO_APROBO' ? 'x' : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signatures Section (Firmas - 4 Columns) */}
                    <div className="grid grid-cols-4 gap-3 pt-6 text-center text-[10px]">
                      {/* Column 1: Instructor */}
                      <div className="flex flex-col justify-end">
                        <div className="h-14 flex items-end justify-center mb-1">
                          {signatureConfig.instructorSignatureData ? (
                            <img
                              src={signatureConfig.instructorSignatureData}
                              alt="Firma del Instructor"
                              className="max-h-14 max-w-full object-contain"
                            />
                          ) : signatureConfig.instructorSignatureType === 'text' ? (
                            <span className="font-serif italic text-base text-blue-900 font-bold">
                              {signatureConfig.instructorName || generalInfo.nombreInstructorLlamado}
                            </span>
                          ) : (
                            <div className="text-[9.5px] text-slate-400 italic">Espacio para firma</div>
                          )}
                        </div>
                        <div className="border-t border-black pt-1.5">
                          <div className="font-medium text-slate-900 mb-0.5 truncate text-[10px]">
                            {signatureConfig.instructorName || generalInfo.nombreInstructorLlamado}
                          </div>
                          <div className="font-black uppercase tracking-tight text-[9px]">
                            PRIMER LLAMADO INSTRUCTOR
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Aprendiz */}
                      <div className="flex flex-col justify-end">
                        <div className="h-14"></div>
                        <div className="border-t border-black pt-1.5">
                          <div className="font-black uppercase tracking-tight text-[9px]">
                            FIRMA APRENDIZ
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Coordinador */}
                      <div className="flex flex-col justify-end">
                        <div className="h-14"></div>
                        <div className="border-t border-black pt-1.5">
                          <div className="font-black uppercase tracking-tight leading-tight text-[8.5px]">
                            SEGUNDO LLAMADO COORDINADOR ACADEMICO
                          </div>
                        </div>
                      </div>

                      {/* Column 4: Subdirector / Comité */}
                      <div className="flex flex-col justify-end">
                        <div className="h-14"></div>
                        <div className="border-t border-black pt-1.5">
                          <div className="font-black uppercase tracking-tight leading-tight text-[8.5px]">
                            TERCER LLAMADO SUBDIRECTOR – COMITÉ EVALUACION
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Page 1 Bottom Indicator */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-4 border-t border-slate-200 mt-6">
                <span>Llamado de Atención • SENA (Formato Vertical)</span>
                <span>Página 1 de {totalPages}</span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PAGE 2 RENDER (Only rendered if multi-page doc) */}
          {/* ========================================================= */}
          {!isSinglePageDoc && currentPageView === 2 && (
            <div className="flex flex-col justify-between min-h-[980px]">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-black mb-2">
                  Continuación de Evidencias
                </h3>

                {/* Evidences Continuation Table (ONLY real remaining evidences) */}
                <div className="border border-black text-xs mb-5">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 border-b border-black text-center font-bold text-[10.5px]">
                    <div className="col-span-1 p-1.5 border-r border-black flex items-center justify-center">N°</div>
                    <div className="col-span-3 p-1.5 border-r border-black flex items-center justify-center uppercase text-[9px]">RESULTADO DE APRENDIZAJE</div>
                    <div className="col-span-4 p-1.5 border-r border-black flex items-center justify-center uppercase">EVIDENCIAS</div>
                    <div className="col-span-2 border-r border-black grid grid-cols-2 text-center text-[10px]">
                      <div className="border-r border-black py-1">SI</div>
                      <div className="py-1">NO</div>
                    </div>
                    <div className="col-span-2 p-1.5 flex items-center justify-center uppercase">OBSERVACIONES</div>
                  </div>

                  {page2Evidences.map((ev, idx) => {
                    const rowNum = 9 + idx;
                    const rapInfo = getEvidenceRapInfo(ev, generalInfo);
                    const status = (currentApprentice.evidenciasStatus && currentApprentice.evidenciasStatus[ev.id]) || ev.defaultEstado || 'NO';

                    return (
                      <div
                        key={ev.id || idx}
                        className={`grid grid-cols-12 ${
                          idx < page2Evidences.length - 1 ? 'border-b border-black' : ''
                        } min-h-7 items-center`}
                      >
                        <div className="col-span-1 p-1 border-r border-black text-center font-bold font-mono text-[10.5px]">
                          {rowNum}
                        </div>
                        <div className="col-span-3 p-1.5 border-r border-black text-[10px] font-bold text-slate-800 leading-tight">
                          {rapInfo.title}
                        </div>
                        <div className="col-span-4 p-1.5 border-r border-black text-[10.5px] font-medium leading-tight">
                          {ev.nombre}
                        </div>
                        <div className="col-span-2 border-r border-black grid grid-cols-2 text-center font-bold text-[11px]">
                          <div className="border-r border-black p-1">{status === 'SI' ? 'SI' : ''}</div>
                          <div className="p-1">
                            {status === 'CORREGIR' ? (
                              <span className="text-[8.5px] font-black uppercase bg-white text-black px-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                CORR
                              </span>
                            ) : status === 'NO' ? (
                              'NO'
                            ) : status === '-' ? (
                              '-'
                            ) : (
                              ''
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 p-1.5 text-[9.5px] text-slate-700 leading-tight">
                          {ev.observacion || (status === 'CORREGIR' ? 'Debe corregir' : '')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PLAN DE MEJORAMIENTO Section (Page 2) */}
                {(generalInfo.planMejoramientoActivo ?? true) && (
                  <div className="border border-black text-xs mb-5 mt-4">
                    <div className="bg-slate-100 border-b border-black p-1.5 font-bold text-[10px] uppercase text-center tracking-wider">
                      PLAN DE MEJORAMIENTO {(generalInfo.planMejoramientoTipo || 'Académico').toUpperCase()}
                    </div>
                    <div className="grid grid-cols-12 border-b border-black">
                      <div className="col-span-3 p-1.5 font-bold border-r border-black text-[10px] bg-slate-50/60">
                        Acciones a Desarrollar:
                      </div>
                      <div className="col-span-9 p-1.5 text-[9.5px] text-slate-900 leading-snug">
                        {currentApprentice.planMejoramientoEspecifico || generalInfo.planMejoramientoDescripcion || 'El aprendiz deberá presentar y sustentar la totalidad de las evidencias pendientes o en estado de corrección en la plataforma.'}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 border-b border-black bg-slate-50/30">
                      <div className="col-span-3 p-1.5 font-bold border-r border-black text-[10px]">
                        Fecha Límite Cumplimiento:
                      </div>
                      <div className="col-span-9 p-1.5 font-mono font-bold text-[10px] text-slate-900">
                        {generalInfo.planMejoramientoFechaLimite || generalInfo.fechaLimiteEvidencias || '-'}
                      </div>
                    </div>
                    {generalInfo.planMejoramientoCompromiso && (
                      <div className="grid grid-cols-12">
                        <div className="col-span-3 p-1.5 font-bold border-r border-black text-[10px] bg-slate-50/60">
                          Compromiso Institucional:
                        </div>
                        <div className="col-span-9 p-1.5 text-[9px] text-slate-700 italic leading-snug">
                          {generalInfo.planMejoramientoCompromiso}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* JUICIO Section */}
                <div className="border border-black text-xs grid grid-cols-12 mb-8 mt-4">
                  <div className="col-span-2 p-2 font-bold border-r border-black flex items-center justify-center uppercase text-center">
                    JUICIO
                  </div>
                  <div className="col-span-4 p-2 border-r border-black text-[10px] flex items-center leading-tight">
                    {generalInfo.juicioTexto || 'Para superar los resultados de aprendizaje a evaluar debe aprobar todas las evidencias asignadas.'}
                  </div>
                  <div className="col-span-6 flex flex-col">
                    {/* Header */}
                    <div className="grid grid-cols-12 border-b border-black text-center font-bold text-[9px] bg-slate-50">
                      <div className="col-span-7 p-1 border-r border-black flex items-center justify-center uppercase">
                        JUICIO RESULTADO(S) DE APRENDIZAJE
                      </div>
                      <div className="col-span-3 p-1 border-r border-black">APROBÓ</div>
                      <div className="col-span-2 p-1">NO APROBÓ</div>
                    </div>

                    {/* Rows per RAP */}
                    {rapSummary.raps.length > 0 ? (
                      rapSummary.raps.map((r, rIdx) => {
                        const cleanRapText = r.rapText
                          .replace(/^(RAP\s*\d+|RAP-\d+|R\.A\.P\.\s*\d+|R\.A\.\s*\d+|RA\s*\d+)[\s:\-\.]*/i, '')
                          .trim();
                        const displayRapText = cleanRapText ? `${r.rapTitle}: ${cleanRapText}` : r.rapText;
                        return (
                          <div
                            key={r.rapIndex}
                            className={`grid grid-cols-12 ${
                              rIdx < rapSummary.raps.length - 1 ? 'border-b border-black' : ''
                            } text-[10px] items-center`}
                          >
                            <div className="col-span-7 p-1 border-r border-black font-semibold truncate" title={displayRapText}>
                              {displayRapText}
                            </div>
                            <div className="col-span-3 p-1 border-r border-black text-center font-black text-sm">
                              {r.isApproved ? <span className="text-emerald-800 font-mono">x</span> : ''}
                            </div>
                            <div className="col-span-2 p-1 text-center font-black text-sm">
                              {!r.isApproved ? <span className="text-rose-800 font-mono">x</span> : ''}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="grid grid-cols-12 text-[10px] items-center">
                        <div className="col-span-7 p-1 border-r border-black font-semibold">
                          Juicio General
                        </div>
                        <div className="col-span-3 p-1 border-r border-black text-center font-black text-sm">
                          {effectiveJuicio === 'APROBO' ? 'x' : ''}
                        </div>
                        <div className="col-span-2 p-1 text-center font-black text-sm">
                          {effectiveJuicio === 'NO_APROBO' ? 'x' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signatures Section (Firmas - 4 Columns) */}
                <div className="grid grid-cols-4 gap-4 pt-6 text-center text-[10px]">
                  {/* Column 1: Instructor */}
                  <div className="flex flex-col justify-end">
                    <div className="h-16 flex items-end justify-center mb-1">
                      {signatureConfig.instructorSignatureData ? (
                        <img
                          src={signatureConfig.instructorSignatureData}
                          alt="Firma del Instructor"
                          className="max-h-16 max-w-full object-contain"
                        />
                      ) : signatureConfig.instructorSignatureType === 'text' ? (
                        <span className="font-serif italic text-lg text-blue-900 font-bold">
                          {signatureConfig.instructorName || generalInfo.nombreInstructorLlamado}
                        </span>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">Espacio para firma</div>
                      )}
                    </div>
                    <div className="border-t border-black pt-1.5">
                      <div className="font-medium text-slate-900 mb-0.5 truncate">
                        {signatureConfig.instructorName || generalInfo.nombreInstructorLlamado}
                      </div>
                      <div className="font-black uppercase tracking-tight text-[9.5px]">
                        PRIMER LLAMADO INSTRUCTOR
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Aprendiz */}
                  <div className="flex flex-col justify-end">
                    <div className="h-16"></div>
                    <div className="border-t border-black pt-1.5">
                      <div className="font-black uppercase tracking-tight text-[9.5px]">
                        FIRMA APRENDIZ
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Coordinador */}
                  <div className="flex flex-col justify-end">
                    <div className="h-16"></div>
                    <div className="border-t border-black pt-1.5">
                      <div className="font-black uppercase tracking-tight leading-tight text-[9px]">
                        SEGUNDO LLAMADO COORDINADOR ACADEMICO
                      </div>
                    </div>
                  </div>

                  {/* Column 4: Subdirector / Comité */}
                  <div className="flex flex-col justify-end">
                    <div className="h-16"></div>
                    <div className="border-t border-black pt-1.5">
                      <div className="font-black uppercase tracking-tight leading-tight text-[9px]">
                        TERCER LLAMADO SUBDIRECTOR – COMITÉ EVALUACION
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page 2 Bottom Indicator */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-4 border-t border-slate-200 mt-6">
                <span>Llamado de Atención • SENA (Formato Vertical)</span>
                <span>Página 2 de 2</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
