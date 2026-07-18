import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

/**
 * Round-trip wire test for `spindle_torque_available` (SpindleTorqueCurveEngine
 * .getAvailableTorqueAndPower, calcDispatcher.ts:5412) through prism_calc. The engine was WIRED to
 * 5 spindle actions but had NO dedicated test (only the separate SpindleTorqueGateEngine is tested)
 * -- coverage gap found by the 2026-07-03 physics-coverage workflow (operator's named "spindle power
 * + torque curves" family). These invoke THROUGH the dispatcher and assert the load-bearing spindle
 * physics: the two-region characteristic (constant TORQUE below base speed, constant POWER above) and
 * the P = tau * omega identity, so a dropped 2pi/60 factor or a wrong region boundary diverges.
 */
interface CapturedTool { name: string; handler: (args: any) => Promise<any>; }

function calcTool(): CapturedTool {
  const tools: CapturedTool[] = [];
  const server = { tool(name: string, _d: string, _s: any, handler: any) { tools.push({ name, handler }); } };
  registerCalcDispatcher(server);
  return tools[0];
}

async function call(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await tool.handler({ action, params });
  const text = r?.content?.[0]?.text;
  return text ? JSON.parse(text) : r;
}

// Explicit spindle (independent of the preset table): P=22kW, tau=120Nm -> base speed = P*60000/(2pi*tau) ~ 1751 rpm.
const SPINDLE = { max_power_kW: 22, max_torque_Nm: 120, base_speed_rpm: 1750, max_rpm: 8000, drive_type: "belt" };

// P[kW] = tau[Nm] * omega[rad/s] / 1000, omega = 2*pi*rpm/60.
function powerFromTorque(tau: number, rpm: number): number {
  return (tau * ((2 * Math.PI * rpm) / 60)) / 1000;
}

describe("prism_calc spindle_torque_available wire (U-OSC-SPINDLE-TORQUE-TEST)", () => {
  const calc = calcTool();

  it("routes to the engine and returns torque/power/region (not the dead-action throw)", async () => {
    const r = await call(calc, "spindle_torque_available", { rpm: 1000, spindle: SPINDLE });
    expect(JSON.stringify(r)).not.toMatch(/Unknown calculation action/);
    expect(r.available_torque_Nm).toBeGreaterThan(0);
    expect(r.available_power_kW).toBeGreaterThan(0);
    expect(typeof r.region).toBe("string");
  });

  it("CONSTANT-TORQUE region below base speed: torque ~ max_torque, power below rated", async () => {
    const r = await call(calc, "spindle_torque_available", { rpm: 1000, spindle: SPINDLE });
    // Below 1750 rpm the torque is capped at the motor's max torque (120 Nm).
    expect(r.available_torque_Nm).toBeCloseTo(120, 0);
    // Power at 1000 rpm = 120 * 2pi*1000/60 / 1000 = 12.57 kW, well under the 22 kW rating.
    expect(r.available_power_kW).toBeLessThan(22);
    expect(r.available_power_kW).toBeCloseTo(powerFromTorque(120, 1000), 1);
  });

  it("CONSTANT-POWER region above base speed: power ~ max_power, torque falls as 1/rpm", async () => {
    const r = await call(calc, "spindle_torque_available", { rpm: 5000, spindle: SPINDLE });
    // Above 1750 rpm the power is capped at 22 kW and torque drops: tau = P*60000/(2pi*rpm) ~ 42 Nm.
    expect(r.available_power_kW).toBeCloseTo(22, 0);
    expect(r.available_torque_Nm).toBeLessThan(120);
    expect(r.available_torque_Nm).toBeCloseTo((22 * 60000) / (2 * Math.PI * 5000), 0);
  });

  it("PHYSICS IDENTITY P = tau * omega holds in both regions (within rounding)", async () => {
    for (const rpm of [800, 1500, 3000, 6000]) {
      const r = await call(calc, "spindle_torque_available", { rpm, spindle: SPINDLE });
      const expectedKw = powerFromTorque(r.available_torque_Nm, rpm);
      const relErr = Math.abs(r.available_power_kW - expectedKw) / expectedKw;
      expect(relErr).toBeLessThan(0.02); // r2/r3 display rounding only
    }
  });

  it("MONOTONICITY: torque is non-increasing with rpm above base speed", async () => {
    const lo = await call(calc, "spindle_torque_available", { rpm: 2500, spindle: SPINDLE });
    const hi = await call(calc, "spindle_torque_available", { rpm: 7000, spindle: SPINDLE });
    expect(hi.available_torque_Nm).toBeLessThanOrEqual(lo.available_torque_Nm);
  });

  it("MONOTONICITY: power is non-decreasing with rpm below base speed", async () => {
    const lo = await call(calc, "spindle_torque_available", { rpm: 500, spindle: SPINDLE });
    const hi = await call(calc, "spindle_torque_available", { rpm: 1500, spindle: SPINDLE });
    expect(hi.available_power_kW).toBeGreaterThanOrEqual(lo.available_power_kW);
  });

  it("never exceeds the motor ratings (torque <= max_torque, power <= max_power + eps)", async () => {
    for (const rpm of [300, 1750, 4000, 8000]) {
      const r = await call(calc, "spindle_torque_available", { rpm, spindle: SPINDLE });
      expect(r.available_torque_Nm).toBeLessThanOrEqual(120 * 1.001);
      expect(r.available_power_kW).toBeLessThanOrEqual(22 * 1.001);
    }
  });
});
