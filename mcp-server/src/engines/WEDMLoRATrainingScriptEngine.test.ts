import { describe, it, expect, beforeEach } from "vitest";
import {
  wedmLoRATrainingScriptEngine,
  type WedmTrainingConfig,
  type WedmTrainingPreset,
} from "./WEDMLoRATrainingScriptEngine.js";

/**
 * Test coverage for U-WCTP-A2a — WEDMLoRATrainingScriptEngine.
 *
 * Mirrors the LatheLoRATrainingScriptEngine test envelope but asserts
 * WEDM-specific generated content (7 instruction families, physics
 * provenance citations, Sodick dialect example, wedm_lora_train.jsonl
 * dataset path) — so a future drift away from the dataset builder's
 * contract fails loud (R12).
 */
describe("WEDMLoRATrainingScriptEngine", () => {
  beforeEach(() => {
    // Reset to defaults — singleton engine carries state across tests
    // unless we explicitly restore. Match lathe pattern.
    wedmLoRATrainingScriptEngine.setConfig({
      base_model: "unsloth/Qwen2.5-Coder-7B-bnb-4bit",
      dataset_path: "data/training/wedm_lora_train.jsonl",
      output_dir: "models/wedm-lora",
      lora_r: 16,
      lora_alpha: 32,
      lora_dropout: 0.05,
      target_modules: ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
      learning_rate: 2e-4,
      batch_size: 4,
      gradient_accumulation: 4,
      num_epochs: 3,
      max_seq_length: 2048,
      warmup_ratio: 0.03,
      weight_decay: 0.01,
      use_4bit: true,
      use_gradient_checkpointing: true,
      logging_steps: 10,
      save_steps: 100,
      eval_steps: 100,
      fp16: false,
      bf16: true,
    });
  });

  // ----- config get/set ----------------------------------------------------

  it("exposes defensive copy via getConfig", () => {
    const a = wedmLoRATrainingScriptEngine.getConfig();
    a.lora_r = 999;
    const b = wedmLoRATrainingScriptEngine.getConfig();
    expect(b.lora_r).toBe(16);
  });

  it("setConfig merges (does not replace) and returns the merged config", () => {
    const merged = wedmLoRATrainingScriptEngine.setConfig({ lora_r: 24, lora_alpha: 48 });
    expect(merged.lora_r).toBe(24);
    expect(merged.lora_alpha).toBe(48);
    expect(merged.base_model).toBe("unsloth/Qwen2.5-Coder-7B-bnb-4bit");
    expect(merged.dataset_path).toBe("data/training/wedm_lora_train.jsonl");
  });

  // ----- generateScript bundle --------------------------------------------

  it("generateScript emits filename train_wedm_lora.py (not lathe)", () => {
    const out = wedmLoRATrainingScriptEngine.generateScript();
    expect(out.filename).toBe("train_wedm_lora.py");
    expect(out.filename).not.toMatch(/lathe/i);
  });

  it("generateScript embeds the WEDM dataset path (wedm_lora_train.jsonl)", () => {
    const out = wedmLoRATrainingScriptEngine.generateScript();
    expect(out.script).toContain("data/training/wedm_lora_train.jsonl");
    expect(out.script).not.toContain("lathe-lora-train.jsonl");
  });

  it("generateScript embeds the WEDM output_dir (models/wedm-lora)", () => {
    const out = wedmLoRATrainingScriptEngine.generateScript();
    expect(out.script).toContain("models/wedm-lora");
    expect(out.script).not.toContain("models/lathe-lora");
  });

  it("script defaults to the coder-tuned base model (WEDM emits dialect snippets)", () => {
    const out = wedmLoRATrainingScriptEngine.generateScript();
    expect(out.script).toContain("Qwen2.5-Coder-7B-bnb-4bit");
  });

  it("script docstring cites the 7 WEDM instruction families", () => {
    const out = wedmLoRATrainingScriptEngine.generateScript();
    expect(out.script).toContain("wire_parameter_calc");
    expect(out.script).toContain("pass_strategy");
    expect(out.script).toContain("controller_dialect");
    expect(out.script).toContain("wire_break_diagnose");
    expect(out.script).toContain("taper_uv");
    expect(out.script).toContain("surface_integrity");
    expect(out.script).toContain("cost_estimate");
  });

  it("script docstring cites physics provenance (Klocke / Sato / Toenshoff / Carslaw-Jaeger)", () => {
    const out = wedmLoRATrainingScriptEngine.generateScript();
    expect(out.script).toContain("Klocke");
    expect(out.script).toContain("Sato");
    expect(out.script).toContain("Toenshoff");
    expect(out.script).toContain("Carslaw-Jaeger");
  });

  it("script uses the WEDM_PROMPT formatter (not LATHE_PROMPT)", () => {
    const out = wedmLoRATrainingScriptEngine.generateScript();
    expect(out.script).toContain("WEDM_PROMPT");
    expect(out.script).not.toContain("LATHE_PROMPT");
  });

  it("config_json is valid JSON and round-trips back into the engine", () => {
    const out = wedmLoRATrainingScriptEngine.generateScript();
    const parsed = JSON.parse(out.config_json) as WedmTrainingConfig;
    expect(parsed.lora_r).toBe(16);
    expect(parsed.dataset_path).toBe("data/training/wedm_lora_train.jsonl");
    expect(parsed.output_dir).toBe("models/wedm-lora");
  });

  it("requirements include unsloth + PEFT stack", () => {
    const out = wedmLoRATrainingScriptEngine.generateScript();
    expect(out.requirements).toContain("torch");
    expect(out.requirements).toContain("transformers");
    expect(out.requirements).toContain("peft");
    expect(out.requirements).toContain("bitsandbytes");
    expect(out.requirements).toContain("unsloth");
  });

  // ----- estimates --------------------------------------------------------

  it("estimateVRAM returns a positive number for the default config", () => {
    const vram = wedmLoRATrainingScriptEngine.estimateVRAM();
    expect(vram).toBeGreaterThan(0);
    expect(vram).toBeLessThan(24); // Qwen Coder 7B 4bit r=16 should fit a 24GB GPU
  });

  it("estimateVRAM scales with lora_r and inflates when 4bit is off", () => {
    const baseline = wedmLoRATrainingScriptEngine.estimateVRAM();
    wedmLoRATrainingScriptEngine.setConfig({ lora_r: 64 });
    const r64 = wedmLoRATrainingScriptEngine.estimateVRAM();
    expect(r64).toBeGreaterThan(baseline);

    wedmLoRATrainingScriptEngine.setConfig({ use_4bit: false });
    const full = wedmLoRATrainingScriptEngine.estimateVRAM();
    expect(full).toBeGreaterThan(r64);
  });

  it("estimateTime returns a positive number scaling with num_epochs", () => {
    const t1 = wedmLoRATrainingScriptEngine.estimateTime();
    wedmLoRATrainingScriptEngine.setConfig({ num_epochs: 6 });
    const t6 = wedmLoRATrainingScriptEngine.estimateTime();
    expect(t1).toBeGreaterThan(0);
    expect(t6).toBeGreaterThan(t1);
  });

  // ----- presets ----------------------------------------------------------

  it.each<WedmTrainingPreset>(["fast", "balanced", "quality"])(
    "getPreset(%s) returns a valid partial config",
    (preset) => {
      const partial = wedmLoRATrainingScriptEngine.getPreset(preset);
      expect(partial.lora_r).toBeGreaterThan(0);
      expect(partial.num_epochs).toBeGreaterThan(0);
      expect(partial.batch_size).toBeGreaterThan(0);
    }
  );

  it("applyPreset('quality') raises lora_r and num_epochs above balanced", () => {
    const balanced = wedmLoRATrainingScriptEngine.applyPreset("balanced");
    const balancedR = balanced.lora_r;
    const quality = wedmLoRATrainingScriptEngine.applyPreset("quality");
    expect(quality.lora_r).toBeGreaterThan(balancedR);
    expect(quality.num_epochs).toBeGreaterThan(balanced.num_epochs);
  });

  it("applyPreset('fast') shortens to 1 epoch and reduces context", () => {
    const c = wedmLoRATrainingScriptEngine.applyPreset("fast");
    expect(c.num_epochs).toBe(1);
    expect(c.max_seq_length).toBeLessThanOrEqual(1024);
  });

  // ----- validateConfig ---------------------------------------------------

  it("validateConfig accepts the defaults", () => {
    const v = wedmLoRATrainingScriptEngine.validateConfig();
    expect(v.valid).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  it("validateConfig errors on lora_r out of range", () => {
    wedmLoRATrainingScriptEngine.setConfig({ lora_r: 2 });
    const v = wedmLoRATrainingScriptEngine.validateConfig();
    expect(v.valid).toBe(false);
    expect(v.errors.join(" ")).toContain("lora_r");
  });

  it("validateConfig errors on max_seq_length < 512", () => {
    wedmLoRATrainingScriptEngine.setConfig({ max_seq_length: 256 });
    const v = wedmLoRATrainingScriptEngine.validateConfig();
    expect(v.valid).toBe(false);
    expect(v.errors.join(" ")).toContain("max_seq_length");
  });

  it("validateConfig warns when lora_alpha < lora_r", () => {
    wedmLoRATrainingScriptEngine.setConfig({ lora_r: 32, lora_alpha: 16 });
    const v = wedmLoRATrainingScriptEngine.validateConfig();
    expect(v.warnings.join(" ")).toContain("lora_alpha");
  });

  it("validateConfig warns when effective batch < 8", () => {
    wedmLoRATrainingScriptEngine.setConfig({ batch_size: 1, gradient_accumulation: 2 });
    const v = wedmLoRATrainingScriptEngine.validateConfig();
    expect(v.warnings.join(" ")).toContain("batch");
  });

  // ----- inference script -------------------------------------------------

  it("generateInferenceScript references the WEDM model path", () => {
    const inf = wedmLoRATrainingScriptEngine.generateInferenceScript();
    expect(inf).toContain("models/wedm-lora/final");
    expect(inf).not.toContain("lathe-lora");
  });

  it("inference example targets Sodick LN controller (WEDM dialect)", () => {
    const inf = wedmLoRATrainingScriptEngine.generateInferenceScript();
    expect(inf).toContain("Sodick");
  });

  it("inference example cites a real JM Die WEDM customer (ATF)", () => {
    // ATF is one of the two confirmed-real WEDM customers from the A2-DSB
    // smoke run on H:/PRISM/JM DIE/WIRE EDM. Asserting it here means a future
    // refactor away from the JM Die archive corpus fails loud.
    const inf = wedmLoRATrainingScriptEngine.generateInferenceScript();
    expect(inf).toContain("ATF");
  });
});
