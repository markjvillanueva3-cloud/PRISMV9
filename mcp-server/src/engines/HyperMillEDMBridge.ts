/**
 * HyperMillEDMBridge — EDM workflow routing for hyperMILL electrode designs
 *
 * Routes hyperMILL electrode designs (from HyperMillMoldCycleEngine /
 * electrode extraction plans) to PRISM's process-specific EDM post engines:
 *   - Wire EDM   → PPWireEDMPostEngine.generate
 *   - Sinker EDM → PPSinkerEDMPostEngine.generate
 *   - Micro EDM  → MicroEDMEngine.calculate
 *
 * EDM type auto-selection logic:
 *   - Wire EDM   → open contour profiles, through cuts, 2D/4-axis profiles
 *   - Sinker EDM → closed cavities, blind pockets, mold impressions, ribs
 *   - Micro EDM  → features < 1mm, micro-holes, fine details
 *
 * Overcut allowance transfer:
 *   Electrode undersize from mold design (rough = 0.3mm, finish = 0.1mm)
 *   is transferred to the sinker stage `over_burn_mm` via the orbit_radius_mm
 *   on each rough/finish operation.
 *
 * Sources:
 *   - McGeough, J.A. (1988) "Advanced Methods of Machining"
 *   - König & Klocke (1997) "Fertigungsverfahren 3: Abtragen, Generieren"
 *   - Jeong & Min (2007) Int. J. Mach. Tools Manuf. — micro-EDM
 *   - GF Machining Solutions Sinker EDM Application Guide
 *
 * HM-REV-MS6 / U-HMR34 (rebuild 2026-05-04)
 */

import {
  PPWireEDMPostEngine,
  type WireEDMProgramInput,
  type WireEDMProgram,
  type WireEDMOperation,
} from "./PPWireEDMPostEngine.js";
import {
  PPSinkerEDMPostEngine,
  type SinkerProgramInput,
  type SinkerProgram,
  type SinkerOperation,
  type SinkerBurnStage,
} from "./PPSinkerEDMPostEngine.js";
import {
  MicroEDMEngine,
  type MicroEDMInput,
  type MicroEDMResult,
  type MicroEDMProcess,
} from "./MicroEDMEngine.js";

// Re-export downstream types so consumers can import them via this bridge.
export type {
  WireEDMProgram,
  WireEDMProgramInput,
  WireEDMOperation,
  SinkerProgram,
  SinkerProgramInput,
  SinkerOperation,
  SinkerBurnStage,
  MicroEDMInput,
  MicroEDMResult,
  MicroEDMProcess,
};

// ============================================================================
// Types
// ============================================================================

export type EDMRouteType = "wire" | "sinker" | "micro";

export interface EDMFeatureGeometry {
  /** Feature type */
  type: "contour" | "cavity" | "through_pocket" | "micro_hole" | "rib" | "slot";
  /** Descriptive name */
  name: string;
  /** Cavity depth [mm] — for sinker */
  depth_mm: number;
  /** Projected area [mm²] — for sinker */
  area_mm2?: number;
  /** Volume to remove [mm³] — for sinker */
  volume_mm3?: number;
  /** Feature size (width or diameter) [mm] */
  size_mm: number;
  /** Part thickness [mm] — for wire EDM */
  thickness_mm?: number;
  /** 2D contour for wire EDM — simplified as rectangular approximation */
  contourPerimeter_mm?: number;
  /** Target Ra [µm] */
  targetRa_um?: number;
  /** X position [mm] */
  x_mm?: number;
  /** Y position [mm] */
  y_mm?: number;
}

export interface EDMRouteInput {
  /** Part name */
  partName: string;
  /** Workpiece material (matching EDM material DB key) */
  material: string;
  /** Features to be EDMed */
  features: EDMFeatureGeometry[];
  /** Electrode material from mold design */
  electrodeMaterial?: "copper" | "graphite" | "tungsten_copper";
  /** Rough overcut allowance [mm] — from electrode extraction plan */
  roughOvercut_mm?: number;
  /** Finish overcut allowance [mm] — from electrode extraction plan */
  finishOvercut_mm?: number;
  /** Number of skim passes for wire EDM */
  numSkimPasses?: number;
  /** Target surface finish [µm Ra] */
  targetRa_um?: number;
  /** Output units (forwarded to post engines) */
  units?: "metric" | "imperial";
  /** Program number */
  programNumber?: number;
}

export interface EDMRouteResult {
  /** EDM type selected */
  edmType: EDMRouteType;
  /** Selection rationale */
  selectionRationale: string;
  /** Wire EDM program (if wire) */
  wireProgram?: WireEDMProgram;
  /** Sinker EDM program (if sinker) */
  sinkerProgram?: SinkerProgram;
  /** Micro EDM result (if micro) */
  microResult?: MicroEDMResult;
  /** Electrode undersize values transferred from mold design */
  electrodeUndersize: { roughing_mm: number; finishing_mm: number };
  /** Estimated spark gap [mm per side] */
  estimatedSparkGap_mm: number;
  /** Warnings */
  warnings: string[];
  /** Confidence 0–1 */
  confidence: number;
  /** Source */
  source: string;
}

// ============================================================================
// EDM type selection thresholds
// ============================================================================

/** Feature size [mm] below which micro-EDM is selected */
const MICRO_EDM_SIZE_THRESHOLD_MM = 1.0;

/** Sinker types: closed/blind features that can't be wire-cut */
const SINKER_FEATURE_TYPES = new Set(["cavity", "rib", "micro_hole"]);

/** Wire types: open contour profiles and through cuts */
const WIRE_FEATURE_TYPES = new Set(["contour", "through_pocket", "slot"]);

// ============================================================================
// Overcut allowance defaults
// Source: GF Machining Solutions sinker EDM application guide
// ============================================================================
const DEFAULT_ROUGH_OVERCUT_MM  = 0.30; // Rough sinker — 0.3mm per side
const DEFAULT_FINISH_OVERCUT_MM = 0.10; // Finish sinker — 0.1mm per side

// Default wire diameter (mm) — Mitsubishi MV1200R standard brass
const DEFAULT_WIRE_DIAMETER_MM = 0.25;

// ============================================================================
// Engine
// ============================================================================

export class HyperMillEDMBridge {
  private readonly wireEngine = new PPWireEDMPostEngine();
  private readonly sinkerEngine = new PPSinkerEDMPostEngine();
  private readonly microEngine = new MicroEDMEngine();

  /**
   * Route hyperMILL electrode designs to the appropriate EDM process.
   * Transfers overcut allowance from mold design to electrode undersize.
   *
   * @param input - Part name, features, electrode material, overcut
   * @returns EDM type selection, assembled program, spark gap data
   */
  calculate(input: EDMRouteInput): EDMRouteResult {
    const warnings: string[] = [];

    if (!input.features || input.features.length === 0) {
      throw new Error("HyperMillEDMBridge.calculate: features array must contain at least one feature");
    }

    // ── 1. Select EDM type ────────────────────────────────────────────────────
    const { edmType, rationale } = this._selectEDMType(input.features);

    // ── 2. Overcut / undersize transfer from mold design ─────────────────────
    const roughOvercut = input.roughOvercut_mm ?? DEFAULT_ROUGH_OVERCUT_MM;
    const finishOvercut = input.finishOvercut_mm ?? DEFAULT_FINISH_OVERCUT_MM;
    const electrodeUndersize = {
      roughing_mm: roughOvercut,
      finishing_mm: finishOvercut,
    };

    // Estimated spark gap — finish undersize directly correlates to spark gap
    const estimatedSparkGap_mm = finishOvercut;

    // ── 3. Assemble EDM program ───────────────────────────────────────────────
    let wireProgram: WireEDMProgram | undefined;
    let sinkerProgram: SinkerProgram | undefined;
    let microResult: MicroEDMResult | undefined;

    if (edmType === "wire") {
      wireProgram = this._assembleWire(input);
    } else if (edmType === "micro") {
      microResult = this._assembleMicro(input, warnings);
    } else {
      sinkerProgram = this._assembleSinker(input, electrodeUndersize);
    }

    // ── 4. Validate electrode material compatibility ──────────────────────────
    const electrodeMat = input.electrodeMaterial ?? "copper";
    if (edmType === "wire" && electrodeMat !== "copper") {
      warnings.push("Wire EDM always uses brass/molybdenum wire, not copper/graphite electrodes");
    }

    const confidence = 0.87;

    return {
      edmType,
      selectionRationale: rationale,
      wireProgram,
      sinkerProgram,
      microResult,
      electrodeUndersize,
      estimatedSparkGap_mm,
      warnings,
      confidence,
      source: "PPWireEDMPostEngine + PPSinkerEDMPostEngine + MicroEDMEngine + McGeough-1988 + GF-Machining-sinker-guide",
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _selectEDMType(
    features: EDMFeatureGeometry[],
  ): { edmType: EDMRouteType; rationale: string } {
    // Check for micro features
    const hasMicro = features.some(f => f.size_mm < MICRO_EDM_SIZE_THRESHOLD_MM);
    if (hasMicro) {
      return {
        edmType: "micro",
        rationale: `Micro-EDM selected: feature size < ${MICRO_EDM_SIZE_THRESHOLD_MM}mm`,
      };
    }

    // Check for sinker-only features
    const hasSinker = features.some(f => SINKER_FEATURE_TYPES.has(f.type));
    const hasWire = features.some(f => WIRE_FEATURE_TYPES.has(f.type));

    if (hasSinker && !hasWire) {
      return {
        edmType: "sinker",
        rationale: "Sinker EDM selected: closed cavities / blind pockets require immersed sinker process",
      };
    }
    if (hasWire && !hasSinker) {
      return {
        edmType: "wire",
        rationale: "Wire EDM selected: open contours / through cuts are wire-cuttable",
      };
    }
    if (hasSinker && hasWire) {
      // Mixed: prefer sinker (more general; wire can follow if split into separate programs)
      return {
        edmType: "sinker",
        rationale: "Mixed features: Sinker EDM selected for cavity features (wire features require separate wire program)",
      };
    }

    // Default: sinker for mold work
    return {
      edmType: "sinker",
      rationale: "Default: Sinker EDM selected for unclassified mold features",
    };
  }

  /**
   * Build a wire EDM program from input features.
   * Each wire-cuttable feature becomes a 4-pass operation set
   * (rough + skim1 + skim2 + skim3, capped by input.numSkimPasses).
   */
  private _assembleWire(input: EDMRouteInput): WireEDMProgram {
    const wireFeatures = input.features.filter(f => WIRE_FEATURE_TYPES.has(f.type));
    const sourceFeatures = wireFeatures.length > 0 ? wireFeatures : [input.features[0]];

    const numSkim = Math.max(0, Math.min(3, input.numSkimPasses ?? 2));
    const passList: WireEDMOperation["pass"][] = ["rough"];
    if (numSkim >= 1) passList.push("skim1");
    if (numSkim >= 2) passList.push("skim2");
    if (numSkim >= 3) passList.push("skim3");

    const operations: WireEDMOperation[] = [];
    for (const feature of sourceFeatures) {
      const perimeter = feature.contourPerimeter_mm ?? feature.size_mm * 4;
      const halfSide = perimeter / 8; // approximate rectangular half-side

      const profilePoints = [
        { x: 0,        y: 0        },
        { x: halfSide, y: 0        },
        { x: halfSide, y: halfSide },
        { x: 0,        y: halfSide },
        { x: 0,        y: 0        },
      ];

      for (const pass of passList) {
        operations.push({
          type: "profile",
          pass,
          start_x: feature.x_mm ?? 0,
          start_y: feature.y_mm ?? 0,
          profile_points: profilePoints,
        });
      }
    }

    const firstFeature = sourceFeatures[0];
    const programInput: WireEDMProgramInput = {
      program_number: String(input.programNumber ?? 1).padStart(4, "0"),
      part_description: input.partName,
      material: input.material,
      thickness_mm: firstFeature.thickness_mm ?? firstFeature.depth_mm,
      wire_diameter_mm: DEFAULT_WIRE_DIAMETER_MM,
      operations,
      units: input.units ?? "metric",
    };

    return this.wireEngine.generate(programInput);
  }

  /**
   * Build a sinker EDM program from input features.
   * Each non-wire feature becomes a rough+finish stage pair, with the
   * orbit_radius_mm seeded from the electrode undersize transfer.
   */
  private _assembleSinker(
    input: EDMRouteInput,
    undersize: { roughing_mm: number; finishing_mm: number },
  ): SinkerProgram {
    const sinkerFeatures = input.features.filter(f => !WIRE_FEATURE_TYPES.has(f.type));
    const sourceFeatures = sinkerFeatures.length > 0 ? sinkerFeatures : [input.features[0]];

    const operations: SinkerOperation[] = [];
    sourceFeatures.forEach((feature, idx) => {
      const baseX = feature.x_mm ?? idx * 50;
      const baseY = feature.y_mm ?? 0;

      // Rough stage: undersize.roughing_mm becomes orbit radius (overburn)
      operations.push({
        stage: "rough",
        start_x: baseX,
        start_y: baseY,
        target_depth_mm: feature.depth_mm,
        electrode_number: idx + 1,
        electrode_name: `${input.electrodeMaterial ?? "copper"}_rough_${feature.name}`,
        over_burn_mm: undersize.roughing_mm,
        orbit_radius_mm: undersize.roughing_mm,
      });

      // Finish stage: undersize.finishing_mm becomes spark-gap-sized orbit
      operations.push({
        stage: "finish",
        start_x: baseX,
        start_y: baseY,
        target_depth_mm: feature.depth_mm,
        electrode_number: idx + 1,
        electrode_name: `${input.electrodeMaterial ?? "copper"}_finish_${feature.name}`,
        over_burn_mm: undersize.finishing_mm,
        orbit_radius_mm: undersize.finishing_mm,
      });
    });

    const cavityDepth = Math.max(...sourceFeatures.map(f => f.depth_mm));

    const programInput: SinkerProgramInput = {
      program_number: String(input.programNumber ?? 1).padStart(4, "0"),
      part_description: input.partName,
      material: input.material,
      cavity_depth_mm: cavityDepth,
      operations,
      units: input.units ?? "metric",
    };

    return this.sinkerEngine.generate(programInput);
  }

  /**
   * Compute micro-EDM parameters for the smallest feature set.
   * Features above the micro threshold are reported as warnings — the caller
   * must split the job into a separate sinker pass for those features.
   */
  private _assembleMicro(
    input: EDMRouteInput,
    warnings: string[],
  ): MicroEDMResult {
    const microFeatures = input.features.filter(f => f.size_mm < MICRO_EDM_SIZE_THRESHOLD_MM);
    const firstMicro = microFeatures[0] ?? input.features[0];

    if (microFeatures.length < input.features.length) {
      warnings.push(
        `${input.features.length - microFeatures.length} features > ${MICRO_EDM_SIZE_THRESHOLD_MM}mm excluded from micro-EDM — ` +
        `route to sinker EDM separately`,
      );
    }

    const process: MicroEDMProcess =
      firstMicro.type === "micro_hole" ? "micro_drill" : "micro_sinker";

    const microInput: MicroEDMInput = {
      process,
      feature_size_um: firstMicro.size_mm * 1000, // mm → µm
      depth_um: firstMicro.depth_mm * 1000,
      workpiece_material: input.material,
      target_accuracy_um: 2,
      target_surface_finish_Ra_um: input.targetRa_um ?? firstMicro.targetRa_um ?? 0.4,
    };

    return this.microEngine.calculate(microInput);
  }
}

export const hyperMillEDMBridge = new HyperMillEDMBridge();
