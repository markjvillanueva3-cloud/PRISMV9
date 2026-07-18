/**
 * JMDieLatheCapabilityEngine.test.ts
 * ====================================
 *
 * MIKE /goal session (2026-05-24) — vitest contract for the per-machine
 * capability query + PSN-synergy assessment engine.
 *
 * @milestone MIKE-LATHE-CAPABILITY-MS0
 * @unit U-MIKE-LATHE-CAPABILITY-ENGINE
 * @slot mike
 */

import { describe, it, expect } from "vitest";
import { JMDieLatheCapabilityEngine } from "../engines/JMDieLatheCapabilityEngine.js";

describe("getMachine", () => {
  it("returns the full profile for every JM Die Okuma lathe (7 machines)", () => {
    const ids = JMDieLatheCapabilityEngine.listMachines();
    expect(ids).toHaveLength(7);
    for (const id of ids) {
      const m = JMDieLatheCapabilityEngine.getMachine(id);
      expect(m.machine_id).toBe(id);
      expect(m.controller_family).toBe("okuma");
    }
  });

  it("LTH-07 Multus is fully_enhanced with the highest spindle rpm + B-axis", () => {
    const m = JMDieLatheCapabilityEngine.getMachine("LTH-07");
    expect(m.enhancement_tier).toBe("fully_enhanced");
    expect(m.axis_travel.b_deg).toBe(240);
    expect(m.spindle.sub_spindle).toBe(true);
  });

  it("LTH-03 + LTH-04 share OSP-U10L legacy controller (no iMachining)", () => {
    const a = JMDieLatheCapabilityEngine.getMachine("LTH-03");
    const b = JMDieLatheCapabilityEngine.getMachine("LTH-04");
    expect(a.controller_model).toBe("OSP-U10L");
    expect(b.controller_model).toBe("OSP-U10L");
    expect(a.advanced_features.imachining).toBe(false);
    expect(b.advanced_features.imachining).toBe(false);
  });

  it("R12 fail-loud: throws on invalid machine_id format", () => {
    expect(() => JMDieLatheCapabilityEngine.getMachine("INVALID")).toThrow();
    expect(() => JMDieLatheCapabilityEngine.getMachine("VMC-01")).toThrow();
  });

  it("R12 fail-loud: throws on unknown LTH-NN", () => {
    expect(() => JMDieLatheCapabilityEngine.getMachine("LTH-99")).toThrow(/not found/i);
  });
});

describe("assessPSNSynergy — per-machine coverage", () => {
  it("LTH-07 Multus has higher total_coverage than LTH-03 LNC8 (modern beats legacy)", () => {
    const m7 = JMDieLatheCapabilityEngine.assessPSNSynergy("LTH-07");
    const m3 = JMDieLatheCapabilityEngine.assessPSNSynergy("LTH-03");
    expect(m7.total_coverage).toBeGreaterThan(m3.total_coverage);
  });

  it("LTH-03 (U10L) carries the post_plus_software_plus_hardware upgrade ceiling", () => {
    const a = JMDieLatheCapabilityEngine.assessPSNSynergy("LTH-03");
    expect(a.controller_upgrade_ceiling).toBe("post_plus_software_plus_hardware");
    expect(a.upgrade_path[0]).toMatch(/HARDWARE/);
  });

  it("LTH-01 (P300L, plain post) carries post_plus_software upgrade ceiling with POST hint", () => {
    const a = JMDieLatheCapabilityEngine.assessPSNSynergy("LTH-01");
    expect(a.controller_upgrade_ceiling).toBe("post_plus_software");
    expect(a.upgrade_path.join(" | ")).toMatch(/POST/);
  });

  it("LTH-07 (fully_enhanced) carries post_only upgrade ceiling — refinement only", () => {
    const a = JMDieLatheCapabilityEngine.assessPSNSynergy("LTH-07");
    expect(a.controller_upgrade_ceiling).toBe("post_only");
    expect(a.upgrade_path[0]).toMatch(/REFINEMENT/);
  });

  it("per_axis_coverage covers all 10 axes", () => {
    const a = JMDieLatheCapabilityEngine.assessPSNSynergy("LTH-07");
    expect(a.per_axis_coverage).toHaveLength(10);
    const axes = a.per_axis_coverage.map((x) => x.axis);
    expect(axes).toContain("auto_adjustment_features");
    expect(axes).toContain("osp_coding");
    expect(axes).toContain("work_envelope");
  });
});

describe("assessFleetSynergy — fleet rollup", () => {
  it("aggregates all 7 machines + names the weakest axis and weakest machine", () => {
    const r = JMDieLatheCapabilityEngine.assessFleetSynergy();
    expect(r.per_machine).toHaveLength(7);
    expect(r.fleet_total_coverage).toBeGreaterThan(0);
    expect(r.fleet_total_coverage).toBeLessThanOrEqual(1);
    expect(r.weakest_machine).toMatch(/^LTH-\d{2}$/);
  });

  it("weakest_machine is LTH-03 or LTH-04 (legacy U10L) — has null axis_travel + null live tool", () => {
    const r = JMDieLatheCapabilityEngine.assessFleetSynergy();
    expect(["LTH-03", "LTH-04"]).toContain(r.weakest_machine);
  });

  it("fleet_axis_coverage names every axis", () => {
    const r = JMDieLatheCapabilityEngine.assessFleetSynergy();
    expect(Object.keys(r.fleet_axis_coverage)).toHaveLength(10);
    expect(r.fleet_axis_coverage.osp_coding).toBeGreaterThan(0);
  });
});

describe("compareCapabilities — machine-to-machine delta", () => {
  it("LTH-07 vs LTH-03 surfaces multiple differing numeric fields", () => {
    const c = JMDieLatheCapabilityEngine.compareCapabilities("LTH-07", "LTH-03");
    expect(c.per_axis_delta.length).toBeGreaterThan(3);
    expect(c.summary).toMatch(/Multus.*LNC8/);
  });

  it("LTH-07 spindle has higher main_max_rpm than LTH-03 (delta_pct positive direction)", () => {
    const c = JMDieLatheCapabilityEngine.compareCapabilities("LTH-03", "LTH-07");
    const spindleDelta = c.per_axis_delta.find(
      (d) => d.axis === "spindle" && d.field === "main_max_rpm",
    );
    // LTH-07 = 5000 rpm; LTH-03 = 4500 rpm; delta_pct = ((5000-4500)/4500)*100 ~= +11.1
    expect(spindleDelta?.delta_pct).toBeGreaterThan(0);
    expect(spindleDelta?.delta_pct).toBeLessThan(20);
  });
});

describe("recommendUpgradeOrder — priority ranking", () => {
  it("returns all 7 machines ranked", () => {
    const order = JMDieLatheCapabilityEngine.recommendUpgradeOrder();
    expect(order).toHaveLength(7);
    expect(order.map((o) => o.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("LTH-01 + LTH-02 (plain post + upgradeable controller) rank ABOVE LTH-03 + LTH-04 (plain post + hardware-only path)", () => {
    const order = JMDieLatheCapabilityEngine.recommendUpgradeOrder();
    const rankOf = (id: string) => order.find((o) => o.machine_id === id)!.rank;
    expect(rankOf("LTH-01")).toBeLessThan(rankOf("LTH-03"));
    expect(rankOf("LTH-02")).toBeLessThan(rankOf("LTH-04"));
  });

  it("LTH-07 (fully_enhanced) ranks last or near-last (no upgrade pending)", () => {
    const order = JMDieLatheCapabilityEngine.recommendUpgradeOrder();
    const lth07Rank = order.find((o) => o.machine_id === "LTH-07")!.rank;
    expect(lth07Rank).toBeGreaterThanOrEqual(5);
  });
});
