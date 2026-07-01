#!/usr/bin/env node
/**
 * verify-hook-refs.mjs — HOOK-SYNERGY-MS0 / U-H1.0
 *
 * Cross-checks every hook command reference in settings.json against the on-disk
 * `.claude/hooks/*.mjs` files. Catches three classes of drift the watchdog
 * can't:
 *   1. SETTINGS_TO_MISSING_FILE — settings.json points at a .mjs that doesn't
 *      exist on disk (a hook gets renamed/deleted; settings entry left behind).
 *      Silent until that Stop/PreToolUse event fires + the harness reports
 *      "command not found".
 *   2. DISK_TO_UNWIRED — a .mjs sits in .claude/hooks/ with no settings ref
 *      (the orphan-on-disk class the iter11 wiki-watchdog initially WAS).
 *   3. MISSING_TIER_FRONTMATTER — a wired .mjs lacks the `// tier: T#`
 *      annotation the hook-tier-validator pre-write hook expects.
 *
 * Sources scanned (in order — first present wins for each path):
 *   - C:/Users/<user>/.claude/settings.json  (canonical, c-to-h-mirror'd)
 *   - H:/.claude/settings.json               (mirrored copy)
 *   - <repo>/.claude/settings.json           (project-level, optional)
 *
 * Modes:
 *   (default)  Scan + print a human summary. Exit 0 if clean, 1 if any drift.
 *   --json     Same scan; emit JSON to stdout. Exit codes unchanged.
 *   --check    CI gate. Same as default but only prints when drift present.
 *
 * Pure: read-only on the filesystem; no subprocess spawns; no network.
 *
 * Exit:
 *   0 — all settings refs resolve + every disk hook is wired or has a known
 *       reason to be unwired (orphan whitelist).
 *   1 — at least one drift class found, OR script error.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path
  .resolve(path.dirname(__filename), "..")
  .split("\\")
  .join("/");

const HOOKS_DIR = path.join(REPO_ROOT, ".claude", "hooks");
const HOOK_REGISTRY = path.join(
  REPO_ROOT,
  "state",
  "shared",
  "HOOK_REGISTRY.json",
);

const HOME = process.env.USERPROFILE || process.env.HOME || "";
const SETTINGS_CANDIDATES = [
  HOME ? path.join(HOME, ".claude", "settings.json") : null,
  "H:/.claude/settings.json",
  path.join(REPO_ROOT, ".claude", "settings.json"),
].filter(Boolean);

/** Hooks that intentionally live on disk without a settings.json reference.
 *  Every entry MUST cite the doctrine source so the next reader knows it's
 *  not a forgotten orphan. Bundle members are auto-detected by collectBundleMembers()
 *  and don't belong here — only doctrine-mandated dead-but-preserved entries.
 *  Reference: H:/.claude/CLAUDE.md feedback_never_delete_only_disable. */
const KNOWN_DISK_ONLY = new Set([
  // Doctrine: 2026-05-16 alpha→golf fleet-reaper ownership move (CLAUDE.md
  // §FLEET-REAPER-MS1 + memory [[feedback_golf_owns_reaper]]). The alpha
  // guardian was UNWIRED from settings.json but preserved on disk so the
  // change is reversible if golf-doctrine is ever rolled back.
  "alpha-slot-reaper-guardian.mjs",
]);

/** Bundle sources whose imports/refs grant their members "wired-via-bundle"
 *  status. Updated mechanically by scanning .claude/hooks/bundles/*.mjs. */
const BUNDLE_DIR_REL = ".claude/hooks/bundles";

/** Pure: parse settings.json once + collect all hook command file refs. */
export function collectSettingsRefs(settings) {
  const refs = [];
  if (!settings || typeof settings !== "object") return refs;
  const hooks = settings.hooks;
  if (!hooks || typeof hooks !== "object") return refs;
  for (const event of Object.keys(hooks)) {
    const arr = Array.isArray(hooks[event]) ? hooks[event] : [];
    for (let g = 0; g < arr.length; g++) {
      const group = arr[g];
      const inner = group && Array.isArray(group.hooks) ? group.hooks : [];
      for (let i = 0; i < inner.length; i++) {
        const entry = inner[i];
        if (!entry || typeof entry !== "object") continue;
        const cmd = typeof entry.command === "string" ? entry.command : "";
        const mjs = extractMjsPath(cmd);
        if (mjs == null) continue;
        refs.push({
          event,
          group: g,
          index: i,
          matcher: typeof group.matcher === "string" ? group.matcher : "",
          command: cmd,
          mjsPath: mjs,
          timeout: typeof entry.timeout === "number" ? entry.timeout : null,
        });
      }
    }
  }
  return refs;
}

/** Pure: extract the first `*.mjs` token from a hook command string.
 *  Returns the absolute-or-relative path token, or null when none found. */
export function extractMjsPath(command) {
  if (typeof command !== "string" || command.length === 0) return null;
  // Match either quoted path or whitespace-delimited token ending in .mjs
  const m = command.match(/["']?([A-Za-z]:[\\/][^"'\s]+?\.mjs|[./\\][^"'\s]+?\.mjs)["']?/);
  return m ? m[1] : null;
}

/** Pure: normalize a path token to a canonical absolute forward-slash path. */
export function normalizePath(p) {
  if (typeof p !== "string" || p.length === 0) return "";
  return path.resolve(p).split("\\").join("/");
}

/** Pure: classify a single ref's file-existence + tier-frontmatter state.
 *  `readSrc` lets tests inject. */
export function classifyRef(ref, opts) {
  const readSrc = opts && opts.readSrc ? opts.readSrc : (p) => safeReadText(p);
  const exists = opts && opts.exists ? opts.exists : (p) => safeExists(p);
  const abs = normalizePath(ref.mjsPath);
  if (!abs) return { ...ref, state: "INVALID_PATH" };
  if (!exists(abs)) return { ...ref, abs, state: "SETTINGS_TO_MISSING_FILE" };
  const src = readSrc(abs);
  const tier = parseTier(src);
  if (tier == null) {
    return { ...ref, abs, state: "MISSING_TIER_FRONTMATTER", tier: null };
  }
  return { ...ref, abs, state: "OK", tier };
}

/** Pure: read `// tier: T#` annotation from a source file's first 50 lines. */
export function parseTier(src) {
  if (typeof src !== "string" || src.length === 0) return null;
  const head = src.split("\n", 50).join("\n");
  const m = head.match(/\/\/\s*tier:\s*(T[0-9]+)/i);
  return m ? m[1].toUpperCase() : null;
}

/** Pure: find disk hooks that are NOT referenced by any settings layer NOR
 *  by any registered bundle. `bundleMembers` is a Set<basename> of hooks
 *  invoked by parent bundles (the collectBundleMembers result). */
export function findUnwiredDiskHooks(diskFiles, wiredAbsSet, bundleMembers) {
  const unwired = [];
  const bm = bundleMembers || new Set();
  for (const f of diskFiles) {
    const abs = normalizePath(f);
    const name = path.basename(abs);
    if (wiredAbsSet.has(abs)) continue;
    if (KNOWN_DISK_ONLY.has(name)) continue;
    if (bm.has(name)) continue;
    // Skip non-hook helpers (test files, smoke scripts, READMEs that happen to be in the dir)
    if (name.endsWith(".test.mjs")) continue;
    if (name.startsWith("_")) continue;
    if (name.startsWith(".")) continue;
    unwired.push(abs);
  }
  return unwired;
}

/** Pure: scan a list of bundle-source strings + extract every `*.mjs` basename
 *  they reference. Typical pattern in our bundles is template-literal:
 *    `${HOOK_BASE}/<name>.mjs`
 *  but the function also catches relative imports + plain string refs. Returns
 *  a Set<basename>. The lib helper hook-runner.mjs is excluded because it
 *  backs the bundle's plumbing, not a Stop arm. */
export function collectBundleMembers(bundleSources) {
  const out = new Set();
  if (!Array.isArray(bundleSources)) return out;
  const re = /[/\\]([a-zA-Z0-9_.-]+\.mjs)\b/g;
  for (const src of bundleSources) {
    if (typeof src !== "string") continue;
    let m;
    while ((m = re.exec(src)) != null) {
      const name = m[1];
      if (name.startsWith("hook-runner")) continue;
      out.add(name);
    }
  }
  return out;
}

/* ── IO helpers (side-effecting; thin wrappers, tested via the pure classifyRef path) ── */

function safeReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function safeReadText(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}
function safeExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}
function listMjsFiles(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".mjs"))
      .map((d) => path.join(dir, d.name));
  } catch {
    return [];
  }
}

/* ── main ────────────────────────────────────────────────────────── */

function main() {
  const asJson = process.argv.includes("--json");
  const checkMode = process.argv.includes("--check");

  // Read the first settings layer that parses cleanly.
  let settings = null;
  let settingsSource = null;
  for (const p of SETTINGS_CANDIDATES) {
    const j = safeReadJson(p);
    if (j) {
      settings = j;
      settingsSource = p;
      break;
    }
  }
  if (!settings) {
    const out = {
      ok: false,
      error: "no settings.json found",
      tried: SETTINGS_CANDIDATES,
    };
    if (asJson) process.stdout.write(JSON.stringify(out));
    else process.stderr.write(out.error + "\n");
    process.exit(1);
  }

  const refs = collectSettingsRefs(settings);
  const classified = refs.map((r) => classifyRef(r));
  const wiredAbsSet = new Set(
    classified.filter((r) => r.state !== "INVALID_PATH").map((r) => r.abs),
  );
  const diskFiles = listMjsFiles(HOOKS_DIR);

  // Bundle members are wired-via-parent — read every bundle source + extract
  // its referenced `*.mjs` basenames. This drops the surface from "every
  // sub-hook is orphaned" to "only the truly-unreferenced ones surface".
  const bundleSources = listMjsFiles(path.join(REPO_ROOT, BUNDLE_DIR_REL)).map(
    (f) => safeReadText(f),
  );
  const bundleMembers = collectBundleMembers(bundleSources);

  const unwired = findUnwiredDiskHooks(diskFiles, wiredAbsSet, bundleMembers);

  const drift = {
    SETTINGS_TO_MISSING_FILE: classified.filter(
      (r) => r.state === "SETTINGS_TO_MISSING_FILE",
    ),
    MISSING_TIER_FRONTMATTER: classified.filter(
      (r) => r.state === "MISSING_TIER_FRONTMATTER",
    ),
    DISK_TO_UNWIRED: unwired,
  };
  const totalDrift =
    drift.SETTINGS_TO_MISSING_FILE.length +
    drift.MISSING_TIER_FRONTMATTER.length +
    drift.DISK_TO_UNWIRED.length;
  const clean = totalDrift === 0;

  const result = {
    ok: clean,
    settingsSource,
    counts: {
      wiredRefs: classified.length,
      diskFiles: diskFiles.length,
      bundleMembers: bundleMembers.size,
      knownDiskOnly: KNOWN_DISK_ONLY.size,
      ok: classified.filter((r) => r.state === "OK").length,
      drift: totalDrift,
      ...Object.fromEntries(
        Object.entries(drift).map(([k, v]) => [k, v.length]),
      ),
    },
    drift,
  };

  if (asJson) {
    process.stdout.write(JSON.stringify(result, null, 2));
  } else if (checkMode && clean) {
    // --check mode is silent on clean
  } else {
    const tag = clean ? "OK" : "DRIFT";
    process.stdout.write(`verify-hook-refs — ${tag}\n`);
    process.stdout.write(`  settings: ${settingsSource}\n`);
    process.stdout.write(
      `  wiredRefs=${result.counts.wiredRefs} diskFiles=${result.counts.diskFiles} drift=${totalDrift}\n`,
    );
    if (drift.SETTINGS_TO_MISSING_FILE.length > 0) {
      process.stdout.write(`\nSETTINGS → MISSING FILE (${drift.SETTINGS_TO_MISSING_FILE.length}):\n`);
      for (const r of drift.SETTINGS_TO_MISSING_FILE.slice(0, 20)) {
        process.stdout.write(`  • ${r.event}[${r.group}].hooks[${r.index}] → ${r.abs}\n`);
      }
    }
    if (drift.MISSING_TIER_FRONTMATTER.length > 0) {
      process.stdout.write(`\nMISSING TIER FRONTMATTER (${drift.MISSING_TIER_FRONTMATTER.length}):\n`);
      for (const r of drift.MISSING_TIER_FRONTMATTER.slice(0, 20)) {
        process.stdout.write(`  • ${path.basename(r.abs)}\n`);
      }
    }
    if (drift.DISK_TO_UNWIRED.length > 0) {
      process.stdout.write(`\nUNWIRED DISK HOOKS (${drift.DISK_TO_UNWIRED.length}):\n`);
      for (const u of drift.DISK_TO_UNWIRED.slice(0, 20)) {
        process.stdout.write(`  • ${path.basename(u)}\n`);
      }
    }
  }

  process.exit(clean ? 0 : 1);
}

const invokedAsMain = (() => {
  try {
    return (
      !!process.argv[1] &&
      fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
    );
  } catch {
    return false;
  }
})();
if (invokedAsMain) main();
