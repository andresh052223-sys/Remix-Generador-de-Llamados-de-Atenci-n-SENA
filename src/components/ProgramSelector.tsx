import React, { useState } from 'react';
import { ProgramSlot, ProgramSlotsMap } from '../types';
import {
  GraduationCap,
  Layers,
  Users,
  Edit2,
  Copy,
  RotateCcw,
  Check,
  X,
  ChevronDown,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';

interface ProgramSelectorProps {
  activeSlotNumber: number;
  programSlots: ProgramSlotsMap;
  onSelectSlot: (slotNumber: number) => void;
  onUpdateSlotCustomName: (slotNumber: number, newName: string) => void;
  onResetSlot: (slotNumber: number) => void;
  onCopySlot: (sourceSlotNumber: number, targetSlotNumber: number) => void;
}

export const ProgramSelector: React.FC<ProgramSelectorProps> = ({
  activeSlotNumber,
  programSlots,
  onSelectSlot,
  onUpdateSlotCustomName,
  onResetSlot,
  onCopySlot
}) => {
  const [editingSlotNumber, setEditingSlotNumber] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySource, setCopySource] = useState<number>(1);
  const [copyTarget, setCopyTarget] = useState<number>(2);

  const activeSlot = programSlots[activeSlotNumber] || programSlots[1];

  const handleStartEdit = (slotNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSlotNumber(slotNumber);
    setTempName(programSlots[slotNumber]?.customName || programSlots[slotNumber]?.generalInfo?.programa || `Programa ${slotNumber}`);
  };

  const handleSaveEdit = (slotNumber: number, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (tempName.trim()) {
      onUpdateSlotCustomName(slotNumber, tempName.trim());
    }
    setEditingSlotNumber(null);
  };

  const handleExecuteCopy = () => {
    if (copySource === copyTarget) {
      alert('El programa de origen y destino deben ser diferentes.');
      return;
    }
    const sourceName = programSlots[copySource]?.customName || `Programa ${copySource}`;
    const targetName = programSlots[copyTarget]?.customName || `Programa ${copyTarget}`;

    if (window.confirm(`¿Copiar la información de ${sourceName} hacia ${targetName}? Los datos actuales del Programa ${copyTarget} serán reemplazados.`)) {
      onCopySlot(copySource, copyTarget);
      setIsCopyModalOpen(false);
    }
  };

  return (
    <section className="bg-slate-900 text-white border-b-4 border-black py-3 px-4 sm:px-6 lg:px-8 shadow-inner">
      <div className="max-w-7xl mx-auto">
        {/* Top bar with heading and utilities */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-400 text-black font-black text-[10px] px-2 py-0.5 uppercase tracking-wider border border-black shadow-[1px_1px_0px_0px_rgba(255,255,255,0.4)] flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" />
              5 Programas Disponibles
            </span>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>Seleccionar Programa de Formación a Trabajar:</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCopySource(activeSlotNumber);
                setCopyTarget(activeSlotNumber === 1 ? 2 : 1);
                setIsCopyModalOpen(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-2.5 py-1 border border-slate-700 hover:border-slate-500 transition-all flex items-center gap-1.5"
              title="Copiar datos entre programas"
            >
              <Copy className="h-3 w-3 text-emerald-400" />
              <span>Copiar entre programas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm(`¿Desea restablecer los datos del Programa ${activeSlotNumber} a su plantilla predeterminada?`)) {
                  onResetSlot(activeSlotNumber);
                }
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-2.5 py-1 border border-slate-700 hover:border-slate-500 transition-all flex items-center gap-1.5"
              title="Restablecer este programa"
            >
              <RotateCcw className="h-3 w-3 text-amber-400" />
              <span>Restablecer P{activeSlotNumber}</span>
            </button>
          </div>
        </div>

        {/* 5 Program Cards / Switcher Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {[1, 2, 3, 4, 5].map((slotNum) => {
            const slot = programSlots[slotNum];
            const isActive = slotNum === activeSlotNumber;
            const programName = slot?.customName || slot?.generalInfo?.programa || `Programa ${slotNum}`;
            const ficha = slot?.generalInfo?.codigoFicha || 'Sin ficha';
            const apprenticesCount = slot?.apprentices?.length || 0;
            const evidencesCount = slot?.evidences?.length || 0;

            return (
              <div
                key={slotNum}
                onClick={() => onSelectSlot(slotNum)}
                className={`relative cursor-pointer transition-all border-2 text-left p-2.5 flex flex-col justify-between ${
                  isActive
                    ? 'bg-emerald-400 text-black border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] translate-x-[-1px] translate-y-[-1px]'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 hover:border-slate-500 hover:text-white'
                }`}
              >
                {/* Header row in card: Slot badge & Active tag */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span
                    className={`text-[10px] font-black uppercase px-1.5 py-0.5 border ${
                      isActive
                        ? 'bg-black text-white border-black'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    PROGRAMA {slotNum}
                  </span>

                  {isActive ? (
                    <span className="text-[9px] font-black uppercase bg-black text-emerald-300 px-1.5 py-0.5 border border-black flex items-center gap-1 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      EN EDICIÓN
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleStartEdit(slotNum, e)}
                      className="text-slate-400 hover:text-white text-[10px] p-0.5 rounded hover:bg-slate-700"
                      title="Cambiar etiqueta"
                    >
                      <Edit2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>

                {/* Program Name */}
                {editingSlotNumber === slotNum ? (
                  <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(slotNum);
                        if (e.key === 'Escape') setEditingSlotNumber(null);
                      }}
                      className="w-full text-xs font-bold p-1 bg-white text-black border border-black focus:outline-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1 mt-1">
                      <button
                        type="button"
                        onClick={(e) => handleSaveEdit(slotNum, e)}
                        className="bg-black text-white p-0.5 text-[9px] font-bold border"
                      >
                        <Check className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSlotNumber(null)}
                        className="bg-slate-300 text-black p-0.5 text-[9px] font-bold border"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2">
                    <h3
                      className={`text-xs font-black line-clamp-2 leading-snug tracking-tight ${
                        isActive ? 'text-black' : 'text-white'
                      }`}
                      title={programName}
                    >
                      {programName}
                    </h3>
                    <div
                      className={`text-[11px] font-mono font-bold mt-0.5 ${
                        isActive ? 'text-slate-900' : 'text-emerald-400'
                      }`}
                    >
                      Ficha: {ficha}
                    </div>
                  </div>
                )}

                {/* Footer metrics */}
                <div
                  className={`pt-1.5 border-t text-[10px] font-bold flex items-center justify-between ${
                    isActive ? 'border-black/30 text-black' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {apprenticesCount} aprendices
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {evidencesCount} evid.
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Program Details Mini-Bar */}
        <div className="mt-2.5 bg-black/40 border border-slate-700/80 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Programa Activo:</span>
            <span className="font-black text-emerald-400">
              Programa {activeSlotNumber}: {activeSlot?.customName || activeSlot?.generalInfo?.programa}
            </span>
            <span className="text-slate-500">•</span>
            <span className="font-mono text-slate-300 font-bold">
              Ficha {activeSlot?.generalInfo?.codigoFicha}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-medium">
              {activeSlot?.generalInfo?.transversal || 'Transversal Inglés'}
            </span>
          </div>

          <div className="text-[10px] text-slate-400 italic">
            Toda la información se guarda automáticamente para este programa.
          </div>
        </div>
      </div>

      {/* Modal for copying data between programs */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white text-black border-4 border-black max-w-md w-full p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
              <h3 className="font-black text-base uppercase tracking-tight flex items-center gap-2">
                <Copy className="h-4 w-4 text-emerald-600" />
                Copiar Datos entre Programas
              </h3>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="p-1 hover:bg-slate-200 border border-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-700 mb-4 leading-relaxed">
              Esta función te permite duplicar toda la información (datos del programa, evidencias y aprendices) de un programa a otro, ideal si tienes fichas paralelas o similares.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-800 mb-1">
                  1. Copiar desde (Origen):
                </label>
                <select
                  value={copySource}
                  onChange={(e) => setCopySource(parseInt(e.target.value, 10))}
                  className="w-full p-2 border-2 border-black text-xs font-bold bg-white"
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <option key={s} value={s}>
                      Programa {s}: {programSlots[s]?.customName || programSlots[s]?.generalInfo?.programa} (Ficha {programSlots[s]?.generalInfo?.codigoFicha})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center my-1 text-slate-500">
                <ArrowRightLeft className="h-5 w-5" />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-800 mb-1">
                  2. Copiar hacia (Destino - se sobrescribirá):
                </label>
                <select
                  value={copyTarget}
                  onChange={(e) => setCopyTarget(parseInt(e.target.value, 10))}
                  className="w-full p-2 border-2 border-black text-xs font-bold bg-white"
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <option key={s} value={s}>
                      Programa {s}: {programSlots[s]?.customName || programSlots[s]?.generalInfo?.programa} (Ficha {programSlots[s]?.generalInfo?.codigoFicha})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 text-xs font-black uppercase border-2 border-black hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteCopy}
                className="px-4 py-2 text-xs font-black uppercase bg-emerald-400 text-black border-2 border-black hover:bg-emerald-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Confirmar y Copiar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
