import { useRef, useCallback, useEffect } from 'react';
import { normalizeToUnicode, formatSpacing } from '../utils/normalize';
import { parse } from '../parser/Parser';
import { exprToString } from '../parser/exprToString';
import { PRESETS } from '../data/presets';
import { SymbolBank } from './SymbolBank';
import './LogicEditor.css';

interface LogicEditorProps {
  value: string;
  onChange: (v: string) => void;
  onCursorChange?: (pos: number) => void;
  parseError?: { 
    line: number; 
    column: number; 
    message: string;
    expected?: string[];
    got?: string;
    charIndex?: number;
  } | null;
  /** When true, show Symbol Bank below editor */
  showSymbolBank?: boolean;
}

export function LogicEditor({
  value,
  onChange,
  onCursorChange,
  parseError,
  showSymbolBank = true,
}: LogicEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to error position when error changes
  useEffect(() => {
    if (parseError?.charIndex !== undefined && textareaRef.current) {
      const ta = textareaRef.current;
      // Try to scroll to the error position
      ta.focus();
      // Set selection to highlight the error position
      const errorLength = parseError.got?.length || 1;
      ta.setSelectionRange(parseError.charIndex, parseError.charIndex + errorLength);
    }
  }, [parseError]);

  const insertAtCursor = useCallback(
    (text: string, _selectPlaceholder?: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = value.slice(0, start);
      const after = value.slice(end);
      const newVal = before + text + after;
      const newPos = start + text.length;
      onChange(newVal);
      onCursorChange?.(newPos);
      ta.focus();
      requestAnimationFrame(() => {
        ta.setSelectionRange(newPos, newPos);
      });
    },
    [value, onChange, onCursorChange]
  );

  const normalize = useCallback(() => {
    onChange(normalizeToUnicode(value));
  }, [value, onChange]);

  const format = useCallback(() => {
    if (!parseError) {
      try {
        const { ast } = parse(value);
        onChange(exprToString(ast));
        return;
      } catch {
        /* fall through to text-based format */
      }
    }
    onChange(formatSpacing(value));
  }, [value, onChange, parseError]);

  const loadPreset = useCallback(
    (formula: string) => {
      onChange(formula);
    },
    [onChange]
  );

  return (
    <div className="logic-editor">
      <div className="le-toolbar">
        <select
          className="le-presets"
          value=""
          onChange={(e) => {
            const id = e.target.value;
            if (!id) return;
            const p = PRESETS.find((x) => x.id === id);
            if (p) loadPreset(p.formula);
            e.target.value = '';
          }}
          aria-label="Load example formula"
        >
          <option value="">Example presets…</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="le-actions">
          <button type="button" onClick={normalize} title="-> →, <-> ↔, <= ≤, >= ≥, != ≠">
            Normalize
          </button>
          <button type="button" onClick={format} title="Consistent spacing and parentheses; no semantic changes">
            Format
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        className={`le-input ${parseError ? 'le-input-error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={() => {
          const ta = textareaRef.current;
          if (ta) onCursorChange?.(ta.selectionStart);
        }}
        onKeyUp={() => {
          const ta = textareaRef.current;
          if (ta) onCursorChange?.(ta.selectionStart);
        }}
        placeholder="Enter a formal logic expression, e.g. ∀x ( P(x) → Q(x) )"
        spellCheck={false}
        aria-label="Logic formula input"
      />
      {parseError && (
        <div className="le-error error-msg" role="alert">
          <div className="le-error-location">
            <strong>Position:</strong> Line {parseError.line}, column {parseError.column}
            {parseError.charIndex !== undefined && (
              <span className="le-error-char"> (character {parseError.charIndex + 1})</span>
            )}
          </div>
          {parseError.charIndex !== undefined && (
            <div className="le-error-snippet">
              <code className="le-error-code">
                {renderErrorSnippet(value, parseError.charIndex, parseError.got?.length || 1)}
              </code>
            </div>
          )}
          <div className="le-error-message">
            <strong>Error:</strong> {parseError.message}
          </div>
          {parseError.expected && parseError.expected.length > 0 && (
            <div className="le-error-expected">
              <strong>Expected:</strong> {formatTokenList(parseError.expected)}
            </div>
          )}
          {parseError.got && (
            <div className="le-error-got">
              <strong>Got:</strong> <code>{parseError.got}</code>
            </div>
          )}
        </div>
      )}
      {showSymbolBank && (
        <div className="symbol-bank-wrap">
          <div className="panel-header">Symbol Bank</div>
          <div className="panel-body">
            <SymbolBank onInsert={insertAtCursor} />
          </div>
        </div>
      )}
    </div>
  );
}

function formatTokenList(tokens: string[]): string {
  if (tokens.length === 0) return 'nothing';
  
  // Map token types to user-friendly names
  const tokenNames = tokens.map((t) => {
    const friendly: Record<string, string> = {
      'forall': '∀ or "forall"',
      'exists': '∃ or "exists"',
      'not': '¬ or "!"',
      'and': '∧ or "&"',
      'or': '∨ or "|"',
      'impl': '→ or "->"',
      'iff': '↔ or "<->"',
      'lparen': '(',
      'rparen': ')',
      'comma': ',',
      'var': 'variable',
      'ident': 'identifier',
      'domain': 'domain symbol (ℝ, ℤ, ℚ, ℕ, ℂ)',
      'member': '∈',
      'notmember': '∉',
      'lt': '<',
      'le': '≤ or "<="',
      'gt': '>',
      'ge': '≥ or ">="',
      'eq': '=',
      'ne': '≠ or "!="',
      'num': 'number',
      'eof': 'end of input',
    };
    return friendly[t] || t;
  });
  
  if (tokenNames.length === 1) return tokenNames[0]!;
  if (tokenNames.length === 2) return `${tokenNames[0]} or ${tokenNames[1]}`;
  return `${tokenNames.slice(0, -1).join(', ')}, or ${tokenNames[tokenNames.length - 1]}`;
}

function renderErrorSnippet(text: string, errorIndex: number, errorLength: number) {
  const beforeError = text.substring(Math.max(0, errorIndex - 20), errorIndex);
  const errorText = text.substring(errorIndex, Math.min(text.length, errorIndex + errorLength));
  const afterError = text.substring(errorIndex + errorLength, Math.min(text.length, errorIndex + errorLength + 20));
  const hasMoreBefore = errorIndex > 20;
  const hasMoreAfter = errorIndex + errorLength + 20 < text.length;
  
  return (
    <>
      {hasMoreBefore && '…'}
      <span className="le-error-before">{beforeError}</span>
      <span className="le-error-highlight">{errorText || '?'}</span>
      <span className="le-error-after">{afterError}</span>
      {hasMoreAfter && '…'}
    </>
  );
}
