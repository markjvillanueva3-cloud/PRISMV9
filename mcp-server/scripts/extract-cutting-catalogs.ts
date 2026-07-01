/**
 * Cutting Catalog Extractor
 *
 * Specialized extraction for manufacturer cutting data catalogs.
 * Targets: Sandvik GC catalogs, EMUGE, Korloy, OSG — structured speed/feed tables.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// ============================================================================
// TYPES
// ============================================================================

interface CuttingDataEntry {
  source: string;
  manufacturer: string;
  material_group: string;      // P, M, K, N, S, H (ISO groups)
  material_name?: string;
  operation: string;           // turning, milling, drilling, threading
  tool_type?: string;
  insert_grade?: string;
  speed_vc_m_min?: number;
  speed_vc_sfm?: number;
  feed_fn_mm_rev?: number;
  feed_fz_mm_tooth?: number;
  depth_ap_mm?: number;
  width_ae_mm?: number;
  coolant?: string;
  notes?: string;
  context: string;             // surrounding text for validation
}

interface CatalogExtraction {
  catalog_name: string;
  manufacturer: string;
  extracted_at: string;
  page_count: number;
  text_length: number;
  entries: CuttingDataEntry[];
  raw_tables: string[];        // Raw table-like text blocks
  warnings: string[];
}

// ============================================================================
// MANUFACTURER-SPECIFIC PATTERNS
// ============================================================================

// ISO Material Groups
const MATERIAL_PATTERNS = {
  P: /\b(P\d{2}|steel|carbon steel|alloy steel|cast steel)\b/gi,
  M: /\b(M\d{2}|stainless|austenitic|duplex|ferritic)\b/gi,
  K: /\b(K\d{2}|cast iron|grey iron|ductile iron|malleable)\b/gi,
  N: /\b(N\d{2}|aluminum|non-ferrous|copper|brass|bronze)\b/gi,
  S: /\b(S\d{2}|super\s*alloy|titanium|inconel|hastelloy|nickel alloy)\b/gi,
  H: /\b(H\d{2}|hardened|hard steel|>45\s*HRC|chilled)\b/gi,
};

// Sandvik-specific patterns (GC catalogs use consistent formatting)
const SANDVIK_PATTERNS = {
  vc_table: /vc\s*[=:]\s*(\d+[\-–]\d+|\d+)\s*(m\/min|sfm)/gi,
  fn_table: /f[nz]?\s*[=:]\s*([\d.,]+[\-–][\d.,]+|[\d.,]+)\s*(mm\/rev|mm\/tooth|ipr|ipt)/gi,
  ap_table: /ap\s*[=:]\s*([\d.,]+[\-–][\d.,]+|[\d.,]+)\s*mm/gi,
  grade: /\b(GC\d{4}|GC\s*\d{4})\b/gi,
  insert: /\b([A-Z]{4}\d{6})\b/g,  // CNMG120408 etc.
};

// Generic cutting data table patterns
const TABLE_PATTERNS = {
  // "Steel P10-P20: Vc 150-250 m/min, f 0.15-0.30 mm/rev"
  inline_data: /([PMKNSH]\d{2}[\-–][PMKNSH]?\d{2}|[PMKNSH]\d{2})[:\s]*(vc|v|speed)\s*[=:]?\s*(\d+[\-–]?\d*)\s*(m\/min|sfm)?,?\s*(f|fn|fz|feed)\s*[=:]?\s*([\d.,]+[\-–]?[\d.,]*)\s*(mm\/rev|mm\/tooth)?/gi,

  // Tabular data with columns
  tabular_row: /^\s*([A-Za-z\s]+)\s+(\d+[\-–]\d+)\s+([\d.,]+[\-–][\d.,]+)\s+([\d.,]+[\-–][\d.,]+)/gm,

  // Speed ranges
  speed_range: /(\d{2,4})\s*[\-–]\s*(\d{2,4})\s*(m\/min|sfm|rpm)/gi,

  // Feed ranges
  feed_range: /([\d.,]+)\s*[\-–]\s*([\d.,]+)\s*(mm\/rev|mm\/tooth|mm\/z|ipr|ipt)/gi,
};

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

function identifyManufacturer(filename: string, text: string): string {
  const fn = filename.toLowerCase();
  const txt = text.slice(0, 10000).toLowerCase();

  if (fn.includes("gc_") || txt.includes("sandvik coromant")) return "Sandvik";
  if (fn.includes("korloy") || txt.includes("korloy")) return "Korloy";
  if (fn.includes("emuge") || txt.includes("emuge")) return "EMUGE";
  if (fn.includes("osg") || txt.includes("osg corporation")) return "OSG";
  if (fn.includes("kennametal") || txt.includes("kennametal")) return "Kennametal";
  if (fn.includes("iscar") || txt.includes("iscar")) return "Iscar";
  if (fn.includes("yg") || txt.includes("yg-1")) return "YG-1";
  if (fn.includes("guhring") || txt.includes("gühring")) return "Guhring";
  if (fn.includes("sgs") || txt.includes("sgs tool")) return "SGS";
  if (fn.includes("ma_ford") || txt.includes("m.a. ford")) return "MA Ford";

  return "Unknown";
}

function identifyOperation(filename: string, text: string): string {
  const fn = filename.toLowerCase();
  const txt = text.slice(0, 20000).toLowerCase();

  const counts = {
    turning: (txt.match(/turning|lathe|cnc turn/g) || []).length,
    milling: (txt.match(/milling|end mill|face mill|ball nose/g) || []).length,
    drilling: (txt.match(/drilling|drill|bore|tap/g) || []).length,
    threading: (txt.match(/thread|tap|die/g) || []).length,
    grooving: (txt.match(/groov|parting|cut-off/g) || []).length,
  };

  // Check filename hints
  if (fn.includes("turn")) return "turning";
  if (fn.includes("mill")) return "milling";
  if (fn.includes("drill")) return "drilling";
  if (fn.includes("thread")) return "threading";

  // Return highest count
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 5 ? sorted[0][0] : "general";
}

function extractCuttingData(text: string, manufacturer: string, operation: string, source: string): CuttingDataEntry[] {
  const entries: CuttingDataEntry[] = [];
  const lines = text.split("\n");

  // Look for lines with cutting data patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(" ");

    // Pattern 1: ISO material group + speed/feed in same line
    const inlineMatch = line.match(/([PMKNSH])\s*(\d{1,2})?\s*[:\-–]?\s*(\d{2,4})\s*(m\/min|sfm)/i);
    if (inlineMatch) {
      const entry: CuttingDataEntry = {
        source,
        manufacturer,
        material_group: inlineMatch[1].toUpperCase(),
        operation,
        context: context.slice(0, 400),
      };

      // Extract speed
      entry.speed_vc_m_min = parseInt(inlineMatch[3]);
      if (inlineMatch[4]?.toLowerCase() === "sfm") {
        entry.speed_vc_sfm = entry.speed_vc_m_min;
        entry.speed_vc_m_min = Math.round(entry.speed_vc_sfm * 0.3048);
      }

      // Look for feed in same line or nearby
      const feedMatch = context.match(/([\d.,]+)\s*(mm\/rev|mm\/tooth|mm\/z)/i);
      if (feedMatch) {
        const feedVal = parseFloat(feedMatch[1].replace(",", "."));
        if (feedMatch[2].includes("tooth") || feedMatch[2].includes("/z")) {
          entry.feed_fz_mm_tooth = feedVal;
        } else {
          entry.feed_fn_mm_rev = feedVal;
        }
      }

      entries.push(entry);
    }

    // Pattern 2: Sandvik grade + cutting data
    const gradeMatch = line.match(/GC\s*(\d{4})/);
    if (gradeMatch && (line.includes("m/min") || line.includes("mm/rev"))) {
      const entry: CuttingDataEntry = {
        source,
        manufacturer: "Sandvik",
        material_group: "P", // Default, will be overridden if found
        operation,
        insert_grade: `GC${gradeMatch[1]}`,
        context: context.slice(0, 400),
      };

      // Extract material group from context
      for (const [group, pattern] of Object.entries(MATERIAL_PATTERNS)) {
        if (pattern.test(context)) {
          entry.material_group = group;
          break;
        }
      }

      // Speed
      const vcMatch = context.match(/(\d{2,4})\s*(m\/min|sfm)/i);
      if (vcMatch) {
        entry.speed_vc_m_min = parseInt(vcMatch[1]);
      }

      // Feed
      const fnMatch = context.match(/([\d.,]+)\s*(mm\/rev|mm\/tooth)/i);
      if (fnMatch) {
        entry.feed_fn_mm_rev = parseFloat(fnMatch[1].replace(",", "."));
      }

      entries.push(entry);
    }

    // Pattern 3: Pure numeric tables (common in catalogs)
    // "250  0.25  2.0" where columns are Vc, fn, ap
    const numericMatch = line.match(/^\s*(\d{2,4})\s+([\d.,]+)\s+([\d.,]+)\s*$/);
    if (numericMatch) {
      const vc = parseInt(numericMatch[1]);
      const fn = parseFloat(numericMatch[2].replace(",", "."));
      const ap = parseFloat(numericMatch[3].replace(",", "."));

      // Validate reasonable ranges
      if (vc >= 20 && vc <= 1000 && fn >= 0.01 && fn <= 2.0 && ap >= 0.1 && ap <= 20) {
        // Look for material context in nearby lines
        let materialGroup = "P";
        for (let j = Math.max(0, i - 10); j < i; j++) {
          for (const [group, pattern] of Object.entries(MATERIAL_PATTERNS)) {
            if (pattern.test(lines[j])) {
              materialGroup = group;
              break;
            }
          }
        }

        entries.push({
          source,
          manufacturer,
          material_group: materialGroup,
          operation,
          speed_vc_m_min: vc,
          feed_fn_mm_rev: fn,
          depth_ap_mm: ap,
          context: context.slice(0, 400),
        });
      }
    }
  }

  // Deduplicate
  const unique = entries.filter((e, i, arr) =>
    arr.findIndex(x =>
      x.material_group === e.material_group &&
      x.speed_vc_m_min === e.speed_vc_m_min &&
      x.feed_fn_mm_rev === e.feed_fn_mm_rev
    ) === i
  );

  return unique.slice(0, 500); // Limit per catalog
}

function extractRawTables(text: string): string[] {
  const tables: string[] = [];
  const lines = text.split("\n");

  // Look for table-like structures
  let tableStart = -1;
  let tableLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect table headers
    if (line.match(/Material|Speed|Feed|Vc|fn|ap|Grade|Insert/i) &&
        line.match(/\t|  {2,}/)) {
      if (tableStart === -1) tableStart = i;
      tableLines.push(line);
    } else if (tableStart !== -1) {
      // Check if line continues table (has numeric data with spacing)
      if (line.match(/^\s*[\d.,]+\s+[\d.,]+/) || line.match(/^\s*[PMKNSH]/)) {
        tableLines.push(line);
      } else {
        // End of table
        if (tableLines.length >= 3) {
          tables.push(tableLines.join("\n"));
        }
        tableStart = -1;
        tableLines = [];
      }
    }
  }

  return tables.slice(0, 20); // Limit raw tables
}

async function extractCatalog(filePath: string): Promise<CatalogExtraction> {
  const filename = basename(filePath);
  const warnings: string[] = [];

  console.log(`  Reading ${filename}...`);

  try {
    const buffer = readFileSync(filePath);
    const sizeMB = buffer.length / 1024 / 1024;

    // Skip files > 100MB (too large for practical extraction)
    if (sizeMB > 100) {
      warnings.push(`Skipped: file too large (${sizeMB.toFixed(0)}MB)`);
      return {
        catalog_name: filename,
        manufacturer: identifyManufacturer(filename, ""),
        extracted_at: new Date().toISOString(),
        page_count: 0,
        text_length: 0,
        entries: [],
        raw_tables: [],
        warnings,
      };
    }

    console.log(`  Parsing (${sizeMB.toFixed(1)}MB)...`);

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy?.();

    const text = typeof result === "string" ? result : (result?.text || "");
    const pageCount = typeof result === "object" ? (result.total || 0) : 0;

    const manufacturer = identifyManufacturer(filename, text);
    const operation = identifyOperation(filename, text);

    console.log(`  Manufacturer: ${manufacturer}, Operation: ${operation}`);
    console.log(`  Extracting cutting data...`);

    const entries = extractCuttingData(text, manufacturer, operation, filename);
    const rawTables = extractRawTables(text);

    return {
      catalog_name: filename,
      manufacturer,
      extracted_at: new Date().toISOString(),
      page_count: pageCount,
      text_length: text.length,
      entries,
      raw_tables: rawTables,
      warnings,
    };
  } catch (error) {
    warnings.push(`Extraction failed: ${error}`);
    return {
      catalog_name: filename,
      manufacturer: "Unknown",
      extracted_at: new Date().toISOString(),
      page_count: 0,
      text_length: 0,
      entries: [],
      raw_tables: [],
      warnings,
    };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("=== PRISM Cutting Catalog Extraction ===\n");

  const OUTPUT_DIR = "H:/prism/mcp-server/data/extracted-knowledge/catalogs";
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Priority catalogs (Sandvik GC series have best structured data)
  const catalogs = [
    "H:/prism/Resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Turning-Grooving.pdf",
    "H:/prism/Resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Milling.pdf",
    "H:/prism/Resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Drilling.pdf",
    "H:/prism/Resources/MANUFACTURER_CATALOGS/uploaded/korloy turning.pdf",
    "H:/prism/Resources/MANUFACTURER_CATALOGS/uploaded/korloy solid.pdf",
    "H:/prism/Resources/MANUFACTURER_CATALOGS/uploaded/SGS_Global_Catalog_v26.1.pdf",
  ].filter(existsSync);

  console.log(`Processing ${catalogs.length} priority catalogs\n`);

  const results: CatalogExtraction[] = [];
  let totalEntries = 0;

  for (let i = 0; i < catalogs.length; i++) {
    const path = catalogs[i];
    console.log(`[${i + 1}/${catalogs.length}] ${basename(path)}`);

    try {
      const result = await extractCatalog(path);
      results.push(result);
      totalEntries += result.entries.length;
      console.log(`  -> ${result.entries.length} cutting data entries\n`);
    } catch (error) {
      console.log(`  -> Error: ${error}\n`);
    }
  }

  // Save results
  const outputPath = join(OUTPUT_DIR, `catalog-extraction-${Date.now()}.json`);
  const summary = {
    extracted_at: new Date().toISOString(),
    catalogs_processed: results.length,
    total_entries: totalEntries,
    by_manufacturer: {} as Record<string, number>,
    by_operation: {} as Record<string, number>,
    by_material_group: {} as Record<string, number>,
    results,
  };

  // Aggregate stats
  for (const r of results) {
    summary.by_manufacturer[r.manufacturer] = (summary.by_manufacturer[r.manufacturer] || 0) + r.entries.length;
    for (const e of r.entries) {
      summary.by_operation[e.operation] = (summary.by_operation[e.operation] || 0) + 1;
      summary.by_material_group[e.material_group] = (summary.by_material_group[e.material_group] || 0) + 1;
    }
  }

  writeFileSync(outputPath, JSON.stringify(summary, null, 2));

  // Report
  console.log("=== Extraction Summary ===");
  console.log(`Catalogs: ${results.length}`);
  console.log(`Cutting entries: ${totalEntries}`);
  console.log(`\nBy manufacturer:`);
  for (const [mfr, count] of Object.entries(summary.by_manufacturer).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${mfr}: ${count}`);
  }
  console.log(`\nBy operation:`);
  for (const [op, count] of Object.entries(summary.by_operation).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${op}: ${count}`);
  }
  console.log(`\nBy material group:`);
  for (const [grp, count] of Object.entries(summary.by_material_group).sort((a, b) => b[1] - a[1])) {
    console.log(`  ISO ${grp}: ${count}`);
  }
  console.log(`\nOutput: ${outputPath}`);
}

main().catch(console.error);
