import { useState } from 'react';
import type { Expr } from '../parser/Ast';
import { exprToString } from '../parser/exprToString';
import './Composer.css';

export type Builder =
  | { type: 'quantifier'; q: 'forall' | 'exists'; var: string; body: Builder }
  | { type: 'compound'; op: 'and' | 'or' | 'impl' | 'iff'; left: Builder; right: Builder }
  | { type: 'negation'; body: Builder }
  | { type: 'predicate'; name: string; args: string[] }
  | { type: 'empty' };

const VARS = ['x', 'y', 'z'];
const PREDS = ['P', 'Q', 'R', 'L'];
const OPS: { op: 'and' | 'or' | 'impl' | 'iff'; label: string }[] = [
  { op: 'and', label: '∧ and' },
  { op: 'or', label: '∨ or' },
  { op: 'impl', label: '→ if-then' },
  { op: 'iff', label: '↔ iff' },
];

function builderToExpr(b: Builder): Expr | null {
  if (b.type === 'empty') return null;
  if (b.type === 'predicate') return { kind: 'predicate', name: b.name, args: b.args };
  if (b.type === 'negation') {
    const body = builderToExpr(b.body);
    return body ? { kind: 'negation', body } : null;
  }
  if (b.type === 'quantifier') {
    const body = builderToExpr(b.body);
    return body ? { kind: 'quantifier', q: b.q, var: b.var, body } : null;
  }
  if (b.type === 'compound') {
    const left = builderToExpr(b.left);
    const right = builderToExpr(b.right);
    return left && right ? { kind: 'binary', op: b.op, left, right } : null;
  }
  return null;
}

const empty: Builder = { type: 'empty' };

interface ComposerProps {
  onExport: (logic: string) => void;
}

export function Composer({ onExport }: ComposerProps) {
  const [root, setRoot] = useState<Builder>(empty);

  const update = (up: Builder) => setRoot(up);
  const expr = builderToExpr(root);
  const logic = expr ? exprToString(expr) : '';

  const handleExport = () => {
    if (expr && logic) {
      try {
        onExport(logic);
      } catch (error) {
        console.error('Error exporting from Composer:', error);
      }
    }
  };

  return (
    <div className="composer">
      <div className="composer-header">
        <span className="composer-title">Guided builder</span>
        <button
          type="button"
          disabled={!expr || !logic}
          onClick={handleExport}
          title={!expr ? "Complete the expression to export" : "Insert into logic output"}
        >
          Export to logic
        </button>
      </div>
      <BuilderForm value={root} onChange={update} depth={0} />
      {logic && (
        <div className="composer-output">
          <div className="panel-header">Output</div>
          <pre className="composer-logic">{logic}</pre>
        </div>
      )}
      {!expr && root.type !== 'empty' && (
        <div className="composer-hint" style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>
          Complete all parts of the expression to enable export.
        </div>
      )}
    </div>
  );
}

interface BuilderFormProps {
  value: Builder;
  onChange: (b: Builder) => void;
  depth: number;
}

function BuilderForm({ value, onChange, depth }: BuilderFormProps) {
  if (value.type === 'empty') {
    return (
      <div className="builder-form empty" style={{ paddingLeft: depth * 12 }}>
        <span className="bf-label">Statement type</span>
        <div className="bf-actions">
          <button type="button" onClick={() => onChange({ type: 'quantifier', q: 'forall', var: 'x', body: empty })}>
            Quantified (∀)
          </button>
          <button type="button" onClick={() => onChange({ type: 'quantifier', q: 'exists', var: 'x', body: empty })}>
            Quantified (∃)
          </button>
          <button type="button" onClick={() => onChange({ type: 'compound', op: 'and', left: empty, right: empty })}>
            Compound
          </button>
          <button type="button" onClick={() => onChange({ type: 'negation', body: empty })}>
            Negation
          </button>
          <button type="button" onClick={() => onChange({ type: 'predicate', name: 'P', args: ['x'] })}>
            Predicate
          </button>
        </div>
      </div>
    );
  }

  if (value.type === 'quantifier') {
    return (
      <div className="builder-form quant" style={{ paddingLeft: depth * 12 }}>
        <div className="bf-row">
          <span className="bf-label">Quantifier</span>
          <select
            value={value.q}
            onChange={(e) => onChange({ ...value, q: e.target.value as 'forall' | 'exists' })}
            aria-label="Quantifier"
          >
            <option value="forall">∀ for all</option>
            <option value="exists">∃ there exists</option>
          </select>
          <span className="bf-label">Variable</span>
          <select
            value={value.var}
            onChange={(e) => onChange({ ...value, var: e.target.value })}
            aria-label="Variable"
          >
            {VARS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <button type="button" className="bf-remove" onClick={() => onChange(empty)} title="Remove">
            ✕
          </button>
        </div>
        <div className="bf-nested">
          <span className="bf-sublabel">Body</span>
          <BuilderForm value={value.body} onChange={(b) => onChange({ ...value, body: b })} depth={depth + 1} />
        </div>
      </div>
    );
  }

  if (value.type === 'compound') {
    return (
      <div className="builder-form compound" style={{ paddingLeft: depth * 12 }}>
        <div className="bf-row">
          <span className="bf-label">Connective</span>
          <select
            value={value.op}
            onChange={(e) => onChange({ ...value, op: e.target.value as 'and' | 'or' | 'impl' | 'iff' })}
            aria-label="Connective"
          >
            {OPS.map((o) => (
              <option key={o.op} value={o.op}>{o.label}</option>
            ))}
          </select>
          <button type="button" className="bf-remove" onClick={() => onChange(empty)}>✕</button>
        </div>
        <div className="bf-sides">
          <div className="bf-side">
            <span className="bf-sublabel">Left</span>
            <BuilderForm value={value.left} onChange={(b) => onChange({ ...value, left: b })} depth={depth + 1} />
          </div>
          <div className="bf-side">
            <span className="bf-sublabel">Right</span>
            <BuilderForm value={value.right} onChange={(b) => onChange({ ...value, right: b })} depth={depth + 1} />
          </div>
        </div>
      </div>
    );
  }

  if (value.type === 'negation') {
    return (
      <div className="builder-form neg" style={{ paddingLeft: depth * 12 }}>
        <div className="bf-row">
          <span className="bf-label">¬ Negation</span>
          <button type="button" className="bf-remove" onClick={() => onChange(empty)}>✕</button>
        </div>
        <div className="bf-nested">
          <span className="bf-sublabel">Body</span>
          <BuilderForm value={value.body} onChange={(b) => onChange({ ...value, body: b })} depth={depth + 1} />
        </div>
      </div>
    );
  }

  if (value.type === 'predicate') {
    return (
      <div className="builder-form pred" style={{ paddingLeft: depth * 12 }}>
        <div className="bf-row">
          <span className="bf-label">Predicate</span>
          <select
            value={value.name}
            onChange={(e) => {
              const n = e.target.value;
              const args = n === 'L' ? ['x', 'y'] : ['x'];
              onChange({ type: 'predicate', name: n, args });
            }}
            aria-label="Predicate name"
          >
            {PREDS.map((p) => (
              <option key={p} value={p}>{p}{p === 'L' ? '(·,·)' : '(·)'}</option>
            ))}
          </select>
          {value.args.map((a, i) => (
            <span key={i} className="bf-arg">
              <span className="bf-sublabel">arg{i + 1}</span>
              <select
                value={a}
                onChange={(e) => {
                  const next = [...value.args];
                  next[i] = e.target.value;
                  onChange({ ...value, args: next });
                }}
              >
                {VARS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </span>
          ))}
          <button type="button" className="bf-remove" onClick={() => onChange(empty)}>✕</button>
        </div>
      </div>
    );
  }

  return null;
}
