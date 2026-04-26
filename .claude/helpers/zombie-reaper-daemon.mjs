#!/usr/bin/env node
/**
 * zombie-reaper-daemon.mjs (U-COORD10)
 *
 * Active cleanup daemon that runs every 60s to:
 * - Remove orphaned lock files
 * - Clean stale claims from AtomicClaimBroker
 * - Prune dead sessions from coordination status
 *
 * Integrated with agent-coordination-daemon.mjs
 */

import * as fs from 'fs';
import * as path from 'path';

const LOCKS_DIR = 'H:/prism/mcp-server/data/locks';
const CLAIMS_FILE = 'H:/prism/state/shared/ATOMIC_CLAIMS.json';
const STATUS_FILE = 'H:/prism/state/shared/AGENT_COORDINATION_STATUS.json';

const LOCK_STALE_MS = 120000; // 2 minutes
const CLAIM_ZOMBIE_MS = 600000; // 10 minutes

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function reapOrphanedLocks() {
  let reaped = 0;
  try {
    const files = fs.readdirSync(LOCKS_DIR);
    const now = Date.now();

    for (const file of files) {
      if (!file.endsWith('.lock')) continue;

      const lockPath = path.join(LOCKS_DIR, file);
      try {
        const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        const lockAge = now - new Date(lock.lastHeartbeat || lock.lockedAt).getTime();

        // Check if lock is stale OR process is dead
        if (lockAge > LOCK_STALE_MS || !isProcessAlive(lock.pid)) {
          fs.unlinkSync(lockPath);
          reaped++;
        }
      } catch {
        // Corrupt lock file, remove it
        try { fs.unlinkSync(lockPath); reaped++; } catch {}
      }
    }
  } catch {
    // Directory doesn't exist or inaccessible
  }
  return reaped;
}

function reapZombieClaims() {
  let reaped = 0;
  try {
    const registry = JSON.parse(fs.readFileSync(CLAIMS_FILE, 'utf8'));
    const now = Date.now();
    const survivingClaims = [];

    for (const claim of (registry.claims || [])) {
      const claimAge = now - new Date(claim.acquiredAt).getTime();
      const processAlive = isProcessAlive(claim.holderPid);

      // Keep claim if process is alive and not too old
      if (processAlive && claimAge < CLAIM_ZOMBIE_MS) {
        survivingClaims.push(claim);
      } else {
        reaped++;
      }
    }

    if (reaped > 0) {
      registry.claims = survivingClaims;
      registry.lastReapedAt = new Date().toISOString();
      registry.zombieCount = (registry.zombieCount || 0) + reaped;
      fs.writeFileSync(CLAIMS_FILE, JSON.stringify(registry, null, 2));
    }
  } catch {
    // File doesn't exist or parse error
  }
  return reaped;
}

function pruneDeadSessions() {
  let pruned = 0;
  try {
    const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));

    // Prune agents array
    if (status.agents && Array.isArray(status.agents)) {
      const before = status.agents.length;
      // Keep only last 50 entries to prevent unbounded growth
      status.agents = status.agents.slice(-50);
      pruned = before - status.agents.length;

      if (pruned > 0) {
        fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
      }
    }
  } catch {
    // File doesn't exist or parse error
  }
  return pruned;
}

async function main() {
  const locksReaped = reapOrphanedLocks();
  const claimsReaped = reapZombieClaims();
  const sessionsPruned = pruneDeadSessions();

  const total = locksReaped + claimsReaped + sessionsPruned;
  if (total > 0) {
    console.log(`Zombie reaper: ${locksReaped} locks, ${claimsReaped} claims, ${sessionsPruned} sessions`);
  }
}

// Run if called directly
main().catch(console.error);

export { reapOrphanedLocks, reapZombieClaims, pruneDeadSessions };
