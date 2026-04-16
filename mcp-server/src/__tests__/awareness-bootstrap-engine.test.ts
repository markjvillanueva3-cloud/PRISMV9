/**
 * Tests for AwarenessBootstrapEngine (Phase 0.13 U-SAW1)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  AwarenessBootstrapEngine,
  DEFAULT_SIGNALS,
  READINESS_THRESHOLD,
  awarenessBootstrapEngine,
  type AwarenessSignal,
} from "../engines/AwarenessBootstrapEngine.js";

function mkTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-aware-boot-"));
}

function touch(filePath: string, ageMs = 0): void {
  fs.writeFileSync(filePath, "{}");
  if (ageMs > 0) {
    const mt = new Date(Date.now() - ageMs);
    fs.utimesSync(filePath, mt, mt);
  }
}

function fourSignals(dir: string): AwarenessSignal[] {
  return [
    { id: "a", filePath: path.join(dir, "a.json"), severity: "critical", maxAgeMs: 1000, weight: 0.4 },
    { id: "b", filePath: path.join(dir, "b.json"), severity: "important", maxAgeMs: 1000, weight: 0.3 },
    { id: "c", filePath: path.join(dir, "c.json"), severity: "important", maxAgeMs: 1000, weight: 0.2 },
    { id: "d", filePath: path.join(dir, "d.json"), severity: "optional", maxAgeMs: 1000, weight: 0.1 },
  ];
}

describe("AwarenessBootstrapEngine", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkTmpDir();
  });

  afterEach(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  describe("construction", () => {
    it("exposes default threshold and signals when no options passed", () => {
      const e = new AwarenessBootstrapEngine();
      expect(e.getThreshold()).toBe(READINESS_THRESHOLD);
      expect(e.getSignals().length).toBe(DEFAULT_SIGNALS.length);
    });

    it("accepts a custom threshold", () => {
      const e = new AwarenessBootstrapEngine({ threshold: 0.5 });
      expect(e.getThreshold()).toBe(0.5);
    });

    it("rejects signal sets whose weights do not sum to 1.0", () => {
      const bad: AwarenessSignal[] = [
        { id: "x", filePath: "x", severity: "critical", maxAgeMs: 1000, weight: 0.3 },
        { id: "y", filePath: "y", severity: "critical", maxAgeMs: 1000, weight: 0.3 },
      ];
      expect(() => new AwarenessBootstrapEngine({ signals: bad })).toThrow(/weights must sum to 1.0/);
    });

    it("accepts weights that sum to 1.0 within rounding tolerance", () => {
      const ok: AwarenessSignal[] = [
        { id: "x", filePath: "x", severity: "critical", maxAgeMs: 1000, weight: 1 / 3 },
        { id: "y", filePath: "y", severity: "critical", maxAgeMs: 1000, weight: 1 / 3 },
        { id: "z", filePath: "z", severity: "critical", maxAgeMs: 1000, weight: 1 / 3 },
      ];
      expect(() => new AwarenessBootstrapEngine({ signals: ok })).not.toThrow();
    });

    it("default signals sum to exactly 1.0", () => {
      const sum = DEFAULT_SIGNALS.reduce((a, s) => a + s.weight, 0);
      expect(Math.abs(sum - 1.0)).toBeLessThan(1e-6);
    });
  });

  describe("compute() — scoring", () => {
    it("returns score 1.0 when every signal file is fresh", () => {
      const signals = fourSignals(dir);
      for (const s of signals) touch(s.filePath);
      const e = new AwarenessBootstrapEngine({ signals });

      const report = e.compute();

      expect(report.score).toBeCloseTo(1.0, 4);
      expect(report.ready).toBe(true);
      expect(report.missing).toEqual([]);
      expect(report.stale).toEqual([]);
    });

    it("returns score 0 when every signal file is missing", () => {
      const signals = fourSignals(dir);
      const e = new AwarenessBootstrapEngine({ signals });

      const report = e.compute();

      expect(report.score).toBe(0);
      expect(report.ready).toBe(false);
      expect(report.missing.sort()).toEqual(["a", "b", "c", "d"]);
    });

    it("tracks exact missing vs stale breakdown", () => {
      const signals = fourSignals(dir);
      touch(signals[0].filePath); // fresh
      touch(signals[1].filePath, 5_000); // stale (age > 1000ms)
      // signals[2,3] missing

      const e = new AwarenessBootstrapEngine({ signals, threshold: 0.5 });
      const report = e.compute();

      expect(report.missing.sort()).toEqual(["c", "d"]);
      expect(report.stale).toEqual(["b"]);
    });

    it("gives partial credit to stale-but-present signals and decays to zero past 2×maxAge", () => {
      const signals: AwarenessSignal[] = [
        { id: "only", filePath: path.join(dir, "only.json"), severity: "critical", maxAgeMs: 1000, weight: 1.0 },
      ];
      touch(signals[0].filePath, 3_500); // well past 2× maxAge → zero contribution

      const e = new AwarenessBootstrapEngine({ signals });
      const report = e.compute();

      expect(report.score).toBe(0);
      expect(report.stale).toEqual(["only"]);
    });

    it("gives ~half-weight credit to a signal that just crossed the maxAge boundary", () => {
      const signals: AwarenessSignal[] = [
        { id: "only", filePath: path.join(dir, "only.json"), severity: "critical", maxAgeMs: 1000, weight: 1.0 },
      ];
      touch(signals[0].filePath, 1_050); // just past maxAge
      const e = new AwarenessBootstrapEngine({ signals });
      const report = e.compute();

      expect(report.score).toBeGreaterThan(0.4);
      expect(report.score).toBeLessThan(0.5);
      expect(report.stale).toEqual(["only"]);
    });
  });

  describe("readiness threshold", () => {
    it("marks ready=true at or above threshold", () => {
      const signals = fourSignals(dir);
      for (const s of signals) touch(s.filePath);
      const e = new AwarenessBootstrapEngine({ signals, threshold: 0.8 });
      expect(e.compute().ready).toBe(true);
    });

    it("marks ready=false below threshold", () => {
      const signals = fourSignals(dir);
      touch(signals[0].filePath); // 0.4 only
      const e = new AwarenessBootstrapEngine({ signals, threshold: 0.8 });
      expect(e.compute().ready).toBe(false);
    });

    it("isReady() agrees with report.ready", () => {
      const signals = fourSignals(dir);
      for (const s of signals) touch(s.filePath);
      const e = new AwarenessBootstrapEngine({ signals, threshold: 0.5 });
      expect(e.isReady()).toBe(true);
    });

    it("isReady(report) uses the supplied report without recomputing", () => {
      const signals = fourSignals(dir);
      const e = new AwarenessBootstrapEngine({ signals, threshold: 0.5 });
      const fakeReport = {
        score: 0.9,
        ready: true,
        threshold: 0.5,
        signals: [],
        missing: [],
        stale: [],
        computedAt: new Date().toISOString(),
        durationMs: 0,
      };
      expect(e.isReady(fakeReport)).toBe(true);
    });
  });

  describe("explainBlock()", () => {
    it("returns empty string when ready", () => {
      const signals = fourSignals(dir);
      for (const s of signals) touch(s.filePath);
      const e = new AwarenessBootstrapEngine({ signals, threshold: 0.5 });
      expect(e.explainBlock()).toBe("");
    });

    it("reports missing and stale signals in the message", () => {
      const signals = fourSignals(dir);
      touch(signals[1].filePath, 5_000); // stale
      // a, c, d missing
      const e = new AwarenessBootstrapEngine({ signals, threshold: 0.8 });
      const msg = e.explainBlock();
      expect(msg).toContain("AWARENESS_BELOW_THRESHOLD");
      expect(msg).toContain("missing=");
      expect(msg).toContain("stale=b");
    });

    it("omits missing= or stale= keys when that category is empty", () => {
      const signals: AwarenessSignal[] = [
        { id: "only", filePath: path.join(dir, "only.json"), severity: "critical", maxAgeMs: 1000, weight: 1.0 },
      ];
      touch(signals[0].filePath, 5_000); // stale only, not missing
      const e = new AwarenessBootstrapEngine({ signals, threshold: 0.9 });
      const msg = e.explainBlock();
      expect(msg).toContain("stale=only");
      expect(msg).not.toContain("missing=");
    });
  });

  describe("report metadata", () => {
    it("includes ISO timestamp and non-negative duration", () => {
      const e = new AwarenessBootstrapEngine();
      const report = e.compute();
      expect(report.computedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("per-signal result carries weight and contribution", () => {
      const signals = fourSignals(dir);
      for (const s of signals) touch(s.filePath);
      const e = new AwarenessBootstrapEngine({ signals });
      const report = e.compute();
      expect(report.signals).toHaveLength(4);
      for (const r of report.signals) {
        expect(r.weight).toBeGreaterThan(0);
        expect(r.scoreContribution).toBeCloseTo(r.weight, 6);
      }
    });

    it("score is rounded to 4 decimal places", () => {
      const signals: AwarenessSignal[] = [
        { id: "only", filePath: path.join(dir, "only.json"), severity: "critical", maxAgeMs: 1000, weight: 1.0 },
      ];
      touch(signals[0].filePath, 1_333); // produces a non-round contribution
      const e = new AwarenessBootstrapEngine({ signals });
      const report = e.compute();
      const decimals = (report.score.toString().split(".")[1] ?? "").length;
      expect(decimals).toBeLessThanOrEqual(4);
    });
  });

  describe("singleton export", () => {
    it("provides a default-configured instance", () => {
      expect(awarenessBootstrapEngine.getThreshold()).toBe(READINESS_THRESHOLD);
      expect(awarenessBootstrapEngine.getSignals().length).toBe(DEFAULT_SIGNALS.length);
    });

    it("singleton compute() does not throw even when state files are absent", () => {
      // Real project state may or may not have every file; the engine must
      // tolerate missing files by reporting them, not by throwing.
      expect(() => awarenessBootstrapEngine.compute()).not.toThrow();
    });
  });
});
