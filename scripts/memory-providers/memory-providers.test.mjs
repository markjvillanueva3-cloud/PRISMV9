/**
 * Tests for U-MWO05 MemoryProvider ABC + 3 concrete implementations.
 *
 * U-MWO05 (slot:bravo 2026-05-26). Real concrete-value assertions only.
 *
 * Coverage:
 *   - ABC: validateContract / AbstractMethodError / abstract-method enforcement
 *   - ObsidianFeedProvider: list / read / write / delete / stats via mock fs
 *   - ObsidianReceiptProvider: list/read passthrough; write/delete stage bundles
 *   - PrismKGProvider: in-memory CRUD + stats
 *   - Cross-contract conformance: every concrete instance validates against ABC
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  AbstractMethodError,
  MemoryProvider,
  validateContract,
} from "./memory-provider-abc.mjs";
import { ObsidianFeedProvider, DEFAULT_MEMORY_DIR } from "./obsidian-feed-provider.mjs";
import { ObsidianReceiptProvider } from "./obsidian-receipt-provider.mjs";
import { PrismKGProvider } from "./prism-kg-provider.mjs";

// ─── ABC ──────────────────────────────────────────────────────────────────
describe("MemoryProvider ABC", () => {
  it("requiredMethods lists the 6 verbs", () => {
    assert.deepEqual(
      MemoryProvider.requiredMethods,
      ["list", "read", "write", "delete", "stats", "providerName"],
    );
  });

  it("calling abstract methods throws AbstractMethodError", async () => {
    const abc = new MemoryProvider();
    assert.throws(() => abc.providerName(), AbstractMethodError);
    await assert.rejects(() => abc.list(), AbstractMethodError);
    await assert.rejects(() => abc.read("x"), AbstractMethodError);
    await assert.rejects(() => abc.write("x", "y"), AbstractMethodError);
    await assert.rejects(() => abc.delete("x"), AbstractMethodError);
    await assert.rejects(() => abc.stats(), AbstractMethodError);
  });

  it("AbstractMethodError carries methodName property", () => {
    try { new MemoryProvider().providerName(); assert.fail("should throw"); }
    catch (e) {
      assert.equal(e.name, "AbstractMethodError");
      assert.equal(e.methodName, "providerName");
    }
  });

  it("validateContract reports missing methods", () => {
    const incomplete = { list: () => {}, read: () => {} };
    const r = validateContract(incomplete, MemoryProvider.requiredMethods);
    assert.equal(r.ok, false);
    assert.deepEqual(r.missing.sort(), ["delete", "providerName", "stats", "write"].sort());
  });

  it("validateContract accepts complete instance", () => {
    const complete = {
      list: () => {}, read: () => {}, write: () => {},
      delete: () => {}, stats: () => {}, providerName: () => {},
    };
    const r = validateContract(complete, MemoryProvider.requiredMethods);
    assert.equal(r.ok, true);
    assert.deepEqual(r.missing, []);
  });
});

// ─── ObsidianFeedProvider ─────────────────────────────────────────────────
describe("ObsidianFeedProvider", () => {
  function makeMockFs(initial = {}) {
    const norm = (p) => String(p).replace(/[/\\]+/g, "/").replace(/\/$/, "");
    const store = new Map();
    for (const [k, v] of Object.entries(initial)) store.set(norm(k), Buffer.from(v));
    return {
      _store: store,
      _norm: norm,
      readdirSync(dir) {
        const prefix = norm(dir) + "/";
        const out = new Set();
        for (const k of store.keys()) {
          if (k.startsWith(prefix)) out.add(k.slice(prefix.length).split("/")[0]);
        }
        return [...out];
      },
      statSync(p) {
        const k = norm(p);
        if (!store.has(k)) throw new Error(`ENOENT ${p}`);
        return { size: store.get(k).length, mtimeMs: 1700000000000 };
      },
      readFileSync(p, enc) {
        const k = norm(p);
        if (!store.has(k)) throw new Error(`ENOENT ${p}`);
        const v = store.get(k);
        return enc === "utf8" ? v.toString("utf8") : v;
      },
      writeFileSync(p, content) { store.set(norm(p), Buffer.from(String(content))); },
      mkdirSync() { /* no-op */ },
      unlinkSync(p) {
        const k = norm(p);
        if (!store.has(k)) throw new Error(`ENOENT ${p}`);
        store.delete(k);
      },
    };
  }

  it("DEFAULT_MEMORY_DIR resolves to a non-empty path", () => {
    assert.ok(typeof DEFAULT_MEMORY_DIR === "string");
    assert.ok(DEFAULT_MEMORY_DIR.length > 0);
  });

  it("providerName is 'obsidian-feed'", () => {
    const p = new ObsidianFeedProvider({ memoryDir: "/mem", fsImpl: makeMockFs() });
    assert.equal(p.providerName(), "obsidian-feed");
  });

  it("list/read/write/delete round-trip", async () => {
    const fsImpl = makeMockFs({ "/mem/alpha.md": "alpha-body" });
    const p = new ObsidianFeedProvider({ memoryDir: "/mem", fsImpl });
    const list = await p.list();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, "alpha.md");
    assert.equal(list[0].bytes, "alpha-body".length);
    const read = await p.read("alpha.md");
    assert.equal(read.id, "alpha.md");
    assert.equal(read.content, "alpha-body");
    const w = await p.write("beta.md", "beta-body");
    assert.equal(w.written, true);
    assert.equal(w.bytes, "beta-body".length);
    assert.equal((await p.list()).length, 2);
    const d = await p.delete("alpha.md");
    assert.equal(d.deleted, true);
    assert.equal((await p.list()).length, 1);
  });

  it("read returns null for missing id", async () => {
    const p = new ObsidianFeedProvider({ memoryDir: "/mem", fsImpl: makeMockFs() });
    assert.equal(await p.read("missing.md"), null);
  });

  it("delete returns deleted:false for missing id", async () => {
    const p = new ObsidianFeedProvider({ memoryDir: "/mem", fsImpl: makeMockFs() });
    const r = await p.delete("missing.md");
    assert.equal(r.deleted, false);
  });

  it("stats aggregates count + totalBytes", async () => {
    const fsImpl = makeMockFs({ "/mem/a.md": "12345", "/mem/b.md": "678" });
    const p = new ObsidianFeedProvider({ memoryDir: "/mem", fsImpl });
    const s = await p.stats();
    assert.equal(s.count, 2);
    assert.equal(s.totalBytes, 8);
    assert.equal(s.providerName, "obsidian-feed");
    assert.ok(typeof s.lastSync === "string");
  });
});

// ─── ObsidianReceiptProvider ──────────────────────────────────────────────
describe("ObsidianReceiptProvider", () => {
  function makeMockFs() {
    const norm = (p) => String(p).replace(/[/\\]+/g, "/").replace(/\/$/, "");
    const store = new Map();
    return {
      _store: store,
      _norm: norm,
      readdirSync() { return []; },
      statSync() { throw new Error("ENOENT"); },
      readFileSync(p) { const k = norm(p); if (!store.has(k)) throw new Error("ENOENT"); return store.get(k); },
      writeFileSync(p, content) { store.set(norm(p), Buffer.from(String(content))); },
      mkdirSync() { /* no-op */ },
      unlinkSync() { /* no-op */ },
    };
  }

  it("providerName is 'obsidian-receipt'", () => {
    assert.equal(new ObsidianReceiptProvider({ fsImpl: makeMockFs() }).providerName(), "obsidian-receipt");
  });

  it("write stages a 4-file receipt bundle and returns staged:true", async () => {
    const fsImpl = makeMockFs();
    const p = new ObsidianReceiptProvider({
      memoryDir: "/mem",
      artifactsRoot: "/state/dream-artifacts",
      fsImpl,
      now: () => Date.UTC(2026, 4, 26),
    });
    const r = await p.write("alpha.md", "body");
    assert.equal(r.written, false);
    assert.equal(r.staged, true);
    assert.ok(r.artifact_id.startsWith("receipt-alpha-"));
    // 4 files written under bundle dir
    const dirNorm = fsImpl._norm(path.join("/state/dream-artifacts", r.artifact_id));
    const written = [...fsImpl._store.keys()].filter((k) => k.startsWith(dirNorm));
    assert.equal(written.length, 4);
    // manifest is valid JSON with status=staged
    const manifest = JSON.parse(fsImpl._store.get(dirNorm + "/manifest.json").toString("utf8"));
    assert.equal(manifest.status, "staged");
    assert.equal(manifest.created_by, "obsidian-receipt-provider");
    // proposal mutation_type=write, risk_class=memory
    const proposal = JSON.parse(fsImpl._store.get(dirNorm + "/proposals.jsonl").toString("utf8").trim());
    assert.equal(proposal.mutation_type, "write");
    assert.equal(proposal.risk_class, "memory");
    assert.equal(proposal.after_content, "body");
  });

  it("delete stages a delete-proposal bundle and returns staged:true", async () => {
    const fsImpl = makeMockFs();
    const p = new ObsidianReceiptProvider({
      memoryDir: "/mem",
      artifactsRoot: "/state/dream-artifacts",
      fsImpl,
      now: () => Date.UTC(2026, 4, 26),
    });
    const r = await p.delete("alpha.md");
    assert.equal(r.deleted, false);
    assert.equal(r.staged, true);
    assert.ok(r.artifact_id.startsWith("receipt-del-alpha-"));
    const dirNorm = fsImpl._norm(path.join("/state/dream-artifacts", r.artifact_id));
    const proposal = JSON.parse(fsImpl._store.get(dirNorm + "/proposals.jsonl").toString("utf8").trim());
    assert.equal(proposal.mutation_type, "delete");
  });

  it("stats overrides providerName to 'obsidian-receipt'", async () => {
    const p = new ObsidianReceiptProvider({ memoryDir: "/mem", artifactsRoot: "/r", fsImpl: makeMockFs() });
    const s = await p.stats();
    assert.equal(s.providerName, "obsidian-receipt");
  });
});

// ─── PrismKGProvider ──────────────────────────────────────────────────────
describe("PrismKGProvider", () => {
  it("providerName is 'prism-kg'", () => {
    assert.equal(new PrismKGProvider().providerName(), "prism-kg");
  });

  it("write/read/list/delete in-memory CRUD", async () => {
    const p = new PrismKGProvider({ now: () => Date.UTC(2026, 4, 26) });
    const w = await p.write("alpha", "alpha-body");
    assert.equal(w.written, true);
    assert.equal(w.bytes, "alpha-body".length);
    const r = await p.read("alpha");
    assert.equal(r.content, "alpha-body");
    assert.equal(r.metadata.bytes, "alpha-body".length);
    const list = await p.list();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, "alpha");
    const d = await p.delete("alpha");
    assert.equal(d.deleted, true);
    const d2 = await p.delete("alpha");
    assert.equal(d2.deleted, false);
    assert.equal((await p.list()).length, 0);
  });

  it("read returns null for missing id", async () => {
    const p = new PrismKGProvider();
    assert.equal(await p.read("nope"), null);
  });

  it("stats reports count + totalBytes accurately", async () => {
    const p = new PrismKGProvider({ now: () => Date.UTC(2026, 4, 26) });
    await p.write("a", "12345");
    await p.write("b", "678");
    const s = await p.stats();
    assert.equal(s.count, 2);
    assert.equal(s.totalBytes, 8);
    assert.equal(s.providerName, "prism-kg");
  });

  it("write preserves metadata for read()", async () => {
    const p = new PrismKGProvider();
    await p.write("x", "body", { source: "test", tag: "foo" });
    const r = await p.read("x");
    assert.equal(r.metadata.source, "test");
    assert.equal(r.metadata.tag, "foo");
  });
});

// ─── Cross-contract conformance ───────────────────────────────────────────
describe("All 3 providers conform to MemoryProvider ABC", () => {
  it("every concrete implementation implements all required methods", () => {
    const feed = new ObsidianFeedProvider({ memoryDir: "/m", fsImpl: { readdirSync: () => [], statSync: () => ({}), readFileSync: () => "", writeFileSync: () => {}, mkdirSync: () => {}, unlinkSync: () => {} } });
    const receipt = new ObsidianReceiptProvider({ memoryDir: "/m", artifactsRoot: "/r", fsImpl: { writeFileSync: () => {}, mkdirSync: () => {} } });
    const kg = new PrismKGProvider();
    for (const [name, instance] of [["feed", feed], ["receipt", receipt], ["kg", kg]]) {
      const r = validateContract(instance, MemoryProvider.requiredMethods);
      assert.equal(r.ok, true, `${name}: missing=${r.missing.join(",")}`);
    }
  });

  it("each providerName is unique", () => {
    const names = new Set([
      new ObsidianFeedProvider({ memoryDir: "/m", fsImpl: { readdirSync: () => [] } }).providerName(),
      new ObsidianReceiptProvider({ memoryDir: "/m", artifactsRoot: "/r", fsImpl: {} }).providerName(),
      new PrismKGProvider().providerName(),
    ]);
    assert.equal(names.size, 3);
  });
});
