/**
 * calcDispatcher — U-WIRE52 round-trip suite
 * ============================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE52 — wires MachiningEnergyModelEngine to prism_calc.
 * Background: `machining_energy_model` was a phantom action — it appeared in
 * the action enum (line 706) and the slim-response branch (line 290) but had
 * NO actual case handler. Calling it triggered the runtime fallback.
 *
 * Engine internals (verified vs. MachiningEnergyModelEngine.ts):
 *   - kc11 lookup: P=2100, M=2500, K=1500, N=800, S=3200, H=4000 (defaults to P=2100 on unknown)
 *   - Chip thickness: hm = fz × √(ae/D); where fz = feed_rate_mmmin / (rpm × flutes)
 *   - Cutting force: Fc = kc11 × ap × hm × max(hm, 0.001)^(-0.25)
 *   - Spindle power: P_s = (Fc × Vc) / 60000   [kW, with Vc in m/min]
 *   - MRR = (ap × ae × feed_rate) / 1000  [cm³/min]
 *   - Cycle time = (V_remove / MRR) × 1.15 (15% buffer for non-cutting moves)
 *   - Coolant pump default by type: flood=2.5kW, mist=0.5, mql=0.3, dry=0
 *   - Defaults: spindle_efficiency=0.85, axis_power_kw=1.5, atc_time_s=5
 *   - Idle energy = standby × t × 0.10 (10% standby duty during cycle)
 *   - SEC J/mm³ = (total_kwh × 3,600,000) / (volume_cm³ × 1000)
 *   - CO₂ kg = total_kwh × 0.42 (US grid factor)
 *   - Cost $ = total_kwh × electricity_cost_per_kwh (default 0.12)
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE52
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import {
  MachiningEnergyModelEngine,
  machiningEnergyModelEngine,
  type MachiningEnergyInput,
} from "../engines/MachiningEnergyModelEngine.js";
import { ACTION_CALC_SCHEMAS } from "../schemas/calcActionSchemas.js";

// ── Constants ─────────────────────────────────────────────────────────────────

/** US average grid carbon intensity (EIA) — engine multiplies total kWh by this. */
const CO2_KG_PER_KWH = 0.42;

/** Engine recommendation thresholds (verified against engine source). */
const EFFICIENCY_RECOMMEND_THRESHOLD_PCT = 30;
const SEC_RECOMMEND_THRESHOLD_J_PER_MM3 = 10;

/** Steel ISO P; varies by tool/coating but ~2100 N/mm² is canonical. */
const STEEL_KC11 = 2100;

/** Inconel ISO S; ~3200 N/mm² — must exceed steel by Σ(force×velocity). */
const INCONEL_KC11 = 3200;

/** Number of components energy is split into (spindle + axis + coolant + idle + atc). */
const ENERGY_COMPONENT_COUNT = 5;

/** Coolant pump kW defaults by delivery method, per engine. */
const COOLANT_PUMP_KW = { flood: 2.5, mist: 0.5, mql: 0.3, dry: 0 } as const;

// ── Test harness ──────────────────────────────────────────────────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// ── Shared fixtures ───────────────────────────────────────────────────────────

/** Steel (P) baseline — moderate cutting parameters, flood coolant, 100 cm³ to remove. */
const STEEL_BASE: MachiningEnergyInput = {
  cutting: {
    spindle_rpm: 8000,
    feed_rate_mmmin: 1600,
    axial_depth_mm: 5,
    radial_depth_mm: 6,
    cutting_speed_m_min: 300,
  },
  tool: { diameter_mm: 12, flute_count: 4 },
  material: { iso_group: "P", volume_to_remove_cm3: 100 },
  machine: {
    standby_power_kw: 3,
    spindle_efficiency: 0.85,
    axis_power_kw: 1.5,
    coolant_pump_kw: 2.5,
    atc_time_s: 5,
    tool_changes: 2,
  },
  coolant_type: "flood",
  electricity_cost_per_kwh: 0.12,
};

/** Aluminum (N) — light material, MQL coolant, fast feeds. */
const ALUMINUM_BASE: MachiningEnergyInput = {
  cutting: {
    spindle_rpm: 12000,
    feed_rate_mmmin: 4800,
    axial_depth_mm: 8,
    radial_depth_mm: 8,
    cutting_speed_m_min: 600,
  },
  tool: { diameter_mm: 16, flute_count: 3 },
  material: { iso_group: "N", volume_to_remove_cm3: 200 },
  machine: { standby_power_kw: 2, tool_changes: 1 },
  coolant_type: "mql",
};

/** Inconel (S) — heavy material, dry, very low MRR. */
const INCONEL_BASE: MachiningEnergyInput = {
  cutting: {
    spindle_rpm: 1200,
    feed_rate_mmmin: 240,
    axial_depth_mm: 2,
    radial_depth_mm: 3,
    cutting_speed_m_min: 60,
  },
  tool: { diameter_mm: 16, flute_count: 4 },
  material: { iso_group: "S", volume_to_remove_cm3: 50 },
  machine: { standby_power_kw: 4, tool_changes: 5 },
  coolant_type: "dry",
};

const STEEL_PARAMS = STEEL_BASE as unknown as Record<string, unknown>;

// ── Tier 1: Engine-direct ─────────────────────────────────────────────────────

describe("MachiningEnergyModelEngine — engine-direct", () => {
  it("steel baseline returns Gutowski formula tag, kWh unit, confidence 0.8, all components positive", () => {
    const out = machiningEnergyModelEngine.compute(STEEL_BASE);
    expect(out.unit).toBe("kWh");
    expect(out.formula).toBe("Gutowski: E=Σ(P_i×t), SEC=E/V");
    expect(out.confidence).toBe(0.8);
    expect(out.value.spindle_kwh).toBeGreaterThan(0);
    expect(out.value.axis_kwh).toBeGreaterThan(0);
    expect(out.value.coolant_kwh).toBeGreaterThan(0);
    expect(out.value.idle_kwh).toBeGreaterThan(0);
    expect(out.value.total_kwh).toBeGreaterThan(0);
  });

  it("total_kwh equals Σ of all 5 energy components within 4-decimal rounding tolerance", () => {
    const out = machiningEnergyModelEngine.compute(STEEL_BASE);
    const v = out.value;
    const sum = v.spindle_kwh + v.axis_kwh + v.coolant_kwh + v.idle_kwh + v.atc_kwh;
    // Engine rounds each component to 4 decimals, so cumulative error ≤ 5×5e-5
    expect(out.value.total_kwh).toBeCloseTo(sum, 3);
  });

  it("coolant_type=dry forces coolant_kwh to exactly 0 (no pump runs)", () => {
    const out = machiningEnergyModelEngine.compute({ ...STEEL_BASE, coolant_type: "dry" });
    expect(out.value.coolant_kwh).toBe(0);
  });

  it("MQL pump consumes ~12% of flood pump (0.3 / 2.5 kW)", () => {
    const flood = machiningEnergyModelEngine.compute({ ...STEEL_BASE, coolant_pump_kw: undefined } as MachiningEnergyInput);
    const mql = machiningEnergyModelEngine.compute({
      ...STEEL_BASE,
      coolant_type: "mql",
      machine: { ...STEEL_BASE.machine, coolant_pump_kw: undefined },
    });
    const ratio = mql.value.coolant_kwh / flood.value.coolant_kwh;
    expect(ratio).toBeCloseTo(COOLANT_PUMP_KW.mql / COOLANT_PUMP_KW.flood, 2);
  });

  it("Inconel (S kc11=3200) draws more spindle energy than steel (P kc11=2100) at matched cutting params", () => {
    const steel = machiningEnergyModelEngine.compute(STEEL_BASE);
    const inconel = machiningEnergyModelEngine.compute({
      ...STEEL_BASE,
      material: { iso_group: "S", volume_to_remove_cm3: 100 },
    });
    expect(inconel.value.spindle_kwh).toBeGreaterThan(steel.value.spindle_kwh);
    // Spindle ratio should reflect kc11 ratio (within ~30% — other terms are constant)
    const ratio = inconel.value.spindle_kwh / steel.value.spindle_kwh;
    const expectedRatio = INCONEL_KC11 / STEEL_KC11;
    expect(ratio).toBeGreaterThan(expectedRatio * 0.7);
    expect(ratio).toBeLessThan(expectedRatio * 1.3);
  });

  it("cycle_time_min equals (volume / MRR) × 1.15 buffer", () => {
    // STEEL_BASE: ap=5, ae=6, feed=1600 → MRR = 5×6×1600/1000 = 48 cm³/min
    // V=100 cm³ → cycle = 100/48 × 1.15 = 2.395... min
    const out = machiningEnergyModelEngine.compute(STEEL_BASE);
    const expected = (100 / 48) * 1.15;
    expect(out.value.cycle_time_min).toBeCloseTo(expected, 1);
  });
});

// ── Tier 2: Variability spans ─────────────────────────────────────────────────

describe("MachiningEnergyModelEngine — variability spans", () => {
  describe("ISO group sweep", () => {
    const groups: Array<MachiningEnergyInput["material"]["iso_group"]> = ["N", "K", "P", "M", "S", "H"];
    for (const grp of groups) {
      it(`${grp} produces finite positive total_kwh > 0`, () => {
        const out = machiningEnergyModelEngine.compute({
          ...STEEL_BASE,
          material: { iso_group: grp, volume_to_remove_cm3: 100 },
        });
        expect(out.value.total_kwh).toBeGreaterThan(0);
        expect(Number.isFinite(out.value.total_kwh)).toBe(true);
      });
    }
  });

  describe("coolant_type sweep produces expected pump-power ordering", () => {
    const variants: Array<keyof typeof COOLANT_PUMP_KW> = ["flood", "mist", "mql", "dry"];
    for (const ct of variants) {
      it(`${ct} produces non-negative coolant_kwh equal to defaults×t (within rounding)`, () => {
        const out = machiningEnergyModelEngine.compute({
          ...STEEL_BASE,
          coolant_type: ct,
          machine: { ...STEEL_BASE.machine, coolant_pump_kw: undefined },
        });
        expect(out.value.coolant_kwh).toBeGreaterThanOrEqual(0);
        const expectedKwh = COOLANT_PUMP_KW[ct] * (out.value.cycle_time_min / 60);
        // 4-decimal rounding tolerance from engine
        expect(out.value.coolant_kwh).toBeCloseTo(expectedKwh, 3);
      });
    }
  });

  it("doubling standby_power_kw doubles idle_kwh (linear in standby)", () => {
    const low = machiningEnergyModelEngine.compute({ ...STEEL_BASE, machine: { ...STEEL_BASE.machine, standby_power_kw: 2 } });
    const high = machiningEnergyModelEngine.compute({ ...STEEL_BASE, machine: { ...STEEL_BASE.machine, standby_power_kw: 4 } });
    // idle = standby × t × 0.10 → ratio should be 2.0 within rounding
    expect(high.value.idle_kwh / low.value.idle_kwh).toBeCloseTo(2.0, 1);
  });

  it("doubling tool_changes doubles atc_kwh (linear in count)", () => {
    const few = machiningEnergyModelEngine.compute({ ...STEEL_BASE, machine: { ...STEEL_BASE.machine, tool_changes: 2 } });
    const many = machiningEnergyModelEngine.compute({ ...STEEL_BASE, machine: { ...STEEL_BASE.machine, tool_changes: 4 } });
    expect(many.value.atc_kwh / few.value.atc_kwh).toBeCloseTo(2.0, 1);
  });

  it("electricity_cost_per_kwh propagates linearly to cost_energy", () => {
    const cheap = machiningEnergyModelEngine.compute({ ...STEEL_BASE, electricity_cost_per_kwh: 0.10 });
    const expensive = machiningEnergyModelEngine.compute({ ...STEEL_BASE, electricity_cost_per_kwh: 0.20 });
    expect(expensive.value.cost_energy / cheap.value.cost_energy).toBeCloseTo(2.0, 1);
  });
});

// ── Tier 3: Schema validation ─────────────────────────────────────────────────

describe("calcActionSchemas — machining_energy_model validation", () => {
  const schema = ACTION_CALC_SCHEMAS.machining_energy_model;

  it("accepts well-formed steel baseline", () => {
    const r = schema.safeParse(STEEL_BASE);
    expect(r.success).toBe(true);
  });

  it("rejects missing cutting block", () => {
    const { cutting: _drop, ...rest } = STEEL_BASE;
    const r = schema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it("rejects unknown iso_group 'Z'", () => {
    const r = schema.safeParse({
      ...STEEL_BASE,
      material: { iso_group: "Z", volume_to_remove_cm3: 100 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown coolant_type 'river'", () => {
    const r = schema.safeParse({ ...STEEL_BASE, coolant_type: "river" });
    expect(r.success).toBe(false);
  });

  it("rejects negative volume_to_remove_cm3", () => {
    const r = schema.safeParse({
      ...STEEL_BASE,
      material: { iso_group: "P", volume_to_remove_cm3: -5 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative spindle_rpm", () => {
    const r = schema.safeParse({
      ...STEEL_BASE,
      cutting: { ...STEEL_BASE.cutting, spindle_rpm: -1000 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-integer flute_count (3.5 fractional)", () => {
    const r = schema.safeParse({
      ...STEEL_BASE,
      tool: { diameter_mm: 12, flute_count: 3.5 },
    });
    expect(r.success).toBe(false);
  });

  it("rejects spindle_efficiency > 1.0 (must be 0..1)", () => {
    const r = schema.safeParse({
      ...STEEL_BASE,
      machine: { ...STEEL_BASE.machine, spindle_efficiency: 1.5 },
    });
    expect(r.success).toBe(false);
  });

  it("accepts optional power fields omitted (engine fills defaults)", () => {
    const r = schema.safeParse({
      ...STEEL_BASE,
      machine: { standby_power_kw: 3, tool_changes: 2 },
    });
    expect(r.success).toBe(true);
  });
});

// ── Tier 4: Dispatcher round-trip ─────────────────────────────────────────────

describe("calcDispatcher — machining_energy_model round-trip", () => {
  let server: MockMCPServer;

  beforeEach(() => {
    server = new MockMCPServer();
    registerCalcDispatcher(server as unknown as Parameters<typeof registerCalcDispatcher>[0]);
  });

  it("phantom no more — slim response returns total_kwh, sec_j_mm3, co2_kg, efficiency_pct", async () => {
    const r = await call(server, "machining_energy_model", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    expect(r.data.total_kwh).toBeGreaterThan(0);
    expect(Number.isFinite(r.data.sec_j_mm3 as number)).toBe(true);
    expect(r.data.sec_j_mm3 as number).toBeGreaterThan(0);
    expect(r.data.co2_kg as number).toBeGreaterThan(0);
    expect(r.data.efficiency_pct as number).toBeGreaterThanOrEqual(0);
    expect(r.data.efficiency_pct as number).toBeLessThanOrEqual(100);
  });

  it("CO2 calc applies US grid factor 0.42 kg/kWh", async () => {
    const r = await call(server, "machining_energy_model", STEEL_PARAMS);
    expect(r.ok).toBe(true);
    const ratio = (r.data.co2_kg as number) / (r.data.total_kwh as number);
    expect(ratio).toBeCloseTo(CO2_KG_PER_KWH, 1);
  });

  it("Inconel-dry job costs more total energy than aluminum-MQL job at matched volume", async () => {
    const al = await call(server, "machining_energy_model", { ...ALUMINUM_BASE, material: { iso_group: "N", volume_to_remove_cm3: 100 } } as unknown as Record<string, unknown>);
    const inc = await call(server, "machining_energy_model", { ...INCONEL_BASE, material: { iso_group: "S", volume_to_remove_cm3: 100 } } as unknown as Record<string, unknown>);
    expect(al.ok).toBe(true);
    expect(inc.ok).toBe(true);
    expect(inc.data.total_kwh as number).toBeGreaterThan(al.data.total_kwh as number);
  });

  it("schema-rejecting payload (negative rpm) blocks before dispatch", async () => {
    const bad = await call(server, "machining_energy_model", {
      cutting: { spindle_rpm: -1, feed_rate_mmmin: 100, axial_depth_mm: 1, radial_depth_mm: 1, cutting_speed_m_min: 10 },
      tool: { diameter_mm: 10, flute_count: 2 },
      material: { iso_group: "P", volume_to_remove_cm3: 50 },
      machine: { standby_power_kw: 3, tool_changes: 1 },
      coolant_type: "flood",
    });
    expect(bad.ok).toBe(false);
  });
});

// ── Tier 5: Adversarial ───────────────────────────────────────────────────────

describe("MachiningEnergyModelEngine — adversarial", () => {
  it("zero tool_changes produces exactly zero atc_kwh and finite total", () => {
    const out = machiningEnergyModelEngine.compute({
      ...STEEL_BASE,
      machine: { ...STEEL_BASE.machine, tool_changes: 0 },
    });
    expect(out.value.atc_kwh).toBe(0);
    expect(Number.isFinite(out.value.total_kwh)).toBe(true);
  });

  it("standby 50 kW (datacenter-class) produces finite total without overflow", () => {
    const out = machiningEnergyModelEngine.compute({
      ...STEEL_BASE,
      machine: { ...STEEL_BASE.machine, standby_power_kw: 50 },
    });
    expect(Number.isFinite(out.value.total_kwh)).toBe(true);
    expect(out.value.idle_kwh).toBeGreaterThan(0);
  });

  it("low-MRR cutting (deep+slow) triggers efficiency or SEC recommendation", () => {
    const out = machiningEnergyModelEngine.compute({
      ...STEEL_BASE,
      cutting: { spindle_rpm: 500, feed_rate_mmmin: 50, axial_depth_mm: 0.5, radial_depth_mm: 0.4, cutting_speed_m_min: 50 },
      material: { iso_group: "P", volume_to_remove_cm3: 100 },
      machine: { ...STEEL_BASE.machine, standby_power_kw: 10 },
    });
    const triggered =
      out.value.efficiency_pct < EFFICIENCY_RECOMMEND_THRESHOLD_PCT ||
      out.value.sec_j_mm3 > SEC_RECOMMEND_THRESHOLD_J_PER_MM3;
    expect(triggered).toBe(true);
    expect(out.value.recommendations.length).toBeGreaterThan(0);
    // The actual recommendation strings must contain at least one of the
    // documented forms — so future renames break this loudly.
    const textBlob = out.value.recommendations.join("|");
    const matchesEfficiency = textBlob.includes("Low cutting efficiency");
    const matchesSec = textBlob.includes("J/mm");
    expect(matchesEfficiency || matchesSec).toBe(true);
  });
});

// ── Tier 6: Anti-regression ───────────────────────────────────────────────────

describe("calcDispatcher — U-WIRE52 anti-regression guards", () => {
  it("ACTION_CALC_SCHEMAS.machining_energy_model accepts the canonical steel payload", () => {
    const schema = ACTION_CALC_SCHEMAS.machining_energy_model;
    const r = schema.safeParse(STEEL_BASE);
    expect(r.success).toBe(true);
  });

  it("class instance and singleton compute identical total_kwh for the same input", () => {
    const fresh = new MachiningEnergyModelEngine();
    const a = fresh.compute(STEEL_BASE);
    const b = machiningEnergyModelEngine.compute(STEEL_BASE);
    expect(a.value.total_kwh).toBeCloseTo(b.value.total_kwh, 6);
    expect(a.unit).toBe(b.unit);
    expect(a.formula).toBe(b.formula);
  });

  it("energy is partitioned into exactly 5 named components", () => {
    const out = machiningEnergyModelEngine.compute(STEEL_BASE);
    const componentKeys = ["spindle_kwh", "axis_kwh", "coolant_kwh", "idle_kwh", "atc_kwh"];
    expect(componentKeys.length).toBe(ENERGY_COMPONENT_COUNT);
    for (const k of componentKeys) {
      expect(typeof (out.value as unknown as Record<string, number>)[k]).toBe("number");
    }
  });
});
