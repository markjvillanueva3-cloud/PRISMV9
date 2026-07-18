/**
 * Tests for backfill-parametric-sidecars.mjs (slot:delta, U-CAD-PARAMETRIC-BACKFILL). backfillDir must:
 *  - write the parametric sidecar for a deterministic-template request that lacks one;
 *  - be idempotent (skip a dir that already has model.parametric.py);
 *  - skip LLM-only requests (no template) and dirs with no request.
 * Uses injected deps so no real files are touched.
 *   run: node --test scripts/backfill-parametric-sidecars.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { backfillDir } from "./backfill-parametric-sidecars.mjs";

function deps(req, { hasParam = false } = {}) {
  const writes = {};
  return {
    _writes: writes,
    readText: (p) => String(p).endsWith("request.json") ? JSON.stringify({ request: req }) : "",
    existsSync: (p) => String(p).endsWith("request.json") ? true : (String(p).endsWith("model.parametric.py") ? hasParam : false),
    writeFileSync: (p, c) => { writes[String(p).replace(/\\/g, "/").split("/").pop()] = c; },
  };
}

test("backfillDir: writes model.parametric.py + params.json for a deterministic-template request", () => {
  const d = deps("a 44.5 mm diameter cylinder 12.7 mm long");
  const r = backfillDir("/g/cyl", { write: true, deps: d });
  assert.equal(r, "written");
  assert.match(d._writes["model.parametric.py"], /^dia = 44\.5\b/m, "sidecar has the named variable");
  assert.match(d._writes["model.parametric.py"], /circle\(dia\/2\)/, "geometry uses the equation");
  assert.ok(JSON.parse(d._writes["params.json"]).parameters.length >= 2, "params.json spec written");
});

test("backfillDir: dry run reports 'written' but does not write", () => {
  const d = deps("a 50 mm cube");
  assert.equal(backfillDir("/g/cube", { write: false, deps: d }), "written");
  assert.equal(Object.keys(d._writes).length, 0, "nothing written on a dry run");
});

test("backfillDir: idempotent -- skips a dir that already has the sidecar", () => {
  assert.equal(backfillDir("/g/cyl", { write: true, deps: deps("a 50 mm cube", { hasParam: true }) }), "exists");
});

test("backfillDir: skips LLM-only (no template) + no-request dirs", () => {
  assert.equal(backfillDir("/g/blisk", { write: true, deps: deps("a turbine blisk with 48 curved blades") }), "not-deterministic");
  const noReq = { readText: () => "{}", existsSync: (p) => String(p).endsWith("request.json"), writeFileSync: () => {} };
  assert.equal(backfillDir("/g/empty", { write: true, deps: noReq }), "no-request");
});
