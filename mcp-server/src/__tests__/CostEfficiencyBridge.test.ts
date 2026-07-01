/**
 * CostEfficiencyBridge — concrete arithmetic + R12 + cross-config tests
 * for the print→quote aggregator. Validates every cost rollup math the
 * customer will see in the quote.
 *
 * @milestone COST-EFFICIENCY-BRIDGE-MS0
 */

import { describe, expect, it } from "vitest";
import {
  CostEfficiencyBridgeEngine,
  type BridgeInputs,
  type MaterialPricing,
  type ToolPricing,
  type ShopRates,
} from "../engines/CostEfficiencyBridgeEngine.js";
import {
  MACHINE_LIBRARY,
  type ParsedBlock,
} from "../engines/GCodeRuntimePredictorEngine.js";
import {
  type ToolEnvelope,
  type StockBlock,
} from "../engines/GCodeReverseCADEngine.js";

const bridge = new CostEfficiencyBridgeEngine();

const NOW = new Date().toISOString();

const FACE_BLOCKS: ParsedBlock[] = [
  { n: 1, motion: "G0", z: 25, m: [6], t: 14 },
  { n: 2, motion: "G0", s: 5000, m: [3] },
  { n: 3, motion: "G0", x: -30, y: -30, z: 5 },
  { n: 4, motion: "G1", x: -30, y: -30, z: -0.5, f: 800 },
  { n: 5, motion: "G1", x: 30, y: -30, z: -0.5 },
  { n: 6, motion: "G1", x: 30, y: 30, z: -0.5 },
  { n: 7, motion: "G1", x: -30, y: 30, z: -0.5 },
  { n: 8, motion: "G1", x: -30, y: -30, z: -0.5 },
  { n: 9, motion: "G0", x: -30, y: -30, z: 25, m: [30] },
];

const STOCK: StockBlock = {
  min: { x: -40, y: -40, z: -30 },
  max: { x: 40, y: 40, z: 0 },
};
// Volume = 80 × 80 × 30 = 192,000 mm^3 = 192 cm^3

const FACE_TOOL: ToolEnvelope = {
  tool_number: 14, type: "facemill", diameter_mm: 12, flutes: 4,
};

const AL6061_MATERIAL: MaterialPricing = {
  iso_group: "N",
  name: "Aluminum 6061-T6",
  density_g_cm3: 2.70,           // canonical Al density
  price_usd_per_kg: 5.0,         // typical small-shop Al stock
  last_updated_iso: NOW,
};
// Mass = 192 cm^3 × 2.70 g/cm^3 = 518.4 g = 0.5184 kg
// Material cost = 0.5184 × $5.0 = $2.592

const STEEL_4140: MaterialPricing = {
  iso_group: "P",
  name: "4140 Steel",
  density_g_cm3: 7.85,
  price_usd_per_kg: 3.0,
  last_updated_iso: NOW,
};

const T14_PRICING: ToolPricing = {
  tool_number: 14,
  tool_name: "12mm 4FL CARBIDE FACE",
  replacement_cost_usd: 150,
  expected_life_min: 120,
};

const STANDARD_RATES: ShopRates = {
  labor_usd_per_hour: 65,
  machine_usd_per_hour: 45,
  overhead_fraction: 0.20,
  target_margin_fraction: 0.30,
  last_updated_iso: NOW,
};

function makeBaseInputs(over: Partial<BridgeInputs> = {}): BridgeInputs {
  return {
    program_id: "P5001-face-rough-al",
    blocks: FACE_BLOCKS,
    machine: MACHINE_LIBRARY.hurco_vmx24,
    stock: STOCK,
    tools: new Map([[14, FACE_TOOL]]),
    toolPricing: new Map([[14, T14_PRICING]]),
    material: AL6061_MATERIAL,
    rates: STANDARD_RATES,
    ...over,
  };
}

describe("CostEfficiencyBridgeEngine — material cost arithmetic", () => {
  it("Al-6061 80×80×30 stock = $2.592 material cost EXACT (192 cm^3 × 2.70 g/cm^3 × $5/kg)", () => {
    const r = bridge.build(makeBaseInputs());
    // 192,000 mm^3 / 1000 = 192 cm^3
    // 192 × 2.70 g/cm^3 = 518.4 g = 0.5184 kg
    // 0.5184 × $5.00 = $2.592
    expect(r.per_part.material_cost_usd).toBeCloseTo(2.592, 3);
  });

  it("Steel 4140 same stock yields HIGHER material cost (denser + cheaper $/kg but density wins)", () => {
    const alReport = bridge.build(makeBaseInputs({ material: AL6061_MATERIAL }));
    const steelReport = bridge.build(makeBaseInputs({ material: STEEL_4140 }));
    // 192 × 7.85 × $3 = $4.522 vs Al $2.592 — steel denser × cheaper still wins by density
    expect(steelReport.per_part.material_cost_usd).toBeCloseTo(4.5216, 3);
    expect(steelReport.per_part.material_cost_usd).toBeGreaterThan(alReport.per_part.material_cost_usd);
  });
});

describe("CostEfficiencyBridgeEngine — labor + machine + overhead arithmetic", () => {
  it("labor_cost = spindle_hours × labor_rate EXACT", () => {
    const r = bridge.build(makeBaseInputs());
    const expectedLabor = r.per_part.spindle_hours * STANDARD_RATES.labor_usd_per_hour;
    expect(r.per_part.labor_cost_usd).toBeCloseTo(expectedLabor, 4);
  });

  it("machine_cost = spindle_hours × machine_rate EXACT", () => {
    const r = bridge.build(makeBaseInputs());
    const expectedMachine = r.per_part.spindle_hours * STANDARD_RATES.machine_usd_per_hour;
    expect(r.per_part.machine_cost_usd).toBeCloseTo(expectedMachine, 4);
  });

  it("overhead = (material + tooling + labor + machine) × overhead_fraction EXACT", () => {
    const r = bridge.build(makeBaseInputs());
    const direct = r.per_part.material_cost_usd + r.per_part.tooling_cost_usd
      + r.per_part.labor_cost_usd + r.per_part.machine_cost_usd;
    expect(r.per_part.overhead_usd).toBeCloseTo(direct * 0.20, 4);
  });

  it("total = material + tooling + labor + machine + overhead (cost conservation)", () => {
    const r = bridge.build(makeBaseInputs());
    const sum = r.per_part.material_cost_usd + r.per_part.tooling_cost_usd
      + r.per_part.labor_cost_usd + r.per_part.machine_cost_usd + r.per_part.overhead_usd;
    expect(r.per_part.total_cost_usd).toBeCloseTo(sum, 4);
  });
});

describe("CostEfficiencyBridgeEngine — quote arithmetic", () => {
  it("quoted_price = total_cost / (1 - target_margin) — 30% margin = total/0.7", () => {
    const r = bridge.build(makeBaseInputs());
    const expected = r.per_part.total_cost_usd / (1 - 0.30);
    expect(r.quote.quoted_unit_price_usd).toBeCloseTo(expected, 4);
  });

  it("Higher margin → higher quoted price (monotone)", () => {
    const base = bridge.build(makeBaseInputs());
    const high = bridge.build(makeBaseInputs({
      rates: { ...STANDARD_RATES, target_margin_fraction: 0.50 },
    }));
    expect(high.quote.quoted_unit_price_usd).toBeGreaterThan(base.quote.quoted_unit_price_usd);
  });

  it("target_margin_pct emitted as percent not fraction (30 not 0.30)", () => {
    const r = bridge.build(makeBaseInputs());
    expect(r.quote.target_margin_pct).toBeCloseTo(30, 4);
  });
});

describe("CostEfficiencyBridgeEngine — R12 fail-loud", () => {
  it("Missing program_id throws", () => {
    expect(() => bridge.build(makeBaseInputs({ program_id: "" }))).toThrow(/program_id/);
  });

  it("Missing material throws", () => {
    expect(() => bridge.build({ ...makeBaseInputs(), material: undefined as unknown as MaterialPricing })).toThrow(/material/);
  });

  it("Negative labor rate throws", () => {
    expect(() => bridge.build(makeBaseInputs({
      rates: { ...STANDARD_RATES, labor_usd_per_hour: -1 },
    }))).toThrow(/labor_usd_per_hour/);
  });

  it("Missing tool pricing emits warning (does NOT throw — graceful degrade)", () => {
    const r = bridge.build(makeBaseInputs({
      toolPricing: new Map(),  // empty — no pricing for T14
    }));
    const toolWarn = r.warnings.find(w => /T14|pricing/i.test(w));
    expect(toolWarn).toMatch(/T14/);
    expect(r.per_part.tooling_cost_usd).toBe(0);
  });

  it("Stale material price (>24h) emits warning", () => {
    const oldDate = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const r = bridge.build(makeBaseInputs({
      material: { ...AL6061_MATERIAL, last_updated_iso: oldDate },
    }));
    const staleWarn = r.warnings.find(w => /Material price stale/i.test(w));
    expect(staleWarn).toMatch(/stale/);
  });
});

describe("CostEfficiencyBridgeEngine — cross-machine variability", () => {
  it("Hurco VMX24 vs Haas VF2 on same program → different cycle times → different costs", () => {
    const hurco = bridge.build(makeBaseInputs({ machine: MACHINE_LIBRARY.hurco_vmx24, program_id: "p-hurco" }));
    const haas = bridge.build(makeBaseInputs({ machine: MACHINE_LIBRARY.haas_vf2, program_id: "p-haas" }));
    expect(hurco.per_part.cycle_time_sec).not.toBeCloseTo(haas.per_part.cycle_time_sec, 1);
    expect(hurco.per_part.total_cost_usd).not.toBeCloseTo(haas.per_part.total_cost_usd, 2);
  });

  it("All 4 machines in MACHINE_LIBRARY produce non-zero quote", () => {
    for (const [id, machine] of Object.entries(MACHINE_LIBRARY)) {
      const r = bridge.build(makeBaseInputs({ machine, program_id: `p-${id}` }));
      expect(r.quote.quoted_unit_price_usd).toBeGreaterThan(0);
    }
  });
});

describe("CostEfficiencyBridgeEngine — analytics + confidence", () => {
  it("confidence='high' when no warnings", () => {
    const r = bridge.build(makeBaseInputs());
    if (r.warnings.length === 0) {
      expect(r.quote.confidence).toBe("high");
    }
  });

  it("confidence='medium' when 1-2 warnings (stale material triggers exactly 1)", () => {
    const oldDate = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const r = bridge.build(makeBaseInputs({
      material: { ...AL6061_MATERIAL, last_updated_iso: oldDate },
    }));
    expect(r.quote.confidence).toBe("medium");
  });

  it("revenue_per_spindle_hour > 0 when spindle_hours > 0", () => {
    const r = bridge.build(makeBaseInputs());
    if (r.per_part.spindle_hours > 0) {
      expect(r.analytics.revenue_per_spindle_hour_usd).toBeGreaterThan(0);
    }
  });

  it("data_freshness ages are non-negative", () => {
    const r = bridge.build(makeBaseInputs());
    expect(r.data_freshness.material_price_age_hours).toBeGreaterThanOrEqual(-0.01);
    expect(r.data_freshness.machine_rate_age_hours).toBeGreaterThanOrEqual(-0.01);
  });
});
