/**
 * Tests for scripts/hermes-graph-improvement-driver.mts -- U-ALPHA-HERMES-GRAPH-IMPROVE.
 *
 * The driver is the I/O + CLI boundary; the pure planning core is tested in
 * GraphImprovementFanoutEngine.test.ts. This covers the driver's own surface:
 * loadWiringQueue (fail-soft read), buildLedgerEntry + recordTick (ledger round-trip).
 *
 * Run: npx vitest run --config scripts/vitest.config.mjs scripts/hermes-graph-improvement-driver.test.mjs
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadWiringQueue, buildLedgerEntry, recordTick, queueStaleness, refreshQueue, QUEUE_STALE_DAYS } from "./hermes-graph-improvement-driver.mts";
import { GraphImprovementFanoutEngine } from "../mcp-server/src/engines/GraphImprovementFanoutEngine.js";

const QUEUE = [
  { domain: "MiscDomains", id: "eng.misc", unwired: 69, coverage_pct: 96, leverageScore: 138 },
  { domain: "Speed", id: "eng.speed", unwired: 5, coverage_pct: 90, leverageScore: 5 },
  { domain: "Mill", id: "eng.mill", unwired: 2, coverage_pct: 99, leverageScore: 2 },
];

const makePlan = (over = {}) =>
  GraphImprovementFanoutEngine.plan({ queue: QUEUE, budgetTokens: 5_000_000, desiredAgents: 12, totals: { unwiredEngines: 118 }, ...over });

describe("queueStaleness (pure, R12 stale-gap guard)", () => {
  const NOW = "2026-06-26T00:00:00Z";
  it("fresh source (1 day) -> not stale", () => {
    const s = queueStaleness("2026-06-25T00:00:00Z", NOW);
    expect(s.stale).toBe(false);
    expect(s.ageDays).toBeCloseTo(1, 1);
  });
  it("old source (10 days > 7d threshold) -> STALE", () => {
    const s = queueStaleness("2026-06-16T00:00:00Z", NOW);
    expect(s.stale).toBe(true);
    expect(s.ageDays).toBeCloseTo(10, 1);
  });
  it("the empirical case: a 28-day-old snapshot is STALE (118->4 regen)", () => {
    const s = queueStaleness("2026-05-29T16:03:03.558Z", NOW);
    expect(s.stale).toBe(true);
    expect(s.ageDays).toBeGreaterThan(27);
  });
  it("null/unparseable graphGeneratedAt -> treated as STALE (fail-loud, not silent)", () => {
    expect(queueStaleness(null, NOW).stale).toBe(true);
    expect(queueStaleness(null, NOW).ageDays).toBeNull();
    expect(queueStaleness("not-a-date", NOW).stale).toBe(true);
  });
  it("threshold is configurable + QUEUE_STALE_DAYS default is 7", () => {
    expect(QUEUE_STALE_DAYS).toBe(7);
    expect(queueStaleness("2026-06-20T00:00:00Z", NOW, 3).stale).toBe(true); // 6d > 3d
    expect(queueStaleness("2026-06-20T00:00:00Z", NOW, 30).stale).toBe(false); // 6d < 30d
  });
});

describe("refreshQueue (I/O, injected spawn, fail-soft)", () => {
  it("generator exits 0 -> ok:true regenerated", () => {
    const r = refreshQueue(() => ({ status: 0 }));
    expect(r.ok).toBe(true);
    expect(r.reason).toBe("regenerated");
  });
  it("generator exits non-zero -> ok:false with exit code", () => {
    const r = refreshQueue(() => ({ status: 1 }));
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("regen-exit-1");
  });
  it("spawn error -> ok:false, never throws (adversarial)", () => {
    const r = refreshQueue(() => ({ status: null, error: new Error("ENOENT node") }));
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("regen-spawn-error");
  });
  it("spawn throws -> ok:false, swallowed (adversarial)", () => {
    const r = refreshQueue(() => { throw new Error("boom"); });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("regen-threw");
  });
});

describe("loadWiringQueue (I/O, fail-soft)", () => {
  it("missing file -> empty queue, never throws", () => {
    const q = loadWiringQueue(path.join(os.tmpdir(), "does-not-exist-prism.json"));
    expect(q.queue).toHaveLength(0);
    expect(q.source).toContain("unreadable");
    expect(q.graphGeneratedAt).toBeNull();
  });

  it("reads graphGeneratedAt when present", () => {
    const tmp = path.join(os.tmpdir(), `prism-queue-gen-${process.pid}.json`);
    fs.writeFileSync(tmp, JSON.stringify({ graphGeneratedAt: "2026-06-26T00:00:00Z", totals: {}, queue: QUEUE }));
    const q = loadWiringQueue(tmp);
    expect(q.graphGeneratedAt).toBe("2026-06-26T00:00:00Z");
    fs.rmSync(tmp, { force: true });
  });

  it("reads a real-shaped temp queue", () => {
    const tmp = path.join(os.tmpdir(), `prism-queue-${process.pid}.json`);
    fs.writeFileSync(tmp, JSON.stringify({ totals: { unwiredEngines: 7 }, queue: QUEUE }));
    const q = loadWiringQueue(tmp);
    expect(q.queue).toHaveLength(3);
    expect(q.totals.unwiredEngines).toBe(7);
    fs.rmSync(tmp, { force: true });
  });

  it("corrupt JSON -> empty queue (fail-soft, adversarial)", () => {
    const tmp = path.join(os.tmpdir(), `prism-queue-bad-${process.pid}.json`);
    fs.writeFileSync(tmp, "{ this is not json ");
    const q = loadWiringQueue(tmp);
    expect(q.queue).toHaveLength(0);
    fs.rmSync(tmp, { force: true });
  });
});

describe("ledger round-trip", () => {
  it("buildLedgerEntry is schema-versioned + carries the batch + gapsTotal", () => {
    const e = buildLedgerEntry(makePlan(), { tickAt: "2026-06-25T00:00:00Z", source: "test", budgetTokens: 5_000_000, desiredAgents: 12 });
    expect(e.schemaVersion).toBe("1.0.0");
    expect(e.gapsTotal).toBe(118);
    expect(e.spawned).toBe(e.agentBatch.length);
    expect(e.agentBatch[0].spec.model).toBe("opus");
  });

  it("refused plan records spawned:0 (R12 -- no phantom spawn count)", () => {
    const refused = makePlan({ budgetTokens: 100_000, desiredAgents: 5 });
    const e = buildLedgerEntry(refused, { tickAt: "2026-06-25T00:00:00Z", source: "test", budgetTokens: 100_000, desiredAgents: 5 });
    expect(e.ok).toBe(false);
    expect(e.spawned).toBe(0);
    expect(e.agentBatch).toHaveLength(0);
  });

  it("recordTick appends a line; corrupt path -> false (fail-soft)", () => {
    const tmp = path.join(os.tmpdir(), `prism-graph-ledger-${process.pid}.jsonl`);
    try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
    const e = buildLedgerEntry(makePlan(), { tickAt: "2026-06-25T00:00:00Z", source: "test", budgetTokens: 5_000_000, desiredAgents: 4 });
    expect(recordTick(e, tmp)).toBe(true);
    expect(recordTick(e, tmp)).toBe(true);
    const lines = fs.readFileSync(tmp, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).schemaVersion).toBe("1.0.0");
    fs.rmSync(tmp, { force: true });
    expect(recordTick(e, "\0:/no/such/\0path.jsonl")).toBe(false);
  });
});
