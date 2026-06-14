// scripts/lib/obsidian-mem-dir.mjs
// -----------------------------------
// OBSIDIAN-VAULT-SYNERGY/U-OBS-MEMDIR-HOMEDIR (slot:alpha, 2026-06-09)
//
// Single source of truth for "where the canonical Obsidian memory dir lives"
// for the post-ship retention pipeline (distill-session-learnings.mjs writes
// reference_post_ship_*.md here; handoff-memory-seed.mjs reads them back into
// the next chat's ## MEMORY_SEED block).
//
// WHY THIS EXISTS (the bug it fixes): both scripts previously hardcoded a
// DEAD foreign-machine default —
//   "C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory"
// This box is DESKTOP-N7MI1VB (home = C:/Users/wompu), so the literal path
// was wrong AND wrong-cased (the real dir is `H--prism`, lowercase). With no
// `PRISM_OBSIDIAN_MEM_DIR` env override set, the default was LIVE: the
// distiller wrote post-ship memos into a phantom `Mark Villanueva` tree that
// the C:->H: Obsidian feed (stop-obsidian-memory-feed.mjs, reads C:/wompu),
// semantic recall (memo-embed-lib.mjs, homedir-derived), and every other
// recall hook never see — a split-brain quarantine of the freshest retention
// signal. Deriving from os.homedir() (mirroring memo-embed-lib.mjs:19-21)
// makes the path correct on any machine without a hardcoded username.
//
// Precedence (highest first), so existing overrides keep working:
//   1. PRISM_OBSIDIAN_MEM_DIR  — legacy override these two scripts honored
//   2. PRISM_MEMORY_DIR        — the canonical var memo-embed-lib.mjs uses
//                                (unifies all recall consumers on one dir)
//   3. <homedir>/.claude/projects/H--prism/memory  — derived default
//
// Pure: no I/O. `env` is injectable so the resolution is unit-testable.

import path from "node:path";
import os from "node:os";

/**
 * Resolve the canonical Obsidian memory directory.
 * @param {NodeJS.ProcessEnv} [env=process.env] - env source (injectable for tests)
 * @returns {string} absolute path to the memory dir
 */
export function resolveObsidianMemDir(env = process.env) {
  const explicit = env.PRISM_OBSIDIAN_MEM_DIR || env.PRISM_MEMORY_DIR;
  if (explicit && String(explicit).trim()) return String(explicit).trim();
  return path.join(os.homedir(), ".claude", "projects", "H--prism", "memory");
}
