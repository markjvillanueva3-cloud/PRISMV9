/**
 * machining_energy_model — calcDispatcher wiring test
 * ====================================================
 * U-WIRE-ENERGY (kilo, 2026-05-17): wires the orphan `MachiningEnergyModelEngine`
 * into the previously-ghost-wired `prism_calc:machining_energy_model` action.
 *
 * Background: MachiningEnergyModelEngine (Gutowski energy model + Kienzle force)
 * had its action name in the ACTIONS enum AND a slimResponse remap at
 * calcExtractKeyValues (line 290), but **no executor case body** — calls to
 * the action fell through to the default branch. This unit adds the schema
 * entry, the executor case body, and verifies the round-trip.
 *
 * The slimResponse remap reads `result.total_kwh` (top-level), so the
 * executor unwraps the engine's AtomicValue envelope and spreads `.value` into
 * `result` directly. Tests assert this contract from BOTH the unslimmed and
 * slimmed angles.
 */

import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { machiningEnergyModelEngine, type MachiningEnergyInput } from "../engines/MachiningEnergyModelEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params: Record<string, unknown> }) => Promise<{ content?: Array<{ text: string }> } | unknown>;
}

function createMockServer(): { server: { tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void }; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await tool.handler({ action, params });
  const r = result as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return text ? (JSON.parse(text) as Record<string, unknown>) : (result as Record<string, unknown>);
}

const { server, tools } = createMockServer();
registerCalcDispatcher(server);
const calc = tools[0];

// ────────────────────────────────────────────────────────────────────────────
// Canonical input — modest aluminum milling cycle. Real numbers, no fixtures.
// Spindle 6000 rpm, fz≈0.05 mm/tooth, ap 5 mm, ae 8 mm, Vc≈150 m/min,
// 100 cm³ to remove, flood coolant, 3 tool changes, 4 kW standby.
// ────────────────────────────────────────────────────────────────────────────
const canonical: MachiningEnergyInput = {
  cutting: {
    spindle_rpm: 6000,
    feed_rate_mmmin: 1200, // fz = 1200 / (6000 * 4) = 0.05
    axial_depth_mm: 5,
    radial_depth_mm: 8,
    cutting_speed_m_min: 150,
  },
  tool: { diameter_mm: 12, flute_count: 4 },
  material: { iso_group: "N", volume_to_remove_cm3: 100 }, // aluminum, canonical kc1_1=700
  machine: {
    standby_power_kw: 4,
    spindle_efficiency: 0.85,
    axis_power_kw: 1.5,
    coolant_pump_kw: 2.5,
    atc_time_s: 5,
    tool_changes: 3,
  },
  coolant_type: "flood",
  electricity_cost_per_kwh: 0.12,
};

describe("machining_energy_model — wiring", () => {
  it("conservation invariant: total_kwh == spindle + axis + coolant + idle + atc (rounding tolerance)", async () => {
    const res = await callAction(calc, "machining_energy_model", canonical as unknown as Record<string, unknown>);
    const s = res.spindle_kwh as number;
    const a = res.axis_kwh as number;
    const c = res.coolant_kwh as number;
    const i = res.idle_kwh as number;
    const at = res.atc_kwh as number;
    const t = res.total_kwh as number;
    expect(s).toBeGreaterThan(0);
    expect(a).toBeGreaterThan(0);
    expect(c).toBeGreaterThan(0);
    expect(i).toBeGreaterThan(0); // idle = standby_kw * h * 0.1, must be >0 for any non-zero cycle
    expect(at).toBeGreaterThanOrEqual(0);
    // Each leg is rounded to 4dp before being summed; allow 5e-4 slack.
    expect(Math.abs(s + a + c + i + at - t)).toBeLessThan(5e-4);
  });

  it("dispatcher result matches engine.compute().value exactly (lazy-import parity)", async () => {
    const direct = machiningEnergyModelEngine.compute(canonical);
    const viaDispatcher = await callAction(calc, "machining_energy_model", canonical as unknown as Record<string, unknown>);
    expect(viaDispatcher.total_kwh).toBe(direct.value.total_kwh);
    expect(viaDispatcher.sec_j_mm3).toBe(direct.value.sec_j_mm3);
    expect(viaDispatcher.cycle_time_min).toBe(direct.value.cycle_time_min);
    expect(viaDispatcher.efficiency_pct).toBe(direct.value.efficiency_pct);
    expect(viaDispatcher.co2_kg).toBe(direct.value.co2_kg);
    expect(viaDispatcher.cost_energy).toBe(direct.value.cost_energy);
  });

  it("CO₂ factor: co2_kg ≈ total_kwh × 0.42 (US grid emission factor, engine literal at MachiningEnergyModelEngine.ts compute body)", async () => {
    // Source: the engine has a literal `total * 0.42 * 1000` round at the co2_kg
    // computation. If that literal is replaced with a canonical constant
    // (e.g. EMISSION_FACTOR_KG_PER_KWH), the value is expected to remain ≈0.42
    // for US-grid average; if it diverges materially this test fails loudly.
    const res = await callAction(calc, "machining_energy_model", canonical as unknown as Record<string, unknown>);
    const t = res.total_kwh as number;
    const co2 = res.co2_kg as number;
    expect(co2).toBeCloseTo(t * 0.42, 3);
  });

  it("cost_energy: cost = total_kwh × electricity_cost_per_kwh (passes user price through)", async () => {
    const res = await callAction(calc, "machining_energy_model", { ...canonical, electricity_cost_per_kwh: 0.20 } as unknown as Record<string, unknown>);
    const t = res.total_kwh as number;
    const cost = res.cost_energy as number;
    expect(cost).toBeCloseTo(t * 0.20, 3);
  });

  it("cost_energy default: when electricity_cost_per_kwh omitted, defaults to 0.12 $/kWh", async () => {
    const { electricity_cost_per_kwh: _, ...noPrice } = canonical;
    const res = await callAction(calc, "machining_energy_model", noPrice as unknown as Record<string, unknown>);
    const t = res.total_kwh as number;
    const cost = res.cost_energy as number;
    expect(cost).toBeCloseTo(t * 0.12, 3);
  });

  it("coolant_type=dry: coolant_kwh == 0 exactly (dry path bypasses pump entirely)", async () => {
    const res = await callAction(calc, "machining_energy_model", { ...canonical, coolant_type: "dry" } as unknown as Record<string, unknown>);
    expect(res.coolant_kwh).toBe(0);
  });

  it("coolant_type ladder: flood > mist > mql > dry on coolant_kwh (per engine constants 2.5/0.5/0.3/0)", async () => {
    const mk = async (ct: "flood" | "mist" | "mql" | "dry"): Promise<number> => {
      const r = await callAction(calc, "machining_energy_model", { ...canonical, coolant_type: ct } as unknown as Record<string, unknown>);
      return r.coolant_kwh as number;
    };
    const flood = await mk("flood");
    const mist = await mk("mist");
    const mql = await mk("mql");
    const dry = await mk("dry");
    expect(flood).toBeGreaterThan(mist);
    expect(mist).toBeGreaterThan(mql);
    expect(mql).toBeGreaterThan(dry);
    expect(dry).toBe(0);
  });

  it("iso_group propagation: P (canonical kc1_1=1800) yields HIGHER spindle_kwh than N (canonical kc1_1=700) at identical cuts", async () => {
    const pIso = await callAction(calc, "machining_energy_model", { ...canonical, material: { iso_group: "P", volume_to_remove_cm3: 100 } } as unknown as Record<string, unknown>);
    const nIso = await callAction(calc, "machining_energy_model", { ...canonical, material: { iso_group: "N", volume_to_remove_cm3: 100 } } as unknown as Record<string, unknown>);
    // Higher kc11 → larger cutting force at same chip area → more spindle kWh.
    expect(pIso.spindle_kwh as number).toBeGreaterThan(nIso.spindle_kwh as number);
  });

  it("MRR scaling: doubling volume_to_remove_cm3 ≈ doubles cycle_time_min (linear at fixed MRR)", async () => {
    const v1 = await callAction(calc, "machining_energy_model", { ...canonical, material: { iso_group: "N", volume_to_remove_cm3: 50 } } as unknown as Record<string, unknown>);
    const v2 = await callAction(calc, "machining_energy_model", { ...canonical, material: { iso_group: "N", volume_to_remove_cm3: 100 } } as unknown as Record<string, unknown>);
    const t1 = v1.cycle_time_min as number;
    const t2 = v2.cycle_time_min as number;
    expect(t2 / t1).toBeCloseTo(2, 1);
  });

  it("ATC contribution: scales with tool_changes (0 changes → atc_kwh=0; 10 changes > 1 change)", async () => {
    const zero = await callAction(calc, "machining_energy_model", { ...canonical, machine: { ...canonical.machine, tool_changes: 0 } } as unknown as Record<string, unknown>);
    const one = await callAction(calc, "machining_energy_model", { ...canonical, machine: { ...canonical.machine, tool_changes: 1 } } as unknown as Record<string, unknown>);
    const ten = await callAction(calc, "machining_energy_model", { ...canonical, machine: { ...canonical.machine, tool_changes: 10 } } as unknown as Record<string, unknown>);
    expect(zero.atc_kwh).toBe(0);
    expect(ten.atc_kwh as number).toBeGreaterThan(one.atc_kwh as number);
  });

  it("recommendations: bad-input case emits relevant efficiency/SEC/MRR string (rejects false-positive-pass on stub text)", async () => {
    // Engineered to trip BOTH recommendation branches in the engine:
    //   if (efficiency < 30) recs.push("Low cutting efficiency ... — increase MRR.")
    //   if (sec > 10) recs.push("SEC ... J/mm³ — increase depth or feed.")
    const bad: MachiningEnergyInput = {
      ...canonical,
      machine: { ...canonical.machine, standby_power_kw: 30 },
      cutting: { ...canonical.cutting, feed_rate_mmmin: 60, axial_depth_mm: 0.5, radial_depth_mm: 1 },
    };
    const res = await callAction(calc, "machining_energy_model", bad as unknown as Record<string, unknown>);
    const recs = (res.recommendations as string[] | undefined) ?? [];
    expect(recs.length).toBeGreaterThanOrEqual(1);
    // Relevance gate (R9): the emitted string must REFERENCE the engineered
    // problem, not just be any non-empty string. Catches the failure mode of
    // an engine that returns a stub string for every input.
    const joined = recs.join(" ").toLowerCase();
    expect(joined).toMatch(/efficiency|sec|mrr|depth|feed/);
  });

  it("recommendations: aggressive well-tuned cycle emits FEWER recommendations than bad cycle (monotonicity negative test)", async () => {
    // Aggressive cut + MQL + low axis power → high efficiency + low SEC →
    // should trip FEWER of the engine's two recommendation branches than the
    // engineered-bad cycle. (Canonical light-cut input trips efficiency<30 at
    // ~12% because coolant+axis dominate cutting power; that's why we use a
    // distinct well-tuned fixture here rather than canonical.)
    const wellTuned: MachiningEnergyInput = {
      cutting: { spindle_rpm: 6000, feed_rate_mmmin: 2400, axial_depth_mm: 5, radial_depth_mm: 10, cutting_speed_m_min: 150 },
      tool: { diameter_mm: 12, flute_count: 4 },
      material: { iso_group: "N", volume_to_remove_cm3: 1000 },
      machine: { standby_power_kw: 1.5, spindle_efficiency: 0.85, axis_power_kw: 0.5, coolant_pump_kw: 0.3, atc_time_s: 5, tool_changes: 3 },
      coolant_type: "mql",
    };
    const badInputs: MachiningEnergyInput = {
      ...canonical,
      machine: { ...canonical.machine, standby_power_kw: 30 },
      cutting: { ...canonical.cutting, feed_rate_mmmin: 60, axial_depth_mm: 0.5, radial_depth_mm: 1 },
    };
    const wellRes = await callAction(calc, "machining_energy_model", wellTuned as unknown as Record<string, unknown>);
    const badRes = await callAction(calc, "machining_energy_model", badInputs as unknown as Record<string, unknown>);
    const wellRecs = (wellRes.recommendations as string[] | undefined) ?? [];
    const badRecs = (badRes.recommendations as string[] | undefined) ?? [];
    // Monotonicity: bad-input must emit strictly more than well-tuned. If
    // both emit the same set, the branches don't actually discriminate.
    expect(badRecs.length).toBeGreaterThan(wellRecs.length);
  });

  it("AtomicValue envelope: result spreads `.value` to top-level + carries _unit/_formula/_confidence sidecar", async () => {
    const res = await callAction(calc, "machining_energy_model", canonical as unknown as Record<string, unknown>);
    expect(res._unit).toBe("kWh");
    expect(typeof res._formula).toBe("string");
    expect(res._confidence).toBe(0.8);
    // Sanity: top-level numerics ARE present (slimResponse contract).
    expect(typeof res.total_kwh).toBe("number");
    expect(typeof res.sec_j_mm3).toBe("number");
  });

  it("spindle_efficiency default: omitting spindle_efficiency yields same spindle_kwh as explicit 0.85", async () => {
    const explicit = await callAction(calc, "machining_energy_model", canonical as unknown as Record<string, unknown>);
    const { spindle_efficiency: _se, ...noSe } = canonical.machine;
    const omitted = await callAction(calc, "machining_energy_model", { ...canonical, machine: noSe } as unknown as Record<string, unknown>);
    expect(omitted.spindle_kwh).toBe(explicit.spindle_kwh);
  });

  it("efficiency_pct is a finite percentage on canonical input + adversarial edge cases (tiny volume, low spindle_efficiency)", async () => {
    // Canonical first.
    const canon = await callAction(calc, "machining_energy_model", canonical as unknown as Record<string, unknown>);
    expect(Number.isFinite(canon.efficiency_pct as number)).toBe(true);
    expect(canon.efficiency_pct as number).toBeGreaterThanOrEqual(0);
    // Adversarial 1: tiny volume_to_remove_cm3 amplifies SEC rounding; eff still finite.
    const tinyVol = await callAction(calc, "machining_energy_model", { ...canonical, material: { iso_group: "N", volume_to_remove_cm3: 0.01 } } as unknown as Record<string, unknown>);
    expect(Number.isFinite(tinyVol.efficiency_pct as number)).toBe(true);
    // Adversarial 2: low spindle_efficiency stresses the (P/eff) division.
    const lowEff = await callAction(calc, "machining_energy_model", { ...canonical, machine: { ...canonical.machine, spindle_efficiency: 0.05 } } as unknown as Record<string, unknown>);
    expect(Number.isFinite(lowEff.efficiency_pct as number)).toBe(true);
    expect(lowEff.efficiency_pct as number).toBeGreaterThanOrEqual(0);
  });

  it("hardened material span: ISO H (canonical kc1_1=3200) produces strictly the highest spindle_kwh vs P/M/K/N/S", async () => {
    // Canonical values per CANONICAL_KIENZLE: P=1800, M=2100, K=1100, N=700, S=2800, H=3200.
    // H is strictly max → engine reads CANONICAL_KIENZLE and threads it through Kienzle.
    const runs: Record<string, number> = {};
    for (const g of ["P", "M", "K", "N", "S", "H"] as const) {
      const r = await callAction(calc, "machining_energy_model", { ...canonical, material: { iso_group: g, volume_to_remove_cm3: 100 } } as unknown as Record<string, unknown>);
      runs[g] = r.spindle_kwh as number;
    }
    const maxKey = Object.entries(runs).sort((a, b) => b[1] - a[1])[0][0];
    expect(maxKey).toBe("H");
  });

  it("schema upper-bound: electricity_cost_per_kwh > MAX_ELECTRICITY_COST_USD_PER_KWH ($1.00) is rejected", async () => {
    // U-WIRE-ENERGY P2 deferral close — sanity ceiling catches caller fat-fingers
    // (passing MWh price or millicents as $/kWh). Boundary value 1.0 is allowed
    // (lte boundary in zod .max()); 1.01 must be rejected. Test asserts the
    // dispatcher returns an error envelope OR rejects the call — depending on
    // how MCP handler surfaces ZodError.
    let surfaced = false;
    try {
      const res = await callAction(calc, "machining_energy_model", {
        ...canonical,
        electricity_cost_per_kwh: 1.01,
      } as unknown as Record<string, unknown>);
      // If we got here, dispatcher returned an envelope — check for error shape.
      const blob = JSON.stringify(res);
      surfaced = /error|invalid|too_big|too big|max/i.test(blob);
    } catch (e) {
      surfaced = true; // Throw is also an acceptable rejection signal.
    }
    expect(surfaced).toBe(true);

    // Boundary: exactly 1.0 must STILL be accepted (lte boundary).
    const atBoundary = await callAction(calc, "machining_energy_model", {
      ...canonical,
      electricity_cost_per_kwh: 1.0,
    } as unknown as Record<string, unknown>);
    expect(typeof atBoundary.cost_energy).toBe("number");
    expect(atBoundary.cost_energy as number).toBeGreaterThan(0);
  });

  it("schema upper-bound: tool_changes > MAX_TOOL_CHANGES_PER_PART (10000) is rejected", async () => {
    // U-WIRE-ENERGY P2 deferral close — sanity ceiling catches misconfigured
    // loops, per-batch values passed as per-part, or typos. Boundary 10000 is
    // allowed; 10001 must be rejected.
    let surfaced = false;
    try {
      const res = await callAction(calc, "machining_energy_model", {
        ...canonical,
        machine: { ...canonical.machine, tool_changes: 10001 },
      } as unknown as Record<string, unknown>);
      const blob = JSON.stringify(res);
      surfaced = /error|invalid|too_big|too big|max/i.test(blob);
    } catch (e) {
      surfaced = true;
    }
    expect(surfaced).toBe(true);

    // Boundary: exactly 10000 still accepted (lte boundary).
    const atBoundary = await callAction(calc, "machining_energy_model", {
      ...canonical,
      machine: { ...canonical.machine, tool_changes: 10000 },
    } as unknown as Record<string, unknown>);
    expect(typeof atBoundary.atc_kwh).toBe("number");
    expect(atBoundary.atc_kwh as number).toBeGreaterThan(0);
  });
});
