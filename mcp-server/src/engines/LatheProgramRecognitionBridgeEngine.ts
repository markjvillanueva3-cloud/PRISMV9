/**
 * LatheProgramRecognitionBridgeEngine — OCR partNumber → library-lookup bridge
 * ============================================================================
 *
 * Closes the camera-recognition leg of operator /goal #6 (2026-05-24):
 *   "wire it to all recognition features and data matching so camera use can
 *    be utilized throughout the whole app".
 *
 * Decoupled from any specific OCR source — accepts a recognized `partNumber`
 * string (from BlueprintVisionOCREngine.title_block, label scanner, vision
 * system, or any other recognition consumer) plus optional source metadata
 * and returns library-lookup results from LatheProgramLibraryEngine with:
 *
 *   1. Exact-match entry (when the recognized string hits an existing part)
 *   2. Fuzzy alternates ranked by Levenshtein distance (when OCR mis-reads
 *      a character — e.g., "10-2A2-2-PR" vs "10-2A2-2-PB")
 *   3. Confidence score derived from edit-distance + character-class agreement
 *   4. Frontend-routing hint (new-part flow / dispatch flow / regenerate-v2 CTA)
 *
 * Contract from the U-PROGRAM-LIBRARY-FRONTEND-SPEC (2026-05-25 whiskey):
 *   exact match → "dispatch" (entry.hasOptimized? render ★ + dispatch dialog)
 *   no match    → "new_part" (route to lathe-wizard new-program flow)
 *   v1-only     → "regenerate_v2" (surface CTA to run V2 upgrader)
 *
 * @module engines/LatheProgramRecognitionBridgeEngine
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-PROGRAM-RECOGNITION-BRIDGE
 * @version 1.0.0
 */

import { LatheProgramLibraryEngine } from "./LatheProgramLibraryEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface RecognitionBridgeInput {
  /** Part number string from any recognition consumer (OCR, barcode, label). */
  recognizedPartNumber: string;
  /** Optional recognition source for telemetry / provenance. */
  source?: "ocr_blueprint" | "barcode" | "qr" | "label_scanner" | "vision_system" | "manual";
  /** Optional source confidence (0-1) — preserved into the bridge result. */
  sourceConfidence?: number;
  /** Max fuzzy alternates to return (default 5, cap 25). */
  maxAlternates?: number;
  /** Min character-overlap ratio for an alternate to qualify (default 0.5). */
  minAlternateOverlap?: number;
}

export interface RecognitionAlternate {
  partNumber: string;
  customer: string;
  distance: number;
  overlap: number;
  /** 0-1 — higher = more likely match. distance==0 → 1.0 */
  score: number;
  hasOptimized: boolean;
}

export interface RecognitionBridgeResult {
  schemaVersion: "1.0.0";
  asOf: string;
  /** The input string, normalized (trim + uppercase). */
  normalizedQuery: string;
  /** True when exact-match library entry found. */
  exactMatch: boolean;
  /** Frontend-routing hint per U-PROGRAM-LIBRARY-FRONTEND-SPEC contract. */
  routeHint: "dispatch" | "regenerate_v2" | "new_part";
  /** Confidence of the bridge result (0-1). 1.0 for exact match. */
  confidence: number;
  /** When exactMatch true — the library entry; otherwise null. */
  match: ReturnType<typeof LatheProgramLibraryEngine.list>["entries"][number] | null;
  /** Top fuzzy alternates when no exact match (or as extras when match exists). */
  alternates: RecognitionAlternate[];
  /** Provenance carried forward from input. */
  source?: RecognitionBridgeInput["source"];
  sourceConfidence?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Levenshtein distance with O(min(a,b)) memory. Used to rank fuzzy
 * alternates when OCR mis-reads a character ("PR" vs "PB").
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Always iterate over the longer string as the outer loop;
  // memory tracks the shorter one. This bounds RAM at min(|a|,|b|).
  if (a.length < b.length) [a, b] = [b, a];
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Character-set overlap ratio — anchors fuzzy matches that share
 * many characters even when ordering differs (handles OCR
 * transpositions and segmenting differences).
 */
function characterOverlap(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let common = 0;
  for (const c of setA) if (setB.has(c)) common++;
  return common / Math.max(setA.size, setB.size);
}

function normalize(s: string): string {
  return s.trim().toUpperCase();
}

/**
 * Confidence score in [0, 1] derived from edit-distance and character
 * overlap. Exact match → 1.0; no overlap → 0.0; weighted blend for fuzzy.
 *
 * Composition: 60% distance-based (penalizes longer edits), 40% overlap
 * (anchors heuristic similarity for transpositions OCR commonly emits).
 */
function scoreAlternate(query: string, candidate: string, distance: number, overlap: number): number {
  if (distance === 0) return 1.0;
  const longer = Math.max(query.length, candidate.length, 1);
  const distScore = Math.max(0, 1 - distance / longer);
  return 0.6 * distScore + 0.4 * overlap;
}

// ── Class API ────────────────────────────────────────────────────────

export class LatheProgramRecognitionBridgeEngine {
  static readonly DEFAULT_MAX_ALTERNATES = 5;
  static readonly ALTERNATE_CAP = 25;
  static readonly DEFAULT_MIN_OVERLAP = 0.5;
  /** Library window for fuzzy-scan — bounded so we never scan the full corpus. */
  static readonly LIBRARY_SCAN_LIMIT = 1000;

  /**
   * Bridge a recognized part-number string into a library-lookup result.
   *
   * Flow:
   *  1. Normalize the input (trim + uppercase).
   *  2. Try exact lookup via LatheProgramLibraryEngine.list({ partNumber }).
   *  3. Whether or not exact found, pull a wider window and rank by edit-distance.
   *  4. Compute frontend-routing hint from match status + optimization flag.
   */
  static recognize(input: RecognitionBridgeInput): RecognitionBridgeResult {
    const normalizedQuery = normalize(input.recognizedPartNumber ?? "");
    const maxAlts = Math.min(
      Math.max(1, input.maxAlternates ?? this.DEFAULT_MAX_ALTERNATES),
      this.ALTERNATE_CAP,
    );
    const minOverlap = Math.min(
      Math.max(0, input.minAlternateOverlap ?? this.DEFAULT_MIN_OVERLAP),
      1,
    );

    // 1. Exact lookup — skip on empty normalized query (LibraryEngine treats
    //    empty partNumber as no-filter, would return the first corpus entry).
    let exact: ReturnType<typeof LatheProgramLibraryEngine.list>["entries"][number] | null = null;
    if (normalizedQuery.length > 0) {
      const exactResult = LatheProgramLibraryEngine.list({
        partNumber: input.recognizedPartNumber,
        limit: 1,
      });
      // Verify the result is actually an exact match — guard against case-sensitivity
      // mismatch (LibraryEngine compares case-sensitively against folder names).
      if (exactResult.entries.length > 0 && normalize(exactResult.entries[0].partNumber) === normalizedQuery) {
        exact = exactResult.entries[0];
      }
    }

    // 2. Wider window for fuzzy alternates — bounded scan
    const window = LatheProgramLibraryEngine.list({ limit: this.LIBRARY_SCAN_LIMIT });

    const ranked: RecognitionAlternate[] = window.entries
      .map((entry) => {
        const candidate = normalize(entry.partNumber);
        const distance = levenshtein(normalizedQuery, candidate);
        const overlap = characterOverlap(normalizedQuery, candidate);
        const score = scoreAlternate(normalizedQuery, candidate, distance, overlap);
        return {
          partNumber: entry.partNumber,
          customer: entry.customer,
          distance,
          overlap,
          score,
          hasOptimized: entry.hasOptimized,
        };
      })
      // Skip exact-match (will be reported as `match`, not alternate) AND items below overlap floor
      .filter((alt) => alt.distance > 0 && alt.overlap >= minOverlap)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxAlts);

    // 3. Route hint
    let routeHint: RecognitionBridgeResult["routeHint"];
    let confidence: number;
    if (exact) {
      routeHint = exact.hasOptimized ? "dispatch" : "regenerate_v2";
      confidence = 1.0;
    } else if (ranked.length > 0 && ranked[0].score >= 0.75) {
      // Strong fuzzy match — caller should confirm with the user before dispatch
      routeHint = "dispatch";
      confidence = ranked[0].score;
    } else {
      routeHint = "new_part";
      confidence = 0;
    }

    return {
      schemaVersion: "1.0.0",
      asOf: new Date().toISOString(),
      normalizedQuery,
      exactMatch: !!exact,
      routeHint,
      confidence,
      match: exact,
      alternates: ranked,
      source: input.source,
      sourceConfidence: input.sourceConfidence,
    };
  }
}

export const latheProgramRecognitionBridgeEngine = LatheProgramRecognitionBridgeEngine;
