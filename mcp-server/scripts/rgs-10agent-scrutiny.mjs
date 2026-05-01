#!/usr/bin/env node
/**
 * RGS 10-Agent Scrutiny — deterministic Stage 10 quality gate across every
 * non-complete milestone envelope in data/roadmap-index.json.
 *
 * Scores each milestone 0-100 on 10 dimensions per the /rgs spec:
 *   A1 Protocol Structure   A6 Physics Rigor
 *   A2 Unit Naming          A7 Forge-Triple Ownership
 *   A3 Dependency Graph     A8 Feature Cascade
 *   A4 Exit Gate Rigor      A9 MCP Utilization
 *   A5 Completeness         A10 Cross-Roadmap Coherence
 *
 * Thresholds: avg≥80 PASS · 70-79 CONDITIONAL · <70 FAIL · any agent<40 BLOCK
 *
 * Writes JSON report + Markdown summary to data/state/.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("data");
const INDEX = path.join(ROOT, "roadmap-index.json");
const MSDIR = path.join(ROOT, "milestones");
const OUT_JSON = path.join(ROOT, "state", "RGS_SCRUTINY_REPORT.json");
const OUT_MD = path.join(ROOT, "state", "RGS_SCRUTINY_REPORT.md");

const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const queue = index.milestones.filter((m) => m.status !== "complete");

const reports = [];

function loadEnvelope(entry) {
  const p = entry.envelope_path ? path.join(ROOT, entry.envelope_path) : null;
  if (!p || !fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function allUnits(env) {
  const units = [];
  if (env.phases && Array.isArray(env.phases)) {
    for (const ph of env.phases) {
      if (Array.isArray(ph.units)) for (const u of ph.units) units.push(u);
    }
  }
  if (Array.isArray(env.units)) for (const u of env.units) units.push(u);
  return units;
}

// ── A1 Protocol Structure (SMART, KNOWLEDGE, INTENT, EXIT GATE, SKILLS, PLUGINS, MCP_LIFECYCLE, four_loop, compact)
function scoreA1(env) {
  let s = 0;
  const units = allUnits(env);
  if (env.phases && env.phases.length > 0) s += 20;
  if (units.length > 0) s += 20;
  if (env.brief || env.description) s += 10;
  if (env.mcp_lifecycle || env.smart_config) s += 15;
  if (env.knowledge_sources || env.knowledge) s += 10;
  if (env.exit_gate || env.exit_conditions) s += 10;
  if (env.forge_triple) s += 10;
  if (env.compact_checkpoint !== undefined || env.compaction) s += 5;
  return Math.min(100, s);
}

// ── A2 Unit Naming (U-{PREFIX}{NN} vs bare U01)
function scoreA2(env) {
  const units = allUnits(env);
  if (units.length === 0) return 40;
  let good = 0;
  let bare = 0;
  const ids = new Set();
  let dup = 0;
  for (const u of units) {
    const id = u.id || "";
    if (ids.has(id)) dup++;
    ids.add(id);
    if (/^U-[A-Z0-9]+\d{2,}$/.test(id)) good++;
    else if (/^U\d+$/i.test(id)) bare++;
  }
  const goodRatio = good / units.length;
  const bareRatio = bare / units.length;
  let s = 100 * goodRatio;
  s -= 30 * bareRatio; // bare U01 is a known anti-pattern
  s -= 20 * (dup / Math.max(1, units.length));
  return Math.max(0, Math.min(100, Math.round(s + 40 * (1 - goodRatio - bareRatio))));
}

// ── A3 Dependency Graph (depends_on validity, no circular, index/envelope agreement)
function scoreA3(env, entry, allEnvIds) {
  let s = 70; // baseline: assume OK unless we spot a defect
  const units = allUnits(env);
  const uids = new Set(units.map((u) => u.id));
  let badDeps = 0;
  for (const u of units) {
    if (Array.isArray(u.depends_on)) {
      for (const d of u.depends_on) if (!uids.has(d)) badDeps++;
    }
  }
  if (Array.isArray(env.dependencies)) {
    for (const d of env.dependencies) if (!allEnvIds.has(d)) badDeps += 2;
  }
  const idxDeps = Array.isArray(entry.dependencies) ? entry.dependencies : [];
  const envDeps = Array.isArray(env.dependencies) ? env.dependencies : [];
  if (idxDeps.length !== envDeps.length) s -= 10;
  s -= Math.min(40, badDeps * 5);
  if (units.length > 0 && units.every((u) => !u.depends_on)) s += 20; // all independent = OK
  return Math.max(0, Math.min(100, s));
}

// ── A4 Exit Gate Rigor (≥3 measurable exit_conditions per unit, abort_criteria present)
function scoreA4(env) {
  const units = allUnits(env);
  if (units.length === 0) return 30;
  let tot = 0;
  let vague = 0;
  for (const u of units) {
    const ec = u.exit_conditions || u.exit_criteria || [];
    const count = Array.isArray(ec) ? ec.length : 0;
    tot += Math.min(3, count); // 3 points max per unit
    for (const c of ec) {
      if (typeof c === "string" && /(something|works|done|correct|ok)$/i.test(c.trim())) vague++;
    }
  }
  const avg = tot / Math.max(1, units.length); // 0..3
  let s = (avg / 3) * 100;
  s -= Math.min(30, vague * 3);
  return Math.max(0, Math.min(100, Math.round(s)));
}

// ── A5 Completeness (brief→units coverage signal via count + description depth)
function scoreA5(env) {
  const units = allUnits(env);
  if (units.length === 0) return 20;
  let hasDesc = 0;
  for (const u of units) if (typeof u.description === "string" && u.description.length > 40) hasDesc++;
  const ratio = hasDesc / units.length;
  let s = 40 + ratio * 60;
  if ((env.brief || env.description || "").length < 60) s -= 15;
  return Math.max(0, Math.min(100, Math.round(s)));
}

// ── A6 Physics Rigor (only penalize if physics-related; reward snapshot-diff mention)
function scoreA6(env) {
  const text = JSON.stringify(env).toLowerCase();
  const physicsRelated = /kienzle|taylor|physics|force|chatter|thermal|johnson.cook|ra_um|atomicvalue|constants\.ts/.test(text);
  if (!physicsRelated) return 85; // N/A → neutral-positive
  let s = 60;
  if (/snapshot|pre.?post|diff/.test(text)) s += 20;
  if (/atomicvalue|\{value[, ]*unit[, ]*source\}/.test(text)) s += 10;
  if (/machinist.{0,30}accept/.test(text)) s += 10;
  if (/inline.{0,30}constant|constants\.ts/.test(text)) s += 5;
  return Math.max(0, Math.min(100, s));
}

// ── A7 Forge-Triple Ownership (hook + action + skill declared OR marked DECLARED/BUILT/CONSUMED)
function scoreA7(env) {
  const text = JSON.stringify(env).toLowerCase();
  let s = 50;
  if (env.forge_triple) s += 30;
  if (/hook\s*:/.test(text) || /new_hooks?/.test(text)) s += 10;
  if (/mcp.{0,10}action|dispatcher.{0,10}action/.test(text)) s += 5;
  if (/skill\s*:|slash.?command/.test(text)) s += 5;
  if (/declared|built|consumed/.test(text)) s += 10;
  return Math.max(0, Math.min(100, s));
}

// ── A8 Feature Cascade (available_to, new_*, downstream consumers)
function scoreA8(env) {
  const text = JSON.stringify(env);
  let s = 50;
  if (/available_to/i.test(text)) s += 20;
  if (/feature_cascade|new_hooks|new_actions|new_skills/i.test(text)) s += 20;
  if (/downstream/i.test(text)) s += 10;
  return Math.max(0, Math.min(100, s));
}

// ── A9 MCP Utilization (SKILLS, PLUGINS, mcp_lifecycle per session)
function scoreA9(env) {
  const text = JSON.stringify(env);
  let s = 40;
  if (/mcp_lifecycle|context_boot|dispatcher_map|memory_recall|auto_checkpoint/i.test(text)) s += 30;
  if (/skills\s*:|SKILLS|\/\w+/i.test(text)) s += 10;
  if (/plugins?\s*:|vitest|eslint|codebase.memory/i.test(text)) s += 10;
  if (/prism_\w+:/.test(text)) s += 10;
  return Math.max(0, Math.min(100, s));
}

// ── A10 Cross-Roadmap Coherence (no duplicate ids, track declared, cross-track deps noted)
function scoreA10(env, entry, seenIds) {
  let s = 80;
  if (seenIds.has(env.id)) s -= 30;
  seenIds.add(env.id);
  if (!entry.track) s -= 15;
  const text = JSON.stringify(env).toLowerCase();
  if (/cross.track|qa.ms|sys.ms/.test(text)) s += 10;
  if (!entry.total_units || entry.total_units === 0) s -= 15;
  return Math.max(0, Math.min(100, s));
}

const allEnvIds = new Set(index.milestones.map((m) => m.id));
const seenIds = new Set();

for (const entry of queue) {
  const env = loadEnvelope(entry);
  if (!env) {
    reports.push({
      id: entry.id,
      track: entry.track,
      status: entry.status,
      missing_envelope: true,
      avg: 0,
      scores: {},
    });
    continue;
  }
  const scores = {
    A1_protocol: scoreA1(env),
    A2_naming: scoreA2(env),
    A3_deps: scoreA3(env, entry, allEnvIds),
    A4_exit: scoreA4(env),
    A5_completeness: scoreA5(env),
    A6_physics: scoreA6(env),
    A7_forge: scoreA7(env),
    A8_cascade: scoreA8(env),
    A9_mcp: scoreA9(env),
    A10_coherence: scoreA10(env, entry, seenIds),
  };
  const vals = Object.values(scores);
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const min = Math.min(...vals);
  const verdict =
    min < 40 ? "BLOCK" :
    avg >= 80 ? "PASS" :
    avg >= 70 ? "CONDITIONAL" : "FAIL";
  reports.push({
    id: env.id || entry.id,
    track: entry.track,
    status: entry.status,
    total_units: entry.total_units || allUnits(env).length,
    scores,
    avg,
    min,
    verdict,
  });
}

// ── Aggregate
const buckets = { PASS: 0, CONDITIONAL: 0, FAIL: 0, BLOCK: 0 };
for (const r of reports) if (r.verdict) buckets[r.verdict]++;

// Sort worst first
const sorted = [...reports].sort((a, b) => (a.avg || 0) - (b.avg || 0));
const worst10 = sorted.slice(0, 10);
const dimensionAverages = {};
const dims = ["A1_protocol", "A2_naming", "A3_deps", "A4_exit", "A5_completeness", "A6_physics", "A7_forge", "A8_cascade", "A9_mcp", "A10_coherence"];
for (const d of dims) {
  const vals = reports.filter((r) => r.scores && typeof r.scores[d] === "number").map((r) => r.scores[d]);
  dimensionAverages[d] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

const out = {
  schemaVersion: 1,
  generated_at: new Date().toISOString(),
  total_non_complete: queue.length,
  evaluated: reports.length,
  missing_envelopes: reports.filter((r) => r.missing_envelope).length,
  verdict_buckets: buckets,
  dimension_averages: dimensionAverages,
  worst_10: worst10,
  all: reports,
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));

// ── Markdown summary
const md = [];
md.push("# RGS 10-Agent Scrutiny Report");
md.push("");
md.push(`Generated: ${out.generated_at}`);
md.push(`Evaluated: ${out.evaluated} / ${out.total_non_complete} non-complete milestones`);
md.push(`Missing envelopes: ${out.missing_envelopes}`);
md.push("");
md.push("## Verdict Distribution");
md.push("| Verdict | Count |");
md.push("|---------|-------|");
for (const [k, v] of Object.entries(buckets)) md.push(`| ${k} | ${v} |`);
md.push("");
md.push("## Dimension Averages (all evaluated milestones)");
md.push("| Dimension | Avg Score |");
md.push("|-----------|-----------|");
for (const [d, v] of Object.entries(dimensionAverages)) md.push(`| ${d} | ${v} |`);
md.push("");
md.push("## Worst 10 (lowest average — fix first)");
md.push("| ID | Track | Avg | Min | Verdict | Weakest |");
md.push("|----|-------|-----|-----|---------|---------|");
for (const w of worst10) {
  let weakest = "n/a";
  if (w.scores && Object.keys(w.scores).length > 0) {
    const pairs = Object.entries(w.scores).sort((a, b) => a[1] - b[1]);
    if (pairs.length > 0) weakest = pairs[0][0] + "=" + pairs[0][1];
  }
  md.push(`| ${w.id} | ${w.track || "?"} | ${w.avg ?? "-"} | ${w.min ?? "-"} | ${w.verdict ?? "MISSING"} | ${weakest} |`);
}
md.push("");
md.push("## By-Track Summary");
const byTrack = {};
for (const r of reports) {
  const t = r.track || "?";
  if (!byTrack[t]) byTrack[t] = { count: 0, sum: 0, pass: 0, cond: 0, fail: 0, block: 0, missing: 0 };
  byTrack[t].count++;
  if (r.missing_envelope) { byTrack[t].missing++; continue; }
  byTrack[t].sum += r.avg;
  if (r.verdict === "PASS") byTrack[t].pass++;
  else if (r.verdict === "CONDITIONAL") byTrack[t].cond++;
  else if (r.verdict === "FAIL") byTrack[t].fail++;
  else if (r.verdict === "BLOCK") byTrack[t].block++;
}
md.push("| Track | N | Avg | PASS | COND | FAIL | BLOCK | MISSING |");
md.push("|-------|---|-----|------|------|------|-------|---------|");
for (const [t, b] of Object.entries(byTrack).sort((a, b) => (b[1].sum / b[1].count || 0) - (a[1].sum / a[1].count || 0))) {
  const avg = b.count > b.missing ? Math.round(b.sum / (b.count - b.missing)) : 0;
  md.push(`| ${t} | ${b.count} | ${avg} | ${b.pass} | ${b.cond} | ${b.fail} | ${b.block} | ${b.missing} |`);
}
md.push("");
fs.writeFileSync(OUT_MD, md.join("\n"));

console.log(`Evaluated ${out.evaluated} milestones`);
console.log(`Verdicts:`, buckets);
console.log(`Dimension averages:`, dimensionAverages);
console.log(`Report JSON: ${OUT_JSON}`);
console.log(`Report MD:   ${OUT_MD}`);
