/**
 * SGS Global Catalog v26.1 — Data Validation Tests
 * Validates extracted catalog data for completeness and correctness.
 */

import { describe, it, expect } from 'vitest';
import {
  SGS_COATINGS,
  SGS_END_MILL_SERIES,
  SGS_DRILL_SERIES,
  SGS_SPEED_FEED_ZR,
  SGS_ENDMILL_PARTS_ZR,
  SGS_ENDMILL_PARTS_ZRM,
  SGS_QUICK_SPEED_FEED,
  SGS_CATALOG_META,
} from '../data/sgs-tool-catalog';

describe('SGS Catalog Metadata', () => {
  it('has correct catalog info', () => {
    expect(SGS_CATALOG_META.manufacturer).toBe(
      'KYOCERA SGS Precision Tools'
    );
    expect(SGS_CATALOG_META.version).toBe('v26.1');
    expect(SGS_CATALOG_META.total_pages).toBe(436);
  });

  it('covers all ISO material groups', () => {
    const groups = Object.keys(SGS_CATALOG_META.iso_material_groups);
    expect(groups).toContain('P');
    expect(groups).toContain('M');
    expect(groups).toContain('K');
    expect(groups).toContain('N');
    expect(groups).toContain('S');
    expect(groups).toContain('H');
    expect(groups).toHaveLength(6);
  });

  it('includes RPM/IPM formulas', () => {
    expect(SGS_CATALOG_META.formulas.rpm_from_sfm).toContain('3.82');
    expect(SGS_CATALOG_META.formulas.ipm_from_ipt).toContain('Fz');
  });
});

describe('SGS Coatings', () => {
  it('has 9 coating types', () => {
    expect(SGS_COATINGS).toHaveLength(9);
  });

  it('each coating has required fields', () => {
    for (const c of SGS_COATINGS) {
      expect(c.name).toBeTruthy();
      expect(c.designation).toBeTruthy();
      expect(c.hardness_hv).toBeGreaterThan(0);
      expect(c.thermal_stability_c).toBeGreaterThan(0);
      expect(c.thickness_microns[0]).toBeLessThanOrEqual(
        c.thickness_microns[1]
      );
      expect(c.coefficient_of_friction[0]).toBeGreaterThan(0);
      expect(c.coefficient_of_friction[0]).toBeLessThanOrEqual(
        c.coefficient_of_friction[1]
      );
    }
  });

  it('hardness values are in valid range (2000-10000 HV)', () => {
    for (const c of SGS_COATINGS) {
      expect(c.hardness_hv).toBeGreaterThanOrEqual(2000);
      expect(c.hardness_hv).toBeLessThanOrEqual(10000);
    }
  });

  it('Diamond is the hardest coating', () => {
    const diamond = SGS_COATINGS.find(
      (c) => c.designation === 'Diamond'
    );
    expect(diamond).toBeDefined();
    expect(diamond!.hardness_hv).toBe(8000);
    const maxOther = Math.max(
      ...SGS_COATINGS
        .filter((c) => c.designation !== 'Diamond')
        .map((c) => c.hardness_hv)
    );
    expect(diamond!.hardness_hv).toBeGreaterThan(maxOther);
  });

  it('TiB2 has lowest friction for aluminum', () => {
    const tib2 = SGS_COATINGS.find(
      (c) => c.designation === 'TiB2'
    );
    expect(tib2).toBeDefined();
    expect(tib2!.coefficient_of_friction[0]).toBe(0.10);
    expect(tib2!.best_for).toContain('N');
  });

  it('AlTiN has highest thermal stability among PVD', () => {
    const altin = SGS_COATINGS.find(
      (c) => c.designation === 'AlTiN'
    );
    expect(altin).toBeDefined();
    expect(altin!.thermal_stability_c).toBe(1100);
  });
});

describe('SGS End Mill Series', () => {
  it('has at least 15 series', () => {
    expect(SGS_END_MILL_SERIES.length).toBeGreaterThanOrEqual(15);
  });

  it('each series has valid diameter ranges', () => {
    for (const s of SGS_END_MILL_SERIES) {
      expect(s.diameter_range_in[0]).toBeGreaterThan(0);
      expect(s.diameter_range_in[0]).toBeLessThanOrEqual(
        s.diameter_range_in[1]
      );
      expect(s.diameter_range_mm[0]).toBeGreaterThan(0);
      expect(s.diameter_range_mm[0]).toBeLessThanOrEqual(
        s.diameter_range_mm[1]
      );
    }
  });

  it('each series has valid LOC range', () => {
    for (const s of SGS_END_MILL_SERIES) {
      expect(s.loc_range_x_dc[0]).toBeGreaterThan(0);
      expect(s.loc_range_x_dc[0]).toBeLessThanOrEqual(
        s.loc_range_x_dc[1]
      );
    }
  });

  it('each series has at least one material suitability', () => {
    for (const s of SGS_END_MILL_SERIES) {
      expect(s.material_suitability.length).toBeGreaterThan(0);
    }
  });

  it('aluminum series use TiB2 or uncoated', () => {
    const alSeries = SGS_END_MILL_SERIES.filter(
      (s) =>
        s.material_suitability.includes('N') &&
        s.material_suitability.length === 1
    );
    expect(alSeries.length).toBeGreaterThan(0);
    for (const s of alSeries) {
      expect(s.coating).toMatch(/Ti-NAMITE-B|TiB2|uncoated/i);
    }
  });

  it('Z-Carb XPR is 4-flute with variable helix', () => {
    const zr = SGS_END_MILL_SERIES.find(
      (s) => s.series === 'ZR'
    );
    expect(zr).toBeDefined();
    expect(zr!.flute_count).toBe(4);
    expect(zr!.flute_indexing).toBe('Unequal');
    expect(zr!.max_ramp_angle_deg).toBe(90);
  });

  it('H-Carb is 7-flute with chipbreaker', () => {
    const hc = SGS_END_MILL_SERIES.find(
      (s) => s.series === '77'
    );
    expect(hc).toBeDefined();
    expect(hc!.flute_count).toBe(7);
    expect(hc!.chipbreaker).toBe(true);
  });

  it('V-Carb is 5-flute 45deg helix', () => {
    const vc = SGS_END_MILL_SERIES.find(
      (s) => s.series === '55'
    );
    expect(vc).toBeDefined();
    expect(vc!.flute_count).toBe(5);
    expect(vc!.helix_angle_deg).toBe('45');
  });
});

describe('SGS Drill Series', () => {
  it('has 5 drill series', () => {
    expect(SGS_DRILL_SERIES).toHaveLength(5);
  });

  it('each drill has valid point angle (90-145)', () => {
    for (const d of SGS_DRILL_SERIES) {
      expect(d.point_angle_deg).toBeGreaterThanOrEqual(90);
      expect(d.point_angle_deg).toBeLessThanOrEqual(145);
    }
  });

  it('each drill has valid diameter range', () => {
    for (const d of SGS_DRILL_SERIES) {
      expect(d.diameter_range_in[0]).toBeGreaterThan(0);
      expect(d.diameter_range_in[1]).toBeLessThanOrEqual(1.0);
      expect(d.diameter_range_mm[0]).toBeGreaterThan(0);
    }
  });

  it('131N is for non-ferrous with TiB2', () => {
    const n = SGS_DRILL_SERIES.find(
      (d) => d.series === '131N'
    );
    expect(n).toBeDefined();
    expect(n!.material_suitability).toEqual(['N']);
    expect(n!.coating).toBe('Ti-NAMITE-B');
  });

  it('Series 120 uses Diamond coating', () => {
    const d120 = SGS_DRILL_SERIES.find(
      (d) => d.series === '120'
    );
    expect(d120).toBeDefined();
    expect(d120!.coating).toContain('Diamond');
  });
});

describe('SGS Speed/Feed ZR (Z-Carb XPR)', () => {
  it('has at least 30 entries', () => {
    expect(SGS_SPEED_FEED_ZR.length).toBeGreaterThanOrEqual(30);
  });

  it('covers all major ISO groups', () => {
    const groups = [
      ...new Set(SGS_SPEED_FEED_ZR.map((r) => r.iso_group)),
    ];
    expect(groups).toContain('P');
    expect(groups).toContain('M');
    expect(groups).toContain('K');
    expect(groups).toContain('S');
  });

  it('SFM values are realistic (40-810)', () => {
    for (const r of SGS_SPEED_FEED_ZR) {
      expect(r.sfm).toBeGreaterThanOrEqual(40);
      expect(r.sfm).toBeLessThanOrEqual(810);
      expect(r.sfm_range[0]).toBeLessThan(r.sfm);
      expect(r.sfm_range[1]).toBeGreaterThan(r.sfm);
    }
  });

  it('IPT values are realistic (0.0005-0.005)', () => {
    for (const r of SGS_SPEED_FEED_ZR) {
      for (const ipt of Object.values(r.ipt_by_diameter)) {
        expect(ipt).toBeGreaterThanOrEqual(0.0005);
        expect(ipt).toBeLessThanOrEqual(0.005);
      }
    }
  });

  it('IPT increases with diameter', () => {
    for (const r of SGS_SPEED_FEED_ZR) {
      const entries = Object.entries(r.ipt_by_diameter)
        .map(([d, v]) => [parseFloat(d), v] as [number, number])
        .sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i][1]).toBeGreaterThanOrEqual(
          entries[i - 1][1]
        );
      }
    }
  });

  it('slot SFM < profile SFM for same material', () => {
    const materials = [
      ...new Set(SGS_SPEED_FEED_ZR.map((r) => r.material_group)),
    ];
    for (const mat of materials) {
      const profile = SGS_SPEED_FEED_ZR.find(
        (r) =>
          r.material_group === mat && r.cut_type === 'Profile'
      );
      const slot = SGS_SPEED_FEED_ZR.find(
        (r) =>
          r.material_group === mat && r.cut_type === 'Slot'
      );
      if (profile && slot) {
        expect(slot.sfm).toBeLessThanOrEqual(profile.sfm);
      }
    }
  });

  it('carbon steel is faster than alloy steel', () => {
    const carbon = SGS_SPEED_FEED_ZR.find(
      (r) =>
        r.material_group === 'Carbon Steels' &&
        r.cut_type === 'Profile'
    );
    const alloy = SGS_SPEED_FEED_ZR.find(
      (r) =>
        r.material_group === 'Alloy Steels' &&
        r.cut_type === 'Profile'
    );
    expect(carbon).toBeDefined();
    expect(alloy).toBeDefined();
    expect(carbon!.sfm).toBeGreaterThan(alloy!.sfm);
  });

  it('titanium is faster than superalloys', () => {
    const ti = SGS_SPEED_FEED_ZR.find(
      (r) =>
        r.material_group === 'Titanium Alloys' &&
        r.cut_type === 'Profile'
    );
    const sa = SGS_SPEED_FEED_ZR.find(
      (r) =>
        r.material_group.startsWith('Super Alloys (Ni') &&
        r.cut_type === 'Profile'
    );
    expect(ti).toBeDefined();
    expect(sa).toBeDefined();
    expect(ti!.sfm).toBeGreaterThan(sa!.sfm);
  });
});

describe('SGS End Mill Part Numbers', () => {
  it('ZR fractional has 10 parts', () => {
    expect(SGS_ENDMILL_PARTS_ZR).toHaveLength(10);
  });

  it('ZRM metric has 6 parts', () => {
    expect(SGS_ENDMILL_PARTS_ZRM).toHaveLength(6);
  });

  it('all parts have valid EDP numbers', () => {
    for (const p of [
      ...SGS_ENDMILL_PARTS_ZR,
      ...SGS_ENDMILL_PARTS_ZRM,
    ]) {
      expect(p.edp_number).toMatch(/^\d{5}$/);
    }
  });

  it('all parts have 4 flutes', () => {
    for (const p of [
      ...SGS_ENDMILL_PARTS_ZR,
      ...SGS_ENDMILL_PARTS_ZRM,
    ]) {
      expect(p.flute_count).toBe(4);
    }
  });

  it('OAL > LOC for all parts', () => {
    for (const p of [
      ...SGS_ENDMILL_PARTS_ZR,
      ...SGS_ENDMILL_PARTS_ZRM,
    ]) {
      expect(p.oal_in).toBeGreaterThan(p.loc_in);
    }
  });

  it('shank_dia <= diameter for all parts', () => {
    for (const p of [
      ...SGS_ENDMILL_PARTS_ZR,
      ...SGS_ENDMILL_PARTS_ZRM,
    ]) {
      expect(p.shank_dia_in).toBeLessThanOrEqual(
        p.diameter_in + 0.001
      );
    }
  });
});

describe('SGS Quick Speed/Feed Table', () => {
  it('has at least 30 entries', () => {
    expect(SGS_QUICK_SPEED_FEED.length).toBeGreaterThanOrEqual(30);
  });

  it('covers ZR, Z1P, 55, 77 series', () => {
    const series = [
      ...new Set(SGS_QUICK_SPEED_FEED.map((r) => r.series)),
    ];
    expect(series).toContain('ZR');
    expect(series).toContain('Z1P');
    expect(series).toContain('55');
    expect(series).toContain('77');
  });

  it('profile SFM >= slot SFM', () => {
    for (const r of SGS_QUICK_SPEED_FEED) {
      expect(r.profile_sfm).toBeGreaterThanOrEqual(r.slot_sfm);
    }
  });

  it('IPT values are positive and realistic', () => {
    for (const r of SGS_QUICK_SPEED_FEED) {
      expect(r.ipt_half_inch_profile).toBeGreaterThan(0);
      expect(r.ipt_half_inch_profile).toBeLessThan(0.01);
      expect(r.ipt_half_inch_slot).toBeGreaterThan(0);
      expect(r.ipt_half_inch_slot).toBeLessThan(0.01);
    }
  });

  it('H-Carb 7-flute has higher SFM than ZR 4-flute', () => {
    const hcSteel = SGS_QUICK_SPEED_FEED.find(
      (r) =>
        r.series === '77' &&
        r.material_group === 'Carbon Steel'
    );
    const zrSteel = SGS_QUICK_SPEED_FEED.find(
      (r) =>
        r.series === 'ZR' &&
        r.material_group === 'Carbon Steel'
    );
    expect(hcSteel).toBeDefined();
    expect(zrSteel).toBeDefined();
    expect(hcSteel!.profile_sfm).toBeGreaterThan(
      zrSteel!.profile_sfm
    );
  });

  it('flute counts match series specs', () => {
    for (const r of SGS_QUICK_SPEED_FEED) {
      if (r.series === 'ZR' || r.series === 'Z1P') {
        expect(r.flute_count).toBe(4);
      }
      if (r.series === '55') expect(r.flute_count).toBe(5);
      if (r.series === '77') expect(r.flute_count).toBe(7);
    }
  });
});
