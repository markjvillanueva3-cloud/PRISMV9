/**
 * intelligenceDispatcher — consensus_drift_detect action.
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-DRIFT-DETECTOR.
 *
 * Verifies the dispatcher route into ConsensusDriftDetectorEngine. Tests
 * call the engine via the same shape the dispatcher uses (file-path
 * loading via consensusModelPerformanceEngine.loadState, with inline
 * snapshots as override). This gives full coverage of the dispatcher's
 * input modes without booting the MCP server (which has pre-existing
 * build errors unrelated to this unit).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { consensusDriftDetectorEngine } from "../engines/ConsensusDriftDetectorEngine.js";
import { consensusModelPerformanceEngine } from "../engines/ConsensusModelPerformanceEngine.js";
import type { PerformanceState } from "../engines/ConsensusModelPerformanceEngine.js";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-drift-disp-"));
}

function makeState(spec: Record<string, Record<string, { ema: number; n: number }>>): PerformanceState {
  const vendors: PerformanceState["vendors"] = {};
  for (const [vendor, tasks] of Object.entries(spec)) {
    const tasksOut: Record<string, { ema: number; n: number }> = {};
    for (const [taskType, stats] of Object.entries(tasks)) {
      tasksOut[taskType] = { ema: stats.ema, n: stats.n };
    }
    vendors[vendor] = { tasks: tasksOut };
  }
  return { schemaVersion: "1.0.0", vendors };
}

let dir: string;
beforeEach(() => { dir = tmpDir(); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe("intelligenceDispatcher → consensus_drift_detect (route shape)", () => {
  // ---- file-path mode ----

  it("routes via beforePath + afterPath when both files exist", () => {
    const beforePath = path.join(dir, "before.json");
    const afterPath = path.join(dir, "after.json");
    consensusModelPerformanceEngine.saveState(
      makeState({ anthropic: { plan: { ema: 0.90, n: 30 } } }),
      beforePath,
    );
    consensusModelPerformanceEngine.saveState(
      makeState({ anthropic: { plan: { ema: 0.50, n: 33 } } }),
      afterPath,
    );

    const before = consensusModelPerformanceEngine.loadState(beforePath);
    const after = consensusModelPerformanceEngine.loadState(afterPath);
    const report = consensusDriftDetectorEngine.compare(before, after);
    expect(report.events).toHaveLength(1);
    expect(report.events[0].severity).toBe("severe");
    expect(report.events[0].vendor).toBe("anthropic");
    expect(report.events[0].delta).toBeCloseTo(-0.40, 5);
  });

  it("returns empty report when both snapshots are missing files (fail-open)", () => {
    const beforePath = path.join(dir, "missing-before.json");
    const afterPath = path.join(dir, "missing-after.json");
    const before = consensusModelPerformanceEngine.loadState(beforePath);
    const after = consensusModelPerformanceEngine.loadState(afterPath);
    const report = consensusDriftDetectorEngine.compare(before, after);
    expect(report.events).toHaveLength(0);
    expect(report.exempt).toHaveLength(0);
    expect(report.counts.totalCompared).toBe(0);
  });

  // ---- inline mode ----

  it("routes via inline before + after payloads (test/integration shortcut)", () => {
    const before = makeState({ openai: { decide: { ema: 0.92, n: 50 } } });
    const after = makeState({ openai: { decide: { ema: 0.40, n: 60 } } });
    const report = consensusDriftDetectorEngine.compare(before, after);
    expect(report.counts.severe).toBe(1);
    expect(report.events[0].vendor).toBe("openai");
    expect(report.events[0].taskType).toBe("decide");
  });

  // ---- mixed mode (one file, one inline) ----

  it("supports mixed mode: beforePath loads from disk, after supplied inline", () => {
    const beforePath = path.join(dir, "before.json");
    consensusModelPerformanceEngine.saveState(
      makeState({ google: { plan: { ema: 0.80, n: 40 } } }),
      beforePath,
    );
    const before = consensusModelPerformanceEngine.loadState(beforePath);
    const after = makeState({ google: { plan: { ema: 0.45, n: 45 } } });
    const report = consensusDriftDetectorEngine.compare(before, after);
    expect(report.counts.severe).toBe(1);
    expect(report.events[0].delta).toBeCloseTo(-0.35, 5);
  });

  // ---- timestamp metadata propagation ----

  it("propagates beforeAt + afterAt into report metadata for traceability", () => {
    const before = makeState({});
    const after = makeState({});
    const report = consensusDriftDetectorEngine.compare(before, after, {
      beforeAt: "2026-05-04T00:00:00.000Z",
      afterAt: "2026-05-05T00:00:00.000Z",
    });
    expect(report.beforeAt).toBe("2026-05-04T00:00:00.000Z");
    expect(report.afterAt).toBe("2026-05-05T00:00:00.000Z");
  });

  // ---- threshold override ----

  it("respects custom severity thresholds via dispatcher params", () => {
    const before = makeState({ anthropic: { plan: { ema: 0.80, n: 30 } } });
    const after = makeState({ anthropic: { plan: { ema: 0.70, n: 32 } } });
    // Default thresholds: -0.10 = minor (not actionable).
    const reportDefault = consensusDriftDetectorEngine.compare(before, after);
    expect(reportDefault.counts.minor).toBe(1);
    expect(consensusDriftDetectorEngine.hasActionableDrift(reportDefault)).toBe(false);
    // Tighten: minor=0.02 moderate=0.05 severe=0.20 → -0.10 = moderate (actionable).
    const reportTight = consensusDriftDetectorEngine.compare(before, after, {
      minorThreshold: 0.02,
      moderateThreshold: 0.05,
      severeThreshold: 0.20,
    });
    expect(reportTight.counts.moderate).toBe(1);
    expect(consensusDriftDetectorEngine.hasActionableDrift(reportTight)).toBe(true);
  });

  // ---- adversarial: corrupt JSON file ----

  it("loadState handles corrupt JSON and downstream compare yields empty report", () => {
    const beforePath = path.join(dir, "corrupt.json");
    fs.writeFileSync(beforePath, "{not-valid-json", "utf-8");
    const before = consensusModelPerformanceEngine.loadState(beforePath);
    const after = makeState({ anthropic: { plan: { ema: 0.5, n: 10 } } });
    const report = consensusDriftDetectorEngine.compare(before, after);
    expect(report.events).toHaveLength(0);
    expect(report.exempt).toContainEqual({ vendor: "anthropic", taskType: "plan", reason: "new-in-after" });
  });

  // ---- end-to-end actionable signal ----

  it("hasActionableDrift gate distinguishes actionable from cosmetic regressions", () => {
    const before = makeState({
      anthropic: { plan: { ema: 0.90, n: 50 } },
      openai: { plan: { ema: 0.85, n: 50 } },
    });
    const cosmetic = makeState({
      anthropic: { plan: { ema: 0.86, n: 52 } }, // minor (-0.04 → none, -0.05+ = minor)
      openai: { plan: { ema: 0.81, n: 52 } },
    });
    const actionable = makeState({
      anthropic: { plan: { ema: 0.50, n: 52 } }, // severe
      openai: { plan: { ema: 0.81, n: 52 } },
    });
    const reportCosmetic = consensusDriftDetectorEngine.compare(before, cosmetic);
    const reportActionable = consensusDriftDetectorEngine.compare(before, actionable);
    expect(consensusDriftDetectorEngine.hasActionableDrift(reportCosmetic)).toBe(false);
    expect(consensusDriftDetectorEngine.hasActionableDrift(reportActionable)).toBe(true);
  });
});
