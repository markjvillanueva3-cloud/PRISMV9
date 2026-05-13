/**
 * E2E wire test for CAM-FUSION-LIVE-MS0/U-WIRE-LORA-DRIFT — LoRADriftCoordinatorEngine
 * wired into prism_ai as 8 actions:
 *   lora_drift_record · lora_drift_active · lora_drift_should_retrain
 *   lora_drift_check_all_clear · lora_drift_buffer_size · lora_drift_reset
 *   lora_drift_get_config · lora_drift_set_config
 *
 * Verifies (a) every action appears in BOTH the AI_REASONING_ACTIONS array
 * AND has a case label in the dispatcher source, (b) every action has a
 * matching Zod schema in ACTION_AI_REASONING_SCHEMAS, (c) the Zod boundary
 * rejects bad pipeline_type enum / negative-delta-floor / window 0, and
 * (d) the dispatcher round-trip executes through the live singleton:
 * snake_case params get remapped to camelCase before reaching the engine.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";

const NEW_ACTIONS = [
  "lora_drift_record",
  "lora_drift_active",
  "lora_drift_should_retrain",
  "lora_drift_check_all_clear",
  "lora_drift_buffer_size",
  "lora_drift_reset",
  "lora_drift_get_config",
  "lora_drift_set_config",
] as const;

describe("lora-drift wire — dispatcher source registration", () => {
  it("each new action has exactly one case-label occurrence in aiReasoningDispatcher.ts", async () => {
    // The dispatcher imports AI_REASONING_ACTIONS as a symbol, not as string
    // literals — so each action name appears in the dispatcher source EXACTLY
    // once: as a `case "<name>":` label. Asserting `=== 1` is stricter than
    // `>= 1` and would fail if either the case label were missing OR the
    // action name were duplicated in dead code.
    const dispatcherPath = path.resolve(
      __dirname, "..", "tools", "dispatchers", "aiReasoningDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBe(1);
    }
  });

  it("dispatcher has a literal `case \"<action>\":` for each new action", async () => {
    // Direct contract verification — every action must have a switch case.
    // Required for codex blocker: must prove case wiring exists, not just
    // string presence.
    const dispatcherPath = path.resolve(
      __dirname, "..", "tools", "dispatchers", "aiReasoningDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    for (const a of NEW_ACTIONS) {
      expect(src.includes(`case "${a}":`)).toBe(true);
    }
  });

  it("each new action appears in AI_REASONING_ACTIONS array AND ACTION_AI_REASONING_SCHEMAS map", async () => {
    const schemaPath = path.resolve(__dirname, "..", "schemas", "aiReasoningActionSchemas.ts");
    const src = await fsp.readFile(schemaPath, "utf8");
    for (const a of NEW_ACTIONS) {
      // Enum entry: `"<name>",` inside AI_REASONING_ACTIONS
      expect(src.includes(`"${a}"`)).toBe(true);
      // Schema map entry: `<name>: z.object(...)` — the key may be quoted or unquoted
      // depending on whether the name has a hyphen. All 8 lora actions are valid
      // JS identifiers so they appear unquoted as map keys.
      expect(src.includes(`\n  ${a}:`)).toBe(true);
    }
  });

  it("dispatcher uses lazy imports for LoRADriftCoordinatorEngine (no top-level static import)", async () => {
    const dispatcherPath = path.resolve(__dirname, "..", "tools", "dispatchers", "aiReasoningDispatcher.ts");
    const src = await fsp.readFile(dispatcherPath, "utf8");
    expect(src).not.toMatch(/^import[^;]*LoRADriftCoordinatorEngine/m);
    expect(src).toMatch(/await\s+import\(\s*["'`].*LoRADriftCoordinatorEngine\.js["'`]\s*\)/);
  });

  it("dispatcher destructures the singleton (loRADriftCoordinatorEngine), never instantiates a new instance", async () => {
    const dispatcherPath = path.resolve(__dirname, "..", "tools", "dispatchers", "aiReasoningDispatcher.ts");
    const src = await fsp.readFile(dispatcherPath, "utf8");
    expect(src).toMatch(/\{\s*loRADriftCoordinatorEngine\s*\}/);
    expect(src).not.toMatch(/new\s+LoRADriftCoordinatorEngineImpl\s*\(/);
  });
});

describe("lora-drift wire — schema map registration", () => {
  it("registers all 8 schemas in ACTION_AI_REASONING_SCHEMAS", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse?: unknown }>;
    for (const a of NEW_ACTIONS) {
      expect(typeof map[a]?.safeParse).toBe("function");
    }
  });
});

describe("lora-drift wire — Zod validation: lora_drift_record", () => {
  it("accepts a fully-formed valid record", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_record"]!.safeParse({
      pipeline_type: "milling",
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.85,
      current_eval_score: 0.65,
    });
    expect(r.success).toBe(true);
  });

  it("rejects an unknown pipeline_type enum value", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_record"]!.safeParse({
      pipeline_type: "abrasive_jet",
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.85,
      current_eval_score: 0.65,
    });
    expect(r.success).toBe(false);
  });

  it("accepts each of the 8 valid pipeline_type values", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const types = ["milling","5axis","millturn","wedm","sinker-edm","laser","waterjet","grinding"] as const;
    for (const t of types) {
      const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_record"]!.safeParse({
        pipeline_type: t,
        delta: 0.20,
        observed_at: new Date().toISOString(),
        baseline_eval_score: 0.85,
        current_eval_score: 0.65,
      });
      expect(r.success).toBe(true);
    }
  });

  it("rejects when required fields are missing", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_record"]!.safeParse({
      pipeline_type: "milling",
      delta: 0.20,
      // missing observed_at, baseline_eval_score, current_eval_score
    });
    expect(r.success).toBe(false);
  });

  it("rejects extra fields (strict schema)", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_record"]!.safeParse({
      pipeline_type: "milling",
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.85,
      current_eval_score: 0.65,
      garbage_field: "not allowed by strict()",
    });
    expect(r.success).toBe(false);
  });
});

describe("lora-drift wire — Zod validation: lora_drift_set_config", () => {
  it("accepts a partial config patch", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_set_config"]!.safeParse({ window_ms: 3600000 });
    expect(r.success).toBe(true);
  });

  it("rejects coordinated_threshold below 2 at the schema boundary", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_set_config"]!.safeParse({ coordinated_threshold: 1 });
    expect(r.success).toBe(false);
  });

  it("rejects negative drift_delta_floor", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_set_config"]!.safeParse({ drift_delta_floor: -0.05 });
    expect(r.success).toBe(false);
  });

  it("rejects window_ms = 0", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_set_config"]!.safeParse({ window_ms: 0 });
    expect(r.success).toBe(false);
  });

  it("accepts an empty patch (no-op)", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_set_config"]!.safeParse({});
    expect(r.success).toBe(true);
  });
});

describe("lora-drift wire — Zod validation: empty-payload actions", () => {
  it("accepts each of the 6 zero-arg actions with an empty object", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    for (const a of ["lora_drift_active","lora_drift_should_retrain","lora_drift_check_all_clear",
                     "lora_drift_buffer_size","lora_drift_reset","lora_drift_get_config"]) {
      const r = ACTION_AI_REASONING_SCHEMAS[a]!.safeParse({});
      expect(r.success).toBe(true);
    }
  });

  it("rejects extra fields on zero-arg actions (strict)", async () => {
    const { ACTION_AI_REASONING_SCHEMAS } = await import("../schemas/aiReasoningActionSchemas.js");
    const r = ACTION_AI_REASONING_SCHEMAS["lora_drift_active"]!.safeParse({ unexpected: true });
    expect(r.success).toBe(false);
  });
});

// ── In-process dispatcher round-trip ────────────────────────────────────────
// Calls the dispatcher's executeAIReasoningAction directly, which runs the
// switch case → lazy-imports the engine → invokes the singleton. Verifies
// the snake→camel remap happens and the live singleton state mutates.

describe("lora-drift wire — in-process dispatcher round-trip", () => {
  beforeEach(async () => {
    const { loRADriftCoordinatorEngine } = await import("../engines/LoRADriftCoordinatorEngine.js");
    loRADriftCoordinatorEngine.reset();
  });

  it("lora_drift_record routes to the live singleton and mutates bufferSize", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    const { loRADriftCoordinatorEngine } = await import("../engines/LoRADriftCoordinatorEngine.js");
    const before = loRADriftCoordinatorEngine.bufferSize();
    const res = await executeAIReasoningAction("lora_drift_record", {
      pipeline_type: "milling",
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.85,
      current_eval_score: 0.65,
    });
    expect(res.success).toBe(true);
    expect(loRADriftCoordinatorEngine.bufferSize()).toBe(before + 1);
  });

  it("lora_drift_record returns a coordinatedDrift event when 2 pipelines drift in window", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    await executeAIReasoningAction("lora_drift_record", {
      pipeline_type: "milling",
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.85,
      current_eval_score: 0.65,
    });
    const res = await executeAIReasoningAction("lora_drift_record", {
      pipeline_type: "wedm",
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.90,
      current_eval_score: 0.70,
    });
    expect(res.success).toBe(true);
    const data = res.data as { kind: string; severity: string; pipelineTypes: string[] };
    expect(data.kind).toBe("coordinatedDrift");
    expect(data.severity).toBe("critical");
    expect(data.pipelineTypes.sort()).toEqual(["milling", "wedm"]);
  });

  it("lora_drift_active returns the pipelines currently drifted", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    await executeAIReasoningAction("lora_drift_record", {
      pipeline_type: "laser",
      delta: 0.25,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.90,
      current_eval_score: 0.65,
    });
    const res = await executeAIReasoningAction("lora_drift_active", {});
    expect(res.success).toBe(true);
    expect((res.data as { active: string[] }).active).toEqual(["laser"]);
  });

  it("lora_drift_should_retrain returns true when threshold pipelines are drifted", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    await executeAIReasoningAction("lora_drift_record", {
      pipeline_type: "milling",
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.85,
      current_eval_score: 0.65,
    });
    await executeAIReasoningAction("lora_drift_record", {
      pipeline_type: "wedm",
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.85,
      current_eval_score: 0.65,
    });
    const res = await executeAIReasoningAction("lora_drift_should_retrain", {});
    expect(res.success).toBe(true);
    expect((res.data as { shouldTrigger: boolean }).shouldTrigger).toBe(true);
  });

  it("lora_drift_buffer_size returns the live singleton size", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    const r1 = await executeAIReasoningAction("lora_drift_buffer_size", {});
    expect((r1.data as { size: number }).size).toBe(0);
    await executeAIReasoningAction("lora_drift_record", {
      pipeline_type: "grinding",
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.88,
      current_eval_score: 0.65,
    });
    const r2 = await executeAIReasoningAction("lora_drift_buffer_size", {});
    expect((r2.data as { size: number }).size).toBe(1);
  });

  it("lora_drift_reset clears the live singleton buffer", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    await executeAIReasoningAction("lora_drift_record", {
      pipeline_type: "milling",
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.85,
      current_eval_score: 0.65,
    });
    const res = await executeAIReasoningAction("lora_drift_reset", {});
    expect(res.success).toBe(true);
    expect((res.data as { reset: boolean; size: number }).reset).toBe(true);
    expect((res.data as { reset: boolean; size: number }).size).toBe(0);
  });

  it("lora_drift_set_config remaps snake_case to camelCase and returns merged config", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    const res = await executeAIReasoningAction("lora_drift_set_config", {
      window_ms: 4 * 60 * 60 * 1000,
      coordinated_threshold: 3,
      drift_delta_floor: 0.20,
    });
    expect(res.success).toBe(true);
    const cfg = res.data as { windowMs: number; coordinatedThreshold: number; driftDeltaFloor: number };
    expect(cfg.windowMs).toBe(4 * 60 * 60 * 1000);
    expect(cfg.coordinatedThreshold).toBe(3);
    expect(cfg.driftDeltaFloor).toBe(0.20);
    // Restore default for subsequent tests
    await executeAIReasoningAction("lora_drift_set_config", {
      window_ms: 2 * 60 * 60 * 1000, coordinated_threshold: 2, drift_delta_floor: 0.10,
    });
  });

  it("lora_drift_get_config reflects the prior set_config", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    await executeAIReasoningAction("lora_drift_set_config", { coordinated_threshold: 4 });
    const res = await executeAIReasoningAction("lora_drift_get_config", {});
    expect(res.success).toBe(true);
    expect((res.data as { coordinatedThreshold: number }).coordinatedThreshold).toBe(4);
    // Restore default
    await executeAIReasoningAction("lora_drift_set_config", { coordinated_threshold: 2 });
  });

  it("dispatcher Zod-rejects invalid pipeline_type BEFORE the engine is called", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    const { loRADriftCoordinatorEngine } = await import("../engines/LoRADriftCoordinatorEngine.js");
    const before = loRADriftCoordinatorEngine.bufferSize();
    const res = await executeAIReasoningAction("lora_drift_record", {
      pipeline_type: "abrasive_jet",  // not in enum
      delta: 0.20,
      observed_at: new Date().toISOString(),
      baseline_eval_score: 0.85,
      current_eval_score: 0.65,
    });
    expect(res.success).toBe(false);
    expect(loRADriftCoordinatorEngine.bufferSize()).toBe(before); // engine never touched
  });
});
