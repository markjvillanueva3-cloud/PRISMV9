/**
 * ActionSequenceExtractorEngine tests — CAD-TRAINING-EXTRACT-MS0 / U-CTE02..U-CTE12.
 *
 * Real-value assertions throughout — no toBeDefined-only stubs. Each `it`
 * pins a specific behavioral contract that the emitter relies on:
 *   - stable ids (same input bytes → same id bytes — required for cross-run dedup)
 *   - regex-driven verb/hotkey/ui detection (deterministic — no ML guess)
 *   - dropped-tip provenance (R12 honest — never silent-skip)
 *   - schema rejection on malformed input (no silent-default)
 *   - real-data E2E over doc-mastercam-solids-tutorial.json (canonical proof for CTE02)
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  ActionSequenceExtractorEngine,
  ActionExtractionTipSchema,
  type ActionExtractionTip,
} from "../engines/ActionSequenceExtractorEngine.js";

const tip = (
  title: string,
  body: string,
  extras: Partial<ActionExtractionTip> = {},
): ActionExtractionTip => ({ title, body, ...extras });

const RESOLVED_DOC = (() => {
  const candidates = [
    resolve(process.cwd(), "..", "cad-engine", "knowledge_store", "doc-mastercam-solids-tutorial.json"),
    resolve(process.cwd(), "cad-engine", "knowledge_store", "doc-mastercam-solids-tutorial.json"),
    resolve(process.cwd(), "..", "..", "cad-engine", "knowledge_store", "doc-mastercam-solids-tutorial.json"),
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
})();

describe("ActionSequenceExtractorEngine — pure transform contract", () => {
  describe("stableId", () => {
    it("produces a 16-hex stable id from sourceDoc + title + body", () => {
      const id = ActionSequenceExtractorEngine.stableId("doc-foo", tip("T", "B"));
      expect(id).toMatch(/^[0-9a-f]{16}$/);
    });

    it("yields identical ids for identical inputs (cross-run determinism)", () => {
      const a = ActionSequenceExtractorEngine.stableId("doc-foo", tip("T", "B"));
      const b = ActionSequenceExtractorEngine.stableId("doc-foo", tip("T", "B"));
      expect(a).toBe(b);
    });

    it("changes when sourceDoc changes (namespace partitioning)", () => {
      const a = ActionSequenceExtractorEngine.stableId("doc-foo", tip("T", "B"));
      const c = ActionSequenceExtractorEngine.stableId("doc-bar", tip("T", "B"));
      expect(a).not.toBe(c);
    });

    it("changes when body changes (content sensitivity)", () => {
      const a = ActionSequenceExtractorEngine.stableId("doc-foo", tip("T", "B"));
      const d = ActionSequenceExtractorEngine.stableId("doc-foo", tip("T", "B2"));
      expect(a).not.toBe(d);
    });
  });

  describe("segmentSentences", () => {
    it("splits on '. ' boundaries", () => {
      const s = ActionSequenceExtractorEngine.segmentSentences(
        "Click File. Choose Configuration. Confirm OK.",
      );
      expect(s).toEqual(["Click File", "Choose Configuration", "Confirm OK"]);
    });

    it("splits on ' then ' / ' and then '", () => {
      const s = ActionSequenceExtractorEngine.segmentSentences(
        "Click File then Choose Configuration and then Confirm OK",
      );
      expect(s).toEqual(["Click File", "Choose Configuration", "Confirm OK"]);
    });

    it("preserves embedded commas (UI-target lists like 'File, Configuration')", () => {
      const s = ActionSequenceExtractorEngine.segmentSentences(
        "Select File, Configuration. Set value.",
      );
      expect(s[0]).toBe("Select File, Configuration");
    });

    it("returns [] for empty body", () => {
      expect(ActionSequenceExtractorEngine.segmentSentences("")).toEqual([]);
    });
  });

  describe("detectVerb", () => {
    it("recognizes 'click' as an action verb", () => {
      expect(ActionSequenceExtractorEngine.detectVerb("Click the File tab")).toBe("click");
    });

    it("recognizes 'select' / 'press' / 'use'", () => {
      expect(ActionSequenceExtractorEngine.detectVerb("Select Solids")).toBe("select");
      expect(ActionSequenceExtractorEngine.detectVerb("Press Enter")).toBe("press");
      expect(ActionSequenceExtractorEngine.detectVerb("Use Fit on the View tab")).toBe("use");
    });

    it("strips leading 'To ' (infinitive)", () => {
      expect(ActionSequenceExtractorEngine.detectVerb("To click the File tab")).toBe("click");
    });

    it("is case-insensitive", () => {
      expect(ActionSequenceExtractorEngine.detectVerb("CLICK File")).toBe("click");
    });

    it("returns null for non-action leading words and empty input", () => {
      expect(ActionSequenceExtractorEngine.detectVerb("Mastercam supports")).toBeNull();
      expect(ActionSequenceExtractorEngine.detectVerb("")).toBeNull();
    });
  });

  describe("detectHotkey", () => {
    it("matches '[Alt+F1]' bracketed", () => {
      expect(ActionSequenceExtractorEngine.detectHotkey("press [Alt+F1] to fit")).toBe("Alt+F1");
    });

    it("matches bare 'Ctrl+S'", () => {
      expect(ActionSequenceExtractorEngine.detectHotkey("press Ctrl+S to save")).toBe("Ctrl+S");
    });

    it("normalizes 'Ctrl + Shift + S' to 'Ctrl+Shift+S'", () => {
      expect(
        ActionSequenceExtractorEngine.detectHotkey("press Ctrl + Shift + S"),
      ).toBe("Ctrl+Shift+S");
    });

    it("returns null when no hotkey present", () => {
      expect(ActionSequenceExtractorEngine.detectHotkey("Click File tab")).toBeNull();
    });
  });

  describe("detectUITargets", () => {
    it("captures 'X tab' names", () => {
      const t = ActionSequenceExtractorEngine.detectUITargets(
        "Click the File tab and the View tab",
      );
      expect(t).toContain("File");
      expect(t).toContain("View");
    });

    it("captures 'X dialog' / 'X dialog box'", () => {
      const t = ActionSequenceExtractorEngine.detectUITargets(
        "Open the SystemConfiguration dialog box",
      );
      expect(t).toContain("SystemConfiguration");
    });

    it("dedupes + sorts UI targets", () => {
      const t = ActionSequenceExtractorEngine.detectUITargets(
        "Click File tab, then View tab, then File tab again",
      );
      expect(t).toEqual(["File", "View"]);
    });

    it("returns [] when no UI patterns present", () => {
      expect(ActionSequenceExtractorEngine.detectUITargets("Press Enter")).toEqual([]);
    });
  });

  describe("extractFromTip", () => {
    it("returns a sequence with one step per action sentence", () => {
      const r = ActionSequenceExtractorEngine.extractFromTip(
        tip("Open file", "Click File. Choose Open. Select MarkerTray."),
        "doc-test",
      );
      expect(r).not.toBeNull();
      expect(r?.steps).toHaveLength(3);
      expect(r?.steps[0].verb).toBe("click");
      expect(r?.steps[1].verb).toBe("choose");
      expect(r?.steps[2].verb).toBe("select");
    });

    it("returns null when no sentence carries an action verb", () => {
      const r = ActionSequenceExtractorEngine.extractFromTip(
        tip("Description", "Mastercam supports many file formats. The interface is intuitive."),
        "doc-test",
      );
      expect(r).toBeNull();
    });

    it("preserves tags, category, page_ref from the source tip", () => {
      const r = ActionSequenceExtractorEngine.extractFromTip(
        tip("Open file", "Click File.", {
          tags: ["mastercam", "file"],
          category: "file_management",
          page_ref: "p.42",
        }),
        "doc-test",
      );
      expect(r?.tags).toEqual(["mastercam", "file"]);
      expect(r?.category).toBe("file_management");
      expect(r?.page_ref).toBe("p.42");
    });

    it("defaults category to 'other' and page_ref to null", () => {
      const r = ActionSequenceExtractorEngine.extractFromTip(
        tip("Open file", "Click File."),
        "doc-test",
      );
      expect(r?.category).toBe("other");
      expect(r?.page_ref).toBeNull();
    });

    it("throws on malformed tip (empty title)", () => {
      expect(() =>
        ActionSequenceExtractorEngine.extractFromTip(
          tip("", "Click File."),
          "doc-test",
        ),
      ).toThrow(/title/);
    });

    it("throws on malformed tip (empty body)", () => {
      expect(() =>
        ActionSequenceExtractorEngine.extractFromTip(
          tip("Open file", ""),
          "doc-test",
        ),
      ).toThrow(/body/);
    });
  });

  describe("extractBatch", () => {
    it("emits sequences AND dropped[] (R12 honest)", () => {
      const tips: ActionExtractionTip[] = [
        tip("Open file", "Click File."),
        tip("Description", "Mastercam supports many file formats."),
        tip("Save", "Press Ctrl+S to save the document."),
      ];
      const r = ActionSequenceExtractorEngine.extractBatch(tips, "doc-test");
      expect(r.totals.tips_in).toBe(3);
      expect(r.totals.sequences_out).toBe(2);
      expect(r.totals.tips_dropped).toBe(1);
      expect(r.dropped[0].title).toBe("Description");
      expect(r.dropped[0].reason).toMatch(/action verbs/);
    });

    it("accumulates steps_total across sequences", () => {
      const tips: ActionExtractionTip[] = [
        tip("A", "Click File. Click View."),
        tip("B", "Press Ctrl+S. Press Enter. Save."),
      ];
      const r = ActionSequenceExtractorEngine.extractBatch(tips, "doc-test");
      expect(r.totals.steps_total).toBe(5);
    });

    it("throws on non-array tips input", () => {
      const notArray: unknown = "not-an-array";
      const callUnsafe = ActionSequenceExtractorEngine.extractBatch as (
        t: unknown,
        s: string,
      ) => unknown;
      expect(() => callUnsafe(notArray, "doc-test")).toThrow(/array/);
    });

    it("throws on empty sourceDoc", () => {
      expect(() =>
        ActionSequenceExtractorEngine.extractBatch([], ""),
      ).toThrow(/sourceDoc/);
    });

    it("pins schemaVersion '1.0.0' on result", () => {
      const r = ActionSequenceExtractorEngine.extractBatch([], "doc-test");
      expect(r.schemaVersion).toBe("1.0.0");
    });
  });

  describe("Zod schema", () => {
    it("ACCEPTS a valid tip", () => {
      const r = ActionExtractionTipSchema.safeParse(tip("T", "B"));
      expect(r.success).toBe(true);
    });

    it("REJECTS empty title", () => {
      const r = ActionExtractionTipSchema.safeParse({ title: "", body: "B" });
      expect(r.success).toBe(false);
    });

    it("REJECTS missing body", () => {
      const r = ActionExtractionTipSchema.safeParse({ title: "T" });
      expect(r.success).toBe(false);
    });
  });

  describe("E2E against Mastercam Solids Tutorial — CTE02 acceptance proof", () => {
    it("real-data extract clears CTE02 acceptance: ≥25 tips_in AND ≥15 sequences_out AND conservation", () => {
      if (RESOLVED_DOC === null) {
        throw new Error(
          "ActionSequenceExtractorEngine E2E: doc-mastercam-solids-tutorial.json not found — " +
            "expected at H:/prism/cad-engine/knowledge_store/. Restore the file before running this test.",
        );
      }
      const raw = JSON.parse(readFileSync(RESOLVED_DOC, "utf8")) as {
        tips?: ActionExtractionTip[];
      };
      const tips = raw.tips ?? [];
      expect(tips.length).toBeGreaterThanOrEqual(25);

      const r = ActionSequenceExtractorEngine.extractBatch(
        tips,
        "doc-mastercam-solids-tutorial",
      );
      expect(r.totals.sequences_out).toBeGreaterThanOrEqual(15);
      expect(r.totals.sequences_out + r.totals.tips_dropped).toBe(r.totals.tips_in);
      for (const seq of r.sequences) {
        expect(seq.steps.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
