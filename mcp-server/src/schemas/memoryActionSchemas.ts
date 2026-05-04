/**
 * Zod action schemas for prism_memory dispatcher (6 actions)
 *
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const get_health = z.object({}).passthrough();

const trace_decision = z.object({
  node_id: z.string().optional().describe("Node ID to trace from"),
  nodeId: z.string().optional().describe("Alias for node_id"),
  depth: z.number().optional().describe("Trace depth (default: 3)"),
  direction: z.enum(["forward", "backward", "both"]).optional().describe("Trace direction (default: both)"),
}).passthrough();

const find_similar = z.object({
  dispatcher: z.string().optional().describe("Filter by dispatcher name"),
  action: z.string().optional().describe("Filter by action name"),
  error_class: z.string().optional().describe("Filter by error class"),
  errorClass: z.string().optional().describe("Alias for error_class"),
  node_type: z.string().optional().describe("Filter by node type"),
  nodeType: z.string().optional().describe("Alias for node_type"),
  limit: z.number().optional().describe("Max results (default: 10)"),
  min_confidence: z.number().optional().describe("Minimum confidence threshold"),
}).passthrough();

const get_session = z.object({
  session_id: z.string().optional().describe("Session ID to retrieve"),
  sessionId: z.string().optional().describe("Alias for session_id"),
}).passthrough();

const get_node = z.object({
  node_id: z.string().optional().describe("Node ID to retrieve"),
  nodeId: z.string().optional().describe("Alias for node_id"),
  id: z.string().optional().describe("Alias for node_id"),
}).passthrough();

const run_integrity = z.object({}).passthrough();

const consolidate = z.object({}).passthrough();

const consolidation_stats = z.object({}).passthrough();

const consolidation_patterns = z.object({
  limit: z.number().optional().describe("Max patterns to return (default: 50)"),
}).passthrough();

// CPP-MS2 U-CPP15: MemoryPressureMonitorEngine wiring
const pressure_record = z.object({
  nowIso: z.string().optional().describe("Optional ISO timestamp to stamp the sample (default: now)"),
}).passthrough();

const pressure_get = z.object({
  n: z.number().int().min(1).max(100).optional().describe("How many recent samples to return (default: 10)"),
}).passthrough();

const pressure_recommend = z.object({}).passthrough().describe("Return current heap reading + trend + action recommendation");

// INTEL-OLLAMA-OBSIDIAN-MS0/P0-U02: vector-similarity recall over QdrantMemoryEngine.
// Kinds mirror QdrantMemoryEngine.MEMORY_KINDS at the source-of-truth in
// src/engines/QdrantMemoryEngine.ts — keep these in sync if that constant grows.
const SEMANTIC_KIND_VALUES = [
  "program",
  "outcome",
  "tip",
  "formula",
  "rule",
  "playbook",
  "note",
  "error",
  "skill",
  "engine",
  "action",
  "gsd",
  "directive",
  "wiki",
] as const;

const semantic_search = z.object({
  query: z.string().min(1).describe("Free-text query to embed and match against the kind's collection"),
  kind: z.enum(SEMANTIC_KIND_VALUES).optional().describe("Memory collection to search (default: tip)"),
  limit: z.number().int().min(1).max(100).optional().describe("Max hits to return (default: 5, hard ceiling: 100)"),
  threshold: z.number().min(0).max(1).optional().describe("Cosine-similarity floor; hits below are filtered (default: 0)"),
  filter: z.record(z.string(), z.unknown()).optional().describe("Optional Qdrant payload filter (forwarded as-is to QdrantMemoryEngine.recall)"),
}).passthrough();

// INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01: writes to QdrantMemoryEngine.remember.
// Mirrors the dispatcher's hand-rolled validation in memoryDispatcher.ts so
// schema audit (P8 phase) sees coverage parity with semantic_search.
const remember = z.object({
  kind: z.enum(SEMANTIC_KIND_VALUES).describe("Memory kind / Qdrant collection (must match a registered MEMORY_KIND)"),
  id: z.union([z.string(), z.number()]).describe("Stable record id (path, hash, or numeric)"),
  text: z.string().min(1).max(32768).describe("Text to embed and store (max 32KB to keep embedding bounded)"),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Extra payload — source, tags, indexed_at, etc."),
}).passthrough();

export const ACTION_MEMORY_SCHEMAS: ActionSchemaMap = {
  get_health,
  trace_decision,
  find_similar,
  get_session,
  get_node,
  run_integrity,
  consolidate,
  consolidation_stats,
  consolidation_patterns,
  pressure_record,
  pressure_get,
  pressure_recommend,
  semantic_search,
  remember,
};
