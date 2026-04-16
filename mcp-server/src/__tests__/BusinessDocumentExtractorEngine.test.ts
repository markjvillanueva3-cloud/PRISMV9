/**
 * BusinessDocumentExtractorEngine tests — INGEST-MS5
 *
 * Tests document classification, PO/invoice/RFQ extraction,
 * approval workflow, vendor matching, and stats.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { businessDocumentExtractorEngine } from "../engines/BusinessDocumentExtractorEngine.js";

function resetEngine(): void {
  (businessDocumentExtractorEngine as any).extractions = new Map();
  (businessDocumentExtractorEngine as any).nextId = 1;
}

describe("BusinessDocumentExtractorEngine", () => {
  beforeEach(() => {
    resetEngine();
  });

  // ── DOCUMENT CLASSIFICATION ─────────────────────────────────────────

  describe("classification", () => {
    it("classifies PO from filename", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "PO-12345.pdf",
      });
      expect(result.document_type).toBe("purchase_order");
    });

    it("classifies invoice from filename", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "Invoice_MSC_2025.pdf",
      });
      expect(result.document_type).toBe("invoice");
    });

    it("classifies RFQ from filename", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "RFQ-ITW-2025-03.pdf",
      });
      expect(result.document_type).toBe("rfq");
    });

    it("classifies from text content when filename is ambiguous", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "document.pdf",
        text_content: "PURCHASE ORDER\nPO# 12345\nVendor: MSC Industrial",
      });
      expect(result.document_type).toBe("purchase_order");
    });

    it("returns unknown for unrecognizable documents", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "misc-doc.pdf",
      });
      expect(result.document_type).toBe("unknown");
    });

    it("accepts explicit document type", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "doc.pdf",
        document_type: "invoice",
      });
      expect(result.document_type).toBe("invoice");
    });
  });

  // ── PO EXTRACTION ──────────────────────────────────────────────────

  describe("PO extraction", () => {
    it("extracts PO from manual data", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "PO-5001.pdf",
        document_type: "purchase_order",
        po_data: {
          po_number: "PO-5001",
          vendor_name: "MSC Industrial",
          date: "2025-03-15",
          due_date: "2025-04-15",
          ship_to: "JM Die Company, 123 Industrial Rd",
          terms: "net30",
          line_items: [
            { line_number: 1, part_number: "EM-1/2-4FL", description: "1/2 inch 4-flute end mill", quantity: 10, unit: "ea", unit_price: 28.50, total: 285.00 },
            { line_number: 2, part_number: "DR-5/16", description: "5/16 drill bit", quantity: 25, unit: "ea", unit_price: 4.75, total: 118.75 },
          ],
          subtotal: 403.75,
          tax: 28.26,
          total: 432.01,
        },
      });

      expect(result.id).toMatch(/^EXT-/);
      expect(result.po_data).toBeDefined();
      expect(result.po_data!.po_number).toBe("PO-5001");
      expect(result.po_data!.vendor_name).toBe("MSC Industrial");
      expect(result.po_data!.line_items).toHaveLength(2);
      expect(result.po_data!.total).toBe(432.01);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("extracts PO from text content", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "PO.pdf",
        document_type: "purchase_order",
        text_content: [
          "PURCHASE ORDER",
          "PO# PO-7890",
          "Date: 3/15/2025",
          "Vendor: Kennametal Inc",
          "Terms: net45",
          "Due date: 4/15/2025",
          "Ship to: JM Die",
          "Subtotal: $500.00",
          "Tax: $35.00",
          "Total: $535.00",
        ].join("\n"),
      });

      expect(result.po_data).toBeDefined();
      expect(result.po_data!.po_number).toBe("PO-7890");
      expect(result.po_data!.vendor_name).toBe("Kennametal Inc");
      expect(result.po_data!.terms).toBe("net45");
      expect(result.po_data!.total).toBe(535);
    });
  });

  // ── INVOICE EXTRACTION ─────────────────────────────────────────────

  describe("invoice extraction", () => {
    it("extracts invoice from manual data", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "Invoice-2025-001.pdf",
        document_type: "invoice",
        invoice_data: {
          invoice_number: "INV-2025-001",
          vendor_name: "Sandvik Coromant",
          date: "2025-03-01",
          due_date: "2025-04-01",
          po_reference: "PO-5001",
          line_items: [
            { line_number: 1, part_number: "CCMT-32.52", description: "Carbide insert", quantity: 100, unit: "ea", unit_price: 8.50, total: 850.00 },
          ],
          subtotal: 850.00,
          tax: 59.50,
          total: 909.50,
          payment_terms: "net30",
        },
      });

      expect(result.invoice_data).toBeDefined();
      expect(result.invoice_data!.invoice_number).toBe("INV-2025-001");
      expect(result.invoice_data!.vendor_name).toBe("Sandvik Coromant");
      expect(result.invoice_data!.po_reference).toBe("PO-5001");
      expect(result.invoice_data!.total).toBe(909.50);
    });

    it("extracts invoice from text", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "inv.pdf",
        document_type: "invoice",
        text_content: "INVOICE\nInvoice# INV-999\nFrom: MSC Industrial\nDate: 3/1/2025\nTotal: $1,250.00",
      });

      expect(result.invoice_data!.invoice_number).toBe("INV-999");
      expect(result.invoice_data!.total).toBe(1250);
    });
  });

  // ── RFQ EXTRACTION ─────────────────────────────────────────────────

  describe("RFQ extraction", () => {
    it("extracts RFQ from manual data", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "RFQ-ITW-2025.pdf",
        document_type: "rfq",
        rfq_data: {
          rfq_number: "RFQ-2025-042",
          customer_name: "ITW Shakeproof",
          contact_email: "buyer@itw.com",
          date: "2025-03-10",
          due_date: "2025-03-20",
          parts: [
            { part_number: "HEX-DIE-004", description: "Hex heading die", quantity: 2, material: "D2 Tool Steel", tolerances: "+/- 0.0005", finish: "Mirror polish", delivery_date: "2025-04-15" },
          ],
          notes: "Same as last order, new revision",
          priority: "rush",
        },
      });

      expect(result.rfq_data).toBeDefined();
      expect(result.rfq_data!.rfq_number).toBe("RFQ-2025-042");
      expect(result.rfq_data!.customer_name).toBe("ITW Shakeproof");
      expect(result.rfq_data!.parts).toHaveLength(1);
      expect(result.rfq_data!.priority).toBe("rush");
    });

    it("detects rush priority from text", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "RFQ.pdf",
        document_type: "rfq",
        text_content: "RFQ# RFQ-100\nCustomer: Alcoa\nPriority: RUSH - need ASAP",
      });

      expect(result.rfq_data!.priority).toBe("rush");
    });
  });

  // ── APPROVAL WORKFLOW ──────────────────────────────────────────────

  describe("approval workflow", () => {
    it("sets high-confidence extractions to pending_review", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "PO.pdf",
        document_type: "purchase_order",
        po_data: {
          po_number: "PO-100",
          vendor_name: "MSC",
          date: "2025-01-01",
          due_date: "2025-02-01",
          ship_to: "JM Die",
          terms: "net30",
          line_items: [{ line_number: 1, part_number: "X", description: "Y", quantity: 1, unit: "ea", unit_price: 10, total: 10 }],
          subtotal: 10,
          tax: 0,
          total: 10,
        },
      });

      expect(result.status).toBe("pending_review");
    });

    it("approves an extraction", () => {
      const ext = businessDocumentExtractorEngine.extract({
        filename: "PO.pdf",
        document_type: "purchase_order",
        po_data: { po_number: "PO-200", vendor_name: "Test" },
      });

      const approved = businessDocumentExtractorEngine.approve(ext.id, "Mark V", [
        { field: "vendor_name", original: "Test", corrected: "MSC Industrial" },
      ]);

      expect(approved.status).toBe("approved");
      expect(approved.reviewed_by).toBe("Mark V");
      expect(approved.corrections).toHaveLength(1);
    });

    it("rejects an extraction", () => {
      const ext = businessDocumentExtractorEngine.extract({
        filename: "bad-scan.pdf",
        document_type: "purchase_order",
        po_data: { po_number: "???" },
      });

      const rejected = businessDocumentExtractorEngine.reject(ext.id, "Mark V", "Scan too blurry to read");
      expect(rejected.status).toBe("rejected");
    });

    it("throws for unknown extraction ID", () => {
      expect(() => businessDocumentExtractorEngine.approve("EXT-99999", "test")).toThrow(/not found/);
      expect(() => businessDocumentExtractorEngine.reject("EXT-99999", "test", "bad")).toThrow(/not found/);
    });
  });

  // ── RETRIEVAL ──────────────────────────────────────────────────────

  describe("retrieval", () => {
    it("gets extraction by ID", () => {
      const ext = businessDocumentExtractorEngine.extract({
        filename: "PO.pdf",
        po_data: { po_number: "GET-TEST" },
      });

      const found = businessDocumentExtractorEngine.get(ext.id);
      expect(found).not.toBeNull();
      expect(found!.po_data!.po_number).toBe("GET-TEST");
    });

    it("returns null for unknown ID", () => {
      expect(businessDocumentExtractorEngine.get("EXT-99999")).toBeNull();
    });

    it("gets pending review extractions", () => {
      businessDocumentExtractorEngine.extract({
        filename: "PO1.pdf",
        document_type: "purchase_order",
        po_data: { po_number: "PO-1", vendor_name: "A", date: "x", due_date: "x", ship_to: "x", terms: "x", subtotal: 1, total: 1, line_items: [{ line_number: 1, part_number: "X", description: "Y", quantity: 1, unit: "ea", unit_price: 1, total: 1 }] },
      });

      const pending = businessDocumentExtractorEngine.getPendingReview();
      expect(pending.length).toBeGreaterThan(0);
    });

    it("searches by type and status", () => {
      businessDocumentExtractorEngine.extract({ filename: "PO.pdf", document_type: "purchase_order", po_data: { po_number: "PO-A" } });
      businessDocumentExtractorEngine.extract({ filename: "INV.pdf", document_type: "invoice", invoice_data: { invoice_number: "INV-A" } });

      const pos = businessDocumentExtractorEngine.search({ document_type: "purchase_order" });
      expect(pos).toHaveLength(1);

      const invs = businessDocumentExtractorEngine.search({ document_type: "invoice" });
      expect(invs).toHaveLength(1);
    });
  });

  // ── VENDOR MATCHING ────────────────────────────────────────────────

  describe("vendor matching", () => {
    it("matches exact vendor name", () => {
      expect(businessDocumentExtractorEngine.fuzzyMatchVendor("MSC Industrial")).toBe("msc industrial");
    });

    it("matches vendor alias", () => {
      expect(businessDocumentExtractorEngine.fuzzyMatchVendor("MSC")).toBe("msc industrial");
    });

    it("matches case-insensitively", () => {
      expect(businessDocumentExtractorEngine.fuzzyMatchVendor("KENNAMETAL")).toBe("kennametal");
    });

    it("returns null for unknown vendor", () => {
      expect(businessDocumentExtractorEngine.fuzzyMatchVendor("Unknown Supplier Co")).toBeNull();
    });
  });

  // ── STATS ──────────────────────────────────────────────────────────

  describe("stats", () => {
    it("returns extraction statistics", () => {
      businessDocumentExtractorEngine.extract({ filename: "PO1.pdf", document_type: "purchase_order", po_data: { po_number: "PO-1" } });
      businessDocumentExtractorEngine.extract({ filename: "PO2.pdf", document_type: "purchase_order", po_data: { po_number: "PO-2" } });
      businessDocumentExtractorEngine.extract({ filename: "INV1.pdf", document_type: "invoice", invoice_data: { invoice_number: "INV-1" } });

      const stats = businessDocumentExtractorEngine.getStats();
      expect(stats.total_extractions).toBe(3);
      expect(stats.by_type["purchase_order"]).toBe(2);
      expect(stats.by_type["invoice"]).toBe(1);
      expect(stats.avg_confidence).toBeGreaterThan(0);
    });
  });

  // ── LINE ITEM PARSING ──────────────────────────────────────────────

  describe("line item parsing from text", () => {
    it("extracts line items from tabular text", () => {
      const result = businessDocumentExtractorEngine.extract({
        filename: "PO-items.pdf",
        document_type: "purchase_order",
        text_content: [
          "PURCHASE ORDER",
          "PO# PO-LINE-TEST",
          "10 EM-500 Half inch end mill $28.50 $285.00",
          "25 DR-250 Quarter inch drill bit $4.75 $118.75",
          "Total: $403.75",
        ].join("\n"),
      });

      expect(result.po_data!.line_items).toHaveLength(2);
      expect(result.po_data!.line_items[0].part_number).toBe("EM-500");
      expect(result.po_data!.line_items[0].quantity).toBe(10);
      expect(result.po_data!.line_items[1].part_number).toBe("DR-250");
    });
  });

  // ── UNIQUE IDs ─────────────────────────────────────────────────────

  describe("unique IDs", () => {
    it("assigns unique IDs", () => {
      const e1 = businessDocumentExtractorEngine.extract({ filename: "a.pdf" });
      const e2 = businessDocumentExtractorEngine.extract({ filename: "b.pdf" });
      expect(e1.id).not.toBe(e2.id);
    });
  });
});
