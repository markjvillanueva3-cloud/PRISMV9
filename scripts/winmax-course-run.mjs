#!/usr/bin/env node
// winmax-course-run.mjs — execute a named WinMax "course" (winmax-courses.json) VISION-FREE.
//
// A course is an ordered step list driving the WinMax GUI through one production phase
// (load-program / define-tool / set-work-offset / verify-program). The runner composes two
// already-built assets: PrismWinMaxUI.exe (UIA driver) for read/write of controls by
// AutomationId, and winmax-ui-map.mjs (FSM map) for screen-to-screen navigation by softkey
// emission. NO screenshot is taken at runtime — navigation is deterministic key emission,
// field I/O is UIA by id. This is the executable spine of "plot out your courses to successful
// step" (slot:echo).
//
// Usage:
//   node scripts/winmax-course-run.mjs <course> [--dry-run] [--set k=v ...] [--allow-actions]
//   node scripts/winmax-course-run.mjs --list
//   --dry-run        plan + print every (param-expanded) step; execute ONLY read-only steps
//                    (read/assert/fingerprint). No input injection. Proves determinism.
//   --allow-actions  pass through to the driver so write steps (field/key/nav) actually inject.
//   --set k=v        override a course param (repeatable).
//
// Exit 0 = course completed (all asserts PASS, no UNRESOLVED step hit in live mode).
// Exit 3 = an assert FAILED or an UNRESOLVED step was reached in live mode (fail-loud, R12).

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const COURSES_JSON = join(REPO, 'mcp-server/data/posts/prism-base/winmax-bridge/winmax-courses.json');
const DRIVER_EXE = join(REPO, 'mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/bin/PrismWinMaxUI.exe');
const MAP_MJS = join(REPO, 'scripts/winmax-ui-map.mjs');

export const KNOWN_OPS = new Set(['note', 'nav', 'key', 'field', 'assert', 'read', 'fingerprint', 'draw-trigger']);
export const READ_ONLY_OPS = new Set(['note', 'read', 'assert', 'fingerprint']);

// ── Pure planner (hermetically testable — no WinMax, no fs side effects) ───────────────────

/** Merge course.params with CLI overrides (overrides win). */
export function resolveParams(course, overrides = {}) {
  return { ...(course && course.params ? course.params : {}), ...overrides };
}

/** Substitute ${key} tokens in a string from params. Non-strings pass through. Unknown token → throws (fail-loud). */
export function expandValue(value, params) {
  if (typeof value !== 'string') return value;
  return value.replace(/\$\{([^}]+)\}/g, (_, k) => {
    if (!(k in params)) throw new Error(`unresolved param \${${k}}`);
    return String(params[k]);
  });
}

/**
 * Compare a control's read-back value against an expected one. CNC numeric fields are padded to
 * 4 decimals (WinMax shows 2.0 as "2.0000", 0.375 as "0.3750"), so when BOTH sides parse as finite
 * numbers we compare numerically (tolerance 1e-9). Otherwise fall back to exact string equality.
 */
export function valuesMatch(actual, expected) {
  if (actual == null) return false;
  const a = Number(actual);
  const e = Number(expected);
  if (Number.isFinite(a) && Number.isFinite(e) && String(actual).trim() !== '' && String(expected).trim() !== '') {
    return Math.abs(a - e) < 1e-9;
  }
  return String(actual) === String(expected);
}

/** Validate + normalize one step: expand ${} in value/equals/keys, check op is known. */
export function normalizeStep(step, params, index) {
  if (!step || typeof step !== 'object') throw new Error(`step ${index}: not an object`);
  const op = step.op;
  if (!KNOWN_OPS.has(op)) throw new Error(`step ${index}: unknown op '${op}'`);
  const out = { ...step, op, readOnly: READ_ONLY_OPS.has(op) };
  for (const field of ['value', 'equals', 'keys', 'matches']) {
    if (out[field] != null) out[field] = expandValue(out[field], params);
  }
  if (op === 'field') {
    if (out.id == null) throw new Error(`step ${index}: field op needs id`);
    if (out.value == null) throw new Error(`step ${index}: field op needs value`);
    out.commit = out.commit || '{ENTER}';
  }
  if (op === 'assert' && out.id == null) throw new Error(`step ${index}: assert op needs id`);
  if ((op === 'read' || op === 'fingerprint') && op === 'read' && out.id == null) {
    throw new Error(`step ${index}: read op needs id`);
  }
  return out;
}

/** Build an executable plan from the courses doc + a course name. Throws on unknown course / bad step. */
export function planCourse(coursesDoc, name, overrides = {}) {
  if (!coursesDoc || !coursesDoc.courses) throw new Error('courses doc missing .courses');
  const course = coursesDoc.courses[name];
  if (!course) {
    const avail = Object.keys(coursesDoc.courses).join(', ');
    throw new Error(`unknown course '${name}'. Available: ${avail}`);
  }
  const params = resolveParams(course, overrides);
  const steps = (course.steps || []).map((s, i) => normalizeStep(s, params, i));
  return { name, course, params, steps };
}

// ── Live executor (side-effectful; spawns the driver / map) ────────────────────────────────

function driver(opArgs, { allowActions = false } = {}) {
  const args = [...opArgs];
  if (allowActions) args.push('--allow-actions');
  const r = spawnSync(DRIVER_EXE, args, { encoding: 'utf8', timeout: 30000 });
  if (r.error) return { ok: false, error: String(r.error.message || r.error) };
  const line = (r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() || '';
  try { return JSON.parse(line); } catch { return { ok: false, error: `unparseable driver output: ${line.slice(0, 200)}` }; }
}

function mapCli(verb, ...rest) {
  const r = spawnSync(process.execPath, [MAP_MJS, verb, ...rest], { encoding: 'utf8', timeout: 20000 });
  if (r.error) return { ok: false, error: String(r.error.message || r.error) };
  const out = (r.stdout || '').trim();
  // Parse robustly: try the LAST non-empty line first (skips any leading log noise), then the FULL
  // stdout (handles a pretty-printed multi-line JSON object). Defense-in-depth so a future emitter
  // that re-introduces null,2 pretty-print can't silently re-break nav (U-WINMAX-NAV-PATH-CONTRACT).
  const lastLine = out.split(/\r?\n/).filter(Boolean).pop() || '';
  for (const cand of [lastLine, out]) {
    if (!cand) continue;
    try { return JSON.parse(cand); } catch { /* try next candidate */ }
  }
  return { ok: false, error: `unparseable map output: ${out.slice(0, 200)}` };
}

async function execStep(step, { live }) {
  switch (step.op) {
    case 'note':
      return { op: 'note', ok: true, text: step.text };
    case 'read': {
      const r = driver(['--op', 'get-text', String(step.id)]);
      return { op: 'read', ok: !!r.ok, id: step.id, value: r.value && r.value.value, raw: r };
    }
    case 'assert': {
      const r = driver(['--op', 'get-text', String(step.id)]);
      const actual = r.value && r.value.value;
      let pass = false;
      if (step.equals != null) pass = valuesMatch(actual, step.equals);
      else if (step.matches != null) pass = new RegExp(step.matches).test(actual ?? '');
      return { op: 'assert', ok: pass, id: step.id, expected: step.equals ?? step.matches, actual };
    }
    case 'fingerprint': {
      const r = mapCli('whereami');
      const matched = r && r.match ? r.match : null;
      const ok = step.expectScreen ? matched === step.expectScreen : true;
      return { op: 'fingerprint', ok, matched, expected: step.expectScreen || null, signature: r && r.signature };
    }
    case 'draw-trigger':
      // Unresolved leaf: in live mode this is a fail-loud stop (we will not blindly invoke an
      // unknown toolbar button — that could move the machine on real hardware).
      return { op: 'draw-trigger', ok: false, unresolved: true, candidates: step.candidates,
               note: 'Draw console-key binding unresolved — resolve before live verify (R12 fail-loud).' };
    case 'nav': {
      if (!live) return { op: 'nav', ok: true, to: step.to, planned: true };
      const here = mapCli('whereami');
      const path = mapCli('path', here && here.match ? here.match : '', step.to);
      if (!path || !path.ok || !Array.isArray(path.keys)) {
        return { op: 'nav', ok: false, to: step.to, error: (path && path.error) || 'no path', from: here && here.match };
      }
      for (const k of path.keys) driver(['--op', 'sendkeys', k], { allowActions: true });
      const arrived = mapCli('whereami');
      return { op: 'nav', ok: arrived && arrived.match === step.to, to: step.to, arrived: arrived && arrived.match };
    }
    case 'key': {
      if (!live) return { op: 'key', ok: true, keys: step.keys, planned: true };
      const r = driver(['--op', 'sendkeys', step.keys], { allowActions: true });
      return { op: 'key', ok: !!r.ok, keys: step.keys, raw: r };
    }
    case 'field': {
      if (!live) return { op: 'field', ok: true, id: step.id, value: step.value, commit: step.commit, planned: true };
      driver(['--op', 'click', String(step.id)], { allowActions: true });
      driver(['--op', 'type-raw', step.value], { allowActions: true });
      const r = driver(['--op', 'type-raw', step.commit], { allowActions: true });
      return { op: 'field', ok: !!r.ok, id: step.id, value: step.value, commit: step.commit };
    }
    default:
      return { op: step.op, ok: false, error: 'no executor' };
  }
}

export async function runCourse(plan, { live = false } = {}) {
  const results = [];
  let ok = true;
  for (const step of plan.steps) {
    // In dry-run, only read-only steps actually touch WinMax; write steps are reported as planned.
    const r = await execStep(step, { live });
    results.push(r);
    if (r.ok === false && (live || step.readOnly)) ok = false;
    if (r.unresolved && live) { ok = false; break; }
  }
  return { course: plan.name, ok, steps: results };
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const a = { course: null, dryRun: false, allowActions: false, list: false, set: {}, coursesPath: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--dry-run') a.dryRun = true;
    else if (t === '--allow-actions') a.allowActions = true;
    else if (t === '--list') a.list = true;
    else if (t === '--courses') a.coursesPath = argv[++i] || null; // alternate courses doc (e.g. the lathe scaffold)
    else if (t === '--set') { const kv = argv[++i] || ''; const eq = kv.indexOf('='); if (eq > 0) a.set[kv.slice(0, eq)] = kv.slice(eq + 1); }
    else if (!t.startsWith('--') && !a.course) a.course = t;
  }
  return a;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const docPath = a.coursesPath || COURSES_JSON;
  let doc;
  try { doc = JSON.parse(readFileSync(docPath, 'utf8')); }
  catch (e) { console.error(JSON.stringify({ ok: false, error: `cannot read courses (${docPath}): ${e.message}` })); process.exit(2); }

  if (a.list || !a.course) {
    const courses = Object.entries(doc.courses).map(([k, v]) => ({ name: k, status: v.status, goal: v.goal }));
    console.log(JSON.stringify({ ok: true, courses, gaps: doc.gaps }, null, 2));
    process.exit(0);
  }

  let plan;
  try { plan = planCourse(doc, a.course, a.set); }
  catch (e) { console.error(JSON.stringify({ ok: false, error: e.message })); process.exit(2); }

  const live = !a.dryRun;
  if (a.dryRun) {
    console.log(JSON.stringify({ ok: true, mode: 'dry-run', course: plan.name, params: plan.params,
      plan: plan.steps.map((s, i) => ({ i, op: s.op, readOnly: s.readOnly, ...pick(s, ['to', 'id', 'value', 'commit', 'keys', 'equals', 'expectScreen', 'unresolved', 'text']) })) }, null, 2));
  }
  const summary = await runCourse(plan, { live });
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 3);
}

function pick(o, keys) { const r = {}; for (const k of keys) if (o[k] != null) r[k] = o[k]; return r; }

// Run main only as a CLI (not when imported by tests).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
