// Tests for cheap-cps-validate.mjs — hermetic (temp fs + injected child-proc runner). Real-value (R9).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sampleNcFiles, detectUnits, validateSample } from './cheap-cps-validate.mjs';

describe('detectUnits — UNITS FIRST (never assume; 25.4x guard)', () => {
  it('reads inch from G20', () => { expect(detectUnits('O1\nG20 G17\nM30')).toBe('inch'); });
  it('reads mm from G21', () => { expect(detectUnits('O1\nG21\nM30')).toBe('mm'); });
  it('returns unknown when neither is declared', () => { expect(detectUnits('O1\nT1 M06\nM30')).toBe('unknown'); });
  it('does not mistake G200/G210 for a units word', () => { expect(detectUnits('O1\nG200\nM30')).toBe('unknown'); });
});

describe('sampleNcFiles — deterministic, capped, recursive', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cheap-cps-'));
    writeFileSync(join(dir, 'a.nc'), 'O1\nM30');
    writeFileSync(join(dir, 'b.min'), 'O2\nM30');
    writeFileSync(join(dir, 'readme.txt'), 'not nc');           // ignored (not an NC ext)
    mkdirSync(join(dir, 'sub'));
    writeFileSync(join(dir, 'sub', 'c.eia'), 'O3\nM30');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('finds NC files (nc/min/eia) and skips non-NC, recursing into subdirs', () => {
    const got = sampleNcFiles(dir, 20).map((p) => p.split(/[\\/]/).pop()).sort();
    expect(got).toEqual(['a.nc', 'b.min', 'c.eia']);
  });
  it('honors the limit (shallow files first, before recursing)', () => {
    const got = sampleNcFiles(dir, 2);
    expect(got.length).toBe(2);
    expect(got.every((p) => /a\.nc|b\.min/.test(p))).toBe(true); // shallow dir drained first
  });
  it('returns empty for a missing dir (no throw)', () => {
    expect(sampleNcFiles(join(dir, 'nope'), 5)).toEqual([]);
  });
});

describe('validateSample — composes lint + structural into a per-controller cheap-version scorecard', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cheap-val-'));
    writeFileSync(join(dir, 'clean.nc'), 'O1\nG20 (INCH)\nM30');     // inch
    writeFileSync(join(dir, 'dirty.nc'), 'O2\nG21\nM30');            // mm + (mock) lint error
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  // run() distinguishes lint (--dialect) from structural (--structural). clean.nc passes; dirty.nc has a lint ERROR.
  const run = (script, args) => {
    const file = args[0];
    if (args.includes('--structural')) return { code: 0, stdout: JSON.stringify({ passed: 7, total: 7, checks: [] }), stderr: '' };
    const isDirty = /dirty/.test(file);
    return { code: isDirty ? 1 : 0, stdout: JSON.stringify({ results: [{ findings: isDirty ? [{ severity: 'ERROR', rule: 'x' }] : [], counts: { ERROR: isDirty ? 1 : 0, WARN: 1 } }] }), stderr: '' };
  };

  it('scores a clean file as passing and a lint-error file as a deviation, with a units census', () => {
    const files = [join(dir, 'clean.nc'), join(dir, 'dirty.nc')];
    const card = validateSample(files, 'haas', { run });
    expect(card.sampled).toBe(2);
    expect(card.passed).toBe(1);
    expect(card.perfect).toBe(false);
    expect(card.units).toMatchObject({ inch: 1, mm: 1, unknown: 0 });
    expect(card.deviations.find((d) => /dirty/.test(d.job)).lintErrors).toBe(1);
  });
  it('a dialect-clean file with INCOMPLETE structure PASSES (dialect gate) but is a structural ADVISORY, not a deviation', () => {
    // subprogram-like: 0 dialect errors, but structural 4/7 (missing main-program invariants)
    const subRun = (s, a) => a.includes('--structural')
      ? { code: 0, stdout: JSON.stringify({ passed: 4, total: 7, checks: [{ name: 'units-declared', pass: false }, { name: 'program-end', pass: false }] }), stderr: '' }
      : { code: 0, stdout: JSON.stringify({ results: [{ findings: [], counts: { ERROR: 0, WARN: 1 } }] }), stderr: '' };
    const card = validateSample([join(dir, 'clean.nc')], 'haas', { run: subRun });
    expect(card.passed).toBe(1);              // dialect-clean → passes the hard gate
    expect(card.deviations.length).toBe(0);   // NOT a dialect deviation
    expect(card.structuralComplete).toBe(0);  // but structurally incomplete
    expect(card.structuralAdvisories[0].failedStructural).toContain('units-declared'); // surfaced as advisory
  });
  it('marks a sample PERFECT when every file is clean + structurally sound', () => {
    const cleanRun = (s, a) => a.includes('--structural')
      ? { code: 0, stdout: JSON.stringify({ passed: 7, total: 7, checks: [] }), stderr: '' }
      : { code: 0, stdout: JSON.stringify({ results: [{ findings: [], counts: { ERROR: 0, WARN: 0 } }] }), stderr: '' };
    const card = validateSample([join(dir, 'clean.nc')], 'haas', { run: cleanRun });
    expect(card.perfect).toBe(true);
    expect(card.controller).toBe('haas');
  });
});
