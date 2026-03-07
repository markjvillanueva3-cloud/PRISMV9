/**
 * Tests for previously untested engines (gap fill):
 * AdditiveQuote, BlueprintToQuoteBridge, DecisionTree,
 * MachineRateDatabase, PostProcessorFeedOptimizer,
 * SheetMetalQuote, MachineConnectivity, InferenceChain
 */
import { describe, it, expect } from "vitest";
import { additiveQuoteEngine } from "../engines/AdditiveQuoteEngine.js";
import { blueprintToQuoteBridgeEngine } from "../engines/BlueprintToQuoteBridgeEngine.js";
import {
  selectToolType,
  selectInsertGrade,
  selectCoolantStrategy,
  selectWorkholding,
  selectStrategy,
  selectApproachRetract,
} from "../engines/DecisionTreeEngine.js";
import { machineRateDatabaseEngine } from "../engines/MachineRateDatabaseEngine.js";
import { postProcessorFeedOptimizer } from "../engines/PostProcessorFeedOptimizerEngine.js";
import { sheetMetalQuoteEngine } from "../engines/SheetMetalQuoteEngine.js";

// ── Additive Quote ──────────────────────────────────────────
describe("AdditiveQuoteEngine", () => {
  const baseInput = {
    part_name: "Test Bracket",
    quantity: 10,
    bounding_box_mm: { x: 50, y: 40, z: 30 },
    part_volume_cm3: 25,
    technology: "fdm" as const,
    material: "PLA",
  };

  it("generates additive manufacturing quote", () => {
    const r = additiveQuoteEngine.quote(baseInput);
    expect(r.pricing.unit_price).toBeGreaterThan(0);
    expect(r.pricing.total_price).toBeGreaterThan(0);
    expect(r.lead_time.total_standard_days).toBeGreaterThan(0);
    expect(r.costs.machine_time.build_hours).toBeGreaterThan(0);
  });

  it("lists materials for technology", () => {
    const mats = additiveQuoteEngine.listMaterials("fdm");
    expect(Array.isArray(mats)).toBe(true);
    expect(mats.length).toBeGreaterThan(0);
    expect(mats[0].id).toBeDefined();
    expect(mats[0].price_per_cm3).toBeGreaterThan(0);
  });

  it("compares technologies", () => {
    const base = {
      quantity: 5,
      bounding_box_mm: { x: 50, y: 40, z: 30 },
      part_volume_cm3: 20,
    };
    const r = additiveQuoteEngine.compareTechnologies(base, [
      { technology: "fdm", material: "PLA" },
      { technology: "sla", material: "standard_resin" },
    ]);
    expect(r.length).toBe(2);
    expect(r[0]!.unit_price).toBeGreaterThan(0);
    expect(r[1]!.unit_price).toBeGreaterThan(0);
  });

  it("higher quantity = lower unit price", () => {
    const single = additiveQuoteEngine.quote({ ...baseInput, quantity: 1 });
    const batch = additiveQuoteEngine.quote({ ...baseInput, quantity: 50 });
    expect(batch.pricing.unit_price).toBeLessThanOrEqual(single.pricing.unit_price);
  });
});

// ── Blueprint to Quote Bridge ───────────────────────────────
describe("BlueprintToQuoteBridgeEngine", () => {
  it("resolves common material names", () => {
    expect(blueprintToQuoteBridgeEngine.resolveMaterial("6061-T6")).toBeDefined();
    expect(blueprintToQuoteBridgeEngine.resolveMaterial("304 SS")).toBeDefined();
    expect(blueprintToQuoteBridgeEngine.resolveMaterial("4140")).toBeDefined();
  });

  it("returns null for unknown material", () => {
    const r = blueprintToQuoteBridgeEngine.resolveMaterial("unobtanium_999");
    expect(r).toBeNull();
  });

  it("bridges blueprint analysis to quote input", () => {
    const analysis = {
      bounding_box: { length: 100, width: 50, height: 25, unit: "mm" },
      title_block: { material: "AL 6061-T6" },
      dimensions: [
        { type: "diameter", value: 6, unit: "mm", text: "Ø6" },
        { type: "diameter", value: 6, unit: "mm", text: "Ø6" },
        { type: "diameter", value: 8, unit: "mm", text: "Ø8" },
        { type: "diameter", value: 8, unit: "mm", text: "Ø8" },
      ],
    };
    const r = blueprintToQuoteBridgeEngine.bridge(analysis);
    expect(r).toBeDefined();
    expect(r.extraction_confidence).toBeGreaterThanOrEqual(0);
  });
});

// ── Decision Tree ───────────────────────────────────────────
describe("DecisionTreeEngine", () => {
  it("selects tool type for material and operation", () => {
    const r = selectToolType({ material: "steel", operation: "roughing" });
    expect(r).toBeDefined();
    expect(r.tool_type).toBeDefined();
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("selects insert grade", () => {
    const r = selectInsertGrade({ material: "steel", hardness_hrc: 30, operation: "continuous" });
    expect(r).toBeDefined();
    expect(r.grade).toBeDefined();
  });

  it("selects coolant strategy", () => {
    const r = selectCoolantStrategy({ material: "aluminum", cutting_speed_m_min: 300, operation: "milling" });
    expect(r).toBeDefined();
    expect(r.strategy).toBeDefined();
  });

  it("selects workholding", () => {
    const r = selectWorkholding({
      part_geometry: "prismatic",
      cutting_force_n: 2000,
      length_mm: 100,
    });
    expect(r).toBeDefined();
  });

  it("selects toolpath strategy", () => {
    const r = selectStrategy({ feature: "pocket", material: "steel", depth_mm: 10, width_mm: 50 });
    expect(r).toBeDefined();
    expect(r.strategy).toBeDefined();
  });

  it("selects approach/retract method", () => {
    const r = selectApproachRetract({ operation: "pocket", material: "steel" });
    expect(r).toBeDefined();
  });
});

// ── Machine Rate Database ───────────────────────────────────
describe("MachineRateDatabaseEngine", () => {
  it("lists all machines", () => {
    const machines = machineRateDatabaseEngine.listMachines();
    expect(Array.isArray(machines)).toBe(true);
    expect(machines.length).toBeGreaterThan(0);
    expect(machines[0].hourly_rate).toBeGreaterThan(0);
  });

  it("gets rate for a machine", () => {
    const machines = machineRateDatabaseEngine.listMachines();
    if (machines.length > 0) {
      const r = machineRateDatabaseEngine.getRate(machines[0].id);
      expect(r).not.toBeNull();
      expect(r!.hourly_rate).toBeGreaterThan(0);
    }
  });

  it("lists machine families", () => {
    const families = machineRateDatabaseEngine.getFamilies();
    expect(families.length).toBeGreaterThan(0);
  });

  it("filters by family", () => {
    const families = machineRateDatabaseEngine.getFamilies();
    if (families.length > 0) {
      const filtered = machineRateDatabaseEngine.listMachines(families[0]);
      expect(filtered.every(m => m.family === families[0])).toBe(true);
    }
  });

  it("compares machines", () => {
    const machines = machineRateDatabaseEngine.listMachines();
    if (machines.length >= 2) {
      const r = machineRateDatabaseEngine.compareMachines([machines[0].id, machines[1].id]);
      expect(r).toBeDefined();
    }
  });

  it("gets effective rate with OEE", () => {
    const machines = machineRateDatabaseEngine.listMachines();
    if (machines.length > 0) {
      const typical = machineRateDatabaseEngine.getEffectiveRate(machines[0].id, "typical");
      const poor = machineRateDatabaseEngine.getEffectiveRate(machines[0].id, "poor");
      expect(typical).toBeGreaterThan(0);
      expect(poor).toBeGreaterThan(typical); // poor OEE = higher effective rate
    }
  });
});

// ── Post Processor Feed Optimizer ───────────────────────────
describe("PostProcessorFeedOptimizerEngine", () => {
  const gcode = [
    "G90 G54",
    "S8000 M3",
    "G0 X0 Y0 Z5",
    "G1 Z-5 F200",
    "G1 X50 F1000",
    "G1 Y30 F1000",
    "G1 X0 F1000",
    "G1 Y0 F1000",
    "G0 Z50",
    "M30",
  ].join("\n");

  const config = {
    toolDiameter_mm: 10,
    toolFlutes: 3,
    radialDepth_mm: 5,
    axialDepth_mm: 5,
    material: "P" as const,
    spindleRPM: 8000,
    nominalFeed_mmmin: 1000,
  };

  it("analyzes feed optimization opportunities", () => {
    const r = postProcessorFeedOptimizer.analyze(gcode, config);
    expect(r).toBeDefined();
    expect(r.opportunities).toBeGreaterThanOrEqual(0);
  });

  it("optimizes feed rates in G-code", () => {
    const r = postProcessorFeedOptimizer.optimize(gcode, config);
    expect(r).toBeDefined();
    expect(r.lines).toBeDefined();
  });
});

// ── Sheet Metal Quote ───────────────────────────────────────
describe("SheetMetalQuoteEngine", () => {
  const input = {
    quantity: 25,
    material: "mild_steel",
    thickness_mm: 2,
    flat_length_mm: 200,
    flat_width_mm: 100,
    perimeter_mm: 600,
    num_bends: 4,
    max_bend_length_mm: 100,
  };

  it("generates sheet metal quote", () => {
    const r = sheetMetalQuoteEngine.quote(input);
    expect(r.pricing.unit_price).toBeGreaterThan(0);
    expect(r.pricing.total_price).toBeGreaterThan(0);
    expect(r.lead_time.total_standard_days).toBeGreaterThan(0);
  });

  it("thicker material = higher price", () => {
    const thin = sheetMetalQuoteEngine.quote({ ...input, thickness_mm: 1 });
    const thick = sheetMetalQuoteEngine.quote({ ...input, thickness_mm: 6 });
    expect(thick.pricing.unit_price).toBeGreaterThan(thin.pricing.unit_price);
  });

  it("more bends = higher price", () => {
    const few = sheetMetalQuoteEngine.quote({ ...input, num_bends: 1 });
    const many = sheetMetalQuoteEngine.quote({ ...input, num_bends: 10 });
    expect(many.pricing.unit_price).toBeGreaterThan(few.pricing.unit_price);
  });

  it("higher quantity = lower unit price", () => {
    const single = sheetMetalQuoteEngine.quote({ ...input, quantity: 1 });
    const batch = sheetMetalQuoteEngine.quote({ ...input, quantity: 100 });
    expect(batch.pricing.unit_price).toBeLessThanOrEqual(single.pricing.unit_price);
  });
});

// ── Machine Connectivity ────────────────────────────────────
describe("MachineConnectivityEngine", () => {
  // Import functions directly since there's no singleton
  let mc: any;

  it("imports and has core functions", async () => {
    mc = await import("../engines/MachineConnectivityEngine.js");
    expect(mc.registerMachine).toBeDefined();
    expect(mc.listMachines).toBeDefined();
    expect(mc.connectMachine).toBeDefined();
  });

  it("registers and lists machines", async () => {
    mc = await import("../engines/MachineConnectivityEngine.js");
    mc.registerMachine({
      id: "TEST-MC-001",
      name: "Test VMC",
      type: "vmc",
      protocol: "mock",
      host: "localhost",
      port: 5000,
    });
    const machines = mc.listMachines();
    const found = machines.find((m: any) => m.id === "TEST-MC-001");
    expect(found).toBeDefined();
    expect(found.name).toBe("Test VMC");
    // Cleanup
    mc.unregisterMachine("TEST-MC-001");
  });

  it("connects to mock machine", async () => {
    mc = await import("../engines/MachineConnectivityEngine.js");
    mc.registerMachine({
      id: "TEST-MC-002",
      name: "Mock Mill",
      type: "vmc",
      protocol: "mock",
      host: "localhost",
      port: 5000,
    });
    const r = mc.connectMachine("TEST-MC-002");
    expect(r.connected).toBeDefined();
    // Cleanup
    mc.disconnectMachine("TEST-MC-002");
    mc.unregisterMachine("TEST-MC-002");
  });
});

// ── Inference Chain (async — basic structure test) ──────────
describe("InferenceChainEngine", () => {
  it("imports and has expected functions", async () => {
    const mod = await import("../engines/InferenceChainEngine.js");
    expect(mod.listChainTypes).toBeDefined();
  });

  it("lists chain types", async () => {
    const mod = await import("../engines/InferenceChainEngine.js");
    const types = mod.listChainTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
  });
});
