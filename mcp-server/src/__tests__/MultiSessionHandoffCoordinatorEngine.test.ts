/**
 * MultiSessionHandoffCoordinatorEngine Tests — U-CTX05
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { MultiSessionHandoffCoordinatorEngine } from "../engines/MultiSessionHandoffCoordinatorEngine.js";

describe("MultiSessionHandoffCoordinatorEngine", () => {
  let tempDir: string;
  let engine: MultiSessionHandoffCoordinatorEngine;

  const createHandoffFile = (
    name: string,
    content: string,
    ageMinutes: number = 0
  ): void => {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, content);
    if (ageMinutes > 0) {
      const mtime = new Date(Date.now() - ageMinutes * 60 * 1000);
      fs.utimesSync(filePath, mtime, mtime);
    }
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-test-"));
    engine = new MultiSessionHandoffCoordinatorEngine(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should find no handoff files in empty directory", () => {
    const files = engine.findHandoffFiles();
    expect(files).toHaveLength(0);
  });

  it("should find handoff files", () => {
    createHandoffFile("HANDOFF-session-1.md", "# Handoff\nFamily: Agent");
    createHandoffFile("HANDOFF-session-2.md", "# Handoff\nFamily: Agent");
    createHandoffFile("other-file.md", "# Not a handoff");

    const files = engine.findHandoffFiles();
    expect(files).toHaveLength(2);
  });

  it("should parse handoff markdown", () => {
    const content = `# Session Handoff
Family: Agent
Machine: DESKTOP-TEST
Instance: Agent@TEST/pid-1234

## Open Goals
- Complete U-CTX05
- Wire dispatcher

## Next Actions
- Run tests
- Commit changes
`;
    createHandoffFile("HANDOFF-test-session.md", content);

    const files = engine.findHandoffFiles();
    const snapshot = engine.parseHandoffMd(files[0]);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.family).toBe("Agent");
    expect(snapshot?.machine).toBe("DESKTOP-TEST");
    expect(snapshot?.openGoals).toHaveLength(2);
    expect(snapshot?.nextActions).toHaveLength(2);
    expect(snapshot?.status).toBe("active");
  });

  it("should mark old sessions as stale", () => {
    createHandoffFile(
      "HANDOFF-stale-session.md",
      "# Handoff\nFamily: Agent",
      45 // 45 minutes old
    );

    const sessions = engine.loadAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toBe("stale");
  });

  it("should detect claim conflicts", () => {
    createHandoffFile(
      "HANDOFF-session-1.md",
      "# Handoff\nFamily: Agent\nClaims: USSH-OPUS47-BOLSTER, P2P-FULLSTACK"
    );
    createHandoffFile(
      "HANDOFF-session-2.md",
      "# Handoff\nFamily: Agent\nClaims: USSH-OPUS47-BOLSTER"
    );

    const sessions = engine.loadAllSessions();
    const conflicts = engine.detectConflicts(sessions);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].track).toBe("USSH-OPUS47-BOLSTER");
    expect(conflicts[0].sessions).toHaveLength(2);
  });

  it("should merge work queues without duplicates", () => {
    createHandoffFile(
      "HANDOFF-session-1.md",
      `# Handoff
Family: Agent
## Open Goals
- Complete task A
- Complete task B
## Next Actions
- Run tests
`
    );
    createHandoffFile(
      "HANDOFF-session-2.md",
      `# Handoff
Family: Agent
## Open Goals
- Complete task A
- Complete task C
## Next Actions
- Run tests
- Deploy
`
    );

    const sessions = engine.loadAllSessions();
    const merged = engine.mergeWorkQueues(sessions);

    // Should deduplicate "Complete task A" and "Run tests"
    expect(merged.pendingGoals.length).toBeLessThanOrEqual(3);
    expect(merged.nextActions.length).toBeLessThanOrEqual(2);
  });

  it("should coordinate and generate recommendations", () => {
    createHandoffFile(
      "HANDOFF-session-1.md",
      "# Handoff\nFamily: Agent\nClaims: TRACK-A"
    );
    createHandoffFile(
      "HANDOFF-stale.md",
      "# Handoff\nFamily: Agent",
      60 // 1 hour old
    );

    const result = engine.coordinate();

    expect(result.success).toBe(true);
    expect(result.workQueue.totalSessions).toBe(2);
    expect(result.workQueue.staleSessions).toBe(1);
    expect(result.recommendations.some((r) => r.includes("stale"))).toBe(true);
  });

  it("should format for injection", () => {
    createHandoffFile(
      "HANDOFF-session-1.md",
      `# Handoff
Family: Agent
Claims: USSH-OPUS47-BOLSTER
## Next Actions
- Run tests
## Open Goals
- Complete feature
`
    );

    const formatted = engine.formatForInjection();

    expect(formatted).toContain("Multi-Session Handoff");
    expect(formatted).toContain("Sessions:");
    expect(formatted).toContain("tokens]");
  });

  it("should cleanup stale sessions", () => {
    createHandoffFile("HANDOFF-fresh.md", "# Handoff", 5);
    createHandoffFile("HANDOFF-stale-1.md", "# Handoff", 60);
    createHandoffFile("HANDOFF-stale-2.md", "# Handoff", 90);

    const cleaned = engine.cleanupStaleSessions(30 * 60 * 1000);

    expect(cleaned).toBe(2);
    expect(engine.findHandoffFiles()).toHaveLength(1);
  });

  it("should handle empty coordination gracefully", () => {
    const result = engine.coordinate();

    expect(result.success).toBe(true);
    expect(result.workQueue.totalSessions).toBe(0);
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("should sort sessions by last active time", () => {
    createHandoffFile("HANDOFF-old.md", "# Handoff\nFamily: Agent", 20);
    createHandoffFile("HANDOFF-new.md", "# Handoff\nFamily: Agent", 5);
    createHandoffFile("HANDOFF-newest.md", "# Handoff\nFamily: Agent", 1);

    const sessions = engine.loadAllSessions();

    expect(sessions).toHaveLength(3);
    expect(sessions[0].sessionId).toContain("newest");
    expect(sessions[2].sessionId).toContain("old");
  });
});
