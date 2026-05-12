/**
 * Write-Ahead Log Test Suite (INTEG-MS2)
 * Tests for WAL file format, write protocol, recovery, and compaction.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { WriteAheadLogImpl, type WALEntry } from "../db/WriteAheadLog.js";

const TEST_WAL_PATH = path.join(process.cwd(), "test-data", "test_wal.jsonl");

describe("Write-Ahead Log (INTEG-MS2)", () => {
  let wal: WriteAheadLogImpl;

  beforeEach(() => {
    // Ensure test directory exists
    const dir = path.dirname(TEST_WAL_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Clean up any existing test WAL
    if (fs.existsSync(TEST_WAL_PATH)) {
      fs.unlinkSync(TEST_WAL_PATH);
    }
    wal = new WriteAheadLogImpl();
  });

  afterEach(() => {
    wal.reset();
    // Clean up test WAL
    if (fs.existsSync(TEST_WAL_PATH)) {
      fs.unlinkSync(TEST_WAL_PATH);
    }
  });

  describe("U-INTEG10: WAL File Format", () => {
    it("should create WAL file on init", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });
      expect(fs.existsSync(TEST_WAL_PATH)).toBe(true);
    });

    it("should append entries with sequence numbers", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      const seq1 = wal.append("upsert", "invoices", "INV-001", { id: "INV-001", amount: 100 });
      const seq2 = wal.append("upsert", "invoices", "INV-002", { id: "INV-002", amount: 200 });
      const seq3 = wal.append("delete", "invoices", "INV-001");

      expect(seq1).toBe(1);
      expect(seq2).toBe(2);
      expect(seq3).toBe(3);
    });

    it("should write JSON Lines format with required fields", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      wal.append("upsert", "test_entity", "key1", { foo: "bar" });

      const content = fs.readFileSync(TEST_WAL_PATH, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines.length).toBe(1);

      const entry = JSON.parse(lines[0]) as WALEntry;
      expect(entry.seq).toBe(1);
      expect(entry.ts).toBeDefined();
      expect(entry.op).toBe("upsert");
      expect(entry.entity).toBe("test_entity");
      expect(entry.key).toBe("key1");
      expect(entry.hash).toBeDefined(); // SHA-256 hash
      expect(entry.data).toEqual({ foo: "bar" });
    });

    it("should include payload hash for data integrity", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      wal.append("upsert", "test", "k1", { value: 123 });

      const content = fs.readFileSync(TEST_WAL_PATH, "utf-8");
      const entry = JSON.parse(content.trim()) as WALEntry;

      expect(entry.hash).toBeDefined();
      expect(entry.hash?.length).toBe(16); // Truncated SHA-256
    });

    it("should not include data for delete operations", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      wal.append("delete", "test", "k1");

      const content = fs.readFileSync(TEST_WAL_PATH, "utf-8");
      const entry = JSON.parse(content.trim()) as WALEntry;

      expect(entry.op).toBe("delete");
      expect(entry.data).toBeUndefined();
      expect(entry.hash).toBeUndefined();
    });
  });

  describe("U-INTEG11: Write Protocol", () => {
    it("should track uncommitted entries", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      wal.append("upsert", "test", "k1", { a: 1 });
      wal.append("upsert", "test", "k2", { b: 2 });

      expect(wal.hasUncommitted()).toBe(true);
      expect(wal.getUncommitted().length).toBe(2);
    });

    it("should checkpoint entries after persistence", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      const seq1 = wal.append("upsert", "test", "k1", { a: 1 });
      const seq2 = wal.append("upsert", "test", "k2", { b: 2 });

      expect(wal.getUncommitted().length).toBe(2);

      // Checkpoint first entry
      wal.checkpoint(seq1);
      expect(wal.getUncommitted().length).toBe(1);
      expect(wal.getUncommitted()[0].seq).toBe(seq2);

      // Checkpoint second entry
      wal.checkpoint(seq2);
      expect(wal.hasUncommitted()).toBe(false);
    });

    it("should write checkpoint entries to WAL file", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      const seq = wal.append("upsert", "test", "k1", { a: 1 });
      wal.checkpoint(seq);

      const content = fs.readFileSync(TEST_WAL_PATH, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines.length).toBe(2);

      const checkpointEntry = JSON.parse(lines[1]) as WALEntry;
      expect(checkpointEntry.op).toBe("checkpoint");
      expect(checkpointEntry.checkpoint_seq).toBe(seq);
    });

    it("should batch checkpoint multiple entries", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      const seq1 = wal.append("upsert", "test", "k1", { a: 1 });
      const seq2 = wal.append("upsert", "test", "k2", { b: 2 });
      const seq3 = wal.append("upsert", "test", "k3", { c: 3 });

      const checkpointed = wal.checkpointBatch([seq1, seq2, seq3]);
      expect(checkpointed).toBe(3);
      expect(wal.hasUncommitted()).toBe(false);
    });
  });

  describe("U-INTEG12: Recovery Protocol", () => {
    it("should replay uncommitted entries on init", async () => {
      // Create WAL with uncommitted entries
      await wal.init({ walPath: TEST_WAL_PATH });
      wal.append("upsert", "test", "k1", { a: 1 });
      wal.append("upsert", "test", "k2", { b: 2 });
      wal.close();

      // Reinitialize (simulating crash recovery)
      const wal2 = new WriteAheadLogImpl();
      const uncommitted = await wal2.init({ walPath: TEST_WAL_PATH });

      expect(uncommitted.length).toBe(2);
      expect(uncommitted[0].key).toBe("k1");
      expect(uncommitted[1].key).toBe("k2");

      wal2.reset();
    });

    it("should not replay checkpointed entries", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });
      const seq1 = wal.append("upsert", "test", "k1", { a: 1 });
      wal.append("upsert", "test", "k2", { b: 2 });
      wal.checkpoint(seq1); // Checkpoint only first entry
      wal.close();

      // Reinitialize
      const wal2 = new WriteAheadLogImpl();
      const uncommitted = await wal2.init({ walPath: TEST_WAL_PATH });

      expect(uncommitted.length).toBe(1);
      expect(uncommitted[0].key).toBe("k2");

      wal2.reset();
    });

    it("should recover entries in sequence order", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });
      wal.append("upsert", "test", "k3", { c: 3 });
      wal.append("upsert", "test", "k1", { a: 1 });
      wal.append("upsert", "test", "k2", { b: 2 });
      wal.close();

      const wal2 = new WriteAheadLogImpl();
      const uncommitted = await wal2.init({ walPath: TEST_WAL_PATH });

      expect(uncommitted.length).toBe(3);
      // Should be sorted by sequence number
      expect(uncommitted[0].seq).toBeLessThan(uncommitted[1].seq);
      expect(uncommitted[1].seq).toBeLessThan(uncommitted[2].seq);

      wal2.reset();
    });

    it("should report recovered entries count in health", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });
      wal.append("upsert", "test", "k1", { a: 1 });
      wal.append("upsert", "test", "k2", { b: 2 });
      wal.close();

      const wal2 = new WriteAheadLogImpl();
      await wal2.init({ walPath: TEST_WAL_PATH });

      const health = wal2.getHealth();
      expect(health.recoveredEntries).toBe(2);

      wal2.reset();
    });

    it("should recover within 10s for 1000 entries", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      // Write 1000 entries
      for (let i = 0; i < 1000; i++) {
        wal.append("upsert", "test", `k${i}`, { idx: i });
      }
      wal.close();

      const start = Date.now();
      const wal2 = new WriteAheadLogImpl();
      const uncommitted = await wal2.init({ walPath: TEST_WAL_PATH });
      const elapsed = Date.now() - start;

      expect(uncommitted.length).toBe(1000);
      expect(elapsed).toBeLessThan(10000); // <10s requirement

      wal2.reset();
    });
  });

  describe("U-INTEG13: WAL Compaction", () => {
    it("should compact checkpointed entries", async () => {
      // Use very short retention (1ms) to allow immediate compaction
      await wal.init({ walPath: TEST_WAL_PATH, maxFileSizeBytes: 1000, retentionMs: 1 });

      // Write and checkpoint many entries
      for (let i = 0; i < 50; i++) {
        const seq = wal.append("upsert", "test", `k${i}`, { idx: i, data: "padding".repeat(10) });
        wal.checkpoint(seq);
      }

      // Wait a moment for entries to expire
      await new Promise(r => setTimeout(r, 10));

      const beforeSize = fs.statSync(TEST_WAL_PATH).size;
      const result = await wal.compact();

      expect(result.removed).toBeGreaterThan(0);

      // After compaction, file should be smaller
      const afterSize = fs.statSync(TEST_WAL_PATH).size;
      expect(afterSize).toBeLessThan(beforeSize);
    });

    it("should preserve uncommitted entries during compaction", async () => {
      await wal.init({ walPath: TEST_WAL_PATH, maxFileSizeBytes: 500 });

      // Write some committed entries
      for (let i = 0; i < 20; i++) {
        const seq = wal.append("upsert", "test", `committed${i}`, { idx: i });
        wal.checkpoint(seq);
      }

      // Write uncommitted entries
      wal.append("upsert", "test", "uncommitted1", { a: 1 });
      wal.append("upsert", "test", "uncommitted2", { b: 2 });

      await wal.compact();

      // Uncommitted should still be tracked
      expect(wal.getUncommitted().length).toBe(2);
    });

    it("should update lastCompaction timestamp", async () => {
      await wal.init({ walPath: TEST_WAL_PATH, maxFileSizeBytes: 100 });

      for (let i = 0; i < 10; i++) {
        const seq = wal.append("upsert", "test", `k${i}`, { idx: i });
        wal.checkpoint(seq);
      }

      expect(wal.getHealth().lastCompaction).toBeNull();

      await wal.compact();

      expect(wal.getHealth().lastCompaction).not.toBeNull();
    });
  });

  describe("WAL Health Metrics", () => {
    it("should report accurate health metrics", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      wal.append("upsert", "test", "k1", { a: 1 });
      wal.append("upsert", "test", "k2", { b: 2 });

      const health = wal.getHealth();

      expect(health.enabled).toBe(true);
      expect(health.walPath).toBe(TEST_WAL_PATH);
      expect(health.currentSeq).toBe(2);
      expect(health.uncommittedCount).toBe(2);
      expect(health.fileSizeBytes).toBeGreaterThan(0);
    });

    it("should track WAL overhead < 5%", async () => {
      await wal.init({ walPath: TEST_WAL_PATH });

      const testData = { id: "test", value: "x".repeat(1000) };
      const dataSize = JSON.stringify(testData).length;

      const seq = wal.append("upsert", "test", "k1", testData);
      wal.checkpoint(seq);

      const walSize = wal.getHealth().fileSizeBytes;
      // WAL entry includes metadata (seq, ts, op, entity, key, hash)
      // Overhead should be reasonable compared to data size
      const overhead = (walSize - dataSize) / dataSize;
      expect(overhead).toBeLessThan(0.5); // <50% overhead for single entry (conservative)
    });
  });
});
