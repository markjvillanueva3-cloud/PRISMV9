// scripts/lib/sfc-jm-stock-prior.test.mjs
// Run: `node scripts/lib/sfc-jm-stock-prior.test.mjs`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStockPrior, STOCK_GRADE_ISO } from "./sfc-jm-stock-prior.mjs";

test("STOCK_GRADE_ISO: JM tool steels -> H, structural -> P, PH stainless -> M", () => {
  assert.equal(STOCK_GRADE_ISO.H13, "H");
  assert.equal(STOCK_GRADE_ISO.D2, "H");
  assert.equal(STOCK_GRADE_ISO.M2, "H");
  assert.equal(STOCK_GRADE_ISO["4140"], "P");
  assert.equal(STOCK_GRADE_ISO["174"], "M"); // 17-4 PH
});

test("computeStockPrior: occurrence-weighted ISO distribution + modal group", () => {
  // synthetic catalog mirroring the real JM shape (tool steel dominant)
  const catalog = {
    gradesForms: [
      { grade: "H13", occurrences: 831 },
      { grade: "M2", occurrences: 375 },
      { grade: "D2", occurrences: 275 },
      { grade: "4140", occurrences: 62 },
      { grade: "1045", occurrences: 14 },
      { grade: "174", occurrences: 14 },
      { grade: "ZZZUNKNOWN", occurrences: 9 },
    ],
  };
  const p = computeStockPrior(catalog);
  assert.equal(p.total, 1580);
  assert.equal(p.byIso.H, 831 + 375 + 275); // 1481 tool steel
  assert.equal(p.byIso.P, 62 + 14);          // 76 structural
  assert.equal(p.byIso.M, 14);               // 17-4
  assert.equal(p.modalIso, "H");             // tool steel is the JM default
  assert.deepEqual(p.unmapped, ["ZZZUNKNOWN"]);
  assert.equal(p.matched, 1580 - 9);
});

test("computeStockPrior: empty/missing catalog -> P default, no throw", () => {
  assert.equal(computeStockPrior({}).modalIso, "P");
  assert.equal(computeStockPrior(null).total, 0);
});
