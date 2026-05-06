/**
 * TokenEconomyBenchmark — INTEL-OLLAMA-OBSIDIAN-MS0/P7-U01.
 *
 * Pure-function tests for scripts/token-economy-benchmark.mjs. Same
 * dynamic-import-via-pathToFileURL pattern as P10-U01 / P11-U08 /
 * P8-U01 so the script's I/O layer (subprocess spawn, file writes)
 * stays untouched by the test harness.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../scripts/token-economy-benchmark.mjs");

let SYNTHETIC_PROMPTS: readonly string[];
let HOOK_CATEGORY_RULES: readonly { pattern: RegExp; category: string }[];
let approxTokenCount: any;
let categoriseHook: any;
let parseHookEntries: any;
let aggregateMeasurements: any;
let renderMarkdown: any;

beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  SYNTHETIC_PROMPTS = mod.SYNTHETIC_PROMPTS;
  HOOK_CATEGORY_RULES = mod.HOOK_CATEGORY_RULES;
  approxTokenCount = mod.approxTokenCount;
  categoriseHook = mod.categoriseHook;
  parseHookEntries = mod.parseHookEntries;
  aggregateMeasurements = mod.aggregateMeasurements;
  renderMarkdown = mod.renderMarkdown;
});

describe("P7-U01 SYNTHETIC_PROMPTS", () => {
  it("contains exactly 10 reproducible prompts (per spec exit_condition)", () => {
    expect(SYNTHETIC_PROMPTS.length).toBe(10);
  });

  it("every prompt is a non-empty string", () => {
    for (const p of SYNTHETIC_PROMPTS) {
      expect(typeof p).toBe("string");
      expect(p.length).toBeGreaterThan(0);
    }
  });

  it("is frozen (Object.freeze) so the prompt set cannot drift across runs", () => {
    expect(Object.isFrozen(SYNTHETIC_PROMPTS)).toBe(true);
  });

  it("has no duplicate prompts (each measures a distinct workflow shape)", () => {
    expect(new Set(SYNTHETIC_PROMPTS).size).toBe(SYNTHETIC_PROMPTS.length);
  });
});

describe("P7-U01 categoriseHook", () => {
  it("classifies wiki injectors as 'wiki'", () => {
    expect(categoriseHook("wiki-precheck-inject.mjs")).toBe("wiki");
    expect(categoriseHook("wiki-bootstrap.mjs")).toBe("wiki");
  });

  it("classifies awareness-* hooks as 'awareness'", () => {
    expect(categoriseHook("awareness-snapshot.mjs")).toBe("awareness");
    expect(categoriseHook("prism-awareness-cache.mjs")).toBe("awareness");
  });

  it("classifies memory/handoff/session hooks as 'memory'", () => {
    expect(categoriseHook("session-memory.mjs")).toBe("memory");
    expect(categoriseHook("per-agent-handoff.mjs")).toBe("memory");
  });

  it("classifies directive/CLAUDE.md enforcer as 'directives'", () => {
    expect(categoriseHook("claudemd-ollama-enforcer.mjs")).toBe("directives");
    expect(categoriseHook("directive-stale-warn.mjs")).toBe("directives");
  });

  it("classifies coordination hooks as 'coordination'", () => {
    expect(categoriseHook("agent-coordination.mjs")).toBe("coordination");
    expect(categoriseHook("cross-session-work-aware.mjs")).toBe("coordination");
  });

  it("classifies router/inject hooks as 'router'", () => {
    expect(categoriseHook("ollama-auto-router.mjs")).toBe("router");
    expect(categoriseHook("shortcode-injector.mjs")).toBe("router");
  });

  it("classifies reminder/janitor as 'housekeeping'", () => {
    expect(categoriseHook("periodic-checkin.mjs")).toBe("housekeeping");
    expect(categoriseHook("node-process-janitor.mjs")).toBe("housekeeping");
  });

  it("falls through to 'other' for unmatched names", () => {
    expect(categoriseHook("some-random-hook.mjs")).toBe("other");
    expect(categoriseHook("")).toBe("other");
    expect(categoriseHook(null as any)).toBe("other");
  });
});

describe("P7-U01 approxTokenCount", () => {
  it("returns 0 for empty / whitespace-only / non-string", () => {
    expect(approxTokenCount("")).toBe(0);
    expect(approxTokenCount("   \n\t  ")).toBe(0);
    expect(approxTokenCount(null as any)).toBe(0);
    expect(approxTokenCount(undefined as any)).toBe(0);
    expect(approxTokenCount(42 as any)).toBe(0);
  });

  it("rounds up so any non-empty input has at least 1 token", () => {
    expect(approxTokenCount("a")).toBe(1);
    expect(approxTokenCount("ab")).toBe(1);
    expect(approxTokenCount("abc")).toBe(1);
    expect(approxTokenCount("abcd")).toBe(1);
    expect(approxTokenCount("abcde")).toBe(2);
  });

  it("scales linearly: 4 chars ≈ 1 token", () => {
    expect(approxTokenCount("a".repeat(4))).toBe(1);
    expect(approxTokenCount("a".repeat(40))).toBe(10);
    expect(approxTokenCount("a".repeat(400))).toBe(100);
  });

  it("trims trailing whitespace before counting", () => {
    // 4 'a' chars + trailing spaces should still be 1 token, not more.
    expect(approxTokenCount("aaaa     \n")).toBe(1);
  });
});

describe("P7-U01 parseHookEntries", () => {
  function settings(ups: any) {
    return { hooks: { UserPromptSubmit: ups } };
  }

  it("returns [] for falsy / malformed settings", () => {
    expect(parseHookEntries(null)).toEqual([]);
    expect(parseHookEntries(undefined)).toEqual([]);
    expect(parseHookEntries({})).toEqual([]);
    expect(parseHookEntries({ hooks: {} })).toEqual([]);
    expect(parseHookEntries({ hooks: { UserPromptSubmit: "string" } })).toEqual([]);
  });

  it("flattens nested matcher arrays into a single hook list", () => {
    const out = parseHookEntries(settings([
      { matcher: ".*", hooks: [
        { type: "command", command: "node H:/x/foo.mjs" },
        { type: "command", command: "node H:/x/bar.mjs" },
      ] },
      { hooks: [{ type: "command", command: "node H:/x/baz.mjs --flag=1" }] },
    ]));
    expect(out.map((e: any) => e.name)).toEqual(["foo.mjs", "bar.mjs", "baz.mjs"]);
  });

  it("extracts the script basename (strips path + args) for categorisation", () => {
    const out = parseHookEntries(settings([
      { hooks: [{ type: "command", command: "node H:/prism/.claude/hooks/awareness-snapshot.mjs --quiet" }] },
    ]));
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("awareness-snapshot.mjs");
    expect(out[0].command).toContain("awareness-snapshot.mjs");
    expect(out[0].command).toContain("--quiet");
  });

  it("strips quotes from extracted basenames", () => {
    const out = parseHookEntries(settings([
      { hooks: [{ type: "command", command: '"H:/.claude/bin/portable-node" "H:/x/quoted.mjs"' }] },
    ]));
    expect(out[0].name).toBe("quoted.mjs");
  });

  it("ignores entries with empty / non-string commands", () => {
    const out = parseHookEntries(settings([
      { hooks: [
        { type: "command", command: "" },
        { type: "command", command: null },
        { type: "command", command: 42 },
        { type: "command", command: "node /h/ok.mjs" },
      ] },
    ]));
    expect(out.map((e: any) => e.name)).toEqual(["ok.mjs"]);
  });
});

describe("P7-U01 aggregateMeasurements", () => {
  function row(prompt: string, hookName: string, tokens: number, ok = true) {
    return { prompt, hookName, tokens, durationMs: 5, ok };
  }

  it("returns a zeroed summary for empty / non-array input", () => {
    const a = aggregateMeasurements([]);
    expect(a.summary.promptCount).toBe(0);
    expect(a.summary.hookCount).toBe(0);
    expect(a.summary.totalTokens).toBe(0);
    expect(a.summary.errors).toBe(0);
    expect(aggregateMeasurements(null as any).summary.totalTokens).toBe(0);
    expect(aggregateMeasurements(undefined as any).summary.totalTokens).toBe(0);
  });

  it("sums tokens, distinct prompts and hooks correctly", () => {
    const a = aggregateMeasurements([
      row("p1", "wiki-h.mjs", 100),
      row("p1", "awareness-h.mjs", 50),
      row("p2", "wiki-h.mjs", 80),
      row("p2", "awareness-h.mjs", 60),
    ]);
    expect(a.summary.promptCount).toBe(2);
    expect(a.summary.hookCount).toBe(2);
    expect(a.summary.totalTokens).toBe(290);
    expect(a.summary.meanTokensPerPrompt).toBe(145);
  });

  it("counts errors separately and excludes them from token totals", () => {
    const a = aggregateMeasurements([
      row("p1", "good.mjs", 100),
      row("p1", "bad.mjs", 0, false),
      row("p2", "bad.mjs", 0, false),
    ]);
    expect(a.summary.errors).toBe(2);
    expect(a.summary.totalTokens).toBe(100);
    expect(a.perHook.find((h: any) => h.name === "bad.mjs")?.errors).toBe(2);
  });

  it("groups per-category and computes share of total tokens", () => {
    const a = aggregateMeasurements([
      row("p1", "wiki-h.mjs", 600),       // category: wiki
      row("p1", "awareness-h.mjs", 300),  // category: awareness
      row("p1", "other-h.mjs", 100),      // category: other
    ]);
    expect(a.perCategory.wiki.tokens).toBe(600);
    expect(a.perCategory.wiki.share).toBeCloseTo(0.6, 5);
    expect(a.perCategory.awareness.share).toBeCloseTo(0.3, 5);
    expect(a.perCategory.other.share).toBeCloseTo(0.1, 5);
  });

  it("sorts perHook descending by tokens", () => {
    const a = aggregateMeasurements([
      row("p1", "small-h.mjs", 10),
      row("p1", "big-h.mjs", 1000),
      row("p1", "mid-h.mjs", 100),
    ]);
    expect(a.perHook.map((h: any) => h.name)).toEqual(["big-h.mjs", "mid-h.mjs", "small-h.mjs"]);
  });

  it("ignores malformed rows safely", () => {
    const a = aggregateMeasurements([
      row("p1", "h.mjs", 50),
      null as any,
      undefined as any,
      42 as any,
      { prompt: "p1" } as any,            // missing hookName
      { hookName: "h.mjs" } as any,       // missing prompt+tokens
    ]);
    expect(a.summary.totalTokens).toBe(50);
    expect(a.summary.hookCount).toBe(1);
  });

  it("zero share when totalTokens is zero (avoids NaN)", () => {
    const a = aggregateMeasurements([row("p1", "h.mjs", 0, false)]);
    expect(Number.isFinite(a.perCategory.other?.share ?? 0)).toBe(true);
  });
});

describe("P7-U01 renderMarkdown", () => {
  it("returns a non-empty Markdown document with the expected sections", () => {
    const agg = aggregateMeasurements([
      { prompt: "p1", hookName: "wiki-h.mjs", tokens: 100, durationMs: 5, ok: true },
    ]);
    const md = renderMarkdown(agg, { generatedAt: "2026-05-06T19:00:00.000Z", settingsPath: "/x/settings.json" });
    expect(md).toContain("# TOKEN-ECONOMY-REPORT");
    expect(md).toContain("## Summary");
    expect(md).toContain("## Per-Category Breakdown");
    expect(md).toContain("## Per-Hook Hot-Spots");
    expect(md).toContain("## How to interpret");
  });

  it("renders the generatedAt + settingsPath meta when supplied", () => {
    const md = renderMarkdown(aggregateMeasurements([]), { generatedAt: "2026-05-06T19:00:00.000Z", settingsPath: "/x/settings.json" });
    expect(md).toContain("2026-05-06T19:00:00.000Z");
    expect(md).toContain("/x/settings.json");
  });

  it("handles null/undefined input gracefully", () => {
    expect(renderMarkdown(null as any, undefined as any)).toContain("# TOKEN-ECONOMY-REPORT");
    expect(renderMarkdown(undefined as any, undefined as any)).toContain("(no data)");
  });

  it("ends with a trailing newline (POSIX-friendly)", () => {
    const md = renderMarkdown(aggregateMeasurements([]), undefined as any);
    expect(md.endsWith("\n")).toBe(true);
  });
});
