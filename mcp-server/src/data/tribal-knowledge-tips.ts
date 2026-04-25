/**
 * Tribal Knowledge Tips (legacy schema) — used by Okuma-specific catalogs.
 *
 * Used by:
 *   - data/lathe-tribal-tips-okuma.ts (OKUMA_LATHE_TRIBAL_TIPS)
 *   - engines/OkumaGosigerTranscriptMinerEngine.ts
 *
 * This is a parallel shape to data/tribal-knowledge-types.ts — kept separate
 * because the Okuma tips use `id` + `tip` (one-line guidance) instead of
 * `tip_id` + `description` (paragraph-level explanation).
 *
 * @module data/tribal-knowledge-tips
 */

/** Severity classification — same enum as TribalTipSeverity in tribal-knowledge-types. */
export type TribalTipSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "warning";

/**
 * Legacy short-form TribalTip. Optional fields reflect actual variation
 * across the Okuma catalogs.
 */
export interface TribalTip {
  /** Unique stable identifier (snake_case). */
  id: string;
  /** Domain category, e.g. "tool_life", "macro", "threading", "drilling". */
  category: string;
  /** Short human-readable headline. */
  title: string;
  /** One-line guidance / advice. */
  tip: string;
  /** Severity / urgency for surfacing this tip in advisor flows. */
  severity: TribalTipSeverity;
  /** Confidence the tip is correct & generalisable (0..1). */
  confidence: number;
  /** Citation — engine name, paper, manual, or operator who contributed. */
  source: string;
  /** Optional controller dialect (e.g. "Okuma OSP", "Fanuc 30i"). */
  controller?: string;
  /** Optional machine family or specific machine model. */
  machine?: string;
  /** Optional list of free-form tags for cross-cutting search. */
  tags?: string[];
  /** Optional usage context (e.g. "bar feeder programs", "live tooling"). */
  context?: string;
  /** Optional materials this tip applies to. */
  materials?: string[];
  /** Optional worked examples or code snippets. */
  examples?: string[];
}
