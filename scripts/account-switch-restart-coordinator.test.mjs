// account-switch-restart-coordinator tests (slot:bravo, hermes-zulu).
//
// Pure-core is exhaustively unit-tested with CONCRETE assertions (no toBeDefined
// stubs); the orchestration is covered by an injected-I/O E2E (readFiveHourPctFn /
// readActiveFleetFn / runSequencerFn all injected) AND a spawned CLI E2E against a
// temp PRISM_ROOT — per the PRISM "pure-core + injected readers MUST ship a
// real-data E2E" rule. The fail-loud-on-missing-5h-source path is asserted both
// in-process (throws with the right code) and via the CLI (exit 2 + JSON error).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  shouldSwitch,
  planSwitchRestart,
  thresholdFromEnv,
  composeSwitchAdvisory,
  composeAutoSwapSummary,
  resolveSwapTarget,
  readFiveHourPct,
  fiveHourFallbackFromTranscripts,
  runCoordinator,
  DEFAULT_THRESHOLD,
  SWITCH_COMMAND,
} from "./account-switch-restart-coordinator.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "account-switch-restart-coordinator.mjs");

function tmp(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }

// Build a token-budget sidecar with a given fiveHour.pct (or null quota).
function writeSidecar(dir, slot, fiveHourPct) {
  const quota = fiveHourPct === null || fiveHourPct === undefined
    ? null
    : { fiveHour: { pct: fiveHourPct, resetsAt: null }, sevenDay: { pct: null, resetsAt: null } };
  fs.writeFileSync(path.join(dir, `token-budget-${slot}.json`), JSON.stringify({
    schemaVersion: "1.0.0", slot, quota,
  }));
}

// ── shouldSwitch (the 90% gate) ──────────────────────────────────────────────
describe("shouldSwitch", () => {
  it("0.89 < 0.90 → false (below threshold)", () => {
    assert.equal(shouldSwitch(0.89, 0.90), false);
  });
  it("0.90 == 0.90 → true (at threshold, inclusive)", () => {
    assert.equal(shouldSwitch(0.90, 0.90), true);
  });
  it("0.91 > 0.90 → true (above threshold)", () => {
    assert.equal(shouldSwitch(0.91, 0.90), true);
  });
  it("NaN → false (non-finite never triggers)", () => {
    assert.equal(shouldSwitch(NaN, 0.90), false);
  });
  it("null → false (missing reading never triggers)", () => {
    assert.equal(shouldSwitch(null, 0.90), false);
  });
  it("undefined → false", () => {
    assert.equal(shouldSwitch(undefined, 0.90), false);
  });
  it("Infinity → false (non-finite)", () => {
    assert.equal(shouldSwitch(Infinity, 0.90), false);
  });
  it("negative pct → false", () => {
    assert.equal(shouldSwitch(-0.5, 0.90), false);
  });
  it("non-numeric string → false", () => {
    assert.equal(shouldSwitch("hot", 0.90), false);
  });
  it("default threshold is 0.90 — 0.95 triggers, 0.85 does not", () => {
    assert.equal(DEFAULT_THRESHOLD, 0.90);
    assert.equal(shouldSwitch(0.95), true);
    assert.equal(shouldSwitch(0.85), false);
  });
  it("non-finite threshold falls back to default 0.90", () => {
    assert.equal(shouldSwitch(0.92, NaN), true);   // 0.92 >= 0.90
    assert.equal(shouldSwitch(0.88, NaN), false);  // 0.88 <  0.90
  });
  it("custom threshold honored (0.95)", () => {
    assert.equal(shouldSwitch(0.94, 0.95), false);
    assert.equal(shouldSwitch(0.95, 0.95), true);
  });
});

// ── planSwitchRestart (restart order) ────────────────────────────────────────
describe("planSwitchRestart", () => {
  it("preserves order for known slots", () => {
    assert.deepEqual(planSwitchRestart(["alpha", "charlie", "delta"]), ["alpha", "charlie", "delta"]);
  });
  it("never restarts self", () => {
    assert.deepEqual(planSwitchRestart(["alpha", "bravo", "charlie"], { selfSlot: "bravo" }), ["alpha", "charlie"]);
  });
  it("front-loads golf (reaper first), preserving the rest", () => {
    assert.deepEqual(planSwitchRestart(["alpha", "golf", "bravo"]), ["golf", "alpha", "bravo"]);
  });
  it("dedups + lowercases", () => {
    assert.deepEqual(planSwitchRestart(["Alpha", "alpha", "BRAVO"]), ["alpha", "bravo"]);
  });
  it("drops unknown slots", () => {
    assert.deepEqual(planSwitchRestart(["alpha", "notaslot", "zzz"]), ["alpha"]);
  });
  it("empty / null / undefined → []", () => {
    assert.deepEqual(planSwitchRestart([]), []);
    assert.deepEqual(planSwitchRestart(null), []);
    assert.deepEqual(planSwitchRestart(undefined), []);
  });
  it("self-only roster → [] (nothing to restart but self)", () => {
    assert.deepEqual(planSwitchRestart(["bravo"], { selfSlot: "bravo" }), []);
  });
});

// ── thresholdFromEnv ─────────────────────────────────────────────────────────
describe("thresholdFromEnv", () => {
  it("reads PRISM_ACCT_SWITCH_PCT when valid (0,1]", () => {
    assert.equal(thresholdFromEnv({ PRISM_ACCT_SWITCH_PCT: "0.80" }), 0.80);
    assert.equal(thresholdFromEnv({ PRISM_ACCT_SWITCH_PCT: "1" }), 1);
  });
  it("falls back to 0.90 on missing / invalid / out-of-range", () => {
    assert.equal(thresholdFromEnv({}), 0.90);
    assert.equal(thresholdFromEnv({ PRISM_ACCT_SWITCH_PCT: "nope" }), 0.90);
    assert.equal(thresholdFromEnv({ PRISM_ACCT_SWITCH_PCT: "0" }), 0.90);   // 0 not > 0
    assert.equal(thresholdFromEnv({ PRISM_ACCT_SWITCH_PCT: "1.5" }), 0.90); // > 1
    assert.equal(thresholdFromEnv({ PRISM_ACCT_SWITCH_PCT: "-0.5" }), 0.90);
  });
});

// ── composeSwitchAdvisory ────────────────────────────────────────────────────
describe("composeSwitchAdvisory", () => {
  it("renders pct, threshold, command, and restart roster; flags dry-run", () => {
    const text = composeSwitchAdvisory({
      pct: 0.93, threshold: 0.90, source: "token-budget-alpha.json:quota.fiveHour.pct",
      apply: false, restartPlan: ["golf", "alpha", "charlie"],
    });
    assert.match(text, /93\.0%/);
    assert.match(text, /90%/);
    assert.ok(text.includes(SWITCH_COMMAND), "must surface the exact switch command");
    assert.match(text, /golf, alpha, charlie/);
    assert.match(text, /DRY-RUN/);
    assert.match(text, /\[acct:switch\]/);
  });
  it("apply:true → 'WILL actuate' (not dry-run)", () => {
    const text = composeSwitchAdvisory({ pct: 0.99, threshold: 0.90, source: "x", apply: true, restartPlan: ["alpha"] });
    assert.match(text, /WILL actuate/);
    assert.ok(!/DRY-RUN/.test(text));
  });
  it("empty restartPlan renders (none)", () => {
    const text = composeSwitchAdvisory({ pct: 0.9, threshold: 0.9, source: "x", apply: false, restartPlan: [] });
    assert.match(text, /\(none\)/);
  });
});

// ── readFiveHourPct (I/O) ────────────────────────────────────────────────────
describe("readFiveHourPct", () => {
  it("takes the MAX fiveHour.pct across the fleet (account-shared window)", () => {
    const dir = tmp("five-");
    writeSidecar(dir, "alpha", 0.40);
    writeSidecar(dir, "bravo", 0.92);   // hottest chat on the shared account
    writeSidecar(dir, "charlie", 0.10);
    const r = readFiveHourPct({ sidecarDir: dir, slots: ["alpha", "bravo", "charlie"] });
    assert.equal(r.pct, 0.92);
    assert.equal(r.source, "token-budget-bravo.json:quota.fiveHour.pct");
    assert.equal(r.slotsRead, 3);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("null quota on every slot → pct:null (the C5 chokepoint, surfaced not swallowed)", () => {
    const dir = tmp("five-null-");
    writeSidecar(dir, "alpha", null);
    writeSidecar(dir, "bravo", null);
    const r = readFiveHourPct({ sidecarDir: dir, slots: ["alpha", "bravo"] });
    assert.equal(r.pct, null);
    assert.equal(r.source, null);
    assert.equal(r.slotsRead, 2, "files were read — they just carried no finite pct");
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("mixed: one finite among nulls → that finite value", () => {
    const dir = tmp("five-mix-");
    writeSidecar(dir, "alpha", null);
    writeSidecar(dir, "bravo", 0.77);
    const r = readFiveHourPct({ sidecarDir: dir, slots: ["alpha", "bravo"] });
    assert.equal(r.pct, 0.77);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("corrupt sidecar is skipped, does not throw", () => {
    const dir = tmp("five-bad-");
    fs.writeFileSync(path.join(dir, "token-budget-alpha.json"), "{not json");
    writeSidecar(dir, "bravo", 0.55);
    const r = readFiveHourPct({ sidecarDir: dir, slots: ["alpha", "bravo"] });
    assert.equal(r.pct, 0.55, "the one good sidecar still reads; corrupt one ignored");
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("missing dir → pct:null, slotsRead:0 (fail-soft)", () => {
    const r = readFiveHourPct({ sidecarDir: path.join(os.tmpdir(), "no-such-dir-xyz"), slots: ["alpha"] });
    assert.equal(r.pct, null);
    assert.equal(r.slotsRead, 0);
  });
  it("scans all token-budget-*.json when no slots given", () => {
    const dir = tmp("five-scan-");
    writeSidecar(dir, "alpha", 0.30);
    writeSidecar(dir, "kilo", 0.88);
    fs.writeFileSync(path.join(dir, "unrelated.json"), "{}");        // ignored
    fs.writeFileSync(path.join(dir, "token-budget-notaslot.json"), JSON.stringify({ quota: { fiveHour: { pct: 0.99 } } })); // dropped (not a SLOT_NAME)
    const r = readFiveHourPct({ sidecarDir: dir });
    assert.equal(r.pct, 0.88, "notaslot's 0.99 must be dropped (not a real slot)");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

// ── runCoordinator (injected-I/O E2E) ────────────────────────────────────────
describe("runCoordinator (injected I/O)", () => {
  const noSleep = () => Promise.resolve();
  function clock(stepMs) { let t = 0; return () => (t += stepMs); }

  it("FAILS LOUD when the 5h source is null (never silently skips)", async () => {
    await assert.rejects(
      () => runCoordinator({
        slots: ["alpha", "bravo"],
        readFiveHourPctFn: () => ({ pct: null, source: null, perSlot: {}, slotsRead: 2 }),
        runSequencerFn: () => { throw new Error("must NOT reach the restart on a null source"); },
      }),
      (e) => {
        assert.equal(e.code, "FIVE_HOUR_SOURCE_UNAVAILABLE");
        assert.equal(e.slotsRead, 2);
        assert.match(e.message, /5h-usage source unavailable/);
        return true;
      },
    );
  });

  it("below threshold → switched:false, no restart driven", async () => {
    let restartCalled = false;
    const out = await runCoordinator({
      slots: ["alpha", "bravo"],
      threshold: 0.90,
      readFiveHourPctFn: () => ({ pct: 0.80, source: "token-budget-alpha.json:quota.fiveHour.pct", slotsRead: 2 }),
      runSequencerFn: () => { restartCalled = true; return { plan: [], results: [], summary: {} }; },
    });
    assert.equal(out.switched, false);
    assert.equal(out.reason, "below-threshold");
    assert.equal(out.fiveHourPct, 0.80);
    assert.equal(restartCalled, false, "no restart below threshold");
    assert.equal(out.advisory, null);
  });

  it("at/above threshold (dry-run default) → switched:true, advisory emitted, restart in dry-run", async () => {
    let seqOpts = null;
    const out = await runCoordinator({
      slots: ["alpha", "golf", "bravo"],
      selfSlot: "bravo",
      threshold: 0.90,
      readFiveHourPctFn: () => ({ pct: 0.93, source: "token-budget-alpha.json:quota.fiveHour.pct", slotsRead: 3 }),
      runSequencerFn: (o) => { seqOpts = o; return { plan: ["golf", "alpha"], results: [], summary: { woke: 0, dryRun: 2 } }; },
      now: clock(1), sleep: noSleep,
    });
    assert.equal(out.switched, true);
    assert.equal(out.apply, false);
    assert.equal(out.reason, "at-or-above-threshold");
    assert.equal(out.fiveHourPct, 0.93);
    // never-restart-self honored + golf front-loaded in the plan handed off
    assert.deepEqual(out.restartPlan, ["golf", "alpha"]);
    // the restart handoff ran in DRY-RUN (confirm:false) because --apply absent
    assert.equal(seqOpts.confirm, false, "restart must be dry-run unless --apply");
    assert.equal(seqOpts.selfSlot, "bravo", "self-exclusion forwarded to the sequencer");
    assert.deepEqual(seqOpts.slots, ["alpha", "golf", "bravo"]);
    assert.ok(out.advisory.includes(SWITCH_COMMAND));
    assert.match(out.advisory, /DRY-RUN/);
    assert.equal(out.switchCommand, SWITCH_COMMAND);
  });

  it("apply:true → restart handoff actuates (confirm:true forwarded)", async () => {
    let seqOpts = null;
    const out = await runCoordinator({
      slots: ["alpha", "charlie"],
      apply: true,
      threshold: 0.90,
      readFiveHourPctFn: () => ({ pct: 0.97, source: "x", slotsRead: 2 }),
      runSequencerFn: (o) => { seqOpts = o; return { plan: ["alpha", "charlie"], results: [], summary: { woke: 2 } }; },
      now: clock(1), sleep: noSleep,
    });
    assert.equal(out.switched, true);
    assert.equal(out.apply, true);
    assert.equal(seqOpts.confirm, true, "--apply must actuate the staggered restart");
    assert.match(out.advisory, /WILL actuate/);
  });

  it("uses active-fleet reader when no explicit slots given", async () => {
    let fleetReadCalled = false;
    const out = await runCoordinator({
      threshold: 0.90,
      readActiveFleetFn: () => { fleetReadCalled = true; return ["alpha", "delta"]; },
      readFiveHourPctFn: (o) => {
        // the roster from the fleet reader must be forwarded to the 5h reader
        assert.deepEqual(o.slots, ["alpha", "delta"]);
        return { pct: 0.50, source: "x", slotsRead: 2 };
      },
      runSequencerFn: () => ({ plan: [], results: [], summary: {} }),
    });
    assert.equal(fleetReadCalled, true);
    assert.equal(out.switched, false);
  });

  it("threshold falls back to env when not passed explicitly", async () => {
    const out = await runCoordinator({
      slots: ["alpha"],
      env: { PRISM_ACCT_SWITCH_PCT: "0.50" },
      readFiveHourPctFn: () => ({ pct: 0.55, source: "x", slotsRead: 1 }),
      runSequencerFn: () => ({ plan: ["alpha"], results: [], summary: {} }),
      now: clock(1), sleep: noSleep,
    });
    assert.equal(out.threshold, 0.50);
    assert.equal(out.switched, true, "0.55 >= env threshold 0.50 → switch");
  });
});

// ── composeAutoSwapSummary (pure) ────────────────────────────────────────────
describe("composeAutoSwapSummary", () => {
  it("dry-run renders the planned swap + restart roster", () => {
    const t = composeAutoSwapSummary({ from: "account-1", to: "account-2", apply: false, dryRun: true, restartPlan: ["golf", "alpha"] });
    assert.match(t, /DRY-RUN/);
    assert.match(t, /account-1 -> account-2/);
    assert.match(t, /golf, alpha/);
    assert.match(t, /\[acct:switch\] auto-swap \(U2\)/);
  });
  it("actuated renders the live-credential pointer", () => {
    const t = composeAutoSwapSummary({ from: "account-1", to: "account-2", apply: true, dryRun: false, restartPlan: ["alpha"] });
    assert.match(t, /ACTUATED/);
    assert.match(t, /live ~\/\.claude\/\.credentials\.json now points at account-2/);
    assert.ok(!/DRY-RUN/.test(t));
  });
  it("empty restartPlan → (none)", () => {
    assert.match(composeAutoSwapSummary({ from: null, to: "account-2", apply: false, dryRun: true, restartPlan: [] }), /\(none\)/);
  });
});

// ── resolveSwapTarget (I/O over a temp accounts root) ────────────────────────
describe("resolveSwapTarget", () => {
  // Minimal accounts-root fixture matching the real claude-account-lib on-disk
  // contract: ROTATION_ORDER.json = bare JSON array; ACTIVE = plain-text file
  // holding `account-N`; credential snapshot = <name>/.credentials.json (opaque
  // blob — shape is irrelevant to resolveSwapTarget, which only checks existence
  // + non-empty size).
  function acctRoot(order, active, capturedNames) {
    const root = tmp("acct-root-");
    if (order) fs.writeFileSync(path.join(root, "ROTATION_ORDER.json"), JSON.stringify(order));
    if (active) fs.writeFileSync(path.join(root, "ACTIVE"), active + "\n");
    for (const n of capturedNames || []) {
      const dir = path.join(root, n);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, ".credentials.json"), JSON.stringify({ blob: n }));
    }
    return root;
  }
  it("ready: distinct next account WITH a captured credential → canAutoSwap:true", () => {
    const root = acctRoot(["account-1", "account-2"], "account-1", ["account-1", "account-2"]);
    const r = resolveSwapTarget({ accountsRoot: root });
    assert.equal(r.canAutoSwap, true);
    assert.equal(r.active, "account-1");
    assert.equal(r.next, "account-2");
    fs.rmSync(root, { recursive: true, force: true });
  });
  it("next account NOT captured → canAutoSwap:false, actionable reason", () => {
    const root = acctRoot(["account-1", "account-2"], "account-1", ["account-1"]); // account-2 not captured
    const r = resolveSwapTarget({ accountsRoot: root });
    assert.equal(r.canAutoSwap, false);
    assert.equal(r.next, "account-2");
    assert.match(r.reason, /no captured credential/);
    fs.rmSync(root, { recursive: true, force: true });
  });
  it("no ROTATION_ORDER (single account) → canAutoSwap:false", () => {
    const root = acctRoot(null, "account-1", ["account-1"]);
    const r = resolveSwapTarget({ accountsRoot: root });
    assert.equal(r.canAutoSwap, false);
    assert.match(r.reason, /no-rotation-order/);
    fs.rmSync(root, { recursive: true, force: true });
  });
  it("missing accounts root → fail-soft canAutoSwap:false (never throws)", () => {
    const r = resolveSwapTarget({ accountsRoot: path.join(os.tmpdir(), "no-such-accts-xyz") });
    assert.equal(r.canAutoSwap, false);
  });
});

// ── runCoordinator auto-swap wiring (injected swap + resolve) ─────────────────
describe("runCoordinator (auto-swap U2 wiring)", () => {
  const baseTrip = {
    slots: ["alpha", "charlie"],
    threshold: 0.90,
    readFiveHourPctFn: () => ({ pct: 0.95, source: "x", slotsRead: 2 }),
    runSequencerFn: () => ({ plan: ["alpha", "charlie"], results: [], summary: {} }),
  };

  it("autoSwap NOT opted in → swap:null, classic advisory (back-compat)", async () => {
    const out = await runCoordinator({ ...baseTrip });
    assert.equal(out.switched, true);
    assert.equal(out.swap, null);
    assert.ok(out.advisory.includes(SWITCH_COMMAND), "advisory still surfaces the switch command");
  });

  it("autoSwap + canAutoSwap → swap actuated (dry-run), auto-swap summary, restart still runs", async () => {
    let swapArgs = null, restartCalled = false;
    const out = await runCoordinator({
      ...baseTrip,
      autoSwap: true,
      resolveSwapTargetFn: () => ({ active: "account-1", next: "account-2", canAutoSwap: true, reason: "ready" }),
      swapAccountFn: (o) => { swapArgs = o; return { ok: true, from: "account-1", to: "account-2", dryRun: o.dryRun, restartRequired: true }; },
      runSequencerFn: () => { restartCalled = true; return { plan: ["alpha", "charlie"], results: [], summary: {} }; },
    });
    assert.equal(out.swap.ok, true);
    assert.equal(out.swap.to, "account-2");
    assert.equal(out.swap.mode, "dry-run");      // apply absent → dry-run swap
    assert.equal(swapArgs.accountName, "account-2");
    assert.equal(swapArgs.dryRun, true);
    assert.equal(swapArgs.trigger, "five-hour-90pct");
    assert.match(out.advisory, /auto-swap \(U2\)/);
    assert.equal(restartCalled, true, "restart still runs after the (dry-run) swap");
  });

  it("autoSwap + --apply → swap actuated for real (dryRun:false forwarded)", async () => {
    let swapArgs = null;
    const out = await runCoordinator({
      ...baseTrip,
      apply: true,
      autoSwap: true,
      resolveSwapTargetFn: () => ({ active: "account-1", next: "account-2", canAutoSwap: true, reason: "ready" }),
      swapAccountFn: (o) => { swapArgs = o; return { ok: true, from: "account-1", to: "account-2", dryRun: o.dryRun }; },
    });
    assert.equal(swapArgs.dryRun, false, "--apply forwards a real swap");
    assert.equal(out.swap.mode, "actuated");
    assert.match(out.advisory, /ACTUATED/);
  });

  it("autoSwap requested but next account un-captured → advisory fallback w/ reason, no swap", async () => {
    let swapCalled = false;
    const out = await runCoordinator({
      ...baseTrip,
      autoSwap: true,
      resolveSwapTargetFn: () => ({ active: "account-1", next: "account-2", canAutoSwap: false, reason: "next account 'account-2' has no captured credential" }),
      swapAccountFn: () => { swapCalled = true; return {}; },
    });
    assert.equal(swapCalled, false, "must NOT swap when canAutoSwap is false");
    assert.equal(out.swap, null);
    assert.match(out.advisory, /auto-swap requested but unavailable/);
    assert.match(out.advisory, /no captured credential/);
  });

  it("autoSwap + swap THROWS → swap.ok:false, NOT restarted (never restart onto a broken cred)", async () => {
    let restartCalled = false;
    const out = await runCoordinator({
      ...baseTrip,
      apply: true,
      autoSwap: true,
      resolveSwapTargetFn: () => ({ active: "account-1", next: "account-2", canAutoSwap: true, reason: "ready" }),
      swapAccountFn: () => { throw new Error("captured credential is not valid JSON"); },
      runSequencerFn: () => { restartCalled = true; return { plan: [], results: [], summary: {} }; },
    });
    assert.equal(out.swap.ok, false);
    assert.match(out.swap.error, /not valid JSON/);
    assert.equal(out.restart, null, "restart must be skipped on a failed swap");
    assert.equal(restartCalled, false);
    assert.match(out.advisory, /AUTO-SWAP FAILED/);
  });
});

// ── spawned CLI E2E (hermetic temp PRISM_ROOT) ───────────────────────────────
describe("CLI E2E (spawned, temp PRISM_ROOT)", () => {
  it("null 5h source + on-demand fallback DISABLED → exit 2 + JSON error (fail-loud, not silent-skip)", () => {
    const root = tmp("acct-cli-null-");
    const shared = path.join(root, "state/shared");
    fs.mkdirSync(path.join(shared, ".cron-locks"), { recursive: true });
    // active-fleet roster + sidecars all with null quota (the live C5 state)
    fs.writeFileSync(path.join(shared, "active-fleet.json"), JSON.stringify({ activeSlots: ["alpha", "bravo"] }));
    writeSidecar(shared, "alpha", null);
    writeSidecar(shared, "bravo", null);
    const run = spawnSync(process.execPath, [SCRIPT, "--json"], {
      env: { ...process.env, PRISM_ROOT: root, PRISM_5H_ONDEMAND_FALLBACK: "0" }, encoding: "utf8", timeout: 30000,
    });
    assert.equal(run.status, 2, `expect exit 2 on missing 5h source; stderr=${run.stderr}`);
    const parsed = JSON.parse(run.stdout.trim());
    assert.equal(parsed.ok, false);
    assert.equal(parsed.error, "FIVE_HOUR_SOURCE_UNAVAILABLE");
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("below threshold → exit 0 + switched:false (real sidecar read)", () => {
    const root = tmp("acct-cli-below-");
    const shared = path.join(root, "state/shared");
    fs.mkdirSync(path.join(shared, ".cron-locks"), { recursive: true });
    fs.writeFileSync(path.join(shared, "active-fleet.json"), JSON.stringify({ activeSlots: ["alpha", "bravo"] }));
    writeSidecar(shared, "alpha", 0.30);
    writeSidecar(shared, "bravo", 0.42);
    const run = spawnSync(process.execPath, [SCRIPT, "--json"], {
      env: { ...process.env, PRISM_ROOT: root }, encoding: "utf8", timeout: 30000,
    });
    assert.equal(run.status, 0, `exit 0 below threshold; stderr=${run.stderr}`);
    const parsed = JSON.parse(run.stdout.trim());
    assert.equal(parsed.ok, true);
    assert.equal(parsed.switched, false);
    assert.equal(parsed.fiveHourPct, 0.42);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("at threshold (dry-run default) → exit 0, switched:true, no real send (unknown windows → skip)", () => {
    const root = tmp("acct-cli-trip-");
    const shared = path.join(root, "state/shared");
    fs.mkdirSync(path.join(shared, ".cron-locks"), { recursive: true });
    // single non-self slot whose window won't resolve in the test host → sequencer
    // dry-runs (confirm:false) so nothing is actually sent; we only assert the
    // switched decision + dry-run plan, never a real keystroke.
    fs.writeFileSync(path.join(shared, "active-fleet.json"), JSON.stringify({ activeSlots: ["alpha"] }));
    writeSidecar(shared, "alpha", 0.95);
    const run = spawnSync(process.execPath, [SCRIPT, "--json", "--self", "bravo"], {
      env: { ...process.env, PRISM_ROOT: root }, encoding: "utf8", timeout: 60000,
    });
    assert.equal(run.status, 0, `exit 0; stderr=${run.stderr}`);
    const parsed = JSON.parse(run.stdout.trim());
    assert.equal(parsed.ok, true);
    assert.equal(parsed.switched, true);
    assert.equal(parsed.apply, false, "dry-run by default");
    assert.deepEqual(parsed.restartPlan, ["alpha"]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});


// keystone #3 absolute weighted-token trigger (denominator-free) -- pct null path
describe("runCoordinator (absolute weighted-token trigger)", () => {
  const noSleep = () => Promise.resolve();
  const clock = (s) => { let t = 0; return () => (t += s); };

  it("pct null + weighted >= trigger -> switched (gate absolute, NO throw)", async () => {
    const out = await runCoordinator({
      slots: ["alpha", "bravo"],
      env: { PRISM_5H_WEIGHTED_TOKEN_TRIGGER: "80000000" },
      readFiveHourPctFn: () => ({ pct: null, weighted: 90000000, source: null, slotsRead: 2 }),
      runSequencerFn: () => ({ plan: [], results: [], summary: {} }),
      now: clock(1), sleep: noSleep,
    });
    assert.equal(out.switched, true);
    assert.equal(out.reason, "at-or-above-threshold");
  });

  it("pct null + weighted < trigger -> switched:false, no throw", async () => {
    let restartCalled = false;
    const out = await runCoordinator({
      slots: ["alpha", "bravo"],
      env: { PRISM_5H_WEIGHTED_TOKEN_TRIGGER: "80000000" },
      readFiveHourPctFn: () => ({ pct: null, weighted: 70000000, source: null, slotsRead: 2 }),
      runSequencerFn: () => { restartCalled = true; return { plan: [], results: [], summary: {} }; },
    });
    assert.equal(out.switched, false);
    assert.equal(out.reason, "below-threshold");
    assert.equal(restartCalled, false);
  });

  it("pct null + weighted present but NO trigger -> still FAILS LOUD (operator must set trigger)", async () => {
    await assert.rejects(
      () => runCoordinator({
        slots: ["alpha", "bravo"],
        env: {},
        readFiveHourPctFn: () => ({ pct: null, weighted: 90000000, source: null, slotsRead: 2 }),
        runSequencerFn: () => { throw new Error("must NOT restart when undecidable"); },
      }),
      (e) => { assert.equal(e.code, "FIVE_HOUR_SOURCE_UNAVAILABLE"); return true; },
    );
  });

  it("pct PRECEDENCE: finite pct used even when an absolute trigger is set", async () => {
    let restartCalled = false;
    const out = await runCoordinator({
      slots: ["alpha", "bravo"],
      threshold: 0.90,
      env: { PRISM_5H_WEIGHTED_TOKEN_TRIGGER: "1" }, // trivially-low trigger
      readFiveHourPctFn: () => ({ pct: 0.50, weighted: 999999999, source: "x", slotsRead: 2 }),
      runSequencerFn: () => { restartCalled = true; return { plan: [], results: [], summary: {} }; },
    });
    assert.equal(out.switched, false, "pct 0.50 < 0.90 wins; the low absolute trigger is ignored");
    assert.equal(restartCalled, false);
  });
});

// ── on-demand 5h fallback (keystone #4) ──────────────────────────────────────
describe("fiveHourFallbackFromTranscripts (on-demand sum)", () => {
  it("finite weighted + no budget → {pct:null, weighted, source has on-demand}", () => {
    const fb = fiveHourFallbackFromTranscripts({
      nowMs: 1_700_000_000_000,
      env: {},
      _sum: () => ({ weightedTokens: 95_000_000, meteredTokens: 33_000_000, usedTokens: 645_000_000 }),
    });
    assert.equal(fb.pct, null, "no budget set -> pct null (no fabricated denominator)");
    assert.equal(fb.weighted, 95_000_000);
    assert.equal(fb.meteredTokens, 33_000_000);
    assert.match(fb.source, /on-demand/);
    assert.match(fb.source, /weighted=95000000/);
  });

  it("finite weighted + PRISM_5H_WEIGHTED_BUDGET → pct computed", () => {
    const fb = fiveHourFallbackFromTranscripts({
      nowMs: 1_700_000_000_000,
      env: { PRISM_5H_WEIGHTED_BUDGET: "100000000" },
      _sum: () => ({ weightedTokens: 90_000_000, meteredTokens: 30_000_000, usedTokens: 600_000_000 }),
    });
    assert.ok(Math.abs(fb.pct - 0.9) < 1e-9, `pct=${fb.pct} expected 0.9`);
    assert.equal(fb.weighted, 90_000_000);
  });

  it("sum throws → null (fail-soft, caller fails loud)", () => {
    const fb = fiveHourFallbackFromTranscripts({
      nowMs: 1_700_000_000_000,
      env: {},
      _sum: () => { throw new Error("unreadable transcripts"); },
    });
    assert.equal(fb, null);
  });

  it("sum yields non-finite weighted → null", () => {
    const fb = fiveHourFallbackFromTranscripts({
      nowMs: 1_700_000_000_000, env: {},
      _sum: () => ({ weightedTokens: null }),
    });
    assert.equal(fb, null);
  });
});

describe("readFiveHourPct on-demand fallback", () => {
  it("empty sidecar dir + _sum → fallback fires (fallback:true, weighted set)", () => {
    const dir = tmp("acct-fb-empty-");
    const r = readFiveHourPct({
      sidecarDir: dir, slots: ["alpha", "bravo"],
      env: {},
      _sum: () => ({ weightedTokens: 88_000_000, meteredTokens: 31_000_000, usedTokens: 500_000_000 }),
    });
    assert.equal(r.fallback, true);
    assert.equal(r.weighted, 88_000_000);
    assert.equal(r.pct, null);
    assert.match(r.source, /on-demand/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("real sidecar pct present → fallback does NOT fire (sidecar-first)", () => {
    const dir = tmp("acct-fb-sidecar-");
    writeSidecar(dir, "alpha", 0.77);
    const r = readFiveHourPct({
      sidecarDir: dir, slots: ["alpha", "bravo"],
      env: {},
      _sum: () => { throw new Error("should not be called when sidecar has a value"); },
    });
    assert.equal(r.pct, 0.77);
    assert.notEqual(r.fallback, true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("empty sidecar dir + NO _sum + no fallbackLive → no fallback (legacy null, zero-regression)", () => {
    const dir = tmp("acct-fb-nolegacy-");
    const r = readFiveHourPct({ sidecarDir: dir, slots: ["alpha", "bravo"] });
    assert.equal(r.pct, null);
    assert.notEqual(r.fallback, true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("PRISM_5H_ONDEMAND_FALLBACK=0 suppresses fallback even with _sum", () => {
    const dir = tmp("acct-fb-killswitch-");
    const r = readFiveHourPct({
      sidecarDir: dir, slots: ["alpha", "bravo"],
      env: { PRISM_5H_ONDEMAND_FALLBACK: "0" },
      _sum: () => ({ weightedTokens: 99_000_000 }),
    });
    assert.equal(r.pct, null);
    assert.notEqual(r.fallback, true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("sidecar with explicit weightedTokens:null is unknown not 0 (Number(null) parity P1) -> fallback fires", () => {
    const dir = tmp("acct-fb-nullw-");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "token-budget-alpha.json"),
      JSON.stringify({ quota: { fiveHour: { pct: null, weightedTokens: null } } }),
    );
    const r = readFiveHourPct({
      sidecarDir: dir, slots: ["alpha", "bravo"],
      env: {},
      _sum: () => ({ weightedTokens: 77_000_000, meteredTokens: 20_000_000, usedTokens: 400_000_000 }),
    });
    assert.equal(r.fallback, true, "explicit null weighted must be unknown, not 0 -> fallback fires");
    assert.equal(r.weighted, 77_000_000);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("runCoordinator with on-demand fallback (real readFiveHourPct)", () => {
  const baseOpts = (dir, env, sum) => ({
    sidecarDir: dir,
    env,
    _sum: sum,
    selfSlot: "charlie",
    readActiveFleetFn: () => ["alpha", "bravo"],
    runSequencerFn: () => ({ plan: [], results: [], summary: {} }),
    resolveSwapTargetFn: () => ({ active: null, next: null, canAutoSwap: false, reason: "test" }),
  });

  it("empty sidecars + on-demand weighted >= trigger → switched (absolute gate, no throw)", async () => {
    const dir = tmp("acct-co-fb-trip-");
    const out = await runCoordinator(baseOpts(
      dir,
      { PRISM_5H_WEIGHTED_TOKEN_TRIGGER: "80000000" },
      () => ({ weightedTokens: 90_000_000, meteredTokens: 33_000_000, usedTokens: 600_000_000 }),
    ));
    assert.equal(out.ok, true);
    assert.equal(out.switched, true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("empty sidecars + on-demand weighted < trigger → switched:false (no throw)", async () => {
    const dir = tmp("acct-co-fb-below-");
    const out = await runCoordinator(baseOpts(
      dir,
      { PRISM_5H_WEIGHTED_TOKEN_TRIGGER: "80000000" },
      () => ({ weightedTokens: 70_000_000, meteredTokens: 25_000_000, usedTokens: 500_000_000 }),
    ));
    assert.equal(out.ok, true);
    assert.equal(out.switched, false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("empty sidecars + on-demand weighted but NO trigger → still FAILS LOUD", async () => {
    const dir = tmp("acct-co-fb-notrig-");
    await assert.rejects(
      runCoordinator(baseOpts(dir, {}, () => ({ weightedTokens: 90_000_000 }))),
      (e) => { assert.equal(e.code, "FIVE_HOUR_SOURCE_UNAVAILABLE"); return true; },
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

// ── U-5H-ACCOUNT-BOUNDARY: the switch DECISION floors the 5h window per-account (no thrash) ──
import { fiveHourFallbackFromTranscripts as fallbackForBoundary } from "./account-switch-restart-coordinator.mjs";
describe("fiveHourFallbackFromTranscripts: per-account boundary floor (no thrash after a switch)", () => {
  const NOW = 1_700_000_000_000;
  const FIVE_H = 5 * 3600 * 1000;
  it("floors the window at the switch boundary -> sums the current account only", () => {
    let capturedWindowMs = null;
    const _sum = ({ windowMs }) => { capturedWindowMs = windowMs; return { weightedTokens: 7, meteredTokens: null }; };
    const r = fallbackForBoundary({ nowMs: NOW, _sum, _readBoundary: () => NOW - 30 * 60000 });
    assert.equal(capturedWindowMs, 30 * 60000, "window floored to [boundary, now], NOT the full 5h");
    assert.equal(r.weighted, 7);
  });
  it("no boundary -> full 5h window (backward compatible)", () => {
    let capturedWindowMs = null;
    const _sum = ({ windowMs }) => { capturedWindowMs = windowMs; return { weightedTokens: 7 }; };
    fallbackForBoundary({ nowMs: NOW, _sum, _readBoundary: () => null });
    assert.equal(capturedWindowMs, FIVE_H);
  });
});
