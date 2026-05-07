/**
 * cadFormatConversionSchema — U-FS-09 (PHASE-47)
 *
 * Models the 25+ format conversion matrix with lossless vs lossy classification
 * and a quality report per lossy path.
 *
 * schemaVersion: 1.
 *
 * @module schemas/cadFormatConversionSchema
 */

import { z } from "zod";

// Supported formats (extensible — schema is open to new entries at runtime).
export const CAD_FORMATS = [
  // Neutral / exchange
  "step", "stp", "iges", "igs", "parasolid", "x_t", "x_b", "jt", "3dxml", "sat",
  // Native CAD
  "sldprt", "sldasm", "slddrw",
  "prt", "asm", "drw",              // NX / Creo
  "ipt", "iam", "idw",              // Inventor
  "catpart", "catproduct", "catdrawing",
  "f3d", "f3z",                     // Fusion
  "3dm",                            // Rhino
  // Mesh / visual
  "stl", "obj", "3mf", "ply",
  "gltf", "glb",
  // Drawing
  "dwg", "dxf", "pdf",
] as const;

export type CADFormat = (typeof CAD_FORMATS)[number];

// ── Classification of a single (from → to) conversion ────────────────────────

export const CONVERSION_QUALITIES = [
  "lossless",       // round-trips exactly
  "lossy_visual",   // preserves geometry, loses feature tree / params
  "lossy_geometry", // surface tessellation / approximation
  "lossy_metadata", // loses colors, materials, layers
  "unsupported",    // no conversion path exists
] as const;

export type ConversionQuality = (typeof CONVERSION_QUALITIES)[number];

export const ConversionEdgeSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    quality: z.enum(CONVERSION_QUALITIES),
    /** Human-readable caveat / loss description. */
    notes: z.string().default(""),
    /** Estimated geometric accuracy 0–1 (1 = lossless). */
    geometricAccuracy: z.number().min(0).max(1).default(1),
    /** Estimated semantic retention 0–1 (feature tree, parameters). */
    semanticRetention: z.number().min(0).max(1).default(1),
  })
  .strict();

export type ConversionEdge = z.infer<typeof ConversionEdgeSchema>;

// ── Quality report for a conversion attempt ─────────────────────────────────

export const ConversionReportSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    quality: z.enum(CONVERSION_QUALITIES),
    geometricAccuracy: z.number().min(0).max(1),
    semanticRetention: z.number().min(0).max(1),
    notes: z.string(),
    /** Rolled-up risk flag (green/yellow/red). */
    risk: z.enum(["green", "yellow", "red"]),
    /** Composite score blending geometric + semantic (weighted 0.6/0.4). */
    compositeScore: z.number().min(0).max(1),
  })
  .strict();

export type ConversionReport = z.infer<typeof ConversionReportSchema>;

// ── Magic-byte signature ─────────────────────────────────────────────────────

export const MagicByteSignatureSchema = z
  .object({
    format: z.string().min(1),
    /** Hex-encoded prefix (lowercase). */
    magicHex: z.string().regex(/^[0-9a-f]+$/),
    /** Offset in bytes (0 = start of file). */
    offset: z.number().int().nonnegative().default(0),
    /** Whether match requires case-insensitive ASCII fallback. */
    asciiPrefix: z.string().optional(),
  })
  .strict();

export type MagicByteSignature = z.infer<typeof MagicByteSignatureSchema>;

// ── Validity probe result ────────────────────────────────────────────────────

export const ValidityProbeSchema = z
  .object({
    sniffedFormat: z.string().optional(),
    extensionFormat: z.string().optional(),
    extensionMatch: z.boolean(),
    likelyValid: z.boolean(),
    notes: z.string().default(""),
  })
  .strict();

export type ValidityProbe = z.infer<typeof ValidityProbeSchema>;
