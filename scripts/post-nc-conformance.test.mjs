// Tests for post-nc-conformance.mjs — uses the REAL job spec (prism-base-job.mjs), not a mock.
// Real-value assertions (R9): a check passes/fails for the right semantic reason.
import { describe, it, expect } from 'vitest';
import { stripComment, parseNC, checkConformance, operationFor, checkStructural } from './post-nc-conformance.mjs';
import * as spec from './lib/prism-base-job.mjs';

describe('checkStructural — generic gate for matrix/training NC (P1-d)', () => {
  const SINGLE_OP = `O2025 (PRISM GENERATED)
G21 (METRIC)
(SAFE START)
G90 G17 G40 G49 G80
G54 (WORK OFFSET)
G91 G28 Z0 (Z RETRACT)
T1 M06 (50MM FACE)
S877 M03
G43 H1
G00 X0 Y0
G01 X100 F200
G91 G28 Z0
G28 X0 Y0
M30`;
  it('PASSES a sound single-op program the golden check would reject', () => {
    const r = checkStructural(parseNC(SINGLE_OP));
    expect(r.ok).toBe(true);
    expect(r.score).toBe(1);
    expect(checkConformance(parseNC(SINGLE_OP), spec, 'rich').ok).toBe(false); // golden false-fails it
  });
  it('FAILS a program missing M30', () => {
    expect(checkStructural(parseNC(SINGLE_OP.replace('\nM30', ''))).checks.find((c) => c.name === 'program-end').pass).toBe(false);
  });
  it('FAILS a tool with no spindle speed', () => {
    expect(checkStructural(parseNC(SINGLE_OP.replace('S877 M03\n', ''))).checks.find((c) => c.name === 'every-tool-has-spindle').pass).toBe(false);
  });
  it('FAILS when no work offset present', () => {
    expect(checkStructural(parseNC(SINGLE_OP.replace('G54 (WORK OFFSET)\n', ''))).checks.find((c) => c.name === 'work-offset-present').pass).toBe(false);
  });
  it('enforces units-match when expectUnits given (G21 program vs inch)', () => {
    expect(checkStructural(parseNC(SINGLE_OP), { expectUnits: 'inch' }).checks.find((c) => c.name === 'units-match').pass).toBe(false);
  });
  it('accepts extended WCS G54.1 as a valid work offset', () => {
    expect(checkStructural(parseNC(SINGLE_OP.replace('G54 (WORK OFFSET)', 'G54.1 P3'))).checks.find((c) => c.name === 'work-offset-present').pass).toBe(true);
  });
  it('accepts Okuma OSP G15 H# work offset (not Fanuc G54-G59) — dialect-clean Okuma must not false-fail', () => {
    const okuma = parseNC(SINGLE_OP.replace('G54 (WORK OFFSET)', 'G15 H1 (WORK OFFSET)'));
    expect(okuma.wcs).toBe('G15 H1');
    expect(checkStructural(okuma).checks.find((c) => c.name === 'work-offset-present').pass).toBe(true);
  });
});

// A faithful slice of the RICH program: O-number, G20 inch, G54, T1-T4 with their spec rpm,
// a G28 retract, a G83 drill cycle under T4, and an M30 end.
const RICH_OK = `(PRISM BASE - HURCO VM 3-AXIS standalone)
O1002
G20 G17 G90 G94 G54
G91 G28 Z0.
G90
(OP - T1 D2)
T1 M06
S3000 M03
G43 Z25. H1
(OP - T2)
T2 M06
S6000 M03
G43 Z25. H2
(OP - T3)
T3 M06
S8000 M03
G43 Z25. H3
(OP - T4 drill)
T4 M06
S4000 M03
G43 Z25. H4
G83 Z-0.5 R0.1 Q0.1 F12.
G80
M30`;

describe('stripComment', () => {
  it('removes an inline paren comment but keeps the code', () => {
    expect(stripComment('T1 M06 (face mill)')).toBe('T1 M06');
  });
  it('removes a pure-comment line to empty', () => {
    expect(stripComment('(OP - T1 D2)')).toBe('');
  });
});

describe('parseNC', () => {
  const p = parseNC(RICH_OK);
  it('extracts the O-number, units, and work offset', () => {
    expect(p.oNumber).toBe('1002');
    expect(p.units).toBe('inch');
    expect(p.wcs).toBe('G54');
  });
  it('captures all four tools in call order with their spindle speeds', () => {
    expect(p.tools.map((t) => t.num)).toEqual([1, 2, 3, 4]);
    expect(p.tools.map((t) => t.speed)).toEqual([3000, 6000, 8000, 4000]);
  });
  it('associates the G83 cycle with T4 (the drill), not earlier tools', () => {
    expect(p.tools.find((t) => t.num === 4).cycles).toContain('G83');
    expect(p.tools.find((t) => t.num === 1).cycles).toEqual([]);
  });
  it('flags the safe retract and program end', () => {
    expect(p.hasRetract).toBe(true);
    expect(p.hasEnd).toBe(true);
  });
  it('does not mistake a comment T-word for a tool call', () => {
    const p2 = parseNC('(T9 is a typo in a comment)\nO1\nT2 M06\nS6000 M03\nM30');
    expect(p2.tools.map((t) => t.num)).toEqual([2]);
  });
});

describe('checkConformance (rich) — conforming NC scores 100%', () => {
  const r = checkConformance(parseNC(RICH_OK), spec, 'rich');
  it('passes every check', () => {
    const fails = r.checks.filter((c) => !c.pass).map((c) => c.name);
    expect(fails).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.score).toBe(1);
  });
  it('the core spindle-speed checks compare emitted S to spec rpm', () => {
    const s1 = r.checks.find((c) => c.name === 'spindle-speed-T1');
    expect(s1.expected).toBe(3000);
    expect(s1.actual).toBe(3000);
    expect(s1.pass).toBe(true);
  });
});

describe('checkConformance catches real defects', () => {
  it('FAILs the spindle-speed check when the post emits a wrong rpm (drift from SFC math)', () => {
    const bad = RICH_OK.replace('S8000 M03', 'S5000 M03'); // T3 should be 8000
    const r = checkConformance(parseNC(bad), spec, 'rich');
    const s3 = r.checks.find((c) => c.name === 'spindle-speed-T3');
    expect(s3.pass).toBe(false);
    expect(s3.expected).toBe(8000);
    expect(s3.actual).toBe(5000);
    expect(r.ok).toBe(false);
  });
  it('FAILs units when the post emits G21 (the 25.4x scale-error class)', () => {
    const bad = RICH_OK.replace('G20 G17 G90 G94 G54', 'G21 G17 G90 G94 G54');
    const r = checkConformance(parseNC(bad), spec, 'rich');
    expect(r.checks.find((c) => c.name === 'units').pass).toBe(false);
  });
  it('FAILs tool-present when a required tool is missing from the program', () => {
    const bad = RICH_OK.replace(/\(OP - T3\)\nT3 M06\nS8000 M03\nG43 Z25. H3\n/, '');
    const r = checkConformance(parseNC(bad), spec, 'rich');
    expect(r.checks.find((c) => c.name === 'tool-T3-present').pass).toBe(false);
  });
  it('FAILs no-unexpected-tools when an off-spec tool sneaks in', () => {
    const bad = RICH_OK.replace('M30', 'T7 M06\nS1000 M03\nM30');
    const r = checkConformance(parseNC(bad), spec, 'rich');
    expect(r.checks.find((c) => c.name === 'no-unexpected-tools').pass).toBe(false);
  });
  it('FAILs the drill canned-cycle check when the G83 is dropped', () => {
    const bad = RICH_OK.replace('G83 Z-0.5 R0.1 Q0.1 F12.\n', '');
    const r = checkConformance(parseNC(bad), spec, 'rich');
    expect(r.checks.find((c) => c.name === 'drill-T4-canned-cycle').pass).toBe(false);
  });
});

describe('operationFor (tool type → SFC operation keyword)', () => {
  it('maps a face mill to a face operation', () => {
    expect(operationFor('face mill')).toBe('face');
  });
  it('maps a drill to a drill operation', () => {
    expect(operationFor('drill')).toBe('drill');
  });
  it('maps end mills to slot (pocket roughing/finishing)', () => {
    expect(operationFor('flat end mill')).toBe('slot');
  });
});

describe('checkConformance throws on an unknown program', () => {
  it('lists the known programs', () => {
    expect(() => checkConformance(parseNC(RICH_OK), spec, 'nope')).toThrow(/unknown program 'nope'.*rich/s);
  });
});
