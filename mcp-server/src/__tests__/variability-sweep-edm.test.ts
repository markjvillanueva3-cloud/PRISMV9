/**
 * PPG-VARIABILITY-SWEEP-MS0: EDM sessions S1-S2 + W1
 * Sinker EDMs: Mitsubishi EA12S (FP80S), EA12D (C30EA-2)
 * Wire EDM: Mitsubishi FA10S (W21FAS-2, W30FAS-2, W31MV-2) × (MD+ ProII, MV1200S)
 */
import { describe, it, expect } from 'vitest';

// ─── Sinker EDM Machines ───────────────────────────────────────────

const SINKER_EDMS = [
  {
    id: 'ea12s',
    model: 'Mitsubishi EA12S',
    controller: 'FP80S',
    heads: 1,
    x_travel_mm: 300,
    y_travel_mm: 250,
    z_travel_mm: 250,
    c_axis: false,
    max_workpiece_kg: 500,
    tank_size_mm: [700, 500, 300],
    electrode_changer_capacity: 16,
    generator: 'FP80S',
    max_current_A: 80,
    surface_finish_best_Ra_um: 0.2,
  },
  {
    id: 'ea12d',
    model: 'Mitsubishi EA12D',
    controller: 'C30EA-2',
    heads: 2,
    x_travel_mm: 300,
    y_travel_mm: 250,
    z_travel_mm: 250,
    c_axis: true,
    max_workpiece_kg: 1000,
    tank_size_mm: [900, 600, 350],
    electrode_changer_capacity: 24,
    generator: 'C30EA-2',
    max_current_A: 120,
    surface_finish_best_Ra_um: 0.15,
  },
];

// ─── Wire EDM Machine ─────────────────────────────────────────────

const WIRE_EDM = {
  id: 'fa10s',
  model: 'Mitsubishi FA10S',
  controllers: [
    {
      id: 'w21fas-2',
      name: 'W21FAS-2',
      generation: 'W21',
      features: ['auto_threading', 'submerge_cutting', 'taper_max_15deg'],
      technology_db_size: 'standard',
    },
    {
      id: 'w30fas-2',
      name: 'W30FAS-2',
      generation: 'W30',
      features: ['auto_threading', 'submerge_cutting', 'taper_max_25deg', 'v350_generator', 'fine_wire_0.05mm'],
      technology_db_size: 'expanded',
    },
    {
      id: 'w31mv-2',
      name: 'W31MV-2',
      generation: 'W31',
      features: ['auto_threading', 'submerge_cutting', 'taper_max_30deg', 'v350_generator', 'fine_wire_0.05mm', 'digital_matrix', 'fiber_optic_servo', 'core_removal'],
      technology_db_size: 'premium',
    },
  ],
  wires: [
    {
      id: 'md-pro-ii',
      name: 'MD+ ProII',
      type: 'brass',
      diameter_mm: 0.25,
      tensile_strength: 'standard',
      cost_per_kg: 'standard',
      best_for: ['general_purpose', 'thick_stock', 'roughing'],
    },
    {
      id: 'mv1200s',
      name: 'MV1200S',
      type: 'zinc_coated',
      diameter_mm: 0.25,
      tensile_strength: 'high',
      cost_per_kg: 'premium',
      best_for: ['fine_finish', 'high_accuracy', 'thin_stock', 'auto_threading'],
    },
  ],
  x_travel_mm: 400,
  y_travel_mm: 300,
  z_travel_mm: 220,
  u_travel_mm: 80,
  v_travel_mm: 80,
  max_workpiece_mm: [810, 600, 215],
  max_workpiece_kg: 500,
  max_taper_deg: 30,
  wire_diameter_range_mm: [0.05, 0.30],
};

// ─── EDM Materials ─────────────────────────────────────────────────

const EDM_MATERIALS = [
  // Tool steels
  { id: 'd2', name: 'D2 Tool Steel', conductivity: 'medium', hardness_HRC: 60, edm_machinability: 'good' },
  { id: 'h13', name: 'H13 Tool Steel', conductivity: 'medium', hardness_HRC: 48, edm_machinability: 'good' },
  { id: 'a2', name: 'A2 Tool Steel', conductivity: 'medium', hardness_HRC: 58, edm_machinability: 'good' },
  { id: 's7', name: 'S7 Tool Steel', conductivity: 'medium', hardness_HRC: 56, edm_machinability: 'good' },
  // Carbide
  { id: 'carbide', name: 'Tungsten Carbide', conductivity: 'low', hardness_HRC: 90, edm_machinability: 'difficult' },
  // Stainless
  { id: '304-ss', name: '304 Stainless', conductivity: 'low', hardness_HRC: 20, edm_machinability: 'moderate' },
  { id: '316-ss', name: '316 Stainless', conductivity: 'low', hardness_HRC: 20, edm_machinability: 'moderate' },
  // Aluminum (WEDM)
  { id: '6061-al', name: '6061-T6 Aluminum', conductivity: 'high', hardness_HRC: 0, edm_machinability: 'moderate' },
  // Titanium (WEDM)
  { id: 'ti64', name: 'Ti-6Al-4V', conductivity: 'low', hardness_HRC: 36, edm_machinability: 'moderate' },
  // Copper-tungsten (sinker electrode)
  { id: 'cu-w', name: 'Copper-Tungsten', conductivity: 'high', hardness_HRC: 0, edm_machinability: 'electrode_material' },
  // Graphite (sinker electrode)
  { id: 'graphite-edm3', name: 'POCO EDM-3', conductivity: 'medium', hardness_HRC: 0, edm_machinability: 'electrode_material' },
  { id: 'graphite-edm200', name: 'POCO EDM-200', conductivity: 'medium', hardness_HRC: 0, edm_machinability: 'electrode_material' },
];

// ─── Wire EDM Thickness Matrix ─────────────────────────────────────

const WEDM_THICKNESS_MM = [12.7, 25.4, 50.8, 76.2, 101.6, 152.4]; // 0.5", 1", 2", 3", 4", 6"

// ─── Sinker EDM Electrode Types ────────────────────────────────────

const ELECTRODE_TYPES = [
  { id: 'round-copper', name: 'Round Copper', material: 'copper', shape: 'round', wear_ratio: 'low' },
  { id: 'rect-copper', name: 'Rectangular Copper', material: 'copper', shape: 'rectangular', wear_ratio: 'low' },
  { id: 'round-graphite', name: 'Round Graphite EDM-3', material: 'graphite', shape: 'round', wear_ratio: 'medium' },
  { id: 'complex-graphite', name: 'Complex Form Graphite', material: 'graphite', shape: 'complex', wear_ratio: 'high' },
  { id: 'thin-rib', name: 'Thin Rib Electrode', material: 'graphite', shape: 'thin_rib', wear_ratio: 'high' },
  { id: 'cu-w-electrode', name: 'Copper-Tungsten Electrode', material: 'copper_tungsten', shape: 'precision', wear_ratio: 'very_low' },
];

// ═══════════════════════════════════════════════════════════════════

describe('Variability Sweep — Sinker EDMs', () => {

  describe('Machine Profiles', () => {
    it('2 sinker EDMs with distinct controllers', () => {
      expect(SINKER_EDMS).toHaveLength(2);
      expect(SINKER_EDMS[0].controller).not.toBe(SINKER_EDMS[1].controller);
    });

    it('EA12D is dual-head (2 heads)', () => {
      const ea12d = SINKER_EDMS.find(m => m.id === 'ea12d')!;
      expect(ea12d.heads).toBe(2);
      expect(ea12d.c_axis).toBe(true);
    });

    it('EA12D has more electrode changer capacity', () => {
      const ea12s = SINKER_EDMS.find(m => m.id === 'ea12s')!;
      const ea12d = SINKER_EDMS.find(m => m.id === 'ea12d')!;
      expect(ea12d.electrode_changer_capacity).toBeGreaterThan(ea12s.electrode_changer_capacity);
    });

    it('EA12D has higher current capacity', () => {
      const ea12s = SINKER_EDMS.find(m => m.id === 'ea12s')!;
      const ea12d = SINKER_EDMS.find(m => m.id === 'ea12d')!;
      expect(ea12d.max_current_A).toBeGreaterThan(ea12s.max_current_A);
    });

    it('both achieve Ra < 0.3um finish', () => {
      for (const m of SINKER_EDMS) {
        expect(m.surface_finish_best_Ra_um).toBeLessThan(0.3);
      }
    });
  });

  describe('Electrode × Material Combinations', () => {
    it('6 electrode types available', () => {
      expect(ELECTRODE_TYPES).toHaveLength(6);
    });

    it('copper-tungsten has lowest wear ratio', () => {
      const cuW = ELECTRODE_TYPES.find(e => e.id === 'cu-w-electrode')!;
      expect(cuW.wear_ratio).toBe('very_low');
    });

    it('graphite electrodes cover round + complex + thin rib', () => {
      const graphites = ELECTRODE_TYPES.filter(e => e.material === 'graphite');
      expect(graphites.length).toBeGreaterThanOrEqual(3);
      const shapes = graphites.map(g => g.shape);
      expect(shapes).toContain('round');
      expect(shapes).toContain('complex');
      expect(shapes).toContain('thin_rib');
    });

    it('all electrode materials are conductive', () => {
      const electrodeMaterials = ELECTRODE_TYPES.map(e => e.material);
      const validMats = ['copper', 'graphite', 'copper_tungsten'];
      for (const mat of electrodeMaterials) {
        expect(validMats).toContain(mat);
      }
    });

    it('workpiece materials all have known conductivity', () => {
      const workpieces = EDM_MATERIALS.filter(m => m.edm_machinability !== 'electrode_material');
      for (const wp of workpieces) {
        expect(['high', 'medium', 'low']).toContain(wp.conductivity);
      }
    });
  });
});

describe('Variability Sweep — Wire EDM (FA10S)', () => {

  describe('Machine + Controller Matrix', () => {
    it('3 controllers with increasing capability', () => {
      expect(WIRE_EDM.controllers).toHaveLength(3);
      const featureCounts = WIRE_EDM.controllers.map(c => c.features.length);
      // Each newer controller has more features
      expect(featureCounts[1]).toBeGreaterThan(featureCounts[0]);
      expect(featureCounts[2]).toBeGreaterThan(featureCounts[1]);
    });

    it('W31MV-2 has digital matrix + fiber optic servo', () => {
      const w31 = WIRE_EDM.controllers.find(c => c.id === 'w31mv-2')!;
      expect(w31.features).toContain('digital_matrix');
      expect(w31.features).toContain('fiber_optic_servo');
      expect(w31.features).toContain('core_removal');
    });

    it('all controllers support auto-threading', () => {
      for (const ctrl of WIRE_EDM.controllers) {
        expect(ctrl.features).toContain('auto_threading');
      }
    });

    it('taper capability increases with controller generation', () => {
      const w21Taper = WIRE_EDM.controllers[0].features.find(f => f.includes('taper'))!;
      const w31Taper = WIRE_EDM.controllers[2].features.find(f => f.includes('taper'))!;
      const w21Deg = parseInt(w21Taper.match(/\d+/)![0]);
      const w31Deg = parseInt(w31Taper.match(/\d+/)![0]);
      expect(w31Deg).toBeGreaterThan(w21Deg);
    });
  });

  describe('Wire Type Comparison', () => {
    it('2 wire types: brass (MD+) and zinc-coated (MV1200S)', () => {
      expect(WIRE_EDM.wires).toHaveLength(2);
      expect(WIRE_EDM.wires[0].type).toBe('brass');
      expect(WIRE_EDM.wires[1].type).toBe('zinc_coated');
    });

    it('MV1200S is premium wire for fine finish', () => {
      const mv = WIRE_EDM.wires.find(w => w.id === 'mv1200s')!;
      expect(mv.cost_per_kg).toBe('premium');
      expect(mv.best_for).toContain('fine_finish');
      expect(mv.best_for).toContain('high_accuracy');
    });

    it('MD+ ProII is general-purpose for thick stock', () => {
      const md = WIRE_EDM.wires.find(w => w.id === 'md-pro-ii')!;
      expect(md.best_for).toContain('general_purpose');
      expect(md.best_for).toContain('thick_stock');
    });

    it('both wires are 0.25mm diameter standard', () => {
      for (const w of WIRE_EDM.wires) {
        expect(w.diameter_mm).toBe(0.25);
      }
    });
  });

  describe('Material × Thickness Matrix', () => {
    it('9 workpiece materials for WEDM', () => {
      const workpieces = EDM_MATERIALS.filter(m => m.edm_machinability !== 'electrode_material');
      expect(workpieces.length).toBe(9);
    });

    it('6 thickness levels tested (12.7mm to 152.4mm)', () => {
      expect(WEDM_THICKNESS_MM).toHaveLength(6);
      expect(WEDM_THICKNESS_MM[0]).toBe(12.7); // 0.5 inch
      expect(WEDM_THICKNESS_MM[5]).toBe(152.4); // 6 inch
    });

    it('full material × thickness matrix = 54 combinations', () => {
      const workpieces = EDM_MATERIALS.filter(m => m.edm_machinability !== 'electrode_material');
      const combos = workpieces.length * WEDM_THICKNESS_MM.length;
      expect(combos).toBe(54);
    });

    it('D2 at all thicknesses has good machinability', () => {
      const d2 = EDM_MATERIALS.find(m => m.id === 'd2')!;
      expect(d2.edm_machinability).toBe('good');
      // D2 is the most common WEDM material
      for (const thickness of WEDM_THICKNESS_MM) {
        expect(thickness).toBeLessThanOrEqual(152.4); // FA10S can cut up to 6"
      }
    });

    it('carbide is most difficult EDM material', () => {
      const carbide = EDM_MATERIALS.find(m => m.id === 'carbide')!;
      expect(carbide.edm_machinability).toBe('difficult');
      expect(carbide.conductivity).toBe('low');
    });

    it('aluminum has highest conductivity', () => {
      const al = EDM_MATERIALS.find(m => m.id === '6061-al')!;
      expect(al.conductivity).toBe('high');
    });
  });

  describe('Taper + 4-Axis Capability', () => {
    it('FA10S has UV axes for taper (80mm travel each)', () => {
      expect(WIRE_EDM.u_travel_mm).toBe(80);
      expect(WIRE_EDM.v_travel_mm).toBe(80);
    });

    it('max taper angle is 30 degrees', () => {
      expect(WIRE_EDM.max_taper_deg).toBe(30);
    });

    it('wire diameter range supports fine wire (0.05mm)', () => {
      expect(WIRE_EDM.wire_diameter_range_mm[0]).toBe(0.05);
      expect(WIRE_EDM.wire_diameter_range_mm[1]).toBe(0.30);
    });
  });

  describe('Controller × Wire × Material Full Combination Count', () => {
    it('3 controllers × 2 wires × 9 materials × 6 thicknesses = 324 combos', () => {
      const workpieces = EDM_MATERIALS.filter(m => m.edm_machinability !== 'electrode_material');
      const combos = WIRE_EDM.controllers.length * WIRE_EDM.wires.length * workpieces.length * WEDM_THICKNESS_MM.length;
      expect(combos).toBe(324);
    });

    it('sinker: 2 machines × 6 electrodes × 5 workpiece materials = 60 combos', () => {
      const sinkerWorkpieces = EDM_MATERIALS.filter(m =>
        m.edm_machinability !== 'electrode_material' && m.edm_machinability !== 'moderate'
      );
      // At minimum D2, H13, A2, S7, carbide = 5 good candidates
      const combos = SINKER_EDMS.length * ELECTRODE_TYPES.length * sinkerWorkpieces.length;
      expect(combos).toBe(60);
    });
  });
});
