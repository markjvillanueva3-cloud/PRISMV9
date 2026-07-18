// fleet-work-digest.test.mjs -- real-assertion tests for the cross-fleet work digest.
// Run: node --test scripts/fleet-work-digest.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseUnitId, trunc, isActiveSlot, buildSlotLine, composeDigest,
  resolveBranch, gitSubjects, gitLastSubject, buildModel, isSafeBranch,
} from "./fleet-work-digest.mjs";

// ---- parseUnitId ---------------------------------------------------------------------------
test("parseUnitId: [SCOPE]/U-ID: title", () => {
  assert.equal(parseUnitId("[FLEET-HYGIENE]/U-HARDENER-REGEX-FIX: fix thing"), "U-HARDENER-REGEX-FIX");
});
test("parseUnitId: [MAIN] prefix tag", () => {
  assert.equal(parseUnitId("[MAIN] [SFC]/U-FT-13: stage5"), "U-FT-13");
});
test("parseUnitId: lowercase normalizes to upper", () => {
  assert.equal(parseUnitId("[scope]/u-psa01: x"), "U-PSA01");
});
test("parseUnitId: non-unit subject -> null", () => {
  assert.equal(parseUnitId("chore: bump deps"), null);
  assert.equal(parseUnitId("Merge branch 'x'"), null);
});
test("parseUnitId: adversarial (null/number/empty) -> null", () => {
  assert.equal(parseUnitId(null), null);
  assert.equal(parseUnitId(42), null);
  assert.equal(parseUnitId(""), null);
});

// ---- trunc ---------------------------------------------------------------------------------
test("trunc: under width unchanged", () => assert.equal(trunc("abc", 10), "abc"));
test("trunc: over width gets marker", () => assert.equal(trunc("abcdef", 4), "abc~"));
test("trunc: null -> empty string, never throws", () => assert.equal(trunc(null, 5), ""));

// ---- isActiveSlot --------------------------------------------------------------------------
test("isActiveSlot: alive -> true", () => assert.equal(isActiveSlot({ status: "alive", shippedUnits: [] }), true));
test("isActiveSlot: stale -> true", () => assert.equal(isActiveSlot({ status: "stale", shippedUnits: [] }), true));
test("isActiveSlot: idle but shipped -> true", () => assert.equal(isActiveSlot({ status: "idle", shippedUnits: ["U-A"] }), true));
test("isActiveSlot: idle + no ship -> false", () => assert.equal(isActiveSlot({ status: "idle", shippedUnits: [] }), false));
test("isActiveSlot: crashed + no ship -> false", () => assert.equal(isActiveSlot({ status: "crashed", shippedUnits: [] }), false));
test("isActiveSlot: adversarial null -> false", () => assert.equal(isActiveSlot(null), false));

// ---- buildSlotLine -------------------------------------------------------------------------
test("buildSlotLine: live with topic + shipped + last", () => {
  const line = buildSlotLine({ slot: "oscar", status: "alive", topic: "sfc-stage5", shippedUnits: ["U-FT-13", "U-FT-12"], lastSubject: "[SFC]/U-FT-13: x" }, { windowH: 24, maxUnits: 4 });
  assert.match(line, /^OSCAR/);
  assert.match(line, /\[LIVE\]/);
  assert.match(line, /now: sfc-stage5/);
  assert.match(line, /shipped 2\/24h: U-FT-13,U-FT-12/);
  assert.match(line, /last: \[SFC\]\/U-FT-13/);
});
test("buildSlotLine: idle slot omits 'now:' but keeps 'last:'", () => {
  const line = buildSlotLine({ slot: "kilo", status: "idle", topic: "kilo-work", shippedUnits: [], lastSubject: "[CAM]/U-CAM-7: y" });
  assert.doesNotMatch(line, /now:/);
  assert.doesNotMatch(line, /shipped/);
  assert.match(line, /last: \[CAM\]\/U-CAM-7/);
});
test("buildSlotLine: maxUnits caps the list with +N", () => {
  const line = buildSlotLine({ slot: "x", status: "alive", topic: "t", shippedUnits: ["U-1", "U-2", "U-3", "U-4", "U-5", "U-6"], lastSubject: "z" }, { maxUnits: 4, windowH: 24 });
  assert.match(line, /U-1,U-2,U-3,U-4\+2/);
});
test("buildSlotLine: empty slot -> '(no recent activity)'", () => {
  const line = buildSlotLine({ slot: "z", status: "idle", shippedUnits: [] });
  assert.match(line, /\(no recent activity\)/);
});

// ---- composeDigest -------------------------------------------------------------------------
test("composeDigest: splits active vs idle, header present", () => {
  const slots = [
    { slot: "oscar", status: "alive", topic: "t", shippedUnits: ["U-A"], lastSubject: "[S]/U-A: x" },
    { slot: "bravo", status: "idle", shippedUnits: [], lastSubject: null },
    { slot: "kilo", status: "idle", shippedUnits: [], lastSubject: "[C]/U-K: k" },
  ];
  const md = composeDigest(slots, { windowH: 24, tsIso: "2026-06-15T00:00:00Z", maxUnits: 4 });
  assert.match(md, /# PRISM Fleet Work Digest/);
  assert.match(md, /## Active \(1\)/);
  assert.match(md, /## Idle \(2\)/);
  assert.match(md, /bravo, kilo/);
  assert.match(md, /OSCAR/);
});
test("composeDigest: zero active -> explicit none line", () => {
  const md = composeDigest([{ slot: "a", status: "idle", shippedUnits: [] }], { tsIso: "t" });
  assert.match(md, /no slots currently active/);
});
test("composeDigest: stays compact (<= 45 lines for 26 slots, 4 active)", () => {
  const slots = [];
  for (let i = 0; i < 26; i++) {
    const active = i < 4;
    slots.push({ slot: `s${i}`, status: active ? "alive" : "idle", topic: "t", shippedUnits: active ? ["U-X"] : [], lastSubject: "[S]/U-X: x" });
  }
  const md = composeDigest(slots, { tsIso: "t", windowH: 24, maxUnits: 4 });
  assert.ok(md.split("\n").length <= 45, `digest too long: ${md.split("\n").length} lines`);
});

// ---- resolveBranch -------------------------------------------------------------------------
test("resolveBranch: uses state.branch when present", () => {
  assert.equal(resolveBranch("alpha", { branch: "slot/alpha" }), "slot/alpha");
});
test("resolveBranch: falls back to slot/<name> when branch missing/dash", () => {
  assert.equal(resolveBranch("bravo", null), "slot/bravo");
  assert.equal(resolveBranch("bravo", { branch: "-" }), "slot/bravo");
  assert.equal(resolveBranch("bravo", { branch: "" }), "slot/bravo");
});

// ---- security: git option-injection guard (3-of-3 arm-C P1) --------------------------------
test("isSafeBranch: accepts plain branch names", () => {
  assert.equal(isSafeBranch("slot/alpha"), true);
  assert.equal(isSafeBranch("cad-fusion-live-ms0"), true);
  assert.equal(isSafeBranch("work/cam.exhaust_ms0"), true);
});
test("isSafeBranch: REJECTS option-injection + junk", () => {
  assert.equal(isSafeBranch("--output=/tmp/pwn"), false); // leading-dash git option
  assert.equal(isSafeBranch("-rf"), false);
  assert.equal(isSafeBranch("slot/a; rm -rf"), false);    // space/semicolon
  assert.equal(isSafeBranch("$(touch x)"), false);
  assert.equal(isSafeBranch(""), false);
  assert.equal(isSafeBranch(null), false);
  assert.equal(isSafeBranch(42), false);
});
test("resolveBranch: a malicious state.branch falls back to safe slot/<name>", () => {
  assert.equal(resolveBranch("echo", { branch: "--output=/tmp/pwn" }), "slot/echo");
  assert.equal(resolveBranch("echo", { branch: "-rf" }), "slot/echo");
});
test("gitSubjects/gitLastSubject: unsafe branch returns []/null WITHOUT invoking git", () => {
  let called = false;
  const io = { git: () => { called = true; return "x"; } };
  assert.deepEqual(gitSubjects("--output=/tmp/pwn", "since", io), []);
  assert.equal(gitLastSubject("--output=/tmp/pwn", io), null);
  assert.equal(called, false, "git must NOT be invoked for an unsafe branch");
});

// ---- gitSubjects / gitLastSubject (injected fake git, fail-soft) ---------------------------
test("gitSubjects: parses newest-first subjects", () => {
  const io = { git: () => "[S]/U-A: a\n[S]/U-B: b\n\n" };
  assert.deepEqual(gitSubjects("slot/x", "since", io), ["[S]/U-A: a", "[S]/U-B: b"]);
});
test("gitSubjects: git throw -> [] (fail-soft)", () => {
  const io = { git: () => { throw new Error("not a repo"); } };
  assert.deepEqual(gitSubjects("slot/x", "since", io), []);
});
test("gitSubjects: empty/no-branch -> []", () => {
  assert.deepEqual(gitSubjects("", "since", {}), []);
  assert.deepEqual(gitSubjects(null, "since", {}), []);
});
test("gitLastSubject: returns trimmed newest, null on throw", () => {
  assert.equal(gitLastSubject("slot/x", { git: () => "[S]/U-Z: z\n" }), "[S]/U-Z: z");
  assert.equal(gitLastSubject("slot/x", { git: () => { throw new Error("x"); } }), null);
});

// ---- buildModel (end-to-end with fake git) -------------------------------------------------
test("buildModel: composes per-slot model from snapshot + injected git", () => {
  const snapshot = {
    ok: true,
    slots: [
      { slot: "oscar", status: "alive", ageMs: 1000, state: { branch: "slot/oscar", topic: "sfc", activity: "Bash" } },
      { slot: "bravo", status: "idle", ageMs: null, state: null },
    ],
  };
  // Fake git: oscar branch has 2 unit commits; bravo branch has none.
  const io = { git: (args) => args.includes("slot/oscar") ? "[SFC]/U-FT-13: a\n[SFC]/U-FT-13: dup\n[X]/no-unit: b\n" : "" };
  const model = buildModel(snapshot, { windowH: 24, nowMs: 1_700_000_000_000, io });
  const oscar = model.find((m) => m.slot === "oscar");
  const bravo = model.find((m) => m.slot === "bravo");
  // dedup: U-FT-13 listed once; non-unit subject dropped from shippedUnits.
  assert.deepEqual(oscar.shippedUnits, ["U-FT-13"]);
  assert.equal(oscar.lastSubject, "[SFC]/U-FT-13: a");
  assert.equal(oscar.topic, "sfc");
  assert.equal(bravo.branch, "slot/bravo");
  assert.deepEqual(bravo.shippedUnits, []);
  assert.equal(isActiveSlot(oscar), true);
  assert.equal(isActiveSlot(bravo), false);
});
test("buildModel: a reverted unit is NOT counted as shipped, but stays as lastSubject", () => {
  const snapshot = {
    ok: true,
    slots: [{ slot: "delta", status: "idle", ageMs: null, state: { branch: "slot/delta" } }],
  };
  // newest is a revert of U-OLD; an earlier real ship of U-REAL stays counted.
  const io = { git: () => 'Revert "[CAD]/U-OLD: x"\nrevert: [CAD]/U-OLD2: y\n[CAD]/U-REAL: z\n' };
  const model = buildModel(snapshot, { windowH: 24, nowMs: 1_700_000_000_000, io });
  const delta = model[0];
  assert.deepEqual(delta.shippedUnits, ["U-REAL"]); // U-OLD/U-OLD2 reverts dropped
  assert.equal(delta.lastSubject, 'Revert "[CAD]/U-OLD: x"'); // newest commit still surfaced
});
