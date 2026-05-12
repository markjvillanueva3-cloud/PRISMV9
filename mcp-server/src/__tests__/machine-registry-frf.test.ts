/**
 * MachineRegistry FRF Data Tests (INTEG-MS4)
 * Tests for FRF lookup, fallback defaults, and calibration.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { machineRegistry, type FRFData } from "../registries/MachineRegistry.js";

describe("MachineRegistry FRF Data (INTEG-MS4)", () => {
  beforeAll(async () => {
    // Ensure registry is loaded
    await machineRegistry.load();
  });

  describe("U-INTEG18: FRF Data Schema", () => {
    it("should have FRFData interface with required fields", () => {
      const frfDefaults = machineRegistry.getFRFDefaults();
      const vmcDefault = frfDefaults.vmc;

      expect(vmcDefault).toBeDefined();
      expect(vmcDefault.natural_frequency_hz).toBeGreaterThan(0);
      expect(vmcDefault.damping_ratio).toBeGreaterThan(0);
      expect(vmcDefault.stiffness_n_um).toBeGreaterThan(0);
      expect(vmcDefault.source).toBe("estimated");
    });

    it("should have defaults for all major machine classes", () => {
      const defaults = machineRegistry.getFRFDefaults();
      const expectedClasses = ["vmc", "hmc", "lathe", "5-axis", "mill-turn", "edm", "grinder", "default"];

      for (const cls of expectedClasses) {
        expect(defaults[cls]).toBeDefined();
        expect(defaults[cls].natural_frequency_hz).toBeGreaterThan(0);
        expect(defaults[cls].damping_ratio).toBeGreaterThan(0);
        expect(defaults[cls].damping_ratio).toBeLessThan(1); // damping ratio < 1 for underdamped
        expect(defaults[cls].stiffness_n_um).toBeGreaterThan(0);
      }
    });

    it("should have physically reasonable FRF values", () => {
      const defaults = machineRegistry.getFRFDefaults();

      for (const [cls, frf] of Object.entries(defaults)) {
        // Natural frequency: typical range 100-3000 Hz for machine tools
        expect(frf.natural_frequency_hz).toBeGreaterThanOrEqual(100);
        expect(frf.natural_frequency_hz).toBeLessThanOrEqual(3000);

        // Damping ratio: 0.01-0.1 typical for steel structures
        expect(frf.damping_ratio).toBeGreaterThanOrEqual(0.005);
        expect(frf.damping_ratio).toBeLessThanOrEqual(0.2);

        // Stiffness: 5-200 N/µm typical for machine tools
        expect(frf.stiffness_n_um).toBeGreaterThanOrEqual(5);
        expect(frf.stiffness_n_um).toBeLessThanOrEqual(200);
      }
    });
  });

  describe("U-INTEG19: Registry Lookup (getFRF)", () => {
    it("should return FRF data for any machine ID", () => {
      const frf = machineRegistry.getFRF("UNKNOWN-MACHINE-123");

      expect(frf).toBeDefined();
      expect(frf.natural_frequency_hz).toBeGreaterThan(0);
      expect(frf.damping_ratio).toBeGreaterThan(0);
      expect(frf.stiffness_n_um).toBeGreaterThan(0);
      expect(frf.is_default).toBe(true); // Should be default for unknown machine
    });

    it("should return is_default=true for machines without measured data", () => {
      const frf = machineRegistry.getFRF("nonexistent-machine");

      expect(frf.is_default).toBe(true);
      expect(frf.machine_class).toBeDefined();
      expect(frf.source).toBe("estimated");
    });

    it("should include machine_class in response", () => {
      const frf = machineRegistry.getFRF("test-vmc");

      expect(frf.machine_class).toBeDefined();
      expect(typeof frf.machine_class).toBe("string");
    });

    it("should handle empty machine_id gracefully", () => {
      const frf = machineRegistry.getFRF("");

      expect(frf).toBeDefined();
      expect(frf.is_default).toBe(true);
      expect(frf.machine_class).toBe("default");
    });
  });

  describe("U-INTEG20: Fallback Defaults by Machine Class", () => {
    it("should infer VMC class for vertical mills", () => {
      // If we have a VMC in registry, test it
      const stats = machineRegistry.getStats();
      if (stats.byType["vmc"]) {
        // Find a VMC machine
        const vmcs = machineRegistry.search({ type: "vmc", limit: 1 });
        if (vmcs.machines.length > 0) {
          const frf = machineRegistry.getFRF(vmcs.machines[0].id);
          expect(["vmc", "hmc", "default"]).toContain(frf.machine_class);
        }
      }
    });

    it("should use class-specific defaults with different stiffness values", () => {
      const defaults = machineRegistry.getFRFDefaults();

      // Lathe should be stiffer than VMC (radial stiffness)
      expect(defaults.lathe.stiffness_n_um).toBeGreaterThan(defaults.vmc.stiffness_n_um);

      // HMC should be stiffer than VMC (horizontal design advantage)
      expect(defaults.hmc.stiffness_n_um).toBeGreaterThan(defaults.vmc.stiffness_n_um);

      // 5-axis should be less stiff (kinematic chain compliance)
      expect(defaults["5-axis"].stiffness_n_um).toBeLessThan(defaults.vmc.stiffness_n_um);

      // EDM should have highest stiffness (precision requirement)
      expect(defaults.edm.stiffness_n_um).toBeGreaterThan(defaults.lathe.stiffness_n_um);
    });

    it("should use class-specific defaults with appropriate frequency ranges", () => {
      const defaults = machineRegistry.getFRFDefaults();

      // Grinder has high-speed spindle, higher natural frequency
      expect(defaults.grinder.natural_frequency_hz).toBeGreaterThan(defaults.vmc.natural_frequency_hz);

      // EDM precision — high frequency
      expect(defaults.edm.natural_frequency_hz).toBeGreaterThan(defaults.vmc.natural_frequency_hz);

      // Lathe typically lower frequency than VMC
      expect(defaults.lathe.natural_frequency_hz).toBeLessThan(defaults.vmc.natural_frequency_hz);
    });

    it("should use 'default' class for unknown machine types", () => {
      const frf = machineRegistry.getFRF("WEIRD-UNKNOWN-TYPE-XYZ");

      expect(frf.machine_class).toBe("default");
      expect(frf.is_default).toBe(true);
    });
  });

  describe("FRF Update and Retrieval", () => {
    it("should track machines with measured FRF data", () => {
      const machinesWithFRF = machineRegistry.getMachinesWithFRF();

      expect(Array.isArray(machinesWithFRF)).toBe(true);
      // Each entry should have id, machine, and frf
      for (const entry of machinesWithFRF) {
        expect(entry.id).toBeDefined();
        expect(entry.machine).toBeDefined();
        expect(entry.frf).toBeDefined();
        expect(entry.frf.natural_frequency_hz).toBeGreaterThan(0);
      }
    });

    it("should return full FRF defaults table", () => {
      const defaults = machineRegistry.getFRFDefaults();

      expect(typeof defaults).toBe("object");
      expect(Object.keys(defaults).length).toBeGreaterThanOrEqual(7);

      // Verify structure of each default
      for (const frf of Object.values(defaults)) {
        expect(frf.natural_frequency_hz).toBeDefined();
        expect(frf.damping_ratio).toBeDefined();
        expect(frf.stiffness_n_um).toBeDefined();
        expect(frf.source).toBe("estimated");
      }
    });
  });

  describe("Integration with ChatterStabilityLobeEngine", () => {
    it("should provide data compatible with chatter calculations", () => {
      const frf = machineRegistry.getFRF("test-machine");

      // Critical ratio k_ratio = stiffness / (2 * zeta * sqrt(k * m))
      // For our use case, we need f_n, zeta, k
      const f_n = frf.natural_frequency_hz;
      const zeta = frf.damping_ratio;
      const k = frf.stiffness_n_um;

      // Calculate modal mass from f_n and k: f_n = (1/2π) * sqrt(k/m)
      // k is in N/µm = 1e6 N/m
      const k_si = k * 1e6; // N/m
      const omega_n = 2 * Math.PI * f_n; // rad/s
      const m = k_si / (omega_n * omega_n); // kg

      expect(m).toBeGreaterThan(0);
      expect(m).toBeLessThan(10000); // Reasonable modal mass range

      // Calculate critical depth of cut factor (simplified)
      // a_lim = -1 / (2 * Kf * Re(G))
      // where Re(G) = negative real part at chatter frequency
      // We just verify values are reasonable for the calculation
      expect(f_n).toBeGreaterThan(0);
      expect(zeta).toBeGreaterThan(0);
      expect(k).toBeGreaterThan(0);
    });

    it("should enable stability lobe calculation", () => {
      const frf = machineRegistry.getFRF("vmc-test");

      // Stability lobes require: f_n, zeta, k, Ks (specific cutting force)
      // Given typical Ks ~ 2000 N/mm², we can compute critical depth
      const Ks = 2000; // N/mm² (typical for steel)
      const zeta = frf.damping_ratio;
      const k = frf.stiffness_n_um * 1e-3; // Convert to N/mm

      // Critical depth at stability boundary (simplified Altintas formula)
      // a_lim_min ≈ 2 * k * zeta / Ks (at the lobes)
      const a_lim_approx = (2 * k * zeta) / Ks;

      expect(a_lim_approx).toBeGreaterThan(0);
      // Should be in reasonable range for depth of cut (mm)
      expect(a_lim_approx).toBeLessThan(100); // Less than 100mm depth
    });
  });

  describe("Edge Cases", () => {
    it("should handle machine_id with special characters", () => {
      const frf = machineRegistry.getFRF("machine/with-special_chars.123");

      expect(frf).toBeDefined();
      expect(frf.is_default).toBe(true);
    });

    it("should return consistent defaults for same machine class", () => {
      const frf1 = machineRegistry.getFRF("unknown-1");
      const frf2 = machineRegistry.getFRF("unknown-2");

      // Both should be defaults
      expect(frf1.is_default).toBe(true);
      expect(frf2.is_default).toBe(true);

      // Both should have same values (same default class)
      expect(frf1.natural_frequency_hz).toBe(frf2.natural_frequency_hz);
      expect(frf1.damping_ratio).toBe(frf2.damping_ratio);
      expect(frf1.stiffness_n_um).toBe(frf2.stiffness_n_um);
    });

    it("should handle null/undefined gracefully", () => {
      // @ts-expect-error testing null input
      expect(() => machineRegistry.getFRF(null)).not.toThrow();
      // @ts-expect-error testing undefined input
      expect(() => machineRegistry.getFRF(undefined)).not.toThrow();
    });
  });
});
