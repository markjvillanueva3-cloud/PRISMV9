#!/usr/bin/env node
// convert-fusion-tools-to-inch.mjs -- GENERAL mm->inch converter for a Fusion `.tools` library whose
// geometry AND feed-preset fields are all in the verified classification (scripts/lib/tool-unit-convert.mjs).
//
// WHY (slot:romeo, 2026-06-21): the per-brand emitter + the JM_Milling converter handle their own
// pipelines; this is the general one for any other mm `.tools` (e.g. PRISM_UPSET_H13, a 5-tool H13
// face-mill library) now that the converter's geometry (incl. LB/SIG) + feed (incl. v_c surface-speed)
// classifications are verified corpus-wide.
//
// SAFE BY DEFAULT: dry-run unless --apply. FAILS LOUD (does NOT write) if the library carries ANY
// unclassified geometry key OR unverified feed field -- a new field must be verified, never guessed
// (a wrong feed/speed/dimension is a scrap / tool-break risk). Idempotent: a tool already inches is
// skipped. Sanitizes parse-artifact OAL/flute/shank first (shared ceilings from brand-tool-catalog).
//
// Usage: node scripts/convert-fusion-tools-to-inch.mjs <file.tools> [<file2.tools> ...] [--apply]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  convertToolMmToInch, sanitizeToolGeometryMm, convertPresetMmToInch, unknownGeometryKeys,
} from "./lib/tool-unit-convert.mjs";
import { OAL_MAX_MM, LCF_MAX_MM, SHANK_MAX_MM } from "./lib/brand-tool-catalog.mjs";

const BOUNDS = { oalMax: OAL_MAX_MM, lcfMax: LCF_MAX_MM, shankMax: SHANK_MAX_MM };

/** Convert one tool: refuse unclassified geometry, sanitize garbage, then mm->inch (geometry + feeds).
 *  @returns {{tool, converted:boolean, sanitized:boolean}} -- an inch tool is returned unchanged. */
export function convertFusionToolToInch(tool) {
  if (tool?.unit === "inches") return { tool, converted: false, sanitized: false };
  const unknown = unknownGeometryKeys(tool);
  if (unknown.length) {
    throw new Error(`convert-fusion-tools: unclassified geometry key(s) ${unknown.join(", ")} -- classify before converting`);
  }
  const s = sanitizeToolGeometryMm(tool, BOUNDS);
  const out = convertToolMmToInch(s.tool, { convertPreset: convertPresetMmToInch });
  return { tool: out, converted: true, sanitized: s.changed };
}

/** Convert a whole parsed library. Returns {library, total, convertedCount, sanitizedCount}. */
export function convertFusionLibraryToInch(json) {
  const data = Array.isArray(json?.data) ? json.data : [];
  let convertedCount = 0;
  let sanitizedCount = 0;
  const out = data.map((t) => {
    const r = convertFusionToolToInch(t);
    if (r.converted) convertedCount += 1;
    if (r.sanitized) sanitizedCount += 1;
    return r.tool;
  });
  return { library: { ...json, data: out }, total: data.length, convertedCount, sanitizedCount };
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const files = args.filter((a) => !a.startsWith("--"));
  if (!files.length) {
    console.error("usage: convert-fusion-tools-to-inch.mjs <file.tools> [...] [--apply]");
    process.exit(1);
  }
  for (const f of files) {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(f, "utf8"));
    } catch (e) {
      console.log(`SKIP ${path.basename(f)}: ${e.message}`);
      continue;
    }
    let r;
    try {
      r = convertFusionLibraryToInch(json);
    } catch (e) {
      console.log(`REFUSED ${path.basename(f)}: ${e.message}`); // fail loud, do not write
      process.exitCode = 1;
      continue;
    }
    if (apply) {
      const tmp = `${f}.tmp`;
      // 2-space indent matches the sibling converters (convert-jm-milling, emit-brand) and the repo
      // .tools convention (R11); atomic tmp+rename so a crash cannot leave a truncated library.
      fs.writeFileSync(tmp, JSON.stringify(r.library, null, 2));
      fs.renameSync(tmp, f);
    }
    console.log(`${apply ? "CONVERTED" : "DRY"} ${path.basename(f)}: ${r.total} tools | converted ${r.convertedCount} mm->inch | sanitized ${r.sanitizedCount}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
