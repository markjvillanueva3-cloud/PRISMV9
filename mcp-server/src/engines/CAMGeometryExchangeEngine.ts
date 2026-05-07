/**
 * CAMGeometryExchangeEngine — Geometry Transfer Protocol (U-CAM97)
 * =================================================================
 *
 * PHASE-7: Standardized geometry exchange between PRISM and the four CAM
 * plugin adapters (hyperMILL, Fusion 360, Inventor HSM, Mastercam X8).
 *
 * Supported formats:
 *   - STEP AP242 — ISO 10303-242, CAD-native part geometry
 *   - B-Rep JSON — PRISM canonical parametric boundary representation
 *   - STL binary — 80-byte header + triangle count + per-triangle 50 bytes
 *   - STL ASCII  — `solid ... endsolid` envelope
 *   - OBJ        — vertices + faces, Wavefront ASCII
 *   - PLY        — Stanford polygon format
 *
 * Streaming protocol:
 *   Large payloads (>100 MB) are split into fixed-size chunks of
 *   DEFAULT_CHUNK_SIZE (1 MB) or a caller-specified size up to
 *   MAX_CHUNK_SIZE (16 MB). Each chunk carries a monotonic `seq`, its own
 *   SHA-256, and an `is_final` flag on the last chunk. Receivers validate
 *   chunk ordering + per-chunk checksum, then re-verify the full payload
 *   checksum on assemble().
 *
 * Coupling with the hub (U-CAM96):
 *   This engine is transport-agnostic. It emits chunks as plain objects;
 *   callers wrap each chunk in a HubFrameEnvelope (or any other transport
 *   frame) and deliver it through the hub. This keeps the geometry layer
 *   decoupled from the overlay frame schema.
 *
 * References:
 *   - ISO 10303-242:2022 — Industrial automation systems — Managed model-based 3D engineering
 *   - Wavefront OBJ Format Specification (1991, Wavefront Technologies)
 *   - Turk, G. & Levoy, M. "The PLY Polygon File Format" (Stanford, 1994)
 *   - Chiang, J. STL binary format — 3D Systems, Inc. (1989)
 *
 * @module engines/CAMGeometryExchangeEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM97
 */

import { createHash } from "node:crypto";
import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const GeometryFormatSchema = z.enum([
  "step_ap242",
  "brep_json",
  "stl_binary",
  "stl_ascii",
  "obj",
  "ply",
]);
export type GeometryFormat = z.infer<typeof GeometryFormatSchema>;

export const GeometryUnitsSchema = z.enum(["mm", "inch", "m"]);
export type GeometryUnits = z.infer<typeof GeometryUnitsSchema>;

/** Optional metadata carried alongside a geometry payload. */
export const GeometryMetadataSchema = z.object({
  units: GeometryUnitsSchema.default("mm"),
  bbox: z
    .object({
      min: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      max: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    })
    .optional(),
  triangle_count: z.number().int().nonnegative().optional(),
  vertex_count: z.number().int().nonnegative().optional(),
  source: z.string().optional(),
});
export type GeometryMetadata = z.infer<typeof GeometryMetadataSchema>;

/** Input used to register a geometry payload with the engine. */
export const GeometryBlobInputSchema = z.object({
  blob_id: z.string().min(1),
  format: GeometryFormatSchema,
  bytes: z.instanceof(Uint8Array),
  metadata: GeometryMetadataSchema.optional(),
  chunk_size: z.number().int().positive().optional(),
});
export type GeometryBlobInput = z.infer<typeof GeometryBlobInputSchema>;

/** Registration record surfaced to callers after a blob is accepted. */
export const BlobRegistrationSchema = z.object({
  blob_id: z.string(),
  format: GeometryFormatSchema,
  total_size: z.number().int().nonnegative(),
  chunk_size: z.number().int().positive(),
  chunk_count: z.number().int().nonnegative(),
  checksum_sha256: z.string(),
  metadata: GeometryMetadataSchema,
});
export type BlobRegistration = z.infer<typeof BlobRegistrationSchema>;

/** Individual chunk emitted during streaming. */
export const GeometryChunkSchema = z.object({
  blob_id: z.string(),
  format: GeometryFormatSchema,
  seq: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  data_b64: z.string(),
  byte_length: z.number().int().nonnegative(),
  chunk_sha256: z.string(),
  is_final: z.boolean(),
  chunk_count: z.number().int().nonnegative(),
  total_size: z.number().int().nonnegative(),
});
export type GeometryChunk = z.infer<typeof GeometryChunkSchema>;

/** Outcome of receiveChunk — a receiving peer can either accept or reject. */
export const ReceiveResultSchema = z.object({
  accepted: z.boolean(),
  blob_id: z.string(),
  seq: z.number().int().nonnegative(),
  received_count: z.number().int().nonnegative(),
  final_received: z.boolean(),
  reason: z.string().nullable(),
});
export type ReceiveResult = z.infer<typeof ReceiveResultSchema>;

/** Result of assemble() — full payload reconstituted from chunks. */
export const AssembledBlobSchema = z.object({
  blob_id: z.string(),
  format: GeometryFormatSchema,
  bytes: z.instanceof(Uint8Array),
  total_size: z.number().int().nonnegative(),
  checksum_sha256: z.string(),
  checksum_match: z.boolean(),
});
export type AssembledBlob = z.infer<typeof AssembledBlobSchema>;

/** Per-session streaming progress snapshot. */
export const StreamStatusSchema = z.enum([
  "pending",
  "in_progress",
  "complete",
  "error",
]);
export type StreamStatus = z.infer<typeof StreamStatusSchema>;

export const StreamProgressSchema = z.object({
  blob_id: z.string(),
  format: GeometryFormatSchema,
  chunks_received: z.number().int().nonnegative(),
  chunks_total: z.number().int().nonnegative(),
  bytes_received: z.number().int().nonnegative(),
  bytes_total: z.number().int().nonnegative(),
  status: StreamStatusSchema,
  error: z.string().nullable(),
});
export type StreamProgress = z.infer<typeof StreamProgressSchema>;

/** Format validation result (header/footer sanity checks — not a full parser). */
export const FormatValidationSchema = z.object({
  format: GeometryFormatSchema,
  valid: z.boolean(),
  reason: z.string().nullable(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type FormatValidation = z.infer<typeof FormatValidationSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_CHUNK_SIZE = 1_048_576; // 1 MiB
export const MAX_CHUNK_SIZE = 16_777_216;    // 16 MiB
export const STREAM_LARGE_THRESHOLD = 100 * 1_048_576; // 100 MiB exit-condition gate

const STEP_HEADER = "ISO-10303-21;";
const STEP_FOOTER = "END-ISO-10303-21;";
const STL_ASCII_PREFIX = "solid ";
const STL_ASCII_SUFFIX = "endsolid";
const PLY_HEADER = "ply\n";
const STL_BINARY_HEADER_LEN = 80;
const STL_BINARY_TRIANGLE_SIZE = 50;

// ── Internal state ───────────────────────────────────────────────────────────

interface BlobRecord {
  registration: BlobRegistration;
  bytes: Uint8Array;
  chunks: GeometryChunk[];
}

interface ReceiveTrack {
  blob_id: string;
  format: GeometryFormat;
  chunks: Map<number, GeometryChunk>;
  total_size: number;
  bytes_received: number;
  expected_chunk_count: number;
  final_received: boolean;
  status: StreamStatus;
  error: string | null;
}

const blobs = new Map<string, BlobRecord>();
const sessions = new Map<string, Map<string, ReceiveTrack>>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sessionMap(session_id: string): Map<string, ReceiveTrack> {
  let map = sessions.get(session_id);
  if (!map) {
    map = new Map();
    sessions.set(session_id, map);
  }
  return map;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function ensureChunkSize(size?: number): number {
  if (size === undefined) return DEFAULT_CHUNK_SIZE;
  if (size <= 0) {
    throw new Error("chunk_size must be positive");
  }
  if (size > MAX_CHUNK_SIZE) {
    throw new Error(
      `chunk_size ${size} exceeds MAX_CHUNK_SIZE ${MAX_CHUNK_SIZE}`,
    );
  }
  return size;
}

function buildChunks(
  blob_id: string,
  format: GeometryFormat,
  bytes: Uint8Array,
  chunk_size: number,
): GeometryChunk[] {
  const total_size = bytes.byteLength;
  if (total_size === 0) {
    return [
      {
        blob_id,
        format,
        seq: 0,
        offset: 0,
        data_b64: "",
        byte_length: 0,
        chunk_sha256: sha256Hex(new Uint8Array(0)),
        is_final: true,
        chunk_count: 1,
        total_size: 0,
      },
    ];
  }
  const chunk_count = Math.ceil(total_size / chunk_size);
  const out: GeometryChunk[] = [];
  for (let seq = 0; seq < chunk_count; seq++) {
    const offset = seq * chunk_size;
    const end = Math.min(offset + chunk_size, total_size);
    const slice = bytes.subarray(offset, end);
    out.push({
      blob_id,
      format,
      seq,
      offset,
      data_b64: toBase64(slice),
      byte_length: slice.byteLength,
      chunk_sha256: sha256Hex(slice),
      is_final: seq === chunk_count - 1,
      chunk_count,
      total_size,
    });
  }
  return out;
}

function validateStepAp242(text: string): FormatValidation {
  const head = text.trimStart();
  if (!head.startsWith(STEP_HEADER)) {
    return {
      format: "step_ap242",
      valid: false,
      reason: `missing ISO-10303-21 header`,
    };
  }
  const tail = text.trimEnd();
  if (!tail.endsWith(STEP_FOOTER)) {
    return {
      format: "step_ap242",
      valid: false,
      reason: `missing END-ISO-10303-21 footer`,
    };
  }
  return { format: "step_ap242", valid: true, reason: null };
}

function validateBrepJson(text: string): FormatValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return {
      format: "brep_json",
      valid: false,
      reason: `JSON parse failed: ${(e as Error).message}`,
    };
  }
  const schema = z.object({
    shells: z.array(z.unknown()).optional(),
    faces: z.array(z.unknown()).optional(),
    edges: z.array(z.unknown()).optional(),
    vertices: z.array(z.unknown()).optional(),
  });
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      format: "brep_json",
      valid: false,
      reason: `B-Rep JSON schema mismatch`,
    };
  }
  const required: Array<"shells" | "faces" | "edges" | "vertices"> = [
    "shells",
    "faces",
    "edges",
    "vertices",
  ];
  const present = required.filter(k => Array.isArray(result.data[k]));
  if (present.length === 0) {
    return {
      format: "brep_json",
      valid: false,
      reason: "B-Rep JSON must contain at least one of shells/faces/edges/vertices",
    };
  }
  return { format: "brep_json", valid: true, reason: null };
}

function validateStlBinary(bytes: Uint8Array): FormatValidation {
  if (bytes.byteLength < STL_BINARY_HEADER_LEN + 4) {
    return {
      format: "stl_binary",
      valid: false,
      reason: "shorter than 84-byte minimum",
    };
  }
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  const triangles = view.getUint32(STL_BINARY_HEADER_LEN, true);
  const expected = STL_BINARY_HEADER_LEN + 4 + triangles * STL_BINARY_TRIANGLE_SIZE;
  if (bytes.byteLength !== expected) {
    return {
      format: "stl_binary",
      valid: false,
      reason: `size mismatch: got ${bytes.byteLength}, expected ${expected} for ${triangles} triangles`,
      details: { declared_triangles: triangles, expected_size: expected },
    };
  }
  return {
    format: "stl_binary",
    valid: true,
    reason: null,
    details: { declared_triangles: triangles },
  };
}

function validateStlAscii(text: string): FormatValidation {
  const trimmed = text.trim();
  if (!trimmed.startsWith(STL_ASCII_PREFIX)) {
    return {
      format: "stl_ascii",
      valid: false,
      reason: `missing "solid" prefix`,
    };
  }
  if (!trimmed.endsWith(STL_ASCII_SUFFIX) && !trimmed.includes("endsolid")) {
    return {
      format: "stl_ascii",
      valid: false,
      reason: `missing "endsolid" terminator`,
    };
  }
  return { format: "stl_ascii", valid: true, reason: null };
}

function validateObj(text: string): FormatValidation {
  const lines = text.split(/\r?\n/);
  const hasVertex = lines.some(l => l.startsWith("v "));
  if (!hasVertex) {
    return {
      format: "obj",
      valid: false,
      reason: "no vertex (`v`) lines found",
    };
  }
  return { format: "obj", valid: true, reason: null };
}

function validatePly(text: string): FormatValidation {
  if (!text.startsWith(PLY_HEADER) && !text.startsWith("ply\r\n")) {
    return {
      format: "ply",
      valid: false,
      reason: `missing "ply" magic on first line`,
    };
  }
  return { format: "ply", valid: true, reason: null };
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CAMGeometryExchangeEngine {
  static readonly DEFAULT_CHUNK_SIZE = DEFAULT_CHUNK_SIZE;
  static readonly MAX_CHUNK_SIZE = MAX_CHUNK_SIZE;
  static readonly STREAM_LARGE_THRESHOLD = STREAM_LARGE_THRESHOLD;

  /** List supported geometry formats. */
  static supportedFormats(): GeometryFormat[] {
    return ["step_ap242", "brep_json", "stl_binary", "stl_ascii", "obj", "ply"];
  }

  /** Public SHA-256 helper (used by callers for chunk verification). */
  static computeChecksum(bytes: Uint8Array): string {
    return sha256Hex(bytes);
  }

  /**
   * Register a blob with the engine, chunkify it, and return the registration
   * record. Registering the same blob_id twice overwrites the prior record.
   */
  static registerBlob(input: GeometryBlobInput): BlobRegistration {
    const parsed = GeometryBlobInputSchema.parse(input);
    const chunk_size = ensureChunkSize(parsed.chunk_size);
    const checksum = sha256Hex(parsed.bytes);
    const chunks = buildChunks(
      parsed.blob_id,
      parsed.format,
      parsed.bytes,
      chunk_size,
    );
    const metadata = parsed.metadata ?? GeometryMetadataSchema.parse({});
    const registration: BlobRegistration = {
      blob_id: parsed.blob_id,
      format: parsed.format,
      total_size: parsed.bytes.byteLength,
      chunk_size,
      chunk_count: chunks.length,
      checksum_sha256: checksum,
      metadata,
    };
    blobs.set(parsed.blob_id, {
      registration,
      bytes: parsed.bytes,
      chunks,
    });
    return registration;
  }

  /** Fetch a registration record. Returns null when unknown. */
  static getBlob(blob_id: string): BlobRegistration | null {
    const record = blobs.get(blob_id);
    return record ? { ...record.registration } : null;
  }

  /** Return a specific chunk by seq. null when unknown. */
  static getChunk(blob_id: string, seq: number): GeometryChunk | null {
    const record = blobs.get(blob_id);
    if (!record) return null;
    const chunk = record.chunks[seq];
    return chunk ? { ...chunk } : null;
  }

  /** Return all chunks for a blob in seq order. */
  static allChunks(blob_id: string): GeometryChunk[] {
    const record = blobs.get(blob_id);
    if (!record) return [];
    return record.chunks.map(c => ({ ...c }));
  }

  /**
   * Receive a chunk for a given session. Verifies chunk ordering + chunk
   * SHA-256 before storing. Returns a result with acceptance status.
   */
  static receiveChunk(session_id: string, chunk: GeometryChunk): ReceiveResult {
    const parsed = GeometryChunkSchema.parse(chunk);
    const map = sessionMap(session_id);
    let track = map.get(parsed.blob_id);
    if (!track) {
      track = {
        blob_id: parsed.blob_id,
        format: parsed.format,
        chunks: new Map(),
        total_size: parsed.total_size,
        bytes_received: 0,
        expected_chunk_count: parsed.chunk_count,
        final_received: false,
        status: "pending",
        error: null,
      };
      map.set(parsed.blob_id, track);
    }

    if (track.format !== parsed.format) {
      track.status = "error";
      track.error = `format mismatch: track=${track.format} chunk=${parsed.format}`;
      return {
        accepted: false,
        blob_id: parsed.blob_id,
        seq: parsed.seq,
        received_count: track.chunks.size,
        final_received: track.final_received,
        reason: track.error,
      };
    }
    if (track.expected_chunk_count !== parsed.chunk_count) {
      track.status = "error";
      track.error = `chunk_count mismatch: track=${track.expected_chunk_count} chunk=${parsed.chunk_count}`;
      return {
        accepted: false,
        blob_id: parsed.blob_id,
        seq: parsed.seq,
        received_count: track.chunks.size,
        final_received: track.final_received,
        reason: track.error,
      };
    }
    if (track.total_size !== parsed.total_size) {
      track.status = "error";
      track.error = `total_size mismatch: track=${track.total_size} chunk=${parsed.total_size}`;
      return {
        accepted: false,
        blob_id: parsed.blob_id,
        seq: parsed.seq,
        received_count: track.chunks.size,
        final_received: track.final_received,
        reason: track.error,
      };
    }
    if (parsed.seq >= parsed.chunk_count) {
      return {
        accepted: false,
        blob_id: parsed.blob_id,
        seq: parsed.seq,
        received_count: track.chunks.size,
        final_received: track.final_received,
        reason: `seq ${parsed.seq} out of range for chunk_count ${parsed.chunk_count}`,
      };
    }
    if (track.chunks.has(parsed.seq)) {
      return {
        accepted: false,
        blob_id: parsed.blob_id,
        seq: parsed.seq,
        received_count: track.chunks.size,
        final_received: track.final_received,
        reason: "duplicate seq",
      };
    }
    const data = fromBase64(parsed.data_b64);
    if (data.byteLength !== parsed.byte_length) {
      return {
        accepted: false,
        blob_id: parsed.blob_id,
        seq: parsed.seq,
        received_count: track.chunks.size,
        final_received: track.final_received,
        reason: `byte_length mismatch: declared ${parsed.byte_length}, decoded ${data.byteLength}`,
      };
    }
    const actual = sha256Hex(data);
    if (actual !== parsed.chunk_sha256) {
      return {
        accepted: false,
        blob_id: parsed.blob_id,
        seq: parsed.seq,
        received_count: track.chunks.size,
        final_received: track.final_received,
        reason: `chunk_sha256 mismatch`,
      };
    }
    track.chunks.set(parsed.seq, parsed);
    track.bytes_received += parsed.byte_length;
    if (parsed.is_final) track.final_received = true;
    track.status =
      track.chunks.size === track.expected_chunk_count
        ? "complete"
        : "in_progress";
    return {
      accepted: true,
      blob_id: parsed.blob_id,
      seq: parsed.seq,
      received_count: track.chunks.size,
      final_received: track.final_received,
      reason: null,
    };
  }

  /**
   * Assemble a complete blob for a session. Concatenates chunk bytes in seq
   * order and verifies the overall SHA-256 against the registered blob (if
   * known). The return includes `checksum_match` so callers can gate on it.
   */
  static assemble(session_id: string, blob_id: string): AssembledBlob {
    const map = sessions.get(session_id);
    const track = map?.get(blob_id);
    if (!track) {
      throw new Error(
        `No receive track for session=${session_id} blob=${blob_id}`,
      );
    }
    if (track.chunks.size !== track.expected_chunk_count) {
      throw new Error(
        `Incomplete stream: have ${track.chunks.size}/${track.expected_chunk_count} chunks`,
      );
    }
    const orderedSeqs = Array.from(track.chunks.keys()).sort((a, b) => a - b);
    const buffers: Uint8Array[] = [];
    for (const seq of orderedSeqs) {
      const chunk = track.chunks.get(seq)!;
      buffers.push(fromBase64(chunk.data_b64));
    }
    const total = new Uint8Array(track.total_size);
    let offset = 0;
    for (const buf of buffers) {
      total.set(buf, offset);
      offset += buf.byteLength;
    }
    const checksum = sha256Hex(total);
    const known = blobs.get(blob_id);
    const checksum_match =
      known === undefined ? true : known.registration.checksum_sha256 === checksum;
    return {
      blob_id,
      format: track.format,
      bytes: total,
      total_size: total.byteLength,
      checksum_sha256: checksum,
      checksum_match,
    };
  }

  /** Snapshot streaming progress for a session/blob combination. */
  static streamProgress(
    session_id: string,
    blob_id: string,
  ): StreamProgress | null {
    const map = sessions.get(session_id);
    const track = map?.get(blob_id);
    if (!track) return null;
    return {
      blob_id,
      format: track.format,
      chunks_received: track.chunks.size,
      chunks_total: track.expected_chunk_count,
      bytes_received: track.bytes_received,
      bytes_total: track.total_size,
      status: track.status,
      error: track.error,
    };
  }

  /**
   * Validate that a byte payload matches its declared format. This is a
   * header/footer sanity check, not a full parse — good enough to detect
   * corruption, truncation, or format confusion on ingress.
   */
  static validateFormat(
    format: GeometryFormat,
    bytes: Uint8Array,
  ): FormatValidation {
    GeometryFormatSchema.parse(format);
    switch (format) {
      case "step_ap242":
        return validateStepAp242(decodeUtf8(bytes));
      case "brep_json":
        return validateBrepJson(decodeUtf8(bytes));
      case "stl_binary":
        return validateStlBinary(bytes);
      case "stl_ascii":
        return validateStlAscii(decodeUtf8(bytes));
      case "obj":
        return validateObj(decodeUtf8(bytes));
      case "ply":
        return validatePly(decodeUtf8(bytes));
    }
  }

  /**
   * Planning helper: given a declared total size, compute how many chunks of
   * `chunk_size` (or DEFAULT) would be required. Useful for dashboards that
   * show "100 MB model → 100 chunks at 1 MiB" without actually chunking bytes.
   */
  static estimateChunkCount(total_size: number, chunk_size?: number): number {
    if (!Number.isFinite(total_size) || total_size < 0) {
      throw new Error("total_size must be a non-negative finite number");
    }
    if (total_size === 0) return 1;
    const size = ensureChunkSize(chunk_size);
    return Math.ceil(total_size / size);
  }

  /** True when `total_size` meets the U-CAM97 exit-condition large-model gate. */
  static isLargeModel(total_size: number): boolean {
    return total_size >= STREAM_LARGE_THRESHOLD;
  }

  /** Discard a specific blob from the registry. */
  static resetBlob(blob_id: string): void {
    blobs.delete(blob_id);
    for (const map of sessions.values()) {
      map.delete(blob_id);
    }
  }

  /** Clear all receive state for a session. */
  static resetSession(session_id: string): void {
    sessions.delete(session_id);
  }

  /** Clear the entire registry + all sessions (test isolation). */
  static resetAll(): void {
    blobs.clear();
    sessions.clear();
  }
}

export const camGeometryExchangeEngine = CAMGeometryExchangeEngine;
