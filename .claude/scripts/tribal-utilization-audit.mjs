#!/usr/bin/env node
/**
 * tribal-utilization-audit.mjs — diagnostic for the tribal × Obsidian × system-viz trio
 *
 * Reports the gaps that the round-2 knowledge-memory scrutiny agent confirmed:
 *
 *   1. Tribal-embed-index coverage  (entries / total tribal-tip files)
 *   2. Citation-log activity        (recent fires + zero-citation tip count)
 *   3. Customer-tag coverage        (how many tips have a customer: frontmatter field)
 *   4. Obsidian mirror status       (env var + script presence)
 *   5. /system-viz tribal density   (per-domain join: tribal density vs viz wired count)
 *
 * Output:
 *   - state/shared/tribal-utilization-report.json (full machine-readable)
 *   - human summary on stdout (omit with --json)
 *
 * Flags:
 *   --json              machine-readable to stdout
 *   --recent-days <N>   citation-log window (default 7)
 *
 * The intent is to expose the actual utilization shape so the rgs6 next pass
 * can prioritize fixes (full embed sweep, customer backfill, OBSIDIAN_VAULT
 * configuration). No mutation — read-only diagnostic.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PRISM = "H:/prism";
const TRIBAL_DIR = `${PRISM}/knowledge/tribal`;
const TRIBAL_INDEX = `${PRISM}/state/shared/tribal-embed-index.json`;
const CITATION_LOG = `${PRISM}/state/shared/tribal-citation-log.jsonl`;
const MEMORIES_DIR = `${PRISM}/knowledge/memories`;
const OBSIDIAN_MIRROR = `${PRISM}/.claude/scripts/tribal-obsidian-mirror.mjs`;
const SYSTEM_VIZ_QUERY = `${PRISM}/scripts/system-viz-query.mjs`;
const REPORT = `${PRISM}/state/shared/tribal-utilization-report.json`;

const DEFAULT_RECENT_DAYS = 7;
const MS_PER_DAY = 86_400_000;
const FRONTMATTER_HEAD_LINES = 30;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      o[k] = v;
    }
  }
  return o;
}

function safeJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; }
}

function readJSONL(p) {
  if (!fs.existsSync(p)) return [];
  const out = [];
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return out;
}

function listTribalTipFiles() {
  if (!fs.existsSync(TRIBAL_DIR)) return [];
  return fs.readdirSync(TRIBAL_DIR).filter(f => f.endsWith(".md"));
}

function readFrontmatterHead(filePath) {
  try {
    const buf = fs.readFileSync(filePath, "utf8").split(/\r?\n/).slice(0, FRONTMATTER_HEAD_LINES);
    return buf.join("\n");
  } catch { return ""; }
}

function tipHasCustomerField(filename) {
  const head = readFrontmatterHead(path.join(TRIBAL_DIR, filename));
  return /^customer:\s*\S+/m.test(head);
}

function tipDomainHint(filename) {
  // Cheap classifier — read first 30 lines, look for domain: line OR keyword in filename
  const head = readFrontmatterHead(path.join(TRIBAL_DIR, filename));
  const m = head.match(/^domain:\s*(\S+)/m);
  if (m) return m[1].toLowerCase().replace(/['"]/g, "");
  const lower = filename.toLowerCase();
  if (/wedm|edm/.test(lower)) return "edm";
  if (/lathe|turn|okuma/.test(lower)) return "lathe";
  if (/mill|hsm/.test(lower)) return "mill";
  if (/cad|cam/.test(lower)) return "cam";
  if (/grind/.test(lower)) return "grinding";
  return "general";
}

function indexCoverage() {
  const idx = safeJSON(TRIBAL_INDEX, null);
  const tipFiles = listTribalTipFiles();
  const indexEntries = (idx?.entries || []).length;
  const tipFileCount = tipFiles.length;
  return {
    indexed_entries: indexEntries,
    tip_files: tipFileCount,
    coverage_pct: tipFileCount > 0 ? Math.round((indexEntries / tipFileCount) * 1000) / 10 : 0,
    index_generatedAt: idx?.generatedAt || null,
    schemaVersion: idx?.schemaVersion || null,
  };
}

function citationActivity(recentDays) {
  const records = readJSONL(CITATION_LOG);
  const cutoff = Date.now() - recentDays * MS_PER_DAY;
  let recent = 0;
  const idHits = new Map();
  for (const r of records) {
    const ts = r.ts ? Date.parse(r.ts) : null;
    if (ts && ts >= cutoff) recent++;
    for (const hit of r.hits || []) {
      const id = hit.id || hit.path || JSON.stringify(hit).slice(0, 60);
      idHits.set(id, (idHits.get(id) || 0) + 1);
    }
  }
  const tipFiles = listTribalTipFiles();
  const everCited = idHits.size;
  return {
    citations_total: records.length,
    citations_recent: recent,
    recent_window_days: recentDays,
    tips_ever_cited: everCited,
    tips_zero_citation: Math.max(0, tipFiles.length - everCited),
    top_cited: [...idHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, n]) => ({ id, hits: n })),
  };
}

function customerCoverage() {
  const tipFiles = listTribalTipFiles();
  let withCustomer = 0;
  // Sampling, not full read — bounded I/O for the audit. Read all only if N <= 1500.
  const sampleSize = Math.min(tipFiles.length, 1500);
  const sample = tipFiles.slice(0, sampleSize);
  for (const f of sample) {
    if (tipHasCustomerField(f)) withCustomer++;
  }
  const sampledPct = sampleSize > 0 ? Math.round((withCustomer / sampleSize) * 1000) / 10 : 0;
  return {
    sampled_files: sampleSize,
    total_files: tipFiles.length,
    sampled_with_customer: withCustomer,
    sampled_customer_pct: sampledPct,
    extrapolated_with_customer_estimate: Math.round(tipFiles.length * sampledPct / 100),
  };
}

function obsidianMirrorStatus() {
  const env = process.env.OBSIDIAN_VAULT || null;
  const envExists = env ? fs.existsSync(env) : false;
  const memoriesDirExists = fs.existsSync(MEMORIES_DIR);
  const memoriesSubdirs = memoriesDirExists ? fs.readdirSync(MEMORIES_DIR).filter(f => fs.statSync(path.join(MEMORIES_DIR, f)).isDirectory()).length : 0;
  return {
    OBSIDIAN_VAULT_env: env,
    env_path_exists: envExists,
    mirror_script_exists: fs.existsSync(OBSIDIAN_MIRROR),
    mirror_script_path: OBSIDIAN_MIRROR,
    in_repo_memories_dir_exists: memoriesDirExists,
    in_repo_memories_subdirs: memoriesSubdirs,
    note: env
      ? "OBSIDIAN_VAULT set — mirror can run if env path exists and mirror script is present."
      : "OBSIDIAN_VAULT unset — mirror cannot run; in-repo knowledge/memories/ is the only 2nd brain surface.",
  };
}

function vizDomainCoverage() {
  if (!fs.existsSync(SYSTEM_VIZ_QUERY)) {
    return { ok: false, error: "system-viz-query.mjs missing" };
  }
  const r = spawnSync(process.execPath, [SYSTEM_VIZ_QUERY, "coverage-by-domain", "--json"], {
    encoding: "utf8",
    timeout: 10_000,
    cwd: PRISM,
  });
  if (r.status !== 0) return { ok: false, error: `viz-query exit=${r.status}`, stderr: (r.stderr || "").slice(0, 200) };
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch { return { ok: false, error: "viz-query output not JSON" }; }
  return { ok: true, domains: parsed.domains || [] };
}

function tribalByDomain() {
  const tipFiles = listTribalTipFiles();
  const counts = {};
  // Bound sample — domain hint is cheap (file head only)
  for (const f of tipFiles.slice(0, 4500)) {
    const d = tipDomainHint(f);
    counts[d] = (counts[d] || 0) + 1;
  }
  return counts;
}

function joinTribalAndViz(tribalCounts, vizDomains) {
  // Map common viz labels to tribal domain hints
  const labelToTribal = {
    Mill: "mill", Lathe: "lathe", Turning: "lathe",
    WEDM: "edm", EDM: "edm", Edm: "edm",
    Cam: "cam", CAM: "cam", Cad: "cam", CAD: "cam",
    Grinding: "grinding", Grind: "grinding", General: "general",
  };
  const join = [];
  for (const dom of vizDomains || []) {
    const trib = labelToTribal[dom.label] || dom.label.toLowerCase();
    const tribCount = tribalCounts[trib] || 0;
    join.push({
      viz_label: dom.label,
      viz_count: dom.count,
      viz_subgroup: dom.subgroup,
      tribal_count: tribCount,
      tips_per_engine: dom.count > 0 ? Math.round((tribCount / dom.count) * 100) / 100 : null,
      density_class: tribCount >= 20 ? "rich" : tribCount >= 5 ? "mixed" : "naked",
    });
  }
  return join;
}

function recommend(report) {
  const recs = [];
  if (report.index.coverage_pct < 50) {
    recs.push({
      priority: "high",
      action: "Run a full tribal-embed-index sweep — current coverage is " + report.index.coverage_pct + "% (" + report.index.indexed_entries + "/" + report.index.tip_files + ").",
      command: "node H:/prism/.claude/scripts/tribal-embed-index.mjs --update --full",
    });
  }
  if (report.customers.sampled_customer_pct < 10) {
    recs.push({
      priority: "high",
      action: "Backfill customer: frontmatter on tribal tips — currently " + report.customers.sampled_customer_pct + "% sampled. Map filename prefixes (itw_, alcoa_, optimas_, fontana_, atf_, …) to JM Die customer list.",
      command: "(write a tribal-customer-backfill.mjs against jm-die-profile.ts customer list)",
    });
  }
  if (!report.obsidian.OBSIDIAN_VAULT_env) {
    recs.push({
      priority: "medium",
      action: "OBSIDIAN_VAULT env var unset — mirror script cannot run. Either set the env to point at a real Obsidian vault path OR document that knowledge/memories/ is the canonical 2nd brain.",
      command: "(set OBSIDIAN_VAULT in user shell profile, or strip mirror script if vault is permanently in-repo)",
    });
  }
  if (report.citations.citations_recent === 0) {
    recs.push({
      priority: "medium",
      action: "tribal-rerank has zero recent citations — either no chats are using it or the hook is silent. Verify the L4 rerank hook is firing on UserPromptSubmit.",
    });
  }
  if (report.citations.tips_zero_citation > 0.95 * report.index.tip_files) {
    recs.push({
      priority: "low",
      action: ">95% of tips have never been cited. After full index sweep, consider archiving or re-distilling the cold-tier tips.",
    });
  }
  for (const j of report.viz_join || []) {
    if (j.density_class === "naked" && j.viz_count >= 50) {
      recs.push({
        priority: "low",
        action: `Domain "${j.viz_label}" has ${j.viz_count} engines but only ${j.tribal_count} tribal tips — naked. Schedule a /shop-knowledge or /distill-tribal pass.`,
      });
    }
  }
  return recs;
}

function main() {
  const opts = parseArgs();
  const recentDays = Number(opts["recent-days"]) || DEFAULT_RECENT_DAYS;

  const index = indexCoverage();
  const citations = citationActivity(recentDays);
  const customers = customerCoverage();
  const obsidian = obsidianMirrorStatus();
  const viz = vizDomainCoverage();
  const tribalCounts = tribalByDomain();
  const vizJoin = viz.ok ? joinTribalAndViz(tribalCounts, viz.domains) : [];

  const report = {
    schemaVersion: "1.0.0",
    ts: new Date().toISOString(),
    index,
    citations,
    customers,
    obsidian,
    viz_query_ok: viz.ok,
    tribal_by_domain: tribalCounts,
    viz_join: vizJoin,
  };
  report.recommendations = recommend(report);

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  const tmp = `${REPORT}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(report, null, 2));
  fs.renameSync(tmp, REPORT);

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("TRIBAL × OBSIDIAN × SYSTEM-VIZ — Utilization Audit");
  console.log("=".repeat(60));
  console.log(`Tribal index coverage:    ${report.index.indexed_entries}/${report.index.tip_files} tips (${report.index.coverage_pct}%)`);
  console.log(`Citation log:             ${report.citations.citations_total} total, ${report.citations.citations_recent} in last ${recentDays}d`);
  console.log(`Tips ever cited:          ${report.citations.tips_ever_cited} / ${report.index.tip_files} (zero-citation: ${report.citations.tips_zero_citation})`);
  console.log(`Customer-tagged tips:     ${report.customers.sampled_with_customer}/${report.customers.sampled_files} sampled (${report.customers.sampled_customer_pct}%)`);
  console.log(`Obsidian:                 OBSIDIAN_VAULT=${report.obsidian.OBSIDIAN_VAULT_env || "(unset)"}, mirror_script=${report.obsidian.mirror_script_exists ? "present" : "MISSING"}, in-repo memories subdirs=${report.obsidian.in_repo_memories_subdirs}`);
  console.log("");
  if (report.viz_join.length) {
    console.log("Per-domain density (top 10 by viz engine count):");
    const top = [...report.viz_join].sort((a, b) => b.viz_count - a.viz_count).slice(0, 10);
    for (const j of top) {
      console.log(`  ${j.viz_label.padEnd(14)} engines=${String(j.viz_count).padStart(4)}  tips=${String(j.tribal_count).padStart(4)}  ${j.density_class}`);
    }
  }
  console.log("");
  console.log(`Recommendations (${report.recommendations.length}):`);
  for (const r of report.recommendations) {
    console.log(`  [${r.priority.toUpperCase()}] ${r.action}`);
    if (r.command) console.log(`      → ${r.command}`);
  }
  console.log("");
  console.log(`Full report: ${REPORT}`);
}

try { main(); } catch (e) { console.error(`tribal-utilization-audit error: ${e.message}\n${e.stack}`); process.exit(2); }
