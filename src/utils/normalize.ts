/** Normalize ASCII operators to Unicode, format spacing. */

const REPLACEMENTS: [string | RegExp, string][] = [
  ['forall', '∀'],
  ['exists', '∃'],
  ['!', '¬'],
  ['~', '¬'],
  ['&', '∧'],
  ['|', '∨'],
  ['->', '→'],
  ['<->', '↔'],
];

/** Convert ASCII operators to Unicode. Longest first to avoid partial matches. */
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

/** Pretty-print parentheses spacing: ( expr ) => ( expr ). */
export function formatSpacing(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, ' ( ')
    .replace(/\s*\)\s*/g, ' ) ')
    .replace(/\s*,\s*/g, ', ')
    .trim()
    .replace(/\s+/g, ' ');
}
