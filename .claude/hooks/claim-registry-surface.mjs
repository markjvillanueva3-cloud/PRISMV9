#!/usr/bin/env node
// tier: T4
/**
 * SessionStart hook — surfaces other sessions' active roadmap claims in
 * boot context so this session doesn't grab the same milestone.
 *
 * Also triggers compact-restore for this terminal's previously-compacted
 * claims so they flip back to active.
 *
 * continueOnError: true — never fails the session.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const REG = resolve("H:/prism/.claude/helpers/roadmap-claim-registry.mjs");

function terminalId() {
  try {
    const r = spawnSync(process.execPath, [resolve("H:/prism/.claude/helpers/stable-session-id.mjs")], { windowsHide: true,
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

  // Restore any claims this terminal had flushed before compact
  spawnSync(process.execPath, [REG, "compact-restore", "--terminal", tid], { windowsHide: true, timeout: 3000 });

  // GC stale claims across all terminals
  spawnSync(process.execPath, [REG, "gc"], { windowsHide: true, timeout: 3000 });

  // Surface the active-claims list
  const out = spawnSync(process.execPath, [REG, "list"], { windowsHide: true,
    encoding: "utf-8",
    timeout: 3000,
  });
  const line = (out.stdout || "").trim();
  if (line && line !== "no-active-claims") {
    process.stdout.write(`${line}\n`);
  } else {
    process.stdout.write("roadmap-claims: none held by any session\n");
  }
  process.exit(0);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
