#!/usr/bin/env node
/**
 * generate-v11-pocket-db.mjs — CLI that reads a UserToolLibrary JSON
 * snapshot (+ optional crib-usage JSON) and emits the
 * `PRISM_TOOL_POCKET_DB` JS snippet ready to paste / inject into the
 * Hurco v11 .cps file. Closes the v10/v11 tool-pocket tedium without
 * touching the .cps emit chain.
 *
 * Examples:
 *   node scripts/generate-v11-pocket-db.mjs --tools <library.json>
 *   node scripts/generate-v11-pocket-db.mjs --tools tools.json --crib crib.json --machine HURCO_VM30i
 *   node scripts/generate-v11-pocket-db.mjs --tools tools.json --out state/shared/pocket-dbs/hurco.js
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-V11-AUTO-POCKET-FROM-LIBRARY
 * @slot echo · @iter 23 · @date 2026-05-26
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPocketDb, renderPocketDbAsJs } from "./lib/v11-pocket-resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i]);
    const eq = a.match(/^--([a-zA-Z][a-zA-Z0-9-]*)=(.*)$/);
    if (eq) { out[eq[1]] = eq[2]; continue; }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) { out[key] = true; }
      else { out[key] = next; i++; }
    }
  }
  return out;
}

function readJsonOrEmpty(p) {
  if (!p) return null;
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log("Usage: node scripts/generate-v11-pocket-db.mjs [options]");
    console.log("  --tools <library.json>   (required) UserToolLibrary tools array");
    console.log("  --crib <crib.json>       optional toolId→{total_usage_min,avg_life_min}");
    console.log("  --machine <name>         filter tools to one machine");
    console.log("  --out <path.js>          output file (default: stdout)");
    console.log("  --var <name>             JS var name (default PRISM_TOOL_POCKET_DB)");
    return 0;
  }
  const toolsPath = args.tools;
  if (!toolsPath) {
    console.error("FAIL-LOUD: --tools <library.json> required");
    return 2;
  }
  const rawTools = readJsonOrEmpty(toolsPath);
  if (!rawTools) {
    console.error(`FAIL-LOUD: cannot read tools JSON at ${toolsPath}`);
    return 2;
  }
  const tools = Array.isArray(rawTools) ? rawTools : (rawTools.tools || []);
  if (!Array.isArray(tools) || tools.length === 0) {
    console.error("FAIL-LOUD: tools input is empty");
    return 2;
  }

  const cribRaw = readJsonOrEmpty(args.crib);
  const cribByToolId = new Map();
  if (cribRaw && typeof cribRaw === "object") {
    for (const k of Object.keys(cribRaw)) cribByToolId.set(k, cribRaw[k] || {});
  }

  const { db, stats } = buildPocketDb(tools, {
    machine_name: args.machine || null,
    cribByToolId,
  });

  const jsBody = renderPocketDbAsJs(db, {
    varName: args.var || "PRISM_TOOL_POCKET_DB",
    machine_name: args.machine || null,
  });

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, jsBody + "\n");
    console.log(`wrote ${outPath}`);
  } else {
    process.stdout.write(jsBody + "\n");
  }
  console.error(`pocket-db stats: included=${stats.included} skippedNoMachine=${stats.skippedNoMachine} skippedNoPocket=${stats.skippedNoPocket} machineFilter=${stats.machineFilter || "(none)"}`);
  return 0;
}

process.exit(main());
