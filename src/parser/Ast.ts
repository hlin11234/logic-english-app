/** AST node types for first-order logic expressions */

export type QuantifierKind = 'forall' | 'exists';

export interface Domain {
  kind: 'domain';
  name: string; // "ℝ" | "ℤ" | "ℚ" | "ℕ" | "ℂ" | string
}

export type Term = VarTerm | NumTerm | FuncTerm | ParenTerm | ConstTerm;

export interface VarTerm {
  kind: 'var';
  name: string;
}

export interface ConstTerm {
  kind: 'const';
  name: string;
}

export interface NumTerm {
  kind: 'num';
  value: number;
}

export interface FuncTerm {
  kind: 'func';
  name: string;
  args: Term[];
}

export interface ParenTerm {
  kind: 'paren';
  term: Term;
}

export interface Quantifier {
  kind: 'quantifier';
  q: QuantifierKind;
  var: string;
  domain?: Domain; // Optional typed domain
  body: Expr;
}

export interface Predicate {
  kind: 'predicate';
  name: string;
  args: Term[];
}

export interface Relation {
  kind: 'relation';
  op: '<' | '≤' | '<=' | '>' | '≥' | '>=' | '=' | '≠' | '!=' | '∈' | '∉';
  left: Term;
  right: Term;
}

export interface Negation {
  kind: 'negation';
  body: Expr;
}

export interface Binary {
  kind: 'binary';
  op: 'and' | 'or' | 'impl' | 'iff';
  left: Expr;
  right: Expr;
}

export type Expr = Quantifier | Predicate | Relation | Negation | Binary;

export function isQuantifier(e: Expr): e is Quantifier {
  return e.kind === 'quantifier';
}
export function isPredicate(e: Expr): e is Predicate {
  return e.kind === 'predicate';
}
export function isRelation(e: Expr): e is Relation {
  return e.kind === 'relation';
}
export function isNegation(e: Expr): e is Negation {
  return e.kind === 'negation';
}
export function isBinary(e: Expr): e is Binary {
  return e.kind === 'binary';
}
