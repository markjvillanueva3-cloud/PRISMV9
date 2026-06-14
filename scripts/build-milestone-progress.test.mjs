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
