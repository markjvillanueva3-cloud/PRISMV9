/**
 * PPBlockCompositionValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPBlockCompositionValidatorEngine,
  ppBlockCompositionValidatorEngine,
} from "../engines/PPBlockCompositionValidatorEngine.js";

describe("PPBlockCompositionValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppBlockCompositionValidatorEngine).toBeInstanceOf(
      PPBlockCompositionValidatorEngine,
    );
  });

  describe("too_many_words_per_block", () => {
    it("flags block with > max_words_per_block tokens", () => {
      const code = `%
O1001
G0 X10. Y20. Z30. A10. B10. C10. I5. J5. K5. R2. F100. S500 T1
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code, {
        max_words_per_block: 5,
      });
      const m = r.issues.filter(
        (i) => i.kind === "too_many_words_per_block",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("does not flag normal blocks", () => {
      const code = `%
O1001
G0 X10. Y20.
G1 Z5. F100.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "too_many_words_per_block",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("multiple_m_codes_per_block", () => {
    it("flags block with 2+ M-codes (default max=1)", () => {
      const code = `%
O1001
G0 X10. M8 M51
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "multiple_m_codes_per_block",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.m_count).toBe(2);
    });

    it("does not flag single M-code", () => {
      const code = `%
O1001
G0 X10.
M8
G1 Z5. F100.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "multiple_m_codes_per_block",
      );
      expect(m.length).toBe(0);
    });

    it("respects custom max_m_per_block", () => {
      const code = `%
O1001
T1 M6 M8 M51
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code, {
        max_m_per_block: 3,
      });
      const m = r.issues.filter(
        (i) => i.kind === "multiple_m_codes_per_block",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("multiple_g_same_group_per_block", () => {
    it("flags G0 G1 in same block (motion group)", () => {
      const code = `%
O1001
G0 G1 X10. F100.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "multiple_g_same_group_per_block",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.modal_group).toBe("01");
    });

    it("flags G90 G91 (distance mode)", () => {
      const code = `%
O1001
G90 G91 X10.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "multiple_g_same_group_per_block",
      );
      expect(m.length).toBe(1);
      expect(m[0].details?.modal_group).toBe("03");
    });

    it("does not flag G-codes from different groups", () => {
      const code = `%
O1001
G17 G90 G94 G54 G21
G0 X10.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "multiple_g_same_group_per_block",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("empty_block", () => {
    it("flags N-only block", () => {
      const code = `%
O1001
N100
G0 X10.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "empty_block");
      expect(m.length).toBe(1);
      expect(m[0].line).toBe(3);
    });

    it("does not flag block with N-number + content", () => {
      const code = `%
O1001
N100 G0 X10.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "empty_block");
      expect(m.length).toBe(0);
    });
  });

  describe("block_over_column_limit", () => {
    it("flags block > column_limit chars", () => {
      const code = `%
O1001
G1 X10.00000 Y20.00000 Z30.00000 A10.00000 B10.00000 F100.0000 S500 T1 D1 H1
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code, {
        column_limit: 40,
      });
      const m = r.issues.filter((i) => i.kind === "block_over_column_limit");
      expect(m.length).toBeGreaterThanOrEqual(1);
    });

    it("does not flag short blocks", () => {
      const code = `%
O1001
G0 X10.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code, {
        column_limit: 80,
      });
      const m = r.issues.filter((i) => i.kind === "block_over_column_limit");
      expect(m.length).toBe(0);
    });
  });

  describe("irregular_word_order", () => {
    it("opt-in flags X before G", () => {
      const code = `%
O1001
X10. G0 F100.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code, {
        check_word_order: true,
      });
      const m = r.issues.filter((i) => i.kind === "irregular_word_order");
      expect(m.length).toBe(1);
    });

    it("does not flag canonical order", () => {
      const code = `%
O1001
G0 X10. Y20. Z5.
G1 Z-1. F100.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code, {
        check_word_order: true,
      });
      const m = r.issues.filter((i) => i.kind === "irregular_word_order");
      expect(m.length).toBe(0);
    });

    it("off by default", () => {
      const code = `%
O1001
X10. G0 F100.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "irregular_word_order");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports blocks_scanned", () => {
      const code = `%
O1001
G0 X10.
G1 Z5. F100.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      expect(r.summary.blocks_scanned).toBe(4);
    });

    it("does not count pure comment lines", () => {
      const code = `%
O1001
(header)
(MATERIAL: 1018)
G0 X10.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      expect(r.summary.blocks_scanned).toBe(3);
    });

    it("tracks max_words_observed", () => {
      const code = `%
O1001
G0 X10.
G1 X20. Y30. Z5. F100. S500 T1
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      expect(r.summary.max_words_observed).toBe(7);
    });

    it("tracks max_columns_observed", () => {
      const code = `%
O1001
G0
G1 X100.0 Y200.0 Z5.0
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      expect(r.summary.max_columns_observed).toBeGreaterThan(15);
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
G0 X10. Y20.
M30
%`;
      const q = ppBlockCompositionValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.blocks).toBe(3);
      expect(q.max_words).toBeGreaterThanOrEqual(3);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppBlockCompositionValidatorEngine.defaultOptions();
      expect(o.check_words_per_block).toBe(true);
      expect(o.check_multiple_m).toBe(true);
      expect(o.check_same_group_g).toBe(true);
      expect(o.check_word_order).toBe(false);
      expect(o.max_words_per_block).toBe(12);
      expect(o.max_m_per_block).toBe(1);
      expect(o.column_limit).toBe(80);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppBlockCompositionValidatorEngine.validate("");
      expect(r.summary.blocks_scanned).toBe(0);
    });

    it("handles comment-only program", () => {
      const code = `%
(just comments)
(no code here)
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      expect(r.summary.blocks_scanned).toBe(0);
    });

    it("strips trailing comments before tokenizing", () => {
      const code = `%
O1001
G0 X10. (move to start) M8
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      // No multiple-M since inline comment strips clean
      const m = r.issues.filter(
        (i) => i.kind === "multiple_m_codes_per_block",
      );
      expect(m.length).toBe(0);
    });

    it("handles G0 normalized to G00", () => {
      const code = `%
O1001
G00 G1 X10.
M30
%`;
      const r = ppBlockCompositionValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "multiple_g_same_group_per_block",
      );
      expect(m.length).toBe(1);
    });
  });
});
