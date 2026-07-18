/**
 * PRISM MCP Server — Tool-Failure-Probability Engine (MATH-2 APPLY leg)
 *
 * Measure-theoretic RARE-EVENT probability that a cutting tool FAILS to reach a
 * required service life, given lognormal process scatter on cutting speed (Vc)
 * and feed (f). This is the manufacturing APPLICATION of the generic
 * change-of-measure (Radon–Nikodym) importance-sampling reliability core
 * (`ImportanceSamplingReliabilityEngine`) — it does NOT re-derive the estimator,
 * it FORMS the tool-life limit state and delegates.
 *
 * ── Limit state ────────────────────────────────────────────────────────────
 *   g(x) = life(Vc, f) − required_life ,   failure ⇔ g(x) ≤ 0
 *
 * where life() is the canonical EXTENDED Taylor tool-life law (ISO 3685 Annex C):
 *
 *   T = ( C / ( Vc · f^a · d^b ) )^(1/n)                 [min]
 *
 * with C, n, a, b imported from `src/physics/constants.ts` (CANONICAL_TAYLOR +
 * extendedTaylorExponents) — never inlined. Vc, f, d in m/min, mm/rev, mm.
 *
 * ── Uncertainty model (lognormal → standard-normal transform) ──────────────
 * Vc and f are strictly-positive quantities, so the physically-correct scatter
 * model is LOGNORMAL (Ang & Tang 1975; Melchers & Beck 2018 §4.3). A lognormal
 * variable is EXACTLY standard-normal in log-space, which is precisely the input
 * the importance sampler expects. We therefore run the sampler in log-space:
 *
 *   input random vector  u = [ ln Vc , ln f ]           (only cov>0 dims kept)
 *   mean_j  = ln(nominal_j)          ← nominal is the MEDIAN of the lognormal
 *   std_j   = sqrt( ln( 1 + CoV_j² ) ) = ζ_j            ← log-space sigma
 *
 * and the limit-state callback exponentiates back:  Vc = exp(u₀), f = exp(u₁).
 *
 * BECAUSE ln(life) is LINEAR in (ln Vc, ln f), the failure boundary life = L_req
 * is a HYPERPLANE in log-space ⇒ FORM is EXACT here and p_f = Φ(−β) with
 *   β = D / sqrt(ζ_Vc² + a²·ζ_f²) ,
 *   D = ( ln C − b·ln d − n·ln L_req ) − ln Vc0 − a·ln f0 .
 * This closed form is the reference against which the companion test is derived.
 * The importance sampler recovers it while remaining valid for non-linear /
 * multi-tool extensions where no closed form exists.
 *
 * The design point (most-probable failure point, MPP) is reported back in
 * PHYSICAL space (Vc*, f*) — it lies ON the life = L_req surface, i.e. the
 * (Vc, f) pair at which the tool is exactly exhausted at the required life.
 *
 * Nominal convention: the supplied Vc/f are treated as the lognormal MEDIAN
 * (log-mean = ln(nominal)). For small CoV the median↔mean gap exp(ζ²/2) is
 * sub-percent; the choice is documented, not hidden.
 *
 * SAFETY-RELEVANT: p_f feeds tool-change scheduling and S(x) risk gating. Any
 * change to the limit-state form or the lognormal transform MUST be re-reviewed
 * by the physics reviewer.
 *
 * References:
 *   - Taylor, F.W. (1907) "On the Art of Cutting Metals". Trans. ASME 28.
 *   - ISO 3685:1993 Annex C (extended Taylor tool-life, feed/depth exponents).
 *   - Ang, A.H-S. & Tang, W.H. (1975) "Probability Concepts in Engineering
 *     Planning and Design", Vol. II — lognormal reliability.
 *   - Melchers, R.E. & Beck, A.T. (2018) "Structural Reliability Analysis and
 *     Prediction", 3rd ed. — FORM, importance sampling, design point.
 *   - Hasofer & Lind (1974); Rackwitz & Fiessler (1978) — design-point search.
 *
 * @module ToolFailureProbabilityEngine
 */

import {
  CANONICAL_TAYLOR,
  extendedTaylorExponents,
  extendedTaylorLife,
  resolveMaterial,
  type ISOGroup,
} from "../physics/constants.js";
import {
  importanceSamplingReliabilityEngine,
  type ISReliabilityInput,
} from "./ImportanceSamplingReliabilityEngine.js";

// ============================================================================
// TYPES
// ============================================================================

const ISO_GROUPS: readonly ISOGroup[] = ["P", "M", "K", "N", "S", "H"] as const;

/** Input for a tool-failure-probability assessment. */
export interface ToolFailureProbabilityInput {
  /** Nominal (median) cutting speed Vc [m/min], > 0. */
  cutting_speed_m_min: number;
  /** Nominal (median) feed f [mm/rev], > 0. */
  feed_mm_rev: number;
  /** Depth of cut d [mm], > 0 (treated as deterministic). */
  depth_of_cut_mm: number;
  /** Required tool life the part/job demands [min], > 0. */
  required_life_min: number;
  /**
   * Material key or ISO group. Resolves Taylor C,n (CANONICAL_TAYLOR) and the
   * extended feed/depth exponents a,b (extendedTaylorExponents). One of
   * `material` / `iso_group` is required (unless taylor_C+taylor_n given).
   */
  material?: string;
  /** Explicit ISO group override (P|M|K|N|S|H). */
  iso_group?: ISOGroup;
  /** Explicit Taylor constant C [m/min] override (else from CANONICAL_TAYLOR). */
  taylor_C?: number;
  /** Explicit Taylor exponent n override (else from CANONICAL_TAYLOR). */
  taylor_n?: number;
  /** Explicit extended feed exponent a override (else from extendedTaylorExponents). */
  extended_a?: number;
  /** Explicit extended depth exponent b override (else from extendedTaylorExponents). */
  extended_b?: number;
  /** Coefficient of variation of Vc (lognormal), ≥ 0 (default 0.05 = 5 %). */
  cov_cutting_speed?: number;
  /** Coefficient of variation of f (lognormal), ≥ 0 (default 0.05 = 5 %). */
  cov_feed?: number;
  /** Importance-sample budget (default = sampler default 20000). */
  nSamples?: number;
  /** PRNG seed for reproducibility (default 12345). */
  seed?: number;
}

/** Result of a tool-failure-probability assessment. */
export interface ToolFailureProbabilityResult {
  /** Estimated probability the tool fails to reach required life, p_f ∈ [0,1]. */
  failureProbability: number;
  /** Absolute standard error (uncertainty) of the p_f estimate (AtomicValue-style). */
  failureProbabilityUncertainty: number;
  /** Generalised reliability index β = −Φ⁻¹(p_f) (safe → +, unsafe → −). */
  reliabilityIndexBeta: number;
  /** FORM reliability index β = ‖u*‖ located at the design point (log-space). */
  formReliabilityIndex: number;
  /** Whether the HL-RF design-point search converged. */
  designPointFound: boolean;
  /** Most-probable failure point (design point) in PHYSICAL space; on life=L_req. */
  designPoint: { cutting_speed_m_min: number; feed_mm_rev: number };
  /** Deterministic tool life at the nominal (median) operating point [min]. */
  nominalLife_min: number;
  /** The required life the assessment was run against [min]. */
  requiredLife_min: number;
  /** Life margin = nominalLife − requiredLife [min] (>0 nominally safe). */
  lifeMargin_min: number;
  /** Names of the variables treated as random (cov>0). */
  randomVariables: string[];
  /** Coefficient of variation of the p_f estimator (sampling quality). */
  estimatorCoefficientOfVariation: number;
  /** Effective-sample-size fraction of the importance run (∈(0,1]). */
  effectiveSampleSizeFraction: number;
  /** Importance samples used. */
  nSamples: number;
  /** PRNG seed used. */
  seed: number;
  /** Resolved ISO material group. */
  isoGroup: ISOGroup;
  /** Resolved Taylor / extended coefficients actually used. */
  taylor: { C: number; n: number; a: number; b: number };
  /** Non-fatal diagnostics (design-point non-convergence, low ESS, large CoV, …). */
  warnings: string[];
  /** Method label. */
  source: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ToolFailureProbabilityEngine {
  /** Default lognormal CoV on Vc/f when the caller supplies none (5 %). */
  private static readonly DEFAULT_COV = 0.05;
  /** CoV above which a large-scatter warning is emitted. */
  private static readonly LARGE_COV_WARN = 0.5;

  /**
   * Assess the probability that a tool fails to reach `required_life_min`.
   *
   * @param input nominal Vc/f/depth, required life, material, lognormal CoVs.
   * @returns p_f, reliability indices, physical-space design point, diagnostics.
   * @throws on non-finite / non-positive geometry, life or CoV, or an
   *   unresolvable material — invalid physics must fail loud, never silently
   *   default (matches the composed ImportanceSamplingReliabilityEngine contract).
   */
  estimateToolFailureProbability(
    input: ToolFailureProbabilityInput,
  ): ToolFailureProbabilityResult {
    if (!input || typeof input !== "object") {
      throw new Error("ToolFailureProbabilityEngine: input object is required");
    }

    // ── 1. Validate operating point + requirement (fail loud on bad physics) ──
    const Vc0 = input.cutting_speed_m_min;
    const f0 = input.feed_mm_rev;
    const d0 = input.depth_of_cut_mm;
    const Lreq = input.required_life_min;
    this.requirePositiveFinite("cutting_speed_m_min", Vc0);
    this.requirePositiveFinite("feed_mm_rev", f0);
    this.requirePositiveFinite("depth_of_cut_mm", d0);
    this.requirePositiveFinite("required_life_min", Lreq);

    // ── 2. Resolve canonical Taylor + extended coefficients (never inlined) ──
    const iso = this.resolveIsoGroup(input);
    const baseTaylor = CANONICAL_TAYLOR[iso];
    const baseExt = extendedTaylorExponents(iso);
    const C = input.taylor_C ?? baseTaylor.C;
    const n = input.taylor_n ?? baseTaylor.n;
    const a = input.extended_a ?? baseExt.a;
    const b = input.extended_b ?? baseExt.b;
    this.requirePositiveFinite("taylor_C", C);
    this.requirePositiveFinite("taylor_n", n);
    if (!Number.isFinite(a) || a < 0) {
      throw new Error(`ToolFailureProbabilityEngine: extended_a must be finite ≥ 0 (got ${a})`);
    }
    if (!Number.isFinite(b) || b < 0) {
      throw new Error(`ToolFailureProbabilityEngine: extended_b must be finite ≥ 0 (got ${b})`);
    }

    // Deterministic tool life at the nominal (median) point.
    const life = (vc: number, f: number): number => extendedTaylorLife(vc, f, d0, n, C, a, b);
    const nominalLife = life(Vc0, f0);
    const lifeMargin = nominalLife - Lreq;

    const warnings: string[] = [];

    // ── 3. Build the lognormal random vector in log-space (cov>0 dims only) ──
    const covVc = input.cov_cutting_speed ?? ToolFailureProbabilityEngine.DEFAULT_COV;
    const covF = input.cov_feed ?? ToolFailureProbabilityEngine.DEFAULT_COV;
    this.requireNonNegativeFinite("cov_cutting_speed", covVc);
    this.requireNonNegativeFinite("cov_feed", covF);
    if (covVc > ToolFailureProbabilityEngine.LARGE_COV_WARN) {
      warnings.push(`cov_cutting_speed=${covVc} is large (>0.5); lognormal tail is heavy`);
    }
    if (covF > ToolFailureProbabilityEngine.LARGE_COV_WARN) {
      warnings.push(`cov_feed=${covF} is large (>0.5); lognormal tail is heavy`);
    }

    interface RandomVar { name: "cutting_speed_m_min" | "feed_mm_rev"; logMean: number; logStd: number }
    const randomVars: RandomVar[] = [];
    if (covVc > 0) {
      randomVars.push({ name: "cutting_speed_m_min", logMean: Math.log(Vc0), logStd: this.logSigma(covVc) });
    }
    if (covF > 0) {
      randomVars.push({ name: "feed_mm_rev", logMean: Math.log(f0), logStd: this.logSigma(covF) });
    }

    const seed = Number.isFinite(input.seed) ? (input.seed as number) : 12345;

    // ── 4. Deterministic degenerate case: no scatter → step probability ──────
    if (randomVars.length === 0) {
      // life(Vc0,f0) is a fixed number; failure is a certainty or an impossibility.
      const pf = lifeMargin <= 0 ? 1 : 0;
      warnings.push("no random variables (all CoV=0); p_f is deterministic 0/1 step");
      return {
        failureProbability: pf,
        failureProbabilityUncertainty: 0,
        reliabilityIndexBeta: pf === 0 ? Infinity : -Infinity,
        formReliabilityIndex: pf === 0 ? Infinity : 0,
        designPointFound: false,
        designPoint: { cutting_speed_m_min: Vc0, feed_mm_rev: f0 },
        nominalLife_min: nominalLife,
        requiredLife_min: Lreq,
        lifeMargin_min: lifeMargin,
        randomVariables: [],
        estimatorCoefficientOfVariation: 0,
        effectiveSampleSizeFraction: 1,
        nSamples: 0,
        seed,
        isoGroup: iso,
        taylor: { C, n, a, b },
        warnings,
        source: "tool_failure_probability:deterministic",
      };
    }

    // ── 5. Limit state g(u) = life(exp(u)) − L_req, u in log-space ───────────
    const limitState = (x: number[]): number => {
      let vc = Vc0;
      let f = f0;
      for (let i = 0; i < randomVars.length; i++) {
        if (randomVars[i].name === "cutting_speed_m_min") vc = Math.exp(x[i]);
        else f = Math.exp(x[i]);
      }
      return life(vc, f) - Lreq;
    };

    const isInput: ISReliabilityInput = {
      limitState,
      input: {
        mean: randomVars.map((r) => r.logMean),
        std: randomVars.map((r) => r.logStd),
      },
      failureThreshold: 0,
      failureMode: "below", // g = capacity(life) − demand(required); fail when ≤ 0
      ...(Number.isFinite(input.nSamples) ? { nSamples: input.nSamples } : {}),
      seed,
    };

    const is = importanceSamplingReliabilityEngine.estimateFailureProbability(isInput);
    for (const w of is.warnings) warnings.push(w);

    // ── 6. Reconstruct the design point in PHYSICAL space ────────────────────
    let dpVc = Vc0;
    let dpF = f0;
    for (let i = 0; i < randomVars.length; i++) {
      if (randomVars[i].name === "cutting_speed_m_min") dpVc = Math.exp(is.proposalMean[i]);
      else dpF = Math.exp(is.proposalMean[i]);
    }

    return {
      failureProbability: is.failureProbability,
      failureProbabilityUncertainty: is.standardError,
      reliabilityIndexBeta: is.reliabilityIndex,
      formReliabilityIndex: is.designPointBeta,
      designPointFound: is.designPointFound,
      designPoint: { cutting_speed_m_min: dpVc, feed_mm_rev: dpF },
      nominalLife_min: nominalLife,
      requiredLife_min: Lreq,
      lifeMargin_min: lifeMargin,
      randomVariables: randomVars.map((r) => r.name),
      estimatorCoefficientOfVariation: is.coefficientOfVariation,
      effectiveSampleSizeFraction: is.effectiveSampleSizeFraction,
      nSamples: is.nSamples,
      seed: is.seed,
      isoGroup: iso,
      taylor: { C, n, a, b },
      warnings,
      source: "tool_failure_probability:importance_sampling",
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /** Lognormal log-space sigma ζ from a coefficient of variation: ζ = √ln(1+CoV²). */
  private logSigma(cov: number): number {
    return Math.sqrt(Math.log(1 + cov * cov));
  }

  /** Resolve the ISO group from explicit group, material key, or throw (no silent P default). */
  private resolveIsoGroup(input: ToolFailureProbabilityInput): ISOGroup {
    if (input.iso_group) {
      if (!ISO_GROUPS.includes(input.iso_group)) {
        throw new Error(
          `ToolFailureProbabilityEngine: iso_group must be one of ${ISO_GROUPS.join("|")} (got ${String(input.iso_group)})`,
        );
      }
      return input.iso_group;
    }
    if (input.material) {
      const mat = resolveMaterial(input.material);
      if (mat) return mat.iso_group;
      throw new Error(
        `ToolFailureProbabilityEngine: unknown material "${input.material}"; supply a known material key or iso_group`,
      );
    }
    // Explicit Taylor coefficients let the caller skip material resolution.
    if (input.taylor_C != null && input.taylor_n != null) return "P";
    throw new Error(
      "ToolFailureProbabilityEngine: provide `material`, `iso_group`, or explicit taylor_C+taylor_n",
    );
  }

  private requirePositiveFinite(name: string, v: number): void {
    if (!Number.isFinite(v) || v <= 0) {
      throw new Error(`ToolFailureProbabilityEngine: ${name} must be finite and > 0 (got ${v})`);
    }
  }

  private requireNonNegativeFinite(name: string, v: number): void {
    if (!Number.isFinite(v) || v < 0) {
      throw new Error(`ToolFailureProbabilityEngine: ${name} must be finite and ≥ 0 (got ${v})`);
    }
  }
}

/** Canonical singleton (matches importanceSamplingReliabilityEngine style). */
export const toolFailureProbabilityEngine = new ToolFailureProbabilityEngine();
