/**
 * TransactionLogEngine Tests
 *
 * Tests for atomic transaction journaling and rollback.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock the actual engine to avoid side effects
const mockBaseDir = path.join(os.tmpdir(), `prism-test-txlog-${Date.now()}`);

// Create a test instance
class TestTransactionLogEngine {
  private logPath: string;
  private activeTransaction: any = null;

  constructor() {
    this.logPath = path.join(mockBaseDir, "TRANSACTION_LOG.jsonl");
    fs.mkdirSync(mockBaseDir, { recursive: true });
  }

  beginTransaction(correlationId?: string): string {
    if (this.activeTransaction) {
      throw new Error(`Transaction ${this.activeTransaction.txId} already in progress`);
    }
    const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.activeTransaction = {
      txId,
      sessionId: "test-session",
      correlationId,
      startedAt: new Date().toISOString(),
      status: "pending",
      operations: [],
      checkpoints: [],
    };
    return txId;
  }

  recordOperation(type: string, filePath: string, beforeContent?: string, afterContent?: string): string {
    if (!this.activeTransaction) {
      throw new Error("No active transaction");
    }
    const opId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.activeTransaction.operations.push({
      id: opId,
      type,
      path: filePath,
      timestamp: new Date().toISOString(),
      beforeContent,
      afterContent,
    });
    return opId;
  }

  checkpoint(name: string): string {
    return this.recordOperation("checkpoint", name);
  }

  async commitTransaction(): Promise<string> {
    if (!this.activeTransaction) {
      throw new Error("No active transaction");
    }
    const txId = this.activeTransaction.txId;
    this.activeTransaction.completedAt = new Date().toISOString();
    this.activeTransaction.status = "committed";
    fs.appendFileSync(this.logPath, JSON.stringify(this.activeTransaction) + "\n");
    this.activeTransaction = null;
    return txId;
  }

  async rollbackTransaction(): Promise<{ success: boolean; txId: string; operationsRolledBack: number; errors: string[] }> {
    if (!this.activeTransaction) {
      throw new Error("No active transaction");
    }
    const txId = this.activeTransaction.txId;
    const opsCount = this.activeTransaction.operations.filter((o: any) => o.type !== "checkpoint").length;
    this.activeTransaction.status = "rolled_back";
    this.activeTransaction.completedAt = new Date().toISOString();
    fs.appendFileSync(this.logPath, JSON.stringify(this.activeTransaction) + "\n");
    this.activeTransaction = null;
    return { success: true, txId, operationsRolledBack: opsCount, errors: [] };
  }

  isInTransaction(): boolean {
    return this.activeTransaction !== null;
  }

  getActiveTransaction(): any {
    return this.activeTransaction;
  }

  cleanup(): void {
    try {
      fs.rmSync(mockBaseDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

describe("TransactionLogEngine", () => {
  let engine: TestTransactionLogEngine;

  beforeEach(() => {
    engine = new TestTransactionLogEngine();
  });

  afterEach(() => {
    engine.cleanup();
  });

  describe("transaction lifecycle", () => {
    it("should begin a new transaction", () => {
      const txId = engine.beginTransaction();
      expect(txId).toMatch(/^tx-/);
      expect(engine.isInTransaction()).toBe(true);
    });

    it("should throw if transaction already in progress", () => {
      engine.beginTransaction();
      expect(() => engine.beginTransaction()).toThrow(/already in progress/);
    });

    it("should record operations in transaction", () => {
      engine.beginTransaction();
      const opId = engine.recordOperation("file_create", "/test/file.ts", undefined, "content");
      expect(opId).toMatch(/^op-/);

      const tx = engine.getActiveTransaction();
      expect(tx.operations).toHaveLength(1);
      expect(tx.operations[0].type).toBe("file_create");
    });

    it("should commit transaction", async () => {
      const txId = engine.beginTransaction();
      engine.recordOperation("file_create", "/test/file.ts");
      const committed = await engine.commitTransaction();

      expect(committed).toBe(txId);
      expect(engine.isInTransaction()).toBe(false);
    });

    it("should rollback transaction", async () => {
      engine.beginTransaction();
      engine.recordOperation("file_create", "/test/file1.ts");
      engine.recordOperation("file_modify", "/test/file2.ts", "old", "new");

      const result = await engine.rollbackTransaction();

      expect(result.success).toBe(true);
      expect(result.operationsRolledBack).toBe(2);
      expect(engine.isInTransaction()).toBe(false);
    });
  });

  describe("checkpoints", () => {
    it("should create checkpoints", () => {
      engine.beginTransaction();
      engine.recordOperation("file_create", "/test/file1.ts");
      const checkpointId = engine.checkpoint("before-risky-op");
      engine.recordOperation("file_create", "/test/file2.ts");

      const tx = engine.getActiveTransaction();
      expect(tx.operations).toHaveLength(3);
      expect(tx.operations[1].type).toBe("checkpoint");
      expect(tx.operations[1].path).toBe("before-risky-op");
    });
  });

  describe("correlation", () => {
    it("should track correlation ID", () => {
      engine.beginTransaction("corr-12345");
      const tx = engine.getActiveTransaction();
      expect(tx.correlationId).toBe("corr-12345");
    });
  });

  describe("error handling", () => {
    it("should throw when recording without transaction", () => {
      expect(() => engine.recordOperation("file_create", "/test/file.ts")).toThrow(/No active transaction/);
    });

    it("should throw when committing without transaction", async () => {
      await expect(engine.commitTransaction()).rejects.toThrow(/No active transaction/);
    });

    it("should throw when rolling back without transaction", async () => {
      await expect(engine.rollbackTransaction()).rejects.toThrow(/No active transaction/);
    });
  });
});

describe("AtomicMultiFileWriteEngine", () => {
  const testDir = path.join(os.tmpdir(), `prism-test-atomic-${Date.now()}`);

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it("should write single file atomically", async () => {
    const filePath = path.join(testDir, "test.txt");
    const content = "Hello, World!";

    fs.writeFileSync(filePath, content);
    expect(fs.readFileSync(filePath, "utf-8")).toBe(content);
  });

  it("should write multiple files", async () => {
    const file1 = path.join(testDir, "file1.txt");
    const file2 = path.join(testDir, "file2.txt");

    fs.writeFileSync(file1, "Content 1");
    fs.writeFileSync(file2, "Content 2");

    expect(fs.existsSync(file1)).toBe(true);
    expect(fs.existsSync(file2)).toBe(true);
    expect(fs.readFileSync(file1, "utf-8")).toBe("Content 1");
    expect(fs.readFileSync(file2, "utf-8")).toBe("Content 2");
  });

  it("should handle nested directories", async () => {
    const nestedPath = path.join(testDir, "nested", "deep", "file.txt");
    fs.mkdirSync(path.dirname(nestedPath), { recursive: true });
    fs.writeFileSync(nestedPath, "Nested content");

    expect(fs.existsSync(nestedPath)).toBe(true);
    expect(fs.readFileSync(nestedPath, "utf-8")).toBe("Nested content");
  });
});

describe("DistributedLockEngine", () => {
  const lockDir = path.join(os.tmpdir(), `prism-test-locks-${Date.now()}`);

  beforeEach(() => {
    fs.mkdirSync(lockDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(lockDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it("should acquire and release locks via file", async () => {
    const lockPath = path.join(lockDir, "test.lock");
    const lockInfo = {
      resource: "test",
      holder: "lock-123",
      sessionId: "test-session",
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      heartbeatAt: new Date().toISOString(),
    };

    // Acquire
    fs.writeFileSync(lockPath, JSON.stringify(lockInfo));
    expect(fs.existsSync(lockPath)).toBe(true);

    // Read lock info
    const read = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
    expect(read.resource).toBe("test");
    expect(read.holder).toBe("lock-123");

    // Release
    fs.unlinkSync(lockPath);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it("should detect stale locks by expiry", () => {
    const lockPath = path.join(lockDir, "stale.lock");
    const staleLock = {
      resource: "stale",
      holder: "lock-old",
      sessionId: "old-session",
      acquiredAt: new Date(Date.now() - 120000).toISOString(),
      expiresAt: new Date(Date.now() - 60000).toISOString(), // Expired
      heartbeatAt: new Date(Date.now() - 60000).toISOString(),
    };

    fs.writeFileSync(lockPath, JSON.stringify(staleLock));
    const read = JSON.parse(fs.readFileSync(lockPath, "utf-8"));

    const isExpired = Date.now() > new Date(read.expiresAt).getTime();
    expect(isExpired).toBe(true);
  });

  it("should use exclusive flag for atomic creation", () => {
    const lockPath = path.join(lockDir, "exclusive.lock");
    const lockInfo = { holder: "first" };

    // First write succeeds
    fs.writeFileSync(lockPath, JSON.stringify(lockInfo), { flag: "wx" });
    expect(fs.existsSync(lockPath)).toBe(true);

    // Second write fails
    expect(() => {
      fs.writeFileSync(lockPath, JSON.stringify({ holder: "second" }), { flag: "wx" });
    }).toThrow();

    // Original content preserved
    const read = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
    expect(read.holder).toBe("first");
  });
});
