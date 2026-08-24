import React, { useState } from 'react';
import { X, FileText, Archive, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { Apprentice, EvidenceItem, GeneralInfo, SignatureConfig } from '../types';
import { generateAllApprenticesCombinedPdf, generateAllApprenticesZip } from '../utils/pdfGenerator';

interface BulkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  apprentices: Apprentice[];
  generalInfo: GeneralInfo;
  evidences: EvidenceItem[];
  signatureConfig: SignatureConfig;
}

export const BulkDownloadModal: React.FC<BulkDownloadModalProps> = ({
  isOpen,
  onClose,
  apprentices,
  generalInfo,
  evidences,
  signatureConfig
}) => {
  const [downloadingType, setDownloadingType] = useState<'combined' | 'zip' | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerDownloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCombined = async () => {
    try {
      setDownloadingType('combined');
      setCompletedMessage(null);
      setProgress({ current: 0, total: apprentices.length });

      const { blob, filename } = await generateAllApprenticesCombinedPdf(
        apprentices,
        generalInfo,
        evidences,
        signatureConfig,
        (current, total) => {
          setProgress({ current, total });
        }
      );

      triggerDownloadBlob(blob, filename);
      setCompletedMessage(`¡PDF combinado generado exitosamente con ${apprentices.length} llamados de atención!`);
    } catch (err) {
      console.error(err);
      alert('Hubo un problema generando el archivo PDF combinado.');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingType('zip');
      setCompletedMessage(null);
      setProgress({ current: 0, total: apprentices.length });

      const { blob, filename } = await generateAllApprenticesZip(
        apprentices,
        generalInfo,
        evidences,
        signatureConfig,
        (current, total) => {
          setProgress({ current, total });
        }
      );

      triggerDownloadBlob(blob, filename);
      setCompletedMessage(`¡Archivo ZIP con ${apprentices.length} PDFs individuales generado exitosamente!`);
    } catch (err) {
      console.error(err);
      alert('Hubo un problema generando el archivo ZIP.');
    } finally {
      setDownloadingType(null);
    }
  };

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div
      id="bulk-download-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
    >
      <div
        id="bulk-download-card"
        className="w-full max-w-lg bg-white p-6 border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
      >
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-black">
              Descarga Masiva de Llamados
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Generación de documentos para los <span className="font-bold text-black bg-emerald-300 px-1 border border-black">{apprentices.length}</span> aprendices registrados
            </p>
          </div>
          <button
            id="close-bulk-modal-btn"
            onClick={onClose}
            disabled={downloadingType !== null}
            className="p-1 text-black hover:bg-black hover:text-white transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar if active */}
        {downloadingType !== null && (
          <div className="mb-6 p-4 bg-emerald-100 border-2 border-black">
            <div className="flex items-center justify-between text-xs font-black uppercase text-black mb-2">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-black" />
                Generando ({progress.current} de {progress.total})...
              </span>
              <span>{percent}%</span>
            </div>
            <div className="w-full bg-white border border-black h-3 overflow-hidden">
              <div
                className="bg-black h-full transition-all duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {completedMessage && (
          <div className="mb-6 p-4 bg-emerald-300 border-2 border-black flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-black shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-black">{completedMessage}</p>
          </div>
        )}

        {/* Action Options */}
        <div className="space-y-3 mb-6">
          {/* Option 1: Combined PDF */}
          <div className="p-4 border-2 border-black bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-black text-white shrink-0 mt-0.5">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight text-black">
                  PDF Único Combinado
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Un solo documento continuo con todos los aprendices (2 páginas c/u). Ideal para impresión masiva o entrega institucional.
                </p>
              </div>
            </div>
            <button
              id="bulk-download-combined-btn"
              onClick={handleDownloadCombined}
              disabled={downloadingType !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all shrink-0 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar PDF
            </button>
          </div>

          {/* Option 2: ZIP Package */}
          <div className="p-4 border-2 border-black bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-black text-white shrink-0 mt-0.5">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight text-black">
                  Archivo Comprimido (.ZIP)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Un archivo ZIP que contiene los PDFs individuales nombrados por aprendiz. Ideal para enviar por correo individual.
                </p>
              </div>
            </div>
            <button
              id="bulk-download-zip-btn"
              onClick={handleDownloadZip}
              disabled={downloadingType !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all shrink-0 disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5" />
              Descargar ZIP
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t-2 border-black">
          <button
            id="close-bulk-footer-btn"
            onClick={onClose}
            disabled={downloadingType !== null}
            className="px-5 py-2 text-xs font-black uppercase text-black bg-slate-100 hover:bg-slate-200 border-2 border-black transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
