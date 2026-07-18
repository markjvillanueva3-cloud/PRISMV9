/**
 * JMCustomerVendorDatabaseEngine — query layer on top of iter56's JSONL
 * customer + vendor databases.
 *
 * QUOTING-SYNERGY-MS0/U-QP-CUSTOMER-VENDOR-DB-QUERY (slot:charlie iter57 2026-05-27).
 *
 * Reads:
 *   state/shared/databases/jm-customers.jsonl   (473 records, 152KB)
 *   state/shared/databases/jm-vendors.jsonl     (12 records, 3.4KB)
 *
 * Exposes:
 *   - listCustomers(opts?)        → all customers, optionally filtered
 *   - getCustomer(key)            → single customer record by canonical key
 *   - searchCustomers(query)      → fuzzy name/alias match
 *   - topCustomersByFiles(n)      → ranked by file count
 *   - listVendors(opts?)          → all vendors
 *   - getVendor(key)              → single vendor record
 *   - vendorsForGrade(grade)      → vendors that supply a given material grade
 *   - summary()                   → counts + totals
 *
 * Cache strategy: parse JSONL once, hold the Maps in memory; resetCache()
 * exposed for tests and explicit invalidation after a re-ingest.
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";

export const DEFAULT_CUSTOMERS_PATH = resolve(process.cwd(), "state/shared/databases/jm-customers.jsonl");
export const DEFAULT_VENDORS_PATH = resolve(process.cwd(), "state/shared/databases/jm-vendors.jsonl");

export interface CustomerRecord {
  customer_key: string;
  aliases: string[];
  files_total: number;
  files_by_bucket: {
    program: number;
    cad: number;
    print: number;
    scan: number;
    setup: number;
    doc: number;
    other: number;
  };
  materials_seen: string[];
  machine_classes_seen: string[];
  first_seen_date: string | null;
  last_seen_date: string | null;
  has_docustrata_record: boolean;
  source_folders: string[];
}

export interface VendorRecord {
  vendor_key: string;
  aliases: string[];
  doc_count: number;
  line_item_count: number;
  total_spend_usd: number;
  grades_supplied: string[];
  unit_price_usd: {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
  } | null;
  first_seen_date: string | null;
  last_seen_date: string | null;
}

export interface DatabaseSummary {
  customer_count: number;
  vendor_count: number;
  total_files_across_customers: number;
  total_vendor_spend_usd: number;
  customers_with_docustrata: number;
}

interface DatabaseCache {
  customers: Map<string, CustomerRecord>;
  vendors: Map<string, VendorRecord>;
  customersPath: string;
  vendorsPath: string;
}

function parseJsonlSafe<T>(content: string): T[] {
  const lines = content.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const out: T[] = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      /* skip malformed line — R12 fail-soft so one bad row doesn't poison the read */
    }
  }
  return out;
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toUpperCase();
  const t = text.toUpperCase();
  if (t.includes(q)) return true;
  // Token-prefix match
  const qTokens = q.split(/\s+/).filter((x) => x.length > 0);
  return qTokens.every((tok) => t.includes(tok));
}

export class JMCustomerVendorDatabaseEngine {
  private static cache: DatabaseCache | null = null;

  static async load(customersPath = DEFAULT_CUSTOMERS_PATH, vendorsPath = DEFAULT_VENDORS_PATH): Promise<DatabaseCache> {
    if (this.cache && this.cache.customersPath === customersPath && this.cache.vendorsPath === vendorsPath) {
      return this.cache;
    }
    const [cRaw, vRaw] = await Promise.all([
      fs.readFile(customersPath, "utf8"),
      fs.readFile(vendorsPath, "utf8"),
    ]);
    const customerList = parseJsonlSafe<CustomerRecord>(cRaw);
    const vendorList = parseJsonlSafe<VendorRecord>(vRaw);
    const customers = new Map<string, CustomerRecord>();
    for (const c of customerList) customers.set(c.customer_key, c);
    const vendors = new Map<string, VendorRecord>();
    for (const v of vendorList) vendors.set(v.vendor_key, v);
    this.cache = { customers, vendors, customersPath, vendorsPath };
    return this.cache;
  }

  static resetCache(): void {
    this.cache = null;
  }

  /** All customer records. */
  static async listCustomers(opts?: { customersPath?: string; vendorsPath?: string }): Promise<CustomerRecord[]> {
    const cache = await this.load(opts?.customersPath, opts?.vendorsPath);
    return [...cache.customers.values()];
  }

  static async getCustomer(key: string, opts?: { customersPath?: string; vendorsPath?: string }): Promise<CustomerRecord | null> {
    const cache = await this.load(opts?.customersPath, opts?.vendorsPath);
    return cache.customers.get(key.toUpperCase().trim()) ?? null;
  }

  /** Fuzzy name/alias match — returns ranked candidates. */
  static async searchCustomers(query: string, opts?: { customersPath?: string; vendorsPath?: string; limit?: number }): Promise<CustomerRecord[]> {
    const cache = await this.load(opts?.customersPath, opts?.vendorsPath);
    const limit = opts?.limit ?? 20;
    const hits: CustomerRecord[] = [];
    for (const c of cache.customers.values()) {
      if (fuzzyMatch(query, c.customer_key)) {
        hits.push(c);
        continue;
      }
      if (c.aliases.some((a) => fuzzyMatch(query, a))) {
        hits.push(c);
      }
    }
    return hits
      .sort((a, b) => b.files_total - a.files_total)
      .slice(0, limit);
  }

  /** Top-N customers by file count. */
  static async topCustomersByFiles(n: number, opts?: { customersPath?: string; vendorsPath?: string }): Promise<CustomerRecord[]> {
    const all = await this.listCustomers(opts);
    return all.sort((a, b) => b.files_total - a.files_total).slice(0, n);
  }

  static async listVendors(opts?: { customersPath?: string; vendorsPath?: string }): Promise<VendorRecord[]> {
    const cache = await this.load(opts?.customersPath, opts?.vendorsPath);
    return [...cache.vendors.values()];
  }

  static async getVendor(key: string, opts?: { customersPath?: string; vendorsPath?: string }): Promise<VendorRecord | null> {
    const cache = await this.load(opts?.customersPath, opts?.vendorsPath);
    return cache.vendors.get(key.toUpperCase().trim()) ?? null;
  }

  /** Vendors that supply a given material grade. */
  static async vendorsForGrade(grade: string, opts?: { customersPath?: string; vendorsPath?: string }): Promise<VendorRecord[]> {
    const cache = await this.load(opts?.customersPath, opts?.vendorsPath);
    const g = grade.toUpperCase().trim();
    const hits: VendorRecord[] = [];
    for (const v of cache.vendors.values()) {
      if (v.grades_supplied.includes(g)) hits.push(v);
    }
    return hits.sort((a, b) => b.total_spend_usd - a.total_spend_usd);
  }

  static async summary(opts?: { customersPath?: string; vendorsPath?: string }): Promise<DatabaseSummary> {
    const cache = await this.load(opts?.customersPath, opts?.vendorsPath);
    let totalFiles = 0;
    let docustrataCount = 0;
    for (const c of cache.customers.values()) {
      totalFiles += c.files_total;
      if (c.has_docustrata_record) docustrataCount += 1;
    }
    let totalSpend = 0;
    for (const v of cache.vendors.values()) totalSpend += v.total_spend_usd;
    return {
      customer_count: cache.customers.size,
      vendor_count: cache.vendors.size,
      total_files_across_customers: totalFiles,
      total_vendor_spend_usd: Math.round(totalSpend * 100) / 100,
      customers_with_docustrata: docustrataCount,
    };
  }
}

export const jmCustomerVendorDatabaseEngine = JMCustomerVendorDatabaseEngine;
export default jmCustomerVendorDatabaseEngine;
