// scripts/hzp-dash-control-server.test.mjs — hermetic test for the U-HERMES-ASSIGN-FAILLOUD guard.
//
// Proves the readiness-audit fix: handleAssign must FAIL LOUD (501) instead of silently writing a
// schema-incompatible per-slot key into the canonical claim store (which readStore ignores → the
// assignment was lost while the handler returned ok:true — a lying success + corruption risk).
//
// Hermetic: PRISM_HZP_DASH_STATE_DIR is set to a tmp sandbox BEFORE the (dynamic) import, so the
// module's STATE_DIR/PATHS resolve into the sandbox and the listen-only-as-main guard prevents :8767.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SANDBOX = mkdtempSync(join(tmpdir(), "hzp-ctl-"));
process.env.PRISM_HZP_DASH_STATE_DIR = SANDBOX;
// Dynamic import AFTER the env is set (STATE_DIR/PATHS are computed at module load) + the main-guard
// means importing does NOT bind the port.
const mod = await import("./hzp-dash-control-server.mjs");

const CANONICAL = { schemaVersion: 1, lastSweepAt: "2026-05-17T00:00:00Z", claims: {} };

function mkRes() {
  return {
    _status: 0, _body: "",
    writeHead(s) { this._status = s; return this; },
    end(b) { this._body = b; return this; },
    setHeader() {},
  };
}
function seedStore() {
  writeFileSync(join(SANDBOX, "slot-task-claims.json"), JSON.stringify(CANONICAL, null, 2));
}
function seedSoul(frontmatter) {
  mkdirSync(join(SANDBOX, "slot-souls"), { recursive: true });
  writeFileSync(join(SANDBOX, "slot-souls", "bravo.md"), `---\n${frontmatter}\n---\ntest soul\n`);
}

test("handleAssign: AUTHORIZED assign FAILS LOUD (501) + does NOT corrupt the canonical claim store", async () => {
  seedStore();
  seedSoul("domain_filter: probe"); // task_text 'probe ...' matches → checkAuthority authorizes → reaches the guard
  const res = mkRes();
  await mod.handleAssign({ headers: {} }, res, { slot: "bravo", task_text: "probe this unit", actor: "operator" });

  assert.equal(res._status, 501, "must fail loud (was a silent ok:true on the old corrupting write)");
  const body = JSON.parse(res._body);
  assert.equal(body.ok, false);
  assert.equal(body.error, "assign-not-wired-to-canonical-claim-store");
  // ANTI-CORRUPTION (the load-bearing property): the canonical store is byte-identical — NO orphaned
  // per-slot 'bravo' sibling key was written. This FAILS on the old code (which wrote claims.bravo=[...] + returned 200).
  const after = JSON.parse(readFileSync(join(SANDBOX, "slot-task-claims.json"), "utf8"));
  assert.deepEqual(after, CANONICAL, "claim store MUST be unchanged");
  assert.equal(after.bravo, undefined, "no orphaned per-slot sibling key");
});

test("handleAssign: UNAUTHORIZED assign (no soul) rejects early (200 ok:false) BEFORE the guard; store untouched", async () => {
  seedStore();
  rmSync(join(SANDBOX, "slot-souls", "bravo.md"), { force: true }); // no soul → assign (non-informational) is unauthorized
  const res = mkRes();
  await mod.handleAssign({ headers: {} }, res, { slot: "bravo", task_text: "probe this", actor: "operator" });

  assert.equal(res._status, 200);
  const body = JSON.parse(res._body);
  assert.equal(body.ok, false);
  assert.match(body.reason, /no-soul-resolved/);
  assert.deepEqual(JSON.parse(readFileSync(join(SANDBOX, "slot-task-claims.json"), "utf8")), CANONICAL);
});

test("handleAssign: missing slot/task_text → 400 (input guard intact)", async () => {
  const res = mkRes();
  await mod.handleAssign({ headers: {} }, res, { slot: "bravo" }); // no task_text
  assert.equal(res._status, 400);
  assert.equal(JSON.parse(res._body).ok, false);
});

test("teardown: remove sandbox", () => {
  rmSync(SANDBOX, { recursive: true, force: true });
});
