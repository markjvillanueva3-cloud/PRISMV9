// Regression tests for the U-VIZ-AUG-STALE-REWIRE FAST[]/HEAVY[] wiring (sierra 2026-06-22).
// Run direct: `node scripts/regen-viz-fast-order.test.mjs`.
//
// These encode INTENT (R9), not config-mirroring:
//   1. The 3 cheap stale-orphan generators are FAST-registered so they re-run every regen
//      (without it, merge folds a ~44-day-old frozen file forever -- the bug this unit fixed).
//   2. The B2->B3 dependency: heuristic-classifier.mjs reads merge-file-coverage-v2.mjs's OUTPUT
//      (file-coverage-v2-augmentation.json). FAST[] runs SEQUENTIALLY, so B2 MUST precede B3 in the
//      array -- a reorder makes B3 silently read the prior regen's stale coverage (NO error). This
//      test fails loud on such a reorder.
//   3. The two full-graph loaders (augment-graph-with-awareness / build-business-value-map) were MIGRATED
//      off JSON.parse(readFileSync utf8) to readGraphStreaming (U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX) -- they
//      were V8-512MiB-string-cap broken (exit 1) for 44 days. They must now be HEAVY[]-wired (they exit 0)
//      but NEVER promoted to FAST[]: a 781MB graph load on every regen would re-introduce the slow/OOM class.
//      The test fails loud if either is dropped from HEAVY[] or promoted into FAST[].
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseGeneratorArray } from "./lib/viz-dual-registration-audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(__dirname, "regen-viz.mjs"), "utf8");
const FAST = parseGeneratorArray(SRC, "FAST");
const HEAVY = parseGeneratorArray(SRC, "HEAVY");

describe("regen-viz FAST[] rewire-fast registration (U-VIZ-AUG-STALE-REWIRE)", () => {
  it("all 3 cheap stale-orphan generators are in FAST[]", () => {
    for (const g of ["merge-file-coverage-v2.mjs", "build-novelty-catalog.mjs", "heuristic-classifier.mjs"]) {
      assert.ok(FAST.includes(g), `${g} must be FAST-registered (else its augmentation stale-folds forever)`);
    }
  });

  it("merge-file-coverage-v2 precedes heuristic-classifier (B2->B3 sequential dependency)", () => {
    const b2 = FAST.indexOf("merge-file-coverage-v2.mjs");
    const b3 = FAST.indexOf("heuristic-classifier.mjs");
    assert.ok(b2 >= 0 && b3 >= 0, "both must be present");
    assert.ok(b2 < b3, `merge-file-coverage-v2 (${b2}) must run BEFORE heuristic-classifier (${b3}) -- B3 reads B2's output`);
  });
});

describe("regen-viz HEAVY[] rewire-heavy registration", () => {
  it("h-drive-skipped-census is in HEAVY[] (validated 65s FS-walk, --full only)", () => {
    assert.ok(HEAVY.includes("h-drive-skipped-census.mjs"), "skipped-census belongs in HEAVY[] (too slow for FAST[], no graph load)");
  });
});

describe("migrated graph-loaders are HEAVY[]-wired, never FAST[] (U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX)", () => {
  it("awareness + business-value are in HEAVY[] (migrated to readGraphStreaming) but NOT in FAST[]", () => {
    for (const migrated of ["augment-graph-with-awareness.mjs", "build-business-value-map.mjs"]) {
      assert.ok(HEAVY.includes(migrated), `${migrated} must be HEAVY-wired post-streaming-migration (it now exits 0; was V8-string-cap broken)`);
      assert.ok(!FAST.includes(migrated), `${migrated} must NEVER be in FAST[] -- it loads the full 781MB graph; a per-regen load re-introduces the slow/OOM class. --full only.`);
    }
  });
});
