/**
 * Index funnel routing invariant (LAUNCH-FE, 2026-06-23, slot:quebec).
 * selectIndexPage decides what "/" shows. The launch-critical case: an anonymous
 * visitor must land on the PUBLIC marketing page, never the internal employee
 * workspace picker. Pure -- no render, no DOM.
 */
import { describe, it, expect } from 'vitest';
import { selectIndexPage } from '../pages/IndexGateway';

describe('selectIndexPage (root "/" funnel routing)', () => {
  it('anonymous visitor (no auth context) -> public landing', () => {
    expect(selectIndexPage(null)).toBe('landing');
  });

  it('auth still loading -> loading (no landing->shell flash for a returning user)', () => {
    expect(selectIndexPage({ isLoading: true })).toBe('loading');
  });

  it('signed-in user -> the internal shell gateway', () => {
    expect(selectIndexPage({ isLoading: false, isAuthenticated: true })).toBe('shell');
  });

  it('resolved + NOT authenticated -> public landing (the funnel entry)', () => {
    expect(selectIndexPage({ isLoading: false, isAuthenticated: false })).toBe('landing');
  });
});
