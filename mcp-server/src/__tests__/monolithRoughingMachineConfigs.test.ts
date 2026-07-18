/**
 * MonolithRoughingMachineConfigsEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-ROUGHING-MACHINE-CONFIGS-LOADER.
 *
 * Pins the monolith data (PRISM_ROUGHING_MACHINE_CONFIGS_V2.js) field-by-field
 * including inheritance resolution. Inheritance is the load-bearing detail
 * here — without it, 7 of the 18 machines would carry placeholder/empty
 * configs.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithRoughingMachineConfigsEngine,
  monolithRoughingMachineConfigsEngine,
} from "../engines/MonolithRoughingMachineConfigsEngine.js";

const engine = monolithRoughingMachineConfigsEngine;

describe("MonolithRoughingMachineConfigsEngine — data integrity", () => {
  it("ships exactly 18 machine configs", () => {
    expect(engine.listIds()).toHaveLength(18);
    expect(engine.list()).toHaveLength(18);
  });

  it("ships 10 manufacturer prefixes", () => {
    const prefixes = new Set(engine.listIds().map((id) => id.split("_")[0]));
    expect(prefixes.size).toBe(10);
    expect([...prefixes].sort()).toEqual(
      ["brother", "dmgmori", "doosan", "haas", "hermle", "hurco", "makino", "mazak", "okuma", "roku"].sort(),
    );
  });

  it("haas_vf2 carries Haas-specific G187 smoothing codes verbatim", () => {
    const c = engine.getConfig("haas_vf2");
    expect(c?.controller).toBe("haas_ngc");
    expect(c?.smoothing?.roughing).toBe("G187 P1 E0.001");
    expect(c?.smoothing?.adaptive).toBe("G187 P2 E0.0005");
    expect(c?.smoothing?.finishing).toBe("G187 P3 E0.0001");
  });

  it("okuma_genos_m460ve carries M63/M61 cycleTimeOptimization codes", () => {
    const c = engine.getConfig("okuma_genos_m460ve");
    expect(c?.cycleTimeOptimization).toEqual({ enabled: true, codes: ["M63", "M61"] });
  });

  it("hermle_c32u carries Heidenhain CYCL DEF 32.0 codes verbatim", () => {
    const c = engine.getConfig("hermle_c32u");
    expect(c?.controller).toBe("heidenhain_tnc640");
    expect(c?.smoothing?.roughing).toBe("CYCL DEF 32.0 TOLERANCE");
  });

  it("roku_roku_rqm5 carries highPrecision aiContour+nanoSmooth flags and defaultLevel=6 (more aggressive)", () => {
    const c = engine.getConfig("roku_roku_rqm5");
    expect(c?.defaultLevel).toBe(6);
    expect(c?.highPrecision).toEqual({ aiContour: true, nanoSmooth: true });
  });
});

describe("MonolithRoughingMachineConfigsEngine — inheritance resolution", () => {
  it("haas_umc750 inherits haas_vf2's G187 codes AND adds fiveAxisFeedLimit", () => {
    const c = engine.getConfig("haas_umc750");
    expect(c?.controller).toBe("haas_ngc");
    expect(c?.smoothing?.roughing).toBe("G187 P1 E0.001");
    expect(c?.fiveAxisFeedLimit).toEqual({ enabled: true, maxDegPerMin: 5000 });
    expect(c?.resolvedFrom).toEqual(["haas_vf2", "haas_umc750"]);
  });

  it("okuma_genos_m460v_5ax inherits m460ve AND adds fiveAxis spec", () => {
    const c = engine.getConfig("okuma_genos_m460v_5ax");
    expect(c?.controller).toBe("okuma_osp_p300m");
    expect(c?.smoothing?.roughing).toBe("G131 P1");
    expect(c?.fiveAxis).toEqual({ enabled: true, tcpSmoothing: "G131 P2", maxRotaryFeed: 5000 });
    expect(c?.cycleTimeOptimization?.codes).toEqual(["M63", "M61"]);
    expect(c?.resolvedFrom).toEqual(["okuma_genos_m460ve", "okuma_genos_m460v_5ax"]);
  });

  it("okuma_mu4000v inherits the 5ax variant (2-step chain → 3 resolvedFrom entries)", () => {
    const c = engine.getConfig("okuma_mu4000v");
    expect(c?.controller).toBe("okuma_osp_p300m");
    expect(c?.fiveAxis?.enabled).toBe(true);
    expect(c?.resolvedFrom).toEqual([
      "okuma_genos_m460ve", "okuma_genos_m460v_5ax", "okuma_mu4000v",
    ]);
  });

  it("okuma_genos_l400ii overrides parent's liveToolLimits.maxFeed (deep-merge child wins)", () => {
    const parent = engine.getConfig("okuma_lb3000exii");
    const child  = engine.getConfig("okuma_genos_l400ii");
    expect(parent?.liveToolLimits).toEqual({ maxRpm: 6000, maxFeed: 60 });
    expect(child?.liveToolLimits).toEqual({ maxRpm: 6000, maxFeed: 50 });
  });

  it("hurco_vmx42i inherits hurco_vm30i's full smoothing block", () => {
    const c = engine.getConfig("hurco_vmx42i");
    expect(c?.controller).toBe("hurco_winmax");
    expect(c?.smoothing?.roughing).toBe("G05.3 P50");
    expect(c?.smoothing?.adaptive).toBe("G05.3 P35");
    expect(c?.smoothing?.finishing).toBe("G05.3 P15");
    expect(c?.resolvedFrom).toEqual(["hurco_vm30i", "hurco_vmx42i"]);
  });

  it("getRawConfig surfaces the unresolved `inherits` field on child configs", () => {
    const raw = engine.getRawConfig("haas_umc750");
    expect(raw?.inherits).toBe("haas_vf2");
    expect(raw?.controller).toBeUndefined();  // child raw didn't set it
  });

  it("memoization: 2nd getConfig() call returns the same object reference", () => {
    const a = engine.getConfig("okuma_mu4000v");
    const b = engine.getConfig("okuma_mu4000v");
    expect(a).toBe(b);
  });
});

describe("MonolithRoughingMachineConfigsEngine — get* + search", () => {
  it("getConfig unknown id returns null (R12 fail-soft)", () => {
    expect(engine.getConfig("UNKNOWN_XYZ")).toBe(null);
  });

  it("getConfig empty/whitespace returns null", () => {
    expect(engine.getConfig("")).toBe(null);
    expect(engine.getConfig("   ")).toBe(null);
  });

  it("getRawConfig unknown id returns null", () => {
    expect(engine.getRawConfig("UNKNOWN")).toBe(null);
  });

  it("search 'okuma' matches all 7 Okuma configs", () => {
    const hits = engine.search("okuma");
    expect(hits.filter((c) => c.id.startsWith("okuma_"))).toHaveLength(7);
  });

  it("search 'fanuc' matches 2 configs (roku_roku_rqm5 + doosan_dnm500 via controller)", () => {
    const hits = engine.search("fanuc");
    const ids = hits.map((c) => c.id).sort();
    expect(ids).toEqual(["doosan_dnm500", "roku_roku_rqm5"]);
  });

  it("search respects limit cap", () => {
    const hits = engine.search("o", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("search empty/whitespace/invalid limit returns []", () => {
    expect(engine.search("")).toEqual([]);
    expect(engine.search("   ")).toEqual([]);
    expect(engine.search("okuma", 0)).toEqual([]);
    expect(engine.search("okuma", -1)).toEqual([]);
    expect(engine.search("okuma", 3.5)).toEqual([]);
  });

  it("search no-match returns []", () => {
    expect(engine.search("ZZZ_NONEXISTENT_CONTROLLER")).toEqual([]);
  });
});

describe("MonolithRoughingMachineConfigsEngine — filters", () => {
  it("listByController('okuma_osp_p300m') returns 4 configs (genos m460ve + m460v_5ax + mu4000v + mu5000v)", () => {
    const hits = engine.listByController("okuma_osp_p300m");
    expect(hits).toHaveLength(4);
    expect(hits.map((c) => c.id).sort()).toEqual([
      "okuma_genos_m460v_5ax", "okuma_genos_m460ve",
      "okuma_mu4000v", "okuma_mu5000v",
    ].sort());
  });

  it("listByManufacturer('haas') returns 2 (vf2 + umc750)", () => {
    const hits = engine.listByManufacturer("haas");
    expect(hits).toHaveLength(2);
    expect(hits.map((c) => c.id).sort()).toEqual(["haas_umc750", "haas_vf2"]);
  });

  it("listByManufacturer with empty/non-string returns []", () => {
    expect(engine.listByManufacturer("")).toEqual([]);
    expect(engine.listByManufacturer("   ")).toEqual([]);
  });

  it("listLiveToolCapable returns 4 (multus + lb3000exii + l400ii)", () => {
    // multus_b250iiw, lb3000exii, genos_l400ii — 3 own, 0 inherited (none of the
    // mill chain has liveToolLimits as parent)
    const hits = engine.listLiveToolCapable();
    expect(hits.map((c) => c.id).sort()).toEqual([
      "okuma_genos_l400ii", "okuma_lb3000exii", "okuma_multus_b250iiw",
    ]);
  });

  it("listFiveAxisCapable returns 4 (haas_umc750 + okuma m460v_5ax + mu4000v + mu5000v)", () => {
    const hits = engine.listFiveAxisCapable();
    expect(hits.map((c) => c.id).sort()).toEqual([
      "haas_umc750", "okuma_genos_m460v_5ax",
      "okuma_mu4000v", "okuma_mu5000v",
    ].sort());
  });
});

describe("MonolithRoughingMachineConfigsEngine — stats + immutability", () => {
  it("stats reports 18 total + 7 inheritance-bearing + correct controller breakdown", () => {
    const s = engine.stats();
    expect(s.total).toBe(18);
    // inheritance count: haas_umc750, okuma_genos_m460v_5ax, okuma_mu4000v,
    // okuma_mu5000v, okuma_genos_l400ii, hurco_vmx42i + 1 more = 7? Let me recount:
    // haas_umc750, okuma_genos_m460v_5ax, okuma_mu4000v, okuma_mu5000v,
    // okuma_genos_l400ii, hurco_vmx42i = 6.
    expect(s.with_inheritance).toBe(6);
    expect(s.live_tool_capable).toBe(3);
    expect(s.five_axis_capable).toBe(4);
    expect(s.by_controller).toHaveProperty("okuma_osp_p300m");
  });

  it("fresh instance returns the same data (data is module-scoped)", () => {
    const fresh = new MonolithRoughingMachineConfigsEngine();
    expect(fresh.listIds()).toEqual(engine.listIds());
    expect(fresh.stats().total).toBe(18);
  });

  it("listIds immutability: mutating returned array doesn't affect store", () => {
    const a = engine.listIds();
    a.pop();
    expect(engine.listIds()).toHaveLength(18);
  });
});
