/**
 * DocustrataCustomerIndexEngine — read-only customer-folder index tests.
 * Covers 6 query methods + dispatcher round-trip with concrete-value
 * assertions against the seeded fixture's real numbers (no presence-only
 * placeholders). Hits every SortKey, the `__proto__` prototype-chain guard,
 * the `limit:0` Zod-nonnegative regression, snake/camel param-alias bridges
 * for `part_number` + `sort_by` (PARAM_ALIASES has no entry for either),
 * malformed-array + malformed-null adversarial customer entries, and the
 * mtime+size cache invalidation path.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  docustrataCustomerIndexEngine,
  defaultIndexPath,
  type CustomerEntry,
  type CustomerFolderIndex,
} from "../engines/DocustrataCustomerIndexEngine.js";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

// Real numbers every assertion reads back. Four spanning customers cover the
// program / cad / prints / alpha sort axes; two adversarial entries exercise
// the isPlainObject guard at every iteration site.

const OMG_PROGRAMS = 4054;
const OMG_CAD = 312;
const OMG_PRINTS = 7070;
const HOLO_PROGRAMS = 2100;
const HOLO_CAD = 88;
const FONTANA_PROGRAMS = 1500;
const FONTANA_CAD = 410;
const ITW_PROGRAMS = 900;
const ITW_CAD = 50;
const TOTAL_REAL_CUSTOMERS = 4;

const OMG_PARTS = ["L-2845", "L-2845-D2", "OMG-9912"];
const HOLO_PARTS = ["HK-3120", "HK-7700"];
const SHARED_PN = "SHARED-001";

function customerEntry(opts: {
  programs: number;
  cad: number;
  matchedPrints: number;
  exact: number;
  partNumbers: string[];
  resolved?: boolean;
  coverage?: string;
  machineCategories?: string[];
}): CustomerEntry {
  return {
    resolved: opts.resolved ?? true,
    coverage: opts.coverage ?? "resolved",
    program_count: opts.programs,
    cad_count: opts.cad,
    matched_print_count: opts.matchedPrints,
    matched_print_exact: opts.exact,
    machine_categories: opts.machineCategories ?? ["CNC LATHE"],
    match_confidence: { exact: opts.exact, loose: opts.matchedPrints - opts.exact },
    part_number_count: opts.partNumbers.length,
    part_numbers: opts.partNumbers,
    programs: opts.partNumbers.map((pn) => ({ pn, src: "fixture" })),
    cad: [],
    matched_prints: [],
  };
}

function makeCustomers(): Record<string, unknown> {
  return {
    "OMG INC": customerEntry({
      programs: OMG_PROGRAMS, cad: OMG_CAD,
      matchedPrints: 8200, exact: OMG_PRINTS,
      partNumbers: [...OMG_PARTS, SHARED_PN],
      machineCategories: ["CNC LATHE", "CNC MILL"],
    }),
    "HOLO-KROME": customerEntry({
      programs: HOLO_PROGRAMS, cad: HOLO_CAD,
      matchedPrints: 3100, exact: 1850,
      partNumbers: HOLO_PARTS,
    }),
    "FONTANA FASTENERS": customerEntry({
      programs: FONTANA_PROGRAMS, cad: FONTANA_CAD,
      matchedPrints: 2200, exact: 1100,
      partNumbers: ["FONT-100"],
      coverage: "partial",
    }),
    "ITW": customerEntry({
      programs: ITW_PROGRAMS, cad: ITW_CAD,
      matchedPrints: 800, exact: 400,
      partNumbers: ["ITW-001", SHARED_PN],
      machineCategories: ["CNC MILL"],
    }),
    "MALFORMED-ARRAY-VALUE": ["this", "is", "an", "array"] as unknown as CustomerEntry,
    "MALFORMED-NULL-VALUE": null as unknown as CustomerEntry,
  };
}

function wrapFixture(customers: Record<string, unknown>): CustomerFolderIndex {
  return {
    schemaVersion: "2026.05.16",
    generatedAt: "2026-05-16T10:00:00Z",
    max_list: 500,
    totals: {
      customer_count: TOTAL_REAL_CUSTOMERS,
      programs: OMG_PROGRAMS + HOLO_PROGRAMS + FONTANA_PROGRAMS + ITW_PROGRAMS,
    },
    customers: customers as Record<string, CustomerEntry>,
  };
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "dci-test-"));
const fixturePath = path.join(TMP, "phase23-customer-folder-index.json");

function writeFixture(content: unknown): void {
  fs.writeFileSync(fixturePath, JSON.stringify(content), "utf-8");
}

beforeAll(() => {
  writeFixture(wrapFixture(makeCustomers()));
});

beforeEach(() => {
  docustrataCustomerIndexEngine.clearCache();
});

afterAll(() => {
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("defaultIndexPath", () => {
  it("returns the env-override value (trimmed) when PRISM_DOCUSTRATA_CUSTOMER_INDEX is set", () => {
    const prev = process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX;
    process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX = "  /custom/path/x.json   ";
    try {
      expect(defaultIndexPath()).toBe("/custom/path/x.json");
    } finally {
      if (prev === undefined) delete process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX;
      else process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX = prev;
    }
  });

  it("falls back to a Docustrata-relative path when the env var is whitespace-only", () => {
    const prev = process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX;
    process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX = "   ";
    try {
      const p = defaultIndexPath().replace(/\\/g, "/");
      expect(p.endsWith("Docustrata/.index/phase23-customer-folder-index.json")).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX;
      else process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX = prev;
    }
  });
});

describe("isAvailable", () => {
  it("reports available:true with the resolved path when the fixture exists", () => {
    const r = docustrataCustomerIndexEngine.isAvailable({ indexPath: fixturePath });
    expect(r.available).toBe(true);
    expect(r.path).toBe(fixturePath);
  });

  it("reports available:false with 'not found' error when the file is missing", () => {
    const missing = path.join(TMP, "does-not-exist.json");
    const r = docustrataCustomerIndexEngine.isAvailable({ indexPath: missing });
    expect(r.available).toBe(false);
    expect(r.path).toBe(missing);
    expect(String(r.error)).toMatch(/index file not found/i);
    expect(String(r.error)).toMatch(/customer-rollup/i);
  });

  it("reports available:false with 'malformed' error when customers is missing", () => {
    const bad = path.join(TMP, "no-customers.json");
    fs.writeFileSync(bad, JSON.stringify({ schemaVersion: "x" }), "utf-8");
    const r = docustrataCustomerIndexEngine.isAvailable({ indexPath: bad });
    expect(r.available).toBe(false);
    expect(String(r.error)).toMatch(/malformed/i);
    expect(String(r.error)).toMatch(/customers/i);
  });

  it("reports available:false with a parse error when the file is not JSON", () => {
    const garbage = path.join(TMP, "garbage.json");
    fs.writeFileSync(garbage, "this is not { json", "utf-8");
    const r = docustrataCustomerIndexEngine.isAvailable({ indexPath: garbage });
    expect(r.available).toBe(false);
    expect(String(r.error)).toMatch(/failed to read or parse/i);
  });

  it("rejects an array-rooted JSON as malformed (typeof object catches arrays)", () => {
    const arr = path.join(TMP, "array-root.json");
    fs.writeFileSync(arr, JSON.stringify([{ customers: {} }]), "utf-8");
    const r = docustrataCustomerIndexEngine.isAvailable({ indexPath: arr });
    expect(r.available).toBe(false);
    expect(String(r.error)).toMatch(/malformed/i);
  });
});

describe("getTotals", () => {
  it("returns provenance + customerCount including the malformed entries", () => {
    const r = docustrataCustomerIndexEngine.getTotals({ indexPath: fixturePath });
    expect(r.available).toBe(true);
    expect(r.schemaVersion).toBe("2026.05.16");
    expect(r.generatedAt).toBe("2026-05-16T10:00:00Z");
    expect(r.customerCount).toBe(TOTAL_REAL_CUSTOMERS + 2);
    expect((r.totals ?? {})["customer_count"]).toBe(TOTAL_REAL_CUSTOMERS);
    expect((r.totals ?? {})["programs"]).toBe(
      OMG_PROGRAMS + HOLO_PROGRAMS + FONTANA_PROGRAMS + ITW_PROGRAMS,
    );
  });

  it("surfaces the load error structurally when the file is missing", () => {
    const r = docustrataCustomerIndexEngine.getTotals({
      indexPath: path.join(TMP, "missing-totals.json"),
    });
    expect(r.available).toBe(false);
    expect(String(r.error)).toMatch(/not found/i);
  });
});

describe("listCustomers", () => {
  it("default sort is by program_count DESC with malformed entries filtered out", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({ indexPath: fixturePath });
    expect(r.available).toBe(true);
    expect(r.sortBy).toBe("programs");
    expect(r.total).toBe(TOTAL_REAL_CUSTOMERS);
    expect(r.count).toBe(TOTAL_REAL_CUSTOMERS);
    expect(r.customers).toHaveLength(TOTAL_REAL_CUSTOMERS);
    expect(r.customers![0].name).toBe("OMG INC");
    expect(r.customers![0].program_count).toBe(OMG_PROGRAMS);
    expect(r.customers![1].name).toBe("HOLO-KROME");
    expect(r.customers![1].program_count).toBe(HOLO_PROGRAMS);
    expect(r.customers![2].name).toBe("FONTANA FASTENERS");
    expect(r.customers![3].name).toBe("ITW");
  });

  it("sortBy:cad reorders by cad_count DESC — FONTANA wins (410 vs OMG 312)", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: fixturePath, sortBy: "cad",
    });
    expect(r.sortBy).toBe("cad");
    expect(r.customers![0].name).toBe("FONTANA FASTENERS");
    expect(r.customers![0].cad_count).toBe(FONTANA_CAD);
    expect(r.customers![1].name).toBe("OMG INC");
    expect(r.customers![1].cad_count).toBe(OMG_CAD);
  });

  it("sortBy:prints orders by matched_print_count DESC", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: fixturePath, sortBy: "prints",
    });
    expect(r.sortBy).toBe("prints");
    expect(r.customers![0].name).toBe("OMG INC");
    expect(r.customers![0].matched_print_count).toBe(8200);
    expect(r.customers![1].matched_print_count).toBe(3100);
  });

  it("sortBy:name orders alphabetically ASC (locale-compare)", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: fixturePath, sortBy: "name",
    });
    expect(r.sortBy).toBe("name");
    const names = (r.customers ?? []).map((c) => c.name);
    expect(names).toEqual(["FONTANA FASTENERS", "HOLO-KROME", "ITW", "OMG INC"]);
  });

  it("ADVERSARIAL: sortBy:__proto__ falls back to 'programs' (hasOwnProperty guard)", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: fixturePath,
      sortBy: "__proto__" as never,
    });
    expect(r.available).toBe(true);
    expect(r.sortBy).toBe("programs");
    expect(r.customers![0].name).toBe("OMG INC");
    expect(r.customers![0].program_count).toBe(OMG_PROGRAMS);
  });

  it("ADVERSARIAL: sortBy:'foo' falls back to 'programs' (closed-enum guard)", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: fixturePath,
      sortBy: "foo" as never,
    });
    expect(r.sortBy).toBe("programs");
    expect(r.customers![0].name).toBe("OMG INC");
  });

  it("limit:2 returns the top 2 sorted rows; total stays at 4", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: fixturePath, limit: 2,
    });
    expect(r.total).toBe(TOTAL_REAL_CUSTOMERS);
    expect(r.count).toBe(2);
    expect(r.customers).toHaveLength(2);
    expect(r.customers![0].name).toBe("OMG INC");
    expect(r.customers![1].name).toBe("HOLO-KROME");
  });

  it("REGRESSION: limit:0 yields an empty list (Math.max(0, floor) clamp)", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: fixturePath, limit: 0,
    });
    expect(r.total).toBe(TOTAL_REAL_CUSTOMERS);
    expect(r.count).toBe(0);
    expect(r.customers).toEqual([]);
  });

  it("REGRESSION: limit:-5 yields an empty list (negative clamps to 0)", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: fixturePath, limit: -5,
    });
    expect(r.count).toBe(0);
    expect(r.customers).toEqual([]);
  });

  it("limit:NaN is treated as 'no limit' (non-finite skips cleanLimit)", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: fixturePath, limit: Number.NaN,
    });
    expect(r.count).toBe(TOTAL_REAL_CUSTOMERS);
    expect(r.customers).toHaveLength(TOTAL_REAL_CUSTOMERS);
  });

  it("limit:2.7 floors to 2 (fractional clamps via Math.floor)", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: fixturePath, limit: 2.7,
    });
    expect(r.count).toBe(2);
    expect(r.customers![0].name).toBe("OMG INC");
    expect(r.customers![1].name).toBe("HOLO-KROME");
  });

  it("returns available:false when the file is missing (no customers payload)", () => {
    const r = docustrataCustomerIndexEngine.listCustomers({
      indexPath: path.join(TMP, "missing-list.json"),
    });
    expect(r.available).toBe(false);
    expect(String(r.error)).toMatch(/not found/i);
  });
});

describe("getCustomer", () => {
  it("returns the full record with name + all heavy arrays preserved", () => {
    const r = docustrataCustomerIndexEngine.getCustomer("OMG INC", { indexPath: fixturePath });
    expect(r.available).toBe(true);
    expect(r.found).toBe(true);
    expect(r.customer!.name).toBe("OMG INC");
    expect(r.customer!.program_count).toBe(OMG_PROGRAMS);
    expect(r.customer!.matched_print_exact).toBe(OMG_PRINTS);
    expect(r.customer!.part_numbers).toEqual([...OMG_PARTS, SHARED_PN]);
    expect(r.customer!.programs).toHaveLength(4);
    expect(r.customer!.machine_categories).toEqual(["CNC LATHE", "CNC MILL"]);
  });

  it("case-insensitive + whitespace-trimmed match preserves canonical casing", () => {
    const r = docustrataCustomerIndexEngine.getCustomer("  omg inc  ", {
      indexPath: fixturePath,
    });
    expect(r.found).toBe(true);
    expect(r.customer!.name).toBe("OMG INC");
    expect(r.customer!.program_count).toBe(OMG_PROGRAMS);
  });

  it("hyphenated customer name resolves exactly", () => {
    const r = docustrataCustomerIndexEngine.getCustomer("HOLO-KROME", {
      indexPath: fixturePath,
    });
    expect(r.found).toBe(true);
    expect(r.customer!.program_count).toBe(HOLO_PROGRAMS);
    expect(r.customer!.part_numbers).toEqual(HOLO_PARTS);
  });

  it("returns found:false / available:true for an unknown customer", () => {
    const r = docustrataCustomerIndexEngine.getCustomer("NOPE-NOT-A-CUSTOMER", {
      indexPath: fixturePath,
    });
    expect(r.available).toBe(true);
    expect(r.found).toBe(false);
  });

  it("rejects empty/whitespace name with a 'non-empty' error", () => {
    const r1 = docustrataCustomerIndexEngine.getCustomer("", { indexPath: fixturePath });
    expect(r1.available).toBe(false);
    expect(r1.found).toBe(false);
    expect(String(r1.error)).toMatch(/non-empty/i);

    const r2 = docustrataCustomerIndexEngine.getCustomer("   ", { indexPath: fixturePath });
    expect(r2.available).toBe(false);
    expect(String(r2.error)).toMatch(/non-empty/i);
  });

  it("rejects non-string name (number) with a 'non-empty' error", () => {
    const r = docustrataCustomerIndexEngine.getCustomer(42 as unknown as string, {
      indexPath: fixturePath,
    });
    expect(r.available).toBe(false);
    expect(r.found).toBe(false);
    expect(String(r.error)).toMatch(/non-empty/i);
  });

  it("ADVERSARIAL: malformed-array customer returns found:false + malformed-entry error", () => {
    const r = docustrataCustomerIndexEngine.getCustomer("MALFORMED-ARRAY-VALUE", {
      indexPath: fixturePath,
    });
    expect(r.available).toBe(true);
    expect(r.found).toBe(false);
    expect(String(r.error)).toMatch(/malformed/i);
    expect(String(r.error)).toMatch(/not an object/i);
  });

  it("ADVERSARIAL: malformed-null customer returns found:false + malformed-entry error", () => {
    const r = docustrataCustomerIndexEngine.getCustomer("MALFORMED-NULL-VALUE", {
      indexPath: fixturePath,
    });
    expect(r.available).toBe(true);
    expect(r.found).toBe(false);
    expect(String(r.error)).toMatch(/malformed/i);
  });
});

describe("searchCustomers", () => {
  it("substring-match (case-insensitive) returns sorted hits by programs DESC", () => {
    const r = docustrataCustomerIndexEngine.searchCustomers("o", {
      indexPath: fixturePath,
    });
    expect(r.available).toBe(true);
    expect(r.query).toBe("o");
    const names = (r.matches ?? []).map((m) => m.name);
    expect(names).toContain("OMG INC");
    expect(names).toContain("HOLO-KROME");
    expect(names).toContain("FONTANA FASTENERS");
    expect(names).not.toContain("ITW");
    expect(r.matches![0].name).toBe("OMG INC");
    expect(r.matches![0].program_count).toBe(OMG_PROGRAMS);
  });

  it("trims whitespace + lowercases for matching but echoes trimmed query verbatim", () => {
    const r = docustrataCustomerIndexEngine.searchCustomers("   HOLO   ", {
      indexPath: fixturePath,
    });
    expect(r.query).toBe("HOLO");
    expect(r.matches).toHaveLength(1);
    expect(r.matches![0].name).toBe("HOLO-KROME");
    expect(r.matches![0].program_count).toBe(HOLO_PROGRAMS);
  });

  it("returns count:0 + empty matches for a query that hits nothing real", () => {
    const r = docustrataCustomerIndexEngine.searchCustomers("ZZZ-NEVER", {
      indexPath: fixturePath,
    });
    expect(r.available).toBe(true);
    expect(r.count).toBe(0);
    expect(r.matches).toEqual([]);
  });

  it("filters malformed entries from substring hits — 'malformed' yields zero", () => {
    const r = docustrataCustomerIndexEngine.searchCustomers("malformed", {
      indexPath: fixturePath,
    });
    expect(r.available).toBe(true);
    expect(r.count).toBe(0);
    expect(r.matches).toEqual([]);
  });

  it("rejects empty/whitespace query with a 'non-empty' error", () => {
    const r1 = docustrataCustomerIndexEngine.searchCustomers("", {
      indexPath: fixturePath,
    });
    expect(r1.available).toBe(false);
    expect(r1.query).toBe("");
    expect(String(r1.error)).toMatch(/non-empty/i);

    const r2 = docustrataCustomerIndexEngine.searchCustomers("   ", {
      indexPath: fixturePath,
    });
    expect(r2.available).toBe(false);
    expect(String(r2.error)).toMatch(/non-empty/i);
  });

  it("respects limit on the sorted result set", () => {
    const r = docustrataCustomerIndexEngine.searchCustomers("o", {
      indexPath: fixturePath, limit: 1,
    });
    expect(r.count).toBe(1);
    expect(r.matches![0].name).toBe("OMG INC");
  });
});

describe("findByPartNumber", () => {
  it("returns the single owner for a unique part number", () => {
    const r = docustrataCustomerIndexEngine.findByPartNumber("L-2845-D2", {
      indexPath: fixturePath,
    });
    expect(r.available).toBe(true);
    expect(r.partNumber).toBe("L-2845-D2");
    expect(r.count).toBe(1);
    expect(r.customers).toEqual(["OMG INC"]);
  });

  it("returns BOTH customers (alpha-sorted) for a shared part number", () => {
    const r = docustrataCustomerIndexEngine.findByPartNumber(SHARED_PN, {
      indexPath: fixturePath,
    });
    expect(r.count).toBe(2);
    expect(r.customers).toEqual(["ITW", "OMG INC"]);
  });

  it("case-insensitive + whitespace-trimmed exact match (no substring)", () => {
    const r = docustrataCustomerIndexEngine.findByPartNumber("  hk-3120  ", {
      indexPath: fixturePath,
    });
    expect(r.partNumber).toBe("hk-3120");
    expect(r.count).toBe(1);
    expect(r.customers).toEqual(["HOLO-KROME"]);
  });

  it("substring is NOT enough — partial PN 'HK' returns no hits", () => {
    const r = docustrataCustomerIndexEngine.findByPartNumber("HK", {
      indexPath: fixturePath,
    });
    expect(r.count).toBe(0);
    expect(r.customers).toEqual([]);
  });

  it("returns count:0 / empty customers for an unknown PN", () => {
    const r = docustrataCustomerIndexEngine.findByPartNumber("NEVER-EXISTED-9999", {
      indexPath: fixturePath,
    });
    expect(r.available).toBe(true);
    expect(r.count).toBe(0);
    expect(r.customers).toEqual([]);
  });

  it("rejects empty/whitespace part number with a 'non-empty' error", () => {
    const r = docustrataCustomerIndexEngine.findByPartNumber("   ", {
      indexPath: fixturePath,
    });
    expect(r.available).toBe(false);
    expect(r.partNumber).toBe("");
    expect(String(r.error)).toMatch(/non-empty/i);
  });

  it("rejects non-string PN (number) with a 'non-empty' error", () => {
    const r = docustrataCustomerIndexEngine.findByPartNumber(
      9912 as unknown as string,
      { indexPath: fixturePath },
    );
    expect(r.available).toBe(false);
    expect(String(r.error)).toMatch(/non-empty/i);
  });
});

describe("cache (mtime + size invalidation)", () => {
  it("invalidates the cache when the fixture is rewritten with a different size", () => {
    const r1 = docustrataCustomerIndexEngine.listCustomers({ indexPath: fixturePath });
    expect(r1.total).toBe(TOTAL_REAL_CUSTOMERS);
    expect(r1.customers![0].name).toBe("OMG INC");

    fs.writeFileSync(
      fixturePath,
      JSON.stringify({
        schemaVersion: "2026.05.16",
        customers: {
          "ONLY-ONE": customerEntry({
            programs: 5, cad: 1, matchedPrints: 0, exact: 0,
            partNumbers: ["X-1"],
          }),
        },
      }),
      "utf-8",
    );

    const r2 = docustrataCustomerIndexEngine.listCustomers({ indexPath: fixturePath });
    expect(r2.total).toBe(1);
    expect(r2.customers![0].name).toBe("ONLY-ONE");
    expect(r2.customers![0].program_count).toBe(5);

    writeFixture(wrapFixture(makeCustomers()));
  });

  it("clearCache() forces a fresh read on the next call", () => {
    const r1 = docustrataCustomerIndexEngine.listCustomers({ indexPath: fixturePath });
    expect(r1.total).toBe(TOTAL_REAL_CUSTOMERS);
    expect(r1.customers![0].name).toBe("OMG INC");

    docustrataCustomerIndexEngine.clearCache();
    const r2 = docustrataCustomerIndexEngine.listCustomers({ indexPath: fixturePath });
    expect(r2.total).toBe(TOTAL_REAL_CUSTOMERS);
    expect(r2.customers![0].name).toBe("OMG INC");
    expect(r2.customers![0].program_count).toBe(OMG_PROGRAMS);
  });
});

// Dispatcher round-trip captures the handler from a mock server, then drives
// every mode incl. the snake_case `part_number` + `sort_by` regression bridges
// (PARAM_ALIASES has no entry for those — the case body MUST read both forms).

type DispatcherHandler = (args: {
  action: string;
  params?: Record<string, unknown>;
}) => Promise<unknown>;

function captureCadHandler(): DispatcherHandler {
  let captured: DispatcherHandler | null = null;
  const mockServer = {
    tool(_name: string, _desc: string, _schema: unknown, fn: DispatcherHandler): void {
      captured = fn;
    },
  };
  // void: registerCadDispatcher is sync void-returning; the void prefix
  // documents intent and silences any floating-promise heuristic.
  void registerCadDispatcher(mockServer as unknown as Parameters<typeof registerCadDispatcher>[0]);
  if (!captured) {
    throw new Error("registerCadDispatcher did not synchronously register a tool");
  }
  return captured;
}

async function callCad(
  handler: DispatcherHandler,
  action: string,
  params: Record<string, unknown>,
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const raw = await handler({ action, params });
  const text =
    (raw as { content?: Array<{ text?: string }> } | null)?.content?.[0]?.text
    ?? JSON.stringify(raw);
  try {
    return JSON.parse(text) as {
      success: boolean;
      data?: Record<string, unknown>;
      error?: string;
    };
  } catch {
    return { success: false, error: `unparseable response: ${text}` };
  }
}

describe("prism_cad / docustrata_customer_index dispatcher round-trip", () => {
  let handler: DispatcherHandler;

  beforeAll(() => {
    process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX = fixturePath;
    writeFixture(wrapFixture(makeCustomers()));
    handler = captureCadHandler();
  });

  afterAll(() => {
    delete process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX;
  });

  it("mode:available reports available:true with the env-resolved path", async () => {
    const r = await callCad(handler, "docustrata_customer_index", { mode: "available" });
    expect(r.success).toBe(true);
    expect(r.data!.available).toBe(true);
    expect(r.data!.path).toBe(fixturePath);
    // ENVELOPE-SHAPE PIN: engine fields live DIRECTLY on `data` — a refactor
    // that wraps the result (data:{result:{available:...}}) would surface a
    // 'result' or 'data' key here. Pinning the key set catches that silently.
    const dataKeys = Object.keys(r.data as Record<string, unknown>).sort();
    expect(dataKeys).toContain("available");
    expect(dataKeys).toContain("path");
    expect(dataKeys.includes("result")).toBe(false);
    expect(dataKeys.includes("data")).toBe(false);
  });

  it("ADVERSARIAL: sortBy:__proto__ is rejected by the Zod enum at the dispatcher boundary", async () => {
    // Pins Zod as the gate — the engine's hasOwnProperty guard is defense-in-
    // depth; Zod .enum(...) rejects __proto__ before the engine sees it. If
    // Zod ever weakens to .string() this test fails loudly.
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "list",
      sortBy: "__proto__",
    });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/invalid|enum|sortBy/i);
  });

  it("REGRESSION: mode:search with a zero-match query — count:0 + slim-stripped matches", async () => {
    // slimResponse strips empty arrays from MCP envelopes. A production
    // consumer reading parsed.data.matches.length on a zero-result search
    // would crash unless they handle the absent-or-empty case. Pin both.
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "search",
      query: "ZZZ-NEVER-MATCHES",
    });
    expect(r.success).toBe(true);
    expect(r.data!.available).toBe(true);
    expect(r.data!.count).toBe(0);
    const matches = (r.data!.matches ?? []) as unknown[];
    expect(matches).toEqual([]);
    expect(matches).toHaveLength(0);
  });

  it("REGRESSION: mode:find_pn with an unknown PN — count:0 + slim-stripped customers", async () => {
    // Same slimResponse-stripping contract as the search-empty case above.
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "find_pn",
      partNumber: "NEVER-EXISTED-12345",
    });
    expect(r.success).toBe(true);
    expect(r.data!.available).toBe(true);
    expect(r.data!.partNumber).toBe("NEVER-EXISTED-12345");
    expect(r.data!.count).toBe(0);
    const customers = (r.data!.customers ?? []) as unknown[];
    expect(customers).toEqual([]);
    expect(customers).toHaveLength(0);
  });

  it("mode:totals returns customerCount + schemaVersion", async () => {
    const r = await callCad(handler, "docustrata_customer_index", { mode: "totals" });
    expect(r.success).toBe(true);
    expect(r.data!.available).toBe(true);
    expect(r.data!.customerCount).toBe(TOTAL_REAL_CUSTOMERS + 2);
    expect(r.data!.schemaVersion).toBe("2026.05.16");
  });

  it("mode:list returns sorted customers (default sortBy=programs)", async () => {
    const r = await callCad(handler, "docustrata_customer_index", { mode: "list" });
    expect(r.success).toBe(true);
    expect(r.data!.sortBy).toBe("programs");
    expect(r.data!.total).toBe(TOTAL_REAL_CUSTOMERS);
    const rows = r.data!.customers as Array<{ name: string; program_count: number }>;
    expect(rows[0].name).toBe("OMG INC");
    expect(rows[0].program_count).toBe(OMG_PROGRAMS);
    expect(rows[1].name).toBe("HOLO-KROME");
  });

  it("REGRESSION: mode:list with snake_case sort_by reaches the engine (no PARAM_ALIAS)", async () => {
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "list",
      sort_by: "cad",
    });
    expect(r.success).toBe(true);
    expect(r.data!.sortBy).toBe("cad");
    const rows = r.data!.customers as Array<{ name: string; cad_count: number }>;
    expect(rows[0].name).toBe("FONTANA FASTENERS");
    expect(rows[0].cad_count).toBe(FONTANA_CAD);
  });

  it("mode:list camelCase sortBy works (forward-compat with future PARAM_ALIAS)", async () => {
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "list",
      sortBy: "name",
    });
    expect(r.success).toBe(true);
    expect(r.data!.sortBy).toBe("name");
    const rows = r.data!.customers as Array<{ name: string }>;
    expect(rows.map((x) => x.name)).toEqual([
      "FONTANA FASTENERS", "HOLO-KROME", "ITW", "OMG INC",
    ]);
  });

  it("REGRESSION: mode:list limit:0 returns an empty list (Zod nonnegative)", async () => {
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "list",
      limit: 0,
    });
    // Engine returns customers:[] for limit:0 (verified by direct unit test).
    // slimResponse (responseSlimmer.ts) strips empty arrays from MCP envelopes
    // for transport efficiency, so the field arrives either ABSENT or [] — both
    // express the "zero rows" contract. count:0 + total:4 is the load-bearing
    // signal; we accept both shapes.
    expect(r.success).toBe(true);
    expect(r.data!.total).toBe(TOTAL_REAL_CUSTOMERS);
    expect(r.data!.count).toBe(0);
    const customers = (r.data!.customers ?? []) as unknown[];
    expect(customers).toEqual([]);
    expect(customers).toHaveLength(0);
  });

  it("mode:get returns the full record by name (case-insensitive)", async () => {
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "get",
      customer: "  omg inc  ",
    });
    expect(r.success).toBe(true);
    expect(r.data!.available).toBe(true);
    expect(r.data!.found).toBe(true);
    const customer = r.data!.customer as { name: string; program_count: number };
    expect(customer.name).toBe("OMG INC");
    expect(customer.program_count).toBe(OMG_PROGRAMS);
  });

  it("mode:get with a missing customer returns found:false (not a dispatcher error)", async () => {
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "get",
      customer: "NEVER-EXISTED",
    });
    expect(r.success).toBe(true);
    expect(r.data!.available).toBe(true);
    expect(r.data!.found).toBe(false);
  });

  it("mode:search returns substring-matching customers", async () => {
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "search",
      query: "HOLO",
    });
    expect(r.success).toBe(true);
    expect(r.data!.count).toBe(1);
    const matches = r.data!.matches as Array<{ name: string; program_count: number }>;
    expect(matches[0].name).toBe("HOLO-KROME");
    expect(matches[0].program_count).toBe(HOLO_PROGRAMS);
  });

  it("REGRESSION: mode:find_pn with snake_case part_number reaches the engine", async () => {
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "find_pn",
      part_number: SHARED_PN,
    });
    expect(r.success).toBe(true);
    expect(r.data!.partNumber).toBe(SHARED_PN);
    expect(r.data!.count).toBe(2);
    expect(r.data!.customers).toEqual(["ITW", "OMG INC"]);
  });

  it("mode:find_pn camelCase partNumber also works", async () => {
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "find_pn",
      partNumber: "L-2845-D2",
    });
    expect(r.success).toBe(true);
    expect(r.data!.count).toBe(1);
    expect(r.data!.customers).toEqual(["OMG INC"]);
  });

  it("Zod rejects an invalid mode value (closed enum)", async () => {
    const r = await callCad(handler, "docustrata_customer_index", { mode: "delete" });
    expect(r.success).not.toBe(true);
    expect(String(r.error)).toMatch(/invalid|enum|mode/i);
  });

  it("Zod rejects mode:list with negative limit (nonnegative gate)", async () => {
    const r = await callCad(handler, "docustrata_customer_index", {
      mode: "list",
      limit: -1,
    });
    expect(r.success).not.toBe(true);
    expect(String(r.error)).toMatch(/invalid|nonnegative|limit/i);
  });

  it("env-absent path: mode:available reports available:false (graceful, no throw)", async () => {
    process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX = path.join(TMP, "no-such-file.json");
    docustrataCustomerIndexEngine.clearCache();
    const freshHandler = captureCadHandler();
    const r = await callCad(freshHandler, "docustrata_customer_index", { mode: "available" });
    expect(r.success).toBe(true);
    expect(r.data!.available).toBe(false);
    expect(String(r.data!.error)).toMatch(/not found/i);
    process.env.PRISM_DOCUSTRATA_CUSTOMER_INDEX = fixturePath;
    docustrataCustomerIndexEngine.clearCache();
  });
});
