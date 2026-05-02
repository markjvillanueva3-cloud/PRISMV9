/**
 * QualityDashboardEngine.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P9-U01
 *
 * Coverage tests for QualityDashboardEngine (AUTO-7).
 *
 * Strategy: tests run against the real engine + real fs. We seed each input
 * file (QUALITY_SCORES.json, SVI.json, FORMULA_ACCURACY.json, etc.) into the
 * canonical state/shared/ directory, exercise compute(), then restore prior
 * state. Mirrors QualityScoreEngine.test.ts pattern.
 *
 * Coverage matrix:
 *   - happy path: compute() aggregates inputs into a populated DashboardSnapshot
 *   - failure 1: missing QUALITY_SCORES.json → defaults to zero, no crash
 *   - failure 2: malformed SVI JSON → derivePsiPct returns 0 (engine-side guard)
 *   - failure 3: read() with no persisted snapshot → returns null
 *   - adversarial 1: regression alert fires when system_Q drops vs prior snapshot
 *   - adversarial 2: critical formula accuracy < 0.90 → critical alert is emitted
 */

import { describe, it, expect, afterEach } from "vitest";
import { QualityDashboardEngine } from "../engines/QualityDashboardEngine.js";
import type { DashboardSnapshot } from "../engines/QualityDashboardEngine.js";
import * as fs from "fs";
import * as path from "path";

// ---- Canonical paths (engine resolves from src/engines/QualityDashboardEngine.ts)
const ENGINE_DIR = path.resolve(__dirname, "../engines");
const PROJECT_ROOT = path.resolve(ENGINE_DIR, "../../..");
const SHARED_DIR = path.join(PROJECT_ROOT, "state", "shared");
const OUTPUT_PATH = path.join(SHARED_DIR, "QUALITY_DASHBOARD.json");
const QUALITY_SCORES_PATH = path.join(SHARED_DIR, "QUALITY_SCORES.json");
const SVI_PATH = path.join(SHARED_DIR, "SVI.json");
const FORMULA_ACCURACY_PATH = path.join(SHARED_DIR, "FORMULA_ACCURACY.json");
const SELF_IMPROVEMENT_PATH = path.join(SHARED_DIR, "SELF_IMPROVEMENT_PATTERNS.json");
const AUTO_FIX_PATH = path.join(SHARED_DIR, "AUTO_FIX_CANDIDATES.json");
const AUTO_FIX_PROMOTED_PATH = path.join(SHARED_DIR, "AUTO_FIX_PROMOTED.json");

// ---- Engine threshold constants (mirror engine source)
const Q_CRITICAL = 0.50;
const Q_TARGET = 0.70;
const ACCURACY_BLOCK = 0.90;
const ACCURACY_TARGET = 0.95;
const PSI_LOW_PCT = 30;
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T/;

interface Snap {
  qs?: string | null;
  svi?: string | null;
  fa?: string | null;
  sip?: string | null;
  afx?: string | null;
  afxProm?: string | null;
  out?: string | null;
}

function cap(p: string): string | null {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
}

function snapshot(): Snap {
  return {
    qs: cap(QUALITY_SCORES_PATH),
    svi: cap(SVI_PATH),
    fa: cap(FORMULA_ACCURACY_PATH),
    sip: cap(SELF_IMPROVEMENT_PATH),
    afx: cap(AUTO_FIX_PATH),
    afxProm: cap(AUTO_FIX_PROMOTED_PATH),
    out: cap(OUTPUT_PATH),
  };
}

function setOrDelete(p: string, v: string | null | undefined): void {
  if (v === undefined) return;
  if (v === null) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } else {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, v);
  }
}

function restore(s: Snap): void {
  setOrDelete(QUALITY_SCORES_PATH, s.qs);
  setOrDelete(SVI_PATH, s.svi);
  setOrDelete(FORMULA_ACCURACY_PATH, s.fa);
  setOrDelete(SELF_IMPROVEMENT_PATH, s.sip);
  setOrDelete(AUTO_FIX_PATH, s.afx);
  setOrDelete(AUTO_FIX_PROMOTED_PATH, s.afxProm);
  setOrDelete(OUTPUT_PATH, s.out);
}

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeJSON(p: string, data: unknown): void {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function clearInputs(): void {
  for (const p of [
    QUALITY_SCORES_PATH, SVI_PATH, FORMULA_ACCURACY_PATH,
    SELF_IMPROVEMENT_PATH, AUTO_FIX_PATH, AUTO_FIX_PROMOTED_PATH, OUTPUT_PATH,
  ]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function makeQualityScores(opts: { systemQ: number; meanQ: number; total: number; below70?: number; above90?: number; engines?: Array<{ engine_name: string; Q: number }> }): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    system_Q: opts.systemQ,
    mean_Q: opts.meanQ,
    scored_engines: opts.total,
    engines_above_90: opts.above90 ?? 0,
    engines_below_70: opts.below70 ?? 0,
    dimension_averages: { W: 0.7, T: 0.6, P: 0.8, S: 0.9, D: 0.5, A: 0.7 },
    scores: opts.engines ?? [],
  };
}

describe("QualityDashboardEngine — P9-U01", () => {
  let pre: Snap = {};
  afterEach(() => { restore(pre); });

  describe("compute() — happy path", () => {
    it("aggregates all inputs into a populated DashboardSnapshot", () => {
      pre = snapshot();
      clearInputs();

      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({
        systemQ: 0.85, meanQ: 0.88, total: 5, above90: 2, below70: 0,
        engines: [
          { engine_name: "ChatterPredictionEngine", Q: 0.92 },     // physics domain
          { engine_name: "ToolpathOptimizerEngine", Q: 0.85 },     // cam domain
          { engine_name: "JobCostEngine", Q: 0.88 },               // business domain
          { engine_name: "MetrologyAuditEngine", Q: 0.91 },        // quality domain
          { engine_name: "SessionTelemetryEngine", Q: 0.75 },      // system domain
        ],
      }));
      writeJSON(SVI_PATH, {
        svi_display: "4.7e23",
        psi_pct: 42.5,
        trend: "growing",
        subsystems: [{ name: "a" }, { name: "b" }],
      });
      writeJSON(FORMULA_ACCURACY_PATH, {
        timestamp: new Date().toISOString(),
        aggregate_accuracy: 0.96,
        total_formulas: 50,
        passed: 48,
        failed: 2,
      });
      writeJSON(SELF_IMPROVEMENT_PATH, {
        total_patterns: 7,
        patterns: [],
      });
      writeJSON(AUTO_FIX_PATH, { candidates_generated: 3, candidates: [] });
      writeJSON(AUTO_FIX_PROMOTED_PATH, { promoted_count: 1, promoted: [] });

      const engine = new QualityDashboardEngine();
      const snap: DashboardSnapshot = engine.compute();

      expect(snap.timestamp).toMatch(TIMESTAMP_RE);
      expect(snap.version).toBe("1.0.0");
      expect(snap.system_Q).toBe(0.85);
      expect(snap.mean_Q).toBe(0.88);
      expect(snap.total_engines).toBe(5);
      expect(snap.svi.value).toBe("4.7e23");
      expect(snap.svi.psi_pct).toBe(42.5);
      expect(snap.svi.trend).toBe("growing");
      expect(snap.svi.subsystem_count).toBe(2);
      expect(snap.formula_accuracy.aggregate_accuracy).toBe(0.96);
      expect(snap.formula_accuracy.formulas_passed).toBe(48);
      expect(snap.formula_accuracy.formulas_failed).toBe(2);
      expect(snap.improvement.patterns_detected).toBe(7);
      expect(snap.improvement.fixes_generated).toBe(3);
      expect(snap.improvement.fixes_promoted).toBe(1);
      // 1 / 7 ≈ 0.143 (engine rounds to 3 decimals)
      expect(snap.improvement.improvement_rate).toBeCloseTo(1 / 7, 2);
      expect(Array.isArray(snap.domains)).toBe(true);
      expect(snap.domains.length).toBeGreaterThan(0);
      expect(Array.isArray(snap.alerts)).toBe(true);
      expect(Array.isArray(snap.trend)).toBe(true);
      expect(snap.trend.length).toBeGreaterThanOrEqual(1);
    });

    it("classifies engines into the correct domain by keyword", () => {
      pre = snapshot();
      clearInputs();
      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({
        systemQ: 0.8, meanQ: 0.85, total: 3,
        engines: [
          { engine_name: "KienzleForceEngine", Q: 0.90 },          // physics
          { engine_name: "ToolpathRouterEngine", Q: 0.85 },        // cam
          { engine_name: "QuoteGeneratorEngine", Q: 0.80 },        // business
        ],
      }));
      writeJSON(SVI_PATH, { psi_pct: 50, trend: "stable" });

      const engine = new QualityDashboardEngine();
      const snap = engine.compute();
      const domains = new Set(snap.domains.map((d) => d.domain));
      expect(domains.has("physics")).toBe(true);
      expect(domains.has("cam")).toBe(true);
      expect(domains.has("business")).toBe(true);
    });

    it("appends a trend entry on each compute() call (capped at 10)", () => {
      pre = snapshot();
      clearInputs();
      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({ systemQ: 0.8, meanQ: 0.85, total: 1 }));

      const engine = new QualityDashboardEngine();
      const first = engine.compute();
      // Re-read fresh to bypass _cached
      const engine2 = new QualityDashboardEngine();
      const second = engine2.compute();
      expect(second.trend.length).toBeGreaterThanOrEqual(first.trend.length);
      expect(second.trend.length).toBeLessThanOrEqual(10);
    });
  });

  describe("compute() — failure modes", () => {
    it("failure 1: missing QUALITY_SCORES.json → zero defaults; no crash", () => {
      pre = snapshot();
      clearInputs();
      // Only SVI present, no quality scores
      writeJSON(SVI_PATH, { psi_pct: 25, trend: "stable" });

      const engine = new QualityDashboardEngine();
      const snap = engine.compute();
      expect(snap.system_Q).toBe(0);
      expect(snap.mean_Q).toBe(0);
      expect(snap.total_engines).toBe(0);
      expect(snap.engines_above_90).toBe(0);
      expect(snap.engines_below_70).toBe(0);
    });

    it("failure 2: malformed SVI JSON → psi_pct falls back to 0 via derivePsiPct", () => {
      pre = snapshot();
      clearInputs();
      ensureDir(SHARED_DIR);
      // Garbage JSON — engine's safeReadJSON returns null
      fs.writeFileSync(SVI_PATH, "{ bad json @@@");
      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({ systemQ: 0.8, meanQ: 0.85, total: 1 }));

      const engine = new QualityDashboardEngine();
      const snap = engine.compute();
      expect(snap.svi.psi_pct).toBe(0);
      expect(snap.svi.value).toBe("unknown");
      expect(snap.svi.subsystem_count).toBe(0);
    });

    it("failure 3: read() with no persisted snapshot and no cached state → null", () => {
      pre = snapshot();
      clearInputs();
      const engine = new QualityDashboardEngine();
      // Fresh engine, no compute() called, no file on disk
      expect(engine.read()).toBeNull();
    });
  });

  describe("compute() — adversarial inputs and alert generation", () => {
    it("regression alert fires when system_Q drops by >0.05 vs prior snapshot", () => {
      pre = snapshot();
      clearInputs();

      // First snapshot: system_Q = 0.90
      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({ systemQ: 0.90, meanQ: 0.92, total: 5 }));
      writeJSON(SVI_PATH, { psi_pct: 50, trend: "stable" });
      const engineA = new QualityDashboardEngine();
      const first = engineA.compute();
      expect(first.system_Q).toBe(0.90);

      // Second snapshot: system_Q = 0.80 (drop of 0.10 > 0.05 threshold)
      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({ systemQ: 0.80, meanQ: 0.85, total: 5 }));
      const engineB = new QualityDashboardEngine();
      const second = engineB.compute();

      const regressionAlert = second.alerts.find(
        (a) => a.category === "regression" && /System Q dropped/.test(a.message),
      );
      expect(regressionAlert?.severity).toBe("critical");
    });

    it(`critical formula accuracy (< ${ACCURACY_BLOCK}) emits a critical physics alert`, () => {
      pre = snapshot();
      clearInputs();
      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({ systemQ: 0.85, meanQ: 0.88, total: 3 }));
      writeJSON(SVI_PATH, { psi_pct: 50, trend: "stable" });
      writeJSON(FORMULA_ACCURACY_PATH, {
        aggregate_accuracy: 0.85,
        total_formulas: 10,
        passed: 8,
        failed: 2,
      });

      const engine = new QualityDashboardEngine();
      const snap = engine.compute();
      const physicsCritical = snap.alerts.find(
        (a) => a.category === "physics" && a.severity === "critical",
      );
      expect(physicsCritical?.message).toMatch(/0\.85/);
    });

    it(`system Q below ${Q_CRITICAL} emits a critical quality alert`, () => {
      pre = snapshot();
      clearInputs();
      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({ systemQ: 0.45, meanQ: 0.50, total: 2 }));
      writeJSON(SVI_PATH, { psi_pct: 50, trend: "stable" });

      const engine = new QualityDashboardEngine();
      const snap = engine.compute();
      const critical = snap.alerts.find(
        (a) => a.category === "quality" && a.severity === "critical",
      );
      expect(critical?.message).toMatch(/critically low/);
    });

    it(`Psi below ${PSI_LOW_PCT}% emits a high svi alert`, () => {
      pre = snapshot();
      clearInputs();
      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({ systemQ: 0.85, meanQ: 0.88, total: 1 }));
      writeJSON(SVI_PATH, { psi_pct: 12, trend: "shrinking" });

      const engine = new QualityDashboardEngine();
      const snap = engine.compute();
      const sviAlert = snap.alerts.find((a) => a.category === "svi");
      expect(sviAlert?.severity).toBe("high");
    });

    it("alerts are ordered critical → high → medium → info", () => {
      pre = snapshot();
      clearInputs();
      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({ systemQ: 0.40, meanQ: 0.50, total: 80, below70: 60, above90: 0 }));
      writeJSON(SVI_PATH, { psi_pct: 10, trend: "shrinking" });
      writeJSON(FORMULA_ACCURACY_PATH, { aggregate_accuracy: 0.80, total_formulas: 10, passed: 8, failed: 2 });

      const engine = new QualityDashboardEngine();
      const snap = engine.compute();
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, info: 3 };
      for (let i = 1; i < snap.alerts.length; i++) {
        expect(order[snap.alerts[i].severity]).toBeGreaterThanOrEqual(order[snap.alerts[i - 1].severity]);
      }
      expect(snap.alerts.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("summary()", () => {
    it("returns placeholder when no data has been computed yet", () => {
      pre = snapshot();
      clearInputs();
      const engine = new QualityDashboardEngine();
      const text = engine.summary();
      expect(text).toMatch(/no dashboard data|quality_dashboard/i);
    });

    it("renders header with system metrics after compute", () => {
      pre = snapshot();
      clearInputs();
      writeJSON(QUALITY_SCORES_PATH, makeQualityScores({ systemQ: 0.85, meanQ: 0.88, total: 5, above90: 2, below70: 1 }));
      writeJSON(SVI_PATH, { psi_pct: 50, trend: "stable" });

      const engine = new QualityDashboardEngine();
      engine.compute();
      const md = engine.summary();
      expect(md).toContain("# PRISM Quality Dashboard");
      expect(md).toContain("System Q (min)");
      expect(md).toContain("0.85");
      expect(md).toContain("0.88");
    });
  });
});
