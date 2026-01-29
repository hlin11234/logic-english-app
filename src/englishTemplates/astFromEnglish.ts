import type { Expr, Term } from '../parser/Ast';
import type { MatchResult, Token } from './match';
import type { NormalizedToken } from './normalize';
import { ALL_TEMPLATES } from './templates';
import { normalizeDomain, normalizeRelation, getVariableHint, getPredicateForPhrase } from './dataset';
import { matchAnyTemplate } from './match';
import { normalizeEnglishTokens } from './normalize';
import { parseClause as parseSemanticClause } from './parseEnglishExpr';
import { validateAst } from '../parser/validateAst';

/**
 * Dictionary mapping English phrases to predicate names.
 * User can extend this via UI later.
 */
export interface PhraseDictionary {
  [phrase: string]: string; // "computer program" -> "Program"
}

const DEFAULT_DICTIONARY: PhraseDictionary = {
  'computer program': 'Program',
  program: 'Program',
  student: 'Student',
  bug: 'Bug',
  executable: 'Executable',
};

let phraseDictionary: PhraseDictionary = { ...DEFAULT_DICTIONARY };

/**
 * Set the phrase dictionary (for UI integration later).
 */
export function setPhraseDictionary(dict: PhraseDictionary): void {
  phraseDictionary = { ...DEFAULT_DICTIONARY, ...dict };
}

/**
 * Get predicate name from a phrase.
 * Falls back to capitalizing the phrase if not in dictionary.
 */
function getPredicateName(phraseTokens: Token[]): string {
  const phrase = phraseTokens.join(' ').toLowerCase();
  if (phraseDictionary[phrase]) {
    return phraseDictionary[phrase];
  }
  // Capitalize first letter of each word
  return phraseTokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('');
}

/**
 * Parse a noun phrase clause into a predicate.
 * Accepts "being a <NP>", "being an <NP>", "being <NP>", or "<NP>".
 * Uses dictionary first; fallback phraseToUnaryPredicate for unrecognized phrases.
 * Returns Pred(name, ["x"]) or null only if tokens are empty.
 */
function parseNpClause(tokens: Token[]): Expr | null {
  if (tokens.length === 0) {
    return null;
  }

  const phrase = tokens.join(' ');
  const predicateName = getPredicateForPhrase(phrase);

  return {
    kind: 'predicate',
    name: predicateName,
    args: ['x'],
  };
}

/**
 * Convert a matched template result to an AST expression.
 *
 * NOTE: The main `englishToAst` entry point no longer relies on templates,
 * but tests still exercise this helper for condition patterns.
 */
export function astFromMatch(match: MatchResult, allTemplates = ALL_TEMPLATES): Expr | null {
  switch (match.templateId) {
    case 'TQ1': {
      // Typed Universal: "for all real numbers x, <BODY>"
      const domainPhraseTokens = match.slots.domainPhrase || [];
      const varTokens = match.slots.var || [];
      const bodyTokens = match.slots.body || [];

      if (domainPhraseTokens.length === 0 || varTokens.length === 0 || bodyTokens.length === 0) {
        return null;
      }

      const domainPhrase = domainPhraseTokens.join(' ');
      const domainSymbol = normalizeDomain(domainPhrase);
      if (!domainSymbol) {
        return null; // Unknown domain
      }

      const varName = varTokens[0] || getVariableHint(domainSymbol, 0);
      // Use parseEnglishExpr to recursively parse the body (handles nested quantifiers, relations, etc.)
      const bodyExpr = parseEnglishExpr(bodyTokens, varName, allTemplates);
      if (!bodyExpr) {
        return null;
      }

      return {
        kind: 'quantifier',
        q: 'forall',
        var: varName,
        domain: { kind: 'domain', name: domainSymbol },
        body: bodyExpr,
      };
    }

    case 'TQ2': {
      // Typed Existential: "there exists a real number y such that <BODY>"
      const domainPhraseTokens = match.slots.domainPhrase || [];
      const varTokens = match.slots.var || [];
      const bodyTokens = match.slots.body || [];

      if (domainPhraseTokens.length === 0 || varTokens.length === 0 || bodyTokens.length === 0) {
        return null;
      }

      const domainPhrase = domainPhraseTokens.join(' ');
      const domainSymbol = normalizeDomain(domainPhrase);
      if (!domainSymbol) {
        return null; // Unknown domain
      }

      const varName = varTokens[0] || getVariableHint(domainSymbol, 1);
      // Use parseEnglishExpr to recursively parse the body (handles nested quantifiers, relations, etc.)
      const bodyExpr = parseEnglishExpr(bodyTokens, varName, allTemplates);
      if (!bodyExpr) {
        return null;
      }

      return {
        kind: 'quantifier',
        q: 'exists',
        var: varName,
        domain: { kind: 'domain', name: domainSymbol },
        body: bodyExpr,
      };
    }

    case 'TR1': {
      // Simple relation: "<var> <rel> <varOrNum>"
      const leftTokens = match.slots.left || [];
      const relPhraseTokens = match.slots.relPhrase || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || relPhraseTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      const relPhrase = relPhraseTokens.join(' ');
      const relOp = normalizeRelation(relPhrase);
      if (!relOp) {
        return null; // Unknown relation
      }

      // Parse left term (variable or number)
      const leftTerm = parseTerm(leftTokens);
      if (!leftTerm) {
        return null;
      }

      // Parse right term (variable, number, or domain)
      const rightTerm = parseTerm(rightTokens);
      if (!rightTerm) {
        return null;
      }

      return {
        kind: 'relation',
        op: relOp as any,
        left: leftTerm,
        right: rightTerm,
      };
    }

    case 'TNS1': {
      // "A only if B" → A → B
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      const leftExpr = parseEnglishExpr(leftTokens, 'x', allTemplates);
      const rightExpr = parseEnglishExpr(rightTokens, 'x', allTemplates);

      if (!leftExpr || !rightExpr) {
        return null;
      }

      return {
        kind: 'binary',
        op: 'impl',
        left: leftExpr,
        right: rightExpr,
      };
    }

    case 'TNS2': {
      // "A if B" → B → A (reverse)
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      const leftExpr = parseEnglishExpr(leftTokens, 'x', allTemplates);
      const rightExpr = parseEnglishExpr(rightTokens, 'x', allTemplates);

      if (!leftExpr || !rightExpr) {
        return null;
      }

      // Reverse: A if B means B → A
      return {
        kind: 'binary',
        op: 'impl',
        left: rightExpr,
        right: leftExpr,
      };
    }

    case 'TNS3': {
      // "if A then B" → A → B
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      const leftExpr = parseEnglishExpr(leftTokens, 'x', allTemplates);
      const rightExpr = parseEnglishExpr(rightTokens, 'x', allTemplates);

      if (!leftExpr || !rightExpr) {
        return null;
      }

      return {
        kind: 'binary',
        op: 'impl',
        left: leftExpr,
        right: rightExpr,
      };
    }

    case 'TNS4': {
      // "A implies B" → A → B
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      const leftExpr = parseEnglishExpr(leftTokens, 'x', allTemplates);
      const rightExpr = parseEnglishExpr(rightTokens, 'x', allTemplates);

      if (!leftExpr || !rightExpr) {
        return null;
      }

      return {
        kind: 'binary',
        op: 'impl',
        left: leftExpr,
        right: rightExpr,
      };
    }

    case 'TNS5': {
      // "A if and only if B" → A ↔ B
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      const leftExpr = parseEnglishExpr(leftTokens, 'x', allTemplates);
      const rightExpr = parseEnglishExpr(rightTokens, 'x', allTemplates);

      if (!leftExpr || !rightExpr) {
        return null;
      }

      return {
        kind: 'binary',
        op: 'iff',
        left: leftExpr,
        right: rightExpr,
      };
    }

    case 'TNS6': {
      // "A is sufficient for B" → A → B
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      const leftExpr = parseEnglishExpr(leftTokens, 'x', allTemplates);
      const rightExpr = parseEnglishExpr(rightTokens, 'x', allTemplates);

      if (!leftExpr || !rightExpr) {
        return null;
      }

      return {
        kind: 'binary',
        op: 'impl',
        left: leftExpr,
        right: rightExpr,
      };
    }

    case 'TNS7': {
      // "A is necessary for B" → B → A (reverse)
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      const leftExpr = parseEnglishExpr(leftTokens, 'x', allTemplates);
      const rightExpr = parseEnglishExpr(rightTokens, 'x', allTemplates);

      if (!leftExpr || !rightExpr) {
        return null;
      }

      // Reverse: A is necessary for B means B → A
      return {
        kind: 'binary',
        op: 'impl',
        left: rightExpr,
        right: leftExpr,
      };
    }

    case 'TNS8': {
      // "A is necessary and sufficient for B" → A ↔ B
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      const leftExpr = parseEnglishExpr(leftTokens, 'x', allTemplates);
      const rightExpr = parseEnglishExpr(rightTokens, 'x', allTemplates);

      if (!leftExpr || !rightExpr) {
        return null;
      }

      return {
        kind: 'binary',
        op: 'iff',
        left: leftExpr,
        right: rightExpr,
      };
    }

    case 'TCOND1':
    case 'TCOND2': {
      // "<NP> is a sufficient condition for/to <NP>" or "<NP> is sufficient for/to <NP>"
      // Meaning: ∀x (A(x) → B(x))
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      // Parse as noun phrase clauses
      const leftExpr = parseNpClause(leftTokens);
      const rightExpr = parseNpClause(rightTokens);

      if (!leftExpr || !rightExpr) {
        // Unknown phrase - we could throw an error here, but for now return null
        // The caller (EnglishToLogic component) will show a helpful error
        return null;
      }

      // Wrap in universal quantifier: ∀x (A(x) → B(x))
      return {
        kind: 'quantifier',
        q: 'forall',
        var: 'x',
        body: {
          kind: 'binary',
          op: 'impl',
          left: leftExpr,
          right: rightExpr,
        },
      };
    }

    case 'TCOND3':
    case 'TCOND4': {
      // "<NP> is a necessary condition for/to <NP>" or "<NP> is necessary for/to <NP>"
      // Meaning: ∀x (B(x) → A(x)) - note the reversal!
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      // Parse as noun phrase clauses
      const leftExpr = parseNpClause(leftTokens);
      const rightExpr = parseNpClause(rightTokens);

      if (!leftExpr || !rightExpr) {
        // Unknown phrase - return null (caller should show error)
        return null;
      }

      // Wrap in universal quantifier with reversal: ∀x (B(x) → A(x))
      return {
        kind: 'quantifier',
        q: 'forall',
        var: 'x',
        body: {
          kind: 'binary',
          op: 'impl',
          left: rightExpr, // B(x)
          right: leftExpr,  // A(x) - reversed!
        },
      };
    }

    case 'T1': {
      // ∃x (Noun(x) ∧ Clause(x))
      const nounTokens = match.slots.noun || [];
      const clauseTokens = match.slots.clause || [];

      if (nounTokens.length === 0 || clauseTokens.length === 0) {
        return null;
      }

      const nounName = getPredicateName(nounTokens);
      const varName = nounName.charAt(0).toLowerCase(); // Use first letter as variable

      // Parse the clause (pass varName so clauses know the subject)
      const clauseExpr = parseClause(clauseTokens, varName, allTemplates);
      if (!clauseExpr) {
        return null;
      }

      // Create: ∃x (Noun(x) ∧ Clause(x))
      const nounPred: Expr = {
        kind: 'predicate',
        name: nounName,
        args: [varName],
      };

      return {
        kind: 'quantifier',
        q: 'exists',
        var: varName,
        body: {
          kind: 'binary',
          op: 'and',
          left: nounPred,
          right: clauseExpr,
        },
      };
    }

    case 'T2': {
      // ∀x (Noun(x) → Clause(x))
      const nounTokens = match.slots.noun || [];
      const clauseTokens = match.slots.clause || [];

      if (nounTokens.length === 0 || clauseTokens.length === 0) {
        return null;
      }

      const nounName = getPredicateName(nounTokens);
      const varName = nounName.charAt(0).toLowerCase();

      // Parse the clause (pass varName so clauses know the subject)
      const clauseExpr = parseClause(clauseTokens, varName, allTemplates);
      if (!clauseExpr) {
        return null;
      }

      const nounPred: Expr = {
        kind: 'predicate',
        name: nounName,
        args: [varName],
      };

      return {
        kind: 'quantifier',
        q: 'forall',
        var: varName,
        body: {
          kind: 'binary',
          op: 'impl',
          left: nounPred,
          right: clauseExpr,
        },
      };
    }

    case 'T3': {
      // Simple predicate: <NOUN> <VERB PHRASE>
      // This is typically used within clauses, not as top-level
      const nounTokens = match.slots.noun || [];
      const verbPhraseTokens = match.slots.verbPhrase || [];

      if (nounTokens.length === 0) {
        return null;
      }

      // For MVP, treat verb phrase as a predicate name
      const predicateName = verbPhraseTokens.length > 0 ? getPredicateName(verbPhraseTokens) : getPredicateName(nounTokens);
      const varName = nounTokens[0]?.charAt(0).toLowerCase() || 'x';

      return {
        kind: 'predicate',
        name: predicateName,
        args: [varName],
      };
    }

    case 'T4_AND':
    case 'T4_OR': {
      // Conjunction or disjunction
      const leftTokens = match.slots.left || [];
      const rightTokens = match.slots.right || [];

      if (leftTokens.length === 0 || rightTokens.length === 0) {
        return null;
      }

      const leftExpr = parseClause(leftTokens, 'x', allTemplates);
      const rightExpr = parseClause(rightTokens, 'x', allTemplates);

      if (!leftExpr || !rightExpr) {
        return null;
      }

      const op = match.templateId === 'T4_AND' ? 'and' : 'or';

      return {
        kind: 'binary',
        op,
        left: leftExpr,
        right: rightExpr,
      };
    }

    case 'T5': {
      // "x has a <NOUN>" → Has<Noun>(x)
      const subjectTokens = match.slots.subject || [];
      const nounTokens = match.slots.noun || [];

      if (subjectTokens.length === 0 || nounTokens.length === 0) {
        return null;
      }

      const nounName = getPredicateName(nounTokens);
      const predicateName = 'Has' + nounName;
      const varName = subjectTokens[0]!.charAt(0).toLowerCase();

      return {
        kind: 'predicate',
        name: predicateName,
        args: [varName],
      };
    }

    case 'T5_IMPLICIT': {
      // "has a <NOUN>" → Has<Noun>(defaultVar) - subject comes from outer quantifier
      const nounTokens = match.slots.noun || [];

      if (nounTokens.length === 0) {
        return null;
      }

      const nounName = getPredicateName(nounTokens);
      const predicateName = 'Has' + nounName;
      // Use 'x' as placeholder, will be replaced by parseClause with defaultVar
      const varName = 'x';

      return {
        kind: 'predicate',
        name: predicateName,
        args: [varName],
      };
    }

    case 'T6': {
      // "x is <ADJECTIVE>" → <Adjective>(x)
      const subjectTokens = match.slots.subject || [];
      const adjectiveTokens = match.slots.adjective || [];

      if (subjectTokens.length === 0 || adjectiveTokens.length === 0) {
        return null;
      }

      const adjectiveName = getPredicateName(adjectiveTokens);
      const varName = subjectTokens[0]!.charAt(0).toLowerCase();

      return {
        kind: 'predicate',
        name: adjectiveName,
        args: [varName],
      };
    }

    case 'T6_IMPLICIT': {
      // "is <ADJECTIVE>" → <Adjective>(defaultVar) - subject comes from outer quantifier
      const adjectiveTokens = match.slots.adjective || [];

      if (adjectiveTokens.length === 0) {
        return null;
      }

      const adjectiveName = getPredicateName(adjectiveTokens);
      // Use 'x' as placeholder, will be replaced by parseClause with defaultVar
      const varName = 'x';

      return {
        kind: 'predicate',
        name: adjectiveName,
        args: [varName],
      };
    }

    default:
      return null;
  }
}

/**
 * Parse tokens into a Term (variable, number, or domain reference).
 * Exported for use in semantic parser (`parseEnglishExpr.ts`) and legacy templates.
 */
export function parseTerm(tokens: Token[]): Term | null {
  if (tokens.length === 0) {
    return null;
  }

  // Single token: variable or number
  if (tokens.length === 1) {
    const token = tokens[0]!;
    // Check if it's a number
    const num = parseFloat(token);
    if (!isNaN(num) && isFinite(num)) {
      return { kind: 'num', value: num };
    }
    // Otherwise treat as variable
    return { kind: 'var', name: token };
  }

  // Multiple tokens: try to parse as number or variable name
  const joined = tokens.join('');
  const num = parseFloat(joined);
  if (!isNaN(num) && isFinite(num)) {
    return { kind: 'num', value: num };
  }

  // Treat as variable name (e.g., "m+1" would be a function call, but for MVP just use first token)
  return { kind: 'var', name: tokens[0]! };
}

/**
 * Legacy wrapper: parse a clause using the template-based parser.
 * Still used by older template helpers (e.g. condition patterns), but
 * the main `englishToAst` entry point now uses the semantic parser.
 */
function parseClause(tokens: Token[], defaultVar: string, allTemplates = ALL_TEMPLATES): Expr | null {
  return parseEnglishExpr(tokens, defaultVar, allTemplates);
}

function replaceTermVariable(term: Term, oldVar: string, newVar: string): Term {
  switch (term.kind) {
    case 'var':
      return { ...term, name: term.name === oldVar ? newVar : term.name };
    case 'num':
      return term;
    case 'func':
      return {
        ...term,
        args: term.args.map((arg) => replaceTermVariable(arg, oldVar, newVar)),
      };
    case 'paren':
      return {
        ...term,
        term: replaceTermVariable(term.term, oldVar, newVar),
      };
  }
}

/**
 * Main entry point: convert English text to AST.
 *
 * Pipeline:
 * 1. Normalize to structured tokens (KW/ID/NUM/OP) without dropping identifiers.
 * 2. Use priority-based clause parser that treats quantifiers first (including chains).
 * 3. Run AST validation to ensure all variables in relations are in scope.
 *
 * If a quantifier phrase is present but can't be parsed, or if the body
 * uses an unbound variable, this function throws an Error with a helpful
 * message (so callers can surface it to the user).
 */
export function englishToAst(englishText: string, _dictionary?: PhraseDictionary): Expr | null {
  const tokens: NormalizedToken[] = normalizeEnglishTokens(englishText);
  if (tokens.length === 0) {
    return null;
  }

  let result;
  try {
    result = parseSemanticClause(tokens, {});
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(String(err));
  }

  if (!result) {
    return null;
  }

  if (result.remainingTokens.length > 0) {
    const extra = result.remainingTokens.map((t) => t.value).join(' ');
    throw new Error(`Could not understand part of the sentence near "${extra}".`);
  }

  const ast = result.expr;
  const validation = validateAst(ast);
  if (!validation.ok) {
    const unbound = validation.errors.find((e) => e.startsWith('Unbound variable '));
    if (unbound) {
      const parts = unbound.split(/\s+/);
      const varName = parts[2] ?? '?';
      throw new Error(`${unbound}. Add a quantifier for ${varName} or use the builder.`);
    }
    throw new Error(validation.errors.join('; '));
  }

  return ast;
}
