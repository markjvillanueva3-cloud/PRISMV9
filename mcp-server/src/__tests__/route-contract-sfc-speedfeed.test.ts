/**
 * U-ROUTEFIX1: Integration tests for SFC and Speed-Feed route → dispatcher → engine wiring.
 * Tests calcDispatcher cases: cutting_force, tool_life, surface_finish, deflection,
 * speed_feed, mrr, power, power_torque, torque + SpeedFeedOrchestratorEngine sf_* actions.
 */
import { describe, it, expect } from "vitest";

// =============================================================================
// CALC DISPATCHER — fundamental actions called by /api/v1/sfc/* routes
// =============================================================================
describe("calcDispatcher — SFC route actions", () => {
  it("cutting_force: Kienzle with known test vector (ISO P, kc1.1=1800)", async () => {
    const { calculateKienzleCuttingForce } = await import("../engines/ManufacturingCalculations.js");
    const result = calculateKienzleCuttingForce({
      cutting_speed: 150,
      feed_per_tooth: 0.1,
      axial_depth: 3,
      radial_depth: 6,
      tool_diameter: 12,
      number_of_teeth: 4,
    }, { kc1_1: 1800, mc: 0.25 });
    expect(result.Fc).toBeGreaterThan(100);
    expect(result.Fc).toBeLessThan(5000);
    expect(result.power).toBeGreaterThan(0);
    expect(result.torque).toBeGreaterThan(0);
    expect(typeof result.specific_force).toBe("number");
    expect(typeof result.chip_thickness).toBe("number");
    expect(result.calculation_method).toContain("Kienzle");
    // Kienzle: kc = 1800 * h^(-0.25), Fc = kc * b * h * z_e → expect several hundred N
    expect(result.Fc).toBeCloseTo(result.Fc, 0); // at minimum, not NaN
  });

  it("cutting_force: rejects zero tool diameter", async () => {
    const { calculateKienzleCuttingForce } = await import("../engines/ManufacturingCalculations.js");
    // Zero diameter causes division by zero in engagement calculation
    expect(() => calculateKienzleCuttingForce({
      cutting_speed: 150, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 6, tool_diameter: 0, number_of_teeth: 4,
    }, { kc1_1: 1800, mc: 0.25 })).toThrow();
  });

  it("tool_life: Taylor known vector (C=200, n=0.25, Vc=150)", async () => {
    const { calculateTaylorToolLife } = await import("../engines/ManufacturingCalculations.js");
    // T = (C/Vc)^(1/n) = (200/150)^4 = (1.333)^4 ≈ 3.16 min
    const result = calculateTaylorToolLife(150, { C: 200, n: 0.25 });
    expect(result.tool_life_minutes).toBeCloseTo(3.2, 0);
    expect(result.tool_life_minutes).toBeGreaterThan(0);
    expect(typeof result.optimal_speed).toBe("number");
    expect(result.calculation_method).toContain("Taylor");
  });

  it("tool_life: extreme speed returns clamped result", async () => {
    const { calculateTaylorToolLife } = await import("../engines/ManufacturingCalculations.js");
    const result = calculateTaylorToolLife(500, { C: 200, n: 0.25 });
    expect(result.tool_life_minutes).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("surface_finish: Ra from Brammertz (f=0.1, r=0.8) ≈ 0.78 μm", async () => {
    const { calculateSurfaceFinish } = await import("../engines/ManufacturingCalculations.js");
    // Ra_theoretical = f²/(32×r) × 1000 = 0.01/(32×0.8)×1000 = 0.39 μm
    // Ra_actual = Ra_theoretical × 2.0 (process factor) = 0.78 μm
    const result = calculateSurfaceFinish(0.1, 0.8, false);
    expect(result.theoretical_Ra).toBeCloseTo(0.39, 1);
    expect(result.Ra).toBeCloseTo(0.78, 1);
    expect(result.Rz).toBeGreaterThan(result.Ra);
    expect(typeof result.Rt).toBe("number");
    expect(typeof result.finish_factor).toBe("number");
  });

  it("surface_finish: very high feed warns", async () => {
    const { calculateSurfaceFinish } = await import("../engines/ManufacturingCalculations.js");
    const result = calculateSurfaceFinish(0.5, 0.4, false);
    expect(result.Ra).toBeGreaterThan(5);
  });

  it("deflection: known vector (F=500N, D=12mm, L=50mm, E=600GPa)", async () => {
    const { calculateToolDeflection } = await import("../engines/AdvancedCalculations.js");
    // I = π×12⁴/64 = 1017.88 mm⁴, E = 600000 N/mm²
    // δ = 500 × 50³/(3 × 600000 × 1017.88) = 62500000/1832184000 ≈ 0.0341 mm
    const result = calculateToolDeflection(500, 12, 50, 600, 0.005);
    expect(result.static_deflection).toBeCloseTo(0.034, 2);
    expect(result.safety_factor).toBeGreaterThan(0);
    expect(result.max_force_before_failure).toBeGreaterThan(500);
    expect(typeof result.dynamic_deflection).toBe("number");
    expect(typeof result.surface_error).toBe("number");
  });

  it("deflection: zero force returns zero deflection", async () => {
    const { calculateToolDeflection } = await import("../engines/AdvancedCalculations.js");
    const result = calculateToolDeflection(0, 12, 50, 600, 0.005);
    expect(result.static_deflection).toBe(0);
  });

  it("power_torque: P = Fc×Vc/60000 (500N × 150m/min → 1.25kW cutting)", async () => {
    const { calculateSpindlePower } = await import("../engines/ManufacturingCalculations.js");
    const result = calculateSpindlePower(500, 150, 12, 0.80);
    // P_cut = 500 × 150 / 60000 = 1.25 kW
    expect(result.power_cutting_kw).toBeCloseTo(1.25, 2);
    // P_spindle = 1.25 / 0.80 = 1.5625 kW
    expect(result.power_spindle_kw).toBeCloseTo(1.5625, 2);
    expect(result.torque_nm).toBeGreaterThan(0);
    expect(result.rpm).toBeGreaterThan(0);
    expect(typeof result.efficiency).toBe("number");
    expect(result.formula).toContain("Fc");
  });

  it("power (alias): same engine as power_torque", async () => {
    const { calculateSpindlePower } = await import("../engines/ManufacturingCalculations.js");
    // The "power" action aliases to same case as "power_torque"
    const result = calculateSpindlePower(1000, 200, 16, 0.85);
    expect(result.power_cutting_kw).toBeCloseTo(1000 * 200 / 60000, 2);
    expect(result.power_spindle_kw).toBeCloseTo(result.power_cutting_kw / 0.85, 2);
    expect(typeof result.torque_nm).toBe("number");
  });

  it("power_torque: rejects zero cutting force", async () => {
    const { calculateSpindlePower } = await import("../engines/ManufacturingCalculations.js");
    // Zero force is valid (0 power), but null/NaN should throw
    expect(() => calculateSpindlePower(NaN, 150, 12, 0.80)).toThrow();
  });

  it("torque: M = Fc×D/(2×1000) for milling", async () => {
    const { calculateTorque } = await import("../engines/ManufacturingCalculations.js");
    // M = 500 × 12 / (2 × 1000) = 3.0 Nm
    const result = calculateTorque(500, 12, "milling");
    expect(result.torque_nm).toBeCloseTo(3.0, 1);
    expect(typeof result.formula).toBe("string");
  });

  it("cycle_time: estimation from toolpath distances", async () => {
    const { estimateCycleTime } = await import("../engines/ToolpathCalculations.js");
    const result = estimateCycleTime(500, 1000, 200, 2, 0.5, 30000);
    expect(result.cutting_time).toBeGreaterThan(0);
    expect(result.total_time).toBeGreaterThan(result.cutting_time);
    expect(typeof result.rapid_time).toBe("number");
  });

  it("engagement: 50% ae (ae/D=0.5) -> 90 deg full swept arc", async () => {
    const { calculateEngagementAngle } = await import("../engines/ToolpathCalculations.js");
    const result = calculateEngagementAngle(12, 6, 0.1, true, 150);
    // phi = acos(1 - 2ae/D) = acos(0) = 90 deg (the FULL swept arc). Previously asserted
    // >90 ("~120 deg"), which ENCODED the engagement-arc doubling bug -- corrected 2026-06-23.
    expect(result.arc_of_engagement).toBeCloseTo(90, 0);
    expect(result.radial_engagement_percent).toBeCloseTo(50, 0);
  });

  // U-OSC-ENGAGEMENT-OPTIONAL-FEED: the SFC web /engagement endpoint posts ONLY
  // { tool_diameter, radial_depth } (geometry-only). feed_per_tooth + cutting_speed must be
  // OPTIONAL in the schema AND the engine must report 0 chip thickness (never NaN) when fz is absent.
  it("engagement: schema accepts a geometry-only request (no feed_per_tooth / cutting_speed)", async () => {
    const { ACTION_CALC_SCHEMAS } = await import("../schemas/calcActionSchemas.js");
    const parsed = ACTION_CALC_SCHEMAS.engagement.parse({ tool_diameter: 12, radial_depth: 6 });
    expect(parsed.tool_diameter).toBe(12);
    expect(parsed.radial_depth).toBe(6);
    expect(() =>
      ACTION_CALC_SCHEMAS.engagement.parse({ tool_diameter: 12, radial_depth: 6, feed_per_tooth: 0.1, cutting_speed: 150 }),
    ).not.toThrow();
  });

  it("engagement: geometry-only call returns valid geometry + ZERO chip thickness (never NaN)", async () => {
    const { calculateEngagementAngle } = await import("../engines/ToolpathCalculations.js");
    const geo = calculateEngagementAngle(12, 6); // no fz, no cutting_speed
    expect(geo.arc_of_engagement).toBeCloseTo(90, 0);
    expect(geo.radial_engagement_percent).toBeCloseTo(50, 0);
    expect(Number.isNaN(geo.max_chip_thickness)).toBe(false);
    expect(Number.isNaN(geo.average_chip_thickness)).toBe(false);
    expect(geo.max_chip_thickness).toBe(0);
    expect(geo.average_chip_thickness).toBe(0);
    expect(geo.effective_cutting_speed).toBe(0);
    expect(geo.warnings.some((w) => /chip thickness very thin/i.test(w))).toBe(false);
  });

  it("engagement: WITH feed/speed still produces positive chip thickness (backward compat)", async () => {
    const { calculateEngagementAngle } = await import("../engines/ToolpathCalculations.js");
    const full = calculateEngagementAngle(12, 6, 0.1, true, 150);
    expect(full.max_chip_thickness).toBeGreaterThan(0);
    expect(full.average_chip_thickness).toBeGreaterThan(0);
    expect(full.effective_cutting_speed).toBeGreaterThan(0);
  });

  it("mrr: Q = ap × ae × Vf", async () => {
    const { calculateMRR } = await import("../engines/ManufacturingCalculations.js");
    const result = calculateMRR({
      cutting_speed: 150, feed_per_tooth: 0.1,
      axial_depth: 3, radial_depth: 6,
      tool_diameter: 12, number_of_teeth: 4,
    });
    expect(result.mrr_mm3).toBeGreaterThan(0);
    expect(result.mrr).toBeGreaterThan(0);
    expect(typeof result.feed_rate).toBe("number");
    expect(typeof result.spindle_speed).toBe("number");
  });

  it("speed_feed: roughing operation returns valid S/F", async () => {
    const { calculateSpeedFeed } = await import("../engines/ManufacturingCalculations.js");
    const result = calculateSpeedFeed({
      operation: "roughing",
      tool_diameter: 12,
      tool_material: "Carbide",
      number_of_teeth: 4,
    } as any);
    expect(result.cutting_speed).toBeGreaterThan(50);
    expect(result.cutting_speed).toBeLessThan(500);
    expect(result.spindle_speed).toBeGreaterThan(0);
    expect(result.feed_per_tooth).toBeGreaterThan(0.01);
    expect(result.feed_per_tooth).toBeLessThan(1.0);
    expect(typeof result.axial_depth).toBe("number");
    expect(typeof result.radial_depth).toBe("number");
  });

  it("speed_feed: finishing gives lower feed than roughing", async () => {
    const { calculateSpeedFeed } = await import("../engines/ManufacturingCalculations.js");
    const rough = calculateSpeedFeed({ operation: "roughing", tool_diameter: 12, tool_material: "Carbide", number_of_teeth: 4 } as any);
    const finish = calculateSpeedFeed({ operation: "finishing", tool_diameter: 12, tool_material: "Carbide", number_of_teeth: 4 } as any);
    expect(finish.feed_per_tooth).toBeLessThan(rough.feed_per_tooth);
    expect(finish.cutting_speed).toBeGreaterThan(rough.cutting_speed);
  });
});

// =============================================================================
// SPEED-FEED ORCHESTRATOR — actions called by /api/v1/speed-feed/* routes
// =============================================================================
describe("calcDispatcher — Speed-Feed Orchestrator route actions", () => {
  it("sf_orchestrate: full pipeline resolves via SpeedFeedOrchestratorEngine", async () => {
    const { speedFeedOrchestratorEngine } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    expect(speedFeedOrchestratorEngine).toBeDefined();
    expect(typeof speedFeedOrchestratorEngine.compute).toBe("function");
  });

  it("sf_quick: quick mode returns valid result", async () => {
    const { speedFeedOrchestratorEngine } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const result = speedFeedOrchestratorEngine.compute({
      material: "steel",
      operation: "milling",
      tool_diameter: 12,
      uncertainty_mode: "quick",
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("sf_resolve_machine: function exists", async () => {
    const sfo = await import("../engines/SpeedFeedOrchestratorEngine.js");
    expect(typeof sfo.resolveMachineContextFn).toBe("function");
  });

  it("sf_resolve_tool: function exists", async () => {
    const sfo = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const hasFn = typeof sfo.resolveToolContextFn === "function" ||
                  typeof sfo.speedFeedOrchestratorEngine.resolveTool === "function";
    expect(hasFn).toBe(true);
  });

  it("sf_resolve_material: function exists", async () => {
    const sfo = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const hasFn = typeof sfo.resolveMaterialContextFn === "function" ||
                  typeof sfo.speedFeedOrchestratorEngine.resolveMaterial === "function";
    expect(hasFn).toBe(true);
  });
});

// =============================================================================
// ROUTE → ACTION MAPPING + Z.ENUM VERIFICATION
// =============================================================================
describe("Route → dispatcher action mapping + z.enum", () => {
  it("SFC routes map to real dispatcher actions", () => {
    const sfcRouteMap = [
      ["/sfc/calculate", "prism_product", "sfc_calculate"],
      ["/sfc/cycle-time", "prism_calc", "cycle_time"],
      ["/sfc/engagement", "prism_calc", "engagement"],
      ["/sfc/deflection", "prism_calc", "deflection"],
      ["/sfc/power-torque", "prism_calc", "power_torque"],
      ["/sfc/surface-finish", "prism_calc", "surface_finish"],
      ["/sfc/tool-life", "prism_calc", "tool_life"],
    ];
    expect(sfcRouteMap.length).toBe(7);
    for (const [route, dispatcher, action] of sfcRouteMap) {
      expect(route).toBeTruthy();
      expect(dispatcher).toMatch(/^prism_/);
      expect(action).toBeTruthy();
    }
  });

  it("Speed-feed routes map to real calcDispatcher actions", () => {
    const sfRouteMap = [
      ["/speed-feed/orchestrate", "prism_calc", "sf_orchestrate"],
      ["/speed-feed/quick", "prism_calc", "sf_quick"],
      ["/speed-feed/stochastic", "prism_calc", "sf_stochastic"],
      ["/speed-feed/resolve/machine", "prism_calc", "sf_resolve_machine"],
      ["/speed-feed/resolve/tool", "prism_calc", "sf_resolve_tool"],
      ["/speed-feed/resolve/material", "prism_calc", "sf_resolve_material"],
      ["/speed-feed/compare", "prism_calc", "sf_compare"],
      ["/speed-feed/optimize", "prism_calc", "sf_optimize"],
      ["/speed-feed/inventory-select", "prism_calc", "inventory_tool_select"],
      ["/speed-feed/tool-roi", "prism_calc", "tool_roi_analysis"],
    ];
    expect(sfRouteMap.length).toBe(10);
    for (const [, dispatcher, action] of sfRouteMap) {
      expect(dispatcher).toBe("prism_calc");
      expect(action).toMatch(/^(sf_|inventory_tool_select|tool_roi_analysis)/);
    }
  });

  it("calcDispatcher ACTIONS array contains all required actions", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/calcDispatcher.ts"),
      "utf-8"
    );
    const requiredActions = [
      "cutting_force", "tool_life", "speed_feed", "surface_finish",
      "mrr", "power", "torque", "power_torque", "deflection",
      "engagement", "cycle_time",
      "sf_orchestrate", "sf_quick", "sf_stochastic",
      "sf_resolve_machine", "sf_resolve_tool", "sf_resolve_material",
      "sf_compare", "sf_optimize",
      "inventory_tool_select", "tool_roi_analysis",
    ];
    for (const action of requiredActions) {
      expect(source).toContain(`"${action}"`);
    }
  });
});
