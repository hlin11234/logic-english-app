import { toEnglish } from '../renderer/english';
import type { Expr } from '../parser/Ast';
import { astToTree } from '../parser/astDisplay';
import { StepByStepExplanation } from './StepByStepExplanation';
import './EnglishRenderer.css';

interface EnglishRendererProps {
  ast: Expr | null;
  parseError: boolean;
}

export function EnglishRenderer({ ast, parseError }: EnglishRendererProps) {
  if (parseError) {
    return (
      <div className="english-renderer">
        <div className="er-section">
          <div className="panel-header">English</div>
          <div className="panel-body">
            <p className="muted">Fix parse errors in the logic input to see English output.</p>
          </div>
        </div>
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
        <div className="er-section">
          <div className="panel-header">English</div>
          <div className="panel-body">
            <p className="muted">Enter a formula to see its English translation.</p>
          </div>
        </div>
        <div className="er-section">
          <div className="panel-header">Structure</div>
          <div className="panel-body">
            <p className="muted">—</p>
          </div>
        </div>
      </div>
    );
  }

  const english = toEnglish(ast);
  const structure = astToTree(ast);

  return (
    <div className="english-renderer">
      <StepByStepExplanation ast={ast} />
      <div className="er-section">
        <div className="panel-header">English</div>
        <div className="panel-body">
          <p className="er-output">{english}</p>
        </div>
      </div>
      <div className="er-section">
        <div className="panel-header">Structure</div>
        <div className="panel-body">
          <pre className="er-tree pre-wrap">{structure}</pre>
        </div>
      </div>
    </div>
  );
}
