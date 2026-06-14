// Tests for post-closed-loop-tick.mjs — uses real conformance results (not mocked). R9.
import { describe, it, expect } from 'vitest';
import { buildLedgerEntry, describeSignal } from './post-closed-loop-tick.mjs';
import { parseNC, checkConformance } from './post-nc-conformance.mjs';
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

const FIXED_TS = '2026-05-31T00:00:00.000Z';

describe('buildLedgerEntry', () => {
  it('records a perfect generation with no deviations', () => {
    const result = checkConformance(parseNC(RICH_OK), spec, 'rich');
    result.file = 'RICH.nc';
    const e = buildLedgerEntry(result, FIXED_TS, { file: 'RICH.nc' });
    expect(e.conforming).toBe(true);
    expect(e.score).toBe(1);
    expect(e.deviations).toEqual([]);
    expect(e.ts).toBe(FIXED_TS);
    expect(e.program).toBe('rich');
  });
  it('captures the exact (check, expected, actual) deviation as the training signal', () => {
    const bad = RICH_OK.replace('S8000 M03', 'S5000 M03'); // T3 wrong rpm
    const result = checkConformance(parseNC(bad), spec, 'rich');
    const e = buildLedgerEntry(result, FIXED_TS);
    expect(e.conforming).toBe(false);
    const dev = e.deviations.find((d) => d.check === 'spindle-speed-T3');
    expect(dev.expected).toBe(8000);
    expect(dev.actual).toBe(5000);
  });
  it('marks the generator source (pre-generated until the MCP post leg feeds live)', () => {
    const result = checkConformance(parseNC(RICH_OK), spec, 'rich');
    expect(buildLedgerEntry(result, FIXED_TS).generator).toBe('pre-generated');
    expect(buildLedgerEntry(result, FIXED_TS, { generator: 'mcp-live' }).generator).toBe('mcp-live');
  });
});

describe('describeSignal', () => {
  it('reports a conforming tick as needing no correction', () => {
    const result = checkConformance(parseNC(RICH_OK), spec, 'rich');
    const msg = describeSignal(buildLedgerEntry(result, FIXED_TS));
    expect(msg).toMatch(/conforming/);
    expect(msg).toMatch(/100%/);
  });
  it('lists each deviation so the next generation knows what to fix', () => {
    const bad = RICH_OK.replace('G20', 'G21'); // units wrong
    const result = checkConformance(parseNC(bad), spec, 'rich');
    const msg = describeSignal(buildLedgerEntry(result, FIXED_TS));
    expect(msg).toMatch(/deviation/);
    expect(msg).toMatch(/units/);
  });
});
