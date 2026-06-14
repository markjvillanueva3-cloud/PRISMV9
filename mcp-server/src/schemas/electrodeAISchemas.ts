/**
 * Electrode AI dispatcher schemas
 *
 * BRIDGE-WIRING / U-BRIDGE-WIRE-ELECTRODE — wire 4 previously-orphan
 * Electrode AI engines (ElectrodeAIReasoningEngine,
 * ElectrodeAdvancedAIEngine, ElectrodeDeepLearningEngine,
 * ElectrodeUltimateAIEngine) into prism_edm.
 *
 * Inputs mirror each engine's orchestrator method signature one-for-one.
 * All shapes are subsets of the existing `electrode_design` flow — they
 * share workpiece-material / num_cavities / target_finish_Ra_um — so an
 * upstream caller that already prepared the legacy electrode input can
 * pass the same params here with the model-specific extras layered on.
 */
import { z } from "zod";

const PositiveNumber = z.number().positive();
const NonNegInt = z.number().int().nonnegative();

const ElectrodeAIReasonFullSchema = z.object({
  part_number: z.string().min(1).describe("Part / order number identifier"),
  c_dia_in: PositiveNumber.describe("Crest diameter (inches)"),
  e_dia_in: PositiveNumber.describe("Eccentric / minor diameter (inches)"),
  lead_angle_deg: z.number().describe("Helical lead angle (degrees, 0 = straight)"),
  total_length_in: PositiveNumber.describe("Total electrode length (inches)"),
  workpiece_material: z.string().min(1).describe("Workpiece material (e.g., D2, H13, Inconel)"),
  target_finish_Ra_um: PositiveNumber.describe("Target surface finish Ra (micrometers)"),
  num_cavities: z.number().int().positive().describe("Number of cavities in tool"),
});

const ElectrodeAdvancedAnalysisSchema = z.object({
  discharge_energy_mJ: PositiveNumber.describe("Discharge energy per spark (mJ)"),
  duty_cycle: z.number().min(0).max(1).describe("Pulse duty cycle (0..1)"),
  electrode_grain_size_um: PositiveNumber.describe("Electrode graphite grain size (micrometers)"),
  workpiece_hardness_HRC: z.number().describe("Workpiece hardness (HRC)"),
  workpiece_material: z.string().min(1).describe("Workpiece material"),
  num_cavities: z.number().int().positive().describe("Number of cavities"),
  num_skim_passes: NonNegInt.describe("Number of skim passes"),
  spark_gap_mm: PositiveNumber.describe("Spark gap (mm)"),
  target_finish_Ra_um: PositiveNumber.describe("Target Ra (micrometers)"),
  surface_area_mm2: z.number().positive().optional().describe("Cavity surface area (mm^2)"),
  depth_mm: z.number().positive().optional().describe("Cavity depth (mm)"),
  c_dia_in: z.number().positive().optional().describe("Crest diameter (inches) — for trilobe context"),
  e_dia_in: z.number().positive().optional().describe("Eccentric diameter (inches) — for trilobe context"),
  rpm: z.number().positive().optional().describe("Electrode rotation speed (RPM)"),
  feed_ipr: z.number().positive().optional().describe("Feed per revolution (inches)"),
});

const ElectrodeDeepLearningAnalyzeSchema = z.object({
  c_dia_in: PositiveNumber.describe("Crest diameter (inches)"),
  e_dia_in: PositiveNumber.describe("Eccentric diameter (inches)"),
  total_length_in: PositiveNumber.describe("Total electrode length (inches)"),
  workpiece_material: z.string().min(1).describe("Workpiece material"),
  workpiece_hardness_HRC: z.number().describe("Workpiece hardness (HRC)"),
  target_finish_Ra_um: PositiveNumber.describe("Target Ra (micrometers)"),
  num_cavities: z.number().int().positive().describe("Number of cavities"),
  lead_angle_deg: z.number().optional().describe("Helical lead angle (degrees) — defaults to 0"),
  rpm: z.number().positive().optional().describe("Electrode rotation speed (RPM)"),
  feed_ipr: z.number().positive().optional().describe("Feed per revolution (inches)"),
});

const ElectrodeUltimateAnalyzeSchema = z.object({
  discharge_energy_mJ: PositiveNumber.describe("Discharge energy per spark (mJ)"),
  duty_cycle: z.number().min(0).max(1).describe("Pulse duty cycle (0..1)"),
  electrode_grain_size_um: PositiveNumber.describe("Electrode graphite grain size (micrometers)"),
  workpiece_hardness_HRC: z.number().describe("Workpiece hardness (HRC)"),
  workpiece_material: z.string().min(1).describe("Workpiece material"),
  num_cavities: z.number().int().positive().describe("Number of cavities"),
  num_passes: z.number().int().positive().describe("Number of EDM passes"),
  target_finish_Ra_um: PositiveNumber.describe("Target Ra (micrometers)"),
});

export const ELECTRODE_AI_SCHEMAS = {
  electrode_ai_reason_full: ElectrodeAIReasonFullSchema.describe(
    "ElectrodeAIReasoningEngine.fullElectrodeDesign — multi-stage reasoning: material + spark-gap + trilobe + CAM, returns reasoning chains + safety warnings + confidence"
  ),
  electrode_advanced_analysis: ElectrodeAdvancedAnalysisSchema.describe(
    "ElectrodeAdvancedAIEngine.comprehensiveAdvancedAnalysis — SHAP-style feature importance + counterfactuals + causal-DAG + anomaly detection + ensemble prediction + LLM explanation"
  ),
  electrode_deep_learning_analyze: ElectrodeDeepLearningAnalyzeSchema.describe(
    "ElectrodeDeepLearningEngine.comprehensiveAnalysis — NN predictions for wear / surface finish / force variation, parameter optimization"
  ),
  electrode_ultimate_analyze: ElectrodeUltimateAnalyzeSchema.describe(
    "ElectrodeUltimateAIEngine.comprehensiveUltimateAnalysis — Transformer attention + GNN + LSTM wear progression + VAE latent + physics-informed neural net"
  ),
};

export type ElectrodeAIAction = keyof typeof ELECTRODE_AI_SCHEMAS;
