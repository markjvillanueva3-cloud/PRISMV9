/**
 * NoInlinePhysicsConstantsEngine — MS0/U-PPGM04.
 *
 * Static analyser that scans emitted CPS post source for hard-coded physics
 * constants that should come from the sidecar at runtime. The HARD BLOCK
 * for shop-floor emit; WARN for sim/proven_out. Without this hook, an
 * engineer can copy-paste a forked post that froze kc1_1=1800 from a year
 * ago, then PRISM recalibrates kc1_1 to 1850 from outcome data, and the
 * old post silently emits stale forces.
 *
 * Implementation: targeted regex against the canonical kc1_1 / Taylor C /
 * tool-modulus value set sourced from src/physics/constants.ts (no inlined
 * literals here either — we read the source of truth at scan time).
 *
 * False-positive control:
 *   Numeric literals are scored by context proximity to physics keywords
 *   (kc, kienzle, taylor, kc1_1, mc, modulus). High-confidence findings
 *   are those literally assigned to a physics-named variable; medium are
 *   bare literals in physics-keyworded blocks; low are bare literals with
 *   no physics keyword nearby (e.g. `var rpm = 1800` is LOW; ignored on
 *   shop_floor unless paired with a physics keyword).
 */

import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_TOOL_MODULUS,
} from "../physics/constants.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type Tier = "sim" | "proven_out" | "production" | "shop_floor";

export type Verdict = "PASS" | "WARN" | "HARD_BLOCK";

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type ConstantClass = "kienzle_kc1_1" | "taylor_C" | "tool_modulus";

export interface ScanFinding {
  /** 1-indexed line number where the literal was found. */
  line: number;
  /** 1-indexed column of the literal start. */
  column: number;
  /** The literal value detected. */
  value: number;
  /** Which canonical set this value matches. */
  constant_class: ConstantClass;
  /** Detected ISO group / tool material this value belongs to. */
  matched_key: string;
  /** Up to 60 chars of source preceding the literal — used to compute confidence. */
  context_prefix: string;
  /** Severity score. */
  confidence: Confidence;
  /** Human-readable reason. */
  reason: string;
}

export interface ScanResult {
  verdict: Verdict;
  tier: Tier;
  findings: ScanFinding[];
  /** Counts by confidence — useful for dashboards. */
  summary: { high: number; medium: number; low: number };
}

export interface ScanOptions {
  tier?: Tier;
}

// ============================================================================
// FORBIDDEN VALUES — sourced from canonical, not inlined
// ============================================================================

interface ForbiddenEntry {
  value: number;
  constant_class: ConstantClass;
  matched_key: string;
}

function buildForbiddenSet(): ForbiddenEntry[] {
  const out: ForbiddenEntry[] = [];
  for (const [iso, entry] of Object.entries(CANONICAL_KIENZLE)) {
    out.push({ value: entry.kc1_1, constant_class: "kienzle_kc1_1", matched_key: `ISO-${iso}` });
  }
  for (const [iso, entry] of Object.entries(CANONICAL_TAYLOR)) {
    out.push({ value: entry.C, constant_class: "taylor_C", matched_key: `ISO-${iso}` });
  }
  for (const [mat, modulus] of Object.entries(CANONICAL_TOOL_MODULUS)) {
    out.push({ value: modulus as number, constant_class: "tool_modulus", matched_key: mat });
  }
  return out;
}

// ============================================================================
// CONFIDENCE SCORING
// ============================================================================

const PHYSICS_KEYWORDS_BY_CLASS: Record<ConstantClass, RegExp> = {
  kienzle_kc1_1: /(kc1[_\s]?1|kc_?1_1|kc11|kienzle|kc_p|kc_specific|specific[_\s]?cutting|cutting[_\s]?coef)/i,
  taylor_C: /(taylor|taylor[_\s]?c|tool[_\s]?life|tlife_c|life[_\s]?coef)/i,
  tool_modulus: /(modulus|young|tool[_\s]?modulus|elastic[_\s]?modulus|e_carbide|e_hss|tool_e)/i,
};

const SIDECAR_USAGE_RE = /(sidecar|loadPhysicsSidecar|sidecar\.|physicsSidecar|getKienzleFrom|getTaylorFrom)/i;

function scoreConfidence(
  context_prefix: string,
  constant_class: ConstantClass,
): { confidence: Confidence; reason: string } {
  const kw = PHYSICS_KEYWORDS_BY_CLASS[constant_class];
  if (kw.test(context_prefix)) {
    if (SIDECAR_USAGE_RE.test(context_prefix)) {
      return {
        confidence: "LOW",
        reason: "physics keyword nearby but sidecar usage in same context (likely safe extraction)",
      };
    }
    return {
      confidence: "HIGH",
      reason: `physics keyword for ${constant_class} present within 60 chars before literal — almost certainly an inlined constant`,
    };
  }
  return {
    confidence: "LOW",
    reason: "no physics keyword in proximity — likely unrelated value (RPM/feed/depth/PSI coincidentally matching a canonical)",
  };
}

// ============================================================================
// COMMENT + STRING STRIPPER (line-aware)
// ============================================================================

/**
 * Replace comment and string-literal regions with spaces so context detection
 * doesn't trip on documentation / commented-out code. Preserves line numbers
 * and column offsets.
 */
function stripCommentsAndStrings(source: string): string {
  let out = "";
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    const nx = source[i + 1];
    // Line comment
    if (ch === "/" && nx === "/") {
      while (i < n && source[i] !== "\n") {
        out += source[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }
    // Block comment
    if (ch === "/" && nx === "*") {
      out += "  ";
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        out += source[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) { out += "  "; i += 2; }
      continue;
    }
    // String literal (covers ', ", `)
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += " ";
      i++;
      while (i < n && source[i] !== quote) {
        if (source[i] === "\\" && i + 1 < n) {
          out += "  ";
          i += 2;
          continue;
        }
        out += source[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) { out += " "; i++; }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

// ============================================================================
// LITERAL SCAN
// ============================================================================

/** Match a numeric literal not preceded by an identifier char (so kc1_1800 doesn't match 1800). */
const NUMERIC_LITERAL_RE = /(^|[^A-Za-z0-9_$])(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

const TIER_THRESHOLDS: Record<Tier, { hardBlockOn: Confidence[]; warnOn: Confidence[] }> = {
  sim: { hardBlockOn: [], warnOn: ["HIGH", "MEDIUM", "LOW"] },
  proven_out: { hardBlockOn: [], warnOn: ["HIGH", "MEDIUM"] },
  production: { hardBlockOn: ["HIGH"], warnOn: ["MEDIUM"] },
  shop_floor: { hardBlockOn: ["HIGH"], warnOn: ["MEDIUM"] },
};

function lineColForOffset(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < offset; i++) {
    if (source[i] === "\n") {
      line++;
      lastNl = i;
    }
  }
  return { line, column: offset - lastNl };
}

function valuesEqual(a: number, b: number): boolean {
  // Strict equality; floating-point comparisons against integer canonical
  // values like 1800, 350 are exact in IEEE 754.
  return a === b;
}

// ============================================================================
// ENGINE
// ============================================================================

export class NoInlinePhysicsConstantsEngine {
  /**
   * Scan a CPS post source string for inlined physics constants.
   * @param source — raw post text
   * @param options.tier — tier-aware verdict (defaults to shop_floor — fail closed)
   */
  static scan(source: string, options: ScanOptions = {}): ScanResult {
    const tier: Tier = options.tier ?? "shop_floor";
    if (typeof source !== "string") {
      throw new Error("NoInlinePhysicsConstants.scan: source must be a string");
    }

    const findings: ScanFinding[] = [];
    if (source.length === 0) {
      return { verdict: "PASS", tier, findings, summary: { high: 0, medium: 0, low: 0 } };
    }

    const stripped = stripCommentsAndStrings(source);
    const forbidden = buildForbiddenSet();
    const valueLookup = new Map<number, ForbiddenEntry[]>();
    for (const f of forbidden) {
      const arr = valueLookup.get(f.value) ?? [];
      arr.push(f);
      valueLookup.set(f.value, arr);
    }

    NUMERIC_LITERAL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = NUMERIC_LITERAL_RE.exec(stripped)) !== null) {
      const lead = m[1];
      const literal = m[2];
      const literalOffset = (m.index ?? 0) + lead.length;
      const value = parseFloat(literal);
      const matches = valueLookup.get(value);
      if (!matches) continue;

      const ctxStart = Math.max(0, literalOffset - 60);
      const context_prefix = stripped.slice(ctxStart, literalOffset);
      // Use ALL matching constant_classes when the same value belongs to several
      for (const candidate of matches) {
        const { confidence, reason } = scoreConfidence(context_prefix, candidate.constant_class);
        if (confidence === "LOW" && tier === "shop_floor") continue;
        if (confidence === "LOW" && (tier === "production" || tier === "proven_out")) continue;
        const { line, column } = lineColForOffset(source, literalOffset);
        findings.push({
          line, column, value,
          constant_class: candidate.constant_class,
          matched_key: candidate.matched_key,
          context_prefix,
          confidence, reason,
        });
      }
    }

    const summary = {
      high: findings.filter((f) => f.confidence === "HIGH").length,
      medium: findings.filter((f) => f.confidence === "MEDIUM").length,
      low: findings.filter((f) => f.confidence === "LOW").length,
    };

    const t = TIER_THRESHOLDS[tier];
    let verdict: Verdict = "PASS";
    if (findings.some((f) => t.hardBlockOn.includes(f.confidence))) verdict = "HARD_BLOCK";
    else if (findings.some((f) => t.warnOn.includes(f.confidence))) verdict = "WARN";

    return { verdict, tier, findings, summary };
  }

  /**
   * Scan + throw on HARD_BLOCK. Use this from build pipelines (post-emit gate).
   */
  static scanOrThrow(source: string, options: ScanOptions = {}): ScanResult {
    const result = NoInlinePhysicsConstantsEngine.scan(source, options);
    if (result.verdict === "HARD_BLOCK") {
      const top = result.findings.filter((f) => f.confidence === "HIGH").slice(0, 3);
      const summary = top
        .map((f) => `  L${f.line}: ${f.constant_class}=${f.value} (${f.matched_key}) — ${f.reason}`)
        .join("\n");
      throw new Error(
        `NoInlinePhysicsConstants HARD_BLOCK on tier=${result.tier}: ${result.summary.high} inlined constant(s) detected. Top findings:\n${summary}\nFix: load values from sidecar.kienzle/taylor/tool_modulus instead of inlining.`,
      );
    }
    return result;
  }
}

export const noInlinePhysicsConstantsEngine = NoInlinePhysicsConstantsEngine;
