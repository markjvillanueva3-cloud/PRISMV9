/**
 * LatheSubSpindleTransferPurgeEngine Test Suite (LATHE-PRO-MS7)
 */
import { describe, it, expect } from "vitest";
import { latheSubSpindleTransferPurgeEngine } from "../engines/LatheSubSpindleTransferPurgeEngine.js";

describe("LatheSubSpindleTransferPurgeEngine", () => {
  describe("plan()", () => {
    it("produces 6-7 transfer phases", () => {
      const r = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 2000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
      });
      expect(r.phases.length).toBeGreaterThanOrEqual(6);
      expect(r.phases.length).toBeLessThanOrEqual(7);
    });

    it("omits chip_blast phase when air blast unavailable", () => {
      const r = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 2000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: false,
      });
      expect(r.phases.some((p) => p.name === "chip_blast")).toBe(false);
    });

    it("longer transfer part triggers longer blast", () => {
      const short = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 2000,
        transfer_length_mm: 30,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
      });
      const long = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 2000,
        transfer_length_mm: 150,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
      });
      expect(long.air_blast_duration_sec).toBeGreaterThan(short.air_blast_duration_sec);
    });

    it("sticky material (M group) increases blast duration", () => {
      const base = {
        main_rpm: 2000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
      };
      const baseline = latheSubSpindleTransferPurgeEngine.plan(base);
      const stainless = latheSubSpindleTransferPurgeEngine.plan({ ...base, material_iso_group: "M" });
      expect(stainless.air_blast_duration_sec).toBeGreaterThan(baseline.air_blast_duration_sec);
    });

    it("high contamination risk when no air blast + sticky material", () => {
      const r = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 3000,
        transfer_length_mm: 120,
        transfer_diameter_mm: 15,
        coolant_pressure_bar: 70,
        air_blast_available: false,
        material_iso_group: "M",
      });
      expect(r.contamination_risk).toBe("high");
      expect(r.contamination_score).toBeGreaterThan(0.55);
    });

    it("spindle_decel scales with main_rpm", () => {
      const slow = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 500,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
      });
      const fast = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 5000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
      });
      expect(fast.spindle_decel_sec).toBeGreaterThan(slow.spindle_decel_sec);
    });

    it("synchronous_transfer uses faster approach", () => {
      const base = {
        main_rpm: 2000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
      };
      const sync = latheSubSpindleTransferPurgeEngine.plan({ ...base, synchronous_transfer: true });
      const stopped = latheSubSpindleTransferPurgeEngine.plan({ ...base, synchronous_transfer: false });
      const syncApproach = sync.phases.find((p) => p.name === "approach")!.duration_sec;
      const stoppedApproach = stopped.phases.find((p) => p.name === "approach")!.duration_sec;
      expect(syncApproach).toBeLessThan(stoppedApproach);
    });

    it("Okuma controller emits M87 for main chuck open", () => {
      const r = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 2000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
        controller: "okuma_osp",
      });
      const open = r.phases.find((p) => p.name === "chuck_release")!;
      expect(open.mcode_hint).toBe("M87");
    });

    it("Fanuc controller emits G114.1 for sync mode", () => {
      const r = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 2000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
        controller: "fanuc",
        synchronous_transfer: true,
      });
      const brake = r.phases.find((p) => p.name === "spindle_brake")!;
      expect(brake.mcode_hint).toBe("G114.1");
    });

    it("coolant_off_lead longer for high pressure coolant", () => {
      const low = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 2000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 20,
        air_blast_available: true,
      });
      const high = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 2000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 70,
        air_blast_available: true,
      });
      expect(high.coolant_off_lead_sec).toBeGreaterThanOrEqual(low.coolant_off_lead_sec);
    });

    it("total time is sum of phase durations", () => {
      const r = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 2000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
      });
      const sum = r.phases.reduce((s, p) => s + p.duration_sec, 0);
      expect(r.total_transfer_time_sec).toBeCloseTo(sum, 1);
    });

    it("contamination score in [0, 1]", () => {
      const r = latheSubSpindleTransferPurgeEngine.plan({
        main_rpm: 2000,
        transfer_length_mm: 50,
        transfer_diameter_mm: 20,
        coolant_pressure_bar: 40,
        air_blast_available: true,
      });
      expect(r.contamination_score).toBeGreaterThanOrEqual(0);
      expect(r.contamination_score).toBeLessThanOrEqual(1);
    });
  });

  describe("getStats()", () => {
    it("reports supported controllers and phase count", () => {
      const s = latheSubSpindleTransferPurgeEngine.getStats();
      expect(s.supported_controllers).toContain("okuma_osp");
      expect(s.supported_controllers).toContain("citizen_l20");
      expect(s.phases_modeled).toBe(7);
    });
  });
});
