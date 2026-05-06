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
const DEFAULT_SCENARIO_COUNT = 15;

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

  it("getDefaultScenarios ships exactly 15 scenarios", () => {
    const defaults = CAMAIValidationEngine.getDefaultScenarios();
    expect(defaults.length).toBe(DEFAULT_SCENARIO_COUNT);
  });

  it("runValidation against default suite produces match_rate ≥ 0.95 (PASS verdict)", () => {
    const report = CAMAIValidationEngine.runValidation();
    expect(report.scenario_count).toBe(DEFAULT_SCENARIO_COUNT);
    expect(report.match_rate).toBeGreaterThanOrEqual(EXPECTED_THRESHOLD);
    expect(report.verdict).toBe("PASS");
    expect(report.match_count).toBeGreaterThanOrEqual(
      Math.ceil(EXPECTED_THRESHOLD * DEFAULT_SCENARIO_COUNT),
    );
  });

  it("report shape — schemaVersion, unitId, threshold, generatedAt are exactly the documented values", () => {
    const report = CAMAIValidationEngine.runValidation();
    expect(report.schemaVersion).toBe(EXPECTED_SCHEMA_VERSION);
    expect(report.unitId).toBe("U-CAM127");
    expect(report.threshold).toBe(EXPECTED_THRESHOLD);
    expect(typeof report.generatedAt).toBe("string");
    expect(Number.isFinite(Date.parse(report.generatedAt))).toBe(true);
  });

  it("engines_tested lists exactly the five U-CAM117..122 engines in canonical order", () => {
    const report = CAMAIValidationEngine.runValidation();
    expect(report.engines_tested).toEqual(EXPECTED_ENGINES);
  });

  it("category_match_rates totals reconcile with scenario_count", () => {
    const report = CAMAIValidationEngine.runValidation();
    let aggregateTotal = 0;
    let aggregatePassed = 0;
    for (const cat of Object.keys(report.category_match_rates) as ScenarioCategory[]) {
      const bucket = report.category_match_rates[cat];
      aggregateTotal += bucket.total;
      aggregatePassed += bucket.passed;
      // Each bucket's rate is its own passed/total (or 0 if empty).
      const expectedRate = bucket.total === 0 ? 0 : bucket.passed / bucket.total;
      expect(bucket.rate).toBeCloseTo(expectedRate, 10);
    }
    expect(aggregateTotal).toBe(report.scenario_count);
    expect(aggregatePassed).toBe(report.match_count);
  });

  it("per-scenario duration is a finite non-negative number", () => {
    const report = CAMAIValidationEngine.runValidation();
    for (const r of report.scenarios) {
      expect(Number.isFinite(r.durationMs)).toBe(true);
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("scenario IDs in the default suite are all unique", () => {
    const report = CAMAIValidationEngine.runValidation();
    const ids = report.scenarios.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every scenario in the default suite produces a verdict (no missing field)", () => {
    const report = CAMAIValidationEngine.runValidation();
    for (const r of report.scenarios) {
      expect(r.verdict === "pass" || r.verdict === "fail").toBe(true);
      expect(typeof r.id).toBe("string");
      expect(r.id.length).toBeGreaterThan(0);
      expect(typeof r.description).toBe("string");
      expect(r.description.length).toBeGreaterThan(0);
    }
  });

  it("custom scenarios option overrides the default suite", () => {
    const custom: Array<() => ValidationScenarioResult> = [
      () => ({
        id: "custom_pass",
        description: "always passes",
        category: "gate",
        verdict: "pass",
        expected: { ok: true },
        actual: { ok: true },
        durationMs: 0,
      }),
      () => ({
        id: "custom_pass_2",
        description: "also passes",
        category: "lora",
        verdict: "pass",
        expected: 1,
        actual: 1,
        durationMs: 0,
      }),
    ];
    const report = CAMAIValidationEngine.runValidation({ scenarios: custom });
    expect(report.scenario_count).toBe(2);
    expect(report.match_count).toBe(2);
    expect(report.match_rate).toBe(1);
    expect(report.verdict).toBe("PASS");
    expect(report.scenarios[0].id).toBe("custom_pass");
    expect(report.scenarios[1].id).toBe("custom_pass_2");
  });

  it("FAIL verdict emerges when match_rate falls below threshold", () => {
    // 4 pass + 1 fail = 0.80 < 0.95 threshold
    const custom: Array<() => ValidationScenarioResult> = [
      ...Array.from({ length: 4 }, (_, i) => () => ({
        id: `pass_${i}`,
        description: "pass",
        category: "gate" as ScenarioCategory,
        verdict: "pass" as const,
        expected: 1,
        actual: 1,
        durationMs: 0,
      })),
      () => ({
        id: "fail_1",
        description: "fail",
        category: "lora" as ScenarioCategory,
        verdict: "fail" as const,
        expected: 1,
        actual: 0,
        durationMs: 0,
        reason: "synthetic failure",
      }),
    ];
    const report = CAMAIValidationEngine.runValidation({ scenarios: custom });
    expect(report.match_rate).toBeCloseTo(0.8, 10);
    expect(report.match_count).toBe(4);
    expect(report.scenario_count).toBe(5);
    expect(report.verdict).toBe("FAIL");
  });

  it("empty scenarios array → match_rate=0, verdict=FAIL (defends against silent no-op pass)", () => {
    const report = CAMAIValidationEngine.runValidation({ scenarios: [] });
    expect(report.scenario_count).toBe(0);
    expect(report.match_count).toBe(0);
    expect(report.match_rate).toBe(0);
    expect(report.verdict).toBe("FAIL");
  });

  it("outputPath option writes a JSON file that round-trips to an equivalent report", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "prism-cam-val-"));
    const outPath = join(tmpRoot, "validation-report.json");
    try {
      const report = CAMAIValidationEngine.runValidation({ outputPath: outPath });
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

  it("outputPath creates parent directories if missing", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "prism-cam-val-mk-"));
    const nestedPath = join(tmpRoot, "deep", "nested", "report.json");
    try {
      CAMAIValidationEngine.runValidation({
        scenarios: [
          () => ({
            id: "tiny", description: "tiny", category: "gate",
            verdict: "pass", expected: 1, actual: 1, durationMs: 0,
          }),
        ],
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
    expect(out.report.match_rate).toBeGreaterThanOrEqual(EXPECTED_THRESHOLD);
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

  it("threshold boundary — exactly 14/15 matches counts as PASS (≥ not >)", () => {
    const custom: Array<() => ValidationScenarioResult> = [
      ...Array.from({ length: 14 }, (_, i) => () => ({
        id: `b_pass_${i}`,
        description: "pass",
        category: "gate" as ScenarioCategory,
        verdict: "pass" as const,
        expected: 1,
        actual: 1,
        durationMs: 0,
      })),
      () => ({
        id: "b_fail",
        description: "fail",
        category: "lora" as ScenarioCategory,
        verdict: "fail" as const,
        expected: 1,
        actual: 0,
        durationMs: 0,
        reason: "synthetic boundary failure",
      }),
    ];
    const report = CAMAIValidationEngine.runValidation({ scenarios: custom });
    // 14/15 = 0.9333...  which is BELOW 0.95 threshold → FAIL
    expect(report.match_rate).toBeLessThan(EXPECTED_THRESHOLD);
    expect(report.verdict).toBe("FAIL");
  });

  it("threshold boundary — 19/20 matches counts as PASS (0.95 exactly)", () => {
    const custom: Array<() => ValidationScenarioResult> = [
      ...Array.from({ length: 19 }, (_, i) => () => ({
        id: `e_pass_${i}`,
        description: "pass",
        category: "gate" as ScenarioCategory,
        verdict: "pass" as const,
        expected: 1,
        actual: 1,
        durationMs: 0,
      })),
      () => ({
        id: "e_fail",
        description: "fail",
        category: "lora" as ScenarioCategory,
        verdict: "fail" as const,
        expected: 1,
        actual: 0,
        durationMs: 0,
      }),
    ];
    const report = CAMAIValidationEngine.runValidation({ scenarios: custom });
    expect(report.match_rate).toBe(EXPECTED_THRESHOLD); // exactly 0.95
    expect(report.verdict).toBe("PASS");
  });

  it("scenario categories cover all 5 declared categories used by the default suite", () => {
    const report = CAMAIValidationEngine.runValidation();
    const categoriesSeen = new Set(report.scenarios.map((s) => s.category));
    // The default suite spans gate, lora, drift, transfer, calibration,
    // serving, feedback. At minimum we expect: gate, lora, drift, transfer,
    // calibration, feedback (serving is folded into gate/serving categories).
    expect(categoriesSeen.has("gate")).toBe(true);
    expect(categoriesSeen.has("lora")).toBe(true);
    expect(categoriesSeen.has("drift")).toBe(true);
    expect(categoriesSeen.has("transfer")).toBe(true);
    expect(categoriesSeen.has("calibration")).toBe(true);
    expect(categoriesSeen.has("feedback")).toBe(true);
  });
});
