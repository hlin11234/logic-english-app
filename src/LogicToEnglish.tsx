import { useState, useEffect } from 'react';
import { parse, getParseError } from './parser/Parser';
import type { Expr } from './parser/Ast';
import { astToTree } from './parser/astDisplay';
import { LogicEditor } from './components/LogicEditor';
import { EnglishRenderer } from './components/EnglishRenderer';
import { LogicTraps } from './components/LogicTraps';
import { StepByStepExplanation } from './components/StepByStepExplanation';
import './components/EnglishRenderer.css';

export function LogicToEnglish() {
  const [input, setInput] = useState('∀x ( P(x) → Q(x) )');
  const [parseError, setParseError] = useState<{ 
    line: number; 
    column: number; 
    message: string;
    expected?: string[];
    got?: string;
    charIndex?: number;
  } | null>(null);
  const [ast, setAst] = useState<Expr | null>(null);

  useEffect(() => {
    const err = getParseError(input);
    if (err) {
      setParseError({ 
        line: err.line, 
        column: err.column, 
        message: err.message,
        expected: err.expected,
        got: err.got,
        charIndex: err.charIndex,
      });
      setAst(null);
    } else {
      setParseError(null);
      try {
        const { ast: a } = parse(input);
        setAst(a);
      } catch {
        setAst(null);
      }
    }
  }, [input]);

  return (
    <div className="panels">
      <div className="panel">
        <div className="panel-header">Logic</div>
        <div className="panel-body">
          <LogicEditor
            value={input}
            onChange={setInput}
            parseError={parseError}
            showSymbolBank
          />
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">Output</div>
        <div className="panel-body output-split">
          <div className="output-left">
            <LogicTraps ast={ast} input={input} />
            {ast && <StepByStepExplanation ast={ast} />}
            {ast && (
              <div className="er-section output-structure">
                <div className="panel-header">Structure</div>
                <div className="panel-body">
                  <pre className="er-tree pre-wrap">{astToTree(ast)}</pre>
                </div>
              </div>
            )}
          </div>
          <div className="output-right">
            <EnglishRenderer ast={ast} parseError={!!parseError} onlyOutput />
          </div>
        </div>
      </div>
    </div>
  );
}
