/**
 * Tests for scripts/cad-hermes-builder-driver.mts -- PA3-HERMES-CAD-BUILDER driver.
 *
 * The driver is the I/O + CLI boundary; the pure planning core is tested in
 * CADBuilderFanoutEngine.test.ts. This covers the driver's own surface:
 * loadCadStatus (fail-soft read), deriveMergeGatedIds (self-clear-post-merge),
 * buildLedgerEntry + recordTick + writePlanArtifact (ledger/artifact round-trip).
 *
 * Run: npx vitest run --config scripts/vitest.config.mjs scripts/cad-hermes-builder-driver.test.mjs
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  loadCadStatus,
  deriveMergeGatedIds,
  buildLedgerEntry,
  recordTick,
  writePlanArtifact,
} from "./cad-hermes-builder-driver.mts";
import { CADBuilderFanoutEngine } from "../mcp-server/src/engines/CADBuilderFanoutEngine.js";

const OPUS = { short: 20_000, medium: 60_000, large: 150_000 };
const SPEC = { model: "opus", effort: "max", fastMode: true };
const tmp = (name) => path.join(os.tmpdir(), `cad-hermes-test-${process.pid}-${name}`);

function samplePlan() {
  return CADBuilderFanoutEngine.plan({
    units: [
      { id: "U-CAD-PRINTGEN-E2E", phase: "B", gate: "T3", state: "PENDING", title: "printgen" },
      { id: "U-CAD-BOOLEAN", phase: "C", state: "SHIPPED", title: "boolean" },
    ],
    costTable: OPUS,
    budgetTokens: 2_000_000,
    builderSpec: SPEC,
  });
}

describe("deriveMergeGatedIds (self-clear post-merge)", () => {
  it("U-MERGE-SLOT-DELTA SHIPPED -> empty set (now-buildable units no longer merge-gated)", () => {
    const s = deriveMergeGatedIds([{ id: "U-MERGE-SLOT-DELTA", state: "SHIPPED" }]);
    expect(s.size).toBe(0);
  });
  it("U-MERGE-SLOT-DELTA PENDING -> default 2 merge-gated ids", () => {
    const s = deriveMergeGatedIds([{ id: "U-MERGE-SLOT-DELTA", state: "PENDING" }]);
    expect(s.size).toBe(2);
    expect(s.has("U-CAD-NURBS-STEP-EMIT")).toBe(true);
    expect(s.has("U-CAD-SCALE-COMPLEX")).toBe(true);
  });
  it("merge unit absent -> default 2 (conservative)", () => {
    expect(deriveMergeGatedIds([{ id: "U-CAD-PRINTGEN-E2E", state: "PENDING" }]).size).toBe(2);
  });
  it("empty / undefined results -> default 2 (never silently clears the gate)", () => {
    expect(deriveMergeGatedIds([]).size).toBe(2);
    expect(deriveMergeGatedIds(undefined).size).toBe(2);
  });
  it("merge state with case/whitespace drift ' shipped ' still counts as SHIPPED -> empty", () => {
    expect(deriveMergeGatedIds([{ id: "U-MERGE-SLOT-DELTA", state: " shipped " }]).size).toBe(0);
  });
});

describe("loadCadStatus (fail-soft read)", () => {
  it("missing file -> empty results, no throw", () => {
    const s = loadCadStatus(tmp("does-not-exist.json"));
    expect(s.results).toEqual([]);
    expect(s.shipped).toBe(0);
    expect(s.source).toMatch(/unreadable/);
  });
  it("corrupt JSON -> empty results, no throw", () => {
    const p = tmp("corrupt.json");
    fs.writeFileSync(p, "{ not json");
    try {
      const s = loadCadStatus(p);
      expect(s.results).toEqual([]);
    } finally {
      fs.rmSync(p, { force: true });
    }
  });
  it("valid status file -> parses results/shipped/total", () => {
    const p = tmp("valid.json");
    fs.writeFileSync(p, JSON.stringify({ results: [{ id: "U-A", state: "PENDING" }], shipped: 12, total: 20, generated: "2026-06-26T00:00:00Z" }));
    try {
      const s = loadCadStatus(p);
      expect(s.results.length).toBe(1);
      expect(s.shipped).toBe(12);
      expect(s.total).toBe(20);
      expect(s.generated).toBe("2026-06-26T00:00:00Z");
    } finally {
      fs.rmSync(p, { force: true });
    }
  });
});

describe("buildLedgerEntry", () => {
  it("maps the plan into a schema-versioned ledger entry", () => {
    const plan = samplePlan();
    const entry = buildLedgerEntry(plan, {
      tickAt: "2026-06-26T12:00:00Z",
      source: "test",
      budgetTokens: plan.budgetTokens,
      maxCells: 8,
      mergeGatedActive: true,
    });
    expect(entry.schemaVersion).toBe("1.0.0");
    expect(entry.tickAt).toBe("2026-06-26T12:00:00Z");
    expect(entry.cellCount).toBe(1);
    expect(entry.agentCount).toBe(4);
    expect(entry.mergeGatedActive).toBe(true);
    expect(entry.cells[0]).toEqual({ unit: "U-CAD-PRINTGEN-E2E", phase: "B", gate: "T3" });
    expect(entry.excluded.find((e) => e.id === "U-CAD-BOOLEAN")?.reason).toBe("already-shipped");
  });
});

describe("recordTick (O_APPEND, fail-soft)", () => {
  it("appends a JSONL entry that round-trips", () => {
    const p = tmp("ledger.jsonl");
    fs.rmSync(p, { force: true });
    const entry = buildLedgerEntry(samplePlan(), { tickAt: "t", source: "s", budgetTokens: 1, maxCells: 8, mergeGatedActive: false });
    try {
      expect(recordTick(entry, p)).toBe(true);
      expect(recordTick(entry, p)).toBe(true); // append, not overwrite
      const lines = fs.readFileSync(p, "utf8").trim().split("\n");
      expect(lines.length).toBe(2);
      expect(JSON.parse(lines[0]).schemaVersion).toBe("1.0.0");
    } finally {
      fs.rmSync(p, { force: true });
    }
  });
  it("fail-soft on an unwritable path (returns false, no throw)", () => {
    // A path whose parent is an existing FILE (not a dir) cannot be mkdir'd -> graceful false.
    const f = tmp("not-a-dir");
    fs.writeFileSync(f, "x");
    try {
      const entry = buildLedgerEntry(samplePlan(), { tickAt: "t", source: "s", budgetTokens: 1, maxCells: 8, mergeGatedActive: false });
      expect(recordTick(entry, path.join(f, "child", "ledger.jsonl"))).toBe(false);
    } finally {
      fs.rmSync(f, { force: true });
    }
  });
});

describe("writePlanArtifact", () => {
  it("writes a schema-versioned plan artifact that round-trips", () => {
    const p = tmp("plan.json");
    const plan = samplePlan();
    try {
      expect(writePlanArtifact(plan, { source: "test" }, p)).toBe(true);
      const read = JSON.parse(fs.readFileSync(p, "utf8"));
      expect(read.schemaVersion).toBe("1.0.0");
      expect(read.plan.cellCount).toBe(1);
      expect(read.source).toBe("test");
    } finally {
      fs.rmSync(p, { force: true });
    }
  });
  it("fail-soft on an unwritable path (returns false, no throw)", () => {
    const f = tmp("plan-not-a-dir");
    fs.writeFileSync(f, "x");
    try {
      expect(writePlanArtifact(samplePlan(), {}, path.join(f, "child", "plan.json"))).toBe(false);
    } finally {
      fs.rmSync(f, { force: true });
    }
  });
});
