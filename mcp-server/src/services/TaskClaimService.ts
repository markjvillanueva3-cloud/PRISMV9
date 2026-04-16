/**
 * PRISM Multi-Claude Task Claim Service
 *
 * Enables multiple Claude Code instances (each in a git worktree) to
 * coordinate on shared roadmaps without conflicts.
 *
 * v2.0 Changes:
 *   - Uses DistributedLockService for distributed locking (PG > Redis > File)
 *   - Integrates with DeadLetterQueueEngine for failed claims
 *   - Configurable heartbeat timeout per task type
 *   - Graceful fallback to file-based locks when distributed backends unavailable
 *
 * Protocol:
 *   1. Claim:     Acquire distributed lock → write claim.json
 *   2. Heartbeat: Update claim.json + renew lock every heartbeatInterval
 *   3. Release:   rm claim dir + release distributed lock
 *   4. Stale:     Claims with heartbeat > threshold are auto-reaped → DLQ
 *
 * @module services/TaskClaimService
 */

import * as fs from "fs/promises";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { PATHS } from "../constants.js";
import { distributedLockService } from "./DistributedLockService.js";
import { deadLetterQueueEngine } from "../engines/DeadLetterQueueEngine.js";
import type { ClaimRecord, InstanceRecord, CoordinationMessage } from "../schemas/coordinationTypes.js";

const DATA_BASE = path.join(PATHS.MCP_SERVER, "data");
const CLAIMS_DIR = path.join(DATA_BASE, "claims");
const COORD_DIR = path.join(DATA_BASE, "coordination");
const INSTANCES_DIR = path.join(COORD_DIR, "instances");
const MESSAGES_DIR = path.join(COORD_DIR, "messages");
const ACTIVITY_DIR = path.join(COORD_DIR, "activity");

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ── Configurable Heartbeat Timeouts ─────────────────────────────

export interface HeartbeatConfig {
  intervalMs: number;
  timeoutMs: number;
}

const HEARTBEAT_CONFIGS: Record<string, HeartbeatConfig> = {
  default: { intervalMs: 60_000, timeoutMs: 5 * 60_000 },       // 1min interval, 5min timeout
  unit: { intervalMs: 60_000, timeoutMs: 5 * 60_000 },          // Standard unit work
  milestone: { intervalMs: 120_000, timeoutMs: 10 * 60_000 },   // Longer for milestone-level
  pipeline: { intervalMs: 30_000, timeoutMs: 3 * 60_000 },      // Faster heartbeat for pipelines
  audit: { intervalMs: 180_000, timeoutMs: 15 * 60_000 },       // Relaxed for audit tasks
};

/**
 * Get heartbeat config for a task type.
 */
export function getHeartbeatConfig(taskType: string): HeartbeatConfig {
  return HEARTBEAT_CONFIGS[taskType] ?? HEARTBEAT_CONFIGS.default;
}

/**
 * Set custom heartbeat config for a task type.
 */
export function setHeartbeatConfig(taskType: string, config: HeartbeatConfig): void {
  HEARTBEAT_CONFIGS[taskType] = config;
}

// ── Lock Resource Naming ────────────────────────────────────────

function claimLockResource(milestoneId: string, unitId: string): string {
  return `claim:${milestoneId}/${unitId}`;
}

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
 * Uses DistributedLockService for distributed locking, falls back to mkdir atomicity.
 */
export async function claim(
  milestoneId: string,
  unitId: string,
  instanceId: string,
  worktree?: string,
  taskType: string = "unit",
): Promise<boolean> {
  const claimDir = path.join(CLAIMS_DIR, milestoneId, unitId);
  const lockResource = claimLockResource(milestoneId, unitId);
  const heartbeatConfig = getHeartbeatConfig(taskType);

  // Try to acquire distributed lock first
  const lockResult = await distributedLockService.acquireLock(
    lockResource,
    heartbeatConfig.timeoutMs,
    "task_claim",
    true // auto-renew
  );

  if (!lockResult.acquired) {
    log.info(`[TaskClaim] Lock conflict: ${milestoneId}/${unitId} - ${lockResult.error}`);

    // Add to dead letter queue for retry
    await deadLetterQueueEngine.addFailure({
      taskType: "claim",
      resource: lockResource,
      milestoneId,
      unitId,
      instanceId,
      reason: "lock_conflict",
      errorMessage: lockResult.error ?? "Lock already held",
      context: { worktree, taskType },
    });

    return false;
  }

  try {
    // Create claim directory (still useful for file-based state)
    try {
      await fs.mkdir(claimDir, { recursive: false });
    } catch (err: any) {
      if (err.code === "EEXIST") {
        // Directory exists but we have the lock - check if it's stale
        const existingClaim = await readJsonSafe<ClaimRecord>(path.join(claimDir, "claim.json"));
        if (existingClaim) {
          const age = Date.now() - new Date(existingClaim.heartbeat_at).getTime();
          if (age < heartbeatConfig.timeoutMs) {
            // Claim is still valid - release our lock and fail
            await distributedLockService.releaseLock(lockResource);
            log.info(`[TaskClaim] Unit already claimed: ${milestoneId}/${unitId}`);
            return false;
          }
          // Stale claim - we can take over
          log.info(`[TaskClaim] Taking over stale claim: ${milestoneId}/${unitId}`);
        }
      } else if (err.code === "ENOENT") {
        await ensureDir(path.join(CLAIMS_DIR, milestoneId));
        try {
          await fs.mkdir(claimDir, { recursive: false });
        } catch (retryErr: any) {
          if (retryErr.code !== "EEXIST") {
            await distributedLockService.releaseLock(lockResource);
            throw retryErr;
          }
        }
      } else {
        await distributedLockService.releaseLock(lockResource);
        throw err;
      }
    }

    // Write claim metadata
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

    log.info(`[TaskClaim] Claimed: ${milestoneId}/${unitId} by ${instanceId} (lock: ${distributedLockService.getBackendName()})`);
    await logActivity(milestoneId, instanceId, "claim", unitId);
    return true;
  } catch (err: any) {
    // Release lock on error
    await distributedLockService.releaseLock(lockResource);

    // Add to dead letter queue
    await deadLetterQueueEngine.addFailure({
      taskType: "claim",
      resource: lockResource,
      milestoneId,
      unitId,
      instanceId,
      reason: "execution_error",
      errorMessage: err.message,
      errorStack: err.stack,
      context: { worktree, taskType },
    });

    throw err;
  }
}

/**
 * Release a claimed unit. Removes the claim directory and releases distributed lock.
 */
export async function release(
  milestoneId: string,
  unitId: string,
  instanceId: string,
): Promise<void> {
  const claimDir = path.join(CLAIMS_DIR, milestoneId, unitId);
  const lockResource = claimLockResource(milestoneId, unitId);
  const record = await readJsonSafe<ClaimRecord>(path.join(claimDir, "claim.json"));

  // Only the owner can release (unless force)
  if (record && record.instance_id !== instanceId) {
    log.warn(`[TaskClaim] Release denied: ${unitId} owned by ${record.instance_id}, not ${instanceId}`);
    return;
  }

  // Release distributed lock first
  const released = await distributedLockService.releaseLock(lockResource);
  if (!released && distributedLockService.isLockHeld(lockResource)) {
    log.warn(`[TaskClaim] Failed to release distributed lock for ${unitId}`);
  }

  // Remove claim directory
  await rmDir(claimDir);
  log.info(`[TaskClaim] Released: ${milestoneId}/${unitId} by ${instanceId}`);
  await logActivity(milestoneId, instanceId, "release", unitId);
}

/**
 * Update the heartbeat timestamp on a claim and renew distributed lock.
 */
export async function heartbeat(
  milestoneId: string,
  unitId: string,
  instanceId: string,
  taskType: string = "unit",
): Promise<string> {
  const claimFile = path.join(CLAIMS_DIR, milestoneId, unitId, "claim.json");
  const lockResource = claimLockResource(milestoneId, unitId);
  const heartbeatConfig = getHeartbeatConfig(taskType);
  const record = await readJsonSafe<ClaimRecord>(claimFile);

  if (!record) {
    // Claim file missing - add to DLQ
    await deadLetterQueueEngine.addFailure({
      taskType: "claim",
      resource: lockResource,
      milestoneId,
      unitId,
      instanceId,
      reason: "heartbeat_missed",
      errorMessage: `No claim found for ${milestoneId}/${unitId}`,
    });
    throw new Error(`No claim found for ${milestoneId}/${unitId}`);
  }
  if (record.instance_id !== instanceId) {
    throw new Error(`Claim ${unitId} owned by ${record.instance_id}, not ${instanceId}`);
  }

  // Renew distributed lock
  const renewed = await distributedLockService.renewLock(lockResource, heartbeatConfig.timeoutMs);
  if (!renewed) {
    log.warn(`[TaskClaim] Lock renewal failed for ${unitId} - lock may have expired`);

    // Try to re-acquire the lock
    const reacquired = await distributedLockService.acquireLock(
      lockResource,
      heartbeatConfig.timeoutMs,
      "task_claim",
      true
    );

    if (!reacquired.acquired) {
      await deadLetterQueueEngine.addFailure({
        taskType: "claim",
        resource: lockResource,
        milestoneId,
        unitId,
        instanceId,
        reason: "lock_timeout",
        errorMessage: "Failed to renew lock and re-acquire failed",
      });
      throw new Error(`Lock expired for ${milestoneId}/${unitId} and re-acquisition failed`);
    }
  }

  const now = new Date().toISOString();
  record.heartbeat_at = now;
  await atomicWrite(claimFile, JSON.stringify(record, null, 2));
  return now;
}

/**
 * Reap stale claims (heartbeat older than threshold).
 * Returns list of reaped unit IDs. Failed claims go to dead letter queue.
 */
export async function reapStaleClaims(
  milestoneId: string,
  taskType: string = "unit",
): Promise<string[]> {
  const msDir = path.join(CLAIMS_DIR, milestoneId);
  if (!(await dirExists(msDir))) return [];

  const heartbeatConfig = getHeartbeatConfig(taskType);
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
        if (heartbeatAge > heartbeatConfig.timeoutMs) {
          const lockResource = claimLockResource(milestoneId, entry.name);

          // Force release distributed lock
          await distributedLockService.forceRelease(lockResource);

          // Add to dead letter queue for potential retry
          await deadLetterQueueEngine.addFailure({
            taskType: "claim",
            resource: lockResource,
            milestoneId,
            unitId: entry.name,
            instanceId: record.instance_id,
            reason: "heartbeat_missed",
            errorMessage: `Claim stale for ${Math.round(heartbeatAge / 1000)}s (threshold: ${heartbeatConfig.timeoutMs / 1000}s)`,
            context: {
              worktree: record.worktree,
              claimed_at: record.claimed_at,
              last_heartbeat: record.heartbeat_at,
            },
          });

          // Remove claim directory
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

// ── Dead Letter Queue Integration ───────────────────────────────

/**
 * Get dead letter queue entries for a milestone.
 */
export function getDeadLetterEntries(milestoneId: string) {
  return deadLetterQueueEngine.getByMilestone(milestoneId);
}

/**
 * Get dead letter queue statistics.
 */
export function getDeadLetterStats() {
  return deadLetterQueueEngine.getStats();
}

/**
 * Retry a failed claim from the dead letter queue.
 */
export async function retryDeadLetter(entryId: string): Promise<boolean> {
  return deadLetterQueueEngine.retry(entryId);
}

/**
 * Discard a dead letter entry (give up).
 */
export async function discardDeadLetter(entryId: string, reason: string): Promise<void> {
  return deadLetterQueueEngine.discard(entryId, reason);
}

/**
 * Register retry handler for automatic DLQ retries.
 */
export function registerDeadLetterRetryHandler(): void {
  deadLetterQueueEngine.onRetry(async (entry) => {
    if (entry.taskType !== "claim") return false;
    if (!entry.milestoneId || !entry.unitId || !entry.instanceId) return false;

    try {
      return await claim(
        entry.milestoneId,
        entry.unitId,
        entry.instanceId,
        entry.context?.worktree as string | undefined,
        entry.context?.taskType as string | undefined
      );
    } catch {
      return false;
    }
  });
}

// ── Lock Statistics ─────────────────────────────────────────────

/**
 * Get distributed lock statistics.
 */
export function getLockStats() {
  return distributedLockService.getStats();
}

/**
 * Get the active lock backend name.
 */
export function getLockBackend(): string {
  return distributedLockService.getBackendName();
}

/**
 * Initialize the task claim service (call on startup).
 */
export async function init(): Promise<void> {
  // Initialize distributed lock service
  const backend = await distributedLockService.init();
  log.info(`[TaskClaim] Initialized with ${backend} lock backend`);

  // Initialize dead letter queue
  await deadLetterQueueEngine.init();

  // Register retry handler
  registerDeadLetterRetryHandler();
}

/**
 * Shutdown the task claim service (call on exit).
 */
export async function shutdown(): Promise<void> {
  // Release all distributed locks
  await distributedLockService.releaseAll();

  // Shutdown dead letter queue
  await deadLetterQueueEngine.shutdown();

  log.info("[TaskClaim] Shutdown complete");
}
