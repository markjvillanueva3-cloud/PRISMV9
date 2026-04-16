import { describe, it, expect } from "vitest";
import { cncToolOffsetPersistenceEngine } from "../engines/CNCToolOffsetPersistenceEngine.js";

const ERP = [
  {
    tool_id: "T01",
    turret_position: 1,
    geometry_x_mm: 100.000,
    geometry_z_mm: 50.000,
    last_wear_x_mm: 0,
    last_wear_z_mm: 0,
  },
];

describe("CNCToolOffsetPersistenceEngine", () => {
  it("noise for sub-0.001mm delta", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [{
        tool_id: "T01", turret_position: 1,
        geometry_x_mm: 100.000, geometry_z_mm: 50.000,
        wear_x_mm: 0.0005, wear_z_mm: 0,
      }],
      erp_records: ERP,
    });
    expect(r.deltas[0].classification).toBe("noise");
    expect(r.deltas[0].sync_action).toBe("reject");
  });

  it("wear for sub-0.01mm delta", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [{
        tool_id: "T01", turret_position: 1,
        geometry_x_mm: 100.000, geometry_z_mm: 50.000,
        wear_x_mm: 0.005, wear_z_mm: 0,
      }],
      erp_records: ERP,
    });
    expect(r.deltas[0].classification).toBe("wear");
    expect(r.deltas[0].sync_action).toBe("accept");
  });

  it("geometry for 0.01<Δ<0.5 mm delta", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [{
        tool_id: "T01", turret_position: 1,
        geometry_x_mm: 100.000, geometry_z_mm: 50.000,
        wear_x_mm: 0.1, wear_z_mm: 0,
      }],
      erp_records: ERP,
    });
    expect(r.deltas[0].classification).toBe("geometry");
    expect(r.deltas[0].sync_action).toBe("reconcile");
  });

  it("error for >0.5mm delta", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [{
        tool_id: "T01", turret_position: 1,
        geometry_x_mm: 100.000, geometry_z_mm: 50.000,
        wear_x_mm: 1.0, wear_z_mm: 0,
      }],
      erp_records: ERP,
    });
    expect(r.deltas[0].classification).toBe("error");
    expect(r.deltas[0].sync_action).toBe("escalate");
  });

  it("accepts new tool when no ERP record exists", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [{
        tool_id: "T99", turret_position: 9,
        geometry_x_mm: 10, geometry_z_mm: 5,
        wear_x_mm: 0, wear_z_mm: 0,
      }],
      erp_records: [],
    });
    expect(r.deltas[0].classification).toBe("geometry");
    expect(r.deltas[0].sync_action).toBe("accept");
  });

  it("summary counts match classifications", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [
        { tool_id: "T01", turret_position: 1, geometry_x_mm: 100, geometry_z_mm: 50, wear_x_mm: 0.0005, wear_z_mm: 0 },
        { tool_id: "T02", turret_position: 2, geometry_x_mm: 100, geometry_z_mm: 50, wear_x_mm: 0.005, wear_z_mm: 0 },
        { tool_id: "T03", turret_position: 3, geometry_x_mm: 100, geometry_z_mm: 50, wear_x_mm: 0.1, wear_z_mm: 0 },
      ],
      erp_records: [
        { tool_id: "T01", turret_position: 1, geometry_x_mm: 100, geometry_z_mm: 50, last_wear_x_mm: 0, last_wear_z_mm: 0 },
        { tool_id: "T02", turret_position: 2, geometry_x_mm: 100, geometry_z_mm: 50, last_wear_x_mm: 0, last_wear_z_mm: 0 },
        { tool_id: "T03", turret_position: 3, geometry_x_mm: 100, geometry_z_mm: 50, last_wear_x_mm: 0, last_wear_z_mm: 0 },
      ],
    });
    expect(r.summary.num_noise).toBe(1);
    expect(r.summary.num_wear).toBe(1);
    expect(r.summary.num_geometry).toBe(1);
  });

  it("custom wear_band shifts classification boundaries", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [{
        tool_id: "T01", turret_position: 1,
        geometry_x_mm: 100, geometry_z_mm: 50,
        wear_x_mm: 0.005, wear_z_mm: 0,
      }],
      erp_records: ERP,
      wear_band_mm: { min: 0.01, max: 0.1 },
    });
    expect(r.deltas[0].classification).toBe("noise");
  });

  it("custom error threshold lowered → sooner escalation", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [{
        tool_id: "T01", turret_position: 1,
        geometry_x_mm: 100, geometry_z_mm: 50,
        wear_x_mm: 0.2, wear_z_mm: 0,
      }],
      erp_records: ERP,
      error_threshold_mm: 0.1,
    });
    expect(r.deltas[0].classification).toBe("error");
  });

  it("reasoning line mentions errors when present", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [{
        tool_id: "T01", turret_position: 1,
        geometry_x_mm: 100, geometry_z_mm: 50,
        wear_x_mm: 2.0, wear_z_mm: 0,
      }],
      erp_records: ERP,
    });
    expect(r.reasoning.some((s) => /error/i.test(s))).toBe(true);
  });

  it("Z-axis delta evaluated too", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [{
        tool_id: "T01", turret_position: 1,
        geometry_x_mm: 100, geometry_z_mm: 50,
        wear_x_mm: 0, wear_z_mm: 0.15,
      }],
      erp_records: ERP,
    });
    expect(r.deltas[0].classification).toBe("geometry");
    expect(Math.abs(r.deltas[0].delta_z_mm)).toBeGreaterThan(0.1);
  });

  it("total_compared matches deltas length", () => {
    const r = cncToolOffsetPersistenceEngine.sync({
      controller_records: [
        { tool_id: "T01", turret_position: 1, geometry_x_mm: 100, geometry_z_mm: 50, wear_x_mm: 0, wear_z_mm: 0 },
        { tool_id: "T02", turret_position: 2, geometry_x_mm: 50, geometry_z_mm: 25, wear_x_mm: 0, wear_z_mm: 0 },
      ],
      erp_records: ERP,
    });
    expect(r.summary.total_compared).toBe(r.deltas.length);
  });

  it("getStats returns wear_band_default", () => {
    const s = cncToolOffsetPersistenceEngine.getStats();
    expect(s.wear_band_default.min).toBe(0.001);
    expect(s.wear_band_default.max).toBe(0.01);
  });
});
