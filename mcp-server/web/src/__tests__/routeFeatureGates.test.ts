/**
 * QX8 route-entitlement gating invariant (U-Q-FEATURE-PAGE-GATES).
 *
 * Binds the live App.tsx route table to the canonical entitlement matrix so a
 * future edit cannot silently:
 *   - drop a paid feature page's gate (revenue leak),
 *   - gate it with the wrong FeatureKey (wrong upgrade prompt / wrong tier),
 *   - or over-gate a FREE / NOT-YET-LIVE / safety / kiosk route (launch blocker:
 *     a gated quoting/erp route renders an UpgradePrompt for EVERY plan incl
 *     enterprise; a gated shop-floor page walls a machine operator).
 *
 * The test reads App.tsx source (not a render) -- App lazy-imports ~100 pages,
 * so a full-render gate test would be heavy + flaky. Source assertions on the
 * one-line <Route> declarations are exact and stable.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  ENTITLEMENT_MATRIX,
  FEATURE_NOT_YET_LIVE,
  type FeatureKey,
} from '../data/pricing';

const here = dirname(fileURLToPath(import.meta.url));
const APP_SRC = readFileSync(resolve(here, '../App.tsx'), 'utf8');

/**
 * The authoritative gate registry: route path -> the FeatureKey it must be
 * wrapped with. Verified against the entitlement matrix + adversarial review
 * (over-gate / under-gate lenses) before shipping QX8.
 */
const EXPECTED_GATES: ReadonlyArray<readonly [string, FeatureKey]> = [
  // post-processor generator (shipped earlier in U-Q-PPG-GATE -- protected here)
  ['ppg', 'post.generate'],
  ['ppg-lite', 'post.generate'],
  // print-to-CNC program release (pro+)
  ['print-to-cnc', 'print_to_cnc'],
  // the 3 wizards (pro+), every sub-route gated so a free user cannot deep-link
  ['lathe', 'wizard.lathe'],
  ['lathe/wizard', 'wizard.lathe'],
  ['lathe/results', 'wizard.lathe'],
  ['milling', 'wizard.mill'],
  ['milling/wizard', 'wizard.mill'],
  ['milling/results', 'wizard.mill'],
  ['wire-edm', 'wizard.wedm'],
  ['wire-edm/wizard', 'wizard.wedm'],
  ['wire-edm/results', 'wizard.wedm'],
  // CAD/CAM AI (shop+)
  ['cam-strategy', 'cadcam'],
  ['cam-ai-dashboard', 'cadcam'], // FeatureGate sits INSIDE secure(lead)
  // SFC vibration / stability-lobe analysis (starter+) -- F2: was an ungated
  // revenue leak (sfc.sld, a paid feature, reachable by free users). Gated to
  // the SLD/chatter backend's matrix key so it matches the starter+ ceiling.
  ['vibration', 'sfc.sld'],
  // SFC vendor tri-compare (starter+) -- F1: PRISM vs HSMAdvisor vs G-Wizard parity.
  // The backend (speed_feed_tri_compare) existed but had no FE; this page is now the
  // sfc.vendor_parity surface and must be gated to match its starter+ matrix ceiling.
  ['vendor-compare', 'sfc.vendor_parity'],
];

/**
 * Routes that MUST stay open (never wrapped in a FeatureGate). Each is a launch
 * blocker if gated: free-capped SFC, NOT-YET-LIVE quoting/erp (would lock out
 * every plan), shop-floor/safety/kiosk (operator must never hit an upgrade
 * wall), and the process/studio pages that carry no matrix key.
 */
const MUST_STAY_OPEN: readonly string[] = [
  // SFC -- sfc.basic is free (10/day); the cap is enforced in-component via 403
  'speed-feed-calc',
  'calculator',
  'speed-feed',
  // NOT-YET-LIVE -- canUseFeature() denies for ALL plans incl enterprise
  'quote-builder',
  'blueprint-quote',
  'sheet-metal',
  'additive',
  'injection-mold',
  'erp',
  'cost-estimator',
  // shop-floor / safety / kiosk -- operator-facing, never plan-walled
  'shop-live',
  'shop-clock',
  'shop-dashboard',
  'machine-live',
  'telemetry',
  'safety',
  'safety-dashboard',
  'alarms',
  'employee',
  'shop-tv',
  // process / studio pages with no matrix key
  'wire-edm-studio',
  'ai-learning',
  'turning',
  'toolpath',
  'viewer',
  'prove-out',
];

/** Every <Route path="X"> line in App.tsx (X exact, including the closing quote). */
function routeLines(path: string): string[] {
  const needle = `path="${path}"`;
  return APP_SRC.split('\n').filter((line) => line.includes(needle));
}

/** Distinct feature keys actually wired into <FeatureGate feature="X"> in App.tsx. */
function gatedKeysInSource(): string[] {
  const re = /<FeatureGate\s+feature="([^"]+)"/g;
  const keys = new Set<string>();
  for (const match of APP_SRC.matchAll(re)) keys.add(match[1]);
  return [...keys];
}

/** A feature is PAID iff its free-plan ceiling is not granted (false / 0). */
function isPaid(key: FeatureKey): boolean {
  const free = ENTITLEMENT_MATRIX[key]?.free;
  if (typeof free === 'number') return free === 0;
  return free === false;
}

describe('QX8 route-entitlement gating invariant (App.tsx <-> pricing matrix)', () => {
  it('every expected paid route is wrapped with its exact FeatureKey', () => {
    const missing: string[] = [];
    for (const [path, key] of EXPECTED_GATES) {
      const lines = routeLines(path);
      // the route must exist...
      expect(lines.length, `route path="${path}" not found in App.tsx`).toBeGreaterThan(0);
      // ...and at least one declaration of it must carry the exact gate.
      const gated = lines.some((line) => line.includes(`<FeatureGate feature="${key}">`));
      if (!gated) missing.push(`${path} -> ${key}`);
    }
    expect(missing, `routes missing their gate: ${missing.join(', ')}`).toEqual([]);
  });

  it('every FeatureKey used as a gate is real, PAID, and live (no free/not-yet-live over-gate)', () => {
    const keys = gatedKeysInSource();
    expect(keys.length, 'expected at least the QX7+QX8 gates to be present').toBeGreaterThanOrEqual(5);
    for (const key of keys) {
      expect(key in ENTITLEMENT_MATRIX, `gate key "${key}" is not a real FeatureKey`).toBe(true);
      const fk = key as FeatureKey;
      expect(isPaid(fk), `gate key "${key}" is free for everyone -- gating it is pointless/wrong`).toBe(true);
      expect(
        fk in FEATURE_NOT_YET_LIVE,
        `gate key "${key}" is NOT-YET-LIVE -- gating its route locks out EVERY plan incl enterprise`,
      ).toBe(false);
    }
  });

  it('safety / kiosk / SFC / not-yet-live routes are never wrapped in a FeatureGate', () => {
    const overGated: string[] = [];
    for (const path of MUST_STAY_OPEN) {
      for (const line of routeLines(path)) {
        if (line.includes('<FeatureGate')) overGated.push(path);
      }
    }
    expect(overGated, `these must stay open but are gated: ${overGated.join(', ')}`).toEqual([]);
  });

  it('does not gate the SFC calculator route (free tier is the funnel entry)', () => {
    // sfc.basic free=10 -- a free user MUST reach the calculator (capped in-component).
    expect(ENTITLEMENT_MATRIX['sfc.basic'].free).toBe(10);
    const sfcGated = routeLines('speed-feed-calc').some((line) => line.includes('<FeatureGate'));
    expect(sfcGated).toBe(false);
  });

  it('quoting + erp remain NOT-YET-LIVE so their routes are correctly ungated', () => {
    // Guards the reasoning behind leaving quoting/erp routes open: if either is
    // ever marked live, this test flips and forces a deliberate gating decision.
    expect('quoting' in FEATURE_NOT_YET_LIVE).toBe(true);
    expect('erp' in FEATURE_NOT_YET_LIVE).toBe(true);
    expect(routeLines('erp').some((line) => line.includes('<FeatureGate'))).toBe(false);
    expect(routeLines('quote-builder').some((line) => line.includes('<FeatureGate'))).toBe(false);
  });
});
