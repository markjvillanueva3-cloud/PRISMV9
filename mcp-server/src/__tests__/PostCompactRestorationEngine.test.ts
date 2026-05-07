/**
 * PostCompactRestorationEngine Tests — U-CTX04
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { PostCompactRestorationEngine } from "../engines/PostCompactRestorationEngine.js";
import type { PrecompactDossier } from "../schemas/precompactDossierSchema.js";

describe("PostCompactRestorationEngine", () => {
  let tempDir: string;
  let engine: PostCompactRestorationEngine;

  const createMockDossier = (overrides: Partial<PrecompactDossier> = {}): PrecompactDossier => ({
    schemaVersion: 1,
    sessionId: "test-session-123",
    capturedAt: new Date().toISOString(),
    tokenEstimate: 5000,
    mentalModel: {
      currentObjective: "Test objective",
      approachTaken: "Test approach",
      keyDecisions: ["Decision 1", "Decision 2"],
      openQuestions: ["Question 1"],
      blockers: [],
      nextSteps: ["Step 1", "Step 2"],
    },
    reasoningChains: [],
    openTodos: [
      { id: "1", text: "Complete task", status: "pending", createdAt: new Date().toISOString() },
    ],
    diffSummary: {
      filesChanged: 3,
      insertions: 100,
      deletions: 20,
      topFiles: [],
      uncommittedChanges: true,
    },
    liveClaims: [
      {
        claimId: "claim-1",
        track: "USSH-OPUS47-BOLSTER",
        milestone: "U-CTX04",
        claimedAt: new Date().toISOString(),
        sessionId: "test-session-123",
        status: "active",
      },
    ],
    recentToolOutcomes: [],
    contextUsage: {
      totalTokens: 150000,
      percentUsed: 75,
      largestSource: "system",
      largestSourceTokens: 100000,
    },
    identity: {
      family: "Agent",
      machine: "TEST-MACHINE",
      instance: "Agent@TEST/pid-1234",
      sessionKey: "pid-1234",
    },
    ...overrides,
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "postcompact-test-"));
    engine = new PostCompactRestorationEngine(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should detect missing dossier", () => {
    expect(engine.hasDossier()).toBe(false);
  });

  it("should load valid dossier", () => {
    const dossier = createMockDossier();
    fs.writeFileSync(
      path.join(tempDir, "PRECOMPACT_DOSSIER.json"),
      JSON.stringify(dossier)
    );

    expect(engine.hasDossier()).toBe(true);
    const loaded = engine.loadDossier();
    expect(loaded).not.toBeNull();
    expect(loaded?.sessionId).toBe("test-session-123");
  });

  it("should restore context from dossier", () => {
    const dossier = createMockDossier();
    fs.writeFileSync(
      path.join(tempDir, "PRECOMPACT_DOSSIER.json"),
      JSON.stringify(dossier)
    );

    const result = engine.restore();
    expect(result.success).toBe(true);
    expect(result.sessionId).toBe("test-session-123");
    expect(result.mentalModel?.currentObjective).toBe("Test objective");
    expect(result.activeClaims.length).toBe(1);
  });

  it("should generate recovery hints for uncommitted changes", () => {
    const dossier = createMockDossier({
      diffSummary: {
        filesChanged: 5,
        insertions: 200,
        deletions: 50,
        topFiles: [],
        uncommittedChanges: true,
      },
    });
    fs.writeFileSync(
      path.join(tempDir, "PRECOMPACT_DOSSIER.json"),
      JSON.stringify(dossier)
    );

    const result = engine.restore();
    expect(result.recoveryHints).toContain("5 uncommitted files");
  });

  it("should generate recovery hints for high context usage", () => {
    const dossier = createMockDossier({
      contextUsage: {
        totalTokens: 180000,
        percentUsed: 90,
        largestSource: "system",
        largestSourceTokens: 150000,
      },
    });
    fs.writeFileSync(
      path.join(tempDir, "PRECOMPACT_DOSSIER.json"),
      JSON.stringify(dossier)
    );

    const result = engine.restore();
    expect(result.recoveryHints.some((h) => h.includes(">85%"))).toBe(true);
  });

  it("should generate recovery hints for errors", () => {
    const dossier = createMockDossier({
      recentToolOutcomes: [
        {
          tool: "Bash",
          status: "error",
          summary: "Command failed",
          timestamp: new Date().toISOString(),
        },
        {
          tool: "Write",
          status: "error",
          summary: "File locked",
          timestamp: new Date().toISOString(),
        },
      ],
    });
    fs.writeFileSync(
      path.join(tempDir, "PRECOMPACT_DOSSIER.json"),
      JSON.stringify(dossier)
    );

    const result = engine.restore();
    expect(result.recoveryHints.some((h) => h.includes("2 recent errors"))).toBe(true);
  });

  it("should format context for injection", () => {
    const dossier = createMockDossier();
    fs.writeFileSync(
      path.join(tempDir, "PRECOMPACT_DOSSIER.json"),
      JSON.stringify(dossier)
    );

    const formatted = engine.formatForInjection();
    expect(formatted).toContain("Post-Compaction Context");
    expect(formatted).toContain("OBJECTIVE: Test objective");
    expect(formatted).toContain("APPROACH: Test approach");
    expect(formatted).toContain("CLAIMS: USSH-OPUS47-BOLSTER:U-CTX04");
  });

  it("should get summary without full restoration", () => {
    const dossier = createMockDossier({
      sviTrajectory: {
        currentPsi: 0.875,
        targetPsi: 1.0,
        velocity: 0.01,
        targets: [{ name: "coverage", weight: 0.3, current: 0.8, target: 1.0, gap: 0.2 }],
        lastUpdate: new Date().toISOString(),
      },
      banditState: {
        algorithm: "thompson",
        totalPulls: 100,
        topArm: "arm-A",
        explorationRate: 0.1,
        arms: [{ armId: "1", armName: "arm-A", alpha: 10, beta: 2, pulls: 50, meanReward: 0.8 }],
        lastUpdate: new Date().toISOString(),
      },
    });
    fs.writeFileSync(
      path.join(tempDir, "PRECOMPACT_DOSSIER.json"),
      JSON.stringify(dossier)
    );

    const summary = engine.getSummary();
    expect(summary.objective).toBe("Test objective");
    expect(summary.sviPsi).toBe(0.875);
    expect(summary.banditTopArm).toBe("arm-A");
  });

  it("should handle missing dossier gracefully", () => {
    const result = engine.restore();
    expect(result.success).toBe(false);
    expect(result.errors).toContain("No valid precompact dossier found");
  });

  it("should clear dossier after use", () => {
    const dossier = createMockDossier();
    fs.writeFileSync(
      path.join(tempDir, "PRECOMPACT_DOSSIER.json"),
      JSON.stringify(dossier)
    );

    expect(engine.hasDossier()).toBe(true);
    engine.clearDossier();
    expect(engine.hasDossier()).toBe(false);
  });

  it("should calculate token estimate", () => {
    const dossier = createMockDossier();
    fs.writeFileSync(
      path.join(tempDir, "PRECOMPACT_DOSSIER.json"),
      JSON.stringify(dossier)
    );

    const result = engine.restore();
    expect(result.tokenEstimate).toBeGreaterThan(100);
    expect(result.tokenEstimate).toBeLessThan(5000);
  });
});
