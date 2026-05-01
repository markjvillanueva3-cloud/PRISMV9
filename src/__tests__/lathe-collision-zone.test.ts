/**
 * LATHE-MS0 — Collision Avoidance & Tool Reach Validation Tests
 * ==============================================================
 * Tests LatheCollisionZoneEngine: turret index, swing, grooving overhang,
 * boring reach, chip thickness, G71 type, taper/springback compensation,
 * rapid corridor, and full collision check integration.
 *
 * 7 collision + 3 reach + 2 swing + bonus scenarios = 20+ tests
 */
import { describe, it, expect } from "vitest";
import { latheCollisionZoneEngine } from "../engines/LatheCollisionZoneEngine.js";

// ============================================================================
// Shared test fixtures
// ============================================================================

const BASE_TURRET = {
  station_count: 12,
  turret_radius_mm: 150,
  tool_protrusions_mm: [40, 50, 35, 60, 45, 40, 55, 30, 50, 45, 40, 35],
};

const BASE_WORKPIECE = {
  part_od_mm: 50,
  part_length_mm: 100,
  bar_stock_od_mm: 52,
  chuck_jaw_protrusion_mm: 15,
  chuck_jaw_length_mm: 50,
};

const BASE_MACHINE = {
  max_swing_diameter_mm: 400,
  tailstock_engaged: false,
};

// ============================================================================
// 1. Machine Swing Validation (U08)
// ============================================================================
describe("LatheCollisionZoneEngine — machine swing validation", () => {
  it("passes when part fits within swing diameter", () => {
    const result = latheCollisionZoneEngine.checkMachineSwing({
      turret: BASE_TURRET,
      workpiece: BASE_WORKPIECE,
      machine: { max_swing_diameter_mm: 400 },
    });
    expect(result.passed).toBe(true);
    expect(result.clearance_mm).toBeGreaterThan(0);
    expect(result.severity).toBe("info");
  });

  it("fails when part exceeds machine swing", () => {
    const result = latheCollisionZoneEngine.checkMachineSwing({
      turret: BASE_TURRET,
      workpiece: { ...BASE_WORKPIECE, bar_stock_od_mm: 380, part_od_mm: 380 },
      machine: { max_swing_diameter_mm: 300 },
    });
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
    expect(result.description).toContain("SWING EXCEEDED");
  });

  it("accounts for jaw protrusion in swing calculation", () => {
    // Part = 250mm OD, jaws = 30mm protrusion → total = 250 + 60 = 310mm
    const result = latheCollisionZoneEngine.checkMachineSwing({
      turret: BASE_TURRET,
      workpiece: { ...BASE_WORKPIECE, bar_stock_od_mm: 250, part_od_mm: 250, chuck_jaw_protrusion_mm: 30 },
      machine: { max_swing_diameter_mm: 300 },
    });
    expect(result.passed).toBe(false); // 310 > 300
  });
});

// ============================================================================
// 2. Turret Index Collision (U06)
// ============================================================================
describe("LatheCollisionZoneEngine — turret index collision", () => {
  it("detects collision when X not retracted far enough", () => {
    const result = latheCollisionZoneEngine.checkTurretIndex({
      turret: BASE_TURRET,
      workpiece: BASE_WORKPIECE,
      machine: BASE_MACHINE,
      current_station: 1,
      target_station: 4,
      current_x_mm: 80, // too close — turret swing radius + part = much more
    });
    expect(result.passed).toBe(false);
    expect(result.check_type).toBe("turret_index");
    expect(result.severity).toBe("critical");
  });

  it("passes when X retracted beyond swing + part + jaw", () => {
    // Turret radius 150 + longest tool 60 = 210 swing
    // Part radius 26 + jaw 15 = 41 obstacle
    // Need 210 + 41 + 5 safety = 256 radius → 512 diameter
    const result = latheCollisionZoneEngine.checkTurretIndex({
      turret: BASE_TURRET,
      workpiece: BASE_WORKPIECE,
      machine: BASE_MACHINE,
      current_station: 1,
      target_station: 4,
      current_x_mm: 600, // well clear
    });
    expect(result.passed).toBe(true);
  });
});

// ============================================================================
// 3. Chuck Jaw Clearance
// ============================================================================
describe("LatheCollisionZoneEngine — chuck jaw clearance", () => {
  it("checks jaw clearance with current X position", () => {
    const result = latheCollisionZoneEngine.checkChuckJawClearance({
      turret: BASE_TURRET,
      workpiece: BASE_WORKPIECE,
      machine: BASE_MACHINE,
      current_x_mm: 200,
    });
    expect(result.check_type).toBe("chuck_jaw_clearance");
    // With X at 200 (radius 100) and jaw outer at 26+15=41 + 5 safety = 46
    expect(result.passed).toBe(true);
  });
});

// ============================================================================
// 4. Live Tool vs Tailstock (U05)
// ============================================================================
describe("LatheCollisionZoneEngine — live tool vs tailstock", () => {
  it("detects conflict between live tool and tailstock", () => {
    const result = latheCollisionZoneEngine.checkLiveToolVsTailstock(
      {
        turret: BASE_TURRET,
        workpiece: BASE_WORKPIECE,
        machine: {
          max_swing_diameter_mm: 400,
          tailstock_engaged: true,
          tailstock_z_mm: 105,
          tailstock_quill_diameter_mm: 30,
        },
      },
      {
        station: 5,
        tool_type: "live_mill",
        tool_stickout_mm: 50,
        holder_protrusion_mm: 40,
        diameter_mm: 12,
      },
    );
    // Tool reaches 50+40=90mm, tailstock at 105, quill dia 30 → clearance = 105 - 90 - 15 - 5 = -5
    expect(result.check_type).toBe("live_tool_vs_tailstock");
    expect(result.passed).toBe(false);
    expect(result.description).toContain("retract tailstock");
  });

  it("passes when tailstock not engaged", () => {
    const result = latheCollisionZoneEngine.checkLiveToolVsTailstock(
      {
        turret: BASE_TURRET,
        workpiece: BASE_WORKPIECE,
        machine: { max_swing_diameter_mm: 400, tailstock_engaged: false },
      },
      {
        station: 5,
        tool_type: "live_mill",
        tool_stickout_mm: 50,
        holder_protrusion_mm: 40,
        diameter_mm: 12,
      },
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================================================
// 5. Grooving/Parting Overhang (U04)
// ============================================================================
describe("LatheCollisionZoneEngine — grooving/parting overhang", () => {
  it("rejects grooving with excessive overhang", () => {
    const result = latheCollisionZoneEngine.checkGroovingOverhang({
      station: 1, tool_type: "grooving",
      tool_stickout_mm: 30, holder_protrusion_mm: 0, diameter_mm: 20,
      blade_width_mm: 3, // 30/3 = 10 > 8 max
    });
    expect(result.safe).toBe(false);
    expect(result.overhang_ratio).toBeGreaterThan(8);
  });

  it("accepts grooving within limits", () => {
    const result = latheCollisionZoneEngine.checkGroovingOverhang({
      station: 1, tool_type: "grooving",
      tool_stickout_mm: 20, holder_protrusion_mm: 0, diameter_mm: 20,
      blade_width_mm: 4, // 20/4 = 5 < 8 max
    });
    expect(result.safe).toBe(true);
  });

  it("applies stricter limit for parting", () => {
    const result = latheCollisionZoneEngine.checkGroovingOverhang({
      station: 1, tool_type: "parting",
      tool_stickout_mm: 21, holder_protrusion_mm: 0, diameter_mm: 20,
      blade_width_mm: 3, // 21/3 = 7 > 6 parting max
    });
    expect(result.safe).toBe(false);
    expect(result.max_ratio).toBe(6);
  });
});

// ============================================================================
// 6. Minimum Chip Thickness / Rubbing Detection (U09)
// ============================================================================
describe("LatheCollisionZoneEngine — minimum chip thickness", () => {
  it("detects rubbing at very low feed", () => {
    const result = latheCollisionZoneEngine.checkMinChipThickness(
      0.005, // very low feed
      95,    // standard approach angle
      0.04,  // edge radius 0.04mm
    );
    expect(result.cutting).toBe(false);
    expect(result.recommendation).toContain("RUBBING");
  });

  it("confirms cutting at normal feed", () => {
    const result = latheCollisionZoneEngine.checkMinChipThickness(
      0.15, // normal feed
      95,   // standard approach angle
      0.02, // sharp insert
    );
    expect(result.cutting).toBe(true);
    expect(result.chip_thickness_mm).toBeGreaterThan(result.threshold_mm);
  });

  it("considers approach angle in chip thickness", () => {
    // 45° approach gives thinner chip than 90°
    const at45 = latheCollisionZoneEngine.checkMinChipThickness(0.05, 45, 0.03);
    const at90 = latheCollisionZoneEngine.checkMinChipThickness(0.05, 90, 0.03);
    expect(at45.chip_thickness_mm).toBeLessThan(at90.chip_thickness_mm);
  });
});

// ============================================================================
// 7. Boring Bar Reach Validation (U03)
// ============================================================================
describe("LatheCollisionZoneEngine — boring bar reach", () => {
  it("rejects steel bar at L/D > 4", () => {
    const result = latheCollisionZoneEngine.checkBoringBarReach({
      station: 1, tool_type: "boring",
      tool_stickout_mm: 80, holder_protrusion_mm: 0, diameter_mm: 25,
      bar_diameter_mm: 16, bar_material: "steel",
      bore_depth_mm: 80, // 80/16 = L/D 5 > 4 limit
    });
    expect(result.reachable).toBe(false);
    expect(result.ld_ratio).toBeGreaterThan(4);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("accepts carbide bar at L/D = 5.5", () => {
    const result = latheCollisionZoneEngine.checkBoringBarReach({
      station: 1, tool_type: "boring",
      tool_stickout_mm: 80, holder_protrusion_mm: 0, diameter_mm: 25,
      bar_diameter_mm: 16, bar_material: "carbide",
      bore_depth_mm: 88, // 88/16 = L/D 5.5 < 6 limit
    });
    expect(result.reachable).toBe(true);
  });

  it("recommends material upgrade when needed", () => {
    const result = latheCollisionZoneEngine.checkBoringBarReach({
      station: 1, tool_type: "boring",
      tool_stickout_mm: 80, holder_protrusion_mm: 0, diameter_mm: 25,
      bar_diameter_mm: 10, bar_material: "steel",
      bore_depth_mm: 50, // L/D = 5 > 4 steel limit, but < 6 carbide
    });
    expect(result.reachable).toBe(false);
    expect(result.recommended_material).not.toBe("steel");
  });

  it("warns when bar diameter < 70% of bore", () => {
    const result = latheCollisionZoneEngine.checkBoringBarReach({
      station: 1, tool_type: "boring",
      tool_stickout_mm: 30, holder_protrusion_mm: 0, diameter_mm: 40,
      bar_diameter_mm: 20, bar_material: "carbide", // 20 < 40*0.7=28
      bore_depth_mm: 30,
    });
    expect(result.warnings.some(w => w.includes("70%"))).toBe(true);
  });
});

// ============================================================================
// 8. Boring Taper Compensation (U11)
// ============================================================================
describe("LatheCollisionZoneEngine — boring taper compensation", () => {
  it("calculates increasing deflection along bore depth", () => {
    const comp = latheCollisionZoneEngine.calculateBoringTaperCompensation(
      16, "steel", 60, 300, 5,
    );
    expect(comp.length).toBe(6); // 0 to 5 = 6 points
    // Deflection should increase with Z (cantilever)
    expect(comp[0].deflection_mm).toBe(0);
    expect(comp[comp.length - 1].deflection_mm).toBeGreaterThan(0);
    // Compensation should be negative (counter-taper)
    expect(comp[comp.length - 1].compensation_mm).toBeLessThan(0);
  });

  it("produces zero deflection at bar root (z=0)", () => {
    const comp = latheCollisionZoneEngine.calculateBoringTaperCompensation(
      20, "carbide", 50, 500, 10,
    );
    expect(comp[0].deflection_mm).toBe(0);
    expect(comp[0].compensation_mm).toBe(0);
  });

  it("produces less deflection with carbide vs steel", () => {
    const steel = latheCollisionZoneEngine.calculateBoringTaperCompensation(16, "steel", 60, 300, 5);
    const carbide = latheCollisionZoneEngine.calculateBoringTaperCompensation(16, "carbide", 60, 300, 5);
    // Carbide E = 580GPa vs steel 210GPa → less deflection
    expect(carbide[carbide.length - 1].deflection_mm).toBeLessThan(steel[steel.length - 1].deflection_mm);
  });
});

// ============================================================================
// 9. Springback Compensation (U12)
// ============================================================================
describe("LatheCollisionZoneEngine — springback compensation", () => {
  it("calculates positive springback value", () => {
    const result = latheCollisionZoneEngine.calculateSpringbackCompensation(
      16, "steel", 0.5, 50, 300,
    );
    expect(result.springback_mm).toBeGreaterThan(0);
    expect(result.compensation_mm).toBeGreaterThan(0);
    expect(result.recommendation).toContain("smaller");
  });

  it("clamps compensation to practical range", () => {
    const result = latheCollisionZoneEngine.calculateSpringbackCompensation(
      16, "steel", 0.5, 50, 300,
    );
    expect(result.compensation_mm).toBeGreaterThanOrEqual(0.005);
    expect(result.compensation_mm).toBeLessThanOrEqual(0.05);
  });
});

// ============================================================================
// 10. G71 Type I vs Type II Detection (U13)
// ============================================================================
describe("LatheCollisionZoneEngine — G71 type detection", () => {
  it("detects Type I for monotonic decreasing X profile", () => {
    const result = latheCollisionZoneEngine.detectG71Type([
      { x: 52, z: 0 },
      { x: 50, z: -10 },
      { x: 48, z: -20 },
      { x: 45, z: -40 },
      { x: 40, z: -60 },
    ]);
    expect(result.type).toBe("I");
    expect(result.x_monotonic).toBe(true);
    expect(result.reversal_indices).toEqual([]);
  });

  it("detects Type II when X reverses direction (undercut)", () => {
    const result = latheCollisionZoneEngine.detectG71Type([
      { x: 52, z: 0 },
      { x: 48, z: -10 },
      { x: 45, z: -20 },
      { x: 50, z: -30 }, // X reversal! undercut
      { x: 40, z: -50 },
    ]);
    expect(result.type).toBe("II");
    expect(result.x_monotonic).toBe(false);
    expect(result.reversal_indices.length).toBeGreaterThan(0);
    expect(result.recommendation).toContain("MUST use G71 Type II");
  });

  it("handles single-point profile as Type I", () => {
    const result = latheCollisionZoneEngine.detectG71Type([{ x: 50, z: 0 }]);
    expect(result.type).toBe("I");
  });
});

// ============================================================================
// 11. Rapid Corridor Safety
// ============================================================================
describe("LatheCollisionZoneEngine — rapid corridor", () => {
  it("detects collision when rapid passes through part zone", () => {
    const result = latheCollisionZoneEngine.checkRapidCorridor(
      200, 50,  // from: clear
      30, -10,  // to: inside part zone (X=15 radius < part 26+15=41)
      BASE_WORKPIECE,
    );
    expect(result.passed).toBe(false);
    expect(result.description).toContain("intermediate G28");
  });

  it("passes when rapid stays clear of part", () => {
    const result = latheCollisionZoneEngine.checkRapidCorridor(
      200, 110, // from: beyond part length
      200, 50,  // to: same X, within part Z but X is clear
      BASE_WORKPIECE,
    );
    expect(result.passed).toBe(true);
  });
});

// ============================================================================
// 12. Full Collision Check Suite (integration)
// ============================================================================
describe("LatheCollisionZoneEngine — full checkAll integration", () => {
  it("returns comprehensive result with all check types", () => {
    const result = latheCollisionZoneEngine.checkAll({
      turret: BASE_TURRET,
      workpiece: BASE_WORKPIECE,
      machine: BASE_MACHINE,
      current_station: 1,
      target_station: 4,
      current_x_mm: 600, // well retracted
    });
    expect(result).toHaveProperty("safe");
    expect(result).toHaveProperty("checks");
    expect(result).toHaveProperty("safe_retract_x_mm");
    expect(result).toHaveProperty("safe_retract_z_mm");
    expect(result.checks.length).toBeGreaterThanOrEqual(3); // swing + jaw + turret index
  });

  it("calculates safe retract positions", () => {
    const result = latheCollisionZoneEngine.checkAll({
      turret: BASE_TURRET,
      workpiece: BASE_WORKPIECE,
      machine: BASE_MACHINE,
    });
    expect(result.safe_retract_x_mm).toBeGreaterThan(BASE_WORKPIECE.bar_stock_od_mm);
    expect(result.safe_retract_z_mm).toBeGreaterThan(BASE_WORKPIECE.part_length_mm);
  });

  it("detects collision when machine swing is too small", () => {
    const result = latheCollisionZoneEngine.checkAll({
      turret: BASE_TURRET,
      workpiece: { ...BASE_WORKPIECE, bar_stock_od_mm: 350 },
      machine: { max_swing_diameter_mm: 300 },
    });
    expect(result.safe).toBe(false);
    expect(result.critical_errors.length).toBeGreaterThan(0);
  });

  it("includes grooving overhang warnings for tools", () => {
    const result = latheCollisionZoneEngine.checkAll({
      turret: BASE_TURRET,
      workpiece: BASE_WORKPIECE,
      machine: BASE_MACHINE,
      tools: [{
        station: 5, tool_type: "parting",
        tool_stickout_mm: 25, holder_protrusion_mm: 0, diameter_mm: 20,
        blade_width_mm: 3, // 25/3 = 8.3 > 6 parting limit
      }],
    });
    expect(result.warnings.some(w => w.includes("overhang") || w.includes("EXCEEDED"))).toBe(true);
  });
});

// ============================================================================
// 13. Dispatcher wiring verification
// ============================================================================
describe("turningDispatcher — LATHE-MS0 action wiring", () => {
  it("dispatcher contains all LATHE-MS0 actions", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/turningDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    // 8 new collision actions
    expect(src).toContain('"lathe_collision_check"');
    expect(src).toContain('"lathe_swing_check"');
    expect(src).toContain('"lathe_grooving_overhang"');
    expect(src).toContain('"lathe_chip_thickness"');
    expect(src).toContain('"lathe_boring_reach"');
    expect(src).toContain('"lathe_g71_type"');
    expect(src).toContain('"lathe_boring_taper_comp"');
    expect(src).toContain('"lathe_springback_comp"');
  });

  it("total turning actions count is at least 25", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/turningDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    const actionMatch = src.match(/const ACTIONS = \[([\s\S]*?)\] as const/);
    if (actionMatch) {
      const actionCount = (actionMatch[1].match(/"/g) || []).length / 2;
      expect(actionCount).toBeGreaterThanOrEqual(25);
    }
  });
});
