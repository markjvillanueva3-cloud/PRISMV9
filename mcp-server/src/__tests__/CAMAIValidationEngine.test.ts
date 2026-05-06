/**
 * CAMAIValidationEngine.test.ts — CAM-EXHAUST-MS0/U-CAM127
 *
 * Coverage axes:
 *   - default 15-scenario suite all passes against the live engines
 *     (≥0.95 match rate gate)
 *   - report schema is well-formed and version-tagged
 *   - threshold getter returns the documented 0.95
 *   - per-category match-rate breakdown sums to scenario_count
 *   - PASS verdict when match_rate ≥ threshold
 *   - FAIL verdict when match_rate < threshold (synthetic failing scenario)
 *   - empty scenarios array → match_rate=0, verdict=FAIL
 *   - outputPath option writes a valid JSON file with the report contents
 *   - custom scenarios option overrides defaults
 *   - dispatcher round-trip via camDispatcher → cam_ai_validate
 *   - per-scenario duration is non-negative (timing instrumentation works)
 *   - scenario IDs are unique within the suite
 *   - engines_tested lists exactly the five U-CAM117..122 engines
 *   - report.unitId is locked to "U-CAM127"
 *   - generatedAt is a valid ISO timestamp
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  CAMAIValidationEngine,
  type ValidationScenarioResult,
  type ValidationReport,
  type ScenarioCategory,
} from "../engines/CAMAIValidationEngine.js";
import { CAMConfidenceCalibrationEngine } from "../engines/CAMConfidenceCalibrationEngine.js";
import { CAMFeedbackLoopEngine } from "../engines/CAMFeedbackLoopEngine.js";
import { CAMTransferLearningEngine } from "../engines/CAMTransferLearningEngine.js";
import { CAMModelServingEngine } from "../engines/CAMModelServingEngine.js";

// Canonical fake-server harness pattern (see CAMFeedbackLoopEngine.test.ts:728-773).
// registerCamDispatcher installs a single MCP tool handler; we capture and
// invoke it directly so we exercise the real switch-case routing without
// needing a live MCP server.
type DispatcherHandler = (input: {
  action: string;
  params?: Record<string, unknown>;
}) => Promise<unknown>;

const EXPECTED_ENGINES = [
  "CAMReasoningChainEngine",
  "CAMConfidenceCalibrationEngine",
  "CAMFeedbackLoopEngine",
  "CAMTransferLearningEngine",
  "CAMModelServingEngine",
];

const EXPECTED_THRESHOLD = 0.95;
const EXPECTED_SCHEMA_VERSION = "1.0.0";
const DEFAULT_SCENARIO_COUNT = 16;
const DEFAULT_SUITE_PASS_COUNT = 16;       // all 16 default scenarios match
const DEFAULT_SUITE_MATCH_RATE = 1.0;      // 16 / 16

// Helper to build a single literal pass scenario without using Array.from /
// synthetic mass-generation. Each call site must explicitly enumerate the
// scenarios it needs.
function makeSyntheticPassScenario(id: string): ValidationScenarioResult {
  return {
    id,
    description: "synthetic pass for harness aggregation tests",
    category: "gate",
    verdict: "pass",
    expected: 1,
    actual: 1,
    durationMs: 0,
  };
}

function makeSyntheticFailScenario(id: string): ValidationScenarioResult {
  return {
    id,
    description: "synthetic fail for harness aggregation tests",
    category: "lora",
    verdict: "fail",
    expected: 1,
    actual: 0,
    durationMs: 0,
    reason: "synthetic fail",
  };
}

describe("CAMAIValidationEngine — production-readiness validation harness", () => {
  beforeEach(() => {
    CAMConfidenceCalibrationEngine.clearOutcomes();
    CAMFeedbackLoopEngine.clearAll();
    CAMTransferLearningEngine.clearAll();
    CAMModelServingEngine.clearAll();
  });
  afterEach(() => {
    CAMModelServingEngine.clearAll();
    CAMTransferLearningEngine.clearAll();
    CAMFeedbackLoopEngine.clearAll();
    CAMConfidenceCalibrationEngine.clearOutcomes();
  });

  it("getThreshold returns the documented production-readiness threshold (0.95)", () => {
    expect(CAMAIValidationEngine.getThreshold()).toBe(EXPECTED_THRESHOLD);
  });

  it("getDefaultScenarios ships exactly 16 scenarios", () => {
    const defaults = CAMAIValidationEngine.getDefaultScenarios();
    expect(defaults.length).toBe(DEFAULT_SCENARIO_COUNT);
  });

  it("runValidation against default suite produces match_rate=1.0 (16/16) PASS verdict", async () => {
    const report = await CAMAIValidationEngine.runValidation();
    expect(report.scenario_count).toBe(DEFAULT_SCENARIO_COUNT);
    expect(report.match_count).toBe(DEFAULT_SUITE_PASS_COUNT);
    expect(report.match_rate).toBe(DEFAULT_SUITE_MATCH_RATE);
    expect(report.verdict).toBe("PASS");
  });

  it("report shape — schemaVersion, unitId, threshold, generatedAt are exactly the documented values", async () => {
    const report = await CAMAIValidationEngine.runValidation();
    expect(report.schemaVersion).toBe(EXPECTED_SCHEMA_VERSION);
    expect(report.unitId).toBe("U-CAM127");
    expect(report.threshold).toBe(EXPECTED_THRESHOLD);
    expect(typeof report.generatedAt).toBe("string");
    expect(Number.isFinite(Date.parse(report.generatedAt))).toBe(true);
  });

  it("engines_tested lists exactly the five U-CAM117..122 engines in canonical order", async () => {
    const report = await CAMAIValidationEngine.runValidation();
    expect(report.engines_tested).toEqual(EXPECTED_ENGINES);
  });

  it("category_match_rates totals reconcile exactly with scenario_count", async () => {
    const report = await CAMAIValidationEngine.runValidation();
    let aggregateTotal = 0;
    let aggregatePassed = 0;
    for (const cat of Object.keys(report.category_match_rates) as ScenarioCategory[]) {
      const bucket = report.category_match_rates[cat];
      aggregateTotal += bucket.total;
      aggregatePassed += bucket.passed;
      const expectedRate = bucket.total === 0 ? 0 : bucket.passed / bucket.total;
      expect(bucket.rate).toBe(expectedRate);
    }
    expect(aggregateTotal).toBe(report.scenario_count);
    expect(aggregatePassed).toBe(report.match_count);
  });

  it("every scenario in the default suite reports a finite non-negative duration", async () => {
    const report = await CAMAIValidationEngine.runValidation();
    for (const r of report.scenarios) {
      expect(Number.isFinite(r.durationMs)).toBe(true);
      // Lower bound is exact 0 (instantaneous scenarios are valid); only
      // upper bound is the test-suite wall-clock budget.
      expect(r.durationMs >= 0).toBe(true);
    }
  });

  it("scenario IDs in the default suite are all unique (size matches count)", async () => {
    const report = await CAMAIValidationEngine.runValidation();
    const ids = report.scenarios.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    expect(unique.size).toBe(DEFAULT_SCENARIO_COUNT);
  });

  it("every scenario in the default suite has populated id/description and verdict in {pass,fail}", async () => {
    const report = await CAMAIValidationEngine.runValidation();
    for (const r of report.scenarios) {
      expect(r.verdict === "pass" || r.verdict === "fail").toBe(true);
      expect(typeof r.id).toBe("string");
      expect(r.id.length > 0).toBe(true);
      expect(typeof r.description).toBe("string");
      expect(r.description.length > 0).toBe(true);
    }
  });

  it("custom scenarios option overrides the default suite", async () => {
    const custom = [
      () => makeSyntheticPassScenario("custom_pass_1"),
      () => makeSyntheticPassScenario("custom_pass_2"),
    ];
    const report = await CAMAIValidationEngine.runValidation({ scenarios: custom });
    expect(report.scenario_count).toBe(2);
    expect(report.match_count).toBe(2);
    expect(report.match_rate).toBe(1);
    expect(report.verdict).toBe("PASS");
    expect(report.scenarios[0].id).toBe("custom_pass_1");
    expect(report.scenarios[1].id).toBe("custom_pass_2");
  });

  it("FAIL verdict — match_rate=0.0 (1 fail / 1 total)", async () => {
    const custom = [() => makeSyntheticFailScenario("only_fail")];
    const report = await CAMAIValidationEngine.runValidation({ scenarios: custom });
    expect(report.match_rate).toBe(0);
    expect(report.match_count).toBe(0);
    expect(report.scenario_count).toBe(1);
    expect(report.verdict).toBe("FAIL");
  });

  it("FAIL verdict — match_rate=0.5 (1 pass / 1 fail) below 0.95 threshold", async () => {
    const custom = [
      () => makeSyntheticPassScenario("p1"),
      () => makeSyntheticFailScenario("f1"),
    ];
    const report = await CAMAIValidationEngine.runValidation({ scenarios: custom });
    expect(report.match_rate).toBe(0.5);
    expect(report.match_count).toBe(1);
    expect(report.scenario_count).toBe(2);
    expect(report.verdict).toBe("FAIL");
  });

  it("empty scenarios array → match_rate=0, verdict=FAIL (defends against silent no-op pass)", async () => {
    const report = await CAMAIValidationEngine.runValidation({ scenarios: [] });
    expect(report.scenario_count).toBe(0);
    expect(report.match_count).toBe(0);
    expect(report.match_rate).toBe(0);
    expect(report.verdict).toBe("FAIL");
  });

  it("outputPath option writes a JSON file that round-trips to an equivalent report", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "prism-cam-val-"));
    const outPath = join(tmpRoot, "validation-report.json");
    try {
      const report = await CAMAIValidationEngine.runValidation({ outputPath: outPath });
      expect(existsSync(outPath)).toBe(true);
      const onDisk = JSON.parse(readFileSync(outPath, "utf8")) as ValidationReport;
      expect(onDisk.schemaVersion).toBe(report.schemaVersion);
      expect(onDisk.unitId).toBe(report.unitId);
      expect(onDisk.scenario_count).toBe(report.scenario_count);
      expect(onDisk.match_count).toBe(report.match_count);
      expect(onDisk.match_rate).toBe(report.match_rate);
      expect(onDisk.verdict).toBe(report.verdict);
      expect(onDisk.scenarios.length).toBe(report.scenarios.length);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("outputPath creates parent directories if missing", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "prism-cam-val-mk-"));
    const nestedPath = join(tmpRoot, "deep", "nested", "report.json");
    try {
      await CAMAIValidationEngine.runValidation({
        scenarios: [() => makeSyntheticPassScenario("tiny")],
        outputPath: nestedPath,
      });
      expect(existsSync(nestedPath)).toBe(true);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("dispatcher round-trip — prism_cam:cam_ai_validate registered in ACTIONS enum and invokes engine", async () => {
    let capturedHandler: DispatcherHandler | null = null;
    const fakeServer = {
      tool: (
        _name: string,
        _desc: string,
        _schema: unknown,
        handler: DispatcherHandler,
      ) => { capturedHandler = handler; },
    };
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_ai_validate");
    mod.registerCamDispatcher(fakeServer);
    expect(capturedHandler).not.toBeNull();
    const handler = capturedHandler as unknown as DispatcherHandler;

    const raw = await handler({ action: "cam_ai_validate", params: {} });
    const r = raw as { content?: Array<{ text: string }> };
    const out = (r.content?.[0]?.text
      ? JSON.parse(r.content[0].text)
      : raw) as { success: boolean; report: ValidationReport };

    expect(out.success).toBe(true);
    expect(out.report.unitId).toBe("U-CAM127");
    expect(out.report.schemaVersion).toBe(EXPECTED_SCHEMA_VERSION);
    expect(out.report.scenario_count).toBe(DEFAULT_SCENARIO_COUNT);
    expect(out.report.match_count).toBe(DEFAULT_SUITE_PASS_COUNT);
    expect(out.report.match_rate).toBe(DEFAULT_SUITE_MATCH_RATE);
    expect(out.report.verdict).toBe("PASS");
    expect(out.report.engines_tested).toEqual(EXPECTED_ENGINES);
  });

  it("dispatcher route honors outputPath option (writes report through dispatcher)", async () => {
    let capturedHandler: DispatcherHandler | null = null;
    const fakeServer = {
      tool: (
        _name: string,
        _desc: string,
        _schema: unknown,
        handler: DispatcherHandler,
      ) => { capturedHandler = handler; },
    };
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    mod.registerCamDispatcher(fakeServer);
    const handler = capturedHandler as unknown as DispatcherHandler;

    const tmpRoot = mkdtempSync(join(tmpdir(), "prism-cam-val-dsp-"));
    const outPath = join(tmpRoot, "from-dispatcher.json");
    try {
      const raw = await handler({
        action: "cam_ai_validate",
        params: { outputPath: outPath },
      });
      const r = raw as { content?: Array<{ text: string }> };
      const out = (r.content?.[0]?.text
        ? JSON.parse(r.content[0].text)
        : raw) as { success: boolean; report: ValidationReport };
      expect(out.success).toBe(true);
      expect(existsSync(outPath)).toBe(true);
      const onDisk = JSON.parse(readFileSync(outPath, "utf8")) as ValidationReport;
      expect(onDisk.match_count).toBe(out.report.match_count);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("threshold boundary — 4/5 = 0.80 is below 0.95 (FAIL)", async () => {
    // 4 explicit pass scenarios + 1 fail. Each enumerated literally.
    const custom = [
      () => makeSyntheticPassScenario("b1_p1"),
      () => makeSyntheticPassScenario("b1_p2"),
      () => makeSyntheticPassScenario("b1_p3"),
      () => makeSyntheticPassScenario("b1_p4"),
      () => makeSyntheticFailScenario("b1_f1"),
    ];
    const report = await CAMAIValidationEngine.runValidation({ scenarios: custom });
    expect(report.match_count).toBe(4);
    expect(report.scenario_count).toBe(5);
    expect(report.match_rate).toBe(0.8);
    expect(report.verdict).toBe("FAIL");
  });

  it("threshold boundary — 19/20 = 0.95 exactly is PASS (≥ not >)", async () => {
    // 19 explicit pass scenarios + 1 fail. Each enumerated literally so a
    // future edit that mass-generates scenarios doesn't slip past review.
    const custom = [
      () => makeSyntheticPassScenario("b2_p01"),
      () => makeSyntheticPassScenario("b2_p02"),
      () => makeSyntheticPassScenario("b2_p03"),
      () => makeSyntheticPassScenario("b2_p04"),
      () => makeSyntheticPassScenario("b2_p05"),
      () => makeSyntheticPassScenario("b2_p06"),
      () => makeSyntheticPassScenario("b2_p07"),
      () => makeSyntheticPassScenario("b2_p08"),
      () => makeSyntheticPassScenario("b2_p09"),
      () => makeSyntheticPassScenario("b2_p10"),
      () => makeSyntheticPassScenario("b2_p11"),
      () => makeSyntheticPassScenario("b2_p12"),
      () => makeSyntheticPassScenario("b2_p13"),
      () => makeSyntheticPassScenario("b2_p14"),
      () => makeSyntheticPassScenario("b2_p15"),
      () => makeSyntheticPassScenario("b2_p16"),
      () => makeSyntheticPassScenario("b2_p17"),
      () => makeSyntheticPassScenario("b2_p18"),
      () => makeSyntheticPassScenario("b2_p19"),
      () => makeSyntheticFailScenario("b2_f1"),
    ];
    const report = await CAMAIValidationEngine.runValidation({ scenarios: custom });
    expect(report.match_count).toBe(19);
    expect(report.scenario_count).toBe(20);
    expect(report.match_rate).toBe(EXPECTED_THRESHOLD); // exactly 0.95
    expect(report.verdict).toBe("PASS");
  });

  it("scenario categories — every default-suite scenario lands in exactly one of the 6 active categories", async () => {
    const report = await CAMAIValidationEngine.runValidation();
    const categoriesSeen = new Set(report.scenarios.map((s) => s.category));
    expect(categoriesSeen.has("gate")).toBe(true);
    expect(categoriesSeen.has("lora")).toBe(true);
    expect(categoriesSeen.has("drift")).toBe(true);
    expect(categoriesSeen.has("transfer")).toBe(true);
    expect(categoriesSeen.has("calibration")).toBe(true);
    expect(categoriesSeen.has("serving")).toBe(true);
    expect(categoriesSeen.has("feedback")).toBe(true);
    // Exact count of distinct categories used by the default suite.
    expect(categoriesSeen.size).toBe(7);
  });
});
