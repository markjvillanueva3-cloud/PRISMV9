/**
 * Extract ALL CNC programs from Box cloud to H:\prism\mcp-server\data\programs\
 * Organized by controller family with customer__programname naming.
 *
 * Box Drive uses on-demand cloud files — this script triggers downloads by reading.
 * For 46K+ files, runs in streaming mode with progress reporting.
 *
 * Usage: node scripts/extract-box-programs.mjs [--controller okuma|haas|hurco|all] [--max N]
 */
import fs from 'fs';
import path from 'path';

const BOX_ROOT = 'C:/Users/wompu/Box';
const OUTPUT_ROOT = 'H:/prism/mcp-server/data/programs';

// Source directories mapped to controller families
const SOURCES = [
  { dir: `${BOX_ROOT}/CNC LATHE`,          controller: 'okuma',  exts: ['.MIN', '.min'] },
  { dir: `${BOX_ROOT}/CNC MILL HAAS`,      controller: 'haas',   exts: ['.NC', '.nc'] },
  { dir: `${BOX_ROOT}/CNC MILL HAAS OLD`,  controller: 'haas',   exts: ['.NC', '.nc'] },
  { dir: `${BOX_ROOT}/CNC MILL HURCO`,     controller: 'hurco',  exts: ['.HNC', '.hnc', '.NC', '.nc'] },
];

// Parse args
const args = process.argv.slice(2);
const controllerFilter = args.includes('--controller') ? args[args.indexOf('--controller') + 1] : 'all';
const maxFiles = args.includes('--max') ? parseInt(args[args.indexOf('--max') + 1], 10) : Infinity;
const fiveYearsAgo = new Date();
fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

console.log(`Box Program Extractor`);
console.log(`Controller: ${controllerFilter} | Max: ${maxFiles === Infinity ? 'unlimited' : maxFiles} | Since: ${fiveYearsAgo.toISOString().split('T')[0]}`);
console.log(`Output: ${OUTPUT_ROOT}/`);
console.log('---');

// Ensure output dirs exist
for (const { controller } of SOURCES) {
  fs.mkdirSync(path.join(OUTPUT_ROOT, controller), { recursive: true });
}

let totalExtracted = 0;
let totalSkipped = 0;
let totalErrors = 0;

function sanitize(s) {
  return s.replace(/[^A-Za-z0-9_.-]/g, '_').replace(/__+/g, '_');
}

function walkDir(dir, controller, exts, depth = 0) {
  if (totalExtracted >= maxFiles) return;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    // Box Drive cloud file not available
    totalErrors++;
    return;
  }

  for (const entry of entries) {
    if (totalExtracted >= maxFiles) return;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && depth < 5) {
      walkDir(fullPath, controller, exts, depth + 1);
      continue;
    }

    if (!entry.isFile()) continue;

    // Check extension
    const ext = path.extname(entry.name);
    if (!exts.some(e => e.toLowerCase() === ext.toLowerCase())) continue;

    // Check date (last 5 years)
    try {
      const stats = fs.statSync(fullPath);
      if (stats.mtime < fiveYearsAgo) {
        totalSkipped++;
        continue;
      }
    } catch {
      totalErrors++;
      continue;
    }

    // Build output name: customer__program.ext
    const relDir = path.relative(SOURCES.find(s => fullPath.startsWith(s.dir))?.dir || dir, path.dirname(fullPath));
    const parts = relDir.split(path.sep).filter(Boolean);
    const customer = parts.length > 0 ? sanitize(parts[0]) : '';
    const subpath = parts.length > 1 ? parts.slice(1).map(sanitize).join('_') + '_' : '';
    const outName = customer
      ? `${customer}__${subpath}${entry.name}`
      : entry.name;

    const outPath = path.join(OUTPUT_ROOT, controller, outName);

    // Skip if already extracted
    if (fs.existsSync(outPath)) {
      totalSkipped++;
      continue;
    }

    // Copy
    try {
      fs.copyFileSync(fullPath, outPath);
      totalExtracted++;

      if (totalExtracted % 500 === 0) {
        console.log(`  [${controller}] ${totalExtracted} extracted, ${totalSkipped} skipped, ${totalErrors} errors...`);
      }
    } catch {
      totalErrors++;
    }
  }
}

// Run extraction
for (const source of SOURCES) {
  if (controllerFilter !== 'all' && source.controller !== controllerFilter) continue;

  if (!fs.existsSync(source.dir)) {
    console.log(`SKIP: ${source.dir} not accessible`);
    continue;
  }

  console.log(`Scanning: ${source.dir} → ${source.controller}/`);
  walkDir(source.dir, source.controller, source.exts);

  const count = fs.readdirSync(path.join(OUTPUT_ROOT, source.controller))
    .filter(f => source.exts.some(e => f.toLowerCase().endsWith(e.toLowerCase()))).length;
  console.log(`  ${source.controller}: ${count} total files on H drive`);
}

console.log('---');
console.log(`Done! Extracted: ${totalExtracted} | Skipped: ${totalSkipped} | Errors: ${totalErrors}`);

// Print final counts
const finalStats = {};
for (const dir of fs.readdirSync(OUTPUT_ROOT)) {
  const dp = path.join(OUTPUT_ROOT, dir);
  if (fs.statSync(dp).isDirectory()) {
    finalStats[dir] = fs.readdirSync(dp).length;
  }
}
console.log('Final counts:', JSON.stringify(finalStats));
console.log('Total programs on H drive:', Object.values(finalStats).reduce((a, b) => a + b, 0));
