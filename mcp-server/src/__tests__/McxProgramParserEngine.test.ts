/**
 * McxProgramParserEngine.test.ts — LATHE-PROD-READY-MS0/U-LPR26
 * =============================================================
 *
 * Coverage strategy: every public method, every classify-* internal pathway
 * exercised through observable output, every documented edge case.  No
 * Mastercam SDK dependency — fixtures are byte-level synthetic buffers
 * that reproduce the magic-byte / zlib-chunk / embedded-string structure
 * of real .mcx-* files.  This is the parser test floor; deep grammar
 * fuzzing belongs to U-LPR-PARSER-FUZZ.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  McxProgramParserEngine,
  mcxProgramParserEngine,
  MAX_FILE_BYTES,
  MIN_STRING_LEN,
  MAX_STRINGS,
  MCX_SUPPORTED_EXTENSIONS,
  type McxProgramMetadata,
} from "../engines/McxProgramParserEngine.js";

// ── Fixture builders ───────────────────────────────────────────────────────

const MAGIC_MCX_8 = Buffer.from([0x98, 0x00, 0x00, 0x00]);
const MAGIC_OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const MAGIC_ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const ZLIB_HEADERS: ReadonlyArray<[number, number]> = [
  [0x78, 0x01],
  [0x78, 0x5e],
  [0x78, 0x9c],
  [0x78, 0xda],
];

/**
 * Compose a Mastercam-shaped fixture: magic header + N zlib chunks of fixed
 * filler + an arbitrary list of UTF-16-LE / ASCII strings interleaved.
 * Strings get NUL padding so successive runs are detected as distinct.
 */
function buildFixture(opts: {
  magic: Buffer;
  zlibChunks?: number;
  asciiStrings?: ReadonlyArray<string>;
  utf16Strings?: ReadonlyArray<string>;
  trailerBytes?: number;
}): Buffer {
  const parts: Buffer[] = [Buffer.from(opts.magic)];
  // Pad up to 32 bytes for header.
  const headerPad = Math.max(0, 32 - opts.magic.length);
  parts.push(Buffer.alloc(headerPad, 0));

  for (let i = 0; i < (opts.zlibChunks ?? 0); i++) {
    const [a, b] = ZLIB_HEADERS[i % ZLIB_HEADERS.length]!;
    parts.push(Buffer.from([a, b, 0xab, 0xcd, 0xef]));
    parts.push(Buffer.alloc(8, 0)); // separator
  }

  for (const s of opts.asciiStrings ?? []) {
    parts.push(Buffer.from(s, "ascii"));
    parts.push(Buffer.from([0, 0])); // separator
  }
  for (const s of opts.utf16Strings ?? []) {
    parts.push(Buffer.from(s, "utf16le"));
    parts.push(Buffer.from([0xff, 0xff])); // non-printable separator
  }

  parts.push(Buffer.alloc(opts.trailerBytes ?? 16, 0));
  return Buffer.concat(parts);
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe("McxProgramParserEngine", () => {
  const engine = new McxProgramParserEngine();

  // 1
  it("exports a singleton instance", () => {
    expect(mcxProgramParserEngine).toBeInstanceOf(McxProgramParserEngine);
  });

  // 2
  it("exposes documented constants", () => {
    expect(MAX_FILE_BYTES).toBe(64 * 1024 * 1024);
    expect(MIN_STRING_LEN).toBeGreaterThanOrEqual(3);
    expect(MAX_STRINGS).toBeGreaterThan(64);
    expect(MCX_SUPPORTED_EXTENSIONS.size).toBe(4);
    expect(MCX_SUPPORTED_EXTENSIONS.has(".mcx-8")).toBe(true);
    expect(MCX_SUPPORTED_EXTENSIONS.has(".mcam")).toBe(true);
  });

  describe("detectFormatFromExt", () => {
    // 3
    it("detects .mcx-8 before generic .mcx", () => {
      expect(engine.detectFormatFromExt("part.mcx-8")).toBe(".mcx-8");
    });
    // 4
    it("detects .mcx-9 before generic .mcx", () => {
      expect(engine.detectFormatFromExt("part.mcx-9")).toBe(".mcx-9");
    });
    // 5
    it("detects .mcx (legacy)", () => {
      expect(engine.detectFormatFromExt("part.mcx")).toBe(".mcx");
    });
    // 6
    it("detects .mcam (2017+)", () => {
      expect(engine.detectFormatFromExt("part.mcam")).toBe(".mcam");
    });
    // 7
    it("is case-insensitive", () => {
      expect(engine.detectFormatFromExt("PART.MCX-8")).toBe(".mcx-8");
      expect(engine.detectFormatFromExt("Part.McAm")).toBe(".mcam");
    });
    // 8
    it("returns 'unknown' for unrelated extensions", () => {
      expect(engine.detectFormatFromExt("part.step")).toBe("unknown");
      expect(engine.detectFormatFromExt("part")).toBe("unknown");
      expect(engine.detectFormatFromExt("")).toBe("unknown");
    });
  });

  describe("detectMagic", () => {
    // 9
    it("recognises .mcx-8 raw header", () => {
      expect(engine.detectMagic(MAGIC_MCX_8).mastercam).toBe(true);
      expect(engine.detectMagic(MAGIC_MCX_8).container).toBe("raw");
    });
    // 10
    it("recognises OLE container (.mcx X-X7)", () => {
      expect(engine.detectMagic(MAGIC_OLE).container).toBe("ole");
    });
    // 11
    it("recognises ZIP container (.mcam 2017+)", () => {
      expect(engine.detectMagic(MAGIC_ZIP).container).toBe("zip");
    });
    // 12
    it("rejects unrelated headers", () => {
      const bogus = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(engine.detectMagic(bogus).mastercam).toBe(false);
    });
    // 13
    it("rejects buffers shorter than 4 bytes", () => {
      expect(engine.detectMagic(Buffer.from([0x98, 0x00])).mastercam).toBe(false);
    });
    // 14
    it("rejects non-Buffer input without throwing", () => {
      // @ts-expect-error — purposeful misuse for robustness coverage
      expect(engine.detectMagic(null).mastercam).toBe(false);
    });
  });

  describe("extractStrings", () => {
    // 15
    it("returns [] for empty buffer", () => {
      expect(engine.extractStrings(Buffer.alloc(0))).toEqual([]);
    });
    // 16
    it("extracts ASCII runs ≥ minLen", () => {
      const buf = Buffer.concat([
        Buffer.from([0x00, 0x00]),
        Buffer.from("MASTERCAM", "ascii"),
        Buffer.from([0x00]),
        Buffer.from("LATHE", "ascii"),
        Buffer.from([0x00]),
      ]);
      const out = engine.extractStrings(buf, 4);
      expect(out).toContain("MASTERCAM");
      expect(out).toContain("LATHE");
    });
    // 17
    it("extracts UTF-16 LE runs ≥ minLen", () => {
      const buf = Buffer.concat([
        Buffer.from([0xff, 0xff]),
        Buffer.from("MILL", "utf16le"),
        Buffer.from([0xff, 0xff]),
      ]);
      const out = engine.extractStrings(buf, 4);
      expect(out).toContain("MILL");
    });
    // 18
    it("rejects runs shorter than minLen", () => {
      const buf = Buffer.concat([
        Buffer.from([0]),
        Buffer.from("AB", "ascii"),
        Buffer.from([0]),
      ]);
      expect(engine.extractStrings(buf, 4)).toEqual([]);
    });
    // 19
    it("deduplicates repeated strings", () => {
      const buf = Buffer.concat([
        Buffer.from("HELLO", "ascii"),
        Buffer.from([0]),
        Buffer.from("HELLO", "ascii"),
        Buffer.from([0]),
      ]);
      const out = engine.extractStrings(buf, 4);
      expect(out.filter((s) => s === "HELLO").length).toBe(1);
    });
    // 20
    it("respects MAX_STRINGS cap on pathological input", () => {
      const chunks: Buffer[] = [];
      for (let i = 0; i < MAX_STRINGS + 200; i++) {
        chunks.push(Buffer.from(`STRX${i.toString().padStart(6, "0")}`, "ascii"));
        chunks.push(Buffer.from([0]));
      }
      const out = engine.extractStrings(Buffer.concat(chunks), 4);
      expect(out.length).toBeLessThanOrEqual(MAX_STRINGS);
    });
  });

  describe("countZlibChunks", () => {
    // 21
    it("returns 0 for empty buffer", () => {
      expect(engine.countZlibChunks(Buffer.alloc(0))).toBe(0);
    });
    // 22
    it("counts each known zlib magic header", () => {
      const buf = Buffer.concat([
        Buffer.from([0x78, 0x01, 0x00]),
        Buffer.from([0x78, 0x5e, 0x00]),
        Buffer.from([0x78, 0x9c, 0x00]),
        Buffer.from([0x78, 0xda, 0x00]),
      ]);
      expect(engine.countZlibChunks(buf)).toBe(4);
    });
    // 23
    it("does not count 0x78 followed by an unrelated byte", () => {
      const buf = Buffer.from([0x78, 0x00, 0x78, 0xff, 0x78, 0x42]);
      expect(engine.countZlibChunks(buf)).toBe(0);
    });
  });

  describe("parseBuffer (happy paths)", () => {
    // 24
    it("parses a clean .mcx-8 fixture and reports magic verified", () => {
      const buf = buildFixture({
        magic: MAGIC_MCX_8,
        zlibChunks: 6,
        asciiStrings: ["MASTERCAM 2024", "TOOL 1 - 0.500 END MILL", "MILL"],
        utf16Strings: ["LATHE PROFILE.PST"],
      });
      const md = engine.parseBuffer(buf, "fixture.mcx-8");
      expect(md.parse_ok).toBe(true);
      expect(md.format).toBe(".mcx-8");
      expect(md.magic_verified).toBe(true);
      expect(md.bytes_scanned).toBe(buf.length);
      expect(md.bytes_total).toBe(buf.length);
      expect(md.zlib_chunks).toBe(6);
      expect(md.estimated_operations).toBe(3);
      expect(md.machine_hints).toEqual(expect.arrayContaining(["lathe", "mill"]));
      expect(md.tool_labels.some((t) => /TOOL\s+1/i.test(t))).toBe(true);
      expect(md.post_processor_hints.some((p) => p.endsWith(".PST"))).toBe(true);
      expect(md.version).toBe("2024");
      expect(md.errors).toEqual([]);
    });

    // 25
    it("parses a .mcam ZIP container", () => {
      const buf = buildFixture({
        magic: MAGIC_ZIP,
        asciiStrings: ["MASTERCAM 2026", "MILLTURN", "WIRE EDM"],
      });
      const md = engine.parseBuffer(buf, "fixture.mcam");
      expect(md.format).toBe(".mcam");
      expect(md.magic_verified).toBe(true);
      expect(md.machine_hints).toEqual(expect.arrayContaining(["millturn", "wire"]));
      expect(md.version).toBe("2026");
    });

    // 26
    it("parses a .mcx OLE container", () => {
      const buf = buildFixture({
        magic: MAGIC_OLE,
        asciiStrings: ["MASTERCAM X8", "ROUTER", "SWISS"],
      });
      const md = engine.parseBuffer(buf, "fixture.mcx");
      expect(md.format).toBe(".mcx");
      expect(md.magic_verified).toBe(true);
      expect(md.version).toBe("X8");
      expect(md.machine_hints).toEqual(expect.arrayContaining(["router", "swiss"]));
    });

    // 27
    it("classifies common material tokens (D2, 4140, TI-6AL-4V, INCO 718)", () => {
      const buf = buildFixture({
        magic: MAGIC_MCX_8,
        asciiStrings: ["STK D2 60HRC", "MAT 4140 ANNEALED", "TI-6AL-4V", "INCO 718"],
      });
      const md = engine.parseBuffer(buf, "fixture.mcx-8");
      const norms = md.material_hints.map((m) => m.replace(/-/g, ""));
      expect(norms).toEqual(expect.arrayContaining(["D2", "4140"]));
      // Spec-form variants get normalized (uppercase, whitespace stripped)
      expect(md.material_hints.some((m) => /TI/.test(m) && /4V/.test(m))).toBe(true);
      expect(md.material_hints.some((m) => /INCO718/.test(m))).toBe(true);
    });
  });

  describe("parseBuffer (edge & adversarial)", () => {
    // 28
    it("returns parse_ok=false on empty buffer", () => {
      const md = engine.parseBuffer(Buffer.alloc(0), "empty.mcx-8");
      expect(md.parse_ok).toBe(false);
      expect(md.errors[0]).toMatch(/empty/);
    });
    // 29
    it("returns parse_ok=false on non-Buffer input", () => {
      // @ts-expect-error — purposeful misuse
      const md = engine.parseBuffer("not a buffer", "x.mcx-8");
      expect(md.parse_ok).toBe(false);
      expect(md.errors[0]).toMatch(/Buffer/);
    });
    // 30
    it("warns on unknown extension but still scans", () => {
      const buf = buildFixture({
        magic: MAGIC_MCX_8,
        asciiStrings: ["MASTERCAM 2022"],
      });
      const md = engine.parseBuffer(buf, "stripped-extension");
      expect(md.parse_ok).toBe(true);
      expect(md.format).toBe("unknown");
      expect(md.warnings.some((w) => /unknown extension/i.test(w))).toBe(true);
      expect(md.version).toBe("2022");
    });
    // 31
    it("warns on bad magic for a Mastercam-extension file but still parses", () => {
      const buf = Buffer.concat([
        Buffer.from([0xde, 0xad, 0xbe, 0xef]),
        Buffer.alloc(64, 0),
      ]);
      const md = engine.parseBuffer(buf, "bad-magic.mcx-8");
      expect(md.parse_ok).toBe(true);
      expect(md.magic_verified).toBe(false);
      expect(md.warnings.some((w) => /magic-byte check/i.test(w))).toBe(true);
    });
    // 32
    it("normalises filename to basename", () => {
      const buf = buildFixture({ magic: MAGIC_MCX_8 });
      const md = engine.parseBuffer(buf, "/some/deep/path/inner.mcx-8");
      expect(md.filename).toBe("inner.mcx-8");
    });
    // 33
    it("handles arbitrary binary noise without throwing", () => {
      const noise = Buffer.alloc(4096);
      for (let i = 0; i < noise.length; i++) noise[i] = (i * 53 + 13) & 0xff;
      const md = engine.parseBuffer(noise, "noise.mcx-8");
      expect(md.parse_ok).toBe(true);
      expect(md.errors).toEqual([]);
    });
    // 34
    it("two parses of identical input yield identical output (deterministic)", () => {
      const buf = buildFixture({
        magic: MAGIC_MCX_8,
        zlibChunks: 4,
        asciiStrings: ["MASTERCAM X9", "TOOL 5 - DRILL", "LATHE"],
      });
      const a = engine.parseBuffer(buf, "det.mcx-8");
      const b = engine.parseBuffer(buf, "det.mcx-8");
      expect(b).toEqual(a);
    });
    // 35
    it("two distinct fixtures yield distinct metadata", () => {
      const a = engine.parseBuffer(
        buildFixture({ magic: MAGIC_MCX_8, asciiStrings: ["LATHE"] }),
        "a.mcx-8",
      );
      const b = engine.parseBuffer(
        buildFixture({ magic: MAGIC_MCX_8, asciiStrings: ["MILL"] }),
        "b.mcx-8",
      );
      expect(b.machine_hints).not.toEqual(a.machine_hints);
    });
  });

  // ── parseFile (real I/O against tmp files) ──────────────────────────────

  describe("parseFile", () => {
    let tmpDir: string;
    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-mcx-"));
    });
    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    function tmpWrite(name: string, buf: Buffer): string {
      const p = path.join(tmpDir, name);
      fs.writeFileSync(p, buf);
      return p;
    }

    // 36
    it("parses a real on-disk .mcx-8", () => {
      const buf = buildFixture({
        magic: MAGIC_MCX_8,
        zlibChunks: 8,
        asciiStrings: ["MASTERCAM 2023", "LATHE", "TOOL 1 - 0.250 END MILL"],
      });
      const md = engine.parseFile(tmpWrite("part.mcx-8", buf));
      expect(md.parse_ok).toBe(true);
      expect(md.format).toBe(".mcx-8");
      expect(md.bytes_total).toBe(buf.length);
      expect(md.bytes_scanned).toBe(buf.length);
      expect(md.oversized).toBe(false);
      expect(md.zlib_chunks).toBe(8);
      expect(md.version).toBe("2023");
    });

    // 37
    it("returns parse_ok=false when path does not exist", () => {
      const md = engine.parseFile(path.join(tmpDir, "nope.mcx-8"));
      expect(md.parse_ok).toBe(false);
      expect(md.errors[0]).toMatch(/stat failed/i);
      expect(md.format).toBe(".mcx-8");
    });

    // 38
    it("returns parse_ok=false when path is a directory", () => {
      const dir = path.join(tmpDir, "subdir");
      fs.mkdirSync(dir);
      const md = engine.parseFile(dir);
      expect(md.parse_ok).toBe(false);
      expect(md.errors[0]).toMatch(/not a regular file/i);
    });

    // 39
    it("respects maxBytes and flags oversized + truncates scan", () => {
      const big = buildFixture({
        magic: MAGIC_MCX_8,
        zlibChunks: 100,
        asciiStrings: ["MASTERCAM 2025", "MILL"],
      });
      const filePath = tmpWrite("big.mcx-8", big);
      const md = engine.parseFile(filePath, { maxBytes: 32 });
      expect(md.parse_ok).toBe(true);
      expect(md.oversized).toBe(true);
      expect(md.bytes_scanned).toBe(32);
      expect(md.bytes_total).toBe(big.length);
      expect(md.warnings.some((w) => /truncated/i.test(w))).toBe(true);
    });

    // 40
    it("clamps maxBytes to MAX_FILE_BYTES", () => {
      const buf = buildFixture({ magic: MAGIC_MCX_8, asciiStrings: ["LATHE"] });
      const md = engine.parseFile(tmpWrite("small.mcx-8", buf), {
        maxBytes: MAX_FILE_BYTES * 4,
      });
      // No oversized flag because cap >> file size
      expect(md.oversized).toBe(false);
      expect(md.parse_ok).toBe(true);
    });

    // 41
    it("handles an empty on-disk file as a hard error", () => {
      const md = engine.parseFile(tmpWrite("zero.mcx-8", Buffer.alloc(0)));
      expect(md.parse_ok).toBe(false);
      expect(md.errors[0]).toMatch(/empty/i);
    });
  });

  // ── Shape contracts ─────────────────────────────────────────────────────

  describe("metadata shape contract", () => {
    // 42
    it("every successful parse populates all required fields with correct types", () => {
      const buf = buildFixture({
        magic: MAGIC_MCX_8,
        zlibChunks: 2,
        asciiStrings: ["MASTERCAM 2022", "LATHE"],
      });
      const md: McxProgramMetadata = engine.parseBuffer(buf, "shape.mcx-8");
      expect(typeof md.filename).toBe("string");
      expect(typeof md.format).toBe("string");
      expect(typeof md.bytes_scanned).toBe("number");
      expect(Array.isArray(md.embedded_strings)).toBe(true);
      expect(Array.isArray(md.tool_labels)).toBe(true);
      expect(Array.isArray(md.machine_hints)).toBe(true);
      expect(Array.isArray(md.post_processor_hints)).toBe(true);
      expect(Array.isArray(md.material_hints)).toBe(true);
      expect(Array.isArray(md.warnings)).toBe(true);
      expect(Array.isArray(md.errors)).toBe(true);
      expect(typeof md.parse_ok).toBe("boolean");
      expect(typeof md.magic_verified).toBe("boolean");
      expect(typeof md.zlib_chunks).toBe("number");
      expect(md.estimated_operations).toBeGreaterThanOrEqual(0);
    });

    // 43
    it("error metadata has all arrays empty except errors[]", () => {
      const md = engine.parseBuffer(Buffer.alloc(0), "err.mcx-8");
      expect(md.parse_ok).toBe(false);
      expect(md.embedded_strings).toEqual([]);
      expect(md.tool_labels).toEqual([]);
      expect(md.machine_hints).toEqual([]);
      expect(md.post_processor_hints).toEqual([]);
      expect(md.material_hints).toEqual([]);
      expect(md.zlib_chunks).toBe(0);
      expect(md.estimated_operations).toBe(0);
      expect(md.errors.length).toBeGreaterThan(0);
    });
  });
});
