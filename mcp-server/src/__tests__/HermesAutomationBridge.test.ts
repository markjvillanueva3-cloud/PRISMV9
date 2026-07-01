/**
 * HermesAutomationBridge engine test
 * (U-HERMES-BRIDGE-ENGINE-TEST, slot:bravo 2026-06-22).
 *
 * Closes the gap scrutiny arm-C surfaced on U-HERMES-DISPATCHER-WIRE-TEST: the
 * safety-critical bridge engine had NO dedicated engine-level test -- the dispatcher
 * wire-test only exercised mock mode through the handler. This covers, HERMETICALLY
 * (injected SpawnFn + exe + home -- ZERO real-Hermes-CLI spawn risk):
 *   - the dual-key gate BOTH directions (the governance contract)
 *   - run() argument guards (empty / oversize)
 *   - the LIVE spawn path: success, timeout/killed fail-close (R12), non-zero exit
 *   - exe-not-found fail-close (spawn is never reached)
 *   - modelList mock + live delegation
 *   - routinePlan determinism + fail-loud warning
 *   - read-only inspection on a non-installed home (deterministic, no fixture)
 *
 * Engine imported directly (test convention) so we can inject opts.spawn -- the live
 * paths use a fake spawn and process.execPath as a guaranteed-existing exe, so no test
 * ever launches the real Hermes binary.
 */
import { describe, it, expect } from "vitest";
import { HermesAutomationBridge } from "../engines/HermesAutomationBridge.js";

const NOPE_HOME = "H:/__prism_no_hermes_home_xyz__";
const NOPE_EXE = "H:/__prism_no_hermes_exe_xyz__.exe";
// process.execPath (the running node binary) is guaranteed to exist -> lets the live
// path pass the existsSync(exe) gate and reach the injected spawn.
const REAL_EXE = process.execPath;

describe("HermesAutomationBridge engine (U-HERMES-BRIDGE-ENGINE-TEST)", () => {
  // ── dual-key gate (the governance contract) ─────────────────────────────────
  it("is mock by default (no dual-key)", () => {
    expect(new HermesAutomationBridge().mock).toBe(true);
  });

  it("opts.mock=false forces live; opts.mock=true forces mock (explicit test override)", () => {
    expect(new HermesAutomationBridge({ mock: false }).mock).toBe(false);
    expect(new HermesAutomationBridge({ mock: true }).mock).toBe(true);
  });

  it("dual-key needs BOTH halves: noMock alone stays mock; noMock + env=0 goes live", () => {
    const prev = process.env["PRISM_HERMES_MOCK"];
    try {
      delete process.env["PRISM_HERMES_MOCK"];
      expect(new HermesAutomationBridge({ noMock: true }).mock).toBe(true); // one key -> still mock
      process.env["PRISM_HERMES_MOCK"] = "0";
      expect(new HermesAutomationBridge({ noMock: true }).mock).toBe(false); // both keys -> live
      expect(new HermesAutomationBridge({ noMock: false }).mock).toBe(true); // env only -> still mock
    } finally {
      if (prev === undefined) delete process.env["PRISM_HERMES_MOCK"];
      else process.env["PRISM_HERMES_MOCK"] = prev;
    }
  });

  it("the sandbox tier grants process-spawn (sandboxAllowed === true)", () => {
    expect(new HermesAutomationBridge({ tier: "sandbox" }).sandboxAllowed).toBe(true);
  });

  // ── run() argument guards (pure, pre-spawn) ─────────────────────────────────
  it("run([]) rejects empty args, confidence 0, never spawns", () => {
    let spawned = false;
    const b = new HermesAutomationBridge({ mock: false, tier: "sandbox", exe: REAL_EXE, spawn: () => { spawned = true; return ""; } });
    const r = b.run([]);
    expect(r.value).toBe(null);
    expect(r.confidence).toBe(0);
    expect(String(r.warning)).toContain("non-empty args");
    expect(spawned).toBe(false);
  });

  it("run() rejects an oversize args array (>64), confidence 0", () => {
    const b = new HermesAutomationBridge({ mock: false, tier: "sandbox", exe: REAL_EXE, spawn: () => "" });
    const r = b.run(Array.from({ length: 65 }, (_, i) => `a${i}`));
    expect(r.value).toBe(null);
    expect(r.confidence).toBe(0);
    expect(String(r.warning)).toContain("args rejected");
  });

  // ── mock-mode envelope (no spawn) ───────────────────────────────────────────
  it("run() in mock returns a would-run envelope and never spawns", () => {
    let spawned = false;
    const b = new HermesAutomationBridge({ mock: true, exe: REAL_EXE, spawn: () => { spawned = true; return ""; } });
    const r = b.run(["model", "list"]);
    expect(r.source).toBe("mock");
    expect((r.value as { wouldRun: boolean }).wouldRun).toBe(true);
    expect((r.value as { args: string[] }).args).toEqual(["model", "list"]);
    expect(spawned).toBe(false);
  });

  // ── LIVE spawn paths (hermetic via injected spawn + real existing exe) ───────
  it("LIVE run spawns via the injected fn and returns stdout (confidence 0.95)", () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    const b = new HermesAutomationBridge({
      mock: false, tier: "sandbox", exe: REAL_EXE,
      spawn: (file, args) => { calls.push({ file, args }); return "LIVE-STDOUT"; },
    });
    const r = b.run(["model", "list"]);
    expect(r.source).toBe("hermes-cli");
    expect(r.confidence).toBe(0.95);
    expect((r.value as { stdout: string }).stdout).toBe("LIVE-STDOUT");
    expect(calls).toEqual([{ file: REAL_EXE, args: ["model", "list"] }]); // exact exe + array args, no shell
  });

  it("SAFETY: a KILLED child is NEVER a success (R12 fail-close; killed disjunct load-bearing)", () => {
    const b = new HermesAutomationBridge({
      mock: false, tier: "sandbox", exe: REAL_EXE,
      spawn: () => { throw { killed: true }; }, // killed only, no signal -- isolates the err.killed disjunct
    });
    const r = b.run(["slow", "op"]);
    expect(r.value).toBe(null);          // NOT a fabricated success
    expect(r.confidence).toBe(0);
    expect(r.source).toBe("hermes-cli");
    expect(String(r.warning)).toMatch(/timed out|never a success/);
  });

  it("SAFETY: a SIGNALED child is NEVER a success (R12 fail-close; signal disjunct load-bearing)", () => {
    const b = new HermesAutomationBridge({
      mock: false, tier: "sandbox", exe: REAL_EXE,
      spawn: () => { throw { signal: "SIGKILL" }; }, // signal only, no killed flag -- isolates the err.signal disjunct
    });
    const r = b.run(["slow", "op"]);
    expect(r.value).toBe(null);
    expect(r.confidence).toBe(0);
    expect(r.source).toBe("hermes-cli");
    expect(String(r.warning)).toMatch(/timed out|never a success/);
  });

  it("a non-zero exit surfaces the real stdout/stderr/code, confidence 0 (nothing fabricated)", () => {
    const b = new HermesAutomationBridge({
      mock: false, tier: "sandbox", exe: REAL_EXE,
      spawn: () => { const e: Record<string, unknown> = new Error("boom") as unknown as Record<string, unknown>; e.status = 2; e.stdout = "partial-out"; e.stderr = "the-error"; throw e; },
    });
    const r = b.run(["bad", "cmd"]);
    expect(r.confidence).toBe(0);
    expect(r.source).toBe("hermes-cli");
    const v = r.value as { stdout: string; stderr: string; code: number };
    expect(v.code).toBe(2);
    expect(v.stderr).toBe("the-error");
    expect(v.stdout).toBe("partial-out");
  });

  it("exe-not-found fail-closes BEFORE spawning (spawn never called)", () => {
    let spawned = false;
    const b = new HermesAutomationBridge({ mock: false, tier: "sandbox", exe: NOPE_EXE, spawn: () => { spawned = true; return ""; } });
    const r = b.run(["model", "list"]);
    expect(r.value).toBe(null);
    expect(r.confidence).toBe(0);
    expect(String(r.warning)).toContain("exe not found");
    expect(spawned).toBe(false);
  });

  it("SAFETY: a non-sandbox tier (shop_floor) DENIES process-spawn -- run refuses before reaching spawn", () => {
    // shop_floor (the safety-critical default) excludes process-spawn from its
    // capability allowlist, so the live gate must refuse even with mock=false.
    let spawned = false;
    const b = new HermesAutomationBridge({ mock: false, tier: "shop_floor", exe: REAL_EXE, spawn: () => { spawned = true; return ""; } });
    expect(b.sandboxAllowed).toBe(false);            // the gate that stops a live spawn off-tier
    const r = b.run(["model", "list"]);
    expect(r.value).toBe(null);
    expect(r.confidence).toBe(0);
    expect(String(r.warning)).toContain("sandbox denied");
    expect(spawned).toBe(false);                     // never reached the injected spawn
  });

  // ── modelList ───────────────────────────────────────────────────────────────
  it("modelList in mock returns the local model roster", () => {
    const r = new HermesAutomationBridge({ mock: true }).modelList();
    expect(r.source).toBe("mock");
    expect((r.value as { models: string[] }).models).toContain("ollama");
    expect((r.value as { models: string[] }).models).toContain("qwen2.5-coder:32b");
  });

  it("modelList LIVE delegates to run(['model','list']) via the injected spawn", () => {
    const calls: string[][] = [];
    const b = new HermesAutomationBridge({
      mock: false, tier: "sandbox", exe: REAL_EXE,
      spawn: (_file, args) => { calls.push(args); return "PROVIDERS"; },
    });
    const r = b.modelList();
    expect(r.source).toBe("hermes-cli");
    expect((r.value as { stdout: string }).stdout).toBe("PROVIDERS");
    expect(calls).toEqual([["model", "list"]]);
  });

  // ── routinePlan (emit-only, deterministic) ──────────────────────────────────
  it("routinePlan emits the full template catalog as ready-to-run cron commands (telegram default)", () => {
    const r = new HermesAutomationBridge().routinePlan();
    expect(r.source).toBe("hermes-bridge:routine_plan");
    const v = r.value as { deliver: string; count: number; routines: Array<{ command: string; deliver: string }> };
    expect(v.deliver).toBe("telegram");
    expect(v.count).toBe(4);                       // ROUTINE_TEMPLATES length
    expect(v.routines.length).toBe(4);
    expect(v.routines[0]!.command).toContain("hermes cron create");
    expect(v.routines[0]!.deliver).toBe("telegram");
  });

  it("routinePlan fail-loud-warns on an unknown delivery target but still emits (R12)", () => {
    const r = new HermesAutomationBridge().routinePlan({ deliver: "bogustarget" });
    const v = r.value as { deliver: string };
    expect(v.deliver).toBe("bogustarget");
    expect(String(r.warning)).toContain("not a known Hermes target");
  });

  // ── read-only inspection on a non-installed home (deterministic, no fixture) ──
  it("probe on a missing home reports installed:false without throwing", () => {
    const r = new HermesAutomationBridge({ home: NOPE_HOME }).probe();
    expect(r.source).toBe("hermes-bridge:probe");
    expect((r.value as { installed: boolean }).installed).toBe(false);
  });

  it("authStatus on a missing auth.json reports found:false (never fabricates a clean verdict)", () => {
    const r = new HermesAutomationBridge({ home: NOPE_HOME }).authStatus();
    expect(r.source).toBe("hermes-bridge:auth_status");
    expect((r.value as { found: boolean }).found).toBe(false);
  });

  it("status reports the mock flag + sandbox tier", () => {
    const r = new HermesAutomationBridge({ home: NOPE_HOME, tier: "sandbox" }).status();
    expect(r.source).toBe("hermes-bridge:status");
    const v = r.value as { mock: boolean; tier: string };
    expect(v.mock).toBe(true);
    expect(v.tier).toBe("sandbox");
  });
});
