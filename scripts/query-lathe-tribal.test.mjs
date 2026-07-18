import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { queryByIsoAndOp, findGrade, searchAll } from "./query-lathe-tribal.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const indexPath = resolve(repoRoot, "mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json");
const index = JSON.parse(readFileSync(indexPath, "utf8"));

describe("queryByIsoAndOp (real index)", () => {
  it("returns the stainless roughing record for ISO M + od_rough", () => {
    const hits = queryByIsoAndOp(index, "M", "od_rough");
    assert.ok(hits.length >= 1);
    assert.equal(hits[0].first_choice, "AH725");
    assert.ok(hits[0].candidates.includes("PC8010"));
  });

  it("returns the cast iron roughing record for ISO K + od_rough", () => {
    const hits = queryByIsoAndOp(index, "K", "od_rough");
    assert.ok(hits.length >= 1);
    const cands = hits.flatMap(h => h.candidates || []);
    assert.ok(cands.includes("WKK20S"));
  });

  it("returns the CBN hardened steel record for ISO H + od_finish", () => {
    const hits = queryByIsoAndOp(index, "H", "od_finish");
    assert.ok(hits.length >= 1);
    assert.ok(hits[0].candidates.includes("TB610"));
  });

  it("returns all records when neither iso nor op specified", () => {
    const all = queryByIsoAndOp(index, null, null);
    assert.ok(all.length >= 5);
  });
});

describe("findGrade (real index)", () => {
  it("finds Kennametal KCP25 in the index", () => {
    const hits = findGrade(index, "KCP25");
    assert.ok(hits.length >= 1);
    assert.equal(hits[0].vendor, "kennametal");
  });

  it("finds Tungaloy AH725 in the index", () => {
    const hits = findGrade(index, "AH725");
    assert.ok(hits.length >= 1);
    assert.equal(hits[0].vendor, "tungaloy");
    assert.ok(hits[0].grade.iso.some(g => g.includes("M")));
  });

  it("returns empty array for unknown grade", () => {
    assert.deepEqual(findGrade(index, "NOTAREALGRADE"), []);
  });

  it("returns empty array for falsy input", () => {
    assert.deepEqual(findGrade(index, null), []);
    assert.deepEqual(findGrade(index, ""), []);
  });
});

describe("searchAll (real index)", () => {
  it("finds inserts mentioning Inconel", () => {
    const hits = searchAll(index, "Inconel");
    assert.ok(hits.length >= 1);
  });

  it("finds inserts mentioning stainless", () => {
    const hits = searchAll(index, "stainless");
    assert.ok(hits.length >= 3);
  });

  it("returns empty for empty query", () => {
    assert.deepEqual(searchAll(index, ""), []);
    assert.deepEqual(searchAll(index, null), []);
  });
});

describe("Index coverage sanity", () => {
  it("has at least 10 vendors", () => {
    assert.ok(Object.keys(index.vendors).length >= 10);
  });

  it("has at least 50 grades indexed by ISO P", () => {
    assert.ok((index.indexes.grades_by_iso_p || []).length >= 50);
  });

  it("has at least 5 wizard query records", () => {
    assert.ok((index.wizard_query_records || []).length >= 5);
  });

  it("AI query synonyms cover ISO_P through ISO_H", () => {
    const syn = index.ai_query_synonyms || {};
    for (const k of ["ISO_P","ISO_M","ISO_K","ISO_N","ISO_S","ISO_H"]) {
      assert.ok(Array.isArray(syn[k]) && syn[k].length > 0);
    }
  });
});
