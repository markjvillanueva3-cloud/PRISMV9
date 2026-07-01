#!/usr/bin/env node
/**
 * mcp-broadcast-reconnect.mjs — fire a fleet-wide MCP reconnect signal.
 *
 * Writes a timestamp to state/shared/mcp-reconnect-signal.json. Every chat's
 * UserPromptSubmit hook (mcp-broadcast-reconnect-inject.mjs) detects it on
 * the next prompt and surfaces a "/mcp reconnect" nudge in that chat's
 * context.
 *
 * Knobs:
 *   --reason "text"      — optional explanation surfaced to chats
 *   --silent             — don't print to stdout (script-friendly)
 *   --ttl-sec N          — auto-stale this broadcast after N seconds (default 3600)
 *
 * R12 fail-loud on bad TTL or unwritable target.
 */

import { writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";

const SIGNAL_FILE = "H:/prism/state/shared/mcp-reconnect-signal.json";
const DEFAULT_TTL_SEC = 3600;

function parseArgs() {
  const a = { reason: "operator-triggered fleet reconnect", silent: false, ttlSec: DEFAULT_TTL_SEC };
  for (let i = 2; i < process.argv.length; i++) {
    const tok = process.argv[i];
    if (tok === "--reason") a.reason = process.argv[++i];
    else if (tok === "--silent") a.silent = true;
    else if (tok === "--ttl-sec") {
      const v = Number(process.argv[++i]);
      if (!Number.isFinite(v) || v < 1) throw new RangeError("--ttl-sec must be positive integer");
      a.ttlSec = v;
    }
  }
  return a;
}

function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, path);
}

const args = parseArgs();
const now = new Date();
const signal = {
  schemaVersion: "1.0.0",
  signaledAt: now.toISOString(),
  signaledAtMs: now.getTime(),
  signaledByPid: process.pid,
  reason: args.reason,
  ttlSec: args.ttlSec,
  expiresAtMs: now.getTime() + args.ttlSec * 1000,
};
atomicWrite(SIGNAL_FILE, JSON.stringify(signal, null, 2));
if (!args.silent) {
  console.log(`mcp-broadcast: fired at ${signal.signaledAt} (reason="${args.reason}", ttl=${args.ttlSec}s)`);
  console.log(`  signal file: ${SIGNAL_FILE}`);
  console.log(`  next prompt in each chat will surface a "/mcp reconnect" nudge`);
}
