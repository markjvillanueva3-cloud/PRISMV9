/**
 * unifiedErrorLedger.ts — Zod schema for UNIFIED_ERROR_LEDGER entries
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P2-U01.
 *
 * Single source of truth for every error captured across the system.
 * Replaces the four legacy silos (ERROR_LEARN_LEDGER.jsonl,
 * error-memory.json, ~/.claude/learning/error-recovery.json,
 * session-learning-log.jsonl) with a unified JSONL ledger plus a
 * provenance-tagged source field so downstream consumers (prewarn,
 * vector recall, learner) can stay aware of capture origin.
 *
 * Schema:
 *   id            — stable hash or uuid
 *   ts            — ISO 8601 timestamp
 *   source        — one of: hook_block | pattern_memory | recovery |
 *                   session | learner
 *   tool          — best-effort tool/action that triggered the error
 *                   (e.g. "Edit", "prism_calc:cutting_force")
 *   context       — free-form payload (file paths, line numbers, etc.)
 *   signature     — short normalized signature used for embedding /
 *                   dedup (typically error class + first line of message)
 *   embedding_id  — Qdrant point id once embedded; null until then
 */

import { z } from "zod";

export const ERROR_LEDGER_SOURCE_VALUES = [
  "hook_block",
  "pattern_memory",
  "recovery",
  "session",
  "learner",
] as const;

export type ErrorLedgerSource = (typeof ERROR_LEDGER_SOURCE_VALUES)[number];

export const unifiedErrorLedgerEntrySchema = z.object({
  id: z.string().min(1).describe("Stable id (hash or uuid)"),
  ts: z.string().min(1).describe("ISO 8601 timestamp of capture"),
  source: z.enum(ERROR_LEDGER_SOURCE_VALUES).describe("Capture origin"),
  tool: z.string().optional().describe("Tool/action that triggered the error"),
  context: z.record(z.string(), z.unknown()).optional().describe("Free-form payload"),
  signature: z.string().min(1).describe("Normalized signature for dedup/embedding"),
  embedding_id: z.union([z.string(), z.null()]).optional().describe("Qdrant point id once embedded"),
}).passthrough();

export type UnifiedErrorLedgerEntry = z.infer<typeof unifiedErrorLedgerEntrySchema>;

/**
 * Build a normalized signature from an error class + message. Trims
 * whitespace, drops absolute paths, and caps at 240 chars so embeddings
 * stay short.
 */
export function buildErrorSignature(input: { errorClass?: string; message?: string; tool?: string }): string {
  const cls = (input.errorClass ?? "").trim();
  const msg = (input.message ?? "").trim().split(/\r?\n/)[0]?.trim() ?? "";
  const tool = (input.tool ?? "").trim();
  const dropPaths = (s: string) => s.replace(/[A-Z]:[\\/][^\s"']+/g, "<path>");
  const head = [tool, cls, msg].filter(Boolean).join(" :: ");
  return dropPaths(head).slice(0, 240) || "unknown-error";
}
