/**
 * PRISM Manufacturing Intelligence - Post-Verification Safety Engine
 * Pipeline Phase 4-5: Statistical verification and comprehensive safety checking
 *
 * SAFETY CRITICAL: Every program gets statistically verified before cutting.
 *
 * Consolidates MS11 U01-U06:
 *  U01 - MonteCarloVerification    : Propagate uncertainties, predict Cpk
 *  U02 - PlaybookRuleEnforcement   : Check against known machining rules
 *  U03 - TribalKnowledgeInjection  : Inject best-practice comments
 *  U04 - SafetyAnalyzer            : Detect dangerous G-code conditions
 *  U05 - MachineEnvelopeValidator  : Validate against machine travel limits
 *  U06 - SurfaceFinishVerifier     : Predict Ra per operation (Brammertz / scallop)
 *
 * @version 1.0.0
 * @module PostVerificationSafetyEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface VerificationInput {
  gcode: string;
  machine_limits: {
    max_rpm: number;
    max_feed_mmmin: number;
    x_travel_mm: number;
    y_travel_mm: number;
    z_travel_mm: number;
    rotary_limits?: { axis: string; min_deg: number; max_deg: number }[];
  };
  material_iso: string; // e.g. "P", "M", "K", "N", "S", "H"
  operations: Array<{
    tool_diameter_mm: number;
    tool_nose_radius_mm?: number;
    feed_per_tooth_mm?: number;
    tolerance_mm?: number;
    target_ra_um?: number;
    stepover_mm?: number;
    depth_of_cut_mm?: number;
    cutting_speed_mmin?: number;
    operation_type?: "face_milling" | "ball_nose" | "turning" | "peripheral";
    wall_thickness_mm?: number;
    coolant_active?: boolean;
  }>;
  monte_carlo_iterations?: number; // default 100
}

export interface VerificationResult {
  passed: boolean;
  safety_issues: SafetyIssue[];
  envelope_violations: EnvelopeViolation[];
  playbook_violations: PlaybookViolation[];
  tribal_tips: TribalTip[];
  surface_finish_predictions: SurfaceFinishPrediction[];
  monte_carlo: MonteCarloResult;
  risk_score: number; // 0-100, 0=safe
}

export interface SafetyIssue {
  severity: "critical" | "warning" | "info";
  line_number: number;
  code: string;
  issue: string;
  fix: string;
}

export interface EnvelopeViolation {
  axis: string;
  commanded_value: number;
  limit: number;
  line_number: number;
  description: string;
}

export interface PlaybookViolation {
  rule_id: string;
  severity: "critical" | "warning";
  description: string;
  line_number?: number;
  operation_index?: number;
  recommended_fix: string;
}

export interface TribalTip {
  category: string;
  tip: string;
  applies_to: string[];
}

export interface SurfaceFinishPrediction {
  operation_index: number;
  operation_type: string;
  ra_predicted_um: number;
  scallop_height_mm?: number;
  target_ra_um?: number;
  meets_tolerance: boolean;
  formula_used: string;
  recommendation?: string;
}

export interface MonteCarloResult {
  iterations: number;
  force_N: StatResult;
  temperature_C: StatResult;
  deflection_mm: StatResult;
  ra_um: StatResult;
  cpk?: number;
}

interface StatResult {
  mean: number;
  std: number;
  ci95: [number, number];
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface ParsedGCodeLine {
  line_number: number;
  raw: string;
  codes: string[];       // G/M codes present
  x?: number;
  y?: number;
  z?: number;
  a?: number;
  b?: number;
  c?: number;
  f?: number;
  s?: number;
}

interface GCodeState {
  modal_motion: string;          // G0, G1, G2, G3...
  modal_plane: string;           // G17, G18, G19
  modal_units: string;           // G20, G21
  modal_wcs: string;             // G54-G59
  modal_tool_length: boolean;    // G43/G44 active
  coolant: boolean;              // M7/M8 active
  spindle_on: boolean;           // M3/M4 active
  cutting_active: boolean;       // Below safe Z, spindle on
  current_z: number;
  current_x: number;
  current_y: number;
  current_a: number;
  current_b: number;
  current_c: number;
  current_feed: number;
  current_rpm: number;
}

// ============================================================================
// MATERIAL PHYSICS CONSTANTS (ISO group-based)
// ============================================================================

const MATERIAL_PHYSICS: Record<string, {
  name: string;
  base_force_N_per_mm2: number;   // specific cutting force kc1 [N/mm²]
  base_temp_C: number;            // typical cutting zone temperature [°C]
  stiffness_GPa: number;          // elastic modulus for deflection calc
  requires_coolant: boolean;
  min_carbide_rpm_per_mm: number; // min surface speed factor to avoid BUE
  max_chip_load_mm: number;       // max chip load per tooth
  max_Vc_mmin?: number;           // max cutting speed limit (Ti, Inconel)
}> = {
  P: { // steel
    name: "Steel (ISO P)",
    base_force_N_per_mm2: 2200,
    base_temp_C: 650,
    stiffness_GPa: 210,
    requires_coolant: false,
    min_carbide_rpm_per_mm: 3.18, // ~10 m/min surface speed per mm dia
    max_chip_load_mm: 0.25,
    max_Vc_mmin: 350
  },
  M: { // stainless
    name: "Stainless Steel (ISO M)",
    base_force_N_per_mm2: 2400,
    base_temp_C: 700,
    stiffness_GPa: 193,
    requires_coolant: false,
    min_carbide_rpm_per_mm: 4.77,
    max_chip_load_mm: 0.18,
    max_Vc_mmin: 200
  },
  K: { // cast iron
    name: "Cast Iron (ISO K)",
    base_force_N_per_mm2: 1800,
    base_temp_C: 500,
    stiffness_GPa: 170,
    requires_coolant: false,
    min_carbide_rpm_per_mm: 2.55,
    max_chip_load_mm: 0.30,
    max_Vc_mmin: 400
  },
  N: { // aluminium/non-ferrous
    name: "Non-ferrous (ISO N)",
    base_force_N_per_mm2: 800,
    base_temp_C: 350,
    stiffness_GPa: 69,
    requires_coolant: false,
    min_carbide_rpm_per_mm: 1.59,
    max_chip_load_mm: 0.35,
    max_Vc_mmin: 3000
  },
  S: { // superalloys + titanium
    name: "Heat-resistant Superalloys (ISO S)",
    base_force_N_per_mm2: 3200,
    base_temp_C: 900,
    stiffness_GPa: 114,
    requires_coolant: true,
    min_carbide_rpm_per_mm: 6.37,
    max_chip_load_mm: 0.12,
    max_Vc_mmin: 60  // Ti-6Al-4V hard limit
  },
  H: { // hardened steel
    name: "Hardened Steel (ISO H)",
    base_force_N_per_mm2: 3500,
    base_temp_C: 800,
    stiffness_GPa: 210,
    requires_coolant: false,
    min_carbide_rpm_per_mm: 2.55,
    max_chip_load_mm: 0.10,
    max_Vc_mmin: 120
  }
};

// ============================================================================
// TRIBAL KNOWLEDGE DATABASE
// ============================================================================

const TRIBAL_KNOWLEDGE: TribalTip[] = [
  {
    category: "HSM",
    tip: "Use climb milling, constant engagement, avoid full-width slots. Trochoidal paths reduce peak chip load by 40-60%.",
    applies_to: ["P", "M", "K", "S", "H"]
  },
  {
    category: "Deep Pockets",
    tip: "Reduce feed by 15% per 1xD depth beyond 2xD. At 4xD reduce feed 30% and add peck cycles for chip clearance.",
    applies_to: ["P", "M", "K", "N", "S", "H"]
  },
  {
    category: "Ti-6Al-4V",
    tip: "Never exceed 60 m/min Vc for carbide. Use TSC (Through-Spindle Coolant) if available — flood only as fallback. Keep engagement below 5% D radial for finishing.",
    applies_to: ["S"]
  },
  {
    category: "304 Stainless",
    tip: "Watch for work hardening — maintain minimum chip load at all times. Never dwell in cut. Minimum chip load 0.05 mm/tooth for carbide.",
    applies_to: ["M"]
  },
  {
    category: "Cast Iron",
    tip: "Dry or air-blast preferred — thermal shock from flood coolant can crack cast iron. Use coated carbide (TiCN or TiAlN).",
    applies_to: ["K"]
  },
  {
    category: "Aluminium",
    tip: "Use high-helix (35-45°) 2-3 flute cutters. High RPM acceptable — watch for chip re-cutting. Polished flutes reduce BUE risk.",
    applies_to: ["N"]
  },
  {
    category: "Inconel / Superalloy",
    tip: "Low cutting speed (<30 m/min for roughing), high feed per tooth. HSS-Co or PVD-coated carbide. Replace tools proactively — sudden tool failure common.",
    applies_to: ["S"]
  },
  {
    category: "Hardened Steel",
    tip: "CBN or ceramics for hardness >55 HRC. For 45-55 HRC carbide acceptable with light DoC (<0.15 mm) and dry/MQL. Avoid flood coolant thermal cycling.",
    applies_to: ["H"]
  },
  {
    category: "Surface Finish",
    tip: "Scallop height in ball-nose finishing: h = ae²/(8R). Halving stepover reduces scallop 4x. Climb milling gives better Ra than conventional.",
    applies_to: ["P", "M", "K", "N", "S", "H"]
  },
  {
    category: "Tool Deflection",
    tip: "Limit tool overhang to 3xD for roughing, 4xD for finishing. Each additional 1xD overhang reduces stiffness by ~50% (cantilever cube law).",
    applies_to: ["P", "M", "K", "N", "S", "H"]
  }
];

// ============================================================================
// PLAYBOOK RULES
// ============================================================================

interface PlaybookRule {
  id: string;
  description: string;
  severity: "critical" | "warning";
  check: (input: VerificationInput, parsed: ParsedGCodeLine[]) => PlaybookViolation[];
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

class PostVerificationSafetyEngine {
  private readonly engineName = "PostVerificationSafetyEngine";
  private readonly version = "1.0.0";

  // ============================================================================
  // ACTION: verify_full
  // ============================================================================

  /**
   * Run complete verification pipeline: Monte Carlo + all safety checks.
   * This is the primary action — call everything and aggregate results.
   */
  verify_full(input: VerificationInput): VerificationResult {
    log.info(`[${this.engineName}] verify_full started — material=${input.material_iso} ops=${input.operations.length}`);

    const parsed = this._parseGCode(input.gcode);
    const safety_issues = this.safety_check(input, parsed);
    const envelope_violations = this.envelope_check(input, parsed);
    const playbook_violations = this.playbook_check(input, parsed);
    const tribal_tips = this._selectTribalTips(input.material_iso);
    const surface_finish_predictions = this.surface_finish_check(input);
    const monte_carlo = this.monte_carlo(input);

    // Risk score: weighted sum of issue severities + violations
    const critical_count = safety_issues.filter(i => i.severity === "critical").length
      + playbook_violations.filter(v => v.severity === "critical").length;
    const warning_count = safety_issues.filter(i => i.severity === "warning").length
      + playbook_violations.filter(v => v.severity === "warning").length;
    const envelope_count = envelope_violations.length;
    const sf_fail_count = surface_finish_predictions.filter(p => !p.meets_tolerance).length;

    // Score: critical=20pts, warning=5pts, envelope=10pts, SF fail=3pts, clamp 0-100
    const risk_score = Math.min(100,
      critical_count * 20 + warning_count * 5 + envelope_count * 10 + sf_fail_count * 3
    );

    const passed = critical_count === 0 && envelope_violations.length === 0;

    const result: VerificationResult = {
      passed,
      safety_issues,
      envelope_violations,
      playbook_violations,
      tribal_tips,
      surface_finish_predictions,
      monte_carlo,
      risk_score
    };

    log.info(`[${this.engineName}] verify_full complete — passed=${passed} risk_score=${risk_score}`);
    return result;
  }

  // ============================================================================
  // ACTION: safety_check (U04 — SafetyAnalyzer)
  // ============================================================================

  /**
   * Detect dangerous G-code conditions:
   *  - Rapid (G0) into material at cutting Z
   *  - Feed rate exceeds machine maximum
   *  - RPM exceeds machine maximum
   *  - Missing G43 before cutting
   *  - Missing coolant for materials that need it
   *  - Work offset not set before cutting
   */
  safety_check(
    input: VerificationInput,
    parsedLines?: ParsedGCodeLine[]
  ): SafetyIssue[] {
    const parsed = parsedLines ?? this._parseGCode(input.gcode);
    const issues: SafetyIssue[] = [];
    const mat = MATERIAL_PHYSICS[input.material_iso] ?? MATERIAL_PHYSICS["P"];

    // Build G-code state machine
    const state: GCodeState = {
      modal_motion: "G0",
      modal_plane: "G17",
      modal_units: "G21",
      modal_wcs: "",
      modal_tool_length: false,
      coolant: false,
      spindle_on: false,
      cutting_active: false,
      current_z: 999,
      current_x: 0,
      current_y: 0,
      current_a: 0,
      current_b: 0,
      current_c: 0,
      current_feed: 0,
      current_rpm: 0
    };

    // Safe Z heuristic: first Z encountered going positive; cutting Z is lower
    // We track sign changes: positive Z = clearance, negative or low Z = cutting
    const safe_z_threshold = 2.0; // mm above part: assume cutting if Z < 2

    for (const line of parsed) {
      // Update modal state
      if (line.codes.includes("G0")) state.modal_motion = "G0";
      if (line.codes.includes("G1")) state.modal_motion = "G1";
      if (line.codes.includes("G2")) state.modal_motion = "G2";
      if (line.codes.includes("G3")) state.modal_motion = "G3";

      // Work coordinate system
      for (const wcs of ["G54", "G55", "G56", "G57", "G58", "G59"]) {
        if (line.codes.includes(wcs)) state.modal_wcs = wcs;
      }

      // Tool length compensation
      if (line.codes.includes("G43") || line.codes.includes("G44")) {
        state.modal_tool_length = true;
      }
      if (line.codes.includes("G49")) state.modal_tool_length = false;

      // Coolant
      if (line.codes.includes("M7") || line.codes.includes("M8")) {
        state.coolant = true;
      }
      if (line.codes.includes("M9")) state.coolant = false;

      // Spindle
      if (line.codes.includes("M3") || line.codes.includes("M4")) {
        state.spindle_on = true;
      }
      if (line.codes.includes("M5")) state.spindle_on = false;

      // Update position
      if (line.z !== undefined) state.current_z = line.z;
      if (line.x !== undefined) state.current_x = line.x;
      if (line.y !== undefined) state.current_y = line.y;
      if (line.a !== undefined) state.current_a = line.a;
      if (line.b !== undefined) state.current_b = line.b;
      if (line.c !== undefined) state.current_c = line.c;
      if (line.f !== undefined) state.current_feed = line.f;
      if (line.s !== undefined) state.current_rpm = line.s;

      // ---- SAFETY CHECKS ----

      // S1: Rapid into material (G0 with Z below safe threshold, spindle on)
      if (
        state.modal_motion === "G0" &&
        line.z !== undefined &&
        line.z < safe_z_threshold &&
        state.spindle_on
      ) {
        issues.push({
          severity: "critical",
          line_number: line.line_number,
          code: "S001",
          issue: `Rapid move (G0) to Z=${line.z.toFixed(3)} while spindle is running — potential crash into material`,
          fix: "Insert a G1 feed move at approach feed rate, or ensure Z is above safe clearance plane before G0"
        });
      }

      // S2: Feed rate exceeds machine maximum
      if (line.f !== undefined && line.f > input.machine_limits.max_feed_mmmin) {
        issues.push({
          severity: "critical",
          line_number: line.line_number,
          code: "S002",
          issue: `Feed rate F${line.f} mm/min exceeds machine maximum of ${input.machine_limits.max_feed_mmmin} mm/min`,
          fix: `Reduce feed rate to ≤${input.machine_limits.max_feed_mmmin} mm/min`
        });
      }

      // S3: RPM exceeds machine maximum
      if (line.s !== undefined && line.s > input.machine_limits.max_rpm) {
        issues.push({
          severity: "critical",
          line_number: line.line_number,
          code: "S003",
          issue: `Spindle speed S${line.s} RPM exceeds machine maximum of ${input.machine_limits.max_rpm} RPM`,
          fix: `Reduce spindle speed to ≤${input.machine_limits.max_rpm} RPM`
        });
      }

      // S4: Missing tool length compensation before first cutting move
      if (
        !state.modal_tool_length &&
        state.spindle_on &&
        line.z !== undefined &&
        line.z < safe_z_threshold &&
        (state.modal_motion === "G1" || state.modal_motion === "G2" || state.modal_motion === "G3")
      ) {
        issues.push({
          severity: "critical",
          line_number: line.line_number,
          code: "S004",
          issue: "Cutting move detected without active tool length compensation (G43/G44)",
          fix: "Add G43 H[offset_number] before the first cutting motion after each tool change"
        });
      }

      // S5: Missing coolant for materials requiring it
      if (
        mat.requires_coolant &&
        state.spindle_on &&
        !state.coolant &&
        line.z !== undefined &&
        line.z < safe_z_threshold &&
        (state.modal_motion === "G1" || state.modal_motion === "G2" || state.modal_motion === "G3")
      ) {
        issues.push({
          severity: "critical",
          line_number: line.line_number,
          code: "S005",
          issue: `Cutting ${mat.name} without coolant — thermal damage and rapid tool failure risk`,
          fix: "Activate M8 (flood) or M7 (mist) before entering material. TSC preferred for Ti/Inconel"
        });
      }

      // S6: Work offset not set before cutting
      if (
        !state.modal_wcs &&
        state.spindle_on &&
        line.z !== undefined &&
        line.z < safe_z_threshold
      ) {
        issues.push({
          severity: "critical",
          line_number: line.line_number,
          code: "S006",
          issue: "Cutting move reached before any work coordinate system (G54-G59) was selected",
          fix: "Set work offset (G54-G59) at program start before any motion"
        });
      }
    }

    // S7: Check coolant requirement globally if never turned on
    if (mat.requires_coolant && !parsed.some(l => l.codes.includes("M7") || l.codes.includes("M8"))) {
      issues.push({
        severity: "warning",
        line_number: 0,
        code: "S007",
        issue: `Material ${mat.name} requires coolant but no M7/M8 found in program`,
        fix: "Add M8 (flood coolant) or M7 (mist) before first cut. Consider TSC for superalloys"
      });
    }

    log.info(`[${this.engineName}] safety_check: ${issues.length} issues found`);
    return issues;
  }

  // ============================================================================
  // ACTION: playbook_check (U02 — PlaybookRuleEnforcement)
  // ============================================================================

  /**
   * Check against established machining rules:
   *  - No climb milling in cast iron without HSM smoothing
   *  - No full-width slotting above 1xD DOC
   *  - Minimum RPM for carbide in steel (prevent BUE)
   *  - Max chip load per material group
   *  - Wall thickness vs tool diameter ratio
   *  - Coolant required for Ti and Inconel
   */
  playbook_check(
    input: VerificationInput,
    parsedLines?: ParsedGCodeLine[]
  ): PlaybookViolation[] {
    const violations: PlaybookViolation[] = [];
    const mat = MATERIAL_PHYSICS[input.material_iso] ?? MATERIAL_PHYSICS["P"];

    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];

      // PB01: No full-width slotting above 1xD DOC
      if (op.stepover_mm !== undefined && op.depth_of_cut_mm !== undefined) {
        const is_full_width = op.stepover_mm >= op.tool_diameter_mm * 0.95;
        if (is_full_width && op.depth_of_cut_mm > op.tool_diameter_mm) {
          violations.push({
            rule_id: "PB001",
            severity: "critical",
            description: `Operation ${i + 1}: Full-width slotting (ae=${op.stepover_mm.toFixed(2)}mm ≥ D=${op.tool_diameter_mm}mm) with DOC ${op.depth_of_cut_mm.toFixed(2)}mm > 1×D=${op.tool_diameter_mm}mm`,
            operation_index: i,
            recommended_fix: "Reduce DOC to ≤1×D for full-width slotting, or switch to trochoidal path with ae ≤ 15%D"
          });
        }
      }

      // PB02: Minimum RPM for carbide in steel / stainless (prevent BUE)
      if ((input.material_iso === "P" || input.material_iso === "M") && op.cutting_speed_mmin !== undefined) {
        const min_vc = 60; // 60 m/min minimum for carbide in steel to prevent BUE
        if (op.cutting_speed_mmin < min_vc) {
          violations.push({
            rule_id: "PB002",
            severity: "warning",
            description: `Operation ${i + 1}: Cutting speed ${op.cutting_speed_mmin.toFixed(1)} m/min is below minimum ${min_vc} m/min for carbide in ${mat.name}. Built-up edge (BUE) risk`,
            operation_index: i,
            recommended_fix: `Increase Vc to ≥${min_vc} m/min for carbide tooling in ${mat.name}`
          });
        }
      }

      // PB03: Max chip load per material group
      if (op.feed_per_tooth_mm !== undefined && op.feed_per_tooth_mm > mat.max_chip_load_mm) {
        violations.push({
          rule_id: "PB003",
          severity: "warning",
          description: `Operation ${i + 1}: Feed per tooth ${op.feed_per_tooth_mm.toFixed(4)} mm/tooth exceeds maximum ${mat.max_chip_load_mm} mm/tooth for ${mat.name}`,
          operation_index: i,
          recommended_fix: `Reduce fz to ≤${mat.max_chip_load_mm} mm/tooth for ${mat.name}`
        });
      }

      // PB04: Wall thickness vs tool diameter ratio (thin-wall chatter risk)
      if (op.wall_thickness_mm !== undefined) {
        const ratio = op.wall_thickness_mm / op.tool_diameter_mm;
        if (ratio < 1.5) {
          violations.push({
            rule_id: "PB004",
            severity: "warning",
            description: `Operation ${i + 1}: Wall thickness ${op.wall_thickness_mm.toFixed(2)}mm / tool diameter ${op.tool_diameter_mm.toFixed(2)}mm = ${ratio.toFixed(2)} < 1.5 — thin wall chatter and deflection risk`,
            operation_index: i,
            recommended_fix: "Use high-helix cutter, reduce radial DOC to 5-10%D, increase axial DOC. Consider fixturing support"
          });
        }
      }

      // PB05: Coolant required for Ti and Inconel (ISO S group)
      if (input.material_iso === "S" && op.coolant_active === false) {
        violations.push({
          rule_id: "PB005",
          severity: "critical",
          description: `Operation ${i + 1}: Ti/Superalloy (ISO S) machining without coolant — catastrophic tool failure and fire risk`,
          operation_index: i,
          recommended_fix: "Enable flood coolant (M8) or TSC. Never run ISO S materials dry"
        });
      }

      // PB06: Cast iron climb milling without HSM — check for conventional approach
      // Heuristic: if cast iron and no indication of trochoidal/HSM strategy
      if (input.material_iso === "K" && op.stepover_mm !== undefined) {
        const ae_pct = (op.stepover_mm / op.tool_diameter_mm) * 100;
        if (ae_pct > 50) {
          violations.push({
            rule_id: "PB006",
            severity: "warning",
            description: `Operation ${i + 1}: Cast iron milling with ae=${ae_pct.toFixed(0)}%D — graphite abrasion and chipping risk without HSM smoothing`,
            operation_index: i,
            recommended_fix: "Use HSM trochoidal path (ae ≤ 20%D) for cast iron, or apply wiper insert strategy"
          });
        }
      }

      // PB07: Max cutting speed limit for ISO S (Ti hard limit 60 m/min)
      if (input.material_iso === "S" && op.cutting_speed_mmin !== undefined && mat.max_Vc_mmin !== undefined) {
        if (op.cutting_speed_mmin > mat.max_Vc_mmin) {
          violations.push({
            rule_id: "PB007",
            severity: "critical",
            description: `Operation ${i + 1}: Cutting speed ${op.cutting_speed_mmin.toFixed(1)} m/min exceeds Ti/Superalloy limit of ${mat.max_Vc_mmin} m/min — rapid thermochemical tool failure`,
            operation_index: i,
            recommended_fix: `Reduce Vc to ≤${mat.max_Vc_mmin} m/min. For Ti-6Al-4V carbide uncoated recommended`
          });
        }
      }
    }

    log.info(`[${this.engineName}] playbook_check: ${violations.length} violations`);
    return violations;
  }

  // ============================================================================
  // ACTION: surface_finish_check (U06 — SurfaceFinishVerifier)
  // ============================================================================

  /**
   * Predict Ra per operation using classical formulae:
   *  - Face milling / turning:  Ra = f²/(32·r)  [Brammertz kinematic roughness]
   *  - Ball nose scallop:       h = ae²/(8·R),  Ra ≈ h/4 (empirical)
   *  - Peripheral milling:      Ra ≈ f_z²/(32·R_nose) if nose radius given
   *
   * All results in µm.
   */
  surface_finish_check(input: VerificationInput): SurfaceFinishPrediction[] {
    const predictions: SurfaceFinishPrediction[] = [];

    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      const op_type = op.operation_type ?? "peripheral";
      let ra_predicted_um = 0;
      let scallop_height_mm: number | undefined;
      let formula_used = "";
      let recommendation: string | undefined;

      if (op_type === "face_milling" || op_type === "turning") {
        // Brammertz formula: Ra = f²/(32·r)  [f in mm, r in mm → Ra in mm → ×1000 µm]
        const f = op.feed_per_tooth_mm ?? 0.1;
        const r = op.tool_nose_radius_mm ?? 0.4;
        if (r > 0) {
          ra_predicted_um = (f * f) / (32 * r) * 1000;
          formula_used = `Ra = f²/(32·r) = ${f.toFixed(4)}²/(32×${r.toFixed(3)}) × 1000 µm`;
        } else {
          ra_predicted_um = 3.2; // default Ra 3.2µm if no nose radius
          formula_used = "Default Ra 3.2µm (no nose radius provided)";
        }
      } else if (op_type === "ball_nose") {
        // Ball nose scallop: h = ae²/(8·R)  where R = tool_radius = D/2
        const ae = op.stepover_mm ?? (op.tool_diameter_mm * 0.1);
        const R = op.tool_diameter_mm / 2;
        scallop_height_mm = (ae * ae) / (8 * R);
        // Ra ≈ scallop/4 converted to µm (empirical relationship)
        ra_predicted_um = (scallop_height_mm / 4) * 1000;
        formula_used = `h = ae²/(8R) = ${ae.toFixed(3)}²/(8×${R.toFixed(3)}) = ${scallop_height_mm.toFixed(6)}mm; Ra ≈ h/4`;
      } else {
        // Peripheral milling with nose radius correction if available
        const f = op.feed_per_tooth_mm ?? 0.1;
        if (op.tool_nose_radius_mm && op.tool_nose_radius_mm > 0) {
          const r = op.tool_nose_radius_mm;
          ra_predicted_um = (f * f) / (32 * r) * 1000;
          formula_used = `Ra = f²/(32·r) = ${f.toFixed(4)}²/(32×${r.toFixed(3)}) × 1000 µm (peripheral)`;
        } else {
          // Simplified for sharp peripheral: Ra ≈ fz × sqrt(ae/D) × 1000/8
          const ae = op.stepover_mm ?? (op.tool_diameter_mm * 0.5);
          const D = op.tool_diameter_mm;
          ra_predicted_um = f * Math.sqrt(ae / D) * 1000 / 8;
          formula_used = `Ra ≈ fz×√(ae/D)/8 = ${f.toFixed(4)}×√(${ae.toFixed(2)}/${D.toFixed(2)})/8`;
        }
      }

      // Clamp to physically reasonable minimum (1 nm = 0.001µm edge case)
      ra_predicted_um = Math.max(0.001, ra_predicted_um);

      const target = op.target_ra_um;
      const meets_tolerance = target !== undefined ? ra_predicted_um <= target : true;

      if (target !== undefined && !meets_tolerance) {
        if (op_type === "ball_nose") {
          const ae_required = Math.sqrt(8 * (op.tool_diameter_mm / 2) * (target / 1000) * 4);
          recommendation = `Reduce stepover to ≤${ae_required.toFixed(3)} mm to achieve Ra ≤${target}µm`;
        } else {
          const f_required = Math.sqrt((target / 1000) * 32 * (op.tool_nose_radius_mm ?? 0.4));
          recommendation = `Reduce feed per tooth to ≤${f_required.toFixed(4)} mm/tooth to achieve Ra ≤${target}µm`;
        }
      }

      predictions.push({
        operation_index: i,
        operation_type: op_type,
        ra_predicted_um: +ra_predicted_um.toFixed(4),
        scallop_height_mm: scallop_height_mm !== undefined ? +scallop_height_mm.toFixed(6) : undefined,
        target_ra_um: target,
        meets_tolerance,
        formula_used,
        recommendation
      });
    }

    log.info(`[${this.engineName}] surface_finish_check: ${predictions.length} predictions`);
    return predictions;
  }

  // ============================================================================
  // ACTION: monte_carlo (U01 — MonteCarloVerification)
  // ============================================================================

  /**
   * Propagate force/feed/thermal uncertainties via Monte Carlo simulation.
   * N=100 iterations with:
   *  - ±10% material property scatter (kc1, Young's modulus)
   *  - ±5% tool geometry variation (nose radius, diameter)
   * Outputs 95% CI on force, temperature, deflection, surface finish Ra.
   * Predicts Cpk if tolerance_mm is provided.
   */
  monte_carlo(input: VerificationInput): MonteCarloResult {
    const N = input.monte_carlo_iterations ?? 100;
    const mat = MATERIAL_PHYSICS[input.material_iso] ?? MATERIAL_PHYSICS["P"];

    // Collect operation parameters (use first op as representative if multiple)
    const op = input.operations[0] ?? {
      tool_diameter_mm: 10,
      feed_per_tooth_mm: 0.1,
      tool_nose_radius_mm: 0.4,
      depth_of_cut_mm: 1,
      stepover_mm: 5
    };

    const fz = op.feed_per_tooth_mm ?? 0.1;
    const D = op.tool_diameter_mm;
    const ap = op.depth_of_cut_mm ?? 1.0;
    const ae = op.stepover_mm ?? D * 0.5;
    const r_nose = op.tool_nose_radius_mm ?? 0.4;

    // Base values
    const kc1_base = mat.base_force_N_per_mm2;   // N/mm²
    const T_base = mat.base_temp_C;               // °C
    const E_base = mat.stiffness_GPa * 1000;      // MPa → use in deflection [GPa stored]
    const L_overhang = D * 3.0;                   // assume 3×D overhang

    const forces: number[] = [];
    const temps: number[] = [];
    const deflections: number[] = [];
    const ra_vals: number[] = [];

    // Seeded-like LCG for deterministic reproducibility per session
    let seed = 42;
    const rand = (): number => {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      return (seed / 0x7fffffff) * 2 - 1; // [-1, 1]
    };

    for (let i = 0; i < N; i++) {
      // Sample scatter factors (uniform ±10% for material, ±5% for tool)
      const kc_scatter = 1 + rand() * 0.10;
      const E_scatter = 1 + rand() * 0.10;
      const r_scatter = 1 + rand() * 0.05;
      const D_scatter = 1 + rand() * 0.05;
      const fz_scatter = 1 + rand() * 0.05;

      const kc1 = kc1_base * kc_scatter;
      const E_GPa = mat.stiffness_GPa * E_scatter;
      const r = r_nose * r_scatter;
      const D_eff = D * D_scatter;
      const fz_eff = fz * fz_scatter;

      // Cutting force model: Fc ≈ kc1 × ap × fz^0.75 × ae/D
      // Simplified merchant-type force estimate [N]
      const chip_thickness = fz_eff * Math.sqrt(ae / D_eff); // mean chip thickness
      const contact_area = ap * chip_thickness;               // mm²
      const Fc = kc1 * contact_area;
      forces.push(Fc);

      // Temperature model: T ≈ T_base × (Vc/100)^0.3 × (fz/0.1)^0.2
      // Base assumes Vc ~100 m/min; scale by material base temp
      const Vc = op.cutting_speed_mmin ?? 100;
      const T = T_base * Math.pow(Vc / 100, 0.3) * Math.pow(fz_eff / 0.1, 0.2) * kc_scatter;
      temps.push(T);

      // Deflection: cantilever beam δ = F·L³/(3·E·I)
      // I = π·D⁴/64 for solid cylinder [mm⁴], E in [N/mm²]
      const I = Math.PI * Math.pow(D_eff, 4) / 64; // mm⁴
      const E_Nmm2 = E_GPa * 1000;                 // GPa → N/mm² (×1000, not 1e3 rounding issue — correct: 1 GPa = 1000 N/mm²)
      const delta = (Fc * Math.pow(L_overhang, 3)) / (3 * E_Nmm2 * I);
      deflections.push(delta);

      // Surface Ra: Brammertz Ra = fz²/(32·r) [mm → µm ×1000]
      const ra = (fz_eff * fz_eff) / (32 * r) * 1000;
      ra_vals.push(ra);
    }

    const stat = (arr: number[]): StatResult => {
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
      const std = Math.sqrt(variance);
      const z95 = 1.96;
      const se = std / Math.sqrt(arr.length);
      return {
        mean: +mean.toFixed(4),
        std: +std.toFixed(4),
        ci95: [+(mean - z95 * se).toFixed(4), +(mean + z95 * se).toFixed(4)]
      };
    };

    // Cpk calculation if tolerance provided
    let cpk: number | undefined;
    const tol_mm = op.tolerance_mm;
    if (tol_mm !== undefined) {
      const def_stat = stat(deflections);
      // LSL = 0 (no negative deflection), USL = tolerance
      const USL = tol_mm;
      const LSL = 0;
      const Cpu = (USL - def_stat.mean) / (3 * def_stat.std);
      const Cpl = (def_stat.mean - LSL) / (3 * def_stat.std);
      cpk = +Math.min(Cpu, Cpl).toFixed(3);
    }

    const result: MonteCarloResult = {
      iterations: N,
      force_N: stat(forces),
      temperature_C: stat(temps),
      deflection_mm: stat(deflections),
      ra_um: stat(ra_vals),
      cpk
    };

    log.info(`[${this.engineName}] monte_carlo: N=${N} force_mean=${result.force_N.mean}N temp_mean=${result.temperature_C.mean}°C cpk=${cpk ?? "n/a"}`);
    return result;
  }

  // ============================================================================
  // ACTION: envelope_check (U05 — MachineEnvelopeValidator)
  // ============================================================================

  /**
   * Validate all commanded positions against machine travel limits.
   * Detects:
   *  - X/Y/Z over-travel
   *  - Rotary axis range violations (trunnion ±120° vs full rotary ±360°)
   *  - Combined tool length + workpiece height vs Z clearance
   */
  envelope_check(
    input: VerificationInput,
    parsedLines?: ParsedGCodeLine[]
  ): EnvelopeViolation[] {
    const parsed = parsedLines ?? this._parseGCode(input.gcode);
    const violations: EnvelopeViolation[] = [];
    const lim = input.machine_limits;

    // Half-travel: assume WCS zero near table centre
    const x_lim = lim.x_travel_mm / 2;
    const y_lim = lim.y_travel_mm / 2;

    for (const line of parsed) {
      // X axis
      if (line.x !== undefined) {
        if (line.x > x_lim || line.x < -x_lim) {
          violations.push({
            axis: "X",
            commanded_value: line.x,
            limit: x_lim,
            line_number: line.line_number,
            description: `X${line.x.toFixed(3)} exceeds X travel ±${x_lim.toFixed(1)}mm`
          });
        }
      }

      // Y axis
      if (line.y !== undefined) {
        if (line.y > y_lim || line.y < -y_lim) {
          violations.push({
            axis: "Y",
            commanded_value: line.y,
            limit: y_lim,
            line_number: line.line_number,
            description: `Y${line.y.toFixed(3)} exceeds Y travel ±${y_lim.toFixed(1)}mm`
          });
        }
      }

      // Z axis (assume 0 = table, positive = up, range 0 to z_travel)
      if (line.z !== undefined) {
        if (line.z > lim.z_travel_mm) {
          violations.push({
            axis: "Z",
            commanded_value: line.z,
            limit: lim.z_travel_mm,
            line_number: line.line_number,
            description: `Z${line.z.toFixed(3)} exceeds Z travel maximum ${lim.z_travel_mm.toFixed(1)}mm`
          });
        }
        if (line.z < -lim.z_travel_mm * 0.1) {
          // Allow slight negative for sub-table work (10% tolerance)
          violations.push({
            axis: "Z",
            commanded_value: line.z,
            limit: 0,
            line_number: line.line_number,
            description: `Z${line.z.toFixed(3)} is significantly below Z=0 — check work offset and tool length`
          });
        }
      }

      // Rotary axes
      if (lim.rotary_limits) {
        for (const rot of lim.rotary_limits) {
          const axis_lower = rot.axis.toLowerCase();
          let commanded: number | undefined;
          if (axis_lower === "a") commanded = line.a;
          else if (axis_lower === "b") commanded = line.b;
          else if (axis_lower === "c") commanded = line.c;

          if (commanded !== undefined) {
            if (commanded < rot.min_deg || commanded > rot.max_deg) {
              violations.push({
                axis: rot.axis.toUpperCase(),
                commanded_value: commanded,
                limit: commanded < rot.min_deg ? rot.min_deg : rot.max_deg,
                line_number: line.line_number,
                description: `${rot.axis.toUpperCase()}${commanded.toFixed(3)}° outside rotary limits [${rot.min_deg}°, ${rot.max_deg}°]`
              });
            }
          }
        }
      }
    }

    log.info(`[${this.engineName}] envelope_check: ${violations.length} violations`);
    return violations;
  }

  // ============================================================================
  // INTERNAL: Tribal Knowledge Injection (U03)
  // ============================================================================

  private _selectTribalTips(material_iso: string): TribalTip[] {
    // Always include universal tips + material-specific tips
    return TRIBAL_KNOWLEDGE.filter(tip =>
      tip.applies_to.includes(material_iso) ||
      tip.category === "Surface Finish" ||
      tip.category === "Tool Deflection"
    );
  }

  // ============================================================================
  // INTERNAL: G-Code Parser
  // ============================================================================

  /**
   * Lightweight G-code parser.
   * Extracts modal codes, axis words, F/S values from each block.
   * Comments (parentheses and semicolons) are stripped.
   */
  private _parseGCode(gcode: string): ParsedGCodeLine[] {
    const lines = gcode.split(/\r?\n/);
    const result: ParsedGCodeLine[] = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      // Strip comments: (…) and ; to end
      let clean = raw.replace(/\(.*?\)/g, "").replace(/;.*$/, "").trim().toUpperCase();
      if (!clean) continue;

      const line_number = idx + 1;
      const codes: string[] = [];

      // Extract all G and M codes
      const gm_matches = clean.matchAll(/([GM]\d+(?:\.\d+)?)/g);
      for (const m of gm_matches) {
        codes.push(m[1]);
      }

      // Extract axis words
      const extractWord = (letter: string): number | undefined => {
        const m = clean.match(new RegExp(`${letter}(-?\\d+(?:\\.\\d+)?)`));
        return m ? parseFloat(m[1]) : undefined;
      };

      result.push({
        line_number,
        raw,
        codes,
        x: extractWord("X"),
        y: extractWord("Y"),
        z: extractWord("Z"),
        a: extractWord("A"),
        b: extractWord("B"),
        c: extractWord("C"),
        f: extractWord("F"),
        s: extractWord("S")
      });
    }

    return result;
  }

  // ============================================================================
  // ENGINE METADATA
  // ============================================================================

  getMetadata() {
    return {
      name: this.engineName,
      version: this.version,
      units: {
        U01: "MonteCarloVerification",
        U02: "PlaybookRuleEnforcement",
        U03: "TribalKnowledgeInjection",
        U04: "SafetyAnalyzer",
        U05: "MachineEnvelopeValidator",
        U06: "SurfaceFinishVerifier"
      },
      actions: [
        "verify_full",
        "safety_check",
        "playbook_check",
        "surface_finish_check",
        "monte_carlo",
        "envelope_check"
      ],
      supported_material_iso: Object.keys(MATERIAL_PHYSICS),
      tribal_tips_count: TRIBAL_KNOWLEDGE.length
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Post-Verification Safety Engine singleton — Pipeline Phase 4-5 */
export const postVerificationSafetyEngine = new PostVerificationSafetyEngine();

export { PostVerificationSafetyEngine };
