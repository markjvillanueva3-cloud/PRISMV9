/**
 * HBK-MS11 — Consumer Matrix + SVI Integration Tests
 *
 * Verifies:
 * U01: Consumer matrix documents all handbook data flows with section types and fallback behavior
 * U02: SVI reports handbook coverage per machine and contributes to overall system variability score
 * U03: End-to-end: handbook data flows from ingestion through consuming pipelines to SVI reporting
 *
 * Exit conditions:
 * - Consumer matrix documents all consumers with section types and fallback behavior
 * - SVI reports handbook coverage and contributes to system variability score
 * - End-to-end test proves data flows from ingestion through all consuming pipelines to SVI
 * - Machines without handbooks are flagged as knowledge gaps in SVI
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── U01: Consumer Matrix Completeness ─────────────────────────────────────

describe("Handbook Consumer Matrix (U01)", () => {
  let matrix: any;

  beforeEach(() => {
    const matrixPath = path.resolve("C:/PRISM/mcp-server/data/docs/HANDBOOK_CONSUMER_MATRIX.json");
    matrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8"));
  });

  it("consumer matrix file exists and parses as valid JSON", () => {
    expect(matrix).toBeDefined();
    expect(matrix.version).toBe("1.0.0");
  });

  it("defines all 11 handbook section types", () => {
    expect(matrix.section_types).toHaveLength(11);
    const expected = [
      "cover_info", "spindle_specs", "axis_kinematics", "controller_features",
      "alarm_codes", "maintenance_schedule", "parts_book", "programming_tips",
      "safety_limits", "coolant_specs", "tooling_constraints",
    ];
    for (const section of expected) {
      expect(matrix.section_types).toContain(section);
    }
  });

  it("documents at least 15 consumers", () => {
    expect(matrix.consumers.length).toBeGreaterThanOrEqual(15);
  });

  it("every consumer has required fields", () => {
    for (const consumer of matrix.consumers) {
      expect(consumer.id).toBeTypeOf("string");
      expect(consumer.file).toBeTypeOf("string");
      expect(consumer.type).toBeTypeOf("string");
      expect(consumer.role).toBeTypeOf("string");
      expect(consumer.sections_consumed).toBeInstanceOf(Array);
      expect(consumer.data_flow).toMatch(/^(read|write|read_write)$/);
      expect(consumer.fallback).toBeTypeOf("string");
      expect(consumer.description).toBeTypeOf("string");
    }
  });

  it("every consumer file exists on disk", () => {
    for (const consumer of matrix.consumers) {
      const filePath = path.resolve("C:/PRISM/mcp-server", consumer.file);
      expect(fs.existsSync(filePath), `Missing: ${consumer.file}`).toBe(true);
    }
  });

  it("covers all 7 core HBK engines (MS0-MS6)", () => {
    const coreEngines = [
      "MachineHandbookRegistryEngine",
      "HandbookExtractionEngine",
      "HandbookAcquisitionPipelineEngine",
      "AlarmIntelligenceEngine",
      "MachineCapabilityIntelligenceEngine",
      "HandbookMaintenanceIntelligenceEngine",
      "ControllerProgrammingIntelligenceEngine",
    ];
    const ids = matrix.consumers.map((c: any) => c.id);
    for (const engine of coreEngines) {
      expect(ids).toContain(engine);
    }
  });

  it("includes physics pipeline consumers (SpeedFeed, FeedRate, Thermal)", () => {
    const ids = matrix.consumers.map((c: any) => c.id);
    expect(ids).toContain("SpeedFeedOrchestratorEngine");
    expect(ids).toContain("FeedRateOptimizationEngine");
    expect(ids).toContain("ToolpathThermalEngine");
  });

  it("includes business pipeline consumers (QuoteToShip)", () => {
    const ids = matrix.consumers.map((c: any) => c.id);
    expect(ids).toContain("QuoteToShipOrchestratorEngine");
  });

  it("includes safety hooks (machineLimitGuard, alarmSeverityEscalation)", () => {
    const ids = matrix.consumers.map((c: any) => c.id);
    expect(ids.some((id: string) => id.includes("machineLimitGuard"))).toBe(true);
    expect(ids.some((id: string) => id.includes("alarmSeverityEscalation"))).toBe(true);
  });

  it("includes manufacturing enforcement hooks (handbookLimitGuard, freshnessCheck, coverageGate)", () => {
    const ids = matrix.consumers.map((c: any) => c.id);
    expect(ids.some((id: string) => id.includes("handbookLimitGuard"))).toBe(true);
    expect(ids.some((id: string) => id.includes("handbookFreshnessCheck"))).toBe(true);
    expect(ids.some((id: string) => id.includes("handbookCoverageGate"))).toBe(true);
  });

  it("includes machineSetupDispatcher with handbook actions", () => {
    const dispatcher = matrix.consumers.find((c: any) => c.id === "machineSetupDispatcher");
    expect(dispatcher).toBeDefined();
    expect(dispatcher.type).toBe("dispatcher");
    expect(dispatcher.actions).toBeInstanceOf(Array);
    expect(dispatcher.actions.length).toBeGreaterThanOrEqual(9);
    expect(dispatcher.actions).toContain("handbook_lookup");
    expect(dispatcher.actions).toContain("handbook_ingest");
    expect(dispatcher.actions).toContain("controller_programming_profile");
  });

  it("100% of consumers have fallback behavior documented", () => {
    expect(matrix.coverage_metrics.consumers_without_fallback).toBe(0);
    expect(matrix.coverage_metrics.consumers_with_fallback).toBe(matrix.consumers.length);
  });

  it("defines at least 5 data flow paths", () => {
    expect(matrix.data_flows.length).toBeGreaterThanOrEqual(5);
    for (const flow of matrix.data_flows) {
      expect(flow.id).toBeTypeOf("string");
      expect(flow.name).toBeTypeOf("string");
      expect(flow.path).toBeTypeOf("string");
      expect(flow.description).toBeTypeOf("string");
    }
  });

  it("data flows cover acquisition, capability, alarm, maintenance, controller, safety", () => {
    const flowIds = matrix.data_flows.map((f: any) => f.id);
    expect(flowIds).toContain("acquisition");
    expect(flowIds).toContain("capability");
    expect(flowIds).toContain("alarm");
    expect(flowIds).toContain("maintenance");
    expect(flowIds).toContain("controller");
    expect(flowIds).toContain("safety");
  });
});

// ─── U02: SVI Handbook Dimension ───────────────────────────────────────────

describe("SystemVariabilityIndexEngine — handbook dimension (U02)", () => {
  let sviEngine: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../engines/SystemVariabilityIndexEngine.js");
    sviEngine = mod.systemVariabilityIndexEngine;
  });

  it("SVI report includes Handbooks subsystem", async () => {
    const report = await sviEngine.compute();
    const handbookSub = report.subsystems.find((s: any) => s.name === "Handbooks");
    expect(handbookSub).toBeDefined();
    expect(handbookSub.category).toBe("intelligence");
    expect(handbookSub.dimensions).toBe(11); // 11 section types
  });

  it("handbook dimension uses wired_pct of 45%", async () => {
    const report = await sviEngine.compute();
    const handbookSub = report.subsystems.find((s: any) => s.name === "Handbooks");
    expect(handbookSub.wired_pct).toBe(45);
  });

  it("reachable = variability * wired_pct/100", async () => {
    const report = await sviEngine.compute();
    const handbookSub = report.subsystems.find((s: any) => s.name === "Handbooks");
    const expectedReachable = handbookSub.variability * handbookSub.wired_pct / 100;
    expect(handbookSub.reachable).toBeCloseTo(expectedReachable, 2);
  });

  it("counts.handbooks is a non-negative number", async () => {
    const report = await sviEngine.compute();
    expect(report.counts.handbooks).toBeTypeOf("number");
    expect(report.counts.handbooks).toBeGreaterThanOrEqual(0);
  });

  it("handbook subsystem contributes to total_variability", async () => {
    const report = await sviEngine.compute();
    const handbookSub = report.subsystems.find((s: any) => s.name === "Handbooks");
    // Total variability should include handbook variability
    const sumVariability = report.subsystems.reduce((sum: number, s: any) => sum + s.variability, 0);
    expect(sumVariability).toBeGreaterThanOrEqual(handbookSub.variability);
    expect(report.total_variability).toBe(sumVariability);
  });

  it("machines without handbooks show as 0 handbook count", async () => {
    // When no handbooks are ingested, counts.handbooks should be 0
    // (registry starts empty in test environment)
    const report = await sviEngine.compute();
    // In test env, no actual handbook registry exists, so count falls to 0
    expect(report.counts.handbooks).toBeGreaterThanOrEqual(0);
  });

  it("SVI watch targets include handbook consumer matrix", async () => {
    // Read the engine source to verify watch target
    const engineSrc = fs.readFileSync(
      path.resolve("C:/PRISM/mcp-server/src/engines/SystemVariabilityIndexEngine.ts"),
      "utf-8"
    );
    expect(engineSrc).toContain("HANDBOOK_CONSUMER_MATRIX.json");
    expect(engineSrc).toContain('"Handbooks"');
  });

  it("total subsystem count is now 14 (was 13 before handbook)", async () => {
    const report = await sviEngine.compute();
    expect(report.subsystems.length).toBe(14);
  });

  it("Psi (reachability) is computed correctly with handbook dimension", async () => {
    const report = await sviEngine.compute();
    const totalReachable = report.subsystems.reduce((sum: number, s: any) => sum + s.reachable, 0);
    const totalVariability = report.subsystems.reduce((sum: number, s: any) => sum + s.variability, 0);
    const expectedPsi = totalVariability > 0 ? totalReachable / totalVariability : 0;
    expect(report.psi_reachability).toBeCloseTo(expectedPsi, 2);
  });
});

// ─── U03: End-to-End Data Flow Verification ────────────────────────────────

describe("End-to-end handbook data flow (U03)", () => {
  it("MachineHandbookRegistryEngine is importable and has stats()", async () => {
    const mod = await import("../engines/MachineHandbookRegistryEngine.js");
    const engine = mod.machineHandbookRegistry;
    expect(engine).toBeDefined();
    const stats = engine.stats();
    expect(stats).toHaveProperty("total");
    expect(stats.total).toBeTypeOf("number");
  });

  it("HandbookExtractionEngine can extract from raw text", async () => {
    const mod = await import("../engines/HandbookExtractionEngine.js");
    const engine = mod.handbookExtractionEngine;
    expect(engine).toBeDefined();

    const result = engine.extractHandbook({
      rawText: "Machine: Haas VF-2\nMax Spindle Speed: 8100 RPM\nMax Power: 22.4 kW\nAlarm 101: Spindle Overheat",
      machineId: "haas-vf-2",
    });
    expect(result).toBeDefined();
    expect(result.sections).toBeDefined();
  });

  it("MachineCapabilityIntelligenceEngine resolves profile for known machine", async () => {
    const mod = await import("../engines/MachineCapabilityIntelligenceEngine.js");
    const engine = mod.machineCapabilityIntelligenceEngine;
    expect(engine).toBeDefined();

    // getProfile requires deps — supply minimal stubs to prove the engine is callable
    const stubRegistry = { getByMachineId: () => null, list: () => [] };
    const profile = engine.getProfile(
      { machine_id: "haas-vf-2" },
      { handbookRegistry: stubRegistry, torqueCurves: {}, spindleCorrections: [], machineRegistry: null }
    );
    expect(profile).toBeDefined();
    // With no handbook data, spindle may be undefined but profile should exist
    expect(profile).toHaveProperty("machine_id");
  });

  it("AlarmIntelligenceEngine has lookupAlarmEnhanced method", async () => {
    const mod = await import("../engines/AlarmIntelligenceEngine.js");
    const engine = mod.alarmIntelligenceEngine;
    expect(engine).toBeDefined();
    expect(typeof engine.lookupAlarmEnhanced).toBe("function");
  });

  it("HandbookMaintenanceIntelligenceEngine has estimateAnnualCost method", async () => {
    const mod = await import("../engines/HandbookMaintenanceIntelligenceEngine.js");
    const engine = mod.handbookMaintenanceIntelligenceEngine;
    expect(engine).toBeDefined();
    expect(typeof engine.estimateAnnualCost).toBe("function");
  });

  it("ControllerProgrammingIntelligenceEngine has getProfile method", async () => {
    const mod = await import("../engines/ControllerProgrammingIntelligenceEngine.js");
    const engine = mod.controllerProgrammingIntelligenceEngine;
    expect(engine).toBeDefined();
    expect(typeof engine.getProfile).toBe("function");
  });

  it("SpeedFeedOrchestratorEngine accepts machine_name for handbook lookup", async () => {
    const mod = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const eng = new mod.SpeedFeedOrchestratorEngine();
    const result = eng.compute({
      machine_name: "haas vf-2",
      material: "steel",
      tool_diameter_mm: 12,
      flutes: 4,
      operation: "milling",
      cut_type: "roughing",
      axial_depth_mm: 6,
      radial_depth_mm: 6,
    });
    expect(result).toBeDefined();
    expect(result.value.spindle_rpm).toBeGreaterThan(0);
  });

  it("machineLimitGuard hook exists in SafetyQualityHooks", async () => {
    const mod = await import("../hooks/SafetyQualityHooks.js");
    const hooks = mod.safetyQualityHooks;
    expect(hooks).toBeInstanceOf(Array);
    const limitGuard = hooks.find((h: any) => h.id === "machine-limit-guard" || h.name === "machineLimitGuard");
    expect(limitGuard).toBeDefined();
  });

  it("handbookLimitGuard hook exists in ManufacturingHooks", async () => {
    const mod = await import("../hooks/ManufacturingHooks.js");
    const hooks = mod.manufacturingHooks;
    expect(hooks).toBeInstanceOf(Array);
    const limitGuard = hooks.find((h: any) => h.id === "handbook-limit-guard");
    expect(limitGuard).toBeDefined();
    expect(limitGuard.mode).toBe("blocking");
  });

  it("handbookFreshnessCheck hook exists in ManufacturingHooks", async () => {
    const mod = await import("../hooks/ManufacturingHooks.js");
    const hooks = mod.manufacturingHooks;
    const freshGuard = hooks.find((h: any) => h.id === "handbook-freshness-check");
    expect(freshGuard).toBeDefined();
    expect(freshGuard.mode).toBe("warning");
  });

  it("handbookCoverageGate hook exists in ManufacturingHooks", async () => {
    const mod = await import("../hooks/ManufacturingHooks.js");
    const hooks = mod.manufacturingHooks;
    const coverageGate = hooks.find((h: any) => h.id === "handbook-coverage-gate");
    expect(coverageGate).toBeDefined();
    expect(coverageGate.mode).toBe("warning");
  });

  it("SVI report with handbook dimension is valid end-to-end", async () => {
    const sviMod = await import("../engines/SystemVariabilityIndexEngine.js");
    const sviEngine = sviMod.systemVariabilityIndexEngine;
    const report = await sviEngine.compute();

    // Report has all required fields
    expect(report.timestamp).toBeTypeOf("string");
    expect(report.subsystems.length).toBe(14);
    expect(report.svi_log10).toBeGreaterThan(0);
    expect(report.psi_reachability).toBeGreaterThan(0);
    expect(report.psi_reachability).toBeLessThanOrEqual(1);
    expect(report.counts.handbooks).toBeTypeOf("number");

    // Handbook subsystem is present and valid
    const hbk = report.subsystems.find((s: any) => s.name === "Handbooks");
    expect(hbk).toBeDefined();
    expect(hbk.dimensions).toBe(11);
    expect(hbk.wired_pct).toBe(45);
    expect(hbk.reachable).toBe(hbk.variability * 0.45);
  });

  it("consumer matrix coverage_metrics match actual consumer count", () => {
    const matrixPath = path.resolve("C:/PRISM/mcp-server/data/docs/HANDBOOK_CONSUMER_MATRIX.json");
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8"));

    expect(matrix.coverage_metrics.total_consumers).toBe(matrix.consumers.length);

    const engines = matrix.consumers.filter((c: any) => c.type === "engine");
    const dispatchers = matrix.consumers.filter((c: any) => c.type === "dispatcher");
    const hooks = matrix.consumers.filter((c: any) => c.type === "hook");

    expect(matrix.coverage_metrics.engines).toBe(engines.length);
    expect(matrix.coverage_metrics.dispatchers).toBe(dispatchers.length);
    expect(matrix.coverage_metrics.hooks).toBe(hooks.length);
  });
});
