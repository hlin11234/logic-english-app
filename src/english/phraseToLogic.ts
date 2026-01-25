/**
 * Convert controlled English phrase parse result to logic string.
 * Recursively processes "rest" for quantifiers/negation; unresolved rest => ___.
 */

import { parseEnglishPhrase, type PhraseResult } from './phraseParser';

export function phraseToLogic(input: string): string {
  const r = parseEnglishPhrase(input);
  if (!r.ok) return '';
  return buildLogic(r);
}

function buildLogic(r: PhraseResult): string {
  if (!r.ok) return '___';
  switch (r.kind) {
    case 'forall':
      return `∀${r.var} ( ${phraseToLogic(r.rest) || '___'} )`;
    case 'exists':
      return `∃${r.var} ( ${phraseToLogic(r.rest) || '___'} )`;
    case 'not':
      return `¬( ${phraseToLogic(r.rest) || '___'} )`;
    case 'and':
    case 'or':
    case 'impl':
    case 'iff':
      return buildBinary(r.left, r.right, opStr(r.kind));
  }
}

function opStr(k: 'and' | 'or' | 'impl' | 'iff'): string {
  return { and: '∧', or: '∨', impl: '→', iff: '↔' }[k];
}

function buildBinary(left: string, right: string, op: string): string {
  const l = phraseToLogic(left) || '___';
  const r = phraseToLogic(right) || '___';
  return `( ${l} ) ${op} ( ${r} )`;
}
