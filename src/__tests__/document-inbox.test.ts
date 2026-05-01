/**
 * DocumentInboxEngine — DocuRead integration tests
 *
 * Tests document intake, classification, extraction, part matching,
 * and the full inbox pipeline for manufacturing documents.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  documentInboxEngine,
  type IngestInput,
  type DocumentType,
} from "../engines/DocumentInboxEngine.js";

// Helper: create base64 text content
function textToBase64(text: string): string {
  return Buffer.from(text).toString("base64");
}

describe("DocumentInboxEngine", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // CLASSIFICATION
  // ──────────────────────────────────────────────────────────────────────────

  describe("Document Classification", () => {
    it("classifies DXF files as blueprints", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "PART-12345.dxf",
        content_base64: textToBase64("0\nSECTION\n2\nENTITIES"),
        skip_matching: true,
      });
      expect(result.inbox_item.document_type).toBe("blueprint");
      expect(result.classification.confidence).toBeGreaterThan(0.5);
    });

    it("classifies .nc files as programs", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "O1234.nc",
        content_base64: textToBase64("%\nO1234\nG90 G54\nG0 X0 Y0\nM02\n%"),
        skip_matching: true,
      });
      expect(result.inbox_item.document_type).toBe("program");
    });

    it("classifies PO documents by filename", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "Purchase Order 54321.pdf",
        skip_matching: true,
        skip_classification: false,
      });
      expect(result.inbox_item.document_type).toBe("purchase_order");
    });

    it("classifies invoice documents by filename", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "INV-2026-001 CustomerCo.pdf",
        skip_matching: true,
      });
      expect(result.inbox_item.document_type).toBe("invoice");
    });

    it("classifies material certs by filename", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "Mill Cert Heat 12345.pdf",
        skip_matching: true,
      });
      expect(result.inbox_item.document_type).toBe("material_cert");
    });

    it("classifies RFQ documents", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "RFQ-ACME-2026-04.pdf",
        skip_matching: true,
      });
      expect(result.inbox_item.document_type).toBe("quote_request");
    });

    it("classifies packing slips", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "Packing Slip - Shipment 789.pdf",
        skip_matching: true,
      });
      expect(result.inbox_item.document_type).toBe("packing_slip");
    });

    it("classifies inspection reports", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "CMM Inspection Report FAI.pdf",
        skip_matching: true,
      });
      expect(result.inbox_item.document_type).toBe("inspection");
    });

    it("classifies setup sheets", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "Job Setup Sheet - OP10.pdf",
        skip_matching: true,
      });
      expect(result.inbox_item.document_type).toBe("setup_sheet");
    });

    it("uses type_hint when skip_classification is true", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "random-file.pdf",
        type_hint: "material_cert",
        skip_classification: true,
        skip_matching: true,
      });
      expect(result.inbox_item.document_type).toBe("material_cert");
      expect(result.inbox_item.classification_confidence).toBe(0.9);
    });

    it("classifies STEP files as blueprints", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "housing-assembly.step",
        mime_type: "model/step",
        skip_matching: true,
      });
      expect(result.inbox_item.document_type).toBe("blueprint");
      expect(result.classification.confidence).toBeGreaterThan(0.8);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PART NUMBER EXTRACTION
  // ──────────────────────────────────────────────────────────────────────────

  describe("Part Number Extraction", () => {
    it("extracts part numbers from PO text content", async () => {
      const poText = `
Purchase Order #PO-2026-0042
Bill To: ACME Manufacturing
Date: 04/04/2026

Line Items:
1  ABC-12345  Widget Housing    10  $45.00  $450.00
2  DEF-67890  Bracket Assembly   5  $22.50  $112.50

Total: $562.50
      `;
      const result = await documentInboxEngine.ingest({
        filename: "PO-2026-0042.txt",
        content_base64: textToBase64(poText),
        mime_type: "text/plain",
        skip_matching: true,
      });
      expect(result.inbox_item.part_numbers.length).toBeGreaterThanOrEqual(2);
      expect(result.inbox_item.part_numbers).toContain("ABC-12345");
      expect(result.inbox_item.part_numbers).toContain("DEF-67890");
    });

    it("extracts part numbers from filenames", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "Drawing XYZ-9876 Rev B.pdf",
        skip_matching: true,
      });
      expect(result.inbox_item.part_numbers).toContain("XYZ-9876");
    });

    it("extracts drawing numbers with P/N prefix", async () => {
      const text = "P/N: HOUSING-001\nMaterial: 4140 Steel\nRev: C";
      const result = await documentInboxEngine.ingest({
        filename: "drawing.txt",
        content_base64: textToBase64(text),
        mime_type: "text/plain",
        skip_matching: true,
      });
      expect(result.inbox_item.part_numbers).toContain("HOUSING-001");
    });

    it("filters obvious false positives", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "2026.pdf",
        content_base64: textToBase64("Page 1234"),
        mime_type: "text/plain",
        skip_matching: true,
      });
      // "1234" alone should be filtered as too short/generic
      // but "Page" is not a part number pattern
      expect(result.inbox_item.part_numbers.every(pn => pn.length >= 4)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // FINANCIAL DATA EXTRACTION
  // ──────────────────────────────────────────────────────────────────────────

  describe("Financial Data Extraction", () => {
    it("extracts PO fields from text", async () => {
      const poText = `
Purchase Order #PO-5678
Order Date: 04/01/2026
Bill To: Precision Parts Inc
Ship To: 123 Machine Ave

1  SHAFT-100  Drive Shaft  2  $150.00  $300.00
2  GEAR-200   Spur Gear    4  $75.00   $300.00

Total: $600.00
      `;
      const result = await documentInboxEngine.ingest({
        filename: "PO-5678.txt",
        content_base64: textToBase64(poText),
        mime_type: "text/plain",
        type_hint: "purchase_order",
        skip_classification: true,
        skip_matching: true,
      });
      const data = result.inbox_item.extracted_data;
      expect(data.reference_number).toBe("PO-5678");
      expect(data.document_date).toBe("04/01/2026");
      expect(data.total_amount).toBe(600);
      expect(data.currency).toBe("USD");
    });

    it("extracts invoice amount", async () => {
      const text = `
Invoice #INV-2026-042
Date: 04/04/2026
Amount Due: $1,234.56
Payment Terms: Net 30
      `;
      const result = await documentInboxEngine.ingest({
        filename: "invoice.txt",
        content_base64: textToBase64(text),
        mime_type: "text/plain",
        type_hint: "invoice",
        skip_classification: true,
        skip_matching: true,
      });
      const data = result.inbox_item.extracted_data;
      expect(data.reference_number).toBe("INV-2026-042");
      expect(data.total_amount).toBe(1234.56);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // MATERIAL CERT EXTRACTION
  // ──────────────────────────────────────────────────────────────────────────

  describe("Material Cert Extraction", () => {
    it("extracts cert fields from text", async () => {
      const certText = `
CERTIFICATE OF CONFORMANCE
Material: AISI 4140
Heat Number: H2026-0412
Specification: ASTM A29

Mechanical Properties:
Yield Strength: 95.2 ksi
Tensile: 142.8 ksi
Hardness: 28 HRC
Elongation: 18%
      `;
      const result = await documentInboxEngine.ingest({
        filename: "mill-cert-H2026-0412.txt",
        content_base64: textToBase64(certText),
        mime_type: "text/plain",
        type_hint: "material_cert",
        skip_classification: true,
        skip_matching: true,
      });
      const data = result.inbox_item.extracted_data;
      expect(data.material).toContain("4140");
      expect(data.custom_fields.heat_number).toBe("H2026-0412");
      expect(data.custom_fields.yield_strength).toBe("95.2");
      expect(data.custom_fields.tensile_strength).toBe("142.8");
      expect(data.custom_fields.hardness).toBe("28");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // INBOX OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────

  describe("Inbox Operations", () => {
    it("lists all items", async () => {
      // Ingest a few docs first
      await documentInboxEngine.ingest({
        filename: "test-blueprint.dxf",
        skip_matching: true,
      });
      await documentInboxEngine.ingest({
        filename: "test-po.txt",
        content_base64: textToBase64("Purchase Order #PO-TEST"),
        mime_type: "text/plain",
        skip_matching: true,
      });

      const result = documentInboxEngine.list({});
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.items.length).toBeGreaterThanOrEqual(2);
    });

    it("filters by document type", async () => {
      const result = documentInboxEngine.list({ document_type: "blueprint" });
      for (const item of result.items) {
        expect(item.document_type).toBe("blueprint");
      }
    });

    it("gets a single item by ID", async () => {
      const ingestResult = await documentInboxEngine.ingest({
        filename: "get-test.nc",
        content_base64: textToBase64("%\nO9999\nM02\n%"),
        skip_matching: true,
      });
      const item = documentInboxEngine.get(ingestResult.inbox_item.id);
      expect(item).not.toBeNull();
      expect(item!.id).toBe(ingestResult.inbox_item.id);
      expect(item!.document_type).toBe("program");
    });

    it("returns null for non-existent ID", () => {
      const item = documentInboxEngine.get("DOC-999999");
      expect(item).toBeNull();
    });

    it("searches by query string", async () => {
      await documentInboxEngine.ingest({
        filename: "UNIQUE-SEARCH-TEST-ABC.dxf",
        skip_matching: true,
      });
      const results = documentInboxEngine.search("UNIQUE-SEARCH-TEST");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].original_name).toContain("UNIQUE-SEARCH-TEST");
    });

    it("updates status with note", async () => {
      const ingestResult = await documentInboxEngine.ingest({
        filename: "status-test.pdf",
        skip_matching: true,
      });
      const id = ingestResult.inbox_item.id;
      const updateResult = documentInboxEngine.updateStatus(id, "archived", "Processed and filed");
      expect(updateResult.success).toBe(true);

      const item = documentInboxEngine.get(id);
      expect(item!.status).toBe("archived");
      expect(item!.notes.length).toBeGreaterThan(0);
      expect(item!.notes[0]).toContain("Processed and filed");
    });

    it("returns error for status update on non-existent item", () => {
      const result = documentInboxEngine.updateStatus("DOC-NOPE", "archived");
      expect(result.success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // BATCH INGEST
  // ──────────────────────────────────────────────────────────────────────────

  describe("Batch Ingest", () => {
    it("processes multiple documents", async () => {
      const result = await documentInboxEngine.batchIngest([
        { filename: "batch-1.dxf", skip_matching: true },
        { filename: "batch-2-PO.txt", content_base64: textToBase64("Purchase Order #BATCH-PO"), mime_type: "text/plain", skip_matching: true },
        { filename: "batch-3.nc", content_base64: textToBase64("%\nO0001\nM02\n%"), skip_matching: true },
      ]);
      expect(result.summary.total).toBe(3);
      expect(result.results.length).toBe(3);
      expect(result.summary.errors).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // STATS / DASHBOARD
  // ──────────────────────────────────────────────────────────────────────────

  describe("Dashboard Stats", () => {
    it("returns inbox statistics", () => {
      const stats = documentInboxEngine.stats();
      expect(stats.total_items).toBeGreaterThan(0);
      expect(stats.by_type).toBeDefined();
      expect(stats.by_status).toBeDefined();
      expect(typeof stats.matched_count).toBe("number");
      expect(typeof stats.unmatched_count).toBe("number");
      expect(stats.recent_items.length).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // MANUAL MATCH
  // ──────────────────────────────────────────────────────────────────────────

  describe("Manual Part Matching", () => {
    it("manually matches a part by ID", async () => {
      const ingestResult = await documentInboxEngine.ingest({
        filename: "match-test.dxf",
        skip_matching: true,
      });
      const matchResult = await documentInboxEngine.matchPart(
        ingestResult.inbox_item.id,
        "TEST-PART-001",
        "fake-part-id-123"
      );
      expect(matchResult.success).toBe(true);

      const item = documentInboxEngine.get(ingestResult.inbox_item.id);
      expect(item!.matched_part_ids).toContain("fake-part-id-123");
      expect(item!.part_numbers).toContain("TEST-PART-001");
      expect(item!.status).toBe("matched");
    });

    it("fails for non-existent inbox item", async () => {
      const result = await documentInboxEngine.matchPart("DOC-NOPE", "X", "Y");
      expect(result.success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PROCESSING TIME
  // ──────────────────────────────────────────────────────────────────────────

  describe("Processing Performance", () => {
    it("completes text-based ingest in under 500ms", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "perf-test.txt",
        content_base64: textToBase64("P/N: PERF-001\nMaterial: 4140"),
        mime_type: "text/plain",
        type_hint: "blueprint",
        skip_classification: true,
        skip_matching: true,
      });
      expect(result.processing_time_ms).toBeLessThan(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SOURCE TRACKING
  // ──────────────────────────────────────────────────────────────────────────

  describe("Source Tracking", () => {
    it("tracks source metadata", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "emailed-po.pdf",
        source: { type: "email", origin: "buyer@customer.com" },
        skip_matching: true,
      });
      expect(result.inbox_item.source.type).toBe("email");
      expect(result.inbox_item.source.origin).toBe("buyer@customer.com");
    });

    it("tracks who ingested the document", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "user-upload.pdf",
        ingested_by: "jsmith",
        skip_matching: true,
      });
      expect(result.inbox_item.ingested_by).toBe("jsmith");
    });

    it("applies tags", async () => {
      const result = await documentInboxEngine.ingest({
        filename: "tagged-doc.pdf",
        tags: ["urgent", "customer-acme"],
        skip_matching: true,
      });
      expect(result.inbox_item.tags).toContain("urgent");
      expect(result.inbox_item.tags).toContain("customer-acme");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NOTES
  // ──────────────────────────────────────────────────────────────────────────

  describe("Notes", () => {
    it("adds notes to inbox items", async () => {
      const ingestResult = await documentInboxEngine.ingest({
        filename: "note-test.pdf",
        skip_matching: true,
      });
      const id = ingestResult.inbox_item.id;
      const noteResult = documentInboxEngine.addNote(id, "Needs review by engineering");
      expect(noteResult.success).toBe(true);

      const item = documentInboxEngine.get(id);
      expect(item!.notes.length).toBeGreaterThan(0);
      expect(item!.notes.some(n => n.includes("Needs review by engineering"))).toBe(true);
    });
  });
});
