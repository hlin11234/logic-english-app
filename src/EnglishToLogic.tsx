import { useState } from 'react';
import { parseEnglishPhrase } from './english/phraseParser';
import { phraseToLogic } from './english/phraseToLogic';
import { englishToAst } from './englishTemplates/astFromEnglish';
import { exprToString } from './parser/exprToString';
import { Composer } from './components/Composer';
import { SymbolBank } from './components/SymbolBank';
import SupportedStructures from './components/SupportedStructures';
import './EnglishToLogic.css';

const EXAMPLES = [
  // Quantified statements
  'for all real numbers x, there exists a real number y such that x < y',
  'for every real number x, some real number y is greater than x',
  'there exists an integer n such that n >= 0 and n < 5',
  'for every natural number n, there exists a natural number m such that m > n',
  'for all integers m, m is not equal to m+1',
  'all real numbers x are positive or negative',
  'any integer n is either even or odd',
  
  // Relations with natural language
  'x is less than y',
  'x is greater than or equal to 5',
  'x is at most 10',
  'x is at least 0',
  'x equals y',
  'x is the same as y',
  'x is different from y',
  'x is not equal to y',
  'x belongs to the real numbers',
  'x is an element of the integers',
  
  // Logical operators
  'p only if q',
  'q if p',
  'if p then q',
  'p iff q',
  'p if and only if q',
  'p is sufficient for q',
  'p is necessary for q',
  'p is necessary and sufficient for q',
  'x > 0 only if x >= 0',
  'p and q',
  'p or q',
  'not p',
  'p is not true',
  'it is not the case that p',
  
  // Condition phrases (phraseToUnaryPredicate fallback – no pre-registration)
  'being a tomato is a sufficient condition for being a fruit',
  'being a fruit is a necessary condition for being a tomato',
  'being a uatx student is a sufficient condition to get a student id',
  'being a citizen is a sufficient condition to vote',
  'having a ticket is necessary for entering the concert',
  'being divisible by 4 is sufficient for being even',
  'being even is necessary for being divisible by 4',
];

function ExamplesDropdown({ onSelect }: { onSelect: (text: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="etl-examples">
      <button type="button" className="etl-examples-btn" onClick={() => setIsOpen(!isOpen)}>
        Examples {isOpen ? '▼' : '▶'}
      </button>
      {isOpen && (
        <div className="etl-examples-list">
          {EXAMPLES.map((ex, i) => (
            <button key={i} type="button" className="etl-example-item" onClick={() => { onSelect(ex); setIsOpen(false); }}>
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EnglishToLogic() {
  const [englishInput, setEnglishInput] = useState('');
  const [logicOutput, setLogicOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleEnglishSubmit = () => {
    if (!englishInput.trim()) {
      setError('Please enter some text.');
      setLogicOutput('');
      return;
    }

    // Try new template system first
    try {
      const ast = englishToAst(englishInput);
      if (ast) {
        setError(null);
        try {
          const logic = exprToString(ast);
          setLogicOutput(logic);
          return;
        } catch (error) {
          console.error('Error converting AST to string:', error);
          setError(`Error formatting logic: ${error instanceof Error ? error.message : String(error)}`);
          setLogicOutput('');
          return;
        }
      }
    } catch (error) {
      console.error('Error parsing English:', error);
      setError(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
      setLogicOutput('');
      return;
    }

    // Check if it might be an unknown phrase error
    const normalized = englishInput.toLowerCase().trim();
    if (normalized.includes('sufficient') || normalized.includes('necessary') || normalized.includes('condition')) {
      // Try to extract the phrase that might be unknown
      const phraseMatch = normalized.match(/(?:being|getting|having|get|has)\s+[^is]+/);
      if (phraseMatch) {
        const phrase = phraseMatch[0]!.trim();
        setError(`Unknown phrase: "${phrase}". Add to Phrase→Predicate mappings.`);
        setLogicOutput('');
        return;
      }
    }

    // Fall back to old phrase parser
    try {
      const r = parseEnglishPhrase(englishInput);
      if (!r.ok) {
        setError('No template matched. Use supported structures or the Composer.');
        setLogicOutput('');
        return;
      }
      setError(null);
      const logic = phraseToLogic(englishInput);
      setLogicOutput(logic);
    } catch (error) {
      console.error('Error in fallback parser:', error);
      setError(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
      setLogicOutput('');
    }
  };

  const handleComposerExport = (logic: string) => {
    if (logic && logic.trim()) {
      setLogicOutput(logic);
      setError(null);
    } else {
      setError('Cannot export empty expression.');
      setLogicOutput('');
    }
  };

  const handleInsert = (text: string) => {
    setEnglishInput((prev) => prev + text);
  };

  return (
    <div className="panels">
      <div className="panel">
        <div className="panel-header">English Input</div>
        <div className="panel-body">
          <div className="etl-section">
            <div className="etl-subheader">Guided Composer</div>
            <Composer onExport={handleComposerExport} />
          </div>
          <div className="etl-section etl-divider">
            <div className="etl-subheader">Simple English Phrases</div>
            <p className="etl-phrase-note">
              Unrecognized &quot;being a &lt;noun&gt;&quot; phrases will auto-map to <code>PredicateName(x)</code>. You can override in the Phrase→Predicate dictionary.
            </p>
            <ExamplesDropdown onSelect={(text) => setEnglishInput(text)} />
            <div className="etl-phrase-input">
              <textarea
                className="etl-textarea"
                value={englishInput}
                onChange={(e) => {
                  setEnglishInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleEnglishSubmit();
                  }
                }}
                placeholder='Try: "for all real numbers x, there exists a real number y such that x < y"'
                spellCheck={false}
                aria-label="English phrase input"
              />
              <div className="etl-phrase-actions">
                <button type="button" onClick={handleEnglishSubmit}>
                  Convert to Logic
                </button>
                <span className="etl-hint">Ctrl+Enter to convert</span>
              </div>
              {error && <div className="etl-error error-msg">{error}</div>}
            </div>
          </div>
          <div className="etl-section etl-divider">
            <SupportedStructures />
          </div>
          <div className="symbol-bank-wrap">
            <div className="panel-header">Symbol Bank</div>
            <div className="panel-body">
              <SymbolBank onInsert={handleInsert} compact />
            </div>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">Logic Output</div>
        <div className="panel-body">
          {logicOutput ? (
            <div className="etl-output">
              <pre className="etl-logic pre-wrap">{logicOutput}</pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(logicOutput).catch(() => {});
                }}
                className="etl-copy"
              >
                Copy
              </button>
            </div>
          ) : (
            <p className="muted">Use the Composer or enter an English phrase to generate logic.</p>
          )}
        </div>
      </div>
    </div>
  );
}
