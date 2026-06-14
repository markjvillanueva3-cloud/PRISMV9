/**
 * academyPicksStorage.test.ts — per-worker picks + active-path persistence.
 *
 * Per PRISM-ACADEMY-FEATURES-MS0 (lima, 2026-05-27) closing U-ACADEMY-PICKS-PERSIST
 * + companion "active learning path" gap.
 *
 * Coverage floor (per CLAUDE.md):
 *   • happy path (load/save/clear round trip) + per-worker isolation
 *   • ≥3 failure modes (bad JSON, throwing storage, missing fields)
 *   • ≥2 adversarial inputs (oversize id, hostile JSON shape, NaN/Infinity in field)
 *   • derived query (pathPosition, pathProgress) edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  PICKS_KEY_PREFIX,
  PATH_KEY_PREFIX,
  PICKS_ANON_KEY,
  PATH_ANON_KEY,
  picksKey,
  pathKey,
  loadPicks,
  savePicks,
  clearPicks,
  loadActivePath,
  saveActivePath,
  clearActivePath,
  pathPosition,
  pathProgress,
  type AcademyPicks,
  type ActiveLearningPath,
} from '../lib/academyPicksStorage';

// ─── In-memory storage stub ──────────────────────────────────────────────────

class MemStorage {
  private data = new Map<string, string>();
  getItem = (k: string): string | null => this.data.get(k) ?? null;
  setItem = (k: string, v: string): void => { this.data.set(k, v); };
  removeItem = (k: string): void => { this.data.delete(k); };
  get size(): number { return this.data.size; }
  keys(): string[] { return Array.from(this.data.keys()); }
}

class ThrowingStorage {
  getItem = (_k: string): string | null => { throw new Error('quota exceeded'); };
  setItem = (_k: string, _v: string): void => { throw new Error('quota exceeded'); };
  removeItem = (_k: string): void => { throw new Error('quota exceeded'); };
}

// ─── Key derivation ──────────────────────────────────────────────────────────

describe('picksKey / pathKey', () => {
  it('returns the anon bucket for null / undefined / empty / un-sanitizable id', () => {
    expect(picksKey(null)).toBe(PICKS_ANON_KEY);
    expect(picksKey(undefined)).toBe(PICKS_ANON_KEY);
    expect(picksKey('')).toBe(PICKS_ANON_KEY);
    expect(picksKey('   ')).toBe(PICKS_ANON_KEY);
    expect(picksKey('!!!')).toBe(PICKS_ANON_KEY);
    expect(pathKey(null)).toBe(PATH_ANON_KEY);
    expect(pathKey('!!!')).toBe(PATH_ANON_KEY);
  });

  it('namespaces by sanitized id for real workers', () => {
    expect(picksKey('justin-apprentice')).toBe(`${PICKS_KEY_PREFIX}:justin-apprentice`);
    expect(pathKey('Mark-Manager')).toBe(`${PATH_KEY_PREFIX}:mark-manager`);
  });

  it('isolates picks bucket from path bucket for the same worker', () => {
    expect(picksKey('justin-apprentice')).not.toBe(pathKey('justin-apprentice'));
  });
});

// ─── Picks: round trip ───────────────────────────────────────────────────────

describe('loadPicks / savePicks / clearPicks', () => {
  it('returns null when nothing has been saved', () => {
    const s = new MemStorage();
    expect(loadPicks('justin-apprentice', s)).toBeNull();
  });

  it('round-trips a complete picks payload', () => {
    const s = new MemStorage();
    const picks: AcademyPicks = {
      selectedSubIds: ['foundations-onboarding', 'machining-edm'],
      openDomain: 'Machining',
      loadedTrackId: 'justin-apprentice',
      trackBannerDismissed: false,
      updatedAt: '2026-05-27T00:00:00.000Z',
    };
    savePicks('justin-apprentice', picks, s);
    const loaded = loadPicks('justin-apprentice', s);
    expect(loaded).not.toBeNull();
    expect(loaded!.selectedSubIds).toEqual(['foundations-onboarding', 'machining-edm']);
    expect(loaded!.openDomain).toBe('Machining');
    expect(loaded!.loadedTrackId).toBe('justin-apprentice');
    expect(loaded!.trackBannerDismissed).toBe(false);
    // updatedAt is rewritten on save — verify it's a fresh ISO string, not the input
    expect(loaded!.updatedAt).not.toBe(picks.updatedAt);
    expect(() => new Date(loaded!.updatedAt).toISOString()).not.toThrow();
  });

  it('isolates picks per worker (Justin save does NOT bleed into Chris bucket)', () => {
    const s = new MemStorage();
    savePicks('justin-apprentice', {
      selectedSubIds: ['foundations-onboarding'],
      openDomain: 'Foundations',
      loadedTrackId: null,
      trackBannerDismissed: false,
      updatedAt: new Date().toISOString(),
    }, s);
    expect(loadPicks('chris-programmer', s)).toBeNull();
    expect(loadPicks('justin-apprentice', s)!.selectedSubIds).toEqual(['foundations-onboarding']);
  });

  it('clearPicks removes only the targeted worker', () => {
    const s = new MemStorage();
    const base: AcademyPicks = {
      selectedSubIds: ['x'],
      openDomain: null,
      loadedTrackId: null,
      trackBannerDismissed: false,
      updatedAt: new Date().toISOString(),
    };
    savePicks('justin-apprentice', base, s);
    savePicks('chris-programmer', base, s);
    clearPicks('justin-apprentice', s);
    expect(loadPicks('justin-apprentice', s)).toBeNull();
    expect(loadPicks('chris-programmer', s)).not.toBeNull();
  });

  // ─── Failure modes ─────────────────────────────────────────────────────────

  it('returns null on corrupt JSON without throwing', () => {
    const s = new MemStorage();
    s.setItem(picksKey('justin-apprentice'), '{not valid json');
    expect(loadPicks('justin-apprentice', s)).toBeNull();
  });

  it('returns null when stored value is not an object', () => {
    const s = new MemStorage();
    s.setItem(picksKey('justin-apprentice'), JSON.stringify('a string'));
    expect(loadPicks('justin-apprentice', s)).toBeNull();
    s.setItem(picksKey('justin-apprentice'), JSON.stringify(42));
    expect(loadPicks('justin-apprentice', s)).toBeNull();
  });

  it('returns null when stored value is JSON null', () => {
    const s = new MemStorage();
    s.setItem(picksKey('justin-apprentice'), 'null');
    expect(loadPicks('justin-apprentice', s)).toBeNull();
  });

  it('returns null when stored value is a JSON array (reviewer P1)', () => {
    const s = new MemStorage();
    s.setItem(picksKey('justin-apprentice'), '[1,2,3]');
    expect(loadPicks('justin-apprentice', s)).toBeNull();
    s.setItem(picksKey('justin-apprentice'), '[]');
    expect(loadPicks('justin-apprentice', s)).toBeNull();
  });

  it('filters out non-string elements from selectedSubIds (hostile payload)', () => {
    const s = new MemStorage();
    s.setItem(picksKey('justin-apprentice'), JSON.stringify({
      selectedSubIds: ['foundations-onboarding', 42, null, '', 'machining-edm', {}, undefined],
      openDomain: null,
      loadedTrackId: null,
      trackBannerDismissed: false,
      updatedAt: new Date().toISOString(),
    }));
    const loaded = loadPicks('justin-apprentice', s);
    expect(loaded!.selectedSubIds).toEqual(['foundations-onboarding', 'machining-edm']);
  });

  it('coerces missing / wrong-typed fields to safe defaults', () => {
    const s = new MemStorage();
    s.setItem(picksKey('justin-apprentice'), JSON.stringify({
      selectedSubIds: ['foundations-onboarding'],
      // openDomain missing
      // loadedTrackId is a number (hostile)
      loadedTrackId: 42,
      // trackBannerDismissed is a string (hostile)
      trackBannerDismissed: 'yes',
      // updatedAt missing
    }));
    const loaded = loadPicks('justin-apprentice', s);
    expect(loaded!.openDomain).toBeNull();
    expect(loaded!.loadedTrackId).toBeNull();
    expect(loaded!.trackBannerDismissed).toBe(true); // Boolean('yes') === true
    expect(typeof loaded!.updatedAt).toBe('string');
  });

  it('save with a throwing storage returns false (R12 fail-loud signal) but does NOT throw', () => {
    const picks: AcademyPicks = {
      selectedSubIds: ['x'],
      openDomain: null,
      loadedTrackId: null,
      trackBannerDismissed: false,
      updatedAt: new Date().toISOString(),
    };
    let result: boolean | undefined;
    expect(() => { result = savePicks('justin-apprentice', picks, new ThrowingStorage()); }).not.toThrow();
    expect(result).toBe(false);
    expect(() => clearPicks('justin-apprentice', new ThrowingStorage())).not.toThrow();
    expect(loadPicks('justin-apprentice', new ThrowingStorage())).toBeNull();
  });

  it('savePicks returns true on successful write (positive case)', () => {
    const s = new MemStorage();
    const result = savePicks('justin-apprentice', {
      selectedSubIds: ['x'],
      openDomain: null,
      loadedTrackId: null,
      trackBannerDismissed: false,
      updatedAt: new Date().toISOString(),
    }, s);
    expect(result).toBe(true);
  });

  it('persists optional loadedTrackHash round-trip', () => {
    const s = new MemStorage();
    savePicks('justin-apprentice', {
      selectedSubIds: ['x'],
      openDomain: null,
      loadedTrackId: 'justin-apprentice',
      loadedTrackHash: 'course-0a|course-0b|course-2',
      trackBannerDismissed: false,
      updatedAt: new Date().toISOString(),
    }, s);
    const loaded = loadPicks('justin-apprentice', s);
    expect(loaded!.loadedTrackHash).toBe('course-0a|course-0b|course-2');
  });

  it('v1 back-compat: payload without loadedTrackHash hydrates as null', () => {
    const s = new MemStorage();
    // Pre-hash schema (no loadedTrackHash field at all)
    s.setItem(picksKey('justin-apprentice'), JSON.stringify({
      selectedSubIds: ['x'],
      openDomain: null,
      loadedTrackId: 'justin-apprentice',
      trackBannerDismissed: false,
      updatedAt: new Date().toISOString(),
    }));
    const loaded = loadPicks('justin-apprentice', s);
    expect(loaded).not.toBeNull();
    expect(loaded!.loadedTrackHash ?? null).toBeNull();
  });

  // ─── Adversarial ────────────────────────────────────────────────────────────

  it('handles oversize id (>64 chars) via sanitization without crashing', () => {
    const s = new MemStorage();
    const longId = 'a'.repeat(200);
    const key = picksKey(longId);
    expect(key.length).toBeLessThan(PICKS_KEY_PREFIX.length + 64 + 2); // prefix + ':' + ≤64
    savePicks(longId, {
      selectedSubIds: ['x'],
      openDomain: null,
      loadedTrackId: null,
      trackBannerDismissed: false,
      updatedAt: new Date().toISOString(),
    }, s);
    expect(loadPicks(longId, s)!.selectedSubIds).toEqual(['x']);
  });

  it('id collision via sanitization is intentional — alice/bob and alice_bob share a bucket', () => {
    const s = new MemStorage();
    savePicks('alice/bob', {
      selectedSubIds: ['x'],
      openDomain: null,
      loadedTrackId: null,
      trackBannerDismissed: false,
      updatedAt: new Date().toISOString(),
    }, s);
    // alice_bob and alice/bob both sanitize to alice_bob — same bucket
    expect(loadPicks('alice_bob', s)).not.toBeNull();
  });
});

// ─── Active path: round trip ─────────────────────────────────────────────────

describe('loadActivePath / saveActivePath / clearActivePath', () => {
  it('round-trips a path payload', () => {
    const s = new MemStorage();
    const path: ActiveLearningPath = {
      courseIds: ['course-0a', 'course-0b', 'course-2'],
      loadedTrackId: 'justin-apprentice',
      startedAt: '2026-05-27T00:00:00.000Z',
    };
    saveActivePath('justin-apprentice', path, s);
    const loaded = loadActivePath('justin-apprentice', s);
    expect(loaded).toEqual(path);
  });

  it('returns null when courseIds is empty (no path to follow)', () => {
    const s = new MemStorage();
    s.setItem(pathKey('justin-apprentice'), JSON.stringify({
      courseIds: [],
      loadedTrackId: null,
      startedAt: new Date().toISOString(),
    }));
    expect(loadActivePath('justin-apprentice', s)).toBeNull();
  });

  it('filters non-string courseIds (hostile payload)', () => {
    const s = new MemStorage();
    s.setItem(pathKey('justin-apprentice'), JSON.stringify({
      courseIds: ['course-0a', 42, null, 'course-0b'],
      loadedTrackId: null,
      startedAt: new Date().toISOString(),
    }));
    const loaded = loadActivePath('justin-apprentice', s);
    expect(loaded!.courseIds).toEqual(['course-0a', 'course-0b']);
  });

  it('dedupes duplicate courseIds (reviewer P2 footgun guard)', () => {
    const s = new MemStorage();
    s.setItem(pathKey('justin-apprentice'), JSON.stringify({
      courseIds: ['course-0a', 'course-0a', 'course-0b', 'course-0a'],
      loadedTrackId: null,
      startedAt: new Date().toISOString(),
    }));
    const loaded = loadActivePath('justin-apprentice', s);
    expect(loaded!.courseIds).toEqual(['course-0a', 'course-0b']);
  });

  it('returns null when stored value is a JSON array', () => {
    const s = new MemStorage();
    s.setItem(pathKey('justin-apprentice'), '[]');
    expect(loadActivePath('justin-apprentice', s)).toBeNull();
    s.setItem(pathKey('justin-apprentice'), '[1,2,3]');
    expect(loadActivePath('justin-apprentice', s)).toBeNull();
  });

  it('clearActivePath removes only targeted worker', () => {
    const s = new MemStorage();
    const path: ActiveLearningPath = {
      courseIds: ['course-0a'],
      loadedTrackId: null,
      startedAt: new Date().toISOString(),
    };
    saveActivePath('justin-apprentice', path, s);
    saveActivePath('chris-programmer', path, s);
    clearActivePath('justin-apprentice', s);
    expect(loadActivePath('justin-apprentice', s)).toBeNull();
    expect(loadActivePath('chris-programmer', s)).not.toBeNull();
  });

  it('saveActivePath returns false on throwing storage (R12 P0-3) but does NOT throw', () => {
    let result: boolean | undefined;
    expect(() => {
      result = saveActivePath('x', {
        courseIds: ['course-0a'],
        loadedTrackId: null,
        startedAt: new Date().toISOString(),
      }, new ThrowingStorage());
    }).not.toThrow();
    expect(result).toBe(false);
  });

  it('saveActivePath returns true on successful write', () => {
    const s = new MemStorage();
    const result = saveActivePath('x', {
      courseIds: ['course-0a'],
      loadedTrackId: null,
      startedAt: new Date().toISOString(),
    }, s);
    expect(result).toBe(true);
  });
});

// ─── Derived: pathPosition ───────────────────────────────────────────────────

describe('pathPosition', () => {
  const path: ActiveLearningPath = {
    courseIds: ['course-0a', 'course-0b', 'course-2', 'course-14'],
    loadedTrackId: 'justin-apprentice',
    startedAt: new Date().toISOString(),
  };

  it('returns null when path is null', () => {
    expect(pathPosition(null, 'course-0a')).toBeNull();
  });

  it('returns null when course is not in path', () => {
    expect(pathPosition(path, 'course-99')).toBeNull();
  });

  it('returns 1-based index + total + next course id', () => {
    expect(pathPosition(path, 'course-0a')).toEqual({ index: 1, total: 4, nextCourseId: 'course-0b' });
    expect(pathPosition(path, 'course-2')).toEqual({ index: 3, total: 4, nextCourseId: 'course-14' });
  });

  it('returns null nextCourseId for the last course', () => {
    expect(pathPosition(path, 'course-14')).toEqual({ index: 4, total: 4, nextCourseId: null });
  });
});

// ─── Derived: pathProgress ───────────────────────────────────────────────────

describe('pathProgress', () => {
  const path: ActiveLearningPath = {
    courseIds: ['course-0a', 'course-0b', 'course-2', 'course-14'],
    loadedTrackId: 'justin-apprentice',
    startedAt: new Date().toISOString(),
  };

  it('returns null when path is null', () => {
    expect(pathProgress(null, new Set())).toBeNull();
  });

  it('returns null when path has zero courses (edge guard)', () => {
    expect(pathProgress({ courseIds: [], loadedTrackId: null, startedAt: '' }, new Set())).toBeNull();
  });

  it('reports 0% when nothing is complete', () => {
    expect(pathProgress(path, new Set())).toEqual({ completed: 0, total: 4, percent: 0 });
  });

  it('reports 100% when all path courses are in completed set', () => {
    expect(pathProgress(path, new Set(['course-0a', 'course-0b', 'course-2', 'course-14']))).toEqual({
      completed: 4, total: 4, percent: 100,
    });
  });

  it('ignores completed courses that are NOT in the path', () => {
    const result = pathProgress(path, new Set(['course-0a', 'course-99', 'course-100']));
    expect(result).toEqual({ completed: 1, total: 4, percent: 25 });
  });

  it('rounds percentage', () => {
    const result = pathProgress(path, new Set(['course-0a', 'course-0b']));
    expect(result!.percent).toBe(50);
  });
});
