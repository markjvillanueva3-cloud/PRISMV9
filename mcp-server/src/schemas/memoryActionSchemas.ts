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
  "gsd",
  "directive",
  "wiki",
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

// TOOL-INVENTORY-MS0/U-TOOLINV-01 — qdrant MCP exposure surface.
// `collection` is a free string (the surface resolves bare `<kind>` OR
// `prism_memory_<kind>` → MemoryKind itself, returning UNKNOWN_COLLECTION
// for anything not in MEMORY_KINDS). We do NOT pin it to the kind enum here
// so the standard qdrant MCP wire format (collection-string) passes through.
const qdrant_vector_search = z.object({
  collection: z.string().min(1).describe("Memory collection: bare kind ('tip') or 'prism_memory_<kind>'"),
  query: z.string().min(1).describe("Free-text query embedded via Ollama nomic-embed-text"),
  limit: z.number().int().positive().max(100).optional().describe("Max hits (default: 10, max 100)"),
  filter: z.record(z.string(), z.unknown()).optional().describe("Optional Qdrant payload filter (plain object)"),
}).passthrough();

const qdrant_vector_upsert = z.object({
  collection: z.string().min(1).describe("Memory collection: bare kind ('tip') or 'prism_memory_<kind>'"),
  id: z.union([z.string(), z.number()]).describe("Stable point id (string or finite number)"),
  text: z.string().min(1).max(32768).describe("Text to embed + store (max 32768 chars)"),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Extra payload (plain object)"),
}).passthrough();

// OBSIDIAN-COMPOUND-MS1/S2/U-EMERGING-THESIS — TF-IDF synthesis over vault.
const emerging_thesis = z.object({
  window: z.enum(["24h", "7d", "30d"]).optional().describe("Time window over vault mtime; default 7d"),
  vault_root: z.string().optional().describe("Override vault root (defaults to knowledge/memories)"),
  vaultRoot: z.string().optional().describe("Alias for vault_root"),
  max_files: z.number().int().positive().max(20000).optional().describe("Cap files scanned"),
  maxFiles: z.number().int().positive().max(20000).optional().describe("Alias for max_files"),
}).passthrough();

// OBSIDIAN-COMPOUND-MS1/S2/U-DAILY-PERSONAL-BRIEF — cyrilXBT daily brief synth.
const daily_brief_get = z.object({
  vault_root: z.string().optional().describe("Override vault root (defaults to knowledge/memories)"),
  vaultRoot: z.string().optional().describe("Alias for vault_root"),
  wiki_root: z.string().optional().describe("Override wiki root for co-occurrence boost (defaults to knowledge/wiki)"),
  wikiRoot: z.string().optional().describe("Alias for wiki_root"),
  threshold: z.number().min(0).max(1).optional().describe("Cosine similarity floor for connections; default 0.72"),
  max_connections: z.number().int().positive().max(20).optional().describe("Cap on returned connections; default 3"),
  maxConnections: z.number().int().positive().max(20).optional().describe("Alias for max_connections"),
}).passthrough();

// OBSIDIAN-COMPOUND-MS1/S3/U-CONTRADICTION-DETECTOR — vault disagreement check.
const contradiction_check = z.object({
  new_memory_path: z.string().optional().describe("Absolute path to the new memory file to check"),
  newMemoryPath: z.string().optional().describe("Alias for new_memory_path"),
  vault_root: z.string().optional().describe("Override vault root (defaults to knowledge/memories)"),
  vaultRoot: z.string().optional().describe("Alias for vault_root"),
  max_files: z.number().int().positive().max(20000).optional().describe("Cap on candidate vault files scanned"),
  maxFiles: z.number().int().positive().max(20000).optional().describe("Alias for max_files"),
  top_k: z.number().int().positive().max(50).optional().describe("Top-K most-similar candidates passed to deeper checks; default 5"),
  topK: z.number().int().positive().max(50).optional().describe("Alias for top_k"),
}).passthrough();

// OBSIDIAN-CONTENT-MS2/U-CAPTURE-SHARPEN — raw→punchy capture assessment.
const capture_sharpen = z.object({
  raw: z.string().describe("Raw capture text (single string, may be multi-sentence)"),
  threshold: z.number().min(0).max(1).optional().describe("Acceptance threshold (default 0.7)"),
  content_pillar_hint: z.string().optional().describe("Content pillar to use as tag #1"),
  contentPillarHint: z.string().optional().describe("Alias for content_pillar_hint"),
}).passthrough();

// OBSIDIAN-CONTENT-MS2/U-VOICE-SPEC — voice-rule validator.
const voice_validate = z.object({
  draft: z.string().describe("Full content draft to validate (markdown or plain text)"),
  voice_spec_path: z.string().optional().describe("Override knowledge/voice-spec.md location"),
  voiceSpecPath: z.string().optional().describe("Alias for voice_spec_path"),
}).passthrough();

// OBSIDIAN-CONTENT-MS2/U-CONTENT-BRIEF — cyrilXBT 5-field content brief.
const content_brief_create = z.object({
  one_thing: z.string().optional().describe("Single insight, one sentence max"),
  oneThing: z.string().optional().describe("Alias for one_thing"),
  proof: z.string().optional().describe("Specific number, example, or result"),
  audience: z.string().optional().describe("Audience descriptor (specific, not generic)"),
  reader_before: z.string().optional().describe("What reader believes BEFORE"),
  readerBefore: z.string().optional().describe("Alias for reader_before"),
  reader_after: z.string().optional().describe("What reader knows/believes AFTER"),
  readerAfter: z.string().optional().describe("Alias for reader_after"),
  source_notes: z.array(z.string()).optional().describe("Wiki-link basenames of source notes"),
  sourceNotes: z.array(z.string()).optional().describe("Alias for source_notes"),
  content_pillar: z.string().optional().describe("Pillar tag for downstream PerformanceLoop"),
  contentPillar: z.string().optional().describe("Alias for content_pillar"),
  hook_format_hint: z.string().optional().describe("number / story / question / claim / statistic / contrast"),
  hookFormatHint: z.string().optional().describe("Alias for hook_format_hint"),
  briefs_dir: z.string().optional().describe("Override knowledge/memories/briefs/ directory"),
  briefsDir: z.string().optional().describe("Alias for briefs_dir"),
  apply: z.boolean().optional().describe("If false, dry-run; defaults to true on dispatcher invocation"),
}).passthrough();

// OBSIDIAN-CONTENT-MS2/U-CONNECTIONS-PERSIST — materialize connection notes.
const connections_materialize = z.object({
  connections: z.array(z.object({
    a: z.string(),
    b: z.string(),
    similarity: z.number(),
    boost: z.number(),
    combined: z.number(),
    recency: z.string(),
  }).passthrough()).optional().describe("List of connections (DailyBriefConnection shape)"),
  connections_dir: z.string().optional().describe("Override knowledge/memories/connections/ directory"),
  connectionsDir: z.string().optional().describe("Alias for connections_dir"),
  mode: z.enum(["skip", "update"]).optional().describe("skip (default, preserves existing) or update (rewrites our marker-bearing files)"),
  apply: z.boolean().optional().describe("If false, dry-run; defaults to true on dispatcher invocation"),
}).passthrough();

// OBSIDIAN-CONTENT-MS2/U-PERFORMANCE-LOOP — cyrilXBT JARVIS monthly report.
const performance_report = z.object({
  published_dir: z.string().optional().describe("Override knowledge/memories/published/ directory"),
  publishedDir: z.string().optional().describe("Alias for published_dir"),
  since_iso: z.string().optional().describe("YYYY-MM-DD floor for publish_date filter; default 30d window"),
  sinceIso: z.string().optional().describe("Alias for since_iso"),
  max_files: z.number().int().positive().max(20000).optional().describe("Cap on files scanned"),
  maxFiles: z.number().int().positive().max(20000).optional().describe("Alias for max_files"),
}).passthrough();

// OBSIDIAN-COMPOUND-MS1/S6/U-MEMORIES-MISTAKES-WIRE — auto-postmortem markdown.
const postmortem_create = z.object({
  events: z.array(z.object({
    ts: z.string().describe("ISO8601 timestamp of the stop attempt"),
    uncommitted: z.boolean().describe("Whether the working tree had uncommitted changes at this stop"),
    errorSig: z.string().optional().describe("Optional error signature carried by the stop reason"),
    filesTouched: z.array(z.string()).optional().describe("Files referenced in the failure context"),
  }).passthrough()).optional().describe("Stop event list (rolling window)"),
  recent_commits: z.array(z.string()).optional().describe("Recent commit subjects, most-recent first"),
  recentCommits: z.array(z.string()).optional().describe("Alias for recent_commits"),
  error_description: z.string().optional().describe("Optional human-supplied error description"),
  errorDescription: z.string().optional().describe("Alias for error_description"),
  scrutiny_verdict: z.enum(["PASS", "FAIL", "MISSING"]).optional().describe("Scrutiny gate verdict"),
  scrutinyVerdict: z.enum(["PASS", "FAIL", "MISSING"]).optional().describe("Alias for scrutiny_verdict"),
  mistakes_dir: z.string().optional().describe("Override knowledge/memories/mistakes/ directory"),
  mistakesDir: z.string().optional().describe("Alias for mistakes_dir"),
  apply: z.boolean().optional().describe("If false, dry-run; if absent, defaults to true on dispatcher invocation"),
  mode: z.enum(["create", "update"]).optional().describe("create (default) or update existing postmortem"),
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
  qdrant_vector_search,
  qdrant_vector_upsert,
  emerging_thesis,
  daily_brief_get,
  contradiction_check,
  postmortem_create,
  performance_report,
  connections_materialize,
  content_brief_create,
  voice_validate,
  capture_sharpen,
};
