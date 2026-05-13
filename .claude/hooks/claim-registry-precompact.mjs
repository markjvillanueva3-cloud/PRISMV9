#!/usr/bin/env node
// tier: T4
/**
 * PreCompact hook — flush this terminal's active claims to status=compacted
 * so concurrent sessions know they're in-flight during compaction, not stale.
 *
 * Paired with claim-registry-surface.mjs which calls compact-restore on
 * SessionStart to flip them back to active.
 *
 * continueOnError: true.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const REG = resolve("H:/prism/.claude/helpers/roadmap-claim-registry.mjs");

function terminalId() {
  try {
    const r = spawnSync(process.execPath, [resolve("H:/prism/.claude/helpers/stable-session-id.mjs")], {
      encoding: "utf-8",
      timeout: 2000,
    });
    return (r.stdout || "").trim() || `pid-${process.pid}`;
  } catch {
    return `pid-${process.pid}`;
  }
}

function main() {
  const tid = terminalId();
  const r = spawnSync(process.execPath, [REG, "compact-flush", "--terminal", tid], {
    encoding: "utf-8",
    timeout: 3000,
  });
  process.stdout.write(`claim-registry: precompact ${(r.stdout || "").trim()}\n`);
  process.exit(0);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
