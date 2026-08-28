import React, { useRef, useState } from 'react';
import { GeneralInfo, SignatureConfig } from '../types';
import { Plus, Trash2, PenTool, Check, ArrowRight, ShieldAlert, Upload, Image as ImageIcon, CheckCircle2, RotateCcw, Calendar, Clock, Target, BookOpen, FileCheck2, FileText } from 'lucide-react';
import { SenaLogo } from './SenaLogo';

interface GeneralInfoFormProps {
  generalInfo: GeneralInfo;
  setGeneralInfo: React.Dispatch<React.SetStateAction<GeneralInfo>>;
  signatureConfig: SignatureConfig;
  setSignatureConfig?: React.Dispatch<React.SetStateAction<SignatureConfig>>;
  onOpenSignatureModal: () => void;
  onContinue: () => void;
}

const MOTIVO_PRESETS = [
  'No cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n6. Cumplir con todas las actividades de su proceso formativo, presentando las evidencias según la planeación pedagógica, guías de aprendizaje y cronograma, en los plazos o en la oportunidad que estas deban presentarse o reportarse, a través de los medios dispuestos para ello.',
  'Incumplimiento en la presentación de evidencias solicitadas en el plazo establecido.',
  'Bajo rendimiento académico y retraso reiterado en la entrega de actividades de aprendizaje.',
  'Inasistencia injustificada y no presentación de evidencias requeridas para la competencia.',
  'Falta de participación en las sesiones sincrónicas y no entrega de los talleres correspondientes.'
];

const PLAN_ACCIONES_PRESETS = [
  'El aprendiz deberá desarrollar y entregar la totalidad de las evidencias identificadas como NO o en estado de corrección en este documento, atendiendo a los criterios de evaluación y especificaciones contempladas en la plataforma de Google Classroom.',
  'El aprendiz deberá desarrollar y entregar la totalidad de las evidencias identificadas como NO o en estado de corrección en este documento, atendiendo a los criterios de evaluación y especificaciones de la guía de aprendizaje en la plataforma institucional.',
  'Presentar las evidencias pendientes, asistir a sesiones de asesoría y sustentación sincrónica con el instructor para validar la apropiación de conocimientos del Resultado de Aprendizaje.',
  'Elaborar taller de nivelación y corrección de las actividades no superadas, realizando la entrega a través del espacio habilitado en plataforma y participando en la retroalimentación técnica.',
  'Cumplir con las actividades complementarias acordadas y presentar sustentación oral o práctica de los temas correspondientes a la competencia formativa.'
];

const PLAN_COMPROMISO_PRESETS = [
  'El aprendiz se compromete a cumplir a cabalidad con las actividades concertadas en las fechas indicadas. El incumplimiento injustificado dará lugar al traslado del caso al Comité de Evaluación y Seguimiento según el Reglamento del Aprendiz SENA.',
  'Me comprometo a entregar las actividades asignadas en las fechas límites y solicitar asesoría oportuna al instructor en caso de dudas sobre los criterios de evaluación.',
  'El no cumplimiento de este plan de mejoramiento acarreará las medidas académicas y disciplinarias estipuladas en el reglamento del aprendiz del Servicio Nacional de Aprendizaje SENA.'
];

export const GeneralInfoForm: React.FC<GeneralInfoFormProps> = ({
  generalInfo,
  setGeneralInfo,
  signatureConfig,
  setSignatureConfig,
  onOpenSignatureModal,
  onContinue
}) => {
  const directSignatureInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const handleChange = (field: keyof GeneralInfo, value: any) => {
    setGeneralInfo((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setGeneralInfo((prev) => ({
        ...prev,
        senaLogoUrl: dataUrl
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleLogoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoFileUpload(file);
    }
  };

  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLogoFileUpload(file);
    }
  };

  const handleResetLogo = () => {
    setGeneralInfo((prev) => ({
      ...prev,
      senaLogoUrl: undefined
    }));
  };

  const handleDirectSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor seleccione un archivo de imagen válido (PNG, JPG, WEBP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (setSignatureConfig) {
          setSignatureConfig((prev) => ({
            ...prev,
            instructorSignatureType: 'upload',
            instructorSignatureData: dataUrl
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSignature = () => {
    if (setSignatureConfig) {
      setSignatureConfig((prev) => ({
        ...prev,
        instructorSignatureType: 'text',
        instructorSignatureData: undefined
      }));
    }
  };

  const handleAddRAP = () => {
    const nextNum = generalInfo.resultadosAprendizaje.length + 1;
    setGeneralInfo((prev) => ({
      ...prev,
      resultadosAprendizaje: [
        ...prev.resultadosAprendizaje,
        `RAP${nextNum} RESULTADO DE APRENDIZAJE CORRESPONDIENTE A LA ACTIVIDAD`
      ]
    }));
  };

  const handleSetTodayDelivery = () => {
    const today = new Date().toISOString().split('T')[0];
    handleChange('fechaEntregaLlamado', today);
  };

  const handleSetDeadlineDays = (days: number) => {
    const baseDate = generalInfo.fechaEntregaLlamado ? new Date(generalInfo.fechaEntregaLlamado) : new Date();
    const deadline = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    const deadlineStr = deadline.toISOString().split('T')[0];
    handleChange('fechaLimiteEvidencias', deadlineStr);
  };

  const handleSetPlanDeadlineDays = (days: number) => {
    const baseDate = generalInfo.fechaEntregaLlamado ? new Date(generalInfo.fechaEntregaLlamado) : new Date();
    const deadline = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    const deadlineStr = deadline.toISOString().split('T')[0];
    handleChange('planMejoramientoFechaLimite', deadlineStr);
  };

  const handleRemoveRAP = (index: number) => {
    setGeneralInfo((prev) => ({
      ...prev,
      resultadosAprendizaje: prev.resultadosAprendizaje.filter((_, i) => i !== index)
    }));
  };

  const handleRAPChange = (index: number, val: string) => {
    setGeneralInfo((prev) => {
      const next = [...prev.resultadosAprendizaje];
      next[index] = val;
      return {
        ...prev,
        resultadosAprendizaje: next
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 block mb-1">
            Paso 1 de 4 • Parámetros Generales
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black">
            Datos del Programa & Ficha Académica
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl font-medium">
            Configure la información estructural del programa formativo, competencias técnicas y el motivo que encabezará todos los llamados de atención.
          </p>
        </div>
        <button
          id="gen-info-continue-top-btn"
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all shrink-0"
        >
          <span>Siguiente: Evidencias</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Area (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Datos de la Ficha y Programa */}
          <div className="bg-white border-2 border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-5">
              <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-2">
                <span className="w-3 h-3 bg-black"></span>
                Identificación del Programa y Ficha
              </h3>
              <span className="text-[10px] font-mono font-bold bg-slate-100 border border-black px-2 py-0.5 uppercase">
                Campos Obligatorios (*)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                  Nombre del Programa de Formación <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-programa"
                  type="text"
                  value={generalInfo.programa}
                  onChange={(e) => handleChange('programa', e.target.value)}
                  placeholder="Ej: Desarrollo de videojuegos y entornos interactivos"
                  className="w-full p-3 text-sm font-semibold bg-slate-50 border-2 border-black focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                  Número de Ficha <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-codigo-ficha"
                  type="text"
                  value={generalInfo.codigoFicha}
                  onChange={(e) => handleChange('codigoFicha', e.target.value)}
                  placeholder="Ej: 3466175"
                  className="w-full p-3 text-sm font-mono font-black bg-slate-50 border-2 border-black focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                  Centro de Formación
                </label>
                <input
                  id="input-centro-formacion"
                  type="text"
                  value={generalInfo.centroFormacion || ''}
                  onChange={(e) => handleChange('centroFormacion', e.target.value)}
                  placeholder="Ej: Centro de Comercio y Servicios Regional Tolima"
                  className="w-full p-3 text-sm font-semibold bg-slate-50 border-2 border-black focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                  Modalidad
                </label>
                <input
                  id="input-modalidad"
                  type="text"
                  value={generalInfo.modalidad || ''}
                  onChange={(e) => handleChange('modalidad', e.target.value)}
                  placeholder="Ej: Virtual, Presencial"
                  className="w-full p-3 text-sm font-semibold bg-slate-50 border-2 border-black focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                  Instructor asignado a la ficha académica <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-instructor-asignado"
                  type="text"
                  value={generalInfo.nombreInstructorAsignado}
                  onChange={(e) => {
                    handleChange('nombreInstructorAsignado', e.target.value);
                    if (!generalInfo.nombreInstructorLlamado || generalInfo.nombreInstructorLlamado === generalInfo.nombreInstructorAsignado) {
                      handleChange('nombreInstructorLlamado', e.target.value);
                    }
                  }}
                  placeholder="Ej: Andres Arturo Huertas Carreño"
                  className="w-full p-3 text-sm font-semibold bg-slate-50 border-2 border-black focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* Transversal / Componente */}
              <div className="sm:col-span-3 bg-emerald-50/50 p-3.5 border-2 border-black">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-700" />
                    Transversal / Componente Formativo
                  </label>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">
                    Aparece debajo de Instructor Asignado
                  </span>
                </div>
                <input
                  id="input-transversal"
                  type="text"
                  value={generalInfo.transversal ?? 'Transversal Inglés'}
                  onChange={(e) => handleChange('transversal', e.target.value)}
                  placeholder="Ej: Transversal Inglés"
                  className="w-full p-2.5 text-sm font-bold bg-white border-2 border-black focus:outline-none transition-all mb-2"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9.5px] font-black text-slate-600 uppercase">Opciones rápidas:</span>
                  {[
                    'Transversal Inglés',
                    'Transversal Ética',
                    'Transversal TIC',
                    'Transversal Comunicación',
                    'Transversal Emprendimiento',
                    'Competencia Técnica'
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleChange('transversal', option)}
                      className={`text-[10px] font-bold px-2 py-1 border border-black transition-all ${
                        (generalInfo.transversal || 'Transversal Inglés') === option
                          ? 'bg-emerald-400 text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                  Instructor que emite el llamado de atención <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-instructor-llamado"
                  type="text"
                  value={generalInfo.nombreInstructorLlamado}
                  onChange={(e) => handleChange('nombreInstructorLlamado', e.target.value)}
                  placeholder="Ej: Andres Arturo Huertas Carreño"
                  className="w-full p-3 text-sm font-semibold bg-slate-50 border-2 border-black focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* Fechas y Plazos */}
              <div className="sm:col-span-3 border-t-2 border-slate-200 pt-4 mt-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3">
                  Fechas y Plazos de Entrega Institucionales
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fecha de Entrega del Llamado */}
                  <div className="bg-slate-50 border-2 border-black p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                        Fecha de Entrega del Llamado
                      </label>
                      <button
                        type="button"
                        onClick={handleSetTodayDelivery}
                        className="text-[9.5px] font-bold uppercase bg-white hover:bg-slate-100 border border-black px-2 py-0.5"
                      >
                        Hoy
                      </button>
                    </div>
                    <input
                      id="input-fecha-entrega-llamado"
                      type="date"
                      value={generalInfo.fechaEntregaLlamado || ''}
                      onChange={(e) => handleChange('fechaEntregaLlamado', e.target.value)}
                      className="w-full p-2.5 text-xs font-semibold bg-white border border-slate-400 focus:border-black focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 font-medium">
                      Fecha en que se notifica y entrega el llamado al aprendiz.
                    </p>
                  </div>

                  {/* Fecha Límite / Plazo de Evidencias */}
                  <div className="bg-slate-50 border-2 border-black p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        Fecha Límite / Plazo de Evidencias
                      </label>
                    </div>
                    <input
                      id="input-fecha-limite-evidencias"
                      type="date"
                      value={generalInfo.fechaLimiteEvidencias || ''}
                      onChange={(e) => handleChange('fechaLimiteEvidencias', e.target.value)}
                      className="w-full p-2.5 text-xs font-semibold bg-white border border-slate-400 focus:border-black focus:outline-none"
                    />
                    {/* Quick days selector */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase">Plazo:</span>
                      {[3, 5, 7, 10, 15].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleSetDeadlineDays(days)}
                          className="text-[9.5px] font-bold px-1.5 py-0.5 bg-white hover:bg-emerald-300 border border-black transition-all"
                          title={`Fijar fecha a +${days} días`}
                        >
                          +{days}d
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Competencia y Resultados de Aprendizaje */}
          <div className="bg-white border-2 border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-5">
              <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-2">
                <span className="w-3 h-3 bg-black"></span>
                Competencia & Resultados de Aprendizaje (RAPs)
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                  Competencia Técnica a Evaluar <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="input-competencia"
                  rows={2}
                  value={generalInfo.competencia}
                  onChange={(e) => handleChange('competencia', e.target.value)}
                  placeholder="Ej: Interactuar en lengua inglesa de forma oral y escrita..."
                  className="w-full p-3 text-sm font-medium bg-slate-50 border-2 border-black focus:bg-white focus:outline-none resize-y transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800">
                    Resultados de Aprendizaje Vinculados ({generalInfo.resultadosAprendizaje.length})
                  </label>
                  <button
                    id="add-rap-btn"
                    type="button"
                    onClick={handleAddRAP}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black bg-white hover:bg-slate-100 px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + AGREGAR RAP
                  </button>
                </div>

                <div className="space-y-3">
                  {generalInfo.resultadosAprendizaje.map((ra, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 border-2 border-black">
                      <div className="px-2.5 py-1.5 bg-black text-white text-xs font-mono font-black shrink-0">
                        RAP{idx + 1}
                      </div>
                      <textarea
                        id={`input-rap-${idx}`}
                        rows={2}
                        value={ra}
                        onChange={(e) => handleRAPChange(idx, e.target.value)}
                        placeholder={`Descripción del Resultado de Aprendizaje ${idx + 1}...`}
                        className="w-full p-2 text-xs font-medium bg-white border border-slate-300 focus:border-black focus:outline-none resize-y"
                      />
                      {generalInfo.resultadosAprendizaje.length > 1 && (
                        <button
                          id={`remove-rap-${idx}-btn`}
                          type="button"
                          onClick={() => handleRemoveRAP(idx)}
                          className="p-2 text-black hover:bg-rose-500 hover:text-white border border-transparent hover:border-black transition-all shrink-0"
                          title="Eliminar este RAP"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Motivo del Llamado de Atención */}
          <div className="bg-white border-2 border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-5">
              <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-2">
                <span className="w-3 h-3 bg-black"></span>
                Motivo del Llamado de Atención
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                  Texto del Motivo Institucional <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="input-motivo"
                  rows={4}
                  value={generalInfo.motivo}
                  onChange={(e) => handleChange('motivo', e.target.value)}
                  placeholder="Ej: Incumplimiento en la presentación de evidencias solicitadas en el plazo establecido."
                  className="w-full p-3 text-sm font-medium bg-slate-50 border-2 border-black focus:bg-white focus:outline-none resize-y transition-all"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Plantillas Rápidas de Motivo (Haga clic para aplicar):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MOTIVO_PRESETS.map((preset, idx) => {
                    const isSelected = generalInfo.motivo === preset;
                    const isOfficialSenaRule = preset.includes('Artículo 8o');
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleChange('motivo', preset)}
                        className={`text-left text-xs font-semibold p-3 border-2 border-black transition-all whitespace-pre-line ${
                          isOfficialSenaRule ? 'sm:col-span-2' : ''
                        } ${
                          isSelected
                            ? 'bg-emerald-400 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-bold'
                            : 'bg-white hover:bg-emerald-100 text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                        }`}
                      >
                        {isOfficialSenaRule && (
                          <span className="inline-flex items-center gap-1 bg-black text-emerald-300 text-[9px] font-black uppercase px-2 py-0.5 mb-1.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)]">
                            <ShieldAlert className="h-3 w-3 text-amber-400" />
                            Reglamento del Aprendiz SENA • Cap. III Art. 8 (Deberes)
                          </span>
                        )}
                        <div className="leading-snug">{preset}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Plan de Mejoramiento (SENA) */}
          <div className="bg-white border-2 border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-black pb-3 mb-5 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 border border-black"></span>
                <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-600" />
                  Plan de Mejoramiento Concertado
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="toggle-plan-mejoramiento-btn"
                  type="button"
                  onClick={() => handleChange('planMejoramientoActivo', !(generalInfo.planMejoramientoActivo ?? true))}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all flex items-center gap-1.5 ${
                    (generalInfo.planMejoramientoActivo ?? true)
                      ? 'bg-emerald-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {(generalInfo.planMejoramientoActivo ?? true) ? 'Plan Activo en Documento' : 'Plan Desactivado'}
                </button>
              </div>
            </div>

            {(generalInfo.planMejoramientoActivo ?? true) ? (
              <div className="space-y-5">
                {/* Tipo de Plan y Plazo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/60 p-4 border-2 border-black">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1.5">
                      Tipo de Plan de Mejoramiento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="plan-tipo-academico-btn"
                        type="button"
                        onClick={() => handleChange('planMejoramientoTipo', 'Académico')}
                        className={`py-2 px-3 text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                          (generalInfo.planMejoramientoTipo || 'Académico') === 'Académico'
                            ? 'bg-emerald-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Académico
                      </button>
                      <button
                        id="plan-tipo-disciplinario-btn"
                        type="button"
                        onClick={() => handleChange('planMejoramientoTipo', 'Disciplinario')}
                        className={`py-2 px-3 text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                          generalInfo.planMejoramientoTipo === 'Disciplinario'
                            ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Disciplinario
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-700" />
                        Fecha Límite / Plazo del Plan
                      </label>
                    </div>
                    <input
                      id="input-plan-fecha-limite"
                      type="date"
                      value={generalInfo.planMejoramientoFechaLimite || generalInfo.fechaLimiteEvidencias || ''}
                      onChange={(e) => handleChange('planMejoramientoFechaLimite', e.target.value)}
                      className="w-full p-2.5 text-xs font-semibold bg-white border-2 border-black focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5 pt-1.5">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase">Fijar Plazo:</span>
                      {[3, 5, 7, 10, 15].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleSetPlanDeadlineDays(days)}
                          className="text-[9.5px] font-bold px-1.5 py-0.5 bg-white hover:bg-emerald-300 border border-black transition-all"
                          title={`Fijar fecha a +${days} días`}
                        >
                          +{days}d
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Acciones y Actividades a Desarrollar */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                    Acciones y Actividades a Desarrollar por el Aprendiz <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    id="input-plan-descripcion"
                    rows={3}
                    value={generalInfo.planMejoramientoDescripcion || ''}
                    onChange={(e) => handleChange('planMejoramientoDescripcion', e.target.value)}
                    placeholder="Especifique las actividades de mejoramiento, entrega de evidencias pendientes, talleres y sustentación..."
                    className="w-full p-3 text-sm font-medium bg-slate-50 border-2 border-black focus:bg-white focus:outline-none resize-y transition-all"
                  />

                  {/* Acciones Quick Presets */}
                  <div className="mt-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Plantillas Rápidas de Acciones (Haga clic para aplicar):
                    </span>
                    <div className="space-y-2">
                      {PLAN_ACCIONES_PRESETS.map((preset, idx) => {
                        const isSelected = (generalInfo.planMejoramientoDescripcion || '') === preset;
                        const isClassroom = preset.toLowerCase().includes('google classroom');
                        const isSenaPlatform = preset.toLowerCase().includes('plataforma institucional');
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleChange('planMejoramientoDescripcion', preset)}
                            className={`w-full text-left text-xs p-2.5 border-2 border-black transition-all block ${
                              isSelected
                                ? 'bg-emerald-400 text-black font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white hover:bg-emerald-100 text-slate-800 font-semibold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px]'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {isClassroom && (
                                <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                  Google Classroom
                                </span>
                              )}
                              {isSenaPlatform && (
                                <span className="bg-slate-200 text-slate-800 text-[9px] font-black uppercase px-2 py-0.5 border border-black">
                                  Plataforma Institucional SENA
                                </span>
                              )}
                              {isSelected && (
                                <span className="bg-black text-emerald-300 text-[9px] font-black uppercase px-1.5 py-0.5 border border-black ml-auto">
                                  Seleccionada
                                </span>
                              )}
                            </div>
                            <div className="leading-snug">
                              • {preset}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Compromiso Institucional y Reglamento SENA */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                    Cláusula de Compromiso y Consecuencias Institucionales
                  </label>
                  <textarea
                    id="input-plan-compromiso"
                    rows={2}
                    value={generalInfo.planMejoramientoCompromiso || ''}
                    onChange={(e) => handleChange('planMejoramientoCompromiso', e.target.value)}
                    placeholder="Cláusula de compromiso del aprendiz y consecuencia de remitir a Comité de Evaluación y Seguimiento..."
                    className="w-full p-2.5 text-xs font-medium bg-slate-50 border-2 border-black focus:bg-white focus:outline-none resize-y transition-all"
                  />

                  {/* Compromiso Presets */}
                  <div className="mt-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Cláusulas Institucionales de Ejemplo:
                    </span>
                    <div className="space-y-1">
                      {PLAN_COMPROMISO_PRESETS.map((clause, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleChange('planMejoramientoCompromiso', clause)}
                          className="w-full text-left text-[11px] text-slate-700 bg-slate-50 hover:bg-emerald-100 p-1.5 border border-slate-300 hover:border-black transition-all block"
                        >
                          {clause}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  El Plan de Mejoramiento está temporalmente desactivado para este llamado de atención. Puede reactivarlo pulsando el botón superior.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel: Logo SENA, Juicio, Firmas y Ajustes (1 col) */}
        <div className="space-y-6">
          {/* Card: Logo Institucional SENA */}
          <div className="bg-white border-2 border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-emerald-600" />
                Logo del SENA
              </h3>
              {generalInfo.senaLogoUrl ? (
                <span className="text-[9px] font-black uppercase tracking-wider text-black bg-amber-300 border border-black px-1.5 py-0.5">
                  Personalizado
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider text-black bg-emerald-300 border border-black px-1.5 py-0.5">
                  Oficial Vector
                </span>
              )}
            </div>

            <input
              ref={logoInputRef}
              id="sena-logo-file-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={handleLogoInputChange}
              className="hidden"
            />

            {/* Logo Preview & Drag Drop Target */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingLogo(true);
              }}
              onDragLeave={() => setIsDraggingLogo(false)}
              onDrop={handleLogoDrop}
              onClick={() => logoInputRef.current?.click()}
              className={`p-4 border-2 border-dashed text-center mb-3 cursor-pointer transition-all ${
                isDraggingLogo
                  ? 'border-emerald-600 bg-emerald-50 scale-[1.02]'
                  : 'border-black bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex flex-col items-center justify-center min-h-20">
                {generalInfo.senaLogoUrl ? (
                  <div className="bg-white p-2 border border-slate-300 max-w-full flex items-center justify-center shadow-sm">
                    <img
                      src={generalInfo.senaLogoUrl}
                      alt="Logo cargado"
                      className="max-h-16 max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-1">
                    <SenaLogo className="h-14 w-auto" />
                  </div>
                )}
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-2">
                  Arrastre una imagen o haga clic para cambiar
                </span>
              </div>
            </div>

            {/* Buttons for Logo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                id="upload-sena-logo-btn"
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="p-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Cargar Logo
              </button>

              {generalInfo.senaLogoUrl ? (
                <button
                  id="reset-sena-logo-btn"
                  type="button"
                  onClick={handleResetLogo}
                  className="p-2.5 text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-100 hover:bg-rose-200 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restablecer
                </button>
              ) : (
                <div className="p-2.5 text-[10px] font-bold text-center text-slate-600 bg-slate-100 border border-slate-300 flex items-center justify-center">
                  Logo oficial activo
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center font-medium">
              Aparece en el encabezado del documento oficial y en los PDF generados.
            </p>
          </div>

          {/* Card: Firma del Instructor */}
          <div className="bg-white border-2 border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <PenTool className="h-4 w-4 text-emerald-600" />
                Firma del Instructor
              </h3>
              <button
                id="open-signature-modal-btn"
                type="button"
                onClick={onOpenSignatureModal}
                className="text-[10px] font-black uppercase tracking-wider text-black bg-slate-100 hover:bg-slate-200 border border-black px-2 py-1 flex items-center gap-1 transition-all"
              >
                <PenTool className="h-3 w-3" />
                Opciones
              </button>
            </div>

            <input
              ref={directSignatureInputRef}
              id="direct-signature-file-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleDirectSignatureUpload}
              className="hidden"
            />

            <div className="p-4 bg-slate-50 border-2 border-dashed border-black text-center mb-3">
              {signatureConfig.instructorSignatureData ? (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-2 border border-slate-300 w-full flex items-center justify-center min-h-16 mb-2">
                    <img
                      src={signatureConfig.instructorSignatureData}
                      alt="Firma configurada"
                      className="max-h-16 max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-black bg-emerald-400 px-2 py-0.5 border border-black flex items-center gap-1">
                      <Check className="h-3 w-3" /> Imagen de Firma Cargada
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveSignature}
                      className="text-[10px] font-black uppercase text-rose-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : signatureConfig.instructorSignatureType === 'text' ? (
                <div className="py-2">
                  <p className="font-serif italic text-lg text-slate-900 font-bold">
                    {signatureConfig.instructorName || generalInfo.nombreInstructorLlamado || 'Firma Instructor'}
                  </p>
                  <span className="text-[10px] font-black uppercase text-slate-500 mt-1 block tracking-wider">
                    Estilo Tipográfico Caligráfico
                  </span>
                </div>
              ) : (
                <div className="py-3 text-slate-500 font-bold text-xs">
                  Sin firma gráfica cargada
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="direct-upload-signature-btn"
                type="button"
                onClick={() => directSignatureInputRef.current?.click()}
                className="p-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Subir Imagen
              </button>

              <button
                id="change-signature-action-btn"
                type="button"
                onClick={onOpenSignatureModal}
                className="p-2.5 text-xs font-black uppercase tracking-wider text-black bg-white hover:bg-slate-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
              >
                <PenTool className="h-3.5 w-3.5" />
                Dibujar / Más
              </button>
            </div>
          </div>

          {/* Card: Juicio de Evaluación */}
          <div className="bg-white border-2 border-black p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-sm font-black uppercase tracking-wider text-black border-b-2 border-black pb-3 mb-4">
              Juicio del Resultado(s)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                  Texto Condición de Juicio:
                </label>
                <textarea
                  id="input-juicio-texto"
                  rows={2}
                  value={generalInfo.juicioTexto}
                  onChange={(e) => handleChange('juicioTexto', e.target.value)}
                  className="w-full p-2.5 text-xs font-medium bg-slate-50 border-2 border-black focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-2">
                  Juicio por defecto en documentos:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="juicio-no-aprobo-btn"
                    type="button"
                    onClick={() => handleChange('juicioResultado', 'NO_APROBO')}
                    className={`py-3 px-3 text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                      generalInfo.juicioResultado === 'NO_APROBO'
                        ? 'bg-rose-400 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-slate-600 hover:bg-slate-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    NO APROBÓ (x)
                  </button>
                  <button
                    id="juicio-aprobo-btn"
                    type="button"
                    onClick={() => handleChange('juicioResultado', 'APROBO')}
                    className={`py-3 px-3 text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                      generalInfo.juicioResultado === 'APROBO'
                        ? 'bg-emerald-400 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-slate-600 hover:bg-slate-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    APROBÓ (x)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Continue button */}
          <button
            id="gen-info-continue-bottom-btn"
            type="button"
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <span>Paso 2: Gestionar Evidencias</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
