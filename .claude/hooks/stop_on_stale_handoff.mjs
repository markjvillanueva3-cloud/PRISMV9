#!/usr/bin/env node
// tier: T4
/**
 * stop_on_stale_handoff.mjs -- Tier 6 Stop Hook
 * Warns when there is no FRESH (<24h) handoff -- i.e. checkpointing has gone quiet.
 *
 * FIX 2026-06-14 (slot:bravo, AGENTIC-SUBSTRATE-BRIDGE): the prior version scanned the
 * H:/prism ROOT for HANDOFF-*.md, but per-chat handoffs have lived in
 * state/shared/handoffs/ since PER-CHAT-HANDOFF -- so the root scan found ZERO files and the
 * stale check was DEAD in production (silent-failure class). Repointed to the canonical dir.
 * Semantic corrected too: with 26 slots there are always many legitimately-old handoffs, so
 * "ANY handoff >24h" would warn EVERY session (noise). The meaningful signal is "the NEWEST
 * handoff is >24h old" = no recent checkpoint anywhere in the fleet. Pure logic is extracted to
 * collectStaleSignals() so it is testable against a temp fixture (R9). The compaction-survival
 * root check is preserved unchanged.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HANDOFF_DIR = "H:/prism/state/shared/handoffs";
const SURVIVAL_FILE = "H:/prism/.claude/helpers/.compaction-survival.md";
const MAX_AGE_MS = 86400000; // 24h

/**
 * Pure staleness collector (no stdin/stdout) -- hermetically testable.
 * Returns a list of human-readable stale signal strings:
 *  - "compaction-survival.md" if that single file is itself >maxAgeMs old;
 *  - "handoffs-stale (...)"   if HANDOFF-*.md exist in handoffDir but the NEWEST is >maxAgeMs
 *    (i.e. no fresh checkpoint). An empty/missing dir is NOT stale (nothing to warn about yet).
 * @param {{handoffDir?:string, survivalFile?:string, now?:number, maxAgeMs?:number}} o
 * @returns {string[]}
 */
export function collectStaleSignals(o = {}) {
  const {
    handoffDir = HANDOFF_DIR,
    survivalFile = SURVIVAL_FILE,
    now = Date.now(),
    maxAgeMs = MAX_AGE_MS,
  } = o;
  const stale = [];

  // (1) compaction-survival: stale if the file itself is older than the budget (preserved).
  if (survivalFile && fs.existsSync(survivalFile)) {
    if (now - fs.statSync(survivalFile).mtimeMs > maxAgeMs) stale.push("compaction-survival.md");
  }

  // (2) handoffs: warn ONLY when the freshest HANDOFF-*.md is itself stale. On a busy fleet
  //     there is always a recent handoff, so this stays quiet; it fires only when checkpointing
  //     has genuinely gone quiet for >maxAgeMs. (Old logic warned on ANY stale file -> noise.)
  if (handoffDir && fs.existsSync(handoffDir)) {
    let newestAge = Infinity;
    let newestName = null;
    for (const f of fs.readdirSync(handoffDir)) {
      if (!f.startsWith("HANDOFF-") || !f.endsWith(".md")) continue;
      let mt;
      try { mt = fs.statSync(path.join(handoffDir, f)).mtimeMs; } catch { continue; }
      const age = now - mt;
      if (age < newestAge) { newestAge = age; newestName = f; }
    }
    if (newestName !== null && newestAge > maxAgeMs) {
      stale.push(`handoffs-stale (newest ${newestName} ~${Math.round(newestAge / 3600000)}h old)`);
    }
  }

  return stale;
}

async function main() {
  await new Promise(r => { let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d)); });
  try {
    const staleFiles = collectStaleSignals();
    if (staleFiles.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `Stale handoff signal (${staleFiles.length}): ${staleFiles.slice(0, 2).join("; ")}`,
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main().catch(() => console.log(JSON.stringify({ result: "pass" })));
