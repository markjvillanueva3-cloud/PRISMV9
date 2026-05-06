/**
 * audit.mjs — INTEL-OLLAMA-OBSIDIAN-MS0/P10-U06
 *
 * Unified audit dispatcher. `node scripts/audit.mjs <subcommand> [args]`
 * routes to one of the existing specialised audit scripts in scripts/ and
 * mcp-server/scripts/. Old scripts are preserved (NOT moved to
 * .deprecated/) — they remain individually invocable. This dispatcher
 * just adds a uniform entry point so the cron-schedule plan can call
 * `audit.mjs <name>` instead of remembering 44 paths.
 *
 * Pure-function exports for tests:
 *   - AUDIT_SCRIPT_TABLE        → canonical subcommand → backend script map
 *   - parseSubcommand(argv)     → { subcommand, args, helpRequested, listRequested }
 *   - selectAuditScript(name)   → BackendScript | null
 *   - formatHelp(table)         → string (CLI help)
 *   - listSubcommands(table)    → string[] (alphabetical)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P10-U06
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// ============================================================================
// CANONICAL ROUTING TABLE
// ============================================================================

/**
 * Each entry maps a stable `subcommand` to:
 *   - script: repo-relative path to the backend audit script
 *   - description: one-line for `--help` output
 *   - extension: .mjs | .ts | .js | .py (informs runner choice)
 */
export const AUDIT_SCRIPT_TABLE = {
  docker: {
    script: "scripts/docker-audit.mjs",
    description: "Inventory all Dockerfiles + docker-compose.yml across H:/prism* (P13-U01)",
    extension: ".mjs",
  },
  extractor: {
    script: "scripts/extractor-audit.mjs",
    description: "Classify 41+ catalog-extractor scripts as KEEP|ARCHIVE (P18-U01)",
    extension: ".mjs",
  },
  "build-lathe-wiring": {
    script: "scripts/build-lathe-wiring-audit.mjs",
    description: "Lathe wiring coverage audit (engines ↔ dispatchers)",
    extension: ".mjs",
  },
  "self-consensus": {
    script: "scripts/self-audit-consensus.mjs",
    description: "Multi-source consensus self-audit (cross-validates state files)",
    extension: ".mjs",
  },
  commands: {
    script: "mcp-server/scripts/commands-audit.ts",
    description: "Slash-command surface audit (orphaned/missing/duplicated)",
    extension: ".ts",
  },
  "calculator-live": {
    script: "mcp-server/scripts/calculator-live-audit.ts",
    description: "Live calculator endpoint round-trip audit",
    extension: ".ts",
  },
  "torque-curve": {
    script: "mcp-server/scripts/torque-curve-audit.ts",
    description: "Spindle torque-curve sanity audit (per-machine)",
    extension: ".ts",
  },
  inventory: {
    script: "mcp-server/scripts/update-prism-inventory.mjs",
    description: "Refresh PRISM-INVENTORY-LATEST.md (engines/dispatchers/actions)",
    extension: ".mjs",
  },
  // Aliases not their own scripts; resolved via the alias map below.
};

const ALIASES = {
  docs: "docker",
  ext: "extractor",
  lathe: "build-lathe-wiring",
  wiring: "build-lathe-wiring",
  consensus: "self-consensus",
  cmd: "commands",
  cmds: "commands",
  calc: "calculator-live",
  torque: "torque-curve",
  inv: "inventory",
};

// ============================================================================
// PURE LOGIC
// ============================================================================

/**
 * Parse argv into a structured request. The first positional arg is the
 * subcommand; everything after is passed to the routed backend untouched.
 * `--help` / `-h` and `--list` are handled at this layer.
 */
export function parseSubcommand(argv) {
  if (!Array.isArray(argv)) return { subcommand: null, args: [], helpRequested: false, listRequested: false };
  const positional = argv.filter((a) => typeof a === "string");
  if (positional.length === 0) return { subcommand: null, args: [], helpRequested: true, listRequested: false };

  const helpRequested = positional.includes("--help") || positional.includes("-h");
  const listRequested = positional.includes("--list");
  if (helpRequested) return { subcommand: null, args: [], helpRequested: true, listRequested: false };
  if (listRequested)  return { subcommand: null, args: [], helpRequested: false, listRequested: true };

  const sub = positional[0].toLowerCase();
  const remainder = positional.slice(1);
  return { subcommand: sub, args: remainder, helpRequested: false, listRequested: false };
}

/**
 * Look up the backend script for a given subcommand name. Resolves aliases
 * before lookup. Returns null when no entry matches.
 */
export function selectAuditScript(name, table = AUDIT_SCRIPT_TABLE, aliases = ALIASES) {
  if (typeof name !== "string" || name.length === 0) return null;
  const lower = name.trim().toLowerCase();
  const resolved = aliases[lower] ?? lower;
  const entry = table[resolved];
  if (!entry) return null;
  return { ...entry, subcommand: resolved };
}

/**
 * Render human-friendly help text from the routing table.
 */
export function formatHelp(table = AUDIT_SCRIPT_TABLE) {
  const lines = [];
  lines.push("audit.mjs — unified PRISM audit dispatcher");
  lines.push("");
  lines.push("Usage: node scripts/audit.mjs <subcommand> [args...]");
  lines.push("       node scripts/audit.mjs --list");
  lines.push("       node scripts/audit.mjs --help");
  lines.push("");
  lines.push("Subcommands:");
  const names = Object.keys(table).sort();
  const longest = names.reduce((m, n) => Math.max(m, n.length), 0);
  for (const name of names) {
    lines.push(`  ${name.padEnd(longest + 2)} ${table[name].description}`);
  }
  lines.push("");
  lines.push("Aliases: docs→docker, ext→extractor, lathe→build-lathe-wiring,");
  lines.push("         consensus→self-consensus, cmd→commands, calc→calculator-live,");
  lines.push("         torque→torque-curve, inv→inventory");
  return lines.join("\n");
}

/**
 * Return the canonical subcommand list, alphabetically sorted.
 */
export function listSubcommands(table = AUDIT_SCRIPT_TABLE) {
  return Object.keys(table).sort();
}

// ============================================================================
// I/O LAYER
// ============================================================================

function resolveRunner(extension, nodeExe, repoRoot) {
  switch (extension) {
    case ".mjs":
    case ".cjs":
    case ".js":
      return { cmd: nodeExe, preArgs: [] };
    case ".ts":
      return { cmd: "npx", preArgs: ["tsx"] };
    case ".py":
      return { cmd: "python", preArgs: [] };
    default:
      throw new Error(`Unknown script extension: ${extension}`);
  }
}

async function runBackend(entry, restArgs, opts) {
  const repoRoot = opts.repoRoot;
  const scriptAbs = path.resolve(repoRoot, entry.script);
  if (!fs.existsSync(scriptAbs)) {
    return {
      ok: false,
      exitCode: -1,
      error: `script not present on this box: ${entry.script}`,
      script: entry.script,
    };
  }
  const runner = resolveRunner(entry.extension, opts.nodeExe);
  const args = [...runner.preArgs, scriptAbs, ...restArgs];
  return new Promise((resolve) => {
    const child = spawn(runner.cmd, args, { stdio: "inherit", cwd: repoRoot });
    child.on("exit", (code) => resolve({
      ok: code === 0,
      exitCode: code ?? -1,
      script: entry.script,
    }));
    child.on("error", (e) => resolve({
      ok: false,
      exitCode: -1,
      error: e.message,
      script: entry.script,
    }));
  });
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const nodeExe = process.env.PRISM_NODE ?? "H:/Tools/nodejs/node.exe";
  const parsed = parseSubcommand(process.argv.slice(2));

  if (parsed.helpRequested) {
    process.stdout.write(formatHelp() + "\n");
    process.exit(0);
  }
  if (parsed.listRequested) {
    process.stdout.write(listSubcommands().join("\n") + "\n");
    process.exit(0);
  }
  if (!parsed.subcommand) {
    process.stderr.write("audit.mjs: missing subcommand. Try --help or --list.\n");
    process.exit(2);
  }

  const entry = selectAuditScript(parsed.subcommand);
  if (!entry) {
    process.stderr.write(`audit.mjs: unknown subcommand "${parsed.subcommand}".\n`);
    process.stderr.write(`Valid: ${listSubcommands().join(", ")}\n`);
    process.exit(2);
  }

  const result = await runBackend(entry, parsed.args, { repoRoot, nodeExe });
  if (!result.ok) {
    process.stderr.write(`audit.mjs: ${entry.subcommand} failed (exit ${result.exitCode}${result.error ? ": " + result.error : ""})\n`);
    process.exit(result.exitCode === -1 ? 3 : result.exitCode);
  }
  process.exit(0);
}

const _isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (_isMain) {
  main().catch((e) => { console.error(e); process.exit(2); });
}
