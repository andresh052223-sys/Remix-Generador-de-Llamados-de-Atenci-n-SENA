import * as pdfjsLib from 'pdfjs-dist';
import { Apprentice, EvidenceItem, EvidenceStatus } from '../types';

// Configure pdfjs worker
if (typeof window !== 'undefined') {
  try {
    // CDN fallback worker for pdf.js in browser environments
    const pdfjsVersion = pdfjsLib.version || '4.10.38';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker setup warning:', e);
  }
}

export interface ParsedPdfResult {
  apprentices: Apprentice[];
  detectedEvidences: EvidenceItem[];
  pageCount: number;
  rawTextPreview: string;
  summary: {
    totalApprentices: number;
    withEvidencesCount: number;
    detectedEvidencesCount: number;
  };
}

interface TextItemWithPos {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extracts structured text line-by-line from a PDF file
 */
export async function extractPdfTextAndLines(file: File): Promise<{ pagesLines: string[][]; fullText: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  const pagesLines: string[][] = [];
  let fullText = '';

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by Y coordinate (within tolerance) to reconstruct rows
    const items: TextItemWithPos[] = [];
    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const tx = item.transform; // [scaleX, skewY, skewX, scaleY, transX, transY]
        items.push({
          str: item.str,
          x: tx[4],
          y: tx[5],
          width: item.width || 0,
          height: item.height || 0
        });
      }
    }

    // Sort items top-to-bottom (higher Y in PDF is higher on page), then left-to-right (lower X)
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 4) {
        return yDiff;
      }
      return a.x - b.x;
    });

    // Group items into lines
    const lines: string[] = [];
    let currentLineItems: TextItemWithPos[] = [];
    let currentLineY = items.length > 0 ? items[0].y : 0;

    for (const item of items) {
      if (currentLineItems.length === 0) {
        currentLineItems.push(item);
        currentLineY = item.y;
      } else if (Math.abs(item.y - currentLineY) <= 4.5) {
        currentLineItems.push(item);
      } else {
        // Line finished: sort items left-to-right
        currentLineItems.sort((a, b) => a.x - b.x);
        const lineStr = currentLineItems.map((it) => it.str).join(' ').trim();
        if (lineStr) {
          lines.push(lineStr);
        }
        currentLineItems = [item];
        currentLineY = item.y;
      }
    }

    if (currentLineItems.length > 0) {
      currentLineItems.sort((a, b) => a.x - b.x);
      const lineStr = currentLineItems.map((it) => it.str).join(' ').trim();
      if (lineStr) {
        lines.push(lineStr);
      }
    }

    pagesLines.push(lines);
    fullText += lines.join('\n') + '\n\n';
  }

  return { pagesLines, fullText, pageCount };
}

/**
 * Intelligent parser that extracts Apprentices and their Evidences from PDF lines
 */
export async function parseApprenticesAndEvidencesFromPdf(
  file: File,
  existingEvidences: EvidenceItem[] = []
): Promise<ParsedPdfResult> {
  const { pagesLines, fullText, pageCount } = await extractPdfTextAndLines(file);

  const detectedApprentices: Apprentice[] = [];
  const detectedEvidences: EvidenceItem[] = [];
  const apprenticeMap = new Map<string, Apprentice>();

  // Helper to normalize clean words
  const cleanStr = (s: string) => s.replace(/\s+/g, ' ').trim();

  // Pattern 1: Look for potential evidence headers / codes in the text
  // e.g. "AA1-EV01", "GA1-240201524", "Evidencia 1", "Taller", "Foro", "Cuestionario", "Infografia"
  const allLines = pagesLines.flat();
  const evidenceCodeRegex = /(GA\d+-\w+-AA\d+-EV\d+|AA\d+-EV\d+|EVIDENCIA\s*\d+|TALLER\s*\d+|FORO\s*[\w\s]+|CUESTIONARIO\s*[\w\s]+)/gi;
  
  const foundEvidenceNames = new Set<string>();
  for (const line of allLines) {
    const matches = line.match(evidenceCodeRegex);
    if (matches) {
      matches.forEach((m) => foundEvidenceNames.add(cleanStr(m)));
    }
  }

  // If found evidence codes, create EvidenceItem templates
  let evIndex = 1;
  foundEvidenceNames.forEach((evName) => {
    detectedEvidences.push({
      id: `ev-pdf-${Date.now()}-${evIndex}`,
      numero: evIndex,
      nombre: evName,
      defaultEstado: 'NO',
      observacion: 'Pendiente de entrega según reporte'
    });
    evIndex++;
  });

  // Effective evidence reference list: use existing ones, or combine with detected ones
  const targetEvidences = existingEvidences.length > 0 ? existingEvidences : detectedEvidences;

  // Let's parse apprentices from the lines:
  // Detect patterns such as:
  // - Document (6-11 digits, or formatted with dots 1.098.765.432)
  // - Names (Spanish names uppercase or title case)
  // - Emails
  // - Statuses (A, D, APROBO, NO APROBO, SI, NO, CUMPLE, NO CUMPLE)

  const docRegex = /\b(\d{1,3}(?:\.\d{3}){2,3}|\d{7,11})\b/;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

  // Check table row pattern across all lines
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const docMatch = line.match(docRegex);
    const emailMatch = line.match(emailRegex);

    // Skip generic system header lines
    const lower = line.toLowerCase();
    if (
      lower.includes('servicio nacional') ||
      lower.includes('sistema integrado') ||
      lower.includes('regional') ||
      lower.includes('centro de formaci') ||
      lower.includes('llamado de atenci') ||
      lower.includes('codigo de la ficha') ||
      lower.includes('fecha de impresi') ||
      lower.includes('pagina ') ||
      lower.includes('reporte de juicios')
    ) {
      // Could be header, check if next lines have apprentice
      continue;
    }

    if (docMatch) {
      const rawDoc = docMatch[1];
      const cleanDoc = rawDoc.replace(/\./g, '');
      const email = emailMatch ? emailMatch[1] : '';

      // Extract apprentice name from the line by removing doc number, email and status tokens
      let namePart = line
        .replace(rawDoc, '')
        .replace(email, '')
        .replace(/\b(CC|TI|CE|PEP|PPT|PAS|PASAPORTE|C\.C\.|T\.I\.)\b/gi, '')
        .replace(/\b(APROBADO|NO APROBADO|APROBÓ|NO APROBÓ|CUMPLE|NO CUMPLE|DEFICIENTE|EXCELENTE|EN FORMACION|CANCELADO|RETIRO VOLUNTARIO|CONDICIONADO|INDUCCION|MATRICULADO)\b/gi, '')
        .replace(/[-_#|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Clean up leading numbers (like index "1", "01.")
      namePart = namePart.replace(/^(\d+[\.\-\s]+)+/, '').trim();

      // Only accept if name has at least 4 letters
      if (namePart.length >= 4 && !namePart.toLowerCase().includes('documento') && !namePart.toLowerCase().includes('aprendiz')) {
        const idKey = cleanDoc || namePart.toLowerCase();

        // Detect evidence status if present in the line or adjacent tokens
        const evStatus: Record<string, EvidenceStatus> = {};

        // Check if there are indicators like "NO APROBO", "D", "A", "CUMPLE", "NO CUMPLE"
        const hasAprobado = /\b(A|APROBO|APROBADO|CUMPLE|SI|100)\b/i.test(line);
        const hasNoAprobado = /\b(D|NO APROBO|NO APROBÓ|NO CUMPLE|NO|DEFICIENTE|0)\b/i.test(line);

        // Assign evidence statuses based on target evidences
        targetEvidences.forEach((ev, idx) => {
          // If the line contains specific evidence indicators
          if (hasNoAprobado) {
            evStatus[ev.id] = 'NO';
          } else if (hasAprobado) {
            evStatus[ev.id] = idx === 0 ? 'SI' : 'NO'; // default to partial or specific
          } else {
            evStatus[ev.id] = ev.defaultEstado || 'NO';
          }
        });

        if (!apprenticeMap.has(idKey)) {
          const newApp: Apprentice = {
            id: `app-pdf-${Date.now()}-${detectedApprentices.length}`,
            nombre: cleanStr(namePart),
            documento: cleanDoc,
            correo: email || `${cleanStr(namePart).toLowerCase().replace(/[^a-z0-9]/g, '')}@misena.edu.co`,
            telefono: '',
            evidenciasStatus: evStatus,
            observacionesEspecificas: '',
            juicioEspecifico: hasNoAprobado ? 'NO_APROBO' : 'NO_APROBO'
          };
          apprenticeMap.set(idKey, newApp);
          detectedApprentices.push(newApp);
        }
      }
    } else if (emailMatch) {
      // Has email but no doc number on this line
      const email = emailMatch[1];
      let namePart = line
        .replace(email, '')
        .replace(/\b(CC|TI|CE|PEP|PPT)\b/gi, '')
        .replace(/[-_#|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      namePart = namePart.replace(/^(\d+[\.\-\s]+)+/, '').trim();

      if (namePart.length >= 4 && !namePart.toLowerCase().includes('correo')) {
        const idKey = email.toLowerCase();
        if (!apprenticeMap.has(idKey)) {
          const newApp: Apprentice = {
            id: `app-pdf-${Date.now()}-${detectedApprentices.length}`,
            nombre: cleanStr(namePart),
            documento: '',
            correo: email,
            telefono: '',
            evidenciasStatus: {},
            observacionesEspecificas: '',
            juicioEspecifico: 'NO_APROBO'
          };
          apprenticeMap.set(idKey, newApp);
          detectedApprentices.push(newApp);
        }
      }
    }
  }

  // Fallback: If no document pattern matched, try block or multi-line names
  if (detectedApprentices.length === 0) {
    for (let i = 0; i < allLines.length; i++) {
      const line = cleanStr(allLines[i]);
      // Pattern: "APELLIDOS NOMBRES" or line with 2 to 5 words all in letters
      if (/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{6,50}$/.test(line)) {
        const lower = line.toLowerCase();
        if (
          !lower.includes('servicio') &&
          !lower.includes('sena') &&
          !lower.includes('regional') &&
          !lower.includes('centro') &&
          !lower.includes('programa') &&
          !lower.includes('ficha') &&
          !lower.includes('llamado') &&
          !lower.includes('atencion') &&
          !lower.includes('instructor') &&
          !lower.includes('observaciones') &&
          !lower.includes('competencia') &&
          !lower.includes('resultado')
        ) {
          detectedApprentices.push({
            id: `app-pdf-${Date.now()}-${detectedApprentices.length}`,
            nombre: line,
            documento: '',
            correo: `${line.toLowerCase().replace(/[^a-z0-9]/g, '')}@misena.edu.co`,
            telefono: '',
            evidenciasStatus: {},
            observacionesEspecificas: '',
            juicioEspecifico: 'NO_APROBO'
          });
        }
      }
    }
  }

  const withEvidencesCount = detectedApprentices.filter(
    (a) => a.evidenciasStatus && Object.keys(a.evidenciasStatus).length > 0
  ).length;

  return {
    apprentices: detectedApprentices,
    detectedEvidences,
    pageCount,
    rawTextPreview: fullText.slice(0, 1500),
    summary: {
      totalApprentices: detectedApprentices.length,
      withEvidencesCount,
      detectedEvidencesCount: detectedEvidences.length
    }
  };
}
