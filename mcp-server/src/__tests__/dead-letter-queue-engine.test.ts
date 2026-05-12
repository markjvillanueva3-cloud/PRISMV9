/**
 * Tests for DeadLetterQueueEngine
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DeadLetterQueueEngineImpl } from "../engines/DeadLetterQueueEngine.js";
import * as fs from "fs/promises";
import * as path from "path";

describe("DeadLetterQueueEngine", () => {
  const testDir = path.join(process.cwd(), "data", "dlq-test");
  let engine: DeadLetterQueueEngineImpl;

  beforeEach(async () => {
    engine = new DeadLetterQueueEngineImpl();
    // Point to test directory
    (engine as any).dlqDir = testDir;
    await fs.mkdir(testDir, { recursive: true });
    await engine.init();
  });

  afterEach(async () => {
    await engine.shutdown();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("addFailure", () => {
    it("should add a failure entry", async () => {
      const entry = await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        milestoneId: "MS1",
        unitId: "U1",
        instanceId: "instance-1",
        reason: "lock_conflict",
        errorMessage: "Lock already held",
      });

      expect(entry.id).toBeDefined();
      expect(entry.taskType).toBe("claim");
      expect(entry.resource).toBe("claim:MS1/U1");
      expect(entry.reason).toBe("lock_conflict");
      expect(entry.severity).toBe("transient");
      expect(entry.attempts).toBe(1);
      expect(entry.status).toBe("pending");
    });

    it("should increment attempts for same resource", async () => {
      await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        milestoneId: "MS1",
        unitId: "U1",
        instanceId: "instance-1",
        reason: "lock_conflict",
        errorMessage: "Lock already held (1)",
      });

      const entry2 = await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        milestoneId: "MS1",
        unitId: "U1",
        instanceId: "instance-1",
        reason: "lock_conflict",
        errorMessage: "Lock already held (2)",
      });

      expect(entry2.attempts).toBe(2);
    });

    it("should mark permanent failures as discarded", async () => {
      const entry = await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        milestoneId: "MS1",
        unitId: "U1",
        instanceId: "instance-1",
        reason: "validation_error",
        errorMessage: "Invalid input",
      });

      expect(entry.severity).toBe("permanent");
      expect(entry.status).toBe("discarded");
    });
  });

  describe("resolve and discard", () => {
    it("should resolve an entry", async () => {
      const entry = await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        reason: "lock_conflict",
        errorMessage: "Lock already held",
      });

      await engine.resolve(entry.id, "manual_fix", "Fixed manually");

      const resolved = engine.get(entry.id);
      expect(resolved?.status).toBe("resolved");
      expect(resolved?.resolvedBy).toBe("manual_fix");
      expect(resolved?.resolutionNotes).toBe("Fixed manually");
    });

    it("should discard an entry", async () => {
      const entry = await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        reason: "lock_conflict",
        errorMessage: "Lock already held",
      });

      await engine.discard(entry.id, "Giving up");

      const discarded = engine.get(entry.id);
      expect(discarded?.status).toBe("discarded");
    });
  });

  describe("list and getStats", () => {
    it("should list entries with filters", async () => {
      await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        reason: "lock_conflict",
        errorMessage: "Error 1",
      });

      await engine.addFailure({
        taskType: "pipeline",
        resource: "pipeline:job-1",
        reason: "execution_error",
        errorMessage: "Error 2",
      });

      const claims = engine.list({ taskType: "claim" });
      expect(claims.length).toBe(1);
      expect(claims[0].taskType).toBe("claim");

      const lockErrors = engine.list({ reason: "lock_conflict" });
      expect(lockErrors.length).toBe(1);
    });

    it("should return accurate stats", async () => {
      await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        reason: "lock_conflict",
        errorMessage: "Error 1",
      });

      await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U2",
        reason: "lock_timeout",
        errorMessage: "Error 2",
      });

      const stats = engine.getStats();
      expect(stats.pending).toBe(2);
      expect(stats.byTaskType.claim).toBe(2);
      expect(stats.byReason.lock_conflict).toBe(1);
      expect(stats.byReason.lock_timeout).toBe(1);
    });
  });

  describe("getByMilestone", () => {
    it("should filter by milestone", async () => {
      await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        milestoneId: "MS1",
        unitId: "U1",
        reason: "lock_conflict",
        errorMessage: "Error 1",
      });

      await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS2/U1",
        milestoneId: "MS2",
        unitId: "U1",
        reason: "lock_conflict",
        errorMessage: "Error 2",
      });

      const ms1Entries = engine.getByMilestone("MS1");
      expect(ms1Entries.length).toBe(1);
      expect(ms1Entries[0].milestoneId).toBe("MS1");
    });
  });

  describe("cleanup", () => {
    it("should clean up old resolved entries", async () => {
      const entry = await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        reason: "lock_conflict",
        errorMessage: "Error",
      });

      await engine.resolve(entry.id, "manual");

      // Set resolved time to 8 days ago
      const resolved = engine.get(entry.id)!;
      resolved.resolvedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

      const cleaned = await engine.cleanup(7);
      expect(cleaned).toBe(1);
    });
  });

  describe("persistence", () => {
    it("should persist entries to disk", async () => {
      const entry = await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        reason: "lock_conflict",
        errorMessage: "Error",
      });

      const filePath = path.join(testDir, `${entry.id}.json`);
      const content = await fs.readFile(filePath, "utf-8");
      const saved = JSON.parse(content);

      expect(saved.id).toBe(entry.id);
      expect(saved.resource).toBe("claim:MS1/U1");
    });

    it("should load entries on init", async () => {
      // Create an entry
      const entry = await engine.addFailure({
        taskType: "claim",
        resource: "claim:MS1/U1",
        reason: "lock_conflict",
        errorMessage: "Error",
      });

      // Create new engine instance
      const engine2 = new DeadLetterQueueEngineImpl();
      (engine2 as any).dlqDir = testDir;
      await engine2.init();

      const loaded = engine2.get(entry.id);
      expect(loaded).toBeDefined();
      expect(loaded?.resource).toBe("claim:MS1/U1");

      await engine2.shutdown();
    });
  });
});
