import { describe, it, expect, beforeEach } from "vitest";
import {
  wedmInferenceRuntimeEngine,
  type WedmGenerateHandler,
} from "./WEDMInferenceRuntimeEngine.js";

const ADAPTER_V1 = {
  adapter_version: "v0.1.0",
  adapter_path: "/models/wedm-lora/v0.1.0/adapter.safetensors",
  outcomes_at_registration: 500,
  trained_families: [
    "wire_parameter_calc",
    "pass_strategy",
    "controller_dialect",
    "wire_break_diagnose",
    "taper_uv",
    "surface_integrity",
    "cost_estimate",
  ],
};

describe("WEDMInferenceRuntimeEngine — adapter registration", () => {
  beforeEach(() => {
    wedmInferenceRuntimeEngine.reset();
  });

  it("HAPPY PATH: registerAdapter accepts a full valid input and returns the registration", () => {
    const reg = wedmInferenceRuntimeEngine.registerAdapter({
      ...ADAPTER_V1,
      metrics: { final_loss: 0.42, validation_accuracy: 0.85 },
      timestamp: "2026-05-27T12:00:00Z",
    });
    expect(reg.adapter_version).toBe("v0.1.0");
    expect(reg.adapter_path).toBe(ADAPTER_V1.adapter_path);
    expect(reg.outcomes_at_registration).toBe(500);
    expect(reg.trained_families).toHaveLength(7);
    expect(reg.metrics.final_loss).toBe(0.42);
    expect(reg.metrics.validation_accuracy).toBe(0.85);
    expect(reg.registered_at).toBe("2026-05-27T12:00:00Z");
  });

  it("HAPPY PATH: omitted metrics default to null without throwing", () => {
    const reg = wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    expect(reg.metrics.final_loss).toBeNull();
    expect(reg.metrics.validation_accuracy).toBeNull();
    expect(reg.metrics.recast_err_um).toBeNull();
    expect(reg.metrics.ra_err_um).toBeNull();
    expect(reg.metrics.mrr_err_pct).toBeNull();
  });

  it("FAILURE: empty adapter_version throws", () => {
    expect(() => wedmInferenceRuntimeEngine.registerAdapter({ ...ADAPTER_V1, adapter_version: "" }))
      .toThrow(/adapter_version.*non-empty/i);
  });

  it("FAILURE: empty adapter_path throws", () => {
    expect(() => wedmInferenceRuntimeEngine.registerAdapter({ ...ADAPTER_V1, adapter_path: "" }))
      .toThrow(/adapter_path.*non-empty/i);
  });

  it("FAILURE: negative outcomes throws", () => {
    expect(() => wedmInferenceRuntimeEngine.registerAdapter({ ...ADAPTER_V1, outcomes_at_registration: -1 }))
      .toThrow(/non-negative finite/i);
  });

  it("FAILURE: empty trained_families array throws", () => {
    expect(() => wedmInferenceRuntimeEngine.registerAdapter({ ...ADAPTER_V1, trained_families: [] }))
      .toThrow(/non-empty array/i);
  });

  it("ADVERSARIAL: NaN outcomes throws", () => {
    expect(() => wedmInferenceRuntimeEngine.registerAdapter({ ...ADAPTER_V1, outcomes_at_registration: NaN }))
      .toThrow(/non-negative finite/i);
  });

  it("DEFENSIVE COPY: mutating returned adapter does not affect engine state", () => {
    const reg = wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    reg.adapter_version = "TAMPERED";
    reg.trained_families.push("malicious");
    reg.metrics.final_loss = -999;
    const a = wedmInferenceRuntimeEngine.getAdapter();
    expect(a?.adapter_version).toBe("v0.1.0");
    expect(a?.trained_families).toHaveLength(7);
    expect(a?.metrics.final_loss).toBeNull();
  });

  it("DEFENSIVE COPY: input trained_families array mutation does not affect engine", () => {
    const families = [...ADAPTER_V1.trained_families];
    wedmInferenceRuntimeEngine.registerAdapter({ ...ADAPTER_V1, trained_families: families });
    families.push("tampered");
    const a = wedmInferenceRuntimeEngine.getAdapter();
    expect(a?.trained_families).toHaveLength(7);
  });

  it("BOUNDARY: registerAdapter floors fractional outcomes_at_registration", () => {
    const reg = wedmInferenceRuntimeEngine.registerAdapter({ ...ADAPTER_V1, outcomes_at_registration: 523.7 });
    expect(reg.outcomes_at_registration).toBe(523);
  });

  it("unregisterAdapter clears the current adapter", () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    wedmInferenceRuntimeEngine.unregisterAdapter();
    expect(wedmInferenceRuntimeEngine.getAdapter()).toBeNull();
  });
});

describe("WEDMInferenceRuntimeEngine — status() telemetry", () => {
  beforeEach(() => {
    wedmInferenceRuntimeEngine.reset();
  });

  it("status with no adapter returns loaded=false + actionable next_steps", () => {
    const s = wedmInferenceRuntimeEngine.status();
    expect(s.loaded).toBe(false);
    expect(s.adapter).toBeNull();
    expect(s.handler_registered).toBe(false);
    expect(s.reason).toMatch(/no trained adapter/i);
    expect(s.next_actions.length).toBeGreaterThanOrEqual(4);
    expect(s.next_actions[0]).toMatch(/wedm_retrain_status/);
  });

  it("status with adapter but no handler returns loaded=false + handler-wiring next_steps", () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    const s = wedmInferenceRuntimeEngine.status();
    expect(s.loaded).toBe(false);
    expect(s.adapter?.adapter_version).toBe("v0.1.0");
    expect(s.handler_registered).toBe(false);
    expect(s.reason).toMatch(/no generate-handler wired/i);
    expect(s.next_actions[0]).toMatch(/Ollama|generate-handler|handler/i);
  });

  it("status with adapter + handler returns loaded=true + empty next_steps", () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    wedmInferenceRuntimeEngine.setGenerateHandler(async (_req) => ({ output: "stub" }));
    const s = wedmInferenceRuntimeEngine.status();
    expect(s.loaded).toBe(true);
    expect(s.handler_registered).toBe(true);
    expect(s.next_actions).toHaveLength(0);
    expect(s.reason).toMatch(/v0\.1\.0.*ready/i);
  });

  it("DEFENSIVE COPY: mutating status.adapter does not affect engine state", () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    const s = wedmInferenceRuntimeEngine.status();
    if (s.adapter) {
      s.adapter.adapter_version = "TAMPERED";
      s.adapter.trained_families.push("evil");
    }
    const a = wedmInferenceRuntimeEngine.getAdapter();
    expect(a?.adapter_version).toBe("v0.1.0");
    expect(a?.trained_families).toHaveLength(7);
  });
});

describe("WEDMInferenceRuntimeEngine — generate() delegation", () => {
  beforeEach(() => {
    wedmInferenceRuntimeEngine.reset();
  });

  it("FAILURE: generate with no adapter returns ok=false + no-adapter reason", async () => {
    const r = await wedmInferenceRuntimeEngine.generate({ prompt: "Generate WEDM program for D2 12.7mm" });
    expect(r.ok).toBe(false);
    expect(r.output).toBe("");
    expect(r.adapter_version).toBeNull();
    expect(r.reason).toMatch(/no adapter registered/i);
  });

  it("FAILURE: generate with empty prompt returns ok=false even when adapter loaded", async () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    const r = await wedmInferenceRuntimeEngine.generate({ prompt: "" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/empty prompt/i);
  });

  it("FAILURE: whitespace-only prompt returns ok=false", async () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    const r = await wedmInferenceRuntimeEngine.generate({ prompt: "   \n\t   " });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/empty prompt/i);
  });

  it("FAILURE: adapter registered but no handler → ok=false with handler-offline reason", async () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    const r = await wedmInferenceRuntimeEngine.generate({ prompt: "Generate WEDM" });
    expect(r.ok).toBe(false);
    expect(r.adapter_version).toBe("v0.1.0");
    expect(r.reason).toMatch(/handler wired|runtime offline/i);
  });

  it("HAPPY PATH: adapter + handler delegates to handler and returns ok=true", async () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    const handler: WedmGenerateHandler = async (req) => ({
      output: `ECHO: ${req.prompt}`,
      tokens: { input: 5, output: 12 },
    });
    wedmInferenceRuntimeEngine.setGenerateHandler(handler);
    const r = await wedmInferenceRuntimeEngine.generate({ prompt: "WEDM 4-pass D2" });
    expect(r.ok).toBe(true);
    expect(r.output).toBe("ECHO: WEDM 4-pass D2");
    expect(r.adapter_version).toBe("v0.1.0");
    expect(r.tokens?.input).toBe(5);
    expect(r.tokens?.output).toBe(12);
  });

  it("HAPPY PATH: context (instruction_family/customer/controller) is forwarded to handler", async () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    let captured: { instruction_family?: string; customer?: string; controller?: string } | undefined;
    wedmInferenceRuntimeEngine.setGenerateHandler(async (req) => {
      captured = req.context;
      return { output: "ok" };
    });
    await wedmInferenceRuntimeEngine.generate({
      prompt: "Generate program",
      context: { instruction_family: "pass_strategy", customer: "ITW SHAKEPROOF", controller: "FA-10S" },
    });
    expect(captured?.instruction_family).toBe("pass_strategy");
    expect(captured?.customer).toBe("ITW SHAKEPROOF");
    expect(captured?.controller).toBe("FA-10S");
  });

  it("FAILURE: handler throw is caught and surfaced as ok=false with reason", async () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    wedmInferenceRuntimeEngine.setGenerateHandler(async (_req) => {
      throw new Error("CUDA out of memory");
    });
    const r = await wedmInferenceRuntimeEngine.generate({ prompt: "huge prompt" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/CUDA out of memory/);
    expect(r.adapter_version).toBe("v0.1.0");
  });

  it("FAILURE: handler rejecting with non-Error value still produces a string reason", async () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    wedmInferenceRuntimeEngine.setGenerateHandler(async (_req) => {
      throw "raw string error";
    });
    const r = await wedmInferenceRuntimeEngine.generate({ prompt: "x" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/raw string error/);
  });

  it("setGenerateHandler(null) clears the handler", async () => {
    wedmInferenceRuntimeEngine.registerAdapter(ADAPTER_V1);
    wedmInferenceRuntimeEngine.setGenerateHandler(async () => ({ output: "x" }));
    wedmInferenceRuntimeEngine.setGenerateHandler(null);
    const r = await wedmInferenceRuntimeEngine.generate({ prompt: "x" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/handler wired|offline/i);
  });

  it("VARIABILITY: different adapter version surfaces in result", async () => {
    wedmInferenceRuntimeEngine.registerAdapter({ ...ADAPTER_V1, adapter_version: "v0.2.0-quality" });
    wedmInferenceRuntimeEngine.setGenerateHandler(async () => ({ output: "ok" }));
    const r = await wedmInferenceRuntimeEngine.generate({ prompt: "x" });
    expect(r.adapter_version).toBe("v0.2.0-quality");
  });
});
