/**
 * PairedPrintProgramBundleEngine — P2P-FULLSTACK-MS0/U-P2PFS61
 *
 * Pairs a TestResource fixture with a ProgramSignature describing the
 * expected shape of its rendered output. This complements the regression
 * harness:
 *
 *   Harness  — answers "did the pipeline run + produce non-empty output?"
 *   Bundle   — answers "did the output match the KNOWN-GOOD shape?"
 *
 * Pipelines evolve, so a strict golden-file diff is too brittle. Instead
 * a ProgramSignature captures tolerances that humans care about:
 *
 *   - line_count_min/max  (shape bounds)
 *   - required_codes      (must appear somewhere — e.g. "G21", "M30")
 *   - forbidden_patterns  (must NOT appear — e.g. dangerous rapid-to-stock)
 *   - required_stages     (for stage-based pipelines like sinker EDM)
 *   - ra_min/max_um       (surface-finish band the program targets)
 *
 * A fixture whose rendered program drifts OUTSIDE its signature means one
 * of: (a) the pipeline has improved and the signature is stale — update
 * the bundle, or (b) a regression snuck through — debug it. Either way,
 * the bundle turns silent drift into a visible test failure.
 *
 * This engine owns the bundle registry + the validator. It does NOT own
 * the pipeline; it receives rendered programs as strings.
 */

import type { TestProcess } from "./TestResourceRegistryEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Acceptance criteria for a rendered program. All fields optional —
 * bundles can be as tight or loose as the test surface demands.
 */
export interface ProgramSignature {
  /** Minimum acceptable line count. Below = regression. */
  line_count_min?: number;
  /** Maximum acceptable line count. Above = bloat/regression. */
  line_count_max?: number;
  /** Literal tokens that MUST appear somewhere in the program. */
  required_codes?: string[];
  /** Regex patterns that MUST NOT appear anywhere in the program. */
  forbidden_patterns?: string[];
  /** For stage-based pipelines — required count of stage markers. */
  required_stages?: number;
  /** Lower bound on surface finish Ra reported by the pipeline (µm). */
  ra_min_um?: number;
  /** Upper bound on surface finish Ra reported by the pipeline (µm). */
  ra_max_um?: number;
}

/**
 * A bundle couples a registered fixture_id with its signature + optional
 * reference program + human-facing annotations.
 */
export interface PrintProgramBundle {
  /** Must match a fixture in the TestResourceRegistry. */
  fixture_id: string;
  /** Which process the bundle is for (replicates fixture.process for sanity). */
  process: TestProcess;
  /** One-line human summary of the print. */
  print_summary: string;
  /** Expected program shape — empty object = no constraints. */
  program_signature: ProgramSignature;
  /** Optional reference program text for golden-file-style eyeballing. */
  reference_program?: string;
  /** Explanatory notes — why is this signature shaped this way? */
  annotations?: string[];
}

export interface BundleValidation {
  fixture_id: string;
  passed: boolean;
  /** Reasons validation failed, if any. */
  violations: string[];
  /** Detailed stats on the validated program. */
  actual: {
    line_count: number;
    matched_codes: string[];
    missing_codes: string[];
    triggered_forbidden: string[];
  };
}

// ============================================================================
// SEED BUNDLES (match the TestResourceRegistry seed)
// ============================================================================

const SEED_BUNDLES: PrintProgramBundle[] = [
  {
    fixture_id: "sinker-alcoa-1-4-20-cavity",
    process: "sinker_edm",
    print_summary: "1/4-20 UNC internal thread relief cavity, D2, Ra 0.8",
    program_signature: {
      line_count_min: 20,
      line_count_max: 400,
      required_codes: ["G21", "M30"],
      forbidden_patterns: ["G00 Z0", "M00\\s*$"],
      required_stages: 3,
      ra_min_um: 0.4,
      ra_max_um: 1.2,
    },
    annotations: [
      "Thread relief requires finish stage for Ra ≤ 0.8.",
      "Bare G00 Z0 is unsafe — must clear above stock.",
    ],
  },
  {
    fixture_id: "sinker-optimas-m2-relief",
    process: "sinker_edm",
    print_summary: "M2 cross-drilled relief pocket, Ra 0.8 floor",
    program_signature: {
      line_count_min: 15,
      line_count_max: 300,
      required_codes: ["G21", "M30"],
      required_stages: 3,
      ra_max_um: 1.2,
    },
  },
  {
    fixture_id: "wedm-alcoa-10-32-punch",
    process: "wire_edm",
    print_summary: "10-32 internal punch relief — tutorial-grade",
    program_signature: {
      // Wire EDM pipeline not yet wired — signature reserved.
      line_count_min: 0,
    },
    annotations: ["Pipeline pending — bundle stub retained for future wiring."],
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class PairedPrintProgramBundleEngine {
  private readonly _bundles = new Map<string, PrintProgramBundle>();

  constructor(seed: PrintProgramBundle[] = SEED_BUNDLES) {
    for (const b of seed) {
      if (this._bundles.has(b.fixture_id)) {
        throw new Error(`Duplicate bundle fixture_id in seed: ${b.fixture_id}`);
      }
      this._bundles.set(b.fixture_id, { ...b });
    }
  }

  // ── Registry API ────────────────────────────────────────────────────────

  /** Snapshot of all registered bundles. Deep-cloned. */
  bundles(): PrintProgramBundle[] {
    return Array.from(this._bundles.values()).map((b) => ({
      ...b,
      program_signature: { ...b.program_signature },
      annotations: b.annotations ? [...b.annotations] : undefined,
    }));
  }

  /** Get one bundle by fixture_id. Undefined if not registered. */
  getBundle(fixture_id: string): PrintProgramBundle | undefined {
    const b = this._bundles.get(fixture_id);
    if (!b) return undefined;
    return {
      ...b,
      program_signature: { ...b.program_signature },
      annotations: b.annotations ? [...b.annotations] : undefined,
    };
  }

  /** Register a new bundle — throws if fixture_id already registered. */
  registerBundle(bundle: PrintProgramBundle): PrintProgramBundle {
    if (!bundle.fixture_id) throw new Error("Bundle fixture_id is required");
    if (this._bundles.has(bundle.fixture_id)) {
      throw new Error(`Bundle already registered for fixture: ${bundle.fixture_id}`);
    }
    this._bundles.set(bundle.fixture_id, { ...bundle });
    return this.getBundle(bundle.fixture_id)!;
  }

  /** Remove a bundle. Returns true if it existed. */
  unregisterBundle(fixture_id: string): boolean {
    return this._bundles.delete(fixture_id);
  }

  // ── Validation API ──────────────────────────────────────────────────────

  /**
   * Validate a rendered program against its bundle signature.
   * Program is supplied as a string (newline-delimited G-code).
   *
   * Optional metrics object carries pipeline-derived values that live
   * outside the program text (stage count, reported Ra).
   */
  validateProgram(
    fixture_id: string,
    program: string,
    metrics: { stage_count?: number; ra_um?: number } = {},
  ): BundleValidation {
    const bundle = this._bundles.get(fixture_id);
    if (!bundle) {
      throw new Error(`No bundle registered for fixture: ${fixture_id}`);
    }

    const sig = bundle.program_signature;
    const lines = program.split(/\r?\n/).filter((l) => l.length > 0);
    const lineCount = lines.length;
    const violations: string[] = [];

    // Line count bounds
    if (sig.line_count_min !== undefined && lineCount < sig.line_count_min) {
      violations.push(
        `line_count ${lineCount} < min ${sig.line_count_min}`,
      );
    }
    if (sig.line_count_max !== undefined && lineCount > sig.line_count_max) {
      violations.push(
        `line_count ${lineCount} > max ${sig.line_count_max}`,
      );
    }

    // Required codes — substring match against whole program
    const matchedCodes: string[] = [];
    const missingCodes: string[] = [];
    for (const code of sig.required_codes ?? []) {
      if (program.includes(code)) matchedCodes.push(code);
      else {
        missingCodes.push(code);
        violations.push(`missing required_code: ${code}`);
      }
    }

    // Forbidden patterns — regex match
    const triggeredForbidden: string[] = [];
    for (const pat of sig.forbidden_patterns ?? []) {
      try {
        const re = new RegExp(pat);
        if (re.test(program)) {
          triggeredForbidden.push(pat);
          violations.push(`triggered forbidden_pattern: ${pat}`);
        }
      } catch {
        violations.push(`invalid forbidden_pattern regex: ${pat}`);
      }
    }

    // Stage count
    if (sig.required_stages !== undefined) {
      if (metrics.stage_count === undefined) {
        violations.push(
          `required_stages ${sig.required_stages} but no stage_count metric supplied`,
        );
      } else if (metrics.stage_count < sig.required_stages) {
        violations.push(
          `stage_count ${metrics.stage_count} < required ${sig.required_stages}`,
        );
      }
    }

    // Ra band
    if (sig.ra_min_um !== undefined) {
      if (metrics.ra_um === undefined) {
        violations.push(`ra_min_um ${sig.ra_min_um} but no ra_um metric supplied`);
      } else if (metrics.ra_um < sig.ra_min_um) {
        violations.push(`ra_um ${metrics.ra_um} < ra_min_um ${sig.ra_min_um}`);
      }
    }
    if (sig.ra_max_um !== undefined) {
      if (metrics.ra_um === undefined) {
        violations.push(`ra_max_um ${sig.ra_max_um} but no ra_um metric supplied`);
      } else if (metrics.ra_um > sig.ra_max_um) {
        violations.push(`ra_um ${metrics.ra_um} > ra_max_um ${sig.ra_max_um}`);
      }
    }

    return {
      fixture_id,
      passed: violations.length === 0,
      violations,
      actual: {
        line_count: lineCount,
        matched_codes: matchedCodes,
        missing_codes: missingCodes,
        triggered_forbidden: triggeredForbidden,
      },
    };
  }

  /** Validate a batch. Returns one validation per bundle. */
  validateBatch(
    payloads: Array<{
      fixture_id: string;
      program: string;
      metrics?: { stage_count?: number; ra_um?: number };
    }>,
  ): BundleValidation[] {
    return payloads.map((p) =>
      this.validateProgram(p.fixture_id, p.program, p.metrics),
    );
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const pairedPrintProgramBundleEngine = new PairedPrintProgramBundleEngine();
