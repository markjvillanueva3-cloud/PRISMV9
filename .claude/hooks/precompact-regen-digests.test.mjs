// tier: T4
// Tests for precompact-regen-digests.mjs runRegen() pure core.
// Run: node .claude/hooks/precompact-regen-digests.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { runRegen } from "./precompact-regen-digests.mjs";

const okSpawn = () => ({ status: 0 });
const failSpawn = () => ({ status: 1 });
const throwSpawn = () => {
  throw new Error("spawn boom");
};
const presentExists = () => true;

test("happy path: helper present + exit 0 -> continue, suppressOutput, no warning", () => {
  const r = runRegen({ spawn: okSpawn, exists: presentExists, env: {} });
  assert.equal(r.continue, true);
  assert.equal(r.suppressOutput, true);
  assert.equal(r.systemMessage, undefined);
});

test("spawn is invoked with the helper path + --quiet flag", () => {
  let calledArgs = null;
  const spy = (_bin, args) => {
    calledArgs = args;
    return { status: 0 };
  };
  runRegen({ spawn: spy, exists: presentExists, env: {}, helper: "X/regen-digests.mjs" });
  assert.ok(calledArgs, "spawn must be called");
  assert.equal(calledArgs[0], "X/regen-digests.mjs");
  assert.ok(calledArgs.includes("--quiet"));
});

test("failure mode: non-zero exit -> still continues (fail-safe) but warns", () => {
  const r = runRegen({ spawn: failSpawn, exists: presentExists, env: {} });
  assert.equal(r.continue, true, "a regen failure must NEVER block the compact");
  assert.match(r.systemMessage, /non-zero exit/);
});

test("failure mode: spawn throws -> continues, no crash, no warning leak", () => {
  const r = runRegen({ spawn: throwSpawn, exists: presentExists, env: {} });
  assert.equal(r.continue, true);
  assert.equal(r.suppressOutput, true);
});

test("failure mode: helper missing -> continues + warns + does NOT spawn", () => {
  let spawned = false;
  const spy = () => {
    spawned = true;
    return { status: 0 };
  };
  const r = runRegen({ spawn: spy, exists: () => false, env: {} });
  assert.equal(r.continue, true);
  assert.match(r.systemMessage, /helper not found/);
  assert.equal(spawned, false, "must not spawn a missing helper");
});

test("disable knob: PRISM_REGEN_DIGESTS_PRECOMPACT_DISABLE=1 -> continues + does NOT spawn", () => {
  let spawned = false;
  const spy = () => {
    spawned = true;
    return { status: 0 };
  };
  const r = runRegen({ spawn: spy, exists: presentExists, env: { PRISM_REGEN_DIGESTS_PRECOMPACT_DISABLE: "1" } });
  assert.equal(r.continue, true);
  assert.equal(r.suppressOutput, true);
  assert.equal(spawned, false, "disable knob must short-circuit before spawn");
});

test("adversarial: spawn returns null -> treated as failure, still continues", () => {
  const r = runRegen({ spawn: () => null, exists: presentExists, env: {} });
  assert.equal(r.continue, true);
  assert.match(r.systemMessage, /non-zero exit/);
});

test("adversarial: spawnSync timeout shape (status:null) -> continues + warns", () => {
  // spawnSync sets status:null on timeout/signal kill.
  const r = runRegen({ spawn: () => ({ status: null, signal: "SIGTERM" }), exists: presentExists, env: {} });
  assert.equal(r.continue, true);
  assert.match(r.systemMessage, /non-zero exit/);
});

test("INVARIANT: every code path returns continue:true (fail-safe contract)", () => {
  const cases = [
    runRegen({ spawn: okSpawn, exists: presentExists, env: {} }),
    runRegen({ spawn: failSpawn, exists: presentExists, env: {} }),
    runRegen({ spawn: throwSpawn, exists: presentExists, env: {} }),
    runRegen({ spawn: okSpawn, exists: () => false, env: {} }),
    runRegen({ spawn: () => null, exists: presentExists, env: {} }),
    runRegen({ spawn: okSpawn, exists: presentExists, env: { PRISM_REGEN_DIGESTS_PRECOMPACT_DISABLE: "1" } }),
  ];
  for (const r of cases) {
    assert.equal(r.continue, true);
    assert.equal(r.suppressOutput, true);
  }
});
