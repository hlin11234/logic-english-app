import { useState, useEffect } from 'react';
import { parse, getParseError } from './parser/Parser';
import type { Expr } from './parser/Ast';
import { LogicEditor } from './components/LogicEditor';
import { EnglishRenderer } from './components/EnglishRenderer';

export function LogicToEnglish() {
  const [input, setInput] = useState('∀x ( P(x) → Q(x) )');
  const [parseError, setParseError] = useState<{ line: number; column: number; message: string } | null>(null);
  const [ast, setAst] = useState<Expr | null>(null);

  useEffect(() => {
    const err = getParseError(input);
    if (err) {
      setParseError({ line: err.line, column: err.column, message: err.message });
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
        <div className="panel-body">
          <EnglishRenderer ast={ast} parseError={!!parseError} />
        </div>
      </div>
    </div>
  );
}
