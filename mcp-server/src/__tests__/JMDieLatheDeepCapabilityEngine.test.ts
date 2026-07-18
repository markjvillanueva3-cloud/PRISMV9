/**
 * JMDieLatheDeepCapabilityEngine.test.ts
 * =======================================
 *
 * Locks the physics-derived per-material cutting envelope + threading +
 * turret + workholding + cycle benchmarks + macro programming engine.
 *
 * @milestone MIKE-LATHE-CAPABILITY-MS0
 * @unit U-MIKE-LATHE-DEEP-CAPABILITY-ENGINE
 * @slot mike
 */

import { describe, it, expect } from "vitest";
import {
  JMDieLatheDeepCapabilityEngine,
  computeCuttingEnvelope,
} from "../engines/JMDieLatheDeepCapabilityEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

describe("computeCuttingEnvelope — pure physics function", () => {
  it("references CANONICAL_KIENZLE + CANONICAL_TAYLOR (zero inlining)", () => {
    // Multus-class: 22 kW / 200 Nm / 5000 rpm
    const env = computeCuttingEnvelope(22, 200, 5000, "P");
    expect(env.iso_group).toBe("P");
    // P-group Taylor C=350 n=0.25 → Vc_recommended at T=30: 350/30^0.25 ~= 149.5 m/min
    const expected_vc = CANONICAL_TAYLOR.P.C / Math.pow(30, CANONICAL_TAYLOR.P.n);
    expect(env.vc_recommended_m_min).toBeCloseTo(Math.min(expected_vc, (Math.PI * 50 * 5000) / 1000), 0);
  });

  it("Vc-conservative (T=60) is LOWER than Vc-recommended (T=30) which is LOWER than Vc-aggressive (T=15)", () => {
    const env = computeCuttingEnvelope(22, 200, 5000, "P");
    expect(env.vc_conservative_m_min).toBeLessThan(env.vc_recommended_m_min);
    expect(env.vc_recommended_m_min).toBeLessThan(env.vc_aggressive_m_min);
  });

  it("aluminum (N-group) Vc is much higher than hardened steel (H-group)", () => {
    const env_N = computeCuttingEnvelope(22, 200, 5000, "N");
    const env_H = computeCuttingEnvelope(22, 200, 5000, "H");
    expect(env_N.vc_recommended_m_min).toBeGreaterThan(env_H.vc_recommended_m_min);
  });

  it("higher-power machine has higher MRR ceiling for same material", () => {
    const env_low = computeCuttingEnvelope(11, 110, 4500, "P");   // LNC8 class
    const env_high = computeCuttingEnvelope(30, 1500, 2500, "P"); // LB3000 class
    expect(env_high.max_mrr_cm3_min).toBeGreaterThan(env_low.max_mrr_cm3_min);
  });

  it("spindle_force_headroom_pct is non-negative when envelope is feasible", () => {
    const env = computeCuttingEnvelope(22, 200, 5000, "P");
    expect(env.spindle_force_headroom_pct).toBeGreaterThanOrEqual(0);
    expect(env.spindle_force_headroom_pct).toBeLessThan(100);
  });

  it("RPM cap kicks in at small reference diameter on high-rpm spindle", () => {
    // 5000 rpm @ D=10mm → Vc cap = π*10*5000/1000 = 157 m/min
    const env = computeCuttingEnvelope(22, 200, 5000, "N", 30, 10);
    const rpm_cap_vc = (Math.PI * 10 * 5000) / 1000;
    expect(env.vc_recommended_m_min).toBeLessThanOrEqual(rpm_cap_vc + 0.01);
  });
});

describe("getDeepCapabilities — per-machine", () => {
  it("returns complete profile for every JM Die lathe (7 machines)", () => {
    const ids = ["LTH-01", "LTH-02", "LTH-03", "LTH-04", "LTH-05", "LTH-06", "LTH-07"];
    for (const id of ids) {
      const d = JMDieLatheDeepCapabilityEngine.getDeepCapabilities(id);
      expect(d.machine_id).toBe(id);
      expect(Object.keys(d.cutting_envelopes_per_iso_group)).toEqual(["P", "M", "K", "N", "S", "H"]);
      expect(d.threading.thread_types.length).toBeGreaterThan(0);
      expect(d.turret.station_count).toBeGreaterThan(0);
    }
  });

  it("LTH-07 Multus turret has 40 stations + all driven (mill-turn)", () => {
    const d = JMDieLatheDeepCapabilityEngine.getDeepCapabilities("LTH-07");
    expect(d.turret.station_count).toBe(40);
    expect(d.turret.driven_stations).toBe(40);
    expect(d.turret.mount_standard).toBe("Custom");
  });

  it("LTH-03 LNC8 turret has 12 VDI stations + ZERO driven (no live tooling)", () => {
    const d = JMDieLatheDeepCapabilityEngine.getDeepCapabilities("LTH-03");
    expect(d.turret.station_count).toBe(12);
    expect(d.turret.mount_standard).toBe("VDI");
    expect(d.turret.driven_stations).toBe(0);
  });

  it("LTH-06 LB 3000EX uses BMT mount standard", () => {
    const d = JMDieLatheDeepCapabilityEngine.getDeepCapabilities("LTH-06");
    expect(d.turret.mount_standard).toBe("BMT");
  });
});

describe("threading capability per controller", () => {
  it("LTH-03/04 (OSP-U10L) cannot do tapered threading + no sub-spindle sync", () => {
    const d3 = JMDieLatheDeepCapabilityEngine.getDeepCapabilities("LTH-03");
    expect(d3.threading.tapered_threading).toBe(false);
    expect(d3.threading.sub_spindle_sync_threading).toBe(false);
    expect(d3.threading.thread_types).not.toContain("NPT");
  });

  it("LTH-07 Multus can do tapered + sub-spindle sync (has sub-spindle)", () => {
    const d = JMDieLatheDeepCapabilityEngine.getDeepCapabilities("LTH-07");
    expect(d.threading.tapered_threading).toBe(true);
    expect(d.threading.sub_spindle_sync_threading).toBe(true);
    expect(d.threading.thread_types).toContain("NPT");
  });

  it("LTH-01 GENOS L300 supports tapered threading but no sub-spindle sync (single spindle)", () => {
    const d = JMDieLatheDeepCapabilityEngine.getDeepCapabilities("LTH-01");
    expect(d.threading.tapered_threading).toBe(true);
    expect(d.threading.sub_spindle_sync_threading).toBe(false);
  });
});

describe("macro programming envelope per controller", () => {
  it("OSP-U10L legacy controller has NO IF..THEN + NO WHILE..DO + 100 vars", () => {
    const d = JMDieLatheDeepCapabilityEngine.getDeepCapabilities("LTH-03");
    expect(d.macro_programming.if_then_supported).toBe(false);
    expect(d.macro_programming.while_do_supported).toBe(false);
    expect(d.macro_programming.common_var_count).toBe(100);
    expect(d.macro_programming.user_task_programmable).toBe(false);
  });

  it("OSP-P300SA (Multus) has User Task + 1000 vars + deeper call depth", () => {
    const d = JMDieLatheDeepCapabilityEngine.getDeepCapabilities("LTH-07");
    expect(d.macro_programming.if_then_supported).toBe(true);
    expect(d.macro_programming.while_do_supported).toBe(true);
    expect(d.macro_programming.common_var_count).toBe(1000);
    expect(d.macro_programming.user_task_programmable).toBe(true);
    expect(d.macro_programming.subprogram_call_depth).toBe(16);
  });
});

describe("recommendParametersFor — full per-material envelope + Taylor life", () => {
  it("returns envelope + projected lives for LTH-07 in steel (P)", () => {
    const r = JMDieLatheDeepCapabilityEngine.recommendParametersFor("LTH-07", "P");
    expect(r.machine_id).toBe("LTH-07");
    expect(r.envelope.vc_recommended_m_min).toBeGreaterThan(0);
    expect(r.projected_life_min_at_recommended).toBeGreaterThan(0);
    // Aggressive cuts have shorter projected life
    expect(r.projected_life_min_at_aggressive).toBeLessThan(r.projected_life_min_at_recommended);
  });

  it("R12 fail-loud: throws on invalid iso_group", () => {
    expect(() => JMDieLatheDeepCapabilityEngine.recommendParametersFor("LTH-07", "Z" as never)).toThrow();
  });
});

describe("rankFleetByMRR — cross-machine ranking per material", () => {
  it("returns all 7 lathes ranked by max_mrr for aluminum (N-group)", () => {
    const ranked = JMDieLatheDeepCapabilityEngine.rankFleetByMRR("N");
    expect(ranked).toHaveLength(7);
    // Sort descending: each entry >= next
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i]!.max_mrr_cm3_min).toBeGreaterThanOrEqual(ranked[i + 1]!.max_mrr_cm3_min);
    }
  });

  it("LB3000 (LTH-06, 30kW + 1500Nm) ranks above LNC8 (LTH-03, 11kW + 110Nm) on steel", () => {
    const ranked = JMDieLatheDeepCapabilityEngine.rankFleetByMRR("P");
    const lb_rank = ranked.findIndex((r) => r.machine_id === "LTH-06");
    const lnc_rank = ranked.findIndex((r) => r.machine_id === "LTH-03");
    expect(lb_rank).toBeLessThan(lnc_rank);
  });
});

describe("estimateCycleOverhead — costing helper", () => {
  it("LTH-07 (auto_door) has lower door overhead than LTH-03 (manual)", () => {
    const c7 = JMDieLatheDeepCapabilityEngine.estimateCycleOverhead("LTH-07", 5);
    const c3 = JMDieLatheDeepCapabilityEngine.estimateCycleOverhead("LTH-03", 5);
    expect(c7.door_s).toBeLessThan(c3.door_s);
  });

  it("tool_change_total scales linearly with n_tool_changes", () => {
    const c1 = JMDieLatheDeepCapabilityEngine.estimateCycleOverhead("LTH-07", 1);
    const c10 = JMDieLatheDeepCapabilityEngine.estimateCycleOverhead("LTH-07", 10);
    expect(c10.tool_change_total_s).toBeCloseTo(c1.tool_change_total_s * 10, 5);
  });
});

describe("Kienzle references for per-material envelopes", () => {
  it("each ISO group uses its canonical kc1_1 (sanity-check 6 groups)", () => {
    for (const iso of ["P", "M", "K", "N", "S", "H"] as const) {
      const env = computeCuttingEnvelope(22, 200, 5000, iso);
      // Higher kc1_1 → lower max_fz at same force ceiling (inverse relationship)
      expect(env.max_fz_mm_rev).toBeGreaterThan(0);
      // Sanity: aluminum (kc1_1=700) gives higher max_fz than hardened steel (kc1_1=3200)
      if (iso === "N") {
        const env_H = computeCuttingEnvelope(22, 200, 5000, "H");
        expect(env.max_fz_mm_rev).toBeGreaterThan(env_H.max_fz_mm_rev);
      }
      // Cross-check kc1_1 from canonical constants
      expect(CANONICAL_KIENZLE[iso].kc1_1).toBeGreaterThan(0);
    }
  });
});
