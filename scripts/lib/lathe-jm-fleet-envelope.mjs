#!/usr/bin/env node
/**
 * lathe-jm-fleet-envelope.mjs -- slot:whiskey [KIENZLE closed-loop safety envelope]
 * ==========================================================================
 * PURE: reduce a list of shop machines to the JM lathe fleet spindle/power envelope
 * used by the closed-loop safety/efficiency scorer. The machine specs are SOURCED from
 * `ShopConfigurationEngine.getMachines()` (LTH-01..07) -- the caller passes them in;
 * this lib never inlines/duplicates them (R8) and is unit-testable with mock machines.
 *
 * SAFETY DOCTRINE (whiskey soul refuse: softening-safety-thresholds):
 *   The closed-loop check uses the **fleet FLOOR** (the MOST restrictive lathe -- min rpm,
 *   min power), NOT the max. A program within the floor is feasible on EVERY JM lathe; a
 *   program that exceeds it is flagged (it overspeeds/overloads at least the weakest machine).
 *   Using the floor can never mark a program SAFE that would stall the weakest machine
 *   (no false-SAFE). The max envelope is also returned (informational -- "runnable on the
 *   most-capable machine"), but the safety check consumes the FLOOR.
 *
 * Pure (no I/O) + exported for direct unit testing.
 */

/** Is this machine a lathe with usable rpm + power limits? */
function isLatheWithLimits(m) {
  return !!m && /lathe/i.test(String(m.type || "")) &&
    Number.isFinite(m.max_rpm) && m.max_rpm > 0 &&
    Number.isFinite(m.max_power_kw) && m.max_power_kw > 0;
}

/**
 * @param {Array<{type?:string, max_rpm?:number, max_power_kw?:number}>} machines  e.g. shopConfigurationEngine.getMachines()
 * @returns {{ok:boolean, reason?:string, lathe_count?:number,
 *            floor?:{max_spindle_rpm:number, max_power_kW:number},
 *            max?:{max_spindle_rpm:number, max_power_kW:number}, source?:string}}
 */
export function fleetEnvelope(machines) {
  const lathes = (machines || []).filter(isLatheWithLimits);
  if (lathes.length === 0) {
    return { ok: false, reason: "no lathe machines with finite rpm+power limits" };
  }
  const rpms = lathes.map((m) => m.max_rpm);
  const pows = lathes.map((m) => m.max_power_kw);
  return {
    ok: true,
    lathe_count: lathes.length,
    // FLOOR = most restrictive lathe -> the safety check consumes this (never under-protects).
    floor: { max_spindle_rpm: Math.min(...rpms), max_power_kW: Math.min(...pows) },
    // MAX = most capable lathe -> informational (a flag below max but above floor = machine-specific).
    max: { max_spindle_rpm: Math.max(...rpms), max_power_kW: Math.max(...pows) },
    source: "ShopConfigurationEngine JM lathe fleet (LTH-01..07)",
  };
}
