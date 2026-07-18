// CAMDriveGateEngine — the validate→actuate safety fuse for live CAM drive (slot:kilo)
//
// WHY THIS EXISTS
//   PRISM can drive a live Fusion 360 seat (Fusion360LiveBridgeEngine →
//   :18360 add-in → real adsk.cam create/set/generate/post). Nothing may
//   actuate a live machine with parameters that haven't been validated against
//   the grounded catalog — that is kilo's hard refuse (soul:
//   "emitting-program-without-pmi-validation"). This engine is the single fuse
//   every drive path (camDispatcher cam_drive_* actions AND
//   AutoProgramOrchestratorEngine) calls BEFORE create_operation / post.
//
// WHAT IT DOES (pure, sync — no I/O of its own beyond the catalog's lazy read)
//   gate({system, operation, params}) → DriveGateVerdict:
//     - delegates param validity to CAMCatalogQueryEngine.validateOperation
//       (the grounded catalog: unknown / missingRequired / outOfRange / invalidEnum)
//     - ADDS a non-finite guard: validateOperation coerces via num() and SKIPS
//       NaN/Infinity (won't flag them) — but a NaN/Infinity numeric param driven
//       into a live op is unsafe G-code. The gate blocks any non-finite number.
//     - fail-safe: if validation itself throws, the verdict is BLOCKED (never
//       actuate on an un-validatable input).
//
// DESIGN NOTES
//   - `unknown` (extra provided keys not in the catalog) is ADVISORY by default
//     (allowUnknownParams=true): the catalogs are ~55-59% complete, so a real
//     Fusion-native param the catalog hasn't enumerated yet must not hard-block a
//     legitimate drive — it is surfaced in violations.unknownParams as a flag.
//     Hard errors (missingRequired/outOfRange/invalidEnum/non-finite/unknown-op)
//     ALWAYS block. Pass allowUnknownParams=false for strict catalog-closed mode.
//   - knownParamCount===0 means the operation is unknown to the catalog → BLOCK
//     (we cannot vouch for any param of an op we don't know).

import { camCatalogQueryEngine } from "./CAMCatalogQueryEngine.js";

/** The subset of CAMCatalogQueryEngine.validateOperation's result the gate consumes. */
export interface CatalogValidation {
  knownParamCount: number;
  unknown: string[];
  missingRequired: string[];
  outOfRange: { name: string; value: number; min: number | null; max: number | null }[];
  invalidEnum: { name: string; value: unknown; allowed: readonly unknown[] }[];
}

/** Injectable validator (defaults to the real grounded catalog). Enables deterministic unit tests. */
export type ValidateOperationFn = (
  system: string,
  operation: string,
  provided: Record<string, unknown>
) => CatalogValidation;

export interface DriveGateInput {
  /** catalog system key: "fusion360" | "hypermill" | "mastercam" (any data/cam-functions/<dir>) */
  system: string;
  /** catalog operation id (NOT the vendor operation_type) — what we validate against */
  operation: string;
  /** proposed machining parameter map (catalog param names → values) */
  params?: Record<string, unknown>;
  /** when true (default) extra keys the catalog hasn't enumerated are flagged, not blocked */
  allowUnknownParams?: boolean;
}

export interface DriveGateVerdict {
  clearedToActuate: boolean;
  system: string;
  operation: string;
  knownParamCount: number;
  violations: {
    missingRequired: string[];
    outOfRange: { name: string; value: number; min: number | null; max: number | null }[];
    invalidEnum: { name: string; value: unknown; allowed: readonly unknown[] }[];
    nonFinite: { name: string; value: number }[];
    unknownParams: string[];
  };
  /** human-readable summary of why it cleared or blocked */
  reason: string;
}

export class CAMDriveGateEngine {
  /**
   * @param validateOp injectable catalog validator. Defaults to the real
   *   grounded catalog (CAMCatalogQueryEngine). Tests inject a deterministic
   *   fake to exercise every verdict branch without depending on catalog contents.
   */
  constructor(
    private readonly validateOp: ValidateOperationFn = (system, operation, provided) =>
      camCatalogQueryEngine.validateOperation(system, operation, provided)
  ) {}

  /**
   * Validate a proposed CAM operation against the grounded catalog and decide
   * whether it is cleared to actuate a live seat. Pure + sync. Never throws —
   * an internal failure resolves to a BLOCKED verdict (fail-safe).
   */
  gate(input: DriveGateInput): DriveGateVerdict {
    const system = String(input?.system ?? "");
    const operation = String(input?.operation ?? "");
    const params =
      input?.params && typeof input.params === "object" && !Array.isArray(input.params)
        ? (input.params as Record<string, unknown>)
        : {};
    const allowUnknownParams = input?.allowUnknownParams !== false; // default true

    // Non-finite guard FIRST — independent of the catalog, always unsafe.
    // Catches both JS numbers (NaN/±Infinity) AND numeric-looking STRINGS that
    // coerce to non-finite ("Infinity", "-Infinity", "1e999"). The string check
    // is gated on a numeric-shape regex so legit string enum values like
    // "climb"/"Z+" (which Number()→NaN) are NOT false-flagged. (Closes the
    // gate↔catalog asymmetry: the catalog's num() returns null for non-finite
    // and silently skips its range check, so without this a non-finite value
    // could reach a live machine.)
    const nonFinite: { name: string; value: number }[] = [];
    for (const [name, value] of Object.entries(params)) {
      if (typeof value === "number") {
        if (!Number.isFinite(value)) nonFinite.push({ name, value });
      } else if (typeof value === "string") {
        const t = value.trim();
        const looksNumeric = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) || /^[-+]?infinity$/i.test(t);
        if (looksNumeric) {
          const n = Number(t);
          if (!Number.isFinite(n)) nonFinite.push({ name, value: n });
        }
      }
    }

    if (!system || !operation) {
      return this.blocked(system, operation, 0, {
        missingRequired: [],
        outOfRange: [],
        invalidEnum: [],
        nonFinite,
        unknownParams: [],
      }, "missing system or operation — cannot validate, refusing to actuate");
    }

    let v: CatalogValidation;
    try {
      v = this.validateOp(system, operation, params);
    } catch (e) {
      // fail-safe: an un-validatable input is never cleared.
      return this.blocked(system, operation, 0, {
        missingRequired: [],
        outOfRange: [],
        invalidEnum: [],
        nonFinite,
        unknownParams: [],
      }, `catalog validation threw (${(e as Error)?.message ?? e}) — refusing to actuate`);
    }

    const violations = {
      missingRequired: v.missingRequired ?? [],
      outOfRange: v.outOfRange ?? [],
      invalidEnum: v.invalidEnum ?? [],
      nonFinite,
      unknownParams: v.unknown ?? [],
    };

    const hardError =
      v.knownParamCount === 0 ||
      violations.missingRequired.length > 0 ||
      violations.outOfRange.length > 0 ||
      violations.invalidEnum.length > 0 ||
      violations.nonFinite.length > 0 ||
      (!allowUnknownParams && violations.unknownParams.length > 0);

    if (hardError) {
      return this.blocked(system, operation, v.knownParamCount, violations, this.summarize(v.knownParamCount, violations, allowUnknownParams));
    }

    const flag =
      violations.unknownParams.length > 0
        ? ` (cleared; ${violations.unknownParams.length} unrecognized param(s) flagged: ${violations.unknownParams.join(", ")})`
        : "";
    return {
      clearedToActuate: true,
      system,
      operation,
      knownParamCount: v.knownParamCount,
      violations,
      reason: `${system}:${operation} cleared to actuate — ${v.knownParamCount} catalog params${flag}`,
    };
  }

  private blocked(
    system: string,
    operation: string,
    knownParamCount: number,
    violations: DriveGateVerdict["violations"],
    reason: string
  ): DriveGateVerdict {
    return { clearedToActuate: false, system, operation, knownParamCount, violations, reason };
  }

  private summarize(
    knownParamCount: number,
    violations: DriveGateVerdict["violations"],
    allowUnknownParams: boolean
  ): string {
    if (knownParamCount === 0) return "operation not found in catalog — refusing to actuate an unknown op";
    const parts: string[] = [];
    if (violations.nonFinite.length) parts.push(`non-finite: ${violations.nonFinite.map((n) => n.name).join(",")}`);
    if (violations.missingRequired.length) parts.push(`missing: ${violations.missingRequired.join(",")}`);
    if (violations.outOfRange.length) parts.push(`out-of-range: ${violations.outOfRange.map((o) => o.name).join(",")}`);
    if (violations.invalidEnum.length) parts.push(`invalid-enum: ${violations.invalidEnum.map((e) => e.name).join(",")}`);
    if (!allowUnknownParams && violations.unknownParams.length) parts.push(`unknown: ${violations.unknownParams.join(",")}`);
    return `blocked — ${parts.join("; ") || "validation failed"}`;
  }
}

export const camDriveGateEngine = new CAMDriveGateEngine();
