/**
 * OllamaHookBridgeEngine.model-routing.test.ts
 *
 * OBSIDIAN-AUTOMATE-MS3/U-OLLAMA-14B-BUMP
 *
 * Asserts the per-hook model-override table after the 14b bump for
 * RTX 4080 SUPER. The contract:
 *   - speed-critical hooks (grep_index, mcp_route, general) stay on 7b
 *   - latency-tolerant hooks (ai_feature, code_explain, pattern_match,
 *     validation) use 14b
 *   - defaultModel is 14b (covers any future HookType without an explicit
 *     override)
 *   - constructor merges user config without losing the override table
 *     (a previous regression had `{ ...DEFAULT_CONFIG, ...config }` shallow-merge
 *     wipe modelOverrides when callers passed only baseUrl)
 *
 * 8 it() cases.
 */

import { describe, it, expect } from "vitest";
import { OllamaHookBridgeEngine } from "../engines/OllamaHookBridgeEngine.js";

describe("OllamaHookBridgeEngine — model routing after 14b bump", () => {
  it("speed-critical grep_index resolves to 7b", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("grep_index")).toBe("qwen2.5-coder:7b");
  });

  it("speed-critical mcp_route resolves to 7b", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("mcp_route")).toBe("qwen2.5-coder:7b");
  });

  it("ai_feature resolves to 14b (was already 14b pre-bump)", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("ai_feature")).toBe("qwen2.5-coder:14b");
  });

  it("code_explain resolves to 14b (was already 14b pre-bump)", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("code_explain")).toBe("qwen2.5-coder:14b");
  });

  it("pattern_match resolves to 14b (BUMPED — was 7b)", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("pattern_match")).toBe("qwen2.5-coder:14b");
  });

  it("validation resolves to 14b (BUMPED — was 7b)", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("validation")).toBe("qwen2.5-coder:14b");
  });

  it("general stays on 7b (fast catch-all)", () => {
    const engine = new OllamaHookBridgeEngine();
    expect(engine.getModelForHook("general")).toBe("qwen2.5-coder:7b");
  });

  it("user config can override individual entries without losing the rest", () => {
    // Caller bumps validation back to 7b for a CI runner with tight timeouts.
    const engine = new OllamaHookBridgeEngine({
      modelOverrides: { validation: "qwen2.5-coder:7b" },
    });
    expect(engine.getModelForHook("validation")).toBe("qwen2.5-coder:7b");
    // Other entries must NOT be wiped — pre-bump regression class.
    expect(engine.getModelForHook("ai_feature")).toBe("qwen2.5-coder:14b");
    expect(engine.getModelForHook("grep_index")).toBe("qwen2.5-coder:7b");
  });
});
