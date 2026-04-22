#!/usr/bin/env node
/**
 * night-mode.mjs — Autonomous overnight operation with safety restrictions
 *
 * Night mode restricts Claude to low-risk work:
 *   ALLOWED:
 *   - Wiring engines to dispatchers
 *   - Test coverage expansion
 *   - Documentation generation
 *   - Index/registry synchronization
 *   - Bug fixes with existing patterns
 *   - Hook improvements
 *
 *   BLOCKED:
 *   - New physics engines (Kienzle, Taylor, force, thermal)
 *   - Safety-critical engine modifications
 *   - Major architectural changes
 *   - New formula implementations
 *   - Core constant modifications
 *
 * Usage:
 *   node night-mode.mjs activate [--hours 8]
 *   node night-mode.mjs deactivate
 *   node night-mode.mjs status
 *   node night-mode.mjs check    # For hooks to query
 */

import { promises as fs } from "node:fs";
import process from "node:process";
import { cachePath, ensureCacheDir } from "./hook-cache.mjs";

const FLAG_FILE = cachePath("night-mode-active.json");

const NIGHT_MODE_CONFIG = {
  // Work that IS allowed overnight
  allowed_patterns: [
    "wiring", "wire", "dispatcher", "dispatch",
    "test", "coverage", "spec",
    "doc", "documentation", "jsdoc", "readme",
    "index", "registry", "sync", "synchronize",
    "hook", "helper", "util",
    "fix", "bugfix", "patch",
    "refactor", "cleanup", "lint",
    "type", "typing", "schema",
  ],

  // Work that is BLOCKED overnight (high risk)
  blocked_patterns: [
    "physics", "kienzle", "taylor", "force", "thermal", "temperature",
    "safety", "safetyengine", "critical",
    "constant", "constants.ts", "kc1", "mc",
    "formula", "equation", "calculation",
    "deflection", "chatter", "stability", "vibration",
    "new engine", "create engine", "forge",
    "architecture", "restructure", "redesign",
    "delete", "remove", "drop",
  ],

  // Engines that CANNOT be modified overnight
  protected_engines: [
    "SafetyEngine",
    "KienzleForceModelEngine",
    "TaylorToolLifeEngine",
    "CuttingForceEngine",
    "ThermalEngine",
    "ChatterStabilityEngine",
    "DeflectionEngine",
    "DuplicationGuardEngine",
    "TransactionLogEngine",
  ],

  // Directories that are read-only overnight
  readonly_paths: [
    "src/physics/constants.ts",
    "src/physics/",
  ],
};

async function readJson(path) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(path, data) {
  await ensureCacheDir();
  await fs.writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

async function activate(hours = 8) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const state = {
    active: true,
    activatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    hours,
    config: NIGHT_MODE_CONFIG,
    stats: {
      tasks_completed: 0,
      tasks_blocked: 0,
      compactions: 0,
    },
  };

  await writeJson(FLAG_FILE, state);

  // Also set autopilot flag
  const autopilotFile = cachePath("autopilot-active");
  await writeJson(autopilotFile, {
    active: true,
    track: "NIGHT-MODE",
    milestone: "safe-work-only",
    startedAt: now.toISOString(),
    nightMode: true,
  });

  return state;
}

async function deactivate() {
  try {
    const state = await readJson(FLAG_FILE);
    await fs.unlink(FLAG_FILE);

    // Also clear autopilot
    const autopilotFile = cachePath("autopilot-active");
    try { await fs.unlink(autopilotFile); } catch {}

    return { deactivated: true, stats: state?.stats };
  } catch {
    return { deactivated: false, reason: "was not active" };
  }
}

async function status() {
  const state = await readJson(FLAG_FILE);
  if (!state?.active) {
    return { active: false };
  }

  const now = new Date();
  const expires = new Date(state.expiresAt);
  const expired = now > expires;

  if (expired) {
    await deactivate();
    return { active: false, reason: "expired", stats: state.stats };
  }

  const remainingMs = expires - now;
  const remainingHours = Math.round(remainingMs / (60 * 60 * 1000) * 10) / 10;

  return {
    active: true,
    remainingHours,
    expiresAt: state.expiresAt,
    stats: state.stats,
    config: {
      allowed: state.config.allowed_patterns.slice(0, 10),
      blocked: state.config.blocked_patterns.slice(0, 10),
      protected_engines: state.config.protected_engines.length,
    },
  };
}

async function check(operation = "", target = "") {
  const state = await readJson(FLAG_FILE);
  if (!state?.active) {
    return { allowed: true, reason: "night mode not active" };
  }

  // Check expiration
  const now = new Date();
  const expires = new Date(state.expiresAt);
  if (now > expires) {
    await deactivate();
    return { allowed: true, reason: "night mode expired" };
  }

  const opLower = operation.toLowerCase();
  const targetLower = target.toLowerCase();
  const combined = `${opLower} ${targetLower}`;

  // Check blocked patterns
  for (const pattern of state.config.blocked_patterns) {
    if (combined.includes(pattern.toLowerCase())) {
      state.stats.tasks_blocked++;
      await writeJson(FLAG_FILE, state);
      return {
        allowed: false,
        reason: `NIGHT MODE BLOCK: "${pattern}" is restricted overnight`,
        suggestion: "Queue this for morning review",
      };
    }
  }

  // Check protected engines
  for (const engine of state.config.protected_engines) {
    if (targetLower.includes(engine.toLowerCase())) {
      state.stats.tasks_blocked++;
      await writeJson(FLAG_FILE, state);
      return {
        allowed: false,
        reason: `NIGHT MODE BLOCK: ${engine} is protected overnight`,
        suggestion: "This engine requires human review",
      };
    }
  }

  // Check readonly paths
  for (const path of state.config.readonly_paths) {
    if (targetLower.includes(path.toLowerCase().replace(/\//g, "\\"))) {
      state.stats.tasks_blocked++;
      await writeJson(FLAG_FILE, state);
      return {
        allowed: false,
        reason: `NIGHT MODE BLOCK: ${path} is read-only overnight`,
      };
    }
  }

  // Allowed
  state.stats.tasks_completed++;
  await writeJson(FLAG_FILE, state);
  return { allowed: true };
}

async function main() {
  const [,, action, ...args] = process.argv;

  switch (action) {
    case "activate": {
      const hoursArg = args.find(a => a.startsWith("--hours="));
      const hours = hoursArg ? parseInt(hoursArg.split("=")[1]) : 8;
      const state = await activate(hours);
      console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    NIGHT MODE ACTIVATED                          ║
╠══════════════════════════════════════════════════════════════════╣
║  Duration: ${hours} hours                                            ║
║  Expires:  ${state.expiresAt}                     ║
║                                                                  ║
║  ALLOWED WORK:                                                   ║
║    - Wiring engines to dispatchers                               ║
║    - Test coverage expansion                                     ║
║    - Documentation generation                                    ║
║    - Index/registry synchronization                              ║
║    - Bug fixes, refactoring, cleanup                             ║
║                                                                  ║
║  BLOCKED WORK:                                                   ║
║    - New physics engines (Kienzle, Taylor, force, thermal)       ║
║    - Safety-critical engine modifications                        ║
║    - Core constant changes                                       ║
║    - Major architectural changes                                 ║
║                                                                  ║
║  PROTECTED ENGINES (${NIGHT_MODE_CONFIG.protected_engines.length} total):                                ║
║    SafetyEngine, KienzleForceModelEngine, TaylorToolLifeEngine   ║
╚══════════════════════════════════════════════════════════════════╝
`);
      break;
    }

    case "deactivate": {
      const result = await deactivate();
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "status": {
      const result = await status();
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "check": {
      const operation = args[0] || "";
      const target = args[1] || "";
      const result = await check(operation, target);
      console.log(JSON.stringify(result));
      break;
    }

    default:
      console.log(`
Night Mode — Safe autonomous overnight operation

Usage:
  node night-mode.mjs activate [--hours=8]   Activate for N hours
  node night-mode.mjs deactivate             Turn off night mode
  node night-mode.mjs status                 Check current status
  node night-mode.mjs check <op> <target>    Check if operation allowed
`);
  }
}

main().catch(console.error);
