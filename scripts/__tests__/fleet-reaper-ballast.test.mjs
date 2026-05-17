/**
 * fleet-reaper-ballast.test.mjs — FLEET-REAPER-MS1 / U-FR-TIER1-MEM-BALLAST.
 *
 * Verifies the critical-pressure memory ballast: the pure `ballastAction`
 * state machine + the imperative `ensureBallast` / `releaseBallast` shells +
 * the one-shot latch invariant.
 *
 * Coverage floor:
 *   - every ballastAction branch (disabled / noop / allocate / hold / release)
 *   - >= 3 failure modes (mb<=0, non-finite mb, alloc of an absurd size)
 *   - >= 2 adversarial inputs (negative/float mb, release when never allocated)
 *   - the load-bearing one-shot invariant: after a critical release the ballast
 *     is NEVER re-reserved (re-imposing the pressure just relieved)
 *   - full boot→hold→critical-release→latched lifecycle integration
 *
 * Real reference values. Allocations use mb=1 (cheap) — never 256MB; the box
 * this runs on is itself under memory pressure. Run: node --test <thisfile>
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  ballastAction,
  ensureBallast,
  releaseBallast,
  __resetBallastForTest,
  DEFAULT_BALLAST_MB,
} from "../fleet-reaper-sweep.mjs";

beforeEach(() => __resetBallastForTest());

test("default ballast size is the documented 256MB", () => {
  assert.equal(DEFAULT_BALLAST_MB, 256);
});

// ── pure ballastAction ──────────────────────────────────────────────────────

test("ballastAction: mb<=0 / non-finite → disabled", () => {
  for (const mb of [0, -1, -256, NaN, Infinity, -Infinity, null, undefined, "x"]) {
    assert.equal(
      ballastAction({ ballastMb: mb, allocated: false, released: false, pressureTier: "normal" }),
      "disabled", `mb=${String(mb)}`,
    );
  }
});

test("ballastAction: released latch short-circuits to noop (even at critical)", () => {
  assert.equal(
    ballastAction({ ballastMb: 256, allocated: false, released: true, pressureTier: "critical" }),
    "noop",
  );
  assert.equal(
    ballastAction({ ballastMb: 256, allocated: true, released: true, pressureTier: "normal" }),
    "noop",
  );
});

test("ballastAction: not-yet-allocated + non-critical → allocate", () => {
  for (const tier of ["normal", "warn"]) {
    assert.equal(
      ballastAction({ ballastMb: 256, allocated: false, released: false, pressureTier: tier }),
      "allocate", `tier=${tier}`,
    );
  }
});

test("ballastAction: allocated + non-critical → hold", () => {
  for (const tier of ["normal", "warn"]) {
    assert.equal(
      ballastAction({ ballastMb: 256, allocated: true, released: false, pressureTier: tier }),
      "hold", `tier=${tier}`,
    );
  }
});

test("ballastAction: critical + allocated → release", () => {
  assert.equal(
    ballastAction({ ballastMb: 256, allocated: true, released: false, pressureTier: "critical" }),
    "release",
  );
});

test("ballastAction: critical + never allocated → noop (nothing to hand back)", () => {
  assert.equal(
    ballastAction({ ballastMb: 256, allocated: false, released: false, pressureTier: "critical" }),
    "noop",
  );
});

test("ballastAction: float mb is truncated, stays enabled while >= 1", () => {
  assert.equal(
    ballastAction({ ballastMb: 1.9, allocated: false, released: false, pressureTier: "normal" }),
    "allocate",
  );
  // 0.9 → trunc 0 → disabled
  assert.equal(
    ballastAction({ ballastMb: 0.9, allocated: false, released: false, pressureTier: "normal" }),
    "disabled",
  );
});

test("ballastAction: undefined pressureTier degrades safely (never spurious release)", () => {
  // Integration guard: if runSweep ever handed an undefined tier, the cushion
  // must be HELD, never released (undefined !== "critical").
  assert.equal(
    ballastAction({ ballastMb: 256, allocated: true, released: false, pressureTier: undefined }),
    "hold",
  );
  assert.equal(
    ballastAction({ ballastMb: 256, allocated: false, released: false, pressureTier: undefined }),
    "allocate",
  );
});

// ── ensureBallast (imperative shell, mb=1 cheap allocs) ─────────────────────

test("ensureBallast: mb=0 disables — nothing reserved", () => {
  assert.deepEqual(ensureBallast(0), { state: "disabled", mb: 0 });
});

test("ensureBallast: mb=1 reserves, second call is idempotent (hold)", () => {
  const a = ensureBallast(1);
  assert.equal(a.state, "allocated");
  assert.equal(a.mb, 1);
  const b = ensureBallast(1); // already held — must NOT double-allocate
  assert.equal(b.state, "hold");
});

test("ensureBallast: negative/non-finite mb clamps to 0 → disabled", () => {
  assert.equal(ensureBallast(-5).state, "disabled");
  assert.equal(ensureBallast(NaN).state, "disabled");
});

test("FAILURE MODE: an absurd ballast size fails soft, never throws", () => {
  // MAX_BALLAST_MB caps at 4096; allocating 4096MB on a pressured box will
  // very likely fail — assert it is surfaced, not thrown (R12).
  const r = ensureBallast(4096);
  assert.ok(
    r.state === "allocated" || r.state === "alloc-failed",
    `unexpected state ${r.state}`,
  );
  if (r.state === "alloc-failed") assert.equal(typeof r.error, "string");
});

// ── releaseBallast + one-shot latch ─────────────────────────────────────────

test("releaseBallast: non-critical is a no-op, ballast retained", () => {
  ensureBallast(1);
  const r = releaseBallast(1, "warn");
  assert.equal(r.state, "hold");
  assert.equal(r.freedMb, 0);
});

test("releaseBallast: critical + allocated frees ~1MB and latches", () => {
  ensureBallast(1);
  const r = releaseBallast(1, "critical");
  assert.equal(r.state, "released");
  assert.equal(r.freedMb, 1);
  // latched: a subsequent critical sweep must NOT re-reserve
  assert.equal(releaseBallast(1, "critical").state, "noop");
  assert.equal(ensureBallast(1).state, "noop");
});

test("releaseBallast: critical but never allocated → noop, NOT latched", () => {
  const r = releaseBallast(1, "critical");
  assert.equal(r.state, "noop");
  assert.equal(r.freedMb, 0);
  // not latched — a later boot can still reserve once pressure clears
  assert.equal(ensureBallast(1).state, "allocated");
});

test("releaseBallast: disabled (mb=0) is always a no-op", () => {
  assert.deepEqual(releaseBallast(0, "critical"), { state: "disabled", freedMb: 0 });
});

test("releaseBallast: non-finite mb at critical → disabled, ballast retained + NOT latched", () => {
  ensureBallast(1);
  const r = releaseBallast(NaN, "critical");
  assert.equal(r.state, "disabled");
  assert.equal(r.freedMb, 0);
  // latch untouched — a valid critical sweep can still release the held cushion
  assert.equal(releaseBallast(1, "critical").state, "released");
});

test("INVARIANT: one-shot — boot→hold→critical-release→never-rearm lifecycle", () => {
  assert.equal(ensureBallast(1).state, "allocated");        // boot
  assert.equal(releaseBallast(1, "normal").state, "hold");  // calm sweeps hold
  assert.equal(releaseBallast(1, "warn").state, "hold");    // warn still holds
  assert.equal(releaseBallast(1, "critical").state, "released"); // alarm frees
  // every path after the one shot is inert — the cushion is spent
  assert.equal(releaseBallast(1, "critical").state, "noop");
  assert.equal(releaseBallast(1, "normal").state, "noop");
  assert.equal(ensureBallast(1).state, "noop");
});

test("__resetBallastForTest clears the latch between cases", () => {
  ensureBallast(1);
  releaseBallast(1, "critical");
  __resetBallastForTest();
  // fresh state — can reserve again
  assert.equal(ensureBallast(1).state, "allocated");
});
