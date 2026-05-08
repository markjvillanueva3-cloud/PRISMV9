/**
 * PDFProcessingPipelineEngine.scan-paths.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S4/U-PDF-SCAN-EXTEND — exit_criteria coverage:
 *   1. H:/ root + H:/PRISM/ added to DEFAULT_SCAN_LOCATIONS
 *   2. Depth caps respected (depth 0 = root files only, no recursion)
 *   3. Override locations work for tests + future watcher mode
 *   4. Skip-dirs unchanged; dedup prevents double-counting
 *
 * 11 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFProcessingPipelineEngine } from "../engines/PDFProcessingPipelineEngine.js";

let tmpRoot: string;
let engine: PDFProcessingPipelineEngine;

function touch(rel: string, content = "%PDF-1.4 mock body\n"): string {
  const full = join(tmpRoot, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
  return full;
}

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "pdf-scan-"));
  engine = new PDFProcessingPipelineEngine();
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("PDFProcessingPipelineEngine — scan paths (U-PDF-SCAN-EXTEND)", () => {
  // -------------------- HAPPY PATHS --------------------

  it("DEFAULT_SCAN_LOCATIONS includes H:/ at depth 0 (audit PDFs at H:/ root)", () => {
    const roots = PDFProcessingPipelineEngine.DEFAULT_SCAN_LOCATIONS.map((l) => l.root);
    expect(roots).toContain("H:/");
    const hRoot = PDFProcessingPipelineEngine.DEFAULT_SCAN_LOCATIONS.find((l) => l.root === "H:/");
    expect(hRoot?.maxDepth).toBe(0);
  });

  it("DEFAULT_SCAN_LOCATIONS retains H:/prism with depth 12 (no regression)", () => {
    const prismLoc = PDFProcessingPipelineEngine.DEFAULT_SCAN_LOCATIONS.find((l) => l.root === "H:/prism");
    expect(prismLoc).not.toBe(undefined);
    expect(prismLoc!.maxDepth).toBe(12);
  });

  it("depth=0 finds files at the root only, no recursion into subdirs", () => {
    const rootPdf = touch("audit.pdf");
    touch("subdir/nested.pdf");
    touch("subdir/deeper/deepest.pdf");

    // Cast to access private _findPDFs for test injection.
    const found = (engine as unknown as {
      _findPDFs: (max: number, opts: { overrideLocations: Array<{ root: string; maxDepth: number }> }) => string[];
    })._findPDFs(100, { overrideLocations: [{ root: tmpRoot, maxDepth: 0 }] });

    expect(found.length).toBe(1);
    expect(found[0].replace(/\\/g, "/")).toBe(rootPdf.replace(/\\/g, "/"));
  });

  it("depth=1 finds root + immediate-subdir files, but not deeper", () => {
    touch("root.pdf");
    touch("level1/mid.pdf");
    touch("level1/level2/deep.pdf");

    const found = (engine as unknown as {
      _findPDFs: (max: number, opts: { overrideLocations: Array<{ root: string; maxDepth: number }> }) => string[];
    })._findPDFs(100, { overrideLocations: [{ root: tmpRoot, maxDepth: 1 }] });
    const norm = found.map((p) => p.replace(/\\/g, "/"));

    expect(norm.length).toBe(2);
    expect(norm.some((p) => p.endsWith("/root.pdf"))).toBe(true);
    expect(norm.some((p) => p.endsWith("/level1/mid.pdf"))).toBe(true);
    expect(norm.some((p) => p.endsWith("/deep.pdf"))).toBe(false);
  });

  it("depth=2 captures three levels including the H:/PRISM/* envelope target case", () => {
    touch("a.pdf");
    touch("PRISM/b.pdf");
    touch("PRISM/sub/c.pdf");
    touch("PRISM/sub/sub2/d.pdf"); // depth 3 — should be excluded

    const found = (engine as unknown as {
      _findPDFs: (max: number, opts: { overrideLocations: Array<{ root: string; maxDepth: number }> }) => string[];
    })._findPDFs(100, { overrideLocations: [{ root: tmpRoot, maxDepth: 2 }] });
    const names = found.map((p) => p.replace(/\\/g, "/").split("/").pop());

    expect(names).toContain("a.pdf");
    expect(names).toContain("b.pdf");
    expect(names).toContain("c.pdf");
    expect(names).not.toContain("d.pdf");
  });

  // -------------------- FAILURE MODES --------------------

  it("non-existent root returns empty (does not throw)", () => {
    const ghostRoot = join(tmpdir(), "definitely-does-not-exist-" + Date.now());
    const found = (engine as unknown as {
      _findPDFs: (max: number, opts: { overrideLocations: Array<{ root: string; maxDepth: number }> }) => string[];
    })._findPDFs(100, { overrideLocations: [{ root: ghostRoot, maxDepth: 5 }] });
    expect(found).toEqual([]);
  });

  it("empty root directory returns empty result", () => {
    const found = (engine as unknown as {
      _findPDFs: (max: number, opts: { overrideLocations: Array<{ root: string; maxDepth: number }> }) => string[];
    })._findPDFs(100, { overrideLocations: [{ root: tmpRoot, maxDepth: 5 }] });
    expect(found).toEqual([]);
  });

  it("non-PDF files (.md, .json, .txt) are not collected", () => {
    touch("doc.md", "# title");
    touch("data.json", "{}");
    touch("notes.txt", "hi");
    touch("real.pdf");

    const found = (engine as unknown as {
      _findPDFs: (max: number, opts: { overrideLocations: Array<{ root: string; maxDepth: number }> }) => string[];
    })._findPDFs(100, { overrideLocations: [{ root: tmpRoot, maxDepth: 5 }] });

    expect(found.length).toBe(1);
    expect(found[0].replace(/\\/g, "/")).toMatch(/\/real\.pdf$/);
  });

  it("skipDirs (node_modules, .git, dist, .claude, ...) are NEVER descended", () => {
    touch("good.pdf");
    touch("node_modules/bad.pdf");
    touch(".git/objects/bad.pdf");
    touch("dist/bad.pdf");
    touch(".claude/bad.pdf");
    touch("__pycache__/bad.pdf");

    const found = (engine as unknown as {
      _findPDFs: (max: number, opts: { overrideLocations: Array<{ root: string; maxDepth: number }> }) => string[];
    })._findPDFs(100, { overrideLocations: [{ root: tmpRoot, maxDepth: 5 }] });
    const names = found.map((p) => p.replace(/\\/g, "/").split("/").pop());

    expect(names).toContain("good.pdf");
    expect(names.length).toBe(1);
  });

  // -------------------- ADVERSARIAL --------------------

  it("dedup: same PDF visible from two overlapping roots is emitted only once", () => {
    touch("shared.pdf");
    // Same root listed twice — without dedup we'd get shared.pdf twice.
    const found = (engine as unknown as {
      _findPDFs: (max: number, opts: { overrideLocations: Array<{ root: string; maxDepth: number }> }) => string[];
    })._findPDFs(100, {
      overrideLocations: [
        { root: tmpRoot, maxDepth: 0 },
        { root: tmpRoot, maxDepth: 0 },
      ],
    });
    expect(found.length).toBe(1);
  });

  it("limit cap honored — never returns more than maxPdfs", () => {
    for (let i = 0; i < 25; i++) touch(`pdf-${i}.pdf`);
    const found = (engine as unknown as {
      _findPDFs: (max: number, opts: { overrideLocations: Array<{ root: string; maxDepth: number }> }) => string[];
    })._findPDFs(7, { overrideLocations: [{ root: tmpRoot, maxDepth: 0 }] });
    expect(found.length).toBe(7);
  });

  it("uppercase .PDF and mixed-case .Pdf are detected (case-insensitive extension match)", () => {
    touch("upper.PDF");
    touch("mixed.Pdf");
    touch("lower.pdf");

    const found = (engine as unknown as {
      _findPDFs: (max: number, opts: { overrideLocations: Array<{ root: string; maxDepth: number }> }) => string[];
    })._findPDFs(100, { overrideLocations: [{ root: tmpRoot, maxDepth: 0 }] });

    expect(found.length).toBe(3);
  });
});
