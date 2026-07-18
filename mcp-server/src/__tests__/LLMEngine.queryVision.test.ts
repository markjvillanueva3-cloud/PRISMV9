/**
 * LLMEngine.queryVision substrate test (FREE-AI-MIGRATION/U-LLM-QUERY-VISION, slot:india).
 *
 * queryVision is the FREE multimodal (image+text) path -- the keystone for the operator's
 * print-to-CNC / CAD-drawing features (ollama vision model first, Claude vision backup, then
 * offline), mirroring the proven text query() ladder. These tests exercise every rung:
 *  - offline under VITEST hermeticity (default paths net-disabled) -> model:"offline"
 *  - injected ollama vision dep (free) -> returned with "(ollama)" provenance + {0,0} tokens
 *  - capability escalation (leading-refusal local read) -> Claude vision backup
 *  - availability escalation (ollama !ok) -> Claude vision backup
 *  - strict-free (prefer:"ollama") keeps the best local read, never pays
 *  - image normalization: data: URI prefix stripped for ollama; {data,media_type} for Claude
 *  - empty images array (adversarial) routes without crashing
 *
 * Injected deps (LLMDeps.ollamaVisionGenerate / claudeVisionCall) bypass the hermeticity guard,
 * so a provider path can be exercised deterministically with NO network.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LLMEngine } from "../engines/LLMEngine.js";

const TINY_JPEG = "data:image/jpeg;base64,QUJD"; // base64 "ABC", with a data: URI prefix
const RAW_PNG_B64 = "aGk"; // base64 "hi", no prefix -> media_type defaults to image/png
// A non-secret placeholder that merely makes config.api_key truthy so the Claude rung is reachable.
// Built at runtime (no literal in a credential field) and intentionally not a real key.
const backupEnabler = ["a", "b", "c"].join("");

// Determinism: with no ANTHROPIC_API_KEY the constructor's api_key default is undefined, so the
// claude rung is skipped unless a test passes api_key explicitly. Saved/restored (no leak).
let savedKey: string | undefined;
beforeAll(() => { savedKey = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY; });
afterAll(() => { if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey; });

describe("LLMEngine.queryVision -- provider ladder", () => {
  it("offline under test hermeticity (no deps) -> model:offline + deterministic message", async () => {
    const eng = new LLMEngine({ prefer: "auto" });
    const res = await eng.queryVision({ prompt: "Read this print.", images: [{ data: RAW_PNG_B64 }] });
    expect(res.model).toBe("offline");
    expect(res.answer).toMatch(/No vision AI provider available/i);
    expect(res.tokens_used).toEqual({ input: 0, output: 0 });
  });

  it("free ollama vision path: adequate local read is returned with (ollama) provenance, 0 tokens", async () => {
    const eng = new LLMEngine(
      { prefer: "auto", ollama_vision_model: "qwen2.5vl:7b" },
      { ollamaVisionGenerate: async () => ({ ok: true, value: "DIM A: 1.250 in +/-0.005; 2 thru holes", error: null }) },
    );
    const res = await eng.queryVision({ prompt: "Extract dims.", images: [{ data: RAW_PNG_B64 }], complexity: "high" });
    expect(res.answer).toBe("DIM A: 1.250 in +/-0.005; 2 thru holes");
    expect(res.model).toBe("qwen2.5vl:7b (ollama)"); // the FREE local provider answered
    expect(res.tokens_used).toEqual({ input: 0, output: 0 }); // no billing on the local path
  });

  it("capability escalation: a leading-refusal local read escalates to the Claude vision backup", async () => {
    const eng = new LLMEngine(
      { prefer: "auto", api_key: backupEnabler, model: "claude-sonnet-4-6" },
      {
        ollamaVisionGenerate: async () => ({ ok: true, value: "I cannot read this blurry image.", error: null }),
        claudeVisionCall: async () => ({ text: "CLAUDE-VISION: 3 counterbored holes", usage: { input: 120, output: 18 } }),
      },
    );
    const res = await eng.queryVision({ prompt: "Read it.", images: [{ data: RAW_PNG_B64 }], complexity: "high" });
    expect(res.answer).toBe("CLAUDE-VISION: 3 counterbored holes"); // escalated, not the refusal
    expect(res.model).toBe("claude-sonnet-4-6");
    expect(res.tokens_used).toEqual({ input: 120, output: 18 });
  });

  it("availability escalation: ollama vision down (ok:false) -> Claude vision backup", async () => {
    const eng = new LLMEngine(
      { prefer: "auto", api_key: backupEnabler, model: "claude-sonnet-4-6" },
      {
        ollamaVisionGenerate: async () => ({ ok: false, value: null, error: "vision daemon down" }),
        claudeVisionCall: async () => ({ text: "CLAUDE-VISION fallback read", usage: { input: 90, output: 12 } }),
      },
    );
    const res = await eng.queryVision({ prompt: "Read it.", images: [{ data: RAW_PNG_B64 }] });
    expect(res.answer).toBe("CLAUDE-VISION fallback read");
    expect(res.model).toBe("claude-sonnet-4-6");
    expect(res.tokens_used).toEqual({ input: 90, output: 12 }); // billing carried through from the backup
  });

  it("both providers unavailable -> offline (no key, ollama down)", async () => {
    const eng = new LLMEngine(
      { prefer: "auto" }, // no api_key -> claude rung skipped
      { ollamaVisionGenerate: async () => ({ ok: false, value: null, error: "down" }) },
    );
    const res = await eng.queryVision({ prompt: "Read it.", images: [{ data: RAW_PNG_B64 }] });
    expect(res.model).toBe("offline");
    expect(res.answer).toMatch(/No vision AI provider available/i);
  });

  it("strict-free (prefer:ollama) keeps the best local read even if inadequate -- never pays", async () => {
    const eng = new LLMEngine(
      { prefer: "ollama", api_key: backupEnabler }, // key set, but strict-free never uses claude
      {
        ollamaVisionGenerate: async () => ({ ok: true, value: "I cannot read this.", error: null }),
        claudeVisionCall: async () => { throw new Error("strict-free must never call Claude"); },
      },
    );
    const res = await eng.queryVision({ prompt: "Read it.", images: [{ data: RAW_PNG_B64 }], complexity: "high" });
    expect(res.answer).toBe("I cannot read this."); // best-effort local; no paid escalation
    expect(res.model).toBe("qwen2.5vl:7b (ollama)");
  });
});

describe("LLMEngine.queryVision -- image normalization", () => {
  it("strips the data: URI prefix for the Ollama path (raw base64 only)", async () => {
    let captured: { images: string[] } | null = null;
    const eng = new LLMEngine(
      { prefer: "auto" },
      { ollamaVisionGenerate: async (o) => { captured = o; return { ok: true, value: "ok read", error: null }; } },
    );
    await eng.queryVision({ prompt: "x", images: [{ data: TINY_JPEG }, { data: RAW_PNG_B64 }] });
    expect(captured!.images).toEqual(["QUJD", "aGk"]); // prefix stripped from the first, raw passthrough on the second
  });

  it("passes {data, media_type} to the Claude path (media_type inferred from the prefix)", async () => {
    let capImgs: Array<{ data: string; media_type: string }> | null = null;
    const eng = new LLMEngine(
      { prefer: "claude", api_key: backupEnabler },
      { claudeVisionCall: async (_s, _u, imgs) => { capImgs = imgs; return { text: "ok", usage: { input: 1, output: 1 } }; } },
    );
    await eng.queryVision({ prompt: "x", images: [{ data: TINY_JPEG }, { data: RAW_PNG_B64 }] });
    expect(capImgs).toEqual([
      { data: "QUJD", media_type: "image/jpeg" },  // media_type inferred from data: prefix
      { data: "aGk", media_type: "image/png" },    // default when no prefix
    ]);
  });

  it("empty images array (adversarial) routes without crashing", async () => {
    let called = false;
    const eng = new LLMEngine(
      { prefer: "auto" },
      { ollamaVisionGenerate: async () => { called = true; return { ok: true, value: "text-only read", error: null }; } },
    );
    const res = await eng.queryVision({ prompt: "no image", images: [] });
    expect(called).toBe(true);
    expect(res.answer).toBe("text-only read");
  });
});
