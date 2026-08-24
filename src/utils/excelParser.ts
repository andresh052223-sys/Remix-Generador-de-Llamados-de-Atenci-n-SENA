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
  }[];
  unmappedEvidenceColumns: string[];
  summary: {
    totalApprentices: number;
    matchedWithExisting: number;
    newApprentices: number;
    evidencesUpdated: number;
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

  // Find header row (inspect first 10 rows)
  let headerRowIndex = 0;
  let maxMatchedCols = 0;

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    row.forEach((cell) => {
      const norm = normalizeText(String(cell));
      if (
        norm.includes('nombre') ||
        norm.includes('aprendiz') ||
        norm.includes('documento') ||
        norm.includes('cedula') ||
        norm.includes('identificacion') ||
        norm.includes('correo') ||
        norm.includes('email') ||
        norm.includes('evidencia') ||
        norm.startsWith('ev') ||
        norm.startsWith('aa') ||
        norm.startsWith('rap')
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

  // Match columns
  headerRow.forEach((colVal, colIndex) => {
    const headerStr = String(colVal || '').trim();
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
      norm.includes('num_doc')
    ) {
      columnMappings.push({ colIndex, headerName: headerStr, type: 'documento' });
      return;
    }

    // Check Name
    if (
      norm.includes('nombre') ||
      norm.includes('aprendiz') ||
      norm.includes('estudiante') ||
      norm.includes('alumno') ||
      norm.includes('nombres y apellidos') ||
      norm === 'nombre' ||
      norm === 'apellidos y nombres'
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

    // Check Evidence column: match against currentEvidences
    let matchedEvidence: EvidenceItem | undefined;

    // Try by number: e.g. "#1 - ...", "#1", "1 - ...", "1. ...", "Evidencia 1", "E1", "EV01", or exact number
    const numMatch =
      headerStr.match(/^(?:#|\b)?\s*(\d+)\s*[-.:\)]/i) ||
      headerStr.match(/(?:evidencia|evid|ev|e|#|\b)\s*(\d+)/i) ||
      headerStr.match(/^(\d+)$/);

    if (numMatch) {
      const evNum = parseInt(numMatch[1], 10);
      matchedEvidence = currentEvidences.find((e) => e.numero === evNum);
    }

    // Try by evidence name or code
    if (!matchedEvidence) {
      matchedEvidence = currentEvidences.find((e) => {
        const evNorm = normalizeText(e.nombre);
        return norm.includes(evNorm) || evNorm.includes(norm);
      });
    }

    // Try by positional column order if headers say "Evidencia X"
    if (matchedEvidence) {
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
        evidenceNombre: matchedEvidence.nombre
      });
      return;
    }

    // If it looks like an evidence header but wasn't matched to existing evidences
    if (
      norm.includes('evidencia') ||
      norm.startsWith('ev') ||
      norm.startsWith('aa') ||
      norm.startsWith('rap') ||
      norm.includes('taller') ||
      norm.includes('informe') ||
      norm.includes('guia') ||
      norm.includes('foro') ||
      norm.includes('cuestionario')
    ) {
      unmappedEvidenceColumns.push(headerStr);
      columnMappings.push({ colIndex, headerName: headerStr, type: 'ignore' });
      return;
    }

    columnMappings.push({ colIndex, headerName: headerStr, type: 'ignore' });
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

  return {
    fileName: file.name,
    sheetName,
    totalRows: rawRows.length,
    apprentices: parsedApprentices,
    columnMappings,
    detectedEvidenceColumns,
    unmappedEvidenceColumns,
    summary: {
      totalApprentices: parsedApprentices.length,
      matchedWithExisting: matchedWithExistingCount,
      newApprentices: newApprenticesCount,
      evidencesUpdated: detectedEvidenceColumns.length
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
