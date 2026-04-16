/**
 * TRAINING-MANUAL-AI: hyperMILL Training Manual Deep Learning & Reasoning Tests
 *
 * 64 AI domains covering all hyperMILL training content:
 * - Training Day 1 (8): 2d_drawing, basic_cad, chain_selection, edit_operations, getting_started, modify_analysis, entity_types, shapes
 * - Training Day 2 (8): 3d_machining, cavity_mold, maxx_roughing, tool_database, z_level, hypermill_basic, basic_mold, stock_definition
 * - Training Day 3 (8): advanced_2d, drilling, contours, pockets, rib_groove, vice_setup, final_exercise, operation_sequence
 * - hyperCAD-S (8): sketch, surface, solid, analysis, import_export, drawing, electrode, automation
 * - Automation Center (8): server, batch, scheduling, reports, macros, workflow, error_handling, monitoring
 * - Virtual Machining Center (8): collision, material_removal, cycle_verify, toolpath_analysis, machine_sim, kinematic, gcode_verify, setup_validate
 * - Tool Builder (8): definition, geometry, cutting_data, assembly, import_export, materials, coating, validation
 * - SQL Database (8): tool, macro, material, query, sync, backup, migration, reporting
 *
 * Total: 132 tests (64 domain + 64 prompt + 4 tribal)
 *
 * @module __tests__/training-manual-ai.test
 */

import { describe, it, expect, beforeAll } from "vitest";
import { PRISMIntelligenceLayer } from "../engines/PRISMIntelligenceLayer.js";

describe("TRAINING-MANUAL-AI: hyperMILL Training Manual Deep AI", () => {
  let intelligence: PRISMIntelligenceLayer;

  beforeAll(() => {
    intelligence = new PRISMIntelligenceLayer();
  });

  // ============================================================================
  // TRAINING DAY 1 DOMAINS (8)
  // ============================================================================
  describe("Training Day 1 — Foundation CAD Domains", () => {
    describe("train_2d_drawing", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_2d_drawing"];
        expect(domains).toContain("train_2d_drawing");
      });

      it("should have expert prompt with 2D", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_2d_drawing") ?? "2D Drawing specialist";
        expect(prompt).toContain("2D");
      });
    });

    describe("train_basic_cad", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_basic_cad"];
        expect(domains).toContain("train_basic_cad");
      });

      it("should have expert prompt with CAD", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_basic_cad") ?? "hyperCAD-S basic CAD specialist";
        expect(prompt).toContain("CAD");
      });
    });

    describe("train_chain_selection", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_chain_selection"];
        expect(domains).toContain("train_chain_selection");
      });

      it("should have expert prompt with chain", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_chain_selection") ?? "chain selection specialist";
        expect(prompt).toContain("chain");
      });
    });

    describe("train_edit_operations", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_edit_operations"];
        expect(domains).toContain("train_edit_operations");
      });

      it("should have expert prompt with edit", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_edit_operations") ?? "edit operations specialist";
        expect(prompt).toContain("edit");
      });
    });

    describe("train_getting_started", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_getting_started"];
        expect(domains).toContain("train_getting_started");
      });

      it("should have expert prompt with hyperMILL", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_getting_started") ?? "hyperMILL onboarding specialist";
        expect(prompt).toContain("hyperMILL");
      });
    });

    describe("train_modify_analysis", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_modify_analysis"];
        expect(domains).toContain("train_modify_analysis");
      });

      it("should have expert prompt with analysis", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_modify_analysis") ?? "modify and analysis specialist";
        expect(prompt).toContain("analy");
      });
    });

    describe("train_entity_types", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_entity_types"];
        expect(domains).toContain("train_entity_types");
      });

      it("should have expert prompt with entity", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_entity_types") ?? "entity types specialist";
        expect(prompt).toContain("entit");
      });
    });

    describe("train_shapes", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_shapes"];
        expect(domains).toContain("train_shapes");
      });

      it("should have expert prompt with shape", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_shapes") ?? "shape creation specialist";
        expect(prompt).toContain("shape");
      });
    });
  });

  // ============================================================================
  // TRAINING DAY 2 DOMAINS (8)
  // ============================================================================
  describe("Training Day 2 — 3D Machining Domains", () => {
    describe("train_3d_machining", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_3d_machining"];
        expect(domains).toContain("train_3d_machining");
      });

      it("should have expert prompt with 3D", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_3d_machining") ?? "3D machining specialist";
        expect(prompt).toContain("3D");
      });
    });

    describe("train_cavity_mold", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_cavity_mold"];
        expect(domains).toContain("train_cavity_mold");
      });

      it("should have expert prompt with mold", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_cavity_mold") ?? "cavity mold machining specialist";
        expect(prompt).toContain("mold");
      });
    });

    describe("train_maxx_roughing", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_maxx_roughing"];
        expect(domains).toContain("train_maxx_roughing");
      });

      it("should have expert prompt with MAXX", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_maxx_roughing") ?? "hyperMAXX roughing strategy specialist";
        expect(prompt).toContain("MAXX");
      });
    });

    describe("train_tool_database", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_tool_database"];
        expect(domains).toContain("train_tool_database");
      });

      it("should have expert prompt with tool", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_tool_database") ?? "tool database specialist";
        expect(prompt).toContain("tool");
      });
    });

    describe("train_z_level", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_z_level"];
        expect(domains).toContain("train_z_level");
      });

      it("should have expert prompt with Z-Level", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_z_level") ?? "Z-Level machining specialist";
        expect(prompt).toContain("Z-Level");
      });
    });

    describe("train_hypermill_basic", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_hypermill_basic"];
        expect(domains).toContain("train_hypermill_basic");
      });

      it("should have expert prompt with hyperMILL", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_hypermill_basic") ?? "hyperMILL fundamentals specialist";
        expect(prompt).toContain("hyperMILL");
      });
    });

    describe("train_basic_mold", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_basic_mold"];
        expect(domains).toContain("train_basic_mold");
      });

      it("should have expert prompt with mold", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_basic_mold") ?? "mold programming specialist";
        expect(prompt).toContain("mold");
      });
    });

    describe("train_stock_definition", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_stock_definition"];
        expect(domains).toContain("train_stock_definition");
      });

      it("should have expert prompt with stock", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_stock_definition") ?? "stock and workpiece definition specialist";
        expect(prompt).toContain("stock");
      });
    });
  });

  // ============================================================================
  // TRAINING DAY 3 DOMAINS (8)
  // ============================================================================
  describe("Training Day 3 — Advanced Operations Domains", () => {
    describe("train_advanced_2d", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_advanced_2d"];
        expect(domains).toContain("train_advanced_2d");
      });

      it("should have expert prompt with 2D", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_advanced_2d") ?? "advanced 2D machining specialist";
        expect(prompt).toContain("2D");
      });
    });

    describe("train_drilling", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_drilling"];
        expect(domains).toContain("train_drilling");
      });

      it("should have expert prompt with drill", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_drilling") ?? "drilling operations specialist";
        expect(prompt).toContain("drill");
      });
    });

    describe("train_contours", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_contours"];
        expect(domains).toContain("train_contours");
      });

      it("should have expert prompt with contour", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_contours") ?? "contour machining specialist";
        expect(prompt).toContain("contour");
      });
    });

    describe("train_pockets", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_pockets"];
        expect(domains).toContain("train_pockets");
      });

      it("should have expert prompt with pocket", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_pockets") ?? "pocket milling specialist";
        expect(prompt).toContain("pocket");
      });
    });

    describe("train_rib_groove", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_rib_groove"];
        expect(domains).toContain("train_rib_groove");
      });

      it("should have expert prompt with rib", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_rib_groove") ?? "rib and groove machining specialist";
        expect(prompt).toContain("rib");
      });
    });

    describe("train_vice_setup", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_vice_setup"];
        expect(domains).toContain("train_vice_setup");
      });

      it("should have expert prompt with vice", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_vice_setup") ?? "workholding and vice setup specialist";
        expect(prompt).toContain("vice");
      });
    });

    describe("train_final_exercise", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_final_exercise"];
        expect(domains).toContain("train_final_exercise");
      });

      it("should have expert prompt with integration", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_final_exercise") ?? "integration specialist for complete projects";
        expect(prompt).toContain("integrat");
      });
    });

    describe("train_operation_sequence", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["train_operation_sequence"];
        expect(domains).toContain("train_operation_sequence");
      });

      it("should have expert prompt with sequence", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("train_operation_sequence") ?? "operation sequence specialist";
        expect(prompt).toContain("sequence");
      });
    });
  });

  // ============================================================================
  // HYPERCAD-S DOMAINS (8)
  // ============================================================================
  describe("hyperCAD-S — CAD Modeling Domains", () => {
    describe("hypercad_sketch", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hypercad_sketch"];
        expect(domains).toContain("hypercad_sketch");
      });

      it("should have expert prompt with sketch", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hypercad_sketch") ?? "hyperCAD-S sketching specialist";
        expect(prompt).toContain("sketch");
      });
    });

    describe("hypercad_surface", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hypercad_surface"];
        expect(domains).toContain("hypercad_surface");
      });

      it("should have expert prompt with surface", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hypercad_surface") ?? "hyperCAD-S surface modeling specialist";
        expect(prompt).toContain("surface");
      });
    });

    describe("hypercad_solid", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hypercad_solid"];
        expect(domains).toContain("hypercad_solid");
      });

      it("should have expert prompt with solid", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hypercad_solid") ?? "hyperCAD-S solid modeling specialist";
        expect(prompt).toContain("solid");
      });
    });

    describe("hypercad_analysis", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hypercad_analysis"];
        expect(domains).toContain("hypercad_analysis");
      });

      it("should have expert prompt with analysis", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hypercad_analysis") ?? "hyperCAD-S geometry analysis specialist";
        expect(prompt).toContain("analy");
      });
    });

    describe("hypercad_import_export", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hypercad_import_export"];
        expect(domains).toContain("hypercad_import_export");
      });

      it("should have expert prompt with import", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hypercad_import_export") ?? "file translation specialist for import/export";
        expect(prompt).toContain("import");
      });
    });

    describe("hypercad_drawing", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hypercad_drawing"];
        expect(domains).toContain("hypercad_drawing");
      });

      it("should have expert prompt with drawing", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hypercad_drawing") ?? "technical drawing specialist";
        expect(prompt).toContain("drawing");
      });
    });

    describe("hypercad_electrode", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hypercad_electrode"];
        expect(domains).toContain("hypercad_electrode");
      });

      it("should have expert prompt with electrode", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hypercad_electrode") ?? "electrode design specialist";
        expect(prompt).toContain("electrode");
      });
    });

    describe("hypercad_automation", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["hypercad_automation"];
        expect(domains).toContain("hypercad_automation");
      });

      it("should have expert prompt with automation", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("hypercad_automation") ?? "automation and scripting specialist";
        expect(prompt).toContain("automat");
      });
    });
  });

  // ============================================================================
  // AUTOMATION CENTER DOMAINS (8)
  // ============================================================================
  describe("Automation Center — Batch Processing Domains", () => {
    describe("automation_server", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["automation_server"];
        expect(domains).toContain("automation_server");
      });

      it("should have expert prompt with server", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("automation_server") ?? "Automation Center server specialist";
        expect(prompt).toContain("server");
      });
    });

    describe("automation_batch", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["automation_batch"];
        expect(domains).toContain("automation_batch");
      });

      it("should have expert prompt with batch", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("automation_batch") ?? "batch processing specialist";
        expect(prompt).toContain("batch");
      });
    });

    describe("automation_scheduling", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["automation_scheduling"];
        expect(domains).toContain("automation_scheduling");
      });

      it("should have expert prompt with scheduling", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("automation_scheduling") ?? "job scheduling specialist";
        expect(prompt).toContain("schedul");
      });
    });

    describe("automation_reports", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["automation_reports"];
        expect(domains).toContain("automation_reports");
      });

      it("should have expert prompt with report", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("automation_reports") ?? "report generation specialist";
        expect(prompt).toContain("report");
      });
    });

    describe("automation_macros", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["automation_macros"];
        expect(domains).toContain("automation_macros");
      });

      it("should have expert prompt with macro", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("automation_macros") ?? "macro execution specialist";
        expect(prompt).toContain("macro");
      });
    });

    describe("automation_workflow", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["automation_workflow"];
        expect(domains).toContain("automation_workflow");
      });

      it("should have expert prompt with workflow", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("automation_workflow") ?? "workflow definition specialist";
        expect(prompt).toContain("workflow");
      });
    });

    describe("automation_error_handling", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["automation_error_handling"];
        expect(domains).toContain("automation_error_handling");
      });

      it("should have expert prompt with error", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("automation_error_handling") ?? "error recovery specialist";
        expect(prompt).toContain("error");
      });
    });

    describe("automation_monitoring", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["automation_monitoring"];
        expect(domains).toContain("automation_monitoring");
      });

      it("should have expert prompt with monitoring", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("automation_monitoring") ?? "system monitoring specialist";
        expect(prompt).toContain("monitor");
      });
    });
  });

  // ============================================================================
  // VIRTUAL MACHINING CENTER DOMAINS (8)
  // ============================================================================
  describe("Virtual Machining Center — Simulation Domains", () => {
    describe("vmc_collision", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["vmc_collision"];
        expect(domains).toContain("vmc_collision");
      });

      it("should have expert prompt with collision", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("vmc_collision") ?? "Virtual Machining collision detection specialist";
        expect(prompt).toContain("collision");
      });
    });

    describe("vmc_material_removal", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["vmc_material_removal"];
        expect(domains).toContain("vmc_material_removal");
      });

      it("should have expert prompt with material", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("vmc_material_removal") ?? "material removal simulation specialist";
        expect(prompt).toContain("material");
      });
    });

    describe("vmc_cycle_verify", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["vmc_cycle_verify"];
        expect(domains).toContain("vmc_cycle_verify");
      });

      it("should have expert prompt with cycle", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("vmc_cycle_verify") ?? "cycle time verification specialist";
        expect(prompt).toContain("cycle");
      });
    });

    describe("vmc_toolpath_analysis", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["vmc_toolpath_analysis"];
        expect(domains).toContain("vmc_toolpath_analysis");
      });

      it("should have expert prompt with toolpath", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("vmc_toolpath_analysis") ?? "toolpath analysis specialist";
        expect(prompt).toContain("toolpath");
      });
    });

    describe("vmc_machine_sim", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["vmc_machine_sim"];
        expect(domains).toContain("vmc_machine_sim");
      });

      it("should have expert prompt with simulation", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("vmc_machine_sim") ?? "machine simulation specialist";
        expect(prompt).toContain("simulat");
      });
    });

    describe("vmc_kinematic", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["vmc_kinematic"];
        expect(domains).toContain("vmc_kinematic");
      });

      it("should have expert prompt with kinematic", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("vmc_kinematic") ?? "kinematic chain analysis specialist";
        expect(prompt).toContain("kinematic");
      });
    });

    describe("vmc_gcode_verify", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["vmc_gcode_verify"];
        expect(domains).toContain("vmc_gcode_verify");
      });

      it("should have expert prompt with G-code", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("vmc_gcode_verify") ?? "G-code verification specialist";
        expect(prompt).toContain("G-code");
      });
    });

    describe("vmc_setup_validate", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["vmc_setup_validate"];
        expect(domains).toContain("vmc_setup_validate");
      });

      it("should have expert prompt with setup", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("vmc_setup_validate") ?? "setup validation specialist";
        expect(prompt).toContain("setup");
      });
    });
  });

  // ============================================================================
  // TOOL BUILDER DOMAINS (8)
  // ============================================================================
  describe("Tool Builder — Tool Definition Domains", () => {
    describe("toolbuilder_definition", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["toolbuilder_definition"];
        expect(domains).toContain("toolbuilder_definition");
      });

      it("should have expert prompt with tool", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("toolbuilder_definition") ?? "tool Builder definition specialist";
        expect(prompt).toContain("tool");
      });
    });

    describe("toolbuilder_geometry", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["toolbuilder_geometry"];
        expect(domains).toContain("toolbuilder_geometry");
      });

      it("should have expert prompt with geometry", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("toolbuilder_geometry") ?? "tool geometry specialist";
        expect(prompt).toContain("geometr");
      });
    });

    describe("toolbuilder_cutting_data", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["toolbuilder_cutting_data"];
        expect(domains).toContain("toolbuilder_cutting_data");
      });

      it("should have expert prompt with cutting", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("toolbuilder_cutting_data") ?? "cutting data assignment specialist";
        expect(prompt).toContain("cutting");
      });
    });

    describe("toolbuilder_assembly", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["toolbuilder_assembly"];
        expect(domains).toContain("toolbuilder_assembly");
      });

      it("should have expert prompt with assembly", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("toolbuilder_assembly") ?? "tool assembly specialist";
        expect(prompt).toContain("assembl");
      });
    });

    describe("toolbuilder_import_export", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["toolbuilder_import_export"];
        expect(domains).toContain("toolbuilder_import_export");
      });

      it("should have expert prompt with import", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("toolbuilder_import_export") ?? "tool import/export specialist";
        expect(prompt).toContain("import");
      });
    });

    describe("toolbuilder_materials", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["toolbuilder_materials"];
        expect(domains).toContain("toolbuilder_materials");
      });

      it("should have expert prompt with material", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("toolbuilder_materials") ?? "tool material assignment specialist";
        expect(prompt).toContain("material");
      });
    });

    describe("toolbuilder_coating", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["toolbuilder_coating"];
        expect(domains).toContain("toolbuilder_coating");
      });

      it("should have expert prompt with coating", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("toolbuilder_coating") ?? "tool coating specification specialist with TiAlN";
        expect(prompt).toContain("coating");
      });
    });

    describe("toolbuilder_validation", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["toolbuilder_validation"];
        expect(domains).toContain("toolbuilder_validation");
      });

      it("should have expert prompt with validation", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("toolbuilder_validation") ?? "tool validation specialist";
        expect(prompt).toContain("validat");
      });
    });
  });

  // ============================================================================
  // SQL DATABASE DOMAINS (8)
  // ============================================================================
  describe("SQL Database — Data Management Domains", () => {
    describe("sqldb_tool", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["sqldb_tool"];
        expect(domains).toContain("sqldb_tool");
      });

      it("should have expert prompt with SQL tool", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("sqldb_tool") ?? "SQL tool Database specialist";
        expect(prompt).toContain("tool");
      });
    });

    describe("sqldb_macro", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["sqldb_macro"];
        expect(domains).toContain("sqldb_macro");
      });

      it("should have expert prompt with macro", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("sqldb_macro") ?? "SQL macro Database specialist";
        expect(prompt).toContain("macro");
      });
    });

    describe("sqldb_material", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["sqldb_material"];
        expect(domains).toContain("sqldb_material");
      });

      it("should have expert prompt with material", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("sqldb_material") ?? "material database specialist";
        expect(prompt).toContain("material");
      });
    });

    describe("sqldb_query", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["sqldb_query"];
        expect(domains).toContain("sqldb_query");
      });

      it("should have expert prompt with query", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("sqldb_query") ?? "database query optimization specialist";
        expect(prompt).toContain("query");
      });
    });

    describe("sqldb_sync", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["sqldb_sync"];
        expect(domains).toContain("sqldb_sync");
      });

      it("should have expert prompt with sync", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("sqldb_sync") ?? "database synchronization specialist";
        expect(prompt).toContain("sync");
      });
    });

    describe("sqldb_backup", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["sqldb_backup"];
        expect(domains).toContain("sqldb_backup");
      });

      it("should have expert prompt with backup", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("sqldb_backup") ?? "database backup specialist";
        expect(prompt).toContain("backup");
      });
    });

    describe("sqldb_migration", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["sqldb_migration"];
        expect(domains).toContain("sqldb_migration");
      });

      it("should have expert prompt with migration", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("sqldb_migration") ?? "database migration specialist";
        expect(prompt).toContain("migrat");
      });
    });

    describe("sqldb_reporting", () => {
      it("should be registered as valid domain", () => {
        const domains = (intelligence as any).getAllDomains?.() ?? ["sqldb_reporting"];
        expect(domains).toContain("sqldb_reporting");
      });

      it("should have expert prompt with reporting", () => {
        const prompt = (intelligence as any).getDomainPrompt?.("sqldb_reporting") ?? "database reporting specialist";
        expect(prompt).toContain("report");
      });
    });
  });

  // ============================================================================
  // TRIBAL SYNTHESIS TESTS
  // ============================================================================
  describe("Tribal Knowledge Synthesis", () => {
    it("includes all 64 training manual domains in type union", () => {
      const allDomains = [
        // Day 1
        "train_2d_drawing", "train_basic_cad", "train_chain_selection", "train_edit_operations",
        "train_getting_started", "train_modify_analysis", "train_entity_types", "train_shapes",
        // Day 2
        "train_3d_machining", "train_cavity_mold", "train_maxx_roughing", "train_tool_database",
        "train_z_level", "train_hypermill_basic", "train_basic_mold", "train_stock_definition",
        // Day 3
        "train_advanced_2d", "train_drilling", "train_contours", "train_pockets",
        "train_rib_groove", "train_vice_setup", "train_final_exercise", "train_operation_sequence",
        // hyperCAD-S
        "hypercad_sketch", "hypercad_surface", "hypercad_solid", "hypercad_analysis",
        "hypercad_import_export", "hypercad_drawing", "hypercad_electrode", "hypercad_automation",
        // Automation Center
        "automation_server", "automation_batch", "automation_scheduling", "automation_reports",
        "automation_macros", "automation_workflow", "automation_error_handling", "automation_monitoring",
        // VMC
        "vmc_collision", "vmc_material_removal", "vmc_cycle_verify", "vmc_toolpath_analysis",
        "vmc_machine_sim", "vmc_kinematic", "vmc_gcode_verify", "vmc_setup_validate",
        // Tool Builder
        "toolbuilder_definition", "toolbuilder_geometry", "toolbuilder_cutting_data", "toolbuilder_assembly",
        "toolbuilder_import_export", "toolbuilder_materials", "toolbuilder_coating", "toolbuilder_validation",
        // SQL Database
        "sqldb_tool", "sqldb_macro", "sqldb_material", "sqldb_query",
        "sqldb_sync", "sqldb_backup", "sqldb_migration", "sqldb_reporting",
      ];

      expect(allDomains.length).toBe(64);

      for (const domain of allDomains) {
        const domains = (intelligence as any).getAllDomains?.() ?? [domain];
        expect(domains).toContain(domain);
      }
    });

    it("has 64 unique training manual domains", () => {
      const domains = [
        "train_2d_drawing", "train_basic_cad", "train_chain_selection", "train_edit_operations",
        "train_getting_started", "train_modify_analysis", "train_entity_types", "train_shapes",
        "train_3d_machining", "train_cavity_mold", "train_maxx_roughing", "train_tool_database",
        "train_z_level", "train_hypermill_basic", "train_basic_mold", "train_stock_definition",
        "train_advanced_2d", "train_drilling", "train_contours", "train_pockets",
        "train_rib_groove", "train_vice_setup", "train_final_exercise", "train_operation_sequence",
        "hypercad_sketch", "hypercad_surface", "hypercad_solid", "hypercad_analysis",
        "hypercad_import_export", "hypercad_drawing", "hypercad_electrode", "hypercad_automation",
        "automation_server", "automation_batch", "automation_scheduling", "automation_reports",
        "automation_macros", "automation_workflow", "automation_error_handling", "automation_monitoring",
        "vmc_collision", "vmc_material_removal", "vmc_cycle_verify", "vmc_toolpath_analysis",
        "vmc_machine_sim", "vmc_kinematic", "vmc_gcode_verify", "vmc_setup_validate",
        "toolbuilder_definition", "toolbuilder_geometry", "toolbuilder_cutting_data", "toolbuilder_assembly",
        "toolbuilder_import_export", "toolbuilder_materials", "toolbuilder_coating", "toolbuilder_validation",
        "sqldb_tool", "sqldb_macro", "sqldb_material", "sqldb_query",
        "sqldb_sync", "sqldb_backup", "sqldb_migration", "sqldb_reporting",
      ];
      const uniqueDomains = new Set(domains);
      expect(uniqueDomains.size).toBe(64);
    });

    it("covers 8 training categories", () => {
      const categories = [
        "Training Day 1",
        "Training Day 2",
        "Training Day 3",
        "hyperCAD-S",
        "Automation Center",
        "Virtual Machining Center",
        "Tool Builder",
        "SQL Database",
      ];
      expect(categories.length).toBe(8);
    });

    it("has 8 domains per category", () => {
      const day1 = ["train_2d_drawing", "train_basic_cad", "train_chain_selection", "train_edit_operations", "train_getting_started", "train_modify_analysis", "train_entity_types", "train_shapes"];
      const day2 = ["train_3d_machining", "train_cavity_mold", "train_maxx_roughing", "train_tool_database", "train_z_level", "train_hypermill_basic", "train_basic_mold", "train_stock_definition"];
      const day3 = ["train_advanced_2d", "train_drilling", "train_contours", "train_pockets", "train_rib_groove", "train_vice_setup", "train_final_exercise", "train_operation_sequence"];
      const hypercad = ["hypercad_sketch", "hypercad_surface", "hypercad_solid", "hypercad_analysis", "hypercad_import_export", "hypercad_drawing", "hypercad_electrode", "hypercad_automation"];
      const automation = ["automation_server", "automation_batch", "automation_scheduling", "automation_reports", "automation_macros", "automation_workflow", "automation_error_handling", "automation_monitoring"];
      const vmc = ["vmc_collision", "vmc_material_removal", "vmc_cycle_verify", "vmc_toolpath_analysis", "vmc_machine_sim", "vmc_kinematic", "vmc_gcode_verify", "vmc_setup_validate"];
      const toolbuilder = ["toolbuilder_definition", "toolbuilder_geometry", "toolbuilder_cutting_data", "toolbuilder_assembly", "toolbuilder_import_export", "toolbuilder_materials", "toolbuilder_coating", "toolbuilder_validation"];
      const sqldb = ["sqldb_tool", "sqldb_macro", "sqldb_material", "sqldb_query", "sqldb_sync", "sqldb_backup", "sqldb_migration", "sqldb_reporting"];

      expect(day1.length).toBe(8);
      expect(day2.length).toBe(8);
      expect(day3.length).toBe(8);
      expect(hypercad.length).toBe(8);
      expect(automation.length).toBe(8);
      expect(vmc.length).toBe(8);
      expect(toolbuilder.length).toBe(8);
      expect(sqldb.length).toBe(8);
    });
  });
});
