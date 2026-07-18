/**
 * LatheLoRAKnowledgeFusionEngine — LATHE-LORA-MS0/U-LLR-FUSION
 *
 * L_fuse layer of the lathe self-improving-AI loop: given a query (operation +
 * material + ISO group) and N candidate cutting-parameter recommendations from
 * DIFFERENT sources (physics first-principles, a LoRA adapter, RAG-retrieved past
 * outcomes, tribal tips, operator overrides), fuse them into ONE best-estimate
 * parameter set AND surface where the sources materially disagree.
 *
 * Design doctrine:
 *   • R7 (surface conflicts, don't average them). Fusion DOES emit a confidence-
 *     weighted best estimate — that is its job — but it NEVER silently papers over a
 *     material disagreement. Any param whose source spread exceeds CONFLICT_SPREAD_RATIO
 *     is flagged in `conflicts[]` so a downstream safety gate / operator sees that the
 *     "fused" value is averaging a real fork, not a consensus.
 *   • Physics anchor (NEVER inline constants). The fused params are anchored against the
 *     canonical Kienzle reference cutting force and Taylor tool-life, imported from
 *     `../physics/constants.js`. This is a sanity reference for the consumer — it does
 *     NOT mutate the fused values (no silent physics override; the consumer decides).
 *
 * Deterministic + pure: no Date.now / RNG / I/O. Same candidates → same fusion.
 * Holds NO state.
 */
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

/** Sources whose spread > this max/min ratio are surfaced as a conflict (R7). 1.5 = 50% disagreement. */
const CONFLICT_SPREAD_RATIO = 1.5;
/** Confidence assumed for a candidate that omits one (neutral midpoint). */
const DEFAULT_CONFIDENCE = 0.5;
/** The cutting parameters this engine fuses. */
const FUSED_PARAMS = ["vc", "feed", "ap"] as const;
export type FusedParamName = (typeof FUSED_PARAMS)[number];

const VALID_ISO: readonly ISOGroup[] = ["P", "M", "K", "N", "S", "H"] as const;

/** One source's cutting-parameter recommendation. */
export interface LatheParamCandidate {
  /** Provenance label — e.g. "physics", "lora", "rag", "tribal", "operator". */
  source: string;
  /** Cutting speed [m/min]. */
  vc?: number;
  /** Feed [mm/rev]. */
  feed?: number;
  /** Depth of cut [mm]. */
  ap?: number;
  /** Source confidence ∈ [0,1] — the fusion weight (default 0.5; clamped). */
  confidence?: number;
}

export interface LatheFusionQuery {
  /** Turning operation (e.g. "od_rough", "id_bore", "thread", "part_off"). Required. */
  operation: string;
  material?: string;
  /** ISO machinability group — required for the physics anchor (omit → anchor null). */
  isoGroup?: ISOGroup;
}

export interface LatheFusionOptions {
  /** Override the conflict-detection spread ratio (default 1.5). Clamped to ≥1. */
  conflictSpreadRatio?: number;
}

/** Per-parameter fusion outcome across the contributing sources. */
export interface LatheFusedParam {
  param: FusedParamName;
  /** Confidence-weighted fused value. */
  fused: number;
  min: number;
  max: number;
  /** max/min — 1.0 = perfect agreement. */
  spreadRatio: number;
  sourceCount: number;
  /** True when spreadRatio exceeds the conflict threshold (R7-surfaced). */
  conflict: boolean;
  contributors: { source: string; value: number; weight: number }[];
}

export interface LathePhysicsAnchor {
  isoGroup: ISOGroup;
  kc1_1: number;
  mc: number;
  /** Kienzle reference cutting force Fc = kc1_1·ap·feed^(1-mc) [N] at the fused ap+feed (null if either absent). */
  referenceForceN: number | null;
  taylorC: number;
  taylorN: number;
  /** Taylor tool life T = (C/Vc)^(1/n) [min] at the fused vc (null if vc absent/≤0). */
  referenceToolLifeMin: number | null;
  note?: string;
}

export interface LatheFusionResult {
  query: LatheFusionQuery;
  /** Best-estimate fused params (null where no source supplied that param). */
  fusedParams: Record<FusedParamName, number | null>;
  perParam: LatheFusedParam[];
  /** Subset of perParam where the sources materially disagree (R7). */
  conflicts: LatheFusedParam[];
  physicsAnchor: LathePhysicsAnchor | null;
  /** Candidates that contributed ≥1 valid numeric param. */
  candidateCount: number;
  /** Candidates dropped as malformed (no valid params / bad shape). */
  skipped: number;
  summary: string;
}

const isPosNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export class LatheLoRAKnowledgeFusionEngine {
  /** Clamp a candidate's confidence to a usable weight; missing/invalid → DEFAULT_CONFIDENCE. */
  private weightOf(c: LatheParamCandidate): number {
    return typeof c.confidence === "number" && Number.isFinite(c.confidence)
      ? clamp01(c.confidence)
      : DEFAULT_CONFIDENCE;
  }

  /** Fuse one parameter across all candidates that supplied a positive finite value. */
  private fuseParam(
    param: FusedParamName,
    candidates: LatheParamCandidate[],
    spreadThreshold: number,
  ): LatheFusedParam | null {
    const pts: { source: string; value: number; weight: number }[] = [];
    for (const c of candidates) {
      const v = c[param];
      if (isPosNum(v)) pts.push({ source: c.source, value: v, weight: this.weightOf(c) });
    }
    if (pts.length === 0) return null;

    // Confidence-weighted mean. If all weights are 0 (all explicit zero confidence),
    // fall back to an equal-weight mean so a unanimous-but-unconfident set still fuses.
    let wsum = pts.reduce((s, p) => s + p.weight, 0);
    let pairs = pts;
    if (wsum <= 0) {
      pairs = pts.map((p) => ({ ...p, weight: 1 }));
      wsum = pairs.length;
    }
    const fused = pairs.reduce((s, p) => s + p.value * p.weight, 0) / wsum;

    const values = pts.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spreadRatio = min > 0 ? max / min : Infinity;

    return {
      param,
      fused: round3(fused),
      min: round3(min),
      max: round3(max),
      spreadRatio: Number.isFinite(spreadRatio) ? round3(spreadRatio) : spreadRatio,
      sourceCount: pts.length,
      conflict: pts.length >= 2 && spreadRatio > spreadThreshold,
      contributors: pts.map((p) => ({ source: p.source, value: round3(p.value), weight: round3(p.weight) })),
    };
  }

  /** Build the canonical physics anchor (Kienzle force + Taylor life) for fused params. */
  private buildAnchor(
    isoGroup: ISOGroup | undefined,
    fusedAp: number | null,
    fusedFeed: number | null,
    fusedVc: number | null,
  ): LathePhysicsAnchor | null {
    if (!isoGroup || !VALID_ISO.includes(isoGroup)) return null;
    const k = CANONICAL_KIENZLE[isoGroup];
    const t = CANONICAL_TAYLOR[isoGroup];

    // Kienzle turning form (constants.ts): Fc = kc1_1 · ap · feed^(1-mc).
    // Ref: Kienzle (1952) "Die Bestimmung von Kräften…"; ISO 3685:1993. kc1_1/mc from CANONICAL_KIENZLE.
    let referenceForceN: number | null = null;
    if (isPosNum(fusedAp) && isPosNum(fusedFeed)) {
      const fc = k.kc1_1 * fusedAp * Math.pow(fusedFeed, 1 - k.mc);
      referenceForceN = Number.isFinite(fc) ? round3(fc) : null;
    }
    // Taylor tool life: T = (C / Vc)^(1/n). Ref: Taylor (1907); ISO 3685:1993. C/n from CANONICAL_TAYLOR.
    let referenceToolLifeMin: number | null = null;
    if (isPosNum(fusedVc)) {
      const life = Math.pow(t.C / fusedVc, 1 / t.n);
      referenceToolLifeMin = Number.isFinite(life) ? round3(life) : null;
    }
    const missing: string[] = [];
    if (referenceForceN == null) missing.push("ap+feed");
    if (referenceToolLifeMin == null) missing.push("vc");

    return {
      isoGroup,
      kc1_1: k.kc1_1,
      mc: k.mc,
      referenceForceN,
      taylorC: t.C,
      taylorN: t.n,
      referenceToolLifeMin,
      note: missing.length
        ? `physics anchor partial — fused ${missing.join(" & ")} unavailable`
        : undefined,
    };
  }

  /**
   * Fuse multi-source cutting-parameter recommendations into a best estimate + conflict report.
   * @param query  the inference target (operation, material, ISO group for the anchor)
   * @param candidates  one entry per source (≥1 must carry a valid positive param)
   * @param opts  optional conflict-ratio override
   * @returns fused params, per-param spread, surfaced conflicts, and a canonical physics anchor
   * @throws if query.operation is missing/empty, candidates is not a non-empty array,
   *         or no candidate supplies a single valid positive parameter
   */
  fuse(
    query: LatheFusionQuery,
    candidates: LatheParamCandidate[],
    opts: LatheFusionOptions = {},
  ): LatheFusionResult {
    if (!query || typeof query.operation !== "string" || query.operation.length === 0) {
      throw new Error("LatheLoRAKnowledgeFusion.fuse: query.operation (non-empty string) required");
    }
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error("LatheLoRAKnowledgeFusion.fuse: candidates must be a non-empty array");
    }
    const spreadThreshold = Math.max(1, opts.conflictSpreadRatio ?? CONFLICT_SPREAD_RATIO);

    // Keep only candidates carrying ≥1 valid positive numeric param.
    const valid: LatheParamCandidate[] = [];
    let skipped = 0;
    for (const c of candidates) {
      if (c && typeof c === "object" && typeof c.source === "string" && c.source.length > 0 &&
          (isPosNum(c.vc) || isPosNum(c.feed) || isPosNum(c.ap))) {
        valid.push(c);
      } else {
        skipped++;
      }
    }
    if (valid.length === 0) {
      throw new Error("LatheLoRAKnowledgeFusion.fuse: no candidate supplied a valid positive parameter");
    }

    const perParam: LatheFusedParam[] = [];
    const fusedParams: Record<FusedParamName, number | null> = { vc: null, feed: null, ap: null };
    for (const p of FUSED_PARAMS) {
      const fp = this.fuseParam(p, valid, spreadThreshold);
      if (fp) {
        perParam.push(fp);
        fusedParams[p] = fp.fused;
      }
    }

    const conflicts = perParam.filter((p) => p.conflict);
    const physicsAnchor = this.buildAnchor(query.isoGroup, fusedParams.ap, fusedParams.feed, fusedParams.vc);

    const fusedStr = FUSED_PARAMS.filter((p) => fusedParams[p] != null)
      .map((p) => `${p}=${fusedParams[p]}`)
      .join(" ");
    const conflictStr = conflicts.length
      ? ` ⚠ ${conflicts.length} conflict(s): ${conflicts.map((c) => `${c.param}(${c.min}–${c.max})`).join(", ")} — sources disagree, do NOT trust the average blindly`
      : " (sources in agreement)";
    const anchorStr = physicsAnchor?.referenceForceN != null ? ` | Kienzle Fc≈${physicsAnchor.referenceForceN}N` : "";
    const summary = `Fused ${valid.length} source(s) for ${query.operation}: ${fusedStr || "no numeric params"}.${conflictStr}${anchorStr}`;

    return {
      query,
      fusedParams,
      perParam,
      conflicts,
      physicsAnchor,
      candidateCount: valid.length,
      skipped,
      summary,
    };
  }
}

export const latheLoRAKnowledgeFusionEngine = new LatheLoRAKnowledgeFusionEngine();
