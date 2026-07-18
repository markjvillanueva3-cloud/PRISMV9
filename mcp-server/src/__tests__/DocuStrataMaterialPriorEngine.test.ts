/**
 * DocuStrataMaterialPriorEngine.test.ts —
 * QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-MATERIAL-PRIOR (slot:charlie iter53 2026-05-26).
 *
 * Pure-function tests for normalizeGrade + extractLineItems + aggregateGradePriors.
 * Engine class is tested through a tmpdir-rooted synthetic manifest so disk
 * I/O is observable + cleanable.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DocuStrataMaterialPriorEngine,
  normalizeGrade,
  extractLineItems,
  aggregateGradePriors,
  type MaterialLineItem,
} from "../engines/DocuStrataMaterialPriorEngine.js";

const M25_UNIT_PRICE_LOW = 12;
const M25_UNIT_PRICE_HIGH = 90.37;
const A2_UNIT_PRICE = 81.75;
const MIN_EVIDENCE = DocuStrataMaterialPriorEngine.MIN_EVIDENCE_ROWS_PER_GRADE;
const BLANKS_LOW = DocuStrataMaterialPriorEngine.PER_JOB_BLANKS.LOW;
const BLANKS_MEDIAN = DocuStrataMaterialPriorEngine.PER_JOB_BLANKS.MEDIAN;
const BLANKS_HIGH = DocuStrataMaterialPriorEngine.PER_JOB_BLANKS.HIGH;

function makeManifest(lineItems: Array<Record<string, unknown>>, docType: "invoice" | "quote" = "invoice"): unknown {
  return {
    documents: [
      {
        id: "doc-1",
        document_type: docType,
        extracted_data: {
          date: "2026-02-16",
          vendor: { name: "Michigan Carbide Technologies" },
          line_items: lineItems,
        },
      },
    ],
  };
}

beforeEach(() => DocuStrataMaterialPriorEngine.resetCache());

describe("normalizeGrade", () => {
  it("recognizes M25 carbide grade from explicit parsed field", () => {
    expect(normalizeGrade("blah", "M25")).toBe("M25");
  });

  it("recognizes M25 carbide grade from description token", () => {
    expect(normalizeGrade(".500 X .063 X .750 - M25 C/G")).toBe("M25");
  });

  it("recognizes D2 tool steel grade", () => {
    expect(normalizeGrade("1.250 D2 ROUND BAR 12FT")).toBe("D2");
  });

  it("recognizes A2 tool steel grade", () => {
    expect(normalizeGrade("A2 plate 4x4x0.5")).toBe("A2");
  });

  it("recognizes H13 hot-work tool steel grade", () => {
    expect(normalizeGrade("H13 forging insert")).toBe("H13");
  });

  it("recognizes 4140 carbon steel grade", () => {
    expect(normalizeGrade("4140 PH plate")).toBe("4140");
  });

  it("recognizes M-3 HSS with hyphen", () => {
    expect(normalizeGrade("M-3 HSS Round Bar .515 DF")).toBe("M3");
  });

  it("returns null when no recognized grade is present", () => {
    expect(normalizeGrade("generic part description without grade callout")).toBeNull();
  });

  it("trusts parsed_grade field over description if both are valid", () => {
    expect(normalizeGrade("M20 in description", "M25")).toBe("M25");
  });
});

describe("extractLineItems", () => {
  it("extracts 1 line item from a valid invoice with M25 description", () => {
    const manifest = makeManifest([
      { unit_price: 12, quantity: 200, amount: 2400, description: "M25 C/G blanks", parsed: { grade: "M25" } },
    ]);
    const items = extractLineItems(manifest);
    expect(items).toHaveLength(1);
    expect(items[0].grade).toBe("M25");
    expect(items[0].unit_price_usd).toBe(M25_UNIT_PRICE_LOW);
    expect(items[0].vendor).toBe("Michigan Carbide Technologies");
  });

  it("skips line items with non-positive unit price", () => {
    const manifest = makeManifest([
      { unit_price: 0, quantity: 5, description: "M25 zero-price garbage" },
      { unit_price: -10, quantity: 5, description: "M25 negative" },
    ]);
    expect(extractLineItems(manifest)).toEqual([]);
  });

  it("skips line items where the grade cannot be normalized", () => {
    const manifest = makeManifest([
      { unit_price: 50, quantity: 1, description: "unrecognized junk material X9" },
    ]);
    expect(extractLineItems(manifest)).toEqual([]);
  });

  it("ignores docs whose document_type is neither invoice nor quote", () => {
    const manifest = {
      documents: [
        { id: "scan-1", document_type: null, extracted_data: { line_items: [{ unit_price: 100, quantity: 1, description: "M25" }] } },
        { id: "ack-2", document_type: "acknowledgment", extracted_data: { line_items: [{ unit_price: 100, quantity: 1, description: "D2" }] } },
      ],
    };
    expect(extractLineItems(manifest)).toEqual([]);
  });

  it("extracts from quote docs too (not just invoices)", () => {
    const manifest = makeManifest([
      { unit_price: A2_UNIT_PRICE, quantity: 10, description: "A2 plate" },
    ], "quote");
    const items = extractLineItems(manifest);
    expect(items).toHaveLength(1);
    expect(items[0].grade).toBe("A2");
  });

  it("computes total from unit_price × quantity when amount field is missing", () => {
    const manifest = makeManifest([
      { unit_price: 50, quantity: 4, description: "M25 small" },
    ]);
    const items = extractLineItems(manifest);
    expect(items[0].total_usd).toBe(200);
  });
});

describe("aggregateGradePriors", () => {
  function makeItem(grade: string, unitPrice: number, vendor = "v1"): MaterialLineItem {
    return {
      grade, unit_price_usd: unitPrice, quantity: 1, total_usd: unitPrice,
      vendor, raw_description: `${grade} test`, date: "2026-01-01", doc_id: "x",
    };
  }

  it("aggregates 3 M25 line items into median + quartile prior", () => {
    const items = [
      makeItem("M25", 10), makeItem("M25", 50), makeItem("M25", 90),
    ];
    const priors = aggregateGradePriors(items);
    const m25 = priors.get("M25");
    expect(m25?.evidence_count).toBe(3);
    expect(m25?.unit_price_usd.min).toBe(10);
    expect(m25?.unit_price_usd.median).toBe(50);
    expect(m25?.unit_price_usd.max).toBe(90);
  });

  it("skips grades with fewer than MIN_EVIDENCE rows", () => {
    const items = [makeItem("M25", 10)]; // n=1 < MIN_EVIDENCE=2
    const priors = aggregateGradePriors(items);
    expect(priors.has("M25")).toBe(false);
  });

  it("computes per-job spend bracket as blanks × percentile prices", () => {
    const items = [makeItem("D2", 100), makeItem("D2", 150), makeItem("D2", 200), makeItem("D2", 250)];
    const priors = aggregateGradePriors(items);
    const d2 = priors.get("D2");
    // For prices [100,150,200,250]: p25=150, median=200, p75=250
    expect(d2?.unit_price_usd.median).toBe(200);
    expect(d2?.per_job_spend_bracket_usd.low).toBe(BLANKS_LOW * 150);
    expect(d2?.per_job_spend_bracket_usd.median).toBe(BLANKS_MEDIAN * 200);
    expect(d2?.per_job_spend_bracket_usd.high).toBe(BLANKS_HIGH * 250);
  });

  it("collapses duplicate vendors in the vendors[] list", () => {
    const items = [
      makeItem("M25", 10, "MCT"), makeItem("M25", 20, "MCT"), makeItem("M25", 30, "MCT"),
    ];
    const priors = aggregateGradePriors(items);
    expect(priors.get("M25")?.vendors).toEqual(["MCT"]);
  });

  it("MIN_EVIDENCE_ROWS_PER_GRADE constant matches the documented threshold (2)", () => {
    expect(MIN_EVIDENCE).toBe(2);
  });
});

describe("DocuStrataMaterialPriorEngine.load + getUnitPrice (tmpdir round-trip)", () => {
  it("loads a synthetic manifest from disk, caches it, and returns per-grade unit-price stats", async () => {
    const dir = join(tmpdir(), `dmpe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    await fs.mkdir(dir, { recursive: true });
    const manifestPath = join(dir, "manifest.json");
    const manifest = makeManifest([
      { unit_price: 10, quantity: 100, description: "M25 small", parsed: { grade: "M25" } },
      { unit_price: 50, quantity: 10, description: "M25 mid", parsed: { grade: "M25" } },
      { unit_price: 90, quantity: 1, description: "M25 large", parsed: { grade: "M25" } },
    ]);
    await fs.writeFile(manifestPath, JSON.stringify(manifest), "utf8");

    const priors = await DocuStrataMaterialPriorEngine.getUnitPrice("M25", manifestPath);
    expect(priors?.median).toBe(50);
    expect(priors?.min).toBe(10);
    expect(priors?.max).toBe(90);

    const summary = await DocuStrataMaterialPriorEngine.getSummary(manifestPath);
    expect(summary.total_line_items).toBe(3);
    expect(summary.distinct_grades).toBe(1);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("returns null for grade with no evidence", async () => {
    const dir = join(tmpdir(), `dmpe-empty-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    await fs.mkdir(dir, { recursive: true });
    const manifestPath = join(dir, "manifest.json");
    await fs.writeFile(manifestPath, JSON.stringify(makeManifest([
      { unit_price: 10, quantity: 1, description: "M25 a", parsed: { grade: "M25" } },
      { unit_price: 20, quantity: 1, description: "M25 b", parsed: { grade: "M25" } },
    ])), "utf8");

    const unknownGrade = await DocuStrataMaterialPriorEngine.getUnitPrice("D2", manifestPath);
    expect(unknownGrade).toBeNull();

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("listGrades returns sorted distinct grades with credible evidence", async () => {
    const dir = join(tmpdir(), `dmpe-list-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    await fs.mkdir(dir, { recursive: true });
    const manifestPath = join(dir, "manifest.json");
    await fs.writeFile(manifestPath, JSON.stringify({
      documents: [
        { id: "1", document_type: "invoice", extracted_data: { line_items: [
          { unit_price: 10, quantity: 1, description: "M25 a" },
          { unit_price: 12, quantity: 1, description: "M25 b" },
          { unit_price: 50, quantity: 1, description: "A2 a" },
          { unit_price: 60, quantity: 1, description: "A2 b" },
        ] } },
      ],
    }), "utf8");

    const grades = await DocuStrataMaterialPriorEngine.listGrades(manifestPath);
    expect(grades).toEqual(["A2", "M25"]);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
