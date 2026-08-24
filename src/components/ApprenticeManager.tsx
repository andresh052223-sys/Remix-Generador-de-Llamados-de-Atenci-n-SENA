import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Apprentice, EvidenceItem, EvidenceStatus } from '../types';
import { parseApprenticesAndEvidencesFromPdf, ParsedPdfResult } from '../utils/pdfParser';
import { parseExcelMatrix, exportEvidenceMatrixExcel, ParsedExcelResult } from '../utils/excelParser';
import { generate80SampleApprentices } from '../utils/sampleData';
import { PdfImportModal } from './PdfImportModal';
import { ExcelImportModal } from './ExcelImportModal';
import { NameFormatModal } from './NameFormatModal';
import { parseFullName, normalizeSortKey } from '../utils/nameUtils';
import {
  Upload,
  UserPlus,
  Trash2,
  Search,
  FileSpreadsheet,
  Download,
  Check,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowDown01,
  ArrowUp10,
  Users,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TableProperties,
  UserCheck
} from 'lucide-react';

interface ApprenticeManagerProps {
  apprentices: Apprentice[];
  setApprentices: React.Dispatch<React.SetStateAction<Apprentice[]>>;
  evidences: EvidenceItem[];
  setEvidences?: React.Dispatch<React.SetStateAction<EvidenceItem[]>>;
  onSelectApprenticeForPreview: (apprentice: Apprentice) => void;
  onContinue: () => void;
  onBack: () => void;
}

type SortField = 'nombre' | 'apellidos' | 'documento' | 'estado' | 'none';
type SortDirection = 'asc' | 'desc';

export const ApprenticeManager: React.FC<ApprenticeManagerProps> = ({
  apprentices,
  setApprentices,
  evidences,
  setEvidences,
  onSelectApprenticeForPreview,
  onContinue,
  onBack
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadLoadingText, setUploadLoadingText] = useState('Procesando archivo...');
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [expandedApprenticeId, setExpandedApprenticeId] = useState<string | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination state (optimized for up to 80+ apprentices)
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // PDF modal state
  const [pdfModalResult, setPdfModalResult] = useState<ParsedPdfResult | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Excel Matrix modal state
  const [excelModalResult, setExcelModalResult] = useState<ParsedExcelResult | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Name Format & Reordering Modal state
  const [isNameFormatModalOpen, setIsNameFormatModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sorting handler - modifies the canonical apprentice list order
  const handleSort = (field: SortField, direction?: SortDirection) => {
    const targetDirection = direction || (sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortField(field);
    setSortDirection(targetDirection);

    setApprentices((prev) => {
      const sorted = [...prev].sort((a, b) => {
        if (field === 'nombre') {
          // Sort by First Names (or raw name)
          const parsedA = parseFullName(a.nombre || '');
          const parsedB = parseFullName(b.nombre || '');
          const keyA = normalizeSortKey(parsedA.firstNames || parsedA.original);
          const keyB = normalizeSortKey(parsedB.firstNames || parsedB.original);
          const res = keyA.localeCompare(keyB, 'es', { sensitivity: 'base' });
          if (res !== 0) return targetDirection === 'asc' ? res : -res;
          // Secondary
          return targetDirection === 'asc'
            ? normalizeSortKey(parsedA.lastNames).localeCompare(normalizeSortKey(parsedB.lastNames), 'es', { sensitivity: 'base' })
            : normalizeSortKey(parsedB.lastNames).localeCompare(normalizeSortKey(parsedA.lastNames), 'es', { sensitivity: 'base' });
        } else if (field === 'apellidos') {
          // Sort by Last Names (Apellidos)
          const parsedA = parseFullName(a.nombre || '');
          const parsedB = parseFullName(b.nombre || '');
          const keyA = normalizeSortKey(parsedA.lastNames || parsedA.original);
          const keyB = normalizeSortKey(parsedB.lastNames || parsedB.original);
          const res = keyA.localeCompare(keyB, 'es', { sensitivity: 'base' });
          if (res !== 0) return targetDirection === 'asc' ? res : -res;
          // Secondary
          return targetDirection === 'asc'
            ? normalizeSortKey(parsedA.firstNames).localeCompare(normalizeSortKey(parsedB.firstNames), 'es', { sensitivity: 'base' })
            : normalizeSortKey(parsedB.firstNames).localeCompare(normalizeSortKey(parsedA.firstNames), 'es', { sensitivity: 'base' });
        } else if (field === 'documento') {
          const docA = parseInt(a.documento?.replace(/\D/g, '') || '0', 10);
          const docB = parseInt(b.documento?.replace(/\D/g, '') || '0', 10);
          return targetDirection === 'asc' ? docA - docB : docB - docA;
        } else if (field === 'estado') {
          const isAComplete = a.nombre && a.nombre !== 'Nuevo Aprendiz';
          const isBComplete = b.nombre && b.nombre !== 'Nuevo Aprendiz';
          return targetDirection === 'asc'
            ? Number(isBComplete) - Number(isAComplete)
            : Number(isAComplete) - Number(isBComplete);
        }
        return 0;
      });
      return sorted;
    });

    const sortLabels: Record<string, string> = {
      nombre: `Nombres (${targetDirection === 'asc' ? 'A → Z' : 'Z → A'})`,
      apellidos: `Apellidos (${targetDirection === 'asc' ? 'A → Z' : 'Z → A'})`,
      documento: `documento / cédula (${targetDirection === 'asc' ? 'Menor a Mayor' : 'Mayor a Menor'})`,
      estado: `estado de completitud`
    };

    setUploadMessage({
      type: 'info',
      text: `Listado organizado por ${sortLabels[field] || field}.`
    });
  };

  const handleApplyNameTransformation = (updated: Apprentice[], msg: string) => {
    setApprentices(updated);
    setUploadMessage({
      type: 'success',
      text: msg
    });
  };

  // Quick 80 sample apprentices generator
  const handleLoad80DemoApprentices = () => {
    const sample80 = generate80SampleApprentices();
    setApprentices(sample80);
    setCurrentPage(1);
    setSortField('nombre');
    setSortDirection('asc');
    setUploadMessage({
      type: 'success',
      text: `¡Se cargó exitosamente una ficha completa con 80 aprendices en orden alfabético!`
    });
  };

  // Filter apprentices based on search
  const filteredApprentices = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return apprentices;
    return apprentices.filter((app) => {
      return (
        app.nombre.toLowerCase().includes(q) ||
        (app.correo && app.correo.toLowerCase().includes(q)) ||
        (app.documento && app.documento.includes(q))
      );
    });
  }, [apprentices, searchTerm]);

  // Paginated apprentices slice
  const totalItems = filteredApprentices.length;
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedApprentices = useMemo(() => {
    if (pageSize === 0) return filteredApprentices;
    const start = (validCurrentPage - 1) * pageSize;
    return filteredApprentices.slice(start, start + pageSize);
  }, [filteredApprentices, validCurrentPage, pageSize]);

  // Handle Manual Add
  const handleAddSingle = () => {
    const newId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newApprentice: Apprentice = {
      id: newId,
      nombre: 'Nuevo Aprendiz',
      documento: '',
      correo: 'aprendiz@misena.edu.co',
      telefono: '',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    };
    setApprentices((prev) => [newApprentice, ...prev]);
    setExpandedApprenticeId(newId);
    setCurrentPage(1);
  };

  const handleUpdateApprentice = (id: string, field: keyof Apprentice, value: any) => {
    setApprentices((prev) =>
      prev.map((app) => (app.id === id ? { ...app, [field]: value } : app))
    );
  };

  const handleToggleEvidenceStatus = (apprenticeId: string, evidenceId: string) => {
    setApprentices((prev) =>
      prev.map((app) => {
        if (app.id !== apprenticeId) return app;
        const currentStatus = (app.evidenciasStatus && app.evidenciasStatus[evidenceId]) || 'NO';
        let nextStatus: EvidenceStatus = 'SI';
        if (currentStatus === 'SI') nextStatus = 'CORREGIR';
        else if (currentStatus === 'CORREGIR') nextStatus = 'NO';
        else if (currentStatus === 'NO') nextStatus = 'SI';
        else nextStatus = 'SI';

        return {
          ...app,
          evidenciasStatus: {
            ...(app.evidenciasStatus || {}),
            [evidenceId]: nextStatus
          }
        };
      })
    );
  };

  const handleSetEvidenceStatus = (apprenticeId: string, evidenceId: string, status: EvidenceStatus) => {
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
  };

  const handleDeleteApprentice = (id: string) => {
    setApprentices((prev) => prev.filter((app) => app.id !== id));
  };

  // Bulk set all evidences for all apprentices
  const handleBulkSetAllEvidences = (status: EvidenceStatus) => {
    if (!window.confirm(`¿Desea marcar todas las evidencias en "${status}" para los ${apprentices.length} aprendices?`)) {
      return;
    }
    const statusMap: Record<string, EvidenceStatus> = {};
    evidences.forEach((ev) => {
      statusMap[ev.id] = status;
    });

    setApprentices((prev) =>
      prev.map((app) => ({
        ...app,
        evidenciasStatus: { ...statusMap }
      }))
    );

    setUploadMessage({
      type: 'success',
      text: `Se actualizaron todas las evidencias a "${status}" para los ${apprentices.length} aprendices.`
    });
  };

  // Process imported rows from Excel / CSV / Pasted text (handles up to 80+ records)
  const processImportedData = (rows: any[]) => {
    if (!rows || rows.length === 0) {
      setUploadMessage({ type: 'error', text: 'No se encontraron datos en el archivo.' });
      return;
    }

    const newApprentices: Apprentice[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let nombre = '';
      let correo = '';
      let documento = '';
      let telefono = '';

      if (Array.isArray(row)) {
        if (row.length === 1) {
          nombre = String(row[0] || '').trim();
        } else if (row.length >= 2) {
          const col0 = String(row[0] || '').trim();
          const col1 = String(row[1] || '').trim();
          const col2 = String(row[2] || '').trim();

          if (/^\d{6,12}$/.test(col0) && !/^\d{6,12}$/.test(col1)) {
            documento = col0;
            nombre = col1;
            correo = col2.includes('@') ? col2 : '';
          } else {
            nombre = col0;
            correo = col1.includes('@') ? col1 : '';
            documento = /^\d{6,12}$/.test(col2) ? col2 : '';
          }
        }
      } else if (typeof row === 'object' && row !== null) {
        const keys = Object.keys(row);
        for (const key of keys) {
          const lowerKey = key.toLowerCase().trim();
          const val = String(row[key] || '').trim();

          if (lowerKey.includes('nombre') || lowerKey.includes('aprendiz') || lowerKey.includes('estudiante') || lowerKey.includes('name')) {
            nombre = val;
          } else if (lowerKey.includes('correo') || lowerKey.includes('email') || lowerKey.includes('mail') || val.includes('@')) {
            correo = val;
          } else if (lowerKey.includes('doc') || lowerKey.includes('cedula') || lowerKey.includes('identificacion') || lowerKey.includes('id') || lowerKey.includes('dni')) {
            documento = val;
          } else if (lowerKey.includes('tel') || lowerKey.includes('cel') || lowerKey.includes('phone')) {
            telefono = val;
          }
        }

        if (!nombre && keys.length > 0) {
          nombre = String(row[keys[0]] || '').trim();
          if (keys.length > 1 && String(row[keys[1]]).includes('@')) {
            correo = String(row[keys[1]]).trim();
          }
        }
      }

      if (nombre && nombre.toLowerCase() !== 'nombre' && nombre.toLowerCase() !== 'nombre del aprendiz') {
        newApprentices.push({
          id: `app-import-${Date.now()}-${i}`,
          nombre,
          correo: correo || `${nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}@misena.edu.co`,
          documento: documento || '',
          telefono: telefono || '',
          evidenciasStatus: {},
          observacionesEspecificas: '',
          juicioEspecifico: 'NO_APROBO'
        });
      }
    }

    if (newApprentices.length > 0) {
      setApprentices(newApprentices);
      setCurrentPage(1);
      setUploadMessage({
        type: 'success',
        text: `¡Se importaron exitosamente ${newApprentices.length} aprendices! (Capacidad hasta 80+ activa)`
      });
    } else {
      setUploadMessage({
        type: 'error',
        text: 'No se pudieron extraer aprendices. Verifique que el archivo tenga nombres válidos.'
      });
    }
  };

  // Handle File Upload (PDF, Excel, CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'pdf') {
      setUploadLoadingText(`Extrayendo aprendices y evidencias de ${file.name}...`);
      try {
        const result = await parseApprenticesAndEvidencesFromPdf(file, evidences);
        if (result.apprentices.length > 0) {
          setPdfModalResult(result);
          setPdfFileName(file.name);
          setIsPdfModalOpen(true);
        } else {
          setUploadMessage({
            type: 'error',
            text: 'No se pudieron encontrar aprendices legibles en el PDF. Verifique que el archivo contenga texto seleccionable o listados de aprendices.'
          });
        }
      } catch (err) {
        console.error('Error al procesar PDF:', err);
        setUploadMessage({
          type: 'error',
          text: 'Error al leer el archivo PDF. Intente con otro archivo o pegue el texto directamente.'
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      setUploadLoadingText('Analizando aprendices y estados de evidencias en Excel...');
      try {
        const result = await parseExcelMatrix(file, evidences, apprentices);
        if (result.apprentices.length > 0) {
          // If the Excel has evidence columns mapped OR apprentice rows
          setExcelModalResult(result);
          setIsExcelModalOpen(true);
        } else {
          setUploadMessage({
            type: 'error',
            text: 'No se encontraron registros legibles de aprendices en el archivo Excel.'
          });
        }
      } catch (err: any) {
        console.error('Error al procesar Excel:', err);
        // Fallback to simple parser
        try {
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const data = new Uint8Array(evt.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const json = XLSX.utils.sheet_to_json(worksheet);
              processImportedData(json);
            } catch (fallbackErr) {
              setUploadMessage({ type: 'error', text: 'Error al leer el archivo Excel.' });
            }
          };
          reader.readAsArrayBuffer(file);
        } catch (e) {
          setUploadMessage({ type: 'error', text: 'Error al leer el archivo Excel.' });
        }
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else if (fileExt === 'csv' || fileExt === 'txt') {
      setUploadLoadingText('Leyendo archivo CSV...');
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setIsUploading(false);
          processImportedData(results.data);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        error: () => {
          setIsUploading(false);
          setUploadMessage({ type: 'error', text: 'Error al parsear el archivo CSV.' });
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      });
    } else {
      setIsUploading(false);
      setUploadMessage({
        type: 'error',
        text: 'Formato no soportado. Cargue un archivo PDF (.pdf), Excel (.xlsx, .xls) o CSV (.csv).'
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm and Apply Excel Import
  const handleConfirmExcelImport = (
    updatedApps: Apprentice[],
    mode: 'update_existing' | 'replace_all'
  ) => {
    setApprentices(updatedApps);
    setCurrentPage(1);
    const actionText =
      mode === 'update_existing'
        ? `¡Se actualizaron exitosamente los estados de evidencias para los aprendices desde "${excelModalResult?.fileName}"!`
        : `¡Se importaron exitosamente ${updatedApps.length} aprendices con sus evidencias desde "${excelModalResult?.fileName}"!`;

    setUploadMessage({
      type: 'success',
      text: actionText
    });
  };

  // Confirm and Apply PDF Import
  const handleConfirmPdfImport = (
    importedApps: Apprentice[],
    syncEvidences: boolean,
    mode: 'replace' | 'append'
  ) => {
    if (syncEvidences && pdfModalResult?.detectedEvidences && pdfModalResult.detectedEvidences.length > 0 && setEvidences) {
      setEvidences(pdfModalResult.detectedEvidences);
    }

    if (mode === 'replace') {
      setApprentices(importedApps);
    } else {
      setApprentices((prev) => {
        const existingDocs = new Set(prev.map((a) => a.documento).filter(Boolean));
        const filteredNew = importedApps.filter((a) => !a.documento || !existingDocs.has(a.documento));
        return [...prev, ...filteredNew];
      });
    }

    setCurrentPage(1);
    setUploadMessage({
      type: 'success',
      text: `¡Se importaron con éxito ${importedApps.length} aprendices desde el PDF "${pdfFileName}" con sus estados de evidencias!`
    });
  };

  // Handle Paste Modal Submit
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsedRows = lines.map((line) => {
      if (line.includes('\t')) return line.split('\t').map((s) => s.trim());
      if (line.includes(';')) return line.split(';').map((s) => s.trim());
      if (line.includes(',')) return line.split(',').map((s) => s.trim());
      return [line];
    });

    processImportedData(parsedRows);
    setShowPasteModal(false);
    setPasteText('');
  };

  // Download Current or Matrix Excel Template
  const downloadEvidenceMatrixExcel = () => {
    exportEvidenceMatrixExcel(
      apprentices,
      evidences,
      `Matriz_Evidencias_Aprendices_${apprentices.length}.xlsx`
    );
    setUploadMessage({
      type: 'success',
      text: `Se descargó la Matriz de Calificaciones en Excel con ${apprentices.length} aprendices y las ${evidences.length} evidencias configuradas.`
    });
  };

  const downloadCurrentExcel = () => {
    if (apprentices.length > 0) {
      downloadEvidenceMatrixExcel();
      return;
    }
    downloadSampleTemplate();
  };

  // Download Sample Excel Template
  const downloadSampleTemplate = () => {
    const sample80 = generate80SampleApprentices();
    exportEvidenceMatrixExcel(
      sample80,
      evidences,
      'Plantilla_SENA_Matriz_80_Aprendices.xlsx'
    );
    setUploadMessage({
      type: 'info',
      text: 'Se descargó la Plantilla Excel con 80 aprendices de ejemplo y columnas de evidencias listas para diligenciar.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 block">
              Paso 3 de 4 • Base de Aprendices
            </span>
            <span className="bg-emerald-400 text-black text-[10px] font-black uppercase px-2 py-0.5 border border-black flex items-center gap-1">
              <Users className="h-3 w-3" /> Capacidad: Hasta 80+ Aprendices
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black">
            Carga y Control de Aprendices
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl font-medium">
            Soporta carga masiva de hasta 80 aprendices mediante <strong className="text-black">PDF</strong>, Excel, CSV o copiado de texto. Organice el listado alfabéticamente con un solo clic.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            id="upload-file-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Upload className="h-4 w-4" />
            Cargar Archivo (PDF/Excel)
          </button>

          <button
            id="open-paste-modal-btn"
            type="button"
            onClick={() => setShowPasteModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-3 text-xs font-black uppercase tracking-wider text-black bg-white hover:bg-slate-100 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            Pegar Texto
          </button>

          <button
            id="load-80-demo-btn"
            type="button"
            onClick={handleLoad80DemoApprentices}
            className="flex items-center gap-1.5 px-3.5 py-3 text-xs font-black uppercase tracking-wider text-black bg-amber-300 hover:bg-amber-400 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            title="Cargar rápidamente un grupo de prueba de 80 aprendices"
          >
            <Sparkles className="h-4 w-4 text-black" />
            Cargar 80 Demo
          </button>

          <button
            id="add-single-apprentice-btn"
            type="button"
            onClick={handleAddSingle}
            className="flex items-center gap-1.5 px-3.5 py-3 text-xs font-black uppercase tracking-wider text-black bg-white hover:bg-slate-100 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <UserPlus className="h-4 w-4" />
            + Manual
          </button>
        </div>
      </div>

      {/* Loading state indicator */}
      {isUploading && (
        <div className="bg-amber-300 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-black animate-spin shrink-0" />
          <div className="text-xs font-black uppercase tracking-wider text-black">
            {uploadLoadingText}
          </div>
        </div>
      )}

      {/* Upload Feedback */}
      {uploadMessage && (
        <div
          className={`p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-start gap-3 ${
            uploadMessage.type === 'success'
              ? 'bg-emerald-300 text-black'
              : uploadMessage.type === 'info'
              ? 'bg-sky-200 text-black'
              : 'bg-rose-300 text-black'
          }`}
        >
          {uploadMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-black shrink-0 mt-0.5" />
          ) : uploadMessage.type === 'info' ? (
            <ArrowUpDown className="h-5 w-5 text-black shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-black shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-bold">{uploadMessage.text}</div>
          <button
            type="button"
            onClick={() => setUploadMessage(null)}
            className="text-black hover:bg-black hover:text-white p-0.5 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toolbar: Search, Sort Controls & Bulk Actions */}
      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative w-full lg:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            id="search-apprentices-input"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nombre, correo o cédula..."
            className="w-full pl-10 pr-3 py-2 text-xs font-semibold bg-slate-50 border-2 border-black focus:bg-white focus:outline-none"
          />
        </div>

        {/* Center: Sorting Buttons (By Last Name, By First Name, Doc) & Format Modal */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mr-1">
            Organizar:
          </span>

          {/* Sort by Last Names (Apellidos) */}
          <button
            id="sort-apellidos-btn"
            type="button"
            onClick={() => handleSort('apellidos')}
            className={`flex items-center gap-1 text-xs font-black uppercase px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              sortField === 'apellidos'
                ? 'bg-black text-white'
                : 'bg-emerald-100 text-emerald-950 hover:bg-emerald-200'
            }`}
            title="Organizar aprendices por Apellidos"
          >
            {sortField === 'apellidos' && sortDirection === 'desc' ? (
              <ArrowUpZA className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownAZ className="h-3.5 w-3.5" />
            )}
            <span>Por Apellidos {sortField === 'apellidos' ? (sortDirection === 'asc' ? '(A-Z)' : '(Z-A)') : ''}</span>
          </button>

          {/* Sort by First Names (Nombres) */}
          <button
            id="sort-nombres-btn"
            type="button"
            onClick={() => handleSort('nombre')}
            className={`flex items-center gap-1 text-xs font-black uppercase px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              sortField === 'nombre'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-slate-100'
            }`}
            title="Organizar aprendices por Nombres"
          >
            {sortField === 'nombre' && sortDirection === 'desc' ? (
              <ArrowUpZA className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownAZ className="h-3.5 w-3.5" />
            )}
            <span>Por Nombres {sortField === 'nombre' ? (sortDirection === 'asc' ? '(A-Z)' : '(Z-A)') : ''}</span>
          </button>

          {/* Sort by ID Document */}
          <button
            id="sort-doc-btn"
            type="button"
            onClick={() => handleSort('documento')}
            className={`flex items-center gap-1 text-xs font-black uppercase px-2.5 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              sortField === 'documento'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-slate-100'
            }`}
            title="Organizar por número de documento"
          >
            {sortField === 'documento' && sortDirection === 'desc' ? (
              <ArrowUp10 className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown01 className="h-3.5 w-3.5" />
            )}
            <span>Cédula</span>
          </button>

          {/* Reorder / Format Structure Button */}
          {apprentices.length > 0 && (
            <button
              id="open-name-format-modal-btn"
              type="button"
              onClick={() => setIsNameFormatModalOpen(true)}
              className="flex items-center gap-1 text-xs font-black uppercase px-3 py-1.5 bg-amber-300 hover:bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              title="Cambiar formato del nombre (Iniciar por Apellidos o por Nombres)"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Estructura Nombres / Apellidos</span>
            </button>
          )}
        </div>

        {/* Right: Export & Clear */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            id="download-template-btn"
            type="button"
            onClick={apprentices.length > 0 ? downloadCurrentExcel : downloadSampleTemplate}
            className="flex items-center gap-1.5 text-xs font-black uppercase text-black hover:bg-slate-100 px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition"
            title="Exportar listado a Excel"
          >
            <Download className="h-3.5 w-3.5" />
            {apprentices.length > 0 ? 'Exportar Excel' : 'Plantilla 80'}
          </button>

          {apprentices.length > 0 && (
            <button
              id="clear-all-apprentices-btn"
              type="button"
              onClick={() => {
                if (window.confirm('¿Desea borrar todos los aprendices del listado?')) {
                  setApprentices([]);
                  setCurrentPage(1);
                }
              }}
              className="text-xs font-black uppercase text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 border border-rose-300 transition"
            >
              Borrar Todos
            </button>
          )}
        </div>
      </div>

      {/* Global Quick Action Bar for Evidences */}
      {apprentices.length > 0 && (
        <div className="bg-slate-100 border-2 border-black p-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5">
              Acción Masiva:
            </span>
            <span>Ajustar evidencias para los {apprentices.length} aprendices</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkSetAllEvidences('NO')}
              className="text-[11px] font-black uppercase text-black bg-rose-200 hover:bg-rose-300 px-3 py-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition"
            >
              Marcar Todas NO (Incumplidas)
            </button>
            <button
              type="button"
              onClick={() => handleBulkSetAllEvidences('SI')}
              className="text-[11px] font-black uppercase text-black bg-emerald-200 hover:bg-emerald-300 px-3 py-1 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition"
            >
              Marcar Todas SI (Aprobadas)
            </button>
          </div>
        </div>
      )}

      {/* Apprentices Table / Cards */}
      <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {/* Table Header with Clickable Sorting Columns */}
        <div className="grid grid-cols-12 bg-black text-white p-3.5 text-[10px] font-black uppercase tracking-widest items-center">
          <div className="col-span-1 text-slate-400">#</div>
          <div
            onClick={() => handleSort('nombre')}
            className="col-span-5 sm:col-span-6 flex items-center gap-1.5 cursor-pointer hover:text-emerald-400 select-none transition"
            title="Haga clic para ordenar alfabéticamente"
          >
            <span>Nombre del Aprendiz</span>
            {sortField === 'nombre' && (
              <span className="text-emerald-400 font-mono text-xs">
                {sortDirection === 'asc' ? '▲ A-Z' : '▼ Z-A'}
              </span>
            )}
            {sortField !== 'nombre' && <ArrowUpDown className="h-3 w-3 opacity-40" />}
          </div>
          <div
            onClick={() => handleSort('estado')}
            className="col-span-3 sm:col-span-2 text-center cursor-pointer hover:text-emerald-400 select-none transition"
            title="Haga clic para ordenar por estado"
          >
            <span>Estado</span>
            {sortField === 'estado' && (
              <span className="text-emerald-400 ml-1 text-xs">
                {sortDirection === 'asc' ? '▲' : '▼'}
              </span>
            )}
          </div>
          <div className="col-span-3 text-right">Acción Individual</div>
        </div>

        {filteredApprentices.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-black uppercase text-slate-800">No se encontraron aprendices</p>
            <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">
              {searchTerm
                ? 'No hay resultados que coincidan con la búsqueda.'
                : 'Cargue su archivo de Excel/PDF o presione "Cargar 80 Demo".'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleLoad80DemoApprentices}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider text-black bg-amber-300 hover:bg-amber-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition"
              >
                <Sparkles className="h-4 w-4" />
                Cargar 80 Demo
              </button>
              <button
                type="button"
                onClick={handleAddSingle}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition"
              >
                <UserPlus className="h-4 w-4" />
                Agregar Manual
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-200">
            {paginatedApprentices.map((app, localIdx) => {
              const globalIdx = (validCurrentPage - 1) * (pageSize || totalItems) + localIdx;
              const isExpanded = expandedApprenticeId === app.id;
              const hasIncompleteData = !app.nombre || app.nombre === 'Nuevo Aprendiz';

              return (
                <div key={app.id} className="transition hover:bg-slate-50">
                  {/* Summary Row */}
                  <div className="grid grid-cols-12 p-3.5 items-center gap-2">
                    <div className="col-span-1 font-mono text-xs font-black text-slate-400">
                      #{globalIdx < 9 ? `0${globalIdx + 1}` : globalIdx + 1}
                    </div>

                    <div className="col-span-5 sm:col-span-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          id={`app-name-${app.id}`}
                          type="text"
                          value={app.nombre}
                          onChange={(e) => handleUpdateApprentice(app.id, 'nombre', e.target.value)}
                          className="font-black text-sm uppercase text-slate-900 border-b border-transparent hover:border-black focus:border-black focus:bg-slate-100 outline-none px-1 py-0.5"
                          placeholder="Nombre del aprendiz..."
                        />
                        {app.documento && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 border border-slate-300 text-slate-800 px-1.5 py-0.2">
                            CC {app.documento}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <input
                          id={`app-email-${app.id}`}
                          type="email"
                          value={app.correo}
                          onChange={(e) => handleUpdateApprentice(app.id, 'correo', e.target.value)}
                          className="text-xs font-medium text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-black outline-none px-1 py-0.5 max-w-xs"
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex justify-center">
                      {hasIncompleteData ? (
                        <span className="px-2 py-0.5 bg-amber-300 text-black text-[9px] font-black uppercase border border-black">
                          Pendiente
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-400 text-black text-[9px] font-black uppercase border border-black">
                          Listo
                        </span>
                      )}
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <button
                        id={`preview-app-${app.id}-btn`}
                        type="button"
                        onClick={() => onSelectApprenticeForPreview(app)}
                        className="text-[10px] font-black underline uppercase text-black hover:text-emerald-600 transition"
                      >
                        Ver PDF
                      </button>

                      <button
                        id={`toggle-expand-app-${app.id}-btn`}
                        type="button"
                        onClick={() => setExpandedApprenticeId(isExpanded ? null : app.id)}
                        className="flex items-center gap-1 text-[10px] font-black uppercase text-black bg-slate-100 hover:bg-slate-200 border border-black px-2 py-1 transition"
                      >
                        <Layers className="h-3 w-3" />
                        <span>Evidencias</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      <button
                        id={`delete-app-${app.id}-btn`}
                        type="button"
                        onClick={() => handleDeleteApprentice(app.id)}
                        className="p-1 text-black hover:bg-rose-500 hover:text-white border border-transparent hover:border-black transition"
                        title="Eliminar aprendiz"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Panel: Checklist of Evidences for this Apprentice */}
                  {isExpanded && (
                    <div className="p-5 bg-slate-100/70 border-t-2 border-black">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                            Número de Documento / Cédula:
                          </label>
                          <input
                            type="text"
                            value={app.documento || ''}
                            onChange={(e) => handleUpdateApprentice(app.id, 'documento', e.target.value)}
                            placeholder="Ej: 1098765432"
                            className="w-full p-2 text-xs font-mono font-bold border-2 border-black bg-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                            Observaciones particulares para este aprendiz:
                          </label>
                          <input
                            type="text"
                            value={app.observacionesEspecificas || ''}
                            onChange={(e) => handleUpdateApprentice(app.id, 'observacionesEspecificas', e.target.value)}
                            placeholder="Opcional..."
                            className="w-full p-2 text-xs font-medium border-2 border-black bg-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="border-2 border-black bg-white p-4">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-black flex-wrap gap-2">
                          <span className="text-xs font-black uppercase text-black">
                            Estado de Evidencias ({app.nombre})
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-500 mr-1">Marcar todas:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const allSi: Record<string, EvidenceStatus> = {};
                                evidences.forEach((ev) => (allSi[ev.id] = 'SI'));
                                handleUpdateApprentice(app.id, 'evidenciasStatus', allSi);
                              }}
                              className="text-[10px] font-black uppercase text-black bg-[#a9d18e] hover:bg-emerald-400 px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            >
                              SI (Aprobó)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const allCorr: Record<string, EvidenceStatus> = {};
                                evidences.forEach((ev) => (allCorr[ev.id] = 'CORREGIR'));
                                handleUpdateApprentice(app.id, 'evidenciasStatus', allCorr);
                              }}
                              className="text-[10px] font-black uppercase text-black bg-white hover:bg-slate-100 px-2 py-0.5 border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            >
                              CORREGIR
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const allNo: Record<string, EvidenceStatus> = {};
                                evidences.forEach((ev) => (allNo[ev.id] = 'NO'));
                                handleUpdateApprentice(app.id, 'evidenciasStatus', allNo);
                              }}
                              className="text-[10px] font-black uppercase text-rose-950 bg-rose-200 hover:bg-rose-300 px-2 py-0.5 border border-rose-400 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            >
                              NO (No Aprobó)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                          {evidences.map((ev) => {
                            const status = (app.evidenciasStatus && app.evidenciasStatus[ev.id]) || ev.defaultEstado || 'NO';
                            return (
                              <div
                                key={ev.id}
                                className={`p-2.5 border-2 border-black text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                                  status === 'NO'
                                    ? 'bg-rose-50/70 border-rose-900'
                                    : status === 'SI'
                                    ? 'bg-emerald-50/70 border-emerald-900'
                                    : status === 'CORREGIR'
                                    ? 'bg-amber-50/70 border-black'
                                    : 'bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <span className="font-mono font-black text-[10px] px-1.5 py-0.5 bg-white border border-black shrink-0">
                                    #{ev.numero}
                                  </span>
                                  <span className="truncate text-xs font-bold text-slate-900" title={ev.nombre}>
                                    {ev.nombre}
                                  </span>
                                </div>

                                {/* 3-Button Toggle for this Evidence */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleSetEvidenceStatus(app.id, ev.id, 'SI')}
                                    className={`px-2 py-1 text-[10px] font-black uppercase border transition ${
                                      status === 'SI'
                                        ? 'bg-[#a9d18e] text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-black'
                                    }`}
                                    title="Aprobó la evidencia"
                                  >
                                    SI
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSetEvidenceStatus(app.id, ev.id, 'CORREGIR')}
                                    className={`px-2 py-1 text-[10px] font-black uppercase border transition ${
                                      status === 'CORREGIR'
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-black'
                                    }`}
                                    title="Tiene que corregir la evidencia"
                                  >
                                    CORREGIR
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSetEvidenceStatus(app.id, ev.id, 'NO')}
                                    className={`px-2 py-1 text-[10px] font-black uppercase border transition ${
                                      status === 'NO'
                                        ? 'bg-rose-200 text-rose-950 border-rose-400 font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-black'
                                    }`}
                                    title="No aprobó / No entregó"
                                  >
                                    NO
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination & Status Footer */}
        <div className="p-4 bg-slate-50 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-700 flex-wrap">
            <span className="bg-white px-2.5 py-1 border border-black font-mono">
              TOTAL: {apprentices.length} APRENDICES
            </span>
            <span className="text-emerald-700 bg-emerald-100 px-2 py-1 border border-emerald-300">
              {apprentices.filter((a) => a.nombre && a.nombre !== 'Nuevo Aprendiz').length} LISTOS
            </span>
            <span className="text-amber-700 bg-amber-100 px-2 py-1 border border-amber-300">
              {apprentices.filter((a) => !a.nombre || a.nombre === 'Nuevo Aprendiz').length} PENDIENTES
            </span>
          </div>

          {/* Pagination Controls */}
          {filteredApprentices.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                <span className="text-[10px] uppercase">Mostrar:</span>
                <select
                  id="page-size-selector"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-xs font-black bg-white border border-black outline-none"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={80}>80</option>
                  <option value={0}>Todos ({filteredApprentices.length})</option>
                </select>
              </div>

              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1 bg-white border border-black hover:bg-slate-200 disabled:opacity-30 transition"
                    title="Primera página"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 bg-white border border-black hover:bg-slate-200 disabled:opacity-30 transition"
                    title="Página anterior"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[11px] font-black px-2 py-0.5 bg-white border border-black">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 bg-white border border-black hover:bg-slate-200 disabled:opacity-30 transition"
                    title="Página siguiente"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1 bg-white border border-black hover:bg-slate-200 disabled:opacity-30 transition"
                    title="Última página"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          id="back-to-evidencias-btn"
          type="button"
          onClick={onBack}
          className="px-5 py-3 text-xs font-black uppercase tracking-wider text-black bg-white hover:bg-slate-100 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        >
          ← Regresar a Evidencias
        </button>
        <button
          id="continue-to-preview-btn"
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <span>Siguiente: Vista Previa y Descargas PDF ({apprentices.length} Registrados)</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Modal: Paste Text Apprentices */}
      {showPasteModal && (
        <div
          id="paste-apprentices-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-lg bg-white p-6 border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-black flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  Pegar Listado de Aprendices (hasta 80+)
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Pegue directamente desde Excel, SofiaPlus o texto con nombres y cédulas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-black hover:bg-black hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <textarea
              id="paste-apprentices-textarea"
              rows={9}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`1098765432\tAcosta Moreno Laura Valentina\tlaura.acosta@misena.edu.co\n1014238765\tAguilar Pérez Juan Sebastián\tjuan.aguilar@misena.edu.co\n1023456789\tAlarcón Rivera Diego Fernando\tdiego.alarcon@misena.edu.co`}
              className="w-full p-3 text-xs font-mono font-medium border-2 border-black bg-slate-50 focus:bg-white focus:outline-none resize-y mb-4"
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500">
                {pasteText.trim().split('\n').filter(Boolean).length} líneas detectadas
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2 text-xs font-black uppercase text-black bg-slate-100 hover:bg-slate-200 border-2 border-black transition"
                >
                  Cancelar
                </button>
                <button
                  id="apply-paste-apprentices-btn"
                  type="button"
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Importar Aprendices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: PDF Import Review & Confirmation */}
      <PdfImportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        result={pdfModalResult}
        fileName={pdfFileName}
        onConfirm={handleConfirmPdfImport}
      />

      {/* Modal: Excel Matrix & Evidence States Update */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        result={excelModalResult}
        currentEvidences={evidences}
        existingApprentices={apprentices}
        onConfirm={handleConfirmExcelImport}
      />

      {/* Modal: Name Format & Structure Reordering */}
      <NameFormatModal
        isOpen={isNameFormatModalOpen}
        onClose={() => setIsNameFormatModalOpen(false)}
        apprentices={apprentices}
        onApplyTransformation={handleApplyNameTransformation}
      />
    </div>
  );
};
