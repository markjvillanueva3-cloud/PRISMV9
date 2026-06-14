import { describe, it, expect } from "vitest";
import { generateSequence, ToolChangeSequencer, type ToolChangeInput } from "./ToolChangeSequencer.js";

describe("ToolChangeSequencer", () => {
  describe("controller variants (≥3 variability)", () => {
    it("Fanuc: G91 G28 Z0 retract + T01 M6 format", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 1 });
      expect(r.retract_block).toBe("G91 G28 Z0");
      expect(r.tool_change_block).toBe("T01 M6");
    });
    it("Okuma: G91 G30 P1 Z0 (not G28)", () => {
      const r = generateSequence({ controller: "okuma", tool_number: 5 });
      expect(r.retract_block).toBe("G91 G30 P1 Z0");
      expect(r.tool_change_block).toBe("T05 M6");
    });
    it("Heidenhain: TOOL CALL N format + inline retract", () => {
      const r = generateSequence({ controller: "heidenhain", tool_number: 12 });
      expect(r.tool_change_block).toBe("TOOL CALL 12");
      expect(r.notes.join("|")).toContain("inline");
    });
    it("Siemens: T='Tnn' M6 format with quotes", () => {
      const r = generateSequence({ controller: "siemens", tool_number: 7 });
      expect(r.tool_change_block).toBe("T=\"T07\" M6");
    });
    it("Mazak: same retract as Fanuc", () => {
      const r = generateSequence({ controller: "mazak", tool_number: 3 });
      expect(r.retract_block).toBe("G91 G28 Z0");
    });
  });

  describe("operator stop + orient flags", () => {
    it("insert_operator_stop=true emits M00 block at end of sequence", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 1, insert_operator_stop: true });
      expect(r.operator_stop_inserted).toBe(true);
      const m00Idx = r.blocks.findIndex(b => b.includes("M00"));
      expect(m00Idx).toBe(r.blocks.length - 1);  // last block
      expect(r.blocks[m00Idx]).toBe("M00 (operator stop — verify tool offset)");
    });
    it("spindle_orient_required=true emits M19 block immediately before change", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 1, spindle_orient_required: true });
      expect(r.orient_block).toBe("M19");
      const orientIdx = r.blocks.findIndex(b => b.startsWith("M19"));
      const changeIdx = r.blocks.findIndex(b => b.startsWith("T01 M6"));
      expect(changeIdx - orientIdx).toBe(1);   // orient is exactly one block before change
    });
    it("default: no M00 + no M19", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 1 });
      expect(r.operator_stop_inserted).toBe(false);
      expect(r.orient_block).toBe(null);
    });
  });

  describe("tool description comment block", () => {
    it("description emitted as parenthesized comment before retract", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 2, tool_description: "1/2 4FL TiAlN" });
      expect(r.blocks[0]).toBe("(TOOL 2: 1/2 4FL TiAlN)");
    });
  });

  describe("tool numbering format", () => {
    it("single-digit tool padded to 2 digits (T01 not T1)", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 1 });
      expect(r.tool_change_block).toBe("T01 M6");
    });
    it("two-digit tool keeps 2 digits (T15)", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 15 });
      expect(r.tool_change_block).toBe("T15 M6");
    });
    it("three-digit tool keeps 3 digits (T123)", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 123 });
      expect(r.tool_change_block).toBe("T123 M6");
    });
  });

  describe("R12 fail-loud invalid input", () => {
    it("unknown controller → diagnostic", () => {
      const r = generateSequence({ controller: "xx" as ToolChangeInput["controller"], tool_number: 1 });
      expect(r.notes.join("|")).toContain("unknown controller");
    });
    it("NaN tool_number → diagnostic", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: NaN });
      expect(r.notes.join("|")).toContain("not finite");
    });
    it("tool_number 0 → out-of-range diagnostic", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 0 });
      expect(r.notes.join("|")).toContain("outside");
    });
    it("tool_number > 999 → out-of-range diagnostic", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 1500 });
      expect(r.notes.join("|")).toContain("outside");
    });
    it("non-integer tool_number → diagnostic", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 1.5 });
      expect(r.notes.join("|")).toContain("integer");
    });
    it("missing input → diagnostic", () => {
      const r = generateSequence(null as unknown as ToolChangeInput);
      expect(r.notes.join("|")).toContain("missing");
    });
  });

  describe("block-order invariant — comment / retract / orient / change / M00", () => {
    it("all 5 ordered blocks present in exact sequence", () => {
      const r = generateSequence({ controller: "fanuc", tool_number: 1, tool_description: "test", spindle_orient_required: true, insert_operator_stop: true });
      expect(r.blocks).toHaveLength(5);
      expect(r.blocks[0]).toBe("(TOOL 1: test)");
      expect(r.blocks[1]).toBe("G91 G28 Z0 (retract to machine zero before tool change)");
      expect(r.blocks[2]).toBe("M19 (orient spindle for ATC/TSC)");
      expect(r.blocks[3]).toBe("T01 M6");
      expect(r.blocks[4]).toBe("M00 (operator stop — verify tool offset)");
    });
  });

  it("ToolChangeSequencer.version is 1.0.0", () => {
    expect(ToolChangeSequencer.version).toBe("1.0.0");
  });
});
