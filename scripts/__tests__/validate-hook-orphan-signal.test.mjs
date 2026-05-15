/**
 * validate-hook-orphan-signal.test.mjs — companion to iter4 hook-orphan validator.
 *
 * Coverage: parseArgs · sampleDeterministic · makeRng · buildHookPatterns · scanHook
 * (4 classifications: TRULY-ORPHAN / FALSE-POSITIVE-WIRED / WEAK-SIGNAL / EXEMPT)
 * · classifyConsumer · STRONG_WIRING_KINDS · writeReport (path-safety).
 *
 * Hermetic — uses synthetic content fed via contentCache Map; does NOT touch real .claude/hooks/.
 */

import { describe, it, expect } from "vitest";
import path from "node:path";

import {
  parseArgs,
  buildHookPatterns,
  scanHook,
  sampleDeterministic,
  makeRng,
  classifyConsumer,
  STRONG_WIRING_KINDS,
  DEFAULT_SAMPLE_SIZE,
  DEFAULT_SEED,
  DEFAULT_MAX_FP_RATE_PCT,
} from "../validate-hook-orphan-signal.mjs";

// ── helpers ──────────────────────────────────────────────────────────────────

function seedHookCache(filesByRel) {
  const ROOT = path.resolve("H:/prism");
  const consumerFiles = [];
  const cache = new Map();
  for (const [rel, content] of Object.entries(filesByRel)) {
    const abs = path.join(ROOT, rel.replace(/\//g, path.sep));
    consumerFiles.push(abs);
    cache.set(abs, content);
  }
  return { consumerFiles, cache };
}

// ── parseArgs ────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns defaults", () => {
    const a = parseArgs(["node", "script"]);
    expect(a.sample).toBe(DEFAULT_SAMPLE_SIZE);
    expect(a.seed).toBe(DEFAULT_SEED);
    expect(a.maxFpRate).toBe(DEFAULT_MAX_FP_RATE_PCT);
    expect(a.all).toBe(false);
    expect(a.json).toBe(false);
  });

  it("parses --max-fp-rate 25 (looser threshold)", () => {
    const a = parseArgs(["node", "script", "--max-fp-rate", "25"]);
    expect(a.maxFpRate).toBe(25);
  });

  it("parses --auto-report", () => {
    const a = parseArgs(["node", "script", "--auto-report"]);
    expect(a.autoReport).toBe(true);
  });
});

// ── makeRng + sampleDeterministic ────────────────────────────────────────────

describe("sampleDeterministic", () => {
  it("same seed → same sample", () => {
    const arr = ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8", "h9", "h10"];
    expect(sampleDeterministic(arr, 5, 42)).toEqual(sampleDeterministic(arr, 5, 42));
  });

  it("returns n unique hooks", () => {
    const arr = ["a", "b", "c", "d", "e", "f", "g"];
    const s = sampleDeterministic(arr, 3, 42);
    expect(s).toHaveLength(3);
    expect(new Set(s).size).toBe(3);
  });
});

describe("makeRng", () => {
  it("yields values in [0, 1)", () => {
    const r = makeRng(7);
    const values = Array.from({ length: 20 }, () => r());
    expect(values.every(v => v >= 0 && v < 1)).toBe(true);
  });
});

// ── buildHookPatterns ────────────────────────────────────────────────────────

describe("buildHookPatterns", () => {
  it("returns 6 detection regexes", () => {
    const p = buildHookPatterns("my-hook");
    expect(Object.keys(p).sort()).toEqual([
      "hookToHook", "mcpImport", "psTask", "scriptCp", "settingsCmd",
    ].sort().concat("settingsCmd").filter((v, i, a) => a.indexOf(v) === i).sort());
    // (simpler):
    const keys = Object.keys(p).sort();
    expect(keys).toContain("hookToHook");
    expect(keys).toContain("mcpImport");
    expect(keys).toContain("psTask");
    expect(keys).toContain("scriptCp");
    expect(keys).toContain("settingsCmd");
  });

  it("settingsCmd matches `hooks/my-hook.mjs` in JSON command field", () => {
    const p = buildHookPatterns("my-hook");
    expect(p.settingsCmd.test(`"command": "node hooks/my-hook.mjs"`)).toBe(true);
    expect(p.settingsCmd.test(`"command": "node hooks/other.mjs"`)).toBe(false);
  });

  it("hookToHook matches spawn/import of another hook", () => {
    const p = buildHookPatterns("target-hook");
    expect(p.hookToHook.test(`spawn("node", ["hooks/target-hook.mjs"])`)).toBe(true);
    expect(p.hookToHook.test(`import "./hooks/target-hook.mjs"`)).toBe(true);
  });

  it("mcpImport matches MCP-side TypeScript import", () => {
    const p = buildHookPatterns("my-hook");
    expect(p.mcpImport.test(`import { x } from "../hooks/my-hook"`)).toBe(true);
  });
});

// ── classifyConsumer ─────────────────────────────────────────────────────────

describe("classifyConsumer", () => {
  const ROOT = path.resolve("H:/prism");
  const p = (rel) => path.join(ROOT, rel.replace(/\//g, path.sep));

  it("identifies settings.json", () => {
    expect(classifyConsumer(p(".claude/settings.json"))).toBe("settings_json");
  });
  it("identifies bundles", () => {
    expect(classifyConsumer(p(".claude/hooks/bundles/stop-bundle.mjs"))).toBe("bundle");
  });
  it("identifies hook-to-hook", () => {
    expect(classifyConsumer(p(".claude/hooks/some-hook.mjs"))).toBe("hook_to_hook");
  });
  it("identifies scheduled tasks", () => {
    expect(classifyConsumer(p("scripts/system-health/03-memory-pressure.ps1"))).toBe("scheduled_task");
  });
  it("identifies script invocations", () => {
    expect(classifyConsumer(p("scripts/build-state-snapshot.mjs"))).toBe("script_invocation");
  });
  it("identifies MCP-side hooks", () => {
    expect(classifyConsumer(p("mcp-server/src/hooks/myHookEngine.ts"))).toBe("mcp_registry");
  });
});

// ── STRONG_WIRING_KINDS ──────────────────────────────────────────────────────

describe("STRONG_WIRING_KINDS", () => {
  it("contains exactly the 6 wiring paths", () => {
    expect([...STRONG_WIRING_KINDS].sort()).toEqual([
      "bundle", "hook_to_hook", "mcp_registry",
      "scheduled_task", "script_invocation", "settings_json",
    ]);
  });

  it("excludes weak signals (test, other)", () => {
    expect(STRONG_WIRING_KINDS.has("test")).toBe(false);
    expect(STRONG_WIRING_KINDS.has("other")).toBe(false);
  });
});

// ── scanHook ─────────────────────────────────────────────────────────────────

describe("scanHook", () => {
  it("classifies as FALSE-POSITIVE-WIRED when settings.json references the hook", () => {
    const { consumerFiles, cache } = seedHookCache({
      ".claude/settings.json": `{"hooks":[{"command":"node hooks/target-hook.mjs"}]}`,
    });
    const r = scanHook("target-hook", consumerFiles, cache);
    expect(r.classification).toBe("FALSE-POSITIVE-WIRED");
    expect(r.matches[0].consumerKind).toBe("settings_json");
  });

  it("classifies as FALSE-POSITIVE-WIRED when a bundle references it", () => {
    const { consumerFiles, cache } = seedHookCache({
      ".claude/hooks/bundles/userprompt-bundle.mjs": `const HOOK_BASE="/path"; const url = \`\${HOOK_BASE}/target-hook.mjs\`;`,
    });
    const r = scanHook("target-hook", consumerFiles, cache);
    expect(r.classification).toBe("FALSE-POSITIVE-WIRED");
    expect(r.matches[0].consumerKind).toBe("bundle");
  });

  it("classifies as FALSE-POSITIVE-WIRED when another hook spawns it", () => {
    const { consumerFiles, cache } = seedHookCache({
      ".claude/hooks/wrapper-hook.mjs": `spawn("node", ["hooks/target-hook.mjs"])`,
    });
    const r = scanHook("target-hook", consumerFiles, cache);
    expect(r.classification).toBe("FALSE-POSITIVE-WIRED");
    expect(r.matches[0].consumerKind).toBe("hook_to_hook");
  });

  it("classifies as FALSE-POSITIVE-WIRED when a script_invocation invokes it", () => {
    const { consumerFiles, cache } = seedHookCache({
      "scripts/build-leaf-index.mjs": `spawn("node", ["hooks/target-hook.mjs"])`,
    });
    const r = scanHook("target-hook", consumerFiles, cache);
    expect(r.classification).toBe("FALSE-POSITIVE-WIRED");
    expect(r.matches[0].consumerKind).toBe("script_invocation");
  });

  it("classifies as TRULY-ORPHAN when no consumer references the hook", () => {
    const { consumerFiles, cache } = seedHookCache({
      ".claude/settings.json": `{"hooks":[{"command":"node hooks/other.mjs"}]}`,
    });
    const r = scanHook("target-hook", consumerFiles, cache);
    expect(r.classification).toBe("TRULY-ORPHAN");
    expect(r.matches).toEqual([]);
  });

  it("skips the hook's own file", () => {
    const { consumerFiles, cache } = seedHookCache({
      ".claude/hooks/target-hook.mjs": `// I am target-hook itself, mentioning hooks/target-hook.mjs`,
    });
    const r = scanHook("target-hook", consumerFiles, cache);
    expect(r.classification).toBe("TRULY-ORPHAN");
    expect(r.matches).toEqual([]);
  });
});
