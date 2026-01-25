/// <reference types="vitest/globals" />
import { tokenize, TokenizerError } from './Tokenizer';

describe('Tokenizer', () => {
  it('tokenizes Unicode quantifiers', () => {
    const tokens = tokenize('∀ ∃');
    expect(tokens[0]?.type).toBe('forall');
    expect(tokens[1]?.type).toBe('exists');
  });

  it('tokenizes ASCII quantifiers', () => {
    const tokens = tokenize('forall x exists y');
    expect(tokens[0]?.type).toBe('forall');
    expect(tokens[1]?.type).toBe('var');
    expect(tokens[2]?.type).toBe('exists');
    expect(tokens[3]?.type).toBe('var');
  });

  it('tokenizes Unicode connectives', () => {
    const tokens = tokenize('¬ ∧ ∨ → ↔');
    expect(tokens.map((t) => t.type)).toEqual(['not', 'and', 'or', 'impl', 'iff', 'eof']);
  });

  it('tokenizes ASCII connectives', () => {
    const tokens = tokenize('! & | -> <->');
    expect(tokens.map((t) => t.type)).toEqual(['not', 'and', 'or', 'impl', 'iff', 'eof']);
  });

  it('tokenizes variables', () => {
    const tokens = tokenize('x y z x1');
    expect(tokens[0]?.type).toBe('var');
    expect(tokens[1]?.type).toBe('var');
    expect(tokens[2]?.type).toBe('var');
    expect(tokens[3]?.type).toBe('var');
  });

  it('tokenizes predicate names', () => {
    const tokens = tokenize('P Q R L');
    expect(tokens.map((t) => t.type)).toEqual(['var', 'var', 'var', 'var', 'eof']);
  });

  it('tokenizes parentheses and comma', () => {
    const tokens = tokenize('( ) ,');
    expect(tokens.map((t) => t.type)).toEqual(['lparen', 'rparen', 'comma', 'eof']);
  });

  it('tokenizes complex expression', () => {
    const tokens = tokenize('∀x ( P(x) → Q(x) )');
    expect(tokens.map((t) => t.type)).toEqual([
      'forall',
      'var',
      'lparen',
      'var',
      'lparen',
      'var',
      'rparen',
      'impl',
      'var',
      'lparen',
      'var',
      'rparen',
      'rparen',
      'eof',
    ]);
  });

  it('handles whitespace', () => {
    const tokens = tokenize('  ∀  x  (  P  (  x  )  )  ');
    expect(tokens[0]?.type).toBe('forall');
    expect(tokens[1]?.type).toBe('var');
  });

  it('throws on unexpected character', () => {
    expect(() => tokenize('@')).toThrow(TokenizerError);
  });

  it('tracks line and column', () => {
    const tokens = tokenize('∀\nx');
    expect(tokens[0]?.line).toBe(1);
    expect(tokens[1]?.line).toBe(2);
  });
});
