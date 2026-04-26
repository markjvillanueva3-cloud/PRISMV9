/**
 * Tests for SFCOutcomeCaptureWireEngine — U-PPG-SFC-01
 *
 * Coverage axes:
 *   • Happy path: full SFC payload → summarized + persisted
 *   • Missing context: empty/undefined context still records cleanly
 *   • Lineage threading: caller-supplied lineage_id is preserved end-to-end
 *   • Append-only: two records produce two rows in the shard
 *   • Concurrent: 5 parallel emissions all land
 *   • Adversarial — circular refs: jsonSafe strips them, bus never throws
 *   • Adversarial — non-finite numbers: NaN/Infinity nulled in raw payload
 *   • Schema variability: lathe (fpr/vc/ap) vs mill (fpt/sfm/doc) shapes both summarize
 *
 * Each test uses a fresh OutcomeCaptureBusEngine pointed at a per-test temp
 * directory so we are immune to cross-file parallel-worker contamination on
 * the singleton's `state/outcomes/speed_feed.jsonl` shard.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  SFCOutcomeCaptureWireEngine,
  summarizeSFCRecommendation,
} from "../../engines/SFCOutcomeCaptureWireEngine.js";
import { OutcomeCaptureBusEngine } from "../../engines/OutcomeCaptureBusEngine.js";

let bus: OutcomeCaptureBusEngine;
let wire: SFCOutcomeCaptureWireEngine;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "sfc-wire-"));
  bus = new OutcomeCaptureBusEngine(tmpDir);
  wire = new SFCOutcomeCaptureWireEngine(bus);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function findEvent(lineage: string) {
  return bus.query({ domain: "speed_feed", lineage_id: lineage, limit: 50 })
    .events;
}

describe("summarizeSFCRecommendation", () => {
  it("extracts the canonical numeric subset from a flat mill payload", () => {
    const s = summarizeSFCRecommendation({
      sfm: 850,
      rpm: 12000,
      fpt: 0.005,
      doc: 1.5,
      ae: 0.3,
      ignoredField: "noise",
    });
    expect(s.sfm).toBe(850);
    expect(s.rpm).toBe(12000);
    expect(s.fpt).toBe(0.005);
    expect(s.doc).toBe(1.5);
    expect(s.ae).toBe(0.3);
    expect(Object.keys(s).sort()).toEqual(["ae", "doc", "fpt", "rpm", "sfm"]);
  });

  it("unwraps AtomicValue { value } shape", () => {
    const s = summarizeSFCRecommendation({
      vc: { value: 220, unit: "m/min", uncertainty: 5, source: "kienzle" },
      rpm: { value: 1800, unit: "rpm", uncertainty: 0, source: "calc" },
    });
    expect(s.vc).toBe(220);
    expect(s.rpm).toBe(1800);
    expect(Object.keys(s).sort()).toEqual(["rpm", "vc"]);
  });

  it("normalizes camelCase aliases (feedRate, spindleRpm) and fz→fpt", () => {
    const s = summarizeSFCRecommendation({
      feedRate: 250,
      spindleRpm: 3500,
      fz: 0.04,
    });
    expect(s.feed_rate).toBe(250);
    expect(s.rpm).toBe(3500);
    expect(s.fz).toBe(0.04);
    expect(s.fpt).toBe(0.04);
    expect(Object.keys(s).sort()).toEqual(["feed_rate", "fpt", "fz", "rpm"]);
  });

  it("drops non-finite numbers (NaN, Infinity)", () => {
    const s = summarizeSFCRecommendation({
      sfm: NaN,
      rpm: Infinity,
      fpt: -Infinity,
      doc: 0.5,
    });
    expect(Object.keys(s)).toEqual(["doc"]);
    expect(s.doc).toBe(0.5);
  });

  it("returns empty object for null/non-object input", () => {
    expect(summarizeSFCRecommendation(null)).toEqual({});
    expect(summarizeSFCRecommendation(undefined)).toEqual({});
    expect(summarizeSFCRecommendation(42)).toEqual({});
    expect(summarizeSFCRecommendation("string")).toEqual({});
  });

  it("handles a lathe-shaped payload (vc + fpr + ap, no fpt/sfm)", () => {
    const s = summarizeSFCRecommendation({
      vc: 180,
      rpm: 1200,
      fpr: 0.25,
      ap: 2.0,
    });
    expect(s.vc).toBe(180);
    expect(s.rpm).toBe(1200);
    expect(s.fpr).toBe(0.25);
    expect(s.ap).toBe(2.0);
    expect(Object.keys(s).sort()).toEqual(["ap", "fpr", "rpm", "vc"]);
  });
});

describe("SFCOutcomeCaptureWireEngine.recordEmission — happy path", () => {
  it("persists a recommendation_emitted event with summary + lineage", () => {
    const lineage = `test-${randomUUID()}`;
    const result = wire.recordEmission({
      engine: "UltimateSpeedFeedEngine",
      action: "calculate",
      lineageId: lineage,
      context: { material: "P20", operation: "milling", machine_id: "okuma-1" },
      recommended: { sfm: 950, rpm: 8500, fpt: 0.004, doc: 2.0 },
      confidence: 0.87,
    });

    expect(result.ok).toBe(true);
    expect(result.lineage_id).toBe(lineage);
    expect(result.event_id.length).toBeGreaterThan(8);
    expect(result.summary.sfm).toBe(950);
    expect(result.summary.rpm).toBe(8500);

    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev.domain).toBe("speed_feed");
    expect(ev.kind).toBe("recommendation_emitted");
    expect(ev.source).toBe("system");
    expect(ev.confidence).toBe(0.87);
    const ctx = ev.context as Record<string, unknown>;
    expect(ctx.engine).toBe("UltimateSpeedFeedEngine");
    expect(ctx.action).toBe("calculate");
    expect(ctx.material).toBe("P20");
    const rec = ev.recommended as { summary: Record<string, number> };
    expect(rec.summary.sfm).toBe(950);
    expect(rec.summary.fpt).toBe(0.004);
  });
});

describe("SFCOutcomeCaptureWireEngine.recordEmission — context shapes", () => {
  it("records cleanly with no context object provided", () => {
    const lineage = `test-noctx-${randomUUID()}`;
    const result = wire.recordEmission({
      engine: "SFCCalculateEngine",
      action: "calculate",
      lineageId: lineage,
      recommended: { feed_rate: 0.05 },
    });
    expect(result.ok).toBe(true);
    expect(result.summary.feed_rate).toBe(0.05);
    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const ctx = events[0].context as Record<string, unknown>;
    expect(ctx.engine).toBe("SFCCalculateEngine");
    expect(ctx.action).toBe("calculate");
  });

  it("auto-generates a lineage_id when caller omits it", () => {
    const r = wire.recordEmission({
      engine: "AutoSpeedFeedCalculatorEngine",
      action: "calculate",
      recommended: { rpm: 4000 },
    });
    expect(r.ok).toBe(true);
    expect(r.lineage_id.length).toBeGreaterThan(8);
    expect(r.event_id.length).toBeGreaterThan(8);
    // event_id and lineage_id match when caller supplied neither
    expect(r.lineage_id).toBe(r.event_id);
  });
});

describe("SFCOutcomeCaptureWireEngine — append-only persistence", () => {
  it("two emissions on same lineage produce two rows", () => {
    const lineage = `test-append-${randomUUID()}`;
    wire.recordEmission({
      engine: "UltimateSpeedFeedEngine",
      action: "calculate",
      lineageId: lineage,
      recommended: { sfm: 100, rpm: 1000 },
    });
    wire.recordEmission({
      engine: "UltimateSpeedFeedEngine",
      action: "calculate",
      lineageId: lineage,
      recommended: { sfm: 200, rpm: 2000 },
    });
    const events = findEvent(lineage);
    expect(events).toHaveLength(2);
    // Both events share the lineage but have distinct event_ids
    expect(events[0].event_id).not.toBe(events[1].event_id);
    const sfmValues = events
      .map((e) => (e.recommended as { summary: { sfm: number } }).summary.sfm)
      .sort((a, b) => a - b);
    expect(sfmValues).toEqual([100, 200]);
  });
});

describe("SFCOutcomeCaptureWireEngine — concurrent emissions", () => {
  it("5 parallel emissions persist with distinct event_ids", async () => {
    const tag = `test-concurrent-${randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        Promise.resolve(
          wire.recordEmission({
            engine: "MachineAwareSpeedFeedEngine",
            action: "constrain",
            lineageId: `${tag}-${i}`,
            recommended: { rpm: 1000 + i, feed_rate: 0.1 + i * 0.01 },
          }),
        ),
      ),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    const ids = new Set(results.map((r) => r.event_id));
    expect(ids.size).toBe(5);
    for (let i = 0; i < 5; i++) {
      const evs = findEvent(`${tag}-${i}`);
      expect(evs).toHaveLength(1);
      const rec = evs[0].recommended as { summary: { rpm: number } };
      expect(rec.summary.rpm).toBe(1000 + i);
    }
  });
});

describe("SFCOutcomeCaptureWireEngine — adversarial inputs", () => {
  it("circular references are stripped, bus does not throw", () => {
    // jsonSafe must terminate on cycles. The any-cast is required to
    // construct a self-reference (TypeScript rejects it under strict mode).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional cycle
    const circular: any = { rpm: 5000, fpt: 0.003 };
    circular.self = circular;
    const lineage = `test-circular-${randomUUID()}`;
    const result = wire.recordEmission({
      engine: "UltimateSpeedFeedEngine",
      action: "calculate",
      lineageId: lineage,
      recommended: circular,
    });
    expect(result.ok).toBe(true);
    expect(result.summary.rpm).toBe(5000);
    expect(result.summary.fpt).toBe(0.003);

    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const rec = events[0].recommended as {
      summary: { rpm: number };
      raw: Record<string, unknown>;
    };
    expect(rec.summary.rpm).toBe(5000);
    expect(rec.raw.self).toBe("[circular]");
    expect(rec.raw.rpm).toBe(5000);
  });

  it("functions and BigInt are stripped from raw payload", () => {
    const lineage = `test-stripped-${randomUUID()}`;
    const result = wire.recordEmission({
      engine: "SFCCalculateEngine",
      action: "calculate",
      lineageId: lineage,
      recommended: {
        rpm: 3000,
        fn: () => "ignored",
        big: BigInt(42),
        nested: { fpt: 0.002, also_fn: () => 7 },
      },
    });
    expect(result.ok).toBe(true);
    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const rec = events[0].recommended as { raw: Record<string, unknown> };
    expect("fn" in rec.raw).toBe(false);
    expect("big" in rec.raw).toBe(false);
    expect(rec.raw.rpm).toBe(3000);
    const nested = rec.raw.nested as Record<string, unknown>;
    expect("also_fn" in nested).toBe(false);
    expect(nested.fpt).toBe(0.002);
  });

  it("infinite/NaN numbers are nulled in the raw payload", () => {
    const lineage = `test-nonfinite-${randomUUID()}`;
    wire.recordEmission({
      engine: "SFCCalculateEngine",
      action: "calculate",
      lineageId: lineage,
      recommended: { rpm: 1000, broken: NaN, also: Infinity },
    });
    const events = findEvent(lineage);
    expect(events).toHaveLength(1);
    const rec = events[0].recommended as { raw: Record<string, unknown> };
    expect(rec.raw.broken).toBeNull();
    expect(rec.raw.also).toBeNull();
    expect(rec.raw.rpm).toBe(1000);
  });
});

describe("SFCOutcomeCaptureWireEngine — variability across SFC engine shapes", () => {
  it("records lathe-shape (fpr/vc/ap) and mill-shape (fpt/sfm/doc) with the right keys", () => {
    const latheLineage = `test-lathe-${randomUUID()}`;
    const millLineage = `test-mill-${randomUUID()}`;

    const latheRes = wire.recordEmission({
      engine: "LatheSpeedFeedCalculatorFacadeEngine",
      action: "calculate",
      lineageId: latheLineage,
      context: { material: "AISI 4140", operation: "turning" },
      recommended: { vc: 180, rpm: 950, fpr: 0.20, ap: 2.5 },
      confidence: 0.82,
    });
    const millRes = wire.recordEmission({
      engine: "UltimateSpeedFeedEngine",
      action: "calculate",
      lineageId: millLineage,
      context: { material: "6061-T6", operation: "milling" },
      recommended: { sfm: 1800, rpm: 14000, fpt: 0.006, doc: 0.8 },
      confidence: 0.91,
    });

    expect(latheRes.summary.vc).toBe(180);
    expect(latheRes.summary.fpr).toBe(0.20);
    expect(latheRes.summary.ap).toBe(2.5);
    expect(Object.keys(latheRes.summary).sort()).toEqual([
      "ap",
      "fpr",
      "rpm",
      "vc",
    ]);

    expect(millRes.summary.sfm).toBe(1800);
    expect(millRes.summary.fpt).toBe(0.006);
    expect(millRes.summary.doc).toBe(0.8);
    expect(Object.keys(millRes.summary).sort()).toEqual([
      "doc",
      "fpt",
      "rpm",
      "sfm",
    ]);

    const latheEv = findEvent(latheLineage)[0];
    const millEv = findEvent(millLineage)[0];
    expect((latheEv.context as Record<string, unknown>).material).toBe(
      "AISI 4140",
    );
    expect((millEv.context as Record<string, unknown>).material).toBe(
      "6061-T6",
    );
  });
});
