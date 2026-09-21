import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Apprentice, EvidenceItem, EvidenceStatus, GeneralInfo, SignatureConfig } from '../types';
import { getSenaLogoDataUrl } from './senaLogo';
import { getEvidenceRapInfo } from './rapUtils';

/**
 * Extracts Guía number from evidence name (e.g. GA1 -> 1, GA2 -> 2, Guía 1 -> 1)
 */
export function extractGuiaNumber(evidence: EvidenceItem, fallbackIndex: number): number {
  if (evidence.nombre) {
    const match = evidence.nombre.match(/G(?:A|U[IÍ]A)\s*[-_]?\s*(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  if (evidence.rapIndex !== undefined && evidence.rapIndex >= 0) {
    return evidence.rapIndex + 1;
  }
  return fallbackIndex + 1;
}

export function getGuiaLabel(guiaNum: number): string {
  return `GUIA DE APRENDIZAJE Nº ${guiaNum}`;
}

export function getGuiaShortLabel(guiaNum: number): string {
  return `GUÍA ${guiaNum}`;
}

/**
 * Formats current date and time matching the SENA document footer:
 * e.g. "Generado el 21/9/2026 02:42 p. m."
 */
export function formatPlanillaDateTime(d = new Date()): string {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const isPm = hours >= 12;
  const amPm = isPm ? 'p. m.' : 'a. m.';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const strHours = String(hours).padStart(2, '0');
  return `${day}/${month}/${year} ${strHours}:${minutes} ${amPm}`;
}

export interface GuiaGroup {
  guiaNumber: number;
  guiaLabel: string;
  colSpan: number;
}

export function buildGuiaGroups(evidences: EvidenceItem[]): GuiaGroup[] {
  if (evidences.length === 0) return [];
  const groups: GuiaGroup[] = [];
  let currentNum = extractGuiaNumber(evidences[0], 0);
  let currentSpan = 1;

  for (let i = 1; i < evidences.length; i++) {
    const num = extractGuiaNumber(evidences[i], i);
    if (num === currentNum) {
      currentSpan++;
    } else {
      groups.push({
        guiaNumber: currentNum,
        guiaLabel: getGuiaLabel(currentNum),
        colSpan: currentSpan
      });
      currentNum = num;
      currentSpan = 1;
    }
  }
  groups.push({
    guiaNumber: currentNum,
    guiaLabel: getGuiaLabel(currentNum),
    colSpan: currentSpan
  });
  return groups;
}

export interface PlanillaPdfOptions {
  apprentices: Apprentice[];
  evidences: EvidenceItem[];
  generalInfo: GeneralInfo;
  signatureConfig?: SignatureConfig;
  includeConventions?: boolean;
  fileName?: string;
}

/**
 * Generates the official SENA "Planilla de Aprendices Activos" PDF in Landscape format.
 * Exactly replicates the format, headers, multi-row guide grouping, evidence status colors,
 * tracking totals, and RAP conventions table.
 */
export async function generateActiveApprenticesPlanillaPdf(
  options: PlanillaPdfOptions
): Promise<{ doc: jsPDF; fileName: string; blob: Blob }> {
  const {
    apprentices,
    evidences,
    generalInfo,
    signatureConfig,
    includeConventions = true
  } = options;

  // Initialize Landscape Letter Document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter' // 279.4 x 215.9 mm
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 279.4 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 215.9 mm
  const marginLeft = 10;
  const marginRight = 10;
  const marginTop = 8;
  const marginBottom = 12;
  const printableWidth = pageWidth - marginLeft - marginRight; // ~259.4 mm

  // Safe fallback for generalInfo
  const gInfo = generalInfo || ({} as GeneralInfo);

  // Retrieve SENA logo
  let logoDataUrl = gInfo.senaLogoUrl || '';
  if (!logoDataUrl) {
    try {
      logoDataUrl = await getSenaLogoDataUrl();
    } catch {
      logoDataUrl = '';
    }
  }

  // Instructor name resolution
  const instructorName =
    signatureConfig?.instructorName ||
    gInfo.nombreInstructorLlamado ||
    gInfo.nombreInstructorAsignado ||
    '';

  const codigoFicha = gInfo.codigoFicha || '3466175';
  const programa = gInfo.programa || 'Desarrollo de videojuegos y entornos interactivos';
  const competencia = gInfo.competencia || 'Interactuar en lengua inglesa de forma oral y escrita';
  const generationTimeStr = formatPlanillaDateTime();

  // Helper to draw the official Page 1 Top Header
  const drawPage1Header = () => {
    let headerTextX = marginLeft;

    // 1. Logo (Left)
    if (logoDataUrl) {
      try {
        const logoWidth = 13.5;
        const logoHeight = 15;
        const isPng = logoDataUrl.startsWith('data:image/png') || !logoDataUrl.startsWith('data:image/jpeg');
        doc.addImage(logoDataUrl, isPng ? 'PNG' : 'JPEG', marginLeft, marginTop, logoWidth, logoHeight);
        headerTextX = marginLeft + logoWidth + 3.5;
      } catch {
        headerTextX = marginLeft;
      }
    }

    // 2. Header Titles (Center-Left)
    let textY = marginTop + 3.2;

    // Line 1: SERVICIO NACIONAL DE APRENDIZAJE SENA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 112, 60); // Official SENA Green (#00703c)
    doc.text('SERVICIO NACIONAL DE APRENDIZAJE SENA', headerTextX, textY);
    textY += 3.8;

    // Line 2: DIRECCIÓN DE FORMACIÓN PROFESIONAL • REGISTRO Y SEGUIMIENTO DE EVIDENCIAS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('DIRECCIÓN DE FORMACIÓN PROFESIONAL • REGISTRO Y SEGUIMIENTO DE EVIDENCIAS', headerTextX, textY);
    textY += 3.4;

    // Line 3: FICHA: ... | PROGRAMA: ...
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42); // Slate 900
    const fichaProgText = `FICHA: ${codigoFicha} | PROGRAMA: ${programa}`;
    doc.text(fichaProgText, headerTextX, textY);
    textY += 3.2;

    // Line 4: COMPETENCIA: ...
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85); // Slate 700
    const compText = `COMPETENCIA: ${competencia}`;
    const truncatedComp = doc.splitTextToSize(compText, printableWidth - (headerTextX - marginLeft) - 60);
    doc.text(truncatedComp[0] || compText, headerTextX, textY);

    // 3. Instructor Name (Top Right)
    if (instructorName.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      const instLabel = `Instructor: ${instructorName}`;
      doc.text(instLabel, pageWidth - marginRight, marginTop + 4.5, { align: 'right' });
    }
  };

  // Draw Page 1 Top Header
  drawPage1Header();

  // -------------------------------------------------------------
  // Build Main Table Structure
  // -------------------------------------------------------------
  const guiaGroups = buildGuiaGroups(evidences);

  // Super Header Row (Row 1)
  const superHeaderRow: any[] = [
    {
      content: `LISTADO DE EVIDENCIAS ${competencia.toUpperCase()} - ${programa.toUpperCase()} ${codigoFicha}`.trim(),
      colSpan: 2,
      styles: {
        halign: 'center',
        valign: 'middle',
        fontStyle: 'bold',
        fontSize: 5,
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        lineWidth: 0.2,
        lineColor: [51, 65, 85],
        cellPadding: 1
      }
    }
  ];

  guiaGroups.forEach((g) => {
    superHeaderRow.push({
      content: g.guiaLabel,
      colSpan: g.colSpan,
      styles: {
        halign: 'center',
        valign: 'middle',
        fontStyle: 'bold',
        fontSize: 6,
        fillColor: [236, 245, 236], // subtle pastel green
        textColor: [20, 83, 45],
        lineWidth: 0.2,
        lineColor: [51, 65, 85],
        cellPadding: 1
      }
    });
  });

  superHeaderRow.push({
    content: 'SEGUIMIENTO',
    colSpan: 2,
    styles: {
      halign: 'center',
      valign: 'middle',
      fontStyle: 'bold',
      fontSize: 6,
      fillColor: [226, 232, 240], // subtle slate
      textColor: [15, 23, 42],
      lineWidth: 0.2,
      lineColor: [51, 65, 85],
      cellPadding: 1
    }
  });

  // Second Header Row (RAP Row)
  const rapHeaderRow: any[] = [
    {
      content: 'No.\nDe\nlista',
      rowSpan: 3,
      styles: {
        halign: 'center',
        valign: 'middle',
        fontStyle: 'bold',
        fontSize: 5.5,
        fillColor: [255, 255, 255],
        textColor: [15, 23, 42],
        lineWidth: 0.2,
        lineColor: [51, 65, 85],
        cellPadding: 0.8
      }
    },
    {
      content: 'NOMBRE DEL APRENDIZ',
      rowSpan: 3,
      styles: {
        halign: 'left',
        valign: 'middle',
        fontStyle: 'bold',
        fontSize: 6.5,
        fillColor: [255, 255, 255],
        textColor: [15, 23, 42],
        lineWidth: 0.2,
        lineColor: [51, 65, 85],
        cellPadding: [1, 2]
      }
    }
  ];

  evidences.forEach((ev) => {
    const rapInfo = getEvidenceRapInfo(ev, generalInfo);
    rapHeaderRow.push({
      content: rapInfo.shortTitle || `RAP ${rapInfo.rapIndex + 1}`,
      styles: {
        halign: 'center',
        valign: 'middle',
        fontStyle: 'bold',
        fontSize: 6,
        fillColor: [248, 250, 252],
        textColor: [15, 23, 42],
        lineWidth: 0.2,
        lineColor: [51, 65, 85],
        cellPadding: 0.8
      }
    });
  });

  rapHeaderRow.push(
    {
      content: 'TOTAL\nPRES.',
      rowSpan: 3,
      styles: {
        halign: 'center',
        valign: 'middle',
        fontStyle: 'bold',
        fontSize: 5.5,
        fillColor: [230, 244, 234], // pastel green
        textColor: [19, 115, 51],
        lineWidth: 0.2,
        lineColor: [51, 65, 85],
        cellPadding: 0.8
      }
    },
    {
      content: 'TOTAL\nPEND.',
      rowSpan: 3,
      styles: {
        halign: 'center',
        valign: 'middle',
        fontStyle: 'bold',
        fontSize: 5.5,
        fillColor: [252, 232, 230], // pastel pink
        textColor: [197, 34, 31],
        lineWidth: 0.2,
        lineColor: [51, 65, 85],
        cellPadding: 0.8
      }
    }
  );

  // Third Header Row (Evidence titles/codes)
  const titleHeaderRow: any[] = [];
  evidences.forEach((ev) => {
    titleHeaderRow.push({
      content: ev.nombre.trim(),
      styles: {
        halign: 'center',
        valign: 'middle',
        fontSize: 4.6,
        fontStyle: 'normal',
        fillColor: [255, 255, 255],
        textColor: [15, 23, 42],
        lineWidth: 0.2,
        lineColor: [51, 65, 85],
        cellPadding: 0.8
      }
    });
  });

  // Fourth Header Row (ENTREGÓ / APROBÓ)
  const entregaHeaderRow: any[] = [];
  evidences.forEach(() => {
    entregaHeaderRow.push({
      content: 'ENTREGÓ / APROBÓ\n(SI O NO)',
      styles: {
        halign: 'center',
        valign: 'middle',
        fontSize: 4.2,
        fontStyle: 'bold',
        fillColor: [248, 250, 252],
        textColor: [71, 85, 105],
        lineWidth: 0.2,
        lineColor: [51, 65, 85],
        cellPadding: 0.6
      }
    });
  });

  const fullHead = [superHeaderRow, rapHeaderRow, titleHeaderRow, entregaHeaderRow];

  // -------------------------------------------------------------
  // Build Main Table Body Rows
  // -------------------------------------------------------------
  const bodyRows: any[][] = [];
  const apprenticeCompletionMap = new Map<number, boolean>();

  apprentices.forEach((app, appIdx) => {
    const listNum = String(appIdx + 1);
    const rowCells: any[] = [listNum, app.nombre];

    let presCount = 0;
    let pendCount = 0;

    evidences.forEach((ev) => {
      const status: EvidenceStatus =
        (app.evidenciasStatus && app.evidenciasStatus[ev.id]) ||
        ev.defaultEstado ||
        'NO';

      if (status === 'SI') {
        presCount++;
      } else if (status === 'NO' || status === 'CORREGIR') {
        pendCount++;
      }

      rowCells.push(status);
    });

    rowCells.push(String(presCount));
    rowCells.push(String(pendCount));

    const isAllApproved = presCount === evidences.length && evidences.length > 0;
    apprenticeCompletionMap.set(appIdx, isAllApproved);

    bodyRows.push(rowCells);
  });

  // Calculate Column Widths
  const col0Width = 10; // No. lista
  const col1Width = 58; // Nombre aprendiz
  const colTotalPresWidth = 12; // TOTAL PRES.
  const colTotalPendWidth = 12; // TOTAL PEND.
  const availableForEvidences = printableWidth - col0Width - col1Width - colTotalPresWidth - colTotalPendWidth;
  const evColWidth = evidences.length > 0 ? Math.max(16, availableForEvidences / evidences.length) : 20;

  const columnStyles: Record<number, any> = {
    0: { cellWidth: col0Width, halign: 'center' },
    1: { cellWidth: col1Width, halign: 'left' }
  };

  evidences.forEach((_, evIdx) => {
    columnStyles[2 + evIdx] = { cellWidth: evColWidth, halign: 'center' };
  });

  const lastColIdx1 = 2 + evidences.length;
  const lastColIdx2 = 3 + evidences.length;
  columnStyles[lastColIdx1] = { cellWidth: colTotalPresWidth, halign: 'center' };
  columnStyles[lastColIdx2] = { cellWidth: colTotalPendWidth, halign: 'center' };

  // Generate Main Table with autoTable
  autoTable(doc, {
    head: fullHead,
    body: bodyRows,
    startY: 27,
    margin: { top: 12, bottom: 14, left: marginLeft, right: marginRight },
    styles: {
      fontSize: 5.8,
      cellPadding: 0.8,
      lineWidth: 0.2,
      lineColor: [51, 65, 85],
      valign: 'middle'
    },
    theme: 'grid',
    columnStyles,
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowIdx = data.row.index;
        const colIdx = data.column.index;
        const isAllApproved = apprenticeCompletionMap.get(rowIdx);

        // Highlight top completion apprentices (like in official SENA sheet)
        if (isAllApproved && (colIdx === 0 || colIdx === 1)) {
          data.cell.styles.fillColor = [224, 242, 254]; // soft cyan/blue (#e0f2fe)
          data.cell.styles.textColor = [3, 105, 161];
          data.cell.styles.fontStyle = 'bold';
        }

        // Evidence Status Cells
        if (colIdx >= 2 && colIdx < 2 + evidences.length) {
          const val = String(data.cell.raw).trim().toUpperCase();
          if (val === 'SI') {
            data.cell.styles.fillColor = [198, 239, 206]; // SENA soft green (#c6efce)
            data.cell.styles.textColor = [0, 97, 0]; // Dark green (#006100)
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'NO') {
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.textColor = [185, 28, 28]; // Red (#b91c1c)
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'CORREGIR') {
            data.cell.styles.fillColor = [255, 235, 156]; // Light amber (#ffeb9c)
            data.cell.styles.textColor = [156, 101, 0]; // Brown/amber (#9c6500)
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 5;
          } else if (val === '-') {
            data.cell.styles.textColor = [148, 163, 184];
          }
        }

        // TOTAL PRES. Cell
        if (colIdx === lastColIdx1) {
          data.cell.styles.fontStyle = 'bold';
          const presVal = parseInt(String(data.cell.raw), 10) || 0;
          if (presVal === evidences.length && evidences.length > 0) {
            data.cell.styles.fillColor = [198, 239, 206];
            data.cell.styles.textColor = [0, 97, 0];
          } else {
            data.cell.styles.textColor = [21, 128, 61];
          }
        }

        // TOTAL PEND. Cell
        if (colIdx === lastColIdx2) {
          data.cell.styles.fontStyle = 'bold';
          const pendVal = parseInt(String(data.cell.raw), 10) || 0;
          if (pendVal > 0) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fillColor = [254, 242, 242];
          } else {
            data.cell.styles.textColor = [100, 116, 139];
          }
        }
      }
    }
  });

  // -------------------------------------------------------------
  // Build Conventions Table (Convenciones de RAPs)
  // -------------------------------------------------------------
  if (includeConventions && evidences.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    const conventionsNeededHeight = 12 + evidences.length * 4.8;
    const availableSpace = pageHeight - marginBottom - finalY;

    let startConventionsY = finalY + 6;
    if (availableSpace < conventionsNeededHeight) {
      doc.addPage('letter', 'landscape');
      startConventionsY = marginTop + 4;
    }

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      'CONVENCIONES: EVIDENCIAS DE APRENDIZAJE Y RESULTADOS DE APRENDIZAJE ASOCIADOS (RAPS)',
      marginLeft,
      startConventionsY
    );

    const conventionsHead = [
      ['N°', 'GUÍA', 'CÓDIGO Y NOMBRE DE LA EVIDENCIA', 'RAP', 'RESULTADO DE APRENDIZAJE ASOCIADO (DESCRIPCIÓN COMPLETA)']
    ];

    const conventionsBody: any[][] = [];
    evidences.forEach((ev, idx) => {
      const guiaNum = extractGuiaNumber(ev, idx);
      const rapInfo = getEvidenceRapInfo(ev, generalInfo);
      conventionsBody.push([
        `#${String(idx + 1).padStart(2, '0')}`,
        getGuiaShortLabel(guiaNum),
        ev.nombre,
        rapInfo.shortTitle || `RAP ${rapInfo.rapIndex + 1}`,
        rapInfo.fullText || rapInfo.title
      ]);
    });

    autoTable(doc, {
      head: conventionsHead,
      body: conventionsBody,
      startY: startConventionsY + 2.5,
      margin: { top: 12, bottom: 14, left: marginLeft, right: marginRight },
      theme: 'grid',
      headStyles: {
        fillColor: [198, 239, 206], // SENA light green accent
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6.2,
        lineWidth: 0.2,
        lineColor: [51, 65, 85],
        cellPadding: 1
      },
      bodyStyles: {
        fontSize: 5.5,
        cellPadding: 1,
        lineWidth: 0.15,
        lineColor: [148, 163, 184],
        textColor: [15, 23, 42]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 16, halign: 'center' },
        2: { cellWidth: 68, halign: 'left' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 'auto', halign: 'left' }
      }
    });
  }

  // -------------------------------------------------------------
  // Draw Uniform Footers on all pages
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // Slate 500

    const footerY = pageHeight - 6.5;

    // Left footer: Página X • Servicio Nacional de Aprendizaje SENA • Dirección de Formación Profesional • Ficha [Ficha]
    const leftFooter = `Página ${i} • Servicio Nacional de Aprendizaje SENA • Dirección de Formación Profesional • Ficha ${codigoFicha}`;
    doc.text(leftFooter, marginLeft, footerY);

    // Right footer: Planilla de Aprendices Activos • Generado el [Fecha/Hora]
    const rightFooter = `Planilla de Aprendices Activos • Generado el ${generationTimeStr}`;
    doc.text(rightFooter, pageWidth - marginRight, footerY, { align: 'right' });
  }

  // Generate output filename
  const cleanFicha = codigoFicha.replace(/[^a-zA-Z0-9_-]/g, '') || 'SENA';
  const outFileName = options.fileName || `Planilla_Aprendices_Activos_Ficha_${cleanFicha}.pdf`;

  // Create Blob
  const blob = doc.output('blob');

  return { doc, fileName: outFileName, blob };
}

/**
 * Convenience helper to generate and trigger browser file download directly
 */
export async function downloadActiveApprenticesPlanillaPdf(
  options: PlanillaPdfOptions
): Promise<string> {
  const { doc, fileName } = await generateActiveApprenticesPlanillaPdf(options);
  doc.save(fileName);
  return fileName;
}
