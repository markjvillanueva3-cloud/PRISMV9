/**
 * UtilizationContractEngine + CapabilityCensusEngine Tests — MXU-MS0
 */
import { describe, it, expect } from "vitest";
import { utilizationContractEngine } from "../engines/UtilizationContractEngine.js";
import { capabilityCensusEngine } from "../engines/CapabilityCensusEngine.js";

// ── Domain Classification ────────────────────────────────────

describe("UtilizationContractEngine — Domain Classification", () => {

  it("classifies SpeedFeedOrchestratorEngine as physics", () => {
    expect(utilizationContractEngine.classifyDomain("SpeedFeedOrchestratorEngine")).toBe("physics");
  });

  it("classifies PostProcessorPipelineEngine as post_processor", () => {
    expect(utilizationContractEngine.classifyDomain("PostProcessorPipelineEngine")).toBe("post_processor");
  });

  it("classifies WireEDMSettingsEngine as edm", () => {
    expect(utilizationContractEngine.classifyDomain("WireEDMSettingsEngine")).toBe("edm");
  });

  it("classifies QuoteToShipOrchestratorEngine as business", () => {
    expect(utilizationContractEngine.classifyDomain("QuoteToShipOrchestratorEngine")).toBe("business");
  });

  it("classifies HyperMillStrategyEngine as hypermill", () => {
    expect(utilizationContractEngine.classifyDomain("HyperMillStrategyEngine")).toBe("hypermill");
  });

  it("classifies AutomationChainEngine as automation", () => {
    expect(utilizationContractEngine.classifyDomain("AutomationChainEngine")).toBe("automation");
  });

  it("classifies unknown as general", () => {
    expect(utilizationContractEngine.classifyDomain("SomeRandomEngine")).toBe("general");
  });
});

// ── Internal Detection ───────────────────────────────────────

describe("UtilizationContractEngine — Internal Detection", () => {

  it("flags index as internal", () => {
    expect(utilizationContractEngine.isInternal("index")).toBe(true);
  });

  it("flags Helper suffix as internal", () => {
    expect(utilizationContractEngine.isInternal("SomeHelper")).toBe(true);
  });

  it("flags Bridge suffix as internal", () => {
    expect(utilizationContractEngine.isInternal("CAMKernelBridge")).toBe(true);
  });

  it("regular engine is not internal", () => {
    expect(utilizationContractEngine.isInternal("SpeedFeedOrchestratorEngine")).toBe(false);
  });
});

// ── Capability Mapping ───────────────────────────────────────

describe("UtilizationContractEngine — Capability Mapping", () => {

  const engines = ["SpeedFeedOrchestrator", "DarkEngine", "SomeHelper", "PostProcessor"];
  const actions = new Map<string, string[]>([
    ["calc.speed_feed", ["SpeedFeedOrchestrator"]],
    ["dev.pp_config", ["PostProcessor"]],
  ]);
  const skills = ["speed-feed", "auto-speed-feed", "pp-resolve"];
  const tests = ["SpeedFeedOrchestrator.test.ts", "PostProcessor.test.ts"];

  it("maps fully wired engine", () => {
    const caps = utilizationContractEngine.mapCapabilities(engines, actions, skills, tests);
    const sf = caps.find(c => c.engine_name === "SpeedFeedOrchestrator")!;
    expect(sf.wiring_level).toBe("full");
    expect(sf.dispatcher_actions.length).toBeGreaterThan(0);
    expect(sf.skills.length).toBeGreaterThan(0);
    expect(sf.has_tests).toBe(true);
  });

  it("maps dark engine", () => {
    const caps = utilizationContractEngine.mapCapabilities(engines, actions, skills, tests);
    const dark = caps.find(c => c.engine_name === "DarkEngine")!;
    expect(dark.wiring_level).toBe("dark");
    expect(dark.dispatcher_actions).toHaveLength(0);
  });

  it("maps internal engine", () => {
    const caps = utilizationContractEngine.mapCapabilities(engines, actions, skills, tests);
    const helper = caps.find(c => c.engine_name === "SomeHelper")!;
    expect(helper.wiring_level).toBe("internal");
  });

  it("maps partial engine (action but no skill)", () => {
    const caps = utilizationContractEngine.mapCapabilities(
      ["OnlyAction"],
      new Map([["x.act", ["OnlyAction"]]]),
      [],
      [],
    );
    const e = caps.find(c => c.engine_name === "OnlyAction")!;
    expect(e.wiring_level).toBe("partial");
  });
});

// ── Gap Analysis ─────────────────────────────────────────────

describe("UtilizationContractEngine — Gap Analysis", () => {

  it("finds no_dispatcher gap for dark engines", () => {
    const caps = utilizationContractEngine.mapCapabilities(
      ["DarkPhysicsEngine"],
      new Map(),
      [],
      [],
    );
    const gaps = utilizationContractEngine.findGaps(caps);
    expect(gaps.some(g => g.gap_type === "no_dispatcher")).toBe(true);
  });

  it("finds no_skill gap for partial engines", () => {
    const caps = utilizationContractEngine.mapCapabilities(
      ["PartialEngine"],
      new Map([["x.act", ["PartialEngine"]]]),
      [],
      [],
    );
    const gaps = utilizationContractEngine.findGaps(caps);
    expect(gaps.some(g => g.gap_type === "no_skill")).toBe(true);
  });

  it("skips internal engines in gap analysis", () => {
    const caps = utilizationContractEngine.mapCapabilities(
      ["SomeHelper"],
      new Map(),
      [],
      [],
    );
    const gaps = utilizationContractEngine.findGaps(caps);
    expect(gaps).toHaveLength(0);
  });

  it("sorts gaps by severity", () => {
    const caps = utilizationContractEngine.mapCapabilities(
      ["DarkPhysicsEngine", "PartialEngine"],
      new Map([["x.act", ["PartialEngine"]]]),
      [],
      ["PartialEngine.test.ts"],
    );
    const gaps = utilizationContractEngine.findGaps(caps);
    if (gaps.length >= 2) {
      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < gaps.length; i++) {
        expect(sevOrder[gaps[i].severity]).toBeGreaterThanOrEqual(sevOrder[gaps[i - 1].severity]);
      }
    }
  });
});

// ── Report Generation ────────────────────────────────────────

describe("UtilizationContractEngine — Report", () => {

  it("generates valid report", () => {
    const caps = utilizationContractEngine.mapCapabilities(
      ["FullEngine", "DarkEngine", "SomeHelper"],
      new Map([["x.act", ["FullEngine"]]]),
      ["full-engine"],
      ["FullEngine.test.ts"],
    );
    const report = utilizationContractEngine.generateReport(caps, 5, 20, 10);

    expect(report.total_engines).toBe(3);
    expect(report.wiring_summary.full).toBe(1);
    expect(report.wiring_summary.dark).toBe(1);
    expect(report.wiring_summary.internal).toBe(1);
    expect(report.utilization_pct).toBeGreaterThan(0);
    expect(report.domain_breakdown.length).toBeGreaterThan(0);
  });

  it("utilization excludes internal engines", () => {
    const caps = utilizationContractEngine.mapCapabilities(
      ["FullEngine", "SomeHelper", "AnotherHelper"],
      new Map([["x.act", ["FullEngine"]]]),
      ["full-engine"],
      [],
    );
    const report = utilizationContractEngine.generateReport(caps, 1, 1, 1);
    // 1 full out of 1 user-facing = 100%
    expect(report.utilization_pct).toBe(100);
  });
});

// ── Quick Stats ──────────────────────────────────────────────

describe("UtilizationContractEngine — Quick Stats", () => {

  it("computes quick stats", () => {
    const caps = utilizationContractEngine.mapCapabilities(
      ["SpeedFeedCalc", "DarkEngine", "SomeHelper"],
      new Map([["x.a", ["SpeedFeedCalc"]]]),
      ["speed-feed-calc"],
      [],
    );
    const stats = utilizationContractEngine.quickStats(caps);
    expect(stats.total).toBe(3);
    expect(stats.full).toBe(1);
    expect(stats.dark).toBe(1);
    expect(stats.internal).toBe(1);
  });
});

// ── Live Census (integration) ────────────────────────────────

describe("CapabilityCensusEngine — Live Census", () => {

  it("scanEngines returns engine names from disk", () => {
    const engines = capabilityCensusEngine.scanEngines();
    expect(engines.length).toBeGreaterThan(100);
    expect(engines.some(e => e.includes("SpeedFeedOrchestrator"))).toBe(true);
  });

  it("scanDispatchers returns action mappings", () => {
    const { dispatcherCount, totalActions } = capabilityCensusEngine.scanDispatchers();
    expect(dispatcherCount).toBeGreaterThan(50);
    expect(totalActions).toBeGreaterThan(100);
  });

  it("scanTests returns test files", () => {
    const tests = capabilityCensusEngine.scanTests();
    expect(tests.length).toBeGreaterThan(50);
  });

  it("runLiveReport produces valid report", () => {
    const report = capabilityCensusEngine.runLiveReport();
    expect(report.total_engines).toBeGreaterThan(100);
    expect(report.total_dispatchers).toBeGreaterThan(50);
    expect(report.utilization_pct).toBeGreaterThanOrEqual(0);
    expect(report.utilization_pct).toBeLessThanOrEqual(100);
    expect(report.domain_breakdown.length).toBeGreaterThan(0);
    expect(report.wiring_summary.full + report.wiring_summary.partial + report.wiring_summary.dark + report.wiring_summary.internal).toBe(report.total_engines);
  });
});
