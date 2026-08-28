export interface GeneralInfo {
  programa: string;
  codigoFicha: string;
  centroFormacion?: string;
  modalidad?: string;
  nombreInstructorAsignado: string;
  transversal?: string; // Transversal o componente formativo (e.g. Transversal Inglés)
  nombreInstructorLlamado: string;
  fechaEntregaLlamado?: string; // Fecha de entrega / emisión del llamado de atención
  fechaLimiteEvidencias?: string; // Fecha límite o plazo para entrega de evidencias
  motivo: string;
  competencia: string;
  resultadosAprendizaje: string[]; // List of RAs
  observacionesAprendiz: string;
  // Plan de Mejoramiento
  planMejoramientoActivo?: boolean; // Activar/desactivar inclusión del plan de mejoramiento
  planMejoramientoTipo?: 'Académico' | 'Disciplinario'; // Tipo de plan
  planMejoramientoDescripcion?: string; // Descripción de actividades y acciones de mejora
  planMejoramientoFechaLimite?: string; // Fecha límite o plazo de cumplimiento del plan
  planMejoramientoCompromiso?: string; // Cláusula de compromiso del aprendiz y reglamento SENA
  juicioTexto: string;
  juicioResultado: 'NO_APROBO' | 'APROBO';
  senaLogoUrl?: string;
  codigoDocumento?: string;
  fecha?: string;
  cargoCoordinador?: string;
}

export type EvidenceStatus = 'NO' | 'SI' | 'CORREGIR' | '-';

export interface EvidenceItem {
  id: string;
  numero: number;
  nombre: string;
  fechaEntrega?: string;
  defaultEstado: EvidenceStatus;
  observacion?: string;
  rapIndex?: number; // Index of the Resultado de Aprendizaje (0, 1, ...) or undefined for all/general
}

export interface ApprenticeEvidenceStatus {
  evidenceId: string;
  estado: EvidenceStatus;
  observacion?: string;
}

export interface Apprentice {
  id: string;
  nombre: string;
  documento?: string;
  correo: string;
  telefono?: string;
  // Custom evidence statuses if overridden from default
  evidenciasStatus?: Record<string, EvidenceStatus>;
  observacionesEspecificas?: string;
  juicioEspecifico?: 'NO_APROBO' | 'APROBO';
  observacionAprendizEspecifica?: string;
  planMejoramientoEspecifico?: string; // Acciones o compromisos específicos de mejora para el aprendiz
}

export interface SignatureConfig {
  instructorSignatureType: 'drawn' | 'upload' | 'text' | 'none';
  instructorSignatureData?: string; // base64 data url
  instructorName: string;
  coordinadorName?: string;
  subdirectorName?: string;
}

export type ActiveTab = 'general' | 'evidencias' | 'matriz' | 'aprendices' | 'vista-previa';

export interface ProgramSlot {
  id: string;
  slotNumber: number; // 1 | 2 | 3 | 4 | 5
  customName?: string;
  generalInfo: GeneralInfo;
  evidences: EvidenceItem[];
  apprentices: Apprentice[];
  lastModified?: string;
}

export type ProgramSlotsMap = Record<number, ProgramSlot>;

