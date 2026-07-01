#!/usr/bin/env node
// tier: T2
/**
 * session-start-memory-pulse-inject.mjs — auto-inject USER.md + ≤1KB memory pulse on SessionStart.
 *
 * MEMORY-WIKI-OPTIMIZATION-MS0 / U-MWO04 (slot:bravo 2026-05-26).
 * Closes the dunik 4-Layer Rule-1 + KSimback Hermes-Layer-1 gap: PRISM auto-loads
 * CLAUDE.md (74→52KB after U-MWO01) but had no equivalent USER.md auto-load.
 * This hook reads H:/prism/USER.md (shipped in U-MWO03) and the top-N entries of
 * state/shared/MEMORY-RECENT.md, emits combined as additionalContext on every
 * SessionStart event.  Fail-silent if either file missing.
 *
 * Caps: USER.md trimmed to 4 KB display, MEMORY-RECENT top-10 entries (~1.5 KB).
 * Knobs: PRISM_MEMORY_PULSE_DISABLE=1 · PRISM_MEMORY_PULSE_TOP_N=N (default 10) · PRISM_MEMORY_PULSE_USER_MAX_KB=N (default 4).
 *
 * Wiring (separate): add to settings.json SessionStart chain after session-start-auto-resume.
 *
 * @module hooks/session-start-memory-pulse-inject
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const USER_MD = path.join(ROOT, "USER.md");
const MEMORY_RECENT = path.join(ROOT, "state/shared/MEMORY-RECENT.md");

const SILENCE = { continue: true };
function emit(out) {
  process.stdout.write(`${JSON.stringify(out)}\n`);
  process.exit(0);
}

function readFileSafe(p, maxBytes) {
  try {
    if (!fs.existsSync(p)) return null;
    const buf = fs.readFileSync(p, "utf8");
    return maxBytes && buf.length > maxBytes ? `${buf.slice(0, maxBytes - 12)}\n…[truncated]` : buf;
  } catch { return null; }
}

function topEntries(md, n) {
  if (!md) return "";
  // MEMORY-RECENT.md is a markdown bullet list — keep only entries (lines starting with "- ").
  const lines = md.split(/\r?\n/);
  const bullets = lines.filter((l) => l.startsWith("- ")).slice(0, n);
  return bullets.join("\n");
}

async function main() {
  if (process.env.PRISM_MEMORY_PULSE_DISABLE === "1") { emit(SILENCE); return; }

  const topN = Math.max(1, Math.min(50, Number(process.env.PRISM_MEMORY_PULSE_TOP_N || 10)));
  const userMaxKB = Math.max(1, Math.min(20, Number(process.env.PRISM_MEMORY_PULSE_USER_MAX_KB || 4)));

  // Read stdin to honor the SessionStart event shape (we don't currently branch on it but consume to keep the harness happy).
  let _stdin = "";
  for await (const chunk of process.stdin) _stdin += chunk;

  const userBody = readFileSafe(USER_MD, userMaxKB * 1024);
  const recentMd = readFileSafe(MEMORY_RECENT, 50 * 1024);
  const recentTop = topEntries(recentMd, topN);

  if (!userBody && !recentTop) { emit(SILENCE); return; }

  const parts = [];
  if (userBody) {
    parts.push("## 👤 USER.md — operator preferences (Hermes Layer-1 substrate)\n\n" + userBody.trim());
  }
  if (recentTop) {
    parts.push(`## 🧠 Recent memory pulse (top ${topN} of state/shared/MEMORY-RECENT.md)\n\n${recentTop}\n\n_Full list: \`H:/prism/state/shared/MEMORY-RECENT.md\` · search: \`memory_search "<query>"\`_`);
  }

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: parts.join("\n\n---\n\n"),
    },
  });
}

main().catch(() => emit(SILENCE));
