// .claude/helpers/__tests__/loop-state-allanes.test.mjs
// U-LOOP-ALLANES (2026-06-18, slot:golf): the fleet-fallback must request pick-unit's
// TRUE full-roadmap pool via --all-lanes, NOT a bare empty --slot (which pick-unit
// silently defaulted to ALPHA's lane -- reference_loop_fallback_live_peer_poach_risk_2026_06_18).
// Two layers tested:
//   (1) buildPickUnitArgs (pure, hermetic): --all-lanes emitted IFF opts.allLanes.
//   (2) pick-unit --all-lanes (subprocess, behavioral): the pool is the WHOLE roadmap
//       (slot-independent) and strictly larger than a single own-lane -- so the flag
//       genuinely bypasses lane scoping. Asserts relatively (no hardcoded roadmap size,
//       which shifts as units ship) so the test is not flaky.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

import { buildPickUnitArgs } from "../loop-state.mjs";

const REPO = path.join("H:", "prism");
const PICK = path.join(REPO, "scripts", "pick-unit.mjs");

// ---- buildPickUnitArgs (pure arg construction) ----
test("buildPickUnitArgs: --all-lanes emitted IFF opts.allLanes", () => {
  const withFlag = buildPickUnitArgs(REPO, "india", "claude-x", { allLanes: true });
  assert.ok(withFlag.includes("--all-lanes"), "must include --all-lanes when opts.allLanes");
  const withoutFlag = buildPickUnitArgs(REPO, "india", "claude-x", {});
  assert.ok(!withoutFlag.includes("--all-lanes"), "must NOT include --all-lanes by default");
  const emptyOpts = buildPickUnitArgs(REPO, "india", "claude-x");
  assert.ok(!emptyOpts.includes("--all-lanes"), "absent opts -> no --all-lanes");
});

test("buildPickUnitArgs: passes the REAL slot + chatId through (claim filter self-detection)", () => {
  const args = buildPickUnitArgs(REPO, "romeo", "claude-abc", { allLanes: true });
  const si = args.indexOf("--slot");
  assert.ok(si >= 0 && args[si + 1] === "romeo", "real slot must be passed, not empty");
  const ci = args.indexOf("--chatId");
  assert.ok(ci >= 0 && args[ci + 1] === "claude-abc", "chatId passed for PER-SLOT-CLAIM filter");
  assert.ok(args[0].endsWith("pick-unit.mjs"), "script path is first arg");
});

test("buildPickUnitArgs: empty slot omits --slot (no positional pollution)", () => {
  const args = buildPickUnitArgs(REPO, "", "claude-x", { allLanes: true });
  assert.ok(!args.includes("--slot"), "empty slot must not push a --slot arg");
});

// ---- pick-unit --all-lanes (behavioral, subprocess) ----
function pickSummary(extraArgs) {
  const r = spawnSync(process.execPath, [PICK, ...extraArgs, "--json"],
    { encoding: "utf-8", timeout: 30000, cwd: REPO });
  assert.equal(r.status, 0, `pick-unit exited ${r.status}: ${(r.stderr || "").slice(0, 200)}`);
  return JSON.parse(r.stdout).summary;
}

test("pick-unit --all-lanes: pool is the WHOLE roadmap (slot-independent) + larger than own lane", () => {
  const foxAll = pickSummary(["--slot", "foxtrot", "--all-lanes", "--chatId", "claude-test"]);
  const indiaAll = pickSummary(["--slot", "india", "--all-lanes", "--chatId", "claude-test"]);
  const foxOwn = pickSummary(["--slot", "foxtrot", "--chatId", "claude-test"]);
  // --all-lanes draws from the full roadmap regardless of slot -> identical pool size.
  assert.equal(foxAll.lane_size, indiaAll.lane_size,
    "--all-lanes must be slot-independent (full roadmap), not a per-slot lane");
  // ...and strictly larger than a single own-lane (proves it bypasses lane scoping).
  assert.ok(foxAll.lane_size > foxOwn.lane_size,
    `--all-lanes pool (${foxAll.lane_size}) must exceed foxtrot own-lane (${foxOwn.lane_size})`);
});

test("pick-unit --all-lanes: works for a 26-slot-era slot that has NO SLOT_TO_CHAT lane (no exit 3)", () => {
  // india is not in pick-unit's 7-slot SLOT_TO_CHAT map, so a plain --slot india
  // exits 3 (no lane). --all-lanes must bypass lane resolution entirely and succeed.
  const r = spawnSync(process.execPath, [PICK, "--slot", "india", "--all-lanes", "--chatId", "claude-test", "--json"],
    { encoding: "utf-8", timeout: 30000, cwd: REPO });
  assert.equal(r.status, 0, "india --all-lanes must NOT exit 3 (lane lookup bypassed)");
  assert.equal(JSON.parse(r.stdout).summary.slot, "india");
});

test("pick-unit regression: plain --slot foxtrot still scopes to its OWN lane (smaller than full)", () => {
  const foxOwn = pickSummary(["--slot", "foxtrot", "--chatId", "claude-test"]);
  const foxAll = pickSummary(["--slot", "foxtrot", "--all-lanes", "--chatId", "claude-test"]);
  assert.ok(foxOwn.lane_size < foxAll.lane_size,
    "plain --slot must remain lane-scoped (the --all-lanes change must not leak into the default path)");
});
