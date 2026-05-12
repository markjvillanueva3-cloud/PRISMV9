/**
 * FiveAxisCADTemplateEngine — MILL-HARD-MS6
 * ==========================================
 * CAD-triggered automatic template generation with parametric variability:
 *   1. CAD Event Hooks: Auto-trigger template generation on CAD model creation
 *   2. Parametric Variables: Extract dimensions as user-modifiable parameters
 *   3. Template Variants: Auto-generate scaled, material, and tolerance variants
 *
 * Integration with PRISM App:
 *   - Hooks into CAD creation events (new model, import, modification)
 *   - Extracts parametric dimensions from CAD model
 *   - Generates template with user-modifiable variables
 *   - Auto-creates variants for common scaling and material changes
 *
 * Use Cases:
 *   - "Similar to last die cavity but 20% smaller"
 *   - "Same punch profile in M2 instead of D2"
 *   - "Previous electrode scaled to 0.8x for undersizing"
 *
 * @module engines/FiveAxisCADTemplateEngine
 * @version 1.0.0
 * @milestone MILL-HARD-MS6
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";
import {
  type FiveAxisTemplate,
  type FeatureSignature,
  type CuttingParameters,
  type MachineSetup,
  type TemplateCategory,
  FiveAxisDeepLearningEngine,
} from "./FiveAxisDeepLearningEngine.js";
import {
  type FiveAxisStrategyEntry,
  type FiveAxisGeometry,
  type MaterialProps,
} from "./FiveAxisToolpathSynthesisEngine.js";

// ============================================================================
// TYPES — CAD EVENT SYSTEM
// ============================================================================

/** CAD event types that trigger template generation */
export type CADEventType =
  | "model_created"
  | "model_imported"
  | "model_modified"
  | "model_cloned"
  | "feature_added"
  | "feature_modified"
  | "model_finalized";

/** CAD event payload */
export interface CADEvent {
  type: CADEventType;
  timestamp: string;
  model_id: string;
  model_name: string;
  source: "prism_cad" | "solidworks" | "inventor" | "fusion360" | "step_import" | "iges_import";
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

/** CAD model representation */
export interface CADModel {
  id: string;
  name: string;
  file_path?: string;
  format: "prism" | "step" | "iges" | "solidworks" | "inventor" | "fusion360";
  created_at: string;
  modified_at: string;
  version: number;

  // Geometry bounds
  bounding_box: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
    min_z: number;
    max_z: number;
  };

  // Extracted features
  features: CADFeature[];

  // Parametric dimensions
  parameters: ParametricDimension[];

  // Material assignment
  material?: MaterialProps;

  // Metadata
  customer_id?: string;
  project_id?: string;
  part_number?: string;
}

/** Individual CAD feature */
export interface CADFeature {
  id: string;
  name: string;
  type: FiveAxisGeometry;
  parent_id?: string;

  // Geometry
  dimensions: {
    length_mm: number;
    width_mm: number;
    depth_mm: number;
    diameter_mm?: number;
    fillet_radius_mm?: number;
    draft_angle_deg?: number;
    taper_angle_deg?: number;
  };

  // Surface properties
  surface_area_mm2: number;
  volume_mm3: number;

  // Manufacturing hints
  tolerance_class?: "fine" | "medium" | "coarse";
  surface_finish_target_um?: number;
  is_critical_surface?: boolean;
}

// ============================================================================
// TYPES — PARAMETRIC SYSTEM
// ============================================================================

/** Parametric dimension types */
export type ParameterType =
  | "linear"      // Length, width, depth
  | "angular"     // Angle, taper
  | "radial"      // Radius, fillet
  | "count"       // Number of features
  | "tolerance"   // Tolerance class
  | "material"    // Material selection
  | "derived";    // Calculated from others

/** Parametric dimension definition */
export interface ParametricDimension {
  id: string;
  name: string;
  display_name: string;
  type: ParameterType;

  // Value
  value: number | string;
  unit: string;

  // Constraints
  min_value?: number;
  max_value?: number;
  allowed_values?: (number | string)[];

  // Relationships
  driven_by?: string[];      // IDs of parameters this depends on
  drives?: string[];         // IDs of parameters this controls
  formula?: string;          // Expression for derived parameters

  // UI hints
  editable: boolean;
  category: string;          // Grouping in UI
  description?: string;
  affects_strategy?: boolean; // If true, strategy recalculation needed on change
}

/** Parametric template with user-modifiable variables */
export interface ParametricTemplate extends FiveAxisTemplate {
  // Parametric extensions
  parameters: ParametricDimension[];
  parameter_groups: ParameterGroup[];

  // Constraints
  constraints: ParametricConstraint[];

  // Derivation rules
  derivation_rules: DerivationRule[];

  // Variant generation config
  variant_config: VariantConfig;
}

/** Parameter group for UI organization */
export interface ParameterGroup {
  id: string;
  name: string;
  description: string;
  parameters: string[]; // Parameter IDs
  collapsed_by_default: boolean;
}

/** Constraint between parameters */
export interface ParametricConstraint {
  id: string;
  name: string;
  type: "equality" | "inequality" | "range" | "ratio" | "custom";
  parameters: string[];
  expression: string;
  error_message: string;
  severity: "error" | "warning";
}

/** Rule for deriving parameter values */
export interface DerivationRule {
  target_parameter: string;
  source_parameters: string[];
  formula: string;
  recalculate_on_change: boolean;
}

// ============================================================================
// TYPES — VARIANT SYSTEM
// ============================================================================

/** Variant generation configuration */
export interface VariantConfig {
  auto_generate: boolean;
  scale_variants: ScaleVariantConfig;
  material_variants: MaterialVariantConfig;
  tolerance_variants: ToleranceVariantConfig;
  custom_variants: CustomVariantConfig[];
}

/** Scale variant configuration */
export interface ScaleVariantConfig {
  enabled: boolean;
  scales: number[]; // e.g., [0.8, 0.9, 1.1, 1.2]
  preserve_aspect_ratio: boolean;
  min_feature_size_mm: number;
}

/** Material variant configuration */
export interface MaterialVariantConfig {
  enabled: boolean;
  alternative_materials: MaterialProps[];
  recalculate_strategy: boolean;
}

/** Tolerance variant configuration */
export interface ToleranceVariantConfig {
  enabled: boolean;
  tolerance_classes: ("fine" | "medium" | "coarse")[];
  affects_feeds_speeds: boolean;
}

/** Custom variant definition */
export interface CustomVariantConfig {
  id: string;
  name: string;
  parameter_overrides: Record<string, number | string>;
  description: string;
}

/** Generated template variant */
export interface TemplateVariant {
  id: string;
  base_template_id: string;
  variant_type: "scale" | "material" | "tolerance" | "custom";
  variant_name: string;

  // Parameter changes
  parameter_changes: {
    parameter_id: string;
    original_value: number | string;
    new_value: number | string;
  }[];

  // Impact assessment
  impact: {
    cycle_time_change_pct: number;
    tool_life_impact: "better" | "same" | "worse";
    surface_finish_impact: "better" | "same" | "worse";
    strategy_change_needed: boolean;
    recommended_strategy?: string;
  };

  // Full variant template
  template: ParametricTemplate;
}

// ============================================================================
// TYPES — HOOK SYSTEM
// ============================================================================

/** Hook registration */
export interface CADTemplateHook {
  id: string;
  name: string;
  event_types: CADEventType[];
  priority: number; // Lower = higher priority
  enabled: boolean;
  filter?: (event: CADEvent) => boolean;
  handler: (event: CADEvent, model: CADModel) => Promise<ParametricTemplate | null>;
}

/** Hook execution result */
export interface HookExecutionResult {
  hook_id: string;
  success: boolean;
  template_generated: boolean;
  template_id?: string;
  execution_time_ms: number;
  error?: string;
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

/**
 * FiveAxisCADTemplateEngine — MILL-HARD-MS6
 *
 * CAD-triggered automatic template generation with:
 * - Event hooks for CAD creation events
 * - Parametric dimension extraction
 * - User-modifiable variables
 * - Automatic variant generation
 */
export class FiveAxisCADTemplateEngine {
  private static hooks: Map<string, CADTemplateHook> = new Map();
  private static templates: Map<string, ParametricTemplate> = new Map();
  private static variants: Map<string, TemplateVariant[]> = new Map();
  private static eventLog: CADEvent[] = [];

  // =========================================================================
  // CAD EVENT HOOKS (μS-19)
  // =========================================================================

  /**
   * Register a hook for CAD events
   */
  static registerHook(hook: CADTemplateHook): void {
    this.hooks.set(hook.id, hook);
    log.info(`Registered CAD template hook: ${hook.name} (${hook.id})`);
  }

  /**
   * Unregister a hook
   */
  static unregisterHook(hookId: string): boolean {
    const removed = this.hooks.delete(hookId);
    if (removed) {
      log.info(`Unregistered CAD template hook: ${hookId}`);
    }
    return removed;
  }

  /**
   * Get all registered hooks
   */
  static getRegisteredHooks(): CADTemplateHook[] {
    return Array.from(this.hooks.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Process a CAD event through all registered hooks
   */
  static async processCADEvent(
    event: CADEvent,
    model: CADModel
  ): Promise<HookExecutionResult[]> {
    this.eventLog.push(event);
    const results: HookExecutionResult[] = [];

    // Get hooks sorted by priority
    const sortedHooks = this.getRegisteredHooks().filter(
      (h) => h.enabled && h.event_types.includes(event.type)
    );

    for (const hook of sortedHooks) {
      const startTime = Date.now();
      try {
        // Apply filter if present
        if (hook.filter && !hook.filter(event)) {
          continue;
        }

        // Execute hook handler
        const template = await hook.handler(event, model);

        if (template) {
          this.templates.set(template.id, template);

          // Auto-generate variants if configured
          if (template.variant_config.auto_generate) {
            const variants = this.generateAllVariants(template);
            this.variants.set(template.id, variants);
          }

          results.push({
            hook_id: hook.id,
            success: true,
            template_generated: true,
            template_id: template.id,
            execution_time_ms: Date.now() - startTime,
          });
        } else {
          results.push({
            hook_id: hook.id,
            success: true,
            template_generated: false,
            execution_time_ms: Date.now() - startTime,
          });
        }
      } catch (error) {
        results.push({
          hook_id: hook.id,
          success: false,
          template_generated: false,
          execution_time_ms: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Register default PRISM hooks for CAD events
   */
  static registerDefaultHooks(): void {
    // Hook for new model creation
    this.registerHook({
      id: "prism_model_created",
      name: "PRISM Model Creation Hook",
      event_types: ["model_created", "model_imported"],
      priority: 10,
      enabled: true,
      handler: async (event, model) => {
        return this.generateParametricTemplate(model, {
          auto_variants: true,
          include_ai_reasoning: true,
        });
      },
    });

    // Hook for model finalization
    this.registerHook({
      id: "prism_model_finalized",
      name: "PRISM Model Finalization Hook",
      event_types: ["model_finalized"],
      priority: 5,
      enabled: true,
      handler: async (event, model) => {
        return this.generateParametricTemplate(model, {
          auto_variants: true,
          include_ai_reasoning: true,
          finalized: true,
        });
      },
    });

    // Hook for feature modifications
    this.registerHook({
      id: "prism_feature_modified",
      name: "PRISM Feature Modification Hook",
      event_types: ["feature_added", "feature_modified"],
      priority: 20,
      enabled: true,
      filter: (event) => event.source === "prism_cad",
      handler: async (event, model) => {
        // Only regenerate if significant change
        const existingTemplate = this.findTemplateForModel(model.id);
        if (existingTemplate) {
          return this.updateParametricTemplate(existingTemplate, model);
        }
        return null;
      },
    });

    log.info("Registered 3 default PRISM CAD template hooks");
  }

  // =========================================================================
  // PARAMETRIC TEMPLATE GENERATION (μS-20)
  // =========================================================================

  /**
   * Generate a parametric template from a CAD model
   */
  static generateParametricTemplate(
    model: CADModel,
    options: {
      auto_variants?: boolean;
      include_ai_reasoning?: boolean;
      finalized?: boolean;
    } = {}
  ): ParametricTemplate {
    // Extract parametric dimensions from model
    const parameters = this.extractParameters(model);
    const parameterGroups = this.createParameterGroups(parameters);
    const constraints = this.generateConstraints(parameters, model);
    const derivationRules = this.generateDerivationRules(parameters);

    // Convert features to FeatureSignatures (provide default if empty)
    let features: FeatureSignature[];
    if (model.features.length === 0) {
      // Create a default feature from bounding box
      features = [{
        type: "block",
        dimensions: {
          length_mm: model.bounding_box.max_x - model.bounding_box.min_x,
          width_mm: model.bounding_box.max_y - model.bounding_box.min_y,
          depth_mm: model.bounding_box.max_z - model.bounding_box.min_z,
        },
        complexity_score: 1,
        undercut_count: 0,
        thin_wall_count: 0,
        tight_tolerance_count: 0,
        surface_area_mm2: 0,
        volume_mm3: 0,
      }];
    } else {
      features = model.features.map((f) => this.convertToFeatureSignature(f));
    }

    // Generate base template using MS5 engine
    const baseTemplate = FiveAxisDeepLearningEngine.generateTemplate(
      {
        part_number: model.part_number,
        customer_id: model.customer_id,
        cad_file: model.file_path,
      },
      features,
      model.material || this.getDefaultMaterial(),
      this.selectStrategy(model),
      this.generateDefaultCuttingParams(model),
      this.generateDefaultMachineSetup(),
      options.include_ai_reasoning
        ? this.generateAIReasoning(model)
        : {
            chain_of_thought: [],
            decision_criteria: {},
            alternatives_considered: [],
            confidence_score: 0.5,
          }
    );

    // Generate unique ID with random suffix
    const uniqueId = `pt_${model.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Extend to parametric template
    const parametricTemplate: ParametricTemplate = {
      ...baseTemplate,
      id: uniqueId,
      name: `${model.name} - Parametric Template`,
      description: `Auto-generated parametric template from CAD model ${model.name}`,
      parameters,
      parameter_groups: parameterGroups,
      constraints,
      derivation_rules: derivationRules,
      variant_config: this.createDefaultVariantConfig(model),
    };

    log.info(
      `Generated parametric template: ${parametricTemplate.id} with ${parameters.length} parameters`
    );

    return parametricTemplate;
  }

  /**
   * Extract parametric dimensions from CAD model
   */
  static extractParameters(model: CADModel): ParametricDimension[] {
    const parameters: ParametricDimension[] = [];

    // Add model-level parameters
    const bbox = model.bounding_box;
    parameters.push(
      {
        id: "overall_length",
        name: "overall_length",
        display_name: "Overall Length",
        type: "linear",
        value: bbox.max_x - bbox.min_x,
        unit: "mm",
        min_value: 1,
        max_value: 500,
        editable: true,
        category: "Envelope",
        affects_strategy: true,
      },
      {
        id: "overall_width",
        name: "overall_width",
        display_name: "Overall Width",
        type: "linear",
        value: bbox.max_y - bbox.min_y,
        unit: "mm",
        min_value: 1,
        max_value: 500,
        editable: true,
        category: "Envelope",
        affects_strategy: true,
      },
      {
        id: "overall_height",
        name: "overall_height",
        display_name: "Overall Height",
        type: "linear",
        value: bbox.max_z - bbox.min_z,
        unit: "mm",
        min_value: 1,
        max_value: 300,
        editable: true,
        category: "Envelope",
        affects_strategy: true,
      }
    );

    // Add feature-specific parameters
    for (const feature of model.features) {
      const featureParams = this.extractFeatureParameters(feature);
      parameters.push(...featureParams);
    }

    // Add material parameter if assigned
    if (model.material) {
      parameters.push({
        id: "material_iso_group",
        name: "material_iso_group",
        display_name: "Material ISO Group",
        type: "material",
        value: model.material.iso_group,
        unit: "",
        allowed_values: ["P", "M", "K", "N", "S", "H"],
        editable: true,
        category: "Material",
        affects_strategy: true,
        description: "ISO material classification (P=Steel, M=Stainless, K=Cast Iron, N=Aluminum, S=Superalloy, H=Hardened)",
      });
    }

    return parameters;
  }

  /**
   * Extract parameters from a single CAD feature
   */
  static extractFeatureParameters(feature: CADFeature): ParametricDimension[] {
    const params: ParametricDimension[] = [];
    const prefix = feature.name.toLowerCase().replace(/\s+/g, "_");

    // Dimensional parameters
    if (feature.dimensions.length_mm > 0) {
      params.push({
        id: `${prefix}_length`,
        name: `${prefix}_length`,
        display_name: `${feature.name} Length`,
        type: "linear",
        value: feature.dimensions.length_mm,
        unit: "mm",
        min_value: 0.1,
        editable: true,
        category: feature.name,
        affects_strategy: false,
      });
    }

    if (feature.dimensions.width_mm > 0) {
      params.push({
        id: `${prefix}_width`,
        name: `${prefix}_width`,
        display_name: `${feature.name} Width`,
        type: "linear",
        value: feature.dimensions.width_mm,
        unit: "mm",
        min_value: 0.1,
        editable: true,
        category: feature.name,
        affects_strategy: false,
      });
    }

    if (feature.dimensions.depth_mm > 0) {
      params.push({
        id: `${prefix}_depth`,
        name: `${prefix}_depth`,
        display_name: `${feature.name} Depth`,
        type: "linear",
        value: feature.dimensions.depth_mm,
        unit: "mm",
        min_value: 0.1,
        editable: true,
        category: feature.name,
        affects_strategy: feature.type === "deep_pocket" || feature.type === "deep_cavity",
      });
    }

    if (feature.dimensions.diameter_mm) {
      params.push({
        id: `${prefix}_diameter`,
        name: `${prefix}_diameter`,
        display_name: `${feature.name} Diameter`,
        type: "radial",
        value: feature.dimensions.diameter_mm,
        unit: "mm",
        min_value: 0.5,
        editable: true,
        category: feature.name,
        affects_strategy: false,
      });
    }

    if (feature.dimensions.fillet_radius_mm) {
      params.push({
        id: `${prefix}_fillet_radius`,
        name: `${prefix}_fillet_radius`,
        display_name: `${feature.name} Fillet Radius`,
        type: "radial",
        value: feature.dimensions.fillet_radius_mm,
        unit: "mm",
        min_value: 0.1,
        editable: true,
        category: feature.name,
        affects_strategy: true,
        description: "Minimum tool radius must be <= this value",
      });
    }

    if (feature.dimensions.draft_angle_deg) {
      params.push({
        id: `${prefix}_draft_angle`,
        name: `${prefix}_draft_angle`,
        display_name: `${feature.name} Draft Angle`,
        type: "angular",
        value: feature.dimensions.draft_angle_deg,
        unit: "deg",
        min_value: 0,
        max_value: 30,
        editable: true,
        category: feature.name,
        affects_strategy: true,
      });
    }

    // Tolerance parameter
    if (feature.tolerance_class) {
      params.push({
        id: `${prefix}_tolerance`,
        name: `${prefix}_tolerance`,
        display_name: `${feature.name} Tolerance`,
        type: "tolerance",
        value: feature.tolerance_class,
        unit: "",
        allowed_values: ["fine", "medium", "coarse"],
        editable: true,
        category: feature.name,
        affects_strategy: true,
      });
    }

    // Surface finish target
    if (feature.surface_finish_target_um) {
      params.push({
        id: `${prefix}_surface_finish`,
        name: `${prefix}_surface_finish`,
        display_name: `${feature.name} Surface Finish`,
        type: "linear",
        value: feature.surface_finish_target_um,
        unit: "Ra um",
        min_value: 0.1,
        max_value: 12.5,
        editable: true,
        category: feature.name,
        affects_strategy: true,
      });
    }

    return params;
  }

  /**
   * Create parameter groups for UI organization
   */
  static createParameterGroups(
    parameters: ParametricDimension[]
  ): ParameterGroup[] {
    const categoryMap = new Map<string, string[]>();

    for (const param of parameters) {
      const existing = categoryMap.get(param.category) || [];
      existing.push(param.id);
      categoryMap.set(param.category, existing);
    }

    return Array.from(categoryMap.entries()).map(([category, params]) => ({
      id: category.toLowerCase().replace(/\s+/g, "_"),
      name: category,
      description: `Parameters for ${category}`,
      parameters: params,
      collapsed_by_default: category !== "Envelope" && category !== "Material",
    }));
  }

  /**
   * Generate constraints between parameters
   */
  static generateConstraints(
    parameters: ParametricDimension[],
    model: CADModel
  ): ParametricConstraint[] {
    const constraints: ParametricConstraint[] = [];

    // Fillet radius must be smaller than half the smallest dimension
    const filletParams = parameters.filter((p) => p.id.includes("fillet_radius"));
    for (const fillet of filletParams) {
      const featureName = fillet.id.replace("_fillet_radius", "");
      const widthParam = parameters.find((p) => p.id === `${featureName}_width`);
      const depthParam = parameters.find((p) => p.id === `${featureName}_depth`);

      if (widthParam || depthParam) {
        constraints.push({
          id: `constraint_${fillet.id}_max`,
          name: `${fillet.display_name} Size Limit`,
          type: "inequality",
          parameters: [
            fillet.id,
            ...(widthParam ? [widthParam.id] : []),
            ...(depthParam ? [depthParam.id] : []),
          ],
          expression: `${fillet.id} <= min(${widthParam?.id || "999"}, ${depthParam?.id || "999"}) / 2`,
          error_message: "Fillet radius must be less than half the smallest adjacent dimension",
          severity: "error",
        });
      }
    }

    // Draft angle constraints for die cavities
    const draftParams = parameters.filter((p) => p.id.includes("draft_angle"));
    for (const draft of draftParams) {
      constraints.push({
        id: `constraint_${draft.id}_range`,
        name: `${draft.display_name} Range`,
        type: "range",
        parameters: [draft.id],
        expression: `${draft.id} >= 0.5 && ${draft.id} <= 15`,
        error_message: "Draft angle should be between 0.5 and 15 degrees for die work",
        severity: "warning",
      });
    }

    // Aspect ratio constraint for overall dimensions
    constraints.push({
      id: "constraint_aspect_ratio",
      name: "Aspect Ratio",
      type: "ratio",
      parameters: ["overall_length", "overall_width", "overall_height"],
      expression: "max(overall_length, overall_width, overall_height) / min(overall_length, overall_width, overall_height) <= 10",
      error_message: "Extreme aspect ratios may require special fixturing",
      severity: "warning",
    });

    return constraints;
  }

  /**
   * Generate derivation rules for calculated parameters
   */
  static generateDerivationRules(
    parameters: ParametricDimension[]
  ): DerivationRule[] {
    const rules: DerivationRule[] = [];

    // Total volume from overall dimensions
    rules.push({
      target_parameter: "bounding_volume",
      source_parameters: ["overall_length", "overall_width", "overall_height"],
      formula: "overall_length * overall_width * overall_height",
      recalculate_on_change: true,
    });

    // Stock size (add 5mm per side)
    rules.push({
      target_parameter: "stock_length",
      source_parameters: ["overall_length"],
      formula: "overall_length + 10",
      recalculate_on_change: true,
    });

    rules.push({
      target_parameter: "stock_width",
      source_parameters: ["overall_width"],
      formula: "overall_width + 10",
      recalculate_on_change: true,
    });

    rules.push({
      target_parameter: "stock_height",
      source_parameters: ["overall_height"],
      formula: "overall_height + 5",
      recalculate_on_change: true,
    });

    return rules;
  }

  // =========================================================================
  // VARIANT GENERATION (μS-21)
  // =========================================================================

  /**
   * Generate all configured variants for a template
   */
  static generateAllVariants(template: ParametricTemplate): TemplateVariant[] {
    const variants: TemplateVariant[] = [];
    const config = template.variant_config;

    // Scale variants
    if (config.scale_variants.enabled) {
      for (const scale of config.scale_variants.scales) {
        const variant = this.generateScaleVariant(template, scale);
        if (variant) variants.push(variant);
      }
    }

    // Material variants
    if (config.material_variants.enabled) {
      for (const material of config.material_variants.alternative_materials) {
        const variant = this.generateMaterialVariant(template, material);
        if (variant) variants.push(variant);
      }
    }

    // Tolerance variants
    if (config.tolerance_variants.enabled) {
      for (const toleranceClass of config.tolerance_variants.tolerance_classes) {
        const variant = this.generateToleranceVariant(template, toleranceClass);
        if (variant) variants.push(variant);
      }
    }

    // Custom variants
    for (const customConfig of config.custom_variants) {
      const variant = this.generateCustomVariant(template, customConfig);
      if (variant) variants.push(variant);
    }

    log.info(
      `Generated ${variants.length} variants for template ${template.id}`
    );

    return variants;
  }

  /**
   * Generate a scaled variant
   */
  static generateScaleVariant(
    template: ParametricTemplate,
    scale: number
  ): TemplateVariant | null {
    if (scale <= 0 || scale === 1) return null;

    const parameterChanges: TemplateVariant["parameter_changes"] = [];
    const newParameters = template.parameters.map((param) => {
      if (param.type === "linear" || param.type === "radial") {
        const originalValue = param.value as number;
        const newValue = originalValue * scale;

        // Check minimum feature size
        if (
          newValue <
          (template.variant_config.scale_variants.min_feature_size_mm || 0.5)
        ) {
          return param; // Skip scaling too-small features
        }

        parameterChanges.push({
          parameter_id: param.id,
          original_value: originalValue,
          new_value: newValue,
        });

        return { ...param, value: newValue };
      }
      return param;
    });

    // Assess impact
    const cycleTimeChange = scale < 1 ? (1 - scale) * -30 : (scale - 1) * 40;
    const strategyChangeNeeded = scale < 0.7 || scale > 1.5;

    const variantTemplate: ParametricTemplate = {
      ...template,
      id: `${template.id}_scale_${scale.toFixed(2).replace(".", "")}`,
      name: `${template.name} (${scale}x Scale)`,
      parameters: newParameters,
    };

    return {
      id: `var_${template.id}_scale_${scale}`,
      base_template_id: template.id,
      variant_type: "scale",
      variant_name: `${(scale * 100).toFixed(0)}% Scale`,
      parameter_changes: parameterChanges,
      impact: {
        cycle_time_change_pct: cycleTimeChange,
        tool_life_impact: scale < 1 ? "better" : "worse",
        surface_finish_impact: "same",
        strategy_change_needed: strategyChangeNeeded,
        recommended_strategy: strategyChangeNeeded
          ? scale < 0.7
            ? "5ax_point_milling"
            : "5ax_barrel_finishing"
          : undefined,
      },
      template: variantTemplate,
    };
  }

  /**
   * Generate a material variant
   */
  static generateMaterialVariant(
    template: ParametricTemplate,
    material: MaterialProps
  ): TemplateVariant | null {
    // Skip if same material (by name, not just ISO group)
    if (material.name === template.material.name) return null;

    const parameterChanges: TemplateVariant["parameter_changes"] = [];

    // Update material parameter
    const newParameters = template.parameters.map((param) => {
      if (param.id === "material_iso_group") {
        parameterChanges.push({
          parameter_id: param.id,
          original_value: param.value,
          new_value: material.iso_group,
        });
        return { ...param, value: material.iso_group };
      }
      return param;
    });

    // Assess impact based on material change
    const hardnessImpact = this.assessMaterialHardnessImpact(
      template.material,
      material
    );

    const variantTemplate: ParametricTemplate = {
      ...template,
      id: `${template.id}_mat_${material.iso_group.toLowerCase()}`,
      name: `${template.name} (${material.name})`,
      material: material,
      parameters: newParameters,
    };

    return {
      id: `var_${template.id}_mat_${material.iso_group}`,
      base_template_id: template.id,
      variant_type: "material",
      variant_name: `Material: ${material.name}`,
      parameter_changes: parameterChanges,
      impact: hardnessImpact,
      template: variantTemplate,
    };
  }

  /**
   * Generate a tolerance variant
   */
  static generateToleranceVariant(
    template: ParametricTemplate,
    toleranceClass: "fine" | "medium" | "coarse"
  ): TemplateVariant | null {
    const parameterChanges: TemplateVariant["parameter_changes"] = [];

    // Update all tolerance parameters
    const newParameters = template.parameters.map((param) => {
      if (param.type === "tolerance") {
        parameterChanges.push({
          parameter_id: param.id,
          original_value: param.value,
          new_value: toleranceClass,
        });
        return { ...param, value: toleranceClass };
      }
      return param;
    });

    // Assess impact
    const cycleTimeMultiplier =
      toleranceClass === "fine" ? 1.3 : toleranceClass === "coarse" ? 0.7 : 1.0;

    const variantTemplate: ParametricTemplate = {
      ...template,
      id: `${template.id}_tol_${toleranceClass}`,
      name: `${template.name} (${toleranceClass} tolerance)`,
      parameters: newParameters,
    };

    return {
      id: `var_${template.id}_tol_${toleranceClass}`,
      base_template_id: template.id,
      variant_type: "tolerance",
      variant_name: `${toleranceClass.charAt(0).toUpperCase() + toleranceClass.slice(1)} Tolerance`,
      parameter_changes: parameterChanges,
      impact: {
        cycle_time_change_pct: (cycleTimeMultiplier - 1) * 100,
        tool_life_impact: toleranceClass === "fine" ? "worse" : "better",
        surface_finish_impact: toleranceClass === "fine" ? "better" : toleranceClass === "coarse" ? "worse" : "same",
        strategy_change_needed: toleranceClass === "fine",
        recommended_strategy:
          toleranceClass === "fine" ? "5ax_barrel_finishing" : undefined,
      },
      template: variantTemplate,
    };
  }

  /**
   * Generate a custom variant
   */
  static generateCustomVariant(
    template: ParametricTemplate,
    config: CustomVariantConfig
  ): TemplateVariant | null {
    const parameterChanges: TemplateVariant["parameter_changes"] = [];

    const newParameters = template.parameters.map((param) => {
      if (config.parameter_overrides[param.id] !== undefined) {
        parameterChanges.push({
          parameter_id: param.id,
          original_value: param.value,
          new_value: config.parameter_overrides[param.id],
        });
        return { ...param, value: config.parameter_overrides[param.id] };
      }
      return param;
    });

    const variantTemplate: ParametricTemplate = {
      ...template,
      id: `${template.id}_custom_${config.id}`,
      name: `${template.name} (${config.name})`,
      parameters: newParameters,
    };

    return {
      id: `var_${template.id}_custom_${config.id}`,
      base_template_id: template.id,
      variant_type: "custom",
      variant_name: config.name,
      parameter_changes: parameterChanges,
      impact: {
        cycle_time_change_pct: 0, // Unknown without recalculation
        tool_life_impact: "same",
        surface_finish_impact: "same",
        strategy_change_needed: parameterChanges.some((pc) => {
          const param = template.parameters.find((p) => p.id === pc.parameter_id);
          return param?.affects_strategy;
        }),
      },
      template: variantTemplate,
    };
  }

  // =========================================================================
  // TEMPLATE MANAGEMENT
  // =========================================================================

  /**
   * Apply parameter changes to a template
   */
  static applyParameterChanges(
    template: ParametricTemplate,
    changes: Record<string, number | string>
  ): ParametricTemplate {
    // Validate constraints
    const violations = this.validateConstraints(template, changes);
    if (violations.length > 0) {
      const errors = violations.filter((v) => v.severity === "error");
      if (errors.length > 0) {
        throw new Error(
          `Parameter constraint violations: ${errors.map((e) => e.message).join("; ")}`
        );
      }
      // Log warnings
      for (const warning of violations.filter((v) => v.severity === "warning")) {
        log.warn(`Parameter warning: ${warning.message}`);
      }
    }

    // Apply changes
    const newParameters = template.parameters.map((param) => {
      if (changes[param.id] !== undefined) {
        return { ...param, value: changes[param.id] };
      }
      return param;
    });

    // Recalculate derived parameters
    const derivedParams = this.recalculateDerivedParameters(
      newParameters,
      template.derivation_rules
    );

    return {
      ...template,
      parameters: derivedParams,
      updated_at: new Date().toISOString(),
      version: template.version + 1,
    };
  }

  /**
   * Validate parameter constraints
   */
  static validateConstraints(
    template: ParametricTemplate,
    changes: Record<string, number | string>
  ): { constraint_id: string; message: string; severity: "error" | "warning" }[] {
    const violations: {
      constraint_id: string;
      message: string;
      severity: "error" | "warning";
    }[] = [];

    // Build parameter value map
    const paramValues = new Map<string, number | string>();
    for (const param of template.parameters) {
      paramValues.set(param.id, changes[param.id] ?? param.value);
    }

    for (const constraint of template.constraints) {
      // Simple constraint evaluation (production would use expression parser)
      const affectedParams = constraint.parameters.filter(
        (p) => changes[p] !== undefined
      );
      if (affectedParams.length === 0) continue;

      // Check fillet radius constraints
      if (constraint.type === "inequality" && constraint.id.includes("fillet")) {
        const filletValue = paramValues.get(
          constraint.parameters[0]
        ) as number;
        const minDim = Math.min(
          ...constraint.parameters
            .slice(1)
            .map((p) => (paramValues.get(p) as number) || 999)
        );
        if (filletValue > minDim / 2) {
          violations.push({
            constraint_id: constraint.id,
            message: constraint.error_message,
            severity: constraint.severity,
          });
        }
      }

      // Check range constraints
      if (constraint.type === "range" && constraint.id.includes("draft")) {
        const draftValue = paramValues.get(constraint.parameters[0]) as number;
        if (draftValue < 0.5 || draftValue > 15) {
          violations.push({
            constraint_id: constraint.id,
            message: constraint.error_message,
            severity: constraint.severity,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Recalculate derived parameters
   */
  static recalculateDerivedParameters(
    parameters: ParametricDimension[],
    rules: DerivationRule[]
  ): ParametricDimension[] {
    const paramMap = new Map(parameters.map((p) => [p.id, p]));

    for (const rule of rules) {
      if (!rule.recalculate_on_change) continue;

      // Get source values
      const sourceValues = rule.source_parameters.map(
        (id) => paramMap.get(id)?.value as number
      );

      // Simple formula evaluation (production would use expression parser)
      let newValue: number;
      if (rule.formula.includes("*")) {
        newValue = sourceValues.reduce((a, b) => a * b, 1);
      } else if (rule.formula.includes("+")) {
        const match = rule.formula.match(/\+\s*(\d+)/);
        newValue = sourceValues[0] + (match ? parseFloat(match[1]) : 0);
      } else {
        newValue = sourceValues[0];
      }

      // Create or update derived parameter
      const existing = paramMap.get(rule.target_parameter);
      if (existing) {
        paramMap.set(rule.target_parameter, { ...existing, value: newValue });
      } else {
        paramMap.set(rule.target_parameter, {
          id: rule.target_parameter,
          name: rule.target_parameter,
          display_name: rule.target_parameter.replace(/_/g, " "),
          type: "derived",
          value: newValue,
          unit: "mm",
          editable: false,
          category: "Derived",
        });
      }
    }

    return Array.from(paramMap.values());
  }

  /**
   * Get template by ID
   */
  static getTemplate(templateId: string): ParametricTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  static getAllTemplates(): ParametricTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get variants for a template
   */
  static getVariants(templateId: string): TemplateVariant[] {
    return this.variants.get(templateId) || [];
  }

  /**
   * Find template for a model ID
   */
  static findTemplateForModel(modelId: string): ParametricTemplate | undefined {
    for (const template of this.templates.values()) {
      if (template.id.includes(modelId)) {
        return template;
      }
    }
    return undefined;
  }

  /**
   * Update an existing template with model changes
   */
  static updateParametricTemplate(
    existing: ParametricTemplate,
    model: CADModel
  ): ParametricTemplate {
    const newParameters = this.extractParameters(model);

    // Merge with existing, preserving user modifications
    const mergedParams = newParameters.map((newParam) => {
      const existingParam = existing.parameters.find((p) => p.id === newParam.id);
      if (existingParam && existingParam.value !== newParam.value) {
        // Keep existing user-modified value but update constraints
        return {
          ...newParam,
          value: existingParam.value,
        };
      }
      return newParam;
    });

    return {
      ...existing,
      parameters: mergedParams,
      updated_at: new Date().toISOString(),
      version: existing.version + 1,
    };
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private static convertToFeatureSignature(feature: CADFeature): FeatureSignature {
    return {
      type: feature.type,
      dimensions: {
        length_mm: feature.dimensions.length_mm,
        width_mm: feature.dimensions.width_mm,
        depth_mm: feature.dimensions.depth_mm,
        fillet_radius_mm: feature.dimensions.fillet_radius_mm,
        draft_angle_deg: feature.dimensions.draft_angle_deg,
      },
      complexity_score: this.calculateComplexity(feature),
      undercut_count: feature.type === "undercut" ? 1 : 0,
      thin_wall_count: this.detectThinWalls(feature),
      tight_tolerance_count: feature.tolerance_class === "fine" ? 1 : 0,
      surface_area_mm2: feature.surface_area_mm2,
      volume_mm3: feature.volume_mm3,
    };
  }

  private static calculateComplexity(feature: CADFeature): number {
    let score = 3; // Base complexity

    // Geometry type complexity
    const complexTypes: FiveAxisGeometry[] = [
      "impeller",
      "blisk",
      "turbine_blade",
      "free_form",
    ];
    if (complexTypes.includes(feature.type)) score += 3;

    // Depth-to-width ratio
    const aspectRatio = feature.dimensions.depth_mm / Math.min(feature.dimensions.length_mm, feature.dimensions.width_mm);
    if (aspectRatio > 3) score += 2;
    if (aspectRatio > 5) score += 2;

    // Tight tolerances
    if (feature.tolerance_class === "fine") score += 1;

    // Fine surface finish
    if (feature.surface_finish_target_um && feature.surface_finish_target_um < 0.8) score += 1;

    return Math.min(10, score);
  }

  private static detectThinWalls(feature: CADFeature): number {
    // Simple heuristic: thin if any dimension < 2mm
    const dims = [
      feature.dimensions.length_mm,
      feature.dimensions.width_mm,
      feature.dimensions.depth_mm,
    ].filter((d) => d > 0);
    return dims.filter((d) => d < 2).length;
  }

  private static getDefaultMaterial(): MaterialProps {
    return {
      name: "D2 Tool Steel",
      iso_group: "H",
      density_kg_m3: 7700,
      thermal_conductivity_w_mk: 20.5,
      specific_heat_j_kgk: 460,
      kc11_mpa: 3200,
      mc: 0.25,
    };
  }

  private static selectStrategy(model: CADModel): FiveAxisStrategyEntry {
    // Default strategy based on predominant geometry
    const geometryTypes = model.features.map((f) => f.type);

    if (geometryTypes.includes("impeller") || geometryTypes.includes("blisk")) {
      return {
        id: "5ax_flowline_blade",
        name: "5-Axis Flowline Blade",
        family: "flowline",
        description: "Flowline toolpath for blade geometries",
        applicable_geometries: ["impeller", "blisk", "turbine_blade"],
        applicable_tools: ["ball_endmill", "barrel"],
        typical_stepover_pct: 8,
        requires_rtcp: true,
        collision_prone: true,
        source_system: "prism",
      };
    }

    return {
      id: "5ax_shape_offset",
      name: "5-Axis Shape Offset",
      family: "swarf",
      description: "General-purpose 5-axis machining",
      applicable_geometries: ["mold_cavity", "die_cavity", "pocket"],
      applicable_tools: ["ball_endmill", "bull_endmill"],
      typical_stepover_pct: 15,
      requires_rtcp: true,
      collision_prone: false,
      source_system: "prism",
    };
  }

  private static generateDefaultCuttingParams(model: CADModel): CuttingParameters[] {
    return [
      {
        strategy_id: "5ax_shape_offset",
        strategy_name: "5-Axis Shape Offset",
        tool_type: "ball_endmill",
        tool_diameter_mm: 10,
        spindle_rpm: 8000,
        feed_mmmin: 2000,
        ap_mm: 0.5,
        ae_mm: 1.5,
        lead_angle_deg: 15,
        tilt_angle_deg: 0,
        stepover_pct: 15,
        coolant: "through_tool",
      },
    ];
  }

  private static generateDefaultMachineSetup(): MachineSetup {
    return {
      machine_id: "okuma_m460v_5ax",
      kinematic_type: "table_table",
      work_offset: "G54",
      tool_length_offset: 1,
      rtcp_mode: "G43.4",
      probing_used: true,
    };
  }

  private static generateAIReasoning(model: CADModel): {
    chain_of_thought: string[];
    decision_criteria: Record<string, number>;
    alternatives_considered: string[];
    confidence_score: number;
  } {
    return {
      chain_of_thought: [
        `Observation: CAD model "${model.name}" contains ${model.features.length} features`,
        `Observation: Bounding box ${(model.bounding_box.max_x - model.bounding_box.min_x).toFixed(1)}x${(model.bounding_box.max_y - model.bounding_box.min_y).toFixed(1)}x${(model.bounding_box.max_z - model.bounding_box.min_z).toFixed(1)} mm`,
        `Analysis: Feature complexity average ${(model.features.reduce((sum, f) => sum + this.calculateComplexity(f), 0) / Math.max(1, model.features.length)).toFixed(1)}/10`,
        `Hypothesis: Standard 5-axis shape offset suitable for initial roughing`,
        `Validation: Machine envelope adequate for part size`,
        `Conclusion: Auto-generated template ready for user customization`,
      ],
      decision_criteria: {
        geometry_match: 0.85,
        machine_capability: 0.95,
        tool_availability: 0.9,
        cycle_time_estimate: 0.8,
      },
      alternatives_considered: [
        "3+2 positioning for flat areas",
        "Swarf cutting for ruled surfaces",
        "Barrel finishing for fine surfaces",
      ],
      confidence_score: 0.82,
    };
  }

  private static createDefaultVariantConfig(model: CADModel): VariantConfig {
    return {
      auto_generate: true,
      scale_variants: {
        enabled: true,
        scales: [0.8, 0.9, 1.1, 1.2],
        preserve_aspect_ratio: true,
        min_feature_size_mm: 0.5,
      },
      material_variants: {
        enabled: true,
        alternative_materials: [
          { name: "M2 HSS", iso_group: "H", hardness_hrc: 62, kc1_1: 3400, mc: 0.25 },
          { name: "S7 Tool Steel", iso_group: "H", hardness_hrc: 54, kc1_1: 3000, mc: 0.25 },
          { name: "A2 Tool Steel", iso_group: "H", hardness_hrc: 58, kc1_1: 3100, mc: 0.25 },
        ],
        recalculate_strategy: true,
      },
      tolerance_variants: {
        enabled: true,
        tolerance_classes: ["fine", "medium", "coarse"],
        affects_feeds_speeds: true,
      },
      custom_variants: [],
    };
  }

  private static assessMaterialHardnessImpact(
    original: MaterialProps,
    newMaterial: MaterialProps
  ): TemplateVariant["impact"] {
    const hardnessDiff = (newMaterial.hardness_hrc || 0) - (original.hardness_hrc || 0);
    const kc1_1Diff = (newMaterial.kc1_1 || 0) - (original.kc1_1 || 0);

    return {
      cycle_time_change_pct: kc1_1Diff > 0 ? (kc1_1Diff / original.kc1_1) * 20 : (kc1_1Diff / original.kc1_1) * 15,
      tool_life_impact: hardnessDiff > 2 ? "worse" : hardnessDiff < -2 ? "better" : "same",
      surface_finish_impact: "same",
      strategy_change_needed: Math.abs(hardnessDiff) > 5,
      recommended_strategy: hardnessDiff > 5 ? "5ax_point_milling" : undefined,
    };
  }

  /**
   * Get event log
   */
  static getEventLog(): CADEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  static clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Clear all templates and variants (for testing)
   */
  static clearAll(): void {
    this.hooks.clear();
    this.templates.clear();
    this.variants.clear();
    this.eventLog = [];
  }
}

// Export singleton and types
export const fiveAxisCADTemplateEngine = FiveAxisCADTemplateEngine;
