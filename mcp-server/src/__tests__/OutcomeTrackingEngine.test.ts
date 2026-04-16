/**
 * Tests for OutcomeTrackingEngine (PP-0.19-U-LLM5)
 *
 * Uses a scratch tmp dir per test to keep real state files untouched.
 * Covers: log/query round-trip, validation rejection, multi-record
 * persistence across reload(), stats aggregation, filtered queries,
 * limit/ordering, and concurrent-write serialization.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { OutcomeTrackingEngine } from "../engines/OutcomeTrackingEngine.js";

describe("OutcomeTrackingEngine", () => {
  let dir: string;
  let engine: OutcomeTrackingEngine;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "prism-outcome-"));
    engine = new OutcomeTrackingEngine(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("log() returns a record with timestamp, seq, and schemaVersion", async () => {
    const rec = await engine.log({
      programId: "PRG-1",
      outcome: "good",
    });
    expect(rec.programId).toBe("PRG-1");
    expect(rec.outcome).toBe("good");
    expect(typeof rec.recordedAt).toBe("string");
    expect(Number.isFinite(Date.parse(rec.recordedAt))).toBe(true);
    expect(rec.seq).toBe(0);
    expect(rec.schemaVersion).toBe(1);
  });

  it("persists to JSONL and survives reload()", async () => {
    await engine.log({ programId: "A", outcome: "good" });
    await engine.log({ programId: "B", outcome: "scrap" });
    const file = readFileSync(engine.getLogPath(), "utf-8").trim().split("\n");
    expect(file.length).toBe(2);

    const fresh = new OutcomeTrackingEngine(dir);
    const rows = await fresh.query();
    expect(rows.length).toBe(2);
    const ids = rows.map((r) => r.programId).sort();
    expect(ids).toEqual(["A", "B"]);
  });

  it("assigns monotonic seq across logs and reloads continue numbering", async () => {
    await engine.log({ programId: "A", outcome: "good" });
    await engine.log({ programId: "A", outcome: "adjusted" });
    expect((await engine.forProgram("A")).map((r) => r.seq)).toEqual([0, 1]);

    const fresh = new OutcomeTrackingEngine(dir);
    const next = await fresh.log({ programId: "A", outcome: "good" });
    expect(next.seq).toBe(2);
  });

  it("rejects missing programId via zod validation", async () => {
    await expect(
      // biome-ignore lint: intentional bad input
      engine.log({ programId: "", outcome: "good" } as never),
    ).rejects.toThrow();
  });

  it("rejects unknown outcome kinds", async () => {
    await expect(
      // biome-ignore lint: intentional bad input
      engine.log({ programId: "A", outcome: "kinda_ok" } as never),
    ).rejects.toThrow();
  });

  it("query() filters by programId + machineId", async () => {
    await engine.log({ programId: "A", outcome: "good", machineId: "M1" });
    await engine.log({ programId: "A", outcome: "good", machineId: "M2" });
    await engine.log({ programId: "B", outcome: "scrap", machineId: "M1" });

    const onM1 = await engine.query({ machineId: "M1" });
    expect(onM1.length).toBe(2);
    const aOnly = await engine.query({ programId: "A" });
    expect(aOnly.length).toBe(2);
    const both = await engine.query({ programId: "A", machineId: "M2" });
    expect(both.length).toBe(1);
  });

  it("query() honors outcome kind array filter", async () => {
    await engine.log({ programId: "A", outcome: "good" });
    await engine.log({ programId: "B", outcome: "scrap" });
    await engine.log({ programId: "C", outcome: "adjusted" });

    const bads = await engine.query({ outcome: ["scrap", "aborted"] });
    expect(bads.length).toBe(1);
    expect(bads[0].programId).toBe("B");
  });

  it("query() returns newest first, respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      await engine.log({ programId: `P-${i}`, outcome: "good" });
      // Tiny spread so timestamps differ deterministically.
      await new Promise((r) => setTimeout(r, 2));
    }
    const last3 = await engine.query({ limit: 3 });
    expect(last3.length).toBe(3);
    const timestamps = last3.map((r) => Date.parse(r.recordedAt));
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
    }
  });

  it("stats() aggregates counts and rates correctly", async () => {
    await engine.log({ programId: "A", outcome: "good" });
    await engine.log({ programId: "B", outcome: "good" });
    await engine.log({ programId: "C", outcome: "scrap" });
    await engine.log({ programId: "D", outcome: "adjusted" });

    const s = await engine.stats();
    expect(s.total).toBe(4);
    expect(s.byKind.good).toBe(2);
    expect(s.byKind.scrap).toBe(1);
    expect(s.byKind.adjusted).toBe(1);
    expect(s.goodRate).toBeCloseTo(0.5, 5);
    expect(s.scrapRate).toBeCloseTo(0.25, 5);
    expect(s.firstRecordedAt).not.toBeNull();
    expect(s.lastRecordedAt).not.toBeNull();
  });

  it("stats() on empty store returns zeros + nulls", async () => {
    const s = await engine.stats();
    expect(s.total).toBe(0);
    expect(s.goodRate).toBe(0);
    expect(s.firstRecordedAt).toBeNull();
    expect(s.lastRecordedAt).toBeNull();
  });

  it("forProgram() returns in seq order", async () => {
    await engine.log({ programId: "X", outcome: "good" });
    await engine.log({ programId: "Y", outcome: "good" });
    await engine.log({ programId: "X", outcome: "adjusted" });
    const x = await engine.forProgram("X");
    expect(x.length).toBe(2);
    expect(x[0].outcome).toBe("good");
    expect(x[1].outcome).toBe("adjusted");
    expect(x[0].seq).toBeLessThan(x[1].seq);
  });

  it("records metrics + adjustments payloads verbatim", async () => {
    const rec = await engine.log({
      programId: "P",
      outcome: "adjusted",
      metrics: { cycleTimeSec: 125, surfaceFinishRaUm: 1.6 },
      adjustments: { feedRatePct: -10, freeText: "reduced feed on finish pass" },
    });
    expect(rec.metrics?.cycleTimeSec).toBe(125);
    expect(rec.adjustments?.feedRatePct).toBe(-10);
  });

  it("concurrent log() calls all land on disk without truncation", async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        engine.log({ programId: `C-${i}`, outcome: "good" }),
      ),
    );
    const rows = await engine.query();
    expect(rows.length).toBe(8);
    const onDisk = readFileSync(engine.getLogPath(), "utf-8")
      .trim()
      .split("\n");
    expect(onDisk.length).toBe(8);
    for (const line of onDisk) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("sinceIso / untilIso narrow query window", async () => {
    await engine.log({ programId: "OLD", outcome: "good" });
    await new Promise((r) => setTimeout(r, 5));
    const cut = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 5));
    await engine.log({ programId: "NEW", outcome: "good" });

    const after = await engine.query({ sinceIso: cut });
    expect(after.map((r) => r.programId)).toContain("NEW");
    expect(after.map((r) => r.programId)).not.toContain("OLD");
  });
});
