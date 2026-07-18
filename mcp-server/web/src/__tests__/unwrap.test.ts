/**
 * unwrap.test.ts -- unwrapPrism normalizes the two PRISM HTTP envelopes.
 *
 * R9: exact-value assertions of WHICH field is selected for each envelope shape, plus the
 * load-bearing edge: a falsy-but-present `data` (empty array / 0) must be returned, NOT
 * skipped to `result` -- that is the whole point of `?? ` over `||` and the difference
 * between "empty list" and "wrong field".
 */
import { describe, it, expect } from 'vitest';
import { unwrapPrism } from '../api/unwrap';

describe('unwrapPrism', () => {
  it('returns .data for an erp {ok,data} envelope (the bug case: pages read .result and got undefined)', () => {
    const erp = { ok: true, data: { employees: [{ id: 'E1' }] } };
    expect(unwrapPrism(erp)).toEqual({ employees: [{ id: 'E1' }] });
  });

  it('returns .result for a calc {result,safety,meta} envelope', () => {
    const calc = { result: { force_N: 245 }, safety: { score: 1, warnings: [] }, meta: { formula_used: 'kienzle', uncertainty: 0 } };
    expect(unwrapPrism(calc)).toEqual({ force_N: 245 });
  });

  it('prefers .data when BOTH are present (erp shape wins)', () => {
    expect(unwrapPrism({ data: 'D', result: 'R' })).toBe('D');
  });

  it('falls back to .result when .data is null/undefined (nullish, not truthy)', () => {
    expect(unwrapPrism({ data: null, result: 'R' })).toBe('R');
    expect(unwrapPrism({ data: undefined, result: 'R' })).toBe('R');
  });

  it('returns a FALSY-but-present .data unchanged (empty list / 0 are real payloads, not misses)', () => {
    // ?? must NOT skip these to .result -- "[] no clocked-in employees" != "wrong field".
    expect(unwrapPrism({ data: [], result: ['fallback'] })).toEqual([]);
    expect(unwrapPrism({ data: 0, result: 99 })).toBe(0);
    expect(unwrapPrism({ data: '', result: 'x' })).toBe('');
    expect(unwrapPrism({ data: false, result: true })).toBe(false);
  });

  it('returns undefined for null / non-object / empty object (no envelope at all)', () => {
    expect(unwrapPrism(null)).toBeUndefined();
    expect(unwrapPrism(undefined)).toBeUndefined();
    expect(unwrapPrism('not-an-object')).toBeUndefined();
    expect(unwrapPrism(42)).toBeUndefined();
    expect(unwrapPrism({})).toBeUndefined();
  });

  it('is generic: the caller-asserted type flows through', () => {
    const typed = unwrapPrism<{ count: number }>({ ok: true, data: { count: 3 } });
    expect(typed?.count).toBe(3);
  });
});
