// scripts/lib/ollama-vision-extract-lib.test.mjs
// Tests for the rich multi-zone Ollama vision extractor pure core
// (U-TDP06 + U-PSGB-XRAY-RICH-SCHEMA). Run: node --test <file>

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildVisionPrompt,
  parseVisionResponse,
  buildOllamaRequestBody,
  repairTruncatedJson,
  repairLeadingDotDecimals,
  normalizeUnit,
  convertToMm,
  DEFAULT_VISION_MODEL,
  TARGET_FEATURE_KINDS,
  MM_PER_INCH,
} from "./ollama-vision-extract-lib.mjs";

// A realistic rich response (JM electrode print style — INCH drawing).
const RICH_INCH = JSON.stringify({
  title_block: { part_number: "068040A", title: "TAPTITE 2000 DIE", material: "D2 Tool Steel", units: "in", general_tolerance: ".005", third_angle: true },
  dimensions: [
    { type: "diameter", nominal: 1.234, unit: "in", tolerance_type: "bilateral", tolerance_upper: 0.0005, tolerance_lower: -0.0005, raw_text: "Ø1.2340 ±.0005", location_hint: "main bore", confidence: 0.95 },
    { type: "linear", nominal: 0.876, unit: "in", raw_text: ".876", confidence: 0.9 },
  ],
  gdt: [
    { symbol: "position", tolerance_value: 0.002, tolerance_unit: "in", material_condition: "MMC", datum_references: ["A", "B"], applied_to: "bore", raw_text: "POS .002 A B", confidence: 0.88 },
    { symbol: "flatness", tolerance_value: 0.001, datum_references: [], applied_to: "face", raw_text: "FLT .001", confidence: 0.7 },
  ],
  notes: [{ category: "material", text: "HARDEN TO 60-62 HRC", is_critical: true }],
  profiles: [{ name: "bore", type: "hole", is_closed: true, diameter_mm: null, corner_radii_mm: [0.5], confidence: 0.8 }],
  part_bounds_mm: { width: 50.0, height: 25.0, depth: 12.7 },
  thickness_mm: 12.7,
  surface_finishes: [{ ra_um: 0.8, location: "all machined", raw_text: "Ra 0.8" }],
  confidence: 0.9,
});

// ── buildVisionPrompt ──────────────────────────────────────────────
test("buildVisionPrompt: includes part_class hint", () => {
  assert.ok(buildVisionPrompt("electrode").includes("Part class hint: electrode"));
});
test("buildVisionPrompt: undefined part_class → 'unknown'", () => {
  assert.ok(buildVisionPrompt(null).includes("Part class hint: unknown"));
});
test("buildVisionPrompt: lists target feature kinds + custom override honored", () => {
  const p = buildVisionPrompt("die");
  for (const k of TARGET_FEATURE_KINDS) assert.ok(p.includes(k), "missing kind: " + k);
  const c = buildVisionPrompt("die", { targetKinds: ["a_custom_kind_xyz"] });
  assert.ok(c.includes("a_custom_kind_xyz"));
  assert.ok(!c.includes("ejector_pin_hole"), "custom kinds replace defaults");
});
test("buildVisionPrompt: rich contract zones all present", () => {
  const p = buildVisionPrompt("die");
  for (const zone of ["title_block", "dimensions", "gdt", "notes", "profiles", "part_bounds_mm", "thickness_mm", "surface_finishes"]) {
    assert.ok(p.includes(zone), "prompt missing rich zone: " + zone);
  }
});
test("buildVisionPrompt: instructs JSON-only, no markdown, no array wrap", () => {
  const p = buildVisionPrompt("shaft");
  assert.ok(p.includes("Return ONLY the JSON object"));
  assert.ok(/no prose, no markdown/i.test(p));
  assert.ok(/no array wrapping/i.test(p));
});
test("buildVisionPrompt: #4 FIX — does NOT instruct in-prompt unit conversion; instructs report-raw-unit", () => {
  const p = buildVisionPrompt("die");
  // The old prompt said "Convert inches to mm" — qwen2.5-VL ignored it. The rich
  // prompt must instead tell the model to report the RAW number + its unit.
  assert.ok(!/convert inch(es)? to mm/i.test(p), "must NOT instruct in-prompt inch→mm conversion");
  assert.ok(/DO NOT convert units yourself/i.test(p), "must instruct report-raw-unit");
});
test("buildVisionPrompt: wireEdm suffix appended only when requested", () => {
  assert.ok(!/WIRE EDM/.test(buildVisionPrompt("die")));
  assert.ok(/WIRE EDM/.test(buildVisionPrompt("die", { wireEdm: true })));
});

// ── normalizeUnit ──────────────────────────────────────────────────
test("normalizeUnit: inch variants → 'in'", () => {
  for (const u of ["in", "inch", "inches", "IN", '"', "imperial"]) assert.equal(normalizeUnit(u), "in", u);
});
test("normalizeUnit: mm variants → 'mm'", () => {
  for (const u of ["mm", "MM", "metric", "millimeter"]) assert.equal(normalizeUnit(u), "mm", u);
});
test("normalizeUnit: mixed → 'mixed'; unknown/null → null", () => {
  assert.equal(normalizeUnit("mixed"), "mixed");
  assert.equal(normalizeUnit("furlongs"), null);
  assert.equal(normalizeUnit(null), null);
  assert.equal(normalizeUnit(undefined), null);
});

// ── convertToMm (the #4 code-side conversion) ──────────────────────
test("convertToMm: inch → ×25.4, resolved, not assumed", () => {
  const r = convertToMm(1.234, "in");
  assert.ok(Math.abs(r.mm - 1.234 * MM_PER_INCH) < 1e-9);
  assert.equal(r.resolved, true);
  assert.equal(r.assumed, false);
  assert.equal(r.unit, "in");
});
test("convertToMm: mm → passthrough", () => {
  const r = convertToMm(25.4, "mm");
  assert.equal(r.mm, 25.4);
  assert.equal(r.resolved, true);
});
test("convertToMm: unknown unit + no fallback → UNRESOLVED (never silently assumed)", () => {
  const r = convertToMm(1.234, null);
  assert.equal(r.mm, null);
  assert.equal(r.resolved, false);
  assert.equal(r.unit, "unknown");
});
test("convertToMm: unknown unit + assumeUnits=in → converted + flagged assumed", () => {
  const r = convertToMm(1.0, null, "in");
  assert.ok(Math.abs(r.mm - 25.4) < 1e-9);
  assert.equal(r.resolved, true);
  assert.equal(r.assumed, true);
});
test("convertToMm: NaN/Infinity value → unresolved (adversarial)", () => {
  assert.equal(convertToMm(NaN, "in").resolved, false);
  assert.equal(convertToMm(Infinity, "mm").resolved, false);
  assert.equal(convertToMm("garbage", "in").resolved, false);
});

// ── parseVisionResponse: rich happy path ───────────────────────────
test("parse: rich INCH response — all zones extracted + dims converted to mm", () => {
  const r = parseVisionResponse(RICH_INCH);
  assert.equal(r.success, true);
  const e = r.extraction;
  assert.equal(e.units, "in");
  assert.equal(e.title_block.part_number, "068040A");
  assert.equal(e.title_block.material, "D2 Tool Steel");
  // dimension 0: 1.234 in → 31.3436 mm
  assert.ok(Math.abs(e.dimensions[0].nominal_mm - 1.234 * 25.4) < 1e-6);
  assert.equal(e.dimensions[0].unit_resolved, true);
  assert.equal(e.dimensions[0].type, "diameter");
  // tolerance converted to mm too
  assert.ok(Math.abs(e.dimensions[0].tolerance_mm.upper - 0.0005 * 25.4) < 1e-6);
  // backward-compat aliases
  assert.equal(e.dimensions[0].kind, "diameter");
  assert.ok(Math.abs(e.dimensions[0].nominal - 1.234 * 25.4) < 1e-6);
  // other zones
  assert.equal(e.gdt.length, 2);
  assert.equal(e.notes[0].is_critical, true);
  assert.equal(e.profiles[0].type, "hole");
  assert.equal(e.thickness_mm, 12.7);
  assert.equal(e.surface_finishes[0].ra_um, 0.8);
  assert.equal(e.part_bounds_mm.width, 50.0);
  assert.equal(e.source, "ollama-vision");
});
test("parse: GD&T datum-deficient FCF is FLAGGED, not dropped (doctrine)", () => {
  const e = parseVisionResponse(RICH_INCH).extraction;
  const flatness = e.gdt.find((g) => g.symbol === "flatness");
  assert.equal(flatness.datum_deficient, true, "FCF with empty datum_references must flag datum_deficient");
  const pos = e.gdt.find((g) => g.symbol === "position");
  assert.equal(pos.datum_deficient, false);
  assert.deepEqual(pos.datum_references, ["A", "B"]);
});

// ── parseVisionResponse: leading-dot decimal repair (regression 2026-06-04) ───────
test("parse: leading-dot decimals `.171` are repaired, not discarded (whole-extraction-loss bug)", () => {
  // OBSERVED LIVE: qwen2.5vl:7b emitted `"nominal": .171` (engineering notation, no leading
  // zero) → JSON.parse threw → the ENTIRE print's dims were lost. The repair inserts the zero
  // in value position so the extraction survives.
  const raw = '{ "title_block": { "units": "in" }, "dimensions": [ { "type": "diameter", "nominal": .171, "unit": "in", "tolerance_upper": .0005, "tolerance_lower": -.0005, "confidence": .9, "raw_text": "dia .171" } ] }';
  const r = parseVisionResponse(raw);
  assert.equal(r.success, true, "leading-dot response must parse, not fail");
  const d = r.extraction.dimensions[0];
  assert.ok(Math.abs(d.nominal_mm - 0.171 * 25.4) < 1e-6);  // .171 in → 4.3434 mm
  assert.equal(d.unit_resolved, true);
  assert.equal(d.confidence, 0.9);                           // .9 → 0.9
  assert.ok(Math.abs(d.tolerance_mm.upper - 0.0005 * 25.4) < 1e-6);
  assert.ok(Math.abs(d.tolerance_mm.lower - (-0.0005) * 25.4) < 1e-6); // -.0005 → -0.0005
});
test("parse: leading-dot repair does NOT corrupt a quoted string value containing a dot-number", () => {
  // The string-aware scanner must leave string CONTENTS untouched, INCLUDING the adversarial
  // case where a structural char (:/,/[) sits immediately before the dot INSIDE the string
  // (`"SCALE 1:.5"`, `"x[.5]"`) — a naive value-position regex corrupts those.
  const raw = '{ "title_block": { "units": "in", "general_tolerance": ".005", "scale": "1:.5", "title": "x[.5] y,.6" }, "dimensions": [ { "type": "linear", "nominal": 2.5, "unit": "in", "raw_text": "note .250 ref" } ] }';
  const r = parseVisionResponse(raw);
  assert.equal(r.success, true);
  assert.equal(r.extraction.title_block.general_tolerance, ".005");   // string value preserved verbatim
  assert.equal(r.extraction.title_block.scale, "1:.5");               // struct-char-before-dot inside string preserved
  assert.equal(r.extraction.title_block.title, "x[.5] y,.6");         // bracket/comma before dot inside string preserved
  assert.equal(r.extraction.dimensions[0].raw_text, "note .250 ref"); // space-preceded interior preserved
  assert.ok(Math.abs(r.extraction.dimensions[0].nominal_mm - 2.5 * 25.4) < 1e-6); // normal decimal untouched
});
test("repairLeadingDotDecimals: string-aware — fixes value positions, preserves string interiors", () => {
  // value positions (outside strings) → repaired
  assert.equal(repairLeadingDotDecimals('{"n": .171}'), '{"n": 0.171}');
  assert.equal(repairLeadingDotDecimals('[.5, .6, -.7]'), '[0.5, 0.6, -0.7]');
  assert.equal(repairLeadingDotDecimals('{"n":-.5}'), '{"n":-0.5}');
  // normal decimals + malformations → unchanged
  assert.equal(repairLeadingDotDecimals('{"n": 1.5}'), '{"n": 1.5}');
  assert.equal(repairLeadingDotDecimals('{"n": 0.95}'), '{"n": 0.95}');
  assert.equal(repairLeadingDotDecimals('{"n": ..5}'), '{"n": ..5}');   // double-dot left for loud failure
  // string interiors with a structural char immediately before the dot → PRESERVED (the P2 fix)
  assert.equal(repairLeadingDotDecimals('{"t":"SCALE 1:.5"}'), '{"t":"SCALE 1:.5"}');
  assert.equal(repairLeadingDotDecimals('{"t":"a,.5 b[.6]"}'), '{"t":"a,.5 b[.6]"}');
  // escaped quote inside string does not prematurely end the string
  assert.equal(repairLeadingDotDecimals('{"t":"q\\":.5"}'), '{"t":"q\\":.5"}');
  // empty / dotless fast path
  assert.equal(repairLeadingDotDecimals(""), "");
  assert.equal(repairLeadingDotDecimals('{"a":1}'), '{"a":1}');
});

test("repairLeadingDotDecimals: strips forbidden value-position leading '+' (±tolerance notation)", () => {
  // OBSERVED LIVE 2026-06-06 (qwen2.5vl:7b): `"tolerance_upper": +0.015` — JSON allows a
  // leading '-' but NEVER a leading '+'. Strip it; keep '-' as-is.
  assert.equal(repairLeadingDotDecimals('{"u": +0.015}'), '{"u": 0.015}');
  assert.equal(repairLeadingDotDecimals('{"u":+0.015}'), '{"u":0.015}');
  assert.equal(repairLeadingDotDecimals('{"u": -0.015}'), '{"u": -0.015}');   // '-' preserved
  assert.equal(repairLeadingDotDecimals('[+1, +2, +3]'), '[1, 2, 3]');
  // '+.' combo → strip '+' AND add the leading zero
  assert.equal(repairLeadingDotDecimals('{"u": +.015}'), '{"u": 0.015}');
  // exponent '+' is NOT value-position (prev = 'e') → preserved so JSON.parse keeps the number
  assert.equal(repairLeadingDotDecimals('{"n": 1.5e+3}'), '{"n": 1.5e+3}');
  // '+' inside a string (a raw_text like "Ø86 +0.015") → preserved verbatim
  assert.equal(repairLeadingDotDecimals('{"t":"Ø86 +0.015 -0.015"}'), '{"t":"Ø86 +0.015 -0.015"}');
  // round-trips through JSON.parse after repair
  assert.deepEqual(JSON.parse(repairLeadingDotDecimals('{"tolerance_upper": +0.015, "tolerance_lower": -0.015}')),
    { tolerance_upper: 0.015, tolerance_lower: -0.015 });
});

test("parse: response with value-position '+0.015' tolerances extracts (not discarded)", () => {
  const raw = '{ "title_block": { "units": "in" }, "dimensions": [ ' +
    '{ "type": "diameter", "nominal": .86, "unit": "in", "tolerance_upper": +0.015, "tolerance_lower": -0.015, "raw_text": "Ø86 +0.015 -0.015" } ] }';
  const r = parseVisionResponse(raw);
  assert.equal(r.success, true, "leading-'+' tolerance response must parse, not fail-all");
  assert.equal(r.extraction.dimensions.length, 1);
  assert.ok(Math.abs(r.extraction.dimensions[0].nominal_mm - 0.86 * 25.4) < 1e-6);
});

// ── parseVisionResponse: TRUNCATION × leading-dot composition (regression 2026-06-06) ───
test("parse: truncated response with an earlier leading-dot value recovers dims (not all-lost)", () => {
  // OBSERVED LIVE 2026-06-06 (qwen2.5vl:7b on extrude_punch.png, num_predict cap): the rich
  // JSON got truncated mid-`raw_text` AND carried an earlier `"nominal": .86`. The line-307
  // leading-dot pass BAILS on the unterminated trailing string (its fail-safe return), so
  // `.86` survived; truncation-repair then closed the braces but NOT the notation → the
  // ENTIRE extraction was discarded ("ensemble all-failed"). Fix = truncation-repair (which
  // now closes the trailing string) THEN leading-dot repair → both dims recover.
  const raw = '{ "title_block": { "units": "in" }, "dimensions": [ ' +
    '{ "type": "diameter", "nominal": .86, "unit": "in", "raw_text": "dia .86" }, ' +
    '{ "type": "linear", "nominal": 1.25, "unit": "in", "raw_text": "len 1.25 long note cut off mid-stri';
  const r = parseVisionResponse(raw);
  assert.equal(r.success, true, "truncated+leading-dot response must recover, not fail-all");
  assert.equal(r.extraction.dimensions.length, 2, "both dims before/at the cut recovered");
  assert.ok(Math.abs(r.extraction.dimensions[0].nominal_mm - 0.86 * 25.4) < 1e-6, ".86 in → 21.844 mm");
  assert.ok(Math.abs(r.extraction.dimensions[1].nominal_mm - 1.25 * 25.4) < 1e-6);
});

test("repairTruncatedJson: closes an unterminated TRAILING string before the brackets", () => {
  // object truncated mid-value-string → close string + brace → valid, value salvaged
  const out = repairTruncatedJson('{"a":1,"b":"partial val cut');
  assert.ok(out, "must produce a repair");
  const parsed = JSON.parse(out); // must be valid JSON now
  assert.equal(parsed.a, 1);
  assert.equal(typeof parsed.b, "string");
  // nested: dimensions array truncated mid-string in the 2nd object → outer object closes
  const out2 = repairTruncatedJson('{"dimensions":[{"n":1},{"n":2,"t":"cut here');
  assert.ok(out2);
  const p2 = JSON.parse(out2);
  assert.ok(Array.isArray(p2.dimensions) && p2.dimensions.length === 2);
  assert.equal(p2.dimensions[1].n, 2);
});

test("repairTruncatedJson: drops a dangling trailing escape so the close quote terminates (P1)", () => {
  // truncation landed mid-string right after a backslash (Windows path / escaped quote in
  // raw_text). The lone `\` would escape our closing `"`, leaving the string open → all lost.
  const out = repairTruncatedJson('{"a":1,"path":"C:\\'); // JS source `\\` = one backslash
  assert.ok(out, "must repair a dangling-escape truncation");
  const p = JSON.parse(out); // must be VALID JSON now
  assert.equal(p.a, 1);
  assert.equal(typeof p.path, "string");
  // and through the full parser, an earlier complete dim must survive the dangling-escape cut
  const raw = '{ "title_block": { "units": "in" }, "dimensions": [ ' +
    '{ "type": "linear", "nominal": 0.5, "unit": "in", "raw_text": "len" }, ' +
    '{ "type": "linear", "nominal": 1.0, "unit": "in", "raw_text": "C:\\'; // truncated on a lone backslash
  const r = parseVisionResponse(raw);
  assert.equal(r.success, true, "dangling-escape truncation must recover prior dims, not fail-all");
  assert.ok(r.extraction.dimensions.length >= 1, "the complete dim before the cut survives");
});

test("parse: truncation mid-KEY fails LOUD (no fabricated extraction) — R12", () => {
  // A cut in the middle of a KEY name cannot be safely recovered; the gate must
  // return success:false, never invent a dimension. (Common case is mid-VALUE, handled above.)
  const raw = '{ "dimensions": [ { "type": "diameter", "nominal": 0.5 }, { "ty';
  const r = parseVisionResponse(raw);
  assert.equal(r.success, false, "mid-key truncation must fail loud, not fabricate");
  assert.equal(r.extraction, null);
});

// ── parseVisionResponse: unit-resolution matrix (#4) ───────────────
test("parse: dim with its own unit overrides drawing units", () => {
  const raw = JSON.stringify({ title_block: { units: "mm" }, dimensions: [{ type: "linear", nominal: 2.0, unit: "in", raw_text: "2.000" }] });
  const e = parseVisionResponse(raw).extraction;
  assert.ok(Math.abs(e.dimensions[0].nominal_mm - 50.8) < 1e-6, "per-dim 'in' wins over drawing 'mm'");
});
test("parse: dim with no unit falls back to drawing units", () => {
  const raw = JSON.stringify({ title_block: { units: "in" }, dimensions: [{ type: "linear", nominal: 1.0, raw_text: "1.000" }] });
  const e = parseVisionResponse(raw).extraction;
  assert.ok(Math.abs(e.dimensions[0].nominal_mm - 25.4) < 1e-6);
  assert.equal(e.dimensions[0].unit_resolved, true);
});
test("parse: NO unit anywhere → UNRESOLVED, nominal kept raw, flagged (R12 — never silently mm)", () => {
  const raw = JSON.stringify({ title_block: {}, dimensions: [{ type: "linear", nominal: 1.234, raw_text: "1.234" }] });
  const e = parseVisionResponse(raw).extraction;
  assert.equal(e.dimensions[0].unit_resolved, false);
  assert.equal(e.dimensions[0].nominal_mm, null);
  assert.equal(e.dimensions[0].nominal, 1.234, "back-compat nominal falls back to raw when unit unknown");
  assert.equal(e.unit_resolution.dimensions_unit_resolved, 0);
});
test("parse: assumeUnits caller fallback converts unresolved dims + flags assumed", () => {
  const raw = JSON.stringify({ title_block: {}, dimensions: [{ type: "linear", nominal: 1.0, raw_text: "1.000" }] });
  const e = parseVisionResponse(raw, { assumeUnits: "in" }).extraction;
  assert.ok(Math.abs(e.dimensions[0].nominal_mm - 25.4) < 1e-6);
  assert.equal(e.dimensions[0].unit_assumed, true);
  assert.equal(e.unit_resolution.assume_units, "in");
});

// ── parseVisionResponse: confidence + robustness ───────────────────
test("parse: overall confidence clamps + defaults to 0.5", () => {
  assert.equal(parseVisionResponse('{"dimensions":[]}').extraction.confidence, 0.5);
  assert.equal(parseVisionResponse('{"confidence":2.5,"dimensions":[]}').extraction.confidence, 1);
  assert.equal(parseVisionResponse('{"confidence":-0.3,"dimensions":[]}').extraction.confidence, 0);
});
test("parse: per-field dimension confidence clamped", () => {
  const raw = JSON.stringify({ title_block: { units: "mm" }, dimensions: [{ type: "linear", nominal: 1, unit: "mm", confidence: 5 }] });
  assert.equal(parseVisionResponse(raw).extraction.dimensions[0].confidence, 1);
});
test("parse: markdown code-fence stripped", () => {
  const raw = "Here:\n```json\n" + RICH_INCH + "\n```\ndone";
  assert.equal(parseVisionResponse(raw).success, true);
});
test("parse: prose preamble + JSON suffix", () => {
  const r = parseVisionResponse("I see this drawing: " + RICH_INCH);
  assert.equal(r.success, true);
  assert.equal(r.extraction.title_block.part_number, "068040A");
});
test("parse: dimension with no signal (no type/nominal/raw_text) dropped", () => {
  const raw = JSON.stringify({ title_block: { units: "mm" }, dimensions: [{ confidence: 0.5 }, { type: "linear", nominal: 1, unit: "mm" }] });
  assert.equal(parseVisionResponse(raw).extraction.dimensions.length, 1);
});

// ── failure modes ──────────────────────────────────────────────────
test("parse: empty / null / non-string → error", () => {
  assert.equal(parseVisionResponse("").success, false);
  assert.equal(parseVisionResponse(null).success, false);
  assert.equal(parseVisionResponse(123).success, false);
});
test("parse: no JSON object in response → error", () => {
  const r = parseVisionResponse("This drawing shows a hole and a chamfer.");
  assert.equal(r.success, false);
  assert.ok(r.error.includes("no JSON"));
});
test("parse: malformed unrepairable JSON → error string (R12 never silent)", () => {
  const r = parseVisionResponse("{ this : is : not : json : ");
  assert.equal(r.success, false);
  assert.ok(typeof r.error === "string" && r.error.length > 0);
});
test("R12: every error path carries a non-empty error string", () => {
  for (const c of ["", null, undefined, "no json", 42]) {
    const r = parseVisionResponse(c);
    assert.equal(r.success, false);
    assert.ok(typeof r.error === "string" && r.error.length > 0, "missing error for " + JSON.stringify(c));
  }
});

// ── adversarial ────────────────────────────────────────────────────
test("parse: ADVERSARIAL huge dimension list (10k) doesn't crash", () => {
  const dims = [];
  for (let i = 0; i < 10000; i++) dims.push({ type: "linear", nominal: i * 0.1, unit: "mm", raw_text: "d" + i });
  const r = parseVisionResponse(JSON.stringify({ title_block: { units: "mm" }, dimensions: dims }));
  assert.equal(r.success, true);
  assert.equal(r.extraction.dimensions.length, 10000);
});
test("parse: ADVERSARIAL dim with non-finite nominal → kept by raw_text, nominal_raw null", () => {
  const raw = '{"title_block":{"units":"in"},"dimensions":[{"type":"linear","nominal":"NaN","unit":"in","raw_text":"unreadable"}]}';
  const e = parseVisionResponse(raw).extraction;
  assert.equal(e.dimensions.length, 1);
  assert.equal(e.dimensions[0].nominal_raw, null);
  assert.equal(e.dimensions[0].raw_text, "unreadable");
});
test("parse: ADVERSARIAL array-wrapped object recovered (small VLMs wrap in [])", () => {
  const r = parseVisionResponse("[" + RICH_INCH + "]");
  assert.equal(r.success, true);
  assert.equal(r.extraction.title_block.part_number, "068040A");
});
test("parse: ADVERSARIAL truncated dense response repaired", () => {
  // cut the RICH_INCH mid-way through the dimensions array
  const cut = RICH_INCH.slice(0, RICH_INCH.indexOf('"gdt"') - 2);
  const r = parseVisionResponse(cut);
  assert.equal(r.success, true, "truncated response should repair");
  assert.ok(r.extraction.dimensions.length >= 1);
});
test("parse: placeholder echoes (<mm>, 0.0-1.0) sanitized", () => {
  const raw = '{"confidence":0.0-1.0,"title_block":{"units":"mm"},"dimensions":[{"type":"linear","nominal":<mm>,"unit":"mm","raw_text":"x"}]}';
  const r = parseVisionResponse(raw);
  assert.equal(r.success, true);
  assert.equal(r.extraction.confidence, 0.5);
});

// ── variability: ≥3 spanning unit/zone configs ─────────────────────
test("parse: VARIABILITY — pure mm drawing, no conversion", () => {
  const raw = JSON.stringify({ title_block: { units: "mm" }, dimensions: [{ type: "diameter", nominal: 32, unit: "mm", raw_text: "Ø32" }] });
  const e = parseVisionResponse(raw).extraction;
  assert.equal(e.dimensions[0].nominal_mm, 32);
});
test("parse: VARIABILITY — mixed-units drawing → per-dim unit governs each", () => {
  const raw = JSON.stringify({ title_block: { units: "mixed" }, dimensions: [
    { type: "linear", nominal: 1.0, unit: "in", raw_text: "1.000\"" },
    { type: "linear", nominal: 10, unit: "mm", raw_text: "10mm" },
  ] });
  const e = parseVisionResponse(raw).extraction;
  assert.ok(Math.abs(e.dimensions[0].nominal_mm - 25.4) < 1e-6);
  assert.equal(e.dimensions[1].nominal_mm, 10);
});
test("parse: VARIABILITY — empty drawing (all zones absent) → success with empty arrays", () => {
  const e = parseVisionResponse("{}").extraction;
  assert.equal(e.dimensions.length, 0);
  assert.equal(e.gdt.length, 0);
  assert.equal(e.units, null);
  assert.equal(e.confidence, 0.5);
});

// ── buildOllamaRequestBody ─────────────────────────────────────────
test("requestBody: default model qwen3-vl:8b-instruct", () => {
  assert.equal(buildOllamaRequestBody("p", "i").model, "qwen3-vl:8b-instruct");
});
test("requestBody: caps num_ctx 8192 + num_predict 4096", () => {
  const b = buildOllamaRequestBody("p", "i");
  assert.equal(b.options.num_ctx, 8192);
  assert.equal(b.options.num_predict, 4096);
});
test("requestBody: think:false by default (suppress qwen3-vl reasoning chain → direct JSON)", () => {
  assert.equal(buildOllamaRequestBody("p", "i").think, false);
});
test("requestBody: caller can re-enable thinking via opts.think", () => {
  assert.equal(buildOllamaRequestBody("p", "i", { think: true }).think, true);
});
test("requestBody: caller overrides num_ctx via modelOptions (spread order)", () => {
  assert.equal(buildOllamaRequestBody("p", "i", { modelOptions: { num_ctx: 4096 } }).options.num_ctx, 4096);
});
test("requestBody: stream=false, low temp, single-image array", () => {
  const b = buildOllamaRequestBody("p", "MYB64");
  assert.equal(b.stream, false);
  assert.ok(b.options.temperature <= 0.2);
  assert.equal(b.images.length, 1);
  assert.equal(b.images[0], "MYB64");
});
test("requestBody: custom model honored", () => {
  assert.equal(buildOllamaRequestBody("p", "i", { model: "llama3.2-vision:11b" }).model, "llama3.2-vision:11b");
});

// ── repairTruncatedJson (preserved robustness) ─────────────────────
test("repair: complete JSON returned as-is", () => {
  assert.equal(repairTruncatedJson('{"a":1,"b":2}'), '{"a":1,"b":2}');
});
test("repair: truncated object closed with matching braces", () => {
  assert.equal(repairTruncatedJson('{"a":1,"b":{"c":2'), '{"a":1,"b":{"c":2}}');
});
test("repair: truncated array closed at last complete child", () => {
  assert.equal(repairTruncatedJson('[{"a":1},{"b":2},{"c":'), '[{"a":1},{"b":2}]');
});
test("repair: strings with brackets + escaped quotes don't false-split", () => {
  assert.equal(repairTruncatedJson('[{"a":"has [x] in"},{"b":'), '[{"a":"has [x] in"}]');
  assert.equal(repairTruncatedJson('[{"a":"with \\"q\\""},{"b":'), '[{"a":"with \\"q\\""}]');
});
test("repair: empty/tiny/non-string → null", () => {
  assert.equal(repairTruncatedJson(""), null);
  assert.equal(repairTruncatedJson("a"), null);
  assert.equal(repairTruncatedJson(null), null);
});

// ── constants ──────────────────────────────────────────────────────
test("constants: MM_PER_INCH = 25.4; DEFAULT_VISION_MODEL = qwen3-vl:8b-instruct", () => {
  assert.equal(MM_PER_INCH, 25.4);
  assert.equal(DEFAULT_VISION_MODEL, "qwen3-vl:8b-instruct");
});
test("constants: TARGET_FEATURE_KINDS frozen + has canonical kinds", () => {
  assert.ok(Object.isFrozen(TARGET_FEATURE_KINDS));
  assert.ok(TARGET_FEATURE_KINDS.includes("central_oil_hole"));
  assert.ok(TARGET_FEATURE_KINDS.length >= 10);
});
