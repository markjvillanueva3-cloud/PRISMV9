/**
 * CADToleranceSignalEncoderEngine — CAD-DRAW-MAX-MS0/P1-U09
 *
 * GD&T constraint signal → encoder feature vector. The AI needs to see
 * tolerance bands BEFORE it picks ops, not just after the regen-test
 * tells it the part missed spec (P0-U03 covers the after path). This
 * encoder turns a list of GD&T callouts + dimensional tolerances into
 * a fixed-dim constraint signal that augments the
 * {@link CADUnifiedFeatureBridgeEngine} 33-d feature so LP04 can
 * favor sequences that hit tight specs.
 *
 * **Output shape (TOLERANCE_SIGNAL_DIM=6).**
 *   - [0] tightestTolNorm — log-normalize(min |tol_mm|): drives sensitivity;
 *         min over all callouts.
 *   - [1] meanTolNorm     — log-normalize(mean |tol_mm|): overall tightness.
 *   - [2] calloutCountNorm— log1p(count)/log1p(64): how many specs.
 *   - [3] hasForm         — presence flag (0/1): flatness, straightness,
 *         circularity, cylindricity.
 *   - [4] hasOrientation  — presence flag (0/1): perpendicularity,
 *         parallelism, angularity.
 *   - [5] hasLocation     — presence flag (0/1): position, concentricity,
 *         symmetry, profile-of-surface.
 *
 * **Why presence flags (not hash).** GD&T category interpretation is
 * physical — a position callout demands a datum reference frame that a
 * flatness callout does not. LP04 needs to learn category-specific
 * weights; hashing the symbol would force it to relearn the category
 * boundaries every restart. Flags survive embedding-table evictions.
 *
 * **Empty input.** Returns the zero vector + totalEmptySignals++.
 *
 * Refs: ASME Y14.5-2018; cad_gdt_parse_enhanced (CADBlueprintGDTParser
 * style); CADRegenFeedbackAdapterEngine (P0-U03) for the after-the-fact
 * Cpk/regen-test signal.
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const TOLERANCE_SIGNAL_DIM = 6;
/** log-normalize ceiling for tolerance values (mm). Matches NN01/CADArg family. */
const TOLERANCE_LOG_CEIL = 10; // mm — span of practical part-print tolerance bands
/** log-normalize ceiling for callout counts. */
const COUNT_LOG_CEIL = 64;

const FORM_SYMBOLS = new Set(["flatness", "straightness", "circularity", "cylindricity"]);
const ORIENTATION_SYMBOLS = new Set(["perpendicularity", "parallelism", "angularity"]);
const LOCATION_SYMBOLS = new Set(["position", "concentricity", "symmetry", "profile_surface", "profile_line"]);

// ── Types ────────────────────────────────────────────────────────────────────

export interface ToleranceCallout {
  /** Bilateral or unilateral tolerance band, in mm. Used for the min/mean signals. */
  tolerance_mm?: number;
  /** GD&T symbol name in lowercase snake_case
   *  (e.g. "position", "flatness", "perpendicularity", "profile_surface"). */
  gdt_symbol?: string;
  /** Optional feature kind ("hole", "boss", "datum_face") — passed through unchanged. */
  feature?: string;
}

export interface ToleranceSignalStats {
  totalEncodings: number;
  totalEmptySignals: number;
  totalCallouts: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function logNormalizeTol(tol: number): number {
  if (!Number.isFinite(tol) || tol < 0) return 0;
  return Math.min(1, Math.log1p(tol) / Math.log1p(TOLERANCE_LOG_CEIL));
}

function logNormalizeCount(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1, Math.log1p(n) / Math.log1p(COUNT_LOG_CEIL));
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADToleranceSignalEncoderEngine {
  private totalEncodings = 0;
  private totalEmptySignals = 0;
  private totalCallouts = 0;

  /** Encode a callout list → 6-d tolerance signal. */
  encodeTolerances(callouts: ReadonlyArray<ToleranceCallout>): number[] {
    if (!Array.isArray(callouts)) {
      throw new TypeError("encodeTolerances: callouts must be an array");
    }
    this.totalEncodings++;
    const out = new Array<number>(TOLERANCE_SIGNAL_DIM).fill(0);
    if (callouts.length === 0) {
      this.totalEmptySignals++;
      return out;
    }
    this.totalCallouts += callouts.length;

    // Numeric stats over tolerance_mm
    let validTolCount = 0;
    let sum = 0;
    let min = Number.POSITIVE_INFINITY;
    let hasForm = false;
    let hasOrientation = false;
    let hasLocation = false;

    for (const c of callouts) {
      if (typeof c?.tolerance_mm === "number" && Number.isFinite(c.tolerance_mm) && c.tolerance_mm >= 0) {
        sum += c.tolerance_mm;
        if (c.tolerance_mm < min) min = c.tolerance_mm;
        validTolCount++;
      }
      const sym = typeof c?.gdt_symbol === "string" ? c.gdt_symbol.toLowerCase() : "";
      if (FORM_SYMBOLS.has(sym)) hasForm = true;
      else if (ORIENTATION_SYMBOLS.has(sym)) hasOrientation = true;
      else if (LOCATION_SYMBOLS.has(sym)) hasLocation = true;
    }

    if (validTolCount > 0) {
      out[0] = logNormalizeTol(min);
      out[1] = logNormalizeTol(sum / validTolCount);
    }
    out[2] = logNormalizeCount(callouts.length);
    out[3] = hasForm ? 1 : 0;
    out[4] = hasOrientation ? 1 : 0;
    out[5] = hasLocation ? 1 : 0;

    return out;
  }

  /** Convenience: combine a CADUnifiedFeature 33-d vector with the 6-d tolerance
   *  signal → 39-d augmented vector for LP04 ranking. */
  augmentUnifiedFeature(unifiedFeature: ReadonlyArray<number>, callouts: ReadonlyArray<ToleranceCallout>): number[] {
    if (!Array.isArray(unifiedFeature)) {
      throw new TypeError("augmentUnifiedFeature: unifiedFeature must be an array");
    }
    return [...unifiedFeature, ...this.encodeTolerances(callouts)];
  }

  getStats(): ToleranceSignalStats {
    return {
      totalEncodings: this.totalEncodings,
      totalEmptySignals: this.totalEmptySignals,
      totalCallouts: this.totalCallouts,
    };
  }

  _resetForTests(): void {
    this.totalEncodings = 0;
    this.totalEmptySignals = 0;
    this.totalCallouts = 0;
  }
}

export const cadToleranceSignalEncoderEngine = new CADToleranceSignalEncoderEngine();
