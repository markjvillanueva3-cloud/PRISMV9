/**
 * DocumentInboxEngine.seedFromJMCorpus — JM-Die doc-archive bulk index (U-JMDOC07)
 *
 * Bulk-indexes pre-classified JM-Die documents (jm-file-inventory.jsonl rows routed by the
 * accountability ledger to the indexed-only doc-archive disposition) into the inbox as ARCHIVED
 * items — bypassing the async Vision/OCR ingest (the corpus already classified them).
 *
 * Real-value assertions (no toBeDefined()/toBeUndefined() stubs):
 *   - One archived InboxItem per allowlisted record; (source,bucket) -> document_type mapping;
 *     status="archived"; source_path / company_name / material / tags carried through.
 *   - SOUL GUARD: financial buckets (sales_orders, closed_orders, invoices, tax_financial,
 *     accounting) are REJECTED (skipped_out_of_scope) and never become inbox items — they are
 *     link-only (U-JMDOC10). This is the financial-discipline (no silent-financial-clobber) invariant.
 *   - Idempotent: re-seeding dedups by source_path -> no duplicates.
 *   - Fail-soft: out-of-scope tuples skipped; invalid rows skipped; non-array input -> zeroes.
 *
 * @milestone JM-DOC-POPULATION-MS0 / U-JMDOC07 (slot:hotel)
 */
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { documentInboxEngine, JM_DOC_ARCHIVE_ALLOWLIST, JM_MANIFEST_ARCHIVE_ALLOWLIST, JM_FINANCIAL_ARCHIVE_ALLOWLIST } from "../engines/DocumentInboxEngine.js";
import type { JMArchiveSeedRecord } from "../engines/DocumentInboxEngine.js";
import { registerInboxDispatcher } from "../tools/dispatchers/inboxDispatcher.js";

function reset(): void {
  (documentInboxEngine as any).items.clear();
  (documentInboxEngine as any).nextId = 1;
}

// jm-file-inventory.jsonl-shaped rows across the 8 allowlisted doc-archive tuples.
const SAMPLE: JMArchiveSeedRecord[] = [
  { path: "H:/PRISM/Docustrata/_organized/HOLO-KROME/print_A.pdf", source: "docustrata_organized", bucket: "prints", customer: "HOLO-KROME", material: "D2", machine_class: null },
  { path: "H:/PRISM/Docustrata/_organized/My Notebook/note_1.pdf", source: "docustrata_organized", bucket: "notes", customer: null, material: null, machine_class: null },
  { path: "H:/PRISM/Docustrata/_organized/PS/packing_55.pdf", source: "docustrata_organized", bucket: "packing_slips", customer: "ITW", material: null, machine_class: null },
  { path: "H:/PRISM/JM DIE/_PROC/doc_readme.pdf", source: "jm_die_category", bucket: "doc", customer: null, material: null, machine_class: null },
];

// A real-shaped financial doc (Sales_Order_951 = JM buying steel from Griggs). MUST be rejected.
const FINANCIAL: JMArchiveSeedRecord = {
  path: "H:/PRISM/Docustrata/_organized/SO/Sales_Order_951.pdf",
  source: "docustrata_organized", bucket: "sales_orders", customer: "J.M. DIE CO.", material: null, machine_class: null,
};

describe("DocumentInboxEngine.seedFromJMCorpus", () => {
  beforeEach(reset);

  it("seeds one archived inbox item per allowlisted record with correct type/status/fields", () => {
    const r = documentInboxEngine.seedFromJMCorpus(SAMPLE);
    expect(r.total_records).toBe(4);
    expect(r.seeded).toBe(4);
    expect(r.skipped_existing).toBe(0);
    expect(r.skipped_out_of_scope).toBe(0);
    expect(r.skipped_invalid).toBe(0);
    expect(r.by_type).toEqual({ blueprint: 1, correspondence: 1, packing_slip: 1, unknown: 1 });
    expect(r.item_ids).toHaveLength(4);

    const bp = documentInboxEngine.list({ document_type: "blueprint" }).items;
    expect(bp).toHaveLength(1);
    expect(bp[0].status).toBe("archived");
    expect(bp[0].original_name).toBe("print_A.pdf");
    expect(bp[0].classification_confidence).toBe(0.5);
    expect(bp[0].extracted_data.custom_fields.source_path).toBe(SAMPLE[0].path);
    expect(bp[0].extracted_data.custom_fields.corpus_bucket).toBe("prints");
    expect(bp[0].extracted_data.company_name).toBe("HOLO-KROME");
    expect(bp[0].extracted_data.material).toBe("D2");
    expect(bp[0].tags).toContain("prints");
    expect(bp[0].tags).toContain("docustrata_organized");
    expect(bp[0].tags).toContain("HOLO-KROME");
    expect(bp[0].source.type).toBe("batch");
    expect(bp[0].source.origin).toBe("jm-docustrata-corpus");

    const ps = documentInboxEngine.list({ document_type: "packing_slip" }).items;
    expect(ps[0].original_name).toBe("packing_55.pdf");
    expect(ps[0].extracted_data.company_name).toBe("ITW");
  });

  it("SOUL GUARD: financial buckets are rejected (skipped_out_of_scope) and never become inbox items", () => {
    const r = documentInboxEngine.seedFromJMCorpus([FINANCIAL]);
    expect(r.seeded).toBe(0);
    expect(r.skipped_out_of_scope).toBe(1);
    expect(documentInboxEngine.list({}).total).toBe(0);

    // The financial exclusion is STRUCTURAL: the allowlist is exactly the 8 non-financial tuples.
    expect(Object.keys(JM_DOC_ARCHIVE_ALLOWLIST).sort()).toEqual([
      "docustrata_organized/imported",
      "docustrata_organized/laser_sheets",
      "docustrata_organized/notes",
      "docustrata_organized/packing_slips",
      "docustrata_organized/prints",
      "docustrata_organized/scans",
      "docustrata_organized/shipping",
      "jm_die_category/doc",
    ]);
    expect("docustrata_organized/sales_orders" in JM_DOC_ARCHIVE_ALLOWLIST).toBe(false);
    expect("docustrata_organized/closed_orders" in JM_DOC_ARCHIVE_ALLOWLIST).toBe(false);
    expect("docustrata_organized/invoices" in JM_DOC_ARCHIVE_ALLOWLIST).toBe(false);
    expect("docustrata_organized/tax_financial" in JM_DOC_ARCHIVE_ALLOWLIST).toBe(false);
    expect("docustrata_organized/accounting" in JM_DOC_ARCHIVE_ALLOWLIST).toBe(false);
  });

  it("mixes scope: seeds allowlisted, rejects financial + out-of-scope in one batch", () => {
    const r = documentInboxEngine.seedFromJMCorpus([
      SAMPLE[0],                                                     // prints -> seeded
      FINANCIAL,                                                    // sales_orders -> out_of_scope
      { path: "x.nc", source: "part_library", bucket: "program" },  // consumed-tuple, not archive -> out_of_scope
    ]);
    expect(r.seeded).toBe(1);
    expect(r.skipped_out_of_scope).toBe(2);
    expect(documentInboxEngine.list({}).total).toBe(1);
  });

  it("is idempotent — re-seeding dedups by source_path (no duplicates)", () => {
    documentInboxEngine.seedFromJMCorpus(SAMPLE);
    const before = documentInboxEngine.list({}).total;
    expect(before).toBe(4);
    const r2 = documentInboxEngine.seedFromJMCorpus(SAMPLE);
    expect(r2.seeded).toBe(0);
    expect(r2.skipped_existing).toBe(4);
    expect(documentInboxEngine.list({}).total).toBe(4);
  });

  it("dedups duplicate paths within a single batch", () => {
    const r = documentInboxEngine.seedFromJMCorpus([SAMPLE[0], { ...SAMPLE[0] }]);
    expect(r.seeded).toBe(1);
    expect(r.skipped_existing).toBe(1);
  });

  it("skips invalid records (missing path/source/bucket) and is fail-soft on non-array", () => {
    const r = documentInboxEngine.seedFromJMCorpus([
      { path: "", source: "docustrata_organized", bucket: "prints" } as JMArchiveSeedRecord,
      { source: "docustrata_organized", bucket: "prints" } as JMArchiveSeedRecord,
      {} as JMArchiveSeedRecord,
      SAMPLE[1],
    ]);
    expect(r.skipped_invalid).toBe(3);
    expect(r.seeded).toBe(1);

    expect(documentInboxEngine.seedFromJMCorpus(null as any)).toEqual({
      total_records: 0, seeded: 0, skipped_existing: 0, skipped_out_of_scope: 0,
      skipped_invalid: 0, by_type: {}, item_ids: [],
    });
  });
});

describe("inboxDispatcher → inbox_seed_jm_corpus (wiring round-trip)", () => {
  let handler: ((args: { action: string; params?: Record<string, any> }) => Promise<any>) | null = null;

  beforeAll(() => {
    const fakeServer = {
      tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
        if (_name === "prism_inbox") handler = fn;
      },
    };
    registerInboxDispatcher(fakeServer as any);
    if (!handler) throw new Error("inboxDispatcher did not register prism_inbox");
  });

  beforeEach(reset);

  async function call(action: string, params: Record<string, any> = {}): Promise<{ raw: any; ok: boolean }> {
    const r = await handler!({ action, params });
    let parsed: any = r;
    if (r && Array.isArray(r.content) && r.content[0]?.text) {
      try { parsed = JSON.parse(r.content[0].text); } catch { /* keep raw */ }
    }
    return { raw: parsed, ok: !parsed?.error && parsed?.success !== false };
  }

  it("seeds via params.records and the archived items show up in stats", async () => {
    const seed = await call("inbox_seed_jm_corpus", { records: SAMPLE });
    expect(seed.ok).toBe(true);
    expect(seed.raw.seeded).toBe(4);

    const stats = await call("inbox_stats", {});
    expect(stats.ok).toBe(true);
    expect(stats.raw.total_items).toBe(4);
    expect(stats.raw.by_status.archived).toBe(4);
  });

  it("rejects a financial record through the dispatcher too (soul guard end-to-end)", async () => {
    const seed = await call("inbox_seed_jm_corpus", { records: [FINANCIAL] });
    expect(seed.ok).toBe(true);
    expect(seed.raw.seeded).toBe(0);
    expect(seed.raw.skipped_out_of_scope).toBe(1);
    const stats = await call("inbox_stats", {});
    expect(stats.raw.total_items).toBe(0);
  });
});

// Raw part-library scans/prints — the U-JMDOC08 viewer-only disposition.
const VIEWER_SAMPLE: JMArchiveSeedRecord[] = [
  { path: "H:/PRISM/JM DIE/_PART LIBRARY/HOLO-KROME/R910/scan_doc.pdf", source: "part_library", bucket: "scan", customer: "HOLO-KROME", material: null, machine_class: null },
  { path: "H:/PRISM/JM DIE/_CAT/print_X.pdf", source: "jm_die_category", bucket: "print", customer: null, material: null, machine_class: "mill" },
];

describe("DocumentInboxEngine.seedViewerArchive (U-JMDOC08 viewer-only)", () => {
  beforeEach(reset);

  it("seeds viewer-only items with archive_class/ocr_status, 0.3 confidence, and scan->unknown print->blueprint", () => {
    const r = documentInboxEngine.seedViewerArchive(VIEWER_SAMPLE);
    expect(r.seeded).toBe(2);
    expect(r.by_type).toEqual({ unknown: 1, blueprint: 1 });

    const scan = documentInboxEngine.list({ document_type: "unknown" }).items[0];
    expect(scan.status).toBe("archived");
    expect(scan.classification_confidence).toBe(0.3);
    expect(scan.extracted_data.custom_fields.archive_class).toBe("viewer-only");
    expect(scan.extracted_data.custom_fields.ocr_status).toBe("pending");
    expect(scan.extracted_data.custom_fields.source_path).toBe(VIEWER_SAMPLE[0].path);
    expect(scan.source.origin).toBe("jm-part-library-scans");
    expect(scan.source.batch_id).toBe("JM-DOC-POPULATION-MS0/U-JMDOC08");

    const print = documentInboxEngine.list({ document_type: "blueprint" }).items[0];
    expect(print.original_name).toBe("print_X.pdf");
    expect(print.extracted_data.custom_fields.machine_class).toBe("mill");
  });

  it("rejects financial AND indexed-only tuples (viewer allowlist is scan/print only)", () => {
    const r = documentInboxEngine.seedViewerArchive([FINANCIAL, SAMPLE[0] /* docustrata_organized/prints */]);
    expect(r.seeded).toBe(0);
    expect(r.skipped_out_of_scope).toBe(2);
  });

  it("shares the dedup set with seedFromJMCorpus — a path seeded once is never double-seeded across dispositions", () => {
    const P = "H:/PRISM/JM DIE/_PART LIBRARY/X/dup.pdf";
    const v = documentInboxEngine.seedViewerArchive([{ path: P, source: "part_library", bucket: "scan" }]);
    expect(v.seeded).toBe(1);
    // Same path arriving via the indexed path (different tuple) is skipped as existing, not re-added.
    const d = documentInboxEngine.seedFromJMCorpus([{ path: P, source: "docustrata_organized", bucket: "prints" }]);
    expect(d.seeded).toBe(0);
    expect(d.skipped_existing).toBe(1);
    expect(documentInboxEngine.list({}).total).toBe(1);
  });

  it("the two allowlists are disjoint — seedFromJMCorpus rejects scan/print viewer tuples", () => {
    const r = documentInboxEngine.seedFromJMCorpus(VIEWER_SAMPLE);
    expect(r.seeded).toBe(0);
    expect(r.skipped_out_of_scope).toBe(2);
  });
});

describe("inboxDispatcher → inbox_seed_jm_viewer (wiring round-trip)", () => {
  let handler: ((args: { action: string; params?: Record<string, any> }) => Promise<any>) | null = null;

  beforeAll(() => {
    const fakeServer = {
      tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
        if (_name === "prism_inbox") handler = fn;
      },
    };
    registerInboxDispatcher(fakeServer as any);
    if (!handler) throw new Error("inboxDispatcher did not register prism_inbox");
  });

  beforeEach(reset);

  it("seeds viewer archive via params.records and items show up archived", async () => {
    const r = await handler!({ action: "inbox_seed_jm_viewer", params: { records: VIEWER_SAMPLE } });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.seeded).toBe(2);
    const stats = await handler!({ action: "inbox_stats", params: {} });
    const s = JSON.parse(stats.content[0].text);
    expect(s.total_items).toBe(2);
    expect(s.by_status.archived).toBe(2);
  });
});

// DocuStrata manifest docs — the U-JMDOC09 manifest-pointer disposition.
const MANIFEST_SAMPLE: JMArchiveSeedRecord[] = [
  { path: "H:/PRISM/Docustrata/manifest-doc-001.pdf", source: "docustrata_manifest", bucket: "doc", customer: null, material: null, machine_class: null },
  { path: "H:/PRISM/Docustrata/manifest-doc-002.pdf", source: "docustrata_manifest", bucket: "doc", customer: "OMG INC", material: null, machine_class: null },
];

describe("DocumentInboxEngine.seedManifestPointers (U-JMDOC09 manifest pointers)", () => {
  beforeEach(reset);

  it("seeds manifest pointers with archive_class/ocr_status/manifest_ref + 0.4 confidence", () => {
    const r = documentInboxEngine.seedManifestPointers(MANIFEST_SAMPLE);
    expect(r.seeded).toBe(2);
    expect(r.by_type).toEqual({ unknown: 2 });
    const item = documentInboxEngine.list({}).items.find((i) => i.original_name === "manifest-doc-001.pdf")!;
    expect(item.status).toBe("archived");
    expect(item.classification_confidence).toBe(0.4);
    expect(item.extracted_data.custom_fields.archive_class).toBe("manifest-pointer");
    expect(item.extracted_data.custom_fields.ocr_status).toBe("indexed-in-manifest");
    expect(item.extracted_data.custom_fields.manifest_ref).toBe(MANIFEST_SAMPLE[0].path);
    expect(item.source.origin).toBe("jm-docustrata-manifest");
    expect(item.source.batch_id).toBe("JM-DOC-POPULATION-MS0/U-JMDOC09");
  });

  it("manifest allowlist is exactly docustrata_manifest/doc — financial+quote manifest tuples excluded", () => {
    expect(Object.keys(JM_MANIFEST_ARCHIVE_ALLOWLIST)).toEqual(["docustrata_manifest/doc"]);
    expect("docustrata_manifest/invoice" in JM_MANIFEST_ARCHIVE_ALLOWLIST).toBe(false);
    expect("docustrata_manifest/customer_po" in JM_MANIFEST_ARCHIVE_ALLOWLIST).toBe(false);
    expect("docustrata_manifest/quote" in JM_MANIFEST_ARCHIVE_ALLOWLIST).toBe(false);
    // and it rejects them at runtime
    const r = documentInboxEngine.seedManifestPointers([
      { path: "inv.pdf", source: "docustrata_manifest", bucket: "invoice" },
      { path: "q.pdf", source: "docustrata_manifest", bucket: "quote" },
      { path: "po.pdf", source: "docustrata_manifest", bucket: "customer_po" },
    ]);
    expect(r.seeded).toBe(0);
    expect(r.skipped_out_of_scope).toBe(3);
  });

  it("shares dedup with the other seeds; non-manifest tuples are out-of-scope", () => {
    documentInboxEngine.seedManifestPointers([MANIFEST_SAMPLE[0]]);
    const dup = documentInboxEngine.seedManifestPointers([MANIFEST_SAMPLE[0]]);
    expect(dup.seeded).toBe(0);
    expect(dup.skipped_existing).toBe(1);
    // doc-archive + viewer tuples are out-of-scope for the manifest seed
    const oos = documentInboxEngine.seedManifestPointers([SAMPLE[0], VIEWER_SAMPLE[0]]);
    expect(oos.seeded).toBe(0);
    expect(oos.skipped_out_of_scope).toBe(2);
  });
});

describe("inboxDispatcher → inbox_seed_jm_manifest (wiring round-trip)", () => {
  let handler: ((args: { action: string; params?: Record<string, any> }) => Promise<any>) | null = null;
  beforeAll(() => {
    const fakeServer = {
      tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
        if (_name === "prism_inbox") handler = fn;
      },
    };
    registerInboxDispatcher(fakeServer as any);
    if (!handler) throw new Error("inboxDispatcher did not register prism_inbox");
  });
  beforeEach(reset);

  it("seeds manifest pointers via params.records and items show up archived", async () => {
    const r = await handler!({ action: "inbox_seed_jm_manifest", params: { records: MANIFEST_SAMPLE } });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.seeded).toBe(2);
    const stats = await handler!({ action: "inbox_stats", params: {} });
    const s = JSON.parse(stats.content[0].text);
    expect(s.total_items).toBe(2);
    expect(s.by_status.archived).toBe(2);
  });
});

// ----------------------------------------------------------------------------
// U-JMDOC10 — DocuStrata FINANCIAL documents, archived as LINK-ONLY pointers.
// These are EVIDENCE attached to customers/jobs — NEVER discrete AR/AP/GL records.
// ----------------------------------------------------------------------------

// Real-shaped financial docs spanning the 8 financial tuples (organized SO/invoice/tax/accounting +
// manifest invoice/customer_po/acknowledgment). order docs -> purchase_order, invoices -> invoice,
// tax/accounting -> unknown.
const FINANCIAL_SAMPLE: JMArchiveSeedRecord[] = [
  { path: "H:/PRISM/Docustrata/_organized/SO/Sales_Order_951.pdf", source: "docustrata_organized", bucket: "sales_orders", customer: "J.M. DIE CO.", material: null, machine_class: null },
  { path: "H:/PRISM/Docustrata/_organized/SO/Closed_Order_42.pdf", source: "docustrata_organized", bucket: "closed_orders", customer: "ITW", material: null, machine_class: null },
  { path: "H:/PRISM/Docustrata/_organized/INV/Invoice_8801.pdf", source: "docustrata_organized", bucket: "invoices", customer: "ALCOA", material: null, machine_class: null },
  { path: "H:/PRISM/Docustrata/_organized/TAX/1099_2024.pdf", source: "docustrata_organized", bucket: "tax_financial", customer: null, material: null, machine_class: null },
  { path: "H:/PRISM/Docustrata/_organized/ACCT/GL_export.pdf", source: "docustrata_organized", bucket: "accounting", customer: null, material: null, machine_class: null },
  { path: "H:/PRISM/Docustrata/manifest-inv-001.pdf", source: "docustrata_manifest", bucket: "invoice", customer: "SFS", material: null, machine_class: null },
  { path: "H:/PRISM/Docustrata/manifest-po-001.pdf", source: "docustrata_manifest", bucket: "customer_po", customer: "OPTIMAS", material: null, machine_class: null },
  { path: "H:/PRISM/Docustrata/manifest-ack-001.pdf", source: "docustrata_manifest", bucket: "acknowledgment", customer: null, material: null, machine_class: null },
];

describe("DocumentInboxEngine.seedFinancialPointers (U-JMDOC10 financial link-only)", () => {
  beforeEach(reset);

  it("seeds financial pointers with financial-link guard, 0.4 confidence, financial origin, correct doc_type per tuple", () => {
    const r = documentInboxEngine.seedFinancialPointers(FINANCIAL_SAMPLE);
    expect(r.total_records).toBe(8);
    expect(r.seeded).toBe(8);
    expect(r.skipped_existing).toBe(0);
    expect(r.skipped_out_of_scope).toBe(0);
    expect(r.skipped_invalid).toBe(0);
    // sales_orders + closed_orders + customer_po + acknowledgment -> purchase_order (4);
    // invoices + manifest/invoice -> invoice (2); tax_financial + accounting -> unknown (2).
    expect(r.by_type).toEqual({ purchase_order: 4, invoice: 2, unknown: 2 });
    expect(r.item_ids).toHaveLength(8);

    // Sales order -> purchase_order, carries the financial-link guard.
    const so = documentInboxEngine.list({}).items.find((i) => i.original_name === "Sales_Order_951.pdf")!;
    expect(so.document_type).toBe("purchase_order");
    expect(so.status).toBe("archived");
    expect(so.classification_confidence).toBe(0.4);
    expect(so.extracted_data.custom_fields.archive_class).toBe("financial-link");
    expect(so.extracted_data.custom_fields.financial_guard).toBe("true");
    expect(so.extracted_data.custom_fields.ocr_status).toBe("indexed-in-manifest");
    expect(so.extracted_data.custom_fields.source_path).toBe(FINANCIAL_SAMPLE[0].path);
    expect(so.extracted_data.custom_fields.corpus_bucket).toBe("sales_orders");
    expect(so.extracted_data.company_name).toBe("J.M. DIE CO.");
    expect(so.source.type).toBe("batch");
    expect(so.source.origin).toBe("jm-docustrata-financial");
    expect(so.source.batch_id).toBe("JM-DOC-POPULATION-MS0/U-JMDOC10");

    // invoices bucket -> invoice document_type.
    const inv = documentInboxEngine.list({}).items.find((i) => i.original_name === "Invoice_8801.pdf")!;
    expect(inv.document_type).toBe("invoice");
    expect(inv.extracted_data.custom_fields.financial_guard).toBe("true");

    // tax_financial -> unknown (not part-orderable, no purchase/invoice semantics).
    const tax = documentInboxEngine.list({}).items.find((i) => i.original_name === "1099_2024.pdf")!;
    expect(tax.document_type).toBe("unknown");

    // manifest acknowledgment -> purchase_order (order-reference document).
    const ack = documentInboxEngine.list({}).items.find((i) => i.original_name === "manifest-ack-001.pdf")!;
    expect(ack.document_type).toBe("purchase_order");
  });

  it("SOUL: financial items are POINTERS (archived + financial-link), and the allowlist is EXACTLY the 8 financial tuples", () => {
    const r = documentInboxEngine.seedFinancialPointers(FINANCIAL_SAMPLE);
    expect(r.seeded).toBe(8);
    // Every seeded item is an archived pointer carrying the financial guard — no item is in any other status.
    const all = documentInboxEngine.list({}).items;
    expect(all).toHaveLength(8);
    for (const item of all) {
      expect(item.status).toBe("archived");
      expect(item.extracted_data.custom_fields.archive_class).toBe("financial-link");
      expect(item.extracted_data.custom_fields.financial_guard).toBe("true");
      // Pointer only: no part match, no linked records, no file attached.
      expect(item.matched_part_ids).toEqual([]);
      expect(item.linked_records).toEqual([]);
      expect(item.file_id).toBe(undefined);
    }

    // STRUCTURAL: the financial allowlist is exactly the 8 financial tuples — nothing else.
    expect(Object.keys(JM_FINANCIAL_ARCHIVE_ALLOWLIST).sort()).toEqual([
      "docustrata_manifest/acknowledgment",
      "docustrata_manifest/customer_po",
      "docustrata_manifest/invoice",
      "docustrata_organized/accounting",
      "docustrata_organized/closed_orders",
      "docustrata_organized/invoices",
      "docustrata_organized/sales_orders",
      "docustrata_organized/tax_financial",
    ]);
  });

  it("rejects every NON-financial tuple (doc-archive, viewer, manifest-doc are out_of_scope)", () => {
    // doc-archive (SAMPLE[0]=prints), viewer (VIEWER_SAMPLE[0]=scan), manifest-doc (MANIFEST_SAMPLE[0]=doc)
    // are NOT financial and must be rejected by seedFinancialPointers.
    const r = documentInboxEngine.seedFinancialPointers([SAMPLE[0], VIEWER_SAMPLE[0], MANIFEST_SAMPLE[0]]);
    expect(r.seeded).toBe(0);
    expect(r.skipped_out_of_scope).toBe(3);
    expect(documentInboxEngine.list({}).total).toBe(0);

    // And the financial tuples are absent from the other three allowlists (cross-allowlist disjointness):
    expect("docustrata_organized/sales_orders" in JM_DOC_ARCHIVE_ALLOWLIST).toBe(false);
    expect("docustrata_manifest/invoice" in JM_MANIFEST_ARCHIVE_ALLOWLIST).toBe(false);
  });

  it("shares the dedup set with the other seeds — a path seeded once is skipped_existing", () => {
    const f = documentInboxEngine.seedFinancialPointers([FINANCIAL_SAMPLE[0]]);
    expect(f.seeded).toBe(1);
    // Re-seeding the same financial path is skipped, not duplicated.
    const again = documentInboxEngine.seedFinancialPointers([FINANCIAL_SAMPLE[0]]);
    expect(again.seeded).toBe(0);
    expect(again.skipped_existing).toBe(1);
    expect(documentInboxEngine.list({}).total).toBe(1);
  });

  it("is fail-soft: skips invalid financial rows, and non-array input -> zeroes", () => {
    const r = documentInboxEngine.seedFinancialPointers([
      { path: "", source: "docustrata_organized", bucket: "sales_orders" } as JMArchiveSeedRecord,
      {} as JMArchiveSeedRecord,
      FINANCIAL_SAMPLE[2],
    ]);
    expect(r.skipped_invalid).toBe(2);
    expect(r.seeded).toBe(1);

    expect(documentInboxEngine.seedFinancialPointers(undefined as any)).toEqual({
      total_records: 0, seeded: 0, skipped_existing: 0, skipped_out_of_scope: 0,
      skipped_invalid: 0, by_type: {}, item_ids: [],
    });
  });
});

describe("inboxDispatcher → inbox_seed_jm_financial (wiring round-trip)", () => {
  let handler: ((args: { action: string; params?: Record<string, any> }) => Promise<any>) | null = null;
  beforeAll(() => {
    const fakeServer = {
      tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
        if (_name === "prism_inbox") handler = fn;
      },
    };
    registerInboxDispatcher(fakeServer as any);
    if (!handler) throw new Error("inboxDispatcher did not register prism_inbox");
  });
  beforeEach(reset);

  it("seeds financial pointers via params.records and items show up archived in stats", async () => {
    const r = await handler!({ action: "inbox_seed_jm_financial", params: { records: FINANCIAL_SAMPLE } });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.seeded).toBe(8);
    const stats = await handler!({ action: "inbox_stats", params: {} });
    const s = JSON.parse(stats.content[0].text);
    expect(s.total_items).toBe(8);
    expect(s.by_status.archived).toBe(8);
  });
});

// U-JMDOC-SYNERGY-STATUS: closed-loop population-coverage query surface. Real-data test — the action
// reads the committed jm-population-status.json dashboard; we assert it faithfully surfaces that file
// (parity), so the test verifies the action's intent (expose live coverage) without freezing numbers
// that legitimately change as more tuples ship.
describe("inboxDispatcher → inbox_population_status (closed-loop coverage query)", () => {
  let handler: ((args: { action: string; params?: Record<string, any> }) => Promise<any>) | null = null;
  beforeAll(() => {
    const fakeServer = {
      tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
        if (_name === "prism_inbox") handler = fn;
      },
    };
    registerInboxDispatcher(fakeServer as any);
    if (!handler) throw new Error("inboxDispatcher did not register prism_inbox");
  });

  function locateDashboard(): string {
    const rel = "state/shared/dashboards/jm-population-status.json";
    const cands = [resolve(process.cwd(), "..", rel), resolve(process.cwd(), rel), resolve("H:/PRISM", rel)];
    const src = cands.find((p) => existsSync(p));
    if (!src) throw new Error(`jm-population-status.json not found (looked in: ${cands.join(", ")})`);
    return src;
  }

  it("surfaces live JM-corpus coverage that matches the dashboard sidecar exactly", async () => {
    const r = await handler!({ action: "inbox_population_status", params: {} });
    const parsed = JSON.parse(r.content[0].text);
    const snap = JSON.parse(readFileSync(locateDashboard(), "utf8"));

    // Parity: the action must reflect the dashboard, not a hand-rolled/stale copy.
    // EVERY surfaced field is parity-locked — a silent divergence on any of them (especially the
    // tuple-level pending_detail, the highest data-sensitivity field) must fail this test.
    expect(parsed.populated).toBe(snap.shipped_volume > 0);
    expect(parsed.coverage_pct).toBe(snap.shipped_coverage_pct);
    expect(parsed.shipped_volume).toBe(snap.shipped_volume);
    expect(parsed.deferred_volume).toBe(snap.deferred_volume);
    expect(parsed.pending_volume).toBe(snap.pending_volume);
    expect(parsed.total_documents).toBe(snap.total_documents);
    expect(parsed.customers).toBe(snap.customers);
    expect(parsed.financial_guarded).toBe(snap.financial_guarded);
    expect(parsed.gate_green).toBe(snap.gate_green);
    expect(parsed.tuples).toEqual(snap.tuples);
    expect(parsed.by_disposition).toEqual(snap.by_disposition);
    expect(parsed.pending_detail).toEqual(snap.pending_detail);
    expect(parsed.milestone).toBe(snap.milestone);

    // Sanity: this is real population, not an empty/stub response.
    expect(parsed.shipped_volume).toBeGreaterThan(0);
    expect(parsed.coverage_pct).toBeGreaterThan(0);
    expect(parsed.shipped_volume).toBeLessThanOrEqual(parsed.total_documents);
    // financial docs are pointers, but they ARE counted as guarded — invariant must hold.
    expect(parsed.financial_guarded).toBeGreaterThanOrEqual(0);
    // Surface exposes AGGREGATES only — pending_detail rows are {tuple,count,disposition,unit,owner},
    // never raw documents/PII. Assert each row is a count-shaped object (no document/path/customer field).
    for (const row of parsed.pending_detail ?? []) {
      expect(typeof row.count).toBe("number");
      expect("path" in row).toBe(false);
      expect("customer" in row).toBe(false);
    }
    // The committed dashboard carries a valid generated_at → stale resolves to a concrete boolean.
    expect(typeof parsed.stale).toBe("boolean");
  });

  it("is read-only — querying status creates zero inbox items", async () => {
    reset();
    await handler!({ action: "inbox_population_status", params: {} });
    const stats = await handler!({ action: "inbox_stats", params: {} });
    const s = JSON.parse(stats.content[0].text);
    expect(s.total_items).toBe(0);
  });
});
