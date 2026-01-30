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
├── englishTemplates/# Semantic English→Logic (normalize, parseEnglishExpr, astFromEnglish)
├── components/      # React components
├── utils/           # Utilities (normalize, format)
└── data/            # Presets and static data
```

---

## Phil Notes (for grading)

**Purpose of this section:** Everything you might want to know before grading this project—architecture, scope, limitations, and how to run or verify behavior.

### What this project does

- **Two main flows:** (1) **Logic → English**: user enters a formula (e.g. `∀x ( P(x) → Q(x) )`), app parses it and shows English plus optional "traps," step-by-step explanation, and structure. (2) **English → Logic**: user enters controlled English (e.g. "for all real numbers x, there exists a real number y such that x < y"), app normalizes and parses it into an AST and displays the formal logic string.
- **Tabs:** "Logic → English" and "English → Logic" are separate; each has its own panel layout and behavior.

### Architecture (high level)

- **Logic side:** `parser/` (Tokenizer, Parser, Ast, exprToString, validateAst) handles input formula → AST → string. `renderer/english.ts` turns AST → English. Logic presets live in `data/presets.ts`.
- **English side:** `englishTemplates/normalize.ts` turns raw text into a token stream (relation phrases like "greater than or equal to" become `≥` before tokenization so "or" isn't misread as disjunction). `englishTemplates/parseEnglishExpr.ts` does priority-based clause parsing (quantifiers, relations, conditionals, predicates). `englishTemplates/astFromEnglish.ts` is the main entry `englishToAst()` and also has legacy template-based helpers used by tests. The older `english/phraseParser` + `phraseToLogic` exist but the primary path is `englishToAst` + `exprToString`.
- **UI:** `LogicToEnglish.tsx` and `EnglishToLogic.tsx` are the two tab contents. Output for Logic→English is split: left column = "Common Logic Traps," step-by-step explanation, structure; right column = English only.

### What's implemented and where to look

- **Logic parsing:** Full grammar in `parser/`; Unicode and ASCII operators; domain notation (e.g. `∀x∈ℝ`). Example presets in Logic panel dropdown.
- **English parsing:** Quantifier chains ("for all x, there exists y such that …"), relations ("x is greater than or equal to 5" → `x ≥ 5`), conditionals (if/then, only if, iff), sufficient/necessary, and predicates. Domain phrases ("real numbers," "integer," etc.) are matched with **longest phrase first** so "real number" wins over "real" and the variable isn't misidentified.
- **Predicate arguments:** All predicate nodes use proper `Term[]` args (e.g. `{ kind: 'var', name: 'x' }`), not raw strings, so `exprToString` and the renderer show e.g. `P(x)` instead of `P()`.
- **Logic Traps:** `components/LogicTraps.tsx` explains negated quantifiers, quantifier order, necessary/sufficient, and "only if" vs "if." Wording for nested quantifiers uses "for every x, for every y" (not "there is every").
- **Step-by-step explanation:** `components/StepByStepExplanation.tsx` walks the AST and explains quantifiers, relations, connectives, and predicates; predicate args are rendered with `termToString` so variables/terms show correctly.
- **Mathematical correctness:** Examples and presets use true statements or tautologies (e.g. "for every real number x, x ≥ x"); false claims like "all real numbers are positive or negative" were removed from examples.

### Known limitations and quirks

- **Guided Builder vs Simple English:** The "Guided Builder (structure first)" and "Simple English Phrases" box are separate. The builder does not currently wrap the phrase from the text box in a quantifier; they are independent. So "∀x∈ℝ" in the builder and "x is greater than or equal to 5" in the box produce logic from the phrase only (e.g. `x ≥ 5`), not `∀x∈ℝ ( x ≥ 5 )` unless that's added in a future iteration.
- **Relation phrases:** Relation phrases are normalized at **string level** in `normalizeComparisons()` before tokenization so "x is greater than or equal to 5" becomes "x ≥ 5" and parses as one relation. The tokenizer also recognizes Unicode symbols ≤, ≥, ≠, ∈, ∉ as operators so they aren't dropped.
- **Tests:** `npm test` runs Vitest. Some tests (e.g. `astFromEnglish.test.ts`, `parseEnglishExpr`) cover English→logic and nested quantifiers. The sandbox/environment may affect test runs (e.g. esbuild spawn); running tests locally is the intended way to verify.
- **Validation:** `validateAst` checks that variables in relations/predicates are bound by a quantifier; unbound variables produce a clear error so the user can add a quantifier or fix the formula.

### How to run and test

- **Dev:** `npm install` then `npm run dev`; app at `http://localhost:5173`.
- **Tests:** `npm test` (Vitest).
- **Build:** `npm run build` → `dist/`.

### Suggested grading checklist

- **Logic → English:** Enter a formula from the presets or Symbol Bank, confirm English and (if applicable) traps and step-by-step match the formula.
- **English → Logic:** Try examples from the Examples dropdown (e.g. "for all real numbers x, there exists a real number y such that x < y" → `∀x∈ℝ ( ∃y∈ℝ ( x < y ) )`, "x is greater than or equal to 5" → `x ≥ 5`). Confirm no empty predicate args like `P()`.
- **Edge cases:** Nested quantifiers, "only if" vs "if," necessary/sufficient phrasing, and relation phrases ("at least," "greater than or equal to") should parse and display correctly.

These checklist items are also encoded as automated tests in `src/englishTemplates/astFromEnglish.test.ts` (describe block "README grading checklist: English → Logic"). Run `npm test` to verify they pass.

If anything is ambiguous or you want more detail on a specific file or flow, the code is commented where non-obvious; the main entry points are `englishToAst` (English→logic) and `parse` + `toEnglish` (logic→English).
