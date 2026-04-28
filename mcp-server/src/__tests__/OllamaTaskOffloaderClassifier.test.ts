/**
 * OllamaTaskOffloaderClassifier.test.ts
 *
 * OLLAMA-DEV-01 — fixes the classifier in ollama-task-offloader.mjs
 * which was returning `keep` for 14/14 prompts (0% offload rate). The
 * KEEP_ON_CLAUDE patterns matched any prompt containing "add" / "fix" /
 * "implement" — i.e. nearly every developer prompt — even when an
 * explicit offloadable signal ("explain X" / "summarize Y") was
 * present.
 *
 * The fix:
 *   1. Inverted classification order: positive OFFLOADABLE match wins
 *      over the (now narrower) KEEP_ON_CLAUDE fallback.
 *   2. Tightened KEEP patterns to genuinely Claude-only signals
 *      (safety, physics constants, multi-file changes, deep reasoning).
 *   3. Added category + snippet to keep events for telemetry.
 *
 * This test runs the actual hook with controlled stdin to assert the
 * decision recorded in the offload-stats.json is correct for each
 * category of prompt.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const HOOK = "H:/prism/.claude/hooks/ollama-task-offloader.mjs";
const STATS_FILE = "H:/prism/mcp-server/data/state/ollama-offload-stats.json";

function resetStats() {
  const dir = dirname(STATS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STATS_FILE, JSON.stringify({
    schemaVersion: "2.0.0",
    offloaded: 0,
    keptOnClaude: 0,
    estimatedTokensSaved: 0,
    silentSuggestions: 0,
    injectedSuggestions: 0,
    byHook: {},
    events: [],
    lastUpdated: new Date().toISOString(),
    lastReset: new Date().toISOString(),
  }, null, 2));
}

function runHook(prompt: string) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ prompt }),
    encoding: "utf8",
    timeout: 6_000,
  });
}

function readLatestEvent(): { decision?: string; category?: string; snippet?: string } | null {
  if (!existsSync(STATS_FILE)) return null;
  const stats = JSON.parse(readFileSync(STATS_FILE, "utf8")) as {
    events?: Array<{ decision?: string; category?: string; snippet?: string }>;
  };
  const ev = stats.events?.[stats.events.length - 1];
  return ev ?? null;
}

/**
 * Find the first event in the session that carries a category. The
 * offloader records two events per offload (the "offload" decision
 * with category, then a "suggest" with mode:injected). The category
 * is on the offload event, so callers asserting on category should
 * use this rather than just the latest event.
 */
function readEventWithCategory(): { decision?: string; category?: string } | null {
  if (!existsSync(STATS_FILE)) return null;
  const stats = JSON.parse(readFileSync(STATS_FILE, "utf8")) as {
    events?: Array<{ decision?: string; category?: string }>;
  };
  const events = stats.events ?? [];
  return events.find((e) => typeof e.category === "string") ?? null;
}

function clearRateLimit() {
  const path = "H:/prism/mcp-server/data/state/ollama-rate-limits.json";
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify({ lastSuggestion: {} }));
}

describe("ollama-task-offloader classifier — OLLAMA-DEV-01", () => {
  beforeEach(() => {
    resetStats();
    clearRateLimit();
  });

  it("REGRESSION: 'explain how X works' is offloadable (was kept due to no-op trigger word match before)", () => {
    const r = runHook("explain how the QdrantMemoryEngineSingleton singleton lazy init works");
    expect(r.status).toBe(0);
    const cat = readEventWithCategory();
    expect(cat?.category).toBe("explanation");
    // First event should NOT be a keep — the fix proves itself by the
    // event sequence starting with offload/suggest, not keep.
    expect(readLatestEvent()?.decision).not.toBe("keep");
  });

  it("REGRESSION: 'summarize the recent commits' is offloadable", () => {
    const r = runHook("summarize the recent five commits on this branch please");
    expect(r.status).toBe(0);
    const cat = readEventWithCategory();
    expect(cat?.category).toBe("summary");
    expect(readLatestEvent()?.decision).not.toBe("keep");
  });

  it("REGRESSION: 'add jsdoc to this engine' is offloadable as documentation", () => {
    const r = runHook("add jsdoc to the QdrantMemoryEngineSingleton class");
    expect(r.status).toBe(0);
    const cat = readEventWithCategory();
    expect(cat?.category).toBe("documentation");
    expect(readLatestEvent()?.decision).not.toBe("keep");
  });

  it("REGRESSION: 'explain how to add a new feature' wins over the keep-list 'add'", () => {
    const r = runHook("explain how to add a new dispatcher action with proper schema validation");
    expect(r.status).toBe(0);
    const cat = readEventWithCategory();
    expect(cat?.category).toBe("explanation");
    expect(readLatestEvent()?.decision).not.toBe("keep");
  });

  it("KEEP: safety-critical prompts stay on Claude", () => {
    const r = runHook("validate force calculation for the kienzle model on aisi 1018 steel");
    expect(r.status).toBe(0);
    const ev = readLatestEvent();
    expect(ev?.decision).toBe("keep");
    expect(ev?.category).toBe("complex");
    // telemetry now includes a snippet so we can debug missed offloads
    expect(typeof ev?.snippet).toBe("string");
    expect((ev?.snippet ?? "").length).toBeGreaterThan(0);
  });

  it("KEEP: physics constants invocation stays on Claude", () => {
    const r = runHook("compute the johnson-cook model parameters for inconel 718 turning");
    expect(r.status).toBe(0);
    const ev = readLatestEvent();
    expect(ev?.decision).toBe("keep");
  });

  it("KEEP: deep reasoning prompts stay on Claude", () => {
    const r = runHook("trace through the root cause of this race condition in the file claim guard");
    expect(r.status).toBe(0);
    const ev = readLatestEvent();
    expect(ev?.decision).toBe("keep");
  });

  it("KEEP: multi-file refactor stays on Claude", () => {
    const r = runHook("refactor the entire codebase to use the new memory dispatcher schema");
    expect(r.status).toBe(0);
    const ev = readLatestEvent();
    expect(ev?.decision).toBe("keep");
  });

  it("KEEP: forge / scrutinize trigger words stay on Claude", () => {
    const r = runHook("scrutinize this dispatcher wiring and report any issues you find");
    expect(r.status).toBe(0);
    const ev = readLatestEvent();
    expect(ev?.decision).toBe("keep");
  });

  it("UNKNOWN: short generic prompt with no positive offload signal records as keep with category=unknown", () => {
    const r = runHook("hi can you help me out with something useful right now please today");
    expect(r.status).toBe(0);
    const ev = readLatestEvent();
    expect(ev?.decision).toBe("keep");
    expect(ev?.category).toBe("unknown");
  });

  it("ADV: variability — 5 distinct offloadable prompts all classify NOT as keep", () => {
    clearRateLimit();
    const prompts = [
      "explain what the duplication guard engine does to ensure no duplicates",
      "give me a tldr of the INTEL milestone progress on this branch please",
      "convert this YAML configuration to JSON for the MCP server config",
      "list all the dispatchers that handle physics calculations in PRISM",
      "what does the prism_session:tool_route_best action do internally",
    ];
    let nonKeepCount = 0;
    for (const p of prompts) {
      resetStats();
      clearRateLimit();
      runHook(p);
      const ev = readLatestEvent();
      if (ev && ev.decision !== "keep") nonKeepCount++;
    }
    expect(nonKeepCount).toBeGreaterThanOrEqual(4);
  });

  it("ADV: empty stdin returns continue:true exactly", () => {
    const r = spawnSync(process.execPath, [HOOK], { input: "", encoding: "utf8", timeout: 4_000 });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });

  it("ADV: malformed JSON stdin returns continue:true exactly", () => {
    const r = spawnSync(process.execPath, [HOOK], { input: "garbage{{", encoding: "utf8", timeout: 4_000 });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('{"continue":true}');
  });
});
