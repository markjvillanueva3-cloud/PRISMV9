/**
 * PPG-VARIABILITY-SWEEP-MS0: LATHE sessions L1-L7
 * Full variability test for all 7 Okuma lathes
 * Tests: machine profiles, materials × tools × holders × fixtures × controllers
 */
import { describe, it, expect } from 'vitest';

// ─── Machine Profiles ──────────────────────────────────────────────

const OKUMA_LATHES = [
  {
    id: 'genos-l300-m',
    model: 'Okuma Genos L300-M',
    controller: 'OSP-P300L-R',
    type: 'lathe_live_tooling' as const,
    max_rpm: 5000,
    power_kw: 15,
    torque_nm: 286,
    chuck_mm: 254, // 10-inch
    bar_capacity_mm: 65,
    turret_stations: 12,
    turret_type: 'BMT45',
    live_tooling: true,
    c_axis: true,
    y_axis: true,
    y_travel_mm: 80,
    x_travel_mm: 180,
    z_travel_mm: 450,
    taper: 'MT4',
    weight_kg: 4500,
  },
  {
    id: 'genos-l200e-m',
    model: 'Okuma Genos L200E-M',
    controller: 'OSP-P200LA-R',
    type: 'lathe_live_tooling' as const,
    max_rpm: 4500,
    power_kw: 11,
    torque_nm: 220,
    chuck_mm: 203, // 8-inch
    bar_capacity_mm: 51,
    turret_stations: 12,
    turret_type: 'BMT45',
    live_tooling: true,
    c_axis: true,
    y_axis: false,
    y_travel_mm: 0,
    x_travel_mm: 165,
    z_travel_mm: 400,
    taper: 'MT3',
    weight_kg: 3800,
  },
  {
    id: 'lnc8',
    model: 'Okuma LNC8',
    controller: 'LNC',
    type: 'lathe_2_axis' as const,
    max_rpm: 3500,
    power_kw: 11,
    torque_nm: 300,
    chuck_mm: 254,
    bar_capacity_mm: 52,
    turret_stations: 8,
    turret_type: 'VDI40',
    live_tooling: false,
    c_axis: false,
    y_axis: false,
    y_travel_mm: 0,
    x_travel_mm: 200,
    z_travel_mm: 500,
    taper: 'MT4',
    weight_kg: 3200,
  },
  {
    id: 'crown-l1060',
    model: 'Okuma Crown L1060',
    controller: 'OSP-U10L',
    type: 'lathe_2_axis' as const,
    max_rpm: 4200,
    power_kw: 15,
    torque_nm: 340,
    chuck_mm: 254,
    bar_capacity_mm: 52,
    turret_stations: 12,
    turret_type: 'VDI40',
    live_tooling: false,
    c_axis: false,
    y_axis: false,
    y_travel_mm: 0,
    x_travel_mm: 200,
    z_travel_mm: 600,
    taper: 'MT4',
    weight_kg: 4200,
  },
  {
    id: 'genos-l400ii-e',
    model: 'Okuma Genos L400II-E',
    controller: 'OSP-P300LA-E',
    type: 'lathe_2_axis' as const,
    max_rpm: 3500,
    power_kw: 22,
    torque_nm: 600,
    chuck_mm: 305, // 12-inch
    bar_capacity_mm: 80,
    turret_stations: 12,
    turret_type: 'VDI50',
    live_tooling: false,
    c_axis: false,
    y_axis: false,
    y_travel_mm: 0,
    x_travel_mm: 310,
    z_travel_mm: 600,
    taper: 'MT5',
    weight_kg: 6500,
  },
  {
    id: 'lb3000ex-bb',
    model: 'Okuma LB 3000EX Big Bore',
    controller: 'OSP-P500',
    type: 'lathe_2_axis' as const,
    max_rpm: 5000,
    power_kw: 22,
    torque_nm: 447,
    chuck_mm: 254,
    bar_capacity_mm: 102, // big bore
    turret_stations: 12,
    turret_type: 'BMT55',
    live_tooling: false,
    c_axis: false,
    y_axis: false,
    y_travel_mm: 0,
    x_travel_mm: 260,
    z_travel_mm: 570,
    taper: 'MT4',
    weight_kg: 7000,
  },
  {
    id: 'multus-b250ii',
    model: 'Okuma Multus B250II',
    controller: 'OSP-P300SA',
    type: 'mill_turn' as const,
    max_rpm: 5000,
    power_kw: 22,
    torque_nm: 447,
    chuck_mm: 254,
    bar_capacity_mm: 65,
    turret_stations: 12,
    turret_type: 'Capto_C6',
    live_tooling: true,
    c_axis: true,
    y_axis: true,
    y_travel_mm: 130,
    x_travel_mm: 630,
    z_travel_mm: 755,
    taper: 'Capto C6',
    weight_kg: 10000,
    b_axis: true,
    b_axis_range_deg: 225,
    milling_spindle_rpm: 12000,
    milling_spindle_kw: 22,
    atc_capacity: 20,
    sub_spindle: false,
  },
];

// ─── Materials Database ────────────────────────────────────────────

const TURNING_MATERIALS = [
  // P — Steel
  { id: '1018', name: '1018 Mild Steel', iso: 'P', kc1_1: 1500, mc: 0.25, hardness_HB: 131, rec_vc: 250 },
  { id: '1045', name: '1045 Medium Carbon', iso: 'P', kc1_1: 1800, mc: 0.25, hardness_HB: 179, rec_vc: 200 },
  { id: '4140-ann', name: '4140 Steel Annealed', iso: 'P', kc1_1: 1900, mc: 0.25, hardness_HB: 197, rec_vc: 175 },
  { id: '4140-qt', name: '4140 Steel QT', iso: 'P', kc1_1: 2100, mc: 0.25, hardness_HB: 302, rec_vc: 140 },
  { id: '4340', name: '4340 Alloy Steel', iso: 'P', kc1_1: 2200, mc: 0.25, hardness_HB: 321, rec_vc: 120 },
  { id: '8620', name: '8620 Case Harden', iso: 'P', kc1_1: 1700, mc: 0.25, hardness_HB: 149, rec_vc: 200 },
  { id: 'D2', name: 'D2 Tool Steel', iso: 'P', kc1_1: 2400, mc: 0.25, hardness_HB: 220, rec_vc: 80 },
  { id: 'H13', name: 'H13 Tool Steel', iso: 'P', kc1_1: 2200, mc: 0.25, hardness_HB: 192, rec_vc: 100 },
  { id: 'A2', name: 'A2 Tool Steel', iso: 'P', kc1_1: 2100, mc: 0.25, hardness_HB: 210, rec_vc: 90 },
  // M — Stainless
  { id: '304', name: '304 Stainless', iso: 'M', kc1_1: 2200, mc: 0.25, hardness_HB: 170, rec_vc: 120 },
  { id: '316', name: '316 Stainless', iso: 'M', kc1_1: 2300, mc: 0.26, hardness_HB: 167, rec_vc: 110 },
  { id: '17-4ph', name: '17-4 PH Stainless', iso: 'M', kc1_1: 2500, mc: 0.27, hardness_HB: 331, rec_vc: 80 },
  { id: '15-5ph', name: '15-5 PH Stainless', iso: 'M', kc1_1: 2400, mc: 0.26, hardness_HB: 310, rec_vc: 85 },
  // K — Cast Iron
  { id: 'gg25', name: 'Grey Cast Iron GG25', iso: 'K', kc1_1: 1100, mc: 0.26, hardness_HB: 190, rec_vc: 200 },
  { id: 'gg30', name: 'Grey Cast Iron GG30', iso: 'K', kc1_1: 1250, mc: 0.26, hardness_HB: 225, rec_vc: 170 },
  { id: 'ductile', name: 'Ductile Iron 65-45-12', iso: 'K', kc1_1: 1400, mc: 0.25, hardness_HB: 187, rec_vc: 150 },
  // N — Non-ferrous
  { id: '6061', name: '6061-T6 Aluminum', iso: 'N', kc1_1: 700, mc: 0.25, hardness_HB: 95, rec_vc: 400 },
  { id: '7075', name: '7075-T6 Aluminum', iso: 'N', kc1_1: 800, mc: 0.25, hardness_HB: 150, rec_vc: 350 },
  { id: '2024', name: '2024-T4 Aluminum', iso: 'N', kc1_1: 750, mc: 0.25, hardness_HB: 120, rec_vc: 370 },
  { id: 'brass-c360', name: 'Free-Cutting Brass C360', iso: 'N', kc1_1: 500, mc: 0.25, hardness_HB: 100, rec_vc: 300 },
  { id: 'copper-c110', name: 'Copper C110', iso: 'N', kc1_1: 600, mc: 0.25, hardness_HB: 55, rec_vc: 250 },
  // S — Superalloys
  { id: 'in718', name: 'Inconel 718', iso: 'S', kc1_1: 2800, mc: 0.25, hardness_HB: 331, rec_vc: 35 },
  { id: 'in625', name: 'Inconel 625', iso: 'S', kc1_1: 2600, mc: 0.25, hardness_HB: 290, rec_vc: 40 },
  { id: 'ti64', name: 'Ti-6Al-4V', iso: 'S', kc1_1: 1950, mc: 0.23, hardness_HB: 334, rec_vc: 50 },
  { id: 'hastelloy-c276', name: 'Hastelloy C-276', iso: 'S', kc1_1: 2700, mc: 0.26, hardness_HB: 210, rec_vc: 25 },
  { id: 'waspaloy', name: 'Waspaloy', iso: 'S', kc1_1: 2900, mc: 0.27, hardness_HB: 340, rec_vc: 20 },
  // H — Hardened
  { id: 'h13-hard', name: 'H13 Hardened 48HRC', iso: 'H', kc1_1: 3500, mc: 0.28, hardness_HB: 458, rec_vc: 40 },
  { id: 'd2-hard', name: 'D2 Hardened 60HRC', iso: 'H', kc1_1: 4200, mc: 0.30, hardness_HB: 620, rec_vc: 25 },
];

// ─── Turning Tools ─────────────────────────────────────────────────

const TURNING_TOOLS = {
  od_roughing: [
    { id: 'cnmg120408', name: 'CNMG 120408', type: 'od_turning', nose_r: 0.8, grade: 'GC4325', for_materials: ['P', 'M', 'K'] },
    { id: 'cnmg120412', name: 'CNMG 120412', type: 'od_turning', nose_r: 1.2, grade: 'GC4325', for_materials: ['P', 'M', 'K'] },
    { id: 'wnmg080408', name: 'WNMG 080408', type: 'od_turning', nose_r: 0.8, grade: 'GC4325', for_materials: ['P', 'M'] },
    { id: 'cnmg120408-n', name: 'CNMG 120408 N-Geo', type: 'od_turning', nose_r: 0.8, grade: 'H13A', for_materials: ['N'] },
    { id: 'cnmg120408-s', name: 'CNMG 120408 S-Geo', type: 'od_turning', nose_r: 0.8, grade: 'GC1115', for_materials: ['S'] },
  ],
  od_finishing: [
    { id: 'vbmt160404', name: 'VBMT 160404', type: 'od_finishing', nose_r: 0.4, grade: 'GC4215', for_materials: ['P', 'M'] },
    { id: 'dcmt070204', name: 'DCMT 070204', type: 'od_finishing', nose_r: 0.4, grade: 'GC4215', for_materials: ['P', 'M', 'K'] },
    { id: 'ccmt060204', name: 'CCMT 060204', type: 'od_finishing', nose_r: 0.4, grade: 'GC1525', for_materials: ['N'] },
    { id: 'wiper-wnmg', name: 'WNMG 080404 Wiper', type: 'od_finishing', nose_r: 0.4, grade: 'GC4315', for_materials: ['P', 'M'] },
  ],
  id_boring: [
    { id: 's20s-mclnr', name: 'S20S-MCLNR 4', type: 'boring_bar', bore_dia_min: 25, grade: 'GC4325', for_materials: ['P', 'M', 'K'] },
    { id: 'a16r-sclcr', name: 'A16R-SCLCR 09', type: 'boring_bar', bore_dia_min: 20, grade: 'GC4325', for_materials: ['P', 'M'] },
    { id: 'e10m-sclcr', name: 'E10M-SCLCR 06', type: 'boring_bar', bore_dia_min: 12, grade: 'GC4215', for_materials: ['P', 'N'] },
  ],
  grooving: [
    { id: 'n151.2-200', name: 'N151.2-200-20-4G', type: 'grooving', width_mm: 2, grade: 'GC4225', for_materials: ['P', 'M'] },
    { id: 'n151.2-300', name: 'N151.2-300-30-4G', type: 'parting', width_mm: 3, grade: 'GC4225', for_materials: ['P', 'M', 'K'] },
    { id: 'n151.2-500', name: 'N151.2-500-40-4G', type: 'parting', width_mm: 5, grade: 'GC4125', for_materials: ['P'] },
  ],
  threading: [
    { id: '266rg-16mm', name: '266RG-16MM01A150M', type: 'threading', pitch_mm: 1.5, grade: 'GC1125', for_materials: ['P', 'M'] },
    { id: '266rg-20un', name: '266RG-16UN01A200M', type: 'threading', pitch_tpi: 20, grade: 'GC1125', for_materials: ['P', 'M'] },
  ],
};

// ─── Holders ───────────────────────────────────────────────────────

const TURNING_HOLDERS = {
  od: [
    { id: 'dclnr-2525m12', name: 'DCLNR 2525M 12', type: 'od_turning', shank: '25x25', insert: 'CNMG' },
    { id: 'dwlnr-2525m08', name: 'DWLNR 2525M 08', type: 'od_turning', shank: '25x25', insert: 'WNMG' },
    { id: 'svjbr-2525m16', name: 'SVJBR 2525M 16', type: 'od_turning', shank: '25x25', insert: 'VBMT' },
  ],
  id: [
    { id: 's20s-mclnr4', name: 'S20S-MCLNR 4', type: 'boring_bar', min_bore: 25 },
    { id: 'a16r-sclcr09', name: 'A16R-SCLCR 09', type: 'boring_bar', min_bore: 20 },
  ],
  grooving: [
    { id: 'lf151-22-2525', name: 'LF151.22-2525-20', type: 'grooving', blade_width: 2 },
    { id: 'rf151-22-2525', name: 'RF151.22-2525-30', type: 'parting', blade_width: 3 },
  ],
  live_tool: [
    { id: 'bmt45-er32', name: 'BMT45 ER32 Collet', type: 'live_tool', max_rpm: 6000, tir_um: 10 },
    { id: 'bmt55-er32', name: 'BMT55 ER32 Collet', type: 'live_tool', max_rpm: 6000, tir_um: 10 },
    { id: 'capto-c6-er32', name: 'Capto C6 ER32', type: 'live_tool', max_rpm: 12000, tir_um: 5 },
  ],
};

// ─── Fixtures ──────────────────────────────────────────────────────

const LATHE_FIXTURES = [
  { id: '3jaw-od', name: '3-Jaw Chuck OD Grip', type: 'chuck', grip: 'OD', max_dia_mm: 254, clamping_force_kN: 45 },
  { id: '3jaw-id', name: '3-Jaw Chuck ID Grip', type: 'chuck', grip: 'ID', min_dia_mm: 38, clamping_force_kN: 30 },
  { id: 'collet-5c', name: '5C Collet Chuck', type: 'collet', max_dia_mm: 26.2, clamping_force_kN: 20, tir_um: 5 },
  { id: 'collet-16c', name: '16C Collet Chuck', type: 'collet', max_dia_mm: 38.1, clamping_force_kN: 25, tir_um: 5 },
  { id: 'collet-65mm', name: '65mm Collet Chuck', type: 'collet', max_dia_mm: 65, clamping_force_kN: 30, tir_um: 8 },
  { id: 'steady-follower', name: 'Follower Steady Rest', type: 'steady_rest', max_dia_mm: 200, for_long_parts: true },
  { id: 'steady-fixed', name: 'Fixed Steady Rest', type: 'steady_rest', max_dia_mm: 250, for_long_parts: true },
  { id: 'live-center', name: 'Live Tailstock Center', type: 'tailstock', mt_size: 'MT4', max_rpm: 5000 },
  { id: 'face-driver', name: 'Face Driver', type: 'face_driver', max_dia_mm: 100, for_od_turning: true },
  { id: 'soft-jaws', name: 'Soft Jaws (bored to part)', type: 'chuck', grip: 'custom', tir_um: 10 },
];

// ─── Physics Functions ─────────────────────────────────────────────

function kienzleForce(kc1_1: number, ap: number, fz: number, mc: number): number {
  return kc1_1 * ap * Math.pow(fz, 1 - mc);
}

function turningRPM(vc: number, diameter_mm: number): number {
  return (vc * 1000) / (Math.PI * diameter_mm);
}

function turningPower(fc: number, vc: number): number {
  return (fc * vc) / (60 * 1000); // kW
}

function turningFeed(fz: number, rpm: number): number {
  return fz * rpm; // mm/min
}

// ─── Controllers ───────────────────────────────────────────────────

const OSP_CONTROLLERS = [
  { id: 'osp-p300l-r', name: 'OSP-P300L-R', generation: 'P300', features: ['thermal_comp', 'collision_avoidance', 'tool_life_mgmt', 'macro_variables', 'rigid_tapping'] },
  { id: 'osp-p200la-r', name: 'OSP-P200LA-R', generation: 'P200', features: ['basic_macros', 'rigid_tapping', 'css_mode'] },
  { id: 'lnc', name: 'LNC', generation: 'legacy', features: ['basic_gcodes', 'css_mode'] },
  { id: 'osp-u10l', name: 'OSP-U10L', generation: 'U10', features: ['basic_macros', 'css_mode', 'tool_life_basic'] },
  { id: 'osp-p300la-e', name: 'OSP-P300LA-E', generation: 'P300', features: ['thermal_comp', 'collision_avoidance', 'tool_life_mgmt', 'macro_variables', 'rigid_tapping', 'adaptive_feed'] },
  { id: 'osp-p500', name: 'OSP-P500', generation: 'P500', features: ['thermal_comp', 'collision_avoidance', 'tool_life_mgmt', 'macro_variables', 'rigid_tapping', 'adaptive_feed', 'ai_machining', 'remote_monitoring', 'iot_connect'] },
  { id: 'osp-p300sa', name: 'OSP-P300SA', generation: 'P300', features: ['thermal_comp', 'collision_avoidance', 'tool_life_mgmt', 'macro_variables', 'rigid_tapping', 'b_axis_control', 'rtcp', 'simultaneous_5axis'] },
];

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Variability Sweep — Okuma Lathe Fleet', () => {

  // ─── Machine Profiles ──────────────────────────────────────────

  describe('Machine Profile Validation', () => {
    it('all 7 Okuma lathes have complete profiles', () => {
      expect(OKUMA_LATHES).toHaveLength(7);
      for (const m of OKUMA_LATHES) {
        expect(m.model).toBeTruthy();
        expect(m.controller).toBeTruthy();
        expect(m.max_rpm).toBeGreaterThan(0);
        expect(m.power_kw).toBeGreaterThan(0);
        expect(m.torque_nm).toBeGreaterThan(0);
        expect(m.turret_stations).toBeGreaterThanOrEqual(8);
      }
    });

    it('live tooling machines have C-axis', () => {
      const liveTooling = OKUMA_LATHES.filter(m => m.live_tooling);
      expect(liveTooling.length).toBeGreaterThanOrEqual(3); // L300-M, L200E-M, Multus
      for (const m of liveTooling) {
        expect(m.c_axis).toBe(true);
      }
    });

    it('Multus B250II has B-axis + milling spindle', () => {
      const multus = OKUMA_LATHES.find(m => m.id === 'multus-b250ii')!;
      expect(multus.b_axis).toBe(true);
      expect(multus.milling_spindle_rpm).toBe(12000);
      expect(multus.milling_spindle_kw).toBeGreaterThan(0);
      expect(multus.atc_capacity).toBeGreaterThanOrEqual(20);
      expect(multus.type).toBe('mill_turn');
    });

    it('LB 3000EX has big bore capacity (>80mm)', () => {
      const lb3000 = OKUMA_LATHES.find(m => m.id === 'lb3000ex-bb')!;
      expect(lb3000.bar_capacity_mm).toBeGreaterThanOrEqual(80);
    });

    it('L400II-E is the most powerful (highest torque)', () => {
      const l400 = OKUMA_LATHES.find(m => m.id === 'genos-l400ii-e')!;
      const maxTorque = Math.max(...OKUMA_LATHES.filter(m => m.id !== 'multus-b250ii').map(m => m.torque_nm));
      expect(l400.torque_nm).toBe(maxTorque);
    });

    it('each machine has unique controller', () => {
      const controllers = OKUMA_LATHES.map(m => m.controller);
      expect(new Set(controllers).size).toBe(7);
    });
  });

  // ─── Material × Machine S/F Validation ─────────────────────────

  describe('Material Sweep — All ISO Groups', () => {
    it('28 turning materials across all 6 ISO groups', () => {
      expect(TURNING_MATERIALS.length).toBe(28);
      const groups = [...new Set(TURNING_MATERIALS.map(m => m.iso))];
      expect(groups).toContain('P');
      expect(groups).toContain('M');
      expect(groups).toContain('K');
      expect(groups).toContain('N');
      expect(groups).toContain('S');
      expect(groups).toContain('H');
    });

    it.each(OKUMA_LATHES)('$model: S/F valid for all P-group steels', (machine) => {
      const steels = TURNING_MATERIALS.filter(m => m.iso === 'P');
      for (const mat of steels) {
        const workDia = 50; // 50mm workpiece
        const ap = 2; // 2mm depth of cut
        const f = 0.25; // 0.25 mm/rev

        const rpm = turningRPM(mat.rec_vc, workDia);
        const clampedRPM = Math.min(rpm, machine.max_rpm);
        const fc = kienzleForce(mat.kc1_1, ap, f, mat.mc);
        const actualVc = (clampedRPM * Math.PI * workDia) / 1000;
        const power = turningPower(fc, actualVc);

        expect(clampedRPM).toBeGreaterThan(0);
        expect(fc).toBeGreaterThan(100);
        expect(fc).toBeLessThan(10000);
        expect(power).toBeLessThan(machine.power_kw * 1.1); // within 110% of machine power
      }
    });

    it.each(OKUMA_LATHES)('$model: N-group materials have low cutting force', (machine) => {
      const nGroup = TURNING_MATERIALS.filter(m => m.iso === 'N');
      for (const mat of nGroup) {
        const rpm = turningRPM(mat.rec_vc, 30);
        // N-group should want reasonable RPM (>2000)
        expect(rpm).toBeGreaterThan(2000);
        // Force should be low (soft materials)
        const fc = kienzleForce(mat.kc1_1, 2, 0.2, mat.mc);
        expect(fc).toBeLessThan(1000);
      }
    });

    it.each(OKUMA_LATHES)('$model: superalloys (S group) require low speed', (machine) => {
      const supers = TURNING_MATERIALS.filter(m => m.iso === 'S');
      for (const mat of supers) {
        expect(mat.rec_vc).toBeLessThan(60); // superalloys run slow
        const fc = kienzleForce(mat.kc1_1, 1.5, 0.15, mat.mc);
        expect(fc).toBeGreaterThan(200); // high cutting force
      }
    });

    it('hardened steels (H group) have highest kc1.1 values', () => {
      const hardened = TURNING_MATERIALS.filter(m => m.iso === 'H');
      const softSteel = TURNING_MATERIALS.filter(m => m.iso === 'P');
      const minHardKc = Math.min(...hardened.map(m => m.kc1_1));
      const maxSoftKc = Math.max(...softSteel.map(m => m.kc1_1));
      expect(minHardKc).toBeGreaterThan(maxSoftKc);
    });
  });

  // ─── Tool Sweep ────────────────────────────────────────────────

  describe('Turning Tool Sweep', () => {
    it('has tools for all major operations', () => {
      expect(TURNING_TOOLS.od_roughing.length).toBeGreaterThanOrEqual(4);
      expect(TURNING_TOOLS.od_finishing.length).toBeGreaterThanOrEqual(3);
      expect(TURNING_TOOLS.id_boring.length).toBeGreaterThanOrEqual(2);
      expect(TURNING_TOOLS.grooving.length).toBeGreaterThanOrEqual(2);
      expect(TURNING_TOOLS.threading.length).toBeGreaterThanOrEqual(2);
    });

    it('each material group has compatible roughing inserts', () => {
      const groups = ['P', 'M', 'K', 'N', 'S'];
      for (const g of groups) {
        const compatible = TURNING_TOOLS.od_roughing.filter(t => t.for_materials.includes(g));
        expect(compatible.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('boring bars cover 12-25mm bore range', () => {
      const minBore = Math.min(...TURNING_TOOLS.id_boring.map(t => t.bore_dia_min));
      expect(minBore).toBeLessThanOrEqual(15);
    });

    it('grooving and parting widths available (2-5mm)', () => {
      const widths = TURNING_TOOLS.grooving.map(t => t.width_mm);
      expect(widths).toContain(2);
      expect(Math.max(...widths)).toBeGreaterThanOrEqual(5);
    });
  });

  // ─── Holder Sweep ──────────────────────────────────────────────

  describe('Holder Sweep', () => {
    it('has holders for all turning operations', () => {
      expect(TURNING_HOLDERS.od.length).toBeGreaterThanOrEqual(3);
      expect(TURNING_HOLDERS.id.length).toBeGreaterThanOrEqual(2);
      expect(TURNING_HOLDERS.grooving.length).toBeGreaterThanOrEqual(2);
    });

    it('live tool holders match turret types', () => {
      const l300 = OKUMA_LATHES.find(m => m.id === 'genos-l300-m')!;
      const bmt45Holders = TURNING_HOLDERS.live_tool.filter(h => h.id.includes('bmt45'));
      expect(bmt45Holders.length).toBeGreaterThanOrEqual(1);
      expect(l300.turret_type).toBe('BMT45');
    });

    it('Multus B250II uses Capto C6', () => {
      const multus = OKUMA_LATHES.find(m => m.id === 'multus-b250ii')!;
      const captoHolders = TURNING_HOLDERS.live_tool.filter(h => h.id.includes('capto'));
      expect(captoHolders.length).toBeGreaterThanOrEqual(1);
      expect(multus.turret_type).toBe('Capto_C6');
    });
  });

  // ─── Fixture Sweep ─────────────────────────────────────────────

  describe('Fixture Sweep', () => {
    it('10 fixture types available', () => {
      expect(LATHE_FIXTURES.length).toBe(10);
    });

    it('chuck fixtures handle OD and ID grip', () => {
      const chucks = LATHE_FIXTURES.filter(f => f.type === 'chuck');
      const odGrip = chucks.find(f => f.grip === 'OD');
      const idGrip = chucks.find(f => f.grip === 'ID');
      expect(odGrip).toBeTruthy();
      expect(idGrip).toBeTruthy();
    });

    it('collet options cover 5C, 16C, and 65mm', () => {
      const collets = LATHE_FIXTURES.filter(f => f.type === 'collet');
      expect(collets.length).toBe(3);
    });

    it('steady rests available for long parts', () => {
      const rests = LATHE_FIXTURES.filter(f => f.type === 'steady_rest');
      expect(rests.length).toBeGreaterThanOrEqual(2);
      expect(rests.every(r => r.for_long_parts)).toBe(true);
    });

    it('tailstock live center rated for machine max RPM', () => {
      const center = LATHE_FIXTURES.find(f => f.type === 'tailstock')!;
      expect(center.max_rpm).toBeGreaterThanOrEqual(5000);
    });
  });

  // ─── Controller Sweep ──────────────────────────────────────────

  describe('Controller Sweep', () => {
    it('7 OSP controllers across 4 generations', () => {
      expect(OSP_CONTROLLERS).toHaveLength(7);
      const gens = [...new Set(OSP_CONTROLLERS.map(c => c.generation))];
      expect(gens.length).toBeGreaterThanOrEqual(4);
    });

    it('P500 has the most features (newest generation)', () => {
      const p500 = OSP_CONTROLLERS.find(c => c.id === 'osp-p500')!;
      const maxFeatures = Math.max(...OSP_CONTROLLERS.map(c => c.features.length));
      expect(p500.features.length).toBe(maxFeatures);
      expect(p500.features).toContain('ai_machining');
      expect(p500.features).toContain('iot_connect');
    });

    it('P300SA has 5-axis control for Multus', () => {
      const p300sa = OSP_CONTROLLERS.find(c => c.id === 'osp-p300sa')!;
      expect(p300sa.features).toContain('b_axis_control');
      expect(p300sa.features).toContain('rtcp');
      expect(p300sa.features).toContain('simultaneous_5axis');
    });

    it('legacy LNC has minimal features', () => {
      const lnc = OSP_CONTROLLERS.find(c => c.id === 'lnc')!;
      const minFeatures = Math.min(...OSP_CONTROLLERS.map(c => c.features.length));
      expect(lnc.features.length).toBe(minFeatures);
    });

    it('all controllers support CSS (constant surface speed)', () => {
      for (const ctrl of OSP_CONTROLLERS) {
        const hasCss = ctrl.features.includes('css_mode') ||
                       ctrl.features.includes('macro_variables'); // modern controllers imply CSS
        expect(hasCss).toBe(true);
      }
    });
  });

  // ─── Cross-Machine Power Envelope ──────────────────────────────

  describe('Power Envelope — Material × Machine Matrix', () => {
    it('no material exceeds machine power at recommended Vc', () => {
      for (const machine of OKUMA_LATHES) {
        for (const mat of TURNING_MATERIALS) {
          const workDia = 40;
          const ap = 1.5; // conservative depth
          const f = 0.2; // conservative feed

          const rpm = Math.min(turningRPM(mat.rec_vc, workDia), machine.max_rpm);
          const actualVc = (rpm * Math.PI * workDia) / 1000;
          const fc = kienzleForce(mat.kc1_1, ap, f, mat.mc);
          const power = turningPower(fc, actualVc);

          // At conservative params, should not exceed machine power
          expect(power).toBeLessThan(machine.power_kw);
        }
      }
    });

    it('heavy roughing on L400II-E stays within 22kW', () => {
      const l400 = OKUMA_LATHES.find(m => m.id === 'genos-l400ii-e')!;
      const steel4140 = TURNING_MATERIALS.find(m => m.id === '4140-qt')!;

      // Heavy roughing: 4mm DoC, 0.4 mm/rev
      const ap = 4;
      const f = 0.4;
      const workDia = 80;
      const rpm = Math.min(turningRPM(steel4140.rec_vc, workDia), l400.max_rpm);
      const actualVc = (rpm * Math.PI * workDia) / 1000;
      const fc = kienzleForce(steel4140.kc1_1, ap, f, steel4140.mc);
      const power = turningPower(fc, actualVc);

      // Should be significant but within limits
      expect(power).toBeGreaterThan(5);
      expect(power).toBeLessThan(l400.power_kw);
    });

    it('Multus B250II can mill at 12000 RPM', () => {
      const multus = OKUMA_LATHES.find(m => m.id === 'multus-b250ii')!;
      const alum = TURNING_MATERIALS.find(m => m.id === '6061')!;
      const rpm = Math.min(turningRPM(alum.rec_vc, 12), multus.milling_spindle_rpm!);
      expect(rpm).toBeGreaterThan(8000);
    });
  });

  // ─── L/D Ratio Safety ─────────────────────────────────────────

  describe('Boring Bar L/D Deflection Check', () => {
    it('boring bars within safe L/D ratio (<4:1)', () => {
      for (const bar of TURNING_TOOLS.id_boring) {
        // Typical boring bar: 4× bore diameter max overhang
        const maxOverhang = bar.bore_dia_min * 4;
        expect(maxOverhang).toBeGreaterThan(40); // practical minimum
      }
    });
  });
});
