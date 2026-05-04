/**
 * HyperMillOmCyclesExtractor Test Suite
 * =======================================
 *
 * CAM-EXHAUST-MS0 / U-CAM-HM-OMCYC-WIRE-01
 *
 * Validates the omCycles.txt parser plus dispatcher wiring (3 actions).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  HyperMillOmCyclesExtractor,
  hyperMillOmCyclesExtractor,
} from "../engines/HyperMillOmCyclesExtractor.js";

const SAMPLE_OM_CYCLES = `
; hyperMILL omCycles.txt sample
; Maps UI display names to canonical cycle IDs
"3D Curve Milling"     := "3D:Curve Milling"
"Drilling Spot"        := "DR:Spot"
"Drilling Deep Hole"   := "DR:Deep Hole"
"5-axis Roughing"      := "5X:Roughing"
"Mill-Turn Roll"       := "MT:Roll Turning"
"Probing WCS"          := "2D:Probing WCS"

; Trailing comment
`;

describe("HyperMillOmCyclesExtractor — parseLine()", () => {
  const e = new HyperMillOmCyclesExtractor();

  it("parses a valid mapping line into displayName + canonicalId + category + shortName", () => {
    const r = e.parseLine('"3D Curve Milling" := "3D:Curve Milling"');
    expect(r === null).toBe(false);
    expect(r!.displayName).toBe("3D Curve Milling");
    expect(r!.canonicalId).toBe("3D:Curve Milling");
    expect(r!.category).toBe("3D");
    expect(r!.shortName).toBe("Curve Milling");
  });

  it("returns null for comment lines starting with ;", () => {
    expect(e.parseLine("; this is a comment")).toBe(null);
    expect(e.parseLine("    ; indented comment")).toBe(null);
  });

  it("returns null for blank/whitespace-only lines", () => {
    expect(e.parseLine("")).toBe(null);
    expect(e.parseLine("   ")).toBe(null);
    expect(e.parseLine("\t\t")).toBe(null);
  });

  it("returns null for malformed lines without quotes/operator", () => {
    expect(e.parseLine("3D Curve Milling = 3D:Curve Milling")).toBe(null);
    expect(e.parseLine('"unbalanced quote')).toBe(null);
    expect(e.parseLine("not a mapping at all")).toBe(null);
  });

  it("returns null when canonicalId has no colon (malformed)", () => {
    expect(e.parseLine('"Display" := "NoColonHere"')).toBe(null);
  });

  it("trims whitespace inside captured names", () => {
    const r = e.parseLine('"  Padded  " := "DR:  Spot Drill  "');
    expect(r === null).toBe(false);
    expect(r!.displayName).toBe("Padded");
    expect(r!.shortName).toBe("Spot Drill");
  });

  it("handles all 9 documented categories (DR/2D/TP/3D/5X/MT/NC/3L/5L)", () => {
    const cats = ["DR", "2D", "TP", "3D", "5X", "MT", "NC", "3L", "5L"];
    for (const c of cats) {
      const r = e.parseLine(`"X" := "${c}:Y"`);
      expect(r === null).toBe(false);
      expect(r!.category).toBe(c);
    }
  });
});

describe("HyperMillOmCyclesExtractor — categorize()", () => {
  const e = new HyperMillOmCyclesExtractor();

  it("groups mappings by category key", () => {
    const mappings = [
      e.parseLine('"A" := "3D:A1"')!,
      e.parseLine('"B" := "3D:B1"')!,
      e.parseLine('"C" := "DR:C1"')!,
      e.parseLine('"D" := "5X:D1"')!,
    ];
    const grouped = e.categorize(mappings);
    expect(Object.keys(grouped).sort()).toEqual(["3D", "5X", "DR"]);
    expect(grouped["3D"]!.length).toBe(2);
    expect(grouped["DR"]!.length).toBe(1);
    expect(grouped["5X"]!.length).toBe(1);
  });

  it("preserves original ordering within each category", () => {
    const mappings = [
      e.parseLine('"First" := "3D:First"')!,
      e.parseLine('"Second" := "3D:Second"')!,
    ];
    const grouped = e.categorize(mappings);
    expect(grouped["3D"]!.map((m) => m.displayName)).toEqual(["First", "Second"]);
  });

  it("returns empty record for empty input", () => {
    const grouped = e.categorize([]);
    expect(Object.keys(grouped).length).toBe(0);
  });
});

describe("HyperMillOmCyclesExtractor — extract() integration", () => {
  it("reads, parses, and categorizes a temp file", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hmom-"));
    const tmpFile = path.join(tmpDir, "omCycles.txt");
    await fs.writeFile(tmpFile, SAMPLE_OM_CYCLES, "utf-8");

    const extractor = new HyperMillOmCyclesExtractor(tmpFile);
    const catalog = await extractor.extract();

    expect(catalog.totalMappings).toBe(6);
    expect(catalog.mappings.length).toBe(6);
    expect(catalog.categories["3D"]!.length).toBe(1);
    expect(catalog.categories["DR"]!.length).toBe(2);
    expect(catalog.categories["5X"]!.length).toBe(1);
    expect(catalog.categories["MT"]!.length).toBe(1);
    expect(catalog.categories["2D"]!.length).toBe(1);

    expect(catalog.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    await fs.unlink(tmpFile);
    await fs.rmdir(tmpDir);
  });

  it("throws an Error containing the file path when the file is missing", async () => {
    const extractor = new HyperMillOmCyclesExtractor("H:/__nonexistent__/omCycles.txt");
    await expect(extractor.extract()).rejects.toThrow(/cannot read/i);
  });

  it("throws when the file contains zero valid mappings (only comments)", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hmom-"));
    const tmpFile = path.join(tmpDir, "empty.txt");
    await fs.writeFile(tmpFile, "; just comments\n; no mappings\n", "utf-8");

    const extractor = new HyperMillOmCyclesExtractor(tmpFile);
    await expect(extractor.extract()).rejects.toThrow(/no valid mappings/i);

    await fs.unlink(tmpFile);
    await fs.rmdir(tmpDir);
  });
});

describe("HyperMillOmCyclesExtractor — singleton + class shape", () => {
  it("exposes a singleton instance with the documented public methods", () => {
    expect(hyperMillOmCyclesExtractor).toBeInstanceOf(HyperMillOmCyclesExtractor);
    expect(typeof hyperMillOmCyclesExtractor.extract).toBe("function");
    expect(typeof hyperMillOmCyclesExtractor.parseLine).toBe("function");
    expect(typeof hyperMillOmCyclesExtractor.categorize).toBe("function");
  });
});

describe("HyperMillOmCyclesExtractor — dispatcher wiring (camDispatcher.ts)", () => {
  const dispatcherPath = path.resolve(
    process.cwd(),
    "src/tools/dispatchers/camDispatcher.ts",
  );

  it("registers all 3 cam_hypermill_om_cycles_* enum entries", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    expect(src).toContain('"cam_hypermill_om_cycles_extract"');
    expect(src).toContain('"cam_hypermill_om_cycles_parse_line"');
    expect(src).toContain('"cam_hypermill_om_cycles_categorize"');
  });

  it("declares the _hmOmCycles singleton", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    expect(src).toMatch(/_hmOmCycles\s*:\s*any/);
  });

  it("registers a hmOmCycles case in the lazy getter switch", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    const re =
      /case\s+"hmOmCycles"\s*:\s*return\s+_hmOmCycles\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/HyperMillOmCyclesExtractor\.js"\s*\)\)\.hyperMillOmCyclesExtractor/;
    expect(re.test(src)).toBe(true);
  });

  it("routes om_cycles_extract case (uses default singleton when no file_path passed)", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    const re = /case\s+"cam_hypermill_om_cycles_extract"\s*:[\s\S]*?break;/;
    const match = src.match(re);
    expect(match === null).toBe(false);
    const body = match ? match[0] : "";
    expect(body).toContain("HyperMillOmCyclesExtractor");
    expect(body).toContain("extract");
    expect(body).toMatch(/params\.file_path\s*\?\?\s*params\.filePath/);
  });

  it("routes parse_line case to parseLine() with line param", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    const re = /case\s+"cam_hypermill_om_cycles_parse_line"\s*:[\s\S]*?break;/;
    const match = src.match(re);
    expect(match === null).toBe(false);
    const body = match ? match[0] : "";
    expect(body).toContain('getEngine("hmOmCycles")');
    expect(body).toContain("parseLine");
    expect(body).toMatch(/params\.line/);
  });

  it("routes categorize case to categorize() with mappings array", async () => {
    const src = await fs.readFile(dispatcherPath, "utf-8");
    const re = /case\s+"cam_hypermill_om_cycles_categorize"\s*:[\s\S]*?break;/;
    const match = src.match(re);
    expect(match === null).toBe(false);
    const body = match ? match[0] : "";
    expect(body).toContain('getEngine("hmOmCycles")');
    expect(body).toContain("categorize");
    expect(body).toMatch(/Array\.isArray\(params\.mappings\)/);
  });
});
