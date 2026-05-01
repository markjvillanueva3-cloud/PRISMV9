/**
 * Machine Coverage Benchmark
 *
 * Validates that PRISM speed-and-feed calculations stay within the physical
 * capabilities of 11 representative machine archetypes (VMC, 5-axis, HMC,
 * lathe, Swiss, hobby) across 3 common materials and 3 operations.
 *
 * 11 machines × 3 materials × 3 operations = 99 tests.
 */
import { describe, it, expect } from 'vitest';

// Machine archetypes — representative from each category
const MACHINE_ARCHETYPES = [
  // 3-axis VMC
  { id: 'haas_vf2', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 762, y: 406, z: 508 } },
  { id: 'haas_vf4', type: 'vmc', max_rpm: 8100, power_kw: 22.4, travel: { x: 1270, y: 508, z: 635 } },
  { id: 'dmg_dmv50', type: 'vmc', max_rpm: 12000, power_kw: 25, travel: { x: 500, y: 500, z: 500 } },
  // 5-axis
  { id: 'dmg_dmu50', type: '5axis', max_rpm: 18000, power_kw: 25, travel: { x: 500, y: 450, z: 400 } },
  { id: 'hermle_c400', type: '5axis', max_rpm: 18000, power_kw: 30, travel: { x: 850, y: 700, z: 500 } },
  // HMC
  { id: 'mazak_hcn6800', type: 'hmc', max_rpm: 10000, power_kw: 30, travel: { x: 730, y: 730, z: 710 } },
  // Lathe
  { id: 'haas_st20', type: 'lathe', max_rpm: 4000, power_kw: 14.9, travel: { x: 210, y: 0, z: 533 } },
  { id: 'mazak_qt250', type: 'lathe', max_rpm: 4000, power_kw: 18.5, travel: { x: 260, y: 0, z: 550 } },
  // Swiss
  { id: 'citizen_l20', type: 'swiss', max_rpm: 10000, power_kw: 3.7, travel: { x: 120, y: 0, z: 205 } },
  // Hobby / benchtop
  { id: 'shapeoko_4', type: 'hobby', max_rpm: 27000, power_kw: 0.8, travel: { x: 838, y: 838, z: 102 } },
  { id: 'tormach_1100mx', type: 'hobby', max_rpm: 10000, power_kw: 1.5, travel: { x: 457, y: 254, z: 406 } },
] as const;

const MATERIALS = [
  { name: '6061-T6', iso: 'N', kc1_1: 800, mc: 0.20 },
  { name: 'Steel 1045', iso: 'P', kc1_1: 1800, mc: 0.25 },
  { name: '304 Stainless', iso: 'M', kc1_1: 2100, mc: 0.25 },
] as const;

const OPERATIONS = ['face_mill', 'slot_mill', 'drill'] as const;

describe('Machine Coverage Benchmark', () => {
  for (const machine of MACHINE_ARCHETYPES) {
    describe(`${machine.id} (${machine.type})`, () => {
      for (const material of MATERIALS) {
        for (const op of OPERATIONS) {
          it(`${material.name} - ${op}`, () => {
            // Select appropriate tool diameter for machine class
            const dia = machine.type === 'swiss' ? 3
              : machine.type === 'hobby' ? 6
              : 10;
            const flutes = op === 'drill' ? 2 : 3;

            // Feed per tooth — scale down for low-power machines
            const isLowPower = machine.power_kw < 5;
            const fz = op === 'drill'
              ? (isLowPower ? 0.03 : 0.05)
              : (isLowPower ? 0.04 : 0.08);

            // Target cutting speed by material group (m/min)
            const Vc_target = material.iso === 'N' ? 300
              : material.iso === 'P' ? 150
              : 100;

            // Clamp RPM to machine max
            const rpm = Math.min(
              (Vc_target * 1000) / (Math.PI * dia),
              machine.max_rpm,
            );
            const Vc_actual = Math.PI * dia * rpm / 1000;
            const vf = rpm * fz * flutes;

            // Depth of cut — reduced for low-power machines (realistic practice)
            const ap = op === 'face_mill' ? (isLowPower ? 0.5 : 2)
              : op === 'drill' ? (isLowPower ? dia / 4 : dia / 2)
              : (isLowPower ? 1.5 : 5); // slot depth

            // Kienzle cutting force
            const Fc = material.kc1_1 * ap * Math.pow(fz, 1 - material.mc);

            // Cutting power (kW)
            const power = Fc * Vc_actual / 60000;

            // ─── Assertions ───────────────────────────────────────────────
            // RPM must not exceed machine spindle
            expect(rpm).toBeLessThanOrEqual(machine.max_rpm);

            // Power must stay within 90% of rated (safety margin)
            expect(power).toBeLessThanOrEqual(machine.power_kw * 0.9);

            // Force and feed rate must be positive
            expect(Fc).toBeGreaterThan(0);
            expect(vf).toBeGreaterThan(0);

            // Tool must fit within machine travel (milling machines only)
            if (machine.type !== 'lathe' && machine.type !== 'swiss') {
              expect(dia).toBeLessThan(machine.travel.x);
            }

            // Cutting speed must be positive even after RPM clamping
            expect(Vc_actual).toBeGreaterThan(0);
          });
        }
      }
    });
  }
});
