import { describe, expect, it } from "vitest";

import { mergeMachineRegistryEntry } from "../registries/MachineRegistry.js";

describe("mergeMachineRegistryEntry", () => {
  it("preserves richer nested machine data when a later source is thinner", () => {
    const richerEntry = {
      id: "okuma_genos_m460v_5ax",
      manufacturer: "Okuma",
      model: "GENOS M460V-5AX",
      spindle: {
        max_rpm: 15000,
        spindle_nose: "CAT 40 Big+",
        coolant_through: true,
        through_air: true,
      },
      coolant: {
        flood: true,
        pressure_bar: 15,
        through_air: true,
        air_blast: true,
        tsc: true,
        tsc_pressure_bar: 70,
      },
      okuma_technologies: {
        collision_avoidance: {
          enabled: true,
          name: "CAS",
        },
        machining_navi: {
          enabled: true,
        },
      },
      notes: ["5-axis", "Big+ spindle"],
    };

    const thinnerEntry = {
      id: "okuma_genos_m460v_5ax",
      manufacturer: "Okuma",
      model: "GENOS M460V-5AX",
      controller: {
        brand: "Okuma",
        model: "OSP-P300MA-H",
        type: "Okuma OSP-P300MA-H",
      },
      coolant: {
        pressure_bar: 15,
        tsc: true,
        tsc_pressure_bar: 70,
      },
      notes: ["Factory row"],
    };

    const merged = mergeMachineRegistryEntry(richerEntry, thinnerEntry);

    expect(merged.controller).toEqual({
      brand: "Okuma",
      model: "OSP-P300MA-H",
      type: "Okuma OSP-P300MA-H",
    });
    expect(merged.spindle).toMatchObject({
      max_rpm: 15000,
      spindle_nose: "CAT 40 Big+",
      coolant_through: true,
      through_air: true,
    });
    expect(merged.coolant).toMatchObject({
      flood: true,
      through_air: true,
      air_blast: true,
      tsc: true,
      tsc_pressure_bar: 70,
    });
    expect(merged.okuma_technologies).toMatchObject({
      collision_avoidance: { enabled: true, name: "CAS" },
      machining_navi: { enabled: true },
    });
    expect(merged.notes).toEqual(["5-axis", "Big+ spindle", "Factory row"]);
  });
});
