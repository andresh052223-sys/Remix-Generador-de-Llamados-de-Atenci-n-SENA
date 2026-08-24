import React, { useState, useMemo } from 'react';
import { Apprentice } from '../types';
import {
  parseFullName,
  formatToLastNamesFirst,
  formatToFirstNamesFirst,
  invertNameOrder,
  sortApprenticesByNameMode,
  NameSortMode
} from '../utils/nameUtils';
import {
  ArrowDownAZ,
  ArrowUpDown,
  Check,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  UserCheck,
  Users,
  X
} from 'lucide-react';

export type NameFormatOption =
  | 'LAST_NAMES_FIRST' // e.g. "Pérez Gómez Juan Carlos"
  | 'LAST_NAMES_COMMA' // e.g. "Pérez Gómez, Juan Carlos"
  | 'FIRST_NAMES_FIRST' // e.g. "Juan Carlos Pérez Gómez"
  | 'INVERT_SWAP'; // e.g. Invert current parts

interface NameFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  apprentices: Apprentice[];
  onApplyTransformation: (updatedApprentices: Apprentice[], message: string) => void;
}

export const NameFormatModal: React.FC<NameFormatModalProps> = ({
  isOpen,
  onClose,
  apprentices,
  onApplyTransformation
}) => {
  const [selectedFormat, setSelectedFormat] = useState<NameFormatOption>('LAST_NAMES_FIRST');
  const [alsoSortAfter, setAlsoSortAfter] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Preview transformed apprentices
  const transformedPreview = useMemo(() => {
    return apprentices.map((app) => {
      let newName = app.nombre || '';

      switch (selectedFormat) {
        case 'LAST_NAMES_FIRST':
          newName = formatToLastNamesFirst(app.nombre, false);
          break;
        case 'LAST_NAMES_COMMA':
          newName = formatToLastNamesFirst(app.nombre, true);
          break;
        case 'FIRST_NAMES_FIRST':
          newName = formatToFirstNamesFirst(app.nombre);
          break;
        case 'INVERT_SWAP':
          newName = invertNameOrder(app.nombre);
          break;
      }

      return {
        ...app,
        nombre: newName
      };
    });
  }, [apprentices, selectedFormat]);

  // If also sorting
  const finalPreview = useMemo(() => {
    if (!alsoSortAfter) return transformedPreview;

    const mode: NameSortMode =
      selectedFormat === 'FIRST_NAMES_FIRST'
        ? sortOrder === 'ASC'
          ? 'NOMBRES_ASC'
          : 'NOMBRES_DESC'
        : sortOrder === 'ASC'
        ? 'APELLIDOS_ASC'
        : 'APELLIDOS_DESC';

    return sortApprenticesByNameMode(
      transformedPreview,
      mode,
      selectedFormat === 'FIRST_NAMES_FIRST' ? 'NOMBRES_APELLIDOS' : 'APELLIDOS_NOMBRES'
    );
  }, [transformedPreview, alsoSortAfter, selectedFormat, sortOrder]);

  if (!isOpen) return null;

  const handleApply = () => {
    let desc = '';
    if (selectedFormat === 'LAST_NAMES_FIRST') desc = 'Iniciando por Apellidos (Apellidos Nombres)';
    else if (selectedFormat === 'LAST_NAMES_COMMA') desc = 'Iniciando por Apellidos con Coma (Apellidos, Nombres)';
    else if (selectedFormat === 'FIRST_NAMES_FIRST') desc = 'Iniciando por Nombres (Nombres Apellidos)';
    else desc = 'Partes de nombre invertidas';

    if (alsoSortAfter) {
      desc += ` y ordenados alfabéticamente (${sortOrder === 'ASC' ? 'A → Z' : 'Z → A'})`;
    }

    onApplyTransformation(finalPreview, `Se transformaron los nombres de ${apprentices.length} aprendices: ${desc}.`);
    onClose();
  };

  const sampleItems = apprentices.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border-2 border-black max-w-2xl w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
              <ArrowUpDown className="h-5 w-5 text-black" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-black">
                Organizar Estructura y Orden de Nombres
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Estandarice si los aprendices inician por <strong className="text-black">Apellidos</strong> o por <strong className="text-black">Nombres</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-black hover:bg-black hover:text-white p-1 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 overflow-y-auto space-y-5 flex-1 pr-1">
          {/* Format Options Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
              Seleccione el formato deseado para los nombres:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Last Names First */}
              <button
                type="button"
                onClick={() => setSelectedFormat('LAST_NAMES_FIRST')}
                className={`p-3 text-left border-2 border-black transition ${
                  selectedFormat === 'LAST_NAMES_FIRST'
                    ? 'bg-emerald-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase text-black">
                    Apellidos Nombres
                  </span>
                  {selectedFormat === 'LAST_NAMES_FIRST' && <Check className="h-4 w-4 text-black" />}
                </div>
                <div className="text-[11px] text-slate-700 font-mono">
                  Ej: <span className="font-bold text-black">Pérez Gómez</span> Juan Carlos
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium">
                  Recomendado para listados y planillas oficiales SENA
                </div>
              </button>

              {/* Option 2: First Names First */}
              <button
                type="button"
                onClick={() => setSelectedFormat('FIRST_NAMES_FIRST')}
                className={`p-3 text-left border-2 border-black transition ${
                  selectedFormat === 'FIRST_NAMES_FIRST'
                    ? 'bg-emerald-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase text-black">
                    Nombres Apellidos
                  </span>
                  {selectedFormat === 'FIRST_NAMES_FIRST' && <Check className="h-4 w-4 text-black" />}
                </div>
                <div className="text-[11px] text-slate-700 font-mono">
                  Ej: <span className="font-bold text-black">Juan Carlos</span> Pérez Gómez
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium">
                  Orden natural convencional de lectura
                </div>
              </button>

              {/* Option 3: Last Names with Comma */}
              <button
                type="button"
                onClick={() => setSelectedFormat('LAST_NAMES_COMMA')}
                className={`p-3 text-left border-2 border-black transition ${
                  selectedFormat === 'LAST_NAMES_COMMA'
                    ? 'bg-emerald-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase text-black">
                    Apellidos, Nombres (con coma)
                  </span>
                  {selectedFormat === 'LAST_NAMES_COMMA' && <Check className="h-4 w-4 text-black" />}
                </div>
                <div className="text-[11px] text-slate-700 font-mono">
                  Ej: <span className="font-bold text-black">Pérez Gómez,</span> Juan Carlos
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium">
                  Separa claramente los apellidos de los nombres de pila
                </div>
              </button>

              {/* Option 4: Swap / Invert */}
              <button
                type="button"
                onClick={() => setSelectedFormat('INVERT_SWAP')}
                className={`p-3 text-left border-2 border-black transition ${
                  selectedFormat === 'INVERT_SWAP'
                    ? 'bg-emerald-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase text-black">
                    Invertir Mitad y Mitad (Swap)
                  </span>
                  {selectedFormat === 'INVERT_SWAP' && <Check className="h-4 w-4 text-black" />}
                </div>
                <div className="text-[11px] text-slate-700 font-mono">
                  Intercambia primera y segunda parte
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium">
                  Útil para corregir listados importados al revés
                </div>
              </button>
            </div>
          </div>

          {/* Sorting Options Checkbox */}
          <div className="bg-slate-50 border-2 border-black p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={alsoSortAfter}
                onChange={(e) => setAlsoSortAfter(e.target.checked)}
                className="h-4 w-4 text-black border-2 border-black rounded-none focus:ring-0"
              />
              <span className="text-xs font-black uppercase text-black">
                Reorganizar la lista alfabéticamente al aplicar
              </span>
            </label>

            {alsoSortAfter && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSortOrder('ASC')}
                  className={`px-2.5 py-1 text-[11px] font-black uppercase border-2 border-black transition ${
                    sortOrder === 'ASC' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-200'
                  }`}
                >
                  A → Z
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('DESC')}
                  className={`px-2.5 py-1 text-[11px] font-black uppercase border-2 border-black transition ${
                    sortOrder === 'DESC' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-200'
                  }`}
                >
                  Z → A
                </button>
              </div>
            )}
          </div>

          {/* Live Preview Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Previsualización en Vivo ({Math.min(5, apprentices.length)} de {apprentices.length} aprendices):
              </span>
            </div>

            <div className="border-2 border-black bg-white overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-black text-[10px] font-black uppercase">
                    <th className="p-2 border-r border-black w-1/2">Nombre Actual (Original)</th>
                    <th className="p-2 w-1/2 bg-emerald-50 text-emerald-950">Nuevo Formato Transformado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {sampleItems.map((app, idx) => {
                    const transformed = finalPreview.find((f) => f.id === app.id) || app;
                    return (
                      <tr key={app.id || idx} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-300 text-slate-700 font-mono text-[11px]">
                          {app.nombre}
                        </td>
                        <td className="p-2 bg-emerald-50/50 font-bold text-black font-mono text-[11px]">
                          {transformed.nombre}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t-2 border-black pt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-black uppercase text-black bg-white hover:bg-slate-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Aplicar a los {apprentices.length} Aprendices</span>
          </button>
        </div>
      </div>
    </div>
  );
};
