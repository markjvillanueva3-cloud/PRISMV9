#!/usr/bin/env node
/**
 * post-gen-reward.mjs — non-circular scored REWARD harness for post-processor output (slot:echo)
 *
 * The keystone the closed-loop-training audit (POST-GEN-CLOSED-LOOP-TRAINING-READINESS)
 * named the P0 blocker: a single automated reward that measures REAL correctness signals
 * for an emitted NC program — NOT the engine's own quality_score (which is circular).
 * This is the reward function HurcoV11 (and every post) fine-tuning scores against.
 *
 * Pure-static, no engine / no `dist/` build / no MCP. Composes 4 ORTHOGONAL components,
 * each normalized to [0,1], into a weighted reward:
 *   1. dialect-lint   — reuses scripts/post-nc-dialect-lint.mjs lintNc() (8 dialect+safety rules)
 *   2. structure      — required NC elements present (units / spindle / tool / retract / end)
 *   3. alarm-assoc    — emitted codes that appear in HIGH/CRITICAL alarms for the controller
 *                       family (data-driven from controller-alarm-database.json, 2,588 alarms)
 *   4. golden         — line-level similarity vs a golden reference NC (only when supplied)
 *
 * Exports scorePost(nc, {dialect, golden}) for the fine-tuning loop. CLI for ad-hoc + CI.
 *
 * Usage:
 *   node scripts/post-gen-reward.mjs <file.nc> [--dialect <name>] [--golden <ref.nc>] [--json]
 *   cat out.nc | node scripts/post-gen-reward.mjs --dialect hurco
 *
 * Exit: 0 reward >= threshold (default 0.6) · 3 reward < threshold · 2 bad invocation.
 * Authored 2026-05-29 by slot:echo (claude-223d9a61) — unblocks HurcoV11 master-post fine-tuning.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LINTER_URL = pathToFileURL(path.join(__dirname, "post-nc-dialect-lint.mjs")).href;
const ALARM_DB = path.join(__dirname, "..", "mcp-server", "src", "data", "controller-alarm-database.json");

const PASS_THRESHOLD = 0.6;
const STRUCT_GATE = 0.6; // below this fraction of required NC elements, the program is not valid → clamp
// dialect → alarm-DB controller-family key (byController is UPPERCASE family names)
const DIALECT_TO_FAMILY = {
  fanuc: "FANUC", "fanuc-generic": "FANUC", haas: "HAAS", hurco: "HURCO", mazak: "MAZAK",
  mitsubishi: "MITSUBISHI", brother: "BROTHER", doosan: "DOOSAN", fagor: "FAGOR",
  okuma: "OKUMA", siemens: "SIEMENS", heidenhain: "HEIDENHAIN", dmg_mori: "DMG_MORI",
};
// Universal, always-legitimate G/M codes. Alarm descriptions NAME these as CONTEXT
// ("alarm if G41 active without offset"), not as forbidden tokens — so their presence
// in a program is NOT evidence of a fault. Excluding them is what keeps the alarm
// signal from being anti-correlated with correctness (it otherwise penalized every
// tool change M06, cutter-comp G41/G42, tool-length G43, canned-return G99, etc.).
const UNIVERSAL_SAFE_CODES = new Set([
  "M00","M0","M01","M1","M02","M2","M03","M3","M04","M4","M05","M5","M06","M6",
  "M07","M7","M08","M8","M09","M9","M19","M29","M30","M48","M49","M98","M99",
  "G00","G0","G01","G1","G02","G2","G03","G3","G04","G4","G09","G17","G18","G19",
  "G20","G21","G28","G40","G41","G42","G43","G44","G49","G53","G54","G55","G56",
  "G57","G58","G59","G61","G64","G70","G71","G80","G81","G82","G83","G84","G85",
  "G86","G90","G91","G92","G94","G95","G96","G97","G98","G99",
]);

let _lintNc = null;
async function getLintNc() {
  if (_lintNc) return _lintNc;
  const mod = await import(LINTER_URL);
  _lintNc = mod.lintNc;
  return _lintNc;
}

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

// strip () and [] comments + block numbers for structure/golden normalization
function normalizeLine(line) {
  return String(line)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/^\s*\/?\s*N\d+\s*/i, "")
    .trim().toUpperCase().replace(/\s+/g, " ");
}

// ── component 2: structure completeness ─────────────────────────────────────
function structureScore(text, dialect) {
  const up = String(text).toUpperCase();
  const isTurning = /\bG9[67]\b/.test(up) || /\bG50\b[^\r\n]*\bS\d/.test(up);
  const isHeidenhain = /\bBEGIN\s+PGM\b/.test(up);
  // required elements (presence, not order) — order is lint's job
  const checks = [];
  if (isHeidenhain) {
    checks.push(["program-begin", /\bBEGIN\s+PGM\b/.test(up)]);
    checks.push(["program-end", /\bEND\s+PGM\b/.test(up)]);
    checks.push(["motion", /\bL\s|\bLP\b|\bCC\b|\bC\b/.test(up)]);
  } else {
    checks.push(["units", /\bG2[01]\b|\bG7[01]\b/.test(up)]);                 // G20/G21 or G70/G71
    checks.push(["spindle-start", /(?:^|[^A-Z0-9])M0?[34]\b/.test(up)]);       // M3/M4
    checks.push(["program-end", /(?:^|[^A-Z0-9])M30\b|(?:^|[^A-Z0-9])M0?2\b/.test(up)]);
    checks.push(["safe-retract", /\bG28\b|\bG53\b|(?:^|[^A-Z0-9])G0?0\b[^\r\n]*\bZ/.test(up)]);
    if (isTurning) checks.push(["css-or-rpm", /\bG9[67]\b/.test(up)]);
    else checks.push(["tool-change", /(?:^|[^A-Z0-9])M0?6\b|(?:^|[^A-Z0-9])T\d/.test(up)]);
  }
  const present = checks.filter((c) => c[1]).length;
  return { score: present / checks.length, present, total: checks.length, missing: checks.filter((c) => !c[1]).map((c) => c[0]) };
}

// ── component 3: alarm-association (data-driven from the 2,588-alarm DB) ─────
let _alarmIndex = null;
function loadAlarmIndex() {
  if (_alarmIndex) return _alarmIndex;
  _alarmIndex = {};
  try {
    const db = JSON.parse(readFileSync(ALARM_DB, "utf8"));
    for (const a of db.alarms || []) {
      const fam = a.controller_family;
      if (!fam) continue;
      // extract G/M codes literally named in HIGH/CRITICAL alarm name/desc/causes
      const sev = String(a.severity || "").toUpperCase();
      if (sev !== "HIGH" && sev !== "CRITICAL") continue;
      const blob = `${a.alarm_name || ""} ${a.description || ""} ${(a.causes || []).join(" ")}`;
      // only NON-UNIVERSAL codes carry signal — a universal code named in alarm text is
      // context, not a fault (see UNIVERSAL_SAFE_CODES). Filtering here means a family
      // whose only alarm-named codes are universal (DOOSAN M06, HAAS G99, …) ends up with
      // an empty index → null alarm score → excluded from the reward (not a dead +constant).
      const codes = (blob.match(/\b[GM]\d{1,3}(?:\.\d)?\b/g) || [])
        .map((c) => c.toUpperCase())
        .filter((c) => !UNIVERSAL_SAFE_CODES.has(c));
      if (!codes.length) continue;
      (_alarmIndex[fam] ||= {});
      for (const c of codes) (_alarmIndex[fam][c] ||= []).push(a.alarm_id || a.alarm_code);
    }
  } catch { _alarmIndex = {}; }
  return _alarmIndex;
}
// Returns score:null (NO usable signal → caller excludes it and renormalizes the other
// weights) for any family without non-universal code-bearing HIGH/CRITICAL alarms. In the
// shipped 2,588-alarm DB that is every family EXCEPT SIEMENS (G25/G26 speed/area limits) —
// notably HURCO and FANUC have none, so this component never dead-weights the HurcoV11 reward.
function alarmScore(text, dialect) {
  const fam = DIALECT_TO_FAMILY[dialect] || null;
  const idx = loadAlarmIndex();
  if (!fam || !idx[fam] || !Object.keys(idx[fam]).length) {
    return { score: null, family: fam, matches: [], note: "no non-universal code-bearing HIGH/CRITICAL alarms for family — alarm component excluded" };
  }
  const up = String(text).toUpperCase();
  const matches = [];
  for (const code of Object.keys(idx[fam])) {
    const re = new RegExp(`(?:^|[^A-Z0-9])${code.replace(".", "\\.")}\\b`);
    if (re.test(up)) matches.push({ code, alarms: idx[fam][code].slice(0, 3) });
  }
  // advisory, conservative: bounded penalty 0.1/match capped at 0.3
  const penalty = Math.min(0.3, matches.length * 0.1);
  return { score: 1 - penalty, family: fam, matches, note: "emitted NON-UNIVERSAL codes appearing in HIGH/CRITICAL alarm text (review)" };
}

// ── component 4: golden similarity (line-set Jaccard on normalized lines) ────
function goldenScore(text, golden) {
  const norm = (t) => new Set(String(t).split(/\r\n|\r|\n/).map(normalizeLine).filter(Boolean));
  const a = norm(text), b = norm(golden);
  if (a.size === 0 && b.size === 0) return { score: 1, jaccard: 1 };
  let inter = 0;
  for (const l of a) if (b.has(l)) inter++;
  const union = a.size + b.size - inter;
  const j = union === 0 ? 0 : inter / union;
  return { score: j, jaccard: j, lines_gen: a.size, lines_golden: b.size, shared: inter };
}

// ── main scorer ─────────────────────────────────────────────────────────────
export async function scorePost(nc, opts = {}) {
  const text = nc == null ? "" : String(nc);
  const lintNc = await getLintNc();
  let lint;
  try { lint = lintNc(text, { dialect: opts.dialect || "auto", filename: opts.filename }); }
  catch { lint = { dialect: opts.dialect || "unknown", counts: { ERROR: 0, WARN: 0, INFO: 0 }, findings: [] }; }
  const dialect = lint.dialect;
  const E = lint.counts.ERROR, W = lint.counts.WARN;
  const lintScore = clamp01(1 - 0.5 * E - 0.05 * W);

  const struct = structureScore(text, dialect);
  const alarm = alarmScore(text, dialect);
  const golden = (opts.golden != null) ? goldenScore(text, opts.golden) : null;

  // Component values; a null value (golden not supplied, or alarm has no usable family
  // signal) is DROPPED and its base weight redistributed across the rest — so an excluded
  // component is neutral, never a dead constant that flattens discrimination.
  const values = {
    golden: golden ? golden.score : null,
    lint: lintScore,
    structure: struct.score,
    alarm: alarm.score, // null for families without non-universal alarm codes (e.g. HURCO)
  };
  const baseWeights = golden
    ? { golden: 0.5, lint: 0.25, structure: 0.15, alarm: 0.1 }
    : { lint: 0.45, structure: 0.35, alarm: 0.2 };
  let wsum = 0;
  for (const k of Object.keys(baseWeights)) if (values[k] != null) wsum += baseWeights[k];
  const weights = {};
  let reward = 0;
  for (const k of Object.keys(baseWeights)) {
    if (values[k] == null) continue;
    weights[k] = wsum > 0 ? baseWeights[k] / wsum : 0;
    reward += values[k] * weights[k];
  }
  // Completeness gate: lint + alarm reward the ABSENCE of problems, which an empty or
  // truncated program trivially satisfies. An NC missing >40% of required structural
  // elements is not a valid program — clamp the reward by its structure score so
  // emptiness/garbage cannot pass on clean-lint alone.
  if (struct.score < STRUCT_GATE) reward *= struct.score;
  return {
    reward: Math.round(clamp01(reward) * 1000) / 1000,
    dialect,
    components: { lint: lintScore, structure: struct.score, alarm: alarm.score, golden: golden ? golden.score : null },
    weights,
    detail: { lint: { errors: E, warns: W, findings: lint.findings }, structure: struct, alarm, golden },
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { file: null, dialect: "auto", golden: null, json: false, threshold: PASS_THRESHOLD };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dialect") o.dialect = (argv[++i] || "auto").toLowerCase();
    else if (a === "--golden") o.golden = argv[++i];
    else if (a === "--json") o.json = true;
    else if (a === "--threshold") o.threshold = parseFloat(argv[++i]);
    else if (a === "--help" || a === "-h") o.help = true;
    else if (a.startsWith("--")) o.bad = a;
    else o.file = a;
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) { console.log("Usage: node scripts/post-gen-reward.mjs <file.nc> [--dialect <x>] [--golden <ref.nc>] [--json] [--threshold 0.6]"); process.exit(0); }
  if (o.bad) { console.error(`unknown flag: ${o.bad}`); process.exit(2); }
  let text;
  if (o.file) { if (!existsSync(o.file)) { console.error(`not found: ${o.file}`); process.exit(2); } text = readFileSync(o.file, "utf8"); }
  else { try { text = readFileSync(0, "utf8"); } catch { text = ""; } }
  let goldenText = null;
  if (o.golden) { if (!existsSync(o.golden)) { console.error(`golden not found: ${o.golden}`); process.exit(2); } goldenText = readFileSync(o.golden, "utf8"); }

  const res = await scorePost(text, { dialect: o.dialect, golden: goldenText, filename: o.file || "<stdin>" });
  if (o.json) {
    process.stdout.write(JSON.stringify({ schemaVersion: "1.0.0", ...res }, null, 2) + "\n");
  } else {
    const c = res.components;
    const alarmStr = c.alarm == null ? "n/a" : c.alarm.toFixed(3);
    console.log(`reward=${res.reward}  dialect=${res.dialect}`);
    console.log(`  lint=${c.lint.toFixed(3)} (E${res.detail.lint.errors}/W${res.detail.lint.warns})  structure=${c.structure.toFixed(3)} (${res.detail.structure.present}/${res.detail.structure.total}${res.detail.structure.missing.length ? " missing:" + res.detail.structure.missing.join(",") : ""})  alarm=${alarmStr}${res.detail.alarm.matches.length ? " (" + res.detail.alarm.matches.length + " alarm-assoc)" : ""}` + (c.golden != null ? `  golden=${c.golden.toFixed(3)}` : ""));
  }
  process.exit(res.reward >= o.threshold ? 0 : 3);
}

const invokedDirectly = process.argv[1] && /post-gen-reward\.mjs$/.test(process.argv[1].replace(/\\/g, "/"));
if (invokedDirectly) main().catch((e) => { console.error(String(e && e.message || e)); process.exit(2); });
