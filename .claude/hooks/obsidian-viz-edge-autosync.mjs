#!/usr/bin/env node
// tier: T3
// obsidian-viz-edge-autosync.mjs -- XSUB-AUTOSYNC (slot:bravo, mill-knowledge goal 2026-06-12)
//
// PostToolUse(Edit|Write|MultiEdit) hook: when a knowledge note (Obsidian
// memory / wiki / tribal) or a galaxy MEMORY.md is written, refresh the
// CROSS-SUBSTRATE EDGE SIDECAR so the system-viz graph's Obsidian<->viz edges
// stay current -- closing the operator's "edit one -> auto-update the other"
// bridge (the Obsidian -> system-viz direction).
//
// SAFETY / single-writer respect (verified vs generate-cross-substrate-edges.mjs):
//   - Runs ONLY scripts/generate-cross-substrate-edges.mjs, which writes ONLY
//     its own augmentation sidecar (cross-substrate-edges-augmentation.json) and
//     NEVER system-graph.json. sierra's regen-viz stays the single-writer of the
//     ~548MB graph; this hook only keeps the lightweight sidecar fresh so the
//     next regen-viz / browser reload folds current edges.
//   - DETACHED spawn (.unref()) -> never blocks the tool call (~1ms sync cost).
//   - DEBOUNCED per-tree (skip if regenerated within DEBOUNCE_MS) -> no thrash.
//   - FAIL-SOFT: every error -> {continue:true}, never blocks an Edit/Write.
//   - Runs the generator from the EDITED FILE'S OWN tree root (no cross-tree
//     paradox); if that tree lacks the script/inputs the generator no-ops/throws
//     and the detached child dies silently.
//
// Knobs:
//   PRISM_XSUB_AUTOSYNC_DISABLE=1     -- disable entirely
//   PRISM_XSUB_AUTOSYNC_DEBOUNCE_MS=N -- debounce window (default 45000)
//   PRISM_XSUB_AUTOSYNC_VERBOSE=1     -- log decisions to stderr

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_DEBOUNCE_MS = 45000;
const C_BRAIN_RE = /[\\/]\.claude[\\/]projects[\\/]h--prism[\\/]memory[\\/][^\\/]+\.md$/i;

/** True when a written file is a knowledge note whose change can move cross-substrate edges. */
export function qualifies(filePath) {
  if (typeof filePath !== "string" || !filePath) return false;
  const p = filePath.replace(/\\/g, "/");
  if (!/\.md$/i.test(p)) return false;
  if (/\/knowledge\/(memories|wiki|tribal)\//i.test(p)) return true;          // vault notes
  if (/\/mcp-server\/src\/engines\/[^/]+\/MEMORY\.md$/i.test(p)) return true;  // galaxy brain (Convention C source)
  if (C_BRAIN_RE.test(filePath)) return true;                                  // C: live auto-memory brain
  return false;
}

/**
 * Resolve the repo tree root that owns the edited file (so we run THAT tree's
 * generator + refresh THAT tree's sidecar -- no cross-tree timing paradox).
 * Returns null when no tree carries the generator (fail-soft skip).
 */
export function resolveTreeRoot(filePath, env = process.env, exists = fs.existsSync) {
  if (typeof filePath !== "string") return null;
  const p = filePath.replace(/\\/g, "/");
  let root = null;
  const kIdx = p.toLowerCase().indexOf("/knowledge/");
  const mIdx = p.toLowerCase().indexOf("/mcp-server/");
  if (kIdx > 0) root = p.slice(0, kIdx);
  else if (mIdx > 0) root = p.slice(0, mIdx);
  else if (C_BRAIN_RE.test(filePath)) root = (env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/");
  if (!root) return null;
  const gen = path.join(root, "scripts/generate-cross-substrate-edges.mjs");
  try {
    return exists(gen) ? root : null;
  } catch {
    return null;
  }
}

/** Debounce: true if the last run stamp is within the window. */
export function isDebounced(stampMs, nowMs, windowMs) {
  if (typeof stampMs !== "number" || !Number.isFinite(stampMs)) return false;
  return nowMs - stampMs < windowMs;
}

function readStamp(stampPath) {
  try {
    return Number(JSON.parse(fs.readFileSync(stampPath, "utf8")).at) || 0;
  } catch {
    return 0;
  }
}

async function main() {
  const done = () => process.stdout.write(JSON.stringify({ continue: true }));
  try {
    if (process.env.PRISM_XSUB_AUTOSYNC_DISABLE === "1") return done();
    const verbose = process.env.PRISM_XSUB_AUTOSYNC_VERBOSE === "1";
    const windowMs = Number(process.env.PRISM_XSUB_AUTOSYNC_DEBOUNCE_MS) || DEFAULT_DEBOUNCE_MS;

    let stdin = "";
    for await (const c of process.stdin) stdin += c;
    let env;
    try { env = JSON.parse(stdin); } catch { env = {}; }
    const fp = env.tool_input?.file_path || env.tool_input?.notebook_path;
    if (!qualifies(fp)) return done();

    const root = resolveTreeRoot(fp);
    if (!root) { if (verbose) console.error(`[xsub-autosync] no generator tree for ${fp}`); return done(); }

    const vizDir = path.join(root, "state/shared/system-viz");
    const stampPath = path.join(vizDir, ".xsub-autosync-stamp");
    const now = Date.now();
    if (isDebounced(readStamp(stampPath), now, windowMs)) {
      if (verbose) console.error(`[xsub-autosync] debounced (<${windowMs}ms)`);
      return done();
    }

    // Stamp BEFORE spawning so concurrent edits debounce even if the child is slow.
    try {
      if (!fs.existsSync(vizDir)) fs.mkdirSync(vizDir, { recursive: true });
      fs.writeFileSync(stampPath, JSON.stringify({ at: now, by: path.basename(String(fp)) }), "utf8");
    } catch { /* fail-soft: a missing vizDir means the generator would no-op anyway */ }

    const gen = path.join(root, "scripts/generate-cross-substrate-edges.mjs");
    try {
      const child = spawn(process.execPath, [gen], { cwd: root, detached: true, stdio: "ignore" });
      child.unref();
      if (verbose) console.error(`[xsub-autosync] regen edges in ${root} (pid ${child.pid})`);
    } catch (e) {
      if (verbose) console.error(`[xsub-autosync] spawn failed: ${e.message}`);
    }
    return done();
  } catch (e) {
    if (process.env.PRISM_XSUB_AUTOSYNC_VERBOSE === "1") console.error(`[xsub-autosync] ${e?.message}`);
    return done();
  }
}

// Only run main() when invoked directly (not when imported by the test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
}
