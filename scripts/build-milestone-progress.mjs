#!/usr/bin/env node
/**
 * build-milestone-progress.mjs
 *
 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
 * showing what's actually shipped per milestone vs what the milestone
 * envelope JSONs claim.
 *
 * Why: roadmap-index.json carries `status: "not_started"` for milestones
 * we've already shipped 5+ units of (e.g. XPROC-NEURAL-OPTIMIZE-MS0 has
 * U-NN-FIX01..05 + U-NN-LOOP06 + U-NN-MONDRIAN01 + U-NN-ADAPTIVE-ALPHA01
 * shipped, but the envelope still says "not_started"). Parallel audit
 * chats compare the milestone JSONs to reality and produce inflated gap
 * lists. This generator reads commit messages directly so the audit can
 * subtract "actually shipped" from "claimed pending".
 *
 * Method:
 *   1. Read every milestone JSON in mcp-server/data/milestones/
 *   2. Extract unit IDs from each milestone's phases[].units[].id
 *   3. Grep git log for [<MS_ID>]/U-<UID> patterns (last 60 days, both
 *      branches and worktrees)
 *   4. Per milestone: total | shipped | pending counts; per unit a
 *      shipped:true|false flag with commit SHA + date if shipped
 *   5. Sort milestones by recent activity (most-recently-shipped first)
 *
 * Output:
 *   state/shared/MILESTONE_PROGRESS.json   (machine-readable, full)
 *   state/shared/MILESTONE_PROGRESS.md     (human-readable summary +
 *                                           top-20-active milestones)
 *
 * Idempotent. Safe to re-run. Should be wired into a daily cron and
 * re-run after every commit batch by stop-shipped-units.mjs.
 */

import { readdir, readFile } from "node:fs/promises";
import { writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// Atomic write — tmp + rename prevents byte-interleaved reads when /precompact
// and /checkin fire this script concurrently across 6 chat sessions.
function atomicWriteFileSync(targetPath, contents) {
  const tmp = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tmp, contents, "utf8");
    renameSync(tmp, targetPath);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* tmp may not exist */ }
    throw err;
  }
}

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const MILESTONE_DIR = resolve(REPO_ROOT, "mcp-server/data/milestones");
const STATE_DIR = resolve(REPO_ROOT, "state/shared");
const OUT_JSON = resolve(STATE_DIR, "MILESTONE_PROGRESS.json");
const OUT_MD = resolve(STATE_DIR, "MILESTONE_PROGRESS.md");

const SINCE = "60.days";
const TOP_ACTIVE = 30; // top-N most-active milestones in the MD summary

function git(args) {
  try {
    return execFileSync("git", ["-C", REPO_ROOT, ...args], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: 60_000,
    }).trim();
  } catch (err) {
    return "";
  }
}

/**
 * Returns Map<unitId, { sha, date, subject }> for every U-* unit ID
 * we can find in commits across the last SINCE window. Both branches
 * (main + worktrees) are covered by `--all`.
 */
function loadShippedFromGit() {
  const log = git(["log", "--all", `--since=${SINCE}`, "--format=%H\t%cI\t%s"]);
  const shipped = new Map();
  for (const line of log.split("\n")) {
    if (!line.includes("\t")) continue;
    const [sha, date, ...rest] = line.split("\t");
    const subject = rest.join("\t");
    // Match: [SCOPE-MS#]/U-<id>: title  OR  [MAIN] [SCOPE-MS#]/U-<id>: title
    // Capture both the milestone id (or null if not present) and the unit id.
    const m = subject.match(/\[([^\]]+)\]\/U-([A-Za-z0-9-]+)/);
    if (!m) continue;
    const milestoneTag = m[1].toUpperCase();
    const unitId = "U-" + m[2].toUpperCase();
    const key = `${milestoneTag}::${unitId}`;
    if (!shipped.has(key)) {
      shipped.set(key, { sha, date, subject, milestoneTag, unitId });
    }
  }
  return shipped;
}

async function loadMilestones() {
  const files = await readdir(MILESTONE_DIR);
  const milestones = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(MILESTONE_DIR, file), "utf8");
      const ms = JSON.parse(raw);
      if (!ms?.id) continue;
      // Collect unit IDs from any phases[].units[].id structure.
      const units = [];
      if (Array.isArray(ms.phases)) {
        for (const phase of ms.phases) {
          if (!Array.isArray(phase?.units)) continue;
          for (const u of phase.units) {
            if (u?.id) units.push({
              id: u.id,
              title: u.title ?? "",
              phase: phase.id ?? "",
              dependencies: u.dependencies ?? [],
            });
          }
        }
      }
      milestones.push({
        id: ms.id,
        title: ms.title ?? "",
        track: ms.track ?? "",
        status: ms.status ?? "unknown",
        total_units: ms.total_units ?? units.length,
        units,
      });
    } catch {
      // Skip malformed envelopes.
    }
  }
  return milestones;
}

function computeProgress(milestones, shipped) {
  // For each milestone, look up each unit in the shipped index.
  // Match strategy: exact (milestone-tag, unit-id) pair first;
  // fallback to (any-milestone-tag, unit-id) — useful when the tag
  // shifted (e.g. [MAIN] [SCOPE]/U-X vs bare [SCOPE]/U-X).
  const byUnitOnly = new Map();
  for (const [key, val] of shipped.entries()) {
    if (!byUnitOnly.has(val.unitId)) byUnitOnly.set(val.unitId, val);
  }

  const result = [];
  for (const ms of milestones) {
    const msTag = ms.id.toUpperCase();
    let shippedCount = 0;
    let lastShippedDate = "";
    const unitProgress = ms.units.map((u) => {
      const uid = u.id.toUpperCase();
      const exactKey = `${msTag}::${uid}`;
      let hit = shipped.get(exactKey) ?? null;
      if (!hit) hit = byUnitOnly.get(uid) ?? null;
      const isShipped = !!hit;
      if (isShipped) {
        shippedCount++;
        if (hit.date > lastShippedDate) lastShippedDate = hit.date;
      }
      return {
        id: u.id,
        title: u.title,
        phase: u.phase,
        shipped: isShipped,
        sha: hit?.sha ?? null,
        date: hit?.date ?? null,
        commitMilestoneTag: hit?.milestoneTag ?? null,
      };
    });
    const total = ms.units.length;
    const pending = total - shippedCount;
    const ratio = total > 0 ? shippedCount / total : 0;
    result.push({
      id: ms.id,
      title: ms.title,
      track: ms.track,
      claimedStatus: ms.status,
      total,
      shipped: shippedCount,
      pending,
      ratio,
      lastShippedDate,
      derivedStatus:
        total === 0
          ? "no_units"
          : shippedCount === 0
            ? "not_started_real"
            : shippedCount === total
              ? "completed_real"
              : "in_progress_real",
      drift:
        total === 0
          ? "n/a"
          : ms.status === "not_started" && shippedCount > 0
            ? "claims_not_started_but_has_shipped_units"
            : ms.status === "completed" && shippedCount < total
              ? "claims_completed_but_units_pending"
              : "consistent",
      units: unitProgress,
    });
  }
  return result;
}

function renderMarkdown(progress) {
  const totalMS = progress.length;
  const totalUnits = progress.reduce((a, p) => a + p.total, 0);
  const totalShipped = progress.reduce((a, p) => a + p.shipped, 0);
  const totalPending = progress.reduce((a, p) => a + p.pending, 0);
  const drifted = progress.filter((p) => p.drift !== "consistent" && p.drift !== "n/a");

  const sortedActive = [...progress]
    .filter((p) => p.shipped > 0)
    .sort((a, b) => (b.lastShippedDate || "").localeCompare(a.lastShippedDate || ""))
    .slice(0, TOP_ACTIVE);

  const stillToBuild = progress
    .filter((p) => p.pending > 0 && p.total > 0)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, TOP_ACTIVE);

  const lines = [];
  lines.push("# MILESTONE_PROGRESS — what's actually shipped vs claimed");
  lines.push("");
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Window: last ${SINCE} of git log across all branches`);
  lines.push(`> Source: \`scripts/build-milestone-progress.mjs\``);
  lines.push("");
  lines.push("## Why this file exists");
  lines.push("");
  lines.push("Milestone envelope JSONs (`mcp-server/data/milestones/*.json`) carry a");
  lines.push("`status` field that drifts: roadmap planners write `\"not_started\"`,");
  lines.push("then chats ship units without flipping the status. Parallel audit chats");
  lines.push("compare envelopes to reality and over-report gaps.");
  lines.push("");
  lines.push("This file is generated FROM git log — it sees what was actually");
  lines.push("committed. Use it to subtract \"shipped\" from \"claimed pending\" before");
  lines.push("flagging a unit as missing.");
  lines.push("");
  lines.push("## Headline numbers");
  lines.push("");
  lines.push(`- Milestones loaded:        **${totalMS}**`);
  lines.push(`- Units across all MS:      **${totalUnits}**`);
  lines.push(`- Units shipped (in git):   **${totalShipped}**`);
  lines.push(`- Units pending:            **${totalPending}**`);
  lines.push(`- Drift cases:              **${drifted.length}** (envelope status disagrees with git reality)`);
  lines.push("");
  lines.push("## Top recently-active milestones (last shipped → first)");
  lines.push("");
  lines.push("| Milestone | Track | Status (claimed) | Status (real) | Shipped/Total | Last commit |");
  lines.push("|-----------|-------|------------------|---------------|---------------|-------------|");
  for (const p of sortedActive) {
    const pct = (p.ratio * 100).toFixed(0);
    lines.push(`| ${p.id} | ${p.track || "—"} | ${p.claimedStatus} | ${p.derivedStatus} | ${p.shipped}/${p.total} (${pct}%) | ${(p.lastShippedDate || "").slice(0, 10)} |`);
  }
  lines.push("");
  lines.push("## Drift cases (claim vs git disagrees)");
  lines.push("");
  if (drifted.length === 0) {
    lines.push("_None — every claim matches reality._");
  } else {
    lines.push("| Milestone | Claimed | Real | Drift |");
    lines.push("|-----------|---------|------|-------|");
    for (const p of drifted.slice(0, 60)) {
      lines.push(`| ${p.id} | ${p.claimedStatus} | ${p.derivedStatus} | ${p.drift} |`);
    }
  }
  lines.push("");
  lines.push("## Top milestones with most pending units");
  lines.push("");
  lines.push("| Milestone | Pending | Total | Shipped/Total |");
  lines.push("|-----------|---------|-------|---------------|");
  for (const p of stillToBuild) {
    lines.push(`| ${p.id} | ${p.pending} | ${p.total} | ${p.shipped}/${p.total} |`);
  }
  lines.push("");
  lines.push("## How to use");
  lines.push("");
  lines.push("- Audit chats: cross-reference your gap lists against the **shipped**");
  lines.push("  column in MILESTONE_PROGRESS.json. A unit listed there is in git;");
  lines.push("  do not flag it as missing without inspecting the commit.");
  lines.push("- Roadmap planners: rows where `claimedStatus !== derivedStatus` are");
  lines.push("  candidates for a status update on the milestone envelope.");
  lines.push("- New Claude sessions: this file + PRISM-INVENTORY-LATEST.md +");
  lines.push("  knowledge/wiki/index.md collectively answer \"what's already built?\"");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  process.stderr.write(`[milestone-progress] loading milestones from ${MILESTONE_DIR}\n`);
  const milestones = await loadMilestones();
  process.stderr.write(`[milestone-progress] loaded ${milestones.length} milestone envelopes\n`);

  process.stderr.write(`[milestone-progress] scanning git log (last ${SINCE})\n`);
  const shipped = loadShippedFromGit();
  process.stderr.write(`[milestone-progress] indexed ${shipped.size} (milestone-tag, unit-id) commits\n`);

  const progress = computeProgress(milestones, shipped);

  // Sort canonical: by track, then by id, for stable JSON diff.
  progress.sort((a, b) =>
    (a.track || "").localeCompare(b.track || "") || a.id.localeCompare(b.id),
  );

  const json = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    window: SINCE,
    totals: {
      milestones: progress.length,
      units: progress.reduce((a, p) => a + p.total, 0),
      shipped: progress.reduce((a, p) => a + p.shipped, 0),
      pending: progress.reduce((a, p) => a + p.pending, 0),
      drift: progress.filter((p) => p.drift !== "consistent" && p.drift !== "n/a").length,
    },
    milestones: progress,
  };

  atomicWriteFileSync(OUT_JSON, JSON.stringify(json, null, 2) + "\n");
  atomicWriteFileSync(OUT_MD, renderMarkdown(progress));

  process.stderr.write(`[milestone-progress] wrote ${OUT_JSON}\n`);
  process.stderr.write(`[milestone-progress] wrote ${OUT_MD}\n`);
  process.stderr.write(
    `[milestone-progress] totals: ${json.totals.shipped}/${json.totals.units} shipped (${json.totals.drift} drift cases)\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[milestone-progress] FAILED: ${err.stack || err.message}\n`);
  process.exit(1);
});
