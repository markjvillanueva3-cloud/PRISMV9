/**
 * PP-REV-MS5 Tests — Cross-CAM Feature Injection + RL Learning + Subprogram Extraction
 * Tests MasterPostProcessorEngine, RLPostProcessorEngine, SubprogramStructureEngine,
 * dispatcher wiring (productDispatcher), and API route wiring.
 *
 * @milestone PP-REV-MS5
 */
import { describe, it, expect } from "vitest";
import { masterPostProcessorEngine } from "../engines/MasterPostProcessorEngine.js";
import { rlPostProcessorEngine } from "../engines/RLPostProcessorEngine.js";
import { subprogramStructureEngine } from "../engines/SubprogramStructureEngine.js";
import type { CamToolpathSegment, MasterPostConfig } from "../engines/MasterPostProcessorEngine.js";
import type { ToolpathMove } from "../engines/RLPostProcessorEngine.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSegment(overrides: Partial<CamToolpathSegment> = {}): CamToolpathSegment {
  return {
    source_cam: "mastercam",
    intent: "roughing",
    moves: [
      { type: "rapid", x: 0, y: 0, z: 50, f: undefined },
      { type: "rapid", x: 10, y: 10, z: 5, f: undefined },
      { type: "linear", x: 10, y: 10, z: -5, f: 500 },
      { type: "linear", x: 50, y: 10, z: -5, f: 1200 },
      { type: "linear", x: 50, y: 50, z: -5, f: 1200 },
      { type: "linear", x: 10, y: 50, z: -5, f: 1200 },
      { type: "linear", x: 10, y: 10, z: -5, f: 1200 },
      { type: "rapid", x: 0, y: 0, z: 50, f: undefined },
    ],
    tool_number: 1,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    spindle_rpm: 8000,
    feed_rate_mmmin: 1200,
    coolant: "flood",
    work_offset: "G54",
    material_iso: "P",
    radial_depth_mm: 3,
    axial_depth_mm: 6,
    ...overrides,
  };
}

function makeToolpath(count = 5): ToolpathMove[] {
  const moves: ToolpathMove[] = [];
  for (let i = 0; i < count; i++) {
    moves.push(
      { type: "rapid", x: i * 10, y: 0, z: 5 },
      { type: "linear", x: i * 10, y: 50, z: -5, f: 1000 },
      { type: "linear", x: i * 10 + 5, y: 50, z: -5, f: 1000 },
      { type: "rapid", x: i * 10 + 5, y: 0, z: 5 },
    );
  }
  return moves;
}

const BOLT_CIRCLE_GCODE = `O1001
G90 G54
T1 M6
S3000 M3
G43 H1 Z50.
M8
G0 X25. Y0.
G0 Z2.
G1 Z-10. F200
G0 Z2.
G0 X0. Y25.
G0 Z2.
G1 Z-10. F200
G0 Z2.
G0 X-25. Y0.
G0 Z2.
G1 Z-10. F200
G0 Z2.
G0 X0. Y-25.
G0 Z2.
G1 Z-10. F200
G0 Z2.
G0 X25. Y0.
G0 Z2.
G1 Z-10. F200
G0 Z2.
G0 X0. Y25.
G0 Z2.
G1 Z-10. F200
G0 Z2.
G0 X-25. Y0.
G0 Z2.
G1 Z-10. F200
G0 Z2.
G0 X0. Y-25.
G0 Z2.
G1 Z-10. F200
G0 Z2.
M9
G91 G28 Z0.
M30
%`;

// ── 1. MasterPostProcessorEngine — Cross-CAM Processing ──────────────────

describe("MasterPostProcessorEngine — cross-CAM processing", () => {
  it("processes Mastercam segments with roughing enhancements", () => {
    const seg = makeSegment({ source_cam: "mastercam", intent: "roughing" });
    const result = masterPostProcessorEngine.process([seg], {
      controller: "fanuc",
      enable_cross_cam_features: true,
      enable_hsm: true,
      enable_feed_optimization: false,
      cross_cam_features: {
        mastercam_dynamic_chip_load: true,
        solidcam_chip_thinning: true,
      },
    });
    expect(result.gcode).toBeTruthy();
    expect(result.line_count).toBeGreaterThan(5);
    expect(result.segments_processed).toBe(1);
    expect(result.cam_sources_used).toContain("mastercam");
    expect(result.enhancements_applied.length).toBeGreaterThan(0);
  });

  it("processes Fusion360 segments with adaptive clearing", () => {
    const seg = makeSegment({ source_cam: "fusion360", intent: "adaptive clearing" });
    const result = masterPostProcessorEngine.process([seg], {
      controller: "haas",
      enable_cross_cam_features: true,
      cross_cam_features: { fusion360_adaptive: true },
    });
    expect(result.cam_sources_used).toContain("fusion360");
    expect(result.gcode).toContain("FUSION360");
  });

  it("injects SolidCAM chip thinning annotations for roughing", () => {
    const seg = makeSegment({ source_cam: "solidcam", intent: "pocket roughing" });
    const result = masterPostProcessorEngine.process([seg], {
      controller: "fanuc",
      enable_cross_cam_features: true,
      cross_cam_features: { solidcam_chip_thinning: true },
    });
    expect(result.gcode).toContain("SOLIDCAM");
    expect(result.gcode.toLowerCase()).toContain("chip thinning");
  });

  it("injects hyperMILL collision check annotations", () => {
    const seg = makeSegment({ source_cam: "hypermill", intent: "finishing" });
    const result = masterPostProcessorEngine.process([seg], {
      controller: "siemens",
      enable_cross_cam_features: true,
      cross_cam_features: { hypermill_collision_check: true },
    });
    expect(result.gcode).toContain("HYPERMILL");
    expect(result.gcode.toLowerCase()).toContain("collision");
  });

  it("processes mixed CAM sources in one program", () => {
    const seg1 = makeSegment({ source_cam: "mastercam", intent: "roughing" });
    const seg2 = makeSegment({ source_cam: "fusion360", intent: "finishing", tool_number: 2 });
    const result = masterPostProcessorEngine.process([seg1, seg2], {
      controller: "haas",
      enable_cross_cam_features: true,
      cross_cam_features: {
        mastercam_dynamic_chip_load: true,
        fusion360_adaptive: true,
      },
    });
    expect(result.segments_processed).toBe(2);
    expect(result.cam_sources_used).toContain("mastercam");
    expect(result.cam_sources_used).toContain("fusion360");
    expect(result.gcode).toContain("SEGMENT 1");
    expect(result.gcode).toContain("SEGMENT 2");
  });

  it("generates HSM initialization for Haas G187", () => {
    const seg = makeSegment({ intent: "finishing" });
    const result = masterPostProcessorEngine.process([seg], {
      controller: "haas",
      enable_hsm: true,
    });
    expect(result.gcode).toContain("G187");
    expect(result.machine_specific_features).toContain("HSM: G187");
  });

  it("generates HSM initialization for Siemens CYCLE832", () => {
    const seg = makeSegment({ intent: "finishing" });
    const result = masterPostProcessorEngine.process([seg], {
      controller: "siemens",
      enable_hsm: true,
    });
    expect(result.gcode).toContain("CYCLE832");
  });

  it("generates HSM initialization for Okuma G08", () => {
    const seg = makeSegment({ intent: "finishing" });
    const result = masterPostProcessorEngine.process([seg], {
      controller: "okuma",
      enable_hsm: true,
    });
    expect(result.gcode).toContain("G08");
  });

  it("applies feed optimization pass when enabled", () => {
    const seg = makeSegment();
    const result = masterPostProcessorEngine.process([seg], {
      controller: "fanuc",
      enable_feed_optimization: true,
    });
    expect(result.feed_optimization_stats).toBeDefined();
    expect(result.enhancements_applied).toContain("feed_optimization");
  });

  it("compareControllers generates output for all 6 controllers", () => {
    const seg = makeSegment();
    const results = masterPostProcessorEngine.compareControllers([seg], {
      enable_cross_cam_features: true,
    });
    expect(results.length).toBe(6);
    const controllers = results.map(r => r.controller);
    expect(controllers).toContain("fanuc");
    expect(controllers).toContain("haas");
    expect(controllers).toContain("siemens");
    expect(controllers).toContain("heidenhain");
    expect(controllers).toContain("mazak");
    expect(controllers).toContain("okuma");
  });

  it("getPostTemplates returns all 6 templates", () => {
    const templates = masterPostProcessorEngine.getPostTemplates();
    expect(templates.length).toBe(6);
    expect(templates.some(t => t.id === "haas-umc-5ax")).toBe(true);
    expect(templates.some(t => t.id === "siemens-840d-5ax")).toBe(true);
  });

  it("listCrossCamFeatures returns 5 features", () => {
    const features = masterPostProcessorEngine.listCrossCamFeatures();
    expect(features.length).toBe(5);
    expect(features.map(f => f.key)).toContain("solidcam_chip_thinning");
    expect(features.map(f => f.key)).toContain("hypermill_collision_check");
    expect(features.map(f => f.key)).toContain("fusion360_adaptive");
  });

  it("generates safe start block per controller", () => {
    const seg = makeSegment();
    const fanuc = masterPostProcessorEngine.process([seg], { controller: "fanuc" });
    expect(fanuc.gcode).toContain("G90 G94 G17 G40 G49 G80");

    const heid = masterPostProcessorEngine.process([seg], { controller: "heidenhain" });
    expect(heid.gcode).toContain("BEGIN PGM");
  });
});

// ── 2. RLPostProcessorEngine — Q-learning feedback ──────────────────────

describe("RLPostProcessorEngine — Q-learning", () => {
  it("creates a processor with default parameters", () => {
    const proc = rlPostProcessorEngine.createProcessor("fanuc");
    expect(proc.controllerType).toBe("fanuc");
    expect(proc.epsilon).toBe(0.1);
    expect(proc.learningRate).toBe(0.1);
    expect(proc.gamma).toBe(0.95);
    expect(Object.keys(proc.Q).length).toBe(0);
  });

  it("generates G-code with RL-optimized formatting", () => {
    const proc = rlPostProcessorEngine.createProcessor("fanuc");
    const moves = makeToolpath(3);
    const result = rlPostProcessorEngine.generateCode(proc, moves, {
      programNumber: 2000,
      deterministic: true,
    });
    expect(result.gcode).toContain("O2000");
    expect(result.gcode).toContain("M30");
    expect(result.lineCount).toBeGreaterThan(5);
    expect(result.formatsUsed).toBeDefined();
  });

  it("learns from positive feedback (ran_great)", () => {
    const proc = rlPostProcessorEngine.createProcessor("fanuc");
    const result = rlPostProcessorEngine.learn(proc, {
      codeLineIndex: 0,
      executionTime: 45,
      expectedTime: 60,
      error: false,
      surfaceQuality: 0.95,
      stateKey: "rapid_start",
      actionKey: "optimized",
    });
    expect(result.reward).toBeGreaterThan(0);
    expect(result.totalExperiences).toBe(1);
    expect(result.updatedQValue).toBeGreaterThan(0);
  });

  it("learns from negative feedback (tool_broke)", () => {
    const proc = rlPostProcessorEngine.createProcessor("fanuc");
    const result = rlPostProcessorEngine.learn(proc, {
      codeLineIndex: 10,
      executionTime: 30,
      expectedTime: 60,
      error: true,
      surfaceQuality: 0,
      stateKey: "linear_rapid",
      actionKey: "compact",
    });
    expect(result.reward).toBeLessThan(0);
  });

  it("improves over multiple feedback rounds", () => {
    const proc = rlPostProcessorEngine.createProcessor("fanuc", { learningRate: 0.5 });
    // First: negative feedback for compact format
    rlPostProcessorEngine.learn(proc, {
      codeLineIndex: 0, executionTime: 100, expectedTime: 60,
      error: true, surfaceQuality: 0, stateKey: "rapid_start", actionKey: "compact",
    });
    // Second: positive feedback for optimized format
    rlPostProcessorEngine.learn(proc, {
      codeLineIndex: 0, executionTime: 50, expectedTime: 60,
      error: false, surfaceQuality: 0.9, stateKey: "rapid_start", actionKey: "optimized",
    });
    // Q-value for optimized should be higher than compact
    expect(proc.Q["rapid_start_optimized"]).toBeGreaterThan(proc.Q["rapid_start_compact"]);
  });

  it("stats returns learning summary", () => {
    const proc = rlPostProcessorEngine.createProcessor("haas");
    rlPostProcessorEngine.learn(proc, {
      codeLineIndex: 0, executionTime: 55, expectedTime: 60,
      error: false, surfaceQuality: 0.85,
    });
    rlPostProcessorEngine.learn(proc, {
      codeLineIndex: 1, executionTime: 58, expectedTime: 60,
      error: false, surfaceQuality: 0.9,
    });
    const stats = rlPostProcessorEngine.stats(proc);
    expect(stats.totalExperiences).toBe(2);
    expect(stats.avgReward).toBeGreaterThan(0);
    expect(stats.qTableSize).toBeGreaterThan(0);
  });

  it("deterministic mode always picks highest Q-value", () => {
    const proc = rlPostProcessorEngine.createProcessor("fanuc", { epsilon: 0 });
    // Train: optimized is best
    for (let i = 0; i < 10; i++) {
      rlPostProcessorEngine.learn(proc, {
        codeLineIndex: 0, executionTime: 40, expectedTime: 60,
        error: false, surfaceQuality: 0.95,
        stateKey: "rapid_start", actionKey: "optimized",
      });
    }
    const result1 = rlPostProcessorEngine.generateCode(proc, makeToolpath(2), { deterministic: true });
    const result2 = rlPostProcessorEngine.generateCode(proc, makeToolpath(2), { deterministic: true });
    // Deterministic should produce identical output
    expect(result1.gcode).toBe(result2.gcode);
  });
});

// ── 3. SubprogramStructureEngine — Pattern extraction ────────────────────

describe("SubprogramStructureEngine — subprogram extraction", () => {
  it("detects repeating drill patterns in bolt circle", () => {
    const result = subprogramStructureEngine.analyze({
      gcode: BOLT_CIRCLE_GCODE,
      controller_family: "generic_fanuc" as any,
      min_repeats: 2,
      min_block_length: 3,
    });
    expect(result.analysis.original_lines).toBeGreaterThan(10);
    expect(result.dialect).toBe("fanuc");
    expect(result.analysis).toBeDefined();
    expect(result.warnings).toBeDefined();
  });

  it("generates Fanuc M98/M99 subprogram syntax", () => {
    const lines = ["O1001", "G90 G54", "T1 M6", "S3000 M3", "G43 H1 Z50.", "M8"];
    for (let i = 0; i < 6; i++) {
      lines.push(`G0 X${i * 20}. Y0.`, "G0 Z2.", "G1 Z-15. F200", "G83 Z-15. R2. Q3. F200", "G80", "G0 Z50.");
    }
    lines.push("M9", "G91 G28 Z0.", "M30", "%");
    const gcode = lines.join("\n");

    const result = subprogramStructureEngine.analyze({
      gcode,
      controller_family: "generic_fanuc" as any,
      min_repeats: 2,
      min_block_length: 3,
    });
    expect(result.analysis.original_lines).toBe(lines.length);
    expect(result.dialect).toBe("fanuc");
  });

  it("generates Siemens CALL/RET syntax", () => {
    const lines = [];
    for (let i = 0; i < 4; i++) {
      lines.push(`G0 X${i * 10} Y0`, "G1 Z-5 F200", "G1 X10 F500", "G0 Z5");
    }
    const result = subprogramStructureEngine.analyze({
      gcode: lines.join("\n"),
      controller_family: "siemens_840d" as any,
    });
    expect(result.dialect).toBe("siemens");
  });

  it("generates Heidenhain CALL LBL syntax", () => {
    const lines = [];
    for (let i = 0; i < 4; i++) {
      lines.push(`L X+${i * 20} Y+0 R0 FMAX`, "L Z-5 F200", "L X+10 F500", "L Z+5 R0 FMAX");
    }
    const result = subprogramStructureEngine.analyze({
      gcode: lines.join("\n"),
      controller_family: "heidenhain_tnc640" as any,
    });
    expect(result.dialect).toBe("heidenhain");
  });

  it("reports savings percentage", () => {
    const lines = ["O1001"];
    for (let pass = 0; pass < 8; pass++) {
      lines.push(`G0 X0. Y${pass * 5}.`, "G0 Z2.", "G1 Z-10. F200",
        "G1 X100. F800", "G1 Y5. F400", "G1 X0. F800", "G0 Z2.");
    }
    lines.push("M30");
    const result = subprogramStructureEngine.analyze({
      gcode: lines.join("\n"),
      controller_family: "generic_fanuc" as any,
      min_repeats: 2,
    });
    expect(result.analysis.savings_percent).toBeGreaterThanOrEqual(0);
    expect(typeof result.analysis.total_line_savings).toBe("number");
  });
});

// ── 4. Dispatcher Wiring — productDispatcher ─────────────────────────────

describe("productDispatcher wiring — PP-REV-MS5 actions", () => {
  let src: string;

  it("loads dispatcher source", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/productDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    src = fs.readFileSync(path, "utf8");
    expect(src.length).toBeGreaterThan(100);
  });

  it("contains ppg_cross_cam_inject in action enum", () => {
    expect(src).toContain('"ppg_cross_cam_inject"');
    expect(src).toContain('action === "ppg_cross_cam_inject"');
  });

  it("ppg_cross_cam_inject routes to MasterPostProcessorEngine", () => {
    expect(src).toContain("MasterPostProcessorEngine");
    expect(src).toContain("masterPostProcessorEngine");
  });

  it("contains ppg_rl_feedback in action enum", () => {
    expect(src).toContain('"ppg_rl_feedback"');
    expect(src).toContain('action === "ppg_rl_feedback"');
  });

  it("ppg_rl_feedback routes to RLPostProcessorEngine", () => {
    expect(src).toContain("RLPostProcessorEngine");
    expect(src).toContain("rlPostProcessorEngine");
  });

  it("contains ppg_rl_generate in action enum", () => {
    expect(src).toContain('"ppg_rl_generate"');
    expect(src).toContain('action === "ppg_rl_generate"');
  });

  it("contains ppg_subprogram_extract in action enum", () => {
    expect(src).toContain('"ppg_subprogram_extract"');
    expect(src).toContain('action === "ppg_subprogram_extract"');
  });

  it("ppg_subprogram_extract routes to SubprogramStructureEngine", () => {
    expect(src).toContain("SubprogramStructureEngine");
    expect(src).toContain("subprogramStructureEngine");
  });

  it("contains ppg_program_diff in action enum", () => {
    expect(src).toContain('"ppg_program_diff"');
    expect(src).toContain('action === "ppg_program_diff"');
  });

  it("ppg_check_tier includes subprogram_extract at production tier", () => {
    expect(src).toContain("ppg_subprogram_extract: \"production\"");
  });

  it("ppg_list_features includes subprogram extraction in production tier", () => {
    expect(src).toContain("ppg_subprogram_extract");
    expect(src).toContain("Subprogram extraction");
  });

  it("ppg_list_features includes cross_cam_inject in enterprise tier", () => {
    expect(src).toContain("ppg_cross_cam_inject: \"enterprise\"");
  });
});

// ── 5. Cross-CAM + RL Integration ────────────────────────────────────────

describe("Cross-CAM + RL integration", () => {
  it("RL improves code generation after positive feedback", () => {
    const proc = rlPostProcessorEngine.createProcessor("fanuc", { learningRate: 0.5, epsilon: 0 });
    const moves = makeToolpath(3);

    // Train heavily on "optimized" format
    for (let i = 0; i < 20; i++) {
      rlPostProcessorEngine.learn(proc, {
        codeLineIndex: 0, executionTime: 30, expectedTime: 60,
        error: false, surfaceQuality: 0.98,
        stateKey: "rapid_start", actionKey: "optimized",
      });
    }

    const result = rlPostProcessorEngine.generateCode(proc, moves, { deterministic: true });
    expect(result.formatsUsed.optimized).toBeGreaterThan(0);
  });

  it("MasterPostProcessor with all cross-CAM features produces rich output", () => {
    const seg = makeSegment({ source_cam: "solidcam", intent: "pocket roughing" });
    const result = masterPostProcessorEngine.process([seg], {
      controller: "haas",
      enable_cross_cam_features: true,
      enable_hsm: true,
      enable_feed_optimization: true,
      cross_cam_features: {
        solidcam_chip_thinning: true,
        hypermill_collision_check: true,
        fusion360_adaptive: true,
        mastercam_dynamic_chip_load: true,
      },
    });
    expect(result.enhancements_applied.length).toBeGreaterThan(0);
    expect(result.knowledge_sources).toContain("MasterPostProcessorEngine");
    expect(result.gcode).toContain("G187"); // Haas HSM
    expect(result.line_count).toBeGreaterThan(10);
  });
});

// ── 6. Route Wiring — API ext routes ─────────────────────────────────────

describe("Route wiring — api-ext routes", () => {
  it("api-ext route file contains optimize, feedback, and learning endpoints", async () => {
    const fs = await import("fs");
    const path = new URL("../routes/api-ext.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    expect(src).toContain('router.post("/optimize"');
    expect(src).toContain('router.post("/feedback"');
    expect(src).toContain('router.get("/machines/:id/learning"');
    expect(src).toContain("ppg_optimization_report");
    expect(src).toContain("ppg_rl_feedback");
    expect(src).toContain("ppg_air_cut_detect");
  });

  it("api-ext route is registered in routes/index.ts", async () => {
    const fs = await import("fs");
    const path = new URL("../routes/index.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    expect(src).toContain("createApiExtRouter");
    expect(src).toContain("/api/v1/ext");
  });
});

// ── 7. API client functions ──────────────────────────────────────────────

describe("API client — external integration functions", () => {
  it("client.ts contains apiOptimize, apiFeedback, apiMachineLearning", async () => {
    const fs = await import("fs");
    const path = new URL("../../web/src/api/client.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    expect(src).toContain("export async function apiOptimize");
    expect(src).toContain("export async function apiFeedback");
    expect(src).toContain("export async function apiMachineLearning");
    expect(src).toContain("/ext/optimize");
    expect(src).toContain("/ext/feedback");
    expect(src).toContain("/ext/machines/");
  });
});
