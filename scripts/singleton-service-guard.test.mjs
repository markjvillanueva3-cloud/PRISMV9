#!/usr/bin/env node
/**
 * Hermetic suite for singleton-service-guard.mjs's safe-repair classifier.
 * No process/port IO — the pure core is fed explicit {portUp, daemonPids,
 * servingPid}. The load-bearing invariants: (1) the exact 2026-06-09 outage
 * (port down + ≥1 wedged daemon → reap ALL); (2) NEVER reap the serving PID.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { classifyServiceHealth, fixPlan, isMcpDaemonCmdline, SINGLETON_SERVICES } from "./singleton-service-guard.mjs";

test("SINGLETON_SERVICES includes the MCP :3100 daemon (the recurring offender)", () => {
  const mcp = SINGLETON_SERVICES.find((s) => s.name === "mcp");
  assert.ok(mcp);
  assert.equal(mcp.port, 3100);
});

test("healthy: port up + exactly one daemon → no action", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: true, daemonPids: [79436], servingPid: 79436 });
  assert.equal(c.state, "healthy");
  assert.equal(c.healthy, true);
  assert.equal(c.action, "none");
  assert.deepEqual(c.reapPids, []);
});

test("2026-06-09 outage: port DOWN + 2 wedged daemons → reap ALL (the manual recovery)", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: false, daemonPids: [53400, 63708], servingPid: null });
  assert.equal(c.state, "all-wedged");
  assert.equal(c.healthy, false);
  assert.equal(c.action, "reap-all");
  assert.deepEqual(c.reapPids.sort(), [53400, 63708]);
});

test("duplicate-serving: port up + 3 daemons, server known → reap the 2 NON-serving, KEEP the server", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: true, daemonPids: [100, 200, 300], servingPid: 200 });
  assert.equal(c.state, "duplicate-serving");
  assert.equal(c.action, "reap-duplicates");
  assert.deepEqual(c.reapPids.sort((a, b) => a - b), [100, 300]);
  assert.ok(!c.reapPids.includes(200), "INVARIANT: must never reap the serving PID");
});

test("duplicate-unknown-server: port up + duplicates but server unknown → REPORT only (never guess)", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: true, daemonPids: [100, 200], servingPid: null });
  assert.equal(c.state, "duplicate-unknown-server");
  assert.equal(c.action, "report-only");
  assert.deepEqual(c.reapPids, [], "must NOT reap when the server can't be identified (could kill the live one)");
});

test("not-running: port down + no daemon → start (no reap)", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: false, daemonPids: [], servingPid: null });
  assert.equal(c.state, "not-running");
  assert.equal(c.action, "start");
  assert.deepEqual(c.reapPids, []);
});

test("dedups + ignores bogus PIDs in the daemon list", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: false, daemonPids: [42, 42, 0, -1, NaN], servingPid: null });
  assert.equal(c.daemonCount, 1);
  assert.deepEqual(c.reapPids, [42]);
});

// ── fixPlan: the reap-THEN-start decision (U-MCP-FIXSTART) ─────────────────

test("fixPlan healthy (none) → no reap, no start", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: true, daemonPids: [79436], servingPid: 79436 });
  assert.deepEqual(fixPlan(c), { reap: [], start: false });
});

test("fixPlan not-running → start only (no reap)", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: false, daemonPids: [], servingPid: null });
  assert.deepEqual(fixPlan(c), { reap: [], start: true });
});

test("fixPlan all-wedged → reap ALL then start (the 2026-06-09 recovery, now automated)", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: false, daemonPids: [53400, 63708], servingPid: null });
  const p = fixPlan(c);
  assert.deepEqual(p.reap.sort((a, b) => a - b), [53400, 63708]);
  assert.equal(p.start, true, "must respawn after clearing the pileup — else the port stays down");
});

test("fixPlan reap-duplicates → reap non-serving only, NO start (server already serving)", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: true, daemonPids: [100, 200, 300], servingPid: 200 });
  const p = fixPlan(c);
  assert.deepEqual(p.reap.sort((a, b) => a - b), [100, 300]);
  assert.equal(p.start, false);
  assert.ok(!p.reap.includes(200), "INVARIANT: fixPlan must never schedule the serving PID for reap");
});

test("fixPlan report-only (duplicate-unknown-server) → DO NOTHING (never start, never reap the live one)", () => {
  const c = classifyServiceHealth({ name: "mcp", portUp: true, daemonPids: [100, 200], servingPid: null });
  assert.deepEqual(fixPlan(c), { reap: [], start: false });
});

test("fixPlan tolerates a bare/garbage classification (defensive default = do nothing)", () => {
  assert.deepEqual(fixPlan({}), { reap: [], start: false });
  assert.deepEqual(fixPlan({ action: "bogus" }), { reap: [], start: false });
});

test("the mcp service carries a startHelper so --fix can (re)start it", () => {
  const mcp = SINGLETON_SERVICES.find((s) => s.name === "mcp");
  assert.ok(mcp.startHelper, "mcp must declare a startHelper or --fix can never recover a down server");
  assert.match(mcp.startHelper, /mcp-server-daemon\.mjs$/);
});

// ── cmdMatch vs REAL daemon command-line forms (U-MCP-CMDMATCH-FIX) ─────────
// The hermetic classifier tests inject daemonPids, so they never exercised the
// cmdMatch regex against an actual command line. These assert the regex matches
// the forms BOTH real spawners produce — the supervisor's forward-slash absolute
// path and a Windows backslash path — and rejects unrelated node procs. With the
// pre-fix backslash-only `mcp-server\\dist\\index`, the forward-slash case FAILS
// (the live bug: pid 63828 owned :3100 yet daemonCount read 0).
test("cmdMatch matches the supervisor's FORWARD-slash spawn (the live :3100 owner form)", () => {
  const cm = SINGLETON_SERVICES.find((s) => s.name === "mcp").cmdMatch;
  assert.equal(isMcpDaemonCmdline("H:\\Tools\\nodejs\\node.exe H:/prism/mcp-server/dist/index.js", cm), true);
});

test("cmdMatch matches the Windows BACKSLASH path form too (slash-agnostic)", () => {
  const cm = SINGLETON_SERVICES.find((s) => s.name === "mcp").cmdMatch;
  assert.equal(isMcpDaemonCmdline("node H:\\prism\\mcp-server\\dist\\index.js", cm), true);
});

test("cmdMatch does NOT match unrelated node processes (no false-positive reap targets)", () => {
  const cm = SINGLETON_SERVICES.find((s) => s.name === "mcp").cmdMatch;
  assert.equal(isMcpDaemonCmdline("node H:/prism/mcp-server/node_modules/typescript/lib/tsserver.js", cm), false);
  assert.equal(isMcpDaemonCmdline("node H:/prism/scripts/mcp-server-supervisor.mjs", cm), false, "the supervisor LOOP is not the daemon");
  assert.equal(isMcpDaemonCmdline("", cm), false);
});
