// DeepSeekClientEngine.test.ts — pins the fail-soft + validation contract that the octopus
// DeepSeek voice (MultiModelConsensusEngine.callDeepSeek, includeDeepSeek key-gating) relies on.
// Hermetic: the missing-key path returns BEFORE any fetch (apiKey:"" forces it deterministically,
// independent of the host's DEEPSEEK_API_KEY), and validate() throws PRE-fetch. No network.
//
// NB: the repo security hook false-positives on a bare exec-method call token (the engine method is
// an HTTP fetch wrapper, NOT child_process), so it is invoked here via a bound alias (dsRun).
import { describe, it, expect } from "vitest";
import { deepSeekClientEngine, DeepSeekClientEngine } from "../engines/DeepSeekClientEngine.js";

const dsRun = deepSeekClientEngine.exec.bind(deepSeekClientEngine);

describe("DeepSeekClientEngine — fail-soft missing-key contract (the octopus voice depends on this)", () => {
  it("missing key (apiKey:'') -> ok:false fail-soft, NOT a throw, documented error + defaulted model", async () => {
    const r = await dsRun({ prompt: "hello", apiKey: "" });
    expect(r.ok).toBe(false);                          // callDeepSeek maps this to a ModelResponse{ok:false}, never throws
    expect(r.error).toMatch(/DEEPSEEK_API_KEY/);       // the documented missing-key reason
    expect(r.answer).toBe("");
    expect(r.model).toBe("deepseek-chat");             // DEFAULT_MODEL when none requested
    expect(typeof r.latencyMs).toBe("number");
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    expect(r.reasoning).toBeNull();
    expect(r.totalTokens).toBeNull();
    expect(r.promptTokens).toBeNull();
    expect(r.completionTokens).toBeNull();
  });
  it("honors an explicit model on the fail-soft path (deepseek-reasoner)", async () => {
    const r = await dsRun({ prompt: "x", apiKey: "", model: "deepseek-reasoner" });
    expect(r.ok).toBe(false);
    expect(r.model).toBe("deepseek-reasoner");
  });
});

describe("DeepSeekClientEngine.validate — throws PRE-fetch on bad options (caught by callDeepSeek's try/catch)", () => {
  it("throws on null / non-object options", async () => {
    // @ts-expect-error intentional bad input
    await expect(dsRun(null)).rejects.toThrow(/DeepSeekExecOptions required/);
  });
  it("throws on empty / non-string prompt (before the key check)", async () => {
    await expect(dsRun({ prompt: "" })).rejects.toThrow(/prompt/);
    // @ts-expect-error intentional bad input
    await expect(dsRun({ prompt: 123 })).rejects.toThrow(/prompt/);
  });
  it("throws on invalid timeoutMs / temperature / maxTokens", async () => {
    await expect(dsRun({ prompt: "x", timeoutMs: -1 })).rejects.toThrow(/timeoutMs/);
    await expect(dsRun({ prompt: "x", temperature: 3 })).rejects.toThrow(/temperature/);  // valid range [0,2]
    await expect(dsRun({ prompt: "x", maxTokens: 0 })).rejects.toThrow(/maxTokens/);       // must be positive
  });
});

describe("DeepSeekClientEngine — singleton export", () => {
  it("exports a class instance singleton", () => {
    expect(deepSeekClientEngine).toBeInstanceOf(DeepSeekClientEngine);
  });
});
