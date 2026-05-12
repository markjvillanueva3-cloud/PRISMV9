/**
 * OkumaLegacyControllerEngine — OSP-P100 Legacy Controller Support
 *
 * Provides comprehensive support for Okuma OSP-P100 controllers, which differ
 * significantly from modern P200/P300/P500 controllers. Many older Okuma lathes
 * at JM DIE and other shops still use P100 controllers.
 *
 * Key OSP-P100 differences from modern controllers:
 *   - Different canned cycle syntax (G71/G72/G73 variations)
 *   - No NAVI functions (collision avoidance, path optimization)
 *   - Limited or no G8.1/G8.3 NURBS support
 *   - Different parameter numbering scheme
 *   - Memory constraints (often 256KB-1MB program capacity)
 *   - No IGFF (Intelligent Geometric Feed Forward)
 *   - No Super-NURBS, no AI assist functions
 *   - Limited macro variable range (V1-V100, VC100-VC200 only)
 *
 * Integration points:
 *   - OkumaOSPParserEngine — program parsing
 *   - OkumaDialectKnowledgeEngine — dialect tips
 *   - LathePostProcessorEngine — output formatting
 *   - ControllerDialectEngine — dialect rules
 *
 * @module OkumaLegacyControllerEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Okuma controller model family */
export type OkumaControllerModel =
  | "OSP-P100"
  | "OSP-P200"
  | "OSP-P200L"
  | "OSP-P200LA"
  | "OSP-P300"
  | "OSP-P300L"
  | "OSP-P300LA"
  | "OSP-P300M"
  | "OSP-P300S"
  | "OSP-P300SA"
  | "OSP-P500"
  | "OSP-P500L";

/** Machine type for the controller */
export type OkumaMachineType = "lathe" | "mill" | "multus" | "mill_turn";

/** NURBS interpolation support level */
export type NurbsSupportLevel = "none" | "basic" | "full" | "super";

/** Controller feature profile for an Okuma controller */
export interface OkumaLegacyProfile {
  controllerModel: OkumaControllerModel;
  machineType: OkumaMachineType;
  /** Has NAVI collision avoidance functions */
  hasNAVI: boolean;
  /** Has Intelligent Geometric Feed Forward */
  hasIGFF: boolean;
  /** Maximum program size in bytes (memory constraint) */
  maxProgramSize: number;
  /** NURBS interpolation support level */
  nurbsSupport: NurbsSupportLevel;
  /** Special canned cycles supported */
  specialCycles: string[];
  /** Maximum macro variable number (V-variable) */
  maxMacroVariable: number;
  /** Maximum common variable number (VC-variable) */
  maxCommonVariable: number;
  /** Supports parametric programming */
  hasParametricProgramming: boolean;
  /** Look-ahead blocks (path planning) */
  lookAheadBlocks: number;
  /** Maximum simultaneous axes */
  maxSimultaneousAxes: number;
  /** Has C-axis capability */
  hasCAxis: boolean;
  /** Has live tooling */
  hasLiveTooling: boolean;
  /** Has sub-spindle */
  hasSubSpindle: boolean;
  /** Block processing rate (blocks/sec) */
  blockProcessingRate: number;
  /** Year range for this controller */
  yearRange: { from: number; to: number };
}

/** G-code translation result */
export interface GCodeTranslation {
  originalCode: string;
  translatedCode: string;
  compatible: boolean;
  warnings: string[];
  notes: string[];
  requiresLinearApproximation?: boolean;
  approximationPoints?: number;
}

/** Program compatibility analysis */
export interface CompatibilityAnalysis {
  sourceController: OkumaControllerModel;
  targetController: OkumaControllerModel;
  compatible: boolean;
  criticalIssues: CompatibilityIssue[];
  warnings: CompatibilityIssue[];
  suggestions: string[];
  requiredTranslations: GCodeTranslation[];
  estimatedEffort: "trivial" | "low" | "medium" | "high" | "rewrite_required";
}

export interface CompatibilityIssue {
  severity: "critical" | "warning" | "info";
  code: string;
  line?: number;
  message: string;
  recommendation: string;
}

/** Parse result for legacy P100 programs */
export interface LegacyProgramAnalysis {
  detectedController: OkumaControllerModel;
  confidence: number;
  markers: string[];
  features: LegacyFeatureUsage;
  memoryEstimate: number;
  recommendations: string[];
}

export interface LegacyFeatureUsage {
  usesG71Threading: boolean;
  usesG72Finishing: boolean;
  usesG73PatternRepeat: boolean;
  usesG74PeckDrill: boolean;
  usesG75Grooving: boolean;
  usesG76Threading: boolean;
  usesG85Roughing: boolean;
  usesG87Finishing: boolean;
  usesNURBS: boolean;
  usesNAVI: boolean;
  usesIGFF: boolean;
  usesMacroVariables: boolean;
  maxVariableUsed: number;
  usesCAxis: boolean;
  usesLiveTooling: boolean;
  usesBarFeeder: boolean;
  cannedCyclesUsed: string[];
}

// ============================================================================
// CONTROLLER PROFILES
// ============================================================================

/** Default profiles for each Okuma controller model */
const CONTROLLER_PROFILES: Record<OkumaControllerModel, OkumaLegacyProfile> = {
  "OSP-P100": {
    controllerModel: "OSP-P100",
    machineType: "lathe",
    hasNAVI: false,
    hasIGFF: false,
    maxProgramSize: 256 * 1024, // 256KB typical
    nurbsSupport: "none",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76"],
    maxMacroVariable: 100,
    maxCommonVariable: 200,
    hasParametricProgramming: true,
    lookAheadBlocks: 15,
    maxSimultaneousAxes: 2,
    hasCAxis: false,
    hasLiveTooling: false,
    hasSubSpindle: false,
    blockProcessingRate: 500,
    yearRange: { from: 1990, to: 2005 },
  },
  "OSP-P200": {
    controllerModel: "OSP-P200",
    machineType: "lathe",
    hasNAVI: false,
    hasIGFF: false,
    maxProgramSize: 1024 * 1024, // 1MB
    nurbsSupport: "basic",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G85", "G87"],
    maxMacroVariable: 500,
    maxCommonVariable: 500,
    hasParametricProgramming: true,
    lookAheadBlocks: 40,
    maxSimultaneousAxes: 3,
    hasCAxis: true,
    hasLiveTooling: true,
    hasSubSpindle: false,
    blockProcessingRate: 1000,
    yearRange: { from: 2000, to: 2010 },
  },
  "OSP-P200L": {
    controllerModel: "OSP-P200L",
    machineType: "lathe",
    hasNAVI: false,
    hasIGFF: false,
    maxProgramSize: 1024 * 1024,
    nurbsSupport: "basic",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G85", "G87"],
    maxMacroVariable: 500,
    maxCommonVariable: 500,
    hasParametricProgramming: true,
    lookAheadBlocks: 40,
    maxSimultaneousAxes: 3,
    hasCAxis: true,
    hasLiveTooling: true,
    hasSubSpindle: false,
    blockProcessingRate: 1000,
    yearRange: { from: 2000, to: 2010 },
  },
  "OSP-P200LA": {
    controllerModel: "OSP-P200LA",
    machineType: "lathe",
    hasNAVI: false,
    hasIGFF: false,
    maxProgramSize: 2 * 1024 * 1024, // 2MB
    nurbsSupport: "basic",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G85", "G87"],
    maxMacroVariable: 500,
    maxCommonVariable: 500,
    hasParametricProgramming: true,
    lookAheadBlocks: 60,
    maxSimultaneousAxes: 4,
    hasCAxis: true,
    hasLiveTooling: true,
    hasSubSpindle: true,
    blockProcessingRate: 1500,
    yearRange: { from: 2002, to: 2012 },
  },
  "OSP-P300": {
    controllerModel: "OSP-P300",
    machineType: "mill",
    hasNAVI: true,
    hasIGFF: true,
    maxProgramSize: 8 * 1024 * 1024, // 8MB
    nurbsSupport: "full",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G85", "G87", "G8.1", "G8.3"],
    maxMacroVariable: 999,
    maxCommonVariable: 999,
    hasParametricProgramming: true,
    lookAheadBlocks: 200,
    maxSimultaneousAxes: 5,
    hasCAxis: true,
    hasLiveTooling: true,
    hasSubSpindle: true,
    blockProcessingRate: 5000,
    yearRange: { from: 2010, to: 2020 },
  },
  "OSP-P300L": {
    controllerModel: "OSP-P300L",
    machineType: "lathe",
    hasNAVI: true,
    hasIGFF: true,
    maxProgramSize: 8 * 1024 * 1024,
    nurbsSupport: "full",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G85", "G87", "G8.1", "G8.3"],
    maxMacroVariable: 999,
    maxCommonVariable: 999,
    hasParametricProgramming: true,
    lookAheadBlocks: 200,
    maxSimultaneousAxes: 5,
    hasCAxis: true,
    hasLiveTooling: true,
    hasSubSpindle: true,
    blockProcessingRate: 5000,
    yearRange: { from: 2010, to: 2020 },
  },
  "OSP-P300LA": {
    controllerModel: "OSP-P300LA",
    machineType: "lathe",
    hasNAVI: true,
    hasIGFF: true,
    maxProgramSize: 8 * 1024 * 1024,
    nurbsSupport: "full",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G85", "G87", "G8.1", "G8.3"],
    maxMacroVariable: 999,
    maxCommonVariable: 999,
    hasParametricProgramming: true,
    lookAheadBlocks: 200,
    maxSimultaneousAxes: 5,
    hasCAxis: true,
    hasLiveTooling: true,
    hasSubSpindle: true,
    blockProcessingRate: 5000,
    yearRange: { from: 2010, to: 2020 },
  },
  "OSP-P300M": {
    controllerModel: "OSP-P300M",
    machineType: "mill",
    hasNAVI: true,
    hasIGFF: true,
    maxProgramSize: 8 * 1024 * 1024,
    nurbsSupport: "full",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G8.1", "G8.3"],
    maxMacroVariable: 999,
    maxCommonVariable: 999,
    hasParametricProgramming: true,
    lookAheadBlocks: 200,
    maxSimultaneousAxes: 5,
    hasCAxis: true,
    hasLiveTooling: false,
    hasSubSpindle: false,
    blockProcessingRate: 5000,
    yearRange: { from: 2010, to: 2020 },
  },
  "OSP-P300S": {
    controllerModel: "OSP-P300S",
    machineType: "multus",
    hasNAVI: true,
    hasIGFF: true,
    maxProgramSize: 16 * 1024 * 1024, // 16MB
    nurbsSupport: "full",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G85", "G87", "G8.1", "G8.3"],
    maxMacroVariable: 999,
    maxCommonVariable: 999,
    hasParametricProgramming: true,
    lookAheadBlocks: 400,
    maxSimultaneousAxes: 9,
    hasCAxis: true,
    hasLiveTooling: true,
    hasSubSpindle: true,
    blockProcessingRate: 7000,
    yearRange: { from: 2012, to: 2022 },
  },
  "OSP-P300SA": {
    controllerModel: "OSP-P300SA",
    machineType: "multus",
    hasNAVI: true,
    hasIGFF: true,
    maxProgramSize: 16 * 1024 * 1024,
    nurbsSupport: "super",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G85", "G87", "G8.1", "G8.3"],
    maxMacroVariable: 999,
    maxCommonVariable: 999,
    hasParametricProgramming: true,
    lookAheadBlocks: 400,
    maxSimultaneousAxes: 9,
    hasCAxis: true,
    hasLiveTooling: true,
    hasSubSpindle: true,
    blockProcessingRate: 8000,
    yearRange: { from: 2015, to: 2023 },
  },
  "OSP-P500": {
    controllerModel: "OSP-P500",
    machineType: "mill",
    hasNAVI: true,
    hasIGFF: true,
    maxProgramSize: 32 * 1024 * 1024, // 32MB
    nurbsSupport: "super",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G85", "G87", "G8.1", "G8.3"],
    maxMacroVariable: 999,
    maxCommonVariable: 999,
    hasParametricProgramming: true,
    lookAheadBlocks: 1000,
    maxSimultaneousAxes: 9,
    hasCAxis: true,
    hasLiveTooling: true,
    hasSubSpindle: true,
    blockProcessingRate: 10000,
    yearRange: { from: 2020, to: 2030 },
  },
  "OSP-P500L": {
    controllerModel: "OSP-P500L",
    machineType: "lathe",
    hasNAVI: true,
    hasIGFF: true,
    maxProgramSize: 32 * 1024 * 1024,
    nurbsSupport: "super",
    specialCycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G85", "G87", "G8.1", "G8.3"],
    maxMacroVariable: 999,
    maxCommonVariable: 999,
    hasParametricProgramming: true,
    lookAheadBlocks: 1000,
    maxSimultaneousAxes: 5,
    hasCAxis: true,
    hasLiveTooling: true,
    hasSubSpindle: true,
    blockProcessingRate: 10000,
    yearRange: { from: 2020, to: 2030 },
  },
};

// ============================================================================
// CANNED CYCLE TRANSLATION MAPS
// ============================================================================

/**
 * OSP-P100 canned cycle syntax differences.
 * P100 uses slightly different parameter formats than P300/P500.
 */
const P100_CYCLE_SYNTAX: Record<string, { p100: string; modern: string; notes: string }> = {
  // Threading cycles
  "G71_THREADING": {
    p100: "G71 X__ Z__ B__ H__ D__ F__",
    modern: "G71 X__ Z__ B__ H__ D__ F__ E__",
    notes: "P100 lacks E parameter for thread relief",
  },
  // Profile roughing
  "G85_ROUGHING": {
    p100: "G85 N__ D__ U__ W__ F__",
    modern: "G85 N__ D__ U__ W__ F__ R__",
    notes: "P100 lacks R retract parameter",
  },
  // Profile finishing
  "G87_FINISHING": {
    p100: "G87 N__",
    modern: "G87 N__ F__",
    notes: "P100 uses last modal feed rate",
  },
  // Pattern repeating (ID roughing)
  "G73_PATTERN": {
    p100: "G73 U__ W__ R__ P__ Q__ D__",
    modern: "G73 U__ W__ R__ P__ Q__ D__ F__",
    notes: "P100 uses modal feed rate",
  },
  // Peck drilling
  "G74_PECK": {
    p100: "G74 X__ Z__ D__ L__ F__",
    modern: "G74 X__ Z__ D__ L__ F__ K__",
    notes: "P100 lacks K pause parameter",
  },
  // Grooving
  "G75_GROOVE": {
    p100: "G75 X__ Z__ D__ L__ F__",
    modern: "G75 X__ Z__ D__ L__ F__ R__",
    notes: "P100 lacks R approach",
  },
};

/**
 * Modern-only G-codes that are not available on P100.
 * These require translation or warnings.
 */
const MODERN_ONLY_GCODES: Set<string> = new Set([
  "G8.1",   // NURBS interpolation on
  "G8.3",   // NURBS with knot vector
  "NAVI",   // NAVI collision avoidance
  "G270",   // Graphics lock (some P100 versions)
  "G180",   // Graphics cancel (some P100 versions)
  "IGFF",   // Intelligent Geometric Feed Forward
]);

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class OkumaLegacyControllerEngineImpl {
  // ── Profile Access ─────────────────────────────────────────────────────

  /**
   * Get the profile for a specific controller model.
   */
  getProfile(model: OkumaControllerModel): OkumaLegacyProfile {
    return { ...CONTROLLER_PROFILES[model] };
  }

  /**
   * Get all available controller profiles.
   */
  getAllProfiles(): OkumaLegacyProfile[] {
    return Object.values(CONTROLLER_PROFILES).map(p => ({ ...p }));
  }

  /**
   * Check if a controller model is considered "legacy" (pre-P300).
   */
  isLegacy(model: OkumaControllerModel): boolean {
    return model === "OSP-P100" || model.startsWith("OSP-P200");
  }

  // ── Controller Detection ───────────────────────────────────────────────

  /**
   * Analyze a program to detect which controller it was likely written for.
   * Uses feature detection to identify P100 vs modern controllers.
   */
  detectController(programLines: string[]): LegacyProgramAnalysis {
    const markers: string[] = [];
    const features: LegacyFeatureUsage = {
      usesG71Threading: false,
      usesG72Finishing: false,
      usesG73PatternRepeat: false,
      usesG74PeckDrill: false,
      usesG75Grooving: false,
      usesG76Threading: false,
      usesG85Roughing: false,
      usesG87Finishing: false,
      usesNURBS: false,
      usesNAVI: false,
      usesIGFF: false,
      usesMacroVariables: false,
      maxVariableUsed: 0,
      usesCAxis: false,
      usesLiveTooling: false,
      usesBarFeeder: false,
      cannedCyclesUsed: [],
    };

    let hasModernFeatures = false;
    let hasLegacyIndicators = false;

    for (const line of programLines) {
      const upper = line.trim().toUpperCase();

      // Skip comments
      if (upper.startsWith("(") || !upper) continue;

      // Detect NURBS (modern only)
      if (/G8\.[13]/i.test(upper)) {
        features.usesNURBS = true;
        hasModernFeatures = true;
        markers.push("NURBS interpolation (G8.1/G8.3) - P300/P500 only");
      }

      // Detect NAVI (modern only)
      if (/NAVI|COLLISION\s*CHECK/i.test(upper)) {
        features.usesNAVI = true;
        hasModernFeatures = true;
        markers.push("NAVI collision avoidance - P300/P500 only");
      }

      // Detect IGFF (modern only)
      if (/IGFF/i.test(upper)) {
        features.usesIGFF = true;
        hasModernFeatures = true;
        markers.push("IGFF feed forward - P300/P500 only");
      }

      // Canned cycles
      if (/G71.*B\d+/i.test(upper)) {
        features.usesG71Threading = true;
        if (!features.cannedCyclesUsed.includes("G71")) {
          features.cannedCyclesUsed.push("G71");
        }
      }
      if (/G72/i.test(upper)) {
        features.usesG72Finishing = true;
        if (!features.cannedCyclesUsed.includes("G72")) {
          features.cannedCyclesUsed.push("G72");
        }
      }
      if (/G73.*U.*W/i.test(upper)) {
        features.usesG73PatternRepeat = true;
        if (!features.cannedCyclesUsed.includes("G73")) {
          features.cannedCyclesUsed.push("G73");
        }
      }
      if (/G74/i.test(upper)) {
        features.usesG74PeckDrill = true;
        if (!features.cannedCyclesUsed.includes("G74")) {
          features.cannedCyclesUsed.push("G74");
        }
      }
      if (/G75/i.test(upper)) {
        features.usesG75Grooving = true;
        if (!features.cannedCyclesUsed.includes("G75")) {
          features.cannedCyclesUsed.push("G75");
        }
      }
      if (/G76.*K/i.test(upper)) {
        features.usesG76Threading = true;
        if (!features.cannedCyclesUsed.includes("G76")) {
          features.cannedCyclesUsed.push("G76");
        }
      }
      if (/G85\s+N/i.test(upper)) {
        features.usesG85Roughing = true;
        if (!features.cannedCyclesUsed.includes("G85")) {
          features.cannedCyclesUsed.push("G85");
        }
      }
      if (/G87\s+N/i.test(upper)) {
        features.usesG87Finishing = true;
        if (!features.cannedCyclesUsed.includes("G87")) {
          features.cannedCyclesUsed.push("G87");
        }
      }

      // Macro variables
      const varMatch = upper.match(/V[C]?(\d+)/g);
      if (varMatch) {
        features.usesMacroVariables = true;
        for (const v of varMatch) {
          const num = parseInt(v.replace(/V[C]?/, ""));
          if (num > features.maxVariableUsed) {
            features.maxVariableUsed = num;
          }
          // High variable numbers suggest modern controller
          if (num > 500) {
            hasModernFeatures = true;
            markers.push(`High variable number ${v} - suggests P300+`);
          }
        }
      }

      // C-axis detection
      if (/M110|G138|G119|C[\d.]+/i.test(upper)) {
        features.usesCAxis = true;
      }

      // Live tooling detection
      if (/SB=|G119/i.test(upper)) {
        features.usesLiveTooling = true;
      }

      // Bar feeder
      if (/\/CALL\s+OBAR|\/GOTO\s+NBAR/i.test(upper)) {
        features.usesBarFeeder = true;
      }

      // Legacy indicators
      if (/DEF\s+WORK/i.test(upper)) {
        hasLegacyIndicators = true;
        markers.push("DEF WORK graphics block - common in P100/P200");
      }

      // Memory-constrained parameter patterns
      if (/PS\s+LC,\[-?\d+,\d+\],\[-?\d+,\d+\]/i.test(upper)) {
        hasLegacyIndicators = true;
        markers.push("PS LC graphics parameter - P100/P200 style");
      }
    }

    // Estimate memory usage
    const memoryEstimate = programLines.join("\n").length;

    // Determine most likely controller
    let detectedController: OkumaControllerModel;
    let confidence: number;

    if (hasModernFeatures && features.usesNURBS) {
      detectedController = "OSP-P300L";
      confidence = 0.9;
    } else if (hasModernFeatures) {
      detectedController = "OSP-P300L";
      confidence = 0.75;
    } else if (hasLegacyIndicators && features.maxVariableUsed <= 100) {
      detectedController = "OSP-P100";
      confidence = 0.85;
    } else if (hasLegacyIndicators) {
      detectedController = "OSP-P200L";
      confidence = 0.7;
    } else if (features.maxVariableUsed > 500) {
      detectedController = "OSP-P300L";
      confidence = 0.65;
    } else if (features.usesCAxis || features.usesLiveTooling) {
      detectedController = "OSP-P200L";
      confidence = 0.6;
    } else {
      // Default to P100 for simple programs
      detectedController = "OSP-P100";
      confidence = 0.5;
    }

    // Build recommendations
    const recommendations: string[] = [];

    if (features.maxVariableUsed > 100 && this.isLegacy(detectedController)) {
      recommendations.push(
        `Program uses V${features.maxVariableUsed} but P100 only supports V1-V100. ` +
        `Renumber variables or upgrade controller.`
      );
    }

    if (features.usesNURBS && this.isLegacy(detectedController)) {
      recommendations.push(
        "Program uses NURBS (G8.1/G8.3) which is not supported on P100/P200. " +
        "Use linear approximation or upgrade controller."
      );
    }

    if (memoryEstimate > 256 * 1024 && detectedController === "OSP-P100") {
      recommendations.push(
        `Program is ${Math.round(memoryEstimate / 1024)}KB which may exceed P100 memory. ` +
        "Consider splitting into subprograms or using DNC."
      );
    }

    log.info(`[OkumaLegacyController] Detected ${detectedController} with ${confidence * 100}% confidence`);

    return {
      detectedController,
      confidence,
      markers,
      features,
      memoryEstimate,
      recommendations,
    };
  }

  // ── G-code Translation ─────────────────────────────────────────────────

  /**
   * Translate a G-code from modern (P300/P500) format to P100 format.
   * Returns the translated code with any necessary modifications.
   */
  translateToP100(gcode: string, context?: { programLines?: string[] }): GCodeTranslation {
    const upper = gcode.trim().toUpperCase();
    const warnings: string[] = [];
    const notes: string[] = [];
    let translatedCode = gcode;
    let compatible = true;
    let requiresLinearApproximation = false;
    let approximationPoints: number | undefined;

    // NURBS interpolation - requires linear approximation
    if (/G8\.[13]/i.test(upper)) {
      compatible = false;
      requiresLinearApproximation = true;
      approximationPoints = 50; // Default approximation points
      translatedCode = `( NURBS NOT SUPPORTED - USE LINEAR APPROXIMATION )`;
      warnings.push("NURBS interpolation (G8.1/G8.3) not available on P100");
      notes.push("Convert NURBS to linear segments using chord tolerance 0.0005\"");
    }

    // NAVI functions
    if (/NAVI/i.test(upper)) {
      compatible = false;
      translatedCode = `( NAVI NOT SUPPORTED ON P100 )`;
      warnings.push("NAVI collision avoidance not available on P100");
      notes.push("Manual collision verification required");
    }

    // IGFF
    if (/IGFF/i.test(upper)) {
      compatible = false;
      translatedCode = `( IGFF NOT SUPPORTED ON P100 )`;
      warnings.push("IGFF feed forward not available on P100");
      notes.push("May need to reduce feed rates for acceptable surface finish");
    }

    // High variable numbers
    const varMatch = upper.match(/V[C]?(\d+)/);
    if (varMatch) {
      const varNum = parseInt(varMatch[1]);
      if (upper.startsWith("VC") && varNum > 200) {
        compatible = false;
        warnings.push(`VC${varNum} exceeds P100 limit of VC200`);
        notes.push("Renumber common variables to VC100-VC200 range");
      } else if (!upper.startsWith("VC") && varNum > 100) {
        compatible = false;
        warnings.push(`V${varNum} exceeds P100 limit of V100`);
        notes.push("Renumber local variables to V1-V100 range");
      }
    }

    // G85 roughing cycle - remove unsupported R parameter
    if (/G85.*\sR[\d.]+/i.test(upper)) {
      translatedCode = gcode.replace(/\s+R[\d.]+/i, "");
      notes.push("Removed R retract parameter (not supported on P100)");
    }

    // G74 peck drilling - remove unsupported K parameter
    if (/G74.*\sK[\d.]+/i.test(upper)) {
      translatedCode = gcode.replace(/\s+K[\d.]+/i, "");
      notes.push("Removed K pause parameter (not supported on P100)");
    }

    // G71 threading - remove E parameter
    if (/G71.*\sE[\d.]+/i.test(upper)) {
      translatedCode = gcode.replace(/\s+E[\d.]+/i, "");
      notes.push("Removed E thread relief parameter (not supported on P100)");
    }

    return {
      originalCode: gcode,
      translatedCode,
      compatible,
      warnings,
      notes,
      requiresLinearApproximation,
      approximationPoints,
    };
  }

  /**
   * Translate an entire program from modern format to P100 format.
   */
  translateProgramToP100(lines: string[]): {
    translatedLines: string[];
    translations: GCodeTranslation[];
    summary: { compatible: number; warnings: number; errors: number };
  } {
    const translatedLines: string[] = [];
    const translations: GCodeTranslation[] = [];
    let compatible = 0;
    let warnings = 0;
    let errors = 0;

    for (const line of lines) {
      const translation = this.translateToP100(line);
      translatedLines.push(translation.translatedCode);

      if (translation.warnings.length > 0 || translation.notes.length > 0) {
        translations.push(translation);
      }

      if (translation.compatible) {
        compatible++;
      } else if (translation.warnings.length > 0) {
        errors++;
      } else if (translation.notes.length > 0) {
        warnings++;
      } else {
        compatible++;
      }
    }

    return {
      translatedLines,
      translations,
      summary: { compatible, warnings, errors },
    };
  }

  // ── Compatibility Analysis ─────────────────────────────────────────────

  /**
   * Analyze compatibility between two controller versions.
   */
  analyzeCompatibility(
    programLines: string[],
    sourceController: OkumaControllerModel,
    targetController: OkumaControllerModel
  ): CompatibilityAnalysis {
    const sourceProfile = this.getProfile(sourceController);
    const targetProfile = this.getProfile(targetController);
    const criticalIssues: CompatibilityIssue[] = [];
    const warnings: CompatibilityIssue[] = [];
    const suggestions: string[] = [];
    const requiredTranslations: GCodeTranslation[] = [];

    // Check NURBS compatibility
    if (sourceProfile.nurbsSupport !== "none" && targetProfile.nurbsSupport === "none") {
      // Find NURBS usage
      for (let i = 0; i < programLines.length; i++) {
        if (/G8\.[13]/i.test(programLines[i])) {
          criticalIssues.push({
            severity: "critical",
            code: "NURBS_NOT_SUPPORTED",
            line: i + 1,
            message: "NURBS interpolation used but target controller does not support it",
            recommendation: "Convert to linear segments with chord tolerance 0.0005\"",
          });
          const translation = this.translateToP100(programLines[i]);
          requiredTranslations.push(translation);
        }
      }
    }

    // Check NAVI compatibility
    if (sourceProfile.hasNAVI && !targetProfile.hasNAVI) {
      for (let i = 0; i < programLines.length; i++) {
        if (/NAVI/i.test(programLines[i])) {
          criticalIssues.push({
            severity: "critical",
            code: "NAVI_NOT_SUPPORTED",
            line: i + 1,
            message: "NAVI collision avoidance used but target controller does not support it",
            recommendation: "Remove NAVI calls and verify collision manually",
          });
        }
      }
    }

    // Check IGFF compatibility
    if (sourceProfile.hasIGFF && !targetProfile.hasIGFF) {
      for (let i = 0; i < programLines.length; i++) {
        if (/IGFF/i.test(programLines[i])) {
          warnings.push({
            severity: "warning",
            code: "IGFF_NOT_SUPPORTED",
            line: i + 1,
            message: "IGFF feed forward used but target controller does not support it",
            recommendation: "Remove IGFF calls; may need to reduce feed rates",
          });
        }
      }
    }

    // Check variable range
    const detection = this.detectController(programLines);
    if (detection.features.maxVariableUsed > targetProfile.maxMacroVariable) {
      criticalIssues.push({
        severity: "critical",
        code: "VARIABLE_RANGE_EXCEEDED",
        message: `Program uses V${detection.features.maxVariableUsed} but target supports max V${targetProfile.maxMacroVariable}`,
        recommendation: "Renumber variables to fit target range",
      });
    }

    // Check memory constraints
    const programSize = programLines.join("\n").length;
    if (programSize > targetProfile.maxProgramSize) {
      criticalIssues.push({
        severity: "critical",
        code: "MEMORY_EXCEEDED",
        message: `Program is ${Math.round(programSize / 1024)}KB but target supports max ${Math.round(targetProfile.maxProgramSize / 1024)}KB`,
        recommendation: "Split into subprograms or use DNC",
      });
    }

    // Check C-axis compatibility
    if (detection.features.usesCAxis && !targetProfile.hasCAxis) {
      criticalIssues.push({
        severity: "critical",
        code: "CAXIS_NOT_SUPPORTED",
        message: "Program uses C-axis but target machine does not have C-axis",
        recommendation: "Remove C-axis operations or select different machine",
      });
    }

    // Check live tooling compatibility
    if (detection.features.usesLiveTooling && !targetProfile.hasLiveTooling) {
      criticalIssues.push({
        severity: "critical",
        code: "LIVE_TOOLING_NOT_SUPPORTED",
        message: "Program uses live tooling but target machine does not have it",
        recommendation: "Remove live tooling operations or select different machine",
      });
    }

    // Estimate effort
    let estimatedEffort: CompatibilityAnalysis["estimatedEffort"];
    if (criticalIssues.length === 0 && warnings.length === 0) {
      estimatedEffort = "trivial";
    } else if (criticalIssues.length === 0) {
      estimatedEffort = "low";
    } else if (criticalIssues.length <= 2) {
      estimatedEffort = "medium";
    } else if (criticalIssues.length <= 5) {
      estimatedEffort = "high";
    } else {
      estimatedEffort = "rewrite_required";
    }

    // Build suggestions
    if (this.isLegacy(targetController) && !this.isLegacy(sourceController)) {
      suggestions.push("Consider keeping program on modern controller if possible");
      suggestions.push("Verify all canned cycles are compatible with target syntax");
    }

    if (targetProfile.maxProgramSize < sourceProfile.maxProgramSize) {
      suggestions.push("Split long programs into subprograms called with /CALL");
    }

    return {
      sourceController,
      targetController,
      compatible: criticalIssues.length === 0,
      criticalIssues,
      warnings,
      suggestions,
      requiredTranslations,
      estimatedEffort,
    };
  }

  // ── NURBS to Linear Approximation ──────────────────────────────────────

  /**
   * Convert NURBS curve segments to linear approximation.
   * This is needed when translating modern programs to P100.
   *
   * @param nurbsBlock The NURBS G-code block (G8.1 ...)
   * @param chordTolerance Maximum deviation from true curve (inches)
   * @param maxSegments Maximum number of linear segments
   * @returns Array of G1 linear moves approximating the NURBS
   */
  nurbsToLinear(
    nurbsBlock: string,
    chordTolerance: number = 0.0005,
    maxSegments: number = 100
  ): string[] {
    // This is a placeholder - actual NURBS to linear conversion
    // would require parsing the NURBS control points and weights,
    // then evaluating the curve at intervals determined by chord tolerance.
    //
    // For now, emit a warning comment and placeholder moves.

    const result: string[] = [];
    result.push(`( NURBS BLOCK CONVERTED TO LINEAR APPROXIMATION )`);
    result.push(`( Original: ${nurbsBlock.trim()} )`);
    result.push(`( Chord tolerance: ${chordTolerance}" )`);
    result.push(`( NOTE: Actual conversion requires NURBS evaluation library )`);
    result.push(`( Replace this section with CAM-generated linear moves )`);

    log.warn(`[OkumaLegacyController] NURBS to linear conversion is placeholder only`);

    return result;
  }

  // ── Memory Estimation ──────────────────────────────────────────────────

  /**
   * Estimate program memory usage for a given controller.
   */
  estimateMemoryUsage(
    programLines: string[],
    controller: OkumaControllerModel
  ): {
    programBytes: number;
    controllerCapacity: number;
    utilizationPercent: number;
    canFit: boolean;
    recommendations: string[];
  } {
    const profile = this.getProfile(controller);
    const programBytes = programLines.join("\n").length;
    const utilizationPercent = (programBytes / profile.maxProgramSize) * 100;
    const canFit = programBytes <= profile.maxProgramSize;

    const recommendations: string[] = [];
    if (!canFit) {
      recommendations.push(
        `Program exceeds memory by ${Math.round((programBytes - profile.maxProgramSize) / 1024)}KB`
      );
      recommendations.push("Split program into subprograms using /CALL");
      recommendations.push("Consider using DNC (drip feed) mode");
      recommendations.push("Remove unnecessary comments and blank lines");
    } else if (utilizationPercent > 80) {
      recommendations.push(
        `Program uses ${Math.round(utilizationPercent)}% of memory - leave headroom`
      );
    }

    return {
      programBytes,
      controllerCapacity: profile.maxProgramSize,
      utilizationPercent,
      canFit,
      recommendations,
    };
  }

  // ── Canned Cycle Syntax ────────────────────────────────────────────────

  /**
   * Get the correct canned cycle syntax for a given controller.
   */
  getCycleSyntax(
    cycleType: keyof typeof P100_CYCLE_SYNTAX,
    controller: OkumaControllerModel
  ): { syntax: string; notes: string } {
    const cycle = P100_CYCLE_SYNTAX[cycleType];
    if (!cycle) {
      return { syntax: "UNKNOWN", notes: "Cycle type not recognized" };
    }

    if (this.isLegacy(controller)) {
      return { syntax: cycle.p100, notes: cycle.notes };
    } else {
      return { syntax: cycle.modern, notes: "" };
    }
  }

  /**
   * Get all supported canned cycles for a controller.
   */
  getSupportedCycles(controller: OkumaControllerModel): string[] {
    const profile = this.getProfile(controller);
    return [...profile.specialCycles];
  }

  // ── Feature Queries ────────────────────────────────────────────────────

  /**
   * Check if a specific feature is supported on a controller.
   */
  supportsFeature(
    controller: OkumaControllerModel,
    feature: "nurbs" | "navi" | "igff" | "caxis" | "live_tooling" | "sub_spindle"
  ): boolean {
    const profile = this.getProfile(controller);
    switch (feature) {
      case "nurbs":
        return profile.nurbsSupport !== "none";
      case "navi":
        return profile.hasNAVI;
      case "igff":
        return profile.hasIGFF;
      case "caxis":
        return profile.hasCAxis;
      case "live_tooling":
        return profile.hasLiveTooling;
      case "sub_spindle":
        return profile.hasSubSpindle;
      default:
        return false;
    }
  }

  /**
   * Get a summary of controller capabilities for display.
   */
  getCapabilitySummary(controller: OkumaControllerModel): {
    model: string;
    generation: string;
    capabilities: string[];
    limitations: string[];
  } {
    const profile = this.getProfile(controller);
    const capabilities: string[] = [];
    const limitations: string[] = [];

    // Generation
    let generation: string;
    if (controller === "OSP-P100") {
      generation = "Legacy (1990-2005)";
    } else if (controller.startsWith("OSP-P200")) {
      generation = "Transitional (2000-2012)";
    } else if (controller.startsWith("OSP-P300")) {
      generation = "Modern (2010-2023)";
    } else {
      generation = "Current (2020+)";
    }

    // Capabilities
    if (profile.hasNAVI) capabilities.push("NAVI collision avoidance");
    if (profile.hasIGFF) capabilities.push("IGFF feed forward");
    if (profile.nurbsSupport !== "none") {
      capabilities.push(`NURBS interpolation (${profile.nurbsSupport})`);
    }
    if (profile.hasCAxis) capabilities.push("C-axis positioning");
    if (profile.hasLiveTooling) capabilities.push("Live tooling");
    if (profile.hasSubSpindle) capabilities.push("Sub-spindle");
    capabilities.push(`Up to ${profile.maxSimultaneousAxes} simultaneous axes`);
    capabilities.push(`${Math.round(profile.maxProgramSize / 1024)}KB program memory`);
    capabilities.push(`V1-V${profile.maxMacroVariable} macro variables`);

    // Limitations
    if (!profile.hasNAVI) limitations.push("No NAVI collision avoidance");
    if (!profile.hasIGFF) limitations.push("No IGFF feed forward");
    if (profile.nurbsSupport === "none") limitations.push("No NURBS interpolation");
    if (!profile.hasCAxis) limitations.push("No C-axis");
    if (!profile.hasLiveTooling) limitations.push("No live tooling");
    if (profile.lookAheadBlocks < 100) {
      limitations.push(`Limited look-ahead (${profile.lookAheadBlocks} blocks)`);
    }

    return {
      model: controller,
      generation,
      capabilities,
      limitations,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const okumaLegacyControllerEngine = new OkumaLegacyControllerEngineImpl();
