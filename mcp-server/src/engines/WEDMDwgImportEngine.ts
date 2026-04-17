/**
 * WEDMDwgImportEngine — MS-P1.5-ONESHOT U-P1.5-OS-01
 *
 * DWG file import for Wire EDM pipeline with LibreDWG bridge and ODA fallback.
 *
 * Strategy:
 *   1. Try libredwg (OSS) for DWG→DXF conversion
 *   2. Fallback to ODA File Converter if available
 *   3. Delegate DXF parsing to DXFGeometryParserEngine
 *   4. Extract unit information from DWG $MEASUREMENT/$INSUNITS
 *
 * Supported versions: DWG R14 through R2018 (AC1014 → AC1032)
 *
 * References:
 *   - LibreDWG: https://www.gnu.org/software/libredwg/
 *   - ODA File Converter: https://www.opendesign.com/guestfiles/oda_file_converter
 *   - DWG format: Autodesk internal specification (reverse-engineered by OpenDWG)
 *
 * @module engines/WEDMDwgImportEngine
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { log } from "../utils/Logger.js";
import {
  dxfGeometryParserEngine,
  type GeometryParseResult,
  type GeometryIssue,
} from "./DXFGeometryParserEngine.js";

const execFileAsync = promisify(execFile);

// ============================================================================
// TYPES
// ============================================================================

export interface DwgImportInput {
  /** Raw DWG file content as Buffer or base64 string */
  dwg_data: Buffer | string;
  /** Optional filename for logging */
  filename?: string;
  /** Force specific unit interpretation (overrides DWG header) */
  force_units?: "mm" | "inch";
  /** Tolerance for gap closure in mm (default: 0.01) */
  gap_tolerance_mm?: number;
  /** Biarc chord tolerance for spline conversion in mm (default: 0.005) */
  chord_tolerance_mm?: number;
}

export interface DwgImportResult extends GeometryParseResult {
  /** Converter used: libredwg, oda, or direct (if already DXF) */
  converter_used: "libredwg" | "oda" | "direct" | "none";
  /** DWG version detected (e.g., "AC1032" for R2018) */
  dwg_version?: string;
  /** Intermediate DXF content (for debugging) */
  intermediate_dxf?: string;
  /** Conversion time in ms */
  conversion_time_ms: number;
  /** Total parse time in ms */
  total_time_ms: number;
}

export interface ConverterConfig {
  /** Path to libredwg's dwg2dxf executable */
  libredwg_path?: string;
  /** Path to ODA File Converter executable */
  oda_converter_path?: string;
  /** Timeout for conversion in ms (default: 30000) */
  timeout_ms?: number;
}

// ============================================================================
// DWG VERSION DETECTION
// ============================================================================

const DWG_VERSION_MAP: Record<string, string> = {
  "AC1014": "R14",
  "AC1015": "R2000",
  "AC1018": "R2004",
  "AC1021": "R2007",
  "AC1024": "R2010",
  "AC1027": "R2013",
  "AC1032": "R2018",
};

function detectDwgVersion(data: Buffer): string | undefined {
  // DWG magic: first 6 bytes are version string like "AC1032"
  if (data.length < 6) return undefined;
  const magic = data.subarray(0, 6).toString("ascii");
  return DWG_VERSION_MAP[magic] ? magic : undefined;
}

function isDwgFile(data: Buffer): boolean {
  if (data.length < 6) return false;
  const magic = data.subarray(0, 6).toString("ascii");
  return magic.startsWith("AC10");
}

function isDxfFile(data: Buffer): boolean {
  // DXF files start with "0\nSECTION" or similar
  const header = data.subarray(0, 100).toString("utf8");
  return header.includes("SECTION") && header.includes("HEADER");
}

// ============================================================================
// CONVERTER DETECTION
// ============================================================================

async function findLibreDwg(): Promise<string | null> {
  const candidates = [
    "dwg2dxf",
    "/usr/bin/dwg2dxf",
    "/usr/local/bin/dwg2dxf",
    "C:\\Program Files\\LibreDWG\\dwg2dxf.exe",
    "C:\\LibreDWG\\dwg2dxf.exe",
  ];

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ["--version"], { timeout: 5000 });
      return candidate;
    } catch {
      // Not found, try next
    }
  }
  return null;
}

async function findOdaConverter(): Promise<string | null> {
  const candidates = [
    "ODAFileConverter",
    "/usr/bin/ODAFileConverter",
    "C:\\Program Files\\ODA\\ODAFileConverter\\ODAFileConverter.exe",
    "C:\\ODA\\ODAFileConverter.exe",
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Not found, try next
    }
  }
  return null;
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

async function convertWithLibreDwg(
  dwgPath: string,
  dxfPath: string,
  timeout: number
): Promise<{ success: boolean; error?: string }> {
  const converter = await findLibreDwg();
  if (!converter) {
    return { success: false, error: "libredwg not found" };
  }

  try {
    await execFileAsync(converter, ["-o", dxfPath, dwgPath], { timeout });
    const exists = await fs.access(dxfPath).then(() => true).catch(() => false);
    return { success: exists, error: exists ? undefined : "Output file not created" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function convertWithOda(
  dwgPath: string,
  dxfPath: string,
  timeout: number
): Promise<{ success: boolean; error?: string }> {
  const converter = await findOdaConverter();
  if (!converter) {
    return { success: false, error: "ODA File Converter not found" };
  }

  const inputDir = path.dirname(dwgPath);
  const outputDir = path.dirname(dxfPath);
  const inputFilename = path.basename(dwgPath);

  try {
    // ODA File Converter command line:
    // ODAFileConverter <input_dir> <output_dir> <output_version> <output_type> <recurse> <audit> [filter]
    await execFileAsync(
      converter,
      [inputDir, outputDir, "ACAD2018", "DXF", "0", "1", inputFilename],
      { timeout }
    );

    // ODA creates output with same name but .dxf extension
    const odaOutput = path.join(outputDir, inputFilename.replace(/\.dwg$/i, ".dxf"));
    const exists = await fs.access(odaOutput).then(() => true).catch(() => false);

    if (exists && odaOutput !== dxfPath) {
      await fs.rename(odaOutput, dxfPath);
    }

    return { success: exists, error: exists ? undefined : "ODA conversion failed" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

class WEDMDwgImportEngine {
  private config: ConverterConfig;

  constructor(config: ConverterConfig = {}) {
    this.config = {
      timeout_ms: 30000,
      ...config,
    };
  }

  /**
   * Import a DWG file and parse geometry for Wire EDM.
   *
   * Conversion strategy:
   * 1. If file is already DXF, parse directly
   * 2. Try libredwg for DWG→DXF conversion
   * 3. Fall back to ODA File Converter
   * 4. Delegate to DXFGeometryParserEngine for parsing
   */
  async import(input: DwgImportInput): Promise<DwgImportResult> {
    const startTime = Date.now();
    const issues: GeometryIssue[] = [];

    // Convert input to Buffer
    const data = typeof input.dwg_data === "string"
      ? Buffer.from(input.dwg_data, "base64")
      : input.dwg_data;

    const filename = input.filename ?? "input.dwg";
    log.info(`[WEDMDwgImport] Processing ${filename} (${data.length} bytes)`);

    // Check if already DXF
    if (isDxfFile(data)) {
      log.info("[WEDMDwgImport] File is already DXF, parsing directly");
      const parseResult = dxfGeometryParserEngine.parseDXF(data.toString("utf8"));

      return {
        ...parseResult,
        source_units: input.force_units ?? parseResult.source_units,
        converter_used: "direct",
        conversion_time_ms: 0,
        total_time_ms: Date.now() - startTime,
      };
    }

    // Validate DWG
    if (!isDwgFile(data)) {
      return this.errorResult(
        "Invalid file format: not a DWG or DXF file",
        startTime,
        issues
      );
    }

    const dwgVersion = detectDwgVersion(data);
    if (dwgVersion) {
      log.info(`[WEDMDwgImport] Detected DWG version: ${dwgVersion} (${DWG_VERSION_MAP[dwgVersion]})`);
    }

    // Create temp files
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wedm-dwg-"));
    const dwgPath = path.join(tempDir, filename);
    const dxfPath = path.join(tempDir, filename.replace(/\.dwg$/i, ".dxf"));

    try {
      await fs.writeFile(dwgPath, data);

      let conversionResult: { success: boolean; error?: string };
      let converterUsed: "libredwg" | "oda" | "none" = "none";
      const conversionStart = Date.now();

      // Try libredwg first
      conversionResult = await convertWithLibreDwg(
        dwgPath,
        dxfPath,
        this.config.timeout_ms!
      );

      if (conversionResult.success) {
        converterUsed = "libredwg";
      } else {
        log.warn(`[WEDMDwgImport] LibreDWG failed: ${conversionResult.error}, trying ODA`);

        // Try ODA fallback
        conversionResult = await convertWithOda(
          dwgPath,
          dxfPath,
          this.config.timeout_ms!
        );

        if (conversionResult.success) {
          converterUsed = "oda";
        }
      }

      const conversionTime = Date.now() - conversionStart;

      if (!conversionResult.success) {
        issues.push({
          type: "open_contour",
          severity: "error",
          message: `DWG conversion failed: ${conversionResult.error}. Install libredwg or ODA File Converter.`,
        });

        return this.errorResult(
          `DWG conversion failed: ${conversionResult.error}`,
          startTime,
          issues,
          dwgVersion
        );
      }

      // Read and parse the DXF
      const dxfContent = await fs.readFile(dxfPath, "utf8");
      const parseResult = dxfGeometryParserEngine.parseDXF(dxfContent);

      log.info(
        `[WEDMDwgImport] Converted via ${converterUsed} in ${conversionTime}ms, ` +
        `parsed ${parseResult.contours.length} contours`
      );

      return {
        ...parseResult,
        source_units: input.force_units ?? parseResult.source_units,
        converter_used: converterUsed,
        dwg_version: dwgVersion,
        intermediate_dxf: dxfContent.length < 100000 ? dxfContent : undefined,
        conversion_time_ms: conversionTime,
        total_time_ms: Date.now() - startTime,
      };
    } finally {
      // Cleanup temp files
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Check if DWG conversion is available on this system.
   */
  async checkConverterAvailability(): Promise<{
    libredwg: boolean;
    oda: boolean;
    any: boolean;
    recommended: "libredwg" | "oda" | "none";
  }> {
    const [libredwg, oda] = await Promise.all([
      findLibreDwg().then(p => p !== null),
      findOdaConverter().then(p => p !== null),
    ]);

    return {
      libredwg,
      oda,
      any: libredwg || oda,
      recommended: libredwg ? "libredwg" : oda ? "oda" : "none",
    };
  }

  /**
   * Get supported DWG versions.
   */
  getSupportedVersions(): string[] {
    return Object.entries(DWG_VERSION_MAP).map(
      ([code, name]) => `${name} (${code})`
    );
  }

  private errorResult(
    message: string,
    startTime: number,
    issues: GeometryIssue[],
    dwgVersion?: string
  ): DwgImportResult {
    return {
      contours: [],
      issues: [
        ...issues,
        { type: "open_contour", severity: "error", message },
      ],
      entity_count: 0,
      source_format: "dxf",
      source_units: "unknown",
      warnings: [message],
      converter_used: "none",
      dwg_version: dwgVersion,
      conversion_time_ms: 0,
      total_time_ms: Date.now() - startTime,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmDwgImportEngine = new WEDMDwgImportEngine();
export { WEDMDwgImportEngine };
