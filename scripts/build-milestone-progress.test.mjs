/**
 * build-milestone-progress.test.mjs — joint-unit regex + expandCombinedIds
 *
 * Regression coverage for the silent-close-out class of bugs where ship
 * commits using joint subjects like `[INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02`
 * failed to credit one or more of the joint units in MILESTONE_PROGRESS.json.
 *
 * Two failure modes are pinned here:
 *   1. The phase-style regex did not accept `+U02` (only `+02`) after a
 *      joint marker — so the second half of every joint commit went
 *      uncredited. Fixed by relaxing the regex to `(?:\+U?\d+)*`.
 *   2. expandCombinedIds would have produced `P23-UU02` from the joint
 *      capture by blindly concatenating the leading prefix to each part.
 *      Fixed by stripping a matching letter-run from the part before
 *      reconstruction (gated by a startsWith check so all-numeric parts
 *      like `P0-U02+03` still work).
 *
 * Pure-function test — uses node:test, no vitest dependency, runs via:
 *   node --test H:/prism/scripts/build-milestone-progress.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  expandCombinedIds,
  loadMilestones,
  computeProgress,
  asStr,
} from "./build-milestone-progress.mjs";

test("legacy singleton id returns verbatim", () => {
  assert.deepEqual(expandCombinedIds("U-AIMAX07"), ["U-AIMAX07"]);
});

test("legacy joint id with digit-only second part expands", () => {
  assert.deepEqual(expandCombinedIds("U-AIMAX07+08"), [
    "U-AIMAX07",
    "U-AIMAX08",
  ]);
});

test("legacy joint id with trailing -FIX suffix strips suffix then expands", () => {
  assert.deepEqual(expandCombinedIds("U-AIMAX07+08-FIX2"), [
    "U-AIMAX07",
    "U-AIMAX08",
  ]);
});

test("phase id with digit-only second part expands", () => {
  // The original failure mode pre-fix would have produced `P0-U02` only.
  assert.deepEqual(expandCombinedIds("P0-U02+03"), ["P0-U02", "P0-U03"]);
});

test("phase id with repeated U-prefix on second part expands cleanly", () => {
  // The headline regression: pre-fix this produced `P23-UU02`.
  assert.deepEqual(expandCombinedIds("P23-U01+U02"), [
    "P23-U01",
    "P23-U02",
  ]);
});

test("phase id with three-way joint and mixed U-prefix expands", () => {
  assert.deepEqual(expandCombinedIds("P12-U03+U04+05"), [
    "P12-U03",
    "P12-U04",
    "P12-U05",
  ]);
});

test("legacy joint id with non-digit prefix does not strip non-matching letters", () => {
  // `08` doesn't startWith `AIMAX` → no strip → "U-AIMAX08" (correct).
  // Spot-check that the prefix-strip logic doesn't over-match.
  assert.deepEqual(expandCombinedIds("U-AIMAX07+08"), [
    "U-AIMAX07",
    "U-AIMAX08",
  ]);
});

test("phase id with -CLOSEOUT suffix strips suffix before expansion", () => {
  // Real-world subject from `df46405e2e`:
  //   [INTEL-OLLAMA-OBSIDIAN-MS0]/P23-U01+U02-CLOSEOUT: mark units completed
  // The regex captures `P23-U01+U02-CLOSEOUT`; expandCombinedIds strips
  // the trailing -CLOSEOUT and then expands.
  assert.deepEqual(expandCombinedIds("P23-U01+U02-CLOSEOUT"), [
    "P23-U01",
    "P23-U02",
  ]);
});

test("input without a + returns single-element array", () => {
  assert.deepEqual(expandCombinedIds("P23-U02"), ["P23-U02"]);
});

test("base without trailing digits returns trimmed input unchanged", () => {
  // Defensive: if the regex ever captured a malformed id, expandCombinedIds
  // should not throw — it should fall back to a single-element array.
  assert.deepEqual(expandCombinedIds("XYZ+02"), ["XYZ+02"]);
});

test("expandCombinedIds is a pure function (no mutation, deterministic)", () => {
  const a = expandCombinedIds("P23-U01+U02");
  const b = expandCombinedIds("P23-U01+U02");
  assert.deepEqual(a, b);
  // Mutating the returned array doesn't affect a subsequent call.
  a.push("MUTATION");
  const c = expandCombinedIds("P23-U01+U02");
  assert.deepEqual(c, ["P23-U01", "P23-U02"]);
});

// ── asStr — defensive string coercion ──────────────────────────────────────
test("asStr returns strings verbatim, coerces non-strings to null", () => {
  assert.equal(asStr("complete"), "complete");
  assert.equal(asStr(""), "");
  assert.equal(asStr(5), null);
  assert.equal(asStr({ state: "done" }), null);
  assert.equal(asStr(null), null);
  assert.equal(asStr(undefined), null);
});

// ── loadMilestones — phases[].units[] reads the unit's OWN status/commits ───
// Regression pin: the phases branch previously read status/commits ONLY from
// the top-level ms.units{} overlay (empty for pure-phases envelopes), silently
// dropping close-out flips written directly onto phases[].units[].
test("loadMilestones credits phase-unit own status + commits (no overlay)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "bmp-test-"));
  try {
    writeFileSync(
      join(dir, "TEST-PHASES-MS0.json"),
      JSON.stringify({
        id: "TEST-PHASES-MS0",
        title: "fixture",
        status: "in_progress",
        phases: [
          {
            id: "P0",
            units: [
              { id: "P0-U01", title: "flipped unit", status: "complete", commits: ["abc1234"] },
              { id: "P0-U02", title: "untouched unit" },
            ],
          },
        ],
      }),
    );
    const milestones = await loadMilestones(dir);
    const ms = milestones.find((m) => m.id === "TEST-PHASES-MS0");
    assert.ok(ms, "fixture milestone loaded");
    const u1 = ms.units.find((u) => u.id === "P0-U01");
    const u2 = ms.units.find((u) => u.id === "P0-U02");
    // Before the fix these were null / [] — the exact bug being pinned.
    assert.equal(u1.envelopeStatus, "complete");
    assert.deepEqual(u1.envelopeCommits, ["abc1234"]);
    // A unit with no own status is untouched.
    assert.equal(u2.envelopeStatus, null);
    assert.deepEqual(u2.envelopeCommits, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── computeProgress — envelope-status vs envelope-commit crediting ──────────
test("computeProgress credits envelope-status units + counts them asserted", () => {
  const milestones = [
    {
      id: "TEST-MS0",
      title: "",
      track: "",
      status: "in_progress",
      units: [
        { id: "P0-U01", title: "", phase: "P0", dependencies: [], envelopeStatus: "complete", envelopeCommits: [] },
      ],
    },
  ];
  const progress = computeProgress(milestones, new Map(), new Set());
  const ms = progress.find((p) => p.id === "TEST-MS0");
  assert.equal(ms.shipped, 1);
  assert.equal(ms.envelopeAssertedCount, 1, "envelope-status credit is flagged no-git-proof");
  assert.equal(ms.units[0].source, "envelope-status");
});

test("computeProgress credits envelope-commit units as git-proven (not asserted)", () => {
  const milestones = [
    {
      id: "TEST-MS1",
      title: "",
      track: "",
      status: "in_progress",
      units: [
        { id: "P0-U01", title: "", phase: "P0", dependencies: [], envelopeStatus: null, envelopeCommits: ["abc1234"] },
      ],
    },
  ];
  const progress = computeProgress(milestones, new Map(), new Set(["abc1234"]));
  const ms = progress.find((p) => p.id === "TEST-MS1");
  assert.equal(ms.shipped, 1);
  assert.equal(ms.envelopeAssertedCount, 0, "git-proven credit is NOT counted as envelope-asserted");
  assert.equal(ms.units[0].source, "envelope-commit");
});

// -- computeProgress: superseded units are RESOLVED, not pending (drift fix) --
// Regression pin: a milestone marked status:"completed" whose remainder is
// `superseded` (deliberately not built) must NOT trip
// "claims_completed_but_units_pending". Counting superseded as pending cry-wolfed
// on every such milestone (caught via SYSTEM-VIZ-BRAIN-MS0: 15 complete + 7
// shipped + 4 superseded = 26, falsely flagged drift).
const mkUnit = (id, envelopeStatus, envelopeCommits = []) => ({
  id, title: "", phase: "P0", dependencies: [], envelopeStatus, envelopeCommits,
});

test("computeProgress: completed milestone with superseded remainder -> consistent, pending 0", () => {
  const milestones = [{
    id: "TEST-SUP-MS0", title: "", track: "", status: "completed",
    units: [
      mkUnit("U-A", "complete"),
      mkUnit("U-B", "complete"),
      mkUnit("U-C", "superseded"),
      mkUnit("U-D", "superseded"),
    ],
  }];
  const p = computeProgress(milestones, new Map(), new Set()).find((m) => m.id === "TEST-SUP-MS0");
  assert.equal(p.shipped, 2, "only the two complete units are shipped");
  assert.equal(p.resolved, 2, "the two superseded units are resolved");
  assert.equal(p.pending, 0, "nothing genuinely pending");
  assert.equal(p.drift, "consistent", "completed + all-accounted -> no false drift");
  assert.equal(p.derivedStatus, "completed_real");
  const uC = p.units.find((u) => u.id === "U-C");
  assert.equal(uC.resolved, true);
  assert.equal(uC.shipped, false);
});

test("computeProgress: completed milestone with a genuinely-pending unit STILL drifts", () => {
  const milestones = [{
    id: "TEST-SUP-MS1", title: "", track: "", status: "completed",
    units: [mkUnit("U-A", "complete"), mkUnit("U-B", "superseded"), mkUnit("U-C", "not_started")],
  }];
  const p = computeProgress(milestones, new Map(), new Set()).find((m) => m.id === "TEST-SUP-MS1");
  assert.equal(p.shipped, 1);
  assert.equal(p.resolved, 1);
  assert.equal(p.pending, 1, "only the not_started unit is pending");
  assert.equal(p.drift, "claims_completed_but_units_pending", "real pending must still fire the flag");
});

test("computeProgress: deferred is NOT terminal-resolved (stays pending, no over-suppression)", () => {
  const milestones = [{
    id: "TEST-SUP-MS2", title: "", track: "", status: "completed",
    units: [mkUnit("U-A", "complete"), mkUnit("U-B", "deferred")],
  }];
  const p = computeProgress(milestones, new Map(), new Set()).find((m) => m.id === "TEST-SUP-MS2");
  assert.equal(p.resolved, 0, "deferred is ambiguous -> not auto-resolved");
  assert.equal(p.pending, 1);
  assert.equal(p.drift, "claims_completed_but_units_pending");
});

test("computeProgress: superseded match is case-insensitive; a real commit (shipped) wins over superseded", () => {
  const milestones = [{
    id: "TEST-SUP-MS3", title: "", track: "", status: "completed",
    units: [mkUnit("U-A", "SUPERSEDED"), mkUnit("U-B", "superseded", ["abc1234"])],
  }];
  const p = computeProgress(milestones, new Map(), new Set(["abc1234"])).find((m) => m.id === "TEST-SUP-MS3");
  const uA = p.units.find((u) => u.id === "U-A");
  const uB = p.units.find((u) => u.id === "U-B");
  assert.equal(uA.resolved, true, "upper-case SUPERSEDED is matched");
  assert.equal(uA.shipped, false);
  assert.equal(uB.shipped, true, "a reachable commit makes it shipped");
  assert.equal(uB.resolved, false, "shipped wins -> never double-counted as resolved");
  assert.equal(p.shipped, 1);
  assert.equal(p.resolved, 1);
  assert.equal(p.pending, 0);
});

test("computeProgress: all-superseded milestone (+ synonym) -> completed_real, pending 0", () => {
  const milestones = [{
    id: "TEST-SUP-MS4", title: "", track: "", status: "completed",
    units: [mkUnit("U-A", "superseded"), mkUnit("U-B", "cancelled")],
  }];
  const p = computeProgress(milestones, new Map(), new Set()).find((m) => m.id === "TEST-SUP-MS4");
  assert.equal(p.shipped, 0);
  assert.equal(p.resolved, 2, "cancelled is an accepted terminal-resolved synonym");
  assert.equal(p.pending, 0);
  assert.equal(p.derivedStatus, "completed_real");
  assert.equal(p.drift, "consistent");
});

// -- ENVELOPE_DONE: status:"shipped" is a terminal-DONE status (sibling fix) --
// A unit whose envelope status is "shipped" but which has no reachable git commit
// was previously mis-counted as pending (only complete/completed were recognized).
test("computeProgress: status:shipped with no commit is credited via envelope-status (asserted)", () => {
  const milestones = [{
    id: "TEST-SHIPPED-MS0", title: "", track: "", status: "completed",
    units: [mkUnit("U-A", "shipped")],
  }];
  const p = computeProgress(milestones, new Map(), new Set()).find((m) => m.id === "TEST-SHIPPED-MS0");
  assert.equal(p.shipped, 1, "status:shipped is terminal-DONE -> credited");
  assert.equal(p.envelopeAssertedCount, 1, "no git proof -> flagged envelope-asserted");
  assert.equal(p.units[0].source, "envelope-status");
  assert.equal(p.pending, 0);
  assert.equal(p.drift, "consistent");
});

// -- byUnitOnly cross-milestone collision guard (U-DRIFT-BYUNIT-COLLISION-FIX) --
// The (any-tag, unit-id) recovery is gated to GLOBALLY-UNIQUE unit ids. Pre-fix a
// single commit for a generic uid (P0-U01) was credited to EVERY milestone declaring
// that uid -> ~110 unstarted milestones falsely flagged completed_real (live drift
// 192 -> 22 after this fix). These tests FAIL if the gate is reverted.
test("computeProgress: non-unique uid does NOT inherit a peer milestone's commit (collision guard)", () => {
  // P0-U01 is declared by TWO milestones; only milestone A has a real commit for it.
  const milestones = [
    { id: "POST-PROCESSOR-COVERAGE-MS0", title: "", track: "", status: "in_progress",
      units: [mkUnit("P0-U01", null)] },
    { id: "ACP-MS0A", title: "", track: "", status: "not_started",
      units: [mkUnit("P0-U01", null)] },
  ];
  const shipped = new Map([
    ["POST-PROCESSOR-COVERAGE-MS0::P0-U01",
      { unitId: "P0-U01", sha: "951dc8be", date: "2026-06-01", subject: "", milestoneTag: "POST-PROCESSOR-COVERAGE-MS0" }],
  ]);
  const prog = computeProgress(milestones, shipped, new Set(["951dc8be"]));
  const a = prog.find((m) => m.id === "POST-PROCESSOR-COVERAGE-MS0");
  const b = prog.find((m) => m.id === "ACP-MS0A");
  assert.equal(a.shipped, 1, "the OWNING milestone is credited via git-exact");
  assert.equal(a.units[0].source, "git-exact");
  // THE FIX: ACP-MS0A must NOT inherit POST-PROCESSOR's P0-U01 commit.
  assert.equal(b.shipped, 0, "a peer milestone sharing the generic uid is NOT mis-credited");
  assert.equal(b.units[0].source, null);
  assert.notEqual(b.drift, "claims_not_started_but_has_shipped_units", "no false drift flag");
});

test("computeProgress: globally-UNIQUE uid still recovers a tag-drifted commit (git-unit-only)", () => {
  // U-UNIQUEXYZ is declared by exactly ONE milestone; its commit used a DRIFTED tag
  // (exact-key misses) -> the (any-tag, unit-id) fallback must still recover it.
  const milestones = [
    { id: "UNIQUE-MS0", title: "", track: "", status: "not_started",
      units: [mkUnit("U-UNIQUEXYZ", null)] },
  ];
  const shipped = new Map([
    ["SOME-DRIFTED-TAG::U-UNIQUEXYZ",
      { unitId: "U-UNIQUEXYZ", sha: "deadbeef", date: "2026-06-02", subject: "", milestoneTag: "SOME-DRIFTED-TAG" }],
  ]);
  const prog = computeProgress(milestones, shipped, new Set(["deadbeef"]));
  const m = prog.find((x) => x.id === "UNIQUE-MS0");
  assert.equal(m.shipped, 1, "unique uid recovers the tag-drifted commit");
  assert.equal(m.units[0].source, "git-unit-only");
});
