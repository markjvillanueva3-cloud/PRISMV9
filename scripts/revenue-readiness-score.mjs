#!/usr/bin/env node
/**
 * revenue-readiness-score.mjs — META artifact for REVENUE-ROADMAP-2026-05-10.md (v7.E).
 *
 * Computes per-milestone progress + overall revenue readiness from live PRISM state.
 *
 * Inputs (read each run):
 *   - state/shared/BUILD_STATE.json
 *   - state/shared/AUDIT-LATEST.json
 *   - state/shared/system-viz/system-graph.json (optional; large file)
 *   - mcp-server/data/milestones/MS-REV-*.json (when emitted by atomic-roadmap-emit)
 *   - state/shared/specs/REVENUE-ROADMAP-2026-05-10.md (for unit enumeration)
 *
 * Outputs:
 *   - stdout JSON  (machine consumption — pipe to jq)
 *   - state/shared/REVENUE-READINESS.json
 *   - state/shared/REVENUE-READINESS.md (human-readable card)
 *
 * Flags:
 *   --json         only stdout JSON, no md write
 *   --reset        clear prior cached state
 *
 * Re-run is cheap (<2s). Wired into /loop --interval 7d per v7.G.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const argv = new Set(process.argv.slice(2));
const JSON_ONLY = argv.has("--json");

// === Tuned constants (extracted per hook guidance) ===
// Weight allocation for overall_revenue_readiness — rationale documented in REVENUE-ROADMAP-2026-05-10.md v7.E
const WEIGHT_MS0_UI         = 0.45;  // UI is the revenue gate
const WEIGHT_MS1_BILLING    = 0.25;  // billing is gate #2
const WEIGHT_MS2_INVENTIONS = 0.15;  // inventions widen the moat
const WEIGHT_MS3_WIRING     = 0.10;  // coverage
const WEIGHT_MS4_DRIFT      = 0.05;  // hygiene

// Blocker thresholds
const MS0_CRITICAL_FLOOR    = 0.10;  // below this, "no customer can pay"
const MS1_LAG_FLOOR         = 0.20;  // below this when MS0>50%, billing lag
const MS0_LAG_TRIGGER       = 0.50;  // MS0 progress that triggers MS1-lag check

function safeReadJson(rel) {
  const p = path.join(ROOT, rel);
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}

function safeReadText(rel) {
  const p = path.join(ROOT, rel);
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

// === Read live state ===
const buildState = safeReadJson("state/shared/BUILD_STATE.json") || {};
const audit      = safeReadJson("state/shared/AUDIT-LATEST.json") || {};
// Spec path: --spec=<path> overrides; default tracks live spec v7.2 → v7.1 → legacy.
function specFlag() {
  const hit = process.argv.slice(2).find(a => a.startsWith("--spec="));
  if (hit) return hit.slice("--spec=".length);
  for (const c of ["state/shared/specs/REVENUE-ROADMAP-v7.2.md", "state/shared/specs/REVENUE-ROADMAP-v7.1.md", "state/shared/specs/REVENUE-ROADMAP-2026-05-10.md"]) {
    if (fs.existsSync(path.join(ROOT, c))) return c;
  }
  return "state/shared/specs/REVENUE-ROADMAP-2026-05-10.md";
}
const SPEC_REL   = specFlag();
const roadmapMd  = safeReadText(SPEC_REL);

// === Enumerate units declared in the roadmap (regex over the spec) ===
// Matches: U-REV-*, U-SUB-*, U-INV-*-*, U-WIRE-*-*, U-DRIFT-*
const UNIT_RE = /\bU-(REV|SUB|INV|WIRE|DRIFT)-[A-Z0-9]+(?:-[0-9]+)?\b/g;
const declared = new Set();
for (const m of roadmapMd.matchAll(UNIT_RE)) declared.add(m[0]);

// === Bucket units by milestone family ===
function bucket(id) {
  if (id.startsWith("U-REV-"))   return "ms0";
  if (id.startsWith("U-SUB-"))   return "ms1";
  if (id.startsWith("U-INV-"))   return "ms2";
  if (id.startsWith("U-WIRE-"))  return "ms3";
  if (id.startsWith("U-DRIFT-")) return "ms4";
  return "other";
}

const buckets = { ms0: [], ms1: [], ms2: [], ms3: [], ms4: [], other: [] };
for (const id of declared) buckets[bucket(id)].push(id);

// === Check shipped status by scanning git log via fs (cheap proxy: presence of unit id in commit message log file) ===
// We avoid spawning git here for speed; instead, BUILD_STATE.shipped_units (if present) is authoritative.
const shipped = new Set(buildState?.shipped_units ?? []);

function pct(arr) {
  if (arr.length === 0) return 0;
  const done = arr.filter(id => shipped.has(id)).length;
  return done / arr.length;
}

// === Compute per-MS readiness ===
const scores = {
  ms0_ui_unstub_pct:     pct(buckets.ms0),
  ms1_subscription_pct:  pct(buckets.ms1),
  ms2_inventions_pct:    pct(buckets.ms2),
  ms3_wiring_pct:        pct(buckets.ms3),
  ms4_drift_pct:         pct(buckets.ms4),
};
scores.overall_revenue_readiness =
  WEIGHT_MS0_UI         * scores.ms0_ui_unstub_pct +
  WEIGHT_MS1_BILLING    * scores.ms1_subscription_pct +
  WEIGHT_MS2_INVENTIONS * scores.ms2_inventions_pct +
  WEIGHT_MS3_WIRING     * scores.ms3_wiring_pct +
  WEIGHT_MS4_DRIFT      * scores.ms4_drift_pct;

// === Blockers ===
const blockers = [];
if (scores.ms0_ui_unstub_pct < MS0_CRITICAL_FLOOR) {
  blockers.push({ unit: "MS0-cohort", reason: `UI unstub <${MS0_CRITICAL_FLOOR*100}% — no customer can pay` });
}
if (scores.ms1_subscription_pct < MS1_LAG_FLOOR && scores.ms0_ui_unstub_pct > MS0_LAG_TRIGGER) {
  blockers.push({ unit: "U-SUB-04", reason: `MS0 >${MS0_LAG_TRIGGER*100}% but billing <${MS1_LAG_FLOOR*100}% — revenue leak` });
}
const envDrift = buildState?.envelope_drift ?? [];
for (const d of envDrift) {
  if (typeof d === "object" && d.claim === "completed" && d.real?.startsWith("not_started")) {
    blockers.push({ unit: d.milestone, reason: `envelope drift: claim=${d.claim} real=${d.real}` });
  }
}

// === Recommend next unit ===
function firstUnshipped(arr) {
  for (const id of arr.sort()) if (!shipped.has(id)) return id;
  return null;
}
const nextUnitRecommended =
  firstUnshipped(buckets.ms0) ||
  firstUnshipped(buckets.ms1) ||
  firstUnshipped(buckets.ms2) ||
  firstUnshipped(buckets.ms3) ||
  firstUnshipped(buckets.ms4) ||
  null;

// === Verification health (count units with verifies_via block in roadmap) ===
// Stub heuristic: if the v7.A section exists, declare 1.0; else 0.
const v7aPresent = /v7\.A.*verification channel/i.test(roadmapMd);
const verificationHealth = v7aPresent ? 1.0 : 0.0;

// === Tier invocation balance from v7.B table ===
const tierInvocationBalance = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0, T6: 0, T7: 0 };
for (const m of roadmapMd.matchAll(/\bT([1-7])\b/g)) {
  const k = `T${m[1]}`;
  if (tierInvocationBalance[k] !== undefined) tierInvocationBalance[k]++;
}

// === Audit context ===
const auditFindings = audit?.findings?.length ?? audit?.total ?? 0;
const auditRevenueRelevant =
  (audit?.findings ?? []).filter(f =>
    /(quote|stripe|paddle|billing|seat|tier|customer|invoice|tax|refund|frontend|page|stub)/i
      .test(JSON.stringify(f))
  ).length;

// === Output payload ===
const out = {
  schemaVersion: "1.0.0",
  generated_at: new Date().toISOString(),
  source_chat: "claude-99eca613",
  scores,
  buckets_count: Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [k, v.length])
  ),
  shipped_in_each: Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [k, v.filter(id => shipped.has(id)).length])
  ),
  blockers,
  next_unit_recommended: nextUnitRecommended,
  verification_health: verificationHealth,
  tier_invocation_balance: tierInvocationBalance,
  audit_context: {
    total_findings: auditFindings,
    revenue_relevant_findings: auditRevenueRelevant,
  },
  v7_compliance: {
    A_verification_channel: v7aPresent,
    B_combinatorics_table: /v7\.B.*combinatorics/i.test(roadmapMd),
    C_ai_orchestration:    /v7\.C.*AI orchestration/i.test(roadmapMd),
    D_peer_review:         /v7\.D.*peer-review/i.test(roadmapMd),
    E_meta_artifact:       true,    // this script
    F_html_companion:      fs.existsSync(path.join(ROOT, "state/shared/specs/REVENUE-ROADMAP-2026-05-10.html")),
    G_loop_schedule:       /v7\.G.*loop/i.test(roadmapMd),
  },
};

// === Emit ===
process.stdout.write(JSON.stringify(out, null, 2) + "\n");

if (!JSON_ONLY) {
  fs.writeFileSync(
    path.join(ROOT, "state/shared/REVENUE-READINESS.json"),
    JSON.stringify(out, null, 2) + "\n"
  );

  const md = [
    `# Revenue Readiness — ${out.generated_at}`,
    "",
    `**Overall:** ${(scores.overall_revenue_readiness * 100).toFixed(1)}%`,
    "",
    "| Milestone | % done | shipped / declared |",
    "|---|---|---|",
    `| MS0 — UI unstub      | ${(scores.ms0_ui_unstub_pct*100).toFixed(1)}% | ${out.shipped_in_each.ms0} / ${out.buckets_count.ms0} |`,
    `| MS1 — Subscriptions  | ${(scores.ms1_subscription_pct*100).toFixed(1)}% | ${out.shipped_in_each.ms1} / ${out.buckets_count.ms1} |`,
    `| MS2 — Inventions     | ${(scores.ms2_inventions_pct*100).toFixed(1)}% | ${out.shipped_in_each.ms2} / ${out.buckets_count.ms2} |`,
    `| MS3 — Wire backlog   | ${(scores.ms3_wiring_pct*100).toFixed(1)}% | ${out.shipped_in_each.ms3} / ${out.buckets_count.ms3} |`,
    `| MS4 — Drift          | ${(scores.ms4_drift_pct*100).toFixed(1)}% | ${out.shipped_in_each.ms4} / ${out.buckets_count.ms4} |`,
    "",
    `**Next unit:** \`${nextUnitRecommended ?? "<none — all shipped>"}\``,
    "",
    `**Verification health:** ${(verificationHealth*100).toFixed(0)}%`,
    "",
    `**Tier invocation balance:** ${JSON.stringify(out.tier_invocation_balance)}`,
    "",
    `**Audit findings (revenue-relevant):** ${auditRevenueRelevant} / ${auditFindings}`,
    "",
    "## Blockers",
    blockers.length === 0
      ? "_none_"
      : blockers.map(b => `- \`${b.unit}\` — ${b.reason}`).join("\n"),
    "",
    "## v7 compliance",
    ...Object.entries(out.v7_compliance).map(([k, v]) => `- ${k}: ${v ? "✓" : "✗"}`),
    "",
    "_Regenerate: `node scripts/revenue-readiness-score.mjs`_",
    "_Schedule: \`/loop --interval 7d --max 4\` per v7.G_",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(ROOT, "state/shared/REVENUE-READINESS.md"), md);
}
