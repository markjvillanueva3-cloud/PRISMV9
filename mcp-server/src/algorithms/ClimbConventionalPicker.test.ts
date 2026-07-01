import { describe, it, expect } from "vitest";
import { pickDirection, ClimbConventionalPicker, type ClimbConventionalInput } from "./ClimbConventionalPicker.js";

describe("ClimbConventionalPicker", () => {
  describe("safety rule 1 — backlash > 0.05mm forces conventional", () => {
    it("high backlash on modern machine still forces conventional", () => {
      const r = pickDirection({ iso_group: "P", machine_class: "modern_hmc_rigid", backlash_mm: 0.10, operation: "roughing" });
      expect(r.decision).toBe("conventional");
      expect(r.reasons.join("|")).toContain("pull part into cutter");
      expect(r.confidence.value).toBeGreaterThan(0.95);
    });
    it("manual_legacy machine always conventional regardless of backlash", () => {
      const r = pickDirection({ iso_group: "P", machine_class: "manual_legacy", backlash_mm: 0.01, operation: "finish" });
      expect(r.decision).toBe("conventional");
    });
  });

  describe("K-group roughing rule", () => {
    it("K-group roughing → conventional for tool life", () => {
      const r = pickDirection({ iso_group: "K", machine_class: "modern_hmc_rigid", backlash_mm: 0.01, operation: "roughing" });
      expect(r.decision).toBe("conventional");
      expect(r.reasons.join("|")).toContain("better tool life");
    });
    it("K-group FINISH still climbs (rule is roughing-specific)", () => {
      const r = pickDirection({ iso_group: "K", machine_class: "modern_hmc_rigid", backlash_mm: 0.01, operation: "finish", ra_target_um: 0.8 });
      expect(r.decision).toBe("climb");
    });
  });

  describe("finish-Ra rule on rigid machine", () => {
    it("Ra < 1.6 + rigid → climb mandatory", () => {
      const r = pickDirection({ iso_group: "P", machine_class: "modern_hmc_rigid", backlash_mm: 0.01, operation: "finish", ra_target_um: 0.8 });
      expect(r.decision).toBe("climb");
      expect(r.reasons.join("|")).toContain("Ra");
    });
    it("soft backlash warn surfaces in notes for finish-climb", () => {
      const r = pickDirection({ iso_group: "P", machine_class: "modern_hmc_rigid", backlash_mm: 0.03, operation: "finish", ra_target_um: 0.4 });
      expect(r.decision).toBe("climb");
      expect(r.notes.join("|")).toContain("reverse-clearance");
    });
  });

  describe("default rule variability (3+ ISO groups)", () => {
    it("rigid + P (steel) → climb with HSM-default reason", () => {
      const r = pickDirection({ iso_group: "P", machine_class: "modern_hmc_rigid", backlash_mm: 0.01, operation: "semi_finish" });
      expect(r.decision).toBe("climb");
      expect(r.reasons.join("|")).toContain("HSM default");
    });
    it("rigid + S (Inconel) → climb with work-hardening reason + higher confidence", () => {
      const r = pickDirection({ iso_group: "S", machine_class: "modern_hmc_rigid", backlash_mm: 0.01, operation: "semi_finish" });
      expect(r.decision).toBe("climb");
      expect(r.reasons.join("|")).toContain("work-hardening");
      expect(r.confidence.value).toBeGreaterThan(0.9);
    });
    it("rigid + M (stainless) → climb with work-hardening reason", () => {
      const r = pickDirection({ iso_group: "M", machine_class: "modern_hmc_rigid", backlash_mm: 0.01, operation: "semi_finish" });
      expect(r.decision).toBe("climb");
      expect(r.reasons.join("|")).toContain("work-hardening");
    });
    it("legacy_3axis + medium backlash → conventional (safer)", () => {
      const r = pickDirection({ iso_group: "P", machine_class: "legacy_3axis", backlash_mm: 0.03, operation: "roughing" });
      expect(r.decision).toBe("conventional");
    });
    it("legacy_3axis + low backlash → climb with operator-override note", () => {
      const r = pickDirection({ iso_group: "P", machine_class: "legacy_3axis", backlash_mm: 0.01, operation: "roughing" });
      expect(r.decision).toBe("climb");
      expect(r.notes.join("|")).toContain("override permitted");
    });
  });

  describe("R12 fail-loud invalid input", () => {
    it("unknown iso_group → conservative conventional + diagnostic", () => {
      const r = pickDirection({ iso_group: "ZZ" as ClimbConventionalInput["iso_group"], machine_class: "modern_hmc_rigid", backlash_mm: 0.01, operation: "finish" });
      expect(r.decision).toBe("conventional");
      expect(r.notes.join("|")).toContain("unknown iso_group: ZZ");
    });
    it("unknown machine_class → conservative conventional + diagnostic", () => {
      const r = pickDirection({ iso_group: "P", machine_class: "spaceship" as ClimbConventionalInput["machine_class"], backlash_mm: 0.01, operation: "finish" });
      expect(r.notes.join("|")).toContain("unknown machine_class");
    });
    it("NaN backlash → diagnostic", () => {
      const r = pickDirection({ iso_group: "P", machine_class: "modern_hmc_rigid", backlash_mm: NaN, operation: "finish" });
      expect(r.notes.join("|")).toContain("not finite");
    });
    it("negative backlash → diagnostic", () => {
      const r = pickDirection({ iso_group: "P", machine_class: "modern_hmc_rigid", backlash_mm: -0.01, operation: "finish" });
      expect(r.notes.join("|")).toContain("negative");
    });
    it("missing input → conservative conventional", () => {
      const r = pickDirection(null as unknown as ClimbConventionalInput);
      expect(r.decision).toBe("conventional");
      expect(r.notes.join("|")).toContain("missing");
    });
  });

  it("ClimbConventionalPicker.version is 1.0.0", () => {
    expect(ClimbConventionalPicker.version).toBe("1.0.0");
  });
});
