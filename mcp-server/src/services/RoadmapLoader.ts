/**
 * PRISM RoadmapLoader — On-demand milestone loading service
 *
 * Loads individual milestone envelopes and the roadmap index from disk.
 * RoadmapExecutor remains pure logic — this handles all file I/O.
 *
 * @module services/RoadmapLoader
 */

import * as path from "path";
import { log } from "../utils/Logger.js";
import { readJsonFile, writeJsonFile, fileExists } from "../utils/files.js";
import { PATHS } from "../constants.js";
import {
  type RoadmapEnvelope,
  type RoadmapIndex,
  type MilestoneEntry,
  type MilestoneStatus,
  parseRoadmap,
  parseRoadmapIndex,
} from "../schemas/roadmapSchema.js";
import type { PositionTracker } from "../hooks/post-roadmap-unit.js";
import { createInitialPosition } from "../engines/RoadmapExecutor.js";

// Base directory for roadmap data — use PATHS.MCP_SERVER (process.cwd() varies by parent process)
const DATA_BASE = path.join(PATHS.MCP_SERVER, "data");
const INDEX_PATH = path.join(DATA_BASE, "roadmap-index.json");

// ── Cache ────────────────────────────────────────────────────────

const INDEX_CACHE_TTL = 60_000;     // 1 minute
const ENVELOPE_CACHE_TTL = 300_000; // 5 minutes

let indexCache: { data: RoadmapIndex; loadedAt: number } | null = null;
const envelopeCache = new Map<string, { data: RoadmapEnvelope; loadedAt: number }>();

// ── Index Operations ─────────────────────────────────────────────

export async function loadIndex(): Promise<RoadmapIndex> {
  if (indexCache && Date.now() - indexCache.loadedAt < INDEX_CACHE_TTL) {
    return indexCache.data;
  }
  const raw = await readJsonFile<unknown>(INDEX_PATH);
  const index = parseRoadmapIndex(raw);
  indexCache = { data: index, loadedAt: Date.now() };
  log.info(`[RoadmapLoader] Index loaded: ${index.total_milestones} milestones`);
  return index;
}

export async function saveIndex(index: RoadmapIndex): Promise<void> {
  index.updated_at = new Date().toISOString();
  await writeJsonFile(INDEX_PATH, index);
  indexCache = { data: index, loadedAt: Date.now() };
  log.info(`[RoadmapLoader] Index saved`);
}

export async function getMilestoneEntry(milestoneId: string): Promise<MilestoneEntry | null> {
  const index = await loadIndex();
  return index.milestones.find(m => m.id === milestoneId) || null;
}

// ── Envelope Operations ──────────────────────────────────────────

export async function loadEnvelope(milestoneId: string): Promise<RoadmapEnvelope> {
  const cached = envelopeCache.get(milestoneId);
  if (cached && Date.now() - cached.loadedAt < ENVELOPE_CACHE_TTL) {
    return cached.data;
  }

  const entry = await getMilestoneEntry(milestoneId);
  if (!entry) {
    throw new Error(`Milestone not found in index: ${milestoneId}`);
  }

  const envelopePath = path.join(DATA_BASE, entry.envelope_path);
  const raw = await readJsonFile<unknown>(envelopePath);
  const envelope = parseRoadmap(raw);

  envelopeCache.set(milestoneId, { data: envelope, loadedAt: Date.now() });
  log.info(`[RoadmapLoader] Loaded envelope: ${milestoneId} (${envelope.total_units} units)`);
  return envelope;
}

export async function saveEnvelope(milestoneId: string, envelope: RoadmapEnvelope): Promise<void> {
  const entry = await getMilestoneEntry(milestoneId);
  if (!entry) throw new Error(`Milestone not found in index: ${milestoneId}`);
  const envelopePath = path.join(DATA_BASE, entry.envelope_path);
  await writeJsonFile(envelopePath, envelope);
  envelopeCache.set(milestoneId, { data: envelope, loadedAt: Date.now() });
}

// ── Position Operations ──────────────────────────────────────────

export async function loadPosition(milestoneId: string): Promise<PositionTracker | null> {
  const entry = await getMilestoneEntry(milestoneId);
  if (!entry || !entry.position_path) return null;
  const posPath = path.join(DATA_BASE, entry.position_path);
  if (!(await fileExists(posPath))) return null;
  return readJsonFile<PositionTracker>(posPath);
}

export async function savePosition(milestoneId: string, position: PositionTracker): Promise<void> {
  const entry = await getMilestoneEntry(milestoneId);
  if (!entry) throw new Error(`Milestone not found in index: ${milestoneId}`);
  if (!entry.position_path) throw new Error(`Milestone ${milestoneId} has no position_path`);
  const posPath = path.join(DATA_BASE, entry.position_path);
  await writeJsonFile(posPath, position);
}

// ── Index Maintenance ────────────────────────────────────────────

export async function updateMilestoneStatus(
  milestoneId: string,
  status: MilestoneStatus,
  completedUnits?: number,
): Promise<void> {
  const index = await loadIndex();
  const entry = index.milestones.find(m => m.id === milestoneId);
  if (!entry) throw new Error(`Milestone not found in index: ${milestoneId}`);
  entry.status = status;
  if (completedUnits !== undefined) entry.completed_units = completedUnits;
  index.completed_milestones = index.milestones.filter(m => m.status === "complete").length;
  await saveIndex(index);
}

// ── Resolve Helpers (backward-compat bridge) ─────────────────────

/**
 * Resolve a RoadmapEnvelope from either milestone_id (load from disk)
 * or raw roadmap JSON (parse inline). Backward compatible.
 */
export async function resolveEnvelope(
  params: { milestone_id?: string; roadmap?: unknown },
): Promise<{ envelope: RoadmapEnvelope; milestoneId: string }> {
  if (params.milestone_id) {
    const envelope = await loadEnvelope(params.milestone_id);
    return { envelope, milestoneId: params.milestone_id };
  }
  if (params.roadmap) {
    const envelope = parseRoadmap(params.roadmap);
    return { envelope, milestoneId: envelope.id };
  }
  throw new Error("Either milestone_id or roadmap (full envelope) required");
}

/**
 * Resolve a PositionTracker from either milestone_id (load from disk),
 * inline position, or create initial from envelope. Backward compatible.
 */
export async function resolvePosition(
  params: { milestone_id?: string; position?: PositionTracker },
  envelope: RoadmapEnvelope,
): Promise<PositionTracker> {
  if (params.position) return params.position;
  if (params.milestone_id) {
    const pos = await loadPosition(params.milestone_id);
    if (pos) return pos;
  }
  return createInitialPosition(envelope);
}

// ── Milestone-Level Claiming ────────────────────────────────────

const STALE_CLAIM_MS = 10 * 60 * 1000; // 10 minutes without heartbeat = stale

/**
 * Claim a milestone for a terminal instance. Prevents other terminals
 * from picking the same work after compaction.
 * Returns true if claimed, false if already claimed by someone else.
 */
export async function claimMilestone(
  milestoneId: string,
  instanceId: string,
): Promise<boolean> {
  const index = await loadIndex();
  const entry = index.milestones.find(m => m.id === milestoneId);
  if (!entry) throw new Error(`Milestone not found in index: ${milestoneId}`);

  // Already claimed by same instance — renew
  if (entry.claimed_by === instanceId) {
    entry.claimed_at = new Date().toISOString();
    await saveIndex(index);
    return true;
  }

  // Already claimed by someone else — check staleness
  if (entry.claimed_by && entry.claimed_at) {
    const age = Date.now() - new Date(entry.claimed_at).getTime();
    if (age < STALE_CLAIM_MS) {
      log.info(`[RoadmapLoader] Milestone ${milestoneId} already claimed by ${entry.claimed_by} (${Math.round(age / 1000)}s ago)`);
      return false;
    }
    log.info(`[RoadmapLoader] Reaping stale claim on ${milestoneId} from ${entry.claimed_by}`);
  }

  entry.claimed_by = instanceId;
  entry.claimed_at = new Date().toISOString();
  if (entry.status === "not_started") {
    entry.status = "in_progress";
  }
  index.completed_milestones = index.milestones.filter(m => m.status === "complete").length;
  await saveIndex(index);
  log.info(`[RoadmapLoader] Milestone ${milestoneId} claimed by ${instanceId}`);
  return true;
}

/**
 * Release a milestone claim. Called on session end or milestone completion.
 */
export async function releaseMilestone(
  milestoneId: string,
  instanceId: string,
): Promise<void> {
  const index = await loadIndex();
  const entry = index.milestones.find(m => m.id === milestoneId);
  if (!entry) return;
  if (entry.claimed_by === instanceId) {
    entry.claimed_by = undefined;
    entry.claimed_at = undefined;
    await saveIndex(index);
    log.info(`[RoadmapLoader] Milestone ${milestoneId} released by ${instanceId}`);
  }
}

/**
 * Heartbeat: update claimed_at timestamp to prevent stale reaping.
 */
export async function heartbeatMilestone(
  milestoneId: string,
  instanceId: string,
): Promise<void> {
  const index = await loadIndex();
  const entry = index.milestones.find(m => m.id === milestoneId);
  if (!entry || entry.claimed_by !== instanceId) return;
  entry.claimed_at = new Date().toISOString();
  await saveIndex(index);
}

/**
 * Get all milestones claimed by a specific instance.
 */
export async function getClaimedByInstance(instanceId: string): Promise<string[]> {
  const index = await loadIndex();
  return index.milestones
    .filter(m => m.claimed_by === instanceId)
    .map(m => m.id);
}

/**
 * Get the next available (unclaimed, unblocked) milestones for claiming.
 */
export async function getAvailableMilestones(limit: number = 5): Promise<MilestoneEntry[]> {
  const index = await loadIndex();
  const completedIds = new Set(index.milestones.filter(m => m.status === "complete").map(m => m.id));

  return index.milestones
    .filter(m => {
      if (m.status === "complete") return false;
      if (m.claimed_by) {
        // Check staleness
        if (m.claimed_at) {
          const age = Date.now() - new Date(m.claimed_at).getTime();
          if (age < STALE_CLAIM_MS) return false;
        }
      }
      // Check dependencies resolved
      const deps = m.dependencies || [];
      return deps.every(d => completedIds.has(d));
    })
    .slice(0, limit);
}

/**
 * Reap all stale claims across the entire roadmap index.
 */
export async function reapStaleClaims(): Promise<string[]> {
  const index = await loadIndex();
  const reaped: string[] = [];
  const now = Date.now();

  for (const m of index.milestones) {
    if (m.claimed_by && m.claimed_at) {
      const age = now - new Date(m.claimed_at).getTime();
      if (age >= STALE_CLAIM_MS) {
        log.info(`[RoadmapLoader] Reaping stale claim: ${m.id} from ${m.claimed_by} (${Math.round(age / 60000)}min old)`);
        reaped.push(`${m.id} (was: ${m.claimed_by})`);
        m.claimed_by = undefined;
        m.claimed_at = undefined;
      }
    }
  }

  if (reaped.length > 0) await saveIndex(index);
  return reaped;
}

// ── Multi-Claude Coordination ────────────────────────────────────

import * as TaskClaimService from "./TaskClaimService.js";
import type { RoadmapRegistry } from "../schemas/coordinationTypes.js";

const REGISTRY_PATH = path.join(DATA_BASE, "roadmap-registry.json");

/**
 * Load claimed unit IDs for a milestone (delegates to TaskClaimService).
 */
export async function loadClaimedIds(milestoneId: string): Promise<Set<string>> {
  return TaskClaimService.getClaimedUnitIds(milestoneId);
}

/**
 * Load the roadmap registry (categories, priorities).
 */
export async function loadRegistry(): Promise<RoadmapRegistry> {
  try {
    return await readJsonFile<RoadmapRegistry>(REGISTRY_PATH);
  } catch {
    return { version: "1.0.0", roadmaps: [], updated_at: new Date().toISOString() };
  }
}

/**
 * Save the roadmap registry.
 */
export async function saveRegistry(registry: RoadmapRegistry): Promise<void> {
  registry.updated_at = new Date().toISOString();
  await writeJsonFile(REGISTRY_PATH, registry);
}

/**
 * Auto-register a milestone into the roadmap registry.
 * If a roadmap entry with matching title exists, adds the milestone ID.
 * Otherwise creates a new entry. Idempotent — won't duplicate IDs.
 */
export async function registerInRegistry(
  milestoneId: string,
  opts: {
    roadmapTitle?: string;
    category?: "main" | "secondary" | "archived";
    priority?: number;
  } = {},
): Promise<void> {
  const registry = await loadRegistry();
  const title = opts.roadmapTitle || milestoneId.replace(/-MS\d+$/, "");
  const category = opts.category || "main";
  const priority = opts.priority || (category === "main" ? 1 : 10);

  // Find existing entry by title or create new one
  let entry = registry.roadmaps.find(r => r.title === title);
  if (!entry) {
    entry = {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title,
      category,
      priority,
      milestone_ids: [],
      created_at: new Date().toISOString(),
    };
    registry.roadmaps.push(entry);
  }

  // Add milestone ID if not already present
  if (!entry.milestone_ids.includes(milestoneId)) {
    entry.milestone_ids.push(milestoneId);
    entry.updated_at = new Date().toISOString();
  }

  // Update category/priority if explicitly provided
  if (opts.category) entry.category = opts.category;
  if (opts.priority) entry.priority = opts.priority;

  await saveRegistry(registry);
  log.info(`[RoadmapLoader] Registered ${milestoneId} in registry under "${title}" (${category})`);
}

// ── Cache Control ────────────────────────────────────────────────

export function clearRoadmapCache(): void {
  envelopeCache.clear();
  indexCache = null;
}
