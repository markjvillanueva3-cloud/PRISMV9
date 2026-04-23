/**
 * Bundle Budget Script Tests
 * @milestone LATHE-PROD-READY-MS0 U-LPR-BUNDLE-GATE
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('BundleBudgetScript', () => {
  const SCRIPT_PATH = join(process.cwd(), 'scripts', 'check-bundle-budget.mjs');
  const BASELINE_PATH = join(process.cwd(), 'data', 'state', 'BUNDLE_BASELINE.json');

  it('script file exists', () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true);
  });

  it('baseline file exists', () => {
    expect(existsSync(BASELINE_PATH)).toBe(true);
  });

  it('baseline has required schema', async () => {
    const baseline = await import(BASELINE_PATH, { with: { type: 'json' } });
    const data = baseline.default;

    expect(data.schemaVersion).toBe(1);
    expect(data.timestamp).toBeDefined();
    expect(data.chunks).toBeDefined();
    expect(typeof data.chunks).toBe('object');
    expect(data.budgets).toBeDefined();
  });

  it('baseline budgets match spec', async () => {
    const baseline = await import(BASELINE_PATH, { with: { type: 'json' } });
    const data = baseline.default;

    expect(data.budgets.main).toBe('250KB gzip');
    expect(data.budgets['lathe-studio']).toBe('40KB gzip initial');
    expect(data.budgets.monaco).toBe('600KB gzip (excluded from main gate)');
    expect(data.budgets['shared-delta']).toBe('5KB max increase per PR');
  });
});
