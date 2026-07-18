import { describe, it, expect } from "vitest";
import {
  toolLifeBudgetEngine as eng,
  ToolLifeBudgetEngine,
  type ToolLifeBudgetInput,
} from "../engines/ToolLifeBudgetEngine.js";

describe("ToolLifeBudgetEngine", () => {
  it("exports a singleton with budget() method", () => {
    expect(eng).toBeInstanceOf(ToolLifeBudgetEngine);
    expect(typeof eng.budget).toBe("function");
  });

  it("throws on missing program_id or tools", () => {
    expect(() => eng.budget({} as ToolLifeBudgetInput)).toThrow(/program_id \+ tools\[\]/);
  });

  it("budget_ok when every tool has ≥ 20% margin over predicted use", () => {
    const r = eng.budget({
      program_id: "PRG-001",
      tools: [
        { tool_id: "T01", predicted_use_min_per_part: 2, parts_in_run: 50, remaining_life_min: 200 },
        { tool_id: "T02", predicted_use_min_per_part: 1, parts_in_run: 50, remaining_life_min: 100 },
      ],
    });
    expect(r.verdict).toBe("budget_ok");
    expect(r.insufficient_count).toBe(0);
    expect(r.confidence.value).toBe(1);
    expect(r.tools[0].budget_ok).toBe(true);
    expect(r.tools[1].budget_ok).toBe(true);
  });

  it("budget_block when most tools insufficient + no spare guidance", () => {
    const r = eng.budget({
      program_id: "PRG-002",
      tools: [
        { tool_id: "T01", predicted_use_min_per_part: 5, parts_in_run: 100, remaining_life_min: 50 },
        { tool_id: "T02", predicted_use_min_per_part: 3, parts_in_run: 100, remaining_life_min: 80 },
      ],
    });
    expect(r.verdict).toBe("budget_block");
    expect(r.insufficient_count).toBe(2);
    expect(r.tools[0].budget_ok).toBe(false);
  });

  it("computes mid_run_change_at_part when life runs out mid-run", () => {
    const r = eng.budget({
      program_id: "PRG-003",
      tools: [
        { tool_id: "T01", predicted_use_min_per_part: 2, parts_in_run: 50, remaining_life_min: 30 },
      ],
    });
    expect(r.tools[0].budget_ok).toBe(false);
    // 30 min / (2 min × 1.2 sf) = 12.5 → floor 12 parts before failure
    expect(r.tools[0].mid_run_change_at_part).toBe(12);
  });

  it("recommends pre_stage spares when life insufficient + spare_life_min provided", () => {
    const r = eng.budget({
      program_id: "PRG-004",
      tools: [
        { tool_id: "T01", predicted_use_min_per_part: 2, parts_in_run: 100,
          remaining_life_min: 50, spare_life_min: 60 },
      ],
    });
    // total need = 100 × 2 × 1.2 = 240, have 50, short 190, 190/60 = ceil(3.17) = 4 spares
    expect(r.tools[0].recommend_pre_stage).toBe(4);
    expect(r.pre_stage_total).toBe(4);
  });

  it("budget_warn when half-or-fewer insufficient + can be addressed with spares", () => {
    const r = eng.budget({
      program_id: "PRG-005",
      tools: [
        { tool_id: "T01", predicted_use_min_per_part: 2, parts_in_run: 50, remaining_life_min: 200 },
        { tool_id: "T02", predicted_use_min_per_part: 2, parts_in_run: 50, remaining_life_min: 50, spare_life_min: 100 },
      ],
    });
    expect(r.verdict).toBe("budget_warn");
    expect(r.insufficient_count).toBe(1);
    expect(r.pre_stage_total).toBeGreaterThan(0);
  });

  it("custom safety_factor honored (sf=1.5 raises required budget)", () => {
    const r = eng.budget({
      program_id: "PRG-006",
      tools: [
        { tool_id: "T01", predicted_use_min_per_part: 2, parts_in_run: 50, remaining_life_min: 120 },
      ],
      safety_factor: 1.5,
    });
    // 2 × 50 × 1.5 = 150 required; have 120 → not ok
    expect(r.tools[0].budget_ok).toBe(false);
  });

  it("safety_margin_pct computed correctly", () => {
    const r = eng.budget({
      program_id: "PRG-007",
      tools: [
        { tool_id: "T01", predicted_use_min_per_part: 2, parts_in_run: 50, remaining_life_min: 150 },
      ],
    });
    // use = 100 min, remaining = 150, margin = (150-100)/100 = 50%
    expect(r.tools[0].safety_margin_pct).toBe(50);
  });

  it("vacuous truth — empty tools array → budget_ok confidence=1", () => {
    const r = eng.budget({ program_id: "PRG-008", tools: [] });
    expect(r.verdict).toBe("budget_ok");
    expect(r.confidence.value).toBe(1);
    expect(r.total_tools).toBe(0);
  });

  it("every tool verdict includes reasoning string", () => {
    const r = eng.budget({
      program_id: "PRG-009",
      tools: [
        { tool_id: "T01", predicted_use_min_per_part: 1, parts_in_run: 10, remaining_life_min: 100 },
      ],
    });
    expect(r.tools[0].reasoning.length).toBeGreaterThan(20);
    expect(r.tools[0].reasoning).toMatch(/remaining|required/);
  });

  it("no negative safety_margin_pct when life > use (correct sign)", () => {
    const r = eng.budget({
      program_id: "PRG-010",
      tools: [
        { tool_id: "T01", predicted_use_min_per_part: 1, parts_in_run: 10, remaining_life_min: 200 },
      ],
    });
    expect(r.tools[0].safety_margin_pct).toBeGreaterThan(0);
  });

  it("source cites Sandvik §4 + ISO 3685 + Taylor", () => {
    const r = eng.budget({
      program_id: "PRG-011",
      tools: [{ tool_id: "T01", predicted_use_min_per_part: 1, parts_in_run: 10, remaining_life_min: 50 }],
    });
    expect(r.source).toMatch(/Sandvik|ISO 3685|Taylor/);
  });
});
