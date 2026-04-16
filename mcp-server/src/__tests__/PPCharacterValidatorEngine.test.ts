/**
 * PPCharacterValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPCharacterValidatorEngine,
  ppCharacterValidatorEngine,
} from "../engines/PPCharacterValidatorEngine.js";

describe("PPCharacterValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppCharacterValidatorEngine).toBeInstanceOf(
      PPCharacterValidatorEngine,
    );
  });

  describe("clean ASCII program", () => {
    it("produces no issues", () => {
      const code = `%\nO1001\nG17 G90 G94 G40 G49 G80 G54 G21\nG0 X0. Y0.\nM30\n%\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      expect(r.errors).toBe(0);
      expect(r.summary.valid).toBe(true);
      expect(r.summary.has_bom).toBe(false);
      expect(r.summary.non_ascii_count).toBe(0);
    });
  });

  describe("bom_marker", () => {
    it("flags UTF-8 BOM at file start", () => {
      const code = "\uFEFF%\nO1001\nM30\n%\n";
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "bom_marker");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
      expect(r.summary.has_bom).toBe(true);
    });

    it("can be disabled", () => {
      const code = "\uFEFF%\nO1001\nM30\n%\n";
      const r = ppCharacterValidatorEngine.validate(code, {
        check_bom: false,
      });
      const m = r.issues.filter((i) => i.kind === "bom_marker");
      expect(m.length).toBe(0);
    });
  });

  describe("non_ascii_character", () => {
    it("flags smart quote", () => {
      const code = `%\nO1001\n(don\u2019t panic)\nM30\n%\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "non_ascii_character");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
      expect(m[0].details?.code_point).toBe(0x2019);
    });

    it("flags non-breaking space", () => {
      const code = `%\nO1001\nG0\u00A0X10.\nM30\n%\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "non_ascii_character");
      expect(m.length).toBe(1);
      expect(m[0].details?.code_point).toBe(0x00a0);
    });

    it("flags em-dash", () => {
      const code = `%\nO1001\n(length \u2014 15mm)\nM30\n%\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "non_ascii_character");
      expect(m.length).toBe(1);
      expect(m[0].details?.code_point).toBe(0x2014);
    });

    it("counts multiple non-ASCII chars in summary", () => {
      const code = `%\n(smart \u201Cquotes\u201D)\nM30\n%\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      expect(r.summary.non_ascii_count).toBe(2);
    });
  });

  describe("embedded_null", () => {
    it("flags NUL byte as error", () => {
      const code = `O1001\nG0 X10.\u0000\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "embedded_null");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });
  });

  describe("non_printable_character", () => {
    it("flags ESC (0x1B)", () => {
      const code = `O1001\nG0\u001BX10.\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "non_printable_character");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.code_point).toBe(0x1b);
    });

    it("flags DEL (0x7F)", () => {
      const code = `O1001\nG0 X10.\u007F\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "non_printable_character");
      expect(m.length).toBe(1);
      expect(m[0].details?.code_point).toBe(0x7f);
    });
  });

  describe("tab_character", () => {
    it("flags tabs", () => {
      const code = `O1001\nG0\tX10.\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tab_character");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("can be disabled", () => {
      const code = `O1001\nG0\tX10.\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code, {
        check_tab: false,
      });
      const m = r.issues.filter((i) => i.kind === "tab_character");
      expect(m.length).toBe(0);
    });
  });

  describe("trailing_whitespace", () => {
    it("opt-in flags trailing spaces", () => {
      const code = `O1001\nG0 X10.   \nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code, {
        check_trailing_whitespace: true,
      });
      const m = r.issues.filter((i) => i.kind === "trailing_whitespace");
      expect(m.length).toBe(1);
    });

    it("off by default", () => {
      const code = `O1001\nG0 X10.   \nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "trailing_whitespace");
      expect(m.length).toBe(0);
    });
  });

  describe("mixed_line_endings", () => {
    it("flags CRLF + LF mix", () => {
      const code = `O1001\r\nG0 X10.\nM30\r\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mixed_line_endings");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag pure CRLF", () => {
      const code = `O1001\r\nG0 X10.\r\nM30\r\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mixed_line_endings");
      expect(m.length).toBe(0);
    });

    it("does not flag pure LF", () => {
      const code = `O1001\nG0 X10.\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mixed_line_endings");
      expect(m.length).toBe(0);
    });
  });

  describe("bare_cr", () => {
    it("flags classic-Mac CR-only", () => {
      const code = `O1001\rG0 X10.\rM30\r`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "bare_cr");
      expect(m.length).toBe(1);
    });
  });

  describe("very_long_line", () => {
    it("flags lines exceeding max_line_length", () => {
      const longLine = "G1 " + "X1. ".repeat(100);
      const code = `O1001\n${longLine}\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code, {
        max_line_length: 100,
      });
      const m = r.issues.filter((i) => i.kind === "very_long_line");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("respects default 256", () => {
      const code = `O1001\nG0 X10.\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "very_long_line");
      expect(m.length).toBe(0);
    });
  });

  describe("lowercase_letter", () => {
    it("opt-in flags lowercase g/m/x", () => {
      const code = `O1001\ng0 x10.\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code, {
        check_lowercase: true,
      });
      const m = r.issues.filter((i) => i.kind === "lowercase_letter");
      expect(m.length).toBeGreaterThanOrEqual(1);
    });

    it("off by default", () => {
      const code = `O1001\ng0 x10.\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "lowercase_letter");
      expect(m.length).toBe(0);
    });

    it("reports only one issue per line", () => {
      const code = `O1001\ng0 x10. y20. z30.\nM30\n`;
      const r = ppCharacterValidatorEngine.validate(code, {
        check_lowercase: true,
      });
      const m = r.issues.filter((i) => i.kind === "lowercase_letter");
      expect(m.length).toBe(1);
    });
  });

  describe("summary metrics", () => {
    it("counts total_lines correctly", () => {
      const code = `line1\nline2\nline3\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      expect(r.summary.total_lines).toBe(4); // trailing empty line counts
    });

    it("tracks longest_line", () => {
      const code = `short\nbit longer line\n`;
      const r = ppCharacterValidatorEngine.validate(code);
      expect(r.summary.longest_line).toBe(15);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean ASCII", () => {
      const code = `O1001\nG0 X10.\nM30\n`;
      const q = ppCharacterValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.errors).toBe(0);
      expect(q.has_bom).toBe(false);
    });

    it("returns valid=false with BOM", () => {
      const code = `\uFEFFO1001\nG0 X10.\nM30\n`;
      const q = ppCharacterValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.has_bom).toBe(true);
    });

    it("reports non_ascii_count", () => {
      const code = `O1001\n(\u2014\u2014)\nM30\n`;
      const q = ppCharacterValidatorEngine.quickCheck(code);
      expect(q.non_ascii_count).toBe(2);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppCharacterValidatorEngine.defaultOptions();
      expect(o.check_bom).toBe(true);
      expect(o.check_non_ascii).toBe(true);
      expect(o.check_embedded_null).toBe(true);
      expect(o.check_tab).toBe(true);
      expect(o.check_trailing_whitespace).toBe(false);
      expect(o.check_lowercase).toBe(false);
      expect(o.max_line_length).toBe(256);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppCharacterValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.total_lines).toBe(1);
    });

    it("handles single character", () => {
      const r = ppCharacterValidatorEngine.validate("%");
      expect(r.summary.valid).toBe(true);
    });

    it("BOM + smart quote combines issue counts", () => {
      const code = `\uFEFF(\u2019)`;
      const r = ppCharacterValidatorEngine.validate(code);
      expect(r.errors).toBeGreaterThanOrEqual(2);
    });
  });
});
