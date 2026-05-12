/**
 * PostProcessorCPSImplementationEngine — PP-CPS-IMPL
 * ======================================================
 * Captures production-grade post processor implementation knowledge
 * from PRISM-enhanced Fusion 360 CPS files.
 *
 * Source files (H:/PRISM/resources/FUSION POSTS/):
 *   - HURCO_VM30i_PRISM.cps (Hurco VM30i enhanced)
 *   - HURCO_VM30i_PRISM_v10_8_DRILLFIX.cps (drilling fixes)
 *   - OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5.2.5.cps (mill-turn)
 *
 * CAPTURED KNOWLEDGE:
 *   1. PRISM Enhanced Roughing Technology
 *      - Dynamic Depth Feed Adjustment
 *      - Intelligent Chip Thinning Compensation
 *      - Corner Deceleration Control with G-Force Limiting
 *      - Arc Feed Correction for Constant Chip Thickness
 *      - Direction Change Detection with Smooth Feed Ramping
 *      - 8-Level Aggressiveness Control
 *      - Tool Stickout Analysis with Deflection Compensation
 *
 *   2. CONTROLLER-SPECIFIC OPTIMIZATIONS
 *      - Hurco WinMAX: G05.3, M16, M98, M140
 *      - Okuma OSP-P300SA: Super NURBS G131, HSM G132, Machining Navi
 *      - Okuma cycle time M-codes: M61/M63/M64/M65/M66/M141
 *
 *   3. MILL-TURN FEATURES
 *      - B-axis turret positioning
 *      - Polar interpolation
 *      - Spring pass handling
 *      - Cycle cancellation for homing
 *      - Circular tool preload
 *      - Spindle 2 (G141) offset compensation
 *
 *   4. VERSION HISTORY & BUG FIXES (production lessons)
 *      - 4308-01 ALARM-D fix (safe retract)
 *      - B90 turret positioning fix
 *      - Polar feed calculation fix
 *      - Canned cycle K/I parameter selection
 *
 * @module engines/PostProcessorCPSImplementationEngine
 * @milestone PP-CPS-IMPL
 * @version 1.0.0
 */

// ============================================================================
// PRISM ENHANCED CPS FILE REGISTRY
// ============================================================================

const PRISM_ENHANCED_CPS_FILES: PrismCPSFile[] = [
  {
    id: "hurco-vm30i-prism",
    filename: "HURCO_VM30i_PRISM.cps",
    path: "H:/PRISM/resources/FUSION POSTS/HURCO_VM30i_PRISM.cps",
    machine: "Hurco VM30i",
    manufacturer: "Hurco",
    controller: "WinMax (ISNC/BNC Compatible)",
    machineType: "3-Axis VMC",
    enhancements: [
      "PRISM Enhanced Roughing Technology",
      "Dynamic Depth Feed Adjustment",
      "Intelligent Chip Thinning Compensation",
      "Corner Deceleration with G-Force Limiting",
      "Arc Feed Correction (Constant Chip Thickness)",
      "Direction Change Detection + Smooth Feed Ramping",
      "8-Level Aggressiveness Control (Conservative → Max MRR)",
      "Tool Stickout Analysis + Deflection Compensation",
      "G05.3 Smoothing (Auto Rough P35 / Finish P10)",
      "M16 Automatic Buffering",
      "M98 Subprogram Support for Air Through Spindle",
      "M140 Z-Axis Retract Support"
    ],
    status: "production"
  },
  {
    id: "hurco-vm30i-prism-drillfix",
    filename: "HURCO_VM30i_PRISM_v10_8_DRILLFIX.cps",
    path: "H:/PRISM/resources/FUSION POSTS/HURCO_VM30i_PRISM_v10_8_DRILLFIX.cps",
    machine: "Hurco VM30i",
    manufacturer: "Hurco",
    controller: "WinMax (ISNC/BNC Compatible)",
    machineType: "3-Axis VMC",
    enhancements: [
      "All HURCO_VM30i_PRISM features",
      "Drilling cycle fixes (v10.8)",
      "Peck retract handling",
      "Deep hole cycle optimization"
    ],
    status: "production"
  },
  {
    id: "okuma-multus-b250iiw",
    filename: "OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5.2.5.cps",
    path: "H:/PRISM/resources/FUSION POSTS/OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5.2.5 2.cps",
    machine: "Okuma Multus B250IIW",
    manufacturer: "Okuma",
    controller: "OSP-P300SA",
    machineType: "Mill-Turn",
    enhancements: [
      "Circular Tool Preload (reduces cycle start time)",
      "Spindle 2 (G141) Offset Compensation",
      "Super NURBS (G131) with quality levels",
      "High-Speed Machining Mode (G132)",
      "Machining Navi (AI-optimized feeds)",
      "Variable Spindle Speed (SSV)",
      "Enhanced look-ahead buffering",
      "Collision Avoidance System (CAS) control",
      "iMACHINING-style feed control",
      "Arc feed correction",
      "Direction change feed reduction",
      "Dynamic depth feed adjustment",
      "Chip thinning compensation",
      "Minimum Z retract optimization",
      "Okuma cycle time M-codes (M61/M63/M64/M65/M66/M141)",
      "B90 turret positioning auto-correction",
      "Polar interpolation fixes",
      "Safe retract with G20 HP=1"
    ],
    status: "production",
    bugFixes: [
      { version: "v5.2.5", date: "2026-01-28", description: "4308-01 ALARM-D fix: safe retract uses G20 HP=1 instead of G0 X18.8633" },
      { version: "v5", date: "2026-01-28", description: "B90 turret auto-positioning (TDS position 5)" },
      { version: "v4", date: "2026-01-28", description: "Polar feed calculation + spring pass rapids + canned cycle K/I selection + polar interpolation jerkiness + drilling homing alarms + spindle stop after drilling" }
    ]
  }
];

interface PrismCPSFile {
  id: string;
  filename: string;
  path: string;
  machine: string;
  manufacturer: string;
  controller: string;
  machineType: string;
  enhancements: string[];
  status: "production" | "development" | "experimental";
  bugFixes?: Array<{ version: string; date: string; description: string }>;
}

// ============================================================================
// PRISM ENHANCED ROUGHING TECHNOLOGY FEATURES
// ============================================================================

const PRISM_ROUGHING_FEATURES: RoughingFeature[] = [
  {
    id: "dynamic-depth-feed",
    name: "Dynamic Depth Feed Adjustment",
    description: "Adjusts feed rate based on actual depth of cut encountered in 3D adaptive paths",
    category: "feed-control",
    applicability: "3D adaptive roughing",
    benefitPct: 30,
    physicsBasis: "Scales feed with 1/depth ratio to maintain constant material removal rate under varying engagement",
    implementationApproach: "Real-time depth calculation in onLinear() handler, applied to feed output"
  },
  {
    id: "chip-thinning-compensation",
    name: "Intelligent Chip Thinning Compensation",
    description: "Compensates feed rate for chip thinning at light radial engagements (<30% Ae)",
    category: "feed-control",
    applicability: "Peripheral milling, trochoidal",
    benefitPct: 40,
    physicsBasis: "Sarin chip thinning formula: FPT_effective = FPT × √(Dt/Ae) / (Dt/Ae-1+1)",
    implementationApproach: "Calculate RCTF (Radial Chip Thinning Factor) and multiply feed"
  },
  {
    id: "corner-decel",
    name: "Corner Deceleration with G-Force Limiting",
    description: "Slows feed at corners to limit G-force on spindle/tool",
    category: "motion-control",
    applicability: "Any cornering moves",
    benefitPct: 15,
    physicsBasis: "Centripetal acceleration a = v²/r, limited to machine's cutting accel spec",
    implementationApproach: "Detect corner angle in onLinear(), calculate max feed for radius, apply slowdown"
  },
  {
    id: "arc-feed-correction",
    name: "Arc Feed Correction for Constant Chip Thickness",
    description: "Adjusts feed on arcs (G02/G03) to maintain constant chip thickness",
    category: "feed-control",
    applicability: "Circular interpolation",
    benefitPct: 20,
    physicsBasis: "Effective feed differs between inside and outside radius by (R+r)/R ratio",
    implementationApproach: "onCircular() handler calculates effective feed based on arc radius vs tool radius"
  },
  {
    id: "direction-change-ramping",
    name: "Direction Change Detection + Smooth Feed Ramping",
    description: "Detects direction changes and ramps feed smoothly to prevent tool stress",
    category: "motion-control",
    applicability: "High-speed machining",
    benefitPct: 25,
    physicsBasis: "Reduces instantaneous acceleration spikes at direction reversals",
    implementationApproach: "Track vector of last move, detect angle change, output variable feed"
  },
  {
    id: "aggressiveness-8-level",
    name: "8-Level Aggressiveness Control",
    description: "User selects aggressiveness level from 1 (Conservative) to 8 (Maximum MRR)",
    category: "feed-control",
    applicability: "All roughing",
    benefitPct: 50,
    physicsBasis: "Scales feed/depth combinations based on Taylor tool life curve optimum",
    implementationApproach: "Configurable multiplier table applied to computed feeds"
  },
  {
    id: "stickout-deflection",
    name: "Tool Stickout Analysis with Deflection Compensation",
    description: "Analyzes tool stickout and applies deflection compensation",
    category: "accuracy",
    applicability: "Finishing passes",
    benefitPct: 15,
    physicsBasis: "Cantilever beam deflection δ = FL³/3EI compensated in path",
    implementationApproach: "Modify G-code X/Y offsets based on calculated deflection"
  }
];

interface RoughingFeature {
  id: string;
  name: string;
  description: string;
  category: "feed-control" | "motion-control" | "accuracy" | "cycle-time";
  applicability: string;
  benefitPct: number;
  physicsBasis: string;
  implementationApproach: string;
}

// ============================================================================
// CONTROLLER-SPECIFIC IMPLEMENTATION PATTERNS
// ============================================================================

const CONTROLLER_IMPLEMENTATIONS: ControllerImplementation[] = [
  {
    id: "hurco-winmax",
    controller: "Hurco WinMAX",
    manufacturer: "Hurco",
    gcodes: [
      { code: "G05.3", name: "Smoothing/HSM Mode", params: "P value (rough=35, finish=10)", usage: "Activate at start of operation, cancel at end" },
      { code: "M16", name: "Automatic Buffering", params: "none", usage: "Smooth motion, prevents stuttering" },
      { code: "M98", name: "Subprogram Call", params: "P####", usage: "Air through spindle subroutine" },
      { code: "M140", name: "Z-Axis Retract", params: "none", usage: "Safe Z retract" }
    ],
    bestPractices: [
      "Use G05.3 P35 for roughing to allow some blending",
      "Use G05.3 P10 for finishing to preserve accuracy",
      "M16 should wrap cutting moves for smoothness",
      "Always cancel G05.3 before tool change",
      "Use M140 between operations for safe repositioning"
    ],
    commonIssues: [
      { issue: "Cycle stoppage in deep pockets", cause: "Buffer overflow without M16", solution: "Wrap cutting with M16 / M17" },
      { issue: "Chatter on finish pass", cause: "G05.3 P value too low", solution: "Use G05.3 P10 minimum" }
    ]
  },
  {
    id: "okuma-osp-p300sa",
    controller: "Okuma OSP-P300SA",
    manufacturer: "Okuma",
    gcodes: [
      { code: "G131", name: "Super NURBS", params: "P1-P5 (quality levels)", usage: "Smooth complex 3D surfaces" },
      { code: "G132", name: "High-Speed Machining Mode", params: "none", usage: "Activate HSM" },
      { code: "G141", name: "Spindle 2 Work Offset", params: "none", usage: "Switch to sub-spindle coordinates" },
      { code: "M61", name: "CSS Smoothing", params: "none", usage: "No stops for RPM changes during CSS" },
      { code: "M63", name: "Ignore Spindle Answer", params: "none", usage: "Axis moves during spindle accel/decel" },
      { code: "M64", name: "Move Optimization", params: "none", usage: "Optimize tool change moves" },
      { code: "M65", name: "Turret Index During Motion", params: "none", usage: "Index while axis moves (caution!)" },
      { code: "M66", name: "Tool Change Optimization", params: "none", usage: "Optimize tool change" },
      { code: "M141", name: "Skip C-Axis Clamp", params: "none", usage: "Faster drilling cycles" }
    ],
    bestPractices: [
      "Use G131 P3 for general 3D finishing (balance of speed/quality)",
      "Use G131 P5 for mirror-finish surfaces",
      "G132 HSM mode requires CAS (Collision Avoidance) enabled",
      "M63 saves 0.5-2s per tool change — use liberally",
      "M65 is risky — only use if turret clearance verified",
      "Combined commands (T1 M03 on same line) saves time",
      "Machining Navi learns over time — early programs may need manual tuning"
    ],
    commonIssues: [
      { issue: "4308-01 ALARM-D on position change", cause: "X not at machine limit before tool change", solution: "Use G20 HP=1 instead of G0 X18.8633" },
      { issue: "B90 drilling alarm", cause: "Same tool used at different B angles without turret reposition", solution: "Force turret position change (position 5 for B90)" },
      { issue: "Polar feed jerkiness", cause: "Low tolerance value", solution: "Increase polar interpolation tolerance" },
      { issue: "Drilling homing alarm", cause: "Cycle not cancelled before homing", solution: "Add G80 before G28/G30" }
    ]
  },
  {
    id: "okuma-osp-p300l",
    controller: "Okuma OSP-P300L",
    manufacturer: "Okuma",
    gcodes: [
      { code: "G85", name: "External Roughing Cycle", params: "X, Z, D, F", usage: "OD roughing with stock allowance" },
      { code: "G87", name: "Back Boring Cycle", params: "X, Z, D, F", usage: "Internal roughing" },
      { code: "G81", name: "Drilling Cycle", params: "X, Z, F", usage: "Standard drilling" },
      { code: "G76", name: "Threading Cycle", params: "X, Z, K, D, F", usage: "Multi-pass threading" },
      { code: "G97", name: "Constant RPM", params: "S", usage: "Rigid RPM for tapping, threading" },
      { code: "G96", name: "Constant Surface Speed", params: "S", usage: "CSS for turning" }
    ],
    bestPractices: [
      "G85 is efficient for OD roughing — let Okuma control pass depth",
      "G87 for ID boring — specify clearly vs G85 (different setup)",
      "Use G97 for threading, not G96 (constant RPM required)",
      "Use G96 for turning to maintain surface speed",
      "G76 multi-pass gives better thread finish than single-pass"
    ],
    commonIssues: [
      { issue: "Thread taper at end", cause: "Z retract too aggressive", solution: "Use larger Z clearance in G76" }
    ]
  }
];

interface ControllerImplementation {
  id: string;
  controller: string;
  manufacturer: string;
  gcodes: Array<{ code: string; name: string; params: string; usage: string }>;
  bestPractices: string[];
  commonIssues: Array<{ issue: string; cause: string; solution: string }>;
}

// ============================================================================
// CYCLE TIME OPTIMIZATION M-CODES (Okuma)
// ============================================================================

const OKUMA_CYCLE_TIME_MCODES: CycleTimeMCode[] = [
  {
    code: "M61",
    name: "CSS Smoothing",
    description: "No stops for RPM changes during Constant Surface Speed",
    timeSaving_sec: 2,
    applicableFor: "Lathe with CSS mode (G96)",
    riskLevel: "low"
  },
  {
    code: "M63",
    name: "Ignore Spindle Answer",
    description: "Axis moves continue during spindle acceleration/deceleration",
    timeSaving_sec: 3,
    applicableFor: "Any machine with tool changes",
    riskLevel: "low"
  },
  {
    code: "M64",
    name: "Move Optimization",
    description: "Optimize tool change movement paths",
    timeSaving_sec: 1,
    applicableFor: "Any tool change",
    riskLevel: "low"
  },
  {
    code: "M65",
    name: "Turret Index During Motion",
    description: "Turret indexes while axis moves",
    timeSaving_sec: 4,
    applicableFor: "Turret machines only",
    riskLevel: "medium",
    warnings: ["Verify turret clearance with all workholding", "Test on simple part first"]
  },
  {
    code: "M66",
    name: "Tool Change Optimization",
    description: "Optimize tool change sequence",
    timeSaving_sec: 2,
    applicableFor: "Machines with ATC",
    riskLevel: "low"
  },
  {
    code: "M141",
    name: "Skip C-Axis Clamp",
    description: "Skip C-axis clamp for faster drilling cycles",
    timeSaving_sec: 1.5,
    applicableFor: "Drilling with C-axis positioning",
    riskLevel: "medium",
    warnings: ["Only safe for light drilling", "Use C-axis clamp for rigid tapping"]
  }
];

interface CycleTimeMCode {
  code: string;
  name: string;
  description: string;
  timeSaving_sec: number;
  applicableFor: string;
  riskLevel: "low" | "medium" | "high";
  warnings?: string[];
}

// ============================================================================
// CPS IMPLEMENTATION ENGINE
// ============================================================================

class PostProcessorCPSImplementationEngine {
  private readonly engineVersion = "1.0.0";

  /**
   * Get all PRISM-enhanced CPS files
   */
  public getCPSFiles(): PrismCPSFile[] {
    return PRISM_ENHANCED_CPS_FILES;
  }

  /**
   * Get CPS file by ID
   */
  public getCPSFile(id: string): PrismCPSFile | undefined {
    return PRISM_ENHANCED_CPS_FILES.find(f => f.id === id);
  }

  /**
   * Find CPS files by machine/manufacturer
   */
  public findCPSForMachine(machineOrManufacturer: string): PrismCPSFile[] {
    const lower = machineOrManufacturer.toLowerCase();
    return PRISM_ENHANCED_CPS_FILES.filter(f =>
      f.machine.toLowerCase().includes(lower) ||
      f.manufacturer.toLowerCase().includes(lower) ||
      f.controller.toLowerCase().includes(lower)
    );
  }

  /**
   * Get all PRISM roughing features
   */
  public getRoughingFeatures(): RoughingFeature[] {
    return PRISM_ROUGHING_FEATURES;
  }

  /**
   * Get roughing feature by ID
   */
  public getRoughingFeature(id: string): RoughingFeature | undefined {
    return PRISM_ROUGHING_FEATURES.find(f => f.id === id);
  }

  /**
   * Get features by category
   */
  public getRoughingFeaturesByCategory(category: RoughingFeature["category"]): RoughingFeature[] {
    return PRISM_ROUGHING_FEATURES.filter(f => f.category === category);
  }

  /**
   * Calculate expected benefit from combining features
   */
  public calculateCombinedBenefit(featureIds: string[]): {
    features: RoughingFeature[];
    individualBenefits: number[];
    combinedBenefitPct: number;  // Diminishing returns applied
  } {
    const features = featureIds
      .map(id => this.getRoughingFeature(id))
      .filter((f): f is RoughingFeature => f !== undefined);

    const individualBenefits = features.map(f => f.benefitPct);

    // Diminishing returns: each additional feature gets 80% of its benefit
    let combined = 1.0;
    for (let i = 0; i < individualBenefits.length; i++) {
      const factor = 1 + (individualBenefits[i] / 100) * Math.pow(0.8, i);
      combined *= factor;
    }
    const combinedBenefitPct = (combined - 1) * 100;

    return { features, individualBenefits, combinedBenefitPct };
  }

  /**
   * Get all controller implementations
   */
  public getControllerImplementations(): ControllerImplementation[] {
    return CONTROLLER_IMPLEMENTATIONS;
  }

  /**
   * Get controller implementation by ID
   */
  public getControllerImplementation(id: string): ControllerImplementation | undefined {
    return CONTROLLER_IMPLEMENTATIONS.find(c => c.id === id);
  }

  /**
   * Find controller by manufacturer or name
   */
  public findController(query: string): ControllerImplementation | undefined {
    const lower = query.toLowerCase();
    return CONTROLLER_IMPLEMENTATIONS.find(c =>
      c.id.toLowerCase().includes(lower) ||
      c.controller.toLowerCase().includes(lower) ||
      c.manufacturer.toLowerCase().includes(lower)
    );
  }

  /**
   * Get G-code details for a controller
   */
  public getGCodeDetails(
    controllerId: string,
    gcode: string
  ): ControllerImplementation["gcodes"][0] | undefined {
    const impl = this.getControllerImplementation(controllerId);
    if (!impl) return undefined;

    const upperCode = gcode.toUpperCase();
    return impl.gcodes.find(g => g.code.toUpperCase() === upperCode);
  }

  /**
   * Get solutions for common controller issues
   */
  public getIssueSolutions(controllerId: string, symptom: string): Array<{
    issue: string;
    cause: string;
    solution: string;
  }> {
    const impl = this.getControllerImplementation(controllerId);
    if (!impl) return [];

    const lowerSymptom = symptom.toLowerCase();
    return impl.commonIssues.filter(i =>
      i.issue.toLowerCase().includes(lowerSymptom) ||
      i.cause.toLowerCase().includes(lowerSymptom)
    );
  }

  /**
   * Get all Okuma cycle time M-codes
   */
  public getOkumaCycleTimeMCodes(): CycleTimeMCode[] {
    return OKUMA_CYCLE_TIME_MCODES;
  }

  /**
   * Get cycle time M-codes filtered by risk level
   */
  public getOkumaMCodesByRisk(risk: CycleTimeMCode["riskLevel"]): CycleTimeMCode[] {
    return OKUMA_CYCLE_TIME_MCODES.filter(m => m.riskLevel === risk);
  }

  /**
   * Calculate total potential cycle time savings
   */
  public calculateOkumaTimeSavings(mcodes: string[]): {
    applied: CycleTimeMCode[];
    total_sec: number;
    warnings: string[];
  } {
    const applied: CycleTimeMCode[] = [];
    const warnings: string[] = [];

    for (const code of mcodes) {
      const upperCode = code.toUpperCase();
      const mcode = OKUMA_CYCLE_TIME_MCODES.find(m => m.code.toUpperCase() === upperCode);
      if (mcode) {
        applied.push(mcode);
        if (mcode.warnings) {
          warnings.push(...mcode.warnings);
        }
      }
    }

    const total_sec = applied.reduce((sum, m) => sum + m.timeSaving_sec, 0);
    return { applied, total_sec, warnings };
  }

  /**
   * Recommend features for a use case
   */
  public recommendFeatures(useCase: {
    operationType: "roughing" | "finishing" | "drilling" | "hsm";
    material: string;
    machineType: string;
    priorityCycleTime: boolean;
    priorityToolLife: boolean;
    priorityFinish: boolean;
  }): RoughingFeature[] {
    let candidates = [...PRISM_ROUGHING_FEATURES];

    // Operation filter
    if (useCase.operationType === "roughing") {
      candidates = candidates.filter(f =>
        f.applicability.toLowerCase().includes("adaptive") ||
        f.applicability.toLowerCase().includes("roughing") ||
        f.applicability.toLowerCase().includes("all")
      );
    }
    if (useCase.operationType === "finishing") {
      candidates = candidates.filter(f =>
        f.applicability.toLowerCase().includes("finishing") ||
        f.category === "accuracy"
      );
    }

    // Priority sorting
    if (useCase.priorityCycleTime) {
      candidates.sort((a, b) => b.benefitPct - a.benefitPct);
    } else if (useCase.priorityToolLife) {
      candidates = candidates.filter(f => f.category !== "cycle-time");
      candidates.sort((a, b) => b.benefitPct - a.benefitPct);
    } else if (useCase.priorityFinish) {
      candidates = candidates.filter(f => f.category === "accuracy" || f.category === "motion-control");
    }

    return candidates;
  }

  /**
   * Get production lessons (from version history)
   */
  public getProductionLessons(): Array<{ file: string; version: string; lesson: string }> {
    const lessons: Array<{ file: string; version: string; lesson: string }> = [];

    for (const file of PRISM_ENHANCED_CPS_FILES) {
      if (file.bugFixes) {
        for (const fix of file.bugFixes) {
          lessons.push({
            file: file.filename,
            version: fix.version,
            lesson: fix.description
          });
        }
      }
    }

    return lessons;
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    version: string;
    cpsFiles: number;
    roughingFeatures: number;
    controllerImplementations: number;
    totalGCodes: number;
    cycleTimeMCodes: number;
    productionLessons: number;
  } {
    const totalGCodes = CONTROLLER_IMPLEMENTATIONS.reduce(
      (sum, c) => sum + c.gcodes.length,
      0
    );
    const productionLessons = PRISM_ENHANCED_CPS_FILES.reduce(
      (sum, f) => sum + (f.bugFixes?.length || 0),
      0
    );

    return {
      version: this.engineVersion,
      cpsFiles: PRISM_ENHANCED_CPS_FILES.length,
      roughingFeatures: PRISM_ROUGHING_FEATURES.length,
      controllerImplementations: CONTROLLER_IMPLEMENTATIONS.length,
      totalGCodes,
      cycleTimeMCodes: OKUMA_CYCLE_TIME_MCODES.length,
      productionLessons
    };
  }

  /**
   * Get AI context
   */
  public getContextForAI(): string {
    const stats = this.getStatistics();
    return `
POST PROCESSOR CPS IMPLEMENTATION ENGINE (v${this.engineVersion})
==================================================================
PRODUCTION CPS FILES: ${stats.cpsFiles}
  - HURCO VM30i PRISM (+ drillfix variant)
  - Okuma Multus B250IIW Ultra Enhanced v5.2.5

PRISM ROUGHING TECHNOLOGY: ${stats.roughingFeatures} features
  - Dynamic depth feed, chip thinning, corner decel, arc feed correction
  - Direction change ramping, 8-level aggressiveness, stickout deflection

CONTROLLER IMPLEMENTATIONS: ${stats.controllerImplementations}
  - Hurco WinMAX: G05.3, M16, M98, M140
  - Okuma OSP-P300SA: G131, G132, G141, M61-M66, M141
  - Okuma OSP-P300L: G85, G87, G81, G76, G97, G96

OKUMA CYCLE TIME OPTIMIZATION: ${stats.cycleTimeMCodes} M-codes
  - M63 (ignore spindle answer), M61 (CSS smoothing)
  - M65 (turret index during motion) — risky
  - M141 (skip C-axis clamp) — drilling only

PRODUCTION LESSONS: ${stats.productionLessons} (bug fixes from real CPS versions)
  - 4308-01 ALARM-D fix (safe retract)
  - B90 turret positioning
  - Polar feed calculation
  - Drilling homing alarms

API METHODS:
  getCPSFiles() → 3 PRISM-enhanced files
  findCPSForMachine(machine) → matching files
  getRoughingFeatures() → 7 features
  calculateCombinedBenefit(ids) → combined % improvement
  getControllerImplementation(id) → full implementation details
  getGCodeDetails(controller, code) → G-code specification
  getIssueSolutions(controller, symptom) → troubleshooting
  calculateOkumaTimeSavings(mcodes) → cycle time reduction
  recommendFeatures(useCase) → best features for scenario
  getProductionLessons() → bug fixes from version history
`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorCPSImplementationEngine = new PostProcessorCPSImplementationEngine();

export {
  PRISM_ENHANCED_CPS_FILES,
  PRISM_ROUGHING_FEATURES,
  CONTROLLER_IMPLEMENTATIONS,
  OKUMA_CYCLE_TIME_MCODES,
  type PrismCPSFile,
  type RoughingFeature,
  type ControllerImplementation,
  type CycleTimeMCode
};
