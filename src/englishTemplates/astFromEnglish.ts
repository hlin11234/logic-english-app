/**
 * Convert matched English templates to logic AST.
 * Handles recursive clause parsing and predicate mapping.
 */

import type { Expr, Term, Domain } from '../parser/Ast';
import type { MatchResult, Token } from './match';
import { normalizeEnglish, tokenize, matchAnyTemplate } from './match';
import { ALL_TEMPLATES } from './templates';
import { normalizeDomain, normalizeRelation, getVariableHint, getPredicateForPhrase } from './dataset';
import { normalizeEnglishTokens } from './normalize';
import { parseClause } from './parseEnglishExpr';

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

      // Validate relation operator
      const validOps: Expr['kind'] extends 'relation' ? Expr['op'][] : never = ['<', '≤', '>', '≥', '=', '≠', '∈', '∉'];
      if (!validOps.includes(relOp as any)) {
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
 * Unified English expression parser.
 * Recursively parses expressions with correct precedence:
 * 1. Quantifiers (highest priority for matching)
 * 2. Relations
 * 3. Binary operators (IFF, IMP, OR, AND) with correct precedence
 * 4. Negation
 * 5. Predicates (fallback)
 */
function parseEnglishExpr(tokens: Token[], defaultVar: string = 'x', allTemplates = ALL_TEMPLATES): Expr | null {
  if (tokens.length === 0) {
    return null;
  }

  // Step 1: Try to parse quantifiers first (they have highest priority)
  const quantExpr = parseQuantifier(tokens, defaultVar, allTemplates);
  if (quantExpr) {
    return quantExpr;
  }

  // Step 2: Try to parse relations (before binary operators)
  const relExpr = parseRelation(tokens);
  if (relExpr) {
    return relExpr;
  }

  // Step 3: Try templates for binary operators and other patterns BEFORE manual parsing
  // This ensures templates like TNS1-TNS8, TCOND1-4, etc. are tried first
  const clauseTemplates = allTemplates.filter((t) => 
    t.id !== 'T1' && t.id !== 'T2' && t.id !== 'TQ1' && t.id !== 'TQ2' && t.id !== 'TR1'
  );
  const match = matchAnyTemplate(tokens, clauseTemplates);
  if (match) {
    const expr = astFromMatch(match, allTemplates);
    if (expr) {
      // For implicit templates, replace 'x' with defaultVar
      if (match.templateId === 'T5_IMPLICIT' || match.templateId === 'T6_IMPLICIT') {
        return replaceVariable(expr, 'x', defaultVar);
      }
      return expr;
    }
  }

  // Step 4: Parse binary operators manually (fallback if templates didn't match)
  // Parse from lowest to highest precedence (IFF < IMP < OR < AND)
  const binaryExpr = parseBinaryOperators(tokens, defaultVar, allTemplates);
  if (binaryExpr) {
    return binaryExpr;
  }

  // Step 5: Try negation
  if (tokens[0] === 'not' || tokens[0] === 'NOT') {
    const rest = tokens.slice(1);
    const body = parseEnglishExpr(rest, defaultVar, allTemplates);
    if (body) {
      return { kind: 'negation', body };
    }
  }

  // Step 6: Fallback to predicate (only if nothing else matched)
  // Only create predicates for single tokens or very simple cases
  // This prevents creating malformed predicates from complex clauses
  if (tokens.length === 1) {
    const varName = tokens[0]!;
    // Only create predicate if it looks like a simple variable name
    if (/^[a-z]$/i.test(varName)) {
      return {
        kind: 'predicate',
        name: varName,
        args: [varName],
      };
    }
  }
  
  // For multiple tokens, don't create a predicate - this was the bug!
  // If we get here, nothing matched, so return null
  return null;
}

/**
 * Parse quantifier from tokens.
 * Handles: "for all <domain> <var>, <body>" and "there exists <domain> <var> such that <body>"
 */
function parseQuantifier(tokens: Token[], defaultVar: string, allTemplates: typeof ALL_TEMPLATES): Expr | null {
  // Try typed quantifier templates first
  const typedQuantTemplates = allTemplates.filter((t) => t.id === 'TQ1' || t.id === 'TQ2');
  const match = matchAnyTemplate(tokens, typedQuantTemplates);
  if (match) {
    // astFromMatch for TQ1/TQ2 will call parseEnglishExpr on the body recursively
    const expr = astFromMatch(match, allTemplates);
    if (expr && expr.kind === 'quantifier') {
      return expr;
    }
  }
  return null;
}

/**
 * Parse relation from tokens.
 * Handles: "<var> < <var>", "<var> <= <var>", "<var> = <var>", "<var> ∈ <domain>", etc.
 */
function parseRelation(tokens: Token[]): Expr | null {
  if (tokens.length < 3) {
    return null;
  }

  // Try to find a relation operator
  const relOps = ['<', '≤', '>', '≥', '=', '≠', '∈', '∉'];
  const domainSymbols = ['ℝ', 'ℤ', 'ℚ', 'ℕ', 'ℂ'];
  
  // Look for relation patterns: <var> <op> <var/num/domain>
  for (let i = 1; i < tokens.length - 1; i++) {
    const token = tokens[i]!;
    
    // Check for direct operator
    if (relOps.includes(token)) {
      const leftTokens = tokens.slice(0, i);
      const rightTokens = tokens.slice(i + 1);
      
      const leftTerm = parseTerm(leftTokens);
      if (!leftTerm) continue;
      
      // For membership (∈, ∉), right side can be a domain symbol
      if ((token === '∈' || token === '∉') && rightTokens.length === 1 && domainSymbols.includes(rightTokens[0]!)) {
        // Create a domain term (we'll use a special representation)
        // For now, treat domain as a variable term
        const rightTerm: Term = { kind: 'var', name: rightTokens[0]! };
        return {
          kind: 'relation',
          op: token as any,
          left: leftTerm,
          right: rightTerm,
        };
      }
      
      const rightTerm = parseTerm(rightTokens);
      if (rightTerm) {
        return {
          kind: 'relation',
          op: token as any,
          left: leftTerm,
          right: rightTerm,
        };
      }
    }
    
    // Check for relation phrase: "less than"
    if (token === 'less' && i + 1 < tokens.length && tokens[i + 1] === 'than') {
      const leftTokens = tokens.slice(0, i);
      const rightTokens = tokens.slice(i + 2);
      const leftTerm = parseTerm(leftTokens);
      const rightTerm = parseTerm(rightTokens);
      if (leftTerm && rightTerm) {
        return {
          kind: 'relation',
          op: '<',
          left: leftTerm,
          right: rightTerm,
        };
      }
    }
    
    // Check for "greater than"
    if (token === 'greater' && i + 1 < tokens.length && tokens[i + 1] === 'than') {
      const leftTokens = tokens.slice(0, i);
      const rightTokens = tokens.slice(i + 2);
      const leftTerm = parseTerm(leftTokens);
      const rightTerm = parseTerm(rightTokens);
      if (leftTerm && rightTerm) {
        return {
          kind: 'relation',
          op: '>',
          left: leftTerm,
          right: rightTerm,
        };
      }
    }
    
    // Check for "equal to"
    if (token === 'equal' && i + 1 < tokens.length && tokens[i + 1] === 'to') {
      const leftTokens = tokens.slice(0, i);
      const rightTokens = tokens.slice(i + 2);
      const leftTerm = parseTerm(leftTokens);
      const rightTerm = parseTerm(rightTokens);
      if (leftTerm && rightTerm) {
        return {
          kind: 'relation',
          op: '=',
          left: leftTerm,
          right: rightTerm,
        };
      }
    }
  }
  
  return null;
}

/**
 * Parse binary operators with correct precedence.
 * Precedence (lowest to highest): IFF < IMP < OR < AND
 */
function parseBinaryOperators(tokens: Token[], defaultVar: string, allTemplates: typeof ALL_TEMPLATES): Expr | null {
  // Parse IFF (lowest precedence) - look for "IFF" token (normalized from "if and only if")
  const iffIndex = tokens.indexOf('IFF');
  if (iffIndex !== -1 && iffIndex > 0 && iffIndex < tokens.length - 1) {
    const left = tokens.slice(0, iffIndex);
    const right = tokens.slice(iffIndex + 1);
    const leftExpr = parseEnglishExpr(left, defaultVar, allTemplates);
    const rightExpr = parseEnglishExpr(right, defaultVar, allTemplates);
    if (leftExpr && rightExpr) {
      return { kind: 'binary', op: 'iff', left: leftExpr, right: rightExpr };
    }
  }

  // Parse IMP (ONLYIF, IF...THEN, etc.)
  const impIndex = findImplication(tokens);
  if (impIndex !== -1) {
    const left = tokens.slice(0, impIndex.leftEnd);
    const right = tokens.slice(impIndex.rightStart);
    const leftExpr = parseEnglishExpr(left, defaultVar, allTemplates);
    const rightExpr = parseEnglishExpr(right, defaultVar, allTemplates);
    if (leftExpr && rightExpr) {
      return { kind: 'binary', op: 'impl', left: leftExpr, right: rightExpr };
    }
  }

  // Parse OR
  const orIndex = tokens.indexOf('or');
  if (orIndex !== -1 && orIndex > 0 && orIndex < tokens.length - 1) {
    const left = tokens.slice(0, orIndex);
    const right = tokens.slice(orIndex + 1);
    const leftExpr = parseEnglishExpr(left, defaultVar, allTemplates);
    const rightExpr = parseEnglishExpr(right, defaultVar, allTemplates);
    if (leftExpr && rightExpr) {
      return { kind: 'binary', op: 'or', left: leftExpr, right: rightExpr };
    }
  }

  // Parse AND (highest precedence)
  const andIndex = tokens.indexOf('and');
  if (andIndex !== -1 && andIndex > 0 && andIndex < tokens.length - 1) {
    const left = tokens.slice(0, andIndex);
    const right = tokens.slice(andIndex + 1);
    const leftExpr = parseEnglishExpr(left, defaultVar, allTemplates);
    const rightExpr = parseEnglishExpr(right, defaultVar, allTemplates);
    if (leftExpr && rightExpr) {
      return { kind: 'binary', op: 'and', left: leftExpr, right: rightExpr };
    }
  }

  return null;
}

/**
 * Find implication operator (ONLYIF, IF...THEN, etc.)
 */
function findImplication(tokens: Token[]): { leftEnd: number; rightStart: number } | null {
  // Check for "ONLYIF" (normalized token)
  const onlyIfIndex = tokens.indexOf('ONLYIF');
  if (onlyIfIndex !== -1) {
    return { leftEnd: onlyIfIndex, rightStart: onlyIfIndex + 1 };
  }

  // Check for "if ... then"
  const ifIndex = tokens.indexOf('if');
  if (ifIndex !== -1) {
    const thenIndex = tokens.indexOf('then', ifIndex);
    if (thenIndex !== -1) {
      return { leftEnd: ifIndex + 1, rightStart: thenIndex + 1 };
    }
  }

  return null;
}

/**
 * Legacy function for backward compatibility
 */
function parseClause(tokens: Token[], defaultVar: string, allTemplates = ALL_TEMPLATES): Expr | null {
  return parseEnglishExpr(tokens, defaultVar, allTemplates);
}

/**
 * Replace variable 'x' with newVar in an expression.
 * Used to ensure clauses use the correct variable from outer quantifiers.
 */
/**
 * Parse tokens into a Term (variable, number, or domain reference).
 * Exported for use in parseEnglishExpr.ts
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

function replaceVariable(expr: Expr, oldVar: string, newVar: string): Expr {
  switch (expr.kind) {
    case 'predicate':
      return {
        ...expr,
        args: expr.args.map((arg) => (arg === oldVar ? newVar : arg)),
      };
    case 'quantifier':
      return {
        ...expr,
        var: expr.var === oldVar ? newVar : expr.var,
        body: replaceVariable(expr.body, oldVar, newVar),
      };
    case 'relation':
      return {
        ...expr,
        left: replaceTermVariable(expr.left, oldVar, newVar),
        right: replaceTermVariable(expr.right, oldVar, newVar),
      };
    case 'negation':
      return {
        ...expr,
        body: replaceVariable(expr.body, oldVar, newVar),
      };
    case 'binary':
      return {
        ...expr,
        left: replaceVariable(expr.left, oldVar, newVar),
        right: replaceVariable(expr.right, oldVar, newVar),
      };
  }
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
 * Uses flexible semantic pattern matching.
 */
export function englishToAst(englishText: string, dictionary?: PhraseDictionary): Expr | null {
  if (dictionary) {
    setPhraseDictionary(dictionary);
  }

  try {
    // Use new flexible normalization
    const tokens = normalizeEnglishTokens(englishText);

    if (tokens.length === 0) {
      return null;
    }

    // Use semantic pattern matching
    const result = parseClause(tokens, { defaultVar: 'x' });
    if (!result) {
      // This shouldn't happen as parseClause throws, but just in case
      return null;
    }
    return result.expr;
  } catch (error) {
    // Re-throw with context if it's already an Error with a message
    if (error instanceof Error) {
      throw error;
    }
    // Otherwise, provide a generic error
    throw new Error(`Could not parse: "${englishText}". Try expressing it as a quantifier, relation, or predicate.`);
  }
}
