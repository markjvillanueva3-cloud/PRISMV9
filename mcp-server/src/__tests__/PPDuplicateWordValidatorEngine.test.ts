/**
 * PPDuplicateWordValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPDuplicateWordValidatorEngine,
  ppDuplicateWordValidatorEngine,
} from "../engines/PPDuplicateWordValidatorEngine.js";

describe("PPDuplicateWordValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppDuplicateWordValidatorEngine).toBeInstanceOf(
      PPDuplicateWordValidatorEngine,
    );
  });

  describe("duplicate_word (X/Y/Z/F/S/T/etc.)", () => {
    it("flags two X-words on same block", () => {
      const code = `%
O1001
G1 X10. X20. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
      expect(m[0].details?.letter).toBe("X");
      expect(m[0].details?.occurrence_count).toBe(2);
    });

    it("flags two F-words", () => {
      const code = `%
O1001
G1 X10. F100. F200.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(1);
      expect(m[0].details?.letter).toBe("F");
    });

    it("flags two T-words", () => {
      const code = `%
O1001
T1 T2 M6
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(1);
      expect(m[0].details?.letter).toBe("T");
    });

    it("flags duplicate R-word", () => {
      const code = `%
O1001
G81 X0. Y0. Z-5. R1. R2. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(1);
      expect(m[0].details?.letter).toBe("R");
    });

    it("flags duplicate I/J/K", () => {
      const code = `%
O1001
G2 X10. Y0. I5. I6.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(1);
      expect(m[0].details?.letter).toBe("I");
    });

    it("three duplicates on same block count as one issue", () => {
      const code = `%
O1001
G1 X10. X20. X30. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(1);
      expect(m[0].details?.occurrence_count).toBe(3);
    });

    it("does not flag single occurrences", () => {
      const code = `%
O1001
G1 X10. Y20. Z-5. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      expect(r.errors).toBe(0);
      expect(r.summary.valid).toBe(true);
    });

    it("counts duplicates across multiple blocks", () => {
      const code = `%
O1001
G1 X10. X20. F100.
G1 Y10. Y20. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      expect(r.summary.duplicates_found).toBe(2);
    });
  });

  describe("G-word handling", () => {
    it("permits G0 G90 (different modal groups) by default", () => {
      const code = `%
O1001
G0 G90 X0. Y0.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(0);
    });

    it("flags identical G1 G1 as duplicate", () => {
      const code = `%
O1001
G1 G1 X10. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(1);
      expect(m[0].details?.letter).toBe("G");
    });

    it("opt-in flags any multi-G as info", () => {
      const code = `%
O1001
G0 G90 X0.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code, {
        check_multiple_g: true,
      });
      const m = r.issues.filter((i) => i.kind === "duplicate_g_multi_group");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });
  });

  describe("M-word handling", () => {
    it("permits multiple M on block by default", () => {
      const code = `%
O1001
M8 M3 S1200
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_m_block");
      expect(m.length).toBe(0);
    });

    it("flags same M-value twice", () => {
      const code = `%
O1001
M3 M3 S1200
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(1);
      expect(m[0].details?.letter).toBe("M");
    });

    it("opt-in flags multi-M-block", () => {
      const code = `%
O1001
M8 M3 S1200
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code, {
        check_multiple_m: true,
      });
      const m = r.issues.filter((i) => i.kind === "duplicate_m_block");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });
  });

  describe("summary metrics", () => {
    it("reports blocks_scanned", () => {
      const code = `%
O1001
G0 X10. Y10.
G1 X20. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      expect(r.summary.blocks_scanned).toBe(4); // O1001, G0, G1, M30
    });

    it("identifies worst_letter", () => {
      const code = `%
O1001
G1 X1. X2. F100.
G1 X3. X4. F100.
G1 Y5. Y6. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      expect(r.summary.worst_letter).toBe("X");
    });

    it("reports valid=true when no duplicates", () => {
      const code = `%
O1001
G1 X10. Y20. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });

    it("reports valid=false when duplicates present", () => {
      const code = `%
O1001
G1 X10. X20. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(false);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean code", () => {
      const code = `%
O1001
G1 X10. Y20. F100.
M30
%`;
      const q = ppDuplicateWordValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.duplicates_found).toBe(0);
    });

    it("returns valid=false with duplicates", () => {
      const code = `%
O1001
G1 X10. X20. F100.
M30
%`;
      const q = ppDuplicateWordValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.duplicates_found).toBe(1);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppDuplicateWordValidatorEngine.defaultOptions();
      expect(o.check_duplicates).toBe(true);
      expect(o.check_multiple_g).toBe(false);
      expect(o.check_multiple_m).toBe(false);
      expect(o.monitored_letters).toContain("X");
      expect(o.monitored_letters).toContain("F");
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppDuplicateWordValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.blocks_scanned).toBe(0);
    });

    it("ignores duplicates inside comments", () => {
      const code = `%
O1001
(X10. X20. in comment)
G1 X10. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      expect(r.errors).toBe(0);
    });

    it("respects custom monitored_letters", () => {
      const code = `%
O1001
G1 X10. X20. Y10. Y20. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code, {
        monitored_letters: ["Y"],
      });
      const letters = r.issues.map((i) => i.details?.letter);
      expect(letters).toContain("Y");
      expect(letters).not.toContain("X");
    });

    it("handles negative values", () => {
      const code = `%
O1001
G1 X-10. X-20. F100.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(1);
    });

    it("handles decimal-less integers", () => {
      const code = `%
O1001
T1 T2 M6
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_word");
      expect(m.length).toBe(1);
    });

    it("skips % markers", () => {
      const code = `%
%
O1001
G0 X10.
M30
%`;
      const r = ppDuplicateWordValidatorEngine.validate(code);
      expect(r.errors).toBe(0);
    });
  });
});
