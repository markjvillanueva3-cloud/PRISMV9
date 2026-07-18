/**
 * PrintCorpusRow — one row per print in the corpus-wide scan inventory.
 *
 * Each row WRAPS the per-page BlueprintExtraction shape from
 * BlueprintExtractionRAGEngine with corpus-level metadata: source-file identity
 * (sha256-keyed for dedup), scan status (resumable orchestrator state),
 * ground-truth verification, and operator-review fields for the 100% gate.
 *
 * Used by:
 *   - PRINT-OCR-100PCT-MS0/U2 (corpus orchestrator) — writes one row per print
 *   - PRINT-OCR-100PCT-MS0/U3 (accuracy proof harness) — reads + verifies each
 *   - PRINT-OCR-100PCT-MS0/U4 (wiki+tribal batch generator) — pattern-mines
 *
 * Hard rules (Zod refines):
 *   R1 - sourceSha256 is 64-char hex (full SHA-256, no truncation).
 *   R2 - scanStatus="verified_100pct" requires operatorVerdict="approved"
 *        AND groundTruthAvailable=true (no silent acceptance per R12).
 *   R3 - worstConfidenceFloor is the WEAKEST floor across all pages.
 *   R4 - accuracyAgainstGroundTruth in [0, 1] OR null (pending).
 *   R5 - operator-review fields null IFF operatorVerdict="pending".
 */

import { z } from "zod";
import {
  BlueprintExtractionSchema,
  CONFIDENCE_FLOORS,
  type BlueprintExtraction,
} from "../engines/BlueprintExtractionRAGEngine.js";

export const SCAN_STATUSES = [
  "pending",
  "scanning",
  "extracted",
  "extraction_failed",
  "verified_100pct",
  "rejected_below_100pct",
] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

export const PRINT_SOURCE_KINDS = [
  "jm_die",
  "docustrata",
  "harvested_mit",
  "harvested_vendor",
  "harvested_online",
  "operator_supplied",
] as const;
export type PrintSourceKind = (typeof PRINT_SOURCE_KINDS)[number];

export const PRINT_SOURCE_FORMATS = [
  "pdf",
  "tif",
  "tiff",
  "png",
  "jpg",
  "jpeg",
  "dxf",
  "step",
  "iges",
  "svg",
] as const;
export type PrintSourceFormat = (typeof PRINT_SOURCE_FORMATS)[number];

export const GROUND_TRUTH_SOURCES = [
  "jm_die_inspection",
  "docustrata_index",
  "operator_confirmed",
  "none",
] as const;
export type GroundTruthSource = (typeof GROUND_TRUTH_SOURCES)[number];

export const OPERATOR_VERDICTS = ["approved", "rejected", "pending"] as const;
export type OperatorVerdict = (typeof OPERATOR_VERDICTS)[number];

export const PrintCorpusRowSchema = z
  .object({
    rowId: z.string().min(1),
    sourceSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/i, "sourceSha256 must be 64-char lowercase hex"),
    sourcePath: z.string().min(1),
    sourceKind: z.enum(PRINT_SOURCE_KINDS),
    sourceFormat: z.enum(PRINT_SOURCE_FORMATS),
    pageCount: z.number().int().min(1),

    customer: z.string().nullable(),
    partNumber: z.string().nullable(),
    revision: z.string().nullable(),

    pages: z.array(BlueprintExtractionSchema).min(1),

    worstConfidenceFloor: z.enum(CONFIDENCE_FLOORS),
    totalRegions: z.number().int().min(0),
    weakestRegionConfidence: z.number().min(0).max(1),

    scanStatus: z.enum(SCAN_STATUSES),
    scannedAt: z.string().min(1),
    scanLatencyMs: z.number().int().min(0),

    groundTruthAvailable: z.boolean(),
    groundTruthSource: z.enum(GROUND_TRUTH_SOURCES),
    accuracyAgainstGroundTruth: z.number().min(0).max(1).nullable(),
    accuracyVerifiedAt: z.string().nullable(),

    requiresOperatorReview: z.boolean(),
    operatorReviewedBy: z.string().nullable(),
    operatorReviewedAt: z.string().nullable(),
    operatorVerdict: z.enum(OPERATOR_VERDICTS),

    isAnonymizable: z.boolean(),
    anonymizationBlockedReason: z.string().nullable(),
  })
  .strict()
  .refine(
    (r) =>
      r.scanStatus !== "verified_100pct" ||
      (r.operatorVerdict === "approved" && r.groundTruthAvailable),
    "R2: verified_100pct requires operatorVerdict='approved' AND groundTruthAvailable=true",
  )
  .refine(
    (r) =>
      r.operatorVerdict === "pending"
        ? r.operatorReviewedBy === null && r.operatorReviewedAt === null
        : r.operatorReviewedBy !== null && r.operatorReviewedAt !== null,
    "R5: operator-review fields null IFF operatorVerdict='pending'",
  );

export type PrintCorpusRow = z.infer<typeof PrintCorpusRowSchema>;

// Confidence-floor rank (lower = weaker guarantee). Used by computeWorstFloor.
export const CONFIDENCE_FLOOR_RANK: Record<(typeof CONFIDENCE_FLOORS)[number], number> = {
  low_no_vision: 0,
  low_contradiction: 1,
  low_no_prior: 2,
  normal: 3,
};

/** Compute the weakest confidence floor across an array of pages. R3. */
export function computeWorstFloor(
  pages: BlueprintExtraction[],
): (typeof CONFIDENCE_FLOORS)[number] {
  if (pages.length === 0) {
    throw new Error("computeWorstFloor: empty pages array");
  }
  return pages.reduce<(typeof CONFIDENCE_FLOORS)[number]>(
    (worst, p) =>
      CONFIDENCE_FLOOR_RANK[p.confidenceFloor] < CONFIDENCE_FLOOR_RANK[worst]
        ? p.confidenceFloor
        : worst,
    pages[0].confidenceFloor,
  );
}

/** Aggregate region count + weakest per-region confidence across all pages. */
export function aggregateConfidence(
  pages: BlueprintExtraction[],
): { totalRegions: number; weakestRegionConfidence: number } {
  let totalRegions = 0;
  let weakest = 1;
  let sawAnyRegion = false;
  for (const page of pages) {
    totalRegions += page.regions.length;
    for (const r of page.regions) {
      sawAnyRegion = true;
      if (r.confidence < weakest) weakest = r.confidence;
    }
  }
  return {
    totalRegions,
    weakestRegionConfidence: sawAnyRegion ? weakest : 0,
  };
}
