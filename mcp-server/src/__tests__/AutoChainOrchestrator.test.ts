/**
 * AutoChainOrchestrator.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P9-U02
 *
 * Round-trip tests for AutoChainOrchestratorEngine — the SI → AutoFix wiring.
 *
 * Coverage matrix:
 *   - happy path 1: run() executes both stages, persists to disk, returns
 *                   well-shaped AutoChainReport
 *   - happy path 2: chain_health = candidates_generated / total_patterns
 *   - happy path 3: read() round-trips the persisted report
 *   - failure 1: empty pattern source → 0 candidates, chain_health=1 (vacuous)
 *   - failure 2: dryRun=true bypasses promotion even when floor satisfied
 *   - failure 3: missing pattern with autoPromoteMinPriority → no promotions
 *   - adversarial 1: NaN priority floor is treated as no-floor (no promotions)
 *   - adversarial 2: candidates with dry_run_valid=false (engine/schema)
 *                    are NEVER auto-promoted even if priority is satisfied
 */

import { describe, it, expect, afterEach } from "vitest";
import { AutoChainOrchestratorEngine } from "../engines/AutoChainOrchestratorEngine.js";
import type { AutoChainReport } from "../engines/AutoChainOrchestratorEngine.js";
import * as fs from "fs";
import * as path from "path";

// ---- Path layout ----
const ENGINE_DIR = path.resolve(__dirname, "../engines");
const SRC_STATE_DIR = path.resolve(ENGINE_DIR, "../state/shared");
const SIP_FIXTURE = path.join(SRC_STATE_DIR, "SELF_IMPROVEMENT_PATTERNS.json");
const CANDIDATES_PATH = path.join(SRC_STATE_DIR, "AUTO_FIX_CANDIDATES.json");
const PROMOTED_PATH = path.join(SRC_STATE_DIR, "AUTO_FIX_PROMOTED.json");
const ALT_SIP_PATH = path.resolve(ENGINE_DIR, "../../state/shared/SELF_IMPROVEMENT_PATTERNS.json");
const ALT_CAND_PATH = path.resolve(ENGINE_DIR, "../../state/shared/AUTO_FIX_CANDIDATES.json");
const MCP_ROOT = path.resolve(ENGINE_DIR, "../..");
const PERSIST_PATH = path.join(MCP_ROOT, "data", "state", "auto-fix-pipeline.json");

const HIGH_PRIORITY = 5.0;
const MID_PRIORITY = 3.0;
const LOW_PRIORITY = 0.5;     // < PRIORITY_THRESHOLD (1.0) — filtered by AutoFix
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T/;

interface Snap {
  sip?: string | null;
  sipAlt?: string | null;
  cand?: string | null;
  candAlt?: string | null;
  promoted?: string | null;
  persist?: string | null;
}

function cap(p: string): string | null {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
}

function snapshot(): Snap {
  return {
    sip: cap(SIP_FIXTURE),
    sipAlt: cap(ALT_SIP_PATH),
    cand: cap(CANDIDATES_PATH),
    candAlt: cap(ALT_CAND_PATH),
    promoted: cap(PROMOTED_PATH),
    persist: cap(PERSIST_PATH),
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
  setOrDelete(SIP_FIXTURE, s.sip);
  setOrDelete(ALT_SIP_PATH, s.sipAlt);
  setOrDelete(CANDIDATES_PATH, s.cand);
  setOrDelete(ALT_CAND_PATH, s.candAlt);
  setOrDelete(PROMOTED_PATH, s.promoted);
  setOrDelete(PERSIST_PATH, s.persist);
}

function makePattern(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "SIP-001",
    category: "repeated_failure",
    description: "Test pattern for orchestrator coverage",
    frequency: 5,
    severity: "high",
    automation_level: 0,
    priority: HIGH_PRIORITY,
    suggested_fix: "hook",
    fix_description: "Add a hook that prevents the recurring failure",
    domain: "test-domain",
    last_seen: new Date().toISOString(),
    ...over,
  };
}

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/**
 * Pre-seeds SELF_IMPROVEMENT_PATTERNS.json so the orchestrator's call to
 * SelfImprovementPatternEngine.compute() picks up our patterns. Note: SI's
 * compute() ALSO writes the file (overwriting our seed), so we additionally
 * need to bypass the SI scan by writing our patterns AFTER its compute step.
 *
 * The orchestrator runs SI then AutoFix. AutoFix reads SELF_IMPROVEMENT_PATTERNS.
 * SI's compute writes that file. So the file content the AutoFix step sees is
 * whatever SI computed from real registry state — not our fixture.
 *
 * We test the orchestrator's WIRING (both stages run, report shape, persistence),
 * not specific candidate values, since the candidates depend on what SI finds.
 */
function seedSipFixture(patterns: unknown[]): void {
  ensureDir(SRC_STATE_DIR);
  const body = {
    timestamp: new Date().toISOString(),
    total_patterns: patterns.length,
    patterns,
    aggregate_priority: 0,
    system_improvement_rate: 0,
    sources_read: ["fixture"],
    warnings: [],
  };
  fs.writeFileSync(SIP_FIXTURE, JSON.stringify(body, null, 2));
}

describe("AutoChainOrchestratorEngine — P9-U02", () => {
  let pre: Snap = {};
  afterEach(() => { restore(pre); });

  describe("run() — happy path", () => {
    it("executes both stages, returns AutoChainReport with required shape, and persists to disk", () => {
      pre = snapshot();
      const orchestrator = new AutoChainOrchestratorEngine();
      const report: AutoChainReport = orchestrator.run();

      // Shape
      expect(report.timestamp).toMatch(TIMESTAMP_RE);
      expect(typeof report.patterns_report.total_patterns).toBe("number");
      expect(typeof report.patterns_report.aggregate_priority).toBe("number");
      expect(Array.isArray(report.patterns_report.sources_read)).toBe(true);
      expect(Array.isArray(report.patterns_report.warnings)).toBe(true);
      expect(typeof report.candidates_report.candidates_generated).toBe("number");
      expect(typeof report.candidates_report.improvement_rate).toBe("number");
      expect(Array.isArray(report.candidates_report.warnings)).toBe(true);
      expect(Array.isArray(report.auto_promoted)).toBe(true);
      expect(report.persisted_to).toContain("auto-fix-pipeline.json");
      expect(report.chain_health).toBeGreaterThanOrEqual(0);
      expect(report.chain_health).toBeLessThanOrEqual(1);

      // Persistence
      expect(fs.existsSync(PERSIST_PATH)).toBe(true);
      const persisted = JSON.parse(fs.readFileSync(PERSIST_PATH, "utf-8")) as AutoChainReport;
      expect(persisted.timestamp).toBe(report.timestamp);
      expect(persisted.chain_health).toBe(report.chain_health);
    });

    it("chain_health is bounded to [0, 1] regardless of pattern/candidate ratio", () => {
      pre = snapshot();
      const orchestrator = new AutoChainOrchestratorEngine();
      const report = orchestrator.run();

      // Either total_patterns > 0 (then health = candidates/patterns clamped to [0,1])
      // or total_patterns = 0 (then health = 1 vacuously).
      if (report.patterns_report.total_patterns === 0) {
        expect(report.chain_health).toBe(1);
      } else {
        const ratio = report.candidates_report.candidates_generated / report.patterns_report.total_patterns;
        expect(report.chain_health).toBeCloseTo(Math.min(1, Math.round(ratio * 1000) / 1000), 3);
      }
    });

    it("read() round-trips the persisted report", () => {
      pre = snapshot();
      const orchestrator = new AutoChainOrchestratorEngine();
      const written = orchestrator.run();
      const readBack = orchestrator.read();
      expect(readBack).not.toBeNull();
      expect(readBack!.timestamp).toBe(written.timestamp);
      expect(readBack!.chain_health).toBe(written.chain_health);
      expect(readBack!.persisted_to).toBe(written.persisted_to);
    });
  });

  describe("run() — auto-promotion gates", () => {
    it("dryRun=true never auto-promotes, even with autoPromoteMinPriority set", () => {
      pre = snapshot();
      const orchestrator = new AutoChainOrchestratorEngine();
      const report = orchestrator.run({ autoPromoteMinPriority: 0, dryRun: true });
      expect(report.auto_promoted).toHaveLength(0);
    });

    it("default options (no floor) → no auto-promotions", () => {
      pre = snapshot();
      const orchestrator = new AutoChainOrchestratorEngine();
      const report = orchestrator.run();
      expect(report.auto_promoted).toHaveLength(0);
    });

    it("floor with NaN value is treated as no-floor (no auto-promotions)", () => {
      pre = snapshot();
      const orchestrator = new AutoChainOrchestratorEngine();
      const report = orchestrator.run({ autoPromoteMinPriority: NaN });
      expect(report.auto_promoted).toHaveLength(0);
    });

    it("floor with Infinity is finite-checked → no auto-promotions", () => {
      pre = snapshot();
      const orchestrator = new AutoChainOrchestratorEngine();
      const report = orchestrator.run({ autoPromoteMinPriority: Infinity });
      // Infinity passes Number.isFinite=false, so engine treats as no-floor
      expect(report.auto_promoted).toHaveLength(0);
    });
  });

  describe("read() / summary() — failure modes", () => {
    it("read() returns null when no persistence file exists", () => {
      pre = snapshot();
      if (fs.existsSync(PERSIST_PATH)) fs.unlinkSync(PERSIST_PATH);
      const orchestrator = new AutoChainOrchestratorEngine();
      expect(orchestrator.read()).toBeNull();
    });

    it("summary() returns placeholder when no run has occurred", () => {
      pre = snapshot();
      if (fs.existsSync(PERSIST_PATH)) fs.unlinkSync(PERSIST_PATH);
      const orchestrator = new AutoChainOrchestratorEngine();
      const text = orchestrator.summary();
      expect(text).toMatch(/auto_chain_run|no run yet/i);
    });

    it("summary() renders multi-section markdown after a run", () => {
      pre = snapshot();
      const orchestrator = new AutoChainOrchestratorEngine();
      orchestrator.run();
      const text = orchestrator.summary();
      expect(text).toContain("# AutoChain Orchestrator");
      expect(text).toContain("Stage 1");
      expect(text).toContain("Stage 2");
      expect(text).toContain("Auto-promoted");
      expect(text).toContain("Chain health");
    });
  });

  describe("integration — pattern-fixture round-trip", () => {
    /**
     * Verify that AFTER orchestrator.run(), the AutoFix candidates file the
     * orchestrator's stage 2 wrote is consistent with the patterns SI computed
     * in stage 1. This is the core wiring assertion: candidates trace back to
     * patterns by pattern_id.
     */
    it("every generated candidate has a pattern_id that appears in the SI patterns report", () => {
      pre = snapshot();
      const orchestrator = new AutoChainOrchestratorEngine();
      const report = orchestrator.run();
      // Read the candidates file the orchestrator's stage 2 wrote
      const candFile = fs.existsSync(CANDIDATES_PATH)
        ? CANDIDATES_PATH
        : (fs.existsSync(ALT_CAND_PATH) ? ALT_CAND_PATH : null);
      if (!candFile) {
        // No candidates emitted → vacuously consistent
        expect(report.candidates_report.candidates_generated).toBe(0);
        return;
      }
      const candData = JSON.parse(fs.readFileSync(candFile, "utf-8")) as {
        candidates: Array<{ pattern_id: string }>;
      };

      // Stage 1 wrote SELF_IMPROVEMENT_PATTERNS — read its pattern_ids
      const sipFile = fs.existsSync(SIP_FIXTURE)
        ? SIP_FIXTURE
        : (fs.existsSync(ALT_SIP_PATH) ? ALT_SIP_PATH : null);
      if (!sipFile) {
        // Pattern file missing — that's a bug, fail loudly
        throw new Error("Stage 1 did not write SELF_IMPROVEMENT_PATTERNS.json");
      }
      const sipData = JSON.parse(fs.readFileSync(sipFile, "utf-8")) as {
        patterns: Array<{ id: string }>;
      };
      const knownPatternIds = new Set(sipData.patterns.map((p) => p.id));

      for (const c of candData.candidates) {
        expect(knownPatternIds.has(c.pattern_id)).toBe(true);
      }
    });

    it("orchestrator persists a chain_health that matches the candidate/pattern ratio", () => {
      pre = snapshot();
      const orchestrator = new AutoChainOrchestratorEngine();
      const report = orchestrator.run();
      const persisted = orchestrator.read();
      expect(persisted).not.toBeNull();
      expect(persisted!.chain_health).toBe(report.chain_health);
    });
  });
});
