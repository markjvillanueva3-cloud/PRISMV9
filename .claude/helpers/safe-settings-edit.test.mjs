// Real behavioral tests for safe-settings-edit.mjs. The load-bearing
// property is LOST-UPDATE PREVENTION under concurrency (the settings-drift
// root cause) — that gets a real assertion, not a smoke test.
// node:test (helpers/ vitest config has a known transform bug — project
// convention is node:test for helpers).
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeSettingsEdit } from "./safe-settings-edit.mjs";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function sandbox() {
  const d = mkdtempSync(join(tmpdir(), "sse-test-"));
  const a = join(d, "c.json"), b = join(d, "h.json");
  const init = JSON.stringify({ hooks: { Stop: [{ keep: true }], PreToolUse: [] } }, null, 2) + "\n";
  writeFileSync(a, init); writeFileSync(b, init);
  return { d, files: [a, b], init };
}

test("applies a mutation and mirrors C+H byte-identically", () => {
  const { d, files } = sandbox();
  try {
    const r = safeSettingsEdit(o => o.hooks.Stop.push({ added: "x" }), { files });
    assert.equal(r.ok, true);
    assert.equal(r.changed, true);
    assert.equal(r.mirrorsIdentical, true);
    const c = JSON.parse(readFileSync(files[0], "utf8"));
    const h = JSON.parse(readFileSync(files[1], "utf8"));
    assert.equal(c.hooks.Stop.length, 2);
    assert.deepEqual(c, h, "C and H must be identical after edit");
    assert.equal(c.hooks.Stop[0].keep, true, "pre-existing entries preserved");
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("no-op mutation → changed:false, file untouched (idempotent)", () => {
  const { d, files, init } = sandbox();
  try {
    const r = safeSettingsEdit(() => { /* touch nothing */ }, { files });
    assert.equal(r.ok, true);
    assert.equal(r.changed, false);
    assert.equal(readFileSync(files[0], "utf8"), init, "byte-identical to original");
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("LOST-UPDATE PREVENTION: a held lock blocks a 2nd edit (no silent clobber)", () => {
  const { d, files } = sandbox();
  try {
    // Inject an acquireFn whose lock is already held by a *live* peer.
    const heldAcquire = () => ({ ok: false, heldBy: { pid: 99999, ageMs: 10 } });
    const r = safeSettingsEdit(o => o.hooks.Stop.push({ should: "not apply" }), {
      files, acquireFn: heldAcquire,
    });
    assert.equal(r.ok, false);
    assert.equal(r.error, "locked");
    assert.equal(r.heldBy.pid, 99999);
    // Critical: the file MUST be unchanged — the edit was refused, not lost.
    assert.equal(JSON.parse(readFileSync(files[0], "utf8")).hooks.Stop.length, 1);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("mutator throw → no write, lock released, error surfaced loud", () => {
  const { d, files, init } = sandbox();
  let released = false;
  try {
    const r = safeSettingsEdit(() => { throw new Error("boom"); }, {
      files,
      acquireFn: () => ({ ok: true, release: () => { released = true; } }),
    });
    assert.equal(r.ok, false);
    assert.equal(r.error, "mutator-threw");
    assert.match(r.detail, /boom/);
    assert.equal(readFileSync(files[0], "utf8"), init, "file unchanged on mutator throw");
    assert.equal(released, true, "lock MUST be released even when mutator throws");
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("unparseable settings → abort, never cement corruption", () => {
  const { d, files } = sandbox();
  try {
    writeFileSync(files[0], "{ this is not json ");
    const r = safeSettingsEdit(o => o.hooks.Stop.push({ x: 1 }), { files });
    assert.equal(r.ok, false);
    assert.equal(r.error, "unparseable");
    assert.equal(readFileSync(files[0], "utf8"), "{ this is not json ",
      "corrupt file left exactly as-is — no partial write layered on top");
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("lock released after success (next edit can proceed)", () => {
  const { d, files } = sandbox();
  try {
    const r1 = safeSettingsEdit(o => o.hooks.Stop.push({ a: 1 }), { files });
    const r2 = safeSettingsEdit(o => o.hooks.Stop.push({ b: 2 }), { files });
    assert.equal(r1.ok, true); assert.equal(r2.ok, true);
    assert.equal(JSON.parse(readFileSync(files[0], "utf8")).hooks.Stop.length, 3,
      "both sequential edits applied — lock did not deadlock itself");
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("round-trip: a hook entry added via mutator is present in BOTH mirrors on re-read", () => {
  const { d, files } = sandbox();
  try {
    safeSettingsEdit(o => o.hooks.PreToolUse.push({
      matcher: "Edit", hooks: [{ type: "command", command: "x.mjs", timeout: 1000 }],
    }), { files });
    for (const f of files) {
      const j = JSON.parse(readFileSync(f, "utf8"));
      assert.equal(j.hooks.PreToolUse.length, 1);
      assert.equal(j.hooks.PreToolUse[0].hooks[0].command, "x.mjs");
    }
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("bad args (mutate not a function) → ok:false, no throw", () => {
  const { d, files } = sandbox();
  try {
    const r = safeSettingsEdit(null, { files });
    assert.equal(r.ok, false);
    assert.equal(r.error, "bad-args");
  } finally { rmSync(d, { recursive: true, force: true }); }
});
