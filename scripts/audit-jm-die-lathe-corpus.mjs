#!/usr/bin/env node
/**
 * audit-jm-die-lathe-corpus.mjs — batch audit runner for V2 lathe variants
 *
 * Walks `H:/PRISM/JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/<machine>/*.nc`,
 * runs the LatheProgramAuditPipelineEngine (Stage A code audit + Stage B move
 * extraction + Stage C envelope-collision screen) on each variant, and
 * emits an aggregated dashboard.
 *
 * Closes /goal #5 part 2 — "assess, analyze and test each program against
 * our collision avoidance systems and code auditing capabilities".
 *
 * Output
 *   state/shared/dashboards/jm-die-lathe-audit-dashboard.json  full per-variant rows
 *   state/shared/dashboards/jm-die-lathe-audit-dashboard.md    operator-readable summary
 *
 * CLI
 *   node scripts/audit-jm-die-lathe-corpus.mjs                   full sweep
 *   node scripts/audit-jm-die-lathe-corpus.mjs --customer ITW   single customer
 *   node scripts/audit-jm-die-lathe-corpus.mjs --limit 50       cap variants
 *   node scripts/audit-jm-die-lathe-corpus.mjs --machine LTH-06 single machine
 *
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-BATCH
 */

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const SOURCE_ROOT = "H:/PRISM/JM DIE/CNC LATHE";
const OUTPUT_DIR = "H:/prism/state/shared/dashboards";
const MARKER = "PRISM_UPGRADED";

// Per-machine envelopes for the 7 JM Die Okuma lathes — keyed by the EXACT
// machineModel string the V2 upgrader writes (matches JM_DIE_LATHES in
// JMDieLatheProgramUpgraderEngine.ts). Envelopes from operator-vetted Okuma
// nameplate specs. Conservative clearance_warning to surface near-misses
// early. Updated 2026-05-24 (whiskey iter12) — prior keys mismatched the
// canonical engine inventory and silently dropped 5 of 7 machines from audit.
const LATHE_ENVELOPES = {
  // LTH-01: GENOS L300-M (mid-size mill-turn lathe, ~400mm swing)
  "Okuma_GENOS_L300-M":      { machineId: "LTH-01", x_min_mm: 0, x_max_mm: 400, z_min_mm: -10, z_max_mm: 700,  chuck_z_mm: 0,                  clearance_warning_mm: 5 },
  // LTH-02: GENOS L200E-M (compact 2-axis, ~250mm swing)
  "Okuma_GENOS_L200E-M":     { machineId: "LTH-02", x_min_mm: 0, x_max_mm: 250, z_min_mm: -10, z_max_mm: 600,  chuck_z_mm: 0,                  clearance_warning_mm: 3 },
  // LTH-03: LNC8 (small production lathe, ~200mm swing)
  "Okuma_LNC8":              { machineId: "LTH-03", x_min_mm: 0, x_max_mm: 200, z_min_mm: -10, z_max_mm: 525,  chuck_z_mm: 0,                  clearance_warning_mm: 3 },
  // LTH-04: LB-3000EX (long-bed lathe, ~380mm swing)
  "Okuma_LB-3000EX":         { machineId: "LTH-04", x_min_mm: 0, x_max_mm: 380, z_min_mm: -10, z_max_mm: 1000, chuck_z_mm: 0, tail_z_mm: 950,  clearance_warning_mm: 5 },
  // LTH-05: LB-3000EX_II (long-bed lathe gen-II, ~380mm swing)
  "Okuma_LB-3000EX_II":      { machineId: "LTH-05", x_min_mm: 0, x_max_mm: 380, z_min_mm: -10, z_max_mm: 1000, chuck_z_mm: 0, tail_z_mm: 950,  clearance_warning_mm: 5 },
  // LTH-06: LB-3000EX-BigBore (large-swing variant, ~460mm swing)
  "Okuma_LB-3000EX-BigBore": { machineId: "LTH-06", x_min_mm: 0, x_max_mm: 460, z_min_mm: -10, z_max_mm: 1250, chuck_z_mm: 0, tail_z_mm: 1200, clearance_warning_mm: 5 },
  // LTH-07: Multus B250II (mill-turn, ~380mm swing)
  "Okuma_Multus_B250II":     { machineId: "LTH-07", x_min_mm: 0, x_max_mm: 380, z_min_mm: -10, z_max_mm: 900,  chuck_z_mm: 0, tail_z_mm: 850,  clearance_warning_mm: 5 },
};

function parseArgs(argv) {
  const args = { customer: null, machine: null, limit: null, verbose: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--customer") args.customer = argv[++i];
    else if (argv[i] === "--machine") args.machine = argv[++i];
    else if (argv[i] === "--limit") args.limit = parseInt(argv[++i], 10);
    else if (argv[i] === "--verbose") args.verbose = true;
  }
  return args;
}

function safeReaddir(d) { try { return readdirSync(d, { withFileTypes: true }); } catch { return null; } }

function* walkVariants(args) {
  const customers = safeReaddir(SOURCE_ROOT);
  if (!customers) return;
  for (const c of customers) {
    if (!c.isDirectory()) continue;
    if (args.customer && c.name !== args.customer) continue;
    const upDir = join(SOURCE_ROOT, c.name, MARKER);
    const machines = safeReaddir(upDir);
    if (!machines) continue;
    for (const m of machines) {
      if (!m.isDirectory()) continue;
      if (args.machine && !m.name.includes(args.machine)) continue;
      const envelope = LATHE_ENVELOPES[m.name];
      if (!envelope) continue; // unknown machine model, skip
      const mDir = join(upDir, m.name);
      const files = safeReaddir(mDir);
      if (!files) continue;
      for (const f of files) {
        if (!f.isFile() || !f.name.endsWith(".nc")) continue;
        yield {
          variantPath: join(mDir, f.name),
          partNumber: f.name.replace(/\.nc$/i, ""),
          machineModel: m.name,
          machineId: envelope.machineId,
          envelope,
          customer: c.name,
        };
      }
    }
  }
}

async function loadAuditPipeline() {
  const mod = await import("../mcp-server/src/engines/LatheProgramAuditPipelineEngine.js")
    .catch(() => import("../mcp-server/src/engines/LatheProgramAuditPipelineEngine.ts"));
  return mod.LatheProgramAuditPipelineEngine ?? mod.latheProgramAuditPipelineEngine;
}

function ensureDir(p) { try { mkdirSync(dirname(p), { recursive: true }); } catch {} }

function makeAggregate() {
  return {
    schemaVersion: "1.0.0",
    asOf: new Date().toISOString(),
    counts: {
      audited: 0,
      pass: 0,
      pass_with_notes: 0,
      warn: 0,
      fail: 0,
      no_motion_moves: 0,
    },
    perMachine: {},
    perRule: { collision_count: 0, near_miss_count: 0, critical: 0, high: 0, medium: 0 },
    topFailures: [], // capped list of worst variants
    worstByMachine: {}, // first FAIL per machine for sample evidence
  };
}

function updateAggregate(agg, row) {
  agg.counts.audited++;
  const v = row.verdict;
  agg.counts[v] = (agg.counts[v] || 0) + 1;
  if (row.warnings?.includes("no_motion_moves_parsed")) agg.counts.no_motion_moves++;
  const mk = row.machineId;
  if (!agg.perMachine[mk]) agg.perMachine[mk] = { audited: 0, pass: 0, pass_with_notes: 0, warn: 0, fail: 0, collisions: 0, near_misses: 0 };
  agg.perMachine[mk].audited++;
  agg.perMachine[mk][v] = (agg.perMachine[mk][v] || 0) + 1;
  agg.perMachine[mk].collisions += row.stageC.collision_count;
  agg.perMachine[mk].near_misses += row.stageC.near_miss_count;
  agg.perRule.collision_count += row.stageC.collision_count;
  agg.perRule.near_miss_count += row.stageC.near_miss_count;
  agg.perRule.critical += row.stageA.critical.length;
  agg.perRule.high += row.stageA.high.length;
  agg.perRule.medium += row.stageA.medium.length;
  if (v === "fail") {
    agg.topFailures.push({
      variantPath: row.variantPath,
      machineId: row.machineId,
      partNumber: row.partNumber,
      score: row.score,
      collisions: row.stageC.collision_count,
      stageA_critical: row.stageA.critical.length,
      first_collision: row.stageC.details[0],
    });
    if (!agg.worstByMachine[mk]) agg.worstByMachine[mk] = agg.topFailures[agg.topFailures.length - 1];
  }
}

function finalizeAggregate(agg) {
  agg.topFailures.sort((a, b) => a.score - b.score || b.collisions - a.collisions);
  agg.topFailures = agg.topFailures.slice(0, 50);
  return agg;
}

function renderMarkdown(agg) {
  const ratePct = (n) => agg.counts.audited === 0 ? "0.0%" : ((100 * n) / agg.counts.audited).toFixed(1) + "%";
  const lines = [];
  lines.push("# JM Die Lathe Variant Audit Dashboard");
  lines.push(`Generated: ${agg.asOf}  ·  Engine: LatheProgramAuditPipelineEngine v1.0.0`);
  lines.push("");
  lines.push("## Verdict counts");
  lines.push(`- audited:        ${agg.counts.audited}`);
  lines.push(`- pass:           ${agg.counts.pass} (${ratePct(agg.counts.pass)})`);
  lines.push(`- pass_with_notes:${agg.counts.pass_with_notes} (${ratePct(agg.counts.pass_with_notes)})`);
  lines.push(`- warn:           ${agg.counts.warn} (${ratePct(agg.counts.warn)})`);
  lines.push(`- fail:           ${agg.counts.fail} (${ratePct(agg.counts.fail)})`);
  lines.push(`- no-motion-moves: ${agg.counts.no_motion_moves} (parsed nothing; non-G-code or header-only)`);
  lines.push("");
  lines.push("## Findings totals");
  lines.push(`- Stage-A critical: ${agg.perRule.critical}`);
  lines.push(`- Stage-A high:     ${agg.perRule.high}`);
  lines.push(`- Stage-A medium:   ${agg.perRule.medium}`);
  lines.push(`- Stage-C collisions: ${agg.perRule.collision_count}`);
  lines.push(`- Stage-C near_miss:  ${agg.perRule.near_miss_count}`);
  lines.push("");
  lines.push("## Per-machine breakdown");
  lines.push("| Machine | Audited | Pass | Warn | Fail | Collisions | Near-miss |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const [mk, m] of Object.entries(agg.perMachine).sort()) {
    lines.push(`| ${mk} | ${m.audited} | ${m.pass + m.pass_with_notes} | ${m.warn} | ${m.fail} | ${m.collisions} | ${m.near_misses} |`);
  }
  lines.push("");
  lines.push("## Worst 20 failures (lowest score first)");
  lines.push("| Score | Machine | Part | Collisions | First-rule | Line | Variant |");
  lines.push("|---:|---|---|---:|---|---:|---|");
  for (const f of agg.topFailures.slice(0, 20)) {
    const fc = f.first_collision;
    const rule = fc?.rule ?? "—";
    const line = fc?.line ?? "—";
    lines.push(`| ${f.score} | ${f.machineId} | ${f.partNumber} | ${f.collisions} | ${rule} | ${line} | ${f.variantPath.split(/[\\/]/).slice(-3).join("/")} |`);
  }
  lines.push("");
  lines.push("**Operator should NOT load any FAIL variant onto the shop floor until the underlying rule is addressed in the upgrader (Stage-A) or the program is re-fixtured to fit the envelope (Stage-C).**");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const AuditPipeline = await loadAuditPipeline();
  if (!AuditPipeline) { console.error("FATAL: audit pipeline engine not loadable"); process.exit(2); }

  console.log(`Auditing ${SOURCE_ROOT}${args.customer ? ` filter=${args.customer}` : ""}${args.machine ? ` machine=${args.machine}` : ""}${args.limit ? ` limit=${args.limit}` : ""}...`);
  const agg = makeAggregate();
  const rows = [];
  const allCounts = { read_fail: 0, audit_fail: 0 };
  let counter = 0;
  const startMs = Date.now();
  for (const v of walkVariants(args)) {
    if (args.limit && counter >= args.limit) break;
    counter++;
    let text;
    try { text = readFileSync(v.variantPath, "utf8"); } catch { allCounts.read_fail++; continue; }
    let audit;
    try {
      audit = AuditPipeline.auditOne({
        variantPath: v.variantPath,
        programText: text,
        partNumber: v.partNumber,
        machineId: v.machineId,
        machineModel: v.machineModel,
        envelope: v.envelope,
      });
    } catch (e) {
      allCounts.audit_fail++;
      if (args.verbose) console.error(`audit failed for ${v.variantPath}: ${e?.message ?? e}`);
      continue;
    }
    updateAggregate(agg, audit);
    // Keep per-variant detail compact (drop stageA.medium full list for dashboard).
    rows.push({
      variantPath: audit.variantPath,
      partNumber: audit.partNumber,
      machineId: audit.machineId,
      machineModel: audit.machineModel,
      verdict: audit.verdict,
      score: audit.score,
      stageA_counts: { critical: audit.stageA.critical.length, high: audit.stageA.high.length, medium: audit.stageA.medium.length },
      stageC_counts: { collision: audit.stageC.collision_count, near_miss: audit.stageC.near_miss_count, min_clearance_mm: audit.stageC.min_clearance_mm },
      move_count: audit.stageB.move_count,
      warnings: audit.warnings,
    });
    if (counter % 1000 === 0) {
      const rate = counter / ((Date.now() - startMs) / 1000);
      console.log(`  audited ${counter} (${rate.toFixed(1)}/sec) — pass=${agg.counts.pass} fail=${agg.counts.fail} warn=${agg.counts.warn}`);
    }
  }
  finalizeAggregate(agg);

  ensureDir(join(OUTPUT_DIR, "x.txt"));
  const jsonPath = join(OUTPUT_DIR, "jm-die-lathe-audit-dashboard.json");
  const mdPath = join(OUTPUT_DIR, "jm-die-lathe-audit-dashboard.md");
  writeFileSync(jsonPath, JSON.stringify({ aggregate: agg, rows, read_failures: allCounts.read_fail, audit_failures: allCounts.audit_fail }, null, 2));
  writeFileSync(mdPath, renderMarkdown(agg));

  console.log(`\nAudit complete.`);
  console.log(`  audited:    ${agg.counts.audited}`);
  console.log(`  pass:       ${agg.counts.pass}`);
  console.log(`  pass_notes: ${agg.counts.pass_with_notes}`);
  console.log(`  warn:       ${agg.counts.warn}`);
  console.log(`  fail:       ${agg.counts.fail}`);
  console.log(`  read_fail:  ${allCounts.read_fail}`);
  console.log(`  audit_fail: ${allCounts.audit_fail}`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  MD:   ${mdPath}`);
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
