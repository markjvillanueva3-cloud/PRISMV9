/**
 * requestCore error-code propagation (LAUNCH-FE, 2026-06-23, slot:quebec).
 * A 403 entitlement gate must carry its machine-readable code (TIER_LIMIT /
 * ENTITLEMENT_REVOKED) so the FE can render the right UpgradePrompt instead of a
 * raw error. Previously only the SFC client extracted it; now fetchJson does, for
 * every caller. These tests pin extractErrorCode (pure).
 */
import { describe, it, expect } from 'vitest';
import { extractErrorCode } from '../api/requestCore';

describe('extractErrorCode (entitlement 403 code propagation)', () => {
  it('extracts the code from a nested { error: { code, message } } envelope', () => {
    expect(extractErrorCode({ error: { code: 'TIER_LIMIT', message: 'Daily cap reached' } })).toBe('TIER_LIMIT');
  });

  it('extracts a top-level { code }', () => {
    expect(extractErrorCode({ code: 'ENTITLEMENT_REVOKED' })).toBe('ENTITLEMENT_REVOKED');
  });

  it('returns undefined for a plain string error (no code)', () => {
    expect(extractErrorCode({ error: 'plain message' })).toBe(undefined);
  });

  it('returns undefined for an empty/whitespace code', () => {
    expect(extractErrorCode({ error: { code: '   ', message: 'x' } })).toBe(undefined);
  });

  it('returns undefined for null / non-object payloads', () => {
    expect(extractErrorCode(null)).toBe(undefined);
    expect(extractErrorCode('nope')).toBe(undefined);
    expect(extractErrorCode(42)).toBe(undefined);
  });
});
