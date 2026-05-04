/**
 * AutoFixPipelineEngine.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P9-U01
 *
 * Coverage tests for AutoFixPipelineEngine (AUTO-6 U-SI2).
 *
 * Strategy: tests run against the real engine + real fs (no mocking) to mirror
 * sibling pattern (QualityScoreEngine.test.ts). Fixture mutation tests write to
 * actual candidate paths and restore prior state in afterEach. fileParallelism
 * is disabled at the project level (vitest.config.ts) so cross-file fixture
 * paths never overlap.
 *
 * Coverage matrix (per ATCS comprehensive-build floor):
 *   - happy path 1: compute() with high-priority pattern → AutoFixReport shape
 *   - happy path 2: dispatches all six fix_type templates without throwing
 *   - happy path 3: approve→promote round-trip updates status + promoted log
 *   - failure 1: no patterns file → empty report + warning
 *   - failure 2: malformed JSON → handled gracefully (no throw)
 *   - failure 3: approve/promote unknown ID → returns null
 *   - failure 4: promote() on un-approved candidate → returns null
 *   - adversarial 1: empty patterns array → 0 candidates
 *   - adversarial 2: low-priority pattern (< 1.0 threshold) is skipped
 */

import { describe, it, expect, afterEach } from "vitest";
import { AutoFixPipelineEngine } from "../engines/AutoFixPipelineEngine.js";
import type { AutoFixReport, FixCandidate } from "../engines/AutoFixPipelineEngine.js";
import * as fs from "fs";
import * as path from "path";

// ---- Engine path layout (matches AutoFixPipelineEngine MCP_STATE_DIR resolution)
// import.meta.dirname of engine = mcp-server/src/engines, so MCP_STATE_DIR = src/state/shared
const ENGINE_DIR = path.resolve(__dirname, "../engines");
const SRC_STATE_DIR = path.resolve(ENGINE_DIR, "../state/shared");
const SIP_FIXTURE = path.join(SRC_STATE_DIR, "SELF_IMPROVEMENT_PATTERNS.json");
const CANDIDATES_PATH = path.join(SRC_STATE_DIR, "AUTO_FIX_CANDIDATES.json");
const PROMOTED_PATH = path.join(SRC_STATE_DIR, "AUTO_FIX_PROMOTED.json");
const ALT_SIP_PATH = path.resolve(ENGINE_DIR, "../../state/shared/SELF_IMPROVEMENT_PATTERNS.json");
const ALT_SIP_PATH_2 = path.resolve(ENGINE_DIR, "../../../state/shared/SELF_IMPROVEMENT_PATTERNS.json");
const ALT_CAND_PATH = path.resolve(ENGINE_DIR, "../../state/shared/AUTO_FIX_CANDIDATES.json");
const ALT_CAND_PATH_2 = path.resolve(ENGINE_DIR, "../../../state/shared/AUTO_FIX_CANDIDATES.json");

// ---- Engine constants probed by tests (kept in test so changes surface)
const PRIORITY_THRESHOLD = 1.0;
const HAPPY_PRIORITY = 5.0;        // > threshold, drives candidate generation
const SKIP_PRIORITY = 0.5;         // < threshold, expected to be filtered out
const MID_PRIORITY = 3.0;
const HOOK_TEMPLATE_MARKERS = ["#!/usr/bin/env python3", "def main()"];
const TEST_TEMPLATE_MARKERS = ["describe(", "expect("];
const MIN_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T/;
const FIX_ID_PATTERN = /^AFX-\d{3}$/;

interface CleanupSnapshot {
  sip?: string | null;
  sipAlt?: string | null;
  sipAlt2?: string | null;
  candidates?: string | null;
  candidatesAlt?: string | null;
  candidatesAlt2?: string | null;
  promoted?: string | null;
}

function cap(p: string): string | null {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
}

function snapshot(): CleanupSnapshot {
  return {
    sip: cap(SIP_FIXTURE),
    sipAlt: cap(ALT_SIP_PATH),
    sipAlt2: cap(ALT_SIP_PATH_2),
    candidates: cap(CANDIDATES_PATH),
    candidatesAlt: cap(ALT_CAND_PATH),
    candidatesAlt2: cap(ALT_CAND_PATH_2),
    promoted: cap(PROMOTED_PATH),
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

function restore(snap: CleanupSnapshot): void {
  setOrDelete(SIP_FIXTURE, snap.sip);
  setOrDelete(ALT_SIP_PATH, snap.sipAlt);
  setOrDelete(ALT_SIP_PATH_2, snap.sipAlt2);
  setOrDelete(CANDIDATES_PATH, snap.candidates);
  setOrDelete(ALT_CAND_PATH, snap.candidatesAlt);
  setOrDelete(ALT_CAND_PATH_2, snap.candidatesAlt2);
  setOrDelete(PROMOTED_PATH, snap.promoted);
}

function nukeAllSipPaths(): void {
  for (const p of [SIP_FIXTURE, ALT_SIP_PATH, ALT_SIP_PATH_2]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function nukeAllCandidatePaths(): void {
  for (const p of [CANDIDATES_PATH, ALT_CAND_PATH, ALT_CAND_PATH_2]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function writeFixture(patterns: unknown[]): void {
  if (!fs.existsSync(SRC_STATE_DIR)) fs.mkdirSync(SRC_STATE_DIR, { recursive: true });
  const body = {
    timestamp: new Date().toISOString(),
    total_patterns: patterns.length,
    patterns,
    aggregate_priority: 0,
    system_improvement_rate: 0,
    sources_read: [],
    warnings: [],
  };
  fs.writeFileSync(SIP_FIXTURE, JSON.stringify(body, null, 2));
}

function makePattern(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "SIP-001",
    category: "repeated_failure",
    description: "Test pattern for unit coverage",
    frequency: 5,
    severity: "high",
    automation_level: 0,
    priority: HAPPY_PRIORITY,
    suggested_fix: "hook",
    fix_description: "Add a hook that prevents the recurring failure",
    domain: "test-domain",
    last_seen: new Date().toISOString(),
    ...overrides,
  };
}

describe("AutoFixPipelineEngine — P9-U01", () => {
  let pre: CleanupSnapshot = {};
  afterEach(() => { restore(pre); });

  describe("compute() — happy path", () => {
    it("returns AutoFixReport with required shape and generates a hook candidate from a high-priority pattern", () => {
      pre = snapshot();
      writeFixture([makePattern({ id: "SIP-001", priority: HAPPY_PRIORITY, suggested_fix: "hook" })]);

      const engine = new AutoFixPipelineEngine();
      const report: AutoFixReport = engine.compute();

      expect(report.timestamp).toMatch(MIN_TIMESTAMP_PATTERN);
      expect(report.patterns_analyzed).toBe(1);
      expect(report.candidates_generated).toBe(1);
      expect(report.candidates).toHaveLength(1);
      expect(Array.isArray(report.warnings)).toBe(true);
      // improvement_rate = total_promoted / current_patterns. It's bounded
      // below by 0 but can exceed 1 when prior promotions outnumber the
      // currently-detected patterns (engine doesn't clamp). Just require finite ≥0.
      expect(report.improvement_rate).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(report.improvement_rate)).toBe(true);

      const c = report.candidates[0];
      expect(c.id).toMatch(FIX_ID_PATTERN);
      expect(c.pattern_id).toBe("SIP-001");
      expect(c.fix_type).toBe("hook");
      for (const marker of HOOK_TEMPLATE_MARKERS) expect(c.template).toContain(marker);
      expect(c.template).toContain("test-domain");
      expect(c.dry_run_valid).toBe(true);
      expect(c.status).toBe("candidate");
    });

    it("generates a vitest-shaped candidate for fix_type=test", () => {
      pre = snapshot();
      writeFixture([makePattern({ id: "SIP-002", suggested_fix: "test", priority: MID_PRIORITY })]);

      const engine = new AutoFixPipelineEngine();
      const report = engine.compute();

      expect(report.candidates_generated).toBe(1);
      const c = report.candidates[0];
      expect(c.fix_type).toBe("test");
      for (const marker of TEST_TEMPLATE_MARKERS) expect(c.template).toContain(marker);
      expect(c.file_path).toContain("__tests__");
    });

    it("dispatches all six fix_type templates without throwing", () => {
      pre = snapshot();
      const types = ["hook", "test", "script", "skill", "engine", "schema"] as const;
      writeFixture(
        types.map((t, i) => makePattern({ id: `SIP-${i + 100}`, suggested_fix: t, priority: 2.0 })),
      );

      const engine = new AutoFixPipelineEngine();
      const report = engine.compute();

      expect(report.candidates_generated).toBe(types.length);
      const generatedTypes = new Set(report.candidates.map((c) => c.fix_type));
      for (const t of types) expect(generatedTypes.has(t)).toBe(true);
    });
  });

  describe("compute() — failure modes", () => {
    it("failure 1: no patterns file → empty report with warning", () => {
      pre = snapshot();
      nukeAllSipPaths();

      const engine = new AutoFixPipelineEngine();
      const report = engine.compute();

      expect(report.patterns_analyzed).toBe(0);
      expect(report.candidates_generated).toBe(0);
      expect(report.candidates).toHaveLength(0);
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings[0]).toMatch(/no improvement patterns|self_improvement_scan/i);
    });

    it("failure 2: malformed JSON in patterns file → returns empty report (no throw)", () => {
      pre = snapshot();
      // Wipe alternates first so there's no fall-through, then write garbage to primary
      nukeAllSipPaths();
      if (!fs.existsSync(SRC_STATE_DIR)) fs.mkdirSync(SRC_STATE_DIR, { recursive: true });
      fs.writeFileSync(SIP_FIXTURE, "{ this is : not valid json ]]");

      const engine = new AutoFixPipelineEngine();
      let report: AutoFixReport | null = null;
      expect(() => { report = engine.compute(); }).not.toThrow();
      expect(report).not.toBeNull();
      // Engine treats parse failure as "no patterns" — no candidates generated
      expect(report!.candidates_generated).toBe(0);
      expect(report!.warnings.length).toBeGreaterThan(0);
    });

    it("failure 3: approve()/promote() unknown ID → returns null", () => {
      pre = snapshot();
      writeFixture([makePattern({ id: "SIP-001", priority: HAPPY_PRIORITY })]);

      const engine = new AutoFixPipelineEngine();
      engine.compute();

      expect(engine.approve("AFX-999")).toBeNull();
      expect(engine.promote("AFX-999")).toBeNull();
    });

    it("failure 4: promote() rejects un-approved candidate; full approve→promote round-trip succeeds", () => {
      pre = snapshot();
      writeFixture([makePattern({ id: "SIP-001", priority: HAPPY_PRIORITY })]);

      const engine = new AutoFixPipelineEngine();
      const report = engine.compute();
      const id = report.candidates[0].id;

      // Try to promote without approving first → null
      expect(engine.promote(id)).toBeNull();

      // Approve, then promote — should succeed
      const approved = engine.approve(id);
      expect(approved).not.toBeNull();
      expect(approved!.status).toBe("approved");
      expect(approved!.approved_at).toMatch(MIN_TIMESTAMP_PATTERN);

      const promoted = engine.promote(id);
      expect(promoted).not.toBeNull();
      expect(promoted!.status).toBe("promoted");
      expect(promoted!.promoted_at).toMatch(MIN_TIMESTAMP_PATTERN);
    });
  });

  describe("compute() — adversarial inputs", () => {
    it("empty patterns array → zero candidates and zero candidates list", () => {
      pre = snapshot();
      writeFixture([]);

      const engine = new AutoFixPipelineEngine();
      const report = engine.compute();

      expect(report.patterns_analyzed).toBe(0);
      expect(report.candidates_generated).toBe(0);
      expect(report.candidates).toHaveLength(0);
    });

    it(`low-priority pattern (priority < ${PRIORITY_THRESHOLD} threshold) is skipped`, () => {
      pre = snapshot();
      writeFixture([
        makePattern({ id: "SIP-low", priority: SKIP_PRIORITY }),
        makePattern({ id: "SIP-high", priority: HAPPY_PRIORITY }),
      ]);

      const engine = new AutoFixPipelineEngine();
      const report = engine.compute();

      // Only the high-priority pattern should produce a candidate
      expect(report.patterns_analyzed).toBe(1);
      expect(report.candidates_generated).toBe(1);
      expect(report.candidates[0].pattern_id).toBe("SIP-high");
    });

    it("read() returns null when no candidates file exists", () => {
      pre = snapshot();
      nukeAllCandidatePaths();

      const engine = new AutoFixPipelineEngine();
      const result = engine.read();
      expect(result).toBeNull();
    });
  });

  describe("summary()", () => {
    it("returns placeholder when no candidates exist", () => {
      pre = snapshot();
      nukeAllCandidatePaths();

      const engine = new AutoFixPipelineEngine();
      const out = engine.summary();
      expect(out).toMatch(/no auto-fix|prism_dev/i);
    });

    it("renders markdown table with promotion stats after compute", () => {
      pre = snapshot();
      writeFixture([
        makePattern({ id: "SIP-001", priority: HAPPY_PRIORITY, suggested_fix: "hook" }),
        makePattern({ id: "SIP-002", priority: MID_PRIORITY, suggested_fix: "test" }),
      ]);

      const engine = new AutoFixPipelineEngine();
      engine.compute();
      const md = engine.summary();

      expect(md).toContain("# Auto-Fix Pipeline Report");
      expect(md).toContain("Patterns Analyzed");
      expect(md).toContain("Promotion Stats");
      expect(md).toMatch(/\| AFX-\d{3} \|/);
    });
  });

  describe("FixCandidate template invariants", () => {
    it("hook template contains required Python markers and pattern context", () => {
      pre = snapshot();
      writeFixture([
        makePattern({
          id: "SIP-h",
          priority: HAPPY_PRIORITY,
          suggested_fix: "hook",
          domain: "auth-validation",
          description: "Auth tokens leaking in logs",
        }),
      ]);

      const engine = new AutoFixPipelineEngine();
      const c: FixCandidate = engine.compute().candidates[0];

      for (const marker of HOOK_TEMPLATE_MARKERS) expect(c.template).toContain(marker);
      expect(c.template).toContain("auth-validation");
      expect(c.dry_run_valid).toBe(true);
    });

    it("engine fix type is flagged as requiring manual implementation", () => {
      pre = snapshot();
      writeFixture([makePattern({ id: "SIP-eng", priority: HAPPY_PRIORITY, suggested_fix: "engine" })]);

      const engine = new AutoFixPipelineEngine();
      const report = engine.compute();
      expect(report.candidates_generated).toBe(1);
      const c = report.candidates[0];

      expect(c.fix_type).toBe("engine");
      expect(c.dry_run_valid).toBe(false);
      expect(c.dry_run_reason).toMatch(/manual implementation/i);
    });

    it("schema fix type is flagged as requiring manual wiring", () => {
      pre = snapshot();
      writeFixture([makePattern({ id: "SIP-sch", priority: HAPPY_PRIORITY, suggested_fix: "schema" })]);

      const engine = new AutoFixPipelineEngine();
      const report = engine.compute();
      expect(report.candidates_generated).toBe(1);
      const c = report.candidates[0];

      expect(c.fix_type).toBe("schema");
      expect(c.dry_run_valid).toBe(false);
      expect(c.dry_run_reason).toMatch(/manual wiring/i);
    });
  });
});
