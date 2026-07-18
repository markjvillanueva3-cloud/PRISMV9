// scripts/lib/pdf-vision-ocr-lib.test.mjs
//
// U-TDP11 — tests for the local vision-OCR tier. Hermetic: extractViaVision
// is exercised with an injected httpPostImpl so no live Ollama daemon is
// needed. Covers the JSON-fence-tolerant parser, type coercion, garbage
// rejection, every fail-soft path, and adversarial inputs.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildVisionPrompt,
  parseVisionResponse,
  extractViaVision,
  _internals,
} from "./pdf-vision-ocr-lib.mjs";

const { parseNominal, parseToleranceValue, extractJsonBlock, DEFAULT_VISION_MODEL } = _internals;

// ── buildVisionPrompt ──────────────────────────────────────────────────────

test("buildVisionPrompt: deterministic — same opts → identical string", () => {
  assert.equal(buildVisionPrompt({ units: "mm" }), buildVisionPrompt({ units: "mm" }));
});

test("buildVisionPrompt: units hint appears when given", () => {
  assert.match(buildVisionPrompt({ units: "inch" }), /dimensioned in inch/);
  assert.match(buildVisionPrompt({ units: "mm" }), /dimensioned in mm/);
});

test("buildVisionPrompt: no units → auto-detect instruction", () => {
  assert.match(buildVisionPrompt({}), /Auto-detect/);
  assert.match(buildVisionPrompt({ units: "furlongs" }), /Auto-detect/);
});

test("buildVisionPrompt: always demands JSON-only + omit-if-unsure", () => {
  const p = buildVisionPrompt({});
  assert.match(p, /ONLY a JSON object/);
  assert.match(p, /never guess/i);
});

// ── parseNominal ───────────────────────────────────────────────────────────

test("parseNominal: numeric 1.373 → 1.373", () => {
  assert.equal(parseNominal(1.373), 1.373);
});

test("parseNominal: numeric string '1.500' → 1.5", () => {
  assert.equal(parseNominal("1.500"), 1.5);
});

test("parseNominal: leading-glyph 'ø0.875' → 0.875", () => {
  assert.equal(parseNominal("ø0.875"), 0.875);
  assert.equal(parseNominal("R.040"), 0.04);
});

test("parseNominal: garbage 'DIA.' → null", () => {
  assert.equal(parseNominal("DIA."), null);
  assert.equal(parseNominal(""), null);
  assert.equal(parseNominal(null), null);
  assert.equal(parseNominal(undefined), null);
  assert.equal(parseNominal({}), null);
});

test("parseNominal: NaN / Infinity → null", () => {
  assert.equal(parseNominal(NaN), null);
  assert.equal(parseNominal(Infinity), null);
});

test("parseNominal: out-of-range (0, 99999) → null (mis-read serial / scale)", () => {
  assert.equal(parseNominal(0), null);
  assert.equal(parseNominal(99999), null);
  assert.equal(parseNominal(-5), null);
});

// ── parseToleranceValue ────────────────────────────────────────────────────

test("parseToleranceValue: numeric 0.005 → 0.005", () => {
  assert.equal(parseToleranceValue(0.005), 0.005);
});

test("parseToleranceValue: '±.005' → 0.005", () => {
  assert.ok(Math.abs(parseToleranceValue("±.005") - 0.005) < 1e-9);
});

test("parseToleranceValue: '+/-.001' ASCII form → 0.001", () => {
  assert.ok(Math.abs(parseToleranceValue("+/-.001") - 0.001) < 1e-9);
});

test("parseToleranceValue: EU comma '+/-0,005' → 0.005", () => {
  assert.ok(Math.abs(parseToleranceValue("+/-0,005") - 0.005) < 1e-9);
});

test("parseToleranceValue: 0 / null / garbage → null (untoleranced, not fabricated)", () => {
  assert.equal(parseToleranceValue(0), null);
  assert.equal(parseToleranceValue(null), null);
  assert.equal(parseToleranceValue("none"), null);
  assert.equal(parseToleranceValue(undefined), null);
});

test("parseToleranceValue: out-of-range ≥100 → null (mis-parsed nominal)", () => {
  assert.equal(parseToleranceValue(500), null);
});

// ── extractJsonBlock ───────────────────────────────────────────────────────

test("extractJsonBlock: ```json fenced block → inner object", () => {
  const r = extractJsonBlock('```json\n{"a":1}\n```');
  assert.equal(r, '{"a":1}');
});

test("extractJsonBlock: bare object with trailing commentary", () => {
  const r = extractJsonBlock('{"a":1} and here is some explanation');
  assert.equal(r, '{"a":1}');
});

test("extractJsonBlock: nested braces balanced correctly", () => {
  const r = extractJsonBlock('noise {"a":{"b":2},"c":3} tail');
  assert.equal(r, '{"a":{"b":2},"c":3}');
});

test("extractJsonBlock: brace inside a string literal not miscounted", () => {
  const r = extractJsonBlock('{"note":"a } brace in text","x":1}');
  assert.equal(r, '{"note":"a } brace in text","x":1}');
});

test("extractJsonBlock: no object → null", () => {
  assert.equal(extractJsonBlock("just prose, no json"), null);
  assert.equal(extractJsonBlock(""), null);
  assert.equal(extractJsonBlock(null), null);
});

test("extractJsonBlock: unbalanced (no closing brace) → null", () => {
  assert.equal(extractJsonBlock('{"a":1'), null);
});

// ── parseVisionResponse ────────────────────────────────────────────────────

test("parseVisionResponse: fenced qwen response → dimensions extracted", () => {
  const raw = '```json\n{"dimensions":[{"nominal":1.5,"tolerance":0.005,"kind":"linear"}],' +
    '"material":"D2","hardness":"58-60","surface_finish":null,"units":"inch"}\n```';
  const r = parseVisionResponse(raw);
  assert.equal(r.success, true);
  assert.equal(r.extraction.dimensions.length, 1);
  assert.equal(r.extraction.dimensions[0].nominal, 1.5);
  assert.ok(Math.abs(r.extraction.dimensions[0].tolerance.upper - 0.005) < 1e-9);
  assert.equal(r.extraction.material, "D2");
  assert.equal(r.extraction.hardness_grade, "58-60");
  assert.equal(r.extraction.units, "inch");
  assert.equal(r.extraction.source, "vision-ocr");
});

test("parseVisionResponse: garbage nominal 'DIA.' dim is DROPPED, others kept", () => {
  const raw = '{"dimensions":[{"nominal":"DIA.","tolerance":0.005},{"nominal":3.5,"tolerance":0.005}]}';
  const r = parseVisionResponse(raw);
  assert.equal(r.extraction.dimensions.length, 1, "only the parseable dim survives");
  assert.equal(r.extraction.dimensions[0].nominal, 3.5);
});

test("parseVisionResponse: tolerance null → dim kept WITHOUT a tolerance object", () => {
  const raw = '{"dimensions":[{"nominal":2.0,"tolerance":null,"kind":"diameter"}]}';
  const r = parseVisionResponse(raw);
  assert.equal(r.extraction.dimensions.length, 1);
  assert.equal(r.extraction.dimensions[0].tolerance, undefined);
  assert.equal(r.extraction.dimensions[0].kind, "diameter");
});

test("parseVisionResponse: unknown kind → defaults to 'linear'", () => {
  const raw = '{"dimensions":[{"nominal":5,"kind":"wibble"}]}';
  const r = parseVisionResponse(raw);
  assert.equal(r.extraction.dimensions[0].kind, "linear");
});

test("parseVisionResponse: empty response → success:false, empty extraction", () => {
  const r = parseVisionResponse("");
  assert.equal(r.success, false);
  assert.equal(r.extraction.dimensions.length, 0);
  assert.equal(r.extraction.confidence, 0.10);
});

test("parseVisionResponse: no JSON in response → success:false fail-soft", () => {
  const r = parseVisionResponse("I cannot read this drawing, sorry.");
  assert.equal(r.success, false);
  assert.match(r.error, /no JSON/);
  assert.equal(r.extraction.dimensions.length, 0);
});

test("parseVisionResponse: malformed JSON (balanced braces, bad syntax) → success:false", () => {
  // Brace-balanced so extractJsonBlock returns the slice, but the trailing
  // comma makes JSON.parse throw → caught → "malformed" error, no propagation.
  const r = parseVisionResponse('{"dimensions":[{"nominal":1.5,}]}');
  assert.equal(r.success, false);
  assert.match(r.error, /malformed/);
});

test("parseVisionResponse: unbalanced braces → success:false ('no JSON' path)", () => {
  // No matching close brace → extractJsonBlock returns null. Still fail-soft.
  const r = parseVisionResponse('{"dimensions":[{"nominal":1.5,]}');
  assert.equal(r.success, false);
  assert.equal(r.extraction.dimensions.length, 0);
});

test("parseVisionResponse: JSON array (not object) → success:false", () => {
  const r = parseVisionResponse("[1,2,3]");
  assert.equal(r.success, false);
});

test("parseVisionResponse: dimensions field missing → empty dims, success:true", () => {
  const r = parseVisionResponse('{"material":"S-7"}');
  assert.equal(r.success, true);
  assert.equal(r.extraction.dimensions.length, 0);
  assert.equal(r.extraction.material, "S-7");
});

test("parseVisionResponse: dimensions not an array → treated as empty", () => {
  const r = parseVisionResponse('{"dimensions":"oops"}');
  assert.equal(r.success, true);
  assert.equal(r.extraction.dimensions.length, 0);
});

test("parseVisionResponse: non-object dims in array are skipped", () => {
  const raw = '{"dimensions":[null,"text",42,{"nominal":1.0}]}';
  const r = parseVisionResponse(raw);
  assert.equal(r.extraction.dimensions.length, 1);
});

test("parseVisionResponse: non-string material/hardness → null", () => {
  const r = parseVisionResponse('{"dimensions":[],"material":123,"hardness":{}}');
  assert.equal(r.extraction.material, null);
  assert.equal(r.extraction.hardness_grade, null);
});

test("parseVisionResponse: confidence ladder — 4+ toleranced dims → HIGH (0.82)", () => {
  const dims = [1, 2, 3, 4, 5].map((n) => ({ nominal: n, tolerance: 0.005 }));
  const r = parseVisionResponse(JSON.stringify({ dimensions: dims }));
  assert.equal(r.extraction.confidence, 0.82);
});

test("parseVisionResponse: confidence ladder — 2-3 toleranced → MED (0.70)", () => {
  const r = parseVisionResponse(JSON.stringify({
    dimensions: [{ nominal: 1, tolerance: 0.005 }, { nominal: 2, tolerance: 0.005 }],
  }));
  assert.equal(r.extraction.confidence, 0.70);
});

test("parseVisionResponse: confidence caps below text tier (≤0.82, never 0.95)", () => {
  // Vision is inherently noisier than the deterministic text parse — even a
  // rich read must not claim the text tier's CONF_TOL_HIGH.
  const dims = Array.from({ length: 12 }, (_, i) => ({ nominal: i + 1, tolerance: 0.005 }));
  const r = parseVisionResponse(JSON.stringify({ dimensions: dims }));
  assert.ok(r.extraction.confidence <= 0.82, "vision confidence capped");
});

test("parseVisionResponse: model provenance recorded in extraction", () => {
  const r = parseVisionResponse('{"dimensions":[]}', { model: "llama3.2-vision:11b" });
  assert.equal(r.extraction.model, "llama3.2-vision:11b");
});

test("parseVisionResponse: non-string input → success:false fail-soft", () => {
  assert.equal(parseVisionResponse(null).success, false);
  assert.equal(parseVisionResponse(42).success, false);
  assert.equal(parseVisionResponse(undefined).success, false);
});

// ── extractViaVision (injected httpPost) ───────────────────────────────────

test("extractViaVision: happy path — injected httpPost returns qwen JSON", async () => {
  const fakePost = async () =>
    '```json\n{"dimensions":[{"nominal":3.505,"tolerance":0.005}],"material":"D2"}\n```';
  const r = await extractViaVision({ imageBase64: "ZmFrZQ==", httpPostImpl: fakePost });
  assert.equal(r.success, true);
  assert.equal(r.extraction.dimensions.length, 1);
  assert.equal(r.extraction.material, "D2");
});

test("extractViaVision: passes image + model into the request body", async () => {
  let captured = null;
  const fakePost = async (url, body) => {
    captured = { url, body };
    return '{"dimensions":[]}';
  };
  await extractViaVision({
    imageBase64: "SU1H",
    model: "qwen2.5vl:7b",
    httpPostImpl: fakePost,
  });
  assert.match(captured.url, /\/api\/generate$/);
  assert.equal(captured.body.model, "qwen2.5vl:7b");
  assert.deepEqual(captured.body.images, ["SU1H"]);
  assert.equal(captured.body.stream, false);
  assert.equal(captured.body.options.temperature, 0);
});

test("extractViaVision: no image data → success:false, no http call", async () => {
  let called = false;
  const fakePost = async () => {
    called = true;
    return "{}";
  };
  const r = await extractViaVision({ imageBase64: "", httpPostImpl: fakePost });
  assert.equal(r.success, false);
  assert.match(r.error, /no image/);
  assert.equal(called, false, "no HTTP call attempted without an image");
});

test("extractViaVision: httpPost throws → success:false fail-soft (no propagation)", async () => {
  const fakePost = async () => {
    throw new Error("ECONNREFUSED 127.0.0.1:11434");
  };
  const r = await extractViaVision({ imageBase64: "ZmFrZQ==", httpPostImpl: fakePost });
  assert.equal(r.success, false);
  assert.match(r.error, /vision request failed/);
  assert.match(r.error, /ECONNREFUSED/);
  assert.equal(r.extraction.dimensions.length, 0);
});

test("extractViaVision: httpPost returns garbage → success:false, empty extraction", async () => {
  const fakePost = async () => "the model said something useless";
  const r = await extractViaVision({ imageBase64: "ZmFrZQ==", httpPostImpl: fakePost });
  assert.equal(r.success, false);
  assert.equal(r.extraction.dimensions.length, 0);
});

test("extractViaVision: default model used when none supplied", async () => {
  let body = null;
  const fakePost = async (u, b) => {
    body = b;
    return '{"dimensions":[]}';
  };
  await extractViaVision({ imageBase64: "ZmFrZQ==", httpPostImpl: fakePost });
  assert.equal(body.model, DEFAULT_VISION_MODEL);
});

test("extractViaVision: units hint flows into the prompt", async () => {
  let body = null;
  const fakePost = async (u, b) => {
    body = b;
    return '{"dimensions":[]}';
  };
  await extractViaVision({ imageBase64: "ZmFrZQ==", units: "inch", httpPostImpl: fakePost });
  assert.match(body.prompt, /dimensioned in inch/);
});

test("extractViaVision: real-shape qwen response (verbatim from live probe)", async () => {
  // The exact response shape observed from the live qwen2.5vl probe on a
  // scanned JM Die print — paired bands flattened to per-dim tolerances.
  const liveShape =
    '```json\n{\n  "dimensions": [\n' +
    '    {"nominal": "1.373", "tolerance": "0.001"},\n' +
    '    {"nominal": "1.510", "tolerance": "0.005"},\n' +
    '    {"nominal": "DIA.", "tolerance": "0.005"}\n' +
    '  ],\n  "material": "D2",\n  "hardness": "58-60 TEMPERED"\n}\n```';
  const r = await extractViaVision({ imageBase64: "ZmFrZQ==", httpPostImpl: async () => liveShape });
  assert.equal(r.success, true);
  assert.equal(r.extraction.dimensions.length, 2, "the 'DIA.' garbage nominal dropped, 2 real dims kept");
  assert.equal(r.extraction.material, "D2");
  assert.equal(r.extraction.hardness_grade, "58-60 TEMPERED");
});
