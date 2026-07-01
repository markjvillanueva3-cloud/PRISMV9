// Test -- drain-resources-tribal.mjs pure helpers (worklist + resume cursor).
// The orchestration (extract/chunk/generate/embed subprocesses) is impure; these
// cover the deterministic candidate-building + resume-pick that drive resumability.
// Run: node scripts/drain-resources-tribal.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { candidatePdfs, pickNext, drainPriority, pidAlive } from "./drain-resources-tribal.mjs";

test("pidAlive: this process is alive; a never-used high PID is dead; garbage is dead", () => {
  assert.equal(pidAlive(process.pid), true);   // we are obviously alive
  assert.equal(pidAlive(2147480000), false);   // implausibly-high pid -> not running
  assert.equal(pidAlive(0), false);
  assert.equal(pidAlive(null), false);
  assert.equal(pidAlive(NaN), false);
});

const ROOTS = { resources: "H:/prism/resources", "jm-die": "H:/PRISM/JM DIE" };

test("drainPriority: clean prose (0) < catalog (4) < thin drawing (8..11)", () => {
  // clean prose manual -> tier 0
  assert.equal(drainPriority({ source: "resources", relPath: "x/sandvik-machining-guide.pdf", domain: "cam" }), 0);    // clean(0) + res(0) + non-bp(0)
  assert.equal(drainPriority({ source: "resources", relPath: "x/haas-operators-manual.pdf", domain: "blueprint" }), 1); // clean(0) + res(0) + bp(1)
  assert.equal(drainPriority({ source: "jm-die", relPath: "x/machining-handbook.pdf", domain: "cam" }), 2);             // clean(0) + jm(1)*2 + non-bp(0)
  // tooling catalog -> tier 1 (after the clean manuals; huge + image-heavy)
  assert.equal(drainPriority({ source: "resources", relPath: "x/sandvik-catalog.pdf", domain: "cam" }), 4);             // cat(1)*4 + res(0) + non-bp(0)
  // thin tool drawing -> tier 2 (worst); jm-die blueprint drawing = 11
  assert.equal(drainPriority({ source: "resources", relPath: "x/H4Y4A0750.pdf", domain: "training" }), 8);             // other(2)*4 + res(0) + non-bp(0)
  assert.equal(drainPriority({ source: "jm-die", relPath: "x/SQUARE.pdf", domain: "blueprint" }), 11);                 // other(2)*4 + jm(1)*2 + bp(1)
});

test("candidatePdfs: prose manuals before thin drawings; larger first within tier", () => {
  const index = { entries: [
    { source: "jm-die", relPath: "a/SQUARE.pdf", domain: "blueprint", sizeBytes: 9 },        // worst tier
    { source: "resources", relPath: "z/H4Y4A0750.pdf", domain: "training", sizeBytes: 999 }, // drawing -> tier 4
    { source: "resources", relPath: "z/small-manual.pdf", domain: "cam", sizeBytes: 10 },    // prose, small
    { source: "resources", relPath: "z/big-manual.pdf", domain: "cam", sizeBytes: 99 },      // prose, LARGE -> first
    { source: "resources", relPath: "notes.txt", domain: "cad" },                            // non-pdf dropped
  ] };
  const c = candidatePdfs(index, ROOTS);
  assert.equal(c.length, 4);
  assert.equal(c[0].relPath, "z/big-manual.pdf");    // prose + largest
  assert.equal(c[1].relPath, "z/small-manual.pdf");  // prose + smaller
  assert.equal(c[2].relPath, "z/H4Y4A0750.pdf");     // drawing (resources) before jm-die
  assert.equal(c[3].relPath, "a/SQUARE.pdf");        // worst
});

test("candidatePdfs: missing domain defaults to manufacturing; empty index -> []", () => {
  const c = candidatePdfs({ entries: [{ source: "resources", relPath: "x.pdf" }] }, ROOTS);
  assert.equal(c[0].domain, "manufacturing");
  assert.deepEqual(candidatePdfs({}, ROOTS), []);
});

test("pickNext: returns the first N not-yet-attempted, in order (resume cursor)", () => {
  const cands = [{ abs: "a" }, { abs: "b" }, { abs: "c" }, { abs: "d" }];
  const attempted = { a: { ok: true }, c: { ok: false } }; // a,c done (incl a failed scan)
  const next = pickNext(cands, attempted, 2);
  assert.deepEqual(next.map((x) => x.abs), ["b", "d"]);
});

test("pickNext: all attempted -> [] (drain complete signal)", () => {
  const cands = [{ abs: "a" }, { abs: "b" }];
  assert.deepEqual(pickNext(cands, { a: {}, b: {} }, 5), []);
});

test("pickNext: maxPdfs caps the batch size", () => {
  const cands = Array.from({ length: 20 }, (_, i) => ({ abs: `p${i}` }));
  assert.equal(pickNext(cands, {}, 6).length, 6);
});
