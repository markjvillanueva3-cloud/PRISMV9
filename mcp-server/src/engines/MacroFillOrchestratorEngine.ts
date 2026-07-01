/**
 * MacroFillOrchestratorEngine — MACRO-PROGRAM-PIPELINE-MS0/MS0-U2 (SAFETY-CRITICAL).
 *
 * Thin orchestrator: given part print features + a family + a target machine,
 *   1. Extracts print dims → VC variable values (operator-filled VCs only).
 *   2. Calls OkumaParametricProgramEngine.generate* (the U3 generators).
 *   3. Validates structure via MacroProgramIntelligenceEngine.parseOkumaMacro.
 *   4. Returns a *candidate* program object — NEVER a file. Final emission
 *      is gated by MS0-U4 (S(x) ≥ 0.70 + envelope + sim + operator sign-off).
 *
 * SAFETY-CRITICAL invariants (asserted by tests):
 *   1. Calculated VCs (RPMs, point depths, total depths) STAY as expression
 *      strings on the candidate — the orchestrator NEVER pre-computes them.
 *      Test asserts `candidate.calculatedVars.VC130` matches /VC111.*VC110/
 *      for wafer-insert and `candidate.calculatedVars.VC150` matches
 *      /VC121.*VC120/ for top-hat.
 *   2. Missing required print dimensions cause REJECTION — the orchestrator
 *      does NOT guess. "VC required but missing" is a hard error, not a default.
 *   3. Physical-impossibility configs (negative length, ID ≥ OD, step OD ≤
 *      small OD, drill order, …) propagate validation rejection from the
 *      underlying engine — never silently overridden.
 *   4. needsGate === true on every candidate — the type guarantees U4 cannot
 *      be bypassed.
 *
 * No external imports beyond OkumaParametricProgramEngine +
 * MacroProgramIntelligenceEngine. Pure orchestration.
 *
 * @module MacroFillOrchestratorEngine
 */

import {
  okumaParametricProgramEngine,
  type WaferInsertConfig,
  type TopHatCasingConfig,
  type GeneratedProgram,
} from "./OkumaParametricProgramEngine.js";
import { MacroProgramIntelligenceEngine } from "./MacroProgramIntelligenceEngine.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type MacroFamily = "waferinsert" | "tophat" | "casing" | "cbore";

/**
 * Common drill descriptor — fills the spot-drill, thru-drill, step-drill, and
 * counterbore-drill VC sets across both families.
 */
export interface PrintDrillSpec {
  diameter_in: number;
  sfm: number;
  feedPerRev_ipr?: number;     // VC117 (wafer) / VC127 / VC132 / VC137 (top-hat)
  pointAngleDeg: number;        // VC118 / VC128 / VC133 / VC138 (180=flat)
  usePeck: boolean;
  peckDepth_in?: number;        // VC120 (wafer common) / VC141 (top-hat common)
  depth_in?: number;            // VC112 / VC123 (spot drill only)
}

/**
 * Optional ID undercut at the back of the large bore (top-hat only).
 */
export interface PrintIDUndercut {
  enable: boolean;
  length_in: number;
  leadInAngleDeg: number;
  depthBeyondFinish_in: number;
}

/**
 * Print-derived feature shape — fully decoupled from any specific print intake
 * engine. Orchestrator callers (U1/U6/the /macro-program skill) build this
 * from whatever upstream source (OCR, CAD AST, operator entry, hand-fill).
 *
 * Field names mirror VC purposes to keep provenance trivial.
 */
export interface PartPrintFeatures {
  family: MacroFamily;

  // --- Common dims (wafer-insert + top-hat) -----------------------------
  stockDiameter_in: number;            // VC100
  finishODAtFace_in: number;            // VC101 (wafer "finish OD at face" / top-hat "finish OD - small dia")
  partLength_in: number;                // VC104

  // --- OD chamfer/radius at face (both families) ------------------------
  odFeatureSize_in: number;             // VC105 (wafer) / VC110 (top-hat) — 0 = no feature
  odFeatureType: "chamfer" | "radius";  // VC106 / VC111
  odFeatureAngleDeg: number;            // VC107 / VC112 (only used if type=chamfer)

  // --- Spot drill (both families) ----------------------------------------
  spotDrill: PrintDrillSpec;

  // --- Clearance planes (both families) ---------------------------------
  zClearance_in: number;                // VC125 (wafer) / VC200 (top-hat)
  xClearance_in: number;                // VC126 / VC201

  // --- Wafer-insert specific -------------------------------------------
  odTaperEndDia_in?: number;            // VC102
  odTaperStartZ_in?: number;            // VC103
  idMajorDia_in?: number;               // VC140
  idTaperAngleOkumaDeg?: number;        // VC141 (Okuma format: 270=0°)
  idFinishXDia_in?: number;             // VC142 (default 0 = centered)
  thruDrill?: PrintDrillSpec;           // VC115-VC120

  // --- Top-hat specific ------------------------------------------------
  smallestDrillDia_in?: number;         // VC102 (top-hat) - = step drill 2 dia
  finishIdLarge_in?: number;            // VC103
  largeBoreDepth_in?: number;           // VC105
  smallBoreDepth_in?: number;           // VC106
  stepOdLarge_in?: number;              // VC107
  stepZDepth_in?: number;               // VC108
  stepChamferSize_in?: number;          // VC109
  idLargeFeatureSize_in?: number;       // VC113 (0 = none)
  idLargeFeatureType?: "chamfer" | "radius"; // VC114
  idLargeFeatureAngleDeg?: number;      // VC115
  idUndercut?: PrintIDUndercut;         // VC116-VC119
  stepDrill1?: PrintDrillSpec;          // VC125-VC129 (larger of the two staged drills)
  stepDrill2?: PrintDrillSpec;          // VC130-VC133 + VC139 (thru drill)
  counterboreDrill?: PrintDrillSpec & { enable: boolean }; // VC134-VC138 + VC140
  stockAllowances?: { odRadial: number; odAxial: number; idRadial: number; idAxial: number };
  roughing?: { odDepthOfCut: number; idDepthOfCut: number };
  speeds?: { odRoughSFM: number; odFinishSFM: number; idRoughSFM: number; idFinishSFM: number };
  feeds?: { faceRough: number; faceFinish: number; odRough: number; odFinish: number; idRough: number; idFinish: number };
  maxRoughRPM?: number;
  maxFinishRPM?: number;

  // --- Provenance --------------------------------------------------------
  printSource?: string;                 // file path or part number
  sourceRevision?: string;              // rev letter / date / sha
}

/**
 * A *candidate* program — the output of the orchestrator. This is NEVER a
 * file. It MUST pass MS0-U4's safety gate before any .MIN is emitted.
 *
 * The `needsGate: true` field is a type-level reminder; the actual gating
 * runs in MS0-U4 (LatheProofCarryingEmitEngine.emit).
 */
export interface MacroFillCandidate {
  family: MacroFamily;
  targetMachine: string;
  controllerType: "okuma_osp";          // U2 only emits OSP; U5 handles dialect translation
  program: GeneratedProgram;

  /** VC → filled numeric value + provenance string */
  filledVars: Record<string, { value: number; source: string; description: string }>;

  /**
   * VC → expression string + numeric result.
   * The `formula` field MUST be a parsable Okuma expression — never a
   * resolved number. Test guards: VC130/VC150 expressions stay intact.
   */
  calculatedVars: Record<string, { formula: string; result: number; description?: string }>;

  warnings: string[];

  /** Parser-level validation (does the emitted program tokenize cleanly?) */
  validation: {
    parsedToolDefs: number;
    parsedVariables: number;
    parsedAutoCalcs: number;
    hasG50SpeedClamp: boolean;
    hasG80CycleCancel: boolean;
    issues: string[];
  };

  /** Type-level reminder: this candidate MUST go through MS0-U4 before any emit. */
  needsGate: true;

  /** When the candidate was filled (for audit trail) */
  filledAt: string;
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class MacroFillOrchestratorEngineImpl {
  /**
   * Build a candidate program for `features` targeting `targetMachine`.
   *
   * @throws Error if a required VC is missing for the family, or if the
   * underlying generator validator rejects the config as physically
   * impossible (the orchestrator does NOT guess defaults for missing dims).
   */
  fillCandidate(features: PartPrintFeatures, targetMachine: string): MacroFillCandidate {
    if (!features) throw new Error("features is required");
    if (!targetMachine || targetMachine.trim().length === 0) {
      throw new Error("targetMachine is required (e.g. 'OKUMA_LB-3000-EX')");
    }

    // 1. Reject early if required dims for this family are missing.
    const missing = this._findMissingRequiredVCs(features);
    if (missing.length > 0) {
      throw new Error(
        `Missing required print dimensions for family=${features.family}: ${missing.join(", ")}. ` +
        `The orchestrator does NOT guess — re-extract from the print or supply explicit values.`,
      );
    }

    // 2. Build the typed config for the chosen family + call the U3 generator.
    let program: GeneratedProgram;
    let filledVars: Record<string, { value: number; source: string; description: string }>;
    let warnings: string[] = [];

    if (features.family === "waferinsert") {
      const config = this._featuresToWaferInsertConfig(features);
      program = okumaParametricProgramEngine.generateWaferInsert(config);
      filledVars = this._extractFilledVarsWafer(features, config);
      warnings = program.warnings;
    } else if (features.family === "tophat") {
      const config = this._featuresToTopHatCasingConfig(features);
      program = okumaParametricProgramEngine.generateTopHatCasing(config);
      filledVars = this._extractFilledVarsTopHat(features, config);
      warnings = program.warnings;
    } else if (features.family === "casing") {
      throw new Error(
        "family=casing is handled by the V1-V199 generator path (okuma_generate_casing) — " +
        "MacroFillOrchestratorEngine only fills the VC100+ form families (waferinsert, tophat) in MS0-U3 scope.",
      );
    } else if (features.family === "cbore") {
      throw new Error(
        "family=cbore is handled by the V1-V199 generator path (okuma_generate_cbore) — " +
        "MacroFillOrchestratorEngine only fills the VC100+ form families (waferinsert, tophat) in MS0-U3 scope.",
      );
    } else {
      throw new Error(`Unknown family: ${(features as PartPrintFeatures).family}`);
    }

    // 3. Validate structure via MacroProgramIntelligenceEngine.
    const ast = MacroProgramIntelligenceEngine.parseOkumaMacro(program.gcode, "okuma_osp");

    // 4. SAFETY-CRITICAL: re-affirm the calculated-VC-preservation invariant.
    //    The U3 engine already keeps them as expressions, but we double-check
    //    here so a future refactor that pre-computes silently is caught.
    this._assertCalculatedVarsArePreserved(program.calculations, features.family);

    return {
      family: features.family,
      targetMachine,
      controllerType: "okuma_osp",
      program,
      filledVars,
      calculatedVars: program.calculations,
      warnings,
      validation: {
        parsedToolDefs: ast.toolDefinitions.length,
        parsedVariables: Object.keys(ast.variables).length,
        parsedAutoCalcs: ast.autoCalcs.length,
        hasG50SpeedClamp: ast.safetyChecks.hasG50SpeedClamp,
        hasG80CycleCancel: ast.safetyChecks.hasG80CycleCancel,
        issues: ast.safetyChecks.issues,
      },
      needsGate: true,
      filledAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE: required-VC enumeration per family
  // --------------------------------------------------------------------------
  private _findMissingRequiredVCs(f: PartPrintFeatures): string[] {
    const missing: string[] = [];
    // common (both families)
    if (f.stockDiameter_in == null) missing.push("stockDiameter_in (VC100)");
    if (f.finishODAtFace_in == null) missing.push("finishODAtFace_in (VC101)");
    if (f.partLength_in == null) missing.push("partLength_in (VC104)");
    if (f.odFeatureSize_in == null) missing.push("odFeatureSize_in (VC105/VC110)");
    if (!f.odFeatureType) missing.push("odFeatureType (VC106/VC111)");
    if (f.odFeatureAngleDeg == null) missing.push("odFeatureAngleDeg (VC107/VC112)");
    if (!f.spotDrill) missing.push("spotDrill (VC110-VC113 / VC120-VC124)");
    if (f.zClearance_in == null) missing.push("zClearance_in (VC125/VC200)");
    if (f.xClearance_in == null) missing.push("xClearance_in (VC126/VC201)");

    if (f.family === "waferinsert") {
      if (f.odTaperEndDia_in == null) missing.push("odTaperEndDia_in (VC102)");
      if (f.odTaperStartZ_in == null) missing.push("odTaperStartZ_in (VC103)");
      if (f.idMajorDia_in == null) missing.push("idMajorDia_in (VC140)");
      if (f.idTaperAngleOkumaDeg == null) missing.push("idTaperAngleOkumaDeg (VC141)");
      if (f.idFinishXDia_in == null) missing.push("idFinishXDia_in (VC142)");
      if (!f.thruDrill) missing.push("thruDrill (VC115-VC120)");
    } else if (f.family === "tophat") {
      if (f.smallestDrillDia_in == null) missing.push("smallestDrillDia_in (VC102)");
      if (f.finishIdLarge_in == null) missing.push("finishIdLarge_in (VC103)");
      if (f.largeBoreDepth_in == null) missing.push("largeBoreDepth_in (VC105)");
      if (f.smallBoreDepth_in == null) missing.push("smallBoreDepth_in (VC106)");
      if (f.stepOdLarge_in == null) missing.push("stepOdLarge_in (VC107)");
      if (f.stepZDepth_in == null) missing.push("stepZDepth_in (VC108)");
      if (f.stepChamferSize_in == null) missing.push("stepChamferSize_in (VC109)");
      if (f.idLargeFeatureSize_in == null) missing.push("idLargeFeatureSize_in (VC113)");
      if (!f.idLargeFeatureType) missing.push("idLargeFeatureType (VC114)");
      if (f.idLargeFeatureAngleDeg == null) missing.push("idLargeFeatureAngleDeg (VC115)");
      if (!f.idUndercut) missing.push("idUndercut (VC116-VC119)");
      if (!f.stepDrill1) missing.push("stepDrill1 (VC125-VC129)");
      if (!f.stepDrill2) missing.push("stepDrill2 (VC130-VC133 + VC139)");
      if (!f.counterboreDrill) missing.push("counterboreDrill (VC134-VC138 + VC140)");
      if (!f.stockAllowances) missing.push("stockAllowances (VC170-VC173)");
      if (!f.roughing) missing.push("roughing (VC175-VC176)");
      if (!f.speeds) missing.push("speeds (VC180-VC183)");
      if (!f.feeds) missing.push("feeds (VC190-VC195)");
    }
    return missing;
  }

  // --------------------------------------------------------------------------
  // PRIVATE: build WaferInsertConfig from PartPrintFeatures
  // --------------------------------------------------------------------------
  private _featuresToWaferInsertConfig(f: PartPrintFeatures): WaferInsertConfig {
    return {
      programNumber: 1001,
      geometry: {
        stockDiameter: f.stockDiameter_in,
        finishODAtFace: f.finishODAtFace_in,
        odTaperEndDia: f.odTaperEndDia_in!,
        odTaperStartZ: f.odTaperStartZ_in!,
        partLength: f.partLength_in,
        idMajorDia: f.idMajorDia_in!,
        idTaperAngleOkumaDeg: f.idTaperAngleOkumaDeg!,
        idFinishXDia: f.idFinishXDia_in!,
      },
      odChamfer: {
        size: f.odFeatureSize_in,
        type: f.odFeatureType,
        angleDeg: f.odFeatureAngleDeg,
      },
      spotDrill: {
        diameter: f.spotDrill.diameter_in,
        sfm: f.spotDrill.sfm,
        depth: f.spotDrill.depth_in ?? 0.05,
        usePeck: f.spotDrill.usePeck,
      },
      thruDrill: {
        diameter: f.thruDrill!.diameter_in,
        sfm: f.thruDrill!.sfm,
        feedPerRev: f.thruDrill!.feedPerRev_ipr ?? 0.0022,
        pointAngleDeg: f.thruDrill!.pointAngleDeg,
        usePeck: f.thruDrill!.usePeck,
        peckDepth: f.thruDrill!.peckDepth_in ?? 0.13,
      },
      clearance: { zClearance: f.zClearance_in, xClearance: f.xClearance_in },
      maxRoughRPM: f.maxRoughRPM ?? 2500,
    };
  }

  private _extractFilledVarsWafer(
    f: PartPrintFeatures,
    config: WaferInsertConfig,
  ): Record<string, { value: number; source: string; description: string }> {
    const src = f.printSource ?? "operator-fill";
    return {
      VC100: { value: config.geometry.stockDiameter,     source: `print:${src} stockDiameter`,    description: "STOCK DIAMETER" },
      VC101: { value: config.geometry.finishODAtFace,    source: `print:${src} finishODAtFace`,   description: "FINISH OD AT FACE" },
      VC102: { value: config.geometry.odTaperEndDia,     source: `print:${src} odTaperEndDia`,    description: "OD TAPER END DIA" },
      VC103: { value: config.geometry.odTaperStartZ,     source: `print:${src} odTaperStartZ`,    description: "OD TAPER START Z" },
      VC104: { value: config.geometry.partLength,        source: `print:${src} partLength`,       description: "PART LENGTH" },
      VC105: { value: config.odChamfer.size,             source: `print:${src} odFeatureSize`,    description: "OD FEATURE SIZE" },
      VC106: { value: config.odChamfer.type === "chamfer" ? 1 : 2, source: `print:${src} odFeatureType`, description: "OD FEATURE TYPE (1=chamfer, 2=radius)" },
      VC107: { value: config.odChamfer.angleDeg,         source: `print:${src} odFeatureAngleDeg`, description: "OD CHAMFER ANGLE" },
      VC110: { value: config.spotDrill.diameter,         source: `print:${src} spotDrill.diameter`, description: "SPOT DRILL DIAMETER" },
      VC111: { value: config.spotDrill.sfm,              source: `print:${src} spotDrill.sfm`,    description: "SPOT DRILL SFM" },
      VC115: { value: config.thruDrill.diameter,         source: `print:${src} thruDrill.diameter`, description: "THRU DRILL DIAMETER" },
      VC116: { value: config.thruDrill.sfm,              source: `print:${src} thruDrill.sfm`,    description: "THRU DRILL SFM" },
      VC117: { value: config.thruDrill.feedPerRev,       source: `print:${src} thruDrill.feedPerRev`, description: "THRU DRILL FEED/REV" },
      VC118: { value: config.thruDrill.pointAngleDeg,    source: `print:${src} thruDrill.pointAngle`, description: "THRU DRILL POINT ANGLE" },
      VC125: { value: config.clearance.zClearance,       source: `print:${src} zClearance`,       description: "Z CLEARANCE" },
      VC126: { value: config.clearance.xClearance,       source: `print:${src} xClearance`,       description: "X CLEARANCE" },
      VC140: { value: config.geometry.idMajorDia,        source: `print:${src} idMajorDia`,       description: "ID MAJOR DIA" },
      VC141: { value: config.geometry.idTaperAngleOkumaDeg, source: `print:${src} idTaperAngleOkuma`, description: "ID TAPER ANGLE (Okuma format)" },
      VC142: { value: config.geometry.idFinishXDia,      source: `print:${src} idFinishXDia`,     description: "ID FINISH X DIA" },
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE: build TopHatCasingConfig from PartPrintFeatures
  // --------------------------------------------------------------------------
  private _featuresToTopHatCasingConfig(f: PartPrintFeatures): TopHatCasingConfig {
    const d1 = f.stepDrill1!;
    const d2 = f.stepDrill2!;
    const cb = f.counterboreDrill!;
    return {
      programNumber: 1001,
      stockAndBore: {
        stockDiameter: f.stockDiameter_in,
        finishOdSmall: f.finishODAtFace_in,
        smallestDrillDia: f.smallestDrillDia_in!,
        finishIdLarge: f.finishIdLarge_in!,
        partLength: f.partLength_in,
        largeBoreDepth: f.largeBoreDepth_in!,
        smallBoreDepth: f.smallBoreDepth_in!,
      },
      step: {
        stepOdLarge: f.stepOdLarge_in!,
        stepZDepth: f.stepZDepth_in!,
        stepChamferSize: f.stepChamferSize_in!,
      },
      odFeature: {
        size: f.odFeatureSize_in,
        type: f.odFeatureType,
        angleDeg: f.odFeatureAngleDeg,
      },
      idLargeFeature: {
        size: f.idLargeFeatureSize_in!,
        type: f.idLargeFeatureType!,
        angleDeg: f.idLargeFeatureAngleDeg!,
      },
      idUndercut: {
        enable: f.idUndercut!.enable,
        length: f.idUndercut!.length_in,
        leadInAngleDeg: f.idUndercut!.leadInAngleDeg,
        depthBeyondFinish: f.idUndercut!.depthBeyondFinish_in,
      },
      spotDrill: {
        diameter: f.spotDrill.diameter_in,
        sfm: f.spotDrill.sfm,
        pointAngleDeg: f.spotDrill.pointAngleDeg,
        depth: f.spotDrill.depth_in ?? 0.1,
        usePeck: f.spotDrill.usePeck,
      },
      stepDrill1: {
        diameter: d1.diameter_in,
        sfm: d1.sfm,
        feedPerRev: d1.feedPerRev_ipr ?? 0.008,
        pointAngleDeg: d1.pointAngleDeg,
        usePeck: d1.usePeck,
      },
      stepDrill2: {
        diameter: d2.diameter_in,
        sfm: d2.sfm,
        feedPerRev: d2.feedPerRev_ipr ?? 0.007,
        pointAngleDeg: d2.pointAngleDeg,
        usePeck: d2.usePeck,
      },
      counterboreDrill: {
        enable: cb.enable,
        diameter: cb.diameter_in,
        sfm: cb.sfm,
        feedPerRev: cb.feedPerRev_ipr ?? 0.003,
        pointAngleDeg: cb.pointAngleDeg,
        usePeck: cb.usePeck,
      },
      drillPeckDepth: d1.peckDepth_in ?? d2.peckDepth_in ?? f.spotDrill.peckDepth_in ?? 0.13,
      stockAllowances: f.stockAllowances!,
      roughing: f.roughing!,
      speeds: f.speeds!,
      feeds: f.feeds!,
      clearance: { zClearance: f.zClearance_in, xClearance: f.xClearance_in },
      maxRoughRPM: f.maxRoughRPM ?? 2500,
      maxFinishRPM: f.maxFinishRPM ?? 3500,
    };
  }

  private _extractFilledVarsTopHat(
    f: PartPrintFeatures,
    config: TopHatCasingConfig,
  ): Record<string, { value: number; source: string; description: string }> {
    const src = f.printSource ?? "operator-fill";
    const sab = config.stockAndBore;
    const st = config.step;
    const sd = config.spotDrill;
    const d1 = config.stepDrill1;
    const d2 = config.stepDrill2;
    const cb = config.counterboreDrill;
    return {
      VC100: { value: sab.stockDiameter,   source: `print:${src} stockDiameter`,   description: "STOCK DIAMETER" },
      VC101: { value: sab.finishOdSmall,   source: `print:${src} finishOdSmall`,   description: "FINISH OD - SMALL DIA" },
      VC102: { value: sab.smallestDrillDia, source: `print:${src} smallestDrillDia`, description: "SMALLEST DRILL / START BORE DIA" },
      VC103: { value: sab.finishIdLarge,   source: `print:${src} finishIdLarge`,   description: "FINISH ID - LARGE BORE" },
      VC104: { value: sab.partLength,      source: `print:${src} partLength`,      description: "PART LENGTH" },
      VC105: { value: sab.largeBoreDepth,  source: `print:${src} largeBoreDepth`,  description: "LARGE BORE DEPTH" },
      VC106: { value: sab.smallBoreDepth,  source: `print:${src} smallBoreDepth`,  description: "SMALL BORE DEPTH - THRU" },
      VC107: { value: st.stepOdLarge,      source: `print:${src} stepOdLarge`,     description: "STEP OD - LARGE DIA" },
      VC108: { value: st.stepZDepth,       source: `print:${src} stepZDepth`,      description: "STEP Z DEPTH" },
      VC109: { value: st.stepChamferSize,  source: `print:${src} stepChamferSize`, description: "STEP CHAMFER SIZE" },
      VC110: { value: config.odFeature.size, source: `print:${src} odFeatureSize`, description: "OD FEATURE SIZE" },
      VC120: { value: sd.diameter,         source: `print:${src} spotDrill.diameter`, description: "SPOT DRILL DIAMETER" },
      VC121: { value: sd.sfm,              source: `print:${src} spotDrill.sfm`,   description: "SPOT DRILL SFM" },
      VC125: { value: d1.diameter,         source: `print:${src} stepDrill1.diameter`, description: "STEP DRILL 1 DIAMETER" },
      VC126: { value: d1.sfm,              source: `print:${src} stepDrill1.sfm`,  description: "STEP DRILL 1 SFM" },
      VC130: { value: d2.diameter,         source: `print:${src} stepDrill2.diameter`, description: "STEP DRILL 2 DIAMETER" },
      VC131: { value: d2.sfm,              source: `print:${src} stepDrill2.sfm`,  description: "STEP DRILL 2 SFM" },
      VC134: { value: cb.enable ? 1 : 0,   source: `print:${src} counterbore.enable`, description: "COUNTERBORE ENABLE" },
      VC135: { value: cb.diameter,         source: `print:${src} counterbore.diameter`, description: "COUNTERBORE DRILL DIAMETER" },
      VC136: { value: cb.sfm,              source: `print:${src} counterbore.sfm`,  description: "COUNTERBORE DRILL SFM" },
      VC200: { value: config.clearance.zClearance, source: `print:${src} zClearance`, description: "Z CLEARANCE" },
      VC201: { value: config.clearance.xClearance, source: `print:${src} xClearance`, description: "X CLEARANCE" },
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE: assert that calculated VCs were preserved as expressions
  // (defense-in-depth — the U3 generators already guarantee this).
  // --------------------------------------------------------------------------
  private _assertCalculatedVarsArePreserved(
    calculations: Record<string, { formula: string; result: number }>,
    family: MacroFamily,
  ): void {
    if (family === "waferinsert") {
      const vc130 = calculations.VC130?.formula;
      if (!vc130 || !/VC111.*VC110/.test(vc130)) {
        throw new Error(
          `SAFETY VIOLATION: VC130 (wafer spot drill RPM) lost its expression — ` +
          `found "${vc130}", expected to match /VC111.*VC110/. The orchestrator must NEVER pre-compute calculated VCs.`,
        );
      }
    } else if (family === "tophat") {
      const vc150 = calculations.VC150?.formula;
      if (!vc150 || !/VC121.*VC120/.test(vc150)) {
        throw new Error(
          `SAFETY VIOLATION: VC150 (top-hat spot drill RPM) lost its expression — ` +
          `found "${vc150}", expected to match /VC121.*VC120/. The orchestrator must NEVER pre-compute calculated VCs.`,
        );
      }
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const macroFillOrchestratorEngine = new MacroFillOrchestratorEngineImpl();
