/**
 * MillMasterAIWiringMXU.test — MILL-MASTER-AI-WIRING / U15-MXU-TELEMETRY
 * =========================================================================
 * Verifies that every invocation through MillAIWiring.budgetedAIPath records
 * a UsageEvent on capabilityEffectivenessEngine and that
 * capabilityCensusEngine.runLiveCensus surfaces MillAIWiring + the wired
 * mill-master engines that depend on it.
 *
 * @milestone MILL-MASTER-AI-WIRING / U15-MXU-TELEMETRY
 */

import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  budgetedAIPath,
  resetBudgetOverruns,
  markBudgetOverrun,
  type BudgetedAIPathOpts,
} from "../engines/MillAIWiring.js";
import { capabilityEffectivenessEngine } from "../engines/CapabilityEffectivenessEngine.js";
import { capabilityCensusEngine } from "../engines/CapabilityCensusEngine.js";

// Worktree-local engines dir (default ENGINES_DIR resolves to main repo via PATHS).
const WORKTREE_ENGINES_DIR = path.resolve(process.cwd(), "src", "engines");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usageCountFor(capId: string): number {
  return capabilityEffectivenessEngine.scoreCapability(capId).usage_count;
}

let _capCounter = 0;
function uniqueCapId(prefix: string): string {
  return `${prefix}:${Date.now()}:${++_capCounter}`;
}

// ---------------------------------------------------------------------------
// Telemetry-recording behavior
// ---------------------------------------------------------------------------

describe("budgetedAIPath — telemetry recording (U15)", () => {
  it("useAI='off' records exactly one success event on the legacy path", () => {
    const cap = uniqueCapId("u15-off");
    const opts: BudgetedAIPathOpts = { capabilityId: cap };
    const before = usageCountFor(cap);

    const out = budgetedAIPath("off", () => "legacy-result", () => "ai-result", opts);

    expect(out).toBe("legacy-result");
    expect(usageCountFor(cap) - before).toBe(1);
    expect(capabilityEffectivenessEngine.scoreCapability(cap).success_rate).toBe(1);
  });

  it("useAI='on' records exactly one success event on the AI path", () => {
    const cap = uniqueCapId("u15-on");
    const opts: BudgetedAIPathOpts = { capabilityId: cap };
    const before = usageCountFor(cap);

    const out = budgetedAIPath("on", () => "legacy-result", () => "ai-result", opts);

    expect(out).toBe("ai-result");
    expect(usageCountFor(cap) - before).toBe(1);
  });

  it("useAI='on' with throwing aiFn falls back to legacy and records exactly one event", () => {
    const cap = uniqueCapId("u15-fallback");
    const opts: BudgetedAIPathOpts = { capabilityId: cap };
    const before = usageCountFor(cap);

    const out = budgetedAIPath(
      "on",
      () => "legacy-fallback",
      () => { throw new Error("ai exploded"); },
      opts,
    );

    expect(out).toBe("legacy-fallback");
    expect(usageCountFor(cap) - before).toBe(1);
    expect(capabilityEffectivenessEngine.scoreCapability(cap).success_rate).toBe(1);
  });

  it("useAI='auto' downgrades to legacy when capability is in cooldown and records once", () => {
    const cap = uniqueCapId("u15-auto-cooldown");
    markBudgetOverrun(cap);
    const opts: BudgetedAIPathOpts = { capabilityId: cap };
    const before = usageCountFor(cap);

    const out = budgetedAIPath("auto", () => "legacy-cooldown", () => "ai-cooldown", opts);

    expect(out).toBe("legacy-cooldown");
    expect(usageCountFor(cap) - before).toBe(1);

    resetBudgetOverruns();
  });

  it("opts.recordTelemetry=false suppresses recordUsage entirely", () => {
    const cap = uniqueCapId("u15-no-telemetry");
    const opts: BudgetedAIPathOpts = { capabilityId: cap, recordTelemetry: false };
    const before = usageCountFor(cap);

    const out = budgetedAIPath("on", () => "legacy", () => "ai", opts);

    expect(out).toBe("ai");
    expect(usageCountFor(cap) - before).toBe(0);
  });

  it("legacyFn exception is preserved and recorded as a failure (off path)", () => {
    const cap = uniqueCapId("u15-legacy-throw");
    const opts: BudgetedAIPathOpts = { capabilityId: cap };
    const before = usageCountFor(cap);

    expect(() => budgetedAIPath(
      "off",
      () => { throw new Error("legacy exploded"); },
      () => "unreachable",
      opts,
    )).toThrow(/legacy exploded/);

    expect(usageCountFor(cap) - before).toBe(1);
    expect(capabilityEffectivenessEngine.scoreCapability(cap).success_rate).toBe(0);
  });

  it("both aiFn and legacyFn throwing surfaces the legacy error after recording the failure", () => {
    const cap = uniqueCapId("u15-both-throw");
    const opts: BudgetedAIPathOpts = { capabilityId: cap };
    const before = usageCountFor(cap);

    expect(() => budgetedAIPath(
      "on",
      () => { throw new Error("legacy ALSO exploded"); },
      () => { throw new Error("ai exploded"); },
      opts,
    )).toThrow(/legacy ALSO exploded/);

    expect(usageCountFor(cap) - before).toBe(1);
    expect(capabilityEffectivenessEngine.scoreCapability(cap).success_rate).toBe(0);
  });

  it("recordUsage exceptions are silently swallowed — call path returns the AI result", () => {
    const cap = uniqueCapId("u15-record-throws");
    const original = capabilityEffectivenessEngine.recordUsage.bind(capabilityEffectivenessEngine);
    let called = 0;
    capabilityEffectivenessEngine.recordUsage = ((event) => {
      called++;
      throw new Error("recordUsage exploded");
    }) as typeof capabilityEffectivenessEngine.recordUsage;

    try {
      const out = budgetedAIPath(
        "on",
        () => "legacy",
        () => "ai-survives",
        { capabilityId: cap },
      );
      expect(out).toBe("ai-survives");
      expect(called).toBe(1);
    } finally {
      capabilityEffectivenessEngine.recordUsage = original;
    }
  });

  it("two consecutive useAI='off' calls produce exactly two recorded events", () => {
    const cap = uniqueCapId("u15-multi");
    const opts: BudgetedAIPathOpts = { capabilityId: cap };
    const before = usageCountFor(cap);

    budgetedAIPath("off", () => "a", () => "ignored", opts);
    budgetedAIPath("off", () => "b", () => "ignored", opts);

    expect(usageCountFor(cap) - before).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Census visibility — wired engines reachable via filesystem scan
// ---------------------------------------------------------------------------

describe("capabilityCensusEngine — surfaces MillAIWiring + wired mill-master engines (U15)", () => {
  it("scanEngines includes MillAIWiring", () => {
    const engines = capabilityCensusEngine.scanEngines(WORKTREE_ENGINES_DIR);
    expect(engines).toContain("MillAIWiring");
  });

  it("scanEngines includes the U3-U14 wired mill-master engines", () => {
    const engines = new Set(capabilityCensusEngine.scanEngines(WORKTREE_ENGINES_DIR));
    const wired = [
      "MillingMachineIntelligenceEngine",
      "FiveAxisAIUltraIntelligenceEngine",
      "FiveAxisOrchestrationEngine",
      "MillTurnSwissPipelineEngine",
      "MillingDeepAIHardeningEngine",
      "MillDeepLearningEngine",
      "MillComprehensiveNeuralEngine",
      "MillingProgramPatternEngine",
      "MillingAIIntegrationEngine",
      "MillingHeadIntelligenceEngine",
      "FiveAxisToolpathSynthesisEngine",
      "FiveAxisDecisionEngine",
      "MillNeuralNetworkEngine",
    ];
    for (const name of wired) {
      expect(engines.has(name)).toBe(true);
    }
  });

  it("runLiveCensus produces a report with > 100 engines and well-formed wiring summary", () => {
    const census = capabilityCensusEngine.runLiveCensus();
    expect(census.report.total_engines).toBeGreaterThan(100);
    expect(typeof census.report.utilization_pct).toBe("number");
    expect(census.report.utilization_pct).toBeGreaterThanOrEqual(0);
    expect(census.report.utilization_pct).toBeLessThanOrEqual(100);
  });
});
