import React, { useState, useEffect } from 'react';
import { ActiveTab, Apprentice, EvidenceItem, GeneralInfo, SignatureConfig, ProgramSlotsMap } from './types';
import { INITIAL_SIGNATURE_CONFIG } from './utils/sampleData';
import {
  loadAllProgramSlots,
  saveAllProgramSlots,
  loadActiveSlotNumber,
  saveActiveSlotNumber,
  getDefaultProgramSlots,
  PROGRAM_STORAGE_KEYS
} from './utils/programStorage';
import { Header } from './components/Header';
import { ProgramSelector } from './components/ProgramSelector';
import { GeneralInfoForm } from './components/GeneralInfoForm';
import { EvidenceManager } from './components/EvidenceManager';
import { EvidenceMatrixView } from './components/EvidenceMatrixView';
import { ApprenticeManager } from './components/ApprenticeManager';
import { DocumentPreview } from './components/DocumentPreview';
import { SignatureModal } from './components/SignatureModal';
import { BulkDownloadModal } from './components/BulkDownloadModal';
import { RotateCcw } from 'lucide-react';

export default function App() {
  // 1. Multi-Program Slots State (5 independent programs)
  const [programSlots, setProgramSlots] = useState<ProgramSlotsMap>(() => loadAllProgramSlots());
  const [activeSlotNumber, setActiveSlotNumber] = useState<number>(() => loadActiveSlotNumber());

  // 2. Active Slot Data extraction
  const currentSlot = programSlots[activeSlotNumber] || programSlots[1];
  const generalInfo = currentSlot.generalInfo;
  const evidences = currentSlot.evidences;
  const apprentices = currentSlot.apprentices;

  // 3. State for Signatures (shared across programs for the instructor)
  const [signatureConfig, setSignatureConfig] = useState<SignatureConfig>(() => {
    try {
      const saved = localStorage.getItem(PROGRAM_STORAGE_KEYS.LEGACY_SIGNATURE);
      return saved ? JSON.parse(saved) : INITIAL_SIGNATURE_CONFIG;
    } catch {
      return INITIAL_SIGNATURE_CONFIG;
    }
  });

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');
  const [selectedApprentice, setSelectedApprentice] = useState<Apprentice | null>(() => apprentices[0] || null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isBulkDownloadOpen, setIsBulkDownloadOpen] = useState(false);

  // Sync Signature Config with Local Storage
  useEffect(() => {
    try {
      localStorage.setItem(PROGRAM_STORAGE_KEYS.LEGACY_SIGNATURE, JSON.stringify(signatureConfig));
    } catch {}
  }, [signatureConfig]);

  // Keep selected apprentice synced if list changes or when switching active program slot
  useEffect(() => {
    const currentApprentices = currentSlot?.apprentices || [];
    if (currentApprentices.length > 0) {
      if (!selectedApprentice || !currentApprentices.some((a) => a.id === selectedApprentice.id)) {
        setSelectedApprentice(currentApprentices[0]);
      }
    } else {
      setSelectedApprentice(null);
    }
  }, [activeSlotNumber, currentSlot?.apprentices]);

  // Setters bound directly to the active program slot
  const setGeneralInfo: React.Dispatch<React.SetStateAction<GeneralInfo>> = (action) => {
    setProgramSlots((prev) => {
      const slot = prev[activeSlotNumber] || prev[1];
      const newGeneralInfo = typeof action === 'function' ? action(slot.generalInfo) : action;
      const updated: ProgramSlotsMap = {
        ...prev,
        [activeSlotNumber]: {
          ...slot,
          generalInfo: newGeneralInfo,
          lastModified: new Date().toISOString()
        }
      };
      saveAllProgramSlots(updated);
      return updated;
    });
  };

  const setEvidences: React.Dispatch<React.SetStateAction<EvidenceItem[]>> = (action) => {
    setProgramSlots((prev) => {
      const slot = prev[activeSlotNumber] || prev[1];
      const newEvidences = typeof action === 'function' ? action(slot.evidences) : action;
      const updated: ProgramSlotsMap = {
        ...prev,
        [activeSlotNumber]: {
          ...slot,
          evidences: newEvidences,
          lastModified: new Date().toISOString()
        }
      };
      saveAllProgramSlots(updated);
      return updated;
    });
  };

  const setApprentices: React.Dispatch<React.SetStateAction<Apprentice[]>> = (action) => {
    setProgramSlots((prev) => {
      const slot = prev[activeSlotNumber] || prev[1];
      const newApprentices = typeof action === 'function' ? action(slot.apprentices) : action;
      const updated: ProgramSlotsMap = {
        ...prev,
        [activeSlotNumber]: {
          ...slot,
          apprentices: newApprentices,
          lastModified: new Date().toISOString()
        }
      };
      saveAllProgramSlots(updated);
      return updated;
    });
  };

  // Program Slot Management Handlers
  const handleSelectSlot = (slotNumber: number) => {
    setActiveSlotNumber(slotNumber);
    saveActiveSlotNumber(slotNumber);
    const targetSlot = programSlots[slotNumber];
    if (targetSlot && targetSlot.apprentices && targetSlot.apprentices.length > 0) {
      setSelectedApprentice(targetSlot.apprentices[0]);
    } else {
      setSelectedApprentice(null);
    }
  };

  const handleUpdateSlotCustomName = (slotNumber: number, newName: string) => {
    setProgramSlots((prev) => {
      const slot = prev[slotNumber];
      if (!slot) return prev;
      const updated: ProgramSlotsMap = {
        ...prev,
        [slotNumber]: {
          ...slot,
          customName: newName,
          lastModified: new Date().toISOString()
        }
      };
      saveAllProgramSlots(updated);
      return updated;
    });
  };

  const handleResetSlot = (slotNumber: number) => {
    const defaults = getDefaultProgramSlots();
    const defaultSlot = defaults[slotNumber];
    if (!defaultSlot) return;

    setProgramSlots((prev) => {
      const updated: ProgramSlotsMap = {
        ...prev,
        [slotNumber]: {
          ...defaultSlot,
          lastModified: new Date().toISOString()
        }
      };
      saveAllProgramSlots(updated);
      return updated;
    });

    if (slotNumber === activeSlotNumber) {
      setSelectedApprentice(defaultSlot.apprentices[0] || null);
    }
  };

  const handleCopySlot = (sourceSlotNumber: number, targetSlotNumber: number) => {
    const sourceSlot = programSlots[sourceSlotNumber];
    if (!sourceSlot) return;

    setProgramSlots((prev) => {
      const targetExisting = prev[targetSlotNumber];
      const updated: ProgramSlotsMap = {
        ...prev,
        [targetSlotNumber]: {
          id: `prog-${targetSlotNumber}`,
          slotNumber: targetSlotNumber,
          customName: targetExisting?.customName || `Copia de ${sourceSlot.customName || `P${sourceSlotNumber}`}`,
          generalInfo: JSON.parse(JSON.stringify(sourceSlot.generalInfo)),
          evidences: JSON.parse(JSON.stringify(sourceSlot.evidences)),
          apprentices: JSON.parse(JSON.stringify(sourceSlot.apprentices)),
          lastModified: new Date().toISOString()
        }
      };
      saveAllProgramSlots(updated);
      return updated;
    });
  };

  const handleResetToDefaultSample = () => {
    if (window.confirm('¿Desea restaurar todos los 5 programas de formación a sus valores de ejemplo predeterminados?')) {
      const defaults = getDefaultProgramSlots();
      setProgramSlots(defaults);
      saveAllProgramSlots(defaults);
      setActiveSlotNumber(1);
      saveActiveSlotNumber(1);
      setSelectedApprentice(defaults[1].apprentices[0] || null);
      setSignatureConfig(INITIAL_SIGNATURE_CONFIG);
      localStorage.setItem(PROGRAM_STORAGE_KEYS.LEGACY_SIGNATURE, JSON.stringify(INITIAL_SIGNATURE_CONFIG));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-black flex flex-col font-sans antialiased">
      {/* App Header */}
      <Header
        senaLogoUrl={generalInfo.senaLogoUrl}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apprenticesCount={apprentices.length}
        evidencesCount={evidences.length}
        codigoFicha={generalInfo.codigoFicha}
        activeSlotNumber={activeSlotNumber}
        activeProgramName={currentSlot.customName || generalInfo.programa}
        onOpenBulkDownload={() => setIsBulkDownloadOpen(true)}
      />

      {/* 5-Program Selector & Management Bar */}
      <ProgramSelector
        activeSlotNumber={activeSlotNumber}
        programSlots={programSlots}
        onSelectSlot={handleSelectSlot}
        onUpdateSlotCustomName={handleUpdateSlotCustomName}
        onResetSlot={handleResetSlot}
        onCopySlot={handleCopySlot}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'general' && (
          <GeneralInfoForm
            generalInfo={generalInfo}
            setGeneralInfo={setGeneralInfo}
            signatureConfig={signatureConfig}
            setSignatureConfig={setSignatureConfig}
            onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
            onContinue={() => setActiveTab('evidencias')}
          />
        )}

        {activeTab === 'evidencias' && (
          <EvidenceManager
            evidences={evidences}
            setEvidences={setEvidences}
            generalInfo={generalInfo}
            onBack={() => setActiveTab('general')}
            onContinue={() => setActiveTab('matriz')}
          />
        )}

        {activeTab === 'matriz' && (
          <EvidenceMatrixView
            apprentices={apprentices}
            setApprentices={setApprentices}
            evidences={evidences}
            setEvidences={setEvidences}
            generalInfo={generalInfo}
            onSelectApprenticeForPreview={(app) => {
              setSelectedApprentice(app);
              setActiveTab('vista-previa');
            }}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'aprendices' && (
          <ApprenticeManager
            apprentices={apprentices}
            setApprentices={setApprentices}
            evidences={evidences}
            setEvidences={setEvidences}
            onSelectApprenticeForPreview={(app) => {
              setSelectedApprentice(app);
              setActiveTab('vista-previa');
            }}
            onBack={() => setActiveTab('matriz')}
            onContinue={() => setActiveTab('vista-previa')}
          />
        )}

        {activeTab === 'vista-previa' && (
          <DocumentPreview
            generalInfo={generalInfo}
            evidences={evidences}
            apprentices={apprentices}
            selectedApprentice={selectedApprentice}
            onSelectApprentice={setSelectedApprentice}
            signatureConfig={signatureConfig}
            onOpenBulkDownload={() => setIsBulkDownloadOpen(true)}
            onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-black mt-auto py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-black gap-3 font-semibold">
          <div className="flex items-center gap-2">
            <span className="font-black uppercase tracking-wider">Servicio Nacional de Aprendizaje - SENA</span>
            <span>•</span>
            <span className="text-slate-600">Gestor de 5 Programas de Formación</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="reset-sample-data-btn"
              type="button"
              onClick={handleResetToDefaultSample}
              className="flex items-center gap-1.5 text-xs font-black uppercase text-black hover:text-emerald-600 transition underline"
              title="Restaurar los 5 programas con datos de ejemplo predeterminados"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar 5 Programas de Ejemplo
            </button>
          </div>
        </div>
      </footer>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        signatureConfig={signatureConfig}
        onSave={setSignatureConfig}
      />

      {/* Bulk Download Modal */}
      <BulkDownloadModal
        isOpen={isBulkDownloadOpen}
        onClose={() => setIsBulkDownloadOpen(false)}
        apprentices={apprentices}
        generalInfo={generalInfo}
        evidences={evidences}
        signatureConfig={signatureConfig}
      />
    </div>
  );
}
