import { toEnglish } from '../renderer/english';
import type { Expr } from '../parser/Ast';
import { astToTree } from '../parser/astDisplay';
import { StepByStepExplanation } from './StepByStepExplanation';
import './EnglishRenderer.css';

interface EnglishRendererProps {
  ast: Expr | null;
  parseError: boolean;
  /** When true, render only the English output block (for right column). */
  onlyOutput?: boolean;
}

function EnglishBlock({
  ast,
  parseError,
}: {
  ast: Expr | null;
  parseError: boolean;
}) {
  if (parseError) {
    return (
      <div className="er-section">
        <div className="panel-header">English</div>
        <div className="panel-body">
          <p className="muted">Fix parse errors in the logic input to see English output.</p>
        </div>
      </div>
    );
  }
  if (!ast) {
    return (
      <div className="er-section">
        <div className="panel-header">English</div>
        <div className="panel-body">
          <p className="muted">Enter a formula to see its English translation.</p>
        </div>
      </div>
    );
  }
  const english = toEnglish(ast);
  return (
    <div className="er-section">
      <div className="panel-header">English</div>
      <div className="panel-body">
        <p className="er-output">{english}</p>
      </div>
    </div>
  );
}

export function EnglishRenderer({ ast, parseError, onlyOutput }: EnglishRendererProps) {
  if (onlyOutput) {
    return (
      <div className="english-renderer english-renderer--only">
        <EnglishBlock ast={ast} parseError={parseError} />
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="english-renderer">
        <EnglishBlock ast={null} parseError={true} />
        <div className="er-section">
          <div className="panel-header">Structure</div>
          <div className="panel-body">
            <p className="muted">—</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ast) {
    return (
      <div className="english-renderer">
        <EnglishBlock ast={null} parseError={false} />
        <div className="er-section">
          <div className="panel-header">Structure</div>
          <div className="panel-body">
            <p className="muted">—</p>
          </div>
        </div>
      </div>
    );
  }

  const structure = astToTree(ast);

  return (
    <div className="english-renderer">
      <StepByStepExplanation ast={ast} />
      <EnglishBlock ast={ast} parseError={false} />
      <div className="er-section">
        <div className="panel-header">Structure</div>
        <div className="panel-body">
          <pre className="er-tree pre-wrap">{structure}</pre>
        </div>
      </div>
    </div>
  );
}
