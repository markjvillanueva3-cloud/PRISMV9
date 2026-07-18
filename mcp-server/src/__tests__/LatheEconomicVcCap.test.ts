/**
 * LatheEconomicVcCap.test.ts -- slot:whiskey  [U-W-GENERATOR-VC-ECONOMY]
 * ==========================================================================
 * Reference-value + invariant tests for the Gilbert minimum-cost cutting-speed
 * cap that the turning generator applies to its emitted Vc.
 *
 * WHY (R9): the closed-loop test found that ~74% of generated programs ran an
 * uneconomically short tool life because the generator picked Vc straight off
 * the speed table (aggressive), never toward the cost optimum. economicVcCap()
 * lowers Vc toward the Gilbert (1950) minimum-cost velocity -- never raises it.
 * These tests pin: (1) the cap equals the canonical GilbertEconomicSpeedEngine
 * output (no formula drift); (2) the never-raise caller contract; (3) the floor
 * behavior that distinguishes optimization_target "min_cost" from the others;
 * (4) fail-soft on degenerate Taylor / cost input (returns null -> keep table Vc).
 *
 * Run: npx vitest run src/__tests__/LatheEconomicVcCap.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  economicVcCap,
  ECONOMIC_DEFAULTS,
  type EconomicMachiningParams,
} from "../engines/TurningPrintToProgramEngine.js";
import { gilbertEconomicSpeedEngine } from "../engines/GilbertEconomicSpeedEngine.js";

// Representative P-steel carbide Taylor pair (C at 1-min life m/min, exponent n).
// Cross-checked numerically below; the test never hardcodes a "magic" Vc without
// also deriving it from the canonical Gilbert engine.
const C_P = 350;
const N_P = 0.25;

describe("economicVcCap -- Gilbert minimum-cost Vc cap (U-W-GENERATOR-VC-ECONOMY)", () => {
  it("REFERENCE VALUE: matches the hand-computed Gilbert minimum-cost velocity", () => {
    // Vc_opt = K_T * [60*M*n / ((M*t_ct + C_tool)*(1-n))]^n
    //   M = 85/3600 = 0.0236111 $/s ; t_ct = 8 s ; C_tool = 3.5 $
    //   bracket = 60*0.0236111*0.25 / ((0.0236111*8 + 3.5)*0.75) = 0.354167 / 2.766667 = 0.128012
    //   bracket^0.25 = 0.5982 ; Vc = 350 * 0.5982 = ~209.4 m/min
    const cap = economicVcCap(C_P, N_P, ECONOMIC_DEFAULTS, 0);
    expect(cap).not.toBeNull();
    expect(cap as number).toBeGreaterThan(207);
    expect(cap as number).toBeLessThan(212);
  });

  it("DELEGATION: with no floor the cap equals the canonical Gilbert engine's Vc_min_cost (no drift)", () => {
    const cap = economicVcCap(C_P, N_P, ECONOMIC_DEFAULTS, 0) as number;
    const g = gilbertEconomicSpeedEngine.compute({
      K_T: C_P,
      n: N_P,
      machining_cost_per_sec_usd: ECONOMIC_DEFAULTS.machine_rate_per_hr / 3600,
      tool_change_time_sec: ECONOMIC_DEFAULTS.tool_change_time_sec,
      tool_cost_per_edge_usd: ECONOMIC_DEFAULTS.tool_cost_per_edge_usd,
    });
    // economicVcCap returns the raw Gilbert Vc_min_cost when floorVc <= 0
    expect(Math.abs(cap - g.Vc_min_cost)).toBeLessThan(0.5);
  });

  it("NEVER-RAISE caller contract: Vc = min(tableVc, cap) only lowers an over-aggressive speed", () => {
    const cap = economicVcCap(C_P, N_P, ECONOMIC_DEFAULTS, 0) as number; // ~209
    // Over-aggressive table speed (300) is pulled DOWN to the optimum.
    expect(Math.min(300, cap)).toBeCloseTo(cap, 5);
    expect(Math.min(300, cap)).toBeLessThan(300);
    // An already-conservative table speed (150 < optimum) is UNCHANGED (never raised).
    expect(Math.min(150, cap)).toBe(150);
  });

  it("ECONOMIC optimum tool life is the REAL minimum-cost life, not a fixed 15-min heuristic", () => {
    // T_opt = (C/Vc_opt)^(1/n). For these economics T_opt ~ 7.8 min -- BELOW the crude 15-min
    // floor yet genuinely cost-optimal. This is exactly why a fixed-T cap would be wrong (R8 note).
    const cap = economicVcCap(C_P, N_P, ECONOMIC_DEFAULTS, 0) as number;
    const tLife = Math.pow(C_P / cap, 1 / N_P);
    expect(tLife).toBeGreaterThan(6);
    expect(tLife).toBeLessThan(10);
  });

  it("FLOOR: a positive floorVc clamps the cap up (other targets never cap below the finish speed)", () => {
    const optimum = economicVcCap(C_P, N_P, ECONOMIC_DEFAULTS, 0) as number; // ~209
    const floored = economicVcCap(C_P, N_P, ECONOMIC_DEFAULTS, 250) as number; // floor above optimum
    expect(floored).toBe(250); // max(209, 250)
    // min_cost (floor 0) reaches the true optimum, below the finish-speed floor used by other targets.
    expect(optimum).toBeLessThan(floored);
  });

  it("CHEAP-TOOL regime keeps an aggressive optimum (no over-conservative slowdown)", () => {
    // Near-free insert + expensive machine -> optimum velocity rises (Boothroyd & Knight: optimum Vc
    // rises as C_tool/C_machine falls), so a fast rough cut is NOT economically penalized.
    const cheap: EconomicMachiningParams = { machine_rate_per_hr: 150, tool_change_time_sec: 5, tool_cost_per_edge_usd: 0.5 };
    const expensiveTool: EconomicMachiningParams = { machine_rate_per_hr: 60, tool_change_time_sec: 12, tool_cost_per_edge_usd: 18 };
    const capCheap = economicVcCap(C_P, N_P, cheap, 0) as number;
    const capExpensive = economicVcCap(C_P, N_P, expensiveTool, 0) as number;
    expect(capCheap).toBeGreaterThan(capExpensive); // cheaper tooling -> higher economic speed
  });

  it("FAIL-SOFT: degenerate Taylor exponent (n>=1 or n<=0) returns null (caller keeps table Vc)", () => {
    expect(economicVcCap(C_P, 1.0, ECONOMIC_DEFAULTS, 0)).toBeNull();
    expect(economicVcCap(C_P, 0, ECONOMIC_DEFAULTS, 0)).toBeNull();
    expect(economicVcCap(C_P, -0.1, ECONOMIC_DEFAULTS, 0)).toBeNull();
  });

  it("FAIL-SOFT: non-finite / non-positive Taylor C or machine rate returns null", () => {
    expect(economicVcCap(0, N_P, ECONOMIC_DEFAULTS, 0)).toBeNull();
    expect(economicVcCap(NaN, N_P, ECONOMIC_DEFAULTS, 0)).toBeNull();
    expect(economicVcCap(C_P, N_P, { ...ECONOMIC_DEFAULTS, machine_rate_per_hr: 0 }, 0)).toBeNull();
    expect(economicVcCap(C_P, N_P, { ...ECONOMIC_DEFAULTS, machine_rate_per_hr: NaN }, 0)).toBeNull();
  });

  it("FAIL-SOFT: negative tool-change time or negative tool cost returns null (no garbage cap)", () => {
    expect(economicVcCap(C_P, N_P, { ...ECONOMIC_DEFAULTS, tool_change_time_sec: -1 }, 0)).toBeNull();
    expect(economicVcCap(C_P, N_P, { ...ECONOMIC_DEFAULTS, tool_cost_per_edge_usd: -5 }, 0)).toBeNull();
  });

  it("ECONOMIC_DEFAULTS mirror the documented JM cost rates and are frozen", () => {
    expect(ECONOMIC_DEFAULTS.machine_rate_per_hr).toBe(85);
    expect(ECONOMIC_DEFAULTS.tool_change_time_sec).toBe(8);
    expect(ECONOMIC_DEFAULTS.tool_cost_per_edge_usd).toBe(3.5);
    expect(Object.isFrozen(ECONOMIC_DEFAULTS)).toBe(true);
  });
});
