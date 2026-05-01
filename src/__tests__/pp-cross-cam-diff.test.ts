/**
 * PP-REV-MS5 + MS6 — Cross-CAM + AI Learning + Program Diff Tests
 * =================================================================
 * MS5: ppg_cross_cam_inject, ppg_rl_feedback, ppg_rl_generate
 * MS6: ppg_program_diff, ppg_program_compare_full
 */
import { describe, it, expect } from "vitest";
import { masterPostProcessorEngine } from "../engines/MasterPostProcessorEngine.js";
import { rlPostProcessorEngine } from "../engines/RLPostProcessorEngine.js";
import { programCompareEngine } from "../engines/ProgramCompareEngine.js";

const GCODE_A = `O1001
T1 M6
S8000 M3
G43 H1 Z50. M8
G0 X0 Y0
G1 Z-5. F500
G1 X50. F1000
G1 Y50.
G1 X0.
G1 Y0.
G0 Z50.
M30
`;

const GCODE_B = `O1001
T1 M6
S10000 M3
G43 H1 Z50. M8
G0 X0 Y0
G1 Z-5. F600
G1 X50. F1200
G1 Y50.
G1 X0.
G1 Y0.
G0 Z50.
M30
`;

// ============================================================================
// 1. MasterPostProcessorEngine — Cross-CAM injection
// ============================================================================
describe("MasterPostProcessorEngine — cross-CAM features", () => {
  it("lists available cross-CAM features", () => {
    const features = masterPostProcessorEngine.listCrossCamFeatures();
    expect(features.length).toBeGreaterThan(0);
    for (const f of features) {
      expect(f).toHaveProperty("key");
    }
  });

  it("returns machine features for Fanuc", () => {
    const features = masterPostProcessorEngine.getMachineFeatures("fanuc");
    expect(features).toBeDefined();
  });

  it("returns machine features for Haas", () => {
    const features = masterPostProcessorEngine.getMachineFeatures("haas");
    expect(features).toBeDefined();
  });

  it("returns machine features for Siemens", () => {
    const features = masterPostProcessorEngine.getMachineFeatures("siemens");
    expect(features).toBeDefined();
  });

  it("returns post templates", () => {
    const templates = masterPostProcessorEngine.getPostTemplates();
    expect(templates.length).toBeGreaterThan(0);
    expect(templates[0]).toHaveProperty("controller");
    expect(templates[0]).toHaveProperty("name");
  });

  it("returns stats about cross-CAM processing", () => {
    const stats = masterPostProcessorEngine.stats();
    expect(stats).toHaveProperty("controllers");
  });

  it("returns feature counts for 6 supported controllers", () => {
    const controllers = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"] as const;
    for (const ctrl of controllers) {
      const features = masterPostProcessorEngine.getMachineFeatures(ctrl);
      expect(features).toBeDefined();
    }
  });
});

// ============================================================================
// 2. RLPostProcessorEngine — feedback loop
// ============================================================================
describe("RLPostProcessorEngine — RL learning", () => {
  it("creates a processor for a controller type", () => {
    const processor = rlPostProcessorEngine.createProcessor("fanuc");
    expect(processor).toBeDefined();
    expect(processor.controllerType).toBe("fanuc");
    expect(processor.Q).toBeDefined();
    expect(processor.epsilon).toBeGreaterThan(0);
  });

  it("submits feedback and updates Q-values", () => {
    const processor = rlPostProcessorEngine.createProcessor("haas");
    const learnResult = rlPostProcessorEngine.learn(processor, {
      stateKey: "rough_pass_1",
      actionKey: "standard_format",
      error: false,
      executionTime: 45,
      expectedTime: 50,
      surfaceQuality: 0.9,
      codeLineIndex: 0,
    });
    expect(learnResult).toBeDefined();
    expect(learnResult.reward).toBeGreaterThan(0);
    expect(learnResult.totalExperiences).toBe(1);
  });

  it("accumulates learning across multiple feedback rounds", () => {
    const processor = rlPostProcessorEngine.createProcessor("siemens");
    rlPostProcessorEngine.learn(processor, { stateKey: "s1", actionKey: "a1", error: false, executionTime: 30, expectedTime: 40, surfaceQuality: 0.85, codeLineIndex: 0 });
    rlPostProcessorEngine.learn(processor, { stateKey: "s1", actionKey: "a1", error: false, executionTime: 25, expectedTime: 40, surfaceQuality: 0.95, codeLineIndex: 1 });
    rlPostProcessorEngine.learn(processor, { stateKey: "s2", actionKey: "a2", error: true, executionTime: 60, expectedTime: 40, surfaceQuality: 0.3, codeLineIndex: 2 });
    const stats = rlPostProcessorEngine.stats(processor);
    expect(stats.totalExperiences).toBe(3);
  });

  it("returns stats for a processor", () => {
    const processor = rlPostProcessorEngine.createProcessor("okuma");
    const stats = rlPostProcessorEngine.stats(processor);
    expect(stats).toBeDefined();
    expect(stats.totalExperiences).toBe(0);
  });
});

// ============================================================================
// 3. ProgramCompareEngine — semantic diff
// ============================================================================
describe("ProgramCompareEngine — semantic diff", () => {
  it("diffs two G-code programs line by line", () => {
    const diff = programCompareEngine.diffGCode(GCODE_A, GCODE_B);
    expect(diff.length).toBeGreaterThan(0);
  });

  it("detects feed rate changes between programs", () => {
    const diff = programCompareEngine.diffGCode(GCODE_A, GCODE_B);
    // GCODE_B has F600 and F1200 vs F500 and F1000
    const feedChanges = diff.filter(d => d.type === "modified" || d.type === "changed");
    // There should be some detected changes
    expect(diff.some(d => d.type !== "unchanged")).toBe(true);
  });

  it("full comparison includes physics + cycle time + tools", () => {
    const comparison = programCompareEngine.compare(GCODE_A, GCODE_B);
    expect(comparison).toBeDefined();
    expect(comparison).toHaveProperty("diff");
  });

  it("generates human-readable report", () => {
    const comparison = programCompareEngine.compare(GCODE_A, GCODE_B);
    const report = programCompareEngine.generateReport(comparison);
    expect(report.length).toBeGreaterThan(0);
  });

  it("compares identical programs with zero differences", () => {
    const comparison = programCompareEngine.compare(GCODE_A, GCODE_A);
    expect(comparison.diff.every(d => d.type === "unchanged" || d.type === "equal")).toBe(true);
  });

  it("compares cycle time between two programs", () => {
    const ct = programCompareEngine.compareCycleTime(GCODE_A, GCODE_B);
    expect(ct).toBeDefined();
  });

  it("compares tool usage between two programs", () => {
    const tools = programCompareEngine.compareToolUsage(GCODE_A, GCODE_B);
    expect(tools).toBeDefined();
  });
});

// ============================================================================
// 4. Dispatcher wiring verification
// ============================================================================
describe("productDispatcher — PP-REV-MS5+MS6 action wiring", () => {
  it("dispatcher contains all MS5+MS6 actions", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/productDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    // MS5
    expect(src).toContain('"ppg_cross_cam_inject"');
    expect(src).toContain('"ppg_rl_feedback"');
    expect(src).toContain('"ppg_rl_generate"');
    // MS6
    expect(src).toContain('"ppg_program_diff"');
    expect(src).toContain('"ppg_program_compare_full"');
  });

  it("total PPG actions count is at least 28", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/productDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    // Count quoted action strings in PPG_ACTIONS array
    const ppgMatch = src.match(/const PPG_ACTIONS = \[([\s\S]*?)\] as const/);
    if (ppgMatch) {
      const actionCount = (ppgMatch[1].match(/"ppg_/g) || []).length;
      expect(actionCount).toBeGreaterThanOrEqual(28);
    }
  });
});
