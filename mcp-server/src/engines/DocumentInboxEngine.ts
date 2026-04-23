/**
 * DocumentInboxEngine — Unified document intake, classification, and part matching
 *
 * The "DocuRead" engine for PRISM: accepts any manufacturing document
 * (blueprint photo, PO, invoice, packing slip, material cert, quote request)
 * and automatically:
 *   1. Classifies document type via Claude Vision or text analysis
 *   2. Extracts key fields (part numbers, quantities, materials, amounts)
 *   3. Matches to existing PartsLibrary records
 *   4. Links the file via FileStorageEngine
 *   5. Routes to downstream engines (OCR for prints, PO engine for POs, etc.)
 *   6. Creates inbox entries with status tracking
 *
 * This replaces DocuRead (Evernote replacement) within PRISM, giving the shop
 * a single intake for all documents matched to part numbers and programs.
 *
 * Actions:
 *   inbox_ingest       — Accept and classify a new document
 *   inbox_list         — List inbox items with filters
 *   inbox_get          — Get a single inbox item with all extracted data
 *   inbox_match_part   — Manually match/override part number link
 *   inbox_batch_ingest — Accept multiple documents at once
 *   inbox_search       — Full-text search across all ingested documents
 *   inbox_stats        — Dashboard statistics
 *   inbox_update_status — Update processing status
 *
 * @module engines/DocumentInboxEngine
 * @version 1.0.0
 */

import * as crypto from "crypto";
import { log } from "../utils/Logger.js";
import { blueprintVisionOCREngine } from "./BlueprintVisionOCREngine.js";
import type { BlueprintAnalysis } from "./BlueprintOCREngine.js";
import { partsLibraryEngine } from "./PartsLibraryEngine.js";
import { fileStorageEngine } from "./FileStorageEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType =
  | "blueprint"       // Engineering drawing / print
  | "purchase_order"  // PO from customer or to supplier
  | "invoice"         // Customer or vendor invoice
  | "packing_slip"    // Shipping/receiving document
  | "material_cert"   // Mill cert, test cert
  | "quote_request"   // RFQ from customer
  | "setup_sheet"     // Machine setup instructions
  | "inspection"      // CMM report, first article, dimensional report
  | "program"         // CNC program printout or file
  | "photo"           // Shop floor photo (part, setup, damage)
  | "correspondence"  // Email, letter, fax
  | "unknown";

export type InboxStatus =
  | "received"        // Just ingested, not yet processed
  | "classifying"     // Classification in progress
  | "classified"      // Type determined, awaiting extraction
  | "extracting"      // Data extraction in progress
  | "extracted"       // Data extracted, awaiting matching
  | "matched"         // Matched to part number(s)
  | "unmatched"       // Could not auto-match — needs manual review
  | "linked"          // Linked to part library + file storage
  | "error"           // Processing failed
  | "archived";       // Done, moved to archive

export interface InboxItem {
  id: string;
  /** Original filename or description */
  original_name: string;
  /** Detected or manually set document type */
  document_type: DocumentType;
  /** Classification confidence (0-1) */
  classification_confidence: number;
  /** Processing status */
  status: InboxStatus;
  /** Error message if status === 'error' */
  error_message?: string;
  /** Extracted part numbers (may be multiple per document) */
  part_numbers: string[];
  /** Matched PartsLibrary IDs */
  matched_part_ids: string[];
  /** Linked FileStorage ID */
  file_id?: string;
  /** Extracted fields — varies by document type */
  extracted_data: ExtractedDocumentData;
  /** Source of the document */
  source: DocumentSource;
  /** Tags for organization */
  tags: string[];
  /** Linked downstream records (PO ID, invoice ID, etc.) */
  linked_records: LinkedRecord[];
  /** Processing timestamps */
  received_at: string;
  classified_at?: string;
  extracted_at?: string;
  matched_at?: string;
  /** Who ingested it */
  ingested_by?: string;
  /** Notes / comments */
  notes: string[];
}

export interface DocumentSource {
  type: "upload" | "email" | "scan" | "photo" | "api" | "batch";
  origin?: string;     // e.g., email address, scanner name
  batch_id?: string;   // if part of a batch
}

export interface ExtractedDocumentData {
  /** Title block / header info */
  title?: string;
  /** Customer or vendor name */
  company_name?: string;
  /** Date on the document */
  document_date?: string;
  /** Document reference number (PO#, invoice#, drawing#) */
  reference_number?: string;
  /** Revision level */
  revision?: string;
  /** Material specification */
  material?: string;
  /** Quantity */
  quantity?: number;
  /** Total amount (for financial docs) */
  total_amount?: number;
  /** Currency */
  currency?: string;
  /** Line items (for POs, invoices) */
  line_items?: ExtractedLineItem[];
  /** Dimensions (for blueprints) */
  dimensions?: ExtractedDimensionSummary[];
  /** Full blueprint analysis (when available) */
  blueprint_analysis?: BlueprintAnalysis;
  /** Raw extracted text */
  raw_text?: string;
  /** Additional key-value pairs */
  custom_fields: Record<string, string>;
}

export interface ExtractedLineItem {
  line_number: number;
  part_number?: string;
  description: string;
  quantity: number;
  unit_price?: number;
  total?: number;
  material?: string;
  due_date?: string;
}

export interface ExtractedDimensionSummary {
  label: string;
  value: number;
  unit: "mm" | "inch";
  tolerance_plus?: number;
  tolerance_minus?: number;
}

export interface LinkedRecord {
  type: "part" | "purchase_order" | "invoice" | "job" | "program" | "inspection";
  id: string;
  label: string;
}

export interface IngestInput {
  /** File content as base64 string */
  content_base64?: string;
  /** Or file path on server */
  file_path?: string;
  /** Original filename */
  filename: string;
  /** MIME type (auto-detected if omitted) */
  mime_type?: string;
  /** Hint: what type of document is this? */
  type_hint?: DocumentType;
  /** Source metadata */
  source?: DocumentSource;
  /** Tags to apply */
  tags?: string[];
  /** Who is uploading */
  ingested_by?: string;
  /** Skip auto-classification (use type_hint as-is) */
  skip_classification?: boolean;
  /** Skip auto-matching to parts */
  skip_matching?: boolean;
}

export interface IngestResult {
  inbox_item: InboxItem;
  classification: {
    type: DocumentType;
    confidence: number;
    alternatives: Array<{ type: DocumentType; confidence: number }>;
  };
  matching: {
    matched: boolean;
    part_numbers_found: string[];
    parts_matched: Array<{ part_number: string; part_id: string; confidence: number }>;
    unmatched_part_numbers: string[];
  };
  file_id?: string;
  processing_time_ms: number;
}

export interface InboxListInput {
  status?: InboxStatus;
  document_type?: DocumentType;
  part_number?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  query?: string;
  limit?: number;
  offset?: number;
  sort_by?: "received_at" | "document_type" | "status";
  sort_order?: "asc" | "desc";
}

export interface InboxStats {
  total_items: number;
  by_status: Record<InboxStatus, number>;
  by_type: Record<DocumentType, number>;
  matched_count: number;
  unmatched_count: number;
  today_count: number;
  this_week_count: number;
  recent_items: InboxItem[];
  top_part_numbers: Array<{ part_number: string; count: number }>;
}

// ============================================================================
// CLASSIFICATION PATTERNS
// ============================================================================

/** Keywords that indicate document type from filename or extracted text */
const CLASSIFICATION_PATTERNS: Record<DocumentType, RegExp[]> = {
  blueprint: [
    /\bdrawing\b/i, /\bprint\b/i, /\bblueprint\b/i, /\bDWG\b/,
    /\brev\s*[A-Z0-9]/i, /\bscale\s*[:=]/i, /\btolerances?\b/i,
    /\bGD&?T\b/i, /\bsection\s+[A-Z]-[A-Z]/i, /\bdetail\s+[A-Z]/i,
    /\.dxf$/i, /\.dwg$/i, /\bsheet\s+\d+\s+of\s+\d+/i,
  ],
  purchase_order: [
    /\bpurchase\s*order\b/i, /\bP\.?O\.?\s*#?\s*\d/i, /\bPO\s*number/i,
    /\border\s*confirmation\b/i, /\bship\s*to\b/i, /\bbill\s*to\b/i,
    /\bline\s*items?\b/i, /\border\s*date\b/i,
  ],
  invoice: [
    /\binvoice\b/i, /\bINV[\s-]*#?\s*\d/i, /\bamount\s*due\b/i,
    /\bbalance\s*due\b/i, /\bpayment\s*terms?\b/i, /\bnet\s*\d+\b/i,
    /\btax\b/i, /\bsubtotal\b/i, /\bremit\s*to\b/i,
  ],
  packing_slip: [
    /\bpacking\s*slip\b/i, /\bpacking\s*list\b/i, /\bshipping\s*note\b/i,
    /\bBOL\b/, /\bbill\s*of\s*lading\b/i, /\bshipment\b/i,
    /\btracking\s*#?\s*\d/i, /\bfreight\b/i,
  ],
  material_cert: [
    /\bmill\s*cert/i, /\bmaterial\s*cert/i, /\btest\s*cert/i,
    /\bcertificate\s*of\s*conformance\b/i, /\bCofC\b/i, /\bMTR\b/,
    /\bheat\s*number\b/i, /\bchemical\s*analysis\b/i,
    /\bmechanical\s*properties\b/i, /\byield\s*strength\b/i,
  ],
  quote_request: [
    /\bRFQ\b/i, /\brequest\s*for\s*quot/i, /\bquote\s*request\b/i,
    /\bplease\s*quote\b/i, /\bquotation\b/i, /\bbid\s*request\b/i,
  ],
  setup_sheet: [
    /\bsetup\s*sheet\b/i, /\bjob\s*setup\b/i, /\btool\s*list\b/i,
    /\bfixture\b/i, /\bwork\s*offset\b/i, /\bG5[4-9]\b/,
    /\btool\s*#?\s*\d/i, /\bvise\b/i,
  ],
  inspection: [
    /\binspection\s*report\b/i, /\bCMM\b/, /\bfirst\s*article\b/i,
    /\bFAI\b/, /\bAS\s*9102\b/i, /\bdimensional\s*report\b/i,
    /\bPPAP\b/i, /\bmeasurement\b/i,
  ],
  program: [
    /\b[OG]\d{2,4}\b/, /\bM0[0-9]\b/, /\bG[04][012]\b/,
    /\.nc$/i, /\.tap$/i, /\.mpf$/i, /\.cnc$/i,
    /\bprogram\s*#?\s*\d/i, /\bN\d+\s*G/,
  ],
  photo: [
    /\bphoto\b/i, /\bpicture\b/i, /\bimage\b/i, /\bIMG_/i,
    /\bDSC_/i, /\bscreenshot\b/i,
  ],
  correspondence: [
    /\bRE:\s/i, /\bFW:\s/i, /\bFrom:\s/i, /\bSubject:\s/i,
    /\bemail\b/i, /\bletter\b/i, /\bfax\b/i, /\bmemo\b/i,
  ],
  unknown: [],
};

/** Part number extraction patterns — common manufacturing formats */
const PART_NUMBER_PATTERNS: RegExp[] = [
  // Common formats: ABC-1234, ABC1234-REV-A, 1234-5678
  /\b([A-Z]{2,6}[-\s]?\d{3,8}(?:[-\s]?[A-Z0-9]{1,4})?)\b/g,
  // P/N: or Part#: prefix
  /(?:P\/?N|Part\s*(?:#|No\.?|Number))\s*[:=]?\s*([A-Z0-9][-A-Z0-9./ ]{2,30}[A-Z0-9])/gi,
  // Drawing number: DWG-1234
  /(?:DWG|Drawing)\s*(?:#|No\.?)?\s*[:=]?\s*([A-Z0-9][-A-Z0-9./ ]{2,20}[A-Z0-9])/gi,
  // Item number in PO context
  /(?:Item|SKU|Catalog)\s*(?:#|No\.?)?\s*[:=]?\s*([A-Z0-9][-A-Z0-9.]{2,20})/gi,
];

/** MIME type detection from filename */
function detectMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg", jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    tif: "image/tiff", tiff: "image/tiff",
    dxf: "application/dxf",
    dwg: "application/dwg",
    step: "model/step", stp: "model/step",
    iges: "model/iges", igs: "model/iges",
    nc: "text/x-gcode", tap: "text/x-gcode", mpf: "text/x-gcode",
    txt: "text/plain",
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return mimeMap[ext] || "application/octet-stream";
}

// ============================================================================
// ENGINE
// ============================================================================

class DocumentInboxEngine {
  private items: Map<string, InboxItem> = new Map();
  private nextId = 1;

  // --------------------------------------------------------------------------
  // INGEST — Accept and process a new document
  // --------------------------------------------------------------------------

  /**
   * Ingest a document into the inbox pipeline.
   * Classifies, extracts data, matches to parts, and stores the file.
   *
   * @param input - Document content, filename, and options
   * @returns IngestResult with classification, matching, and inbox item
   */
  async ingest(input: IngestInput): Promise<IngestResult> {
    const startTime = Date.now();
    const id = `DOC-${String(this.nextId++).padStart(6, "0")}`;
    const now = new Date().toISOString();
    const mime = input.mime_type || detectMimeType(input.filename);

    // Create initial inbox item
    const item: InboxItem = {
      id,
      original_name: input.filename,
      document_type: input.type_hint || "unknown",
      classification_confidence: input.type_hint ? 0.9 : 0,
      status: "received",
      part_numbers: [],
      matched_part_ids: [],
      extracted_data: { custom_fields: {} },
      source: input.source || { type: "upload" },
      tags: input.tags || [],
      linked_records: [],
      received_at: now,
      ingested_by: input.ingested_by,
      notes: [],
    };

    this.items.set(id, item);

    // Step 1: Store file
    let fileId: string | undefined;
    if (input.content_base64) {
      try {
        const uploadResult = await fileStorageEngine.upload({
          content: input.content_base64,
          original_name: input.filename,
          mime_type: mime,
          uploaded_by: input.ingested_by,
        });
        fileId = uploadResult.file_id;
        item.file_id = fileId;
      } catch (err) {
        log.warn(`DocumentInbox: file storage failed for ${id}: ${err}`);
      }
    }

    // Step 2: Classify document type
    let classification: IngestResult["classification"] = {
      type: item.document_type,
      confidence: item.classification_confidence,
      alternatives: [],
    };

    if (!input.skip_classification && item.document_type === "unknown") {
      item.status = "classifying";
      classification = await this.classifyDocument(input.filename, mime, input.content_base64);
      item.document_type = classification.type;
      item.classification_confidence = classification.confidence;
      item.classified_at = new Date().toISOString();
    }
    item.status = "classified";

    // Step 3: Extract data based on document type
    item.status = "extracting";
    try {
      const extracted = await this.extractData(item, mime, input.content_base64);
      item.extracted_data = extracted;
      item.extracted_at = new Date().toISOString();
      item.status = "extracted";
    } catch (err) {
      log.warn(`DocumentInbox: extraction failed for ${id}: ${err}`);
      item.status = "error";
      item.error_message = `Extraction failed: ${err}`;
    }

    // Step 4: Extract part numbers from all available text
    const partNumbers = this.extractPartNumbers(item);
    item.part_numbers = partNumbers;

    // Step 5: Match to PartsLibrary
    let matching: IngestResult["matching"] = {
      matched: false,
      part_numbers_found: partNumbers,
      parts_matched: [],
      unmatched_part_numbers: partNumbers,
    };

    if (!input.skip_matching && partNumbers.length > 0) {
      matching = await this.matchToParts(partNumbers);
      item.matched_part_ids = matching.parts_matched.map(m => m.part_id);
      item.linked_records.push(
        ...matching.parts_matched.map(m => ({
          type: "part" as const,
          id: m.part_id,
          label: m.part_number,
        }))
      );
      item.matched_at = new Date().toISOString();
      item.status = matching.matched ? "matched" : "unmatched";
    }

    // Step 6: Link file to matched parts
    if (fileId && item.matched_part_ids.length > 0) {
      for (const partId of item.matched_part_ids) {
        try {
          await fileStorageEngine.attach({
            file_id: fileId,
            entity_type: "part",
            entity_id: partId,
            attachment_type: item.document_type,
            attached_by: input.ingested_by,
          });
        } catch (err) {
          log.warn(`DocumentInbox: file attach failed for ${id} → part ${partId}: ${err}`);
        }
      }
      item.status = "linked";
    }

    this.items.set(id, item);
    const processingTime = Date.now() - startTime;

    log.info(`DocumentInbox: ingested ${id} as ${item.document_type} ` +
      `(${classification.confidence.toFixed(2)} conf) ` +
      `→ ${partNumbers.length} P/N found, ${matching.parts_matched.length} matched ` +
      `in ${processingTime}ms`);

    return {
      inbox_item: item,
      classification,
      matching,
      file_id: fileId,
      processing_time_ms: processingTime,
    };
  }

  // --------------------------------------------------------------------------
  // CLASSIFY — Determine document type
  // --------------------------------------------------------------------------

  private async classifyDocument(
    filename: string,
    mime: string,
    contentBase64?: string
  ): Promise<IngestResult["classification"]> {
    const scores: Array<{ type: DocumentType; confidence: number }> = [];

    // Score by filename patterns
    for (const [docType, patterns] of Object.entries(CLASSIFICATION_PATTERNS)) {
      if (docType === "unknown") continue;
      let filenameHits = 0;
      for (const pattern of patterns) {
        if (pattern.test(filename)) filenameHits++;
      }
      if (filenameHits > 0) {
        scores.push({
          type: docType as DocumentType,
          confidence: Math.min(0.9, 0.3 + filenameHits * 0.2),
        });
      }
    }

    // Score by MIME type
    if (mime.startsWith("image/")) {
      // Images are usually blueprints or photos in a shop context
      const photoScore = scores.find(s => s.type === "photo");
      const bpScore = scores.find(s => s.type === "blueprint");
      if (!photoScore && !bpScore) {
        scores.push({ type: "blueprint", confidence: 0.4 });
        scores.push({ type: "photo", confidence: 0.3 });
      }
    } else if (mime === "application/pdf") {
      // PDFs could be anything — boost existing matches
      for (const s of scores) s.confidence = Math.min(1.0, s.confidence + 0.1);
    } else if (mime === "application/dxf" || mime === "application/dwg") {
      scores.push({ type: "blueprint", confidence: 0.95 });
    } else if (mime === "text/x-gcode") {
      scores.push({ type: "program", confidence: 0.95 });
    } else if (mime === "model/step" || mime === "model/iges") {
      scores.push({ type: "blueprint", confidence: 0.85 });
    }

    // If we have image content and it could be a blueprint, try OCR quick extract
    if (contentBase64 && mime.startsWith("image/") && scores.some(s => s.type === "blueprint")) {
      try {
        const quickResult = await blueprintVisionOCREngine.quickExtract({
          image: { type: "base64", data: contentBase64, media_type: mime as "image/jpeg" },
        });
        if (quickResult && quickResult.dimension_count > 0) {
          // Has dimensions → definitely a blueprint
          const bpScore = scores.find(s => s.type === "blueprint");
          if (bpScore) bpScore.confidence = Math.min(1.0, bpScore.confidence + 0.4);
          else scores.push({ type: "blueprint", confidence: 0.85 });
        }
      } catch {
        // OCR failed — no problem, rely on other signals
      }
    }

    // Sort by confidence descending
    scores.sort((a, b) => b.confidence - a.confidence);

    const best = scores[0] || { type: "unknown" as DocumentType, confidence: 0.1 };
    return {
      type: best.type,
      confidence: best.confidence,
      alternatives: scores.slice(1, 4),
    };
  }

  // --------------------------------------------------------------------------
  // EXTRACT — Pull structured data from the document
  // --------------------------------------------------------------------------

  private async extractData(
    item: InboxItem,
    mime: string,
    contentBase64?: string
  ): Promise<ExtractedDocumentData> {
    const data: ExtractedDocumentData = { custom_fields: {} };

    switch (item.document_type) {
      case "blueprint": {
        if (contentBase64 && mime.startsWith("image/")) {
          try {
            const analysis = await blueprintVisionOCREngine.analyzeBlueprint({
              image: { type: "base64", data: contentBase64, media_type: mime as "image/jpeg" },
              blueprint_type: "general",
              extract_geometry: true,
            });
            data.blueprint_analysis = analysis;
            data.title = analysis.title_block?.title || analysis.title_block?.drawing_number;
            data.reference_number = analysis.title_block?.drawing_number;
            data.revision = analysis.title_block?.revision;
            data.material = analysis.title_block?.material;
            data.company_name = analysis.title_block?.drawn_by;
            data.dimensions = analysis.dimensions?.map(d => ({
              label: d.raw_text || `${d.type} ${d.nominal}`,
              value: d.nominal,
              unit: (d.unit || "mm") as "mm" | "inch",
              tolerance_plus: d.tolerance?.upper,
              tolerance_minus: d.tolerance?.lower,
            }));
          } catch (err) {
            log.warn(`DocumentInbox: blueprint OCR failed: ${err}`);
          }
        }
        // Also extract raw text for part number matching (text-based formats)
        if (contentBase64) {
          const text = this.decodeTextContent(contentBase64, mime);
          if (text) data.raw_text = text;
        }
        break;
      }

      case "purchase_order":
      case "invoice":
      case "quote_request": {
        // For financial documents, extract text and parse structured fields
        if (contentBase64) {
          const text = this.decodeTextContent(contentBase64, mime);
          if (text) {
            data.raw_text = text;
            this.extractFinancialFields(text, data);
          }
        }
        break;
      }

      case "material_cert": {
        if (contentBase64) {
          const text = this.decodeTextContent(contentBase64, mime);
          if (text) {
            data.raw_text = text;
            this.extractCertFields(text, data);
          }
        }
        break;
      }

      default: {
        // Generic text extraction for other types
        if (contentBase64) {
          const text = this.decodeTextContent(contentBase64, mime);
          if (text) data.raw_text = text;
        }
      }
    }

    return data;
  }

  /** Decode base64 content to text (for text-based formats) */
  private decodeTextContent(base64: string, mime: string): string | null {
    const textMimes = [
      "text/plain", "text/csv", "text/x-gcode",
      "application/json",
    ];
    if (textMimes.includes(mime) || mime.startsWith("text/")) {
      try {
        return Buffer.from(base64, "base64").toString("utf-8");
      } catch { return null; }
    }
    // For PDFs and images, we'd need OCR — that's handled separately
    return null;
  }

  /** Extract PO/invoice fields from text */
  private extractFinancialFields(text: string, data: ExtractedDocumentData): void {
    // PO / Invoice number
    const poMatch = text.match(/(?:P\.?O\.?|Purchase\s*Order|Invoice)\s*#?\s*[:=]?\s*([A-Z0-9][-A-Z0-9]{2,20})/i);
    if (poMatch) data.reference_number = poMatch[1].trim();

    // Date
    const dateMatch = text.match(/(?:Date|Order\s*Date|Invoice\s*Date)\s*[:=]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
    if (dateMatch) data.document_date = dateMatch[1];

    // Company
    const companyMatch = text.match(/(?:Bill\s*To|Ship\s*To|Customer|Vendor)\s*[:=]?\s*\n?\s*([A-Z][A-Za-z &.,'-]+)/i);
    if (companyMatch) data.company_name = companyMatch[1].trim();

    // Total
    const totalMatch = text.match(/(?:Total|Amount\s*Due|Balance\s*Due|Grand\s*Total)\s*[:=]?\s*\$?([\d,]+\.?\d{0,2})/i);
    if (totalMatch) {
      data.total_amount = parseFloat(totalMatch[1].replace(/,/g, ""));
      data.currency = "USD";
    }

    // Line items (simple pattern)
    const lines: ExtractedLineItem[] = [];
    const linePattern = /(\d+)\s+([A-Z0-9][-A-Z0-9./]{2,20})\s+(.{10,60}?)\s+(\d+)\s+\$?([\d,.]+)\s+\$?([\d,.]+)/gi;
    let lineMatch: RegExpExecArray | null;
    while ((lineMatch = linePattern.exec(text)) !== null) {
      lines.push({
        line_number: parseInt(lineMatch[1]),
        part_number: lineMatch[2],
        description: lineMatch[3].trim(),
        quantity: parseInt(lineMatch[4]),
        unit_price: parseFloat(lineMatch[5].replace(/,/g, "")),
        total: parseFloat(lineMatch[6].replace(/,/g, "")),
      });
    }
    if (lines.length > 0) data.line_items = lines;
  }

  /** Extract material cert fields from text */
  private extractCertFields(text: string, data: ExtractedDocumentData): void {
    // Heat number
    const heatMatch = text.match(/(?:Heat|Lot)\s*(?:#|No\.?|Number)\s*[:=]?\s*([A-Z0-9][-A-Z0-9]{3,20})/i);
    if (heatMatch) data.custom_fields.heat_number = heatMatch[1];

    // Material spec
    const specMatch = text.match(/(?:Spec|Specification|Grade|Material)\s*[:=]?\s*([A-Z0-9][-A-Z0-9 ./]{2,30})/i);
    if (specMatch) data.material = specMatch[1].trim();

    // Yield strength
    const yieldMatch = text.match(/(?:Yield\s*(?:Strength)?|YS|0\.2%\s*Proof)\s*[:=]?\s*([\d,.]+)\s*(ksi|MPa|psi)/i);
    if (yieldMatch) {
      data.custom_fields.yield_strength = yieldMatch[1];
      data.custom_fields.yield_strength_unit = yieldMatch[2];
    }

    // Tensile strength
    const tensileMatch = text.match(/(?:Tensile\s*(?:Strength)?|UTS|Ultimate\s*(?:Tensile)?)\s*[:=]?\s*([\d,.]+)\s*(ksi|MPa|psi)/i);
    if (tensileMatch) {
      data.custom_fields.tensile_strength = tensileMatch[1];
      data.custom_fields.tensile_strength_unit = tensileMatch[2];
    }

    // Hardness
    const hardnessMatch = text.match(/(?:Hardness|HRC|HRB|BHN)\s*[:=]?\s*([\d.]+)/i);
    if (hardnessMatch) data.custom_fields.hardness = hardnessMatch[1];
  }

  // --------------------------------------------------------------------------
  // PART NUMBER EXTRACTION & MATCHING
  // --------------------------------------------------------------------------

  /** Extract part numbers from all available text in the inbox item */
  private extractPartNumbers(item: InboxItem): string[] {
    const candidates = new Set<string>();

    // From reference number
    if (item.extracted_data.reference_number) {
      candidates.add(item.extracted_data.reference_number);
    }

    // From blueprint analysis title block
    if (item.extracted_data.blueprint_analysis?.title_block?.drawing_number) {
      candidates.add(item.extracted_data.blueprint_analysis.title_block.drawing_number);
    }
    if (item.extracted_data.blueprint_analysis?.title_block?.part_number) {
      candidates.add(item.extracted_data.blueprint_analysis.title_block.part_number);
    }

    // From line items
    if (item.extracted_data.line_items) {
      for (const li of item.extracted_data.line_items) {
        if (li.part_number) candidates.add(li.part_number);
      }
    }

    // From raw text via patterns
    const searchText = [
      item.original_name,
      item.extracted_data.raw_text || "",
      item.extracted_data.title || "",
    ].join(" ");

    for (const pattern of PART_NUMBER_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(searchText)) !== null) {
        const pn = (match[1] || match[0]).trim();
        // Filter out obvious false positives
        if (pn.length >= 4 && !/^\d{4}$/.test(pn) && !/^[A-Z]{4}$/.test(pn)) {
          candidates.add(pn);
        }
      }
    }

    return [...candidates];
  }

  /** Match extracted part numbers against PartsLibrary */
  private async matchToParts(
    partNumbers: string[]
  ): Promise<IngestResult["matching"]> {
    const result: IngestResult["matching"] = {
      matched: false,
      part_numbers_found: partNumbers,
      parts_matched: [],
      unmatched_part_numbers: [],
    };

    for (const pn of partNumbers) {
      try {
        const searchResult = await partsLibraryEngine.search({ query: pn, limit: 3 });
        const exactMatch = searchResult.parts.find(
          p => p.part_number.toLowerCase() === pn.toLowerCase()
        );

        if (exactMatch) {
          result.parts_matched.push({
            part_number: pn,
            part_id: exactMatch.id,
            confidence: 1.0,
          });
        } else if (searchResult.parts.length > 0) {
          // Fuzzy match — check if close enough
          const best = searchResult.parts[0];
          const similarity = this.stringSimilarity(pn.toLowerCase(), best.part_number.toLowerCase());
          if (similarity > 0.8) {
            result.parts_matched.push({
              part_number: pn,
              part_id: best.id,
              confidence: similarity,
            });
          } else {
            result.unmatched_part_numbers.push(pn);
          }
        } else {
          result.unmatched_part_numbers.push(pn);
        }
      } catch {
        result.unmatched_part_numbers.push(pn);
      }
    }

    result.matched = result.parts_matched.length > 0;
    return result;
  }

  /** Simple string similarity (Dice coefficient) */
  private stringSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length < 2 || b.length < 2) return 0;
    const bigramsA = new Set<string>();
    for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.substring(i, i + 2));
    let intersection = 0;
    for (let i = 0; i < b.length - 1; i++) {
      if (bigramsA.has(b.substring(i, i + 2))) intersection++;
    }
    return (2 * intersection) / (a.length - 1 + b.length - 1);
  }

  // --------------------------------------------------------------------------
  // LIST & SEARCH
  // --------------------------------------------------------------------------

  /** List inbox items with filters */
  list(input: InboxListInput = {}): { items: InboxItem[]; total: number } {
    let items = [...this.items.values()];

    if (input.status) items = items.filter(i => i.status === input.status);
    if (input.document_type) items = items.filter(i => i.document_type === input.document_type);
    if (input.part_number) {
      const pn = input.part_number.toLowerCase();
      items = items.filter(i => i.part_numbers.some(p => p.toLowerCase().includes(pn)));
    }
    if (input.tags?.length) {
      items = items.filter(i => input.tags!.some(t => i.tags.includes(t)));
    }
    if (input.query) {
      const q = input.query.toLowerCase();
      items = items.filter(i =>
        i.original_name.toLowerCase().includes(q) ||
        i.extracted_data.title?.toLowerCase().includes(q) ||
        i.extracted_data.company_name?.toLowerCase().includes(q) ||
        i.extracted_data.reference_number?.toLowerCase().includes(q) ||
        i.extracted_data.raw_text?.toLowerCase().includes(q) ||
        i.part_numbers.some(pn => pn.toLowerCase().includes(q))
      );
    }
    if (input.date_from) {
      items = items.filter(i => i.received_at >= input.date_from!);
    }
    if (input.date_to) {
      items = items.filter(i => i.received_at <= input.date_to!);
    }

    // Sort
    const sortBy = input.sort_by || "received_at";
    const sortOrder = input.sort_order || "desc";
    items.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aVal = String((a as any)[sortBy] ?? "");
      const bVal = String((b as any)[sortBy] ?? "");
      const cmp = aVal.localeCompare(bVal);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const total = items.length;
    const offset = input.offset || 0;
    const limit = input.limit || 50;
    items = items.slice(offset, offset + limit);

    return { items, total };
  }

  /** Get a single inbox item by ID */
  get(id: string): InboxItem | null {
    return this.items.get(id) || null;
  }

  /** Search across all extracted text */
  search(query: string, limit = 20): InboxItem[] {
    const q = query.toLowerCase();
    const scored: Array<{ item: InboxItem; score: number }> = [];

    for (const item of this.items.values()) {
      let score = 0;
      if (item.original_name.toLowerCase().includes(q)) score += 3;
      if (item.part_numbers.some(pn => pn.toLowerCase().includes(q))) score += 5;
      if (item.extracted_data.reference_number?.toLowerCase().includes(q)) score += 4;
      if (item.extracted_data.title?.toLowerCase().includes(q)) score += 3;
      if (item.extracted_data.company_name?.toLowerCase().includes(q)) score += 2;
      if (item.extracted_data.raw_text?.toLowerCase().includes(q)) score += 1;
      if (item.tags.some(t => t.toLowerCase().includes(q))) score += 2;
      if (score > 0) scored.push({ item, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.item);
  }

  // --------------------------------------------------------------------------
  // MANUAL OPERATIONS
  // --------------------------------------------------------------------------

  /** Manually match or override a part number link */
  async matchPart(
    inboxId: string,
    partNumber: string,
    partId?: string
  ): Promise<{ success: boolean; message: string }> {
    const item = this.items.get(inboxId);
    if (!item) return { success: false, message: `Inbox item ${inboxId} not found` };

    // If partId provided, use it directly
    if (partId) {
      if (!item.part_numbers.includes(partNumber)) {
        item.part_numbers.push(partNumber);
      }
      if (!item.matched_part_ids.includes(partId)) {
        item.matched_part_ids.push(partId);
        item.linked_records.push({ type: "part", id: partId, label: partNumber });
      }
      item.status = "matched";
      item.matched_at = new Date().toISOString();
      return { success: true, message: `Linked ${inboxId} to part ${partNumber} (${partId})` };
    }

    // Otherwise search for the part
    const searchResult = await partsLibraryEngine.search({ query: partNumber, limit: 1 });
    if (searchResult.parts.length === 0) {
      return { success: false, message: `Part number '${partNumber}' not found in library` };
    }

    const part = searchResult.parts[0];
    if (!item.part_numbers.includes(partNumber)) {
      item.part_numbers.push(partNumber);
    }
    if (!item.matched_part_ids.includes(part.id)) {
      item.matched_part_ids.push(part.id);
      item.linked_records.push({ type: "part", id: part.id, label: partNumber });
    }
    item.status = "matched";
    item.matched_at = new Date().toISOString();
    return { success: true, message: `Linked ${inboxId} to part ${partNumber} (${part.id})` };
  }

  /** Update status of an inbox item */
  updateStatus(
    id: string,
    status: InboxStatus,
    note?: string
  ): { success: boolean; message: string } {
    const item = this.items.get(id);
    if (!item) return { success: false, message: `Inbox item ${id} not found` };
    item.status = status;
    if (note) item.notes.push(`[${new Date().toISOString()}] ${note}`);
    return { success: true, message: `Updated ${id} status to ${status}` };
  }

  /** Add a note to an inbox item */
  addNote(id: string, note: string): { success: boolean } {
    const item = this.items.get(id);
    if (!item) return { success: false };
    item.notes.push(`[${new Date().toISOString()}] ${note}`);
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // BATCH INGEST
  // --------------------------------------------------------------------------

  /** Ingest multiple documents at once */
  async batchIngest(
    inputs: IngestInput[]
  ): Promise<{ results: IngestResult[]; summary: { total: number; classified: number; matched: number; errors: number } }> {
    const batchId = `BATCH-${Date.now()}`;
    const results: IngestResult[] = [];
    let classified = 0;
    let matched = 0;
    let errors = 0;

    for (const input of inputs) {
      input.source = input.source || { type: "batch", batch_id: batchId };
      try {
        const result = await this.ingest(input);
        results.push(result);
        if (result.classification.confidence > 0.5) classified++;
        if (result.matching.matched) matched++;
      } catch (err) {
        errors++;
        log.error(`DocumentInbox: batch ingest failed for ${input.filename}: ${err}`);
      }
    }

    return {
      results,
      summary: {
        total: inputs.length,
        classified,
        matched,
        errors,
      },
    };
  }

  // --------------------------------------------------------------------------
  // STATS / DASHBOARD
  // --------------------------------------------------------------------------

  /** Get inbox statistics for dashboard */
  stats(): InboxStats {
    const items = [...this.items.values()];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let matchedCount = 0;
    let unmatchedCount = 0;
    let todayCount = 0;
    let weekCount = 0;
    const partCounts: Record<string, number> = {};

    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      byType[item.document_type] = (byType[item.document_type] || 0) + 1;
      if (item.matched_part_ids.length > 0) matchedCount++;
      else if (item.status !== "received" && item.status !== "classifying") unmatchedCount++;
      if (item.received_at.startsWith(todayStr)) todayCount++;
      if (item.received_at >= weekAgo) weekCount++;
      for (const pn of item.part_numbers) {
        partCounts[pn] = (partCounts[pn] || 0) + 1;
      }
    }

    const topParts = Object.entries(partCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([part_number, count]) => ({ part_number, count }));

    return {
      total_items: items.length,
      by_status: byStatus as Record<InboxStatus, number>,
      by_type: byType as Record<DocumentType, number>,
      matched_count: matchedCount,
      unmatched_count: unmatchedCount,
      today_count: todayCount,
      this_week_count: weekCount,
      recent_items: items
        .sort((a, b) => b.received_at.localeCompare(a.received_at))
        .slice(0, 10),
      top_part_numbers: topParts,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const documentInboxEngine = new DocumentInboxEngine();
