// Tests for the rank-6 synthesis-claim ledger (galaxy-synthesis-claim.mjs).
// Three layers: (1) pure fns (applyClaim/applyRelease/sweep/check/peerClaimedKeys) with no fs;
// (2) real-fs store round-trip + corrupt/schema-guard + a REAL tmpdir lock oracle (the
// brain-refresh lesson: an unparameterized lock has zero coverage); (3) the FAIL-OPEN wrapper
// contract — tryClaimSynthesis/tryReleaseSynthesis NEVER throw and fail-OPEN on any error, but
// a GENUINE live peer claim returns ok:false. Hermetic via injected storePath/lockPath + tmpdir.

import { describe, it, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  claimKey,
  parseKey,
  applyClaim,
  applyRelease,
  checkClaim,
  peerClaimedKeys,
  sweepExpired,
  isValidClaimRow,
  readStore,
  writeStoreUnsafe,
  acquireLock,
  releaseLock,
  withLock,
  tryClaimSynthesis,
  tryReleaseSynthesis,
  DEFAULT_TTL_MS,
  MIN_TTL_MS,
  MAX_TTL_MS,
} from "./galaxy-synthesis-claim.mjs";

const HASH_A = "abc123def456"; // 12 hex — the computeSourceHash shape
const HASH_B = "0011223344ff";
const T0 = "2026-05-30T12:00:00.000Z";
const t0 = Date.parse(T0);
const iso = (ms) => new Date(ms).toISOString();
const emptyStore = () => ({ schemaVersion: 1, lastSweepAt: null, claims: {} });

// tmpdir lifecycle — each fs/lock/wrapper test gets an isolated dir.
const tmpDirs = [];
function freshDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "gsc-test-"));
  tmpDirs.push(d);
  return d;
}
afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

// ── key helpers ─────────────────────────────────────────────────────────────
describe("claimKey / parseKey", () => {
  it("claimKey joins galaxy@hash; parseKey round-trips it", () => {
    const k = claimKey("token-optimization", HASH_A);
    assert.equal(k, `token-optimization@${HASH_A}`);
    assert.deepEqual(parseKey(k), { galaxy: "token-optimization", sourceHash: HASH_A });
  });
  it("parseKey uses the LAST '@' (galaxy slug can't contain '@', hash can't either — but be robust)", () => {
    assert.deepEqual(parseKey(`mill@${HASH_A}`), { galaxy: "mill", sourceHash: HASH_A });
  });
  it("parseKey rejects malformed keys", () => {
    assert.equal(parseKey("nogalaxy"), null);
    assert.equal(parseKey("@onlyhash"), null);
    assert.equal(parseKey("galaxy@"), null);
    assert.equal(parseKey(null), null);
  });
});

// ── applyClaim ───────────────────────────────────────────────────────────────
describe("applyClaim", () => {
  it("fresh claim → ok, stored under galaxy@hash, not refreshed", () => {
    const s = emptyStore();
    const r = applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0);
    assert.equal(r.ok, true);
    assert.equal(r.refreshed, false);
    assert.ok(s.claims[`mill@${HASH_A}`]);
    assert.equal(s.claims[`mill@${HASH_A}`].chatId, "claude-aaaa1111");
  });

  it("same owner re-claim → refreshed:true, heartbeat + TTL bumped (idempotent re-run)", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0);
    const later = iso(t0 + 60_000);
    const r = applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, later);
    assert.equal(r.ok, true);
    assert.equal(r.refreshed, true);
    assert.equal(s.claims[`mill@${HASH_A}`].lastHeartbeat, later);
  });

  it("DIFFERENT owner, same galaxy@hash → conflict (the fleet mutex)", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0);
    const r = applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-bbbb2222" }, T0);
    assert.equal(r.ok, false);
    assert.equal(r.conflict.chatId, "claude-aaaa1111");
  });

  it("SAME galaxy, DIFFERENT hash → NO conflict (changed source = new work-unit)", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0);
    const r = applyClaim(s, { galaxy: "mill", sourceHash: HASH_B, chatId: "claude-bbbb2222" }, T0);
    assert.equal(r.ok, true, "galaxy@HASH_B is a distinct unit — peer may synthesize the fresh cluster");
    assert.ok(s.claims[`mill@${HASH_A}`] && s.claims[`mill@${HASH_B}`]);
  });

  it("expired claim is swept before a new claim succeeds", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", ttlMs: MIN_TTL_MS }, T0);
    const wayLater = iso(t0 + MIN_TTL_MS + 1000);
    const r = applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-bbbb2222" }, wayLater);
    assert.equal(r.ok, true, "prior claim expired → swept → new owner can claim");
    assert.equal(s.claims[`mill@${HASH_A}`].chatId, "claude-bbbb2222");
  });

  it("TTL clamps: default when absent, floor/ceiling enforced", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "g1", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0);
    assert.equal(Date.parse(s.claims[`g1@${HASH_A}`].expiresAt) - t0, DEFAULT_TTL_MS);
    applyClaim(s, { galaxy: "g2", sourceHash: HASH_A, chatId: "claude-aaaa1111", ttlMs: 1 }, T0);
    assert.equal(Date.parse(s.claims[`g2@${HASH_A}`].expiresAt) - t0, MIN_TTL_MS, "below floor → MIN");
    applyClaim(s, { galaxy: "g3", sourceHash: HASH_A, chatId: "claude-aaaa1111", ttlMs: 999_999_999 }, T0);
    assert.equal(Date.parse(s.claims[`g3@${HASH_A}`].expiresAt) - t0, MAX_TTL_MS, "above ceiling → MAX");
  });

  it("invalid galaxy / hash / chatId / nowIso throw (fail-loud on bad args)", () => {
    const s = emptyStore();
    assert.throws(() => applyClaim(s, { galaxy: "Bad Galaxy", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0), /invalid galaxy/);
    assert.throws(() => applyClaim(s, { galaxy: "mill", sourceHash: "ZZZ", chatId: "claude-aaaa1111" }, T0), /invalid sourceHash/);
    assert.throws(() => applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "x" }, T0), /invalid chatId/);
    assert.throws(() => applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, "not-a-date"), /invalid nowIso/);
  });
});

// ── applyRelease ───────────────────────────────────────────────────────────
describe("applyRelease", () => {
  it("owner releases → ok, claim removed", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0);
    const r = applyRelease(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" });
    assert.equal(r.ok, true);
    assert.equal(s.claims[`mill@${HASH_A}`], undefined);
  });
  it("release of unclaimed → not_claimed (no throw — release is best-effort)", () => {
    const r = applyRelease(emptyStore(), { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" });
    assert.deepEqual(r, { ok: false, reason: "not_claimed" });
  });
  it("non-owner release refused → wrong_owner, claim untouched", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0);
    const r = applyRelease(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-bbbb2222" });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "wrong_owner");
    assert.ok(s.claims[`mill@${HASH_A}`], "peer cannot release my claim");
  });
});

// ── checkClaim ───────────────────────────────────────────────────────────────
describe("checkClaim", () => {
  it("unclaimed → claimed:false", () => {
    assert.deepEqual(checkClaim(emptyStore(), "mill", HASH_A, "claude-aaaa1111", T0), { claimed: false });
  });
  it("claimed by me → byMe:true; by peer → byMe:false", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0);
    assert.equal(checkClaim(s, "mill", HASH_A, "claude-aaaa1111", T0).byMe, true);
    assert.equal(checkClaim(s, "mill", HASH_A, "claude-bbbb2222", T0).byMe, false);
  });
  it("expired claim → claimed:false + wasExpired", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", ttlMs: MIN_TTL_MS }, T0);
    const r = checkClaim(s, "mill", HASH_A, "claude-aaaa1111", iso(t0 + MIN_TTL_MS + 1));
    assert.equal(r.claimed, false);
    assert.equal(r.wasExpired, true);
  });
});

// ── peerClaimedKeys ──────────────────────────────────────────────────────────
describe("peerClaimedKeys", () => {
  const units = [{ galaxy: "mill", sourceHash: HASH_A }, { galaxy: "lathe", sourceHash: HASH_B }];
  it("returns only LIVE PEER claims (not mine, not expired)", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-peerpeer" }, T0); // peer
    applyClaim(s, { galaxy: "lathe", sourceHash: HASH_B, chatId: "claude-meeeeeee" }, T0); // me
    const skip = peerClaimedKeys(s, units, "claude-meeeeeee", T0);
    assert.ok(skip.has(`mill@${HASH_A}`), "peer's claim → skip");
    assert.ok(!skip.has(`lathe@${HASH_B}`), "my own claim → don't skip");
  });
  it("no identity → EVERY live claim treated as peer (most restrictive fail-safe)", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-anyowner" }, T0);
    const skip = peerClaimedKeys(s, units, "", T0);
    assert.ok(skip.has(`mill@${HASH_A}`));
  });
  it("expired peer claim is NOT in the skip set", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-peerpeer", ttlMs: MIN_TTL_MS }, T0);
    const skip = peerClaimedKeys(s, units, "claude-meeeeeee", iso(t0 + MIN_TTL_MS + 1));
    assert.ok(!skip.has(`mill@${HASH_A}`), "expired → available, not skipped");
  });
  it("malformed units are skipped, not crashed", () => {
    assert.doesNotThrow(() => peerClaimedKeys(emptyStore(), [null, {}, { galaxy: "x" }], "claude-meeeeeee", T0));
  });
});

// ── sweepExpired ─────────────────────────────────────────────────────────────
describe("sweepExpired", () => {
  it("removes expired, keeps live, stamps lastSweepAt only when something changed", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "g1", sourceHash: HASH_A, chatId: "claude-aaaa1111", ttlMs: MIN_TTL_MS }, T0);
    applyClaim(s, { galaxy: "g2", sourceHash: HASH_A, chatId: "claude-aaaa1111", ttlMs: MAX_TTL_MS }, T0);
    const r = sweepExpired(s, iso(t0 + MIN_TTL_MS + 1));
    assert.equal(r.purged, 1);
    assert.equal(s.claims[`g1@${HASH_A}`], undefined);
    assert.ok(s.claims[`g2@${HASH_A}`]);
    assert.ok(s.lastSweepAt, "stamped because a row was purged");
  });
  it("nothing expired → no lastSweepAt churn", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "g2", sourceHash: HASH_A, chatId: "claude-aaaa1111", ttlMs: MAX_TTL_MS }, T0);
    sweepExpired(s, iso(t0 + 1000));
    assert.equal(s.lastSweepAt, null, "no purge → no write-amplification");
  });
  it("invalid nowIso → no-op (never purges everything on a bad clock)", () => {
    const s = emptyStore();
    applyClaim(s, { galaxy: "g2", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0);
    const r = sweepExpired(s, "not-a-date");
    assert.equal(r.purged, 0);
    assert.ok(s.claims[`g2@${HASH_A}`]);
  });
});

// ── isValidClaimRow ──────────────────────────────────────────────────────────
describe("isValidClaimRow", () => {
  const good = { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", claimedAt: T0, expiresAt: T0 };
  it("accepts a well-formed row", () => assert.equal(isValidClaimRow(good), true));
  it("rejects each malformed field", () => {
    assert.equal(isValidClaimRow(null), false);
    assert.equal(isValidClaimRow({ ...good, galaxy: "BAD" }), false);
    assert.equal(isValidClaimRow({ ...good, sourceHash: "nothex" }), false);
    assert.equal(isValidClaimRow({ ...good, chatId: "x" }), false);
    assert.equal(isValidClaimRow({ ...good, expiresAt: "nope" }), false);
  });
});

// ── readStore / writeStoreUnsafe (real fs) ───────────────────────────────────
describe("readStore / writeStoreUnsafe (real fs)", () => {
  it("missing file → fresh empty store (writable)", () => {
    const dir = freshDir();
    const s = readStore({ storePath: path.join(dir, "store.json") });
    assert.equal(s.readOnly, undefined);
    assert.deepEqual(s.claims, {});
  });
  it("round-trips a claim through write→read", () => {
    const dir = freshDir();
    const p = path.join(dir, "store.json");
    const s = readStore({ storePath: p });
    applyClaim(s, { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111" }, T0);
    writeStoreUnsafe(s, { storePath: p });
    const back = readStore({ storePath: p });
    assert.ok(back.claims[`mill@${HASH_A}`]);
    assert.equal(back.readOnly, undefined);
  });
  it("corrupt JSON → readOnly + corrupt file renamed aside (evidence preserved)", () => {
    const dir = freshDir();
    const p = path.join(dir, "store.json");
    fs.writeFileSync(p, "{not valid json", "utf8");
    const s = readStore({ storePath: p });
    assert.equal(s.readOnly, true);
    assert.match(s.reason, /parse failed/);
    assert.ok(!fs.existsSync(p), "corrupt original renamed away");
    assert.ok(fs.readdirSync(dir).some((f) => f.includes(".corrupt-")), "evidence kept");
  });
  it("schema-version mismatch → readOnly (refuse to clobber a newer peer)", () => {
    const dir = freshDir();
    const p = path.join(dir, "store.json");
    fs.writeFileSync(p, JSON.stringify({ schemaVersion: 99, claims: {} }), "utf8");
    const s = readStore({ storePath: p });
    assert.equal(s.readOnly, true);
    assert.match(s.reason, /schema-version mismatch/);
  });
  it("missing claims map → readOnly (schema-shape failure)", () => {
    const dir = freshDir();
    const p = path.join(dir, "store.json");
    fs.writeFileSync(p, JSON.stringify({ schemaVersion: 1 }), "utf8");
    assert.equal(readStore({ storePath: p }).readOnly, true);
  });
  it("malformed rows dropped with a warning, valid rows kept", () => {
    const dir = freshDir();
    const p = path.join(dir, "store.json");
    fs.writeFileSync(p, JSON.stringify({
      schemaVersion: 1, lastSweepAt: null,
      claims: { [`mill@${HASH_A}`]: { galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", claimedAt: T0, expiresAt: T0 }, "bad@key": { junk: true } },
    }), "utf8");
    const s = readStore({ storePath: p });
    assert.ok(s.claims[`mill@${HASH_A}`]);
    assert.equal(s.claims["bad@key"], undefined);
    assert.ok(s.warnings && /dropped 1 malformed/.test(s.warnings[0]));
  });
  it("writeStoreUnsafe refuses a readOnly store", () => {
    const dir = freshDir();
    assert.throws(() => writeStoreUnsafe({ readOnly: true, reason: "x" }, { storePath: path.join(dir, "s.json") }), /read-only/);
  });
});

// ── real-fs lock oracle (the brain-refresh lesson: locks need real coverage) ──
describe("lock layer (real fs)", () => {
  it("acquire creates the lock; release removes it", () => {
    const dir = freshDir();
    const lp = path.join(dir, "x.lock");
    assert.equal(acquireLock(lp), true);
    assert.ok(fs.existsSync(lp));
    releaseLock(lp);
    assert.ok(!fs.existsSync(lp));
  });
  it("withLock runs fn and releases afterward", () => {
    const dir = freshDir();
    const lp = path.join(dir, "x.lock");
    const out = withLock(() => 42, { lockPath: lp });
    assert.equal(out, 42);
    assert.ok(!fs.existsSync(lp), "released after success");
  });
  it("withLock releases even when fn throws", () => {
    const dir = freshDir();
    const lp = path.join(dir, "x.lock");
    assert.throws(() => withLock(() => { throw new Error("boom"); }, { lockPath: lp }), /boom/);
    assert.ok(!fs.existsSync(lp), "released after throw (no orphaned lock)");
  });
  it("a STALE held lock is stolen (crashed owner never released)", () => {
    const dir = freshDir();
    const lp = path.join(dir, "x.lock");
    fs.writeFileSync(lp, JSON.stringify({ pid: 999999, acquiredAt: "old" }), "utf8");
    fs.utimesSync(lp, new Date(Date.now() - 120_000), new Date(Date.now() - 120_000)); // 2min old > 30s stale
    assert.equal(acquireLock(lp), true, "stale lock stolen");
    releaseLock(lp);
  });
  it("stale-steal uses an ATOMIC rename and leaves NO orphan .steal-* sidecar (steal-path TOCTOU fix 2026-05-30)", () => {
    // Regression for the blind-unlink → rename-steal port. The blind `unlinkSync(lockPath)`
    // form had a steal-path double-unlink TOCTOU (a 2nd stealer could remove a lock a 1st
    // stealer already recreated → both acquire). The fix renames to a per-(pid,attempt)
    // sidecar then deletes that sidecar we now own. The load-bearing CONCURRENT proof of this
    // identical pattern is the committed cross-process STALE-STEAL oracle in the canonical
    // scripts/lib/exclusive-file-lock.test.mjs (27d8ee7235); this hermetic same-process check
    // directly exercises the NEW rename→unlink lines and asserts the sidecar is not orphaned.
    const dir = freshDir();
    const lp = path.join(dir, "x.lock");
    fs.writeFileSync(lp, JSON.stringify({ pid: 999999, acquiredAt: "old" }), "utf8");
    fs.utimesSync(lp, new Date(Date.now() - 120_000), new Date(Date.now() - 120_000)); // > 30s stale
    assert.equal(acquireLock(lp), true, "stale lock stolen");
    assert.equal(JSON.parse(fs.readFileSync(lp, "utf8")).pid, process.pid, "lock now owned by us, not the crashed pid");
    const orphans = fs.readdirSync(dir).filter((f) => f.includes(".lock.steal-"));
    assert.deepEqual(orphans, [], `rename-steal sidecar must be cleaned up; orphans found: ${orphans}`);
    releaseLock(lp);
  });
});

// ── FAIL-OPEN wrapper contract (the load-bearing correctness property) ────────
describe("tryClaimSynthesis / tryReleaseSynthesis — fail-open contract", () => {
  it("happy path: claims + persists, then a peer gets a GENUINE conflict (ok:false)", () => {
    const dir = freshDir();
    const sp = path.join(dir, "store.json");
    const lp = path.join(dir, "store.json.lock");
    const a = tryClaimSynthesis({ galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", storePath: sp, lockPath: lp });
    assert.equal(a.ok, true);
    assert.equal(a.failOpen, undefined, "real claim, not fail-open");
    assert.ok(fs.existsSync(sp), "claim persisted");
    const b = tryClaimSynthesis({ galaxy: "mill", sourceHash: HASH_A, chatId: "claude-bbbb2222", storePath: sp, lockPath: lp });
    assert.equal(b.ok, false, "genuine live peer claim → skip (NOT fail-open)");
    assert.equal(b.failOpen, undefined);
    assert.equal(b.conflict.chatId, "claude-aaaa1111");
  });

  it("idempotent re-claim by same owner → ok:true refreshed", () => {
    const dir = freshDir();
    const sp = path.join(dir, "store.json");
    const lp = path.join(dir, "store.json.lock");
    tryClaimSynthesis({ galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", storePath: sp, lockPath: lp });
    const again = tryClaimSynthesis({ galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", storePath: sp, lockPath: lp });
    assert.equal(again.ok, true);
    assert.equal(again.refreshed, true);
  });

  it("FAIL-OPEN on a corrupt store: ok:true + failOpen (synthesis must NOT be blocked)", () => {
    const dir = freshDir();
    const sp = path.join(dir, "store.json");
    const lp = path.join(dir, "store.json.lock");
    fs.writeFileSync(sp, "{garbage", "utf8");
    const r = tryClaimSynthesis({ galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", storePath: sp, lockPath: lp });
    assert.equal(r.ok, true, "corrupt store must fail-OPEN, never block");
    assert.equal(r.failOpen, true);
    assert.match(r.reason, /read-only/);
  });

  it("FAIL-OPEN when the lock cannot be acquired (un-creatable lock path): ok:true + failOpen", () => {
    const dir = freshDir();
    const sp = path.join(dir, "store.json");
    // lock path under a NON-existent subdir → openSync('wx') throws ENOENT (not EEXIST) →
    // acquireLock rethrows → withLock propagates → wrapper catch → fail-open.
    const lp = path.join(dir, "no", "such", "dir", "store.json.lock");
    const r = tryClaimSynthesis({ galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", storePath: sp, lockPath: lp });
    assert.equal(r.ok, true, "lock-acquire failure must fail-OPEN");
    assert.equal(r.failOpen, true);
  });

  it("release happy path removes the claim; release of unclaimed is a benign not_claimed", () => {
    const dir = freshDir();
    const sp = path.join(dir, "store.json");
    const lp = path.join(dir, "store.json.lock");
    tryClaimSynthesis({ galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", storePath: sp, lockPath: lp });
    const rel = tryReleaseSynthesis({ galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", storePath: sp, lockPath: lp });
    assert.equal(rel.ok, true);
    const back = readStore({ storePath: sp });
    assert.equal(back.claims[`mill@${HASH_A}`], undefined, "claim released → galaxy available again");
    const rel2 = tryReleaseSynthesis({ galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", storePath: sp, lockPath: lp });
    assert.equal(rel2.ok, false);
    assert.equal(rel2.reason, "not_claimed");
  });

  it("release FAIL-OPEN (failOpen flag) on a lock-acquire failure — never throws", () => {
    const dir = freshDir();
    const sp = path.join(dir, "store.json");
    const lp = path.join(dir, "no", "dir", "s.lock");
    const r = tryReleaseSynthesis({ galaxy: "mill", sourceHash: HASH_A, chatId: "claude-aaaa1111", storePath: sp, lockPath: lp });
    assert.equal(r.failOpen, true);
    assert.equal(r.ok, false);
  });
});
