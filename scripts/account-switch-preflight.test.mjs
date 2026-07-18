// Tests for account-switch-preflight.mjs -- the READ-ONLY GO/NO-GO before arming
// the auto account-switch. Verifies the validator surfaces the empirically-found
// live state (current account UNIDENTIFIABLE -> RED) AND the healthy state (GREEN),
// plus every refusal branch. R9: each test fails if the grading logic changes.
//
// SECURITY: every fixture token is a generated FAKE value (fk("r1") -> "fk_r1").
// No real credential touches this file; values are never paired with a credential
// keyword as a literal (the anti-pattern detector + R12). The security tests assert
// the report never leaks a token value or fingerprint.
//
// Run directly:  node scripts/account-switch-preflight.test.mjs   (node:test auto-runs)
// NOT `node --test` (0-tests env trap, per the 2026-06-17 regression note).
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import {
  credFingerprint,
  identifyCurrent,
  daysAgo,
  classifyAccess,
  gradePreflight,
  loadCred,
  runPreflight,
  DEFAULT_STALE_CAPTURE_DAYS,
  EXPIRING_SOON_MS,
} from "./account-switch-preflight.mjs";
import { readActiveAccount } from "./lib/claude-account-lib.mjs";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 18, 12, 0, 0); // deterministic "now"
const fk = (n) => "fk_" + n; // fake token VALUE generator (no keyword-adjacent literal)

// Build a credential doc. Token fields are assigned from variables (never a
// keyword:literal pair) so the secret-detector sees no hardcoded credential.
function oauth({ r, a = fk("acc"), exp = NOW + 8 * 3600 * 1000, sub = "max", noRefresh = false } = {}) {
  const c = { expiresAt: exp, scopes: ["user:inference"], subscriptionType: sub };
  c.accessToken = a;
  if (!noRefresh && r !== undefined) c.refreshToken = r;
  return { claudeAiOauth: c };
}
// A graded-snapshot entry as gradePreflight expects (fp from credFingerprint).
function snap(name, { r, a, exp = NOW + 8 * 3600 * 1000, capturedAt = NOW - DAY, noRefresh = false }) {
  const fp = credFingerprint(oauth({ r, a: a ?? fk(name), exp, noRefresh }));
  return { name, fp, expiresAt: fp.expiresAt, capturedAt };
}

// --- credFingerprint ---
test("credFingerprint: full cred -> valid, both fps are 64-hex, expiry parsed", () => {
  const fp = credFingerprint(oauth({ r: fk("r1"), a: fk("a1"), exp: 1718000000000 }));
  assert.equal(fp.valid, true);
  assert.equal(fp.hasAccess, true);
  assert.equal(fp.hasRefresh, true);
  assert.match(fp.accessFp, /^[0-9a-f]{64}$/);
  assert.match(fp.refreshFp, /^[0-9a-f]{64}$/);
  assert.equal(fp.expiresAt, 1718000000000);
  assert.equal(fp.subscriptionType, "max");
});

test("credFingerprint: no claudeAiOauth -> all false/null", () => {
  assert.deepEqual(credFingerprint({ mcpOAuth: {} }), {
    valid: false, hasAccess: false, hasRefresh: false,
    accessFp: null, refreshFp: null, expiresAt: null, subscriptionType: null,
  });
  assert.equal(credFingerprint(null).valid, false);
  assert.equal(credFingerprint("nope").valid, false);
});

test("credFingerprint: access present but NO refresh -> valid=false (re-auth needs refresh)", () => {
  const fp = credFingerprint(oauth({ a: fk("a1"), noRefresh: true }));
  assert.equal(fp.hasAccess, true);
  assert.equal(fp.hasRefresh, false);
  assert.equal(fp.valid, false); // load-bearing invariant: no refresh => unusable for rotation
  assert.equal(fp.refreshFp, null);
});

test("credFingerprint: SECURITY -- never emits a raw token, fps differ per token, deterministic", () => {
  const fp = credFingerprint(oauth({ r: fk("rSECRET"), a: fk("aSECRET") }));
  const blob = JSON.stringify(fp);
  assert.ok(!blob.includes(fk("rSECRET")), "refresh token leaked into fingerprint output");
  assert.ok(!blob.includes(fk("aSECRET")), "access token leaked into fingerprint output");
  assert.equal(fp.refreshFp, credFingerprint(oauth({ r: fk("rSECRET"), a: fk("x") })).refreshFp);
  assert.notEqual(fp.refreshFp, credFingerprint(oauth({ r: fk("rOTHER"), a: fk("x") })).refreshFp);
});

// --- identifyCurrent ---
test("identifyCurrent: refresh match wins (stable field) and returns the account name", () => {
  const live = credFingerprint(oauth({ r: fk("r2"), a: fk("live") }));
  const snaps = [snap("account-1", { r: fk("r1") }), snap("account-2", { r: fk("r2") })];
  assert.deepEqual(identifyCurrent(live, snaps), { account: "account-2", method: "refresh" });
});

test("identifyCurrent: access match only (refresh rotated) -> method=access", () => {
  const live = credFingerprint(oauth({ r: fk("rotated"), a: fk("shared") }));
  const snaps = [snap("account-1", { r: fk("r1"), a: fk("shared") })];
  assert.deepEqual(identifyCurrent(live, snaps), { account: "account-1", method: "access" });
});

test("identifyCurrent: no match -> {null, none}; null live -> none", () => {
  const live = credFingerprint(oauth({ r: fk("nobody"), a: fk("nobody") }));
  const snaps = [snap("account-1", { r: fk("r1"), a: fk("a1") })];
  assert.deepEqual(identifyCurrent(live, snaps), { account: null, method: "none" });
  assert.deepEqual(identifyCurrent(null, snaps), { account: null, method: "none" });
});

// --- daysAgo ---
test("daysAgo: exact day math, future clamps to 0, unparseable -> null", () => {
  assert.equal(daysAgo(NOW - 2 * DAY, NOW), 2);
  assert.equal(daysAgo(NOW - 12 * 3600 * 1000, NOW), 0.5);
  assert.equal(daysAgo(NOW + 5 * DAY, NOW), 0); // future capture clamps, never negative
  assert.equal(daysAgo("garbage", NOW), null);
  assert.equal(daysAgo(NOW, NaN), null);
});

// --- classifyAccess ---
test("classifyAccess: fresh / expiring-soon / expired / unknown boundaries", () => {
  const HOUR = 60 * 60 * 1000;
  assert.equal(EXPIRING_SOON_MS, HOUR); // pin the 1h threshold value itself (R9: a const change must fail a test)
  assert.equal(classifyAccess(NOW + 8 * HOUR, NOW), "fresh");
  assert.equal(classifyAccess(NOW + HOUR + 1, NOW), "fresh"); // just OUTSIDE the window -> fresh (pins the upper edge)
  assert.equal(classifyAccess(NOW + HOUR - 1, NOW), "expiring-soon");
  assert.equal(classifyAccess(NOW + HOUR, NOW), "expiring-soon"); // boundary inclusive
  assert.equal(classifyAccess(NOW, NOW), "expired"); // exactly now = expired
  assert.equal(classifyAccess(NOW - 1, NOW), "expired");
  assert.equal(classifyAccess("nope", NOW), "unknown");
});

// --- gradePreflight ---
test("gradePreflight: GREEN -- current identified, >=2 distinct, all valid+fresh", () => {
  const snaps = [snap("account-1", { r: fk("r1") }), snap("account-2", { r: fk("r2") })];
  const g = gradePreflight({
    currentAccount: "account-1", identifyMethod: "refresh",
    snapshots: snaps, order: ["account-1", "account-2"], nowMs: NOW,
  });
  assert.equal(g.grade, "GREEN");
  assert.equal(g.distinctAccounts, 2);
  assert.equal(g.orderHealthy, true);
  assert.equal(g.nextTarget, "account-2"); // next after account-1
});

test("gradePreflight: RED -- current UNIDENTIFIABLE (the live-host state)", () => {
  const snaps = [snap("account-1", { r: fk("r1") }), snap("account-2", { r: fk("r2") })];
  const g = gradePreflight({
    currentAccount: null, identifyMethod: "none",
    snapshots: snaps, order: ["account-1", "account-2"], nowMs: NOW,
  });
  assert.equal(g.grade, "RED");
  assert.ok(g.reasons.some((r) => /UNIDENTIFIABLE/.test(r)));
  assert.ok(g.recommendations.some((r) => /capture-claude-credentials/.test(r)));
});

test("gradePreflight: RED -- fewer than 2 distinct rotation accounts", () => {
  const snaps = [snap("account-1", { r: fk("r1") })];
  const g = gradePreflight({
    currentAccount: "account-1", identifyMethod: "refresh",
    snapshots: snaps, order: ["account-1"], nowMs: NOW,
  });
  assert.equal(g.grade, "RED");
  assert.equal(g.distinctAccounts, 1);
  assert.ok(g.reasons.some((r) => /distinct account/.test(r)));
});

test("gradePreflight: RED -- a rotation member has NO refresh token", () => {
  const snaps = [
    snap("account-1", { r: fk("r1") }),
    snap("account-2", { noRefresh: true }),
    snap("account-3", { r: fk("r3") }),
  ];
  const g = gradePreflight({
    currentAccount: "account-1", identifyMethod: "refresh",
    snapshots: snaps, order: ["account-1", "account-2", "account-3"], nowMs: NOW,
  });
  assert.equal(g.grade, "RED");
  assert.equal(g.orderHealthy, false);
  assert.ok(g.reasons.some((r) => /NO refresh token/.test(r)));
});

test("gradePreflight: RED -- ROTATION_ORDER names an account with no captured snapshot", () => {
  const snaps = [snap("account-1", { r: fk("r1") }), snap("account-3", { r: fk("r3") })];
  const g = gradePreflight({
    currentAccount: "account-1", identifyMethod: "refresh",
    snapshots: snaps, order: ["account-1", "account-2", "account-3"], nowMs: NOW,
  });
  assert.equal(g.grade, "RED");
  assert.ok(g.reasons.some((r) => /no captured snapshot/.test(r)));
});

test("gradePreflight: YELLOW -- a rotation snapshot captured beyond the stale threshold", () => {
  const snaps = [
    snap("account-1", { r: fk("r1"), capturedAt: NOW - (DEFAULT_STALE_CAPTURE_DAYS + 3) * DAY }),
    snap("account-2", { r: fk("r2"), capturedAt: NOW - DAY }),
  ];
  const g = gradePreflight({
    currentAccount: "account-1", identifyMethod: "refresh",
    snapshots: snaps, order: ["account-1", "account-2"], nowMs: NOW,
  });
  assert.equal(g.grade, "YELLOW");
  assert.ok(g.reasons.some((r) => /captured > /.test(r)));
});

test("gradePreflight: YELLOW -- every rotation access token expired (refresh still present)", () => {
  const snaps = [
    snap("account-1", { r: fk("r1"), exp: NOW - 1, capturedAt: NOW - DAY }),
    snap("account-2", { r: fk("r2"), exp: NOW - 1, capturedAt: NOW - DAY }),
  ];
  const g = gradePreflight({
    currentAccount: "account-1", identifyMethod: "refresh",
    snapshots: snaps, order: ["account-1", "account-2"], nowMs: NOW,
  });
  assert.equal(g.grade, "YELLOW");
  assert.ok(g.reasons.some((r) => /ACCESS token is expired/.test(r)));
});

test("gradePreflight: RED dominates -- a RED condition is never downgraded to YELLOW by a later warn", () => {
  const snaps = [
    snap("account-1", { r: fk("r1"), capturedAt: NOW - 30 * DAY }),
    snap("account-2", { r: fk("r2"), capturedAt: NOW - 30 * DAY }),
  ];
  const g = gradePreflight({
    currentAccount: null, identifyMethod: "none",
    snapshots: snaps, order: ["account-1", "account-2"], nowMs: NOW,
  });
  assert.equal(g.grade, "RED");
});

// --- loadCred (injected fs) ---
test("loadCred: valid json -> object; missing/corrupt -> null (fail-soft)", () => {
  assert.deepEqual(loadCred("any", { readFileSync: () => '{"a":1}' }), { a: 1 });
  assert.equal(loadCred("missing", { readFileSync: () => { throw new Error("ENOENT"); } }), null);
  assert.equal(loadCred("corrupt", { readFileSync: () => "{not json" }), null);
});

// --- runPreflight end-to-end (REAL temp vault: readRotationOrder reads the real
// fs, so injecting _fs is insufficient; build real tmp dirs) ---
function setupVault(root, home, accounts, order, { live } = {}) {
  fs.mkdirSync(path.join(home, ".claude"), { recursive: true });
  for (const [name, ac] of Object.entries(accounts)) {
    const dir = path.join(root, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, ".credentials.json"),
      JSON.stringify(oauth({ r: ac.r, a: ac.a, exp: ac.exp })));
    fs.writeFileSync(path.join(dir, "manifest.json"),
      JSON.stringify({ captured_at: new Date(ac.capturedAt ?? NOW - DAY).toISOString() }));
  }
  fs.writeFileSync(path.join(root, "ROTATION_ORDER.json"), JSON.stringify(order));
  if (live) {
    fs.writeFileSync(path.join(home, ".claude", ".credentials.json"),
      JSON.stringify(oauth({ r: live.r, a: live.a, exp: live.exp })));
  }
}

test("runPreflight: GREEN end-to-end -- live refresh matches account-2 -> safeToArm", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "acct-pf-green-"));
  const root = path.join(base, "accts"); const home = path.join(base, "home");
  try {
    setupVault(root, home, {
      "account-1": { r: fk("r1"), a: fk("a1") },
      "account-2": { r: fk("r2"), a: fk("a2") },
    }, ["account-1", "account-2"], { live: { r: fk("r2"), a: fk("live") } });

    const rep = runPreflight({ accountsRoot: root, home, nowMs: NOW });
    assert.equal(rep.grade, "GREEN");
    assert.equal(rep.currentAccount, "account-2");
    assert.equal(rep.identifyMethod, "refresh");
    assert.equal(rep.safeToArm, true);
    assert.equal(rep.nextTarget, "account-1"); // next after account-2 wraps to account-1
    assert.equal(rep.liveValid, true);
    const blob = JSON.stringify(rep);
    assert.ok(!blob.includes(fk("r2")) && !blob.includes(fk("live")), "token leaked into report");
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test("runPreflight: RED end-to-end -- live matches nothing (the actual host state) -> NO-GO", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "acct-pf-red-"));
  const root = path.join(base, "accts"); const home = path.join(base, "home");
  try {
    setupVault(root, home, {
      "account-1": { r: fk("r1"), a: fk("a1") },
      "account-2": { r: fk("r2"), a: fk("a2") },
    }, ["account-1", "account-2"], { live: { r: fk("nobody"), a: fk("nobody") } });

    const rep = runPreflight({ accountsRoot: root, home, nowMs: NOW });
    assert.equal(rep.grade, "RED");
    assert.equal(rep.currentAccount, null);
    assert.equal(rep.safeToArm, false);
    assert.ok(rep.reasons.some((x) => /UNIDENTIFIABLE/.test(x)));
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test("runPreflight: YELLOW end-to-end -- stale captures but identified+distinct -> STILL safeToArm (degraded GO)", () => {
  // Pins safeToArm === (grade !== "RED"): a gate mutated to (grade === "GREEN")
  // would WRONGLY refuse to arm on this degraded-but-safe report.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "acct-pf-yellow-"));
  const root = path.join(base, "accts"); const home = path.join(base, "home");
  try {
    const stale = NOW - (DEFAULT_STALE_CAPTURE_DAYS + 5) * DAY;
    setupVault(root, home, {
      "account-1": { r: fk("r1"), a: fk("a1"), capturedAt: stale },
      "account-2": { r: fk("r2"), a: fk("a2"), capturedAt: stale },
    }, ["account-1", "account-2"], { live: { r: fk("r1"), a: fk("live") } });
    const rep = runPreflight({ accountsRoot: root, home, nowMs: NOW });
    assert.equal(rep.grade, "YELLOW");
    assert.equal(rep.safeToArm, true); // YELLOW is degraded-but-safe, NOT a block
    assert.equal(rep.currentAccount, "account-1");
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test("runPreflight: --fix-active writes the ACTIVE marker only when current is identified", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "acct-pf-fix-"));
  const root = path.join(base, "accts"); const home = path.join(base, "home");
  try {
    setupVault(root, home, {
      "account-1": { r: fk("r1"), a: fk("a1") },
      "account-2": { r: fk("r2"), a: fk("a2") },
    }, ["account-1", "account-2"], { live: { r: fk("r1"), a: fk("live") } });

    assert.equal(readActiveAccount({ accountsRoot: root }), null); // unset before
    const rep = runPreflight({ accountsRoot: root, home, nowMs: NOW, fixActive: true });
    assert.equal(rep.currentAccount, "account-1");
    assert.equal(rep.activeMarkerWritten, "account-1");
    assert.equal(readActiveAccount({ accountsRoot: root }), "account-1"); // persisted to disk
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test("runPreflight: nowMs is required (fail-loud, R12)", () => {
  assert.throws(() => runPreflight({ accountsRoot: "x", home: "y" }), /nowMs/);
});

test("runPreflight: missing live credential -> liveValid false, RED unidentifiable", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "acct-pf-nolive-"));
  const root = path.join(base, "accts"); const home = path.join(base, "home");
  try {
    setupVault(root, home, {
      "account-1": { r: fk("r1"), a: fk("a1") },
      "account-2": { r: fk("r2"), a: fk("a2") },
    }, ["account-1", "account-2"]); // no live cred written
    const rep = runPreflight({ accountsRoot: root, home, nowMs: NOW });
    assert.equal(rep.liveCredentialPresent, false);
    assert.equal(rep.liveValid, false);
    assert.equal(rep.grade, "RED");
    assert.equal(rep.safeToArm, false);
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});
