/**
 * Tests for build-cad-geometric-index.mjs (slot:delta, U-CAD-GEOMEMBED-INDEX). Injected readers ->
 * hermetic (no filesystem). Reference-value + intent asserts (R9): every skip REASON is distinctly
 * classified (missing/unreadable/too-big/no-geometry) so a 42%-dead corpus never silently drops rows,
 * and an indexed row carries a real GEOM_FEATURE_DIM vector + geometryClass.
 *   run: node --test scripts/build-cad-geometric-index.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { indexOne, buildIndex, readManifestPaths } from "./build-cad-geometric-index.mjs";
import { GEOM_FEATURE_DIM } from "./lib/cad-geometric-embedding.mjs";

const MM = "#1=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );";
const PRISMATIC = [
  "ISO-10303-21;", "DATA;", MM,
  "#10=CARTESIAN_POINT('',(0.,0.,0.));", "#11=CARTESIAN_POINT('',(10.,20.,30.));",
  "#20=VERTEX_POINT('',#10);", "#21=VERTEX_POINT('',#11);",
  "#40=PLANE('',#50);", "#41=PLANE('',#51);",
  "ENDSEC;", "END-ISO-10303-21;",
].join("\n");
const FREEFORM = [
  "ISO-10303-21;", "DATA;", MM,
  "#10=CARTESIAN_POINT('',(0.,0.,0.));", "#11=CARTESIAN_POINT('',(50.,50.,200.));",
  "#20=VERTEX_POINT('',#10);", "#21=VERTEX_POINT('',#11);",
  "#40=B_SPLINE_SURFACE_WITH_KNOTS('',(#1),.UNSPECIFIED.);", "#41=B_SPLINE_SURFACE_WITH_KNOTS('',(#2),.UNSPECIFIED.);",
  "#42=TOROIDAL_SURFACE('',#50,5.,1.);",
  "ENDSEC;", "END-ISO-10303-21;",
].join("\n");
const NO_GEOM = ["ISO-10303-21;", "DATA;", MM, "#10=CARTESIAN_POINT('',(0.,0.,0.));", "ENDSEC;"].join("\n");

const FILES = { "/c/a.step": PRISMATIC, "/c/b.step": FREEFORM, "/c/empty.step": NO_GEOM };
const readFileImpl = (p) => { if (p in FILES) return FILES[p]; throw new Error("ENOENT"); };
const statImpl = (p) => {
  if (p in FILES) return { size: FILES[p].length };
  if (p === "/c/big.step") return { size: 999 * 1024 * 1024 }; // huge -> too-big (checked before read)
  throw new Error("ENOENT");
};
const io = { readFileImpl, statImpl };

test("indexOne: a real prismatic part -> status indexed, GEOM_FEATURE_DIM vector, geometryClass", () => {
  const r = indexOne("/c/a.step", io);
  assert.equal(r.status, "indexed");
  assert.equal(r.geometryClass, "prismatic");
  assert.equal(r.dim, GEOM_FEATURE_DIM);
  assert.equal(r.vector.length, GEOM_FEATURE_DIM);
  assert.ok(r.vector.every((x) => Number.isFinite(x)));
  assert.equal(r.unitResolved, true, "mm unit + vertex points -> bbox resolved");
});

test("indexOne: a freeform part classifies as freeform", () => {
  assert.equal(indexOne("/c/b.step", io).geometryClass, "freeform");
});

test("indexOne: each skip reason is DISTINCTLY classified (no silent drop)", () => {
  assert.equal(indexOne("/c/gone.step", io).status, "missing", "stat throws -> missing");
  assert.equal(indexOne("/c/big.step", io).status, "too-big", "over maxBytes -> too-big (before read)");
  assert.equal(indexOne("/c/empty.step", io).status, "no-geometry", "no surface entities -> no-geometry");
  // unreadable: stat OK but read throws
  const r = indexOne("/c/x.step", { statImpl: () => ({ size: 100 }), readFileImpl: () => { throw new Error("EACCES"); } });
  assert.equal(r.status, "unreadable");
});

test("buildIndex: mixed set -> only indexed rows persisted, stats count every reason", () => {
  const paths = ["/c/a.step", "/c/b.step", "/c/empty.step", "/c/gone.step", "/c/big.step"];
  const { rows, stats } = buildIndex(paths, io);
  assert.equal(rows.length, 2, "a + b indexed; empty/gone/big skipped");
  assert.equal(stats.indexed, 2);
  assert.equal(stats.noGeometry, 1);
  assert.equal(stats.missing, 1);
  assert.equal(stats.tooBig, 1);
  assert.deepEqual(stats.byClass, { prismatic: 1, freeform: 1 });
  assert.ok(rows.every((r) => r.vector.length === GEOM_FEATURE_DIM));
});

test("buildIndex: exclude set drops broken-ref basenames (topology-audit synergy)", () => {
  const { rows, stats } = buildIndex(["/c/a.step", "/c/b.step"], { ...io, exclude: new Set(["a.step"]) });
  assert.equal(stats.excluded, 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].path, "/c/b.step");
});

test("buildIndex: limit bounds the scan", () => {
  const { stats } = buildIndex(["/c/a.step", "/c/b.step", "/c/empty.step"], { ...io, limit: 1 });
  assert.equal(stats.total, 1, "capped so a huge corpus cannot run away");
});

test("readManifestPaths: parses sourcePath rows, skips non-step + torn lines", () => {
  const manifest = [
    JSON.stringify({ sourcePath: "H:/a/x.step", ext: ".step" }),
    JSON.stringify({ sourcePath: "H:/a/y.txt", ext: ".txt" }), // non-step -> skipped
    "{ torn line",
    JSON.stringify({ sourcePath: "H:/a/z.stp" }),
  ].join("\n");
  const paths = readManifestPaths("m.jsonl", { readFileImpl: () => manifest });
  assert.deepEqual(paths, ["H:/a/x.step", "H:/a/z.stp"]);
});
