/**
 * MultiModelConsensusEngine -- Hermes OAuth-proxy Grok voice wiring.
 *
 * OCTOPUS-HERMES-SYNERGY (slot:zulu, 2026-06-23). Proves the consumer side of the
 * new 3rd Grok transport: callGrok routes through the FREE local Hermes proxy
 * (:8645, the operator's managed Grok credential) when neither XAI_API_KEY nor the
 * `grok` CLI is present -- exactly the dormant-host case the prior octopus runs hit
 * (2 local ollama voices only). The transport itself is unit-tested in
 * GrokClient.test.ts; this file proves the consensus engine WIRES to it in the
 * right priority order, and that a fully-dormant host still degrades cleanly.
 *
 * callGrok is private -> reflected via bracket-access. All client engines are
 * mocked; no real proxy / network is touched.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { multiModelConsensusEngine } from "../engines/MultiModelConsensusEngine.js";
import { grokClientEngine, type GrokResult } from "../engines/GrokClientEngine.js";
import { grokCLIClientEngine } from "../engines/GrokCLIClientEngine.js";
import { codexClientEngine } from "../engines/CodexClientEngine.js";
import { ollamaClientEngine } from "../engines/OllamaClientEngine.js";

// Reflect the private callGrok(prompt, model?, reasoning?, timeoutMs?).
type CallGrok = (prompt: string, model?: string, reasoning?: "low" | "medium" | "high", timeoutMs?: number)
  => Promise<{ model: string; vendor: string; ok: boolean; answer: string; latencyMs: number; tokens: number | null; error: string | null }>;
const callGrok = ((multiModelConsensusEngine as unknown) as { callGrok: CallGrok }).callGrok
  .bind(multiModelConsensusEngine) as CallGrok;

// Scrub ALL vendor keys so the ask() fan-out below is deterministic + no live voice
// fires a real network call, regardless of the runner's shell (mirrors the hermetic
// scrub in MultiModelConsensusEngine.test.ts).
const _VENDOR_KEYS = ["GEMINI_API_KEY", "GOOGLE_API_KEY", "XAI_API_KEY", "DEEPSEEK_API_KEY", "GLM_API_KEY", "ZHIPU_API_KEY"] as const;
const _savedVendorKeys: Record<string, string | undefined> = {};

function hermesResult(over: Partial<GrokResult> = {}): GrokResult {
  return {
    ok: true,
    answer: "consensus draft via hermes",
    promptTokens: 135,
    completionTokens: 12,
    totalTokens: 221,
    model: "grok-4.3",
    latencyMs: 42,
    error: null,
    ...over,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  for (const k of _VENDOR_KEYS) { _savedVendorKeys[k] = process.env[k]; delete process.env[k]; } // force keyless
  grokClientEngine.resetHermesProbeCache();
});

afterEach(() => {
  for (const k of _VENDOR_KEYS) {
    if (_savedVendorKeys[k] === undefined) delete process.env[k];
    else process.env[k] = _savedVendorKeys[k];
  }
  vi.restoreAllMocks();
});

describe("callGrok -- routes the Grok voice through the Hermes proxy when keyless + no CLI", () => {
  it("seats the hermes-proxy backend and reports the served model + token usage", async () => {
    vi.spyOn(grokCLIClientEngine, "isAvailable").mockReturnValue(false);
    vi.spyOn(grokClientEngine, "hermesProxyReachable").mockResolvedValue(true);
    const transport = vi.spyOn(grokClientEngine, "execViaHermesProxy").mockResolvedValue(hermesResult());

    const r = await callGrok("rank these options");

    expect(r.vendor).toBe("xai");          // hermes IS Grok -> still the xai voice
    expect(r.ok).toBe(true);
    expect(r.answer).toBe("consensus draft via hermes");
    expect(r.model).toBe("grok-4.3");      // true served model surfaced for the ledger
    expect(r.tokens).toBe(221);
    expect(r.error).toEqual(null);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("forwards prompt + model hint + timeout to the proxy transport", async () => {
    vi.spyOn(grokCLIClientEngine, "isAvailable").mockReturnValue(false);
    vi.spyOn(grokClientEngine, "hermesProxyReachable").mockResolvedValue(true);
    const transport = vi.spyOn(grokClientEngine, "execViaHermesProxy").mockResolvedValue(hermesResult());

    await callGrok("the user prompt", "grok-4", "high", 12_345);

    expect(transport).toHaveBeenCalledWith(expect.objectContaining({
      prompt: "the user prompt",
      model: "grok-4",
      timeoutMs: 12_345,
    }));
  });

  it("propagates a transport failure as a fail-soft xai voice (ok=false), never throws", async () => {
    vi.spyOn(grokCLIClientEngine, "isAvailable").mockReturnValue(false);
    vi.spyOn(grokClientEngine, "hermesProxyReachable").mockResolvedValue(true);
    vi.spyOn(grokClientEngine, "execViaHermesProxy")
      .mockResolvedValue(hermesResult({ ok: false, answer: "", error: "hermes-proxy: upstream OAuth expired", totalTokens: null }));

    const r = await callGrok("x");
    expect(r.vendor).toBe("xai");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("upstream OAuth expired");
  });
});

describe("callGrok -- backend priority + dormant-host degradation", () => {
  it("does NOT touch the hermes proxy when XAI_API_KEY is set (HTTP API wins)", async () => {
    process.env.XAI_API_KEY = `synthetic-${process.pid}`;
    // bracket-access exec to mirror the engine's security-hook-dodging call site
    const apiPath = vi.spyOn(grokClientEngine, "exec")
      .mockResolvedValue({ ok: true, answer: "via xai http", promptTokens: 1, completionTokens: 1, totalTokens: 2, model: "grok-4", latencyMs: 5, error: null });
    const hermesProbe = vi.spyOn(grokClientEngine, "hermesProxyReachable").mockResolvedValue(true);
    const hermesTransport = vi.spyOn(grokClientEngine, "execViaHermesProxy").mockResolvedValue(hermesResult());

    const r = await callGrok("x");
    expect(r.answer).toBe("via xai http");
    expect(apiPath).toHaveBeenCalledTimes(1);
    expect(hermesProbe).not.toHaveBeenCalled();      // short-circuited before the proxy
    expect(hermesTransport).not.toHaveBeenCalled();
  });

  it("degrades to errResponse (not a crash) when key + CLI + proxy are ALL absent", async () => {
    vi.spyOn(grokCLIClientEngine, "isAvailable").mockReturnValue(false);
    vi.spyOn(grokClientEngine, "hermesProxyReachable").mockResolvedValue(false);
    const transport = vi.spyOn(grokClientEngine, "execViaHermesProxy");

    const r = await callGrok("x");
    expect(r.vendor).toBe("xai");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("no Grok backend");
    expect(r.error).toContain("hermes proxy unreachable");
    expect(transport).not.toHaveBeenCalled();          // never attempted when unreachable
  });
});

describe("ask() round-trip -- the Hermes Grok voice JOINS the consensus pool via the gate (R15)", () => {
  beforeEach(() => {
    // Deterministic two-voice baseline (codex + ollama); claude/dualOllama off. The Grok voice
    // is the variable under test. grok CLI forced absent so only the hermes transport can seat it.
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "rename foo to bar", tokens: 9, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: true, value: "rename foo to bar", error: null, wallMs: 1,
    });
    vi.spyOn(grokCLIClientEngine, "isAvailable").mockReturnValue(false);
  });

  it("seats a vendor:'xai' voice in r.responses when keyless + proxy reachable", async () => {
    vi.spyOn(grokClientEngine, "hermesProxyReachable").mockResolvedValue(true);
    vi.spyOn(grokClientEngine, "execViaHermesProxy").mockResolvedValue(hermesResult({ answer: "rename foo to bar" }));

    // includeHermesAgentLenses:false -> exercise the SINGLE legacy grok voice path. The default now
    // auto-seats the 5-lens persona panel (OCTOPUS-HERMES-AGENTS, operator max-pro 2026-06-25), so this
    // single-voice contract must opt out explicitly.
    const r = await multiModelConsensusEngine.ask({ prompt: "x", includeClaude: false, dualOllama: false, includeHermesAgentLenses: false });
    const xai = r.responses.find((x) => x.vendor === "xai");
    expect(xai).toBeDefined();          // the includeGrok gate opened AND callGrok routed via hermes
    expect(xai!.ok).toBe(true);
    expect(xai!.model).toBe("grok-4.3");
  });

  it("DEFAULT-ON: auto-seats the 5-lens hermes-AGENT panel (distinct persona voices) when proxy reachable + no opt-out", async () => {
    vi.spyOn(grokClientEngine, "hermesProxyReachable").mockResolvedValue(true);
    const systemsSeen: string[] = [];
    vi.spyOn(grokClientEngine, "execViaHermesProxy").mockImplementation(async (o: { system?: string; model: string }) => {
      systemsSeen.push(o.system ?? "");
      return hermesResult({ answer: "rename foo to bar" });
    });
    const r = await multiModelConsensusEngine.ask({ prompt: "x", includeClaude: false, dualOllama: false });
    const xaiVoices = r.responses.filter((x) => x.vendor === "xai");
    expect(xaiVoices).toHaveLength(5);                                  // the panel auto-seated (drastic utilization)
    const labels = xaiVoices.map((v) => v.model);
    expect(labels).toEqual(expect.arrayContaining(["safety-first", "root-cause", "adversarial"]));
    expect(systemsSeen).toHaveLength(5);                               // each call got a persona system prompt
    expect(systemsSeen.every((s) => s.length > 0)).toBe(true);
  });

  it("does NOT seat a Grok voice when keyless + proxy unreachable (back-compat preserved)", async () => {
    vi.spyOn(grokClientEngine, "hermesProxyReachable").mockResolvedValue(false);
    const transport = vi.spyOn(grokClientEngine, "execViaHermesProxy");

    const r = await multiModelConsensusEngine.ask({ prompt: "x", includeClaude: false, dualOllama: false });
    expect(r.responses.some((x) => x.vendor === "xai")).toBe(false);
    expect(transport).not.toHaveBeenCalled();   // gate stayed closed -> no transport attempt
  });
});
