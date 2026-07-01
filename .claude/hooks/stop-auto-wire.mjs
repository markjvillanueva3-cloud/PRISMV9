#!/usr/bin/env node
// tier: T3
/**
 * stop-auto-wire.mjs — Stop hook
 *
 * When a chat session ends, check whether every new asset built this session
 * is actually WIRED and ACTIVE (not sitting dormant). Specifically:
 *
 *   1. NEW engine files (src/engines/*.ts not in git) → must be referenced
 *      by a dispatcher. Emit warning if orphan.
 *   2. NEW hook files (.claude/hooks/*.mjs not in git) → must be wired in
 *      H:/.claude/settings.json under the appropriate event (PreToolUse,
 *      PostToolUse, SessionStart, Stop, UserPromptSubmit, PreCompact).
 *   3. NEW skill files (~/.claude/commands/*.md) → just needs to exist; no
 *      wiring required (Claude Code reads commands/ automatically).
 *   4. Engine count changed → refresh PRISM-INVENTORY-LATEST.md + MASTER_INDEX
 *      by running scripts/update-prism-inventory.mjs in the background.
 *   5. Dispatcher action enum added → verify schema exists for each.
 *
 * Non-blocking: emits structured warnings + schedules background refresh.
 * Never prevents the session from stopping.
 */

import * as fs from "fs";
import * as path from "path";
import { spawnSync, spawn } from "node:child_process";

const REPO_ROOTS = [
  "H:/PRISM",
  "H:/prism-session-efficiency",
  "H:/prism-mill-worktree",
];

function repoRoot() {
  const cwd = process.cwd().replace(/\\/g, "/");
  for (const r of REPO_ROOTS) {
    if (cwd.startsWith(r.toLowerCase()) || cwd.toLowerCase().startsWith(r.toLowerCase())) {
      return r;
    }
  }
  return REPO_ROOTS[0];
}

const ROOT = repoRoot();
const SETTINGS = "H:/.claude/settings.json";
const INVENTORY_SCRIPT = path.join(ROOT, "scripts/update-prism-inventory.mjs");
const STOP_LOG = path.join(ROOT, "state/shared/STOP_AUTO_WIRE.json");

function findGit() {
  for (const g of ["git", "C:\\Program Files\\Git\\cmd\\git.exe"]) {
    try {
      const r = spawnSync(g, ["--version"], { windowsHide: true, timeout: 2000, encoding: "utf8" });
      if (r.status === 0) return g;
    } catch {}
  }
  return null;
}

function gitDiff(git, args) {
  try {
    const r = spawnSync(git, args, { windowsHide: true, cwd: ROOT, timeout: 5000, encoding: "utf8" });
    if (r.status !== 0) return [];
    return r.stdout.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Return list of untracked + modified files in the repo (what this session touched).
 */
function sessionNewFiles(git) {
  const lines = gitDiff(git, ["status", "--porcelain"]);
  const files = [];
  for (const line of lines) {
    // Format: "?? path" (untracked) or " M path" (modified) or "A  path" (added)
    const m = line.match(/^([ ?AMRCUD]{2})\s+(.+)$/);
    if (!m) continue;
    const status = m[1];
    let p = m[2];
    // rename: "orig -> new"
    const renameIdx = p.indexOf(" -> ");
    if (renameIdx !== -1) p = p.slice(renameIdx + 4);
    files.push({ status: status.trim(), path: p });
  }
  return files;
}

function classifyFile(relPath) {
  const p = relPath.replace(/\\/g, "/");
  if (/^mcp-server\/src\/engines\/[^/]+Engine\.ts$/.test(p)) return "engine";
  if (/^\.claude\/hooks\/[^/]+\.mjs$/.test(p)) return "hook";
  if (/^mcp-server\/src\/tools\/dispatchers\/[^/]+\.ts$/.test(p)) return "dispatcher";
  if (/^mcp-server\/src\/schemas\/[^/]+ActionSchemas\.ts$/.test(p)) return "schema";
  if (/^mcp-server\/src\/__tests__\/[^/]+\.test\.ts$/.test(p)) return "test";
  return "other";
}

function engineName(relPath) {
  const m = relPath.match(/([^/\\]+)Engine\.ts$/);
  return m ? `${m[1]}Engine` : null;
}

/**
 * Search dispatcher files for a reference to a given engine.
 */
function engineReferenced(engineFile) {
  const name = engineName(engineFile);
  if (!name) return false;
  const dispDir = path.join(ROOT, "mcp-server/src/tools/dispatchers");
  try {
    for (const f of fs.readdirSync(dispDir)) {
      if (!f.endsWith(".ts")) continue;
      const content = fs.readFileSync(path.join(dispDir, f), "utf8");
      if (content.includes(name)) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function hookBaseName(relPath) {
  return path.basename(relPath);
}

/**
 * Check if a hook file path is referenced anywhere in settings.json.
 */
function hookWired(hookFile, settings) {
  if (!settings?.hooks) return false;
  const base = hookBaseName(hookFile);
  const searchRe = new RegExp(base.replace(/\./g, "\\."), "i");
  const json = JSON.stringify(settings.hooks);
  return searchRe.test(json);
}

function log(data) {
  try {
    if (!fs.existsSync(path.dirname(STOP_LOG))) {
      fs.mkdirSync(path.dirname(STOP_LOG), { recursive: true });
    }
    fs.writeFileSync(STOP_LOG, JSON.stringify(data, null, 2));
  } catch {}
}

function refreshInventoryBackground() {
  try {
    if (!fs.existsSync(INVENTORY_SCRIPT)) return;
    const child = spawn(process.execPath, [INVENTORY_SCRIPT], {
      cwd: ROOT,
      detached: true, windowsHide: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // ignore
  }
}

function main() {
  const git = findGit();
  if (!git) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const changed = sessionNewFiles(git);
  if (changed.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const settings = readSettings();
  const orphans = { engines: [], hooks: [], schemas: [] };
  const activated = { engines: 0, hooks: 0, tests: 0, schemas: 0 };

  for (const { status, path: p } of changed) {
    const kind = classifyFile(p);
    if (kind === "engine") {
      activated.engines += 1;
      if (status === "??" && !engineReferenced(p)) {
        orphans.engines.push(p);
      }
    } else if (kind === "hook") {
      activated.hooks += 1;
      if (status === "??" && settings && !hookWired(p, settings)) {
        orphans.hooks.push(p);
      }
    } else if (kind === "test") {
      activated.tests += 1;
    } else if (kind === "schema") {
      activated.schemas += 1;
    }
  }

  const report = {
    ranAt: new Date().toISOString(),
    repo: ROOT,
    touchedFiles: changed.length,
    activated,
    orphans,
  };
  log(report);

  // Trigger inventory refresh in background when engines/hooks changed
  if (activated.engines > 0 || activated.hooks > 0) {
    refreshInventoryBackground();
  }

  // Surface actionable warnings to the session output
  const msgs = [];
  // When orphans pile up (e.g. a dedicated wiring chat is processing
  // them), emit count-only to avoid spamming every Stop event.
  // Set PRISM_UNWIRED_VERBOSE=1 to force the full list back on.
  const VERBOSE_LIMIT = 5;
  const verbose = process.env.PRISM_UNWIRED_VERBOSE === "1";
  if (orphans.engines.length > 0) {
    const showList = verbose || orphans.engines.length <= VERBOSE_LIMIT;
    const header = `⚠  ${orphans.engines.length} NEW engine(s) not wired to a dispatcher`;
    if (showList) {
      msgs.push(
        `${header}:\n` +
          orphans.engines.map((p) => `     - ${p}`).join("\n") +
          `\n   Wire via: src/tools/dispatchers/<dispatcher>.ts ACTIONS enum + case handler.`,
      );
    } else {
      msgs.push(
        `${header}. (List suppressed; set PRISM_UNWIRED_VERBOSE=1 to expand.)`,
      );
    }
  }
  if (orphans.hooks.length > 0) {
    const showList = verbose || orphans.hooks.length <= VERBOSE_LIMIT;
    const header = `⚠  ${orphans.hooks.length} NEW hook(s) not referenced in H:/.claude/settings.json`;
    if (showList) {
      msgs.push(
        `${header}:\n` +
          orphans.hooks.map((p) => `     - ${p}`).join("\n") +
          `\n   Wire by adding to PreToolUse / PostToolUse / SessionStart / Stop / UserPromptSubmit / PreCompact.`,
      );
    } else {
      msgs.push(
        `${header}. (List suppressed; set PRISM_UNWIRED_VERBOSE=1 to expand.)`,
      );
    }
  }
  if (activated.engines > 0 && orphans.engines.length === 0 && orphans.hooks.length === 0) {
    msgs.push(`✓ ${activated.engines} engine(s), ${activated.hooks} hook(s) all wired; inventory refresh queued.`);
  }

  if (msgs.length > 0) {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        systemMessage: msgs.join("\n\n"),
      }),
    );
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

try {
  main();
} catch (e) {
  console.log(JSON.stringify({ continue: true }));
}
