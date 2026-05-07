/**
 * CADPreviewThumbnailCacheEngine.test.ts — U-FS-10 (PHASE-47)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADPreviewThumbnailCacheEngine,
  type ThumbnailFS,
  type ThumbnailRenderer,
} from "../engines/CADPreviewThumbnailCacheEngine.js";

const HASH = (c: string) => c.repeat(64);

function makeStubFS(): ThumbnailFS & {
  writes: Record<string, Uint8Array>;
  dirs: Set<string>;
  unlinkCount: number;
} {
  const writes: Record<string, Uint8Array> = {};
  const dirs = new Set<string>();
  let unlinkCount = 0;
  return {
    existsSync: (p: string) => p in writes || dirs.has(p),
    readFileSync: (p: string) => writes[p] ?? new Uint8Array(0),
    writeFileSync: (p: string, d: string | Uint8Array) => {
      writes[p] = typeof d === "string" ? new TextEncoder().encode(d) : d;
    },
    mkdirSync: (p: string) => {
      dirs.add(p);
    },
    unlinkSync: (p: string) => {
      delete writes[p];
      unlinkCount++;
    },
    statSync: (p: string) => ({ size: writes[p]?.length ?? 0 }),
    writes,
    dirs,
    get unlinkCount() {
      return unlinkCount;
    },
  };
}

function makeRenderer(): ThumbnailRenderer & { calls: number } {
  let calls = 0;
  return {
    render: () => {
      calls++;
      return new Uint8Array([0x89, 0x50, 0x4e, 0x47, calls]);
    },
    get calls() {
      return calls;
    },
  };
}

describe("CADPreviewThumbnailCacheEngine (U-FS-10)", () => {
  let eng: CADPreviewThumbnailCacheEngine;
  let fs: ReturnType<typeof makeStubFS>;
  let renderer: ReturnType<typeof makeRenderer>;

  beforeEach(() => {
    eng = new CADPreviewThumbnailCacheEngine({
      root: "test/thumb",
      clock: { now: () => "2026-04-19T00:00:00Z" },
    });
    fs = makeStubFS();
    renderer = makeRenderer();
  });

  describe("path allocation", () => {
    it("uses two-level bucketing by first 2 hex chars", () => {
      const p = eng.pathFor(HASH("a"), "hero_3d");
      expect(p).toBe(`test/thumb/aa/${HASH("a")}/hero_3d.png`);
    });

    it("respects format suffix", () => {
      const p = eng.pathFor(HASH("a"), "2d_drawing", "svg");
      expect(p.endsWith("2d_drawing.svg")).toBe(true);
    });

    it("lowercases the hash", () => {
      const mixed = "A".repeat(64);
      const p = eng.pathFor(mixed, "hero_3d");
      expect(p).toBe(`test/thumb/aa/${"a".repeat(64)}/hero_3d.png`);
    });
  });

  describe("ensure + cache hit", () => {
    it("renders once then hits cache on second call", () => {
      const source = new Uint8Array([1, 2, 3]);
      eng.ensure(HASH("a"), "hero_3d", source, renderer, fs);
      eng.ensure(HASH("a"), "hero_3d", source, renderer, fs);
      expect(renderer.calls).toBe(1);
      expect(eng.size).toBe(1);
    });

    it("creates parent directory", () => {
      eng.ensure(HASH("a"), "hero_3d", new Uint8Array([0]), renderer, fs);
      expect(fs.dirs.has(`test/thumb/aa/${HASH("a")}`)).toBe(true);
    });

    it("records sizeBytes from stat", () => {
      const e = eng.ensure(HASH("a"), "hero_3d", new Uint8Array([0]), renderer, fs);
      expect(e.sizeBytes).toBe(5); // renderer returns 5-byte buffer
    });

    it("honors requested dimensions + format", () => {
      const e = eng.ensure(
        HASH("a"),
        "2d_drawing",
        new Uint8Array([0]),
        renderer,
        fs,
        { width: 256, height: 128, format: "jpg" },
      );
      expect(e.width).toBe(256);
      expect(e.height).toBe(128);
      expect(e.format).toBe("jpg");
      expect(e.path.endsWith("2d_drawing.jpg")).toBe(true);
    });
  });

  describe("get + has", () => {
    it("get returns undefined for missing", () => {
      expect(eng.get(HASH("a"), "hero_3d")).toBeUndefined();
      expect(eng.has(HASH("a"), "hero_3d")).toBe(false);
    });

    it("listByHash returns all views for a hash", () => {
      eng.ensure(HASH("a"), "hero_3d", new Uint8Array([0]), renderer, fs);
      eng.ensure(HASH("a"), "front", new Uint8Array([0]), renderer, fs);
      eng.ensure(HASH("b"), "hero_3d", new Uint8Array([0]), renderer, fs);
      expect(eng.listByHash(HASH("a")).length).toBe(2);
      expect(eng.listByHash(HASH("b")).length).toBe(1);
    });
  });

  describe("invalidation", () => {
    it("invalidateHash purges all views of one hash + deletes files", () => {
      eng.ensure(HASH("a"), "hero_3d", new Uint8Array([0]), renderer, fs);
      eng.ensure(HASH("a"), "front", new Uint8Array([0]), renderer, fs);
      eng.ensure(HASH("b"), "hero_3d", new Uint8Array([0]), renderer, fs);
      const removed = eng.invalidateHash(HASH("a"), fs);
      expect(removed).toBe(2);
      expect(eng.size).toBe(1);
      expect(fs.unlinkCount).toBe(2);
    });

    it("invalidate removes a single (hash, view)", () => {
      eng.ensure(HASH("a"), "hero_3d", new Uint8Array([0]), renderer, fs);
      const ok = eng.invalidate(HASH("a"), "hero_3d", fs);
      expect(ok).toBe(true);
      expect(eng.size).toBe(0);
    });

    it("invalidate on missing returns false", () => {
      expect(eng.invalidate(HASH("a"), "hero_3d", fs)).toBe(false);
    });

    it("clear wipes everything", () => {
      eng.ensure(HASH("a"), "hero_3d", new Uint8Array([0]), renderer, fs);
      eng.ensure(HASH("b"), "front", new Uint8Array([0]), renderer, fs);
      eng.clear(fs);
      expect(eng.size).toBe(0);
      expect(fs.unlinkCount).toBe(2);
    });
  });

  describe("LRU eviction", () => {
    it("evicts oldest when maxEntries exceeded", () => {
      const small = new CADPreviewThumbnailCacheEngine({
        root: "t",
        maxEntries: 2,
        clock: { now: () => "2026-01-01T00:00:00Z" },
      });
      small.ensure(HASH("a"), "hero_3d", new Uint8Array([0]), renderer, fs);
      small.ensure(HASH("b"), "hero_3d", new Uint8Array([0]), renderer, fs);
      small.ensure(HASH("c"), "hero_3d", new Uint8Array([0]), renderer, fs);
      expect(small.size).toBe(2);
      expect(small.has(HASH("a"), "hero_3d")).toBe(false); // oldest evicted
      expect(small.has(HASH("c"), "hero_3d")).toBe(true);
    });

    it("get() promotes recency so eviction skips recent hits", () => {
      const small = new CADPreviewThumbnailCacheEngine({
        root: "t",
        maxEntries: 2,
        clock: { now: () => "2026-01-01T00:00:00Z" },
      });
      small.ensure(HASH("a"), "hero_3d", new Uint8Array([0]), renderer, fs);
      small.ensure(HASH("b"), "hero_3d", new Uint8Array([0]), renderer, fs);
      small.get(HASH("a"), "hero_3d"); // A is now most recent
      small.ensure(HASH("c"), "hero_3d", new Uint8Array([0]), renderer, fs);
      expect(small.has(HASH("a"), "hero_3d")).toBe(true);
      expect(small.has(HASH("b"), "hero_3d")).toBe(false); // B evicted
    });
  });

  describe("stats", () => {
    it("aggregates entry count + total bytes + per-view breakdown", () => {
      eng.ensure(HASH("a"), "hero_3d", new Uint8Array([0]), renderer, fs);
      eng.ensure(HASH("a"), "front", new Uint8Array([0]), renderer, fs);
      eng.ensure(HASH("b"), "hero_3d", new Uint8Array([0]), renderer, fs);
      const s = eng.stats();
      expect(s.entryCount).toBe(3);
      expect(s.byView.hero_3d).toBe(2);
      expect(s.byView.front).toBe(1);
      expect(s.totalBytes).toBeGreaterThan(0);
    });
  });
});
