/**
 * Parse controlled English phrases to logic templates.
 * Supports: "for all x, ...", "there exists x such that ...", "not ...",
 * "A and B", "A or B", "if A then B", "A iff B".
 */

export type PhraseResult =
  | { ok: true; kind: 'forall'; var: string; rest: string }
  | { ok: true; kind: 'exists'; var: string; rest: string }
  | { ok: true; kind: 'not'; rest: string }
  | { ok: true; kind: 'and'; left: string; right: string }
  | { ok: true; kind: 'or'; left: string; right: string }
  | { ok: true; kind: 'impl'; left: string; right: string }
  | { ok: true; kind: 'iff'; left: string; right: string }
  | { ok: false; message: string };

export function parseEnglishPhrase(input: string): PhraseResult {
  const t = input.trim();
  if (!t) return { ok: false, message: 'Empty input.' };

  const forAllMatch = t.match(/^for\s+all\s+(\w+)\s*,\s*(.+)$/is);
  if (forAllMatch) return { ok: true, kind: 'forall', var: forAllMatch[1]!, rest: forAllMatch[2]!.trim() };

  const existsMatch = t.match(/^there\s+exists\s+(?:an?\s+)?(\w+)\s+such\s+that\s+(.+)$/is);
  if (existsMatch) return { ok: true, kind: 'exists', var: existsMatch[1]!, rest: existsMatch[2]!.trim() };

  const notMatch = t.match(/^not\s+(.+)$/is);
  if (notMatch) return { ok: true, kind: 'not', rest: notMatch[1]!.trim() };

  const andMatch = matchBinary(t, /\s+and\s+/i);
  if (andMatch) return { ok: true, kind: 'and', left: andMatch.left, right: andMatch.right };

  const orMatch = matchBinary(t, /\s+or\s+/i);
  if (orMatch) return { ok: true, kind: 'or', left: orMatch.left, right: orMatch.right };

  const ifMatch = t.match(/^if\s+(.+)\s+then\s+(.+)$/is);
  if (ifMatch) return { ok: true, kind: 'impl', left: ifMatch[1]!.trim(), right: ifMatch[2]!.trim() };

  const iffMatch = t.match(/^(.+)\s+iff\s+(.+)$/is);
  if (iffMatch) return { ok: true, kind: 'iff', left: iffMatch[1]!.trim(), right: iffMatch[2]!.trim() };

  return { ok: false, message: 'Use the Composer or Symbol Bank templates.' };
}

function matchBinary(t: string, sep: RegExp): { left: string; right: string } | null {
  const idx = t.search(sep);
  if (idx < 0) return null;
  const [full] = t.match(sep) ?? [];
  if (!full) return null;
  const left = t.slice(0, idx).trim();
  const right = t.slice(idx + full.length).trim();
  if (!left || !right) return null;
  return { left, right };
}
