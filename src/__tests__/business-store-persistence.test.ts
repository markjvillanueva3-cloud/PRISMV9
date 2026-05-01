/**
 * BusinessStore + PersistenceBridge — Unit Tests
 * Session 5-1 (U-PERS1/U-PERS2)
 *
 * Tests the InMemoryBusinessStore implementation (no Postgres needed)
 * and the PersistenceBridge write-through cache pattern.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryBusinessStore, type StoreRecord, type EntityConfig } from "../db/BusinessStore.js";
import { persistenceBridge } from "../db/PersistenceBridge.js";

// ─── Test Entity Config ─────────────────────────────────────────────────────

const TEST_CONFIG: EntityConfig = {
  tableName: "test_items",
  primaryKey: "id",
  businessKey: "code",
  hasUpdatedAt: true,
  knownColumns: ["id", "code", "name", "value", "status", "tags", "meta", "updated_at"],
  jsonColumns: ["meta"],
  arrayColumns: ["tags"],
};

interface TestItem extends StoreRecord {
  id?: string;
  code: string;
  name: string;
  value: number;
  status?: string;
}

// ─── InMemoryBusinessStore Tests ────────────────────────────────────────────

describe("InMemoryBusinessStore", () => {
  let store: InMemoryBusinessStore<TestItem>;

  beforeEach(() => {
    store = new InMemoryBusinessStore<TestItem>(TEST_CONFIG);
  });

  describe("save", () => {
    it("saves a record and returns it with an id", async () => {
      const result = await store.save({ code: "A001", name: "Widget", value: 10 });
      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.code).toBe("A001");
      expect(result.data!.name).toBe("Widget");
      expect(result.data!.id).toBeDefined();
    });

    it("uses business key as map key", async () => {
      await store.save({ code: "BK-100", name: "Test", value: 5 });
      const found = await store.findByField("code", "BK-100");
      expect(found.ok).toBe(true);
      expect(found.data!.name).toBe("Test");
    });

    it("uses explicit id if provided", async () => {
      const result = await store.save({ id: "custom-id", code: "C001", name: "Custom", value: 1 });
      expect(result.data!.id).toBe("custom-id");
    });

    it("auto-generates id when no id or business key", async () => {
      const configNoKey: EntityConfig = {
        tableName: "test",
        primaryKey: "id",
        hasUpdatedAt: false,
        knownColumns: ["id", "name"],
      };
      const s = new InMemoryBusinessStore<StoreRecord>(configNoKey);
      const r1 = await s.save({ name: "first" });
      const r2 = await s.save({ name: "second" });
      expect(r1.data!.id).not.toBe(r2.data!.id);
    });
  });

  describe("findById", () => {
    it("finds by business key (map key)", async () => {
      await store.save({ code: "FIND-ME", name: "Found", value: 42 });
      const result = await store.findById("FIND-ME");
      expect(result.ok).toBe(true);
      expect(result.data!.name).toBe("Found");
    });

    it("finds by id via secondary index", async () => {
      const saved = await store.save({ id: "uuid-123", code: "IDX-01", name: "Indexed", value: 7 });
      // Business key is "IDX-01" (map key), but should also find by id "uuid-123"
      const byId = await store.findById("uuid-123");
      expect(byId.ok).toBe(true);
      expect(byId.data!.code).toBe("IDX-01");
    });

    it("returns not found for missing record", async () => {
      const result = await store.findById("nonexistent");
      expect(result.ok).toBe(false);
      expect(result.data).toBeNull();
    });
  });

  describe("findByField", () => {
    it("finds by arbitrary field value", async () => {
      await store.save({ code: "F1", name: "Alpha", value: 100 });
      await store.save({ code: "F2", name: "Beta", value: 200 });
      const result = await store.findByField("name", "Beta");
      expect(result.ok).toBe(true);
      expect(result.data!.code).toBe("F2");
    });

    it("returns not found when field value doesn't match", async () => {
      await store.save({ code: "F3", name: "Gamma", value: 300 });
      const result = await store.findByField("name", "Delta");
      expect(result.ok).toBe(false);
    });
  });

  describe("update", () => {
    it("updates a record by business key", async () => {
      await store.save({ code: "UPD-1", name: "Original", value: 10 });
      const result = await store.update("UPD-1", { name: "Updated", value: 20 });
      expect(result.ok).toBe(true);
      expect(result.data!.name).toBe("Updated");
      expect(result.data!.value).toBe(20);
      expect(result.data!.code).toBe("UPD-1"); // unchanged field preserved
    });

    it("returns error for missing record", async () => {
      const result = await store.update("nonexistent", { name: "nope" });
      expect(result.ok).toBe(false);
    });
  });

  describe("delete", () => {
    it("deletes by business key", async () => {
      await store.save({ code: "DEL-1", name: "Doomed", value: 0 });
      const result = await store.delete("DEL-1");
      expect(result.ok).toBe(true);
      expect(result.data!.code).toBe("DEL-1");

      const check = await store.findById("DEL-1");
      expect(check.ok).toBe(false);
    });

    it("deletes by id via secondary index", async () => {
      await store.save({ id: "del-uuid", code: "DEL-2", name: "Also doomed", value: 0 });
      const result = await store.delete("del-uuid");
      expect(result.ok).toBe(true);
    });

    it("returns error for missing record", async () => {
      const result = await store.delete("ghost");
      expect(result.ok).toBe(false);
    });
  });

  describe("query", () => {
    beforeEach(async () => {
      await store.save({ code: "Q1", name: "Alpha", value: 30, status: "active" });
      await store.save({ code: "Q2", name: "Beta", value: 10, status: "active" });
      await store.save({ code: "Q3", name: "Gamma", value: 20, status: "inactive" });
    });

    it("returns all records with no filter", async () => {
      const result = await store.findAll();
      expect(result.ok).toBe(true);
      expect(result.total).toBe(3);
      expect(result.data.length).toBe(3);
    });

    it("filters by where clause", async () => {
      const result = await store.query({ where: { status: "active" } });
      expect(result.total).toBe(2);
      expect(result.data.every((r) => r.status === "active")).toBe(true);
    });

    it("sorts by orderBy ASC", async () => {
      const result = await store.query({ orderBy: "value", order: "ASC" });
      expect(result.data[0].code).toBe("Q2"); // value=10
      expect(result.data[1].code).toBe("Q3"); // value=20
      expect(result.data[2].code).toBe("Q1"); // value=30
    });

    it("sorts by orderBy DESC", async () => {
      const result = await store.query({ orderBy: "value", order: "DESC" });
      expect(result.data[0].code).toBe("Q1"); // value=30
    });

    it("applies limit", async () => {
      const result = await store.query({ limit: 2 });
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(3); // total is unaffected by limit
    });

    it("applies offset", async () => {
      const result = await store.query({ offset: 1 });
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(3);
    });

    it("filters by null value", async () => {
      const result = await store.query({ where: { status: null } });
      expect(result.total).toBe(0); // all items have status set
    });

    it("filters by array membership", async () => {
      const result = await store.query({ where: { code: ["Q1", "Q3"] } });
      expect(result.total).toBe(2);
    });
  });

  describe("count", () => {
    it("counts all records", async () => {
      await store.save({ code: "C1", name: "A", value: 1 });
      await store.save({ code: "C2", name: "B", value: 2 });
      expect(await store.count()).toBe(2);
    });

    it("counts with where filter", async () => {
      await store.save({ code: "C3", name: "C", value: 3, status: "active" });
      await store.save({ code: "C4", name: "D", value: 4, status: "inactive" });
      expect(await store.count({ status: "active" })).toBe(1);
    });
  });

  describe("clear and reset", () => {
    it("clear removes all records", async () => {
      await store.save({ code: "CLR", name: "Gone", value: 0 });
      await store.clear();
      expect(await store.count()).toBe(0);
    });

    it("reset also resets auto-id counter", () => {
      store.reset();
      expect(store.getAll().length).toBe(0);
    });
  });
});

// ─── PersistenceBridge Tests ────────────────────────────────────────────────

describe("PersistenceBridge", () => {
  beforeEach(() => {
    persistenceBridge.reset();
  });

  it("starts in memory mode before initialization", () => {
    expect(persistenceBridge.getMode()).toBe("memory");
    expect(persistenceBridge.isInitialized()).toBe(false);
  });

  it("initializes to memory mode without DATABASE_URL", async () => {
    const result = await persistenceBridge.loadAll();
    expect(result.mode).toBe("memory");
    expect(persistenceBridge.isInitialized()).toBe(true);
  });

  it("persist() is a no-op in memory mode", async () => {
    await persistenceBridge.loadAll();
    // Should not throw
    persistenceBridge.persist("work_orders", "WO-001", { wo_number: "WO-001" });
    const health = persistenceBridge.getHealth();
    expect(health.pendingWrites).toBe(0); // not queued in memory mode
  });

  it("getHealth() returns valid metrics", () => {
    const health = persistenceBridge.getHealth();
    expect(health.mode).toBe("memory");
    expect(health.totalFlushed).toBe(0);
    expect(health.totalErrors).toBe(0);
    expect(health.lastError).toBeNull();
    expect(Array.isArray(health.registeredEntities)).toBe(true);
  });

  it("reset() clears all state", async () => {
    const testMap = new Map<string, StoreRecord>();
    persistenceBridge.registerMap({
      entity: "work_orders",
      getMap: () => testMap,
      keyField: "wo_number",
    });

    persistenceBridge.reset();

    const health = persistenceBridge.getHealth();
    expect(health.registeredEntities.length).toBe(0);
    expect(health.initialized).toBe(false);
  });

  it("registerMap adds entity to health report", () => {
    const testMap = new Map<string, StoreRecord>();
    persistenceBridge.registerMap({
      entity: "work_orders",
      getMap: () => testMap,
      keyField: "wo_number",
    });

    const health = persistenceBridge.getHealth();
    expect(health.registeredEntities).toContain("work_orders");
  });

  it("registerArray adds entity to health report", () => {
    let arr: StoreRecord[] = [];
    persistenceBridge.registerArray({
      entity: "cost_feedback",
      getArray: () => arr,
      setArray: (data) => { arr = data; },
      keyField: "id",
    });

    const health = persistenceBridge.getHealth();
    expect(health.registeredEntities).toContain("cost_feedback");
  });

  it("flushAll returns zero when nothing pending", async () => {
    await persistenceBridge.loadAll();
    const result = await persistenceBridge.flushAll();
    expect(result.flushed).toBe(0);
    expect(result.errors).toBe(0);
  });
});

// ─── SQL Identifier Validation Tests ────────────────────────────────────────

describe("SQL Identifier Validation", () => {
  it("rejects SQL injection in column names", async () => {
    const config: EntityConfig = {
      tableName: "test",
      primaryKey: "id",
      hasUpdatedAt: false,
      knownColumns: ["id", "name"],
    };

    // Import the PostgresBusinessStore to test validation
    const { PostgresBusinessStore } = await import("../db/BusinessStore.js");
    const pgStore = new PostgresBusinessStore<StoreRecord>(config);

    // findByField with injection attempt should throw
    await expect(
      pgStore.findByField("1=1; DROP TABLE test; --", "x")
    ).rejects.toThrow("Invalid SQL identifier");
  });

  it("rejects unknown column names", async () => {
    const config: EntityConfig = {
      tableName: "test",
      primaryKey: "id",
      hasUpdatedAt: false,
      knownColumns: ["id", "name"],
    };

    const { PostgresBusinessStore } = await import("../db/BusinessStore.js");
    const pgStore = new PostgresBusinessStore<StoreRecord>(config);

    await expect(
      pgStore.findByField("unknown_col", "x")
    ).rejects.toThrow("Unknown column");
  });
});
