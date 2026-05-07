#!/usr/bin/env node
/**
 * Stop / SessionEnd hook — release this terminal's claims so peers can
 * pick them up without waiting for the staleness TTL.
 *
 * If this is a clean stop, claims go away. If the process crashed, the
 * 2h staleness TTL in roadmap-claim-registry.mjs gc will eventually
 * expire them.
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
  const r = spawnSync(process.execPath, [REG, "release", "--terminal", tid], {
    encoding: "utf-8",
    timeout: 3000,
  });
  process.stdout.write(`claim-registry: ${(r.stdout || "").trim()}\n`);
  process.exit(0);
}

main();
