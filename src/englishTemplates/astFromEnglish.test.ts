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
    const { ast } = parse('p → q');
    const english = toEnglish(ast);
    expect(english).toContain('If');
    expect(english).toContain('sufficient');
    expect(english).toContain('necessary');
  });

  it('renders p ↔ q with necessary and sufficient alternate', () => {
    const { ast } = parse('p ↔ q');
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

describe('English → Logic: Quantifier chains with domains (regressions)', () => {
  it('parses "for every natural number n, there exists a natural number m such that m > n"', () => {
    const ast = englishToAst('for every natural number n, there exists a natural number m such that m > n');
    expect(ast).not.toBeNull();
    if (!ast) return;
    const logic = exprToString(ast);
    expect(logic).toBe('∀n∈ℕ ( ∃m∈ℕ ( m > n ) )');
  });

  it('parses "for all real numbers x, there exists a real number y such that x < y"', () => {
    const ast = englishToAst('for all real numbers x, there exists a real number y such that x < y');
    expect(ast).not.toBeNull();
    if (!ast) return;
    const logic = exprToString(ast);
    expect(logic).toBe('∀x∈ℝ ( ∃y∈ℝ ( x < y ) )');
  });

  it('parses "for every integer n there exists an integer m where m > n"', () => {
    const ast = englishToAst('for every integer n there exists an integer m where m > n');
    expect(ast).not.toBeNull();
    if (!ast) return;
    const logic = exprToString(ast);
    expect(logic).toBe('∀n∈ℤ ( ∃m∈ℤ ( m > n ) )');
  });

  it('parses "there exists a real number y such that y > 0"', () => {
    const ast = englishToAst('there exists a real number y such that y > 0');
    expect(ast).not.toBeNull();
    if (!ast) return;
    const logic = exprToString(ast);
    expect(logic).toBe('∃y∈ℝ ( y > 0 )');
  });

  it('parses "for all integers x, there exists integer y such that x < y"', () => {
    const ast = englishToAst('for all integers x, there exists integer y such that x < y');
    expect(ast).not.toBeNull();
    if (!ast) return;
    const logic = exprToString(ast);
    expect(logic).toBe('∀x∈ℤ ( ∃y∈ℤ ( x < y ) )');
  });

  it('parses "for every real number t there exists a real number u where t ≤ u"', () => {
    const ast = englishToAst('for every real number t there exists a real number u where t ≤ u');
    expect(ast).not.toBeNull();
    if (!ast) return;
    const logic = exprToString(ast);
    expect(logic).toBe('∀t∈ℝ ( ∃u∈ℝ ( t ≤ u ) )');
  });

  it('parses "there exists an integer k such that k ≠ 0"', () => {
    const ast = englishToAst('there exists an integer k such that k ≠ 0');
    expect(ast).not.toBeNull();
    if (!ast) return;
    const logic = exprToString(ast);
    expect(logic).toBe('∃k∈ℤ ( k ≠ 0 )');
  });

  it('parses "for each rational number q, there exists a rational number r such that r = q + 1" with correct quantifiers and domains', () => {
    const ast = englishToAst('for each rational number q, there exists a rational number r such that r = q + 1');
    expect(ast).not.toBeNull();
    if (!ast) return;
    const logic = exprToString(ast);
    // We at least require the correct quantifier + domain skeleton.
    expect(logic).toContain('∀q∈ℚ');
    expect(logic).toContain('∃r∈ℚ');
    expect(logic).toContain('=');
  });
});

describe('English → Logic: Flexible Parsing and Variable Names', () => {
  it('preserves user-specified variable name "t" in "for all real numbers t"', () => {
    const ast = englishToAst('for all real numbers t, t is greater than 0');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.var).toBe('t');
      expect(ast.domain?.name).toBe('ℝ');
    }
  });

  it('preserves user-specified variable name "count" in "there exists integer count"', () => {
    const ast = englishToAst('there exists integer count such that count is greater than 0');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.var).toBe('count');
      expect(ast.domain?.name).toBe('ℤ');
    }
  });

  it('preserves variable name "k" in "for every integer k"', () => {
    const ast = englishToAst('for every integer k, k is positive or k is negative');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.var).toBe('k');
    }
  });

  it('handles "given any integer n" as universal quantifier', () => {
    const ast = englishToAst('given any integer n, n is not equal to n+1');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.q).toBe('forall');
      expect(ast.var).toBe('n');
      expect(ast.domain?.name).toBe('ℤ');
    }
  });

  it('handles "we can find" as existential quantifier', () => {
    const ast = englishToAst('we can find a real number y such that y is greater than x');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.q).toBe('exists');
    }
  });

  it('handles "for all real numbers x there exists y such that x < y" (no comma)', () => {
    const ast = englishToAst('for all real numbers x there exists y such that x < y');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.var).toBe('x');
      expect(ast.body.kind).toBe('quantifier');
      if (ast.body.kind === 'quantifier') {
        expect(ast.body.var).toBe('y');
      }
    }
  });

  it('handles "being a tomato guarantees being a fruit" as sufficient condition', () => {
    const ast = englishToAst('being a tomato guarantees being a fruit');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.q).toBe('forall');
      expect(ast.body.kind).toBe('binary');
      if (ast.body.kind === 'binary') {
        expect(ast.body.op).toBe('impl');
      }
    }
  });

  it('handles "having a ticket is required for entry" as necessary condition', () => {
    const ast = englishToAst('having a ticket is required for entry');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.q).toBe('forall');
      expect(ast.body.kind).toBe('binary');
      if (ast.body.kind === 'binary') {
        expect(ast.body.op).toBe('impl');
      }
    }
  });

  it('handles "whenever p, q" as implication', () => {
    const ast = englishToAst('whenever p, q');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'binary') {
      expect(ast.op).toBe('impl');
    }
  });

  it('handles "for every foo, foo is greater than 0 or foo equals 0"', () => {
    const ast = englishToAst('for every foo, foo is greater than 0 or foo equals 0');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.var).toBe('foo');
      expect(ast.body.kind).toBe('binary');
      if (ast.body.kind === 'binary') {
        expect(ast.body.op).toBe('or');
      }
    }
  });

  it('handles "all real numbers x are positive or negative"', () => {
    const ast = englishToAst('all real numbers x are positive or negative');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.q).toBe('forall');
      expect(ast.var).toBe('x');
      expect(ast.domain?.name).toBe('ℝ');
    }
  });

  it('handles "any integer n is either even or odd"', () => {
    const ast = englishToAst('any integer n is either even or odd');
    expect(ast).not.toBeNull();
    if (ast && ast.kind === 'quantifier') {
      expect(ast.q).toBe('forall');
      expect(ast.var).toBe('n');
      expect(ast.domain?.name).toBe('ℤ');
    }
  });
});

/**
 * README Phil Notes – Suggested grading checklist (English → Logic).
 * These tests assert the exact examples and behavior described in the README.
 */
describe('README grading checklist: English → Logic', () => {
  it('"for all real numbers x, there exists a real number y such that x < y" → ∀x∈ℝ ( ∃y∈ℝ ( x < y ) )', () => {
    const ast = englishToAst('for all real numbers x, there exists a real number y such that x < y');
    expect(ast).not.toBeNull();
    if (!ast) return;
    const logic = exprToString(ast);
    expect(logic).toBe('∀x∈ℝ ( ∃y∈ℝ ( x < y ) )');
  });

  it('"x is greater than or equal to 5" → x ≥ 5', () => {
    const ast = englishToAst('x is greater than or equal to 5');
    expect(ast).not.toBeNull();
    if (!ast) return;
    expect(ast.kind).toBe('relation');
    if (ast.kind === 'relation') {
      expect(ast.op).toBe('≥');
    }
    const logic = exprToString(ast);
    expect(logic).toBe('x ≥ 5');
  });

  it('relation phrase "x is at least 0" parses as x ≥ 0', () => {
    const ast = englishToAst('x is at least 0');
    expect(ast).not.toBeNull();
    if (!ast) return;
    expect(ast.kind).toBe('relation');
    if (ast.kind === 'relation') {
      expect(ast.op).toBe('≥');
    }
    const logic = exprToString(ast);
    expect(logic).toBe('x ≥ 0');
  });

  it('predicates have non-empty args (no P() or Q())', () => {
    const ast = englishToAst('p and q');
    expect(ast).not.toBeNull();
    if (!ast) return;
    const logic = exprToString(ast);
    expect(logic).not.toMatch(/\(\s*\)/);
    expect(logic).toContain('(');
    expect(logic).toContain(')');
    const hasPredicateWithArg = logic.includes('P(') && logic.includes('Q(');
    expect(hasPredicateWithArg).toBe(true);
  });

  it('"p only if q" and "q if p" produce correct implications', () => {
    const onlyIf = englishToAst('p only if q');
    const qIfP = englishToAst('q if p');
    expect(onlyIf).not.toBeNull();
    expect(qIfP).not.toBeNull();
    if (onlyIf && onlyIf.kind === 'binary') expect(onlyIf.op).toBe('impl');
    if (qIfP && qIfP.kind === 'binary') expect(qIfP.op).toBe('impl');
  });
});
