/**
 * Semantic pattern matching for English → Logic conversion.
 * Uses flexible pattern matching instead of exact templates.
 */

import type { Expr, Term, Domain } from '../parser/Ast';
import type { NormalizedToken } from './normalize';
import { normalizeDomain, getPredicateForPhrase } from './dataset';
import { parseTerm } from './astFromEnglish';

/**
 * Helper to convert NormalizedToken[] to string[] for parseTerm
 */
function tokensToStrings(tokens: NormalizedToken[]): string[] {
  return tokens as string[];
}

export interface ParseContext {
  defaultVar?: string;
}

/**
 * Extract variable name from tokens after a quantifier phrase.
 * Patterns:
 * - FORALL <domain?> <var>
 * - EXISTS <domain?> <var>
 * Returns { varName, domain, remainingTokens }
 */
export function extractQuantifierInfo(
  tokens: NormalizedToken[],
  quantifierType: 'FORALL' | 'EXISTS'
): { varName: string | null; domain: Domain | null; remainingTokens: NormalizedToken[] } | null {
  if (tokens.length === 0) return null;

  // Check if first token is the quantifier
  if (tokens[0] !== quantifierType) return null;

  let i = 1;
  let domain: Domain | null = null;
  let varName: string | null = null;

  // Skip optional articles
  while (i < tokens.length && ['a', 'an', 'the'].includes(tokens[i]!)) {
    i++;
  }

  // Try to find domain phrase: "real numbers", "integers", etc.
  let domainEnd = i;
  
  // Try to match known domain phrases (1-3 words)
  for (let len = 1; len <= 3 && i + len <= tokens.length; len++) {
    const phrase = tokens.slice(i, i + len).join(' ');
    const domainSymbol = normalizeDomain(phrase);
    if (domainSymbol) {
      domain = { kind: 'domain', name: domainSymbol };
      domainEnd = i + len;
      break;
    }
  }

  // If we found a domain, skip past it
  if (domain) {
    i = domainEnd;
    // Skip optional articles after domain
    while (i < tokens.length && ['a', 'an', 'the'].includes(tokens[i]!)) {
      i++;
    }
  }

  // Next token should be the variable name
  // Variable names can be any identifier that's not a reserved token
  if (i < tokens.length) {
    const varToken = tokens[i]!;
    // Variable names are typically single identifiers (not normalized tokens)
    // Check if it's not a reserved token
    if (!isReservedToken(varToken)) {
      varName = varToken;
      i++;
    } else {
      // If the token is reserved, we can't extract a variable name
      // This is an error case - return null
      return null;
    }
  } else {
    // No more tokens - can't find variable name
    return null;
  }

  // Skip optional comma
  if (i < tokens.length && tokens[i] === ',') {
    i++;
  }

  // Skip optional SUCHTHAT
  if (i < tokens.length && tokens[i] === 'SUCHTHAT') {
    i++;
  }

  if (!varName) {
    return null; // Couldn't find variable name
  }

  return {
    varName,
    domain,
    remainingTokens: tokens.slice(i),
  };
}

/**
 * Check if a token is a reserved/normalized token (not a variable name)
 */
function isReservedToken(token: string): boolean {
  const reserved = [
    'FORALL', 'EXISTS', 'SUCHTHAT', 'AND', 'OR', 'NOT', 'IF', 'THEN',
    'ONLYIF', 'IFF', 'UNLESS', 'SUFFICIENT', 'NECESSARY', 'NECSUFF',
    '<', '>', '≤', '≥', '=', '≠', '∈', '∉',
  ];
  return reserved.includes(token);
}

/**
 * Parse a universal quantifier using semantic pattern matching
 */
export function parseUniversalQuantifier(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  const info = extractQuantifierInfo(tokens, 'FORALL');
  if (!info || !info.varName) return null;

  const bodyExpr = parseClause(info.remainingTokens, { ...context, defaultVar: info.varName });
  if (!bodyExpr) return null;

  return {
    expr: {
      kind: 'quantifier',
      q: 'forall',
      var: info.varName,
      domain: info.domain || undefined,
      body: bodyExpr.expr,
    },
    remainingTokens: bodyExpr.remainingTokens,
  };
}

/**
 * Parse an existential quantifier using semantic pattern matching
 */
export function parseExistentialQuantifier(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  const info = extractQuantifierInfo(tokens, 'EXISTS');
  if (!info || !info.varName) return null;

  const bodyExpr = parseClause(info.remainingTokens, { ...context, defaultVar: info.varName });
  if (!bodyExpr) return null;

  return {
    expr: {
      kind: 'quantifier',
      q: 'exists',
      var: info.varName,
      domain: info.domain || undefined,
      body: bodyExpr.expr,
    },
    remainingTokens: bodyExpr.remainingTokens,
  };
}

/**
 * Parse a relation expression
 * Priority: relations before other operators
 */
export function parseRelationExpr(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  // context reserved for future use (e.g., default variable), currently unused
  void context;
  if (tokens.length < 3) return null;

  const relOps = ['<', '>', '≤', '≥', '=', '≠', '∈', '∉'];
  const domainSymbols = ['ℝ', 'ℤ', 'ℚ', 'ℕ', 'ℂ'];

  // Look for relation operator
  for (let i = 1; i < tokens.length - 1; i++) {
    const token = tokens[i]!;

    if (relOps.includes(token)) {
      const leftTokens = tokens.slice(0, i);
      const rightTokens = tokens.slice(i + 1);

      const leftTerm = parseTerm(tokensToStrings(leftTokens));
      if (!leftTerm) continue;

      // For membership, right can be domain
      if ((token === '∈' || token === '∉') && rightTokens.length === 1 && domainSymbols.includes(rightTokens[0]!)) {
        const rightTerm: Term = { kind: 'var', name: rightTokens[0]! };
        return {
          expr: {
            kind: 'relation',
            op: token as any,
            left: leftTerm,
            right: rightTerm,
          },
          remainingTokens: [],
        };
      }

      const rightTerm = parseTerm(tokensToStrings(rightTokens));
      if (rightTerm) {
        return {
          expr: {
            kind: 'relation',
            op: token as any,
            left: leftTerm,
            right: rightTerm,
          },
          remainingTokens: [],
        };
      }
    }

    // Check for relation phrases (already normalized to operators in normalize.ts)
    // But handle multi-word patterns that might not be normalized
    if (token === 'less' && i + 1 < tokens.length && tokens[i + 1] === 'than') {
      const leftTokens = tokens.slice(0, i);
      const rightTokens = tokens.slice(i + 2);
      const leftTerm = parseTerm(tokensToStrings(leftTokens));
      const rightTerm = parseTerm(tokensToStrings(rightTokens));
      if (leftTerm && rightTerm) {
        return {
          expr: {
            kind: 'relation',
            op: '<',
            left: leftTerm,
            right: rightTerm,
          },
          remainingTokens: [],
        };
      }
    }
  }

  return null;
}

/**
 * Parse sufficient/necessary conditions
 */
export function parseConditionExpr(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  const defaultVar = context.defaultVar || 'x';

  // Find SUFFICIENT or NECESSARY
  const suffIndex = tokens.indexOf('SUFFICIENT');
  const necIndex = tokens.indexOf('NECESSARY');
  const necSuffIndex = tokens.indexOf('NECSUFF');

  if (necSuffIndex !== -1) {
    // A NECSUFF B → A ↔ B
    const leftTokens = tokens.slice(0, necSuffIndex);
    const rightTokens = tokens.slice(necSuffIndex + 1);

    const leftExpr = parseClause(leftTokens, context);
    const rightExpr = parseClause(rightTokens, context);
    if (!leftExpr || !rightExpr) return null;

    return {
      expr: {
        kind: 'quantifier',
        q: 'forall',
        var: defaultVar,
        body: {
          kind: 'binary',
          op: 'iff',
          left: leftExpr.expr,
          right: rightExpr.expr,
        },
      },
      remainingTokens: [],
    };
  }

  if (suffIndex !== -1 && suffIndex > 0) {
    // A SUFFICIENT B → ∀x (A(x) → B(x))
    const leftTokens = tokens.slice(0, suffIndex);
    const rightTokens = tokens.slice(suffIndex + 1);

    const leftExpr = parseClause(leftTokens, context);
    const rightExpr = parseClause(rightTokens, context);
    if (!leftExpr || !rightExpr) return null;

    return {
      expr: {
        kind: 'quantifier',
        q: 'forall',
        var: defaultVar,
        body: {
          kind: 'binary',
          op: 'impl',
          left: leftExpr.expr,
          right: rightExpr.expr,
        },
      },
      remainingTokens: [],
    };
  }

  if (necIndex !== -1 && necIndex > 0) {
    // A NECESSARY B → ∀x (B(x) → A(x)) (reversed!)
    const leftTokens = tokens.slice(0, necIndex);
    const rightTokens = tokens.slice(necIndex + 1);

    const leftExpr = parseClause(leftTokens, context);
    const rightExpr = parseClause(rightTokens, context);
    if (!leftExpr || !rightExpr) return null;

    return {
      expr: {
        kind: 'quantifier',
        q: 'forall',
        var: defaultVar,
        body: {
          kind: 'binary',
          op: 'impl',
          left: rightExpr.expr, // Reversed!
          right: leftExpr.expr,
        },
      },
      remainingTokens: [],
    };
  }

  return null;
}

/**
 * Parse conditional expressions (IF...THEN, ONLYIF, etc.)
 */
export function parseConditionalExpr(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  // IFF (if and only if)
  const iffIndex = tokens.indexOf('IFF');
  if (iffIndex !== -1 && iffIndex > 0 && iffIndex < tokens.length - 1) {
    const left = tokens.slice(0, iffIndex);
    const right = tokens.slice(iffIndex + 1);
    const leftExpr = parseClause(left, context);
    const rightExpr = parseClause(right, context);
    if (leftExpr && rightExpr) {
      return {
        expr: {
          kind: 'binary',
          op: 'iff',
          left: leftExpr.expr,
          right: rightExpr.expr,
        },
        remainingTokens: [],
      };
    }
  }

  // ONLYIF: A ONLYIF B → A → B
  const onlyIfIndex = tokens.indexOf('ONLYIF');
  if (onlyIfIndex !== -1 && onlyIfIndex > 0 && onlyIfIndex < tokens.length - 1) {
    const left = tokens.slice(0, onlyIfIndex);
    const right = tokens.slice(onlyIfIndex + 1);
    const leftExpr = parseClause(left, context);
    const rightExpr = parseClause(right, context);
    if (leftExpr && rightExpr) {
      return {
        expr: {
          kind: 'binary',
          op: 'impl',
          left: leftExpr.expr,
          right: rightExpr.expr,
        },
        remainingTokens: [],
      };
    }
  }

  // IF...THEN: IF A THEN B → A → B
  const ifIndex = tokens.indexOf('IF');
  if (ifIndex !== -1) {
    const thenIndex = tokens.indexOf('THEN', ifIndex);
    if (thenIndex !== -1) {
      const left = tokens.slice(ifIndex + 1, thenIndex);
      const right = tokens.slice(thenIndex + 1);
      const leftExpr = parseClause(left, context);
      const rightExpr = parseClause(right, context);
      if (leftExpr && rightExpr) {
        return {
          expr: {
            kind: 'binary',
            op: 'impl',
            left: leftExpr.expr,
            right: rightExpr.expr,
          },
          remainingTokens: [],
        };
      }
    }
  }

  // IF (without THEN): A IF B → B → A (reversed!)
  if (ifIndex !== -1 && ifIndex > 0 && tokens.indexOf('THEN') === -1) {
    const left = tokens.slice(0, ifIndex);
    const right = tokens.slice(ifIndex + 1);
    const leftExpr = parseClause(left, context);
    const rightExpr = parseClause(right, context);
    if (leftExpr && rightExpr) {
      return {
        expr: {
          kind: 'binary',
          op: 'impl',
          left: rightExpr.expr, // Reversed!
          right: leftExpr.expr,
        },
        remainingTokens: [],
      };
    }
  }

  return null;
}

/**
 * Parse binary operators with precedence
 * Precedence: IFF < IMP < OR < AND
 */
export function parseBinaryOperators(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  // Try OR (lower precedence than AND)
  const orIndex = tokens.indexOf('OR');
  if (orIndex !== -1 && orIndex > 0 && orIndex < tokens.length - 1) {
    const left = tokens.slice(0, orIndex);
    const right = tokens.slice(orIndex + 1);
    const leftExpr = parseClause(left, context);
    const rightExpr = parseClause(right, context);
    if (leftExpr && rightExpr) {
      return {
        expr: {
          kind: 'binary',
          op: 'or',
          left: leftExpr.expr,
          right: rightExpr.expr,
        },
        remainingTokens: [],
      };
    }
  }

  // Try AND (higher precedence)
  const andIndex = tokens.indexOf('AND');
  if (andIndex !== -1 && andIndex > 0 && andIndex < tokens.length - 1) {
    const left = tokens.slice(0, andIndex);
    const right = tokens.slice(andIndex + 1);
    const leftExpr = parseClause(left, context);
    const rightExpr = parseClause(right, context);
    if (leftExpr && rightExpr) {
      return {
        expr: {
          kind: 'binary',
          op: 'and',
          left: leftExpr.expr,
          right: rightExpr.expr,
        },
        remainingTokens: [],
      };
    }
  }

  return null;
}

/**
 * Parse negation
 */
export function parseNegation(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  if (tokens.length === 0 || tokens[0] !== 'NOT') {
    return null;
  }

  const bodyExpr = parseClause(tokens.slice(1), context);
  if (!bodyExpr) return null;

  return {
    expr: {
      kind: 'negation',
      body: bodyExpr.expr,
    },
    remainingTokens: bodyExpr.remainingTokens,
  };
}

/**
 * Parse a predicate from tokens
 * Handles: "is <adjective>", "has <noun>", "<verb>", or simple noun phrases
 */
export function parsePredicate(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  if (tokens.length === 0) return null;

  const defaultVar = context.defaultVar || 'x';

  // Pattern: "is <adjective>" → Adjective(var)
  if (tokens[0] === 'is' && tokens.length > 1) {
    const adjective = tokens.slice(1).join(' ');
    const predicateName = getPredicateForPhrase(adjective);
    return {
      expr: {
        kind: 'predicate',
        name: predicateName,
        args: [defaultVar],
      },
      remainingTokens: [],
    };
  }

  // Pattern: "has <noun>" → HasNoun(var)
  if (tokens[0] === 'has' && tokens.length > 1) {
    const noun = tokens.slice(1).join(' ');
    const nounPred = getPredicateForPhrase(noun);
    const predicateName = 'Has' + nounPred;
    return {
      expr: {
        kind: 'predicate',
        name: predicateName,
        args: [defaultVar],
      },
      remainingTokens: [],
    };
  }

  // Pattern: simple noun phrase → PredicateName(var)
  // Join all tokens as a phrase
  const phrase = tokens.join(' ');
  const predicateName = getPredicateForPhrase(phrase);
  return {
    expr: {
      kind: 'predicate',
      name: predicateName,
      args: [defaultVar],
    },
    remainingTokens: [],
  };
}

/**
 * Main clause parser with priority-based parsing
 * Priority:
 * 1. Quantifiers
 * 2. Relations
 * 3. Conditions (sufficient/necessary)
 * 4. Conditionals (IF...THEN, etc.)
 * 5. Binary operators (OR, AND)
 * 6. Negation
 * 7. Predicates (fallback)
 */
export function parseClause(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  if (tokens.length === 0) {
    return null;
  }

  // 1. Try quantifiers first
  const forallExpr = parseUniversalQuantifier(tokens, context);
  if (forallExpr) return forallExpr;

  const existsExpr = parseExistentialQuantifier(tokens, context);
  if (existsExpr) return existsExpr;

  // 2. Try relations
  const relExpr = parseRelationExpr(tokens, context);
  if (relExpr) return relExpr;

  // 3. Try conditions (sufficient/necessary)
  const condExpr = parseConditionExpr(tokens, context);
  if (condExpr) return condExpr;

  // 4. Try conditionals
  const conditionalExpr = parseConditionalExpr(tokens, context);
  if (conditionalExpr) return conditionalExpr;

  // 5. Try binary operators
  const binaryExpr = parseBinaryOperators(tokens, context);
  if (binaryExpr) return binaryExpr;

  // 6. Try negation
  const negExpr = parseNegation(tokens, context);
  if (negExpr) return negExpr;

  // 7. Fallback to predicate
  const predExpr = parsePredicate(tokens, context);
  if (predExpr) return predExpr;

  // If nothing matched, return null (caller should show error)
  // Provide helpful error message
  const tokenStr = tokens.join(' ');
  throw new Error(
    `Could not parse clause: "${tokenStr}". ` +
    `Try expressing it as: a quantifier (FORALL/EXISTS), a relation (<, >, =, etc.), ` +
    `a conditional (IF...THEN), or a predicate.`
  );
}
