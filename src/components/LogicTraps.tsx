import { useMemo } from 'react';
import type { Expr } from '../parser/Ast';
import './LogicTraps.css';

interface TrapWarning {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning';
}

interface LogicTrapsProps {
  ast: Expr | null;
  input: string;
}

export function LogicTraps({ ast, input }: LogicTrapsProps) {
  const warnings = useMemo(() => detectTraps(ast, input), [ast, input]);

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="logic-traps">
      <div className="logic-traps-header">
        <span className="logic-traps-title">⚠️ Common Logic Traps</span>
      </div>
      <div className="logic-traps-content">
        {warnings.map((w) => (
          <div key={w.id} className={`logic-trap-item logic-trap-${w.severity}`}>
            <div className="logic-trap-title">{w.title}</div>
            <div className="logic-trap-message">{w.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function detectTraps(ast: Expr | null, input: string): TrapWarning[] {
  const warnings: TrapWarning[] = [];

  if (!ast) {
    return warnings;
  }

  // Currently we don't use the original input, but keep it for future heuristics
  void input;

  // 1. Detect negated quantifiers: ¬∀x or ¬∃x (recursively)
  checkNegatedQuantifiers(ast, warnings);

  // 2. Detect nested quantifiers: ∀x∃y vs ∃y∀x (recursively)
  checkQuantifierOrder(ast, warnings);

  // 3. Detect necessary/sufficient patterns: ∀x (A(x) → B(x))
  checkNecessarySufficient(ast, warnings);

  // 4. Detect implications that might be "A only if B" or "A if B"
  checkImplicationDirection(ast, warnings);

  return warnings;
}

function checkNegatedQuantifiers(expr: Expr, warnings: TrapWarning[]): void {
  if (expr.kind === 'negation' && expr.body.kind === 'quantifier') {
    const quant = expr.body;
    warnings.push({
      id: 'negated-quantifier',
      title: 'Negated Quantifier',
      message: `You have ¬${quant.q === 'forall' ? '∀' : '∃'}${quant.var}. Remember: ¬∀x P(x) means "not all x satisfy P" (i.e., ∃x ¬P(x)), and ¬∃x P(x) means "no x satisfies P" (i.e., ∀x ¬P(x)).`,
      severity: 'info',
    });
  }
  
  // Recurse into subexpressions
  if (expr.kind === 'negation') {
    checkNegatedQuantifiers(expr.body, warnings);
  } else if (expr.kind === 'quantifier') {
    checkNegatedQuantifiers(expr.body, warnings);
  } else if (expr.kind === 'binary') {
    checkNegatedQuantifiers(expr.left, warnings);
    checkNegatedQuantifiers(expr.right, warnings);
  }
}

function checkQuantifierOrder(expr: Expr, warnings: TrapWarning[]): void {
  if (expr.kind === 'quantifier' && expr.body.kind === 'quantifier') {
    const outer = expr;
    const inner = expr.body;
    warnings.push({
      id: 'quantifier-order',
      title: 'Quantifier Order Matters',
      message: `You have ${outer.q === 'forall' ? '∀' : '∃'}${outer.var} ${inner.q === 'forall' ? '∀' : '∃'}${inner.var}. The order matters! ${outer.q === 'forall' ? '∀' : '∃'}${outer.var} ${inner.q === 'forall' ? '∀' : '∃'}${inner.var} means "for ${outer.q === 'forall' ? 'every' : 'some'} ${outer.var}, there ${inner.q === 'forall' ? 'is every' : 'is some'} ${inner.var}". Swapping the order changes the meaning.`,
      severity: 'info',
    });
  }
  
  // Recurse
  if (expr.kind === 'quantifier') {
    checkQuantifierOrder(expr.body, warnings);
  } else if (expr.kind === 'negation') {
    checkQuantifierOrder(expr.body, warnings);
  } else if (expr.kind === 'binary') {
    checkQuantifierOrder(expr.left, warnings);
    checkQuantifierOrder(expr.right, warnings);
  }
}

function checkNecessarySufficient(expr: Expr, warnings: TrapWarning[]): void {
  // Pattern: ∀x (A(x) → B(x))
  if (expr.kind === 'quantifier' && expr.q === 'forall') {
    if (expr.body.kind === 'binary' && expr.body.op === 'impl') {
      const left = expr.body.left;
      const right = expr.body.right;
      
      // Check if both sides are predicates with same variable
      if (isPredicateWithVar(left, expr.var) && isPredicateWithVar(right, expr.var)) {
        warnings.push({
          id: 'necessary-sufficient',
          title: 'Necessary vs Sufficient',
          message: `You have ∀${expr.var} (A(${expr.var}) → B(${expr.var})). This means "A is sufficient for B" (if A, then B) and "B is necessary for A" (A only if B). Remember: sufficient = left side, necessary = right side.`,
          severity: 'info',
        });
      }
    }
  }
  
  // Recurse
  if (expr.kind === 'quantifier') {
    checkNecessarySufficient(expr.body, warnings);
  } else if (expr.kind === 'negation') {
    checkNecessarySufficient(expr.body, warnings);
  } else if (expr.kind === 'binary') {
    checkNecessarySufficient(expr.left, warnings);
    checkNecessarySufficient(expr.right, warnings);
  }
}

function checkImplicationDirection(expr: Expr, warnings: TrapWarning[]): void {
  if (expr.kind === 'binary' && expr.op === 'impl') {
    // Check if it's a simple implication between predicates
    const leftIsSimple = isSimplePredicate(expr.left);
    const rightIsSimple = isSimplePredicate(expr.right);
    
    if (leftIsSimple && rightIsSimple) {
      warnings.push({
        id: 'only-if-vs-if',
        title: '"Only if" vs "If"',
        message: `You have A → B. Remember: "A only if B" means A → B, but "A if B" means B → A (reversed!). The word "only" changes the direction.`,
        severity: 'info',
      });
    }
  }
  
  // Recurse
  if (expr.kind === 'quantifier') {
    checkImplicationDirection(expr.body, warnings);
  } else if (expr.kind === 'negation') {
    checkImplicationDirection(expr.body, warnings);
  } else if (expr.kind === 'binary') {
    checkImplicationDirection(expr.left, warnings);
    checkImplicationDirection(expr.right, warnings);
  }
}

function isSimplePredicate(expr: Expr): boolean {
  return expr.kind === 'predicate' || (expr.kind === 'negation' && expr.body.kind === 'predicate');
}

function isPredicateWithVar(expr: Expr, varName: string): boolean {
  if (expr.kind === 'predicate') {
    return expr.args.length === 1 && expr.args[0] === varName;
  }
  if (expr.kind === 'negation' && expr.body.kind === 'predicate') {
    return expr.body.args.length === 1 && expr.body.args[0] === varName;
  }
  return false;
}
