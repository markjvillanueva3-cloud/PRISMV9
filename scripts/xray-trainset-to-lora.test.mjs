// scripts/xray-trainset-to-lora.test.mjs
// Tests the resume-duplicate dedup identity. The resumable OCR runner appends per-page trainset rows
// BEFORE the per-print cursor, so a reaper kill mid-print leaves duplicate rows on resume. This loader
// is where the runner's promised "last-wins dedup by key+page" actually happens — without it a kill
// double-weights a print's labels in the LoRA bundle (the reviewer-A/B P1 this closes). Each test
// encodes WHY: a wrong dedup key either fails to remove a resume-duplicate (double-weight) or collapses
// two genuinely-different pages of one print (lost training data).

import { test } from "node:test";
import assert from "node:assert/strict";

import { trainsetRowDedupKey } from "./xray-trainset-to-lora.mjs";

test("dedup key = key+page: two different pages of one print are DISTINCT (never collapsed)", () => {
  const p0 = trainsetRowDedupKey({ key: "part.pdf", page: 0, image: "part.pdf#page=0" });
  const p1 = trainsetRowDedupKey({ key: "part.pdf", page: 1, image: "part.pdf#page=1" });
  assert.notEqual(p0, p1, "page 0 and page 1 of the same print are different training pairs");
  // a re-emitted SAME page (the resume duplicate) collapses to the same key → last-wins dedup
  assert.equal(p0, trainsetRowDedupKey({ key: "part.pdf", page: 0, image: "part.pdf#page=0" }));
});

test("dedup key falls back to image, then part, then null (legacy + adversarial rows)", () => {
  assert.equal(trainsetRowDedupKey({ image: "x.png" }), "x.png");          // legacy row, no key/page
  assert.equal(trainsetRowDedupKey({ part: "y" }), "y");                   // even older
  assert.equal(trainsetRowDedupKey({}), null);                            // no identity → kept as-is
  assert.equal(trainsetRowDedupKey(null), null);
  // key WITHOUT page does not use the key+page form (page is part of the identity) → falls to image
  assert.equal(trainsetRowDedupKey({ key: "k.pdf", image: "k.png" }), "k.png");
});

test("page 0 must not collide with a legacy keyless row that happens to share the image string", () => {
  // key+page form is "k.pdf#p0" — a different namespace from the bare image "k.pdf#page=0",
  // so a modern row and a legacy row for the same page don't accidentally merge with wrong precedence.
  const modern = trainsetRowDedupKey({ key: "k.pdf", page: 0, image: "k.pdf#page=0" });
  const legacy = trainsetRowDedupKey({ image: "k.pdf#page=0" });
  assert.equal(modern, "k.pdf#p0");
  assert.equal(legacy, "k.pdf#page=0");
  assert.notEqual(modern, legacy);
});
