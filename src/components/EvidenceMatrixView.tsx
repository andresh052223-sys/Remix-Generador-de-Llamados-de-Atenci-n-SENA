import React, { useState, useMemo, useRef } from 'react';
import { Apprentice, EvidenceItem, EvidenceStatus, GeneralInfo, SignatureConfig } from '../types';
import { exportEvidenceMatrixExcel, parseExcelMatrix, ParsedExcelResult } from '../utils/excelParser';
import { downloadActiveApprenticesPlanillaPdf } from '../utils/activeApprenticesPdf';
import { ExcelImportModal } from './ExcelImportModal';
import { NameFormatModal } from './NameFormatModal';
import { parseFullName, normalizeSortKey } from '../utils/nameUtils';
import { evaluateApprenticeRaps, getRapShortTitle, ApprenticeRapSummary } from '../utils/rapUtils';
import {
  TableProperties,
  Check,
  X,
  AlertTriangle,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  HelpCircle,
  Users,
  Eye,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ArrowDownAZ,
  ArrowUpZA,
  UserCheck,
  BookOpen,
  Award,
  FileDown,
  Printer,
  ChevronDown
} from 'lucide-react';

interface EvidenceMatrixViewProps {
  apprentices: Apprentice[];
  setApprentices: React.Dispatch<React.SetStateAction<Apprentice[]>>;
  evidences: EvidenceItem[];
  setEvidences: React.Dispatch<React.SetStateAction<EvidenceItem[]>>;
  generalInfo?: GeneralInfo;
  signatureConfig?: SignatureConfig;
  onSelectApprenticeForPreview: (apprentice: Apprentice) => void;
  onNavigateToTab?: (tab: any) => void;
}

type MatrixSortMode = 'NONE' | 'APELLIDOS_AZ' | 'APELLIDOS_ZA' | 'NOMBRES_AZ' | 'NOMBRES_ZA';

export const EvidenceMatrixView: React.FC<EvidenceMatrixViewProps> = ({
  apprentices,
  setApprentices,
  evidences,
  setEvidences,
  generalInfo,
  signatureConfig,
  onSelectApprenticeForPreview,
  onNavigateToTab
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<MatrixSortMode>('NONE');
  
  // Excel upload
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelResult, setExcelResult] = useState<ParsedExcelResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isNameFormatModalOpen, setIsNameFormatModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // PDF Planilla states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfScope, setPdfScope] = useState<'ALL' | 'FILTERED'>('ALL');
  const [pdfIncludeConventions, setPdfIncludeConventions] = useState(true);

  // Active cell quick selector popup
  const [activeCell, setActiveCell] = useState<{
    apprenticeId: string;
    evidenceId: string;
    apprenticeName: string;
    evidenceName: string;
    evidenceNumero: number;
    currentStatus: EvidenceStatus;
  } | null>(null);

  const rapsList = generalInfo?.resultadosAprendizaje || [];

  // Helper to get apprentice's status for an evidence
  const getStatus = (app: Apprentice, evId: string): EvidenceStatus => {
    if (app.evidenciasStatus && app.evidenciasStatus[evId] !== undefined) {
      return app.evidenciasStatus[evId];
    }
    const ev = evidences.find((e) => e.id === evId);
    return ev?.defaultEstado || 'NO';
  };

  // Map of apprentice id to evaluated RAPs
  const apprenticeRapsMap = useMemo(() => {
    const map = new Map<string, ApprenticeRapSummary>();
    if (!generalInfo) return map;
    apprentices.forEach((app) => {
      map.set(app.id, evaluateApprenticeRaps(app, generalInfo, evidences));
    });
    return map;
  }, [apprentices, generalInfo, evidences]);

  // Global RAP approval statistics
  const rapGlobalStats = useMemo(() => {
    return rapsList.map((rapText, idx) => {
      const title = getRapShortTitle(rapText, idx);
      const assigned = evidences.filter((e) => e.rapIndex === idx);
      let approvedCount = 0;
      let pendingCount = 0;

      apprentices.forEach((app) => {
        const evalSummary = apprenticeRapsMap.get(app.id);
        const rapEval = evalSummary?.raps[idx];
        if (rapEval?.isApproved) {
          approvedCount++;
        } else {
          pendingCount++;
        }
      });

      const total = apprentices.length;
      const percentage = total > 0 ? Math.round((approvedCount / total) * 100) : 0;

      return {
        idx,
        title,
        text: rapText,
        assignedEvidencesCount: assigned.length,
        approvedCount,
        pendingCount,
        percentage
      };
    });
  }, [rapsList, evidences, apprentices, apprenticeRapsMap]);

  // Cycle status on single cell click: SI -> CORREGIR -> NO -> SI
  const handleCycleCellStatus = (apprenticeId: string, evidenceId: string) => {
    setApprentices((prev) =>
      prev.map((app) => {
        if (app.id !== apprenticeId) return app;
        const current = getStatus(app, evidenceId);
        let next: EvidenceStatus = 'SI';
        if (current === 'SI') next = 'CORREGIR';
        else if (current === 'CORREGIR') next = 'NO';
        else if (current === 'NO') next = 'SI';
        else next = 'SI';

        return {
          ...app,
          evidenciasStatus: {
            ...(app.evidenciasStatus || {}),
            [evidenceId]: next
          }
        };
      })
    );
  };

  // Set explicit status for a single cell
  const handleSetCellStatus = (apprenticeId: string, evidenceId: string, status: EvidenceStatus) => {
    setApprentices((prev) =>
      prev.map((app) => {
        if (app.id !== apprenticeId) return app;
        return {
          ...app,
          evidenciasStatus: {
            ...(app.evidenciasStatus || {}),
            [evidenceId]: status
          }
        };
      })
    );
    setActiveCell(null);
  };

  // Batch action: Set all evidences of one apprentice to a status
  const handleSetRowStatus = (apprenticeId: string, status: EvidenceStatus) => {
    setApprentices((prev) =>
      prev.map((app) => {
        if (app.id !== apprenticeId) return app;
        const updatedStatus: Record<string, EvidenceStatus> = { ...(app.evidenciasStatus || {}) };
        evidences.forEach((ev) => {
          updatedStatus[ev.id] = status;
        });
        return {
          ...app,
          evidenciasStatus: updatedStatus
        };
      })
    );
  };

  // Batch action: Set a whole evidence column for all apprentices to a status
  const handleSetColumnStatus = (evidenceId: string, status: EvidenceStatus) => {
    setApprentices((prev) =>
      prev.map((app) => ({
        ...app,
        evidenciasStatus: {
          ...(app.evidenciasStatus || {}),
          [evidenceId]: status
        }
      }))
    );
    setNotification({
      type: 'info',
      text: `Se marcó la columna completa en estado "${status}".`
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Global batch action for all apprentices and all evidences
  const handleSetAllMatrix = (status: EvidenceStatus) => {
    setApprentices((prev) =>
      prev.map((app) => {
        const updatedStatus: Record<string, EvidenceStatus> = {};
        evidences.forEach((ev) => {
          updatedStatus[ev.id] = status;
        });
        return {
          ...app,
          evidenciasStatus: updatedStatus
        };
      })
    );
    setNotification({
      type: 'success',
      text: `Se actualizaron todas las casillas de la matriz a "${status}" para los ${apprentices.length} aprendices.`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Sort apprentices
  const sortedApprentices = useMemo(() => {
    const list = [...apprentices];
    if (sortOrder === 'APELLIDOS_AZ' || sortOrder === 'APELLIDOS_ZA') {
      list.sort((a, b) => {
        const parsedA = parseFullName(a.nombre || '');
        const parsedB = parseFullName(b.nombre || '');
        const keyA = normalizeSortKey(parsedA.lastNames || parsedA.original);
        const keyB = normalizeSortKey(parsedB.lastNames || parsedB.original);
        const res = keyA.localeCompare(keyB, 'es', { sensitivity: 'base' });
        if (res !== 0) return sortOrder === 'APELLIDOS_AZ' ? res : -res;
        return sortOrder === 'APELLIDOS_AZ'
          ? normalizeSortKey(parsedA.firstNames).localeCompare(normalizeSortKey(parsedB.firstNames), 'es', { sensitivity: 'base' })
          : normalizeSortKey(parsedB.firstNames).localeCompare(normalizeSortKey(parsedA.firstNames), 'es', { sensitivity: 'base' });
      });
    } else if (sortOrder === 'NOMBRES_AZ' || sortOrder === 'NOMBRES_ZA') {
      list.sort((a, b) => {
        const parsedA = parseFullName(a.nombre || '');
        const parsedB = parseFullName(b.nombre || '');
        const keyA = normalizeSortKey(parsedA.firstNames || parsedA.original);
        const keyB = normalizeSortKey(parsedB.firstNames || parsedB.original);
        const res = keyA.localeCompare(keyB, 'es', { sensitivity: 'base' });
        if (res !== 0) return sortOrder === 'NOMBRES_AZ' ? res : -res;
        return sortOrder === 'NOMBRES_AZ'
          ? normalizeSortKey(parsedA.lastNames).localeCompare(normalizeSortKey(parsedB.lastNames), 'es', { sensitivity: 'base' })
          : normalizeSortKey(parsedB.lastNames).localeCompare(normalizeSortKey(parsedA.lastNames), 'es', { sensitivity: 'base' });
      });
    }
    return list;
  }, [apprentices, sortOrder]);

  // Filtered apprentices by search and status filter
  const displayedApprentices = useMemo(() => {
    return sortedApprentices.filter((app) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.nombre.toLowerCase().includes(q) ||
        (app.documento && app.documento.includes(q)) ||
        (app.correo && app.correo.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;

      const appStatuses = evidences.map((ev) => getStatus(app, ev.id));
      if (statusFilter === 'CORREGIR') {
        return appStatuses.includes('CORREGIR');
      }
      if (statusFilter === 'NO') {
        return appStatuses.includes('NO');
      }
      if (statusFilter === 'SI') {
        return appStatuses.every((s) => s === 'SI');
      }

      // RAP specific filters
      if (statusFilter.startsWith('RAP_')) {
        const parts = statusFilter.split('_');
        const rapIdx = parseInt(parts[1], 10);
        const filterType = parts[2]; // 'APROBO' or 'NO'
        const evalSummary = apprenticeRapsMap.get(app.id);
        const rapEval = evalSummary?.raps[rapIdx];
        if (filterType === 'APROBO') {
          return rapEval?.isApproved === true;
        } else {
          return rapEval?.isApproved === false;
        }
      }

      return true;
    });
  }, [sortedApprentices, searchTerm, statusFilter, evidences, apprenticeRapsMap]);

  // Matrix stats
  const stats = useMemo(() => {
    let totalAllSi = 0;
    let totalWithCorregir = 0;
    let totalWithNo = 0;

    apprentices.forEach((app) => {
      const appStatuses = evidences.map((ev) => getStatus(app, ev.id));
      if (appStatuses.every((s) => s === 'SI')) totalAllSi++;
      if (appStatuses.includes('CORREGIR')) totalWithCorregir++;
      if (appStatuses.includes('NO')) totalWithNo++;
    });

    return {
      total: apprentices.length,
      allSi: totalAllSi,
      withCorregir: totalWithCorregir,
      withNo: totalWithNo
    };
  }, [apprentices, evidences]);

  // Handle Excel Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await parseExcelMatrix(file, evidences, apprentices);
      setExcelResult(result);
      setIsExcelModalOpen(true);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        text: err.message || 'Error al procesar el archivo Excel.'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportExcel = () => {
    exportEvidenceMatrixExcel(apprentices, evidences, `Matriz_Seguimiento_SENA_${apprentices.length}_Aprendices.xlsx`);
    setNotification({
      type: 'success',
      text: `Se descargó la Matriz en Excel con ${apprentices.length} aprendices y ${evidences.length} columnas de evidencias.`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDownloadPlanillaPdf = async (scope: 'ALL' | 'FILTERED' = pdfScope) => {
    try {
      setIsExportingPdf(true);
      const targetApprentices = scope === 'FILTERED' ? displayedApprentices : sortedApprentices;

      if (targetApprentices.length === 0) {
        setNotification({
          type: 'error',
          text: 'No hay aprendices disponibles para generar la planilla PDF.'
        });
        setTimeout(() => setNotification(null), 4000);
        setIsExportingPdf(false);
        return;
      }

      const fileName = await downloadActiveApprenticesPlanillaPdf({
        apprentices: targetApprentices,
        evidences,
        generalInfo: generalInfo || ({} as GeneralInfo),
        signatureConfig,
        includeConventions: pdfIncludeConventions
      });

      setNotification({
        type: 'success',
        text: `¡Planilla PDF "${fileName}" descargada con éxito (${targetApprentices.length} aprendices activos)!`
      });
      setTimeout(() => setNotification(null), 5000);
      setIsPdfModalOpen(false);
    } catch (err) {
      console.error('Error generating Planilla PDF:', err);
      setNotification({
        type: 'error',
        text: 'Ocurrió un error al generar la planilla en PDF. Por favor intenta de nuevo.'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - SENA Style */}
      <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* SENA Style Symbol */}
            <div className="h-14 w-14 bg-emerald-400 border-3 border-black flex flex-col items-center justify-center p-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0">
              <TableProperties className="h-7 w-7 text-black stroke-[2.5]" />
              <span className="text-[8px] font-black tracking-widest text-black mt-0.5">SENA</span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-300">
                  Panel de Calificaciones & Seguimiento
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {apprentices.length} Aprendices • {evidences.length} Evidencias {rapsList.length > 0 && `• ${rapsList.length} RAPs`}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black mt-1">
                Matriz de Aprendices y Resultados de Aprendizaje
              </h2>
              <p className="text-xs font-semibold text-slate-700 max-w-2xl mt-0.5">
                Haga clic directamente sobre cualquier casilla para alternar entre{' '}
                <span className="bg-[#a9d18e] text-black px-1 py-0.2 font-black border border-black text-[11px]">SI (Aprobó)</span>,{' '}
                <span className="bg-white text-black px-1 py-0.2 font-black border border-black text-[11px]">CORREGIR</span> o{' '}
                <span className="bg-rose-200 text-rose-950 px-1 py-0.2 font-black border border-rose-400 text-[11px]">NO (No Aprobó)</span>.
                Los Resultados de Aprendizaje (RAPs) se calculan automáticamente según las evidencias asignadas.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            {/* Official PDF Planilla of Active Apprentices */}
            <div className="inline-flex items-center">
              <button
                id="matrix-export-pdf-btn"
                type="button"
                onClick={() => {
                  if (searchTerm.trim() || statusFilter !== 'ALL') {
                    setIsPdfModalOpen(true);
                  } else {
                    handleDownloadPlanillaPdf('ALL');
                  }
                }}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider bg-rose-50 hover:bg-rose-100 text-rose-950 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition group"
                title="Descargar Planilla Oficial de Aprendices Activos en PDF (formato horizontal con cuadrícula de evidencias y RAPs)"
              >
                {isExportingPdf ? (
                  <RefreshCw className="h-4 w-4 text-rose-700 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 text-rose-700 group-hover:scale-110 transition-transform" />
                )}
                <span>{isExportingPdf ? 'Generando PDF...' : 'Descargar Planilla PDF'}</span>
                <span className="bg-rose-200 text-rose-900 border border-rose-400 px-1 py-0.2 text-[9px] font-black rounded ml-0.5">
                  OFICIAL
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                disabled={isExportingPdf}
                className="px-2 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-950 border-2 border-l-0 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
                title="Opciones avanzadas para generar la planilla PDF (todos o filtrados)"
              >
                <ChevronDown className="h-3.5 w-3.5 text-rose-900" />
              </button>
            </div>

            <button
              id="matrix-export-excel-btn"
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider bg-white hover:bg-slate-100 text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
              title="Descargar matriz de evidencias en archivo Excel (.xlsx)"
            >
              <Download className="h-4 w-4 text-emerald-700" />
              <span>Descargar Matriz Excel</span>
            </button>

            <button
              id="matrix-upload-excel-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider bg-emerald-400 hover:bg-emerald-500 text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
              title="Cargar y sincronizar archivo Excel editado con las calificaciones"
            >
              <Upload className="h-4 w-4" />
              <span>{isUploading ? 'Leyendo Excel...' : 'Cargar / Actualizar Excel'}</span>
            </button>

            {/* Sort by Last Names */}
            <button
              type="button"
              onClick={() => {
                if (sortOrder === 'APELLIDOS_AZ') setSortOrder('APELLIDOS_ZA');
                else if (sortOrder === 'APELLIDOS_ZA') setSortOrder('NONE');
                else setSortOrder('APELLIDOS_AZ');
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition ${
                sortOrder === 'APELLIDOS_AZ' || sortOrder === 'APELLIDOS_ZA'
                  ? 'bg-black text-white'
                  : 'bg-emerald-100 text-emerald-950 hover:bg-emerald-200'
              }`}
              title="Ordenar por Apellidos"
            >
              {sortOrder === 'APELLIDOS_ZA' ? <ArrowUpZA className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />}
              <span>Por Apellidos {sortOrder === 'APELLIDOS_AZ' ? '(A-Z)' : sortOrder === 'APELLIDOS_ZA' ? '(Z-A)' : ''}</span>
            </button>

            {/* Sort by First Names */}
            <button
              type="button"
              onClick={() => {
                if (sortOrder === 'NOMBRES_AZ') setSortOrder('NOMBRES_ZA');
                else if (sortOrder === 'NOMBRES_ZA') setSortOrder('NONE');
                else setSortOrder('NOMBRES_AZ');
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition ${
                sortOrder === 'NOMBRES_AZ' || sortOrder === 'NOMBRES_ZA'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-slate-100'
              }`}
              title="Ordenar por Nombres"
            >
              {sortOrder === 'NOMBRES_ZA' ? <ArrowUpZA className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />}
              <span>Por Nombres {sortOrder === 'NOMBRES_AZ' ? '(A-Z)' : sortOrder === 'NOMBRES_ZA' ? '(Z-A)' : ''}</span>
            </button>

            {/* Estructura Nombres Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsNameFormatModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-black uppercase bg-amber-300 hover:bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition"
              title="Cambiar formato del nombre (Iniciar por Apellidos o por Nombres)"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Estructura Nombres</span>
            </button>
          </div>
        </div>

        {/* Learning Outcomes (RAPs) Dynamic Overview Banner */}
        {rapsList.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <Award className="h-4 w-4 text-emerald-700" />
                Estado Global de Resultados de Aprendizaje ({rapsList.length} RAPs):
              </span>
              <span className="text-[10px] text-slate-500 font-bold">
                Un RAP se aprueba cuando el aprendiz tiene 'SI' en todas sus evidencias asociadas.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rapGlobalStats.map((rap) => (
                <div
                  key={rap.idx}
                  className="p-3 bg-white border-2 border-black flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-black text-white font-black text-[10px] uppercase">
                        {rap.title}
                      </span>
                      <span className="text-[11px] font-black text-emerald-800 font-mono">
                        {rap.approvedCount} de {apprentices.length} Aprobados ({rap.percentage}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-800 line-clamp-2 font-medium" title={rap.text}>
                      {rap.text}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 font-bold">
                        {rap.approvedCount} Aprobó
                      </span>
                      <span className="bg-rose-100 text-rose-900 border border-rose-300 px-1.5 py-0.5 font-bold">
                        {rap.pendingCount} No Aprobó
                      </span>
                      <span className="text-slate-500">
                        ({rap.assignedEvidencesCount} {rap.assignedEvidencesCount === 1 ? 'evidencia' : 'evidencias'})
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === `RAP_${rap.idx}_APROBO` ? 'ALL' : `RAP_${rap.idx}_APROBO`)}
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 border ${
                          statusFilter === `RAP_${rap.idx}_APROBO`
                            ? 'bg-emerald-400 text-black border-black'
                            : 'text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        Ver Aprobados
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === `RAP_${rap.idx}_NO` ? 'ALL' : `RAP_${rap.idx}_NO`)}
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 border ${
                          statusFilter === `RAP_${rap.idx}_NO`
                            ? 'bg-rose-300 text-black border-black'
                            : 'text-rose-800 border-rose-300 hover:bg-rose-50'
                        }`}
                      >
                        Ver Pendientes
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Excel Workflow Helper Banner */}
        <div className="mt-4 p-3 bg-emerald-50/80 border-2 border-emerald-600 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-950">
            <FileSpreadsheet className="h-5 w-5 text-emerald-700 shrink-0" />
            <div>
              <span className="font-black uppercase tracking-wider">Flujo de Trabajo Excel:</span>
              <span className="ml-1 text-slate-700">
                1. <strong>Descargue la Matriz Excel</strong> ➔ 2. <strong>Edite las calificaciones</strong> en su hoja de cálculo (usando <code className="bg-emerald-200 px-1 font-bold">SI</code>, <code className="bg-rose-200 px-1 font-bold">NO</code> o <code className="bg-white border border-slate-400 px-1 font-bold">CORREGIR</code>) ➔ 3. <strong>Cargue el archivo editado</strong> para actualizar todos los llamados de atención al instante.
              </span>
            </div>
          </div>
        </div>

        {/* PDF Planilla Institutional Helper Banner */}
        <div className="mt-3 p-3 bg-rose-50/90 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-rose-950">
            <FileText className="h-5 w-5 text-rose-700 shrink-0" />
            <div>
              <span className="font-black uppercase tracking-wider text-rose-900">Planilla Oficial en PDF (Aprendices Activos):</span>
              <span className="ml-1 text-slate-800">
                Genere el reporte institucional en formato horizontal (Landscape) con membrete SENA, tabla por Guías de Aprendizaje, estados de evidencias (<code className="bg-emerald-200 px-1 font-bold text-emerald-950">SI</code>, <code className="bg-rose-200 px-1 font-bold text-rose-950">NO</code>, <code className="bg-amber-200 px-1 font-bold text-amber-950">CORREGIR</code>), totales de seguimiento y tabla de convenciones de RAPs.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="self-start md:self-auto shrink-0 px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-950 border-2 border-black font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition flex items-center gap-1.5"
          >
            <FileDown className="h-3.5 w-3.5 text-rose-700" />
            <span>Configurar / Descargar PDF</span>
          </button>
        </div>

        {/* Live Notification Bar */}
        {notification && (
          <div
            className={`mt-4 p-3 border-2 border-black flex items-center justify-between text-xs font-bold ${
              notification.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-800'
                : notification.type === 'error'
                ? 'bg-rose-100 text-rose-900 border-rose-800'
                : 'bg-blue-100 text-blue-900 border-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              ) : notification.type === 'error' ? (
                <XCircle className="h-4 w-4 text-rose-700" />
              ) : (
                <Sparkles className="h-4 w-4 text-blue-700" />
              )}
              <span>{notification.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-black hover:opacity-75"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filter & Summary Chips */}
        <div className="mt-6 pt-4 border-t-2 border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="matrix-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar aprendiz por nombre o cédula..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 text-black border-2 border-black focus:outline-none focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-black"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filtrar:
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 text-[11px] font-black uppercase border-2 border-black transition ${
                statusFilter === 'ALL'
                  ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-slate-800 hover:bg-slate-100'
              }`}
            >
              Todos ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('CORREGIR')}
              className={`px-2.5 py-1 text-[11px] font-black uppercase border-2 border-black flex items-center gap-1.5 transition ${
                statusFilter === 'CORREGIR'
                  ? 'bg-amber-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-slate-800 hover:bg-amber-50'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500 border border-black"></span>
              Con Correcciones ({stats.withCorregir})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('NO')}
              className={`px-2.5 py-1 text-[11px] font-black uppercase border-2 border-black flex items-center gap-1.5 transition ${
                statusFilter === 'NO'
                  ? 'bg-rose-300 text-rose-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-slate-800 hover:bg-rose-50'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-rose-500 border border-black"></span>
              Con No Aprobadas ({stats.withNo})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('SI')}
              className={`px-2.5 py-1 text-[11px] font-black uppercase border-2 border-black flex items-center gap-1.5 transition ${
                statusFilter === 'SI'
                  ? 'bg-emerald-300 text-emerald-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-slate-800 hover:bg-emerald-50'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 border border-black"></span>
              100% Aprobados ({stats.allSi})
            </button>
          </div>

          {/* Bulk Global Controls */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] font-black uppercase text-slate-500 mr-1">Marcar Todo:</span>
            <button
              type="button"
              onClick={() => handleSetAllMatrix('SI')}
              className="px-2 py-1 text-[10px] font-black uppercase bg-emerald-400 hover:bg-emerald-500 text-black border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              title="Marcar todas las evidencias de todos los aprendices como SI"
            >
              Todo SI
            </button>
            <button
              type="button"
              onClick={() => handleSetAllMatrix('CORREGIR')}
              className="px-2 py-1 text-[10px] font-black uppercase bg-white hover:bg-slate-100 text-black border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              title="Marcar todas las evidencias de todos los aprendices como CORREGIR"
            >
              Todo CORREGIR
            </button>
            <button
              type="button"
              onClick={() => handleSetAllMatrix('NO')}
              className="px-2 py-1 text-[10px] font-black uppercase bg-rose-200 hover:bg-rose-300 text-rose-950 border border-rose-400 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              title="Marcar todas las evidencias de todos los aprendices como NO"
            >
              Todo NO
            </button>
          </div>
        </div>
      </div>

      {/* Main SENA Spreadsheet Grid Table */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] border-collapse">
          <table className="w-full text-left text-xs border-collapse select-none">
            {/* Header: Level 1 - Main Columns & Evidence Names */}
            <thead className="bg-white text-black sticky top-0 z-20 shadow-xs">
              <tr className="border-b-2 border-black">
                {/* No. De lista */}
                <th className="p-3 border-r-2 border-black bg-slate-100 text-center font-black uppercase text-[11px] w-14 shrink-0">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-500 font-mono">#</span>
                    <span>No. De lista</span>
                  </div>
                </th>

                {/* NOMBRE */}
                <th
                  onClick={() => {
                    if (sortOrder === 'AZ') setSortOrder('ZA');
                    else setSortOrder('AZ');
                  }}
                  className="p-3 border-r-2 border-black bg-slate-100 font-black uppercase text-[11px] min-w-[220px] max-w-[280px] cursor-pointer hover:bg-slate-200 transition"
                >
                  <div className="flex items-center justify-between">
                    <span>NOMBRE DEL APRENDIZ</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </div>
                </th>

                {/* EVIDENCIAS (Header per Evidence with RAP tag) */}
                {evidences.map((ev, evIdx) => {
                  const assignedRap = ev.rapIndex !== undefined && rapsList[ev.rapIndex]
                    ? getRapShortTitle(rapsList[ev.rapIndex], ev.rapIndex)
                    : null;

                  return (
                    <th
                      key={ev.id}
                      className="p-2.5 border-r-2 border-black bg-slate-50 text-center font-black uppercase text-[10px] min-w-[130px] max-w-[170px]"
                    >
                      <div className="space-y-1">
                        {assignedRap && (
                          <span className="inline-block px-1.5 py-0.2 bg-emerald-200 text-emerald-950 border border-black font-black text-[9px]">
                            {assignedRap}
                          </span>
                        )}
                        <div className="font-bold text-slate-900 line-clamp-2" title={ev.nombre}>
                          #{ev.numero}. {ev.nombre}
                        </div>

                        {/* Column Batch Quick Toggles */}
                        <div className="flex items-center justify-center gap-1 pt-1 border-t border-slate-300">
                          <button
                            type="button"
                            onClick={() => handleSetColumnStatus(ev.id, 'SI')}
                            className="px-1 py-0.2 text-[8px] font-black bg-emerald-300 hover:bg-emerald-400 text-black border border-black"
                            title={`Marcar toda la Evidencia #${ev.numero} como SI`}
                          >
                            SI
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetColumnStatus(ev.id, 'CORREGIR')}
                            className="px-1 py-0.2 text-[8px] font-black bg-white hover:bg-slate-200 text-black border border-black"
                            title={`Marcar toda la Evidencia #${ev.numero} como CORREGIR`}
                          >
                            CORR
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetColumnStatus(ev.id, 'NO')}
                            className="px-1 py-0.2 text-[8px] font-black bg-rose-200 hover:bg-rose-300 text-rose-900 border border-rose-400"
                            title={`Marcar toda la Evidencia #${ev.numero} como NO`}
                          >
                            NO
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}

                {/* Learning Outcomes (RAPs) Column Header */}
                {rapsList.length > 0 && (
                  <th className="p-2.5 border-r-2 border-black bg-emerald-50 text-center font-black uppercase text-[10px] min-w-[200px]">
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span className="text-[8px] text-emerald-800 bg-emerald-200 px-1 py-0.2 font-black border border-emerald-400">
                        EVALUACIÓN RAPs
                      </span>
                      <span>Resultados de Aprendizaje</span>
                    </div>
                  </th>
                )}

                {/* Row Summary / Actions */}
                <th className="p-3 bg-slate-100 text-center font-black uppercase text-[10px] w-28 shrink-0">
                  Resumen & PDF
                </th>
              </tr>

              {/* Sub-Header Row: ENTREGÓ/APROBÓ (SI O NO) */}
              <tr className="border-b-2 border-black bg-slate-200 text-slate-800 text-[9px] font-black uppercase tracking-wider text-center">
                <td className="p-1 border-r-2 border-black">-</td>
                <td className="p-1 border-r-2 border-black text-left px-3">
                  TOTAL APRENDICES: {displayedApprentices.length}
                </td>
                {evidences.map((ev) => (
                  <td key={ev.id} className="p-1 border-r-2 border-black text-center font-mono">
                    ENTREGÓ / APROBÓ
                  </td>
                ))}
                {rapsList.length > 0 && (
                  <td className="p-1 border-r-2 border-black text-center font-mono text-emerald-900 bg-emerald-100/60">
                    APROBÓ / NO APROBÓ
                  </td>
                )}
                <td className="p-1 text-center">ESTADO</td>
              </tr>
            </thead>

            {/* Table Body: Apprentices Rows */}
            <tbody className="divide-y-2 divide-black font-sans">
              {displayedApprentices.length === 0 ? (
                <tr>
                  <td colSpan={evidences.length + (rapsList.length > 0 ? 4 : 3)} className="p-8 text-center bg-slate-50">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <div className="font-black uppercase text-sm text-slate-800">
                      No se encontraron aprendices con el filtro actual
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Intente cambiar el término de búsqueda o seleccionar "Todos".
                    </div>
                  </td>
                </tr>
              ) : (
                displayedApprentices.map((app, index) => {
                  const appStatuses = evidences.map((ev) => getStatus(app, ev.id));
                  const countSi = appStatuses.filter((s) => s === 'SI').length;
                  const countCorregir = appStatuses.filter((s) => s === 'CORREGIR').length;
                  const countNo = appStatuses.filter((s) => s === 'NO').length;
                  const evalSummary = apprenticeRapsMap.get(app.id);

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-amber-50/50 transition border-b border-black group"
                    >
                      {/* No. De lista */}
                      <td className="p-2.5 border-r-2 border-black font-mono font-black text-center text-xs bg-slate-50/80 text-black">
                        {index + 1}
                      </td>

                      {/* NOMBRE & Cédula */}
                      <td className="p-2.5 border-r-2 border-black bg-white">
                        <div className="flex items-center justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <span className="font-black text-xs uppercase text-slate-900 block truncate" title={app.nombre}>
                              {app.nombre}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                              {app.documento ? <span>CC {app.documento}</span> : <span>Sin doc</span>}
                            </div>
                          </div>

                          {/* Quick Row Setter for this Apprentice */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleSetRowStatus(app.id, 'SI')}
                              className="px-1 py-0.2 text-[8px] font-black bg-emerald-400 text-black border border-black hover:bg-emerald-500"
                              title="Marcar todas las evidencias de este aprendiz como SI"
                            >
                              Todo SI
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetRowStatus(app.id, 'CORREGIR')}
                              className="px-1 py-0.2 text-[8px] font-black bg-white text-black border border-black hover:bg-slate-200"
                              title="Marcar todas las evidencias de este aprendiz como CORREGIR"
                            >
                              CORR
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetRowStatus(app.id, 'NO')}
                              className="px-1 py-0.2 text-[8px] font-black bg-rose-200 text-rose-950 border border-rose-400 hover:bg-rose-300"
                              title="Marcar todas las evidencias de este aprendiz como NO"
                            >
                              NO
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* EVIDENCIA CELLS (Interactive 1-Click Toggle) */}
                      {evidences.map((ev) => {
                        const status = getStatus(app, ev.id);

                        // Styling exactly like the SENA spreadsheet in user's image
                        let cellStyle = 'bg-rose-200 text-rose-950 border-rose-300 font-black';
                        let label = 'NO';

                        if (status === 'SI') {
                          // Green style from user image
                          cellStyle = 'bg-[#a9d18e] text-black font-black';
                          label = 'SI';
                        } else if (status === 'CORREGIR') {
                          // White background with dark bold uppercase text & clear border
                          cellStyle = 'bg-white text-black font-black border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
                          label = 'CORREGIR';
                        } else if (status === '-') {
                          cellStyle = 'bg-slate-100 text-slate-600 font-bold';
                          label = '-';
                        }

                        return (
                          <td
                            key={ev.id}
                            className="p-1.5 border-r-2 border-black text-center align-middle"
                          >
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleCycleCellStatus(app.id, ev.id)}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setActiveCell({
                                    apprenticeId: app.id,
                                    evidenceId: ev.id,
                                    apprenticeName: app.nombre,
                                    evidenceName: ev.nombre,
                                    evidenceNumero: ev.numero,
                                    currentStatus: status
                                  });
                                }}
                                className={`w-full py-1.5 px-1 text-[11px] uppercase transition cursor-pointer text-center font-mono ${cellStyle} active:scale-95`}
                                title={`Clic: Cambiar estado (SI -> CORREGIR -> NO) | Clic derecho: Selector`}
                              >
                                {label}
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Learning Outcomes (RAPs) Evaluation Breakdown Cell */}
                      {rapsList.length > 0 && (
                        <td className="p-2 border-r-2 border-black bg-slate-50/60 align-middle">
                          <div className="flex flex-col gap-1">
                            {evalSummary?.raps.map((rapEval) => {
                              return (
                                <div
                                  key={rapEval.rapIndex}
                                  className="flex items-center justify-between gap-1 text-[9.5px] font-black"
                                >
                                  <span className="font-mono text-slate-700">{rapEval.rapTitle}:</span>
                                  {rapEval.isApproved ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-[#a9d18e] text-black border border-black">
                                      <Check className="h-2.5 w-2.5 stroke-[3]" /> APROBÓ
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-rose-200 text-rose-950 border border-rose-400 cursor-help"
                                      title={`Evidencias pendientes: ${
                                        rapEval.pendingEvidences.map((e) => `#${e.numero}`).join(', ') || 'Ninguna'
                                      }`}
                                    >
                                      <X className="h-2.5 w-2.5 stroke-[3]" /> NO APROBÓ ({rapEval.pendingEvidences.length} pend.)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      )}

                      {/* Row Summary Pill & View PDF CTA */}
                      <td className="p-2 text-center bg-slate-50">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center gap-1 text-[9px] font-black">
                            <span className="text-emerald-700 bg-emerald-100 px-1 border border-emerald-300">
                              {countSi} SI
                            </span>
                            {countCorregir > 0 && (
                              <span className="text-black bg-white px-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                {countCorregir} C
                              </span>
                            )}
                            {countNo > 0 && (
                              <span className="text-rose-800 bg-rose-100 px-1 border border-rose-300">
                                {countNo} NO
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onSelectApprenticeForPreview(app)}
                            className="text-[10px] font-black uppercase text-black hover:text-emerald-700 underline flex items-center gap-1"
                            title="Ver documento PDF individual"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Ver PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Instructions */}
        <div className="p-4 bg-slate-100 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between text-xs font-bold gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-slate-600">Guía de Colores y Estados:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#a9d18e] text-black border border-black text-[10px] font-black">
              <Check className="h-3 w-3" /> SI = Aprobó / Entregó
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white text-black border-2 border-black text-[10px] font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              <Clock className="h-3 w-3" /> CORREGIR = Tiene que corregirla
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-200 text-rose-950 border border-rose-400 text-[10px] font-black">
              <X className="h-3 w-3" /> NO = No Aprobó / No Entregó
            </span>
          </div>

          <div className="text-slate-500 text-[11px]">
            * Al hacer un clic sobre cualquier casilla, ésta rota automáticamente entre los 3 estados.
          </div>
        </div>
      </div>

      {/* Quick Cell Selector Modal (Context popup) */}
      {activeCell && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setActiveCell(null)}
        >
          <div
            className="w-full max-w-sm bg-white border-4 border-black p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b-2 border-black pb-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Modificar Calificación de Evidencia
                </span>
                <h4 className="text-base font-black uppercase text-black">
                  {activeCell.apprenticeName}
                </h4>
                <div className="text-xs font-bold text-slate-700 mt-0.5">
                  Evidencia #{activeCell.evidenceNumero}: {activeCell.evidenceName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="p-1 border border-black hover:bg-black hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase text-slate-700 block">
                Seleccione el estado de esta evidencia:
              </span>

              <button
                type="button"
                onClick={() => handleSetCellStatus(activeCell.apprenticeId, activeCell.evidenceId, 'SI')}
                className="w-full p-3 bg-[#a9d18e] hover:bg-emerald-400 text-black border-2 border-black font-black uppercase text-xs flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-black" />
                  <span>SI - Aprobó la evidencia</span>
                </span>
                {activeCell.currentStatus === 'SI' && <CheckCircle2 className="h-4 w-4 text-black" />}
              </button>

              <button
                type="button"
                onClick={() => handleSetCellStatus(activeCell.apprenticeId, activeCell.evidenceId, 'CORREGIR')}
                className="w-full p-3 bg-white hover:bg-slate-100 text-black border-2 border-black font-black uppercase text-xs flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-black" />
                  <span>CORREGIR - Tiene que corregirla</span>
                </span>
                {activeCell.currentStatus === 'CORREGIR' && <CheckCircle2 className="h-4 w-4 text-black" />}
              </button>

              <button
                type="button"
                onClick={() => handleSetCellStatus(activeCell.apprenticeId, activeCell.evidenceId, 'NO')}
                className="w-full p-3 bg-rose-200 hover:bg-rose-300 text-rose-950 border-2 border-rose-400 font-black uppercase text-xs flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <span className="flex items-center gap-2">
                  <X className="h-4 w-4 text-rose-900" />
                  <span>NO - No la aprobó / No entregó</span>
                </span>
                {activeCell.currentStatus === 'NO' && <CheckCircle2 className="h-4 w-4 text-rose-900" />}
              </button>

              <button
                type="button"
                onClick={() => handleSetCellStatus(activeCell.apprenticeId, activeCell.evidenceId, '-')}
                className="w-full p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-400 font-bold uppercase text-xs flex items-center justify-between"
              >
                <span>- No Aplica / Exonerado</span>
                {activeCell.currentStatus === '-' && <CheckCircle2 className="h-4 w-4 text-black" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        result={excelResult}
        currentEvidences={evidences}
        existingApprentices={apprentices}
        onConfirm={(updatedApps, _mode, updatedEvs) => {
          setApprentices(updatedApps);
          if (updatedEvs && updatedEvs.length > 0) {
            setEvidences(updatedEvs);
          }
          const evCount = (updatedEvs || evidences).length;
          setNotification({
            type: 'success',
            text: `¡Se actualizaron exitosamente los estados de la matriz desde "${excelResult?.fileName}" (${updatedApps.length} aprendices, ${evCount} evidencias reconocidas)!`
          });
          setTimeout(() => setNotification(null), 5000);
        }}
      />

      {/* Name Format & Structure Reordering Modal */}
      <NameFormatModal
        isOpen={isNameFormatModalOpen}
        onClose={() => setIsNameFormatModalOpen(false)}
        apprentices={apprentices}
        onApplyTransformation={(updatedApps, msg) => {
          setApprentices(updatedApps);
          setNotification({
            type: 'success',
            text: msg
          });
          setTimeout(() => setNotification(null), 4000);
        }}
      />

      {/* Planilla PDF Download & Scope Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b-2 border-black">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 border-2 border-black">
                  <FileText className="h-5 w-5 text-rose-700" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-black">
                    Planilla de Aprendices Activos (PDF)
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Formato oficial horizontal SENA • Registro y seguimiento de evidencias
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="p-1 hover:bg-slate-100 border border-transparent hover:border-black transition"
              >
                <X className="h-5 w-5 text-black" />
              </button>
            </div>

            {/* Document Details Info Card */}
            <div className="p-3 bg-slate-50 border-2 border-black space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">Ficha:</span>
                <span className="font-black text-black font-mono">{generalInfo?.codigoFicha || '3466175'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">Programa:</span>
                <span className="font-bold text-black text-right line-clamp-1 max-w-[280px]">
                  {generalInfo?.programa || 'Desarrollo de videojuegos y entornos interactivos'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">Instructor:</span>
                <span className="font-bold text-emerald-900">
                  {signatureConfig?.instructorName ||
                    generalInfo?.nombreInstructorLlamado ||
                    generalInfo?.nombreInstructorAsignado ||
                    '(Sin asignar)'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">Total Evidencias:</span>
                <span className="font-black text-black">{evidences.length} evidencias configuradas</span>
              </div>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-black block">
                Seleccione el alcance de aprendices a incluir:
              </label>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setPdfScope('ALL')}
                  className={`p-3 text-left border-2 border-black transition flex items-center justify-between ${
                    pdfScope === 'ALL'
                      ? 'bg-rose-50 border-rose-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="font-black text-xs uppercase block text-black">
                      Planilla Completa Oficial ({apprentices.length} Aprendices Activos)
                    </span>
                    <span className="text-[11px] text-slate-600 block mt-0.5">
                      Incluye la totalidad de aprendices matriculados en la ficha.
                    </span>
                  </div>
                  {pdfScope === 'ALL' && <CheckCircle2 className="h-5 w-5 text-rose-700 shrink-0" />}
                </button>

                {(searchTerm.trim() || statusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => setPdfScope('FILTERED')}
                    className={`p-3 text-left border-2 border-black transition flex items-center justify-between ${
                      pdfScope === 'FILTERED'
                        ? 'bg-rose-50 border-rose-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-black text-xs uppercase block text-black">
                        Vista Filtrada Actual ({displayedApprentices.length} Aprendices)
                      </span>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        Solo los aprendices que coinciden con la búsqueda o filtro activo.
                      </span>
                    </div>
                    {pdfScope === 'FILTERED' && <CheckCircle2 className="h-5 w-5 text-rose-700 shrink-0" />}
                  </button>
                )}
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={pdfIncludeConventions}
                  onChange={(e) => setPdfIncludeConventions(e.target.checked)}
                  className="h-4 w-4 rounded border-2 border-black text-rose-600 focus:ring-0"
                />
                <span>Incluir tabla de Convenciones y Resultados de Aprendizaje (RAPs) al pie</span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t-2 border-black flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="px-4 py-2 text-xs font-black uppercase bg-slate-100 hover:bg-slate-200 text-black border-2 border-black transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPlanillaPdf(pdfScope)}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase bg-rose-500 hover:bg-rose-600 text-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Generando PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Descargar PDF Ahora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
