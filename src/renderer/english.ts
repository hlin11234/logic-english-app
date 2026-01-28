/** Render AST to English. */

import type { Expr, Term } from '../parser/Ast';

const DOMAIN_NAMES: Record<string, string> = {
  'ℝ': 'real number',
  'ℤ': 'integer',
  'ℚ': 'rational number',
  'ℕ': 'natural number',
  'ℂ': 'complex number',
};

function getDomainName(domain: string): string {
  return DOMAIN_NAMES[domain] || domain;
}

export function toEnglish(ast: Expr): string {
  return render(ast);
}

function render(e: Expr): string {
  switch (e.kind) {
    case 'quantifier':
      return renderQuantifier(e, true);
    case 'negation':
      return `It is not the case that ${renderInner(e.body)}.`;
    case 'binary':
      return binaryEnglish(e);
    case 'predicate':
      return predicateEnglish(e);
    case 'relation':
      return relationEnglish(e) + '.';
  }
}

function renderQuantifier(e: { q: 'forall' | 'exists'; var: string; domain?: { kind: 'domain'; name: string }; body: Expr }, isTop: boolean = false): string {
  const varName = e.var;
  const domainName = e.domain ? getDomainName(e.domain.name) : '';
  const domainText = domainName ? `${domainName} ${varName}` : varName;
  
  // Check if this is a condition pattern: ∀x (A(x) → B(x))
  if (e.q === 'forall' && e.body.kind === 'binary' && e.body.op === 'impl') {
    const left = e.body.left;
    const right = e.body.right;
    
    // Check if both sides are predicates with the same variable
    if (left.kind === 'predicate' && right.kind === 'predicate' && 
        left.args.length === 1 && right.args.length === 1 &&
        left.args[0] === varName && right.args[0] === varName) {
      
      // Try to get phrase for predicate (reverse lookup)
      const leftPhrase = getPhraseForPredicate(left.name);
      const rightPhrase = getPhraseForPredicate(right.name);
      
      if (leftPhrase && rightPhrase) {
        // Natural condition phrasing: ∀x (A(x) → B(x)) means "A is sufficient for B"
        const primary = `For every ${varName}, if ${varName} ${leftPhrase}, then ${varName} ${rightPhrase}.`;
        const alternate1 = `${leftPhrase} is sufficient for ${rightPhrase}.`;
        const alternate2 = `${rightPhrase} is necessary for ${leftPhrase}.`;
        return isTop ? `${primary}\n(Alternate: ${alternate1} Or: ${alternate2})` : primary;
      }
    }
  }
  
  const bodyText = renderInner(e.body);
  const needsSuchThat = e.q === 'exists' && (e.body.kind === 'relation' || e.body.kind === 'binary');
  
  if (e.q === 'forall') {
    const text = `For every ${domainText}, ${bodyText}`;
    return isTop ? text + '.' : text;
  } else {
    const suchThat = needsSuchThat ? ' such that' : '';
    const text = `There exists a ${domainText}${suchThat} ${bodyText}`;
    return isTop ? text + '.' : text;
  }
}

/**
 * Get phrase for a predicate (reverse lookup from dataset)
 * This is a simple implementation - in a full system, we'd maintain a bidirectional map
 */
function getPhraseForPredicate(predicateName: string): string | null {
  // Currently unused; placeholder for future reverse mappings
  void predicateName;
  return null;
}

function renderInner(e: Expr): string {
  switch (e.kind) {
    case 'quantifier':
      return renderQuantifier(e, false);
    case 'negation':
      return `it is not the case that ${renderInner(e.body)}`;
    case 'binary':
      return binaryInner(e);
    case 'predicate':
      return predicateEnglish(e);
    case 'relation':
      return relationEnglish(e);
  }
}

function relationEnglish(e: { op: string; left: Term; right: Term }): string {
  const leftStr = termToString(e.left);
  const rightStr = termToString(e.right);
  
  switch (e.op) {
    case '<':
      return `${leftStr} is less than ${rightStr}`;
    case '≤':
      return `${leftStr} is less than or equal to ${rightStr}`;
    case '>':
      return `${leftStr} is greater than ${rightStr}`;
    case '≥':
      return `${leftStr} is greater than or equal to ${rightStr}`;
    case '=':
      return `${leftStr} equals ${rightStr}`;
    case '≠':
      return `${leftStr} is not equal to ${rightStr}`;
    case '∈':
      return `${leftStr} is an element of ${rightStr}`;
    case '∉':
      return `${leftStr} is not an element of ${rightStr}`;
    default:
      return `${leftStr} ${e.op} ${rightStr}`;
  }
}

function termToString(term: Term): string {
  switch (term.kind) {
    case 'var':
      return term.name;
    case 'num':
      return term.value.toString();
    case 'func':
      return `${term.name}(${term.args.map(termToString).join(', ')})`;
    case 'paren':
      return `(${termToString(term.term)})`;
  }
}

function binaryEnglish(e: { op: 'and' | 'or' | 'impl' | 'iff'; left: Expr; right: Expr }): string {
  switch (e.op) {
    case 'and':
      return `${renderInner(e.left)} and ${renderInner(e.right)}.`;
    case 'or':
      return `${renderInner(e.left)} or ${renderInner(e.right)}.`;
    case 'impl': {
      const left = renderInner(e.left);
      const right = renderInner(e.right);
      const primary = `If ${left}, then ${right}.`;
      const alternate1 = `${left} is sufficient for ${right}.`;
      const alternate2 = `${right} is necessary for ${left}.`;
      return `${primary}\n(Alternate: ${alternate1} Or: ${alternate2})`;
    }
    case 'iff': {
      const left = renderInner(e.left);
      const right = renderInner(e.right);
      const primary = `${left} if and only if ${right}.`;
      const alternate = `${left} is necessary and sufficient for ${right}.`;
      return `${primary}\n(Alternate: ${alternate})`;
    }
  }
}

function binaryInner(e: { op: 'and' | 'or' | 'impl' | 'iff'; left: Expr; right: Expr }): string {
  const left = renderInner(e.left);
  const right = renderInner(e.right);
  switch (e.op) {
    case 'and':
      return `${left} and ${right}`;
    case 'or':
      return `${left} or ${right}`;
    case 'impl':
      return `if ${left}, then ${right}`;
    case 'iff':
      return `${left} if and only if ${right}`;
  }
}

function predicateEnglish(e: { name: string; args: string[] }): string {
  if (e.args.length === 1) {
    // For unary predicates, use natural phrasing
    const varName = e.args[0]!;
    // Try to get phrase from reverse mapping (placeholder for now)
    return `${e.name}(${varName})`;
  }
  return `${e.name} of ${e.args.join(' and ')}`;
}
