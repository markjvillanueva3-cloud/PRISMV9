// fleet-reaper-tier3.test.mjs — node:test for Tier-3 NIM + task self-heal logic.
// Run: node --test H:/prism/scripts/__tests__/fleet-reaper-tier3.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseTaskQueryStatus,
  nimKeepaliveAction,
  taskSelfHealAction,
  probeNimDaemon,
  restartNimDaemon,
  runScheduledTaskNow,
  decideGlobalCompaction,
  executeGlobalCompaction,
} from "../fleet-reaper-sweep.mjs";

// ── parseTaskQueryStatus ──
test("parseTaskQueryStatus: Ready status returns 'ready'", () => {
  const stdout = `
Folder: \\
HostName:                             MARKV
TaskName:                             \\PRISM Fleet Reaper
Status:                               Ready
Logon Mode:                           Background only
`;
  assert.equal(parseTaskQueryStatus(stdout), "ready");
});
test("parseTaskQueryStatus: Running status returns 'running'", () => {
  assert.equal(parseTaskQueryStatus("Status:    Running"), "running");
});
test("parseTaskQueryStatus: Disabled returns 'disabled'", () => {
  assert.equal(parseTaskQueryStatus("\n\nStatus: Disabled\n"), "disabled");
});
test("parseTaskQueryStatus: missing status returns 'unknown'", () => {
  assert.equal(parseTaskQueryStatus("HostName: X\nTaskName: Y"), "unknown");
});
test("parseTaskQueryStatus: empty/null input returns 'unknown'", () => {
  assert.equal(parseTaskQueryStatus(""), "unknown");
  assert.equal(parseTaskQueryStatus(null), "unknown");
  assert.equal(parseTaskQueryStatus(undefined), "unknown");
});
test("parseTaskQueryStatus: case-insensitive status keyword", () => {
  assert.equal(parseTaskQueryStatus("status:   Ready"), "ready");
  assert.equal(parseTaskQueryStatus("STATUS:   Ready"), "ready");
});
test("parseTaskQueryStatus: trims whitespace + matches first Status line", () => {
  const stdout = `  Status:       Ready    \n  Some other line: with Status: substring`;
  assert.equal(parseTaskQueryStatus(stdout), "ready");
});

// ── nimKeepaliveAction (pure decision) ──
test("nimKeepaliveAction: NIM up → noop", () => {
  const r = nimKeepaliveAction({
    nimProbe: { up: true, httpStatus: 200 },
    lastRestartMs: 0, cooldownSec: 300, nowMs: 1000, disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "noop");
  assert.match(r.reason, /up/);
});
test("nimKeepaliveAction: disabled → noop", () => {
  const r = nimKeepaliveAction({
    nimProbe: { up: false }, lastRestartMs: 0, cooldownSec: 300, nowMs: 1000,
    disabled: true, actionsAllowed: true,
  });
  assert.equal(r.action, "noop");
  assert.match(r.reason, /disabled/);
});
test("nimKeepaliveAction: probe inconclusive (null up) → noop", () => {
  const r = nimKeepaliveAction({
    nimProbe: { up: null, error: "skipped" }, lastRestartMs: 0, cooldownSec: 300,
    nowMs: 1000, disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "noop");
});
test("nimKeepaliveAction: NIM down + cooldown active → noop with cooldown reason", () => {
  const nowMs = 10_000;
  const lastRestartMs = nowMs - 100_000; // 100s ago, cooldown is 300s
  const r = nimKeepaliveAction({
    nimProbe: { up: false, error: "ECONNREFUSED" }, lastRestartMs, cooldownSec: 300,
    nowMs, disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "noop");
  assert.match(r.reason, /cooldown-active/);
  assert.match(r.reason, /100s/);
});
test("nimKeepaliveAction: NIM down + cooldown expired → restart", () => {
  const nowMs = 1_000_000;
  const lastRestartMs = nowMs - 400_000; // 400s ago, cooldown is 300s
  const r = nimKeepaliveAction({
    nimProbe: { up: false, error: "ECONNREFUSED" }, lastRestartMs, cooldownSec: 300,
    nowMs, disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "restart");
  assert.match(r.reason, /nim-down/);
});
test("nimKeepaliveAction: NIM down + actionsNotAllowed (status/dry-run) → advise not restart", () => {
  const r = nimKeepaliveAction({
    nimProbe: { up: false }, lastRestartMs: 0, cooldownSec: 300, nowMs: 1000,
    disabled: false, actionsAllowed: false,
  });
  assert.equal(r.action, "advise");
  assert.match(r.reason, /would restart/);
});
test("nimKeepaliveAction: NIM never restarted (lastRestartMs=0) → restart immediately", () => {
  const r = nimKeepaliveAction({
    nimProbe: { up: false }, lastRestartMs: 0, cooldownSec: 300, nowMs: 1000,
    disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "restart");
});
test("nimKeepaliveAction: missing probe → noop", () => {
  const r = nimKeepaliveAction({
    nimProbe: null, lastRestartMs: 0, cooldownSec: 300, nowMs: 1000,
    disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "noop");
  assert.match(r.reason, /no-probe/);
});

// ── taskSelfHealAction (pure decision) ──
test("taskSelfHealAction: Ready → noop", () => {
  const r = taskSelfHealAction({ taskStatus: "ready", disabled: false, actionsAllowed: true });
  assert.equal(r.action, "noop");
  assert.match(r.reason, /task-healthy/);
});
test("taskSelfHealAction: Running → noop", () => {
  const r = taskSelfHealAction({ taskStatus: "running", disabled: false, actionsAllowed: true });
  assert.equal(r.action, "noop");
});
test("taskSelfHealAction: Queued → noop (not yet executed but armed)", () => {
  const r = taskSelfHealAction({ taskStatus: "queued", disabled: false, actionsAllowed: true });
  assert.equal(r.action, "noop");
});
test("taskSelfHealAction: Disabled → advise (operator-only re-enable)", () => {
  const r = taskSelfHealAction({ taskStatus: "disabled", disabled: false, actionsAllowed: true });
  assert.equal(r.action, "advise");
  assert.match(r.reason, /operator-only/);
});
test("taskSelfHealAction: unknown → advise (likely uninstalled)", () => {
  const r = taskSelfHealAction({ taskStatus: "unknown", disabled: false, actionsAllowed: true });
  assert.equal(r.action, "advise");
  assert.match(r.reason, /uninstalled/);
});
test("taskSelfHealAction: disabled knob → noop regardless of status", () => {
  const r = taskSelfHealAction({ taskStatus: "ready", disabled: true, actionsAllowed: true });
  assert.equal(r.action, "noop");
  assert.match(r.reason, /disabled-via-knob/);
});
test("taskSelfHealAction: actionsNotAllowed + unexpected status → advise not run", () => {
  const r = taskSelfHealAction({ taskStatus: "could-not-start", disabled: false, actionsAllowed: false });
  assert.equal(r.action, "advise");
});
test("taskSelfHealAction: empty/null status defaults to unknown branch", () => {
  const r = taskSelfHealAction({ taskStatus: "", disabled: false, actionsAllowed: true });
  assert.equal(r.action, "advise");
  assert.match(r.reason, /unknown/);
});

// ── probeNimDaemon (injected curl) ──
test("probeNimDaemon: HTTP 200 → up=true", () => {
  const fakeCurl = (cmd, args) => "200";
  const r = probeNimDaemon({ url: "http://localhost:8000", timeoutMs: 1000, curlImpl: fakeCurl });
  assert.equal(r.up, true);
  assert.equal(r.httpStatus, 200);
});
test("probeNimDaemon: HTTP 404 (server alive, endpoint missing) → up=true", () => {
  const fakeCurl = () => "404";
  const r = probeNimDaemon({ url: "http://localhost:8000", timeoutMs: 1000, curlImpl: fakeCurl });
  assert.equal(r.up, true);
});
test("probeNimDaemon: HTTP 000 (connection refused) → up=false", () => {
  const fakeCurl = () => "000";
  const r = probeNimDaemon({ url: "http://localhost:8000", timeoutMs: 1000, curlImpl: fakeCurl });
  assert.equal(r.up, false);
  assert.match(r.error, /connection-refused/);
});
test("probeNimDaemon: HTTP 500+ → up=false", () => {
  const fakeCurl = () => "503";
  const r = probeNimDaemon({ url: "http://localhost:8000", timeoutMs: 1000, curlImpl: fakeCurl });
  assert.equal(r.up, false);
  assert.equal(r.httpStatus, 503);
});
test("probeNimDaemon: curl throws → up=false with error", () => {
  const fakeCurl = () => { throw new Error("ENOENT: curl not found"); };
  const r = probeNimDaemon({ url: "http://localhost:8000", timeoutMs: 1000, curlImpl: fakeCurl });
  assert.equal(r.up, false);
  assert.match(r.error, /ENOENT/);
});
test("probeNimDaemon: no URL → up=null", () => {
  const r = probeNimDaemon({ url: "", curlImpl: () => "200" });
  assert.equal(r.up, null);
});

// ── restartNimDaemon ──
test("restartNimDaemon: missing start script → ok=false", () => {
  const r = restartNimDaemon({
    spawnImpl: () => ({ pid: 9999, unref: () => {} }),
    startScript: "C:/nonexistent/start.ps1",
    existsImpl: () => false,
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /not found/);
});
test("restartNimDaemon: spawn succeeds → ok=true with pid", () => {
  let captured = null;
  const fakeSpawn = (cmd, args, opts) => {
    captured = { cmd, args, opts };
    return { pid: 12345, unref: () => {} };
  };
  const r = restartNimDaemon({
    spawnImpl: fakeSpawn, startScript: "H:/Tools/nim/start.ps1",
    existsImpl: () => true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.pid, 12345);
  assert.equal(captured.cmd, "powershell");
  assert.deepEqual(captured.args, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "H:/Tools/nim/start.ps1"]);
  assert.equal(captured.opts.detached, true);
  assert.equal(captured.opts.windowsHide, true);
});
test("restartNimDaemon: spawn throws → ok=false", () => {
  const fakeSpawn = () => { throw new Error("spawn fail"); };
  const r = restartNimDaemon({
    spawnImpl: fakeSpawn, startScript: "H:/Tools/nim/start.ps1",
    existsImpl: () => true,
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /spawn fail/);
});

// ── runScheduledTaskNow ──
test("runScheduledTaskNow: spawn success → ok=true", () => {
  let captured = null;
  const fakeExec = (cmd, args, opts) => {
    captured = { cmd, args };
    return "SUCCESS: The scheduled task...";
  };
  const r = runScheduledTaskNow("PRISM Fleet Reaper", { spawnImpl: fakeExec });
  assert.equal(r.ok, true);
  assert.equal(captured.cmd, "schtasks");
  assert.deepEqual(captured.args, ["/Run", "/TN", "PRISM Fleet Reaper"]);
});
test("runScheduledTaskNow: spawn throws → ok=false", () => {
  const fakeExec = () => { throw new Error("schtasks not found"); };
  const r = runScheduledTaskNow("PRISM Fleet Reaper", { spawnImpl: fakeExec });
  assert.equal(r.ok, false);
});
test("runScheduledTaskNow: respects custom timeout", () => {
  let opts;
  const fakeExec = (cmd, args, o) => { opts = o; return ""; };
  runScheduledTaskNow("X", { spawnImpl: fakeExec, timeoutMs: 9000 });
  assert.equal(opts.timeout, 9000);
});

// ── decideGlobalCompaction (Tier-4 pure decision) ──
test("decideGlobalCompaction: not-critical → noop", () => {
  const r = decideGlobalCompaction({
    pressureTier: "normal", lastCompactionMs: 0, cooldownSec: 120, nowMs: 1000,
    disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "noop");
  assert.match(r.reason, /not-critical/);
});
test("decideGlobalCompaction: warn-tier → noop (only critical fires)", () => {
  const r = decideGlobalCompaction({
    pressureTier: "warn", lastCompactionMs: 0, cooldownSec: 120, nowMs: 1000,
    disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "noop");
});
test("decideGlobalCompaction: critical + cooldown expired → compact", () => {
  const nowMs = 1_000_000;
  const r = decideGlobalCompaction({
    pressureTier: "critical", lastCompactionMs: nowMs - 200_000, cooldownSec: 120,
    nowMs, disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "compact");
});
test("decideGlobalCompaction: critical + cooldown active → noop", () => {
  const nowMs = 1_000_000;
  const r = decideGlobalCompaction({
    pressureTier: "critical", lastCompactionMs: nowMs - 60_000, cooldownSec: 120,
    nowMs, disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "noop");
  assert.match(r.reason, /cooldown-active/);
  assert.match(r.reason, /60s/);
});
test("decideGlobalCompaction: critical + never compacted → compact", () => {
  const r = decideGlobalCompaction({
    pressureTier: "critical", lastCompactionMs: 0, cooldownSec: 120, nowMs: 1000,
    disabled: false, actionsAllowed: true,
  });
  assert.equal(r.action, "compact");
});
test("decideGlobalCompaction: critical + !actionsAllowed → advise not compact", () => {
  const r = decideGlobalCompaction({
    pressureTier: "critical", lastCompactionMs: 0, cooldownSec: 120, nowMs: 1000,
    disabled: false, actionsAllowed: false,
  });
  assert.equal(r.action, "advise");
});
test("decideGlobalCompaction: disabled overrides everything", () => {
  const r = decideGlobalCompaction({
    pressureTier: "critical", lastCompactionMs: 0, cooldownSec: 120, nowMs: 1000,
    disabled: true, actionsAllowed: true,
  });
  assert.equal(r.action, "noop");
  assert.match(r.reason, /disabled-via-knob/);
});

// ── executeGlobalCompaction (PowerShell oneliner shell) ──
test("executeGlobalCompaction: ok stdout parsed correctly", () => {
  const fakeSpawn = () => '{ "count": 12, "approxBytes": 8388608 }';
  const r = executeGlobalCompaction({ spawnImpl: fakeSpawn });
  assert.equal(r.ok, true);
  assert.equal(r.count, 12);
  assert.equal(r.approxBytes, 8388608);
});
test("executeGlobalCompaction: zero processes still ok", () => {
  const fakeSpawn = () => '{ "count": 0, "approxBytes": 0 }';
  const r = executeGlobalCompaction({ spawnImpl: fakeSpawn });
  assert.equal(r.ok, true);
  assert.equal(r.count, 0);
});
test("executeGlobalCompaction: spawn throws → ok=false", () => {
  const fakeSpawn = () => { throw new Error("powershell ENOENT"); };
  const r = executeGlobalCompaction({ spawnImpl: fakeSpawn });
  assert.equal(r.ok, false);
  assert.match(r.error, /ENOENT/);
});
test("executeGlobalCompaction: malformed JSON → ok=false", () => {
  const fakeSpawn = () => "not json at all";
  const r = executeGlobalCompaction({ spawnImpl: fakeSpawn });
  assert.equal(r.ok, false);
});
test("executeGlobalCompaction: empty stdout → ok=false", () => {
  const fakeSpawn = () => "";
  const r = executeGlobalCompaction({ spawnImpl: fakeSpawn });
  assert.equal(r.ok, false);
});
test("executeGlobalCompaction: custom targetNames flow through to PS command", () => {
  let capturedArgs;
  const fakeSpawn = (cmd, args) => {
    capturedArgs = args;
    return '{ "count": 5, "approxBytes": 1000 }';
  };
  executeGlobalCompaction({ targetNames: ["claude", "ruby"], spawnImpl: fakeSpawn });
  const cmdStr = capturedArgs.join(" ");
  assert.match(cmdStr, /'claude'/);
  assert.match(cmdStr, /'ruby'/);
});
