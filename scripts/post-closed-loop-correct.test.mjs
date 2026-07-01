// Tests for post-closed-loop-correct.mjs — proves the loop CLOSES: a deviation drives a
// regeneration that scores better. Real spec, real verifier (R9).
import { describe, it, expect } from 'vitest';
import { deriveCorrections, applyCorrections, correctOnce, deriveSfcCorrections } from './post-closed-loop-correct.mjs';
import { parseNC } from './post-nc-conformance.mjs';
import * as spec from './lib/prism-base-job.mjs';

const RICH_OK = `O1002
G20 G17 G90 G94 G54
G91 G28 Z0.
T1 M06
S3000 M03
T2 M06
S6000 M03
T3 M06
S8000 M03
T4 M06
S4000 M03
G83 Z-0.5 R0.1 Q0.1 F12.
G80
M30`;

describe('deriveCorrections', () => {
  it('maps a spindle-speed deviation to a scoped tool correction', () => {
    const c = deriveCorrections([{ check: 'spindle-speed-T3', expected: 8000, actual: 5000 }]);
    expect(c).toEqual([{ type: 'spindle-speed', tool: 3, from: 5000, to: 8000 }]);
  });
  it('maps a units deviation to a G20 correction', () => {
    expect(deriveCorrections([{ check: 'units', expected: 'inch', actual: 'mm' }])).toEqual([{ type: 'units', to: 'G20', wrong: 'G21' }]);
  });
  it('ignores deviations it cannot deterministically fix (e.g. a missing tool)', () => {
    expect(deriveCorrections([{ check: 'tool-T3-present', expected: 'T3 called', actual: 'absent' }])).toEqual([]);
  });
});

describe('applyCorrections', () => {
  it('fixes the spindle speed in the RIGHT tool block only', () => {
    const bad = RICH_OK.replace('S8000 M03', 'S5000 M03');
    const { text, applied } = applyCorrections(bad, [{ type: 'spindle-speed', tool: 3, from: 5000, to: 8000 }]);
    const p = parseNC(text);
    expect(p.tools.find((t) => t.num === 3).speed).toBe(8000);
    expect(p.tools.find((t) => t.num === 2).speed).toBe(6000); // untouched
    expect(applied).toContain('T3 S5000→S8000');
  });
  it('rewrites G21 to G20', () => {
    const { text } = applyCorrections('G21 G17\nM30', [{ type: 'units', to: 'G20', wrong: 'G21' }]);
    expect(text).toContain('G20');
    expect(text).not.toContain('G21');
  });
  it('scales feeds in the block by the rpm ratio so chip load is preserved', () => {
    // T1 S3000 with two feed tiers; correct to S877 (ratio 877/3000 = 0.2923) → feeds scale too.
    const nc = 'O1\nT1 M06\nS3000 M03\nG01 X1 F600\nG01 X2 F2400\nT2 M06\nS6000 M03\nG01 X3 F900\nM30';
    const { text } = applyCorrections(nc, [{ type: 'spindle-speed', tool: 1, from: 3000, to: 877 }]);
    const ratio = 877 / 3000;
    expect(text).toMatch(new RegExp(`F${(600 * ratio).toFixed(3)}\\b`));   // entry feed scaled
    expect(text).toMatch(new RegExp(`F${(2400 * ratio).toFixed(3)}\\b`));  // cut feed scaled by same ratio
    expect(text).toContain('S877');
    // T2's feed (different block) is untouched
    expect(text).toContain('F900');
    // chip load preserved: scaled-feed / new-rpm == original-feed / original-rpm
    const fzOld = 600 / 3000, fzNew = (600 * ratio) / 877;
    expect(fzNew).toBeCloseTo(fzOld, 6);
  });
  it('does not scale feeds when scaleFeeds is false (speed-only correction)', () => {
    const nc = 'O1\nT1 M06\nS3000 M03\nG01 X1 F600\nM30';
    const { text } = applyCorrections(nc, [{ type: 'spindle-speed', tool: 1, from: 3000, to: 877, scaleFeeds: false }]);
    expect(text).toContain('F600');
    expect(text).toContain('S877');
  });
});

describe('deriveSfcCorrections — regenerate mills toward live SFC, skip the drill', () => {
  const leg = {
    ran: true,
    checks: [
      { tool: 1, ncRpm: 3000, sfcRpm: 877, deltaPct: 2.42, withinTol: false }, // 2" face mill — drift
      { tool: 2, ncRpm: 6000, sfcRpm: 5500, deltaPct: 0.09, withinTol: true },  // within tolerance — leave
      { tool: 4, ncRpm: 4000, sfcRpm: 7018, deltaPct: -0.43, withinTol: false }, // drill — must be skipped
    ],
  };
  it('corrects ONLY the drifting mill (T1), targeting the rounded SFC rpm', () => {
    const { corrections } = deriveSfcCorrections(leg, spec);
    // exactly one correction, for T1 — proves T2 (in-tol) and T4 (drill) were both excluded
    expect(corrections).toEqual([{ type: 'spindle-speed', tool: 1, from: 3000, to: 877 }]);
  });
  it('skips the drill (SFC drill op-path unreliable) and records exactly which + why', () => {
    const { skipped } = deriveSfcCorrections(leg, spec);
    expect(skipped.map((s) => s.tool)).toEqual([4]);
    expect(skipped[0].reason).toMatch(/drill/);
  });
  it('returns empty corrections+skipped when the SFC leg did not run', () => {
    expect(deriveSfcCorrections({ ran: false }, spec)).toEqual({ corrections: [], skipped: [] });
  });
  it('the derived correction actually lowers the NC speed to the SFC rpm when applied', () => {
    const nc = 'O1\nG20 G54\nT1 M06\nS3000 M03\nM30';
    const { corrections } = deriveSfcCorrections(leg, spec);
    const { text } = applyCorrections(nc, corrections);
    expect(parseNC(text).tools.find((t) => t.num === 1).speed).toBe(877);
  });
});

describe('correctOnce — the loop closes and improves', () => {
  it('lifts a wrong-rpm NC from <100% to 100% (deviation → corrected generation)', () => {
    const bad = RICH_OK.replace('S8000 M03', 'S5000 M03');
    const r = correctOnce(bad, spec, 'rich');
    expect(r.before.ok).toBe(false);
    expect(r.before.score).toBeLessThan(1);
    expect(r.after.ok).toBe(true);
    expect(r.after.score).toBe(1);
    expect(r.improved).toBe(true);
    // the corrected NC genuinely carries the fixed value
    expect(parseNC(r.correctedText).tools.find((t) => t.num === 3).speed).toBe(8000);
  });
  it('improves a units-bug NC (G21 → G20)', () => {
    const bad = RICH_OK.replace('G20 G17 G90 G94 G54', 'G21 G17 G90 G94 G54');
    const r = correctOnce(bad, spec, 'rich');
    expect(r.before.checks.find((c) => c.name === 'units').pass).toBe(false);
    expect(r.after.checks.find((c) => c.name === 'units').pass).toBe(true);
    expect(r.improved).toBe(true);
  });
  it('fixes multiple deviations in one pass (wrong rpm AND wrong WCS)', () => {
    let bad = RICH_OK.replace('S6000 M03', 'S9000 M03').replace('G94 G54', 'G94 G55');
    const r = correctOnce(bad, spec, 'rich');
    expect(r.after.score).toBe(1);
    expect(parseNC(r.correctedText).tools.find((t) => t.num === 2).speed).toBe(6000);
    expect(parseNC(r.correctedText).wcs).toBe('G54');
  });
  it('is a no-op on an already-conforming NC (nothing to improve)', () => {
    const r = correctOnce(RICH_OK, spec, 'rich');
    expect(r.before.ok).toBe(true);
    expect(r.improved).toBe(false);
    expect(r.applied).toEqual([]);
  });
});
