import React, { useState, useEffect } from 'react';
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
  Search,
  Sliders,
  Filter
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ParsedExcelResult | null;
  currentEvidences: EvidenceItem[];
  existingApprentices: Apprentice[];
  initialEvidenceCount?: number;
  onConfirm: (
    updatedApprentices: Apprentice[],
    mode: 'update_existing' | 'replace_all',
    updatedEvidences?: EvidenceItem[]
  ) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  result,
  currentEvidences,
  existingApprentices,
  initialEvidenceCount,
  onConfirm
}) => {
  const [importMode, setImportMode] = useState<'update_existing' | 'replace_all'>('update_existing');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);

  useEffect(() => {
    if (result?.detectedEvidenceColumns) {
      if (initialEvidenceCount && initialEvidenceCount > 0) {
        const clamped = Math.min(result.detectedEvidenceColumns.length, initialEvidenceCount);
        setSelectedEvidenceIds(result.detectedEvidenceColumns.slice(0, clamped).map((c) => c.evidenceId));
      } else {
        setSelectedEvidenceIds(result.detectedEvidenceColumns.map((c) => c.evidenceId));
      }
    }
  }, [result, initialEvidenceCount]);

  if (!isOpen || !result) return null;

  const {
    fileName,
    sheetName,
    apprentices: parsedApps,
    detectedEvidenceColumns,
    unmappedEvidenceColumns,
    summary
  } = result;

  const handleSetEvidenceCount = (count: number) => {
    if (!detectedEvidenceColumns) return;
    const clamped = Math.max(0, Math.min(detectedEvidenceColumns.length, count));
    setSelectedEvidenceIds(detectedEvidenceColumns.slice(0, clamped).map((c) => c.evidenceId));
  };

  const handleToggleEvidence = (evidenceId: string) => {
    setSelectedEvidenceIds((prev) =>
      prev.includes(evidenceId) ? prev.filter((id) => id !== evidenceId) : [...prev, evidenceId]
    );
  };

  const handleSelectAllEvidences = () => {
    setSelectedEvidenceIds(detectedEvidenceColumns.map((c) => c.evidenceId));
  };

  const handleDeselectAllEvidences = () => {
    setSelectedEvidenceIds([]);
  };

  const handleApply = () => {
    if (selectedEvidenceIds.length === 0) return;

    let finalApprentices: Apprentice[] = [];
    const activeEvidenceIdSet = new Set(selectedEvidenceIds);

    // Filter apprentice evidence status to ONLY include selected evidence IDs
    const filterStatuses = (statusMap: Record<string, any>) => {
      const filtered: Record<string, any> = {};
      Object.entries(statusMap || {}).forEach(([evId, val]) => {
        if (activeEvidenceIdSet.has(evId)) {
          filtered[evId] = val;
        }
      });
      return filtered;
    };

    if (importMode === 'update_existing') {
      // Create maps of parsed apprentices by cleaned doc and normalized name
      const parsedByDoc = new Map<string, (typeof parsedApps)[0]>();
      const parsedByName = new Map<string, (typeof parsedApps)[0]>();

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
          const mappedFromExcel = filterStatuses(match.evidenciasStatus);
          return {
            ...existing,
            documento: existing.documento || match.documento,
            correo: existing.correo || match.correo,
            telefono: existing.telefono || match.telefono,
            evidenciasStatus: {
              ...(existing.evidenciasStatus || {}),
              ...mappedFromExcel
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
          evidenciasStatus: filterStatuses(p.evidenciasStatus),
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
        evidenciasStatus: filterStatuses(p.evidenciasStatus),
        observacionesEspecificas: '',
        juicioEspecifico: 'NO_APROBO' as const
      }));
    }

    // Determine final evidences:
    // Retain existing evidences, and only add new evidences that were selected for mapping
    const finalEvidences = [...currentEvidences];
    (result.newEvidencesFound || []).forEach((ne) => {
      if (activeEvidenceIdSet.has(ne.id) && !finalEvidences.some((e) => e.id === ne.id)) {
        finalEvidences.push(ne);
      }
    });
    finalEvidences.sort((a, b) => a.numero - b.numero);

    onConfirm(finalApprentices, importMode, finalEvidences);
    onClose();
  };

  // Calculate live preview counts based ONLY on the chosen evidences
  const getApprenticeEvidenceStats = (evidenciasStatus: Record<string, any>) => {
    let si = 0;
    let no = 0;
    let corregir = 0;
    let na = 0;

    selectedEvidenceIds.forEach((evId) => {
      const st = evidenciasStatus[evId];
      if (st === 'SI') si++;
      else if (st === 'NO') no++;
      else if (st === 'CORREGIR') corregir++;
      else if (st === '-') na++;
    });

    return { si, no, corregir, na };
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

          {/* New Evidences Alert Banner */}
          {result.newEvidencesFound && result.newEvidencesFound.length > 0 && (
            <div className="bg-emerald-100 border-2 border-emerald-700 p-3.5 flex items-start gap-3 shadow-[2px_2px_0px_0px_rgba(4,120,87,1)]">
              <Sparkles className="h-5 w-5 text-emerald-800 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-2">
                  ¡{result.newEvidencesFound.length} Nueva(s) Evidencia(s) Reconocida(s) en el Archivo!
                </div>
                <div className="text-[11px] text-emerald-900 font-medium leading-relaxed">
                  Se detectaron columnas de evidencias que amplían la matriz actual (por ejemplo:{' '}
                  {result.newEvidencesFound.map((e) => `#${e.numero} ${e.nombre}`).join(', ')}). Al
                  confirmar la importación, se integrarán automáticamente tanto las calificaciones como
                  las nuevas columnas en la matriz general.
                </div>
              </div>
            </div>
          )}

          {/* Evidence Count Selection Section */}
          {detectedEvidenceColumns.length > 0 && (
            <div className="bg-emerald-50 border-2 border-black p-4 space-y-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-emerald-200">
                <div>
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-emerald-800" />
                    <span className="text-xs font-black uppercase tracking-wider text-black">
                      Número de Evidencias a Mapear:
                    </span>
                    <span className="bg-emerald-600 text-white font-mono text-[10px] font-black px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      {selectedEvidenceIds.length} de {detectedEvidenceColumns.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium mt-0.5">
                    Ajuste la cantidad de evidencias que desea mapear desde el archivo Excel para actualizar la matriz.
                  </p>
                </div>

                {/* Stepper Control for Evidence Count */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <button
                      type="button"
                      onClick={() => handleSetEvidenceCount(Math.max(1, selectedEvidenceIds.length - 1))}
                      disabled={selectedEvidenceIds.length <= 1}
                      className="px-3 py-1 font-mono font-black text-sm hover:bg-slate-100 disabled:opacity-30 border-r border-black transition"
                      title="Mapear una evidencia menos"
                    >
                      -
                    </button>
                    <div className="px-3 py-1 font-mono font-black text-sm text-black min-w-[2.75rem] text-center bg-emerald-50">
                      {selectedEvidenceIds.length}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetEvidenceCount(Math.min(detectedEvidenceColumns.length, selectedEvidenceIds.length + 1))}
                      disabled={selectedEvidenceIds.length >= detectedEvidenceColumns.length}
                      className="px-3 py-1 font-mono font-black text-sm hover:bg-slate-100 disabled:opacity-30 border-l border-black transition"
                      title="Mapear una evidencia más"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] font-black text-slate-600 uppercase">
                    / {detectedEvidenceColumns.length} detectadas
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-700">Preajustes rápidos:</span>
                {detectedEvidenceColumns.length >= 8 && (
                  <button
                    type="button"
                    onClick={() => handleSetEvidenceCount(8)}
                    className={`px-3 py-1 text-[11px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition ${
                      selectedEvidenceIds.length === 8
                        ? 'bg-emerald-400 text-black font-black'
                        : 'bg-white hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    8 Evidencias
                  </button>
                )}
                {detectedEvidenceColumns.length >= 9 && (
                  <button
                    type="button"
                    onClick={() => handleSetEvidenceCount(9)}
                    className={`px-3 py-1 text-[11px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition ${
                      selectedEvidenceIds.length === 9
                        ? 'bg-emerald-400 text-black font-black'
                        : 'bg-white hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    9 Evidencias
                  </button>
                )}
                {detectedEvidenceColumns.length >= 10 && (
                  <button
                    type="button"
                    onClick={() => handleSetEvidenceCount(10)}
                    className={`px-3 py-1 text-[11px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition ${
                      selectedEvidenceIds.length === 10
                        ? 'bg-emerald-400 text-black font-black'
                        : 'bg-white hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    10 Evidencias
                  </button>
                )}
                {detectedEvidenceColumns.length >= 12 && (
                  <button
                    type="button"
                    onClick={() => handleSetEvidenceCount(12)}
                    className={`px-3 py-1 text-[11px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition ${
                      selectedEvidenceIds.length === 12
                        ? 'bg-emerald-400 text-black font-black'
                        : 'bg-white hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    12 Evidencias
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSelectAllEvidences}
                  className={`px-3 py-1 text-[11px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition ${
                    selectedEvidenceIds.length === detectedEvidenceColumns.length
                      ? 'bg-emerald-400 text-black font-black'
                      : 'bg-white hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  Todas ({detectedEvidenceColumns.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllEvidences}
                  className="px-2 py-1 text-[10px] font-bold uppercase text-slate-600 hover:text-black underline ml-auto"
                >
                  Deseleccionar todas
                </button>
              </div>

              {/* Interactive Evidence Chips / Checkboxes */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-black flex items-center justify-between">
                  <span>Selección detallada de columnas reconocidas:</span>
                  <span className="text-slate-600 font-bold text-[9px]">
                    (Haga clic sobre una evidencia para activarla o desactivarla)
                  </span>
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white border-2 border-black shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
                  {detectedEvidenceColumns.map((col, idx) => {
                    const isSelected = selectedEvidenceIds.includes(col.evidenceId);
                    return (
                      <label
                        key={idx}
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 border-2 cursor-pointer select-none transition ${
                          isSelected
                            ? col.isNew
                              ? 'bg-emerald-200 text-emerald-950 border-emerald-800 shadow-[1px_1px_0px_0px_rgba(4,120,87,1)]'
                              : 'bg-emerald-100 text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-slate-100 text-slate-400 border-slate-300 line-through opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleEvidence(col.evidenceId)}
                          className="accent-black h-3.5 w-3.5"
                        />
                        <span className="font-black font-mono text-emerald-800">#{col.evidenceNumero}</span>
                        <span className="truncate max-w-[140px]">{col.evidenceNombre}</span>
                        {col.isNew && (
                          <span className="px-1 py-0.2 bg-emerald-700 text-white text-[8px] font-black uppercase tracking-wider">
                            NUEVA
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
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
                    Modifica los estados de las {selectedEvidenceIds.length} evidencias seleccionadas para los aprendices existentes.
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
                    Sustituye la lista actual con los {summary.totalApprentices} aprendices y las {selectedEvidenceIds.length} evidencias seleccionadas.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Apprentice Preview with Dynamic Evidences Count */}
          <div className="border-2 border-black overflow-hidden bg-white">
            <div className="p-3 bg-black text-white flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider">
                Vista Previa de Aprendices con las {selectedEvidenceIds.length} Evidencias Seleccionadas ({parsedApps.length} registros)
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
              {filteredPreview.map((app, idx) => {
                const appStats = getApprenticeEvidenceStats(app.evidenciasStatus);
                return (
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

                    {/* Evidence Status Pill Summary for selected evidences */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5">
                        {appStats.si} SI
                      </span>
                      <span className="text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5">
                        {appStats.no} NO
                      </span>
                      {appStats.corregir > 0 && (
                        <span className="text-[9px] font-black uppercase bg-white text-black border border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                          {appStats.corregir} CORREGIR
                        </span>
                      )}
                      {appStats.na > 0 && (
                        <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5">
                          {appStats.na} -
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3">
          {selectedEvidenceIds.length === 0 ? (
            <div className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              <span>Debe seleccionar al menos 1 evidencia para mapear.</span>
            </div>
          ) : (
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Se mapearán <strong>{selectedEvidenceIds.length} evidencias</strong> en la matriz.</span>
            </div>
          )}

          <div className="flex items-center gap-2 self-end sm:self-auto">
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
              disabled={selectedEvidenceIds.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <Check className="h-4 w-4" />
              <span>
                Aplicar {selectedEvidenceIds.length} Evidencias ({parsedApps.length} Aprendices)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
