/**
 * Tests for MemorySyncEngine (PP-0.19-U-LLM8)
 *
 * Fake vector store backed by an in-memory map lets us exercise
 * export→disk→import→round-trip, schema guards, replace semantics,
 * and per-collection error surfacing without a live Qdrant.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { MemorySyncEngine, type MemoryCRDTEntry } from "../engines/MemorySyncEngine.js";
import type {
  QdrantVectorStoreEngine,
  CollectionSpec,
  UpsertPoint,
  Result,
} from "../engines/QdrantVectorStoreEngine.js";

interface StoredPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

function makeFakeStore(): QdrantVectorStoreEngine & {
  __seed: (c: string, pts: StoredPoint[]) => void;
  __get: (c: string) => StoredPoint[] | undefined;
  __failScrollFor?: Set<string>;
} {
  const collections = new Map<string, StoredPoint[]>();
  let connected = true;
  const failScrollFor = new Set<string>();

  const fake = {
    isConnected: () => connected,
    getConnectionOptions: () => ({ url: "http://localhost:6333" }),
    async scrollAll(name: string): Promise<Result<StoredPoint[]>> {
      if (failScrollFor.has(name)) {
        return { ok: false, error: "scroll rejected" };
      }
      return { ok: true, value: collections.get(name) ?? [] };
    },
    async ensureCollection(
      spec: CollectionSpec,
    ): Promise<Result<"created" | "exists">> {
      if (!collections.has(spec.name)) {
        collections.set(spec.name, []);
        return { ok: true, value: "created" };
      }
      return { ok: true, value: "exists" };
    },
    async deleteCollection(name: string): Promise<Result<boolean>> {
      collections.delete(name);
      return { ok: true, value: true };
    },
    async upsert(
      name: string,
      pts: readonly UpsertPoint[],
    ): Promise<Result<number>> {
      const list = collections.get(name) ?? [];
      for (const p of pts) {
        const idx = list.findIndex((q) => q.id === p.id);
        const stored: StoredPoint = {
          id: p.id,
          vector: [...p.vector],
          payload: p.payload,
        };
        if (idx >= 0) list[idx] = stored;
        else list.push(stored);
      }
      collections.set(name, list);
      return { ok: true, value: pts.length };
    },
    __seed(c: string, pts: StoredPoint[]) {
      collections.set(c, pts);
    },
    __get(c: string) {
      return collections.get(c);
    },
    __failScrollFor: failScrollFor,
    __setConnected(v: boolean) {
      connected = v;
    },
  } as unknown as QdrantVectorStoreEngine & {
    __seed: (c: string, pts: StoredPoint[]) => void;
    __get: (c: string) => StoredPoint[] | undefined;
    __failScrollFor: Set<string>;
    __setConnected(v: boolean): void;
  };
  return fake;
}

describe("MemorySyncEngine", () => {
  let dir: string;
  let store: ReturnType<typeof makeFakeStore>;
  let engine: MemorySyncEngine;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "prism-memsync-"));
    store = makeFakeStore();
    engine = new MemorySyncEngine({ store, machineName: "TEST-PC" });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("exportBundle writes a v1 bundle with points and metadata", async () => {
    store.__seed("prism_memory_tip", [
      { id: "t-1", vector: [0.1, 0.2], payload: { text: "thin wall" } },
      { id: "t-2", vector: [0.3, 0.4], payload: { text: "chatter" } },
    ]);
    const dest = path.join(dir, "bundle.json");
    const r = await engine.exportBundle({
      collections: ["prism_memory_tip"],
      destPath: dest,
      vectorSize: 2,
    });
    expect(r.ok).toBe(true);
    expect(r.totalPoints).toBe(2);
    const raw = JSON.parse(readFileSync(dest, "utf-8"));
    expect(raw.schemaVersion).toBe(1);
    expect(raw.source.machine).toBe("TEST-PC");
    expect(raw.collections.length).toBe(1);
    expect(raw.collections[0].points.length).toBe(2);
  });

  it("exportBundle fails when no collections requested", async () => {
    const r = await engine.exportBundle({
      collections: [],
      destPath: path.join(dir, "x.json"),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/required/);
  });

  it("exportBundle fails when store disconnected", async () => {
    (
      store as unknown as { __setConnected: (v: boolean) => void }
    ).__setConnected(false);
    const r = await engine.exportBundle({
      collections: ["prism_memory_tip"],
      destPath: path.join(dir, "x.json"),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not connected/);
  });

  it("exportBundle records per-collection errors and continues", async () => {
    store.__seed("prism_memory_tip", [{ id: "t", vector: [1], payload: {} }]);
    store.__failScrollFor.add("prism_memory_outcome");
    const dest = path.join(dir, "bundle.json");
    const r = await engine.exportBundle({
      collections: ["prism_memory_tip", "prism_memory_outcome"],
      destPath: dest,
      vectorSize: 1,
    });
    expect(r.ok).toBe(false);
    const perOutcome = r.perCollection.find(
      (c) => c.name === "prism_memory_outcome",
    );
    expect(perOutcome?.error).toMatch(/scroll rejected/);
    const perTip = r.perCollection.find((c) => c.name === "prism_memory_tip");
    expect(perTip?.points).toBe(1);
  });

  it("importBundle replays points into a fresh store", async () => {
    store.__seed("prism_memory_tip", [
      { id: "t-1", vector: [0.1, 0.2], payload: { text: "seed" } },
    ]);
    const dest = path.join(dir, "bundle.json");
    await engine.exportBundle({
      collections: ["prism_memory_tip"],
      destPath: dest,
      vectorSize: 2,
    });

    // Fresh store without the seed; import should recreate it.
    const store2 = makeFakeStore();
    const engine2 = new MemorySyncEngine({ store: store2, machineName: "B" });
    const r = await engine2.importBundle({ srcPath: dest });
    expect(r.ok).toBe(true);
    expect(r.totalUpserted).toBe(1);
    const pts = store2.__get("prism_memory_tip");
    expect(pts?.length).toBe(1);
    expect(pts?.[0].id).toBe("t-1");
  });

  it("importBundle rejects when schemaVersion mismatches", async () => {
    const dest = path.join(dir, "bad.json");
    writeFileSync(
      dest,
      JSON.stringify({
        schemaVersion: 99,
        createdAt: new Date().toISOString(),
        source: { host: null, machine: "X" },
        collections: [],
      }),
    );
    const r = await engine.importBundle({ srcPath: dest });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/schemaVersion/);
  });

  it("importBundle fails gracefully on missing file", async () => {
    const r = await engine.importBundle({
      srcPath: path.join(dir, "does-not-exist.json"),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("importBundle with replaceCollections wipes before upsert", async () => {
    store.__seed("prism_memory_tip", [
      { id: "keep", vector: [0.1], payload: {} },
    ]);
    const dest = path.join(dir, "bundle.json");
    await engine.exportBundle({
      collections: ["prism_memory_tip"],
      destPath: dest,
      vectorSize: 1,
    });

    // Mutate the current store so "keep" is gone
    store.__seed("prism_memory_tip", [
      { id: "stale", vector: [0.9], payload: {} },
    ]);

    const r = await engine.importBundle({
      srcPath: dest,
      replaceCollections: true,
    });
    expect(r.ok).toBe(true);
    const pts = store.__get("prism_memory_tip");
    expect(pts?.map((p) => p.id)).toEqual(["keep"]);
  });

  it("importBundle onlyCollections filter skips others", async () => {
    store.__seed("prism_memory_tip", [{ id: "t", vector: [0.1], payload: {} }]);
    store.__seed("prism_memory_outcome", [
      { id: "o", vector: [0.2], payload: {} },
    ]);
    const dest = path.join(dir, "bundle.json");
    await engine.exportBundle({
      collections: ["prism_memory_tip", "prism_memory_outcome"],
      destPath: dest,
      vectorSize: 1,
    });
    const store2 = makeFakeStore();
    const engine2 = new MemorySyncEngine({ store: store2 });
    const r = await engine2.importBundle({
      srcPath: dest,
      onlyCollections: ["prism_memory_outcome"],
    });
    expect(r.ok).toBe(true);
    expect(store2.__get("prism_memory_tip")).toBeUndefined();
    expect(store2.__get("prism_memory_outcome")?.length).toBe(1);
  });

  it("listBundles returns newest first", async () => {
    const a = path.join(dir, "a.json");
    const b = path.join(dir, "b.json");
    store.__seed("prism_memory_tip", [{ id: "1", vector: [1], payload: {} }]);
    await engine.exportBundle({
      collections: ["prism_memory_tip"],
      destPath: a,
      vectorSize: 1,
    });
    await new Promise((r) => setTimeout(r, 10));
    await engine.exportBundle({
      collections: ["prism_memory_tip"],
      destPath: b,
      vectorSize: 1,
    });
    const list = await engine.listBundles(dir);
    expect(list.length).toBe(2);
    expect(list[0].path).toBe(b);
    expect(list[1].path).toBe(a);
  });

  it("bundleMetadata returns summary without import", async () => {
    store.__seed("prism_memory_tip", [
      { id: "1", vector: [1], payload: {} },
      { id: "2", vector: [2], payload: {} },
    ]);
    const dest = path.join(dir, "bundle.json");
    await engine.exportBundle({
      collections: ["prism_memory_tip"],
      destPath: dest,
      vectorSize: 1,
    });
    const m = await engine.bundleMetadata(dest);
    expect(m).not.toBeNull();
    expect(m?.totalPoints).toBe(2);
    expect(m?.collections).toBe(1);
    expect(m?.sizeBytes).toBeGreaterThan(0);
  });

  it("bundleMetadata returns null for unreadable path", async () => {
    const m = await engine.bundleMetadata(path.join(dir, "nope.json"));
    expect(m).toBeNull();
  });

  it("listBundles on empty or missing dir returns []", async () => {
    const missing = path.join(dir, "nope");
    expect(await engine.listBundles(missing)).toEqual([]);
  });
});

describe("MemorySyncEngine CRDT mergeEntries (CPP-MS3-U-CPP22)", () => {
  const engine = new MemorySyncEngine({ store: makeFakeStore() });

  function entry(
    id: string,
    source: string,
    timestamp: string,
    content: unknown,
  ): MemoryCRDTEntry {
    return { entryId: id, source, timestamp, content };
  }

  it("set-unions distinct entryIds across 2 bundles", () => {
    const a = [entry("e1", "agent-A", "2026-04-17T00:00:00Z", "A1")];
    const b = [entry("e2", "agent-B", "2026-04-17T00:00:00Z", "B2")];
    const r = engine.mergeEntries([a, b]);
    expect(r.merged).toHaveLength(2);
    expect(r.merged.map((e) => e.entryId).sort()).toEqual(["e1", "e2"]);
    expect(r.distinctEntryIds).toBe(2);
    expect(r.conflictsResolved).toBe(0);
  });

  it("max-timestamp wins on conflict", () => {
    const older = [entry("e1", "agent-A", "2026-04-17T00:00:00Z", "old")];
    const newer = [entry("e1", "agent-B", "2026-04-17T01:00:00Z", "new")];
    const r = engine.mergeEntries([older, newer]);
    expect(r.merged).toHaveLength(1);
    expect(r.merged[0].content).toBe("new");
    expect(r.conflictsResolved).toBe(1);
  });

  it("reverse order of same inputs still gives same winner (commutative)", () => {
    const older = [entry("e1", "agent-A", "2026-04-17T00:00:00Z", "old")];
    const newer = [entry("e1", "agent-B", "2026-04-17T01:00:00Z", "new")];
    const forward = engine.mergeEntries([older, newer]).merged[0];
    const reverse = engine.mergeEntries([newer, older]).merged[0];
    expect(forward).toEqual(reverse);
  });

  it("equal timestamps — lexicographically smaller source wins (deterministic)", () => {
    const a = [entry("e1", "agent-B", "2026-04-17T00:00:00Z", "B-content")];
    const b = [entry("e1", "agent-A", "2026-04-17T00:00:00Z", "A-content")];
    const r1 = engine.mergeEntries([a, b]).merged[0];
    const r2 = engine.mergeEntries([b, a]).merged[0];
    expect(r1.source).toBe("agent-A");
    expect(r1.content).toBe("A-content");
    expect(r1).toEqual(r2); // commutative on equal timestamps too
  });

  it("idempotent: merge([x, x]) === merge([x])", () => {
    const x = [entry("e1", "agent-A", "2026-04-17T00:00:00Z", "v")];
    const single = engine.mergeEntries([x]);
    const doubled = engine.mergeEntries([x, x]);
    expect(doubled.merged).toEqual(single.merged);
  });

  it("associative: merge([merge([a,b]),c]) === merge([a,merge([b,c])])", () => {
    const a = [entry("e1", "A", "2026-04-17T00:00:00Z", "a1")];
    const b = [entry("e1", "B", "2026-04-17T02:00:00Z", "b1")];
    const c = [entry("e1", "C", "2026-04-17T01:00:00Z", "c1")];
    const left = engine.mergeEntries([engine.mergeEntries([a, b]).merged, c]).merged;
    const right = engine.mergeEntries([a, engine.mergeEntries([b, c]).merged]).merged;
    expect(left).toEqual(right);
    expect(left[0].content).toBe("b1"); // b has max timestamp
  });

  it("7-writer scenario: all distinct entries preserved, conflicts resolved", () => {
    // 7 agents each produce 3 entries: 2 distinct + 1 conflicting on e-shared
    const bundles: MemoryCRDTEntry[][] = [];
    for (let i = 0; i < 7; i++) {
      const agent = `agent-${String.fromCharCode(65 + i)}`;
      const timestamp = `2026-04-17T0${i}:00:00Z`;
      bundles.push([
        entry(`e-${agent}-1`, agent, timestamp, `${agent}-own-1`),
        entry(`e-${agent}-2`, agent, timestamp, `${agent}-own-2`),
        entry("e-shared", agent, timestamp, `${agent}-contribution`),
      ]);
    }

    const r = engine.mergeEntries(bundles);

    // 7 * 2 distinct + 1 shared = 15 unique entryIds
    expect(r.distinctEntryIds).toBe(15);
    expect(r.merged).toHaveLength(15);
    expect(r.inputCount).toBe(21); // 7 * 3

    // Shared entry: 6 conflicts resolved (7 inputs minus 1 winner)
    expect(r.conflictsResolved).toBe(6);

    // Winner of e-shared: agent-G had the latest timestamp (07:00:00)
    const shared = r.merged.find((e) => e.entryId === "e-shared");
    expect(shared).toBeDefined();
    expect(shared?.source).toBe("agent-G");
    expect(shared?.content).toBe("agent-G-contribution");

    // All agents' distinct entries survive
    for (let i = 0; i < 7; i++) {
      const agent = `agent-${String.fromCharCode(65 + i)}`;
      expect(r.merged.some((e) => e.entryId === `e-${agent}-1`)).toBe(true);
      expect(r.merged.some((e) => e.entryId === `e-${agent}-2`)).toBe(true);
    }
  });

  it("7-writer scenario is deterministic under any bundle order", () => {
    const bundles: MemoryCRDTEntry[][] = [];
    for (let i = 0; i < 7; i++) {
      const agent = `agent-${String.fromCharCode(65 + i)}`;
      bundles.push([entry("e-shared", agent, `2026-04-17T0${i}:00:00Z`, `${agent}-v`)]);
    }
    const forward = engine.mergeEntries(bundles).merged;
    const reverse = engine.mergeEntries([...bundles].reverse()).merged;
    const shuffled = engine.mergeEntries([bundles[3], bundles[0], bundles[6], bundles[1], bundles[4], bundles[2], bundles[5]]).merged;
    expect(forward).toEqual(reverse);
    expect(forward).toEqual(shuffled);
  });

  it("skips malformed entries (missing or empty entryId)", () => {
    const bundle = [
      entry("valid", "A", "2026-04-17T00:00:00Z", "ok"),
      { entryId: "", source: "A", timestamp: "2026-04-17T00:00:00Z", content: "no" } as MemoryCRDTEntry,
      null as unknown as MemoryCRDTEntry,
      undefined as unknown as MemoryCRDTEntry,
    ];
    const r = engine.mergeEntries([bundle]);
    expect(r.merged).toHaveLength(1);
    expect(r.merged[0].entryId).toBe("valid");
    expect(r.inputCount).toBe(4); // counted but filtered
  });

  it("returns deterministic entryId-sorted output for stable diffs", () => {
    const bundle = [
      entry("z-last", "A", "2026-04-17T00:00:00Z", ""),
      entry("a-first", "A", "2026-04-17T00:00:00Z", ""),
      entry("m-middle", "A", "2026-04-17T00:00:00Z", ""),
    ];
    const r = engine.mergeEntries([bundle]);
    expect(r.merged.map((e) => e.entryId)).toEqual(["a-first", "m-middle", "z-last"]);
  });

  it("handles empty and null bundles gracefully", () => {
    const r1 = engine.mergeEntries([]);
    expect(r1.merged).toEqual([]);
    expect(r1.inputCount).toBe(0);

    const r2 = engine.mergeEntries([[], [entry("e1", "A", "2026-04-17T00:00:00Z", "v")]]);
    expect(r2.merged).toHaveLength(1);

    // Non-array bundle slot: should be skipped, not crash
    const r3 = engine.mergeEntries([null as unknown as MemoryCRDTEntry[], [entry("e1", "A", "2026-04-17T00:00:00Z", "v")]]);
    expect(r3.merged).toHaveLength(1);
  });
});
