/**
 * U-W100-00: Data Readiness Sprint — verification tests
 *
 * Validates that all WEDM physics data requirements are met:
 * 1. ≥20 published pulse condition data points with source citations
 * 2. Klocke Ra k_ra values in 0.35-0.42 range for steel
 * 3. DiBitonto K1 constant is defined and in valid range
 * 4. EDM physics constants have source citations
 *
 * This is a BLOCKING prerequisite — downstream physics engines rely on this data.
 */
import { describe, it, expect } from 'vitest';

// Import the data sources to verify
import { PUBLISHED_PULSE_CONDITIONS, type PublishedPulseCondition } from '../data/wedm-published-conditions.js';
import { EDM_PHYSICS } from '../physics/constants.js';

describe('U-W100-00: Data Readiness Sprint', () => {

  describe('Published Pulse Conditions Database', () => {
    it('contains ≥20 published data points (target from milestone)', () => {
      expect(PUBLISHED_PULSE_CONDITIONS.length).toBeGreaterThanOrEqual(20);
    });

    it('every entry has a source citation', () => {
      for (const cond of PUBLISHED_PULSE_CONDITIONS) {
        expect(cond.source).toBeDefined();
        expect(cond.source.length).toBeGreaterThan(0);
        expect(cond.source_detail).toBeDefined();
      }
    });

    it('every entry has a unique ID', () => {
      const ids = new Set<string>();
      for (const cond of PUBLISHED_PULSE_CONDITIONS) {
        expect(cond.id).toBeDefined();
        expect(ids.has(cond.id)).toBe(false);
        ids.add(cond.id);
      }
    });

    it('confidence level is always one of the allowed values', () => {
      const allowed = ['manufacturer_table', 'published_textbook', 'peer_reviewed', 'interpolated'];
      for (const cond of PUBLISHED_PULSE_CONDITIONS) {
        expect(allowed).toContain(cond.confidence);
      }
    });

    it('covers multiple material groups', () => {
      const materials = new Set(PUBLISHED_PULSE_CONDITIONS.map(c => c.material_group));
      // Should have at least 4 material groups (steel, stainless, aluminum, carbide, titanium, etc.)
      expect(materials.size).toBeGreaterThanOrEqual(4);
    });

    it('covers multiple thickness ranges', () => {
      const thicknesses = new Set(PUBLISHED_PULSE_CONDITIONS.map(c => c.thickness_mm));
      // Should have at least 3 thickness points
      expect(thicknesses.size).toBeGreaterThanOrEqual(3);
    });

    it('covers multiple pass types (rough, semi_finish, finish)', () => {
      const passTypes = new Set(PUBLISHED_PULSE_CONDITIONS.map(c => c.pass_type));
      expect(passTypes.has('rough')).toBe(true);
      // Should have at least rough + one skim pass type
      expect(passTypes.size).toBeGreaterThanOrEqual(2);
    });

    it('pulse parameters are physically plausible when published (0 = not published)', () => {
      for (const cond of PUBLISHED_PULSE_CONDITIONS) {
        // Some entries have t_on_us = 0 when pulse params are machine-internal (not published)
        // These entries still have valid Ra/offset data from tech files
        if (cond.t_on_us > 0) {
          // t_on: 0.1μs to 100μs typical range
          expect(cond.t_on_us).toBeGreaterThan(0);
          expect(cond.t_on_us).toBeLessThan(200);

          // t_off: 1μs to 100μs typical
          expect(cond.t_off_us).toBeGreaterThan(0);
          expect(cond.t_off_us).toBeLessThan(200);

          // Peak current: 1A to 100A typical
          expect(cond.peak_current_A).toBeGreaterThan(0);
          expect(cond.peak_current_A).toBeLessThan(150);

          // Open voltage: 40V to 120V typical
          expect(cond.open_voltage_V).toBeGreaterThan(30);
          expect(cond.open_voltage_V).toBeLessThan(150);
        }
      }
    });
  });

  describe('Klocke Ra Model Coefficients', () => {
    it('k_ra for steel is in 0.35-0.42 range (Klocke 2013 Table 8.3)', () => {
      const steelKra = EDM_PHYSICS.klocke.ra_models.steel.k_ra;
      expect(steelKra).toBeGreaterThanOrEqual(0.35);
      expect(steelKra).toBeLessThanOrEqual(0.42);
    });

    it('k_ra for tool_steel is in valid range', () => {
      const toolSteelKra = EDM_PHYSICS.klocke.ra_models.tool_steel.k_ra;
      expect(toolSteelKra).toBeGreaterThanOrEqual(0.30);
      expect(toolSteelKra).toBeLessThanOrEqual(0.50);
    });

    it('all Ra models have source citations', () => {
      for (const [material, model] of Object.entries(EDM_PHYSICS.klocke.ra_models)) {
        expect(model.source).toBeDefined();
        expect(model.source.length).toBeGreaterThan(0);
      }
    });

    it('Ra model exponents are in valid ranges', () => {
      // alpha (current exponent): typically 0.3-0.5
      // beta (time exponent): typically 0.2-0.35
      for (const [material, model] of Object.entries(EDM_PHYSICS.klocke.ra_models)) {
        expect(model.alpha).toBeGreaterThanOrEqual(0.3);
        expect(model.alpha).toBeLessThanOrEqual(0.55);
        expect(model.beta).toBeGreaterThanOrEqual(0.2);
        expect(model.beta).toBeLessThanOrEqual(0.35);
      }
    });
  });

  describe('DiBitonto Crater Model', () => {
    it('K1 constant is defined', () => {
      expect(EDM_PHYSICS.dibitonto).toBeDefined();
      expect(EDM_PHYSICS.dibitonto.K1_um_per_mJ_third).toBeDefined();
    });

    it('K1 is in valid range (3-6 typical for metallic workpiece)', () => {
      const K1 = EDM_PHYSICS.dibitonto.K1_um_per_mJ_third;
      expect(K1).toBeGreaterThanOrEqual(3.0);
      expect(K1).toBeLessThanOrEqual(8.0);
    });

    it('K1 has source citation', () => {
      expect(EDM_PHYSICS.dibitonto.source).toBeDefined();
      expect(EDM_PHYSICS.dibitonto.source).toContain('DiBitonto');
    });
  });

  describe('EXIT GATE — Data Readiness Requirements', () => {
    it('≥20 published data points with source citations', () => {
      const validEntries = PUBLISHED_PULSE_CONDITIONS.filter(
        c => c.source && c.source.length > 0 && c.source_detail && c.source_detail.length > 0
      );
      expect(validEntries.length).toBeGreaterThanOrEqual(20);
    });

    it('k_ra in 0.35-0.42 range for steel confirmed', () => {
      expect(EDM_PHYSICS.klocke.ra_models.steel.k_ra).toBeGreaterThanOrEqual(0.35);
      expect(EDM_PHYSICS.klocke.ra_models.steel.k_ra).toBeLessThanOrEqual(0.42);
    });

    it('K1 validated with source citation', () => {
      expect(EDM_PHYSICS.dibitonto.K1_um_per_mJ_third).toBeDefined();
      expect(typeof EDM_PHYSICS.dibitonto.K1_um_per_mJ_third).toBe('number');
      expect(EDM_PHYSICS.dibitonto.source).toContain('1989');
    });

    it('multiple material groups covered for validation', () => {
      // Required: D2/tool_steel, 304SS/stainless, 6061/aluminum, WC/carbide, IN718/inconel
      const models = EDM_PHYSICS.klocke.ra_models;
      expect(models.tool_steel).toBeDefined();
      expect(models.stainless).toBeDefined();
      expect(models.aluminum).toBeDefined();
      expect(models.carbide).toBeDefined();
      expect(models.inconel).toBeDefined();
    });

    it('Ra formula: Ra = k_ra × I_p^α × t_on^β produces valid results', () => {
      // Validate formula with steel parameters
      const { k_ra, alpha, beta } = EDM_PHYSICS.klocke.ra_models.steel;
      const I_p = 10; // A
      const t_on = 5; // µs
      const Ra = k_ra * Math.pow(I_p, alpha) * Math.pow(t_on, beta);
      // Ra for rough EDM typically 1-6 µm
      expect(Ra).toBeGreaterThan(0.5);
      expect(Ra).toBeLessThan(10);
    });
  });
});
