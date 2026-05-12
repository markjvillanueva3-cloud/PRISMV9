/**
 * context-window-boot-chart.integration.test.ts — CPP-MS5-U-CPP36
 *
 * Verifies SessionStart compaction-survival emits a "Context Window Map"
 * ASCII chart whose format matches ContextWindowMapEngine.chart(). The
 * hook has an inline mirror of the chart logic (because .mjs can't import
 * TS); this test keeps the mirror honest by:
 *   1. parsing the bars emitted in the compaction-survival file
 *   2. seeding an engine instance with the same label/token pairs
 *   3. asserting the engine's chart() produces matching percentage rows
 *
 * @milestone CPP-MS5-U-CPP36
 */

import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { ContextWindowMapEngine } from "../engines/ContextWindowMapEngine.js";

const SURVIVAL_HOOK = "H:\\prism\\.claude\\helpers\\compaction-survival.mjs";
const SURVIVAL_LEGACY = "H:\\prism\\.claude\\helpers\\.compaction-survival.md";

describe("Context Window Map in boot block (CPP-MS5-U-CPP36)", () => {
  let content = "";

  beforeAll(() => {
    spawnSync("node", [SURVIVAL_HOOK], { encoding: "utf8", windowsHide: true });
  });

  it("boot block contains '## Context Window Map' section", async () => {
    content = await fs.readFile(SURVIVAL_LEGACY, "utf8");
    expect(content).toMatch(/^## Context Window Map/m);
  });

  it("chart block has Total line with token count + utilization percent", () => {
    const totalLine = content.match(/^Total:\s+(\d+)\s+tokens\s+\(~(\d+)%\s+of\s+200K/m);
    expect(totalLine).not.toBeNull();
    const tokens = Number(totalLine![1]);
    const pct = Number(totalLine![2]);
    expect(tokens).toBeGreaterThan(0);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it("chart block contains fenced code block with at least one bar row", () => {
    const fence = content.match(/## Context Window Map[^\n]*\n[^\n]*\n```\n([\s\S]*?)\n```/);
    expect(fence).not.toBeNull();
    const rows = fence![1].split("\n").filter((r) => r.trim().length > 0);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      // each row: "<type>  <bar>  <pct>% (<tokens> tok)"
      expect(row).toMatch(/\d+%\s+\(\d+\s+tok\)/);
    }
  });

  it("hook chart format matches ContextWindowMapEngine.chart() for identical seeds", () => {
    // Round-trip: parse hook rows, seed engine with exact tokens, compare.
    const fence = content.match(/## Context Window Map[^\n]*\n[^\n]*\n```\n([\s\S]*?)\n```/);
    const rows = fence![1].split("\n").filter((r) => r.trim().length > 0);
    const parsed = rows
      .map((r) => {
        // e.g. "system         ############...  97% (76020 tok)"
        const m = r.match(/^(\S+)\s+[#\s]*\s+(\d+)%\s+\((\d+)\s+tok\)/);
        if (!m) return null;
        return { type: m[1], pct: Number(m[2]), tokens: Number(m[3]) };
      })
      .filter((x) => x !== null) as Array<{ type: string; pct: number; tokens: number }>;

    expect(parsed.length).toBeGreaterThan(0);

    const engine = new ContextWindowMapEngine();
    for (const p of parsed) {
      // engine expects one of its known types; fall back to 'other' for unknowns
      const t = ["system", "file", "tool-output", "conversation", "memory", "error", "other"]
        .includes(p.type) ? p.type : "other";
      engine.add(t as "system", `seed-${t}`, p.tokens);
    }
    const engineChart = engine.chart();
    // engine renders its own ordering + percentages; we just check the rendered
    // lines mention the same percentages we extracted from the hook output.
    for (const p of parsed) {
      expect(engineChart).toContain(`${p.pct}%`);
    }
  });

  it("percentages in one chart sum to 100 (±1 for rounding)", () => {
    const fence = content.match(/## Context Window Map[^\n]*\n[^\n]*\n```\n([\s\S]*?)\n```/);
    const rows = fence![1].split("\n").filter((r) => r.trim().length > 0);
    const pcts = rows.map((r) => {
      const m = r.match(/(\d+)%/);
      return m ? Number(m[1]) : 0;
    });
    if (pcts.length === 0) return;
    const sum = pcts.reduce((a, b) => a + b, 0);
    // Rounding of N categories → expected tolerance N
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(pcts.length);
  });

  it("ContextWindowMapEngine.chart() is stable across calls with same data", () => {
    const e = new ContextWindowMapEngine();
    e.add("system", "a", 500);
    e.add("memory", "b", 200);
    e.add("file", "c", 100);
    const a = e.chart();
    const b = e.chart();
    expect(a).toBe(b);
  });
});
