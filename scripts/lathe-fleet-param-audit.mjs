#!/usr/bin/env node
/**
 * lathe-fleet-param-audit.mjs — CLOSED-LOOP-MS0/U-CL15 (slot:whiskey)
 *
 * The PARAMETER-OPTIMIZATION + FINISHING-ALLOWANCE leg of the print->lathe-program
 * closed-loop. Answers the /goal asks "check calculations and parameters relative to
 * material, ... optimized cutting speeds and feeds" and "ensure our data is optimized"
 * by measuring, per program, the PROGRAM-RESIDENT parameter chain a generator must
 * reproduce to be print-accurate:
 *   - CSS regime (G96 vc / G97 rpm) and whether G96 is capped by a G50 max-RPM clamp
 *   - feed mode (G95 ipr / G94 ipm / mixed / undeclared)  — the #1 fleet defect
 *   - units declaration (G20 inch / G21 mm)               — JM is inch; verify per part
 *   - canned-cycle op set (reuse inferOpsFromGcodes, R8)
 *   - tool-station calls
 *   - FINISHING-ALLOWANCE annotation flags (OD grind / ID hone / counterbore relief /
 *     press-fit / carbide) — the JM practice captured in
 *     reference_jm_lathe_finishing_allowances_carbide_pressfit_2026_06_01 + the
 *     code-tribal wiki: a print-accurate program must LEAVE grind/hone stock and add
 *     counterbore reliefs, so how often JM programs annotate these is a generator target.
 *   - vc (S-after-G96) and feed (F) value distributions — the raw "is our data optimized" signal.
 *
 * R12 HONESTY: this audits what is IN the program text. Stock/tool STICKOUT, tooling
 * make/dimensions, turret/spindle/controller capability envelopes, and print material
 * are NOT reliably encoded in G-code — those live in the setup sheet + the physics
 * engine (latheUnifiedPhysicsOrchestrationEngine / SFC) and are a documented next leg,
 * NOT something this script fabricates from the program.
 *
 * REUSE (R8): assessProgram <- lathe-program-assessor.mjs (8-gotcha physics/safety lint);
 *             inferOpsFromGcodes <- lathe-closed-loop-test.mjs (canned-cycle op set).
 * Offline — no MCP, no engine, no dist build. Reads the A-side (original JM program =
 * ground-truth as-machined intent) from a cached scan-jm-die-ab-pairs JSONL.
 *
 * USAGE:
 *   node scripts/lathe-fleet-param-audit.mjs --jsonl <ab-pairs.jsonl> [--side a|b] [--limit N] [--json]
 *   node scripts/lathe-fleet-param-audit.mjs --single <file.MIN> [--json]
 *
 * @milestone CLOSED-LOOP-MS0/U-CL15
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessProgram } from "./lathe-program-assessor.mjs";
import { inferOpsFromGcodes } from "./lathe-closed-loop-test.mjs";

/** Collect numeric capture-group 1 across all matches of a /g regex (matchAll, no shared state). */
function collectNums(text, re) {
  const out = [];
  for (const m of text.matchAll(re)) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

/**
 * Audit the program-resident parameter chain + finishing-allowance annotations of a
 * single lathe program. Pure; never throws on malformed input.
 * @param {string} text raw program text (comments included — finishing keywords live in comments)
 * @returns {{
 *   css:{present:boolean, mode:('G96'|'G97'|'mixed'|null), vc_values:number[], rpm_values:number[],
 *        g50_cap_present:boolean, g50_cap_rpm:(number|null), css_without_cap:boolean},
 *   feed:{mode:('G95'|'G94'|'mixed'|'undeclared'), values:number[]},
 *   units:{declared:('G20'|'G21'|null)},
 *   ops:Record<string,number>,
 *   tools:{stations:string[], count:number},
 *   finishing:{od_grind:boolean, id_hone:boolean, counterbore:boolean, relief:boolean,
 *              counterbore_relief:boolean, press_fit:boolean, carbide:boolean, any:boolean},
 * }}
 */
export function auditProgramParams(text) {
  const empty = {
    css: { present: false, mode: null, vc_values: [], rpm_values: [], g50_cap_present: false, g50_cap_rpm: null, css_without_cap: false },
    feed: { mode: "undeclared", values: [] },
    units: { declared: null },
    ops: {},
    tools: { stations: [], count: 0 },
    finishing: { od_grind: false, id_hone: false, counterbore: false, relief: false, counterbore_relief: false, press_fit: false, carbide: false, any: false },
  };
  if (typeof text !== "string" || text.length === 0) return empty;
  const up = text.toUpperCase();

  // ── CSS regime ──────────────────────────────────────────────
  const hasG96 = /\bG96\b/.test(up);
  const hasG97 = /\bG97\b/.test(up);
  const vc_values = collectNums(up, /\bG96\b[^\n]*?\bS(\d+(?:\.\d+)?)/g);
  const rpm_values = collectNums(up, /\bG97\b[^\n]*?\bS(\d+(?:\.\d+)?)/g);
  // Okuma OSP turning: G50 S<rpm> is the max-spindle-speed clamp for G96 CSS.
  const g50cap = collectNums(up, /\bG50\b[^\n]*?\bS(\d+(?:\.\d+)?)/g);
  const g50_cap_present = g50cap.length > 0;
  const g50_cap_rpm = g50_cap_present ? Math.max(...g50cap) : null;
  let cssMode = null;
  if (hasG96 && hasG97) cssMode = "mixed";
  else if (hasG96) cssMode = "G96";
  else if (hasG97) cssMode = "G97";
  // css_without_cap is the load-bearing safety signal: G96 CSS active with no G50 clamp.
  const css_without_cap = hasG96 && !g50_cap_present;

  // ── feed mode ───────────────────────────────────────────────
  const hasG95 = /\bG95\b/.test(up);
  const hasG94 = /\bG94\b/.test(up);
  let feedMode;
  if (hasG95 && hasG94) feedMode = "mixed";
  else if (hasG95) feedMode = "G95";
  else if (hasG94) feedMode = "G94";
  else feedMode = "undeclared";
  const feedValues = collectNums(up, /\bF(\d+(?:\.\d+)?)/g);

  // ── units ───────────────────────────────────────────────────
  const unitsDeclared = /\bG20\b/.test(up) ? "G20" : /\bG21\b/.test(up) ? "G21" : null;

  // ── tools (Okuma T-codes; exclude all-zero cancel) ──────────
  const stations = [...new Set(collectNums(up, /\bT(\d{2,4})\b/g).filter((nx) => nx > 0).map(String))].sort();

  // ── finishing-allowance annotations (comments, case-insensitive on raw text) ──
  // \b(RE)? catches REGRIND/REHONE (shop re-machine verbs); \b keeps HON off "PHONE".
  const od_grind = /\b(RE)?GRIND/i.test(text);
  const id_hone = /\b(RE)?HON(E|ING)/i.test(text);
  // [ -]? accepts the hyphenated drawing spellings COUNTER-BORE / PRESS-FIT.
  const counterbore = /C['` ]?BORE|COUNTER[ -]?BORE|CBORE/i.test(text);
  const relief = /\bRELIEF\b|\bUNDERCUT\b/i.test(text);
  const press_fit = /PRESS[ -]?FIT|INTERFERENCE[ -]?FIT/i.test(text);
  const carbide = /CARBIDE/i.test(text);
  const counterbore_relief = counterbore && relief;
  const any = od_grind || id_hone || relief || press_fit || carbide;

  return {
    css: { present: hasG96 || hasG97, mode: cssMode, vc_values, rpm_values, g50_cap_present, g50_cap_rpm, css_without_cap },
    feed: { mode: feedMode, values: feedValues },
    units: { declared: unitsDeclared },
    ops: inferOpsFromGcodes(text),
    tools: { stations, count: stations.length },
    finishing: { od_grind, id_hone, counterbore, relief, counterbore_relief, press_fit, carbide, any },
  };
}

function numStats(arr) {
  if (!arr.length) return { n: 0, min: null, max: null, mean: null };
  let min = Infinity, max = -Infinity, sum = 0;
  for (const v of arr) { if (v < min) min = v; if (v > max) max = v; sum += v; }
  return { n: arr.length, min, max, mean: +(sum / arr.length).toFixed(4) };
}

/**
 * Aggregate per-program audits into a fleet/customer roll-up.
 * @param {Array<{params:object, proper:boolean, errorCount:number}>} perProgram
 */
export function aggregateParamAudit(perProgram = []) {
  // fail-soft: drop malformed records (no .params) so rates aren't skewed — twin of
  // auditProgramParams' "never throws" discipline (a paramless record would crash the loop).
  const valid = Array.isArray(perProgram) ? perProgram.filter((r) => r && r.params) : [];
  const n = valid.length;
  const acc = {
    proper: 0,
    feedMode: { G95: 0, G94: 0, mixed: 0, undeclared: 0 },
    css: { g96: 0, g97: 0, mixedRegime: 0, none: 0, withCap: 0, withoutCap: 0 },
    units: { G20: 0, G21: 0, none: 0 },
    finishing: { od_grind: 0, id_hone: 0, counterbore: 0, relief: 0, counterbore_relief: 0, press_fit: 0, carbide: 0, any: 0 },
    opFreq: {},
    toolStations: { withTools: 0, totalStations: 0 },
  };
  const vcAll = [], feedAll = [], capAll = [];
  for (const r of valid) {
    const p = r.params;
    if (r.proper) acc.proper++;
    acc.feedMode[p.feed.mode] = (acc.feedMode[p.feed.mode] ?? 0) + 1;
    if (p.css.mode === "G96") acc.css.g96++;
    else if (p.css.mode === "G97") acc.css.g97++;
    else if (p.css.mode === "mixed") acc.css.mixedRegime++;
    else acc.css.none++;
    if (p.css.g50_cap_present) acc.css.withCap++;
    if (p.css.css_without_cap) acc.css.withoutCap++;
    if (p.units.declared === "G20") acc.units.G20++;
    else if (p.units.declared === "G21") acc.units.G21++;
    else acc.units.none++;
    for (const k of Object.keys(acc.finishing)) if (p.finishing[k]) acc.finishing[k]++;
    for (const [op, c] of Object.entries(p.ops)) acc.opFreq[op] = (acc.opFreq[op] || 0) + c;
    if (p.tools.count > 0) { acc.toolStations.withTools++; acc.toolStations.totalStations += p.tools.count; }
    vcAll.push(...p.css.vc_values);
    feedAll.push(...p.feed.values);
    if (p.css.g50_cap_rpm != null) capAll.push(p.css.g50_cap_rpm);
  }
  const pct = (x) => (n ? +(x / n).toFixed(3) : null);
  return {
    n,
    properRate: pct(acc.proper),
    feedMode: acc.feedMode,
    feedModeDeclaredPct: pct(acc.feedMode.G95 + acc.feedMode.G94 + acc.feedMode.mixed),
    feedModeUndeclaredPct: pct(acc.feedMode.undeclared),
    css: acc.css,
    cssWithoutCapPct: pct(acc.css.withoutCap),
    units: acc.units,
    finishing: acc.finishing,
    finishingAnyPct: pct(acc.finishing.any),
    opFreq: acc.opFreq,
    toolStations: acc.toolStations,
    dist: { vc: numStats(vcAll), feed: numStats(feedAll), g50_cap_rpm: numStats(capAll) },
  };
}

// ───────────────────────── CLI ─────────────────────────
function readSafe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }

function main(argv) {
  const args = argv.slice(2);
  const flag = (n) => args.includes(n);
  const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  const asJson = flag("--json");

  if (flag("--single")) {
    const file = val("--single");
    const text = readSafe(file);
    if (text == null) { process.stderr.write(`cannot read ${file}\n`); process.exit(2); }
    const params = auditProgramParams(text);
    const a = assessProgram(text, { controller: val("--controller", "okuma") });
    const out = { file, proper: a.proper, errorCount: a.errorCount, params };
    process.stdout.write(JSON.stringify(out, null, asJson ? 2 : 0) + "\n");
    return;
  }

  const jf = val("--jsonl");
  if (!jf) { process.stderr.write("usage: --jsonl <ab-pairs.jsonl> [--side a|b] [--limit N] [--json] | --single <file> [--json]\n"); process.exit(2); }
  const raw = readSafe(jf);
  if (raw == null) { process.stderr.write(`cannot read ${jf}\n`); process.exit(2); }
  const side = val("--side", "a") === "b" ? "b_path" : "a_path";
  const limit = parseInt(val("--limit", "100"), 10);
  const ctx = { controller: val("--controller", "okuma") };
  const recs = raw.split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && r.kind === "ab_pair" && r[side]);
  const perProgram = [];
  let read = 0, missing = 0;
  for (const rec of recs.slice(0, limit)) {
    const text = readSafe(rec[side]);
    if (text == null) { missing++; continue; }
    read++;
    const a = assessProgram(text, ctx);
    perProgram.push({ customer: rec.customer, part_num: rec.part_num, proper: a.proper, errorCount: a.errorCount, params: auditProgramParams(text) });
  }
  const agg = aggregateParamAudit(perProgram);
  const customer = recs[0]?.customer || path.basename(jf);
  const out = { source: jf, customer, side, recordsInFile: recs.length, read, missing, aggregate: agg };
  if (asJson) { process.stdout.write(JSON.stringify(out, null, 2) + "\n"); return; }
  process.stdout.write(`\n=== LATHE FLEET PARAM AUDIT (${customer}, side=${side}) ===\n`);
  process.stdout.write(`programs audited: ${agg.n} (of ${recs.length} in file; ${missing} unreadable)\n`);
  process.stdout.write(`PROPER (lint-clean): ${(agg.properRate * 100).toFixed(1)}%\n`);
  process.stdout.write(`feed-mode declared: ${(agg.feedModeDeclaredPct * 100).toFixed(1)}%  (undeclared ${(agg.feedModeUndeclaredPct * 100).toFixed(1)}%)\n`);
  process.stdout.write(`G96 CSS without G50 cap: ${(agg.cssWithoutCapPct * 100).toFixed(1)}%\n`);
  process.stdout.write(`finishing-allowance annotated: ${(agg.finishingAnyPct * 100).toFixed(1)}%  ${JSON.stringify(agg.finishing)}\n`);
  const vcUnit = agg.units.G21 > agg.units.G20 ? "m/min" : "SFM (G20 inch)";
  process.stdout.write(`vc (S@G96, ${vcUnit}): ${JSON.stringify(agg.dist.vc)}\nfeed F: ${JSON.stringify(agg.dist.feed)}\n`);
}

const isMain = (() => { try { return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); } catch { return false; } })();
if (isMain) main(process.argv);
