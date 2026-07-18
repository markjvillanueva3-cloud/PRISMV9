// chat-slots-bindings.test.mjs — U-WAVE5a (2026-05-19) coverage for
// readSlotBranchBindings + writeSlotBranchBindings + getSlotBranchBinding +
// claimSlot/heartbeat integration. Hermetic: writes to a tmpdir, never
// touches the live state file or sidecar.

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  SLOT_NAMES,
  readSlotBranchBindings,
  writeSlotBranchBindings,
  getSlotBranchBinding,
  claimSlot,
  heartbeat,
  DEFAULT_BINDINGS_PATH,
} from "../chat-slots.mjs";

// Build a per-test sandbox with state, lock, and bindings paths.
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), "csb-"));
  return {
    dir,
    state: join(dir, "chat-slots.json"),
    lock: join(dir, "chat-slots.lock"),
    bindings: join(dir, "slot-branch-bindings.json"),
    cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} },
  };
}

// ─── readSlotBranchBindings: fail-soft semantics ──────────────────────────

test("readSlotBranchBindings: missing file returns {}", () => {
  const s = sandbox();
  try {
    assert.deepEqual(readSlotBranchBindings(s.bindings), {});
  } finally { s.cleanup(); }
});

test("readSlotBranchBindings: malformed JSON returns {}", () => {
  const s = sandbox();
  try {
    writeFileSync(s.bindings, "{not json");
    assert.deepEqual(readSlotBranchBindings(s.bindings), {});
  } finally { s.cleanup(); }
});

test("readSlotBranchBindings: wrong schemaVersion returns {}", () => {
  const s = sandbox();
  try {
    writeFileSync(s.bindings, JSON.stringify({ schemaVersion: 99, bindings: { alpha: "slot/alpha" } }));
    assert.deepEqual(readSlotBranchBindings(s.bindings), {});
  } finally { s.cleanup(); }
});

test("readSlotBranchBindings: rejects non-slot/ branch values (defensive gate)", () => {
  const s = sandbox();
  try {
    writeFileSync(s.bindings, JSON.stringify({
      schemaVersion: 1,
      bindings: {
        alpha: "cad-fusion-live-ms0", // not slot/* — must be dropped
        bravo: "slot/bravo",          // valid
        charlie: "slot/",             // too-short — must be dropped
        delta: "",                    // empty — must be dropped
      },
    }));
    const got = readSlotBranchBindings(s.bindings);
    assert.deepEqual(got, { bravo: "slot/bravo" });
  } finally { s.cleanup(); }
});

test("readSlotBranchBindings: filters unknown slot names", () => {
  const s = sandbox();
  try {
    writeFileSync(s.bindings, JSON.stringify({
      schemaVersion: 1,
      bindings: { alpha: "slot/alpha", "not-a-slot": "slot/x", "../etc": "slot/y" },
    }));
    const got = readSlotBranchBindings(s.bindings);
    assert.equal(got.alpha, "slot/alpha");
    assert.equal(got["not-a-slot"], undefined);
    assert.equal(got["../etc"], undefined);
  } finally { s.cleanup(); }
});

// ─── writeSlotBranchBindings: validation + atomicity ──────────────────────

test("writeSlotBranchBindings: round-trip three slots (variability floor)", () => {
  const s = sandbox();
  try {
    const r = writeSlotBranchBindings(
      { alpha: "slot/alpha", echo: "slot/echo", mike: "slot/mike" },
      { path: s.bindings }
    );
    assert.equal(r.ok, true);
    assert.deepEqual(r.written, { alpha: "slot/alpha", echo: "slot/echo", mike: "slot/mike" });
    const onDisk = JSON.parse(readFileSync(s.bindings, "utf8"));
    assert.equal(onDisk.schemaVersion, 1);
    assert.equal(typeof onDisk.lastUpdated, "string");
    assert.equal(onDisk.bindings.alpha, "slot/alpha");
    assert.equal(onDisk.bindings.echo, "slot/echo");
    assert.equal(onDisk.bindings.mike, "slot/mike");
  } finally { s.cleanup(); }
});

test("writeSlotBranchBindings: merges with existing by default", () => {
  const s = sandbox();
  try {
    writeSlotBranchBindings({ alpha: "slot/alpha" }, { path: s.bindings });
    writeSlotBranchBindings({ bravo: "slot/bravo" }, { path: s.bindings });
    const got = readSlotBranchBindings(s.bindings);
    assert.deepEqual(got, { alpha: "slot/alpha", bravo: "slot/bravo" });
  } finally { s.cleanup(); }
});

test("writeSlotBranchBindings: replace:true wipes prior entries", () => {
  const s = sandbox();
  try {
    writeSlotBranchBindings({ alpha: "slot/alpha", bravo: "slot/bravo" }, { path: s.bindings });
    writeSlotBranchBindings({ charlie: "slot/charlie" }, { path: s.bindings, replace: true });
    const got = readSlotBranchBindings(s.bindings);
    assert.deepEqual(got, { charlie: "slot/charlie" });
  } finally { s.cleanup(); }
});

test("writeSlotBranchBindings: rejects invalid slot name", () => {
  const s = sandbox();
  try {
    const r = writeSlotBranchBindings({ ghost: "slot/ghost" }, { path: s.bindings });
    assert.equal(r.ok, false);
    assert.match(r.error, /unknown slot/);
    assert.equal(existsSync(s.bindings), false, "should not write on validation error");
  } finally { s.cleanup(); }
});

test("writeSlotBranchBindings: rejects non-slot/ branch (defensive)", () => {
  const s = sandbox();
  try {
    const r = writeSlotBranchBindings({ alpha: "cad-fusion-live-ms0" }, { path: s.bindings });
    assert.equal(r.ok, false);
    assert.match(r.error, /slot\/<nato>/);
  } finally { s.cleanup(); }
});

test("writeSlotBranchBindings: rejects adversarial inputs (NaN, undefined, empty)", () => {
  const s = sandbox();
  try {
    const adversarial = [
      { input: { alpha: NaN }, why: "NaN" },
      { input: { alpha: undefined }, why: "undefined" },
      { input: { alpha: "" }, why: "empty string" },
      { input: { alpha: "slot/" }, why: "just the prefix" },
      { input: { alpha: { evil: 1 } }, why: "object" },
      { input: null, why: "null bindings" },
      { input: "not an object", why: "string bindings" },
    ];
    for (const { input, why } of adversarial) {
      const r = writeSlotBranchBindings(input, { path: s.bindings });
      assert.equal(r.ok, false, `must reject ${why}`);
    }
    assert.equal(existsSync(s.bindings), false, "no write on any rejection");
  } finally { s.cleanup(); }
});

// ─── getSlotBranchBinding: convenience accessor ───────────────────────────

test("getSlotBranchBinding: returns null for unknown slot", () => {
  const s = sandbox();
  try {
    writeSlotBranchBindings({ alpha: "slot/alpha" }, { path: s.bindings });
    assert.equal(getSlotBranchBinding("alpha", s.bindings), "slot/alpha");
    assert.equal(getSlotBranchBinding("ghost", s.bindings), null);
    assert.equal(getSlotBranchBinding(null, s.bindings), null);
    assert.equal(getSlotBranchBinding(undefined, s.bindings), null);
  } finally { s.cleanup(); }
});

// ─── claimSlot integration: binding overrides input.branch ─────────────────

test("claimSlot: binding overrides input.branch on empty-slot claim", () => {
  const s = sandbox();
  try {
    writeSlotBranchBindings({ alpha: "slot/alpha" }, { path: s.bindings });
    const r = claimSlot(
      { chatId: "claude-aaaa1111", branch: "cad-fusion-live-ms0", preferSlot: "alpha" },
      s.state, s.lock, s.bindings,
    );
    assert.equal(r.ok, true);
    assert.equal(r.slot, "alpha");
    assert.equal(r.state.branch, "slot/alpha", "binding must override input.branch");
  } finally { s.cleanup(); }
});

test("claimSlot: no binding auto-seeds for non-golf slot (U-SBB03 contract)", () => {
  // [SLOT-BRIDGE-MS0]/U-SBB03 (2026-05-26): replaces the pre-2026-05-26 back-compat
  // test "no binding leaves input.branch intact". The new contract: claimSlot
  // self-seeds the binding for any non-golf slot on first claim, so the 3
  // enforcement hooks arm IMMEDIATELY — never deferred to a follow-up bootstrap.
  const s = sandbox();
  try {
    const r = claimSlot(
      { chatId: "claude-bbbb2222", branch: "cad-fusion-live-ms0", preferSlot: "bravo" },
      s.state, s.lock, s.bindings,
    );
    assert.equal(r.ok, true);
    assert.equal(r.slot, "bravo");
    assert.equal(r.state.branch, "slot/bravo", "auto-seed must override input.branch on first claim");
    // Side-effect verification: the bindings file now exists with bravo seeded.
    const seeded = readSlotBranchBindings(s.bindings);
    assert.equal(seeded.bravo, "slot/bravo", "binding must be persisted to disk");
  } finally { s.cleanup(); }
});

test("claimSlot: golf is EXEMPT from auto-seed (integrator invariant)", () => {
  // [SLOT-BRIDGE-MS0]/U-SBB03 (2026-05-26): golf is the integrator slot per
  // main-tree-write-block.mjs:108 — it MUST remain free to write the main
  // tree (cad-fusion-live-ms0). Auto-seeding "slot/golf" would lock it out
  // of its integration role. This test guards that invariant.
  const s = sandbox();
  try {
    const r = claimSlot(
      { chatId: "claude-golf0000", branch: "cad-fusion-live-ms0", preferSlot: "golf" },
      s.state, s.lock, s.bindings,
    );
    assert.equal(r.ok, true);
    assert.equal(r.slot, "golf");
    assert.equal(r.state.branch, "cad-fusion-live-ms0", "golf must keep input.branch (integrator)");
    const seeded = readSlotBranchBindings(s.bindings);
    assert.equal(seeded.golf, undefined, "golf must NEVER be auto-seeded");
  } finally { s.cleanup(); }
});

test("claimSlot: binding overrides input.branch on refresh path (same chat reclaims)", () => {
  const s = sandbox();
  try {
    claimSlot({ chatId: "claude-cccc3333", branch: "cad-fusion-live-ms0", preferSlot: "charlie" }, s.state, s.lock, s.bindings);
    // Now bind the slot AFTER the chat already claimed it.
    writeSlotBranchBindings({ charlie: "slot/charlie" }, { path: s.bindings });
    const r = claimSlot(
      { chatId: "claude-cccc3333", branch: "cad-fusion-live-ms0" },
      s.state, s.lock, s.bindings,
    );
    assert.equal(r.ok, true);
    assert.equal(r.alreadyOwned, true);
    assert.equal(r.state.branch, "slot/charlie", "binding must override on refresh too");
  } finally { s.cleanup(); }
});

test("heartbeat: binding overrides input.branch (closes clobber regression)", () => {
  const s = sandbox();
  try {
    claimSlot({ chatId: "claude-dddd4444", branch: "slot/delta", preferSlot: "delta" }, s.state, s.lock, s.bindings);
    writeSlotBranchBindings({ delta: "slot/delta" }, { path: s.bindings });
    // Now heartbeat with a WRONG branch — must not clobber.
    const r = heartbeat(
      { chatId: "claude-dddd4444", branch: "cad-fusion-live-ms0" },
      s.state, s.lock, s.bindings,
    );
    assert.equal(r.ok, true);
    assert.equal(r.state.branch, "slot/delta");
  } finally { s.cleanup(); }
});

test("claimSlot: bindings file missing → auto-seeds on first non-golf claim (creates file)", () => {
  // [SLOT-BRIDGE-MS0]/U-SBB03 (2026-05-26): replaces the pre-2026-05-26 test
  // "bindings file missing is fail-soft (no crash, no override)" which asserted
  // that no file gets created. The new contract: a missing bindings file is the
  // gap that left 25/26 slots unarmed across the fleet — claimSlot now creates
  // it on first non-golf claim so the 3 enforcement hooks arm without operator
  // intervention. Still fail-soft (no crash) — that contract is preserved.
  const s = sandbox();
  try {
    assert.equal(existsSync(s.bindings), false, "precondition: bindings file does not exist");
    const r = claimSlot(
      { chatId: "claude-eeee5555", branch: "cad-fusion-live-ms0", preferSlot: "echo" },
      s.state, s.lock, s.bindings,
    );
    assert.equal(r.ok, true);
    assert.equal(r.state.branch, "slot/echo", "auto-seed overrides input.branch");
    assert.equal(existsSync(s.bindings), true, "bindings file MUST be created on first claim");
    const onDisk = JSON.parse(readFileSync(s.bindings, "utf8"));
    assert.equal(onDisk.schemaVersion, 1);
    assert.equal(onDisk.bindings.echo, "slot/echo");
  } finally { s.cleanup(); }
});

test("claimSlot: bindings file missing + golf claim → file NOT created (golf exempt)", () => {
  // [SLOT-BRIDGE-MS0]/U-SBB03 (2026-05-26): defense-in-depth on the integrator
  // invariant — even when the bindings file doesn't exist at all, golf must
  // not trigger its creation (because that would seed nothing useful AND
  // create empty-bindings state on disk that other golf claims read).
  const s = sandbox();
  try {
    const r = claimSlot(
      { chatId: "claude-golf1111", branch: "cad-fusion-live-ms0", preferSlot: "golf" },
      s.state, s.lock, s.bindings,
    );
    assert.equal(r.ok, true);
    assert.equal(r.slot, "golf");
    assert.equal(r.state.branch, "cad-fusion-live-ms0", "golf input.branch preserved");
    assert.equal(existsSync(s.bindings), false, "golf claim must not create the bindings file");
  } finally { s.cleanup(); }
});

// ─── Variability: exercise 4 distinct slots (variability floor ≥3) ────────

test("claimSlot: bindings respected across 4 distinct slots", () => {
  const s = sandbox();
  try {
    writeSlotBranchBindings({
      alpha: "slot/alpha",
      foxtrot: "slot/foxtrot",
      juliett: "slot/juliett",
      mike: "slot/mike",
    }, { path: s.bindings });
    const slots = ["alpha", "foxtrot", "juliett", "mike"];
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      const r = claimSlot(
        { chatId: `claude-test${i}${i}${i}${i}`, branch: "cad-fusion-live-ms0", preferSlot: slot },
        s.state, s.lock, s.bindings,
      );
      assert.equal(r.ok, true, `claim ${slot} ok`);
      assert.equal(r.slot, slot, `slot match ${slot}`);
      assert.equal(r.state.branch, `slot/${slot}`, `binding applied for ${slot}`);
    }
  } finally { s.cleanup(); }
});

// ─── DEFAULT_BINDINGS_PATH sanity ─────────────────────────────────────────

test("DEFAULT_BINDINGS_PATH lives under state/shared/", () => {
  assert.match(DEFAULT_BINDINGS_PATH, /state[\\/]shared[\\/]slot-branch-bindings\.json$/);
});

test("SLOT_NAMES includes the NATO 13 (regression guard for fleet expansion)", () => {
  const expected = [
    "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
    "hotel", "india", "juliett", "kilo", "lima", "mike",
  ];
  for (const slot of expected) {
    assert.ok(SLOT_NAMES.includes(slot), `SLOT_NAMES must include ${slot}`);
  }
});
