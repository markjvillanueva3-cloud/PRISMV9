/**
 * Tests for ProgramEquivalentIndexEngine (U-PPL-D4).
 *
 * Real-value assertions only — no toBeDefined() stubs (rejected by hook
 * stack). Coverage: happy paths, kind-mix, PN extraction edge cases,
 * link enrichment, input rejection, dryRun safety, write atomicity, wiring.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  buildProgramEquivalentIndex,
  compose,
  programEquivalentIndexEngine,
  ProgramEquivalentIndexEngine,
  PROGRAM_EQUIVALENT_INDEX_SCHEMA_VERSION,
  MIN_PN_REMAINDER_LENGTH,
  LATHE_GCODE_EXTENSIONS,
  DEFAULT_PROGRAM_EQUIVALENT_OUTPUT,
  type ComposeOptions,
} from "../engines/ProgramEquivalentIndexEngine.js";

import type { JMDieDiskIndexEntry } from "../engines/JMDieArchiveBackAnnotationEngine.js";
import type { PrintRefLookupFn } from "../engines/ProgramEquivalentIndexEngine.js";
import type { MasterIndex, CADFileEntry } from "../schemas/cadFileIndexSchema.js";
import type { McxBatchPerFileResult } from "../engines/McxBatchExtractorEngine.js";

// ── Test fixtures ────────────────────────────────────────────────────────────

function makeCadEntry(over: Partial<CADFileEntry> = {}): CADFileEntry {
  return {
    fileId: "a".repeat(64),
    absolutePath: "H:/PRISM/JM DIE/CNC MILL HAAS/ITW/T8047D3.ipt",
    format: ".ipt",
    sizeBytes: 12345,
    customer: "ITW",
    machineCategory: "mill",
    complexityHint: "moderate",
    lastModified: "2026-05-15T00:00:00Z",
    ...over,
  };
}

function makeCadMasterIndex(files: CADFileEntry[]): MasterIndex {
  const byFormat: Record<string, number> = {};
  const byMachineCategory: Record<string, number> = {};
  const byCustomer: Record<string, number> = {};
  for (const f of files) {
    byFormat[f.format] = (byFormat[f.format] ?? 0) + 1;
    byMachineCategory[f.machineCategory] = (byMachineCategory[f.machineCategory] ?? 0) + 1;
    byCustomer[f.customer] = (byCustomer[f.customer] ?? 0) + 1;
  }
  return {
    schemaVersion: 1,
    generatedAt: "2026-05-15T00:00:00Z",
    rootPaths: ["H:/PRISM/JM DIE"],
    totalFiles: files.length,
    byFormat,
    byMachineCategory,
    byCustomer,
    files,
  };
}

function makeLatheEntry(over: Partial<JMDieDiskIndexEntry> = {}): JMDieDiskIndexEntry {
  return {
    path: "H:/PRISM/JM DIE/CNC LATHE/ITW/L-2845-D2.MIN",
    name: "L-2845-D2.MIN",
    stem: "L-2845-D2",
    ext: ".min",
    customer: "ITW",
    machine: "lathe",
    size: 4096,
    mtime: "2026-05-15T00:00:00Z",
    ...over,
  };
}

function makeMcxEntry(
  over: Partial<McxBatchPerFileResult> = {},
): McxBatchPerFileResult {
  return {
    fileId: "mcx-1",
    sourcePath: "H:/PRISM/JM DIE/CNC MILL HAAS/ITW/T8047D3.mcx-8",
    status: "ok",
    customer: "ITW",
    format: ".mcx-8",
    magicVerified: true,
    bytesScanned: 16384,
    zlibChunks: 12,
    estimatedOperations: 6,
    embeddedStringCount: 240,
    durationMs: 18,
    error: null,
    ...over,
  };
}

/**
 * Build an injected `lookupFn` that returns a fixed PrintRef ONLY when the
 * caller path equals `programPath`. Eliminates the brittle ProgramPrintLinkIndex
 * internal-shape dependency for unit-test isolation; production callers pass
 * a real `linkIndex` and the engine routes through `lookupPrintForProgram`.
 */
function makeLookupFn(
  programPath: string,
  printId: string,
  confidence: string,
): PrintRefLookupFn {
  return (queryPath: string) => {
    if (queryPath === programPath) {
      return { print_id: printId, match_confidence: confidence };
    }
    return undefined;
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ProgramEquivalentIndexEngine — happy paths", () => {
  it("projects a single CAD entry into a cad-as-program entry with normalized PN", () => {
    const cad = makeCadMasterIndex([makeCadEntry()]);
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: cad,
      latheProgramEntries: [],
    });
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]!.kind).toBe("cad-as-program");
    expect(result.entries[0]!.path).toBe(
      "H:/PRISM/JM DIE/CNC MILL HAAS/ITW/T8047D3.ipt",
    );
    expect(result.entries[0]!.format).toBe(".ipt");
    expect(result.entries[0]!.customer).toBe("ITW");
    expect(result.entries[0]!.part_number_normalized).toBe("8047D3");
    expect(result.byKind["cad-as-program"]).toBe(1);
    expect(result.byKind["lathe-gcode"]).toBe(0);
    expect(result.byPartNumber["8047D3"]).toBe(1);
    expect(result.byCustomer["ITW"]).toBe(1);
  });

  it("projects a single lathe .MIN entry into a lathe-gcode entry", () => {
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [makeLatheEntry()],
    });
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]!.kind).toBe("lathe-gcode");
    expect(result.entries[0]!.format).toBe(".min");
    expect(result.entries[0]!.machine_category).toBe("lathe");
    // L-2845-D2 normalizes to "2845" per the doc-comment example in
    // ProgramPrintLinkIndexEngine line 275.
    expect(result.entries[0]!.part_number_normalized).toBe("2845");
    expect(result.lathe_source.recognized).toBe(1);
    expect(result.lathe_source.skipped_not_lathe).toBe(0);
    expect(result.lathe_source.skipped_no_pn).toBe(0);
  });

  it("composes CAD + lathe halves into a unified index", () => {
    const cad = makeCadMasterIndex([
      makeCadEntry({
        absolutePath: "H:/PRISM/JM DIE/CNC MILL HAAS/AGRATI/9082526.ipt",
        customer: "AGRATI",
      }),
      makeCadEntry({
        absolutePath: "H:/PRISM/JM DIE/HYPERMILL/TFI/BU-1365-0000-002.iam",
        format: ".iam",
        customer: "TFI",
      }),
    ]);
    const lathe = [
      makeLatheEntry({
        path: "H:/PRISM/JM DIE/CNC LATHE/SCREWS/C2500-2497.MIN",
        stem: "C2500-2497",
        customer: "SCREWS",
      }),
    ];
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: cad,
      latheProgramEntries: lathe,
    });
    expect(result.entries.length).toBe(3);
    expect(result.byKind["cad-as-program"]).toBe(2);
    expect(result.byKind["lathe-gcode"]).toBe(1);
    expect(result.byPartNumber["9082526"]).toBe(1);
    expect(result.byPartNumber["1365-0000-002"]).toBe(1);
    expect(result.byPartNumber["2500-2497"]).toBe(1);
    expect(result.cad_source.totalFiles).toBe(2);
    expect(result.cad_source.byFormat[".ipt"]).toBe(1);
    expect(result.cad_source.byFormat[".iam"]).toBe(1);
    expect(result.lathe_source.recognized).toBe(1);
  });
});

describe("ProgramEquivalentIndexEngine — mill-gcode bridge (D5)", () => {
  it("projects a single .mcx-8 ok-status entry into a mill-gcode entry", () => {
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [],
      mcxProgramEntries: [makeMcxEntry()],
    });
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]!.kind).toBe("mill-gcode");
    expect(result.entries[0]!.format).toBe(".mcx-8");
    expect(result.entries[0]!.machine_category).toBe("mill");
    expect(result.entries[0]!.customer).toBe("ITW");
    expect(result.entries[0]!.part_number_normalized).toBe("8047D3");
    expect(result.entries[0]!.size_bytes).toBe(16384);
    expect(result.mcx_source.totalEntries).toBe(1);
    expect(result.mcx_source.recognized).toBe(1);
    expect(result.mcx_source.skipped_non_ok).toBe(0);
    expect(result.mcx_source.skipped_no_pn).toBe(0);
    expect(result.mcx_source.byFormat[".mcx-8"]).toBe(1);
    expect(result.mcx_source.byMagicVerified.verified).toBe(1);
    expect(result.mcx_source.byMagicVerified.unverified).toBe(0);
    expect(result.byKind["mill-gcode"]).toBe(1);
    expect(result.byKind["cad-as-program"]).toBe(0);
    expect(result.byKind["lathe-gcode"]).toBe(0);
    expect(result.byCustomer["ITW"]).toBe(1);
    expect(result.byPartNumber["8047D3"]).toBe(1);
  });

  it("composes CAD + lathe + mill into a 3-way unified index", () => {
    const cad = makeCadMasterIndex([
      makeCadEntry({
        absolutePath: "H:/PRISM/JM DIE/CNC MILL HAAS/AGRATI/9082526.ipt",
        customer: "AGRATI",
      }),
    ]);
    const lathe = [
      makeLatheEntry({
        path: "H:/PRISM/JM DIE/CNC LATHE/SCREWS/C2500-2497.MIN",
        stem: "C2500-2497",
        customer: "SCREWS",
      }),
    ];
    const mcx = [
      makeMcxEntry({
        sourcePath: "H:/PRISM/JM DIE/HYPERMILL/TFI/BU-1365-0000-002.mcx-8",
        customer: "TFI",
      }),
    ];
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: cad,
      latheProgramEntries: lathe,
      mcxProgramEntries: mcx,
    });
    expect(result.entries.length).toBe(3);
    expect(result.byKind["cad-as-program"]).toBe(1);
    expect(result.byKind["lathe-gcode"]).toBe(1);
    expect(result.byKind["mill-gcode"]).toBe(1);
    expect(result.byPartNumber["9082526"]).toBe(1);
    expect(result.byPartNumber["2500-2497"]).toBe(1);
    expect(result.byPartNumber["1365-0000-002"]).toBe(1);
    expect(result.byCustomer["AGRATI"]).toBe(1);
    expect(result.byCustomer["SCREWS"]).toBe(1);
    expect(result.byCustomer["TFI"]).toBe(1);
  });

  it("counts every status!=ok mcx entry as skipped_non_ok", () => {
    const mcx = [
      makeMcxEntry({ fileId: "ok1", status: "ok" }),
      makeMcxEntry({
        fileId: "fail1",
        status: "parse_failed",
        error: "bad magic",
      }),
      makeMcxEntry({
        fileId: "io1",
        status: "io_error",
        error: "EACCES",
      }),
      makeMcxEntry({ fileId: "exist1", status: "skipped_existing" }),
      makeMcxEntry({ fileId: "over1", status: "skipped_oversize" }),
    ];
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [],
      mcxProgramEntries: mcx,
    });
    expect(result.mcx_source.totalEntries).toBe(5);
    expect(result.mcx_source.recognized).toBe(1);
    expect(result.mcx_source.skipped_non_ok).toBe(4);
    expect(result.mcx_source.skipped_no_pn).toBe(0);
    expect(result.byKind["mill-gcode"]).toBe(1);
  });

  it("counts ok-but-no-PN as skipped_no_pn (not skipped_non_ok)", () => {
    const mcx = [
      makeMcxEntry({
        fileId: "nopn",
        sourcePath: "H:/PRISM/JM DIE/CNC MILL HAAS/ITW/ab.mcx-8",
      }),
    ];
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [],
      mcxProgramEntries: mcx,
    });
    expect(result.mcx_source.totalEntries).toBe(1);
    expect(result.mcx_source.recognized).toBe(0);
    expect(result.mcx_source.skipped_non_ok).toBe(0);
    expect(result.mcx_source.skipped_no_pn).toBe(1);
    expect(result.byKind["mill-gcode"]).toBe(0);
  });

  it("aggregates byFormat across .mcx / .mcx-8 / .mcx-9 / .mcam", () => {
    const mcx = [
      makeMcxEntry({
        fileId: "f1",
        sourcePath: "H:/x/T8047D3.mcx",
        format: ".mcx",
      }),
      makeMcxEntry({
        fileId: "f2",
        sourcePath: "H:/x/T8048D3.mcx-8",
        format: ".mcx-8",
      }),
      makeMcxEntry({
        fileId: "f3",
        sourcePath: "H:/x/T8049D3.mcx-9",
        format: ".mcx-9",
      }),
      makeMcxEntry({
        fileId: "f4",
        sourcePath: "H:/x/T8050D3.mcam",
        format: ".mcam",
      }),
    ];
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [],
      mcxProgramEntries: mcx,
    });
    expect(result.mcx_source.byFormat[".mcx"]).toBe(1);
    expect(result.mcx_source.byFormat[".mcx-8"]).toBe(1);
    expect(result.mcx_source.byFormat[".mcx-9"]).toBe(1);
    expect(result.mcx_source.byFormat[".mcam"]).toBe(1);
    expect(result.mcx_source.recognized).toBe(4);
  });

  it("partitions magicVerified into verified vs unverified counts", () => {
    const mcx = [
      makeMcxEntry({ fileId: "v1", magicVerified: true }),
      makeMcxEntry({
        fileId: "v2",
        sourcePath: "H:/x/T9001.mcx-8",
        magicVerified: true,
      }),
      makeMcxEntry({
        fileId: "u1",
        sourcePath: "H:/x/T9002.mcx-8",
        magicVerified: false,
      }),
    ];
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [],
      mcxProgramEntries: mcx,
    });
    expect(result.mcx_source.byMagicVerified.verified).toBe(2);
    expect(result.mcx_source.byMagicVerified.unverified).toBe(1);
  });

  it("treats unknown-format mcx entries as skipped_non_ok", () => {
    const mcx = [
      makeMcxEntry({
        fileId: "unk",
        sourcePath: "H:/x/T8047D3.bin",
        format: "unknown",
      }),
    ];
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [],
      mcxProgramEntries: mcx,
    });
    expect(result.mcx_source.recognized).toBe(0);
    expect(result.mcx_source.skipped_non_ok).toBe(1);
  });

  it("attaches print_ref via lookupFn DI for a mill-gcode entry", () => {
    const millPath =
      "H:/PRISM/JM DIE/CNC MILL HAAS/ITW/T8047D3.mcx-8";
    const lookup = makeLookupFn(millPath, "PRINT-T8047D3", "exact");
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [],
      mcxProgramEntries: [makeMcxEntry({ sourcePath: millPath })],
      lookupFn: lookup,
    });
    expect(result.entries[0]!.print_ref?.print_id).toBe("PRINT-T8047D3");
    expect(result.entries[0]!.print_ref?.match_confidence).toBe("exact");
    expect(result.linked).toBe(1);
  });

  it("throws fail-loud on non-array mcxProgramEntries", () => {
    expect(() =>
      buildProgramEquivalentIndex({
        cadMasterIndex: null,
        latheProgramEntries: [],
        mcxProgramEntries: "not-an-array" as unknown as readonly McxBatchPerFileResult[],
      }),
    ).toThrow(/mcxProgramEntries must be an array/);
  });

  it("treats omitted mcxProgramEntries as empty (CAD+lathe-only mode unchanged)", () => {
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [makeLatheEntry()],
    });
    expect(result.mcx_source.totalEntries).toBe(0);
    expect(result.mcx_source.recognized).toBe(0);
    expect(result.mcx_source.byMagicVerified.verified).toBe(0);
    expect(result.mcx_source.byMagicVerified.unverified).toBe(0);
    expect(result.byKind["mill-gcode"]).toBe(0);
  });
});

describe("ProgramEquivalentIndexEngine — PN extraction edge cases", () => {
  it("strips customer suffix tokens via D1 normalizer", () => {
    const cad = makeCadMasterIndex([
      makeCadEntry({
        absolutePath: "H:/PRISM/JM DIE/HYPERMILL/T8047D3 ITW.f3d",
        format: ".f3d",
      }),
    ]);
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: cad,
      latheProgramEntries: [],
    });
    expect(result.entries[0]!.part_number_normalized).toBe("8047D3");
  });

  it("recognizes dotless ext on lathe entries", () => {
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [makeLatheEntry({ ext: "min" })],
    });
    expect(result.lathe_source.recognized).toBe(1);
    expect(result.entries[0]!.format).toBe(".min");
  });

  it("skips lathe entries with non-program extensions", () => {
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [
        makeLatheEntry({ ext: ".txt", path: "x.txt", stem: "x" }),
        makeLatheEntry({ ext: ".pdf", path: "y.pdf", stem: "y" }),
        makeLatheEntry({ ext: ".doc", path: "z.doc", stem: "z" }),
      ],
    });
    expect(result.lathe_source.recognized).toBe(0);
    expect(result.lathe_source.skipped_not_lathe).toBe(3);
    expect(result.entries.length).toBe(0);
  });

  it("skips lathe entries when PN remainder is too short", () => {
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [
        makeLatheEntry({ stem: "AB", name: "AB.MIN" }),
      ],
    });
    expect(result.lathe_source.recognized).toBe(0);
    expect(result.lathe_source.skipped_no_pn).toBe(1);
  });

  it("falls back to basename when stem missing", () => {
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [
        makeLatheEntry({
          path: "H:/PRISM/JM DIE/CNC LATHE/X/9082526.MIN",
          stem: "",
          name: "9082526.MIN",
        }),
      ],
    });
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]!.part_number_normalized).toBe("9082526");
  });
});

describe("ProgramEquivalentIndexEngine — link enrichment", () => {
  it("attaches print_ref when lookupFn resolves a match", () => {
    const programPath = "H:/PRISM/JM DIE/CNC LATHE/ITW/L-2845-D2.MIN";
    const lookupFn = makeLookupFn(programPath, "print-doc-2845", "exact");
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [makeLatheEntry({ path: programPath })],
      lookupFn,
    });
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]!.print_ref?.print_id).toBe("print-doc-2845");
    expect(result.entries[0]!.print_ref?.match_confidence).toBe("exact");
    expect(result.linked).toBe(1);
  });

  it("leaves entries without print_ref when lookupFn returns undefined", () => {
    const lookupFn = makeLookupFn("/some/other/path.min", "p", "exact");
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [makeLatheEntry()],
      lookupFn,
    });
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]!.print_ref).toBe(undefined);
    expect(result.linked).toBe(0);
  });

  it("attaches print_ref to CAD entries as well as lathe entries", () => {
    const cadPath = "H:/PRISM/JM DIE/CNC MILL HAAS/ITW/T8047D3.ipt";
    const lookupFn = makeLookupFn(cadPath, "print-doc-8047", "fuzzy");
    const cad = makeCadMasterIndex([makeCadEntry({ absolutePath: cadPath })]);
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: cad,
      latheProgramEntries: [],
      lookupFn,
    });
    expect(result.entries[0]!.print_ref?.print_id).toBe("print-doc-8047");
    expect(result.entries[0]!.print_ref?.match_confidence).toBe("fuzzy");
    expect(result.linked).toBe(1);
  });

  it("operates without lookupFn or linkIndex (optional)", () => {
    const cad = makeCadMasterIndex([makeCadEntry()]);
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: cad,
      latheProgramEntries: [],
    });
    expect(result.entries[0]!.print_ref).toBe(undefined);
    expect(result.linked).toBe(0);
  });
});

describe("ProgramEquivalentIndexEngine — input rejection & adversarial", () => {
  it("throws on non-array latheProgramEntries (runtime fuzz)", () => {
    expect(() =>
      buildProgramEquivalentIndex({
        cadMasterIndex: null,
        latheProgramEntries: null as unknown as readonly JMDieDiskIndexEntry[],
      }),
    ).toThrow(/must be an array/);
  });

  it("handles null cadMasterIndex safely (lathe-only mode)", () => {
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [makeLatheEntry()],
    });
    expect(result.cad_source.totalFiles).toBe(0);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]!.kind).toBe("lathe-gcode");
  });

  it("handles empty latheProgramEntries safely (CAD-only mode)", () => {
    const cad = makeCadMasterIndex([makeCadEntry()]);
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: cad,
      latheProgramEntries: [],
    });
    expect(result.entries.length).toBe(1);
    expect(result.lathe_source.totalEntries).toBe(0);
    expect(result.lathe_source.recognized).toBe(0);
  });

  it("respects limit cap on lathe entries", () => {
    const lathe = Array.from({ length: 5 }, (_, i) =>
      makeLatheEntry({
        path: `H:/lathe-${i}.MIN`,
        stem: `9082526-${i}`,
        name: `9082526-${i}.MIN`,
      }),
    );
    const result = buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: lathe,
      limit: 2,
    });
    // Cap honored: only 2 of 5 processed → recognized + skipped sum to 2.
    const counted =
      result.lathe_source.recognized +
      result.lathe_source.skipped_not_lathe +
      result.lathe_source.skipped_no_pn;
    expect(counted).toBe(2);
    expect(result.entries.filter((e) => e.kind === "lathe-gcode").length).toBe(2);
  });
});

describe("ProgramEquivalentIndexEngine — dryRun + write atomicity", () => {
  let tmpDir: string;
  let outPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppl-d4-"));
    outPath = path.join(tmpDir, "program-equivalent-index.json");
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  });

  it("dryRun: true (default) does NOT write to disk", async () => {
    const result = await compose({
      cadMasterIndex: null,
      latheProgramEntries: [makeLatheEntry()],
      outputPath: outPath,
    });
    expect(result.wrote).toBe(false);
    expect(fs.existsSync(outPath)).toBe(false);
  });

  it("dryRun: false writes a valid JSON file to outputPath", async () => {
    const result = await compose({
      cadMasterIndex: null,
      latheProgramEntries: [makeLatheEntry()],
      dryRun: false,
      outputPath: outPath,
    });
    expect(result.wrote).toBe(true);
    expect(result.outputPath).toBe(outPath);
    expect(fs.existsSync(outPath)).toBe(true);
    const raw = fs.readFileSync(outPath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(PROGRAM_EQUIVALENT_INDEX_SCHEMA_VERSION);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].kind).toBe("lathe-gcode");
  });
});

describe("ProgramEquivalentIndexEngine — wiring & exports", () => {
  it("exports the expected constants", () => {
    expect(PROGRAM_EQUIVALENT_INDEX_SCHEMA_VERSION).toBe(1);
    expect(MIN_PN_REMAINDER_LENGTH).toBe(4);
    expect(LATHE_GCODE_EXTENSIONS.has(".min")).toBe(true);
    expect(LATHE_GCODE_EXTENSIONS.has(".mac")).toBe(true);
    expect(LATHE_GCODE_EXTENSIONS.has(".ipt")).toBe(false);
    expect(DEFAULT_PROGRAM_EQUIVALENT_OUTPUT).toContain("cad-file-index");
    expect(DEFAULT_PROGRAM_EQUIVALENT_OUTPUT).toContain(
      "program-equivalent-index.json",
    );
  });

  it("singleton delegates to module-level functions", () => {
    const opts: ComposeOptions = {
      cadMasterIndex: null,
      latheProgramEntries: [makeLatheEntry()],
    };
    const direct = buildProgramEquivalentIndex(opts);
    const viaSingleton = programEquivalentIndexEngine.buildProgramEquivalentIndex(opts);
    // generatedAt differs by ms — compare structural fields
    expect(viaSingleton.entries.length).toBe(direct.entries.length);
    expect(viaSingleton.byKind).toEqual(direct.byKind);
    expect(viaSingleton.byPartNumber).toEqual(direct.byPartNumber);
  });

  it("class wrapper exposes the same surface as the singleton", () => {
    const fresh = new ProgramEquivalentIndexEngine();
    const result = fresh.buildProgramEquivalentIndex({
      cadMasterIndex: null,
      latheProgramEntries: [makeLatheEntry()],
    });
    expect(result.schemaVersion).toBe(PROGRAM_EQUIVALENT_INDEX_SCHEMA_VERSION);
    expect(result.entries.length).toBe(1);
  });
});
