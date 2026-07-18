/**
 * Tests for fusion-claim-instance.mjs buildClaimRecord — the one new pure bit of the kilo
 * instance-claim CLI (probe + decision logic live in fusion-instance-resolver.mjs, 10/10 tested).
 * The load-bearing invariant: a claim is recorded ONLY when a port was chosen; a REFUSE
 * (chosenPort=null) must yield NO claim. kilo's port is operator-PINNED to :18361 — the claim
 * carries the pin source + the delta-owned exclusion list (reference_fusion_port_assignment_
 * kilo_18361_2026_06_02). delta's :18362 (CAD) is never kilo's.
 *
 *   node --test scripts/fusion-claim-instance.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildClaimRecord } from "./fusion-claim-instance.mjs";

const NOW = "2026-06-02T13:56:47.660Z";
// Realistic topology after the operator correction: :18361 = kilo (up), :18362 = delta CAD (4 foreign docs).
const TOPO = [
  { port: 18361, up: true, capable: false, safe: false }, // foreignDocs absent -> null (old add-in, still kilo's)
  { port: 18362, up: true, capable: true, safe: false, foreignDocs: 4 }, // delta's live CAD — never kilo's
];

test("records an operator-pinned claim for kilo's port (:18361) with injected timestamp", () => {
  const claim = buildClaimRecord(
    { chosenPort: 18361, refusal: null }, TOPO, [18361, 18365], NOW,
    { source: "operator-pin (PRISM_FUSION_KILO_PORT)", deltaPorts: [18362] },
  );
  assert.equal(claim.slot, "kilo");
  assert.equal(claim.claimedPort, 18361);
  assert.equal(claim.claimedAtIso, NOW); // deterministic — no real-clock dependence
  assert.deepEqual(claim.probedPorts, [18361, 18365]);
  assert.equal(claim.schemaVersion, "1.1.0");
  assert.match(claim.source, /operator-pin/);
  assert.deepEqual(claim.deltaOwnedPorts, [18362]);
  assert.match(claim.note, /OPERATOR-PINNED/);
  assert.match(claim.note, /18361/);
  assert.match(claim.note, /delta/i);
});

test("topology is carried with foreignDocs defaulting to null when absent", () => {
  const claim = buildClaimRecord({ chosenPort: 18361 }, TOPO, [18361, 18365], NOW);
  assert.equal(claim.topology.length, 2);
  assert.equal(claim.topology[0].foreignDocs, null); // absent -> null, never undefined
  assert.equal(claim.topology[1].foreignDocs, 4);    // delta's foreign-doc count preserved
});

test("default source (auto-detect) keeps the legacy coexistence note", () => {
  const claim = buildClaimRecord({ chosenPort: 18361 }, [], [18361], NOW);
  assert.equal(claim.source, "auto-detect");      // back-compat default when no meta passed
  assert.equal(claim.deltaOwnedPorts, null);
  assert.match(claim.note, /SCRATCH docs ONLY/);
  assert.match(claim.note, /delta/i);
  assert.deepEqual(claim.topology, []);            // empty classified -> empty topology, no throw
});

test("REFUSE (chosenPort=null) yields NO claim", () => {
  assert.equal(buildClaimRecord({ chosenPort: null, refusal: "no safe instance" }, TOPO, [18361], NOW), null);
});

test("null / missing pick yields no claim (fail-safe)", () => {
  assert.equal(buildClaimRecord(null, TOPO, [18361], NOW), null);
  assert.equal(buildClaimRecord({}, TOPO, [18361], NOW), null);
});
