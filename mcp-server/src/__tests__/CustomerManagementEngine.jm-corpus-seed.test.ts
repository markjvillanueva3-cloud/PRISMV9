/**
 * CustomerManagementEngine.seedFromJMCorpus — JM Die full-corpus CRM seed
 *
 * Bulk-loads the 473-customer JM Die roster (state/shared/databases/jm-customers.jsonl,
 * emitted by scripts/jm-die-full-corpus-ingest.mjs) into the CRM so the ERP renders real
 * JM customers for full quote-to-ship training + shop-floor simulate testing.
 *
 * Real-value assertions (no toBeDefined() stubs):
 *   - One CRM customer per corpus record; machining-file customers -> active,
 *     scan/doc-only -> prospect; tags from materials_seen + machine_classes_seen;
 *     notes carry the file-bucket counts + source folder.
 *   - Idempotent: re-seeding skips existing (normalized-name dedup) -> no duplicates.
 *   - Case/punctuation-insensitive dedup against pre-existing customers.
 *   - Fail-soft: invalid records skipped; non-array input returns zeroes; NaN
 *     files_total treated as 0; tags deduped + capped at 12.
 *
 * @milestone QUOTE-TO-SHIP-TRAINING / U-JM-CUSTOMER-CORPUS-SEED (slot:hotel)
 */
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { customerManagementEngine } from "../engines/CustomerManagementEngine.js";
import type { JMCorpusCustomerRecord } from "../engines/CustomerManagementEngine.js";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

function reset(): void {
  (customerManagementEngine as any).customers.clear();
  (customerManagementEngine as any).commLogs = [];
  (customerManagementEngine as any).opportunities = [];
  (customerManagementEngine as any).jobHistory.clear();
  (customerManagementEngine as any).nextId = 1;
}

// Real JM Die corpus-shaped records (jm-customers.jsonl schema, incl. an actual
// JM customer key AAAMECONINGPIN observed in the live corpus head).
const SAMPLE: JMCorpusCustomerRecord[] = [
  {
    customer_key: "HOLO-KROME",
    aliases: ["HOLO-KROME", "HOLO KROME"],
    files_total: 312,
    files_by_bucket: { program: 180, cad: 40, print: 60, scan: 20, setup: 12, doc: 0, other: 0 },
    materials_seen: ["D2", "A2", "S7"],
    machine_classes_seen: ["mill", "lathe"],
    source_folders: ["_PART LIBRARY/HOLO-KROME"],
    has_docustrata_record: true,
  },
  {
    customer_key: "ITW",
    aliases: ["ITW"],
    files_total: 95,
    files_by_bucket: { program: 0, cad: 30, print: 25, scan: 40, setup: 0, doc: 0, other: 0 },
    materials_seen: ["M2"],
    machine_classes_seen: ["wedm"],
    source_folders: ["_PART LIBRARY/ITW"],
    has_docustrata_record: false,
  },
  {
    customer_key: "AAAMECONINGPIN",
    aliases: ["AAAMECONINGPIN"],
    files_total: 17,
    files_by_bucket: { program: 0, cad: 0, print: 0, scan: 15, setup: 0, doc: 0, other: 2 },
    materials_seen: [],
    machine_classes_seen: [],
    source_folders: ["_PART LIBRARY/AAAMECONINGPIN"],
    has_docustrata_record: false,
  },
];

describe("CustomerManagementEngine.seedFromJMCorpus", () => {
  beforeEach(reset);

  it("seeds one CRM customer per corpus record with correct status/tags/notes", () => {
    const r = customerManagementEngine.seedFromJMCorpus(SAMPLE);
    expect(r.total_records).toBe(3);
    expect(r.seeded).toBe(3);
    expect(r.skipped_existing).toBe(0);
    expect(r.skipped_invalid).toBe(0);
    // HOLO-KROME (180 programs) + ITW (30 cad / 25 print) have machining files -> active.
    // AAAMECONINGPIN (scans/other only) -> prospect.
    expect(r.active).toBe(2);
    expect(r.prospect).toBe(1);
    expect(r.customer_ids).toHaveLength(3);

    const holo = customerManagementEngine.searchCustomers("HOLO-KROME")[0];
    expect(holo.name).toBe("HOLO-KROME");
    expect(holo.company).toBe("HOLO-KROME");
    expect(holo.status).toBe("active");
    expect(holo.pricing_tier).toBe("standard");
    expect(holo.payment_terms).toBe("Net 30");
    expect(holo.credit_limit).toBe(0);
    expect(holo.current_balance).toBe(0);
    expect(holo.tags).toEqual(["D2", "A2", "S7", "mill", "lathe"]);
    expect(holo.notes).toContain("312 files");
    expect(holo.notes).toContain("180 programs");
    expect(holo.notes).toContain("_PART LIBRARY/HOLO-KROME");

    const pin = customerManagementEngine.searchCustomers("AAAMECONINGPIN")[0];
    expect(pin.status).toBe("prospect");
    expect(pin.tags).toEqual([]);
    expect(pin.notes).toContain("17 files");
  });

  it("marks a scan-only customer ACTIVE when it carries a DocuStrata transaction record", () => {
    const r = customerManagementEngine.seedFromJMCorpus([
      { customer_key: "TXNCO", files_total: 4, files_by_bucket: { scan: 4 }, has_docustrata_record: true },
      { customer_key: "SCANCO", files_total: 4, files_by_bucket: { scan: 4 }, has_docustrata_record: false },
    ]);
    expect(r.seeded).toBe(2);
    expect(r.active).toBe(1); // TXNCO — transacted (invoice/quote on file) even though scan-only
    expect(r.prospect).toBe(1); // SCANCO — scan-only AND never transacted
    expect(customerManagementEngine.searchCustomers("TXNCO")[0].status).toBe("active");
    expect(customerManagementEngine.searchCustomers("SCANCO")[0].status).toBe("prospect");
  });

  it("is idempotent — re-seeding skips all existing records (no duplicates)", () => {
    customerManagementEngine.seedFromJMCorpus(SAMPLE);
    const before = customerManagementEngine.listCustomers().length;
    expect(before).toBe(3);
    const r2 = customerManagementEngine.seedFromJMCorpus(SAMPLE);
    expect(r2.seeded).toBe(0);
    expect(r2.skipped_existing).toBe(3);
    expect(customerManagementEngine.listCustomers().length).toBe(before);
  });

  it("dedups against a pre-existing customer case/punctuation-insensitively", () => {
    customerManagementEngine.createCustomer({
      name: "Holo Krome", company: "Holo Krome", contact_name: "", email: "", phone: "",
      address: { street: "", city: "", state: "", zip: "" },
      credit_limit: 0, payment_terms: "Net 30", pricing_tier: "standard",
      discount_pct: 0, tax_exempt: false, tags: [],
    });
    const r = customerManagementEngine.seedFromJMCorpus([SAMPLE[0]]); // "HOLO-KROME" ~ "Holo Krome"
    expect(r.seeded).toBe(0);
    expect(r.skipped_existing).toBe(1);
    expect(customerManagementEngine.listCustomers().length).toBe(1);
  });

  it("skips invalid records (empty / whitespace / missing key) without throwing", () => {
    const r = customerManagementEngine.seedFromJMCorpus([
      { customer_key: "" },
      { customer_key: "   " },
      {} as JMCorpusCustomerRecord,
      { customer_key: "VALIDCO", files_total: 5, files_by_bucket: { program: 5 } },
    ]);
    expect(r.skipped_invalid).toBe(3);
    expect(r.seeded).toBe(1);
    expect(customerManagementEngine.searchCustomers("VALIDCO")[0].status).toBe("active");
  });

  it("is fail-soft on adversarial input (non-array, NaN counts)", () => {
    expect(customerManagementEngine.seedFromJMCorpus(null as any)).toEqual({
      total_records: 0, seeded: 0, skipped_existing: 0, skipped_invalid: 0, active: 0, prospect: 0, customer_ids: [],
    });
    expect(customerManagementEngine.listCustomers()).toHaveLength(0);

    const r = customerManagementEngine.seedFromJMCorpus([
      { customer_key: "NANCO", files_total: NaN, files_by_bucket: { program: 0 } },
    ]);
    expect(r.seeded).toBe(1);
    const c = customerManagementEngine.searchCustomers("NANCO")[0];
    expect(c.notes).toContain("0 files"); // NaN files_total -> 0
    expect(c.status).toBe("prospect"); // no machining files
  });

  it("dedups + caps tags at 12 from materials_seen + machine_classes_seen", () => {
    const many = Array.from({ length: 20 }, (_, i) => `MAT${i}`);
    const r = customerManagementEngine.seedFromJMCorpus([
      {
        customer_key: "TAGCO", files_total: 3, files_by_bucket: { program: 3 },
        materials_seen: [...many, "MAT0", "MAT1"], machine_classes_seen: ["mill"],
      },
    ]);
    expect(r.seeded).toBe(1);
    const c = customerManagementEngine.searchCustomers("TAGCO")[0];
    expect(c.tags).toHaveLength(12);
    expect(new Set(c.tags).size).toBe(12); // deduped
  });
});

describe("businessDispatcher → customer_seed_jm_corpus (wiring round-trip)", () => {
  let handler:
    | ((args: { action: string; params?: Record<string, any> }) => Promise<any>)
    | null = null;

  beforeAll(() => {
    const fakeServer = {
      tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
        if (_name === "prism_business") handler = fn;
      },
    };
    registerBusinessDispatcher(fakeServer as any);
    if (!handler) throw new Error("businessDispatcher did not register prism_business");
  });

  beforeEach(reset);

  async function call(action: string, params: Record<string, any> = {}): Promise<{ raw: any; ok: boolean; error?: string }> {
    const r = await handler!({ action, params });
    let parsed: any = r;
    if (r && Array.isArray(r.content) && r.content[0]?.text) {
      try { parsed = JSON.parse(r.content[0].text); } catch { /* keep raw */ }
    } else if (r && r.type === "text" && typeof r.text === "string") {
      try { parsed = JSON.parse(r.text); } catch { /* keep raw */ }
    }
    return { raw: parsed?.result ?? parsed?.data ?? parsed, ok: !parsed?.error && parsed?.success !== false, error: parsed?.error };
  }

  it("seeds via params.records and the customers become listable through the dispatcher", async () => {
    const seed = await call("customer_seed_jm_corpus", { records: SAMPLE });
    expect(seed.ok).toBe(true);
    expect(seed.raw.seeded).toBe(3);
    expect(seed.raw.active).toBe(2);
    expect(seed.raw.prospect).toBe(1);

    const list = await call("customer_list", {});
    expect(list.ok).toBe(true);
    const names = (list.raw as Array<{ name: string }>).map((c) => c.name);
    expect(names).toContain("HOLO-KROME");
    expect(names).toContain("ITW");
    expect(names).toContain("AAAMECONINGPIN");
  });

  it("re-seeding through the dispatcher is idempotent (skips existing)", async () => {
    await call("customer_seed_jm_corpus", { records: SAMPLE });
    const again = await call("customer_seed_jm_corpus", { records: SAMPLE });
    expect(again.ok).toBe(true);
    expect(again.raw.seeded).toBe(0);
    expect(again.raw.skipped_existing).toBe(3);
  });
});
