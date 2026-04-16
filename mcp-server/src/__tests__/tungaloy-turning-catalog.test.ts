import { describe, it, expect } from 'vitest';
import {
  TUNGALOY_TURNING_INSERTS,
  TUNGALOY_TURNING_GRADES,
  TUNGALOY_GROOVING_INSERTS,
  TUNGALOY_THREADING_INSERTS,
  TUNGALOY_TURNING_CONDITIONS,
  TUNGALOY_GROOVING_CONDITIONS,
} from '../data/tungaloy-turning-catalog';

describe('Tungaloy Turning Catalog Data', () => {
  describe('Turning Inserts', () => {
    it('has 2561 turning inserts', () => {
      expect(TUNGALOY_TURNING_INSERTS).toHaveLength(2561);
    });

    it('each insert has required fields', () => {
      for (const ins of TUNGALOY_TURNING_INSERTS) {
        expect(ins.designation).toBeTruthy();
        expect(ins.type).toBe('turning_insert');
        expect(ins.shape_code).toMatch(/^[A-Z]$/);
        expect(ins.ic_mm).toBeGreaterThan(0);
        expect(ins.nose_radius_mm).toBeGreaterThanOrEqual(0);
      }
    });

    it('covers all 10 standard shape codes', () => {
      const codes = new Set(TUNGALOY_TURNING_INSERTS.map(s => s.shape_code));
      for (const c of ['C', 'D', 'E', 'F', 'K', 'R', 'S', 'T', 'V', 'W']) {
        expect(codes).toContain(c);
      }
    });

    it('covers standard negative shapes (CNMG, DNMG, etc.)', () => {
      const desigs = TUNGALOY_TURNING_INSERTS.map(i => i.designation);
      expect(desigs.some(d => d.startsWith('CNMG'))).toBe(true);
      expect(desigs.some(d => d.startsWith('DNMG'))).toBe(true);
      expect(desigs.some(d => d.startsWith('SNMG'))).toBe(true);
      expect(desigs.some(d => d.startsWith('TNMG'))).toBe(true);
      expect(desigs.some(d => d.startsWith('WNMG'))).toBe(true);
      expect(desigs.some(d => d.startsWith('RNMG'))).toBe(true);
    });

    it('has 74+ unique chipbreaker codes', () => {
      const cbs = new Set(TUNGALOY_TURNING_INSERTS.map(i => i.chipbreaker));
      expect(cbs.size).toBeGreaterThanOrEqual(74);
    });
  });

  describe('Grades', () => {
    it('has 31 grades', () => {
      expect(TUNGALOY_TURNING_GRADES).toHaveLength(31);
    });

    it('each grade has valid fields', () => {
      for (const grade of TUNGALOY_TURNING_GRADES) {
        expect(grade.grade).toBeTruthy();
        expect(grade.description).toBeTruthy();
        expect(grade.iso_groups.length).toBeGreaterThan(0);
      }
    });

    it('has grades for every ISO group (P, M, K, N, S, H)', () => {
      const allIsos = new Set(TUNGALOY_TURNING_GRADES.flatMap(g => g.iso_groups));
      for (const group of ['P', 'M', 'K', 'N', 'S', 'H']) {
        expect(allIsos).toContain(group);
      }
    });

    it('T9225 covers P/M/K (general purpose CVD)', () => {
      const t9225 = TUNGALOY_TURNING_GRADES.find(g => g.grade === 'T9225');
      expect(t9225).toBeDefined();
      expect(t9225!.iso_groups).toContain('P');
      expect(t9225!.iso_groups).toContain('M');
      expect(t9225!.iso_groups).toContain('K');
    });

    it('AH8005 covers S (superalloys)', () => {
      const ah8005 = TUNGALOY_TURNING_GRADES.find(g => g.grade === 'AH8005');
      expect(ah8005).toBeDefined();
      expect(ah8005!.iso_groups).toContain('S');
    });

    it('GH130 covers H (hardened)', () => {
      const gh130 = TUNGALOY_TURNING_GRADES.find(g => g.grade === 'GH130');
      expect(gh130).toBeDefined();
      expect(gh130!.iso_groups).toContain('H');
    });

    it('KS05F covers N (non-ferrous)', () => {
      const ks05f = TUNGALOY_TURNING_GRADES.find(g => g.grade === 'KS05F');
      expect(ks05f).toBeDefined();
      expect(ks05f!.iso_groups).toContain('N');
    });

    it('has CBN grades (BX/GH prefix)', () => {
      const cbn = TUNGALOY_TURNING_GRADES.filter(
        g => g.grade.startsWith('BX') || g.grade.startsWith('GH')
      );
      expect(cbn.length).toBeGreaterThanOrEqual(5);
    });

    it('has ceramic grades (TH/TS prefix)', () => {
      const ceramic = TUNGALOY_TURNING_GRADES.filter(
        g => g.grade.startsWith('TH') || g.grade.startsWith('TS')
      );
      expect(ceramic.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Grooving Inserts', () => {
    it('has 89 grooving inserts', () => {
      expect(TUNGALOY_GROOVING_INSERTS).toHaveLength(89);
    });

    it('has 8 grooving families', () => {
      const families = new Set(TUNGALOY_GROOVING_INSERTS.map(g => g.family));
      expect(families.size).toBe(8);
    });

    it('DGM is a primary grooving family with multiple widths', () => {
      const dgm = TUNGALOY_GROOVING_INSERTS.filter(g => g.family === 'DGM');
      expect(dgm.length).toBeGreaterThan(5);
      const widths = new Set(dgm.map(g => g.width_mm));
      expect(widths.size).toBeGreaterThan(3);
    });

    it('each grooving insert has required fields', () => {
      for (const ins of TUNGALOY_GROOVING_INSERTS) {
        expect(ins.designation).toBeTruthy();
        expect(ins.type).toBe('grooving_insert');
        expect(ins.family).toBeTruthy();
        expect(ins.width_mm).toBeGreaterThan(0);
      }
    });

    it('each insert has valid grades that exist in grade table', () => {
      const gradeSet = new Set(TUNGALOY_TURNING_GRADES.map(g => g.grade));
      for (const ins of TUNGALOY_GROOVING_INSERTS) {
        if (ins.available_grades) {
          for (const grade of ins.available_grades) {
            expect(gradeSet.has(grade)).toBe(true);
          }
        }
      }
    });
  });

  describe('Threading Inserts', () => {
    it('has 323 threading inserts', () => {
      expect(TUNGALOY_THREADING_INSERTS).toHaveLength(323);
    });

    it('covers external and internal threading', () => {
      const dirs = new Set(TUNGALOY_THREADING_INSERTS.map(t => t.direction));
      expect(dirs).toContain('external');
      expect(dirs).toContain('internal');
    });
  });

  describe('Cutting Conditions', () => {
    it('has 56 turning conditions', () => {
      expect(TUNGALOY_TURNING_CONDITIONS).toHaveLength(56);
    });

    it('has 16 grooving conditions', () => {
      expect(TUNGALOY_GROOVING_CONDITIONS).toHaveLength(16);
    });

    it('each turning condition has valid feed/ap ranges', () => {
      for (const cond of TUNGALOY_TURNING_CONDITIONS) {
        expect(cond.ap_min_mm).toBeLessThan(cond.ap_max_mm);
        expect(cond.feed_min_mm_rev).toBeLessThan(cond.feed_max_mm_rev);
        expect(cond.iso_groups.length).toBeGreaterThan(0);
        expect(cond.vc_ranges.length).toBeGreaterThan(0);
      }
    });

    it('TF chipbreaker has finishing conditions', () => {
      const tf = TUNGALOY_TURNING_CONDITIONS.filter(c => c.chipbreaker === 'TF');
      expect(tf.length).toBeGreaterThan(0);
      // TF = finishing, should have small ap range
      for (const cond of tf) {
        expect(cond.ap_max_mm).toBeLessThanOrEqual(2);
      }
    });
  });
});
