/**
 * CK-MS13 U02 — Runtime export validation
 * Verifies every CK-track engine can be imported and instantiated.
 * Uses per-engine static dynamic imports to avoid barrel cascade.
 */

import { describe, it, expect } from "vitest";

// ─── Class constructor tests ─────────────────────────────────────────────────

describe("CK-MS13 Exports: class constructors", () => {
  it("UnifiedCAMPipelineEngine", async () => {
    const { UnifiedCAMPipelineEngine } = await import("../engines/UnifiedCAMPipelineEngine.js");
    expect(typeof UnifiedCAMPipelineEngine).toBe("function");
    expect(new UnifiedCAMPipelineEngine()).toBeDefined();
  });
  it("ScalableCAMOrchestratorEngine", async () => {
    const { ScalableCAMOrchestratorEngine } = await import("../engines/ScalableCAMOrchestratorEngine.js");
    expect(typeof ScalableCAMOrchestratorEngine).toBe("function");
    expect(new ScalableCAMOrchestratorEngine()).toBeDefined();
  });
  it("ProductionToolpathEngine", async () => {
    const { ProductionToolpathEngine } = await import("../engines/ProductionToolpathEngine.js");
    expect(typeof ProductionToolpathEngine).toBe("function");
    expect(new ProductionToolpathEngine()).toBeDefined();
  });
  it("MultiProcessCAMBridgeEngine", async () => {
    const { MultiProcessCAMBridgeEngine } = await import("../engines/MultiProcessCAMBridgeEngine.js");
    expect(typeof MultiProcessCAMBridgeEngine).toBe("function");
    expect(new MultiProcessCAMBridgeEngine()).toBeDefined();
  });
  it("MillTurnCAMEngine", async () => {
    const { MillTurnCAMEngine } = await import("../engines/MillTurnCAMEngine.js");
    expect(typeof MillTurnCAMEngine).toBe("function");
    expect(new MillTurnCAMEngine()).toBeDefined();
  });
  it("FiveAxisCAMIntegrationEngine", async () => {
    const { FiveAxisCAMIntegrationEngine } = await import("../engines/FiveAxisCAMIntegrationEngine.js");
    expect(typeof FiveAxisCAMIntegrationEngine).toBe("function");
    expect(new FiveAxisCAMIntegrationEngine()).toBeDefined();
  });
  it("AdvancedMillingStrategiesEngine", async () => {
    const { AdvancedMillingStrategiesEngine } = await import("../engines/AdvancedMillingStrategiesEngine.js");
    expect(typeof AdvancedMillingStrategiesEngine).toBe("function");
    expect(new AdvancedMillingStrategiesEngine()).toBeDefined();
  });
  it("SmartToolSelectorEngine", async () => {
    const { SmartToolSelectorEngine } = await import("../engines/SmartToolSelectorEngine.js");
    expect(typeof SmartToolSelectorEngine).toBe("function");
    expect(new SmartToolSelectorEngine()).toBeDefined();
  });
  it("IntegratedVerificationEngine", async () => {
    const { IntegratedVerificationEngine } = await import("../engines/IntegratedVerificationEngine.js");
    expect(typeof IntegratedVerificationEngine).toBe("function");
    expect(new IntegratedVerificationEngine()).toBeDefined();
  });
  it("IntelligentSequencingEngine", async () => {
    const { IntelligentSequencingEngine } = await import("../engines/IntelligentSequencingEngine.js");
    expect(typeof IntelligentSequencingEngine).toBe("function");
    expect(new IntelligentSequencingEngine()).toBeDefined();
  });
  // CK-MS3
  it("EDMProgramAssemblerEngine", async () => {
    const { EDMProgramAssemblerEngine } = await import("../engines/EDMProgramAssemblerEngine.js");
    expect(typeof EDMProgramAssemblerEngine).toBe("function");
    expect(new EDMProgramAssemblerEngine()).toBeDefined();
  });
  it("GrindingProgramAssemblerEngine", async () => {
    const { GrindingProgramAssemblerEngine } = await import("../engines/GrindingProgramAssemblerEngine.js");
    expect(typeof GrindingProgramAssemblerEngine).toBe("function");
    expect(new GrindingProgramAssemblerEngine()).toBeDefined();
  });
  it("LaserProgramAssemblerEngine", async () => {
    const { LaserProgramAssemblerEngine } = await import("../engines/LaserProgramAssemblerEngine.js");
    expect(typeof LaserProgramAssemblerEngine).toBe("function");
    expect(new LaserProgramAssemblerEngine()).toBeDefined();
  });
  it("WaterjetProgramAssemblerEngine", async () => {
    const { WaterjetProgramAssemblerEngine } = await import("../engines/WaterjetProgramAssemblerEngine.js");
    expect(typeof WaterjetProgramAssemblerEngine).toBe("function");
    expect(new WaterjetProgramAssemblerEngine()).toBeDefined();
  });
  it("MultiProcessCAMRouterEngine", async () => {
    const { MultiProcessCAMRouterEngine } = await import("../engines/MultiProcessCAMRouterEngine.js");
    expect(typeof MultiProcessCAMRouterEngine).toBe("function");
    expect(new MultiProcessCAMRouterEngine()).toBeDefined();
  });
  // CK-MS8
  it("SelfLearningCAMEngine", async () => {
    const { SelfLearningCAMEngine } = await import("../engines/SelfLearningCAMEngine.js");
    expect(typeof SelfLearningCAMEngine).toBe("function");
    expect(new SelfLearningCAMEngine()).toBeDefined();
  });
  // CK-MS10
  it("TurningProfileEngine", async () => {
    const { TurningProfileEngine } = await import("../engines/TurningProfileEngine.js");
    expect(typeof TurningProfileEngine).toBe("function");
    expect(new TurningProfileEngine()).toBeDefined();
  });
  it("SheetNestingEngine", async () => {
    const { SheetNestingEngine } = await import("../engines/SheetNestingEngine.js");
    expect(typeof SheetNestingEngine).toBe("function");
    expect(new SheetNestingEngine()).toBeDefined();
  });
  it("DXFParserEngine", async () => {
    const { DXFParserEngine } = await import("../engines/DXFParserEngine.js");
    expect(typeof DXFParserEngine).toBe("function");
    expect(new DXFParserEngine()).toBeDefined();
  });
  // CK-MS11
  it("StochasticRoutingEngine", async () => {
    const { StochasticRoutingEngine } = await import("../engines/StochasticRoutingEngine.js");
    expect(typeof StochasticRoutingEngine).toBe("function");
    expect(new StochasticRoutingEngine()).toBeDefined();
  });
  it("ProbingProgramEngine", async () => {
    const { ProbingProgramEngine } = await import("../engines/ProbingProgramEngine.js");
    expect(typeof ProbingProgramEngine).toBe("function");
    expect(new ProbingProgramEngine()).toBeDefined();
  });
  it("DFMFeedbackEngine", async () => {
    const { DFMFeedbackEngine } = await import("../engines/DFMFeedbackEngine.js");
    expect(typeof DFMFeedbackEngine).toBe("function");
    expect(new DFMFeedbackEngine()).toBeDefined();
  });
  // CK-MS12
  it("NLPCAMParserEngine", async () => {
    const { NLPCAMParserEngine } = await import("../engines/NLPCAMParserEngine.js");
    expect(typeof NLPCAMParserEngine).toBe("function");
    expect(new NLPCAMParserEngine()).toBeDefined();
  });
  it("ProgramCompareEngine", async () => {
    const { ProgramCompareEngine } = await import("../engines/ProgramCompareEngine.js");
    expect(typeof ProgramCompareEngine).toBe("function");
    expect(new ProgramCompareEngine()).toBeDefined();
  });
  it("CAMResultCacheEngine", async () => {
    const { CAMResultCacheEngine } = await import("../engines/CAMResultCacheEngine.js");
    expect(typeof CAMResultCacheEngine).toBe("function");
    expect(new CAMResultCacheEngine()).toBeDefined();
  });
  it("BatchCAMEngine", async () => {
    const { BatchCAMEngine } = await import("../engines/BatchCAMEngine.js");
    expect(typeof BatchCAMEngine).toBe("function");
    expect(new BatchCAMEngine()).toBeDefined();
  });
});

// ─── Bridge exports ──────────────────────────────────────────────────────────

describe("CK-MS13 Exports: CAMKernelDispatcherBridge", () => {
  it("exports dispatchCAMAction and listCAMActions", async () => {
    const mod = await import("../engines/CAMKernelDispatcherBridge.js");
    expect(typeof mod.dispatchCAMAction).toBe("function");
    expect(typeof mod.listCAMActions).toBe("function");
    expect(mod.camKernelDispatcherBridge).toBeDefined();
  });
  it("listCAMActions returns 11+ actions", async () => {
    const { listCAMActions } = await import("../engines/CAMKernelDispatcherBridge.js");
    const actions = listCAMActions();
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThanOrEqual(11);
    const names = actions.map((a: any) => a.action);
    expect(names).toContain("cam_unified_generate");
    expect(names).toContain("cam_production_toolpath");
  });
});

// ─── stats() method spot-checks ──────────────────────────────────────────────

describe("CK-MS13 Exports: stats() methods", () => {
  it("EDMProgramAssemblerEngine.stats()", async () => {
    const { EDMProgramAssemblerEngine } = await import("../engines/EDMProgramAssemblerEngine.js");
    const s = new EDMProgramAssemblerEngine().stats();
    expect(s.engineName).toBe("EDMProgramAssemblerEngine");
    expect(s.methods.length).toBeGreaterThan(0);
  });
  it("MultiProcessCAMRouterEngine.stats()", async () => {
    const { MultiProcessCAMRouterEngine } = await import("../engines/MultiProcessCAMRouterEngine.js");
    const s = new MultiProcessCAMRouterEngine().stats();
    expect(s.engineName).toBe("MultiProcessCAMRouterEngine");
    expect(s.methods.length).toBeGreaterThan(0);
  });
  it("DFMFeedbackEngine instantiates with analyze method", async () => {
    const { DFMFeedbackEngine } = await import("../engines/DFMFeedbackEngine.js");
    const eng = new DFMFeedbackEngine();
    expect(typeof eng.analyze).toBe("function");
  });
  it("BatchCAMEngine instantiates with batchGenerate method", async () => {
    const { BatchCAMEngine } = await import("../engines/BatchCAMEngine.js");
    const eng = new BatchCAMEngine();
    expect(typeof eng.batchGenerate).toBe("function");
  });
});
