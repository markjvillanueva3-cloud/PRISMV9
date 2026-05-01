import { describe, it, expect } from 'vitest';
import {
  fixtureDynamicsEngine,
  FixtureDynamicsEngine,
} from '../engines/FixtureDynamicsEngine.js';

describe('FixtureDynamicsEngine', () => {
  const engine = fixtureDynamicsEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(FixtureDynamicsEngine);
  });

  // ── vacuumHold ──────────────────────────────────────────────────
  describe('vacuumHold()', () => {
    it('computes vacuum holding force F=dP*A*eta', () => {
      const r = engine.vacuumHold({
        vacuum_pressure_kpa: 80,
        contact_area_mm2: 10000,
        seal_efficiency: 0.85,
      });
      // F = 80 * 10000 * 0.85 / 1000 = 680 N
      expect(r.holding_force_N).toBeCloseTo(680, 0);
      expect(r.safe_cutting_force_N).toBe(
        r.holding_force_N / 2.0
      );
      expect(r.formula).toContain('ΔP');
    });

    it('warns on low vacuum', () => {
      const r = engine.vacuumHold({
        vacuum_pressure_kpa: 30,
        contact_area_mm2: 5000,
      });
      expect(
        r.warnings.some((w: string) => w.includes('Low vacuum'))
      ).toBe(true);
    });
  });

  // ── chuckSpeedEffect ───────────────────────────────────────────
  describe('chuckSpeedEffect()', () => {
    it('computes centrifugal grip loss', () => {
      const r = engine.chuckSpeedEffect({
        grip_force_N: 5000,
        jaw_mass_kg: 0.5,
        grip_radius_mm: 80,
        spindle_rpm: 3000,
      });
      expect(r.centrifugal_force_N).toBeGreaterThan(0);
      expect(r.effective_grip_N).toBeLessThan(5000);
      expect(r.critical_rpm).toBeGreaterThan(0);
      expect(r.formula).toContain('ω');
    });

    it('warns when near critical RPM', () => {
      const r = engine.chuckSpeedEffect({
        grip_force_N: 1000,
        jaw_mass_kg: 2.0,
        grip_radius_mm: 100,
        spindle_rpm: 5000,
      });
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });

  // ── adaptiveClamping ───────────────────────────────────────────
  describe('adaptiveClamping()', () => {
    it('modulates clamping force with cutting load', () => {
      const r = engine.adaptiveClamping({
        base_force_N: 1000,
        cutting_force_N: 500,
        max_cutting_force_N: 1000,
        alpha: 0.5,
      });
      // F = 1000 * (1 + 0.5 * 500/1000) = 1000 * 1.25 = 1250
      expect(r.adaptive_force_N).toBeCloseTo(1250, 0);
      expect(r.force_ratio).toBeCloseTo(0.5, 2);
      expect(r.formula).toContain('F₀');
    });

    it('clamps to max force', () => {
      const r = engine.adaptiveClamping({
        base_force_N: 1000,
        cutting_force_N: 900,
        max_cutting_force_N: 1000,
        alpha: 1.0,
        max_force_N: 1500,
      });
      expect(r.adaptive_force_N).toBeLessThanOrEqual(1500);
      expect(r.clamped).toBe(true);
    });
  });

  // ── clampLayout321 ─────────────────────────────────────────────
  describe('clampLayout321()', () => {
    it('validates correct 3-2-1 layout', () => {
      const r = engine.clampLayout321({
        primary_locators: 3,
        secondary_locators: 2,
        tertiary_locators: 1,
      });
      expect(r.is_valid_321).toBe(true);
      expect(r.dof_constrained).toBe(6);
      expect(r.overconstrained).toBe(false);
      expect(r.underconstrained).toBe(false);
    });

    it('detects underconstrained layout', () => {
      const r = engine.clampLayout321({
        primary_locators: 2,
        secondary_locators: 1,
        tertiary_locators: 0,
      });
      expect(r.underconstrained).toBe(true);
      expect(r.dof_constrained).toBeLessThan(6);
      expect(
        r.warnings.some((w: string) => w.includes('DOF'))
      ).toBe(true);
    });

    it('detects overconstrained layout', () => {
      const r = engine.clampLayout321({
        primary_locators: 4,
        secondary_locators: 3,
        tertiary_locators: 2,
      });
      expect(r.overconstrained).toBe(true);
    });
  });

  // ── calculate dispatcher ────────────────────────────────────────
  it('dispatches via calculate()', () => {
    const r = engine.calculate({
      action: 'fixture_vacuum_hold',
      params: {
        vacuum_pressure_kpa: 80,
        contact_area_mm2: 10000,
      },
    });
    expect(r).toBeDefined();
    expect(r.holding_force_N).toBeGreaterThan(0);
  });

  it('throws on unknown action', () => {
    expect(() => engine.calculate({
      action: 'bogus', params: {},
    })).toThrow();
  });
});
