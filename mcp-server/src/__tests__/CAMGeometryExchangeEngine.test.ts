/**
 * CAMGeometryExchangeEngine tests — U-CAM97
 * ==========================================
 *
 * Schema, registration, chunking, streaming (including the >100MB large-model
 * exit-condition gate), per-chunk integrity, assemble correctness,
 * format-validation checks for all 6 supported formats, session isolation.
 * Target ≥30 cases (new U-CAM96+ floor).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMGeometryExchangeEngine as Geo,
  GeometryFormatSchema,
  GeometryBlobInputSchema,
  GeometryChunkSchema,
  BlobRegistrationSchema,
  DEFAULT_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  STREAM_LARGE_THRESHOLD,
  type GeometryChunk,
} from "../engines/CAMGeometryExchangeEngine.js";

function randomBytes(size: number): Uint8Array {
  // Deterministic pseudo-random — avoids node:crypto.randomBytes in tests.
  const out = new Uint8Array(size);
  let state = 0x9e3779b1;
  for (let i = 0; i < size; i++) {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out[i] = (t ^ (t >>> 14)) & 0xff;
  }
  return out;
}

function minimalStep(): string {
  return (
    "ISO-10303-21;\n" +
    "HEADER;\n" +
    "FILE_DESCRIPTION(('test'),'2;1');\n" +
    "FILE_NAME('fixture.step','2026-01-01',(),(),'','','');\n" +
    "FILE_SCHEMA(('AP242'));\n" +
    "ENDSEC;\n" +
    "DATA;\n" +
    "ENDSEC;\n" +
    "END-ISO-10303-21;\n"
  );
}

function minimalStlBinary(triangles: number): Uint8Array {
  const size = 80 + 4 + triangles * 50;
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, triangles, true);
  // leave triangle data as zeros — size is what matters for validation
  return bytes;
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe("CAMGeometryExchangeEngine — Schemas + format enum", () => {
  it("GeometryFormatSchema accepts all six supported formats", () => {
    for (const f of Geo.supportedFormats()) {
      expect(() => GeometryFormatSchema.parse(f)).not.toThrow();
    }
  });

  it("GeometryFormatSchema rejects unknown formats", () => {
    expect(() => GeometryFormatSchema.parse("x3d")).toThrow();
  });

  it("GeometryBlobInputSchema requires non-empty blob_id", () => {
    expect(() =>
      GeometryBlobInputSchema.parse({
        blob_id: "",
        format: "obj",
        bytes: new Uint8Array(0),
      }),
    ).toThrow();
  });

  it("GeometryBlobInputSchema rejects negative chunk_size", () => {
    expect(() =>
      GeometryBlobInputSchema.parse({
        blob_id: "b1",
        format: "obj",
        bytes: new Uint8Array(0),
        chunk_size: -1,
      }),
    ).toThrow();
  });

  it("GeometryChunkSchema rejects negative seq", () => {
    const base: GeometryChunk = {
      blob_id: "b1",
      format: "obj",
      seq: -1,
      offset: 0,
      data_b64: "",
      byte_length: 0,
      chunk_sha256: "0".repeat(64),
      is_final: true,
      chunk_count: 1,
      total_size: 0,
    };
    expect(() => GeometryChunkSchema.parse(base)).toThrow();
  });

  it("BlobRegistrationSchema validates a well-formed record", () => {
    const reg = {
      blob_id: "b1",
      format: "obj" as const,
      total_size: 12,
      chunk_size: 1024,
      chunk_count: 1,
      checksum_sha256: "a".repeat(64),
      metadata: { units: "mm" as const },
    };
    expect(() => BlobRegistrationSchema.parse(reg)).not.toThrow();
  });

  it("supportedFormats() returns exactly six formats", () => {
    expect(Geo.supportedFormats()).toEqual([
      "step_ap242",
      "brep_json",
      "stl_binary",
      "stl_ascii",
      "obj",
      "ply",
    ]);
  });
});

describe("CAMGeometryExchangeEngine — Registration + chunking", () => {
  beforeEach(() => {
    Geo.resetAll();
  });

  it("registers a small blob with default chunk size", () => {
    const bytes = encode("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
    const reg = Geo.registerBlob({ blob_id: "b1", format: "obj", bytes });
    expect(reg.total_size).toBe(bytes.byteLength);
    expect(reg.chunk_size).toBe(DEFAULT_CHUNK_SIZE);
    expect(reg.chunk_count).toBe(1);
    expect(reg.checksum_sha256).toHaveLength(64);
  });

  it("emits exactly one chunk marked final for a small blob", () => {
    const bytes = encode("ply\nelement vertex 0\nend_header\n");
    Geo.registerBlob({ blob_id: "b2", format: "ply", bytes });
    const chunks = Geo.allChunks("b2");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].is_final).toBe(true);
    expect(chunks[0].seq).toBe(0);
  });

  it("splits a larger-than-chunk blob into N ordered chunks", () => {
    const bytes = randomBytes(8_192);
    const reg = Geo.registerBlob({
      blob_id: "b3",
      format: "stl_binary",
      bytes,
      chunk_size: 1_024,
    });
    expect(reg.chunk_count).toBe(8);
    const chunks = Geo.allChunks("b3");
    expect(chunks.map(c => c.seq)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(chunks[chunks.length - 1].is_final).toBe(true);
    expect(chunks.slice(0, -1).every(c => !c.is_final)).toBe(true);
  });

  it("computes per-chunk SHA-256 that matches independent re-hash", () => {
    const bytes = randomBytes(2_000);
    Geo.registerBlob({
      blob_id: "b4",
      format: "stl_binary",
      bytes,
      chunk_size: 512,
    });
    const chunks = Geo.allChunks("b4");
    for (const chunk of chunks) {
      const raw = Buffer.from(chunk.data_b64, "base64");
      const expected = Geo.computeChecksum(new Uint8Array(raw));
      expect(chunk.chunk_sha256).toBe(expected);
    }
  });

  it("throws on chunk_size exceeding MAX_CHUNK_SIZE", () => {
    expect(() =>
      Geo.registerBlob({
        blob_id: "b5",
        format: "obj",
        bytes: encode("v 0 0 0\n"),
        chunk_size: MAX_CHUNK_SIZE + 1,
      }),
    ).toThrow();
  });

  it("registers a zero-byte blob with a single empty chunk", () => {
    const reg = Geo.registerBlob({
      blob_id: "b6",
      format: "obj",
      bytes: new Uint8Array(0),
    });
    expect(reg.total_size).toBe(0);
    expect(reg.chunk_count).toBe(1);
    const chunks = Geo.allChunks("b6");
    expect(chunks[0].is_final).toBe(true);
    expect(chunks[0].byte_length).toBe(0);
  });

  it("re-registering the same blob_id replaces the prior record", () => {
    Geo.registerBlob({
      blob_id: "b7",
      format: "obj",
      bytes: encode("v 0 0 0\n"),
    });
    const reg = Geo.registerBlob({
      blob_id: "b7",
      format: "obj",
      bytes: encode("v 1 1 1\nv 2 2 2\n"),
    });
    expect(reg.total_size).toBe(16);
  });

  it("getBlob() returns null for unknown blob", () => {
    expect(Geo.getBlob("nope")).toBeNull();
  });

  it("getChunk() returns a single chunk by seq", () => {
    const bytes = randomBytes(3_000);
    Geo.registerBlob({
      blob_id: "b8",
      format: "stl_binary",
      bytes,
      chunk_size: 1_000,
    });
    const chunk = Geo.getChunk("b8", 1);
    expect(chunk).not.toBeNull();
    expect(chunk!.seq).toBe(1);
  });
});

describe("CAMGeometryExchangeEngine — Streaming + assemble", () => {
  beforeEach(() => {
    Geo.resetAll();
  });

  it("accepts every emitted chunk for a small blob", () => {
    const bytes = randomBytes(5_000);
    Geo.registerBlob({
      blob_id: "s1",
      format: "stl_binary",
      bytes,
      chunk_size: 1_000,
    });
    const chunks = Geo.allChunks("s1");
    const results = chunks.map(c => Geo.receiveChunk("sess-s1", c));
    expect(results.every(r => r.accepted)).toBe(true);
    expect(results[results.length - 1].final_received).toBe(true);
  });

  it("assemble() reconstructs the original bytes exactly", () => {
    const bytes = randomBytes(4_567);
    Geo.registerBlob({
      blob_id: "s2",
      format: "stl_binary",
      bytes,
      chunk_size: 1_024,
    });
    for (const chunk of Geo.allChunks("s2")) {
      Geo.receiveChunk("sess-s2", chunk);
    }
    const assembled = Geo.assemble("sess-s2", "s2");
    expect(assembled.total_size).toBe(bytes.byteLength);
    expect(assembled.checksum_match).toBe(true);
    expect(Array.from(assembled.bytes)).toEqual(Array.from(bytes));
  });

  it("rejects a duplicate seq", () => {
    const bytes = randomBytes(2_000);
    Geo.registerBlob({
      blob_id: "s3",
      format: "stl_binary",
      bytes,
      chunk_size: 512,
    });
    const chunks = Geo.allChunks("s3");
    expect(Geo.receiveChunk("sess-s3", chunks[0]).accepted).toBe(true);
    const dup = Geo.receiveChunk("sess-s3", chunks[0]);
    expect(dup.accepted).toBe(false);
    expect(dup.reason).toBe("duplicate seq");
  });

  it("rejects a chunk with wrong sha256", () => {
    const bytes = randomBytes(1_024);
    Geo.registerBlob({
      blob_id: "s4",
      format: "stl_binary",
      bytes,
      chunk_size: 512,
    });
    const chunks = Geo.allChunks("s4");
    const tampered: GeometryChunk = { ...chunks[0], chunk_sha256: "0".repeat(64) };
    const result = Geo.receiveChunk("sess-s4", tampered);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("chunk_sha256 mismatch");
  });

  it("rejects a chunk with byte_length mismatch", () => {
    const bytes = randomBytes(1_024);
    Geo.registerBlob({
      blob_id: "s5",
      format: "stl_binary",
      bytes,
      chunk_size: 512,
    });
    const chunks = Geo.allChunks("s5");
    const tampered: GeometryChunk = { ...chunks[0], byte_length: 999 };
    const result = Geo.receiveChunk("sess-s5", tampered);
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("byte_length mismatch");
  });

  it("rejects chunks out of declared range", () => {
    const bytes = randomBytes(512);
    Geo.registerBlob({
      blob_id: "s6",
      format: "stl_binary",
      bytes,
      chunk_size: 512,
    });
    const chunks = Geo.allChunks("s6");
    const bad: GeometryChunk = { ...chunks[0], seq: 99, chunk_count: 100 };
    const result = Geo.receiveChunk("sess-s6", bad);
    // Receiver adopts the declared chunk_count=100 for the track; seq 99 is
    // within that range so it's stored. The bug surface we're testing is
    // out-of-range: make chunk_count = 5 but seq = 10.
    expect(result.accepted).toBe(true);
    const ooRange: GeometryChunk = { ...chunks[0], blob_id: "s6-oor", seq: 10, chunk_count: 5 };
    const r2 = Geo.receiveChunk("sess-s6", ooRange);
    expect(r2.accepted).toBe(false);
    expect(r2.reason).toContain("out of range");
  });

  it("assemble() throws when chunks are missing", () => {
    const bytes = randomBytes(2_048);
    Geo.registerBlob({
      blob_id: "s7",
      format: "stl_binary",
      bytes,
      chunk_size: 512,
    });
    const chunks = Geo.allChunks("s7");
    Geo.receiveChunk("sess-s7", chunks[0]);
    Geo.receiveChunk("sess-s7", chunks[1]);
    // skip chunk 2 and 3
    expect(() => Geo.assemble("sess-s7", "s7")).toThrow(/Incomplete/);
  });

  it("streamProgress() reports monotonically growing bytes_received", () => {
    const bytes = randomBytes(3_000);
    Geo.registerBlob({
      blob_id: "s8",
      format: "stl_binary",
      bytes,
      chunk_size: 1_000,
    });
    const chunks = Geo.allChunks("s8");
    Geo.receiveChunk("sess-s8", chunks[0]);
    const p1 = Geo.streamProgress("sess-s8", "s8")!;
    expect(p1.bytes_received).toBe(1000);
    expect(p1.status).toBe("in_progress");
    Geo.receiveChunk("sess-s8", chunks[1]);
    Geo.receiveChunk("sess-s8", chunks[2]);
    const p2 = Geo.streamProgress("sess-s8", "s8")!;
    expect(p2.bytes_received).toBe(3000);
    expect(p2.status).toBe("complete");
  });

  it("streamProgress() returns null for unknown session", () => {
    expect(Geo.streamProgress("unknown", "b1")).toBeNull();
  });

  it("assemble() accepts chunks in any order and produces correct bytes", () => {
    const bytes = randomBytes(2_500);
    Geo.registerBlob({
      blob_id: "s9",
      format: "stl_binary",
      bytes,
      chunk_size: 500,
    });
    const chunks = Geo.allChunks("s9");
    // Feed in reverse order
    for (let i = chunks.length - 1; i >= 0; i--) {
      Geo.receiveChunk("sess-s9", chunks[i]);
    }
    const assembled = Geo.assemble("sess-s9", "s9");
    expect(assembled.checksum_match).toBe(true);
    expect(Array.from(assembled.bytes)).toEqual(Array.from(bytes));
  });
});

describe("CAMGeometryExchangeEngine — Large-model streaming (>100MB gate)", () => {
  beforeEach(() => {
    Geo.resetAll();
  });

  it("isLargeModel() returns true at the 100 MiB threshold", () => {
    expect(Geo.isLargeModel(STREAM_LARGE_THRESHOLD)).toBe(true);
    expect(Geo.isLargeModel(STREAM_LARGE_THRESHOLD - 1)).toBe(false);
  });

  it("estimateChunkCount() yields 100 chunks for a 100 MiB model at 1 MiB chunks", () => {
    expect(Geo.estimateChunkCount(100 * 1_048_576)).toBe(100);
  });

  it("estimateChunkCount() yields 7 chunks for a 100 MiB model at MAX_CHUNK_SIZE (16 MiB)", () => {
    // ceil(100/16) = 7
    expect(
      Geo.estimateChunkCount(100 * 1_048_576, MAX_CHUNK_SIZE),
    ).toBe(7);
  });

  it("estimateChunkCount() rejects negative or non-finite sizes", () => {
    expect(() => Geo.estimateChunkCount(-1)).toThrow();
    expect(() => Geo.estimateChunkCount(NaN)).toThrow();
  });

  it("streams a 2 MiB synthetic payload end-to-end with checksum verify", () => {
    // 2 MiB at 512 KiB chunks → 4 chunks — proves pipeline on >1 MiB scale
    const bytes = randomBytes(2 * 1_048_576);
    const reg = Geo.registerBlob({
      blob_id: "lg1",
      format: "stl_binary",
      bytes,
      chunk_size: 512 * 1024,
    });
    expect(reg.chunk_count).toBe(4);
    for (const chunk of Geo.allChunks("lg1")) {
      const r = Geo.receiveChunk("sess-lg1", chunk);
      expect(r.accepted).toBe(true);
    }
    const assembled = Geo.assemble("sess-lg1", "lg1");
    expect(assembled.checksum_match).toBe(true);
  });
});

describe("CAMGeometryExchangeEngine — Format validation", () => {
  beforeEach(() => {
    Geo.resetAll();
  });

  it("validates a minimal STEP AP242 payload", () => {
    const v = Geo.validateFormat("step_ap242", encode(minimalStep()));
    expect(v.valid).toBe(true);
  });

  it("rejects STEP AP242 without header", () => {
    const v = Geo.validateFormat("step_ap242", encode("HEADER;\nEND-ISO-10303-21;"));
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/header/);
  });

  it("rejects STEP AP242 without footer", () => {
    const v = Geo.validateFormat(
      "step_ap242",
      encode("ISO-10303-21;\nHEADER;\n"),
    );
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/footer/);
  });

  it("validates a well-formed B-Rep JSON payload", () => {
    const text = JSON.stringify({
      shells: [],
      faces: [{ id: 1 }],
      edges: [],
      vertices: [{ id: 1, x: 0, y: 0, z: 0 }],
    });
    const v = Geo.validateFormat("brep_json", encode(text));
    expect(v.valid).toBe(true);
  });

  it("rejects invalid JSON as brep_json", () => {
    const v = Geo.validateFormat("brep_json", encode("{not json"));
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/JSON parse/);
  });

  it("rejects B-Rep JSON with no topological arrays", () => {
    const v = Geo.validateFormat("brep_json", encode("{}"));
    expect(v.valid).toBe(false);
  });

  it("validates an STL binary payload with matching triangle count", () => {
    const v = Geo.validateFormat("stl_binary", minimalStlBinary(5));
    expect(v.valid).toBe(true);
    expect(v.details?.declared_triangles).toBe(5);
  });

  it("rejects STL binary with truncated tail", () => {
    const good = minimalStlBinary(3);
    const bad = good.subarray(0, good.byteLength - 10);
    const v = Geo.validateFormat("stl_binary", bad);
    expect(v.valid).toBe(false);
  });

  it("rejects STL binary shorter than header", () => {
    const v = Geo.validateFormat("stl_binary", new Uint8Array(40));
    expect(v.valid).toBe(false);
  });

  it("validates an ASCII STL payload", () => {
    const text =
      "solid fixture\n" +
      "facet normal 0 0 1\n" +
      "outer loop\n" +
      "vertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\n" +
      "endloop\nendfacet\n" +
      "endsolid fixture\n";
    const v = Geo.validateFormat("stl_ascii", encode(text));
    expect(v.valid).toBe(true);
  });

  it("rejects ASCII STL missing the `solid` prefix", () => {
    const v = Geo.validateFormat(
      "stl_ascii",
      encode("facet normal 0 0 1\nendsolid\n"),
    );
    expect(v.valid).toBe(false);
  });

  it("validates a minimal OBJ with at least one vertex", () => {
    const v = Geo.validateFormat("obj", encode("v 0 0 0\nv 1 0 0\nf 1 2\n"));
    expect(v.valid).toBe(true);
  });

  it("rejects OBJ with no vertex lines", () => {
    const v = Geo.validateFormat("obj", encode("# comment only\n"));
    expect(v.valid).toBe(false);
  });

  it("validates a minimal PLY payload", () => {
    const v = Geo.validateFormat(
      "ply",
      encode("ply\nformat ascii 1.0\nend_header\n"),
    );
    expect(v.valid).toBe(true);
  });

  it("rejects PLY missing the `ply` magic", () => {
    const v = Geo.validateFormat("ply", encode("format ascii 1.0\n"));
    expect(v.valid).toBe(false);
  });
});

describe("CAMGeometryExchangeEngine — Session isolation + reset", () => {
  beforeEach(() => {
    Geo.resetAll();
  });

  it("isolates receive tracks across sessions", () => {
    const bytes = randomBytes(1_500);
    Geo.registerBlob({
      blob_id: "iso1",
      format: "stl_binary",
      bytes,
      chunk_size: 500,
    });
    const chunks = Geo.allChunks("iso1");
    Geo.receiveChunk("sessA", chunks[0]);
    Geo.receiveChunk("sessB", chunks[0]);
    const pA = Geo.streamProgress("sessA", "iso1")!;
    const pB = Geo.streamProgress("sessB", "iso1")!;
    expect(pA.chunks_received).toBe(1);
    expect(pB.chunks_received).toBe(1);
    // Feed only sessA further
    Geo.receiveChunk("sessA", chunks[1]);
    const pA2 = Geo.streamProgress("sessA", "iso1")!;
    const pB2 = Geo.streamProgress("sessB", "iso1")!;
    expect(pA2.chunks_received).toBe(2);
    expect(pB2.chunks_received).toBe(1);
  });

  it("resetSession() discards receive state for a single session", () => {
    const bytes = randomBytes(1_000);
    Geo.registerBlob({
      blob_id: "iso2",
      format: "stl_binary",
      bytes,
      chunk_size: 500,
    });
    Geo.receiveChunk("sessX", Geo.getChunk("iso2", 0)!);
    Geo.resetSession("sessX");
    expect(Geo.streamProgress("sessX", "iso2")).toBeNull();
  });

  it("resetBlob() removes blob from both registry and per-session tracks", () => {
    const bytes = randomBytes(800);
    Geo.registerBlob({
      blob_id: "iso3",
      format: "stl_binary",
      bytes,
      chunk_size: 400,
    });
    Geo.receiveChunk("sessY", Geo.getChunk("iso3", 0)!);
    Geo.resetBlob("iso3");
    expect(Geo.getBlob("iso3")).toBeNull();
    expect(Geo.streamProgress("sessY", "iso3")).toBeNull();
  });

  it("resetAll() clears every blob and every session", () => {
    Geo.registerBlob({
      blob_id: "r1",
      format: "obj",
      bytes: encode("v 0 0 0\n"),
    });
    Geo.registerBlob({
      blob_id: "r2",
      format: "ply",
      bytes: encode("ply\nend_header\n"),
    });
    Geo.resetAll();
    expect(Geo.getBlob("r1")).toBeNull();
    expect(Geo.getBlob("r2")).toBeNull();
  });

  it("computeChecksum() returns a stable 64-char hex digest", () => {
    const digest = Geo.computeChecksum(encode("hello"));
    expect(digest).toHaveLength(64);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    // Known SHA-256 for ASCII 'hello'
    expect(digest).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
