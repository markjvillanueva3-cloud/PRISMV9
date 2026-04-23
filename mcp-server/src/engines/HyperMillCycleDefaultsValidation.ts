/**
 * HyperMillCycleDefaultsValidation — Cycle parameter validation hook
 *
 * Validates proposed machining parameters against factory defaults from
 * HyperMillCycleDefaultsEngine. Warns on >30% deviation, blocks on
 * physically impossible values.
 *
 * HM-REV-MS3 / U-HMR17
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum RPM for any milling machine in PRISM's scope */
const MAX_MACHINE_RPM = 60_000;

/**
 * Parameters that must be strictly positive (cannot be zero or negative).
 * A zero or negative value here is physically impossible for a cutting operation.
 */
const MUST_BE_POSITIVE: readonly string[] = [
  "feed_mmrev",
  "feed_mmmin",
  "FVORSCHUB",
  "FEEDRATE",
  "TFEEDRATE",
  "feed_rate",
  "feedrate",
];

/**
 * Parameters that must be non-negative (zero is allowed, negative is not).
 */
const MUST_BE_NON_NEGATIVE: readonly string[] = [
  "stepdown_mm",
  "stepdown",
  "VERTZUSTEL",
  "stepover_mm",
  "stepover",
  "HORIZUSTEL",
  "allowance",
  "AUFMASS",
  "tolerance",
  "CNTRES",
  "clearance",
  "SICHEBENE",
];

/** Deviation threshold (fraction) beyond which a warning is issued */
const WARN_DEVIATION_THRESHOLD = 0.30;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidateCycleDefaultsInput {
  /** Cycle code (e.g. "3D_Roughing", "Drilling", "hmSlf3") — used for context in messages */
  cycleCode: string;
  /** Proposed parameter values from programmer or tool-path generation */
  proposed: Record<string, number>;
  /** Factory default values from HyperMillCycleDefaultsEngine */
  factoryDefaults: Record<string, number>;
}

export interface ValidateCycleDefaultsResult {
  /** True if no BLOCK-level issues were found */
  valid: boolean;
  /** Warning messages (>30% deviation, unusual values) */
  warnings: string[];
  /** Block messages (physically impossible values, hard safety violations) */
  blocks: string[];
  /** Informational notes */
  info: string[];
}

// ── Core validation logic ─────────────────────────────────────────────────────

/**
 * Validate proposed cycle parameters against factory defaults.
 *
 * Rules:
 *   WARN if any numeric param deviates >30% from factory default (non-zero default).
 *   BLOCK if stepdown/allowance/tolerance is negative.
 *   BLOCK if feed (mm/rev or mm/min) is zero or negative.
 *   BLOCK if spindle speed exceeds MAX_MACHINE_RPM.
 *
 * @param params - Input containing cycleCode, proposed, factoryDefaults
 * @returns Validation result with valid flag, warnings, blocks, info
 */
export function validateCycleDefaults(
  params: ValidateCycleDefaultsInput
): ValidateCycleDefaultsResult {
  const { cycleCode, proposed, factoryDefaults } = params;
  const warnings: string[] = [];
  const blocks: string[] = [];
  const info: string[] = [];

  // ── 1. Check physically impossible values ─────────────────────────────────
  for (const [key, value] of Object.entries(proposed)) {
    const keyLower = key.toLowerCase();

    // Negative stepdown, clearance, tolerance
    if (MUST_BE_NON_NEGATIVE.some(k => k.toLowerCase() === keyLower)) {
      if (value < 0) {
        blocks.push(
          `[${cycleCode}] '${key}' = ${value} is negative — stepdown/clearance/tolerance cannot be negative`
        );
      } else if (value === 0 && keyLower.includes("stepdown")) {
        blocks.push(
          `[${cycleCode}] '${key}' = 0 — zero stepdown disables material removal entirely`
        );
      }
    }

    // Zero or negative feed
    if (MUST_BE_POSITIVE.some(k => k.toLowerCase() === keyLower)) {
      if (value <= 0) {
        blocks.push(
          `[${cycleCode}] '${key}' = ${value} — feed rate must be positive (value > 0)`
        );
      }
    }

    // Spindle speed sanity
    if (
      keyLower === "tcuttingspeed" ||
      keyLower === "spindlespeed" ||
      keyLower === "tspindlespeed_max" ||
      keyLower === "rpm" ||
      keyLower === "spindle_rpm"
    ) {
      if (value > MAX_MACHINE_RPM) {
        blocks.push(
          `[${cycleCode}] '${key}' = ${value} RPM exceeds maximum machine limit of ${MAX_MACHINE_RPM} RPM`
        );
      }
      if (value < 0) {
        blocks.push(
          `[${cycleCode}] '${key}' = ${value} — spindle speed cannot be negative`
        );
      }
    }
  }

  // ── 2. Check deviation from factory defaults ──────────────────────────────
  for (const [key, proposedVal] of Object.entries(proposed)) {
    const factoryVal = factoryDefaults[key];
    if (factoryVal === undefined || factoryVal === null) {
      // No factory default to compare against
      info.push(`[${cycleCode}] '${key}' = ${proposedVal} — no factory default for comparison`);
      continue;
    }

    if (factoryVal === 0) {
      // Zero default — any non-zero value is a 100%+ deviation, warn if significant
      if (Math.abs(proposedVal) > 0.001) {
        warnings.push(
          `[${cycleCode}] '${key}': factory default is 0, proposed = ${proposedVal} — verify intent`
        );
      }
      continue;
    }

    const deviation = Math.abs(proposedVal - factoryVal) / Math.abs(factoryVal);
    if (deviation > WARN_DEVIATION_THRESHOLD) {
      const pct = (deviation * 100).toFixed(1);
      warnings.push(
        `[${cycleCode}] '${key}' deviates ${pct}% from factory default ` +
        `(proposed=${proposedVal}, factory=${factoryVal})`
      );
    }
  }

  // ── 3. Summary info ───────────────────────────────────────────────────────
  const checkedCount = Object.keys(proposed).length;
  const comparedCount = Object.keys(proposed).filter(k => factoryDefaults[k] !== undefined).length;
  info.push(
    `Checked ${checkedCount} proposed params; ${comparedCount} compared against factory defaults`
  );

  return {
    valid: blocks.length === 0,
    warnings,
    blocks,
    info,
  };
}

/**
 * Batch validate multiple parameter sets.
 *
 * @param inputs - Array of validation inputs
 * @returns Map of cycleCode → ValidateCycleDefaultsResult
 */
export function validateCycleDefaultsBatch(
  inputs: ValidateCycleDefaultsInput[]
): Record<string, ValidateCycleDefaultsResult> {
  const results: Record<string, ValidateCycleDefaultsResult> = {};
  for (const input of inputs) {
    results[input.cycleCode] = validateCycleDefaults(input);
  }
  return results;
}
