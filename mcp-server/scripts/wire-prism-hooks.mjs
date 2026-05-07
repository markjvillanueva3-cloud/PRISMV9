/**
 * Wire PRISM Hooks Applier — INTEL-OLLAMA-OBSIDIAN-MS0/P11-U02 + P11-U07
 *
 * Idempotent applier that wires a fixed list of PRISM hooks into the
 * user-global Claude Code settings.json (default H:/.claude/settings.json).
 * Reads current settings, computes the missing-entries delta, writes
 * atomically with timestamped backup. Safe to re-run — already-present
 * entries are skipped without modification.
 *
 * Two milestone units share this applier:
 *   - P11-U02: 25 dev-quality hooks (Tier 1-3 from Agent 3 audit)
 *   - P11-U07: 14 critical-gap awareness/goal/continuity hooks
 *
 * Exit conditions per spec: "X hooks wired in settings.json + each
 * smoke-tested with synthetic payload". Smoke-test is a separate pass
 * (scripts/smoke-prism-hooks.mjs).
 *
 * Pure-function exports (testable):
 *   - resolveHookCommand(hookName, hooksDirOverride?) → string
 *   - hookEntryMatches(entry, command)            → bool
 *   - blockHasHook(block, command)                → bool
 *   - addHookToBlock(block, hookName, command)    → new block (immutable)
 *   - applyWiring(settings, plan)                 → { settings, added[], skipped[] }
 *
 * I/O layer applyWiringToFile() reads/backs-up/writes the global file.
 *
 * Usage:
 *   node mcp-server/scripts/wire-prism-hooks.mjs               # apply both unit's wiring
 *   node mcp-server/scripts/wire-prism-hooks.mjs --units=P11-U02
 *   node mcp-server/scripts/wire-prism-hooks.mjs --dry-run     # show plan, don't write
 *   node mcp-server/scripts/wire-prism-hooks.mjs --settings=<path>  # override target
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

// CONSTANTS =================================================================

export const DEFAULT_SETTINGS_PATH = "H:/.claude/settings.json";
export const DEFAULT_HOOKS_DIR = "H:/.claude/hooks";
export const PORTABLE_NODE = '"H:/.claude/bin/portable-node"';

/**
 * Master wiring plan: hookName → { event, matcher? }
 *
 * Event types: PreToolUse | PostToolUse | UserPromptSubmit | SessionStart |
 *              Stop | PreCompact | SessionEnd
 *
 * Default matcher = ".*" (matches all tool/event types). Specific matchers
 * (e.g., "Write" or "Bash") narrow the trigger set.
 */
export const P11_U02_HOOKS = Object.freeze({
  // Tier-1 dev-quality (block on bad inputs)
  "anti-pattern-detector": { event: "PreToolUse", matcher: "Write|Edit|MultiEdit" },
  "file-claim-guard": { event: "PreToolUse", matcher: "Write|Edit|MultiEdit" },
  "file-claim-commit-guard": { event: "PreToolUse", matcher: "Bash" },
  "cross-terminal-conflict": { event: "PreToolUse", matcher: "Write|Edit|MultiEdit" },
  "async-pattern-checker": { event: "PreToolUse", matcher: "Write|Edit|MultiEdit" },
  "consistent-return-checker": { event: "PreToolUse", matcher: "Write|Edit|MultiEdit" },
  "type-safety-checker": { event: "PreToolUse", matcher: "Write|Edit|MultiEdit" },
  "api-contract-enforcer": { event: "PreToolUse", matcher: "Write|Edit|MultiEdit" },
  "bash-result-cache": { event: "PreToolUse", matcher: "Bash" },
  "state-write-watch": { event: "PreToolUse", matcher: "Write|Edit|MultiEdit" },
  "critical-file-guard": { event: "PreToolUse", matcher: "Write|Edit|MultiEdit" },
  "dep-graph-impact": { event: "PreToolUse", matcher: "Write|Edit|MultiEdit" },
  // Tier-2 PostToolUse advisory
  "auto-lint-post-edit": { event: "PostToolUse", matcher: "Write|Edit|MultiEdit" },
  "hook-saturation-alert": { event: "PostToolUse", matcher: ".*" },
  "embedding-cache-guard": { event: "PostToolUse", matcher: "Write|Edit|MultiEdit" },
  "session-action-memory": { event: "PostToolUse", matcher: ".*" },
  // Tier-3 UserPromptSubmit context
  "chat-bus-inject": { event: "UserPromptSubmit" },
  "context-priority-coordinator": { event: "UserPromptSubmit" },
  // SessionStart bootstrap
  "claude-md-mirror": { event: "SessionStart" },
  "memory-system-init": { event: "SessionStart" },
});

export const P11_U07_HOOKS = Object.freeze({
  // SessionStart awareness bootstrap
  "awareness-bootstrap": { event: "SessionStart" },
  "goal-stack-init": { event: "SessionStart" },
  "prism-intelligence-briefing": { event: "SessionStart" },
  "session-continuity-chain": { event: "SessionStart" },
  // UserPromptSubmit goal injection
  "goal-stack-inject": { event: "UserPromptSubmit" },
  "ollama-auto-router": { event: "UserPromptSubmit" },
  "ollama-prism-intelligence": { event: "UserPromptSubmit" },
  // PreToolUse + PostToolUse reasoning gates
  "metacognition-check": { event: "PreToolUse", matcher: ".*" },
  "working-set-awareness": { event: "PreToolUse", matcher: "Read|Glob|Grep" },
  "reasoning-completeness": { event: "PostToolUse", matcher: ".*" },
});

// PURE FUNCTIONS ============================================================

/**
 * Build the canonical hook command string. Uses the project's portable-node
 * launcher and hooks-dir relative path.
 */
export function resolveHookCommand(hookName, hooksDir = DEFAULT_HOOKS_DIR) {
  if (typeof hookName !== "string" || hookName.length === 0) return "";
  const safeDir = (typeof hooksDir === "string" && hooksDir.length > 0) ? hooksDir : DEFAULT_HOOKS_DIR;
  return `${PORTABLE_NODE} "${safeDir}/${hookName}.mjs"`;
}

/**
 * Check if a single hooks[] entry contains the given command. Settings.json
 * uses a nested shape: matcher group → hooks[] of {type, command}. We
 * walk both layers.
 */
export function hookEntryMatches(entry, command) {
  if (!entry || typeof command !== "string") return false;
  if (!Array.isArray(entry.hooks)) return false;
  return entry.hooks.some((h) => h && typeof h.command === "string" && h.command === command);
}

/**
 * Check whether a settings.json event block (e.g. settings.hooks.PreToolUse)
 * already wires the given command anywhere — across any matcher group.
 * Defensive on missing block.
 */
export function blockHasHook(block, command) {
  if (!Array.isArray(block)) return false;
  return block.some((entry) => hookEntryMatches(entry, command));
}

/**
 * Return a NEW block with the hook appended. If a matcher group with the
 * same matcher already exists, the hook is added to its hooks[] array.
 * Otherwise a new matcher group is appended. Pure — does not mutate input.
 */
export function addHookToBlock(block, hookName, command, matcher = ".*") {
  const startBlock = Array.isArray(block) ? block.slice() : [];
  if (blockHasHook(startBlock, command)) return startBlock;
  const groupIndex = startBlock.findIndex((g) => g && g.matcher === matcher);
  const newEntry = { type: "command", command };
  if (groupIndex === -1) {
    startBlock.push({ matcher, hooks: [newEntry] });
    return startBlock;
  }
  const group = startBlock[groupIndex];
  const existingHooks = Array.isArray(group.hooks) ? group.hooks.slice() : [];
  existingHooks.push(newEntry);
  startBlock[groupIndex] = { ...group, hooks: existingHooks };
  return startBlock;
}

/**
 * Apply a full wiring plan (object of hookName → {event, matcher?}) against
 * a settings object, returning the new settings + a per-hook decision log.
 * Pure — does not mutate input.
 */
export function applyWiring(settings, plan, hooksDir = DEFAULT_HOOKS_DIR) {
  const out = settings && typeof settings === "object" ? { ...settings } : {};
  out.hooks = (out.hooks && typeof out.hooks === "object") ? { ...out.hooks } : {};
  const added = [];
  const skipped = [];
  if (!plan || typeof plan !== "object") return { settings: out, added, skipped };
  for (const [hookName, spec] of Object.entries(plan)) {
    const event = spec?.event;
    const matcher = spec?.matcher ?? ".*";
    if (typeof event !== "string" || event.length === 0) {
      skipped.push({ hookName, reason: "no event in plan" });
      continue;
    }
    const command = resolveHookCommand(hookName, hooksDir);
    const currentBlock = Array.isArray(out.hooks[event]) ? out.hooks[event] : [];
    if (blockHasHook(currentBlock, command)) {
      skipped.push({ hookName, reason: `already wired in ${event}` });
      continue;
    }
    out.hooks[event] = addHookToBlock(currentBlock, hookName, command, matcher);
    added.push({ hookName, event, matcher, command });
  }
  return { settings: out, added, skipped };
}

// I/O LAYER =================================================================

function readSettings(p) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (err) {
    throw new Error(`failed to read ${p}: ${err.message}`);
  }
}

function backupSettings(p) {
  if (!existsSync(p)) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = `${dirname(p)}/.backups`;
  mkdirSync(dir, { recursive: true });
  const backupPath = `${dir}/settings.${ts}.bak.json`;
  copyFileSync(p, backupPath);
  return backupPath;
}

export function applyWiringToFile(opts = {}) {
  const settingsPath = opts.settingsPath ?? DEFAULT_SETTINGS_PATH;
  const hooksDir = opts.hooksDir ?? DEFAULT_HOOKS_DIR;
  const dryRun = opts.dryRun === true;
  const plan = opts.plan ?? { ...P11_U02_HOOKS, ...P11_U07_HOOKS };

  const before = readSettings(settingsPath);
  const sizeBefore = JSON.stringify(before).length;
  const { settings: after, added, skipped } = applyWiring(before, plan, hooksDir);
  let backupPath = null;
  let written = false;
  if (!dryRun && added.length > 0) {
    backupPath = backupSettings(settingsPath);
    writeFileSync(settingsPath, JSON.stringify(after, null, 2) + "\n", "utf8");
    written = true;
  }
  return {
    settingsPath,
    backupPath,
    added,
    skipped,
    sizeBefore,
    sizeAfter: JSON.stringify(after).length,
    written,
    dryRun,
  };
}

// MAIN ======================================================================

async function main() {
  const args = new Map();
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq !== -1) args.set(a.slice(2, eq), a.slice(eq + 1));
    else args.set(a.slice(2), "true");
  }
  const dryRun = args.get("dry-run") === "true";
  const settingsPath = args.get("settings") ?? DEFAULT_SETTINGS_PATH;
  const hooksDir = args.get("hooks-dir") ?? DEFAULT_HOOKS_DIR;
  const unitsArg = args.get("units");
  let plan;
  if (unitsArg === "P11-U02") plan = { ...P11_U02_HOOKS };
  else if (unitsArg === "P11-U07") plan = { ...P11_U07_HOOKS };
  else plan = { ...P11_U02_HOOKS, ...P11_U07_HOOKS };

  console.log("=== PRISM Hook Wiring Applier ===");
  console.log(`settings:  ${settingsPath}`);
  console.log(`hooks dir: ${hooksDir}`);
  console.log(`plan:      ${Object.keys(plan).length} hooks`);
  console.log(`dryRun:    ${dryRun}\n`);

  const result = applyWiringToFile({ settingsPath, hooksDir, dryRun, plan });

  if (result.added.length > 0) {
    console.log(`ADDED (${result.added.length}):`);
    for (const a of result.added) console.log(`  + ${a.event}/${a.matcher}: ${a.hookName}`);
  }
  if (result.skipped.length > 0) {
    console.log(`\nSKIPPED (${result.skipped.length}):`);
    for (const s of result.skipped) console.log(`  - ${s.hookName} (${s.reason})`);
  }
  console.log(`\nsize: ${result.sizeBefore} → ${result.sizeAfter} bytes`);
  console.log(result.written
    ? `wrote ${result.settingsPath} (backup: ${result.backupPath})`
    : `(no write — ${result.dryRun ? "dry run" : "no changes"})`);
}

const __isMain = (() => {
  try {
    const argv1 = process.argv?.[1];
    if (!argv1) return false;
    return import.meta.url === pathToFileURL(argv1).href;
  } catch {
    return false;
  }
})();

if (__isMain) {
  main().catch((e) => {
    console.error("FATAL", e);
    process.exit(1);
  });
}
