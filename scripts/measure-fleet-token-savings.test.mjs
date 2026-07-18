/**
 * Tests for measure-fleet-token-savings.mjs — pure-fn + mock-fs coverage.
 *
 * U-MWO09 (slot:bravo 2026-05-26). Real concrete-value assertions only.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BASELINE_BYTES,
  CHARS_PER_TOKEN,
  bytesToTokens,
  pctSaved,
  buildReport,
  measureCurrent,
  renderTable,
} from "./measure-fleet-token-savings.mjs";

describe("bytesToTokens", () => {
  it("rounds 1000 bytes to 250 tokens at 4 chars/token", () => {
    assert.equal(bytesToTokens(1000), 250);
  });
  it("rounds correctly for non-multiples", () => {
    assert.equal(bytesToTokens(7), 2);   // 1.75 → 2
    assert.equal(bytesToTokens(2), 1);   // 0.5 → 1 (half-up)
    assert.equal(bytesToTokens(1), 0);   // 0.25 → 0
  });
  it("matches CHARS_PER_TOKEN constant", () => {
    assert.equal(bytesToTokens(CHARS_PER_TOKEN * 100), 100);
  });
});

describe("pctSaved", () => {
  it("100→50 = 0.5", () => {
    assert.equal(pctSaved(100, 50), 0.5);
  });
  it("100→100 = 0", () => {
    assert.equal(pctSaved(100, 100), 0);
  });
  it("0 baseline → 0 (no divide-by-zero)", () => {
    assert.equal(pctSaved(0, 0), 0);
    assert.equal(pctSaved(0, 100), 0);
  });
  it("current > baseline → clamped to 0", () => {
    assert.equal(pctSaved(100, 200), 0);
  });
});

describe("buildReport", () => {
  it("aggregates across surfaces", () => {
    const baseline = { a: 1000, b: 2000 };
    const current = { a: 500, b: 1000 };
    const report = buildReport(baseline, current);
    assert.equal(report.surfaces.length, 2);
    assert.equal(report.totals.baselineBytes, 3000);
    assert.equal(report.totals.currentBytes, 1500);
    assert.equal(report.totals.savedBytes, 1500);
    assert.equal(report.totals.pctSaved, 0.5);
    assert.equal(report.schemaVersion, "1.0.0");
    assert.equal(report.targetPctSaved, 0.8);
    assert.equal(report.goalMet, false);   // 50% < 80%
  });

  it("marks goalMet=true when reduction ≥80%", () => {
    const baseline = { a: 1000 };
    const current = { a: 100 };           // 90% reduction
    const report = buildReport(baseline, current);
    assert.equal(report.goalMet, true);
  });

  it("treats missing current keys as 0", () => {
    const baseline = { a: 1000, b: 500 };
    const current = { a: 500 };           // b missing
    const report = buildReport(baseline, current);
    const bRow = report.surfaces.find((r) => r.surface === "b");
    assert.equal(bRow.currentBytes, 0);
    assert.equal(bRow.pctSaved, 1.0);     // 100% saved (the surface disappeared)
  });

  it("baseline constants match spec audit numbers", () => {
    // Snapshot test — if BASELINE_BYTES drifts, this test forces an explicit update.
    assert.equal(BASELINE_BYTES["project-CLAUDE.md"], 74500);
    assert.equal(BASELINE_BYTES["user-CLAUDE.md"], 25800);
    assert.equal(BASELINE_BYTES["RTK.md"], 4400);
    assert.equal(BASELINE_BYTES["auto-memory-MEMORY.md"], 24400);
  });
});

describe("measureCurrent (with mock fs)", () => {
  function makeMockFs(sizes) {
    return {
      statSync(p) {
        const norm = String(p).replace(/[/\\]+/g, "/");
        for (const [key, size] of Object.entries(sizes)) {
          if (norm.endsWith(key)) return { size };
        }
        throw new Error(`ENOENT ${p}`);
      },
    };
  }
  it("returns sizes for found files and tracks missing ones", () => {
    const fsImpl = makeMockFs({
      "CLAUDE.md": 50000,
      "RTK.md":    3000,
      "MEMORY.md": 10000,
    });
    const result = measureCurrent({ fsImpl, root: "/root", home: "/home" });
    // 2 CLAUDE.md keys resolve to the same suffix → both get 50000
    assert.equal(result.current["project-CLAUDE.md"], 50000);
    assert.equal(result.current["user-CLAUDE.md"], 50000);
    assert.equal(result.current["RTK.md"], 3000);
    assert.equal(result.current["auto-memory-MEMORY.md"], 10000);
    assert.equal(result.missing.length, 0);
  });
  it("missing files get 0 bytes + missing list entry", () => {
    const fsImpl = makeMockFs({ "CLAUDE.md": 100 });
    const result = measureCurrent({ fsImpl, root: "/r", home: "/h" });
    assert.equal(result.current["RTK.md"], 0);
    assert.equal(result.current["auto-memory-MEMORY.md"], 0);
    assert.ok(result.missing.length >= 2);
    assert.ok(result.missing.some((m) => m.key === "RTK.md"));
  });
});

describe("renderTable", () => {
  it("produces a markdown table with header + total row", () => {
    const report = buildReport({ a: 100 }, { a: 20 });
    const md = renderTable(report);
    assert.ok(md.includes("# Fleet token-savings report"));
    assert.ok(md.includes("| Surface |"));
    assert.ok(md.includes("| a |"));
    assert.ok(md.includes("| **TOTAL** |"));
    assert.ok(md.includes("80.0%"));   // 80% pct row for total
    assert.ok(md.includes("Goal met: ✓ YES"));   // 80% meets the 80% bar
  });
  it("renders YES when goalMet=true and NO when false", () => {
    const yesReport = buildReport({ a: 1000 }, { a: 100 });
    assert.ok(renderTable(yesReport).includes("✓ YES"));
    const noReport = buildReport({ a: 1000 }, { a: 800 });
    assert.ok(renderTable(noReport).includes("✗ NO"));
  });
});
