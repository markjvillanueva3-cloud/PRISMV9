/**
 * GCodeSnippetEngine — companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * GCodeSnippetEngine is a pure, deterministic G-code snippet library (parameterized
 * templates filled via naive `{key}` substitution). These tests lock its real emit
 * behavior with reference-value asserts so a future edit to a snippet body or to the
 * fill substitution semantics fails loudly (R9 — tests verify intent, not behavior).
 *
 * Domain note (echo): snippets are Fanuc-dialect boilerplate. The engine does NOT
 * validate params or guard against value-injection — characterized below so a future
 * injection-safe rewrite is a conscious change, not a silent one.
 */

import { describe, it, expect } from "vitest";
import { gCodeSnippetEngine, GCodeSnippetEngine } from "../engines/GCodeSnippetEngine.js";

describe("GCodeSnippetEngine", () => {
  describe("singleton + construction", () => {
    it("exports a singleton instance of the class", () => {
      expect(gCodeSnippetEngine).toBeInstanceOf(GCodeSnippetEngine);
    });
  });

  describe("get(id)", () => {
    it("returns the full snippet record for a known id (reference fields)", () => {
      const s = gCodeSnippetEngine.get("program_footer");
      expect(s).not.toBeNull();
      expect(s!.id).toBe("program_footer");
      expect(s!.controller).toBe("fanuc");
      expect(s!.category).toBe("setup");
      expect(s!.params).toEqual([]); // footer takes no params
      // The footer body is fixed boilerplate — lock the program-end sequence verbatim.
      // EOL-normalized so the byte-exact compare survives a CRLF/LF flip of either file
      // (PRISM Edit-tool CRLF hazard, [[feedback_edit_tool_crlf_flips_lf_files]]).
      expect(s!.code.replace(/\r\n/g, "\n")).toBe(
        `G28 G91 Z0. (Retract Z)
G28 Y0. (Retract Y)
M5 (Spindle stop)
M9 (Coolant off)
M30 (Program end)
%`,
      );
    });

    it("returns null for an unknown id", () => {
      expect(gCodeSnippetEngine.get("does_not_exist")).toBeNull();
    });
  });

  describe("fill(id, params)", () => {
    it("substitutes every occurrence of each placeholder (global replace)", () => {
      // tool_change references {tool_number} twice and {rpm} once.
      const out = gCodeSnippetEngine.fill("tool_change", { tool_number: 5, rpm: 8000 });
      expect(out).not.toBeNull();
      // EOL-normalized (see CRLF note above).
      expect(out!.replace(/\r\n/g, "\n")).toBe(
        `G28 G91 Z0. (Retract Z to home)
M5 (Spindle stop)
T5 M6 (Tool change)
G43 H5 (Tool length comp)
S8000 M3 (Spindle on CW)`,
      );
      // No placeholder braces survive a fully-supplied fill.
      expect(out).not.toMatch(/\{[a-z_]+\}/);
    });

    it("coerces numeric param values via String() (no float reformatting)", () => {
      const out = gCodeSnippetEngine.fill("coolant_flood", {})!;
      expect(out).toBe("M8 (Flood coolant on)"); // no params -> unchanged
      const drill = gCodeSnippetEngine.fill("drill_peck", {
        x: 1.25, y: -0.5, depth: -0.75, peck_depth: 0.1, retract: 0.05, clearance: 0.25, feed: 12, tool_number: 3,
      })!;
      expect(drill).toContain("G0 X1.25 Y-0.5 (Rapid to hole position)");
      expect(drill).toContain("G83 Z-0.75 Q0.1 R0.05 F12 (Peck drill)");
      expect(drill).toContain("G43 H3 Z0.25");
    });

    it("returns null for an unknown id", () => {
      expect(gCodeSnippetEngine.fill("nope", { a: 1 })).toBeNull();
    });

    it("FAILURE MODE: leaves unfilled placeholders literal (no param validation)", () => {
      // Only tool_number supplied — {rpm} must remain literal in the output.
      const out = gCodeSnippetEngine.fill("tool_change", { tool_number: 7 })!;
      expect(out).toContain("T7 M6 (Tool change)");
      expect(out).toContain("S{rpm} M3 (Spindle on CW)"); // unfilled, surfaced as-is
    });

    it("ADVERSARIAL: a value containing a later placeholder token is re-substituted (naive sequential fill)", () => {
      // tool_number is filled first with the literal "{rpm}", then the rpm pass rewrites it.
      // This characterizes the value-injection cross-contamination of sequential replace.
      const out = gCodeSnippetEngine.fill("tool_change", { tool_number: "{rpm}", rpm: 9000 })!;
      expect(out).toContain("T9000 M6 (Tool change)"); // injected token got re-filled
      expect(out).toContain("H9000 (Tool length comp)");
      expect(out).toContain("S9000 M3 (Spindle on CW)");
    });

    it("ADVERSARIAL: an extra param not present in the template is a harmless no-op", () => {
      const out = gCodeSnippetEngine.fill("coolant_flood", { bogus: 42, another: "x" })!;
      expect(out).toBe("M8 (Flood coolant on)");
    });

    it("FIXED (U-PP-GCODE-SNIPPET-FILL-INJECTION-SAFE): a value containing $& is inserted LITERALLY", () => {
      // Literal split/join (was RegExp + String-replacement). With the old code, a "$&" value
      // meant "the matched substring", re-inserting the {tool_number} placeholder verbatim.
      const out = gCodeSnippetEngine.fill("tool_change", { tool_number: "$&", rpm: 100 })!;
      expect(out).toContain("T$& M6 (Tool change)"); // literal $&, not a re-inserted {tool_number}
      expect(out).toContain("H$& (Tool length comp)");
      expect(out).not.toContain("{tool_number}"); // placeholder fully consumed
    });

    it("FIXED: a param key containing a regex metacharacter does not throw", () => {
      // Old code built `new RegExp("\\{a(b\\}")` -> SyntaxError (unbalanced group). split/join is literal.
      expect(() => gCodeSnippetEngine.fill("coolant_flood", { "a(b": 1 })).not.toThrow();
      expect(gCodeSnippetEngine.fill("coolant_flood", { "a(b": 1 })).toBe("M8 (Flood coolant on)");
    });
  });

  describe("search / byCategory / categories / list / getStats invariants", () => {
    it("search is case-insensitive across name, description, id and category", () => {
      const drillHits = gCodeSnippetEngine.search("DRILL");
      expect(drillHits.length).toBeGreaterThanOrEqual(1);
      expect(drillHits.every((s) => s.category === "drilling" || /drill/i.test(s.name + s.description + s.id))).toBe(true);
      // id-substring match: "tap" lives in the rigid_tap id.
      expect(gCodeSnippetEngine.search("tap").some((s) => s.id === "rigid_tap")).toBe(true);
      // No match -> empty array (not null/throw).
      expect(gCodeSnippetEngine.search("zzz_no_such_snippet")).toEqual([]);
    });

    it("byCategory returns only members of that category and nothing else", () => {
      const setup = gCodeSnippetEngine.byCategory("setup");
      expect(setup.length).toBeGreaterThanOrEqual(1);
      expect(setup.every((s) => s.category === "setup")).toBe(true);
      expect(gCodeSnippetEngine.byCategory("not_a_category")).toEqual([]);
    });

    it("categories() is the de-duplicated set of all snippet categories", () => {
      const cats = gCodeSnippetEngine.categories();
      expect(new Set(cats).size).toBe(cats.length); // unique
      // The four authored categories are present.
      expect(cats).toEqual(expect.arrayContaining(["setup", "milling", "drilling", "utility"]));
    });

    it("INVARIANT: getStats + list + category partition are mutually consistent", () => {
      const stats = gCodeSnippetEngine.getStats();
      const list = gCodeSnippetEngine.list();
      const cats = gCodeSnippetEngine.categories();

      // total == number of listed snippets
      expect(stats.total).toBe(list.length);
      // categories count matches
      expect(stats.categories).toBe(cats.length);
      // every snippet falls into exactly one category bucket -> the buckets partition the set
      const partitionSum = cats.reduce((n, c) => n + gCodeSnippetEngine.byCategory(c).length, 0);
      expect(partitionSum).toBe(stats.total);
      // sanity floor (won't break on additions, breaks on accidental snippet deletion)
      expect(stats.total).toBeGreaterThanOrEqual(10);
    });
  });
});
