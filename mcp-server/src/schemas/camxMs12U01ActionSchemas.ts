/**
 * CAMX-MS12 U01 Action Schemas — Zod v4
 *
 * 5 dispatcher actions (FeatureStrategyKnowledgeBaseEngine E1112):
 *   strategy_kb_query    — find all matching rules for given conditions
 *   strategy_kb_best     — get single best strategy recommendation
 *   strategy_kb_add      — add a custom rule
 *   strategy_kb_stats    — knowledge base statistics
 *   strategy_kb_list     — list all rules (optionally filtered by feature type)
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const isoGroupZ = z.enum(["P", "M", "K", "N", "S", "H"]).describe(
  "ISO material group: P=steel, M=stainless, K=cast iron, N=non-ferrous, S=superalloy, H=hardened"
);

const featureTypeZ = z.enum([
  "pocket", "slot", "contour", "face", "hole", "bore",
  "thread", "freeform", "wall", "rib",
]).describe(
  "Machining feature type"
);

const machineAxesZ = z.enum(["3-axis", "3+2", "5-axis"]).describe(
  "Machine axis configuration"
);

const operationZ = z.enum(["roughing", "semi-finishing", "finishing"]).describe(
  "Primary machining operation"
);

const specialConditionsZ = z.array(
  z.enum([
    "thin_wall", "deep_cavity", "interrupted", "micro",
    "hard_material", "high_aspect_ratio", "burr_sensitive", "chatter_prone",
  ])
).optional().describe(
  "Special machining conditions that activate override rules"
);

const queryConditionsZ = z.object({
  feature_type:       featureTypeZ.optional(),
  material_iso:       isoGroupZ.optional(),
  machine_axes:       machineAxesZ.optional(),
  operation:          operationZ.optional(),
  depth_ratio:        z.number().positive().optional().describe(
    "Depth-to-diameter ratio (e.g. 10 for L/D=10 deep hole)"
  ),
  wall_thickness_mm:  z.number().positive().optional().describe(
    "Wall thickness in mm (triggers thin_wall rules when below threshold)"
  ),
  tolerance_class:    z.enum(["fine", "medium", "coarse"]).optional().describe(
    "Tolerance class: fine=IT6 and better, medium=IT7–IT9, coarse=IT10+"
  ),
  special_conditions: specialConditionsZ,
}).describe("Condition set to match against rules");

const strategyParametersZ = z.object({
  ae_pct:   z.number().positive().describe("Radial engagement ae as % of tool diameter"),
  ap_factor: z.number().positive().describe("Axial depth factor (multiple of tool diameter)"),
  vc_mult:  z.number().positive().describe("Cutting speed multiplier vs material baseline"),
  fz_mult:  z.number().positive().describe("Feed per tooth multiplier vs material baseline"),
});

const ruleConditionsZ = z.object({
  feature_type:          featureTypeZ.optional(),
  material_iso:          isoGroupZ.optional(),
  machine_axes:          machineAxesZ.optional(),
  operation:             operationZ.optional(),
  depth_ratio_min:       z.number().positive().optional(),
  wall_thickness_max_mm: z.number().positive().optional(),
  tolerance_class:       z.enum(["fine", "medium", "coarse"]).optional(),
  special_conditions:    specialConditionsZ,
});

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS12_U01_SCHEMAS: ActionSchemaMap = {

  /**
   * Find all matching rules for given conditions, ranked by specificity then confidence.
   * Returns array of matching StrategyRule objects.
   */
  strategy_kb_query: z.object({
    conditions: queryConditionsZ.describe(
      "Query conditions — all specified fields must match. Omitted fields are wildcards."
    ),
    limit: z.number().int().min(1).max(50).optional().default(10).describe(
      "Maximum number of rules to return. Default 10."
    ),
  }),

  /**
   * Get the single best strategy recommendation for a feature/material/machine/operation combo.
   * Returns the top matching rule plus up to 3 alternatives.
   */
  strategy_kb_best: z.object({
    feature_type:       featureTypeZ.describe("The feature being machined"),
    material_iso:       isoGroupZ.describe("ISO material group of the workpiece"),
    machine_axes:       machineAxesZ.describe("Machine axis configuration"),
    operation:          operationZ.describe("Machining operation type"),
    depth_ratio:        z.number().positive().optional().describe(
      "Depth-to-diameter ratio if relevant (e.g. for deep holes or deep cavities)"
    ),
    wall_thickness_mm:  z.number().positive().optional().describe(
      "Wall thickness in mm if this is a thin-wall feature"
    ),
    tolerance_class:    z.enum(["fine", "medium", "coarse"]).optional().describe(
      "Required tolerance class. fine=IT6+, medium=IT7–9, coarse=IT10+"
    ),
    special_conditions: specialConditionsZ,
  }),

  /**
   * Add a custom strategy rule to the knowledge base.
   * Custom rules participate in the same scoring as built-in rules.
   */
  strategy_kb_add: z.object({
    id: z.string().min(1).regex(/^[A-Z0-9_-]+$/).describe(
      "Unique rule ID in UPPER_SNAKE format, e.g. 'MY-PKT-P-001'"
    ),
    conditions: ruleConditionsZ.describe("Conditions that trigger this rule"),
    strategy: z.string().min(1).describe(
      "Canonical strategy ID from StrategyTaxonomyEngine, e.g. 'adaptive_clearing'"
    ),
    parameters: strategyParametersZ.describe("Cutting parameter multipliers"),
    justification: z.string().min(20).describe(
      "Physics-backed justification for this rule (minimum 20 chars)"
    ),
    source: z.enum(["playbook", "tribal", "novel", "physics"]).describe(
      "Rule provenance: playbook=established best practice, tribal=shop knowledge, novel=new insight, physics=derived from first principles"
    ),
    confidence: z.number().min(0).max(1).describe(
      "Confidence score 0–1. Use 0.95+ for well-established rules, 0.7–0.85 for experimental."
    ),
  }),

  /**
   * Get knowledge base statistics: total rules, coverage by feature/ISO/axes/operation, source breakdown.
   */
  strategy_kb_stats: z.object({}).describe(
    "No parameters required — returns full statistics for the knowledge base."
  ),

  /**
   * List rules from the knowledge base, optionally filtered by feature type.
   * Returns array of StrategyRule objects.
   */
  strategy_kb_list: z.object({
    feature_type: featureTypeZ.optional().describe(
      "Filter by feature type. Omit to return all rules."
    ),
    source: z.enum(["playbook", "tribal", "novel", "physics"]).optional().describe(
      "Filter by rule source/provenance. Omit to return all sources."
    ),
    operation: operationZ.optional().describe(
      "Filter by operation type. Omit to return all operations."
    ),
    limit: z.number().int().min(1).max(300).optional().default(50).describe(
      "Maximum number of rules to return. Default 50."
    ),
  }),
};
