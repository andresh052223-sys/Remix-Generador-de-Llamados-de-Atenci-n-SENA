import { Apprentice, EvidenceItem, EvidenceStatus, GeneralInfo } from '../types';

export interface RapEvaluation {
  rapIndex: number;
  rapTitle: string;
  rapText: string;
  assignedEvidences: EvidenceItem[];
  approvedEvidences: EvidenceItem[];
  pendingEvidences: EvidenceItem[];
  isApproved: boolean;
  status: 'APROBO' | 'NO_APROBO';
  totalAssigned: number;
  approvedCount: number;
  percentage: number;
}

export interface ApprenticeRapSummary {
  apprenticeId: string;
  apprenticeName: string;
  raps: RapEvaluation[];
  approvedRapsCount: number;
  totalRapsCount: number;
  allRapsApproved: boolean;
  hasSomeApproved: boolean;
  approvedRaps: RapEvaluation[];
  nonApprovedRaps: RapEvaluation[];
}

/**
 * Get status of an evidence for an apprentice
 */
export function getApprenticeEvidenceStatus(
  apprentice: Apprentice,
  evidence: EvidenceItem
): EvidenceStatus {
  if (apprentice.evidenciasStatus && apprentice.evidenciasStatus[evidence.id] !== undefined) {
    return apprentice.evidenciasStatus[evidence.id];
  }
  return evidence.defaultEstado || 'NO';
}

/**
 * Get a clean short title for a Learning Outcome (RAP)
 */
export function getRapShortTitle(rapText: string, index: number): string {
  const match = rapText.match(/^(RAP\s*\d+|RAP-\d+|R\.A\.P\.\s*\d+|R\.A\.\s*\d+|RA\s*\d+)/i);
  if (match) {
    return match[0].toUpperCase().replace(/\s+/, ' ');
  }
  return `RAP ${index + 1}`;
}

/**
 * Get the Resultado de Aprendizaje (RAP) metadata for a given evidence item
 */
export function getEvidenceRapInfo(
  evidence: EvidenceItem,
  generalInfo?: GeneralInfo
): { rapIndex: number; shortTitle: string; title: string; fullText: string } {
  const rapsList = Array.isArray(generalInfo?.resultadosAprendizaje)
    ? generalInfo.resultadosAprendizaje
    : [];

  const idx =
    evidence.rapIndex !== undefined && evidence.rapIndex >= 0
      ? evidence.rapIndex
      : 0;

  if (rapsList.length > 0 && rapsList[idx]) {
    const raw = rapsList[idx];
    const shortTitle = getRapShortTitle(raw, idx);
    const cleanText = raw
      .replace(/^(RAP\s*\d+|RAP-\d+|R\.A\.P\.\s*\d+|R\.A\.\s*\d+|RA\s*\d+)[\s:\-\.]*/i, '')
      .trim();
    return {
      rapIndex: idx,
      shortTitle,
      title: cleanText ? `${shortTitle}: ${cleanText}` : shortTitle,
      fullText: raw
    };
  }

  const fallbackShort = `RAP ${idx + 1}`;
  return {
    rapIndex: idx,
    shortTitle: fallbackShort,
    title: fallbackShort,
    fullText: fallbackShort
  };
}

/**
 * Evaluates all Learning Outcomes (RAPs) for a given apprentice based on their assigned evidences
 */
export function evaluateApprenticeRaps(
  apprentice: Apprentice,
  generalInfo: GeneralInfo,
  evidences: EvidenceItem[]
): ApprenticeRapSummary {
  const rapsList = Array.isArray(generalInfo.resultadosAprendizaje)
    ? generalInfo.resultadosAprendizaje
    : [];

  const evaluations: RapEvaluation[] = rapsList.map((rapText, index) => {
    const rapTitle = getRapShortTitle(rapText, index);

    // Find evidences assigned to this specific RAP
    // If an evidence has rapIndex === index, it is explicitly assigned.
    // If no evidences have rapIndex assigned at all across the entire list, all evidences apply to all RAPs.
    const hasAnyExplicitAssignment = evidences.some((ev) => ev.rapIndex !== undefined && ev.rapIndex >= 0);

    let assignedEvidences: EvidenceItem[] = [];
    if (hasAnyExplicitAssignment) {
      assignedEvidences = evidences.filter(
        (ev) => ev.rapIndex === index || (ev.rapIndex === undefined && evidences.length === 1)
      );
      // If none explicitly matched this RAP, fallback to any evidence that has no specific assignment if appropriate
      if (assignedEvidences.length === 0) {
        assignedEvidences = evidences.filter((ev) => ev.rapIndex === undefined || ev.rapIndex === -1);
      }
    } else {
      // Default: all evidences apply
      assignedEvidences = evidences;
    }

    const approvedEvidences: EvidenceItem[] = [];
    const pendingEvidences: EvidenceItem[] = [];

    assignedEvidences.forEach((ev) => {
      const status = getApprenticeEvidenceStatus(apprentice, ev);
      if (status === 'SI') {
        approvedEvidences.push(ev);
      } else {
        pendingEvidences.push(ev);
      }
    });

    const isApproved =
      assignedEvidences.length > 0
        ? approvedEvidences.length === assignedEvidences.length
        : false;

    const percentage =
      assignedEvidences.length > 0
        ? Math.round((approvedEvidences.length / assignedEvidences.length) * 100)
        : 0;

    return {
      rapIndex: index,
      rapTitle,
      rapText,
      assignedEvidences,
      approvedEvidences,
      pendingEvidences,
      isApproved,
      status: isApproved ? 'APROBO' : 'NO_APROBO',
      totalAssigned: assignedEvidences.length,
      approvedCount: approvedEvidences.length,
      percentage
    };
  });

  const approvedRaps = evaluations.filter((r) => r.isApproved);
  const nonApprovedRaps = evaluations.filter((r) => !r.isApproved);

  return {
    apprenticeId: apprentice.id,
    apprenticeName: apprentice.nombre,
    raps: evaluations,
    approvedRapsCount: approvedRaps.length,
    totalRapsCount: evaluations.length,
    allRapsApproved: evaluations.length > 0 && approvedRaps.length === evaluations.length,
    hasSomeApproved: approvedRaps.length > 0,
    approvedRaps,
    nonApprovedRaps
  };
}
