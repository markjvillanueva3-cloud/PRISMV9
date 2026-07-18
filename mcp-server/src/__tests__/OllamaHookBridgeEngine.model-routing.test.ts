/**
 * OllamaHookBridgeEngine.model-routing.test.ts
 *
 * BLACKWELL-MODEL-INTEGRATION-MS0 P2 (2026-06-06) — supersedes the
 * OBSIDIAN-AUTOMATE-MS3/U-OLLAMA-14B-BUMP contract (qwen2.5-coder:7b/14b),
 * which went stale when 7b/14b were `ollama rm`'d from the Blackwell host
 * (2026-06-04) and the overrides were re-pointed to 32b — this test file was
 * left asserting deleted tags and was failing 8/8 before this rewrite.
 *
 * Current contract after the gpt-oss:20b speed-tier wiring:
 *   - speed-critical hooks (grep_index, mcp_route, general) → gpt-oss:20b
 *   - quality/code hooks (ai_feature, code_explain, pattern_match, validation) →
 *     qwen3-coder:30b (FLEET-OLLAMA-ROUTING/U-FLOR-CODER-DEFAULT 2026-06-10: the
 *     newer 30B-A3B MoE code default; install-gated → 32b floor if absent)
 *   - defaultModel = qwen2.5-coder:32b (covers any future HookType + is the floor)
 *   - constructor merges user config without losing the override table
 *   - INSTALL-GATE: resolveInstalledModel() falls back to the installed default
 *     (32b) when a configured model (gpt-oss:20b) is not in the live /api/tags
 *     cache, so a not-yet-pulled speed model never cold-fails a hook.
 */

import { describe, it, expect } from "vitest";
import { OllamaHookBridgeEngine } from "../engines/OllamaHookBridgeEngine.js";

describe("OllamaHookBridgeEngine — model routing (gpt-oss:20b speed tier)", () => {
  it("speed-critical grep_index resolves to gpt-oss:20b", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("grep_index")).toBe("gpt-oss:20b");
  });

  it("speed-critical mcp_route resolves to gpt-oss:20b", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("mcp_route")).toBe("gpt-oss:20b");
  });

  it("general (fast catch-all) resolves to gpt-oss:20b", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("general")).toBe("gpt-oss:20b");
  });

  // U-FLOR-CODER-DEFAULT (2026-06-10): the 4 code/quality hooks moved from the
  // qwen2.5-coder:32b dense floor to qwen3-coder:30b (newer 30B-A3B MoE). These
  // assertions fail under the old config -- they pin the active-code-default flip.
  it("code hook ai_feature routes to qwen3-coder:30b (active code default)", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("ai_feature")).toBe("qwen3-coder:30b");
  });

  it("code hook code_explain routes to qwen3-coder:30b (active code default)", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("code_explain")).toBe("qwen3-coder:30b");
  });

  it("code hook pattern_match routes to qwen3-coder:30b (active code default)", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("pattern_match")).toBe("qwen3-coder:30b");
  });

  it("code hook validation routes to qwen3-coder:30b (active code default)", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("validation")).toBe("qwen3-coder:30b");
  });

  it("defaultModel stays qwen2.5-coder:32b (the install-gate fallback floor)", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getConfig().defaultModel).toBe("qwen2.5-coder:32b");
  });

  it("install-gate: when qwen3-coder:30b is ABSENT, a code hook falls back to the 32b floor", () => {
    // The safety contract behind keeping defaultModel=32b: if the newer coder is not
    // pulled, code hooks must degrade to the held floor, never cold-fail (R9 intent).
    const engine = new OllamaHookBridgeEngine();
    engine.setCachedModels(["qwen2.5-coder:32b", "gpt-oss:20b", "nomic-embed-text"]); // no qwen3-coder
    expect(engine.resolveInstalledModel(engine.getModelForHook("code_explain"))).toBe(
      "qwen2.5-coder:32b",
    );
  });

  it("install-gate: when qwen3-coder:30b IS present, the code hook keeps it", () => {
    const engine = new OllamaHookBridgeEngine();
    engine.setCachedModels(["qwen3-coder:30b", "qwen2.5-coder:32b", "gpt-oss:20b"]);
    expect(engine.resolveInstalledModel(engine.getModelForHook("code_explain"))).toBe(
      "qwen3-coder:30b",
    );
  });

  it("user config can override individual entries without losing the rest", () => {
    // Caller pins validation to the speed tier for a CI runner with tight timeouts.
    const engine = new OllamaHookBridgeEngine({
      modelOverrides: { validation: "gpt-oss:20b" },
    });
    expect(engine.getModelForHook("validation")).toBe("gpt-oss:20b");
    // Other entries must NOT be wiped — the shallow-merge regression class.
    expect(engine.getModelForHook("ai_feature")).toBe("qwen3-coder:30b");
    expect(engine.getModelForHook("grep_index")).toBe("gpt-oss:20b");
  });
});

describe("OllamaHookBridgeEngine — install-gate (resolveInstalledModel)", () => {
  it("returns the configured speed model when it IS installed", () => {
    const engine = new OllamaHookBridgeEngine();
    engine.setCachedModels(["gpt-oss:20b", "qwen2.5-coder:32b", "nomic-embed-text"]);
    // grep_index → gpt-oss:20b, present in the live cache → used unchanged.
    expect(engine.resolveInstalledModel(engine.getModelForHook("grep_index"))).toBe(
      "gpt-oss:20b",
    );
  });

  it("falls back to the installed default (32b) when the speed model is NOT pulled", () => {
    const engine = new OllamaHookBridgeEngine();
    // Live host lacks gpt-oss:20b (mid-pull / peer host) but has the 32b default.
    engine.setCachedModels(["qwen2.5-coder:32b", "nomic-embed-text"]);
    expect(engine.resolveInstalledModel("gpt-oss:20b")).toBe("qwen2.5-coder:32b");
  });

  it("falls back to the first installed model when neither the candidate nor the default is present", () => {
    const engine = new OllamaHookBridgeEngine();
    // Neither gpt-oss:20b nor the 32b default present — pick the first installed.
    engine.setCachedModels(["llama3.2:3b"]);
    expect(engine.resolveInstalledModel("gpt-oss:20b")).toBe("llama3.2:3b");
  });

  it("passes the candidate through unchanged when the cache is empty/never-refreshed (no false fallback)", () => {
    const engine = new OllamaHookBridgeEngine();
    // Default state: cachedModels is null (status() never called) → stay truthful
    // to config; query()'s try/catch handles a genuinely-missing model gracefully.
    expect(engine.resolveInstalledModel("gpt-oss:20b")).toBe("gpt-oss:20b");
    engine.setCachedModels([]); // explicit empty snapshot = treat as "unknown"
    expect(engine.resolveInstalledModel("gpt-oss:20b")).toBe("gpt-oss:20b");
  });

  it("setCachedModels(null) clears the snapshot back to config-truthful pass-through", () => {
    const engine = new OllamaHookBridgeEngine();
    engine.setCachedModels(["qwen2.5-coder:32b"]); // 20b absent → would fall back
    expect(engine.resolveInstalledModel("gpt-oss:20b")).toBe("qwen2.5-coder:32b");
    engine.setCachedModels(null); // clear
    expect(engine.resolveInstalledModel("gpt-oss:20b")).toBe("gpt-oss:20b");
  });

  it("quality hooks on 32b are unaffected by the gate when 32b is installed", () => {
    const engine = new OllamaHookBridgeEngine();
    engine.setCachedModels(["gpt-oss:20b", "qwen2.5-coder:32b"]);
    expect(engine.resolveInstalledModel(engine.getModelForHook("validation"))).toBe(
      "qwen2.5-coder:32b",
    );
  });
});
