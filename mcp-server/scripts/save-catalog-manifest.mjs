#!/usr/bin/env node
// Emit the vendor-catalog-manifest.json that /pdf-learn --batch consumes.
// Runs independently of vitest so we can inspect the real queue.

import * as fs from "fs";
import * as path from "path";

const ROOT = "H:/prism/resources/MANUFACTURER_CATALOGS/uploaded";
const INDEX = "H:/prism/mcp-server/data/CATALOG_INDEX.json";
const OUT = "H:/prism/mcp-server/data/vendor-catalog-manifest.json";

// Simplified inline — same logic as VendorCatalogManifestEngine
const PATTERNS = [
  [/^GC[_\s]?20\d{2}/i, "Sandvik"], [/sandvik/i, "Sandvik"], [/coromant/i, "Sandvik"],
  [/master\s+catalog.*vol\.?\s*[12]/i, "Iscar"], [/iscar/i, "Iscar"],
  [/(milling|turning|threading)\s+20\d{2}\.\d/i, "Iscar"],
  [/tooling\s+systems\s+news/i, "Iscar"],
  [/kennametal|widia/i, "Kennametal"],
  [/seco/i, "Seco"], [/metalmorphosis/i, "Seco"], [/solid\s+end\s+mills/i, "Seco"],
  [/walter/i, "Walter"], [/mitsubishi/i, "Mitsubishi"], [/kyocera/i, "Kyocera"],
  [/tungaloy/i, "Tungaloy"], [/^OSG/i, "OSG"], [/guhring/i, "Guhring"],
  [/korloy/i, "Korloy"], [/haimer/i, "Haimer"], [/emuge/i, "Emuge"],
  [/sgs/i, "SGS"], [/ingersoll/i, "Ingersoll"], [/niagara/i, "Niagara"],
  [/helical/i, "Helical"], [/harvey/i, "Harvey"], [/dormer|pramet/i, "Dormer Pramet"],
  [/horn/i, "Horn"], [/sumitomo/i, "Sumitomo"], [/yg1|yg-1/i, "YG1"],
  [/ma[_\s-]?ford/i, "MA Ford"], [/accupro/i, "Accupro"], [/ampc/i, "AMPC"],
  [/camfix/i, "Camfix"], [/rego-?fix/i, "Rego-Fix"], [/big\s+daishowa/i, "Big Daishowa"],
  [/flash/i, "Flash"], [/rapidkut/i, "Rapidkut"], [/global[_\s-]?cnc/i, "Global CNC"],
  [/zenit|zeni/i, "Zenit"], [/orange\s+vise/i, "Orange Vise"],
];

function detectVendor(name) {
  for (const [re, mfg] of PATTERNS) if (re.test(name)) return mfg;
  return "unknown";
}

function detectType(name) {
  const f = name.toLowerCase();
  if (/drill/.test(f)) return "drilling";
  if (/thread/.test(f)) return "threading";
  if (/grooving/.test(f)) return "grooving";
  if (/holemaking/.test(f)) return "holemaking";
  if (/mill/.test(f)) return "milling";
  if (/turning|turn/.test(f)) return "turning";
  if (/tooling\s+systems/.test(f)) return "tooling_systems";
  if (/rotating/.test(f)) return "rotating";
  if (/solid/.test(f)) return "solid";
  if (/workholding|fixture|vise|chuck/.test(f)) return "workholding";
  return "general";
}

function estimateTools(bytes, vendor) {
  const mb = bytes / (1024 * 1024);
  let base = 60;
  if (mb > 100) base = 40;
  if (mb > 200) base = 30;
  if (["Sandvik", "Iscar", "Kennametal", "Seco"].includes(vendor)) base *= 1.2;
  return Math.round(mb * base);
}

const index = JSON.parse(fs.readFileSync(INDEX, "utf-8"));
const fileEntries = new Map(index.catalogs.map(c => [c.file, c.entries]));

const files = fs.readdirSync(ROOT).filter(f => /\.pdf$/i.test(f));
const zipShards = fs.readdirSync(ROOT).filter(f => /\.zip\.\d+$/.test(f));

const catalogs = files.map(filename => {
  const fullPath = path.join(ROOT, filename);
  const stat = fs.statSync(fullPath);
  const vendor = detectVendor(filename);
  const type = detectType(filename);
  const targetJson = `${vendor.toLowerCase().replace(/\s+/g, "-")}-${type}-extracted.json`;
  return {
    filename,
    path: fullPath,
    manufacturer: vendor,
    type,
    sizeBytes: stat.size,
    sizeMB: +(stat.size / 1048576).toFixed(1),
    extracted: (fileEntries.get(targetJson) ?? 0) > 0,
    targetJson,
    estimatedTools: estimateTools(stat.size, vendor),
  };
});

catalogs.sort((a, b) => b.estimatedTools - a.estimatedTools);

const manifest = {
  generated: new Date().toISOString(),
  rootPath: ROOT,
  totalPdfs: files.length,
  totalZipShards: zipShards.length,
  currentTools: index.totalEntries,
  targetTools: 90000,
  gapToTarget: Math.max(0, 90000 - index.totalEntries),
  catalogs,
  extractionQueue: catalogs.filter(c => !c.extracted).slice(0, 10),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));
console.log(`Saved ${OUT}`);
console.log(`PDFs: ${manifest.totalPdfs}, zip shards: ${manifest.totalZipShards}`);
console.log(`Queue top 10:`);
for (const c of manifest.extractionQueue) {
  console.log(`  ${c.estimatedTools.toString().padStart(5)} est  ${c.manufacturer.padEnd(12)} ${c.sizeMB.toString().padStart(6)} MB  ${c.filename}`);
}
