/** Recursive descent parser for first-order logic. */

import type { Token, TokenType } from './Tokenizer';
import { tokenize, TokenizerError } from './Tokenizer';
import type { Expr, Term, Domain } from './Ast';

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
    public readonly expected?: TokenType[],
    public readonly got?: TokenType
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export function parse(input: string): { ast: Expr; tokens: Token[] } {
  const tokens = tokenize(input);
  const p = new ParserState(tokens);
  const ast = p.parseExpr();
  p.expect('eof');
  return { ast, tokens };
}

class ParserState {
  private i = 0;

  constructor(private readonly tokens: Token[]) {}

  private get current(): Token {
    return this.tokens[this.i] ?? this.tokens[this.tokens.length - 1]!;
  }

  private at(type: TokenType): boolean {
    return this.current.type === type;
  }

  private advance(): Token {
    const t = this.current;
    if (t.type !== 'eof') this.i++;
    return t;
  }

  private expect(type: TokenType, expectedAlternatives?: TokenType[]): Token {
    if (!this.at(type)) {
      const t = this.current;
      const expected = expectedAlternatives ? [type, ...expectedAlternatives] : [type];
      throw new ParseError(
        `Expected ${formatExpectedTokens(expected)}, got ${t.type}`,
        t.line,
        t.column,
        expected,
        t.type
      );
    }
    return this.advance();
  }

  private expectOneOf(types: TokenType[]): Token {
    const t = this.current;
    for (const type of types) {
      if (this.at(type)) {
        return this.advance();
      }
    }
    throw new ParseError(
      `Expected one of: ${formatExpectedTokens(types)}, got ${t.type}`,
      t.line,
      t.column,
      types,
      t.type
    );
  }

  parseExpr(): Expr {
    return this.parseIff();
  }

  private parseIff(): Expr {
    let left = this.parseImp();
    while (this.at('iff')) {
      this.advance();
      const right = this.parseImp();
      left = { kind: 'binary', op: 'iff', left, right };
    }
    return left;
  }

  private parseImp(): Expr {
    let left = this.parseOr();
    while (this.at('impl')) {
      this.advance();
      const right = this.parseOr();
      left = { kind: 'binary', op: 'impl', left, right };
    }
    return left;
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.at('or')) {
      this.advance();
      const right = this.parseAnd();
      left = { kind: 'binary', op: 'or', left, right };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();
    while (this.at('and')) {
      this.advance();
      const right = this.parseNot();
      left = { kind: 'binary', op: 'and', left, right };
    }
    return left;
  }

  private parseNot(): Expr {
    if (this.at('not')) {
      this.advance();
      const body = this.parseNot();
      return { kind: 'negation', body };
    }
    return this.parseAtom();
  }

  private parseAtom(): Expr {
    // Quantifier: (forall|exists) var [∈ domain] ( AtomOrParen )
    if (this.at('forall') || this.at('exists')) {
      const q = this.at('forall') ? 'forall' : 'exists';
      this.advance();
      const v = this.expect('var').value;
      
      // Check for typed domain: ∈ domain
      let domain: Domain | undefined;
      if (this.at('member')) {
        this.advance();
        if (this.at('domain')) {
          const domainToken = this.advance();
          domain = { kind: 'domain', name: domainToken.value };
        } else {
          const t = this.current;
          throw new ParseError(
            'Expected domain symbol after ∈',
            t.line,
            t.column,
            ['domain'],
            t.type
          );
        }
      }
      
      let body: Expr;
      if (this.at('lparen')) {
        this.advance();
        body = this.parseExpr();
        this.expect('rparen');
      } else {
        body = this.parseAtom();
      }
      return { kind: 'quantifier', q, var: v, domain, body };
    }

    // Relation: Term RelOp Term
    if (this.canStartTerm()) {
      const left = this.parseTerm();
      const relOp = this.parseRelOp();
      if (relOp) {
        const right = this.parseTerm();
        return { kind: 'relation', op: relOp, left, right };
      }
      // Not a relation, try predicate
      if (this.at('lparen')) {
        return this.parsePredicateFromName(left);
      }
      // Single term - treat as variable predicate for now
      if (left.kind === 'var') {
        return { kind: 'predicate', name: left.name, args: [left.name] };
      }
      const t = this.current;
      throw new ParseError(
        `Unexpected term in atom`,
        t.line,
        t.column,
        ['lparen', 'var', 'ident'],
        t.type
      );
    }

    if (this.at('lparen')) {
      this.advance();
      const e = this.parseExpr();
      this.expect('rparen');
      return e;
    }

    if (this.at('ident') || this.at('var')) {
      return this.parsePredicate();
    }

    const t = this.current;
    throw new ParseError(
      `Unexpected token: ${t.type}`,
      t.line,
      t.column,
      ['forall', 'exists', 'var', 'ident', 'lparen'],
      t.type
    );
  }

  private canStartTerm(): boolean {
    return this.at('var') || this.at('num') || this.at('lparen');
  }

  private parseTerm(): Term {
    if (this.at('var')) {
      const name = this.advance().value;
      return { kind: 'var', name };
    }
    if (this.at('num')) {
      const value = parseFloat(this.advance().value);
      return { kind: 'num', value };
    }
    if (this.at('lparen')) {
      this.advance();
      const term = this.parseTerm();
      this.expect('rparen');
      return { kind: 'paren', term };
    }
    // Try function call: ident(...)
    if (this.at('ident')) {
      const name = this.advance().value;
      if (this.at('lparen')) {
        this.advance();
        const args: Term[] = [];
        if (!this.at('rparen')) {
          args.push(this.parseTerm());
          while (this.at('comma')) {
            this.advance();
            args.push(this.parseTerm());
          }
        }
        this.expect('rparen');
        return { kind: 'func', name, args };
      }
      // Single identifier as variable
      return { kind: 'var', name };
    }
    const t = this.current;
    throw new ParseError(
      `Expected term, got ${t.type}`,
      t.line,
      t.column,
      ['var', 'num', 'ident', 'lparen'],
      t.type
    );
  }

  private parseRelOp(): Expr['kind'] extends 'relation' ? Expr['op'] : null {
    if (this.at('lt')) {
      this.advance();
      return '<';
    }
    if (this.at('le')) {
      this.advance();
      return '≤';
    }
    if (this.at('gt')) {
      this.advance();
      return '>';
    }
    if (this.at('ge')) {
      this.advance();
      return '≥';
    }
    if (this.at('eq')) {
      this.advance();
      return '=';
    }
    if (this.at('ne')) {
      this.advance();
      return '≠';
    }
    if (this.at('member')) {
      this.advance();
      return '∈';
    }
    if (this.at('notmember')) {
      this.advance();
      return '∉';
    }
    return null as any;
  }

  private parsePredicateFromName(leftTerm: Term): Expr {
    if (leftTerm.kind !== 'var') {
      const t = this.current;
      throw new ParseError(
        'Predicate name must be a variable',
        t.line,
        t.column,
        ['var'],
        t.type
      );
    }
    const name = leftTerm.name;
    this.advance(); // consume '('
    const args: string[] = [];
    args.push(this.expect('var').value);
    while (this.at('comma')) {
      this.advance();
      args.push(this.expect('var').value);
    }
    this.expect('rparen');
    return { kind: 'predicate', name, args };
  }

  private parsePredicate(): Expr {
    const name = (this.at('ident') ? this.expect('ident') : this.expect('var')).value;
    if (!this.at('lparen')) {
      return { kind: 'predicate', name, args: [name] };
    }
    this.advance();
    const args: string[] = [];
    args.push(this.expect('var').value);
    while (this.at('comma')) {
      this.advance();
      args.push(this.expect('var').value);
    }
    this.expect('rparen');
    return { kind: 'predicate', name, args };
  }
}

function formatExpectedTokens(types: TokenType[]): string {
  if (types.length === 0) return 'nothing';
  if (types.length === 1) return types[0]!;
  if (types.length === 2) return `${types[0]} or ${types[1]}`;
  return `${types.slice(0, -1).join(', ')}, or ${types[types.length - 1]}`;
}

function lineColumnToIndex(input: string, line: number, column: number): number {
  let currentLine = 1;
  let currentCol = 1;
  let index = 0;
  
  while (index < input.length && (currentLine < line || (currentLine === line && currentCol < column))) {
    if (input[index] === '\n') {
      currentLine++;
      currentCol = 1;
    } else {
      currentCol++;
    }
    index++;
  }
  
  return index;
}

export function getParseError(input: string): { 
  message: string; 
  line: number; 
  column: number;
  expected?: TokenType[];
  got?: TokenType;
  charIndex?: number;
} | null {
  try {
    parse(input);
    return null;
  } catch (e) {
    if (e instanceof ParseError) {
      const charIndex = lineColumnToIndex(input, e.line, e.column);
      return { 
        message: e.message, 
        line: e.line, 
        column: e.column,
        expected: e.expected,
        got: e.got,
        charIndex,
      };
    }
    if (e instanceof TokenizerError) {
      const charIndex = lineColumnToIndex(input, e.line, e.column);
      return { 
        message: e.message, 
        line: e.line, 
        column: e.column,
        charIndex,
      };
    }
    throw e;
  }
}

export { TokenizerError };
