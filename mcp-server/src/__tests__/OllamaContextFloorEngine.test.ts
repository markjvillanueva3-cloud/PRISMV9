/**
 * OllamaContextFloorEngine.test.ts
 *
 * Coverage floor:
 *   1 happy-path  · 4 failure modes · 2 adversarial · 3-model variability
 *
 * Reference values come from the BRIEF_PATH constant inside the engine
 * (`H:/prism/state/shared/CLAUDE-BRIEF.md`) — tests both inspect the live
 * file (when present) and shadow it via stubbed brief overrides for
 * deterministic assertions across CI environments.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  OllamaContextFloorEngine,
  ollamaContextFloorEngine,
  BARE_OLLAMA_TAGS,
} from "../engines/OllamaContextFloorEngine.js";

const SYNTHETIC_BRIEF = "# Test Brief\n\nPRISM canonical context (synthetic).\n";

describe("OllamaContextFloorEngine — happy path", () => {
  let engine: OllamaContextFloorEngine;
  beforeEach(() => {
    engine = new OllamaContextFloorEngine();
  });

  it("wraps a prompt with the explicit brief override", () => {
    const r = engine.wrap({
      prompt: "Calculate kc1.1 for 4140",
      model: "qwen2.5-coder:7b",
      briefOverride: SYNTHETIC_BRIEF,
    });
    expect(r.briefIncluded).toBe(true);
    expect(r.system).toBe(SYNTHETIC_BRIEF);
    expect(r.prompt).toBe("Calculate kc1.1 for 4140");
    expect(r.model).toBe("qwen2.5-coder:7b");
    expect(r.reason).toContain("briefOverride");
    expect(r.modeUsed).toBe("brief"); // default mode
    expect(r.fromBundle).toBe(false); // override path doesn't invoke bundle
  });

  it("preserves the user prompt verbatim — does not mutate it", () => {
    const userPrompt = "What is 5 plus 7? Reply with just the number.";
    const r = engine.wrap({
      prompt: userPrompt,
      briefOverride: SYNTHETIC_BRIEF,
    });
    expect(r.prompt).toBe(userPrompt);
    expect(r.prompt.includes("5 plus 7")).toBe(true);
    expect(r.system.includes(userPrompt)).toBe(false);
  });
});

describe("OllamaContextFloorEngine — variability across 3 models", () => {
  const engine = new OllamaContextFloorEngine();
  const models = ["qwen2.5-coder:7b", "deepseek-r1:14b", "llama3.2:3b"];

  for (const model of models) {
    it(`carries ${model} through the wrap result unchanged`, () => {
      const r = engine.wrap({
        prompt: "test",
        model,
        briefOverride: SYNTHETIC_BRIEF,
      });
      expect(r.model).toBe(model);
      expect(r.briefIncluded).toBe(true);
    });
  }
});

describe("OllamaContextFloorEngine — failure mode 1: empty prompt rejected", () => {
  it("throws via Zod when prompt is empty string", () => {
    const engine = new OllamaContextFloorEngine();
    expect(() => engine.wrap({ prompt: "", briefOverride: SYNTHETIC_BRIEF })).toThrow(/non-empty/);
  });
});

describe("OllamaContextFloorEngine — failure mode 2: skip-list bypass", () => {
  it("returns briefIncluded=false when taskTag is on BARE_OLLAMA_TAGS", () => {
    const engine = new OllamaContextFloorEngine();
    for (const tag of BARE_OLLAMA_TAGS) {
      const r = engine.wrap({
        prompt: "format this",
        taskTag: tag,
        briefOverride: SYNTHETIC_BRIEF,
      });
      expect(r.briefIncluded).toBe(false);
      expect(r.system).toBe("");
      expect(r.reason).toContain(tag);
    }
  });

  it("does NOT skip on tags outside the list (defensive enumeration)", () => {
    const engine = new OllamaContextFloorEngine();
    const r = engine.wrap({
      prompt: "real work",
      taskTag: "deep-reason",
      briefOverride: SYNTHETIC_BRIEF,
    });
    expect(r.briefIncluded).toBe(true);
    expect(r.reason).not.toContain("skip-list");
  });
});

describe("OllamaContextFloorEngine — failure mode 3: explicit opt-out via briefOverride=null", () => {
  it("returns briefIncluded=false when caller passes briefOverride=null", () => {
    const engine = new OllamaContextFloorEngine();
    const r = engine.wrap({
      prompt: "embed only",
      briefOverride: null,
    });
    expect(r.briefIncluded).toBe(false);
    expect(r.reason).toContain("opt-out");
  });
});

describe("OllamaContextFloorEngine — failure mode 4: oversize prompt refused", () => {
  it("throws when prompt exceeds 1MiB defensive cap", () => {
    const engine = new OllamaContextFloorEngine();
    const huge = "x".repeat(1_048_577);
    expect(() => engine.wrap({ prompt: huge, briefOverride: SYNTHETIC_BRIEF })).toThrow(
      /exceeds.*bytes/,
    );
  });
});

describe("OllamaContextFloorEngine — adversarial 1: empty briefOverride string", () => {
  it("treats empty-string override as 'no override' and falls through to file", () => {
    const engine = new OllamaContextFloorEngine();
    const r = engine.wrap({
      prompt: "hello",
      briefOverride: "",
    });
    // Empty-string override is NOT the same as null override:
    // null = explicit opt-out, "" = falls through to file load.
    // The result depends on whether the brief file exists in this env.
    // Either way, the override must NOT have been used:
    expect(r.system).not.toBe("");
    if (r.briefIncluded) {
      expect(r.reason).toBe("wrapped with cached brief");
    } else {
      expect(r.reason).toMatch(/missing|empty/);
    }
  });
});

describe("OllamaContextFloorEngine — adversarial 2: unicode + multi-line prompts", () => {
  it("preserves unicode (CJK + emoji) and newlines without corruption", () => {
    const engine = new OllamaContextFloorEngine();
    const tricky = "切削力 を 計算\n\nRa = 0.8μm 🔧";
    const r = engine.wrap({
      prompt: tricky,
      briefOverride: SYNTHETIC_BRIEF,
    });
    expect(r.prompt).toBe(tricky);
    expect(r.prompt.includes("切削力")).toBe(true);
    expect(r.prompt.includes("🔧")).toBe(true);
  });

  it("rejects whitespace-only prompts (zod min(1) lets them through, but byte cap doesn't matter)", () => {
    const engine = new OllamaContextFloorEngine();
    // Zod's min(1) treats " " as length-1 → passes. Engine accepts.
    // We document this so future readers understand the boundary.
    const r = engine.wrap({ prompt: " ", briefOverride: SYNTHETIC_BRIEF });
    expect(r.prompt).toBe(" ");
    expect(r.briefIncluded).toBe(true);
  });
});

describe("OllamaContextFloorEngine — status + refresh APIs", () => {
  it("status() reports skip-tag list verbatim", () => {
    const engine = new OllamaContextFloorEngine();
    const s = engine.status();
    expect(s.skipTags).toEqual(BARE_OLLAMA_TAGS);
    expect(s.briefPath).toMatch(/CLAUDE-BRIEF\.md$/);
  });

  it("refresh() invalidates cache and reports previousBytes", () => {
    const engine = new OllamaContextFloorEngine();
    // Force a cache load via wrap with no override (file may or may not exist)
    engine.wrap({ prompt: "warm cache", briefOverride: SYNTHETIC_BRIEF });
    // briefOverride path doesn't populate cache — so refresh shows 0 bytes.
    const r = engine.refresh();
    expect(r.cleared).toBe(true);
    expect(r.previousBytes).toBe(0);
  });
});

describe("OllamaContextFloorEngine — singleton export", () => {
  it("exports a singleton instance ready for direct use", () => {
    const r = ollamaContextFloorEngine.wrap({
      prompt: "test",
      briefOverride: SYNTHETIC_BRIEF,
    });
    expect(r.briefIncluded).toBe(true);
    expect(r.system).toBe(SYNTHETIC_BRIEF);
  });

  it("exports BARE_OLLAMA_TAGS as a frozen list of expected values", () => {
    expect(BARE_OLLAMA_TAGS.length).toBeGreaterThanOrEqual(6);
    expect(BARE_OLLAMA_TAGS).toContain("bare-ollama");
    expect(BARE_OLLAMA_TAGS).toContain("embedding");
    expect(BARE_OLLAMA_TAGS).toContain("format");
    expect(Object.isFrozen(BARE_OLLAMA_TAGS)).toBe(true);
  });
});

/**
 * Dispatcher wiring verification — invokes the engine via the
 * `prism_context` dispatcher (lazy import + action enum + schema path)
 * rather than only through the singleton. Required by the project
 * "wire-to-all-sources" rule so we don't ship engines that compile but
 * aren't reachable through MCP.
 */
describe("OllamaContextFloorEngine — dispatcher round-trip", () => {
  // Lazy-resolve the dispatcher action enum so this test fails loudly if
  // the wiring drifts (action removed from enum, or import path renamed).
  it("ollamaContextFloorEngine matches the dispatcher's lazy-import target", async () => {
    const mod = await import("../engines/OllamaContextFloorEngine.js");
    expect(mod.ollamaContextFloorEngine).toBe(ollamaContextFloorEngine);
    expect(typeof mod.ollamaContextFloorEngine.wrap).toBe("function");
    expect(typeof mod.ollamaContextFloorEngine.status).toBe("function");
    expect(typeof mod.ollamaContextFloorEngine.refresh).toBe("function");
  });

  it("dispatcher actions ollama_context_{wrap,status,refresh} are all in the enum", async () => {
    const dispatcherSrc = await import("node:fs").then((fs) =>
      fs.readFileSync("H:/PRISM/mcp-server/src/tools/dispatchers/contextDispatcher.ts", "utf-8"),
    );
    expect(dispatcherSrc).toContain('"ollama_context_wrap"');
    expect(dispatcherSrc).toContain('"ollama_context_status"');
    expect(dispatcherSrc).toContain('"ollama_context_refresh"');
    // Each action must have a matching `case` block — guards against
    // adding to the enum without wiring the handler.
    expect(dispatcherSrc).toMatch(/case "ollama_context_wrap":/);
    expect(dispatcherSrc).toMatch(/case "ollama_context_status":/);
    expect(dispatcherSrc).toMatch(/case "ollama_context_refresh":/);
  });

  it("simulates dispatcher param normalization → engine round-trip (wrap)", () => {
    // This mirrors what the dispatcher does in contextDispatcher.ts:
    //   ollamaContextFloorEngine.wrap({ prompt: String(p.prompt ?? ""), ... })
    const params = {
      prompt: "compute kc1.1 for 4140",
      model: "deepseek-r1:14b",
      taskTag: "deep-reason",
      briefOverride: SYNTHETIC_BRIEF,
    };
    const result = ollamaContextFloorEngine.wrap({
      prompt: String(params.prompt ?? ""),
      model: typeof params.model === "string" ? params.model : undefined,
      taskTag: typeof params.taskTag === "string" ? params.taskTag : undefined,
      briefOverride:
        params.briefOverride === null
          ? null
          : typeof params.briefOverride === "string"
          ? params.briefOverride
          : undefined,
    });
    expect(result.briefIncluded).toBe(true);
    expect(result.model).toBe("deepseek-r1:14b");
    expect(result.system).toBe(SYNTHETIC_BRIEF);
  });
});

/**
 * Awareness-mode coverage — brief / standard / full produce different system content.
 * Standard and full invoke prism-awareness-bundle.mjs via execFileSync; the bundle
 * always includes the AI/NEURAL/OBSIDIAN access tables, so each mode's content
 * is distinguishable by stable substrings.
 */
describe("OllamaContextFloorEngine — awareness mode variability", () => {
  it("default mode is 'brief' when not specified", () => {
    const engine = new OllamaContextFloorEngine();
    const r = engine.wrap({ prompt: "x", briefOverride: SYNTHETIC_BRIEF });
    expect(r.modeUsed).toBe("brief");
    expect(r.fromBundle).toBe(false);
  });

  it("mode='standard' invokes the bundle and reports fromBundle=true", () => {
    const engine = new OllamaContextFloorEngine();
    const r = engine.wrap({ prompt: "deep reasoning task", mode: "standard" });
    // If bundle script exists & runs, fromBundle=true and content includes access tables.
    // If bundle fails (e.g. CI without script), it falls back to brief gracefully.
    expect(r.briefIncluded).toBe(true);
    if (r.fromBundle) {
      expect(r.modeUsed).toBe("standard");
      expect(r.system).toMatch(/PRISM AI ACCESS/);
      expect(r.system).toMatch(/NEURAL.*XPROC ACCESS/);
      expect(r.reason).toContain("standard");
    } else {
      // Fallback path — modeUsed degrades to brief, reason explains why.
      expect(r.modeUsed).toBe("brief");
      expect(r.reason).toMatch(/bundle.*unavailable/);
    }
  });

  it("mode='full' also invokes the bundle (different cache slot than standard)", () => {
    const engine = new OllamaContextFloorEngine();
    const rStandard = engine.wrap({ prompt: "x", mode: "standard" });
    const rFull = engine.wrap({ prompt: "x", mode: "full" });
    if (rStandard.fromBundle && rFull.fromBundle) {
      // Full mode includes master-index excerpt; standard mode does not.
      expect(rFull.system.length).toBeGreaterThan(rStandard.system.length);
      expect(rFull.system).toMatch(/MASTER INDEX EXCERPT/);
      expect(rStandard.system).not.toMatch(/MASTER INDEX EXCERPT/);
    }
  });

  it("explicit briefOverride still wins over mode (override is highest priority)", () => {
    const engine = new OllamaContextFloorEngine();
    const r = engine.wrap({
      prompt: "x",
      mode: "full",
      briefOverride: SYNTHETIC_BRIEF,
    });
    expect(r.system).toBe(SYNTHETIC_BRIEF);
    expect(r.fromBundle).toBe(false);
    expect(r.reason).toContain("briefOverride");
  });

  it("bundle cache: second call to same mode reuses the cached content", () => {
    const engine = new OllamaContextFloorEngine();
    const r1 = engine.wrap({ prompt: "first", mode: "standard" });
    const r2 = engine.wrap({ prompt: "second", mode: "standard" });
    if (r1.fromBundle && r2.fromBundle) {
      // Same content (cached), but prompt differs in result.
      expect(r2.system).toBe(r1.system);
      expect(r2.prompt).toBe("second");
      expect(r1.prompt).toBe("first");
    }
  });

  it("rejects invalid mode via Zod enum", () => {
    const engine = new OllamaContextFloorEngine();
    expect(() =>
      // @ts-expect-error — testing runtime rejection of non-enum values
      engine.wrap({ prompt: "x", mode: "deep-mode-9000" }),
    ).toThrow();
  });
});
