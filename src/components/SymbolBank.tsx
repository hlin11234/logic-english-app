import { useState } from 'react';
import './SymbolBank.css';

export type Insertable = { type: 'token'; value: string } | { type: 'template'; value: string; placeholder: string };

const TOKENS: Insertable[] = [
  { type: 'token', value: '∀' },
  { type: 'token', value: '∃' },
  { type: 'token', value: '¬' },
  { type: 'token', value: '∧' },
  { type: 'token', value: '∨' },
  { type: 'token', value: '→' },
  { type: 'token', value: '↔' },
  { type: 'token', value: '(' },
  { type: 'token', value: ')' },
  { type: 'token', value: 'x' },
  { type: 'token', value: 'y' },
  { type: 'token', value: 'z' },
];

const DOMAINS: Insertable[] = [
  { type: 'token', value: 'ℝ' },
  { type: 'token', value: 'ℤ' },
  { type: 'token', value: 'ℚ' },
  { type: 'token', value: 'ℕ' },
  { type: 'token', value: 'ℂ' },
];

const RELATIONS: Insertable[] = [
  { type: 'token', value: '<' },
  { type: 'token', value: '≤' },
  { type: 'token', value: '>' },
  { type: 'token', value: '≥' },
  { type: 'token', value: '=' },
  { type: 'token', value: '≠' },
  { type: 'token', value: '∈' },
  { type: 'token', value: '∉' },
];

const TEMPLATES: Insertable[] = [
  { type: 'template', value: '∀x ( ___ )', placeholder: '___' },
  { type: 'template', value: '∃x ( ___ )', placeholder: '___' },
  { type: 'template', value: '∀x∈ℝ ( ___ )', placeholder: '___' },
  { type: 'template', value: '∃y∈ℤ ( ___ )', placeholder: '___' },
  { type: 'template', value: '( ___ ) ∧ ( ___ )', placeholder: '___' },
  { type: 'template', value: '( ___ ) ∨ ( ___ )', placeholder: '___' },
  { type: 'template', value: '( ___ ) → ( ___ )', placeholder: '___' },
  { type: 'template', value: '( ___ ) ↔ ( ___ )', placeholder: '___' },
  { type: 'template', value: '¬( ___ )', placeholder: '___' },
  { type: 'template', value: 'P(x)', placeholder: '' },
  { type: 'template', value: 'Q(x,y)', placeholder: '' },
];

const PREDICATES = [
  { type: 'token' as const, value: 'P(x)' },
  { type: 'token' as const, value: 'Q(x)' },
  { type: 'token' as const, value: 'R(x)' },
  { type: 'token' as const, value: 'L(x,y)' },
];

interface SymbolBankProps {
  onInsert: (text: string, selectPlaceholder?: string) => void;
  /** Hide token/template sections when used in English→Logic Composer context */
  compact?: boolean;
  /** Editable lists for vars/predicates: not implemented as editable UI, we use defaults */
}

function getDomainTitle(domain: string): string {
  const titles: Record<string, string> = {
    'ℝ': 'Real numbers',
    'ℤ': 'Integers',
    'ℚ': 'Rational numbers',
    'ℕ': 'Natural numbers',
    'ℂ': 'Complex numbers',
  };
  return titles[domain] || domain;
}

function getRelationTitle(rel: string): string {
  const titles: Record<string, string> = {
    '<': 'Less than',
    '≤': 'Less than or equal',
    '>': 'Greater than',
    '≥': 'Greater than or equal',
    '=': 'Equals',
    '≠': 'Not equal',
    '∈': 'Element of',
    '∉': 'Not element of',
  };
  return titles[rel] || rel;
}

export function SymbolBank({ onInsert, compact }: SymbolBankProps) {
  const [showPredicates, setShowPredicates] = useState(false);

  const handleClick = (item: Insertable) => {
    if (item.type === 'token') {
      onInsert(item.value);
    } else {
      onInsert(item.value, item.placeholder);
    }
  };

  return (
    <div className="symbol-bank">
      <div className="sb-section">
        <div className="sb-label">Quantifiers</div>
        <div className="sb-tokens">
          {TOKENS.filter((t) => t.type === 'token' && (t.value === '∀' || t.value === '∃')).map((t) => (
            <button key={t.value} type="button" className="sb-btn" onClick={() => handleClick(t)} title={t.value === '∀' ? 'For all' : 'There exists'}>
              {t.value}
            </button>
          ))}
        </div>
      </div>
      <div className="sb-section">
        <div className="sb-label">Connectives</div>
        <div className="sb-tokens">
          {TOKENS.filter((t) => ['¬', '∧', '∨', '→', '↔'].includes(t.value)).map((t) => (
            <button key={t.value} type="button" className="sb-btn" onClick={() => handleClick(t)}>
              {t.value}
            </button>
          ))}
        </div>
      </div>
      <div className="sb-section">
        <div className="sb-label">Parentheses</div>
        <div className="sb-tokens">
          <button type="button" className="sb-btn" onClick={() => onInsert('(')}>(</button>
          <button type="button" className="sb-btn" onClick={() => onInsert(')')}>)</button>
        </div>
      </div>
      <div className="sb-section">
        <div className="sb-label">Domains</div>
        <div className="sb-tokens">
          {DOMAINS.map((t) => (
            <button key={t.value} type="button" className="sb-btn" onClick={() => handleClick(t)} title={getDomainTitle(t.value)}>
              {t.value}
            </button>
          ))}
        </div>
      </div>
      <div className="sb-section">
        <div className="sb-label">Relations</div>
        <div className="sb-tokens">
          {RELATIONS.map((t) => (
            <button key={t.value} type="button" className="sb-btn" onClick={() => handleClick(t)} title={getRelationTitle(t.value)}>
              {t.value}
            </button>
          ))}
        </div>
      </div>
      <div className="sb-section">
        <div className="sb-label">Variables</div>
        <div className="sb-tokens">
          {TOKENS.filter((t) => t.type === 'token' && ['x', 'y', 'z'].includes(t.value)).map((t) => (
            <button key={t.value} type="button" className="sb-btn sb-var" onClick={() => handleClick(t)}>
              {t.value}
            </button>
          ))}
        </div>
      </div>
      <div className="sb-section">
        <div className="sb-label">
          Predicates
          <button type="button" className="sb-toggle" onClick={() => setShowPredicates(!showPredicates)} aria-expanded={showPredicates}>
            {showPredicates ? '−' : '+'}
          </button>
        </div>
        <div className="sb-tokens">
          {PREDICATES.map((t) => (
            <button key={t.value} type="button" className="sb-btn sb-pred" onClick={() => onInsert(t.value)}>
              {t.value}
            </button>
          ))}
        </div>
      </div>
      {!compact && (
        <div className="sb-section sb-templates">
          <div className="sb-label">Templates</div>
          <div className="sb-token-list">
            {TEMPLATES.map((t) => (
              <button key={t.value} type="button" className="sb-tpl" onClick={() => handleClick(t)} title="Click to insert at cursor">
                <code>{t.value}</code>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
