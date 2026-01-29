/** Pretty-print AST as indented tree. */

import type { Expr, Term } from './Ast';

export function astToTree(ast: Expr, indent = 0): string {
  const pad = '  '.repeat(indent);
  switch (ast.kind) {
    case 'quantifier':
      return `${pad}${ast.q === 'forall' ? '∀' : '∃'}${ast.var}${
        ast.domain ? ` ∈ ${ast.domain.name}` : ''
      }\n${astToTree(ast.body, indent + 1)}`;
    case 'negation':
      return `${pad}¬\n${astToTree(ast.body, indent + 1)}`;
    case 'binary':
      return (
        `${pad}${opSymbol(ast.op)}\n` +
        `${astToTree(ast.left, indent + 1)}\n` +
        `${astToTree(ast.right, indent + 1)}`
      );
    case 'predicate':
      return `${pad}${ast.name}(${ast.args.map(termToString).join(', ')})`;
    case 'relation':
      return `${pad}${termToString(ast.left)} ${ast.op} ${termToString(ast.right)}`;
    default:
      return pad;
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

function opSymbol(op: 'and' | 'or' | 'impl' | 'iff'): string {
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
