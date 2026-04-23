import { describe, it, expect } from "vitest";
import {
  SchemaMigrationRollbackEngine,
  schemaMigrationRollbackEngine,
} from "../engines/SchemaMigrationRollbackEngine.js";

type V1 = { version: 1; count: number };
type V2 = { version: 2; count: number; label: string };
type V3 = { version: 3; count: number; label: string; tags: string[] };

describe("SchemaMigrationRollbackEngine", () => {
  function buildEngine() {
    const engine = new SchemaMigrationRollbackEngine();
    engine.registerMigration<V1>({
      from: 1,
      to: 2,
      up: (v1) => ({ version: 2, count: v1.count, label: "default" } as unknown as V1),
      down: (v2) => ({ version: 1, count: (v2 as unknown as V2).count } as V1),
    });
    engine.registerMigration<V2>({
      from: 2,
      to: 3,
      up: (v2) => ({ ...(v2 as V2), version: 3, tags: [] } as unknown as V2),
      down: (v3) => {
        const copy: Record<string, unknown> = { ...(v3 as unknown as Record<string, unknown>) };
        delete copy.tags;
        copy.version = 2;
        return copy as unknown as V2;
      },
    });
    return engine;
  }

  it("singleton has matching class name", () => {
    expect(schemaMigrationRollbackEngine.name).toBe("SchemaMigrationRollbackEngine");
  });

  it("migrate v1 to v3 applies both migrations in sequence", () => {
    const engine = buildEngine();
    const v1: V1 = { version: 1, count: 42 };
    const result = engine.migrate<V1>("state.json", v1, 1, 3);
    const data = result.data as unknown as V3;
    expect(result.finalVersion).toBe(3);
    expect(result.applied).toEqual([2, 3]);
    expect(data.version).toBe(3);
    expect(data.count).toBe(42);
    expect(data.tags).toEqual([]);
    expect(data.label).toBe("default");
  });

  it("rollback v3 to v1 reverts and strips v3 fields", () => {
    const engine = buildEngine();
    const v3: V3 = { version: 3, count: 7, label: "x", tags: ["a"] };
    const result = engine.rollback<V3>("state.json", v3, 3, 1);
    const data = result.data as unknown as Record<string, unknown>;
    expect(result.finalVersion).toBe(1);
    expect(result.applied).toEqual([2, 1]);
    expect(data.version).toBe(1);
    expect(data.count).toBe(7);
    expect(Object.keys(data).sort()).toEqual(["count", "version"]);
  });

  it("snapshot captures a cloned copy that survives source mutation", () => {
    const engine = buildEngine();
    const data = { version: 2, count: 3, label: "hi" };
    const snapId = engine.snapshot("state.json", data, 2, "manual");
    data.count = 999;
    const restored = engine.restoreFromSnapshot(snapId) as typeof data;
    expect(restored.count).toBe(3);
    expect(restored.label).toBe("hi");
  });

  it("migrate records pre-state snapshot in history", () => {
    const engine = buildEngine();
    engine.migrate<V1>("state.json", { version: 1, count: 1 }, 1, 2);
    const history = engine.historyFor("state.json");
    expect(history.length).toBe(1);
    expect(history[0].version).toBe(1);
    expect(history[0].label).toBe("pre-migrate-to-2");
  });

  it("listMigrations returns migrations sorted by from version", () => {
    const engine = buildEngine();
    const migs = engine.listMigrations();
    expect(migs.map((m) => m.from)).toEqual([1, 2]);
    expect(migs.map((m) => m.to)).toEqual([2, 3]);
  });

  it("FAIL: non-consecutive migration rejected", () => {
    const engine = new SchemaMigrationRollbackEngine();
    expect(() => engine.registerMigration({
      from: 1,
      to: 3,
      up: (x) => x,
      down: (x) => x,
    })).toThrow(/must step by \+1/);
  });

  it("FAIL: missing migration in chain throws on migrate", () => {
    const engine = new SchemaMigrationRollbackEngine();
    engine.registerMigration<V1>({
      from: 1,
      to: 2,
      up: (v) => v,
      down: (v) => v,
    });
    expect(() => engine.migrate("s.json", { version: 1 } as unknown as V1, 1, 4))
      .toThrow(/no migration registered for 2/);
  });

  it("FAIL: migrate with toVersion less than fromVersion rejected", () => {
    const engine = buildEngine();
    expect(() => engine.migrate("s.json", { version: 3 } as unknown as V3, 3, 1))
      .toThrow(/use rollback/);
  });

  it("FAIL: rollback with toVersion greater than fromVersion rejected", () => {
    const engine = buildEngine();
    expect(() => engine.rollback("s.json", { version: 1 } as unknown as V1, 1, 3))
      .toThrow(/toVersion must be <= fromVersion/);
  });

  it("FAIL: snapshot with non-integer version rejected", () => {
    const engine = buildEngine();
    expect(() => engine.snapshot("s.json", {}, 2.5)).toThrow(/integer version/);
  });

  it("FAIL: restoreFromSnapshot with unknown id throws", () => {
    const engine = buildEngine();
    expect(() => engine.restoreFromSnapshot("no-such-snap")).toThrow(/unknown snapshot/);
  });

  it("ADV: reset clears migrations, snapshots, and history", () => {
    const engine = buildEngine();
    engine.snapshot("s.json", { v: 1 }, 1);
    engine.reset();
    expect(engine.listMigrations().length).toBe(0);
    expect(engine.historyFor("s.json").length).toBe(0);
  });

  it("ADV: migration does not mutate the input object", () => {
    const engine = buildEngine();
    const v1: V1 = { version: 1, count: 5 };
    const frozen = JSON.stringify(v1);
    engine.migrate("s.json", v1, 1, 3);
    expect(JSON.stringify(v1)).toBe(frozen);
  });
});
