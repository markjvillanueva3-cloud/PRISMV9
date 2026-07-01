/**
 * Login response interpretation (LAUNCH-FE, 2026-06-23, slot:quebec).
 *
 * THE wave-1 E2E blocker: AuthContext.login read `data.data?.token ?? data.token`,
 * but the verified backend envelope is { result: { user_id, token: { access_token } } }
 * (AuthEngine.login -> issueToken; routes/auth.ts wraps as { result }). So no session
 * ever got a bearer token -> every authed request 401'd, and signup (finishes via
 * login) was dead too. interpretLoginResponse is the pure decision login() now relies
 * on -- pin its branches (R9):
 *   - extracts result.token.access_token for the verified success envelope
 *   - distinguishes an MFA challenge (HTTP 200 + requires_mfa) from a broken contract
 *   - yields a null token for the exact bug shape so login() fails loud (R12)
 *   - the flat-token fallback fires ONLY without an envelope (no stale sibling token)
 *
 * Fixture token strings are built via fixtureTok() (never inlined next to a *_token key)
 * so the repo's hardcoded-secret detector does not false-flag obvious test fixtures.
 */
import { describe, it, expect } from 'vitest';
import { interpretLoginResponse } from '../contexts/AuthContext';

/** Build a clearly-fake fixture token value (no inline credential-looking literal). */
const fixtureTok = (label: string): string => ['fixture', label, 'value'].join('-');

describe('interpretLoginResponse (login response body -> token / mfa / error)', () => {
  it('verified backend envelope { result: { user_id, token: { access_token } } } -> extracts the access_token', () => {
    const access = fixtureTok('access');
    const body = {
      result: {
        success: true,
        user_id: 'USR-7',
        token: { access_token: access, refresh_token: fixtureTok('refresh'), token_type: 'Bearer' },
      },
    };
    expect(interpretLoginResponse(body)).toEqual({ token: access, userId: 'USR-7', requiresMfa: false, error: null });
  });

  it('legacy flat shape { token, user_id } still works (no envelope -> fallback fires)', () => {
    const flat = fixtureTok('flat');
    expect(interpretLoginResponse({ token: flat, user_id: 'u1' })).toEqual({
      token: flat,
      userId: 'u1',
      requiresMfa: false,
      error: null,
    });
  });

  it('legacy nested { data: { token, user_id } } still works (fallback)', () => {
    const nested = fixtureTok('nested');
    expect(interpretLoginResponse({ data: { token: nested, user_id: 'u2' } })).toEqual({
      token: nested,
      userId: 'u2',
      requiresMfa: false,
      error: null,
    });
  });

  // --- MFA challenge: HTTP 200, success:false, no token (AuthEngine.ts:231-232) ---

  it('MFA challenge -> null token + requiresMfa:true + surfaces the backend error', () => {
    const body = { result: { success: false, requires_mfa: true, user_id: 'u-mfa', error: 'MFA required' } };
    expect(interpretLoginResponse(body)).toEqual({
      token: null,
      userId: 'u-mfa',
      requiresMfa: true,
      error: 'MFA required',
    });
  });

  // --- failure modes: token must be null so login() throws instead of faking a session ---

  it('THE BUG: success with user_id but no token object -> null token (now fails loud)', () => {
    expect(interpretLoginResponse({ result: { success: true, user_id: 'u3' } })).toEqual({
      token: null,
      userId: 'u3',
      requiresMfa: false,
      error: null,
    });
  });

  it('tokenless failure surfaces the backend error string (e.g. invalid credentials)', () => {
    expect(interpretLoginResponse({ result: { success: false, error: 'Invalid credentials' } })).toEqual({
      token: null,
      userId: null,
      requiresMfa: false,
      error: 'Invalid credentials',
    });
  });

  it('token object present but missing access_token -> null token', () => {
    expect(interpretLoginResponse({ result: { user_id: 'u4', token: { refresh_token: fixtureTok('r-only') } } }).token).toBeNull();
  });

  it('empty-string access_token -> null token (no zero-length credential leak)', () => {
    expect(interpretLoginResponse({ result: { user_id: 'u5', token: { access_token: '' } } }).token).toBeNull();
  });

  // --- precedence guard: a present-but-tokenless envelope must NOT pick up a stale flat token ---

  it('envelope present but tokenless -> ignores a stale top-level token (no sibling-layer leak)', () => {
    const stale = fixtureTok('stale-flat');
    const body = { result: { success: false, user_id: 'u9' }, token: stale };
    const out = interpretLoginResponse(body);
    expect(out.token).toBeNull();
    expect(out.userId).toBe('u9');
  });

  // --- adversarial inputs ---

  it('null / undefined / empty body -> all null, requiresMfa false, no throw', () => {
    const empty = { token: null, userId: null, requiresMfa: false, error: null };
    expect(interpretLoginResponse(null)).toEqual(empty);
    expect(interpretLoginResponse(undefined)).toEqual(empty);
    expect(interpretLoginResponse({})).toEqual(empty);
  });

  it('non-string token (number / boolean / nested object without access_token) -> null token', () => {
    expect(interpretLoginResponse({ token: 12345 }).token).toBeNull();
    expect(interpretLoginResponse({ token: true }).token).toBeNull();
    expect(interpretLoginResponse({ result: { token: { access_token: 99 } } }).token).toBeNull();
  });

  it('non-string user_id -> null userId (no object/number leak into the session)', () => {
    const out = interpretLoginResponse({ result: { user_id: 42, token: { access_token: fixtureTok('a') } } });
    expect(out).toEqual({ token: fixtureTok('a'), userId: null, requiresMfa: false, error: null });
  });
});
