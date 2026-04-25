/**
 * Tribal Knowledge Types — shared type contracts for tribal-tip catalogs.
 *
 * Used by:
 *   - data/lathe-physics-science-tips.ts
 *   - data/okuma-macro-patterns.ts
 *   - data/okuma-osp-extracted-tips.ts
 *
 * Shape derives from the existing fields actually used across those files
 * (KIENZLE_TIPS, OKUMA_MACRO_PATTERNS, OSP_EXTRACTED_TIPS, etc.).
 *
 * @module data/tribal-knowledge-types
 */

/** Severity classification — matches existing tip files. */
export type TribalTipSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "warning";

/**
 * Canonical TribalTip record. All optional fields reflect the actual variation
 * across PRISM tribal-tip catalogs — required fields are the lowest common
 * denominator.
 */
export interface TribalTip {
  /** Unique stable identifier — kebab-case or snake_case, must be unique within catalog. */
  tip_id: string;
  /** Short human-readable headline. */
  title: string;
  /** Full prose description / advice / formula explanation. */
  description: string;
  /** Domain category, e.g. "cutting_force", "metallurgy", "thread_milling", "macro". */
  category: string;
  /** Machine family this tip applies to: "lathe", "mill", "wire_edm", "sinker_edm", "all". */
  machine_type: string;
  /** Severity / urgency for surfacing this tip in advisor flows. */
  severity: TribalTipSeverity;
  /** Confidence the tip is correct & generalisable (0..1). */
  confidence: number;
  /** Citation — engine name, paper, manual, or operator who contributed. */
  source: string;
  /** Optional formula in symbolic form, e.g. "Fc = kc1_1 * ap * f^(1-mc)". */
  formula?: string;
  /** Optional variable glossary — symbol → human-readable description. */
  variables?: Record<string, string>;
  /** Optional list of free-form tags for cross-cutting search. */
  tags?: string[];
  /** Optional usage context (e.g. "rough turning", "OSP-P200 only"). */
  context?: string;
  /** Optional worked examples or code snippets. */
  examples?: string[];
  /** Optional controller dialect this tip is specific to. */
  controller?: string;
  /** Optional explicit material list this tip is gated on. */
  materials?: string[];
  /** Optional code snippet — controller-specific G/M-code pattern (Okuma/Fanuc/Haas dialect). */
  code_pattern?: string;
  /** Optional worked code example — usually a complete macro or program fragment. */
  code_example?: string;
  /** Optional ISO-group-keyed numeric values (e.g. Kienzle kc1.1/mc per P/M/K/N/S/H). */
  values_by_iso?: Record<string, Record<string, number>>;
}

/** Catalog wrapper used when a module exports multiple named tip arrays. */
export interface TribalTipCatalog {
  catalog_id: string;
  description: string;
  tips: TribalTip[];
  generated_at?: string;
}
