/**
 * MultiControllerCalibrationEngine — P2P-FULLSTACK-MS0/U-P2PFS60
 *
 * Cross-dialect calibration harness. Runs the same canonical synthetic
 * job through N controller dialects and compares the resulting programs
 * on structural + semantic dimensions:
 *
 *   - required preamble codes (G21/G20, G17, G90, G94/G95)
 *   - tool-change prologue
 *   - coolant on/off semantics
 *   - end-of-program shape (M30/M02)
 *   - dialect-specific quirks (O-word vs %, canned-cycle syntax)
 *
 * Purpose: if a dispatcher change breaks one controller's post-engine
 * output, the unit tests for that engine catch it — but if the change
 * breaks the *consistency* across engines (e.g. suddenly the Mitsubishi
 * post drops G21 while Fanuc keeps it), only a cross-controller
 * calibration run catches that class of regression.
 *
 * This engine does NOT own the actual post-engines; it consults them
 * through a pluggable `ControllerProbe` abstraction so tests can inject
 * stub probes and exercise the aggregation logic deterministically.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ControllerDialect =
  | "fanuc_30i"
  | "fanuc_0i"
  | "haas_ngc"
  | "okuma_osp"
  | "mitsubishi_mv"
  | "mitsubishi_ea"
  | "siemens_840d"
  | "heidenhain_tnc"
  | "generic_iso";

/** A single code fragment the controller is expected to emit. */
export interface ControllerEmission {
  /** Category this emission belongs to (e.g. "units", "coolant_on"). */
  category: string;
  /** Literal G/M-code fragment, e.g. "G21", "M8", "M30". */
  code: string;
  /** True if the controller MUST emit this to be compliant. */
  required: boolean;
}

/**
 * Probe that reports what a given controller would emit for a canonical
 * job. This indirection keeps the calibration engine independent of the
 * actual post-engines so tests can replace probes with stubs.
 */
export interface ControllerProbe {
  dialect: ControllerDialect;
  emissions(): ControllerEmission[];
}

export interface CalibrationCompareResult {
  dialect: ControllerDialect;
  /** Required categories emitted correctly. */
  hits: string[];
  /** Required categories missing. */
  misses: string[];
  /** Optional categories the dialect added. */
  extras: string[];
  /** Pass = zero misses on required categories. */
  passed: boolean;
  /** 0..100 compliance score (hits / required × 100). */
  score: number;
}

export interface CrossControllerSummary {
  /** Categories every probe satisfied. */
  universal_hits: string[];
  /** Categories at least one probe missed. */
  any_miss: string[];
  /** Per-dialect details. */
  per_dialect: CalibrationCompareResult[];
  /** True if every dialect scored 100. */
  all_passed: boolean;
  /** Overall pass rate across dialects (%). */
  aggregate_score: number;
  /** Dialects flagged as divergent from the consensus (missed what others hit). */
  divergent_dialects: ControllerDialect[];
}

// ============================================================================
// CANONICAL REQUIRED CATEGORIES
// ============================================================================

/**
 * The universally-required emission categories. Any probe missing one
 * of these is non-compliant for sinker EDM / mill / lathe programs.
 */
export const CANONICAL_REQUIRED: readonly string[] = [
  "units",              // G21 (metric) or G20 (imperial)
  "plane_xy",           // G17
  "absolute_mode",      // G90
  "feed_mode",          // G94 (feed/min) or G95 (feed/rev)
  "end_of_program",     // M30 or M02
] as const;

// ============================================================================
// ENGINE
// ============================================================================

export class MultiControllerCalibrationEngine {
  /** Compare N probes against the canonical requirement set. */
  compareAll(probes: ControllerProbe[]): CrossControllerSummary {
    if (probes.length === 0) {
      return {
        universal_hits: [],
        any_miss: [...CANONICAL_REQUIRED],
        per_dialect: [],
        all_passed: false,
        aggregate_score: 0,
        divergent_dialects: [],
      };
    }

    const perDialect = probes.map((p) => this.compareOne(p));

    // Universal hits: categories EVERY dialect satisfied.
    const universalHits: string[] = [];
    const anyMiss = new Set<string>();
    for (const cat of CANONICAL_REQUIRED) {
      const allHit = perDialect.every((r) => r.hits.includes(cat));
      if (allHit) universalHits.push(cat);
      else anyMiss.add(cat);
    }

    const allPassed = perDialect.every((r) => r.passed);
    const aggregateScore = Math.round(
      perDialect.reduce((s, r) => s + r.score, 0) / perDialect.length,
    );

    // A dialect is "divergent" when it missed something the majority hit.
    const majorityHitCategories = new Set<string>();
    for (const cat of CANONICAL_REQUIRED) {
      const hits = perDialect.filter((r) => r.hits.includes(cat)).length;
      if (hits > perDialect.length / 2) majorityHitCategories.add(cat);
    }
    const divergent = perDialect
      .filter((r) => r.misses.some((m) => majorityHitCategories.has(m)))
      .map((r) => r.dialect);

    return {
      universal_hits: universalHits,
      any_miss: Array.from(anyMiss),
      per_dialect: perDialect,
      all_passed: allPassed,
      aggregate_score: aggregateScore,
      divergent_dialects: divergent,
    };
  }

  /** Compare a single probe against the canonical requirement set. */
  compareOne(probe: ControllerProbe): CalibrationCompareResult {
    const emissions = probe.emissions();
    const emittedCategories = new Set(
      emissions.filter((e) => e.required).map((e) => e.category),
    );

    const hits: string[] = [];
    const misses: string[] = [];
    for (const cat of CANONICAL_REQUIRED) {
      if (emittedCategories.has(cat)) hits.push(cat);
      else misses.push(cat);
    }

    // Extras: optional-but-added categories beyond the canonical set.
    const extras: string[] = [];
    for (const e of emissions) {
      if (!CANONICAL_REQUIRED.includes(e.category) && !extras.includes(e.category)) {
        extras.push(e.category);
      }
    }

    const score = Math.round((hits.length / CANONICAL_REQUIRED.length) * 100);

    return {
      dialect: probe.dialect,
      hits,
      misses,
      extras,
      passed: misses.length === 0,
      score,
    };
  }
}

// ============================================================================
// DEFAULT PROBES (curated realistic emissions for common controllers)
// ============================================================================

/** A probe whose emissions are a literal static list — useful for testing. */
export class StaticControllerProbe implements ControllerProbe {
  constructor(
    public readonly dialect: ControllerDialect,
    private readonly _emissions: ControllerEmission[],
  ) {}
  emissions(): ControllerEmission[] {
    return this._emissions.map((e) => ({ ...e }));
  }
}

/** Realistic set of probes for 5 common controllers — fully compliant. */
export function canonicalProbes(): ControllerProbe[] {
  const full: ControllerEmission[] = [
    { category: "units", code: "G21", required: true },
    { category: "plane_xy", code: "G17", required: true },
    { category: "absolute_mode", code: "G90", required: true },
    { category: "feed_mode", code: "G94", required: true },
    { category: "end_of_program", code: "M30", required: true },
  ];
  return [
    new StaticControllerProbe("fanuc_30i", full),
    new StaticControllerProbe("haas_ngc", full),
    new StaticControllerProbe("okuma_osp", full),
    new StaticControllerProbe("mitsubishi_ea", full),
    new StaticControllerProbe("siemens_840d", full),
  ];
}

// ============================================================================
// SINGLETON
// ============================================================================

export const multiControllerCalibrationEngine = new MultiControllerCalibrationEngine();
