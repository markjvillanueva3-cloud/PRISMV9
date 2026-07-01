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
  salvageTruncatedJson,
  repairLeadingDotDecimals,
  normalizeUnit,
  convertToMm,
  normalizeSurfaceFinish,
  normalizeThreadCallout,
  normalizeChamferCallout,
  normalizeGdtSymbol,
  resolvePageTitleBlockUnit,
  pageForceUnit,
  ISO_N_GRADE_RA_UM,
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
test("buildVisionPrompt: STEPPED-BORE FIX -- captures far-side smaller IDs + lead-in chamfers (operator 2026-06-16)", () => {
  // Operator found the VLM missed the smaller far-side ID + the lead-in chamfer on a stepped bore.
  // The prompt must now direct multi-diameter bore capture AND keep the anti-hallucination guard.
  const p = buildVisionPrompt("bushing");
  assert.ok(/MORE THAN ONE DIAMETER/.test(p), "must instruct multi-diameter bore capture");
  assert.ok(/FAR \/ OPPOSITE side|smaller far-side ID|SMALLER diameter on the FAR/i.test(p), "must name the far-side smaller ID");
  assert.ok(/LEAD-IN|TRANSITION/i.test(p) && /CHAMFER/i.test(p), "must instruct lead-in/transition chamfer capture");
  assert.ok(/Anti-hallucination guard|ACTUALLY shown|do not invent/i.test(p), "must keep the anti-hallucination guard");
});
test("buildVisionPrompt: P1.4 GD&T FCF-grammar guidance (ASME Y14.5 frame order + form-vs-datum rule)", () => {
  // The thin "identify the symbol and datums" instruction is replaced with the structured FCF grammar so
  // the VLM reads frames in the fixed ASME Y14.5 order and applies the form-vs-location datum rule.
  const p = buildVisionPrompt("die");
  assert.ok(/FEATURE CONTROL FRAMES read LEFT-TO-RIGHT|fixed ASME Y14.5 order/i.test(p), "must give the FCF left-to-right order");
  assert.ok(/MMC/.test(p) && /LMC/.test(p) && /RFS/.test(p), "must name the material modifiers (MMC/LMC/RFS)");
  assert.ok(/primary\|secondary\|tertiary|IN THAT ORDER/i.test(p), "must direct datum order (primary..tertiary)");
  assert.ok(/FORM tolerances.*NO datum|take NO datum/is.test(p), "must state form tolerances take no datum");
  assert.ok(/REQUIRE at least one datum/i.test(p), "must state location/orientation/runout require a datum");
  assert.ok(/do NOT invent a datum/i.test(p), "must keep the no-fabrication guard (R12)");
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
test("parse: GD&T datum-deficiency is SYMBOL-AWARE (ASME Y14.5 §8.2)", () => {
  const e = parseVisionResponse(RICH_INCH).extraction;
  // flatness is a FORM tolerance -- zero datums is CORRECT (must NOT reference datums), so it
  // is NOT deficient. (Pre-fix this falsely flagged every form frame as datum-deficient.)
  const flatness = e.gdt.find((g) => g.symbol === "flatness");
  assert.equal(flatness.datum_deficient, false, "form tolerance with no datum is valid, not deficient");
  const pos = e.gdt.find((g) => g.symbol === "position");
  assert.equal(pos.datum_deficient, false);
  assert.deepEqual(pos.datum_references, ["A", "B"]);
});

test("parse: a datum-REQUIRING control with no datum IS flagged (location/orientation/runout)", () => {
  const raw = JSON.stringify({
    title_block: { units: "mm" },
    dimensions: [{ type: "linear", nominal: 10, unit: "mm", raw_text: "10" }],
    gdt: [
      { symbol: "position", tolerance_value: 0.05, datum_references: [], raw_text: "TP 0.05" },
      { symbol: "perpendicularity", tolerance_value: 0.02, datum_references: [], raw_text: "PERP 0.02" },
      { symbol: "circular_runout", tolerance_value: 0.03, datum_references: [], raw_text: "RUN 0.03" },
      { symbol: "flatness", tolerance_value: 0.01, datum_references: [], raw_text: "FLT 0.01" },
      { symbol: "profile_surface", tolerance_value: 0.1, datum_references: [], raw_text: "PROF 0.1" },
      { symbol: "position", tolerance_value: 0.05, datum_references: ["A"], raw_text: "TP 0.05 A" },
    ],
  });
  const e = parseVisionResponse(raw).extraction;
  const by = (s) => e.gdt.filter((g) => g.symbol === s);
  assert.equal(by("position")[0].datum_deficient, true, "position w/o datum is deficient");
  assert.equal(by("perpendicularity")[0].datum_deficient, true, "orientation w/o datum is deficient");
  assert.equal(by("circular_runout")[0].datum_deficient, true, "runout w/o datum is deficient");
  assert.equal(by("flatness")[0].datum_deficient, false, "form w/o datum is NOT deficient");
  assert.equal(by("profile_surface")[0].datum_deficient, false, "datum-less profile is form-only, not deficient");
  assert.equal(by("position")[1].datum_deficient, false, "position WITH a datum is fine");
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

test("parse: truncation mid-KEY recovers complete dims before the cut, never fabricates the partial -- R12 (U-XRAY-TRUNCATION-KEYCUT)", () => {
  // SUPERSEDES the prior "fail-loud-entirely" doctrine. A cut in the middle of a KEY name drops the
  // INCOMPLETE trailing fragment but RECOVERS every COMPLETE dim before it -- that is salvage of real,
  // byte-for-byte data, NOT fabrication. The live finding (2026-06-23): dense JM prints cut mid-key were
  // losing ALL ~30 already-read dims to a total parse fail (tier-1 closed the dangling key into invalid
  // JSON). Anti-fabrication intent PRESERVED + strengthened: the partial `{ "ty` is DROPPED (never invented
  // into a 2nd dimension), and only the complete dim survives.
  const raw = '{ "dimensions": [ { "type": "diameter", "nominal": 0.5, "unit": "in", "raw_text": "0.500" }, { "ty';
  const r = parseVisionResponse(raw);
  assert.equal(r.success, true, "mid-key cut recovers the complete dim before it (was a total loss)");
  assert.equal(r.extraction.dimensions.length, 1, "exactly ONE dim -- the partial fragment is dropped, NOT fabricated into a 2nd entry");
  assert.equal(r.extraction.dimensions[0].type, "diameter", "the recovered dim is the real complete one");
  assert.ok(Math.abs(r.extraction.dimensions[0].nominal_mm - 12.7) < 1e-6, "the real value (0.5in = 12.7mm) is recovered, not invented");
});

// -- salvageTruncatedJson: tier-2 repair for KEY-position cuts (U-XRAY-TRUNCATION-KEYCUT) --
test("salvageTruncatedJson: a cut on a NEW key (`, \"`) recovers all complete props of the last dim", () => {
  // the exact live failure shape: cut right after the comma + opening quote of the next key
  const raw = '{"dimensions":[{"type":"linear","nominal":1.0},{"type":"linear","nominal":3.85,"tolerance_upper":-0.001, "';
  const out = salvageTruncatedJson(raw);
  const p = JSON.parse(out); // must be valid now (tier-1 left it `, ""}` = invalid)
  assert.equal(p.dimensions.length, 2, "both dims recovered");
  assert.equal(p.dimensions[1].nominal, 3.85, "the last dim keeps every COMPLETE property before the cut");
  assert.equal(p.dimensions[1].tolerance_upper, -0.001);
});

test("salvageTruncatedJson: a freshly-opened object with NO complete prop is DROPPED, not emitted as {}", () => {
  const out = salvageTruncatedJson('{"dimensions":[{"n":1},{"ty');
  const p = JSON.parse(out);
  assert.equal(p.dimensions.length, 1, "the empty partial dim is dropped (no junk {})");
  assert.equal(p.dimensions[0].n, 1);
});

test("salvageTruncatedJson: dangling trailing comma + `key:` with no value both trim to the last complete prop", () => {
  assert.deepEqual(JSON.parse(salvageTruncatedJson('{"dimensions":[{"n":1},{"n":2},')), { dimensions: [{ n: 1 }, { n: 2 }] });
  assert.deepEqual(JSON.parse(salvageTruncatedJson('{"a":1,"b":')), { a: 1 });
  assert.deepEqual(JSON.parse(salvageTruncatedJson('{"a":1,"partialkey')), { a: 1 });
});

test("salvageTruncatedJson: nested object cut keeps the complete inner prop", () => {
  assert.deepEqual(JSON.parse(salvageTruncatedJson('{"x":{"y":1,"z')), { x: { y: 1 } });
});

test("salvageTruncatedJson: complete JSON passes through unchanged; junk + zero-recovery -> null", () => {
  assert.equal(salvageTruncatedJson('{"a":1}'), '{"a":1}', "already-complete JSON is returned as-is");
  assert.equal(salvageTruncatedJson("x"), null, "too-short / non-JSON -> null");
  assert.equal(salvageTruncatedJson(42), null, "non-string -> null");
  // cut before ANY complete value -> null so the caller fails loud (re-OCR), not a banked empty {}
  assert.equal(salvageTruncatedJson('{"dimensions":[{"ty'), null, "zero complete values -> null (fail loud)");
});

test("salvageTruncatedJson: array root truncated mid-element recovers prior elements", () => {
  assert.deepEqual(JSON.parse(salvageTruncatedJson('[{"n":1},{"n":2},{"n')), [{ n: 1 }, { n: 2 }]);
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
test("requestBody: PRISM_OCR_NUM_PREDICT raises num_predict + AUTO-COUPLES num_ctx; unset is byte-identical (U-XRAY-NUM-PREDICT-TUNABLE)", () => {
  const o1 = process.env.PRISM_OCR_NUM_PREDICT, o2 = process.env.PRISM_OCR_NUM_CTX;
  try {
    delete process.env.PRISM_OCR_NUM_PREDICT; delete process.env.PRISM_OCR_NUM_CTX;
    const d = buildOllamaRequestBody("p", "i").options;
    assert.equal(d.num_predict, 4096, "unset -> default 4096");
    assert.equal(d.num_ctx, 8192, "unset -> default 8192 (byte-identical to the prior fixed body)");
    process.env.PRISM_OCR_NUM_PREDICT = "8192";
    const r = buildOllamaRequestBody("p", "i").options;
    assert.equal(r.num_predict, 8192, "env raises the output cap");
    assert.equal(r.num_ctx, 16384, "num_ctx auto-couples to 2x num_predict so the larger output fits (no overflow)");
    process.env.PRISM_OCR_NUM_CTX = "20000";
    assert.equal(buildOllamaRequestBody("p", "i").options.num_ctx, 20000, "explicit PRISM_OCR_NUM_CTX overrides the coupling");
    assert.equal(buildOllamaRequestBody("p", "i", { modelOptions: { num_predict: 4096 } }).options.num_predict, 4096, "modelOptions still wins over env (spread last)");
    process.env.PRISM_OCR_NUM_PREDICT = "0";
    assert.equal(buildOllamaRequestBody("p", "i").options.num_predict, 4096, "non-positive env -> default (guarded)");
  } finally {
    if (o1 === undefined) delete process.env.PRISM_OCR_NUM_PREDICT; else process.env.PRISM_OCR_NUM_PREDICT = o1;
    if (o2 === undefined) delete process.env.PRISM_OCR_NUM_CTX; else process.env.PRISM_OCR_NUM_CTX = o2;
  }
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
test("requestBody: keep_alive UNDEFINED by default → JSON.stringify drops it → Ollama 5min default (non-training callers unchanged)", () => {
  const saved = process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE;
  delete process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE;
  try {
    const b = buildOllamaRequestBody("p", "i");
    assert.equal(b.keep_alive, undefined);
    assert.ok(!("keep_alive" in JSON.parse(JSON.stringify(b))), "undefined keep_alive must not survive serialization");
  } finally {
    if (saved === undefined) delete process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE; else process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE = saved;
  }
});
test("requestBody: keep_alive from PRISM_OLLAMA_VISION_KEEP_ALIVE env (the corpus-train wrapper's lever)", () => {
  const saved = process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE;
  process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE = "15m";
  try {
    assert.equal(buildOllamaRequestBody("p", "i").keep_alive, "15m");
  } finally {
    if (saved === undefined) delete process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE; else process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE = saved;
  }
});
test("requestBody: opts.keepAlive overrides the env (caller precedence)", () => {
  const saved = process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE;
  process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE = "15m";
  try {
    assert.equal(buildOllamaRequestBody("p", "i", { keepAlive: -1 }).keep_alive, -1);
  } finally {
    if (saved === undefined) delete process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE; else process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE = saved;
  }
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

// ── normalizeSurfaceFinish (U-XRAY-SURFACE-FINISH-NORMALIZE) ──────────
// Recovers surface-finish callouts the VLM emits as TEXT into a canonical Ra (um).
// Micron signs are built via fromCharCode to keep this source pure ASCII while still
// exercising both Unicode forms a VLM emits (U+00B5 MICRO SIGN, U+03BC GREEK SMALL MU).
const MU = String.fromCharCode(0xB5);
const GMU = String.fromCharCode(0x3BC);

test("normalizeSurfaceFinish: RMS treated as microinch Ra-equiv (63 RMS = 1.6002 um)", () => {
  const r = normalizeSurfaceFinish("63 RMS");
  assert.equal(r.ra_um, 1.6002);
  assert.equal(r.system, "RMS");
  assert.equal(r.resolved, true);
  assert.equal(r.assumed, false);
});
test("normalizeSurfaceFinish: explicit microinch (both micron signs) -> um", () => {
  assert.equal(normalizeSurfaceFinish("125 " + MU + "in").ra_um, 3.175);
  assert.equal(normalizeSurfaceFinish("250 " + GMU + "in").ra_um, 6.35);
  assert.equal(normalizeSurfaceFinish("32 microinch").ra_um, 0.8128);
  assert.equal(normalizeSurfaceFinish("125 " + MU + "in").system, "Ra-uin");
});
test("normalizeSurfaceFinish: explicit micrometre -> um unchanged", () => {
  assert.equal(normalizeSurfaceFinish("Ra 0.8 " + MU + "m").ra_um, 0.8);
  assert.equal(normalizeSurfaceFinish("0.8" + MU + "m").ra_um, 0.8);
  assert.equal(normalizeSurfaceFinish("1.6 micron").ra_um, 1.6);
});
test("normalizeSurfaceFinish: ISO N-grades from ISO 1302 table", () => {
  assert.equal(normalizeSurfaceFinish("N6").ra_um, 0.8);
  assert.equal(normalizeSurfaceFinish("N7").ra_um, 1.6);
  assert.equal(normalizeSurfaceFinish("N1").ra_um, 0.025);
  assert.equal(normalizeSurfaceFinish("N12").ra_um, 50);
  assert.equal(normalizeSurfaceFinish("N6").system, "ISO-N");
});
test("normalizeSurfaceFinish: bare preferred-series number disambiguated + assumed flag", () => {
  const um = normalizeSurfaceFinish("Ra 0.4");
  assert.equal(um.ra_um, 0.4);
  assert.equal(um.system, "Ra-um");
  assert.equal(um.assumed, true);
  // 32 / 63 are microinch-preferred values -> uin, NOT 32 um (the magnitude trap)
  const uin = normalizeSurfaceFinish("32");
  assert.equal(uin.ra_um, 0.8128);
  assert.equal(uin.system, "Ra-uin");
  assert.equal(uin.assumed, true);
  assert.equal(normalizeSurfaceFinish("63").ra_um, 1.6002);
});
test("normalizeSurfaceFinish: bare >50 no-unit -> microinch assumed", () => {
  const r = normalizeSurfaceFinish("100");
  assert.equal(r.ra_um, 2.54);
  assert.equal(r.system, "Ra-uin");
  assert.equal(r.assumed, true);
});
// ── failure modes: never a silent guess (R12) ──
test("normalizeSurfaceFinish: ambiguous bare number -> resolved=false, ra_um=null", () => {
  const r = normalizeSurfaceFinish("Ra 10");
  assert.equal(r.resolved, false);
  assert.equal(r.ra_um, null);
});
test("normalizeSurfaceFinish: no numeric value -> resolved=false", () => {
  assert.equal(normalizeSurfaceFinish("smooth finish").resolved, false);
  assert.equal(normalizeSurfaceFinish("smooth finish").ra_um, null);
});
test("normalizeSurfaceFinish: empty/null/undefined -> resolved=false, ra_um=null", () => {
  assert.equal(normalizeSurfaceFinish("").resolved, false);
  assert.equal(normalizeSurfaceFinish(null).ra_um, null);
  assert.equal(normalizeSurfaceFinish(undefined).resolved, false);
});
test("normalizeSurfaceFinish: invalid grade N13 not matched as N-grade", () => {
  const r = normalizeSurfaceFinish("N13");
  assert.equal(r.resolved, false);
  assert.equal(r.system, null);
});
// ── adversarial: number-anchored detection must not fire on bare words ──
test("normalizeSurfaceFinish: unit-substring words without a number never resolve", () => {
  assert.equal(normalizeSurfaceFinish("ruin").resolved, false);     // contains 'uin'
  assert.equal(normalizeSurfaceFinish("aluminum").resolved, false); // contains 'um'
});
test("normalizeSurfaceFinish: negative callout never silently resolves (R12, scrutiny P1)", () => {
  const a = normalizeSurfaceFinish("-5 " + MU + "in");
  assert.equal(a.resolved, false);
  assert.equal(a.ra_um, null);
  const b = normalizeSurfaceFinish("Ra -0.8 " + MU + "m");
  assert.equal(b.resolved, false);
  assert.equal(b.ra_um, null);
});
test("normalizeSurfaceFinish: explicit unit token wins over RMS/Rq shorthand (scrutiny P2)", () => {
  // Rq with an explicit micrometre token stays um (not microinch-scaled 25.4x down)
  assert.equal(normalizeSurfaceFinish("Rq 0.4 " + MU + "m").ra_um, 0.4);
  assert.equal(normalizeSurfaceFinish("Rq 0.4 " + MU + "m").system, "Ra-um");
  // a bare RMS number still uses the microinch convention
  assert.equal(normalizeSurfaceFinish("63 RMS").ra_um, 1.6002);
  assert.equal(normalizeSurfaceFinish("63 RMS").system, "RMS");
});
test("ISO_N_GRADE_RA_UM: frozen + full N1..N12", () => {
  assert.ok(Object.isFrozen(ISO_N_GRADE_RA_UM));
  for (let i = 1; i <= 12; i++) assert.ok(typeof ISO_N_GRADE_RA_UM["N" + i] === "number");
});
// ── wired into extractSurfaceFinish via parseVisionResponse (round-trip) ──
test("parseVisionResponse: text surface-finish callouts recovered to ra_um", () => {
  const resp = JSON.stringify({
    title_block: { units: "in" },
    surface_finishes: [
      { raw_text: "63 RMS", location: "bore" },
      { raw_text: "N6", location: "face" },
      { ra_um: 0.4, raw_text: "Ra 0.4 um", location: "datum" }, // numeric stays primary
    ],
  });
  const out = parseVisionResponse(resp);
  assert.equal(out.success, true);
  const sf = out.extraction.surface_finishes;
  assert.equal(sf[0].ra_um, 1.6002);
  assert.equal(sf[0].ra_um_source, "normalized-raw_text");
  assert.equal(sf[0].finish_system, "RMS");
  assert.equal(sf[1].ra_um, 0.8);
  assert.equal(sf[1].finish_system, "ISO-N");
  // a model-provided numeric ra_um is kept primary, not overwritten / not tagged
  assert.equal(sf[2].ra_um, 0.4);
  assert.equal(sf[2].ra_um_source, undefined);
});
test("parseVisionResponse: dimension.surface_finish_ra string callout normalized", () => {
  const resp = JSON.stringify({
    title_block: { units: "in" },
    dimensions: [
      { type: "diameter", nominal: 1.0, unit: "in", surface_finish_ra: "63 RMS", raw_text: "D1.0" },
      { type: "linear", nominal: 0.5, unit: "in", surface_finish_ra: 0.8, raw_text: "L.5" },
    ],
  });
  const out = parseVisionResponse(resp);
  assert.equal(out.extraction.dimensions[0].surface_finish_ra, 1.6002);
  assert.equal(out.extraction.dimensions[1].surface_finish_ra, 0.8);
});

// -- normalizeThreadCallout (U-XRAY-THREAD-NORMALIZE) -- canonical thread spec from an OCR callout --

test("normalizeThreadCallout: Unified inch -- fraction/decimal/screw size + series + class", () => {
  const t = normalizeThreadCallout("1/4-20 UNC-2B");
  assert.equal(t.system, "unified"); assert.equal(t.series, "UNC");
  assert.equal(t.major_dia_in, 0.25); assert.equal(t.tpi, 20); assert.equal(t.class, "2B");
  assert.equal(t.resolved, true); assert.equal(t.assumed, false);
  assert.equal(normalizeThreadCallout(".250-20 UNC").major_dia_in, 0.25);   // decimal size
  const s = normalizeThreadCallout("#10-32 UNF");                            // screw #10 -> .190 (ASME B1.1)
  assert.equal(s.major_dia_in, 0.19); assert.equal(s.tpi, 32); assert.equal(s.series, "UNF");
  assert.equal(normalizeThreadCallout("1-8 UNC").major_dia_in, 1);          // 1in major (low tpi -> inch)
  // a bare small integer with a screw-class tpi is a NUMBER screw written without '#' (live: "10-24 UNC")
  const noHash = normalizeThreadCallout("10-24 UNC");
  assert.equal(noHash.major_dia_in, 0.19, "10-24 = #10 (.190), NOT a 10-inch thread");
  assert.equal(noHash.tpi, 24);
  assert.equal(normalizeThreadCallout("6-32 UNC").major_dia_in, 0.138, "6-32 = #6 (.138)");
  const noSer = normalizeThreadCallout("3/8-16");                            // series omitted -> assumed
  assert.equal(noSer.resolved, true); assert.equal(noSer.assumed, true);
  assert.equal(noSer.major_dia_in, 0.375); assert.equal(noSer.series, "UN");
});

test("normalizeThreadCallout: metric -- explicit pitch wins, bare M6 fills ISO-261 coarse (assumed)", () => {
  const m = normalizeThreadCallout("M6x1.0");
  assert.equal(m.system, "metric"); assert.equal(m.pitch_mm, 1.0);
  assert.equal(m.major_dia_in, +(6 / 25.4).toFixed(4)); assert.equal(m.assumed, false);
  const bare = normalizeThreadCallout("M6");                                 // coarse pitch 1.0, assumed
  assert.equal(bare.pitch_mm, 1.0); assert.equal(bare.assumed, true);
  const c = normalizeThreadCallout("M10X1.5-6H");
  assert.equal(c.pitch_mm, 1.5); assert.equal(c.class, "6H");
});

test("normalizeThreadCallout: NPT pipe -- nominal size is NOT the major dia (honest null)", () => {
  const n = normalizeThreadCallout("1/4-18 NPT");
  assert.equal(n.system, "npt"); assert.equal(n.series, "NPT"); assert.equal(n.tpi, 18);
  assert.equal(n.major_dia_in, null); assert.equal(n.resolved, true);
  assert.equal(normalizeThreadCallout("1/8 NPTF").series, "NPTF");
});

test("normalizeThreadCallout: SELF-SAFE + de-garble + adversarial (R12 -- never fabricate a thread)", () => {
  assert.equal(normalizeThreadCallout("1-2").resolved, false);              // a range, not a thread
  assert.equal(normalizeThreadCallout("10-32").resolved, false);            // ambiguous (no #/series)
  // de-garble: a unicode en-dash (U+2013) is normalized -> hyphen so the thread still parses
  const dash = normalizeThreadCallout("1/4" + String.fromCharCode(0x2013) + "20 UNC");
  assert.equal(dash.resolved, true); assert.equal(dash.tpi, 20);
  assert.equal(normalizeThreadCallout("").resolved, false);
  assert.equal(normalizeThreadCallout(null).resolved, false);
  assert.equal(normalizeThreadCallout("FLAT").resolved, false);
});

test("normalizeThreadCallout: a tool-steel/hardness grade is NOT fabricated into a thread (R12, JM die shop)", () => {
  // "M2" matches the metric pattern but M2/A2/D2 are AISI tool steels -- a material, not a thread.
  assert.equal(normalizeThreadCallout("M2 STEEL").resolved, false);
  assert.equal(normalizeThreadCallout("M2 TOOL STEEL").resolved, false);
  assert.equal(normalizeThreadCallout("M42 HSS").resolved, false);
  assert.equal(normalizeThreadCallout("D2 RC60").resolved, false);
  assert.equal(normalizeThreadCallout("HARDEN TO 58 HRC").resolved, false);
  // a real metric thread with a material-free callout still resolves
  assert.equal(normalizeThreadCallout("M6x1.0").resolved, true);
  // an implausible bare-integer inch major ("14-20") is a range/part-number, not a 14in thread
  assert.equal(normalizeThreadCallout("14-20 UNC").resolved, false);
});

test("parseVisionResponse: a thread dimension gets a canonical thread spec; non-thread dims get null", () => {
  const resp = JSON.stringify({
    title_block: { units: "in" },
    dimensions: [
      { type: "thread", raw_text: "1/4-20 UNC-2B", confidence: 0.9 },
      { type: "linear", nominal: 0.5, unit: "in", raw_text: ".500", confidence: 0.9 },
    ],
  });
  const dims = parseVisionResponse(resp).extraction.dimensions;
  assert.equal(dims[0].thread.major_dia_in, 0.25);
  assert.equal(dims[0].thread.tpi, 20);
  assert.equal(dims[1].thread, null, "a plain linear dim is not probed as a thread");
});

// -- normalizeChamferCallout (U-XRAY-CHAMFER-NORMALIZE) -- chamfer/countersink spec, keyword-gated --

test("normalizeChamferCallout: countersink -- keyword + included angle + diameter", () => {
  assert.deepEqual(normalizeChamferCallout("82 DEG CSK .375"), { type: "countersink", angle_deg: 82, diameter_in: 0.375, size_in: null, resolved: true, raw: "82 DEG CSK .375" });
  assert.deepEqual(normalizeChamferCallout("90 DEG C'SINK .250"), { type: "countersink", angle_deg: 90, diameter_in: 0.25, size_in: null, resolved: true, raw: "90 DEG C'SINK .250" });
  // diameter-only csk (no angle stated) still resolves
  assert.equal(normalizeChamferCallout("COUNTERSINK .500").diameter_in, 0.5);
});

test("normalizeChamferCallout: chamfer -- keyword + leg size + optional angle (no fabricated 45)", () => {
  const c = normalizeChamferCallout(".03 X 45 CHAMFER");
  assert.equal(c.type, "chamfer"); assert.equal(c.size_in, 0.03); assert.equal(c.angle_deg, 45);
  // angle-BEFORE-X form ("45 X .03") -- the bare integer is the angle, the decimal is the leg (regression:
  // a naive regex grabbed ".03"'s digits "03" -> 3 -> out-of-range -> null; the decimal-exclusion lookaround fixes it)
  const c2 = normalizeChamferCallout("45 X .03 CHAMFER");
  assert.equal(c2.angle_deg, 45); assert.equal(c2.size_in, 0.03);
  // 3-digit angle (118deg spot/csk-style edge) resolves
  assert.equal(normalizeChamferCallout("CHAMFER .03 X 118").angle_deg, 118);
  // a chamfer with NO stated angle -> angle_deg null (the 45 convention is the consumer's, not fabricated)
  assert.deepEqual(normalizeChamferCallout("CHAMFER .020"), { type: "chamfer", angle_deg: null, diameter_in: null, size_in: 0.02, resolved: true, raw: "CHAMFER .020" });
  // size-X-size pair (".250 X .125") fabricates NO angle (R12) -- both decimals are sizes, no bare integer
  assert.equal(normalizeChamferCallout(".250 X .125 CHAMFER").angle_deg, null);
});

test("normalizeChamferCallout: KEYWORD-GATED -- the overloaded 'X' notation is NOT a chamfer (R12)", () => {
  // "2 X .500 DRILL" = a QUANTITY x size, not a chamfer -- no keyword -> not resolved
  assert.equal(normalizeChamferCallout("2 X .500 DRILL").resolved, false);
  assert.equal(normalizeChamferCallout(".750").resolved, false);
  assert.equal(normalizeChamferCallout("").resolved, false);
  assert.equal(normalizeChamferCallout(null).resolved, false);
});

test("parseVisionResponse: a countersink dim gets a canonical chamfer spec; a plain dim gets null", () => {
  const resp = JSON.stringify({
    title_block: { units: "in" },
    dimensions: [
      { type: "countersink", raw_text: "82 DEG CSK .375", confidence: 0.9 },
      { type: "linear", nominal: 0.5, unit: "in", raw_text: ".500", confidence: 0.9 },
    ],
  });
  const dims = parseVisionResponse(resp).extraction.dimensions;
  assert.equal(dims[0].chamfer.type, "countersink");
  assert.equal(dims[0].chamfer.angle_deg, 82);
  assert.equal(dims[0].chamfer.diameter_in, 0.375);
  assert.equal(dims[1].chamfer, null, "a plain linear dim is not probed as a chamfer/csk");
});

test("normalizeGdtSymbol: canonical passthrough + abbreviation + spelling + unicode + unknown", () => {
  // canonical names pass through (underscore-collapse makes "profile surface" canonical too)
  assert.equal(normalizeGdtSymbol("position"), "position");
  assert.equal(normalizeGdtSymbol("circular_runout"), "circular_runout");
  assert.equal(normalizeGdtSymbol("profile surface"), "profile_surface");
  // shop abbreviations
  assert.equal(normalizeGdtSymbol("TP"), "position");
  assert.equal(normalizeGdtSymbol("POS"), "position");
  assert.equal(normalizeGdtSymbol("PERP"), "perpendicularity");
  assert.equal(normalizeGdtSymbol("CYL"), "cylindricity");
  // variant spellings
  assert.equal(normalizeGdtSymbol("true position"), "position");
  assert.equal(normalizeGdtSymbol("roundness"), "circularity");
  assert.equal(normalizeGdtSymbol("total runout"), "total_runout");
  assert.equal(normalizeGdtSymbol("runout"), "circular_runout"); // bare runout = circular (single-arrow)
  // ASME unicode symbols
  assert.equal(normalizeGdtSymbol("⌖"), "position");
  assert.equal(normalizeGdtSymbol("⊥"), "perpendicularity");
  // noise-word strip
  assert.equal(normalizeGdtSymbol("position tol"), "position");
  // never fabricate (R12)
  assert.equal(normalizeGdtSymbol("XYZ") ?? "NONE", "NONE");
  assert.equal(normalizeGdtSymbol("") ?? "NONE", "NONE");
  assert.equal(normalizeGdtSymbol(null) ?? "NONE", "NONE");
});

test("parseVisionResponse: a non-canonical GD&T symbol normalizes -> datum-deficiency fires (the fix)", () => {
  // "TP" with NO datum is a datum-deficient position FCF -- but before normalization "tp" never matched
  // DATUM_REQUIRED_SYMBOLS so it was silently NOT flagged. After normalization "TP" -> "position" -> flagged.
  const resp = JSON.stringify({
    gdt: [
      { symbol: "TP", tolerance_value: 0.005, raw_text: "TP 0.005" },        // position, no datum -> deficient
      { symbol: "FLAT", tolerance_value: 0.002, raw_text: "FLAT .002" },     // form tol, no datum -> NOT deficient
      { symbol: "PERP", tolerance_value: 0.01, datum_references: ["A"], raw_text: "PERP .01 A" }, // has datum -> ok
    ],
  });
  const g = parseVisionResponse(resp).extraction.gdt;
  assert.equal(g[0].symbol, "position");
  assert.equal(g[0].datum_deficient, true);
  assert.equal(g[0].raw_text, "TP 0.005"); // raw preserved
  assert.equal(g[1].symbol, "flatness");
  assert.equal(g[1].datum_deficient, false); // form tolerance never needs a datum (ASME Y14.5 8.2)
  assert.equal(g[2].symbol, "perpendicularity");
  assert.equal(g[2].datum_deficient, false); // orientation WITH a datum is fine
});

test("parseVisionResponse: forceUnits is AUTHORITATIVE -- overrides a per-dim unit guess and the drawing units", () => {
  // Region tiling use-case: a tile that lost the title block guesses unit:mm on ".94"; the global drawing
  // is inch. forceUnits:in must win -> 0.94in -> 23.876mm (the dia .94 = 0.940mm-vs-23.876mm caveat fix).
  const resp = JSON.stringify({
    title_block: { units: "mm" }, // even a (wrongly) mm-detecting tile title block must be overridden
    dimensions: [{ type: "diameter", nominal: 0.94, unit: "mm", raw_text: "0.94", confidence: 0.9 }],
  });
  const forced = parseVisionResponse(resp, { forceUnits: "in" }).extraction.dimensions[0];
  assert.equal(forced.nominal_mm, 0.94 * 25.4); // 23.876 -- inch forced over both the dim unit AND drawing units
  // without force, the dim's own unit:mm is honored -> 0.94mm (proves the override is what changed it)
  const unforced = parseVisionResponse(resp, {}).extraction.dimensions[0];
  assert.equal(unforced.nominal_mm, 0.94);
});

// ── resolvePageTitleBlockUnit + pageForceUnit (per-print unit propagation, U-XRAY-PERPRINT-UNITS) ──
// The multi-page fix: detect a print's unit from the title-block page, force it on later pages that
// lost the title block. These pure helpers are the unit logic; the per-print loop wiring is thin glue.

// helper to build a per_model_runs entry in the real runEnsembleOverImage shape. A REAL title block
// carries an identity field (corroborated:true adds part_number); the corroboration gate requires it.
// `via` selects which field carries the unit (units top-level / title_block.units / unit_resolution).
const mkRun = (units, { ok = true, via = "units", corroborated = true } = {}) => {
  if (!ok) return { model: "m", ok: false, ms: 1, dim_count: 0, error: "boom", extraction: null };
  const ex = { dimensions: [] };
  const tb = corroborated ? { part_number: "P-123" } : {};
  if (via === "units") ex.units = units;
  else if (via === "titleBlock") tb.units = units;
  else if (via === "resolution") ex.unit_resolution = { drawing_units: units };
  ex.title_block = tb;
  return { model: "m", ok: true, ms: 1, dim_count: 0, error: null, extraction: ex };
};

test("resolvePageTitleBlockUnit: both models agree 'in' → 'in'", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("in"), mkRun("in")]), "in");
});
test("resolvePageTitleBlockUnit: both models agree 'mm' → 'mm'", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("mm"), mkRun("mm")]), "mm");
});
test("resolvePageTitleBlockUnit: one 'in' + one null-extraction → 'in' (null abstains, not a vote against)", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("in"), mkRun(null, { ok: false })]), "in");
});
test("resolvePageTitleBlockUnit: conflict 'in' vs 'mm' (1-1 tie) → null (never anchor a print on a disagreed guess)", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("in"), mkRun("mm")]), null);
});
test("resolvePageTitleBlockUnit: 3-model majority 2×'in' 1×'mm' → 'in'", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("in"), mkRun("in"), mkRun("mm")]), "in");
});
test("resolvePageTitleBlockUnit: 3-model majority 2×'mm' 1×'in' → 'mm'", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("mm"), mkRun("mm"), mkRun("in")]), "mm");
});
test("resolvePageTitleBlockUnit: all 'mixed'/null → null (no confident anchor)", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("mixed"), mkRun(null)]), null);
});
test("resolvePageTitleBlockUnit: empty array → null", () => {
  assert.equal(resolvePageTitleBlockUnit([]), null);
});
test("resolvePageTitleBlockUnit: non-array inputs → null (no throw)", () => {
  assert.equal(resolvePageTitleBlockUnit(null), null);
  assert.equal(resolvePageTitleBlockUnit(undefined), null);
  assert.equal(resolvePageTitleBlockUnit("in"), null);
  assert.equal(resolvePageTitleBlockUnit(42), null);
});
test("resolvePageTitleBlockUnit: falls back to title_block.units when extraction.units absent", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("in", { via: "titleBlock" })]), "in");
});
test("resolvePageTitleBlockUnit: falls back to unit_resolution.drawing_units", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("mm", { via: "resolution" })]), "mm");
});
test("resolvePageTitleBlockUnit: unit aliases normalized ('inch'/'\"' → in, 'millimeter'/'metric' → mm)", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("inch")]), "in");
  assert.equal(resolvePageTitleBlockUnit([mkRun("\"")]), "in");
  assert.equal(resolvePageTitleBlockUnit([mkRun("millimeter")]), "mm");
  assert.equal(resolvePageTitleBlockUnit([mkRun("metric")]), "mm");
});
test("resolvePageTitleBlockUnit: failed runs (ok:false, extraction:null) abstain entirely", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun(null, { ok: false }), mkRun(null, { ok: false })]), null);
});
test("resolvePageTitleBlockUnit: malformed entries (null, no extraction) skipped without throw", () => {
  assert.equal(resolvePageTitleBlockUnit([null, { model: "x" }, mkRun("in")]), "in");
});
test("resolvePageTitleBlockUnit: corroboration gate -- bare units with NO title-block identity abstains", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("in", { corroborated: false })]), null);
});
test("resolvePageTitleBlockUnit: corroboration gate -- an UNcorroborated vote doesn't count, a corroborated one does", () => {
  assert.equal(resolvePageTitleBlockUnit([mkRun("mm", { corroborated: false }), mkRun("in")]), "in");
});
test("resolvePageTitleBlockUnit: corroboration via drawing_number or title (not only part_number)", () => {
  assert.equal(resolvePageTitleBlockUnit([{ extraction: { units: "mm", title_block: { drawing_number: "D-9", units: "mm" } } }]), "mm");
  assert.equal(resolvePageTitleBlockUnit([{ extraction: { units: "in", title_block: { title: "TAPTITE DIE", units: "in" } } }]), "in");
});
test("resolvePageTitleBlockUnit: metric print -- a page-1 bare 'in' hallucination does NOT force inch (the gate's whole purpose)", () => {
  // page 1: dimension-only, VLM hallucinated units:'in', no title-block identity -> must abstain
  assert.equal(resolvePageTitleBlockUnit([mkRun("in", { corroborated: false }), mkRun("in", { corroborated: false })]), null);
  // page 2: real title block declares 'mm' -> metric correctly anchored, never forced to inch
  assert.equal(resolvePageTitleBlockUnit([mkRun("mm")]), "mm");
});

test("pageForceUnit: explicit override wins over a conflicting anchor ('mm' explicit beats 'in' anchor)", () => {
  assert.equal(pageForceUnit("mm", "in"), "mm");
});
test("pageForceUnit: no explicit → propagated anchor used", () => {
  assert.equal(pageForceUnit(null, "in"), "in");
  assert.equal(pageForceUnit(undefined, "mm"), "mm");
});
test("pageForceUnit: explicit set, anchor null → explicit", () => {
  assert.equal(pageForceUnit("in", null), "in");
});
test("pageForceUnit: both null → null (force nothing, page self-resolves)", () => {
  assert.equal(pageForceUnit(null, null), null);
});
test("pageForceUnit: explicit alias 'inch' normalized → 'in'", () => {
  assert.equal(pageForceUnit("inch", null), "in");
});
test("pageForceUnit: garbage explicit falls through to a valid anchor", () => {
  assert.equal(pageForceUnit("furlong", "in"), "in");
});
test("pageForceUnit: 'mixed' anchor is not a valid force → null", () => {
  assert.equal(pageForceUnit(null, "mixed"), null);
});
