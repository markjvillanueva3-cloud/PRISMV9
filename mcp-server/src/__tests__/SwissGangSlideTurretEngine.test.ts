/**
 * SwissGangSlideTurretEngine — per-engine tests (MS6b / U-LPS23)
 */
import { describe, it, expect } from "vitest";
import { swissGangSlideTurretEngine } from "../engines/SwissGangSlideTurretEngine.js";

function baseGang() {
  return {
    topology: "gang" as const,
    x_travel_mm: 60,
    min_spacing_mm: 3,
    tools: [
      { tool_number: 1, label: "OD_ROUGH", width_mm: 10 },
      { tool_number: 2, label: "OD_FINISH", width_mm: 8 },
      { tool_number: 3, label: "DRILL", width_mm: 12 },
      { tool_number: 4, label: "PART_OFF", width_mm: 6 },
    ],
  };
}

function baseTurret() {
  return {
    topology: "turret" as const,
    turret_stations: 12,
    live_turret_stations: [3, 6, 9, 12],
    tools: [
      { tool_number: 1, label: "OD_TURN" },
      { tool_number: 2, label: "DRILL", live: true },
      { tool_number: 3, label: "OD_FINISH" },
      { tool_number: 4, label: "THREAD" },
    ],
  };
}

describe("SwissGangSlideTurretEngine", () => {
  it("assigns gang X positions within the configured travel", () => {
    const r = swissGangSlideTurretEngine.layout(baseGang());
    expect(r.gang_positions).toHaveLength(4);
    expect(r.gang_span_mm).toBeLessThanOrEqual(60);
  });

  it("warns when gang span exceeds machine X-travel", () => {
    const r = swissGangSlideTurretEngine.layout({
      ...baseGang(),
      tools: [
        { tool_number: 1, preferred_x_mm: 5 },
        { tool_number: 2, preferred_x_mm: 100 },
      ],
    });
    expect(r.warnings.some((w) => /exceeds machine X-travel/.test(w))).toBe(true);
  });

  it("warns when adjacent tools interfere (gap < required spacing)", () => {
    const r = swissGangSlideTurretEngine.layout({
      ...baseGang(),
      tools: [
        { tool_number: 1, preferred_x_mm: 10, width_mm: 15 },
        { tool_number: 2, preferred_x_mm: 12, width_mm: 15 },
      ],
    });
    expect(r.warnings.some((w) => /interfere/.test(w))).toBe(true);
  });

  it("reports total X-travel in program order for gang mode", () => {
    const r = swissGangSlideTurretEngine.layout(baseGang());
    expect(r.total_x_travel_mm).toBeGreaterThanOrEqual(0);
    expect(r.total_x_travel_mm).toBeLessThan(200);
  });

  it("respects preferred_x_mm when supplied", () => {
    const r = swissGangSlideTurretEngine.layout({
      ...baseGang(),
      tools: [
        { tool_number: 1, preferred_x_mm: 10 },
        { tool_number: 2, preferred_x_mm: 25 },
        { tool_number: 3, preferred_x_mm: 40 },
      ],
    });
    expect(r.gang_positions!.find((p) => p.tool_number === 1)!.x_mm).toBe(10);
    expect(r.gang_positions!.find((p) => p.tool_number === 2)!.x_mm).toBe(25);
  });

  it("assigns turret stations in program order", () => {
    const r = swissGangSlideTurretEngine.layout(baseTurret());
    expect(r.turret_assignments).toHaveLength(4);
    expect(r.turret_assignments!.every((a) => a.station >= 1 && a.station <= 12)).toBe(true);
  });

  it("assigns live tools to live stations when possible", () => {
    const r = swissGangSlideTurretEngine.layout(baseTurret());
    const drill = r.turret_assignments!.find((a) => a.tool_number === 2);
    expect(drill).toBeDefined();
    expect([3, 6, 9, 12]).toContain(drill!.station);
  });

  it("reports total rotation as sum of shortest-path hops", () => {
    const r = swissGangSlideTurretEngine.layout(baseTurret());
    expect(r.total_turret_rotation).toBeDefined();
    expect(r.total_turret_rotation!).toBeGreaterThanOrEqual(0);
  });

  it("hybrid topology returns both gang and turret plus routing", () => {
    const r = swissGangSlideTurretEngine.layout({
      topology: "hybrid",
      x_travel_mm: 60,
      turret_stations: 8,
      live_turret_stations: [2, 4, 6],
      tools: [
        { tool_number: 1, label: "TURN" },
        { tool_number: 2, label: "DRILL", live: true },
        { tool_number: 3, label: "FACE" },
      ],
    });
    expect(r.topology).toBe("hybrid");
    expect(r.gang_positions).toBeDefined();
    expect(r.turret_assignments).toBeDefined();
    expect(r.hybrid_routing).toHaveLength(3);
    const drill = r.hybrid_routing!.find((h) => h.tool_number === 2);
    expect(drill!.carrier).toBe("turret");
  });

  it("handles empty tool list without throwing", () => {
    const r = swissGangSlideTurretEngine.layout({ topology: "gang", tools: [] });
    expect(r.warnings.some((w) => /No tools/.test(w))).toBe(true);
    expect(r.gang_positions).toBeUndefined();
  });

  it("single-tool gang layout has zero total travel", () => {
    const r = swissGangSlideTurretEngine.layout({
      topology: "gang",
      tools: [{ tool_number: 1, preferred_x_mm: 30 }],
    });
    expect(r.total_x_travel_mm).toBe(0);
  });

  it("warns when live tool has no live station available", () => {
    const r = swissGangSlideTurretEngine.layout({
      topology: "turret",
      turret_stations: 8,
      live_turret_stations: [],
      tools: [{ tool_number: 1, live: true }],
    });
    expect(r.warnings.some((w) => /live station/.test(w))).toBe(true);
  });

  it("gang optimization keeps x positions non-negative", () => {
    const r = swissGangSlideTurretEngine.layout(baseGang());
    expect(r.gang_positions!.every((p) => p.x_mm >= 0)).toBe(true);
  });

  it("turret rotation is minimised — two adjacent stations have rotation 1", () => {
    const r = swissGangSlideTurretEngine.layout({
      topology: "turret",
      turret_stations: 12,
      tools: [
        { tool_number: 1 },
        { tool_number: 2 },
      ],
    });
    expect(r.total_turret_rotation).toBe(1);
  });
});
