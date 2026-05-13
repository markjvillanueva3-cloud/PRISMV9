#!/usr/bin/env node
/**
 * inventory-freshness.mjs — hourly staleness probe for PRISM-INVENTORY-LATEST.md.
 *
 * U-CLEANUP-G6 (CLEANUP-MS0). Compares:
 *   (a) PRISM-INVENTORY-LATEST.md mtime
 *   (b) newest mtime under mcp-server/src/engines/**.ts
 *   (c) recent git activity touching src/engines/ since the inventory's mtime
 *
 * The inventory is "fresh" iff (a) is newer than both (b) and the most
 * recent engine-touching commit (c). Otherwise it is "stale" — likely
 * because an engine was added/edited after the inventory was last regen'd
 * (see scripts/build-prism-inventory.mjs or whatever regenerates it).
 *
 * Designed for hourly cron invocation. Idempotent — never writes the
 * inventory, only reports.
 *
 * Subcommands:
 *   (default | check)  Run the check + write JSON to stdout (exit 0 fresh, 1 stale).
 *   --json             Same as default; explicit JSON output mode.
 *   --quiet            Suppress stdout when fresh (still writes when stale).
 *   --human            Human-readable summary instead of JSON.
 *
 * Exit codes:
 *   0 — fresh
 *   1 — stale (intentional non-zero so cron alerts surface)
 *   2 — internal error (file missing, git unavailable, etc)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const INVENTORY_PATH = resolve(REPO_ROOT, "PRISM-INVENTORY-LATEST.md");
const ENGINES_DIR = resolve(REPO_ROOT, "mcp-server", "src", "engines");

const args = process.argv.slice(2);
const flags = new Set();
for (const a of args) {
  if (a.startsWith("--")) flags.add(a.slice(2));
}

// ─── Helpers (pure, exported for in-process testing) ───────────────────
export function newestMtimeInDir(dir, suffix = ".ts") {
  if (!existsSync(dir)) return null;
  let newest = null;
  function walk(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const fp = join(d, e.name);
      if (e.isDirectory()) {
        walk(fp);
      } else if (e.isFile() && fp.endsWith(suffix)) {
        let st;
        try { st = statSync(fp); } catch { continue; }
        if (newest === null || st.mtimeMs > newest.mtimeMs) {
          newest = { path: fp, mtimeMs: st.mtimeMs };
        }
      }
    }
  }
  walk(dir);
  return newest;
}

export function newestCommitTouchingDir(dir, sinceIso, repoRoot = REPO_ROOT) {
  // git log -1 --pretty=%cI -- <relpath>  → most-recent commit ISO timestamp.
  // Filtered by --since=<inventoryMtimeIso> for performance + relevance.
  const rel = dir.replace(/\\/g, "/").replace(repoRoot.replace(/\\/g, "/") + "/", "");
  const args = ["-C", repoRoot, "log", "-1", "--pretty=%cI", "--since", sinceIso, "--", rel];
  const r = spawnSync("git", args, { encoding: "utf-8", timeout: 10_000, windowsHide: true });
  if (r.status !== 0) {
    return { ok: false, error: `git log failed: exit=${r.status} stderr=${(r.stderr || "").slice(0, 200)}` };
  }
  const out = (r.stdout || "").trim();
  if (!out) return { ok: true, commitIso: null }; // no commits in window — fresh.
  return { ok: true, commitIso: out };
}

export function classifyFreshness({ inventoryMtimeMs, newestEngineMtimeMs, newestCommitIso }) {
  // Inventory is stale iff any signal post-dates it.
  const newestCommitMs = newestCommitIso ? Date.parse(newestCommitIso) : null;
  const lagFromEngineMs = newestEngineMtimeMs !== null
    ? Math.max(0, newestEngineMtimeMs - inventoryMtimeMs) : 0;
  const lagFromCommitMs = Number.isFinite(newestCommitMs)
    ? Math.max(0, newestCommitMs - inventoryMtimeMs) : 0;
  const isStale = (newestEngineMtimeMs !== null && newestEngineMtimeMs > inventoryMtimeMs)
    || (Number.isFinite(newestCommitMs) && newestCommitMs > inventoryMtimeMs);
  let reason = "fresh";
  if (isStale) {
    if (newestEngineMtimeMs !== null && newestEngineMtimeMs > inventoryMtimeMs) {
      reason = "engine_file_newer_than_inventory";
    } else {
      reason = "commit_newer_than_inventory";
    }
  }
  return {
    isStale,
    reason,
    lagFromEngineMs,
    lagFromCommitMs,
    maxLagMs: Math.max(lagFromEngineMs, lagFromCommitMs),
  };
}

// ─── Main check ────────────────────────────────────────────────────────
function check() {
  if (!existsSync(INVENTORY_PATH)) {
    return { ok: false, error: `inventory missing: ${INVENTORY_PATH}`, exit: 2 };
  }
  const invStat = statSync(INVENTORY_PATH);
  const invMtimeMs = invStat.mtimeMs;
  const invMtimeIso = new Date(invMtimeMs).toISOString();

  const newestEngine = newestMtimeInDir(ENGINES_DIR, ".ts");
  const newestEngineMtimeMs = newestEngine?.mtimeMs ?? null;

  const gitResult = newestCommitTouchingDir(ENGINES_DIR, invMtimeIso);
  if (!gitResult.ok) {
    // Don't treat git failure as fatal — inventory mtime + engine mtimes
    // are still authoritative. Surface the git error in the payload.
    const classified = classifyFreshness({
      inventoryMtimeMs: invMtimeMs,
      newestEngineMtimeMs,
      newestCommitIso: null,
    });
    return {
      ok: true,
      isStale: classified.isStale,
      reason: classified.reason,
      inventory: { path: INVENTORY_PATH, mtime: invMtimeIso },
      newestEngine: newestEngine
        ? { path: newestEngine.path, mtime: new Date(newestEngineMtimeMs).toISOString() }
        : null,
      newestCommitTouchingEngines: null,
      gitWarning: gitResult.error,
      lagMs: classified.maxLagMs,
      exit: classified.isStale ? 1 : 0,
    };
  }

  const classified = classifyFreshness({
    inventoryMtimeMs: invMtimeMs,
    newestEngineMtimeMs,
    newestCommitIso: gitResult.commitIso,
  });

  return {
    ok: true,
    isStale: classified.isStale,
    reason: classified.reason,
    inventory: { path: INVENTORY_PATH, mtime: invMtimeIso },
    newestEngine: newestEngine
      ? { path: newestEngine.path, mtime: new Date(newestEngineMtimeMs).toISOString() }
      : null,
    newestCommitTouchingEngines: gitResult.commitIso,
    lagMs: classified.maxLagMs,
    exit: classified.isStale ? 1 : 0,
  };
}

// ─── Render ─────────────────────────────────────────────────────────────
function renderHuman(r) {
  if (!r.ok) return `inventory-freshness: ERROR — ${r.error}`;
  if (r.isStale) {
    const lagMin = Math.round(r.lagMs / 60_000);
    return [
      `inventory-freshness: STALE (lag ${lagMin}m, reason=${r.reason})`,
      `  inventory mtime: ${r.inventory.mtime}`,
      r.newestEngine ? `  newest engine:   ${r.newestEngine.mtime}  ${r.newestEngine.path}` : "  newest engine:   (no engines found)",
      r.newestCommitTouchingEngines ? `  newest commit:   ${r.newestCommitTouchingEngines}` : "  newest commit:   (none since inventory mtime)",
      r.gitWarning ? `  git warning:     ${r.gitWarning}` : null,
      "  Regenerate: node scripts/build-prism-inventory.mjs   (or whichever script owns PRISM-INVENTORY-LATEST.md)",
    ].filter(Boolean).join("\n");
  }
  return `inventory-freshness: FRESH (inventory mtime=${r.inventory.mtime}; no post-dating signals)`;
}

// ─── Entry point — only when invoked as the main script ─────────────────
const __mainBasename = (process.argv[1] || "").replace(/\\/g, "/").split("/").pop() || "";
if (__mainBasename && import.meta.url.endsWith(__mainBasename)) {
  const result = check();
  if (flags.has("human")) {
    process.stdout.write(renderHuman(result) + "\n");
  } else if (flags.has("quiet") && result.ok && !result.isStale) {
    // Silent fresh — for hourly cron with notify-only-on-change semantics.
  } else {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }
  process.exit(result.exit ?? (result.ok ? 0 : 2));
}
