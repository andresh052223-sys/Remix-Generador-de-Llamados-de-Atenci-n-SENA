import React, { useState } from 'react';
import { Apprentice, EvidenceItem } from '../types';
import { ParsedExcelResult } from '../utils/excelParser';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Users,
  Layers,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Sparkles,
  Search
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ParsedExcelResult | null;
  currentEvidences: EvidenceItem[];
  existingApprentices: Apprentice[];
  onConfirm: (
    updatedApprentices: Apprentice[],
    mode: 'update_existing' | 'replace_all'
  ) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  result,
  currentEvidences,
  existingApprentices,
  onConfirm
}) => {
  const [importMode, setImportMode] = useState<'update_existing' | 'replace_all'>('update_existing');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !result) return null;

  const {
    fileName,
    sheetName,
    apprentices: parsedApps,
    detectedEvidenceColumns,
    unmappedEvidenceColumns,
    summary
  } = result;

  const handleApply = () => {
    let finalApprentices: Apprentice[] = [];

    if (importMode === 'update_existing') {
      // Create maps of parsed apprentices by cleaned doc and normalized name
      const parsedByDoc = new Map<string, typeof parsedApps[0]>();
      const parsedByName = new Map<string, typeof parsedApps[0]>();

      parsedApps.forEach((p) => {
        if (p.documento) {
          const docDigits = p.documento.replace(/\D/g, '');
          if (docDigits) parsedByDoc.set(docDigits, p);
        }
        if (p.nombre) {
          parsedByName.set(p.nombre.toLowerCase().trim(), p);
        }
      });

      const updatedExistingIds = new Set<string>();

      // Update existing apprentices
      const updatedExisting = existingApprentices.map((existing) => {
        const cleanDoc = existing.documento ? existing.documento.replace(/\D/g, '') : '';
        const normName = existing.nombre.toLowerCase().trim();

        const match =
          (cleanDoc && parsedByDoc.get(cleanDoc)) ||
          parsedByName.get(normName);

        if (match) {
          updatedExistingIds.add(match.id);
          return {
            ...existing,
            documento: existing.documento || match.documento,
            correo: existing.correo || match.correo,
            telefono: existing.telefono || match.telefono,
            evidenciasStatus: {
              ...(existing.evidenciasStatus || {}),
              ...match.evidenciasStatus
            }
          };
        }
        return existing;
      });

      // Append any new apprentices that were in the Excel but not in existing list
      const brandNew = parsedApps
        .filter((p) => !updatedExistingIds.has(p.id) && !p.matchedWithExistingId)
        .map((p) => ({
          id: p.id,
          nombre: p.nombre,
          documento: p.documento || '',
          correo: p.correo,
          telefono: p.telefono || '',
          evidenciasStatus: p.evidenciasStatus,
          observacionesEspecificas: '',
          juicioEspecifico: 'NO_APROBO' as const
        }));

      finalApprentices = [...updatedExisting, ...brandNew];
    } else {
      // Replace all with Excel rows
      finalApprentices = parsedApps.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        documento: p.documento || '',
        correo: p.correo,
        telefono: p.telefono || '',
        evidenciasStatus: p.evidenciasStatus,
        observacionesEspecificas: '',
        juicioEspecifico: 'NO_APROBO' as const
      }));
    }

    onConfirm(finalApprentices, importMode);
    onClose();
  };

  const filteredPreview = parsedApps.filter((a) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      a.nombre.toLowerCase().includes(q) ||
      (a.documento && a.documento.includes(q)) ||
      (a.correo && a.correo.toLowerCase().includes(q))
    );
  });

  return (
    <div
      id="excel-import-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-3xl bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-400 p-5 border-b-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white border-2 border-black">
              <FileSpreadsheet className="h-6 w-6 text-black" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 block">
                Actualización de Estados desde Excel
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-black">
                Matriz de Aprendices y Evidencias Detectada
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-black bg-white hover:bg-black hover:text-white border-2 border-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 border-2 border-black">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Aprendices</span>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-mono font-black text-black">{summary.totalApprentices}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                {summary.matchedWithExisting > 0
                  ? `${summary.matchedWithExisting} coinciden con la lista actual`
                  : 'Registros listos para cargar'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-2 border-black">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Evidencias Mapeadas</span>
                <Layers className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-mono font-black text-black">{detectedEvidenceColumns.length}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                Columnas de estados vinculadas
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-2 border-black">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Archivo</span>
                <FileSpreadsheet className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-xs font-mono font-black text-black truncate" title={fileName}>
                {fileName}
              </div>
              <div className="text-[10px] font-bold text-slate-500 mt-0.5">Hoja: {sheetName}</div>
            </div>
          </div>

          {/* Evidence Columns Found Badge List */}
          {detectedEvidenceColumns.length > 0 && (
            <div className="bg-emerald-50 border-2 border-black p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-black block mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                Columnas de Evidencias Reconocidas en el Excel:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {detectedEvidenceColumns.map((col, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-white text-black px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <span className="font-black font-mono text-emerald-700">#{col.evidenceNumero}</span>
                    <span className="truncate max-w-[150px]">{col.evidenceNombre}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mode Selector */}
          <div className="border-2 border-black p-4 bg-slate-50 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-black block">
              ¿Cómo desea aplicar la información del Excel?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setImportMode('update_existing')}
                className={`p-3 border-2 border-black cursor-pointer transition flex items-start gap-2.5 ${
                  importMode === 'update_existing'
                    ? 'bg-emerald-300 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'update_existing'}
                  onChange={() => setImportMode('update_existing')}
                  className="mt-0.5 accent-black"
                />
                <div>
                  <div className="text-xs font-black uppercase">
                    Actualizar Estados de Aprendices
                  </div>
                  <div className="text-[11px] font-medium text-slate-700 mt-0.5">
                    Modifica los estados de evidencias para los aprendices existentes y añade nuevos si los hay.
                  </div>
                </div>
              </label>

              <label
                onClick={() => setImportMode('replace_all')}
                className={`p-3 border-2 border-black cursor-pointer transition flex items-start gap-2.5 ${
                  importMode === 'replace_all'
                    ? 'bg-emerald-300 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace_all'}
                  onChange={() => setImportMode('replace_all')}
                  className="mt-0.5 accent-black"
                />
                <div>
                  <div className="text-xs font-black uppercase">
                    Reemplazar Lista Completa
                  </div>
                  <div className="text-[11px] font-medium text-slate-700 mt-0.5">
                    Sustituye la lista actual con los {summary.totalApprentices} aprendices del archivo Excel.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Apprentice Preview with Evidences Count */}
          <div className="border-2 border-black overflow-hidden bg-white">
            <div className="p-3 bg-black text-white flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider">
                Vista Previa de Aprendices y Estados ({parsedApps.length} registros)
              </span>
              <div className="relative w-48">
                <Search className="h-3 w-3 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar..."
                  className="w-full pl-7 pr-2 py-0.5 text-[10px] bg-slate-900 text-white border border-slate-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-200">
              {filteredPreview.map((app, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 uppercase truncate">
                      {idx + 1}. {app.nombre}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      {app.documento && <span>CC: {app.documento}</span>}
                      {app.correo && <span className="truncate">{app.correo}</span>}
                    </div>
                  </div>

                  {/* Evidence Status Pill Summary */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5">
                      {app.totalSi} SI
                    </span>
                    <span className="text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5">
                      {app.totalNo} NO
                    </span>
                    {app.totalCorregir > 0 && (
                      <span className="text-[9px] font-black uppercase bg-white text-black border border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        {app.totalCorregir} CORREGIR
                      </span>
                    )}
                    {app.totalNa > 0 && (
                      <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5">
                        {app.totalNa} -
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t-2 border-black flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black uppercase text-black bg-white hover:bg-slate-200 border-2 border-black"
          >
            Cancelar
          </button>

          <button
            id="confirm-excel-import-btn"
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <Check className="h-4 w-4" />
            <span>Aplicar Cambios de Evidencias ({parsedApps.length} Aprendices)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
