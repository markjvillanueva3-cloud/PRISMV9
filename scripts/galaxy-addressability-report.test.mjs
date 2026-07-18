// Tests for the advisory galaxy->slot addressability report (U-GALAXY-ADDRESSABILITY-REPORT,
// slot:bravo). node --test. Verifies the live CONSUMER of the slot-galaxy-map reverse resolver:
// the needs-owner backlog extraction, the render, the galaxy-dir enumeration, and the integrated
// buildReport against the REAL resolver (mill->foxtrot explicit, quality->fallback).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  listGalaxyDirs,
  needsOwnerBacklog,
  renderAddressabilityReport,
  buildReport,
} from "./galaxy-addressability-report.mjs";
import { galaxyAddressabilityReport } from "./lib/slot-galaxy-map.mjs";

// Fake fs supporting readdirSync(dir,{withFileTypes}) + existsSync(<g>/CLAUDE.md).
// `dirs` maps a dir name -> whether it contains a CLAUDE.md.
const ROOT = "/eng";
function makeFakeFs(dirs) {
  return {
    readdirSync(dir, _opts) {
      if (dir.replace(/\\/g, "/") !== ROOT) { const e = new Error(`ENOENT: ${dir}`); e.code = "ENOENT"; throw e; }
      return Object.keys(dirs).map((name) => ({ name, isDirectory: () => true }));
    },
    existsSync(p) {
      const norm = p.replace(/\\/g, "/");
      for (const [name, hasDoc] of Object.entries(dirs)) {
        if (norm === `${ROOT}/${name}/CLAUDE.md`) return hasDoc;
      }
      return false;
    },
  };
}

test("listGalaxyDirs: returns dirs WITH a CLAUDE.md, skips dot-dirs and doc-less dirs, sorted", () => {
  const fs = makeFakeFs({ mill: true, cad: true, ".claude": true, nodoc: false });
  assert.deepEqual(listGalaxyDirs({ enginesRoot: ROOT, fsImpl: fs }), ["cad", "mill"]);
});

test("listGalaxyDirs: a missing/unreadable root yields [] (never throws)", () => {
  const fs = makeFakeFs({ mill: true });
  assert.deepEqual(listGalaxyDirs({ enginesRoot: "/does-not-exist", fsImpl: fs }), []);
});

test("needsOwnerBacklog: extracts ONLY the fallback (unowned) galaxies, sorted", () => {
  const report = galaxyAddressabilityReport(["mill", "quality", "cad", "shop-floor"]);
  // mill->foxtrot + cad->delta are explicit owners; quality + shop-floor resolve via fallback.
  assert.deepEqual(needsOwnerBacklog(report), ["quality", "shop-floor"]);
});

test("needsOwnerBacklog: a null/garbage report returns [] (never throws)", () => {
  for (const bad of [null, undefined, {}, { perGalaxy: "nope" }]) {
    assert.deepEqual(needsOwnerBacklog(bad), []);
  }
});

test("renderAddressabilityReport: shows totals + a NEEDS OWNER section listing the unowned galaxies", () => {
  const report = galaxyAddressabilityReport(["mill", "quality", "shop-floor"]);
  const out = renderAddressabilityReport(report);
  assert.match(out, /galaxies=3/);
  assert.match(out, /explicit-owner=1/);          // mill->foxtrot
  assert.match(out, /fallback=2/);                // quality + shop-floor
  assert.match(out, /NEEDS OWNER \(2\)/);
  assert.match(out, /- quality/);
  assert.match(out, /- shop-floor/);
});

test("renderAddressabilityReport: reports the all-owned case with no backlog", () => {
  const report = galaxyAddressabilityReport(["mill", "cad", "lathe"]); // all have explicit owners
  const out = renderAddressabilityReport(report);
  assert.match(out, /All galaxies have an explicit owner-slot/);
  assert.doesNotMatch(out, /NEEDS OWNER/);
});

test("buildReport: integrates dir-enumeration + the REAL resolver into a report + needsOwner", () => {
  const fs = makeFakeFs({ mill: true, cad: true, quality: true, "shop-floor": true, ".claude": true, nodoc: false });
  const report = buildReport({ enginesRoot: ROOT, fsImpl: fs });
  assert.equal(report.total, 4);                  // .claude + nodoc excluded
  assert.equal(report.explicit, 2);               // mill->foxtrot, cad->delta
  assert.equal(report.fallback, 2);               // quality, shop-floor
  assert.equal(report.unaddressable, 0);
  assert.equal(report.allAddressable, true);
  assert.deepEqual(report.needsOwner, ["quality", "shop-floor"]);
});

test("buildReport: a custom fallbackSlot flows through to the resolver verdicts", () => {
  const fs = makeFakeFs({ quality: true });
  const report = buildReport({ enginesRoot: ROOT, fsImpl: fs, fallbackSlot: "golf" });
  assert.equal(report.fallback, 1);
  assert.equal(report.perGalaxy[0].slot, "golf");  // override honored
  assert.equal(report.perGalaxy[0].explicit, false);
});
