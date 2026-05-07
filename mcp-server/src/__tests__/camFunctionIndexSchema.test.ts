/**
 * CAM Function Index Schema Tests
 * ================================
 * Tests for hierarchical CAM UI function/parameter indexing schema.
 */

import { describe, it, expect } from "vitest";
import {
  CAMValueTypeEnum,
  CAMUnitEnum,
  CAMConstraintSchema,
  CAMValueSchema,
  CAMParameterSchema,
  CAMDialogSchema,
  CAMMenuSchema,
  CAMModuleSchema,
  CAMSystemSchema,
  CAMFunctionIndexSchema,
  OperationClassEnum,
  PhysicsLinkSchema,
  TribalTipSchema,
  AIActionSchema,
  createEmptyCAMFunctionIndex,
  createEmptyCAMSystem,
  createEmptyCAMModule,
  createCAMParameter,
  validateCAMFunctionIndex,
  countSystemParameters,
  countSystemTribalTips,
  type CAMSystem,
} from "../schemas/camFunctionIndexSchema.js";

describe("CAMFunctionIndexSchema", () => {
  describe("CAMValueTypeEnum", () => {
    it("should accept all valid value types", () => {
      const types = [
        "number", "percentage", "angle", "distance", "boolean",
        "enum", "string", "path", "tool_ref", "material_ref",
        "coordinate", "vector", "plane", "geometry_ref", "expression",
        "array", "object"
      ];
      for (const type of types) {
        expect(CAMValueTypeEnum.safeParse(type).success).toBe(true);
      }
    });

    it("should reject invalid types", () => {
      expect(CAMValueTypeEnum.safeParse("invalid_type").success).toBe(false);
    });
  });

  describe("CAMUnitEnum", () => {
    it("should accept length units", () => {
      const units = ["mm", "inch", "m", "cm", "um"];
      for (const unit of units) {
        expect(CAMUnitEnum.safeParse(unit).success).toBe(true);
      }
    });

    it("should accept feed units", () => {
      const units = ["mm_per_min", "mm_per_rev", "mm_per_tooth", "ipm", "ipr", "ipt"];
      for (const unit of units) {
        expect(CAMUnitEnum.safeParse(unit).success).toBe(true);
      }
    });

    it("should accept speed units", () => {
      expect(CAMUnitEnum.safeParse("rpm").success).toBe(true);
      expect(CAMUnitEnum.safeParse("sfm").success).toBe(true);
      expect(CAMUnitEnum.safeParse("m_per_min").success).toBe(true);
    });
  });

  describe("CAMConstraintSchema", () => {
    it("should validate numeric constraints", () => {
      const constraint = {
        min: 0,
        max: 10000,
        step: 100,
        precision: 0,
        required: true,
      };
      expect(CAMConstraintSchema.safeParse(constraint).success).toBe(true);
    });

    it("should validate enum constraints", () => {
      const constraint = {
        enum_values: ["climb", "conventional", "both"],
        required: true,
      };
      expect(CAMConstraintSchema.safeParse(constraint).success).toBe(true);
    });

    it("should validate conditional dependencies", () => {
      const constraint = {
        depends_on: ["spiral_enabled", "ramp_type"],
        formula: "ramp_angle = atan(ramp_height / ramp_distance)",
      };
      expect(CAMConstraintSchema.safeParse(constraint).success).toBe(true);
    });
  });

  describe("CAMParameterSchema", () => {
    it("should validate a simple numeric parameter", () => {
      const param = {
        id: "spindle_speed",
        name: "Spindle Speed",
        value: {
          type: "number",
          unit: "rpm",
          default_value: 3000,
          constraints: { min: 0, max: 24000, step: 100 },
        },
      };
      expect(CAMParameterSchema.safeParse(param).success).toBe(true);
    });

    it("should validate parameter with physics links", () => {
      const param = {
        id: "feed_per_tooth",
        name: "Feed per Tooth",
        value: { type: "number", unit: "mm_per_tooth" },
        physics_links: [{
          formula_id: "KIENZLE_FORCE",
          role: "input",
          affects: ["cutting_force", "power_consumption"],
        }],
      };
      expect(CAMParameterSchema.safeParse(param).success).toBe(true);
    });

    it("should validate parameter with tribal tips", () => {
      const param = {
        id: "stepover",
        name: "Stepover",
        value: { type: "percentage", unit: "percent", default_value: 50 },
        tribal_tips: [{
          id: "tip-001",
          text: "For aluminum, use 40% stepover to reduce BUE",
          source: "shop_floor",
          confidence: 0.9,
          material_context: ["6061-T6", "7075"],
        }],
      };
      expect(CAMParameterSchema.safeParse(param).success).toBe(true);
    });

    it("should validate parameter with AI actions", () => {
      const param = {
        id: "cutting_depth",
        name: "Depth of Cut",
        value: { type: "distance", unit: "mm" },
        ai_actions: [{
          dispatcher: "prism_cam",
          action: "optimize_depth",
          parameter_mapping: { "cutting_depth": "doc_mm" },
          pre_conditions: ["tool_selected", "material_defined"],
        }],
      };
      expect(CAMParameterSchema.safeParse(param).success).toBe(true);
    });
  });

  describe("CAMDialogSchema", () => {
    it("should validate a dialog with multiple parameters", () => {
      const dialog = {
        id: "cutting_params_dialog",
        name: "Cutting Parameters",
        type: "modal",
        parameters: [
          {
            id: "spindle_speed",
            name: "Spindle Speed",
            value: { type: "number", unit: "rpm" },
          },
          {
            id: "feed_rate",
            name: "Feed Rate",
            value: { type: "number", unit: "mm_per_min" },
          },
        ],
        dialog_purpose: "Configure cutting parameters for the operation",
      };
      expect(CAMDialogSchema.safeParse(dialog).success).toBe(true);
    });

    it("should validate dialog with tabs", () => {
      const dialog = {
        id: "tool_dialog",
        name: "Tool Definition",
        type: "modal",
        parameters: [
          { id: "diameter", name: "Diameter", value: { type: "distance", unit: "mm" } },
          { id: "flutes", name: "Number of Flutes", value: { type: "number" } },
          { id: "coating", name: "Coating", value: { type: "enum" } },
        ],
        tabs: [
          { id: "geometry", name: "Geometry", parameter_ids: ["diameter", "flutes"] },
          { id: "material", name: "Material", parameter_ids: ["coating"] },
        ],
      };
      expect(CAMDialogSchema.safeParse(dialog).success).toBe(true);
    });

    it("should validate dialog types", () => {
      const types = ["modal", "panel", "toolbar", "ribbon_tab", "context_menu", "wizard_page", "properties", "inspector"];
      for (const type of types) {
        const dialog = {
          id: "test",
          name: "Test",
          type,
          parameters: [],
        };
        expect(CAMDialogSchema.safeParse(dialog).success).toBe(true);
      }
    });
  });

  describe("OperationClassEnum", () => {
    it("should accept milling operations", () => {
      const ops = ["face_milling", "pocket_milling", "contour_milling", "3d_roughing", "5axis_swarf"];
      for (const op of ops) {
        expect(OperationClassEnum.safeParse(op).success).toBe(true);
      }
    });

    it("should accept turning operations", () => {
      const ops = ["turning_roughing", "turning_finishing", "grooving", "threading", "facing"];
      for (const op of ops) {
        expect(OperationClassEnum.safeParse(op).success).toBe(true);
      }
    });

    it("should accept EDM operations", () => {
      const ops = ["wire_edm_roughing", "wire_edm_skim", "wire_edm_taper", "sinker_edm_roughing"];
      for (const op of ops) {
        expect(OperationClassEnum.safeParse(op).success).toBe(true);
      }
    });
  });

  describe("CAMMenuSchema", () => {
    it("should validate a menu with dialogs", () => {
      const menu = {
        id: "face_milling",
        name: "Face Milling",
        operation_class: "face_milling",
        dialogs: [{
          id: "face_milling_params",
          name: "Face Milling Parameters",
          type: "modal",
          parameters: [
            { id: "stepover", name: "Stepover", value: { type: "percentage" } },
          ],
        }],
        geometry_requirements: ["face", "stock"],
        machine_requirements: ["3axis", "5axis"],
        typical_sequence_position: 10,
      };
      expect(CAMMenuSchema.safeParse(menu).success).toBe(true);
    });

    it("should validate nested sub-menus", () => {
      const menu = {
        id: "milling",
        name: "Milling",
        dialogs: [],
        sub_menus: [
          {
            id: "2d_milling",
            name: "2D Milling",
            dialogs: [],
            sub_menus: [
              { id: "face", name: "Face", dialogs: [] },
              { id: "pocket", name: "Pocket", dialogs: [] },
            ],
          },
        ],
      };
      expect(CAMMenuSchema.safeParse(menu).success).toBe(true);
    });
  });

  describe("CAMModuleSchema", () => {
    it("should validate a complete module", () => {
      const module = {
        id: "2d_operations",
        name: "2D Operations",
        menus: [{
          id: "face_milling",
          name: "Face Milling",
          dialogs: [],
        }],
        description: "Standard 2D milling operations",
        license_tier: "standard",
        machine_focus: ["3-axis", "5-axis"],
        expertise_level: "beginner",
        total_parameters: 150,
      };
      expect(CAMModuleSchema.safeParse(module).success).toBe(true);
    });
  });

  describe("CAMSystemSchema", () => {
    it("should validate a complete CAM system", () => {
      const system = {
        id: "hypermill",
        name: "hyperMILL",
        vendor: "OPEN MIND Technologies",
        modules: [{
          id: "2d",
          name: "2D Operations",
          menus: [],
        }],
        version: "2024.1",
        supported_machines: ["3-axis", "5-axis", "mill-turn"],
        supported_controllers: ["Fanuc", "Siemens", "Heidenhain"],
        file_extensions: [".hmc"],
        cad_integration: ["SolidWorks", "Inventor", "CATIA"],
        api_available: true,
        api_language: "csharp",
        prism_bridge_engine: "HyperMillBridgeEngine",
        prism_dispatcher: "prism_cam",
        total_modules: 8,
        total_parameters: 2500,
        coverage_percent: 75,
      };
      expect(CAMSystemSchema.safeParse(system).success).toBe(true);
    });
  });

  describe("CAMFunctionIndexSchema", () => {
    it("should validate empty index", () => {
      const index = createEmptyCAMFunctionIndex();
      expect(CAMFunctionIndexSchema.safeParse(index).success).toBe(true);
    });

    it("should validate index with systems", () => {
      const index = {
        schema_version: "1.0.0",
        systems: [
          createEmptyCAMSystem("hypermill", "hyperMILL", "OPEN MIND"),
          createEmptyCAMSystem("mastercam", "Mastercam", "CNC Software"),
        ],
        total_systems: 2,
        total_modules: 0,
        total_menus: 0,
        total_dialogs: 0,
        total_parameters: 0,
        total_tribal_tips: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        validation_status: "draft",
      };
      expect(CAMFunctionIndexSchema.safeParse(index).success).toBe(true);
    });

    it("should validate cross-system parameter mappings", () => {
      const index = {
        schema_version: "1.0.0",
        systems: [],
        total_systems: 0,
        total_modules: 0,
        total_menus: 0,
        total_dialogs: 0,
        total_parameters: 0,
        total_tribal_tips: 0,
        parameter_equivalents: [{
          canonical_name: "spindle_speed",
          mappings: {
            "hypermill": "rpm",
            "mastercam": "SpindleSpeed",
            "fusion": "tool_spindleSpeed",
          },
        }],
        operation_equivalents: [{
          canonical_class: "face_milling",
          mappings: {
            "hypermill": "2D_Face",
            "mastercam": "Face",
            "fusion": "face2",
          },
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        validation_status: "draft",
      };
      expect(CAMFunctionIndexSchema.safeParse(index).success).toBe(true);
    });
  });

  describe("Factory Functions", () => {
    it("createEmptyCAMFunctionIndex should create valid index", () => {
      const index = createEmptyCAMFunctionIndex();
      expect(index.schema_version).toBe("1.0.0");
      expect(index.systems).toHaveLength(0);
      expect(index.total_systems).toBe(0);
      expect(validateCAMFunctionIndex(index).success).toBe(true);
    });

    it("createEmptyCAMSystem should create valid system", () => {
      const system = createEmptyCAMSystem("test_cam", "Test CAM", "Test Vendor");
      expect(system.id).toBe("test_cam");
      expect(system.name).toBe("Test CAM");
      expect(system.vendor).toBe("Test Vendor");
      expect(system.modules).toHaveLength(0);
      expect(CAMSystemSchema.safeParse(system).success).toBe(true);
    });

    it("createEmptyCAMModule should create valid module", () => {
      const module = createEmptyCAMModule("test_module", "Test Module");
      expect(module.id).toBe("test_module");
      expect(module.name).toBe("Test Module");
      expect(module.menus).toHaveLength(0);
      expect(CAMModuleSchema.safeParse(module).success).toBe(true);
    });

    it("createCAMParameter should create valid parameter", () => {
      const param = createCAMParameter("test_param", "Test Parameter", "number", {
        category: "Cutting",
        value: { unit: "mm", default_value: 10 },
      });
      expect(param.id).toBe("test_param");
      expect(param.name).toBe("Test Parameter");
      expect(param.value.type).toBe("number");
      expect(param.value.unit).toBe("mm");
      expect(CAMParameterSchema.safeParse(param).success).toBe(true);
    });
  });

  describe("Counting Functions", () => {
    it("countSystemParameters should count all nested parameters", () => {
      const system: CAMSystem = {
        id: "test",
        name: "Test",
        vendor: "Test",
        modules: [{
          id: "mod1",
          name: "Module 1",
          menus: [{
            id: "menu1",
            name: "Menu 1",
            dialogs: [{
              id: "dialog1",
              name: "Dialog 1",
              type: "modal",
              parameters: [
                { id: "p1", name: "P1", value: { type: "number" } },
                { id: "p2", name: "P2", value: { type: "number" } },
              ],
            }],
            sub_menus: [{
              id: "submenu1",
              name: "Sub Menu 1",
              dialogs: [{
                id: "subdialog1",
                name: "Sub Dialog 1",
                type: "modal",
                parameters: [
                  { id: "p3", name: "P3", value: { type: "number" } },
                ],
              }],
            }],
          }],
        }],
        supported_machines: ["3axis"],
      };
      expect(countSystemParameters(system)).toBe(3);
    });

    it("countSystemTribalTips should count all nested tips", () => {
      const system: CAMSystem = {
        id: "test",
        name: "Test",
        vendor: "Test",
        modules: [{
          id: "mod1",
          name: "Module 1",
          menus: [{
            id: "menu1",
            name: "Menu 1",
            dialogs: [{
              id: "dialog1",
              name: "Dialog 1",
              type: "modal",
              parameters: [
                {
                  id: "p1",
                  name: "P1",
                  value: { type: "number" },
                  tribal_tips: [
                    { id: "t1", text: "Tip 1", source: "shop_floor", confidence: 0.9 },
                    { id: "t2", text: "Tip 2", source: "pdf", confidence: 0.8 },
                  ],
                },
                {
                  id: "p2",
                  name: "P2",
                  value: { type: "number" },
                  tribal_tips: [
                    { id: "t3", text: "Tip 3", source: "expert", confidence: 0.95 },
                  ],
                },
              ],
            }],
          }],
        }],
        supported_machines: ["3axis"],
      };
      expect(countSystemTribalTips(system)).toBe(3);
    });
  });

  describe("Validation Helpers", () => {
    it("validateCAMFunctionIndex should return success for valid data", () => {
      const index = createEmptyCAMFunctionIndex();
      const result = validateCAMFunctionIndex(index);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it("validateCAMFunctionIndex should return errors for invalid data", () => {
      const invalid = { schema_version: "2.0.0", systems: [] };
      const result = validateCAMFunctionIndex(invalid);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
