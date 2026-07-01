// mcp-connectivity-check.test.mjs — pure-core tests with injected http + fs.
// Run: node --test H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getConfig,
  loadState,
  saveState,
  shouldProbe,
  buildBanner,
  runCheck,
  countBridges,
  buildDegradedBanner,
  buildClientDisconnectBanner,
} from "./mcp-connectivity-check.mjs";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── getConfig ──

test("getConfig: defaults", () => {
  const cfg = getConfig({});
  assert.equal(cfg.url, "http://127.0.0.1:3100");
  assert.equal(cfg.timeoutMs, 3000); // DEFAULT_TIMEOUT_MS bumped 1000->3000 (test was stale; fixed slot golf 2026-06-12)
  assert.equal(cfg.throttleSec, 30);
  assert.equal(cfg.disabled, false);
  assert.equal(cfg.verbose, false);
});

test("getConfig: PRISM_MCP_URL respected", () => {
  const cfg = getConfig({ PRISM_MCP_URL: "http://localhost:9999/" });
  assert.equal(cfg.url, "http://localhost:9999"); // trailing slash stripped
});

test("getConfig: kill switch + throttle override", () => {
  const cfg = getConfig({
    PRISM_MCP_CONNECTIVITY_DISABLE: "1",
    PRISM_MCP_CONNECTIVITY_THROTTLE_SEC: "60",
  });
  assert.equal(cfg.disabled, true);
  assert.equal(cfg.throttleSec, 60);
});

test("getConfig: timeoutMs is clamped to min 100", () => {
  const cfg = getConfig({ PRISM_MCP_CONNECTIVITY_TIMEOUT_MS: "10" });
  assert.equal(cfg.timeoutMs, 100);
});

// ── shouldProbe ──

test("shouldProbe: fresh state (no prior probe) returns true", () => {
  assert.equal(shouldProbe({ lastProbeAt: 0, lastStatus: null }, 30, 1000), true);
});

test("shouldProbe: within throttle window with OK status returns false", () => {
  const now = 1_000_000;
  const state = { lastProbeAt: now - 5000, lastStatus: { ok: true } };
  assert.equal(shouldProbe(state, 30, now), false);
});

test("shouldProbe: within throttle window with DOWN status STILL probes (recovery)", () => {
  const now = 1_000_000;
  const state = { lastProbeAt: now - 5000, lastStatus: { ok: false } };
  assert.equal(shouldProbe(state, 30, now), true);
});

test("shouldProbe: past throttle window returns true", () => {
  const now = 1_000_000;
  const state = { lastProbeAt: now - 60_000, lastStatus: { ok: true } };
  assert.equal(shouldProbe(state, 30, now), true);
});

test("shouldProbe: throttle=0 always probes", () => {
  assert.equal(shouldProbe({ lastProbeAt: Date.now(), lastStatus: { ok: true } }, 0), true);
});

// ── buildBanner ──

test("buildBanner: ok + non-verbose returns null (silent)", () => {
  const banner = buildBanner({ ok: true, status: 200, latencyMs: 5 }, { url: "X", verbose: false });
  assert.equal(banner, null);
});

test("buildBanner: ok + verbose returns short ok line", () => {
  const banner = buildBanner({ ok: true, status: 200, latencyMs: 5 }, { url: "X", verbose: true });
  assert.match(banner, /reachable/);
  assert.match(banner, /5ms/);
});

test("buildBanner: down returns DISCONNECTED banner with reconnect instructions", () => {
  const banner = buildBanner({ ok: false, error: "ECONNREFUSED", status: null, latencyMs: 1000 }, { url: "http://127.0.0.1:3100", verbose: false });
  assert.match(banner, /DISCONNECTED/);
  assert.match(banner, /ECONNREFUSED/);
  assert.match(banner, /mcp-server\/dist\/index\.js/);
  assert.match(banner, /PRISM_MCP_CONNECTIVITY_DISABLE=1/);
});

test("buildBanner: down with 500 error names the status", () => {
  const banner = buildBanner({ ok: false, error: null, status: 500, latencyMs: 50 }, { url: "X", verbose: false });
  assert.match(banner, /HTTP 500/);
});

// ── loadState / saveState ──

test("loadState: missing file returns blank state", () => {
  const s = loadState("/nonexistent.json", { existsSync: () => false });
  assert.equal(s.lastProbeAt, 0);
  assert.equal(s.lastStatus, null);
});

test("loadState: corrupt JSON returns blank state (graceful)", () => {
  const s = loadState("/file.json", { existsSync: () => true, readFileSync: () => "{nope" });
  assert.equal(s.lastProbeAt, 0);
});

test("saveState + loadState round-trip via injected deps", () => {
  const store = {};
  const deps = {
    existsSync: (p) => p in store || p === "/dir",
    readFileSync: (p) => store[p],
    writeFileSync: (p, c) => { store[p] = c; },
    mkdirSync: () => {},
  };
  const ok = saveState("/dir/state.json", { lastProbeAt: 12345, lastStatus: { ok: true } }, deps);
  assert.equal(ok, true);
  const loaded = loadState("/dir/state.json", deps);
  assert.equal(loaded.lastProbeAt, 12345);
  assert.equal(loaded.lastStatus.ok, true);
});

// ── runCheck end-to-end (injected probe + fs) ──

test("runCheck: disabled env returns continue:true silently", async () => {
  const r = await runCheck({ env: { PRISM_MCP_CONNECTIVITY_DISABLE: "1" } });
  assert.equal(r.continue, true);
  assert.equal(r.hookSpecificOutput, undefined);
});

test("runCheck: healthy probe returns silent continue", async () => {
  const store = {};
  const deps = {
    existsSync: (p) => p in store,
    readFileSync: (p) => store[p],
    writeFileSync: (p, c) => { store[p] = c; },
    mkdirSync: () => {},
  };
  const r = await runCheck({
    env: { PRISM_MCP_URL: "http://x" },
    statePath: "/tmp/state.json",
    deps,
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 3 }),
  });
  assert.equal(r.continue, true);
  assert.equal(r.hookSpecificOutput, undefined);
});

test("runCheck: disconnect returns DISCONNECTED banner", async () => {
  const store = {};
  const deps = {
    existsSync: (p) => p in store,
    readFileSync: (p) => store[p],
    writeFileSync: (p, c) => { store[p] = c; },
    mkdirSync: () => {},
  };
  const r = await runCheck({
    statePath: "/tmp/state2.json",
    deps,
    probeFn: async () => ({ ok: false, status: null, error: "ECONNREFUSED", latencyMs: 1000 }),
  });
  assert.equal(r.continue, true);
  assert.match(r.hookSpecificOutput.additionalContext, /DISCONNECTED/);
});

test("runCheck: throttle within window with ok status skips probe (no banner)", async () => {
  // Pre-populate state with a recent OK probe
  const nowMs = 1_000_000;
  const store = {
    "/tmp/state3.json": JSON.stringify({ lastProbeAt: nowMs - 5000, lastStatus: { ok: true } }),
  };
  const deps = {
    existsSync: (p) => p in store,
    readFileSync: (p) => store[p],
    writeFileSync: (p, c) => { store[p] = c; },
    mkdirSync: () => {},
  };
  let probeFired = false;
  const r = await runCheck({
    statePath: "/tmp/state3.json",
    deps,
    nowMs,
    probeFn: async () => { probeFired = true; return { ok: true }; },
  });
  assert.equal(probeFired, false, "probe must not fire within throttle window when OK");
  assert.equal(r.continue, true);
  assert.equal(r.hookSpecificOutput, undefined);
});

test("runCheck: throttle within window with DOWN status STILL probes (recovery)", async () => {
  const nowMs = 1_000_000;
  const store = {
    "/tmp/state4.json": JSON.stringify({ lastProbeAt: nowMs - 5000, lastStatus: { ok: false } }),
  };
  const deps = {
    existsSync: (p) => p in store,
    readFileSync: (p) => store[p],
    writeFileSync: (p, c) => { store[p] = c; },
    mkdirSync: () => {},
  };
  let probeFired = false;
  const r = await runCheck({
    statePath: "/tmp/state4.json",
    deps,
    nowMs,
    probeFn: async () => { probeFired = true; return { ok: true, status: 200, latencyMs: 5 }; },
  });
  assert.equal(probeFired, true, "must re-probe when prior status was down");
  // After successful recovery probe, banner is silent (verbose:false default)
  assert.equal(r.hookSpecificOutput, undefined);
});

test("runCheck: verbose env always emits banner even on success", async () => {
  const store = {};
  const deps = {
    existsSync: (p) => p in store,
    readFileSync: (p) => store[p],
    writeFileSync: (p, c) => { store[p] = c; },
    mkdirSync: () => {},
  };
  const r = await runCheck({
    env: { PRISM_MCP_CONNECTIVITY_VERBOSE: "1" },
    statePath: "/tmp/state5.json",
    deps,
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 5 }),
  });
  assert.match(r.hookSpecificOutput.additionalContext, /reachable/);
});

// ── U-MCP-BRIDGE-DETECT (slot golf 2026-06-12): bridge-layer false-OK detection ──
function writeCache(procs, ageMs = 0) {
  const dir = mkdtempSync(join(tmpdir(), "mcpcache-"));
  const f = join(dir, ".fleet-reaper-enum-cache-TESTHOST.json");
  writeFileSync(f, JSON.stringify({ schemaVersion: "1", procs }));
  return { dir, f };
}

test("countBridges: fresh cache with 0 bridges -> ok:true bridges:0 (the degraded signal)", () => {
  const { dir, f } = writeCache([{ pid: 1, cmd: "C:/node.exe foo.js" }, { pid: 2, cmd: "node mcp-server/dist/index.js" }]);
  try {
    const bc = countBridges({}, { cacheFile: f });
    assert.equal(bc.ok, true);
    assert.equal(bc.bridges, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("countBridges: counts live mcp-http-bridge procs", () => {
  const { dir, f } = writeCache([{ pid: 1, cmd: "node .claude/helpers/mcp-http-bridge.mjs" }, { pid: 2, cmd: "node mcp-http-bridge.mjs" }, { pid: 3, cmd: "node other.js" }]);
  try {
    assert.equal(countBridges({}, { cacheFile: f }).bridges, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("countBridges: FAIL-SOFT -> ok:false on missing/stale/disabled (never a false degraded)", () => {
  assert.equal(countBridges({ PRISM_MCP_BRIDGE_CHECK_DISABLE: "1" }, {}).ok, false);
  assert.equal(countBridges({}, { cacheFile: join(tmpdir(), "nope-does-not-exist.json") }).ok, false);
  // stale cache (age > 900s) -> ok:false
  const { dir, f } = writeCache([]);
  try {
    const bc = countBridges({}, { cacheFile: f, now: () => Date.now() + 901_000, statSync: () => ({ mtimeMs: Date.now() }) });
    assert.equal(bc.ok, false);
    assert.equal(bc.reason, "stale-cache");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("runCheck: server UP + 0 bridges -> SILENT (idle, not outage; U-MCP-FALSEPOS-SUPPRESS golf 2026-06-17)", async () => {
  // 0 transient bridges with a HEALTHY server is the normal idle resting state, NOT a
  // disconnect (proven: 617-session study = 196 false banners in 8 transcripts vs 4 real
  // terminal bridge deaths fleet-wide; + 32-concurrent load test 0 errors). No false banner.
  const r = await runCheck({
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 5 }),
    countBridgesFn: () => ({ ok: true, bridges: 0, ageSec: 8 }),
    statePath: join(tmpdir(), `mcpbt-${process.pid}-a.json`), nowMs: Date.now(),
  });
  assert.deepEqual(r, { continue: true });
});

test("runCheck: server UP + 0 bridges + PRISM_MCP_FLEET0_BANNER=1 -> legacy banner restorable", async () => {
  // The suppression is a deliberate knob, not a deletion: operators can restore the legacy
  // fleet-0 banner if a future need appears (never-delete-only-disable).
  const r = await runCheck({
    env: { PRISM_MCP_FLEET0_BANNER: "1" },
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 5 }),
    countBridgesFn: () => ({ ok: true, bridges: 0, ageSec: 8 }),
    statePath: join(tmpdir(), `mcpbt-${process.pid}-a2.json`), nowMs: Date.now(),
  });
  assert.match(r.hookSpecificOutput.additionalContext, /BRIDGE DOWN/);
  assert.match(r.hookSpecificOutput.additionalContext, /\/mcp/);
});

test("runCheck: server UP + bridges>0 -> SILENT (no false degraded)", async () => {
  const r = await runCheck({
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 5 }),
    countBridgesFn: () => ({ ok: true, bridges: 3, ageSec: 8 }),
    statePath: join(tmpdir(), `mcpbt-${process.pid}-b.json`), nowMs: Date.now(),
  });
  assert.deepEqual(r, { continue: true });
});

test("runCheck: server DOWN still reconnects (bridge check does NOT run on down)", async () => {
  let bridgeChecked = false;
  const r = await runCheck({
    probeFn: async () => ({ ok: false, status: null, error: "ECONNREFUSED" }),
    maybeReconnectFn: () => ({ acted: true, spawned: true }),
    countBridgesFn: () => { bridgeChecked = true; return { ok: true, bridges: 0, ageSec: 1 }; },
    statePath: join(tmpdir(), `mcpbt-${process.pid}-c.json`), nowMs: Date.now(),
  });
  assert.equal(bridgeChecked, false, "bridge check must NOT run when server is down");
  assert.ok(r.hookSpecificOutput.additionalContext.length > 0);
});

test("buildDegradedBanner: honest about the harness limit + names /mcp", () => {
  const b = buildDegradedBanner({ ageSec: 42 });
  assert.match(b, /cannot respawn the harness bridge/);
  assert.match(b, /\/mcp/);
  assert.match(b, /prism_safe/);
});


// -- MCP-CLIENT-ENFORCE-MS0 (slot tango): per-chat sentinel client-disconnect --
// golf's countBridges is fleet-wide; the sentinel is precise to THIS chat. These
// drive runCheck with injected sentinel + countBridges fns.

const _memDeps = () => {
  const store = {};
  return {
    existsSync: (p) => p in store,
    readFileSync: (p) => store[p],
    writeFileSync: (p, c) => { store[p] = c; },
    mkdirSync: () => {},
  };
};

test("runCheck: daemon UP + THIS chat's bridge dead -> CLIENT-DISCONNECT banner", async () => {
  const r = await runCheck({
    env: { PRISM_BOOT_SLOT: "tango" },
    statePath: "/tmp/cc-client1.json",
    deps: _memDeps(),
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 3 }),
    resolveSlotFn: () => "tango",
    readBridgeLivenessFn: () => ({ alive: false, reason: "pid-dead", pid: 50992, ageMs: 1000 }),
    countBridgesFn: () => ({ ok: true, bridges: 5 }), // peers alive -> fleet count says OK
  });
  assert.match(r.hookSpecificOutput.additionalContext, /THIS CHAT lost its prism MCP bridge/);
  assert.match(r.hookSpecificOutput.additionalContext, /pid 50992/);
  assert.match(r.hookSpecificOutput.additionalContext, /\/mcp/);
});

test("runCheck: daemon UP + bridge ALIVE -> silent (no banner)", async () => {
  const r = await runCheck({
    env: {},
    statePath: "/tmp/cc-client2.json",
    deps: _memDeps(),
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 3 }),
    resolveSlotFn: () => "tango",
    readBridgeLivenessFn: () => ({ alive: true, reason: "ok", pid: 100, ageMs: 500 }),
    countBridgesFn: () => ({ ok: true, bridges: 5 }),
  });
  assert.equal(r.hookSpecificOutput, undefined);
});

test("runCheck: sentinel no-signal + server UP + 0 bridges -> SILENT (idle false-pos suppressed)", async () => {
  // Pre-fix this fell back to the fleet-0 "MCP BRIDGE DOWN" degraded banner. Post
  // U-MCP-FALSEPOS-SUPPRESS (golf 2026-06-17): a HEALTHY server + no per-chat sentinel signal
  // + 0 transient bridges is the idle resting state, not an outage -> no banner.
  const r = await runCheck({
    env: {},
    statePath: "/tmp/cc-client3.json",
    deps: _memDeps(),
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 3 }),
    resolveSlotFn: () => null,
    readBridgeLivenessFn: () => ({ alive: false, reason: "no-sentinel", pid: null, ageMs: null }),
    countBridgesFn: () => ({ ok: true, bridges: 0 }),
  });
  assert.equal(r.hookSpecificOutput, undefined);
});

test("runCheck: per-chat sentinel disconnect takes PRECEDENCE over a healthy fleet count", async () => {
  const r = await runCheck({
    env: {},
    statePath: "/tmp/cc-client5.json",
    deps: _memDeps(),
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 3 }),
    resolveSlotFn: () => "tango",
    readBridgeLivenessFn: () => ({ alive: false, reason: "stale-heartbeat", pid: 77, ageMs: 99999 }),
    countBridgesFn: () => ({ ok: true, bridges: 9 }), // fleet fine, but MY bridge stale
  });
  assert.match(r.hookSpecificOutput.additionalContext, /THIS CHAT lost its prism MCP bridge/);
});

test("runCheck: PRISM_MCP_CLIENT_CHECK_DISABLE=1 skips sentinel, still does countBridges", async () => {
  let sentinelCalled = false;
  const r = await runCheck({
    env: { PRISM_MCP_CLIENT_CHECK_DISABLE: "1" },
    statePath: "/tmp/cc-client4.json",
    deps: _memDeps(),
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 3 }),
    readBridgeLivenessFn: () => { sentinelCalled = true; return { alive: false, reason: "pid-dead", pid: 1 }; },
    countBridgesFn: () => ({ ok: true, bridges: 3 }),
  });
  assert.equal(sentinelCalled, false, "sentinel check must be skipped when disabled");
  assert.equal(r.hookSpecificOutput, undefined); // bridges>0, no banner
});

test("runCheck: sentinel throw never breaks the turn (fail-soft)", async () => {
  const r = await runCheck({
    env: {},
    statePath: "/tmp/cc-client6.json",
    deps: _memDeps(),
    probeFn: async () => ({ ok: true, status: 200, latencyMs: 3 }),
    readBridgeLivenessFn: () => { throw new Error("boom"); },
    countBridgesFn: () => ({ ok: true, bridges: 4 }),
  });
  assert.equal(r.continue, true); // fell through to countBridges (4>0 -> silent), no throw
  assert.equal(r.hookSpecificOutput, undefined);
});

test("buildClientDisconnectBanner: content + honest harness limit", () => {
  const b = buildClientDisconnectBanner("tango", { reason: "pid-dead", pid: 50992 }, { url: "http://127.0.0.1:3100" });
  assert.match(b, /slot=tango/);
  assert.match(b, /pid 50992 gone/);
  assert.match(b, /cannot reconnect the harness client/);
  assert.match(b, /PRISM_MCP_CLIENT_CHECK_DISABLE=1/);
});

// ─── U-MCP-CONNCHECK-DEBOUNCE (golf 2026-06-17) ───
// A single transient probe timeout on a healthy-but-momentarily-slow :3100 must NOT declare
// "DISCONNECTED -- every tool call will fail". Require a confirming re-probe; only a SUSTAINED
// outage (both probes fail) surfaces the banner. Same R7 lesson as the false-broadcast live-probe.
test("runCheck debounce: transient (probe fails, re-probe OK) -> NO banner", async () => {
  let calls = 0;
  const r = await runCheck({
    env: {},
    statePath: join(tmpdir(), `cc-deb-transient-${process.pid}.json`),
    nowMs: Date.now(),
    maybeReconnectFn: () => null, // isolate debounce; no real reconnect side effect
    probeFn: async () => {
      calls++;
      return calls === 1
        ? { ok: false, status: null, error: "timeout" }
        : { ok: true, status: 200, latencyMs: 5 };
    },
  });
  assert.equal(calls, 2, "must re-probe once after the first failure");
  assert.equal(r.hookSpecificOutput, undefined, "transient blip must be suppressed (no DISCONNECTED banner)");
});

test("runCheck debounce: sustained (both probes fail) -> DISCONNECTED banner", async () => {
  let calls = 0;
  const r = await runCheck({
    env: {},
    statePath: join(tmpdir(), `cc-deb-sustained-${process.pid}.json`),
    nowMs: Date.now(),
    maybeReconnectFn: () => null,
    probeFn: async () => { calls++; return { ok: false, status: null, error: "ECONNREFUSED" }; },
  });
  assert.equal(calls, 2, "sustained down: probed twice (initial + confirm)");
  assert.ok(
    r.hookSpecificOutput && /DISCONNECTED/.test(r.hookSpecificOutput.additionalContext),
    "a sustained outage must still surface the DISCONNECTED banner",
  );
});

test("runCheck debounce: happy path (probe OK) -> NO re-probe (zero added latency)", async () => {
  let calls = 0;
  const r = await runCheck({
    env: {},
    statePath: join(tmpdir(), `cc-deb-happy-${process.pid}.json`),
    nowMs: Date.now(),
    maybeReconnectFn: () => null,
    probeFn: async () => { calls++; return { ok: true, status: 200, latencyMs: 5 }; },
  });
  assert.equal(calls, 1, "a healthy probe must NOT trigger a re-probe (happy path adds zero latency)");
  assert.equal(r.hookSpecificOutput, undefined);
});

test("runCheck debounce: PRISM_MCP_CONNECTIVITY_NO_DEBOUNCE=1 -> single-probe fail-fast banner", async () => {
  let calls = 0;
  const r = await runCheck({
    env: { PRISM_MCP_CONNECTIVITY_NO_DEBOUNCE: "1" },
    statePath: join(tmpdir(), `cc-deb-nodebounce-${process.pid}.json`),
    nowMs: Date.now(),
    maybeReconnectFn: () => null,
    probeFn: async () => { calls++; return { ok: false, status: null, error: "timeout" }; },
  });
  assert.equal(calls, 1, "the knob disables the re-probe (single-probe fail-fast)");
  assert.ok(
    r.hookSpecificOutput && /DISCONNECTED/.test(r.hookSpecificOutput.additionalContext),
    "with debounce disabled, a single failure still surfaces the banner",
  );
});
