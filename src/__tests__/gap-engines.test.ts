/**
 * gap-engines.test.ts — Tests for DiamondTurningEngine & LaserInterferometerCompensationEngine
 * 35+ tests covering SPDT surface finish, micro-cutting forces, tool wear, machine config,
 * Edlen wavelength compensation, compensation tables, measurement planning, and deadpath error.
 */
import { describe, it, expect } from 'vitest';
import { DiamondTurningEngine } from '../engines/DiamondTurningEngine.js';
import { LaserInterferometerCompensationEngine } from '../engines/LaserInterferometerCompensationEngine.js';

const dt = new DiamondTurningEngine();
const lic = new LaserInterferometerCompensationEngine();

// ═══════════════════════════════════════════════════════════════════
// Diamond Turning Engine
// ═══════════════════════════════════════════════════════════════════

describe('DiamondTurningEngine', () => {
  // ── Surface Finish ──────────────────────────────────────────────

  describe('predictSurfaceFinish', () => {
    it('should compute Ra at nanometer scale for copper', () => {
      const r = dt.predictSurfaceFinish({
        material: 'copper',
        tool_nose_radius_mm: 1.0,
        feed_per_rev_um: 5,
        depth_of_cut_um: 2,
        spindle_rpm: 3000
      });
      expect(r.value.Ra_nm).toBeGreaterThan(0);
      expect(r.value.Ra_nm).toBeLessThan(100); // sub-100nm for good params
      expect(r.value.Rz_nm).toBeGreaterThan(r.value.Ra_nm);
      expect(r.value.pv_nm).toBeGreaterThan(r.value.Rz_nm);
    });

    it('should follow Ra_ideal = f²/(32R) as dominant term for large feed', () => {
      const r = dt.predictSurfaceFinish({
        material: 'aluminum_6061',
        tool_nose_radius_mm: 0.5,
        feed_per_rev_um: 20, // large feed → kinematic dominates
        depth_of_cut_um: 3,
        spindle_rpm: 2000
      });
      expect(r.value.dominant_contributor).toBe('kinematic (feed marks)');
    });

    it('should detect spindle error as dominant when feed is very small', () => {
      const r = dt.predictSurfaceFinish({
        material: 'copper',
        tool_nose_radius_mm: 2.0,
        feed_per_rev_um: 0.5, // very small feed
        depth_of_cut_um: 1,
        spindle_rpm: 2000,
        spindle_error_motion_nm: 100 // poor spindle
      });
      expect(r.value.dominant_contributor).toBe('spindle error motion');
    });

    it('should warn about ductile-brittle transition for silicon', () => {
      const r = dt.predictSurfaceFinish({
        material: 'silicon',
        tool_nose_radius_mm: 1.0,
        feed_per_rev_um: 5,
        depth_of_cut_um: 2, // exceeds 0.3µm DBT for silicon
        spindle_rpm: 3000
      });
      expect(r.value.recommendations.some(
        s => s.includes('ductile-brittle')
      )).toBe(true);
    });

    it('should produce lower Ra with larger nose radius', () => {
      const r1 = dt.predictSurfaceFinish({
        material: 'copper', tool_nose_radius_mm: 0.5,
        feed_per_rev_um: 5, depth_of_cut_um: 2, spindle_rpm: 3000
      });
      const r2 = dt.predictSurfaceFinish({
        material: 'copper', tool_nose_radius_mm: 2.0,
        feed_per_rev_um: 5, depth_of_cut_um: 2, spindle_rpm: 3000
      });
      expect(r2.value.Ra_nm).toBeLessThan(r1.value.Ra_nm);
    });

    it('should produce lower Ra with smaller feed', () => {
      const r1 = dt.predictSurfaceFinish({
        material: 'copper', tool_nose_radius_mm: 1.0,
        feed_per_rev_um: 10, depth_of_cut_um: 2, spindle_rpm: 3000
      });
      const r2 = dt.predictSurfaceFinish({
        material: 'copper', tool_nose_radius_mm: 1.0,
        feed_per_rev_um: 2, depth_of_cut_um: 2, spindle_rpm: 3000
      });
      expect(r2.value.Ra_nm).toBeLessThan(r1.value.Ra_nm);
    });

    it('should include spring-back recommendation for PMMA', () => {
      const r = dt.predictSurfaceFinish({
        material: 'pmma',
        tool_nose_radius_mm: 1.0,
        feed_per_rev_um: 3,
        depth_of_cut_um: 10, // high DOC → large spring-back
        spindle_rpm: 2000
      });
      expect(r.value.recommendations.some(
        s => s.includes('pring-back')
      )).toBe(true);
    });

    it('should return achievable=true for reasonable parameters', () => {
      const r = dt.predictSurfaceFinish({
        material: 'electroless_nickel',
        tool_nose_radius_mm: 1.0,
        feed_per_rev_um: 5,
        depth_of_cut_um: 3,
        spindle_rpm: 2000
      });
      expect(r.value.achievable).toBe(true);
    });
  });

  // ── Cutting Forces ──────────────────────────────────────────────

  describe('calculateCuttingForces', () => {
    it('should compute forces in mN range for micro-cutting', () => {
      const r = dt.calculateCuttingForces({
        material: 'copper',
        depth_of_cut_um: 5,
        feed_um: 5
      });
      expect(r.value.Fc_mN).toBeGreaterThan(0);
      expect(r.value.Fc_mN).toBeLessThan(1000); // sub-Newton
      expect(r.value.Ft_mN).toBeGreaterThan(0);
    });

    it('should show size effect — higher specific energy at smaller chip thickness', () => {
      const r1 = dt.calculateCuttingForces({
        material: 'aluminum_6061', depth_of_cut_um: 5, feed_um: 10
      });
      const r2 = dt.calculateCuttingForces({
        material: 'aluminum_6061', depth_of_cut_um: 5, feed_um: 1
      });
      // Specific energy should be higher at smaller feed (size effect)
      expect(r2.value.specific_energy_J_per_mm3)
        .toBeGreaterThan(r1.value.specific_energy_J_per_mm3);
    });

    it('should detect ductile regime for germanium at small DOC', () => {
      const r = dt.calculateCuttingForces({
        material: 'germanium', depth_of_cut_um: 0.3, feed_um: 1
      });
      expect(r.value.ductile_regime).toBe(true);
    });

    it('should detect brittle regime for germanium at large DOC', () => {
      const r = dt.calculateCuttingForces({
        material: 'germanium', depth_of_cut_um: 2, feed_um: 5
      });
      expect(r.value.ductile_regime).toBe(false);
    });

    it('should return minimum chip thickness', () => {
      const r = dt.calculateCuttingForces({
        material: 'copper', depth_of_cut_um: 5, feed_um: 5,
        edge_radius_nm: 100
      });
      expect(r.value.min_chip_thickness_um).toBeGreaterThan(0);
      // min chip ≈ 0.25 × 0.1µm = 0.025µm for copper with 100nm edge
      expect(r.value.min_chip_thickness_um).toBeLessThan(0.1);
    });

    it('should reduce forces with positive rake angle', () => {
      const r0 = dt.calculateCuttingForces({
        material: 'copper', depth_of_cut_um: 5, feed_um: 5,
        rake_angle_deg: 0
      });
      const r10 = dt.calculateCuttingForces({
        material: 'copper', depth_of_cut_um: 5, feed_um: 5,
        rake_angle_deg: 10
      });
      expect(r10.value.Fc_mN).toBeLessThan(r0.value.Fc_mN);
    });
  });

  // ── Tool Wear ───────────────────────────────────────────────────

  describe('assessToolWear', () => {
    it('should flag graphitization risk on nickel', () => {
      const r = dt.assessToolWear({
        workpiece_material: 'nickel',
        cutting_distance_km: 1,
        depth_um: 5, feed_um: 5,
        coolant: 'oil_mist'
      });
      expect(r.value.graphitization_risk).toBe(true);
    });

    it('should not flag graphitization on copper', () => {
      const r = dt.assessToolWear({
        workpiece_material: 'copper',
        cutting_distance_km: 10,
        depth_um: 5, feed_um: 5,
        coolant: 'oil_mist'
      });
      expect(r.value.graphitization_risk).toBe(false);
    });

    it('should show higher wear on nickel than copper', () => {
      const rNi = dt.assessToolWear({
        workpiece_material: 'nickel',
        cutting_distance_km: 5, depth_um: 5, feed_um: 5,
        coolant: 'oil_mist'
      });
      const rCu = dt.assessToolWear({
        workpiece_material: 'copper',
        cutting_distance_km: 5, depth_um: 5, feed_um: 5,
        coolant: 'oil_mist'
      });
      expect(rNi.value.edge_recession_um)
        .toBeGreaterThan(rCu.value.edge_recession_um);
    });

    it('should show nitrogen coolant reducing wear vs dry', () => {
      const rDry = dt.assessToolWear({
        workpiece_material: 'aluminum_6061',
        cutting_distance_km: 10, depth_um: 5, feed_um: 5,
        coolant: 'dry'
      });
      const rN2 = dt.assessToolWear({
        workpiece_material: 'aluminum_6061',
        cutting_distance_km: 10, depth_um: 5, feed_um: 5,
        coolant: 'nitrogen'
      });
      expect(rN2.value.edge_recession_um)
        .toBeLessThan(rDry.value.edge_recession_um);
    });

    it('should report remaining life > 0 for short distances', () => {
      const r = dt.assessToolWear({
        workpiece_material: 'copper',
        cutting_distance_km: 0.1, depth_um: 2, feed_um: 2,
        coolant: 'oil_mist'
      });
      expect(r.value.remaining_life_km).toBeGreaterThan(0);
    });
  });

  // ── Machine Config ──────────────────────────────────────────────

  describe('selectMachineConfig', () => {
    it('should select air bearing for sub-20nm target', () => {
      const r = dt.selectMachineConfig({
        target_Ra_nm: 10,
        workpiece_diameter_mm: 50,
        material: 'copper',
        form: 'spherical'
      });
      expect(r.value.spindle_type).toBe('air_bearing');
      expect(r.value.isolation).toBe(true);
    });

    it('should select aerostatic for sub-5nm target', () => {
      const r = dt.selectMachineConfig({
        target_Ra_nm: 3,
        workpiece_diameter_mm: 25,
        material: 'germanium',
        form: 'aspheric'
      });
      expect(r.value.spindle_type).toBe('aerostatic');
      expect(r.value.feedback).toBe('laser_interferometer');
      expect(r.value.temperature_control_C).toBeLessThanOrEqual(0.01);
    });

    it('should require laser interferometer for freeform', () => {
      const r = dt.selectMachineConfig({
        target_Ra_nm: 30,
        workpiece_diameter_mm: 100,
        material: 'aluminum_6061',
        form: 'freeform'
      });
      expect(r.value.feedback).toBe('laser_interferometer');
    });

    it('should select hydrostatic for large diameter parts', () => {
      const r = dt.selectMachineConfig({
        target_Ra_nm: 15,
        workpiece_diameter_mm: 500,
        material: 'aluminum_6061',
        form: 'flat'
      });
      expect(r.value.spindle_type).toBe('hydrostatic');
    });

    it('should return cost range string', () => {
      const r = dt.selectMachineConfig({
        target_Ra_nm: 50,
        workpiece_diameter_mm: 100,
        material: 'copper',
        form: 'spherical'
      });
      expect(r.value.estimated_cost_range).toContain('$');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Laser Interferometer Compensation Engine
// ═══════════════════════════════════════════════════════════════════

describe('LaserInterferometerCompensationEngine', () => {
  // ── Wavelength Compensation ─────────────────────────────────────

  describe('compensateWavelength', () => {
    it('should compute refractive index near 1.000272 for standard conditions', () => {
      const r = lic.compensateWavelength({
        wavelength_nm: 632.991, // He-Ne
        temperature_C: 20,
        pressure_hPa: 1013.25,
        humidity_pct: 50
      });
      // Standard air n ≈ 1.000272 at 632.8nm
      expect(r.value.refractive_index).toBeGreaterThan(1.00026);
      expect(r.value.refractive_index).toBeLessThan(1.00028);
    });

    it('should show correction near 0 ppm at standard conditions', () => {
      const r = lic.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 20,
        pressure_hPa: 1013.25,
        humidity_pct: 50
      });
      expect(Math.abs(r.value.correction_ppm)).toBeLessThan(1);
    });

    it('should show ~0.93 ppm/°C temperature sensitivity', () => {
      const r1 = lic.compensateWavelength({
        wavelength_nm: 632.991, temperature_C: 20,
        pressure_hPa: 1013.25, humidity_pct: 50
      });
      const r2 = lic.compensateWavelength({
        wavelength_nm: 632.991, temperature_C: 21,
        pressure_hPa: 1013.25, humidity_pct: 50
      });
      const delta_ppm = Math.abs(r2.value.correction_ppm - r1.value.correction_ppm);
      // Should be around 0.93 ppm/°C
      expect(delta_ppm).toBeGreaterThan(0.5);
      expect(delta_ppm).toBeLessThan(1.5);
    });

    it('should show ~0.27 ppm/hPa pressure sensitivity', () => {
      const r1 = lic.compensateWavelength({
        wavelength_nm: 632.991, temperature_C: 20,
        pressure_hPa: 1013.25, humidity_pct: 50
      });
      const r2 = lic.compensateWavelength({
        wavelength_nm: 632.991, temperature_C: 20,
        pressure_hPa: 1014.25, humidity_pct: 50
      });
      const delta_ppm = Math.abs(r2.value.correction_ppm - r1.value.correction_ppm);
      expect(delta_ppm).toBeGreaterThan(0.15);
      expect(delta_ppm).toBeLessThan(0.4);
    });

    it('should correct wavelength in air (shorter than vacuum)', () => {
      const r = lic.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 20,
        pressure_hPa: 1013.25,
        humidity_pct: 50
      });
      expect(r.value.wavelength_corrected_nm).toBeLessThan(632.991);
    });

    it('should handle CO2 variation', () => {
      const r1 = lic.compensateWavelength({
        wavelength_nm: 632.991, temperature_C: 20,
        pressure_hPa: 1013.25, humidity_pct: 50, co2_ppm: 400
      });
      const r2 = lic.compensateWavelength({
        wavelength_nm: 632.991, temperature_C: 20,
        pressure_hPa: 1013.25, humidity_pct: 50, co2_ppm: 600
      });
      // Higher CO2 → slightly higher n
      expect(r2.value.refractive_index)
        .toBeGreaterThan(r1.value.refractive_index);
    });
  });

  // ── Compensation Table ──────────────────────────────────────────

  describe('generateCompensationTable', () => {
    const samplePoints = [
      { position_mm: 0, error_um: 0.0, direction: 'forward' as const },
      { position_mm: 0, error_um: 0.5, direction: 'reverse' as const },
      { position_mm: 100, error_um: 2.0, direction: 'forward' as const },
      { position_mm: 100, error_um: 3.0, direction: 'reverse' as const },
      { position_mm: 200, error_um: 5.0, direction: 'forward' as const },
      { position_mm: 200, error_um: 6.5, direction: 'reverse' as const },
    ];

    it('should generate correct number of table entries', () => {
      const r = lic.generateCompensationTable({
        axis: 'X', measurement_points: samplePoints
      });
      expect(r.value.compensation_table.length).toBe(3);
    });

    it('should compute backlash from forward/reverse difference', () => {
      const r = lic.generateCompensationTable({
        axis: 'X', measurement_points: samplePoints
      });
      // Max backlash: |6.5-5.0| = 1.5 or |3.0-2.0| = 1.0 or |0.5-0| = 0.5
      expect(r.value.backlash_um).toBeGreaterThanOrEqual(1.0);
    });

    it('should output negative compensation values (to correct error)', () => {
      const r = lic.generateCompensationTable({
        axis: 'X', measurement_points: samplePoints
      });
      // Position 200mm has +5µm forward error → comp should be -5µm
      const entry200 = r.value.compensation_table.find(
        e => e.position_mm === 200
      );
      expect(entry200!.forward_comp_um).toBeLessThan(0);
    });

    it('should compute positional accuracy as range of errors', () => {
      const r = lic.generateCompensationTable({
        axis: 'X', measurement_points: samplePoints
      });
      expect(r.value.accuracy_um).toBeGreaterThan(0);
    });

    it('should compute angular error estimates', () => {
      const r = lic.generateCompensationTable({
        axis: 'Z', measurement_points: samplePoints
      });
      expect(typeof r.value.pitch).toBe('number');
      expect(typeof r.value.yaw).toBe('number');
    });

    it('should handle single-direction measurements', () => {
      const fwdOnly = [
        { position_mm: 0, error_um: 0, direction: 'forward' as const },
        { position_mm: 50, error_um: 1, direction: 'forward' as const },
        { position_mm: 100, error_um: 3, direction: 'forward' as const },
      ];
      const r = lic.generateCompensationTable({
        axis: 'Y', measurement_points: fwdOnly
      });
      expect(r.value.compensation_table.length).toBe(3);
      expect(r.value.backlash_um).toBe(0);
    });
  });

  // ── Measurement Cycle Planning ──────────────────────────────────

  describe('planMeasurementCycle', () => {
    it('should plan more points for tighter accuracy', () => {
      const r1 = lic.planMeasurementCycle({
        axis: 'X', travel_mm: 500,
        target_accuracy_um: 10, machine_type: 'VMC'
      });
      const r2 = lic.planMeasurementCycle({
        axis: 'X', travel_mm: 500,
        target_accuracy_um: 1, machine_type: 'VMC'
      });
      expect(r2.value.num_points).toBeGreaterThan(r1.value.num_points);
    });

    it('should require more averaging for tight targets', () => {
      const r = lic.planMeasurementCycle({
        axis: 'Z', travel_mm: 300,
        target_accuracy_um: 0.5, machine_type: 'Ultra-precision'
      });
      expect(r.value.averaging_count).toBeGreaterThanOrEqual(10);
    });

    it('should include vibration isolation for sub-1µm targets', () => {
      const r = lic.planMeasurementCycle({
        axis: 'X', travel_mm: 200,
        target_accuracy_um: 0.5, machine_type: 'CNC VMC'
      });
      expect(r.value.required_equipment.some(
        e => e.toLowerCase().includes('vibration')
      )).toBe(true);
    });

    it('should estimate reasonable total time', () => {
      const r = lic.planMeasurementCycle({
        axis: 'X', travel_mm: 500,
        target_accuracy_um: 5, machine_type: 'CNC HMC'
      });
      expect(r.value.total_time_min).toBeGreaterThan(10);
      expect(r.value.total_time_min).toBeLessThan(600);
    });

    it('should always include laser interferometer in equipment list', () => {
      const r = lic.planMeasurementCycle({
        axis: 'Y', travel_mm: 100,
        target_accuracy_um: 5, machine_type: 'lathe'
      });
      expect(r.value.required_equipment.some(
        e => e.toLowerCase().includes('laser')
      )).toBe(true);
    });
  });

  // ── Deadpath Error ──────────────────────────────────────────────

  describe('calculateDeadpathError', () => {
    it('should compute deadpath error for temperature change', () => {
      const r = lic.calculateDeadpathError({
        deadpath_length_mm: 100,
        temperature_delta_C: 1.0,
        pressure_delta_hPa: 0
      });
      // 100mm × 0.93e-6/°C × 1°C = 0.093µm
      expect(r.value.deadpath_error_um).toBeGreaterThan(0.05);
      expect(r.value.deadpath_error_um).toBeLessThan(0.15);
      expect(r.value.temperature_contribution_um).toBeGreaterThan(0);
      expect(r.value.pressure_contribution_um).toBe(0);
    });

    it('should compute deadpath error for pressure change', () => {
      const r = lic.calculateDeadpathError({
        deadpath_length_mm: 200,
        temperature_delta_C: 0,
        pressure_delta_hPa: 10
      });
      // 200mm × 0.268e-6/hPa × 10hPa = 0.000536mm = 0.536µm
      expect(r.value.deadpath_error_um).toBeGreaterThan(0.3);
      expect(r.value.deadpath_error_um).toBeLessThan(0.8);
    });

    it('should flag correction_needed when error exceeds 0.1µm', () => {
      const r = lic.calculateDeadpathError({
        deadpath_length_mm: 500,
        temperature_delta_C: 2,
        pressure_delta_hPa: 5
      });
      expect(r.value.correction_needed).toBe(true);
    });

    it('should not flag correction for tiny environmental changes', () => {
      const r = lic.calculateDeadpathError({
        deadpath_length_mm: 10,
        temperature_delta_C: 0.01,
        pressure_delta_hPa: 0.1
      });
      expect(r.value.correction_needed).toBe(false);
    });

    it('should scale linearly with deadpath length', () => {
      const r1 = lic.calculateDeadpathError({
        deadpath_length_mm: 100,
        temperature_delta_C: 1, pressure_delta_hPa: 0
      });
      const r2 = lic.calculateDeadpathError({
        deadpath_length_mm: 200,
        temperature_delta_C: 1, pressure_delta_hPa: 0
      });
      const ratio = r2.value.deadpath_error_um / r1.value.deadpath_error_um;
      expect(ratio).toBeCloseTo(2.0, 1);
    });

    it('should combine temperature and pressure contributions', () => {
      const r = lic.calculateDeadpathError({
        deadpath_length_mm: 100,
        temperature_delta_C: 1, pressure_delta_hPa: 5
      });
      expect(r.value.temperature_contribution_um).toBeGreaterThan(0);
      expect(r.value.pressure_contribution_um).toBeGreaterThan(0);
    });
  });
});
