/**
 * psk.test.mjs — COMMAND-KERNEL-MS0 syscall-kernel tests.
 *
 * U-CK09 follow-up: covers the `handoff` syscall input-hardening added after
 * the per-file scrutiny gate caught a P0 — a wrong flag name (`--mode` instead
 * of `--subcommand`) silently no-op'd a handoff write because `sub` defaulted
 * to "read". These tests pin both the `--mode` alias and the write-payload
 * fail-loud guard, plus the table-derived syscall surface.
 *
 * Run: node --test .claude/kernel/psk.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { dispatch, listSyscalls, describeSyscalls } from "./psk.mjs";

// --------------------------------------------------------------------------
// Syscall surface — table-derived, not hardcoded.
// --------------------------------------------------------------------------
test("listSyscalls exposes the declared surface", () => {
  const syscalls = listSyscalls();
  assert.ok(Array.isArray(syscalls), "listSyscalls returns an array");
  // Every lifecycle-command-facing syscall U-CK09 depends on must exist.
  for (const required of ["whoami", "position", "pick", "checkin", "handoff"]) {
    assert.ok(syscalls.includes(required), `syscall '${required}' is declared`);
  }
  // describeSyscalls keys must match listSyscalls exactly (single source).
  assert.deepEqual(
    Object.keys(describeSyscalls()).sort(),
    [...syscalls].sort(),
    "describeSyscalls keys === listSyscalls",
  );
});

test("dispatch rejects an unknown syscall with errorCode", async () => {
  const r = await dispatch("not_a_syscall", {});
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "UNKNOWN_SYSCALL");
});

test("dispatch rejects a non-string syscall", async () => {
  const r = await dispatch(null, {});
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "UNKNOWN_SYSCALL");
});

// --------------------------------------------------------------------------
// handoff — `--mode` alias for `--subcommand` (the U-CK09 P0 fix).
// An invalid value proves which param key was consulted WITHOUT spawning the
// per-agent-handoff helper: the unknown-subcommand reject fires pre-spawn.
// --------------------------------------------------------------------------
test("handoff reads --mode as an alias for --subcommand", async () => {
  const r = await dispatch("handoff", { mode: "not_a_mode" });
  assert.equal(r.ok, false, "invalid mode value is rejected");
  assert.match(
    r.error,
    /unknown subcommand 'not_a_mode'/,
    "the --mode value was consulted as the subcommand",
  );
});

test("handoff still rejects an invalid --subcommand value (regression)", async () => {
  const r = await dispatch("handoff", { subcommand: "not_a_sub" });
  assert.equal(r.ok, false);
  assert.match(r.error, /unknown subcommand 'not_a_sub'/);
});

test("handoff: canonical --subcommand wins over --mode when both are set", async () => {
  // subcommand=badX (invalid) + mode=read → if subcommand wins, the invalid
  // value is what gets rejected, proving precedence.
  const r = await dispatch("handoff", { subcommand: "badX", mode: "read" });
  assert.equal(r.ok, false);
  assert.match(r.error, /unknown subcommand 'badX'/, "subcommand took precedence");
});

// --------------------------------------------------------------------------
// handoff — write-payload-with-read fail-loud guard (R12).
// --------------------------------------------------------------------------
test("handoff rejects --resume passed with subcommand=read", async () => {
  const r = await dispatch("handoff", { subcommand: "read", resume: "do X next" });
  assert.equal(r.ok, false, "write payload in read mode is rejected, not no-op'd");
  assert.match(r.error, /write-only flag\(s\) \[resume\]/);
  assert.match(r.note, /did you mean --subcommand write/);
});

test("handoff rejects --state passed with subcommand=read", async () => {
  const r = await dispatch("handoff", { subcommand: "read", state: "session summary" });
  assert.equal(r.ok, false);
  assert.match(r.error, /write-only flag\(s\) \[state\]/);
});

test("handoff rejects --resume AND --state together with read", async () => {
  const r = await dispatch("handoff", { subcommand: "read", resume: "x", state: "y" });
  assert.equal(r.ok, false);
  assert.match(r.error, /write-only flag\(s\) \[resume, state\]/);
});

test("handoff: the bug also fires via the --mode alias", async () => {
  // The exact original P0 shape: caller meant write, typed `--mode write` —
  // BUT here we prove the read-mode guard catches the inverse confusion too:
  // `--mode read` + a resume payload is rejected, not silently dropped.
  const r = await dispatch("handoff", { mode: "read", resume: "do X" });
  assert.equal(r.ok, false);
  assert.match(r.error, /write-only flag\(s\) \[resume\]/);
});

test("handoff: --source alone with read does NOT trip the guard", async () => {
  // `source` is intentionally excluded — harmless in read mode. The guard
  // must not reject a defensively-always-passed --source. An empty-string
  // resume/state must also not trip it. This dispatch proceeds past the
  // guard to the helper spawn; we only assert the guard did NOT fire.
  const r = await dispatch("handoff", { subcommand: "read", source: "live-chat", resume: "", state: "" });
  if (r.ok === false && typeof r.error === "string") {
    assert.doesNotMatch(
      r.error,
      /write-only flag/,
      "the write-payload guard must not fire on --source / empty payload",
    );
  }
});
