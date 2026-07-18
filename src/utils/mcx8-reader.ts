/**
 * MCX-8 Reader — Extract wire EDM metadata from Mastercam X8 project files
 *
 * MCX-8 is a proprietary binary format. This reader extracts:
 *   - Embedded text strings (machine name, post processor, wire type, material)
 *   - File references (NCI path, tech table, operations, defaults)
 *   - Machine configuration (auto-thread, taper mode, etc.)
 *   - Toolpath group names
 *
 * It does NOT parse geometry or toolpath data (that requires the full
 * Mastercam API / NETHook SDK which is not available).
 *
 * Usage:
 *   const metadata = readMcx8Metadata(buffer);
 *   // → { machine, post_processor, wire_type, material, tech_table, ... }
 */

export interface Mcx8Metadata {
  /** File size in bytes */
  file_size: number;
  /** Total readable strings extracted */
  string_count: number;
  /** Machine definition (e.g., "Mitsubishi FA/FX-Series (Tech)") */
  machine: string | null;
  /** Controller type derived from machine/post */
  controller: "mitsubishi" | "fanuc" | "sodick" | "makino" | "agiecharmilles" | "unknown";
  /** Post processor file (e.g., "MPW MITS FA-FX EDM(TECH).PST") */
  post_processor: string | null;
  /** Technology table file (e.g., "MC Machinery Mitsubishi MV-S [INCH].tech") */
  tech_table: string | null;
  /** Wire type (e.g., "hard brass") */
  wire_type: string | null;
  /** Material (e.g., "Steel") */
  material: string | null;
  /** NCI intermediate file path */
  nci_path: string | null;
  /** Toolpath group names */
  toolpath_groups: string[];
  /** Machine settings extracted from embedded post config */
  machine_settings: Record<string, string>;
  /** Units: "inch" or "mm" derived from file references */
  units: "inch" | "mm" | "unknown";
  /** All extracted file references */
  file_references: string[];
  /** All unique readable strings (for debugging) */
  all_strings: string[];
}

/**
 * Extract all readable ASCII strings from binary data (minimum 4 chars).
 */
function extractStrings(data: Buffer, minLength: number = 4): string[] {
  const strings: string[] = [];
  let current = "";

  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    if (b >= 32 && b <= 126) {
      current += String.fromCharCode(b);
    } else {
      if (current.length >= minLength) {
        strings.push(current);
      }
      current = "";
    }
  }
  if (current.length >= minLength) {
    strings.push(current);
  }
  return strings;
}

/**
 * Detect controller type from embedded strings.
 */
function detectController(strings: string[]): Mcx8Metadata["controller"] {
  const joined = strings.join(" ").toLowerCase();
  if (joined.includes("mitsubishi") || joined.includes("mits fa")) return "mitsubishi";
  if (joined.includes("fanuc") || joined.includes("mpwfanuc")) return "fanuc";
  if (joined.includes("sodick")) return "sodick";
  if (joined.includes("makino")) return "makino";
  if (joined.includes("agie") || joined.includes("charmilles")) return "agiecharmilles";
  return "unknown";
}

/**
 * Read metadata from an MCX-8 buffer.
 */
export function readMcx8Metadata(data: Buffer): Mcx8Metadata {
  const strings = extractStrings(data);

  // Machine name
  const machine =
    strings.find(s => s.includes("Mitsubishi FA") || s.includes("Generic Wire") || s.includes("Sodick") || s.includes("Makino")) ?? null;

  // Post processor
  const post_processor =
    strings.find(s => s.toLowerCase().endsWith(".pst") || s.includes("PST"))?.replace(/.*[\\\/]/, "") ?? null;

  // Technology table
  const tech_table =
    strings.find(s => s.toLowerCase().includes(".tech") && !s.includes("POWER"))?.replace(/.*[\\\/]/, "") ?? null;

  // Wire type
  const wire_type =
    strings.find(s => s.toLowerCase().includes("brass") || s.toLowerCase().includes("moly") || s.toLowerCase().includes("tungsten"))
    ?? null;

  // Material
  const material =
    strings.find(s =>
      /^(Steel|Aluminum|Copper|Brass|Carbide|Titanium|Inconel|Stainless)$/i.test(s.trim()) ||
      s.includes("D2") || s.includes("H13") || s.includes("A2")
    ) ?? null;

  // NCI path
  const nci_path =
    strings.find(s => s.toLowerCase().includes(".nci"))?.replace(/.*[\\\/]/, "") ?? null;

  // Toolpath groups
  const toolpath_groups = strings
    .filter(s => s.includes("Toolpath Group"))
    .filter((v, i, a) => a.indexOf(v) === i);

  // Machine settings from embedded post config
  const machine_settings: Record<string, string> = {};
  for (const s of strings) {
    const match = s.match(/^(\w+)\s*:\s*(\w+)\$\s*#(.+)$/);
    if (match) {
      machine_settings[match[1]] = `${match[2]} (${match[3].trim()})`;
    }
  }

  // Units detection
  const units: Mcx8Metadata["units"] =
    strings.some(s => s.includes("INCH") || s.includes("_Inch")) ? "inch" :
    strings.some(s => s.includes("_MM") || s.includes("_mm")) ? "mm" : "unknown";

  // File references
  const file_references = strings
    .filter(s => s.includes("\\") || s.includes("/") || s.includes("%MCAMDIR%"))
    .filter((v, i, a) => a.indexOf(v) === i);

  return {
    file_size: data.length,
    string_count: strings.length,
    machine,
    controller: detectController(strings),
    post_processor,
    tech_table,
    wire_type,
    material,
    nci_path,
    toolpath_groups,
    machine_settings,
    units,
    file_references,
    all_strings: strings.filter((v, i, a) => a.indexOf(v) === i),
  };
}

/**
 * Batch-read metadata from multiple MCX-8 files.
 * Returns array of { filename, metadata } objects.
 */
export function batchReadMcx8(filePaths: string[]): Array<{ filename: string; metadata: Mcx8Metadata }> {
  const fs = require("fs");
  const path = require("path");
  const results: Array<{ filename: string; metadata: Mcx8Metadata }> = [];

  for (const fp of filePaths) {
    try {
      const data = fs.readFileSync(fp);
      const metadata = readMcx8Metadata(data);
      results.push({ filename: path.basename(fp), metadata });
    } catch {
      // Skip unreadable files
    }
  }

  return results;
}
