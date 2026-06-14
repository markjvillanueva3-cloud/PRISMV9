#!/usr/bin/env node
/**
 * zebra-capability-report.mjs — render the zebra-awareness substrate as a
 * human-readable per-slot capability map.
 *
 * U-ZEBRA-CAPABILITY-REPORT (echo, /goal synergy loop iter 2). Closes a
 * producer→consumer loop on top of U-ZEBRA-AWARE-AUTOREFRESH: the
 * scripts/zebra-awareness-run.mjs CLI produces zebra-awareness-index.json;
 * this script consumes it and emits state/shared/SLOT-CAPABILITY-MAP.md so
 * the cross-surface capability fingerprint is visible at a glance (and
 * grep-able by every chat/skill that needs to know who is good at what).
 *
 * Pure core / IO shell split: renderCapabilityMap() is pure + exported;
 * main() reads/writes. Fail-soft on every missing field — the substrate
 * schema is young, a field rename should NOT crash the report.
 *
 * Usage:  node scripts/zebra-capability-report.mjs        # writes the report
 *         node scripts/zebra-capability-report.mjs --dry  # stdout, no write
 *         node scripts/zebra-capability-report.mjs --json # machine output
 * Exit:   0 ok (incl. nothing-to-do) · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";

const INDEX_PATH = path.join(ROOT, "state/shared/zebra-awareness-index.json");
const OUT_PATH = path.join(ROOT, "state/shared/SLOT-CAPABILITY-MAP.md");

// ───────────────────────── pure core ─────────────────────────

const safe = (v, dflt = "") =>
  v === undefined || v === null ? dflt : String(v).replace(/[\r\n|]+/g, " ").trim();

/**
 * Top-N entries of a {key: count} map, sorted by count desc, then key asc.
 * Deterministic — same input always yields same output.
 */
export function topDomains(scores, limit = 3) {
  if (!scores || typeof scores !== "object") return [];
  return Object.entries(scores)
    .filter(([, n]) => Number.isFinite(n) && n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([k, n]) => `${k}=${n}`);
}

/**
 * Pure: index object → { rows[], generatedAt, slotCount }.
 * Tolerates missing fields per slot — a fingerprint with `ok:false` still
 * gets a row so the operator sees which slots failed to fingerprint.
 */
export function renderCapabilityMap(index) {
  const fps = index && Array.isArray(index.fingerprints) ? index.fingerprints : [];
  // Deterministic order: ok-first, then by descending viz neighborhood, then slot name.
  const sorted = fps.slice().sort((a, b) => {
    const ao = a && a.ok ? 0 : 1;
    const bo = b && b.ok ? 0 : 1;
    if (ao !== bo) return ao - bo;
    const an = Number(a && a.vizNodeCount) || 0;
    const bn = Number(b && b.vizNodeCount) || 0;
    if (an !== bn) return bn - an;
    return safe(a && a.slot).localeCompare(safe(b && b.slot));
  });
  const rows = sorted.map((fp) => ({
    slot: safe(fp && fp.slot, "?"),
    ok: !!(fp && fp.ok),
    hermesRole: safe(fp && fp.hermesRole, "—"),
    domains: Array.isArray(fp && fp.domains) ? fp.domains.slice(0, 5).map(safe).join(", ") : "",
    tribal: topDomains(fp && fp.tribalDomainScores, 3).join(" "),
    queueLength: Number((fp && fp.queueLength) ?? 0) || 0,
    vizNodeCount: Number((fp && fp.vizNodeCount) ?? 0) || 0,
    successRate: Number((fp && fp.successRate) ?? 0) || 0,
    successN: Number((fp && fp.successSampleSize) ?? 0) || 0,
  }));
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: safe(index && index.generatedAt, "(unknown)"),
    sourceSchemaVersion: safe(index && index.schemaVersion, "?"),
    slotCount: rows.length,
    rows,
  };
}

/** Pure: capability map → markdown report (deterministic). */
export function renderMarkdown(map) {
  const m = map || { rows: [], slotCount: 0, generatedAt: "?" };
  const lines = [
    "# Slot Capability Map",
    "",
    `_Auto-generated from \`state/shared/zebra-awareness-index.json\` by \`scripts/zebra-capability-report.mjs\` (U-ZEBRA-CAPABILITY-REPORT)._`,
    `_Source generated_at: ${m.generatedAt} · source schemaVersion: ${m.sourceSchemaVersion} · report schemaVersion: ${SCHEMA_VERSION}_`,
    "",
    `**${m.slotCount} slot fingerprint(s) indexed.**`,
    "",
    "| slot | ok | role | domains | tribal-affinity | queue | viz nodes | success |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const r of m.rows) {
    lines.push(`| ${r.slot} | ${r.ok ? "✓" : "✗"} | ${r.hermesRole} | ${r.domains || "—"} | ${r.tribal || "—"} | ${r.queueLength} | ${r.vizNodeCount} | ${(r.successRate * 100).toFixed(0)}% (n=${r.successN}) |`);
  }
  lines.push("");
  lines.push("> Updated automatically every Stop after the zebra-awareness substrate refreshes (24h-throttled via `.zebra-awareness-refresh.lock`).");
  lines.push("");
  return lines.join("\n");
}

// ───────────────────────── I/O shell ─────────────────────────

export function main(argv = []) {
  const dry = argv.includes("--dry") || argv.includes("--dry-run");
  const json = argv.includes("--json");

  let indexText;
  try {
    indexText = fs.readFileSync(INDEX_PATH, "utf8");
  } catch {
    console.log(`no zebra-awareness-index at ${INDEX_PATH} — nothing to render`);
    return 0;
  }

  let map, md;
  try {
    const index = JSON.parse(indexText);
    map = renderCapabilityMap(index);
    md = renderMarkdown(map);
  } catch (e) {
    console.error(`FATAL: index parse/render failed — ${e.message}`);
    return 2;
  }

  if (json) {
    console.log(JSON.stringify({ ok: true, schemaVersion: SCHEMA_VERSION, ...map }, null, 2));
    return 0;
  }
  if (dry) {
    process.stdout.write(md);
    return 0;
  }
  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, md);
    console.log(`wrote ${OUT_PATH} (${map.slotCount} slot(s))`);
    return 0;
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main(process.argv.slice(2)));
