/**
 * PredictiveSimulationEngine tests — SIM-MS0 P2-U02
 */
import { describe, it, expect } from "vitest";
import { predictiveSimulationEngine } from "../engines/PredictiveSimulationEngine.js";

const TOOLS = [
  { number: 1, diameter_mm: 12, cost_usd: 25, material: "carbide" as const, coating: "TiAlN" },
  { number: 2, diameter_mm: 6, cost_usd: 15, material: "carbide" as const, coating: "AlTiN" },
];

const BLOCKS = [
  { block_number: 1, tool_number: 1, cutting_speed_m_min: 150, feed_mm_rev: 0.2, cutting_time_s: 30, mrr_cm3_min: 5, force_N: 800 },
  { block_number: 2, tool_number: 1, cutting_speed_m_min: 150, feed_mm_rev: 0.2, cutting_time_s: 45, mrr_cm3_min: 5, force_N: 900 },
  { block_number: 3, tool_number: 2, cutting_speed_m_min: 200, feed_mm_rev: 0.1, cutting_time_s: 20, mrr_cm3_min: 2, force_N: 300 },
];

describe("PredictiveSimulationEngine", () => {
  it("tracks tool state", () => {
    const r = predictiveSimulationEngine.predict({ tools: TOOLS, blocks: BLOCKS, workpiece_material: "steel" });
    expect(r.tool_states.length).toBe(2);
    const t1 = r.tool_states.find(t => t.tool_number === 1)!;
    expect(t1.total_cutting_time_s).toBe(75);
    expect(t1.life_consumed_pct).toBeGreaterThan(0);
  });

  it("cost per part > 0", () => {
    const r = predictiveSimulationEngine.predict({ tools: TOOLS, blocks: BLOCKS, workpiece_material: "steel" });
    expect(r.cost_per_part_usd).toBeGreaterThan(0);
  });

  it("titanium consumes more tool life than aluminum", () => {
    const ti = predictiveSimulationEngine.predict({ tools: TOOLS, blocks: BLOCKS, workpiece_material: "titanium" });
    const al = predictiveSimulationEngine.predict({ tools: TOOLS, blocks: BLOCKS, workpiece_material: "aluminum" });
    const tiLife = ti.tool_states[0].life_consumed_pct;
    const alLife = al.tool_states[0].life_consumed_pct;
    expect(tiLife).toBeGreaterThan(alLife);
  });

  it("recommends tool change when life exhausted", () => {
    // Long cutting time to exhaust tool
    const longBlocks = Array.from({ length: 50 }, (_, i) => ({
      block_number: i + 1, tool_number: 1, cutting_speed_m_min: 300,
      feed_mm_rev: 0.3, cutting_time_s: 60, mrr_cm3_min: 10, force_N: 2000,
    }));
    const r = predictiveSimulationEngine.predict({
      tools: [{ number: 1, diameter_mm: 12, cost_usd: 25, material: "carbide" as const }],
      blocks: longBlocks,
      workpiece_material: "titanium",
    });
    expect(r.tool_changes.length).toBeGreaterThan(0);
    expect(r.tool_changes[0].urgency).not.toBe("optional");
  });

  it("optimal batch size > 0", () => {
    const r = predictiveSimulationEngine.predict({ tools: TOOLS, blocks: BLOCKS, workpiece_material: "steel" });
    expect(r.optimal_batch_size).toBeGreaterThan(0);
  });

  it("productivity score between 0 and 1", () => {
    const r = predictiveSimulationEngine.predict({ tools: TOOLS, blocks: BLOCKS, workpiece_material: "steel" });
    expect(r.productivity_score).toBeGreaterThanOrEqual(0);
    expect(r.productivity_score).toBeLessThanOrEqual(1);
  });

  it("coated tool lasts longer than uncoated", () => {
    const coated = predictiveSimulationEngine.predict({
      tools: [{ number: 1, diameter_mm: 12, cost_usd: 30, material: "carbide" as const, coating: "TiAlN" }],
      blocks: [{ block_number: 1, tool_number: 1, cutting_speed_m_min: 150, feed_mm_rev: 0.2, cutting_time_s: 60, mrr_cm3_min: 5, force_N: 800 }],
      workpiece_material: "steel",
    });
    const uncoated = predictiveSimulationEngine.predict({
      tools: [{ number: 1, diameter_mm: 12, cost_usd: 20, material: "carbide" as const }],
      blocks: [{ block_number: 1, tool_number: 1, cutting_speed_m_min: 150, feed_mm_rev: 0.2, cutting_time_s: 60, mrr_cm3_min: 5, force_N: 800 }],
      workpiece_material: "steel",
    });
    expect(coated.tool_states[0].life_consumed_pct).toBeLessThan(uncoated.tool_states[0].life_consumed_pct);
  });

  it("CBN tool lasts much longer than HSS", () => {
    const base = { block_number: 1, tool_number: 1, cutting_speed_m_min: 150, feed_mm_rev: 0.2, cutting_time_s: 120, mrr_cm3_min: 5, force_N: 1000 };
    const cbn = predictiveSimulationEngine.predict({
      tools: [{ number: 1, diameter_mm: 12, cost_usd: 200, material: "cbn" as const }],
      blocks: [base], workpiece_material: "steel",
    });
    const hss = predictiveSimulationEngine.predict({
      tools: [{ number: 1, diameter_mm: 12, cost_usd: 10, material: "hss" as const }],
      blocks: [base], workpiece_material: "steel",
    });
    expect(cbn.tool_states[0].life_consumed_pct).toBeLessThan(hss.tool_states[0].life_consumed_pct);
  });
});
