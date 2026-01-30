/**
 * Dataset for English → Logic conversion.
 * Maps English phrases to domain symbols, relation operators, and variable hints.
 */

/**
 * Domain phrases → domain symbols
 */
export const DOMAIN_PHRASES: Record<string, string> = {
  'real numbers': 'ℝ',
  'real number': 'ℝ',
  'reals': 'ℝ',
  'real': 'ℝ',
  'r': 'ℝ',
  'integers': 'ℤ',
  'integer': 'ℤ',
  'ints': 'ℤ',
  'int': 'ℤ',
  'z': 'ℤ',
  'rational numbers': 'ℚ',
  'rational number': 'ℚ',
  'rationals': 'ℚ',
  'rational': 'ℚ',
  'q': 'ℚ',
  'natural numbers': 'ℕ',
  'natural number': 'ℕ',
  'naturals': 'ℕ',
  'natural': 'ℕ',
  'n': 'ℕ',
  'complex numbers': 'ℂ',
  'complex number': 'ℂ',
  'complexes': 'ℂ',
  'complex': 'ℂ',
  'c': 'ℂ',
};

/**
 * Relation phrases → operators
 * Comprehensive list of natural language ways to describe mathematical relations
 */
export const RELATION_PHRASES: Record<string, string> = {
  // Less than
  'less than': '<',
  'smaller than': '<',
  'lower than': '<',
  'below': '<',
  'is less than': '<',
  'is smaller than': '<',
  'is lower than': '<',
  '<': '<',
  
  // Greater than
  'greater than': '>',
  'larger than': '>',
  'higher than': '>',
  'above': '>',
  'is greater than': '>',
  'is larger than': '>',
  'is higher than': '>',
  '>': '>',
  
  // Less than or equal
  'at most': '≤',
  'at most equal to': '≤',
  'less than or equal to': '≤',
  'less than or equal': '≤',
  'smaller than or equal to': '≤',
  'smaller than or equal': '≤',
  'not greater than': '≤',
  'no greater than': '≤',
  'is at most': '≤',
  'is less than or equal to': '≤',
  'is smaller than or equal to': '≤',
  'is not greater than': '≤',
  '<=': '≤',
  '≤': '≤',
  
  // Greater than or equal
  'at least': '≥',
  'at least equal to': '≥',
  'greater than or equal to': '≥',
  'greater than or equal': '≥',
  'larger than or equal to': '≥',
  'larger than or equal': '≥',
  'not less than': '≥',
  'no less than': '≥',
  'is at least': '≥',
  'is greater than or equal to': '≥',
  'is larger than or equal to': '≥',
  'is not less than': '≥',
  '>=': '≥',
  '≥': '≥',
  
  // Equal
  'equals': '=',
  'equal to': '=',
  'equal': '=',
  'is equal to': '=',
  'is equal': '=',
  'same as': '=',
  'is the same as': '=',
  'equivalent to': '=',
  'is equivalent to': '=',
  '=': '=',
  
  // Not equal
  'not equal to': '≠',
  'not equal': '≠',
  'does not equal': '≠',
  'is not equal to': '≠',
  'is not equal': '≠',
  'different from': '≠',
  'is different from': '≠',
  'not the same as': '≠',
  'is not the same as': '≠',
  '!=': '≠',
  '≠': '≠',
  
  // Membership (element of)
  'in': '∈',
  'is in': '∈',
  'belongs to': '∈',
  'is in the set': '∈',
  'is an element of': '∈',
  'is a member of': '∈',
  'is contained in': '∈',
  '∈': '∈',
  
  // Not in (not element of)
  'not in': '∉',
  'is not in': '∉',
  'does not belong to': '∉',
  'is not in the set': '∉',
  'is not an element of': '∉',
  'is not a member of': '∉',
  'is not contained in': '∉',
  '∉': '∉',
};

/**
 * Variable name hints by domain
 */
export const VARIABLE_HINTS: Record<string, string[]> = {
  'ℝ': ['x', 'y', 'z'],
  'ℤ': ['m', 'n', 'k'],
  'ℚ': ['p', 'q', 'r'],
  'ℕ': ['n', 'k', 'i'],
  'ℂ': ['z', 'w'],
  default: ['x', 'y', 'z'],
};

/**
 * Get variable hint for a domain
 */
export function getVariableHint(domain: string, index: number = 0): string {
  const hints = VARIABLE_HINTS[domain] || VARIABLE_HINTS.default;
  return hints[index % hints.length] || 'x';
}

/**
 * Normalize domain phrase to symbol
 */
export function normalizeDomain(phrase: string): string | null {
  const normalized = phrase.toLowerCase().trim();
  return DOMAIN_PHRASES[normalized] || null;
}

/**
 * Normalize relation phrase to operator
 */
export function normalizeRelation(phrase: string): string | null {
  const normalized = phrase.toLowerCase().trim();
  return RELATION_PHRASES[normalized] || null;
}

/**
 * Phrase → Predicate mappings for noun phrases
 * Stored in localStorage for persistence
 */
const STORAGE_KEY = 'logic-app:phrase-predicate-mappings';

const DEFAULT_PHRASE_PREDICATES: Record<string, string> = {
  'being a tomato': 'Tomato',
  'being a fruit': 'Fruit',
  'being a uatx student': 'UATXStudent',
  'being a student': 'Student',
  'getting a student id': 'StudentID',
  'get a student id': 'StudentID',
  'having a student id': 'StudentID',
  'has a student id': 'StudentID',
  'being a citizen': 'Citizen',
  'vote': 'Vote',
  'voting': 'Vote',
  'having a ticket': 'HasTicket',
  'entering the concert': 'EnterConcert',
  'being divisible by 4': 'DivisibleBy4',
  'being even': 'Even',
};

/**
 * Get phrase→predicate mappings from localStorage or defaults
 */
export function getPhrasePredicateMappings(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PHRASE_PREDICATES, ...parsed };
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return { ...DEFAULT_PHRASE_PREDICATES };
}

/**
 * Set phrase→predicate mapping in localStorage
 */
export function setPhrasePredicateMapping(phrase: string, predicate: string): void {
  try {
    const current = getPhrasePredicateMappings();
    current[phrase.toLowerCase().trim()] = predicate;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Convert a noun phrase to a PascalCase unary predicate name (fallback when not in dictionary).
 * Rules:
 * - Normalize: lowercase, trim, remove articles (a/an/the)
 * - If phrase starts with "being " then drop "being "
 * - If phrase starts with "is a " / "is an " / "is the " drop it
 * - Convert remaining noun phrase to PascalCase: "tomato" -> "Tomato", "real number" -> "RealNumber"
 */
export function phraseToUnaryPredicate(phrase: string): string {
  let s = phrase.toLowerCase().trim();
  if (!s) return 'P';

  // Drop "being " prefix
  s = s.replace(/^being\s+/, '');

  // Drop "is a " / "is an " / "is the " prefix
  s = s.replace(/^is\s+(a|an|the)\s+/, '');

  // Remove leading articles
  s = s.replace(/^(a|an|the)\s+/, '');

  s = s.trim();
  if (!s) return 'P';

  // PascalCase: split on whitespace, capitalize each word, join
  const parts = s.split(/\s+/).filter(Boolean);
  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

/**
 * Get predicate name for a phrase.
 * Uses dictionary first; fallback to phraseToUnaryPredicate for unrecognized "being a <noun>" etc.
 */
export function getPredicateForPhrase(phrase: string): string {
  const normalized = normalizeNpPhrase(phrase);
  const mappings = getPhrasePredicateMappings();
  const fromDict = mappings[normalized];
  if (fromDict) return fromDict;
  return phraseToUnaryPredicate(phrase);
}

/**
 * Normalize noun phrase for lookup
 * - Remove articles: a, an, the
 * - Lowercase
 * - Trim whitespace
 */
export function normalizeNpPhrase(phrase: string): string {
  let normalized = phrase.toLowerCase().trim();
  
  // Remove articles at start
  normalized = normalized.replace(/^(a|an|the)\s+/i, '');
  
  // Normalize variants
  // "getting <NP>" -> "get <NP>"
  normalized = normalized.replace(/^getting\s+/i, 'get ');
  // "having <NP>" -> "has <NP>"
  normalized = normalized.replace(/^having\s+/i, 'has ');
  
  return normalized.trim();
}

/**
 * Normalize necessary/sufficient phrases to internal markers
 */
export function normalizeNecessarySufficient(text: string): string {
  let normalized = text.toLowerCase();
  
  // Normalize "iff" to "if and only if"
  normalized = normalized.replace(/\biff\b/g, 'if and only if');
  
  // Normalize condition markers (do these first, before the simpler ones)
  normalized = normalized.replace(/\bsufficient\s+condition\s+for\b/g, ' SUFFCOND ');
  normalized = normalized.replace(/\bsufficient\s+condition\s+to\b/g, ' SUFFCOND ');
  normalized = normalized.replace(/\bnecessary\s+condition\s+for\b/g, ' NECCOND ');
  normalized = normalized.replace(/\bnecessary\s+condition\s+to\b/g, ' NECCOND ');
  
  // Normalize multi-word markers to single tokens (for reliable matching)
  normalized = normalized.replace(/\bif\s+and\s+only\s+if\b/g, ' IFF ');
  normalized = normalized.replace(/\bonly\s+if\b/g, ' ONLYIF ');
  normalized = normalized.replace(/\bnecessary\s+and\s+sufficient\s+for\b/g, ' NECSUFFFOR ');
  
  // These need to come after the condition markers to avoid conflicts
  normalized = normalized.replace(/\bis\s+sufficient\s+for\b/g, ' SUFFFOR ');
  normalized = normalized.replace(/\bis\s+sufficient\s+to\b/g, ' SUFFFOR ');
  normalized = normalized.replace(/\bis\s+necessary\s+for\b/g, ' NECFOR ');
  normalized = normalized.replace(/\bis\s+necessary\s+to\b/g, ' NECFOR ');
  normalized = normalized.replace(/\bnecessary\s+for\b/g, ' NECFOR ');
  normalized = normalized.replace(/\bsufficient\s+for\b/g, ' SUFFOR ');
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}
