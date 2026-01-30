/**
 * Comprehensive English normalization for flexible parsing.
 * Handles synonyms, filler words, and converts to canonical tokens.
 */

export type Token =
  | { kind: 'KW'; value: string }
  | { kind: 'ID'; value: string }
  | { kind: 'NUM'; value: string }
  | { kind: 'OP'; value: string };

export type NormalizedToken = Token;

/**
 * Low-level tokenizer.
 *
 * - Preserves identifiers `[a-zA-Z_][a-zA-Z0-9_]*` as ID tokens (no dropping).
 * - Recognizes numbers as NUM tokens.
 * - Strips punctuation but keeps `<, >, =, <=, >=, !=` as OP tokens.
 * - Commas and other punctuation are treated as separators (ignored here).
 */
export function tokenizeEnglish(input: string): Token[] {
  const tokens: Token[] = [];
  const text = input;
  const n = text.length;

  let i = 0;
  while (i < n) {
    const ch = text[i]!;

    // Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Comma → explicit separator token
    if (ch === ',') {
      tokens.push({ kind: 'KW', value: ',' });
      i++;
      continue;
    }

    // Unicode comparison/membership symbols (emit as OP so relation phrases parse correctly)
    if (ch === '≤' || ch === '≥' || ch === '≠' || ch === '∈' || ch === '∉') {
      tokens.push({ kind: 'OP', value: ch });
      i++;
      continue;
    }

    // Other basic punctuation → separators (skip)
    if (/[.;:!?'"()]/.test(ch)) {
      i++;
      continue;
    }

    // Operators (<, >, =, <=, >=, !=)
    if (ch === '<' || ch === '>' || ch === '=' || ch === '!') {
      let op = ch;
      const next = i + 1 < n ? text[i + 1]! : '';
      if ((ch === '<' || ch === '>') && next === '=') {
        op += next;
        i += 2;
      } else if (ch === '!' && next === '=') {
        op += next;
        i += 2;
      } else {
        i += 1;
      }
      tokens.push({ kind: 'OP', value: op });
      continue;
    }

    // Numbers (digits with optional decimal point)
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[0-9.]/.test(text[j]!)) j++;
      const numStr = text.slice(i, j);
      tokens.push({ kind: 'NUM', value: numStr });
      i = j;
      continue;
    }

    // Identifiers [a-zA-Z_][a-zA-Z0-9_]*
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[a-zA-Z0-9_]/.test(text[j]!)) j++;
      const idStr = text.slice(i, j);
      tokens.push({ kind: 'ID', value: idStr });
      i = j;
      continue;
    }

    // Any other character: separator
    i++;
  }

  return tokens;
}

function kw(value: string): Token {
  return { kind: 'KW', value };
}

/**
 * Normalize English text to canonical tokens (KW/ID/NUM/OP).
 * This replaces the earlier string-based pipeline and NEVER
 * drops identifier tokens.
 * Applies comparison phrase normalization first so "x is greater than or equal to 5" → "x ≥ 5".
 */
export function normalizeEnglishTokens(text: string): NormalizedToken[] {
  text = normalizeComparisons(text);
  const raw = tokenizeEnglish(text);
  const out: Token[] = [];

  for (let i = 0; i < raw.length; ) {
    const t = raw[i]!;

    // Numbers
    if (t.kind === 'NUM') {
      out.push(t);
      i++;
      continue;
    }

    // Operators
    if (t.kind === 'OP') {
      let op = t.value;
      if (op === '<=') op = '≤';
      else if (op === '>=') op = '≥';
      else if (op === '!=') op = '≠';
      out.push({ kind: 'OP', value: op });
      i++;
      continue;
    }

    if (t.kind !== 'ID') {
      out.push(t);
      i++;
      continue;
    }

    const lower = t.value.toLowerCase();

    // --- Quantifiers ---
    if (
      lower === 'for' &&
      i + 1 < raw.length &&
      raw[i + 1]!.kind === 'ID' &&
      ['all', 'every', 'each'].includes(raw[i + 1]!.value.toLowerCase())
    ) {
      out.push(kw('FORALL'));
      i += 2;
      continue;
    }

    if (
      lower === 'given' &&
      i + 1 < raw.length &&
      raw[i + 1]!.kind === 'ID' &&
      raw[i + 1]!.value.toLowerCase() === 'any'
    ) {
      out.push(kw('FORALL'));
      i += 2;
      continue;
    }

    if (['all', 'every', 'any', 'each'].includes(lower)) {
      out.push(kw('FORALL'));
      i++;
      continue;
    }

    if (
      lower === 'there' &&
      i + 1 < raw.length &&
      raw[i + 1]!.kind === 'ID'
    ) {
      const nextLower = raw[i + 1]!.value.toLowerCase();
      if (['exists', 'exist', 'is', 'are'].includes(nextLower)) {
        out.push(kw('EXISTS'));
        i += 2;
        continue;
      }
    }

    if (
      lower === 'we' &&
      i + 2 < raw.length &&
      raw[i + 1]!.kind === 'ID' &&
      raw[i + 2]!.kind === 'ID' &&
      raw[i + 1]!.value.toLowerCase() === 'can' &&
      raw[i + 2]!.value.toLowerCase() === 'find'
    ) {
      out.push(kw('EXISTS'));
      i += 3;
      continue;
    }

    if (lower === 'some') {
      out.push(kw('EXISTS'));
      i++;
      continue;
    }

    // --- Scope boundaries ---
    if (lower === 'such' && i + 1 < raw.length && raw[i + 1]!.kind === 'ID' && raw[i + 1]!.value.toLowerCase() === 'that') {
      out.push(kw('SUCHTHAT'));
      i += 2;
      continue;
    }

    if (lower === 'so' && i + 1 < raw.length && raw[i + 1]!.kind === 'ID' && raw[i + 1]!.value.toLowerCase() === 'that') {
      out.push(kw('SUCHTHAT'));
      i += 2;
      continue;
    }

    // "where" and "with the property that" both introduce the body clause
    if (lower === 'where') {
      out.push(kw('SUCHTHAT'));
      i++;
      continue;
    }

    if (
      lower === 'with' &&
      i + 3 < raw.length &&
      raw[i + 1]!.kind === 'ID' &&
      raw[i + 2]!.kind === 'ID' &&
      raw[i + 3]!.kind === 'ID' &&
      raw[i + 1]!.value.toLowerCase() === 'the' &&
      raw[i + 2]!.value.toLowerCase() === 'property' &&
      raw[i + 3]!.value.toLowerCase() === 'that'
    ) {
      out.push(kw('SUCHTHAT'));
      i += 4;
      continue;
    }

    // --- Logical connectives ---
    if (['and', 'plus', 'also', 'but'].includes(lower)) {
      out.push(kw('AND'));
      i++;
      continue;
    }

    if (lower === 'or') {
      out.push(kw('OR'));
      i++;
      continue;
    }

    if (lower === 'either') {
      i++;
      continue;
    }

    if (lower === 'unless') {
      out.push(kw('UNLESS'));
      i++;
      continue;
    }

    // "if and only if" → IFF
    if (
      lower === 'if' &&
      i + 3 < raw.length &&
      raw[i + 1]!.kind === 'ID' &&
      raw[i + 2]!.kind === 'ID' &&
      raw[i + 3]!.kind === 'ID' &&
      raw[i + 1]!.value.toLowerCase() === 'and' &&
      raw[i + 2]!.value.toLowerCase() === 'only' &&
      raw[i + 3]!.value.toLowerCase() === 'if'
    ) {
      out.push(kw('IFF'));
      i += 4;
      continue;
    }

    if (lower === 'iff') {
      out.push(kw('IFF'));
      i++;
      continue;
    }

    if (
      lower === 'only' &&
      i + 1 < raw.length &&
      raw[i + 1]!.kind === 'ID' &&
      raw[i + 1]!.value.toLowerCase() === 'if'
    ) {
      out.push(kw('ONLYIF'));
      i += 2;
      continue;
    }

    if (lower === 'whenever') {
      out.push(kw('IF'));
      i++;
      continue;
    }

    if (
      lower === 'every' &&
      i + 1 < raw.length &&
      raw[i + 1]!.kind === 'ID' &&
      raw[i + 1]!.value.toLowerCase() === 'time'
    ) {
      out.push(kw('IF'));
      i += 2;
      continue;
    }

    if (lower === 'if') {
      out.push(kw('IF'));
      i++;
      continue;
    }

    if (lower === 'then') {
      out.push(kw('THEN'));
      i++;
      continue;
    }

    // --- Necessary / sufficient ---
    if (
      lower === 'necessary' &&
      i + 2 < raw.length &&
      raw[i + 1]!.kind === 'ID' &&
      raw[i + 2]!.kind === 'ID' &&
      raw[i + 1]!.value.toLowerCase() === 'and' &&
      raw[i + 2]!.value.toLowerCase() === 'sufficient'
    ) {
      out.push(kw('NECSUFF'));
      i += 3;
      continue;
    }

    if (lower === 'sufficient') {
      out.push(kw('SUFFICIENT'));
      i++;
      continue;
    }

    if (['necessary', 'required', 'requires', 'depends'].includes(lower)) {
      out.push(kw('NECESSARY'));
      i++;
      continue;
    }

    // --- Negation ---
    if (lower === 'not') {
      out.push(kw('NOT'));
      i++;
      continue;
    }

    // Default: keep identifier as-is (preserve spelling and case)
    out.push({ kind: 'ID', value: t.value });
    i++;
  }

  return out;
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
  // Do "or equal" and compound phrases first so "greater than or equal to" isn't shortened to "greater than"
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

  // Less than (after "or equal" so we don't eat "less than or equal")
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
