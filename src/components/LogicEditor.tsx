import { useRef, useCallback } from 'react';
import { normalizeToUnicode, formatSpacing } from '../utils/normalize';
import { PRESETS } from '../data/presets';
import { SymbolBank } from './SymbolBank';
import './LogicEditor.css';

interface LogicEditorProps {
  value: string;
  onChange: (v: string) => void;
  onCursorChange?: (pos: number) => void;
  parseError?: { line: number; column: number; message: string } | null;
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
    onChange(formatSpacing(value));
  }, [value, onChange]);

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
          <button type="button" onClick={normalize} title="Convert ASCII operators to Unicode">
            Normalize
          </button>
          <button type="button" onClick={format} title="Pretty parentheses spacing">
            Format
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        className="le-input"
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
          Line {parseError.line}, column {parseError.column}: {parseError.message}
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
