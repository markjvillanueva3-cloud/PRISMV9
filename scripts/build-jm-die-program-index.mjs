#!/usr/bin/env node
/**
 * build-jm-die-program-index.mjs
 *
 * Walks the full H:/PRISM/JM DIE/ tree and emits a program/CAD-file
 * inventory in a schema BlueprintProgramJoinEngine.indexProgramsFromLabels
 * already consumes ({ labels: [{ filePath, fileName, customer,
 * machineCategory, controllerFamily, materialHint }] }).
 *
 * Existing program-labels.json is lathe-only (~100 entries from CNC LATHE
 * subset); the BlueprintProgramJoin run on real Phase 8 output bottlenecked
 * at 99.5% miss because the program corpus was 100 files vs 5391 unique
 * blueprint part numbers. This index is the corpus-side fix.
 *
 * Output: H:/prism/mcp-server/data/state/jm-die-full-program-index.json
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = "H:/PRISM/JM DIE";
const OUT = "H:/prism/mcp-server/data/state/jm-die-full-program-index.json";

const PROGRAM_EXTENSIONS = new Set([
  ".min", ".nc", ".ncm", ".nct", ".ncc",
  ".tap", ".eia", ".cnc", ".h", ".hnc",
  ".mpf", ".spf", ".pim", ".ei4",
  ".mcx", ".mcx-8", ".emcx-8", ".emcam",
]);

const CAD_EXTENSIONS = new Set([
  ".step", ".stp", ".iges", ".igs",
  ".sldprt", ".sldasm",
  ".ipt", ".iam", ".idw",
  ".f3d", ".f3z",
  ".prt", ".asm",
  ".catpart", ".catproduct",
  ".x_t", ".x_b",
  ".dxf", ".dwg",
  ".stl",
]);

const FOLDER_TO_MACHINE = {
  "CNC LATHE": "lathe",
  "LATHE": "lathe",
  "OKUMA": "lathe",
  "CNC OKUMA MULTUS": "mill_turn",
  "CNC MILL HAAS": "mill",
  "HAAS-HURCO": "mill",
  "ROKU-ROKU": "mill",
  "WIRE EDM": "wire_edm",
  "BASEBALL PARTS": "lathe",
  "GENERAL BANDAGES": "mill",
  "JM DIE COMPANY": "mill",
  "MATTHEW programs": "mill",
  "PRISM CAD TESTING": "mill",
  "QUEUE": "unknown",
  "REVERSE ENGINEERING": "unknown",
  "SETUPS": "unknown",
};

const FOLDER_TO_CONTROLLER = {
  "CNC LATHE": "OSP-U10/P-series",
  "LATHE": "OSP-U10/P-series",
  "OKUMA": "OSP-U10/P-series",
  "CNC OKUMA MULTUS": "OSP-P200/P300",
  "CNC MILL HAAS": "Haas-NGC",
  "HAAS-HURCO": "Haas-NGC",
  "ROKU-ROKU": "Fanuc",
  "WIRE EDM": "Mitsubishi",
};

const MATERIAL_RE =
  /-(?:D2|A2|S7|H13|O1|M2|HSS|4140|4340|6061|7075|2024|17-?4|303|304|316|410|420|440[CB]?)\b/i;

function classifyFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (PROGRAM_EXTENSIONS.has(ext)) return { kind: "program", ext };
  if (CAD_EXTENSIONS.has(ext)) return { kind: "cad", ext };
  return null;
}

function deriveCustomer(rel, topFolder) {
  // Path under JM DIE → split by sep; first segment after top folder is
  // typically the customer ("CNC LATHE/ALCOA/L-2845-D2.MIN" → "ALCOA")
  const parts = rel.split(path.sep);
  if (parts.length >= 3) return parts[1];
  if (parts.length === 2) return topFolder; // shallow files
  return "UNKNOWN";
}

function deriveMaterialHint(fileName) {
  const m = fileName.match(MATERIAL_RE);
  return m ? m[0].slice(1) : undefined;
}

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`[build-jm-die-index] ROOT not found: ${ROOT}`);
    process.exit(1);
  }

  const t0 = Date.now();
  const labels = [];
  const stats = {
    totalScanned: 0,
    programs: 0,
    cad: 0,
    skipped: 0,
    byExtension: {},
    byMachineCategory: {},
    byCustomer: {},
  };

  for (const filePath of walk(ROOT)) {
    stats.totalScanned++;
    const cls = classifyFile(filePath);
    if (!cls) {
      stats.skipped++;
      continue;
    }
    const rel = path.relative(ROOT, filePath);
    const parts = rel.split(path.sep);
    const topFolder = parts[0] ?? "UNKNOWN";
    const customer = deriveCustomer(rel, topFolder);
    const machineCategory =
      FOLDER_TO_MACHINE[topFolder] ?? (cls.kind === "cad" ? "cad" : "unknown");
    const controllerFamily = FOLDER_TO_CONTROLLER[topFolder];
    const fileName = path.basename(filePath);
    const materialHint = deriveMaterialHint(fileName);

    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(filePath).size;
    } catch {
      /* skip stat errors */
    }

    labels.push({
      filePath,
      fileName,
      customer,
      machineCategory,
      controllerFamily,
      materialHint,
      kind: cls.kind,
      ext: cls.ext,
      sizeBytes,
      topFolder,
    });

    if (cls.kind === "program") stats.programs++;
    else stats.cad++;
    stats.byExtension[cls.ext] = (stats.byExtension[cls.ext] ?? 0) + 1;
    stats.byMachineCategory[machineCategory] =
      (stats.byMachineCategory[machineCategory] ?? 0) + 1;
    stats.byCustomer[customer] = (stats.byCustomer[customer] ?? 0) + 1;
  }

  const top10 = Object.entries(stats.byCustomer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([customer, count]) => ({ customer, count }));

  const out = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    rootPath: ROOT,
    stats: {
      totalFiles: labels.length,
      totalScanned: stats.totalScanned,
      skipped: stats.skipped,
      programs: stats.programs,
      cadFiles: stats.cad,
      byExtension: stats.byExtension,
      byMachineCategory: stats.byMachineCategory,
      topCustomers: top10,
    },
    labels,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf-8");
  const dt = Date.now() - t0;
  console.log(`[build-jm-die-index] scanned=${stats.totalScanned} programs=${stats.programs} cad=${stats.cad} skipped=${stats.skipped} in ${dt}ms`);
  console.log(`[build-jm-die-index] top customers: ${top10.slice(0, 5).map((c) => `${c.customer}(${c.count})`).join(", ")}`);
  console.log(`[build-jm-die-index] wrote ${OUT}`);
}

main();
