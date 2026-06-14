/**
 * Tests for GWizardAdapterEngine (U-OSC9-12).
 *
 * Coverage:
 *   - Singleton + shape
 *   - Schema validation
 *   - CSV header parsing + column-name → field mapping
 *   - Quoted-field parsing + embedded-comma tolerance
 *   - "NaN" / empty / " " coercion to undefined (G-Wizard's unset convention)
 *   - useMfgSFM / useMfgIPT bool parsing (true/false/1/0)
 *   - units inference (inches / mm / unknown)
 *   - Missing-guid / missing-key rows → skipped with warning
 *   - Gated real-file test against operator's live toolcrib.csv
 *   - File I/O: missing-path throws; explicit override + env override honored
 *   - resolveToolcribPath: AppData scan picks newest-mtime GWizard.* sandbox
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, utimesSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  gWizardAdapterEngine,
  GWizardAdapterEngine,
  GWizardReadInputSchema,
} from "../engines/GWizardAdapterEngine.js";

// ============================================================================
// FIXTURES — mirror live operator toolcrib.csv (verified 2026-05-26)
// ============================================================================

const HEADER =
  "key,tabname,guid,slot,description,serialno,tool,generic,geometry,flutes,leadang,diameter,stickout,cutLength,overallLength,shankSize,noseRad,helixAngle,coating,toolmaterial,toolFamily,vendor,product,idNo,insNo,sfm,ipt,chipload,useMfgSFM,mfgSFM,useMfgIPT,mfgIPT,xcomp,zcomp,xgeom,zgeom,status,quantity,field1,field2,field3,field4,units,holderType,holderDesc,holderDia,holderLen,comment,clockwise,coolantMode,coolantSupport,shoulderLength,taperAngle2,threadPitch,tipLength,tipDiameter,productLink,jobCode,pricePaid";

const ROW_2FL_EM =
  '2,Default,336D037C-573B-99E3-F393-64E32271C5B8,0,1/2 inch 2 flute endmill,,HSS Endmill,false,Normal,2,90,0.5,1,1,0,0.5,0,40, , , ,,,,,150,0.003,1,false,0,false,0,0,0,0,0,OK,0, , , , ,inches,Other,,0,0, ,true, , ,NaN,NaN,NaN,NaN,NaN, , ,NaN';

const ROW_4FL_EM =
  '4,Default,0AEBC2D8-8F07-D363-EEAD-64E322730D28,1,1/2 inch 4 flute endmill,,HSS Endmill,false,Normal,4,90,0.5,1,1,0,0.5,0,40, , , ,,,,,180,0.0025,1,true,200,false,0,0,0,0,0,OK,0, , , , ,inches,Other,,0,0, ,true, , ,NaN,NaN,NaN,NaN,NaN, , ,NaN';

const ROW_DRILL =
  '6,Default,E28CEDF5-5A6F-6D50-D8B9-64E322746CE0,2,1/2 inch spot drill,,HSS Spot Drill,false,Normal,2,90,0.5,1,0.5,0,0.5,0,40, , , ,,,,,1,0,1,false,0,false,0,0,0,0,0,OK,0, , , , ,inches,Other,,0,0, ,true, , ,NaN,NaN,NaN,NaN,NaN, , ,NaN';

const FIXTURE_FULL = [HEADER, ROW_2FL_EM, ROW_4FL_EM, ROW_DRILL].join("\n");
const META = { sourcePath: "fixture.csv", sourceMtimeMs: 1700000000000 };

// ============================================================================
// TESTS
// ============================================================================

describe("GWizardAdapterEngine — singleton + shape", () => {
  it("exports singleton instance of class", () => {
    expect(gWizardAdapterEngine).toBeInstanceOf(GWizardAdapterEngine);
  });

  it("exposes read() and parseCsv()", () => {
    expect(typeof gWizardAdapterEngine.read).toBe("function");
    expect(typeof gWizardAdapterEngine.parseCsv).toBe("function");
    expect(typeof gWizardAdapterEngine.resolveToolcribPath).toBe("function");
  });
});

describe("GWizardReadInputSchema — Zod validation", () => {
  it("accepts empty input", () => {
    const parsed = GWizardReadInputSchema.parse({});
    expect(parsed.toolcrib_path).toEqual(undefined);
  });

  it("accepts toolcrib_path override", () => {
    const parsed = GWizardReadInputSchema.parse({ toolcrib_path: "/tmp/x.csv" });
    expect(parsed.toolcrib_path).toBe("/tmp/x.csv");
  });

  it("rejects bad toolcrib_path type", () => {
    expect(() => GWizardReadInputSchema.parse({ toolcrib_path: 42 as unknown as string })).toThrow();
  });
});

describe("GWizardAdapterEngine.parseCsv() — full fixture", () => {
  it("parses 3 default tools with full field map", () => {
    const state = gWizardAdapterEngine.parseCsv(FIXTURE_FULL, META);
    expect(state.tools.length).toBe(3);
    expect(state.rows_seen).toBe(3);
    expect(state.warnings).toEqual([]);
  });

  it("maps header columns to typed fields correctly (row 1: 2FL endmill)", () => {
    const state = gWizardAdapterEngine.parseCsv(FIXTURE_FULL, META);
    const em2 = state.tools[0];
    expect(em2.key).toBe(2);
    expect(em2.guid).toBe("336D037C-573B-99E3-F393-64E32271C5B8");
    expect(em2.tabname).toBe("Default");
    expect(em2.description).toBe("1/2 inch 2 flute endmill");
    expect(em2.tool).toBe("HSS Endmill");
    expect(em2.flutes).toBe(2);
    expect(em2.diameter).toBe(0.5);
    expect(em2.helixAngle).toBe(40);
    expect(em2.sfm).toBe(150);
    expect(em2.ipt).toBe(0.003);
    expect(em2.units).toBe("inches");
  });

  it("parses useMfgSFM/useMfgIPT booleans correctly + mfgSFM field", () => {
    const state = gWizardAdapterEngine.parseCsv(FIXTURE_FULL, META);
    const em4 = state.tools[1]; // 4FL row has useMfgSFM=true, mfgSFM=200
    expect(em4.useMfgSFM).toBe(true);
    expect(em4.useMfgIPT).toBe(false);
    expect(em4.mfgSFM).toBe(200);
    expect(em4.mfgIPT).toBe(0);
  });
});

describe("GWizardAdapterEngine.parseCsv() — coercion rules", () => {
  it("coerces 'NaN' to undefined for numeric fields", () => {
    // Default fixture's noseRad/holderDia/etc. are 0 — verify a true NaN coerces.
    const customHeader = "key,guid,units,diameter,sfm,ipt";
    const row = "1,abc-guid,inches,NaN,NaN,NaN";
    const state = gWizardAdapterEngine.parseCsv([customHeader, row].join("\n"), META);
    expect(state.tools[0].diameter).toEqual(undefined);
    expect(state.tools[0].sfm).toEqual(undefined);
    expect(state.tools[0].ipt).toEqual(undefined);
  });

  it("coerces empty string / single-space to undefined for string fields", () => {
    const customHeader = "key,guid,units,coating,vendor,product";
    const row = '1,abc-guid,inches,, , ';
    const state = gWizardAdapterEngine.parseCsv([customHeader, row].join("\n"), META);
    expect(state.tools[0].coating).toEqual(undefined);
    expect(state.tools[0].vendor).toEqual(undefined);
    expect(state.tools[0].product).toEqual(undefined);
  });

  it("infers units='inches' from 'inches' / 'inch' (case-insensitive); 'mm' → mm; other → unknown", () => {
    const customHeader = "key,guid,units";
    const cases = [
      ["1", "g1", "inches", "inches"],
      ["2", "g2", "INCHES", "inches"],
      ["3", "g3", "inch", "inches"],
      ["4", "g4", "mm", "mm"],
      ["5", "g5", "metric", "unknown"],
      ["6", "g6", "", "unknown"],
    ];
    const rows = cases.map(([key, guid, units]) => `${key},${guid},${units}`).join("\n");
    const state = gWizardAdapterEngine.parseCsv([customHeader, ...rows.split("\n")].join("\n"), META);
    expect(state.tools.map((t) => t.units)).toEqual(["inches", "inches", "inches", "mm", "unknown", "unknown"]);
  });
});

describe("GWizardAdapterEngine.parseCsv() — quoted-field handling", () => {
  it("respects double-quoted fields with embedded commas", () => {
    const header = "key,guid,units,description";
    const row = '1,g1,inches,"a tool, with comma in name"';
    const state = gWizardAdapterEngine.parseCsv([header, row].join("\n"), META);
    expect(state.tools[0].description).toBe("a tool, with comma in name");
  });

  it("respects double-quote escape (`\"\"` → `\"`)", () => {
    const header = "key,guid,units,description";
    const row = '1,g1,inches,"the ""special"" tool"';
    const state = gWizardAdapterEngine.parseCsv([header, row].join("\n"), META);
    expect(state.tools[0].description).toBe('the "special" tool');
  });
});

describe("GWizardAdapterEngine.parseCsv() — edge cases", () => {
  it("handles empty input + emits warning", () => {
    const state = gWizardAdapterEngine.parseCsv("", META);
    expect(state.tools).toEqual([]);
    expect(state.warnings.some((w) => /toolcrib\.csv is empty/.test(w))).toBe(true);
  });

  it("handles header-only file + warns", () => {
    const state = gWizardAdapterEngine.parseCsv(HEADER, META);
    expect(state.tools).toEqual([]);
    expect(state.warnings.some((w) => /only a header/.test(w))).toBe(true);
  });

  it("skips rows missing guid or key + warns", () => {
    const header = "key,guid,units,description";
    const rows = [
      "1,real-guid,inches,real-tool",
      ",missing-key,inches,bad-row-1",
      "5,,inches,bad-row-2", // missing guid
    ];
    const state = gWizardAdapterEngine.parseCsv([header, ...rows].join("\n"), META);
    expect(state.tools.length).toBe(1);
    expect(state.tools[0].guid).toBe("real-guid");
    expect(state.warnings.filter((w) => /missing guid\/key/.test(w)).length).toBe(2);
  });

  it("preserves source meta in result", () => {
    const state = gWizardAdapterEngine.parseCsv(FIXTURE_FULL, {
      sourcePath: "/some/specific.csv",
      sourceMtimeMs: 12345,
    });
    expect(state.source_path).toBe("/some/specific.csv");
    expect(state.source_mtime_ms).toBe(12345);
  });
});

describe("GWizardAdapterEngine.read() — file I/O", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "gwizard-test-"));
    delete process.env["PRISM_GWIZARD_TOOLCRIB_PATH"];
  });

  afterEach(() => {
    delete process.env["PRISM_GWIZARD_TOOLCRIB_PATH"];
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  });

  it("throws descriptive error when toolcrib not found AND no AppData fallback", () => {
    process.env["PRISM_GWIZARD_TOOLCRIB_PATH"] = join(tmp, "does_not_exist.csv");
    expect(() => gWizardAdapterEngine.read({})).toThrow(/Failed to stat G-Wizard toolcrib/);
  });

  it("reads + parses a fixture file via toolcrib_path override", () => {
    const file = join(tmp, "toolcrib.csv");
    writeFileSync(file, FIXTURE_FULL);

    const state = gWizardAdapterEngine.read({ toolcrib_path: file });
    expect(state.tools.length).toBe(3);
    expect(state.source_path).toBe(file);
  });

  it("honors PRISM_GWIZARD_TOOLCRIB_PATH env override (via resolveToolcribPath)", () => {
    const file = join(tmp, "alt.csv");
    writeFileSync(file, FIXTURE_FULL);

    process.env["PRISM_GWIZARD_TOOLCRIB_PATH"] = file;
    const state = gWizardAdapterEngine.read({});
    expect(state.source_path).toBe(file);
  });
});

describe("GWizardAdapterEngine.resolveToolcribPath() — AppData scan", () => {
  let tmpAppData: string;
  let savedAppData: string | undefined;

  beforeEach(() => {
    tmpAppData = mkdtempSync(join(tmpdir(), "gwizard-appdata-"));
    savedAppData = process.env["APPDATA"];
    process.env["APPDATA"] = tmpAppData;
    delete process.env["PRISM_GWIZARD_TOOLCRIB_PATH"];
  });

  afterEach(() => {
    if (savedAppData !== undefined) process.env["APPDATA"] = savedAppData;
    else delete process.env["APPDATA"];
    delete process.env["PRISM_GWIZARD_TOOLCRIB_PATH"];
    try {
      rmSync(tmpAppData, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  });

  it("returns undefined when no GWizard.* sandbox exists", () => {
    expect(gWizardAdapterEngine.resolveToolcribPath()).toEqual(undefined);
  });

  it("finds the toolcrib in a single GWizard.* sandbox", () => {
    const sandbox = join(tmpAppData, "GWizard.HASH1");
    mkdirSync(join(sandbox, "Local Store"), { recursive: true });
    const target = join(sandbox, "Local Store", "toolcrib.csv");
    writeFileSync(target, FIXTURE_FULL);

    expect(gWizardAdapterEngine.resolveToolcribPath()).toBe(target);
  });

  it("picks the newest-mtime sandbox when multiple GWizard.* dirs exist", () => {
    const oldSandbox = join(tmpAppData, "GWizard.HASH_OLD");
    const newSandbox = join(tmpAppData, "GWizard.HASH_NEW");
    mkdirSync(join(oldSandbox, "Local Store"), { recursive: true });
    mkdirSync(join(newSandbox, "Local Store"), { recursive: true });

    const oldTarget = join(oldSandbox, "Local Store", "toolcrib.csv");
    const newTarget = join(newSandbox, "Local Store", "toolcrib.csv");
    writeFileSync(oldTarget, FIXTURE_FULL);
    writeFileSync(newTarget, FIXTURE_FULL);

    // Force the OLD target to have a clearly earlier mtime.
    const oldTime = new Date(2020, 0, 1);
    utimesSync(oldTarget, oldTime, oldTime);

    expect(gWizardAdapterEngine.resolveToolcribPath()).toBe(newTarget);
  });
});

describe("GWizardAdapterEngine — real operator file (gated, P1-style)", () => {
  it("reads the live G-Wizard toolcrib without throwing when present", async () => {
    const { existsSync } = await import("fs");
    const realPath = gWizardAdapterEngine.resolveToolcribPath();
    if (!realPath || !existsSync(realPath)) return;

    const state = gWizardAdapterEngine.read({ toolcrib_path: realPath });
    expect(state.source_path).toBe(realPath);
    expect(state.source_mtime_ms).toBeGreaterThan(0);
    // Operator has at least the 3 default tools at this point.
    expect(state.tools.length).toBeGreaterThanOrEqual(1);
    for (const t of state.tools) {
      expect(typeof t.guid).toBe("string");
      expect(t.guid.length).toBeGreaterThan(0);
      expect(["inches", "mm", "unknown"]).toContain(t.units);
    }
  });
});
