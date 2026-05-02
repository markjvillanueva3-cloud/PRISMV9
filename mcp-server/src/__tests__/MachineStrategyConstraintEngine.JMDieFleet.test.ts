/**
 * MachineStrategyConstraintEngine — JM Die fleet profiles
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-FleetProfiles
 *
 * Verifies the 5 canonical JM Die machines are registered with the user-confirmed
 * tool-magazine capacities and full compounding-capability fields. The data is
 * queried by master post engines when computing tool-change-aware programs and
 * machine-aware speed/feed.
 */
import { describe, it, expect } from "vitest";
import {
  machineStrategyConstraintEngine,
} from "../engines/MachineStrategyConstraintEngine.js";

// ─── User-confirmed canonical fleet ATC counts (per JM Die, 2026-05) ────────
const HURCO_V11_ATC = 24;
const GENOS_M460V_5AX_ATC = 48;
const HAAS_VF2_ATC = 20;
const OKUMA_LB250II_ATC = 60;
const ROKUROKU_HC658_ATC = 30;
const FLEET_SIZE = 5;

const FLEET_IDS = [
  "jmdie_hurco_v11",
  "jmdie_okuma_genos_m460v_5ax",
  "jmdie_haas_vf2",
  "jmdie_okuma_lb250ii",
  "jmdie_rokuroku_hc658",
] as const;

describe("JM Die fleet — registered machines (lookup contract)", () => {
  it("getMachineById returns a non-null record for each of the 5 fleet ids", () => {
    const found = FLEET_IDS.map(id => machineStrategyConstraintEngine.getMachineById(id));
    expect(found.length).toBe(FLEET_SIZE);
    expect(found.filter(m => m !== null).length).toBe(FLEET_SIZE);
    // Every result's machine_id must round-trip
    expect(found.map(m => m!.machine_id)).toEqual([...FLEET_IDS]);
  });

  it("getMachineById returns null for an unknown id", () => {
    expect(machineStrategyConstraintEngine.getMachineById("nonexistent_machine")).toBeNull();
  });
});

describe("JM Die fleet — canonical ATC counts", () => {
  it("Hurco VMX30i (V11) has 24 tool pockets", () => {
    const m = machineStrategyConstraintEngine.getMachineById("jmdie_hurco_v11")!;
    expect(m.tool_magazine_capacity).toBe(HURCO_V11_ATC);
  });

  it("Okuma Genos M460V-5AX has 48 tool pockets", () => {
    const m = machineStrategyConstraintEngine.getMachineById("jmdie_okuma_genos_m460v_5ax")!;
    expect(m.tool_magazine_capacity).toBe(GENOS_M460V_5AX_ATC);
  });

  it("Haas VF-2 (JM Die) has 20 tool pockets", () => {
    const m = machineStrategyConstraintEngine.getMachineById("jmdie_haas_vf2")!;
    expect(m.tool_magazine_capacity).toBe(HAAS_VF2_ATC);
  });

  it("Okuma LB-250-II has 60 tool pockets", () => {
    const m = machineStrategyConstraintEngine.getMachineById("jmdie_okuma_lb250ii")!;
    expect(m.tool_magazine_capacity).toBe(OKUMA_LB250II_ATC);
  });

  it("Roku-Roku HC-658 has 30 tool pockets", () => {
    const m = machineStrategyConstraintEngine.getMachineById("jmdie_rokuroku_hc658")!;
    expect(m.tool_magazine_capacity).toBe(ROKUROKU_HC658_ATC);
  });
});

describe("JM Die fleet — compounding capability fields exact values", () => {
  it("Hurco V11: linear_rail ways, belt_driven, precision build, medium rigidity, vmc_3axis", () => {
    const m = machineStrategyConstraintEngine.getMachineById("jmdie_hurco_v11")!;
    expect(m.ways_type).toBe("linear_rail");
    expect(m.spindle_type).toBe("belt_driven");
    expect(m.build_quality).toBe("precision");
    expect(m.rigidity_class).toBe("medium");
    expect(m.machine_class).toBe("vmc_3axis");
  });

  it("Genos M460V-5AX: linear_rail, belt_driven, high_precision, high rigidity, vmc_5axis_trunnion", () => {
    const m = machineStrategyConstraintEngine.getMachineById("jmdie_okuma_genos_m460v_5ax")!;
    expect(m.ways_type).toBe("linear_rail");
    expect(m.spindle_type).toBe("belt_driven");
    expect(m.build_quality).toBe("high_precision");
    expect(m.rigidity_class).toBe("high");
    expect(m.machine_class).toBe("vmc_5axis_trunnion");
  });

  it("Haas VF-2: linear_rail, belt_driven, production build, medium rigidity, vmc_3axis", () => {
    const m = machineStrategyConstraintEngine.getMachineById("jmdie_haas_vf2")!;
    expect(m.ways_type).toBe("linear_rail");
    expect(m.spindle_type).toBe("belt_driven");
    expect(m.build_quality).toBe("production");
    expect(m.rigidity_class).toBe("medium");
    expect(m.machine_class).toBe("vmc_3axis");
  });

  it("Okuma LB-250-II: hardened_box ways, geared spindle, lathe_2axis", () => {
    const m = machineStrategyConstraintEngine.getMachineById("jmdie_okuma_lb250ii")!;
    expect(m.ways_type).toBe("hardened_box");
    expect(m.spindle_type).toBe("geared");
    expect(m.build_quality).toBe("high_precision");
    expect(m.rigidity_class).toBe("high");
    expect(m.machine_class).toBe("lathe_2axis");
  });

  it("Roku-Roku HC-658: hand_scraped + integral_motor + ultra_precision (the highest-tier in the fleet)", () => {
    const m = machineStrategyConstraintEngine.getMachineById("jmdie_rokuroku_hc658")!;
    expect(m.ways_type).toBe("hand_scraped");
    expect(m.spindle_type).toBe("integral_motor");
    expect(m.build_quality).toBe("ultra_precision");
    expect(m.rigidity_class).toBe("ultra_high");
    expect(m.machine_class).toBe("vmc_3axis");
    expect(m.tier).toBe("high_performance");
  });
});

describe("JM Die fleet — class-based filters", () => {
  it("listByClass('lathe_2axis') returns exactly one JM Die fleet entry (LB-250-II)", () => {
    const fleetLathes = machineStrategyConstraintEngine
      .listByClass("lathe_2axis")
      .filter(m => m.machine_id.startsWith("jmdie_"));
    expect(fleetLathes.length).toBe(1);
    expect(fleetLathes[0].machine_id).toBe("jmdie_okuma_lb250ii");
  });

  it("listByClass('vmc_5axis_trunnion') returns exactly one JM Die fleet entry (Genos M460V-5AX)", () => {
    const fiveAxis = machineStrategyConstraintEngine
      .listByClass("vmc_5axis_trunnion")
      .filter(m => m.machine_id.startsWith("jmdie_"));
    expect(fiveAxis.length).toBe(1);
    expect(fiveAxis[0].machine_id).toBe("jmdie_okuma_genos_m460v_5ax");
  });

  it("listByClass('vmc_3axis') returns exactly three JM Die fleet entries (Hurco, Haas, Roku-Roku)", () => {
    const threeAxis = machineStrategyConstraintEngine
      .listByClass("vmc_3axis")
      .filter(m => m.machine_id.startsWith("jmdie_"))
      .map(m => m.machine_id)
      .sort();
    expect(threeAxis).toEqual([
      "jmdie_haas_vf2",
      "jmdie_hurco_v11",
      "jmdie_rokuroku_hc658",
    ]);
  });
});

describe("JM Die fleet — listMachines surface", () => {
  it("listMachines() includes all 5 JM Die fleet machine_ids in its output", () => {
    const list = machineStrategyConstraintEngine.listMachines();
    const fleetIds = list
      .map(m => m.machine_id)
      .filter(id => id.startsWith("jmdie_"))
      .sort();
    expect(fleetIds).toEqual([...FLEET_IDS].sort());
  });
});