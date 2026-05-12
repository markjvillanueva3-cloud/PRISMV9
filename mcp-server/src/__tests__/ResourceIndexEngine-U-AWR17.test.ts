/**
 * AI-AWARE-HARDEN/U-AWR17 — KNOWN_RESOURCE_FOLDERS Expansion Validation
 *
 * Validates expanded folder list (20 → 43+) per U-AWR17 exit gate.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

function readSource(): string {
  const engPath = path.resolve("src/engines/ResourceIndexEngine.ts");
  return fs.readFileSync(engPath, "utf-8");
}

function countFolderEntries(src: string): number {
  // Find KNOWN_RESOURCE_FOLDERS block and count { path: entries within it.
  // The array spans multiple lines between `= [` and `];` (first occurrence after the decl).
  const startIdx = src.indexOf("KNOWN_RESOURCE_FOLDERS");
  if (startIdx < 0) return 0;
  // Find the opening bracket that starts the literal
  const bracketIdx = src.indexOf("= [", startIdx);
  if (bracketIdx < 0) return 0;
  // Find matching close: next `\n];` after bracketIdx
  const closeIdx = src.indexOf("\n];", bracketIdx);
  if (closeIdx < 0) return 0;
  const body = src.slice(bracketIdx, closeIdx);
  return (body.match(/\{\s*path:/g) ?? []).length;
}

describe("AI-AWARE-HARDEN/U-AWR17: KNOWN_RESOURCE_FOLDERS expansion", () => {
  describe("Folder list size", () => {
    it("KNOWN_RESOURCE_FOLDERS has >= 43 entries", () => {
      expect(countFolderEntries(readSource())).toBeGreaterThanOrEqual(43);
    });
  });

  describe("Dark pool folders explicitly indexed", () => {
    it("SOLIDWORKS is indexed (14k+ files)", () => {
      expect(readSource()).toContain('path: "SOLIDWORKS"');
    });

    it("RESOURCE PDFS is indexed (3k+ files)", () => {
      expect(readSource()).toContain('path: "RESOURCE PDFS"');
    });

    it("HSMWorks 2026 is indexed", () => {
      expect(readSource()).toContain('path: "HSMWorks 2026"');
    });

    it("Virtual_Machining_Center is indexed", () => {
      expect(readSource()).toContain('path: "Virtual_Machining_Center"');
    });

    it("WORKHOLDING AND FIXTURE CATALOGS is indexed", () => {
      expect(readSource()).toContain('path: "WORKHOLDING AND FIXTURE CATALOGS"');
    });

    it("SOLIDCAM is indexed", () => {
      expect(readSource()).toContain('path: "SOLIDCAM"');
    });

    it("TOOL_HOLDER_CAD_FILES is indexed", () => {
      expect(readSource()).toContain('path: "TOOL_HOLDER_CAD_FILES"');
    });

    it("excel_extract is indexed", () => {
      expect(readSource()).toContain('path: "excel_extract"');
    });
  });

  describe("Manufacturer folder coverage", () => {
    it("SANDVIK is indexed", () => {
      expect(readSource()).toContain('path: "SANDVIK"');
    });

    it("KENNAMETAL is indexed", () => {
      expect(readSource()).toContain('path: "KENNAMETAL"');
    });

    it("ISCAR is indexed", () => {
      expect(readSource()).toContain('path: "ISCAR"');
    });

    it("MITSUBISHI MATERIALS is indexed", () => {
      expect(readSource()).toContain('path: "MITSUBISHI MATERIALS"');
    });
  });

  describe("Original folders preserved (no regression)", () => {
    it("MIT COURSES still present", () => {
      expect(readSource()).toContain('path: "MIT COURSES"');
    });

    it("MANUFACTURER_CATALOGS still present", () => {
      expect(readSource()).toContain('path: "MANUFACTURER_CATALOGS"');
    });

    it("HYPERMILL still present", () => {
      expect(readSource()).toContain('path: "HYPERMILL"');
    });

    it("FUSION POSTS still present", () => {
      expect(readSource()).toContain('path: "FUSION POSTS"');
    });

    it("PDF still present", () => {
      expect(readSource()).toContain('path: "PDF"');
    });
  });

  describe("Engine still functional after expansion", () => {
    it("engine instantiates without error", async () => {
      const { resourceIndexEngine } = await import("../engines/ResourceIndexEngine.js");
      expect(resourceIndexEngine).toBeDefined();
    });

    it("getIndex() returns index with expected fields", async () => {
      const { resourceIndexEngine } = await import("../engines/ResourceIndexEngine.js");
      const idx = await resourceIndexEngine.getIndex();
      expect(idx).toBeDefined();
      expect(typeof idx.totalFolders === "number" || Array.isArray(idx.folders)).toBe(true);
    });
  });

  describe("U-AWR17 exit gate", () => {
    it("≥43 entries satisfies roadmap target", () => {
      expect(countFolderEntries(readSource())).toBeGreaterThanOrEqual(43);
    });

    it("Previously-invisible folders now declared (≥5 examples)", () => {
      const src = readSource();
      const newFolders = [
        "SOLIDWORKS", "RESOURCE PDFS", "HSMWorks 2026",
        "Virtual_Machining_Center", "WORKHOLDING AND FIXTURE CATALOGS",
      ];
      for (const f of newFolders) {
        expect(src).toContain(`path: "${f}"`);
      }
    });
  });
});
