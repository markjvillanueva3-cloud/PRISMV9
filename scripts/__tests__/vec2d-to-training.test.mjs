/**
 * Tests for vec2d-to-training.mjs — the resumable vec2d DXF extraction lane
 * (U-DELTA-VEC2D-TRAINING-LANE, slot:delta 2026-07-02, Domain 10 closed-loop).
 *
 * Exercises processOne against the REAL dist reader (Drawing2DExtractionEngine) with injected
 * fs deps, plus the fail-loud branches (dwg / binary-sniff / too-large / read-error) and THE
 * inch-trap: a fail-soft parse (success:true, units defaulted 'mm', 'DXF parse failed' warning)
 * MUST be reclassified parse-error with units:null — never stamped mm. Plus resume + torn-tail.
 *
 * DXF fixtures are crafted from the verified parser rules (Drawing2DExtractionEngine.ts:182-278):
 * $INSUNITS via 9/$INSUNITS then 70/<1=in|4=mm>; a DIMENSION emits a dim iff group-42 is numeric,
 * type = (group-70 & 7) mapped {0/1/6:linear, 3:diameter, 4:radial, 2/5:angular}.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { processOne, runLane, readManifest, MAX_DXF_BYTES } from "../vec2d-to-training.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIST = path.join(ROOT, "mcp-server", "dist", "engines", "Drawing2DExtractionEngine.js");

// Real dist reader (skip real-parse tests if the bundle isn't built).
let realExtract = null;
try {
  const mod = await import(pathToFileURL(DIST).href);
  const Engine = mod.Drawing2DExtractionEngine;
  if (Engine && typeof Engine.extractDrawing === "function") realExtract = (p, s) => Engine.extractDrawing(p, s);
} catch { /* dist not built — real-parse tests will skip-loud */ }
const NEED_DIST = { skip: realExtract ? false : "dist reader not built (npm run build) — real-parse tests skipped" };

// ── DXF fixture builder (verified format) ──
function dxf({ insunits, entities }) {
  const L = ["0", "SECTION", "2", "HEADER"];
  if (insunits != null) L.push("9", "$INSUNITS", "70", String(insunits));
  L.push("0", "ENDSEC", "0", "SECTION", "2", "ENTITIES");
  for (const e of entities) L.push(...e);
  L.push("0", "ENDSEC", "0", "EOF");
  return L.join("\n") + "\n";
}
const DIM = (type70, value) => ["0", "DIMENSION", "8", "DIM", "70", String(type70), "42", String(value)];
const LINE = (x, y) => ["0", "LINE", "8", "0", "10", String(x), "20", String(y)];

const INCH_DXF = dxf({ insunits: 1, entities: [DIM(0, 12.5), DIM(3, 0.5)] }); // linear 12.5 + diameter 0.5
const MM_DXF = dxf({ insunits: 4, entities: [DIM(0, 25)] });
const UNKNOWN_DXF = dxf({ insunits: null, entities: [DIM(0, 5)] });
const NODIMS_DXF = dxf({ insunits: 1, entities: [LINE(0, 0), LINE(10, 5)] });

// deps that serve a DXF string via injected fs (processOne reads a Buffer, then toString utf8)
function depsFor(content) {
  return {
    extractDrawing: realExtract,
    statSync: () => ({ size: Buffer.byteLength(content, "utf8") }),
    readFileSync: () => Buffer.from(content, "utf8"),
  };
}

test("real inch DXF → parsed, units 'in', linear 12.5 + diameter 0.5", NEED_DIST, () => {
  const stats = freshStats();
  const r = processOne("C:/inch.dxf", stats, depsFor(INCH_DXF));
  assert.equal(r.status, "parsed");
  assert.equal(r.ok, true);
  assert.equal(r.units, "in");
  assert.equal(r.units_unknown, false);
  assert.equal(r.mm_anomaly, false);
  assert.equal(r.dimCount, 2);
  const linear = r.dimensions.find((d) => d.type === "linear");
  const dia = r.dimensions.find((d) => d.type === "diameter");
  assert.equal(linear.value, 12.5);
  assert.equal(dia.value, 0.5);
  assert.equal(stats.dimensioned, 1);
  assert.equal(stats.parsed, 1);
});

test("real mm DXF ($INSUNITS=4) → units 'mm', mm_anomaly true (real 4 not rejected)", NEED_DIST, () => {
  const stats = freshStats();
  const r = processOne("C:/mm.dxf", stats, depsFor(MM_DXF));
  assert.equal(r.status, "parsed");
  assert.equal(r.units, "mm");
  assert.equal(r.mm_anomaly, true);
  assert.equal(stats.mmAnomaly, 1);
});

test("real DXF without $INSUNITS → units 'unknown' (never coerced to mm)", NEED_DIST, () => {
  const stats = freshStats();
  const r = processOne("C:/u.dxf", stats, depsFor(UNKNOWN_DXF));
  assert.equal(r.status, "parsed");
  assert.equal(r.units, "unknown");
  assert.equal(r.units_unknown, true);
  assert.equal(r.mm_anomaly, false);
  assert.equal(stats.unitsUnknown, 1);
});

test("real DXF with entities but no DIMENSION → parsed-no-dims (distinct bucket)", NEED_DIST, () => {
  const stats = freshStats();
  const r = processOne("C:/nd.dxf", stats, depsFor(NODIMS_DXF));
  assert.equal(r.status, "parsed-no-dims");
  assert.equal(r.ok, true);
  assert.equal(r.dimCount, 0);
  assert.equal(stats.parsedNoDims, 1);
  assert.equal(stats.parsed, 0); // NOT counted as dimensioned-parsed
});

test("angular dim is stored unit 'deg' regardless of header length unit", NEED_DIST, () => {
  const stats = freshStats();
  const content = dxf({ insunits: 1, entities: [DIM(2, 90)] }); // type 2 = angular
  const r = processOne("C:/ang.dxf", stats, depsFor(content));
  const ang = r.dimensions.find((d) => d.type === "angular");
  assert.ok(ang, "angular dim present");
  assert.equal(ang.unit, "deg");
});

// ── sentinel filter: JM associative dims (group-42 = -1) are noise, not trained on ──
test("sentinel/non-physical dims (value <= 0) are dropped + counted, not trained as real", NEED_DIST, () => {
  const stats = freshStats();
  // one real 12.5 linear + two sentinel -1 dims (the real JM associative-dim shape)
  const content = dxf({ insunits: 1, entities: [DIM(0, 12.5), DIM(0, -1), DIM(0, -1)] });
  const r = processOne("C:/sentinel.dxf", stats, depsFor(content));
  assert.equal(r.status, "parsed");
  assert.equal(r.dimCount, 1, "only the real positive dim survives");
  assert.equal(r.dimensions[0].value, 12.5);
  assert.equal(r.sentinelDimCount, 2, "two sentinels counted");
  assert.equal(stats.sentinelDims, 2);
});

test("all-sentinel drawing degrades to parsed-no-dims (units-discipline only, no -1 noise)", NEED_DIST, () => {
  const stats = freshStats();
  const content = dxf({ insunits: 1, entities: [DIM(0, -1), DIM(0, -1)] }); // all placeholders
  const r = processOne("C:/allsent.dxf", stats, depsFor(content));
  assert.equal(r.status, "parsed-no-dims", "no usable dim → honest no-dims lane, not a -1 pair");
  assert.equal(r.dimCount, 0);
  assert.equal(r.sentinelDimCount, 2);
  assert.equal(stats.parsedNoDims, 1);
  assert.equal(stats.dimensioned, 0);
});

// ── THE inch-trap: fail-soft parse must NOT be trusted as mm ──
test("parse-failure (success:true, units defaulted mm, 'DXF parse failed' warning) → parse-error, units NULL", () => {
  const stats = freshStats();
  const spyExtract = () => ({
    success: true,
    metadata: { units: "mm", entityCount: 0, bounds: null, layers: ["0"], format: "dxf", name: "x", path: "x" },
    dimensions: [],
    warnings: ["DXF parse failed: unexpected token"],
    partInfo: null,
  });
  const r = processOne("C:/bad.dxf", stats, {
    extractDrawing: spyExtract,
    statSync: () => ({ size: 100 }),
    readFileSync: () => Buffer.from("0\nSECTION\n", "utf8"),
  });
  assert.equal(r.status, "parse-error");
  assert.equal(r.ok, false);
  assert.equal(r.units, null, "units MUST be null — never the silent default 'mm'");
  assert.notEqual(r.units, "mm");
  assert.match(r.reason, /^dxf_parse_failed/);
  assert.equal(stats.parseError, 1);
  assert.equal(stats.parsed, 0);
});

test("binary / DWG-as-.dxf (AC10xx magic) → binary-nonparseable, reader never called", () => {
  const stats = freshStats();
  let called = false;
  const r = processOne("C:/fake.dxf", stats, {
    extractDrawing: () => { called = true; return {}; },
    statSync: () => ({ size: 5000 }),
    readFileSync: () => Buffer.from("AC1027\x00\x00binary", "latin1"),
  });
  assert.equal(r.status, "binary-nonparseable");
  assert.equal(r.reason, "binary_or_dwg_content_in_dxf");
  assert.equal(stats.binaryNonparseable, 1);
  assert.equal(called, false, "reader not invoked on binary");
});

test("NUL-containing content → binary-nonparseable", () => {
  const stats = freshStats();
  const r = processOne("C:/nul.dxf", stats, {
    extractDrawing: () => ({}),
    statSync: () => ({ size: 10 }),
    readFileSync: () => Buffer.from("0\n\x00SECTION", "latin1"),
  });
  assert.equal(r.status, "binary-nonparseable");
});

test("dwg path → dwg-unsupported, reason dwg_requires_oda_sdk, units null, no pair-eligible", NEED_DIST, () => {
  const stats = freshStats();
  const r = processOne("C:/part.dwg", stats, { extractDrawing: realExtract, statSync: fs.statSync, readFileSync: fs.readFileSync });
  assert.equal(r.status, "dwg-unsupported");
  assert.equal(r.ok, false);
  assert.equal(r.units, null);
  assert.equal(r.reason, "dwg_requires_oda_sdk");
  assert.ok(r.warnings.some((w) => w.includes("ODA SDK")), "carries the ODA warning");
  assert.equal(stats.dwgUnsupported, 1);
});

test("too-large (>64MB) → too-large, no read attempted", () => {
  const stats = freshStats();
  let read = false;
  const r = processOne("C:/big.dxf", stats, {
    extractDrawing: () => ({}),
    statSync: () => ({ size: MAX_DXF_BYTES + 1 }),
    readFileSync: () => { read = true; return Buffer.alloc(0); },
  });
  assert.equal(r.status, "too-large");
  assert.match(r.reason, /dxf_exceeds_64mb/);
  assert.equal(stats.tooLarge, 1);
  assert.equal(read, false, "no read of an oversized file");
});

test("stat failure → read-error reason stat_failed; read failure → read_failed", () => {
  const s1 = freshStats();
  const r1 = processOne("C:/gone.dxf", s1, { extractDrawing: () => ({}), statSync: () => { throw new Error("ENOENT"); }, readFileSync: () => Buffer.alloc(0) });
  assert.equal(r1.status, "read-error");
  assert.equal(r1.reason, "stat_failed");
  const s2 = freshStats();
  const r2 = processOne("C:/locked.dxf", s2, { extractDrawing: () => ({}), statSync: () => ({ size: 100 }), readFileSync: () => { throw new Error("EACCES"); } });
  assert.equal(r2.status, "read-error");
  assert.equal(r2.reason, "read_failed");
  assert.equal(s2.readError, 1);
});

// ── resume + torn-tail (temp ledger, real fs) ──
test("resume skips already-processed paths; torn tail counted, not swallowed", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vec2d-lane-"));
  const ledger = path.join(dir, "ledger.jsonl");
  const manifest = path.join(dir, "manifest.txt");
  try {
    fs.writeFileSync(manifest, ["C:/A.dxf", "C:/B.dxf", "C:/C.dxf"].join("\n") + "\n", "utf8");
    // pre-seed A,B as already processed
    fs.writeFileSync(ledger, [JSON.stringify({ path: "C:/A.dxf" }), JSON.stringify({ path: "C:/B.dxf" })].join("\n") + "\n", "utf8");
    const stubResult = { success: true, metadata: { units: "in", entityCount: 1, bounds: null, layers: ["0"] }, dimensions: [{ type: "linear", value: 1, unit: "in" }], warnings: [], partInfo: null };
    const deps = { extractDrawing: () => stubResult, statSync: () => ({ size: 50 }), readFileSync: (p) => (p === manifest ? "C:/A.dxf\nC:/B.dxf\nC:/C.dxf\n" : Buffer.from("0\nSECTION\n2\nENTITIES\n0\nENDSEC\n", "utf8")) };
    const { stats } = runLane({ manifest, out: ledger, resume: true, deps });
    assert.equal(stats.skippedDuplicate, 2, "A,B skipped on resume");
    assert.equal(stats.emitted, 1, "only C processed");
    const rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(rows.length, 3, "3 unique rows total");
    // now corrupt with a torn half-line, re-run → tornLines counted, no throw
    fs.appendFileSync(ledger, '{"path":"C:/D.dxf","tor');
    fs.writeFileSync(manifest, ["C:/A.dxf", "C:/B.dxf", "C:/C.dxf", "C:/E.dxf"].join("\n") + "\n", "utf8");
    const deps2 = { ...deps, readFileSync: (p) => (p === manifest ? "C:/A.dxf\nC:/B.dxf\nC:/C.dxf\nC:/E.dxf\n" : Buffer.from("0\nSECTION\n2\nENTITIES\n0\nENDSEC\n", "utf8")) };
    const { stats: s2 } = runLane({ manifest, out: ledger, resume: true, deps: deps2 });
    assert.ok(s2.tornLines >= 1, "torn line counted, not silently swallowed");
    assert.equal(s2.emitted, 1, "only E newly processed");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readManifest drops comments and blanks", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vec2d-man-"));
  const m = path.join(dir, "m.txt");
  try {
    fs.writeFileSync(m, "# header\nC:/a.dxf\n\n  C:/b.dxf  \n# trailing\n", "utf8");
    const paths = readManifest(m, fs.readFileSync);
    assert.deepEqual(paths, ["C:/a.dxf", "C:/b.dxf"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// local copy of the lane's stats shape (freshStats is module-internal)
function freshStats() {
  return {
    total: 0, dxf: 0, dwg: 0, parsed: 0, parsedNoDims: 0, dimensioned: 0,
    unitsUnknown: 0, mmAnomaly: 0, tooLarge: 0, readError: 0, parseError: 0,
    binaryNonparseable: 0, dwgUnsupported: 0, sentinelDims: 0, skippedDuplicate: 0, tornLines: 0, emitted: 0,
  };
}
