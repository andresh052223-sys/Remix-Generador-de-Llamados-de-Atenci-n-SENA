import React, { useState, useEffect } from 'react';
import { ActiveTab, Apprentice, EvidenceItem, GeneralInfo, SignatureConfig } from './types';
import {
  INITIAL_APPRENTICES,
  INITIAL_EVIDENCES,
  INITIAL_GENERAL_INFO,
  INITIAL_SIGNATURE_CONFIG
} from './utils/sampleData';
import { Header } from './components/Header';
import { GeneralInfoForm } from './components/GeneralInfoForm';
import { EvidenceManager } from './components/EvidenceManager';
import { EvidenceMatrixView } from './components/EvidenceMatrixView';
import { ApprenticeManager } from './components/ApprenticeManager';
import { DocumentPreview } from './components/DocumentPreview';
import { SignatureModal } from './components/SignatureModal';
import { BulkDownloadModal } from './components/BulkDownloadModal';
import { RotateCcw } from 'lucide-react';

const STORAGE_KEYS = {
  GENERAL_INFO: 'sena_atencion_general_info',
  EVIDENCES: 'sena_atencion_evidences',
  APPRENTICES: 'sena_atencion_apprentices',
  SIGNATURE: 'sena_atencion_signature'
};

export default function App() {
  // 1. State for General Info
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GENERAL_INFO);
      return saved ? JSON.parse(saved) : INITIAL_GENERAL_INFO;
    } catch {
      return INITIAL_GENERAL_INFO;
    }
  });

  // 2. State for Evidences List
  const [evidences, setEvidences] = useState<EvidenceItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EVIDENCES);
      return saved ? JSON.parse(saved) : INITIAL_EVIDENCES;
    } catch {
      return INITIAL_EVIDENCES;
    }
  });

  // 3. State for Apprentices
  const [apprentices, setApprentices] = useState<Apprentice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APPRENTICES);
      return saved ? JSON.parse(saved) : INITIAL_APPRENTICES;
    } catch {
      return INITIAL_APPRENTICES;
    }
  });

  // 4. State for Signatures
  const [signatureConfig, setSignatureConfig] = useState<SignatureConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SIGNATURE);
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

  // Sync with Local Storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GENERAL_INFO, JSON.stringify(generalInfo));
    } catch {}
  }, [generalInfo]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVIDENCES, JSON.stringify(evidences));
    } catch {}
  }, [evidences]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.APPRENTICES, JSON.stringify(apprentices));
    } catch {}
  }, [apprentices]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SIGNATURE, JSON.stringify(signatureConfig));
    } catch {}
  }, [signatureConfig]);

  // Keep selected apprentice synced if list changes
  useEffect(() => {
    if (apprentices.length > 0) {
      if (!selectedApprentice || !apprentices.some((a) => a.id === selectedApprentice.id)) {
        setSelectedApprentice(apprentices[0]);
      }
    }
  }, [apprentices, selectedApprentice]);

  const handleResetToDefaultSample = () => {
    if (window.confirm('¿Desea restaurar los datos de ejemplo del formato SENA?')) {
      setGeneralInfo(INITIAL_GENERAL_INFO);
      setEvidences(INITIAL_EVIDENCES);
      setApprentices(INITIAL_APPRENTICES);
      setSignatureConfig(INITIAL_SIGNATURE_CONFIG);
      setSelectedApprentice(INITIAL_APPRENTICES[0]);
      localStorage.clear();
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
        onOpenBulkDownload={() => setIsBulkDownloadOpen(true)}
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
            <span className="text-slate-600">Generador Automatizado de Documentos PDF</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="reset-sample-data-btn"
              type="button"
              onClick={handleResetToDefaultSample}
              className="flex items-center gap-1.5 text-xs font-black uppercase text-black hover:text-emerald-600 transition underline"
              title="Restaurar ejemplo predeterminado"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Datos de Ejemplo
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
