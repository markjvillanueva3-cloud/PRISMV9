/**
 * Tests for fleet-reaper-mcp-zombie-hunter.mjs
 *
 * Run: node --test scripts/lib/fleet-reaper-mcp-zombie-hunter.test.mjs
 *
 * Coverage: detection criteria (all 5), age-floor enforcement, regex override,
 * claude-parent allowlist, protected-pid guard, malformed-input safety.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findMcpZombies,
  findStaleOrphanedNodes,
  buildStaleNodeProtectRegex,
  DEFAULT_PRISM_WORKER_PROTECT_REGEX,
  DEFAULT_MCP_ZOMBIE_AGE_SEC,
  DEFAULT_STALE_NODE_AGE_SEC,
  DEFAULT_STALE_NODE_RSS_MAX_BYTES,
} from "./fleet-reaper-mcp-zombie-hunter.mjs";

const NOW = 1_700_000_000_000;
const OLD = NOW - (DEFAULT_MCP_ZOMBIE_AGE_SEC + 60) * 1000; // 11 min old
const FRESH = NOW - 60 * 1000; // 1 min old (below floor)
const STALE_NODE_OLD = NOW - (DEFAULT_STALE_NODE_AGE_SEC + 60) * 1000; // 31 min old
const STALE_NODE_FRESH = NOW - 60 * 1000; // 1 min old (below stale-node floor)

function mkProc({ pid, ppid = 0, name = "node.exe", cmd = "H:/prism/mcp-server/dist/index.js", createdMs = OLD, rssBytes = 100 * 1024 * 1024 }) {
  return { pid, ppid, name, cmd, createdMs, rssBytes };
}

test("returns [] for empty/invalid input", () => {
  assert.deepEqual(findMcpZombies([], new Set(), NOW), []);
  assert.deepEqual(findMcpZombies(null, new Set(), NOW), []);
  assert.deepEqual(findMcpZombies(undefined, new Set(), NOW), []);
});

test("dead parent → flagged as zombie (reason=dead-parent)", () => {
  const procs = [mkProc({ pid: 100, ppid: 999 })];
  const livePids = new Set([100]); // 999 not in livePids → dead parent
  const result = findMcpZombies(procs, livePids, NOW, { procByPid: new Map() });
  assert.equal(result.length, 1);
  assert.equal(result[0].pid, 100);
  assert.equal(result[0].reason, "dead-parent");
});

test("live claude-parent → NOT a zombie (owned)", () => {
  const procs = [mkProc({ pid: 100, ppid: 999 })];
  const livePids = new Set([100, 999]);
  const procByPid = new Map([[999, { pid: 999, name: "claude.exe" }]]);
  assert.deepEqual(findMcpZombies(procs, livePids, NOW, { procByPid }), []);
});

test("live non-claude parent → flagged as zombie (reason=non-claude-parent)", () => {
  // The MCP server got re-parented to system/explorer after claude.exe exited
  const procs = [mkProc({ pid: 100, ppid: 4 })];
  const livePids = new Set([100, 4]);
  const procByPid = new Map([[4, { pid: 4, name: "System" }]]);
  const r = findMcpZombies(procs, livePids, NOW, { procByPid });
  assert.equal(r.length, 1);
  assert.equal(r[0].reason, "non-claude-parent");
});

test("fresh process (< ageSec floor) → NOT flagged even with dead parent", () => {
  const procs = [mkProc({ pid: 100, ppid: 999, createdMs: FRESH })];
  const livePids = new Set([100]);
  assert.deepEqual(findMcpZombies(procs, livePids, NOW), []);
});

test("non-node process is ignored", () => {
  const procs = [mkProc({ pid: 100, ppid: 999, name: "python.exe" })];
  const livePids = new Set([100]);
  assert.deepEqual(findMcpZombies(procs, livePids, NOW), []);
});

test("node process NOT running mcp-server is ignored", () => {
  const procs = [mkProc({ pid: 100, ppid: 999, cmd: "H:/prism/scripts/embed-all-wiki.mjs" })];
  const livePids = new Set([100]);
  assert.deepEqual(findMcpZombies(procs, livePids, NOW), []);
});

test("custom cmd regex override", () => {
  const procs = [
    mkProc({ pid: 100, ppid: 999, cmd: "/custom/path/server.mjs" }),
    mkProc({ pid: 101, ppid: 999, cmd: "H:/prism/mcp-server/dist/index.js" }),
  ];
  const livePids = new Set([100, 101]);
  const r = findMcpZombies(procs, livePids, NOW, {
    cmdRegex: /custom.path.server\.mjs/,
  });
  assert.equal(r.length, 1);
  assert.equal(r[0].pid, 100);
});

test("protected PID is never reaped (sweep self-protection)", () => {
  const procs = [mkProc({ pid: 100, ppid: 999 })];
  const livePids = new Set([100]);
  const protectedPids = new Set([100]);
  assert.deepEqual(findMcpZombies(procs, livePids, NOW, { protectedPids }), []);
});

test("ageSec floor is clamped to MIN (60s) — typo PRISM_FR_HUNT_MCP_ZOMBIE_AGE_SEC=0 cannot scorch", () => {
  // 30 s old — below the 60 s hard floor
  const veryFresh = NOW - 30 * 1000;
  const procs = [mkProc({ pid: 100, ppid: 999, createdMs: veryFresh })];
  const livePids = new Set([100]);
  // Caller asks for 0 → clamp to 60s — process is 30s old → still not reaped
  assert.deepEqual(findMcpZombies(procs, livePids, NOW, { ageSec: 0 }), []);
});

test("ageSec floor is clamped to MAX (86400s) — typo cannot disable hunter", () => {
  // 25 h old — above the 24 h hard ceiling
  const ancient = NOW - 25 * 3600 * 1000;
  const procs = [mkProc({ pid: 100, ppid: 999, createdMs: ancient })];
  const livePids = new Set([100]);
  // Caller asks for 999999 → clamp to 86400 — process is 90000s old → reaped
  const r = findMcpZombies(procs, livePids, NOW, { ageSec: 999999 });
  assert.equal(r.length, 1);
});

test("multi-candidate batch — mix of zombies, owned, and ignored", () => {
  const procs = [
    mkProc({ pid: 100, ppid: 999 }),                    // dead parent — zombie
    mkProc({ pid: 101, ppid: 200 }),                    // live claude parent — owned
    mkProc({ pid: 102, ppid: 4 }),                      // live non-claude — zombie
    mkProc({ pid: 103, ppid: 999, name: "python.exe" }),// non-node — ignored
    mkProc({ pid: 104, ppid: 999, createdMs: FRESH }),  // too young — ignored
  ];
  const livePids = new Set([100, 101, 102, 103, 104, 200, 4]);
  const procByPid = new Map([
    [200, { pid: 200, name: "claude.exe" }],
    [4, { pid: 4, name: "System" }],
  ]);
  const r = findMcpZombies(procs, livePids, NOW, { procByPid });
  const pids = r.map(z => z.pid).sort((a, b) => a - b);
  assert.deepEqual(pids, [100, 102]);
});

test("no-parent-info (missing ppid) → flagged with reason=no-parent-info", () => {
  // Some PowerShell enum failures yield ppid: NaN. Should still flag.
  const procs = [mkProc({ pid: 100, ppid: NaN })];
  const livePids = new Set([100]);
  const r = findMcpZombies(procs, livePids, NOW);
  assert.equal(r.length, 1);
  assert.equal(r[0].reason, "no-parent-info");
});

test("rssBytes defaults to 0 when missing — never NaN propagates", () => {
  const procs = [{
    pid: 100, ppid: 999, name: "node.exe",
    cmd: "mcp-server/dist/index.js",
    createdMs: OLD,
    // rssBytes intentionally omitted
  }];
  const livePids = new Set([100]);
  const r = findMcpZombies(procs, livePids, NOW);
  assert.equal(r.length, 1);
  assert.equal(r[0].rssBytes, 0);
});

// ============================================================================
// findStaleOrphanedNodes — second-pass hunter (added 2026-05-26, slot:golf)
// Closes the gap that left 209 zombie processes unreaped — npx wrappers,
// chrome-devtools-mcp children, fleet-reaper-bash subagents — all 6+h old
// with RSS=0, none matching the MCP server regex.
// ============================================================================

function mkStaleNode({ pid, ppid = 0, name = "node.exe", cmd = "npx chrome-devtools-mcp", createdMs = STALE_NODE_OLD, rssBytes = 0 }) {
  return { pid, ppid, name, cmd, createdMs, rssBytes };
}

test("findStaleOrphanedNodes: empty/invalid input returns []", () => {
  assert.deepEqual(findStaleOrphanedNodes([], new Set(), NOW), []);
  assert.deepEqual(findStaleOrphanedNodes(null, new Set(), NOW), []);
  assert.deepEqual(findStaleOrphanedNodes(undefined, new Set(), NOW), []);
});

test("findStaleOrphanedNodes: RSS=0 + age>=floor + dead-parent → reaped", () => {
  const procs = [mkStaleNode({ pid: 100, ppid: 999 })]; // ppid 999 not in livePids
  const livePids = new Set([100]);
  const r = findStaleOrphanedNodes(procs, livePids, NOW, { procByPid: new Map() });
  assert.equal(r.length, 1);
  assert.equal(r[0].pid, 100);
  assert.equal(r[0].reason, "dead-parent");
  assert.equal(r[0].rssBytes, 0);
});

test("findStaleOrphanedNodes: RSS above ceiling (50MB) → NOT reaped (healthy resident)", () => {
  const procs = [mkStaleNode({ pid: 100, ppid: 999, rssBytes: 100 * 1024 * 1024 })];
  const livePids = new Set([100]);
  assert.deepEqual(findStaleOrphanedNodes(procs, livePids, NOW), []);
});

test("findStaleOrphanedNodes: age below floor (1 min) → NOT reaped", () => {
  const procs = [mkStaleNode({ pid: 100, ppid: 999, createdMs: STALE_NODE_FRESH })];
  const livePids = new Set([100]);
  assert.deepEqual(findStaleOrphanedNodes(procs, livePids, NOW), []);
});

test("findStaleOrphanedNodes: parent is claude.exe (live + owned) → NOT reaped", () => {
  const procs = [
    mkStaleNode({ pid: 100, ppid: 50 }),
    { pid: 50, ppid: 0, name: "claude.exe", cmd: "claude", createdMs: STALE_NODE_OLD, rssBytes: 200 * 1024 * 1024 },
  ];
  const livePids = new Set([100, 50]);
  const procByPid = new Map([[50, procs[1]]]);
  assert.deepEqual(findStaleOrphanedNodes(procs, livePids, NOW, { procByPid }), []);
});

test("findStaleOrphanedNodes: parent is wt.exe (Windows Terminal — owned) → NOT reaped", () => {
  const procs = [
    mkStaleNode({ pid: 100, ppid: 50 }),
    { pid: 50, ppid: 0, name: "wt.exe", cmd: "wt", createdMs: STALE_NODE_OLD, rssBytes: 100 * 1024 * 1024 },
  ];
  const livePids = new Set([100, 50]);
  const procByPid = new Map([[50, procs[1]]]);
  assert.deepEqual(findStaleOrphanedNodes(procs, livePids, NOW, { procByPid }), []);
});

test("findStaleOrphanedNodes: parent live but System (re-parented) → reaped reason=non-claude-parent", () => {
  const procs = [
    mkStaleNode({ pid: 100, ppid: 4 }),
    { pid: 4, ppid: 0, name: "System", cmd: "", createdMs: STALE_NODE_OLD, rssBytes: 0 },
  ];
  const livePids = new Set([100, 4]);
  const procByPid = new Map([[4, procs[1]]]);
  const r = findStaleOrphanedNodes(procs, livePids, NOW, { procByPid });
  assert.equal(r.length, 1);
  assert.equal(r[0].reason, "non-claude-parent");
});

test("findStaleOrphanedNodes: protected pid → NEVER reaped", () => {
  const procs = [mkStaleNode({ pid: 100, ppid: 999 })];
  const livePids = new Set([100]);
  const protectedPids = new Set([100]);
  assert.deepEqual(findStaleOrphanedNodes(procs, livePids, NOW, { protectedPids }), []);
});

test("findStaleOrphanedNodes: non-node process (bash.exe) → NOT reaped (hunter is node-scoped)", () => {
  const procs = [mkStaleNode({ pid: 100, ppid: 999, name: "bash.exe" })];
  const livePids = new Set([100]);
  assert.deepEqual(findStaleOrphanedNodes(procs, livePids, NOW), []);
});

test("findStaleOrphanedNodes: rssMaxBytes override picks up 30MB process", () => {
  const procs = [mkStaleNode({ pid: 100, ppid: 999, rssBytes: 30 * 1024 * 1024 })];
  const livePids = new Set([100]);
  // Default rssMax is 5MB — 30MB is over → NOT reaped
  assert.equal(findStaleOrphanedNodes(procs, livePids, NOW).length, 0);
  // Override to 40MB → 30MB is under → REAPED
  const r = findStaleOrphanedNodes(procs, livePids, NOW, { rssMaxBytes: 40 * 1024 * 1024 });
  assert.equal(r.length, 1);
});

test("findStaleOrphanedNodes: ageSec=0 (typo) clamps to MIN floor (300s) — fresh procs survive", () => {
  // Process is 100s old — under the 300s MIN floor even if caller asks for 0
  const procs = [mkStaleNode({ pid: 100, ppid: 999, createdMs: NOW - 100 * 1000 })];
  const livePids = new Set([100]);
  assert.deepEqual(findStaleOrphanedNodes(procs, livePids, NOW, { ageSec: 0 }), []);
});

test("findStaleOrphanedNodes: real-world signature — chrome-devtools-mcp npx zombie", () => {
  // Captures the exact failure mode that drove this upgrade — npx wrapper
  // with valid old parent (wt.exe), but parent itself was killed; the orphan
  // is re-parented to system. RSS=0, 6+h old.
  const procs = [
    {
      pid: 2032, ppid: 23136, name: "node.exe",
      cmd: '"H:\\Tools\\nodejs\\node.exe" npx-cli.js "chrome-devtools-mcp@latest"',
      createdMs: NOW - 6 * 60 * 60 * 1000, rssBytes: 0,
    },
  ];
  const livePids = new Set([2032]); // ppid 23136 dead
  const r = findStaleOrphanedNodes(procs, livePids, NOW, { procByPid: new Map() });
  assert.equal(r.length, 1);
  assert.equal(r[0].reason, "dead-parent");
});

// ============================================================================
// SAFETY-GATE HARDENING (2026-06-11, slot:golf) -- stop reaping legit idle/
// detached fleet node.exe. Incident: the stale-node hunter killed galaxy miners
// + *-sidecar embedders + vault pipelines (RSS=0, dead parent BY DESIGN for
// nohup/scheduled-task workers) -> operator disabled the whole reaper. These
// tests lock the fix (cmdline-allowlist + no-cmdline-skip + deep-ancestry) in.
// ============================================================================

test("HARDEN incident-repro: detached galaxy miner (prism cmd, RSS=0, dead parent, 6h) -> NOT reaped", () => {
  const procs = [mkStaleNode({
    pid: 2246, ppid: 999,
    cmd: "node H:/prism/scripts/mine-galaxy-transcripts.mjs --galaxy fleet-hygiene",
    createdMs: NOW - 6 * 60 * 60 * 1000, rssBytes: 0,
  })];
  const livePids = new Set([2246]); // ppid 999 dead -- exactly the incident shape
  assert.deepEqual(findStaleOrphanedNodes(procs, livePids, NOW, { procByPid: new Map() }), []);
});

test("HARDEN: build-memory-embeddings-sidecar (prism cmd, RSS=0, dead parent) -> NOT reaped", () => {
  const procs = [mkStaleNode({ pid: 300, ppid: 999, cmd: "node H:/prism/scripts/build-memory-embeddings-sidecar.mjs --resume" })];
  assert.deepEqual(findStaleOrphanedNodes(procs, new Set([300]), NOW, { procByPid: new Map() }), []);
});

test("HARDEN: any node under the prism tree -> NOT reaped (prism-path protect, backslash form)", () => {
  const procs = [mkStaleNode({ pid: 301, ppid: 999, cmd: "node H:\\prism\\scripts\\foo-worker.mjs" })];
  assert.deepEqual(findStaleOrphanedNodes(procs, new Set([301]), NOW, { procByPid: new Map() }), []);
});

test("HARDEN: vault + fleet + ollama worker families -> NOT reaped", () => {
  const cmds = [
    "node /opt/x/overnight-vault-compound.mjs",
    "node /opt/x/fleet-memory-monitor.mjs",
    "node /opt/x/ollama-docker-launcher.mjs",
  ];
  for (const cmd of cmds) {
    const procs = [mkStaleNode({ pid: 400, ppid: 999, cmd })];
    assert.deepEqual(findStaleOrphanedNodes(procs, new Set([400]), NOW, { procByPid: new Map() }), [], `expected protected: ${cmd}`);
  }
});

test("HARDEN: no-cmdline node (empty cmd, RSS=0, dead parent, aged) -> NOT reaped (conservative)", () => {
  const procs = [mkStaleNode({ pid: 500, ppid: 999, cmd: "" })];
  assert.deepEqual(findStaleOrphanedNodes(procs, new Set([500]), NOW, { procByPid: new Map() }), []);
});

test("HARDEN: no-cmdline reaped ONLY when requireForeignCmd:false (explicit opt-in)", () => {
  const procs = [mkStaleNode({ pid: 500, ppid: 999, cmd: "" })];
  const r = findStaleOrphanedNodes(procs, new Set([500]), NOW, { procByPid: new Map(), requireForeignCmd: false });
  assert.equal(r.length, 1);
  assert.equal(r[0].reason, "dead-parent");
});

test("HARDEN: deep ancestry -- live claude grandparent via NON-owned parent -> NOT reaped", () => {
  // node(600, foreign cmd) -> parent svchost(50, non-owned, live) -> grandparent claude.exe(10, LIVE)
  const child = mkStaleNode({ pid: 600, ppid: 50, cmd: "npx some-foreign-tool" });
  const parent = { pid: 50, ppid: 10, name: "svchost.exe", cmd: "", createdMs: STALE_NODE_OLD, rssBytes: 0 };
  const grand = { pid: 10, ppid: 0, name: "claude.exe", cmd: "claude", createdMs: STALE_NODE_OLD, rssBytes: 300 * 1024 * 1024 };
  const procs = [child, parent, grand];
  const livePids = new Set([600, 50, 10]);
  const procByPid = new Map(procs.map((p) => [p.pid, p]));
  assert.deepEqual(findStaleOrphanedNodes(procs, livePids, NOW, { procByPid }), []);
});

test("HARDEN RECALL: genuinely foreign out-of-tree zombie -> STILL reaped (fix did not gut the hunter)", () => {
  const procs = [mkStaleNode({
    pid: 700, ppid: 999,
    cmd: "C:/Users/x/AppData/Roaming/npm/node_modules/some-foreign-tool/cli.js",
    createdMs: NOW - 6 * 60 * 60 * 1000, rssBytes: 0,
  })];
  const r = findStaleOrphanedNodes(procs, new Set([700]), NOW, { procByPid: new Map() });
  assert.equal(r.length, 1);
  assert.equal(r[0].reason, "dead-parent");
});

test("HARDEN: protectCmdRegex opts override skips a matching node", () => {
  const procs = [mkStaleNode({ pid: 800, ppid: 999, cmd: "node my-custom-daemon.js" })];
  // default regex would reap it (foreign); custom regex protects it
  assert.equal(findStaleOrphanedNodes(procs, new Set([800]), NOW, { procByPid: new Map() }).length, 1);
  const r = findStaleOrphanedNodes(procs, new Set([800]), NOW, { procByPid: new Map(), protectCmdRegex: /my-custom-daemon/ });
  assert.deepEqual(r, []);
});

test("buildStaleNodeProtectRegex: composes default + extra; matches both, foreign still foreign", () => {
  const re = buildStaleNodeProtectRegex("my-special-runner|another-daemon");
  assert.equal(re.test("node H:/prism/scripts/x.mjs"), true);   // default still in
  assert.equal(re.test("node my-special-runner.js"), true);     // extra added
  assert.equal(re.test("node another-daemon.js"), true);
  assert.equal(re.test("npx some-foreign-tool"), false);        // still foreign
});

test("buildStaleNodeProtectRegex: malformed extra falls back to default (no throw)", () => {
  const re = buildStaleNodeProtectRegex("(unclosed[group");
  assert.equal(re instanceof RegExp, true);
  assert.equal(re.test("node H:/prism/scripts/x.mjs"), true);   // default protection intact
});

test("buildStaleNodeProtectRegex: empty/undefined extra returns the default instance", () => {
  assert.equal(buildStaleNodeProtectRegex(""), DEFAULT_PRISM_WORKER_PROTECT_REGEX);
  assert.equal(buildStaleNodeProtectRegex(undefined), DEFAULT_PRISM_WORKER_PROTECT_REGEX);
});

test("HARDEN adversarial: ancestry cycle (A<->B, both live non-owned) terminates without throw/hang", () => {
  const a = mkStaleNode({ pid: 900, ppid: 901, cmd: "npx foreign-a" });
  const b = { pid: 901, ppid: 900, name: "svchost.exe", cmd: "npx foreign-b", createdMs: STALE_NODE_OLD, rssBytes: 0 };
  const procs = [a, b];
  const livePids = new Set([900, 901]); // mutual parents (pathological)
  const procByPid = new Map([[900, a], [901, b]]);
  const r = findStaleOrphanedNodes(procs, livePids, NOW, { procByPid });
  assert.equal(Array.isArray(r), true); // must terminate; cycle guard prevents hang
});

test("HARDEN adversarial: NaN rss + prism cmd -> still protected (cmd gate wins over rss)", () => {
  const procs = [mkStaleNode({ pid: 950, ppid: 999, cmd: "node H:/prism/scripts/x.mjs", rssBytes: NaN })];
  assert.deepEqual(findStaleOrphanedNodes(procs, new Set([950]), NOW, { procByPid: new Map() }), []);
});

test("DEFAULT_PRISM_WORKER_PROTECT_REGEX matches the documented incident families", () => {
  const families = [
    "node H:/prism/scripts/mine-galaxy-transcripts.mjs",
    "node H:/prism/scripts/build-memory-index-sidecar.mjs",
    "node /x/galaxy-synthesis-refresh.mjs",
    "node /x/overnight-vault-compound.mjs",
    "node /x/fleet-reaper-sweep.mjs",
    "node /x/regen-viz.mjs",
  ];
  for (const c of families) assert.equal(DEFAULT_PRISM_WORKER_PROTECT_REGEX.test(c), true, `should protect: ${c}`);
});

test("HARDEN RECALL (reviewer-C BLOCKER-1): foreign out-of-tree dist/index.js zombie -> STILL reaped", () => {
  // chrome-devtools-mcp/dist/index.js was a member of the original 209-zombie class.
  // The anchored pattern (mcp-server/dist/index.js) must NOT shield it.
  const procs = [mkStaleNode({
    pid: 710, ppid: 999,
    cmd: "node C:/Users/x/AppData/Roaming/npm/node_modules/chrome-devtools-mcp/dist/index.js",
    createdMs: NOW - 6 * 60 * 60 * 1000, rssBytes: 0,
  })];
  const r = findStaleOrphanedNodes(procs, new Set([710]), NOW, { procByPid: new Map() });
  assert.equal(r.length, 1);
  assert.equal(r[0].reason, "dead-parent");
});

test("HARDEN: PRISM mcp-server/dist/index.js -> NOT reaped (anchored pattern still protects the real MCP server)", () => {
  const procs = [mkStaleNode({ pid: 720, ppid: 999, cmd: "node H:/prism/mcp-server/dist/index.js --prism" })];
  assert.deepEqual(findStaleOrphanedNodes(procs, new Set([720]), NOW, { procByPid: new Map() }), []);
});

test("DEFAULT_PRISM_WORKER_PROTECT_REGEX: bare foreign dist/index.js is NOT matched (anchor holds)", () => {
  assert.equal(DEFAULT_PRISM_WORKER_PROTECT_REGEX.test("node /opt/foreign-tool/dist/index.js"), false);
  assert.equal(DEFAULT_PRISM_WORKER_PROTECT_REGEX.test("node H:/prism/mcp-server/dist/index.js"), true);
});
