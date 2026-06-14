#!/usr/bin/env node
// tier: T4
/**
 * stop-obsidian-memory-feed.mjs — Stop Hook
 * =========================================
 *
 * Dedicated, RELIABLE auto-memory -> Obsidian feed.
 *
 * Spawns `obsidian-memory-sync.mjs --quiet` detached on Stop so every memory
 * file written to C:/Users/<u>/.claude/projects/H--prism/memory/*.md gets
 * mirrored into the H: Obsidian vault (knowledge/memories/<type>/).
 *
 * WHY a separate hook (not the existing stop-obsidian-memory-extract.mjs):
 * that hook ALSO spawns the sync, but only AFTER a 5-min rate-limit + a
 * transcript + a >=5-message gate + the Ollama-extraction path. With 13 chats
 * hitting Stop the extract hook is almost always rate-limited or Ollama-gated,
 * so the memory->Obsidian feed was effectively unreliable. This hook does ONE
 * thing, with its OWN independent throttle, decoupled from Ollama entirely.
 *
 * Fire-and-forget: never blocks Stop, always {continue:true}, fail-soft.
 *
 * Knobs:
 *   PRISM_OBSIDIAN_FEED_DISABLE=1      — disable entirely
 *   PRISM_OBSIDIAN_FEED_INTERVAL_MS=N  — throttle window (default 180000 = 3m)
 *   PRISM_DREAM_STAGE_MEMORY=1         — ALSO stage memory diff as a Hermes-
 *                                        Dreaming receipt bundle under
 *                                        state/shared/dream-artifacts/<id>/
 *                                        (DREAM-RECEIPT-MS0 / U-DR08 — opt-in).
 *                                        Operator reviews via /dream-review
 *                                        before any apply. Strictly advisory:
 *                                        the bundle is STAGED, not applied.
 *
 * @hook Stop
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname } from "node:path";

const SYNC_SCRIPT = "H:/prism/scripts/obsidian-memory-sync.mjs";
const STAMP_FILE = "H:/prism/.claude/cache/obsidian-memory-feed-last.json";
const SYNC_LOG = "H:/prism/.claude/cache/obsidian-memory-feed.log";
const DEFAULT_INTERVAL_MS = 3 * 60 * 1000; // 3 min — shorter than the extract hook's 5 min

// U-DR08: opt-in second-spawn for Hermes-Dreaming receipt staging.
const DREAM_STAGE_SCRIPT = "H:/prism/scripts/dream-stage-memory-receipt.mjs";
const DREAM_STAGE_LOG = "H:/prism/.claude/cache/dream-stage-memory-receipt.log";

// U-MEMO-SEMANTIC-RECALL (F3): keep the semantic-recall embedding cache fresh.
// Default-ON detached incremental rebuild on the same cadence memos are fed, so
// the cache never silently goes stale (closes the no-refresh gap arm-C flagged).
// Incremental (hash-reuse) → only NEW/changed memos embed; unchanged ones reuse
// with zero Ollama calls. Reads the same C: memory source the sync reads, so it
// is independent of sync completion. Disable: PRISM_MEMO_EMBED_REFRESH_DISABLE=1.
const MEMO_EMBED_SCRIPT = "H:/prism/scripts/build-memo-embedding-cache.mjs";
const MEMO_EMBED_LOG = "H:/prism/.claude/cache/memo-embed-refresh.log";

function intervalMs() {
  const raw = Number(process.env.PRISM_OBSIDIAN_FEED_INTERVAL_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_INTERVAL_MS;
}

function ensureDir(dir) {
  try { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); } catch { /* fail-soft */ }
}

// Shared stamp (single path) => GLOBAL throttle across all 26 chats. The sync
// is idempotent (rewrites the whole vault from the whole memory dir), so one
// run per window fleet-wide is sufficient and prevents an I/O storm.
function throttled() {
  try {
    const last = JSON.parse(readFileSync(STAMP_FILE, "utf8"));
    return (Date.now() - last.timestamp) < intervalMs();
  } catch {
    return false; // missing/corrupt stamp => not throttled, run
  }
}

function recordStamp() {
  try {
    ensureDir(dirname(STAMP_FILE));
    writeFileSync(STAMP_FILE, JSON.stringify({ timestamp: Date.now() }));
  } catch { /* fail-soft — worst case we sync slightly more often */ }
}

function done(systemMessage) {
  const out = { continue: true };
  if (systemMessage) out.systemMessage = systemMessage;
  console.log(JSON.stringify(out));
}

function main() {
  if (process.env.PRISM_OBSIDIAN_FEED_DISABLE === "1") return done();
  if (throttled()) return done();
  if (!existsSync(SYNC_SCRIPT)) return done();

  let pid = null;
  try {
    ensureDir(dirname(SYNC_LOG));
    const fd = openSync(SYNC_LOG, "a");
    const child = spawn(process.execPath, [SYNC_SCRIPT, "--quiet"], {
      detached: true,
      windowsHide: true,
      stdio: ["ignore", fd, fd],
    });
    child.unref();
    pid = child.pid;
    recordStamp(); // stamp only on a real spawn so a spawn failure retries next Stop
  } catch (e) {
    // R12 fail-loud: never block Stop, but leave an auditable breadcrumb so a
    // broken node path doesn't silently degrade to zero syncs forever.
    try {
      ensureDir(dirname(SYNC_LOG));
      writeFileSync(
        SYNC_LOG.replace(/\.log$/, ".err"),
        JSON.stringify({ ts: new Date().toISOString(), error: e && e.message }) + "\n",
      );
    } catch { /* fail-soft */ }
    return done(); // never block Stop
  }

  // U-DR08: opt-in additional spawn for Hermes-Dreaming receipt staging.
  // Independent of the main throttle so a fast-cadence operator can enable
  // staging without losing the 3-min sync throttle. Fail-soft.
  if (process.env.PRISM_DREAM_STAGE_MEMORY === "1" && existsSync(DREAM_STAGE_SCRIPT)) {
    try {
      ensureDir(dirname(DREAM_STAGE_LOG));
      const dfd = openSync(DREAM_STAGE_LOG, "a");
      const dchild = spawn(process.execPath, [DREAM_STAGE_SCRIPT], {
        detached: true,
        windowsHide: true,
        stdio: ["ignore", dfd, dfd],
        env: { ...process.env, PRISM_DREAM_STAGE_QUIET: "1" },
      });
      dchild.unref();
    } catch { /* fail-soft — Stop must never block on staging */ }
  }

  // F3: refresh the semantic-recall embedding cache (default-ON, detached,
  // incremental). Same throttle as the sync (we're past the throttle gate), so
  // ≤once/3min fleet-wide. Incremental builder re-embeds only changed memos;
  // unchanged ones reuse with no Ollama call. Fail-soft — Stop never blocks on it.
  if (process.env.PRISM_MEMO_EMBED_REFRESH_DISABLE !== "1" && existsSync(MEMO_EMBED_SCRIPT)) {
    try {
      ensureDir(dirname(MEMO_EMBED_LOG));
      const efd = openSync(MEMO_EMBED_LOG, "a");
      const echild = spawn(process.execPath, [MEMO_EMBED_SCRIPT], {
        detached: true,
        windowsHide: true,
        stdio: ["ignore", efd, efd],
      });
      echild.unref();
    } catch { /* fail-soft — Stop must never block on cache refresh */ }
  }

  done(pid ? `obsidian-memory-feed: sync spawned (pid=${pid})` : undefined);
}

try {
  main();
} catch (err) {
  console.error("[obsidian-memory-feed] error:", err && err.message);
  console.log(JSON.stringify({ continue: true }));
}
