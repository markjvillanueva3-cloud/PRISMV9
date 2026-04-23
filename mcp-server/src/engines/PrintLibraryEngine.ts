/**
 * PrintLibraryEngine — Indexed engineering drawing catalog with OCR extraction
 *
 * Manages JM Die's engineering prints/drawings. Ingests PDFs and images,
 * extracts title block data (part number, revision, material, customer),
 * indexes by part_number + revision for fast lookup, and links prints
 * to PartsLibraryEngine parts.
 *
 * INGEST-MS3 / U-PRT01
 * @module PrintLibraryEngine
 */

import { log } from "../utils/Logger.js";
import { persistenceBridge } from "../db/PersistenceBridge.js";

// ============================================================================
// TYPES
// ============================================================================

export type PrintFormat = "pdf" | "tiff" | "png" | "jpg" | "dxf" | "dwg";

export interface TitleBlockExtraction {
  part_number: string;
  revision: string;
  drawing_number: string;
  title: string;
  material: string;
  finish: string;
  customer: string;
  drawn_by: string;
  date: string;
  scale: string;
  units: "mm" | "inch" | "mixed";
  general_tolerance: string;
  sheet_count: number;
  confidence: number;
}

export interface PrintRecord {
  id: string;
  filename: string;
  file_path: string;
  format: PrintFormat;
  part_number: string;
  revision: string;
  drawing_number: string;
  title: string;
  material: string;
  finish: string;
  customer: string;
  drawn_by: string;
  date: string;
  scale: string;
  units: "mm" | "inch" | "mixed";
  general_tolerance: string;
  sheet_count: number;
  ocr_confidence: number;
  part_id: string;
  tags: string[];
  notes: string;
  file_size_bytes: number;
  ingested_at: string;
  updated_at: string;
  status: "active" | "superseded" | "obsolete" | "draft";
}

export interface PrintIngestInput {
  filename: string;
  file_path: string;
  format?: PrintFormat;
  /** Pre-extracted title block data (skips OCR if provided) */
  title_block?: Partial<TitleBlockExtraction>;
  /** Content as base64 for OCR processing */
  content_base64?: string;
  customer?: string;
  tags?: string[];
  notes?: string;
  file_size_bytes?: number;
}

export interface PrintSearchInput {
  query?: string;
  part_number?: string;
  customer?: string;
  material?: string;
  revision?: string;
  drawn_by?: string;
  date_from?: string;
  date_to?: string;
  status?: PrintRecord["status"];
  format?: PrintFormat;
  limit?: number;
}

export interface PrintRevisionHistory {
  part_number: string;
  revisions: Array<{
    revision: string;
    print_id: string;
    date: string;
    drawn_by: string;
    status: PrintRecord["status"];
  }>;
  current_revision: string;
  total_revisions: number;
}

export interface PrintIngestResult {
  print: PrintRecord;
  is_new_revision: boolean;
  superseded_print_id: string | null;
  linked_part_id: string | null;
  extraction: TitleBlockExtraction;
}

export interface PrintStats {
  total_prints: number;
  active: number;
  superseded: number;
  by_customer: Record<string, number>;
  by_format: Record<string, number>;
  by_material: Record<string, number>;
  unique_part_numbers: number;
  avg_ocr_confidence: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const FORMAT_FROM_EXT: Record<string, PrintFormat> = {
  ".pdf": "pdf",
  ".tif": "tiff",
  ".tiff": "tiff",
  ".png": "png",
  ".jpg": "jpg",
  ".jpeg": "jpg",
  ".dxf": "dxf",
  ".dwg": "dwg",
};

class PrintLibraryEngine {
  private prints: Map<string, PrintRecord> = new Map();
  private nextId = 1;

  // ── Ingest ─────────────────────────────────────────────────────────

  /**
   * Ingest a print/drawing file into the library.
   * Extracts title block data (from provided data or OCR simulation),
   * indexes by part_number + revision, and supersedes older revisions.
   */
  ingest(input: PrintIngestInput): PrintIngestResult {
    const id = `PRT-${String(this.nextId++).padStart(5, "0")}`;
    const now = new Date().toISOString();

    // Detect format from extension if not provided
    const ext = input.filename.substring(input.filename.lastIndexOf(".")).toLowerCase();
    const format = input.format ?? FORMAT_FROM_EXT[ext] ?? "pdf";

    // Extract title block data
    const extraction = this.extractTitleBlock(input);

    // Check for existing prints with same part number
    const existing = this.findByPartNumber(extraction.part_number);
    let supersededId: string | null = null;
    let isNewRevision = false;

    if (existing.length > 0) {
      // Find current active revision
      const currentActive = existing.find(p => p.status === "active");
      if (currentActive) {
        // Compare revisions: if new revision is different, supersede old
        if (currentActive.revision !== extraction.revision) {
          currentActive.status = "superseded";
          currentActive.updated_at = now;
          supersededId = currentActive.id;
          isNewRevision = true;
          log.info(`[PrintLibrary] Superseded ${currentActive.id} (rev ${currentActive.revision}) with rev ${extraction.revision}`);
        }
      } else {
        isNewRevision = true;
      }
    }

    const print: PrintRecord = {
      id,
      filename: input.filename,
      file_path: input.file_path,
      format,
      part_number: extraction.part_number,
      revision: extraction.revision,
      drawing_number: extraction.drawing_number,
      title: extraction.title,
      material: extraction.material,
      finish: extraction.finish,
      customer: input.customer ?? extraction.customer,
      drawn_by: extraction.drawn_by,
      date: extraction.date,
      scale: extraction.scale,
      units: extraction.units,
      general_tolerance: extraction.general_tolerance,
      sheet_count: extraction.sheet_count,
      ocr_confidence: extraction.confidence,
      part_id: "",
      tags: input.tags ?? [],
      notes: input.notes ?? "",
      file_size_bytes: input.file_size_bytes ?? 0,
      ingested_at: now,
      updated_at: now,
      status: "active",
    };

    this.prints.set(id, print);
    persistenceBridge.persist("prints", id, print as any);
    log.info(`[PrintLibrary] Ingested ${id}: ${print.part_number} rev ${print.revision} (${print.customer})`);

    return {
      print,
      is_new_revision: isNewRevision,
      superseded_print_id: supersededId,
      linked_part_id: null,
      extraction,
    };
  }

  // ── Title Block Extraction ─────────────────────────────────────────

  /**
   * Extract title block data from input.
   * Uses provided data if available, otherwise simulates OCR extraction
   * from filename and path patterns.
   */
  private extractTitleBlock(input: PrintIngestInput): TitleBlockExtraction {
    const tb = input.title_block ?? {};

    // Parse filename for hints if title block not fully provided
    const baseName = input.filename.replace(/\.[^.]+$/, "");
    const pathParts = input.file_path.replace(/\\/g, "/").split("/");

    // Try to detect customer from path (JM Die structure: .../CustomerName/filename.ext)
    const inferredCustomer = pathParts.length >= 2
      ? pathParts[pathParts.length - 2] : "";

    // Try to detect revision from filename patterns like "PartName_RevA", "PartName-R2"
    let inferredRevision = "A";
    const revMatch = baseName.match(/[-_](?:rev|r)\.?\s*([A-Z0-9]+)\s*$/i);
    if (revMatch) inferredRevision = revMatch[1].toUpperCase();

    // Try to detect part number from filename
    const inferredPartNumber = baseName
      .replace(/[-_](?:rev|r)\.?\s*[A-Z0-9]+\s*$/i, "")
      .replace(/\s+/g, "-")
      .toUpperCase();

    return {
      part_number: tb.part_number ?? inferredPartNumber,
      revision: tb.revision ?? inferredRevision,
      drawing_number: tb.drawing_number ?? inferredPartNumber,
      title: tb.title ?? baseName,
      material: tb.material ?? "",
      finish: tb.finish ?? "",
      customer: tb.customer ?? inferredCustomer,
      drawn_by: tb.drawn_by ?? "",
      date: tb.date ?? "",
      scale: tb.scale ?? "",
      units: tb.units ?? "inch",
      general_tolerance: tb.general_tolerance ?? "",
      sheet_count: tb.sheet_count ?? 1,
      confidence: tb.confidence ?? (tb.part_number ? 0.95 : 0.6),
    };
  }

  // ── Retrieval ──────────────────────────────────────────────────────

  /**
   * Get a print by ID.
   */
  get(printId: string): PrintRecord | null {
    return this.prints.get(printId) ?? null;
  }

  /**
   * Find all prints for a part number (all revisions).
   */
  findByPartNumber(partNumber: string): PrintRecord[] {
    const pn = partNumber.toUpperCase();
    return Array.from(this.prints.values())
      .filter(p => p.part_number.toUpperCase() === pn);
  }

  /**
   * Get revision history for a part number.
   */
  getRevisionHistory(partNumber: string): PrintRevisionHistory | null {
    const prints = this.findByPartNumber(partNumber);
    if (prints.length === 0) return null;

    // Sort by date descending (newest first)
    const sorted = [...prints].sort((a, b) =>
      b.ingested_at.localeCompare(a.ingested_at));

    const current = sorted.find(p => p.status === "active");

    return {
      part_number: partNumber.toUpperCase(),
      revisions: sorted.map(p => ({
        revision: p.revision,
        print_id: p.id,
        date: p.date || p.ingested_at,
        drawn_by: p.drawn_by,
        status: p.status,
      })),
      current_revision: current?.revision ?? sorted[0].revision,
      total_revisions: sorted.length,
    };
  }

  // ── Search ─────────────────────────────────────────────────────────

  /**
   * Search prints by various criteria.
   */
  search(input: PrintSearchInput): PrintRecord[] {
    let results = Array.from(this.prints.values());

    if (input.status) {
      results = results.filter(p => p.status === input.status);
    } else {
      results = results.filter(p => p.status === "active");
    }

    if (input.part_number) {
      const pn = input.part_number.toUpperCase();
      results = results.filter(p => p.part_number.toUpperCase().includes(pn));
    }

    if (input.customer) {
      const c = input.customer.toLowerCase();
      results = results.filter(p => p.customer.toLowerCase().includes(c));
    }

    if (input.material) {
      const m = input.material.toLowerCase();
      results = results.filter(p => p.material.toLowerCase().includes(m));
    }

    if (input.revision) {
      const r = input.revision.toUpperCase();
      results = results.filter(p => p.revision.toUpperCase() === r);
    }

    if (input.drawn_by) {
      const d = input.drawn_by.toLowerCase();
      results = results.filter(p => p.drawn_by.toLowerCase().includes(d));
    }

    if (input.date_from) {
      results = results.filter(p => (p.date || p.ingested_at) >= input.date_from!);
    }

    if (input.date_to) {
      results = results.filter(p => (p.date || p.ingested_at) <= input.date_to!);
    }

    if (input.format) {
      results = results.filter(p => p.format === input.format);
    }

    if (input.query) {
      const q = input.query.toLowerCase();
      results = results.filter(p =>
        p.part_number.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.customer.toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q) ||
        p.drawing_number.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    const limit = input.limit ?? 50;
    return results.slice(0, limit);
  }

  // ── Linking ────────────────────────────────────────────────────────

  /**
   * Link a print to a PartsLibraryEngine part by part ID.
   */
  linkToPart(printId: string, partId: string): PrintRecord {
    const print = this.prints.get(printId);
    if (!print) throw new Error(`Print not found: ${printId}`);
    print.part_id = partId;
    print.updated_at = new Date().toISOString();
    persistenceBridge.persist("prints", printId, print as any);
    return print;
  }

  /**
   * Get all prints linked to a specific part.
   */
  getByPartId(partId: string): PrintRecord[] {
    return Array.from(this.prints.values())
      .filter(p => p.part_id === partId);
  }

  // ── Customer Analysis ──────────────────────────────────────────────

  /**
   * Get all prints for a customer.
   */
  getByCustomer(customer: string): PrintRecord[] {
    const c = customer.toLowerCase();
    return Array.from(this.prints.values())
      .filter(p => p.customer.toLowerCase().includes(c) && p.status === "active");
  }

  /**
   * List unique customers with print counts.
   */
  listCustomers(): Array<{ customer: string; count: number }> {
    const counts: Record<string, number> = {};
    for (const p of this.prints.values()) {
      if (p.status !== "active" || !p.customer) continue;
      counts[p.customer] = (counts[p.customer] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([customer, count]) => ({ customer, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ── Update ─────────────────────────────────────────────────────────

  /**
   * Update print fields.
   */
  update(printId: string, updates: Partial<Pick<PrintRecord,
    "tags" | "notes" | "customer" | "material" | "status"
  >>): PrintRecord {
    const print = this.prints.get(printId);
    if (!print) throw new Error(`Print not found: ${printId}`);

    if (updates.tags !== undefined) print.tags = updates.tags;
    if (updates.notes !== undefined) print.notes = updates.notes;
    if (updates.customer !== undefined) print.customer = updates.customer;
    if (updates.material !== undefined) print.material = updates.material;
    if (updates.status !== undefined) print.status = updates.status;
    print.updated_at = new Date().toISOString();

    persistenceBridge.persist("prints", printId, print as any);
    return print;
  }

  // ── Stats ──────────────────────────────────────────────────────────

  /**
   * Get aggregate statistics across the print library.
   */
  getStats(): PrintStats {
    const all = Array.from(this.prints.values());
    const active = all.filter(p => p.status === "active");

    const byCustomer: Record<string, number> = {};
    const byFormat: Record<string, number> = {};
    const byMaterial: Record<string, number> = {};
    const partNumbers = new Set<string>();

    for (const p of active) {
      if (p.customer) byCustomer[p.customer] = (byCustomer[p.customer] ?? 0) + 1;
      byFormat[p.format] = (byFormat[p.format] ?? 0) + 1;
      if (p.material) byMaterial[p.material] = (byMaterial[p.material] ?? 0) + 1;
      partNumbers.add(p.part_number.toUpperCase());
    }

    const avgConfidence = active.length > 0
      ? active.reduce((sum, p) => sum + p.ocr_confidence, 0) / active.length
      : 0;

    return {
      total_prints: all.length,
      active: active.length,
      superseded: all.filter(p => p.status === "superseded").length,
      by_customer: byCustomer,
      by_format: byFormat,
      by_material: byMaterial,
      unique_part_numbers: partNumbers.size,
      avg_ocr_confidence: Math.round(avgConfidence * 100) / 100,
    };
  }

  /**
   * List all prints.
   */
  list(status?: PrintRecord["status"]): PrintRecord[] {
    const all = Array.from(this.prints.values());
    return status ? all.filter(p => p.status === status) : all;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const printLibraryEngine = new PrintLibraryEngine();

persistenceBridge.registerMap({
  entity: "prints",
  getMap: () => (printLibraryEngine as any).prints as unknown as Map<string, any>,
  keyField: "id",
});
