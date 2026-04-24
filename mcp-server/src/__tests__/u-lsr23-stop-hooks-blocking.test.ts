/**
 * u-lsr23-stop-hooks-blocking.test.ts — LATHE-HARDENED-MS0 / U-LSR23
 *
 * Verifies that the nine stop_on_* safety-gate hooks emit the proper
 * Claude Code blocking schema when their trigger condition is met.
 *
 * Regression this prevents: commit 10153283b (schema-fix pass) converted
 * every hook from legacy `{result:"warn"}` to `{continue:true,
 * systemMessage:"warn"}` — silently turning every blocking gate into an
 * informational notice. Session Stop hooks MUST use
 * `{continue:false, stopReason:"..."}` to actually prevent termination.
 *
 * Each state-file-driven hook is exercised with a real child process + a
 * real JSON state fixture, then asserted against the exact `{continue, ...}`
 * payload. The two git-driven hooks (stop_on_broken_imports,
 * stop_on_unsafe_gcode) are exercised by running them against the live
 * working tree AND by parsing the blocking branch out of the source so
 * the disarmed `{continue:true, systemMessage:"warn"}` pattern that caused
 * the regression cannot reappear without this test failing.
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const HOOK_DIR = "H:/prism/.claude/hooks";
const STATE_DIR = "H:/prism/mcp-server/data/state";
const SHARED_DIR = "H:/prism/state/shared";

interface HookCase {
  hook: string;
  stateFile: string;
  triggerPayload: unknown;
  passPayload: unknown;
  expectedReasonSubstring: string;
}

const STATE_FILE_HOOKS: HookCase[] = [
  {
    hook: "stop_on_build_error.mjs",
    stateFile: `${STATE_DIR}/HEALTH_CHECK_REPORT.json`,
    triggerPayload: { tscErrors: 3, timestamp: Date.now() },
    passPayload: { tscErrors: 0, timestamp: Date.now() },
    expectedReasonSubstring: "3 TypeScript errors",
  },
  {
    hook: "stop_on_failing_tests.mjs",
    stateFile: `${STATE_DIR}/TEST_COVERAGE_INDEX.json`,
    triggerPayload: { failing: 2, timestamp: Date.now() },
    passPayload: { failing: 0, timestamp: Date.now() },
    expectedReasonSubstring: "2 tests failing",
  },
  {
    hook: "stop_on_svi_regression.mjs",
    stateFile: `${SHARED_DIR}/SVI_SESSION_DELTA.json`,
    triggerPayload: { delta: -1.5, psiDelta: -0.12 },
    passPayload: { delta: 0.01, psiDelta: 0.03 },
    expectedReasonSubstring: "SVI regression",
  },
  {
    hook: "stop_on_duplicate_created.mjs",
    stateFile: `${STATE_DIR}/dedup-violations.json`,
    triggerPayload: {
      violations: [{ name: "DupFoo", timestamp: Date.now() }],
    },
    passPayload: { violations: [] },
    expectedReasonSubstring: "1 duplicate assets created: DupFoo",
  },
  {
    hook: "stop_on_missing_tests.mjs",
    stateFile: `${STATE_DIR}/TEST_COVERAGE_INDEX.json`,
    triggerPayload: {
      uncoveredEngines: [{ name: "FooEngine", mtime: Date.now() }],
      failing: 0,
      timestamp: Date.now(),
    },
    passPayload: {
      uncoveredEngines: [],
      failing: 0,
      timestamp: Date.now(),
    },
    expectedReasonSubstring: "1 recent engines without tests: FooEngine",
  },
  {
    hook: "stop_on_orphan_engine.mjs",
    stateFile: `${STATE_DIR}/orphan-report.json`,
    triggerPayload: {
      timestamp: Date.now(),
      orphans: [{ type: "engine", name: "OrphanFoo", severity: "high" }],
    },
    passPayload: { timestamp: Date.now(), orphans: [] },
    expectedReasonSubstring: "1 orphan engines need wiring: OrphanFoo",
  },
  {
    hook: "stop_on_skill_unwired.mjs",
    stateFile: `${STATE_DIR}/orphan-report.json`,
    triggerPayload: {
      timestamp: Date.now(),
      orphans: [{ type: "skill", name: "orphan-skill" }],
    },
    passPayload: { timestamp: Date.now(), orphans: [] },
    expectedReasonSubstring: "1 skills without hook anchors: orphan-skill",
  },
];

const originals = new Map<string, string | null>();

function backup(filePath: string) {
  if (originals.has(filePath)) return;
  originals.set(filePath, fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null);
}

function restore(filePath: string) {
  const prior = originals.get(filePath);
  if (prior === undefined) return;
  if (prior === null) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } else {
    fs.writeFileSync(filePath, prior);
  }
}

function writeState(filePath: string, payload: unknown) {
  backup(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload));
}

function invokeHook(hookName: string): Record<string, unknown> {
  const hookPath = path.join(HOOK_DIR, hookName);
  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify({ session_id: "test" }),
    encoding: "utf8",
    timeout: 10_000,
  });
  if (result.error) throw result.error;
  const stdout = result.stdout.trim();
  if (!stdout) {
    throw new Error(`Hook ${hookName} produced no stdout. stderr=${result.stderr}`);
  }
  const lines = stdout.split("\n").filter((l) => l.trim().startsWith("{"));
  const last = lines[lines.length - 1] ?? stdout;
  return JSON.parse(last) as Record<string, unknown>;
}

describe("U-LSR23 — stop_on_* hooks emit blocking schema on trigger", () => {
  beforeAll(() => {
    const allPaths = new Set(STATE_FILE_HOOKS.map((h) => h.stateFile));
    for (const p of allPaths) backup(p);
  });

  afterAll(() => {
    for (const p of originals.keys()) restore(p);
  });

  describe.each(STATE_FILE_HOOKS)("$hook", (hookCase) => {
    it("trigger state ⇒ exact blocking payload {continue:false, stopReason:<concrete>}", () => {
      writeState(hookCase.stateFile, hookCase.triggerPayload);
      const out = invokeHook(hookCase.hook);
      expect(out).toEqual({
        continue: false,
        stopReason: expect.stringContaining(hookCase.expectedReasonSubstring),
      });
    });

    it("clean state ⇒ exact pass payload {continue:true, systemMessage:'pass'}", () => {
      writeState(hookCase.stateFile, hookCase.passPayload);
      const out = invokeHook(hookCase.hook);
      expect(out).toEqual({ continue: true, systemMessage: "pass" });
    });
  });

  describe("stop_on_broken_imports.mjs (git-driven — verified against live tree + source)", () => {
    const hookName = "stop_on_broken_imports.mjs";
    const body = fs.readFileSync(path.join(HOOK_DIR, hookName), "utf8");

    it("blocking branch source parses and emits {continue:false, stopReason:`N broken import(s)...`}", () => {
      const m = body.match(/if\s*\(\s*broken\.length\s*>\s*0\s*\)\s*\{([\s\S]*?)\}\s*else/);
      expect(m).not.toBeNull();
      const branch = m![1];
      expect(branch).toMatch(/continue:\s*false/);
      expect(branch).toMatch(/stopReason\s*:\s*`\$\{broken\.length\}\s+broken\s+import\(s\)/);
      expect(branch).not.toMatch(/continue:\s*true[\s\S]*systemMessage:\s*["']warn["']/);
    });

    it("live run against current repo returns exactly {continue:true, systemMessage:'pass'} (no broken imports)", () => {
      const out = invokeHook(hookName);
      expect(out).toEqual({ continue: true, systemMessage: "pass" });
    });

    it("catch-all `main().catch(...)` still returns continue:true so hook bugs never deadlock", () => {
      const match = body.match(/main\(\)\.catch\([\s\S]*?console\.log\(JSON\.stringify\(\{\s*continue:\s*true/);
      expect(match).not.toBeNull();
    });
  });

  describe("stop_on_unsafe_gcode.mjs (git-driven — verified against live tree + source)", () => {
    const hookName = "stop_on_unsafe_gcode.mjs";
    const body = fs.readFileSync(path.join(HOOK_DIR, hookName), "utf8");

    it("blocking branch source emits {continue:false, stopReason:`G-code safety: ...`}", () => {
      const m = body.match(/if\s*\(\s*issues\.length\s*>\s*0\s*\)\s*\{([\s\S]*?)\}\s*else/);
      expect(m).not.toBeNull();
      const branch = m![1];
      expect(branch).toMatch(/continue:\s*false/);
      expect(branch).toMatch(/stopReason\s*:\s*`G-code safety:/);
    });

    it("dangerous-pattern table catches all four canonical unsafe constructs", () => {
      expect(body).toMatch(/Rapid\s+into\s+negative\s+Z\s*>10mm/);
      expect(body).toMatch(/Feed\s+>10000\s+without\s+HSM/);
      expect(body).toMatch(/Spindle\s+>30000\s+RPM/);
      expect(body).toMatch(/Cut\s+immediately\s+after\s+spindle\s+start/);
    });

    it("live run returns exactly {continue:true, systemMessage:'pass'} when no safety log exists", () => {
      const out = invokeHook(hookName);
      expect(out).toEqual({ continue: true, systemMessage: "pass" });
    });
  });

  describe("stop_on_open_lock.mjs — intentionally NON-blocking (auto-release on exit)", () => {
    const hookName = "stop_on_open_lock.mjs";
    const body = fs.readFileSync(path.join(HOOK_DIR, hookName), "utf8");

    it("release branch returns continue:true with a 'Released' message, never a stopReason", () => {
      expect(body).toMatch(/Released\s+\$\{heldLocks\.length\}\s+session\s+locks/);
      const releaseBlock = body.match(/for\s*\(const\s+lock\s+of\s+heldLocks[\s\S]*?continue:\s*true[\s\S]*?message:\s*`Released/);
      expect(releaseBlock).not.toBeNull();
      // The ENTIRE hook source must contain zero `continue: false` — otherwise
      // someone has accidentally disarmed graceful exit.
      expect(body).not.toMatch(/continue:\s*false/);
    });

    it("live run with no held locks returns exactly {continue:true, systemMessage:'pass'}", () => {
      const out = invokeHook(hookName);
      expect(out).toEqual({ continue: true, systemMessage: "pass" });
    });
  });
});
