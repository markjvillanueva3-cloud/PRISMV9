/**
 * hermes-work-loop-driver.test.mjs -- the plan+draft-only parallel Hermes work-loop harness (U4).
 *
 * Hermetic: every boundary is dependency-injected (no real fetch/spawn/schtasks/engine-import).
 * R9: the assertions encode the harness's contract -- it reads sources, feeds them through the
 * classifier, drives the EXISTING runner with an ask-hermes executor, writes a per-unit ledger
 * receipt, and NEVER commits code (operator decision 2: plan+draft-only). The gate is the runner's
 * own default-OFF gate, reused -- the driver adds no second gate.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isUnderTsx,
  planTsxReexec,
  loadWorkSources,
  gatherHeldClaims,
  assembleContext,
  mcpDigestFor,
  buildExecutor,
  appendLedgerRow,
  parseArgs,
  main,
} from "./hermes-work-loop-driver.mts";

describe("tsx-reexec guard", () => {
  it("isUnderTsx detects the tsx loader in execArgv", () => {
    assert.equal(isUnderTsx(["--import", "tsx/dist/loader.mjs"]), true);
    assert.equal(isUnderTsx(["--max-old-space-size=4096"]), false);
    assert.equal(isUnderTsx([]), false);
  });
  it("planTsxReexec does NOT reexec when already under tsx or when the breaker is set", () => {
    assert.equal(planTsxReexec({ execArgv: ["tsx/dist/cli.mjs"] }).reexec, false);
    assert.equal(planTsxReexec({ execArgv: [], env: { PRISM_HWL_REEXEC: "1" } }).reexec, false);
    assert.equal(planTsxReexec({ execArgv: [], env: { PRISM_HWL_NO_REEXEC: "1" } }).reexec, false);
  });
  it("planTsxReexec reports tsx-absent when the cli is missing", () => {
    const p = planTsxReexec({ execArgv: [], env: {}, cwd: "H:/nonexistent-dir-xyz" });
    assert.equal(p.reexec, false);
    assert.equal(p.reason, "tsx-absent");
  });
});

describe("loadWorkSources (injected readers)", () => {
  it("normalizes roadmap.pending_units + research.items + the newest wiring audit", () => {
    const files = { roadmap: "R.json", research: "M.json", wiringDir: "DIR" };
    const readJson = (p) => {
      if (p === "R.json") return { pending_units: [{ unit_id: "U-A", title: "Build A", milestone: "MS0" }, { foo: 1 }] };
      if (p === "M.json") return { items: [{ milestone_or_unit_id: "MS::U-B", title: "Research B", evidence: "ev" }] };
      if (String(p).endsWith("UNWIRED-ENGINE-AUDIT-2026-06-29.json")) return { unwiredEngines: [{ engine: "FooEngine", suggestedDispatcher: "prism_foo" }] };
      throw new Error("unexpected " + p);
    };
    const listDir = () => ["UNWIRED-ENGINE-AUDIT-2026-06-01.json", "UNWIRED-ENGINE-AUDIT-2026-06-29.json"];
    const { units, skipped } = loadWorkSources({ readJson, listDir, files });
    assert.equal(skipped.length, 0);
    // U-A (roadmap, the {foo:1} row is skipped -- no unit_id/title), MS::U-B (research), FooEngine (wiring/newest)
    assert.equal(units.length, 3);
    assert.deepEqual(units.map((u) => u.source).sort(), ["research", "roadmap", "wiring"]);
    const wiring = units.find((u) => u.source === "wiring");
    assert.equal(wiring.unit_id, "FooEngine");
    assert.equal(wiring.domain, "prism_foo");
  });
  it("a missing/throwing source is skipped, not fatal (partial feed survives)", () => {
    const files = { roadmap: "R.json", research: "M.json", wiringDir: "DIR" };
    const readJson = (p) => { if (p === "R.json") return { pending_units: [{ unit_id: "U-OK", title: "ok" }] }; throw new Error("ENOENT"); };
    const listDir = () => [];
    const { units, skipped } = loadWorkSources({ readJson, listDir, files });
    assert.equal(units.length, 1);
    assert.ok(skipped.some((s) => s.startsWith("research")));
    assert.ok(skipped.some((s) => s.startsWith("wiring")));
  });
});

describe("gatherHeldClaims (REUSES canonical readStore + peerClaimedSet -- not a re-parse)", () => {
  // The store.claims shape is a MAP keyed by unitId (the real `readStore` returns this; the
  // `list --json` CLI separately emits Object.values(...) as an ARRAY -- the array-vs-map mismatch
  // was a real P0 caught by per-file scrutiny arm B). We inject the canonical readStore +
  // peerClaimedSet so the test exercises the REAL contract, not a fabricated CLI wire shape.
  function fakeStore() {
    const NOW = Date.parse("2026-06-30T00:00:00Z");
    const future = new Date(NOW + 1e9).toISOString();
    const past = new Date(NOW - 1e9).toISOString();
    return {
      claims: {
        "U-PEER": { unitId: "U-PEER", slot: "alpha", chatId: "c1", expiresAt: future },
        "U-MINE": { unitId: "U-MINE", slot: "juliett", chatId: "me", expiresAt: future },
        "U-OLD": { unitId: "U-OLD", slot: "bravo", chatId: "c2", expiresAt: past },
        "U-OTHER": { unitId: "U-OTHER", slot: "echo", chatId: "c3", expiresAt: future },
      },
    };
  }
  // The REAL peerClaimedSet logic (mirrored for the hermetic test): active, non-expired, peer-owned.
  function realPeerClaimedSet(store, mySlot, myChatId, unitIds, nowIso) {
    const now = Date.parse(nowIso);
    const out = new Set();
    for (const id of unitIds) {
      const c = store.claims[id];
      if (!c) continue;
      const exp = Date.parse(c.expiresAt);
      if (Number.isFinite(now) && Number.isFinite(exp) && exp < now) continue;
      if (mySlot && myChatId && c.slot === mySlot && c.chatId === myChatId) continue;
      out.add(id);
    }
    return out;
  }

  it("returns peer-claimed unit_ids, excludes own-identity + expired (canonical store map)", () => {
    const held = gatherHeldClaims(["U-PEER", "U-MINE", "U-OLD"], {
      readStoreImpl: fakeStore,
      peerClaimedSetImpl: realPeerClaimedSet,
      mySlot: "juliett",
      myChatId: "me",
      nowIso: "2026-06-30T00:00:00Z",
    });
    assert.deepEqual(held.sort(), ["U-PEER"]); // U-MINE=own, U-OLD=expired, U-OTHER not a candidate
  });

  it("identity-less is most-restrictive: ALL active candidate claims count as peer (safe default)", () => {
    const held = gatherHeldClaims(["U-PEER", "U-MINE"], {
      readStoreImpl: fakeStore,
      peerClaimedSetImpl: realPeerClaimedSet,
      nowIso: "2026-06-30T00:00:00Z",
      // no mySlot/myChatId -> even U-MINE counts as a peer claim (cannot prove it is ours)
    });
    assert.deepEqual(held.sort(), ["U-MINE", "U-PEER"]);
  });

  it("fail-soft: a readStore error yields an empty set (loop continues, no claim filter)", () => {
    const held = gatherHeldClaims(["U-X"], { readStoreImpl: () => { throw new Error("store unreadable"); }, peerClaimedSetImpl: realPeerClaimedSet });
    assert.deepEqual(held, []);
  });

  it("a readOnly/corrupt store is SURFACED via onWarn (R12 -- not swallowed), loop still continues", () => {
    // readStore returns a {readOnly,reason} sentinel (corrupt/schema-mismatch) instead of throwing.
    // The loop must run WITHOUT a claim filter (safe direction) BUT log the corruption.
    const warnings = [];
    const held = gatherHeldClaims(["U-X"], {
      readStoreImpl: () => ({ claims: {}, readOnly: true, reason: "schema-version mismatch: file=2 script=1" }),
      peerClaimedSetImpl: realPeerClaimedSet,
      onWarn: (m) => warnings.push(m),
    });
    assert.deepEqual(held, []); // empty claims -> no filter (continues)
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /claim store unreadable/);
    assert.match(warnings[0], /schema-version mismatch/); // the real reason is surfaced, not swallowed
  });
});

describe("assembleContext + mcpDigestFor (pure prompt assembly)", () => {
  it("a draft posture asks for a concrete diff + the human-commits caveat", () => {
    const p = assembleContext({ subtask_id: "U-1", description: "do x", domain: "mill" }, "draft", "- prism_calc");
    assert.match(p, /DRAFT diff/);
    assert.match(p, /human commits/);
    assert.match(p, /prism_calc/);
  });
  it("a plan posture asks for analysis only (no code changes)", () => {
    const p = assembleContext({ subtask_id: "U-2", description: "survey y", domain: "research" }, "plan", "- prism_dev");
    assert.match(p, /No code changes/);
  });
  it("mcpDigestFor routes by domain keyword + falls back to the universal set", () => {
    assert.match(mcpDigestFor("mill", "cutting force"), /prism_calc/);
    assert.match(mcpDigestFor("lathe", "turning"), /prism_turning/);
    assert.match(mcpDigestFor("unknown-domain", "vague task"), /dispatcher_map_compact/);
  });
});

describe("buildExecutor -- one ask-hermes agent per subtask, ledger-record-NEVER-commit", () => {
  function harness(over = {}) {
    const rows = [];
    const classified = new Map([
      ["U-CLOUD", { lane: "cloud", posture: "draft", risk: "code", source: "roadmap" }],
      ["U-LOCAL", { lane: "local", posture: "plan", risk: "read-only", source: "research" }],
    ]);
    const spawnCalls = [];
    const exec = buildExecutor(classified, {
      spawn: (exe, args, input) => { spawnCalls.push({ args, input }); return JSON.stringify({ source: "hermes", answer: "PLAN: ..." }); },
      append: (_p, line) => rows.push(JSON.parse(line)),
      ledgerPath: "x",
      now: () => "2026-06-30T00:00:00Z",
      ...over,
    });
    return { exec, rows, spawnCalls };
  }

  it("BOTH lanes invoke ask-hermes in `ask` mode (literal-query mode; file-modes would mis-read the prompt as a path)", async () => {
    const { exec, spawnCalls } = harness();
    await exec({ subtask_id: "U-CLOUD", description: "build the engine", domain: "mill" });
    await exec({ subtask_id: "U-LOCAL", description: "survey tips", domain: "research" });
    // `summarize`/`explain` etc. are FILE_MODES in ask-hermes -- they treat the positional arg as a
    // file path; a literal prompt to them hits the noisy lenient-not-a-file fallback. `ask` is the
    // literal-query mode and is correct for both lanes. The cloud/local distinction is the proxy's
    // own Hermes/Ollama routing, recorded in the ledger row's `lane`, NOT the ask-hermes mode.
    assert.equal(spawnCalls[0].args[1], "ask"); // cloud
    assert.equal(spawnCalls[1].args[1], "ask"); // local -- same mode, lane recorded separately
    assert.ok(spawnCalls[0].args.includes("--with-context")); // vault attached
  });

  it("EVERY ledger row is committed:false (operator decision 2 -- plan+draft-only, human commits)", async () => {
    const { exec, rows } = harness();
    await exec({ subtask_id: "U-CLOUD", description: "build", domain: "mill" });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].committed, false);
    assert.equal(rows[0].schemaVersion, "1.0.0");
    assert.equal(rows[0].stampedAt, "2026-06-30T00:00:00Z");
    assert.match(rows[0].agentOutput, /PLAN/);
  });

  it("dry-run records a plan-only ledger row WITHOUT spawning an agent", async () => {
    const { exec, rows, spawnCalls } = harness({ dryRun: true });
    const r = await exec({ subtask_id: "U-CLOUD", description: "build", domain: "mill" });
    assert.equal(spawnCalls.length, 0); // never spawned
    assert.equal(rows[0].committed, false);
    assert.match(rows[0].agentOutput, /dry-run/);
    assert.equal(r.ok, true);
  });

  it("an ask-hermes failure is captured ok:false in the row, the harness does NOT throw", async () => {
    const { exec, rows } = harness({ spawn: () => { throw new Error("proxy down"); } });
    const r = await exec({ subtask_id: "U-CLOUD", description: "build", domain: "mill" });
    assert.equal(r.ok, false);
    assert.equal(rows[0].ok, false);
    assert.match(rows[0].error, /proxy down/);
    assert.equal(rows[0].committed, false); // still never commits
  });
});

describe("parseArgs", () => {
  it("--gate OR PRISM_HERMES_AUTONOMOUS_DRIVE=1 enables the gate; defaults bound max-units/parallel", () => {
    assert.equal(parseArgs(["--gate"]).gate, true);
    assert.equal(parseArgs([]).gate, false || process.env.PRISM_HERMES_AUTONOMOUS_DRIVE === "1");
    const a = parseArgs(["--max-units", "9", "--max-parallel", "4", "--json", "--dry-run"]);
    assert.equal(a.maxUnits, 9);
    assert.equal(a.maxParallel, 4);
    assert.equal(a.json, true);
    assert.equal(a.dryRun, true);
  });
});

describe("main (end-to-end, all deps injected)", () => {
  const baseDeps = {
    loadSources: () => ({ units: [{ unit_id: "U-A", title: "Wire the foo engine", source: "wiring" }], skipped: [] }),
    gatherClaims: () => [],
    feeder: {
      toSubtasks: ({ sources }) => ({
        subtasks: sources.map((u) => ({ subtask: { subtask_id: u.unit_id, description: u.title, domain: "wiring" }, risk: "code", executor_lane: "cloud", posture: "draft", source: u.source })),
        excludedClaimed: 0, excludedDuplicate: 0, excludedMalformed: 0, consideredCount: sources.length,
      }),
    },
  };

  // Real DriveRunResult shape (verified live against HermesAutonomousDriveRunnerEngine): the
  // runner returns { ran, gated, reason, aggregate, trace } -- NOT { ok }. (Reading the wrong
  // field made the live summary falsely report ranAgents:0 even when the wave fired -- caught by
  // live validation, fixed here; R9: the mock now matches the production engine contract.)
  it("the wave is GATED OFF by default (driveRan false), and the loop NEVER commits", async () => {
    let drove = null;
    const runner = { drive: async (opts) => { drove = opts; return { ran: false, gated: false, reason: "gated-off (set PRISM_HERMES_AUTONOMOUS_DRIVE=1 or pass gateEnabled:true)" }; } };
    const r = await main(["--json", "--quiet"], { ...baseDeps, runner, makeExecutor: () => async () => ({ ok: true }) });
    assert.equal(r.exitCode, 0); // harness ran fine -- gated-off is a VALID outcome, not a harness failure
    assert.equal(r.summary.committed, false);
    assert.equal(r.summary.gated, false);    // --gate not passed
    assert.equal(r.summary.driveRan, false); // the runner refused (its own default-OFF gate)
    assert.equal(r.summary.ranAgents, 0);    // no wave -> no agents
    assert.equal(drove.gateEnabled, false);  // we passed the gate through, added no second one
  });

  it("with --gate the runner fires; summary reports the picked + fired counts; still committed:false", async () => {
    const runner = { drive: async () => ({ ran: true, gated: true, reason: null }) };
    const r = await main(["--gate", "--json", "--quiet"], { ...baseDeps, runner, makeExecutor: () => async () => ({ ok: true }) });
    assert.equal(r.summary.gated, true);
    assert.equal(r.summary.driveRan, true);
    assert.equal(r.summary.picked, 1);
    assert.equal(r.summary.ranAgents, 1); // ran == true -> one agent per picked subtask
    assert.equal(r.summary.committed, false); // ALWAYS
  });

  it("zero units after filter -> exit 0, ranAgents 0 (not an error)", async () => {
    const r = await main(["--json", "--quiet"], {
      ...baseDeps,
      feeder: { toSubtasks: () => ({ subtasks: [], excludedClaimed: 3, excludedDuplicate: 0, excludedMalformed: 0, consideredCount: 3 }) },
      runner: { drive: async () => ({ ran: true, gated: true, reason: null }) },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.summary.ranAgents, 0);
    assert.equal(r.summary.reason, "no-units-after-filter");
  });

  it("a harness failure (source-load throws) -> exit 2, fail-loud (R12)", async () => {
    const r = await main(["--json", "--quiet"], {
      ...baseDeps,
      loadSources: () => { throw new Error("disk exploded"); },
      runner: { drive: async () => ({ ran: true, gated: true, reason: null }) },
    });
    assert.equal(r.exitCode, 2);
    assert.match(r.summary.error, /disk exploded/);
  });
});
