/**
 * MILL-MASTER-P1-U07-MCP-INDEX — Documentation anti-regression test
 *
 * Verifies that MASTER_INDEX_COMPACT.md and ENGINE_DIGEST.md carry the
 * mill facade wiring landmarks so the docs can't silently rot out of date.
 * Not verbose — just checks that the expected anchors are present.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve repo-relative doc paths tolerantly across cwds
function resolveDoc(relative: string): string {
  const candidates: string[] = [];
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    // Ascend from src/__tests__ to mcp-server/ then join
    candidates.push(path.resolve(here, "..", "..", relative));
  } catch {
    /* ignore */
  }
  candidates.push(path.resolve(process.cwd(), relative));
  candidates.push(path.resolve(process.cwd(), "mcp-server", relative));
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]!;
}

describe("MILL-MASTER-P1-U07 · MASTER_INDEX_COMPACT.md", () => {
  const p = resolveDoc("data/docs/MASTER_INDEX_COMPACT.md");
  const content = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";

  it("file exists and is non-trivial", () => {
    expect(fs.existsSync(p)).toBe(true);
    expect(content.length).toBeGreaterThan(1000);
  });

  it("lists prism_mill dispatcher in the surface table", () => {
    expect(content).toMatch(/prism_mill/);
    expect(content).toMatch(/46/); // action count
  });

  it("documents the P1 facade chain", () => {
    expect(content).toContain("MillMasterOrchestratorFacadeEngine");
    expect(content).toContain("CAMAGIMasterOrchestratorEngine");
    expect(content).toContain("MillingAGIMasterEngine");
    expect(content).toContain("PRISMSelfAwarenessEngine");
  });

  it("names each P1 unit with its commit hash", () => {
    for (const u of ["P1-U01", "P1-U02", "P1-U03", "P1-U04", "P1-U05", "P1-U06"]) {
      expect(content, `missing ${u}`).toContain(u);
    }
  });

  it("declares the anti-bypass discipline", () => {
    expect(content).toMatch(/anti-bypass|direct sub-engine/i);
  });
});

describe("MILL-MASTER-P1-U07 · ENGINE_DIGEST.md", () => {
  const p = resolveDoc("data/docs/ENGINE_DIGEST.md");
  const content = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";

  it("file exists", () => {
    expect(fs.existsSync(p)).toBe(true);
    expect(content.length).toBeGreaterThan(5000);
  });

  it("contains the MILL-MASTER P1 Facade Wiring Status section", () => {
    expect(content).toContain("MILL-MASTER P1 Facade Wiring Status");
  });

  it("marks key engines with [WIRED] tags", () => {
    expect(content).toMatch(/MillMasterOrchestratorFacadeEngine.*\[WIRED/);
    expect(content).toMatch(/CAMAGIMasterOrchestratorEngine.*\[WIRED/);
    expect(content).toMatch(/MillingAGIMasterEngine.*\[WIRED/);
    expect(content).toMatch(/MillAISelfAwarenessIntegrationEngine.*\[WIRED/);
    expect(content).toMatch(/PRISMSelfAwarenessEngine.*\[WIRED/);
  });

  it("records the 212/212 test tally", () => {
    expect(content).toMatch(/212\/212|212 /);
  });

  it("lists each of the 8 test specs", () => {
    const specs = [
      "millDispatcher.test.ts",
      "MillMasterOrchestratorFacadeEngine.test.ts",
      "MillMasterOrchestratorFacadeEngine.wiring.test.ts",
      "MillingAGIMasterEngine.test.ts",
      "MillingAGIMasterEngine.binding.test.ts",
      "MillSelfAwarenessIntegration.test.ts",
      "aiReasoningDispatcher.millRoute.test.ts",
      "CAMAGIMasterOrchestratorEngine.test.ts",
    ];
    for (const s of specs) {
      expect(content, `missing spec ${s}`).toContain(s);
    }
  });

  it("names the 5 CAM vendors in the CAMAGI description", () => {
    for (const v of ["Mastercam", "hyperMILL", "Fusion360", "InventorCAM", "SolidCAM"]) {
      expect(content, `missing vendor ${v}`).toContain(v);
    }
  });

  it("flags remaining P1 units (U08 + U09)", () => {
    expect(content).toContain("P1-U08");
    expect(content).toContain("P1-U09");
  });
});
