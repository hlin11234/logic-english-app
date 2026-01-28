/** Normalize ASCII operators to Unicode, format spacing. */

/** Longest first so e.g. "<->" is replaced before "->". */
const REPLACEMENTS: [string | RegExp, string][] = [
  ['<->', '↔'],
  ['->', '→'],
  ['<=', '≤'],
  ['>=', '≥'],
  ['!=', '≠'],
  ['forall', '∀'],
  ['exists', '∃'],
  ['!', '¬'],
  ['~', '¬'],
  ['&', '∧'],
  ['|', '∨'],
];

/** Normalize: -> →, <-> ↔, <= ≤, >= ≥, != ≠, plus forall/exists/negation/conj. */
export function normalizeToUnicode(input: string): string {
  let out = input;
  for (const [from, to] of REPLACEMENTS) {
    const pattern = typeof from === 'string' ? escapeRegex(from) : from.source;
    out = out.replace(new RegExp(pattern, 'g'), to);
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Format: consistent spacing, consistent parentheses. No semantic changes. */
export function formatSpacing(input: string): string {
  let out = input
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, ' ( ')
    .replace(/\s*\)\s*/g, ' ) ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
  // Multi-char ops first (so "<->" / "->" / "<=" / ">=" / "!=" get spaced correctly)
  const multiChar = ['<->', '->', '<=', '>=', '!='];
  for (const op of multiChar) {
    const esc = op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\s*${esc}\\s*`, 'g'), ` ${op} `);
  }
  // Single-char ops: → ↔ ∧ ∨ ≤ ≥ ≠ ∈ ∉ < > =
  const ops = ['→', '↔', '∧', '∨', '≤', '≥', '≠', '∈', '∉', '<', '>', '='];
  for (const op of ops) {
    const esc = op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\s*${esc}\\s*`, 'g'), ` ${op} `);
  }
  // Negation: ensure ¬( with no space before (
  out = out.replace(/\s*¬\s*\(\s*/g, '¬( ');
  return out.trim().replace(/\s+/g, ' ');
}
