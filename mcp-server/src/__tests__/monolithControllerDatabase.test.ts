/**
 * MonolithControllerDatabaseEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-CONTROLLER-DATABASE.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithControllerDatabaseEngine,
  monolithControllerDatabaseEngine,
} from "../engines/MonolithControllerDatabaseEngine.js";

const engine = monolithControllerDatabaseEngine;

describe("MonolithControllerDatabaseEngine — metadata", () => {
  it("version is '1.0.0'", () => {
    expect(engine.version).toBe("1.0.0");
  });

  it("declaredTotal is 25 (header-claim) but actualCount is 11 (real ports)", () => {
    expect(engine.declaredTotal).toBe(25);
    expect(engine.stats().actualCount).toBe(11);
  });

  it("parametersPerController is 120 per monolith header", () => {
    expect(engine.parametersPerController).toBe(120);
  });
});

describe("MonolithControllerDatabaseEngine — vendor coverage", () => {
  it("ships exactly 11 controllers across 6 vendors", () => {
    expect(engine.listControllers()).toHaveLength(11);
    const s = engine.stats().byManufacturer;
    expect(Object.keys(s).sort()).toEqual(
      ["FANUC", "HAAS", "HEIDENHAIN", "MAZAK", "OKUMA", "SIEMENS"],
    );
  });

  it("FANUC: 2 controllers (0i-MF Plus + 30i-B Plus)", () => {
    const f = engine.listByManufacturer("FANUC");
    expect(f).toHaveLength(2);
    expect(f.map((c) => c.controller_id).sort()).toEqual(["CTRL-FAN-001", "CTRL-FAN-002"]);
  });

  it("SIEMENS: 2 controllers (840D sl + ONE)", () => {
    const s = engine.listByManufacturer("SIEMENS");
    expect(s).toHaveLength(2);
    expect(s.map((c) => c.model).sort()).toEqual(["SINUMERIK 840D sl", "SINUMERIK ONE"]);
  });

  it("HAAS: 1 controller (NGC)", () => {
    expect(engine.listByManufacturer("HAAS")).toHaveLength(1);
  });

  it("HEIDENHAIN: 2 controllers (TNC 640 + TNC 7)", () => {
    expect(engine.listByManufacturer("HEIDENHAIN")).toHaveLength(2);
  });

  it("MAZAK: 2 controllers (SmoothG + SmoothAi)", () => {
    expect(engine.listByManufacturer("MAZAK")).toHaveLength(2);
  });

  it("OKUMA: 2 controllers (P300 + P500)", () => {
    expect(engine.listByManufacturer("OKUMA")).toHaveLength(2);
  });

  it("listByManufacturer is case-insensitive ('fanuc' = 'FANUC')", () => {
    expect(engine.listByManufacturer("fanuc")).toHaveLength(2);
  });
});

describe("MonolithControllerDatabaseEngine — specific controller records (pinned)", () => {
  it("CTRL-FAN-001 (0i-MF Plus): 8 max axes / 5 simultaneous, Macro B variables, 2018 release", () => {
    const c = engine.getController("CTRL-FAN-001");
    expect(c?.release_year).toBe(2018);
    expect(c?.axis_capability?.max_axes).toBe(8);
    expect(c?.axis_capability?.max_simultaneous).toBe(5);
    expect(c?.axis_capability?.rtcp_tcpm).toBe(true);
    expect(c?.macro_support?.macro_language).toBe("Macro B");
    expect(c?.alarm_info.alarm_count).toBe(1500);
    expect(c?.gcode_dialect?.base_standard).toBe("ISO6983");
    expect(c?.identification.oem_variants).toEqual(["HAAS 0i", "Hurco Fanuc"]);
  });

  it("CTRL-FAN-002 (30i-B Plus): 32 max axes / 24 simultaneous (high-end FANUC)", () => {
    const c = engine.getController("CTRL-FAN-002");
    expect(c?.axis_capability?.max_axes).toBe(32);
    expect(c?.axis_capability?.max_simultaneous).toBe(24);
    expect(c?.special_features?.look_ahead_blocks).toBe(1000);
  });

  it("CTRL-SIEM-001 (840D sl): 93 max axes (Siemens leads on axis count), Structured Text macros", () => {
    const c = engine.getController("CTRL-SIEM-001");
    expect(c?.axis_capability?.max_axes).toBe(93);
    expect(c?.macro_support?.macro_language).toBe("Structured Text");
    expect(c?.connectivity?.profinet).toBe(true);
    expect(c?.connectivity?.opc_ua).toBe(true);
  });

  it("CTRL-SIEM-002 (ONE): supersedes 840D sl + ai_enabled + digital_twin", () => {
    const c = engine.getController("CTRL-SIEM-002");
    expect(c?.identification.supersedes).toEqual(["840D sl"]);
    expect(c?.special_features?.ai_enabled).toBe(true);
    expect(c?.special_features?.digital_twin).toBe(true);
  });

  it("CTRL-HAAS-001 (NGC): HYBRID g-code dialect, conversational + visual programming", () => {
    const c = engine.getController("CTRL-HAAS-001");
    expect(c?.gcode_dialect?.base_standard).toBe("HYBRID");
    expect(c?.special_features?.conversational).toBe(true);
    expect(c?.special_features?.visual_programming).toBe(true);
  });

  it("CTRL-HEID-001 (TNC 640): PROPRIETARY g-code + dialog_programming + dynamic_collision_monitoring", () => {
    const c = engine.getController("CTRL-HEID-001");
    expect(c?.gcode_dialect?.base_standard).toBe("PROPRIETARY");
    expect(c?.gcode_dialect?.dialog_programming).toBe(true);
    expect(c?.special_features?.dynamic_collision_monitoring).toBe(true);
  });

  it("CTRL-MAZK-001 (SmoothG): HYBRID + mazatrol_support + smooth_control", () => {
    const c = engine.getController("CTRL-MAZK-001");
    expect(c?.gcode_dialect?.mazatrol_support).toBe(true);
    expect(c?.special_features?.smooth_control).toBe(true);
    expect(c?.identification.supersedes).toEqual(["Mazatrol Matrix 2"]);
  });

  it("CTRL-MAZK-002 (SmoothAi): ai_machining + voice_control (newest Mazak features)", () => {
    const c = engine.getController("CTRL-MAZK-002");
    expect(c?.special_features?.ai_machining).toBe(true);
    expect(c?.special_features?.voice_control).toBe(true);
    expect(c?.release_year).toBe(2022);
  });

  it("CTRL-OKUM-001 (OSP-P300): HYBRID + thermo_friendly_concept + machining_navi (Okuma signature features)", () => {
    const c = engine.getController("CTRL-OKUM-001");
    expect(c?.special_features?.thermo_friendly_concept).toBe(true);
    expect(c?.special_features?.machining_navi).toBe(true);
    expect(c?.gcode_dialect?.ige_support).toBe(true);
  });

  it("CTRL-OKUM-002 (OSP-P500): 2024 release (newest controller in the set), connect_plan + smart_factory", () => {
    const c = engine.getController("CTRL-OKUM-002");
    expect(c?.release_year).toBe(2024);
    expect(c?.special_features?.connect_plan).toBe(true);
    expect(c?.special_features?.smart_factory).toBe(true);
  });
});

describe("MonolithControllerDatabaseEngine — capability filters", () => {
  it("listCurrentProduction returns all 11 (all current)", () => {
    expect(engine.listCurrentProduction()).toHaveLength(11);
  });

  it("listRtcpTcpmCapable returns 6 (FANUC 2 + SIEMENS 1 explicit + HAAS 1 + HEIDENHAIN 1 + the ones with rtcp_tcpm:true)", () => {
    // Exact pinned: FAN-001+002, SIEM-001+002, HAAS-001, HEID-001 = 6 with rtcp_tcpm explicitly true
    const r = engine.listRtcpTcpmCapable();
    const ids = r.map((c) => c.controller_id).sort();
    expect(ids).toEqual([
      "CTRL-FAN-001", "CTRL-FAN-002", "CTRL-HAAS-001",
      "CTRL-HEID-001", "CTRL-SIEM-001", "CTRL-SIEM-002",
    ]);
  });

  it("listByFamily('TNC') returns 2 (Heidenhain TNC 640 + TNC 7)", () => {
    expect(engine.listByFamily("TNC")).toHaveLength(2);
  });

  it("listByFamily('OSP') returns 2 (Okuma P300 + P500)", () => {
    expect(engine.listByFamily("OSP")).toHaveLength(2);
  });

  it("listByFamily('Mazatrol Smooth') returns 2 (SmoothG + SmoothAi)", () => {
    expect(engine.listByFamily("Mazatrol Smooth")).toHaveLength(2);
  });

  it("listReleasedSince(2020) returns 4 (ONE 2020 + TNC 7 2021 + SmoothAi 2022 + P500 2024)", () => {
    const r = engine.listReleasedSince(2020);
    expect(r).toHaveLength(4);
  });

  it("listReleasedSince(2024) returns 1 (only P500)", () => {
    const r = engine.listReleasedSince(2024);
    expect(r).toHaveLength(1);
    expect(r[0].model).toBe("OSP-P500");
  });

  it("listReleasedSince NaN returns []", () => {
    expect(engine.listReleasedSince(NaN)).toEqual([]);
  });
});

describe("MonolithControllerDatabaseEngine — fail-soft (R12)", () => {
  it("getController unknown id returns null", () => {
    expect(engine.getController("UNKNOWN-XYZ")).toBe(null);
  });

  it("getController empty/whitespace returns null", () => {
    expect(engine.getController("")).toBe(null);
    expect(engine.getController("   ")).toBe(null);
  });

  it("listByManufacturer empty/unknown returns []", () => {
    expect(engine.listByManufacturer("")).toEqual([]);
    expect(engine.listByManufacturer("UNKNOWN")).toEqual([]);
  });

  it("listByFamily empty/unknown returns []", () => {
    expect(engine.listByFamily("")).toEqual([]);
    expect(engine.listByFamily("UNKNOWN")).toEqual([]);
  });
});

describe("MonolithControllerDatabaseEngine — stats + immutability", () => {
  it("stats reports release range 2012-2024 (TNC 640 oldest, OSP-P500 newest)", () => {
    const s = engine.stats();
    expect(s.releaseYearRange).toEqual({ earliest: 2012, latest: 2024 });
  });

  it("stats reports actualCount=11 != declaredTotal=25 (honesty about partial port)", () => {
    const s = engine.stats();
    expect(s.actualCount).toBe(11);
    expect(s.declaredTotal).toBe(25);
    expect(s.actualCount).toBeLessThan(s.declaredTotal);
  });

  it("getController immutability: mutating returned record doesn't affect store", () => {
    const c = engine.getController("CTRL-FAN-001");
    if (c) c.release_year = 9999;
    expect(engine.getController("CTRL-FAN-001")?.release_year).toBe(2018);
  });

  it("listControllers immutability: mutating returned array doesn't affect store", () => {
    const a = engine.listControllers();
    a.pop();
    expect(engine.listControllers()).toHaveLength(11);
  });

  it("nested immutability: mutating axis_capability doesn't affect store", () => {
    const c = engine.getController("CTRL-SIEM-001");
    if (c?.axis_capability) c.axis_capability.max_axes = 9999;
    expect(engine.getController("CTRL-SIEM-001")?.axis_capability?.max_axes).toBe(93);
  });

  it("fresh instance returns identical data", () => {
    const fresh = new MonolithControllerDatabaseEngine();
    expect(fresh.stats()).toEqual(engine.stats());
  });
});
