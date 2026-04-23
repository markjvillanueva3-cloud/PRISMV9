/**
 * BusinessDocumentExtractorEngine — OCR + extraction for POs, invoices, RFQs
 *
 * Extracts structured data from business documents (POs, invoices, RFQs)
 * and routes to PurchaseOrderEngine, VendorEngine, or quote pipeline.
 * Supports manual extraction input or auto-extraction from parsed text.
 *
 * INGEST-MS5 / U-BIZ01
 * @module BusinessDocumentExtractorEngine
 */

import { log } from "../utils/Logger.js";
import { persistenceBridge } from "../db/PersistenceBridge.js";

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType = "purchase_order" | "invoice" | "rfq" | "packing_slip" | "unknown";

export interface LineItem {
  line_number: number;
  part_number: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface ExtractedPO {
  po_number: string;
  vendor_name: string;
  vendor_id?: string;
  date: string;
  due_date: string;
  ship_to: string;
  terms: string;
  line_items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
}

export interface ExtractedInvoice {
  invoice_number: string;
  vendor_name: string;
  vendor_id?: string;
  date: string;
  due_date: string;
  po_reference: string;
  line_items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_terms: string;
}

export interface ExtractedRFQ {
  rfq_number: string;
  customer_name: string;
  contact_email: string;
  date: string;
  due_date: string;
  parts: Array<{
    part_number: string;
    description: string;
    quantity: number;
    material: string;
    tolerances: string;
    finish: string;
    delivery_date: string;
  }>;
  notes: string;
  priority: "standard" | "rush" | "urgent";
}

export interface ExtractionResult {
  id: string;
  filename: string;
  document_type: DocumentType;
  confidence: number;
  status: "draft" | "pending_review" | "approved" | "rejected";
  extracted_at: string;
  reviewed_at: string;
  reviewed_by: string;
  po_data?: ExtractedPO;
  invoice_data?: ExtractedInvoice;
  rfq_data?: ExtractedRFQ;
  corrections: Array<{ field: string; original: string; corrected: string }>;
  routed_to: string;
  routed_id: string;
}

export interface ExtractInput {
  filename: string;
  document_type?: DocumentType;
  /** Pre-extracted text content (from OCR or manual) */
  text_content?: string;
  /** Manual extraction data — skips text parsing */
  po_data?: Partial<ExtractedPO>;
  invoice_data?: Partial<ExtractedInvoice>;
  rfq_data?: Partial<ExtractedRFQ>;
}

export interface ExtractionStats {
  total_extractions: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  avg_confidence: number;
  pending_review: number;
  approved_today: number;
}

// ============================================================================
// ENGINE
// ============================================================================

/** Common vendor name aliases for fuzzy matching */
const VENDOR_ALIASES: Record<string, string[]> = {
  "msc industrial": ["msc", "msc industrial supply", "msc ind"],
  "kennametal": ["kmet", "kennametal inc"],
  "sandvik coromant": ["sandvik", "coromant"],
  "mcmaster-carr": ["mcmaster", "mcmaster carr"],
};

class BusinessDocumentExtractorEngine {
  private extractions: Map<string, ExtractionResult> = new Map();
  private nextId = 1;

  // ── Extract ────────────────────────────────────────────────────────

  /**
   * Extract structured data from a document.
   * Accepts manual data or parses from text content.
   */
  extract(input: ExtractInput): ExtractionResult {
    const id = `EXT-${String(this.nextId++).padStart(5, "0")}`;
    const now = new Date().toISOString();

    // Determine document type
    const docType = input.document_type
      ?? this.classifyDocument(input.filename, input.text_content);

    let confidence = 0;
    let poData: ExtractedPO | undefined;
    let invoiceData: ExtractedInvoice | undefined;
    let rfqData: ExtractedRFQ | undefined;

    switch (docType) {
      case "purchase_order":
        poData = this.extractPO(input);
        confidence = this.assessConfidence(poData);
        break;
      case "invoice":
        invoiceData = this.extractInvoice(input);
        confidence = this.assessConfidence(invoiceData);
        break;
      case "rfq":
        rfqData = this.extractRFQ(input);
        confidence = this.assessConfidence(rfqData);
        break;
      default:
        confidence = 0.1;
    }

    const result: ExtractionResult = {
      id,
      filename: input.filename,
      document_type: docType,
      confidence,
      status: confidence >= 0.8 ? "pending_review" : "draft",
      extracted_at: now,
      reviewed_at: "",
      reviewed_by: "",
      po_data: poData,
      invoice_data: invoiceData,
      rfq_data: rfqData,
      corrections: [],
      routed_to: "",
      routed_id: "",
    };

    this.extractions.set(id, result);
    persistenceBridge.persist("extractions", id, result as any);
    log.info(`[BizDocExtractor] Extracted ${id}: ${docType} from ${input.filename} (${(confidence * 100).toFixed(0)}% conf)`);
    return result;
  }

  // ── Document Classification ────────────────────────────────────────

  /**
   * Classify document type from filename and content.
   */
  private classifyDocument(filename: string, text?: string): DocumentType {
    const lower = filename.toLowerCase();
    const content = (text ?? "").toLowerCase();

    if (lower.includes("po") || lower.includes("purchase") || content.includes("purchase order")) {
      return "purchase_order";
    }
    if (lower.includes("inv") || lower.includes("invoice") || content.includes("invoice")) {
      return "invoice";
    }
    if (lower.includes("rfq") || lower.includes("quote") || lower.includes("request for")
        || content.includes("request for quote") || content.includes("rfq")) {
      return "rfq";
    }
    if (lower.includes("packing") || lower.includes("slip") || content.includes("packing slip")) {
      return "packing_slip";
    }

    return "unknown";
  }

  // ── PO Extraction ──────────────────────────────────────────────────

  private extractPO(input: ExtractInput): ExtractedPO {
    if (input.po_data) {
      return {
        po_number: input.po_data.po_number ?? "",
        vendor_name: input.po_data.vendor_name ?? "",
        vendor_id: input.po_data.vendor_id,
        date: input.po_data.date ?? "",
        due_date: input.po_data.due_date ?? "",
        ship_to: input.po_data.ship_to ?? "",
        terms: input.po_data.terms ?? "net30",
        line_items: input.po_data.line_items ?? [],
        subtotal: input.po_data.subtotal ?? 0,
        tax: input.po_data.tax ?? 0,
        total: input.po_data.total ?? 0,
        notes: input.po_data.notes ?? "",
      };
    }

    // Parse from text content
    const text = input.text_content ?? "";
    return {
      po_number: this.extractField(text, /PO\s*#?\s*:?\s*(\S+)/i) ?? "",
      vendor_name: this.extractField(text, /vendor\s*:?\s*(.+?)(?:\n|$)/i) ?? "",
      date: this.extractField(text, /date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ?? "",
      due_date: this.extractField(text, /due\s*(?:date)?\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ?? "",
      ship_to: this.extractField(text, /ship\s*to\s*:?\s*(.+?)(?:\n|$)/i) ?? "",
      terms: this.extractField(text, /terms\s*:?\s*(\S+)/i) ?? "net30",
      line_items: this.extractLineItems(text),
      subtotal: this.extractNumber(text, /subtotal\s*:?\s*\$?([\d,.]+)/i),
      tax: this.extractNumber(text, /tax\s*:?\s*\$?([\d,.]+)/i),
      total: this.extractNumber(text, /(?<![a-z])total\s*:?\s*\$?([\d,.]+)/i),
      notes: "",
    };
  }

  // ── Invoice Extraction ─────────────────────────────────────────────

  private extractInvoice(input: ExtractInput): ExtractedInvoice {
    if (input.invoice_data) {
      return {
        invoice_number: input.invoice_data.invoice_number ?? "",
        vendor_name: input.invoice_data.vendor_name ?? "",
        vendor_id: input.invoice_data.vendor_id,
        date: input.invoice_data.date ?? "",
        due_date: input.invoice_data.due_date ?? "",
        po_reference: input.invoice_data.po_reference ?? "",
        line_items: input.invoice_data.line_items ?? [],
        subtotal: input.invoice_data.subtotal ?? 0,
        tax: input.invoice_data.tax ?? 0,
        total: input.invoice_data.total ?? 0,
        payment_terms: input.invoice_data.payment_terms ?? "net30",
      };
    }

    const text = input.text_content ?? "";
    return {
      invoice_number: this.extractField(text, /invoice[^\S\n]*(?:#|no\.?|number)[^\S\n]*:?[^\S\n]*(\S+)/i) ?? "",
      vendor_name: this.extractField(text, /from\s*:?\s*(.+?)(?:\n|$)/i)
        ?? this.extractField(text, /vendor\s*:?\s*(.+?)(?:\n|$)/i) ?? "",
      date: this.extractField(text, /date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ?? "",
      due_date: this.extractField(text, /due\s*(?:date)?\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ?? "",
      po_reference: this.extractField(text, /PO\s*(?:ref|#)?\s*:?\s*(\S+)/i) ?? "",
      line_items: this.extractLineItems(text),
      subtotal: this.extractNumber(text, /subtotal\s*:?\s*\$?([\d,.]+)/i),
      tax: this.extractNumber(text, /tax\s*:?\s*\$?([\d,.]+)/i),
      total: this.extractNumber(text, /(?<![a-z])total\s*:?\s*\$?([\d,.]+)/i),
      payment_terms: this.extractField(text, /terms\s*:?\s*(\S+)/i) ?? "net30",
    };
  }

  // ── RFQ Extraction ─────────────────────────────────────────────────

  private extractRFQ(input: ExtractInput): ExtractedRFQ {
    if (input.rfq_data) {
      return {
        rfq_number: input.rfq_data.rfq_number ?? "",
        customer_name: input.rfq_data.customer_name ?? "",
        contact_email: input.rfq_data.contact_email ?? "",
        date: input.rfq_data.date ?? "",
        due_date: input.rfq_data.due_date ?? "",
        parts: input.rfq_data.parts ?? [],
        notes: input.rfq_data.notes ?? "",
        priority: input.rfq_data.priority ?? "standard",
      };
    }

    const text = input.text_content ?? "";
    return {
      rfq_number: this.extractField(text, /RFQ\s*#?\s*:?\s*(\S+)/i) ?? "",
      customer_name: this.extractField(text, /(?:from|customer|company)\s*:?\s*(.+?)(?:\n|$)/i) ?? "",
      contact_email: this.extractField(text, /[\w.+-]+@[\w-]+\.[\w.]+/) ?? "",
      date: this.extractField(text, /date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ?? "",
      due_date: this.extractField(text, /(?:due|need by|deliver)\s*(?:date)?\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ?? "",
      parts: [],
      notes: "",
      priority: text.toLowerCase().includes("rush") || text.toLowerCase().includes("urgent") ? "rush" : "standard",
    };
  }

  // ── Parsing Helpers ────────────────────────────────────────────────

  private extractField(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1]?.trim() ?? match[0].trim() : null;
  }

  private extractNumber(text: string, pattern: RegExp): number {
    const match = text.match(pattern);
    if (!match) return 0;
    return parseFloat(match[1].replace(/,/g, "")) || 0;
  }

  private extractLineItems(text: string): LineItem[] {
    // Simple line item extraction from tabular text
    const items: LineItem[] = [];
    const lines = text.split("\n");
    let lineNum = 0;

    for (const line of lines) {
      // Look for patterns like: QTY  PART#  DESCRIPTION  PRICE  TOTAL
      const match = line.match(/(\d+)\s+(\S+)\s+(.+?)\s+\$?([\d,.]+)\s+\$?([\d,.]+)/);
      if (match) {
        lineNum++;
        items.push({
          line_number: lineNum,
          part_number: match[2],
          description: match[3].trim(),
          quantity: parseInt(match[1]),
          unit: "ea",
          unit_price: parseFloat(match[4].replace(/,/g, "")),
          total: parseFloat(match[5].replace(/,/g, "")),
        });
      }
    }

    return items;
  }

  private assessConfidence(data: Record<string, any>): number {
    let filled = 0;
    let total = 0;
    for (const [key, value] of Object.entries(data)) {
      if (key === "vendor_id") continue; // optional
      total++;
      if (value && value !== "" && value !== 0 &&
          !(Array.isArray(value) && value.length === 0)) {
        filled++;
      }
    }
    return total > 0 ? Math.round((filled / total) * 100) / 100 : 0;
  }

  // ── Review / Approval ──────────────────────────────────────────────

  /**
   * Approve an extraction, optionally with corrections.
   */
  approve(extractionId: string, reviewer: string, corrections?: Array<{ field: string; original: string; corrected: string }>): ExtractionResult {
    const ext = this.extractions.get(extractionId);
    if (!ext) throw new Error(`Extraction not found: ${extractionId}`);

    ext.status = "approved";
    ext.reviewed_at = new Date().toISOString();
    ext.reviewed_by = reviewer;
    if (corrections) ext.corrections = corrections;

    return ext;
  }

  /**
   * Reject an extraction.
   */
  reject(extractionId: string, reviewer: string, reason: string): ExtractionResult {
    const ext = this.extractions.get(extractionId);
    if (!ext) throw new Error(`Extraction not found: ${extractionId}`);

    ext.status = "rejected";
    ext.reviewed_at = new Date().toISOString();
    ext.reviewed_by = reviewer;
    ext.corrections.push({ field: "rejection_reason", original: "", corrected: reason });

    return ext;
  }

  // ── Retrieval ──────────────────────────────────────────────────────

  /**
   * Get an extraction by ID.
   */
  get(extractionId: string): ExtractionResult | null {
    return this.extractions.get(extractionId) ?? null;
  }

  /**
   * Get all extractions pending review.
   */
  getPendingReview(): ExtractionResult[] {
    return Array.from(this.extractions.values())
      .filter(e => e.status === "pending_review" || e.status === "draft");
  }

  /**
   * Search extractions by type, status, or filename.
   */
  search(input: { document_type?: DocumentType; status?: ExtractionResult["status"]; filename?: string }): ExtractionResult[] {
    let results = Array.from(this.extractions.values());
    if (input.document_type) results = results.filter(e => e.document_type === input.document_type);
    if (input.status) results = results.filter(e => e.status === input.status);
    if (input.filename) {
      const f = input.filename.toLowerCase();
      results = results.filter(e => e.filename.toLowerCase().includes(f));
    }
    return results;
  }

  // ── Vendor Matching ────────────────────────────────────────────────

  /**
   * Fuzzy match a vendor name against known aliases.
   */
  fuzzyMatchVendor(name: string): string | null {
    const lower = name.toLowerCase().trim();
    for (const [canonical, aliases] of Object.entries(VENDOR_ALIASES)) {
      if (canonical === lower || aliases.some(a => lower.includes(a) || a.includes(lower))) {
        return canonical;
      }
    }
    return null;
  }

  // ── Stats ──────────────────────────────────────────────────────────

  /**
   * Get extraction statistics.
   */
  getStats(): ExtractionStats {
    const all = Array.from(this.extractions.values());
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalConf = 0;
    const today = new Date().toISOString().split("T")[0];
    let approvedToday = 0;

    for (const e of all) {
      byType[e.document_type] = (byType[e.document_type] ?? 0) + 1;
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
      totalConf += e.confidence;
      if (e.status === "approved" && e.reviewed_at.startsWith(today)) approvedToday++;
    }

    return {
      total_extractions: all.length,
      by_type: byType,
      by_status: byStatus,
      avg_confidence: all.length > 0 ? Math.round((totalConf / all.length) * 100) / 100 : 0,
      pending_review: all.filter(e => e.status === "pending_review" || e.status === "draft").length,
      approved_today: approvedToday,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const businessDocumentExtractorEngine = new BusinessDocumentExtractorEngine();

persistenceBridge.registerMap({
  entity: "extractions",
  getMap: () => (businessDocumentExtractorEngine as any).extractions as unknown as Map<string, any>,
  keyField: "id",
});
