#!/usr/bin/env node
/**
 * psn-autonomy-data-ingest.mjs
 *
 * AUTONOMY PRIMITIVE #1 — continuous data ingestion for the PSN self-learning loop
 * (per `state/shared/specs/PSN-AUTONOMY-RESEARCH-R4-2026-05-23.md`).
 *
 * Reads PSN training signals from across the fleet and appends to a single
 * append-only JSONL ledger that downstream trainer crons consume:
 *   - MILESTONE_PROGRESS deltas (units shipped this window)
 *   - SCRUTINY_LEDGER entries (3-of-3 PASS/FAIL outcomes)
 *   - git log --since (commit subjects with [SCOPE]/U-ID)
 *
 * Security: uses execFileSync (no shell interpolation) per CLAUDE.md +
 * project convention. All user-derived inputs (--since flag) are charset-
 * validated before reaching git's argv.
 *
 * Idempotency: reads last-run timestamp from `state/shared/psn-autonomy-last-run.json`;
 * only emits events with `ts > lastRun`. Atomic write via temp + rename.
 *
 * NO STUBS — every emit is a real signal from a real on-disk source.
 *
 * Usage:
 *   node scripts/psn-autonomy-data-ingest.mjs            # ingest since last run
 *   node scripts/psn-autonomy-data-ingest.mjs --since 1h # override window (charset-validated)
 *   node scripts/psn-autonomy-data-ingest.mjs --json     # report what would be ingested, no write
 *   node scripts/psn-autonomy-data-ingest.mjs --dry-run  # alias for --json
 *
 * Author: charlie slot (claude-451f7328) /goal-9 iter1, 2026-05-23.
 * Doctrine: feedback_always_capture_lessons (Primitive 1 of 5).
 */

import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const REPO = "H:/prism";
const STATE_DIR = path.join(REPO, "state/shared");
const LAST_RUN = path.join(STATE_DIR, "psn-autonomy-last-run.json");
const SIGNAL_LEDGER = path.join(STATE_DIR, "psn-training-signal.jsonl");
const MILESTONE_PROGRESS = path.join(STATE_DIR, "MILESTONE_PROGRESS.json");
const SCRUTINY_LEDGER = path.join(REPO, "mcp-server/data/state/SCRUTINY_LEDGER.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--json") || args.includes("--dry-run");
const sinceFlagRaw = args[args.indexOf("--since") + 1];
// Charset-validate the --since flag before it reaches git argv (defense-in-depth)
const sinceFlag = sinceFlagRaw && /^\d+[smhd]$/.test(sinceFlagRaw) ? sinceFlagRaw : null;

function loadLastRun() {
  try {
    const j = JSON.parse(fs.readFileSync(LAST_RUN, "utf8"));
    return new Date(j.ts).getTime();
  } catch {
    return Date.now() - 24 * 60 * 60 * 1000;
  }
}

function saveLastRun(tsMs) {
  const tmp = LAST_RUN + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify({ ts: new Date(tsMs).toISOString() }, null, 2));
  fs.renameSync(tmp, LAST_RUN);
}

function ingestMilestoneShips(sinceMs) {
  const events = [];
  try {
    const mp = JSON.parse(fs.readFileSync(MILESTONE_PROGRESS, "utf8"));
    for (const m of mp.milestones || []) {
      if (!Array.isArray(m.shipped_units)) continue;
      for (const u of m.shipped_units) {
        const shipTs = new Date(u.shipped_at || 0).getTime();
        if (!shipTs || shipTs <= sinceMs) continue;
        events.push({
          type: "unit_shipped",
          ts: new Date(shipTs).toISOString(),
          ms_id: m.id,
          unit_id: u.id,
          commit_sha: u.commit_sha,
          slot: u.slot ?? null,
          source: "MILESTONE_PROGRESS",
        });
      }
    }
  } catch {
    // unavailable — no events this source this run
  }
  return events;
}

function ingestScrutinyPasses(sinceMs) {
  const events = [];
  try {
    const sl = JSON.parse(fs.readFileSync(SCRUTINY_LEDGER, "utf8"));
    const entries = sl.entries || sl.sessions || {};
    for (const [sessionId, entry] of Object.entries(entries)) {
      const ts = new Date(entry.cleared_at || entry.updated_at || entry.ts || 0).getTime();
      if (!ts || ts <= sinceMs) continue;
      const passed =
        (entry.opusReviewed === "pass" && entry.claudeReviewed === "pass" && entry.codexReviewed === "pass") ||
        (entry.selfReviewed && entry.agentReviewed);
      events.push({
        type: "scrutiny_outcome",
        ts: new Date(ts).toISOString(),
        session_id: sessionId,
        passed: !!passed,
        arms: {
          a: entry.opusReviewed ?? null,
          b: entry.claudeReviewed ?? entry.opusBReviewed ?? entry.geminiReviewed ?? null,
          c: entry.codexReviewed ?? entry.analystReviewed ?? null,
        },
        source: "SCRUTINY_LEDGER",
      });
    }
  } catch {
    // unavailable
  }
  return events;
}

function ingestGitCommits(sinceMs) {
  const events = [];
  try {
    const sinceISO = new Date(sinceMs).toISOString();
    // execFileSync — no shell, no interpolation; git treats each arg as literal.
    const out = execFileSync(
      "git",
      ["-C", REPO, "log", `--since=${sinceISO}`, "--format=%H|%ct|%s"],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 30000 }
    );
    for (const line of out.split("\n").filter(Boolean)) {
      const [sha, ctStr, subject] = line.split("|");
      if (!sha || !subject) continue;
      // Match `[MAIN]` optionally followed by 1+ extra bracket groups (e.g.,
      // `[BOOTSTRAP-SLOT-ENFORCE]`) before the milestone scope. Capture the
      // LAST bracket group as scope (the milestone), so dual-bracket commits
      // like `[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-INCORPORATION-MS0]/U-ID
      // (slot:charlie)` ingest correctly. Real fix for the silent-0 bug
      // observed 2026-05-24 (charlie /goal-10 iter1).
      if (!/^\[MAIN\]/i.test(subject)) continue;
      const slotMatch = subject.match(/\(slot:([a-z]+)/i);
      if (!slotMatch) continue;
      // Capture every [TOKEN] up to the slot marker; last one (excluding MAIN)
      // is the milestone scope. Unit-id is the optional /U-... after it.
      const bracketMatches = [...subject.matchAll(/\[([A-Z0-9-]+)\]/g)].map((m) => m[1]);
      const scopeBrackets = bracketMatches.filter((b) => b.toUpperCase() !== "MAIN");
      const scope = scopeBrackets.length ? scopeBrackets[scopeBrackets.length - 1] : null;
      if (!scope) continue;
      const unitMatch = subject.match(/\/(U-[A-Z0-9-]+)/i);
      events.push({
        type: "scoped_commit",
        ts: new Date(Number(ctStr) * 1000).toISOString(),
        commit_sha: sha.slice(0, 12),
        scope,
        unit_id: unitMatch ? unitMatch[1] : null,
        slot: slotMatch[1].toLowerCase(),
        subject: subject.slice(0, 200),
        source: "git_log",
      });
    }
  } catch {
    // git unavailable
  }
  return events;
}

function appendJsonlAtomic(filePath, events) {
  if (events.length === 0) return 0;
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.appendFileSync(filePath, lines, { encoding: "utf8" });
  return events.length;
}

function parseDuration(s) {
  const m = String(s).match(/^(\d+)([smhd])$/);
  if (!m) return 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  switch (m[2]) {
    case "s": return n * 1000;
    case "m": return n * 60 * 1000;
    case "h": return n * 60 * 60 * 1000;
    case "d": return n * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

function main() {
  const sinceMs = sinceFlag ? Date.now() - parseDuration(sinceFlag) : loadLastRun();
  const nowMs = Date.now();

  const events = [
    ...ingestMilestoneShips(sinceMs),
    ...ingestScrutinyPasses(sinceMs),
    ...ingestGitCommits(sinceMs),
  ].sort((a, b) => a.ts.localeCompare(b.ts));

  const report = {
    generated_at: new Date().toISOString(),
    since: new Date(sinceMs).toISOString(),
    until: new Date(nowMs).toISOString(),
    total_events: events.length,
    by_source: events.reduce((acc, e) => {
      acc[e.source] = (acc[e.source] || 0) + 1;
      return acc;
    }, {}),
    by_type: events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {}),
  };

  if (dryRun) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }

  const wrote = appendJsonlAtomic(SIGNAL_LEDGER, events);
  saveLastRun(nowMs);
  process.stdout.write(`[psn-autonomy-data-ingest] window=${report.since} → ${report.until}\n`);
  process.stdout.write(`[psn-autonomy-data-ingest] ingested ${wrote} events → ${SIGNAL_LEDGER}\n`);
  process.stdout.write(`[psn-autonomy-data-ingest] by-source: ${JSON.stringify(report.by_source)}\n`);
  process.stdout.write(`[psn-autonomy-data-ingest] by-type:   ${JSON.stringify(report.by_type)}\n`);
}

main();
