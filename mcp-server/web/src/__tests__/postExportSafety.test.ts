/**
 * Post-processor export safety fence (LAUNCH-FE, 2026-06-23, slot:quebec).
 *
 * P0 SAFETY: a /ppg/template or offline-fallback packet never ran the 38-stage
 * pipeline's P5 safety gate, yet it was downloaded as `<name>_PRISM_optimized.nc`.
 * decorateExport / exportFileSuffix make a non-validated program impossible to mistake
 * for a machine-ready one. Pin the safety behavior with real assertions (R9) -- a
 * validated program must pass through untouched; an unvalidated one MUST carry the loud
 * header and the unvalidated filename, or the fence has failed.
 */
import { describe, it, expect } from 'vitest';
import { decorateExport, exportFileSuffix, PREVIEW_ONLY_HEADER } from '../pages/postExportSafety';

const SAMPLE = 'O0001\nG90 G54\nG01 X1. F20.\nM30\n';

describe('PREVIEW_ONLY_HEADER', () => {
  it('carries the non-negotiable safety phrases', () => {
    expect(PREVIEW_ONLY_HEADER).toContain('PREVIEW ONLY');
    expect(PREVIEW_ONLY_HEADER).toContain('NOT MACHINE READY');
    expect(PREVIEW_ONLY_HEADER).toContain('DO NOT RUN ON A MACHINE');
    expect(PREVIEW_ONLY_HEADER).toContain('P5 alarm gate');
  });

  it('is comment-only G-code so it is inert if pasted into a controller', () => {
    const contentLines = PREVIEW_ONLY_HEADER.split('\n').filter((l) => l.trim().length > 0);
    expect(contentLines.length).toBeGreaterThan(0);
    for (const line of contentLines) {
      expect(line.trim().startsWith('(')).toBe(true);
      expect(line.trim().endsWith(')')).toBe(true);
    }
  });
});

describe('decorateExport', () => {
  it('validated program is returned BYTE-IDENTICAL (no header, no mutation)', () => {
    expect(decorateExport(SAMPLE, true)).toBe(SAMPLE);
  });

  it('UNVALIDATED program is prefixed with the PREVIEW-ONLY header, original preserved after it', () => {
    const out = decorateExport(SAMPLE, false);
    expect(out.startsWith(PREVIEW_ONLY_HEADER)).toBe(true);
    expect(out).toContain('PREVIEW ONLY');
    // the real program text survives intact after the header
    expect(out.endsWith(SAMPLE)).toBe(true);
    expect(out).not.toBe(SAMPLE);
  });

  it('empty unvalidated output still gets the header (a blank packet is still preview)', () => {
    expect(decorateExport('', false)).toBe(PREVIEW_ONLY_HEADER);
  });

  it('empty validated output stays empty (no spurious header)', () => {
    expect(decorateExport('', true)).toBe('');
  });

  it('an already-header-stamped program re-stamped is double-guarded, never silently un-stamped', () => {
    // Defensive: even if a caller double-decorates, the program never loses its warning.
    const once = decorateExport(SAMPLE, false);
    const twice = decorateExport(once, false);
    expect(twice).toContain('PREVIEW ONLY');
    expect(twice.endsWith(SAMPLE)).toBe(true);
  });
});

describe('exportFileSuffix', () => {
  it('validated -> the optimized .nc name', () => {
    expect(exportFileSuffix(true)).toBe('_PRISM_optimized.nc');
  });

  it('unvalidated -> an explicit preview/unvalidated .nc name (cannot be mistaken for optimized)', () => {
    const suffix = exportFileSuffix(false);
    expect(suffix).toBe('_PREVIEW_unvalidated.nc');
    expect(suffix).not.toContain('optimized');
    expect(suffix.endsWith('.nc')).toBe(true);
  });
});

describe('fail-safe coercion (defensive -- a hydrated/legacy object could carry a non-true flag)', () => {
  // Callers pass `pipelineValidated === true`, but pin that ANY non-true value
  // (undefined / null / falsy) is treated as NOT validated -> stamped + preview name.
  // The fence must never fail OPEN.
  it('undefined validity is treated as unvalidated (header stamped, preview filename)', () => {
    expect(decorateExport('X', undefined as unknown as boolean)).toContain('PREVIEW ONLY');
    expect(exportFileSuffix(undefined as unknown as boolean)).toBe('_PREVIEW_unvalidated.nc');
  });

  it('null validity is treated as unvalidated', () => {
    expect(decorateExport('X', null as unknown as boolean)).toContain('PREVIEW ONLY');
    expect(exportFileSuffix(null as unknown as boolean)).toBe('_PREVIEW_unvalidated.nc');
  });
});
