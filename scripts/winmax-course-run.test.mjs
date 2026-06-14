// Tests for winmax-course-run.mjs pure planner — hermetic (no live WinMax, no fs).
// Real-value assertions (R9): every case fails if the planner's intent changes.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveParams, expandValue, normalizeStep, planCourse, valuesMatch, KNOWN_OPS, READ_ONLY_OPS } from './winmax-course-run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const DOC = {
  courses: {
    'define-tool': {
      status: 'proven-primitives',
      params: { toolNumber: 1, diameter: '2.0', calLength: '2.0' },
      steps: [
        { op: 'nav', to: 'TOOL_SETUP_FORM' },
        { op: 'field', id: '301', value: '${toolNumber}' },
        { op: 'field', id: '303', value: '${diameter}' },
        { op: 'assert', id: '303', equals: '${diameter}' },
      ],
    },
    'verify-program': {
      status: 'draft',
      steps: [
        { op: 'note', text: 'undefined tools non-blocking' },
        { op: 'nav', to: 'ISNC_EDITOR' },
        { op: 'draw-trigger', candidates: ['toolbar', 'console-key'] },
        { op: 'read', id: 'StatusBar.Pane0' },
      ],
    },
  },
  gaps: ['draw-trigger'],
};

describe('resolveParams', () => {
  it('returns course params when no overrides', () => {
    expect(resolveParams(DOC.courses['define-tool'])).toEqual({ toolNumber: 1, diameter: '2.0', calLength: '2.0' });
  });
  it('lets overrides win over course params', () => {
    expect(resolveParams(DOC.courses['define-tool'], { diameter: '0.5' }).diameter).toBe('0.5');
  });
  it('returns empty object for a paramless course', () => {
    expect(resolveParams(DOC.courses['verify-program'])).toEqual({});
  });
});

describe('expandValue', () => {
  it('substitutes a known token', () => {
    expect(expandValue('${diameter}', { diameter: '2.0' })).toBe('2.0');
  });
  it('substitutes inside a larger string (the .0000 assert pattern)', () => {
    expect(expandValue('${diameter}.0000', { diameter: '2.0' })).toBe('2.0.0000');
  });
  it('passes non-strings through untouched', () => {
    expect(expandValue(301, {})).toBe(301);
  });
  it('throws fail-loud on an unresolved token', () => {
    expect(() => expandValue('${missing}', {})).toThrow(/unresolved param/);
  });
});

describe('normalizeStep', () => {
  it('expands value + defaults commit to {ENTER} for a field op', () => {
    const s = normalizeStep({ op: 'field', id: '303', value: '${diameter}' }, { diameter: '2.0' }, 0);
    expect(s.value).toBe('2.0');
    expect(s.commit).toBe('{ENTER}');
    expect(s.readOnly).toBe(false);
  });
  it('honors an explicit {TAB} commit (geometry-form rule)', () => {
    const s = normalizeStep({ op: 'field', id: '303', value: '1', commit: '{TAB}' }, {}, 0);
    expect(s.commit).toBe('{TAB}');
  });
  it('marks read/assert/fingerprint/note as readOnly', () => {
    for (const op of ['read', 'assert', 'fingerprint', 'note']) {
      const step = op === 'note' ? { op } : { op, id: 'x' };
      expect(normalizeStep(step, {}, 0).readOnly).toBe(true);
    }
  });
  it('throws on an unknown op', () => {
    expect(() => normalizeStep({ op: 'frobnicate' }, {}, 0)).toThrow(/unknown op/);
  });
  it('throws when a field op lacks id or value', () => {
    expect(() => normalizeStep({ op: 'field', value: '1' }, {}, 0)).toThrow(/needs id/);
    expect(() => normalizeStep({ op: 'field', id: '1' }, {}, 0)).toThrow(/needs value/);
  });
  it('throws when an assert op lacks id', () => {
    expect(() => normalizeStep({ op: 'assert', equals: '1' }, {}, 0)).toThrow(/needs id/);
  });
});

describe('planCourse', () => {
  it('expands all ${} tokens across the define-tool course', () => {
    const plan = planCourse(DOC, 'define-tool');
    expect(plan.steps[1].value).toBe('1');       // ${toolNumber}
    expect(plan.steps[2].value).toBe('2.0');     // ${diameter}
    expect(plan.steps[3].equals).toBe('2.0');    // ${diameter} (numeric compare handles .0000 padding)
  });
  it('applies overrides through the whole plan', () => {
    const plan = planCourse(DOC, 'define-tool', { diameter: '0.375' });
    expect(plan.steps[2].value).toBe('0.375');
    expect(plan.steps[3].equals).toBe('0.375');
  });
  it('throws on an unknown course and lists available ones', () => {
    expect(() => planCourse(DOC, 'nope')).toThrow(/unknown course 'nope'.*define-tool/s);
  });
  it('preserves the draw-trigger unresolved step with its op + candidates intact', () => {
    const plan = planCourse(DOC, 'verify-program');
    const draw = plan.steps.find((s) => s.op === 'draw-trigger');
    expect(draw.op).toBe('draw-trigger');
    expect(draw.readOnly).toBe(false);
    expect(draw.candidates).toEqual(['toolbar', 'console-key']);
  });
  it('normalizes every step to carry a boolean readOnly flag', () => {
    const plan = planCourse(DOC, 'verify-program');
    expect(plan.steps.map((s) => s.readOnly)).toEqual([true, false, false, true]);
  });
});

describe('valuesMatch (CNC numeric-aware compare)', () => {
  it('matches 4-decimal-padded readback to a short numeric expected', () => {
    expect(valuesMatch('2.0000', '2.0')).toBe(true);
    expect(valuesMatch('0.3750', '0.375')).toBe(true);
  });
  it('treats numerically-equal-but-different-string forms as equal', () => {
    expect(valuesMatch('2', '2.0000')).toBe(true);
  });
  it('fails on a genuine numeric mismatch (the dry-run T1=2.0 vs expected 0.375 case)', () => {
    expect(valuesMatch('2.0000', '0.375')).toBe(false);
  });
  it('returns false for a null/absent actual', () => {
    expect(valuesMatch(null, '2.0')).toBe(false);
    expect(valuesMatch(undefined, '2.0')).toBe(false);
  });
  it('falls back to exact string equality for non-numeric values', () => {
    expect(valuesMatch('FACE MILL', 'FACE MILL')).toBe(true);
    expect(valuesMatch('FACE MILL', 'END MILL')).toBe(false);
  });
  it('does not treat empty string as numeric zero', () => {
    expect(valuesMatch('', '0')).toBe(false);
  });
});

describe('op sets', () => {
  it('every read-only op is also a known op', () => {
    for (const op of READ_ONLY_OPS) expect(KNOWN_OPS.has(op)).toBe(true);
  });
  it('field/key/nav are NOT read-only (they inject input)', () => {
    for (const op of ['field', 'key', 'nav']) expect(READ_ONLY_OPS.has(op)).toBe(false);
  });
});

describe('WinMax LATHE courses doc — the real scaffold plans through the SAME runner (R9: fails if turning intent breaks)', () => {
  const latheDoc = JSON.parse(readFileSync(
    join(HERE, '../mcp-server/data/posts/prism-base/winmax-bridge/winmax-lathe-courses.json'), 'utf8'));

  it('every step op in every lathe course is a KNOWN runner op (no mistyped ops that would throw live)', () => {
    for (const [name, course] of Object.entries(latheDoc.courses)) {
      for (const step of (course.steps || [])) {
        expect(KNOWN_OPS.has(step.op), `${name} has unknown op '${step.op}'`).toBe(true);
      }
    }
  });
  it('define-turning-tool plans the turning geometry fields (nose radius / orientation / X-Z) with expanded params', () => {
    const plan = planCourse(latheDoc, 'define-turning-tool');
    const fieldVals = plan.steps.filter((s) => s.op === 'field').map((s) => ({ id: s.id, value: s.value }));
    // The four turning-geometry writes are present and param-expanded (not left as ${...}).
    expect(fieldVals.some((f) => f.id === 'PROBE:nose_radius' && f.value === '0.0313')).toBe(true);
    expect(fieldVals.some((f) => f.id === 'PROBE:orientation' && f.value === '3')).toBe(true);
    expect(fieldVals.some((f) => f.id === 'PROBE:x_offset')).toBe(true);
    expect(fieldVals.some((f) => f.id === 'PROBE:z_offset')).toBe(true);
  });
  it('the discovery course fingerprint-lathe-screens is READ-ONLY (no field/key/nav writes — safe on a live machine)', () => {
    const plan = planCourse(latheDoc, 'fingerprint-lathe-screens');
    for (const step of plan.steps) expect(READ_ONLY_OPS.has(step.op), `discovery course must not write (got '${step.op}')`).toBe(true);
  });
  it('throws on an unknown lathe course, listing the available ones', () => {
    expect(() => planCourse(latheDoc, 'nope')).toThrow(/unknown course 'nope'.*define-turning-tool/s);
  });
});
