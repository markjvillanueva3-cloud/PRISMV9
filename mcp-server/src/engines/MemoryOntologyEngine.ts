/**
 * MemoryOntologyEngine.ts — ontology validator + classifier for the vault.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-ONTOLOGY-LAYER (D2).
 *
 * Pairs with MemoryProvenanceEngine (D1, implicit — provenance logic lives
 * in the schema + mirror hook directly). The ontology engine is a thin
 * orchestration layer over `memoryOntologySchema` that:
 *
 *   - validateOntology(content)    — parse a memo's frontmatter, return
 *                                    ontology (or null if absent) — throws
 *                                    on present-but-invalid (Karpathy R12).
 *   - classifyOrInfer(file, body)  — extract-first, fall back to filename
 *                                    heuristics when no ontology present.
 *   - ensureOntology(file, body)   — used by memory-mirror: if ontology
 *                                    absent AND not warn-only, REJECT;
 *                                    if absent AND warn-only, inject an
 *                                    inferred block + return rewritten.
 *   - isWarnOnly()                 — reads PRISM_ONTOLOGY_WARN_ONLY env.
 *
 * Stateless. No I/O — caller provides file content as a string. Mirrors
 * the D1 design where the schema does the parsing + the engine layer is
 * thin orchestration. Hook integration lives in memory-mirror-to-vault.mjs
 * (CommonJS-ish portable node — cannot import this engine directly; it
 * re-implements the same enforcement via the schema's exported helpers).
 *
 * Env knobs:
 *   PRISM_ONTOLOGY_WARN_ONLY=1   — accept memos without ontology; mirror
 *                                  hook will inject an inferred block but
 *                                  not fail the write. Used for soft-launch
 *                                  + the legacy-memo grace period before
 *                                  backfill catches up.
 *
 * @module engines/MemoryOntologyEngine
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D2
 */

import {
  MEMORY_ONTOLOGY_SCHEMA_VERSION,
  type MemoryOntology,
  extractOntologyFromFrontmatter,
  classifyFromFilename,
  mergeIntoExistingFrontmatter,
} from "../schemas/memoryOntologySchema.js";

export const MEMORY_ONTOLOGY_ENGINE_VERSION = "1.0.0";

/**
 * Result of an ensureOntology call. The engine reports the OUTCOME (kept /
 * injected / rejected) so the mirror hook can log the decision into the
 * ontology audit ledger without re-parsing the content.
 */
export interface EnsureOutcome {
  /** Final ontology applied to the memo (null only when rejected). */
  ontology: MemoryOntology | null;
  /**
   * Outcome class:
   *  - 'kept'      — existing valid ontology found; no change.
   *  - 'injected'  — no ontology present; classifier inferred + injected.
   *  - 'rejected'  — no ontology present AND warn-only is OFF.
   *  - 'replaced'  — existing block was INVALID (caller asked for repair).
   */
  outcome: "kept" | "injected" | "rejected" | "replaced";
  /** Rewritten content (unchanged for 'kept' / 'rejected'). */
  content: string;
  /** Optional reason — surfaces in audit logs when outcome=rejected. */
  reason?: string;
}

/**
 * Return true when PRISM_ONTOLOGY_WARN_ONLY is set to a truthy value.
 * Centralized so the env-flag semantics live in one place (the hook + the
 * engine + any tests must agree).
 */
export function isWarnOnly(env?: NodeJS.ProcessEnv): boolean {
  const raw = (env ?? process.env).PRISM_ONTOLOGY_WARN_ONLY;
  if (!raw) return false;
  // Trim + lowercase so `.env`-sourced values with trailing newlines and any
  // case mix work the same as the literal `=1` programmatic assignment.
  const t = raw.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

/**
 * Parse + validate the ontology block in `content`. Returns the validated
 * ontology, or `null` when no ontology block is present. Throws when a
 * block IS present but fails schema validation — that's a load-bearing
 * fail-loud (Karpathy R12).
 */
export function validateOntology(content: string): MemoryOntology | null {
  return extractOntologyFromFrontmatter(content);
}

/**
 * Extract-first, classify-fallback. If `content` already carries a valid
 * ontology block, return it. Otherwise derive one from the filename + body
 * via the schema's `classifyFromFilename` heuristics.
 *
 * Throws ONLY when an existing block is malformed (Zod throw bubbles up).
 */
export function classifyOrInfer(
  filename: string,
  content: string,
): MemoryOntology {
  const existing = extractOntologyFromFrontmatter(content);
  if (existing) return existing;
  return classifyFromFilename(filename, content);
}

/**
 * Enforce ontology presence on a memo. Used by memory-mirror at write time.
 *
 * Decision matrix (env=PRISM_ONTOLOGY_WARN_ONLY):
 *   has-valid-block       →  outcome='kept',     content unchanged
 *   no-block, warn=ON     →  outcome='injected', content rewritten with inferred block
 *   no-block, warn=OFF    →  outcome='rejected', content unchanged (caller must NOT write)
 *   invalid-block         →  Zod throws (the validateOntology call); caller must catch
 *
 * Callers that want to repair an invalid block in-place (rather than throw)
 * can pass `{ repairInvalid: true }`; in that mode the engine catches the
 * Zod throw, classifies fresh from the filename, and returns outcome='replaced'.
 */
export function ensureOntology(
  filename: string,
  content: string,
  opts: { warnOnly?: boolean; repairInvalid?: boolean } = {},
): EnsureOutcome {
  const warn = opts.warnOnly ?? isWarnOnly();
  let existing: MemoryOntology | null = null;
  try {
    existing = extractOntologyFromFrontmatter(content);
  } catch (err) {
    if (!opts.repairInvalid) throw err;
    const inferred = classifyFromFilename(filename, content);
    // Splice out the broken block + inject the inferred one.
    const rewritten = mergeIntoExistingFrontmatter(content, inferred);
    return {
      ontology: inferred,
      outcome: "replaced",
      content: rewritten,
      reason: `repaired invalid ontology block: ${(err as Error).message}`,
    };
  }
  if (existing) {
    return { ontology: existing, outcome: "kept", content };
  }
  if (!warn) {
    return {
      ontology: null,
      outcome: "rejected",
      content,
      reason:
        "missing ontology block (set PRISM_ONTOLOGY_WARN_ONLY=1 for grace-period soft-launch)",
    };
  }
  const inferred = classifyFromFilename(filename, content);
  const rewritten = mergeIntoExistingFrontmatter(content, inferred);
  // Defensive re-validate: classifyFromFilename + merge should always emit a
  // round-trippable block, but the engine's contract is "guarantee the
  // returned content carries a valid ontology" — re-extract closes the loop
  // and matches Karpathy R12. Throws here if the helpers regress.
  extractOntologyFromFrontmatter(rewritten);
  return {
    ontology: inferred,
    outcome: "injected",
    content: rewritten,
    reason: `injected via classifyFromFilename (kind=${inferred.kind}, state=${inferred.state}, visibility=${inferred.visibility})`,
  };
}

/**
 * Lightweight validation helper that returns a structured result instead of
 * throwing. Useful for batch operations like backfill where we want to
 * collect per-file errors rather than abort on the first malformed memo.
 */
export function validateOntologySafe(content: string): {
  ok: boolean;
  ontology: MemoryOntology | null;
  error?: string;
} {
  try {
    const ontology = extractOntologyFromFrontmatter(content);
    return { ok: true, ontology };
  } catch (err) {
    return { ok: false, ontology: null, error: (err as Error).message };
  }
}

/**
 * Singleton instance accessor — matches the pattern used elsewhere in the
 * engine catalog for direct API access from skills + hooks.
 */
export const memoryOntologyEngine = Object.freeze({
  version: MEMORY_ONTOLOGY_ENGINE_VERSION,
  schemaVersion: MEMORY_ONTOLOGY_SCHEMA_VERSION,
  isWarnOnly,
  validateOntology,
  validateOntologySafe,
  classifyOrInfer,
  ensureOntology,
});
