#!/usr/bin/env node
// clean-fusion-tools-misparse.mjs -- apply the brand-tool-catalog mis-parse gate policy directly to an
// already-emitted Fusion `.tools` file (for legacy libs like PRISM_JM_Milling that are produced by a
// pipeline OUTSIDE brand-tool-catalog.mjs and so do not get the in-normalizer gate).
//
// Policy (matches scripts/lib/brand-tool-catalog.mjs::isEndmillOversizeDia, applied at 80mm):
//   - DROP end-mill-type tools (flat/ball/bull end mill; NOT face mills) with Dc > 80mm -- the cutting
//     diameter is a source mis-parse (a solid/indexable end mill cannot be that big).
//   - For a surviving tool whose shaft-diameter is impossibly small (Dc/shaft > 8), reset shaft-diameter
//     to the cutting diameter (the diameter is usable; the shank is the artifact).
//
// Usage: node scripts/clean-fusion-tools-misparse.mjs <file.tools> [<file2.tools> ...] [--apply]
//   (dry-run by default; prints drop/fix counts. --apply writes the cleaned file in place.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEndmillOversize } from './assess-fusion-tool-libraries.mjs';
import { ENDMILL_DIA_MAX_MM, SHANK_RATIO_MAX } from './lib/brand-tool-catalog.mjs';

// Single source of truth: the same 80mm / 8x gate the normalizer applies (no drift).
export const ENDMILL_CLEAN_CEIL_MM = ENDMILL_DIA_MAX_MM;
export { SHANK_RATIO_MAX };

/**
 * Clean a parsed Fusion .tools library object. Returns {library, dropped, shankFixed, kept}.
 * Mutates surviving tools' shaft-diameter in place when it is an impossible mis-parse.
 */
export function cleanToolsLibrary(json) {
  const data = Array.isArray(json?.data) ? json.data : [];
  let dropped = 0;
  let shankFixed = 0;
  const kept = [];
  for (const t of data) {
    if (isEndmillOversize(t, ENDMILL_CLEAN_CEIL_MM)) { dropped++; continue; } // bad cutting diameter
    const dc = t?.geometry?.DC;
    const sh = t?.geometry?.['shaft-diameter'];
    if (typeof dc === 'number' && typeof sh === 'number' && sh > 0 && dc / sh > SHANK_RATIO_MAX) {
      t.geometry['shaft-diameter'] = dc; // impossible shank -> fall back to cutting diameter
      shankFixed++;
    }
    kept.push(t);
  }
  return { library: { ...json, data: kept }, dropped, shankFixed, kept: kept.length };
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const files = args.filter((a) => !a.startsWith('--'));
  if (!files.length) {
    console.error('usage: clean-fusion-tools-misparse.mjs <file.tools> [...] [--apply]');
    process.exit(1);
  }
  for (const f of files) {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch (e) {
      console.log(`SKIP ${f}: ${e.message}`);
      continue;
    }
    const before = Array.isArray(json?.data) ? json.data.length : 0;
    const r = cleanToolsLibrary(json);
    if (apply) {
      // 2-space indent to match the generator (extract-jm-milling-tools-fusion.mjs) for git-diff parity;
      // atomic write (tmp + rename) so a crash mid-write cannot leave a truncated .tools.
      const tmp = `${f}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(r.library, null, 2));
      fs.renameSync(tmp, f);
    }
    console.log(`${apply ? 'CLEANED' : 'DRY'} ${path.basename(f)}: ${before} -> ${r.kept} (dropped ${r.dropped} bad-diameter, fixed ${r.shankFixed} bad-shank)`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
