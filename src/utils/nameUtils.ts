import { Apprentice } from '../types';

// Common compound surname particles in Spanish
const COMPOUND_PREFIXES = new Set([
  'de',
  'del',
  'de la',
  'de las',
  'de los',
  'san',
  'santa',
  'santo',
  'van',
  'von',
  'da',
  'dos',
  'das'
]);

export interface ParsedName {
  original: string;
  firstNames: string;
  lastNames: string;
  hasComma: boolean;
}

/**
 * Normalizes string for collation / sorting (removes accents, lowercase, trimmed)
 */
export function normalizeSortKey(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Parses a full Spanish name into First Names (Nombres) and Last Names (Apellidos).
 * Handles:
 * - "Apellidos, Nombres" (with comma)
 * - "Acosta Moreno Laura Valentina" (4 words: 2 last names + 2 first names, or 2 first + 2 last)
 * - 3 words: "Reyes Huertas Yandri" or "Juan Carlos Gomez"
 * - 2 words: "Carlos Ramírez" or "Ramírez Carlos"
 */
export function parseFullName(fullName: string, assumesLastNameFirst = false): ParsedName {
  const clean = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) {
    return { original: '', firstNames: '', lastNames: '', hasComma: false };
  }

  // Case 1: Comma present (e.g. "Acosta Moreno, Laura Valentina")
  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim());
    return {
      original: clean,
      lastNames: parts[0] || '',
      firstNames: parts.slice(1).join(' ') || '',
      hasComma: true
    };
  }

  const words = clean.split(' ');

  // Single word
  if (words.length === 1) {
    return {
      original: clean,
      firstNames: words[0],
      lastNames: '',
      hasComma: false
    };
  }

  // Two words: e.g. "Juan Perez" or "Perez Juan"
  if (words.length === 2) {
    if (assumesLastNameFirst) {
      return {
        original: clean,
        lastNames: words[0],
        firstNames: words[1],
        hasComma: false
      };
    } else {
      return {
        original: clean,
        firstNames: words[0],
        lastNames: words[1],
        hasComma: false
      };
    }
  }

  // Three words: e.g. "Juan Carlos Perez" vs "Perez Gomez Juan"
  if (words.length === 3) {
    if (assumesLastNameFirst) {
      // 2 last names + 1 first name: "Perez Gomez Juan"
      return {
        original: clean,
        lastNames: `${words[0]} ${words[1]}`,
        firstNames: words[2],
        hasComma: false
      };
    } else {
      // 2 first names + 1 last name: "Juan Carlos Perez"
      // or 1 first name + 2 last names: "Carlos Gomez Salazar"
      return {
        original: clean,
        firstNames: words[0],
        lastNames: `${words[1]} ${words[2]}`,
        hasComma: false
      };
    }
  }

  // Four or more words (Standard in Colombia: 2 last names + 2 first names)
  // e.g. "Acosta Moreno Laura Valentina" vs "Laura Valentina Acosta Moreno"
  if (assumesLastNameFirst) {
    // First 2 words are last names, rest are first names
    return {
      original: clean,
      lastNames: `${words[0]} ${words[1]}`,
      firstNames: words.slice(2).join(' '),
      hasComma: false
    };
  } else {
    // First 2 words are first names, last 2 words are last names
    const mid = Math.floor(words.length / 2);
    return {
      original: clean,
      firstNames: words.slice(0, mid).join(' '),
      lastNames: words.slice(mid).join(' '),
      hasComma: false
    };
  }
}

/**
 * Detects if a list of names predominantly starts with last name or first name
 */
export function detectPredominantFormat(names: string[]): 'LAST_NAMES_FIRST' | 'FIRST_NAMES_FIRST' {
  if (!names || names.length === 0) return 'FIRST_NAMES_FIRST';

  let withCommaCount = 0;
  for (const name of names) {
    if (name && name.includes(',')) withCommaCount++;
  }

  // If many contain commas, it's "Apellidos, Nombres"
  if (withCommaCount >= names.length * 0.3) {
    return 'LAST_NAMES_FIRST';
  }

  return 'FIRST_NAMES_FIRST';
}

/**
 * Formats a name to start with Last Names ("Apellidos Nombres" or "Apellidos, Nombres")
 */
export function formatToLastNamesFirst(
  fullName: string,
  includeComma = false,
  currentlyStartsByLastName = false
): string {
  const clean = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  // If already has comma "Perez, Juan", clean or format
  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim());
    const last = parts[0];
    const first = parts.slice(1).join(' ');
    return includeComma ? `${last}, ${first}` : `${last} ${first}`.trim();
  }

  if (currentlyStartsByLastName) {
    // Already in Apellidos Nombres format, just handle comma if needed
    const parsed = parseFullName(clean, true);
    return includeComma
      ? `${parsed.lastNames}, ${parsed.firstNames}`.trim()
      : `${parsed.lastNames} ${parsed.firstNames}`.trim();
  }

  // It's in Nombres Apellidos format -> Swap to Apellidos Nombres
  const parsed = parseFullName(clean, false);
  if (!parsed.lastNames) return clean;

  return includeComma
    ? `${parsed.lastNames}, ${parsed.firstNames}`.trim()
    : `${parsed.lastNames} ${parsed.firstNames}`.trim();
}

/**
 * Formats a name to start with First Names ("Nombres Apellidos")
 */
export function formatToFirstNamesFirst(
  fullName: string,
  currentlyStartsByLastName = true
): string {
  const clean = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim());
    const last = parts[0];
    const first = parts.slice(1).join(' ');
    return `${first} ${last}`.trim();
  }

  if (!currentlyStartsByLastName) {
    return clean;
  }

  // It's in Apellidos Nombres format -> Swap to Nombres Apellidos
  const parsed = parseFullName(clean, true);
  if (!parsed.firstNames) return clean;

  return `${parsed.firstNames} ${parsed.lastNames}`.trim();
}

/**
 * Swaps name parts around (e.g. Inverts first half and second half)
 */
export function invertNameOrder(fullName: string): string {
  const clean = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim());
    return `${parts.slice(1).join(' ')} ${parts[0]}`.trim();
  }

  const words = clean.split(' ');
  if (words.length <= 1) return clean;

  const mid = Math.ceil(words.length / 2);
  const firstHalf = words.slice(0, mid).join(' ');
  const secondHalf = words.slice(mid).join(' ');

  return `${secondHalf} ${firstHalf}`.trim();
}

/**
 * Reorders a whole apprentice array by name starting with Apellidos or Nombres,
 * or transforms the names in place.
 */
export type NameSortMode = 'NOMBRES_ASC' | 'NOMBRES_DESC' | 'APELLIDOS_ASC' | 'APELLIDOS_DESC';

export function sortApprenticesByNameMode(
  apprentices: Apprentice[],
  mode: NameSortMode,
  assumeCurrentFormat: 'APELLIDOS_NOMBRES' | 'NOMBRES_APELLIDOS' = 'NOMBRES_APELLIDOS'
): Apprentice[] {
  const isLastNameFirst = assumeCurrentFormat === 'APELLIDOS_NOMBRES';

  return [...apprentices].sort((a, b) => {
    const parsedA = parseFullName(a.nombre || '', isLastNameFirst);
    const parsedB = parseFullName(b.nombre || '', isLastNameFirst);

    let keyA = '';
    let keyB = '';

    if (mode === 'APELLIDOS_ASC' || mode === 'APELLIDOS_DESC') {
      keyA = normalizeSortKey(parsedA.lastNames || parsedA.original);
      keyB = normalizeSortKey(parsedB.lastNames || parsedB.original);
      // Secondary fallback to first names
      if (keyA === keyB) {
        keyA = normalizeSortKey(parsedA.firstNames);
        keyB = normalizeSortKey(parsedB.firstNames);
      }
    } else {
      keyA = normalizeSortKey(parsedA.firstNames || parsedA.original);
      keyB = normalizeSortKey(parsedB.firstNames || parsedB.original);
      // Secondary fallback to last names
      if (keyA === keyB) {
        keyA = normalizeSortKey(parsedA.lastNames);
        keyB = normalizeSortKey(parsedB.lastNames);
      }
    }

    const comparison = keyA.localeCompare(keyB, 'es', { sensitivity: 'base' });
    return mode.endsWith('_ASC') ? comparison : -comparison;
  });
}
