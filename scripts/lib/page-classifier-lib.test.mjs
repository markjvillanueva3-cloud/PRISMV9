// scripts/lib/page-classifier-lib.test.mjs
// Tests for the drawing-vs-paperwork page classifier pure core
// (U-PSGB-XRAY-PAGE-CLASSIFIER). No Ollama needed — the lib is pure.
// Run: node --test <file>
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPageClassifierPrompt,
  buildClassifierRequestBody,
  parsePageClassifierResponse,
  decidePageVerdict,
  PAGE_KINDS,
  DEFAULT_VISION_MODEL,
  DEFAULT_SKIP_MIN_CONFIDENCE,
} from "./page-classifier-lib.mjs";

// ── buildPageClassifierPrompt ──

test("prompt is a non-trivial string demanding strict JSON + is_drawing/page_kind", () => {
  const p = buildPageClassifierPrompt();
  assert.equal(typeof p, "string");
  assert.ok(p.length > 200, "prompt is substantive");
  assert.ok(p.includes("is_drawing"), "names is_drawing");
  assert.ok(p.includes("page_kind"), "names page_kind");
  assert.ok(p.includes("confidence"), "names confidence");
  assert.ok(/JSON/.test(p), "demands JSON");
  assert.ok(/ONLY the JSON/.test(p), "forbids prose wrapping");
  // it must teach the strict-boolean definition (a drawing needs dimensioned geometry)
  assert.ok(/dimension/i.test(p), "defines drawing as dimensioned");
});

// ── buildClassifierRequestBody ──

test("body defaults: instruct model, SMALL num_predict, think:false, deterministic temp, image present", () => {
  const b = buildClassifierRequestBody("PROMPT", "BASE64IMG");
  assert.equal(b.model, DEFAULT_VISION_MODEL);
  assert.equal(b.model, "qwen3-vl:8b-instruct");
  assert.equal(b.prompt, "PROMPT");
  assert.deepEqual(b.images, ["BASE64IMG"]);
  assert.equal(b.stream, false);
  assert.equal(b.think, false, "think:false by default for the instruct VLM");
  assert.equal(b.options.temperature, 0, "deterministic classification");
  assert.ok(b.options.num_predict <= 128, "classification output is tiny (not the 4096 extraction budget)");
  assert.equal(b.options.num_predict, 96, "default num_predict");
  assert.equal(b.options.num_ctx, 8192, "default ctx must hold prompt + 150dpi page vision tokens; 4096 overflows -> empty output");
});

test("body respects overrides (model, numPredict, think, modelOptions)", () => {
  const b = buildClassifierRequestBody("P", "I", { model: "other:1b", numPredict: 48, think: true, numCtx: 2048, modelOptions: { seed: 7 } });
  assert.equal(b.model, "other:1b");
  assert.equal(b.options.num_predict, 48);
  assert.equal(b.think, true);
  assert.equal(b.options.num_ctx, 2048);
  assert.equal(b.options.seed, 7, "modelOptions merge through");
});

test("body ignores invalid numPredict/numCtx (falls back to defaults)", () => {
  const b = buildClassifierRequestBody("P", "I", { numPredict: -5, numCtx: 0 });
  assert.equal(b.options.num_predict, 96);
  assert.equal(b.options.num_ctx, 8192);
});

// ── parsePageClassifierResponse — JSON path ──

test("clean JSON drawing → is_drawing true, kind drawing, source json", () => {
  const r = parsePageClassifierResponse('{"is_drawing": true, "page_kind": "drawing", "confidence": 0.95, "reason": "dimensioned views + title block"}');
  assert.equal(r.success, true);
  assert.equal(r.classification.is_drawing, true);
  assert.equal(r.classification.page_kind, "drawing");
  assert.equal(r.classification.confidence, 0.95);
  assert.equal(r.classification.reason, "dimensioned views + title block");
  assert.equal(r.classification.source, "json");
});

test("clean JSON BOM → is_drawing false, kind bom", () => {
  const r = parsePageClassifierResponse('{"is_drawing": false, "page_kind": "bom", "confidence": 0.9, "reason": "parts list table"}');
  assert.equal(r.success, true);
  assert.equal(r.classification.is_drawing, false);
  assert.equal(r.classification.page_kind, "bom");
});

test("fenced JSON is unwrapped", () => {
  const r = parsePageClassifierResponse('```json\n{"is_drawing": false, "page_kind": "notes", "confidence": 0.8}\n```');
  assert.equal(r.success, true);
  assert.equal(r.classification.is_drawing, false);
  assert.equal(r.classification.page_kind, "notes");
});

test("JSON with surrounding prose still extracts the object", () => {
  const r = parsePageClassifierResponse('Here is my answer: {"is_drawing": true, "page_kind": "drawing", "confidence": 0.7} hope that helps');
  assert.equal(r.success, true);
  assert.equal(r.classification.is_drawing, true);
});

test("is_drawing as string yes/no and number 1/0 are coerced", () => {
  assert.equal(parsePageClassifierResponse('{"is_drawing":"yes","page_kind":"drawing","confidence":0.8}').classification.is_drawing, true);
  assert.equal(parsePageClassifierResponse('{"is_drawing":"no","page_kind":"text","confidence":0.8}').classification.is_drawing, false);
  assert.equal(parsePageClassifierResponse('{"is_drawing":1,"page_kind":"drawing","confidence":0.8}').classification.is_drawing, true);
  assert.equal(parsePageClassifierResponse('{"is_drawing":0,"page_kind":"text","confidence":0.8}').classification.is_drawing, false);
});

test("missing is_drawing is DERIVED from page_kind", () => {
  assert.equal(parsePageClassifierResponse('{"page_kind":"drawing","confidence":0.8}').classification.is_drawing, true);
  assert.equal(parsePageClassifierResponse('{"page_kind":"bom","confidence":0.8}').classification.is_drawing, false);
});

test("page_kind is normalized (case + separators)", () => {
  assert.equal(parsePageClassifierResponse('{"is_drawing":false,"page_kind":"Title Sheet","confidence":0.8}').classification.page_kind, "title_sheet");
  assert.equal(parsePageClassifierResponse('{"is_drawing":false,"page_kind":"TITLE-SHEET","confidence":0.8}').classification.page_kind, "title_sheet");
});

test("unknown page_kind with is_drawing true falls back to drawing; false → other", () => {
  assert.equal(parsePageClassifierResponse('{"is_drawing":true,"page_kind":"weird","confidence":0.8}').classification.page_kind, "drawing");
  assert.equal(parsePageClassifierResponse('{"is_drawing":false,"page_kind":"weird","confidence":0.8}').classification.page_kind, "other");
});

test("confidence is clamped to [0,1]; missing → 0.5 default", () => {
  assert.equal(parsePageClassifierResponse('{"is_drawing":true,"page_kind":"drawing","confidence":1.7}').classification.confidence, 1);
  assert.equal(parsePageClassifierResponse('{"is_drawing":true,"page_kind":"drawing","confidence":-0.3}').classification.confidence, 0);
  assert.equal(parsePageClassifierResponse('{"is_drawing":true,"page_kind":"drawing"}').classification.confidence, 0.5);
  assert.equal(parsePageClassifierResponse('{"is_drawing":true,"page_kind":"drawing","confidence":"high"}').classification.confidence, 0.5);
});

test("JSON object present but is_drawing undeterminable (no flag, no kind) → failure", () => {
  const r = parsePageClassifierResponse('{"confidence":0.8,"reason":"unsure"}');
  assert.equal(r.success, false);
  assert.equal(r.classification, null);
});

// ── parsePageClassifierResponse — prose fallback ──

test("prose negative is recognized but kept BELOW the default skip floor", () => {
  const r = parsePageClassifierResponse("This page is a bill of materials, not a drawing.");
  assert.equal(r.success, true);
  assert.equal(r.classification.is_drawing, false);
  assert.equal(r.classification.source, "prose");
  assert.ok(r.classification.confidence < DEFAULT_SKIP_MIN_CONFIDENCE,
    "prose negatives must not be confident enough to drive a skip — never lose a real drawing on prose");
});

test("prose positive → is_drawing true", () => {
  const r = parsePageClassifierResponse("Yes, this is an engineering drawing with dimensioned views.");
  assert.equal(r.success, true);
  assert.equal(r.classification.is_drawing, true);
  assert.equal(r.classification.source, "prose");
});

test("bare yes/no prose", () => {
  assert.equal(parsePageClassifierResponse("yes").classification.is_drawing, true);
  assert.equal(parsePageClassifierResponse("no").classification.is_drawing, false);
});

test("empty / null / whitespace / undecidable prose → failure", () => {
  assert.equal(parsePageClassifierResponse("").success, false);
  assert.equal(parsePageClassifierResponse(null).success, false);
  assert.equal(parsePageClassifierResponse("   ").success, false);
  assert.equal(parsePageClassifierResponse("the weather is nice today").success, false);
});

// ── decidePageVerdict — the load-bearing safety bias ──

test("confident not-a-drawing (structured JSON) → SKIP", () => {
  const v = decidePageVerdict({ is_drawing: false, confidence: 0.9, source: "json" });
  assert.equal(v.verdict, "skip");
  assert.equal(v.confident_skip, true);
});

test("LOW-confidence not-a-drawing → EXTRACT (never lose a real drawing)", () => {
  const v = decidePageVerdict({ is_drawing: false, confidence: 0.5 });
  assert.equal(v.verdict, "extract");
  assert.equal(v.confident_skip, false);
});

test("a drawing always extracts, regardless of confidence", () => {
  assert.equal(decidePageVerdict({ is_drawing: true, confidence: 0.99 }).verdict, "extract");
  assert.equal(decidePageVerdict({ is_drawing: true, confidence: 0.1 }).verdict, "extract");
});

test("null/garbage classification → EXTRACT (fail toward extraction)", () => {
  assert.equal(decidePageVerdict(null).verdict, "extract");
  assert.equal(decidePageVerdict(undefined).verdict, "extract");
  assert.equal(decidePageVerdict("nope").verdict, "extract");
});

test("custom minConfidence floor shifts the skip threshold", () => {
  // conf 0.6 structured not-a-drawing: skips at floor 0.5, extracts at default 0.7
  assert.equal(decidePageVerdict({ is_drawing: false, confidence: 0.6, source: "json" }, { minConfidence: 0.5 }).verdict, "skip");
  assert.equal(decidePageVerdict({ is_drawing: false, confidence: 0.6, source: "json" }).verdict, "extract");
});

test("REGRESSION: a confident not-a-drawing NEVER skips unless source is structured JSON (prose/missing -> EXTRACT)", () => {
  // The skip is gated on source === "json": a prose-inferred or source-less negative, however
  // confident, must fall through to extraction -- a low-trust inference can never lose a real drawing.
  assert.equal(decidePageVerdict({ is_drawing: false, confidence: 1.0, source: "prose" }).verdict, "extract");
  assert.equal(decidePageVerdict({ is_drawing: false, confidence: 1.0 }).verdict, "extract"); // no source field
  assert.equal(decidePageVerdict({ is_drawing: false, confidence: 1.0, source: "json" }).verdict, "skip");
});

test("REGRESSION: a zero / negative skip floor NEVER skips, even at conf 1.0 (data-loss degenerate)", () => {
  // floor 0: is_drawing false at conf 1.0 must STILL extract — a non-positive
  // effective floor would otherwise let a conf-0 "no idea" verdict skip a drawing.
  assert.equal(decidePageVerdict({ is_drawing: false, confidence: 1.0 }, { minConfidence: 0 }).verdict, "extract");
  assert.equal(decidePageVerdict({ is_drawing: false, confidence: 0 }, { minConfidence: 0 }).verdict, "extract");
  // negative floor clamps to 0 → still never skips
  assert.equal(decidePageVerdict({ is_drawing: false, confidence: 1.0 }, { minConfidence: -1 }).verdict, "extract");
});

test("REGRESSION: a prose-source negative NEVER skips, even at a (hypothetical) high confidence", () => {
  // The source-guard decouples prose confidence from the floor entirely: a prose
  // inference is low-trust and must always fall through to extraction.
  const v = decidePageVerdict({ is_drawing: false, confidence: 0.99, source: "prose" });
  assert.equal(v.verdict, "extract");
  assert.equal(v.confident_skip, false);
  // a structured (json) negative at the same confidence DOES skip — proves the
  // gate's difference is the source, not the value.
  assert.equal(decidePageVerdict({ is_drawing: false, confidence: 0.99, source: "json" }).verdict, "skip");
});

test("explicit is_drawing:null + non-drawing page_kind derives false and (json source) skips — pinned intentional", () => {
  const r = parsePageClassifierResponse('{"is_drawing":null,"page_kind":"bom","confidence":0.95}');
  assert.equal(r.success, true);
  assert.equal(r.classification.is_drawing, false, "null flag derives from page_kind");
  assert.equal(r.classification.source, "json");
  assert.equal(decidePageVerdict(r.classification).verdict, "skip", "a confident structured BOM is a legitimate skip");
});

test("array-wrapped single object is tolerated (parses the inner object)", () => {
  const r = parsePageClassifierResponse('[{"is_drawing": false, "page_kind": "cover", "confidence": 0.9}]');
  assert.equal(r.success, true);
  assert.equal(r.classification.is_drawing, false);
  assert.equal(r.classification.page_kind, "cover");
});

test("a prose negative, end-to-end, does NOT skip at default floor", () => {
  // The integration of the two safety properties: prose negative conf (0.55) <
  // default floor (0.70) ⇒ extract. This is the guard against silently dropping
  // a real drawing the model described in prose instead of JSON.
  const parsed = parsePageClassifierResponse("This is a notes page, not a drawing.");
  const v = decidePageVerdict(parsed.classification);
  assert.equal(v.verdict, "extract", "prose-negative must fall through to extraction");
});

// ── invariants ──

test("PAGE_KINDS includes drawing + unknown and is frozen", () => {
  assert.ok(PAGE_KINDS.includes("drawing"));
  assert.ok(PAGE_KINDS.includes("unknown"));
  assert.ok(Object.isFrozen(PAGE_KINDS));
});
