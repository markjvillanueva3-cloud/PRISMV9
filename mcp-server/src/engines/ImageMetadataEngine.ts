/**
 * ImageMetadataEngine — HCAP08 image metadata structural model.
 *
 * Pure-core: caller drives EXIF/dimension extraction and supplies a
 * `RawImageMetadata` blob; engine validates + normalizes to typed structure
 * (dimensions, orientation, color depth, mime type, optional GPS).
 *
 * @module engines/ImageMetadataEngine
 */

import { z } from "zod";

export const ImageMimeSchema = z.enum(["image/jpeg", "image/png", "image/gif", "image/webp", "image/tiff", "image/bmp", "image/svg+xml"]);
export type ImageMime = z.infer<typeof ImageMimeSchema>;

export const RawImageMetadataSchema = z.object({
  document_id: z.string().min(1).max(120),
  width_px: z.number().int().min(1).max(1_000_000),
  height_px: z.number().int().min(1).max(1_000_000),
  mime_type: ImageMimeSchema,
  color_depth_bits: z.number().int().min(1).max(64),
  orientation: z.number().int().min(1).max(8).default(1),
  has_alpha: z.boolean().default(false),
  size_bytes: z.number().int().min(0),
  gps_lat: z.number().refine((v) => Number.isFinite(v) && v >= -90 && v <= 90, {}).optional(),
  gps_lon: z.number().refine((v) => Number.isFinite(v) && v >= -180 && v <= 180, {}).optional(),
});
export type RawImageMetadata = z.infer<typeof RawImageMetadataSchema>;

export interface ImageStructure extends RawImageMetadata {
  aspect_ratio: number;
  pixel_count: number;
  density_bytes_per_pixel: number;
  has_gps: boolean;
}

export class ImageMetadataEngine {
  static validate(m: unknown): RawImageMetadata { return RawImageMetadataSchema.parse(m); }

  static analyze(raw: RawImageMetadata): ImageStructure {
    const m = RawImageMetadataSchema.parse(raw);
    const pixel_count = m.width_px * m.height_px;
    return {
      ...m,
      aspect_ratio: m.width_px / m.height_px,
      pixel_count,
      density_bytes_per_pixel: pixel_count === 0 ? 0 : m.size_bytes / pixel_count,
      has_gps: m.gps_lat !== undefined && m.gps_lon !== undefined,
    };
  }

  /** Strip GPS coordinates (PII redaction surface). */
  static stripGPS(m: RawImageMetadata): RawImageMetadata {
    return RawImageMetadataSchema.parse({ ...m, gps_lat: undefined, gps_lon: undefined });
  }

  static renderStructure(s: ImageStructure): string {
    return `[IMG ${s.document_id}] ${s.width_px}×${s.height_px} ${s.mime_type} ${s.color_depth_bits}bpp ratio=${s.aspect_ratio.toFixed(3)} px=${s.pixel_count} gps=${s.has_gps}`;
  }
}

export const imageMetadataEngine = ImageMetadataEngine;
