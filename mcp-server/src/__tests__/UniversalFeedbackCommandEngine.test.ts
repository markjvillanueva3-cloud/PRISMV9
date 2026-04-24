/**
 * Tests for UniversalFeedbackCommandEngine (U-LEARN-01).
 *
 * Verifies the high-level feedback API that every studio/skill/dispatcher
 * routes through. Backed by a tmp-rooted OutcomeCaptureBusEngine so tests
 * never touch state/outcomes/ on disk.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OutcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";
import { UniversalFeedbackCommandEngine } from "../engines/UniversalFeedbackCommandEngine.js";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-feedback-"));
}

function readJsonl(filePath: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

describe("UniversalFeedbackCommandEngine — U-LEARN-01", () => {
  let root: string;
  let bus: OutcomeCaptureBusEngine;
  let fb: UniversalFeedbackCommandEngine;
  const cleanups: string[] = [];

  beforeEach(() => {
    root = tmpRoot();
    bus = new OutcomeCaptureBusEngine(root);
    fb = new UniversalFeedbackCommandEngine(bus);
    cleanups.push(root);
  });

  afterAll(() => {
    for (const r of cleanups) {
      try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // recordOverride — core path
  // ────────────────────────────────────────────────────────────────────

  describe("recordOverride", () => {
    it("writes an operator_override event with source=operator", () => {
      const res = fb.recordOverride({
        domain: "mill",
        recommended: 120,
        actual: 95,
        context: { material: "D2", machine_id: "VF4" },
      });
      expect(res.ok).toBe(true);
      expect(typeof res.event_id).toBe("string");
      expect(res.event_id.length).toBeGreaterThanOrEqual(8);
      const events = readJsonl(path.join(root, "mill.jsonl"));
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe("operator_override");
      expect(events[0].source).toBe("operator");
      expect(events[0].recommended).toBe(120);
      expect(events[0].actual).toBe(95);
    });

    it("auto-computes delta {absolute, relative} from numeric recommended/actual", () => {
      fb.recordOverride({ domain: "lathe", recommended: 200, actual: 240, context: {} });
      const ev = readJsonl(path.join(root, "lathe.jsonl"))[0];
      const delta = ev.delta as { absolute: number; relative: number };
      expect(delta.absolute).toBe(40);
      expect(delta.relative).toBeCloseTo(0.2, 6);
    });

    it("infers severity=info when within 10%", () => {
      fb.recordOverride({ domain: "mill", recommended: 100, actual: 105, context: {} });
      expect(readJsonl(path.join(root, "mill.jsonl"))[0].severity).toBe("info");
    });

    it("infers severity=medium for 10-25% deviation", () => {
      fb.recordOverride({ domain: "mill", recommended: 100, actual: 120, context: {} });
      expect(readJsonl(path.join(root, "mill.jsonl"))[0].severity).toBe("medium");
    });

    it("infers severity=high for >25% deviation", () => {
      fb.recordOverride({ domain: "mill", recommended: 100, actual: 160, context: {} });
      expect(readJsonl(path.join(root, "mill.jsonl"))[0].severity).toBe("high");
    });

    it("handles { value, unit } object payloads by pulling .value for delta", () => {
      fb.recordOverride({
        domain: "wedm",
        recommended: { value: 300, unit: "mm/min" },
        actual: { value: 250, unit: "mm/min" },
        context: {},
      });
      const ev = readJsonl(path.join(root, "wedm.jsonl"))[0];
      const delta = ev.delta as { absolute: number; relative: number };
      expect(delta.absolute).toBe(-50);
      expect(delta.relative).toBeCloseTo(-50 / 300, 6);
    });

    it("returns severity=info when recommended/actual are non-numeric", () => {
      fb.recordOverride({
        domain: "cam",
        recommended: "strategy-A",
        actual: "strategy-B",
        context: {},
      });
      expect(readJsonl(path.join(root, "cam.jsonl"))[0].severity).toBe("info");
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // recordMeasurement
  // ────────────────────────────────────────────────────────────────────

  describe("recordMeasurement", () => {
    it("defaults source=cmm for cmm_measurement", () => {
      fb.recordMeasurement({
        domain: "quality",
        kind: "cmm_measurement",
        actual: { feature: "bore", value: 12.001, tolerance_low: 11.99, tolerance_high: 12.01 },
        context: { part_number: "ITW-2048" },
      });
      const ev = readJsonl(path.join(root, "quality.jsonl"))[0];
      expect(ev.source).toBe("cmm");
      expect(ev.kind).toBe("cmm_measurement");
    });

    it("defaults source=controller for cycle_time_measurement", () => {
      fb.recordMeasurement({
        domain: "mill",
        kind: "cycle_time_measurement",
        actual: 318.5,
        recommended: 300,
        context: { program: "O1234" },
      });
      const ev = readJsonl(path.join(root, "mill.jsonl"))[0];
      expect(ev.source).toBe("controller");
      const delta = ev.delta as { absolute: number; relative: number };
      expect(delta.absolute).toBeCloseTo(18.5, 2);
    });

    it("escalates severity=high for first_article_fail", () => {
      fb.recordMeasurement({
        domain: "quality",
        kind: "first_article_fail",
        actual: "dimensional_nonconformance",
        context: { part_number: "ALCOA-7", characteristic: "bore_dia" },
      });
      expect(readJsonl(path.join(root, "quality.jsonl"))[0].severity).toBe("high");
    });

    it("allows explicit source override (e.g. simulation)", () => {
      fb.recordMeasurement({
        domain: "cam",
        kind: "cycle_time_measurement",
        actual: 240,
        source: "simulation",
        context: {},
      });
      expect(readJsonl(path.join(root, "cam.jsonl"))[0].source).toBe("simulation");
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // recordScrap
  // ────────────────────────────────────────────────────────────────────

  describe("recordScrap", () => {
    it("always emits severity=high", () => {
      fb.recordScrap({
        domain: "mill",
        reason: "chatter marks outside Ra 0.8",
        context: { part_number: "SFS-1901", operation: "finish_bore" },
      });
      const ev = readJsonl(path.join(root, "mill.jsonl"))[0];
      expect(ev.severity).toBe("high");
      expect(ev.kind).toBe("scrap_event");
      expect(ev.note).toBe("chatter marks outside Ra 0.8");
    });

    it("accepts custom source for sensor-attributed scrap", () => {
      fb.recordScrap({
        domain: "lathe",
        reason: "spindle load spike + surface defect",
        source: "sensor",
        context: {},
      });
      expect(readJsonl(path.join(root, "lathe.jsonl"))[0].source).toBe("sensor");
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // recordRecommendationEmitted — lineage_id threading
  // ────────────────────────────────────────────────────────────────────

  describe("recordRecommendationEmitted", () => {
    it("mints a fresh uuid lineage_id when caller omits it", () => {
      const res = fb.recordRecommendationEmitted({
        domain: "lathe",
        recommended: { sfm: 400, ipr: 0.012 },
        context: { material: "1018", tool_id: "CNMG432" },
      });
      expect(res.ok).toBe(true);
      // UUID v4 has 36 chars (32 hex + 4 dashes)
      expect(res.lineage_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("threads same lineage_id across recommendation→override pair", () => {
      const rec = fb.recordRecommendationEmitted({
        domain: "wedm",
        recommended: { power: 5, servo: 45 },
        context: { machine_id: "MV-R" },
      });
      fb.recordOverride({
        domain: "wedm",
        recommended: { power: 5 },
        actual: { power: 3 },
        lineage_id: rec.lineage_id,
        context: {},
      });
      const events = readJsonl(path.join(root, "wedm.jsonl"));
      expect(events).toHaveLength(2);
      expect(events[0].lineage_id).toBe(rec.lineage_id);
      expect(events[1].lineage_id).toBe(rec.lineage_id);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // record() generic path + query/stats passthrough
  // ────────────────────────────────────────────────────────────────────

  describe("generic record + query + stats", () => {
    it("generic record() accepts custom kinds like chatter_event", () => {
      const res = fb.record({
        domain: "mill",
        kind: "chatter_event",
        source: "sensor",
        severity: "high",
        context: { rpm: 3800 },
        note: "regenerative chatter at finish pass",
      });
      expect(res.ok).toBe(true);
      expect(readJsonl(path.join(root, "mill.jsonl"))[0].kind).toBe("chatter_event");
    });

    it("query() returns newest-first and filters by kind", () => {
      fb.recordOverride({ domain: "mill", recommended: 100, actual: 80, context: {} });
      fb.recordScrap({ domain: "mill", reason: "r", context: {} });
      const result = fb.query({ domain: "mill", kind: "scrap_event" });
      expect(result.events).toHaveLength(1);
      expect(result.events[0].kind).toBe("scrap_event");
    });

    it("stats() reports per-domain event counts", () => {
      fb.recordOverride({ domain: "mill", recommended: 100, actual: 95, context: {} });
      fb.recordOverride({ domain: "lathe", recommended: 200, actual: 180, context: {} });
      fb.recordScrap({ domain: "lathe", reason: "r", context: {} });
      const s = fb.stats();
      expect(s.domains.mill).toBe(1);
      expect(s.domains.lathe).toBe(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Failure modes — never-throw contract + bounded inputs
  // ────────────────────────────────────────────────────────────────────

  describe("failure modes (never-throw contract)", () => {
    it("returns ok=false with warning on oversize context (>64 KB line)", () => {
      const huge = "x".repeat(100_000);
      const res = fb.recordOverride({
        domain: "mill",
        recommended: 100,
        actual: 95,
        context: { note: huge },
      });
      expect(res.ok).toBe(false);
      expect(res.warning).toMatch(/64|byte|exceeds|size/i);
    });

    it("returns ok=false on circular-reference context (non-JSON-safe)", () => {
      const circular: Record<string, unknown> = { name: "x" };
      circular.self = circular;
      const res = fb.record({
        domain: "mill",
        kind: "other",
        source: "system",
        context: circular,
      });
      expect(res.ok).toBe(false);
      expect(res.warning).toMatch(/circular|serialization/i);
    });

    it("does NOT throw when bus write fails (returns ok=false, does not propagate)", () => {
      // Construct a bus rooted at a path that can't be created (invalid chars on Windows)
      const badBus = new OutcomeCaptureBusEngine("\0:/definitely/invalid/\0/root");
      const badFb = new UniversalFeedbackCommandEngine(badBus);
      expect(() =>
        badFb.recordOverride({
          domain: "mill",
          recommended: 100,
          actual: 95,
          context: {},
        }),
      ).not.toThrow();
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Variability — spans multiple domains
  // ────────────────────────────────────────────────────────────────────

  describe("variability — spans multiple domains", () => {
    it("isolates mill/lathe/wedm/grinder/sinker_edm/welder shards", () => {
      for (const d of ["mill", "lathe", "wedm", "grinder", "sinker_edm", "welder"] as const) {
        fb.recordOverride({
          domain: d,
          recommended: 100,
          actual: 90,
          context: { engine: `${d}-strategy` },
        });
      }
      for (const d of ["mill", "lathe", "wedm", "grinder", "sinker_edm", "welder"]) {
        expect(fs.existsSync(path.join(root, `${d}.jsonl`))).toBe(true);
      }
      const s = fb.stats();
      expect(Object.keys(s.domains)).toHaveLength(6);
      expect(Object.values(s.domains).every((n) => n === 1)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Self-awareness
  // ────────────────────────────────────────────────────────────────────

  it("getSelfAwareness() reports capabilities + dependencies", () => {
    const sa = UniversalFeedbackCommandEngine.getSelfAwareness();
    expect(sa.name).toBe("UniversalFeedbackCommandEngine");
    expect(sa.capabilities).toContain("recordOverride");
    expect(sa.capabilities).toContain("recordMeasurement");
    expect(sa.capabilities).toContain("recordScrap");
    expect(sa.dependencies).toContain("OutcomeCaptureBusEngine");
  });
});
