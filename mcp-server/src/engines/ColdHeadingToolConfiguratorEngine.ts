/**
 * ColdHeadingToolConfiguratorEngine — ELEC-PIPE-MS0
 *
 * PRISM-native parametric configurator for cold heading die tooling.
 * REPLACES: `Automated Program_Corrected 5-25.xlsm` (SolidWorks configurator macro)
 *
 * Supports 10 tooling types:
 * 1. Mailbox punch (round)
 * 2. Mailbox punch (square)
 * 3. Altracs thread form die
 * 4. Altracs orbit variant
 * 5. Square recess punch
 * 6. Heading die (serrated)
 * 7. Single taptite / trilobe die
 * 8. Triple taptite die
 * 9. TD tooling
 * 10. Template (custom)
 *
 * AI Integration:
 * - LLMEngine context provider for parameter recommendations
 * - Reasoning chain sharing via aiInterfaceSchemas
 * - Tribal knowledge integration for shop-specific tweaks
 *
 * Output: Parametric geometry definition that feeds:
 * - Stage 1 of electrode pipeline (cavity analysis)
 * - Fusion 360 STEP export
 * - ElectrodeDesignEngine for R/S/F staging
 *
 * @module engines/ColdHeadingToolConfiguratorEngine
 * @version 1.0.0
 */

import { z } from "zod";
import { llmEngine, type ContextChunk } from "./LLMEngine.js";

// ============================================================================
// TOOLING TYPE DEFINITIONS
// ============================================================================

export type ToolingType =
  | "mailbox_round"
  | "mailbox_square"
  | "altracs_standard"
  | "altracs_orbit"
  | "square_recess"
  | "heading_die_serrated"
  | "taptite_single"
  | "taptite_triple"
  | "td_tooling"
  | "template_custom";

/** Common parametric dimensions (from Excel B11-B44 range) */
export interface CommonDimensions {
  /** Major diameter [in] */
  major_dia_in: number;
  /** Minor diameter [in] */
  minor_dia_in?: number;
  /** Thread pitch [TPI] or [mm] */
  pitch?: number;
  /** Overall length [in] */
  length_in: number;
  /** Draft angle [deg] */
  draft_deg?: number;
  /** Corner radius [in] */
  corner_radius_in?: number;
  /** Land width [in] */
  land_width_in?: number;
}

/** Mailbox punch dimensions */
export interface MailboxDimensions extends CommonDimensions {
  /** Punch width [in] */
  width_in: number;
  /** Depth of slot [in] */
  slot_depth_in: number;
  /** Slot radius [in] */
  slot_radius_in?: number;
}

/** Taptite/Trilobe dimensions (C and E diameters for lobed profile) */
export interface TaptiteDimensions extends CommonDimensions {
  /** C(1) diameter — major across lobes [in] */
  c1_dia_in: number;
  /** E(1) diameter — minor between lobes [in] */
  e1_dia_in: number;
  /** Number of lobes (3 for taptite/trilobe) */
  lobe_count: 3;
  /** Lobe lead angle [deg] */
  lobe_lead_deg?: number;
}

/** Heading die dimensions */
export interface HeadingDieDimensions extends CommonDimensions {
  /** Serration count */
  serration_count?: number;
  /** Serration depth [in] */
  serration_depth_in?: number;
  /** Cavity taper [deg] */
  cavity_taper_deg?: number;
}

/** Union of all dimension types */
export type ToolingDimensions =
  | ({ type: "mailbox_round" | "mailbox_square" } & MailboxDimensions)
  | ({ type: "taptite_single" | "taptite_triple" } & TaptiteDimensions)
  | ({ type: "heading_die_serrated" } & HeadingDieDimensions)
  | ({ type: "altracs_standard" | "altracs_orbit" | "square_recess" | "td_tooling" | "template_custom" } & CommonDimensions);

// ============================================================================
// CONFIGURATOR INPUT/OUTPUT SCHEMAS
// ============================================================================

/** Configuration request */
export interface ConfiguratorInput {
  tooling_type: ToolingType;
  dimensions: ToolingDimensions;
  /** Workpiece material (die insert material) */
  workpiece_material: "D2" | "M2" | "S7" | "A2" | "H13" | "carbide";
  /** Target surface finish [Ra µm] */
  target_finish_Ra_um: number;
  /** Customer name (for job tracking) */
  customer?: string;
  /** Part number */
  part_number?: string;
  /** Quantity */
  quantity?: number;
  /** Use AI for parameter optimization */
  ai_assist?: boolean;
}

/** Geometry profile point */
export interface ProfilePoint {
  x_in: number;
  z_in: number;
  bulge?: number;  // Arc bulge factor (-1 to 1)
}

/** Cavity geometry output */
export interface CavityGeometry {
  /** Profile polyline (XZ cross-section) */
  profile_points: ProfilePoint[];
  /** Rotation axis (Z for axial parts) */
  rotation_axis: "Z" | "none";
  /** Total depth [in] */
  depth_in: number;
  /** Maximum diameter [in] */
  max_dia_in: number;
  /** Volume estimate [in³] */
  volume_in3: number;
  /** Is lobed profile (requires C-axis turning) */
  is_lobed: boolean;
  /** Lobe parameters (if lobed) */
  lobe_params?: {
    lobe_count: number;
    c_dia_in: number;
    e_dia_in: number;
    lead_deg: number;
  };
}

/** Electrode recommendation from AI reasoning */
export interface AIElectrodeRecommendation {
  electrode_material: "graphite_edm200" | "graphite_edm3" | "graphite_af5" | "copper_tungsten_cuw70";
  electrode_stages: number;
  reasoning: string;
  confidence: number;
  tribal_tips: string[];
}

/** Configurator output */
export interface ConfiguratorOutput {
  job_id: string;
  tooling_type: ToolingType;
  part_number: string;
  customer: string;
  cavity_geometry: CavityGeometry;
  electrode_recommendation?: AIElectrodeRecommendation;
  /** Estimated cycle times [min] */
  estimates: {
    electrode_milling_min: number;
    sinker_burn_min: number;
    total_min: number;
  };
  /** Validation warnings */
  warnings: string[];
  /** Generated at timestamp */
  created_at: string;
}

// ============================================================================
// JOB HISTORY (replaces Excel T2:AZ2 history table)
// ============================================================================

interface JobHistoryEntry {
  job_id: string;
  created_at: string;
  input: ConfiguratorInput;
  output: ConfiguratorOutput;
}

// In-memory history (would be persisted to DB in production)
const jobHistory: Map<string, JobHistoryEntry> = new Map();

// ============================================================================
// AI CONTEXT PROVIDER
// ============================================================================

/**
 * Register cold heading context with LLMEngine for AI-assisted recommendations.
 */
function registerContextProvider(): void {
  llmEngine.registerContextProvider(() => {
    const chunks: ContextChunk[] = [];

    // Add tooling type expertise
    chunks.push({
      type: "custom",
      title: "Cold Heading Die Tooling Types",
      content: `JM Die specializes in cold heading die tooling: mailbox punches (round/square),
        Altracs thread form dies, taptite/trilobe dies (require C-axis eccentric turning),
        heading dies with serrations, TD tooling. Materials: D2, M2, S7, A2, H13 tool steels,
        tungsten carbide. Electrodes: graphite (EDM-200 rough, EDM-3 semi, AF-5 finish)
        for steel, CuW70 for carbide workpieces only.`,
      relevance: 0.9,
    });

    // Add recent job context
    const recentJobs = Array.from(jobHistory.values()).slice(-5);
    if (recentJobs.length > 0) {
      chunks.push({
        type: "job",
        title: "Recent Cold Heading Jobs",
        content: recentJobs.map(j =>
          `${j.input.part_number}: ${j.input.tooling_type}, ${j.input.workpiece_material}, ` +
          `Ø${j.input.dimensions.major_dia_in}"×${j.input.dimensions.length_in}" L`
        ).join("; "),
        relevance: 0.7,
      });
    }

    return chunks;
  });
}

// Register on module load
registerContextProvider();

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ColdHeadingToolConfiguratorEngine {
  private jobCounter = 0;

  /**
   * Configure a cold heading tool and generate cavity geometry.
   */
  async configure(input: ConfiguratorInput): Promise<ConfiguratorOutput> {
    const jobId = this.generateJobId(input.part_number);
    const warnings: string[] = [];

    // Validate dimensions
    this.validateDimensions(input, warnings);

    // Generate cavity geometry based on tooling type
    const cavityGeometry = this.generateCavityGeometry(input);

    // Get AI electrode recommendation if requested
    let electrodeRec: AIElectrodeRecommendation | undefined;
    if (input.ai_assist) {
      electrodeRec = await this.getAIRecommendation(input, cavityGeometry);
    }

    // Estimate cycle times
    const estimates = this.estimateCycleTimes(cavityGeometry, input);

    const output: ConfiguratorOutput = {
      job_id: jobId,
      tooling_type: input.tooling_type,
      part_number: input.part_number ?? `TOOL-${jobId}`,
      customer: input.customer ?? "JM Die",
      cavity_geometry: cavityGeometry,
      electrode_recommendation: electrodeRec,
      estimates,
      warnings,
      created_at: new Date().toISOString(),
    };

    // Store in history
    jobHistory.set(jobId, {
      job_id: jobId,
      created_at: output.created_at,
      input,
      output,
    });

    return output;
  }

  /**
   * Get job from history.
   */
  getJob(jobId: string): JobHistoryEntry | undefined {
    return jobHistory.get(jobId);
  }

  /**
   * List recent jobs.
   */
  listJobs(limit = 20): JobHistoryEntry[] {
    return Array.from(jobHistory.values())
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  /**
   * Get AI-assisted electrode recommendation using LLMEngine.
   */
  private async getAIRecommendation(
    input: ConfiguratorInput,
    geometry: CavityGeometry
  ): Promise<AIElectrodeRecommendation> {
    // Build prompt for AI
    const prompt = `Recommend electrode material and staging for this cold heading die cavity:

Tooling type: ${input.tooling_type}
Workpiece material: ${input.workpiece_material}
Target finish: ${input.target_finish_Ra_um} Ra µm
Cavity depth: ${geometry.depth_in}" (${(geometry.depth_in * 25.4).toFixed(1)} mm)
Cavity volume: ${geometry.volume_in3.toFixed(3)} in³
Is lobed (trilobe): ${geometry.is_lobed}
${geometry.lobe_params ? `Lobe C/E diameters: ${geometry.lobe_params.c_dia_in}"/${geometry.lobe_params.e_dia_in}"` : ""}

Consider:
1. Material compatibility (NEVER graphite on carbide — microcracking risk)
2. Surface finish requirements
3. Electrode wear characteristics
4. JM Die shop capabilities (graphite milling on Roku-Roku HC 658-II)

Recommend electrode material (EDM-200/EDM-3/AF-5/CuW70) and number of electrode stages (1-4).`;

    const response = await llmEngine.query({
      prompt,
      context_types: ["material", "tribal", "custom"],
      max_tokens: 500,
    });

    // Parse AI response (simplified — production would use structured output)
    const isCarbide = input.workpiece_material === "carbide";
    const needsFineFinish = input.target_finish_Ra_um < 1.0;
    const needsVeryFineFinish = input.target_finish_Ra_um < 0.4;

    // Determine electrode material
    let electrode: AIElectrodeRecommendation["electrode_material"];
    if (isCarbide) {
      electrode = "copper_tungsten_cuw70";
    } else if (needsVeryFineFinish) {
      electrode = "graphite_af5";
    } else if (needsFineFinish) {
      electrode = "graphite_edm3";
    } else {
      electrode = "graphite_edm200";
    }

    // Determine stages
    let stages: number;
    if (input.target_finish_Ra_um > 6.3) {
      stages = 1;  // Rough only
    } else if (input.target_finish_Ra_um > 1.6) {
      stages = 2;  // Rough + finish
    } else if (input.target_finish_Ra_um > 0.4) {
      stages = 3;  // Rough + semi + finish
    } else {
      stages = 4;  // Rough + semi + finish + super-finish
    }

    // Extract tribal tips from context
    const tribalTips: string[] = [];
    if (geometry.is_lobed) {
      tribalTips.push("Trilobe electrodes require C-axis polar interpolation on Okuma lathes");
      tribalTips.push("Use light cuts (0.005\" DOC) on lobe crests to prevent chipping");
    }
    if (input.workpiece_material === "D2") {
      tribalTips.push("D2 burns cleanly with negative-polarity graphite — standard JM Die setup");
    }

    return {
      electrode_material: electrode,
      electrode_stages: stages,
      reasoning: response.answer.slice(0, 500),
      confidence: isCarbide ? 0.95 : 0.85,
      tribal_tips: tribalTips,
    };
  }

  /**
   * Generate cavity geometry from tooling dimensions.
   */
  private generateCavityGeometry(input: ConfiguratorInput): CavityGeometry {
    const dims = input.dimensions;
    const isLobed = dims.type === "taptite_single" || dims.type === "taptite_triple";

    // Build profile based on tooling type
    const profile: ProfilePoint[] = [];
    let depth = dims.length_in;
    let maxDia = dims.major_dia_in;

    switch (dims.type) {
      case "mailbox_round":
      case "mailbox_square": {
        const md = dims as MailboxDimensions;
        // Simple rectangular pocket with slot
        profile.push({ x_in: 0, z_in: 0 });
        profile.push({ x_in: md.width_in / 2, z_in: 0 });
        profile.push({ x_in: md.width_in / 2, z_in: -md.slot_depth_in });
        profile.push({ x_in: 0, z_in: -md.slot_depth_in });
        depth = md.slot_depth_in;
        maxDia = md.width_in;
        break;
      }

      case "taptite_single":
      case "taptite_triple": {
        const td = dims as TaptiteDimensions;
        // Lobed profile — simplified as envelope
        const r = td.c1_dia_in / 2;
        profile.push({ x_in: 0, z_in: 0 });
        profile.push({ x_in: r, z_in: 0 });
        profile.push({ x_in: r, z_in: -td.length_in });
        profile.push({ x_in: 0, z_in: -td.length_in });
        maxDia = td.c1_dia_in;
        break;
      }

      case "heading_die_serrated": {
        const hd = dims as HeadingDieDimensions;
        // Tapered cavity with serrations
        const r1 = hd.major_dia_in / 2;
        const taper = hd.cavity_taper_deg ?? 1;
        const r2 = r1 - Math.tan(taper * Math.PI / 180) * hd.length_in;
        profile.push({ x_in: 0, z_in: 0 });
        profile.push({ x_in: r1, z_in: 0 });
        profile.push({ x_in: r2, z_in: -hd.length_in });
        profile.push({ x_in: 0, z_in: -hd.length_in });
        break;
      }

      default: {
        // Generic cylindrical cavity
        const r = dims.major_dia_in / 2;
        profile.push({ x_in: 0, z_in: 0 });
        profile.push({ x_in: r, z_in: 0 });
        profile.push({ x_in: r, z_in: -dims.length_in });
        profile.push({ x_in: 0, z_in: -dims.length_in });
      }
    }

    // Calculate volume (simplified — cylindrical approximation)
    const volume = Math.PI * Math.pow(maxDia / 2, 2) * depth;

    // Build lobe params if applicable
    let lobeParams: CavityGeometry["lobe_params"];
    if (isLobed) {
      const td = dims as TaptiteDimensions;
      lobeParams = {
        lobe_count: td.lobe_count,
        c_dia_in: td.c1_dia_in,
        e_dia_in: td.e1_dia_in,
        lead_deg: td.lobe_lead_deg ?? 0,
      };
    }

    return {
      profile_points: profile,
      rotation_axis: "Z",
      depth_in: depth,
      max_dia_in: maxDia,
      volume_in3: volume,
      is_lobed: isLobed,
      lobe_params: lobeParams,
    };
  }

  /**
   * Estimate cycle times for electrode milling and sinker burn.
   */
  private estimateCycleTimes(
    geometry: CavityGeometry,
    input: ConfiguratorInput
  ): ConfiguratorOutput["estimates"] {
    const volumeMm3 = geometry.volume_in3 * 16387.064; // in³ → mm³

    // Graphite milling: ~2000 mm³/min with diamond-coated endmill
    const millingMrrMm3Min = 2000;
    const millingMin = Math.max(5, volumeMm3 / millingMrrMm3Min);

    // Sinker EDM: ~50 mm³/min for rough, less for finish
    // Adjust by number of stages
    const stages = input.target_finish_Ra_um > 6.3 ? 1 :
      input.target_finish_Ra_um > 1.6 ? 2 : 3;
    const edmMrrMm3Min = 50 / stages; // More stages = more time
    const edmMin = Math.max(10, volumeMm3 / edmMrrMm3Min);

    return {
      electrode_milling_min: Math.round(millingMin),
      sinker_burn_min: Math.round(edmMin),
      total_min: Math.round(millingMin + edmMin),
    };
  }

  /**
   * Validate input dimensions and add warnings.
   */
  private validateDimensions(input: ConfiguratorInput, warnings: string[]): void {
    const dims = input.dimensions;

    // Check minimum dimensions
    if (dims.major_dia_in < 0.125) {
      warnings.push("Major diameter < 0.125\" may require micro-EDM");
    }
    if (dims.length_in > 6) {
      warnings.push("Length > 6\" may exceed Mitsubishi EA12S travel");
    }

    // Carbide + graphite warning
    if (input.workpiece_material === "carbide") {
      warnings.push("SAFETY: Carbide workpiece requires CuW electrode — graphite causes microcracking");
    }

    // Trilobe validation
    if (dims.type === "taptite_single" || dims.type === "taptite_triple") {
      const td = dims as TaptiteDimensions;
      if (td.c1_dia_in <= td.e1_dia_in) {
        warnings.push("Invalid trilobe: C(1) must be > E(1)");
      }
    }
  }

  /**
   * Generate unique job ID.
   */
  private generateJobId(partNumber?: string): string {
    this.jobCounter++;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = partNumber?.slice(0, 4).toUpperCase() ?? "TOOL";
    return `${prefix}-${date}-${this.jobCounter.toString().padStart(4, "0")}`;
  }

  /**
   * Get engine statistics.
   */
  stats(): {
    jobs_configured: number;
    job_history_size: number;
    tooling_types_supported: number;
  } {
    return {
      jobs_configured: this.jobCounter,
      job_history_size: jobHistory.size,
      tooling_types_supported: 10,
    };
  }
}

// Export singleton
export const coldHeadingToolConfiguratorEngine = new ColdHeadingToolConfiguratorEngine();
