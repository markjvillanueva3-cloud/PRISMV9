/**
 * PRISM Multi-Claude Task Claim Service
 *
 * Enables multiple Claude Code instances (each in a git worktree) to
 * coordinate on shared roadmaps without conflicts.
 *
 * Core primitive: `fs.mkdir(path, { recursive: false })` is atomic on
 * both NTFS and ext4. If two processes race, exactly one succeeds and
 * the other gets EEXIST.
 *
 * Protocol:
 *   1. Claim:     mkdir(claims/{ms}/{unit}) → if EEXIST, already claimed
 *   2. Heartbeat: Update claim.json timestamp every 60s
 *   3. Release:   rm -rf claims/{ms}/{unit}/ after completion
 *   4. Stale:     Claims with heartbeat >5 min old are auto-reaped
 *
 * @module services/TaskClaimService
 */

import * as fs from "fs/promises";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import type { ClaimRecord, InstanceRecord, CoordinationMessage } from "../schemas/coordinationTypes.js";

const DATA_BASE = path.resolve("C:\\PRISM\\mcp-server\\data");
const CLAIMS_DIR = path.join(DATA_BASE, "claims");
const COORD_DIR = path.join(DATA_BASE, "coordination");
const INSTANCES_DIR = path.join(COORD_DIR, "instances");
const MESSAGES_DIR = path.join(COORD_DIR, "messages");
const ACTIVITY_DIR = path.join(COORD_DIR, "activity");

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ── Directory Helpers ───────────────────────────────────────────

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function dirExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function rmDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Already removed or doesn't exist
  }
}

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── Claim Operations ────────────────────────────────────────────

/**
 * Attempt to claim a unit. Returns true if claimed, false if already taken.
 * Uses mkdir atomicity — exactly one caller wins when racing.
 */
export async function claim(
  milestoneId: string,
  unitId: string,
  instanceId: string,
  worktree?: string,
): Promise<boolean> {
  const claimDir = path.join(CLAIMS_DIR, milestoneId, unitId);

  try {
    // Atomic: mkdir with recursive: false fails with EEXIST if dir exists
    await fs.mkdir(claimDir, { recursive: false });
  } catch (err: any) {
    if (err.code === "EEXIST") {
      log.info(`[TaskClaim] Unit already claimed: ${milestoneId}/${unitId}`);
      return false;
    }
    // Parent dir might not exist — create it, then retry once
    if (err.code === "ENOENT") {
      await ensureDir(path.join(CLAIMS_DIR, milestoneId));
      try {
        await fs.mkdir(claimDir, { recursive: false });
      } catch (retryErr: any) {
        if (retryErr.code === "EEXIST") return false;
        throw retryErr;
      }
    } else {
      throw err;
    }
  }

  // Write claim metadata (non-atomic is fine — dir creation was the lock)
  const now = new Date().toISOString();
  const record: ClaimRecord = {
    milestone_id: milestoneId,
    unit_id: unitId,
    instance_id: instanceId,
    worktree,
    claimed_at: now,
    heartbeat_at: now,
  };
  await atomicWrite(
    path.join(claimDir, "claim.json"),
    JSON.stringify(record, null, 2),
  );

  log.info(`[TaskClaim] Claimed: ${milestoneId}/${unitId} by ${instanceId}`);
  await logActivity(milestoneId, instanceId, "claim", unitId);
  return true;
}

/**
 * Release a claimed unit. Removes the claim directory.
 */
export async function release(
  milestoneId: string,
  unitId: string,
  instanceId: string,
): Promise<void> {
  const claimDir = path.join(CLAIMS_DIR, milestoneId, unitId);
  const record = await readJsonSafe<ClaimRecord>(path.join(claimDir, "claim.json"));

  // Only the owner can release (unless force)
  if (record && record.instance_id !== instanceId) {
    log.warn(`[TaskClaim] Release denied: ${unitId} owned by ${record.instance_id}, not ${instanceId}`);
    return;
  }

  await rmDir(claimDir);
  log.info(`[TaskClaim] Released: ${milestoneId}/${unitId} by ${instanceId}`);
  await logActivity(milestoneId, instanceId, "release", unitId);
}

/**
 * Update the heartbeat timestamp on a claim.
 */
export async function heartbeat(
  milestoneId: string,
  unitId: string,
  instanceId: string,
): Promise<string> {
  const claimFile = path.join(CLAIMS_DIR, milestoneId, unitId, "claim.json");
  const record = await readJsonSafe<ClaimRecord>(claimFile);

  if (!record) {
    throw new Error(`No claim found for ${milestoneId}/${unitId}`);
  }
  if (record.instance_id !== instanceId) {
    throw new Error(`Claim ${unitId} owned by ${record.instance_id}, not ${instanceId}`);
  }

  const now = new Date().toISOString();
  record.heartbeat_at = now;
  await atomicWrite(claimFile, JSON.stringify(record, null, 2));
  return now;
}

/**
 * Reap stale claims (heartbeat older than STALE_THRESHOLD_MS).
 * Returns list of reaped unit IDs.
 */
export async function reapStaleClaims(milestoneId: string): Promise<string[]> {
  const msDir = path.join(CLAIMS_DIR, milestoneId);
  if (!(await dirExists(msDir))) return [];

  const reaped: string[] = [];
  const now = Date.now();

  try {
    const entries = await fs.readdir(msDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const claimFile = path.join(msDir, entry.name, "claim.json");
      const record = await readJsonSafe<ClaimRecord>(claimFile);

      if (record) {
        const heartbeatAge = now - new Date(record.heartbeat_at).getTime();
        if (heartbeatAge > STALE_THRESHOLD_MS) {
          await rmDir(path.join(msDir, entry.name));
          reaped.push(entry.name);
          log.info(`[TaskClaim] Reaped stale: ${milestoneId}/${entry.name} (age: ${Math.round(heartbeatAge / 1000)}s)`);
          await logActivity(milestoneId, record.instance_id, "stale_reap", entry.name);
        }
      }
    }
  } catch {
    // Directory might not exist yet
  }

  return reaped;
}

/**
 * Get the set of currently claimed unit IDs for a milestone.
 */
export async function getClaimedUnitIds(milestoneId: string): Promise<Set<string>> {
  const msDir = path.join(CLAIMS_DIR, milestoneId);
  if (!(await dirExists(msDir))) return new Set();

  try {
    const entries = await fs.readdir(msDir, { withFileTypes: true });
    return new Set(entries.filter(e => e.isDirectory()).map(e => e.name));
  } catch {
    return new Set();
  }
}

/**
 * Attempt to claim multiple units. Returns the IDs that were successfully claimed.
 */
export async function claimBatch(
  milestoneId: string,
  unitIds: string[],
  instanceId: string,
  worktree?: string,
): Promise<string[]> {
  const claimed: string[] = [];
  for (const unitId of unitIds) {
    if (await claim(milestoneId, unitId, instanceId, worktree)) {
      claimed.push(unitId);
    }
  }
  return claimed;
}

/**
 * Release all claims held by an instance (cleanup on exit).
 */
export async function releaseAll(instanceId: string): Promise<number> {
  if (!(await dirExists(CLAIMS_DIR))) return 0;

  let released = 0;
  try {
    const milestones = await fs.readdir(CLAIMS_DIR, { withFileTypes: true });
    for (const msEntry of milestones) {
      if (!msEntry.isDirectory() || msEntry.name.startsWith(".")) continue;

      const msDir = path.join(CLAIMS_DIR, msEntry.name);
      const units = await fs.readdir(msDir, { withFileTypes: true });

      for (const unitEntry of units) {
        if (!unitEntry.isDirectory()) continue;
        const claimFile = path.join(msDir, unitEntry.name, "claim.json");
        const record = await readJsonSafe<ClaimRecord>(claimFile);

        if (record?.instance_id === instanceId) {
          await rmDir(path.join(msDir, unitEntry.name));
          released++;
        }
      }
    }
  } catch {
    // Claims dir might not exist
  }

  if (released > 0) {
    log.info(`[TaskClaim] Released all ${released} claims for ${instanceId}`);
  }
  return released;
}

// ── Instance Management ─────────────────────────────────────────

/**
 * Register a Claude Code instance (worktree) as active.
 */
export async function registerInstance(
  instanceId: string,
  worktree: string,
  branch?: string,
): Promise<void> {
  await ensureDir(INSTANCES_DIR);
  const now = new Date().toISOString();
  const record: InstanceRecord = {
    instance_id: instanceId,
    worktree,
    branch,
    started_at: now,
    heartbeat_at: now,
    status: "idle",
  };
  await atomicWrite(
    path.join(INSTANCES_DIR, `${instanceId}.json`),
    JSON.stringify(record, null, 2),
  );
  log.info(`[TaskClaim] Instance registered: ${instanceId} (${worktree})`);
}

/**
 * Get all active instances, optionally filtered by milestone.
 */
export async function getActiveInstances(milestoneId?: string): Promise<InstanceRecord[]> {
  if (!(await dirExists(INSTANCES_DIR))) return [];

  const instances: InstanceRecord[] = [];
  try {
    const files = await fs.readdir(INSTANCES_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const record = await readJsonSafe<InstanceRecord>(path.join(INSTANCES_DIR, file));
      if (record) {
        // Filter stale instances (no heartbeat in 10 min)
        const age = Date.now() - new Date(record.heartbeat_at).getTime();
        if (age < 10 * 60 * 1000) {
          if (!milestoneId || record.current_milestone === milestoneId) {
            instances.push(record);
          }
        }
      }
    }
  } catch {
    // Directory might not exist
  }

  return instances;
}

// ── Communication ───────────────────────────────────────────────

/**
 * Post a coordination message (progress, blocker, result).
 */
export async function postMessage(msg: CoordinationMessage): Promise<void> {
  await ensureDir(MESSAGES_DIR);
  const filename = `${Date.now()}_${msg.from_instance}_${msg.type}.json`;
  await atomicWrite(
    path.join(MESSAGES_DIR, filename),
    JSON.stringify(msg, null, 2),
  );
}

/**
 * Get recent messages, optionally filtered by milestone and time.
 */
export async function getMessages(
  milestoneId?: string,
  sinceMs?: number,
  limit: number = 50,
): Promise<CoordinationMessage[]> {
  if (!(await dirExists(MESSAGES_DIR))) return [];

  const messages: CoordinationMessage[] = [];
  try {
    const files = (await fs.readdir(MESSAGES_DIR)).sort().reverse();
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      if (messages.length >= limit) break;

      const msg = await readJsonSafe<CoordinationMessage>(path.join(MESSAGES_DIR, file));
      if (!msg) continue;

      if (milestoneId && msg.milestone_id !== milestoneId) continue;
      if (sinceMs && new Date(msg.timestamp).getTime() < sinceMs) break;

      messages.push(msg);
    }
  } catch {
    // Directory might not exist
  }

  return messages;
}

/**
 * Append to the per-milestone activity log.
 */
export async function logActivity(
  milestoneId: string,
  instanceId: string,
  action: string,
  unitId?: string,
): Promise<void> {
  await ensureDir(ACTIVITY_DIR);
  const logFile = path.join(ACTIVITY_DIR, `${milestoneId}.json`);

  let entries: any[] = [];
  const existing = await readJsonSafe<any[]>(logFile);
  if (Array.isArray(existing)) entries = existing;

  entries.push({
    timestamp: new Date().toISOString(),
    instance_id: instanceId,
    action,
    unit_id: unitId,
  });

  // Keep last 500 entries per milestone
  if (entries.length > 500) entries = entries.slice(-500);

  await atomicWrite(logFile, JSON.stringify(entries, null, 2));
}
