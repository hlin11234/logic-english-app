import { describe, it, expect } from 'vitest';
import type { Expr } from './Ast';
import { validateAst } from './validateAst';

describe('validateAst variable scoping', () => {
  it('flags unbound variables in relations', () => {
    const ast: Expr = {
      kind: 'relation',
      op: '<',
      left: { kind: 'var', name: 'x' },
      right: { kind: 'var', name: 'y' },
    };

    const result = validateAst(ast);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Unbound variable x');
    expect(result.errors).toContain('Unbound variable y');
  });

  it('accepts bound variables introduced by quantifiers', () => {
    const ast: Expr = {
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

    const result = validateAst(ast);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(Array.from(result.inScopeVars)).toEqual(expect.arrayContaining(['x', 'y']));
  });

  it('allows constants without quantifiers', () => {
    const ast: Expr = {
      kind: 'relation',
      op: '<',
      left: { kind: 'const', name: 'a' },
      right: { kind: 'num', value: 1 },
    };

    const result = validateAst(ast);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('handles predicate arguments from scope', () => {
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

  it('flags unbound predicate arguments', () => {
    const ast: Expr = {
      kind: 'predicate',
      name: 'Tomato',
      args: [{ kind: 'var', name: 'x' }],
    };

    const result = validateAst(ast);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Unbound variable x');
  });
});

