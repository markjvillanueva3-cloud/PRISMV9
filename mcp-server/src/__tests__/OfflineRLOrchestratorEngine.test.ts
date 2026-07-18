/**
 * OfflineRL Orchestrator Engine Tests — U-LEARN-08
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { offlineRLOrchestratorEngine } from "../engines/OfflineRLOrchestratorEngine.js";
import { iqlEngine } from "../engines/IQLEngine.js";
import { maxEntIRLEngine } from "../engines/MaxEntIRLEngine.js";
import { safetyShieldEngine } from "../engines/SafetyShieldEngine.js";
import { PolicyExperienceLedgerEngine } from "../engines/PolicyExperienceLedgerEngine.js";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

describe("OfflineRLOrchestratorEngine", () => {
  let ledgerRoot: string;

  beforeEach(() => {
    offlineRLOrchestratorEngine.clear();
    iqlEngine.clear();
    maxEntIRLEngine.clear();
    safetyShieldEngine.clear();
    // Isolate the persistent experience ledger in a FRESH tmp dir per test so
    // suites never race on the cwd-shared state/policy/experience.jsonl, and so
    // "empty experience" asserts aren't polluted by stale tuples from prior runs.
    ledgerRoot = mkdtempSync(path.join(os.tmpdir(), "prism-offlinerl-"));
    offlineRLOrchestratorEngine.setLedgerForTest(new PolicyExperienceLedgerEngine(ledgerRoot));
  });

  afterEach(() => {
    try { rmSync(ledgerRoot, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("trains with empty experience returns zero metrics", () => {
    const result = offlineRLOrchestratorEngine.train({ policy_id: "empty_test", domain: "mill", epochs: 10, batch_size: 32, demonstration_source: "both" });
    expect(result.policy_id).toBe("empty_test");
    expect(result.experience_tuples_used).toBe(0);
    expect(result.epochs_completed).toBe(0);
  });

  it("lists policies after training attempt", () => {
    offlineRLOrchestratorEngine.train({ policy_id: "list_test", domain: "lathe", epochs: 5, batch_size: 32, demonstration_source: "both" });
    expect(offlineRLOrchestratorEngine.listPolicies()).toContain("list_test");
  });

  it("returns state for trained policy", () => {
    offlineRLOrchestratorEngine.train({ policy_id: "state_test", domain: "wedm", epochs: 5, batch_size: 32, demonstration_source: "both" });
    const state = offlineRLOrchestratorEngine.getState("state_test");
    expect(state).not.toBeNull();
    expect(state!.domain).toBe("wedm");
  });

  it("deletes policy and clears components", () => {
    offlineRLOrchestratorEngine.train({ policy_id: "del_test", domain: "mill", epochs: 5, batch_size: 32, demonstration_source: "both" });
    expect(offlineRLOrchestratorEngine.listPolicies()).toContain("del_test");
    offlineRLOrchestratorEngine.deletePolicy("del_test");
    expect(offlineRLOrchestratorEngine.listPolicies()).not.toContain("del_test");
  });

  it("throws error for inference on untrained policy", () => {
    expect(() => offlineRLOrchestratorEngine.infer({ policy_id: "nonexistent", state: { x: 1 }, apply_safety_shield: false })).toThrow("Policy not found");
  });

  it("clears all policies", () => {
    offlineRLOrchestratorEngine.train({ policy_id: "p1", domain: "mill", epochs: 1, batch_size: 32, demonstration_source: "both" });
    offlineRLOrchestratorEngine.train({ policy_id: "p2", domain: "lathe", epochs: 1, batch_size: 32, demonstration_source: "both" });
    expect(offlineRLOrchestratorEngine.listPolicies()).toHaveLength(2);
    offlineRLOrchestratorEngine.clear();
    expect(offlineRLOrchestratorEngine.listPolicies()).toHaveLength(0);
  });

  it("returns null state for unknown policy", () => {
    const state = offlineRLOrchestratorEngine.getState("unknown");
    expect(state).toBeNull();
  });

  it("training returns timing metrics", () => {
    const result = offlineRLOrchestratorEngine.train({ policy_id: "time_test", domain: "grinder", epochs: 1, batch_size: 32, demonstration_source: "both" });
    expect(result.training_time_ms).toBeGreaterThanOrEqual(0);
  });

  it("supports all domain types", () => {
    const domains = ["mill", "lathe", "wedm", "sinker", "grinder", "welder", "general"] as const;
    for (const domain of domains) {
      const result = offlineRLOrchestratorEngine.train({ policy_id: `domain_${domain}`, domain, epochs: 1, batch_size: 32, demonstration_source: "both" });
      expect(result.domain).toBe(domain);
    }
  });

  it("handles demonstration_source options", () => {
    const sources = ["operator_overrides", "program_archive", "both"] as const;
    for (const src of sources) {
      const result = offlineRLOrchestratorEngine.train({ policy_id: `src_${src}`, domain: "mill", epochs: 1, batch_size: 32, demonstration_source: src });
      expect(result.policy_id).toBe(`src_${src}`);
    }
  });
});
