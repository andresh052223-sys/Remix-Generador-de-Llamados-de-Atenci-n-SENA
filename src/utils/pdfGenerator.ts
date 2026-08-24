import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { Apprentice, EvidenceItem, GeneralInfo, SignatureConfig } from '../types';
import { getSenaLogoDataUrl } from './senaLogo';
import { evaluateApprenticeRaps, getRapShortTitle, getEvidenceRapInfo } from './rapUtils';

/**
 * Builds the complete vertical (Portrait) SENA Llamado de Atención document for a single apprentice.
 * Dynamically sizes the evidence table to ONLY include actual evidences, with zero blank filler rows.
 */
export async function buildApprenticePdf(
  doc: jsPDF,
  apprentice: Apprentice,
  generalInfo: GeneralInfo,
  evidences: EvidenceItem[],
  signatureConfig: SignatureConfig,
  logoDataUrl: string,
  startPageNumber = 1
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth(); // ~215.9 mm for portrait letter
  const pageHeight = doc.internal.pageSize.getHeight(); // ~279.4 mm for portrait letter
  const marginLeft = 14;
  const marginRight = 14;
  const marginTop = 12;
  const marginBottom = 12;
  const contentWidth = pageWidth - marginLeft - marginRight; // ~187.9 mm
  const maxPageY = pageHeight - marginBottom; // ~267.4 mm

  if (startPageNumber > 1) {
    doc.addPage('letter', 'portrait');
  }

  const left = marginLeft;
  let currY = marginTop;

  // =============================================================
  // 1. SENA Official Logo & Title
  // =============================================================
  if (logoDataUrl) {
    try {
      const logoWidth = 17;
      const logoHeight = 18.6;
      const logoX = left + (contentWidth - logoWidth) / 2;
      const isPng = logoDataUrl.startsWith('data:image/png') || !logoDataUrl.startsWith('data:image/jpeg');
      doc.addImage(logoDataUrl, isPng ? 'PNG' : 'JPEG', logoX, currY, logoWidth, logoHeight);
      currY += logoHeight + 2;
    } catch {
      currY += 12;
    }
  } else {
    currY += 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('LLAMADO DE ATENCION', left + contentWidth / 2, currY + 1, { align: 'center' });
  currY += 4.5;

  // =============================================================
  // 2. Header Information Box (Table)
  // =============================================================
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);

  // Row 1: Nombre del Programa | Codigo de la Ficha
  const colProgLabel = 36;
  const colProgVal = 82;
  const colFichaLabel = 32;
  const colFichaVal = contentWidth - colProgLabel - colProgVal - colFichaLabel;
  const r1H = 6.2;

  doc.rect(left, currY, contentWidth, r1H);
  doc.line(left + colProgLabel, currY, left + colProgLabel, currY + r1H);
  doc.line(left + colProgLabel + colProgVal, currY, left + colProgLabel + colProgVal, currY + r1H);
  doc.line(left + colProgLabel + colProgVal + colFichaLabel, currY, left + colProgLabel + colProgVal + colFichaLabel, currY + r1H);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Nombre del Programa:', left + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.programa || '', left + colProgLabel + 2, currY + 4.2, { maxWidth: colProgVal - 4 });

  doc.setFont('helvetica', 'bold');
  doc.text('Codigo de la Ficha:', left + colProgLabel + colProgVal + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'bold');
  doc.text(generalInfo.codigoFicha || '', left + colProgLabel + colProgVal + colFichaLabel + 2, currY + 4.2);
  currY += r1H;

  // Row 1.5: Centro de Formación | Modalidad
  const colCentroLabel = 36;
  const colCentroVal = 82;
  const colModalidadLabel = 32;
  const colModalidadVal = contentWidth - colCentroLabel - colCentroVal - colModalidadLabel;
  const rCentroH = 6.2;

  doc.rect(left, currY, contentWidth, rCentroH);
  doc.line(left + colCentroLabel, currY, left + colCentroLabel, currY + rCentroH);
  doc.line(left + colCentroLabel + colCentroVal, currY, left + colCentroLabel + colCentroVal, currY + rCentroH);
  doc.line(left + colCentroLabel + colCentroVal + colModalidadLabel, currY, left + colCentroLabel + colCentroVal + colModalidadLabel, currY + rCentroH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Centro de Formación:', left + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(
    generalInfo.centroFormacion || 'Centro de Comercio y Servicios Regional Tolima',
    left + colCentroLabel + 2,
    currY + 4.2,
    { maxWidth: colCentroVal - 4 }
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Modalidad:', left + colCentroLabel + colCentroVal + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(
    generalInfo.modalidad || 'Virtual',
    left + colCentroLabel + colCentroVal + colModalidadLabel + 2,
    currY + 4.2,
    { maxWidth: colModalidadVal - 4 }
  );
  currY += rCentroH;

  // Row 2: Nombre del Aprendiz | Correo
  const colAppLabel = 36;
  const colAppVal = 82;
  const colAppEmail = contentWidth - colAppLabel - colAppVal;
  const r2H = 6.2;

  doc.rect(left, currY, contentWidth, r2H);
  doc.line(left + colAppLabel, currY, left + colAppLabel, currY + r2H);
  doc.line(left + colAppLabel + colAppVal, currY, left + colAppLabel + colAppVal, currY + r2H);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre del Aprendiz:', left + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'normal');
  const apprenticeDisplay = apprentice.documento
    ? `${apprentice.nombre} (C.C. ${apprentice.documento})`
    : apprentice.nombre;
  doc.text(apprenticeDisplay, left + colAppLabel + 2, currY + 4.2, { maxWidth: colAppVal - 4 });
  doc.text(apprentice.correo || '', left + colAppLabel + colAppVal + 2, currY + 4.2, { maxWidth: colAppEmail - 4 });
  currY += r2H;

  // Row 3: Instructor asignado a la ficha académica
  const colInstLabel = 58;
  const r3H = 6.2;
  doc.rect(left, currY, contentWidth, r3H);
  doc.line(left + colInstLabel, currY, left + colInstLabel, currY + r3H);

  doc.setFont('helvetica', 'bold');
  doc.text('Instructor asignado a la ficha académica:', left + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.nombreInstructorAsignado || '', left + colInstLabel + 2, currY + 4.2);
  currY += r3H;

  // Row 3.5: Transversal
  const colTransLabel = 58;
  const rTransH = 6.2;
  doc.rect(left, currY, contentWidth, rTransH);
  doc.line(left + colTransLabel, currY, left + colTransLabel, currY + rTransH);

  doc.setFont('helvetica', 'bold');
  doc.text('Transversal:', left + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.transversal || 'Transversal Inglés', left + colTransLabel + 2, currY + 4.2);
  currY += rTransH;

  // Row 4: Motivo
  const colMotivoLabel = 26;
  const r4H = 7.0;
  doc.rect(left, currY, contentWidth, r4H);
  doc.line(left + colMotivoLabel, currY, left + colMotivoLabel, currY + r4H);

  doc.setFont('helvetica', 'bold');
  doc.text('Motivo', left + 1.5, currY + 4.6);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.motivo || '', left + colMotivoLabel + 2, currY + 4.6, {
    maxWidth: contentWidth - colMotivoLabel - 4
  });
  currY += r4H;

  // Row 5: Instructor que hace el llamado de atencion
  const colInst2Label = 62;
  const r5H = 6.2;
  doc.rect(left, currY, contentWidth, r5H);
  doc.line(left + colInst2Label, currY, left + colInst2Label, currY + r5H);

  doc.setFont('helvetica', 'bold');
  doc.text('Instructor que hace el llamado de atencion:', left + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.nombreInstructorLlamado || '', left + colInst2Label + 2, currY + 4.2);
  currY += r5H;

  // Row 5.5: Fechas y Plazos (Fecha de Entrega Llamado y Fecha Límite / Plazo de Evidencias)
  const rFechaH = 6.2;
  const splitMidX = left + 93;
  const colFecha1Label = 42;
  const colFecha2Label = 50;

  doc.rect(left, currY, contentWidth, rFechaH);
  doc.line(left + colFecha1Label, currY, left + colFecha1Label, currY + rFechaH);
  doc.line(splitMidX, currY, splitMidX, currY + rFechaH);
  doc.line(splitMidX + colFecha2Label, currY, splitMidX + colFecha2Label, currY + rFechaH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Fecha Entrega Llamado:', left + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.fechaEntregaLlamado || generalInfo.fecha || '-', left + colFecha1Label + 2, currY + 4.2);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha Límite / Plazo Evidencias:', splitMidX + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.text(generalInfo.fechaLimiteEvidencias || '-', splitMidX + colFecha2Label + 2, currY + 4.2);
  currY += rFechaH;

  // Row 6: Competencia
  const colCompLabel = 26;
  const r6H = 11.5;
  doc.rect(left, currY, contentWidth, r6H);
  doc.line(left + colCompLabel, currY, left + colCompLabel, currY + r6H);

  doc.setFont('helvetica', 'bold');
  doc.text('Competencia:', left + 1.5, currY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(generalInfo.competencia || '', left + colCompLabel + 2, currY + 4.0, {
    maxWidth: contentWidth - colCompLabel - 4,
    lineHeightFactor: 1.2
  });
  currY += r6H;

  // Helper function to wrap text with a narrower first line to accommodate inline tag badges
  const wrapTextWithIndent = (
    textToWrap: string,
    firstLineWidth: number,
    otherLinesWidth: number
  ): string[] => {
    const words = textToWrap.split(/\s+/).filter(Boolean);
    const wrappedLines: string[] = [];
    let currentLine = '';
    let isFirstLine = true;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const maxW = isFirstLine ? firstLineWidth : otherLinesWidth;
      const testW = doc.getTextWidth(testLine);
      if (testW <= maxW) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          wrappedLines.push(currentLine);
          isFirstLine = false;
          currentLine = word;
        } else {
          wrappedLines.push(word);
          isFirstLine = false;
          currentLine = '';
        }
      }
    }
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
    return wrappedLines.length > 0 ? wrappedLines : [''];
  };

  // Row 7: Resultados de Aprendizaje (con estado de aprobación por RAP para este aprendiz)
  const rapSummary = evaluateApprenticeRaps(apprentice, generalInfo, evidences);
  const colRaLabel = 26;
  const availableRaWidth = contentWidth - colRaLabel - 4; // ~157.9 mm

  interface ProcessedRapItem {
    statusLabel: string;
    isApproved: boolean;
    tagWidth: number;
    lines: string[];
  }
  const processedRaps: ProcessedRapItem[] = [];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);

  if (rapSummary.raps.length > 0) {
    rapSummary.raps.forEach((r) => {
      const statusLabel = r.isApproved ? '[APROBÓ]' : '[NO APROBÓ]';
      const pendingInfo = !r.isApproved && r.pendingEvidences.length > 0
        ? ` (Evidencias pendientes: ${r.pendingEvidences.map((e) => `#${e.numero}`).join(', ')})`
        : '';
      const cleanRapText = r.rapText
        .replace(/^(RAP\s*\d+|RAP-\d+|R\.A\.P\.\s*\d+|R\.A\.\s*\d+|RA\s*\d+)[\s:\-\.]*/i, '')
        .trim();
      const fullText = cleanRapText ? `${r.rapTitle}: ${cleanRapText}${pendingInfo}` : `${r.rapText}${pendingInfo}`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.0);
      const tagWidth = doc.getTextWidth(statusLabel) + 1.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.0);
      const firstLineMaxW = Math.max(20, availableRaWidth - tagWidth - 2);
      const otherLinesMaxW = Math.max(20, availableRaWidth - 3);
      const lines = wrapTextWithIndent(fullText, firstLineMaxW, otherLinesMaxW);

      processedRaps.push({
        statusLabel,
        isApproved: r.isApproved,
        tagWidth,
        lines
      });
    });
  } else {
    const rawRaps = Array.isArray(generalInfo.resultadosAprendizaje)
      ? generalInfo.resultadosAprendizaje
      : [generalInfo.resultadosAprendizaje || ''];
    rawRaps.forEach((r) => {
      if (r) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.0);
        const lines = wrapTextWithIndent(r, availableRaWidth - 2, availableRaWidth - 2);
        processedRaps.push({
          statusLabel: '',
          isApproved: false,
          tagWidth: 0,
          lines
        });
      }
    });
  }

  let totalRaLines = 0;
  processedRaps.forEach((p) => {
    totalRaLines += p.lines.length;
  });

  const rapSpacing = 1.0;
  const r7H = Math.max(16, Math.min(42, totalRaLines * 2.8 + Math.max(0, processedRaps.length - 1) * rapSpacing + 4.5));

  doc.rect(left, currY, contentWidth, r7H);
  doc.line(left + colRaLabel, currY, left + colRaLabel, currY + r7H);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Resultados de', left + 1.5, currY + 4.2);
  doc.text('Aprendizaje:', left + 1.5, currY + 7.5);

  let raTextY = currY + 3.6;
  processedRaps.forEach((rapItem) => {
    // Draw tag on line 0
    if (rapItem.statusLabel) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.0);
      if (rapItem.isApproved) {
        doc.setTextColor(20, 110, 50); // Green
      } else {
        doc.setTextColor(170, 20, 20); // Red
      }
      doc.text(rapItem.statusLabel, left + colRaLabel + 2, raTextY);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.0);
    doc.setTextColor(0, 0, 0);

    rapItem.lines.forEach((line, lIdx) => {
      if (raTextY <= currY + r7H - 1.2) {
        const lineX = lIdx === 0 && rapItem.statusLabel
          ? left + colRaLabel + 2 + rapItem.tagWidth + 1.5
          : left + colRaLabel + 3;
        doc.text(line, lineX, raTextY);
        raTextY += 2.8;
      }
    });

    raTextY += rapSpacing;
  });

  doc.setTextColor(0, 0, 0);
  currY += r7H;

  // Row 8: Observaciones que hace el aprendiz
  const colObsLabel = 54;
  const r8H = 7.5;
  doc.rect(left, currY, contentWidth, r8H);
  doc.line(left + colObsLabel, currY, left + colObsLabel, currY + r8H);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Observaciones que hace el aprendiz:', left + 1.5, currY + 4.8);
  doc.setFont('helvetica', 'normal');
  const obsText = apprentice.observacionAprendizEspecifica || generalInfo.observacionesAprendiz || '';
  if (obsText) {
    doc.text(obsText, left + colObsLabel + 2, currY + 4.8, {
      maxWidth: contentWidth - colObsLabel - 4
    });
  }
  currY += r8H + 3.5;

  // =============================================================
  // 3. Evidence Table (WITH RESULTADO DE APRENDIZAJE COLUMN)
  // =============================================================
  const colN = 7;
  const colRap = 42;
  const colEv = 68;
  const colSi = 11;
  const colNo = 11;
  const colObs = contentWidth - colN - colRap - colEv - colSi - colNo; // ~48.9 mm
  const rowH = 6.6;

  // Draw Table Header
  drawEvidenceTableHeader(doc, left, currY, contentWidth, colN, colRap, colEv, colSi, colNo, colObs);
  currY += 8.5;

  if (evidences.length === 0) {
    // Single informative row if no evidences exist
    doc.rect(left, currY, contentWidth, rowH);
    doc.line(left + colN, currY, left + colN, currY + rowH);
    doc.line(left + colN + colRap, currY, left + colN + colRap, currY + rowH);
    doc.line(left + colN + colRap + colEv, currY, left + colN + colRap + colEv, currY + rowH);
    doc.line(left + colN + colRap + colEv + colSi, currY, left + colN + colRap + colEv + colSi, currY + rowH);
    doc.line(left + colN + colRap + colEv + colSi + colNo, currY, left + colN + colRap + colEv + colSi + colNo, currY + rowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('1', left + colN / 2, currY + 4.5, { align: 'center' });
    doc.text('-', left + colN + 2, currY + 4.5);
    doc.text('Sin evidencias pendientes registradas', left + colN + colRap + 2, currY + 4.5);
    doc.text('-', left + colN + colRap + colEv + colSi + colNo / 2, currY + 4.5, { align: 'center' });
    currY += rowH;
  } else {
    // Render ONLY real evidences
    for (let i = 0; i < evidences.length; i++) {
      const ev = evidences[i];
      const rapInfo = getEvidenceRapInfo(ev, generalInfo);

      // Pre-calculate line wraps for RAP, Evidence name and Observation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      const rapLines = doc.splitTextToSize(rapInfo.title, colRap - 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      const evLines = doc.splitTextToSize(ev.nombre || '', colEv - 3);

      const appStatus = (apprentice.evidenciasStatus && apprentice.evidenciasStatus[ev.id]) || ev.defaultEstado || 'NO';
      const obs = ev.observacion || (appStatus === 'CORREGIR' ? 'Debe corregir y presentar ajustes' : '');
      doc.setFontSize(5.8);
      const obsLines = obs ? doc.splitTextToSize(obs, colObs - 3) : [];

      const maxLines = Math.max(rapLines.length, evLines.length, obsLines.length, 1);
      const actualRowH = Math.max(6.6, maxLines * 2.6 + 2.2);

      // Page break check if table overflows page
      if (currY + actualRowH > maxPageY - 8) {
        doc.addPage('letter', 'portrait');
        currY = marginTop;
        drawEvidenceTableHeader(doc, left, currY, contentWidth, colN, colRap, colEv, colSi, colNo, colObs);
        currY += 8.5;
      }

      doc.rect(left, currY, contentWidth, actualRowH);
      doc.line(left + colN, currY, left + colN, currY + actualRowH);
      doc.line(left + colN + colRap, currY, left + colN + colRap, currY + actualRowH);
      doc.line(left + colN + colRap + colEv, currY, left + colN + colRap + colEv, currY + actualRowH);
      doc.line(left + colN + colRap + colEv + colSi, currY, left + colN + colRap + colEv + colSi, currY + actualRowH);
      doc.line(left + colN + colRap + colEv + colSi + colNo, currY, left + colN + colRap + colEv + colSi + colNo, currY + actualRowH);

      const rowNum = i + 1;
      const markY = currY + (actualRowH / 2) + 1.2;

      // Col 1: Row Number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.text(`${rowNum}`, left + colN / 2, markY, { align: 'center' });

      // Col 2: Resultado de Aprendizaje
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      const rapStartY = currY + (actualRowH - rapLines.length * 2.5) / 2 + 1.8;
      rapLines.forEach((line: string, lIdx: number) => {
        doc.text(line, left + colN + 1.5, rapStartY + (lIdx * 2.5));
      });

      // Col 3: Evidencia
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      const evStartY = currY + (actualRowH - evLines.length * 2.6) / 2 + 1.9;
      evLines.forEach((line: string, lIdx: number) => {
        doc.text(line, left + colN + colRap + 1.5, evStartY + (lIdx * 2.6));
      });

      // Col 4 & 5: Status
      if (appStatus === 'SI') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.text('SI', left + colN + colRap + colEv + colSi / 2, markY, { align: 'center' });
      } else if (appStatus === 'CORREGIR') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.text('CORR', left + colN + colRap + colEv + colSi + colNo / 2, markY, { align: 'center' });
      } else if (appStatus === 'NO') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.text('NO', left + colN + colRap + colEv + colSi + colNo / 2, markY, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.0);
        doc.text('-', left + colN + colRap + colEv + colSi + colNo / 2, markY, { align: 'center' });
      }

      // Col 6: Observation
      if (obsLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        const obsStartY = currY + (actualRowH - obsLines.length * 2.5) / 2 + 1.8;
        obsLines.forEach((line: string, lIdx: number) => {
          doc.text(line, left + colN + colRap + colEv + colSi + colNo + 1.5, obsStartY + (lIdx * 2.5));
        });
      }

      currY += actualRowH;
    }
  }

  // =============================================================
  // 4. PLAN DE MEJORAMIENTO (Plan for Improvement Section)
  // =============================================================
  const isPlanActivo = generalInfo.planMejoramientoActivo ?? true;
  let planH = 0;
  const colPlanLabel = 44;
  const planActionsText = apprentice.planMejoramientoEspecifico || generalInfo.planMejoramientoDescripcion || 'El aprendiz deberá presentar y sustentar la totalidad de las evidencias pendientes o en estado de corrección en la plataforma institucional.';
  const planTipoText = (generalInfo.planMejoramientoTipo || 'Académico').toUpperCase();
  const planDeadlineText = generalInfo.planMejoramientoFechaLimite || generalInfo.fechaLimiteEvidencias || '-';
  const planCompromisoText = generalInfo.planMejoramientoCompromiso || '';

  // Calculate dynamic heights for Plan rows so text never overflows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  const planActionLines = isPlanActivo ? doc.splitTextToSize(planActionsText, contentWidth - colPlanLabel - 4) : [];
  const planRow1H = isPlanActivo ? Math.max(7.5, planActionLines.length * 2.7 + 3.0) : 0;
  const planRow2H = isPlanActivo ? 5.2 : 0;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.8);
  const planCompromiseLines = (isPlanActivo && planCompromisoText) ? doc.splitTextToSize(planCompromisoText, contentWidth - colPlanLabel - 4) : [];
  const planRow3H = (isPlanActivo && planCompromisoText) ? Math.max(6.2, planCompromiseLines.length * 2.5 + 3.0) : 0;
  const planHeaderH = isPlanActivo ? 4.8 : 0;

  if (isPlanActivo) {
    planH = planHeaderH + planRow1H + planRow2H + planRow3H;
  }

  // =============================================================
  // 5. JUICIO (Evaluation Judgment Section - Shows each RAP's approval status)
  // =============================================================
  const colJuicioLabel = 18;
  const colJuicioDesc = 62;
  const colJuicioResLabel = 67.9;
  const colAprobo = 20;
  const colNoAprobo = 20; // 18 + 62 + 67.9 + 20 + 20 = 187.9 = contentWidth

  // Pre-calculate line wrapping and exact row height for each RAP
  interface RapRowLayout {
    rapTitle: string;
    rapText: string;
    lines: string[];
    isApproved: boolean;
    rowH: number;
  }

  const rapRowsData: RapRowLayout[] = [];

  if (rapSummary.raps.length > 0) {
    rapSummary.raps.forEach((rap) => {
      // Clean duplicate RAP prefix if present
      const cleanRapText = rap.rapText
        .replace(/^(RAP\s*\d+|RAP-\d+|R\.A\.P\.\s*\d+|R\.A\.\s*\d+|RA\s*\d+)[\s:\-\.]*/i, '')
        .trim();
      const displayTitle = rap.rapTitle || 'RAP';
      const displayText = cleanRapText ? `${displayTitle}: ${cleanRapText}` : rap.rapText;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      const lines = doc.splitTextToSize(displayText, colJuicioResLabel - 4);
      // Ensure height is generous enough so letters NEVER overflow or touch the border line
      const rowH = Math.max(7.2, lines.length * 2.8 + 3.2);

      rapRowsData.push({
        rapTitle: displayTitle,
        rapText: displayText,
        lines,
        isApproved: rap.isApproved,
        rowH
      });
    });
  } else {
    const effectiveJuicio = apprentice.juicioEspecifico || generalInfo.juicioResultado || 'NO_APROBO';
    rapRowsData.push({
      rapTitle: 'Juicio General',
      rapText: 'Juicio General del Programa de Formación',
      lines: ['Juicio General del Programa de Formación'],
      isApproved: effectiveJuicio === 'APROBO',
      rowH: 7.2
    });
  }

  const subHeaderH = 5.2;
  const totalRapsH = rapRowsData.reduce((acc, r) => acc + r.rowH, 0);
  const juicioH = subHeaderH + totalRapsH;
  const signaturesH = 30;
  const neededBottomSpace = planH + (isPlanActivo ? 4 : 0) + juicioH + signaturesH + 8;

  // If plan + juicio + signatures do not fit on current page, add new page
  if (currY + neededBottomSpace > maxPageY) {
    doc.addPage('letter', 'portrait');
    currY = marginTop + 4;
  } else {
    currY += 4;
  }

  // Render Plan de Mejoramiento if active
  if (isPlanActivo) {
    const totalPlanBoxH = planHeaderH + planRow1H + planRow2H + planRow3H;

    // Draw main container
    doc.rect(left, currY, contentWidth, totalPlanBoxH);

    // Header: PLAN DE MEJORAMIENTO ACADÉMICO / DISCIPLINARIO
    doc.setFillColor(242, 244, 247);
    doc.rect(left, currY, contentWidth, planHeaderH, 'F');
    doc.rect(left, currY, contentWidth, planHeaderH, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(0, 0, 0);
    doc.text(`PLAN DE MEJORAMIENTO ${planTipoText}`, left + contentWidth / 2, currY + 3.4, { align: 'center' });

    let currentPlanY = currY + planHeaderH;

    // Row 1: Acciones a Desarrollar
    doc.rect(left, currentPlanY, contentWidth, planRow1H);
    doc.line(left + colPlanLabel, currentPlanY, left + colPlanLabel, currentPlanY + planRow1H);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('Acciones / Actividades a Desarrollar:', left + 2, currentPlanY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.1);
    const planTextStartY = currentPlanY + (planRow1H - planActionLines.length * 2.7) / 2 + 2.0;
    planActionLines.forEach((line, lIdx) => {
      doc.text(line, left + colPlanLabel + 2, planTextStartY + (lIdx * 2.7));
    });

    currentPlanY += planRow1H;

    // Row 2: Fecha Límite de Cumplimiento
    doc.rect(left, currentPlanY, contentWidth, planRow2H);
    doc.line(left + colPlanLabel, currentPlanY, left + colPlanLabel, currentPlanY + planRow2H);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('Fecha Límite Cumplimiento Plan:', left + 2, currentPlanY + 3.6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(planDeadlineText, left + colPlanLabel + 2, currentPlanY + 3.6);

    currentPlanY += planRow2H;

    // Row 3 (Optional): Compromiso Institucional
    if (planCompromisoText && planRow3H > 0) {
      doc.rect(left, currentPlanY, contentWidth, planRow3H);
      doc.line(left + colPlanLabel, currentPlanY, left + colPlanLabel, currentPlanY + planRow3H);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('Compromiso del Aprendiz / SENA:', left + 2, currentPlanY + 4.0);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(5.8);
      const compromiseStartY = currentPlanY + (planRow3H - planCompromiseLines.length * 2.5) / 2 + 1.9;
      planCompromiseLines.forEach((line, lIdx) => {
        doc.text(line, left + colPlanLabel + 2, compromiseStartY + (lIdx * 2.5));
      });

      currentPlanY += planRow3H;
    }

    currY = currentPlanY + 3.5;
  }

  // Draw outer border & vertical dividers for JUICIO
  doc.rect(left, currY, contentWidth, juicioH);
  doc.line(left + colJuicioLabel, currY, left + colJuicioLabel, currY + juicioH);
  doc.line(left + colJuicioLabel + colJuicioDesc, currY, left + colJuicioLabel + colJuicioDesc, currY + juicioH);
  doc.line(left + colJuicioLabel + colJuicioDesc + colJuicioResLabel, currY, left + colJuicioLabel + colJuicioDesc + colJuicioResLabel, currY + juicioH);
  doc.line(left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo, currY, left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo, currY + juicioH);

  // Sub-header horizontal line for Aprobó / No Aprobó
  doc.line(
    left + colJuicioLabel + colJuicioDesc,
    currY + subHeaderH,
    left + contentWidth,
    currY + subHeaderH
  );

  // Label: JUICIO (vertically centered in Col 1)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('JUICIO', left + colJuicioLabel / 2, currY + (juicioH / 2) + 1.2, { align: 'center' });

  // Description in Col 2 (vertically centered in Col 2)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.text(
    generalInfo.juicioTexto || 'Para superar los resultados de aprendizaje a evaluar debe aprobar todas las evidencias asignadas.',
    left + colJuicioLabel + 2,
    currY + 4.5,
    { maxWidth: colJuicioDesc - 4, lineHeightFactor: 1.15 }
  );

  // Subheaders in Cols 3, 4, 5
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.text('JUICIO RESULTADO(S) DE APRENDIZAJE', left + colJuicioLabel + colJuicioDesc + colJuicioResLabel / 2, currY + 3.6, {
    align: 'center'
  });

  doc.setFontSize(6.0);
  doc.text('APROBÓ', left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo / 2, currY + 3.6, {
    align: 'center'
  });
  doc.text(
    'NO APROBÓ',
    left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo + colNoAprobo / 2,
    currY + 3.6,
    { align: 'center' }
  );

  // Render each RAP row with vertically centered text and 'x' marks
  let rowY = currY + subHeaderH;
  rapRowsData.forEach((rapRow, rIdx) => {
    // Horizontal separator between RAP rows
    if (rIdx > 0) {
      doc.line(left + colJuicioLabel + colJuicioDesc, rowY, left + contentWidth, rowY);
    }

    // Render RAP text lines with exact line spacing
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    const textStartY = rowY + (rapRow.rowH - rapRow.lines.length * 2.6) / 2 + 1.9;
    rapRow.lines.forEach((line, lIdx) => {
      doc.text(line, left + colJuicioLabel + colJuicioDesc + 2, textStartY + (lIdx * 2.6));
    });

    // Render 'x' mark vertically centered in cell
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const markY = rowY + (rapRow.rowH / 2) + 1.2;
    if (rapRow.isApproved) {
      doc.text('x', left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo / 2, markY, {
        align: 'center'
      });
    } else {
      doc.text(
        'x',
        left + colJuicioLabel + colJuicioDesc + colJuicioResLabel + colAprobo + colNoAprobo / 2,
        markY,
        { align: 'center' }
      );
    }

    rowY += rapRow.rowH;
  });

  currY += juicioH;

  // =============================================================
  // 5. SIGNATURES SECTION (Portrait 4 columns)
  // =============================================================
  const availableSigSpace = maxPageY - currY;
  if (availableSigSpace < signaturesH) {
    doc.addPage('letter', 'portrait');
    currY = marginTop + 6;
  } else {
    // Distribute remaining space comfortably
    const extraGap = Math.min(14, Math.max(6, (availableSigSpace - signaturesH) * 0.4));
    currY += extraGap;
  }

  const totalSigCols = 4;
  const sigColGap = 3.5;
  const actualSigWidth = (contentWidth - (totalSigCols - 1) * sigColGap) / totalSigCols; // ~44.3 mm

  const sig1X = left;
  const sigLineY = currY + 13;

  // Instructor Signature
  if (signatureConfig.instructorSignatureData) {
    try {
      const sigImgWidth = Math.min(36, actualSigWidth - 4);
      const sigImgHeight = 12;
      const sigImgX = sig1X + (actualSigWidth - sigImgWidth) / 2;
      doc.addImage(signatureConfig.instructorSignatureData, 'PNG', sigImgX, sigLineY - 13, sigImgWidth, sigImgHeight);
    } catch {
      // fallback
    }
  } else if (signatureConfig.instructorSignatureType === 'text') {
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(20, 50, 110);
    const textSig = signatureConfig.instructorName || generalInfo.nombreInstructorLlamado || '';
    doc.text(textSig, sig1X + actualSigWidth / 2, sigLineY - 2.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // Signature Lines
  doc.setLineWidth(0.35);
  doc.setDrawColor(0, 0, 0);

  // Line 1: Instructor
  doc.line(sig1X, sigLineY, sig1X + actualSigWidth, sigLineY);
  // Line 2: Aprendiz
  const sig2X = sig1X + actualSigWidth + sigColGap;
  doc.line(sig2X, sigLineY, sig2X + actualSigWidth, sigLineY);
  // Line 3: Coordinador
  const sig3X = sig2X + actualSigWidth + sigColGap;
  doc.line(sig3X, sigLineY, sig3X + actualSigWidth, sigLineY);
  // Line 4: Subdirector / Comité
  const sig4X = sig3X + actualSigWidth + sigColGap;
  doc.line(sig4X, sigLineY, sig4X + actualSigWidth, sigLineY);

  // Texts under lines
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  // Under line 1: Instructor name & title
  const instName = signatureConfig.instructorName || generalInfo.nombreInstructorLlamado || '';
  doc.text(instName, sig1X + actualSigWidth / 2, sigLineY + 3.5, { align: 'center', maxWidth: actualSigWidth });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.text('PRIMER LLAMADO INSTRUCTOR', sig1X + actualSigWidth / 2, sigLineY + 7.2, {
    align: 'center',
    maxWidth: actualSigWidth
  });

  // Under line 2: Firma Aprendiz
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMA APRENDIZ', sig2X + actualSigWidth / 2, sigLineY + 7.2, { align: 'center' });

  // Under line 3: Segundo llamado coordinador academico
  doc.setFont('helvetica', 'bold');
  doc.text('SEGUNDO LLAMADO', sig3X + actualSigWidth / 2, sigLineY + 5.0, { align: 'center' });
  doc.text('COORDINADOR ACADEMICO', sig3X + actualSigWidth / 2, sigLineY + 8.5, {
    align: 'center',
    maxWidth: actualSigWidth
  });

  // Under line 4: Tercer llamado subdirector – comité evaluacion
  doc.setFont('helvetica', 'bold');
  doc.text('TERCER LLAMADO SUBDIRECTOR –', sig4X + actualSigWidth / 2, sigLineY + 5.0, {
    align: 'center',
    maxWidth: actualSigWidth
  });
  doc.text('COMITÉ EVALUACION', sig4X + actualSigWidth / 2, sigLineY + 8.5, { align: 'center' });
}

// -------------------------------------------------------------
// HELPER: EVIDENCE TABLE HEADER (Portrait)
// -------------------------------------------------------------
function drawEvidenceTableHeader(
  doc: jsPDF,
  left: number,
  currY: number,
  contentWidth: number,
  colN: number,
  colRap: number,
  colEv: number,
  colSi: number,
  colNo: number,
  colObs: number
) {
  const headerH = 8.0;

  doc.rect(left, currY, contentWidth, headerH);
  doc.line(left + colN, currY, left + colN, currY + headerH);
  doc.line(left + colN + colRap, currY, left + colN + colRap, currY + headerH);
  doc.line(left + colN + colRap + colEv, currY, left + colN + colRap + colEv, currY + headerH);
  doc.line(left + colN + colRap + colEv + colSi + colNo, currY, left + colN + colRap + colEv + colSi + colNo, currY + headerH);

  // Subdivisions in Aprobó/Presentó (horizontal divider between title and SI/NO)
  doc.line(left + colN + colRap + colEv, currY + 4.2, left + colN + colRap + colEv + colSi + colNo, currY + 4.2);
  doc.line(left + colN + colRap + colEv + colSi, currY + 4.2, left + colN + colRap + colEv + colSi, currY + headerH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.text('N°', left + colN / 2, currY + 5.2, { align: 'center' });
  doc.setFontSize(5.8);
  doc.text('RESULTADO DE APRENDIZAJE', left + colN + colRap / 2, currY + 5.2, { align: 'center' });
  doc.setFontSize(7.0);
  doc.text('EVIDENCIAS', left + colN + colRap + colEv / 2, currY + 5.2, { align: 'center' });

  // APROBÓ / PRESENTÓ EVIDENCIA
  doc.setFontSize(4.6);
  doc.text('APROBÓ / PRESENTÓ', left + colN + colRap + colEv + (colSi + colNo) / 2, currY + 2.2, {
    align: 'center'
  });
  doc.text('EVIDENCIA', left + colN + colRap + colEv + (colSi + colNo) / 2, currY + 3.7, {
    align: 'center'
  });

  doc.setFontSize(6.8);
  doc.text('SI', left + colN + colRap + colEv + colSi / 2, currY + 6.9, { align: 'center' });
  doc.text('NO', left + colN + colRap + colEv + colSi + colNo / 2, currY + 6.9, { align: 'center' });

  doc.setFontSize(7.0);
  doc.text('OBSERVACIONES', left + colN + colRap + colEv + colSi + colNo + colObs / 2, currY + 5.2, { align: 'center' });
}

/**
 * Generate a single apprentice PDF in vertical (portrait) orientation
 */
export async function generateSingleApprenticePdf(
  apprentice: Apprentice,
  generalInfo: GeneralInfo,
  evidences: EvidenceItem[],
  signatureConfig: SignatureConfig
): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const logoUrl = generalInfo.senaLogoUrl || (await getSenaLogoDataUrl());
  await buildApprenticePdf(doc, apprentice, generalInfo, evidences, signatureConfig, logoUrl, 1);

  const cleanName = apprentice.nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Llamado_Atencion_${generalInfo.codigoFicha || 'SENA'}_${cleanName}.pdf`;

  const blob = doc.output('blob');
  return { blob, filename };
}

/**
 * Generate a single merged PDF in vertical (portrait) orientation with all apprentice attention calls
 */
export async function generateAllApprenticesCombinedPdf(
  apprentices: Apprentice[],
  generalInfo: GeneralInfo,
  evidences: EvidenceItem[],
  signatureConfig: SignatureConfig,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const logoUrl = generalInfo.senaLogoUrl || (await getSenaLogoDataUrl());

  for (let i = 0; i < apprentices.length; i++) {
    const apprentice = apprentices[i];
    const startPage = i === 0 ? 1 : doc.getNumberOfPages() + 1;
    await buildApprenticePdf(doc, apprentice, generalInfo, evidences, signatureConfig, logoUrl, startPage);
    if (onProgress) {
      onProgress(i + 1, apprentices.length);
    }
  }

  const filename = `Llamados_Atencion_Ficha_${generalInfo.codigoFicha || 'SENA'}_TODOS.pdf`;
  const blob = doc.output('blob');
  return { blob, filename };
}

/**
 * Generate a ZIP file with all individual portrait PDFs
 */
export async function generateAllApprenticesZip(
  apprentices: Apprentice[],
  generalInfo: GeneralInfo,
  evidences: EvidenceItem[],
  signatureConfig: SignatureConfig,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();
  const folder = zip.folder(`Llamados_Atencion_Ficha_${generalInfo.codigoFicha || 'SENA'}`);
  const logoUrl = generalInfo.senaLogoUrl || (await getSenaLogoDataUrl());

  for (let i = 0; i < apprentices.length; i++) {
    const apprentice = apprentices[i];
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    await buildApprenticePdf(doc, apprentice, generalInfo, evidences, signatureConfig, logoUrl, 1);

    const cleanName = apprentice.nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfFilename = `${String(i + 1).padStart(2, '0')}_Llamado_${cleanName}.pdf`;

    const pdfBlob = doc.output('blob');
    if (folder) {
      folder.file(pdfFilename, pdfBlob);
    }

    if (onProgress) {
      onProgress(i + 1, apprentices.length);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = `Llamados_Atencion_Ficha_${generalInfo.codigoFicha || 'SENA'}_Archivos.zip`;
  return { blob: zipBlob, filename };
}

