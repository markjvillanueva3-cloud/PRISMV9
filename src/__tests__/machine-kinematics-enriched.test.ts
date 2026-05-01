/**
 * Machine Kinematics Enriched — Validation Tests
 * Verifies 660 inferred kinematic chain entries are well-formed
 */
import { describe, it, expect } from "vitest";
import { MACHINE_KINEMATICS_ENRICHED, CONTROLLER_FEATURES } from "../data/machine-kinematics-enriched.js";

describe("Machine Kinematics Enriched", () => {
  it("has 600+ entries", () => {
    expect(MACHINE_KINEMATICS_ENRICHED.length).toBeGreaterThan(600);
  });

  it("every entry has required fields", () => {
    for (const entry of MACHINE_KINEMATICS_ENRICHED) {
      expect(entry.manufacturer).toBeTruthy();
      expect(entry.model).toBeTruthy();
      expect(entry.type).toBeTruthy();
      expect(entry.id).toBeTruthy();
      expect(entry.kinematic_chain).toBeTruthy();
      expect(entry.kinematic_chain.type).toBeTruthy();
    }
  });

  it("every entry has collision zones", () => {
    for (const entry of MACHINE_KINEMATICS_ENRICHED) {
      expect(entry.collision_zones).toBeTruthy();
      expect(entry.collision_zones!["spindle_nose"]).toBeTruthy();
      expect(entry.collision_zones!["work_envelope"]).toBeTruthy();
    }
  });

  it("kinematic chain has valid type", () => {
    const validTypes = ["XYZ_VMC", "XYZB_HORIZONTAL", "XYZBC_TRUNNION", "XYZBC_SWIVEL",
                        "XYZBC_MILLTURN", "ZX_LATHE", "ZXY_LATHE", "ZXY_SWISS", "XYZ_BRIDGE"];
    for (const entry of MACHINE_KINEMATICS_ENRICHED) {
      expect(validTypes).toContain(entry.kinematic_chain.type);
    }
  });

  it("collision zones have valid geometry", () => {
    for (const entry of MACHINE_KINEMATICS_ENRICHED) {
      const envelope = entry.collision_zones!["work_envelope"] as any;
      expect(envelope.x_max).toBeGreaterThan(0);
      expect(envelope.z_min).toBeLessThanOrEqual(0);
    }
  });

  it("no duplicate models", () => {
    const models = MACHINE_KINEMATICS_ENRICHED.map(e => e.model);
    const unique = new Set(models);
    expect(unique.size).toBe(models.length);
  });

  it("VMC entries have c_frame structure", () => {
    const vmcs = MACHINE_KINEMATICS_ENRICHED.filter(e => e.kinematic_chain.type === "XYZ_VMC");
    expect(vmcs.length).toBeGreaterThan(100);
    for (const vmc of vmcs) {
      expect(vmc.kinematic_chain.structure).toBe("c_frame_vertical");
    }
  });

  it("lathe entries have slant_bed structure", () => {
    const lathes = MACHINE_KINEMATICS_ENRICHED.filter(e => e.kinematic_chain.type === "ZX_LATHE");
    expect(lathes.length).toBeGreaterThan(50);
    for (const lathe of lathes) {
      expect(lathe.kinematic_chain.structure).toBe("slant_bed_turret");
    }
  });

  it("controller features has 9 families", () => {
    expect(Object.keys(CONTROLLER_FEATURES).length).toBe(9);
  });

  it("each controller family has all required fields", () => {
    for (const [name, features] of Object.entries(CONTROLLER_FEATURES)) {
      expect(features.hsm_codes.length).toBeGreaterThan(0);
      expect(features.tcp).toBeTruthy();
      expect(features.probing).toBeTruthy();
      expect(features.coolant).toBeTruthy();
      expect(features.work_offsets).toBeTruthy();
    }
  });

  it("Fanuc has AICC and AIAPC codes", () => {
    expect(CONTROLLER_FEATURES["Fanuc"].hsm_codes).toContain("G05.1 Q1");
  });

  it("Haas has NGC codes", () => {
    expect(CONTROLLER_FEATURES["Haas"].hsm_codes).toContain("G187 P1-P3");
  });
});
