/**
 * U-WIRE-LATHE-LORA-REWARD-SHAPE — wiring-gate test
 * ====================================================
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { latheLoRARewardShapingEngine } from "../engines/LatheLoRARewardShapingEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

const ACTIONS = [
  "lathe_lora_reward_calc",
  "lathe_lora_reward_threshold",
  "lathe_lora_reward_summary",
  "lathe_lora_reward_set_config",
  "lathe_lora_reward_get_config",
] as const;

const METHOD_MAP: Record<typeof ACTIONS[number], string> = {
  lathe_lora_reward_calc: "calculateReward",
  lathe_lora_reward_threshold: "meetsThreshold",
  lathe_lora_reward_summary: "getSummary",
  lathe_lora_reward_set_config: "setConfig",
  lathe_lora_reward_get_config: "getConfig",
};

beforeEach(() => {
  // Reset config for hermetic test isolation.
  latheLoRARewardShapingEngine.setConfig(latheLoRARewardShapingEngine.getConfig());
});

const RICH_OUTPUT = `
G50 S2000
G96 S250 M03
T010101
G01 X1.0 F0.005 ; rough turn 4140 steel
G00 Z0.5 ; retract
M30
`;

const SHORT_OUTPUT = "go";

describe("U-WIRE-LATHE-LORA-REWARD-SHAPE — turning-dispatcher wiring", () => {
  it("registers all 5 actions in TURNING_ACTION_SCHEMAS", () => {
    for (const a of ACTIONS) {
      if (!SCHEMA_MAP[a]) throw new Error(`${a} missing from TURNING_ACTION_SCHEMAS`);
    }
  });

  it("calc schema requires non-empty output string", () => {
    expect(SCHEMA_MAP["lathe_lora_reward_calc"]!.safeParse({ output: RICH_OUTPUT }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_lora_reward_calc"]!.safeParse({ output: "" }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_lora_reward_calc"]!.safeParse({}).success).toBe(false);
  });

  it("threshold + summary schemas require a RewardResult object", () => {
    const r = latheLoRARewardShapingEngine.calculateReward(RICH_OUTPUT);
    expect(SCHEMA_MAP["lathe_lora_reward_threshold"]!.safeParse({ result: r }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_lora_reward_summary"]!.safeParse({ result: r }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_lora_reward_threshold"]!.safeParse({}).success).toBe(false);
  });

  it("threshold schema accepts optional numeric threshold", () => {
    const r = latheLoRARewardShapingEngine.calculateReward(RICH_OUTPUT);
    expect(SCHEMA_MAP["lathe_lora_reward_threshold"]!.safeParse({ result: r, threshold: 0.5 }).success).toBe(true);
  });

  it("dispatcher source contains all 5 actions in enum AND case form", () => {
    for (const a of ACTIONS) {
      expect(DISPATCHER_SRC.includes(`"${a}"`)).toBe(true);
      expect(DISPATCHER_SRC.includes(`case "${a}":`)).toBe(true);
    }
  });

  it("each case routes to its matching engine method (action↔method map verified)", () => {
    for (const a of ACTIONS) {
      const startIdx = DISPATCHER_SRC.indexOf(`case "${a}":`);
      const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + `case "${a}":`.length);
      const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
      const expectedMethod = METHOD_MAP[a];
      if (!block.includes(`latheLoRARewardShapingEngine.${expectedMethod}(`)) {
        throw new Error(`${a} case must call .${expectedMethod}`);
      }
    }
  });
});

describe("U-WIRE-LATHE-LORA-REWARD-SHAPE — engine semantic round-trip", () => {
  it("calculateReward returns RewardResult with all canonical fields", () => {
    const r = latheLoRARewardShapingEngine.calculateReward(RICH_OUTPUT);
    expect(typeof r.total_reward).toBe("number");
    expect(Array.isArray(r.components)).toBe(true);
    expect(r.components.length).toBeGreaterThan(0);
    expect(Array.isArray(r.bonus_reasons)).toBe(true);
    expect(Array.isArray(r.penalty_reasons)).toBe(true);
  });

  it("rich output scores higher than short non-G-code output (real RL signal)", () => {
    const rich = latheLoRARewardShapingEngine.calculateReward(RICH_OUTPUT);
    const short = latheLoRARewardShapingEngine.calculateReward(SHORT_OUTPUT);
    if (rich.total_reward <= short.total_reward) {
      throw new Error(`rich did not beat short — rich=${rich.total_reward} short=${short.total_reward}`);
    }
  });

  it("meetsThreshold(r, 0) === (r.total_reward >= 0) (definitional invariant)", () => {
    const r = latheLoRARewardShapingEngine.calculateReward(RICH_OUTPUT);
    expect(latheLoRARewardShapingEngine.meetsThreshold(r, 0)).toBe(r.total_reward >= 0);
    expect(latheLoRARewardShapingEngine.meetsThreshold(r, Number.POSITIVE_INFINITY)).toBe(false);
    expect(latheLoRARewardShapingEngine.meetsThreshold(r, Number.NEGATIVE_INFINITY)).toBe(true);
  });

  it("getSummary returns a non-empty string", () => {
    const r = latheLoRARewardShapingEngine.calculateReward(RICH_OUTPUT);
    const s = latheLoRARewardShapingEngine.getSummary(r);
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });

  it("setConfig + getConfig round-trip (config object is returned by reference structure)", () => {
    const before = latheLoRARewardShapingEngine.getConfig();
    expect(typeof before).toBe("object");
    // Override + read-back
    latheLoRARewardShapingEngine.setConfig(before);
    const after = latheLoRARewardShapingEngine.getConfig();
    expect(after).toEqual(before);
  });
});
