/**
 * orphan-inventory.test.mjs — CLEANUP-MS0 / U-CLEANUP-F1 tests
 *
 * Tests the F1 EXTENSION of scripts/orphan-inventory.mjs:
 *   - parseArgs: flag parsing including --no-rank
 *   - rankUnwiredEngines: injected analyzer, empty input, analyzer throw,
 *     engine-not-built fallback, partial-result merge
 *   - applyOutputCap: under-cap pass-through, over-cap truncation at line
 *     boundary, marker presence, exact-boundary behaviour
 *   - renderSummary: counts, top-N ranked candidates, no-score fallback
 *   - runOrphanInventory: end-to-end with injected seams (analyzeBatch +
 *     writeFile), JSON mode, ranking-skipped mode
 *
 * Note: the pre-F1 functions buildInventory/renderMarkdown read the real
 * system-graph.json — these tests do NOT exercise that path (it's the
 * already-shipped U-ORPHAN-INVENTORY behaviour). F1 tests focus on the
 * new exported surface, with runOrphanInventory tested via injected seams.
 */

import { describe, it, expect } from "vitest";

import {
  parseArgs,
  rankUnwiredEngines,
  applyOutputCap,
  renderSummary,
  runOrphanInventory,
  OUTPUT_CAP_BYTES,
  SUMMARY_TOP_RANKED,
} from "../orphan-inventory.mjs";

// ── parseArgs ────────────────────────────────────────────────────────────────

describe("parseArgs (F1)", () => {
  it("returns defaults for empty argv", () => {
    const o = parseArgs([]);
    expect(o.json).toBe(false);
    expect(o.topK).toBe(100);
    expect(o.rank).toBe(true);
  });

  it("parses --json", () => {
    expect(parseArgs(["--json"]).json).toBe(true);
  });

  it("parses --no-rank to disable WiringPotential ranking", () => {
    expect(parseArgs(["--no-rank"]).rank).toBe(false);
  });

  it("parses --top N", () => {
    expect(parseArgs(["--top", "50"]).topK).toBe(50);
  });

  it("falls back to default topK on a non-numeric --top (failure mode)", () => {
    expect(parseArgs(["--top", "banana"]).topK).toBe(100);
  });

  it("falls back to default topK on a negative --top (failure mode)", () => {
    expect(parseArgs(["--top", "-5"]).topK).toBe(100);
  });
});

// ── rankUnwiredEngines ───────────────────────────────────────────────────────

describe("rankUnwiredEngines (F1)", () => {
  it("returns source=empty + empty map for no engines", async () => {
    const r = await rankUnwiredEngines([]);
    expect(r.source).toBe("empty");
    expect(Object.keys(r.byName).length).toBe(0);
  });

  it("uses an injected analyzeBatch and merges scores by name (happy path)", async () => {
    const engines = [{ name: "FooEngine" }, { name: "BarEngine" }, { name: "BazEngine" }];
    const r = await rankUnwiredEngines(engines, {
      analyzeBatch: async (names) => names.map((n, i) => ({ name: n, score: 0.9 - i * 0.2, rationale: `rationale-${n}` })),
    });
    expect(r.source).toBe("injected");
    expect(r.byName.FooEngine.score).toBeCloseTo(0.9);
    expect(r.byName.BarEngine.score).toBeCloseTo(0.7);
    expect(r.byName.BazEngine.score).toBeCloseTo(0.5);
    expect(r.byName.FooEngine.rationale).toBe("rationale-FooEngine");
  });

  it("leaves score=null for engines the analyzer didn't return (partial result)", async () => {
    const engines = [{ name: "FooEngine" }, { name: "BarEngine" }];
    const r = await rankUnwiredEngines(engines, {
      analyzeBatch: async () => [{ name: "FooEngine", score: 0.8 }],   // BarEngine omitted
    });
    expect(r.byName.FooEngine.score).toBeCloseTo(0.8);
    expect(r.byName.BarEngine.score).toBe(null);
  });

  it("returns source=injected_error when the analyzer throws (failure mode)", async () => {
    const r = await rankUnwiredEngines([{ name: "FooEngine" }], {
      analyzeBatch: async () => { throw new Error("c1 down"); },
    });
    expect(r.source).toBe("injected_error");
    expect(r.byName.FooEngine.score).toBe(null);
  });

  it("ignores non-finite scores from the analyzer (adversarial: NaN/Infinity)", async () => {
    const engines = [{ name: "FooEngine" }, { name: "BarEngine" }];
    const r = await rankUnwiredEngines(engines, {
      analyzeBatch: async () => [
        { name: "FooEngine", score: NaN },
        { name: "BarEngine", score: Infinity },
      ],
    });
    expect(r.byName.FooEngine.score).toBe(null);
    expect(r.byName.BarEngine.score).toBe(null);
  });

  it("skips entries with no name field (adversarial: malformed engine list)", async () => {
    const engines = [{ name: "FooEngine" }, { notName: "x" }, null, { name: 42 }];
    const r = await rankUnwiredEngines(engines, { analyzeBatch: async (names) => names.map((n) => ({ name: n, score: 0.5 })) });
    expect(Object.keys(r.byName)).toEqual(["FooEngine"]);
  });

  it("default path returns engine_not_built when dist engine is absent (graceful, deterministic)", async () => {
    // No analyzeBatch injected → real path. Point distPath at a guaranteed-
    // missing file so the `engine_not_built` branch is exercised fast +
    // deterministically (importing the real dist engine pulls the whole
    // engine dependency graph and would time out the test).
    const r = await rankUnwiredEngines([{ name: "FooEngine" }], {
      distPath: "/this/path/does/not/exist/WiringPotentialEngine.js",
    });
    expect(r.source).toBe("engine_not_built");
    expect("FooEngine" in r.byName).toBe(true);
    expect(r.byName.FooEngine.score).toBe(null);
  });
});

// ── applyOutputCap ───────────────────────────────────────────────────────────

describe("applyOutputCap (F1)", () => {
  it("passes through unchanged when under the cap", () => {
    const md = "# small doc\nline two\n";
    const r = applyOutputCap(md, OUTPUT_CAP_BYTES);
    expect(r.truncated).toBe(false);
    expect(r.markdown).toBe(md);
    expect(r.bytes).toBe(Buffer.byteLength(md, "utf-8"));
  });

  it("truncates when over the cap and appends the truncation marker (boundary)", () => {
    const bigDoc = Array.from({ length: 500 }, (_, i) => `line ${i} with some padding text here`).join("\n");
    const cap = 2_048;
    const r = applyOutputCap(bigDoc, cap);
    expect(r.truncated).toBe(true);
    expect(r.markdown.includes("Output capped at")).toBe(true);
    expect(r.bytes).toBeLessThanOrEqual(cap);
  });

  it("truncates at a line boundary (no mid-line cut)", () => {
    const bigDoc = Array.from({ length: 500 }, (_, i) => `line-${i}-padding-padding-padding`).join("\n");
    const r = applyOutputCap(bigDoc, 1_024);
    const beforeMarker = r.markdown.split("\n\n---\n")[0];
    expect(beforeMarker.endsWith("padding")).toBe(true);
  });

  it("handles a doc exactly at the cap (boundary: exact fit passes through)", () => {
    const exact = "x".repeat(100);
    const r = applyOutputCap(exact, 100);
    expect(r.truncated).toBe(false);
    expect(r.markdown).toBe(exact);
  });

  it("handles an empty string (adversarial)", () => {
    const r = applyOutputCap("", OUTPUT_CAP_BYTES);
    expect(r.truncated).toBe(false);
    expect(r.bytes).toBe(0);
  });
});

// ── renderSummary ────────────────────────────────────────────────────────────

describe("renderSummary (F1)", () => {
  function fakeInv({ totalOrphans = 5, unwired = [], ranking = null } = {}) {
    return {
      generatedAt: "2026-05-14T19:00:00.000Z",
      totalOrphans,
      buildState: { unwiredEngines: unwired },
      ranking,
    };
  }

  it("renders counts for orphans + unwired sample (happy)", () => {
    const md = renderSummary(fakeInv({ totalOrphans: 7, unwired: [{ name: "A" }, { name: "B" }] }));
    expect(md.includes("Graph orphans: **7**")).toBe(true);
    expect(md.includes("BUILD_STATE unwired-engine sample: **2**")).toBe(true);
  });

  it("lists top-N ranked candidates sorted by score descending", () => {
    const unwired = [{ name: "Low" }, { name: "High" }, { name: "Mid" }];
    const ranking = {
      source: "injected",
      byName: {
        Low: { score: 0.2, rationale: "low" },
        High: { score: 0.95, rationale: "high" },
        Mid: { score: 0.5, rationale: null },
      },
    };
    const md = renderSummary(fakeInv({ unwired, ranking }));
    expect(md.includes("Top 3 wiring candidates")).toBe(true);
    expect(md.indexOf("**High**")).toBeLessThan(md.indexOf("**Mid**"));
    expect(md.indexOf("**Mid**")).toBeLessThan(md.indexOf("**Low**"));
    expect(md.includes("score `0.950`")).toBe(true);
  });

  it("caps the top list at SUMMARY_TOP_RANKED entries (boundary)", () => {
    const unwired = Array.from({ length: SUMMARY_TOP_RANKED + 5 }, (_, i) => ({ name: `E${i}` }));
    const byName = {};
    unwired.forEach((u, i) => { byName[u.name] = { score: 1 - i * 0.01, rationale: null }; });
    const md = renderSummary(fakeInv({ unwired, ranking: { source: "injected", byName } }));
    const bulletCount = (md.match(/^- \*\*E\d+\*\*/gm) ?? []).length;
    expect(bulletCount).toBe(SUMMARY_TOP_RANKED);
  });

  it("shows a no-score fallback message when ranking has no finite scores", () => {
    const unwired = [{ name: "A" }];
    const ranking = { source: "engine_not_built", byName: { A: { score: null, rationale: null } } };
    const md = renderSummary(fakeInv({ unwired, ranking }));
    expect(md.includes("No scored candidates")).toBe(true);
    expect(md.includes("not built")).toBe(true);
  });

  it("omits the ranking section entirely when inv.ranking is absent (--no-rank)", () => {
    const md = renderSummary(fakeInv({ totalOrphans: 3, unwired: [{ name: "A" }], ranking: null }));
    expect(md.includes("WiringPotential ranking source")).toBe(false);
    expect(md.includes("Graph orphans: **3**")).toBe(true);
  });
});

// ── runOrphanInventory ───────────────────────────────────────────────────────

describe("runOrphanInventory (F1)", () => {
  it("returns a structured result (never throws) when run with --no-rank", async () => {
    // buildInventory reads the real system-graph.json; in CI it may exist or
    // not. Either way the function must NOT throw — it returns {ok:true,...}
    // when the graph is present, or {error} when it's not.
    const writes = new Map();
    const res = await runOrphanInventory({
      rank: false,
      writeFile: (p, body) => writes.set(p, body),
    });
    if (res.error) {
      expect(typeof res.error).toBe("string");
      expect(res.error.length).toBeGreaterThan(0);
    } else {
      expect(res.ok).toBe(true);
      expect(typeof res.totalOrphans).toBe("number");
      expect(res.rankingSource).toBe("skipped");   // --no-rank → ranking skipped
      expect(writes.size).toBe(2);                  // dashboard + summary
    }
  });

  it("attaches WiringPotential ranking when rank!=false and analyzeBatch is injected", async () => {
    const writes = new Map();
    const res = await runOrphanInventory({
      analyzeBatch: async (names) => names.map((n) => ({ name: n, score: 0.5 })),
      writeFile: (p, body) => writes.set(p, body),
    });
    if (res.error) {
      expect(typeof res.error).toBe("string");
    } else {
      expect(res.ok).toBe(true);
      expect(res.rankingSource).toBe("injected");
      const summaryEntry = [...writes.entries()].find(([p]) => p.includes("summary"));
      expect(Array.isArray(summaryEntry)).toBe(true);
      expect(summaryEntry[1].includes("injected")).toBe(true);
    }
  });

  it("json mode returns the inventory object without writing files", async () => {
    let writeCalls = 0;
    const res = await runOrphanInventory({
      json: true,
      rank: false,
      writeFile: () => { writeCalls++; },
    });
    if (res.error) {
      expect(typeof res.error).toBe("string");
    } else {
      expect(res.json).toBe(true);
      expect(typeof res.inventory).toBe("object");
      expect(res.inventory).not.toBe(null);
      expect(writeCalls).toBe(0);
    }
  });
});
