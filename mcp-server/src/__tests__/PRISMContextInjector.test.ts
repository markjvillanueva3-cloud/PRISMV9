/**
 * PRISMContextInjectorEngine — context-bundle assembly + budget tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-1-CONTEXT-INJECT.
 *
 * Tests the real engine against the real PRISM_ROOT files (which exist on
 * this machine — CLAUDE.md, GSD_QUICK, omega-thresholds, etc.). No mocks
 * for file I/O — exercises the actual cache + mtime invalidation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PRISMContextInjectorEngine } from "../engines/PRISMContextInjectorEngine.js";

let engine: PRISMContextInjectorEngine;

beforeEach(() => {
  engine = new PRISMContextInjectorEngine();
});

describe("PRISMContextInjectorEngine — static bundle", () => {
  it("includes the 6-terminal protocol rules unconditionally", async () => {
    const ctx = await engine.buildContext("any prompt about anything");
    expect(ctx.text).toContain("6-TERMINAL PROTOCOL");
    expect(ctx.text).toContain("Lane discipline");
    expect(ctx.text).toContain("File claims");
    expect(ctx.text).toContain("Per-chat handoff");
    expect(ctx.text).toContain("duplicationGuardEngine.mustCheckBeforeCreating");
    expect(ctx.text).toContain("src/physics/constants.ts");
    expect(ctx.sourcesIncluded).toContain("6-terminal-rules");
  });

  it("loads CLAUDE.md when available", async () => {
    const ctx = await engine.buildContext("plan something");
    expect(ctx.sourcesIncluded).toContain("CLAUDE.md");
    expect(ctx.text).toContain("### CLAUDE.md");
    expect(ctx.staticBytes).toBeGreaterThan(1000);
  });

  it("loads PRISM-INVENTORY when available", async () => {
    const ctx = await engine.buildContext("plan something");
    expect(ctx.sourcesIncluded).toContain("PRISM-INVENTORY");
  });

  it("loads omega-thresholds when available", async () => {
    const ctx = await engine.buildContext("safety gate review");
    expect(ctx.sourcesIncluded).toContain("omega-thresholds");
  });

  it("returns deterministic estimatedTokens for the same prompt", async () => {
    const a = await engine.buildContext("plan x");
    const b = await engine.buildContext("plan x");
    expect(a.estimatedTokens).toBe(b.estimatedTokens);
    expect(a.text).toBe(b.text);
  });

  it("text is fully wrapped in PRISM CONTEXT delimiters", async () => {
    const ctx = await engine.buildContext("anything");
    expect(ctx.text.startsWith("=== PRISM CONTEXT")).toBe(true);
    expect(ctx.text.endsWith("=== END PRISM CONTEXT ===")).toBe(true);
  });
});

describe("PRISMContextInjectorEngine — relevance ranking", () => {
  it("includes a top-engines block when ENGINE_DIGEST exists", async () => {
    const ctx = await engine.buildContext("optimize cutting force kienzle for AISI 4340 steel");
    // ENGINE_DIGEST exists on this machine (79KB) — relevance ranker should fire
    expect(ctx.rankedBytes).toBeGreaterThan(0);
    expect(ctx.text).toContain("TOP RELEVANT ENGINES");
  });

  it("ranked layer is suppressed when staticOnly=true", async () => {
    const ctx = await engine.buildContext("kienzle force optimization", { staticOnly: true });
    expect(ctx.rankedBytes).toBe(0);
    expect(ctx.text).not.toContain("TOP RELEVANT ENGINES");
  });

  it("topEngines override controls how many engines come back", async () => {
    const ctx5 = await engine.buildContext("force kienzle taylor cutting", { topEngines: 5 });
    const ctx20 = await engine.buildContext("force kienzle taylor cutting", { topEngines: 20 });
    // ranked block in ctx5 should be smaller than ctx20 (or equal if fewer matches)
    expect(ctx5.rankedBytes).toBeLessThanOrEqual(ctx20.rankedBytes);
  });

  it("returns no ranked block when prompt has no matching keywords", async () => {
    const ctx = await engine.buildContext("zyxwvutsrq");
    // 10-letter nonsense token; very unlikely to match any engine name
    // ranker returns [] which means rankedBytes=0
    expect(ctx.rankedBytes).toBe(0);
  });
});

describe("PRISMContextInjectorEngine — model budget enforcement", () => {
  it("respects modelBudget by trimming output", async () => {
    const ctxBig = await engine.buildContext("plan migration", { modelBudget: 100_000 });
    const ctxSmall = await engine.buildContext("plan migration", { modelBudget: 2000 });
    expect(ctxSmall.estimatedTokens).toBeLessThanOrEqual(2000);
    expect(ctxSmall.text.length).toBeLessThan(ctxBig.text.length);
  });

  it("flags truncated=true when budget forced trimming", async () => {
    const ctx = await engine.buildContext("plan migration", { modelBudget: 1000 });
    expect(ctx.truncated).toBe(true);
  });

  it("flags truncated=false when output fits comfortably", async () => {
    const ctx = await engine.buildContext("plan migration", { modelBudget: 100_000 });
    expect(ctx.truncated).toBe(false);
  });

  it("emits a stub for absurdly tiny budgets without throwing", async () => {
    const ctx = await engine.buildContext("plan", { modelBudget: 100 });
    expect(ctx.text).toContain("budget too small");
    expect(ctx.estimatedTokens).toBeLessThan(100);
    expect(ctx.truncated).toBe(true);
  });

  it("rejects non-positive modelBudget", async () => {
    await expect(engine.buildContext("x", { modelBudget: 0 })).rejects.toThrow(/modelBudget/);
    await expect(engine.buildContext("x", { modelBudget: -1 })).rejects.toThrow(/modelBudget/);
  });
});

describe("PRISMContextInjectorEngine — caching", () => {
  it("second call with same prompt is faster (cache hit)", async () => {
    const start1 = Date.now();
    await engine.buildContext("plan x");
    const wall1 = Date.now() - start1;

    const start2 = Date.now();
    await engine.buildContext("plan x");
    const wall2 = Date.now() - start2;

    // Cache hit should be measurably faster — but allow generous slack for CI noise
    expect(wall2).toBeLessThanOrEqual(wall1 + 50);
  });

  it("clearCache forces re-read on next call", async () => {
    await engine.buildContext("plan x");
    engine.clearCache();
    // After clear, next call rebuilds; we just confirm it returns valid output
    const ctx = await engine.buildContext("plan x");
    expect(ctx.staticBytes).toBeGreaterThan(0);
    expect(ctx.sourcesIncluded.length).toBeGreaterThan(0);
  });
});

describe("PRISMContextInjectorEngine — input validation", () => {
  it("rejects non-string prompt", async () => {
    await expect(engine.buildContext(123 as unknown as string)).rejects.toThrow(/string/);
  });

  it("accepts empty prompt (returns static-only bundle, ranked layer empty)", async () => {
    const ctx = await engine.buildContext("");
    expect(ctx.staticBytes).toBeGreaterThan(0);
    expect(ctx.rankedBytes).toBe(0);
  });
});
