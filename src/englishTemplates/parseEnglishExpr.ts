/**
 * Semantic pattern matching for English → Logic conversion.
 * Uses flexible pattern matching instead of exact templates.
 */

import type { Expr, Term, Domain } from '../parser/Ast';
import type { NormalizedToken } from './normalize';
import { normalizeDomain, getPredicateForPhrase } from './dataset';
import { parseTerm } from './astFromEnglish';

/**
 * Helper to convert NormalizedToken[] to string[] for parseTerm.
 * We simply project to the underlying token values.
 */
function tokensToStrings(tokens: NormalizedToken[]): string[] {
  return tokens.map((t) => t.value);
}

export interface ParseContext {
  defaultVar?: string;
}

interface QuantifierHeader {
  q: 'forall' | 'exists';
  varName: string;
  domain: Domain | null;
  nextIndex: number;
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

  // Check if first token is the quantifier KW
  const first = tokens[0]!;
  if (!(first.kind === 'KW' && first.value === quantifierType)) return null;

  let i = 1;
  let domain: Domain | null = null;
  let varName: string | null = null;

  // Skip optional leading articles after quantifier
  while (
    i < tokens.length &&
    tokens[i]!.kind === 'ID' &&
    ['a', 'an', 'the'].includes(tokens[i]!.value.toLowerCase())
  ) {
    i++;
  }

  // Try to find domain phrase: "real numbers", "integers", etc.
  let domainEnd = i;
  
  // Try to match known domain phrases (1-3 words) made of IDs
  for (let len = 1; len <= 3 && i + len <= tokens.length; len++) {
    const slice = tokens.slice(i, i + len);
    if (!slice.every((t) => t.kind === 'ID')) continue;
    const phrase = slice.map((t) => t.value).join(' ');
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
    while (
      i < tokens.length &&
      tokens[i]!.kind === 'ID' &&
      ['a', 'an', 'the'].includes(tokens[i]!.value.toLowerCase())
    ) {
      i++;
    }
  }

  // Next token should be the variable name (identifier, not reserved KW)
  if (i < tokens.length) {
    const varToken = tokens[i]!;
    if (varToken.kind === 'ID' && !isReservedToken(varToken)) {
      varName = varToken.value;
      i++;
    }
  }

  // Support trailing domain syntax: "for every n in N"
  if (
    i < tokens.length &&
    tokens[i]!.kind === 'ID' &&
    tokens[i]!.value.toLowerCase() === 'in'
  ) {
    let j = i + 1;
    let tailDomain: Domain | null = null;
    let tailEnd = j;

    // Try to match known domain phrases (1-3 words) after "in"
    for (let len = 1; len <= 3 && j + len <= tokens.length; len++) {
      const slice = tokens.slice(j, j + len);
      if (!slice.every((t) => t.kind === 'ID')) continue;
      const phrase = slice.map((t) => t.value).join(' ');
      const domainSymbol = normalizeDomain(phrase);
      if (domainSymbol) {
        tailDomain = { kind: 'domain', name: domainSymbol };
        tailEnd = j + len;
        break;
      }
    }

    if (tailDomain) {
      domain = tailDomain;
      i = tailEnd;
    }
  }

  // If we still have no variable name, allow fallback "x" only when truly absent
  if (!varName) {
    varName = 'x';
  }

  // Skip optional SUCHTHAT
  if (
    i < tokens.length &&
    tokens[i]!.kind === 'KW' &&
    tokens[i]!.value === 'SUCHTHAT'
  ) {
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
function isReservedToken(token: NormalizedToken): boolean {
  const reserved = [
    'FORALL', 'EXISTS', 'SUCHTHAT', 'AND', 'OR', 'NOT', 'IF', 'THEN',
    'ONLYIF', 'IFF', 'UNLESS', 'SUFFICIENT', 'NECESSARY', 'NECSUFF',
    '<', '>', '≤', '≥', '=', '≠', '∈', '∉',
  ];
  return token.kind === 'KW' && reserved.includes(token.value);
}

/**
 * Parse a single quantifier header starting at index i.
 * Supports:
 * - FORALL [domainPhrase] ID
 * - EXISTS [determiner?] [domainPhrase] ID
 */
function parseQuantifierHeader(tokens: NormalizedToken[], i: number): QuantifierHeader | null {
  if (i >= tokens.length) return null;
  const first = tokens[i]!;

  if (!(first.kind === 'KW' && (first.value === 'FORALL' || first.value === 'EXISTS'))) {
    return null;
  }

  const isForall = first.value === 'FORALL';
  let j = i + 1;

  // EXISTS may optionally have a determiner before the domain phrase
  if (!isForall) {
    while (
      j < tokens.length &&
      tokens[j]!.kind === 'ID' &&
      ['a', 'an', 'the', 'some'].includes(tokens[j]!.value.toLowerCase())
    ) {
      j++;
    }
  }

  let domain: Domain | null = null;
  let domainEnd = j;

  // Try to match known domain phrases (1-3 words)
  for (let len = 1; len <= 3 && j + len <= tokens.length; len++) {
    const slice = tokens.slice(j, j + len);
    if (!slice.every((t) => t.kind === 'ID')) continue;
    const phrase = slice.map((t) => t.value).join(' ');
    const domainSymbol = normalizeDomain(phrase);
    if (domainSymbol) {
      domain = { kind: 'domain', name: domainSymbol };
      domainEnd = j + len;
      break;
    }
  }

  j = domainEnd;

  // Next token must be the variable name (identifier)
  if (j >= tokens.length || tokens[j]!.kind !== 'ID') {
    throw new Error('Missing variable after domain');
  }

  const varName = tokens[j]!.value;
  j++;

  return {
    q: isForall ? 'forall' : 'exists',
    varName,
    domain,
    nextIndex: j,
  };
}

/**
 * Parse a chain of quantifier headers followed by a body clause.
 * Example: FORALL ℝ x , EXISTS ℝ y SUCHTHAT x < y
 * Builds nested quantifiers Q1(Q2(body)).
 */
export function parseQuantifierChain(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  if (tokens.length === 0) return null;

  const suchThatIndex = tokens.findIndex(
    (t) => t.kind === 'KW' && t.value === 'SUCHTHAT'
  );

  let bodyStart = -1;
  let headerEnd = -1;

  if (suchThatIndex !== -1) {
    // Headers end right before "SUCHTHAT"
    headerEnd = suchThatIndex;
    bodyStart = suchThatIndex + 1;
  } else {
    // No SUCHTHAT marker – try comma as separator between headers and body
    const lastCommaIndex = (() => {
      let idx = -1;
      for (let k = 0; k < tokens.length; k++) {
        const t = tokens[k]!;
        if (t.kind === 'KW' && t.value === ',') {
          idx = k;
        }
      }
      return idx;
    })();
    if (lastCommaIndex !== -1) {
      headerEnd = lastCommaIndex;
      bodyStart = lastCommaIndex + 1;
    }
  }

  if (bodyStart === -1 || headerEnd === -1) {
    // No SUCHTHAT or comma – let other parsers handle it
    return null;
  }

  const headerTokens = tokens.slice(0, headerEnd);
  const bodyTokens = tokens.slice(bodyStart);

  // Parse headers left-to-right
  const headers: QuantifierHeader[] = [];
  let i = 0;
  while (i < headerTokens.length) {
    const t = headerTokens[i]!;
    // Skip commas between headers
    if (t.kind === 'KW' && t.value === ',') {
      i++;
      continue;
    }

    const header = parseQuantifierHeader(headerTokens, i);
    if (!header) break;
    headers.push(header);
    i = header.nextIndex;
  }

  if (headers.length === 0) {
    return null;
  }

  // Any leftover non-comma tokens in header section are an error
  for (; i < headerTokens.length; i++) {
    const t = headerTokens[i]!;
    if (!(t.kind === 'KW' && t.value === ',')) {
      const tokenStr = headerTokens.map((u) => u.value).join(' ');
      throw new Error(
        `Could not parse quantifier headers near "${tokenStr}". ` +
          `Make sure each quantifier has the form "for all ..." or "there exists ...".`
      );
    }
  }

  if (bodyTokens.length === 0) {
    throw new Error("Missing body after 'such that' or comma");
  }

  // Parse the body clause with the innermost quantifier variable as default
  const innerContext: ParseContext = {
    defaultVar: headers[headers.length - 1]!.varName,
    ...context,
  };
  const bodyRes = parseClause(bodyTokens, innerContext);
  if (!bodyRes) {
    const tokenStr = bodyTokens.map((t) => t.value).join(' ');
    throw new Error(
      `Missing or invalid body after quantifiers near "${tokenStr}".`
    );
  }

  let expr: Expr = bodyRes.expr;
  // Wrap body with quantifiers from last to first
  for (let h = headers.length - 1; h >= 0; h--) {
    const header = headers[h]!;
    expr = {
      kind: 'quantifier',
      q: header.q,
      var: header.varName,
      domain: header.domain || undefined,
      body: expr,
    };
  }

  return {
    expr,
    remainingTokens: bodyRes.remainingTokens,
  };
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

    if (token.kind === 'OP' && relOps.includes(token.value)) {
      const leftTokens = tokens.slice(0, i);
      const rightTokens = tokens.slice(i + 1);

      const leftTerm = parseTerm(tokensToStrings(leftTokens));
      if (!leftTerm) continue;

      // For membership, right can be domain
      if (
        (token.value === '∈' || token.value === '∉') &&
        rightTokens.length === 1 &&
        rightTokens[0]!.kind === 'ID' &&
        domainSymbols.includes(rightTokens[0]!.value)
      ) {
        const rightTerm: Term = { kind: 'var', name: rightTokens[0]!.value };
        return {
          expr: {
            kind: 'relation',
            op: token.value as any,
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
            op: token.value as any,
            left: leftTerm,
            right: rightTerm,
          },
          remainingTokens: [],
        };
      }
    }

    // Check for relation phrases (handle cases that were not normalized to OP)
    if (
      token.kind === 'ID' &&
      token.value.toLowerCase() === 'less' &&
      i + 1 < tokens.length &&
      tokens[i + 1]!.kind === 'ID' &&
      tokens[i + 1]!.value.toLowerCase() === 'than'
    ) {
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
function findKwIndex(tokens: NormalizedToken[], value: string): number {
  return tokens.findIndex((t) => t.kind === 'KW' && t.value === value);
}

export function parseConditionExpr(
  tokens: NormalizedToken[],
  context: ParseContext = {}
): { expr: Expr; remainingTokens: NormalizedToken[] } | null {
  const defaultVar = context.defaultVar || 'x';

  // Find SUFFICIENT or NECESSARY
  const suffIndex = findKwIndex(tokens, 'SUFFICIENT');
  const necIndex = findKwIndex(tokens, 'NECESSARY');
  const necSuffIndex = findKwIndex(tokens, 'NECSUFF');

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
  const iffIndex = findKwIndex(tokens, 'IFF');
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
  const onlyIfIndex = findKwIndex(tokens, 'ONLYIF');
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
  const ifIndex = findKwIndex(tokens, 'IF');
  if (ifIndex !== -1) {
    const thenIndex = tokens.findIndex(
      (t, idx) => idx > ifIndex && t.kind === 'KW' && t.value === 'THEN'
    );
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
  if (
    ifIndex !== -1 &&
    ifIndex > 0 &&
    tokens.findIndex((t) => t.kind === 'KW' && t.value === 'THEN') === -1
  ) {
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
  const orIndex = findKwIndex(tokens, 'OR');
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
  const andIndex = findKwIndex(tokens, 'AND');
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
  if (
    tokens.length === 0 ||
    !(tokens[0]!.kind === 'KW' && tokens[0]!.value === 'NOT')
  ) {
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
  if (
    tokens[0]!.kind === 'ID' &&
    tokens[0]!.value.toLowerCase() === 'is' &&
    tokens.length > 1
  ) {
    const adjective = tokens
      .slice(1)
      .map((t) => t.value)
      .join(' ');
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
  if (
    tokens[0]!.kind === 'ID' &&
    tokens[0]!.value.toLowerCase() === 'has' &&
    tokens.length > 1
  ) {
    const noun = tokens
      .slice(1)
      .map((t) => t.value)
      .join(' ');
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
  const phrase = tokens.map((t) => t.value).join(' ');
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

  // 1. Try multi-quantifier chains first (handles FORALL... EXISTS... SUCHTHAT ...)
  const chainExpr = parseQuantifierChain(tokens, context);
  if (chainExpr) return chainExpr;

  // 2. Try single quantifiers
  const forallExpr = parseUniversalQuantifier(tokens, context);
  if (forallExpr) return forallExpr;

  const existsExpr = parseExistentialQuantifier(tokens, context);
  if (existsExpr) return existsExpr;

  // If quantifier keywords are present but we couldn't parse a quantifier,
  // treat this as an error instead of silently dropping them.
  const hasQuantifierKw = tokens.some(
    (t) => t.kind === 'KW' && (t.value === 'FORALL' || t.value === 'EXISTS')
  );
  if (hasQuantifierKw) {
    const tokenStr = tokens.map((t) => t.value).join(' ');
    throw new Error(
      `Could not parse quantifier phrase near "${tokenStr}". ` +
        `Make sure each quantified variable has a clear domain and name.`
    );
  }

  // 3. Try relations
  const relExpr = parseRelationExpr(tokens, context);
  if (relExpr) return relExpr;

  // 4. Try conditions (sufficient/necessary)
  const condExpr = parseConditionExpr(tokens, context);
  if (condExpr) return condExpr;

  // 5. Try conditionals
  const conditionalExpr = parseConditionalExpr(tokens, context);
  if (conditionalExpr) return conditionalExpr;

  // 6. Try binary operators
  const binaryExpr = parseBinaryOperators(tokens, context);
  if (binaryExpr) return binaryExpr;

  // 7. Try negation
  const negExpr = parseNegation(tokens, context);
  if (negExpr) return negExpr;

  // 8. Fallback to predicate
  const predExpr = parsePredicate(tokens, context);
  if (predExpr) return predExpr;

  // If nothing matched, return null (caller should show error)
  // Provide helpful error message
  const tokenStr = tokens.map((t) => t.value).join(' ');
  throw new Error(
    `Could not parse clause: "${tokenStr}". ` +
    `Try expressing it as: a quantifier (FORALL/EXISTS), a relation (<, >, =, etc.), ` +
    `a conditional (IF...THEN), or a predicate.`
  );
}
