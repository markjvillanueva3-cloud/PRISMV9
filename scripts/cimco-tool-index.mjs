// cimco-tool-index.mjs — index CIMCO tool libraries (.tmlib).
//
// Completes the CIMCO inventory triad (machines / posts / TOOLS). Feeds juliett (DB ingest)
// + kilo (map .tmlib cutters ↔ PRISM tool registry). Tolerant regex XML extraction (no dep).
//
// Source: H:/prism/resources/cimco-2026/CIMCOEdit/ToolLibs/**/*.tmlib (verified XML 2026-06-02).
// Format: <Library Version="N"><Cutter Type="X"><Parameter Type="P">value</Parameter>...</Cutter>
// Output: state/shared/cimco/tool-index.json (schema-versioned).
//
// Wiki: [[cimco-verification-simulation-integration]] · Memory: reference_cimco_install_corpus_2026_06_02

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export const DEFAULT_TOOLLIBS = "H:/prism/resources/cimco-2026/CIMCOEdit/ToolLibs";
export const DEFAULT_OUT = "H:/prism/state/shared/cimco/tool-index.json";

// Curated fields lifted from each <Cutter> (the ones PRISM's tool registry cares about).
const CURATED = {
  itemNumber: "ItemNumber",
  description: "Description",
  unitSystem: "ItemUnitSystem", // "Imperial" | "Metric" — units-first
  fluteDiameter: "FluteDiameter",
  shaftDiameter: "ShaftDiameter",
  bodyLength: "BodyLength",
  fluteLength: "FluteLength",
  tipAngle: "TipAngle",
};

function walk(dir, ext) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir, { recursive: true })
      .map((n) => String(n).replace(/\\/g, "/"))
      .filter((rel) => rel.toLowerCase().endsWith(ext));
  } catch {
    return [];
  }
}

const _num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : v; // keep non-numeric strings (e.g. Description) as-is
};

/** Parse one .tmlib XML into a structured tool list (tolerant regex — not a full XML parser). */
export function parseTmlib(text) {
  const libVer = (text.match(/<Library\s+Version="([^"]+)"/) || [])[1] || null;
  const tools = [];
  for (const cm of text.matchAll(/<Cutter\s+Type="([^"]+)">([\s\S]*?)<\/Cutter>/g)) {
    const type = cm[1];
    const body = cm[2];
    const params = {};
    for (const pm of body.matchAll(/<Parameter\s+Type="([^"]+)">([\s\S]*?)<\/Parameter>/g)) {
      params[pm[1]] = pm[2].trim();
    }
    const tool = { type };
    for (const [k, src] of Object.entries(CURATED)) tool[k] = _num(params[src] ?? null);
    tools.push(tool);
  }
  return { libraryVersion: libVer, cutterCount: tools.length, tools };
}

/** Build the tool-library index across every .tmlib. */
export function buildToolIndex(toolLibsDir = DEFAULT_TOOLLIBS) {
  const files = walk(toolLibsDir, ".tmlib");
  const libraries = [];
  const errors = [];
  const byType = {};
  const byUnitSystem = {};
  let totalCutters = 0;
  const unitsUnresolved = [];

  for (const rel of files.sort()) {
    try {
      const parsed = parseTmlib(readFileSync(`${toolLibsDir}/${rel}`, "utf8"));
      const types = {};
      const units = {};
      for (const t of parsed.tools) {
        types[t.type] = (types[t.type] || 0) + 1;
        const u = t.unitSystem || "unknown";
        units[u] = (units[u] || 0) + 1;
        byType[t.type] = (byType[t.type] || 0) + 1;
        byUnitSystem[u] = (byUnitSystem[u] || 0) + 1;
        totalCutters++;
      }
      const fileUnresolved = parsed.tools.filter((t) => !t.unitSystem).length;
      if (fileUnresolved > 0) unitsUnresolved.push({ file: rel, count: fileUnresolved });
      libraries.push({
        file: rel,
        libraryVersion: parsed.libraryVersion,
        cutterCount: parsed.cutterCount,
        byType: types,
        byUnitSystem: units,
        tools: parsed.tools,
      });
    } catch (e) {
      errors.push({ file: rel, error: e.message });
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedFrom: toolLibsDir,
    libraryCount: libraries.length,
    totalCutters,
    errorCount: errors.length,
    byType,
    byUnitSystem,
    unitsUnresolved,
    libraries,
    errors,
  };
}

export function writeToolIndex(outPath = DEFAULT_OUT, toolLibsDir = DEFAULT_TOOLLIBS) {
  const idx = buildToolIndex(toolLibsDir);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(idx, null, 2) + "\n");
  return { outPath, libraryCount: idx.libraryCount, totalCutters: idx.totalCutters, errorCount: idx.errorCount, byUnitSystem: idx.byUnitSystem };
}

// ─── CLI (argv-guarded) ──────────────────────────────────────────────────────
function _main(argv) {
  let out = DEFAULT_OUT, lib = DEFAULT_TOOLLIBS;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--toollibs") lib = argv[++i];
  }
  try {
    process.stdout.write(JSON.stringify(writeToolIndex(out, lib)) + "\n");
    return 0;
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    return 1;
  }
}

const _argv1 = process.argv[1];
if (_argv1 && (_argv1.endsWith("cimco-tool-index.mjs") || _argv1.endsWith("cimco-tool-index"))) {
  process.exit(_main(process.argv.slice(2)));
}
