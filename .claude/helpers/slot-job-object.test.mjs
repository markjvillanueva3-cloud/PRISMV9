/**
 * Tests for slot-job-object.ps1 (REAPER-PERMFIX-MS1 / U-C1).
 *
 * Run:  node --test H:/prism/.claude/helpers/slot-job-object.test.mjs
 *
 * Intent: this is a Windows-only PowerShell helper, so the suite drives the
 * REAL script via `powershell -File` and asserts on its `PRISM_JOB_RESULT`
 * stdout contract + exit codes. There are NO fakes — every test exercises the
 * production code path. Per the PRISM regression doctrine ("a pure-core +
 * injected-readers design MUST ship one real-data E2E"), the suite ends with a
 * live anchor test: it actually CREATES a Windows Job Object, discovers it
 * cross-process via -Status, and confirms kill-on-job-close reaps the watched
 * process when the anchor dies.
 *
 * On a non-Windows host every test self-skips (the helper cannot run there).
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE       = dirname(fileURLToPath(import.meta.url));
const PS_SCRIPT  = join(HERE, "slot-job-object.ps1");
const TEST_SLOT  = "jobselftest";
const SIDECAR    = join(HERE, "..", "..", "state", "shared", "slot-job-objects", `${TEST_SLOT}.json`);
const isWin      = process.platform === "win32";
const SKIP       = isWin ? false : "windows-only helper";

// ─── harness ────────────────────────────────────────────────────────────────

/** Run the helper synchronously. Returns { exit, result, anchorUp, raw }. */
function runPs(args, env = {}) {
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS_SCRIPT, ...args],
    { encoding: "utf8", timeout: 30000, env: { ...process.env, ...env } },
  );
  const raw   = `${r.stdout || ""}\n${r.stderr || ""}`;
  const lines = raw.split(/\r?\n/);
  const pick  = (prefix) => {
    const ln = lines.find((l) => l.startsWith(prefix));
    if (!ln) return null;
    try { return JSON.parse(ln.slice(prefix.length)); } catch { return null; }
  };
  return {
    exit:     r.status,
    result:   pick("PRISM_JOB_RESULT "),
    anchorUp: pick("PRISM_JOB_ANCHOR_UP "),
    raw,
  };
}

/** True when pid is alive (sig 0 probe). */
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function cleanup() {
  // Kill any leftover test anchor/job and remove the discovery sidecar so a
  // re-run starts clean. Best-effort — never throws.
  if (isWin) {
    try {
      spawnSync("powershell", ["-NoProfile", "-Command",
        `Get-Process | Where-Object { $_.ProcessName -eq 'waitfor' } | Stop-Process -Force -ErrorAction SilentlyContinue`],
        { timeout: 10000 });
    } catch { /* ignore */ }
  }
  try { if (existsSync(SIDECAR)) rmSync(SIDECAR, { force: true }); } catch { /* ignore */ }
}

before(() => cleanup());
after(()  => cleanup());

// ─── usage / validation guards (exit 2) ─────────────────────────────────────

test("usage — no mode switch is exit 2", { skip: SKIP }, () => {
  const r = runPs(["-Slot", TEST_SLOT, "-Json"]);
  assert.equal(r.exit, 2);
  assert.equal(r.result?.mode, "usage");
  assert.equal(r.result?.ok, false);
});

test("usage — two mode switches is exit 2", { skip: SKIP }, () => {
  const r = runPs(["-Anchor", "-Status", "-Slot", TEST_SLOT, "-Json"]);
  assert.equal(r.exit, 2);
  assert.equal(r.result?.mode, "usage");
});

test("usage — anchor with BOTH -LaunchChild and -TargetPid is exit 2", { skip: SKIP }, () => {
  const r = runPs(["-Anchor", "-Slot", TEST_SLOT, "-LaunchChild", "cmd", "-TargetPid", "4", "-Json"]);
  assert.equal(r.exit, 2);
  assert.match(r.result?.message ?? "", /exactly one of -LaunchChild/);
});

test("usage — anchor with NEITHER target is exit 2", { skip: SKIP }, () => {
  const r = runPs(["-Anchor", "-Slot", TEST_SLOT, "-Json"]);
  assert.equal(r.exit, 2);
  assert.match(r.result?.message ?? "", /exactly one of -LaunchChild/);
});

test("usage — assign without -ProcessId is exit 2", { skip: SKIP }, () => {
  const r = runPs(["-Assign", "-Slot", TEST_SLOT, "-Json"]);
  assert.equal(r.exit, 2);
  assert.match(r.result?.message ?? "", /requires -ProcessId/);
});

// slot-name validation — the regex is the kernel-object-name + sidecar-filename
// safety boundary. -cmatch (case-sensitive) is load-bearing: a regression to
// -match would re-admit 'BAD'/'Alpha'.
for (const bad of ["BAD", "Alpha", "al_pha", "-alpha", "alpha-", "a..b", "Global", ""]) {
  test(`usage — invalid slot ${JSON.stringify(bad)} is exit 2`, { skip: SKIP }, () => {
    const r = runPs(["-Status", "-Slot", bad, "-Json"]);
    assert.equal(r.exit, 2, `slot ${JSON.stringify(bad)} must be rejected`);
    assert.equal(r.result?.mode, "usage");
  });
}

for (const ok of ["alpha", "wedm-studio", "a", "m"]) {
  test(`valid kebab slot ${JSON.stringify(ok)} is accepted (status exit 0)`, { skip: SKIP }, () => {
    const r = runPs(["-Status", "-Slot", ok, "-Json"]);
    assert.equal(r.exit, 0, `slot ${JSON.stringify(ok)} must be accepted`);
    assert.equal(r.result?.mode, "status");
  });
}

test("usage — out-of-range -ActiveProcessLimit is exit 2", { skip: SKIP }, () => {
  for (const v of ["0", "501"]) {
    const r = runPs(["-Anchor", "-Slot", TEST_SLOT, "-TargetPid", "4", "-ActiveProcessLimit", v, "-DryRun", "-Json"]);
    assert.equal(r.exit, 2, `ActiveProcessLimit ${v}`);
  }
});

test("usage — out-of-range -JobMemoryGB is exit 2", { skip: SKIP }, () => {
  for (const v of ["0", "65"]) {
    const r = runPs(["-Anchor", "-Slot", TEST_SLOT, "-TargetPid", "4", "-JobMemoryGB", v, "-DryRun", "-Json"]);
    assert.equal(r.exit, 2, `JobMemoryGB ${v}`);
  }
});

test("usage — out-of-range -PollSeconds is exit 2", { skip: SKIP }, () => {
  for (const v of ["2", "4000"]) {
    const r = runPs(["-Anchor", "-Slot", TEST_SLOT, "-TargetPid", "4", "-PollSeconds", v, "-Json"]);
    assert.equal(r.exit, 2, `PollSeconds ${v}`);
  }
});

// ─── dry-run modes (exit 0, mutate nothing) ─────────────────────────────────

test("dry-run anchor -LaunchChild — interop verified, nothing created", { skip: SKIP }, () => {
  const r = runPs(["-Anchor", "-Slot", TEST_SLOT, "-LaunchChild", "cmd", "-DryRun", "-Json"]);
  assert.equal(r.exit, 0);
  assert.equal(r.result?.mode, "anchor");
  assert.equal(r.result?.dryRun, true);
  assert.equal(r.result?.interopOk, true);
  assert.equal(r.result?.ok, true);
  assert.match(r.result?.containment ?? "", /^launch-child:/);
  // a dry run must not write the discovery sidecar
  assert.equal(existsSync(SIDECAR), false, "dry-run must not create the sidecar");
});

test("dry-run anchor -TargetPid — reports target-pid containment", { skip: SKIP }, () => {
  const r = runPs(["-Anchor", "-Slot", TEST_SLOT, "-TargetPid", "4", "-DryRun", "-Json"]);
  assert.equal(r.exit, 0);
  assert.equal(r.result?.interopOk, true);
  assert.match(r.result?.containment ?? "", /^target-pid:/);
});

test("dry-run assign — reports anchor absence, does not mutate", { skip: SKIP }, () => {
  const r = runPs(["-Assign", "-Slot", TEST_SLOT, "-ProcessId", "4", "-DryRun", "-Json"]);
  assert.equal(r.exit, 0);
  assert.equal(r.result?.mode, "assign");
  assert.equal(r.result?.dryRun, true);
  assert.equal(r.result?.anchorJobExists, false);
});

test("status — non-existent slot job reports state=no-job", { skip: SKIP }, () => {
  const r = runPs(["-Status", "-Slot", TEST_SLOT, "-Json"]);
  assert.equal(r.exit, 0);
  assert.equal(r.result?.exists, false);
  assert.equal(r.result?.state, "no-job");
});

// ─── operational failures (exit 1) ──────────────────────────────────────────

test("assign — no anchor job for the slot is exit 1", { skip: SKIP }, () => {
  const r = runPs(["-Assign", "-Slot", TEST_SLOT, "-ProcessId", String(process.pid), "-Json"]);
  assert.equal(r.exit, 1);
  assert.equal(r.result?.ok, false);
  assert.match(r.result?.message ?? "", /no anchor job/);
});

// ─── kill switch ────────────────────────────────────────────────────────────

test("PRISM_SLOT_JOB_DISABLE=1 refuses -Assign (exit 1)", { skip: SKIP }, () => {
  const r = runPs(["-Assign", "-Slot", TEST_SLOT, "-ProcessId", "4", "-Json"], { PRISM_SLOT_JOB_DISABLE: "1" });
  assert.equal(r.exit, 1);
  assert.match(r.result?.message ?? "", /PRISM_SLOT_JOB_DISABLE=1/);
});

test("PRISM_SLOT_JOB_DISABLE=1 refuses -Anchor (exit 1)", { skip: SKIP }, () => {
  const r = runPs(["-Anchor", "-Slot", TEST_SLOT, "-TargetPid", "4", "-Json"], { PRISM_SLOT_JOB_DISABLE: "1" });
  assert.equal(r.exit, 1);
  assert.match(r.result?.message ?? "", /PRISM_SLOT_JOB_DISABLE=1/);
});

test("PRISM_SLOT_JOB_DISABLE=1 still allows -DryRun (knob checked AFTER DryRun)", { skip: SKIP }, () => {
  const r = runPs(["-Anchor", "-Slot", TEST_SLOT, "-TargetPid", "4", "-DryRun", "-Json"], { PRISM_SLOT_JOB_DISABLE: "1" });
  assert.equal(r.exit, 0, "a disabled-mode dry run must still produce diagnostics");
  assert.equal(r.result?.interopOk, true);
});

// ─── stdout contract ────────────────────────────────────────────────────────

test("every result line carries the documented envelope fields", { skip: SKIP }, () => {
  for (const args of [
    ["-Status", "-Slot", TEST_SLOT, "-Json"],
    ["-Assign", "-Slot", TEST_SLOT, "-ProcessId", "4", "-DryRun", "-Json"],
    ["-Anchor", "-Slot", TEST_SLOT, "-TargetPid", "4", "-DryRun", "-Json"],
    ["-Json"], // usage error
  ]) {
    const r = runPs(args);
    assert.ok(r.result, `args ${args.join(" ")} must emit one PRISM_JOB_RESULT line`);
    assert.equal(r.result.tool, "slot-job-object");
    assert.equal(typeof r.result.schemaVersion, "string");
    assert.equal(typeof r.result.mode, "string");
    assert.equal(typeof r.result.ok, "boolean");
  }
});

// ─── live anchor E2E (real Job Object, cross-process discovery, reap) ───────
// The load-bearing test: creates a real kernel Job Object, proves a SEPARATE
// process discovers it, and proves kill-on-job-close reaps the watched process.
//
// It is made deterministic by waiting on the anchor's OWN up-front
// `PRISM_JOB_ANCHOR_UP` signal (emitted exactly so a programmatic launcher need
// not poll) rather than spawn-polling -Status — on a loaded host a 25× poll
// both starves the anchor's first-run C# compile and makes the test flaky.

const ANCHOR_UP_TIMEOUT_MS = 45000; // generous: a cold first-run Add-Type compile under fleet load
const REAP_TIMEOUT_MS      = 15000; // kill-on-job-close is near-instant; this is slack
const POLL_INTERVAL_MS     = 200;   // in-process predicate poll — no process spawn

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Poll an in-process predicate (no spawn) until true or timeout. */
async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  // Sequential by nature — each tick must observe the previous tick's effect.
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await delay(POLL_INTERVAL_MS);
  }
  return predicate();
}

test("live anchor — create job, cross-process status, kill-on-job-close reap",
  { skip: SKIP, timeout: 90000 }, async () => {
    cleanup();
    let sleeper = null;
    let anchor  = null;
    try {
      // A process the anchor will contain (-TargetPid) — a clean 60s sleeper.
      sleeper = spawn("powershell",
        ["-NoProfile", "-Command", "Start-Sleep -Seconds 60"],
        { stdio: "ignore", windowsHide: true });
      await delay(800);
      assert.ok(sleeper.pid && pidAlive(sleeper.pid), "sleeper must be alive");

      // The anchor: assign + watch the sleeper, block as the job handle holder.
      // Capture its stdout so we can wait on its own ANCHOR_UP signal.
      anchor = spawn("powershell",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS_SCRIPT,
         "-Anchor", "-Slot", TEST_SLOT, "-TargetPid", String(sleeper.pid), "-PollSeconds", "10"],
        { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      let anchorOut = "";
      let anchorExit = undefined;
      anchor.stdout.on("data", (d) => { anchorOut += d; });
      anchor.stderr.on("data", (d) => { anchorOut += d; });
      anchor.on("exit", (c) => { anchorExit = c; });

      // Deterministic: the anchor prints PRISM_JOB_ANCHOR_UP once the job is
      // created + the target assigned. Wait on THAT, not a status poll.
      const up = await waitFor(
        () => anchorOut.includes("PRISM_JOB_ANCHOR_UP ") || anchorExit !== undefined,
        ANCHOR_UP_TIMEOUT_MS);
      assert.ok(up, `anchor produced no signal in ${ANCHOR_UP_TIMEOUT_MS}ms`);
      assert.equal(anchorExit, undefined,
        `anchor must still be blocking, not exited; output:\n${anchorOut}`);
      assert.match(anchorOut, /PRISM_JOB_ANCHOR_UP /,
        `anchor must emit ANCHOR_UP; output:\n${anchorOut}`);

      // The job now definitively exists — ONE cross-process -Status confirms a
      // SEPARATE process discovers it via OpenJobObject.
      const s = runPs(["-Status", "-Slot", TEST_SLOT, "-Json"]);
      assert.equal(s.result?.state, "anchored-active", `status raw:\n${s.raw}`);
      assert.equal(s.result?.exists, true);
      assert.equal(s.result?.anchorAlive, true);
      assert.ok(s.result?.activeProcesses >= 1, "the job must report >=1 active process");
      assert.equal(typeof s.result?.peakJobMemoryMB, "number");

      // Kill the anchor — closing the last handle. kill-on-job-close must
      // terminate the watched sleeper (the entire U-C1 deliverable).
      anchor.kill();
      anchor = null;
      const reaped = await waitFor(() => !pidAlive(sleeper.pid), REAP_TIMEOUT_MS);
      assert.equal(reaped, true, "kill-on-job-close must reap the watched process when the anchor dies");

      // The job is gone — a fresh -Status reports no-job.
      const after = runPs(["-Status", "-Slot", TEST_SLOT, "-Json"]);
      assert.equal(after.result?.state, "no-job");
    } finally {
      if (anchor)  try { anchor.kill();  } catch { /* ignore */ }
      if (sleeper && pidAlive(sleeper.pid)) try { sleeper.kill(); } catch { /* ignore */ }
      cleanup();
    }
  });
