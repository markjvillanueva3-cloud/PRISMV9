/**
 * PRISM Multi-Claude Coordination — Type Schemas
 *
 * Zod schemas for task claiming, instance tracking, inter-instance
 * messaging, and roadmap registry categorization.
 *
 * @module schemas/coordinationTypes
 */

import { z } from "zod";

// ── Claim Record ─────────────────────────────────────────────────

export const ClaimRecord = z.object({
  milestone_id: z.string().min(1),
  unit_id: z.string().min(1),
  instance_id: z.string().min(1),
  worktree: z.string().optional(),
  claimed_at: z.string(),
  heartbeat_at: z.string(),
});
export type ClaimRecord = z.infer<typeof ClaimRecord>;

// ── Instance Record ──────────────────────────────────────────────

export const InstanceRecord = z.object({
  instance_id: z.string().min(1),
  worktree: z.string().min(1),
  branch: z.string().optional(),
  started_at: z.string(),
  heartbeat_at: z.string(),
  current_milestone: z.string().optional(),
  current_unit: z.string().optional(),
  status: z.enum(["idle", "working", "blocked", "offline"]).default("idle"),
});
export type InstanceRecord = z.infer<typeof InstanceRecord>;

// ── Coordination Message ─────────────────────────────────────────

export const CoordinationMessage = z.object({
  id: z.string().min(1),
  from_instance: z.string().min(1),
  milestone_id: z.string().min(1),
  type: z.enum(["progress", "blocker", "result", "claim", "release", "heartbeat"]),
  unit_id: z.string().optional(),
  content: z.string().min(1),
  timestamp: z.string(),
});
export type CoordinationMessage = z.infer<typeof CoordinationMessage>;

// ── Roadmap Registry ─────────────────────────────────────────────

export const RoadmapCategory = z.enum(["main", "secondary", "archived"]);
export type RoadmapCategory = z.infer<typeof RoadmapCategory>;

export const RoadmapRegistryEntry = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: RoadmapCategory,
  priority: z.number().int().default(10),
  milestone_ids: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string().optional(),
});
export type RoadmapRegistryEntry = z.infer<typeof RoadmapRegistryEntry>;

export const RoadmapRegistry = z.object({
  version: z.string().default("1.0.0"),
  roadmaps: z.array(RoadmapRegistryEntry),
  updated_at: z.string(),
});
export type RoadmapRegistry = z.infer<typeof RoadmapRegistry>;
