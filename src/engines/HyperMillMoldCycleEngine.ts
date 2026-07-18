/**
 * HyperMillMoldCycleEngine — Mold and die machining cycle selection
 *
 * Covers:
 *   - Cavity roughing: adaptive with multiple Z-levels
 *   - Core roughing: negative offset from parting line
 *   - Parting line detection + cavity/core split
 *   - Electrode extraction for EDM (copper/graphite electrode materials)
 *   - SPI surface finish mapping (A1–A3, B1–B3, C1–C3, D1–D3)
 *
 * SPI A-B-C-D finish scale (Society of Plastics Industry standard):
 *   A1 = 0.012μm Ra (mirror polish, diamond buff 3μm)
 *   A2 = 0.025μm Ra (high gloss, diamond buff 6μm)
 *   A3 = 0.050μm Ra (standard gloss, diamond paper 15μm)
 *   B1 = 0.10μm Ra (semi-gloss, 600 grit paper)
 *   B2 = 0.20μm Ra (semi-gloss, 400 grit paper)
 *   B3 = 0.40μm Ra (low gloss, 320 grit paper)
 *   C1 = 0.80μm Ra (matte, 600 grit stone)
 *   C2 = 1.60μm Ra (matte, 400 grit stone)
 *   C3 = 3.20μm Ra (rough matte, 320 grit stone)
 *   D1 = 0.80μm Ra (textured/spark eroded — EDM matte)
 *   D2 = 1.60μm Ra (textured — medium EDM)
 *   D3 = 3.20μm Ra (rough texture — heavy EDM)
 *
 * Source: SPI (Society of Plastics Industry) Mold Finish Standards B5-107-1995
 *
 * HM-REV-MS4 / U-HMR24
 */

// ============================================================================
// Types
// ============================================================================

export type SpiFinishGrade =
  | "A1" | "A2" | "A3"
  | "B1" | "B2" | "B3"
  | "C1" | "C2" | "C3"
  | "D1" | "D2" | "D3";

export type ElectrodeMaterial = "copper" | "graphite";

export type MoldFeatureType =
  | "cavity"
  | "core"
  | "parting_line"
  | "electrode"
  | "slide"
  | "lifter";

export interface MoldCycleInput {
  /** Primary feature type to machine */
  featureType: MoldFeatureType;
  /** Target SPI finish grade */
  spiGrade?: SpiFinishGrade;
  /** Part length [mm] */
  partLengthMm: number;
  /** Part width [mm] */
  partWidthMm: number;
  /** Part depth/height [mm] */
  partDepthMm: number;
  /** Tool diameter [mm] */
  toolDiameterMm: number;
  /** Parting line Z-height [mm] — required for core/cavity split */
  partingLineZ_mm?: number;
  /** Electrode material — required for electrode extraction */
  electrodeMaterial?: ElectrodeMaterial;
  /** Whether adaptive clearing is preferred for roughing */
  useAdaptiveClearing?: boolean;
  /** Allowance (stock left for finishing) [mm] */
  allowanceMm?: number;
}

export interface CavityRoughingPlan {
  /** Number of Z-levels */
  levelCount: number;
  /** Step-down per level [mm] */
  stepdownMm: number;
  /** Radial engagement (ae) [mm] */
  radialEngagementMm: number;
  /** Adaptive clearing mode */
  adaptive: boolean;
  /** hyperMILL cycle code */
  cycleCode: string;
}

export interface CoreRoughingPlan {
  /** Offset from parting line [mm] — negative = below parting */
  partingLineOffsetMm: number;
  /** Number of Z-levels */
  levelCount: number;
  /** Step-down per level [mm] */
  stepdownMm: number;
  /** hyperMILL cycle code */
  cycleCode: string;
}

export interface PartingLineSplit {
  /** Z-height of parting line [mm] */
  partingLineZ: number;
  /** Cavity region: above parting line */
  cavityRegion: { zMin: number; zMax: number };
  /** Core region: below parting line */
  coreRegion: { zMin: number; zMax: number };
}

export interface ElectrodeExtractionPlan {
  /** Electrode material */
  material: ElectrodeMaterial;
  /** Kienzle kc1.1 for electrode material [N/mm²] */
  kc1_1: number;
  /** EDM surface finish achievable with this electrode */
  edm_Ra_um: number;
  /** Recommended approach for electrode machining */
  approach: string;
  /** hyperMILL cycle code */
  cycleCode: string;
}

export interface SpiFinishRequirement {
  grade: SpiFinishGrade;
  /** Target Ra [μm] */
  target_Ra_um: number;
  /** Required machining process */
  process: string;
  /** Whether EDM is required */
  requiresEDM: boolean;
  /** Required polishing step */
  polishingRequired: string | null;
  /** Machining allowance to leave for polishing [mm] */
  polishingAllowanceMm: number;
}

export interface MoldCycleResult {
  /** Feature type processed */
  featureType: MoldFeatureType;
  /** Selected hyperMILL cycle name */
  cycleName: string;
  /** hyperMILL cycle code */
  cycleCode: string;
  /** Cavity roughing plan (if cavity feature) */
  cavityPlan?: CavityRoughingPlan;
  /** Core roughing plan (if core feature) */
  corePlan?: CoreRoughingPlan;
  /** Parting line split (if parting_line feature) */
  partingLineSplit?: PartingLineSplit;
  /** Electrode extraction plan (if electrode feature) */
  electrodePlan?: ElectrodeExtractionPlan;
  /** SPI finish requirements */
  spiRequirement?: SpiFinishRequirement;
  /** Warnings */
  warnings: string[];
  /** Confidence 0–1 */
  confidence: number;
  /** Source */
  source: string;
}

// ============================================================================
// SPI Finish Database
// ============================================================================

/**
 * SPI Finish grade lookup table.
 * Source: SPI (Society of Plastics Industry) Standard B5-107-1995,
 * Mold Finish Standards for Plastic Injection Molds.
 * Validated against: CustomPartNet SPI surface finish reference (2023).
 */
const SPI_FINISH_DB: Record<SpiFinishGrade, SpiFinishRequirement> = {
  A1: {
    grade: "A1", target_Ra_um: 0.012,
    process: "CNC finishing + diamond buff 3μm grit", requiresEDM: false,
    polishingRequired: "diamond_buff_3um", polishingAllowanceMm: 0.01,
  },
  A2: {
    grade: "A2", target_Ra_um: 0.025,
    process: "CNC finishing + diamond buff 6μm grit", requiresEDM: false,
    polishingRequired: "diamond_buff_6um", polishingAllowanceMm: 0.015,
  },
  A3: {
    grade: "A3", target_Ra_um: 0.050,
    process: "CNC finishing + diamond paper 15μm grit", requiresEDM: false,
    polishingRequired: "diamond_paper_15um", polishingAllowanceMm: 0.02,
  },
  B1: {
    grade: "B1", target_Ra_um: 0.10,
    process: "CNC finishing + 600 grit sandpaper", requiresEDM: false,
    polishingRequired: "paper_600_grit", polishingAllowanceMm: 0.03,
  },
  B2: {
    grade: "B2", target_Ra_um: 0.20,
    process: "CNC finishing + 400 grit sandpaper", requiresEDM: false,
    polishingRequired: "paper_400_grit", polishingAllowanceMm: 0.05,
  },
  B3: {
    grade: "B3", target_Ra_um: 0.40,
    process: "CNC finishing + 320 grit sandpaper", requiresEDM: false,
    polishingRequired: "paper_320_grit", polishingAllowanceMm: 0.05,
  },
  C1: {
    grade: "C1", target_Ra_um: 0.80,
    process: "CNC semi-finish + 600 grit stone", requiresEDM: false,
    polishingRequired: "stone_600_grit", polishingAllowanceMm: 0.10,
  },
  C2: {
    grade: "C2", target_Ra_um: 1.60,
    process: "CNC semi-finish + 400 grit stone", requiresEDM: false,
    polishingRequired: "stone_400_grit", polishingAllowanceMm: 0.15,
  },
  C3: {
    grade: "C3", target_Ra_um: 3.20,
    process: "CNC roughing + 320 grit stone", requiresEDM: false,
    polishingRequired: "stone_320_grit", polishingAllowanceMm: 0.20,
  },
  D1: {
    grade: "D1", target_Ra_um: 0.80,
    process: "EDM sinker — fine (matte texture)", requiresEDM: true,
    polishingRequired: null, polishingAllowanceMm: 0.0,
  },
  D2: {
    grade: "D2", target_Ra_um: 1.60,
    process: "EDM sinker — medium texture", requiresEDM: true,
    polishingRequired: null, polishingAllowanceMm: 0.0,
  },
  D3: {
    grade: "D3", target_Ra_um: 3.20,
    process: "EDM sinker — heavy/rough texture", requiresEDM: true,
    polishingRequired: null, polishingAllowanceMm: 0.0,
  },
};

// ============================================================================
// Electrode material physics
// ============================================================================

/**
 * Electrode material kc1.1 values.
 * Copper: ISO N group (similar to non-ferrous) — kc1.1 ≈ 700 N/mm²
 * Graphite: softer than metals — empirical kc1.1 ≈ 500 N/mm²
 * Source: Klocke "Manufacturing Processes 3" (EDM chapter), Kennametal electrode guide
 */
const ELECTRODE_KC11: Record<ElectrodeMaterial, number> = {
  copper: 700,    // ISO N group — ASM Handbook Vol. 2
  graphite: 500,  // empirical EDM electrode machining value
};

/**
 * EDM surface finish achievable per electrode type [μm Ra].
 * Source: EDM Technology Handbook, Charmilles Technologies
 */
const ELECTRODE_EDM_RA: Record<ElectrodeMaterial, number> = {
  copper:   0.80,   // copper electrodes: fine EDM possible (D1 grade)
  graphite: 1.60,   // graphite: medium texture (D2 grade typical)
};

// ============================================================================
// Engine
// ============================================================================

/**
 * HyperMillMoldCycleEngine — mold/die machining cycle selection and planning.
 */
export class HyperMillMoldCycleEngine {

  /**
   * Calculate mold cycle strategy, roughing plan, and SPI finish requirements.
   *
   * @param input - Mold feature type, geometry, SPI grade, tool params
   * @returns Mold cycle result with plans and SPI requirements
   */
  calculate(input: MoldCycleInput): MoldCycleResult {
    const warnings: string[] = [];
    const {
      featureType,
      spiGrade,
      partLengthMm,
      partWidthMm,
      partDepthMm,
      toolDiameterMm,
      allowanceMm = 0.3,
    } = input;

    let cycleName: string;
    let cycleCode: string;
    let cavityPlan: CavityRoughingPlan | undefined;
    let corePlan: CoreRoughingPlan | undefined;
    let partingLineSplit: PartingLineSplit | undefined;
    let electrodePlan: ElectrodeExtractionPlan | undefined;
    let spiRequirement: SpiFinishRequirement | undefined;

    // ── SPI Finish Resolution ─────────────────────────────────────────────────
    if (spiGrade) {
      spiRequirement = SPI_FINISH_DB[spiGrade];
      if (spiRequirement.requiresEDM) {
        warnings.push(
          `SPI ${spiGrade}: EDM process required — CNC machining alone cannot achieve Ra=${spiRequirement.target_Ra_um}μm texture`,
        );
      }
      if (spiRequirement.polishingRequired) {
        warnings.push(
          `SPI ${spiGrade}: manual polishing required (${spiRequirement.polishingRequired}) — leave ${spiRequirement.polishingAllowanceMm}mm stock`,
        );
      }
    }

    // ── Feature-specific logic ────────────────────────────────────────────────
    switch (featureType) {
      case "cavity": {
        cycleName = "3D Optimised Roughing (Cavity)";
        cycleCode = "Opt3d"; // hyperMILL optimised roughing cycle

        // Adaptive clearing: multiple Z-levels with constant chip load
        // Step-down: 0.5×D for adaptive roughing (hyperMILL default for cavity)
        const stepdownMm = toolDiameterMm * 0.5;
        const radialEngagement = toolDiameterMm * (input.useAdaptiveClearing ? 0.15 : 0.5);
        const nLevels = Math.ceil(partDepthMm / stepdownMm);

        cavityPlan = {
          levelCount: nLevels,
          stepdownMm: Math.round(stepdownMm * 100) / 100,
          radialEngagementMm: Math.round(radialEngagement * 100) / 100,
          adaptive: input.useAdaptiveClearing ?? true,
          cycleCode: "Opt3d",
        };

        if (partDepthMm > 100) {
          warnings.push(
            `Deep cavity (${partDepthMm}mm) — consider trochoidal paths to manage heat in deep Z-levels`,
          );
        }
        break;
      }

      case "core": {
        cycleName = "3D Core Roughing (Negative Offset from Parting)";
        cycleCode = "Opt3d";

        const partingZ = input.partingLineZ_mm ?? 0;
        // Core roughing: work from parting line DOWN with negative offset
        const stepdownMm = toolDiameterMm * 0.4;
        // Core depth = full part depth below parting line
        const coreDepth = partDepthMm - (partingZ > 0 ? partDepthMm - partingZ : 0);
        const nLevels = Math.ceil(Math.abs(coreDepth) / stepdownMm);

        corePlan = {
          partingLineOffsetMm: -allowanceMm, // negative = below parting line
          levelCount: nLevels,
          stepdownMm: Math.round(stepdownMm * 100) / 100,
          cycleCode: "Opt3d",
        };

        if (!input.partingLineZ_mm) {
          warnings.push(
            "No partingLineZ_mm provided for core roughing — defaulting to Z=0, verify in CAD",
          );
        }
        break;
      }

      case "parting_line": {
        cycleName = "Parting Line Detection + Split";
        cycleCode = "PL_SPLIT"; // virtual operation — no direct hyperMILL code

        const partingZ = input.partingLineZ_mm ?? partDepthMm / 2;

        partingLineSplit = {
          partingLineZ: partingZ,
          cavityRegion: { zMin: partingZ, zMax: partDepthMm },
          coreRegion: { zMin: 0, zMax: partingZ },
        };

        warnings.push(
          `Parting line at Z=${partingZ}mm — verify no undercuts before splitting cavity/core`,
        );
        break;
      }

      case "electrode": {
        const electrodeMat = input.electrodeMaterial ?? "graphite";
        const kc1_1 = ELECTRODE_KC11[electrodeMat];
        const edm_Ra = ELECTRODE_EDM_RA[electrodeMat];

        cycleName = `Electrode Roughing (${electrodeMat})`;
        cycleCode = "Opt3d"; // standard 3D roughing for electrode blanks

        electrodePlan = {
          material: electrodeMat,
          kc1_1,
          edm_Ra_um: edm_Ra,
          approach:
            electrodeMat === "graphite"
              ? "High-speed, positive rake, air blow — graphite dust extraction required"
              : "Standard milling, flood coolant, climb milling only",
          cycleCode: "Opt3d",
        };

        if (electrodeMat === "graphite") {
          warnings.push(
            "Graphite electrode: dust extraction mandatory, do not use coolant (coolant + graphite = conductive slurry)",
          );
        }

        // Check if SPI grade requires EDM
        if (spiGrade && !SPI_FINISH_DB[spiGrade].requiresEDM) {
          warnings.push(
            `SPI ${spiGrade} does not require EDM — verify electrode is needed`,
          );
        }
        break;
      }

      default: {
        cycleName = "Manual Selection Required";
        cycleCode = "MANUAL";
        warnings.push(`Unsupported feature type: ${featureType}`);
      }
    }

    // ── Tool size warnings ────────────────────────────────────────────────────
    const minPartDim = Math.min(partLengthMm, partWidthMm);
    if (toolDiameterMm > minPartDim * 0.5) {
      warnings.push(
        `Tool diameter ${toolDiameterMm}mm > 50% of smallest dimension (${minPartDim}mm) — verify fit`,
      );
    }

    const confidence = warnings.some((w) => w.startsWith("COLLISION") || w.startsWith("Unsupported"))
      ? 0.5
      : warnings.length === 0
      ? 0.90
      : 0.75;

    return {
      featureType,
      cycleName,
      cycleCode,
      cavityPlan,
      corePlan,
      partingLineSplit,
      electrodePlan,
      spiRequirement,
      warnings,
      confidence,
      source: "hypermill-v33 mold-die module + SPI-B5-107-1995",
    };
  }

  /**
   * Look up SPI finish grade specification.
   *
   * @param grade - SPI grade code (A1–D3)
   * @returns SPI finish requirement with Ra target, process, polishing info
   */
  getSpiFinish(grade: SpiFinishGrade): SpiFinishRequirement {
    return SPI_FINISH_DB[grade];
  }

  /**
   * List all SPI finish grades with their Ra targets.
   *
   * @returns Array of grade codes and Ra targets in ascending Ra order
   */
  listSpiGrades(): Array<{ grade: SpiFinishGrade; target_Ra_um: number; requiresEDM: boolean }> {
    return (Object.keys(SPI_FINISH_DB) as SpiFinishGrade[])
      .map((g) => ({
        grade: g,
        target_Ra_um: SPI_FINISH_DB[g].target_Ra_um,
        requiresEDM: SPI_FINISH_DB[g].requiresEDM,
      }))
      .sort((a, b) => a.target_Ra_um - b.target_Ra_um);
  }

  /**
   * Get electrode material kc1.1 for force estimation.
   * @param material - Electrode material type
   * @returns kc1.1 [N/mm²]
   */
  getElectrodeKc11(material: ElectrodeMaterial): number {
    return ELECTRODE_KC11[material];
  }
}

export const hyperMillMoldCycleEngine = new HyperMillMoldCycleEngine();
