/** Serialize AST back to formal logic string. */

import type { Expr, Term } from './Ast';

export function exprToString(e: Expr): string {
  switch (e.kind) {
    case 'quantifier':
      const domainPart = e.domain ? `∈${e.domain.name} ` : '';
      return `${e.q === 'forall' ? '∀' : '∃'}${e.var}${domainPart}( ${exprToString(e.body)} )`;
    case 'negation':
      return `¬( ${exprToString(e.body)} )`;
    case 'binary':
      return `( ${exprToString(e.left)} ) ${opStr(e.op)} ( ${exprToString(e.right)} )`;
    case 'predicate':
      return `${e.name}(${e.args.map(termToString).join(', ')})`;
    case 'relation':
      return `${termToString(e.left)} ${e.op} ${termToString(e.right)}`;
  }
}

function termToString(term: Term): string {
  switch (term.kind) {
    case 'var':
      return term.name;
    case 'num':
      return term.value.toString();
    case 'const':
      return term.name;
    case 'func':
      return `${term.name}(${term.args.map(termToString).join(', ')})`;
    case 'paren':
      return `(${termToString(term.term)})`;
  }
}

function opStr(op: 'and' | 'or' | 'impl' | 'iff'): string {
  switch (op) {
    case 'and':
      return '∧';
    case 'or':
      return '∨';
    case 'impl':
      return '→';
    case 'iff':
      return '↔';
  }
}
