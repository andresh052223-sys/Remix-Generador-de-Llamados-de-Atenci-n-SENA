import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, Upload, Type, PenTool, Image, Trash2, CheckCircle2 } from 'lucide-react';
import { SignatureConfig } from '../types';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatureConfig: SignatureConfig;
  onSave: (config: SignatureConfig) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  signatureConfig,
  onSave
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'draw' | 'text'>(
    signatureConfig.instructorSignatureType === 'drawn'
      ? 'draw'
      : signatureConfig.instructorSignatureType === 'text'
      ? 'text'
      : 'upload'
  );

  const [instructorName, setInstructorName] = useState(signatureConfig.instructorName);
  const [uploadedImage, setUploadedImage] = useState<string | undefined>(signatureConfig.instructorSignatureData);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInstructorName(signatureConfig.instructorName);
      setUploadedImage(signatureConfig.instructorSignatureData);
      if (signatureConfig.instructorSignatureType === 'drawn') {
        setActiveMode('draw');
      } else if (signatureConfig.instructorSignatureType === 'text') {
        setActiveMode('text');
      } else {
        setActiveMode('upload');
      }
    }
  }, [isOpen, signatureConfig]);

  useEffect(() => {
    if (isOpen && activeMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen, activeMode]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen válido (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSave = () => {
    if (activeMode === 'upload') {
      onSave({
        ...signatureConfig,
        instructorName,
        instructorSignatureType: uploadedImage ? 'upload' : 'text',
        instructorSignatureData: uploadedImage
      });
    } else if (activeMode === 'draw') {
      const canvas = canvasRef.current;
      const dataUrl = hasDrawn && canvas ? canvas.toDataURL('image/png') : undefined;
      onSave({
        ...signatureConfig,
        instructorName,
        instructorSignatureType: hasDrawn ? 'drawn' : 'text',
        instructorSignatureData: dataUrl
      });
    } else {
      onSave({
        ...signatureConfig,
        instructorName,
        instructorSignatureType: 'text',
        instructorSignatureData: undefined
      });
    }
    onClose();
  };

  return (
    <div
      id="signature-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="signature-modal-card"
        className="w-full max-w-lg bg-white p-6 border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-400 border-2 border-black">
              <PenTool className="h-5 w-5 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black">
                Firma del Instructor
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Cargue la imagen de su firma para que aparezca en el documento
              </p>
            </div>
          </div>
          <button
            id="close-sig-modal-btn"
            onClick={onClose}
            className="p-1 text-black bg-white hover:bg-black hover:text-white border-2 border-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-2 mb-4 border-2 border-black bg-slate-100 p-1">
          <button
            id="sig-mode-upload"
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-wider transition ${
              activeMode === 'upload'
                ? 'bg-emerald-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-black hover:bg-slate-200'
            }`}
          >
            <Upload className="h-4 w-4" />
            Subir Imagen
          </button>
          <button
            id="sig-mode-draw"
            type="button"
            onClick={() => setActiveMode('draw')}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-wider transition ${
              activeMode === 'draw'
                ? 'bg-emerald-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-black hover:bg-slate-200'
            }`}
          >
            <PenTool className="h-4 w-4" />
            Dibujar
          </button>
          <button
            id="sig-mode-text"
            type="button"
            onClick={() => setActiveMode('text')}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-wider transition ${
              activeMode === 'text'
                ? 'bg-emerald-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-black hover:bg-slate-200'
            }`}
          >
            <Type className="h-4 w-4" />
            Digital
          </button>
        </div>

        {/* Instructor Name Input */}
        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1">
            Nombre del Instructor (bajo la línea de firma):
          </label>
          <input
            id="sig-instructor-name-input"
            type="text"
            value={instructorName}
            onChange={(e) => setInstructorName(e.target.value)}
            placeholder="Ej: Andrés Arturo Huertas Carreño"
            className="w-full p-2 text-xs font-bold border-2 border-black bg-slate-50 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Mode Contents */}
        <div className="space-y-4 mb-6">
          {/* UPLOAD MODE */}
          {activeMode === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                id="sig-file-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />

              {!uploadedImage ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-black bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="p-3 bg-white border-2 border-black">
                    <Upload className="h-6 w-6 text-black" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-black block">
                      Haga clic o arrastre la imagen de su firma aquí
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                      Soporta PNG con transparencia o JPG (resolución clara recomendada)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mt-2 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 border-2 border-black"
                  >
                    Seleccionar Imagen
                  </button>
                </div>
              ) : (
                <div className="border-2 border-black p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Imagen de Firma Lista
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadedImage(undefined)}
                      className="flex items-center gap-1 text-[11px] font-black uppercase text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar / Cambiar
                    </button>
                  </div>

                  <div className="bg-white border-2 border-dashed border-slate-300 p-4 flex items-center justify-center min-h-24">
                    <img
                      src={uploadedImage}
                      alt="Firma cargada"
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 text-center font-medium">
                    Esta imagen se estampará sobre la línea de "PRIMER LLAMADO INSTRUCTOR" en el PDF vertical y en la vista previa.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* DRAW MODE */}
          {activeMode === 'draw' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-black uppercase">
                  Dibuje su trazo con mouse o pantalla táctil:
                </span>
                <button
                  id="clear-canvas-btn"
                  type="button"
                  onClick={clearCanvas}
                  className="flex items-center gap-1 text-xs font-black uppercase text-rose-600 hover:text-rose-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Limpiar trazo
                </button>
              </div>
              <div className="border-2 border-black bg-white">
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 cursor-crosshair touch-none"
                />
              </div>
            </div>
          )}

          {/* TEXT DIGITAL MODE */}
          {activeMode === 'text' && (
            <div className="border-2 border-dashed border-black p-6 text-center bg-slate-50">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                Firma Digital Tipográfica:
              </p>
              <p className="font-serif italic text-2xl text-blue-900 font-bold tracking-wide select-none">
                {instructorName || 'Nombre del Instructor'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-black">
          <button
            id="cancel-sig-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black uppercase text-black bg-slate-100 hover:bg-slate-200 border-2 border-black transition"
          >
            Cancelar
          </button>
          <button
            id="save-sig-btn"
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-500 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <Check className="h-4 w-4" />
            Guardar Firma
          </button>
        </div>
      </div>
    </div>
  );
};
