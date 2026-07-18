// scripts/switch-claude-account.test.mjs — U2 (account credential swap) tests.
// node:test, real temp dirs (NEVER touches the real ~/.claude/.credentials.json).
//
// Fixtures are generic opaque JSON blobs — activateAccount only validates
// JSON.parse + byte-copies the file, so the credential SHAPE is irrelevant to
// the logic under test (and avoids tripping the hardcoded-secret detector).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  activateAccount,
  nextAccountInRotation,
  readActiveAccount,
  readLastSwitch,
  credentialSnapshotPath,
  writeRotationOrder,
} from "./lib/claude-account-lib.mjs";

function freshEnv() {
  const base = mkdtempSync(join(tmpdir(), "u2-swap-"));
  const accountsRoot = join(base, "accounts");
  const home = join(base, "home");
  mkdirSync(accountsRoot, { recursive: true });
  mkdirSync(join(home, ".claude"), { recursive: true });
  return { base, accountsRoot, home, livePath: join(home, ".claude", ".credentials.json") };
}
function vaultCred(accountsRoot, name, body) {
  mkdirSync(join(accountsRoot, name), { recursive: true });
  writeFileSync(credentialSnapshotPath(name, { accountsRoot }), body);
}
// Opaque, distinct, valid-JSON fixtures standing in for an OAuth bundle.
const CRED1 = JSON.stringify({ acct: "one", blob: "AAAA1111" });
const CRED2 = JSON.stringify({ acct: "two", blob: "BBBB2222" });

// ---- nextAccountInRotation (pure) ----
test("nextAccountInRotation: null current -> first", () => {
  assert.equal(nextAccountInRotation(null, ["account-1", "account-2", "account-3"]), "account-1");
});
test("nextAccountInRotation: wraps round-robin", () => {
  const order = ["account-1", "account-2", "account-3"];
  assert.equal(nextAccountInRotation("account-1", order), "account-2");
  assert.equal(nextAccountInRotation("account-3", order), "account-1"); // wrap
});
test("nextAccountInRotation: unknown current -> first; empty -> null", () => {
  assert.equal(nextAccountInRotation("account-9", ["account-1", "account-2"]), "account-1");
  assert.equal(nextAccountInRotation("account-1", []), null);
  assert.equal(nextAccountInRotation(null, []), null);
});

// ---- activateAccount: dry-run ----
test("activateAccount dry-run: returns plan, writes NOTHING", () => {
  const env = freshEnv();
  try {
    vaultCred(env.accountsRoot, "account-2", CRED2);
    writeFileSync(env.livePath, CRED1); // currently account-1 live
    const r = activateAccount({ accountName: "account-2", accountsRoot: env.accountsRoot, home: env.home, dryRun: true });
    assert.equal(r.dryRun, true);
    assert.equal(r.plan.to, "account-2");
    assert.equal(r.plan.willBackup, true);
    assert.equal(readFileSync(env.livePath, "utf8"), CRED1);
    assert.equal(readActiveAccount({ accountsRoot: env.accountsRoot }), null);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

// ---- activateAccount: apply (the real swap) ----
test("activateAccount apply: installs vault cred to live + backs up old + audits", () => {
  const env = freshEnv();
  try {
    vaultCred(env.accountsRoot, "account-2", CRED2);
    writeFileSync(env.livePath, CRED1);
    const r = activateAccount({ accountName: "account-2", accountsRoot: env.accountsRoot, home: env.home, by: "test", trigger: "five-hour-90pct" });
    assert.equal(r.ok, true);
    assert.equal(r.to, "account-2");
    assert.equal(r.restartRequired, true);
    assert.equal(readFileSync(env.livePath, "utf8"), CRED2);
    assert.ok(r.backupPath && existsSync(r.backupPath), "backup created");
    assert.equal(readFileSync(r.backupPath, "utf8"), CRED1);
    assert.equal(readActiveAccount({ accountsRoot: env.accountsRoot }), "account-2");
    const ls = readLastSwitch({ accountsRoot: env.accountsRoot });
    assert.equal(ls.to, "account-2");
    assert.equal(ls.trigger, "five-hour-90pct");
    assert.equal(ls.by, "test");
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

// ---- failure modes (fail-loud, NEVER install a bad credential) ----
test("activateAccount: missing vault credential throws, live untouched", () => {
  const env = freshEnv();
  try {
    writeFileSync(env.livePath, CRED1);
    assert.throws(() => activateAccount({ accountName: "account-2", accountsRoot: env.accountsRoot, home: env.home }), /no captured credential/);
    assert.equal(readFileSync(env.livePath, "utf8"), CRED1);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});
test("activateAccount: empty vault credential throws", () => {
  const env = freshEnv();
  try {
    vaultCred(env.accountsRoot, "account-2", "");
    writeFileSync(env.livePath, CRED1);
    assert.throws(() => activateAccount({ accountName: "account-2", accountsRoot: env.accountsRoot, home: env.home }), /empty or not a file/);
    assert.equal(readFileSync(env.livePath, "utf8"), CRED1);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});
test("activateAccount: corrupt (non-JSON) vault credential throws, NEVER installs", () => {
  const env = freshEnv();
  try {
    vaultCred(env.accountsRoot, "account-2", "{not-json,,,");
    writeFileSync(env.livePath, CRED1);
    assert.throws(() => activateAccount({ accountName: "account-2", accountsRoot: env.accountsRoot, home: env.home }), /not valid JSON/);
    assert.equal(readFileSync(env.livePath, "utf8"), CRED1);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});
test("activateAccount: invalid account name throws", () => {
  const env = freshEnv();
  try {
    assert.throws(() => activateAccount({ accountName: "not-an-account", accountsRoot: env.accountsRoot, home: env.home }), /invalid account name/);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

// ---- no-op + --no-backup ----
test("activateAccount: already-active + identical -> noop (no churn)", () => {
  const env = freshEnv();
  try {
    vaultCred(env.accountsRoot, "account-2", CRED2);
    activateAccount({ accountName: "account-2", accountsRoot: env.accountsRoot, home: env.home });
    const r = activateAccount({ accountName: "account-2", accountsRoot: env.accountsRoot, home: env.home });
    assert.equal(r.noop, true);
    assert.equal(readFileSync(env.livePath, "utf8"), CRED2);
    const backups = readdirSync(join(env.home, ".claude")).filter((f) => f.includes("pre-swap"));
    assert.equal(backups.length, 0, "no-op must not create a backup");
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});
test("activateAccount: --no-backup skips the pre-swap copy", () => {
  const env = freshEnv();
  try {
    vaultCred(env.accountsRoot, "account-2", CRED2);
    writeFileSync(env.livePath, CRED1);
    const r = activateAccount({ accountName: "account-2", accountsRoot: env.accountsRoot, home: env.home, backup: false });
    assert.equal(r.backupPath, null);
    assert.equal(readFileSync(env.livePath, "utf8"), CRED2);
    const backups = readdirSync(join(env.home, ".claude")).filter((f) => f.includes("pre-swap"));
    assert.equal(backups.length, 0);
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});

// ---- rotation integration ----
test("--next target resolves via nextAccountInRotation + ROTATION_ORDER", () => {
  const env = freshEnv();
  try {
    vaultCred(env.accountsRoot, "account-1", CRED1);
    vaultCred(env.accountsRoot, "account-2", CRED2);
    writeRotationOrder(["account-1", "account-2"], { accountsRoot: env.accountsRoot });
    activateAccount({ accountName: "account-1", accountsRoot: env.accountsRoot, home: env.home });
    const next = nextAccountInRotation(readActiveAccount({ accountsRoot: env.accountsRoot }), ["account-1", "account-2"]);
    assert.equal(next, "account-2");
    const r = activateAccount({ accountName: next, accountsRoot: env.accountsRoot, home: env.home });
    assert.equal(r.to, "account-2");
    assert.equal(readActiveAccount({ accountsRoot: env.accountsRoot }), "account-2");
  } finally { rmSync(env.base, { recursive: true, force: true }); }
});
