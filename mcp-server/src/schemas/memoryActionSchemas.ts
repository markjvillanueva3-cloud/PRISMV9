/**
 * Zod action schemas for prism_memory dispatcher (11 actions)
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

const record_session_end = z.object({
  session_id: z.string().optional().describe("Optional session id for telemetry; engine does not require it"),
  auto_consolidate: z.boolean().optional().describe("If true (default), auto-runs consolidate() when N>=5"),
}).passthrough();

const consolidation_patterns = z.object({
  limit: z.number().optional().describe("Max patterns to return (default: 50)"),
}).passthrough();


const MEMORY_KIND_VALUES = [
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
] as const;


const remember = z.object({
  kind: z.enum(MEMORY_KIND_VALUES).describe("Memory kind/collection"),
  id: z.union([z.string(), z.number()]).describe("Stable id (use file path or hash)"),
  text: z.string().min(1).max(32768).describe("Text to embed and store"),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Extra payload (source, tags, etc)"),
}).passthrough();
const semantic_search = z.object({
  query: z.string().min(1).describe("Free-text query embedded via Ollama nomic-embed-text"),
  kind: z.enum(MEMORY_KIND_VALUES).optional().describe("Memory kind to search; defaults to note"),
  limit: z.number().int().positive().max(100).optional().describe("Max results (default: 10, max 100)"),
  threshold: z.number().min(0).max(1).optional().describe("Minimum similarity score 0-1; below dropped"),
  filter: z.record(z.string(), z.unknown()).optional().describe("Optional Qdrant payload filter"),
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
  record_session_end,
  semantic_search,
  remember,
};
