#!/usr/bin/env node
// tier: T4
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
  // Stop hook contract: emit valid JSON. Log human-readable detail to stderr
  // (which Claude doesn't parse as hook output, so it's safe diagnostic noise).
  process.stderr.write(`claim-registry: ${(r.stdout || "").trim()}\n`);
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
