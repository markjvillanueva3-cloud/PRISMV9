#!/usr/bin/env node
/**
 * audit-partial-milestone-drift.mjs
 *
 * Standalone advisory CLI for the THIRD silent-drift class discovered by
 * charlie /loop iter3 (2026-05-23) while closing out WEDM-NEXT-MS0/U-WN06+U-WN08:
 *
 *   envelope.status = "in_progress"
 *   + unit.status   = "pending"
 *   + unit.title contains an XxxEngine name
 *   + that engine exists on disk at src/engines/<name>.ts (non-trivial size)
 *
 * Differs from:
 *   - audit-close-out-candidates.mjs (envelope-pending + declared deliverable file exists)
 *   - silent-close-out-drift.mjs    (envelope-complete + MILESTONE_PROGRESS-shipped=0)
 *
 * Advisory only — NEVER auto-flips envelopes. Operator close-out via 4-surface
 * flow per feedback_roadmap_close_out (envelope + roadmap-index + MILESTONE_PROGRESS
 * + BUILD_STATE + chat-bus).
 *
 * Usage:
 *   node scripts/audit-partial-milestone-drift.mjs               # markdown report → stdout
 *   node scripts/audit-partial-milestone-drift.mjs --json        # JSON → stdout
 *   node scripts/audit-partial-milestone-drift.mjs --min-bytes N # raise stub threshold (default 1024)
 *
 * Author: charlie slot (claude-451f7328) /loop iter5, 2026-05-23.
 */

import * as fs from "fs";
import * as path from "path";
import { findPartialMilestoneDrift, renderMarkdown } from "./lib/partial-milestone-drift.mjs";

const REPO = "H:/prism";
const MILESTONES_DIR = path.join(REPO, "mcp-server/data/milestones");
const ENGINES_DIR = path.join(REPO, "mcp-server/src/engines");

const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
const minBytesIdx = args.indexOf("--min-bytes");
const minEngineBytes = minBytesIdx >= 0 && args[minBytesIdx + 1] ? Number(args[minBytesIdx + 1]) : 1024;

function loadEnvelopes() {
  const out = [];
  for (const f of fs.readdirSync(MILESTONES_DIR)) {
    if (!f.endsWith(".json")) continue;
    try {
      const env = JSON.parse(fs.readFileSync(path.join(MILESTONES_DIR, f), "utf8"));
      out.push(env);
    } catch {
      // Skip parse errors; main audit reports them.
    }
  }
  return out;
}

function engineProbe(engName) {
  const p = path.join(ENGINES_DIR, engName + ".ts");
  try {
    const st = fs.statSync(p);
    return { exists: true, sizeBytes: st.size };
  } catch {
    return { exists: false, sizeBytes: 0 };
  }
}

const envelopes = loadEnvelopes();
const result = findPartialMilestoneDrift({ envelopes, engineProbe, options: { minEngineBytes } });

if (jsonOut) {
  process.stdout.write(JSON.stringify({
    generated_at: new Date().toISOString(),
    advisory_only: true,
    must_human_verify: true,
    caveat: "engine-on-disk ≠ engine-satisfies-spec. Always verify before flipping envelope.",
    scanned: result.scanned,
    candidates: result.candidates,
  }, null, 2) + "\n");
  process.exit(0);
}

const lines = [
  "# Partial-Milestone-Drift Candidates",
  "",
  `> Generated: ${new Date().toISOString()}`,
  "> Source: `scripts/audit-partial-milestone-drift.mjs`",
  `> Scanned: ${result.scanned.milestones} open milestones · ${result.scanned.units} pending units · ${result.scanned.engineMatches} engine-name matches`,
  "",
  "**Rule:** Advisory only — file presence ≠ spec correctness. Verify each candidate against the unit's `deliverables`, `acceptance`, and `exit_criteria` before flipping the envelope (per feedback_roadmap_close_out).",
  "",
  `## Candidates (${result.candidates.length})`,
  "",
  renderMarkdown(result.candidates),
];
process.stdout.write(lines.join("\n"));
