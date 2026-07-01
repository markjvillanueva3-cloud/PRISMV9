#!/usr/bin/env node
// post-nc-conformance.mjs — verify a post-processor-emitted NC program is SEMANTICALLY correct
// against the canonical job spec (prism-base-job.mjs). slot:echo.
//
// This is the "ensuring the code our post processor generates is 100% correct relative to the
// math our SFC/engines should be generating" leg — the closed-loop self-test's CORRECTNESS
// SIGNAL. It is DISTINCT from post-nc-dialect-lint.mjs (which checks dialect/safety SYNTAX:
// G93/G94, M8-after-M3, comment brackets). This checks SEMANTICS: does the NC use the RIGHT
// tools at the RIGHT speeds doing the RIGHT operations the job intended?
//
// PURE STATIC — no GUI (WinMax verify is the separate geometry/collision leg), no MCP, no
// dist/ build. Parses the NC text + compares to the spec. The per-tool spindle-speed check is
// the heart: the emitted S<rpm> must equal the spec tool rpm (which the SFC/post computed).
//
// Optional live-engine leg (when MCP is up): recompute S/F via cam_speedfeed_compute and
// compare to the NC too. Skipped + LOUDLY noted when MCP is unreachable (R12) — NOT a stub:
// the spec-rpm comparison is itself a real correctness check; live recompute is an enhancement.
//
// Usage:
//   node scripts/post-nc-conformance.mjs <nc-file> [--program rich|basic] [--json]
// Exit 0 = all conformance checks pass; exit 3 = at least one FAIL (fail-loud).

import { readFileSync } from 'node:fs';

// ── Pure NC parser (hermetically testable) ────────────────────────────────────────────────

/** Strip a WinMax/ISO `( ... )` inline comment from a line. */
export function stripComment(line) {
  return line.replace(/\([^)]*\)/g, ' ').trim();
}

/**
 * Parse emitted NC text into a structured view: program number, units, work-offset, and an
 * ordered list of tool blocks (each carrying the tool number + the spindle speed, feeds, and
 * canned cycles that appear before the next tool change).
 */
export function parseNC(text) {
  const lines = String(text).split(/\r?\n/);
  const out = { oNumber: null, units: null, wcs: null, tools: [], hasRetract: false, hasEnd: false };
  let cur = null;
  for (const raw of lines) {
    const line = stripComment(raw);
    if (!line) continue;
    const oM = line.match(/\bO(\d+)\b/);
    if (oM && out.oNumber == null) out.oNumber = oM[1];
    if (/\bG20\b/.test(line)) out.units = 'inch';
    if (/\bG21\b/.test(line)) out.units = 'mm';
    const wcsM = line.match(/\bG5([4-9])\b/);
    if (wcsM && out.wcs == null) out.wcs = 'G5' + wcsM[1];
    // Okuma OSP work offset is G15 H<n> (NOT Fanuc G54-G59) — recognise it so the structural
    // gate doesn't false-fail dialect-clean Okuma programs. (Fanuc G54-G59 still matched above.)
    const okumaWcs = line.match(/\bG15\s+H(\d+)\b/);
    if (okumaWcs && out.wcs == null) out.wcs = 'G15 H' + okumaWcs[1];
    if (/\bG28\b/.test(line)) out.hasRetract = true;
    if (/\bM0?30\b/.test(line)) out.hasEnd = true;
    const tM = line.match(/\bT(\d+)\b/);
    if (tM) {
      cur = { num: Number(tM[1]), speed: null, feeds: [], cycles: [] };
      out.tools.push(cur);
    }
    if (cur) {
      const sM = line.match(/\bS(\d+(?:\.\d+)?)\b/);
      if (sM && cur.speed == null) cur.speed = Number(sM[1]);
      const fM = line.match(/\bF(\d+(?:\.\d+)?)\b/);
      if (fM) cur.feeds.push(Number(fM[1]));
      const cM = line.match(/\bG(8[1-9]|73|74|76)\b/); // canned cycles (G81-89, G73/74/76 drilling/boring)
      if (cM) cur.cycles.push('G' + cM[1]);
    }
  }
  return out;
}

// ── Conformance checks against the job spec ────────────────────────────────────────────────

/**
 * Compare a parsed NC against the job spec for a given program (rich|basic).
 * `spec` is the prism-base-job module shape: { UNITS, WCS, TOOLS, PROGRAMS, toolByNum }.
 * Returns { checks:[{name,pass,expected,actual,detail}], passed, total, score, ok }.
 */
export function checkConformance(parsed, spec, programName = 'rich') {
  const prog = spec.PROGRAMS[programName];
  if (!prog) throw new Error(`unknown program '${programName}'. Known: ${Object.keys(spec.PROGRAMS).join(', ')}`);
  const checks = [];
  const add = (name, pass, expected, actual, detail) => checks.push({ name, pass: !!pass, expected, actual, ...(detail ? { detail } : {}) });

  const expectUnits = spec.UNITS === 'inch' ? 'inch' : 'mm';
  add('units', parsed.units === expectUnits, expectUnits, parsed.units, 'a units mismatch is a 25.4x scale error');
  add('work-offset', parsed.wcs === spec.WCS, spec.WCS, parsed.wcs);

  const ncToolNums = parsed.tools.map((t) => t.num);
  const expectTools = prog.toolNums;
  for (const tn of expectTools) {
    add(`tool-T${tn}-present`, ncToolNums.includes(tn), `T${tn} called`, ncToolNums.includes(tn) ? `T${tn} found` : 'absent');
  }
  const extra = ncToolNums.filter((n) => !expectTools.includes(n));
  add('no-unexpected-tools', extra.length === 0, `only T[${expectTools.join(',')}]`, extra.length ? `extra T[${extra.join(',')}]` : 'none');

  // CORE math-correctness check: each emitted spindle speed must equal the spec tool rpm
  // (the value the SFC/post computed for that tool + material).
  for (const tn of expectTools) {
    const tool = spec.toolByNum(tn);
    const block = parsed.tools.find((t) => t.num === tn);
    const ncSpeed = block ? block.speed : null;
    const ok = tool && ncSpeed != null && Math.abs(ncSpeed - tool.rpm) < 1e-9;
    add(`spindle-speed-T${tn}`, ok, tool ? tool.rpm : '?', ncSpeed, 'emitted S must match spec/SFC rpm');
  }

  // The drill tool (spec type 'drill') must use a canned drilling cycle (G83 peck per the op spec).
  const drill = spec.TOOLS.find((t) => t.type === 'drill' && expectTools.includes(t.num));
  if (drill) {
    const block = parsed.tools.find((t) => t.num === drill.num);
    const hasCycle = block && block.cycles.length > 0;
    add(`drill-T${drill.num}-canned-cycle`, hasCycle, 'a G8x drilling cycle', block ? (block.cycles.join(',') || 'none') : 'tool absent');
  }

  add('program-number', parsed.oNumber != null, 'an O-number', parsed.oNumber ?? 'none');
  add('safe-retract', parsed.hasRetract, 'a G28 retract', parsed.hasRetract ? 'G28 present' : 'none');
  add('program-end', parsed.hasEnd, 'M30 end', parsed.hasEnd ? 'M30 present' : 'none');

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;
  return { program: programName, checks, passed, total, score: total ? passed / total : 0, ok: passed === total };
}

/**
 * Generic STRUCTURAL conformance — gates ANY emitted NC (not just the fixed golden 4-tool job) on
 * the dialect-agnostic correctness invariants every safe program must hold, WITHOUT the golden-job
 * identity checks (specific tool numbers / spec rpm / G83-on-T4). This is the mode the multi-machine
 * training corpus + pairwise matrix need: each combo is its own program, can never match the one
 * golden job, but MUST still be structurally sound. (Fixes the P1-d validator-scope mismatch — golden
 * mode false-failed all 52 matrix NC; structural sub-checks passed on every row.) `expectUnits`
 * optionally asserts the units header (inch|mm).
 */
export function checkStructural(parsed, { expectUnits = null } = {}) {
  const checks = [];
  const add = (name, pass, expected, actual, detail) => checks.push({ name, pass: !!pass, expected, actual, ...(detail ? { detail } : {}) });

  add('units-declared', parsed.units != null, 'a units modal (G20/G21)', parsed.units ?? 'none', 'no units modal = ambiguous scale');
  if (expectUnits) add('units-match', parsed.units === expectUnits, expectUnits, parsed.units, 'a units mismatch is a 25.4x scale error');
  add('work-offset-present', parsed.wcs != null, 'a work offset (Fanuc G54-G59/G54.1 or Okuma G15 H#)', parsed.wcs ?? 'none');
  add('at-least-one-tool', parsed.tools.length > 0, '>=1 tool call (T..)', `${parsed.tools.length} tool(s)`);
  const withSpeed = parsed.tools.filter((t) => t.speed != null && t.speed > 0).length;
  add('every-tool-has-spindle', parsed.tools.length > 0 && withSpeed === parsed.tools.length, `${parsed.tools.length} tool(s) with S>0`, `${withSpeed}/${parsed.tools.length}`, 'a tool with no spindle speed will not cut');
  add('program-number', parsed.oNumber != null, 'an O-number', parsed.oNumber ?? 'none');
  add('safe-retract', parsed.hasRetract, 'a G28 retract', parsed.hasRetract ? 'G28 present' : 'none');
  add('program-end', parsed.hasEnd, 'M30 end', parsed.hasEnd ? 'M30 present' : 'none');

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;
  return { mode: 'structural', checks, passed, total, score: total ? passed / total : 0, ok: passed === total };
}

// ── Live SFC leg — verify emitted speeds against the LIVE speed-feed calculator ────────────
// The post-processor uses the SFC (prism_calc:speed_feed) to compute feeds/speeds, so the
// conformance check can verify the emitted S against a FRESH SFC compute — "100% correct relative
// to the math our SFC should be generating." UNITS: the SFC is metric-native (a diameter of 2.0 is
// read as 2 mm), and the job is INCH, so we convert dia inch→mm (×25.4) before calling. Fail-soft.

const MCP_HTTP_URL = process.env.MCP_HTTP_URL || 'http://127.0.0.1:3100/mcp';
const INCH_TO_MM = 25.4;

/** Map a spec tool type to an SFC operation keyword. */
export function operationFor(type) {
  if (/drill/i.test(type)) return 'drill';
  if (/face/i.test(type)) return 'face';
  return 'slot'; // flat end mills roughing/finishing a pocket
}

/** Unwrap a value that may be a bare number or an {value, unit, ...} descriptor. */
function valOf(x) { return x && typeof x === 'object' && 'value' in x ? x.value : x; }

/**
 * Call the live SFC for one tool and return the MATERIAL- and DIAMETER-correct spindle speed.
 *
 * Uses `ultimate_speed_feed` (the trustworthy material-aware action — steel 140 / Al 365 / Ti 46
 * m/min, matching handbooks). `speed_feed` is a material-BLIND constant (Vc=120 always) and is NOT
 * used. As of the 2026-05-31 dispatcher plumbing fix (tool_diameter → tool_diameter_mm), the
 * engine's `spindle_rpm` is now diameter-correct AND machine-rpm-clamped, so we trust it directly;
 * we keep n = Vc·1000/(π·D_mm) only as a fallback if the engine omits spindle_rpm.
 */
export async function sfcRecompute({ diameterInch, flutes, isoGroup, materialName, operation, machine, url = MCP_HTTP_URL }) {
  const diaMm = diameterInch * INCH_TO_MM;
  const body = {
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'prism_calc', arguments: { action: 'ultimate_speed_feed', params: {
      material: materialName, iso_group: isoGroup,
      tool_diameter: diaMm, flutes, tool_material: 'carbide', operation, machine,
    } } },
  };
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }, body: JSON.stringify(body) });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    const j = await r.json();
    const text = j?.result?.content?.[0]?.text;
    if (!text) return { ok: false, error: 'no result text' };
    const o = JSON.parse(text);
    if (o.blocked) return { ok: false, error: `SFC blocked: ${o.reason || o.blocker}` };
    const vc = valOf(o.cutting_speed); // m/min, material-aware
    if (typeof vc !== 'number' || !(vc > 0)) return { ok: false, error: `no cutting_speed (${JSON.stringify(o).slice(0, 80)})` };
    const engineRpm = valOf(o.spindle_rpm);
    const spindleSpeed = (typeof engineRpm === 'number' && engineRpm > 0)
      ? Math.round(engineRpm)                                  // engine rpm — now diameter-correct + machine-clamped
      : Math.round((vc * 1000) / (Math.PI * diaMm));           // fallback: n = Vc·1000/(π·D_mm)
    return { ok: true, cuttingSpeed: vc, spindleSpeed, feedPerTooth: valOf(o.feed_per_tooth), raw: o };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

/**
 * Live SFC leg: for each program tool, recompute the SFC spindle speed and compare to the emitted S.
 * `tolerance` is the fractional band (default 0.20) within which the emitted RPM is accepted — RPM
 * has a legitimate optimization range, but a tool outside the band is a real deviation (training signal).
 * Returns { ran, checks:[{tool, ncRpm, sfcRpm, deltaPct, withinTol}], reason? }.
 */
export async function liveSfcLeg(parsed, spec, programName = 'rich', { tolerance = 0.20, url = MCP_HTTP_URL } = {}) {
  const prog = spec.PROGRAMS[programName];
  if (!prog) return { ran: false, reason: `unknown program '${programName}'` };
  const checks = [];
  for (const tn of prog.toolNums) {
    const tool = spec.toolByNum(tn);
    const block = parsed.tools.find((t) => t.num === tn);
    if (!tool || !block || block.speed == null) { checks.push({ tool: tn, error: 'tool/speed missing' }); continue; }
    const sf = await sfcRecompute({
      diameterInch: tool.dia, flutes: tool.flutes, isoGroup: spec.MATERIAL.iso,
      materialName: spec.MATERIAL.name, operation: operationFor(tool.type), machine: spec.MACHINE, url,
    });
    if (!sf.ok) { checks.push({ tool: tn, ncRpm: block.speed, error: sf.error }); continue; }
    const sfcRpm = sf.spindleSpeed;
    const deltaPct = sfcRpm ? (block.speed - sfcRpm) / sfcRpm : null;
    checks.push({ tool: tn, ncRpm: block.speed, sfcRpm, deltaPct, withinTol: deltaPct != null && Math.abs(deltaPct) <= tolerance });
  }
  const reachable = checks.some((c) => c.sfcRpm != null);
  return { ran: reachable, tolerance, checks, reason: reachable ? null : 'SFC unreachable for all tools (MCP down or gate-blocked)' };
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const file = argv.find((a) => !a.startsWith('--'));
  const json = argv.includes('--json');
  const pIdx = argv.indexOf('--program');
  const program = pIdx >= 0 ? argv[pIdx + 1] : 'rich';
  if (!file) { console.error('usage: post-nc-conformance.mjs <nc-file> [--program rich|basic] [--json]'); process.exit(2); }

  const spec = await import('./lib/prism-base-job.mjs');
  let text;
  try { text = readFileSync(file, 'utf8'); }
  catch (e) { console.error(JSON.stringify({ ok: false, error: `cannot read ${file}: ${e.message}` })); process.exit(2); }

  const live = argv.includes('--live');
  const parsed = parseNC(text);

  // --structural: gate ANY NC (training corpus / matrix combos, not just the golden job) on the
  // dialect-agnostic structural invariants. (P1-d fix — re-added 2026-05-31 after the prior add was
  // lost in a tangled multi-edit turn.)
  if (argv.includes('--structural')) {
    const uIdx = argv.indexOf('--units');
    const expectUnits = (uIdx >= 0 && uIdx + 1 < argv.length && !argv[uIdx + 1].startsWith('--')) ? argv[uIdx + 1] : null;
    const sr = checkStructural(parsed, { expectUnits });
    sr.file = file;
    if (json) { console.log(JSON.stringify(sr, null, 2)); }
    else {
      console.log(`NC structural conformance: ${file} — ${sr.passed}/${sr.total} (score ${(sr.score * 100).toFixed(0)}%)`);
      for (const c of sr.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name.padEnd(22)} expected=${c.expected} actual=${c.actual}${c.pass ? '' : '  <-- ' + (c.detail || '')}`);
    }
    process.exit(sr.ok ? 0 : 3);
  }

  const result = checkConformance(parsed, spec, program);
  result.file = file;
  result.liveEngineRecompute = live
    ? await liveSfcLeg(parsed, spec, program)
    : { ran: false, reason: 'static mode (pass --live to compare emitted speeds against the live SFC). spec-rpm comparison is the static correctness check.' };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`NC conformance: ${file} [${program}] — ${result.passed}/${result.total} (score ${(result.score * 100).toFixed(0)}%)`);
    for (const c of result.checks) {
      console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name.padEnd(24)} expected=${c.expected} actual=${c.actual}${c.pass ? '' : '  <-- ' + (c.detail || '')}`);
    }
    const le = result.liveEngineRecompute;
    if (!le.ran) {
      console.log(`  NOTE  live SFC leg ${live ? 'unreachable' : 'skipped'} (${le.reason})`);
    } else {
      console.log(`  --- live SFC recompute (tolerance ±${(le.tolerance * 100).toFixed(0)}%) ---`);
      for (const c of le.checks) {
        if (c.error) { console.log(`  SFC?  T${c.tool}: ${c.error}`); continue; }
        const tag = c.withinTol ? 'OK  ' : 'DRIFT';
        console.log(`  ${tag}  T${c.tool}: emitted S${c.ncRpm} vs SFC ${Math.round(c.sfcRpm)} rpm (${(c.deltaPct * 100).toFixed(0)}%)`);
      }
    }
  }
  process.exit(result.ok ? 0 : 3);
}

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
