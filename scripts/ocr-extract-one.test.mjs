// scripts/ocr-extract-one.test.mjs
// U-XRAY-DRAWING-EXTRACT-ROUTE-ASYNC -- real reference-value tests for the PURE cores of the OCR-one
// exec (arg parse + raster planning + model choice). The impure main() (python raster + ollama
// ensemble) is exercised end-to-end by the route/runner integration, not here -- unit tests never
// spawn python/ollama. Run: node --test scripts/ocr-extract-one.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOcrOneArgs, planRaster, chooseModels } from "./ocr-extract-one.mjs";
import { VISION_FAMILY_LEADERS } from "./lib/vision-model-select.mjs";

test("parseOcrOneArgs: parses a full arg vector", () => {
  const o = parseOcrOneArgs(["--source", "/up/a.pdf", "--models", "m1,m2", "--page", "3", "--dpi", "150", "--part-class", "electrode", "--wire-edm", "--assume-units", "mm", "--max-time-sec", "120", "--json"]);
  assert.equal(o.source, "/up/a.pdf");
  assert.equal(o.models, "m1,m2");
  assert.equal(o.page, 3);
  assert.equal(o.dpi, 150);
  assert.equal(o.partClass, "electrode");
  assert.equal(o.wireEdm, true);
  assert.equal(o.assumeUnits, "mm");
  assert.equal(o.maxTimeSec, 120);
  assert.equal(o.json, true);
});

test("parseOcrOneArgs: applies defaults when flags are absent", () => {
  const o = parseOcrOneArgs(["--source", "/up/b.png"]);
  assert.equal(o.models, null);
  assert.equal(o.page, 0);
  assert.equal(o.dpi, 300);
  assert.equal(o.partClass, "generic");
  assert.equal(o.wireEdm, false);
  assert.equal(o.assumeUnits, "in");
  assert.equal(o.json, false);
});

test("parseOcrOneArgs: clamps a negative page to 0 and a tiny dpi to the 72 floor", () => {
  const o = parseOcrOneArgs(["--source", "x.pdf", "--page", "-5", "--dpi", "10"]);
  assert.equal(o.page, 0);
  assert.equal(o.dpi, 72);
});

test("parseOcrOneArgs: ignores a non-numeric page/dpi (default, never NaN)", () => {
  const o = parseOcrOneArgs(["--source", "x.pdf", "--page", "abc", "--dpi", "xyz"]);
  assert.equal(o.page, 0);
  assert.equal(o.dpi, 300);
});

test("planRaster: flags a PDF as needing a raster step", () => {
  assert.deepEqual(planRaster("/up/print.pdf"), { ok: true, ext: ".pdf", needsRaster: true });
});

test("planRaster: handles every supported raster image directly (no raster step)", () => {
  for (const ext of [".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"]) {
    const p = planRaster(`/up/img${ext}`);
    assert.equal(p.ok, true, ext);
    assert.equal(p.needsRaster, false, ext);
  }
});

test("planRaster: is case-insensitive on the extension", () => {
  assert.equal(planRaster("/up/SCAN.PDF").needsRaster, true);
  assert.equal(planRaster("/up/PHOTO.PNG").needsRaster, false);
});

test("planRaster: ADVERSARIAL -- rejects an unsupported ext (.dxf is the sync path, not OCR)", () => {
  const p = planRaster("/up/widget.dxf");
  assert.equal(p.ok, false);
  assert.match(p.reason, /unsupported source ext/);
});

test("planRaster: ADVERSARIAL -- rejects an empty / non-string source", () => {
  assert.equal(planRaster("").ok, false);
  assert.equal(planRaster(null).ok, false);
  assert.equal(planRaster(undefined).ok, false);
});

test("chooseModels: uses an explicit --models list verbatim (comma or whitespace separated)", () => {
  assert.deepEqual(chooseModels("qwen3-vl:8b-instruct, qwen2.5vl:7b", []).models, ["qwen3-vl:8b-instruct", "qwen2.5vl:7b"]);
  assert.deepEqual(chooseModels("a b\tc", null).models, ["a", "b", "c"]);
});

test("chooseModels: auto-selects only family leaders that are actually pulled", () => {
  // a real leader + a junk id that is NOT a family leader; only the pulled leader survives.
  const leader = VISION_FAMILY_LEADERS[0];
  const { models, source } = chooseModels(null, [leader, "not-a-vision-model:1b"]);
  assert.ok(models.includes(leader));
  assert.ok(!models.includes("not-a-vision-model:1b"));
  assert.match(source, /pulled family leaders/);
});

test("chooseModels: when ALL leaders are pulled, returns exactly the leader roster (reference)", () => {
  // deepEqual against the live roster -- fails if the pulled-gate or filter ever drops/reorders a leader.
  const { models } = chooseModels(null, [...VISION_FAMILY_LEADERS]);
  assert.deepEqual(models, [...VISION_FAMILY_LEADERS].slice(0, 3));
});

test("chooseModels: empty roster when nothing is pulled (caller errors, no blind spawn)", () => {
  assert.deepEqual(chooseModels(null, []).models, []);
  assert.deepEqual(chooseModels(null, null).models, []);
});

test("chooseModels: ADVERSARIAL -- drops a thinking-trap leader, keeps the JSON-safe one", () => {
  // qwen3-vl:30b is a thinking-trap (no terminal -instruct); the -instruct variant is safe. Inject both
  // as pulled leaders so the trap-filter is genuinely exercised (not vacuous against the real roster).
  const { models } = chooseModels(null, ["qwen3-vl:8b-instruct", "qwen3-vl:30b"], ["qwen3-vl:8b-instruct", "qwen3-vl:30b"]);
  assert.ok(models.includes("qwen3-vl:8b-instruct"));
  assert.ok(!models.includes("qwen3-vl:30b"), "thinking-trap model must be excluded");
});

test("chooseModels: caps the auto roster at the GPU budget (injected 5 pulled leaders -> 3)", () => {
  // inject a 5-leader set, ALL pulled, so .slice(maxModels) is genuinely reached. Deleting the cap in
  // chooseModels would make this return 5 and fail -- the test now verifies the cap it claims to (R9).
  const five = ["m1:vl", "m2:vl", "m3:vl", "m4:vl", "m5:vl"];
  const { models } = chooseModels(null, five, five);
  assert.equal(models.length, 3);
  assert.deepEqual(models, ["m1:vl", "m2:vl", "m3:vl"]);
});

test("chooseModels: honors an injected maxModels override", () => {
  const five = ["m1:vl", "m2:vl", "m3:vl", "m4:vl", "m5:vl"];
  assert.equal(chooseModels(null, five, five, 2).models.length, 2);
  assert.equal(chooseModels(null, five, five, 1).models.length, 1);
});
