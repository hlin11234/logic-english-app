import type { Expr, Term } from '../parser/Ast';
import './StepByStepExplanation.css';

interface ExplanationStep {
  step: number;
  text: string;
  formula?: string;
}

interface StepByStepExplanationProps {
  ast: Expr | null;
}

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

function exprToFormula(expr: Expr): string {
  switch (expr.kind) {
    case 'quantifier':
      const domainPart = expr.domain ? `∈${expr.domain.name} ` : '';
      return `${expr.q === 'forall' ? '∀' : '∃'}${expr.var}${domainPart}( ${exprToFormula(expr.body)} )`;
    case 'negation':
      return `¬( ${exprToFormula(expr.body)} )`;
    case 'binary':
      const op = expr.op === 'and' ? '∧' : expr.op === 'or' ? '∨' : expr.op === 'impl' ? '→' : '↔';
      return `( ${exprToFormula(expr.left)} ) ${op} ( ${exprToFormula(expr.right)} )`;
    case 'predicate':
      return `${expr.name}(${expr.args.map(termToString).join(', ')})`;
    case 'relation':
      return `${termToString(expr.left)} ${expr.op} ${termToString(expr.right)}`;
  }
}

export function StepByStepExplanation({ ast }: StepByStepExplanationProps) {
  if (!ast) {
    return null;
  }

  const steps = generateExplanation(ast, 1);

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="step-explanation">
      <div className="step-explanation-header">
        <span className="step-explanation-title">Step-by-Step Explanation</span>
      </div>
      <div className="step-explanation-content">
        {steps.map((step) => (
          <div key={step.step} className="step-item">
            <div className="step-number">{step.step}.</div>
            <div className="step-content">
              {step.formula && (
                <code className="step-formula">{step.formula}</code>
              )}
              <p className="step-text">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function generateExplanation(expr: Expr, startStep: number): ExplanationStep[] {
  const steps: ExplanationStep[] = [];
  let currentStep = startStep;

  function explain(expr: Expr, depth: number, showFormula: boolean = false): void {
    switch (expr.kind) {
      case 'quantifier': {
        const domainText = expr.domain ? ` ${getDomainName(expr.domain.name)}` : '';
        const quantifierSymbol = expr.q === 'forall' ? '∀' : '∃';
        const domainPart = expr.domain ? `∈${expr.domain.name} ` : '';
        const quantifierText = expr.q === 'forall' ? 'for every' : 'there exists';
        
        // Show full formula only for outermost quantifier
        const formula = showFormula || depth === 0 
          ? `${quantifierSymbol}${expr.var}${domainPart}( ${exprToFormula(expr.body)} )`
          : undefined;
        
        const depthLabel = depth === 0 ? 'outer' : depth === 1 ? 'inner' : 'nested';
        const quantifierPhrase = domainText 
          ? `${quantifierText} ${domainText} ${expr.var}`
          : `${quantifierText} ${expr.var}`;
        steps.push({
          step: currentStep++,
          text: `The ${depthLabel} quantifier ${quantifierSymbol}${expr.var}${domainText ? ` over ${domainText}s` : ''} means "${quantifierPhrase}".`,
          formula,
        });

        // Recursively explain the body
        explain(expr.body, depth + 1, false);
        break;
      }

      case 'relation': {
        const leftStr = termToString(expr.left);
        const rightStr = termToString(expr.right);
        const relationText = getRelationText(expr.op, leftStr, rightStr);
        
        steps.push({
          step: currentStep++,
          text: `The relation ${leftStr} ${expr.op} ${rightStr} states: ${relationText}.`,
        });
        break;
      }

      case 'binary': {
        // For binary operators, explain left, then right, then the combination
        explain(expr.left, depth, false);
        explain(expr.right, depth, false);
        let opExplanation = '';
        
        switch (expr.op) {
          case 'impl':
            opExplanation = 'The implication (→) means "if the left side is true, then the right side must be true".';
            break;
          case 'iff':
            opExplanation = 'The biconditional (↔) means "the left side is true if and only if the right side is true".';
            break;
          case 'and':
            opExplanation = 'The conjunction (∧) means both parts must be true.';
            break;
          case 'or':
            opExplanation = 'The disjunction (∨) means at least one part must be true.';
            break;
        }
        
        steps.push({
          step: currentStep++,
          text: opExplanation,
        });
        break;
      }

      case 'negation': {
        steps.push({
          step: currentStep++,
          text: 'The negation (¬) means "it is not the case that" the following statement is true.',
        });
        explain(expr.body, depth, false);
        break;
      }

      case 'predicate': {
        const argStr = expr.args.map(termToString).join(', ');
        const appliedTo = expr.args.length === 1
          ? termToString(expr.args[0]!)
          : expr.args.map(termToString).join(' and ');
        steps.push({
          step: currentStep++,
          text: `The predicate ${expr.name}(${argStr}) represents a property applied to ${appliedTo}.`,
        });
        break;
      }
    }
  }

  explain(expr, 0, true);
  return steps;
}

function getRelationText(op: string, left: string, right: string): string {
  switch (op) {
    case '<':
      return `${left} is less than ${right}`;
    case '<=':
    case '≤':
      return `${left} is less than or equal to ${right}`;
    case '>':
      return `${left} is greater than ${right}`;
    case '>=':
    case '≥':
      return `${left} is greater than or equal to ${right}`;
    case '=':
      return `${left} equals ${right}`;
    case '!=':
    case '≠':
      return `${left} is not equal to ${right}`;
    case '∈':
      return `${left} is an element of ${right}`;
    case '∉':
      return `${left} is not an element of ${right}`;
    default:
      return `${left} ${op} ${right}`;
  }
}
