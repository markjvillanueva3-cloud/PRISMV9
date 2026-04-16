/**
 * MXU-MS4/MS5/MS6 Tests
 * CapabilityPathEngine, WorkflowOrchestrationEngine, ProductPillarEngine
 */
import { describe, it, expect } from "vitest";
import { capabilityPathEngine } from "../engines/CapabilityPathEngine.js";
import { workflowOrchestrationEngine } from "../engines/WorkflowOrchestrationEngine.js";
import { productPillarEngine } from "../engines/ProductPillarEngine.js";

// ── CapabilityPathEngine (MXU-MS4) ───────────────────────────

describe("CapabilityPathEngine — Paths", () => {

  it("lists 4 learning paths", () => {
    const paths = capabilityPathEngine.listPaths();
    expect(paths.length).toBe(4);
    expect(paths.some(p => p.id === "sf")).toBe(true);
    expect(paths.some(p => p.id === "pp")).toBe(true);
  });

  it("gets a specific path", () => {
    const path = capabilityPathEngine.getPath("sf");
    expect(path).toBeDefined();
    expect(path!.modules.length).toBe(8);
  });

  it("gets a specific module", () => {
    const mod = capabilityPathEngine.getModule("sf-04");
    expect(mod).toBeDefined();
    expect(mod!.title).toContain("Kienzle");
    expect(mod!.level).toBe("intermediate");
  });

  it("returns undefined for unknown path", () => {
    expect(capabilityPathEngine.getPath("nonexistent")).toBeUndefined();
  });

  it("total modules across all paths", () => {
    expect(capabilityPathEngine.getTotalModules()).toBe(20);
  });
});

describe("CapabilityPathEngine — Progress", () => {

  it("0% with no completions", () => {
    const p = capabilityPathEngine.getProgress("sf", []);
    expect(p.completed).toBe(0);
    expect(p.pct).toBe(0);
    expect(p.next).toBeDefined();
    expect(p.next!.id).toBe("sf-01");
  });

  it("tracks partial progress", () => {
    const p = capabilityPathEngine.getProgress("sf", ["sf-01", "sf-02"]);
    expect(p.completed).toBe(2);
    expect(p.pct).toBe(25);
    expect(p.level).toBe("beginner");
    expect(p.next!.id).toBe("sf-03");
  });

  it("100% when all done", () => {
    const all = ["sf-01", "sf-02", "sf-03", "sf-04", "sf-05", "sf-06", "sf-07", "sf-08"];
    const p = capabilityPathEngine.getProgress("sf", all);
    expect(p.pct).toBe(100);
    expect(p.level).toBe("expert");
    expect(p.next).toBeUndefined();
  });

  it("getAllProgress returns all paths", () => {
    const all = capabilityPathEngine.getAllProgress(["sf-01"]);
    expect(all.length).toBe(4);
    expect(all.find(p => p.path_id === "sf")!.completed).toBe(1);
  });
});

describe("CapabilityPathEngine — Suggestion", () => {

  it("suggests beginner module for new user", () => {
    const s = capabilityPathEngine.suggestNext([]);
    expect(s).not.toBeNull();
    expect(s!.module.level).toBe("beginner");
    expect(s!.prereqs_met).toBe(true);
  });

  it("respects domain preference", () => {
    const s = capabilityPathEngine.suggestNext([], "business");
    expect(s).not.toBeNull();
    expect(s!.module.path_id).toBe("qt");
  });

  it("skips completed modules", () => {
    const s = capabilityPathEngine.suggestNext(["sf-01"]);
    expect(s!.module.id).not.toBe("sf-01");
  });

  it("returns null when all done", () => {
    const all = capabilityPathEngine.listPaths().flatMap(p => {
      const path = capabilityPathEngine.getPath(p.id)!;
      return path.modules.map(m => m.id);
    });
    expect(capabilityPathEngine.suggestNext(all)).toBeNull();
  });
});

describe("CapabilityPathEngine — Capabilities", () => {

  it("unlocks capabilities from completed modules", () => {
    const caps = capabilityPathEngine.getUnlockedCapabilities(["sf-01", "sf-02"]);
    expect(caps).toContain("calc.speed_feed");
    expect(caps).toContain("calc.chip_thinning");
  });

  it("finds modules that unlock a capability", () => {
    const mods = capabilityPathEngine.findModulesForCapability("calc.cutting_force");
    expect(mods.length).toBe(1);
    expect(mods[0].id).toBe("sf-04");
  });
});

// ── WorkflowOrchestrationEngine (MXU-MS5) ────────────────────

describe("WorkflowOrchestrationEngine — Catalog", () => {

  it("lists built-in workflows", () => {
    const wfs = workflowOrchestrationEngine.listWorkflows();
    expect(wfs.length).toBe(3);
    expect(wfs.some(w => w.id === "forge-engine")).toBe(true);
    expect(wfs.some(w => w.id === "physics-validate")).toBe(true);
  });

  it("gets a specific workflow", () => {
    const wf = workflowOrchestrationEngine.getWorkflow("forge-engine");
    expect(wf).toBeDefined();
    expect(wf!.steps.length).toBe(6);
    expect(wf!.strategy).toBe("serial");
  });
});

describe("WorkflowOrchestrationEngine — Execution Planning", () => {

  it("plans serial workflow as sequential phases", () => {
    const wf = workflowOrchestrationEngine.getWorkflow("forge-engine")!;
    const plan = workflowOrchestrationEngine.planExecution(wf);
    expect(plan.total_steps).toBe(6);
    expect(plan.phases.length).toBeGreaterThanOrEqual(6); // serial = 1 step per phase
    expect(plan.parallelism_ratio).toBe(0);
  });

  it("plans fan-out workflow with parallel phases", () => {
    const wf = workflowOrchestrationEngine.getWorkflow("physics-validate")!;
    const plan = workflowOrchestrationEngine.planExecution(wf);
    expect(plan.total_steps).toBe(4);
    // First 3 have no deps → can parallelize
    expect(plan.phases.some(p => p.can_parallelize)).toBe(true);
    expect(plan.parallelism_ratio).toBeGreaterThan(0);
  });

  it("estimates duration", () => {
    const wf = workflowOrchestrationEngine.getWorkflow("physics-validate")!;
    const plan = workflowOrchestrationEngine.planExecution(wf);
    expect(plan.estimated_duration_ms).toBeGreaterThan(0);
  });
});

describe("WorkflowOrchestrationEngine — Conflict Detection", () => {

  it("no conflicts for serial workflow", () => {
    const wf = workflowOrchestrationEngine.getWorkflow("forge-engine")!;
    const c = workflowOrchestrationEngine.detectConflicts(wf);
    expect(c.has_conflict).toBe(false);
  });

  it("detects potential conflicts in parallel workflows", () => {
    const wf = workflowOrchestrationEngine.getWorkflow("physics-validate")!;
    const c = workflowOrchestrationEngine.detectConflicts(wf);
    // No conflicts because different actions
    expect(c.resolution).toBeTruthy();
  });
});

describe("WorkflowOrchestrationEngine — Result Aggregation", () => {

  it("aggregates all-completed results", () => {
    const r = workflowOrchestrationEngine.aggregateResults([
      { step_id: "a", status: "completed", duration_ms: 100 },
      { step_id: "b", status: "completed", duration_ms: 200 },
    ]);
    expect(r.status).toBe("completed");
    expect(r.total_duration_ms).toBe(300);
  });

  it("aggregates partial results", () => {
    const r = workflowOrchestrationEngine.aggregateResults([
      { step_id: "a", status: "completed", duration_ms: 100 },
      { step_id: "b", status: "failed", duration_ms: 50, error: "timeout" },
    ]);
    expect(r.status).toBe("partial");
  });

  it("aggregates all-failed results", () => {
    const r = workflowOrchestrationEngine.aggregateResults([
      { step_id: "a", status: "failed", duration_ms: 50, error: "err" },
    ]);
    expect(r.status).toBe("failed");
  });
});

describe("WorkflowOrchestrationEngine — Custom Workflow", () => {

  it("creates custom serial workflow", () => {
    const wf = workflowOrchestrationEngine.createWorkflow("test", [
      { name: "step1", type: "engine", action: "a" },
      { name: "step2", type: "engine", action: "b" },
    ], "serial");
    expect(wf.steps.length).toBe(2);
    expect(wf.steps[1].depends_on).toContain("step_0");
  });

  it("creates custom parallel workflow", () => {
    const wf = workflowOrchestrationEngine.createWorkflow("test", [
      { name: "step1", type: "engine", action: "a" },
      { name: "step2", type: "engine", action: "b" },
    ], "parallel");
    expect(wf.steps[1].depends_on).toHaveLength(0); // no serial deps
  });
});

// ── ProductPillarEngine (MXU-MS6) ────────────────────────────

describe("ProductPillarEngine — Catalog", () => {

  it("lists 8 product pillars", () => {
    const pillars = productPillarEngine.listPillars();
    expect(pillars.length).toBe(8);
    expect(pillars.some(p => p.id === "calculator")).toBe(true);
    expect(pillars.some(p => p.id === "postprocessor")).toBe(true);
    expect(pillars.some(p => p.id === "edm")).toBe(true);
  });

  it("gets specific pillar", () => {
    const p = productPillarEngine.getPillar("calculator");
    expect(p).toBeDefined();
    expect(p!.engines.length).toBeGreaterThan(5);
    expect(p!.min_tier).toBe("free");
  });

  it("pillar count", () => {
    expect(productPillarEngine.getPillarCount()).toBe(8);
  });
});

describe("ProductPillarEngine — Completeness Scoring", () => {

  const wired = new Set(["SpeedFeedOrchestratorEngine", "KienzleForceModelEngine", "SpeedFeedAutopilotEngine"]);
  const skills = new Set(["sfc-quick-start", "auto-speed-feed", "calc"]);

  it("scores partially wired pillar", () => {
    const s = productPillarEngine.scorePillar("calculator", wired, skills);
    expect(s.wired_engines).toBe(3);
    expect(s.completeness_pct).toBeGreaterThan(0);
    expect(s.completeness_pct).toBeLessThan(100);
    expect(s.entry_points_active).toBeGreaterThan(0);
    expect(s.status).toBe("partial");
  });

  it("scores stub pillar with no wiring", () => {
    const s = productPillarEngine.scorePillar("quality", new Set(), new Set());
    expect(s.completeness_pct).toBe(0);
    expect(s.status).toBe("stub");
  });

  it("returns unknown for invalid pillar", () => {
    const s = productPillarEngine.scorePillar("nonexistent" as any, new Set(), new Set());
    expect(s.pillar_name).toBe("Unknown");
  });
});

describe("ProductPillarEngine — Summary", () => {

  it("produces full summary", () => {
    const wired = new Set(["SpeedFeedOrchestratorEngine"]);
    const skills = new Set(["calc"]);
    const s = productPillarEngine.getSummary(wired, skills);
    expect(s.total_pillars).toBe(8);
    expect(s.ready + s.partial + s.stub).toBe(8);
    expect(s.avg_completeness_pct).toBeGreaterThanOrEqual(0);
    expect(s.pillars.length).toBe(8);
  });
});

describe("ProductPillarEngine — Feature Gates", () => {

  it("free tier accesses calculator", () => {
    const g = productPillarEngine.checkGate("calculator", "free");
    expect(g.allowed).toBe(true);
  });

  it("free tier blocked from postprocessor", () => {
    const g = productPillarEngine.checkGate("postprocessor", "free");
    expect(g.allowed).toBe(false);
    expect(g.reason).toContain("pro");
  });

  it("enterprise accesses everything", () => {
    const g = productPillarEngine.checkGate("automation", "enterprise");
    expect(g.allowed).toBe(true);
  });

  it("pro accesses pro-tier pillars", () => {
    const g = productPillarEngine.checkGate("quote", "pro");
    expect(g.allowed).toBe(true);
  });

  it("getAccessiblePillars for free tier", () => {
    const pillars = productPillarEngine.getAccessiblePillars("free");
    expect(pillars).toContain("calculator");
    expect(pillars).toContain("knowledge");
    expect(pillars).not.toContain("postprocessor");
  });

  it("getAccessiblePillars for enterprise tier includes all", () => {
    const pillars = productPillarEngine.getAccessiblePillars("enterprise");
    expect(pillars.length).toBe(8);
  });
});
