/**
 * TaskDecomposerEngine — U-HAGI04 auto-decomposition primitives.
 *
 * Pure-core text-pattern detector that converts "do N things" prose prompts
 * into N parallel sub-task descriptors (Kimi 300-agent swarm pattern).
 * Pure: no LLM call, no I/O — deterministic regex + heuristic decomposition.
 * Operator-gated: ambiguous prompts return an explicit `clarification_needed`
 * verdict rather than guessing.
 *
 * @module engines/TaskDecomposerEngine
 */

import { z } from "zod";

export const SubTaskSchema = z.object({
  index: z.number().int().min(0),
  description: z.string().min(1).max(500),
  origin_pattern: z.enum([
    "enumerate-each-of-N",
    "for-each-item",
    "batch-transform",
    "fan-out-collect",
    "literal-list",
    "atomic",
  ]),
});
export type SubTask = z.infer<typeof SubTaskSchema>;

export interface DecompositionResult {
  pattern: SubTask["origin_pattern"] | "clarification-needed" | "atomic";
  subtasks: SubTask[];
  clarification?: string;
  source_prompt: string;
}

const MAX_SUBTASKS_DEFAULT = 100;

// Heuristic patterns ordered by specificity (most specific first).
const ENUMERATE_N_PATTERN = /(?:for\s+each\s+of|each\s+of|enumerate)\s+(?:these|the)?\s*(\d+|\w+)/i;
const FOR_EACH_PATTERN = /\bfor\s+each\s+(\w+)\b/i;
const BATCH_PATTERN = /\b(?:batch|bulk|all)\s+(?:transform|update|apply|process|convert)\b/i;
const FAN_OUT_PATTERN = /\b(?:fan[-\s]?out|in\s+parallel|simultaneously|across)\s+(\w+)/i;
const LITERAL_LIST_PATTERN = /:\s*([\w\s,]+(?:,[\w\s]+){2,})/i;
const NUMERIC_LIST_PATTERN = /\b(\d+)\s+(?:items|files|customers|jobs|parts|quotes|cvs|landing\s+pages)\b/i;

export class TaskDecomposerEngine {
  /**
   * Decompose a prose prompt into N sub-tasks.  Returns clarification verdict
   * when no pattern matches with sufficient confidence.
   */
  static decompose(
    prompt: string,
    opts: { maxSubtasks?: number; itemLabel?: string } = {},
  ): DecompositionResult {
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      throw new Error("TaskDecomposer.decompose requires a non-empty prompt");
    }
    const max = opts.maxSubtasks ?? MAX_SUBTASKS_DEFAULT;
    if (max < 1 || !Number.isFinite(max)) {
      throw new Error("TaskDecomposer.decompose: maxSubtasks must be a positive finite integer");
    }
    const itemLabel = opts.itemLabel ?? "item";
    const trimmed = prompt.trim();

    // 1. Numeric pattern: "100 CVs" / "30 landing pages" — strongest signal
    const nm = trimmed.match(NUMERIC_LIST_PATTERN);
    if (nm) {
      const n = Math.min(parseInt(nm[1], 10), max);
      const noun = nm[0].split(/\s+/).slice(1).join(" ");
      return {
        pattern: "enumerate-each-of-N",
        subtasks: Array.from({ length: n }, (_, i) => ({
          index: i,
          description: `${noun} #${i + 1}: ${trimmed}`,
          origin_pattern: "enumerate-each-of-N" as const,
        })),
        source_prompt: trimmed,
      };
    }

    // 2. Literal list: "covering A, B, C, D" — comma-separated items
    const ll = trimmed.match(LITERAL_LIST_PATTERN);
    if (ll) {
      const items = ll[1]
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 100);
      if (items.length >= 3 && items.length <= max) {
        return {
          pattern: "literal-list",
          subtasks: items.map((it, i) => ({
            index: i,
            description: it,
            origin_pattern: "literal-list" as const,
          })),
          source_prompt: trimmed,
        };
      }
    }

    // 3. "for each X" pattern
    if (FOR_EACH_PATTERN.test(trimmed) || ENUMERATE_N_PATTERN.test(trimmed)) {
      return {
        pattern: "clarification-needed",
        subtasks: [],
        clarification: `"for each" pattern detected but no enumerable count or list found — please supply N or a comma-separated list`,
        source_prompt: trimmed,
      };
    }

    // 4. Batch-transform pattern — single sub-task that operates on a batch
    if (BATCH_PATTERN.test(trimmed)) {
      return {
        pattern: "batch-transform",
        subtasks: [{
          index: 0,
          description: trimmed,
          origin_pattern: "batch-transform",
        }],
        source_prompt: trimmed,
      };
    }

    // 5. Fan-out pattern — clarification needed for the dimension
    if (FAN_OUT_PATTERN.test(trimmed)) {
      return {
        pattern: "clarification-needed",
        subtasks: [],
        clarification: `fan-out pattern detected but no enumerable target — specify the items to fan out across`,
        source_prompt: trimmed,
      };
    }

    // 6. No pattern → treat as atomic single task
    return {
      pattern: "atomic",
      subtasks: [{
        index: 0,
        description: trimmed,
        origin_pattern: "atomic",
      }],
      source_prompt: trimmed,
    };
  }

  /** Cap a result's subtask list at maxN, returning the prefix.  Used by callers wanting hard concurrency limits. */
  static cap(result: DecompositionResult, maxN: number): DecompositionResult {
    if (!Number.isFinite(maxN) || maxN < 0) throw new Error("cap: maxN must be non-negative finite integer");
    if (result.subtasks.length <= maxN) return result;
    return { ...result, subtasks: result.subtasks.slice(0, maxN) };
  }

  /** Validate a single sub-task (Zod). */
  static validate(s: unknown): SubTask { return SubTaskSchema.parse(s); }
}

export const taskDecomposerEngine = TaskDecomposerEngine;
