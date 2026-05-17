/**
 * camDispatcher — LatheLoRATrainingScriptEngine wiring suite
 * ==========================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the validator-confirmed
 * TRULY-UNWIRED LatheLoRATrainingScriptEngine (521-line real engine, NOT a
 * stub: a pure deterministic Unsloth/LoRA training-script generator — no
 * runtime I/O; the git+https string at engine:320 is INSIDE the emitted
 * pip-requirements template, not a fetch) into prism_cam with 5 actions:
 *   - generateScript()   → lathe_lora_generate_script
 *   - getConfig()        → lathe_lora_get_config
 *   - applyPreset(name)  → lathe_lora_apply_preset
 *   - estimateVRAM/Time  → lathe_lora_estimate
 *   - validateConfig()   → lathe_lora_validate_config
 *
 * The engine is a module singleton holding a mutable `config`. Every
 * assertion-bearing call below first establishes known state (via
 * apply_preset or an explicit `config` param) so the suite is
 * order-independent despite the shared singleton. Includes the
 * z.enum-membership guard for the RGS-TOOL-AUTOINVOKE-MS1 false-green class
 * (MockMCPServer bypasses z.enum) and is slimmer-aware (responseSlimmer
 * strips empty arrays/undefined at the MCP transport).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: unknown }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. z.enum gate membership (RGS-TOOL-AUTOINVOKE-MS1 false-green guard)
// ─────────────────────────────────────────────────────────────────────
describe("lathe-lora script — enum registration", () => {
  const expected = [
    "lathe_lora_generate_script", "lathe_lora_get_config",
    "lathe_lora_apply_preset", "lathe_lora_estimate",
    "lathe_lora_validate_config",
  ];
  it("all 5 actions are in the prism_cam z.enum ACTIONS list", () => {
    for (const a of expected) expect(ACTIONS).toContain(a);
  });
  it("no duplicate ACTIONS keys introduced (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. lathe_lora_apply_preset — preset values are the exact engine literals
// ─────────────────────────────────────────────────────────────────────
describe("lathe_lora_apply_preset — preset config merge", () => {
  it("'fast' yields the exact engine-pinned fast hyperparameters", async () => {
    const r = await call(server, "lathe_lora_apply_preset", { preset: "fast" });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    const c = d.config as Record<string, unknown>;
    // Engine getPreset("fast") hard-codes these EXACT literals (no fallback).
    expect(c.lora_r).toBe(8);
    expect(c.lora_alpha).toBe(16);
    expect(c.num_epochs).toBe(1);
    expect(c.batch_size).toBe(8);
    expect(c.max_seq_length).toBe(1024);
    // Non-preset keys keep their DEFAULT_CONFIG values (applyPreset is a
    // MERGE, not a replace, and getPreset never touches base_model). No wired
    // action in this suite ever sets base_model, so this default-pin is
    // order-independent here; if a future test sets base_model via a `config`
    // param before this block, harden by passing config:{base_model:...}.
    expect(c.base_model).toBe("unsloth/llama-3-8b-bnb-4bit");
  });

  it("'quality' yields the exact engine-pinned quality hyperparameters", async () => {
    const r = await call(server, "lathe_lora_apply_preset", { preset: "quality" });
    expect(r.ok).toBe(true);
    const c = (r.data as Record<string, unknown>).config as Record<string, unknown>;
    expect(c.lora_r).toBe(32);
    expect(c.lora_alpha).toBe(64);
    expect(c.num_epochs).toBe(5);
    expect(c.max_seq_length).toBe(4096);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. lathe_lora_get_config — reads back the state apply_preset just set
// ─────────────────────────────────────────────────────────────────────
describe("lathe_lora_get_config — state round-trip", () => {
  it("returns the config established by a preceding apply_preset (singleton state)", async () => {
    await call(server, "lathe_lora_apply_preset", { preset: "quality" });
    const r = await call(server, "lathe_lora_get_config", {});
    expect(r.ok).toBe(true);
    const c = (r.data as Record<string, unknown>).config as Record<string, unknown>;
    // get_config observes the singleton mutated by the prior apply_preset.
    expect(c.lora_r).toBe(32);
    expect(c.num_epochs).toBe(5);
    expect(Array.isArray(c.target_modules)).toBe(true);
    expect((c.target_modules as string[])).toContain("q_proj");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. lathe_lora_generate_script — deterministic Unsloth script emission
// ─────────────────────────────────────────────────────────────────────
describe("lathe_lora_generate_script — pure script generator", () => {
  it("emits a Python script + config JSON + requirements with the fixed filename", async () => {
    // Explicit config param establishes deterministic state regardless of
    // any preset a prior test left on the singleton.
    const r = await call(server, "lathe_lora_generate_script", {
      config: { lora_r: 16, num_epochs: 2, max_seq_length: 2048 },
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    // Engine hard-codes this exact filename literal.
    expect(d.filename).toBe("train_lathe_lora.py");
    expect(typeof d.script).toBe("string");
    expect((d.script as string)).toContain("#!/usr/bin/env python3");
    expect(typeof d.config_json).toBe("string");
    // config_json is JSON.stringify(this.config) — must round-trip + reflect
    // the lora_r we just set via the config param.
    const cfg = JSON.parse(d.config_json as string) as Record<string, unknown>;
    expect(cfg.lora_r).toBe(16);
    expect(cfg.num_epochs).toBe(2);
    expect(typeof d.requirements).toBe("string");
    expect((d.requirements as string).length).toBeGreaterThan(0);
    expect(typeof d.estimated_vram_gb).toBe("number");
    expect((d.estimated_vram_gb as number)).toBeGreaterThan(0);
    expect(typeof d.estimated_time_hours).toBe("number");
    expect((d.estimated_time_hours as number)).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. lathe_lora_estimate — VRAM/time math scales with lora_r
// ─────────────────────────────────────────────────────────────────────
describe("lathe_lora_estimate — resource estimation", () => {
  it("returns positive VRAM + time, and a larger lora_r needs more VRAM", async () => {
    const small = await call(server, "lathe_lora_estimate", { config: { lora_r: 8 } });
    const big = await call(server, "lathe_lora_estimate", { config: { lora_r: 64 } });
    expect(small.ok && big.ok).toBe(true);
    const s = small.data as Record<string, number>;
    const b = big.data as Record<string, number>;
    expect(typeof s.estimated_vram_gb).toBe("number");
    expect(s.estimated_vram_gb).toBeGreaterThan(0);
    expect(typeof s.estimated_time_hours).toBe("number");
    expect(s.estimated_time_hours).toBeGreaterThan(0);
    // estimateVRAM() = base + lora_r*per_r (+…): strictly monotone in lora_r,
    // so 64 must cost strictly more VRAM than 8 (real math, not a tautology).
    expect(b.estimated_vram_gb).toBeGreaterThan(s.estimated_vram_gb);
  });

  it("pins the EXACT deterministic VRAM/time for a fully-specified config (R9 arithmetic intent)", async () => {
    // The VRAM/time formulas are fully deterministic (no rounding ambiguity).
    // Monotonicity alone would stay green if a coefficient regressed (e.g. the
    // 4bit/checkpointing multipliers or per_r), so pin the exact traced values
    // for a fully-specified config. Independently computed against the engine
    // at HEAD: estimateVRAM()→13.5, estimateTime()→12.5 for this input. A
    // coefficient drift now fails loudly.
    const r = await call(server, "lathe_lora_estimate", {
      config: {
        lora_r: 16, lora_alpha: 32, batch_size: 4, gradient_accumulation: 4,
        learning_rate: 2e-4, max_seq_length: 2048, num_epochs: 3,
      },
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, number>;
    expect(d.estimated_vram_gb).toBe(13.5);
    expect(d.estimated_time_hours).toBe(12.5);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6. lathe_lora_validate_config — real validation rules + slimmer awareness
// ─────────────────────────────────────────────────────────────────────
describe("lathe_lora_validate_config — config validation", () => {
  it("a balanced/in-range config is valid (empty errors stripped by slimmer)", async () => {
    const r = await call(server, "lathe_lora_validate_config", {
      config: { lora_r: 16, lora_alpha: 32, batch_size: 4, gradient_accumulation: 4, learning_rate: 2e-4, max_seq_length: 2048, num_epochs: 3 },
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    expect(d.valid).toBe(true);
    // errors:[] and warnings:[] are empty → responseSlimmer strips them at the
    // MCP transport, so the KEYS must be absent from the round-tripped object
    // (not present-as-[]). Asserting key-absence pins this exact transport
    // contract: if a regression stops stripping (or the engine emits a
    // spurious error/warning) `"errors" in d` flips true and this fails loud.
    expect("errors" in d).toBe(false);
    expect("warnings" in d).toBe(false);
    expect(Object.keys(d).sort()).toEqual(["success", "valid"]);
  });

  it("lora_r below the 4..128 band is invalid with the exact engine error string", async () => {
    const r = await call(server, "lathe_lora_validate_config", {
      config: { lora_r: 2, max_seq_length: 2048 },
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    expect(d.valid).toBe(false);
    // Non-empty errors survive the slimmer. Bind to the EXACT engine message
    // (engine:431) so a future rule-text change fails loudly (R9).
    const errors = d.errors as string[];
    expect(Array.isArray(errors)).toBe(true);
    expect(errors).toContain("lora_r should be between 4 and 128");
  });
});
