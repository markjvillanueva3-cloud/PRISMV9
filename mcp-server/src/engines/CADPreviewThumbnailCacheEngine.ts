/**
 * CADPreviewThumbnailCacheEngine — U-FS-10 (PHASE-47)
 *
 * Caches rendered 2D / 3D thumbnails keyed by (contentHash, view). Uses a
 * two-level bucketed path scheme to keep directory fan-out bounded:
 *     {root}/{h2}/{contentHash}/{view}.{format}
 * where h2 is the first two hex chars of the content hash (256 buckets).
 *
 * The engine does NOT render images itself — it manages lookup, path
 * allocation, invalidation, and LRU eviction. Actual rendering is delegated
 * to an injected `render(entry, sourceContent)` callback.
 *
 * @module engines/CADPreviewThumbnailCacheEngine
 */

import {
  ThumbnailEntrySchema,
  CacheStatsSchema,
  type ThumbnailEntry,
  type ThumbnailView,
  type ThumbnailFormat,
  type CacheStats,
} from "../schemas/cadThumbnailCacheSchema.js";

export interface ThumbnailFS {
  existsSync(path: string): boolean;
  readFileSync(path: string): string | Uint8Array;
  writeFileSync(path: string, data: string | Uint8Array): void;
  mkdirSync(path: string, opts?: { recursive?: boolean }): void;
  unlinkSync(path: string): void;
  statSync(path: string): { size: number };
}

export interface ThumbnailRenderer {
  render(
    entry: Pick<ThumbnailEntry, "contentHash" | "view" | "format" | "width" | "height">,
    source: Uint8Array,
  ): Uint8Array;
}

export interface ThumbnailClock {
  now(): string;
}

function keyOf(hash: string, view: ThumbnailView): string {
  return `${hash.toLowerCase()}::${view}`;
}

function joinPath(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/\/+$/g, "").replace(/^\/+/g, ""))
    .filter((p) => p.length > 0)
    .join("/");
}

export class CADPreviewThumbnailCacheEngine {
  private entries = new Map<string, ThumbnailEntry>();
  /** LRU order: oldest first, newest last. */
  private lruOrder: string[] = [];
  private maxEntries: number;
  private root: string;
  private clock: ThumbnailClock;

  constructor(opts: {
    root?: string;
    maxEntries?: number;
    clock?: ThumbnailClock;
  } = {}) {
    this.root = opts.root ?? "data/cad-thumbnails";
    this.maxEntries = opts.maxEntries ?? 10_000;
    this.clock = opts.clock ?? { now: () => new Date().toISOString() };
  }

  get size(): number {
    return this.entries.size;
  }

  // ── Path allocation ────────────────────────────────────────────────────────

  pathFor(
    contentHash: string,
    view: ThumbnailView,
    format: ThumbnailFormat = "png",
  ): string {
    const h = contentHash.toLowerCase();
    const bucket = h.slice(0, 2);
    return joinPath(this.root, bucket, h, `${view}.${format}`);
  }

  // ── Lookup ─────────────────────────────────────────────────────────────────

  get(contentHash: string, view: ThumbnailView): ThumbnailEntry | undefined {
    const k = keyOf(contentHash, view);
    const e = this.entries.get(k);
    if (e) this.touch(k);
    return e;
  }

  has(contentHash: string, view: ThumbnailView): boolean {
    return this.entries.has(keyOf(contentHash, view));
  }

  listByHash(contentHash: string): ThumbnailEntry[] {
    const h = contentHash.toLowerCase();
    return [...this.entries.values()].filter((e) => e.contentHash === h);
  }

  // ── Rendering + registration ───────────────────────────────────────────────

  /**
   * Ensure a thumbnail exists, rendering if missing. Uses the injected
   * renderer + fs. Idempotent: a fresh call on an already-cached entry is
   * a cache hit (no re-render).
   */
  ensure(
    contentHash: string,
    view: ThumbnailView,
    source: Uint8Array,
    renderer: ThumbnailRenderer,
    fs: ThumbnailFS,
    opts: { width?: number; height?: number; format?: ThumbnailFormat } = {},
  ): ThumbnailEntry {
    const k = keyOf(contentHash, view);
    const existing = this.entries.get(k);
    if (existing) {
      this.touch(k);
      return existing;
    }
    const format = opts.format ?? "png";
    const width = opts.width ?? 512;
    const height = opts.height ?? 512;
    const path = this.pathFor(contentHash, view, format);
    const bytes = renderer.render(
      { contentHash, view, format, width, height },
      source,
    );

    // Ensure parent dir exists
    const parentDir = path.substring(0, path.lastIndexOf("/"));
    if (parentDir && !fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(path, bytes);
    const sizeBytes = fs.statSync(path).size;

    const entry = ThumbnailEntrySchema.parse({
      contentHash: contentHash.toLowerCase(),
      view,
      format,
      width,
      height,
      path,
      renderedAt: this.clock.now(),
      sizeBytes,
    });
    this.entries.set(k, entry);
    this.lruOrder.push(k);
    this.evictIfNeeded(fs);
    return entry;
  }

  // ── Invalidation ───────────────────────────────────────────────────────────

  /** Remove all entries for a contentHash; called when content changes. */
  invalidateHash(contentHash: string, fs?: ThumbnailFS): number {
    const h = contentHash.toLowerCase();
    const removed: string[] = [];
    for (const [k, e] of this.entries) {
      if (e.contentHash === h) removed.push(k);
    }
    for (const k of removed) {
      const e = this.entries.get(k)!;
      if (fs && fs.existsSync(e.path)) fs.unlinkSync(e.path);
      this.entries.delete(k);
      const idx = this.lruOrder.indexOf(k);
      if (idx >= 0) this.lruOrder.splice(idx, 1);
    }
    return removed.length;
  }

  /** Remove a specific (hash, view). */
  invalidate(contentHash: string, view: ThumbnailView, fs?: ThumbnailFS): boolean {
    const k = keyOf(contentHash, view);
    const e = this.entries.get(k);
    if (!e) return false;
    if (fs && fs.existsSync(e.path)) fs.unlinkSync(e.path);
    this.entries.delete(k);
    const idx = this.lruOrder.indexOf(k);
    if (idx >= 0) this.lruOrder.splice(idx, 1);
    return true;
  }

  /** Clear everything. */
  clear(fs?: ThumbnailFS): void {
    if (fs) {
      for (const e of this.entries.values()) {
        if (fs.existsSync(e.path)) fs.unlinkSync(e.path);
      }
    }
    this.entries.clear();
    this.lruOrder = [];
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  stats(): CacheStats {
    const byView: Record<string, number> = {};
    let totalBytes = 0;
    for (const e of this.entries.values()) {
      byView[e.view] = (byView[e.view] ?? 0) + 1;
      totalBytes += e.sizeBytes;
    }
    return CacheStatsSchema.parse({
      entryCount: this.entries.size,
      totalBytes,
      byView,
    });
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private touch(k: string): void {
    const idx = this.lruOrder.indexOf(k);
    if (idx >= 0) {
      this.lruOrder.splice(idx, 1);
      this.lruOrder.push(k);
    }
  }

  private evictIfNeeded(fs: ThumbnailFS): void {
    while (this.lruOrder.length > this.maxEntries) {
      const oldest = this.lruOrder.shift()!;
      const e = this.entries.get(oldest);
      if (e && fs.existsSync(e.path)) fs.unlinkSync(e.path);
      this.entries.delete(oldest);
    }
  }
}

export const cadPreviewThumbnailCacheEngine = new CADPreviewThumbnailCacheEngine();
