/**
 * Feature Flags Tests — U-LPR07 LATHE-PROD-READY-MS0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('featureFlags', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('defaults UNIFIED_STORE to false', async () => {
    const { featureFlags } = await import('../../stores/featureFlags');
    expect(featureFlags.UNIFIED_STORE).toBe(false);
  });

  it('reads flags from localStorage', async () => {
    localStorage.setItem('prism_feature_flags', JSON.stringify({ UNIFIED_STORE: true }));
    const { featureFlags } = await import('../../stores/featureFlags');
    expect(featureFlags.UNIFIED_STORE).toBe(true);
  });

  it('setFeatureFlag updates localStorage', async () => {
    const { setFeatureFlag } = await import('../../stores/featureFlags');
    setFeatureFlag('UNIFIED_STORE', true);
    const stored = JSON.parse(localStorage.getItem('prism_feature_flags') || '{}');
    expect(stored.UNIFIED_STORE).toBe(true);
  });

  it('useUnifiedStore returns flag value', async () => {
    const { useUnifiedStore, setFeatureFlag } = await import('../../stores/featureFlags');
    expect(useUnifiedStore()).toBe(false);
    setFeatureFlag('UNIFIED_STORE', true);
    expect(useUnifiedStore()).toBe(true);
  });

  it('handles malformed localStorage gracefully', async () => {
    localStorage.setItem('prism_feature_flags', 'not-json');
    const { featureFlags } = await import('../../stores/featureFlags');
    expect(featureFlags.UNIFIED_STORE).toBe(false);
  });
});
