#!/usr/bin/env node
// Audit roadmap-index.json against git log to detect status drift.
// For each milestone: count unique U-<unit-id> commits, compare to recorded
// completed_units. Emits drift report + suggested patches.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { isSkippable } from "./lib/roadmap-terminal-status.mjs";

const REPO = "H:/prism";
const INDEX_PATH = resolve(REPO, "mcp-server/data/roadmap-index.json");
const REPORT_PATH = resolve(REPO, "mcp-server/data/state/roadmap-drift-report.json");

const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
const milestones = index.milestones || [];

function gitLog(args) {
  try {
    return execFileSync("git", ["-C", REPO, "log", "--all", "--oneline", ...args], {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

// Pull all commit subjects once; filter in-memory per milestone (much faster
// than spawning git per milestone).
const allCommits = gitLog([]).split(/\r?\n/).filter(Boolean);

const drifts = [];

for (const m of milestones) {
  if (isSkippable(m.status)) continue;
  if (!m.id) continue;

  // Match commits like "[MAIN] <ID>/U-... " or "<ID>/U-..." or "<ID>:" prefix
  const idEsc = m.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|\\s|\\])(${idEsc})[\\/:]([A-Za-z][A-Za-z0-9_-]*)`);

  const unitsSeen = new Set();
  for (const line of allCommits) {
    const match = line.match(re);
    if (match && match[2]) unitsSeen.add(match[2].toUpperCase());
  }

  const observed = unitsSeen.size;
  const recorded = m.completed_units || 0;
  const total = m.total_units || 0;

  if (observed === recorded) continue;

  const proposedStatus = observed === 0
    ? m.status
    : observed >= total && total > 0
      ? "complete"
      : "in_progress";

  drifts.push({
    id: m.id,
    title: m.title,
    track: m.track,
    current_status: m.status,
    proposed_status: proposedStatus,
    recorded_completed: recorded,
    observed_completed: observed,
    total_units: total,
    delta: observed - recorded,
    sample_units: [...unitsSeen].slice(0, 6),
  });
}

drifts.sort((a, b) => b.delta - a.delta);

const summary = {
  generated_at: new Date().toISOString(),
  total_milestones: milestones.length,
  drifts_found: drifts.length,
  drifts,
};

writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
console.log(`Drift report written: ${REPORT_PATH}`);
console.log(`Drifted milestones: ${drifts.length}`);
console.log(`Top 10 by delta:`);
for (const d of drifts.slice(0, 10)) {
  console.log(`  ${d.id.padEnd(28)} ${d.current_status.padEnd(12)} -> ${d.proposed_status.padEnd(12)}  recorded=${d.recorded_completed}  observed=${d.observed_completed}  total=${d.total_units}`);
}
