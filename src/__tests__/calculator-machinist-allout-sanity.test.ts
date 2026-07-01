import { describe, expect, it } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";
import { wireEDMSettingsEngine } from "../engines/WireEDMSettingsEngine.js";
import { EXTENDED_MACHINE_CATALOG } from "../data/machine-profiles-catalog.js";
import { EXTENDED_MACHINE_CATALOG_EXT } from "../data/machine-profiles-catalog-ext.js";
import { EXTENDED_MACHINE_CATALOG_EXT2 } from "../data/machine-profiles-catalog-ext2.js";
import { WEDM_MACHINE_SPECS } from "../data/wedm-published-machines.js";

type SourceMachineProfile = (typeof EXTENDED_MACHINE_CATALOG)[number];

const PRIORITY_MACHINING_MATERIALS = [
  { id: "aluminum", label: "aluminum 6061", coolant: "flood" },
  { id: "steel", label: "steel 1045", coolant: "tsc" },
  { id: "tool_steel", label: "D2 tool steel", coolant: "tsc" },
  { id: "stainless", label: "stainless steel 304", coolant: "flood" },
] as const;

const PRIORITY_WIRE_MATERIALS = [
  { id: "aluminum", label: "6061 aluminum", hardness: 18 },
  { id: "steel", label: "1045 steel", hardness: 22 },
  { id: "tool_steel", label: "D2", hardness: 60 },
  { id: "stainless", label: "304 stainless", hardness: 20 },
] as const;

const PRIORITY_MAJOR_BRANDS = [
  "Mazak",
  "Makino",
  "DMG MORI",
  "Roku-Roku",
  "GROB",
  "Heller",
  "Doosan",
  "Brother",
  "Kern",
  "Hermle",
  "Nakamura-Tome",
] as const;

function sourceProfileCorpus(): SourceMachineProfile[] {
  return [
    ...EXTENDED_MACHINE_CATALOG,
    ...EXTENDED_MACHINE_CATALOG_EXT,
    ...EXTENDED_MACHINE_CATALOG_EXT2,
  ];
}

function isMillProfile(profile: SourceMachineProfile) {
  return profile.type === "VMC" || profile.type === "HMC" || profile.type === "5axis";
}

function isTurningProfile(profile: SourceMachineProfile) {
  return profile.type === "lathe" || profile.type === "mill_turn" || profile.type === "swiss";
}

function chooseMillDiameterMm(profile: SourceMachineProfile) {
  if (profile.spindle.max_rpm >= 20000) return 10;
  if (profile.spindle.max_rpm >= 12000) return 16;
  return 20;
}

function chooseTurningDiameterMm(profile: SourceMachineProfile) {
  if (profile.type === "swiss") return 6;
  if (profile.spindle.max_rpm >= 5000) return 16;
  return 25;
}

function holderTypeForMill(profile: SourceMachineProfile) {
  const taper = profile.spindle.taper.toLowerCase();
  if (taper.includes("hsk")) return "shrink_fit";
  if (taper.includes("bt") || taper.includes("cat")) return "hydraulic";
  return "ER_collet";
}

function workholdingTypeForTurning(profile: SourceMachineProfile) {
  if (profile.type === "swiss") return "collet";
  return "chuck";
}

function representativeWireThicknessMm(spec: (typeof WEDM_MACHINE_SPECS)[number]) {
  return Math.max(10, Math.min(50, spec.max_workpiece_mm.h, spec.travels_mm.z));
}

describe("calculator machinist all-out sanity", () => {
  it("runs milling and turning calculations across the full calculator-relevant source machine corpus for priority materials", () => {
    const relevantProfiles = sourceProfileCorpus().filter((profile) => isMillProfile(profile) || isTurningProfile(profile));
    const seenBrands = new Set<string>();
    const seenTypes = new Set<string>();
    let validatedContexts = 0;
    let unclampedAluminumVsSteel = 0;
    let unclampedSteelVsToolSteel = 0;

    relevantProfiles.forEach((profile) => {
      const machineMaxRpm = Math.max(profile.spindle.max_rpm, 1);
      const machinePowerKw = Math.max(profile.spindle.power_kw, 0.5);
      const isTurning = isTurningProfile(profile);
      const toolDiameterMm = isTurning ? chooseTurningDiameterMm(profile) : chooseMillDiameterMm(profile);
      const flutes = isTurning ? 1 : 4;

      const results = new Map<string, ReturnType<typeof speedFeedOrchestratorEngine.compute>>();

      PRIORITY_MACHINING_MATERIALS.forEach((material) => {
        const result = speedFeedOrchestratorEngine.compute({
          material: material.label,
          machine_type: isTurning ? "lathe" : "mill",
          operation: isTurning ? "turning" : "milling",
          cut_type: "roughing",
          strategy: isTurning ? "conventional" : "adaptive",
          tool_diameter_mm: toolDiameterMm,
          flutes,
          tool_material: "carbide",
          holder_type: isTurning ? "turret" : holderTypeForMill(profile),
          coolant_type: material.coolant,
          workholding_type: isTurning ? workholdingTypeForTurning(profile) : "vise",
          machine_power_kw: machinePowerKw,
          machine_max_rpm: machineMaxRpm,
        });

        results.set(material.id, result);
        seenBrands.add(profile.brand);
        seenTypes.add(profile.type);
        validatedContexts += 1;

        expect(result.value.cutting_speed_mpm).toBeGreaterThan(0);
        expect(result.value.spindle_rpm).toBeGreaterThan(0);
        expect(result.value.spindle_rpm).toBeLessThanOrEqual(machineMaxRpm);
        expect(result.value.feed_rate_mmmin).toBeGreaterThan(0);
        expect(result.value.tool_life_min).toBeGreaterThan(0);
        expect(result.value.surface_finish_Ra_um).toBeGreaterThan(0);
        expect(result.value.overall_confidence).toBeGreaterThan(0);

        if (material.id === "tool_steel") {
          expect(result.value.playbook_warnings.length).toBeGreaterThan(0);
        }
      });

      const aluminum = results.get("aluminum");
      const steel = results.get("steel");
      const toolSteel = results.get("tool_steel");

      expect(aluminum).toBeDefined();
      expect(steel).toBeDefined();
      expect(toolSteel).toBeDefined();

      if (aluminum && steel && aluminum.value.spindle_rpm < machineMaxRpm && steel.value.spindle_rpm < machineMaxRpm) {
        expect(aluminum.value.cutting_speed_mpm).toBeGreaterThanOrEqual(steel.value.cutting_speed_mpm);
        unclampedAluminumVsSteel += 1;
      }

      if (steel && toolSteel && steel.value.spindle_rpm < machineMaxRpm && toolSteel.value.spindle_rpm < machineMaxRpm) {
        expect(steel.value.cutting_speed_mpm).toBeGreaterThanOrEqual(toolSteel.value.cutting_speed_mpm);
        unclampedSteelVsToolSteel += 1;
      }
    });

    expect(seenBrands.size).toBeGreaterThanOrEqual(45);
    PRIORITY_MAJOR_BRANDS.forEach((brand) => {
      expect(seenBrands.has(brand)).toBe(true);
    });
    expect(seenTypes).toEqual(new Set(["VMC", "HMC", "5axis", "lathe", "mill_turn", "swiss"]));
    expect(validatedContexts).toBe(relevantProfiles.length * PRIORITY_MACHINING_MATERIALS.length);
    expect(unclampedAluminumVsSteel).toBeGreaterThan(500);
    expect(unclampedSteelVsToolSteel).toBeGreaterThan(500);
  }, 120000);

  it("runs wire calculations across published wire EDM machine suppliers for the priority material mix", () => {
    const seenBrands = new Set<string>();
    let validatedContexts = 0;

    WEDM_MACHINE_SPECS.forEach((spec) => {
      const thickness = representativeWireThicknessMm(spec);
      const results = new Map<string, ReturnType<typeof wireEDMSettingsEngine.calculate>>();

      PRIORITY_WIRE_MATERIALS.forEach((material) => {
        const result = wireEDMSettingsEngine.calculate({
          wire_type: "brass_0.25",
          workpiece_material: material.label,
          workpiece_thickness_mm: thickness,
          workpiece_hardness_HRC: material.hardness,
          target_surface_finish_Ra_um: 0.8,
          target_accuracy_mm: 0.01,
          taper_angle_deg: 0,
          is_submerged: true,
        });

        results.set(material.id, result);
        seenBrands.add(spec.manufacturer);
        validatedContexts += 1;

        expect(result.first_cut_speed_mm_per_min).toBeGreaterThan(0);
        expect(result.num_skim_cuts).toBeGreaterThanOrEqual(1);
        expect(result.wire_tension_N).toBeGreaterThan(0);
        expect(result.power_setting_pct).toBeGreaterThan(0);
        expect(result.estimated_time_per_100mm_min).toBeGreaterThan(0);
      });

      const aluminum = results.get("aluminum");
      const steel = results.get("steel");
      const toolSteel = results.get("tool_steel");

      expect(aluminum).toBeDefined();
      expect(steel).toBeDefined();
      expect(toolSteel).toBeDefined();

      expect(aluminum!.first_cut_speed_mm_per_min).toBeGreaterThan(steel!.first_cut_speed_mm_per_min);
      expect(steel!.first_cut_speed_mm_per_min).toBeGreaterThan(toolSteel!.first_cut_speed_mm_per_min);
    });

    expect(seenBrands).toEqual(new Set(["Mitsubishi", "Sodick", "Makino", "AgieCharmilles"]));
    expect(validatedContexts).toBe(WEDM_MACHINE_SPECS.length * PRIORITY_WIRE_MATERIALS.length);
  });
});
