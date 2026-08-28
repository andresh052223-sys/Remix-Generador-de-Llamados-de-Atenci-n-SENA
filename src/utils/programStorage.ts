import { GeneralInfo, EvidenceItem, Apprentice, ProgramSlot, ProgramSlotsMap } from '../types';
import {
  INITIAL_GENERAL_INFO,
  INITIAL_EVIDENCES,
  INITIAL_APPRENTICES
} from './sampleData';

export const PROGRAM_STORAGE_KEYS = {
  ACTIVE_SLOT: 'sena_active_program_slot',
  SLOTS_DATA: 'sena_program_slots_data',
  // Legacy single-program keys for backwards compatibility
  LEGACY_GENERAL_INFO: 'sena_atencion_general_info',
  LEGACY_EVIDENCES: 'sena_atencion_evidences',
  LEGACY_APPRENTICES: 'sena_atencion_apprentices',
  LEGACY_SIGNATURE: 'sena_atencion_signature'
};

export const MAX_PROGRAM_SLOTS = 5;

// Default initial templates for the 5 SENA programs
export function getDefaultProgramSlots(): ProgramSlotsMap {
  const today = new Date().toISOString().split('T')[0];
  const limitDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // SLOT 1: Videojuegos y Entornos Interactivos (Ficha 3466175)
  const slot1: ProgramSlot = {
    id: 'prog-1',
    slotNumber: 1,
    customName: INITIAL_GENERAL_INFO.programa,
    generalInfo: { ...INITIAL_GENERAL_INFO },
    evidences: JSON.parse(JSON.stringify(INITIAL_EVIDENCES)),
    apprentices: JSON.parse(JSON.stringify(INITIAL_APPRENTICES)),
    lastModified: new Date().toISOString()
  };

  // SLOT 2: Análisis y Desarrollo de Software - ADSO (Ficha 2827190)
  const slot2GeneralInfo: GeneralInfo = {
    programa: 'Análisis y desarrollo de software (ADSO)',
    codigoFicha: '2827190',
    centroFormacion: 'Centro de Comercio y Servicios Regional Tolima',
    modalidad: 'Virtual',
    nombreInstructorAsignado: '',
    transversal: 'Transversal Inglés',
    nombreInstructorLlamado: '',
    fechaEntregaLlamado: today,
    fechaLimiteEvidencias: limitDate,
    motivo: 'Incumplimiento en la presentación de evidencias solicitadas en el plazo establecido.',
    competencia: 'Interactuar en lengua inglesa de forma oral y escrita dentro de contextos sociales y laborales segun los criterios establecidos por el MCERL',
    resultadosAprendizaje: [
      'RAP1 COMPRENDER INFORMACIÓN SOBRE SITUACIONES COTIDIANAS Y LABORALES ACTUALES Y FUTURAS A TRAVÉS DE INTERACCIONES SOCIALES DE FORMA ORAL Y ESCRITA. 48 H',
      'RAP2 INTERCAMBIAR OPINIONES SOBRE SITUACIONES COTIDIANAS Y LABORALES ACTUALES, PASADAS Y FUTURAS EN CONTEXTOS SOCIALES ORALES Y ESCRITOS. 96 H'
    ],
    observacionesAprendiz: '',
    planMejoramientoActivo: true,
    planMejoramientoTipo: 'Académico',
    planMejoramientoDescripcion: 'El aprendiz deberá desarrollar y entregar la totalidad de las evidencias identificadas como NO o en estado de corrección en este documento, atendiendo a los criterios de evaluación y especificaciones de la guía de aprendizaje en la plataforma institucional.',
    planMejoramientoFechaLimite: limitDate,
    planMejoramientoCompromiso: 'El aprendiz se compromete a cumplir a cabalidad con las actividades concertadas en las fechas indicadas. El incumplimiento injustificado dará lugar al traslado del caso al Comité de Evaluación y Seguimiento según el Reglamento del Aprendiz SENA.',
    juicioTexto: 'Para superar los resultados de aprendizaje a evaluar debe aprobar todas las evidencias',
    juicioResultado: 'NO_APROBO',
    codigoDocumento: '',
    fecha: today,
    cargoCoordinador: 'COORDINADOR ACADEMICO'
  };

  const slot2Evidences: EvidenceItem[] = [
    {
      id: 'ev-adso-1',
      numero: 1,
      nombre: 'Evidencia GA1-240202501-AA1-EV01. Cuestionario técnico y laboral en inglés.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-adso-2',
      numero: 2,
      nombre: 'Evidencia GA1-240202501-AA1-EV02. Video presentación personal y perfil ocupacional.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-adso-3',
      numero: 3,
      nombre: 'Evidencia GA1-240202501-AA1-EV03. Folleto con especificaciones y ciclo de vida de software.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-adso-4',
      numero: 4,
      nombre: 'Evidencia GA2-240202501-AA1-EV01. Cuestionario metodologías ágiles Scrum en inglés.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 1
    },
    {
      id: 'ev-adso-5',
      numero: 5,
      nombre: 'Evidencia GA2-240202501-AA1-EV02. Video simulación de daily standup y entrevista de trabajo.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 1
    }
  ];

  const slot2Apprentices: Apprentice[] = [
    {
      id: 'app-adso-1',
      nombre: 'Carlos Alberto Mendoza Ortiz',
      documento: '1098234561',
      correo: 'carlos.mendoza@misena.edu.co',
      telefono: '3104567890',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    },
    {
      id: 'app-adso-2',
      nombre: 'Laura Sofia Ramirez Gomez',
      documento: '1095432198',
      correo: 'laura.ramirez@misena.edu.co',
      telefono: '3157890123',
      evidenciasStatus: {
        'ev-adso-1': 'SI',
        'ev-adso-2': 'CORREGIR'
      },
      observacionesEspecificas: 'Video incompleto, debe corregir audio y pronunciación técnica.',
      juicioEspecifico: 'NO_APROBO'
    },
    {
      id: 'app-adso-3',
      nombre: 'Diego Fernando Castro Ruiz',
      documento: '1091238765',
      correo: 'diego.castro@misena.edu.co',
      telefono: '3189012345',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    },
    {
      id: 'app-adso-4',
      nombre: 'Tatiana Marcela Gutierrez Polo',
      documento: '1093456782',
      correo: 'tatiana.gutierrez@misena.edu.co',
      telefono: '3201239876',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    }
  ];

  const slot2: ProgramSlot = {
    id: 'prog-2',
    slotNumber: 2,
    customName: slot2GeneralInfo.programa,
    generalInfo: slot2GeneralInfo,
    evidences: slot2Evidences,
    apprentices: slot2Apprentices,
    lastModified: new Date().toISOString()
  };

  // SLOT 3: Gestión Contable y de Información Financiera (Ficha 2901452)
  const slot3GeneralInfo: GeneralInfo = {
    ...slot2GeneralInfo,
    programa: 'Gestión contable y de información financiera',
    codigoFicha: '2901452',
    competencia: 'Interactuar en lengua inglesa en contextos contables, tributarios y comerciales según normas internacionales.',
    resultadosAprendizaje: [
      'RAP1 COMPRENDER TÉRMINOS CONTABLES, FINANCIEROS Y COMERCIALES EN DOCUMENTOS EN INGLÉS. 48 H',
      'RAP2 ELABORAR INFORMES Y PRESENTACIONES COMERCIALES Y FINANCIERAS EN INGLÉS. 96 H'
    ]
  };

  const slot3Evidences: EvidenceItem[] = [
    {
      id: 'ev-cont-1',
      numero: 1,
      nombre: 'Evidencia GA1-240202501-AA1-EV01. Cuestionario vocabulario de estados financieros.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-cont-2',
      numero: 2,
      nombre: 'Evidencia GA1-240202501-AA1-EV02. Video presentación balance general en inglés.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-cont-3',
      numero: 3,
      nombre: 'Evidencia GA1-240202501-AA1-EV03. Folleto de servicios contables y tributarios.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-cont-4',
      numero: 4,
      nombre: 'Evidencia GA2-240202501-AA1-EV01. Cuestionario transacciones comerciales internacionales.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 1
    }
  ];

  const slot3Apprentices: Apprentice[] = [
    {
      id: 'app-cont-1',
      nombre: 'Valentina Morales Ospina',
      documento: '1094321876',
      correo: 'valentina.morales@misena.edu.co',
      telefono: '3123456789',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    },
    {
      id: 'app-cont-2',
      nombre: 'Juan Sebastian Pineda Cruz',
      documento: '1097654321',
      correo: 'juan.pineda@misena.edu.co',
      telefono: '3167890123',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    },
    {
      id: 'app-cont-3',
      nombre: 'Daniela Fernanda Rios Lozano',
      documento: '1096543218',
      correo: 'daniela.rios@misena.edu.co',
      telefono: '3190123456',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    }
  ];

  const slot3: ProgramSlot = {
    id: 'prog-3',
    slotNumber: 3,
    customName: slot3GeneralInfo.programa,
    generalInfo: slot3GeneralInfo,
    evidences: slot3Evidences,
    apprentices: slot3Apprentices,
    lastModified: new Date().toISOString()
  };

  // SLOT 4: Animación 3D y Modelado Digital (Ficha 3015884)
  const slot4GeneralInfo: GeneralInfo = {
    ...slot2GeneralInfo,
    programa: 'Animación 3D y Modelado Digital',
    codigoFicha: '3015884',
    competencia: 'Interactuar en lengua inglesa en proyectos creativos de animación y renderizado.',
    resultadosAprendizaje: [
      'RAP1 COMPRENDER GUIONES Y DIRECTRICES DE ARTE Y ANIMACIÓN EN INGLÉS. 48 H',
      'RAP2 COMUNICAR CONCEPTOS DE PRODUCCIÓN Y MODELADO 3D EN ESPACIOS PROFESIONALES. 96 H'
    ]
  };

  const slot4Evidences: EvidenceItem[] = [
    {
      id: 'ev-anim-1',
      numero: 1,
      nombre: 'Evidencia GA1-240202501-AA1-EV01. Cuestionario de guión y storyboard en inglés.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-anim-2',
      numero: 2,
      nombre: 'Evidencia GA1-240202501-AA1-EV02. Video pitch presentación de proyecto animado.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-anim-3',
      numero: 3,
      nombre: 'Evidencia GA1-240202501-AA1-EV03. Infografía de concepto de personajes en inglés.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-anim-4',
      numero: 4,
      nombre: 'Evidencia GA2-240202501-AA1-EV01. Cuestionario pipeline de render y postproducción.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 1
    }
  ];

  const slot4Apprentices: Apprentice[] = [
    {
      id: 'app-anim-1',
      nombre: 'Andres Felipe Quintero Gil',
      documento: '1093456781',
      correo: 'andres.quintero@misena.edu.co',
      telefono: '3112345678',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    },
    {
      id: 'app-anim-2',
      nombre: 'Maria Camila Vargas Torres',
      documento: '1098765123',
      correo: 'maria.vargas@misena.edu.co',
      telefono: '3178901234',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    },
    {
      id: 'app-anim-3',
      nombre: 'Julian David Herrera Molina',
      documento: '1090123456',
      correo: 'julian.herrera@misena.edu.co',
      telefono: '3145678901',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    }
  ];

  const slot4: ProgramSlot = {
    id: 'prog-4',
    slotNumber: 4,
    customName: slot4GeneralInfo.programa,
    generalInfo: slot4GeneralInfo,
    evidences: slot4Evidences,
    apprentices: slot4Apprentices,
    lastModified: new Date().toISOString()
  };

  // SLOT 5: Administración y Seguridad en Redes de Computadores (Ficha 3129840)
  const slot5GeneralInfo: GeneralInfo = {
    ...slot2GeneralInfo,
    programa: 'Administración y Seguridad en Redes de Computadores',
    codigoFicha: '3129840',
    competencia: 'Interactuar en lengua inglesa en entornos de infraestructura tecnológica y ciberseguridad.',
    resultadosAprendizaje: [
      'RAP1 INTERPRETAR MANUALES TÉCNICOS Y PROTOCOLOS DE RED EN INGLÉS. 48 H',
      'RAP2 SUSTENTAR PLANES DE CONTINGENCIA Y GESTIÓN DE SEGURIDAD INFORMÁTICA. 96 H'
    ]
  };

  const slot5Evidences: EvidenceItem[] = [
    {
      id: 'ev-redes-1',
      numero: 1,
      nombre: 'Evidencia GA1-240202501-AA1-EV01. Cuestionario de protocolos TCP/IP y seguridad.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-redes-2',
      numero: 2,
      nombre: 'Evidencia GA1-240202501-AA1-EV02. Video sustentación de topología de red en inglés.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-redes-3',
      numero: 3,
      nombre: 'Evidencia GA1-240202501-AA1-EV03. Manual de políticas de seguridad en inglés.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 0
    },
    {
      id: 'ev-redes-4',
      numero: 4,
      nombre: 'Evidencia GA2-240202501-AA1-EV01. Cuestionario análisis de vulnerabilidades y firewall.',
      defaultEstado: 'NO',
      observacion: '',
      rapIndex: 1
    }
  ];

  const slot5Apprentices: Apprentice[] = [
    {
      id: 'app-redes-1',
      nombre: 'Brayan Estiven Lopez Henao',
      documento: '1092345678',
      correo: 'brayan.lopez@misena.edu.co',
      telefono: '3134567890',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    },
    {
      id: 'app-redes-2',
      nombre: 'Natalia Andrea Gomez Restrepo',
      documento: '1098765439',
      correo: 'natalia.gomez@misena.edu.co',
      telefono: '3161234567',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    },
    {
      id: 'app-redes-3',
      nombre: 'Kevin Alexis Betancur Gómez',
      documento: '1095678901',
      correo: 'kevin.betancur@misena.edu.co',
      telefono: '3182345678',
      evidenciasStatus: {},
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    }
  ];

  const slot5: ProgramSlot = {
    id: 'prog-5',
    slotNumber: 5,
    customName: slot5GeneralInfo.programa,
    generalInfo: slot5GeneralInfo,
    evidences: slot5Evidences,
    apprentices: slot5Apprentices,
    lastModified: new Date().toISOString()
  };

  return {
    1: slot1,
    2: slot2,
    3: slot3,
    4: slot4,
    5: slot5
  };
}

/**
 * Loads all 5 program slots from localStorage, ensuring backward-compatibility
 * with any single-program data that already exists.
 */
export function loadAllProgramSlots(): ProgramSlotsMap {
  const defaults = getDefaultProgramSlots();

  try {
    const rawStored = localStorage.getItem(PROGRAM_STORAGE_KEYS.SLOTS_DATA);
    let slots: ProgramSlotsMap = rawStored ? JSON.parse(rawStored) : {};

    // Ensure all slots 1..5 exist
    for (let i = 1; i <= MAX_PROGRAM_SLOTS; i++) {
      if (!slots[i] || !slots[i].generalInfo) {
        slots[i] = defaults[i];
      } else {
        // Keep customName synced with the current programa so predefined templates never block edits
        if (slots[i].generalInfo?.programa) {
          slots[i].customName = slots[i].generalInfo.programa;
        }
        // If the slot has the previous hardcoded predefined instructor name, reset to empty
        if (
          slots[i].generalInfo.nombreInstructorAsignado &&
          slots[i].generalInfo.nombreInstructorAsignado.toLowerCase().includes('huertas')
        ) {
          slots[i].generalInfo.nombreInstructorAsignado = '';
        }
        if (
          slots[i].generalInfo.nombreInstructorLlamado &&
          slots[i].generalInfo.nombreInstructorLlamado.toLowerCase().includes('huertas')
        ) {
          slots[i].generalInfo.nombreInstructorLlamado = '';
        }
      }
    }

    // Check if legacy single-program data exists (user's previous work in Slot 1)
    const legacyGen = localStorage.getItem(PROGRAM_STORAGE_KEYS.LEGACY_GENERAL_INFO);
    const legacyEvs = localStorage.getItem(PROGRAM_STORAGE_KEYS.LEGACY_EVIDENCES);
    const legacyApps = localStorage.getItem(PROGRAM_STORAGE_KEYS.LEGACY_APPRENTICES);

    if (legacyGen && !rawStored) {
      try {
        slots[1].generalInfo = JSON.parse(legacyGen);
        if (slots[1].generalInfo?.nombreInstructorAsignado?.toLowerCase().includes('huertas')) {
          slots[1].generalInfo.nombreInstructorAsignado = '';
        }
        if (slots[1].generalInfo?.nombreInstructorLlamado?.toLowerCase().includes('huertas')) {
          slots[1].generalInfo.nombreInstructorLlamado = '';
        }
      } catch {}
    }
    if (legacyEvs && !rawStored) {
      try {
        slots[1].evidences = JSON.parse(legacyEvs);
      } catch {}
    }
    if (legacyApps && !rawStored) {
      try {
        slots[1].apprentices = JSON.parse(legacyApps);
      } catch {}
    }

    return slots;
  } catch {
    return defaults;
  }
}

/**
 * Saves all 5 program slots to localStorage and mirrors slot 1 to legacy keys.
 */
export function saveAllProgramSlots(slots: ProgramSlotsMap): void {
  try {
    localStorage.setItem(PROGRAM_STORAGE_KEYS.SLOTS_DATA, JSON.stringify(slots));

    // Mirror slot 1 to legacy keys so older modules or reload hooks stay in sync
    if (slots[1]) {
      localStorage.setItem(PROGRAM_STORAGE_KEYS.LEGACY_GENERAL_INFO, JSON.stringify(slots[1].generalInfo));
      localStorage.setItem(PROGRAM_STORAGE_KEYS.LEGACY_EVIDENCES, JSON.stringify(slots[1].evidences));
      localStorage.setItem(PROGRAM_STORAGE_KEYS.LEGACY_APPRENTICES, JSON.stringify(slots[1].apprentices));
    }
  } catch (err) {
    console.error('Error saving program slots:', err);
  }
}

/**
 * Gets the current active program slot number (1..5)
 */
export function loadActiveSlotNumber(): number {
  try {
    const raw = localStorage.getItem(PROGRAM_STORAGE_KEYS.ACTIVE_SLOT);
    const num = raw ? parseInt(raw, 10) : 1;
    return num >= 1 && num <= MAX_PROGRAM_SLOTS ? num : 1;
  } catch {
    return 1;
  }
}

/**
 * Saves the active program slot number (1..5)
 */
export function saveActiveSlotNumber(slot: number): void {
  try {
    const valid = Math.max(1, Math.min(MAX_PROGRAM_SLOTS, slot));
    localStorage.setItem(PROGRAM_STORAGE_KEYS.ACTIVE_SLOT, valid.toString());
  } catch {}
}
