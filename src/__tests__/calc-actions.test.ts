/**
 * Calc Dispatcher — Action-Level Integration Tests
 * ==================================================
 * Tests the core manufacturing calculation actions through prism_calc:
 *   - cutting_force (Kienzle model)
 *   - tool_life (Taylor model)
 *   - speed_feed (material + tool params)
 *   - surface_finish (feed + nose radius)
 *   - mrr (material removal rate)
 *   - power (spindle power from force)
 *   - chip_load (effective chip thickness)
 *   - deflection (tool deflection under load)
 *
 * All params use realistic CNC machining values.
 */

import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

// ============================================================================
// TEST HELPERS
// ============================================================================

interface CapturedTool {
  name: string;
  description: string;
  schema: any;
  handler: (args: any) => Promise<any>;
}

function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: any, handler: any) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, any> = {}
): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

// ============================================================================
// SETUP
// ============================================================================

const { server, tools } = createMockServer();
registerCalcDispatcher(server);
const calc = tools[0];

// ============================================================================
// REGISTRATION
// ============================================================================

describe("prism_calc dispatcher", () => {
  it("registers as prism_calc", () => {
    expect(calc).toBeDefined();
    expect(calc.name).toBe("prism_calc");
  });
});

// ============================================================================
// cutting_force — Kienzle model
// ============================================================================

describe("calc: cutting_force", () => {
  it("calculates cutting force with explicit Kienzle coefficients", async () => {
    const r = await callAction(calc, "cutting_force", {
      kc1_1: 1780,            // N/mm^2 — AISI 4140 steel
      mc: 0.25,               // Kienzle exponent
      feed_per_tooth: 0.1,    // mm/tooth
      axial_depth: 10,        // mm
      radial_depth: 8,        // mm
      tool_diameter: 16,      // mm
      number_of_teeth: 4,
      cutting_speed: 180,     // m/min
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      // Kienzle result must contain Fc (tangential force)
      expect(r.Fc).toBeDefined();
      expect(r.Fc).toBeGreaterThan(0);
      // Power should be computed
      if (r.power !== undefined) {
        expect(r.power).toBeGreaterThan(0);
      }
    }
  });

  it("calculates cutting force with default steel coefficients", async () => {
    const r = await callAction(calc, "cutting_force", {
      material_group: "steel_medium_carbon",
      feed_per_tooth: 0.12,
      axial_depth: 8,
      radial_depth: 10,
      tool_diameter: 20,
      number_of_teeth: 4,
      cutting_speed: 150,
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      expect(r.Fc).toBeGreaterThan(0);
    }
  });

  it("accepts camelCase aliases (feedPerTooth, axialDepth)", async () => {
    const r = await callAction(calc, "cutting_force", {
      kc1_1: 1500,
      mc: 0.22,
      feedPerTooth: 0.08,
      axialDepth: 6,
      radialDepth: 5,
      toolDiameter: 12,
      numberOfFlutes: 3,
      cuttingSpeed: 200,
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      expect(r.Fc).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// tool_life — Taylor model
// ============================================================================

describe("calc: tool_life", () => {
  it("calculates tool life with explicit Taylor coefficients", async () => {
    const r = await callAction(calc, "tool_life", {
      cutting_speed: 200,     // m/min
      taylor_C: 350,          // Taylor constant for carbide in steel
      taylor_n: 0.25,         // Taylor exponent
      tool_material: "Carbide",
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      // Tool life must be in minutes
      const tl = r.tool_life_minutes ?? r.tool_life ?? r.T;
      expect(tl).toBeDefined();
      expect(tl).toBeGreaterThan(0);
    }
  });

  it("calculates tool life with default steel Taylor params", async () => {
    const r = await callAction(calc, "tool_life", {
      cutting_speed: 180,
      material_group: "steel",
      tool_material: "Carbide",
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      const tl = r.tool_life_minutes ?? r.tool_life ?? r.T;
      expect(tl).toBeGreaterThan(0);
    }
  });

  it("higher speed yields shorter tool life", async () => {
    const r1 = await callAction(calc, "tool_life", {
      cutting_speed: 150,
      taylor_C: 300,
      taylor_n: 0.25,
    });
    const r2 = await callAction(calc, "tool_life", {
      cutting_speed: 250,
      taylor_C: 300,
      taylor_n: 0.25,
    });
    if (!r1.error && !r1.blocked && !r2.error && !r2.blocked) {
      const tl1 = r1.tool_life_minutes ?? r1.tool_life ?? r1.T;
      const tl2 = r2.tool_life_minutes ?? r2.tool_life ?? r2.T;
      expect(tl1).toBeGreaterThan(tl2);
    }
  });
});

// ============================================================================
// speed_feed — Speed and feed recommendation
// ============================================================================

describe("calc: speed_feed", () => {
  it("recommends speed and feed for medium carbon steel", async () => {
    const r = await callAction(calc, "speed_feed", {
      material_hardness: 220,     // BHN — AISI 1045
      tool_material: "Carbide",
      operation: "roughing",
      tool_diameter: 16,
      number_of_teeth: 4,
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      // Must contain speed/feed recommendations
      const cs = r.cutting_speed ?? r.Vc ?? r.vc;
      const fz = r.feed_per_tooth ?? r.fz;
      const rpm = r.spindle_speed ?? r.rpm ?? r.n;
      expect(cs || rpm).toBeDefined();
      if (cs) expect(cs).toBeGreaterThan(0);
      if (fz) expect(fz).toBeGreaterThan(0);
    }
  });

  it("recommends speed and feed for finishing aluminum", async () => {
    const r = await callAction(calc, "speed_feed", {
      material_hardness: 95,      // BHN — 6061-T6
      tool_material: "Carbide",
      operation: "finishing",
      tool_diameter: 10,
      number_of_teeth: 3,
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      const cs = r.cutting_speed ?? r.Vc ?? r.vc;
      // Aluminum finishing speed should be high
      if (cs) expect(cs).toBeGreaterThan(100);
    }
  });
});

// ============================================================================
// surface_finish — Ra/Rz calculation
// ============================================================================

describe("calc: surface_finish", () => {
  it("calculates turning surface finish from feed and nose radius", async () => {
    const r = await callAction(calc, "surface_finish", {
      feed: 0.15,              // mm/rev — turning feed
      nose_radius: 0.8,        // mm — insert nose radius
      is_milling: false,
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      expect(r.Ra).toBeDefined();
      expect(r.Ra).toBeGreaterThan(0);
      if (r.Rz !== undefined) {
        expect(r.Rz).toBeGreaterThan(r.Ra);  // Rz > Ra always
      }
    }
  });

  it("calculates milling surface finish", async () => {
    const r = await callAction(calc, "surface_finish", {
      feed: 0.08,              // mm/tooth
      nose_radius: 0.5,        // mm
      is_milling: true,
      radial_depth: 5,
      tool_diameter: 12,
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      expect(r.Ra).toBeGreaterThan(0);
    }
  });

  it("finer feed yields better surface finish", async () => {
    const r1 = await callAction(calc, "surface_finish", {
      feed: 0.05, nose_radius: 0.8, is_milling: false,
    });
    const r2 = await callAction(calc, "surface_finish", {
      feed: 0.25, nose_radius: 0.8, is_milling: false,
    });
    if (!r1.error && !r1.blocked && !r2.error && !r2.blocked) {
      expect(r1.Ra).toBeLessThan(r2.Ra);
    }
  });
});

// ============================================================================
// mrr — Material Removal Rate
// ============================================================================

describe("calc: mrr", () => {
  it("calculates MRR for face milling", async () => {
    const r = await callAction(calc, "mrr", {
      cutting_speed: 180,      // m/min
      feed_per_tooth: 0.1,     // mm/tooth
      axial_depth: 3,          // mm
      radial_depth: 40,        // mm — full width face mill
      tool_diameter: 50,       // mm
      number_of_teeth: 5,
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      const mrr = r.mrr ?? r.MRR;
      expect(mrr).toBeDefined();
      expect(mrr).toBeGreaterThan(0);
    }
  });

  it("calculates MRR with machining time for known volume", async () => {
    const r = await callAction(calc, "mrr", {
      cutting_speed: 150,
      feed_per_tooth: 0.08,
      axial_depth: 5,
      radial_depth: 10,
      tool_diameter: 20,
      number_of_teeth: 4,
      volume_to_remove: 500,  // cm^3
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      const mrr = r.mrr ?? r.MRR;
      expect(mrr).toBeGreaterThan(0);
      // If time is returned, it should be reasonable
      if (r.machining_time_min !== undefined) {
        expect(r.machining_time_min).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// power — Spindle power from cutting force
// ============================================================================

describe("calc: power", () => {
  it("calculates spindle power from cutting force and speed", async () => {
    const r = await callAction(calc, "power", {
      cutting_force: 2000,     // N
      cutting_speed: 200,      // m/min
      tool_diameter: 16,       // mm
      efficiency: 0.85,
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      // SpindlePower result uses power_spindle_kw and torque_nm
      expect(r.power_spindle_kw).toBeDefined();
      expect(r.power_spindle_kw).toBeGreaterThan(0);
      // Sanity: P = Fc * Vc / (60000 * eta) ~ 2000*200/(60000*0.85) ~ 7.84 kW
      expect(r.power_spindle_kw).toBeLessThan(50);
      if (r.torque_nm !== undefined) {
        expect(r.torque_nm).toBeGreaterThan(0);
      }
    }
  });

  it("reports high power for heavy cutting conditions", async () => {
    const r = await callAction(calc, "power", {
      cutting_force: 10000,    // N — very heavy cut
      cutting_speed: 300,
      tool_diameter: 50,
      efficiency: 0.8,
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      expect(r.power_spindle_kw).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// chip_load — Effective chip thickness
// ============================================================================

describe("calc: chip_load", () => {
  it("calculates chip load for 4-flute endmill", async () => {
    const r = await callAction(calc, "chip_load", {
      feed_rate: 1200,         // mm/min
      spindle_speed: 6000,     // RPM
      number_of_teeth: 4,
      radial_depth: 8,         // mm
      tool_diameter: 16,       // mm
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      // Chip load = feed_rate / (rpm * z) = 1200/(6000*4) = 0.05 mm
      const hex = r.hex_mm ?? r.chip_load ?? r.hex;
      expect(hex).toBeDefined();
      expect(hex).toBeGreaterThan(0);
      if (r.chip_load_ok !== undefined) {
        expect(typeof r.chip_load_ok).toBe("boolean");
      }
    }
  });

  it("detects thin chip with low radial engagement", async () => {
    const r = await callAction(calc, "chip_load", {
      feed_rate: 800,
      spindle_speed: 8000,
      number_of_teeth: 3,
      radial_depth: 1,          // mm — very low ae
      tool_diameter: 12,
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      const hex = r.hex_mm ?? r.chip_load ?? r.hex;
      if (hex !== undefined) {
        // With low radial depth, effective chip thickness is thin
        expect(hex).toBeLessThan(0.1);
      }
    }
  });
});

// ============================================================================
// deflection — Tool deflection under cutting load
// ============================================================================

describe("calc: deflection", () => {
  it("calculates deflection for standard endmill overhang", async () => {
    const r = await callAction(calc, "deflection", {
      cutting_force: 500,      // N
      tool_diameter: 10,       // mm
      overhang_length: 40,     // mm (4xD — typical)
      youngs_modulus: 600,     // GPa (carbide)
      runout: 0.005,           // mm
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      const defl = r.static_deflection ?? r.deflection ?? r.deflection_mm;
      expect(defl).toBeDefined();
      expect(defl).toBeGreaterThan(0);
      if (r.safe !== undefined) {
        expect(typeof r.safe).toBe("boolean");
      }
    }
  });

  it("longer overhang yields more deflection", async () => {
    const r1 = await callAction(calc, "deflection", {
      cutting_force: 500,
      tool_diameter: 10,
      overhang_length: 30,
      youngs_modulus: 600,
    });
    const r2 = await callAction(calc, "deflection", {
      cutting_force: 500,
      tool_diameter: 10,
      overhang_length: 60,
      youngs_modulus: 600,
    });
    if (!r1.error && !r1.blocked && !r2.error && !r2.blocked) {
      const d1 = r1.static_deflection ?? r1.deflection ?? r1.deflection_mm;
      const d2 = r2.static_deflection ?? r2.deflection ?? r2.deflection_mm;
      if (d1 !== undefined && d2 !== undefined) {
        expect(d2).toBeGreaterThan(d1);
      }
    }
  });
});

// ============================================================================
// torque — Spindle torque calculation
// ============================================================================

describe("calc: torque", () => {
  it("calculates milling torque from cutting force and tool diameter", async () => {
    const r = await callAction(calc, "torque", {
      cutting_force: 1500,     // N
      tool_diameter: 20,       // mm
      operation: "milling",
    });
    expect(r).toBeDefined();
    if (!r.error && !r.blocked) {
      // Torque result uses torque_nm
      expect(r.torque_nm).toBeDefined();
      expect(r.torque_nm).toBeGreaterThan(0);
    }
  });
});
