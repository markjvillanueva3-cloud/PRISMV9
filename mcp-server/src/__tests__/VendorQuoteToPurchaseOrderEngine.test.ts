/**
 * VendorQuoteToPurchaseOrderEngine.test.ts — hotel iter19 / G3 close-out.
 * Verifies quote→PO conversion, partial receipts, over-receipt refusal,
 * three-way match invariant (hotel-soul), R12 fail-loud.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { vendorQuoteToPurchaseOrderEngine } from "../engines/VendorQuoteToPurchaseOrderEngine.js";

const MSC_QUOTE_INPUT = {
  vendor_id: "VND-MSC",
  vendor_name: "MSC Industrial",
  valid_until: "2026-06-15",
  line_items: [
    { sku: "CARB-EM-1/2", description: "1/2\" 4FL carbide end mill", quoted_qty: 20, unit_price: 35.50 },
    { sku: "INSERT-CNMG432", description: "CNMG432 turning insert", quoted_qty: 100, unit_price: 12.75 },
  ],
};

describe("VendorQuoteToPurchaseOrderEngine — recordVendorQuote", () => {
  beforeEach(() => vendorQuoteToPurchaseOrderEngine.__resetForTests());

  it("creates quote with VQ-NNNNNN id + computes total_value", () => {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    expect(q.id).toMatch(/^VQ-\d{6}$/);
    // 20 × 35.50 + 100 × 12.75 = 710 + 1275 = 1985
    expect(q.total_value).toBe(1985);
    expect(q.status).toBe("open");
  });

  it("defensive copy — mutation does not affect storage", () => {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    q.total_value = 99999;
    const reread = vendorQuoteToPurchaseOrderEngine.getQuote(q.id);
    expect(reread?.total_value).toBe(1985);
  });

  it("R12: rejects empty vendor_id", () => {
    expect(() => vendorQuoteToPurchaseOrderEngine.recordVendorQuote({
      ...MSC_QUOTE_INPUT, vendor_id: "",
    })).toThrow(/empty/);
  });

  it("R12: rejects empty line_items", () => {
    expect(() => vendorQuoteToPurchaseOrderEngine.recordVendorQuote({
      ...MSC_QUOTE_INPUT, line_items: [],
    })).toThrow(/empty/);
  });

  it("R12: rejects duplicate SKU", () => {
    expect(() => vendorQuoteToPurchaseOrderEngine.recordVendorQuote({
      ...MSC_QUOTE_INPUT,
      line_items: [
        { sku: "DUP", description: "a", quoted_qty: 1, unit_price: 1 },
        { sku: "DUP", description: "b", quoted_qty: 2, unit_price: 2 },
      ],
    })).toThrow(/duplicate 'DUP'/);
  });

  it("R12: rejects non-positive qty / price", () => {
    expect(() => vendorQuoteToPurchaseOrderEngine.recordVendorQuote({
      ...MSC_QUOTE_INPUT,
      line_items: [{ sku: "X", description: "x", quoted_qty: 0, unit_price: 1 }],
    })).toThrow(/> 0/);
    expect(() => vendorQuoteToPurchaseOrderEngine.recordVendorQuote({
      ...MSC_QUOTE_INPUT,
      line_items: [{ sku: "X", description: "x", quoted_qty: 1, unit_price: -1 }],
    })).toThrow(/> 0/);
  });
});

describe("VendorQuoteToPurchaseOrderEngine — convertQuoteToPO", () => {
  beforeEach(() => vendorQuoteToPurchaseOrderEngine.__resetForTests());

  it("converts open quote to PO with full quantities", () => {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    const po = vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(q.id, {
      "CARB-EM-1/2": 20, "INSERT-CNMG432": 100,
    });
    expect(po.id).toMatch(/^PO-\d{6}$/);
    expect(po.source_quote_id).toBe(q.id);
    expect(po.total_ordered_value).toBe(1985);
    expect(po.status).toBe("open");
    // Quote flips to converted
    const reread = vendorQuoteToPurchaseOrderEngine.getQuote(q.id);
    expect(reread?.status).toBe("converted");
  });

  it("supports partial quantities (order less than quoted)", () => {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    const po = vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(q.id, {
      "CARB-EM-1/2": 5,  // half-order
    });
    // 5 × 35.50 = 177.50
    expect(po.total_ordered_value).toBe(177.50);
    expect(po.line_items.length).toBe(1);  // only the SKU requested
  });

  it("R12: rejects ordered_qty > quoted_qty", () => {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    expect(() => vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(q.id, {
      "CARB-EM-1/2": 25,  // > 20 quoted
    })).toThrow(/exceeds quoted/);
  });

  it("R12: rejects SKU not on quote", () => {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    expect(() => vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(q.id, {
      "GHOST-SKU": 5,
    })).toThrow(/not on quote/);
  });

  it("R12: rejects double-conversion of same quote", () => {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(q.id, { "CARB-EM-1/2": 5 });
    expect(() => vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(q.id, { "CARB-EM-1/2": 5 }))
      .toThrow(/already converted/);
  });
});

describe("VendorQuoteToPurchaseOrderEngine — recordPOReceipt (over-receipt refusal)", () => {
  beforeEach(() => vendorQuoteToPurchaseOrderEngine.__resetForTests());

  function setupPO() {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    return vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(q.id, {
      "CARB-EM-1/2": 20, "INSERT-CNMG432": 100,
    });
  }

  it("partial receipt → status='partially_received'", () => {
    const po = setupPO();
    const updated = vendorQuoteToPurchaseOrderEngine.recordPOReceipt(po.id, [
      { sku: "CARB-EM-1/2", received_qty: 10 },
    ]);
    expect(updated.status).toBe("partially_received");
    expect(updated.line_items.find(l => l.sku === "CARB-EM-1/2")?.received_qty).toBe(10);
  });

  it("full receipt → status='fully_received'", () => {
    const po = setupPO();
    const updated = vendorQuoteToPurchaseOrderEngine.recordPOReceipt(po.id, [
      { sku: "CARB-EM-1/2", received_qty: 20 },
      { sku: "INSERT-CNMG432", received_qty: 100 },
    ]);
    expect(updated.status).toBe("fully_received");
    expect(updated.total_received_value).toBe(1985);
  });

  it("HOTEL-SOUL: refuses over-receipt (silent absorption blocked)", () => {
    const po = setupPO();
    expect(() => vendorQuoteToPurchaseOrderEngine.recordPOReceipt(po.id, [
      { sku: "CARB-EM-1/2", received_qty: 25 },  // > 20 ordered
    ])).toThrow(/refusing silent over-receipt/);
  });

  it("HOTEL-SOUL: refuses cumulative over-receipt", () => {
    const po = setupPO();
    vendorQuoteToPurchaseOrderEngine.recordPOReceipt(po.id, [{ sku: "CARB-EM-1/2", received_qty: 15 }]);
    // Already 15 received, ordered 20; second receipt of 10 would push to 25 — refuse
    expect(() => vendorQuoteToPurchaseOrderEngine.recordPOReceipt(po.id, [
      { sku: "CARB-EM-1/2", received_qty: 10 },
    ])).toThrow(/refusing silent over-receipt/);
  });

  it("R12: rejects non-positive received_qty", () => {
    const po = setupPO();
    expect(() => vendorQuoteToPurchaseOrderEngine.recordPOReceipt(po.id, [
      { sku: "CARB-EM-1/2", received_qty: 0 },
    ])).toThrow(/> 0/);
  });
});

describe("VendorQuoteToPurchaseOrderEngine — threeWayMatch (hotel-soul invariant)", () => {
  beforeEach(() => vendorQuoteToPurchaseOrderEngine.__resetForTests());

  function fullyReceivedPO() {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    const po = vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(q.id, {
      "CARB-EM-1/2": 20, "INSERT-CNMG432": 100,
    });
    vendorQuoteToPurchaseOrderEngine.recordPOReceipt(po.id, [
      { sku: "CARB-EM-1/2", received_qty: 20 },
      { sku: "INSERT-CNMG432", received_qty: 100 },
    ]);
    return po.id;
  }

  it("matched when PO total == receipt total == invoice total ($1985)", () => {
    const poId = fullyReceivedPO();
    const r = vendorQuoteToPurchaseOrderEngine.threeWayMatch({
      po_id: poId, invoice_total: 1985,
    });
    expect(r.matched).toBe(true);
    expect(r.variance).toBeCloseTo(0, 2);
    expect(r.message).toMatch(/successful/);
    // PO flips to matched status
    const po = vendorQuoteToPurchaseOrderEngine.getPO(poId);
    expect(po?.status).toBe("matched");
  });

  it("HOTEL-SOUL: refuses match when invoice variance > $0.01", () => {
    const poId = fullyReceivedPO();
    const r = vendorQuoteToPurchaseOrderEngine.threeWayMatch({
      po_id: poId, invoice_total: 2000,  // $15 variance
    });
    expect(r.matched).toBe(false);
    expect(r.variance).toBe(15);
    expect(r.message).toMatch(/exceeds tolerance/);
    // PO does NOT flip
    const po = vendorQuoteToPurchaseOrderEngine.getPO(poId);
    expect(po?.status).toBe("fully_received");
  });

  it("R12: rejects 3-way match on not-yet-fully-received PO", () => {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    const po = vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(q.id, { "CARB-EM-1/2": 20 });
    vendorQuoteToPurchaseOrderEngine.recordPOReceipt(po.id, [{ sku: "CARB-EM-1/2", received_qty: 10 }]);
    expect(() => vendorQuoteToPurchaseOrderEngine.threeWayMatch({
      po_id: po.id, invoice_total: 710,
    })).toThrow(/not fully_received/);
  });

  it("rejects further receipts after matched", () => {
    const poId = fullyReceivedPO();
    vendorQuoteToPurchaseOrderEngine.threeWayMatch({ po_id: poId, invoice_total: 1985 });
    expect(() => vendorQuoteToPurchaseOrderEngine.recordPOReceipt(poId, [
      { sku: "CARB-EM-1/2", received_qty: 1 },
    ])).toThrow(/already 3-way matched/);
  });
});

describe("VendorQuoteToPurchaseOrderEngine — listing + filters", () => {
  beforeEach(() => vendorQuoteToPurchaseOrderEngine.__resetForTests());

  it("listQuotes filters by vendor + status", () => {
    vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    vendorQuoteToPurchaseOrderEngine.recordVendorQuote({
      ...MSC_QUOTE_INPUT, vendor_id: "VND-GRAINGER", vendor_name: "Grainger",
    });
    expect(vendorQuoteToPurchaseOrderEngine.listQuotes({ vendor_id: "VND-MSC" }).length).toBe(1);
    expect(vendorQuoteToPurchaseOrderEngine.listQuotes({ status: "open" }).length).toBe(2);
  });

  it("listPOs filters by status", () => {
    const q = vendorQuoteToPurchaseOrderEngine.recordVendorQuote(MSC_QUOTE_INPUT);
    vendorQuoteToPurchaseOrderEngine.convertQuoteToPO(q.id, { "CARB-EM-1/2": 10 });
    expect(vendorQuoteToPurchaseOrderEngine.listPOs({ status: "open" }).length).toBe(1);
  });
});
