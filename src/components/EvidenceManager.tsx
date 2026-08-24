import React, { useState } from 'react';
import { EvidenceItem } from '../types';
import { Plus, Trash2, ArrowUp, ArrowDown, ClipboardList, Check, ArrowRight, AlertCircle, Layers } from 'lucide-react';

interface EvidenceManagerProps {
  evidences: EvidenceItem[];
  setEvidences: React.Dispatch<React.SetStateAction<EvidenceItem[]>>;
  onContinue: () => void;
  onBack: () => void;
}

export const EvidenceManager: React.FC<EvidenceManagerProps> = ({
  evidences,
  setEvidences,
  onContinue,
  onBack
}) => {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const handleAddRow = () => {
    const nextNum = evidences.length + 1;
    const newId = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setEvidences((prev) => [
      ...prev,
      {
        id: newId,
        numero: nextNum,
        nombre: `Evidencia GA1-240202501-AA1-EV0${nextNum}. Actividad de aprendizaje.`,
        defaultEstado: 'NO',
        observacion: ''
      }
    ]);
  };

  const handleUpdate = (id: string, field: keyof EvidenceItem, value: any) => {
    setEvidences((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, [field]: value } : ev))
    );
  };

  const handleDelete = (id: string) => {
    setEvidences((prev) => {
      const filtered = prev.filter((ev) => ev.id !== id);
      return filtered.map((ev, idx) => ({ ...ev, numero: idx + 1 }));
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === evidences.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const next = [...evidences];
    const item = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = item;
    setEvidences(next.map((ev, idx) => ({ ...ev, numero: idx + 1 })));
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const newEvidences: EvidenceItem[] = lines.map((line, idx) => {
      const cleanName = line.replace(/^(\d+[\.\-\)]\s*|[\•\-\*]\s*)/, '').trim();
      return {
        id: `ev-bulk-${Date.now()}-${idx}`,
        numero: idx + 1,
        nombre: cleanName || line,
        defaultEstado: 'NO',
        observacion: ''
      };
    });

    setEvidences(newEvidences);
    setShowBulkModal(false);
    setBulkText('');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 block mb-1">
            Paso 2 de 4 • Matriz de Evidencias
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black">
            Evidencias y Actividades del Llamado
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl font-medium">
            Defina las evidencias pendientes o evaluadas. Se incluirán exactamente las evidencias reales en el formato oficial SENA, sin espacios en blanco ni filas vacías.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            id="open-bulk-evidence-btn"
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wider text-black bg-white hover:bg-slate-100 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <ClipboardList className="h-4 w-4" />
            Pegar Listado
          </button>
          <button
            id="add-evidence-top-btn"
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Plus className="h-4 w-4" />
            + Agregar Evidencia
          </button>
        </div>
      </div>

      {/* Evidences List Card */}
      <div className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="p-4 border-b-2 border-black flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-black">
              Listado de Evidencias ({evidences.length})
            </h3>
            <span className="text-[10px] font-mono font-bold bg-white border border-black px-2 py-0.5 text-slate-800">
              {evidences.length === 1 ? '1 Evidencia' : `${evidences.length} Evidencias Reales`}
            </span>
          </div>
          {evidences.length > 0 && (
            <button
              id="clear-all-evidences-btn"
              type="button"
              onClick={() => {
                if (window.confirm('¿Está seguro de limpiar todas las evidencias?')) {
                  setEvidences([]);
                }
              }}
              className="text-[10px] font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 border border-rose-300 px-2 py-1 transition"
            >
              Limpiar Todo
            </button>
          )}
        </div>

        {evidences.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-black uppercase text-slate-800">No hay evidencias registradas</p>
            <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">
              Agregue manualmente o pegue el listado de evidencias desde su guía de aprendizaje.
            </p>
            <button
              id="add-first-evidence-btn"
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition"
            >
              <Plus className="h-4 w-4" />
              Agregar Primera Evidencia
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="py-3 px-3 w-16 text-center border-r border-slate-700">N°</th>
                  <th className="py-3 px-4 border-r border-slate-700">Descripción de la Evidencia</th>
                  <th className="py-3 px-4 w-44 text-center border-r border-slate-700">Estado Por Defecto</th>
                  <th className="py-3 px-4 w-60 border-r border-slate-700">Observaciones Fijas</th>
                  <th className="py-3 px-3 w-28 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200 text-xs">
                {evidences.map((ev, idx) => (
                  <tr
                    key={ev.id}
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="py-3 px-3 text-center font-black text-slate-900 font-mono border-r-2 border-slate-200">
                      #{ev.numero < 10 ? `0${ev.numero}` : ev.numero}
                    </td>
                    <td className="py-3 px-4 border-r-2 border-slate-200">
                      <input
                        id={`evidence-name-${idx}`}
                        type="text"
                        value={ev.nombre}
                        onChange={(e) => handleUpdate(ev.id, 'nombre', e.target.value)}
                        placeholder="Nombre de la evidencia..."
                        className="w-full p-2 border-2 border-slate-300 font-semibold focus:border-black focus:bg-white text-xs outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-center border-r-2 border-slate-200">
                      <select
                        id={`evidence-status-${idx}`}
                        value={ev.defaultEstado}
                        onChange={(e) => handleUpdate(ev.id, 'defaultEstado', e.target.value)}
                        className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-black outline-none cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                          ev.defaultEstado === 'NO'
                            ? 'bg-rose-400 text-black'
                            : ev.defaultEstado === 'SI'
                            ? 'bg-emerald-400 text-black'
                            : 'bg-white text-black'
                        }`}
                      >
                        <option value="NO">NO (No Aprobó)</option>
                        <option value="SI">SI (Aprobó)</option>
                        <option value="-">- (No Aplica)</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 border-r-2 border-slate-200">
                      <input
                        id={`evidence-obs-${idx}`}
                        type="text"
                        value={ev.observacion || ''}
                        onChange={(e) => handleUpdate(ev.id, 'observacion', e.target.value)}
                        placeholder="Opcional..."
                        className="w-full p-2 border-2 border-slate-300 focus:border-black focus:bg-white text-xs outline-none"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-black hover:bg-slate-200 disabled:opacity-20 border border-slate-400 transition"
                          title="Subir"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === evidences.length - 1}
                          className="p-1 text-black hover:bg-slate-200 disabled:opacity-20 border border-slate-400 transition"
                          title="Bajar"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`delete-evidence-${idx}`}
                          type="button"
                          onClick={() => handleDelete(ev.id)}
                          className="p-1 text-black hover:bg-rose-500 hover:text-white border border-black transition"
                          title="Eliminar evidencia"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t-2 border-black flex items-center justify-between">
          <button
            id="add-evidence-bottom-btn"
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black hover:underline"
          >
            <Plus className="h-4 w-4" />
            + Agregar Otra Evidencia
          </button>
          <span className="text-xs font-mono font-bold text-slate-700">
            TOTAL EVIDENCIAS: <strong className="text-black font-black">{evidences.length}</strong>
          </span>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          id="back-to-general-btn"
          type="button"
          onClick={onBack}
          className="px-5 py-3 text-xs font-black uppercase tracking-wider text-black bg-white hover:bg-slate-100 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        >
          ← Regresar a Datos
        </button>
        <button
          id="continue-to-aprendices-btn"
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <span>Siguiente: Lista de Aprendices</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div
          id="bulk-evidence-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-lg bg-white p-6 border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-black">
                  Pegar Lista de Evidencias
                </h3>
                <p className="text-xs text-slate-600 font-medium">Una evidencia por línea. Se numerarán automáticamente.</p>
              </div>
            </div>

            <textarea
              id="bulk-evidence-textarea"
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Evidencia GA1-240202501-AA1-EV01. Cuestionario.\nEvidencia GA1-240202501-AA1-EV02. Video presentación.\nEvidencia GA1-240202501-AA1-EV03. Folleto.\nGA2-240202501-AA1-EV01. Cuestionario.`}
              className="w-full p-3 text-xs font-mono font-medium border-2 border-black bg-slate-50 focus:bg-white focus:outline-none resize-y mb-4"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-xs font-black uppercase text-black bg-slate-100 hover:bg-slate-200 border-2 border-black transition"
              >
                Cancelar
              </button>
              <button
                id="apply-bulk-evidence-btn"
                type="button"
                onClick={handleBulkImport}
                disabled={!bulkText.trim()}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Cargar Evidencias
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
