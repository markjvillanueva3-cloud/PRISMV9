/**
 * QA-REGRESSION-WIRE-MS0/U-REGRESSION-BASELINE-WIRE — dispatcher wiring tests
 *
 * Round-trips the orphaned RegressionBaselineEngine (built+tested as
 * U-LPR-REGRESSION-BASELINE QA B2, never previously consumed) through the
 * `prism_dev` MCP tool's handler via a fake server that captures the
 * registered handler closure. Per the wire-scrutiny rule, source-grep is NOT
 * proof: the handler must demonstrably accept the action, decode params, drive
 * the engine, and return the canonical {success, data} envelope.
 *
 * Isolation: every test points PRISM_REGRESSION_BASELINE_PATH at a tmp file and
 * clearAll()s the process-wide singleton, so neither the real project snapshot
 * nor a sibling test is touched.
 */

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const SHA_A = "a".repeat(64); // valid 64-hex expected/observed hash
const SHA_B = "b".repeat(64); // a DIFFERENT valid 64-hex (RESULT_DIFF fixture)

const ownedDirs = new Set<string>();
let snapPath = "";

function makeFixtureDir(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `prism-regbase-${label}-${process.pid}-`));
  ownedDirs.add(dir);
  return dir;
}

beforeEach(async () => {
  const dir = makeFixtureDir("snap");
  snapPath = path.join(dir, "TEST_REGRESSION_BASELINE.json");
  process.env.PRISM_REGRESSION_BASELINE_PATH = snapPath;
  // Reset the process-wide singleton so each test starts from an empty baseline.
  const { regressionBaselineEngine } = await import("../engines/RegressionBaselineEngine.js");
  regressionBaselineEngine.clearAll();
});

afterEach(async () => {
  const { regressionBaselineEngine } = await import("../engines/RegressionBaselineEngine.js");
  regressionBaselineEngine.clearAll();
  delete process.env.PRISM_REGRESSION_BASELINE_PATH;
  for (const dir of ownedDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  ownedDirs.clear();
});

type RegisteredTool = {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

function makeFakeServer(): { server: { tool: (...args: unknown[]) => void }; tools: RegisteredTool[] } {
  const tools: RegisteredTool[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      tools.push({ name: args[0] as string, handler: args[3] as RegisteredTool["handler"] });
    },
  };
  return { server, tools };
}

async function buildPrismDevHandler(): Promise<RegisteredTool["handler"]> {
  const { server, tools } = makeFakeServer();
  const { registerDevDispatcher } = await import("../tools/dispatchers/devDispatcher.js");
  registerDevDispatcher(server as never);
  const dev = tools.find((t) => t.name === "prism_dev");
  if (!dev) throw new Error("registerDevDispatcher did not register a tool named 'prism_dev'");
  return dev.handler;
}

function parsePayload(response: { content: Array<{ type: string; text: string }> }): Record<string, any> {
  const text = response.content?.[0]?.text ?? "";
  return JSON.parse(text);
}

/** Freeze a single-test baseline through the dispatcher; returns the parsed body. */
async function freezeOne(
  handler: RegisteredTool["handler"],
  over: Partial<{ test_id: string; expected_result_sha256: string; baseline_p95_ms: number; sample_count: number; frozen_at: number }> = {},
) {
  return parsePayload(await handler({
    action: "regression_baseline",
    params: {
      mode: "freeze",
      frozen_by: "zulu-wire-test",
      entries: [{
        test_id: over.test_id ?? "t.alpha",
        expected_result_sha256: over.expected_result_sha256 ?? SHA_A,
        baseline_p95_ms: over.baseline_p95_ms ?? 100,
        sample_count: over.sample_count ?? 30,
        frozen_at: over.frozen_at ?? 1_700_000_000_000,
        frozen_by: "ignored-overwritten-by-engine",
      }],
    },
  }));
}

describe("prism_dev:regression_baseline — freeze + list", () => {
  it("freezes a baseline through the dispatcher and reads it back via list", async () => {
    const handler = await buildPrismDevHandler();
    const fz = await freezeOne(handler);
    expect(fz.success).toBe(true);
    expect(fz.data.frozen).toBe(1);

    const ls = parsePayload(await handler({ action: "regression_baseline", params: { mode: "list" } }));
    expect(ls.success).toBe(true);
    expect(ls.data.baseline).toHaveLength(1);
    expect(ls.data.baseline[0].test_id).toBe("t.alpha");
    // engine lowercases + stamps frozen_by from the freeze() arg, not the entry field
    expect(ls.data.baseline[0].frozen_by).toBe("zulu-wire-test");
    // empty quarantine array is stripped by the dispatcher response slimmer -> absent
    expect(ls.data.quarantine ?? []).toHaveLength(0);
  });

  it("persists a durable snapshot to the env-pointed path on freeze", async () => {
    const handler = await buildPrismDevHandler();
    await freezeOne(handler);
    expect(fs.existsSync(snapPath)).toBe(true);
    const snap = JSON.parse(fs.readFileSync(snapPath, "utf-8"));
    expect(snap.schemaVersion).toBe(1);
    expect(snap.baseline[0].test_id).toBe("t.alpha");
  });

  it("rejects a bad (non-64-hex) sha256 with a fail-loud structured error", async () => {
    const handler = await buildPrismDevHandler();
    const fz = await freezeOne(handler, { expected_result_sha256: "not-a-hash" });
    expect(fz.success).toBe(false);
    expect(fz.error).toBe("regression_baseline_failed");
    expect(String(fz.detail)).toMatch(/64-hex/);
  });
});

describe("prism_dev:regression_baseline — evaluate (CI diff-gate)", () => {
  it("passes a clean run (matching hash, within timing budget)", async () => {
    const handler = await buildPrismDevHandler();
    await freezeOne(handler);
    const ev = parsePayload(await handler({
      action: "regression_baseline",
      params: { mode: "evaluate", runs: [{ test_id: "t.alpha", result_sha256: SHA_A, duration_ms: 90, passed: true, run_at: 1 }] },
    }));
    expect(ev.success).toBe(true);
    expect(ev.data.report.passed).toBe(true);
    // empty breach arrays are stripped by the response slimmer -> assert via ?? []
    expect(ev.data.report.hard_breaches ?? []).toHaveLength(0);
    expect(ev.data.report.runs_evaluated).toBe(1);
  });

  it("flags a RESULT_DIFF as a HARD breach when the output hash changes", async () => {
    const handler = await buildPrismDevHandler();
    await freezeOne(handler);
    const ev = parsePayload(await handler({
      action: "regression_baseline",
      params: { mode: "evaluate", runs: [{ test_id: "t.alpha", result_sha256: SHA_B, duration_ms: 90, passed: true, run_at: 1 }] },
    }));
    expect(ev.data.report.passed).toBe(false);
    expect(ev.data.report.hard_breaches).toHaveLength(1);
    expect(ev.data.report.hard_breaches[0].kind).toBe("RESULT_DIFF");
  });

  it("flags a TIMING_REGRESS as SOFT within 2x budget (passed stays true)", async () => {
    const handler = await buildPrismDevHandler();
    await freezeOne(handler); // baseline_p95_ms=100 -> soft cap 120, hard cap 140
    const ev = parsePayload(await handler({
      action: "regression_baseline",
      params: { mode: "evaluate", runs: [{ test_id: "t.alpha", result_sha256: SHA_A, duration_ms: 130, passed: true, run_at: 1 }] },
    }));
    expect(ev.data.report.passed).toBe(true);
    expect(ev.data.report.hard_breaches ?? []).toHaveLength(0);
    expect(ev.data.report.soft_breaches.some((b: any) => b.kind === "TIMING_REGRESS")).toBe(true);
  });

  it("reports a brand-new test (not in baseline) under new_tests, not a breach", async () => {
    const handler = await buildPrismDevHandler();
    await freezeOne(handler);
    const ev = parsePayload(await handler({
      action: "regression_baseline",
      params: { mode: "evaluate", runs: [{ test_id: "t.brand_new", result_sha256: SHA_A, duration_ms: 10, passed: true, run_at: 1 }] },
    }));
    expect(ev.data.report.new_tests).toContain("t.brand_new");
    expect(ev.data.report.missing_tests).toContain("t.alpha"); // in baseline, not in run
  });
});

describe("prism_dev:regression_baseline — quarantine lifecycle", () => {
  it("quarantine SUPPRESSES a RESULT_DIFF from hard to soft (merge unblocked)", async () => {
    const handler = await buildPrismDevHandler();
    await freezeOne(handler);
    const q = parsePayload(await handler({
      action: "regression_baseline",
      params: { mode: "quarantine", test_id: "t.alpha", reason: "known-flaky upstream API, ticket JIRA-123", filed_by: "zulu", filed_at: 1 },
    }));
    expect(q.success).toBe(true);
    expect(q.data.quarantined.test_id).toBe("t.alpha");

    const ev = parsePayload(await handler({
      action: "regression_baseline",
      params: { mode: "evaluate", runs: [{ test_id: "t.alpha", result_sha256: SHA_B, duration_ms: 90, passed: true, run_at: 2 }] },
    }));
    expect(ev.data.report.passed).toBe(true); // hard suppressed
    expect(ev.data.report.soft_breaches.some((b: any) => b.kind === "RESULT_DIFF")).toBe(true);
  });

  it("rejects a too-short quarantine reason (<20 chars) fail-loud", async () => {
    const handler = await buildPrismDevHandler();
    await freezeOne(handler);
    const q = parsePayload(await handler({
      action: "regression_baseline",
      params: { mode: "quarantine", test_id: "t.alpha", reason: "flaky", filed_by: "zulu", filed_at: 1 },
    }));
    expect(q.success).toBe(false);
    expect(q.error).toBe("regression_baseline_failed");
    expect(String(q.detail)).toMatch(/reason/);
  });

  it("lift removes the quarantine so the breach is hard again", async () => {
    const handler = await buildPrismDevHandler();
    await freezeOne(handler);
    await handler({ action: "regression_baseline", params: { mode: "quarantine", test_id: "t.alpha", reason: "temporary triage hold, ticket OPS-9", filed_by: "zulu", filed_at: 1 } });
    const lift = parsePayload(await handler({ action: "regression_baseline", params: { mode: "lift", test_id: "t.alpha" } }));
    expect(lift.success).toBe(true);
    expect(lift.data.lifted).toBe(true);

    const ev = parsePayload(await handler({
      action: "regression_baseline",
      params: { mode: "evaluate", runs: [{ test_id: "t.alpha", result_sha256: SHA_B, duration_ms: 90, passed: true, run_at: 3 }] },
    }));
    expect(ev.data.report.passed).toBe(false); // hard breach back
  });
});

describe("prism_dev:regression_baseline — observed_p95 + snapshot + invalid mode", () => {
  it("observed_p95 is null before runs, a number after runs are recorded via evaluate", async () => {
    const handler = await buildPrismDevHandler();
    await freezeOne(handler);
    const before = parsePayload(await handler({ action: "regression_baseline", params: { mode: "observed_p95", test_id: "t.alpha" } }));
    // null p95 (no runs yet) is stripped by the response slimmer -> absent
    expect(before.data.observed_p95_ms ?? null).toBeNull();

    await handler({ action: "regression_baseline", params: { mode: "evaluate", runs: [{ test_id: "t.alpha", result_sha256: SHA_A, duration_ms: 88, passed: true, run_at: 1 }] } });
    const after = parsePayload(await handler({ action: "regression_baseline", params: { mode: "observed_p95", test_id: "t.alpha" } }));
    expect(typeof after.data.observed_p95_ms).toBe("number");
    expect(after.data.observed_p95_ms).toBe(88);
  });

  it("snapshot returns the engine snapshot shape + the resolved path", async () => {
    const handler = await buildPrismDevHandler();
    await freezeOne(handler);
    const snap = parsePayload(await handler({ action: "regression_baseline", params: { mode: "snapshot" } }));
    expect(snap.success).toBe(true);
    expect(snap.data.snapshot.schemaVersion).toBe(1);
    expect(snap.data.snapshot.baseline[0].test_id).toBe("t.alpha");
    expect(snap.data.path).toBe(snapPath);
  });

  it("rejects an unknown mode with the allowed-mode list (adversarial)", async () => {
    const handler = await buildPrismDevHandler();
    const bad = parsePayload(await handler({ action: "regression_baseline", params: { mode: "DROP TABLE" } }));
    expect(bad.success).toBe(false);
    expect(bad.error).toBe("invalid_mode");
    expect(bad.allowed).toContain("freeze");
    expect(bad.allowed).toContain("evaluate");
  });

  it("defaults to list mode when no mode is supplied", async () => {
    const handler = await buildPrismDevHandler();
    const out = parsePayload(await handler({ action: "regression_baseline", params: {} }));
    expect(out.success).toBe(true);
    expect(out.data.mode).toBe("list");
    // empty baseline array is stripped by the response slimmer -> absent
    expect(out.data.baseline ?? []).toHaveLength(0);
  });
});
