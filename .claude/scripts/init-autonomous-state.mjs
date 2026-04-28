#!/usr/bin/env node
/**
 * init-autonomous-state — initializer for state/shared/AUTONOMOUS_STATE.json.
 *
 * Creates a fresh AUTONOMOUS_STATE.json using the canonical schema from
 * .claude/hooks/lib/autonomous-foolproof-logic.mjs. Writes only when
 * the file is missing OR --force is passed. Refuses to clobber by default
 * so a running autonomous session isn't reset by accident.
 *
 * Usage:
 *   node .claude/scripts/init-autonomous-state.mjs
 *     --session-id <id>          (required unless ENV PRISM_SESSION_ID is set)
 *     [--mode autonomous|manual] (default: autonomous)
 *     [--cost-cap <usd>]         (default: 50)
 *     [--token-cap <count>]      (default: 5_000_000)
 *     [--time-cap-ms <ms>]       (default: 18_000_000 = 5h)
 *     [--unit-cap <count>]       (default: 25)
 *     [--force]                  (overwrite existing file)
 *
 * Validates the resulting state via validateAutonomousState() before
 * writing. Exits non-zero on validation failure.
 *
 * U-AF09 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  buildInitialAutonomousState,
  validateAutonomousState,
} from "../hooks/lib/autonomous-foolproof-logic.mjs";

const STATE_RELATIVE = "state/shared/AUTONOMOUS_STATE.json";

/**
 * Find the OUTERMOST directory that has both `.claude/settings.json` AND
 * `.git/`. The repo root is the canonical location for state/shared/, even
 * when sub-projects (e.g. mcp-server/) have their own `.claude/settings.json`.
 */
function findProjectRoot(startCwd = process.cwd()) {
  let cur = path.resolve(startCwd);
  let outermost = null;
  for (let i = 0; i < 12; i++) {
    const hasClaude = fs.existsSync(path.join(cur, ".claude", "settings.json"));
    const hasGit = fs.existsSync(path.join(cur, ".git"));
    if (hasClaude && hasGit) outermost = cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return outermost ?? startCwd;
}

function parseArgs(argv) {
  const args = {
    sessionId: null,
    mode: "autonomous",
    costCap: null,
    tokenCap: null,
    timeCapMs: null,
    unitCap: null,
    force: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--session-id":
        args.sessionId = argv[++i];
        break;
      case "--mode":
        args.mode = argv[++i];
        break;
      case "--cost-cap":
        args.costCap = Number(argv[++i]);
        break;
      case "--token-cap":
        args.tokenCap = Number(argv[++i]);
        break;
      case "--time-cap-ms":
        args.timeCapMs = Number(argv[++i]);
        break;
      case "--unit-cap":
        args.unitCap = Number(argv[++i]);
        break;
      case "--force":
        args.force = true;
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      default:
        // ignore unknowns for forward compatibility
        break;
    }
  }
  return args;
}

function printHelp() {
  process.stderr.write(
    "usage: init-autonomous-state.mjs --session-id <id> [--mode autonomous|manual]\n" +
    "                                 [--cost-cap <usd>] [--token-cap <count>]\n" +
    "                                 [--time-cap-ms <ms>] [--unit-cap <count>]\n" +
    "                                 [--force]\n",
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const sessionId = args.sessionId ?? process.env.PRISM_SESSION_ID ?? null;
  if (!sessionId) {
    process.stderr.write("ERROR: --session-id required (or set PRISM_SESSION_ID)\n");
    printHelp();
    process.exit(2);
  }

  const root = findProjectRoot();
  const target = path.join(root, STATE_RELATIVE);

  if (fs.existsSync(target) && !args.force) {
    process.stderr.write(
      `ERROR: ${target} already exists. Use --force to overwrite.\n` +
      "       Refusing to clobber a running autonomous session by default.\n",
    );
    process.exit(3);
  }

  const caps = {};
  if (Number.isFinite(args.costCap) && args.costCap >= 0) caps.cost_usd = args.costCap;
  if (Number.isFinite(args.tokenCap) && args.tokenCap >= 0) caps.tokens = args.tokenCap;
  if (Number.isFinite(args.timeCapMs) && args.timeCapMs >= 0) caps.wall_time_ms = args.timeCapMs;
  if (Number.isFinite(args.unitCap) && args.unitCap >= 0) caps.unit_max = args.unitCap;

  let state;
  try {
    state = buildInitialAutonomousState({ sessionId, mode: args.mode, caps });
  } catch (err) {
    process.stderr.write(`ERROR: ${err.message}\n`);
    process.exit(4);
  }

  const v = validateAutonomousState(state);
  if (!v.ok) {
    process.stderr.write(`ERROR: built state failed validation: ${v.errors.join(", ")}\n`);
    process.exit(5);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(state, null, 2) + "\n", "utf8");

  process.stdout.write(JSON.stringify({
    ok: true,
    path: target,
    session_id: sessionId,
    mode: args.mode,
    schemaVersion: state.schemaVersion,
    caps: state.caps,
  }, null, 2) + "\n");
}

if (process.argv[1]?.endsWith("init-autonomous-state.mjs")) {
  main();
}
