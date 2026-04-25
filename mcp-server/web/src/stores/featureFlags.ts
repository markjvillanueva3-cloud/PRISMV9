/**
 * Feature Flags — U-LPR07 LATHE-PROD-READY-MS0
 *
 * Feature flags for gradual rollout of new features.
 * UNIFIED_STORE: Zustand store migration (default OFF, 7-day A/B rollout)
 */

export interface FeatureFlags {
  UNIFIED_STORE: boolean;
}

const FLAG_STORAGE_KEY = 'prism_feature_flags';

function getStoredFlags(): Partial<FeatureFlags> {
  try {
    const stored = localStorage.getItem(FLAG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function getUrlFlags(): Partial<FeatureFlags> {
  const params = new URLSearchParams(window.location.search);
  const flags: Partial<FeatureFlags> = {};
  if (params.has('unified_store')) {
    flags.UNIFIED_STORE = params.get('unified_store') === 'true';
  }
  return flags;
}

const defaults: FeatureFlags = {
  UNIFIED_STORE: false,
};

const stored = getStoredFlags();
const url = getUrlFlags();

export const featureFlags: FeatureFlags = {
  ...defaults,
  ...stored,
  ...url,
};

export function setFeatureFlag<K extends keyof FeatureFlags>(
  key: K,
  value: FeatureFlags[K]
): void {
  const current = getStoredFlags();
  current[key] = value;
  localStorage.setItem(FLAG_STORAGE_KEY, JSON.stringify(current));
  (featureFlags as FeatureFlags)[key] = value;
}

export function useUnifiedStore(): boolean {
  return featureFlags.UNIFIED_STORE;
}
