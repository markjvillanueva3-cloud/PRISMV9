#!/usr/bin/env node
// scripts/bridge-status-resolver.mjs
//
// U-BRIDGE-STATUS-RESOLVER — resolve bridge-unit status from git history.
//
// Closes audit-2026-05-26 finding #8 (P1): "42 bridge units all
// status:unknown in ROADMAP-CONSOLIDATED despite 50 BRIDGE-* commits in git
// history (6 SFC deep-integration shipped — Fusion / hyperMILL / InventorHSM
// / SolidWorks). Consolidator never resolves bridge status against git."
//
// Strategy: scan `git log --grep=BRIDGE-` for shipped bridge commits;
// extract milestone scope + unit id from `[SCOPE]/U-ID:` subject pattern;
// emit `state/shared/bridge-status-resolved.json` keyed by milestone-id with
// {status: "completed_real", shipped_commits: [shas], last_shipped: ISO}.
//
// Downstream: scripts/consolidate-roadmaps.mjs can optionally load this
// sidecar to flip bridge unit `status:"unknown"` → `status:"completed_real"`
// in the next ROADMAP-CONSOLIDATED regen. Wiring is a separate operator-
// decision unit so this resolver stays read-only + side-effect-free except
// for the single sidecar write.
//
// Security: uses execFileSync (no shell) per the PRISM security-reminder hook;
// all arguments are caller-controlled non-interpolated strings.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUTPUT = path.join(ROOT, "state/shared/bridge-status-resolved.json");
const SCHEMA_VERSION = 1;
const DEFAULT_LIMIT = 5000;

// Bridge commit patterns. Captures the [SCOPE]/U-ID prefix from commit subjects.
// Matched scopes count as "BRIDGE-*" commits even if the milestone isn't in
// the DEEP_INTEGRATION_BRIDGES table — operators ship bridge work under varied
// milestone scopes (BRIDGE-SYNERGY-MS0, POST-BRIDGE-SYNERGY-MS0, etc.).
const BRIDGE_SUBJECT_RE = /\[([^\]]*BRIDGE[^\]]*)\][^\]]*\]?\s*\/\s*(U-[A-Z0-9_-]+)/i;

function getOutputPath() {
  return process.env.PRISM_BRIDGE_RESOLVER_OUTPUT || DEFAULT_OUTPUT;
}
function getCommitLimit() {
  const n = Number(process.env.PRISM_BRIDGE_RESOLVER_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT;
}

/**
 * Run `git log` via execFileSync (no shell — injection-safe). Returns array
 * of {sha, ts, subject}. Defensive — returns [] on any subprocess failure.
 */
export function runGitLog({ root = ROOT, grepPattern = "BRIDGE-", limit = DEFAULT_LIMIT } = {}) {
  try {
    const out = execFileSync(
      "git",
      ["-C", root, "log", `--grep=${grepPattern}`, "--format=%H|%cI|%s", "-n", String(limit)],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    return out
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha, ts, ...rest] = line.split("|");
        return { sha, ts, subject: rest.join("|") };
      });
  } catch {
    return [];
  }
}

/**
 * Parse a commit subject for the [SCOPE]/U-ID bridge pattern. Returns
 * {milestone, unitId} or null when the line isn't a bridge commit.
 *
 * Examples that match:
 *   "[MAIN] [BRIDGE-SYNERGY-MS0]/U-BRIDGE-MASTERPOST-CAM: title"
 *   "[SLOT-OSCAR] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-MAHALANOBIS-OOD-GATE: ..."
 * NOT a match:
 *   "[GOAL-TSC-FIX] (slot:golf): ..."   — no BRIDGE in scope
 */
export function parseBridgeSubject(subject) {
  if (typeof subject !== "string") return null;
  const m = BRIDGE_SUBJECT_RE.exec(subject);
  if (!m) return null;
  return { milestone: m[1], unitId: m[2] };
}

/**
 * Group commits into bridge-unit resolution records. Returns a Map keyed by
 * `${milestone}::${unitId}` with {shipped_commits, last_shipped, count}.
 */
export function groupByBridgeUnit(commits) {
  const map = new Map();
  for (const c of commits) {
    const parsed = parseBridgeSubject(c.subject);
    if (!parsed) continue;
    const key = `${parsed.milestone}::${parsed.unitId}`;
    let rec = map.get(key);
    if (!rec) {
      rec = {
        milestone: parsed.milestone,
        unitId: parsed.unitId,
        status: "completed_real",
        shipped_commits: [],
        first_shipped: c.ts,
        last_shipped: c.ts,
        commit_count: 0,
      };
      map.set(key, rec);
    }
    rec.shipped_commits.push({ sha: c.sha, ts: c.ts, subject: c.subject.slice(0, 200) });
    rec.commit_count++;
    if (c.ts < rec.first_shipped) rec.first_shipped = c.ts;
    if (c.ts > rec.last_shipped) rec.last_shipped = c.ts;
  }
  return map;
}

/** Build the canonical sidecar envelope. */
export function buildEnvelope(commits, opts = {}) {
  const grouped = groupByBridgeUnit(commits);
  const records = Array.from(grouped.values()).sort((a, b) =>
    b.last_shipped.localeCompare(a.last_shipped),
  );
  return {
    schemaVersion: SCHEMA_VERSION,
    refreshedAt: new Date().toISOString(),
    source: "git log --grep=BRIDGE-",
    scanLimit: opts.limit || DEFAULT_LIMIT,
    scannedCommits: commits.length,
    resolvedCount: records.length,
    bridges: records,
    note: "Resolves audit-2026-05-26 finding #8 (42 bridge units status:unknown). consolidate-roadmaps.mjs can read this sidecar to flip bridge unit status:'unknown' → 'completed_real'. Read-only sidecar; downstream consolidator integration is a separate unit.",
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function writeEnvelope(envelope, outputPath) {
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, JSON.stringify(envelope, null, 2));
  return outputPath;
}

function main() {
  const args = process.argv.slice(2);
  const limit = getCommitLimit();
  const commits = runGitLog({ limit });
  const envelope = buildEnvelope(commits, { limit });

  if (args.includes("--json")) {
    console.log(JSON.stringify(envelope, null, 2));
    return;
  }
  if (args.includes("--dry-run")) {
    console.log(
      `# DRY RUN — would write to ${getOutputPath()} (${envelope.resolvedCount} bridge units resolved from ${envelope.scannedCommits} scanned commits)`,
    );
    return;
  }

  const out = writeEnvelope(envelope, getOutputPath());
  console.log(
    `# Wrote ${out} — ${envelope.resolvedCount} bridge unit(s) resolved from ${envelope.scannedCommits} scanned commits`,
  );
  if (envelope.resolvedCount > 0) {
    console.log(
      `# Top 5 most-recent: ${envelope.bridges
        .slice(0, 5)
        .map((b) => `${b.milestone}/${b.unitId}@${b.last_shipped.slice(0, 10)}`)
        .join(", ")}`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main();
}
