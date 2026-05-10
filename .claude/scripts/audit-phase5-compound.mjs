#!/usr/bin/env node
// audit-phase5-compound.mjs
// Phase 5 — compound: append wiki/log.md, write memory entry, update audit-baseline.json.
// Spec §107-112. System-viz regen is OUT OF SCOPE — claude-0413eca6's lane.

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "H:/prism";
const SHARED = join(ROOT, "state/shared");
const ARGS = new Set(process.argv.slice(2));
const VERBOSE = ARGS.has("--verbose");

function log(...m) { if (VERBOSE) console.log("[ph5]", ...m); }
function readJsonOrNull(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}
function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

async function main() {
  log("phase5: compound");
  const audit = readJsonOrNull(join(SHARED, "AUDIT-LATEST.json"));
  if (!audit) {
    console.error("phase5: AUDIT-LATEST.json missing — phase 4 must run first");
    process.exit(2);
  }

  const ts = audit.generatedAt;
  const fnTs = ts.replace(/[:.]/g, "-");

  // 1. Append wiki/log.md
  const logPath = join(ROOT, "knowledge/wiki/log.md");
  if (existsSync(logPath)) {
    const entry =
      `\n## [${ts}] forge-audit-omniscient\n` +
      `- findings: ${audit.findings.length} (suppressed ${audit.suppression.suppressed}, dedup ${(audit.suppression.dedupRate * 100).toFixed(1)}%)\n` +
      `- overlay: green=${audit.overlayStats.green} yellow=${audit.overlayStats.yellow} red=${audit.overlayStats.red} blue=${audit.overlayStats.blue}\n` +
      `- by:claude-99eca613\n`;
    appendFileSync(logPath, entry);
    log("  ✓ wiki/log.md appended");
  } else {
    log("  · wiki/log.md missing — skipped");
  }

  // 2. Memory entry
  const memDir = join(ROOT, "knowledge/memories/project");
  ensureDir(memDir);
  const memPath = join(memDir, `forge_audit_${fnTs}.md`);
  const memBody = [
    "---",
    "type: project",
    `name: forge_audit_${fnTs}`,
    `description: forge-audit-omniscient run snapshot — ${audit.findings.length} findings, ${audit.overlayStats.red} red orphans`,
    "---",
    "",
    `# forge-audit-omniscient @ ${ts}`,
    "",
    `Findings: ${audit.findings.length}`,
    `Suppressed by wiki: ${audit.suppression.suppressed} (${(audit.suppression.dedupRate * 100).toFixed(1)}% dedup rate)`,
    `Overlay: green=${audit.overlayStats.green} yellow=${audit.overlayStats.yellow} red=${audit.overlayStats.red} blue=${audit.overlayStats.blue}`,
    `Phase 2: bridges=${audit.phase2Stats.bridges || 0} cycles=${audit.phase2Stats.cycles || 0} doctrine=${audit.phase2Stats.doctrineViolations || 0} dead=${audit.phase2Stats.deadCodeCandidates || 0}`,
    "",
    "**Why:** Audit baseline for next run delta.",
    "**How to apply:** Read AUDIT-LATEST.{json,md} for details. The audit-overlay.json drives system-viz colors.",
  ].join("\n");
  writeFileSync(memPath, memBody);
  log(`  ✓ memory written: ${memPath}`);

  // 3. Update audit-baseline.json
  const baseline = {
    schemaVersion: "1.0.0",
    generatedAt: ts,
    findings_count: audit.findings.length,
    suppression: audit.suppression,
    overlay_stats: audit.overlayStats,
    phase2_stats: audit.phase2Stats,
    totals: audit.totals,
    sourceAudit: "state/shared/AUDIT-LATEST.json",
  };
  writeFileSync(join(SHARED, "audit-baseline.json"), JSON.stringify(baseline, null, 2));
  log("  ✓ audit-baseline.json updated");

  console.log("phase5: compound complete");
}

main().catch((e) => {
  console.error("phase5 failed:", e);
  process.exit(1);
});
