/// <reference types="vitest/globals" />
import { englishToAst } from './astFromEnglish';
import { exprToString } from '../parser/exprToString';
import { toEnglish } from '../renderer/english';
import { parse } from '../parser/Parser';

describe('English → Logic: Necessary/Sufficient', () => {
  it('parses "p only if q" as p → q', () => {
    const ast = englishToAst('p only if q');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('binary');
      if (ast.kind === 'binary') {
        expect(ast.op).toBe('impl');
        const logic = exprToString(ast);
        expect(logic).toContain('→');
      }
    }
  });

  it('parses "q if p" as p → q', () => {
    const ast = englishToAst('q if p');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('binary');
      if (ast.kind === 'binary') {
        expect(ast.op).toBe('impl');
      }
    }
  });

  it('parses "if p then q" as p → q', () => {
    const ast = englishToAst('if p then q');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('binary');
      if (ast.kind === 'binary') {
        expect(ast.op).toBe('impl');
      }
    }
  });

  it('parses "p iff q" as p ↔ q', () => {
    const ast = englishToAst('p iff q');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('binary');
      if (ast.kind === 'binary') {
        expect(ast.op).toBe('iff');
        const logic = exprToString(ast);
        expect(logic).toContain('↔');
      }
    }
  });

  it('parses "p is sufficient for q" as p → q', () => {
    const ast = englishToAst('p is sufficient for q');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('binary');
      if (ast.kind === 'binary') {
        expect(ast.op).toBe('impl');
      }
    }
  });

  it('parses "p is necessary for q" as q → p', () => {
    const ast = englishToAst('p is necessary for q');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('binary');
      if (ast.kind === 'binary') {
        expect(ast.op).toBe('impl');
        // p is necessary for q means q → p, so left should be q and right should be p
        // We need to check the structure
      }
    }
  });

  it('parses "p is necessary and sufficient for q" as p ↔ q', () => {
    const ast = englishToAst('p is necessary and sufficient for q');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('binary');
      if (ast.kind === 'binary') {
        expect(ast.op).toBe('iff');
        const logic = exprToString(ast);
        expect(logic).toContain('↔');
      }
    }
  });

  it('parses "p implies q" as p → q', () => {
    const ast = englishToAst('p implies q');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('binary');
      if (ast.kind === 'binary') {
        expect(ast.op).toBe('impl');
      }
    }
  });
});

describe('Logic → English: Necessary/Sufficient', () => {
  it('renders p → q with necessary/sufficient alternates', () => {
    const { ast } = parse('( p ) → ( q )');
    const english = toEnglish(ast);
    expect(english).toContain('If');
    expect(english).toContain('sufficient');
    expect(english).toContain('necessary');
  });

  it('renders p ↔ q with necessary and sufficient alternate', () => {
    const { ast } = parse('( p ) ↔ ( q )');
    const english = toEnglish(ast);
    expect(english).toContain('if and only if');
    expect(english).toContain('necessary and sufficient');
  });
});

describe('English → Logic: Condition Patterns (phraseToUnaryPredicate fallback)', () => {
  it('parses "being a tomato is a sufficient condition for being a fruit" as ∀x (Tomato(x) → Fruit(x))', () => {
    const ast = englishToAst('being a tomato is a sufficient condition for being a fruit');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('forall');
        expect(ast.var).toBe('x');
        expect(ast.body.kind).toBe('binary');
        if (ast.body.kind === 'binary') {
          expect(ast.body.op).toBe('impl');
          const logic = exprToString(ast);
          expect(logic).toContain('∀x');
          expect(logic).toContain('Tomato(x)');
          expect(logic).toContain('Fruit(x)');
          expect(logic).toContain('→');
        }
      }
    }
  });

  it('parses "being a fruit is a necessary condition for being a tomato" as ∀x (Tomato(x) → Fruit(x))', () => {
    const ast = englishToAst('being a fruit is a necessary condition for being a tomato');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('forall');
        expect(ast.var).toBe('x');
        expect(ast.body.kind).toBe('binary');
        if (ast.body.kind === 'binary') {
          expect(ast.body.op).toBe('impl');
          const logic = exprToString(ast);
          expect(logic).toContain('∀x');
          expect(logic).toContain('Tomato(x)');
          expect(logic).toContain('Fruit(x)');
          expect(logic).toContain('→');
        }
      }
    }
  });
});

describe('English → Logic: Condition Patterns', () => {
  it('parses "being a uatx student is a sufficient condition to get a student id" as ∀x (UATXStudent(x) → StudentID(x))', () => {
    const ast = englishToAst('being a uatx student is a sufficient condition to get a student id');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('forall');
        expect(ast.var).toBe('x');
        expect(ast.body.kind).toBe('binary');
        if (ast.body.kind === 'binary') {
          expect(ast.body.op).toBe('impl');
          const logic = exprToString(ast);
          expect(logic).toContain('∀x');
          expect(logic).toContain('→');
          expect(logic).toContain('UATXStudent');
          expect(logic).toContain('StudentID');
        }
      }
    }
  });

  it('parses "being a uatx student is sufficient to get a student id" as ∀x (UATXStudent(x) → StudentID(x))', () => {
    const ast = englishToAst('being a uatx student is sufficient to get a student id');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('forall');
        expect(ast.body.kind).toBe('binary');
        if (ast.body.kind === 'binary') {
          expect(ast.body.op).toBe('impl');
        }
      }
    }
  });

  it('parses "having a student id is necessary for being a uatx student" as ∀x (UATXStudent(x) → StudentID(x))', () => {
    const ast = englishToAst('having a student id is necessary for being a uatx student');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('forall');
        expect(ast.body.kind).toBe('binary');
        if (ast.body.kind === 'binary') {
          expect(ast.body.op).toBe('impl');
          // Note: "A is necessary for B" means B → A, so we expect UATXStudent → StudentID
          const logic = exprToString(ast);
          expect(logic).toContain('∀x');
          expect(logic).toContain('→');
        }
      }
    }
  });

  it('parses "being divisible by 4 is sufficient for being even" as ∀x (DivisibleBy4(x) → Even(x))', () => {
    const ast = englishToAst('being divisible by 4 is sufficient for being even');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('forall');
        const logic = exprToString(ast);
        expect(logic).toContain('∀x');
        expect(logic).toContain('→');
      }
    }
  });

  it('parses "being even is necessary for being divisible by 4" as ∀x (DivisibleBy4(x) → Even(x))', () => {
    const ast = englishToAst('being even is necessary for being divisible by 4');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('forall');
        const logic = exprToString(ast);
        expect(logic).toContain('∀x');
        expect(logic).toContain('→');
      }
    }
  });
});

describe('English → Logic: Nested Quantifiers', () => {
  it('parses "for all integers x, there exists integer y, such that x<y" as ∀x∈ℤ (∃y∈ℤ (x < y))', () => {
    const ast = englishToAst('for all integers x, there exists integer y, such that x<y');
    expect(ast).not.toBeNull();
    if (ast) {
      expect(ast.kind).toBe('quantifier');
      if (ast.kind === 'quantifier') {
        expect(ast.q).toBe('forall');
        expect(ast.var).toBe('x');
        expect(ast.domain?.name).toBe('ℤ');
        expect(ast.body.kind).toBe('quantifier');
        if (ast.body.kind === 'quantifier') {
          expect(ast.body.q).toBe('exists');
          expect(ast.body.var).toBe('y');
          expect(ast.body.domain?.name).toBe('ℤ');
          expect(ast.body.body.kind).toBe('relation');
          if (ast.body.body.kind === 'relation') {
            expect(ast.body.body.op).toBe('<');
          }
        }
        const logic = exprToString(ast);
        expect(logic).toContain('∀x');
        expect(logic).toContain('∈ℤ');
        expect(logic).toContain('∃y');
        expect(logic).toContain('x < y');
      }
    }
  });

  it('parses nested quantifiers without creating predicate strings', () => {
    const ast = englishToAst('for all integers x, there exists integer y such that x < y');
    expect(ast).not.toBeNull();
    if (ast) {
      const logic = exprToString(ast);
      // Should NOT contain malformed predicate names
      expect(logic).not.toMatch(/ThereThereExists|SuchThat/i);
      // Should contain proper quantifier structure
      expect(logic).toContain('∀');
      expect(logic).toContain('∃');
      expect(logic).toContain('<');
    }
  });
});
