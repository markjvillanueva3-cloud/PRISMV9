#!/usr/bin/env node
// tier: T3
// U-HFR02 wire — cross-slot skill propagation Stop driver.
//
// On Stop, if THIS session's slot shipped a skill recently (signal: a new
// SKILL-CANDIDATE-AUTOPASS-<id>.md under state/shared/specs/), check whether
// any OTHER recently-shipped skills from other slots have a highly-similar
// signature. Advisory only — surfaces consolidation candidates to operator.
//
// Knobs: PRISM_HFR02_DISABLE=1

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { findCrossSlotMatches } from "../../scripts/lib/hermes-frontier-utils.mjs";

const SPECS_DIR = "H:/prism/state/shared/specs";
const HORIZON_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function readRecentSkillCandidates() {
  if (!existsSync(SPECS_DIR)) return [];
  const cutoff = Date.now() - HORIZON_MS;
  const out = [];
  let entries;
  try { entries = readdirSync(SPECS_DIR, { withFileTypes: true }); }
  catch { return []; }
  for (const e of entries) {
    if (!e.isFile() || !e.name.startsWith("SKILL-CANDIDATE-AUTOPASS-")) continue;
    const path = join(SPECS_DIR, e.name);
    try {
      const st = statSync(path);
      if (st.mtimeMs < cutoff) continue;
      const raw = readFileSync(path, "utf8");
      const sigMatch = raw.match(/^[`\s]*([A-Z][\w|:.-]+(?:\|[\w|:.-]+)+)/m);
      out.push({
        path,
        mtimeMs: st.mtimeMs,
        fullSignature: sigMatch ? sigMatch[1] : "",
        filename: e.name,
      });
    } catch { /* skip */ }
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}

async function main() {
  if (process.env.PRISM_HFR02_DISABLE === "1") process.exit(0);
  const candidates = readRecentSkillCandidates();
  if (candidates.length < 2) process.exit(0);
  // Treat the most-recent as "mine", rest as peer pool
  const my = candidates[0];
  if (!my.fullSignature) process.exit(0);
  const others = candidates.slice(1);
  const matches = findCrossSlotMatches(my, others);
  if (matches.length === 0) process.exit(0);
  const lines = [
    `💡 Cross-slot skill propagation — your recent candidate has ${matches.length} peer match(es):`,
    `  Your candidate: ${my.filename}`,
  ];
  for (const m of matches) {
    lines.push(`    → peer: ${m.peer?.filename || "(unknown)"} (score=${m.score.toFixed(2)}, mode=${m.mode})`);
  }
  lines.push(`  Consider consolidating via /dedup before promoting to .claude/commands/.`);
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "Stop", additionalContext: lines.join("\n") } }));
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith("stop-cross-slot-skill-suggest.mjs")) {
  main().catch(() => process.exit(0));
}
