/**
 * DocustrataAccountingBridgeEngine.test.ts — HOTEL/U-DOCUSTRATA-ACCOUNTING-BRIDGE (iter2)
 *
 * Tests the bridge that wires Docustrata-extracted invoices/POs into the
 * General Ledger via BusinessDocumentExtractor.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { docustrataAccountingBridgeEngine } from "../engines/DocustrataAccountingBridgeEngine.js";

// Helper — build a manual-extraction invoice that ALWAYS reconciles cleanly.
function cleanInvoiceInput(party = "ACME Inc") {
  return {
    doc_type: "invoice" as const,
    party_name: party,
    source: { filename: "test-invoice.pdf" },
    manual_invoice: {
      invoice_number: "INV-2026-001",
      vendor_name: party,
      date: "2026-05-25",
      due_date: "2026-06-25",
      po_reference: "PO-2026-001",
      line_items: [
        {
          line_number: 1,
          part_number: "P-001",
          description: "Widget",
          quantity: 10,
          unit: "ea",
          unit_price: 50,
          total: 500,
        },
      ],
      subtotal: 500,
      tax: 35,
      total: 535,
    },
    issued_date: "2026-05-25",
  };
}

function cleanPOInput(party = "Vendor X") {
  return {
    doc_type: "purchase_order" as const,
    party_name: party,
    source: { filename: "test-po.pdf" },
    manual_po: {
      po_number: "PO-VEND-2026-001",
      vendor_name: party,
      date: "2026-05-25",
      line_items: [
        {
          line_number: 1,
          part_number: "RAW-001",
          description: "Steel bar 1018",
          quantity: 5,
          unit: "ft",
          unit_price: 100,
          total: 500,
        },
      ],
      subtotal: 500,
      tax: 30,
      total: 530,
    },
    issued_date: "2026-05-25",
    category: "raw_materials",
  };
}

describe("DocustrataAccountingBridgeEngine", () => {
  describe("ingestAndPost (happy path)", () => {
    it("processes a clean invoice and posts to GL", () => {
      const r = docustrataAccountingBridgeEngine.ingestAndPost(cleanInvoiceInput());
      expect(r.posted_to_gl).toBe(true);
      expect(r.reconciliation.passed).toBe(true);
      expect(r.journal_entry).not.toBeNull();
      expect(r.journal_entry?.type).toBe("invoice");
      expect(r.journal_entry?.amount).toBe(535);
      expect(r.currency).toBe("USD");
    });

    it("processes a clean PO and posts to GL with category", () => {
      const r = docustrataAccountingBridgeEngine.ingestAndPost(cleanPOInput());
      expect(r.posted_to_gl).toBe(true);
      expect(r.reconciliation.passed).toBe(true);
      expect(r.journal_entry?.type).toBe("purchase");
      expect(r.journal_entry?.amount).toBe(530);
      // Audit trail should record the category
      expect(r.audit_trail.some((s) => s.includes("raw_materials"))).toBe(true);
    });

    it("captures party name in reconciliation breadcrumb", () => {
      const r = docustrataAccountingBridgeEngine.ingestAndPost(cleanInvoiceInput("ALCOA Industrial"));
      expect(r.reconciliation.party).toBe("ALCOA Industrial");
    });

    it("returns frozen result + reconciliation + audit trail", () => {
      const r = docustrataAccountingBridgeEngine.ingestAndPost(cleanInvoiceInput());
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.reconciliation)).toBe(true);
      expect(Object.isFrozen(r.audit_trail)).toBe(true);
    });

    it("preserves all extracted IDs in reconciliation", () => {
      const r = docustrataAccountingBridgeEngine.ingestAndPost(cleanInvoiceInput());
      expect(r.reconciliation.invoice_or_po_id).toBe("INV-2026-001");
      expect(r.reconciliation.subtotal_extracted).toBe(500);
      expect(r.reconciliation.tax_extracted).toBe(35);
      expect(r.reconciliation.total_extracted).toBe(535);
    });
  });

  describe("Financial-invariant gate (hotel-soul)", () => {
    it("FAILS reconciliation when subtotal+tax != total (>1¢ delta)", () => {
      const bad = cleanInvoiceInput();
      bad.manual_invoice.subtotal = 500;
      bad.manual_invoice.tax = 35;
      bad.manual_invoice.total = 540; // delta = $5
      const r = docustrataAccountingBridgeEngine.ingestAndPost(bad);
      expect(r.reconciliation.passed).toBe(false);
      expect(r.posted_to_gl).toBe(false);
      expect(r.reconciliation.failure_reason).toMatch(/subtotal\+tax.*!=.*total/);
      expect(r.reconciliation.delta_cents).toBe(500); // $5 = 500 cents
    });

    it("PASSES reconciliation within 1¢ tolerance (e.g. $535.005 → $535.01)", () => {
      const r = cleanInvoiceInput();
      r.manual_invoice.subtotal = 500.0;
      r.manual_invoice.tax = 35.005;
      r.manual_invoice.total = 535.01;
      const out = docustrataAccountingBridgeEngine.ingestAndPost(r);
      expect(out.reconciliation.passed).toBe(true);
    });

    it("REFUSES negative subtotal", () => {
      const bad = cleanInvoiceInput();
      bad.manual_invoice.subtotal = -100;
      bad.manual_invoice.tax = 0;
      bad.manual_invoice.total = -100;
      const r = docustrataAccountingBridgeEngine.ingestAndPost(bad);
      expect(r.reconciliation.passed).toBe(false);
      expect(r.posted_to_gl).toBe(false);
    });

    it("REFUSES zero-value total (no zero invoices into GL)", () => {
      const bad = cleanInvoiceInput();
      bad.manual_invoice.subtotal = 0;
      bad.manual_invoice.tax = 0;
      bad.manual_invoice.total = 0;
      const r = docustrataAccountingBridgeEngine.ingestAndPost(bad);
      expect(r.reconciliation.passed).toBe(false);
      expect(r.reconciliation.failure_reason).toMatch(/total must be positive/);
    });

    it("strict mode THROWS on reconciliation failure (R12 fail-loud)", () => {
      const bad = cleanInvoiceInput();
      bad.manual_invoice.total = 999; // mismatched
      expect(() =>
        docustrataAccountingBridgeEngine.ingestAndPost({ ...bad, reconcile_mode: "strict" }),
      ).toThrow(/strict reconciliation FAILED/);
    });

    it("tolerant mode (default) returns failed result, never throws on $-delta", () => {
      const bad = cleanInvoiceInput();
      bad.manual_invoice.total = 999;
      expect(() => docustrataAccountingBridgeEngine.ingestAndPost(bad)).not.toThrow();
    });
  });

  describe("Input validation", () => {
    it("THROWS when neither source nor manual_extraction provided", () => {
      expect(() =>
        docustrataAccountingBridgeEngine.ingestAndPost({
          doc_type: "invoice",
          party_name: "X",
          source: {},
        }),
      ).toThrow(/source\.abs_path.*source\.text_content.*manual_invoice.*manual_po/);
    });

    it("THROWS on empty party_name", () => {
      const bad = cleanInvoiceInput();
      bad.party_name = "";
      expect(() => docustrataAccountingBridgeEngine.ingestAndPost(bad)).toThrow(
        /party_name is required/,
      );
    });

    it("THROWS on invalid doc_type", () => {
      const bad = { ...cleanInvoiceInput(), doc_type: "invalid_type" as any };
      expect(() => docustrataAccountingBridgeEngine.ingestAndPost(bad)).toThrow(
        /doc_type must be/,
      );
    });
  });

  describe("batchIngest", () => {
    it("processes multiple docs, aggregates results", () => {
      const r = docustrataAccountingBridgeEngine.batchIngest([
        cleanInvoiceInput("ACME"),
        cleanPOInput("Vendor X"),
        cleanInvoiceInput("ALCOA"),
      ]);
      expect(r.results).toHaveLength(3);
      expect(r.aggregate.total_docs).toBe(3);
      expect(r.aggregate.posted).toBeGreaterThan(0);
      expect(r.aggregate.failed_reconciliations).toBe(0);
    });

    it("aggregate.total_amount_posted sums posted journal entries", () => {
      const r = docustrataAccountingBridgeEngine.batchIngest([
        cleanInvoiceInput(), // $535
        cleanPOInput(), // $530
      ]);
      expect(r.aggregate.total_amount_posted).toBe(1065);
    });

    it("aggregate.failed_reconciliations counts skipped GL posts", () => {
      const bad = cleanInvoiceInput();
      bad.manual_invoice.total = 999;
      const r = docustrataAccountingBridgeEngine.batchIngest([cleanInvoiceInput(), bad]);
      expect(r.aggregate.failed_reconciliations).toBe(1);
      expect(r.aggregate.posted).toBe(1);
      expect(r.aggregate.skipped).toBe(1);
    });

    it("THROWS on empty input array", () => {
      expect(() => docustrataAccountingBridgeEngine.batchIngest([])).toThrow(
        /non-empty array/,
      );
    });
  });

  describe("Audit trail", () => {
    it("records every step of the bridge flow", () => {
      const r = docustrataAccountingBridgeEngine.ingestAndPost(cleanInvoiceInput());
      const joined = r.audit_trail.join(" | ");
      expect(joined).toMatch(/begin:/);
      expect(joined).toMatch(/extracted:/);
      expect(joined).toMatch(/reconcile:/);
      expect(joined).toMatch(/gl-recordInvoice|gl-recordPurchase|gl-skipped/);
    });

    it("audit trail captures failure path when reconciliation fails", () => {
      const bad = cleanInvoiceInput();
      bad.manual_invoice.total = 999;
      const r = docustrataAccountingBridgeEngine.ingestAndPost(bad);
      expect(r.audit_trail.some((s) => s.includes("gl-skipped"))).toBe(true);
      expect(r.audit_trail.some((s) => s.includes("FAIL"))).toBe(true);
    });
  });
});
