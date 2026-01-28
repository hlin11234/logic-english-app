/**
 * Comprehensive English normalization for flexible parsing.
 * Handles synonyms, filler words, and converts to canonical tokens.
 */

export type NormalizedToken = string;

/**
 * Normalize English text to canonical tokens.
 * Pipeline:
 * 1. Lowercase and remove punctuation
 * 2. Remove filler words
 * 3. Normalize synonyms to canonical tokens
 * 4. Tokenize
 */
export function normalizeEnglishTokens(text: string): NormalizedToken[] {
  let normalized = text.toLowerCase().trim();

  // Step 1: Remove punctuation
  normalized = normalized.replace(/[.,;:!?'"()]/g, ' ');

  // Step 2: Normalize quantifiers (do this early to avoid conflicts)
  normalized = normalizeQuantifiers(normalized);

  // Step 3: Normalize scope boundaries
  normalized = normalizeScopeBoundaries(normalized);

  // Step 4: Normalize connectives
  normalized = normalizeConnectives(normalized);

  // Step 5: Normalize conditions
  normalized = normalizeConditions(normalized);

  // Step 6: Normalize comparisons/relations
  normalized = normalizeComparisons(normalized);

  // Step 7: Remove filler words
  normalized = removeFillerWords(normalized);

  // Step 8: Normalize whitespace and tokenize
  normalized = normalized.replace(/\s+/g, ' ').trim();
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);

  return tokens;
}

/**
 * Normalize quantifier phrases to canonical tokens
 */
function normalizeQuantifiers(text: string): string {
  // Universal quantifiers
  text = text.replace(/\bfor\s+all\b/g, 'FORALL');
  text = text.replace(/\bfor\s+every\b/g, 'FORALL');
  text = text.replace(/\bfor\s+each\b/g, 'FORALL');
  text = text.replace(/\bgiven\s+any\b/g, 'FORALL');
  text = text.replace(/\ball\b(?=\s+\w+)/g, 'FORALL'); // "all x" → "FORALL x"
  text = text.replace(/\bevery\b(?=\s+\w+)/g, 'FORALL'); // "every x" → "FORALL x"
  text = text.replace(/\beach\b(?=\s+\w+)/g, 'FORALL');
  text = text.replace(/\bany\b(?=\s+\w+)/g, 'FORALL');

  // Existential quantifiers
  text = text.replace(/\bthere\s+exists\b/g, 'EXISTS');
  text = text.replace(/\bthere\s+is\b/g, 'EXISTS');
  text = text.replace(/\bthere\s+are\b/g, 'EXISTS');
  text = text.replace(/\bthere's\b/g, 'EXISTS');
  text = text.replace(/\bthere\s+exist\b/g, 'EXISTS');
  text = text.replace(/\bexists\b/g, 'EXISTS');
  text = text.replace(/\bexist\b/g, 'EXISTS');
  text = text.replace(/\bsome\b/g, 'EXISTS'); // "some x" → "EXISTS x"
  text = text.replace(/\bwe\s+can\s+find\b/g, 'EXISTS');

  return text;
}

/**
 * Normalize scope boundaries (such that, where, etc.)
 */
function normalizeScopeBoundaries(text: string): string {
  text = text.replace(/\bsuch\s+that\b/g, 'SUCHTHAT');
  text = text.replace(/\bso\s+that\b/g, 'SUCHTHAT');
  text = text.replace(/\bwhere\b/g, 'SUCHTHAT');
  text = text.replace(/\bwith\s+the\s+property\s+that\b/g, 'SUCHTHAT');
  return text;
}

/**
 * Normalize logical connectives
 */
function normalizeConnectives(text: string): string {
  // Conjunction
  text = text.replace(/\band\b/g, 'AND');
  text = text.replace(/\bas\s+well\s+as\b/g, 'AND');
  text = text.replace(/\bplus\b/g, 'AND');
  text = text.replace(/\balso\b/g, 'AND');
  text = text.replace(/\bbut\b/g, 'AND'); // "A but B" → A ∧ B (logical and)

  // Disjunction
  text = text.replace(/\bor\b/g, 'OR');
  text = text.replace(/\bor\s+else\b/g, 'OR');
  text = text.replace(/\beither\b/g, 'OR'); // "either A or B" handled separately

  // Conditional
  text = text.replace(/\bunless\b/g, 'UNLESS');
  text = text.replace(/\bonly\s+if\b/g, 'ONLYIF');
  text = text.replace(/\bif\s+and\s+only\s+if\b/g, 'IFF');
  text = text.replace(/\biff\b/g, 'IFF');
  text = text.replace(/\bif\b/g, 'IF');
  text = text.replace(/\bwhenever\b/g, 'IF');
  text = text.replace(/\bevery\s+time\b/g, 'IF');
  text = text.replace(/\bthen\b/g, 'THEN');

  return text;
}

/**
 * Normalize necessary/sufficient conditions
 */
function normalizeConditions(text: string): string {
  // Sufficient
  text = text.replace(/\bis\s+sufficient\s+for\b/g, 'SUFFICIENT');
  text = text.replace(/\bis\s+enough\s+for\b/g, 'SUFFICIENT');
  text = text.replace(/\bguarantees\b/g, 'SUFFICIENT');
  text = text.replace(/\bsufficient\s+for\b/g, 'SUFFICIENT');
  text = text.replace(/\bsufficient\s+condition\s+for\b/g, 'SUFFICIENT');
  text = text.replace(/\bsufficient\s+condition\s+to\b/g, 'SUFFICIENT');
  text = text.replace(/\bis\s+sufficient\s+to\b/g, 'SUFFICIENT');

  // Necessary
  text = text.replace(/\bis\s+necessary\s+for\b/g, 'NECESSARY');
  text = text.replace(/\brequires\b/g, 'NECESSARY');
  text = text.replace(/\bdepends\s+on\b/g, 'NECESSARY');
  text = text.replace(/\bnecessary\s+for\b/g, 'NECESSARY');
  text = text.replace(/\bnecessary\s+condition\s+for\b/g, 'NECESSARY');
  text = text.replace(/\bnecessary\s+condition\s+to\b/g, 'NECESSARY');
  text = text.replace(/\bis\s+necessary\s+to\b/g, 'NECESSARY');

  // Both
  text = text.replace(/\bnecessary\s+and\s+sufficient\s+for\b/g, 'NECSUFF');
  text = text.replace(/\bnecessary\s+and\s+sufficient\s+to\b/g, 'NECSUFF');

  return text;
}

/**
 * Normalize comparison/relation phrases
 */
function normalizeComparisons(text: string): string {
  // Less than
  text = text.replace(/\bis\s+less\s+than\b/g, '<');
  text = text.replace(/\bless\s+than\b/g, '<');
  text = text.replace(/\bsmaller\s+than\b/g, '<');
  text = text.replace(/\blower\s+than\b/g, '<');
  text = text.replace(/\bbelow\b/g, '<');

  // Greater than
  text = text.replace(/\bis\s+greater\s+than\b/g, '>');
  text = text.replace(/\bgreater\s+than\b/g, '>');
  text = text.replace(/\blarger\s+than\b/g, '>');
  text = text.replace(/\bhigher\s+than\b/g, '>');
  text = text.replace(/\babove\b/g, '>');

  // Less than or equal
  text = text.replace(/\bis\s+at\s+most\b/g, '≤');
  text = text.replace(/\bat\s+most\b/g, '≤');
  text = text.replace(/\bis\s+less\s+than\s+or\s+equal\s+to\b/g, '≤');
  text = text.replace(/\bless\s+than\s+or\s+equal\s+to\b/g, '≤');
  text = text.replace(/\bis\s+not\s+greater\s+than\b/g, '≤');
  text = text.replace(/\bnot\s+greater\s+than\b/g, '≤');

  // Greater than or equal
  text = text.replace(/\bis\s+at\s+least\b/g, '≥');
  text = text.replace(/\bat\s+least\b/g, '≥');
  text = text.replace(/\bis\s+greater\s+than\s+or\s+equal\s+to\b/g, '≥');
  text = text.replace(/\bgreater\s+than\s+or\s+equal\s+to\b/g, '≥');
  text = text.replace(/\bis\s+not\s+less\s+than\b/g, '≥');
  text = text.replace(/\bnot\s+less\s+than\b/g, '≥');

  // Equal
  text = text.replace(/\bis\s+equal\s+to\b/g, '=');
  text = text.replace(/\bequal\s+to\b/g, '=');
  text = text.replace(/\bequals\b/g, '=');
  text = text.replace(/\bis\s+the\s+same\s+as\b/g, '=');
  text = text.replace(/\bsame\s+as\b/g, '=');
  text = text.replace(/\bis\s+equivalent\s+to\b/g, '=');

  // Not equal
  text = text.replace(/\bis\s+not\s+equal\s+to\b/g, '≠');
  text = text.replace(/\bnot\s+equal\s+to\b/g, '≠');
  text = text.replace(/\bdoes\s+not\s+equal\b/g, '≠');
  text = text.replace(/\bis\s+different\s+from\b/g, '≠');
  text = text.replace(/\bdifferent\s+from\b/g, '≠');

  // Membership
  text = text.replace(/\bis\s+in\b/g, '∈');
  text = text.replace(/\bin\b/g, '∈');
  text = text.replace(/\bbelongs\s+to\b/g, '∈');
  text = text.replace(/\bis\s+an?\s+element\s+of\b/g, '∈');

  // Not in
  text = text.replace(/\bis\s+not\s+in\b/g, '∉');
  text = text.replace(/\bnot\s+in\b/g, '∉');
  text = text.replace(/\bdoes\s+not\s+belong\s+to\b/g, '∉');

  // Negation
  text = text.replace(/\bis\s+not\b/g, 'NOT');
  text = text.replace(/\bisn't\b/g, 'NOT');
  text = text.replace(/\bdoes\s+not\b/g, 'NOT');
  text = text.replace(/\bdoesn't\b/g, 'NOT');
  text = text.replace(/\bdo\s+not\b/g, 'NOT');
  text = text.replace(/\bdon't\b/g, 'NOT');

  return text;
}

/**
 * Remove filler words that don't affect meaning
 */
function removeFillerWords(text: string): string {
  // Remove articles
  text = text.replace(/\b(a|an|the)\s+/gi, ' ');

  // Remove filler words (but keep them if they're part of a phrase we normalized)
  // These are safe to remove in most contexts
  const fillers = [
    'that', 'which', 'who', 'where', 'with',
    // Keep "such that" as it's already normalized to SUCHTHAT
  ];

  // Only remove standalone filler words, not ones that are part of normalized tokens
  for (const filler of fillers) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    text = text.replace(regex, ' ');
  }

  return text;
}
