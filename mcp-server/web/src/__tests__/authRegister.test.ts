/**
 * Register response interpretation (LAUNCH-FE, 2026-06-23, slot:quebec).
 * The backend returns HTTP 200 even for a duplicate username (success:false), so
 * the SPA must read the body, not just res.ok. interpretRegisterResult is the pure
 * decision the AuthContext.register flow relies on -- pin its branches (R9).
 */
import { describe, it, expect } from 'vitest';
import { interpretRegisterResult } from '../contexts/AuthContext';

describe('interpretRegisterResult (register response body -> verdict)', () => {
  it('wrapped success result -> ok', () => {
    expect(interpretRegisterResult({ result: { success: true, user_id: 'USR-1' } })).toEqual({ ok: true });
  });

  it('duplicate username (200 + success:false) -> not ok, carries the error', () => {
    expect(interpretRegisterResult({ result: { success: false, error: 'Username already exists' } })).toEqual({
      ok: false,
      error: 'Username already exists',
    });
  });

  it('success:false without an error string -> generic message (no undefined leak)', () => {
    expect(interpretRegisterResult({ result: { success: false } })).toEqual({ ok: false, error: 'Registration failed' });
  });

  it('unwrapped body (no result envelope) is handled both ways', () => {
    expect(interpretRegisterResult({ success: false, error: 'x' })).toEqual({ ok: false, error: 'x' });
    expect(interpretRegisterResult({ success: true })).toEqual({ ok: true });
  });

  it('empty / null body -> ok (no explicit failure signal)', () => {
    expect(interpretRegisterResult({})).toEqual({ ok: true });
    expect(interpretRegisterResult(null)).toEqual({ ok: true });
  });
});
