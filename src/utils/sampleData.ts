import { GeneralInfo, EvidenceItem, Apprentice, SignatureConfig } from '../types';

export const INITIAL_GENERAL_INFO: GeneralInfo = {
  programa: 'Desarrollo de videojuegos y entornos interactivos',
  codigoFicha: '3466175',
  centroFormacion: 'Centro de Comercio y Servicios Regional Tolima',
  modalidad: 'Virtual',
  nombreInstructorAsignado: 'Andres Arturo Huertas Carreño',
  transversal: 'Transversal Inglés',
  nombreInstructorLlamado: 'Andres Arturo Huertas Carreño',
  fechaEntregaLlamado: new Date().toISOString().split('T')[0],
  fechaLimiteEvidencias: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
  planMejoramientoFechaLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  planMejoramientoCompromiso: 'El aprendiz se compromete a cumplir a cabalidad con las actividades concertadas en las fechas indicadas. El incumplimiento injustificado dará lugar al traslado del caso al Comité de Evaluación y Seguimiento según el Reglamento del Aprendiz SENA.',
  juicioTexto: 'Para superar los resultados de aprendizaje a evaluar debe aprobar todas las evidencias',
  juicioResultado: 'NO_APROBO',
  codigoDocumento: '',
  fecha: new Date().toISOString().split('T')[0],
  cargoCoordinador: 'COORDINADOR ACADEMICO'
};

export const INITIAL_EVIDENCES: EvidenceItem[] = [
  {
    id: 'ev-1',
    numero: 1,
    nombre: 'Evidencia GA1-240202501-AA1-EV01. Cuestionario.',
    defaultEstado: 'NO',
    observacion: '',
    rapIndex: 0
  },
  {
    id: 'ev-2',
    numero: 2,
    nombre: 'Evidencia GA1-240202501-AA1-EV02. Video presentación.',
    defaultEstado: 'NO',
    observacion: '',
    rapIndex: 0
  },
  {
    id: 'ev-3',
    numero: 3,
    nombre: 'Evidencia GA1-240202501-AA1-EV03. Folleto.',
    defaultEstado: 'NO',
    observacion: '',
    rapIndex: 0
  },
  {
    id: 'ev-4',
    numero: 4,
    nombre: 'GA2-240202501-AA1-EV01. Cuestionario.',
    defaultEstado: 'NO',
    observacion: '',
    rapIndex: 1
  },
  {
    id: 'ev-5',
    numero: 5,
    nombre: 'GA2-240202501-AA1-EV02. Video entrevista virtual.',
    defaultEstado: 'NO',
    observacion: '',
    rapIndex: 1
  },
  {
    id: 'ev-6',
    numero: 6,
    nombre: 'Evidencia GA2-240202501-AA1-EV03. Crónica.',
    defaultEstado: 'NO',
    observacion: '',
    rapIndex: 1
  },
  {
    id: 'ev-7',
    numero: 7,
    nombre: 'Cuestionario. GA2-240202501-AA2-EV01',
    defaultEstado: 'NO',
    observacion: '',
    rapIndex: 1
  }
];

export const INITIAL_APPRENTICES: Apprentice[] = [
  {
    id: 'app-1',
    nombre: 'Yandri Johan Reyes Huertas',
    documento: '1098765432',
    correo: 'yandrijreyes94@gmail.com',
    telefono: '3101234567',
    evidenciasStatus: {},
    observacionesEspecificas: '',
    juicioEspecifico: 'NO_APROBO'
  },
  {
    id: 'app-2',
    nombre: 'Carlos Eduardo Ramírez Torres',
    documento: '1014238765',
    correo: 'carlos.ramirez.t@gmail.com',
    telefono: '3209876543',
    evidenciasStatus: {},
    observacionesEspecificas: '',
    juicioEspecifico: 'NO_APROBO'
  },
  {
    id: 'app-3',
    nombre: 'María Camila Gómez Salazar',
    documento: '1023456789',
    correo: 'maria.camilag@misena.edu.co',
    telefono: '3156789012',
    evidenciasStatus: {
      'ev-1': 'SI',
      'ev-2': 'SI',
      'ev-3': 'NO',
      'ev-4': 'NO',
      'ev-5': 'NO',
      'ev-6': 'NO',
      'ev-7': 'NO'
    },
    observacionesEspecificas: 'Presentó actividades 1 y 2 fuera de tiempo inicial, pendientes restantes.',
    juicioEspecifico: 'NO_APROBO'
  },
  {
    id: 'app-4',
    nombre: 'Santiago David Morales Peña',
    documento: '1032890145',
    correo: 'santiago.morales@gmail.com',
    telefono: '3187654321',
    evidenciasStatus: {},
    observacionesEspecificas: '',
    juicioEspecifico: 'NO_APROBO'
  }
];

export const SAMPLE_NAMES_80 = [
  'Acosta Moreno Laura Valentina',
  'Aguilar Pérez Juan Sebastián',
  'Alarcón Rivera Diego Fernando',
  'Alonso Castro Daniel Eduardo',
  'Alvarado Méndez Paula Andrea',
  'Álvarez Gómez Cristian Camilo',
  'Amaya Rojas Valentina',
  'Angulo Serrano Julián David',
  'Arango Herrera Juan David',
  'Arias Sánchez María José',
  'Avila Mendoza Brayan Steven',
  'Baena Ortiz Sergio Andrés',
  'Barrera Castillo Angie Tatiana',
  'Barreto Silva Juan Esteban',
  'Bedoya Gallego Valentina',
  'Beltrán Morales Andrés Felipe',
  'Benítez Ramos Mateo',
  'Bernal Vargas Kelly Johanna',
  'Betancur Gómez Kevin Alexis',
  'Blanco Pineda Karen Daniela',
  'Bonilla Romero Santiago',
  'Bravo Delgado Natalia',
  'Buitrago Forero Carlos Mario',
  'Caballero Cruz Daniel Felipe',
  'Cadena López Luisa Fernanda',
  'Calderón Peña Juan Manuel',
  'Camacho Díaz Diana Marcela',
  'Campo Navarro Luis Gabriel',
  'Cardona Ramírez Juan Camilo',
  'Carreño Soto Erika Patricia',
  'Castañeda Morales Johan Sebastián',
  'Castillo Jiménez Gabriel David',
  'Castro Guitiérrez Tatiana',
  'Ceballos Ospina Miguel Ángel',
  'Chacón Roa Laura Camila',
  'Contreras Ortiz Edwin Alexander',
  'Cordero Ruiz Yeison David',
  'Correa Gil Andrés Mauricio',
  'Cruz Pinzón Jessica Andrea',
  'Cuellar Lozano Santiago',
  'Daza Medina Paola Andrea',
  'Delgado Flórez Jonathan',
  'Díaz Barajas Mayra Alejandra',
  'Duque Sánchez Felipe',
  'Echeverri Taborda Camilo',
  'Escobar Velásquez Leidy Diana',
  'Espitia Guerrero David Santiago',
  'Fajardo Parra Cristian David',
  'Fernández Rincón Angie Milena',
  'Fonseca Cárdenas Jorge Mario',
  'Franco Restrepo Luisa María',
  'Fuentes Cely Brayan Camilo',
  'Gaitán Ochoa Sofía',
  'Galeano Ríos Juan Pablo',
  'Galindo Cruz Sebastián',
  'Garavito Mora Laura Isabel',
  'García Castaño Carlos Andrés',
  'Giraldo Maya Daniela',
  'Gómez Salazar María Camila',
  'González Duque Juan Diego',
  'Guerrero Beltrán Nicolás',
  'Gutiérrez Polo Andrea Carolina',
  'Guzmán Quintero Faber Andrés',
  'Hernández León Wendy Johanna',
  'Herrera Molina Julián Andrés',
  'Higuera Cruz Harold Steven',
  'Hurtado Rivera Brandon Alexis',
  'Ibáñez Cárdenas Lorena',
  'Jaramillo Cano David Esteban',
  'Jiménez Suárez Oscar Iván',
  'Lara Montaña Adriana Lucia',
  'Leal Mendoza Miller Orlando',
  'Londoño Correa Juan José',
  'López Carvajal Yesid Leonardo',
  'Lozano Quiroga Stefanny',
  'Machado Sierra Wilson Javier',
  'Marín Osorio Valentina',
  'Martínez Pardo Angie Lorena',
  'Medina Santos Marlon Steven',
  'Mejía Giraldo Tomás'
];

export const INITIAL_SIGNATURE_CONFIG: SignatureConfig = {
  instructorSignatureType: 'text',
  instructorName: 'Andres Arturo Huertas Carreño',
  coordinadorName: '',
  subdirectorName: ''
};

export function generate80SampleApprentices(): Apprentice[] {
  return SAMPLE_NAMES_80.map((nombre, idx) => {
    const docNum = (1014000000 + (idx + 1) * 3471).toString();
    const cleanMail = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');
    
    // Sample varied evidence statuses for realistic matrix display
    const sampleEvStatus: Record<string, 'SI' | 'NO' | 'CORREGIR'> = {};
    const pattern = idx % 5;
    INITIAL_EVIDENCES.forEach((ev, evIdx) => {
      if (pattern === 0) {
        // High performer
        sampleEvStatus[ev.id] = evIdx < 5 ? 'SI' : evIdx === 5 ? 'CORREGIR' : 'NO';
      } else if (pattern === 1) {
        // Mixed with corrections
        sampleEvStatus[ev.id] = evIdx < 2 ? 'SI' : evIdx < 4 ? 'CORREGIR' : 'NO';
      } else if (pattern === 2) {
        // Many corrections
        sampleEvStatus[ev.id] = evIdx % 2 === 0 ? 'CORREGIR' : 'NO';
      } else if (pattern === 3) {
        // Mostly pending
        sampleEvStatus[ev.id] = evIdx === 0 ? 'SI' : 'NO';
      } else {
        // Default pending
        sampleEvStatus[ev.id] = 'NO';
      }
    });

    return {
      id: `app-sample-${idx + 1}`,
      nombre,
      documento: docNum,
      correo: `${cleanMail}@misena.edu.co`,
      telefono: `3${Math.floor(100000000 + Math.random() * 90000000)}`,
      evidenciasStatus: sampleEvStatus,
      observacionesEspecificas: '',
      juicioEspecifico: 'NO_APROBO'
    };
  });
}



