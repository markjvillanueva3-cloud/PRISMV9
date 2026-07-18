import { describe, it, expect } from "vitest";
import { shopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";

/**
 * U-KSF-01 -- the 5 JM Die mills (VMC-01..05) must carry OEM-verified spindle caps
 * (max_rpm + max_power_kw). Before this unit they had business fields only, so
 * GET /api/v1/shop/machines served no rpm/power and the new SFC page could not pass
 * machine_max_rpm to sf_orchestrate (the lathes already had caps).
 *
 * Reference values are OEM spindle nameplates (web-verified 2026-06-26). Two of them
 * CORRECT the Claude-design jm-data.js catalog, which this test locks against regress:
 *   - Haas OM-2 power : design 7.5 hp -> real 5 hp (3.7 kW) ISO20 office-mill spindle
 *   - Roku-Roku rpm   : design 40,000 -> real 32,000 (HC-658 II tops at 32k; 40k = 25% over-speed)
 */
describe("U-KSF-01: JM mill spindle caps (ShopConfigurationEngine)", () => {
  const machines = shopConfigurationEngine.getMachines() as Array<Record<string, unknown>>;
  const byId = (id: string) => machines.find((m) => m.id === id);
  const MILLS = ["VMC-01", "VMC-02", "VMC-03", "VMC-04", "VMC-05"];

  it("getMachines() returns all 5 JM mills", () => {
    for (const id of MILLS) expect(byId(id), `${id} present`).toBeTruthy();
  });

  it("every JM mill now carries a positive max_rpm and max_power_kw (gap closed)", () => {
    for (const id of MILLS) {
      const m = byId(id)!;
      expect(typeof m.max_rpm === "number" && (m.max_rpm as number) > 0, `${id}.max_rpm > 0`).toBe(true);
      expect(typeof m.max_power_kw === "number" && (m.max_power_kw as number) > 0, `${id}.max_power_kw > 0`).toBe(true);
    }
  });

  it("locks the OEM-verified spindle nameplates", () => {
    expect(byId("VMC-01")).toMatchObject({ max_rpm: 12000, max_power_kw: 15 });
    expect(byId("VMC-02")).toMatchObject({ max_rpm: 15000, max_power_kw: 22, max_torque_nm: 199 });
    expect(byId("VMC-03")).toMatchObject({ max_rpm: 8100, max_power_kw: 22.4, max_torque_nm: 122 });
    expect(byId("VMC-04")).toMatchObject({ max_rpm: 30000, max_power_kw: 3.7 });
    expect(byId("VMC-05")).toMatchObject({ max_rpm: 32000, max_power_kw: 11 });
  });

  it("rejects the two divergent Claude-design values (regression guard)", () => {
    // OM-2 is a 5 hp (3.7 kW) office mill, NOT 7.5 hp (~5.6 kW).
    expect(byId("VMC-04")!.max_power_kw).not.toBe(5.6);
    // HC-658 II tops at 32k rpm, NOT 40k.
    expect(byId("VMC-05")!.max_rpm).not.toBe(40000);
    expect(byId("VMC-05")!.max_rpm as number).toBeLessThanOrEqual(32000);
  });
});
