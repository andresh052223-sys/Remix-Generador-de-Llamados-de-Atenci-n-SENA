import * as XLSX from 'xlsx';
import { Apprentice, EvidenceItem, EvidenceStatus } from '../types';

export interface ColumnMapping {
  colIndex: number;
  headerName: string;
  type: 'documento' | 'nombre' | 'correo' | 'telefono' | 'evidence' | 'ignore';
  evidenceId?: string;
  evidenceNumero?: number;
  evidenceNombre?: string;
}

export interface ParsedExcelApprentice {
  id: string;
  nombre: string;
  documento?: string;
  correo: string;
  telefono?: string;
  evidenciasStatus: Record<string, EvidenceStatus>;
  matchedWithExistingId?: string;
  totalSi: number;
  totalNo: number;
  totalCorregir: number;
  totalNa: number;
}

export interface ParsedExcelResult {
  fileName: string;
  sheetName: string;
  totalRows: number;
  apprentices: ParsedExcelApprentice[];
  columnMappings: ColumnMapping[];
  detectedEvidenceColumns: {
    headerName: string;
    evidenceId: string;
    evidenceNumero: number;
    evidenceNombre: string;
    isNew?: boolean;
  }[];
  unmappedEvidenceColumns: string[];
  newEvidencesFound: EvidenceItem[];
  updatedEvidences: EvidenceItem[];
  summary: {
    totalApprentices: number;
    matchedWithExisting: number;
    newApprentices: number;
    evidencesUpdated: number;
    newEvidencesCount: number;
  };
}

/**
 * Normalizes text for comparison (removes accents, extra spaces, lowercase)
 */
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parses cell value to evidence status: 'SI' | 'NO' | 'CORREGIR' | '-'
 */
export function parseEvidenceStatusValue(val: any): EvidenceStatus {
  if (val === undefined || val === null) return 'NO';
  const str = String(val).trim().toUpperCase();
  if (!str) return 'NO';

  // Normalized string
  const norm = normalizeText(str);

  // 'CORREGIR' indicators (Must be checked before general strings)
  if (
    str === 'CORREGIR' ||
    str === 'CORRIGE' ||
    str === 'CORRECCION' ||
    str === 'CORRECCIÓN' ||
    str === 'POR CORREGIR' ||
    str === 'DEBE CORREGIR' ||
    str === 'PENDIENTE POR CORREGIR' ||
    str === 'AJUSTAR' ||
    str === 'REHACER' ||
    str === 'C' ||
    norm.includes('correg') ||
    norm.includes('ajust')
  ) {
    return 'CORREGIR';
  }

  // 'SI' indicators
  if (
    str === 'SI' ||
    str === 'SÍ' ||
    str === 'S' ||
    str === 'A' || // SENA calification 'A' = Aprobado
    str === 'APROBADO' ||
    str === 'APROBADA' ||
    str === 'APROBO' ||
    str === 'APROBÓ' ||
    str === 'ENTREGADO' ||
    str === 'ENTREGADA' ||
    str === 'ENTREGO' ||
    str === 'ENTREGÓ' ||
    str === 'CUMPLIO' ||
    str === 'CUMPLIÓ' ||
    str === 'CUMPLE' ||
    str === '1' ||
    str === 'TRUE' ||
    str === 'V' ||
    str === 'VERDADERO' ||
    str === 'OK' ||
    str === 'CORRECTO' ||
    str === 'PRESENTO' ||
    str === 'PRESENTÓ' ||
    str === '✓' ||
    str === '✔' ||
    norm.includes('aprob') ||
    norm.includes('entreg') ||
    norm.includes('cumpli')
  ) {
    return 'SI';
  }

  // '-' indicators (No aplica / Exonerado)
  if (
    str === '-' ||
    str === 'NA' ||
    str === 'N/A' ||
    str === 'NO APLICA' ||
    str === 'EXONERADO' ||
    str === 'EXONERADA' ||
    norm.includes('no aplica') ||
    norm.includes('exoner')
  ) {
    return '-';
  }

  // Everything else defaults to 'NO' (Incumplida / Deficiente / No Aprobado)
  return 'NO';
}


/**
 * Parses an Excel file and matches both apprentices and evidence statuses
 */
export async function parseExcelMatrix(
  file: File,
  currentEvidences: EvidenceItem[],
  existingApprentices: Apprentice[] = []
): Promise<ParsedExcelResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  
  // Prioritize matrix / calificaciones sheet if multiple sheets exist
  const sheetName =
    workbook.SheetNames.find((name) => {
      const norm = normalizeText(name);
      return (
        norm.includes('matriz') ||
        norm.includes('califica') ||
        norm.includes('aprendiz') ||
        norm.includes('evidencia') ||
        norm.includes('seguimiento') ||
        norm.includes('datos')
      );
    }) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to raw array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('El archivo Excel está vacío o no contiene filas legibles.');
  }

  // Find header row (inspect first 15 rows)
  let headerRowIndex = 0;
  let maxMatchedCols = 0;

  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    row.forEach((cell) => {
      const cellStr = String(cell || '').trim();
      const norm = normalizeText(cellStr);
      if (
        norm.includes('nombre') ||
        norm.includes('aprendiz') ||
        norm.includes('documento') ||
        norm.includes('cedula') ||
        norm.includes('identificacion') ||
        norm.includes('correo') ||
        norm.includes('email') ||
        norm.includes('telefono') ||
        norm.includes('celular') ||
        norm.includes('evidencia') ||
        norm.startsWith('ev') ||
        norm.startsWith('aa') ||
        norm.startsWith('rap') ||
        norm.startsWith('ga') ||
        /#\s*\d+/.test(norm) ||
        /^(?:#|\b)?\s*\d+\s*[-.:]/.test(cellStr)
      ) {
        score++;
      }
    });

    if (score > maxMatchedCols) {
      maxMatchedCols = score;
      headerRowIndex = r;
    }
  }

  const headerRow = rawRows[headerRowIndex] || [];
  const columnMappings: ColumnMapping[] = [];
  const detectedEvidenceColumns: ParsedExcelResult['detectedEvidenceColumns'] = [];
  const unmappedEvidenceColumns: string[] = [];

  // Track existing evidences and their claims
  const claimedExistingIds = new Set<string>();
  const newEvidencesCreated: EvidenceItem[] = [];

  // Helper to check if a column looks like an evidence based on row values
  const doesColumnHaveEvaluationValues = (colIdx: number): boolean => {
    let evalCount = 0;
    let nonEmptyCount = 0;
    const sampleLimit = Math.min(rawRows.length, headerRowIndex + 35);
    for (let r = headerRowIndex + 1; r < sampleLimit; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;
      const val = row[colIdx];
      if (val === undefined || val === null) continue;
      const str = String(val).trim();
      if (!str) continue;
      nonEmptyCount++;
      const normVal = normalizeText(str).toUpperCase();
      if (
        normVal === 'SI' ||
        normVal === 'NO' ||
        normVal === 'CORREGIR' ||
        normVal === '-' ||
        normVal === 'A' ||
        normVal === 'D' ||
        normVal === 'APROBADO' ||
        normVal === 'APROBADA' ||
        normVal === 'APROBO' ||
        normVal === 'NO APROBADO' ||
        normVal === 'PENDIENTE' ||
        normVal === 'CUMPLE' ||
        normVal === 'NO CUMPLE' ||
        normVal === 'ENTREGADO' ||
        normVal === 'ENTREGO' ||
        normVal === 'C' ||
        normVal === 'NA' ||
        normVal === '1' ||
        normVal === '0'
      ) {
        evalCount++;
      }
    }
    return nonEmptyCount >= 2 && evalCount / nonEmptyCount >= 0.35;
  };

  // Match columns
  headerRow.forEach((colVal, colIndex) => {
    let headerStr = String(colVal || '').trim();
    // Remove surrounding quotes if any (e.g. '"Evidencia GA2..."' or '""')
    headerStr = headerStr.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    const norm = normalizeText(headerStr);

    if (!headerStr) {
      columnMappings.push({ colIndex, headerName: `Columna ${colIndex + 1}`, type: 'ignore' });
      return;
    }

    // Check Document
    if (
      norm.includes('documento') ||
      norm.includes('cedula') ||
      norm.includes('identificacion') ||
      norm === 'doc' ||
      norm === 'cc' ||
      norm === 'ti' ||
      norm === 'id' ||
      norm === 'dni' ||
      norm.includes('num_doc') ||
      norm.includes('numero de documento')
    ) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'documento' });
      return;
    }

    // Check Name
    if (
      (norm.includes('nombre') ||
      norm.includes('aprendiz') ||
      norm.includes('estudiante') ||
      norm.includes('alumno') ||
      norm.includes('nombres y apellidos') ||
      norm === 'nombre' ||
      norm === 'nombres' ||
      norm === 'apellidos y nombres') &&
      !norm.includes('archivo') &&
      !norm.includes('programa')
    ) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'nombre' });
      return;
    }

    // Check Email
    if (norm.includes('correo') || norm.includes('email') || norm.includes('mail') || norm.includes('misena')) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'correo' });
      return;
    }

    // Check Phone
    if (norm.includes('telefono') || norm.includes('celular') || norm.includes('tel') || norm.includes('movil') || norm.includes('phone')) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'telefono' });
      return;
    }

    // Check Item/Row Sequence index (#, N°, No, Consecutivo)
    if (
      norm === 'item' ||
      norm === 'no' ||
      norm === 'no.' ||
      norm === 'n' ||
      norm === 'n°' ||
      norm === 'num' ||
      norm === 'fila' ||
      norm === 'consecutivo' ||
      (norm === '#' && colIndex === 0)
    ) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'ignore' });
      return;
    }

    // Check Summary columns (Totals, percentages, judgment, observations)
    if (
      norm.includes('total si') ||
      norm.includes('total no') ||
      norm.includes('total corregir') ||
      norm.includes('total aprobado') ||
      norm.includes('pendientes') ||
      norm.includes('porcentaje') ||
      norm.includes('% avance') ||
      norm.includes('juicio') ||
      norm.includes('observaciones especificas')
    ) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'ignore' });
      return;
    }

    // Now, check Evidence column:
    // Try by number: e.g. "#1 - ...", "#1", "1 - ...", "1. ...", "Evidencia 1", "E1", "EV01", or exact number
    const numMatch =
      headerStr.match(/^(?:#|\b)?\s*(\d+)\s*[-.:\)]/i) ||
      headerStr.match(/(?:evidencia|evid|ev|e|#)\s*(\d+)/i) ||
      headerStr.match(/^(\d+)$/);

    const hasEvidenceKeywords =
      norm.includes('evidencia') ||
      norm.startsWith('ev') ||
      norm.startsWith('aa') ||
      norm.startsWith('rap') ||
      norm.startsWith('ga') ||
      norm.includes('ga1') ||
      norm.includes('ga2') ||
      norm.includes('ga3') ||
      norm.includes('ga4') ||
      norm.includes('ga5') ||
      norm.includes('aa1') ||
      norm.includes('aa2') ||
      norm.includes('aa3') ||
      norm.includes('aa4') ||
      norm.includes('cuestionario') ||
      norm.includes('video') ||
      norm.includes('folleto') ||
      norm.includes('cronica') ||
      norm.includes('informe') ||
      norm.includes('taller') ||
      norm.includes('foro') ||
      norm.includes('presentacion') ||
      norm.includes('infografia') ||
      norm.includes('bitacora') ||
      norm.includes('estudio de caso');

    const hasEvaluationData = doesColumnHaveEvaluationValues(colIndex);

    const isEvidenceCol = Boolean(numMatch) || hasEvidenceKeywords || hasEvaluationData;

    if (!isEvidenceCol) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'ignore' });
      return;
    }

    // Evidence Column Identified!
    let matchedEvidence: EvidenceItem | undefined;
    let isNewEvidence = false;

    // 1. Try matching by evidence number against currentEvidences
    if (numMatch) {
      const evNum = parseInt(numMatch[1], 10);
      matchedEvidence = currentEvidences.find((e) => e.numero === evNum && !claimedExistingIds.has(e.id));
    }

    // 2. Try matching by evidence code like GA1-240202501-AA1-EV01 against currentEvidences
    if (!matchedEvidence) {
      const codeMatch = headerStr.match(/GA\d+-\d+-[A-Z0-9]+-[A-Z0-9]+/i);
      if (codeMatch) {
        const code = codeMatch[0].toUpperCase();
        matchedEvidence = currentEvidences.find(
          (e) => !claimedExistingIds.has(e.id) && e.nombre.toUpperCase().includes(code)
        );
      }
    }

    // 3. Try matching by normalized name inclusion against currentEvidences
    if (!matchedEvidence) {
      matchedEvidence = currentEvidences.find((e) => {
        if (claimedExistingIds.has(e.id)) return false;
        const evNorm = normalizeText(e.nombre);
        return norm.includes(evNorm) || evNorm.includes(norm);
      });
    }

    // 4. Try matching sequential unclaimed evidence if no conflicting explicit number
    if (!matchedEvidence && !numMatch) {
      matchedEvidence = currentEvidences.find((e) => !claimedExistingIds.has(e.id));
    }

    // 5. IF NOT MATCHED to existing evidences (e.g. Evidence #9, or new evidence uploaded in the Excel):
    // DYNAMICALLY CREATE A NEW EVIDENCE ITEM!
    if (!matchedEvidence) {
      isNewEvidence = true;
      let assignedNumero: number;

      if (numMatch) {
        assignedNumero = parseInt(numMatch[1], 10);
      } else {
        const allNums = [
          ...currentEvidences.map((e) => e.numero),
          ...newEvidencesCreated.map((e) => e.numero)
        ];
        assignedNumero = (allNums.length > 0 ? Math.max(...allNums) : 0) + 1;
      }

      // Clean the name of the evidence
      let cleanName = headerStr.replace(/^(?:#|\b)?\s*\d+\s*[-.:]\s*/i, '').trim();
      cleanName = cleanName.replace(/^["'\s]+|["'\s]+$/g, '').trim();
      if (!cleanName || cleanName.length < 3) {
        cleanName = `Evidencia ${assignedNumero}. Actividad de aprendizaje.`;
      }

      // Deduce RAP index from text (GA1 -> 0, GA2 -> 1, GA3 -> 2, etc.)
      let rapIndex: number | undefined = undefined;
      const upperHeader = headerStr.toUpperCase();
      if (upperHeader.includes('GA1') || upperHeader.includes('RAP1') || upperHeader.includes('AA1')) {
        rapIndex = 0;
      } else if (upperHeader.includes('GA2') || upperHeader.includes('RAP2') || upperHeader.includes('AA2')) {
        rapIndex = 1;
      } else if (upperHeader.includes('GA3') || upperHeader.includes('RAP3') || upperHeader.includes('AA3')) {
        rapIndex = 2;
      } else if (upperHeader.includes('GA4') || upperHeader.includes('RAP4') || upperHeader.includes('AA4')) {
        rapIndex = 3;
      } else if (currentEvidences.length > 0) {
        rapIndex = currentEvidences[currentEvidences.length - 1].rapIndex ?? 0;
      }

      // Generate clean ID
      const candidateId = `ev-${assignedNumero}`;
      const idExists =
        currentEvidences.some((e) => e.id === candidateId) ||
        newEvidencesCreated.some((e) => e.id === candidateId);
      const newId = idExists ? `ev-${assignedNumero}-${Date.now().toString(36).substring(2, 6)}` : candidateId;

      matchedEvidence = {
        id: newId,
        numero: assignedNumero,
        nombre: cleanName,
        defaultEstado: 'NO',
        observacion: '',
        rapIndex
      };

      newEvidencesCreated.push(matchedEvidence);
    }

    claimedExistingIds.add(matchedEvidence.id);

    columnMappings.push({
      colIndex,
      headerName: headerStr,
      type: 'evidence',
      evidenceId: matchedEvidence.id,
      evidenceNumero: matchedEvidence.numero,
      evidenceNombre: matchedEvidence.nombre
    });

    detectedEvidenceColumns.push({
      headerName: headerStr,
      evidenceId: matchedEvidence.id,
      evidenceNumero: matchedEvidence.numero,
      evidenceNombre: matchedEvidence.nombre,
      isNew: isNewEvidence
    });
  });

  // If no name column detected, pick first non-empty column
  let nameCol = columnMappings.find((c) => c.type === 'nombre');
  if (!nameCol && headerRow.length > 0) {
    const firstCol = columnMappings[0];
    if (firstCol) firstCol.type = 'nombre';
  }

  // Parse data rows
  const parsedApprentices: ParsedExcelApprentice[] = [];
  const existingDocsMap = new Map<string, Apprentice>();
  const existingNamesMap = new Map<string, Apprentice>();

  existingApprentices.forEach((app) => {
    if (app.documento) {
      const cleanDoc = app.documento.replace(/\D/g, '');
      if (cleanDoc) existingDocsMap.set(cleanDoc, app);
    }
    if (app.nombre) {
      existingNamesMap.set(normalizeText(app.nombre), app);
    }
  });

  let matchedWithExistingCount = 0;
  let newApprenticesCount = 0;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.every((c) => c === '' || c === undefined || c === null)) {
      continue;
    }

    let nombre = '';
    let documento = '';
    let correo = '';
    let telefono = '';
    const evidenciasStatus: Record<string, EvidenceStatus> = {};

    let totalSi = 0;
    let totalNo = 0;
    let totalCorregir = 0;
    let totalNa = 0;

    columnMappings.forEach((mapping) => {
      const cellVal = row[mapping.colIndex];
      const strVal = String(cellVal || '').trim();

      if (mapping.type === 'nombre') {
        nombre = strVal;
      } else if (mapping.type === 'documento') {
        documento = strVal.replace(/[^\d]/g, '');
      } else if (mapping.type === 'correo') {
        correo = strVal;
      } else if (mapping.type === 'telefono') {
        telefono = strVal;
      } else if (mapping.type === 'evidence' && mapping.evidenceId) {
        const status = parseEvidenceStatusValue(cellVal);
        evidenciasStatus[mapping.evidenceId] = status;
        if (status === 'SI') totalSi++;
        else if (status === 'NO') totalNo++;
        else if (status === 'CORREGIR') totalCorregir++;
        else totalNa++;
      }
    });

    // Fallback: If no dedicated name column was identified, look across cells
    if (!nombre && row.length > 0) {
      const textCell = row.find((c) => typeof c === 'string' && c.trim().length > 3 && !/^\d+$/.test(c.trim()));
      if (textCell) nombre = String(textCell).trim();
    }

    // Skip header-like repeats
    if (!nombre || normalizeText(nombre) === 'nombre' || normalizeText(nombre) === 'nombre del aprendiz') {
      continue;
    }

    // Match with existing apprentice
    const cleanDoc = documento.replace(/\D/g, '');
    let matchedExisting: Apprentice | undefined = undefined;
    if (cleanDoc && existingDocsMap.has(cleanDoc)) {
      matchedExisting = existingDocsMap.get(cleanDoc);
    } else if (nombre && existingNamesMap.has(normalizeText(nombre))) {
      matchedExisting = existingNamesMap.get(normalizeText(nombre));
    }

    if (matchedExisting) {
      matchedWithExistingCount++;
    } else {
      newApprenticesCount++;
    }

    // Generate clean email if empty
    const cleanEmail =
      correo ||
      (matchedExisting?.correo
        ? matchedExisting.correo
        : `${normalizeText(nombre).replace(/\s+/g, '.')}@misena.edu.co`);

    parsedApprentices.push({
      id: matchedExisting ? matchedExisting.id : `app-excel-${Date.now()}-${r}`,
      nombre,
      documento: documento || matchedExisting?.documento || '',
      correo: cleanEmail,
      telefono: telefono || matchedExisting?.telefono || '',
      evidenciasStatus,
      matchedWithExistingId: matchedExisting?.id,
      totalSi,
      totalNo,
      totalCorregir,
      totalNa
    });
  }

  const updatedEvidences = [...currentEvidences];
  newEvidencesCreated.forEach((ne) => {
    if (!updatedEvidences.some((e) => e.id === ne.id)) {
      updatedEvidences.push(ne);
    }
  });
  updatedEvidences.sort((a, b) => a.numero - b.numero);

  return {
    fileName: file.name,
    sheetName,
    totalRows: rawRows.length,
    apprentices: parsedApprentices,
    columnMappings,
    detectedEvidenceColumns,
    unmappedEvidenceColumns,
    newEvidencesFound: newEvidencesCreated,
    updatedEvidences,
    summary: {
      totalApprentices: parsedApprentices.length,
      matchedWithExisting: matchedWithExistingCount,
      newApprentices: newApprenticesCount,
      evidencesUpdated: detectedEvidenceColumns.length,
      newEvidencesCount: newEvidencesCreated.length
    }
  };
}

/**
 * Exports the complete apprentice matrix with current evidence states to an Excel file (.xlsx)
 * Includes both the dynamic data matrix sheet and an instruction guide sheet.
 */
export function exportEvidenceMatrixExcel(
  apprentices: Apprentice[],
  evidences: EvidenceItem[],
  fileName = 'Matriz_Evidencias_SENA.xlsx'
) {
  // 1. Build Data Sheet (Matriz_Calificaciones)
  const headers = [
    'Documento',
    'Nombre del Aprendiz',
    'Correo Electrónico',
    'Teléfono',
    ...evidences.map((ev) => `#${ev.numero} - ${ev.nombre}`)
  ];

  const rows = apprentices.map((app) => {
    const evidenceCells = evidences.map((ev) => {
      const status = (app.evidenciasStatus && app.evidenciasStatus[ev.id]) || ev.defaultEstado || 'NO';
      return status;
    });

    return [
      app.documento || '',
      app.nombre || '',
      app.correo || '',
      app.telefono || '',
      ...evidenceCells
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 16 }, // Documento
    { wch: 38 }, // Nombre del Aprendiz
    { wch: 32 }, // Correo Electrónico
    { wch: 16 }, // Teléfono
    ...evidences.map(() => ({ wch: 18 })) // Evidences
  ];
  ws['!cols'] = colWidths;

  // 2. Build Guide & Instructions Sheet (Guia_Instrucciones)
  const guideData = [
    ['SERVICIO NACIONAL DE APRENDIZAJE - SENA'],
    ['GUÍA DE EDICIÓN Y ACTUALIZACIÓN DE LA MATRIZ DE EVIDENCIAS EN EXCEL'],
    [''],
    ['Instrucción General:', 'Puede editar los valores de las calificaciones de cada aprendiz en la hoja "Matriz_Calificaciones".'],
    ['Actualización Automática:', 'Al terminar, guarde el archivo y vuelva a cargarlo en el botón "Cargar Excel" de la aplicación.'],
    [''],
    ['VALORES ACEPTADOS EN LAS COLUMNAS DE EVIDENCIA:', 'SIGNIFICADO EN EL SISTEMA SENA:'],
    ['SI / A / APROBADO / PRESENTÓ / ENTREGÓ', 'Evidencia Aprobada (No genera llamado de atención para esta evidencia)'],
    ['NO / D / NO APROBADO / PENDIENTE / FALTA', 'Evidencia No Aprobada (Genera llamado de atención oficial)'],
    ['CORREGIR / C / POR CORREGIR / AJUSTAR', 'Evidencia Por Corregir (Indicador de ajuste pendiente)'],
    ['- / NA / NO APLICA / EXONERADO', 'No Aplica / Exonerado (No se computa como incumplimiento)'],
    [''],
    ['AGREGAR O MODIFICAR APRENDICES:', ''],
    ['- Para añadir un nuevo aprendiz:', 'Agregue una nueva fila al final con Documento, Nombre y sus calificaciones.'],
    ['- Para corregir un nombre o cédula:', 'Edite la celda correspondiente. El sistema actualizará el aprendiz en la aplicación.']
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 45 }, { wch: 65 }];

  // 3. Create Workbook and Append Sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Matriz_Calificaciones');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Guia_Instrucciones');

  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
