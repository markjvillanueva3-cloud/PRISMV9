#!/usr/bin/env node
// assess-fusion-tool-libraries.mjs -- operator-facing inventory + accuracy assessment of the
// PRISM-generated Fusion 360 tool libraries (Local/ .tools) and the material-group crib CSVs.
//
// WHY: operator asked for a full assessment of the Fusion tool library for JM Die -- what exists,
// whether it is accurate relative to JM's real source crib, and how it is categorized -- before
// importing/reviewing in Fusion. Deterministic scan (R5: code, not the model). Pure funcs exported.
//
// Usage:
//   node scripts/assess-fusion-tool-libraries.mjs [--out <file.md>] [--json <file.json>]
//   PRISM_FUSION_LOCAL_DIR=<dir> overrides the Fusion Local/ scan dir.
//
// Categories:
//   jm-machine-crib  PRISM_JM_*     JM's REAL per-machine cribs (inches, real holders). Ground truth.
//   brand-catalog    PRISM_<BRAND>  vendor catalog universe (mm, normalized). Buyable tooling.
//   generic          PRISM(-|_)(PRISMGeneric|GENERIC|base)  fallback geometry.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FUSION_LOCAL_DEFAULT =
  process.env.PRISM_FUSION_LOCAL_DIR ||
  path.join(process.env.APPDATA || '', 'Autodesk', 'Autodesk Fusion 360', 'CAM', 'Libraries', 'Local');

export const REPO = 'H:/prism';
export const MATGROUP_DIR = path.join(REPO, 'state/shared/jm-fusion-tools/material-group-libraries');
export const SOURCE_CRIB_DIR = path.join(REPO, 'resources/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY');

// Headline "endmill-oversize" ceiling for the Fusion `.tools` corpus. Deliberately LOOSER than the
// enumerator's 80mm bad-diameter ceiling: this scans the already-emitted Fusion `.tools` (a different,
// post-plausibility-gate population) by type-string match, so 160mm only flags the unambiguously
// impossible. The two metrics measure different corpora and are not meant to match.
export const ENDMILL_OVERSIZE_MAX_MM = 160;

/** Classify a Fusion .tools library by filename. */
export function categorizeLibrary(name) {
  const base = String(name).replace(/\.tools$/i, '');
  if (/^PRISM_JM_/i.test(base)) return 'jm-machine-crib';
  if (/^PRISM[-_](PRISMGeneric|GENERIC|base)/i.test(base) || /^prism-base/i.test(base)) return 'generic';
  if (/^PRISM_/i.test(base)) return 'brand-catalog';
  return 'other';
}

/**
 * Flag an end-mill-TYPE tool (flat/ball/bull end mill, NOT face mill or drill) carrying a
 * physically-impossible cutting diameter -- the reliable source-mis-parse signal. Real solid AND
 * indexable end mills top out ~160mm; large drills (Allied ~100mm) and face/shell mills are typed
 * separately and ARE legitimately large, so they are excluded (avoids false-positives).
 */
export function isEndmillOversize(t, ceilingMm = ENDMILL_OVERSIZE_MAX_MM) {
  const dc = t?.geometry?.DC;
  if (typeof dc !== 'number') return false;
  const type = String(t?.type || '').toLowerCase();
  if (!type.includes('end mill') || type.includes('face')) return false;
  const dcMm = String(t?.unit || '').toLowerCase().startsWith('inch') ? dc * 25.4 : dc;
  return dcMm > ceilingMm;
}

/**
 * Summarize a parsed Fusion .tools JSON ({version, data:[...]}).
 * Reports counts, unit set, type distribution, holder coverage, and end-mill-oversize mis-parses.
 */
export function summarizeToolsJson(json) {
  const data = Array.isArray(json?.data) ? json.data : [];
  const typeDist = {};
  const units = new Set();
  const vendors = new Set();
  let withHolderSeg = 0;
  let endmillOversize = 0; // end-mill-TYPE tools with an impossible cutting diameter (mis-parse signal)
  for (const t of data) {
    const ty = t?.type || '?';
    typeDist[ty] = (typeDist[ty] || 0) + 1;
    units.add(t?.unit || '?');
    if (t?.vendor) vendors.add(t.vendor);
    const segs = Array.isArray(t?.holder?.segments) ? t.holder.segments.length : 0;
    if (segs > 0) withHolderSeg++;
    if (isEndmillOversize(t)) endmillOversize++;
  }
  return {
    count: data.length,
    units: [...units],
    typeDist,
    typeCount: Object.keys(typeDist).length,
    vendorCount: vendors.size,
    withHolderSeg,
    holderPct: data.length ? Math.round((100 * withHolderSeg) / data.length) : 0,
    endmillOversize,
  };
}

/** Count distinct numeric tool_index values + total data rows in a CSV_TOOLS_VERSION_1 file. */
export function summarizeCribCsv(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length <= 1) return { rows: 0, distinctTools: 0 };
  const idx = new Set();
  let rows = 0;
  for (let i = 1; i < lines.length; i++) {
    const first = lines[i].split(',')[0]?.trim();
    if (/^\d+$/.test(first)) {
      idx.add(first);
      rows++;
    }
  }
  return { rows, distinctTools: idx.size };
}

function safeReadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { __error: e.message };
  }
}

function scanFusionLocal(dir) {
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => /^PRISM.*\.tools$/i.test(f));
  } catch (e) {
    return { dir, error: e.message, libs: [] };
  }
  const libs = files.map((f) => {
    const j = safeReadJson(path.join(dir, f));
    if (j.__error) return { name: f, category: categorizeLibrary(f), error: j.__error };
    return { name: f, category: categorizeLibrary(f), ...summarizeToolsJson(j) };
  });
  return { dir, libs };
}

function scanCribParity() {
  const out = [];
  let gen = [];
  try {
    gen = fs.readdirSync(MATGROUP_DIR).filter((f) => /-allconditions\.csv$/i.test(f));
  } catch (e) {
    return { error: e.message, families: [] };
  }
  for (const g of gen) {
    const stem = g.replace(/-allconditions\.csv$/i, '');
    try {
      const srcPath = path.join(SOURCE_CRIB_DIR, `${stem}.csv`);
      const genSum = summarizeCribCsv(fs.readFileSync(path.join(MATGROUP_DIR, g), 'utf8'));
      let srcSum = null;
      if (fs.existsSync(srcPath)) srcSum = summarizeCribCsv(fs.readFileSync(srcPath, 'utf8'));
      out.push({
        family: stem,
        sourceTools: srcSum ? srcSum.distinctTools : null,
        generatedDistinctTools: genSum.distinctTools,
        generatedRows: genSum.rows,
        presetsPerTool: srcSum && srcSum.distinctTools ? +(genSum.rows / srcSum.distinctTools).toFixed(1) : null,
        parityOk: srcSum ? srcSum.distinctTools === genSum.distinctTools : null,
      });
    } catch (e) {
      // fail-soft per file (e.g. a concurrent peer write removing a -allconditions.csv mid-scan)
      out.push({ family: stem, error: e.message });
    }
  }
  return { families: out };
}

function renderReport(fusion, crib) {
  const L = [];
  L.push('# Fusion Tool Library -- Assessment (JM Die)');
  L.push(`_Generated ${new Date().toISOString()} by assess-fusion-tool-libraries.mjs (slot:romeo)._`);
  L.push('');
  const byCat = {};
  for (const lib of fusion.libs) (byCat[lib.category] ||= []).push(lib);
  const tot = (arr) => arr.reduce((s, l) => s + (l.count || 0), 0);

  L.push('## 1. Fusion `Local/` libraries (discoverable in Fusion tool tree)');
  L.push(`Scan dir: \`${fusion.dir}\``);
  if (fusion.error) L.push(`**SCAN ERROR:** ${fusion.error}`);
  L.push('');
  for (const cat of ['jm-machine-crib', 'brand-catalog', 'generic', 'other']) {
    const arr = byCat[cat] || [];
    if (!arr.length) continue;
    L.push(`### ${cat} -- ${arr.length} libs / ${tot(arr)} tools`);
    L.push('| Library | Tools | Units | Holder% | Types | Endmill-oversize |');
    L.push('|---------|------:|-------|--------:|-------|-----------------:|');
    for (const l of arr.sort((a, b) => (b.count || 0) - (a.count || 0))) {
      if (l.error) { L.push(`| ${l.name} | ERR | ${l.error} | | | |`); continue; }
      const types = Object.entries(l.typeDist).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(', ');
      const flag = l.endmillOversize > 0 ? `[!] ${l.endmillOversize}` : '0';
      L.push(`| ${l.name} | ${l.count} | ${l.units.join('/')} | ${l.holderPct}% | ${types}${l.typeCount > 4 ? ` (+${l.typeCount - 4})` : ''} | ${flag} |`);
    }
    L.push('');
  }

  L.push('## 2. Material-group crib CSVs -- accuracy parity vs JM source');
  L.push('Each generated `*-allconditions.csv` augments JM\'s real source CSV with per-ISO-group presets.');
  L.push('`parityOk` = generated distinct tools == source distinct tools (no tools dropped/duplicated).');
  L.push('');
  L.push('| Family | Source tools | Generated tools | Rows | Presets/tool | Parity |');
  L.push('|--------|-------------:|----------------:|-----:|-------------:|:------:|');
  for (const f of crib.families || []) {
    const p = f.parityOk === null ? 'n/a' : f.parityOk ? 'OK' : 'X MISMATCH';
    L.push(`| ${f.family} | ${f.sourceTools ?? '?'} | ${f.generatedDistinctTools} | ${f.generatedRows} | ${f.presetsPerTool ?? '?'} | ${p} |`);
  }
  L.push('');

  const totTools = tot(fusion.libs);
  const jmTools = tot(byCat['jm-machine-crib'] || []);
  const brandTools = tot(byCat['brand-catalog'] || []);
  const scaleErrs = fusion.libs.reduce((s, l) => s + (l.endmillOversize || 0), 0);
  L.push('## 3. Headline');
  L.push(`- **${fusion.libs.length} Fusion libraries** in Local/ -> **${totTools.toLocaleString()} tool presets** total.`);
  L.push(`- **${(byCat['jm-machine-crib'] || []).length} JM machine cribs** (${jmTools.toLocaleString()} tools, inches, real holders) = JM's actual tooling.`);
  L.push(`- **${(byCat['brand-catalog'] || []).length} brand catalogs** (${brandTools.toLocaleString()} tools, mm) = buyable vendor universe.`);
  L.push(`- End-mill-type tools with impossible (>160mm) cutting diameter (source mis-parse): **${scaleErrs}**.`);
  const badParity = (crib.families || []).filter((f) => f.parityOk === false);
  L.push(`- Material-group crib parity failures: **${badParity.length}** ${badParity.length ? '(' + badParity.map((f) => f.family).join(', ') + ')' : '(all source tools preserved)'}.`);
  return L.join('\n');
}

export function runAssessment() {
  const fusion = scanFusionLocal(FUSION_LOCAL_DEFAULT);
  const crib = scanCribParity();
  return { fusion, crib, markdown: renderReport(fusion, crib) };
}

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const jsonIdx = args.indexOf('--json');
  const r = runAssessment();
  if (jsonIdx >= 0 && args[jsonIdx + 1]) {
    fs.writeFileSync(args[jsonIdx + 1], JSON.stringify({ fusion: r.fusion, crib: r.crib }, null, 2));
  }
  if (outIdx >= 0 && args[outIdx + 1]) {
    fs.writeFileSync(args[outIdx + 1], r.markdown);
    console.log(`[assess] wrote ${args[outIdx + 1]}`);
  } else {
    console.log(r.markdown);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
