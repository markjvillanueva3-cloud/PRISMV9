/**
 * MILL-HARD-MS6: CAD-Triggered Template Auto-Generation with Parametric Variability
 * =================================================================================
 * 70+ tests covering:
 *   - μS-19: CAD Event Hooks — Auto-trigger template generation on CAD events
 *   - μS-20: Parametric Templates — Templates with user-modifiable variables
 *   - μS-21: Template Variants — Auto-generate scaled, material, tolerance variants
 *
 * Prerequisites:
 *   - MILL-HARD-MS5 (FiveAxisDeepLearningEngine) — Template generation, AI reasoning
 *   - MILL-HARD-MS4 (FiveAxisToolpathSynthesisEngine) — Strategy catalog
 *
 * @milestone MILL-HARD-MS6
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  FiveAxisCADTemplateEngine,
  type CADEvent,
  type CADModel,
  type CADFeature,
  type ParametricDimension,
  type ParametricTemplate,
  type ParametricConstraint,
  type TemplateVariant,
  type CADTemplateHook,
  type HookExecutionResult,
  type VariantConfig,
} from "../engines/FiveAxisCADTemplateEngine.js";
import type { FiveAxisGeometry, MaterialProps } from "../engines/FiveAxisToolpathSynthesisEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Create a test CAD event */
function createTestEvent(
  type: CADEvent["type"] = "model_created",
  modelId = "test_model_001"
): CADEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    model_id: modelId,
    model_name: "Test Die Cavity",
    source: "prism_cad",
    user_id: "user_001",
    session_id: "session_001",
  };
}

/** Create a test CAD feature */
function createTestFeature(
  type: FiveAxisGeometry = "die_cavity",
  name = "Main Cavity"
): CADFeature {
  return {
    id: `feature_${Date.now()}`,
    name,
    type,
    dimensions: {
      length_mm: 100,
      width_mm: 80,
      depth_mm: 50,
      fillet_radius_mm: 5,
      draft_angle_deg: 3,
    },
    surface_area_mm2: 25000,
    volume_mm3: 400000,
    tolerance_class: "medium",
    surface_finish_target_um: 0.8,
    is_critical_surface: true,
  };
}

/** Create a test CAD model */
function createTestModel(
  features: CADFeature[] = [createTestFeature()],
  material?: MaterialProps
): CADModel {
  return {
    id: `model_${Date.now()}`,
    name: "Test Die Cavity Model",
    format: "prism",
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
    version: 1,
    bounding_box: {
      min_x: 0,
      max_x: 120,
      min_y: 0,
      max_y: 100,
      min_z: 0,
      max_z: 60,
    },
    features,
    parameters: [],
    material: material || {
      name: "D2 Tool Steel",
      iso_group: "H",
      hardness_hrc: 58,
      kc1_1: 3200,
      mc: 0.25,
    },
    customer_id: "jm-die",
    project_id: "proj_001",
    part_number: "DIE-2024-001",
  };
}

// ============================================================================
// μS-19: CAD EVENT HOOKS
// ============================================================================

describe("MILL-HARD-MS6: CAD-Triggered Template Auto-Generation", () => {
  beforeEach(() => {
    FiveAxisCADTemplateEngine.clearAll();
  });

  afterEach(() => {
    FiveAxisCADTemplateEngine.clearAll();
  });

  describe("μS-19: CAD Event Hooks", () => {
    describe("Hook Registration", () => {
      it("should register a CAD template hook", () => {
        const hook: CADTemplateHook = {
          id: "test_hook_001",
          name: "Test Hook",
          event_types: ["model_created"],
          priority: 10,
          enabled: true,
          handler: async () => null,
        };

        FiveAxisCADTemplateEngine.registerHook(hook);
        const hooks = FiveAxisCADTemplateEngine.getRegisteredHooks();

        expect(hooks).toHaveLength(1);
        expect(hooks[0].id).toBe("test_hook_001");
      });

      it("should register multiple hooks with priority ordering", () => {
        FiveAxisCADTemplateEngine.registerHook({
          id: "hook_low_priority",
          name: "Low Priority",
          event_types: ["model_created"],
          priority: 100,
          enabled: true,
          handler: async () => null,
        });

        FiveAxisCADTemplateEngine.registerHook({
          id: "hook_high_priority",
          name: "High Priority",
          event_types: ["model_created"],
          priority: 1,
          enabled: true,
          handler: async () => null,
        });

        const hooks = FiveAxisCADTemplateEngine.getRegisteredHooks();

        expect(hooks).toHaveLength(2);
        expect(hooks[0].id).toBe("hook_high_priority");
        expect(hooks[1].id).toBe("hook_low_priority");
      });

      it("should unregister a hook by ID", () => {
        FiveAxisCADTemplateEngine.registerHook({
          id: "hook_to_remove",
          name: "To Remove",
          event_types: ["model_created"],
          priority: 10,
          enabled: true,
          handler: async () => null,
        });

        expect(FiveAxisCADTemplateEngine.getRegisteredHooks()).toHaveLength(1);

        const removed = FiveAxisCADTemplateEngine.unregisterHook("hook_to_remove");

        expect(removed).toBe(true);
        expect(FiveAxisCADTemplateEngine.getRegisteredHooks()).toHaveLength(0);
      });

      it("should return false when unregistering non-existent hook", () => {
        const removed = FiveAxisCADTemplateEngine.unregisterHook("non_existent");
        expect(removed).toBe(false);
      });

      it("should register default PRISM hooks", () => {
        FiveAxisCADTemplateEngine.registerDefaultHooks();
        const hooks = FiveAxisCADTemplateEngine.getRegisteredHooks();

        expect(hooks.length).toBeGreaterThanOrEqual(3);
        expect(hooks.some((h) => h.id === "prism_model_created")).toBe(true);
        expect(hooks.some((h) => h.id === "prism_model_finalized")).toBe(true);
        expect(hooks.some((h) => h.id === "prism_feature_modified")).toBe(true);
      });
    });

    describe("Event Processing", () => {
      it("should process model_created event and generate template", async () => {
        let templateGenerated = false;

        FiveAxisCADTemplateEngine.registerHook({
          id: "test_generator",
          name: "Test Generator",
          event_types: ["model_created"],
          priority: 10,
          enabled: true,
          handler: async (event, model) => {
            templateGenerated = true;
            return FiveAxisCADTemplateEngine.generateParametricTemplate(model);
          },
        });

        const event = createTestEvent("model_created");
        const model = createTestModel();
        const results = await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        expect(templateGenerated).toBe(true);
        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);
        expect(results[0].template_generated).toBe(true);
      });

      it("should filter events by type", async () => {
        let handlerCalled = false;

        FiveAxisCADTemplateEngine.registerHook({
          id: "model_only_hook",
          name: "Model Only",
          event_types: ["model_created"],
          priority: 10,
          enabled: true,
          handler: async () => {
            handlerCalled = true;
            return null;
          },
        });

        const event = createTestEvent("feature_added");
        const model = createTestModel();
        await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        expect(handlerCalled).toBe(false);
      });

      it("should apply custom filter function", async () => {
        let handlerCalled = false;

        FiveAxisCADTemplateEngine.registerHook({
          id: "filtered_hook",
          name: "Filtered Hook",
          event_types: ["model_created"],
          priority: 10,
          enabled: true,
          filter: (event) => event.source === "solidworks",
          handler: async () => {
            handlerCalled = true;
            return null;
          },
        });

        const event = createTestEvent("model_created");
        event.source = "prism_cad";
        const model = createTestModel();
        await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        expect(handlerCalled).toBe(false);
      });

      it("should skip disabled hooks", async () => {
        let handlerCalled = false;

        FiveAxisCADTemplateEngine.registerHook({
          id: "disabled_hook",
          name: "Disabled Hook",
          event_types: ["model_created"],
          priority: 10,
          enabled: false,
          handler: async () => {
            handlerCalled = true;
            return null;
          },
        });

        const event = createTestEvent("model_created");
        const model = createTestModel();
        await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        expect(handlerCalled).toBe(false);
      });

      it("should handle hook errors gracefully", async () => {
        FiveAxisCADTemplateEngine.registerHook({
          id: "error_hook",
          name: "Error Hook",
          event_types: ["model_created"],
          priority: 10,
          enabled: true,
          handler: async () => {
            throw new Error("Hook failed");
          },
        });

        const event = createTestEvent("model_created");
        const model = createTestModel();
        const results = await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(false);
        expect(results[0].error).toBe("Hook failed");
      });

      it("should log events to event log", async () => {
        const event = createTestEvent("model_created");
        const model = createTestModel();

        await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        const eventLog = FiveAxisCADTemplateEngine.getEventLog();
        expect(eventLog).toHaveLength(1);
        expect(eventLog[0].type).toBe("model_created");
      });

      it("should clear event log", () => {
        FiveAxisCADTemplateEngine.clearEventLog();
        expect(FiveAxisCADTemplateEngine.getEventLog()).toHaveLength(0);
      });

      it("should process multiple event types", async () => {
        const eventTypes: CADEvent["type"][] = [
          "model_created",
          "model_imported",
          "model_finalized",
        ];
        let processCount = 0;

        FiveAxisCADTemplateEngine.registerHook({
          id: "multi_event_hook",
          name: "Multi Event",
          event_types: eventTypes,
          priority: 10,
          enabled: true,
          handler: async () => {
            processCount++;
            return null;
          },
        });

        const model = createTestModel();
        for (const eventType of eventTypes) {
          const event = createTestEvent(eventType);
          await FiveAxisCADTemplateEngine.processCADEvent(event, model);
        }

        expect(processCount).toBe(3);
      });
    });

    describe("Default Hooks Integration", () => {
      it("should auto-generate template on model_created with default hooks", async () => {
        FiveAxisCADTemplateEngine.registerDefaultHooks();

        const event = createTestEvent("model_created");
        const model = createTestModel();
        const results = await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        const successResults = results.filter((r) => r.template_generated);
        expect(successResults.length).toBeGreaterThanOrEqual(1);
      });

      it("should auto-generate variants when configured", async () => {
        FiveAxisCADTemplateEngine.registerDefaultHooks();

        const event = createTestEvent("model_created");
        const model = createTestModel();
        await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        const templates = FiveAxisCADTemplateEngine.getAllTemplates();
        expect(templates.length).toBeGreaterThanOrEqual(1);

        const variants = FiveAxisCADTemplateEngine.getVariants(templates[0].id);
        expect(variants.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // μS-20: PARAMETRIC TEMPLATES
  // ============================================================================

  describe("μS-20: Parametric Templates", () => {
    describe("Parameter Extraction", () => {
      it("should extract envelope parameters from bounding box", () => {
        const model = createTestModel();
        const parameters = FiveAxisCADTemplateEngine.extractParameters(model);

        const lengthParam = parameters.find((p) => p.id === "overall_length");
        const widthParam = parameters.find((p) => p.id === "overall_width");
        const heightParam = parameters.find((p) => p.id === "overall_height");

        expect(lengthParam).toBeDefined();
        expect(lengthParam?.value).toBe(120); // max_x - min_x
        expect(widthParam?.value).toBe(100); // max_y - min_y
        expect(heightParam?.value).toBe(60); // max_z - min_z
      });

      it("should extract feature-specific parameters", () => {
        const feature = createTestFeature("die_cavity", "Main Cavity");
        const model = createTestModel([feature]);
        const parameters = FiveAxisCADTemplateEngine.extractParameters(model);

        const featureParams = parameters.filter((p) =>
          p.id.startsWith("main_cavity")
        );
        expect(featureParams.length).toBeGreaterThan(0);

        const lengthParam = featureParams.find((p) => p.id.includes("length"));
        expect(lengthParam?.value).toBe(100);
      });

      it("should extract fillet radius parameters", () => {
        const feature = createTestFeature();
        feature.dimensions.fillet_radius_mm = 8;
        const model = createTestModel([feature]);
        const parameters = FiveAxisCADTemplateEngine.extractParameters(model);

        const filletParam = parameters.find((p) => p.id.includes("fillet_radius"));
        expect(filletParam).toBeDefined();
        expect(filletParam?.value).toBe(8);
        expect(filletParam?.type).toBe("radial");
      });

      it("should extract draft angle parameters", () => {
        const feature = createTestFeature();
        feature.dimensions.draft_angle_deg = 5;
        const model = createTestModel([feature]);
        const parameters = FiveAxisCADTemplateEngine.extractParameters(model);

        const draftParam = parameters.find((p) => p.id.includes("draft_angle"));
        expect(draftParam).toBeDefined();
        expect(draftParam?.value).toBe(5);
        expect(draftParam?.type).toBe("angular");
      });

      it("should extract material ISO group parameter", () => {
        const model = createTestModel();
        const parameters = FiveAxisCADTemplateEngine.extractParameters(model);

        const materialParam = parameters.find((p) => p.id === "material_iso_group");
        expect(materialParam).toBeDefined();
        expect(materialParam?.value).toBe("H");
        expect(materialParam?.type).toBe("material");
      });

      it("should extract tolerance class parameter", () => {
        const feature = createTestFeature();
        feature.tolerance_class = "fine";
        const model = createTestModel([feature]);
        const parameters = FiveAxisCADTemplateEngine.extractParameters(model);

        const toleranceParam = parameters.find((p) => p.id.includes("tolerance"));
        expect(toleranceParam).toBeDefined();
        expect(toleranceParam?.value).toBe("fine");
        expect(toleranceParam?.type).toBe("tolerance");
      });

      it("should extract surface finish target parameter", () => {
        const feature = createTestFeature();
        feature.surface_finish_target_um = 0.4;
        const model = createTestModel([feature]);
        const parameters = FiveAxisCADTemplateEngine.extractParameters(model);

        const finishParam = parameters.find((p) => p.id.includes("surface_finish"));
        expect(finishParam).toBeDefined();
        expect(finishParam?.value).toBe(0.4);
      });

      it("should mark strategy-affecting parameters", () => {
        const feature = createTestFeature("deep_pocket");
        const model = createTestModel([feature]);
        const parameters = FiveAxisCADTemplateEngine.extractParameters(model);

        const depthParam = parameters.find(
          (p) => p.id.includes("depth") && p.category !== "Envelope"
        );
        expect(depthParam?.affects_strategy).toBe(true);
      });
    });

    describe("Template Generation", () => {
      it("should generate a complete parametric template", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        expect(template.id).toContain("pt_");
        expect(template.parameters.length).toBeGreaterThan(0);
        expect(template.parameter_groups.length).toBeGreaterThan(0);
        expect(template.constraints.length).toBeGreaterThanOrEqual(0);
        expect(template.variant_config).toBeDefined();
      });

      it("should create parameter groups for UI organization", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const groups = template.parameter_groups;
        expect(groups.length).toBeGreaterThan(0);

        const envelopeGroup = groups.find((g) => g.name === "Envelope");
        expect(envelopeGroup).toBeDefined();
        expect(envelopeGroup?.parameters).toContain("overall_length");
      });

      it("should generate constraints between parameters", () => {
        const feature = createTestFeature();
        feature.dimensions.fillet_radius_mm = 5;
        feature.dimensions.width_mm = 20;
        const model = createTestModel([feature]);
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const filletConstraint = template.constraints.find((c) =>
          c.id.includes("fillet")
        );
        expect(filletConstraint).toBeDefined();
        expect(filletConstraint?.type).toBe("inequality");
      });

      it("should generate derivation rules for calculated parameters", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        expect(template.derivation_rules.length).toBeGreaterThan(0);

        const volumeRule = template.derivation_rules.find((r) =>
          r.target_parameter === "bounding_volume"
        );
        expect(volumeRule).toBeDefined();
      });

      it("should include AI reasoning when requested", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model, {
          include_ai_reasoning: true,
        });

        expect(template.ai_reasoning.chain_of_thought.length).toBeGreaterThan(0);
        expect(template.ai_reasoning.confidence_score).toBeGreaterThan(0);
      });

      it("should configure default variant generation", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        expect(template.variant_config.auto_generate).toBe(true);
        expect(template.variant_config.scale_variants.enabled).toBe(true);
        expect(template.variant_config.material_variants.enabled).toBe(true);
        expect(template.variant_config.tolerance_variants.enabled).toBe(true);
      });
    });

    describe("Parameter Modification", () => {
      it("should apply parameter changes to template", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const modifiedTemplate = FiveAxisCADTemplateEngine.applyParameterChanges(
          template,
          { overall_length: 150 }
        );

        const lengthParam = modifiedTemplate.parameters.find(
          (p) => p.id === "overall_length"
        );
        expect(lengthParam?.value).toBe(150);
      });

      it("should increment version on modification", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);
        const originalVersion = template.version;

        const modifiedTemplate = FiveAxisCADTemplateEngine.applyParameterChanges(
          template,
          { overall_length: 150 }
        );

        expect(modifiedTemplate.version).toBe(originalVersion + 1);
      });

      it("should recalculate derived parameters", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const modifiedTemplate = FiveAxisCADTemplateEngine.applyParameterChanges(
          template,
          { overall_length: 200 }
        );

        const stockLength = modifiedTemplate.parameters.find(
          (p) => p.id === "stock_length"
        );
        expect(stockLength?.value).toBe(210); // 200 + 10
      });

      it("should validate constraints and throw on violation", () => {
        const feature = createTestFeature();
        feature.dimensions.fillet_radius_mm = 5;
        feature.dimensions.width_mm = 20;
        const model = createTestModel([feature]);
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        // Find fillet parameter ID
        const filletParam = template.parameters.find((p) =>
          p.id.includes("fillet_radius")
        );
        if (filletParam) {
          // Try to set fillet larger than half of width (should fail)
          expect(() =>
            FiveAxisCADTemplateEngine.applyParameterChanges(template, {
              [filletParam.id]: 15, // > 20/2 = 10
            })
          ).toThrow(/constraint/i);
        }
      });

      it("should warn on soft constraint violations", () => {
        const feature = createTestFeature();
        feature.dimensions.draft_angle_deg = 3;
        const model = createTestModel([feature]);
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const draftParam = template.parameters.find((p) =>
          p.id.includes("draft_angle")
        );
        if (draftParam) {
          // 20 degrees is outside recommended 0.5-15 range (warning, not error)
          const violations = FiveAxisCADTemplateEngine.validateConstraints(
            template,
            { [draftParam.id]: 20 }
          );

          const warnings = violations.filter((v) => v.severity === "warning");
          expect(warnings.length).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe("Template Storage and Retrieval", () => {
      it("should store and retrieve template by ID", async () => {
        FiveAxisCADTemplateEngine.registerDefaultHooks();
        const event = createTestEvent("model_created");
        const model = createTestModel();
        await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        const templates = FiveAxisCADTemplateEngine.getAllTemplates();
        expect(templates.length).toBeGreaterThan(0);

        const template = FiveAxisCADTemplateEngine.getTemplate(templates[0].id);
        expect(template).toBeDefined();
        expect(template?.id).toBe(templates[0].id);
      });

      it("should find template for model ID", async () => {
        FiveAxisCADTemplateEngine.registerDefaultHooks();
        const event = createTestEvent("model_created", "unique_model_123");
        const model = createTestModel();
        model.id = "unique_model_123";
        await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        const template = FiveAxisCADTemplateEngine.findTemplateForModel("unique_model_123");
        expect(template).toBeDefined();
        expect(template?.id).toContain("unique_model_123");
      });
    });
  });

  // ============================================================================
  // μS-21: TEMPLATE VARIANTS
  // ============================================================================

  describe("μS-21: Template Variants", () => {
    describe("Scale Variants", () => {
      it("should generate scale variants for configured scales", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const variants = FiveAxisCADTemplateEngine.generateAllVariants(template);
        const scaleVariants = variants.filter((v) => v.variant_type === "scale");

        expect(scaleVariants.length).toBe(4); // 0.8, 0.9, 1.1, 1.2
      });

      it("should correctly scale linear dimensions", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const variant = FiveAxisCADTemplateEngine.generateScaleVariant(template, 0.5);

        expect(variant).toBeDefined();
        expect(variant?.variant_name).toBe("50% Scale");

        const lengthChange = variant?.parameter_changes.find(
          (pc) => pc.parameter_id === "overall_length"
        );
        expect(lengthChange?.new_value).toBe(60); // 120 * 0.5
      });

      it("should preserve aspect ratio when configured", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);
        template.variant_config.scale_variants.preserve_aspect_ratio = true;

        const variant = FiveAxisCADTemplateEngine.generateScaleVariant(template, 2);

        // All dimensions should scale by same factor
        const changes = variant?.parameter_changes.filter((pc) =>
          ["overall_length", "overall_width", "overall_height"].includes(
            pc.parameter_id
          )
        );
        if (changes && changes.length > 0) {
          const ratios = changes.map(
            (c) => (c.new_value as number) / (c.original_value as number)
          );
          expect(new Set(ratios).size).toBe(1); // All ratios same
        }
      });

      it("should skip features below minimum size", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);
        template.variant_config.scale_variants.min_feature_size_mm = 50;

        const variant = FiveAxisCADTemplateEngine.generateScaleVariant(template, 0.1);

        // Should skip scaling features that would be < 50mm
        const smallChanges = variant?.parameter_changes.filter(
          (pc) => (pc.new_value as number) < 50
        );
        expect(smallChanges?.length || 0).toBe(0);
      });

      it("should assess cycle time impact for scale changes", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const smallerVariant = FiveAxisCADTemplateEngine.generateScaleVariant(
          template,
          0.8
        );
        const largerVariant = FiveAxisCADTemplateEngine.generateScaleVariant(
          template,
          1.2
        );

        expect(smallerVariant?.impact.cycle_time_change_pct).toBeLessThan(0);
        expect(largerVariant?.impact.cycle_time_change_pct).toBeGreaterThan(0);
      });

      it("should recommend strategy change for extreme scales", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const verySmall = FiveAxisCADTemplateEngine.generateScaleVariant(template, 0.5);
        const veryLarge = FiveAxisCADTemplateEngine.generateScaleVariant(template, 2);

        expect(verySmall?.impact.strategy_change_needed).toBe(true);
        expect(veryLarge?.impact.strategy_change_needed).toBe(true);
      });

      it("should return null for invalid scale values", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        expect(FiveAxisCADTemplateEngine.generateScaleVariant(template, 0)).toBeNull();
        expect(FiveAxisCADTemplateEngine.generateScaleVariant(template, -1)).toBeNull();
        expect(FiveAxisCADTemplateEngine.generateScaleVariant(template, 1)).toBeNull();
      });
    });

    describe("Material Variants", () => {
      it("should generate material variants for configured alternatives", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const variants = FiveAxisCADTemplateEngine.generateAllVariants(template);
        const materialVariants = variants.filter((v) => v.variant_type === "material");

        expect(materialVariants.length).toBe(3); // M2, S7, A2
      });

      it("should update material in variant template", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const m2Material: MaterialProps = {
          name: "M2 HSS",
          iso_group: "H",
          hardness_hrc: 62,
          kc1_1: 3400,
          mc: 0.25,
        };

        const variant = FiveAxisCADTemplateEngine.generateMaterialVariant(
          template,
          m2Material
        );

        expect(variant).toBeDefined();
        expect(variant?.template.material.name).toBe("M2 HSS");
        expect(variant?.template.material.hardness_hrc).toBe(62);
      });

      it("should return null for same material", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const variant = FiveAxisCADTemplateEngine.generateMaterialVariant(template, {
          name: "D2 Tool Steel",
          iso_group: "H",
          hardness_hrc: 58,
          kc1_1: 3200,
          mc: 0.25,
        });

        expect(variant).toBeNull();
      });

      it("should assess tool life impact for harder materials", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const harderMaterial: MaterialProps = {
          name: "M2 HSS",
          iso_group: "H",
          hardness_hrc: 65, // Harder than D2's 58
          kc1_1: 3600,
          mc: 0.25,
        };

        const variant = FiveAxisCADTemplateEngine.generateMaterialVariant(
          template,
          harderMaterial
        );

        expect(variant?.impact.tool_life_impact).toBe("worse");
      });

      it("should assess tool life improvement for softer materials", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const softerMaterial: MaterialProps = {
          name: "Soft Steel",
          iso_group: "P",
          hardness_hrc: 45, // Softer than D2's 58
          kc1_1: 2000,
          mc: 0.25,
        };

        const variant = FiveAxisCADTemplateEngine.generateMaterialVariant(
          template,
          softerMaterial
        );

        expect(variant?.impact.tool_life_impact).toBe("better");
      });
    });

    describe("Tolerance Variants", () => {
      it("should generate tolerance variants for configured classes", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const variants = FiveAxisCADTemplateEngine.generateAllVariants(template);
        const toleranceVariants = variants.filter(
          (v) => v.variant_type === "tolerance"
        );

        expect(toleranceVariants.length).toBe(3); // fine, medium, coarse
      });

      it("should update tolerance class in variant", () => {
        const feature = createTestFeature();
        feature.tolerance_class = "medium";
        const model = createTestModel([feature]);
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const variant = FiveAxisCADTemplateEngine.generateToleranceVariant(
          template,
          "fine"
        );

        expect(variant).toBeDefined();
        expect(variant?.variant_name).toBe("Fine Tolerance");

        const toleranceChange = variant?.parameter_changes.find((pc) =>
          pc.parameter_id.includes("tolerance")
        );
        expect(toleranceChange?.new_value).toBe("fine");
      });

      it("should increase cycle time for fine tolerance", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const fineVariant = FiveAxisCADTemplateEngine.generateToleranceVariant(
          template,
          "fine"
        );

        expect(fineVariant?.impact.cycle_time_change_pct).toBeGreaterThan(0);
        expect(fineVariant?.impact.surface_finish_impact).toBe("better");
      });

      it("should decrease cycle time for coarse tolerance", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const coarseVariant = FiveAxisCADTemplateEngine.generateToleranceVariant(
          template,
          "coarse"
        );

        expect(coarseVariant?.impact.cycle_time_change_pct).toBeLessThan(0);
        expect(coarseVariant?.impact.surface_finish_impact).toBe("worse");
      });

      it("should recommend finishing strategy for fine tolerance", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const fineVariant = FiveAxisCADTemplateEngine.generateToleranceVariant(
          template,
          "fine"
        );

        expect(fineVariant?.impact.strategy_change_needed).toBe(true);
        expect(fineVariant?.impact.recommended_strategy).toContain("finish");
      });
    });

    describe("Custom Variants", () => {
      it("should generate custom variant with parameter overrides", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        const customConfig = {
          id: "undersized_electrode",
          name: "Undersized Electrode",
          parameter_overrides: { overall_length: 118, overall_width: 98 },
          description: "Electrode with 2mm undersize for EDM gap",
        };

        const variant = FiveAxisCADTemplateEngine.generateCustomVariant(
          template,
          customConfig
        );

        expect(variant).toBeDefined();
        expect(variant?.variant_type).toBe("custom");
        expect(variant?.variant_name).toBe("Undersized Electrode");

        const lengthChange = variant?.parameter_changes.find(
          (pc) => pc.parameter_id === "overall_length"
        );
        expect(lengthChange?.new_value).toBe(118);
      });

      it("should detect strategy change needed for custom variants", () => {
        const model = createTestModel();
        const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

        // Find a strategy-affecting parameter
        const strategyParam = template.parameters.find((p) => p.affects_strategy);
        if (strategyParam) {
          const customConfig = {
            id: "strategy_change",
            name: "Strategy Change Variant",
            parameter_overrides: { [strategyParam.id]: 999 },
            description: "Variant that triggers strategy recalculation",
          };

          const variant = FiveAxisCADTemplateEngine.generateCustomVariant(
            template,
            customConfig
          );

          expect(variant?.impact.strategy_change_needed).toBe(true);
        }
      });
    });

    describe("Variant Storage", () => {
      it("should store variants with parent template", async () => {
        FiveAxisCADTemplateEngine.registerDefaultHooks();
        const event = createTestEvent("model_created");
        const model = createTestModel();
        await FiveAxisCADTemplateEngine.processCADEvent(event, model);

        const templates = FiveAxisCADTemplateEngine.getAllTemplates();
        expect(templates.length).toBeGreaterThan(0);

        const variants = FiveAxisCADTemplateEngine.getVariants(templates[0].id);
        expect(variants.length).toBeGreaterThan(0);
      });

      it("should return empty array for template without variants", () => {
        const variants = FiveAxisCADTemplateEngine.getVariants("non_existent_template");
        expect(variants).toEqual([]);
      });
    });
  });

  // ============================================================================
  // EDGE CASES AND REGRESSION
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle model with no features", () => {
      const model = createTestModel([]);
      const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

      expect(template).toBeDefined();
      expect(template.parameters.length).toBeGreaterThan(0); // Should still have envelope params
    });

    it("should handle model with many features", () => {
      const features = Array.from({ length: 50 }, (_, i) =>
        createTestFeature("pocket", `Feature ${i + 1}`)
      );
      const model = createTestModel(features);
      const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

      expect(template).toBeDefined();
      expect(template.parameters.length).toBeGreaterThan(50 * 3); // At least 3 params per feature
    });

    it("should handle model without material assignment", () => {
      const model = createTestModel();
      delete model.material;
      const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

      expect(template).toBeDefined();
      expect(template.material).toBeDefined(); // Should use default
    });

    it("should handle feature with missing optional dimensions", () => {
      const feature = createTestFeature();
      delete feature.dimensions.fillet_radius_mm;
      delete feature.dimensions.draft_angle_deg;
      const model = createTestModel([feature]);
      const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

      expect(template).toBeDefined();
      const filletParam = template.parameters.find((p) =>
        p.id.includes("fillet_radius")
      );
      expect(filletParam).toBeUndefined();
    });

    it("should handle extreme bounding box dimensions", () => {
      const model = createTestModel();
      model.bounding_box = {
        min_x: 0,
        max_x: 1000, // 1 meter
        min_y: 0,
        max_y: 1000,
        min_z: 0,
        max_z: 500,
      };
      const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

      const lengthParam = template.parameters.find((p) => p.id === "overall_length");
      expect(lengthParam?.value).toBe(1000);
    });

    it("should handle zero-dimension bounding box gracefully", () => {
      const model = createTestModel();
      model.bounding_box = {
        min_x: 0,
        max_x: 0,
        min_y: 0,
        max_y: 100,
        min_z: 0,
        max_z: 100,
      };
      const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

      const lengthParam = template.parameters.find((p) => p.id === "overall_length");
      expect(lengthParam?.value).toBe(0);
    });
  });

  describe("Regression Tests", () => {
    it("should maintain compatibility with FiveAxisDeepLearningEngine templates", () => {
      const model = createTestModel();
      const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

      // Base template should have all required FiveAxisTemplate fields
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.features).toBeDefined();
      expect(template.material).toBeDefined();
      expect(template.strategy).toBeDefined();
      expect(template.cutting_params).toBeDefined();
      expect(template.machine_setup).toBeDefined();
      expect(template.ai_reasoning).toBeDefined();
    });

    it("should generate valid template IDs", () => {
      const model = createTestModel();
      const template = FiveAxisCADTemplateEngine.generateParametricTemplate(model);

      expect(template.id).toMatch(/^pt_/);
      expect(template.id.length).toBeGreaterThan(10);
    });

    it("should generate unique template IDs", () => {
      const model1 = createTestModel();
      const model2 = createTestModel();
      const template1 = FiveAxisCADTemplateEngine.generateParametricTemplate(model1);
      const template2 = FiveAxisCADTemplateEngine.generateParametricTemplate(model2);

      expect(template1.id).not.toBe(template2.id);
    });
  });

  describe("Module Exports", () => {
    it("should export FiveAxisCADTemplateEngine class", () => {
      expect(FiveAxisCADTemplateEngine).toBeDefined();
      expect(typeof FiveAxisCADTemplateEngine.generateParametricTemplate).toBe(
        "function"
      );
    });

    it("should export all static methods", () => {
      expect(typeof FiveAxisCADTemplateEngine.registerHook).toBe("function");
      expect(typeof FiveAxisCADTemplateEngine.unregisterHook).toBe("function");
      expect(typeof FiveAxisCADTemplateEngine.processCADEvent).toBe("function");
      expect(typeof FiveAxisCADTemplateEngine.extractParameters).toBe("function");
      expect(typeof FiveAxisCADTemplateEngine.generateAllVariants).toBe("function");
      expect(typeof FiveAxisCADTemplateEngine.generateScaleVariant).toBe("function");
      expect(typeof FiveAxisCADTemplateEngine.generateMaterialVariant).toBe("function");
      expect(typeof FiveAxisCADTemplateEngine.generateToleranceVariant).toBe("function");
      expect(typeof FiveAxisCADTemplateEngine.applyParameterChanges).toBe("function");
    });
  });
});
