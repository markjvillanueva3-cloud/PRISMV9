/**
 * cadThumbnailCacheSchema — U-FS-10 (PHASE-47)
 *
 * Models the thumbnail cache keyed by (contentHash, view), with hash-bucketed
 * path scheme /cad-thumbnails/{h2}/{hash}/{view}.png for O(1) lookup and
 * balanced directory fan-out.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadThumbnailCacheSchema
 */

import { z } from "zod";

export const THUMBNAIL_VIEWS = [
  "2d_drawing",    // flat drawing preview (DXF, DWG, PDF)
  "hero_3d",       // default isometric pose
  "iso_top",       // isometric top-left
  "front",
  "top",
  "right",
  "bottom",
  "back",
  "left",
] as const;

export type ThumbnailView = (typeof THUMBNAIL_VIEWS)[number];

export const THUMBNAIL_FORMATS = ["png", "jpg", "webp", "svg"] as const;
export type ThumbnailFormat = (typeof THUMBNAIL_FORMATS)[number];

export const ThumbnailEntrySchema = z
  .object({
    /** SHA-256 content hash of the source CAD file (lowercase hex). */
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    view: z.enum(THUMBNAIL_VIEWS),
    format: z.enum(THUMBNAIL_FORMATS).default("png"),
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
    /** Relative storage path under the cache root. */
    path: z.string().min(1),
    /** ISO timestamp rendered. */
    renderedAt: z.string().min(1),
    /** Byte size (0 if not yet flushed to disk). */
    sizeBytes: z.number().int().nonnegative().default(0),
  })
  .strict();

export type ThumbnailEntry = z.infer<typeof ThumbnailEntrySchema>;

export const CacheStatsSchema = z
  .object({
    entryCount: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative(),
    byView: z.record(z.string(), z.number().int().nonnegative()),
  })
  .strict();

export type CacheStats = z.infer<typeof CacheStatsSchema>;
