#!/usr/bin/env node
// audit-to-units.mjs — Convert AUDIT-LATEST.json findings into a roadmap
// milestone envelope with one unit per high-leverage finding. Drops into
// mcp-server/data/milestones/ where atomic-roadmap-emit.mjs already scans,
// so /rgs6 generate consumes audit findings without any rgs6.md changes.
//
// Closes task #74 (Round 2 Phase 2 — merge findings into rgs6 inputs).
//
// Usage:
//   node audit-to-units.mjs                          # write envelope
//   node audit-to-units.mjs --top-n 30               # cap unit count
//   node audit-to-units.mjs --min-conf 0.8           # skip low-conf gaps
//   node audit-to-units.mjs --exclude-shipped        # skip shipped paths
//   node audit-to-units.mjs --dry-run                # preview without writing
//   node audit-to-units.mjs --out <path>             # override target

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = "H:/prism";
const SHARED = join(ROOT, "state/shared");
const MILESTONE_DIR = join(ROOT, "mcp-server/data/milestones");

const ARGS = process.argv.slice(2);
function flag(name) {
  const i = ARGS.indexOf(name);
  return i >= 0 && i < ARGS.length - 1 ? ARGS[i + 1] : null;
}
const has = (n) => ARGS.includes(n);

const TOP_N = parseInt(flag("--top-n") || "30", 10);
const MIN_CONF = parseFloat(flag("--min-conf") || "0.7");
const EXCLUDE_SHIPPED = has("--exclude-shipped");
const DRY_RUN = has("--dry-run");
const VERBOSE = has("--verbose");

const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_ID = `MS-AUDIT-DERIVED-${TODAY}`;
const OUT_PATH = flag("--out") || join(MILESTONE_DIR, `${DEFAULT_ID}.json`);

function log(...m) { if (VERBOSE) console.log("[audit-to-units]", ...m); }

function readJson(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

const audit = readJson(join(SHARED, "AUDIT-LATEST.json"));
if (!audit) {
  console.error("audit-to-units: AUDIT-LATEST.json missing — run forge-audit-omniscient first");
  process.exit(2);
}

const milestoneProgress = readJson(join(SHARED, "MILESTONE_PROGRESS.json")) || {};
const shippedPaths = new Set();
if (EXCLUDE_SHIPPED) {
  for (const m of milestoneProgress.milestones || []) {
    for (const u of m.units || []) {
      if (u.shipped) {
        for (const fp of u.files_modified || []) shippedPaths.add(fp.toLowerCase());
      }
    }
  }
  log(`shipped-paths set: ${shippedPaths.size}`);
}

// Score findings for inclusion. Higher = more important to roadmap.
function scoreFinding(f) {
  let s = 0;
  if (f.kind === "dead_code") s += 30; // delete proposals are highest leverage
  else if (f.kind === "conflict") s += 25;
  else if (f.kind === "gap") s += 20 + Math.round((f.confidence || 0) * 10);
  else if (f.kind === "opportunity") s += 10 + (f.leverage === "high" ? 15 : 0);
  else if (f.kind === "doctrine") s += f.severity === "CRITICAL" ? 18 : f.severity === "MAJOR" ? 8 : 3;
  // small boost for evidence — anchored findings outrank guesses
  if (Array.isArray(f.evidence) && f.evidence.length > 0) s += 5;
  if (f.shortcode) s += 3;
  return s;
}

function findingPath(f) {
  if (f.path) return f.path;
  if (f.file) return f.file;
  if (Array.isArray(f.evidence)) {
    for (const e of f.evidence) {
      const m = String(e).match(/(?:mcp-server\/)?src\/[a-zA-Z0-9_\-./]+\.(?:ts|js|mjs)/);
      if (m) return m[0];
    }
  }
  return null;
}

// Build a stable, short ID from finding hash (collision-resistant within audit)
function unitId(f, idx) {
  const seed = `${f.kind}|${f.domain || ""}|${findingPath(f) || ""}|${(f.what || f.label || "").slice(0, 100)}`;
  const hash = createHash("sha1").update(seed).digest("hex").slice(0, 6);
  return `U-AUDIT-${String(idx + 1).padStart(2, "0")}-${hash.toUpperCase()}`;
}

function unitTitle(f) {
  if (f.kind === "dead_code") return `Verify+remove dead-code: ${f.path}`;
  if (f.kind === "doctrine") return `Doctrine [${f.ruleId || f.severity}]: ${f.label || f.fix}`.slice(0, 120);
  const head = (f.what || f.label || "").trim().split(/\.\s|\n/)[0];
  return `[${f.kind}] ${head}`.slice(0, 140);
}

function unitDetails(f) {
  const lines = [];
  if (f.what) lines.push(`**Finding:** ${f.what}`);
  if (f.label) lines.push(`**Doctrine:** ${f.label}`);
  if (f.fix) lines.push(`**Suggested fix:** ${f.fix}`);
  if (f.reason) lines.push(`**Reason:** ${f.reason}`);
  if (f.rationale) lines.push(`**Rationale:** ${f.rationale}`);
  if (Array.isArray(f.evidence) && f.evidence.length) {
    lines.push("**Evidence:**");
    for (const e of f.evidence.slice(0, 5)) lines.push(`- ${String(e).slice(0, 200)}`);
  }
  if (Array.isArray(f.between) && f.between.length) {
    lines.push("**Conflicts between:**");
    for (const b of f.between.slice(0, 5)) lines.push(`- ${b}`);
  }
  if (f.deleteRequiresConsensus) {
    lines.push("");
    lines.push("⚠ **byzantine-coordinator 3-of-3 consensus required** before delete (irreversible action).");
  }
  if (f.shortcode) lines.push(`**Shortcode:** \`${f.shortcode}\``);
  if (f.domain) lines.push(`**Domain:** ${f.domain}`);
  return lines.join("\n");
}

const findings = (audit.findings || [])
  .map((f) => ({ ...f, _score: scoreFinding(f) }))
  .filter((f) => {
    if (f.kind === "gap" && (f.confidence || 0) < MIN_CONF) return false;
    if (EXCLUDE_SHIPPED) {
      const p = findingPath(f);
      if (p && shippedPaths.has(p.toLowerCase())) return false;
    }
    return true;
  })
  .sort((a, b) => b._score - a._score)
  .slice(0, TOP_N);

const units = findings.map((f, i) => ({
  id: unitId(f, i),
  title: unitTitle(f),
  status: "not_started",
  finding_kind: f.kind,
  domain: f.domain || null,
  files_modified: [findingPath(f)].filter(Boolean),
  shortcode: f.shortcode || null,
  audit_score: f._score,
  details: unitDetails(f),
  delete_requires_consensus: f.kind === "dead_code" || !!f.deleteRequiresConsensus,
}));

const envelope = {
  id: DEFAULT_ID,
  version: "1.0.0",
  title: `Audit-derived units (${TODAY}) — ${units.length} findings`,
  brief:
    "Auto-generated milestone envelope from forge-audit-omniscient findings. " +
    "Each unit corresponds to one high-leverage audit finding (gap, conflict, " +
    "dead_code, opportunity, or doctrine violation). Consumed by /rgs6 generate " +
    "as a standard milestone envelope. Regenerate via " +
    "`node H:/prism/.claude/scripts/audit-to-units.mjs` after each forge-audit run.",
  created_at: new Date().toISOString(),
  created_by: "audit-to-units.mjs",
  track: "audit-derived",
  track_name: "Audit-derived roadmap units",
  status: "not_started",
  priority: "high",
  tier: "audit",
  omega_target: 0.95,
  depends_on: [],
  audit_origin: {
    source_audit: "state/shared/AUDIT-LATEST.json",
    source_audit_generated_at: audit.generatedAt,
    source_audit_total_findings: audit.findings?.length || 0,
    selected_findings: units.length,
    top_n: TOP_N,
    min_conf: MIN_CONF,
    exclude_shipped: EXCLUDE_SHIPPED,
    score_breakdown: {
      dead_code: units.filter((u) => u.finding_kind === "dead_code").length,
      conflict: units.filter((u) => u.finding_kind === "conflict").length,
      gap: units.filter((u) => u.finding_kind === "gap").length,
      opportunity: units.filter((u) => u.finding_kind === "opportunity").length,
      doctrine: units.filter((u) => u.finding_kind === "doctrine").length,
    },
    regenerator: "node H:/prism/.claude/scripts/audit-to-units.mjs",
  },
  total_units: units.length,
  completed_units: 0,
  units,
};

if (DRY_RUN) {
  console.log("audit-to-units (DRY RUN)");
  console.log(`  audit-source: ${envelope.audit_origin.source_audit_generated_at}`);
  console.log(`  total findings: ${envelope.audit_origin.source_audit_total_findings}`);
  console.log(`  selected: ${units.length} (top-n=${TOP_N}, min-conf=${MIN_CONF}, exclude-shipped=${EXCLUDE_SHIPPED})`);
  console.log(`  by kind: ${JSON.stringify(envelope.audit_origin.score_breakdown)}`);
  console.log("  top 5 units:");
  for (const u of units.slice(0, 5)) {
    console.log(`    [${u.audit_score}] ${u.id} ${u.title.slice(0, 90)}`);
  }
  console.log(`  would write: ${OUT_PATH}`);
} else {
  writeFileSync(OUT_PATH, JSON.stringify(envelope, null, 2));
  console.log(`audit-to-units: wrote ${units.length} units → ${OUT_PATH}`);
  console.log(`  by kind: ${JSON.stringify(envelope.audit_origin.score_breakdown)}`);
}
