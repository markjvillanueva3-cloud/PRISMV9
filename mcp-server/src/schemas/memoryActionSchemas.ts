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

// OBSIDIAN-INTELLIGENCE-MS3/B1/U-DAILY-CONTEXT-WORKFLOW — morning brief from
// yesterday's daily note + active projects + inbox. Optional Ollama summarisation.
const daily_context_get = z.object({
  vault_root: z.string().optional().describe("Override vault root (defaults to knowledge/memories)"),
  vaultRoot: z.string().optional().describe("Alias for vault_root"),
  generated_root: z.string().optional().describe("Override generated-output root (defaults to ${vaultRoot}/generated)"),
  generatedRoot: z.string().optional().describe("Alias for generated_root"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic windowing"),
  max_projects: z.number().int().min(1).max(50).optional().describe("Cap on project files included; default 5"),
  maxProjects: z.number().int().min(1).max(50).optional().describe("Alias for max_projects"),
  max_inbox: z.number().int().min(0).max(100).optional().describe("Cap on inbox items included; default 10"),
  maxInbox: z.number().int().min(0).max(100).optional().describe("Alias for max_inbox"),
  project_window_ms: z.number().int().optional().describe("Project mtime window in ms; default 30d"),
  projectWindowMs: z.number().int().optional().describe("Alias for project_window_ms"),
  excerpt_bytes: z.number().int().min(256).max(65536).optional().describe("Max bytes per source excerpt; default 4096"),
  excerptBytes: z.number().int().min(256).max(65536).optional().describe("Alias for excerpt_bytes"),
  write: z.boolean().optional().describe("Write the brief to disk (default false; cron uses true)"),
  ollama_model: z.string().optional().describe("Ollama model when client is reachable; default qwen2.5-coder"),
  ollamaModel: z.string().optional().describe("Alias for ollama_model"),
}).passthrough();

// OBSIDIAN-INTELLIGENCE-MS3/B4/U-WEEKLY-SYNTHESIS — Sunday 8 PM retro reading
// last 7 DAILY-CONTEXT files; emits 4-section retro (moved / didn't move /
// emerging patterns / top-3 leverage). Optional Ollama summarisation.
const weekly_synthesis_get = z.object({
  vault_root: z.string().optional().describe("Override vault root (defaults to knowledge/memories)"),
  vaultRoot: z.string().optional().describe("Alias for vault_root"),
  generated_root: z.string().optional().describe("Override generated-output root (defaults to ${vaultRoot}/generated)"),
  generatedRoot: z.string().optional().describe("Alias for generated_root"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic windowing"),
  max_dailies: z.number().int().min(1).max(31).optional().describe("Cap on daily files included; default 7"),
  maxDailies: z.number().int().min(1).max(31).optional().describe("Alias for max_dailies"),
  window_days: z.number().int().min(1).max(31).optional().describe("Window length in days; default 7"),
  windowDays: z.number().int().min(1).max(31).optional().describe("Alias for window_days"),
  excerpt_bytes: z.number().int().min(512).max(131072).optional().describe("Max bytes per source excerpt; default 8192"),
  excerptBytes: z.number().int().min(512).max(131072).optional().describe("Alias for excerpt_bytes"),
  write: z.boolean().optional().describe("Write the retro to disk (default false; cron uses true)"),
  ollama_model: z.string().optional().describe("Ollama model when client is reachable; default qwen2.5-coder"),
  ollamaModel: z.string().optional().describe("Alias for ollama_model"),
}).passthrough();

// OBSIDIAN-INTELLIGENCE-MS3/B3/U-QUEUE-PROCESSOR — queue watcher + classifier.
// scanQueue is the read-only manifest pass; processQueue is the side-effecting
// drain (writes OUT-X.md + .processed/<src> + .claude-queue/<src>.flag.json).
const queue_processor_scan = z.object({
  queue_root: z.string().min(1).optional().describe("Override queue root (defaults to ${vaultRoot}/queue)"),
  queueRoot: z.string().min(1).optional().describe("Alias for queue_root"),
  generated_root: z.string().optional().describe("Override generated-output root"),
  generatedRoot: z.string().optional().describe("Alias for generated_root"),
  processed_root: z.string().optional().describe("Override .processed/ archive directory"),
  processedRoot: z.string().optional().describe("Alias for processed_root"),
  claude_queue_root: z.string().optional().describe("Override .claude-queue/ flag directory"),
  claudeQueueRoot: z.string().optional().describe("Alias for claude_queue_root"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic windowing"),
  max_files_per_pass: z.number().int().min(1).max(200).optional().describe("Cap on entries per scan; default 20"),
  maxFilesPerPass: z.number().int().min(1).max(200).optional().describe("Alias for max_files_per_pass"),
  token_cap_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes threshold for Ollama-vs-Claude routing; default 8192"),
  tokenCapBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for token_cap_bytes"),
  max_file_bytes: z.number().int().min(512).max(4194304).optional().describe("Max file bytes accepted; default 65536 (above → rejected)"),
  maxFileBytes: z.number().int().min(512).max(4194304).optional().describe("Alias for max_file_bytes"),
  excerpt_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes read per file into excerpt; default 8192"),
  excerptBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for excerpt_bytes"),
}).passthrough();

const queue_processor_process = z.object({
  queue_root: z.string().optional().describe("Override queue root"),
  queueRoot: z.string().optional().describe("Alias for queue_root"),
  generated_root: z.string().optional().describe("Override generated-output root"),
  generatedRoot: z.string().optional().describe("Alias for generated_root"),
  processed_root: z.string().optional().describe("Override .processed/ archive directory"),
  processedRoot: z.string().optional().describe("Alias for processed_root"),
  claude_queue_root: z.string().optional().describe("Override .claude-queue/ flag directory"),
  claudeQueueRoot: z.string().optional().describe("Alias for claude_queue_root"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic windowing"),
  max_files_per_pass: z.number().int().min(1).max(200).optional().describe("Cap on entries per pass; default 20"),
  maxFilesPerPass: z.number().int().min(1).max(200).optional().describe("Alias for max_files_per_pass"),
  token_cap_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes threshold for Ollama-vs-Claude routing; default 8192"),
  tokenCapBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for token_cap_bytes"),
  max_file_bytes: z.number().int().min(512).max(4194304).optional().describe("Max file bytes accepted; default 65536"),
  maxFileBytes: z.number().int().min(512).max(4194304).optional().describe("Alias for max_file_bytes"),
  excerpt_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes read per file into excerpt; default 8192"),
  excerptBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for excerpt_bytes"),
  ollama_model: z.string().optional().describe("Ollama model when client is reachable; default qwen2.5-coder"),
  ollamaModel: z.string().optional().describe("Alias for ollama_model"),
  dry_run: z.boolean().optional().describe("Skip writes; report would-be routes as 'skipped'"),
  dryRun: z.boolean().optional().describe("Alias for dry_run"),
  mkdir_if_missing: z.boolean().optional().describe("Create output dirs if missing; default true"),
  mkdirIfMissing: z.boolean().optional().describe("Alias for mkdir_if_missing"),
}).passthrough();

// OBSIDIAN-INTELLIGENCE-MS3/B5/U-PROJECT-AUTO-UPDATER — project subfolder
// watcher; keeps each project's overview.md "## Recent Changes" current.
// scan = read-only manifest; process = side-effecting atomic overview patch.
const project_auto_updater_scan = z.object({
  vault_root: z.string().min(1).optional().describe("Override vault root (defaults to knowledge/memories)"),
  vaultRoot: z.string().min(1).optional().describe("Alias for vault_root"),
  project_root: z.string().min(1).optional().describe("Override project root (defaults to ${vaultRoot}/project)"),
  projectRoot: z.string().min(1).optional().describe("Alias for project_root"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic windowing"),
  max_projects_per_pass: z.number().int().min(1).max(200).optional().describe("Cap on project folders per pass; default 25"),
  maxProjectsPerPass: z.number().int().min(1).max(200).optional().describe("Alias for max_projects_per_pass"),
  token_cap_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes threshold for Ollama-vs-literal; default 8192"),
  tokenCapBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for token_cap_bytes"),
  max_file_bytes: z.number().int().min(512).max(4194304).optional().describe("Max source bytes accepted; default 65536"),
  maxFileBytes: z.number().int().min(512).max(4194304).optional().describe("Alias for max_file_bytes"),
  excerpt_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes read per source; default 8192"),
  excerptBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for excerpt_bytes"),
}).passthrough();

const project_auto_updater_process = z.object({
  vault_root: z.string().min(1).optional().describe("Override vault root"),
  vaultRoot: z.string().min(1).optional().describe("Alias for vault_root"),
  project_root: z.string().min(1).optional().describe("Override project root"),
  projectRoot: z.string().min(1).optional().describe("Alias for project_root"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic windowing"),
  max_projects_per_pass: z.number().int().min(1).max(200).optional().describe("Cap on project folders per pass; default 25"),
  maxProjectsPerPass: z.number().int().min(1).max(200).optional().describe("Alias for max_projects_per_pass"),
  token_cap_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes threshold for Ollama-vs-literal; default 8192"),
  tokenCapBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for token_cap_bytes"),
  max_file_bytes: z.number().int().min(512).max(4194304).optional().describe("Max source bytes accepted; default 65536"),
  maxFileBytes: z.number().int().min(512).max(4194304).optional().describe("Alias for max_file_bytes"),
  excerpt_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes read per source; default 8192"),
  excerptBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for excerpt_bytes"),
  ollama_model: z.string().optional().describe("Ollama model when client is reachable; default qwen2.5-coder"),
  ollamaModel: z.string().optional().describe("Alias for ollama_model"),
  dry_run: z.boolean().optional().describe("Skip writes; report would-be routes as 'skipped'"),
  dryRun: z.boolean().optional().describe("Alias for dry_run"),
  mkdir_if_missing: z.boolean().optional().describe("Create project dir if missing; default true"),
  mkdirIfMissing: z.boolean().optional().describe("Alias for mkdir_if_missing"),
}).passthrough();

// OBSIDIAN-INTELLIGENCE-MS3/B6/U-KNOWLEDGE-DISTILLATION — monthly distill of
// resources/ + areas/ notes into per-topic DISTILL-<topic>-YYYY-MM.md refs.
// scan = read-only cluster manifest; run = side-effecting atomic per-topic write.
const knowledge_distillation_scan = z.object({
  vault_root: z.string().min(1).optional().describe("Override vault root (defaults to knowledge/memories)"),
  vaultRoot: z.string().min(1).optional().describe("Alias for vault_root"),
  corpus_roots: z.array(z.string().min(1)).optional().describe("Override corpus roots (default resources/ + areas/)"),
  corpusRoots: z.array(z.string().min(1)).optional().describe("Alias for corpus_roots"),
  references_root: z.string().min(1).optional().describe("Override references output root"),
  referencesRoot: z.string().min(1).optional().describe("Alias for references_root"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic windowing"),
  window_days: z.number().int().min(1).max(366).optional().describe("Lookback window in days; default 30"),
  windowDays: z.number().int().min(1).max(366).optional().describe("Alias for window_days"),
  max_notes_per_cluster: z.number().int().min(1).max(500).optional().describe("Cap notes per topic cluster; default 40"),
  maxNotesPerCluster: z.number().int().min(1).max(500).optional().describe("Alias for max_notes_per_cluster"),
  min_cluster_size: z.number().int().min(1).max(100).optional().describe("Min notes to distill a topic; default 2"),
  minClusterSize: z.number().int().min(1).max(100).optional().describe("Alias for min_cluster_size"),
  token_cap_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes threshold Ollama-vs-literal; default 16384"),
  tokenCapBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for token_cap_bytes"),
  max_file_bytes: z.number().int().min(512).max(4194304).optional().describe("Max source bytes accepted; default 65536"),
  maxFileBytes: z.number().int().min(512).max(4194304).optional().describe("Alias for max_file_bytes"),
  excerpt_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes read per source; default 4096"),
  excerptBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for excerpt_bytes"),
}).passthrough();

const knowledge_distillation_run = z.object({
  vault_root: z.string().min(1).optional().describe("Override vault root"),
  vaultRoot: z.string().min(1).optional().describe("Alias for vault_root"),
  corpus_roots: z.array(z.string().min(1)).optional().describe("Override corpus roots"),
  corpusRoots: z.array(z.string().min(1)).optional().describe("Alias for corpus_roots"),
  references_root: z.string().min(1).optional().describe("Override references output root"),
  referencesRoot: z.string().min(1).optional().describe("Alias for references_root"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic windowing"),
  window_days: z.number().int().min(1).max(366).optional().describe("Lookback window in days; default 30"),
  windowDays: z.number().int().min(1).max(366).optional().describe("Alias for window_days"),
  max_notes_per_cluster: z.number().int().min(1).max(500).optional().describe("Cap notes per topic cluster; default 40"),
  maxNotesPerCluster: z.number().int().min(1).max(500).optional().describe("Alias for max_notes_per_cluster"),
  min_cluster_size: z.number().int().min(1).max(100).optional().describe("Min notes to distill a topic; default 2"),
  minClusterSize: z.number().int().min(1).max(100).optional().describe("Alias for min_cluster_size"),
  token_cap_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes threshold Ollama-vs-literal; default 16384"),
  tokenCapBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for token_cap_bytes"),
  max_file_bytes: z.number().int().min(512).max(4194304).optional().describe("Max source bytes accepted; default 65536"),
  maxFileBytes: z.number().int().min(512).max(4194304).optional().describe("Alias for max_file_bytes"),
  excerpt_bytes: z.number().int().min(256).max(1048576).optional().describe("Bytes read per source; default 4096"),
  excerptBytes: z.number().int().min(256).max(1048576).optional().describe("Alias for excerpt_bytes"),
  ollama_model: z.string().optional().describe("Ollama model when client is reachable; default qwen2.5-coder"),
  ollamaModel: z.string().optional().describe("Alias for ollama_model"),
  dry_run: z.boolean().optional().describe("Skip writes; report would-be clusters as 'skipped'"),
  dryRun: z.boolean().optional().describe("Alias for dry_run"),
  mkdir_if_missing: z.boolean().optional().describe("Create references dir if missing; default true"),
  mkdirIfMissing: z.boolean().optional().describe("Alias for mkdir_if_missing"),
}).passthrough();

// OBSIDIAN-INTELLIGENCE-MS3/D5/U-CONTEXT-EVAL-GATE — retrieved-context-vs-
// golden coverage scorer. Advisory: returns a PASS/WARN/FAIL/NO_MATCH verdict
// + missing tokens/files so a caller / the post-memory-context-eval
// PostToolUse hook can surface gaps in the just-retrieved context.
const context_eval_score = z.object({
  query: z.string().min(1).describe("The agent's query / task description to match against the golden set"),
  retrieved_context: z.string().optional().describe("The context string the agent is about to act on"),
  retrievedContext: z.string().optional().describe("Alias for retrieved_context"),
  golden_path: z.string().min(1).optional().describe("Override golden-set path (default state/shared/context-eval-golden.json)"),
  goldenPath: z.string().min(1).optional().describe("Alias for golden_path"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic timestamps"),
  threshold: z.number().min(0).max(1).optional().describe("PASS threshold 0..1 (default 0.8)"),
  floor: z.number().min(0).max(1).optional().describe("WARN/FAIL boundary 0..1 (default 0.5)"),
  token_weight: z.number().min(0).max(1).optional().describe("Token-vs-file coverage weight (default 0.7)"),
  tokenWeight: z.number().min(0).max(1).optional().describe("Alias for token_weight"),
  min_match_score: z.number().min(0).max(1).optional().describe("Min query-Jaccard to match a golden entry (default 0.15)"),
  minMatchScore: z.number().min(0).max(1).optional().describe("Alias for min_match_score"),
  max_golden_bytes: z.number().int().min(256).max(16777216).optional().describe("Max bytes read from golden file (default 1048576)"),
  maxGoldenBytes: z.number().int().min(256).max(16777216).optional().describe("Alias for max_golden_bytes"),
}).passthrough();

// OBSIDIAN-INTELLIGENCE-MS3/E2/U-IDEABLOCK-DEDUP — iterative cosine-similarity
// dedup over IdeaBlock embeddings. blocks are validated per-item by the engine
// (IdeaBlockSchema); invalid blocks are dropped fail-loud. embed DI is NOT a
// dispatcher param (functions can't cross the MCP boundary) — the dispatcher
// path uses the deterministic fallback embedder.
const ideablock_dedup = z.object({
  blocks: z.array(z.unknown()).describe("IdeaBlocks to dedup (each validated by IdeaBlockSchema in the engine; invalid ones dropped with a warning)"),
  threshold: z.number().min(0).max(1).optional().describe("Cosine duplicate threshold 0..1 (default 0.82)"),
  max_rounds: z.number().int().min(1).max(20).optional().describe("Max clustering rounds 1..20 (default 4)"),
  maxRounds: z.number().int().min(1).max(20).optional().describe("Alias for max_rounds"),
  max_blocks: z.number().int().min(1).max(50000).optional().describe("Hard cap on input blocks (default 5000)"),
  maxBlocks: z.number().int().min(1).max(50000).optional().describe("Alias for max_blocks"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic timestamps"),
}).passthrough();

// OBSIDIAN-INTELLIGENCE-MS3/E3/U-IDEABLOCK-RAG-ENGINE — IdeaBlock-level
// retrieval: rank IdeaBlocks by cosine to the query, return top-K with
// answer + source link. blocks validated per-item by the engine
// (IdeaBlockSchema); invalid ones dropped fail-loud. embed DI is NOT a
// dispatcher param (functions can't cross MCP) — uses the fallback embedder.
const ideablock_rag_retrieve = z.object({
  query: z.string().min(1).describe("Free-text query to rank IdeaBlocks against"),
  blocks: z.array(z.unknown()).describe("Candidate IdeaBlocks (each validated by IdeaBlockSchema; invalid dropped with a warning)"),
  top_k: z.number().int().min(1).max(200).optional().describe("Max results 1..200 (default 5)"),
  topK: z.number().int().min(1).max(200).optional().describe("Alias for top_k"),
  min_score: z.number().min(-1).max(1).optional().describe("Drop results below this cosine (default 0)"),
  minScore: z.number().min(-1).max(1).optional().describe("Alias for min_score"),
  now: z.number().finite().optional().describe("Override 'now' ms epoch for deterministic timestamps"),
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

// WIRE-UNWIRED-MS0/U-WIRE-MEMSYNC: MemorySyncEngine read-only bundle inspection
const memory_sync_list_bundles = z.object({
  dir: z.string().min(1).describe("Directory path to scan for .qdrant-bundle files."),
}).passthrough().describe("List MemorySync bundles in a directory (read-only; no Qdrant connection).");

const memory_sync_bundle_metadata = z.object({
  src_path: z.string().min(1).optional().describe("Path to a bundle file."),
  srcPath: z.string().min(1).optional().describe("Alias for src_path (camelCase compat)."),
}).passthrough().refine(
  (d) => (typeof d.src_path === "string" && d.src_path.length > 0) || (typeof d.srcPath === "string" && d.srcPath.length > 0),
  { message: "memory_sync_bundle_metadata requires non-empty 'src_path' (or 'srcPath')" },
).describe("Read metadata for a single MemorySync bundle file (no Qdrant connection).");

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
  daily_context_get,
  weekly_synthesis_get,
  queue_processor_scan,
  queue_processor_process,
  project_auto_updater_scan,
  project_auto_updater_process,
  knowledge_distillation_scan,
  knowledge_distillation_run,
  context_eval_score,
  ideablock_dedup,
  ideablock_rag_retrieve,
  contradiction_check,
  postmortem_create,
  performance_report,
  connections_materialize,
  content_brief_create,
  voice_validate,
  capture_sharpen,
  // WIRE-UNWIRED-MS0/U-WIRE-MEMSYNC
  memory_sync_list_bundles,
  memory_sync_bundle_metadata,
};
