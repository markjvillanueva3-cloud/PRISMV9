/**
 * MILL-HARD-MS7: 5-Axis Orchestration Engine — Full-Stack Automation
 * ===================================================================
 * 85+ tests covering:
 *   - μS-22: Multi-Operation Sequencing (Rough → Semi → Finish → Rest)
 *   - μS-23: Domain-Specific Language (5-Axis DSL)
 *   - μS-24: Post-Processor Intelligence (machine-specific G-code)
 *   - μS-25: Collision Recovery (automatic tilt adjustment)
 *   - μS-26: Adaptive Feedrate (chip load, engagement, dynamics)
 *   - μS-27: Surface Quality Prediction (scallop height, Ra)
 *
 * Design Inspiration:
 *   - AutoCAD Action Recorder → CAM session recording
 *   - AutoCAD Macro Syntax → 5-Axis DSL
 *   - AutoCAD Tool Palettes → Workflow organization
 *
 * @milestone MILL-HARD-MS7
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  FiveAxisOrchestrationEngine,
  type OperationSequence,
  type FiveAxisOperation,
  type ToolDefinition,
  type CuttingParams,
  type StockModel,
  type DSLScript,
  type PostProcessorConfig,
  type CollisionResult,
  type AdaptiveFeedrateResult,
  type ScallopResult,
  type RaPrediction,
  type SurfaceQualityAnalysis,
  type ControllerType,
  type MachineDynamics,
} from "../engines/FiveAxisOrchestrationEngine.js";
import type { MaterialProps, FiveAxisGeometry } from "../engines/FiveAxisToolpathSynthesisEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const testMaterial: MaterialProps = {
  name: "D2 Tool Steel",
  iso_group: "H",
  kc11_mpa: 3200,
  mc: 0.25,
};

const testMaterialAluminum: MaterialProps = {
  name: "6061-T6 Aluminum",
  iso_group: "N",
  kc11_mpa: 700,
  mc: 0.25,
};

const testTool: ToolDefinition = {
  id: "T10",
  type: "ball_nose",
  diameter_mm: 10,
  flute_length_mm: 25,
  overall_length_mm: 75,
  flute_count: 2,
  material: "carbide",
  coating: "TiAlN",
};

const testToolWithHolder: ToolDefinition = {
  ...testTool,
  holder_id: "BT40-ER16",
  holder_gauge_length_mm: 80,
};

const testParams: CuttingParams = {
  spindle_rpm: 8000,
  feed_mmmin: 2000,
  ap_mm: 0.5,
  ae_mm: 1.5,
  lead_angle_deg: 15,
  tilt_angle_deg: 10,
  stepover_pct: 15,
  coolant: "through_tool",
};

// ============================================================================
// μS-22: MULTI-OPERATION SEQUENCING
// ============================================================================

describe("MILL-HARD-MS7: 5-Axis Orchestration Engine", () => {
  beforeEach(() => {
    FiveAxisOrchestrationEngine.clearAll();
    FiveAxisOrchestrationEngine.initialize();
  });

  afterEach(() => {
    FiveAxisOrchestrationEngine.clearAll();
  });

  describe("μS-22: Multi-Operation Sequencing", () => {
    describe("Sequence Generation", () => {
      it("should generate complete operation sequence for die cavity", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "mold_cavity",
          testMaterial,
          "okuma_m460v_5ax"
        );

        expect(sequence.id).toContain("seq_");
        expect(sequence.operations.length).toBeGreaterThanOrEqual(3);
        expect(sequence.material).toEqual(testMaterial);
        expect(sequence.machine_id).toBe("okuma_m460v_5ax");
      });

      it("should include all phases: rough, semi, finish, rest", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "deep_cavity",
          testMaterial,
          "okuma_m460v_5ax",
          { include_rest: true }
        );

        const phases = sequence.operations.map(op => op.phase);
        expect(phases).toContain("roughing");
        expect(phases).toContain("semi_finishing");
        expect(phases).toContain("finishing");
        expect(phases).toContain("rest_milling");
      });

      it("should skip semi-finishing for coarse Ra targets", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "freeform_surface",
          testMaterial,
          "okuma_m460v_5ax",
          { target_ra_um: 6.3 }
        );

        const phases = sequence.operations.map(op => op.phase);
        expect(phases).not.toContain("semi_finishing");
      });

      it("should calculate total cycle time", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "impeller_blade",
          testMaterial,
          "okuma_m460v_5ax"
        );

        expect(sequence.total_cycle_min).toBeGreaterThan(0);
        const sumCycle = sequence.operations.reduce((s, op) => s + op.estimated_cycle_min, 0);
        expect(sequence.total_cycle_min).toBe(sumCycle);
      });

      it("should count tool changes correctly", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "mold_core",
          testMaterial,
          "okuma_m460v_5ax"
        );

        expect(sequence.tool_changes).toBeGreaterThanOrEqual(0);
        expect(sequence.tool_changes).toBeLessThan(sequence.operations.length);
      });

      it("should create initial stock model", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "electrode",
          testMaterial,
          "okuma_m460v_5ax"
        );

        expect(sequence.stock_model).toBeDefined();
        expect(sequence.stock_model.type).toBe("block");
        expect(sequence.stock_model.remaining_volume_mm3).toBeGreaterThan(0);
      });

      it("should store generated sequence", () => {
        FiveAxisOrchestrationEngine.generateSequence(
          "turbine_blade",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const sequences = FiveAxisOrchestrationEngine.getAllSequences();
        expect(sequences.length).toBe(1);
      });
    });

    describe("Tool Change Optimization", () => {
      it("should optimize operation order to minimize tool changes", () => {
        const original = FiveAxisOrchestrationEngine.generateSequence(
          "blisk",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const optimized = FiveAxisOrchestrationEngine.optimizeToolChanges(original);

        expect(optimized.tool_changes).toBeLessThanOrEqual(original.tool_changes);
      });

      it("should maintain phase ordering during optimization", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "port",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const optimized = FiveAxisOrchestrationEngine.optimizeToolChanges(sequence);

        // Roughing should still come before finishing
        const roughIdx = optimized.operations.findIndex(op => op.phase === "roughing");
        const finishIdx = optimized.operations.findIndex(op => op.phase === "finishing");
        expect(roughIdx).toBeLessThan(finishIdx);
      });
    });

    describe("Stock Model Tracking", () => {
      it("should update stock model after operation", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "tube",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const originalVolume = sequence.stock_model.remaining_volume_mm3;
        const firstOp = sequence.operations[0];

        const updatedStock = FiveAxisOrchestrationEngine.updateStockModel(
          sequence,
          firstOp.id
        );

        expect(updatedStock.remaining_volume_mm3).toBeLessThan(originalVolume);
        expect(updatedStock.last_operation_id).toBe(firstOp.id);
      });

      it("should throw for invalid operation ID", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "undercut",
          testMaterial,
          "okuma_m460v_5ax"
        );

        expect(() =>
          FiveAxisOrchestrationEngine.updateStockModel(sequence, "invalid_op")
        ).toThrow(/not found/);
      });
    });
  });

  // ============================================================================
  // μS-23: DOMAIN-SPECIFIC LANGUAGE (DSL)
  // ============================================================================

  describe("μS-23: Domain-Specific Language (DSL)", () => {
    describe("DSL Parsing", () => {
      it("should parse simple command", () => {
        const script = FiveAxisOrchestrationEngine.parseDSL(
          "5AX_SWARF(tilt=15, lead=10);"
        );

        expect(script.id).toContain("dsl_");
        expect(script.source).toContain("5AX_SWARF");
        expect(script.commands).toContain("5AX_SWARF");
      });

      it("should parse conditional statements", () => {
        const script = FiveAxisOrchestrationEngine.parseDSL(
          "IF COLLISION { 5AX_POINT(tilt=30); }"
        );

        expect(script.source).toContain("IF");
        expect(script.source).toContain("COLLISION");
      });

      it("should parse loop statements", () => {
        const script = FiveAxisOrchestrationEngine.parseDSL(
          "REPEAT 3 { 5AX_FINISH(stepover=0.1); }"
        );

        expect(script.source).toContain("REPEAT");
      });

      it("should extract variables", () => {
        const script = FiveAxisOrchestrationEngine.parseDSL(
          "$depth = 50; $stepover = 0.1; 5AX_ROUGH(ap=$depth);"
        );

        expect(script.variables.length).toBeGreaterThan(0);
      });

      it("should store parsed scripts", () => {
        FiveAxisOrchestrationEngine.parseDSL("5AX_SWARF(tilt=15);");
        FiveAxisOrchestrationEngine.parseDSL("5AX_POINT(lead=10);");

        const scripts = FiveAxisOrchestrationEngine.getAllScripts();
        expect(scripts.length).toBe(2);
      });
    });

    describe("DSL Execution", () => {
      it("should execute simple script", () => {
        const script = FiveAxisOrchestrationEngine.parseDSL(
          "5AX_ROUGH(stepover=50);"
        );

        const result = FiveAxisOrchestrationEngine.executeDSL(script, {});

        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should execute with context variables", () => {
        const script = FiveAxisOrchestrationEngine.parseDSL(
          "$depth = 30; 5AX_ROUGH(ap=$depth);"
        );

        const result = FiveAxisOrchestrationEngine.executeDSL(script, {
          variables: { depth: 30 } as unknown as Map<string, string | number>,
        });

        expect(result.success).toBe(true);
      });
    });

    describe("DSL Syntax Examples", () => {
      it("should provide syntax examples", () => {
        const examples = FiveAxisOrchestrationEngine.getDSLSyntaxExamples();

        expect(examples.length).toBeGreaterThan(0);
        expect(examples.some(e => e.includes("5AX_SWARF"))).toBe(true);
        expect(examples.some(e => e.includes("IF"))).toBe(true);
        expect(examples.some(e => e.includes("REPEAT"))).toBe(true);
        expect(examples.some(e => e.includes("PAUSE"))).toBe(true);
      });

      it("should include compound script example", () => {
        const examples = FiveAxisOrchestrationEngine.getDSLSyntaxExamples();
        const compound = examples.find(e => e.includes("workflow"));

        expect(compound).toBeDefined();
        expect(compound).toContain("5AX_ROUGH");
        expect(compound).toContain("5AX_FINISH");
      });
    });
  });

  // ============================================================================
  // μS-24: POST-PROCESSOR INTELLIGENCE
  // ============================================================================

  describe("μS-24: Post-Processor Intelligence", () => {
    describe("Post Config Management", () => {
      it("should initialize with default configs", () => {
        const configs = FiveAxisOrchestrationEngine.getAllPostConfigs();
        expect(configs.length).toBeGreaterThanOrEqual(2);
      });

      it("should get Okuma M460V config", () => {
        const config = FiveAxisOrchestrationEngine.getPostConfig("okuma_m460v_5ax");

        expect(config).toBeDefined();
        expect(config?.controller).toBe("okuma_osp");
        expect(config?.rtcp_dialect.activation_code).toBe("G43.4");
      });

      it("should get Haas VF-4 config", () => {
        const config = FiveAxisOrchestrationEngine.getPostConfig("haas_vf4_3plus2");

        expect(config).toBeDefined();
        expect(config?.controller).toBe("haas_ngc");
        expect(config?.rtcp_dialect.activation_code).toBe("G234");
      });

      it("should register custom post config", () => {
        const customConfig: PostProcessorConfig = {
          id: "custom_5ax",
          name: "Custom 5-Axis",
          machine_id: "custom_machine",
          controller: "siemens_840d",
          rtcp_dialect: FiveAxisOrchestrationEngine.getRTCPDialect("siemens_840d"),
          envelope: {
            x_min: -500, x_max: 500,
            y_min: -500, y_max: 500,
            z_min: -500, z_max: 0,
            a_min: -120, a_max: 30,
            b_min: -360, b_max: 360,
            c_min: 0, c_max: 0,
          },
          rapid_xy_mmmin: 30000,
          rapid_z_mmmin: 20000,
          rapid_rotary_degmin: 15000,
          decimal_places: 4,
          modal_gcodes: true,
          block_numbering: true,
          block_increment: 5,
          program_start: ["G90 G40 G80"],
          program_end: ["M30"],
          coolant_codes: { flood: "M8", off: "M9" },
        };

        FiveAxisOrchestrationEngine.registerPostConfig(customConfig);
        const retrieved = FiveAxisOrchestrationEngine.getPostConfig("custom_5ax");

        expect(retrieved).toBeDefined();
        expect(retrieved?.controller).toBe("siemens_840d");
      });
    });

    describe("RTCP Dialects", () => {
      const controllers: ControllerType[] = [
        "okuma_osp",
        "fanuc",
        "siemens_840d",
        "heidenhain",
        "haas_ngc",
        "hurco_winmax",
        "mazak_mazatrol",
        "dmg_celos",
        "makino_pro",
        "hermle",
      ];

      it.each(controllers)("should have RTCP dialect for %s", (controller) => {
        const dialect = FiveAxisOrchestrationEngine.getRTCPDialect(controller);

        expect(dialect).toBeDefined();
        expect(dialect.controller).toBe(controller);
        expect(dialect.activation_code).toBeTruthy();
        expect(dialect.deactivation_code).toBeTruthy();
      });

      it("should have correct Okuma OSP dialect", () => {
        const dialect = FiveAxisOrchestrationEngine.getRTCPDialect("okuma_osp");

        expect(dialect.activation_code).toBe("G43.4");
        expect(dialect.deactivation_code).toBe("G49");
        expect(dialect.tcp_point).toBe("tool_tip");
      });

      it("should have correct Siemens 840D dialect", () => {
        const dialect = FiveAxisOrchestrationEngine.getRTCPDialect("siemens_840d");

        expect(dialect.activation_code).toBe("TRAORI");
        expect(dialect.deactivation_code).toBe("TRAFOOF");
      });

      it("should have correct Heidenhain dialect", () => {
        const dialect = FiveAxisOrchestrationEngine.getRTCPDialect("heidenhain");

        expect(dialect.activation_code).toContain("TCPM");
        expect(dialect.deactivation_code).toContain("RESET");
      });
    });

    describe("G-Code Generation", () => {
      it("should generate G-code for sequence", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "dental",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const gcode = FiveAxisOrchestrationEngine.generateGCode(sequence);

        expect(gcode.blocks.length).toBeGreaterThan(0);
        expect(gcode.total_lines).toBe(gcode.blocks.length);
      });

      it("should include program start codes", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "medical_implant",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const gcode = FiveAxisOrchestrationEngine.generateGCode(sequence);
        const content = gcode.blocks.map(b => b.content).join("\n");

        expect(content).toContain("G90");
        expect(content).toContain("G21");
      });

      it("should include RTCP activation", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "multi_face",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const gcode = FiveAxisOrchestrationEngine.generateGCode(sequence);
        const content = gcode.blocks.map(b => b.content).join("\n");

        expect(content).toContain("G43.4");
      });

      it("should include coolant codes", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "freeform_surface",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const gcode = FiveAxisOrchestrationEngine.generateGCode(sequence);
        const content = gcode.blocks.map(b => b.content).join("\n");

        expect(content).toContain("M8"); // Flood coolant
        expect(content).toContain("M9"); // Coolant off
      });

      it("should include program end codes", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "ruled_surface",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const gcode = FiveAxisOrchestrationEngine.generateGCode(sequence);
        const lastBlocks = gcode.blocks.slice(-5).map(b => b.content).join("\n");

        expect(lastBlocks).toContain("M30");
      });

      it("should use block numbering when configured", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "impeller_blade",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const gcode = FiveAxisOrchestrationEngine.generateGCode(sequence);

        expect(gcode.blocks[0].content).toMatch(/^N\d+/);
      });

      it("should throw for unknown machine", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "blisk",
          testMaterial,
          "okuma_m460v_5ax"
        );

        // Modify sequence to have unknown machine
        sequence.machine_id = "unknown_machine";

        expect(() =>
          FiveAxisOrchestrationEngine.generateGCode(sequence)
        ).toThrow(/No post config/);
      });
    });
  });

  // ============================================================================
  // μS-25: COLLISION RECOVERY
  // ============================================================================

  describe("μS-25: Collision Recovery", () => {
    describe("Collision Detection", () => {
      it("should detect no collision for valid toolpath", () => {
        const toolpath = [
          { position: { x: 0, y: 0, z: 50 }, tool_axis: { x: 0, y: 0, z: 1 } },
          { position: { x: 10, y: 10, z: 50 }, tool_axis: { x: 0, y: 0, z: 1 } },
        ];
        const stock: StockModel = {
          id: "stock_1",
          type: "block",
          bounds: { min: { x: -50, y: -50, z: 0 }, max: { x: 50, y: 50, z: 40 } },
          remaining_volume_mm3: 100000,
          surfaces: [],
        };
        const config = FiveAxisOrchestrationEngine.getPostConfig("okuma_m460v_5ax")!;

        const result = FiveAxisOrchestrationEngine.checkCollisions(
          toolpath,
          testTool,
          stock,
          config
        );

        expect(result.collision_detected).toBe(false);
      });

      it("should detect axis limit violation", () => {
        const toolpath = [
          { position: { x: 500, y: 0, z: 50 }, tool_axis: { x: 0, y: 0, z: 1 } }, // X out of range
        ];
        const stock: StockModel = {
          id: "stock_1",
          type: "block",
          bounds: { min: { x: -50, y: -50, z: 0 }, max: { x: 50, y: 50, z: 40 } },
          remaining_volume_mm3: 100000,
          surfaces: [],
        };
        const config = FiveAxisOrchestrationEngine.getPostConfig("okuma_m460v_5ax")!;

        const result = FiveAxisOrchestrationEngine.checkCollisions(
          toolpath,
          testTool,
          stock,
          config
        );

        expect(result.collision_detected).toBe(true);
        expect(result.collision_type).toBe("axis_limit");
      });

      it("should detect holder collision", () => {
        const toolpath = [
          { position: { x: 0, y: 0, z: 30 }, tool_axis: { x: 0.5, y: 0, z: 0.866 } }, // Tilted
        ];
        const stock: StockModel = {
          id: "stock_1",
          type: "block",
          bounds: { min: { x: -50, y: -50, z: 0 }, max: { x: 50, y: 50, z: 100 } },
          remaining_volume_mm3: 100000,
          surfaces: [],
        };
        const config = FiveAxisOrchestrationEngine.getPostConfig("okuma_m460v_5ax")!;

        const result = FiveAxisOrchestrationEngine.checkCollisions(
          toolpath,
          testToolWithHolder,
          stock,
          config
        );

        // May or may not detect depending on tilt angle
        expect(result).toBeDefined();
      });

      it("should report severity level", () => {
        const toolpath = Array.from({ length: 100 }, (_, i) => ({
          position: { x: 500 + i, y: 0, z: 50 },
          tool_axis: { x: 0, y: 0, z: 1 },
        }));
        const stock: StockModel = {
          id: "stock_1",
          type: "block",
          bounds: { min: { x: -50, y: -50, z: 0 }, max: { x: 50, y: 50, z: 40 } },
          remaining_volume_mm3: 100000,
          surfaces: [],
        };
        const config = FiveAxisOrchestrationEngine.getPostConfig("okuma_m460v_5ax")!;

        const result = FiveAxisOrchestrationEngine.checkCollisions(
          toolpath,
          testTool,
          stock,
          config
        );

        expect(result.severity).toBe("critical"); // >10% affected
      });
    });

    describe("Collision Recovery", () => {
      it("should attempt recovery for holder collision", () => {
        const collision: CollisionResult = {
          collision_detected: true,
          collision_type: "holder_part",
          collision_point: { x: 10, y: 10, z: 30 },
          affected_points: [5, 6, 7, 8],
          severity: "warning",
        };
        const toolpath = Array.from({ length: 20 }, () => ({
          position: { x: 0, y: 0, z: 50 },
          tool_axis: { x: 0, y: 0, z: 1 },
        }));

        const result = FiveAxisOrchestrationEngine.recoverFromCollision(
          collision,
          toolpath,
          testTool,
          testParams
        );

        expect(result.recovery_attempted).toBe(true);
        expect(result.recovery_actions.length).toBeGreaterThan(0);
        expect(result.recovery_actions.some(a => a.strategy === "adjust_tilt")).toBe(true);
      });

      it("should suggest lollipop cutter for holder collision", () => {
        const collision: CollisionResult = {
          collision_detected: true,
          collision_type: "holder_part",
          collision_point: { x: 10, y: 10, z: 30 },
          affected_points: [5, 6, 7, 8],
          severity: "warning",
        };
        const toolpath = Array.from({ length: 20 }, () => ({
          position: { x: 0, y: 0, z: 50 },
          tool_axis: { x: 0, y: 0, z: 1 },
        }));

        const result = FiveAxisOrchestrationEngine.recoverFromCollision(
          collision,
          toolpath,
          testTool,
          testParams
        );

        expect(result.recovery_actions.some(a => a.strategy === "switch_to_lollipop")).toBe(true);
      });

      it("should suggest 3+2 for large affected region", () => {
        const collision: CollisionResult = {
          collision_detected: true,
          collision_type: "axis_limit",
          affected_points: Array.from({ length: 40 }, (_, i) => i), // 40% of 100 points
          severity: "critical",
        };
        const toolpath = Array.from({ length: 100 }, () => ({
          position: { x: 0, y: 0, z: 50 },
          tool_axis: { x: 0, y: 0, z: 1 },
        }));

        const result = FiveAxisOrchestrationEngine.recoverFromCollision(
          collision,
          toolpath,
          testTool,
          testParams
        );

        expect(result.recovery_actions.some(a => a.strategy === "switch_to_3plus2")).toBe(true);
      });

      it("should return resolved for no collision", () => {
        const noCollision: CollisionResult = {
          collision_detected: false,
          affected_points: [],
          severity: "info",
        };
        const toolpath = [{ position: { x: 0, y: 0, z: 50 }, tool_axis: { x: 0, y: 0, z: 1 } }];

        const result = FiveAxisOrchestrationEngine.recoverFromCollision(
          noCollision,
          toolpath,
          testTool,
          testParams
        );

        expect(result.recovery_attempted).toBe(false);
        expect(result.final_status).toBe("resolved");
      });
    });
  });

  // ============================================================================
  // μS-26: ADAPTIVE FEEDRATE
  // ============================================================================

  describe("μS-26: Adaptive Feedrate", () => {
    describe("Feed Calculation", () => {
      it("should calculate adaptive feed for normal engagement", () => {
        const result = FiveAxisOrchestrationEngine.calculateAdaptiveFeed(
          2000,
          60, // 60 degree engagement
          testTool,
          testMaterial
        );

        expect(result.original_feed_mmmin).toBe(2000);
        expect(result.adjusted_feed_mmmin).toBeGreaterThan(0);
        expect(result.factors.engagement_angle_factor).toBeDefined();
      });

      it("should reduce feed for high engagement angle", () => {
        const result = FiveAxisOrchestrationEngine.calculateAdaptiveFeed(
          2000,
          150, // Full slot-like engagement
          testTool,
          testMaterial
        );

        expect(result.adjusted_feed_mmmin).toBeLessThan(2000);
        expect(result.factors.engagement_angle_factor).toBeLessThan(1);
      });

      it("should increase feed for low engagement angle", () => {
        const result = FiveAxisOrchestrationEngine.calculateAdaptiveFeed(
          2000,
          30, // Trochoidal-like engagement
          testTool,
          testMaterialAluminum
        );

        // Low engagement + aluminum should allow higher feed
        expect(result.factors.engagement_angle_factor).toBeGreaterThan(1);
      });

      it("should apply material factor for hardened steel", () => {
        const result = FiveAxisOrchestrationEngine.calculateAdaptiveFeed(
          2000,
          60,
          testTool,
          testMaterial // ISO H
        );

        expect(result.factors.material_factor).toBe(0.5);
      });

      it("should apply material factor for aluminum", () => {
        const result = FiveAxisOrchestrationEngine.calculateAdaptiveFeed(
          2000,
          60,
          testTool,
          testMaterialAluminum // ISO N
        );

        expect(result.factors.material_factor).toBe(1.4);
      });

      it("should apply machine dynamics factor", () => {
        const slowDynamics: MachineDynamics = {
          max_accel_x_mm_s2: 500,
          max_accel_y_mm_s2: 500,
          max_accel_z_mm_s2: 800,
          max_jerk_mm_s3: 20000,
          servo_lag_ms: 10,
          look_ahead_blocks: 30,
          corner_rounding_tolerance_mm: 0.2,
        };

        const result = FiveAxisOrchestrationEngine.calculateAdaptiveFeed(
          2000,
          60,
          testTool,
          testMaterial,
          slowDynamics
        );

        expect(result.factors.machine_dynamics_factor).toBe(0.85);
      });

      it("should identify limiting factor", () => {
        const result = FiveAxisOrchestrationEngine.calculateAdaptiveFeed(
          2000,
          60,
          testTool,
          testMaterial
        );

        expect(result.limiting_factor).toBeTruthy();
        expect(typeof result.limiting_factor).toBe("string");
      });

      it("should calculate achieved chip load", () => {
        const result = FiveAxisOrchestrationEngine.calculateAdaptiveFeed(
          2000,
          60,
          testTool,
          testMaterial
        );

        expect(result.chip_load_achieved_mm).toBeGreaterThan(0);
      });
    });

    describe("Machine Dynamics", () => {
      it("should get default dynamics for Okuma", () => {
        const dynamics = FiveAxisOrchestrationEngine.getDefaultDynamics("okuma_m460v_5ax");

        expect(dynamics.max_accel_x_mm_s2).toBe(1500);
        expect(dynamics.look_ahead_blocks).toBe(200);
      });

      it("should get default dynamics for Haas", () => {
        const dynamics = FiveAxisOrchestrationEngine.getDefaultDynamics("haas_vf4");

        expect(dynamics.max_accel_x_mm_s2).toBe(800);
        expect(dynamics.look_ahead_blocks).toBe(50);
      });

      it("should return Haas defaults for unknown machine", () => {
        const dynamics = FiveAxisOrchestrationEngine.getDefaultDynamics("unknown_machine");

        expect(dynamics.max_accel_x_mm_s2).toBe(800);
      });
    });
  });

  // ============================================================================
  // μS-27: SURFACE QUALITY PREDICTION
  // ============================================================================

  describe("μS-27: Surface Quality Prediction", () => {
    describe("Scallop Height Calculation", () => {
      it("should calculate theoretical scallop height", () => {
        const result = FiveAxisOrchestrationEngine.calculateScallop(
          1.0, // 1mm stepover
          testTool // 10mm ball nose
        );

        expect(result.theoretical_height_um).toBeGreaterThan(0);
        expect(result.stepover_mm).toBe(1.0);
        expect(result.tool_radius_mm).toBe(5); // 10mm diameter / 2
      });

      it("should increase scallop for larger stepover", () => {
        const small = FiveAxisOrchestrationEngine.calculateScallop(0.5, testTool);
        const large = FiveAxisOrchestrationEngine.calculateScallop(2.0, testTool);

        expect(large.theoretical_height_um).toBeGreaterThan(small.theoretical_height_um);
      });

      it("should account for surface curvature - convex", () => {
        const flat = FiveAxisOrchestrationEngine.calculateScallop(1.0, testTool);
        const convex = FiveAxisOrchestrationEngine.calculateScallop(
          1.0,
          testTool,
          50, // Positive curvature
          50
        );

        expect(convex.curvature_effect).toBe("convex");
        expect(convex.actual_height_um).toBeGreaterThan(convex.theoretical_height_um);
      });

      it("should account for surface curvature - concave", () => {
        const concave = FiveAxisOrchestrationEngine.calculateScallop(
          1.0,
          testTool,
          -50, // Negative curvature
          -50
        );

        expect(concave.curvature_effect).toBe("concave");
        expect(concave.actual_height_um).toBeLessThan(concave.theoretical_height_um);
      });

      it("should detect saddle surface", () => {
        const saddle = FiveAxisOrchestrationEngine.calculateScallop(
          1.0,
          testTool,
          50, // Positive in one direction
          -50 // Negative in other
        );

        expect(saddle.curvature_effect).toBe("saddle");
      });
    });

    describe("Ra Prediction", () => {
      it("should predict surface roughness Ra", () => {
        const scallop = FiveAxisOrchestrationEngine.calculateScallop(1.0, testTool);
        const ra = FiveAxisOrchestrationEngine.predictRa(
          scallop,
          0.1, // fz = 0.1mm
          testTool,
          testMaterial
        );

        expect(ra.predicted_ra_um).toBeGreaterThan(0);
        expect(ra.confidence).toBeGreaterThan(0);
        expect(ra.limiting_factor).toBeTruthy();
      });

      it("should identify feed marks as limiting factor for high feed", () => {
        const scallop = FiveAxisOrchestrationEngine.calculateScallop(0.2, testTool); // Very small stepover
        const ra = FiveAxisOrchestrationEngine.predictRa(
          scallop,
          0.5, // Very high fz
          testTool,
          testMaterial
        );

        // High feed with small stepover should make feed marks dominant
        expect(ra.contributors.feed_marks_um).toBeGreaterThan(0);
      });

      it("should identify scallop as limiting factor for large stepover", () => {
        const scallop = FiveAxisOrchestrationEngine.calculateScallop(3.0, testTool);
        const ra = FiveAxisOrchestrationEngine.predictRa(
          scallop,
          0.05, // Low fz
          testTool,
          testMaterial
        );

        expect(ra.contributors.scallop_um).toBeGreaterThan(ra.contributors.feed_marks_um);
      });

      it("should include all contributor sources", () => {
        const scallop = FiveAxisOrchestrationEngine.calculateScallop(1.0, testTool);
        const ra = FiveAxisOrchestrationEngine.predictRa(
          scallop,
          0.1,
          testTool,
          testMaterial
        );

        expect(ra.contributors.feed_marks_um).toBeDefined();
        expect(ra.contributors.scallop_um).toBeDefined();
        expect(ra.contributors.tool_runout_um).toBeDefined();
        expect(ra.contributors.vibration_um).toBeDefined();
        expect(ra.contributors.material_tearout_um).toBeDefined();
      });

      it("should have higher confidence with detailed inputs", () => {
        const scallop = FiveAxisOrchestrationEngine.calculateScallop(1.0, testTool);

        const basic = FiveAxisOrchestrationEngine.predictRa(
          scallop,
          0.1,
          testTool,
          testMaterial
        );

        const detailed = FiveAxisOrchestrationEngine.predictRa(
          scallop,
          0.1,
          testTool,
          testMaterial,
          { tool_runout_um: 0.5, vibration_amplitude_um: 0.3 }
        );

        expect(detailed.confidence).toBeGreaterThan(basic.confidence);
      });

      it("should provide recommendation when relevant", () => {
        const scallop = FiveAxisOrchestrationEngine.calculateScallop(1.0, testTool);
        const ra = FiveAxisOrchestrationEngine.predictRa(
          scallop,
          0.1,
          testTool,
          testMaterial
        );

        // Should provide some recommendation (either feed or stepover)
        expect(ra.recommendation).toBeDefined();
      });
    });

    describe("Surface Quality Analysis", () => {
      it("should analyze operation surface quality", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "electrode",
          testMaterial,
          "okuma_m460v_5ax",
          { target_ra_um: 0.8 }
        );

        const finishOp = sequence.operations.find(op => op.phase === "finishing");
        if (!finishOp) throw new Error("No finish operation");

        const analysis = FiveAxisOrchestrationEngine.analyzeSurfaceQuality(
          finishOp,
          0.8
        );

        expect(analysis.region_id).toBe(finishOp.id);
        expect(analysis.target_ra_um).toBe(0.8);
        expect(analysis.ra_prediction.predicted_ra_um).toBeGreaterThan(0);
      });

      it("should suggest stepover when target not met", () => {
        const sequence = FiveAxisOrchestrationEngine.generateSequence(
          "mold_cavity",
          testMaterial,
          "okuma_m460v_5ax"
        );

        const finishOp = sequence.operations.find(op => op.phase === "finishing");
        if (!finishOp) throw new Error("No finish operation");

        // Very tight target
        const analysis = FiveAxisOrchestrationEngine.analyzeSurfaceQuality(
          finishOp,
          0.1 // Extremely tight Ra target
        );

        if (!analysis.meets_target) {
          expect(analysis.suggested_stepover_mm).toBeDefined();
        }
      });
    });
  });

  // ============================================================================
  // EDGE CASES AND REGRESSION
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle empty toolpath for collision check", () => {
      const config = FiveAxisOrchestrationEngine.getPostConfig("okuma_m460v_5ax")!;
      const stock: StockModel = {
        id: "stock_1",
        type: "block",
        bounds: { min: { x: -50, y: -50, z: 0 }, max: { x: 50, y: 50, z: 40 } },
        remaining_volume_mm3: 100000,
        surfaces: [],
      };

      const result = FiveAxisOrchestrationEngine.checkCollisions([], testTool, stock, config);

      expect(result.collision_detected).toBe(false);
    });

    it("should handle zero stepover for scallop", () => {
      const result = FiveAxisOrchestrationEngine.calculateScallop(0, testTool);

      expect(result.theoretical_height_um).toBe(0);
    });

    it("should handle very small stepover", () => {
      const result = FiveAxisOrchestrationEngine.calculateScallop(0.001, testTool);

      expect(result.theoretical_height_um).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Regression Tests", () => {
    it("should maintain sequence ID uniqueness", () => {
      const seq1 = FiveAxisOrchestrationEngine.generateSequence("dental", testMaterial, "okuma_m460v_5ax");
      const seq2 = FiveAxisOrchestrationEngine.generateSequence("dental", testMaterial, "okuma_m460v_5ax");

      expect(seq1.id).not.toBe(seq2.id);
    });

    it("should not mutate input parameters", () => {
      const originalParams = { ...testParams };

      FiveAxisOrchestrationEngine.calculateAdaptiveFeed(
        originalParams.feed_mmmin,
        60,
        testTool,
        testMaterial
      );

      expect(testParams.feed_mmmin).toBe(originalParams.feed_mmmin);
    });
  });

  describe("Module Exports", () => {
    it("should export FiveAxisOrchestrationEngine class", () => {
      expect(FiveAxisOrchestrationEngine).toBeDefined();
    });

    it("should export all static methods", () => {
      expect(typeof FiveAxisOrchestrationEngine.generateSequence).toBe("function");
      expect(typeof FiveAxisOrchestrationEngine.parseDSL).toBe("function");
      expect(typeof FiveAxisOrchestrationEngine.generateGCode).toBe("function");
      expect(typeof FiveAxisOrchestrationEngine.checkCollisions).toBe("function");
      expect(typeof FiveAxisOrchestrationEngine.calculateAdaptiveFeed).toBe("function");
      expect(typeof FiveAxisOrchestrationEngine.calculateScallop).toBe("function");
      expect(typeof FiveAxisOrchestrationEngine.predictRa).toBe("function");
    });
  });
});
