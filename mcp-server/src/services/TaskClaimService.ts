import { promises as fs } from "node:fs";
import * as syncFs from "node:fs";
import * as path from "node:path";
import { PATHS } from "../constants.js";
import { safeWriteSync } from "../utils/atomicWrite.js";

const DATA_BASE = path.join(PATHS.MCP_SERVER, "data");
const CLAIMS_DIR = path.join(DATA_BASE, "claims");
const COORD_DIR = path.join(DATA_BASE, "coordination");
const INSTANCES_DIR = path.join(COORD_DIR, "instances");
const MESSAGES_DIR = path.join(COORD_DIR, "messages");
const ACTIVITY_LOG = path.join(COORD_DIR, "activity.jsonl");
const STALE_CLAIM_MS = 30 * 60 * 1000;
const STALE_INSTANCE_MS = 10 * 60 * 1000;

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function claimDirFor(milestoneId: string, unitId: string): string {
  return path.join(CLAIMS_DIR, milestoneId, unitId);
}

function claimFileFor(milestoneId: string, unitId: string): string {
  return path.join(claimDirFor(milestoneId, unitId), "claim.json");
}

export async function claim(
  milestoneId: string,
  unitId: string,
  instanceId: string,
  worktree?: string
): Promise<boolean> {
  const claimDir = claimDirFor(milestoneId, unitId);
  try {
    await fs.mkdir(claimDir, { recursive: false });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      await ensureDir(path.join(CLAIMS_DIR, milestoneId));
      try {
        await fs.mkdir(claimDir, { recursive: false });
      } catch (retryError: any) {
        if (retryError?.code === "EEXIST") return false;
        throw retryError;
      }
    } else if (error?.code === "EEXIST") {
      return false;
    } else {
      throw error;
    }
  }

  const now = new Date().toISOString();
  safeWriteSync(
    claimFileFor(milestoneId, unitId),
    JSON.stringify(
      {
        milestone_id: milestoneId,
        unit_id: unitId,
        instance_id: instanceId,
        worktree,
        claimed_at: now,
        heartbeat_at: now,
      },
      null,
      2
    )
  );
  return true;
}

export async function release(
  milestoneId: string,
  unitId: string,
  instanceId: string
): Promise<void> {
  const claimFile = claimFileFor(milestoneId, unitId);
  const record = await readJsonSafe<any>(claimFile);
  if (record && record.instance_id && record.instance_id !== instanceId) return;
  await fs.rm(claimDirFor(milestoneId, unitId), { recursive: true, force: true });
}

export async function heartbeat(
  milestoneId: string,
  unitId: string,
  instanceId: string
): Promise<string> {
  const claimFile = claimFileFor(milestoneId, unitId);
  const record = (await readJsonSafe<any>(claimFile)) || {};
  const timestamp = new Date().toISOString();
  record.milestone_id = milestoneId;
  record.unit_id = unitId;
  record.instance_id = instanceId;
  record.heartbeat_at = timestamp;
  await ensureDir(path.dirname(claimFile));
  safeWriteSync(claimFile, JSON.stringify(record, null, 2));
  return timestamp;
}

export async function reapStaleClaims(milestoneId: string): Promise<string[]> {
  const milestoneDir = path.join(CLAIMS_DIR, milestoneId);
  if (!(await dirExists(milestoneDir))) return [];
  const reaped: string[] = [];
  const units = await fs.readdir(milestoneDir);
  for (const unitId of units) {
    const claimFile = claimFileFor(milestoneId, unitId);
    const record = await readJsonSafe<any>(claimFile);
    const heartbeatAt = record?.heartbeat_at ? new Date(record.heartbeat_at).getTime() : 0;
    if (!heartbeatAt || Date.now() - heartbeatAt > STALE_CLAIM_MS) {
      await fs.rm(claimDirFor(milestoneId, unitId), { recursive: true, force: true });
      reaped.push(unitId);
    }
  }
  return reaped;
}

export async function getClaimedUnitIds(milestoneId: string): Promise<Set<string>> {
  const milestoneDir = path.join(CLAIMS_DIR, milestoneId);
  if (!(await dirExists(milestoneDir))) return new Set();
  return new Set((await fs.readdir(milestoneDir)).filter(Boolean));
}

export async function claimBatch(
  milestoneId: string,
  unitIds: string[],
  instanceId: string,
  worktree?: string
): Promise<{ claimed: string[]; skipped: string[] }> {
  const claimed: string[] = [];
  const skipped: string[] = [];
  for (const unitId of unitIds) {
    if (await claim(milestoneId, unitId, instanceId, worktree)) claimed.push(unitId);
    else skipped.push(unitId);
  }
  return { claimed, skipped };
}

export async function releaseAll(instanceId: string): Promise<number> {
  if (!(await dirExists(CLAIMS_DIR))) return 0;
  let released = 0;
  const milestones = await fs.readdir(CLAIMS_DIR);
  for (const milestoneId of milestones) {
    const milestoneDir = path.join(CLAIMS_DIR, milestoneId);
    if (!(await dirExists(milestoneDir))) continue;
    const units = await fs.readdir(milestoneDir);
    for (const unitId of units) {
      const record = await readJsonSafe<any>(claimFileFor(milestoneId, unitId));
      if (record?.instance_id === instanceId) {
        await fs.rm(claimDirFor(milestoneId, unitId), { recursive: true, force: true });
        released += 1;
      }
    }
  }
  return released;
}

export async function registerInstance(
  instanceId: string,
  worktree: string,
  branch?: string
): Promise<void> {
  await ensureDir(INSTANCES_DIR);
  const now = new Date().toISOString();
  safeWriteSync(
    path.join(INSTANCES_DIR, `${instanceId}.json`),
    JSON.stringify(
      {
        instance_id: instanceId,
        worktree,
        branch,
        started_at: now,
        heartbeat_at: now,
        status: "idle",
      },
      null,
      2
    )
  );
}

export async function getActiveInstances(milestoneId?: string): Promise<any[]> {
  if (!(await dirExists(INSTANCES_DIR))) return [];
  const instances: any[] = [];
  for (const file of await fs.readdir(INSTANCES_DIR)) {
    if (!file.endsWith(".json")) continue;
    const record = await readJsonSafe<any>(path.join(INSTANCES_DIR, file));
    if (!record) continue;
    const age = Date.now() - new Date(record.heartbeat_at ?? record.started_at ?? 0).getTime();
    if (age < STALE_INSTANCE_MS) instances.push(record);
  }

  if (!milestoneId) return instances;
  const claimedIds = await getClaimedUnitIds(milestoneId);
  return instances.filter((record) => {
    if (claimedIds.size === 0) return true;
    const instanceId = String(record.instance_id ?? "");
    for (const unitId of claimedIds) {
      const claimFile = claimFileFor(milestoneId, unitId);
      if (syncFs.existsSync(claimFile)) {
        try {
          const claimRecord = JSON.parse(syncFs.readFileSync(claimFile, "utf-8"));
          if (claimRecord.instance_id === instanceId) return true;
        } catch {}
      }
    }
    return false;
  });
}

export async function postMessage(message: Record<string, unknown>): Promise<string> {
  await ensureDir(MESSAGES_DIR);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  safeWriteSync(
    path.join(MESSAGES_DIR, `${id}.json`),
    JSON.stringify({ id, created_at: new Date().toISOString(), ...message }, null, 2)
  );
  return id;
}

export async function getMessages(limit: number = 50): Promise<any[]> {
  if (!(await dirExists(MESSAGES_DIR))) return [];
  const files = (await fs.readdir(MESSAGES_DIR)).filter((file) => file.endsWith(".json")).sort().reverse();
  const messages: any[] = [];
  for (const file of files.slice(0, limit)) {
    const message = await readJsonSafe<any>(path.join(MESSAGES_DIR, file));
    if (message) messages.push(message);
  }
  return messages;
}

export async function logActivity(entry: Record<string, unknown>): Promise<void> {
  await ensureDir(path.dirname(ACTIVITY_LOG));
  await fs.appendFile(ACTIVITY_LOG, `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`, "utf-8");
}
