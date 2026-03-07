import { describe, it, expect } from 'vitest';
import {
  TUNGALOY_INSERT_SHAPES,
  TUNGALOY_CHIPBREAKERS,
  TUNGALOY_TURNING_GRADES,
  TUNGALOY_GROOVING_INSERTS,
  TUNGALOY_TURNING_CATALOG_SUMMARY,
  type IsoGroup,
} from '../data/tungaloy-turning-catalog';

describe('Tungaloy Turning Catalog Data', () => {
  describe('Insert Shapes', () => {
    it('has 23 insert shapes', () => {
      expect(TUNGALOY_INSERT_SHAPES).toHaveLength(23);
    });

    it('each shape has valid ISO code (4 chars)', () => {
      for (const shape of TUNGALOY_INSERT_SHAPES) {
        expect(shape.code).toMatch(/^[A-Z]{4}$/);
        expect(shape.included_angle_deg).toBeGreaterThan(0);
        expect(shape.inscribed_circle_mm.length).toBeGreaterThan(0);
      }
    });

    it('covers all standard negative shapes', () => {
      const codes = TUNGALOY_INSERT_SHAPES.map(s => s.code);
      expect(codes).toContain('CNMG');
      expect(codes).toContain('DNMG');
      expect(codes).toContain('SNMG');
      expect(codes).toContain('TNMG');
      expect(codes).toContain('WNMG');
      expect(codes).toContain('RNMG');
    });

    it('has CBN/PCD variants', () => {
      const cbn = TUNGALOY_INSERT_SHAPES.filter(s => s.code.endsWith('A'));
      expect(cbn.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Chipbreakers', () => {
    it('has 15 chipbreakers', () => {
      expect(TUNGALOY_CHIPBREAKERS).toHaveLength(15);
    });

    it('covers finishing/medium/roughing applications', () => {
      const apps = new Set(TUNGALOY_CHIPBREAKERS.map(c => c.application));
      expect(apps).toContain('finishing');
      expect(apps).toContain('medium');
      expect(apps).toContain('roughing');
    });

    it('feed ranges are valid (min < max)', () => {
      for (const cb of TUNGALOY_CHIPBREAKERS) {
        expect(cb.feed_range_ipr[0]).toBeLessThan(cb.feed_range_ipr[1]);
        expect(cb.doc_range_in[0]).toBeLessThan(cb.doc_range_in[1]);
      }
    });

    it('TF is a finishing chipbreaker', () => {
      const tf = TUNGALOY_CHIPBREAKERS.find(c => c.code === 'TF');
      expect(tf).toBeDefined();
      expect(tf!.application).toBe('finishing');
    });
  });

  describe('Grades', () => {
    it('has 50+ grades', () => {
      expect(TUNGALOY_TURNING_GRADES.length).toBeGreaterThanOrEqual(50);
    });

    it('each grade has valid ISO suitability for all 6 groups', () => {
      const isoGroups: IsoGroup[] = ['P', 'M', 'K', 'N', 'S', 'H'];
      const validRatings = ['first_choice', 'second_choice', 'usable', 'not_recommended'];
      for (const grade of TUNGALOY_TURNING_GRADES) {
        for (const group of isoGroups) {
          expect(validRatings).toContain(grade.iso_suitability[group]);
        }
      }
    });

    it('has first-choice grades for every ISO group', () => {
      const isoGroups: IsoGroup[] = ['P', 'M', 'K', 'N', 'S', 'H'];
      for (const group of isoGroups) {
        const firstChoice = TUNGALOY_TURNING_GRADES.filter(
          g => g.iso_suitability[group] === 'first_choice'
        );
        expect(firstChoice.length).toBeGreaterThan(0);
      }
    });

    it('covers all substrate types', () => {
      const substrates = new Set(TUNGALOY_TURNING_GRADES.map(g => g.substrate));
      expect(substrates).toContain('carbide');
      expect(substrates).toContain('cermet');
      expect(substrates).toContain('cbn');
      expect(substrates).toContain('pcd');
      expect(substrates).toContain('ceramic');
    });

    it('T9225 is first choice for P (steel)', () => {
      const t9225 = TUNGALOY_TURNING_GRADES.find(g => g.code === 'T9225');
      expect(t9225).toBeDefined();
      expect(t9225!.iso_suitability.P).toBe('first_choice');
      expect(t9225!.substrate).toBe('carbide');
      expect(t9225!.coating).toBe('CVD');
    });

    it('AH8005 is first choice for S (superalloys)', () => {
      const ah8005 = TUNGALOY_TURNING_GRADES.find(g => g.code === 'AH8005');
      expect(ah8005).toBeDefined();
      expect(ah8005!.iso_suitability.S).toBe('first_choice');
    });

    it('BXA10 is first choice for H (hardened)', () => {
      const bxa10 = TUNGALOY_TURNING_GRADES.find(g => g.code === 'BXA10');
      expect(bxa10).toBeDefined();
      expect(bxa10!.iso_suitability.H).toBe('first_choice');
      expect(bxa10!.substrate).toBe('cbn');
    });

    it('GH130 is first choice for K (cast iron)', () => {
      const gh130 = TUNGALOY_TURNING_GRADES.find(g => g.code === 'GH130');
      expect(gh130).toBeDefined();
      expect(gh130!.iso_suitability.K).toBe('first_choice');
    });

    it('KS05F is first choice for N (non-ferrous)', () => {
      const ks05f = TUNGALOY_TURNING_GRADES.find(g => g.code === 'KS05F');
      expect(ks05f).toBeDefined();
      expect(ks05f!.iso_suitability.N).toBe('first_choice');
      expect(ks05f!.coating).toBe('uncoated');
    });

    it('no grade is first_choice for all 6 groups (physically impossible)', () => {
      for (const grade of TUNGALOY_TURNING_GRADES) {
        const firstChoiceCount = Object.values(grade.iso_suitability)
          .filter(v => v === 'first_choice').length;
        expect(firstChoiceCount).toBeLessThanOrEqual(4);
      }
    });
  });

  describe('Grooving Inserts', () => {
    it('has 9 grooving series', () => {
      expect(TUNGALOY_GROOVING_INSERTS).toHaveLength(9);
    });

    it('DGM is the primary external grooving series', () => {
      const dgm = TUNGALOY_GROOVING_INSERTS.find(g => g.series === 'DGM');
      expect(dgm).toBeDefined();
      expect(dgm!.cut_width_mm).toContain(3);
      expect(dgm!.iso_groups).toContain('P');
    });

    it('each series has valid grades that exist in grade table', () => {
      const gradeSet = new Set(TUNGALOY_TURNING_GRADES.map(g => g.code));
      for (const series of TUNGALOY_GROOVING_INSERTS) {
        for (const grade of series.grades) {
          expect(gradeSet.has(grade)).toBe(true);
        }
      }
    });
  });

  describe('Catalog Summary', () => {
    it('summary counts match actual data', () => {
      expect(TUNGALOY_TURNING_CATALOG_SUMMARY.insert_shapes).toBe(TUNGALOY_INSERT_SHAPES.length);
      expect(TUNGALOY_TURNING_CATALOG_SUMMARY.chipbreakers).toBe(TUNGALOY_CHIPBREAKERS.length);
      expect(TUNGALOY_TURNING_CATALOG_SUMMARY.grades).toBe(TUNGALOY_TURNING_GRADES.length);
      expect(TUNGALOY_TURNING_CATALOG_SUMMARY.grooving_series).toBe(TUNGALOY_GROOVING_INSERTS.length);
    });

    it('substrate breakdown sums to total grades', () => {
      const subs = TUNGALOY_TURNING_CATALOG_SUMMARY.grade_substrates;
      const total = subs.carbide + subs.cermet + subs.cbn + subs.pcd + subs.ceramic;
      expect(total).toBe(TUNGALOY_TURNING_GRADES.length);
    });
  });
});
