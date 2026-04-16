/**
 * OutputBudgetEngine — Token budget enforcement for tool outputs
 *
 * Provides utilities to trim, filter, and compress tool/dispatcher
 * outputs before they consume context window space. Works with the
 * hook system's output compression but can also be used directly.
 *
 * Token savings: Prevents large outputs from bloating context.
 *
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

export interface BudgetOptions {
  /** Max characters in output (default: 5000) */
  maxChars?: number;
  /** Fields to keep (whitelist — if set, drops all others) */
  keepFields?: string[];
  /** Fields to drop (blacklist) */
  dropFields?: string[];
  /** Max array items to keep */
  maxArrayItems?: number;
  /** Max depth for nested objects */
  maxDepth?: number;
  /** Truncation indicator */
  truncationMarker?: string;
}

const DEFAULT_BUDGET: Required<BudgetOptions> = {
  maxChars: 5000,
  keepFields: [],
  dropFields: [],
  maxArrayItems: 10,
  maxDepth: 4,
  truncationMarker: "…[truncated]",
};

export class OutputBudgetEngine {

  /**
   * Apply budget constraints to any data, returning a trimmed version.
   */
  enforce(data: unknown, options?: BudgetOptions): unknown {
    const opts = { ...DEFAULT_BUDGET, ...options };
    const trimmed = this.trimValue(data, opts, 0);
    if (typeof trimmed === "string" && trimmed.length > opts.maxChars) {
      return trimmed.slice(0, opts.maxChars - opts.truncationMarker.length)
        + opts.truncationMarker;
    }

    const json = JSON.stringify(trimmed);
    if (json.length > opts.maxChars) {
      // For complex objects, re-trim with stricter array/depth limits
      const stricter = this.trimValue(data, {
        ...opts,
        maxArrayItems: Math.max(1, Math.floor(opts.maxArrayItems / 2)),
        maxDepth: Math.max(1, opts.maxDepth - 1),
      }, 0);
      const retryJson = JSON.stringify(stricter);
      if (retryJson.length > opts.maxChars) {
        return retryJson.slice(0, opts.maxChars - opts.truncationMarker.length)
          + opts.truncationMarker;
      }
      return stricter;
    }

    return trimmed;
  }

  /**
   * Enforce budget and return as string.
   */
  enforceString(data: unknown, options?: BudgetOptions): string {
    const result = this.enforce(data, options);
    return typeof result === "string" ? result : JSON.stringify(result, null, 0);
  }

  /**
   * Estimate token count for data (~4 chars per token).
   */
  estimateTokens(data: unknown): number {
    const json = typeof data === "string" ? data : JSON.stringify(data);
    return Math.ceil(json.length / 4);
  }

  /**
   * Check if data exceeds a token budget.
   */
  exceedsBudget(data: unknown, maxTokens: number): boolean {
    return this.estimateTokens(data) > maxTokens;
  }

  /**
   * Filter object to only include specified fields.
   */
  filterFields(obj: Record<string, unknown>, keep: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of keep) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  }

  /**
   * Drop specified fields from object.
   */
  dropFieldsFrom(
    obj: Record<string, unknown>,
    drop: string[]
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!drop.includes(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Summarize an array by keeping first/last items and a count.
   */
  summarizeArray<T>(arr: T[], keep = 3): { items: T[]; total: number; showing: string } {
    if (arr.length <= keep * 2) {
      return { items: arr, total: arr.length, showing: `all ${arr.length}` };
    }
    const items = [...arr.slice(0, keep), ...arr.slice(-keep)] as T[];
    return {
      items,
      total: arr.length,
      showing: `first ${keep} + last ${keep} of ${arr.length}`,
    };
  }

  /**
   * Get preset budget configs for common scenarios.
   */
  preset(name: "compact" | "normal" | "verbose"): BudgetOptions {
    switch (name) {
      case "compact":
        return { maxChars: 1500, maxArrayItems: 3, maxDepth: 2 };
      case "normal":
        return { maxChars: 5000, maxArrayItems: 10, maxDepth: 4 };
      case "verbose":
        return { maxChars: 20000, maxArrayItems: 50, maxDepth: 8 };
    }
  }

  // ── Private ──────────────────────────────────────────────────

  private trimValue(
    value: unknown,
    opts: Required<BudgetOptions>,
    depth: number
  ): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;

    if (depth >= opts.maxDepth) {
      if (Array.isArray(value)) return `[Array(${value.length})]`;
      return `[Object(${Object.keys(value as object).length} keys)]`;
    }

    if (Array.isArray(value)) {
      const trimmed = value.slice(0, opts.maxArrayItems);
      const result = trimmed.map(item => this.trimValue(item, opts, depth + 1));
      if (value.length > opts.maxArrayItems) {
        result.push(`${opts.truncationMarker} +${value.length - opts.maxArrayItems} more`);
      }
      return result;
    }

    const obj = value as Record<string, unknown>;
    let entries = Object.entries(obj);

    // Apply field filters
    if (opts.keepFields.length > 0) {
      entries = entries.filter(([key]) => opts.keepFields.includes(key));
    }
    if (opts.dropFields.length > 0) {
      entries = entries.filter(([key]) => !opts.dropFields.includes(key));
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      result[key] = this.trimValue(val, opts, depth + 1);
    }
    return result;
  }
}

export const outputBudgetEngine = new OutputBudgetEngine();
