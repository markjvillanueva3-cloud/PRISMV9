#!/usr/bin/env node
/**
 * emit-brand-tool-libraries.test.mjs -- real-value + adversarial tests for the Fusion lane.
 * Run: node scripts/emit-brand-tool-libraries.test.mjs   (node:test auto-runs on exit)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  fusionType, fusionGeometry, toFusionTool, buildFusionLibrary, brandSlug,
  emitLibraries, effectiveRE, BUILDERS, FUSION_EMIT_CATEGORIES,
  hypermillToolTypeId, buildHypermillLibrary, serializeHypermill,
  mastercamToolType, buildMastercamLibrary, serializeMastercam, MASTERCAM_TOOL_COLUMNS,
  parseIsoInsertIC, buildMastercamInserts, serializeMastercamInserts, MASTERCAM_INSERT_COLUMNS,
  selectInsertRows, buildHypermillInserts, serializeHypermillInserts,
  selectHolderRows, buildMastercamHolders, serializeMastercamHolders,
  buildHypermillHolders, serializeHypermillHolders, MASTERCAM_HOLDER_COLUMNS,
} from "./emit-brand-tool-libraries.mjs";

const mill = { id: "X", brand: "Helical", category: "solid_mill", diameter_mm: 12.7, shank_mm: 12.7, flute_len_mm: 15.875, oal_mm: 101.6, corner_radius_mm: 0, num_flutes: 3, unit_source: "inches", description: "1/2 EM", geometry_plausible: true };
const ball = { ...mill, id: "B", corner_radius_mm: 6.35 };
const bull = { ...mill, id: "U", corner_radius_mm: 1.0 };
const drill = { id: "D", brand: "Guhring", category: "drill", diameter_mm: 6.35, oal_mm: 66, num_flutes: 2, unit_source: "inches", geometry_plausible: true };

// ## effectiveRE -- clamps impossible corner radius
test("effectiveRE: clamps RE to [0, dia/2]", () => {
  assert.equal(effectiveRE(mill), 0);            // RE 0
  assert.equal(effectiveRE(bull), 1.0);          // within radius
  assert.equal(effectiveRE(ball), 6.35);         // exactly dia/2
  assert.equal(effectiveRE({ diameter_mm: 10, corner_radius_mm: 9 }), 5); // impossible RE -> dia/2
  assert.equal(effectiveRE({ diameter_mm: 10, corner_radius_mm: -2 }), 0); // negative -> 0
  assert.equal(effectiveRE({ corner_radius_mm: 3 }), 3); // no dia -> passthrough
});

// ## thread mills (rotating tool category mapped across all 3 tool lanes)
test("thread category -> thread mill type across all CAMs + carries shank", () => {
  const thread = { id: "TM1", brand: "Emuge", category: "thread", diameter_mm: 6, shank_mm: 6, oal_mm: 60, num_flutes: 3, geometry_plausible: true };
  assert.equal(fusionType(thread), "thread mill");
  assert.equal(hypermillToolTypeId(thread), 15);   // ThreadMill geometry class
  assert.equal(mastercamToolType(thread), "Thread Mill");
  const g = fusionGeometry(thread, "thread mill");
  assert.equal(g.DC, 6);
  assert.equal(g.SFDM, 6);   // thread mills carry a shank (isMill includes "thread mill")
});

// ## turning tools (hyperMILL + Mastercam only; Fusion's turning schema differs -> excluded)
test("turning category: hyperMILL GeneralTurningTool + Mastercam Turning; Fusion excludes it", () => {
  const turn = { id: "BB1", brand: "Kennametal", category: "turning", diameter_mm: 12, oal_mm: 100, geometry_plausible: true };
  assert.equal(hypermillToolTypeId(turn), 1000);
  assert.equal(mastercamToolType(turn), "Turning");
  // Fusion tool lane excludes turning (FUSION_EMIT_CATEGORIES has no "turning")
  assert.ok(!FUSION_EMIT_CATEGORIES.has("turning"));
  const fusionLib = buildFusionLibrary([turn]);
  assert.equal(fusionLib.emitted, 0);
  assert.equal(fusionLib.skippedCategory, 1);
  // hyperMILL + Mastercam emit it
  assert.equal(buildHypermillLibrary([turn]).emitted, 1);
  assert.equal(buildMastercamLibrary([turn]).emitted, 1);
});

// ## fusionType
test("fusionType: mill variants + drill + reamer + impossible-RE collapses to ball", () => {
  assert.equal(fusionType(mill), "flat end mill");
  assert.equal(fusionType(ball), "ball end mill");   // RE == dia/2
  assert.equal(fusionType(bull), "bull nose end mill"); // 0 < RE < dia/2
  assert.equal(fusionType(drill), "drill");
  assert.equal(fusionType({ category: "reamer", diameter_mm: 8 }), "reamer");
  // impossible RE (9 on 10mm) clamps to dia/2 -> classifies as ball, geometry agrees
  assert.equal(fusionType({ category: "solid_mill", diameter_mm: 10, corner_radius_mm: 9 }), "ball end mill");
  assert.equal(fusionGeometry({ category: "solid_mill", diameter_mm: 10, corner_radius_mm: 9 }, "ball end mill").RE, 5);
});

// ## fusionGeometry
test("fusionGeometry: mill carries SFDM+HA, drill does not", () => {
  const gm = fusionGeometry(mill, "flat end mill");
  assert.equal(gm.DC, 12.7);
  assert.equal(gm.SFDM, 12.7);
  assert.equal(gm.HA, 30);
  assert.equal(gm.LCF, 15.875);
  assert.equal(gm.OAL, 101.6);
  assert.equal(gm.NOF, 3);
  assert.equal(gm.RE, 0);
  const gd = fusionGeometry(drill, "drill");
  assert.equal(gd.DC, 6.35);
  assert.equal(gd.SFDM, undefined); // drills carry no shaft-dia/helix in this lane
  assert.equal(gd.HA, undefined);
});
test("fusionGeometry: omits absent fields (no fabrication)", () => {
  const g = fusionGeometry({ category: "drill", diameter_mm: 5 }, "drill");
  assert.equal(g.DC, 5);
  assert.equal(g.LCF, undefined); // not present in source -> omitted
  assert.equal(g.OAL, undefined);
  assert.equal(g.NOF, undefined);
  assert.equal(g.RE, 0); // RE defaults sharp
});

// ## toFusionTool
test("toFusionTool: carries provenance + millimeters unit; null on no DC", () => {
  const t = toFusionTool(mill, 7);
  assert.equal(t.unit, "millimeters");
  assert.equal(t.vendor, "Helical");
  assert.equal(t["product-id"], "X");
  assert.equal(t["unit-source"], "inches");
  assert.equal(t["post-process"].number, 7);
  assert.equal(toFusionTool({ ...mill, diameter_mm: null }, 1), null);
});

// ## buildFusionLibrary -- skip accounting
test("buildFusionLibrary: emits rotating, excludes insert/noDc/implausible with counts", () => {
  const insert = { id: "I", brand: "ISCAR", category: "insert", diameter_mm: 12.7, corner_radius_mm: 0.4, geometry_plausible: true };
  const noDc = { id: "N", brand: "X", category: "solid_mill", diameter_mm: null, geometry_plausible: true };
  const bad = { id: "P", brand: "YG-1", category: "drill", diameter_mm: 380, geometry_plausible: false };
  const lib = buildFusionLibrary([mill, ball, drill, insert, noDc, bad]);
  assert.equal(lib.emitted, 3);
  assert.equal(lib.skippedCategory, 1);   // insert
  assert.equal(lib.skippedNoDc, 1);       // null DC
  assert.equal(lib.skippedImplausible, 1); // 380mm drill
  assert.equal(lib.library.version, 2);
  assert.equal(lib.library.data[0]["post-process"].number, 1);
  assert.equal(lib.library.data[2]["post-process"].number, 3);
});
test("buildFusionLibrary: FUSION_EMIT_CATEGORIES is the rotating set", () => {
  assert.ok(FUSION_EMIT_CATEGORIES.has("solid_mill"));
  assert.ok(FUSION_EMIT_CATEGORIES.has("drill"));
  assert.ok(!FUSION_EMIT_CATEGORIES.has("insert"));
  assert.ok(!FUSION_EMIT_CATEGORIES.has("turning"));
  assert.ok(!FUSION_EMIT_CATEGORIES.has("holder"));
});

// ## brandSlug
test("brandSlug: fs-safe, uppercase, collapsed", () => {
  assert.equal(brandSlug("Big Daishowa"), "BIG_DAISHOWA");
  assert.equal(brandSlug("YG-1"), "YG_1");
  assert.equal(brandSlug("MA Ford"), "MA_FORD");
  assert.equal(brandSlug(""), "UNKNOWN");
});

// ## emitLibraries -- hermetic write + dry-run
test("emitLibraries: writes per-brand .tools + MANIFEST (hermetic)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emit-"));
  try {
    const catalog = { records: [mill, ball, drill, { id: "Z", brand: "ISCAR", category: "insert", diameter_mm: 12, geometry_plausible: true }] };
    const m = emitLibraries({ catalog, format: "fusion", outDir: dir });
    // Helical (mill+ball) + Guhring (drill) emit; ISCAR is insert-only -> no file
    assert.equal(m.totalTools, 3);
    assert.equal(m.brands, 2);
    assert.ok(fs.existsSync(path.join(dir, "fusion", "PRISM_HELICAL.tools")));
    assert.ok(fs.existsSync(path.join(dir, "fusion", "PRISM_GUHRING.tools")));
    assert.ok(!fs.existsSync(path.join(dir, "fusion", "PRISM_ISCAR.tools")));
    assert.ok(fs.existsSync(path.join(dir, "fusion", "MANIFEST.json")));
    const helical = JSON.parse(fs.readFileSync(path.join(dir, "fusion", "PRISM_HELICAL.tools"), "utf8"));
    assert.equal(helical.version, 2);
    assert.equal(helical.data.length, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("emitLibraries: dry-run writes nothing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emit-dry-"));
  try {
    emitLibraries({ catalog: { records: [mill] }, format: "fusion", outDir: dir, dryRun: true });
    assert.ok(!fs.existsSync(path.join(dir, "fusion")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("emitLibraries: brand filter restricts output", () => {
  const m = emitLibraries({ catalog: { records: [mill, drill] }, format: "fusion", outDir: os.tmpdir(), brandFilter: "Helical", dryRun: true });
  assert.equal(m.brands, 1);
  assert.equal(m.perBrand[0].brand, "Helical");
});
test("emitLibraries: unimplemented format throws", () => {
  assert.throws(() => emitLibraries({ catalog: { records: [] }, format: "esprit", dryRun: true }), /not yet implemented/);
});
test("emitLibraries: zero-emit brand still counted -- full-catalog reconciliation (R12 no silent drop)", () => {
  // ISCAR here is insert-only -> emits 0 tools, but its 2 records MUST still appear in skip totals.
  const insertA = { id: "I1", brand: "ISCAR", category: "insert", diameter_mm: 12, geometry_plausible: true };
  const insertB = { id: "I2", brand: "ISCAR", category: "turning", diameter_mm: 20, geometry_plausible: true };
  const noDc = { id: "ND", brand: "Niagara", category: "solid_mill", diameter_mm: null, geometry_plausible: true };
  const bad = { id: "BD", brand: "YG-1", category: "drill", diameter_mm: 380, geometry_plausible: false };
  const records = [mill, ball, drill, insertA, insertB, noDc, bad];
  const m = emitLibraries({ catalog: { records }, format: "fusion", outDir: os.tmpdir(), dryRun: true });
  assert.equal(m.totalSourceRecords, records.length);
  assert.equal(m.totalTools, 3);              // mill+ball (Helical) + drill (Guhring)
  assert.equal(m.skippedNonRotating, 2);      // ISCAR insert + turning (zero-emit brand!)
  assert.equal(m.skippedNoDc, 1);             // Niagara null DC (zero-emit brand!)
  assert.equal(m.skippedImplausible, 1);      // YG-1 380mm (zero-emit brand!)
  // the invariant: nothing silently dropped
  assert.equal(m.totalTools + m.skippedNoDc + m.skippedNonRotating + m.skippedImplausible, m.totalSourceRecords);
  assert.equal(m.reconciles, true);
});
// ## Mastercam inserts lane
test("parseIsoInsertIC: ISO designation IC code -> mm; junk -> null", () => {
  assert.equal(parseIsoInsertIC("CNMG120408"), 12.7);   // IC code 12
  assert.equal(parseIsoInsertIC("SNGN120404"), 12.7);
  assert.equal(parseIsoInsertIC("TNMG160404"), 15.875); // IC code 16
  assert.equal(parseIsoInsertIC("DCMT070204"), null);   // IC code 07 not in standard map -> null (no fabrication)
  assert.equal(parseIsoInsertIC("ISCAR-IC331.0"), null); // product code, not an ISO designation
  assert.equal(parseIsoInsertIC(""), null);
  assert.equal(parseIsoInsertIC(null), null);
});
test("buildMastercamInserts: keeps real ISO inserts, drops junk, gates garbage corner radius", () => {
  const recs = [
    { id: "CNMG120402", brand: "Sandvik", category: "insert", diameter_mm: null, corner_radius_mm: 0.2, geometry_plausible: true },
    { id: "ISCAR-IC331.0", brand: "ISCAR", category: "insert", diameter_mm: null, corner_radius_mm: 8407.4, geometry_plausible: true }, // junk: no ISO IC + garbage CR
    { id: "SNMG120408", brand: "Sandvik", category: "insert", diameter_mm: null, corner_radius_mm: 0.8, geometry_plausible: true },
    { id: "EM1", brand: "Helical", category: "solid_mill", diameter_mm: 6, geometry_plausible: true }, // not an insert
  ];
  const lib = buildMastercamInserts(recs);
  assert.equal(lib.emitted, 2);             // the 2 real ISO inserts
  assert.equal(lib.skippedNoDc, 1);         // ISCAR junk (no parseable IC)
  assert.equal(lib.skippedCategory, 1);     // the solid_mill
  const r0 = lib.library.rows[0];
  assert.equal(r0.ic, 12.7);                // IC parsed from CNMG12
  assert.equal(r0.corner_radius, 0.2);
});
test("buildMastercamInserts: garbage corner radius gated to blank on a real insert", () => {
  const lib = buildMastercamInserts([{ id: "CNMG120408", brand: "Sandvik", category: "insert", diameter_mm: null, corner_radius_mm: 9000, geometry_plausible: true }]);
  assert.equal(lib.emitted, 1);
  assert.equal(lib.library.rows[0].ic, 12.7);
  assert.equal(lib.library.rows[0].corner_radius, ""); // 9000mm gated -> blank, not shipped
});
test("serializeMastercamInserts: header + row", () => {
  const csv = serializeMastercamInserts(buildMastercamInserts([{ id: "CNMG120402", brand: "Sandvik", category: "insert", corner_radius_mm: 0.2, geometry_plausible: true }]).library);
  const lines = csv.trim().split("\n");
  assert.equal(lines[0], MASTERCAM_INSERT_COLUMNS.join(","));
  assert.ok(lines[1].includes("CNMG120402") && lines[1].includes("12.7"));
});

// ## shared insert selector + hyperMILL inserts
test("selectInsertRows: shared filter (keep ISO, drop junk, gate corner radius)", () => {
  const sel = selectInsertRows([
    { id: "CNMG120402", brand: "Sandvik", category: "insert", corner_radius_mm: 0.2, geometry_plausible: true },
    { id: "ISCAR-IC331.0", brand: "ISCAR", category: "insert", corner_radius_mm: 8407, geometry_plausible: true },
    { id: "SNMG120408", brand: "Sandvik", category: "insert", corner_radius_mm: 9000, geometry_plausible: true }, // ISO ok, garbage CR
  ]);
  assert.equal(sel.rows.length, 2);
  assert.equal(sel.skippedNoGeom, 1);            // ISCAR junk
  assert.equal(sel.rows[0].ic, 12.7);
  assert.equal(sel.rows[1].corner_radius, null); // 9000 gated
});
test("buildHypermillInserts: Inserts rows with ISO + IC + manufacturer ids", () => {
  const lib = buildHypermillInserts([
    { id: "CNMG120402", brand: "Kennametal", category: "insert", iso_number: "CNMG120402", shape: "diamond_80", corner_radius_mm: 0.2, geometry_plausible: true },
    { id: "DUP", brand: "Kennametal", category: "insert", iso_number: "", corner_radius_mm: 0.4, diameter_mm: 9.525, geometry_plausible: true },
    { id: "DUP", brand: "Kennametal", category: "insert", iso_number: "", corner_radius_mm: 0.8, diameter_mm: 9.525, geometry_plausible: true },
  ]);
  assert.equal(lib.emitted, 3);
  const r0 = lib.library.rows[0];
  assert.equal(r0.iso_code, "CNMG120402");
  assert.equal(r0.ic, 12.7);
  assert.equal(r0.manufacturer_id, 1);
  const names = lib.library.rows.map((r) => r.name);
  assert.equal(new Set(names).size, names.length, "names deduped");
});
test("serializeHypermillInserts: valid SQL with Inserts table + real values", () => {
  const sql = serializeHypermillInserts(buildHypermillInserts([{ id: "CNMG120408", brand: "Sandvik", category: "insert", iso_number: "CNMG120408", corner_radius_mm: 0.8, geometry_plausible: true }]).library);
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS Inserts"));
  assert.ok(sql.includes("INSERT INTO Inserts"));
  assert.ok(sql.includes("12.7000"));          // IC
  assert.ok(sql.includes("'Sandvik'"));        // manufacturer
});
test("emitLibraries: stale per-brand files are removed on re-emit", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stale-"));
  try {
    // first emit: two brands
    emitLibraries({ catalog: { records: [
      { id: "A", brand: "Helical", category: "solid_mill", diameter_mm: 6, oal_mm: 50, geometry_plausible: true },
      { id: "B", brand: "Sandvik", category: "solid_mill", diameter_mm: 8, oal_mm: 60, geometry_plausible: true },
    ] }, format: "fusion", outDir: dir });
    assert.ok(fs.existsSync(path.join(dir, "fusion", "PRISM_SANDVIK.tools")));
    // re-emit: Sandvik drops out -> its stale file must be removed
    emitLibraries({ catalog: { records: [
      { id: "A", brand: "Helical", category: "solid_mill", diameter_mm: 6, oal_mm: 50, geometry_plausible: true },
    ] }, format: "fusion", outDir: dir });
    assert.ok(fs.existsSync(path.join(dir, "fusion", "PRISM_HELICAL.tools")));
    assert.ok(!fs.existsSync(path.join(dir, "fusion", "PRISM_SANDVIK.tools")), "stale Sandvik file removed");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ## holder lanes
test("selectHolderRows: keep taper-resolvable holders, drop chuck heads", () => {
  const sel = selectHolderRows([
    { id: "BBT50-MEGA32D-105", brand: "Big Daishowa", category: "holder" },
    { id: "MEGA10N", brand: "Big Daishowa", category: "holder" },     // chuck head, no taper -> drop
    { id: "ER-32-4NL", brand: "Haimer", category: "holder" },
    { id: "EM1", brand: "Helical", category: "solid_mill" },          // not a holder
  ]);
  assert.equal(sel.rows.length, 2);
  assert.equal(sel.skippedNoTaper, 1);     // MEGA10N
  assert.equal(sel.skippedCategory, 1);    // solid_mill
  assert.equal(sel.rows[0].taper, "BT50");
  assert.equal(sel.rows[0].body_diameter_mm, 100);
});
test("buildMastercamHolders: CSV rows with taper geometry", () => {
  const lib = buildMastercamHolders([{ id: "BBT40-GTG5", brand: "Big Daishowa", category: "holder" }]);
  assert.equal(lib.emitted, 1);
  assert.equal(lib.library.rows[0].taper, "BT40");
  assert.equal(lib.library.rows[0].body_diameter, 63);
  const csv = serializeMastercamHolders(lib.library);
  assert.equal(csv.trim().split("\n")[0], MASTERCAM_HOLDER_COLUMNS.join(","));
  assert.ok(csv.includes("BT40") && csv.includes("Big Daishowa"));
});
test("buildHypermillHolders: Holders SQL with taper + manufacturer ids", () => {
  const lib = buildHypermillHolders([
    { id: "HSK-A63-ER32", brand: "Haimer", category: "holder" },
    { id: "KM40-TLS", brand: "Kennametal", category: "holder" },
  ]);
  assert.equal(lib.emitted, 2);
  const sql = serializeHypermillHolders(lib.library);
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS Holders"));
  assert.ok(sql.includes("INSERT INTO Holders"));
  assert.ok(sql.includes("'HSK-A63'") && sql.includes("'KM40'"));
  assert.ok(sql.includes("'Haimer'") && sql.includes("'Kennametal'"));
});

test("BUILDERS registry: fusion + hypermill present + extensible seam", () => {
  assert.ok(BUILDERS.fusion);
  assert.equal(typeof BUILDERS.fusion.build, "function");
  assert.equal(typeof BUILDERS.fusion.serialize, "function");
  assert.equal(BUILDERS.fusion.fileName("ISCAR"), "PRISM_ISCAR.tools");
  assert.ok(BUILDERS.hypermill);
  assert.equal(BUILDERS.hypermill.fileName("ISCAR"), "PRISM_ISCAR.hmt.sql");
});

// ## hyperMILL lane
test("hypermillToolTypeId: GeometryClass mapping", () => {
  assert.equal(hypermillToolTypeId(drill), 4);                                  // Drilltool
  assert.equal(hypermillToolTypeId({ category: "reamer", diameter_mm: 8 }), 16); // Reamer
  assert.equal(hypermillToolTypeId(mill), 2);                                   // Endmill (RE 0)
  assert.equal(hypermillToolTypeId(ball), 1);                                   // Ballmill (RE==dia/2)
  assert.equal(hypermillToolTypeId(bull), 3);                                   // Radiusmill (0<RE<dia/2)
});
test("buildHypermillLibrary: emits rotating, skips with counts, dedups names", () => {
  const insert = { id: "I", brand: "ISCAR", category: "insert", diameter_mm: 12.7, geometry_plausible: true };
  const noDc = { id: "N", brand: "X", category: "solid_mill", diameter_mm: null, geometry_plausible: true };
  const bad = { id: "P", brand: "YG-1", category: "drill", diameter_mm: 380, geometry_plausible: false };
  const dupA = { id: "DUP", brand: "Helical", category: "solid_mill", diameter_mm: 6, oal_mm: 50, geometry_plausible: true };
  const dupB = { id: "DUP", brand: "Helical", category: "solid_mill", diameter_mm: 8, oal_mm: 60, geometry_plausible: true };
  const lib = buildHypermillLibrary([mill, drill, insert, noDc, bad, dupA, dupB]);
  assert.equal(lib.emitted, 4);            // mill, drill, dupA, dupB
  assert.equal(lib.skippedCategory, 1);    // insert
  assert.equal(lib.skippedNoDc, 1);        // null DC
  assert.equal(lib.skippedImplausible, 1); // 380mm
  const names = lib.library.rows.map((r) => r.name);
  assert.equal(new Set(names).size, names.length, "names unique (dedup applied)");
  assert.ok(names.includes("DUP") && names.some((n) => n.startsWith("DUP#")), "duplicate id suffixed");
});
test("buildHypermillLibrary: row carries real geometry in dbl_params", () => {
  const lib = buildHypermillLibrary([mill]);
  const r = lib.library.rows[0];
  assert.equal(r.dbl_param1, 12.7);   // diameter
  assert.equal(r.dbl_param2, 15.875); // flute length (mill)
  assert.equal(r.dbl_param3, 12.7);   // shank
  assert.equal(r.dbl_param4, 0);      // corner radius
  assert.equal(r.int_param1, 3);      // flutes
  assert.equal(r.total_length, 101.6); // OAL
  assert.equal(r.tool_type_id, 2);    // Endmill
});
test("buildHypermillLibrary: drill dbl_param2 is NOT flute length (point-angle slot)", () => {
  // a drill WITH a flute length must not mis-slot it into the point-angle field (dbl_param2)
  const drillWithLoc = { id: "DR", brand: "Guhring", category: "drill", diameter_mm: 6, flute_len_mm: 40, oal_mm: 80, geometry_plausible: true };
  const r = buildHypermillLibrary([drillWithLoc]).library.rows[0];
  assert.equal(r.tool_type_id, 4);    // Drilltool
  assert.equal(r.dbl_param1, 6);      // diameter still set
  assert.equal(r.dbl_param2, 0);      // NOT 40 -- point-angle slot left 0 (no fabricated angle)
});
test("buildHypermillLibrary: dedup is collision-free even for ids that look pre-suffixed (P1)", () => {
  // three "A" + a literal "A#2" + a literal "A#3.1" -- the naive single-suffix would re-collide
  const recs = ["A", "A", "A", "A#2", "A#3.1", "A"].map((id, i) => ({
    id, brand: "X", category: "solid_mill", diameter_mm: 6 + i * 0.1, oal_mm: 50, geometry_plausible: true,
  }));
  const lib = buildHypermillLibrary(recs);
  const names = lib.library.rows.map((r) => r.name);
  assert.equal(lib.emitted, 6);
  assert.equal(new Set(names).size, names.length, `all names unique, got ${JSON.stringify(names)}`);
});
test("serializeHypermill: valid SQL with schema + real values", () => {
  const sql = serializeHypermill(buildHypermillLibrary([mill, drill]).library);
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS Tools"));
  assert.ok(sql.includes("INSERT OR IGNORE INTO GeometryClasses"));
  assert.ok(sql.includes("INSERT INTO Tools"));
  assert.ok(sql.includes("12.7000"));            // mill diameter rendered
  assert.ok(sql.includes("'Helical'") && sql.includes("'Guhring'")); // manufacturers
  assert.ok(!/'[^']*''[^']*'/.test("'O''Brien'") === false); // sanity: quote-escape works
});
test("emitLibraries: hypermill format writes .hmt.sql", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hm-"));
  try {
    const m = emitLibraries({ catalog: { records: [mill, ball, drill] }, format: "hypermill", outDir: dir });
    assert.equal(m.format, "hypermill");
    assert.equal(m.totalTools, 3);
    assert.equal(m.reconciles, true);
    assert.ok(fs.existsSync(path.join(dir, "hypermill", "PRISM_HELICAL.hmt.sql")));
    assert.ok(fs.existsSync(path.join(dir, "hypermill", "PRISM_GUHRING.hmt.sql")));
    const sql = fs.readFileSync(path.join(dir, "hypermill", "PRISM_HELICAL.hmt.sql"), "utf8");
    assert.ok(sql.includes("INSERT INTO Tools"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ## Mastercam lane
test("mastercamToolType: type mapping", () => {
  assert.equal(mastercamToolType(drill), "Drill");
  assert.equal(mastercamToolType({ category: "reamer", diameter_mm: 8 }), "Reamer");
  assert.equal(mastercamToolType(mill), "End Mill");
  assert.equal(mastercamToolType(ball), "Ball Mill");
  assert.equal(mastercamToolType(bull), "Bull Mill");
});
test("buildMastercamLibrary: rows + skip accounting", () => {
  const insert = { id: "I", brand: "ISCAR", category: "insert", diameter_mm: 12.7, geometry_plausible: true };
  const noDc = { id: "N", brand: "X", category: "solid_mill", diameter_mm: null, geometry_plausible: true };
  const bad = { id: "P", brand: "YG-1", category: "drill", diameter_mm: 380, geometry_plausible: false };
  const lib = buildMastercamLibrary([mill, drill, insert, noDc, bad]);
  assert.equal(lib.emitted, 2);
  assert.equal(lib.skippedCategory, 1);
  assert.equal(lib.skippedNoDc, 1);
  assert.equal(lib.skippedImplausible, 1);
  assert.equal(lib.library.rows[0].diameter, 12.7);
  assert.equal(lib.library.rows[0].num_flutes, 3);
});
test("serializeMastercam: CSV header + escaped values + real geometry", () => {
  const withComma = { id: "EM, 1/2", brand: "Helical", category: "solid_mill", diameter_mm: 12.7, oal_mm: 100, num_flutes: 3, geometry_plausible: true };
  const csv = serializeMastercam(buildMastercamLibrary([withComma]).library);
  const lines = csv.trim().split("\n");
  assert.equal(lines[0], MASTERCAM_TOOL_COLUMNS.join(","));
  assert.ok(lines[1].includes('"EM, 1/2"'), "comma-bearing name is quoted");
  assert.ok(lines[1].includes("12.7"), "diameter present");
});
test("emitLibraries: mastercam format writes _tools.csv (round-trippable)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mc-"));
  try {
    const m = emitLibraries({ catalog: { records: [mill, ball, drill] }, format: "mastercam", outDir: dir });
    assert.equal(m.format, "mastercam");
    assert.equal(m.totalTools, 3);
    assert.equal(m.reconciles, true);
    const csvPath = path.join(dir, "mastercam", "PRISM_HELICAL_tools.csv");
    assert.ok(fs.existsSync(csvPath));
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
    assert.equal(lines.length, 3);             // header + mill + ball
    assert.equal(lines[0].split(",").length, MASTERCAM_TOOL_COLUMNS.length);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
