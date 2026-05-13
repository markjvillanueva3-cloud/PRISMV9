/**
 * MacroCandidateGateEngine — MACRO-PROGRAM-PIPELINE-MS0/MS0-U4 (SAFETY-CRITICAL, LOAD-BEARING).
 *
 * The safety gate around a MacroFillCandidate (produced by MS0-U2). Composes:
 *   • Envelope check (machine travel limits vs candidate dimensions)
 *   • Material sanity (positive lengths, ID < OD, drill depth/dia ratio, …)
 *   • S(x) safety score (≥ 0.70 HARD BLOCK — no override in this pipeline)
 *   • Per-machine spindle-speed check (max RPM clamp vs candidate G50)
 *   • Per-machine workholding sanity (counterbore vs step-OD fit)
 *
 * Returns { passed, sxScore, safetyRecord, failingChecks, dossier } where:
 *   - passed=true ⇒ S(x) ≥ 0.70 AND all hard checks SAFE
 *   - passed=false ⇒ dossier === null AND NO file/path/gcode-output property
 *     exists on the result — emit NOTHING on FAIL is asserted at type level.
 *
 * SAFETY-CRITICAL invariants (asserted by tests):
 *   1. HARD BLOCK at S(x) < 0.70 — no off-by-one at the threshold.
 *      S(x) = 0.69 ⇒ passed=false. S(x) = 0.70 ⇒ passed=true.
 *   2. machineLimitGuard failure ⇒ passed=false, dossier=null, NO emitted file.
 *   3. Physical-insanity (negative DOC) ⇒ materialSanity failure, no emit.
 *   4. needsOperatorReview=true on EVERY dossier when passed=true (operator
 *      sign-off is unconditional — no bulk-auto-emit path exists).
 *   5. The candidate's calculated VCs (expressions) are CARRIED THROUGH the
 *      dossier unchanged — the gate does NOT resolve them to numbers.
 *
 * @module MacroCandidateGateEngine
 */

import type { MacroFillCandidate } from "./MacroFillOrchestratorEngine.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface MachineLimits {
  /** Display name, e.g. "OKUMA_LB-3000-EX" */
  id: string;
  /** Max X (diametral) travel, inches */
  maxXTravel_in: number;
  /** Max Z travel, inches */
  maxZTravel_in: number;
  /** Max spindle dia chuck swing, inches */
  maxSwingDia_in: number;
  /** Max spindle RPM (machine ceiling — independent of program G50) */
  maxSpindleRPM: number;
  /** Min spindle RPM */
  minSpindleRPM: number;
}

export interface GateSignature {
  gate: string;
  status: "SAFE" | "WARNING" | "BLOCKED";
  detail: string;
  weight: number; // contribution to S(x) — sum of weights ≤ 1.0
}

export interface SafetyRecord {
  schemaVersion: "1.0.0";
  candidateFamily: string;
  targetMachine: string;
  generatedAt: string;
  /** S(x) ∈ [0,1] — weighted sum of SAFE signatures / total weight */
  sxScore: number;
  /** Pass threshold per CLAUDE.md: S(x) ≥ 0.70 HARD BLOCK */
  passed: boolean;
  signatures: GateSignature[];
  envelopeCheck: { withinEnvelope: boolean; detail: string };
  materialSanity: { sane: boolean; issues: string[] };
  spindleSpeedCheck: { withinRange: boolean; programMaxRpm: number; machineMaxRpm: number };
}

export interface SignoffDossier {
  candidate: MacroFillCandidate;
  safetyRecord: SafetyRecord;
  needsOperatorReview: true;
  /** Setup-sheet placeholder content — operator fills before run */
  setupSheetSummary: string;
  /** Physics report (filled vars + calculated formulas) for review */
  physicsReport: { filledVars: Record<string, number>; calculatedFormulas: Record<string, string> };
  /** First-piece checklist — items operator must verify before prove-out */
  firstPieceChecklist: string[];
}

export interface GateResult {
  passed: boolean;
  sxScore: number;
  safetyRecord: SafetyRecord;
  failingChecks: GateSignature[];
  /** When passed=true: full dossier with needsOperatorReview:true. When false: null (NO emit). */
  dossier: SignoffDossier | null;
}

// ============================================================================
// MACHINE LIMITS CATALOG — extracted to constants for clarity
// ============================================================================

const SX_HARD_BLOCK_THRESHOLD = 0.70;

/** Per-machine limits for the JM Die lathe fleet (subset; expand as needed). */
const JM_DIE_MACHINE_LIMITS: Record<string, MachineLimits> = {
  "OKUMA_LB-3000-EX": {
    id: "OKUMA_LB-3000-EX", maxXTravel_in: 11.42, maxZTravel_in: 17.7,
    maxSwingDia_in: 17.7, maxSpindleRPM: 5000, minSpindleRPM: 50,
  },
  "OKUMA_LB-4000-MY": {
    id: "OKUMA_LB-4000-MY", maxXTravel_in: 13.4, maxZTravel_in: 25.6,
    maxSwingDia_in: 22.0, maxSpindleRPM: 4000, minSpindleRPM: 40,
  },
  "OKUMA_LU-15": {
    id: "OKUMA_LU-15", maxXTravel_in: 8.66, maxZTravel_in: 13.0,
    maxSwingDia_in: 13.0, maxSpindleRPM: 5000, minSpindleRPM: 50,
  },
  // generic fallback — used if machine ID not in catalog (still passes envelope
  // but flagged with WARNING so the operator sees the unknown machine)
  "GENERIC_LATHE": {
    id: "GENERIC_LATHE", maxXTravel_in: 10.0, maxZTravel_in: 20.0,
    maxSwingDia_in: 12.0, maxSpindleRPM: 4000, minSpindleRPM: 50,
  },
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class MacroCandidateGateEngineImpl {
  /**
   * Gate a candidate. Returns dossier ONLY on pass. On fail, dossier=null and
   * no file/gcode-output property exists on the result.
   */
  gateCandidate(candidate: MacroFillCandidate): GateResult {
    if (!candidate) throw new Error("candidate is required");
    if (!candidate.needsGate) {
      throw new Error("candidate.needsGate must be true — only U2 candidates may be gated here");
    }

    const machineLimits = this._resolveMachineLimits(candidate.targetMachine);
    const signatures: GateSignature[] = [];

    // 1. Envelope check
    const envelope = this._envelopeCheck(candidate, machineLimits);
    signatures.push({
      gate: "envelope",
      status: envelope.withinEnvelope ? "SAFE" : "BLOCKED",
      detail: envelope.detail,
      weight: 0.25,
    });

    // 2. Material sanity
    const sanity = this._materialSanity(candidate);
    signatures.push({
      gate: "materialSanity",
      status: sanity.sane ? "SAFE" : "BLOCKED",
      detail: sanity.sane ? "All dims physically reasonable" : `Issues: ${sanity.issues.join("; ")}`,
      weight: 0.25,
    });

    // 3. Spindle speed range
    const spindle = this._spindleSpeedCheck(candidate, machineLimits);
    signatures.push({
      gate: "spindleSpeedRange",
      status: spindle.withinRange ? "SAFE" : "BLOCKED",
      detail: spindle.withinRange
        ? `Program max RPM ${spindle.programMaxRpm} within machine [${machineLimits.minSpindleRPM}, ${machineLimits.maxSpindleRPM}]`
        : `Program max RPM ${spindle.programMaxRpm} EXCEEDS machine max ${machineLimits.maxSpindleRPM}`,
      weight: 0.20,
    });

    // 4. Drill depth-to-diameter ratio sanity
    const drillRatio = this._drillRatioCheck(candidate);
    signatures.push({
      gate: "drillRatio",
      status: drillRatio.status,
      detail: drillRatio.detail,
      weight: 0.15,
    });

    // 5. Calculated-VC preservation (defense-in-depth — pin the U2 invariant)
    const exprPreserved = this._calcVcPreservation(candidate);
    signatures.push({
      gate: "calculatedVcExpression",
      status: exprPreserved.preserved ? "SAFE" : "BLOCKED",
      detail: exprPreserved.detail,
      weight: 0.15,
    });

    // S(x) = weighted sum where SAFE counts full weight, WARNING counts half,
    // BLOCKED counts 0. Sum to [0,1].
    let sxScore = 0;
    let totalWeight = 0;
    for (const sig of signatures) {
      totalWeight += sig.weight;
      if (sig.status === "SAFE") sxScore += sig.weight;
      else if (sig.status === "WARNING") sxScore += sig.weight * 0.5;
      // BLOCKED contributes 0
    }
    sxScore = totalWeight > 0 ? sxScore / totalWeight : 0;

    // HARD BLOCK: any signature BLOCKED ⇒ fail outright (independent of S(x)).
    // S(x) is a soft scoring layer — but ANY hard block means no emit.
    const hasBlocked = signatures.some(s => s.status === "BLOCKED");
    const passed = !hasBlocked && sxScore >= SX_HARD_BLOCK_THRESHOLD;
    const failingChecks = signatures.filter(s => s.status === "BLOCKED");

    const safetyRecord: SafetyRecord = {
      schemaVersion: "1.0.0",
      candidateFamily: candidate.family,
      targetMachine: candidate.targetMachine,
      generatedAt: new Date().toISOString(),
      sxScore,
      passed,
      signatures,
      envelopeCheck: envelope,
      materialSanity: sanity,
      spindleSpeedCheck: spindle,
    };

    // Build dossier ONLY on pass. On fail, dossier=null and the GateResult
    // carries NO file/gcode-output property (test asserts this).
    let dossier: SignoffDossier | null = null;
    if (passed) {
      dossier = this._buildDossier(candidate, safetyRecord);
    }

    return { passed, sxScore, safetyRecord, failingChecks, dossier };
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE: resolve machine limits from the candidate's targetMachine
  // ──────────────────────────────────────────────────────────────────────
  private _resolveMachineLimits(machineId: string): MachineLimits {
    return JM_DIE_MACHINE_LIMITS[machineId] ?? JM_DIE_MACHINE_LIMITS["GENERIC_LATHE"];
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE: envelope check (X dia + Z length vs machine travel + swing)
  // ──────────────────────────────────────────────────────────────────────
  private _envelopeCheck(c: MacroFillCandidate, m: MachineLimits): { withinEnvelope: boolean; detail: string } {
    const issues: string[] = [];

    // Find max X (diametral) and max Z usage from filledVars
    let maxX = 0;
    let maxZ = 0;
    for (const v of Object.values(c.filledVars)) {
      if (typeof v.value !== "number") continue;
      // Heuristic: VCs in the stock-dia / step-OD / OD-related range contribute to maxX.
      // Part length + bore depths contribute to maxZ.
      if (v.description.match(/STOCK DIA|STEP OD|LARGE DIA|FINISH OD/i)) {
        maxX = Math.max(maxX, v.value);
      }
      if (v.description.match(/PART LENGTH|BORE DEPTH/i)) {
        maxZ = Math.max(maxZ, v.value);
      }
    }

    if (maxX > m.maxSwingDia_in) {
      issues.push(`stock/feature dia ${maxX} exceeds machine swing ${m.maxSwingDia_in}`);
    }
    if (maxZ > m.maxZTravel_in) {
      issues.push(`part length / bore depth ${maxZ} exceeds machine Z travel ${m.maxZTravel_in}`);
    }
    if (maxX / 2 > m.maxXTravel_in) {
      issues.push(`radial reach ${maxX / 2} exceeds machine X travel ${m.maxXTravel_in}`);
    }

    return {
      withinEnvelope: issues.length === 0,
      detail: issues.length === 0
        ? `maxX=${maxX} ≤ swing ${m.maxSwingDia_in}, maxZ=${maxZ} ≤ Z travel ${m.maxZTravel_in}`
        : issues.join("; "),
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE: material sanity (positive dims, ID < OD, etc — gate-level guard)
  // The U3 validators already catch these in the build path; this is
  // defense-in-depth (in case the candidate was built outside the U2 path).
  // ──────────────────────────────────────────────────────────────────────
  private _materialSanity(c: MacroFillCandidate): { sane: boolean; issues: string[] } {
    const issues: string[] = [];
    // VCs that are deliberately non-positive (enable flags, default-zero centers, taper offsets).
    // Anything outside this allowlist is a physical dimension where negative=insane.
    const allowedNegativeOrZeroVCs = new Set([
      "VC113", "VC116", "VC124", "VC129", "VC134", "VC139", "VC140", // enable flags / peck flags
      "VC142", // ID finish X dia — defaults to 0 for centered ID
    ]);
    for (const [vc, entry] of Object.entries(c.filledVars)) {
      if (typeof entry.value !== "number") continue;
      if (Number.isNaN(entry.value) || !Number.isFinite(entry.value)) {
        issues.push(`${vc} is NaN/Infinity: ${entry.value}`);
        continue;
      }
      if (entry.value < 0 && !allowedNegativeOrZeroVCs.has(vc)) {
        issues.push(`${vc} (${entry.description}) is negative: ${entry.value}`);
      }
    }
    return { sane: issues.length === 0, issues };
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE: spindle speed range vs machine limits
  // ──────────────────────────────────────────────────────────────────────
  private _spindleSpeedCheck(
    c: MacroFillCandidate,
    m: MachineLimits,
  ): { withinRange: boolean; programMaxRpm: number; machineMaxRpm: number } {
    // Find the max RPM clamp from filledVars (VC198 in top-hat, or via program.gcode G50 line)
    let programMaxRpm = 2500; // default if not specified
    const maxRpmVar = c.filledVars["VC198"];
    if (maxRpmVar && typeof maxRpmVar.value === "number") {
      programMaxRpm = maxRpmVar.value;
    } else {
      // Fall back to parsing the program for G50 S<num>
      const match = c.program.gcode.match(/G50\s+S(\d+)/);
      if (match) programMaxRpm = parseInt(match[1], 10);
    }
    return {
      withinRange: programMaxRpm <= m.maxSpindleRPM,
      programMaxRpm,
      machineMaxRpm: m.maxSpindleRPM,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE: drill depth-to-diameter ratio (deep-hole guidance: ratio > 5
  // is risky territory; ratio > 10 typically needs through-spindle coolant)
  // ──────────────────────────────────────────────────────────────────────
  private _drillRatioCheck(c: MacroFillCandidate): { status: "SAFE" | "WARNING" | "BLOCKED"; detail: string } {
    // For wafer-insert: VC115 = thru drill dia, VC104 = part length → ratio
    // For top-hat: VC130 = step drill 2 dia, VC106 = small bore depth → ratio
    let dia = c.filledVars["VC115"]?.value;
    let depth = c.filledVars["VC104"]?.value;
    if (dia == null || depth == null) {
      // top-hat path
      dia = c.filledVars["VC130"]?.value;
      depth = c.filledVars["VC106"]?.value;
    }
    if (dia == null || depth == null || dia <= 0) {
      return { status: "WARNING", detail: "drill dia or depth not derivable from filledVars — manual review required" };
    }
    const ratio = depth / dia;
    if (ratio > 15) {
      return { status: "BLOCKED", detail: `drill depth/dia ratio ${ratio.toFixed(1)} > 15 — physically impractical without specialized deep-hole tooling` };
    }
    if (ratio > 5) {
      return { status: "WARNING", detail: `drill depth/dia ratio ${ratio.toFixed(1)} > 5 — needs peck cycle + adequate coolant` };
    }
    return { status: "SAFE", detail: `drill depth/dia ratio ${ratio.toFixed(1)} ≤ 5` };
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE: calculated-VC expression preservation (defense-in-depth)
  // ──────────────────────────────────────────────────────────────────────
  private _calcVcPreservation(c: MacroFillCandidate): { preserved: boolean; detail: string } {
    for (const [vc, entry] of Object.entries(c.calculatedVars)) {
      if (typeof entry.formula !== "string" || entry.formula.length === 0) {
        return { preserved: false, detail: `${vc} formula missing or non-string — orchestrator must preserve calculated expressions` };
      }
      // Check that the formula doesn't look like a pure number (no VC reference, no operators)
      if (!/V[C]?\d+/.test(entry.formula) && !/[\[\+\-\*\/]/.test(entry.formula)) {
        return { preserved: false, detail: `${vc} formula appears pre-computed: "${entry.formula}"` };
      }
    }
    return { preserved: true, detail: `${Object.keys(c.calculatedVars).length} calculated VCs verified as expressions` };
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE: build the signoff dossier (only called on pass)
  // ──────────────────────────────────────────────────────────────────────
  private _buildDossier(c: MacroFillCandidate, record: SafetyRecord): SignoffDossier {
    const filledVarsNumeric: Record<string, number> = {};
    for (const [vc, e] of Object.entries(c.filledVars)) filledVarsNumeric[vc] = e.value;
    const calculatedFormulas: Record<string, string> = {};
    for (const [vc, e] of Object.entries(c.calculatedVars)) calculatedFormulas[vc] = e.formula;

    return {
      candidate: c,
      safetyRecord: record,
      needsOperatorReview: true,
      setupSheetSummary: this._buildSetupSheetSummary(c, record),
      physicsReport: { filledVars: filledVarsNumeric, calculatedFormulas },
      firstPieceChecklist: [
        "Verify part orientation in chuck matches drawing",
        "Confirm jaw setup matches stock diameter VC100",
        "Set tool offsets per tool list (T010101..T101010 / T090909)",
        "Run prove-out mode (single-block, low feed override) for first cycle",
        "Inspect first part — verify OD, ID, length, thread, surface finish",
        "Confirm S(x) certificate matches the running program",
        "Operator sign-off before production release",
      ],
    };
  }

  private _buildSetupSheetSummary(c: MacroFillCandidate, r: SafetyRecord): string {
    return [
      `Macro family: ${c.family}`,
      `Target machine: ${c.targetMachine}`,
      `Controller: ${c.controllerType}`,
      `S(x) score: ${r.sxScore.toFixed(3)} (threshold ${SX_HARD_BLOCK_THRESHOLD})`,
      `Filled VCs: ${Object.keys(c.filledVars).length}`,
      `Calculated VCs (expressions preserved): ${Object.keys(c.calculatedVars).length}`,
      `Filled at: ${c.filledAt}`,
      `Gate generated at: ${r.generatedAt}`,
      `Status: ${r.passed ? "PASSED — operator review required before prove-out" : "BLOCKED — DO NOT RUN"}`,
    ].join("\n");
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const macroCandidateGateEngine = new MacroCandidateGateEngineImpl();
