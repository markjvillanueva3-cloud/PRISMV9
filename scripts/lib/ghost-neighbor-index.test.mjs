#!/usr/bin/env node
/**
 * Tests for ghost-neighbor-index.mjs (slot:india 2026-06-21).
 *
 * Real reference-value coverage (R9): hand-computed index + coverage values, happy + >=3
 * failure + >=2 adversarial per exported function. node:test convention.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildGhostNeighborIndex, ghostNeighborCoverage } from "./ghost-neighbor-index.mjs";

// wired engines w1,w2 (in stemToClass); ghost engines g1,g2 (unwired targets).
const WIRED = () => new Map([["w1", "prism_cam"], ["w2", "prism_calc"]]);
const GHOSTS = () => new Set(["g1", "g2"]);

// ---------------------------------------------------------------------------
// buildGhostNeighborIndex
// ---------------------------------------------------------------------------

test("buildGhostNeighborIndex: happy -- direct ghost->wired link (either endpoint order)", () => {
  const groups = [{
    mode: "direct",
    edges: [
      { from: "eng.x.g1", to: "eng.y.w1" }, // ghost(from) -> wired(to)
      { from: "eng.y.w2", to: "eng.x.g1" }, // wired(from) -> ghost(to): still g1->w2
    ],
  }];
  const idx = buildGhostNeighborIndex(groups, GHOSTS(), WIRED());
  assert.equal(idx.get("g1").get("w1"), 1);
  assert.equal(idx.get("g1").get("w2"), 1);
  assert.equal(idx.has("w1"), false); // wired engines are NOT keys (ghost-only targets)
});

test("buildGhostNeighborIndex: weights accumulate across types/intermediates", () => {
  const groups = [
    { mode: "direct", edges: [{ from: "eng.x.g1", to: "eng.y.w1" }] },          // +1
    { mode: "shared", edges: [
      { from: "eng.x.g1", to: "schema.s1" }, { from: "eng.y.w1", to: "schema.s1" }, // +1 (g1,w1 share s1)
    ] },
  ];
  const idx = buildGhostNeighborIndex(groups, GHOSTS(), WIRED());
  assert.equal(idx.get("g1").get("w1"), 2); // direct(1) + shared(1)
});

test("buildGhostNeighborIndex: shared-intermediate cross-links ghosts to wired only", () => {
  // s1 shared by g1(ghost), g2(ghost), w1(wired), w2(wired).
  const groups = [{
    mode: "shared",
    edges: [
      { from: "eng.x.g1", to: "schema.s1" },
      { from: "eng.x.g2", to: "schema.s1" },
      { from: "eng.y.w1", to: "schema.s1" },
      { from: "eng.y.w2", to: "schema.s1" },
    ],
  }];
  const idx = buildGhostNeighborIndex(groups, GHOSTS(), WIRED());
  // each ghost links to BOTH wired; ghost->ghost NOT linked.
  assert.equal(idx.get("g1").get("w1"), 1);
  assert.equal(idx.get("g1").get("w2"), 1);
  assert.equal(idx.get("g1").has("g2"), false); // ghost->ghost never stored
  assert.equal(idx.get("g2").get("w1"), 1);
});

test("buildGhostNeighborIndex: failure -- ghost->ghost and wired->wired direct edges skipped", () => {
  const groups = [{
    mode: "direct",
    edges: [
      { from: "eng.x.g1", to: "eng.x.g2" }, // ghost->ghost: no usable label
      { from: "eng.y.w1", to: "eng.y.w2" }, // wired->wired: not the ghost arm
    ],
  }];
  assert.equal(buildGhostNeighborIndex(groups, GHOSTS(), WIRED()).size, 0);
});

test("buildGhostNeighborIndex: failure -- non-array groups / non-Map stemToClass -> empty", () => {
  assert.equal(buildGhostNeighborIndex(null, GHOSTS(), WIRED()).size, 0);
  assert.equal(buildGhostNeighborIndex([{ mode: "direct", edges: [{ from: "eng.x.g1", to: "eng.y.w1" }] }], GHOSTS(), null).size, 0);
});

test("buildGhostNeighborIndex: failure -- unknown endpoints (neither ghost nor wired) skipped", () => {
  const groups = [{ mode: "direct", edges: [{ from: "eng.x.g1", to: "eng.z.unknown" }] }];
  assert.equal(buildGhostNeighborIndex(groups, GHOSTS(), WIRED()).size, 0); // unknown not wired -> no link
});

test("buildGhostNeighborIndex: adversarial -- a stem that is BOTH ghost and wired is treated as wired", () => {
  // g1 also appears in stemToClass -> it has a real label -> NOT a ghost target.
  const wired = new Map([["w1", "prism_cam"], ["g1", "prism_calc"]]);
  const groups = [{ mode: "direct", edges: [{ from: "eng.x.g1", to: "eng.y.w1" }] }];
  // g1 is wired now -> g1->w1 is wired->wired -> skipped; g1 is not a ghost key.
  const idx = buildGhostNeighborIndex(groups, new Set(["g1", "g2"]), wired);
  assert.equal(idx.has("g1"), false);
});

test("buildGhostNeighborIndex: adversarial -- shared-mode both-ghost-and-wired collision resolves to wired", () => {
  // g1 also has a real wired label -> it is a voting reference, NOT a ghost target, even
  // in the shared path. s1 shared by g1(now wired), g2(ghost), w1(wired).
  const wired = new Map([["w1", "prism_cam"], ["g1", "prism_calc"]]);
  const groups = [{
    mode: "shared",
    edges: [
      { from: "eng.x.g1", to: "schema.s1" },
      { from: "eng.x.g2", to: "schema.s1" },
      { from: "eng.y.w1", to: "schema.s1" },
    ],
  }];
  const idx = buildGhostNeighborIndex(groups, new Set(["g1", "g2"]), wired);
  assert.equal(idx.has("g1"), false);          // g1 is wired now -> never a ghost key
  assert.equal(idx.get("g2").get("w1"), 1);    // g2 -> w1
  assert.equal(idx.get("g2").get("g1"), 1);    // g2 -> g1 (g1 is a wired voter via its real label)
});

test("buildGhostNeighborIndex: adversarial -- uppercase ghost roster is lowercased defensively", () => {
  // edge stems are lowercased by extractStem; an UPPERCASE roster entry must still match.
  const groups = [{ mode: "direct", edges: [{ from: "eng.x.g1", to: "eng.y.w1" }] }];
  const idx = buildGhostNeighborIndex(groups, new Set(["G1", "G2"]), WIRED());
  assert.equal(idx.get("g1").get("w1"), 1); // "G1" -> "g1" matched the lowercased edge stem
});

test("buildGhostNeighborIndex: adversarial -- malformed/self edges skipped, ghostStems as array accepted", () => {
  const groups = [{ mode: "direct", edges: [null, { from: "eng.x.g1" }, { from: "eng.x.g1", to: "eng.x.g1" }, { from: "eng.x.g1", to: "eng.y.w1" }] }];
  const idx = buildGhostNeighborIndex(groups, ["g1", "g2"], WIRED()); // array, not Set
  assert.equal(idx.get("g1").get("w1"), 1);
  assert.equal(idx.get("g1").size, 1);
});

// ---------------------------------------------------------------------------
// ghostNeighborCoverage
// ---------------------------------------------------------------------------

test("ghostNeighborCoverage: happy -- exact coverage + avgNeighbors", () => {
  const idx = new Map([
    ["g1", new Map([["w1", 1], ["w2", 1]])], // covered, 2 nbrs
    ["g2", new Map()],                        // present but empty -> not covered
  ]);
  const ghosts = new Set(["g1", "g2", "g3"]); // g3 absent from index
  const r = ghostNeighborCoverage(idx, ghosts);
  assert.equal(r.total, 3);
  assert.equal(r.covered, 1);          // only g1
  assert.equal(r.coverage, 1 / 3);
  assert.equal(r.avgNeighbors, 2);     // g1 has 2 wired neighbors
});

test("ghostNeighborCoverage: failure -- empty ghost set -> null coverage", () => {
  const r = ghostNeighborCoverage(new Map(), new Set());
  assert.equal(r.total, 0);
  assert.equal(r.coverage, null);
  assert.equal(r.avgNeighbors, null);
});

test("ghostNeighborCoverage: failure -- non-Map index / non-iterable ghosts -> safe zeros", () => {
  const r = ghostNeighborCoverage(null, ["g1"]);
  assert.equal(r.total, 1);
  assert.equal(r.covered, 0);
  assert.equal(r.coverage, 0);
});

test("ghostNeighborCoverage: adversarial -- all ghosts covered -> coverage 1", () => {
  const idx = new Map([["g1", new Map([["w1", 1]])], ["g2", new Map([["w2", 3]])]]);
  const r = ghostNeighborCoverage(idx, new Set(["g1", "g2"]));
  assert.equal(r.coverage, 1);
  assert.equal(r.avgNeighbors, 1); // each has exactly 1 wired neighbor
});

test("ghostNeighborCoverage: adversarial -- uppercase roster lowercased to match index keys", () => {
  const idx = new Map([["g1", new Map([["w1", 1]])]]);
  const r = ghostNeighborCoverage(idx, new Set(["G1"])); // index keys are lowercased
  assert.equal(r.covered, 1);
  assert.equal(r.coverage, 1);
});
