/**
 * PostProcessorCapabilityMatrixEngine companion test (U-PP-MISSING-ENGINE-TESTS, slot:echo).
 *
 * The controller×capability feature matrix (180 Fusion CPS posts, 15+ families, 9 actions) is the
 * surface that answers the operator's "every machine/controller/feature combination" requirement —
 * and it was untested. Tests encode intent (R9) via reference anchors verified from the real matrix
 * data (Fanuc: smoothing G05.1, retract G28/G53, multi-axis G43.4) plus cross-method consistency
 * invariants (query counts must reconcile with getSummary counts; selectPost must partition the
 * whole matrix). Invariants stay correct as families are added to the matrix, so they don't rot.
 */
import { describe, it, expect } from 'vitest';
import {
  postProcessorCapabilityMatrixEngine as e,
  type CapabilityQuery,
} from '../engines/PostProcessorCapabilityMatrixEngine.js';

describe('PostProcessorCapabilityMatrixEngine — matrix & lookup', () => {
  it('getMatrix returns a non-empty defensive copy (mutation does not leak)', () => {
    const m1 = e.getMatrix();
    expect(m1.length).toBeGreaterThan(0);
    const before = m1.length;
    m1.pop(); // mutate the returned array
    expect(e.getMatrix().length).toBe(before); // engine state unaffected
  });

  it('getController resolves Fanuc case- and whitespace-insensitively', () => {
    const a = e.getController('Fanuc');
    const b = e.getController('fanuc');
    const c = e.getController('  FANUC  ');
    expect(a).not.toBeNull();
    expect(a!.family).toBe('Fanuc');
    expect(b!.family).toBe('Fanuc');
    expect(c!.family).toBe('Fanuc');
    // verified anchors from the real matrix data
    expect(a!.smoothing.type).toBe('G05.1');
    expect(a!.safeRetract.methods).toContain('G28');
    expect(a!.multiAxis.method).toBe('G43.4');
  });

  it('getController returns null for unknown / empty family', () => {
    expect(e.getController('NotAController')).toBeNull();
    expect(e.getController('')).toBeNull();
  });

  it('listFamilies length matches the matrix and includes Fanuc', () => {
    expect(e.listFamilies().length).toBe(e.getMatrix().length);
    expect(e.listFamilies()).toContain('Fanuc');
  });
});

describe('PostProcessorCapabilityMatrixEngine — query filters', () => {
  it('an empty query returns the full matrix', () => {
    expect(e.query({}).length).toBe(e.getMatrix().length);
  });

  it('smoothing filter returns only matching families and includes Fanuc (G05.1)', () => {
    const r = e.query({ smoothing: 'G05.1' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((c) => c.smoothing.type === 'G05.1')).toBe(true);
    expect(r.map((c) => c.family)).toContain('Fanuc');
  });

  it('minAxes filter only returns families meeting the axis floor', () => {
    const r = e.query({ minAxes: 5 });
    expect(r.every((c) => c.multiAxis.maxSimultaneousAxes >= 5)).toBe(true);
  });

  it('probing filter only returns probing-capable families', () => {
    const r = e.query({ probing: true });
    expect(r.every((c) => c.probing.supported)).toBe(true);
  });

  it('contradictory filters yield an empty array (no throw)', () => {
    const r = e.query({ minAxes: 999 } as CapabilityQuery);
    expect(r).toEqual([]);
  });
});

describe('PostProcessorCapabilityMatrixEngine — cross-method consistency invariants (R9)', () => {
  it('getSummary.totalPosts equals the sum of every family postCount', () => {
    const expected = e.getMatrix().reduce((s, c) => s + c.postCount, 0);
    expect(e.getSummary().totalPosts).toBe(expected);
  });

  it('getSummary.totalFamilies equals the matrix length', () => {
    expect(e.getSummary().totalFamilies).toBe(e.getMatrix().length);
  });

  it('familiesWith5Axis reconciles with query({minAxes:5})', () => {
    expect(e.getSummary().familiesWith5Axis).toBe(e.query({ minAxes: 5 }).length);
  });

  it('familiesWithProbing reconciles with query({probing:true})', () => {
    expect(e.getSummary().familiesWithProbing).toBe(e.query({ probing: true }).length);
  });

  it('allCapabilities is sorted, de-duplicated, and includes MILLING', () => {
    const caps = e.getSummary().allCapabilities;
    expect(caps).toContain('MILLING');
    expect([...caps]).toEqual([...caps].sort()); // sorted
    expect(new Set(caps).size).toBe(caps.length); // de-duped
  });
});

describe('PostProcessorCapabilityMatrixEngine — compare', () => {
  it('fewer than 2 valid families returns the guard message and no dimensions', () => {
    const r = e.compare(['Fanuc']);
    expect(r.dimensions).toHaveLength(0);
    expect(r.recommendation).toContain('at least 2');
  });

  it('an unknown + a valid family still trips the <2-valid guard', () => {
    const r = e.compare(['Fanuc', 'TotallyFakeController']);
    expect(r.dimensions).toHaveLength(0);
  });

  it('two valid families produce keyed dimensions and a ranked recommendation', () => {
    const fams = e.listFamilies().slice(0, 2);
    const r = e.compare(fams);
    expect(r.controllers).toEqual(fams);
    expect(r.dimensions.length).toBeGreaterThan(0);
    // every dimension carries a value for each compared family
    for (const dim of r.dimensions) {
      for (const fam of fams) expect(dim.values).toHaveProperty(fam);
    }
    expect(r.recommendation).toContain('scores highest');
  });
});

describe('PostProcessorCapabilityMatrixEngine — selectPost', () => {
  it('partitions the entire matrix into recommended + partial + incompatible', () => {
    const r = e.selectPost({ capability: 'MILLING' });
    const total = r.recommended.length + r.partial.length + r.incompatible.length;
    expect(total).toBe(e.getMatrix().length);
  });

  it('recommended posts are sorted by postCount descending (most-tested first)', () => {
    const r = e.selectPost({ capability: 'MILLING' });
    for (let i = 1; i < r.recommended.length; i++) {
      expect(r.recommended[i - 1].postCount).toBeGreaterThanOrEqual(r.recommended[i].postCount);
    }
  });

  it('no requirements => every family is recommended (nothing missing)', () => {
    const r = e.selectPost({});
    expect(r.recommended.length).toBe(e.getMatrix().length);
    expect(r.partial).toHaveLength(0);
    expect(r.incompatible).toHaveLength(0);
  });

  it('an unsatisfiable requirement yields zero recommended + an explanatory reason', () => {
    const r = e.selectPost({ minAxes: 999 } as CapabilityQuery);
    expect(r.recommended).toHaveLength(0);
    expect(r.reasoning.toLowerCase()).toMatch(/no exact matches|no controllers match/);
  });
});

describe('PostProcessorCapabilityMatrixEngine — per-family detail getters', () => {
  it('getSmoothing returns Fanuc smoothing + tolerance, null for unknown', () => {
    const s = e.getSmoothing('Fanuc');
    expect(s!.family).toBe('Fanuc');
    expect(s!.smoothing.type).toBe('G05.1');
    expect(typeof s!.tolerance_mm).toBe('number');
    expect(e.getSmoothing('nope')).toBeNull();
  });

  it('getRetractMethods returns Fanuc retract set, null for unknown', () => {
    const r = e.getRetractMethods('Fanuc');
    expect(r!.safeRetract.methods).toContain('G28');
    expect(e.getRetractMethods('nope')).toBeNull();
  });

  it('getMultiAxisSupport returns Fanuc multi-axis method, null for unknown', () => {
    const m = e.getMultiAxisSupport('Fanuc');
    expect(m!.multiAxis.method).toBe('G43.4');
    expect(e.getMultiAxisSupport('nope')).toBeNull();
  });
});
