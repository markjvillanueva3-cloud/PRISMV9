/**
 * fleet-reaper-soft-relief-v2.test.mjs — hermetic coverage for the
 * FLEET-REAPER-MS1 SOFT-RELIEF-V2 enhancement to selectSoftReliefTargets.
 *
 * V2 (2026-05-17): under critical pressure, ALSO trim large `owned-by-alive`
 * helper processes (≥100MB RSS by default). Closes the gap where
 * `chat-slots reclaim` converts stale→free immediately, leaving the legacy
 * stale-only filter firing targets:0 on every sweep despite 99% commit pressure.
 *
 * Pure-function tests — no spawn, no filesystem.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  selectSoftReliefTargets,
  DEFAULT_SOFT_RELIEF_AGE_SEC,
  DEFAULT_SOFT_RELIEF_ALIVE_RSS_MB,
} from "../fleet-reaper-sweep.mjs";

const MB = 1024 * 1024;
const NOW = 1_779_058_000_000;
const oldEnough = (DEFAULT_SOFT_RELIEF_AGE_SEC + 60) * 1000; // > age floor

/** Mint a classified proc record matching the snapshotFleet shape. */
function p(pid, cls, rssBytes, ageMs = oldEnough, extra = {}) {
  return {
    pid, ppid: 4, name: "node.exe",
    class: cls,
    ownerSlot: cls.startsWith("owned-by-") ? "alpha" : null,
    isCandidate: cls === "unowned" || cls === "owned-by-crashed" || cls === "leftover-bash-task",
    ageMs, rssBytes,
    ...extra,
  };
}

const snapOf = (classified) => ({ classified });

// ─── Back-compat: legacy stale-only path (V2 NOT engaged) ──────────────────

test("legacy: no criticalPressure → stale-only behavior preserved", () => {
  const snap = snapOf([
    p(100, "owned-by-stale", 50 * MB),
    p(101, "owned-by-alive", 500 * MB),
    p(102, "unowned",         500 * MB), // reap path
  ]);
  const r = selectSoftReliefTargets(snap, { softReliefAgeSec: 180, now: NOW });
  assert.equal(r.targets.length, 1);
  assert.equal(r.targets[0].pid, 100);
  assert.equal(r.targets[0].sourceClass, "owned-by-stale");
});

test("legacy: criticalPressure=true but no aliveRssThresholdBytes → V2 off", () => {
  const snap = snapOf([
    p(100, "owned-by-stale", 50 * MB),
    p(101, "owned-by-alive", 500 * MB), // would qualify if V2 were on
  ]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: null,
  });
  assert.equal(r.targets.length, 1);
  assert.equal(r.targets[0].pid, 100);
});

test("legacy: criticalPressure=true + aliveRssThresholdBytes=0 → V2 off", () => {
  // 0 is also explicitly DISABLED (the env-knob escape hatch).
  const snap = snapOf([p(101, "owned-by-alive", 500 * MB)]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 0,
  });
  assert.equal(r.targets.length, 0);
});

// ─── V2 active: alive-slot large helpers included ──────────────────────────

test("v2: criticalPressure + threshold 100MB → alive proc ≥100MB included", () => {
  const snap = snapOf([
    p(101, "owned-by-alive", 200 * MB),
  ]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 1);
  assert.equal(r.targets[0].pid, 101);
  assert.equal(r.targets[0].sourceClass, "owned-by-alive-large");
});

test("v2: alive proc BELOW threshold NOT included", () => {
  const snap = snapOf([
    p(101, "owned-by-alive", 50 * MB), // < 100MB threshold
  ]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 0);
});

test("v2: exactly AT threshold included (>= compare, not >)", () => {
  const snap = snapOf([p(101, "owned-by-alive", 100 * MB)]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 1);
});

test("v2: mixed snap — stale (any size) + alive (above threshold) both included", () => {
  const snap = snapOf([
    p(100, "owned-by-stale", 10 * MB),     // stale: always trimmed
    p(101, "owned-by-alive", 200 * MB),    // alive-large: V2 trimmed
    p(102, "owned-by-alive", 50 * MB),     // alive-small: skipped
    p(103, "unowned", 1000 * MB),          // reap path: skipped
    p(104, "owned-by-crashed", 200 * MB),  // reap path: skipped (isCandidate)
  ]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  const pids = r.targets.map((t) => t.pid).sort();
  assert.deepEqual(pids, [100, 101]);
  const sources = Object.fromEntries(r.targets.map((t) => [t.pid, t.sourceClass]));
  assert.equal(sources[100], "owned-by-stale");
  assert.equal(sources[101], "owned-by-alive-large");
});

// ─── Defense-in-depth: reap-path candidates always excluded ────────────────

test("reap-path candidates excluded even when V2 active", () => {
  const snap = snapOf([
    // Crafted owned-by-alive but marked isCandidate (shouldn't happen, but guard).
    {
      ...p(101, "owned-by-alive", 500 * MB),
      isCandidate: true,
    },
  ]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 0);
  assert.equal(r.skipped, 1);
});

// ─── Age gate applies to V2 too ────────────────────────────────────────────

test("age floor enforced on V2 targets (young alive proc skipped)", () => {
  const snap = snapOf([
    p(101, "owned-by-alive", 500 * MB, 60 * 1000), // 60s old < 180s floor
  ]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 0);
  assert.equal(r.skipped, 1);
});

test("age floor enforced on V2 targets (just-past-floor included)", () => {
  const snap = snapOf([
    p(101, "owned-by-alive", 500 * MB, 181 * 1000), // 181s > 180s floor
  ]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 1);
});

// ─── Adversarial input handling ────────────────────────────────────────────

test("adversarial: rssBytes=NaN on alive proc → skipped (Number.isFinite guard)", () => {
  const snap = snapOf([p(101, "owned-by-alive", NaN)]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 0);
});

test("adversarial: rssBytes=undefined on alive proc → skipped", () => {
  const snap = snapOf([{ ...p(101, "owned-by-alive", 0), rssBytes: undefined }]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 0);
});

test("adversarial: rssBytes=Infinity on alive proc → included (it IS finite-large)", () => {
  // Number.isFinite(Infinity) === false, so this gets skipped. Documenting.
  const snap = snapOf([p(101, "owned-by-alive", Infinity)]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 0); // Infinity isn't finite, skipped
});

test("adversarial: criticalPressure='true' (string) → V2 does NOT engage (=== check)", () => {
  const snap = snapOf([p(101, "owned-by-alive", 500 * MB)]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: "true", // truthy string, not boolean
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 0);
});

test("adversarial: aliveRssThresholdBytes=-1 → V2 off (negative rejected)", () => {
  const snap = snapOf([p(101, "owned-by-alive", 500 * MB)]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: -1,
  });
  assert.equal(r.targets.length, 0);
});

test("adversarial: aliveRssThresholdBytes=NaN → V2 off", () => {
  const snap = snapOf([p(101, "owned-by-alive", 500 * MB)]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: NaN,
  });
  assert.equal(r.targets.length, 0);
});

test("adversarial: empty snap → empty targets", () => {
  const r = selectSoftReliefTargets(snapOf([]), {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 0);
  assert.equal(r.skipped, 0);
});

test("adversarial: null snap → empty targets (defensive)", () => {
  const r = selectSoftReliefTargets(null, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 0);
});

test("adversarial: missing snap.classified → empty targets", () => {
  const r = selectSoftReliefTargets({}, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  assert.equal(r.targets.length, 0);
});

// ─── Variability: multiple slot types in one snap ──────────────────────────

test("variability: 5 alive procs across 3 slots, only those above threshold trimmed", () => {
  const snap = snapOf([
    { ...p(101, "owned-by-alive", 50 * MB), ownerSlot: "alpha" },
    { ...p(102, "owned-by-alive", 150 * MB), ownerSlot: "alpha" },  // included
    { ...p(103, "owned-by-alive", 200 * MB), ownerSlot: "bravo" },  // included
    { ...p(104, "owned-by-alive", 80 * MB),  ownerSlot: "bravo" },
    { ...p(105, "owned-by-alive", 5000 * MB), ownerSlot: "charlie" }, // included
  ]);
  const r = selectSoftReliefTargets(snap, {
    softReliefAgeSec: 180, now: NOW,
    criticalPressure: true,
    aliveRssThresholdBytes: 100 * MB,
  });
  const pids = r.targets.map((t) => t.pid).sort();
  assert.deepEqual(pids, [102, 103, 105]);
});

// ─── Constants sanity ───────────────────────────────────────────────────────

test("DEFAULT_SOFT_RELIEF_ALIVE_RSS_MB is reasonable", () => {
  // Should be in the "obvious helper bloat" range — not so small we trim all
  // alive procs, not so big we miss the actual culprits.
  assert.ok(DEFAULT_SOFT_RELIEF_ALIVE_RSS_MB >= 50 && DEFAULT_SOFT_RELIEF_ALIVE_RSS_MB <= 1024);
});
