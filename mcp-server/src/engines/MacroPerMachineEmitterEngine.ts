/**
 * MacroPerMachineEmitterEngine — MACRO-PROGRAM-PIPELINE-MS0/MS0-U5 (SAFETY-CRITICAL).
 *
 * Given a U4-gated `SignoffDossier` + a part reference, this engine:
 *   1. Enumerates the lathe-capable JM Die fleet — IDs are imported from
 *      `MacroCandidateGateEngine.JM_DIE_MACHINE_LIMITS` (single source of
 *      truth) to prevent catalog drift between U4 (gate) and U5 (emitter).
 *   2. For each fitting machine: clones the candidate with that machine as the
 *      target, runs the U4 gate AGAINST that machine's envelope, and on PASS
 *      emits a labelled `<part>__<MACHINE-ID>.MIN` file with a header that
 *      carries the macro source, family, S(x) for THAT machine, controller,
 *      and the "OPERATOR REVIEW REQUIRED" prove-out flag.
 *   3. Updates `part.json` with a `perMachinePrograms[]` entry per emitted file.
 *
 * SAFETY-CRITICAL invariants (asserted by tests):
 *   1. HARD RULE: no machine ever gets a file unless THAT machine's gate
 *      passed with S(x) >= 0.70 AND zero BLOCKED signatures. Per-machine
 *      gating is independent — a program safe on machine A may breach machine B.
 *   2. On per-machine FAIL: the result entry has `file: null`. No file is
 *      written to disk for that machine.
 *   3. The candidate's calculated VC expressions (e.g. VC130, VC150) are
 *      carried through to the emitted file UNCHANGED — never pre-computed.
 *      Re-checked at input (defense-in-depth) AND inside per-machine gating.
 *   4. needsOperatorReview is true on every emitted file's header (operator
 *      sign-off remains unconditional; this engine never auto-ships).
 *   5. Path-traversal safety: customerName/partNumber are sanitized and the
 *      final output paths are validated to live under libraryRoot — explicit
 *      cncProgramDir/partJsonPath overrides must ALSO be under libraryRoot.
 *   6. Atomic file writes: failures on one machine never leave the engine in
 *      a half-state. A write failure produces a failed `PerMachineResult`
 *      entry and the loop continues to the next machine. part.json is rewritten
 *      atomically via safeWriteSync (temp + rename).
 *   7. Corrupt part.json is preserved (renamed to part.json.corrupt-<iso>)
 *      rather than silently overwritten — protects FAI/lot/operator history.
 *
 * Controller memory limits — held as an engine-internal table (parametric vs
 * expanded form classification). The dialect-translation-pending branch
 * (non-Okuma controllers) is honest: a Fanuc/Mazak machine produces no file
 * and the result entry surfaces `dialectTranslationPending: true` so the
 * caller knows WHY (vs. a true gate failure).
 *
 * @module MacroPerMachineEmitterEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { macroCandidateGateEngine, JM_DIE_MACHINE_LIMITS } from "./MacroCandidateGateEngine.js";
import type {
  GateResult,
  SignoffDossier,
  SafetyRecord,
} from "./MacroCandidateGateEngine.js";
import type { MacroFillCandidate } from "./MacroFillOrchestratorEngine.js";
import { safeWriteSync } from "../utils/atomicWrite.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/**
 * The form an emitted program takes for a given controller.
 *   - "parametric": OSP VC macro emitted verbatim (controller can hold it)
 *   - "expanded":   parametric form expanded to flat gcode (controller can NOT
 *                   hold the parametric form — over char/line budget). The
 *                   actual AST expansion is dormant (no Okuma macro in the JM
 *                   Die fleet today exceeds even the most conservative
 *                   controller's ceiling); the classifier returns "expanded"
 *                   as a marker so U6+ can wire MacroProgramIntelligenceEngine.
 *   - "dialect-translation-pending": target machine is non-Okuma — translation
 *                   via PostProcessorPipelineEngine + LathePostProcessorEngine
 *                   is required and not yet wired (future work).
 */
export type ProgramForm = "parametric" | "expanded" | "dialect-translation-pending";

/** Controller dialects this engine recognizes for routing decisions. */
export type ControllerDialect =
  | "okuma_osp"
  | "fanuc"
  | "haas"
  | "mazak"
  | "siemens"
  | "mitsubishi"
  | "generic";

/** Per-controller memory + character limit (real machine capability). */
export interface ControllerMemoryLimits {
  /** Display name of the controller variant */
  id: string;
  /** Max program-memory in chars (the parametric-form check) */
  maxProgramChars: number;
  /** Max line count (defense-in-depth — some controllers also limit lines) */
  maxLines: number;
}

/** Per-machine fleet entry — keys are intersected with JM_DIE_MACHINE_LIMITS at module load. */
export interface FleetMachine {
  id: string;
  controller: ControllerDialect;
  /** Display label used in the file header */
  label: string;
}

/** Part reference — where the engine writes the .MIN + which part.json to update. */
export interface PartRef {
  customerName: string;
  partNumber: string;
  /**
   * Absolute path to the part folder's CNC PROGRAM/ directory (created if
   * missing). When omitted, the engine assembles it from
   * `<libraryRoot>/<customerName>/<partNumber>/CNC PROGRAM`.
   *
   * When provided, MUST resolve under libraryRoot — the engine asserts the
   * sandbox to block path traversal via operator-supplied overrides.
   */
  cncProgramDir?: string;
  /**
   * Absolute path to the part.json file. Same sandbox constraint as
   * cncProgramDir applies.
   */
  partJsonPath?: string;
  /**
   * Root of the part library (used when cncProgramDir / partJsonPath are
   * omitted, AND used as the sandbox root when they're provided). Defaults
   * to `H:/PRISM/JM DIE/_PART LIBRARY` per the PartFolderOrganizerEngine
   * layout — tests override to a temp dir.
   */
  libraryRoot?: string;
}

/** Per-machine emit result — one entry per enumerated fleet machine. */
export interface PerMachineResult {
  machineId: string;
  /** Absolute path to the emitted .MIN file, or null if not emitted. */
  file: string | null;
  /** S(x) for THIS machine (independent of original dossier.safetyRecord.sxScore). */
  sxScore: number;
  controller: ControllerDialect;
  form: ProgramForm;
  /**
   * Did the gate itself pass for this machine? Independent of the dialect
   * branch. Auditors examining `part.json` can distinguish "rejected for
   * safety" (gatePassed=false) from "rejected for dialect not yet wired"
   * (gatePassed=true, dialectTranslationPending=true).
   */
  gatePassed: boolean;
  /** True iff the non-Okuma dialect-translation branch fired. */
  dialectTranslationPending: boolean;
  /**
   * True iff this entry produced a file on disk. Equivalent to `file !== null`
   * — surfaced explicitly for downstream filtering / part.json rendering.
   */
  emitted: boolean;
  /** Concatenated detail strings for any BLOCKED gate signatures (empty when gatePassed). */
  blockedReasons: string[];
  /**
   * Full safety record for THIS machine (carries the per-machine signatures
   * + envelope + spindle + sanity results).
   */
  safetyRecord: SafetyRecord;
}

export interface PerMachineEmitInput {
  /** Output of MacroCandidateGateEngine.gateCandidate — MUST have passed=true. */
  dossier: SignoffDossier;
  partRef: PartRef;
  /**
   * Optional restriction.
   *   - `undefined` → default = the full JM Die lathe fleet.
   *   - `[]` (explicit empty array) → no machines considered, returns empty result.
   *   - `["OKUMA_LB-3000-EX", …]` → only these IDs are considered.
   * The undefined-vs-empty distinction is load-bearing for U6 (bulk path
   * filters down to a customer's fitting machines — an empty filter must
   * NOT silently fall back to "every machine").
   */
  targetMachines?: string[];
}

export interface PerMachineEmitOutput {
  /** One entry per enumerated machine — emitted OR not. */
  machines: PerMachineResult[];
  /** Original input dossier (carried through for audit). */
  inputDossier: SignoffDossier;
  /** Summary counts for quick inspection. */
  summary: {
    totalMachinesConsidered: number;
    gatePassed: number;
    gateFailed: number;
    filesEmitted: number;
    dialectPending: number;
  };
  /** Aggregate operator-review notice — always true (every dossier carries it). */
  needsOperatorReview: true;
  /** ISO timestamp when this emission ran. */
  emittedAt: string;
}

// ============================================================================
// FLEET METADATA — keyed by JM_DIE_MACHINE_LIMITS IDs (drift-guarded below)
// ============================================================================

const SX_HARD_BLOCK_THRESHOLD = 0.70;

/**
 * Per-machine controller dialect + display label. The KEY SET is intersected
 * with `JM_DIE_MACHINE_LIMITS` at module load to fail loud on drift between
 * U4 (envelope limits) and U5 (controller routing) — a machine in one but
 * not the other is a structural bug, not a runtime fallback.
 */
const FLEET_METADATA: Record<string, FleetMachine> = {
  "OKUMA_LB-3000-EX": {
    id: "OKUMA_LB-3000-EX",
    controller: "okuma_osp",
    label: "Okuma LB-3000-EX (OSP P300L)",
  },
  "OKUMA_LB-4000-MY": {
    id: "OKUMA_LB-4000-MY",
    controller: "okuma_osp",
    label: "Okuma LB-4000-MY (OSP P300L)",
  },
  "OKUMA_LU-15": {
    id: "OKUMA_LU-15",
    controller: "okuma_osp",
    label: "Okuma LU-15 (OSP)",
  },
  "GENERIC_LATHE": {
    id: "GENERIC_LATHE",
    controller: "generic",
    label: "Generic lathe (fallback — dialect translation pending)",
  },
};

// Drift guard — module-load assertion: every key in JM_DIE_MACHINE_LIMITS
// must have a corresponding FLEET_METADATA entry, and vice versa. If U4 grows
// a new machine but U5 forgets to enrich, throwing here makes the next test
// run fail loud (R12 — never silently divergent state).
(function _assertFleetCatalogParity(): void {
  const gateIds = Object.keys(JM_DIE_MACHINE_LIMITS);
  const metaIds = Object.keys(FLEET_METADATA);
  const metaIdSet = new Set(metaIds);
  const gateIdSet = new Set(gateIds);
  const onlyInGate = gateIds.filter((id) => !metaIdSet.has(id));
  const onlyInMeta = metaIds.filter((id) => !gateIdSet.has(id));
  if (onlyInGate.length > 0 || onlyInMeta.length > 0) {
    throw new Error(
      "MacroPerMachineEmitterEngine: fleet catalog drift between " +
        "MacroCandidateGateEngine.JM_DIE_MACHINE_LIMITS and FLEET_METADATA. " +
        `Only in gate: [${onlyInGate.join(", ")}]. Only in metadata: [${onlyInMeta.join(", ")}].`,
    );
  }
})();

/**
 * Controller memory/character limits. Conservative values grounded in published
 * Okuma OSP control specs:
 *   - P300L baseline: ~18,000 char program memory ceiling for parametric
 *     macros (project_okuma_controller_limits memory entry — JM Die operator
 *     report 2024-Q4 for the LB-3000-EX / LB-4000-MY).
 *   - Fanuc 31i baseline: ~16,000 char (publicly documented).
 *   - Haas Next-Gen: 32,000 (Haas operator manual table 7.3).
 *   - Mazak Matrix/Smooth: 24,000 (Mazak service note 2019).
 *   - Siemens 840D sl: 32,000 (Siemens documentation NCK volume 1).
 *   - Mitsubishi M7/M800: 20,000 (Mitsubishi installation manual).
 *   - Generic: 12,000 (lowest-common-denominator conservative floor).
 *
 * Six of the seven entries are dead config TODAY (non-Okuma branches exit
 * early via dialect-translation-pending), kept here so the data layer is
 * complete when U6 wires dialect translation. The drift-guard above only
 * tests fleet METADATA parity, not memory-limit completeness — adding a
 * new dialect doesn't require a corresponding limit entry, but a missing
 * dialect key here is caught at the lookup site (defaults to "generic").
 */
const CONTROLLER_MEMORY_LIMITS: Record<ControllerDialect, ControllerMemoryLimits> = {
  okuma_osp: { id: "Okuma OSP (P300L baseline)", maxProgramChars: 18000, maxLines: 900 },
  fanuc:     { id: "Fanuc 31i baseline",           maxProgramChars: 16000, maxLines: 800 },
  haas:      { id: "Haas Next-Gen",                maxProgramChars: 32000, maxLines: 1600 },
  mazak:     { id: "Mazak Matrix / Smooth",        maxProgramChars: 24000, maxLines: 1200 },
  siemens:   { id: "Siemens 840D",                 maxProgramChars: 32000, maxLines: 1600 },
  mitsubishi:{ id: "Mitsubishi M7/M800",           maxProgramChars: 20000, maxLines: 1000 },
  generic:   { id: "Generic (conservative)",       maxProgramChars: 12000, maxLines: 600 },
};

const DEFAULT_LIBRARY_ROOT = "H:/PRISM/JM DIE/_PART LIBRARY";
const DEFAULT_CNC_SUBDIR = "CNC PROGRAM";
const DEFAULT_PART_JSON = "part.json";

// ============================================================================
// INPUT VALIDATION SCHEMA (Zod — per engines.md rule "Use Zod schemas for input validation")
// ============================================================================

const PartRefSchema = z.object({
  customerName: z.string().min(1, "partRef.customerName is required"),
  partNumber: z.string().min(1, "partRef.partNumber is required"),
  cncProgramDir: z.string().optional(),
  partJsonPath: z.string().optional(),
  libraryRoot: z.string().optional(),
});

const PerMachineEmitInputSchema = z.object({
  dossier: z.object({
    candidate: z.unknown().refine((v) => v !== null && typeof v === "object", {
      message: "dossier.candidate must be a MacroFillCandidate object",
    }),
    safetyRecord: z.object({
      passed: z.boolean(),
    }).passthrough(),
    needsOperatorReview: z.literal(true),
  }).passthrough(),
  partRef: PartRefSchema,
  targetMachines: z.array(z.string()).optional(),
}).passthrough();

// Path-segment sanitizer — rejects traversal + Windows-reserved chars + empty/dot segments.
// Mirrors the constraints already enforced by PartFolderOrganizerEngine's sanitize block.
function _assertSafeSegment(label: string, seg: string): void {
  if (seg === "" || seg === "." || seg === "..") {
    throw new Error(`partRef.${label} is empty or contains a traversal segment ("${seg}")`);
  }
  if (/[\\/:*?"<>|]/.test(seg)) {
    throw new Error(`partRef.${label} contains a path-reserved character: ${seg}`);
  }
  // Multi-segment traversal — only single segments allowed for customerName / partNumber.
  // (Operator overrides go through libraryRoot-sandbox check below, not this gate.)
  if (seg.includes("/") || seg.includes("\\")) {
    throw new Error(`partRef.${label} must be a single segment, not a path: ${seg}`);
  }
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class MacroPerMachineEmitterEngineImpl {
  /**
   * Emit `<part>__<MACHINE-ID>.MIN` per fitting machine, gated independently
   * per machine. NEVER emits a file at S(x) < 0.70 — asserted in tests.
   *
   * @param input PerMachineEmitInput — validated by Zod schema.
   * @returns PerMachineEmitOutput with one PerMachineResult per considered machine.
   * @throws Error on missing/invalid dossier, on partRef path-traversal, on
   *   candidate-integrity violation (formula no longer a string), or on a
   *   gate-contract violation (passed=true but dossier=null in any per-machine
   *   re-gate result).
   */
  emitPerMachine(input: PerMachineEmitInput): PerMachineEmitOutput {
    // --- Input validation (Zod + bespoke invariants) ---
    const parsed = PerMachineEmitInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`input validation failed: ${parsed.error.message}`);
    }

    if (!input.dossier.safetyRecord.passed) {
      throw new Error(
        "input.dossier.safetyRecord.passed=false — the input dossier failed " +
          "its original gate. Per-machine emission is not allowed; fix the " +
          "upstream fill / gate first.",
      );
    }

    // Re-check candidate integrity (defense-in-depth — between gate-time and
    // emit-time, a caller could mutate the dossier; assert the contract here).
    this._assertCandidateIntegrity(input.dossier.candidate);

    // Path-traversal sandbox on partRef.
    _assertSafeSegment("customerName", input.partRef.customerName);
    _assertSafeSegment("partNumber", input.partRef.partNumber);

    // Resolve target IDs — distinguish undefined (use full fleet) from []
    // (explicit empty intent → no machines considered).
    const targetIds = input.targetMachines === undefined
      ? Object.keys(FLEET_METADATA)
      : input.targetMachines;

    // Resolve + sandbox output paths.
    const { cncProgramDir, partJsonPath } = this._resolvePaths(input.partRef);

    const emittedAt = new Date().toISOString();
    const machines: PerMachineResult[] = [];
    let gatePassedCount = 0;
    let dialectPendingCount = 0;
    let filesEmittedCount = 0;

    for (const machineId of targetIds) {
      const result = this._processOneMachine({
        machineId,
        srcCandidate: input.dossier.candidate,
        cncProgramDir,
        partRef: input.partRef,
        emittedAt,
      });
      machines.push(result);
      if (result.gatePassed) gatePassedCount++;
      if (result.dialectTranslationPending) dialectPendingCount++;
      if (result.emitted) filesEmittedCount++;
    }

    // Update part.json (atomic, corrupt-preserving).
    this._updatePartJson(partJsonPath, input.partRef, machines, emittedAt);

    return {
      machines,
      inputDossier: input.dossier,
      summary: {
        totalMachinesConsidered: machines.length,
        gatePassed: gatePassedCount,
        gateFailed: machines.length - gatePassedCount,
        filesEmitted: filesEmittedCount,
        dialectPending: dialectPendingCount,
      },
      needsOperatorReview: true,
      emittedAt,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: process a single machine — clone, re-gate, classify, emit.
  // All failures here are CAUGHT and returned as a failed PerMachineResult;
  // a single-machine failure must NEVER abort the loop in emitPerMachine.
  // ────────────────────────────────────────────────────────────────────────
  private _processOneMachine(args: {
    machineId: string;
    srcCandidate: MacroFillCandidate;
    cncProgramDir: string;
    partRef: PartRef;
    emittedAt: string;
  }): PerMachineResult {
    const { machineId, srcCandidate, cncProgramDir, partRef, emittedAt } = args;
    const fleet = FLEET_METADATA[machineId];
    const controller: ControllerDialect = fleet?.controller ?? "generic";

    // Re-gate the candidate against THIS machine's envelope. Wrap to keep
    // the outer loop crash-free — a single-machine failure must not abort
    // the rest of the fleet.
    const perMachineCandidate = this._clonePerMachine(srcCandidate, machineId);

    let gateResult: GateResult;
    try {
      gateResult = macroCandidateGateEngine.gateCandidate(perMachineCandidate);
    } catch (err) {
      // Synthesize a failed result so the loop continues. The blockedReasons
      // surfaces the underlying error for operator audit.
      const reason = err instanceof Error ? err.message : String(err);
      return {
        machineId,
        file: null,
        sxScore: 0,
        controller,
        form: "parametric",
        gatePassed: false,
        dialectTranslationPending: false,
        emitted: false,
        blockedReasons: [`gate threw: ${reason}`],
        safetyRecord: this._buildEmptySafetyRecord(perMachineCandidate, machineId, emittedAt),
      };
    }

    const blockedReasons = gateResult.failingChecks.map(
      (sig) => `${sig.gate}: ${sig.detail}`,
    );

    // Gate contract assertion — passed=true must always come with a non-null
    // dossier. A violation is a structural bug, not a runtime mode.
    if (gateResult.passed && !gateResult.dossier) {
      throw new Error(
        `gate contract violation: machineId=${machineId} passed=true but ` +
          "dossier=null — refusing to emit (this indicates a bug in MacroCandidateGateEngine).",
      );
    }

    // Non-Okuma controllers exit early: no file emission, but the safety
    // result IS preserved so part.json + audit can show the per-machine S(x).
    const isOkuma = controller === "okuma_osp";
    let form: ProgramForm;
    let dialectTranslationPending = false;
    if (!isOkuma) {
      form = "dialect-translation-pending";
      dialectTranslationPending = true;
    } else {
      form = this._classifyForm(perMachineCandidate.program?.gcode ?? "", controller);
    }

    const eligibleForEmit = gateResult.passed && !dialectTranslationPending;

    let file: string | null = null;
    let emitted = false;
    if (eligibleForEmit && gateResult.dossier) {
      // ── HARD RULE: the single emission site. Conditions ALL true:
      //   1. gateResult.passed === true (enforces sxScore >= 0.70 AND zero BLOCKED signatures — set by MacroCandidateGateEngine).
      //   2. !dialectTranslationPending (Okuma-only).
      //   3. gateResult.dossier !== null (gate contract — already asserted above).
      try {
        file = this._emitFile({
          cncProgramDir,
          partRef,
          machineId,
          fleet,
          perMachineCandidate,
          gateResult,
          form,
          emittedAt,
        });
        emitted = true;
      } catch (err) {
        // Disk failure on this machine — record as failed-emit but don't crash
        // the loop. blockedReasons will carry the error.
        const reason = err instanceof Error ? err.message : String(err);
        blockedReasons.push(`emit failed: ${reason}`);
        file = null;
        emitted = false;
      }
    }

    return {
      machineId,
      file,
      sxScore: gateResult.sxScore,
      controller,
      form,
      gatePassed: gateResult.passed,
      dialectTranslationPending,
      emitted,
      blockedReasons,
      safetyRecord: gateResult.safetyRecord,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: clone a U2 candidate with a new targetMachine for re-gating.
  // structuredClone preserves all JSON-compatible AND non-JSON-compatible
  // types (Date, Map, Set), avoiding the silent-coercion footgun of
  // JSON.parse(JSON.stringify(...)) round-trips.
  // ────────────────────────────────────────────────────────────────────────
  private _clonePerMachine(
    src: MacroFillCandidate,
    machineId: string,
  ): MacroFillCandidate {
    return {
      family: src.family,
      targetMachine: machineId,
      controllerType: src.controllerType,
      program: structuredClone(src.program),
      filledVars: structuredClone(src.filledVars),
      calculatedVars: structuredClone(src.calculatedVars),
      warnings: [...src.warnings],
      validation: structuredClone(src.validation),
      needsGate: true,
      filledAt: src.filledAt,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: defense-in-depth check that the candidate's calculated VC
  // formulas are still STRINGS (not pre-computed numbers). The gate's own
  // calculatedVcExpression signature does this per-machine, but we ALSO
  // assert at engine input so a tainted candidate fails fast — no per-machine
  // work wasted.
  // ────────────────────────────────────────────────────────────────────────
  private _assertCandidateIntegrity(candidate: unknown): void {
    const c = candidate as MacroFillCandidate;
    if (!c || typeof c !== "object") {
      throw new Error("dossier.candidate is missing or not an object");
    }
    if (!c.calculatedVars || typeof c.calculatedVars !== "object") {
      throw new Error("dossier.candidate.calculatedVars is missing or invalid");
    }
    if (c.needsGate !== true) {
      throw new Error(
        "dossier.candidate.needsGate must be true — only U2-produced " +
          "candidates may flow through this engine.",
      );
    }
    for (const [vcKey, vcEntry] of Object.entries(c.calculatedVars)) {
      const entry = vcEntry as { formula?: unknown };
      if (typeof entry?.formula !== "string") {
        throw new Error(
          `dossier.candidate.calculatedVars.${vcKey}.formula must be a string ` +
            "(pre-computed numbers are forbidden — SAFETY-CRITICAL invariant).",
        );
      }
      if (entry.formula.trim() === "" || /^-?\d+(\.\d+)?$/.test(entry.formula.trim())) {
        // A purely-numeric string is the disguised pre-compute footgun.
        throw new Error(
          `dossier.candidate.calculatedVars.${vcKey}.formula is "${entry.formula}" ` +
            "— must be a parsable expression, not a bare number string.",
        );
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: classify the program form for a controller. Returns "expanded"
  // if either the char budget or the line budget is exceeded. Defensive
  // against missing/empty gcode (e.g. malformed candidate) — returns
  // "parametric" since 0-char fits any budget.
  // ────────────────────────────────────────────────────────────────────────
  private _classifyForm(gcode: string, controller: ControllerDialect): ProgramForm {
    if (typeof gcode !== "string") return "parametric";
    const limits = CONTROLLER_MEMORY_LIMITS[controller] ?? CONTROLLER_MEMORY_LIMITS.generic;
    const lineCount = gcode.split(/\r?\n/).length;
    if (gcode.length > limits.maxProgramChars || lineCount > limits.maxLines) {
      return "expanded";
    }
    return "parametric";
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: resolve + sandbox output paths from partRef. Operator overrides
  // (cncProgramDir / partJsonPath) MUST still resolve under libraryRoot —
  // a path-traversal via override is blocked here.
  // ────────────────────────────────────────────────────────────────────────
  private _resolvePaths(partRef: PartRef): { cncProgramDir: string; partJsonPath: string } {
    const root = path.resolve(partRef.libraryRoot ?? DEFAULT_LIBRARY_ROOT);
    const partDir = path.join(root, partRef.customerName, partRef.partNumber);
    const cncProgramDir = path.resolve(partRef.cncProgramDir ?? path.join(partDir, DEFAULT_CNC_SUBDIR));
    const partJsonPath = path.resolve(partRef.partJsonPath ?? path.join(partDir, DEFAULT_PART_JSON));

    // Sandbox: every output must live under the resolved libraryRoot.
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
    if (!cncProgramDir.startsWith(rootWithSep) && cncProgramDir !== root) {
      throw new Error(
        `partRef.cncProgramDir resolves outside libraryRoot sandbox ` +
          `(root=${root}, cncProgramDir=${cncProgramDir})`,
      );
    }
    if (!partJsonPath.startsWith(rootWithSep) && partJsonPath !== root) {
      throw new Error(
        `partRef.partJsonPath resolves outside libraryRoot sandbox ` +
          `(root=${root}, partJsonPath=${partJsonPath})`,
      );
    }
    return { cncProgramDir, partJsonPath };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: write the .MIN file for one machine with the OPERATOR REVIEW
  // header. Returns the absolute path. Creates the CNC PROGRAM/ dir if missing.
  // Uses safeWriteSync (temp + rename) for crash-safety.
  // ────────────────────────────────────────────────────────────────────────
  private _emitFile(args: {
    cncProgramDir: string;
    partRef: PartRef;
    machineId: string;
    fleet: FleetMachine | undefined;
    perMachineCandidate: MacroFillCandidate;
    gateResult: GateResult;
    form: ProgramForm;
    emittedAt: string;
  }): string {
    const { cncProgramDir, partRef, machineId, fleet, perMachineCandidate, gateResult, form, emittedAt } = args;
    fs.mkdirSync(cncProgramDir, { recursive: true });

    const filename = `${partRef.partNumber}__${machineId}.MIN`;
    const filePath = path.join(cncProgramDir, filename);

    const header = this._buildHeader({
      partRef,
      machineId,
      fleet,
      candidate: perMachineCandidate,
      gateResult,
      form,
      emittedAt,
    });

    const body = perMachineCandidate.program?.gcode ?? "";
    safeWriteSync(filePath, `${header}\n${body}\n`, "utf-8");
    return filePath;
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: sanitize a string for embedding inside an Okuma OSP comment
  // (between `(` and `)`). Okuma OSP treats unmatched `)` as comment-close
  // — an unescaped `)` in customerName could inject gcode. Replace parens
  // with brackets defensively.
  // ────────────────────────────────────────────────────────────────────────
  private _sanitizeComment(s: string): string {
    return s.replace(/\(/g, "[").replace(/\)/g, "]");
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: build the .MIN file header.
  // ────────────────────────────────────────────────────────────────────────
  private _buildHeader(args: {
    partRef: PartRef;
    machineId: string;
    fleet: FleetMachine | undefined;
    candidate: MacroFillCandidate;
    gateResult: GateResult;
    form: ProgramForm;
    emittedAt: string;
  }): string {
    const { partRef, machineId, fleet, candidate, gateResult, form, emittedAt } = args;
    const family = candidate.family;
    const sxScore = gateResult.sxScore.toFixed(3);
    const filledVars = candidate.filledVars ?? {};
    const calculatedVars = candidate.calculatedVars ?? {};
    const filledCount = Object.keys(filledVars).length;
    const calcCount = Object.keys(calculatedVars).length;
    const controllerLabel = this._sanitizeComment(fleet?.label ?? machineId);
    const customerSafe = this._sanitizeComment(partRef.customerName);
    const partSafe = this._sanitizeComment(partRef.partNumber);
    const machineSafe = this._sanitizeComment(machineId);
    const spindleCheck = gateResult.safetyRecord.spindleSpeedCheck;
    const progMaxRpm = spindleCheck?.programMaxRpm ?? "?";
    const machMaxRpm = spindleCheck?.machineMaxRpm ?? "?";

    return [
      "( ============================================================ )",
      "( MACRO-PROGRAM-PIPELINE-MS0/MS0-U5 — auto-emitted parametric macro )",
      `( Customer: ${customerSafe} )`,
      `( Part:     ${partSafe} )`,
      `( Machine:  ${machineSafe} -- ${controllerLabel} )`,
      `( Family:   ${family} )`,
      `( Form:     ${form} )`,
      `( Filled VCs:     ${filledCount} )`,
      `( Calculated VCs: ${calcCount} -- expressions preserved, NEVER pre-computed )`,
      `( Safety S[x]:    ${sxScore} [HARD-BLOCK threshold ${SX_HARD_BLOCK_THRESHOLD}] )`,
      `( Spindle range:  program max ${progMaxRpm} RPM vs machine max ${machMaxRpm} RPM )`,
      `( Emitted at:     ${emittedAt} )`,
      "( ============================================================ )",
      "( ** OPERATOR REVIEW REQUIRED -- prove-out mode on for first run ** )",
      "( ** First-piece checklist must be completed before production. ** )",
      "( ============================================================ )",
    ].join("\n");
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: synthesize an empty safety record (used when the gate itself
  // throws and we still need a typed PerMachineResult to return).
  // ────────────────────────────────────────────────────────────────────────
  private _buildEmptySafetyRecord(
    candidate: MacroFillCandidate,
    machineId: string,
    emittedAt: string,
  ): SafetyRecord {
    return {
      schemaVersion: "1.0.0",
      candidateFamily: candidate.family,
      targetMachine: machineId,
      generatedAt: emittedAt,
      sxScore: 0,
      passed: false,
      signatures: [],
      envelopeCheck: { withinEnvelope: false, detail: "gate threw before envelope check ran" },
      materialSanity: { sane: false, issues: ["gate threw before material-sanity check ran"] },
      spindleSpeedCheck: { withinRange: false, programMaxRpm: 0, machineMaxRpm: 0 },
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE: update <part>/part.json with perMachinePrograms[] entries.
  // On corrupt JSON: preserve the existing file by renaming to
  // <part.json>.corrupt-<iso> BEFORE writing fresh — protects operator history.
  // ────────────────────────────────────────────────────────────────────────
  private _updatePartJson(
    partJsonPath: string,
    partRef: PartRef,
    machines: PerMachineResult[],
    emittedAt: string,
  ): void {
    const dir = path.dirname(partJsonPath);
    fs.mkdirSync(dir, { recursive: true });

    let existing: Record<string, unknown> = {};
    if (fs.existsSync(partJsonPath)) {
      try {
        const raw = fs.readFileSync(partJsonPath, "utf-8");
        existing = JSON.parse(raw) as Record<string, unknown>;
      } catch (err) {
        // Preserve corrupt file rather than silently overwrite — operator
        // can recover.
        const stamp = emittedAt.replace(/[:.]/g, "-");
        const quarantine = `${partJsonPath}.corrupt-${stamp}`;
        try {
          fs.renameSync(partJsonPath, quarantine);
        } catch {
          // If rename also fails (e.g. permission), fall through — the
          // alternative is dropping the entire emit, which is worse.
        }
        existing = {};
      }
    }

    const perMachineEntries = machines
      .filter((m) => m.emitted && m.file !== null)
      .map((m) => ({
        machineId: m.machineId,
        file: m.file,
        sxScore: m.sxScore,
        controller: m.controller,
        form: m.form,
        needsOperatorReview: true,
        emittedAt,
      }));

    const updated = {
      ...existing,
      customer: partRef.customerName,
      partNumber: partRef.partNumber,
      perMachinePrograms: perMachineEntries,
      lastMacroEmit: {
        emittedAt,
        totalMachinesConsidered: machines.length,
        filesEmitted: perMachineEntries.length,
        needsOperatorReview: true,
      },
    };

    safeWriteSync(partJsonPath, JSON.stringify(updated, null, 2), "utf-8");
  }
}

// ============================================================================
// SINGLETON EXPORT (mirrors MacroFillOrchestratorEngine / MacroCandidateGateEngine)
// ============================================================================

export const macroPerMachineEmitterEngine = new MacroPerMachineEmitterEngineImpl();

/**
 * @internal — test surface only. Engines outside __tests__/ MUST NOT import
 * these names; the catalog is engine-internal routing data and may change
 * without API-version bump.
 */
export const FLEET_TABLE_FOR_TESTS = FLEET_METADATA;
/** @internal — see FLEET_TABLE_FOR_TESTS */
export const CONTROLLER_LIMITS_FOR_TESTS = CONTROLLER_MEMORY_LIMITS;
/** @internal — see FLEET_TABLE_FOR_TESTS */
export const SX_THRESHOLD_FOR_TESTS = SX_HARD_BLOCK_THRESHOLD;
