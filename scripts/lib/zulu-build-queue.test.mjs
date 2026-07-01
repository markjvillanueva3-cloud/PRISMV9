import { test } from "node:test";
import assert from "node:assert/strict";
import {
  effortRank, idNum, parseEffort, parseCapabilitySpec, parseShipped,
  parseShippedFromCommits, computeQueue, buildQueueFromTexts,
} from "./zulu-build-queue.mjs";

const EM = String.fromCharCode(0x2014); // em-dash for markdown fixtures (source stays ASCII)

test("effortRank orders S<M<L<unknown", () => {
  assert.equal(effortRank("S"), 0);
  assert.equal(effortRank("m"), 1);
  assert.equal(effortRank(" L "), 2);
  assert.equal(effortRank(""), 3);
  assert.equal(effortRank(null), 3);
  assert.equal(effortRank("XL"), 3);
});

test("idNum extracts the numeric id; junk -> 9999", () => {
  assert.equal(idNum("C7"), 7);
  assert.equal(idNum("C12"), 12);
  assert.equal(idNum("bogus"), 9999);
  assert.equal(idNum(null), 9999);
});

test("parseEffort handles every effort token form (incl em-dash)", () => {
  assert.equal(parseEffort("blah **Est-effort:** S (3-5 days)"), "S");
  assert.equal(parseEffort("Est-effort: M"), "M");
  assert.equal(parseEffort("foo (effort L) bar"), "L");
  assert.equal(parseEffort("C1 (S -- do first)"), "S");
  assert.equal(parseEffort("C3 (M)"), "M");
  assert.equal(parseEffort(`C2 (S ${EM} keystone)`), "S");
  assert.equal(parseEffort("no effort here"), "");
});

test("parseCapabilitySpec extracts id/title/effort for -- and em-dash headers", () => {
  const spec = [
    "## Candidate Ranking",
    "### C1 -- Multi-Wave DAG Scheduler",
    "**Est-effort:** S (incremental)",
    "",
    `### C4 ${EM} Delegation Contract Engine`,
    "**Est-effort:** M (new engine)",
    "",
    "### C8 -- Outcome-Based Soul Evolution",
    "Est-effort: L",
  ].join("\n");
  const got = parseCapabilitySpec(spec);
  assert.equal(got.length, 3);
  assert.deepEqual(got[0], { id: "C1", title: "Multi-Wave DAG Scheduler", effort: "S" });
  assert.equal(got[1].id, "C4");
  assert.equal(got[1].title, "Delegation Contract Engine");
  assert.equal(got[1].effort, "M");
  assert.deepEqual(got[2], { id: "C8", title: "Outcome-Based Soul Evolution", effort: "L" });
});

test("parseCapabilitySpec on empty/garbage -> []", () => {
  assert.deepEqual(parseCapabilitySpec(""), []);
  assert.deepEqual(parseCapabilitySpec(null), []);
  assert.deepEqual(parseCapabilitySpec("no headers at all"), []);
});

test("parseShipped counts ONLY ids under the SHIPPED heading (not queue mentions)", () => {
  const brief = [
    "# Brief",
    "## SHIPPED this session",
    "- C1 ZuluWaveScheduler ... shipped",
    "- C2 ZuluTaskContinuity ... shipped",
    "- C3 ZuluFleetHealth ... shipped",
    "",
    "## REMAINING build queue",
    "- C4 Delegation Contract -- pending",
    "- C5 Back-Pressure -- pending",
  ].join("\n");
  const shipped = parseShipped(brief);
  assert.ok(shipped.has("C1") && shipped.has("C2") && shipped.has("C3"));
  // C4/C5 are in the REMAINING section -> must NOT be counted shipped.
  assert.ok(!shipped.has("C4"), "C4 mentioned in queue must not count as shipped");
  assert.ok(!shipped.has("C5"));
  assert.equal(shipped.size, 3);
});

test("parseShipped with no SHIPPED section -> empty set", () => {
  assert.equal(parseShipped("## Queue\n- C4 pending").size, 0);
  assert.equal(parseShipped("").size, 0);
});

test("parseShipped ignores inline-prose ids (the 'C8 signal' miscount regression)", () => {
  // Regression: a shipped unit's DESCRIPTION mentioning a not-yet-built unit in prose
  // (e.g. over_claim is "the C8 signal") falsely marked C8 done -> loop DRAINED early.
  // Only bullet-header ids count now.
  const brief = [
    "## SHIPPED this session",
    "- **C7 ZuluCapabilityAttestation** -- over_claim is the C8 signal C8 consumes; refs C5+C6+C7.",
    "",
    "## REMAINING build queue",
    "- C8 Soul Evolution -- pending",
  ].join("\n");
  const shipped = parseShipped(brief);
  assert.ok(shipped.has("C7"), "C7 is a shipped bullet header");
  assert.ok(!shipped.has("C8"), "C8 only in C7's prose + REMAINING -> must NOT count shipped");
  assert.ok(!shipped.has("C5") && !shipped.has("C6"), "C5/C6 only in prose -> not shipped");
  assert.equal(shipped.size, 1);
});

test("computeQueue: done/pending/blocked split + effort ranking + next", () => {
  const cands = [
    { id: "C1", title: "Wave", effort: "S" },
    { id: "C2", title: "Continuity", effort: "M" },
    { id: "C4", title: "Delegation Contract", effort: "M" },
    { id: "C5", title: "Back-Pressure", effort: "S" },
    { id: "C9", title: "Fleet-control governance enforcer", effort: "L" },
  ];
  const q = computeQueue(cands, new Set(["C1", "C2"]));
  assert.deepEqual(q.done.map((c) => c.id), ["C1", "C2"]);
  // C9 is governance-gated -> blocked, never queued.
  assert.deepEqual(q.blocked.map((c) => c.id), ["C9"]);
  // pending C5(S) before C4(M); next = C5.
  assert.deepEqual(q.pending.map((c) => c.id), ["C5", "C4"]);
  assert.equal(q.next.id, "C5");
});

test("computeQueue: all done -> next null, empty pending", () => {
  const q = computeQueue([{ id: "C1", title: "x", effort: "S" }], ["C1"]);
  assert.equal(q.next, null);
  assert.equal(q.pending.length, 0);
  assert.equal(q.done.length, 1);
});

test("computeQueue: empty candidates -> all empty, next null", () => {
  const q = computeQueue([], new Set());
  assert.equal(q.next, null);
  assert.deepEqual(q.pending, []);
});

test("buildQueueFromTexts end-to-end: spec + brief -> pending excludes shipped", () => {
  const spec = [
    "### C1 -- Wave",
    "Est-effort: S",
    "### C4 -- Delegation",
    "Est-effort: M",
    "### C5 -- Back-Pressure",
    "Est-effort: S",
  ].join("\n");
  const brief = "## SHIPPED\n- C1 shipped\n## REMAINING\n- C4\n- C5";
  const q = buildQueueFromTexts(spec, brief);
  assert.deepEqual(q.done.map((c) => c.id), ["C1"]);
  assert.deepEqual(q.pending.map((c) => c.id), ["C5", "C4"]); // C5 is S, C4 is M
  assert.equal(q.next.id, "C5");
});

test("parseShippedFromCommits extracts ids from U-ZBL-C<n> commit subjects", () => {
  const log = [
    "1602f254ba [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C8-SOUL-EVOLUTION-ADVISOR (slot:zulu): ...",
    "03b14647a4 [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C5-TRENDGATE-CONTRACT-FIX (slot:zulu): ...",
    "deadbeef00 [MAIN] some unrelated commit about C9 in prose (not a unit marker)",
  ].join("\n");
  const s = parseShippedFromCommits(log);
  assert.ok(s.has("C8") && s.has("C5"));
  assert.ok(!s.has("C9"), "a bare 'C9' in prose without the U-Z<...>-C marker must NOT count");
  assert.equal(s.size, 2);
});

test("parseShippedFromCommits handles the combined U-ZULU-CAP-C1C2C3 ship form", () => {
  const s = parseShippedFromCommits("abc U-ZULU-CAP-C1C2C3 (slot:zulu): ships three at once");
  assert.ok(s.has("C1") && s.has("C2") && s.has("C3"));
  assert.equal(s.size, 3);
});

test("parseShippedFromCommits on the live C1-C8 reality -> all eight", () => {
  // Mirrors the actual cad-fusion-live-ms0 commit log that grounds the fix.
  const log = [
    "x [ZULU-BUILDLOOP]/U-ZBL-C8-SOUL-EVOLUTION-ADVISOR",
    "x [ZULU-BUILDLOOP]/U-ZBL-C7-CAPABILITY-ATTESTATION",
    "x [ZULU-BUILDLOOP]/U-ZBL-C6-CAPABILITY-REGISTRY",
    "x [ZULU-BUILDLOOP]/U-ZBL-C5-BACKPRESSURE",
    "x [ZULU-BUILDLOOP]/U-ZBL-C4-DELEGATION",
    "x [HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C1C2C3-HERMETIC",
  ].join("\n");
  const s = parseShippedFromCommits(log);
  for (const id of ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"]) {
    assert.ok(s.has(id), `${id} must be detected from git reality`);
  }
  assert.equal(s.size, 8);
});

test("parseShippedFromCommits skips REVERT commits (a reverted unit is NOT shipped)", () => {
  // A revert un-ships the unit; counting it would make the loop skip re-building it.
  assert.equal(parseShippedFromCommits("abc REVERT U-ZBL-C8-SOUL-EVOLUTION").size, 0);
  assert.equal(parseShippedFromCommits('def Revert "U-ZULU-CAP-C1C2C3"').size, 0);
  // a revert on ONE line must not suppress a real ship on ANOTHER line.
  const log = ["x Revert U-ZBL-C8-thing", "y U-ZBL-C5-real-ship"].join("\n");
  const s = parseShippedFromCommits(log);
  assert.ok(s.has("C5") && !s.has("C8"));
  assert.equal(s.size, 1);
  // but "revert" mid-subject (prose) is a REAL ship, NOT a revert -> must count.
  const prose = parseShippedFromCommits("deadbeef [MAIN] U-ZBL-C9 add revert-safety to X");
  assert.ok(prose.has("C9"), "'revert' in subject prose must not drop a real ship");
});

test("parseShippedFromCommits detects the [HERMES-CAPABILITY-C<n>] arc format (C1-C5 real subjects)", () => {
  // The Hermes arc ships under [HERMES-CAPABILITY-C<n>]/U-C<n>-<slug>, NOT U-ZBL/U-ZULU-CAP --
  // the cron was blind to it and perpetually re-drove the already-shipped queue. Real subjects:
  const log = [
    "ccbfe4e5f4 [MAIN-FORCE] [HERMES-CAPABILITY-C5]/U-C5-BACKPRESSURE-LIVE-THROTTLE (slot:bravo): wire throttle",
    "df1f3bdde1 [MAIN-FORCE] [HERMES-CAPABILITY-C4]/U-C4-DELEGATION-LIVE-GATE (slot:bravo): wire pre-gate",
    "88037a127d [MAIN-FORCE] [HERMES-CAPABILITY-C3]/U-C3-AUCTION-LIVE-FEED (slot:bravo): live feed",
  ].join("\n");
  const s = parseShippedFromCommits(log);
  assert.ok(s.has("C3") && s.has("C4") && s.has("C5"), "all three HERMES-CAPABILITY ids detected");
  assert.equal(s.size, 3);
});

test("parseShippedFromCommits HERMES format: revert un-ships + a bare U-C<n> (no scope) never false-matches", () => {
  // A reverted HERMES-CAPABILITY commit must NOT count (the loop must re-build it).
  assert.equal(parseShippedFromCommits('abc Revert "[HERMES-CAPABILITY-C5]/U-C5-BACKPRESSURE"').size, 0);
  // PRECISION: a bare U-C<n> from an UNRELATED galaxy scope must NOT mark a capability id --
  // the detector is anchored to the HERMES-CAPABILITY scope, never the bare unit id.
  assert.equal(parseShippedFromCommits("abc [MILL-OPS]/U-C4-some-mill-unit (slot:foxtrot): face").size, 0);
  // mixed: a legacy U-ZBL ship + a HERMES ship on separate lines -> union of both.
  const mixed = ["x [ZULU-BUILDLOOP]/U-ZBL-C8-thing", "y [HERMES-CAPABILITY-C2]/U-C2-producer"].join("\n");
  const s = parseShippedFromCommits(mixed);
  assert.ok(s.has("C8") && s.has("C2"));
  assert.equal(s.size, 2);
});

test("parseShippedFromCommits adversarial: empty/null/no-marker -> empty set", () => {
  assert.equal(parseShippedFromCommits("").size, 0);
  assert.equal(parseShippedFromCommits(null).size, 0);
  assert.equal(parseShippedFromCommits("U-ZBL-FOO no C-id here").size, 0);
  assert.equal(parseShippedFromCommits("just talking about C5 and C8 casually").size, 0);
});

test("buildQueueFromTexts git-grounding: drifted/empty brief + git reality -> DRAINED", () => {
  // The live failure mode: brief unreadable ("" -> parseShipped empty) while C1-C8 shipped.
  const spec = ["### C1 -- Wave", "Est-effort: S", "### C8 -- Soul Evolution", "Est-effort: L"].join("\n");
  const gitLogText = "x U-ZULU-CAP-C1C2C3\nx U-ZBL-C8-SOUL-EVOLUTION-ADVISOR";
  const q = buildQueueFromTexts(spec, "", { gitLogText });
  assert.deepEqual(q.done.map((c) => c.id).sort(), ["C1", "C8"]);
  assert.equal(q.next, null, "git-grounded shipped detection must drain the queue");
  assert.equal(q.pending.length, 0);
});

test("buildQueueFromTexts unions brief + git shipped sources", () => {
  const spec = ["### C1 -- A", "Est-effort: S", "### C2 -- B", "Est-effort: S", "### C3 -- C", "Est-effort: S"].join("\n");
  const brief = "## SHIPPED\n- C1 shipped via brief";
  const q = buildQueueFromTexts(spec, brief, { gitLogText: "x U-ZBL-C2-THING" });
  // C1 from brief, C2 from git -> both done; only C3 pending.
  assert.deepEqual(q.done.map((c) => c.id).sort(), ["C1", "C2"]);
  assert.deepEqual(q.pending.map((c) => c.id), ["C3"]);
});

test("buildQueueFromTexts without gitLogText is the legacy brief-only path (back-compat)", () => {
  const spec = "### C1 -- A\nEst-effort: S\n### C2 -- B\nEst-effort: S";
  const q = buildQueueFromTexts(spec, "## SHIPPED\n- C1 done");
  assert.deepEqual(q.done.map((c) => c.id), ["C1"]);
  assert.deepEqual(q.pending.map((c) => c.id), ["C2"]);
});

// U-ZBL-ARTIFACT-SHIPPED: the artifact-existence signal closes the gap where a unit
// shipped under an engine-name commit is invisible to BOTH brief prose and git subjects.
test("buildQueueFromTexts honors opts.extraShipped (artifact-existence signal)", () => {
  const spec = ["### C1 -- A", "Est-effort: S", "### C2 -- B", "Est-effort: S", "### C3 -- C", "Est-effort: S"].join("\n");
  // brief + git BOTH blind (no C-tag anywhere); only the artifact set knows C1+C2 shipped.
  const q = buildQueueFromTexts(spec, "", { gitLogText: "", extraShipped: new Set(["C1", "C2"]) });
  assert.deepEqual(q.done.map((c) => c.id).sort(), ["C1", "C2"]);
  assert.deepEqual(q.pending.map((c) => c.id), ["C3"]);
});

test("buildQueueFromTexts unions extraShipped WITH brief + git (all three sources)", () => {
  const spec = ["### C1 -- A", "Est-effort: S", "### C2 -- B", "Est-effort: S", "### C3 -- C", "Est-effort: S"].join("\n");
  const q = buildQueueFromTexts(spec, "## SHIPPED\n- C1 brief", { gitLogText: "x U-ZBL-C2-THING", extraShipped: ["C3"] });
  assert.deepEqual(q.done.map((c) => c.id).sort(), ["C1", "C2", "C3"]);
  assert.equal(q.next, null); // fully DRAINED
});

test("buildQueueFromTexts extraShipped ignores falsy/non-string members (no crash)", () => {
  const spec = "### C1 -- A\nEst-effort: S\n### C2 -- B\nEst-effort: S";
  const q = buildQueueFromTexts(spec, "", { extraShipped: [null, undefined, "", "C1", 0] });
  assert.deepEqual(q.done.map((c) => c.id), ["C1"]);
  assert.deepEqual(q.pending.map((c) => c.id), ["C2"]);
});
