import { useMemo, useState } from 'react';
import type { Binary, Expr, QuantifierKind, Relation, Term } from '../parser/Ast';
import { exprToString } from '../parser/exprToString';
import { toEnglish } from '../renderer/english';
import { astToTree } from '../parser/astDisplay';
import { validateAst } from '../parser/validateAst';
import './Composer.css';

type DomainSymbol = 'none' | 'ℤ' | 'ℝ' | 'ℕ' | 'ℚ' | 'ℂ';

type BuilderPath = (['body'] | ['left'] | ['right'])[];

type BuilderTerm =
  | { kind: 'var'; name: string | null }
  | { kind: 'const'; value: string };

type BuilderNode =
  | {
      kind: 'quantifier';
      q: QuantifierKind;
      varName: string;
      domain: DomainSymbol;
      body: BuilderNode | null;
    }
  | {
      kind: 'relation';
      left: BuilderTerm;
      op: Relation['op'];
      right: BuilderTerm;
    }
  | {
      kind: 'predicate';
      name: string;
      args: BuilderTerm[];
    }
  | {
      kind: 'binary';
      op: Binary['op'];
      left: BuilderNode | null;
      right: BuilderNode | null;
    }
  | {
      kind: 'not';
      body: BuilderNode | null;
    };

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface ComposerProps {
  onExport: (logic: string) => void;
}

export function Composer({ onExport }: ComposerProps) {
  const [root, setRoot] = useState<BuilderNode | null>(null);

  const reset = () => setRoot(null);

  const ast: Expr | null = useMemo(() => {
    if (!root) return null;
    try {
      return builderToAst(root);
    } catch {
      return null;
    }
  }, [root]);

  const validation = useMemo(
    () => (ast ? validateAst(ast) : { ok: false, errors: [], inScopeVars: new Set<string>() }),
    [ast]
  );

  const logic = ast ? exprToString(ast) : '';
  const english = ast ? toEnglish(ast) : '';
  const structure = ast ? astToTree(ast) : '';

  const canExport = !!ast && validation.ok;

  const handleExportLogic = () => {
    if (!canExport || !logic) return;
    try {
      onExport(logic);
    } catch (error) {
      console.error('Error exporting from Composer:', error);
    }
  };

  const inScopeVarsList = Array.from(validation.inScopeVars).sort();

  return (
    <div className="composer">
      <div className="composer-header">
        <span className="composer-title">Guided Builder (structure first)</span>
        <div className="composer-header-actions">
          <button type="button" onClick={reset}>
            Reset builder
          </button>
          <button type="button" disabled={!canExport} onClick={handleExportLogic}>
            Export to logic
          </button>
        </div>
      </div>

      <div className="composer-scope-summary">
        <div className="composer-scope-row">
          <span className="bf-label">Variables in scope</span>
          <span className="composer-scope-vars">
            {inScopeVarsList.length > 0 ? inScopeVarsList.join(', ') : '— (add a quantifier)'}
          </span>
        </div>
        {!validation.ok && validation.errors.length > 0 && (
          <ul className="composer-errors">
            {validation.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="composer-builder">
        {root ? (
          <BuilderNodeForm
            node={root}
            path={[]}
            onChange={setRoot}
            inScopeVars={[]}
          />
        ) : (
          <QuantifierInitializer onInit={setRoot} />
        )}
      </div>

      {ast && (
        <div className="composer-output-grid">
          <div className="composer-output">
            <div className="panel-header">
              Logic Output
              <button
                type="button"
                className="composer-copy-btn"
                onClick={() => navigator.clipboard.writeText(logic).catch(() => {})}
                disabled={!logic}
              >
                Copy logic
              </button>
            </div>
            <pre className="composer-logic pre-wrap">{logic}</pre>
          </div>

          <div className="composer-output">
            <div className="panel-header">
              English Output
              <button
                type="button"
                className="composer-copy-btn"
                onClick={() => navigator.clipboard.writeText(english).catch(() => {})}
                disabled={!english}
              >
                Copy English
              </button>
            </div>
            <p className="composer-english">{english}</p>
          </div>

          <div className="composer-output">
            <div className="panel-header">Scope Visualizer</div>
            <pre className="composer-tree pre-wrap">{structure}</pre>
          </div>
        </div>
      )}

      {!ast && root && (
        <div className="composer-hint">
          Complete all parts of the expression with valid identifiers to enable export.
        </div>
      )}
    </div>
  );
}

function QuantifierInitializer({ onInit }: { onInit: (root: BuilderNode) => void }) {
  const [q, setQ] = useState<QuantifierKind>('forall');
  const [varName, setVarName] = useState('x');
  const [domain, setDomain] = useState<DomainSymbol>('ℝ');

  const varError = varName.trim().length === 0 || !IDENT_RE.test(varName.trim());

  const create = () => {
    if (varError) return;
    onInit({
      kind: 'quantifier',
      q,
      varName: varName.trim(),
      domain,
      body: null,
    });
  };

  return (
    <div className="builder-form quant-root">
      <div className="bf-row">
        <span className="bf-label">Step 1: Quantifier</span>
      </div>
      <div className="bf-row">
        <label className="bf-inline">
          <span className="bf-label">Quantifier</span>
          <select value={q} onChange={(e) => setQ(e.target.value as QuantifierKind)}>
            <option value="forall">∀ for all</option>
            <option value="exists">∃ there exists</option>
          </select>
        </label>
        <label className="bf-inline">
          <span className="bf-label">Variable name</span>
          <input
            value={varName}
            onChange={(e) => setVarName(e.target.value)}
            placeholder="x"
          />
        </label>
        <label className="bf-inline">
          <span className="bf-label">Domain</span>
          <select value={domain} onChange={(e) => setDomain(e.target.value as DomainSymbol)}>
            <option value="none">None</option>
            <option value="ℤ">ℤ (integers)</option>
            <option value="ℝ">ℝ (reals)</option>
            <option value="ℕ">ℕ (naturals)</option>
            <option value="ℚ">ℚ (rationals)</option>
            <option value="ℂ">ℂ (complex)</option>
          </select>
        </label>
        <button type="button" onClick={create} disabled={varError}>
          Set body
        </button>
      </div>
      {varError && <div className="bf-error">Variable must be a valid identifier (letters, digits, underscore; not starting with a digit).</div>}
    </div>
  );
}

interface BuilderNodeFormProps {
  node: BuilderNode;
  path: BuilderPath;
  onChange: (node: BuilderNode | null) => void;
  inScopeVars: string[];
}

function BuilderNodeForm({ node, path, onChange, inScopeVars }: BuilderNodeFormProps) {
  if (node.kind === 'quantifier') {
    const varError =
      node.varName.trim().length === 0 || !IDENT_RE.test(node.varName.trim());

    const nextScope = [...inScopeVars, node.varName.trim()].filter(Boolean);

    return (
      <div className="builder-form quant">
        <div className="bf-row">
          <span className="bf-label">Quantifier block</span>
          <select
            value={node.q}
            onChange={(e) =>
              onChange({ ...node, q: e.target.value as QuantifierKind })
            }
          >
            <option value="forall">∀ for all</option>
            <option value="exists">∃ there exists</option>
          </select>
          <label className="bf-inline">
            <span className="bf-label">Variable</span>
            <input
              value={node.varName}
              onChange={(e) => onChange({ ...node, varName: e.target.value })}
              placeholder="x"
            />
          </label>
          <label className="bf-inline">
            <span className="bf-label">Domain</span>
            <select
              value={node.domain}
              onChange={(e) =>
                onChange({
                  ...node,
                  domain: e.target.value as DomainSymbol,
                })
              }
            >
              <option value="none">None</option>
              <option value="ℤ">ℤ</option>
              <option value="ℝ">ℝ</option>
              <option value="ℕ">ℕ</option>
              <option value="ℚ">ℚ</option>
              <option value="ℂ">ℂ</option>
            </select>
          </label>
          <button type="button" className="bf-remove" onClick={() => onChange(null)}>
            ✕
          </button>
        </div>
        {varError && (
          <div className="bf-error">
            Variable must be a valid identifier (letters, digits, underscore; not starting with a digit).
          </div>
        )}
        <div className="bf-nested">
          <span className="bf-sublabel">Body (scope of {node.varName || 'variable'})</span>
          {node.body ? (
            <BuilderNodeForm
              node={node.body}
              path={[...path, ['body']]}
              onChange={(child) =>
                onChange({ ...node, body: child || null })
              }
              inScopeVars={nextScope}
            />
          ) : (
            <BodyChooser
              onChoose={(kind) =>
                onChange({
                  ...node,
                  body: initialBody(kind, nextScope),
                })
              }
              inScopeVars={nextScope}
            />
          )}
        </div>
      </div>
    );
  }

  if (node.kind === 'binary') {
    return (
      <div className="builder-form compound">
        <div className="bf-row">
          <span className="bf-label">Compound</span>
          <select
            value={node.op}
            onChange={(e) =>
              onChange({ ...node, op: e.target.value as Binary['op'] })
            }
          >
            <option value="and">∧ AND</option>
            <option value="or">∨ OR</option>
            <option value="impl">→ IMPLIES</option>
            <option value="iff">↔ IFF</option>
          </select>
          <button type="button" className="bf-remove" onClick={() => onChange(null)}>
            ✕
          </button>
        </div>
        <div className="bf-sides">
          <div className="bf-side">
            <span className="bf-sublabel">Left</span>
            {node.left ? (
              <BuilderNodeForm
                node={node.left}
                path={[...path, ['left']]}
                onChange={(child) =>
                  onChange({ ...node, left: child || null })
                }
                inScopeVars={inScopeVars}
              />
            ) : (
              <BodyChooser
                onChoose={(kind) =>
                  onChange({
                    ...node,
                    left: initialBody(kind, inScopeVars),
                  })
                }
                inScopeVars={inScopeVars}
              />
            )}
          </div>
          <div className="bf-side">
            <span className="bf-sublabel">Right</span>
            {node.right ? (
              <BuilderNodeForm
                node={node.right}
                path={[...path, ['right']]}
                onChange={(child) =>
                  onChange({ ...node, right: child || null })
                }
                inScopeVars={inScopeVars}
              />
            ) : (
              <BodyChooser
                onChoose={(kind) =>
                  onChange({
                    ...node,
                    right: initialBody(kind, inScopeVars),
                  })
                }
                inScopeVars={inScopeVars}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (node.kind === 'not') {
    return (
      <div className="builder-form neg">
        <div className="bf-row">
          <span className="bf-label">¬ Negation</span>
          <button type="button" className="bf-remove" onClick={() => onChange(null)}>
            ✕
          </button>
        </div>
        <div className="bf-nested">
          <span className="bf-sublabel">Body</span>
          {node.body ? (
            <BuilderNodeForm
              node={node.body}
              path={[...path, ['body']]}
              onChange={(child) =>
                onChange({ ...node, body: child || null })
              }
              inScopeVars={inScopeVars}
            />
          ) : (
            <BodyChooser
              onChoose={(kind) =>
                onChange({
                  ...node,
                  body: initialBody(kind, inScopeVars),
                })
              }
              inScopeVars={inScopeVars}
            />
          )}
        </div>
      </div>
    );
  }

  if (node.kind === 'relation') {
    return (
      <div className="builder-form relation">
        <div className="bf-row">
          <span className="bf-label">Relation</span>
          <TermEditor
            label="Left term"
            term={node.left}
            inScopeVars={inScopeVars}
            onChange={(t) => onChange({ ...node, left: t })}
          />
          <select
            value={node.op}
            onChange={(e) =>
              onChange({
                ...node,
                op: e.target.value as Relation['op'],
              })
            }
          >
            <option value="<">&lt;</option>
            <option value="≤">≤</option>
            <option value=">">&gt;</option>
            <option value="≥">≥</option>
            <option value="=">=</option>
            <option value="≠">≠</option>
            <option value="∈">∈</option>
            <option value="∉">∉</option>
          </select>
          <TermEditor
            label="Right term"
            term={node.right}
            inScopeVars={inScopeVars}
            onChange={(t) => onChange({ ...node, right: t })}
          />
          <button type="button" className="bf-remove" onClick={() => onChange(null)}>
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (node.kind === 'predicate') {
    const nameError =
      node.name.trim().length === 0 || !IDENT_RE.test(node.name.trim());

    return (
      <div className="builder-form pred">
        <div className="bf-row">
          <span className="bf-label">Predicate</span>
          <label className="bf-inline">
            <span className="bf-label">Name</span>
            <input
              value={node.name}
              onChange={(e) =>
                onChange({ ...node, name: e.target.value })
              }
              placeholder="P"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...node,
                args: [...node.args, initialTerm(inScopeVars)],
              })
            }
          >
            + Arg
          </button>
          <button type="button" className="bf-remove" onClick={() => onChange(null)}>
            ✕
          </button>
        </div>
        {nameError && (
          <div className="bf-error">
            Predicate name must be a valid identifier (letters, digits, underscore; not starting with a digit).
          </div>
        )}
        <div className="bf-args">
          {node.args.map((arg, i) => (
            <div key={i} className="bf-arg">
              <span className="bf-sublabel">arg{i + 1}</span>
              <TermEditor
                term={arg}
                inScopeVars={inScopeVars}
                onChange={(t) => {
                  const next = [...node.args];
                  next[i] = t;
                  onChange({ ...node, args: next });
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const next = [...node.args];
                  next.splice(i, 1);
                  onChange({ ...node, args: next });
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

type BodyKind = 'relation' | 'predicate' | 'binary' | 'not' | 'quantifier';

function BodyChooser({
  onChoose,
  inScopeVars,
}: {
  onChoose: (kind: BodyKind) => void;
  inScopeVars: string[];
}) {
  return (
    <div className="bf-body-chooser">
      <span className="bf-label">Step 2: Choose body</span>
      <div className="bf-actions">
        <button type="button" onClick={() => onChoose('relation')}>
          Relation (x &lt; y)
        </button>
        <button type="button" onClick={() => onChoose('predicate')}>
          Predicate P(x, y)
        </button>
        <button type="button" onClick={() => onChoose('binary')}>
          Compound (AND / OR / → / ↔)
        </button>
        <button type="button" onClick={() => onChoose('not')}>
          Negation (¬)
        </button>
        <button type="button" onClick={() => onChoose('quantifier')}>
          Nested quantifier
        </button>
      </div>
      {inScopeVars.length === 0 && (
        <div className="bf-hint">
          No variables in scope yet for body terms. Add quantifiers first.
        </div>
      )}
    </div>
  );
}

function initialBody(kind: BodyKind, inScopeVars: string[]): BuilderNode {
  switch (kind) {
    case 'relation':
      return {
        kind: 'relation',
        left: initialTerm(inScopeVars),
        op: '<',
        right: initialTerm(inScopeVars),
      };
    case 'predicate':
      return {
        kind: 'predicate',
        name: 'P',
        args: [initialTerm(inScopeVars)],
      };
    case 'binary':
      return {
        kind: 'binary',
        op: 'and',
        left: null,
        right: null,
      };
    case 'not':
      return {
        kind: 'not',
        body: null,
      };
    case 'quantifier':
      return {
        kind: 'quantifier',
        q: 'forall',
        varName: 'y',
        domain: 'none',
        body: null,
      };
  }
}

function initialTerm(inScopeVars: string[]): BuilderTerm {
  if (inScopeVars.length > 0) {
    return { kind: 'var', name: inScopeVars[inScopeVars.length - 1]! };
  }
  return { kind: 'const', value: '0' };
}

interface TermEditorProps {
  label?: string;
  term: BuilderTerm;
  inScopeVars: string[];
  onChange: (t: BuilderTerm) => void;
}

function TermEditor({ label, term, inScopeVars, onChange }: TermEditorProps) {
  const mode = term.kind === 'var' ? 'var' : 'const';
  const hasVars = inScopeVars.length > 0;

  const currentVar =
    term.kind === 'var'
      ? term.name && inScopeVars.includes(term.name)
        ? term.name
        : inScopeVars[0]
      : hasVars
      ? inScopeVars[0]
      : '';

  const constVal = term.kind === 'const' ? term.value : '';

  return (
    <div className="term-editor">
      {label && <span className="bf-sublabel">{label}</span>}
      <div className="term-row">
        <select
          value={mode}
          onChange={(e) => {
            const nextMode = e.target.value as 'var' | 'const';
            if (nextMode === 'var') {
              onChange({
                kind: 'var',
                name: hasVars ? currentVar || inScopeVars[0]! : null,
              });
            } else {
              onChange({ kind: 'const', value: constVal || '0' });
            }
          }}
        >
          <option value="var">Variable</option>
          <option value="const">Constant</option>
        </select>

        {mode === 'var' ? (
          <select
            value={currentVar || ''}
            onChange={(e) =>
              onChange({
                kind: 'var',
                name: e.target.value || null,
              })
            }
            disabled={!hasVars}
          >
            {hasVars ? (
              inScopeVars.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))
            ) : (
              <option value="">(no vars)</option>
            )}
          </select>
        ) : (
          <input
            value={constVal}
            onChange={(e) =>
              onChange({ kind: 'const', value: e.target.value })
            }
            placeholder="0, 1, a, b"
          />
        )}
      </div>
      {mode === 'var' && !hasVars && (
        <div className="bf-error">
          No variables are in scope here. Create a quantifier to introduce one.
        </div>
      )}
    </div>
  );
}

function builderToAst(node: BuilderNode): Expr {
  return buildExpr(node, new Set<string>());
}

function buildExpr(node: BuilderNode, scope: Set<string>): Expr {
  switch (node.kind) {
    case 'quantifier': {
      const varName = node.varName.trim();
      if (!IDENT_RE.test(varName)) {
        throw new Error('Invalid variable name');
      }
      const nextScope = new Set(scope);
      nextScope.add(varName);
      if (!node.body) {
        throw new Error('Quantifier body missing');
      }
      const body = buildExpr(node.body, nextScope);
      const domain =
        node.domain === 'none'
          ? undefined
          : { kind: 'domain' as const, name: node.domain };
      return {
        kind: 'quantifier',
        q: node.q,
        var: varName,
        domain,
        body,
      };
    }
    case 'relation': {
      const left = buildTerm(node.left, scope);
      const right = buildTerm(node.right, scope);
      return {
        kind: 'relation',
        op: node.op,
        left,
        right,
      };
    }
    case 'predicate': {
      const name = node.name.trim();
      if (!IDENT_RE.test(name)) {
        throw new Error('Invalid predicate name');
      }
      const args: Term[] = node.args.map((t) => buildTerm(t, scope));
      if (args.length === 0) {
        throw new Error('Predicate must have at least one argument');
      }
      return {
        kind: 'predicate',
        name,
        args,
      };
    }
    case 'binary': {
      if (!node.left || !node.right) {
        throw new Error('Both sides of compound must be filled');
      }
      const left = buildExpr(node.left, scope);
      const right = buildExpr(node.right, scope);
      return {
        kind: 'binary',
        op: node.op,
        left,
        right,
      };
    }
    case 'not': {
      if (!node.body) {
        throw new Error('Negation body missing');
      }
      const body = buildExpr(node.body, scope);
      return {
        kind: 'negation',
        body,
      };
    }
  }
}

function buildTerm(term: BuilderTerm, _scope: Set<string>): Term {
  if (term.kind === 'var') {
    if (!term.name) {
      throw new Error('Variable term missing name');
    }
    return { kind: 'var', name: term.name };
  }
  const raw = term.value.trim();
  if (raw === '') {
    throw new Error('Constant term cannot be empty');
  }
  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && raw === String(asNum)) {
    return { kind: 'num', value: asNum };
  }
  return { kind: 'const', name: raw };
}

