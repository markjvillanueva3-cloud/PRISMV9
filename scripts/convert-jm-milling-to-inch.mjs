#!/usr/bin/env node
// convert-jm-milling-to-inch.mjs -- convert the legacy combined brand-mill library
// (state/shared/jm-fusion-tools/jm-milling-tools.tools, placed as PRISM_JM_Milling.tools) from
// millimetres to inches for JM Die (an inch shop), AND sanitize its parse-artifact dimensions.
//
// WHY (slot:romeo, 2026-06-21): unlike the 19 per-brand Fusion libs (feed-less -> safe geometry-only
// convert), this lib carries FEED presets ({n: rpm, f_n: feed/rev}). Fusion stores feeds in the tool
// unit (verified: an inch crib's f_n is in/rev, f_z in/tooth, v_f IPM) -- so f_n must scale 1/25.4
// alongside the geometry, while n (rpm) is unit-independent. We REFUSE to convert if any preset carries
// a feed field whose unit we have not verified (f_z/v_c/v_f) -- a wrong feed is a scrap/tool-break risk.
//
// Pipeline per tool: sanitizeToolGeometryMm (null/repair garbage OAL/SFDM) -> convertToolMmToInch with
// a JM-specific convertPreset (f_n/25.4, n untouched). Idempotent (a tool already inches is skipped).
//
// Usage: node scripts/convert-jm-milling-to-inch.mjs [<file.tools>] [--apply]
//   (dry-run by default -- prints counts; --apply writes the converted file atomically in place.)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertToolMmToInch, sanitizeToolGeometryMm } from "./lib/tool-unit-convert.mjs";
import { OAL_MAX_MM, LCF_MAX_MM, SHANK_MAX_MM } from "./lib/brand-tool-catalog.mjs";

const DEFAULT_FILE = "state/shared/jm-fusion-tools/jm-milling-tools.tools";
const BOUNDS = { oalMax: OAL_MAX_MM, lcfMax: LCF_MAX_MM, shankMax: SHANK_MAX_MM };

// PRISM_JM_Milling presets are {guid, description, material, tool-coolant, n, f_n} (+ optional name).
// n = spindle rpm (unit-independent); f_n = feed-per-rev (mm/rev -> in/rev). Any OTHER numeric feed
// field (f_z, v_c, v_f, ...) has an un-verified unit semantics -> refuse rather than mis-scale.
const ALLOWED_PRESET_KEYS = new Set(["guid", "name", "description", "material", "tool-coolant", "n", "f_n"]);
export function convertJmMillingPreset(p) {
  const unexpected = Object.keys(p).filter((k) => !ALLOWED_PRESET_KEYS.has(k));
  if (unexpected.length) {
    throw new Error(`convert-jm-milling: unexpected preset field(s) ${unexpected.join(", ")} -- feed-unit conversion unverified, refusing`);
  }
  return typeof p.f_n === "number" && Number.isFinite(p.f_n) ? { ...p, f_n: +(p.f_n / 25.4).toFixed(6) } : { ...p };
}

/** Convert one tool: sanitize garbage geometry, then mm->inch (geometry + feeds). Returns
 *  {tool, sanitized:boolean, converted:boolean}. A tool already in inches is returned unchanged. */
export function convertJmMillingTool(tool) {
  if (tool?.unit === "inches") return { tool, sanitized: false, converted: false };
  const s = sanitizeToolGeometryMm(tool, BOUNDS);
  const converted = convertToolMmToInch(s.tool, { convertPreset: convertJmMillingPreset });
  return { tool: converted, sanitized: s.changed, converted: true };
}

/** Convert a whole parsed library object. Returns {library, total, convertedCount, sanitizedCount}. */
export function convertJmMillingLibrary(json) {
  const data = Array.isArray(json?.data) ? json.data : [];
  let convertedCount = 0;
  let sanitizedCount = 0;
  const out = data.map((t) => {
    const r = convertJmMillingTool(t);
    if (r.converted) convertedCount += 1;
    if (r.sanitized) sanitizedCount += 1;
    return r.tool;
  });
  return { library: { ...json, data: out }, total: data.length, convertedCount, sanitizedCount };
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const file = args.find((a) => !a.startsWith("--")) || DEFAULT_FILE;
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const r = convertJmMillingLibrary(json);
  if (apply) {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(r.library, null, 2));
    fs.renameSync(tmp, file);
  }
  console.log(`${apply ? "CONVERTED" : "DRY"} ${path.basename(file)}: ${r.total} tools | converted ${r.convertedCount} mm->inch | sanitized ${r.sanitizedCount} garbage-dim`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
