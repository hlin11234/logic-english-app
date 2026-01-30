/** Tokenizer for formal logic. Unicode + ASCII fallbacks. */

export type TokenType =
  | 'forall'
  | 'exists'
  | 'not'
  | 'and'
  | 'or'
  | 'impl'
  | 'iff'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'var'
  | 'ident'
  | 'domain' // ℝ ℤ ℚ ℕ ℂ
  | 'member' // ∈
  | 'notmember' // ∉
  | 'lt' // <
  | 'le' // ≤ or <=
  | 'gt' // >
  | 'ge' // ≥ or >=
  | 'eq' // =
  | 'ne' // ≠ or !=
  | 'num' // numeric literal
  | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const OP_MAP: Record<string, TokenType> = {
  '∀': 'forall',
  forall: 'forall',
  '∃': 'exists',
  exists: 'exists',
  '¬': 'not',
  '!': 'not',
  '~': 'not',
  '∧': 'and',
  '&': 'and',
  '∨': 'or',
  '|': 'or',
  '→': 'impl',
  '->': 'impl',
  '↔': 'iff',
  '<->': 'iff',
  '(': 'lparen',
  ')': 'rparen',
  ',': 'comma',
  // Domain symbols
  'ℝ': 'domain',
  'ℤ': 'domain',
  'ℚ': 'domain',
  'ℕ': 'domain',
  'ℂ': 'domain',
  // Membership
  '∈': 'member',
  '∉': 'notmember',
  // Relations (Unicode)
  '<': 'lt',
  '≤': 'le',
  '>': 'gt',
  '≥': 'ge',
  '=': 'eq',
  '≠': 'ne',
  // ASCII relation tokens (multi-char match in tokenize())
  '<=': 'le',
  '>=': 'ge',
  '!=': 'ne',
};

const OP_STRINGS = [
  'forall',
  'exists',
  '->',
  '<->',
  '<=',
  '>=',
  '!=',
  '!',
  '~',
  '&',
  '|',
  '∀',
  '∃',
  '→',
  '↔',
  '¬',
  '∧',
  '∨',
  'ℝ',
  'ℤ',
  'ℚ',
  'ℕ',
  'ℂ',
  '∈',
  '∉',
  '≤',
  '≥',
  '≠',
  '<',
  '>',
  '=',
  '(',
  ')',
  ',',
].sort((a, b) => b.length - a.length);

export class TokenizerError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number
  ) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'TokenizerError';
  }
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  function peek(len = 1): string {
    return input.slice(i, i + len);
  }

  function advance(n: number): void {
    for (let k = 0; k < n; k++) {
      if (input[i] === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  }

  function skipWhitespace(): void {
    while (i < input.length && /[\s\n\r\t]/.test(input[i])) {
      advance(1);
    }
  }

  while (i < input.length) {
    skipWhitespace();
    if (i >= input.length) break;

    const startLine = line;
    const startCol = col;

    // Try multi-char ops first (forall, exists, ->, <->, <=, >=, !=)
    let matched = false;
    for (const op of OP_STRINGS) {
      if (op.length > 1 && peek(op.length) === op) {
        const tt = OP_MAP[op];
        if (tt) {
          // Normalize ASCII to Unicode for relations
          let normalizedValue = op;
          if (op === '<=') normalizedValue = '≤';
          else if (op === '>=') normalizedValue = '≥';
          else if (op === '!=') normalizedValue = '≠';
          
          tokens.push({ type: tt, value: normalizedValue, line: startLine, column: startCol });
          advance(op.length);
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    // Single-char ops (but check for <=, >=, != first)
    const c = peek(1);
    if (OP_MAP[c]) {
      tokens.push({
        type: OP_MAP[c],
        value: c,
        line: startLine,
        column: startCol,
      });
      advance(1);
      continue;
    }

    // Numbers
    if (/[0-9]/.test(c)) {
      let buf = '';
      while (i < input.length && /[0-9]/.test(input[i])) {
        buf += input[i];
        advance(1);
      }
      // Handle negative numbers (if preceded by - and no space)
      if (buf && tokens.length > 0 && tokens[tokens.length - 1]?.value === '-') {
        // This is a negative number, not subtraction
        tokens.pop();
        buf = '-' + buf;
      }
      tokens.push({
        type: 'num',
        value: buf,
        line: startLine,
        column: startCol,
      });
      continue;
    }

    // Identifiers (predicate names) and variables
    if (/[a-zA-Z_]/.test(c)) {
      let buf = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        buf += input[i];
        advance(1);
      }
      // Convention: single-letter or single letter + digit = variable
      const isVar = /^[a-z]$|^[a-z]\d*$/i.test(buf) || buf === 'x' || buf === 'y' || buf === 'z';
      tokens.push({
        type: isVar ? 'var' : 'ident',
        value: buf,
        line: startLine,
        column: startCol,
      });
      continue;
    }

    throw new TokenizerError(`Unexpected character: ${JSON.stringify(c)}`, startLine, startCol);
  }

  tokens.push({
    type: 'eof',
    value: '',
    line: line,
    column: col,
  });
  return tokens;
}
