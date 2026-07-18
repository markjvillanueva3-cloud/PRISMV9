/**
 * GWizardAdapterEngine — read-only adapter for G-Wizard Calculator's tool crib
 *
 * Closes U-OSC9-12 of OSCAR-SFC-9AXIS-MS0. Operator directive 2026-05-26: "I now have
 * gwizard and hsmadvisor on this pc for you to test and compare against." The HSMAdvisor
 * side shipped as U-OSC9-09 (live state) + U-OSC9-11 (comparator). G-Wizard's operator
 * file is currently UNPOPULATED — only 3 default tools in the crib — so this iter ships
 * a working CSV reader keyed to the live operator file shape; richer SQLite extraction
 * (saved jobs / calculation history from GWizard.db) is deferred to iter6.
 *
 * Data source (verified 2026-05-26 on operator's machine):
 *   `%APPDATA%/GWizard.<hash>/Local Store/toolcrib.csv`
 *   60-column CSV — first row is header, subsequent rows are tools.
 *
 * G-Wizard is an Adobe AIR / Flash app (GWizard.exe + GWizard.swf at install). It writes
 * its persistent state to a hash-suffixed AIR sandbox dir. The hash is per-install + is
 * the only stable identifier — we resolve the dir by scanning AppData/Roaming for
 * `GWizard.*` and picking the most-recently-modified match.
 *
 * Read-only by design — never writes back.
 *
 * The verified CSV columns (header row from operator's 2026-05-26 toolcrib.csv):
 *   key,tabname,guid,slot,description,serialno,tool,generic,geometry,flutes,leadang,
 *   diameter,stickout,cutLength,overallLength,shankSize,noseRad,helixAngle,coating,
 *   toolmaterial,toolFamily,vendor,product,idNo,insNo,sfm,ipt,chipload,useMfgSFM,mfgSFM,
 *   useMfgIPT,mfgIPT,xcomp,zcomp,xgeom,zgeom,status,quantity,field1..4,units,holderType,
 *   holderDesc,holderDia,holderLen,comment,clockwise,coolantMode,coolantSupport,
 *   shoulderLength,taperAngle2,threadPitch,tipLength,tipDiameter,productLink,jobCode,
 *   pricePaid
 *
 * G-Wizard stores numerics with literal "NaN" for unset — the parser coerces to undefined.
 *
 * @module engines/GWizardAdapterEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-12
 * @author oscar (slot:oscar, 2026-05-26)
 */

import { readFileSync, statSync, existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { z } from "zod";

// ============================================================================
// SCHEMA — INPUT
// ============================================================================

export const GWizardReadInputSchema = z.object({
  /** Override the toolcrib.csv path (tests, alternate install). */
  toolcrib_path: z.string().optional(),
});

export type GWizardReadInput = z.infer<typeof GWizardReadInputSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface GWizardTool {
  key: number;
  tabname: string;
  guid: string;
  slot: number;
  description: string;
  tool: string; // tool-class string, e.g. "HSS Endmill"
  geometry: string;
  flutes?: number;
  diameter?: number;
  stickout?: number;
  cutLength?: number;
  overallLength?: number;
  shankSize?: number;
  noseRad?: number;
  helixAngle?: number;
  coating?: string;
  toolmaterial?: string;
  toolFamily?: string;
  vendor?: string;
  product?: string;
  /** G-Wizard's proven surface speed (ft/min). */
  sfm?: number;
  /** G-Wizard's proven feed per tooth. */
  ipt?: number;
  chipload?: number;
  /** When true, sfm/ipt are MANUFACTURER values rather than G-Wizard computed. */
  useMfgSFM?: boolean;
  mfgSFM?: number;
  useMfgIPT?: boolean;
  mfgIPT?: number;
  units: "inches" | "mm" | "unknown";
  holderType?: string;
  holderDesc?: string;
  comment?: string;
  status?: string;
  quantity?: number;
}

export interface GWizardState {
  tools: GWizardTool[];
  source_path: string;
  source_mtime_ms: number;
  /** Approximate row count parsed from the CSV — includes any that failed validation. */
  rows_seen: number;
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class GWizardAdapterEngine {
  /**
   * Resolve the operator's G-Wizard AIR sandbox dir + read the toolcrib.
   *
   * @param raw GWizardReadInput — optional toolcrib_path override
   * @returns GWizardState — parsed tools + source metadata + warnings
   * @throws Error when the file cannot be found AND no override path was given.
   */
  read(raw: unknown): GWizardState {
    const input = GWizardReadInputSchema.parse(raw);

    const path = input.toolcrib_path ?? this.resolveToolcribPath();
    if (!path) {
      throw new Error(
        "G-Wizard toolcrib.csv not found. Searched %APPDATA% for GWizard.*/Local Store/toolcrib.csv. " +
          "Pass toolcrib_path to override, or install/configure G-Wizard first.",
      );
    }

    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to stat G-Wizard toolcrib at ${path}: ${msg}`);
    }

    let raw_text: string;
    try {
      raw_text = readFileSync(path, "utf8");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to read G-Wizard toolcrib at ${path}: ${msg}`);
    }

    return this.parseCsv(raw_text, {
      sourcePath: path,
      sourceMtimeMs: stat.mtimeMs,
    });
  }

  /**
   * Parse a G-Wizard toolcrib.csv payload (exposed for fixture-based tests).
   *
   * @param csv UTF-8-decoded CSV text. First line is header, subsequent lines are tools.
   * @param meta Source metadata.
   * @returns GWizardState
   */
  parseCsv(csv: string, meta: { sourcePath: string; sourceMtimeMs: number }): GWizardState {
    const warnings: string[] = [];
    const tools: GWizardTool[] = [];

    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      warnings.push("toolcrib.csv is empty");
      return { tools: [], source_path: meta.sourcePath, source_mtime_ms: meta.sourceMtimeMs, rows_seen: 0, warnings };
    }
    if (lines.length < 2) {
      warnings.push("toolcrib.csv has only a header — no tool rows to parse");
      return { tools: [], source_path: meta.sourcePath, source_mtime_ms: meta.sourceMtimeMs, rows_seen: 0, warnings };
    }

    const headers = splitCsvLine(lines[0]);
    const idx = new Map<string, number>();
    headers.forEach((h, i) => idx.set(h.trim(), i));

    let rowsSeen = 0;
    for (let i = 1; i < lines.length; i++) {
      rowsSeen++;
      const fields = splitCsvLine(lines[i]);
      // G-Wizard sometimes writes trailing rows with fewer columns than the header; tolerate by reading what's present.
      if (fields.length === 0) continue;

      const get = (col: string): string | undefined => {
        const j = idx.get(col);
        if (j === undefined) return undefined;
        const v = fields[j];
        return v === undefined ? undefined : v.trim();
      };

      // Required-ish: guid + key. Without these, row is unusable.
      const guid = get("guid");
      const keyStr = get("key");
      if (!guid || !keyStr) {
        warnings.push(`row ${i + 1}: missing guid/key — skipped`);
        continue;
      }

      const unitsRaw = (get("units") ?? "").toLowerCase();
      const units: GWizardTool["units"] =
        unitsRaw === "inches" || unitsRaw === "inch" ? "inches" : unitsRaw === "mm" ? "mm" : "unknown";

      tools.push({
        key: parseNumOrZero(keyStr),
        tabname: get("tabname") ?? "",
        guid,
        slot: parseNumOrZero(get("slot")),
        description: get("description") ?? "",
        tool: get("tool") ?? "",
        geometry: get("geometry") ?? "",
        flutes: parseNumOpt(get("flutes")),
        diameter: parseNumOpt(get("diameter")),
        stickout: parseNumOpt(get("stickout")),
        cutLength: parseNumOpt(get("cutLength")),
        overallLength: parseNumOpt(get("overallLength")),
        shankSize: parseNumOpt(get("shankSize")),
        noseRad: parseNumOpt(get("noseRad")),
        helixAngle: parseNumOpt(get("helixAngle")),
        coating: parseStrOpt(get("coating")),
        toolmaterial: parseStrOpt(get("toolmaterial")),
        toolFamily: parseStrOpt(get("toolFamily")),
        vendor: parseStrOpt(get("vendor")),
        product: parseStrOpt(get("product")),
        sfm: parseNumOpt(get("sfm")),
        ipt: parseNumOpt(get("ipt")),
        chipload: parseNumOpt(get("chipload")),
        useMfgSFM: parseBoolOpt(get("useMfgSFM")),
        mfgSFM: parseNumOpt(get("mfgSFM")),
        useMfgIPT: parseBoolOpt(get("useMfgIPT")),
        mfgIPT: parseNumOpt(get("mfgIPT")),
        units,
        holderType: parseStrOpt(get("holderType")),
        holderDesc: parseStrOpt(get("holderDesc")),
        comment: parseStrOpt(get("comment")),
        status: parseStrOpt(get("status")),
        quantity: parseNumOpt(get("quantity")),
      });
    }

    return {
      tools,
      source_path: meta.sourcePath,
      source_mtime_ms: meta.sourceMtimeMs,
      rows_seen: rowsSeen,
      warnings,
    };
  }

  /**
   * Scan %APPDATA%/Roaming for `GWizard.*` AIR sandboxes and return the most-recently-
   * touched `<sandbox>/Local Store/toolcrib.csv` path. Returns undefined when none exists.
   */
  resolveToolcribPath(): string | undefined {
    const envOverride = process.env["PRISM_GWIZARD_TOOLCRIB_PATH"];
    if (envOverride) return envOverride;

    const appData = process.env["APPDATA"] ?? join(homedir(), "AppData", "Roaming");
    let entries: string[];
    try {
      entries = readdirSync(appData);
    } catch {
      return undefined;
    }
    const candidates = entries.filter((e) => e.startsWith("GWizard."));
    if (candidates.length === 0) return undefined;

    let bestPath: string | undefined;
    let bestMtime = 0;
    for (const c of candidates) {
      const candidate = join(appData, c, "Local Store", "toolcrib.csv");
      if (!existsSync(candidate)) continue;
      let m: number;
      try {
        m = statSync(candidate).mtimeMs;
      } catch {
        continue;
      }
      if (m > bestMtime) {
        bestMtime = m;
        bestPath = candidate;
      }
    }
    return bestPath;
  }
}

// ============================================================================
// CSV PARSING HELPERS
// ============================================================================

/**
 * Split one CSV line respecting double-quoted fields with embedded commas.
 * G-Wizard rarely escapes quotes in toolcrib.csv but we support the standard `""` escape
 * just in case.
 */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

function parseNumOpt(v: string | undefined): number | undefined {
  if (v === undefined || v === "" || v === "NaN") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseNumOrZero(v: string | undefined): number {
  const n = parseNumOpt(v);
  return n ?? 0;
}

function parseStrOpt(v: string | undefined): string | undefined {
  if (v === undefined || v === "" || v === " ") return undefined;
  return v;
}

function parseBoolOpt(v: string | undefined): boolean | undefined {
  if (v === undefined || v === "") return undefined;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const gWizardAdapterEngine = new GWizardAdapterEngine();
