import React, { useState } from 'react';
import { Apprentice, EvidenceItem } from '../types';
import { ParsedPdfResult } from '../utils/pdfParser';
import { FileText, CheckCircle2, AlertCircle, X, Check, Users, BookOpen, Layers } from 'lucide-react';

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ParsedPdfResult | null;
  fileName: string;
  onConfirm: (apprentices: Apprentice[], syncEvidences: boolean, mode: 'replace' | 'append') => void;
}

export const PdfImportModal: React.FC<PdfImportModalProps> = ({
  isOpen,
  onClose,
  result,
  fileName,
  onConfirm
}) => {
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [syncEvidences, setSyncEvidences] = useState<boolean>(true);

  if (!isOpen || !result) return null;

  const { apprentices, detectedEvidences, pageCount, summary } = result;

  const handleApply = () => {
    onConfirm(apprentices, syncEvidences && detectedEvidences.length > 0, importMode);
    onClose();
  };

  return (
    <div
      id="pdf-import-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-3xl bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-400 p-5 border-b-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white border-2 border-black">
              <FileText className="h-6 w-6 text-black" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 block">
                Procesamiento de Documento PDF
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-black">
                Aprendices y Evidencias Extraídas del PDF
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
            <div className="p-4 bg-slate-50 border-2 border-black">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Aprendices</span>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-mono font-black text-black">{summary.totalApprentices}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">Detectados con nombres y datos</div>
            </div>

            <div className="p-4 bg-slate-50 border-2 border-black">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Páginas Leídas</span>
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-mono font-black text-black">{pageCount}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">Archivo: {fileName}</div>
            </div>

            <div className="p-4 bg-slate-50 border-2 border-black">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Evidencias en PDF</span>
                <Layers className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-mono font-black text-black">{summary.detectedEvidencesCount}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">
                {summary.detectedEvidencesCount > 0 ? 'Códigos de actividad detectados' : 'Mapeadas a evidencias actuales'}
              </div>
            </div>
          </div>

          {/* Options Section */}
          <div className="p-4 bg-slate-50 border-2 border-black space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-black">
              Opciones de Importación
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition ${
                  importMode === 'replace' ? 'bg-emerald-100 border-black' : 'bg-white border-slate-300 hover:border-black'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-xs font-black uppercase text-black">Reemplazar listado actual</div>
                  <div className="text-[11px] text-slate-600">
                    Sustituye los aprendices existentes por los {apprentices.length} encontrados en el PDF.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition ${
                  importMode === 'append' ? 'bg-emerald-100 border-black' : 'bg-white border-slate-300 hover:border-black'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-xs font-black uppercase text-black">Anexar a los existentes</div>
                  <div className="text-[11px] text-slate-600">
                    Conserva los aprendices que ya tienes y agrega los {apprentices.length} nuevos.
                  </div>
                </div>
              </label>
            </div>

            {detectedEvidences.length > 0 && (
              <label className="flex items-center gap-2 pt-2 border-t border-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncEvidences}
                  onChange={(e) => setSyncEvidences(e.target.checked)}
                  className="h-4 w-4 rounded border-2 border-black accent-black"
                />
                <span className="text-xs font-bold text-black">
                  Sincronizar e importar las {detectedEvidences.length} evidencias detectadas en el PDF
                </span>
              </label>
            )}
          </div>

          {/* Apprentices Preview Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-black">
                Vista Previa de Aprendices Encontrados ({apprentices.length})
              </h4>
              <span className="text-[10px] font-bold text-slate-500">
                Mostrando los primeros {Math.min(apprentices.length, 10)} registros
              </span>
            </div>

            <div className="border-2 border-black max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-black text-white font-mono sticky top-0">
                  <tr>
                    <th className="p-2 border-r border-slate-700 w-10">N°</th>
                    <th className="p-2 border-r border-slate-700">Nombre del Aprendiz</th>
                    <th className="p-2 border-r border-slate-700">Documento</th>
                    <th className="p-2 border-r border-slate-700">Correo</th>
                    <th className="p-2 text-center w-24">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {apprentices.slice(0, 15).map((app, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 font-mono text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-black uppercase text-black">
                        {app.nombre}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono">
                        {app.documento || <span className="text-slate-400 italic">No detectado</span>}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">
                        {app.correo}
                      </td>
                      <td className="p-2 text-center">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-black font-mono bg-rose-100 text-rose-800 border border-rose-400">
                          {app.juicioEspecifico || 'NO_APROBO'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {apprentices.length > 15 && (
              <p className="text-[11px] font-semibold text-slate-500 text-center mt-1.5">
                ... y {apprentices.length - 15} aprendices más en el documento.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-4 border-t-2 border-black flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-black uppercase text-black bg-white hover:bg-slate-200 border-2 border-black transition"
          >
            Cancelar
          </button>
          <button
            id="confirm-pdf-import-btn"
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <Check className="h-4 w-4" />
            <span>Confirmar e Importar {apprentices.length} Aprendices</span>
          </button>
        </div>
      </div>
    </div>
  );
};
