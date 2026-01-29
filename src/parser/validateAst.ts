import type { Expr, Quantifier, Term } from './Ast';

export interface AstValidationResult {
  ok: boolean;
  errors: string[];
  inScopeVars: Set<string>;
}

export function validateAst(ast: Expr): AstValidationResult {
  const errors: string[] = [];
  const inScopeVars = new Set<string>();

  function walkExpr(node: Expr, scope: Set<string>) {
    switch (node.kind) {
      case 'quantifier': {
        const q = node as Quantifier;
        const nextScope = new Set(scope);
        nextScope.add(q.var);
        inScopeVars.add(q.var);
        walkExpr(q.body, nextScope);
        return;
      }
      case 'negation':
        walkExpr(node.body, scope);
        return;
      case 'binary':
        walkExpr(node.left, scope);
        walkExpr(node.right, scope);
        return;
      case 'relation':
        checkTerm(node.left, scope);
        checkTerm(node.right, scope);
        return;
      case 'predicate':
        for (const t of node.args) {
          checkTerm(t, scope);
        }
        return;
    }
  }

  function checkTerm(term: Term, scope: Set<string>) {
    switch (term.kind) {
      case 'var':
        if (!scope.has(term.name)) {
          errors.push(`Unbound variable ${term.name}`);
        }
        return;
      case 'num':
      case 'const':
        return;
      case 'func':
        for (const a of term.args) checkTerm(a, scope);
        return;
      case 'paren':
        checkTerm(term.term, scope);
        return;
    }
  }

  walkExpr(ast, new Set());

  return {
    ok: errors.length === 0,
    errors,
    inScopeVars,
  };
}

