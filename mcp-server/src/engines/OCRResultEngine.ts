/**
 * OCRResultEngine — HCAP07 structured OCR output + confidence aggregation.
 *
 * Pure-core: caller drives the OCR engine (Tesseract, Vision API, etc.)
 * and supplies a list of per-region text + confidence scores.  Engine
 * produces aggregate confidence + filters low-confidence regions + emits
 * a merged plain-text result.
 *
 * @module engines/OCRResultEngine
 */

import { z } from "zod";

export const OCRRegionSchema = z.object({
  region_id: z.string().min(1).max(120),
  text: z.string().max(50_000),
  confidence: z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 1, {}),
  page: z.number().int().min(1).optional(),
  bbox: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number().min(0),
    h: z.number().min(0),
  }).optional(),
});
export type OCRRegion = z.infer<typeof OCRRegionSchema>;

export interface OCRSummary {
  document_id: string;
  region_count: number;
  total_chars: number;
  avg_confidence: number;
  low_confidence_count: number;
  pages: number;
}

export class OCRResultEngine {
  static validateRegion(r: unknown): OCRRegion { return OCRRegionSchema.parse(r); }

  /** Summarize a set of OCR regions. */
  static summarize(
    document_id: string,
    regions: readonly OCRRegion[],
    low_confidence_threshold: number = 0.7,
  ): OCRSummary {
    if (!document_id) throw new Error("OCRResult.summarize: document_id required");
    if (!Array.isArray(regions)) throw new Error("OCRResult.summarize: regions must be an array");
    if (!Number.isFinite(low_confidence_threshold) || low_confidence_threshold < 0 || low_confidence_threshold > 1) {
      throw new Error("OCRResult.summarize: threshold must be in [0,1]");
    }
    for (const r of regions) OCRRegionSchema.parse(r);
    if (regions.length === 0) {
      return { document_id, region_count: 0, total_chars: 0, avg_confidence: 0, low_confidence_count: 0, pages: 0 };
    }
    const total_chars = regions.reduce((s, r) => s + r.text.length, 0);
    const sum_conf = regions.reduce((s, r) => s + r.confidence, 0);
    const avg_confidence = sum_conf / regions.length;
    const low_confidence_count = regions.filter((r) => r.confidence < low_confidence_threshold).length;
    const pageSet = new Set<number>();
    for (const r of regions) if (typeof r.page === "number") pageSet.add(r.page);
    return {
      document_id,
      region_count: regions.length,
      total_chars,
      avg_confidence,
      low_confidence_count,
      pages: pageSet.size,
    };
  }

  /** Filter to regions above the confidence threshold. */
  static filterByConfidence(regions: readonly OCRRegion[], min_confidence: number): OCRRegion[] {
    if (!Number.isFinite(min_confidence) || min_confidence < 0 || min_confidence > 1) {
      throw new Error("OCRResult.filterByConfidence: min_confidence must be in [0,1]");
    }
    return regions.filter((r) => r.confidence >= min_confidence);
  }

  /** Merge regions into plain text, sorted by page → y-coordinate (top-down). */
  static mergeText(regions: readonly OCRRegion[]): string {
    const sorted = [...regions].sort((a, b) => {
      const pa = a.page ?? 0, pb = b.page ?? 0;
      if (pa !== pb) return pa - pb;
      const ya = a.bbox?.y ?? 0, yb = b.bbox?.y ?? 0;
      return ya - yb;
    });
    return sorted.map((r) => r.text).filter((t) => t.length > 0).join("\n");
  }

  static renderSummary(s: OCRSummary): string {
    return `[OCR ${s.document_id}] regions=${s.region_count} chars=${s.total_chars} avg_conf=${s.avg_confidence.toFixed(3)} low=${s.low_confidence_count} pages=${s.pages}`;
  }
}

export const ocrResultEngine = OCRResultEngine;
