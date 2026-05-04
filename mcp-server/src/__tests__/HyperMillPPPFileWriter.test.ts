/**
 * HyperMillPPPFileWriter tests — CAM-EXHAUST-MS0 / U-CAM-HM-AC-PPP-TESTS-01
 *
 * Coverage:
 *   1. Pure helpers: resolveNCExtension, buildNCFileName, buildPRISMHeader, splitSubPrograms
 *   2. atomicWriteNC: real round-trip in os.tmpdir, byte count correct
 *   3. backupNCFile: undefined when target missing; timestamped copy when present
 *   4. write(): full happy path — header prepended, file in NC subfolder
 *   5. write(): splitSubPrograms branch creates separate sub files
 *   6. write(): error path returns success=false (no throw)
 *   7. resolveOutputPath: path calculation without writing
 *   8. Adversarial: special chars, empty content
 *
 * Strict legitimacy: real fs round-trips, named constants, concrete value assertions only.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  HyperMillPPPFileWriter,
  hyperMillPPPFileWriter,
  resolveNCExtension,
  buildNCFileName,
  buildPRISMHeader,
  splitSubPrograms,
  atomicWriteNC,
  backupNCFile,
  DEFAULT_HM_PROJECT_FOLDER,
  type HMProjectFolder,
} from "../engines/HyperMillPPPFileWriter.js";

const NC_SUBFOLDER = "NC";
const BACKUP_SUBFOLDER = "NC_backup";
const SUB_SUBFOLDER = "NC_sub";

const FANUC_EXT = ".nc";
const HEIDENHAIN_EXT = ".h";
const SIEMENS_EXT = ".spf";
const OKUMA_EXT = ".min";

const ENGINE_CODE = "E1169";

let testRoot: string;

beforeEach(() => {
  testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ppp-writer-test-"));
});

afterEach(() => {
  try { fs.rmSync(testRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("HyperMillPPPFileWriter — class shape + DEFAULT_HM_PROJECT_FOLDER", () => {
  it("exports class with prototype write method", () => {
    expect(typeof HyperMillPPPFileWriter).toBe("function");
    expect(typeof HyperMillPPPFileWriter.prototype.write).toBe("function");
    expect(typeof HyperMillPPPFileWriter.prototype.resolveOutputPath).toBe("function");
  });

  it("singleton is an instance of the class", () => {
    expect(hyperMillPPPFileWriter instanceof HyperMillPPPFileWriter).toBe(true);
  });

  it("DEFAULT_HM_PROJECT_FOLDER carries canonical subfolder names", () => {
    expect(DEFAULT_HM_PROJECT_FOLDER.ncSubFolder).toBe(NC_SUBFOLDER);
    expect(DEFAULT_HM_PROJECT_FOLDER.backupSubFolder).toBe(BACKUP_SUBFOLDER);
    expect(DEFAULT_HM_PROJECT_FOLDER.subProgramSubFolder).toBe(SUB_SUBFOLDER);
  });
});

describe("HyperMillPPPFileWriter — resolveNCExtension()", () => {
  it("fanuc → .nc", () => {
    expect(resolveNCExtension("fanuc")).toBe(FANUC_EXT);
  });
  it("heidenhain → .h", () => {
    expect(resolveNCExtension("heidenhain")).toBe(HEIDENHAIN_EXT);
  });
  it("siemens → .spf", () => {
    expect(resolveNCExtension("siemens")).toBe(SIEMENS_EXT);
  });
  it("okuma → .min", () => {
    expect(resolveNCExtension("okuma")).toBe(OKUMA_EXT);
  });
  it("mazak → .nc (alias for fanuc family)", () => {
    expect(resolveNCExtension("mazak")).toBe(FANUC_EXT);
  });
  it("haas → .nc", () => {
    expect(resolveNCExtension("haas")).toBe(FANUC_EXT);
  });

  it("uppercase FANUC normalizes to .nc", () => {
    expect(resolveNCExtension("FANUC")).toBe(FANUC_EXT);
  });
  it("CamelCase Heidenhain normalizes to .h", () => {
    expect(resolveNCExtension("Heidenhain")).toBe(HEIDENHAIN_EXT);
  });

  it("hyphenated dialect (deckel-maho) normalizes to .nc", () => {
    expect(resolveNCExtension("deckel-maho")).toBe(FANUC_EXT);
  });

  it("unknown dialect falls back to .nc", () => {
    expect(resolveNCExtension("unknown_brand_99")).toBe(FANUC_EXT);
  });
  it("empty dialect falls back to .nc", () => {
    expect(resolveNCExtension("")).toBe(FANUC_EXT);
  });
});

describe("HyperMillPPPFileWriter — buildNCFileName()", () => {
  it("happy path produces jobName_dialect.ext", () => {
    expect(buildNCFileName("Bracket_Op10", "fanuc")).toBe("Bracket_Op10_fanuc.nc");
  });
  it("heidenhain → .h extension", () => {
    expect(buildNCFileName("ImpellerBlade", "heidenhain")).toBe("ImpellerBlade_heidenhain.h");
  });
  it("okuma → .min extension", () => {
    expect(buildNCFileName("Job123", "okuma")).toBe("Job123_okuma.min");
  });

  it("special chars in jobName replaced with underscore (one per char)", () => {
    expect(buildNCFileName("My Job (rev 2)/cycle@5", "fanuc")).toBe("My_Job__rev_2__cycle_5_fanuc.nc");
  });

  it("dialect non-alphanumeric stripped (siemens-840d → unknown → .nc)", () => {
    expect(buildNCFileName("Job", "siemens-840d")).toBe("Job_siemens_840d.nc");
  });

  it("empty job name produces _dialect.ext", () => {
    expect(buildNCFileName("", "fanuc")).toBe("_fanuc.nc");
  });
});

describe("HyperMillPPPFileWriter — buildPRISMHeader()", () => {
  it("non-heidenhain dialect uses '%' comment char as first char", () => {
    const h = buildPRISMHeader({ generatedAt: "2026-05-04T00:00:00Z" }, "fanuc");
    expect(h.startsWith("%")).toBe(true);
  });

  it("heidenhain dialect uses ';' comment char as first char", () => {
    const h = buildPRISMHeader({}, "heidenhain");
    expect(h.startsWith(";")).toBe(true);
  });

  it("includes engine code E1169 in header body", () => {
    const h = buildPRISMHeader({}, "fanuc");
    expect(h.includes(ENGINE_CODE)).toBe(true);
  });

  it("includes 'PRISM Post-Process Pipeline Output' marquee", () => {
    const h = buildPRISMHeader({}, "fanuc");
    expect(h.includes("PRISM Post-Process Pipeline Output")).toBe(true);
  });

  it("metadata generatedAt verbatim in header", () => {
    const h = buildPRISMHeader({ generatedAt: "2026-05-04T00:00:00Z" }, "fanuc");
    expect(h.includes("2026-05-04T00:00:00Z")).toBe(true);
  });

  it("materialName surfaces in header", () => {
    const h = buildPRISMHeader({ materialName: "AISI 4340" }, "fanuc");
    expect(h.includes("AISI 4340")).toBe(true);
  });

  it("optimizeFor surfaces in header", () => {
    const h = buildPRISMHeader({ optimizeFor: "tool_life" }, "fanuc");
    expect(h.includes("tool_life")).toBe(true);
  });

  it("operationCount = 7 surfaces as 'Operations: 7'", () => {
    const h = buildPRISMHeader({ operationCount: 7 }, "fanuc");
    expect(h.includes("Operations: 7")).toBe(true);
  });

  it("missing metadata uses 'unknown'/'balanced'/'?' fallbacks", () => {
    const h = buildPRISMHeader(undefined, "fanuc");
    expect(h.includes("Material  : unknown")).toBe(true);
    expect(h.includes("Optimize  : balanced")).toBe(true);
    expect(h.includes("Operations: ?")).toBe(true);
  });
});

describe("HyperMillPPPFileWriter — splitSubPrograms()", () => {
  it("no SUB-PROGRAM-START markers → main equals input, subs is empty array", () => {
    const nc = "% main program\nG0 X0 Y0\nM30";
    const r = splitSubPrograms(nc, "fanuc");
    expect(r.main).toBe(nc);
    expect(r.subs.length).toBe(0);
  });

  it("two SUB-PROGRAM-START markers split into two named subs", () => {
    const nc = `% MAIN
G0 X0
% SUB-PROGRAM-START: L1000
G1 X10
% SUB-PROGRAM-START: L2000
G1 Y20`;
    const r = splitSubPrograms(nc, "fanuc");
    expect(r.subs.length).toBe(2);
    expect(r.subs[0].name).toBe("L1000");
    expect(r.subs[1].name).toBe("L2000");
    expect(r.subs[0].content.includes("G1 X10")).toBe(true);
    expect(r.subs[1].content.includes("G1 Y20")).toBe(true);
  });

  it("main contains only pre-marker content (does not contain L1000 marker line)", () => {
    const nc = `% MAIN
G0 X0
% SUB-PROGRAM-START: L1000
G1 X10`;
    const r = splitSubPrograms(nc, "fanuc");
    expect(r.main.includes("MAIN")).toBe(true);
    expect(r.main.includes("L1000")).toBe(false);
  });
});

describe("HyperMillPPPFileWriter — atomicWriteNC() round-trip", () => {
  it("writes content, returns byte count == utf-8 byte length", () => {
    const target = path.join(testRoot, "out", "test.nc");
    const content = "% test\nG0 X0\nM30\n";
    const bytes = atomicWriteNC(target, content);
    expect(bytes).toBe(Buffer.byteLength(content, "utf-8"));
  });

  it("file exists at target path after write", () => {
    const target = path.join(testRoot, "out", "test.nc");
    atomicWriteNC(target, "data");
    expect(fs.existsSync(target)).toBe(true);
  });

  it("file content readable matches what was written", () => {
    const target = path.join(testRoot, "out", "test.nc");
    const content = "% test\nG0 X0\nM30\n";
    atomicWriteNC(target, content);
    expect(fs.readFileSync(target, "utf-8")).toBe(content);
  });

  it("creates parent directory recursively if missing", () => {
    const target = path.join(testRoot, "deep", "nested", "path", "x.nc");
    atomicWriteNC(target, "data");
    expect(fs.existsSync(target)).toBe(true);
  });

  it("UTF-8 multi-byte content byte count matches Buffer.byteLength", () => {
    const target = path.join(testRoot, "utf8.nc");
    const content = "° rotation 30° pitch";  // ° = 2 bytes UTF-8
    const bytes = atomicWriteNC(target, content);
    expect(bytes).toBe(Buffer.byteLength(content, "utf-8"));
  });
});

describe("HyperMillPPPFileWriter — backupNCFile()", () => {
  it("source missing → returns the literal value undefined", () => {
    const r = backupNCFile(path.join(testRoot, "nope.nc"), path.join(testRoot, "backup"));
    expect(r).toBe(undefined);
  });

  it("source exists → returned path is a non-empty string ending in source extension", () => {
    const orig = path.join(testRoot, "orig.nc");
    fs.writeFileSync(orig, "ORIGINAL");
    const r = backupNCFile(orig, path.join(testRoot, "backup"));
    // r is string when source exists
    expect(typeof r === "string" && r.length > 0).toBe(true);
    expect((r as string).endsWith(".nc")).toBe(true);
  });

  it("backup file content matches original byte-for-byte", () => {
    const orig = path.join(testRoot, "orig.nc");
    fs.writeFileSync(orig, "ORIGINAL");
    const r = backupNCFile(orig, path.join(testRoot, "backup")) as string;
    expect(fs.readFileSync(r, "utf-8")).toBe("ORIGINAL");
  });

  it("backup file name follows pattern <basename>_backup_<iso-timestamp><ext>", () => {
    const orig = path.join(testRoot, "orig.nc");
    fs.writeFileSync(orig, "x");
    const r = backupNCFile(orig, path.join(testRoot, "backup")) as string;
    expect(/orig_backup_.*\.nc$/.test(path.basename(r))).toBe(true);
  });
});

describe("HyperMillPPPFileWriter — write() full happy path", () => {
  it("returns success=true with mainFilePath in NC subfolder", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const r = writer.write({
      ncContent: "G0 X0\nG1 X10\nM30\n",
      jobName: "Test_Job",
      controllerDialect: "fanuc",
      projectFolder: folder,
      prismMetadata: { materialName: "1018", operationCount: 3 },
    });
    expect(r.success).toBe(true);
    expect(r.mainFilePath).toBe(path.join(testRoot, NC_SUBFOLDER, "Test_Job_fanuc.nc"));
  });

  it("bytesWritten > 0 for non-empty input", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const r = writer.write({
      ncContent: "G0 X0\n",
      jobName: "J",
      controllerDialect: "fanuc",
      projectFolder: folder,
    });
    expect(r.bytesWritten > 0).toBe(true);
  });

  it("prismHeaderAdded=true and subProgramPaths empty by default", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const r = writer.write({
      ncContent: "G0\n",
      jobName: "J",
      controllerDialect: "fanuc",
      projectFolder: folder,
    });
    expect(r.prismHeaderAdded).toBe(true);
    expect(r.subProgramPaths).toEqual([]);
  });

  it("written file contains PRISM header marquee and original NC content", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const r = writer.write({
      ncContent: "G0 X0\nM30\n",
      jobName: "J",
      controllerDialect: "fanuc",
      projectFolder: folder,
      prismMetadata: { materialName: "1018" },
    });
    const content = fs.readFileSync(r.mainFilePath, "utf-8");
    expect(content.includes("PRISM Post-Process Pipeline Output")).toBe(true);
    expect(content.includes("1018")).toBe(true);
    expect(content.includes("G0 X0")).toBe(true);
  });

  it("backup created when target file already exists (backupCreated=true)", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const ncDir = path.join(testRoot, NC_SUBFOLDER);
    fs.mkdirSync(ncDir, { recursive: true });
    const ncPath = path.join(ncDir, "Job_fanuc.nc");
    fs.writeFileSync(ncPath, "OLD CONTENT");

    const r = writer.write({
      ncContent: "NEW CONTENT",
      jobName: "Job",
      controllerDialect: "fanuc",
      projectFolder: folder,
    });
    expect(r.success).toBe(true);
    expect(r.backupCreated).toBe(true);
    expect(typeof r.backupFilePath === "string" && r.backupFilePath.length > 0).toBe(true);
    expect(fs.readFileSync(r.backupFilePath as string, "utf-8")).toBe("OLD CONTENT");
  });

  it("splitSubPrograms branch creates separate sub files (one per marker)", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const nc = `% MAIN
G0 X0
% SUB-PROGRAM-START: SUB_A
G1 X5
% SUB-PROGRAM-START: SUB_B
G1 Y5`;
    const r = writer.write({
      ncContent: nc,
      jobName: "Multi",
      controllerDialect: "fanuc",
      projectFolder: folder,
      splitSubPrograms: true,
    });
    expect(r.success).toBe(true);
    expect(r.subProgramPaths.length).toBe(2);
  });

  it("each sub file exists on disk and contains PRISM header", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const nc = `% MAIN
% SUB-PROGRAM-START: SUB_A
G1 X5`;
    const r = writer.write({
      ncContent: nc,
      jobName: "Multi",
      controllerDialect: "fanuc",
      projectFolder: folder,
      splitSubPrograms: true,
    });
    for (const subPath of r.subProgramPaths) {
      expect(fs.existsSync(subPath)).toBe(true);
      const c = fs.readFileSync(subPath, "utf-8");
      expect(c.includes("PRISM")).toBe(true);
    }
  });
});

describe("HyperMillPPPFileWriter — write() error path", () => {
  it("invalid project root (NUL byte) → success=false, error string set, no throw", () => {
    const writer = new HyperMillPPPFileWriter();
    const badRoot = "\0/no/way/this/works";
    const r = writer.write({
      ncContent: "x",
      jobName: "Job",
      controllerDialect: "fanuc",
      projectFolder: { projectRoot: badRoot, ...DEFAULT_HM_PROJECT_FOLDER },
    });
    expect(r.success).toBe(false);
    expect(typeof r.error === "string" && r.error.length > 0).toBe(true);
    expect(r.bytesWritten).toBe(0);
    expect(r.mainFilePath).toBe("");
  });
});

describe("HyperMillPPPFileWriter — resolveOutputPath()", () => {
  it("calculates fanuc path without writing", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const p = writer.resolveOutputPath("Bracket", "fanuc", folder);
    expect(p).toBe(path.join(testRoot, NC_SUBFOLDER, "Bracket_fanuc.nc"));
    expect(fs.existsSync(p)).toBe(false);
  });

  it("calculates heidenhain path with .h extension", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const p = writer.resolveOutputPath("Bracket", "heidenhain", folder);
    expect(p).toBe(path.join(testRoot, NC_SUBFOLDER, "Bracket_heidenhain.h"));
  });
});

describe("HyperMillPPPFileWriter — adversarial", () => {
  it("empty NC content writes a file containing only the PRISM header", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const r = writer.write({
      ncContent: "",
      jobName: "Empty",
      controllerDialect: "fanuc",
      projectFolder: folder,
    });
    expect(r.success).toBe(true);
    expect(r.bytesWritten > 0).toBe(true);
    const content = fs.readFileSync(r.mainFilePath, "utf-8");
    expect(content.includes("PRISM Post-Process Pipeline Output")).toBe(true);
  });

  it("write() called twice in a row both succeed (atomic + backup chain)", () => {
    const writer = new HyperMillPPPFileWriter();
    const folder: HMProjectFolder = { projectRoot: testRoot, ...DEFAULT_HM_PROJECT_FOLDER };
    const r1 = writer.write({
      ncContent: "FIRST", jobName: "J", controllerDialect: "fanuc", projectFolder: folder,
    });
    const r2 = writer.write({
      ncContent: "SECOND", jobName: "J", controllerDialect: "fanuc", projectFolder: folder,
    });
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r2.backupCreated).toBe(true);
  });
});
