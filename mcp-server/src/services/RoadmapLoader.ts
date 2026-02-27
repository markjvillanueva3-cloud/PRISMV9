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

// Base directory for roadmap data
const DATA_BASE = path.resolve("C:\\PRISM\\mcp-server\\data");
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
