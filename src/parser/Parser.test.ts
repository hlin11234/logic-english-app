/// <reference types="vitest/globals" />
import { parse, ParseError } from './Parser';

describe('Parser', () => {
  it('parses simple predicate', () => {
    const { ast } = parse('P(x)');
    expect(ast.kind).toBe('predicate');
    if (ast.kind === 'predicate') {
      expect(ast.name).toBe('P');
      expect(ast.args).toEqual(['x']);
    }
  });

  it('parses universal quantifier', () => {
    const { ast } = parse('∀x ( P(x) )');
    expect(ast.kind).toBe('quantifier');
    if (ast.kind === 'quantifier') {
      expect(ast.q).toBe('forall');
      expect(ast.var).toBe('x');
      expect(ast.body.kind).toBe('predicate');
    }
  });

  it('parses existential quantifier', () => {
    const { ast } = parse('∃x ( Q(x) )');
    expect(ast.kind).toBe('quantifier');
    if (ast.kind === 'quantifier') {
      expect(ast.q).toBe('exists');
    }
  });

  it('parses quantifier without parentheses', () => {
    const { ast } = parse('∀x P(x)');
    expect(ast.kind).toBe('quantifier');
  });

  it('parses conjunction', () => {
    const { ast } = parse('( P(x) ) ∧ ( Q(x) )');
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary') {
      expect(ast.op).toBe('and');
    }
  });

  it('parses disjunction', () => {
    const { ast } = parse('( P(x) ) ∨ ( Q(x) )');
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary') {
      expect(ast.op).toBe('or');
    }
  });

  it('parses implication', () => {
    const { ast } = parse('( P(x) ) → ( Q(x) )');
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary') {
      expect(ast.op).toBe('impl');
    }
  });

  it('parses biconditional', () => {
    const { ast } = parse('( P(x) ) ↔ ( Q(x) )');
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary') {
      expect(ast.op).toBe('iff');
    }
  });

  it('parses negation', () => {
    const { ast } = parse('¬( P(x) )');
    expect(ast.kind).toBe('negation');
  });

  it('respects operator precedence', () => {
    const { ast } = parse('P(x) ∧ Q(x) ∨ R(x)');
    // Should be: (P(x) ∧ Q(x)) ∨ R(x)
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary') {
      expect(ast.op).toBe('or');
      expect(ast.left.kind).toBe('binary');
      if (ast.left.kind === 'binary') {
        expect(ast.left.op).toBe('and');
      }
    }
  });

  it('parses nested quantifiers', () => {
    const { ast } = parse('∀x ( ∃y ( L(x,y) ) )');
    expect(ast.kind).toBe('quantifier');
    if (ast.kind === 'quantifier') {
      expect(ast.body.kind).toBe('quantifier');
    }
  });

  it('parses binary predicate', () => {
    const { ast } = parse('L(x,y)');
    expect(ast.kind).toBe('predicate');
    if (ast.kind === 'predicate') {
      expect(ast.args).toEqual(['x', 'y']);
    }
  });

  it('parses complex expression', () => {
    const { ast } = parse('∀x ( ( P(x) ) → ( Q(x) ) )');
    expect(ast.kind).toBe('quantifier');
  });

  it('parses ASCII operators', () => {
    const { ast } = parse('forall x ( P(x) -> Q(x) )');
    expect(ast.kind).toBe('quantifier');
  });

  it('throws on invalid syntax', () => {
    expect(() => parse('∀x')).toThrow(ParseError);
  });

  it('throws on unmatched parentheses', () => {
    expect(() => parse('( P(x) )')).not.toThrow();
    expect(() => parse('( P(x) ')).toThrow();
  });

  it('parses multiple binary operators with correct precedence', () => {
    const { ast } = parse('P(x) → Q(x) ↔ R(x)');
    // Should be: (P(x) → Q(x)) ↔ R(x)
    expect(ast.kind).toBe('binary');
    if (ast.kind === 'binary') {
      expect(ast.op).toBe('iff');
    }
  });

  describe('Typed quantifiers', () => {
    it('parses typed universal quantifier', () => {
      const { ast } = parse('∀x∈ℝ ( P(x) )');
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('forall');
        expect(ast.var).toBe('x');
        expect(ast.domain).toBeDefined();
        expect(ast.domain?.name).toBe('ℝ');
      }
    });

    it('parses typed existential quantifier', () => {
      const { ast } = parse('∃y∈ℤ ( Q(y) )');
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('exists');
        expect(ast.var).toBe('y');
        expect(ast.domain?.name).toBe('ℤ');
      }
    });

    it('parses nested typed quantifiers', () => {
      const { ast } = parse('∀x∈ℝ ( ∃y∈ℝ ( x < y ) )');
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('forall');
        expect(ast.domain?.name).toBe('ℝ');
        expect(ast.body.kind).toBe('quantifier');
        if (ast.body.kind === 'quantifier') {
          expect(ast.body.q).toBe('exists');
          expect(ast.body.domain?.name).toBe('ℝ');
        }
      }
    });
  });

  describe('Relations', () => {
    it('parses less than relation', () => {
      const { ast } = parse('x < y');
      expect(ast.kind).toBe('relation');
      if (ast.kind === 'relation') {
        expect(ast.op).toBe('<');
        expect(ast.left.kind).toBe('var');
        expect(ast.right.kind).toBe('var');
      }
    });

    it('parses less than or equal (Unicode)', () => {
      const { ast } = parse('x ≤ y');
      expect(ast.kind).toBe('relation');
      if (ast.kind === 'relation') {
        expect(ast.op).toBe('≤');
      }
    });

    it('parses less than or equal (ASCII)', () => {
      const { ast } = parse('x <= y');
      expect(ast.kind).toBe('relation');
      if (ast.kind === 'relation') {
        expect(ast.op).toBe('≤');
      }
    });

    it('parses greater than or equal (Unicode)', () => {
      const { ast } = parse('x ≥ y');
      expect(ast.kind).toBe('relation');
      if (ast.kind === 'relation') {
        expect(ast.op).toBe('≥');
      }
    });

    it('parses greater than or equal (ASCII)', () => {
      const { ast } = parse('x >= y');
      expect(ast.kind).toBe('relation');
      if (ast.kind === 'relation') {
        expect(ast.op).toBe('≥');
      }
    });

    it('parses not equal (Unicode)', () => {
      const { ast } = parse('x ≠ y');
      expect(ast.kind).toBe('relation');
      if (ast.kind === 'relation') {
        expect(ast.op).toBe('≠');
      }
    });

    it('parses not equal (ASCII)', () => {
      const { ast } = parse('x != y');
      expect(ast.kind).toBe('relation');
      if (ast.kind === 'relation') {
        expect(ast.op).toBe('≠');
      }
    });

    it('parses membership relation', () => {
      const { ast } = parse('x ∈ ℝ');
      expect(ast.kind).toBe('relation');
      if (ast.kind === 'relation') {
        expect(ast.op).toBe('∈');
      }
    });

    it('parses numeric terms in relations', () => {
      const { ast } = parse('x < 5');
      expect(ast.kind).toBe('relation');
      if (ast.kind === 'relation') {
        expect(ast.left.kind).toBe('var');
        expect(ast.right.kind).toBe('num');
        if (ast.right.kind === 'num') {
          expect(ast.right.value).toBe(5);
        }
      }
    });

    it('parses relation in quantifier body', () => {
      const { ast } = parse('∀x∈ℝ ( x > 0 )');
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.body.kind).toBe('relation');
        if (ast.body.kind === 'relation') {
          expect(ast.body.op).toBe('>');
        }
      }
    });
  });
});
