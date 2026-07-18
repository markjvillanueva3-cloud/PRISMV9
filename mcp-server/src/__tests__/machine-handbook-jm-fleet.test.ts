/**
 * machine-handbook-jm-fleet.test.ts — DB-COVERAGE-GAPFILL-MS0 / U-MACH01
 *
 * Verifies the JM-fleet machine handbooks (spec-sheet tier) load through the
 * live MachineHandbookRegistry singleton, resolve by their JM roster machine_id
 * (VMC-01..03 from JM_DIE_CONTROLLER_MAP), carry the physics/safety-critical
 * sections PRISM's consumers need (spindle, axes, controller, tooling, safety),
 * and — critically — carry HONEST provenance: extraction_method "web_scrape"
 * with confidence in the spec-sheet band [0.6, 0.85], NOT the 0.95/"manual"
 * band reserved for true service-manual extraction. They must NOT fabricate
 * OEM part numbers (alarm_codes / parts_book empty).
 *
 * R9: every assertion encodes WHY the handbook matters — fleet resolution,
 * concrete published specs, and the no-fabrication invariant. None is
 * satisfiable by a stub or by an over-confident hallucinated handbook.
 */
import { describe, it, expect } from "vitest";
import {
  machineHandbookRegistry,
  type MachineHandbook,
} from "../engines/MachineHandbookRegistryEngine.js";
import { JM_DIE_CONTROLLER_MAP } from "../data/jm-die-profile.js";

/** The mills shipped by U-MACH01, keyed by JM roster machine_id. */
const U_MACH01_MILLS = ["VMC-01", "VMC-02", "VMC-03"] as const;

/** Spec-sheet tier provenance band — distinct from manual-extraction 0.95. */
const SPEC_SHEET_CONF_MIN = 0.6;
const SPEC_SHEET_CONF_MAX = 0.85;

/** Every `source` object found anywhere in a handbook (deep walk). */
function collectSources(obj: unknown, out: Array<{ extraction_method: string; confidence: number }> = []): Array<{ extraction_method: string; confidence: number }> {
  if (obj === null || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    for (const el of obj) collectSources(el, out);
    return out;
  }
  const rec = obj as Record<string, unknown>;
  if (rec.source && typeof rec.source === "object") {
    const s = rec.source as Record<string, unknown>;
    if (typeof s.extraction_method === "string" && typeof s.confidence === "number") {
      out.push({ extraction_method: s.extraction_method, confidence: s.confidence });
    }
  }
  for (const v of Object.values(rec)) collectSources(v, out);
  return out;
}

describe("JM-fleet mill handbooks (U-MACH01) — resolvable + honest", () => {
  it("each U-MACH01 mill resolves by its JM roster machine_id", () => {
    for (const id of U_MACH01_MILLS) {
      const hbk = machineHandbookRegistry.getByMachineId(id);
      // Must exist — getByMachineId returns undefined if the file is missing/invalid.
      expect(hbk?.machine_id).toBe(id);
    }
  });

  it("handbook manufacturer/model match the JM_DIE_CONTROLLER_MAP roster row", () => {
    for (const id of U_MACH01_MILLS) {
      const roster = JM_DIE_CONTROLLER_MAP.find((m) => m.machine_id === id)!;
      const hbk = machineHandbookRegistry.getByMachineId(id) as MachineHandbook;
      // roster machine_name embeds manufacturer + model (e.g. "Haas VF-2").
      const name = roster.machine_name.toLowerCase();
      expect(name).toContain(hbk.manufacturer.toLowerCase());
      // model token appears in the roster name (allow hyphen/space variance)
      const modelToken = hbk.model.toLowerCase().replace(/[\s-]/g, "");
      const rosterToken = name.replace(/[\s-]/g, "");
      expect(rosterToken).toContain(modelToken);
    }
  });

  it("each mill carries the physics/safety-critical sections PRISM consumers read", () => {
    for (const id of U_MACH01_MILLS) {
      const hbk = machineHandbookRegistry.getByMachineId(id) as MachineHandbook;
      // spindle: max_rpm + taper drive the speed/feed + tooling-fit consumers
      expect(hbk.spindle_specs?.max_rpm).toBeGreaterThanOrEqual(1000);
      expect((hbk.spindle_specs?.taper_type ?? "").length).toBeGreaterThanOrEqual(3);
      // axes: ≥3 linear axes + a populated work envelope
      expect((hbk.axis_kinematics?.axes.length ?? 0)).toBeGreaterThanOrEqual(3);
      expect(hbk.axis_kinematics?.work_envelope_mm?.x).toBeGreaterThanOrEqual(100);
      // controller + tooling + at least one safety limit
      expect((hbk.controller_features?.controller_model ?? "").length).toBeGreaterThanOrEqual(2);
      expect((hbk.tooling_constraints?.taper_type ?? "").length).toBeGreaterThanOrEqual(3);
      expect(hbk.safety_limits.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("provenance is HONEST: web_scrape spec-sheet tier, confidence 0.6–0.85 (never 0.95/manual)", () => {
    for (const id of U_MACH01_MILLS) {
      const hbk = machineHandbookRegistry.getByMachineId(id) as MachineHandbook;
      const sources = collectSources(hbk);
      expect(sources.length).toBeGreaterThanOrEqual(4); // spindle+axes+controller+tooling at minimum
      const badMethod = sources.filter((s) => s.extraction_method !== "web_scrape");
      expect(badMethod.map((s) => s.extraction_method)).toEqual([]);
      const overConfident = sources.filter(
        (s) => s.confidence < SPEC_SHEET_CONF_MIN || s.confidence > SPEC_SHEET_CONF_MAX,
      );
      expect(overConfident.map((s) => s.confidence)).toEqual([]);
    }
  });

  it("no fabricated OEM data: alarm_codes and parts_book are empty for spec-sheet tier", () => {
    // We cannot source OEM part numbers / alarm codes from public spec sheets,
    // so these arrays MUST stay empty — fabricating them would be a R12 violation.
    for (const id of U_MACH01_MILLS) {
      const hbk = machineHandbookRegistry.getByMachineId(id) as MachineHandbook;
      expect(hbk.alarm_codes.length).toBe(0);
      expect(hbk.parts_book.length).toBe(0);
    }
  });

  it("Haas VF-2 (VMC-03) carries its known CT40 / 8100-RPM-class spindle + PRE-NGC control", () => {
    const hbk = machineHandbookRegistry.getByMachineId("VMC-03") as MachineHandbook;
    expect(hbk.manufacturer).toBe("Haas");
    expect(hbk.spindle_specs?.taper_type).toBe("CT40");
    expect(hbk.spindle_specs?.max_rpm).toBe(8100);
    expect(hbk.controller_features?.controller_manufacturer).toBe("Haas");
    // VF-2 published travels: X 762 / Y 406 / Z 508 mm (30"/16"/20")
    expect(hbk.axis_kinematics?.work_envelope_mm).toEqual({ x: 762, y: 406, z: 508 });
  });

  it("Okuma M460V-5AX (VMC-02) is a true 5-axis machine with A+C rotary axes", () => {
    const hbk = machineHandbookRegistry.getByMachineId("VMC-02") as MachineHandbook;
    expect(hbk.axis_kinematics?.simultaneous_axes).toBe(5);
    const axisNames = (hbk.axis_kinematics?.axes ?? []).map((a) => a.name).sort();
    expect(axisNames).toEqual(["A", "C", "X", "Y", "Z"]);
    // Okuma OSP control family
    expect(hbk.controller_features?.controller_manufacturer).toBe("Okuma");
  });

  it("Hurco VM30i (VMC-01) carries the WinMAX conversational control", () => {
    const hbk = machineHandbookRegistry.getByMachineId("VMC-01") as MachineHandbook;
    expect(hbk.manufacturer).toBe("Hurco");
    expect((hbk.controller_features?.controller_model ?? "").toLowerCase()).toContain("winmax");
    expect(hbk.controller_features?.conversational_mode).toBe(true);
    // Corrected published geometry/spindle (U-MACH01 spec-accuracy scrutiny fix — the
    // first draft cloned the Haas 762/406/508 + 8.9 kW; the VM30i is a 50x20x20" / 20 hp machine).
    // Locks the fix so a regression to the wrong geometry fails here.
    expect(hbk.axis_kinematics?.work_envelope_mm).toEqual({ x: 1270, y: 508, z: 508 });
    expect(hbk.spindle_specs?.power_continuous_kw).toBe(15);
    expect(hbk.tooling_constraints?.magazine_capacity).toBe(24);
  });
});
