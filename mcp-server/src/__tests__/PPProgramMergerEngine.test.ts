/**
 * PPProgramMergerEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPProgramMergerEngine,
  ppProgramMergerEngine,
} from "../engines/PPProgramMergerEngine.js";
import { ppProgramChunkerEngine } from "../engines/PPProgramChunkerEngine.js";

// Chunks as emitted by PPProgramChunkerEngine
const CHUNK_0 = `%
O1001 (TEST)
(--- CHUNK 1 — ORIGINAL LINES 1-6 ---)
G90 G21 G17
G54
T1 M6
S2000 M3
G0 X10 Y10`;

const CHUNK_1 = `%
O1001
(--- CHUNK 2 — ORIGINAL LINES 7-12 ---)
(--- MODAL STATE RESTORE ---)
G90 G21 G17
G54
M3 S2000
G0 Z5
G1 Z-1 F200
G1 X20
G0 Z25`;

const CHUNK_2 = `%
O1001
(--- CHUNK 3 — ORIGINAL LINES 13-15 ---)
(--- MODAL STATE RESTORE ---)
G90 G21 G17
G54
M5
M30
%`;

describe("PPProgramMergerEngine", () => {
  it("exports singleton", () => {
    expect(ppProgramMergerEngine).toBeInstanceOf(PPProgramMergerEngine);
  });

  describe("merge — basic reassembly", () => {
    it("combines multiple chunks", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2]);
      expect(r.chunks_merged).toBe(3);
      expect(r.total_lines).toBeGreaterThan(0);
    });

    it("extracts program number from first chunk", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2]);
      expect(r.program_number).toBe("1001");
    });

    it("detects M30 program end", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2]);
      expect(r.has_program_end).toBe(true);
    });

    it("returns combined text as string", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2]);
      expect(typeof r.text).toBe("string");
      expect(r.text.length).toBeGreaterThan(0);
    });
  });

  describe("strip_chunk_markers", () => {
    it("removes chunk marker comments by default", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2]);
      expect(r.text).not.toContain("CHUNK 1");
      expect(r.text).not.toContain("CHUNK 2");
      expect(r.chunk_markers_stripped).toBeGreaterThan(0);
    });

    it("preserves markers when strip_chunk_markers=false", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1], {
        strip_chunk_markers: false,
      });
      expect(r.text).toContain("CHUNK 1");
    });
  });

  describe("strip_modal_restore", () => {
    it("removes modal restore blocks by default", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2]);
      expect(r.text).not.toContain("MODAL STATE RESTORE");
      expect(r.modal_restore_lines_stripped).toBeGreaterThan(0);
    });

    it("removes redundant G90 G21 G17 lines from continuation chunks", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2]);
      // Original has only one G90 at top — merged should too
      const g90Count = (r.text.match(/\bG90\b/g) || []).length;
      // Note: chunks 1 and 2 restore blocks are stripped, so G90 should appear only once
      expect(g90Count).toBeLessThanOrEqual(1);
    });
  });

  describe("strip_duplicate_headers", () => {
    it("removes duplicate O-number lines from continuation chunks", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2]);
      const oCount = r.text.split(/\r?\n/).filter(l => /^O\d+/i.test(l.trim())).length;
      expect(oCount).toBe(1);
    });

    it("strips leading % from continuation chunks", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2]);
      const percentCount = r.text.split(/\r?\n/).filter(l => l.trim() === "%").length;
      // Should have at most 2 (header + trailer)
      expect(percentCount).toBeLessThanOrEqual(2);
    });

    it("preserves duplicate headers when strip_duplicate_headers=false", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1], {
        strip_duplicate_headers: false,
        strip_chunk_markers: false,
        strip_modal_restore: false,
      });
      const oCount = r.text.split(/\r?\n/).filter(l => /^O\d+/i.test(l.trim())).length;
      expect(oCount).toBe(2);
    });
  });

  describe("warnings", () => {
    it("warns on empty chunk", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, "", CHUNK_2]);
      expect(r.warnings.some(w => w.issue.includes("Empty"))).toBe(true);
    });

    it("warns on program number mismatch", () => {
      const mismatched = CHUNK_1.replace("O1001", "O2002");
      const r = ppProgramMergerEngine.merge([CHUNK_0, mismatched, CHUNK_2], {
        strip_duplicate_headers: false,
      });
      expect(r.warnings.some(w => w.issue.includes("mismatch"))).toBe(true);
    });

    it("flags critical when no M30", () => {
      const noEnd = `%\nO1001\nG90 G21\nG0 X0\n`;
      const r = ppProgramMergerEngine.merge([noEnd]);
      expect(r.warnings.some(w => w.severity === "critical")).toBe(true);
      expect(r.has_program_end).toBe(false);
    });

    it("warns on multiple M30 markers", () => {
      const withEnd = `%\nO1001\nG90\nM30\n%`;
      const r = ppProgramMergerEngine.merge([withEnd, withEnd]);
      expect(r.warnings.some(w => w.issue.includes("M30"))).toBe(true);
    });
  });

  describe("chunker → merger round-trip", () => {
    const original = `%
O5001 (ROUNDTRIP TEST)
G90 G21 G17
G54
T1 M6
S1500 M3
M8
G0 X0 Y0
G0 Z5
G1 Z-1 F150
G1 X20 Y20
G1 X40 Y0
G0 Z25
T2 M6
S2500 M3
G0 X10 Y10
G0 Z5
G1 Z-2 F100
G1 X30 Y30
G0 Z25
M9
M5
M30
%`;

    it("chunked program can be merged back to recover program number", () => {
      const chunked = ppProgramChunkerEngine.chunk(original, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
      });
      const merged = ppProgramMergerEngine.merge(chunked.chunks.map(c => c.text));
      expect(merged.program_number).toBe("5001");
    });

    it("merged program has M30", () => {
      const chunked = ppProgramChunkerEngine.chunk(original, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
      });
      const merged = ppProgramMergerEngine.merge(chunked.chunks.map(c => c.text));
      expect(merged.has_program_end).toBe(true);
    });

    it("merged program has no CHUNK markers", () => {
      const chunked = ppProgramChunkerEngine.chunk(original, {
        strategy: "by_lines",
        max_lines_per_chunk: 6,
      });
      const merged = ppProgramMergerEngine.merge(chunked.chunks.map(c => c.text));
      expect(merged.text).not.toContain("CHUNK");
      expect(merged.text).not.toContain("MODAL STATE RESTORE");
    });

    it("merged program preserves the user's tool changes", () => {
      const chunked = ppProgramChunkerEngine.chunk(original, {
        strategy: "by_lines",
        max_lines_per_chunk: 6,
      });
      const merged = ppProgramMergerEngine.merge(chunked.chunks.map(c => c.text));
      expect(merged.text).toContain("T1 M6");
      expect(merged.text).toContain("T2 M6");
    });
  });

  describe("chunk_separator_blank", () => {
    it("inserts blank line between chunks when enabled", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2], {
        chunk_separator_blank: true,
      });
      // Count empty lines
      const blanks = r.text.split(/\r?\n/).filter(l => l.trim() === "").length;
      expect(blanks).toBeGreaterThanOrEqual(2); // at least between the 3 chunks
    });
  });

  describe("emit_merge_comment", () => {
    it("prepends merge-info comment", () => {
      const r = ppProgramMergerEngine.merge([CHUNK_0, CHUNK_1, CHUNK_2], {
        emit_merge_comment: true,
      });
      expect(r.text).toContain("MERGED FROM");
      expect(r.text).toContain("3 CHUNKS");
    });
  });

  describe("validate", () => {
    it("reports valid clean program", () => {
      const good = `%\nO1001\nG90 G21\nS1000 M3\nM30\n%`;
      const v = ppProgramMergerEngine.validate(good);
      expect(v.valid).toBe(true);
    });

    it("flags missing program end", () => {
      const bad = `%\nO1001\nG90 G21\n%`;
      const v = ppProgramMergerEngine.validate(bad);
      expect(v.valid).toBe(false);
      expect(v.issues.some(i => i.includes("M30"))).toBe(true);
    });

    it("flags duplicate M30", () => {
      const bad = `%\nO1001\nG90\nM30\nM30\n%`;
      const v = ppProgramMergerEngine.validate(bad);
      expect(v.valid).toBe(false);
    });

    it("flags multiple distinct program numbers", () => {
      const bad = `%\nO1001\nO2002\nM30\n%`;
      const v = ppProgramMergerEngine.validate(bad);
      expect(v.valid).toBe(false);
    });

    it("flags unbalanced % markers", () => {
      const bad = `%\nO1001\nG90\nM30`;  // missing closing %
      const v = ppProgramMergerEngine.validate(bad);
      expect(v.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns defaults with strip flags enabled", () => {
      const opts = ppProgramMergerEngine.defaultOptions();
      expect(opts.strip_modal_restore).toBe(true);
      expect(opts.strip_chunk_markers).toBe(true);
      expect(opts.strip_duplicate_headers).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles single chunk (no-op merge)", () => {
      const single = `%\nO1001\nG90\nM30\n%`;
      const r = ppProgramMergerEngine.merge([single]);
      expect(r.chunks_merged).toBe(1);
      expect(r.has_program_end).toBe(true);
    });

    it("handles empty array", () => {
      const r = ppProgramMergerEngine.merge([]);
      expect(r.chunks_merged).toBe(0);
      expect(r.total_lines).toBe(0);
    });

    it("handles chunk with only comments", () => {
      const r = ppProgramMergerEngine.merge([
        `(--- CHUNK 1 ---)`,
        `%\nO1001\nG90\nM30\n%`,
      ]);
      expect(r.text).toContain("M30");
    });
  });
});
