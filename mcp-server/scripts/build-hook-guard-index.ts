#!/usr/bin/env node
/**
 * build-hook-guard-index — index mapping file paths to their guarding hooks
 *
 * Universal Phase 0.7. Creates HOOK_GUARD_INDEX.json which maps file path globs
 * to the hooks that protect/monitor them. Backs AwarenessQueryEngine.hooksGuarding().
 *
 * Output: mcp-server/data/state/HOOK_GUARD_INDEX.json
 *
 * @module scripts/build-hook-guard-index
 * @phase Universal 0.7 Reverse Index Layer
 */

import { promises as fs } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const HOOKS_DIR = path.join(ROOT, "..", ".claude", "hooks");
const SETTINGS_PATH = path.join(ROOT, "..", ".claude", "settings.json");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "HOOK_GUARD_INDEX.json");

// ============================================================================
// TYPES
// ============================================================================

export interface HookGuard {
  hookFile: string;
  hookType: "PreToolUse" | "PostToolUse" | "PreCompact" | "SessionStart" | "Other";
  toolPattern: string | null;
  fileGlobs: string[];
  description: string;
}

export interface HookGuardIndex {
  schemaVersion: number;
  lastUpdated: string;
  hookCount: number;
  guards: HookGuard[];
  byGlob: Record<string, string[]>; // glob -> hook files
}

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

/**
 * Parse settings.json to extract hook configurations
 */
async function parseSettingsHooks(): Promise<Array<{ command: string; event: string; toolPattern?: string }>> {
  const hooks: Array<{ command: string; event: string; toolPattern?: string }> = [];

  try {
    const content = await fs.readFile(SETTINGS_PATH, "utf-8");
    const settings = JSON.parse(content);

    for (const [event, eventHooks] of Object.entries(settings.hooks || {})) {
      if (!Array.isArray(eventHooks)) continue;

      for (const hook of eventHooks) {
        if (typeof hook === "object" && hook.command) {
          hooks.push({
            command: hook.command,
            event,
            toolPattern: hook.matcher,
          });
        }
      }
    }
  } catch {
    // Settings not found or invalid
  }

  return hooks;
}

/**
 * Extract file globs that a hook monitors from its source code
 */
async function extractHookFileGlobs(hookPath: string): Promise<string[]> {
  const globs: string[] = [];

  try {
    const content = await fs.readFile(hookPath, "utf-8");

    // Look for glob patterns in the code
    const patterns = [
      /["'](\*\*\/\*\.[a-z]+)["']/g,
      /["'](src\/[a-z/]+\/\*\.[a-z]+)["']/g,
      /["'](\.[a-z]+)["']/g,
      /filePattern.*["']([^"']+)["']/g,
      /glob.*["']([^"']+)["']/g,
    ];

    for (const pattern of patterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(content))) {
        if (m[1].includes("*") || m[1].startsWith(".")) {
          globs.push(m[1]);
        }
      }
    }
  } catch {
    // Hook file not readable
  }

  return [...new Set(globs)];
}

/**
 * Extract description from hook file
 */
async function extractHookDescription(hookPath: string): Promise<string> {
  try {
    const content = await fs.readFile(hookPath, "utf-8");
    const match = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/);
    if (match) return match[1].trim();

    const singleLine = content.match(/\/\/\s*([^\n]+)/);
    if (singleLine) return singleLine[1].trim();
  } catch {
    // Ignore
  }
  return "";
}

/**
 * Determine hook type from event name
 */
function getHookType(event: string): HookGuard["hookType"] {
  if (event.startsWith("PreToolUse")) return "PreToolUse";
  if (event.startsWith("PostToolUse")) return "PostToolUse";
  if (event === "PreCompact") return "PreCompact";
  if (event === "SessionStart") return "SessionStart";
  return "Other";
}

/**
 * Build the complete hook guard index
 */
export async function buildHookGuardIndex(opts: { verbose?: boolean } = {}): Promise<HookGuardIndex> {
  const guards: HookGuard[] = [];
  const byGlob: Record<string, string[]> = {};

  // Parse hooks from settings
  const settingsHooks = await parseSettingsHooks();

  if (opts.verbose) {
    console.log(`[build-hook-guard-index] Found ${settingsHooks.length} hooks in settings`);
  }

  for (const hook of settingsHooks) {
    // Extract hook file path from command
    const hookFileMatch = hook.command.match(/([a-zA-Z0-9_-]+\.(mjs|js|ts))(?:\s|$)/);
    const hookFile = hookFileMatch ? hookFileMatch[1] : hook.command.split(" ").pop() || "";

    // Try to find the actual hook file
    const possiblePaths = [
      path.join(HOOKS_DIR, hookFile),
      path.join(HOOKS_DIR, "lib", hookFile),
      hookFile,
    ];

    let hookPath: string | null = null;
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        hookPath = p;
        break;
      } catch {
        // Continue
      }
    }

    const fileGlobs = hookPath ? await extractHookFileGlobs(hookPath) : [];
    const description = hookPath ? await extractHookDescription(hookPath) : "";

    const guard: HookGuard = {
      hookFile,
      hookType: getHookType(hook.event),
      toolPattern: hook.toolPattern || null,
      fileGlobs,
      description,
    };

    guards.push(guard);

    // Build reverse index
    for (const glob of fileGlobs) {
      if (!byGlob[glob]) byGlob[glob] = [];
      if (!byGlob[glob].includes(hookFile)) {
        byGlob[glob].push(hookFile);
      }
    }

    if (opts.verbose && fileGlobs.length > 0) {
      console.log(`  ${hookFile}: ${fileGlobs.length} globs`);
    }
  }

  // Also scan hook files directly for any not in settings
  try {
    const hookFiles = await fs.readdir(HOOKS_DIR);
    for (const file of hookFiles) {
      if (!file.endsWith(".mjs") && !file.endsWith(".js")) continue;
      if (guards.some((g) => g.hookFile === file)) continue;

      const hookPath = path.join(HOOKS_DIR, file);
      const fileGlobs = await extractHookFileGlobs(hookPath);
      const description = await extractHookDescription(hookPath);

      guards.push({
        hookFile: file,
        hookType: "Other",
        toolPattern: null,
        fileGlobs,
        description,
      });

      for (const glob of fileGlobs) {
        if (!byGlob[glob]) byGlob[glob] = [];
        if (!byGlob[glob].includes(file)) {
          byGlob[glob].push(file);
        }
      }
    }
  } catch {
    // Hooks dir not found
  }

  const index: HookGuardIndex = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    hookCount: guards.length,
    guards,
    byGlob,
  };

  if (opts.verbose) {
    console.log(`  Done. ${index.hookCount} hooks indexed, ${Object.keys(byGlob).length} globs mapped.`);
  }

  return index;
}

/**
 * Write index to disk
 */
export async function writeHookGuardIndex(index: HookGuardIndex): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
}

/**
 * Read index from disk
 */
export async function readHookGuardIndex(): Promise<HookGuardIndex | null> {
  try {
    const content = await fs.readFile(OUTPUT_PATH, "utf-8");
    return JSON.parse(content) as HookGuardIndex;
  } catch {
    return null;
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main(): Promise<void> {
  const verbose = process.argv.includes("--verbose");
  const json = process.argv.includes("--json");

  console.log("[build-hook-guard-index] Scanning...");
  const start = Date.now();
  const index = await buildHookGuardIndex({ verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (json) {
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  await writeHookGuardIndex(index);
  console.log(`[build-hook-guard-index] Wrote ${OUTPUT_PATH} (${elapsed}s)`);

  const preToolUse = index.guards.filter((g) => g.hookType === "PreToolUse").length;
  const postToolUse = index.guards.filter((g) => g.hookType === "PostToolUse").length;

  console.log(`build-hook-guard-index — ${index.hookCount} hooks indexed`);
  console.log(`  PreToolUse: ${preToolUse}`);
  console.log(`  PostToolUse: ${postToolUse}`);
  console.log(`  globs mapped: ${Object.keys(index.byGlob).length}`);
}

// Only run main when invoked directly
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("build-hook-guard-index failed:", err);
    process.exit(2);
  });
}
