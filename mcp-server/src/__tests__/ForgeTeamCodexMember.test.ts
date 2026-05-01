/**
 * ForgeTeamCodexMember.test.ts — P2-U03
 *
 * Verifies the forge-team can be configured with a `codex_reviewer` member
 * alongside Claude reviewers, dispatches both providers in parallel, and
 * records BOTH review outputs to the arbitration log with provider tags.
 *
 * Critical assertion (envelope exit condition): given a known-buggy file
 * (intentional off-by-one in a loop), the test verifies that BOTH provider
 * records contain the same string-matched bug description — not just a
 * record-count check. This catches dual-family-disagreement regressions
 * that single-family loops would miss (per video RChO5deJ_fE).
 *
 * The arbitration-log helper is invoked via spawnSync (avoids the broken
 * dynamic-import-with-cachebust pattern on current vitest, same workaround
 * as P2-U02's CodexClaudeRoundTrip.test.ts). PRISM_ARBITRATION_LOG +
 * PRISM_ARB_HELPER_PATH are set per-test to a tmpdir so we never touch
 * shared state.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  MultiAgentAIInterfaceEngine,
  type ForgeTeamConfig,
  type Finding,
  type ProviderHandlers,
  type ReviewRecord,
  type ReviewTarget,
  type ReviewerMember,
} from "../engines/MultiAgentAIInterfaceEngine.js";

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const TEST_TIMEOUT_MS = 15_000;
const FORGE_REVIEW_KIND = "forge-review";
const EXPECTED_DUAL_RECORD_COUNT = 2;
const FAST_REVIEW_DURATION_MS = 25;
const REPO_ROOT = resolve(__dirname, "../../..");
const ARB_HELPER_PATH = resolve(REPO_ROOT, ".claude/helpers/arbitration-log.mjs");

// Known-buggy code fixture: intentional off-by-one in loop bound (`i <= n.length`
// instead of `i < n.length`). Both reviewers must flag this.
const KNOWN_BUGGY_FILE_PATH = "src/fixtures/buggy-loop.ts";
const KNOWN_BUGGY_FILE_CONTENT = `
function sumArray(n: number[]): number {
  let total = 0;
  for (let i = 0; i <= n.length; i += 1) {  // BUG: off-by-one (use strict less-than)
    total += n[i];
  }
  return total;
}
`.trim();
const BUG_DESCRIPTION_SUBSTRING = "off-by-one";
const BUG_LINE_NUMBER = 3;

// ----------------------------------------------------------------------------
// Per-test scratch state
// ----------------------------------------------------------------------------
let scratchRoot: string;
let logPath: string;

beforeEach(() => {
  scratchRoot = mkdtempSync(join(tmpdir(), "prism-forge-team-"));
  logPath = join(scratchRoot, "AGENT_CONFLICT_ARBITRATION.json");
  process.env.PRISM_ARBITRATION_LOG = logPath;
  process.env.PRISM_ARB_HELPER_PATH = ARB_HELPER_PATH;
});

afterEach(() => {
  delete process.env.PRISM_ARBITRATION_LOG;
  delete process.env.PRISM_ARB_HELPER_PATH;
  try {
    rmSync(scratchRoot, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
interface ArbitrationLogFile {
  events: Array<{
    ts: string;
    kind: string;
    sessionId: string;
    details: Record<string, unknown>;
  }>;
}

function readForgeReviewEvents(sessionId: string): ArbitrationLogFile["events"] {
  let raw: string;
  try {
    raw = readFileSync(logPath, "utf-8");
  } catch {
    return [];
  }
  const log = JSON.parse(raw) as ArbitrationLogFile;
  return log.events.filter((e) => e.sessionId === sessionId && e.kind === FORGE_REVIEW_KIND);
}

/** Stub provider that emits the off-by-one finding for both providers. */
function makeStubProviders(includeBugFinding: boolean = true): ProviderHandlers {
  function makeRecord(provider: "claude" | "codex", m: ReviewerMember, _t: ReviewTarget): ReviewRecord {
    const findings: Finding[] = includeBugFinding
      ? [
          {
            severity: "CRITICAL",
            message: `${BUG_DESCRIPTION_SUBSTRING} in loop bound at line ${BUG_LINE_NUMBER}: 'i <= n.length' should be 'i < n.length'`,
            line: BUG_LINE_NUMBER,
            filePath: KNOWN_BUGGY_FILE_PATH,
          },
        ]
      : [];
    return {
      provider,
      reviewerName: m.name,
      verdict: includeBugFinding ? "BLOCK" : "PASS",
      findings,
      rawOutput: includeBugFinding
        ? `CRITICAL: ${BUG_DESCRIPTION_SUBSTRING} in loop bound at line ${BUG_LINE_NUMBER}\nVerdict: BLOCK`
        : "Verdict: PASS",
      durationMs: FAST_REVIEW_DURATION_MS,
      recordedAt: new Date().toISOString(),
    };
  }
  return {
    claude: async (m, t) => makeRecord("claude", m, t),
    codex: async (m, t) => makeRecord("codex", m, t),
  };
}

function buildDualConfig(sessionId: string): ForgeTeamConfig {
  return {
    brief: "Review buggy-loop.ts for correctness.",
    reviewers: [
      { name: "physics-reviewer", provider: "claude", subagent_type: "reviewer" },
      { name: "codex-prod", provider: "codex", tier: "production" },
    ],
    sessionId,
  };
}

function buildDualTarget(): ReviewTarget {
  return {
    filePath: KNOWN_BUGGY_FILE_PATH,
    fileContent: KNOWN_BUGGY_FILE_CONTENT,
    brief: "Find any correctness bugs in this loop.",
  };
}

// ----------------------------------------------------------------------------
// validateConfig — surface contract
// ----------------------------------------------------------------------------
describe("MultiAgentAIInterfaceEngine.validateConfig", () => {
  it("rejects empty brief", () => {
    const v = MultiAgentAIInterfaceEngine.validateConfig({ brief: "", reviewers: [{ name: "x", provider: "codex", tier: "production" }] });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /brief/iu.test(e))).toBe(true);
  });

  it("rejects empty reviewers array", () => {
    const v = MultiAgentAIInterfaceEngine.validateConfig({ brief: "x", reviewers: [] });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /reviewers/iu.test(e))).toBe(true);
  });

  it("rejects codex reviewer missing tier", () => {
    const v = MultiAgentAIInterfaceEngine.validateConfig({
      brief: "x",
      reviewers: [{ name: "codex-x", provider: "codex" }],
    });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /tier/iu.test(e))).toBe(true);
  });

  it("rejects claude reviewer missing subagent_type", () => {
    const v = MultiAgentAIInterfaceEngine.validateConfig({
      brief: "x",
      reviewers: [{ name: "claude-x", provider: "claude" }],
    });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /subagent_type/iu.test(e))).toBe(true);
  });

  it("accepts a dual-provider config (1 claude + 1 codex)", () => {
    const cfg = buildDualConfig("test-validate-dual");
    const v = MultiAgentAIInterfaceEngine.validateConfig(cfg);
    expect(v.ok).toBe(true);
    expect(v.errors.length).toBe(0);
  });

  it("rejects unknown provider name", () => {
    // Cast through unknown so we can simulate a runtime config with a bogus value.
    const v = MultiAgentAIInterfaceEngine.validateConfig({
      brief: "x",
      reviewers: [{ name: "rogue", provider: "anthropic" as unknown as "claude" }],
    });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /provider/iu.test(e))).toBe(true);
  });

  it("collects errors across multiple bad reviewers (not stop-at-first)", () => {
    const v = MultiAgentAIInterfaceEngine.validateConfig({
      brief: "x",
      reviewers: [
        { name: "", provider: "claude" },
        { name: "y", provider: "codex" },
      ],
    });
    expect(v.ok).toBe(false);
    // 3 errors expected: reviewer[0] missing name, reviewer[0] missing subagent_type, reviewer[1] missing tier
    expect(v.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ----------------------------------------------------------------------------
// dispatchReviewers — happy path + envelope assertion
// ----------------------------------------------------------------------------
describe("MultiAgentAIInterfaceEngine.dispatchReviewers — dual-family review", () => {
  it(
    "dispatches Codex AND Claude reviewers in parallel and BOTH records contain the off-by-one bug description",
    async () => {
      const sessionId = "ft-dual-bug-001";
      const cfg = buildDualConfig(sessionId);
      const target = buildDualTarget();
      const providers = makeStubProviders(true);

      const records = await MultiAgentAIInterfaceEngine.dispatchReviewers(cfg, target, providers);

      // Returned in same order as cfg.reviewers (claude first, codex second).
      expect(records.length).toBe(EXPECTED_DUAL_RECORD_COUNT);
      expect(records[0].provider).toBe("claude");
      expect(records[1].provider).toBe("codex");

      // Both records flag the same bug (string-match per envelope exit condition).
      for (const rec of records) {
        const hasFindingMatch = rec.findings.some((f) =>
          f.message.toLowerCase().includes(BUG_DESCRIPTION_SUBSTRING),
        );
        const hasRawOutputMatch = rec.rawOutput.toLowerCase().includes(BUG_DESCRIPTION_SUBSTRING);
        expect(hasFindingMatch || hasRawOutputMatch).toBe(true);
        expect(rec.verdict).toBe("BLOCK");
      }

      // Arbitration ledger contains exactly two forge-review entries — one per provider.
      const events = readForgeReviewEvents(sessionId);
      expect(events.length).toBe(EXPECTED_DUAL_RECORD_COUNT);
      const providers_recorded = events.map((e) => (e.details as { provider: string }).provider).sort();
      expect(providers_recorded).toEqual(["claude", "codex"]);

      // Each ledger entry's findings substring-match the bug.
      for (const e of events) {
        const findings = (e.details as { findings: Array<{ message: string }> }).findings;
        const matched = findings.some((f) => f.message.toLowerCase().includes(BUG_DESCRIPTION_SUBSTRING));
        expect(matched).toBe(true);
      }
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "records ledger entries even when only one reviewer flags the bug (no-symmetry false-positive)",
    async () => {
      const sessionId = "ft-asymmetric-bug-001";
      const cfg = buildDualConfig(sessionId);
      const target = buildDualTarget();
      // Inject providers where Codex finds the bug but Claude misses it.
      const providers: ProviderHandlers = {
        claude: async (m) => ({
          provider: "claude",
          reviewerName: m.name,
          verdict: "PASS",
          findings: [],
          rawOutput: "Verdict: PASS — looks fine to me",
          durationMs: FAST_REVIEW_DURATION_MS,
          recordedAt: new Date().toISOString(),
        }),
        codex: async (m) => ({
          provider: "codex",
          reviewerName: m.name,
          verdict: "BLOCK",
          findings: [
            {
              severity: "CRITICAL",
              message: `${BUG_DESCRIPTION_SUBSTRING} in loop bound`,
              line: BUG_LINE_NUMBER,
            },
          ],
          rawOutput: `CRITICAL: ${BUG_DESCRIPTION_SUBSTRING} in loop bound`,
          durationMs: FAST_REVIEW_DURATION_MS,
          recordedAt: new Date().toISOString(),
        }),
      };

      const records = await MultiAgentAIInterfaceEngine.dispatchReviewers(cfg, target, providers);
      expect(records.length).toBe(EXPECTED_DUAL_RECORD_COUNT);
      expect(records.find((r) => r.provider === "claude")?.verdict).toBe("PASS");
      expect(records.find((r) => r.provider === "codex")?.verdict).toBe("BLOCK");

      // Both still recorded in ledger — disagreement is auditable.
      const events = readForgeReviewEvents(sessionId);
      expect(events.length).toBe(EXPECTED_DUAL_RECORD_COUNT);
      const verdicts = events.map((e) => (e.details as { verdict: string }).verdict).sort();
      expect(verdicts).toEqual(["BLOCK", "PASS"]);
    },
    TEST_TIMEOUT_MS,
  );

  it("runs reviewers in parallel (total wall-clock ≈ slowest, not sum)", async () => {
    const sessionId = "ft-parallel-timing-001";
    const cfg = buildDualConfig(sessionId);
    const target = buildDualTarget();
    const SLOW_DELAY_MS = 200;
    const providers: ProviderHandlers = {
      claude: async (m) => {
        await new Promise((r) => setTimeout(r, SLOW_DELAY_MS));
        return {
          provider: "claude",
          reviewerName: m.name,
          verdict: "PASS",
          findings: [],
          rawOutput: "",
          durationMs: SLOW_DELAY_MS,
          recordedAt: new Date().toISOString(),
        };
      },
      codex: async (m) => {
        await new Promise((r) => setTimeout(r, SLOW_DELAY_MS));
        return {
          provider: "codex",
          reviewerName: m.name,
          verdict: "PASS",
          findings: [],
          rawOutput: "",
          durationMs: SLOW_DELAY_MS,
          recordedAt: new Date().toISOString(),
        };
      },
    };
    const start = Date.now();
    await MultiAgentAIInterfaceEngine.dispatchReviewers(cfg, target, providers);
    const elapsed = Date.now() - start;
    // Parallel: ≈SLOW_DELAY_MS; serial would be ≥2*SLOW_DELAY_MS.
    // Allow generous margin for spawnSync overhead on Windows.
    expect(elapsed).toBeLessThan(SLOW_DELAY_MS * 2);
  }, TEST_TIMEOUT_MS);

  it("rejects dispatch when config is invalid", async () => {
    const cfg: ForgeTeamConfig = { brief: "", reviewers: [] };
    const providers = makeStubProviders();
    await expect(
      MultiAgentAIInterfaceEngine.dispatchReviewers(cfg, buildDualTarget(), providers),
    ).rejects.toThrow(/invalid forge-team config/iu);
  });

  it("rejects dispatch when providers is missing claude or codex handler", async () => {
    const cfg = buildDualConfig("ft-missing-providers");
    const target = buildDualTarget();
    // Intentionally invalid handler shape.
    const badProviders = { claude: undefined as never, codex: undefined as never };
    await expect(
      MultiAgentAIInterfaceEngine.dispatchReviewers(cfg, target, badProviders),
    ).rejects.toThrow(/providers\.claude.*providers\.codex/iu);
  });
});

// ----------------------------------------------------------------------------
// recordReview — direct ledger write
// ----------------------------------------------------------------------------
describe("MultiAgentAIInterfaceEngine.recordReview — direct ledger write", () => {
  it("appends a single record with provider tag and findings preserved verbatim", () => {
    const rec: ReviewRecord = {
      provider: "codex",
      reviewerName: "codex-test",
      verdict: "BLOCK",
      findings: [{ severity: "CRITICAL", message: "test finding 42", line: 7 }],
      rawOutput: "CRITICAL: test finding 42 at line 7",
      durationMs: 100,
      recordedAt: new Date().toISOString(),
    };
    const ok = MultiAgentAIInterfaceEngine.recordReview(rec, "rr-direct-001");
    expect(ok).toBe(true);
    const events = readForgeReviewEvents("rr-direct-001");
    expect(events.length).toBe(1);
    const details = events[0].details as { provider: string; findings: Array<{ message: string; line: number }> };
    expect(details.provider).toBe("codex");
    expect(details.findings.length).toBe(1);
    expect(details.findings[0].message).toBe("test finding 42");
    expect(details.findings[0].line).toBe(7);
  });

  it("truncates rawOutput preview when over 500 bytes", () => {
    const long = "X".repeat(600);
    const rec: ReviewRecord = {
      provider: "claude",
      reviewerName: "claude-test",
      verdict: "PASS",
      findings: [],
      rawOutput: long,
      durationMs: 50,
      recordedAt: new Date().toISOString(),
    };
    MultiAgentAIInterfaceEngine.recordReview(rec, "rr-truncate-001");
    const events = readForgeReviewEvents("rr-truncate-001");
    expect(events.length).toBe(1);
    const preview = (events[0].details as { rawOutputPreview: string }).rawOutputPreview;
    expect(preview.length).toBe(500);
    expect(preview).toBe("X".repeat(500));
  });

  it("isolates session ids — entries from different sessions don't cross-contaminate", () => {
    const a: ReviewRecord = {
      provider: "claude", reviewerName: "a", verdict: "PASS",
      findings: [], rawOutput: "", durationMs: 1, recordedAt: new Date().toISOString(),
    };
    const b: ReviewRecord = { ...a, provider: "codex" };
    MultiAgentAIInterfaceEngine.recordReview(a, "session-A");
    MultiAgentAIInterfaceEngine.recordReview(b, "session-B");
    expect(readForgeReviewEvents("session-A").length).toBe(1);
    expect(readForgeReviewEvents("session-B").length).toBe(1);
    expect((readForgeReviewEvents("session-A")[0].details as { provider: string }).provider).toBe("claude");
    expect((readForgeReviewEvents("session-B")[0].details as { provider: string }).provider).toBe("codex");
  });
});

// ----------------------------------------------------------------------------
// defaultClaudeHandler — placeholder must throw loudly
// ----------------------------------------------------------------------------
describe("MultiAgentAIInterfaceEngine.defaultClaudeHandler", () => {
  it("throws with a descriptive error so callers know to inject a real handler", async () => {
    const m: ReviewerMember = { name: "test", provider: "claude", subagent_type: "reviewer" };
    const t: ReviewTarget = { filePath: "x", brief: "y" };
    await expect(MultiAgentAIInterfaceEngine.defaultClaudeHandler(m, t)).rejects.toThrow(/placeholder/iu);
  });
});

// ----------------------------------------------------------------------------
// File-fixture sanity — known-buggy file actually contains the off-by-one
// ----------------------------------------------------------------------------
describe("known-buggy fixture sanity", () => {
  it("the test fixture has the off-by-one bug we expect reviewers to find", () => {
    expect(KNOWN_BUGGY_FILE_CONTENT.includes("i <= n.length")).toBe(true);
    expect(KNOWN_BUGGY_FILE_CONTENT.includes("i < n.length")).toBe(false);
  });

  it("can write fixture to disk for filesystem-based reviewers", () => {
    const fp = join(scratchRoot, "buggy-loop.ts");
    writeFileSync(fp, KNOWN_BUGGY_FILE_CONTENT, "utf-8");
    const back = readFileSync(fp, "utf-8");
    expect(back).toBe(KNOWN_BUGGY_FILE_CONTENT);
  });
});
