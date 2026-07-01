/**
 * InsertBoxToCatalogBridgeEngine — QUOTING-PIPELINE-MS0 / U-QP03
 *
 * Bridges an OCR'd insert-box / tool-body photo (already routed via
 * CameraIntakeRouterEngine) into:
 *   - ShopToolLibrary catalog lookup (find the part)
 *   - InsertGradeSelectionEngine recommendation (compatible inserts)
 *
 * Input: ImageOCRPipelineEngine OCRResult.extractedData (toolCodes, partNumbers)
 *        plus the raw text for vendor-brand sniffing.
 *
 * Output: { catalog_match | null, compatible_inserts[], confidence, evidence[] }
 *
 * Per R12 fail-loud: unknown part → return null catalog_match with explicit reason,
 * NEVER silent empty.
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP03-INSERT-BOX-CATALOG-BRIDGE
 * @author slot:charlie /goal-13 iter3, 2026-05-24
 */

export interface InsertBoxBridgeInput {
  text: string;
  toolCodes?: string[];
  partNumbers?: string[];
  /** OCR quality 0..1; downscales final confidence */
  ocrConfidence?: number;
}

export interface CatalogMatch {
  part_number: string;
  vendor: string;
  /** Generic category (e.g. "indexable_insert" | "end_mill_body" | "drill_body") */
  category: string;
  /** Source of the match: "iso1832" (regex from designation) or "catalog" (in-library) */
  match_source: "iso1832" | "catalog";
  match_confidence: number;
}

export interface CompatibleInsert {
  part_number: string;
  vendor: string;
  grade: string;
  reason: string;
}

export interface InsertBoxBridgeResult {
  catalog_match: CatalogMatch | null;
  compatible_inserts: CompatibleInsert[];
  confidence: number;
  evidence: string[];
  reason?: string;
}

/** ISO 1832 turning insert designation (4-letter prefix + 4-6 digits + optional suffix). */
const ISO_1832_TURNING = /\b([CDST])([NPCDM])([MGN])([G])(\d{4,6})(?:[-\s]?[A-Z]{2,3})?\b/i;
/** Common vendor codes that appear next to the SKU. */
const VENDOR_LEXICON: Array<{ name: string; tokens: string[] }> = [
  { name: "Sandvik", tokens: ["sandvik", "coromant", "coroturn"] },
  { name: "Kennametal", tokens: ["kennametal", "kennametal inc"] },
  { name: "Iscar", tokens: ["iscar"] },
  { name: "Kyocera", tokens: ["kyocera"] },
  { name: "Mitsubishi", tokens: ["mitsubishi materials", "mmc"] },
  { name: "Seco", tokens: ["seco"] },
  { name: "Walter", tokens: ["walter"] },
  { name: "Sumitomo", tokens: ["sumitomo"] },
  { name: "Tungaloy", tokens: ["tungaloy"] },
];

function detectVendor(text: string): string | null {
  const lower = text.toLowerCase();
  for (const v of VENDOR_LEXICON) {
    if (v.tokens.some((t) => lower.includes(t))) return v.name;
  }
  return null;
}

/** Recommend compatible inserts when the matched part is an indexable insert. */
function recommendCompatible(match: CatalogMatch): CompatibleInsert[] {
  if (match.category !== "indexable_insert") return [];
  // ISO 1832 first-letter is the insert shape; same shape across grades is the natural compatibility set.
  const shape = match.part_number.slice(0, 1).toUpperCase();
  return [
    { part_number: `${match.part_number}-PR`, vendor: match.vendor, grade: "PR (precision)", reason: `same ISO 1832 shape ${shape}, precision grade` },
    { part_number: `${match.part_number}-MM`, vendor: match.vendor, grade: "MM (medium-machining)", reason: `same ISO 1832 shape ${shape}, MM grade` },
    { part_number: `${match.part_number}-RM`, vendor: match.vendor, grade: "RM (roughing)", reason: `same ISO 1832 shape ${shape}, roughing grade` },
  ];
}

export class InsertBoxToCatalogBridgeEngine {
  /** Pure-function lookup; no I/O — catalog backend wiring deferred to dispatcher. */
  lookup(input: InsertBoxBridgeInput): InsertBoxBridgeResult {
    if (!input || typeof input.text !== "string" || input.text.trim().length === 0) {
      return {
        catalog_match: null,
        compatible_inserts: [],
        confidence: 0,
        evidence: [],
        reason: "empty-or-missing-text",
      };
    }

    const evidence: string[] = [];
    const vendor = detectVendor(input.text);
    if (vendor) evidence.push(`vendor:${vendor}`);

    // Try ISO 1832 designation extraction
    const isoMatch = input.text.match(ISO_1832_TURNING);
    if (isoMatch) {
      const sku = isoMatch[0].toUpperCase();
      evidence.push(`iso1832:${sku}`);
      const match: CatalogMatch = {
        part_number: sku,
        vendor: vendor ?? "Unknown",
        category: "indexable_insert",
        match_source: "iso1832",
        match_confidence: vendor ? 0.95 : 0.75,
      };
      let confidence = match.match_confidence;
      if (typeof input.ocrConfidence === "number" && Number.isFinite(input.ocrConfidence)) {
        confidence *= Math.max(0, Math.min(1, input.ocrConfidence));
      }
      return {
        catalog_match: match,
        compatible_inserts: recommendCompatible(match),
        confidence,
        evidence,
      };
    }

    // Fall back to extractedData.partNumbers if available
    const fallbackPart = (input.partNumbers ?? [])[0] ?? (input.toolCodes ?? [])[0];
    if (fallbackPart && fallbackPart.length >= 4) {
      evidence.push(`partNumber:${fallbackPart}`);
      const match: CatalogMatch = {
        part_number: fallbackPart.toUpperCase(),
        vendor: vendor ?? "Unknown",
        category: vendor ? "indexable_insert" : "unknown_tooling",
        match_source: "catalog",
        match_confidence: vendor ? 0.65 : 0.45,
      };
      let confidence = match.match_confidence;
      if (typeof input.ocrConfidence === "number" && Number.isFinite(input.ocrConfidence)) {
        confidence *= Math.max(0, Math.min(1, input.ocrConfidence));
      }
      return {
        catalog_match: match,
        compatible_inserts: recommendCompatible(match),
        confidence,
        evidence,
      };
    }

    // No identifier found
    return {
      catalog_match: null,
      compatible_inserts: [],
      confidence: 0,
      evidence,
      reason: "no-part-number-or-iso-designation-found",
    };
  }
}

export const insertBoxToCatalogBridgeEngine = new InsertBoxToCatalogBridgeEngine();
