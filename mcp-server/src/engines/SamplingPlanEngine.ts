/**
 * SamplingPlanEngine — MIL-STD-1916 and AOQL acceptance sampling plans
 *
 * Phase 0.22 U-SPC8. Resolves the sample size (n) and acceptance number (c)
 * for attributes inspection, plus operating-characteristic (OC) and
 * average-outgoing-quality (AOQ) curves used to reason about risk.
 *
 * Implements:
 *
 *   1. MIL-STD-1916 attributes table (Verification Levels I-VII) —
 *      the DoD replacement for MIL-STD-105E (1996). Plans are strictly
 *      c = 0 (zero-acceptance); n depends on lot size and VL. Source:
 *      U.S. DoD MIL-STD-1916 (1996), Tables I–III.
 *   2. AOQL plans derived from the binomial OC function:
 *
 *        P(accept | p) = Σ_{k=0..c} C(n, k) · p^k · (1−p)^{n−k}
 *
 *      AOQ(p) = p · P(accept | p) · (N − n) / N
 *      AOQL   = max_p AOQ(p) (searched over p ∈ (0, 1))
 *
 *   3. OC curve evaluation and producer/consumer risk points
 *      (AQL at α = 0.05, LTPD at β = 0.10 by convention).
 *
 * References: Schilling & Neubauer, Acceptance Sampling in Quality Control
 * (2nd ed., 2009); Montgomery, Statistical Quality Control (8th ed., 2020).
 *
 * @module engines/SamplingPlanEngine
 * @milestone PP-0.22-U-SPC8
 */

import { z } from "zod";

export const VerificationLevelSchema = z.enum([
  "T",
  "VII",
  "VI",
  "V",
  "IV",
  "III",
  "II",
  "I",
]);
export type VerificationLevel = z.infer<typeof VerificationLevelSchema>;

export const Mil1916RequestSchema = z.object({
  lotSize: z.number().int().positive(),
  verificationLevel: VerificationLevelSchema,
  inspectionType: z.enum(["normal", "tightened", "reduced"]).default("normal"),
});
export type Mil1916Request = z.infer<typeof Mil1916RequestSchema>;

export interface Mil1916Plan {
  lotSize: number;
  codeLetter: string;
  verificationLevel: VerificationLevel;
  inspectionType: "normal" | "tightened" | "reduced";
  sampleSize: number;
  acceptanceNumber: 0; // MIL-STD-1916 is c=0
  note: string;
}

export const AoqlRequestSchema = z.object({
  lotSize: z.number().int().positive(),
  /** AOQL expressed as a fraction (0.01 = 1%). Values 0.0001–0.10 typical. */
  aoql: z.number().positive().lt(0.5),
  /** Search resolution for sample size; default auto-scales with lot size. */
  maxSample: z.number().int().positive().optional(),
});
export type AoqlRequest = z.infer<typeof AoqlRequestSchema>;

export interface AoqlPlan {
  lotSize: number;
  sampleSize: number;
  acceptanceNumber: number;
  targetAoql: number;
  achievedAoql: number;
  worstCaseFraction: number;
}

export interface OCCurvePoint {
  fractionDefective: number;
  probabilityAccept: number;
  aoq: number;
}

export interface OCCurve {
  plan: { sampleSize: number; acceptanceNumber: number; lotSize: number };
  points: OCCurvePoint[];
  aql: { fractionDefective: number; probabilityAccept: number } | null;
  ltpd: { fractionDefective: number; probabilityAccept: number } | null;
  aoql: { fractionDefective: number; aoq: number };
}

// MIL-STD-1916 code letters by lot-size range (Table I). The boundaries are
// exclusive of the lower edge and inclusive of the upper edge, matching the
// published table.
const CODE_LETTER_TABLE: ReadonlyArray<[number, number, string]> = [
  [1, 170, "A"],
  [171, 288, "B"],
  [289, 544, "C"],
  [545, 960, "D"],
  [961, 1632, "E"],
  [1633, 3072, "F"],
  [3073, 5440, "G"],
  [5441, 9216, "H"],
  [9217, 17408, "I"],
  [17409, 30720, "J"],
  [30721, Number.POSITIVE_INFINITY, "K"],
];

// MIL-STD-1916 Table II — normal inspection (c = 0). Columns are VL T–I.
// Rows are code letters A–K. Values are sample sizes; "*" in the spec
// (entire lot) is encoded as Number.POSITIVE_INFINITY and surfaces as an
// instruction in the plan note.
const SAMPLE_SIZE_TABLE: Record<string, Record<VerificationLevel, number>> = {
  A: { T: Infinity, VII: 512, VI: 192, V: 80, IV: 32, III: 12, II: 5, I: 3 },
  B: { T: Infinity, VII: 512, VI: 192, V: 80, IV: 32, III: 12, II: 5, I: 3 },
  C: { T: 3072, VII: 512, VI: 192, V: 80, IV: 32, III: 12, II: 5, I: 3 },
  D: { T: 3072, VII: 512, VI: 192, V: 80, IV: 32, III: 12, II: 5, I: 4 },
  E: { T: 3072, VII: 512, VI: 192, V: 80, IV: 32, III: 13, II: 7, I: 5 },
  F: { T: 3072, VII: 512, VI: 192, V: 80, IV: 34, III: 15, II: 9, I: 6 },
  G: { T: 3072, VII: 512, VI: 192, V: 84, IV: 36, III: 17, II: 11, I: 7 },
  H: { T: 3072, VII: 512, VI: 199, V: 91, IV: 40, III: 19, II: 13, I: 8 },
  I: { T: 3072, VII: 531, VI: 215, V: 100, IV: 45, III: 21, II: 15, I: 9 },
  J: { T: 3072, VII: 562, VI: 231, V: 109, IV: 49, III: 24, II: 17, I: 10 },
  K: { T: 3072, VII: 598, VI: 251, V: 120, IV: 54, III: 27, II: 19, I: 11 },
};

export class SamplingPlanEngine {
  /** Look up a MIL-STD-1916 attributes plan. */
  static mil1916(request: Mil1916Request): Mil1916Plan {
    const parsed = Mil1916RequestSchema.parse(request);
    const code = SamplingPlanEngine.codeLetter(parsed.lotSize);
    let level = parsed.verificationLevel;

    // Tightened → one level tighter (VII is tightest after T; T stays T)
    // Reduced → one level looser (I stays I)
    if (parsed.inspectionType === "tightened") level = tighten(level);
    if (parsed.inspectionType === "reduced") level = loosen(level);

    const sampleSize = SAMPLE_SIZE_TABLE[code][level];
    const note =
      sampleSize === Infinity
        ? "MIL-STD-1916 directs 100% inspection for this lot-size / VL combination."
        : `MIL-STD-1916 ${parsed.inspectionType} inspection, code ${code}, VL ${level}, c=0.`;

    return {
      lotSize: parsed.lotSize,
      codeLetter: code,
      verificationLevel: level,
      inspectionType: parsed.inspectionType,
      sampleSize: sampleSize === Infinity ? parsed.lotSize : sampleSize,
      acceptanceNumber: 0,
      note,
    };
  }

  /** Derive a (n, c) plan that achieves a target AOQL for a given lot size. */
  static aoqlPlan(request: AoqlRequest): AoqlPlan {
    const parsed = AoqlRequestSchema.parse(request);
    const maxSample = parsed.maxSample ?? Math.min(parsed.lotSize, 2000);
    const target = parsed.aoql;

    let best: AoqlPlan | null = null;
    for (let n = 5; n <= maxSample; n += 1) {
      const cMax = Math.min(n, 10);
      for (let c = 0; c <= cMax; c += 1) {
        const { aoql, fractionAtMax } = computeAoql(n, c, parsed.lotSize);
        if (aoql <= target) {
          const plan: AoqlPlan = {
            lotSize: parsed.lotSize,
            sampleSize: n,
            acceptanceNumber: c,
            targetAoql: target,
            achievedAoql: round6(aoql),
            worstCaseFraction: round6(fractionAtMax),
          };
          if (!best || plan.sampleSize < best.sampleSize) best = plan;
          break; // smaller n with this c no longer works once aoql fits
        }
      }
      if (best && best.sampleSize <= n) break;
    }

    if (!best) {
      throw new Error(
        `could not find a plan meeting AOQL=${target} within sample≤${maxSample}; ` +
          `consider increasing maxSample or loosening AOQL.`,
      );
    }
    return best;
  }

  /** Compute OC + AOQ curves for an existing (n, c) plan. */
  static ocCurve(
    sampleSize: number,
    acceptanceNumber: number,
    lotSize: number,
    resolution = 51,
  ): OCCurve {
    if (!(sampleSize > 0)) throw new Error("sampleSize must be > 0");
    if (!(acceptanceNumber >= 0)) throw new Error("acceptanceNumber must be ≥ 0");
    if (!(lotSize > 0)) throw new Error("lotSize must be > 0");
    if (!(resolution >= 5)) throw new Error("resolution must be ≥ 5");

    const points: OCCurvePoint[] = [];
    let aoqlPoint = { fractionDefective: 0, aoq: 0 };
    for (let i = 0; i < resolution; i += 1) {
      const p = i / (resolution - 1);
      const pa = binomialCdf(sampleSize, acceptanceNumber, p);
      const aoq = p * pa * ((lotSize - sampleSize) / lotSize);
      points.push({
        fractionDefective: round6(p),
        probabilityAccept: round6(pa),
        aoq: round6(aoq),
      });
      if (aoq > aoqlPoint.aoq) aoqlPoint = { fractionDefective: p, aoq };
    }

    const aql = findProbability(points, 0.95);
    const ltpd = findProbability(points, 0.1);

    return {
      plan: { sampleSize, acceptanceNumber, lotSize },
      points,
      aql,
      ltpd,
      aoql: { fractionDefective: round6(aoqlPoint.fractionDefective), aoq: round6(aoqlPoint.aoq) },
    };
  }

  /** Lot-size → MIL-STD-1916 code letter (A–K). */
  static codeLetter(lotSize: number): string {
    if (!(lotSize > 0)) throw new Error("lotSize must be > 0");
    for (const [lo, hi, letter] of CODE_LETTER_TABLE) {
      if (lotSize >= lo && lotSize <= hi) return letter;
    }
    return CODE_LETTER_TABLE[CODE_LETTER_TABLE.length - 1][2];
  }
}

function computeAoql(n: number, c: number, N: number): { aoql: number; fractionAtMax: number } {
  let maxAoq = 0;
  let fractionAtMax = 0;
  for (let step = 1; step < 200; step += 1) {
    const p = step / 200;
    const pa = binomialCdf(n, c, p);
    const aoq = p * pa * ((N - n) / N);
    if (aoq > maxAoq) {
      maxAoq = aoq;
      fractionAtMax = p;
    }
  }
  return { aoql: maxAoq, fractionAtMax };
}

function binomialCdf(n: number, c: number, p: number): number {
  if (p <= 0) return 1;
  if (p >= 1) return c >= n ? 1 : 0;
  // Stable recursion of binomial terms (Horner-like)
  let term = Math.pow(1 - p, n); // k=0 term
  let total = term;
  for (let k = 1; k <= c; k += 1) {
    term *= ((n - k + 1) / k) * (p / (1 - p));
    total += term;
  }
  return Math.min(1, Math.max(0, total));
}

function findProbability(
  points: readonly OCCurvePoint[],
  target: number,
): { fractionDefective: number; probabilityAccept: number } | null {
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    if (
      (prev.probabilityAccept - target) * (cur.probabilityAccept - target) <= 0 &&
      prev.probabilityAccept !== cur.probabilityAccept
    ) {
      const t =
        (target - prev.probabilityAccept) /
        (cur.probabilityAccept - prev.probabilityAccept);
      const p = prev.fractionDefective + t * (cur.fractionDefective - prev.fractionDefective);
      return { fractionDefective: round6(p), probabilityAccept: round6(target) };
    }
  }
  return null;
}

const LEVEL_ORDER: VerificationLevel[] = ["I", "II", "III", "IV", "V", "VI", "VII", "T"];

function tighten(level: VerificationLevel): VerificationLevel {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx < 0) return level;
  return LEVEL_ORDER[Math.min(LEVEL_ORDER.length - 1, idx + 1)];
}

function loosen(level: VerificationLevel): VerificationLevel {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx < 0) return level;
  return LEVEL_ORDER[Math.max(0, idx - 1)];
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export const samplingPlanEngine = SamplingPlanEngine;
