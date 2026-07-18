#!/usr/bin/env node
// PRISM CAM Galaxy — ingest Fusion live-enum dumps into the catalog (slot:kilo)
//
// Reads one or more raw JSON dumps produced by
// scripts/cam-enumerators/fusion-cam-param-enumerator.py (run inside Fusion 360),
// normalizes each operation's parameters to the cam-functions schema, de-dups
// across dumps, and writes mcp-server/data/cam-functions/fusion360/_live-enum.json
// — a NEW file the CAMCatalogQueryEngine's glob-all walker picks up (the engine
// de-dups by (op,param) so this only ADDS coverage, never double-counts).
//
// GROUNDING DISCIPLINE (the one hard CAM "never"):
//   - `default` is set ONLY from the live API value (grounded by construction).
//   - min/max are NEVER fabricated. Fusion's API does not reliably expose ranges,
//     so a numeric param ships with `rangeSource:"not-exposed-by-fusion-api"` and
//     NO min/max — an unbounded-but-honest param, not an invented one.
//   - a param whose value was inaccessible in the dump ships `unverified:true`.
//   - `source` records the exact Fusion build string from the dump.
//
// USAGE:  node scripts/ingest-fusion-cam-enum.mjs <dump1.json> [dump2.json ...]
//         node scripts/ingest-fusion-cam-enum.mjs scripts/cam-enumerators/_raw/*.json
// After ingest: node scripts/cam-catalog-completeness-audit.mjs  (coverage should rise)

import fs from "node:fs";
import path from "node:path";

// ── pure helpers (unit-tested) ────────────────────────────────────────────

/** Fusion internal strategy id → catalog snake_case op id (traceable, not lossy). */
export function normalizeFusionStrategy(strategy) {
  if (!strategy || typeof strategy !== "string") return "unknown_operation";
  // camelCase / PascalCase → snake_case; collapse non-alnum to "_".
  return strategy
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

const VALUE_TYPE_MAP = {
  FloatCAMParameterValue: "float",
  IntegerCAMParameterValue: "integer",
  BooleanCAMParameterValue: "bool",
  StringCAMParameterValue: "string",
  ChoiceCAMParameterValue: "enum",
  CAMParameterValue: "unknown",
};

/** Parse a trailing unit token from a Fusion expression like "0.1 mm" / "15 deg". */
export function parseUnit(expression) {
  if (typeof expression !== "string") return undefined;
  const m = expression.trim().match(/[-+]?[\d.]+(?:e[-+]?\d+)?\s*([a-zA-Z%°/]+)\s*$/i);
  return m ? m[1] : undefined;
}

/** Raw add-in param → normalized catalog param. NEVER fabricates min/max. */
export function normalizeParam(raw, source) {
  const id = raw?.name;
  if (!id || typeof id !== "string") return null;
  const out = {
    id,
    name: id,
    label: raw.title ?? id,
    type: VALUE_TYPE_MAP[raw.valueType] ?? "unknown",
    source: source ?? "fusion360 live-enum",
  };
  if (Object.prototype.hasOwnProperty.call(raw, "value")) {
    out.default = raw.value;
  } else {
    // value object was inaccessible in the live dump → honestly flagged.
    out.unverified = true;
    out.note = raw.error ?? "value inaccessible in live dump";
  }
  if (raw.expression != null && raw.expression !== "") out.expression = raw.expression;
  const unit = parseUnit(raw.expression);
  if (unit) out.unit = unit;
  if (Array.isArray(raw.enumValues) && raw.enumValues.length) {
    out.enumValues = raw.enumValues.slice();
  } else if (out.type === "float" || out.type === "integer") {
    // numeric param with no API-exposed range — honest about the absence.
    out.rangeSource = "not-exposed-by-fusion-api";
  }
  return out;
}

/**
 * Merge raw dumps into the live-enum operations[] structure.
 * De-dups by (opId, paramId): first grounded value wins; a later dump only
 * fills a param that a prior dump left `unverified`.
 * @returns {{operations:Array, stats:{operations:number, params:number, unverified:number, dumps:number, sources:string[]}}}
 */
export function mergeFusionEnum(rawDumps) {
  const opMap = new Map(); // opId -> { id, fusionStrategy, names:Set, params: Map(paramId->param) }
  const sources = new Set();
  let dumps = 0;

  for (const dump of rawDumps) {
    if (!dump || !Array.isArray(dump.operations)) continue;
    dumps++;
    const source = dump.source ?? "fusion360 live-enum";
    sources.add(source);
    for (const op of dump.operations) {
      if (!op || op.error) continue;
      const opId = normalizeFusionStrategy(op.strategy);
      let rec = opMap.get(opId);
      if (!rec) {
        rec = { id: opId, fusionStrategy: op.strategy ?? null, names: new Set(), params: new Map() };
        opMap.set(opId, rec);
      }
      if (op.operationName) rec.names.add(op.operationName);
      for (const rawP of op.parameters ?? []) {
        const norm = normalizeParam(rawP, source);
        if (!norm) continue;
        const existing = rec.params.get(norm.id);
        if (!existing) {
          rec.params.set(norm.id, norm);
        } else if (existing.unverified && !norm.unverified) {
          // a later dump grounded a previously-inaccessible value → upgrade it.
          rec.params.set(norm.id, norm);
        }
      }
    }
  }

  const operations = [...opMap.values()].map((rec) => ({
    id: rec.id,
    fusionStrategy: rec.fusionStrategy,
    operationNames: [...rec.names],
    parameters: [...rec.params.values()],
  }));
  let params = 0;
  let unverified = 0;
  for (const o of operations) {
    params += o.parameters.length;
    unverified += o.parameters.filter((p) => p.unverified).length;
  }
  return {
    operations,
    stats: { operations: operations.length, params, unverified, dumps, sources: [...sources] },
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function main(argv) {
  const files = argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!files.length) {
    console.error("usage: node scripts/ingest-fusion-cam-enum.mjs <dump1.json> [dump2.json ...]");
    process.exit(2);
  }
  const dumps = [];
  for (const f of files) {
    try {
      dumps.push(JSON.parse(fs.readFileSync(f, "utf8")));
    } catch (e) {
      console.error(`SKIP unreadable dump ${f}: ${e.message}`);
    }
  }
  if (!dumps.length) {
    console.error("no readable dumps — nothing ingested");
    process.exit(1);
  }
  const { operations, stats } = mergeFusionEnum(dumps);
  if (!operations.length) {
    console.error("dumps contained 0 enumerable operations — nothing written");
    process.exit(1);
  }

  // Resolve the fusion360 catalog dir from this script's location (worktree-safe).
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");
  const outDir = path.join(repoRoot, "mcp-server", "data", "cam-functions", "fusion360");
  if (!fs.existsSync(outDir)) {
    console.error(`fusion360 catalog dir not found: ${outDir}`);
    process.exit(1);
  }
  const outFile = path.join(outDir, "_live-enum.json");

  const payload = {
    schemaVersion: 1,
    system_id: "fusion360",
    // NOTE: must be `module_id` (string), NOT `module` — the audit/engine unwrap
    // `json.section ?? json.module ?? json` treats a string `module` as the
    // container and bails, leaving `operations[]` unwalked (caught by E2E smoke).
    module_id: "live-enum",
    provenance: {
      source: "scripts/cam-enumerators/fusion-cam-param-enumerator.py",
      ingestedAt: new Date().toISOString(),
      sources: stats.sources,
      dumps: stats.dumps,
      note: "Live Fusion API enumeration. min/max NOT exposed by the API are omitted (rangeSource flag), never fabricated.",
    },
    operations,
  };
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 1), "utf8");
  console.log(
    `ingested ${stats.dumps} dump(s) → ${outFile}\n` +
      `  operations: ${stats.operations} · params: ${stats.params} · unverified: ${stats.unverified}\n` +
      `  sources: ${stats.sources.join(", ")}\n` +
      `Next: node scripts/cam-catalog-completeness-audit.mjs  (coverage should rise)`
  );
}

// Run as CLI only (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("ingest-fusion-cam-enum.mjs")) {
  main(process.argv);
}
