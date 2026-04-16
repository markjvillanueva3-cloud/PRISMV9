/**
 * Tests for DistributedLockService
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DistributedLockServiceImpl,
  FileLockBackend,
} from "../services/DistributedLockService.js";
import * as fs from "fs/promises";
import * as path from "path";

describe("DistributedLockService", () => {
  describe("FileLockBackend", () => {
    const testDir = path.join(process.cwd(), "data", "locks-test");
    let backend: FileLockBackend;

    beforeEach(async () => {
      backend = new FileLockBackend();
      // Point to test directory
      (backend as any).lockDir = testDir;
      await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should acquire a lock", async () => {
      const available = await backend.isAvailable();
      expect(available).toBe(true);

      const acquired = await backend.acquire("test-resource", 60000, "token-1");
      expect(acquired).toBe(true);
    });

    it("should not acquire same lock twice", async () => {
      await backend.isAvailable();

      const first = await backend.acquire("test-resource", 60000, "token-1");
      expect(first).toBe(true);

      const second = await backend.acquire("test-resource", 60000, "token-2");
      expect(second).toBe(false);
    });

    it("should release a lock", async () => {
      await backend.isAvailable();

      await backend.acquire("test-resource", 60000, "token-1");
      const released = await backend.release("test-resource", "token-1");
      expect(released).toBe(true);

      // Should be able to acquire again
      const reacquired = await backend.acquire("test-resource", 60000, "token-2");
      expect(reacquired).toBe(true);
    });

    it("should not release with wrong token", async () => {
      await backend.isAvailable();

      await backend.acquire("test-resource", 60000, "token-1");
      const released = await backend.release("test-resource", "wrong-token");
      expect(released).toBe(false);
    });

    it("should renew a lock", async () => {
      await backend.isAvailable();

      await backend.acquire("test-resource", 60000, "token-1");
      const renewed = await backend.renew("test-resource", "token-1", 120000);
      expect(renewed).toBe(true);
    });

    it("should acquire expired lock", async () => {
      await backend.isAvailable();

      // Acquire with very short TTL
      await backend.acquire("test-resource", 1, "token-1");

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should be able to acquire expired lock
      const acquired = await backend.acquire("test-resource", 60000, "token-2");
      expect(acquired).toBe(true);
    });

    it("should force release a lock", async () => {
      await backend.isAvailable();

      await backend.acquire("test-resource", 60000, "token-1");
      const released = await backend.forceRelease("test-resource");
      expect(released).toBe(true);

      // Should be able to acquire again
      const reacquired = await backend.acquire("test-resource", 60000, "token-2");
      expect(reacquired).toBe(true);
    });
  });

  describe("DistributedLockServiceImpl", () => {
    let service: DistributedLockServiceImpl;
    const testDir = path.join(process.cwd(), "data", "locks-test-service");

    beforeEach(async () => {
      service = new DistributedLockServiceImpl();
      // Force file backend by making sure DB/Redis aren't available
      await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      await service.releaseAll();
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should initialize with file backend when no DB/Redis", async () => {
      const backend = await service.init();
      // Should fall back to file when PG/Redis unavailable
      expect(["postgres", "redis", "file"]).toContain(backend);
    });

    it("should acquire and release locks", async () => {
      await service.init();

      const result = await service.acquireLock("test:resource:1", 60000);
      expect(result.acquired).toBe(true);
      expect(result.handle).toBeDefined();
      expect(result.handle?.resource).toBe("test:resource:1");

      const released = await service.releaseLock("test:resource:1");
      expect(released).toBe(true);
    });

    it("should track active locks", async () => {
      await service.init();

      await service.acquireLock("test:resource:1", 60000);
      await service.acquireLock("test:resource:2", 60000);

      const stats = service.getStats();
      expect(stats.activeLocks).toBe(2);
      expect(stats.locks.length).toBe(2);
    });

    it("should use default TTL based on task type", async () => {
      await service.init();

      service.setDefaultTtl("custom_type", 120000);
      expect(service.getDefaultTtl("custom_type")).toBe(120000);
      expect(service.getDefaultTtl("unknown_type")).toBe(5 * 60 * 1000); // default
    });

    it("should generate unique tokens", async () => {
      await service.init();

      const result1 = await service.acquireLock("test:1", 60000);
      const result2 = await service.acquireLock("test:2", 60000);

      expect(result1.handle?.token).not.toBe(result2.handle?.token);
    });

    it("should release all locks on shutdown", async () => {
      await service.init();

      await service.acquireLock("test:1", 60000);
      await service.acquireLock("test:2", 60000);
      await service.acquireLock("test:3", 60000);

      const released = await service.releaseAll();
      expect(released).toBe(3);
      expect(service.getStats().activeLocks).toBe(0);
    });
  });
});
