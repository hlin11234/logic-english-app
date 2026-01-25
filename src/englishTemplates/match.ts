/**
 * Tokenization and template matching for controlled English.
 * Normalizes text and matches against templates.
 */

import type { Template, TokenPattern } from './templates';
import { normalizeNecessarySufficient } from './dataset';

export type Token = string;

export interface MatchResult {
  templateId: string;
  slots: Record<string, Token[]>;
}

/**
 * Normalize English text:
 * - lowercase
 * - remove punctuation: .,;:!? quotes
 * - normalize quantifiers
 * - normalize conjunctions
 * - remove articles: a, an, the
 */
export function normalizeEnglish(text: string): string {
  let normalized = text.toLowerCase().trim();

  // Remove punctuation
  normalized = normalized.replace(/[.,;:!?'"]/g, ' ');

  // Normalize quantifiers - existential
  normalized = normalized.replace(/\bthere\s+exists\b/g, 'there exists');
  normalized = normalized.replace(/\bthere\s+is\b/g, 'there exists');
  normalized = normalized.replace(/\bthere\s+are\b/g, 'there exists');
  normalized = normalized.replace(/\bthere's\b/g, 'there exists');
  normalized = normalized.replace(/\bthere\s+exist\b/g, 'there exists');
  normalized = normalized.replace(/\bexists\b/g, 'there exists');
  normalized = normalized.replace(/\bexist\b/g, 'there exists');
  normalized = normalized.replace(/\bsome\b/g, 'there exists'); // "some x" → "there exists x"

  // Normalize quantifiers - universal
  normalized = normalized.replace(/\bfor\s+all\b/g, 'for all');
  normalized = normalized.replace(/\bfor\s+every\b/g, 'for all');
  normalized = normalized.replace(/\bfor\s+each\b/g, 'for all');
  normalized = normalized.replace(/\ball\b(?=\s+\w+\s+)/g, 'for all'); // "all x" → "for all x"
  normalized = normalized.replace(/\bevery\b(?=\s+\w+\s+)/g, 'for all'); // "every x" → "for all x"
  normalized = normalized.replace(/\beach\b(?=\s+\w+\s+)/g, 'for all'); // "each x" → "for all x"
  normalized = normalized.replace(/\bany\b(?=\s+\w+\s+)/g, 'for all'); // "any x" → "for all x"

  // Normalize conjunctions (AND)
  normalized = normalized.replace(/\bas\s+well\s+as\b/g, 'and');
  normalized = normalized.replace(/\bplus\b/g, 'and'); // "A plus B" → "A and B" (logical, not arithmetic)
  normalized = normalized.replace(/\balso\b/g, 'and'); // "A also B" → "A and B"
  
  // Normalize disjunctions (OR)
  normalized = normalized.replace(/\bor\s+else\b/g, 'or');
  normalized = normalized.replace(/\beither\s+\.\.\.\s+or\b/g, 'or'); // "either A or B" → "A or B"

  // Normalize relation phrases with "is" prefix and other variants
  // Less than or equal
  normalized = normalized.replace(/\bis\s+less\s+than\s+or\s+equal\s+to\b/g, 'less than or equal to');
  normalized = normalized.replace(/\bis\s+smaller\s+than\s+or\s+equal\s+to\b/g, 'less than or equal to');
  normalized = normalized.replace(/\bis\s+at\s+most\b/g, 'at most');
  normalized = normalized.replace(/\bis\s+not\s+greater\s+than\b/g, 'less than or equal to');
  normalized = normalized.replace(/\bis\s+no\s+greater\s+than\b/g, 'less than or equal to');
  
  // Greater than or equal
  normalized = normalized.replace(/\bis\s+greater\s+than\s+or\s+equal\s+to\b/g, 'greater than or equal to');
  normalized = normalized.replace(/\bis\s+larger\s+than\s+or\s+equal\s+to\b/g, 'greater than or equal to');
  normalized = normalized.replace(/\bis\s+at\s+least\b/g, 'at least');
  normalized = normalized.replace(/\bis\s+not\s+less\s+than\b/g, 'greater than or equal to');
  normalized = normalized.replace(/\bis\s+no\s+less\s+than\b/g, 'greater than or equal to');
  
  // Less than
  normalized = normalized.replace(/\bis\s+less\s+than\b/g, 'less than');
  normalized = normalized.replace(/\bis\s+smaller\s+than\b/g, 'less than');
  normalized = normalized.replace(/\bis\s+lower\s+than\b/g, 'less than');
  normalized = normalized.replace(/\bis\s+below\b/g, 'less than');
  
  // Greater than
  normalized = normalized.replace(/\bis\s+greater\s+than\b/g, 'greater than');
  normalized = normalized.replace(/\bis\s+larger\s+than\b/g, 'greater than');
  normalized = normalized.replace(/\bis\s+higher\s+than\b/g, 'greater than');
  normalized = normalized.replace(/\bis\s+above\b/g, 'greater than');
  
  // Equal
  normalized = normalized.replace(/\bis\s+equal\s+to\b/g, 'equal to');
  normalized = normalized.replace(/\bis\s+equal\b/g, 'equal to');
  normalized = normalized.replace(/\bis\s+the\s+same\s+as\b/g, 'equal to');
  normalized = normalized.replace(/\bis\s+equivalent\s+to\b/g, 'equal to');
  
  // Not equal
  normalized = normalized.replace(/\bis\s+not\s+equal\s+to\b/g, 'not equal to');
  normalized = normalized.replace(/\bis\s+not\s+equal\b/g, 'not equal to');
  normalized = normalized.replace(/\bdoes\s+not\s+equal\b/g, 'not equal to');
  normalized = normalized.replace(/\bis\s+different\s+from\b/g, 'not equal to');
  normalized = normalized.replace(/\bis\s+not\s+the\s+same\s+as\b/g, 'not equal to');
  
  // Membership
  normalized = normalized.replace(/\bis\s+in\b/g, 'is in');
  normalized = normalized.replace(/\bbelongs\s+to\b/g, 'is in');
  normalized = normalized.replace(/\bis\s+in\s+the\s+set\b/g, 'is an element of');
  normalized = normalized.replace(/\bis\s+an?\s+element\s+of\b/g, 'is an element of');
  normalized = normalized.replace(/\bis\s+a\s+member\s+of\b/g, 'is an element of');
  normalized = normalized.replace(/\bis\s+contained\s+in\b/g, 'is an element of');
  
  // Not in
  normalized = normalized.replace(/\bis\s+not\s+in\b/g, 'is not in');
  normalized = normalized.replace(/\bdoes\s+not\s+belong\s+to\b/g, 'is not in');
  normalized = normalized.replace(/\bis\s+not\s+in\s+the\s+set\b/g, 'is not an element of');
  normalized = normalized.replace(/\bis\s+not\s+an?\s+element\s+of\b/g, 'is not an element of');
  normalized = normalized.replace(/\bis\s+not\s+a\s+member\s+of\b/g, 'is not an element of');
  normalized = normalized.replace(/\bis\s+not\s+contained\s+in\b/g, 'is not an element of');

  // Normalize negation
  normalized = normalized.replace(/\bis\s+not\b/g, 'not');
  normalized = normalized.replace(/\bisn't\b/g, 'not');
  normalized = normalized.replace(/\bisnt\b/g, 'not');
  normalized = normalized.replace(/\bdoes\s+not\b/g, 'not');
  normalized = normalized.replace(/\bdoesn't\b/g, 'not');
  normalized = normalized.replace(/\bdoesnt\b/g, 'not');
  normalized = normalized.replace(/\bdo\s+not\b/g, 'not');
  normalized = normalized.replace(/\bdon't\b/g, 'not');
  normalized = normalized.replace(/\bdont\b/g, 'not');
  normalized = normalized.replace(/\bit\s+is\s+not\s+the\s+case\s+that\b/g, 'not');
  normalized = normalized.replace(/\bit\s+is\s+false\s+that\b/g, 'not');
  
  // Normalize necessary/sufficient markers
  normalized = normalizeNecessarySufficient(normalized);

  // Normalize "such that" variants
  normalized = normalized.replace(/\bsuch\s+that\b/g, 'such that');
  normalized = normalized.replace(/\bso\s+that\b/g, 'such that');

  // Remove articles (but keep them for now in tokenization, we'll filter during matching)
  // Actually, let's keep them and handle in templates

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Tokenize normalized English text into tokens.
 */
export function tokenize(normalizedText: string): Token[] {
  return normalizedText.split(/\s+/).filter((t) => t.length > 0);
}

/**
 * Match tokens against a template pattern.
 * Returns match result with captured slots, or null if no match.
 * Uses backtracking to handle slot boundaries correctly.
 */
export function matchTemplate(tokens: Token[], template: Template): MatchResult | null {
  const slots: Record<string, Token[]> = {};

  function matchPattern(pattern: TokenPattern, startIndex: number): number | null {
    let idx = startIndex;

    for (let i = 0; i < pattern.length; i++) {
      const element = pattern[i]!;

      if (typeof element === 'string') {
        // Exact token match
        if (idx >= tokens.length || tokens[idx] !== element) {
          return null;
        }
        idx++;
      } else if (element.type === 'slot') {
        // Capture slot: try to match the rest of the pattern with different slot sizes
        const slotStart = idx;
        const restPattern = pattern.slice(i + 1);

        if (restPattern.length === 0) {
          // Slot is at the end, consume all remaining tokens
          slots[element.name] = tokens.slice(slotStart);
          return tokens.length;
        }

        // Try different slot sizes (from 1 token to remaining tokens)
        // Use backtracking: try smallest first, then larger
        // Note: nested matchPattern calls may modify other slots, but that's okay
        // since we only return on success, and on failure we continue trying
        for (let slotSize = 1; slotSize <= tokens.length - idx; slotSize++) {
          const slotEnd = slotStart + slotSize;
          slots[element.name] = tokens.slice(slotStart, slotEnd);
          const restResult = matchPattern(restPattern, slotEnd);
          if (restResult !== null) {
            return restResult;
          }
        }
        // No valid slot size found - clear this slot
        delete slots[element.name];
        return null;
      } else if (element.type === 'optional') {
        // Try to match, but don't fail if it doesn't
        const savedIdx = idx;
        const result = matchPattern(element.tokens, idx);
        if (result === null) {
          idx = savedIdx; // Continue without matching
        } else {
          idx = result;
        }
      } else if (element.type === 'oneOf') {
        // Try each option
        let matched = false;
        for (const option of element.options) {
          const savedIdx = idx;
          let allMatched = true;
          for (const optToken of option) {
            if (idx >= tokens.length || tokens[idx] !== optToken) {
              allMatched = false;
              break;
            }
            idx++;
          }
          if (allMatched) {
            matched = true;
            break;
          } else {
            idx = savedIdx; // Reset and try next option
          }
        }
        if (!matched) {
          return null;
        }
      }
    }

    return idx;
  }

  const result = matchPattern(template.pattern, 0);
  if (result === null || result !== tokens.length) {
    return null; // Didn't match completely
  }

  return {
    templateId: template.id,
    slots,
  };
}


/**
 * Try to match tokens against any template.
 * Returns the first matching template result, or null.
 */
export function matchAnyTemplate(tokens: Token[], templates: Template[]): MatchResult | null {
  for (const template of templates) {
    const result = matchTemplate(tokens, template);
    if (result) {
      return result;
    }
  }
  return null;
}
