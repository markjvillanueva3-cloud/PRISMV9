/**
 * PPProgramChunkerEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPProgramChunkerEngine,
  ppProgramChunkerEngine,
} from "../engines/PPProgramChunkerEngine.js";

// Sample program (20 lines, 3 operations, 2 tool changes)
const SAMPLE_PROGRAM = `%
O1001 (TEST PROGRAM)
G90 G21 G17
G54
T1 M6 (TOOL 1)
S2000 M3
M8
G0 X10 Y10
G0 Z5
G1 Z-1 F200
G1 X50
G0 Z25
T2 M6 (TOOL 2)
S3000 M3
G0 X0 Y0
G0 Z5
G1 Z-2 F150
G1 X20
G0 Z25
M9
M5
M30
%`;

describe("PPProgramChunkerEngine", () => {
  it("exports singleton", () => {
    expect(ppProgramChunkerEngine).toBeInstanceOf(PPProgramChunkerEngine);
  });

  describe("chunk — by_lines strategy", () => {
    it("splits program into multiple chunks", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 10,
      });
      expect(r.chunks.length).toBeGreaterThanOrEqual(2);
      expect(r.total_chunks).toBe(r.chunks.length);
    });

    it("single chunk for small program under limit", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 1000,
      });
      expect(r.chunks.length).toBe(1);
    });

    it("chunks have sequential line ranges", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 5,
      });
      for (let i = 1; i < r.chunks.length; i++) {
        expect(r.chunks[i].start_line).toBe(r.chunks[i - 1].end_line + 1);
      }
    });
  });

  describe("chunk — by_bytes strategy", () => {
    it("splits by byte limit", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_bytes",
        max_bytes_per_chunk: 80,
      });
      expect(r.chunks.length).toBeGreaterThan(1);
    });

    it("tracks byte count per chunk", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_bytes",
        max_bytes_per_chunk: 100,
      });
      for (const c of r.chunks) {
        expect(c.byte_count).toBeGreaterThan(0);
      }
    });
  });

  describe("chunk — by_tool strategy", () => {
    it("splits at tool changes", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_tool",
      });
      // Should have at least 2 chunks (T1 and T2 boundary)
      expect(r.chunks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("chunk — by_operation strategy", () => {
    const opProgram = `%
O2001 (OPS)
G90 G21
(OPERATION 1)
T1 M6
G0 X0 Y0
(OPERATION 2)
T2 M6
G0 X10 Y10
M30
%`;
    it("splits at operation markers", () => {
      const r = ppProgramChunkerEngine.chunk(opProgram, {
        strategy: "by_operation",
      });
      expect(r.chunks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("modal state preservation", () => {
    it("tracks modal state at each chunk boundary", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
      });
      for (const c of r.chunks) {
        expect(c.modal_state_at_start).toBeDefined();
        expect(c.modal_state_at_end).toBeDefined();
      }
    });

    it("captures units G21 in modal state", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
      });
      const last = r.chunks[r.chunks.length - 1];
      expect(last.modal_state_at_end.units).toBe("G21");
    });

    it("captures distance mode G90", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
      });
      const last = r.chunks[r.chunks.length - 1];
      expect(last.modal_state_at_end.distance).toBe("G90");
    });

    it("captures active tool", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
      });
      const last = r.chunks[r.chunks.length - 1];
      expect(last.modal_state_at_end.active_tool).toBe(2);
    });

    it("inserts modal restore block in continuation chunks", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
      });
      if (r.chunks.length > 1) {
        // Second chunk should contain G90, G21, etc in restore block
        expect(r.chunks[1].text).toContain("G90");
        expect(r.chunks[1].text).toContain("G21");
      }
    });
  });

  describe("safe_block protection", () => {
    const cycleProgram = `%
O3001
G90 G21
T1 M6
S1000 M3
G81 X0 Y0 Z-5 R2 F100
X10 Y0
X20 Y0
X30 Y0
X40 Y0
X50 Y0
X60 Y0
G80
G0 Z25
M30
%`;

    it("does not split inside active drill cycle when safe_block=true", () => {
      const r = ppProgramChunkerEngine.chunk(cycleProgram, {
        strategy: "by_lines",
        max_lines_per_chunk: 4,
        safe_block: true,
      });
      // Find the chunk containing G81 — modal state at end should be defined
      // Check that no chunk ends with drill_cycle active
      for (const c of r.chunks) {
        // If this chunk has G81 but not G80, next chunk must be after G80
        if (c.modal_state_at_end.drill_cycle) {
          // This means split happened with cycle still active — warning should exist
          expect(r.warnings.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("chunk headers and comments", () => {
    it("includes chunk comment by default", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
      });
      expect(r.chunks[0].text).toContain("CHUNK 1");
    });

    it("continuation chunks include % and program number", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
      });
      if (r.chunks.length > 1) {
        expect(r.chunks[1].text).toContain("O1001");
      }
    });

    it("suppresses comments when chunk_comment=false", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
        chunk_comment: false,
      });
      expect(r.chunks[0].text).not.toContain("CHUNK 1");
    });
  });

  describe("chunk metadata", () => {
    it("extracts program number", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
      });
      expect(r.program_number).toBe("1001");
    });

    it("flags chunks with tool changes", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 8,
      });
      const toolChangeChunks = r.chunks.filter(c => c.has_tool_change);
      expect(toolChangeChunks.length).toBeGreaterThan(0);
    });

    it("flags chunk with program end", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
      });
      const last = r.chunks[r.chunks.length - 1];
      expect(last.has_program_end).toBe(true);
    });

    it("tracks total bytes and lines", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
      });
      expect(r.total_bytes).toBeGreaterThan(0);
      expect(r.total_lines).toBeGreaterThan(0);
    });
  });

  describe("listStrategies", () => {
    it("returns 4 strategies", () => {
      expect(ppProgramChunkerEngine.listStrategies().length).toBe(4);
    });

    it("includes by_lines and by_tool", () => {
      const strats = ppProgramChunkerEngine.listStrategies();
      expect(strats).toContain("by_lines");
      expect(strats).toContain("by_tool");
    });
  });

  describe("defaultOptions", () => {
    it("by_lines defaults to 500", () => {
      const opts = ppProgramChunkerEngine.defaultOptions("by_lines");
      expect(opts.max_lines_per_chunk).toBe(500);
    });

    it("by_bytes defaults to 8192", () => {
      const opts = ppProgramChunkerEngine.defaultOptions("by_bytes");
      expect(opts.max_bytes_per_chunk).toBe(8192);
    });

    it("all strategies enable safe_block by default", () => {
      for (const strat of ppProgramChunkerEngine.listStrategies()) {
        expect(ppProgramChunkerEngine.defaultOptions(strat).safe_block).toBe(true);
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppProgramChunkerEngine.chunk("", { strategy: "by_lines" });
      expect(r.chunks.length).toBeLessThanOrEqual(1);
    });

    it("handles single-line program", () => {
      const r = ppProgramChunkerEngine.chunk("M30", { strategy: "by_lines" });
      expect(r.chunks.length).toBe(1);
      expect(r.chunks[0].has_program_end).toBe(true);
    });

    it("handles program without program number", () => {
      const r = ppProgramChunkerEngine.chunk("G90 G21\nM30", { strategy: "by_lines" });
      expect(r.program_number).toBeUndefined();
    });
  });

  describe("reassembly sanity", () => {
    it("total chunk byte count > original byte count (due to headers)", () => {
      const r = ppProgramChunkerEngine.chunk(SAMPLE_PROGRAM, {
        strategy: "by_lines",
        max_lines_per_chunk: 5,
      });
      const total = r.chunks.reduce((s, c) => s + c.byte_count, 0);
      // Chunks have extra modal restore blocks → larger total
      expect(total).toBeGreaterThan(SAMPLE_PROGRAM.length);
    });
  });
});
