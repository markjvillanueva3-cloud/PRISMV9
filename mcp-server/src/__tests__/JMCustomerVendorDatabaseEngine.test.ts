/**
 * JMCustomerVendorDatabaseEngine.test.ts —
 * QUOTING-SYNERGY-MS0/U-QP-CUSTOMER-VENDOR-DB-QUERY (slot:charlie iter57 2026-05-27).
 *
 * Tests via tmpdir-rooted synthetic JSONL DBs so the engine never touches
 * the real H:/PRISM/state/shared/databases/ outputs during test runs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  JMCustomerVendorDatabaseEngine,
  type CustomerRecord,
  type VendorRecord,
} from "../engines/JMCustomerVendorDatabaseEngine.js";

const FONTANA_FILES = 7136;
const ALLFAST_FILES = 6901;
const SMALL_CUST_FILES = 50;
const MICHIGAN_SPEND = 66749.98;
const CINCINNATI_SPEND = 59559.96;
const SMALL_VENDOR_SPEND = 1132.6;

function makeCustomer(key: string, files: number, extras: Partial<CustomerRecord> = {}): CustomerRecord {
  return {
    customer_key: key,
    aliases: [key],
    files_total: files,
    files_by_bucket: { program: 0, cad: 0, print: 0, scan: 0, setup: 0, doc: 0, other: files },
    materials_seen: [],
    machine_classes_seen: [],
    first_seen_date: null,
    last_seen_date: null,
    has_docustrata_record: false,
    source_folders: [],
    ...extras,
  };
}

function makeVendor(key: string, spend: number, grades: string[] = []): VendorRecord {
  return {
    vendor_key: key,
    aliases: [key],
    doc_count: 1,
    line_item_count: grades.length,
    total_spend_usd: spend,
    grades_supplied: grades,
    unit_price_usd: grades.length > 0 ? { min: 10, p25: 20, median: 50, p75: 80, max: 100 } : null,
    first_seen_date: null,
    last_seen_date: null,
  };
}

async function writeJsonl<T>(records: T[]): Promise<string> {
  const dir = join(tmpdir(), `jmcvdb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  await fs.mkdir(dir, { recursive: true });
  const path = join(dir, "test.jsonl");
  await fs.writeFile(path, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  return path;
}

async function buildTestDb(custs: CustomerRecord[], vends: VendorRecord[]) {
  const customersPath = await writeJsonl(custs);
  const vendorsPath = await writeJsonl(vends);
  return { customersPath, vendorsPath };
}

beforeEach(() => JMCustomerVendorDatabaseEngine.resetCache());

describe("JMCustomerVendorDatabaseEngine — customer queries", () => {
  it("listCustomers returns all customer records (n=3)", async () => {
    const db = await buildTestDb([
      makeCustomer("FONTANA", FONTANA_FILES),
      makeCustomer("ALLFAST", ALLFAST_FILES),
      makeCustomer("SMALL", SMALL_CUST_FILES),
    ], []);
    const list = await JMCustomerVendorDatabaseEngine.listCustomers(db);
    expect(list).toHaveLength(3);
    expect(list.map((c) => c.customer_key).sort()).toEqual(["ALLFAST", "FONTANA", "SMALL"]);
  });

  it("getCustomer returns exact match (case-insensitive)", async () => {
    const db = await buildTestDb([makeCustomer("FONTANA", FONTANA_FILES)], []);
    const c = await JMCustomerVendorDatabaseEngine.getCustomer("fontana", db);
    expect(c).not.toBeNull();
    expect(c?.customer_key).toBe("FONTANA");
    expect(c?.files_total).toBe(FONTANA_FILES);
  });

  it("getCustomer returns null for unknown key", async () => {
    const db = await buildTestDb([makeCustomer("FONTANA", FONTANA_FILES)], []);
    const c = await JMCustomerVendorDatabaseEngine.getCustomer("UNKNOWN_CUSTOMER", db);
    expect(c).toBeNull();
  });

  it("searchCustomers fuzzy-matches partial token", async () => {
    const db = await buildTestDb([
      makeCustomer("FONTANA FASTENERS", FONTANA_FILES, { aliases: ["FONTANA", "FONTANA FASTENERS"] }),
      makeCustomer("ALLFAST FASTENING SYSTEMS", ALLFAST_FILES),
      makeCustomer("UNRELATED", SMALL_CUST_FILES),
    ], []);
    const hits = await JMCustomerVendorDatabaseEngine.searchCustomers("FAST", db);
    expect(hits).toHaveLength(2);
    expect(hits.map((c) => c.customer_key).sort()).toEqual(["ALLFAST FASTENING SYSTEMS", "FONTANA FASTENERS"]);
  });

  it("topCustomersByFiles ranks by file count, returns top-N", async () => {
    const db = await buildTestDb([
      makeCustomer("SMALL", SMALL_CUST_FILES),
      makeCustomer("FONTANA", FONTANA_FILES),
      makeCustomer("ALLFAST", ALLFAST_FILES),
    ], []);
    const top = await JMCustomerVendorDatabaseEngine.topCustomersByFiles(2, db);
    expect(top).toHaveLength(2);
    expect(top[0].customer_key).toBe("FONTANA");
    expect(top[1].customer_key).toBe("ALLFAST");
  });

  it("searchCustomers respects limit option", async () => {
    const db = await buildTestDb(
      Array.from({ length: 50 }, (_, i) => makeCustomer(`FASTCO_${i}`, 100 + i)),
      [],
    );
    const hits = await JMCustomerVendorDatabaseEngine.searchCustomers("FAST", { ...db, limit: 5 });
    expect(hits).toHaveLength(5);
  });
});

describe("JMCustomerVendorDatabaseEngine — vendor queries", () => {
  it("listVendors returns all vendor records", async () => {
    const db = await buildTestDb([], [
      makeVendor("MICHIGAN CARBIDE", MICHIGAN_SPEND, ["M25", "M20"]),
      makeVendor("CINCINNATI TOOL STEEL", CINCINNATI_SPEND, ["D2", "H13"]),
    ]);
    const list = await JMCustomerVendorDatabaseEngine.listVendors(db);
    expect(list).toHaveLength(2);
  });

  it("getVendor returns exact match for canonical key", async () => {
    const db = await buildTestDb([], [makeVendor("MICHIGAN CARBIDE", MICHIGAN_SPEND, ["M25"])]);
    const v = await JMCustomerVendorDatabaseEngine.getVendor("MICHIGAN CARBIDE", db);
    expect(v).not.toBeNull();
    expect(v?.total_spend_usd).toBe(MICHIGAN_SPEND);
    expect(v?.grades_supplied).toEqual(["M25"]);
  });

  it("vendorsForGrade returns only vendors supplying the requested grade", async () => {
    const db = await buildTestDb([], [
      makeVendor("MICHIGAN CARBIDE", MICHIGAN_SPEND, ["M25", "M20"]),
      makeVendor("CINCINNATI TOOL STEEL", CINCINNATI_SPEND, ["D2", "H13"]),
      makeVendor("PARKER STEEL", SMALL_VENDOR_SPEND, ["1018", "1045"]),
    ]);
    const m25Vendors = await JMCustomerVendorDatabaseEngine.vendorsForGrade("M25", db);
    expect(m25Vendors).toHaveLength(1);
    expect(m25Vendors[0].vendor_key).toBe("MICHIGAN CARBIDE");

    const d2Vendors = await JMCustomerVendorDatabaseEngine.vendorsForGrade("D2", db);
    expect(d2Vendors).toHaveLength(1);
    expect(d2Vendors[0].vendor_key).toBe("CINCINNATI TOOL STEEL");
  });

  it("vendorsForGrade ranks by total_spend descending", async () => {
    const db = await buildTestDb([], [
      makeVendor("SMALL_VENDOR", SMALL_VENDOR_SPEND, ["D2"]),
      makeVendor("CINCINNATI TOOL STEEL", CINCINNATI_SPEND, ["D2"]),
    ]);
    const d2Vendors = await JMCustomerVendorDatabaseEngine.vendorsForGrade("D2", db);
    expect(d2Vendors[0].vendor_key).toBe("CINCINNATI TOOL STEEL");
    expect(d2Vendors[1].vendor_key).toBe("SMALL_VENDOR");
  });

  it("vendorsForGrade returns empty array for unknown grade", async () => {
    const db = await buildTestDb([], [makeVendor("MICHIGAN CARBIDE", MICHIGAN_SPEND, ["M25"])]);
    const hits = await JMCustomerVendorDatabaseEngine.vendorsForGrade("UNOBTANIUM", db);
    expect(hits).toEqual([]);
  });
});

describe("JMCustomerVendorDatabaseEngine — summary + edge cases", () => {
  it("summary aggregates customer_count + vendor_count + total spend correctly", async () => {
    const db = await buildTestDb([
      makeCustomer("A", 100, { has_docustrata_record: true }),
      makeCustomer("B", 200, { has_docustrata_record: false }),
      makeCustomer("C", 300, { has_docustrata_record: true }),
    ], [
      makeVendor("V1", 1000, ["M25"]),
      makeVendor("V2", 2000, ["D2"]),
    ]);
    const s = await JMCustomerVendorDatabaseEngine.summary(db);
    expect(s.customer_count).toBe(3);
    expect(s.vendor_count).toBe(2);
    expect(s.total_files_across_customers).toBe(600);
    expect(s.total_vendor_spend_usd).toBe(3000);
    expect(s.customers_with_docustrata).toBe(2);
  });

  it("parseJsonl skips malformed lines without poisoning the read", async () => {
    const dir = join(tmpdir(), `jmcvdb-bad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    await fs.mkdir(dir, { recursive: true });
    const customersPath = join(dir, "customers.jsonl");
    await fs.writeFile(customersPath, [
      JSON.stringify(makeCustomer("GOOD_A", 100)),
      "this-is-not-json",
      JSON.stringify(makeCustomer("GOOD_B", 200)),
      "",  // blank line
      "{broken json",
      JSON.stringify(makeCustomer("GOOD_C", 300)),
    ].join("\n"), "utf8");
    const vendorsPath = await writeJsonl([]);
    const list = await JMCustomerVendorDatabaseEngine.listCustomers({ customersPath, vendorsPath });
    expect(list).toHaveLength(3);
    expect(list.map((c) => c.customer_key).sort()).toEqual(["GOOD_A", "GOOD_B", "GOOD_C"]);
  });
});
