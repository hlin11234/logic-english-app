import { describe, it, expect } from 'vitest';
import type { Expr } from '../parser/Ast';
import { validateAst } from '../parser/validateAst';

function makeTomatoImpliesFruit(): Expr {
  return {
    kind: 'quantifier',
    q: 'forall',
    var: 'x',
    body: {
      kind: 'binary',
      op: 'impl',
      left: {
        kind: 'predicate',
        name: 'Tomato',
        args: [{ kind: 'var', name: 'x' }],
      },
      right: {
        kind: 'predicate',
        name: 'Fruit',
        args: [{ kind: 'var', name: 'x' }],
      },
    },
  };
}

describe('builder examples (scope expectations)', () => {
  it('relation x < y requires y to be quantified', () => {
    const unbound: Expr = {
      kind: 'relation',
      op: '<',
      left: { kind: 'var', name: 'x' },
      right: { kind: 'var', name: 'y' },
    };

    const r1 = validateAst(unbound);
    expect(r1.ok).toBe(false);
    expect(r1.errors).toContain('Unbound variable x');
    expect(r1.errors).toContain('Unbound variable y');

    const bound: Expr = {
      kind: 'quantifier',
      q: 'forall',
      var: 'x',
      body: {
        kind: 'quantifier',
        q: 'exists',
        var: 'y',
        body: {
          kind: 'relation',
          op: '<',
          left: { kind: 'var', name: 'x' },
          right: { kind: 'var', name: 'y' },
        },
      },
    };

    const r2 = validateAst(bound);
    expect(r2.ok).toBe(true);
  });

  it('predicate Tomato(x) uses x from scope', () => {
    const ast: Expr = {
      kind: 'quantifier',
      q: 'forall',
      var: 'x',
      body: {
        kind: 'predicate',
        name: 'Tomato',
        args: [{ kind: 'var', name: 'x' }],
      },
    };

    const result = validateAst(ast);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('sufficient condition example ∀x (Tomato(x) → Fruit(x)) is valid', () => {
    const ast = makeTomatoImpliesFruit();
    const result = validateAst(ast);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

