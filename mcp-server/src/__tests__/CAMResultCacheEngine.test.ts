/**
 * CAMResultCacheEngine — strict-legitimacy tests
 * Coverage: class shape, FNV-1a key determinism, set/get/has, TTL expiry,
 * LRU eviction, namespace clear, stats, adversarial inputs.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMResultCacheEngine,
  camResultCacheEngine,
} from "../engines/CAMResultCacheEngine.js";

const DEFAULT_TTL_MS_30MIN = 30 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 1000;
const SMALL_CAPACITY = 3;
const TINY_TTL_MS = 5;
const NAMESPACE_DEFAULT = "default";
const NAMESPACE_TURNING = "turning";
const NAMESPACE_MILLING = "milling";
const FNV_HEX_LEN = 8;

describe("CAMResultCacheEngine — class shape", () => {
  it("exposes name + version + defaults on instance", () => {
    const e = new CAMResultCacheEngine();
    expect(e.name).toBe("CAMResultCacheEngine");
    expect(e.version).toBe("1.0.0");
    expect(e.maxEntries).toBe(DEFAULT_MAX_ENTRIES);
    expect(e.defaultTTL).toBe(DEFAULT_TTL_MS_30MIN);
  });

  it("singleton export is the same class with default options", () => {
    expect(camResultCacheEngine.name).toBe("CAMResultCacheEngine");
    expect(camResultCacheEngine.maxEntries).toBe(DEFAULT_MAX_ENTRIES);
    expect(camResultCacheEngine.defaultTTL).toBe(DEFAULT_TTL_MS_30MIN);
  });

  it("constructor honours explicit options", () => {
    const e = new CAMResultCacheEngine({ max_entries: 7, default_ttl_ms: 1234 });
    expect(e.maxEntries).toBe(7);
    expect(e.defaultTTL).toBe(1234);
  });
});

describe("CAMResultCacheEngine — computeKey", () => {
  it("is deterministic and order-independent for object params", () => {
    const e = new CAMResultCacheEngine();
    const k1 = e.computeKey({ b: 2, a: 1, c: { z: 9, y: 8 } });
    const k2 = e.computeKey({ a: 1, b: 2, c: { y: 8, z: 9 } });
    expect(k1).toBe(k2);
  });

  it("produces 8-hex-char FNV-1a hash with namespace prefix", () => {
    const e = new CAMResultCacheEngine();
    const key = e.computeKey({ x: 1 }, NAMESPACE_TURNING);
    expect(key.startsWith(`${NAMESPACE_TURNING}:`)).toBe(true);
    const hash = key.slice(NAMESPACE_TURNING.length + 1);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(hash.length).toBe(FNV_HEX_LEN);
  });

  it("differs for distinct params", () => {
    const e = new CAMResultCacheEngine();
    expect(e.computeKey({ x: 1 })).not.toBe(e.computeKey({ x: 2 }));
  });

  it("treats numbers ±1e-7 as the same key (rounding to 1e-6)", () => {
    const e = new CAMResultCacheEngine();
    const k1 = e.computeKey({ feed: 1.0000001 });
    const k2 = e.computeKey({ feed: 1.0000002 });
    expect(k1).toBe(k2);
  });
});

describe("CAMResultCacheEngine — set/get/has round-trip", () => {
  let cache: CAMResultCacheEngine;
  beforeEach(() => {
    cache = new CAMResultCacheEngine({ max_entries: SMALL_CAPACITY });
  });

  it("returns the stored value on get", () => {
    cache.set("k1", { result: "ok", n: 42 });
    const v = cache.get<{ result: string; n: number }>("k1");
    expect(v).not.toBe(undefined);
    expect(v!.result).toBe("ok");
    expect(v!.n).toBe(42);
  });

  it("has() returns true for live entries, false otherwise", () => {
    cache.set("alive", "v");
    expect(cache.has("alive")).toBe(true);
    expect(cache.has("missing")).toBe(false);
  });

  it("update-in-place keeps single entry and refreshes value", () => {
    cache.set("dup", "first");
    cache.set("dup", "second");
    expect(cache.get("dup")).toBe("second");
    expect(cache.stats().entries).toBe(1);
  });
});

describe("CAMResultCacheEngine — TTL expiry", () => {
  it("returns undefined after expiry and increments misses", async () => {
    const cache = new CAMResultCacheEngine({ max_entries: 5 });
    cache.set("transient", "hello", TINY_TTL_MS);
    await new Promise((r) => setTimeout(r, TINY_TTL_MS + 10));
    expect(cache.get("transient")).toBe(undefined);
    expect(cache.stats().misses).toBe(1);
  });

  it("has() removes expired entries on access", async () => {
    const cache = new CAMResultCacheEngine({ max_entries: 5 });
    cache.set("ephemeral", "v", TINY_TTL_MS);
    await new Promise((r) => setTimeout(r, TINY_TTL_MS + 10));
    expect(cache.has("ephemeral")).toBe(false);
    expect(cache.stats().entries).toBe(0);
  });
});

describe("CAMResultCacheEngine — LRU eviction", () => {
  it("evicts oldest insertion when at capacity", () => {
    const cache = new CAMResultCacheEngine({ max_entries: SMALL_CAPACITY });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4); // forces eviction of "a"
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.has("d")).toBe(true);
    expect(cache.stats().evictions).toBe(1);
  });

  it("recently-accessed entry is preserved on next eviction", () => {
    const cache = new CAMResultCacheEngine({ max_entries: SMALL_CAPACITY });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.get("a"); // touch a → moves to end
    cache.set("d", 4); // should evict "b" (now oldest)
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
    expect(cache.has("d")).toBe(true);
  });
});

describe("CAMResultCacheEngine — invalidate + clear", () => {
  it("invalidate removes the entry and returns true; missing returns false", () => {
    const cache = new CAMResultCacheEngine();
    cache.set("foo", "bar");
    expect(cache.invalidate("foo")).toBe(true);
    expect(cache.has("foo")).toBe(false);
    expect(cache.invalidate("foo")).toBe(false);
  });

  it("clear() with no namespace empties everything", () => {
    const cache = new CAMResultCacheEngine();
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.stats().entries).toBe(0);
  });

  it("clear(namespace) removes only that namespace", () => {
    const cache = new CAMResultCacheEngine();
    cache.set("a", 1, undefined, NAMESPACE_TURNING);
    cache.set("b", 2, undefined, NAMESPACE_MILLING);
    cache.set("c", 3, undefined, NAMESPACE_TURNING);
    cache.clear(NAMESPACE_TURNING);
    expect(cache.has("a")).toBe(false);
    expect(cache.has("c")).toBe(false);
    expect(cache.has("b")).toBe(true);
  });
});

describe("CAMResultCacheEngine — stats", () => {
  it("hit_rate_pct reflects actual ratio", () => {
    const cache = new CAMResultCacheEngine();
    cache.set("k", "v");
    cache.get("k");      // hit
    cache.get("k");      // hit
    cache.get("missing"); // miss
    const s = cache.stats();
    expect(s.hits).toBe(2);
    expect(s.misses).toBe(1);
    expect(s.hit_rate_pct).toBe(67); // round(2/3 * 100)
  });

  it("namespace counts and total_size_bytes are reported", () => {
    const cache = new CAMResultCacheEngine();
    cache.set("a", "small", undefined, NAMESPACE_TURNING);
    cache.set("b", "longer-string-payload", undefined, NAMESPACE_MILLING);
    const s = cache.stats();
    expect(s.entries).toBe(2);
    expect(s.namespaces[NAMESPACE_TURNING]).toBe(1);
    expect(s.namespaces[NAMESPACE_MILLING]).toBe(1);
    expect(s.total_size_bytes).toBeGreaterThan(0);
    expect(s.memory_kb).toBe(Math.round(s.total_size_bytes / 1024));
  });

  it("hit_rate_pct is 0 when no traffic", () => {
    const cache = new CAMResultCacheEngine();
    expect(cache.stats().hit_rate_pct).toBe(0);
  });
});

describe("CAMResultCacheEngine — adversarial inputs", () => {
  it("handles unicode + control chars in key params", () => {
    const cache = new CAMResultCacheEngine();
    const k = cache.computeKey({ name: "桜🌸\x00\n" });
    expect(k.length).toBeGreaterThan(NAMESPACE_DEFAULT.length + 1);
    cache.set(k, "unicode-payload");
    expect(cache.get(k)).toBe("unicode-payload");
  });

  it("handles deeply nested + array params without infinite loop", () => {
    const cache = new CAMResultCacheEngine();
    const params = {
      ops: [
        { tool: 12, points: [{ x: 1.0, y: 2.0, z: 3.0 }] },
        { tool: 14, points: [{ x: 4.0, y: 5.0, z: 6.0 }] },
      ],
    };
    const k = cache.computeKey(params);
    cache.set(k, "deep");
    expect(cache.get(k)).toBe("deep");
  });

  it("get on never-set key returns undefined and counts a miss", () => {
    const cache = new CAMResultCacheEngine();
    expect(cache.get("never-set")).toBe(undefined);
    expect(cache.stats().misses).toBe(1);
  });

  it("computeKey survives null and Infinity values without throwing", () => {
    const cache = new CAMResultCacheEngine();
    const k = cache.computeKey({ a: null, b: Infinity, c: -Infinity });
    expect(k.startsWith(`${NAMESPACE_DEFAULT}:`)).toBe(true);
  });
});
