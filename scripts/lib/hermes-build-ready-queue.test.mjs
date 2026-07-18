// Tests for the pure core of hermes-build-ready-queue.mjs (node:test, no fs/clock/env).
// Reference values mirror the LIVE build-ready-queue.json (2026-07-03): 0028 ECHO roi10,
// 0030 MIKE roi9, 0023 Ethical AI Governance roi7, 0018 Data Governance roi5.
import test from "node:test";
import assert from "node:assert/strict";
import {
  DOMAIN_SLOT_RULES, unwrapClaims, inferLead, shippedIds, builtIdsFromLedger, routeQueue,
} from "./hermes-build-ready-queue.mjs";

// A representative slice of the live queue (real ids/titles/roi).
const LIVE = {
  schemaVersion: "1.0.0",
  updatedAt: "2026-07-03T00:44:27.517Z",
  units: [
    { id: "0028", title: "DRAFT EXECUTION PACKAGE for UNIT-0028 -- ECHO Post-Processor AI / Reasoning Hardening", verdict: "VERIFIED", roi: 10, warningCount: 1, verifiedAt: "t28" },
    { id: "0030", title: "UNIT-0030 Execution Package -- MIKE Wire EDM AI / Reasoning Hardening", verdict: "VERIFIED", roi: 9, warningCount: 0, verifiedAt: "t30" },
    { id: "0023", title: "Ethical AI Governance and Regulatory Impact Assessment", verdict: "VERIFIED", roi: 7, warningCount: 0, verifiedAt: "t23" },
    { id: "0018", title: "Data Governance and Knowledge Graph Construction", verdict: "VERIFIED", roi: 5, warningCount: 0, verifiedAt: "t18" },
    { id: "0031", title: "UNIT-0031", verdict: "VERIFIED", roi: 7, warningCount: 0, verifiedAt: "t31" },
  ],
};

// ---------------------------------------------------------------------------
// inferLead
// ---------------------------------------------------------------------------
test("inferLead routes each live title to its natural lead (first-match-wins)", () => {
  assert.equal(inferLead("ECHO Post-Processor AI / Reasoning Hardening"), "echo");        // post-process before AI
  assert.equal(inferLead("MIKE Wire EDM AI / Reasoning Hardening"), "mike");              // wire edm before AI
  assert.equal(inferLead("Ethical AI Governance and Regulatory Impact Assessment"), "november"); // ethics before AI
  assert.equal(inferLead("Data Governance and Knowledge Graph Construction"), "juliett"); // data-domain before compliance
  assert.equal(inferLead("CNC Program Back-Inference Training Lane"), "india");           // pure AI/training
});
test("inferLead returns null on no keyword / null / bare id", () => {
  assert.equal(inferLead("UNIT-0031"), null);
  assert.equal(inferLead(""), null);
  assert.equal(inferLead(null), null);
  assert.equal(inferLead("Some generic phenomena package"), null);
});
test("inferLead adversarial: word-boundary guards (milliseconds !~ mill, familiar !~ mill)", () => {
  assert.equal(inferLead("optimize milliseconds of latency"), null, "'milliseconds' must not match /mill/");
  assert.equal(inferLead("a familiar refactor"), null);
});
test("inferLead adversarial: first-rule precedence on multi-domain title", () => {
  // "Lathe and Milling" -- lathe(whiskey) rule precedes mill(foxtrot); first wins, deterministic.
  assert.equal(inferLead("Lathe and Milling hybrid strategy"), "whiskey");
});
test("DOMAIN_SLOT_RULES is frozen and ends november-before-india", () => {
  assert.ok(Object.isFrozen(DOMAIN_SLOT_RULES));
  const slots = DOMAIN_SLOT_RULES.map(r => r.slot);
  assert.ok(slots.indexOf("november") < slots.indexOf("india"), "november must precede india");
  assert.ok(slots.indexOf("juliett") < slots.indexOf("november"), "juliett must precede november");
});

// ---------------------------------------------------------------------------
// unwrapClaims
// ---------------------------------------------------------------------------
test("unwrapClaims accepts wrapper or flat, degrades non-object to {}", () => {
  assert.deepEqual(unwrapClaims({ claims: { "0002": "oscar" } }), { "0002": "oscar" });
  assert.deepEqual(unwrapClaims({ "0002": "oscar" }), { "0002": "oscar" });
  assert.deepEqual(unwrapClaims(null), {});
  assert.deepEqual(unwrapClaims(42), {});
  assert.deepEqual(unwrapClaims("x"), {});
});

// ---------------------------------------------------------------------------
// shippedIds
// ---------------------------------------------------------------------------
test("shippedIds matches UNIT-<id> tokens in commit subjects", () => {
  const s = shippedIds("abc123 UNIT-0028 shipped\ndef456 [SCOPE]/U-X UNIT-0030 done");
  assert.ok(s.has("0028"));
  assert.ok(s.has("0030"));
  assert.equal(s.size, 2);
});
test("shippedIds guards against bare-number + commit-hash + 5-digit false matches", () => {
  assert.equal(shippedIds("fixed 0028 regression").size, 0, "bare number is not shipped");
  assert.equal(shippedIds("00281a2 some commit").size, 0, "commit hash is not shipped");
  assert.equal(shippedIds("UNIT-00281 typo").size, 0, "5-digit id must not match as 0028");
  assert.equal(shippedIds(null).size, 0);
});

// ---------------------------------------------------------------------------
// routeQueue
// ---------------------------------------------------------------------------
test("routeQueue (happy, live slice): leads + fleet + ROI order + totals", () => {
  const d = routeQueue({ queue: LIVE, claims: {}, shipped: new Set(), nowIso: "T", queuePath: "q" });
  assert.equal(d.totalReady, 5);
  assert.equal(d.owned.length, 0, "all live units are claims-misses");
  assert.equal(d.perSlot.echo.next.id, "0028");
  assert.equal(d.perSlot.mike.next.id, "0030");
  assert.equal(d.perSlot.november.next.id, "0023");
  assert.equal(d.perSlot.juliett.next.id, "0018");
  // 0031 has no keyword -> fleet suggestedLead null; fleet ROI-desc (0031 roi7 leads 0018? 0018 IS a lead so not in fleet)
  const fleetIds = d.fleet.map(u => u.id);
  assert.ok(fleetIds.includes("0031"));
  assert.equal(d.fleet.find(u => u.id === "0031").suggestedLead, null);
  // fleet also carries lead-suggested units (echo/mike/etc appear in BOTH perSlot and fleet)
  assert.ok(d.fleet.find(u => u.id === "0028").suggestedLead === "echo");
  // fleet ROI-desc, id-asc
  const rois = d.fleet.map(u => u.roi);
  assert.deepEqual(rois, [...rois].sort((a, b) => b - a));
  assert.equal(d.schemaVersion, "1.0.0");
  assert.ok(/NEVER auto-build/.test(d.note));
});
test("routeQueue: a claimed unit goes EXCLUSIVELY to its owner, never to fleet (failure/edge)", () => {
  const d = routeQueue({ queue: LIVE, claims: { "0028": "echo" }, shipped: new Set() });
  assert.equal(d.owned.length, 1);
  assert.equal(d.owned[0].owner, "echo");
  assert.equal(d.perSlot.echo.next.id, "0028");
  assert.equal(d.perSlot.echo.next.ownership, "owned");
  assert.ok(!d.fleet.some(u => u.id === "0028"), "owned unit must NOT appear in fleet");
});
test("routeQueue: a shipped unit is suppressed to done, absent from perSlot + fleet (self-clean)", () => {
  const d = routeQueue({ queue: LIVE, claims: {}, shipped: new Set(["0030"]) });
  assert.ok(d.done.some(u => u.id === "0030"));
  assert.equal(d.totalReady, 4);
  assert.ok(!d.perSlot.mike, "mike had only 0030 -> no slot entry after suppression");
  assert.ok(!d.fleet.some(u => u.id === "0030"));
});
test("routeQueue failure modes: null queue / missing units / absent roi never throw", () => {
  assert.equal(routeQueue({ queue: null }).totalReady, 0);
  assert.deepEqual(routeQueue({ queue: null }).perSlot, {});
  assert.equal(routeQueue({ queue: {} }).totalReady, 0);
  const noRoi = routeQueue({ queue: { units: [{ id: "0099", title: "generic" }] } });
  assert.equal(noRoi.fleet[0].roi, 0, "absent roi treated as 0, still bucketed");
});
test("routeQueue adversarial: duplicate id deduped (last-wins)", () => {
  const dup = { units: [
    { id: "0050", title: "Wire EDM v1", roi: 3 },
    { id: "0050", title: "Wire EDM v2", roi: 8 },
  ] };
  const d = routeQueue({ queue: dup });
  assert.equal(d.totalReady, 1);
  assert.equal(d.perSlot.mike.next.roi, 8, "last-wins on duplicate id");
});
test("routeQueue adversarial: owner claim on a shipped unit -- shipped wins (suppressed)", () => {
  const d = routeQueue({ queue: LIVE, claims: { "0028": "echo" }, shipped: new Set(["0028"]) });
  assert.ok(d.done.some(u => u.id === "0028"));
  assert.equal(d.owned.length, 0, "shipped precedence over claim");
});

// ---------------------------------------------------------------------------
// builtIdsFromLedger -- deterministic 2nd completion source (drains a queue the
// git-subject signal cannot, because the fleet ships `[SCOPE]/U-<id>` not `UNIT-<id>`).
// ---------------------------------------------------------------------------
test("builtIdsFromLedger: valid JSONL lines -> the set of their 4-digit ids", () => {
  const text = [
    '{"id":"0028","by":"echo","sha":"abc1234","ts":"t1"}',
    '{"id":"0030","by":"mike","ts":"t2"}',
  ].join("\n");
  assert.deepEqual([...builtIdsFromLedger(text)].sort(), ["0028", "0030"]);
});
test("builtIdsFromLedger: dedup -- the same id marked twice yields one entry", () => {
  const text = '{"id":"0028","by":"echo"}\n{"id":"0028","by":"foxtrot"}';
  assert.deepEqual([...builtIdsFromLedger(text)], ["0028"]);
});
test("builtIdsFromLedger: numeric id is coerced to its 4-digit string form", () => {
  assert.deepEqual([...builtIdsFromLedger('{"id":28}')], [], "28 is not a 4-digit token -> rejected");
  assert.deepEqual([...builtIdsFromLedger('{"id":"0028"}')], ["0028"]);
  assert.deepEqual([...builtIdsFromLedger('{"id":"  0031  "}')], ["0031"], "surrounding whitespace trimmed");
});
test("builtIdsFromLedger failure modes: empty/torn/non-object/non-4-digit are skipped (never throws)", () => {
  assert.deepEqual([...builtIdsFromLedger("")], []);
  assert.deepEqual([...builtIdsFromLedger(null)], []);
  assert.deepEqual([...builtIdsFromLedger("   \n\n")], []);
  assert.deepEqual([...builtIdsFromLedger("{not valid json")], [], "torn line skipped, no throw");
  assert.deepEqual([...builtIdsFromLedger("42\n[1,2,3]\ntrue")], [], "non-object JSON lines skipped");
  assert.deepEqual([...builtIdsFromLedger('{"id":"12345"}\n{"id":"12"}\n{"id":""}\n{}')], [], "5-digit/short/empty/absent id rejected");
  // one good line among garbage still lands
  assert.deepEqual([...builtIdsFromLedger('garbage\n{"id":"0028"}\n{broken')], ["0028"]);
});
test("routeQueue drain: a built-ledger id unions into shipped -> suppressed to done (the real fix)", () => {
  // Simulate the driver: git signal is DORMANT (fleet ships U-<id>, not UNIT-<id>) but the
  // built-ledger records 0028 built -> it MUST drain, proving the queue is drainable.
  const gitText = "e799cbcd2d [MAIN-FORCE] [POST-PROC]/U-PP-OKUMA-5AXIS: harden echo dialects\n84fafc898c [MAIN]/U-X: other";
  const ledgerText = '{"id":"0028","by":"echo","sha":"e799cbcd2d"}';
  const shipped = new Set([...shippedIds(gitText), ...builtIdsFromLedger(ledgerText)]);
  assert.equal(shippedIds(gitText).size, 0, "precondition: no UNIT- token in the fleet subjects");
  const d = routeQueue({ queue: LIVE, claims: {}, shipped });
  assert.ok(d.done.some(u => u.id === "0028"), "0028 drained via built-ledger despite dormant git signal");
  assert.equal(d.totalReady, 4, "one fewer ready than the 5-unit LIVE queue");
  assert.ok(!d.perSlot.echo || !d.perSlot.echo.units.some(u => u.id === "0028"), "0028 no longer surfaced to echo");
});
