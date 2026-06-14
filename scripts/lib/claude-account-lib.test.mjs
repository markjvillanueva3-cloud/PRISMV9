// scripts/lib/claude-account-lib.test.mjs
// Tests for claude-account-lib. Uses node:test (matches PRISM lib convention).

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ACCOUNT_LABEL_RE,
  ACCOUNT_NAME_RE,
  ACTIVE_MARKER_FILE,
  DEFAULT_ACCOUNTS_ROOT,
  LAST_SWITCH_FILE,
  ROTATION_ORDER_FILE,
  SCHEMA,
  SCHEMA_VERSION,
  SWAP_LOCK_FILE,
  accountDir,
  acquireSwapLock,
  buildManifest,
  captureCredentials,
  credentialSnapshotPath,
  listAccounts,
  manifestPath,
  readActiveAccount,
  readLastSwitch,
  readManifest,
  readRotationOrder,
  resolveLiveCredentialPath,
  writeActiveAccount,
  writeLastSwitch,
  writeManifest,
  writeRotationOrder,
} from "./claude-account-lib.mjs";

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

function makeRoot() {
  const r = join(tmpdir(), `cal-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(r, { recursive: true });
  return r;
}

function writeFakeCred(path, payload = { access_token: "abc", refresh_token: "xyz" }) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(payload) + "\n", "utf8");
  return path;
}

// ------------------------------------------------------------------
// Path helpers
// ------------------------------------------------------------------

test("resolveLiveCredentialPath joins ~/.claude/.credentials.json", () => {
  const home = "C:/Users/test";
  const p = resolveLiveCredentialPath({ home });
  assert.equal(p.replace(/\\/g, "/"), "C:/Users/test/.claude/.credentials.json");
});

test("accountDir validates name shape", () => {
  const root = "H:/x";
  assert.equal(accountDir("account-1", { accountsRoot: root }).replace(/\\/g, "/"), "H:/x/account-1");
  assert.equal(accountDir("account-99", { accountsRoot: root }).replace(/\\/g, "/"), "H:/x/account-99");
  assert.throws(() => accountDir("account-0", { accountsRoot: root }), /invalid account name/);
  assert.throws(() => accountDir("account-100", { accountsRoot: root }), /invalid account name/);
  assert.throws(() => accountDir("account-a", { accountsRoot: root }), /invalid account name/);
  assert.throws(() => accountDir("", { accountsRoot: root }), /invalid account name/);
  assert.throws(() => accountDir("../account-1", { accountsRoot: root }), /invalid account name/);
});

test("manifestPath + credentialSnapshotPath derive from accountDir", () => {
  const root = "H:/x";
  assert.equal(manifestPath("account-1", { accountsRoot: root }).replace(/\\/g, "/"), "H:/x/account-1/manifest.json");
  assert.equal(credentialSnapshotPath("account-1", { accountsRoot: root }).replace(/\\/g, "/"), "H:/x/account-1/.credentials.json");
});

test("regexes are documented + tight", () => {
  assert.match("account-1", ACCOUNT_NAME_RE);
  assert.match("account-12", ACCOUNT_NAME_RE);
  assert.doesNotMatch("account-0", ACCOUNT_NAME_RE);
  assert.doesNotMatch("account-x", ACCOUNT_NAME_RE);

  assert.match("home-pro", ACCOUNT_LABEL_RE);
  assert.match("work primary", ACCOUNT_LABEL_RE);
  assert.match("acct.7_max", ACCOUNT_LABEL_RE);
  assert.doesNotMatch("with/slash", ACCOUNT_LABEL_RE);
  assert.doesNotMatch("", ACCOUNT_LABEL_RE);
  assert.doesNotMatch("x".repeat(65), ACCOUNT_LABEL_RE);
});

// ------------------------------------------------------------------
// buildManifest
// ------------------------------------------------------------------

test("buildManifest produces a v1 schema record", () => {
  const m = buildManifest({
    name: "account-1",
    label: "home-pro",
    rotationPosition: 1,
    liveCredentialPath: "C:/Users/test/.claude/.credentials.json",
    accountsRoot: "H:/x",
    capturedAt: "2026-05-23T00:00:00.000Z",
    notes: "first capture",
  });
  assert.equal(m.$schema, SCHEMA);
  assert.equal(m.schemaVersion, SCHEMA_VERSION);
  assert.equal(m.name, "account-1");
  assert.equal(m.label, "home-pro");
  assert.equal(m.rotation_position, 1);
  assert.equal(m.credential_file, "H:/x/account-1/.credentials.json");
  assert.equal(m.captured_from_live_path, "C:/Users/test/.claude/.credentials.json");
  // P1-4: confirm legacy field name is GONE (must not silently coexist).
  assert.equal(m.live_credential_path, undefined);
  assert.equal(m.captured_at, "2026-05-23T00:00:00.000Z");
  assert.equal(m.last_used_at, null);
  assert.equal(m.last_5h_window_start_at, null);
  assert.equal(m.notes, "first capture");
});

test("buildManifest rejects invalid name / label / rotation_position", () => {
  const base = { name: "account-1", label: "ok", rotationPosition: 1, liveCredentialPath: "C:/x" };
  assert.throws(() => buildManifest({ ...base, name: "bad" }), /invalid account name/);
  assert.throws(() => buildManifest({ ...base, label: "bad/label" }), /invalid label/);
  assert.throws(() => buildManifest({ ...base, label: "" }), /invalid label/);
  assert.throws(() => buildManifest({ ...base, rotationPosition: 0 }), /rotation_position/);
  assert.throws(() => buildManifest({ ...base, rotationPosition: 100 }), /rotation_position/);
  assert.throws(() => buildManifest({ ...base, rotationPosition: 1.5 }), /rotation_position/);
  assert.throws(() => buildManifest({ ...base, rotationPosition: "two" }), /rotation_position/);
  assert.throws(() => buildManifest({ ...base, liveCredentialPath: "" }), /liveCredentialPath/);
});

// ------------------------------------------------------------------
// read/write manifest round-trip
// ------------------------------------------------------------------

test("writeManifest + readManifest round-trip (and reject foreign $schema)", () => {
  const root = makeRoot();
  try {
    const m = buildManifest({
      name: "account-2",
      label: "work-secondary",
      rotationPosition: 2,
      liveCredentialPath: "C:/Users/test/.claude/.credentials.json",
      accountsRoot: root,
      capturedAt: "2026-05-23T00:01:00.000Z",
    });
    const target = writeManifest("account-2", m, { accountsRoot: root });
    assert.ok(existsSync(target));
    const back = readManifest("account-2", { accountsRoot: root });
    assert.deepEqual(back, m);

    // Foreign schema → throw
    const evilManifest = { ...m, $schema: "other-schema" };
    writeFileSync(target, JSON.stringify(evilManifest), "utf8");
    assert.throws(() => readManifest("account-2", { accountsRoot: root }), /unexpected \$schema/);

    // Malformed JSON → throw
    writeFileSync(target, "not json", "utf8");
    assert.throws(() => readManifest("account-2", { accountsRoot: root }), /malformed manifest/);

    // Missing → null (not throw)
    assert.equal(readManifest("account-3", { accountsRoot: root }), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------
// captureCredentials — happy path + 4 failure modes + 2 adversarial inputs
// ------------------------------------------------------------------

test("captureCredentials happy path snapshots cred + writes manifest + returns sha256", () => {
  const root = makeRoot();
  try {
    const fakeHome = join(root, "home");
    const src = writeFakeCred(join(fakeHome, ".claude", ".credentials.json"));
    const result = captureCredentials({
      accountName: "account-1",
      label: "test-1",
      rotationPosition: 1,
      accountsRoot: root,
      home: fakeHome,
      notes: "smoke",
    });
    assert.ok(existsSync(result.credentialFile));
    assert.ok(existsSync(result.manifestFile));
    assert.equal(readFileSync(result.credentialFile, "utf8"), readFileSync(src, "utf8"));
    assert.equal(result.manifest.label, "test-1");
    assert.equal(result.manifest.rotation_position, 1);
    assert.equal(result.manifest.notes, "smoke");
    assert.equal(result.bytesCopied, readFileSync(src, "utf8").length);

    // P1-2: sha256 of source must be returned and match the snapshot bytes.
    const expected = createHash("sha256").update(readFileSync(src)).digest("hex");
    assert.equal(result.sha256, expected);
    const snapshotSha = createHash("sha256").update(readFileSync(result.credentialFile)).digest("hex");
    assert.equal(snapshotSha, expected);

    // P0-2: notes preserved when printable
    assert.equal(result.manifest.notes, "smoke");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("captureCredentials rejects notes with ANSI escape (P0-2)", () => {
  const root = makeRoot();
  try {
    const fakeHome = join(root, "home");
    writeFakeCred(join(fakeHome, ".claude", ".credentials.json"));
    assert.throws(
      () => captureCredentials({
        accountName: "account-1",
        label: "ok",
        rotationPosition: 1,
        accountsRoot: root,
        home: fakeHome,
        notes: "evil\x1b[31mred\x1b[0m",
      }),
      /printable ASCII/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("captureCredentials rejects notes >512 chars (P0-2)", () => {
  const root = makeRoot();
  try {
    const fakeHome = join(root, "home");
    writeFakeCred(join(fakeHome, ".claude", ".credentials.json"));
    assert.throws(
      () => captureCredentials({
        accountName: "account-1",
        label: "ok",
        rotationPosition: 1,
        accountsRoot: root,
        home: fakeHome,
        notes: "x".repeat(513),
      }),
      /notes too long/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("captureCredentials refuses double-capture without overwrite", () => {
  const root = makeRoot();
  try {
    const fakeHome = join(root, "home");
    writeFakeCred(join(fakeHome, ".claude", ".credentials.json"));
    const opts = { accountName: "account-1", label: "test-1", rotationPosition: 1, accountsRoot: root, home: fakeHome };
    captureCredentials(opts);
    assert.throws(() => captureCredentials(opts), /already has a captured credential/);
    // With overwrite:true → succeeds
    const re = captureCredentials({ ...opts, overwrite: true });
    assert.ok(existsSync(re.credentialFile));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("captureCredentials fails-loud on missing source", () => {
  const root = makeRoot();
  try {
    const fakeHome = join(root, "home"); // never write the cred
    assert.throws(
      () => captureCredentials({ accountName: "account-1", label: "t", rotationPosition: 1, accountsRoot: root, home: fakeHome }),
      /source credential file not found/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("captureCredentials fails-loud on empty source file (adversarial: 0-byte)", () => {
  const root = makeRoot();
  try {
    const fakeHome = join(root, "home");
    const src = join(fakeHome, ".claude", ".credentials.json");
    mkdirSync(join(fakeHome, ".claude"), { recursive: true });
    writeFileSync(src, "", "utf8");
    assert.throws(
      () => captureCredentials({ accountName: "account-1", label: "t", rotationPosition: 1, accountsRoot: root, home: fakeHome }),
      /source credential file is empty/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("captureCredentials fails-loud on malformed JSON source (adversarial: truncated)", () => {
  const root = makeRoot();
  try {
    const fakeHome = join(root, "home");
    const src = join(fakeHome, ".claude", ".credentials.json");
    mkdirSync(join(fakeHome, ".claude"), { recursive: true });
    writeFileSync(src, '{"access_token": "abc', "utf8"); // truncated
    assert.throws(
      () => captureCredentials({ accountName: "account-1", label: "t", rotationPosition: 1, accountsRoot: root, home: fakeHome }),
      /not valid JSON/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("captureCredentials rejects path-traversal name", () => {
  const root = makeRoot();
  try {
    const fakeHome = join(root, "home");
    writeFakeCred(join(fakeHome, ".claude", ".credentials.json"));
    assert.throws(
      () => captureCredentials({ accountName: "../etc", label: "t", rotationPosition: 1, accountsRoot: root, home: fakeHome }),
      /invalid account name/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------
// listAccounts — variability floor: 3 accounts including one broken
// ------------------------------------------------------------------

test("listAccounts returns all accounts sorted by rotation_position", () => {
  const root = makeRoot();
  try {
    const fakeHome = join(root, "home");
    writeFakeCred(join(fakeHome, ".claude", ".credentials.json"));

    captureCredentials({ accountName: "account-3", label: "third", rotationPosition: 3, accountsRoot: root, home: fakeHome });
    captureCredentials({ accountName: "account-1", label: "first", rotationPosition: 1, accountsRoot: root, home: fakeHome });
    captureCredentials({ accountName: "account-2", label: "second", rotationPosition: 2, accountsRoot: root, home: fakeHome });

    // Broken account: dir exists + cred snapshot but no manifest
    const ghostDir = join(root, "account-4");
    mkdirSync(ghostDir, { recursive: true });
    writeFileSync(join(ghostDir, ".credentials.json"), "{}", "utf8");

    // Non-account directory should be ignored
    mkdirSync(join(root, "not-an-account"), { recursive: true });

    const accounts = listAccounts({ accountsRoot: root });
    assert.equal(accounts.length, 4);
    assert.deepEqual(
      accounts.map((a) => a.name),
      ["account-1", "account-2", "account-3", "account-4"],
    );
    assert.equal(accounts[0].manifest.label, "first");
    assert.equal(accounts[1].manifest.label, "second");
    assert.equal(accounts[2].manifest.label, "third");
    // account-4 has cred but no manifest
    assert.equal(accounts[3].hasManifest, false);
    assert.equal(accounts[3].hasCredential, true);
    assert.equal(accounts[3].manifest, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listAccounts returns [] when root is missing", () => {
  const root = join(tmpdir(), `cal-missing-${process.pid}-${Date.now()}`);
  assert.equal(existsSync(root), false);
  assert.deepEqual(listAccounts({ accountsRoot: root }), []);
});

test("DEFAULT_ACCOUNTS_ROOT is the documented path", () => {
  assert.equal(DEFAULT_ACCOUNTS_ROOT, "H:/.claude-accounts");
});

// ------------------------------------------------------------------
// Marker accessors — P1-1 from 2026-05-23 scrutiny.
// ------------------------------------------------------------------

test("readActiveAccount / writeActiveAccount round-trip + reject invalid", () => {
  const root = makeRoot();
  try {
    assert.equal(readActiveAccount({ accountsRoot: root }), null);
    writeActiveAccount("account-2", { accountsRoot: root });
    assert.equal(readActiveAccount({ accountsRoot: root }), "account-2");
    // Re-write replaces value
    writeActiveAccount("account-5", { accountsRoot: root });
    assert.equal(readActiveAccount({ accountsRoot: root }), "account-5");
    // Invalid name rejected
    assert.throws(() => writeActiveAccount("../etc", { accountsRoot: root }), /invalid account name/);
    // Tampered ACTIVE file → throw
    writeFileSync(join(root, ACTIVE_MARKER_FILE), "bogus\n", "utf8");
    assert.throws(() => readActiveAccount({ accountsRoot: root }), /invalid value/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readRotationOrder / writeRotationOrder round-trip + reject malformed", () => {
  const root = makeRoot();
  try {
    assert.equal(readRotationOrder({ accountsRoot: root }), null);
    writeRotationOrder(["account-1", "account-2", "account-3"], { accountsRoot: root });
    assert.deepEqual(readRotationOrder({ accountsRoot: root }), ["account-1", "account-2", "account-3"]);
    // Reject non-array writes
    assert.throws(() => writeRotationOrder("not-an-array", { accountsRoot: root }), /must be an array/);
    // Reject invalid entry on write
    assert.throws(
      () => writeRotationOrder(["account-1", "bogus"], { accountsRoot: root }),
      /invalid entry/,
    );
    // Malformed JSON on disk → throw on read
    writeFileSync(join(root, ROTATION_ORDER_FILE), "not json", "utf8");
    assert.throws(() => readRotationOrder({ accountsRoot: root }), /malformed/);
    // Non-array JSON on disk → throw
    writeFileSync(join(root, ROTATION_ORDER_FILE), '{"hi":1}', "utf8");
    assert.throws(() => readRotationOrder({ accountsRoot: root }), /must be a JSON array/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readLastSwitch / writeLastSwitch capture from→to + reject invalid", () => {
  const root = makeRoot();
  try {
    assert.equal(readLastSwitch({ accountsRoot: root }), null);
    const rec = writeLastSwitch(
      { from: "account-1", to: "account-2", by: "bravo-test", trigger: "manual", ts: "2026-05-23T01:00:00.000Z" },
      { accountsRoot: root },
    );
    assert.equal(rec.from, "account-1");
    assert.equal(rec.to, "account-2");
    assert.equal(rec.by, "bravo-test");
    assert.equal(rec.trigger, "manual");
    const back = readLastSwitch({ accountsRoot: root });
    assert.deepEqual(back, rec);
    // First-ever swap: from=null is allowed
    const first = writeLastSwitch(
      { to: "account-3", by: "bootstrap", trigger: "first-capture", ts: "2026-05-23T00:00:00.000Z" },
      { accountsRoot: root },
    );
    assert.equal(first.from, null);
    // Bad to → throw
    assert.throws(
      () => writeLastSwitch({ to: "../escape" }, { accountsRoot: root }),
      /invalid 'to'/,
    );
    // Bad from → throw
    assert.throws(
      () => writeLastSwitch({ from: "junk", to: "account-1" }, { accountsRoot: root }),
      /invalid 'from'/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------
// acquireSwapLock — P1-3 from 2026-05-23 scrutiny.
// ------------------------------------------------------------------

test("acquireSwapLock — single acquire + release", () => {
  const root = makeRoot();
  try {
    const lock = acquireSwapLock({ accountsRoot: root, by: "bravo-test" });
    assert.equal(lock.held, true);
    assert.ok(existsSync(lock.path));
    assert.equal(lock.path, join(root, SWAP_LOCK_FILE));
    // Lock body is a JSON record with pid + ts + by
    const body = JSON.parse(readFileSync(lock.path, "utf8"));
    assert.equal(typeof body.ts, "string");
    assert.equal(body.pid, process.pid);
    assert.equal(body.by, "bravo-test");
    // Release removes the file
    assert.equal(lock.release(), true);
    assert.equal(existsSync(lock.path), false);
    // Releasing twice is a no-op (false return, no throw)
    assert.equal(lock.release(), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("acquireSwapLock — contention throws", () => {
  const root = makeRoot();
  try {
    const a = acquireSwapLock({ accountsRoot: root, by: "first" });
    assert.throws(
      () => acquireSwapLock({ accountsRoot: root, by: "second" }),
      /swap lock held|failed to acquire swap lock/,
    );
    a.release();
    // After release, second caller succeeds
    const b = acquireSwapLock({ accountsRoot: root, by: "second" });
    assert.equal(b.held, true);
    b.release();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("acquireSwapLock — stale lock auto-evicted past TTL", () => {
  const root = makeRoot();
  try {
    // Pre-plant a stale lock (3h old)
    mkdirSync(root, { recursive: true });
    const lockPath = join(root, SWAP_LOCK_FILE);
    writeFileSync(lockPath, '{"ts":"2026-01-01T00:00:00Z","pid":999999,"by":"crashed"}\n', "utf8");
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    utimesSync(lockPath, new Date(threeHoursAgo), new Date(threeHoursAgo));

    // ttlMs=1h → should steal
    const lock = acquireSwapLock({ accountsRoot: root, by: "successor", ttlMs: 60 * 60 * 1000 });
    assert.equal(lock.held, true);
    lock.release();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("acquireSwapLock — fresh lock not stolen", () => {
  const root = makeRoot();
  try {
    const a = acquireSwapLock({ accountsRoot: root, by: "first" });
    assert.throws(
      () => acquireSwapLock({ accountsRoot: root, by: "second", ttlMs: 10 * 60 * 1000 }),
      /swap lock held/,
    );
    a.release();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------
// sha256 — P1-2 explicit dedicated test
// ------------------------------------------------------------------

test("captureCredentials sha256 matches both source and snapshot bytes", () => {
  const root = makeRoot();
  try {
    const fakeHome = join(root, "home");
    const src = writeFakeCred(join(fakeHome, ".claude", ".credentials.json"), {
      access_token: "atok",
      refresh_token: "rtok",
      expires_at: "2026-12-31T00:00:00Z",
    });
    const result = captureCredentials({
      accountName: "account-7",
      label: "hash-test",
      rotationPosition: 7,
      accountsRoot: root,
      home: fakeHome,
    });
    const expected = createHash("sha256").update(readFileSync(src)).digest("hex");
    assert.equal(result.sha256, expected);
    assert.equal(
      createHash("sha256").update(readFileSync(result.credentialFile)).digest("hex"),
      expected,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
