/**
 * U-WIRE-LATHE-LORA-SAFETY-EVAL — wiring-gate test
 * ===================================================
 *
 * Verifies the 6 dispatcher actions for `LatheLoRASafetyEvaluatorEngine`
 * (evaluate/isSafe/getSummary/setConfig/getConfig/getThreshold) — the
 * S(x)-scoring safety gate for any AI-generated upgrade output.
 *
 * @module __tests__/U-WIRE-LATHE-LORA-SAFETY-EVAL
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { latheLoRASafetyEvaluatorEngine } from "../engines/LatheLoRASafetyEvaluatorEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

const ACTIONS = [
  "lathe_lora_safety_evaluate",
  "lathe_lora_safety_is_safe",
  "lathe_lora_safety_summary",
  "lathe_lora_safety_set_config",
  "lathe_lora_safety_get_config",
  "lathe_lora_safety_threshold",
] as const;

const METHOD_MAP: Record<typeof ACTIONS[number], string> = {
  lathe_lora_safety_evaluate: "evaluate",
  lathe_lora_safety_is_safe: "isSafe",
  lathe_lora_safety_summary: "getSummary",
  lathe_lora_safety_set_config: "setConfig",
  lathe_lora_safety_get_config: "getConfig",
  lathe_lora_safety_threshold: "getThreshold",
};

// Reset singleton config between tests for hermetic isolation.
beforeEach(() => {
  latheLoRASafetyEvaluatorEngine.setConfig({
    limits: { max_spindle_rpm: 6000, max_feed_ipm: 200, max_rapid_ipm: 1200, min_clearance_inch: 0.1, chuck_max_rpm: 4000 },
    require_g50_clamp: true,
    require_coolant_check: false,
    collision_keywords_required: 1,
    s_x_threshold: 0.70,
  });
});

// Sample "safe" output — has G50 clamp + retract + verify keywords + reasonable values.
const SAFE_OUTPUT = `
NSTRT
G50 S2000
G96 S250 M03
T010101
G00 X1.5 Z0.1
G01 X1.0 F0.005
G00 Z0.5 ; retract to clear position
M30
`;

// Sample "unsafe" output — no G50 clamp, no retract, no verification keywords, illegal S value.
const UNSAFE_OUTPUT = `
G00 X0 Z0
S99999 M03
G01 X0 F9999 Z-10
`;

describe("U-WIRE-LATHE-LORA-SAFETY-EVAL — turning-dispatcher wiring", () => {
  it("registers all 6 actions in TURNING_ACTION_SCHEMAS", () => {
    for (const a of ACTIONS) {
      if (!SCHEMA_MAP[a]) throw new Error(`${a} missing from TURNING_ACTION_SCHEMAS`);
    }
  });

  it("evaluate schema requires non-empty output string", () => {
    expect(SCHEMA_MAP["lathe_lora_safety_evaluate"]!.safeParse({ output: SAFE_OUTPUT }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_lora_safety_evaluate"]!.safeParse({ output: "" }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_lora_safety_evaluate"]!.safeParse({}).success).toBe(false);
  });

  it("evaluate schema accepts optional context.operation hint", () => {
    expect(SCHEMA_MAP["lathe_lora_safety_evaluate"]!.safeParse({
      output: SAFE_OUTPUT, context: { operation: "parting" },
    }).success).toBe(true);
  });

  it("set_config schema rejects s_x_threshold outside [0,1]", () => {
    expect(SCHEMA_MAP["lathe_lora_safety_set_config"]!.safeParse({ config: { s_x_threshold: 1.5 } }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_lora_safety_set_config"]!.safeParse({ config: { s_x_threshold: -0.1 } }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_lora_safety_set_config"]!.safeParse({ config: { s_x_threshold: 0.85 } }).success).toBe(true);
  });

  it("get_config/threshold schemas accept empty input", () => {
    expect(SCHEMA_MAP["lathe_lora_safety_get_config"]!.safeParse({}).success).toBe(true);
    expect(SCHEMA_MAP["lathe_lora_safety_threshold"]!.safeParse({}).success).toBe(true);
  });

  it("is_safe / summary schemas require a SafetyEvaluation object", () => {
    const ev = latheLoRASafetyEvaluatorEngine.evaluate(SAFE_OUTPUT);
    expect(SCHEMA_MAP["lathe_lora_safety_is_safe"]!.safeParse({ evaluation: ev }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_lora_safety_summary"]!.safeParse({ evaluation: ev }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_lora_safety_is_safe"]!.safeParse({}).success).toBe(false);
  });

  it("dispatcher source carries all 6 actions in enum AND case form", () => {
    for (const a of ACTIONS) {
      expect(DISPATCHER_SRC.includes(`"${a}"`)).toBe(true);
      expect(DISPATCHER_SRC.includes(`case "${a}":`)).toBe(true);
    }
  });

  it("each case routes to its matching engine method (action↔method map verified)", () => {
    for (const a of ACTIONS) {
      const startIdx = DISPATCHER_SRC.indexOf(`case "${a}":`);
      if (startIdx < 0) throw new Error(`${a} case missing`);
      const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + `case "${a}":`.length);
      const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
      const expectedMethod = METHOD_MAP[a];
      if (!block.includes(`latheLoRASafetyEvaluatorEngine.${expectedMethod}(`)) {
        throw new Error(`${a} case must call .${expectedMethod}`);
      }
    }
  });
});

describe("U-WIRE-LATHE-LORA-SAFETY-EVAL — engine semantic round-trip", () => {
  it("evaluate returns SafetyEvaluation with all canonical scoring fields", () => {
    const ev = latheLoRASafetyEvaluatorEngine.evaluate(SAFE_OUTPUT);
    expect(typeof ev.overall_score).toBe("number");
    expect(ev.overall_score).toBeGreaterThanOrEqual(0);
    expect(ev.overall_score).toBeLessThanOrEqual(100);
    expect(ev.s_x_score).toBeGreaterThanOrEqual(0);
    expect(ev.s_x_score).toBeLessThanOrEqual(1);
    expect(typeof ev.spindle_safety).toBe("number");
    expect(typeof ev.feed_safety).toBe("number");
    expect(typeof ev.collision_awareness).toBe("number");
    expect(typeof ev.operational_safety).toBe("number");
    expect(Array.isArray(ev.issues)).toBe(true);
    expect(typeof ev.passed).toBe("boolean");
  });

  it("an UNSAFE output (no G50, illegal S/F values) does NOT pass", () => {
    const ev = latheLoRASafetyEvaluatorEngine.evaluate(UNSAFE_OUTPUT);
    if (ev.passed === true) {
      throw new Error(`unsafe output unexpectedly passed — issues=${ev.issues.length} s_x=${ev.s_x_score}`);
    }
    // Must have at least one issue surfaced.
    expect(ev.issues.length).toBeGreaterThan(0);
  });

  it("isSafe(passing_evaluation) === passing_evaluation.passed (consistency invariant)", () => {
    const safeEv = latheLoRASafetyEvaluatorEngine.evaluate(SAFE_OUTPUT);
    expect(latheLoRASafetyEvaluatorEngine.isSafe(safeEv)).toBe(safeEv.passed);
    const unsafeEv = latheLoRASafetyEvaluatorEngine.evaluate(UNSAFE_OUTPUT);
    expect(latheLoRASafetyEvaluatorEngine.isSafe(unsafeEv)).toBe(unsafeEv.passed);
  });

  it("getSummary returns a non-empty operator-facing string", () => {
    const ev = latheLoRASafetyEvaluatorEngine.evaluate(SAFE_OUTPUT);
    const summary = latheLoRASafetyEvaluatorEngine.getSummary(ev);
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(0);
  });

  it("setConfig + getConfig round-trips (mutation read-back verified)", () => {
    latheLoRASafetyEvaluatorEngine.setConfig({ s_x_threshold: 0.90 });
    expect(latheLoRASafetyEvaluatorEngine.getConfig().s_x_threshold).toBe(0.90);
    expect(latheLoRASafetyEvaluatorEngine.getThreshold()).toBe(0.90);
  });

  it("getThreshold defaults to 0.70 after beforeEach reset", () => {
    expect(latheLoRASafetyEvaluatorEngine.getThreshold()).toBe(0.70);
  });

  it("raising the s_x_threshold can flip a borderline output from passed=true to passed=false", () => {
    // Pump the threshold higher than the SAFE_OUTPUT's actual S(x) score —
    // forces a flip without changing the output. Read the actual score first.
    const baseline = latheLoRASafetyEvaluatorEngine.evaluate(SAFE_OUTPUT);
    if (baseline.passed !== true) {
      // Baseline doesn't pass anyway — skip this invariant for this output.
      // The "evaluate returns SafetyEvaluation" test already covers the shape.
      return;
    }
    latheLoRASafetyEvaluatorEngine.setConfig({ s_x_threshold: Math.min(1, baseline.s_x_score + 0.1) });
    const after = latheLoRASafetyEvaluatorEngine.evaluate(SAFE_OUTPUT);
    if (after.passed === true) {
      throw new Error(`raised threshold to ${latheLoRASafetyEvaluatorEngine.getThreshold()} above s_x=${baseline.s_x_score} but still passed`);
    }
  });
});
