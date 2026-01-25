/**
 * Template definitions for controlled English → Logic conversion.
 * Templates are patterns with slots that match specific sentence structures.
 */

export type TemplateId =
  | 'T1'
  | 'T2'
  | 'T3'
  | 'T4'
  | 'T4_AND'
  | 'T4_OR'
  | 'T5'
  | 'T5_IMPLICIT'
  | 'T6'
  | 'T6_IMPLICIT'
  | 'TQ1'
  | 'TQ2'
  | 'TR1'
  | 'TNS1'
  | 'TNS2'
  | 'TNS3'
  | 'TNS4'
  | 'TNS5'
  | 'TNS6'
  | 'TNS7'
  | 'TNS8'
  | 'TCOND1'
  | 'TCOND2'
  | 'TCOND3'
  | 'TCOND4';

export interface Template {
  id: TemplateId;
  description: string;
  pattern: TokenPattern;
}

/**
 * Token pattern: array of tokens or pattern elements.
 * - string: exact token match
 * - { type: 'slot', name: string }: captures a sequence of tokens
 * - { type: 'optional', tokens: TokenPattern }: optional group
 * - { type: 'oneOf', options: string[][] }: matches one of the token sequences
 */
export type TokenPattern = Array<
  | string
  | { type: 'slot'; name: string }
  | { type: 'optional'; tokens: TokenPattern }
  | { type: 'oneOf'; options: string[][] }
>;

/**
 * T1: EXISTENTIAL WITH PROPERTIES
 * "there exists a/an/the <NOUN> that <CLAUSE>"
 * → ∃x (Noun(x) ∧ Clause(x))
 */
export const T1: Template = {
  id: 'T1',
  description: 'Existential with properties',
  pattern: [
    { type: 'oneOf', options: [['there', 'exists'], ['exists']] },
    { type: 'optional', tokens: [{ type: 'oneOf', options: [['a'], ['an'], ['the']] }] },
    { type: 'slot', name: 'noun' },
    { type: 'oneOf', options: [['that'], ['which']] },
    { type: 'slot', name: 'clause' },
  ],
};

/**
 * T2: UNIVERSAL WITH PROPERTIES
 * "for every <NOUN>, <CLAUSE>"
 * → ∀x (Noun(x) → Clause(x))
 */
export const T2: Template = {
  id: 'T2',
  description: 'Universal with properties',
  pattern: [
    { type: 'oneOf', options: [['for', 'all'], ['for', 'every'], ['for', 'each']] },
    { type: 'slot', name: 'noun' },
    ',',
    { type: 'slot', name: 'clause' },
  ],
};

/**
 * T3: SIMPLE PREDICATE
 * "<NOUN> <VERB PHRASE>"
 * Used within clauses, not as standalone sentences.
 */
export const T3: Template = {
  id: 'T3',
  description: 'Simple predicate',
  pattern: [{ type: 'slot', name: 'noun' }, { type: 'slot', name: 'verbPhrase' }],
};

/**
 * T4: CONJUNCTION / DISJUNCTION
 * "<CLAUSE> and <CLAUSE>" → (A ∧ B)
 * "<CLAUSE> or <CLAUSE>" → (A ∨ B)
 */
export const T4_AND: Template = {
  id: 'T4_AND',
  description: 'Conjunction',
  pattern: [{ type: 'slot', name: 'left' }, { type: 'oneOf', options: [['and'], ['as', 'well', 'as']] }, { type: 'slot', name: 'right' }],
};

export const T4_OR: Template = {
  id: 'T4_OR',
  description: 'Disjunction',
  pattern: [{ type: 'slot', name: 'left' }, 'or', { type: 'slot', name: 'right' }],
};

/**
 * T5: "has a" property
 * "x has a <NOUN>" → Has<Noun>(x)
 */
export const T5: Template = {
  id: 'T5',
  description: 'Has property',
  pattern: [{ type: 'slot', name: 'subject' }, 'has', { type: 'optional', tokens: [{ type: 'oneOf', options: [['a'], ['an']] }] }, { type: 'slot', name: 'noun' }],
};

/**
 * T5_IMPLICIT: "has a" property with implicit subject (in clause context)
 * "has a <NOUN>" → Has<Noun>(defaultVar)
 */
export const T5_IMPLICIT: Template = {
  id: 'T5_IMPLICIT',
  description: 'Has property (implicit subject)',
  pattern: ['has', { type: 'optional', tokens: [{ type: 'oneOf', options: [['a'], ['an']] }] }, { type: 'slot', name: 'noun' }],
};

/**
 * T6: "is" adjective property
 * "x is <ADJECTIVE>" → <Adjective>(x)
 */
export const T6: Template = {
  id: 'T6',
  description: 'Is adjective property',
  pattern: [{ type: 'slot', name: 'subject' }, 'is', { type: 'slot', name: 'adjective' }],
};

/**
 * T6_IMPLICIT: "is" adjective property with implicit subject (in clause context)
 * "is <ADJECTIVE>" → <Adjective>(defaultVar)
 */
export const T6_IMPLICIT: Template = {
  id: 'T6_IMPLICIT',
  description: 'Is adjective property (implicit subject)',
  pattern: ['is', { type: 'slot', name: 'adjective' }],
};

/**
 * TQ1: Typed Universal Quantifier
 * "for all real numbers x, <BODY>"
 * "for every integer n, <BODY>"
 */
export const TQ1: Template = {
  id: 'TQ1',
  description: 'Typed universal quantifier',
  pattern: [
    { type: 'oneOf', options: [['for', 'all'], ['for', 'every'], ['for', 'each']] },
    { type: 'slot', name: 'domainPhrase' },
    { type: 'slot', name: 'var' },
    { type: 'optional', tokens: [','] },
    { type: 'slot', name: 'body' },
  ],
};

/**
 * TQ2: Typed Existential Quantifier with "such that"
 * "there exists a real number y such that <BODY>"
 */
export const TQ2: Template = {
  id: 'TQ2',
  description: 'Typed existential quantifier',
  pattern: [
    { type: 'oneOf', options: [['there', 'exists'], ['exists']] },
    { type: 'optional', tokens: [{ type: 'oneOf', options: [['a'], ['an'], ['the']] }] },
    { type: 'slot', name: 'domainPhrase' },
    { type: 'slot', name: 'var' },
    { type: 'oneOf', options: [['such', 'that'], ['so', 'that']] },
    { type: 'slot', name: 'body' },
  ],
};

/**
 * TR1: Simple relation
 * "<var> <rel> <varOrNum>"
 * Examples: "x < y", "x is less than y", "x is less than or equal to y"
 */
export const TR1: Template = {
  id: 'TR1',
  description: 'Simple relation',
  pattern: [{ type: 'slot', name: 'left' }, { type: 'slot', name: 'relPhrase' }, { type: 'slot', name: 'right' }],
};

/**
 * TNS3: "if A then B" (highest priority)
 * Meaning: A → B
 */
export const TNS3: Template = {
  id: 'TNS3',
  description: 'If-then implication',
  pattern: ['if', { type: 'slot', name: 'left' }, 'then', { type: 'slot', name: 'right' }],
};

/**
 * TNS5: "A if and only if B" / "A iff B"
 * Meaning: A ↔ B
 */
export const TNS5: Template = {
  id: 'TNS5',
  description: 'If and only if (biconditional)',
  pattern: [{ type: 'slot', name: 'left' }, 'IFF', { type: 'slot', name: 'right' }],
};

/**
 * TNS1: "A only if B"
 * Meaning: A → B
 */
export const TNS1: Template = {
  id: 'TNS1',
  description: 'Only if',
  pattern: [{ type: 'slot', name: 'left' }, 'ONLYIF', { type: 'slot', name: 'right' }],
};

/**
 * TNS8: "A is necessary and sufficient for B"
 * Meaning: A ↔ B
 */
export const TNS8: Template = {
  id: 'TNS8',
  description: 'Necessary and sufficient',
  pattern: [{ type: 'slot', name: 'left' }, 'NECSUFFFOR', { type: 'slot', name: 'right' }],
};

/**
 * TNS6: "A is sufficient for B"
 * Meaning: A → B
 */
export const TNS6: Template = {
  id: 'TNS6',
  description: 'Sufficient for',
  pattern: [{ type: 'slot', name: 'left' }, 'SUFFOR', { type: 'slot', name: 'right' }],
};

/**
 * TNS7: "A is necessary for B"
 * Meaning: B → A
 */
export const TNS7: Template = {
  id: 'TNS7',
  description: 'Necessary for',
  pattern: [{ type: 'slot', name: 'left' }, 'NECFOR', { type: 'slot', name: 'right' }],
};

/**
 * TNS4: "A implies B"
 * Meaning: A → B
 */
export const TNS4: Template = {
  id: 'TNS4',
  description: 'Implies',
  pattern: [{ type: 'slot', name: 'left' }, { type: 'oneOf', options: [['implies'], ['=>']] }, { type: 'slot', name: 'right' }],
};

/**
 * TNS2: "A if B" (lowest priority, most ambiguous)
 * Meaning: B → A
 */
export const TNS2: Template = {
  id: 'TNS2',
  description: 'If (reverse implication)',
  pattern: [{ type: 'slot', name: 'left' }, 'if', { type: 'slot', name: 'right' }],
};

/**
 * TCOND1: "<NP> is a sufficient condition for/to <NP>"
 * Meaning: ∀x (A(x) → B(x))
 */
export const TCOND1: Template = {
  id: 'TCOND1',
  description: 'Sufficient condition (with "a")',
  pattern: [{ type: 'slot', name: 'left' }, 'is', 'a', 'SUFFCOND', { type: 'slot', name: 'right' }],
};

/**
 * TCOND2: "<NP> is sufficient for/to <NP>"
 * Meaning: ∀x (A(x) → B(x))
 */
export const TCOND2: Template = {
  id: 'TCOND2',
  description: 'Sufficient (without "a")',
  pattern: [{ type: 'slot', name: 'left' }, 'SUFFFOR', { type: 'slot', name: 'right' }],
};

/**
 * TCOND3: "<NP> is a necessary condition for/to <NP>"
 * Meaning: ∀x (B(x) → A(x))
 */
export const TCOND3: Template = {
  id: 'TCOND3',
  description: 'Necessary condition (with "a")',
  pattern: [{ type: 'slot', name: 'left' }, 'is', 'a', 'NECCOND', { type: 'slot', name: 'right' }],
};

/**
 * TCOND4: "<NP> is necessary for/to <NP>"
 * Meaning: ∀x (B(x) → A(x))
 */
export const TCOND4: Template = {
  id: 'TCOND4',
  description: 'Necessary (without "a")',
  pattern: [{ type: 'slot', name: 'left' }, 'NECFOR', { type: 'slot', name: 'right' }],
};

export const ALL_TEMPLATES: Template[] = [
  // Highest priority: condition templates (specific patterns)
  TCOND1,
  TCOND2,
  TCOND3,
  TCOND4,
  // High priority: if-then, iff
  TNS3,
  TNS5,
  // Medium priority: only if, necessary and sufficient
  TNS1,
  TNS8,
  // Lower priority: sufficient, necessary, implies
  TNS6,
  TNS7,
  TNS4,
  // Typed quantifiers
  TQ1,
  TQ2,
  // Relations
  TR1,
  // Other templates
  T1,
  T2,
  T3,
  T4_AND,
  T4_OR,
  T5,
  T5_IMPLICIT,
  T6,
  T6_IMPLICIT,
  // Lowest priority: "A if B" (most ambiguous)
  TNS2,
];
