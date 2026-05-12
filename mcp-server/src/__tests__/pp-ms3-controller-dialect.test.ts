/**
 * PP-MS3 Tests: Controller Dialect Engine + Motion Optimization
 * Tests: 15 controller dialects, canned cycle translation, feature codes,
 * tool change sequences, motion dynamics, controller feature injection
 */
import { describe, it, expect } from "vitest";
import { controllerDialectEngine } from "../engines/ControllerDialectEngine.js";
import {
  postProcessorPipelineEngine,
  type MaterialContext,
  type MachineContext,
  type ToolContext,
} from "../engines/PostProcessorPipelineEngine.js";

// ═══ ControllerDialectEngine Tests ═══

describe("ControllerDialectEngine", () => {
  describe("Dialect Resolution", () => {
    it("resolves all 17 dialect IDs", () => {
      const ids = [
        "fanuc_0i", "fanuc_30i", "fanuc_31i",
        "siemens_840d", "siemens_one",
        "heidenhain_tnc640", "heidenhain_tnc7",
        "haas_ngc",
        "mazak_smooth_ai", "mazak_smooth_g",
        "okuma_osp_p300", "okuma_osp_p500",
        "brother_speedio", "mitsubishi_m80", "fagor_8065",
        "generic_fanuc", "generic_iso",
      ];
      for (const id of ids) {
        const d = controllerDialectEngine.getDialect(id);
        expect(d.id).toBe(id);
        expect(d.display_name).toBeTruthy();
        expect(d.manufacturer).toBeTruthy();
      }
    });

    it("resolves aliases (fanuc→generic_fanuc, haas→haas_ngc, etc.)", () => {
      expect(controllerDialectEngine.getDialect("fanuc").id).toBe("generic_fanuc");
      expect(controllerDialectEngine.getDialect("haas").id).toBe("haas_ngc");
      expect(controllerDialectEngine.getDialect("siemens").id).toBe("siemens_840d");
      expect(controllerDialectEngine.getDialect("heidenhain").id).toBe("heidenhain_tnc640");
      expect(controllerDialectEngine.getDialect("mazak").id).toBe("mazak_smooth_ai");
      expect(controllerDialectEngine.getDialect("okuma").id).toBe("okuma_osp_p300");
    });

    it("falls back to generic_fanuc for unknown controller", () => {
      const d = controllerDialectEngine.getDialect("unknown_xyz");
      expect(d.id).toBe("generic_fanuc");
    });

    it("lists all dialects", () => {
      const list = controllerDialectEngine.listDialects();
      expect(list.length).toBeGreaterThanOrEqual(17);
      expect(list.some(d => d.manufacturer === "Fanuc")).toBe(true);
      expect(list.some(d => d.manufacturer === "Siemens")).toBe(true);
      expect(list.some(d => d.manufacturer === "Heidenhain")).toBe(true);
    });
  });

  describe("Canned Cycle Translation", () => {
    it("translates G81 (Fanuc) → CYCLE81 (Siemens)", () => {
      const result = controllerDialectEngine.translateCannedCycle("G81", "fanuc", "siemens");
      expect(result).toBe("CYCLE81");
    });

    it("translates G83 (Fanuc) → CYCLE83 (Siemens)", () => {
      const result = controllerDialectEngine.translateCannedCycle("G83", "fanuc", "siemens");
      expect(result).toBe("CYCLE83");
    });

    it("translates G84 (Fanuc) → CYCLE84 (Siemens)", () => {
      const result = controllerDialectEngine.translateCannedCycle("G84", "fanuc", "siemens");
      expect(result).toBe("CYCLE84");
    });

    it("translates G81 (Fanuc) → CYCL DEF 200 (Heidenhain)", () => {
      const result = controllerDialectEngine.translateCannedCycle("G81", "fanuc", "heidenhain");
      expect(result).toBe("CYCL DEF 200");
    });

    it("translates G83 (Fanuc) → CYCL DEF 205 (Heidenhain)", () => {
      const result = controllerDialectEngine.translateCannedCycle("G83", "fanuc", "heidenhain");
      expect(result).toBe("CYCL DEF 205");
    });

    it("Mazak uses BORE1 instead of G85", () => {
      const d = controllerDialectEngine.getDialect("mazak");
      expect(d.canned_cycles.bore).toBe("BORE1");
    });
  });

  describe("Controller-Specific Syntax", () => {
    it("Fanuc uses parentheses comments", () => {
      const d = controllerDialectEngine.getDialect("fanuc");
      expect(d.comment_style).toBe("parentheses");
      expect(controllerDialectEngine.formatComment("fanuc", "test")).toBe("(test)");
    });

    it("Siemens uses semicolon comments", () => {
      const d = controllerDialectEngine.getDialect("siemens");
      expect(d.comment_style).toBe("semicolon");
      expect(controllerDialectEngine.formatComment("siemens", "test")).toBe("; test");
    });

    it("Heidenhain uses BEGIN PGM / END PGM", () => {
      const d = controllerDialectEngine.getDialect("heidenhain");
      expect(d.program_start[0]).toContain("BEGIN PGM");
      expect(d.program_end[0]).toContain("END PGM");
    });

    it("Fanuc uses % / O / M30 / %", () => {
      const d = controllerDialectEngine.getDialect("fanuc");
      expect(d.program_start[0]).toBe("%");
      expect(d.program_end).toContain("M30");
    });

    it("Haas uses G43 for tool length comp", () => {
      const d = controllerDialectEngine.getDialect("haas");
      expect(d.tool_change_sequence.some(l => l.includes("G43"))).toBe(true);
    });

    it("Siemens uses D1 for tool offset activation", () => {
      const d = controllerDialectEngine.getDialect("siemens");
      expect(d.tool_change_sequence).toContain("D1");
    });
  });

  describe("Controller Features", () => {
    it("Haas has G187 smoothing modes (P1/P2/P3)", () => {
      const codes = controllerDialectEngine.getFeatureCodes("haas", "roughing");
      expect(codes.some(c => c.includes("G187") && c.includes("P1"))).toBe(true);
      const finishCodes = controllerDialectEngine.getFeatureCodes("haas", "finishing");
      expect(finishCodes.some(c => c.includes("G187") && c.includes("P3"))).toBe(true);
    });

    it("Siemens has CYCLE832 for HSC", () => {
      const d = controllerDialectEngine.getDialect("siemens_840d");
      expect(d.features.hsc_mode?.on).toContain("CYCLE832");
    });

    it("Fanuc 31i has AI Contour Control (G05.1)", () => {
      const d = controllerDialectEngine.getDialect("fanuc_31i");
      expect(d.features.hsc_mode?.on).toContain("G05.1");
    });

    it("Heidenhain has FUNCTION TCPM for 5-axis", () => {
      const d = controllerDialectEngine.getDialect("heidenhain_tnc640");
      expect(d.features.tcpc?.on).toContain("FUNCTION TCPM");
    });

    it("Siemens has TRAORI for 5-axis", () => {
      const d = controllerDialectEngine.getDialect("siemens_840d");
      expect(d.features.tcpc?.on).toBe("TRAORI");
    });

    it("Fanuc 31i has G43.4 for TCPC", () => {
      const d = controllerDialectEngine.getDialect("fanuc_31i");
      expect(d.features.tcpc?.on).toContain("G43.4");
    });

    it("finishing mode gets more feature codes than roughing", () => {
      const rough = controllerDialectEngine.getFeatureCodes("siemens_840d", "roughing");
      const finish = controllerDialectEngine.getFeatureCodes("siemens_840d", "finishing");
      expect(finish.length).toBeGreaterThanOrEqual(rough.length);
    });
  });

  describe("Tool Change Generation", () => {
    it("generates Fanuc tool change", () => {
      const lines = controllerDialectEngine.generateToolChange("fanuc", 3);
      expect(lines.some(l => l.includes("T3"))).toBe(true);
      expect(lines.some(l => l.includes("M6"))).toBe(true);
    });

    it("generates Heidenhain TOOL CALL", () => {
      const lines = controllerDialectEngine.generateToolChange("heidenhain", 5, 8000);
      expect(lines[0]).toContain("TOOL CALL 5");
      expect(lines[0]).toContain("S8000");
    });

    it("generates Siemens T + M6 + D1", () => {
      const lines = controllerDialectEngine.generateToolChange("siemens", 7);
      expect(lines).toContain("T7");
      expect(lines).toContain("M6");
      expect(lines).toContain("D1");
    });
  });

  describe("Line Validation", () => {
    it("validates comment style (Fanuc rejects semicolons)", () => {
      const r = controllerDialectEngine.validateLine("fanuc", "; this is wrong");
      expect(r.valid).toBe(false);
      expect(r.issues.length).toBeGreaterThan(0);
    });

    it("validates comment style (Siemens rejects parentheses)", () => {
      const r = controllerDialectEngine.validateLine("siemens", "(this is wrong)");
      expect(r.valid).toBe(false);
    });

    it("accepts correct comment style", () => {
      const fanuc = controllerDialectEngine.validateLine("fanuc", "(correct comment)");
      expect(fanuc.valid).toBe(true);
      const siemens = controllerDialectEngine.validateLine("siemens", "; correct comment");
      expect(siemens.valid).toBe(true);
    });
  });
});

// ═══ Pipeline Motion Stages Tests ═══

describe("PP-MS3: Pipeline Motion + Controller Stages", () => {
  const STEEL: MaterialContext = {
    id: "4140", name: "4140 Steel", iso_group: "P",
    kc1_1: 2000, mc: 0.25, resolution_confidence: 1.0,
  };
  const TOOL: ToolContext = {
    id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
    material: "carbide", resolution_confidence: 1.0,
  };
  const MACHINE: MachineContext = {
    id: "vf2", name: "Haas VF-2", brand: "Haas", controller: "haas",
    max_rpm: 8100, max_power_kW: 22.4,
    rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
    work_volume: { x: 762, y: 406, z: 508 },
    axes: 3, resolution_confidence: 1.0,
  };
  const GCODE = "T1 M6\nS3000 M3\nG01 X50 Y0 Z-5 F800\nG01 X50 Y30\nG01 X0 Y30\nG00 Z5\n";
  const BASE_STAGES = {
    constitutive: false, stability_lobes: false,
    engagement_analysis: false, adaptive_feed: false,
    corner_detection: false, plunge_detection: false,
    wear_progression: false, thermal_tracking: false,
    safety_analysis: false, playbook_rules: false,
  };

  describe("Stage 3.2: Motion Dynamics", () => {
    it("runs motion dynamics stage", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL], machine: MACHINE,
        stages: { ...BASE_STAGES, motion_dynamics: true },
      });
      const stage = r.stages.find(s => s.stage === "3.2_motion_dynamics");
      expect(stage?.status).toBe("pass");
    });

    it("is skipped by default (opt-in)", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL],
        stages: { ...BASE_STAGES },
      });
      const stage = r.stages.find(s => s.stage === "3.2_motion_dynamics");
      expect(stage?.status).toBe("skipped");
    });

    it("trapezoidal invariant: v_max = sqrt(2*a*d)", () => {
      const a = 2000; // mm/s²
      const d = 5; // mm (short segment)
      const v_max = Math.sqrt(2 * a * d); // mm/s
      expect(v_max).toBeCloseTo(141.4, 0); // ~141 mm/s = 8485 mm/min
      // A 5mm segment can't reach 10000 mm/min with 2000mm/s² accel
      expect(v_max * 60).toBeLessThan(10000);
    });
  });

  describe("Stage 3.5: Controller Feature Injection", () => {
    it("injects Haas G187 for roughing", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL], machine: MACHINE,
        operations: [{ id: 0, type: "roughing", tool_number: 1, blocks: [] }],
        stages: { ...BASE_STAGES, controller_features: true },
      });
      const stage = r.stages.find(s => s.stage === "3.5_controller_features");
      expect(stage?.status).toBe("pass");
      const data = stage?.data as any;
      expect(data?.controller).toContain("Haas");
      expect(data?.features_injected?.some((f: string) => f.includes("G187"))).toBe(true);
    });

    it("selects finishing mode for finish operations", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL], machine: MACHINE,
        operations: [{ id: 0, type: "finishing", tool_number: 1, blocks: [] }],
        stages: { ...BASE_STAGES, controller_features: true },
      });
      const data = (r.stages.find(s => s.stage === "3.5_controller_features")?.data as any);
      expect(data?.operation_mode).toBe("finishing");
    });
  });

  describe("Phase 3 Integration", () => {
    it("Phase 3 stages appear in pipeline output", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: GCODE, material: STEEL, tools: [TOOL], machine: MACHINE,
        stages: { ...BASE_STAGES, motion_dynamics: true, controller_features: true },
      });
      const phase3 = r.stages.filter(s => s.phase === 3);
      expect(phase3.length).toBeGreaterThanOrEqual(2);
      expect(phase3.map(s => s.stage)).toContain("3.2_motion_dynamics");
      expect(phase3.map(s => s.stage)).toContain("3.5_controller_features");
    });
  });
});
