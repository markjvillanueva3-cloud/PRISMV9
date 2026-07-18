/**
 * hermes-substrate-health.test.mjs -- the LIVE liveness runner (I/O boundary).
 *
 * Hermetic: every probe is dependency-injected (no real fetch/spawn/schtasks). R9: the
 * assertions encode the runner's contract -- it gathers a probe, grades via the engine,
 * appends a schema-stamped receipt, and never throws on a probe failure.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isUnderTsx,
  planTsxReexec,
  probeRoundTrip,
  probeTasks,
  readUsage,
  gatherProbe,
  appendReceipt,
  main,
  EXPECTED_TASKS,
} from "./hermes-substrate-health.mjs";

describe("tsx-reexec guard", () => {
  it("isUnderTsx detects the tsx loader in execArgv", () => {
    assert.equal(isUnderTsx(["--import", "tsx/dist/loader.mjs"]), true);
    assert.equal(isUnderTsx(["--max-old-space-size=4096"]), false);
    assert.equal(isUnderTsx([]), false);
  });
  it("planTsxReexec does NOT reexec when already under tsx or when the breaker is set", () => {
    assert.equal(planTsxReexec({ execArgv: ["tsx/dist/cli.mjs"] }).reexec, false);
    assert.equal(planTsxReexec({ execArgv: [], env: { PRISM_HSH_REEXEC: "1" } }).reexec, false);
    assert.equal(planTsxReexec({ execArgv: [], env: { PRISM_HSH_NO_REEXEC: "1" } }).reexec, false);
  });
  it("planTsxReexec reports tsx-absent (no reexec) when the cli is not found", () => {
    const p = planTsxReexec({ execArgv: [], env: {}, cwd: "H:/nonexistent-dir-xyz" });
    assert.equal(p.reexec, false);
    assert.equal(p.reason, "tsx-absent");
  });
});

describe("probeRoundTrip (injected spawn)", () => {
  it("reads source=hermes from a --json answer => reachedHermes true", () => {
    const spawn = () => JSON.stringify({ mode: "ask", source: "hermes", answer: "PONG" });
    const r = probeRoundTrip({ spawn });
    assert.equal(r.ran, true);
    assert.equal(r.source, "hermes");
    assert.equal(r.reachedHermes, true);
  });
  it("reads a fallback source => reachedHermes false (the lane fell back)", () => {
    const spawn = () => JSON.stringify({ mode: "ask", source: "ollama", answer: "PONG" });
    const r = probeRoundTrip({ spawn });
    assert.equal(r.reachedHermes, false);
    assert.equal(r.source, "ollama");
  });
  it("a thrown spawn (non-zero exit) => ran:false, fail-loud", () => {
    const spawn = () => { const e = new Error("boom"); e.stderr = "proxy down"; throw e; };
    const r = probeRoundTrip({ spawn });
    assert.equal(r.ran, false);
    assert.equal(r.reachedHermes, false);
    assert.match(r.error, /proxy down/);
  });
  it("a killed/timed-out spawn => ran:false with a timeout error", () => {
    const spawn = () => { const e = new Error("killed"); e.killed = true; throw e; };
    const r = probeRoundTrip({ spawn });
    assert.equal(r.ran, false);
    assert.match(r.error, /timed out/i);
  });
});

describe("probeTasks (injected schtasks)", () => {
  it("parses Status/Last Run Time/Last Result from schtasks LIST output", () => {
    const spawn = (_exe, args) => {
      const name = args[args.indexOf("/TN") + 1];
      if (name === "PRISM Hermes Proxy") {
        return "TaskName: \\PRISM Hermes Proxy\nStatus: Ready\nLast Run Time: 6/29/2026 8:00:00 PM\nLast Result: 0\n";
      }
      throw new Error("not registered");
    };
    const tasks = probeTasks({ spawn, expectedTasks: ["PRISM Hermes Proxy", "PRISM Hermes Ghost"] });
    // The unregistered task is omitted (the engine flags it via expectedTasks).
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].name, "PRISM Hermes Proxy");
    assert.equal(tasks[0].state, "Ready");
    assert.equal(tasks[0].lastResult, 0);
    assert.match(tasks[0].lastRunTime, /2026/);
  });
  it("normalizes a Disabled status + a never-run task (no Last Run Time)", () => {
    const spawn = () => "Status: Disabled\nLast Run Time: N/A\nLast Result: 267011\n";
    const tasks = probeTasks({ spawn, expectedTasks: ["PRISM Zebra Orchestrator"] });
    assert.equal(tasks[0].state, "Disabled");
    assert.equal(tasks[0].lastRunTime, null);
    assert.equal(tasks[0].lastResult, 267011);
  });
  it("parses a 0x-hex Last Result (scrutiny P2 arm A: the defensive hex branch)", () => {
    const spawn = () => "Status: Ready\nLast Run Time: 6/29/2026 8:00:00 PM\nLast Result: 0x41303\n";
    const tasks = probeTasks({ spawn, expectedTasks: ["PRISM Hermes Proxy"] });
    assert.equal(tasks[0].lastResult, 0x41303); // 267011 -- the "never run" code, written hex
  });
});

describe("probeRoundTrip parse-fallback (scrutiny P2: a parse failure is UNKNOWN, never a substring sniff)", () => {
  it("malformed stdout that merely CONTAINS 'hermes' (e.g. a fallback's hermesError) does NOT grade reachedHermes", () => {
    // A non-JSON line containing "hermes" must NOT be mislabeled as reaching Hermes.
    const spawn = () => "garbled output mentioning hermesError but not valid json";
    const r = probeRoundTrip({ spawn });
    assert.equal(r.ran, true);
    assert.equal(r.source, "unknown");
    assert.equal(r.reachedHermes, false);
  });
});

describe("readUsage (injected file)", () => {
  it("reads the ask-hermes bySource counters", () => {
    const readFile = () => JSON.stringify({ byHook: { "ask-hermes": { fired: 13, bySource: { hermes: 1, fail: 12 } } } });
    const u = readUsage({ readFile, statsPath: "x" });
    assert.equal(u.fired, 13);
    assert.equal(u.bySource.fail, 12);
  });
  it("returns undefined (not throw) when stats are absent/malformed", () => {
    assert.equal(readUsage({ readFile: () => { throw new Error("nope"); }, statsPath: "x" }), undefined);
    assert.equal(readUsage({ readFile: () => "{}", statsPath: "x" }), undefined);
  });
});

describe("gatherProbe + appendReceipt + main (end-to-end, injected)", () => {
  const fakeDeps = {
    checkProxy: async () => ({ ok: true, authenticated: false, error: null }),
    healthUrl: () => "http://127.0.0.1:8645/health",
    skipRoundTrip: true,
    spawn: () => { throw new Error("not registered"); }, // no tasks registered in the fixture
    readFile: () => "{}",
    statsPath: "x",
    expectedTasks: ["PRISM Hermes Proxy"],
  };

  it("gatherProbe assembles a probe with the proxy auth state + expectedTasks", async () => {
    const probe = await gatherProbe(fakeDeps);
    assert.equal(probe.proxy.ok, true);
    assert.equal(probe.proxy.authenticated, false);
    assert.deepEqual(probe.expectedTasks, ["PRISM Hermes Proxy"]);
    assert.equal(probe.roundTrip.ran, false); // skipped
  });

  it("gatherProbe tags the configured lane: a local :8645 URL is oauth-proxy (no localProxy sub-probe)", async () => {
    // PROXY_URL is module-level; we can't repoint it per-test, so we assert the lane tag exists
    // and is one of the two valid values, and that a localProxy probe is only present for a direct lane.
    const probe = await gatherProbe(fakeDeps);
    assert.ok(probe.proxy.lane === "direct" || probe.proxy.lane === "oauth-proxy");
    // localProxy is present iff the configured lane is direct (the dual-lane honesty path).
    if (probe.proxy.lane === "oauth-proxy") {
      assert.equal(probe.localProxy, undefined, "an oauth-proxy lane needs no separate local probe");
    } else {
      assert.ok(probe.localProxy && typeof probe.localProxy.ok === "boolean", "a direct lane must also probe local :8645");
    }
  });

  it("appendReceipt writes a schema-stamped, timestamped row to the injected ledger", () => {
    const rows = [];
    const row = appendReceipt(
      { overall: "down", schemaVersion: "1.0.0" },
      { append: (_p, line) => rows.push(line), ledgerPath: "x", now: "2026-06-30T00:00:00Z" },
    );
    assert.equal(rows.length, 1);
    assert.equal(row.overall, "down");
    assert.equal(row.stampedAt, "2026-06-30T00:00:00Z");
    assert.match(rows[0], /\n$/); // append-only newline
  });

  it("main grades + appends + exits 0 even when the substrate is DOWN (a DOWN probe is a successful HARNESS run)", async () => {
    const rows = [];
    const r = await main(["--json", "--quiet", "--no-roundtrip"], {
      ...fakeDeps,
      append: (_p, line) => rows.push(line),
      ledgerPath: "x",
    });
    assert.equal(r.exitCode, 0); // harness ran successfully -- the substrate being DOWN is the FINDING, not a harness failure
    assert.equal(rows.length, 1);
    const written = JSON.parse(rows[0]);
    // proxy authenticated:false + no registered tasks => overall down/degraded, never falsely ok.
    assert.notEqual(written.overall, "ok");
  });

  it("main returns exitCode 2 when the probe gather itself throws (harness failure, fail-loud)", async () => {
    const r = await main(["--quiet"], {
      ...fakeDeps,
      checkProxy: async () => { throw new Error("fetch exploded"); },
      append: () => {},
    });
    assert.equal(r.exitCode, 2);
  });

  it("EXPECTED_TASKS lists the 10 registered Hermes scheduled tasks", () => {
    assert.equal(EXPECTED_TASKS.length, 10);
    assert.ok(EXPECTED_TASKS.includes("PRISM Hermes Proxy"));
    assert.ok(EXPECTED_TASKS.includes("PRISM Zebra Orchestrator"));
  });
});
