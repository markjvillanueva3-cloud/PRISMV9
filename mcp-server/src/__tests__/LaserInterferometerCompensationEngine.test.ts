/**
 * LaserInterferometerCompensationEngine Tests
 *
 * Tests laser interferometer metrology: wavelength compensation (Edlen),
 * compensation table generation, measurement planning, and deadpath errors.
 */

import { describe, it, expect } from 'vitest';
import { laserInterferometerCompensationEngine } from '../engines/LaserInterferometerCompensationEngine.js';

describe('LaserInterferometerCompensationEngine', () => {
  describe('compensateWavelength', () => {
    it('calculates refractive index near 1.000 for standard air', () => {
      const result = laserInterferometerCompensationEngine.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 20,
        pressure_hPa: 1013.25,
        humidity_pct: 50,
      });

      expect(result.value.refractive_index).toBeGreaterThan(1.0);
      expect(result.value.refractive_index).toBeLessThan(1.0003);
    });

    it('shows correction_ppm near zero at standard conditions', () => {
      const result = laserInterferometerCompensationEngine.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 20,
        pressure_hPa: 1013.25,
        humidity_pct: 50,
      });

      expect(Math.abs(result.value.correction_ppm)).toBeLessThan(1);
    });

    it('shows positive correction at lower temperature', () => {
      const cold = laserInterferometerCompensationEngine.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 15,
        pressure_hPa: 1013.25,
        humidity_pct: 50,
      });

      const standard = laserInterferometerCompensationEngine.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 20,
        pressure_hPa: 1013.25,
        humidity_pct: 50,
      });

      expect(cold.value.refractive_index).toBeGreaterThan(standard.value.refractive_index);
    });

    it('shows lower refractive index at lower pressure', () => {
      const lowP = laserInterferometerCompensationEngine.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 20,
        pressure_hPa: 950,
        humidity_pct: 50,
      });

      const highP = laserInterferometerCompensationEngine.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 20,
        pressure_hPa: 1050,
        humidity_pct: 50,
      });

      expect(lowP.value.refractive_index).toBeLessThan(highP.value.refractive_index);
    });

    it('accounts for CO2 concentration', () => {
      const low_co2 = laserInterferometerCompensationEngine.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 20,
        pressure_hPa: 1013.25,
        humidity_pct: 50,
        co2_ppm: 400,
      });

      const high_co2 = laserInterferometerCompensationEngine.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 20,
        pressure_hPa: 1013.25,
        humidity_pct: 50,
        co2_ppm: 600,
      });

      expect(high_co2.value.refractive_index).toBeGreaterThan(low_co2.value.refractive_index);
    });

    it('calculates corrected wavelength', () => {
      const result = laserInterferometerCompensationEngine.compensateWavelength({
        wavelength_nm: 632.991,
        temperature_C: 20,
        pressure_hPa: 1013.25,
        humidity_pct: 50,
      });

      expect(result.value.wavelength_corrected_nm).toBeLessThan(632.991);
      expect(result.value.wavelength_corrected_nm).toBeGreaterThan(632.8);
    });
  });

  describe('generateCompensationTable', () => {
    it('generates compensation entries for each position', () => {
      const result = laserInterferometerCompensationEngine.generateCompensationTable({
        axis: 'X',
        measurement_points: [
          { position_mm: 0, error_um: 0, direction: 'forward' },
          { position_mm: 100, error_um: 2.5, direction: 'forward' },
          { position_mm: 200, error_um: 5.0, direction: 'forward' },
          { position_mm: 200, error_um: 5.2, direction: 'reverse' },
          { position_mm: 100, error_um: 2.7, direction: 'reverse' },
          { position_mm: 0, error_um: 0.1, direction: 'reverse' },
        ],
      });

      expect(result.value.compensation_table).toHaveLength(3);
      expect(result.value.compensation_table[0].position_mm).toBe(0);
      expect(result.value.compensation_table[1].position_mm).toBe(100);
      expect(result.value.compensation_table[2].position_mm).toBe(200);
    });

    it('calculates compensation as negative of error', () => {
      const result = laserInterferometerCompensationEngine.generateCompensationTable({
        axis: 'X',
        measurement_points: [
          { position_mm: 0, error_um: 0, direction: 'forward' },
          { position_mm: 100, error_um: 5.0, direction: 'forward' },
        ],
      });

      expect(result.value.compensation_table[1].forward_comp_um).toBe(-5);
    });

    it('calculates backlash from forward/reverse difference', () => {
      const result = laserInterferometerCompensationEngine.generateCompensationTable({
        axis: 'X',
        measurement_points: [
          { position_mm: 100, error_um: 5.0, direction: 'forward' },
          { position_mm: 100, error_um: 5.5, direction: 'reverse' },
        ],
      });

      expect(result.value.backlash_um).toBeCloseTo(0.5, 3);
    });

    it('calculates repeatability from measurement spread', () => {
      const result = laserInterferometerCompensationEngine.generateCompensationTable({
        axis: 'Y',
        measurement_points: [
          { position_mm: 0, error_um: 0, direction: 'forward' },
          { position_mm: 0, error_um: 0.2, direction: 'forward' },
          { position_mm: 0, error_um: -0.1, direction: 'forward' },
          { position_mm: 0, error_um: 0.1, direction: 'reverse' },
        ],
      });

      expect(result.value.repeatability_um).toBeGreaterThan(0);
    });

    it('calculates accuracy as range of mean errors', () => {
      const result = laserInterferometerCompensationEngine.generateCompensationTable({
        axis: 'Z',
        measurement_points: [
          { position_mm: 0, error_um: 0, direction: 'forward' },
          { position_mm: 500, error_um: 10, direction: 'forward' },
        ],
      });

      expect(result.value.accuracy_um).toBeCloseTo(10, 2);
    });

    it('estimates pitch angle from error gradient', () => {
      const result = laserInterferometerCompensationEngine.generateCompensationTable({
        axis: 'X',
        measurement_points: [
          { position_mm: 0, error_um: 0, direction: 'forward' },
          { position_mm: 1000, error_um: 10, direction: 'forward' },
        ],
      });

      expect(result.value.pitch).not.toBe(0);
    });
  });

  describe('planMeasurementCycle', () => {
    it('plans more points for tighter accuracy', () => {
      const tight = laserInterferometerCompensationEngine.planMeasurementCycle({
        axis: 'X',
        travel_mm: 500,
        target_accuracy_um: 1,
        machine_type: 'CNC VMC',
      });

      const loose = laserInterferometerCompensationEngine.planMeasurementCycle({
        axis: 'X',
        travel_mm: 500,
        target_accuracy_um: 20,
        machine_type: 'CNC VMC',
      });

      expect(tight.value.num_points).toBeGreaterThan(loose.value.num_points);
    });

    it('requires longer settle time for tight targets', () => {
      const tight = laserInterferometerCompensationEngine.planMeasurementCycle({
        axis: 'X',
        travel_mm: 500,
        target_accuracy_um: 0.5,
        machine_type: 'Ultra-precision lathe',
      });

      expect(tight.value.settle_time_sec).toBeGreaterThanOrEqual(3);
    });

    it('includes vibration isolation for sub-micron targets', () => {
      const result = laserInterferometerCompensationEngine.planMeasurementCycle({
        axis: 'X',
        travel_mm: 300,
        target_accuracy_um: 0.5,
        machine_type: 'Ultra-precision',
      });

      expect(result.value.required_equipment).toContain('Vibration isolation pad');
    });

    it('estimates total time including environmental settle', () => {
      const result = laserInterferometerCompensationEngine.planMeasurementCycle({
        axis: 'Y',
        travel_mm: 400,
        target_accuracy_um: 5,
        machine_type: 'CNC VMC',
      });

      expect(result.value.total_time_min).toBeGreaterThan(result.value.environmental_settle_min);
    });

    it('requires more averaging for tighter accuracy', () => {
      const tight = laserInterferometerCompensationEngine.planMeasurementCycle({
        axis: 'Z',
        travel_mm: 300,
        target_accuracy_um: 0.5,
        machine_type: 'Precision',
      });

      const loose = laserInterferometerCompensationEngine.planMeasurementCycle({
        axis: 'Z',
        travel_mm: 300,
        target_accuracy_um: 10,
        machine_type: 'Precision',
      });

      expect(tight.value.averaging_count).toBeGreaterThan(loose.value.averaging_count);
    });
  });

  describe('calculateDeadpathError', () => {
    it('calculates deadpath error from temperature change', () => {
      const result = laserInterferometerCompensationEngine.calculateDeadpathError({
        deadpath_length_mm: 100,
        temperature_delta_C: 1,
        pressure_delta_hPa: 0,
      });

      expect(result.value.deadpath_error_um).toBeGreaterThan(0);
      expect(result.value.temperature_contribution_um).toBeGreaterThan(0);
      expect(result.value.pressure_contribution_um).toBe(0);
    });

    it('calculates deadpath error from pressure change', () => {
      const result = laserInterferometerCompensationEngine.calculateDeadpathError({
        deadpath_length_mm: 100,
        temperature_delta_C: 0,
        pressure_delta_hPa: 10,
      });

      expect(result.value.deadpath_error_um).toBeGreaterThan(0);
      expect(result.value.pressure_contribution_um).toBeGreaterThan(0);
      expect(result.value.temperature_contribution_um).toBe(0);
    });

    it('scales error with deadpath length', () => {
      const short = laserInterferometerCompensationEngine.calculateDeadpathError({
        deadpath_length_mm: 50,
        temperature_delta_C: 1,
        pressure_delta_hPa: 5,
      });

      const long = laserInterferometerCompensationEngine.calculateDeadpathError({
        deadpath_length_mm: 200,
        temperature_delta_C: 1,
        pressure_delta_hPa: 5,
      });

      expect(long.value.deadpath_error_um).toBeCloseTo(short.value.deadpath_error_um * 4, 2);
    });

    it('flags correction needed for large errors', () => {
      const large = laserInterferometerCompensationEngine.calculateDeadpathError({
        deadpath_length_mm: 500,
        temperature_delta_C: 2,
        pressure_delta_hPa: 20,
      });

      expect(large.value.correction_needed).toBe(true);
    });

    it('no correction needed for small changes', () => {
      const small = laserInterferometerCompensationEngine.calculateDeadpathError({
        deadpath_length_mm: 10,
        temperature_delta_C: 0.1,
        pressure_delta_hPa: 1,
      });

      expect(small.value.correction_needed).toBe(false);
    });

    it('temperature and pressure effects can partially cancel', () => {
      const tempUp = laserInterferometerCompensationEngine.calculateDeadpathError({
        deadpath_length_mm: 100,
        temperature_delta_C: 1,
        pressure_delta_hPa: 0,
      });

      const pressUp = laserInterferometerCompensationEngine.calculateDeadpathError({
        deadpath_length_mm: 100,
        temperature_delta_C: 0,
        pressure_delta_hPa: 3.5,
      });

      const combined = laserInterferometerCompensationEngine.calculateDeadpathError({
        deadpath_length_mm: 100,
        temperature_delta_C: 1,
        pressure_delta_hPa: 3.5,
      });

      expect(combined.value.deadpath_error_um).toBeLessThan(
        tempUp.value.deadpath_error_um + pressUp.value.deadpath_error_um
      );
    });
  });
});
