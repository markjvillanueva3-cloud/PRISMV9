/**
 * Tailwind `primary` color-token invariant (LAUNCH-FE, 2026-06-23, slot:quebec).
 *
 * Binds the live src/ usage of `*-primary[-NNN]` utility classes to the
 * tailwind.config.js color definition so a regression cannot recur where:
 *   - the `primary` color key is missing/renamed (every primary CTA renders with
 *     NO background -- the exact defect this fixes: the shared <Button> primary
 *     variant + 31 components reference bg-/text-/ring-/border-/from-/to-primary),
 *   - a component starts using a primary-NNN shade the config does not define
 *     (that one class silently emits no CSS),
 *   - `primary` drifts away from the `prism` brand-blue scale it aliases.
 *
 * In the spirit of routeFeatureGates.test.ts: reads live source + the config
 * (not a render), so it is exact and stable. No network, no DOM.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
// @ts-ignore -- tailwind.config.js is plain ESM config (no .d.ts); shape asserted at runtime.
import tailwindConfig from '../../tailwind.config.js';

const here = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = resolve(here, '..');

/** The canonical Kienzle brand-blue 600 (the shared <Button> primary fill). */
const BRAND_600 = '#4c6ef5';
/** The 950 extension shade added for from-/to-primary-950 usage. */
const BRAND_950 = '#2a3a94';

const colors = (tailwindConfig as { theme: { extend: { colors: Record<string, unknown> } } })
  .theme.extend.colors;
const primary = colors.primary as Record<string, string> | undefined;
const prism = colors.prism as Record<string, string> | undefined;

/**
 * Every Tailwind utility prefix that can target a color in this codebase. The
 * `(?<![\w-])` left boundary excludes CSS custom properties (`var(--bg-primary)`)
 * and word-run false positives so only real utility classes are counted.
 */
const PRIMARY_CLASS_RE =
  /(?<![\w-])(?:bg|text|border|ring|from|to|via|divide|outline|fill|stroke|caret|ring-offset|shadow)-primary(?:-(\d{2,3}))?\b/g;

/** Recursively collect every .ts/.tsx file under src. */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Scan all src for primary-class usage -> { shades used, whether bare primary used }. */
function scanPrimaryUsage(): { shades: Set<string>; usesBare: boolean; fileCount: number } {
  const shades = new Set<string>();
  let usesBare = false;
  let fileCount = 0;
  for (const file of collectSourceFiles(SRC_ROOT)) {
    const text = readFileSync(file, 'utf8');
    let hit = false;
    for (const m of text.matchAll(PRIMARY_CLASS_RE)) {
      hit = true;
      if (m[1]) shades.add(m[1]);
      else usesBare = true;
    }
    if (hit) fileCount += 1;
  }
  return { shades, usesBare, fileCount };
}

const usage = scanPrimaryUsage();

describe('tailwind primary color token (config <-> live usage)', () => {
  it('the `primary` color key exists and DEFAULT is the brand-600 blue', () => {
    expect(primary?.DEFAULT, 'theme.extend.colors.primary.DEFAULT must be the brand 600 (#4c6ef5)').toBe(BRAND_600);
  });

  it('primary classes are actually used across the app (guards a vacuous pass)', () => {
    // The defect was real and broad; assert usage stays substantial so this
    // invariant cannot pass vacuously after a refactor silently drops the classes.
    expect(usage.fileCount, 'expected many components to use primary-* classes').toBeGreaterThanOrEqual(20);
    expect(usage.shades.size, 'expected several distinct primary shades in use').toBeGreaterThanOrEqual(8);
  });

  it('every primary-NNN shade used in src is defined in the config', () => {
    const missing = [...usage.shades].filter((shade) => !(primary && shade in primary));
    expect(missing, `primary shades referenced in src but missing from config: ${missing.join(', ')}`).toEqual([]);
  });

  it('primary.DEFAULT backs any bare `bg-primary` / `text-primary` usage', () => {
    // All real primary usage today is shaded (`-primary-NNN`); DEFAULT is still
    // defined so a future bare utility class resolves to the brand 600.
    if (usage.usesBare) {
      expect(primary?.DEFAULT, 'a bare *-primary class is used but primary.DEFAULT is not the brand 600').toBe(BRAND_600);
    }
    expect(primary?.DEFAULT, 'primary.DEFAULT must be the brand 600 for bare-class safety').toBe(BRAND_600);
  });

  it('exposes the full standard scale (50..950, with 950 in live use) + DEFAULT', () => {
    const required = ['DEFAULT', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
    const absent = required.filter((k) => !(primary && k in primary));
    expect(absent, `primary scale is incomplete: ${absent.join(', ')}`).toEqual([]);
    expect(primary?.['950'], 'primary-950 must be the brand 950 extension').toBe(BRAND_950);
  });

  it('primary tracks the `prism` brand-blue scale (alias intent, no drift)', () => {
    // prism is the brand source; primary aliases it. Every shared numeric shade
    // must be byte-identical so the two never diverge silently.
    expect(prism?.['600'], 'prism-600 must be the canonical brand blue').toBe(BRAND_600);
    for (const shade of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
      expect(primary?.[shade], `primary-${shade} must equal prism-${shade} (brand alias)`).toBe(prism?.[shade]);
    }
    expect(primary?.DEFAULT, 'primary DEFAULT must equal prism-600').toBe(prism?.['600']);
  });
});
