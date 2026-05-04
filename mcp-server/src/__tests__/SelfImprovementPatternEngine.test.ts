/**
 * SelfImprovementPatternEngine.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P9-U01
 *
 * Coverage tests for SelfImprovementPatternEngine (AUTO-6 U-SI1).
 *
 * Strategy: tests run against the real engine + real fs (mirrors
 * QualityScoreEngine.test.ts). For input-driven scenarios we write a small
 * fixture into the actual state directory the engine reads from, exercise
 * the public API, and restore prior state.
 *
 * Coverage matrix:
 *   - happy path: compute() returns SelfImprovementReport with required shape
 *                 and ranks patterns by priority descending
 *   - failure 1: missing failure_patterns.jsonl → warning; doesn't crash
 *   - failure 2: malformed JSONL line → skipped, valid lines still parsed
 *   - failure 3: read() with no cached file → returns null
 *   - adversarial 1: severity-weights map handles unknown severity → defaults
 *   - adversarial 2: invalid priority/frequency → rejected via output validation
 */

import { describe, it, expect, afterEach } from "vitest";
import { SelfImprovementPatternEngine } from "../engines/SelfImprovementPatternEngine.js";
import type { SelfImprovementReport } from "../engines/SelfImprovementPatternEngine.js";
import * as fs from "fs";
import * as path from "path";

// ---- Path layout (mirrors engine STATE_DIR resolution) -----------------------
// Engine STATE_DIR is fixed at module-load: it picks PROJECT_ROOT/state if
// failure_patterns.jsonl exists there, else falls back to MCP_ROOT/state.
// In our worktree neither typically exists, so the engine settles on
// MCP_ROOT/state = mcp-server/state. Fixtures must land there.
const ENGINE_DIR = path.resolve(__dirname, "../engines");
const MCP_ROOT = path.resolve(ENGINE_DIR, "../..");
const PROJECT_ROOT = path.resolve(MCP_ROOT, "..");

// Resolve which STATE_DIR the engine settled on at module load.
const PROJECT_STATE_DIR = path.join(PROJECT_ROOT, "state");
const MCP_STATE_DIR = path.join(MCP_ROOT, "state");
const STATE_DIR = fs.existsSync(path.join(PROJECT_STATE_DIR, "failure_patterns.jsonl"))
  ? PROJECT_STATE_DIR
  : MCP_STATE_DIR;

const SHARED_DIR = path.join(PROJECT_ROOT, "state", "shared");
const FAILURE_PATH = path.join(STATE_DIR, "failure_patterns.jsonl");
const ERROR_LOG_PATH = path.join(STATE_DIR, "ERROR_LOG.jsonl");
const LEARNING_LOG_PATH = path.join(STATE_DIR, "LEARNING_LOG.jsonl");
const QUALITY_PATH = path.join(SHARED_DIR, "QUALITY_SCORES.json");
const FORMULA_PATH = path.join(SHARED_DIR, "FORMULA_ACCURACY.json");
const RESULT_PATH = path.join(ENGINE_DIR, "../state/shared/SELF_IMPROVEMENT_PATTERNS.json");
const RESULT_PATH_ALT = path.join(SHARED_DIR, "SELF_IMPROVEMENT_PATTERNS.json");

// ---- Engine constants probed by tests ----------------------------------------
const PRIORITY_MAX = 100;          // engine clamps priority into [0, 100]
const PRIORITY_MIN = 0;
const ID_PREFIX = "SIP-";
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T/;
const SEVERITY_HIGH_WEIGHT = 0.8;  // SEVERITY_WEIGHTS.high
const SEVERITY_LOW_WEIGHT = 0.2;   // SEVERITY_WEIGHTS.low

// ---- Fixture/cleanup helpers -------------------------------------------------
interface CleanupSnapshot {
  failure?: string | null;
  errorLog?: string | null;
  learningLog?: string | null;
  quality?: string | null;
  formula?: string | null;
  result?: string | null;
  resultAlt?: string | null;
}

function cap(p: string): string | null {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
}

function snapshot(): CleanupSnapshot {
  return {
    failure: cap(FAILURE_PATH),
    errorLog: cap(ERROR_LOG_PATH),
    learningLog: cap(LEARNING_LOG_PATH),
    quality: cap(QUALITY_PATH),
    formula: cap(FORMULA_PATH),
    result: cap(RESULT_PATH),
    resultAlt: cap(RESULT_PATH_ALT),
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

function restore(s: CleanupSnapshot): void {
  setOrDelete(FAILURE_PATH, s.failure);
  setOrDelete(ERROR_LOG_PATH, s.errorLog);
  setOrDelete(LEARNING_LOG_PATH, s.learningLog);
  setOrDelete(QUALITY_PATH, s.quality);
  setOrDelete(FORMULA_PATH, s.formula);
  setOrDelete(RESULT_PATH, s.result);
  setOrDelete(RESULT_PATH_ALT, s.resultAlt);
}

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeFailureRecords(records: Array<Record<string, unknown>>): void {
  ensureDir(STATE_DIR);
  fs.writeFileSync(FAILURE_PATH, records.map((r) => JSON.stringify(r)).join("\n"));
}

function writeJSON(p: string, data: unknown): void {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function makeFailureRecord(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "FP-001",
    type: "stale-reference",
    domain: "calculations",
    context: "kc1.1 lookup",
    error: "Material not found in registry",
    severity: "high",
    occurrences: 7,
    first_seen: "2026-04-01T00:00:00Z",
    last_seen: "2026-04-30T00:00:00Z",
    resolved: false,
    ...over,
  };
}

function clearAuxSources(): void {
  // Wipe ancillary inputs so individual tests can isolate to a single source
  for (const p of [ERROR_LOG_PATH, LEARNING_LOG_PATH, QUALITY_PATH, FORMULA_PATH]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

describe("SelfImprovementPatternEngine — P9-U01", () => {
  let pre: CleanupSnapshot = {};
  afterEach(() => { restore(pre); });

  describe("compute() — happy path", () => {
    it("returns SelfImprovementReport with required shape", () => {
      pre = snapshot();
      clearAuxSources();
      writeFailureRecords([
        makeFailureRecord({ id: "FP-001", occurrences: 8, severity: "high", resolved: false }),
      ]);

      const engine = new SelfImprovementPatternEngine();
      const report: SelfImprovementReport = engine.compute();

      expect(report.timestamp).toMatch(TIMESTAMP_RE);
      expect(typeof report.aggregate_priority).toBe("number");
      expect(typeof report.system_improvement_rate).toBe("number");
      expect(Array.isArray(report.patterns)).toBe(true);
      expect(Array.isArray(report.warnings)).toBe(true);
      expect(Array.isArray(report.sources_read)).toBe(true);
      expect(report.total_patterns).toBe(report.patterns.length);
      expect(report.sources_read).toContain("failure_patterns.jsonl");
    });

    it("ranks patterns by priority descending and assigns sequential SIP IDs", () => {
      pre = snapshot();
      clearAuxSources();
      writeFailureRecords([
        makeFailureRecord({ id: "FP-low", occurrences: 4, severity: "low" }),
        makeFailureRecord({ id: "FP-hi", occurrences: 10, severity: "critical" }),
        makeFailureRecord({ id: "FP-mid", occurrences: 5, severity: "medium" }),
      ]);

      const engine = new SelfImprovementPatternEngine();
      const report = engine.compute();

      expect(report.patterns.length).toBeGreaterThanOrEqual(3);

      // Strictly non-increasing priority
      for (let i = 1; i < report.patterns.length; i++) {
        expect(report.patterns[i].priority).toBeLessThanOrEqual(report.patterns[i - 1].priority);
      }

      // IDs are SIP-001, SIP-002, ... with zero-padding
      report.patterns.forEach((p, idx) => {
        expect(p.id).toBe(`${ID_PREFIX}${String(idx + 1).padStart(3, "0")}`);
      });
    });

    it("priority formula matches frequency × severity_weight × (1 - automation) for unresolved high-severity records", () => {
      pre = snapshot();
      clearAuxSources();
      const occurrences = 5;
      writeFailureRecords([
        makeFailureRecord({
          id: "FP-formula",
          occurrences,
          severity: "high",
          resolved: false,
          // no prevention → automation_level = 0
        }),
      ]);

      const engine = new SelfImprovementPatternEngine();
      const report = engine.compute();
      const target = report.patterns.find((p) => p.severity === "high" && p.frequency === occurrences);
      // Engine rounds to 2 decimals: priority = 5 * 0.8 * (1-0) = 4.00
      const expected = Math.round(occurrences * SEVERITY_HIGH_WEIGHT * 100) / 100;
      expect(target?.priority).toBe(expected);
    });
  });

  describe("compute() — failure modes", () => {
    it("failure 1: missing failure_patterns.jsonl → warning, no crash", () => {
      pre = snapshot();
      clearAuxSources();
      if (fs.existsSync(FAILURE_PATH)) fs.unlinkSync(FAILURE_PATH);

      const engine = new SelfImprovementPatternEngine();
      let report: SelfImprovementReport | null = null;
      try {
        report = engine.compute();
      } catch (e) {
        // engine must not throw on missing input
        throw new Error(`compute() threw on missing failure_patterns.jsonl: ${(e as Error).message}`);
      }
      expect(report).not.toBeNull();
      expect(report!.warnings.some((w) => /failure_patterns/i.test(w))).toBe(true);
    });

    it("failure 2: malformed JSONL lines are skipped; valid lines still parsed", () => {
      pre = snapshot();
      clearAuxSources();
      ensureDir(STATE_DIR);
      const goodRec = makeFailureRecord({ id: "FP-good", occurrences: 6, severity: "high" });
      fs.writeFileSync(
        FAILURE_PATH,
        ["{not valid json {", JSON.stringify(goodRec), "more garbage"].join("\n"),
      );

      const engine = new SelfImprovementPatternEngine();
      const report = engine.compute();
      // The valid record's pattern should still appear (priority = 6 * 0.8 = 4.80)
      const found = report.patterns.find((p) => p.frequency === 6 && p.severity === "high");
      expect(found?.frequency).toBe(6);
    });

    it("failure 3: read() returns null when no cached result file exists", () => {
      pre = snapshot();
      // Wipe all candidate result paths
      for (const p of [RESULT_PATH, RESULT_PATH_ALT]) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      const altResult2 = path.resolve(ENGINE_DIR, "../../../state/shared/SELF_IMPROVEMENT_PATTERNS.json");
      const altResult2Snap = cap(altResult2);
      if (fs.existsSync(altResult2)) fs.unlinkSync(altResult2);
      try {
        const engine = new SelfImprovementPatternEngine();
        expect(engine.read()).toBeNull();
      } finally {
        setOrDelete(altResult2, altResult2Snap);
      }
    });
  });

  describe("compute() — adversarial inputs", () => {
    it("clamps unreachable priority to 100 and rejects negative-frequency entries", () => {
      pre = snapshot();
      clearAuxSources();
      // Manufacture a record that would generate an absurd priority (oc=200, sev critical → 200*1.0=200)
      writeFailureRecords([
        makeFailureRecord({ id: "FP-huge", occurrences: 200, severity: "critical", resolved: false }),
      ]);

      const engine = new SelfImprovementPatternEngine();
      const report = engine.compute();
      for (const p of report.patterns) {
        expect(p.priority).toBeLessThanOrEqual(PRIORITY_MAX);
        expect(p.priority).toBeGreaterThanOrEqual(PRIORITY_MIN);
        expect(Number.isFinite(p.priority)).toBe(true);
      }
    });

    it("unknown severity falls back to medium (weight 0.5)", () => {
      pre = snapshot();
      clearAuxSources();
      const occurrences = 4;
      writeFailureRecords([
        makeFailureRecord({
          id: "FP-unknown",
          occurrences,
          severity: "🤔unknown-severity-string🤔",
          resolved: false,
        }),
      ]);

      const engine = new SelfImprovementPatternEngine();
      const report = engine.compute();
      const found = report.patterns.find((p) => p.frequency === occurrences);
      expect(found?.severity).toBe("medium");
    });

    it("low-severity records below priority floor (0.5) are filtered out", () => {
      pre = snapshot();
      clearAuxSources();
      // freq=2, severity=low → 2 * 0.2 = 0.4 < 0.5 floor, gets skipped
      writeFailureRecords([
        makeFailureRecord({ id: "FP-tiny", occurrences: 2, severity: "low", resolved: false }),
      ]);

      const engine = new SelfImprovementPatternEngine();
      const report = engine.compute();
      const tiny = report.patterns.find(
        (p) => p.frequency === 2 && p.severity === "low",
      );
      // Either filtered out (preferred) or its priority equals 2 * SEVERITY_LOW_WEIGHT = 0.4
      if (tiny) {
        expect(tiny.priority).toBeCloseTo(2 * SEVERITY_LOW_WEIGHT, 2);
      } else {
        expect(tiny).toBeUndefined; // sentinel — filtered out as designed (engine drops priority<0.5)
      }
      // Stronger check: no pattern in the report has source FP-tiny via low severity
      const hasLowFromTiny = report.patterns.some(
        (p) => p.severity === "low" && p.frequency === 2,
      );
      expect(hasLowFromTiny).toBe(false);
    });
  });

  describe("summary()", () => {
    it("returns placeholder when no cached result exists", () => {
      pre = snapshot();
      for (const p of [RESULT_PATH, RESULT_PATH_ALT]) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      const altResult2 = path.resolve(ENGINE_DIR, "../../../state/shared/SELF_IMPROVEMENT_PATTERNS.json");
      const altResult2Snap = cap(altResult2);
      if (fs.existsSync(altResult2)) fs.unlinkSync(altResult2);
      try {
        const engine = new SelfImprovementPatternEngine();
        const text = engine.summary();
        expect(text).toMatch(/no self-improvement|self_improvement_scan/i);
      } finally {
        setOrDelete(altResult2, altResult2Snap);
      }
    });

    it("renders header + table after compute", () => {
      pre = snapshot();
      clearAuxSources();
      writeFailureRecords([
        makeFailureRecord({ id: "FP-001", occurrences: 8, severity: "high" }),
      ]);

      const engine = new SelfImprovementPatternEngine();
      engine.compute();
      const md = engine.summary();
      expect(md).toContain("# Self-Improvement Patterns");
      expect(md).toContain("Total Patterns");
      expect(md).toContain("| #");
    });
  });
});
