/** Pretty-print AST as indented tree. */

import type { Expr } from './Ast';

export function astToTree(ast: Expr, indent = 0): string {
  const pad = '  '.repeat(indent);
  switch (ast.kind) {
    case 'quantifier':
      return `${pad}${ast.q === 'forall' ? '∀' : '∃'}${ast.var}\n${astToTree(ast.body, indent + 1)}`;
    case 'negation':
      return `${pad}¬\n${astToTree(ast.body, indent + 1)}`;
    case 'binary':
      return (
        `${pad}${opSymbol(ast.op)}\n` +
        `${astToTree(ast.left, indent + 1)}\n` +
        `${astToTree(ast.right, indent + 1)}`
      );
    case 'predicate':
      return `${pad}${ast.name}(${ast.args.join(', ')})`;
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
