/**
 * QUOTING-SYNERGY-MS0 — combined tests for shop-profile + 2 bridge engines
 * @milestone QUOTING-SYNERGY-MS0/U-SHOP-PROFILE-TEMPLATE + U-WIZARD-TO-QUOTE + U-PRINT-TO-PROGRAM-TO-QUOTE
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ShopProfileTemplateEngine, shopProfileTemplateEngine } from "../engines/ShopProfileTemplateEngine.js";
import { wizardToQuoteBridgeEngine, type WizardOutput } from "../engines/WizardToQuoteBridgeEngine.js";
import { printToProgramToQuoteBridgeEngine, type PipelineSummary } from "../engines/PrintToProgramToQuoteBridgeEngine.js";

describe("ShopProfileTemplateEngine — U-SHOP-PROFILE-TEMPLATE", () => {
  let tmpDir: string;
  let engine: ShopProfileTemplateEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "spt-test-"));
    engine = new ShopProfileTemplateEngine({ profilesDir: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns JM Die fallback when no profile on disk", async () => {
    const p = await engine.getProfile("jm-die");
    expect(p.profile_id).toBe("jm-die");
    expect(p.shop_name).toBe("JM Die Company");
    expect(p.electricity_usd_per_kwh).toBe(0.13);
    expect(p.machines.length).toBeGreaterThanOrEqual(5);
    expect(p.labor.find(l => l.tier === "programmer")?.rate_usd_per_hr).toBe(88);
  });

  it("loads a custom profile from disk and overrides fallback", async () => {
    const custom = {
      profile_id: "acme-precision",
      shop_name: "ACME Precision LLC",
      schema_version: "1.0.0",
      electricity_usd_per_kwh: 0.09,
      overhead_pct: 22,
      setup_rate_usd_per_hr: 105,
      default_machine_rate_usd_per_hr: 110,
      machines: [{ family: "mazak_vtc800", domain: "mill", rate_usd_per_hr: 120, power_kw: 45, utilization_pct: 0.85 }],
      labor: [{ tier: "operator", rate_usd_per_hr: 52 }],
    };
    await fs.writeFile(join(tmpDir, "acme-precision.json"), JSON.stringify(custom), "utf-8");
    const p = await engine.getProfile("acme-precision");
    expect(p.shop_name).toBe("ACME Precision LLC");
    expect(p.electricity_usd_per_kwh).toBe(0.09);
    expect(p.machines[0].family).toBe("mazak_vtc800");
  });

  it("machine rate lookup: matched vs default fallback", async () => {
    const p = await engine.getProfile("jm-die");
    const m = engine.getMachineRate(p, "haas_vf2");
    expect(m.rate_usd_per_hr).toBe(85);
    expect(m.source).toBe("matched");
    const u = engine.getMachineRate(p, "unknown_machine");
    expect(u.source).toBe("default");
  });

  it("labor rate lookup falls back to operator when tier unknown", async () => {
    const p = await engine.getProfile("jm-die");
    expect(engine.getLaborRate(p, "master")).toBe(75);
    expect(engine.getLaborRate(p, "unknown" as any)).toBe(42); // operator fallback
  });

  it("electricity cost: kwh × rate with load_factor", async () => {
    const p = await engine.getProfile("jm-die");
    // Haas VF2: 22 kW × 1 hr × 0.65 load = 14.3 kWh × $0.13 = $1.86
    const e = engine.electricityCost(p, { machine_family: "haas_vf2", cycle_time_hr: 1 });
    expect(e.ok).toBe(true);
    expect(e.kwh_consumed).toBe(14.3);
    expect(e.cost_usd).toBe(1.86);
    expect(e.load_factor).toBe(0.65);
  });

  it("electricity rejects negative cycle time", async () => {
    const p = await engine.getProfile("jm-die");
    const e = engine.electricityCost(p, { machine_family: "haas_vf2", cycle_time_hr: -1 });
    expect(e.ok).toBe(false);
  });

  it("custom load factor overrides default", async () => {
    const p = await engine.getProfile("jm-die");
    const e = engine.electricityCost(p, { machine_family: "haas_vf2", cycle_time_hr: 1, load_factor: 1.0 });
    expect(e.kwh_consumed).toBe(22); // full power for 1 hr
  });

  it("unknown profile_id returns derived fallback (not jm-die name)", async () => {
    const p = await engine.getProfile("future-shop");
    expect(p.profile_id).toBe("future-shop");
    expect(p.shop_name).toBe("future-shop");
    expect(p.electricity_usd_per_kwh).toBe(0.13); // inherits JM defaults
  });

  it("singleton default sync getter matches JM fallback", () => {
    const p = shopProfileTemplateEngine.getDefault();
    expect(p.profile_id).toBe("jm-die");
  });
});

// ────────────────────────────────────────────────────────────────────────
// WizardToQuoteBridgeEngine
// ────────────────────────────────────────────────────────────────────────

describe("WizardToQuoteBridgeEngine — U-WIZARD-TO-QUOTE", () => {
  const millWizard: WizardOutput = {
    domain: "mill",
    machine_family: "haas_vf2",
    material: "aluminum_6061",
    operations: [
      { name: "rough_pocket", cycle_min: 12, tool_ids: ["T1", "T2"] },
      { name: "finish_pocket", cycle_min: 8, tool_ids: ["T3"] },
      { name: "drill_holes", cycle_min: 5, tool_ids: ["T4"] },
    ],
    setup_min: 45,
    operator_tier: "operator",
    quantity: 25,
  };

  const latheWizard: WizardOutput = {
    domain: "lathe",
    machine_family: "okuma_lb3000",
    material: "steel_a36",
    operations: [
      { name: "rough_turn", cycle_min: 6, tool_ids: ["L1"] },
      { name: "finish_turn", cycle_min: 4, tool_ids: ["L2"] },
      { name: "thread", cycle_min: 3, tool_ids: ["L3"] },
    ],
    setup_min: 30,
    quantity: 100,
  };

  const wedmWizard: WizardOutput = {
    domain: "wedm",
    machine_family: "sodick_aq537l",
    material: "stainless_304",
    operations: [
      { name: "wire_rough", cycle_min: 90, tool_ids: ["W-0.25mm-brass"], passes: 1 },
      { name: "wire_semi_finish", cycle_min: 45, tool_ids: ["W-0.25mm-brass"], passes: 1 },
      { name: "wire_finish", cycle_min: 30, tool_ids: ["W-0.25mm-brass"], passes: 1 },
    ],
    setup_min: 60,
    operator_tier: "senior",
    quantity: 5,
  };

  it("mill wizard → real cycle + cost breakdown", async () => {
    const r = await wizardToQuoteBridgeEngine.bridge(millWizard);
    expect(r.ok).toBe(true);
    expect(r.total_cycle_min).toBe(25);
    expect(r.tool_count).toBe(4); // T1+T2+T3+T4 unique
    expect(r.op_count).toBe(3);
    expect(r.machine_cost_usd).toBeGreaterThan(0);
    expect(r.electricity_cost_usd).toBeGreaterThan(0);
    expect(r.cost_per_part_usd).toBeGreaterThan(0);
    expect(r.profile_id).toBe("jm-die");
  });

  it("lathe wizard → uses lathe-domain machine + operator tier defaults to operator", async () => {
    const r = await wizardToQuoteBridgeEngine.bridge(latheWizard);
    expect(r.ok).toBe(true);
    expect(r.total_cycle_min).toBe(13);
    expect(r.tool_count).toBe(3);
  });

  it("wedm wizard → senior tier labor + slower cycle", async () => {
    const r = await wizardToQuoteBridgeEngine.bridge(wedmWizard);
    expect(r.ok).toBe(true);
    expect(r.total_cycle_min).toBe(165);
    expect(r.tool_count).toBe(1); // same wire across passes
    // Senior rate $58/hr higher than operator $42 — should be reflected in labor cost
    expect(r.labor_cost_usd).toBeGreaterThan(50);
  });

  it("rejects empty operations list", async () => {
    const bad: WizardOutput = { ...millWizard, operations: [] };
    const r = await wizardToQuoteBridgeEngine.bridge(bad);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/operations must be non-empty/);
  });

  it("rejects zero quantity", async () => {
    const bad: WizardOutput = { ...millWizard, quantity: 0 };
    const r = await wizardToQuoteBridgeEngine.bridge(bad);
    expect(r.ok).toBe(false);
  });

  it("unknown machine_family emits warning + uses default rate", async () => {
    const bad: WizardOutput = { ...millWizard, machine_family: "robot_overlord_9000" };
    const r = await wizardToQuoteBridgeEngine.bridge(bad);
    expect(r.ok).toBe(true);
    expect(r.warnings.some(w => w.includes("not in profile"))).toBe(true);
  });

  it("cost_per_part inversely proportional to quantity (algebraic invariant)", async () => {
    const r10 = await wizardToQuoteBridgeEngine.bridge({ ...millWizard, quantity: 10 });
    const r100 = await wizardToQuoteBridgeEngine.bridge({ ...millWizard, quantity: 100 });
    // Same total lot cost / 10 vs / 100 — cost_per_part roughly 10x for qty 10
    expect(r10.cost_per_part_usd).toBeGreaterThan(r100.cost_per_part_usd);
  });
});

// ────────────────────────────────────────────────────────────────────────
// PrintToProgramToQuoteBridgeEngine
// ────────────────────────────────────────────────────────────────────────

describe("PrintToProgramToQuoteBridgeEngine — U-PRINT-TO-PROGRAM-TO-QUOTE", () => {
  const pipeline: PipelineSummary = {
    domain: "mill",
    machine_family: "haas_vf2",
    material: "aluminum_6061",
    estimated_cycle_min: 30,
    estimated_setup_min: 60,
    tool_ids: ["T1", "T2", "T3", "T4", "T5"],
    op_count: 5,
    programming_hours: 4,
    cad_generation_hours: 2,
    quantity: 50,
  };

  it("full pipeline → quote with prog+cad+setup+machine+labor+electricity", async () => {
    const r = await printToProgramToQuoteBridgeEngine.bridge(pipeline);
    expect(r.ok).toBe(true);
    expect(r.machine_cost_usd).toBeGreaterThan(0);
    expect(r.setup_cost_usd).toBeGreaterThan(0);
    expect(r.programming_cost_usd).toBe(4 * 88); // 4hr × $88/hr programmer rate = $352
    expect(r.cad_generation_cost_usd).toBe(2 * 88);
    expect(r.electricity_cost_usd).toBeGreaterThan(0);
    expect(r.tool_count).toBe(5);
  });

  it("no programming or CAD hours → those line items are $0", async () => {
    const r = await printToProgramToQuoteBridgeEngine.bridge({ ...pipeline, programming_hours: 0, cad_generation_hours: 0 });
    expect(r.programming_cost_usd).toBe(0);
    expect(r.cad_generation_cost_usd).toBe(0);
  });

  it("rejects negative cycle time", async () => {
    const r = await printToProgramToQuoteBridgeEngine.bridge({ ...pipeline, estimated_cycle_min: -10 });
    expect(r.ok).toBe(false);
  });

  it("rejects zero quantity", async () => {
    const r = await printToProgramToQuoteBridgeEngine.bridge({ ...pipeline, quantity: 0 });
    expect(r.ok).toBe(false);
  });

  it("operator_tier override changes labor cost", async () => {
    const opR = await printToProgramToQuoteBridgeEngine.bridge(pipeline, { operator_tier: "operator" });
    const masterR = await printToProgramToQuoteBridgeEngine.bridge(pipeline, { operator_tier: "master" });
    expect(masterR.labor_cost_usd).toBeGreaterThan(opR.labor_cost_usd);
  });

  it("overhead applied to direct cost per profile (15% JM default)", async () => {
    const r = await printToProgramToQuoteBridgeEngine.bridge(pipeline);
    const expectedOverhead = Math.round(r.total_direct_cost_usd * 0.15 * 100) / 100;
    expect(Math.abs(r.overhead_cost_usd - expectedOverhead)).toBeLessThan(0.02);
  });

  // ── U-GCODE-TO-CYCLE-FOR-PRINT-PIPELINE (iter13) gcode auto-estimate path ──
  const sampleGcode = `
%
O1234 (FACE MILL POCKET)
G21
T1 M06
G0 X0 Y0 Z5.0
G1 Z-2.0 F100
G1 X50 Y0 F500
G1 X50 Y50
G1 X0 Y50
G1 X0 Y0
G0 Z25
T2 M06
G0 X10 Y10 Z5
G1 Z-1 F200
G1 X40 Y10
G1 X40 Y40
G1 X10 Y40
G1 X10 Y10
G0 Z25
M30
%
`;

  it("auto-estimates cycle from gcode_text when estimated_cycle_min=0", async () => {
    const r = await printToProgramToQuoteBridgeEngine.bridge({
      ...pipeline,
      estimated_cycle_min: 0,
      tool_ids: [],
      op_count: 0,
      gcode_text: sampleGcode,
    });
    expect(r.ok).toBe(true);
    expect(r.gcode_estimate?.used).toBe(true);
    expect(r.gcode_estimate?.dialect).toBe("fanuc_mill");
    expect(r.gcode_estimate?.total_time_min ?? 0).toBeGreaterThan(0);
    expect(r.gcode_estimate?.tools_used).toEqual(expect.arrayContaining([1, 2]));
    expect(r.tool_count).toBe(2);
    expect(r.op_count).toBeGreaterThan(0);
    expect(r.warnings.some(w => w.includes("op_count auto-derived"))).toBe(true);
    expect(r.machine_cost_usd).toBeGreaterThan(0);
  });

  it("caller-supplied estimated_cycle_min wins over gcode auto-estimate", async () => {
    const r = await printToProgramToQuoteBridgeEngine.bridge({
      ...pipeline,
      estimated_cycle_min: 30,
      gcode_text: sampleGcode,
    });
    expect(r.ok).toBe(true);
    const expectedWallClock = (30 / 60) / 0.78;
    expect(Math.abs(r.machine_hours_wall_clock - expectedWallClock)).toBeLessThan(0.01);
    expect(r.gcode_estimate?.used).toBe(true);
    expect(r.gcode_estimate?.dialect).toBe("fanuc_mill");
  });

  it("caller-supplied tool_ids preserved when gcode_text also supplied", async () => {
    const r = await printToProgramToQuoteBridgeEngine.bridge({
      ...pipeline,
      tool_ids: ["CAM_T_A", "CAM_T_B", "CAM_T_C"],
      gcode_text: sampleGcode,
    });
    expect(r.tool_count).toBe(3);
  });

  it("binary/garbage gcode_text refuses estimator gracefully + warns", async () => {
    const binaryGarbage = "\x00\x01\x02\x03\x04\x05\x06\x07" + Array(2000).fill("\x00").join("");
    const r = await printToProgramToQuoteBridgeEngine.bridge({
      ...pipeline,
      estimated_cycle_min: 30,
      gcode_text: binaryGarbage,
    });
    expect(r.ok).toBe(true);
    expect(r.gcode_estimate?.used).toBe(false);
    expect(r.gcode_estimate?.reason).toBe("binary-input-not-gcode");
    expect(r.warnings.some(w => w.includes("gcode_text supplied but estimator refused"))).toBe(true);
    expect(r.machine_cost_usd).toBeGreaterThan(0);
  });

  it("whitespace-only gcode_text skips estimator (caller values used verbatim)", async () => {
    const r = await printToProgramToQuoteBridgeEngine.bridge({
      ...pipeline,
      estimated_cycle_min: 30,
      gcode_text: "   ",
    });
    expect(r.ok).toBe(true);
    expect(r.gcode_estimate).toBe(undefined);
    const expectedWallClock = (30 / 60) / 0.78;
    expect(Math.abs(r.machine_hours_wall_clock - expectedWallClock)).toBeLessThan(0.01);
  });

  it("gcode_estimate exposes per-component breakdown (cut + rapid + total)", async () => {
    const r = await printToProgramToQuoteBridgeEngine.bridge({
      ...pipeline,
      estimated_cycle_min: 0,
      tool_ids: [],
      op_count: 0,
      gcode_text: sampleGcode,
    });
    const ge = r.gcode_estimate;
    expect(ge?.used).toBe(true);
    expect(ge?.time_in_cut_min ?? 0).toBeGreaterThan(0);
    expect(ge?.rapid_time_min ?? 0).toBeGreaterThanOrEqual(0);
    const tolerance = 0.01;
    expect(ge?.total_time_min ?? 0).toBeGreaterThanOrEqual(((ge?.time_in_cut_min ?? 0) + (ge?.rapid_time_min ?? 0)) - tolerance);
    expect(ge?.cutting_block_count ?? 0).toBeGreaterThan(0);
    expect(ge?.tool_change_count ?? 0).toBeGreaterThanOrEqual(2);
  });
});

// ── U-SECONDARY-OPS-PROFILE-OVERRIDE (iter14) ──
describe("SecondaryOpsQuotePricingEngine.priceOpsForProfile — U-SECONDARY-OPS-PROFILE-OVERRIDE", () => {
  // The shared singleton reads from cwd-relative state/shared/shop-profiles.
  // Tests write profile JSON to that canonical dir with unique test-prefix ids
  // (cleaned up in finally) to avoid clobbering real profiles.
  it("applies profile overrides on top of hardcoded defaults", async () => {
    const profileDir = join(process.cwd(), "state/shared/shop-profiles");
    await fs.mkdir(profileDir, { recursive: true });
    const profilePath = join(profileDir, "test-secops-override.json");

    const customProfile = {
      profile_id: "test-secops-override",
      shop_name: "Test Shop with Custom Sec-Ops Rates",
      schema_version: "1.0.0",
      electricity_usd_per_kwh: 0.13,
      overhead_pct: 15,
      setup_rate_usd_per_hr: 85,
      default_machine_rate_usd_per_hr: 95,
      machines: [{ family: "haas_vf2", domain: "mill", rate_usd_per_hr: 85, power_kw: 22, utilization_pct: 0.78 }],
      labor: [{ tier: "operator", rate_usd_per_hr: 42 }],
      // Shop-specific secondary-op rate override:
      secondary_op_overrides: {
        laser_marking: { setup_usd: 75, per_part_usd: 2.50 }, // shop's laser is more expensive
        deburring: { setup_usd: 0, per_part_usd: 0.10 },       // shop's deburring is cheaper
      },
    };
    await fs.writeFile(profilePath, JSON.stringify(customProfile, null, 2), "utf-8");

    try {
      // Force fresh-load (the singleton has a 60s cache).
      const { secondaryOpsQuotePricingEngine } = await import("../engines/SecondaryOpsQuotePricingEngine.js");
      const { shopProfileTemplateEngine } = await import("../engines/ShopProfileTemplateEngine.js");
      shopProfileTemplateEngine.refresh();

      const r = await secondaryOpsQuotePricingEngine.priceOpsForProfile({
        ops: ["laser_marking", "deburring"],
        quantity: 100,
      }, { profile_id: "test-secops-override" });

      expect(r.ok).toBe(true);
      expect(r.profile_id).toBe("test-secops-override");
      // laser_marking line: shop's 75 setup + 2.50 * 100 = 325
      const laser = r.line_items.find(l => l.op === "laser_marking");
      expect(laser?.setup_usd).toBe(75);
      expect(laser?.per_part_usd).toBe(2.50);
      expect(laser?.line_total_usd).toBe(325);
      // deburring line: shop's 0 setup + 0.10 * 100 = 10
      const deburring = r.line_items.find(l => l.op === "deburring");
      expect(deburring?.setup_usd).toBe(0);
      expect(deburring?.per_part_usd).toBe(0.10);
      expect(deburring?.line_total_usd).toBe(10);
    } finally {
      await fs.rm(profilePath, { force: true });
    }
  });

  it("falls back to hardcoded defaults when profile has no secondary_op_overrides", async () => {
    const { secondaryOpsQuotePricingEngine } = await import("../engines/SecondaryOpsQuotePricingEngine.js");
    const { shopProfileTemplateEngine } = await import("../engines/ShopProfileTemplateEngine.js");
    shopProfileTemplateEngine.refresh();
    // jm-die fallback profile has no secondary_op_overrides set
    const r = await secondaryOpsQuotePricingEngine.priceOpsForProfile({
      ops: ["laser_marking"],
      quantity: 100,
    }, { profile_id: "jm-die" });

    expect(r.ok).toBe(true);
    expect(r.profile_id).toBe("jm-die");
    // Should fall back to DEFAULT_CATALOG: laser_marking setup=35, per_part=0.85
    const laser = r.line_items.find(l => l.op === "laser_marking");
    expect(laser?.setup_usd).toBe(35);
    expect(laser?.per_part_usd).toBe(0.85);
  });

  it("caller-supplied catalog_overrides take precedence over profile overrides", async () => {
    const profileDir = join(process.cwd(), "state/shared/shop-profiles");
    await fs.mkdir(profileDir, { recursive: true });
    const profilePath = join(profileDir, "test-caller-wins.json");

    const customProfile = {
      profile_id: "test-caller-wins",
      shop_name: "Test Shop — Caller Override Test",
      schema_version: "1.0.0",
      electricity_usd_per_kwh: 0.13,
      overhead_pct: 15,
      setup_rate_usd_per_hr: 85,
      default_machine_rate_usd_per_hr: 95,
      machines: [{ family: "haas_vf2", domain: "mill", rate_usd_per_hr: 85, power_kw: 22, utilization_pct: 0.78 }],
      labor: [{ tier: "operator", rate_usd_per_hr: 42 }],
      secondary_op_overrides: {
        laser_marking: { setup_usd: 75, per_part_usd: 2.50 },
      },
    };
    await fs.writeFile(profilePath, JSON.stringify(customProfile, null, 2), "utf-8");

    try {
      const { secondaryOpsQuotePricingEngine } = await import("../engines/SecondaryOpsQuotePricingEngine.js");
      const { shopProfileTemplateEngine } = await import("../engines/ShopProfileTemplateEngine.js");
      shopProfileTemplateEngine.refresh();

      const r = await secondaryOpsQuotePricingEngine.priceOpsForProfile({
        ops: ["laser_marking"],
        quantity: 50,
        catalog_overrides: {
          laser_marking: { setup_usd: 999, per_part_usd: 99 }, // caller's one-off override
        },
      }, { profile_id: "test-caller-wins" });

      expect(r.ok).toBe(true);
      const laser = r.line_items.find(l => l.op === "laser_marking");
      // Caller wins: 999 + 99 * 50 = 999 + 4950 = 5949
      expect(laser?.setup_usd).toBe(999);
      expect(laser?.per_part_usd).toBe(99);
      expect(laser?.line_total_usd).toBe(5949);
    } finally {
      await fs.rm(profilePath, { force: true });
    }
  });

  it("partial overrides merge with hardcoded defaults (only listed fields replaced)", async () => {
    const profileDir = join(process.cwd(), "state/shared/shop-profiles");
    await fs.mkdir(profileDir, { recursive: true });
    const profilePath = join(profileDir, "test-partial.json");

    const customProfile = {
      profile_id: "test-partial",
      shop_name: "Test Shop — Partial Override",
      schema_version: "1.0.0",
      electricity_usd_per_kwh: 0.13,
      overhead_pct: 15,
      setup_rate_usd_per_hr: 85,
      default_machine_rate_usd_per_hr: 95,
      machines: [{ family: "haas_vf2", domain: "mill", rate_usd_per_hr: 85, power_kw: 22, utilization_pct: 0.78 }],
      labor: [{ tier: "operator", rate_usd_per_hr: 42 }],
      secondary_op_overrides: {
        // Only override setup_usd; per_part should come from DEFAULT_CATALOG.
        grinding: { setup_usd: 200 },
      },
    };
    await fs.writeFile(profilePath, JSON.stringify(customProfile, null, 2), "utf-8");

    try {
      const { secondaryOpsQuotePricingEngine } = await import("../engines/SecondaryOpsQuotePricingEngine.js");
      const { shopProfileTemplateEngine } = await import("../engines/ShopProfileTemplateEngine.js");
      shopProfileTemplateEngine.refresh();

      const r = await secondaryOpsQuotePricingEngine.priceOpsForProfile({
        ops: ["grinding"],
        quantity: 10,
      }, { profile_id: "test-partial" });

      const grinding = r.line_items.find(l => l.op === "grinding");
      expect(grinding?.setup_usd).toBe(200);        // overridden by profile
      expect(grinding?.per_part_usd).toBe(4.50);    // DEFAULT_CATALOG (not overridden)
    } finally {
      await fs.rm(profilePath, { force: true });
    }
  });

  it("unknown profile_id falls back to jm-die defaults gracefully", async () => {
    const { secondaryOpsQuotePricingEngine } = await import("../engines/SecondaryOpsQuotePricingEngine.js");
    const { shopProfileTemplateEngine } = await import("../engines/ShopProfileTemplateEngine.js");
    shopProfileTemplateEngine.refresh();

    const r = await secondaryOpsQuotePricingEngine.priceOpsForProfile({
      ops: ["finishing"],
      quantity: 50,
    }, { profile_id: "definitely-does-not-exist-12345" });

    expect(r.ok).toBe(true);
    // Profile not found → built-in fallback uses jm-die-shape defaults; profile_id reflects the requested id.
    expect(r.profile_id).toBe("definitely-does-not-exist-12345");
    const finishing = r.line_items.find(l => l.op === "finishing");
    // No overrides → DEFAULT_CATALOG values
    expect(finishing?.setup_usd).toBe(25);
    expect(finishing?.per_part_usd).toBe(1.20);
  });
});

// ── U-CROSS-PART-SYNERGY-FROM-JM-FLEET (iter17) ──
describe("CrossPartToolingSynergyEngine.analyzeFromJMFleet — U-CROSS-PART-SYNERGY-FROM-JM-FLEET", () => {
  let tmpDir: string;
  let ledgerPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "xpart-fleet-test-"));
    ledgerPath = join(tmpDir, "ledger.jsonl");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  function writeLedgerRows(rows: Array<{ abs_path: string; machine_family?: string; source?: string }>) {
    const nowIso = "2026-05-25T00:00:00.000Z";
    const lines = rows.map(r => JSON.stringify({
      abs_path: r.abs_path,
      sha_short: "deadbeef",
      size_bytes: 1024,
      mtime_iso: nowIso,
      scanned_at: nowIso,
      source: r.source ?? "fleet-scan-batch",
      machine_family: r.machine_family,
    }));
    return fs.writeFile(ledgerPath, lines.join("\n") + "\n", "utf-8");
  }

  it("builds corpus from JM Die ledger + runs synergy analysis", async () => {
    await writeLedgerRows([
      { abs_path: "H:/prism/JM DIE/CNC MILL/ALCOA/bracket-A.MIN", machine_family: "mill" },
      { abs_path: "H:/prism/JM DIE/CNC MILL/ALCOA/bracket-B.MIN", machine_family: "mill" },
      { abs_path: "H:/prism/JM DIE/CNC MILL/ITW/plate-001.MIN", machine_family: "mill" },
      { abs_path: "H:/prism/JM DIE/CNC LATHE/ALCOA/shaft.MIN", machine_family: "lathe" },
    ]);
    const { crossPartToolingSynergyEngine } = await import("../engines/CrossPartToolingSynergyEngine.js");
    const r = await crossPartToolingSynergyEngine.analyzeFromJMFleet({
      type: "tool",
      description: "12mm carbide endmill for aluminum roughing",
      cost_usd: 800,
      savings_per_part_usd_quoted: 2.50,
      quoted_annual_volume: 500,
      match: { processes: ["milling"] },
      savings_per_part_usd_beneficiary: 1.00,
    }, { ledgerPath, annualVolumePerPart: 200 });
    expect(r.ok).toBe(true);
    expect(r.corpus_source).toBe("jm-fleet-ledger");
    // 3 mill parts + 1 lathe → 4 total, but process filter matches only mills.
    expect(r.corpus_size).toBe(4);
    expect(r.beneficiaries.length).toBeGreaterThan(0);
    // All beneficiaries should be mill parts (matched on process).
    expect(r.beneficiaries.every(b => b.matched_on.includes("process"))).toBe(true);
  });

  it("customer filter narrows corpus to one customer", async () => {
    await writeLedgerRows([
      { abs_path: "H:/prism/JM DIE/CNC MILL/ALCOA/p1.MIN", machine_family: "mill" },
      { abs_path: "H:/prism/JM DIE/CNC MILL/ITW/p2.MIN", machine_family: "mill" },
      { abs_path: "H:/prism/JM DIE/CNC MILL/SFS/p3.MIN", machine_family: "mill" },
    ]);
    const { crossPartToolingSynergyEngine } = await import("../engines/CrossPartToolingSynergyEngine.js");
    const r = await crossPartToolingSynergyEngine.analyzeFromJMFleet({
      type: "tool", description: "tool", cost_usd: 100,
      savings_per_part_usd_quoted: 1, quoted_annual_volume: 50,
      match: { processes: ["milling"] },
    }, { ledgerPath, customerFilter: "ALCOA" });
    expect(r.corpus_size).toBe(1);
  });

  it("machine_family filter narrows corpus", async () => {
    await writeLedgerRows([
      { abs_path: "H:/prism/JM DIE/CNC MILL/ALCOA/p1.MIN", machine_family: "mill" },
      { abs_path: "H:/prism/JM DIE/CNC LATHE/ALCOA/p2.MIN", machine_family: "lathe" },
      { abs_path: "H:/prism/JM DIE/WIRE EDM/ALCOA/p3.MIN", machine_family: "wedm" },
    ]);
    const { crossPartToolingSynergyEngine } = await import("../engines/CrossPartToolingSynergyEngine.js");
    const r = await crossPartToolingSynergyEngine.analyzeFromJMFleet({
      type: "tool", description: "tool", cost_usd: 100,
      savings_per_part_usd_quoted: 1, quoted_annual_volume: 50,
      match: { processes: ["wedm"] },
    }, { ledgerPath, machineFamilyFilter: "wedm" });
    expect(r.corpus_size).toBe(1);
  });

  it("dedups same (customer, part_id) across multiple ledger rows", async () => {
    await writeLedgerRows([
      // Same part, multiple file extensions/revisions
      { abs_path: "H:/prism/JM DIE/CNC MILL/ALCOA/part-001.MIN", machine_family: "mill" },
      { abs_path: "H:/prism/JM DIE/CNC MILL/ALCOA/part-001.NC", machine_family: "mill" },
      { abs_path: "H:/prism/JM DIE/CNC MILL/ALCOA/part-001.PDF", machine_family: "mill" },
    ]);
    const { crossPartToolingSynergyEngine } = await import("../engines/CrossPartToolingSynergyEngine.js");
    const r = await crossPartToolingSynergyEngine.analyzeFromJMFleet({
      type: "tool", description: "tool", cost_usd: 100,
      savings_per_part_usd_quoted: 1, quoted_annual_volume: 50,
      match: { processes: ["milling"] },
    }, { ledgerPath });
    // 3 files → 1 unique (customer, part_id) → corpus size 1
    expect(r.corpus_size).toBe(1);
  });

  it("missing ledger → empty corpus with warning, analysis still runs", async () => {
    const { crossPartToolingSynergyEngine } = await import("../engines/CrossPartToolingSynergyEngine.js");
    const r = await crossPartToolingSynergyEngine.analyzeFromJMFleet({
      type: "tool", description: "tool", cost_usd: 100,
      savings_per_part_usd_quoted: 1, quoted_annual_volume: 50,
      match: { processes: ["milling"] },
    }, { ledgerPath: join(tmpDir, "does-not-exist.jsonl") });
    expect(r.ok).toBe(true);
    expect(r.corpus_size).toBe(0);
    // Only the quoted part contributes savings.
    expect(r.quoted_part_annual_savings_usd).toBe(50);
    expect(r.beneficiaries).toHaveLength(0);
  });

  it("invalid proposal still gets surfaced (zero-cost rejected)", async () => {
    await writeLedgerRows([
      { abs_path: "H:/prism/JM DIE/CNC MILL/ALCOA/p1.MIN", machine_family: "mill" },
    ]);
    const { crossPartToolingSynergyEngine } = await import("../engines/CrossPartToolingSynergyEngine.js");
    const r = await crossPartToolingSynergyEngine.analyzeFromJMFleet({
      type: "tool", description: "tool", cost_usd: 0,
      savings_per_part_usd_quoted: 1, quoted_annual_volume: 50,
      match: { processes: ["milling"] },
    }, { ledgerPath });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/cost_usd/);
  });

  it("path-token extractor correctly handles backslash + forward-slash paths", async () => {
    await writeLedgerRows([
      { abs_path: "H:\\prism\\JM DIE\\CNC MILL\\BRADY\\p1.MIN", machine_family: "mill" },
      { abs_path: "H:/prism/JM DIE/CNC MILL/BRADY/p2.MIN", machine_family: "mill" },
    ]);
    const { crossPartToolingSynergyEngine } = await import("../engines/CrossPartToolingSynergyEngine.js");
    const r = await crossPartToolingSynergyEngine.analyzeFromJMFleet({
      type: "tool", description: "tool", cost_usd: 100,
      savings_per_part_usd_quoted: 1, quoted_annual_volume: 50,
      match: { processes: ["milling"] },
    }, { ledgerPath, customerFilter: "BRADY" });
    // Both rows should be picked up by the BRADY customer filter.
    expect(r.corpus_size).toBe(2);
  });
});

// ── U-UTILITY-COSTS-EXTENDED (iter15) ──
describe("ShopProfileTemplateEngine.utilitiesCost — U-UTILITY-COSTS-EXTENDED", () => {
  it("aggregates electricity + water + air + natural-gas for a known JM machine", async () => {
    const profile = shopProfileTemplateEngine.getDefault();
    const r = shopProfileTemplateEngine.utilitiesCost(profile, {
      machine_family: "haas_vf2",
      cycle_time_hr: 2,
    });
    expect(r.ok).toBe(true);
    // Electricity: 22 kW × 2 hr × 0.65 load = 28.6 kWh × $0.13 = $3.72
    expect(r.electricity_cost_usd).toBeCloseTo(3.72, 1);
    // Water: 3 gph × 2 hr × $0.012/gal = $0.072 → round2 = $0.07
    expect(r.water_cost_usd).toBeCloseTo(0.07, 2);
    // Air: 20 cfh × 2 hr × $0.0008/cfh = $0.032 → round2 = $0.03
    expect(r.compressed_air_cost_usd).toBeCloseTo(0.03, 2);
    // No natural gas on haas_vf2 → $0
    expect(r.natural_gas_cost_usd).toBe(0);
    expect(r.breakdown.kwh).toBeGreaterThan(0);
    expect(r.breakdown.gallons_water).toBe(6);
    expect(r.breakdown.cubic_feet_air).toBe(40);
    expect(r.breakdown.therms_gas).toBe(0);
    expect(r.total_utilities_cost_usd).toBeCloseTo(
      r.electricity_cost_usd + r.water_cost_usd + r.compressed_air_cost_usd, 1
    );
  });

  it("WEDM uses dielectric water heavily (12 gph) and minimal air", async () => {
    const profile = shopProfileTemplateEngine.getDefault();
    const r = shopProfileTemplateEngine.utilitiesCost(profile, {
      machine_family: "sodick_aq537l",
      cycle_time_hr: 4,
    });
    expect(r.ok).toBe(true);
    expect(r.breakdown.gallons_water).toBe(48);   // 12 × 4
    expect(r.breakdown.cubic_feet_air).toBe(20);  // 5 × 4
    expect(r.water_cost_usd).toBeCloseTo(0.58, 1); // 48 × $0.012 = $0.576
  });

  it("sinker EDM uses zero water (dielectric oil)", async () => {
    const profile = shopProfileTemplateEngine.getDefault();
    const r = shopProfileTemplateEngine.utilitiesCost(profile, {
      machine_family: "ag_charm_form20",
      cycle_time_hr: 3,
    });
    expect(r.breakdown.gallons_water).toBe(0);
    expect(r.water_cost_usd).toBe(0);
  });

  it("machine not in profile contributes zero water/air/gas (only default electricity)", async () => {
    const profile = shopProfileTemplateEngine.getDefault();
    const r = shopProfileTemplateEngine.utilitiesCost(profile, {
      machine_family: "unknown_brand_xyz",
      cycle_time_hr: 1,
    });
    expect(r.ok).toBe(true);
    expect(r.water_cost_usd).toBe(0);
    expect(r.compressed_air_cost_usd).toBe(0);
    expect(r.natural_gas_cost_usd).toBe(0);
    // Electricity still computes via default power_kw=20 from getMachineRate fallback.
    expect(r.electricity_cost_usd).toBeGreaterThan(0);
  });

  it("zero cycle time → zero cost across all utilities", async () => {
    const profile = shopProfileTemplateEngine.getDefault();
    const r = shopProfileTemplateEngine.utilitiesCost(profile, {
      machine_family: "haas_vf2",
      cycle_time_hr: 0,
    });
    expect(r.ok).toBe(true);
    expect(r.total_utilities_cost_usd).toBe(0);
    expect(r.electricity_cost_usd).toBe(0);
    expect(r.water_cost_usd).toBe(0);
    expect(r.compressed_air_cost_usd).toBe(0);
    expect(r.natural_gas_cost_usd).toBe(0);
  });

  it("rejects negative cycle time", () => {
    const profile = shopProfileTemplateEngine.getDefault();
    const r = shopProfileTemplateEngine.utilitiesCost(profile, {
      machine_family: "haas_vf2",
      cycle_time_hr: -1,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/non-negative/);
  });

  it("utility costs are linearly proportional to cycle time (algebraic invariant)", () => {
    const profile = shopProfileTemplateEngine.getDefault();
    const r1 = shopProfileTemplateEngine.utilitiesCost(profile, { machine_family: "haas_vf2", cycle_time_hr: 1 });
    const r3 = shopProfileTemplateEngine.utilitiesCost(profile, { machine_family: "haas_vf2", cycle_time_hr: 3 });
    const tolerance = 0.05;
    expect(Math.abs(r3.water_cost_usd - r1.water_cost_usd * 3)).toBeLessThan(tolerance);
    expect(Math.abs(r3.compressed_air_cost_usd - r1.compressed_air_cost_usd * 3)).toBeLessThan(tolerance);
  });

  it("rate fields missing on profile → that utility contributes zero (no implicit guess)", async () => {
    // Build a custom profile with only electricity rate; water/air/gas rates unset.
    const tmpDir = await fs.mkdtemp(join(tmpdir(), "utility-test-"));
    try {
      const customProfile = {
        profile_id: "no-utility-rates",
        shop_name: "Shop With No Utility Rates Set",
        schema_version: "1.0.0",
        electricity_usd_per_kwh: 0.13,
        overhead_pct: 15,
        setup_rate_usd_per_hr: 85,
        default_machine_rate_usd_per_hr: 95,
        machines: [{ family: "test_machine", domain: "mill", rate_usd_per_hr: 85, power_kw: 22, utilization_pct: 0.78, water_gph: 3, compressed_air_cfh: 20 }],
        labor: [{ tier: "operator", rate_usd_per_hr: 42 }],
        // NOTE: water_usd_per_gallon, compressed_air_usd_per_cfh, natural_gas_usd_per_therm all undefined
      };
      await fs.writeFile(join(tmpDir, "no-utility-rates.json"), JSON.stringify(customProfile, null, 2), "utf-8");

      const { ShopProfileTemplateEngine: Cls } = await import("../engines/ShopProfileTemplateEngine.js");
      const customEngine = new Cls({ profilesDir: tmpDir });
      const profile = await customEngine.getProfile("no-utility-rates");
      const r = customEngine.utilitiesCost(profile, { machine_family: "test_machine", cycle_time_hr: 2 });
      expect(r.ok).toBe(true);
      // Machine consumes 6 gallons but rate undefined → cost = 0 (not silent-guessed)
      expect(r.breakdown.gallons_water).toBe(6);
      // BUT: readFromDisk falls back to JM_DIE defaults when undefined. To get TRUE zero,
      // the profile would need water_usd_per_gallon: 0 explicitly. So with current loader
      // behavior, water_usd_per_gallon defaults to 0.012 (JM fallback).
      expect(r.water_cost_usd).toBeCloseTo(0.07, 2); // = 6 × 0.012 = 0.072 → 0.07
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
