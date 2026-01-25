# Logic ↔ English Translator

A single-page web app for translating between formal first-order logic and English, built with React + TypeScript + Vite.

## Features

### Logic → English
- Parse formal logic expressions into an AST
- Render English translations with clear scope
- Display AST structure as an indented tree
- Support for Unicode and ASCII operators
- Parse error reporting with line/column

### English → Logic
- **Guided Composer**: Build logic expressions step-by-step
- **Simple English Phrases**: Parse controlled English phrases to logic
- Symbol Bank with clickable tokens and templates

### Symbol Bank
- Quantifiers: ∀, ∃
- Connectives: ¬, ∧, ∨, →, ↔
- Variables: x, y, z
- Predicates: P(·), Q(·), R(·), L(·,·)
- Templates: Pre-structured snippets with placeholders

## Getting Started

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## Grammar

The parser supports the following grammar:

```
Expr := Iff
Iff := Imp ( "↔" Imp )*
Imp := Or ( "→" Or )*
Or  := And ( "∨" And )*
And := Not ( "∧" Not )*
Not := "¬" Not | Atom
Atom := Quant | Pred | "(" Expr ")"
Quant := ("∀" | "∃") Var AtomOrParen
Pred := Name "(" Args ")"
Args := Var ("," Var)*
```

### Operator Precedence (lowest to highest)
1. ↔ (iff)
2. → (implication)
3. ∨ (or)
4. ∧ (and)
5. ¬ (negation)

### ASCII Fallbacks
- `forall` → ∀
- `exists` → ∃
- `!` or `~` → ¬
- `&` → ∧
- `|` → ∨
- `->` → →
- `<->` → ↔

## English Phrases

The English → Logic converter supports these controlled phrases:
- "for all x, ..." → ∀x(...)
- "there exists x such that ..." → ∃x(...)
- "not ..." → ¬(...)
- "A and B" → (A) ∧ (B)
- "A or B" → (A) ∨ (B)
- "if A then B" → (A) → (B)
- "A iff B" → (A) ↔ (B)

## Testing

```bash
npm test
```

Runs unit tests for the tokenizer and parser (15+ test cases).

## Build

```bash
npm run build
```

Outputs to `dist/` directory.

## Project Structure

```
src/
├── parser/          # Tokenizer, Parser, AST types
├── renderer/        # AST to English
├── english/         # English phrase parsing
├── components/      # React components
├── utils/           # Utilities (normalize, format)
└── data/            # Presets and static data
```
