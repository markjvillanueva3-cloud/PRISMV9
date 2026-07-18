// scripts/sfc-jm-program-corpus.test.mjs
//
// Tests the SFC-domain gate + path provenance of the JM corpus harness. The
// extraction itself is covered by sfc-program-param-extract-lib.test.mjs; these
// pin the corpus-membership decisions (which programs count as SFC speed/feed
// domain). Run: `node scripts/sfc-jm-program-corpus.test.mjs`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { isNonSfc, inferFromPath } from "./sfc-jm-program-corpus.mjs";

test("isNonSfc: wire/sinker EDM, grind, waterjet, laser are excluded", () => {
  assert.equal(isNonSfc("H:/PRISM/JM DIE/WIRE EDM/QUILL.MIN", null), true);
  assert.equal(isNonSfc("H:/PRISM/JM DIE/SINKER/cav.nc", null), true);
  assert.equal(isNonSfc("x/grinder/part.min", null), true);
  assert.equal(isNonSfc("x/waterjet/p.nc", null), true);
  assert.equal(isNonSfc("x/laser/p.nc", null), true);
  // machine-category exclusion path
  assert.equal(isNonSfc("x/ambiguous/p.nc", "wire_edm"), true);
});

test("isNonSfc: mill/lathe/turn AND unknown-class cutting programs are KEPT", () => {
  // Most Okuma .MIN programs have no path hint but ARE lathe -> must be kept.
  assert.equal(isNonSfc("H:/PRISM/JM DIE/CNC LATHE/ALCOA/part.min", "lathe"), false);
  assert.equal(isNonSfc("H:/PRISM/JM DIE/CNC MILL HAAS/x.nc", "mill"), false);
  assert.equal(isNonSfc("H:/PRISM/JM DIE/Prism JM Die/anon.min", null), false); // unknown kept
  assert.equal(isNonSfc("H:/PRISM/JM DIE/QUEUE/job.min", "unknown"), false);
});

test("inferFromPath: machine class + JM topFolder provenance", () => {
  const lathe = inferFromPath("H:\\PRISM\\JM DIE\\CNC LATHE\\ALCOA\\part.min");
  assert.equal(lathe.machineCategory, "lathe");
  assert.equal(lathe.topFolder, "CNC LATHE");

  const mill = inferFromPath("H:/PRISM/JM DIE/CNC MILL HAAS/bracket.nc");
  assert.equal(mill.machineCategory, "mill");
  assert.equal(mill.topFolder, "CNC MILL HAAS");

  const okuma = inferFromPath("H:/PRISM/JM DIE/OKUMA/shaft.min");
  assert.equal(okuma.machineCategory, "lathe"); // 'okuma' -> lathe

  const unknown = inferFromPath("H:/PRISM/JM DIE/Prism JM Die/anon.min");
  assert.equal(unknown.machineCategory, null);
  assert.equal(unknown.topFolder, "Prism JM Die");
});
