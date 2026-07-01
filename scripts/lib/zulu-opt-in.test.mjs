// ZEBRA-ORCHESTRATOR-MS1 / U-ZM1-02 — opt-in store tests.
// Hermetic: every test uses a unique temp store file — no shared global state,
// no dependence on the real state/shared/zebra-opt-in.json.

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  manageableSlots,
  readOptIn,
  setOptIn,
  setOptInAll,
  getOptInMap,
  applyOptInToSlotsDoc,
  OPTIN_SCHEMA_VERSION,
  resolveOptInFile,
  DEFAULT_OPTIN_FILE,
} from "../../scripts/lib/zulu-opt-in.mjs";
import { SLOT_NAMES } from "../../.claude/helpers/chat-slots.mjs";
import { SELF_EXEMPT_SLOTS } from "../../scripts/lib/zulu-orchestrator-lib.mjs";

// ─── temp-file harness ───────────────────────────────────────────────────

let _seq = 0;
const _created = [];
function freshFile() {
  const f = path.join(
    os.tmpdir(),
    `zebra-optin-test-${process.pid}-${Date.now()}-${_seq++}.json`,
  );
  _created.push(f);
  return f;
}
function cleanup(f) {
  // rmSync(recursive,force) removes files OR dirs and never throws on missing
  // — the write-failure test deliberately makes the store path a directory.
  for (const p of [f, `${f}.lock`]) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* gone */ }
  }
  try {
    const dir = path.dirname(f);
    const base = path.basename(f);
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(`${base}.`)) {
        try { fs.rmSync(path.join(dir, name), { recursive: true, force: true }); } catch { /* gone */ }
      }
    }
  } catch { /* tmpdir unreadable — best effort */ }
}
after(() => { for (const f of _created) cleanup(f); });

// ─── manageableSlots ─────────────────────────────────────────────────────

describe("manageableSlots", () => {
  it("excludes golf, never lists zulu, keeps the work slots", () => {
    const m = manageableSlots();
    assert.ok(!m.includes("golf"), "golf (hygiene slot) must be excluded");
    assert.ok(!m.includes("zulu"), "zulu (orchestrator) must not appear");
    assert.ok(m.includes("alpha") && m.includes("bravo") && m.includes("mike"));
    // SELF_EXEMPT_SLOTS is {zulu, golf}; only the ones actually IN SLOT_NAMES
    // shrink the manageable set.
    const exemptInSlotNames = SELF_EXEMPT_SLOTS.filter((s) => SLOT_NAMES.includes(s));
    assert.equal(m.length, SLOT_NAMES.length - exemptInSlotNames.length);
  });
});

// ─── readOptIn — self-heal ───────────────────────────────────────────────

describe("readOptIn", () => {
  it("missing file → empty store", () => {
    const store = readOptIn(freshFile());
    assert.equal(store.schemaVersion, OPTIN_SCHEMA_VERSION);
    assert.deepEqual(store.slots, {});
  });
  it("corrupt JSON → empty store + a .corrupt-* backup is written", () => {
    const f = freshFile();
    fs.writeFileSync(f, "{not valid json");
    const store = readOptIn(f);
    assert.deepEqual(store.slots, {});
    const dir = path.dirname(f);
    const base = path.basename(f);
    const hasBackup = fs.readdirSync(dir).some((n) => n.startsWith(`${base}.corrupt-`));
    assert.ok(hasBackup, "corrupt input must be backed up, never silently lost");
  });
  it("valid-but-wrong-shape (no slots object) → empty store", () => {
    const f = freshFile();
    fs.writeFileSync(f, JSON.stringify({ schemaVersion: 1, slots: "nope" }));
    assert.deepEqual(readOptIn(f).slots, {});
  });
  it("round-trips a valid store written by setOptIn", () => {
    const f = freshFile();
    setOptIn({ slot: "bravo", optIn: true }, f);
    const store = readOptIn(f);
    assert.equal(store.slots.bravo.optIn, true);
    assert.equal(typeof store.slots.bravo.optInAt, "string");
  });
});

// ─── setOptIn ────────────────────────────────────────────────────────────

describe("setOptIn", () => {
  it("opts a slot in and stamps optInAt", () => {
    const f = freshFile();
    const r = setOptIn({ slot: "bravo", optIn: true, now: "2026-05-22T10:00:00Z" }, f);
    assert.equal(r.ok, true);
    assert.equal(r.slot, "bravo");
    assert.equal(r.optIn, true);
    assert.equal(r.optInAt, "2026-05-22T10:00:00Z");
    assert.equal(getOptInMap(f).bravo.optInAt, "2026-05-22T10:00:00Z");
  });
  it("rejects an unknown slot name", () => {
    const r = setOptIn({ slot: "notaslot", optIn: true }, freshFile());
    assert.equal(r.ok, false);
    assert.match(r.error, /^unknown-slot:/);
  });
  it("rejects the self-exempt zulu slot", () => {
    const r = setOptIn({ slot: "zulu", optIn: true }, freshFile());
    assert.equal(r.ok, false);
    assert.match(r.error, /^self-exempt-slot:zulu/);
  });
  it("rejects the self-exempt golf slot", () => {
    const r = setOptIn({ slot: "golf", optIn: true }, freshFile());
    assert.equal(r.ok, false);
    assert.match(r.error, /^self-exempt-slot:golf/);
  });
  it("rejects null / undefined / empty slot (adversarial)", () => {
    const f = freshFile();
    assert.equal(setOptIn({ slot: null, optIn: true }, f).ok, false);
    assert.equal(setOptIn({ slot: undefined, optIn: true }, f).ok, false);
    assert.equal(setOptIn({ slot: "", optIn: true }, f).ok, false);
    assert.equal(setOptIn({}, f).ok, false);
  });
  it("opt-out removes the slot entry entirely", () => {
    const f = freshFile();
    setOptIn({ slot: "delta", optIn: true }, f);
    assert.ok(getOptInMap(f).delta, "delta should be opted in");
    const r = setOptIn({ slot: "delta", optIn: false }, f);
    assert.equal(r.ok, true);
    assert.equal(r.optIn, false);
    assert.equal(getOptInMap(f).delta, undefined);
    assert.equal(readOptIn(f).slots.delta, undefined);
  });
  it("opts in 3 distinct slots independently (variability)", () => {
    const f = freshFile();
    for (const s of ["alpha", "hotel", "mike"]) {
      assert.equal(setOptIn({ slot: s, optIn: true }, f).ok, true);
    }
    const map = getOptInMap(f);
    assert.deepEqual(Object.keys(map).sort(), ["alpha", "hotel", "mike"]);
  });
});

// ─── setOptInAll ─────────────────────────────────────────────────────────

describe("setOptInAll", () => {
  it("opts in every manageable slot in one write", () => {
    const f = freshFile();
    const r = setOptInAll({ now: "2026-05-22T12:00:00Z" }, f);
    assert.equal(r.ok, true);
    assert.equal(r.changed.length, manageableSlots().length);
    assert.equal(r.kept.length, 0);
    assert.equal(r.total, manageableSlots().length);
    const map = getOptInMap(f);
    assert.equal(Object.keys(map).length, manageableSlots().length);
    assert.ok(!map.golf && !map.zulu, "exempt slots never opted in by --all");
  });
  it("a redundant --all keeps the original optInAt (grace not reset)", () => {
    const f = freshFile();
    setOptInAll({ now: "2026-05-22T08:00:00Z" }, f);
    const second = setOptInAll({ now: "2026-05-23T08:00:00Z" }, f);
    assert.equal(second.changed.length, 0, "nothing new to change");
    assert.equal(second.kept.length, manageableSlots().length);
    // Every slot must still carry the FIRST timestamp — the 24h dry-run grace
    // window must not silently restart on a redundant opt-in-all.
    for (const v of Object.values(getOptInMap(f))) {
      assert.equal(v.optInAt, "2026-05-22T08:00:00Z");
    }
  });
  it("--all after a single opt-in keeps that slot, adds the rest", () => {
    const f = freshFile();
    setOptIn({ slot: "bravo", optIn: true, now: "2026-05-20T00:00:00Z" }, f);
    const r = setOptInAll({ now: "2026-05-22T00:00:00Z" }, f);
    assert.ok(r.kept.includes("bravo"));
    assert.equal(getOptInMap(f).bravo.optInAt, "2026-05-20T00:00:00Z");
    assert.equal(r.changed.length, manageableSlots().length - 1);
  });
});

// ─── getOptInMap ─────────────────────────────────────────────────────────

describe("getOptInMap", () => {
  it("returns only valid opted-in entries", () => {
    const f = freshFile();
    setOptIn({ slot: "bravo", optIn: true }, f);
    const map = getOptInMap(f);
    assert.deepEqual(Object.keys(map), ["bravo"]);
    assert.equal(map.bravo.optIn, true);
  });
  it("drops malformed entries (optIn not true / missing optInAt / non-object)", () => {
    const f = freshFile();
    fs.writeFileSync(f, JSON.stringify({
      schemaVersion: 1,
      slots: {
        alpha: { optIn: false, optInAt: "2026-05-22T00:00:00Z" }, // not true
        bravo: { optIn: true },                                    // no optInAt
        charlie: { optIn: true, optInAt: 12345 },                  // optInAt not a string
        delta: "garbage",                                          // non-object
        echo: { optIn: true, optInAt: "2026-05-22T00:00:00Z" },    // valid
      },
    }));
    assert.deepEqual(Object.keys(getOptInMap(f)), ["echo"]);
  });
  it("drops a self-exempt or non-canonical slot key even if present in the file", () => {
    const f = freshFile();
    fs.writeFileSync(f, JSON.stringify({
      schemaVersion: 1,
      slots: {
        golf: { optIn: true, optInAt: "2026-05-22T00:00:00Z" },     // exempt
        zulu: { optIn: true, optInAt: "2026-05-22T00:00:00Z" },     // exempt
        wat: { optIn: true, optInAt: "2026-05-22T00:00:00Z" },      // non-canonical
        bravo: { optIn: true, optInAt: "2026-05-22T00:00:00Z" },    // valid
      },
    }));
    assert.deepEqual(Object.keys(getOptInMap(f)), ["bravo"]);
  });
});

// ─── applyOptInToSlotsDoc ────────────────────────────────────────────────

describe("applyOptInToSlotsDoc", () => {
  it("projects opt-in onto a non-null entry", () => {
    const f = freshFile();
    setOptIn({ slot: "bravo", optIn: true, now: "2026-05-22T09:00:00Z" }, f);
    const slotsDoc = { slots: { bravo: { pid: 100 }, hotel: { pid: 200 } } };
    const r = applyOptInToSlotsDoc(slotsDoc, f);
    assert.equal(r.ok, true);
    assert.equal(slotsDoc.slots.bravo.zuluOptIn, true);
    assert.equal(slotsDoc.slots.bravo.zuluOptInAt, "2026-05-22T09:00:00Z");
  });
  it("is authoritative -- a non-opted slot gets zuluOptIn=false and the legacy zebraOptIn is deleted", () => {
    const f = freshFile(); // empty store -- nothing opted in
    const slotsDoc = { slots: { hotel: { pid: 200, zebraOptIn: true } } }; // stale pre-rename field
    applyOptInToSlotsDoc(slotsDoc, f);
    assert.equal(slotsDoc.slots.hotel.zuluOptIn, false, "canonical field set false");
    assert.equal("zebraOptIn" in slotsDoc.slots.hotel, false, "stale legacy field migrated away (deleted)");
  });
  it("skips null entries without throwing", () => {
    const f = freshFile();
    setOptIn({ slot: "bravo", optIn: true }, f);
    const slotsDoc = { slots: { bravo: { pid: 100 }, delta: null } };
    const r = applyOptInToSlotsDoc(slotsDoc, f);
    assert.equal(r.ok, true);
    assert.equal(slotsDoc.slots.delta, null);
    assert.equal(slotsDoc.slots.bravo.zuluOptIn, true);
  });
  it("rejects a bad slots doc (adversarial: null / no slots / non-object)", () => {
    const f = freshFile();
    assert.equal(applyOptInToSlotsDoc(null, f).ok, false);
    assert.equal(applyOptInToSlotsDoc({}, f).ok, false);
    assert.equal(applyOptInToSlotsDoc({ slots: "nope" }, f).ok, false);
  });
  it("round-trip: setOptInAll → applyOptInToSlotsDoc opts every present entry in", () => {
    const f = freshFile();
    setOptInAll({}, f);
    const slotsDoc = {
      slots: {
        alpha: { pid: 1 }, bravo: { pid: 2 }, golf: { pid: 3 }, delta: null,
      },
    };
    const r = applyOptInToSlotsDoc(slotsDoc, f);
    assert.equal(r.ok, true);
    assert.equal(slotsDoc.slots.alpha.zuluOptIn, true);
    assert.equal(slotsDoc.slots.bravo.zuluOptIn, true);
    assert.equal(slotsDoc.slots.golf.zuluOptIn, false, "golf is exempt -- never opted in");
    assert.equal(slotsDoc.slots.delta, null);
  });
});

// ─── lock + write-failure paths ──────────────────────────────────────────

describe("lock + write-failure", () => {
  it("steals a STALE lock (crashed holder) and still completes the write", () => {
    const f = freshFile();
    const lockPath = `${f}.lock`;
    // Simulate a crashed holder: a lock file whose mtime is far past the
    // timeout. setOptIn must detect staleness, steal it atomically, succeed.
    fs.writeFileSync(lockPath, "99999\nstale-holder");
    const old = new Date(Date.now() - 60 * 1000); // 60s ago
    fs.utimesSync(lockPath, old, old);
    const r = setOptIn({ slot: "bravo", optIn: true }, f);
    assert.equal(r.ok, true, "a stale lock must be stolen, not block the write");
    assert.equal(getOptInMap(f).bravo.optIn, true);
  });
  it("returns a write-failed envelope (never a raw throw) when the store path is unwritable", () => {
    // Make the store path itself a DIRECTORY: the lock (a sibling file) still
    // acquires fine, but renameSync onto a directory fails — exercising the
    // write-failure path, not the lock path.
    const f = freshFile();
    fs.mkdirSync(f);
    const r = setOptIn({ slot: "bravo", optIn: true }, f);
    assert.equal(r.ok, false);
    assert.match(r.error, /^write-failed:/);
    // and no orphaned .tmp turd next to the store
    const dir = path.dirname(f);
    const base = path.basename(f);
    const tmps = fs.readdirSync(dir).filter((n) => n.startsWith(`${base}.`) && n.endsWith(".tmp"));
    assert.deepEqual(tmps, [], "a failed write must not orphan a .tmp file");
  });
  it("two sequential opt-ins both acquire+release the lock, leaving no lock file", () => {
    const f = freshFile();
    assert.equal(setOptIn({ slot: "alpha", optIn: true }, f).ok, true);
    assert.equal(setOptIn({ slot: "bravo", optIn: true }, f).ok, true);
    assert.deepEqual(Object.keys(getOptInMap(f)).sort(), ["alpha", "bravo"]);
    assert.equal(fs.existsSync(`${f}.lock`), false, "lock must be released after each call");
  });
});

describe("resolveOptInFile (U-ZULU-OPTIN-PATH-FIX)", () => {
  it("defaults to the canonical zulu-opt-in.json, NEVER the orphaned zebra path", () => {
    const f = resolveOptInFile({}); // no env override
    assert.match(f, /zulu-opt-in\.json$/);
    assert.doesNotMatch(f, /zebra-opt-in\.json$/);
  });

  it("PRISM_ZULU_OPTIN_FILE (canonical) wins over the legacy zebra env and the default", () => {
    assert.equal(
      resolveOptInFile({ PRISM_ZULU_OPTIN_FILE: "/tmp/z.json", PRISM_ZEBRA_OPTIN_FILE: "/tmp/legacy.json" }),
      "/tmp/z.json",
    );
  });

  it("legacy PRISM_ZEBRA_OPTIN_FILE still honored for back-compat when the canonical env is unset", () => {
    assert.equal(resolveOptInFile({ PRISM_ZEBRA_OPTIN_FILE: "/tmp/legacy.json" }), "/tmp/legacy.json");
  });

  it("DEFAULT_OPTIN_FILE (the module's bound path) resolves to zulu-opt-in.json on a clean env", () => {
    // Guard: only assert the default when neither override env is set in this runner.
    if (!process.env.PRISM_ZULU_OPTIN_FILE && !process.env.PRISM_ZEBRA_OPTIN_FILE) {
      assert.match(DEFAULT_OPTIN_FILE, /zulu-opt-in\.json$/);
      assert.doesNotMatch(DEFAULT_OPTIN_FILE, /zebra-opt-in\.json$/);
    }
  });
});
