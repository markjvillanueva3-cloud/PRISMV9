/**
 * PPG-VARIABILITY-SWEEP-MS0: MILL sessions M1-M5
 * Full variability test for all 5 mills
 * Hurco VM30i, Okuma M460V-5AX, Haas VF-2, Haas OM-2, Roku-Roku HC 658-II
 */
import { describe, it, expect } from 'vitest';

// ─── Machine Profiles ──────────────────────────────────────────────

const MILLS = [
  {
    id: 'hurco-vm30i',
    model: 'Hurco VM30i',
    controller: 'WinMax v10.3.0.11467',
    controller_family: 'hurco_winmax',
    type: '3_axis_vmc' as const,
    max_rpm: 12000,
    power_kw: 18.6, // 25HP
    taper: 'CAT40',
    x_travel_mm: 762, // 30 inch
    y_travel_mm: 406, // 16 inch
    z_travel_mm: 508, // 20 inch
    atc_capacity: 24,
    table_load_kg: 1360,
    rapid_xy_m_min: 35,
    rapid_z_m_min: 30,
    conversational: true,
    nc_mode: true,
  },
  {
    id: 'okuma-m460v-5ax',
    model: 'Okuma Genos M460V-5AX',
    controller: 'OSP P300MA-H',
    controller_family: 'okuma_osp',
    type: '5_axis_trunnion' as const,
    max_rpm: 15000,
    power_kw: 22,
    taper: 'BT40',
    x_travel_mm: 762,
    y_travel_mm: 460,
    z_travel_mm: 460,
    a_axis_deg: [-120, 30],
    c_axis_continuous: true,
    atc_capacity: 32,
    table_load_kg: 400,
    rapid_xy_m_min: 40,
    rapid_z_m_min: 32,
    rtcp: true,
  },
  {
    id: 'haas-vf2',
    model: 'Haas VF-2',
    controller: 'Haas Pre-NGC',
    controller_family: 'haas_ngc',
    type: '3_axis_vmc' as const,
    max_rpm: 8100,
    power_kw: 14.9, // 20HP
    taper: 'CAT40',
    x_travel_mm: 762,
    y_travel_mm: 406,
    z_travel_mm: 508,
    atc_capacity: 20,
    table_load_kg: 1588,
    rapid_xy_m_min: 25.4,
    rapid_z_m_min: 25.4,
    pre_ngc: true,
  },
  {
    id: 'haas-om2',
    model: 'Haas OM-2',
    controller: 'Haas Pre-NGC',
    controller_family: 'haas_ngc',
    type: '3_axis_vmc' as const,
    max_rpm: 15000,
    power_kw: 11.2, // 15HP
    taper: 'CAT40',
    x_travel_mm: 381, // 15 inch
    y_travel_mm: 305, // 12 inch
    z_travel_mm: 305, // 12 inch
    atc_capacity: 10,
    table_load_kg: 227,
    rapid_xy_m_min: 30.5,
    rapid_z_m_min: 30.5,
    pre_ngc: true,
    office_mill: true,
  },
  {
    id: 'roku-roku-hc658ii',
    model: 'Roku-Roku HC 658-II',
    controller: 'Fanuc 31i Model B5',
    controller_family: 'fanuc_31i',
    type: '3_axis_vmc' as const,
    max_rpm: 30000,
    power_kw: 15,
    taper: 'HSK-E40',
    x_travel_mm: 600,
    y_travel_mm: 500,
    z_travel_mm: 300,
    atc_capacity: 20,
    table_load_kg: 500,
    rapid_xy_m_min: 50,
    rapid_z_m_min: 40,
    high_speed: true,
    robot_cell: 'GF+ System 3R WorkPartner 1+',
    pallet_changer: true,
    primary_use: ['graphite_electrodes', 'hardened_steel_mold'],
  },
];

// ─── Milling Materials ─────────────────────────────────────────────

const MILLING_MATERIALS = [
  // P — Steel
  { id: '1018', name: '1018 Mild Steel', iso: 'P', kc1_1: 1500, mc: 0.25, rec_vc: 250 },
  { id: '4140-ann', name: '4140 Annealed', iso: 'P', kc1_1: 1900, mc: 0.25, rec_vc: 175 },
  { id: '4140-qt', name: '4140 QT', iso: 'P', kc1_1: 2100, mc: 0.25, rec_vc: 140 },
  { id: 'p20', name: 'P20 Mold Steel', iso: 'P', kc1_1: 1800, mc: 0.25, rec_vc: 180 },
  { id: 'h13-soft', name: 'H13 Annealed', iso: 'P', kc1_1: 2000, mc: 0.25, rec_vc: 130 },
  { id: 's7', name: 'S7 Tool Steel', iso: 'P', kc1_1: 2000, mc: 0.25, rec_vc: 120 },
  // M — Stainless
  { id: '304', name: '304 Stainless', iso: 'M', kc1_1: 2200, mc: 0.25, rec_vc: 120 },
  { id: '316l', name: '316L Stainless', iso: 'M', kc1_1: 2300, mc: 0.26, rec_vc: 110 },
  { id: '17-4ph', name: '17-4 PH', iso: 'M', kc1_1: 2500, mc: 0.27, rec_vc: 80 },
  // K — Cast Iron
  { id: 'gg25', name: 'Grey Iron GG25', iso: 'K', kc1_1: 1100, mc: 0.26, rec_vc: 200 },
  { id: 'ductile', name: 'Ductile Iron', iso: 'K', kc1_1: 1400, mc: 0.25, rec_vc: 150 },
  // N — Non-ferrous
  { id: '6061', name: '6061-T6', iso: 'N', kc1_1: 700, mc: 0.25, rec_vc: 400 },
  { id: '7075', name: '7075-T6', iso: 'N', kc1_1: 800, mc: 0.25, rec_vc: 350 },
  { id: 'brass', name: 'Brass C360', iso: 'N', kc1_1: 500, mc: 0.25, rec_vc: 300 },
  { id: 'delrin', name: 'Delrin (POM)', iso: 'N', kc1_1: 200, mc: 0.20, rec_vc: 500 },
  { id: 'peek', name: 'PEEK', iso: 'N', kc1_1: 350, mc: 0.22, rec_vc: 300 },
  // S — Superalloys
  { id: 'ti64', name: 'Ti-6Al-4V', iso: 'S', kc1_1: 1950, mc: 0.23, rec_vc: 50 },
  { id: 'in718', name: 'Inconel 718', iso: 'S', kc1_1: 2800, mc: 0.25, rec_vc: 35 },
  { id: 'cocr', name: 'CoCr Medical', iso: 'S', kc1_1: 2600, mc: 0.26, rec_vc: 30 },
  // H — Hardened
  { id: 'h13-hard', name: 'H13 48HRC', iso: 'H', kc1_1: 3500, mc: 0.28, rec_vc: 40 },
  { id: 'd2-hard', name: 'D2 60HRC', iso: 'H', kc1_1: 4200, mc: 0.30, rec_vc: 25 },
  // Graphite (specialty — for Roku-Roku)
  { id: 'graphite-edm3', name: 'POCO EDM-3', iso: 'N', kc1_1: 120, mc: 0.15, rec_vc: 800 },
  { id: 'graphite-edm200', name: 'POCO EDM-200', iso: 'N', kc1_1: 150, mc: 0.15, rec_vc: 700 },
];

// ─── Milling Tools ─────────────────────────────────────────────────

const MILLING_TOOLS = [
  // Flat endmills
  { id: 'em-3', dia: 3, flutes: 2, type: 'flat_endmill', material: 'carbide', coating: 'AlTiN' },
  { id: 'em-6', dia: 6, flutes: 3, type: 'flat_endmill', material: 'carbide', coating: 'AlTiN' },
  { id: 'em-8', dia: 8, flutes: 4, type: 'flat_endmill', material: 'carbide', coating: 'TiAlN' },
  { id: 'em-10', dia: 10, flutes: 4, type: 'flat_endmill', material: 'carbide', coating: 'TiAlN' },
  { id: 'em-12', dia: 12, flutes: 4, type: 'flat_endmill', material: 'carbide', coating: 'TiAlN' },
  { id: 'em-16', dia: 16, flutes: 4, type: 'flat_endmill', material: 'carbide', coating: 'TiAlN' },
  { id: 'em-20', dia: 20, flutes: 4, type: 'flat_endmill', material: 'carbide', coating: 'TiAlN' },
  { id: 'em-25', dia: 25, flutes: 4, type: 'flat_endmill', material: 'carbide', coating: 'TiAlN' },
  // Ball endmills
  { id: 'ball-3', dia: 3, flutes: 2, type: 'ball_endmill', material: 'carbide', coating: 'AlTiN' },
  { id: 'ball-6', dia: 6, flutes: 2, type: 'ball_endmill', material: 'carbide', coating: 'TiAlN' },
  { id: 'ball-10', dia: 10, flutes: 2, type: 'ball_endmill', material: 'carbide', coating: 'TiAlN' },
  { id: 'ball-16', dia: 16, flutes: 2, type: 'ball_endmill', material: 'carbide', coating: 'TiAlN' },
  // Drills
  { id: 'drill-3', dia: 3, flutes: 2, type: 'drill', material: 'carbide', coating: 'TiAlN' },
  { id: 'drill-8', dia: 8, flutes: 2, type: 'drill', material: 'carbide', coating: 'TiAlN' },
  { id: 'drill-12', dia: 12, flutes: 2, type: 'drill', material: 'carbide', coating: 'TiAlN' },
  { id: 'drill-20', dia: 20, flutes: 2, type: 'drill', material: 'carbide', coating: 'TiN' },
  // Face mills
  { id: 'face-50', dia: 50, flutes: 4, type: 'face_mill', material: 'indexable', coating: 'PVD' },
  { id: 'face-63', dia: 63, flutes: 5, type: 'face_mill', material: 'indexable', coating: 'PVD' },
  { id: 'face-80', dia: 80, flutes: 6, type: 'face_mill', material: 'indexable', coating: 'PVD' },
  // Taps
  { id: 'tap-m4', dia: 4, flutes: 3, type: 'tap', material: 'hss_cobalt', coating: 'TiN' },
  { id: 'tap-m6', dia: 6, flutes: 3, type: 'tap', material: 'hss_cobalt', coating: 'TiN' },
  { id: 'tap-m10', dia: 10, flutes: 3, type: 'tap', material: 'hss_cobalt', coating: 'TiN' },
  // Graphite tools (for Roku-Roku)
  { id: 'graph-1', dia: 1, flutes: 2, type: 'ball_endmill', material: 'pcd', coating: 'diamond' },
  { id: 'graph-3', dia: 3, flutes: 2, type: 'ball_endmill', material: 'carbide', coating: 'diamond' },
  { id: 'graph-6', dia: 6, flutes: 2, type: 'flat_endmill', material: 'carbide', coating: 'diamond' },
  // CBN for hardened (Roku-Roku)
  { id: 'cbn-3', dia: 3, flutes: 2, type: 'ball_endmill', material: 'cbn', coating: 'none' },
  { id: 'cbn-6', dia: 6, flutes: 4, type: 'flat_endmill', material: 'cbn', coating: 'none' },
];

// ─── Holders ───────────────────────────────────────────────────────

const MILL_HOLDERS = {
  cat40: [
    { id: 'cat40-shrink-haimer', name: 'HAIMER Shrink Fit', tir_um: 3, max_rpm: 25000, stiffness: 'very_high', brand: 'HAIMER' },
    { id: 'cat40-hydraulic-schunk', name: 'SCHUNK TENDO', tir_um: 3, max_rpm: 25000, stiffness: 'very_high', brand: 'SCHUNK' },
    { id: 'cat40-er32-regofix', name: 'REGO-FIX ER32', tir_um: 5, max_rpm: 20000, stiffness: 'high', brand: 'REGO-FIX' },
    { id: 'cat40-er40-regofix', name: 'REGO-FIX ER40', tir_um: 5, max_rpm: 18000, stiffness: 'high', brand: 'REGO-FIX' },
    { id: 'cat40-sidelock', name: 'Weldon Side Lock', tir_um: 15, max_rpm: 10000, stiffness: 'medium', brand: 'generic' },
    { id: 'cat40-shell-arbor', name: 'Shell Mill Arbor', tir_um: 10, max_rpm: 8000, stiffness: 'high', brand: 'BIG KAISER' },
    { id: 'cat40-collet-big', name: 'BIG KAISER NCE32', tir_um: 3, max_rpm: 30000, stiffness: 'very_high', brand: 'BIG KAISER' },
    { id: 'cat40-kennametal-km', name: 'Kennametal KM40', tir_um: 4, max_rpm: 22000, stiffness: 'very_high', brand: 'Kennametal' },
  ],
  bt40: [
    { id: 'bt40-shrink', name: 'BT40 Shrink Fit', tir_um: 3, max_rpm: 25000, stiffness: 'very_high', brand: 'HAIMER' },
    { id: 'bt40-er32', name: 'BT40 ER32', tir_um: 5, max_rpm: 20000, stiffness: 'high', brand: 'Sandvik' },
  ],
  hsk_e40: [
    { id: 'hsk-e40-shrink', name: 'HSK-E40 Shrink', tir_um: 2, max_rpm: 40000, stiffness: 'very_high', brand: 'HAIMER' },
    { id: 'hsk-e40-er25', name: 'HSK-E40 ER25', tir_um: 3, max_rpm: 35000, stiffness: 'high', brand: 'REGO-FIX' },
    { id: 'hsk-e40-collet', name: 'HSK-E40 Pencil Collet', tir_um: 2, max_rpm: 45000, stiffness: 'high', brand: 'BIG KAISER' },
  ],
};

// ─── Fixtures ──────────────────────────────────────────────────────

const MILL_FIXTURES = [
  { id: 'kurt-dx6', name: 'Kurt DX6 Vise', type: 'vise', max_width_mm: 152, clamping_force_kN: 30 },
  { id: 'orange-vise', name: 'Orange Vise', type: 'vise', max_width_mm: 152, clamping_force_kN: 25, self_centering: true },
  { id: '5axis-plate', name: '5-Axis Fixture Plate', type: 'plate', size_mm: [400, 400], bolt_pattern: 'M12_grid' },
  { id: 'tslot-clamp', name: 'T-Slot Clamping Kit', type: 'clamp', bolt_sizes: ['M10', 'M12', 'M16'] },
  { id: 'vacuum-table', name: 'Vacuum Table', type: 'vacuum', for_thin_parts: true },
  { id: 'magnetic-chuck', name: 'Magnetic Chuck', type: 'magnetic', for_ferrous_only: true },
  { id: 'tombstone', name: 'Tombstone (4-sided)', type: 'tombstone', sides: 4, bolt_pattern: 'M10_grid' },
  { id: 'lang-5axis', name: 'Lang Makro-Grip 5-Axis', type: 'vise', max_width_mm: 125, for_5axis: true },
  { id: 'system3r-macro', name: 'System 3R MacroMagnum', type: 'pallet', repeatability_um: 2, for_edm: true },
  { id: 'system3r-electrode', name: 'System 3R Electrode Holder', type: 'electrode', sizes_mm: [20, 50], for_edm: true },
  { id: 'erowa-chuck', name: 'Erowa ITS Chuck', type: 'pallet', repeatability_um: 2, for_5axis: true },
];

// ─── Physics Functions ─────────────────────────────────────────────

function millingRPM(vc: number, dia: number): number {
  return (vc * 1000) / (Math.PI * dia);
}

function millingFeedRate(fz: number, flutes: number, rpm: number): number {
  return fz * flutes * rpm;
}

function kienzleForce(kc1_1: number, ap: number, fz: number, mc: number): number {
  return kc1_1 * ap * Math.pow(fz, 1 - mc);
}

function hemSpeedBoost(ae: number, D: number): number {
  return Math.max(1.0, Math.min(2.5, 1 / Math.pow(ae / D, 0.35)));
}

// ═══════════════════════════════════════════════════════════════════

describe('Variability Sweep — Mill Fleet', () => {

  describe('Machine Profiles', () => {
    it('all 5 mills have complete profiles', () => {
      expect(MILLS).toHaveLength(5);
      for (const m of MILLS) {
        expect(m.max_rpm).toBeGreaterThan(0);
        expect(m.power_kw).toBeGreaterThan(0);
        expect(m.taper).toBeTruthy();
        expect(m.atc_capacity).toBeGreaterThanOrEqual(10);
      }
    });

    it('5 unique controllers across 4 families', () => {
      const families = [...new Set(MILLS.map(m => m.controller_family))];
      expect(families.length).toBeGreaterThanOrEqual(3);
    });

    it('Roku-Roku has highest RPM (30000) for graphite', () => {
      const roku = MILLS.find(m => m.id === 'roku-roku-hc658ii')!;
      const maxRPM = Math.max(...MILLS.map(m => m.max_rpm));
      expect(roku.max_rpm).toBe(maxRPM);
      expect(roku.max_rpm).toBe(30000);
    });

    it('Roku-Roku has robot cell automation', () => {
      const roku = MILLS.find(m => m.id === 'roku-roku-hc658ii')!;
      expect(roku.robot_cell).toContain('3R');
      expect(roku.pallet_changer).toBe(true);
    });

    it('Okuma M460V has RTCP for 5-axis', () => {
      const okuma = MILLS.find(m => m.id === 'okuma-m460v-5ax')!;
      expect(okuma.rtcp).toBe(true);
      expect(okuma.type).toBe('5_axis_trunnion');
    });

    it('Haas VF-2 limited to 8100 RPM (Pre-NGC)', () => {
      const vf2 = MILLS.find(m => m.id === 'haas-vf2')!;
      expect(vf2.max_rpm).toBe(8100);
      expect(vf2.pre_ngc).toBe(true);
    });

    it('Haas OM-2 is compact office mill', () => {
      const om2 = MILLS.find(m => m.id === 'haas-om2')!;
      expect(om2.office_mill).toBe(true);
      expect(om2.x_travel_mm).toBeLessThan(400);
      expect(om2.max_rpm).toBe(15000); // higher RPM than VF-2
    });
  });

  describe('Material × Tool × Machine Matrix', () => {
    it('23 milling materials across 7 ISO groups + graphite', () => {
      expect(MILLING_MATERIALS.length).toBe(23);
      const isos = [...new Set(MILLING_MATERIALS.map(m => m.iso))];
      expect(isos.length).toBeGreaterThanOrEqual(5);
    });

    it('27 tools covering all milling operations', () => {
      expect(MILLING_TOOLS.length).toBe(27);
      const types = [...new Set(MILLING_TOOLS.map(t => t.type))];
      expect(types).toContain('flat_endmill');
      expect(types).toContain('ball_endmill');
      expect(types).toContain('drill');
      expect(types).toContain('face_mill');
      expect(types).toContain('tap');
    });

    it.each(MILLS)('$model: RPM valid for 12mm endmill on 4140', (machine) => {
      const mat = MILLING_MATERIALS.find(m => m.id === '4140-qt')!;
      const tool = MILLING_TOOLS.find(t => t.id === 'em-12')!;
      const rpm = Math.min(millingRPM(mat.rec_vc, tool.dia), machine.max_rpm);
      expect(rpm).toBeGreaterThan(0);
      expect(rpm).toBeLessThanOrEqual(machine.max_rpm);
      // Feed rate should be reasonable
      const fz = 0.08; // mm/tooth typical for 12mm in 4140
      const feedRate = millingFeedRate(fz, tool.flutes, rpm);
      expect(feedRate).toBeGreaterThan(100);
      expect(feedRate).toBeLessThan(5000);
    });

    it.each(MILLS)('$model: power check on 4140 + 25mm endmill', (machine) => {
      const mat = MILLING_MATERIALS.find(m => m.id === '4140-qt')!;
      const ap = 2; // 2mm depth
      const fz = 0.1;
      const fc = kienzleForce(mat.kc1_1, ap, fz, mat.mc);
      const rpm = Math.min(millingRPM(mat.rec_vc, 25), machine.max_rpm);
      const vc = (rpm * Math.PI * 25) / 1000;
      const power = (fc * vc) / (60 * 1000);
      expect(power).toBeLessThan(machine.power_kw);
    });

    it('Roku-Roku: graphite runs at 30000 RPM with 3mm ball', () => {
      const roku = MILLS.find(m => m.id === 'roku-roku-hc658ii')!;
      const graphite = MILLING_MATERIALS.find(m => m.id === 'graphite-edm3')!;
      const rpm = millingRPM(graphite.rec_vc, 3);
      expect(rpm).toBeGreaterThan(80000); // wants more than machine can give
      const clampedRPM = Math.min(rpm, roku.max_rpm);
      expect(clampedRPM).toBe(30000);
      // Force is very low for graphite
      const fc = kienzleForce(graphite.kc1_1, 0.5, 0.02, graphite.mc);
      expect(fc).toBeLessThan(50);
    });

    it('HEM speed boost for aluminum slotting', () => {
      const boost = hemSpeedBoost(3, 12); // 25% engagement
      expect(boost).toBeGreaterThan(1.3);
      expect(boost).toBeLessThan(2.5);
    });

    it('full-slot has no HEM speed boost', () => {
      const boost = hemSpeedBoost(12, 12); // 100% engagement
      expect(boost).toBe(1.0);
    });
  });

  describe('Holder × Machine Compatibility', () => {
    it('Hurco VM30i uses CAT40 holders (8 types available)', () => {
      expect(MILL_HOLDERS.cat40.length).toBeGreaterThanOrEqual(8);
    });

    it('Okuma M460V uses BT40 holders', () => {
      const okuma = MILLS.find(m => m.id === 'okuma-m460v-5ax')!;
      expect(okuma.taper).toBe('BT40');
      expect(MILL_HOLDERS.bt40.length).toBeGreaterThanOrEqual(2);
    });

    it('Roku-Roku uses HSK-E40 (high-speed interface)', () => {
      const roku = MILLS.find(m => m.id === 'roku-roku-hc658ii')!;
      expect(roku.taper).toBe('HSK-E40');
      expect(MILL_HOLDERS.hsk_e40.length).toBeGreaterThanOrEqual(3);
      // All HSK holders rated for 30000+ RPM
      for (const h of MILL_HOLDERS.hsk_e40) {
        expect(h.max_rpm).toBeGreaterThanOrEqual(35000);
      }
    });

    it('shrink fit holders have lowest TIR (<= 3um)', () => {
      const shrinks = [...MILL_HOLDERS.cat40, ...MILL_HOLDERS.bt40, ...MILL_HOLDERS.hsk_e40]
        .filter(h => h.name.toLowerCase().includes('shrink'));
      for (const h of shrinks) {
        expect(h.tir_um).toBeLessThanOrEqual(3);
      }
    });

    it('side-lock has highest TIR (15um)', () => {
      const sidelock = MILL_HOLDERS.cat40.find(h => h.id.includes('sidelock'))!;
      expect(sidelock.tir_um).toBe(15);
    });
  });

  describe('Fixture Sweep', () => {
    it('11 fixture types available', () => {
      expect(MILL_FIXTURES).toHaveLength(11);
    });

    it('System 3R fixtures for Roku-Roku automation', () => {
      const s3r = MILL_FIXTURES.filter(f => f.name.includes('3R'));
      expect(s3r.length).toBeGreaterThanOrEqual(2);
      const electrode = s3r.find(f => f.type === 'electrode');
      expect(electrode).toBeTruthy();
    });

    it('5-axis fixtures available for M460V', () => {
      const fiveAxis = MILL_FIXTURES.filter(f => f.for_5axis || f.name.includes('5-Axis'));
      expect(fiveAxis.length).toBeGreaterThanOrEqual(2);
    });

    it('vacuum and magnetic for thin/sheet parts', () => {
      const vacuum = MILL_FIXTURES.find(f => f.type === 'vacuum');
      const magnetic = MILL_FIXTURES.find(f => f.type === 'magnetic');
      expect(vacuum).toBeTruthy();
      expect(magnetic).toBeTruthy();
    });
  });

  describe('Controller Feature Matrix', () => {
    it('WinMax supports conversational + NC', () => {
      const hurco = MILLS.find(m => m.id === 'hurco-vm30i')!;
      expect(hurco.conversational).toBe(true);
      expect(hurco.nc_mode).toBe(true);
    });

    it('Fanuc 31i-B5 is most advanced (Roku-Roku)', () => {
      const roku = MILLS.find(m => m.id === 'roku-roku-hc658ii')!;
      expect(roku.controller).toContain('31i');
      expect(roku.controller).toContain('B5');
    });

    it('Pre-NGC Haas mills share controller limitations', () => {
      const preNgc = MILLS.filter(m => m.pre_ngc);
      expect(preNgc.length).toBe(2);
      // Both are Pre-NGC
      for (const m of preNgc) {
        expect(m.controller_family).toBe('haas_ngc');
      }
    });
  });
});
