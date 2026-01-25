/** Recursive descent parser for first-order logic. */

import type { Token, TokenType } from './Tokenizer';
import { tokenize, TokenizerError } from './Tokenizer';
import type { Expr, Term, Domain } from './Ast';

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number
  ) {
    super(`${message} at line ${line}, column ${column}`);
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

  private expect(type: TokenType): Token {
    if (!this.at(type)) {
      const t = this.current;
      throw new ParseError(
        `Expected ${type}, got ${t.type}`,
        t.line,
        t.column
      );
    }
    return this.advance();
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
          throw new ParseError('Expected domain symbol after ∈', this.current.line, this.current.column);
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
      throw new ParseError(`Unexpected term in atom`, t.line, t.column);
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
    throw new ParseError(`Unexpected token: ${t.type}`, t.line, t.column);
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
    throw new ParseError(`Expected term, got ${t.type}`, t.line, t.column);
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
      throw new ParseError('Predicate name must be a variable', this.current.line, this.current.column);
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

export function getParseError(input: string): { message: string; line: number; column: number } | null {
  try {
    parse(input);
    return null;
  } catch (e) {
    if (e instanceof ParseError) return { message: e.message, line: e.line, column: e.column };
    if (e instanceof TokenizerError) return { message: e.message, line: e.line, column: e.column };
    throw e;
  }
}

export { TokenizerError };
