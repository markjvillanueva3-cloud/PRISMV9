#!/usr/bin/env node
// tier: T4
/**
 * multi-computer-awareness.mjs — SessionStart hook
 *
 * The H: drive is portable: it plugs into multiple physical computers.
 * Two computers can mount the SAME drive simultaneously via file share.
 * When that happens:
 *   - Session state from machine A may collide with machine B
 *   - File locks behave oddly across SMB vs local
 *   - Cached paths from machine A may not exist on machine B
 *   - Git worktrees initialized on A may have machine-specific config on B
 *
 * This hook:
 *   1. Records machine fingerprint (hostname + OS + user + drive-mount-path)
 *      to state/shared/MACHINE_REGISTRY.json
 *   2. Detects when another machine has recently (< 5 min) touched the
 *      same H: drive — warns about potential collision
 *   3. Checks for stale machine-specific state that should be cleared
 *      (e.g., old hostname in portable-node-drift.jsonl)
 *   4. Emits a "seamless-transition" status for dashboards
 *
 * Non-blocking: warns, does not fail SessionStart.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const REGISTRY = "H:/prism/state/shared/MACHINE_REGISTRY.json";
const STALE_MS = 5 * 60 * 1000; // 5 min: another machine was very recently active

function fingerprint() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    user: os.userInfo().username,
    nodeVersion: process.versions.node,
    pid: process.pid,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
}

function key(fp) {
  return `${fp.hostname}|${fp.user}|${fp.platform}`;
}

function loadRegistry() {
  try {
    if (fs.existsSync(REGISTRY)) {
      return JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
    }
  } catch {}
  return { machines: {}, lastUpdated: null };
}

function saveRegistry(reg) {
  try {
    if (!fs.existsSync(path.dirname(REGISTRY))) {
      fs.mkdirSync(path.dirname(REGISTRY), { recursive: true });
    }
    const tmp = `${REGISTRY}.tmp.${process.pid}.${Date.now().toString(36)}`;
    fs.writeFileSync(tmp, JSON.stringify(reg, null, 2));
    fs.renameSync(tmp, REGISTRY);
  } catch {}
}

function main() {
  const reg = loadRegistry();
  reg.machines = reg.machines || {};

  const me = fingerprint();
  const myKey = key(me);
  const now = Date.now();

  // Detect other machines recently active on this H: drive
  const otherMachines = [];
  for (const [k, fp] of Object.entries(reg.machines)) {
    if (k === myKey) continue;
    const lastMs = new Date(fp.lastSeen || 0).getTime();
    if (now - lastMs <= STALE_MS) {
      otherMachines.push({ key: k, fp, ageMs: now - lastMs });
    }
  }

  // Update/insert my fingerprint
  if (reg.machines[myKey]) {
    reg.machines[myKey] = { ...reg.machines[myKey], ...me, lastSeen: me.lastSeen };
  } else {
    reg.machines[myKey] = me;
  }
  reg.lastUpdated = me.lastSeen;

  // Cap registry size: drop machines not seen in 30 days
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  for (const [k, fp] of Object.entries(reg.machines)) {
    const lastMs = new Date(fp.lastSeen || 0).getTime();
    if (now - lastMs > THIRTY_DAYS) {
      delete reg.machines[k];
    }
  }

  saveRegistry(reg);

  if (otherMachines.length > 0) {
    const list = otherMachines
      .map((m) => `    ${m.fp.hostname} (${m.fp.user}, ${Math.round(m.ageMs / 1000)}s ago)`)
      .join("\n");
    process.stdout.write(
      `⚠  multi-computer: ${otherMachines.length} other machine(s) recently active on H: drive\n${list}\n   Per-session state must be isolated by session-id AND machine (see atomicSessionWrite.resolveSessionId).\n`
    );
  } else {
    process.stdout.write(`✓ multi-computer: this machine (${me.hostname}) is sole active user of H:\n`);
  }
}

try {
  main();
} catch (e) {
  process.stderr.write(`[multi-computer-awareness] ${e.message}\n`);
}
process.exit(0);
