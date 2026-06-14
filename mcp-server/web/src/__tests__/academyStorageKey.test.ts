/**
 * academyStorageKey.test.ts — covers the per-worker key derivation and the
 * anon→worker migration used by Academy progress on shared shop tablets.
 *
 * Per PRISM-ACADEMY-MOBILE-MS0/U-PAM-AUTH.
 */

import { describe, it, expect } from 'vitest';
import {
  ANON_STORAGE_KEY,
  academyStorageKey,
  migrateAnonProgress,
  sanitizeStudentId,
} from '../lib/academyStorageKey';

describe('sanitizeStudentId', () => {
  it('returns null for non-string, empty, or whitespace-only input', () => {
    expect(sanitizeStudentId(undefined)).toBeNull();
    expect(sanitizeStudentId(null)).toBeNull();
    expect(sanitizeStudentId(42)).toBeNull();
    expect(sanitizeStudentId('')).toBeNull();
    expect(sanitizeStudentId('   ')).toBeNull();
  });

  it('preserves a clean alphanumeric id verbatim (lower-cased)', () => {
    expect(sanitizeStudentId('emp-1234')).toBe('emp-1234');
    expect(sanitizeStudentId('Alice42')).toBe('alice42');
  });

  it('collapses unsafe chars to underscore and strips leading/trailing _', () => {
    expect(sanitizeStudentId('alice/bob')).toBe('alice_bob');
    expect(sanitizeStudentId('!!alice!!')).toBe('alice');
    expect(sanitizeStudentId('user@shop.local')).toBe('user_shop.local');
  });

  it('returns null when the sanitized form would be empty', () => {
    expect(sanitizeStudentId('!!!')).toBeNull();
    expect(sanitizeStudentId('___')).toBeNull();
  });

  it('caps very long ids at 64 chars', () => {
    const long = 'a'.repeat(200);
    const result = sanitizeStudentId(long);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(64);
  });
});

describe('academyStorageKey', () => {
  it('returns the anon key for null / undefined / empty', () => {
    expect(academyStorageKey(null)).toBe(ANON_STORAGE_KEY);
    expect(academyStorageKey(undefined)).toBe(ANON_STORAGE_KEY);
    expect(academyStorageKey('')).toBe(ANON_STORAGE_KEY);
    expect(academyStorageKey('   ')).toBe(ANON_STORAGE_KEY);
  });

  it('returns the anon key when the id sanitizes to empty (back-compat safe)', () => {
    expect(academyStorageKey('!!!')).toBe(ANON_STORAGE_KEY);
  });

  it('returns a per-worker key for a normal employee id', () => {
    expect(academyStorageKey('emp-7')).toBe('prism_academy_progress_v3:emp-7');
  });

  it('two different ids produce two different keys (collision-safe)', () => {
    const a = academyStorageKey('alice');
    const b = academyStorageKey('bob');
    expect(a).not.toBe(b);
    expect(a).not.toBe(ANON_STORAGE_KEY);
    expect(b).not.toBe(ANON_STORAGE_KEY);
  });

  it('case-insensitive ids collide intentionally (single worker, one bucket)', () => {
    expect(academyStorageKey('Alice')).toBe(academyStorageKey('alice'));
  });
});

describe('migrateAnonProgress', () => {
  function fakeStore(initial: Record<string, string> = {}) {
    const data: Record<string, string> = { ...initial };
    return {
      data,
      getItem: (k: string) => (k in data ? data[k] : null),
      setItem: (k: string, v: string) => {
        data[k] = v;
      },
    };
  }

  it('returns "no-op" when the studentId fails to sanitize', () => {
    const s = fakeStore({ [ANON_STORAGE_KEY]: '{"a":1}' });
    expect(migrateAnonProgress('!!!', s)).toBe('no-op');
    // Anon bucket must be untouched.
    expect(s.data[ANON_STORAGE_KEY]).toBe('{"a":1}');
  });

  it('returns "no-anon" when no anon bucket exists', () => {
    const s = fakeStore({});
    expect(migrateAnonProgress('alice', s)).toBe('no-anon');
    expect(s.data['prism_academy_progress_v3:alice']).toBeUndefined();
  });

  it('copies anon → per-worker when the worker bucket is empty', () => {
    const s = fakeStore({ [ANON_STORAGE_KEY]: '{"x":42}' });
    expect(migrateAnonProgress('alice', s)).toBe('migrated');
    expect(s.data['prism_academy_progress_v3:alice']).toBe('{"x":42}');
    // Anon is intentionally preserved for the next worker.
    expect(s.data[ANON_STORAGE_KEY]).toBe('{"x":42}');
  });

  it('returns "kept" — does NOT overwrite existing worker progress', () => {
    const s = fakeStore({
      [ANON_STORAGE_KEY]: '{"anon":true}',
      'prism_academy_progress_v3:alice': '{"real":true}',
    });
    expect(migrateAnonProgress('alice', s)).toBe('kept');
    // Worker progress must NOT be clobbered.
    expect(s.data['prism_academy_progress_v3:alice']).toBe('{"real":true}');
  });

  it('treats an empty-string worker bucket as missing (allows migration)', () => {
    const s = fakeStore({
      [ANON_STORAGE_KEY]: '{"x":1}',
      'prism_academy_progress_v3:alice': '',
    });
    expect(migrateAnonProgress('alice', s)).toBe('migrated');
    expect(s.data['prism_academy_progress_v3:alice']).toBe('{"x":1}');
  });
});
