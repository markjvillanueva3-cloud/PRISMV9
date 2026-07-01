#!/usr/bin/env node
/**
 * Complete collision data coverage generator.
 * Iterates ALL catalog TS files in src/data/, extracts tool objects using
 * depth-tracking parser, generates collision zones for any tool not already
 * in collision-avoidance-data.json, and writes updated JSON.
 *
 * Target: ~95%+ coverage (from 72% / 67,817 tools).
 */

const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '..', 'src', 'data');

// Load existing collision data
const existingPath = path.join(dataDir, 'collision-avoidance-data.json');
const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
const existingIds = new Set(existingData.tools.map(t => t.id));
const beforeCount = existingData.tools.length;
console.log(`=== Collision Coverage Generator ===`);
console.log(`Before: ${beforeCount} tools with collision data\n`);

function r(v) { return Math.round(v * 100) / 100; }

// Extract objects from TS array using depth-tracking parser
function extractObjects(content, arrayName) {
  const pattern = arrayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(pattern + '\\s*(?::[^=]*)?=\\s*\\['));
  if (!match) { return []; }
  const eqPos = content.indexOf('=', match.index);
  const arrStart = content.indexOf('[', eqPos);
  let depth = 0;
  const objects = [];
  let objStart = -1;
  for (let i = arrStart; i < content.length; i++) {
    const ch = content[i];
    if (ch === '[') { depth++; }
    else if (ch === ']') { depth--; if (depth === 0) break; }
    else if (ch === '{') {
      if (depth === 1) objStart = i;
      else if (depth > 1) { /* nested object, skip */ }
    }
    else if (ch === '}') {
      if (depth === 1 && objStart >= 0) {
        objects.push(content.substring(objStart, i + 1));
        objStart = -1;
      }
    }
  }
  return objects;
}

// Get field from object string (handles quoted/unquoted keys)
function getField(obj, field) {
  const strMatch = obj.match(new RegExp(`["']?${field}["']?\\s*:\\s*"([^"]*)"`, 'i'));
  if (strMatch) return strMatch[1];
  const numMatch = obj.match(new RegExp(`["']?${field}["']?\\s*:\\s*(-?[\\d.]+)`, 'i'));
  if (numMatch) return parseFloat(numMatch[1]);
  return null;
}

// Get depth_capability multiplier (e.g. "12 x D" -> 12)
function getDepthMultiplier(obj) {
  const m = obj.match(/depth_capability\s*:\s*"(\d+)\s*x\s*D"/i);
  return m ? parseInt(m[1]) : null;
}

function getFieldBool(obj, field) {
  const m = obj.match(new RegExp(`["']?${field}["']?\\s*:\\s*(true|false)`, 'i'));
  return m ? m[1] === 'true' : null;
}

const report = {};
let totalAdded = 0;

function addTool(id, mfg, type, dc, ds, oal, loc, fc, zones) {
  if (existingIds.has(id)) return false;
  if (!dc || dc <= 0) return false;
  existingData.tools.push({
    id, mfg, type,
    dc: r(dc), ds: r(ds || dc), oal: r(oal), loc: r(loc), fc: fc || 2,
    zones: zones || [
      { zone: "cutting", z_start: 0, z_end: r(loc), diameter: r(dc) },
      { zone: "shank", z_start: r(loc), z_end: r(oal), diameter: r(ds || dc) }
    ]
  });
  existingIds.add(id);
  return true;
}

function addInsert(id, mfg, ic, thickness) {
  if (existingIds.has(id)) return false;
  if (!ic || ic <= 0) return false;
  const th = thickness || ic * 0.35;
  existingData.tools.push({
    id, mfg, type: "insert",
    dc: r(ic), ds: r(ic), oal: r(th), loc: r(th), fc: 1,
    zones: [{ zone: "cutting", z_start: 0, z_end: r(th), diameter: r(ic) }]
  });
  existingIds.add(id);
  return true;
}

// ===== EMUGE (taps, drills, thread mills, dies) =====
{
  // Metric thread nominal diameter lookup (ISO 261)
  const METRIC_THREAD_DIA = {
    'M1': 1, 'M1.2': 1.2, 'M1.4': 1.4, 'M1.6': 1.6, 'M1.8': 1.8,
    'M2': 2, 'M2.2': 2.2, 'M2.5': 2.5, 'M3': 3, 'M3.5': 3.5,
    'M4': 4, 'M4.5': 4.5, 'M5': 5, 'M6': 6, 'M7': 7, 'M8': 8,
    'M9': 9, 'M10': 10, 'M11': 11, 'M12': 12, 'M14': 14, 'M16': 16,
    'M18': 18, 'M20': 20, 'M22': 22, 'M24': 24, 'M27': 27, 'M30': 30,
    'M33': 33, 'M36': 36, 'M39': 39, 'M42': 42, 'M45': 45, 'M48': 48,
    'M52': 52, 'M56': 56, 'M60': 60, 'M64': 64, 'M68': 68
  };
  // UNC/UNF thread diameter lookup (inches -> mm)
  const UTS_THREAD_DIA = {
    '#0': 1.524, '#1': 1.854, '#2': 2.184, '#3': 2.515, '#4': 2.845,
    '#5': 3.175, '#6': 3.505, '#8': 4.166, '#10': 4.826, '#12': 5.486,
    '1/4': 6.35, '5/16': 7.938, '3/8': 9.525, '7/16': 11.113, '1/2': 12.7,
    '9/16': 14.288, '5/8': 15.875, '3/4': 19.05, '7/8': 22.225, '1': 25.4,
    '1-1/8': 28.575, '1-1/4': 31.75, '1-3/8': 34.925, '1-1/2': 38.1,
    '1-3/4': 44.45, '2': 50.8
  };

  function parseThreadDiameter(threadSize) {
    if (!threadSize) return null;
    // Metric: M1, M1.6, M10, M10x1.25, etc.
    const mMatch = threadSize.match(/^M([\d.]+)/);
    if (mMatch) return parseFloat(mMatch[1]);
    // Check lookup
    if (METRIC_THREAD_DIA[threadSize]) return METRIC_THREAD_DIA[threadSize];
    // UNC/UNF: #0, #10, 1/4, 1/2, etc. — strip trailing -XX TPI
    const cleanSize = threadSize.replace(/[-x].*$/, '').trim();
    if (UTS_THREAD_DIA[cleanSize]) return UTS_THREAD_DIA[cleanSize];
    // Try fraction: 1/4-20 etc.
    const fracMatch = cleanSize.match(/^(\d+)\/(\d+)/);
    if (fracMatch) return (parseInt(fracMatch[1]) / parseInt(fracMatch[2])) * 25.4;
    // Try number size: #0-80 etc.
    const numMatch = cleanSize.match(/^#?(\d+)/);
    if (numMatch) {
      const n = parseInt(numMatch[1]);
      if (n <= 12) return (0.06 + n * 0.013) * 25.4; // ANSI formula
    }
    // G/BSP threads: G1/8, G1/4, etc.
    const gMatch = threadSize.match(/^G?\s*(\d+)\/(\d+)/);
    if (gMatch) return (parseInt(gMatch[1]) / parseInt(gMatch[2])) * 25.4;
    // Pipe: Rp, Rc, NPT
    const pipeMatch = threadSize.match(/(\d+)\/(\d+)/);
    if (pipeMatch) return (parseInt(pipeMatch[1]) / parseInt(pipeMatch[2])) * 25.4;
    return null;
  }

  const content = fs.readFileSync(path.join(dataDir, 'emuge-tool-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'EMUGE_TOOLS');
  let count = 0;
  let nodia = 0;
  for (const obj of objs) {
    const desig = getField(obj, 'designation');
    if (!desig) continue;
    // Get diameter from diameter_mm OR thread_size
    let dc = getField(obj, 'diameter_mm');
    if (!dc || dc <= 0) {
      const threadSize = getField(obj, 'thread_size');
      dc = parseThreadDiameter(threadSize);
    }
    if (!dc || dc <= 0) { nodia++; continue; }
    const id = `EMG-${desig}`;
    if (existingIds.has(id)) continue;

    const type = getField(obj, 'type') || 'tap';
    const depthMul = getDepthMultiplier(obj);

    // Derive dimensions based on tool type
    let ds, oal, loc, fc;
    if (type === 'twist_drill' || type === 'chamfer_drill') {
      const mul = depthMul || 5;
      loc = dc * Math.min(mul, 8);
      oal = dc * (mul + 3);
      ds = dc <= 3 ? dc : (dc <= 10 ? dc : dc * 0.8);
      fc = 2;
      if (addTool(id, "EMUGE", "drill", dc, ds, oal, loc, fc, [
        { zone: "cutting", z_start: 0, z_end: r(loc), diameter: r(dc) },
        { zone: "shank", z_start: r(loc), z_end: r(oal), diameter: r(ds) }
      ])) count++;
    } else if (type === 'tap' || type === 'cold_forming_tap') {
      loc = dc * 2.5;
      oal = dc * 6;
      ds = dc * 0.85;
      fc = type === 'cold_forming_tap' ? 0 : 3;
      if (addTool(id, "EMUGE", type, dc, ds, oal, loc, fc, [
        { zone: "cutting", z_start: 0, z_end: r(loc), diameter: r(dc) },
        { zone: "shank", z_start: r(loc), z_end: r(oal), diameter: r(ds) }
      ])) count++;
    } else if (type === 'thread_mill') {
      loc = dc * 1.5;
      oal = dc * 5;
      ds = dc * 0.7;
      fc = 3;
      if (addTool(id, "EMUGE", "thread_mill", dc, ds, oal, loc, fc)) count++;
    } else if (type === 'die') {
      const dieOd = dc * 3;
      const th = dc * 0.8;
      if (addTool(id, "EMUGE", "die", dieOd, dieOd, th, th, 1, [
        { zone: "cutting", z_start: 0, z_end: r(th), diameter: r(dieOd) }
      ])) count++;
    }
  }
  report['EMUGE'] = count;
  totalAdded += count;
  console.log(`  EMUGE: +${count} (from ${objs.length} total, ${nodia} skipped no diameter)`);
}

// ===== KENNAMETAL TURNING (inserts, holders, boring bars, grooving, threading) =====
{
  const content = fs.readFileSync(path.join(dataDir, 'kennametal-turning-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'KENNAMETAL_TURNING_TOOLS');
  let count = 0;
  for (const obj of objs) {
    const catNum = getField(obj, 'catalogNumber');
    if (!catNum) continue;
    const type = getField(obj, 'type');
    const id = `KT-${catNum}`;
    if (existingIds.has(id)) continue;

    if (type === 'turning_insert') {
      const ic = getField(obj, 'ic_mm');
      const th = getField(obj, 'l10_mm') || (ic ? ic * 0.37 : null);
      if (addInsert(id, "Kennametal", ic, th)) count++;
    } else if (type === 'turning_holder') {
      const h = getField(obj, 'h_mm') || (getField(obj, 'h_inch') || 0) * 25.4;
      const b = getField(obj, 'b_mm') || (getField(obj, 'b_inch') || 0) * 25.4;
      const l1 = getField(obj, 'l1_mm') || (getField(obj, 'l1_inch') || 0) * 25.4;
      const f = getField(obj, 'f_mm') || (getField(obj, 'f_inch') || 0) * 25.4;
      if (h <= 0 && b <= 0) continue;
      const dc = Math.max(h, b) || 25; // cross-section
      const oal = l1 || dc * 6;
      const headLen = f || dc * 1.5;
      if (addTool(id, "Kennametal", "turning_holder", dc, dc, oal, headLen, 1, [
        { zone: "cutting", z_start: 0, z_end: r(headLen), diameter: r(dc) },
        { zone: "shank", z_start: r(headLen), z_end: r(oal), diameter: r(dc) }
      ])) count++;
    } else if (type === 'boring_bar') {
      const boreDia = getField(obj, 'boreDia_mm') || (getField(obj, 'boreDia_inch') || 0) * 25.4;
      const oal = getField(obj, 'oal_mm') || (getField(obj, 'oal_inch') || 0) * 25.4;
      const d2 = getField(obj, 'd2_mm') || (getField(obj, 'd2_inch') || 0) * 25.4;
      if (boreDia <= 0) continue;
      const actualOal = oal || boreDia * 8;
      const headLen = boreDia * 1.5;
      if (addTool(id, "Kennametal", "boring_bar", boreDia, d2 || boreDia, actualOal, headLen, 1, [
        { zone: "cutting", z_start: 0, z_end: r(headLen), diameter: r(boreDia) },
        { zone: "shank", z_start: r(headLen), z_end: r(actualOal), diameter: r(d2 || boreDia) }
      ])) count++;
    } else if (type === 'grooving_tool') {
      const w = getField(obj, 'width_mm') || (getField(obj, 'width_inch') || 0) * 25.4;
      const h = getField(obj, 'h_mm') || (getField(obj, 'h_inch') || 0) * 25.4;
      if (w <= 0 && h <= 0) continue;
      const dc = Math.max(w, h) || 20;
      const oal = dc * 5;
      if (addTool(id, "Kennametal", "grooving_tool", dc, dc, oal, dc * 1.5, 1)) count++;
    } else if (type === 'threading_tool') {
      const h = getField(obj, 'h_mm') || (getField(obj, 'h_inch') || 0) * 25.4;
      const b = getField(obj, 'b_mm') || (getField(obj, 'b_inch') || 0) * 25.4;
      const l1 = getField(obj, 'l1_mm') || (getField(obj, 'l1_inch') || 0) * 25.4;
      if (h <= 0 && b <= 0) continue;
      const dc = Math.max(h, b) || 20;
      const oal = l1 || dc * 6;
      if (addTool(id, "Kennametal", "threading_tool", dc, dc, oal, dc * 1.5, 1)) count++;
    }
  }
  report['Kennametal_Turning'] = count;
  totalAdded += count;
  console.log(`  Kennametal Turning: +${count} (from ${objs.length} total objects)`);
}

// ===== WIDIA 2022 INCH (end mills, drills, ball end mills) =====
{
  const content = fs.readFileSync(path.join(dataDir, 'widia-2022-inch-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'WIDIA_2022_INCH_TOOLS');
  let count = 0;
  for (const obj of objs) {
    const orderCode = getField(obj, 'orderCode');
    const dc = getField(obj, 'DC');
    if (!orderCode || !dc || dc <= 0) continue;
    const id = `WI-${orderCode}`;
    if (existingIds.has(id)) continue;
    const ds = getField(obj, 'DCONMS') || dc;
    const oal = getField(obj, 'OAL') || dc * 5;
    const loc = getField(obj, 'LU') || dc * 2;
    const type = getField(obj, 'type') || 'end_mill';
    const nof = getField(obj, 'NOF') || 4;
    if (addTool(id, "WIDIA", type, dc, ds, oal, loc, nof)) count++;
  }
  report['WIDIA_Inch'] = count;
  totalAdded += count;
  console.log(`  WIDIA Inch: +${count} (from ${objs.length} total objects)`);
}

// ===== WIDIA 2022 TURNING (inserts) =====
{
  const content = fs.readFileSync(path.join(dataDir, 'widia-2022-turning-catalog.ts'), 'utf8');

  // Turning inserts
  const turnObjs = extractObjects(content, 'WIDIA_TURNING_INSERTS');
  let count = 0;
  for (const obj of turnObjs) {
    const desig = getField(obj, 'designation');
    const ic = getField(obj, 'ic_mm');
    if (!desig || !ic || ic <= 0) continue;
    const id = `WT-${desig}`;
    if (existingIds.has(id)) continue;
    const th = getField(obj, 'thickness_mm') || ic * 0.35;
    if (addInsert(id, "WIDIA", ic, th)) count++;
  }

  // Grooving inserts
  const grooveObjs = extractObjects(content, 'WIDIA_GROOVING_INSERTS');
  for (const obj of grooveObjs) {
    const desig = getField(obj, 'designation');
    const ic = getField(obj, 'ic_mm');
    const w = getField(obj, 'width_mm');
    if (!desig) continue;
    const id = `WG-${desig}`;
    if (existingIds.has(id)) continue;
    const dim = ic || w || 10;
    const th = getField(obj, 'thickness_mm') || dim * 0.35;
    if (addInsert(id, "WIDIA", dim, th)) count++;
  }

  // Threading inserts
  const threadObjs = extractObjects(content, 'WIDIA_THREADING_INSERTS');
  for (const obj of threadObjs) {
    const desig = getField(obj, 'designation');
    const ic = getField(obj, 'ic_mm');
    if (!desig) continue;
    const id = `WTH-${desig}`;
    if (existingIds.has(id)) continue;
    const dim = ic || 11;
    const th = getField(obj, 'thickness_mm') || dim * 0.35;
    if (addInsert(id, "WIDIA", dim, th)) count++;
  }

  report['WIDIA_Turning'] = count;
  totalAdded += count;
  console.log(`  WIDIA Turning: +${count} (from ${turnObjs.length}+${grooveObjs.length}+${threadObjs.length} objects)`);
}

// ===== SANDVIK 2022 (WIDIA metric end mills, drills) =====
{
  const content = fs.readFileSync(path.join(dataDir, 'sandvik-2022-tool-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'SANDVIK_2022_TOOLS');
  let count = 0;
  for (const obj of objs) {
    const orderCode = getField(obj, 'orderCode');
    const dc = getField(obj, 'DC');
    if (!orderCode || !dc || dc <= 0) continue;
    const id = `S22-${orderCode}`;
    if (existingIds.has(id)) continue;
    const ds = getField(obj, 'DCONMS') || dc;
    const oal = getField(obj, 'OAL') || dc * 5;
    const loc = getField(obj, 'LU') || dc * 2;
    const type = getField(obj, 'type') || 'end_mill';
    const nof = getField(obj, 'NOF') || 4;
    if (addTool(id, "WIDIA", type, dc, ds, oal, loc, nof)) count++;
  }
  report['Sandvik_2022'] = count;
  totalAdded += count;
  console.log(`  Sandvik 2022 (WIDIA metric): +${count} (from ${objs.length} total objects)`);
}

// ===== INDEXABLE TOOLS (Kennametal, ISCAR, Korloy, Allied) =====
{
  const content = fs.readFileSync(path.join(dataDir, 'indexable-tool-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'INDEXABLE_TOOLS');
  let count = 0;
  for (const obj of objs) {
    const desig = getField(obj, 'designation');
    const mfr = getField(obj, 'manufacturer');
    if (!desig || !mfr) continue;

    const type = getField(obj, 'type') || 'end_mill';

    // Determine if this is an insert or a tool body
    if (type.includes('insert')) {
      const ic = getField(obj, 'inscribed_circle_mm') || getField(obj, 'cutting_diameter_mm');
      if (!ic || ic <= 0) continue;
      const id = `IDX-${desig}`;
      if (existingIds.has(id)) continue;
      const th = getField(obj, 'thickness_mm') || ic * 0.35;
      if (addInsert(id, mfr, ic, th)) count++;
    } else {
      // Tool body (end mill, face mill, drill, etc.)
      const dc = getField(obj, 'cutting_diameter_mm');
      if (!dc || dc <= 0) continue;
      const id = `IDX-${desig}`;
      if (existingIds.has(id)) continue;
      const ds = getField(obj, 'shank_diameter_mm') || dc;
      const oal = getField(obj, 'overall_length_mm') || dc * 4;
      const loc = getField(obj, 'max_depth_of_cut_mm') || getField(obj, 'flute_length_mm') || dc * 1.5;
      const fc = getField(obj, 'insert_count') || 2;
      if (addTool(id, mfr, type, dc, ds, oal, loc, fc)) count++;
    }
  }
  report['Indexable'] = count;
  totalAdded += count;
  console.log(`  Indexable: +${count} (from ${objs.length} total objects)`);
}

// ===== TUNGALOY TURNING (inserts: turning, threading, grooving) =====
{
  const content = fs.readFileSync(path.join(dataDir, 'tungaloy-turning-catalog.ts'), 'utf8');
  let count = 0;

  // Turning inserts
  const turnObjs = extractObjects(content, 'TUNGALOY_TURNING_INSERTS');
  for (const obj of turnObjs) {
    const desig = getField(obj, 'designation');
    const ic = getField(obj, 'ic_mm');
    if (!desig || !ic || ic <= 0) continue;
    const id = `TT-${desig}`;
    if (existingIds.has(id)) continue;
    const th = getField(obj, 'thickness_mm') || ic * 0.35;
    if (addInsert(id, "Tungaloy", ic, th)) count++;
  }

  // Threading inserts
  const threadObjs = extractObjects(content, 'TUNGALOY_THREADING_INSERTS');
  for (const obj of threadObjs) {
    const desig = getField(obj, 'designation');
    const ic = getField(obj, 'ic_mm');
    if (!desig) continue;
    const id = `TTH-${desig}`;
    if (existingIds.has(id)) continue;
    const dim = ic || 11;
    const th = dim * 0.35;
    if (addInsert(id, "Tungaloy", dim, th)) count++;
  }

  // Grooving inserts
  const grooveObjs = extractObjects(content, 'TUNGALOY_GROOVING_INSERTS');
  for (const obj of grooveObjs) {
    const desig = getField(obj, 'designation');
    const w = getField(obj, 'width_mm');
    if (!desig) continue;
    const id = `TG-${desig}`;
    if (existingIds.has(id)) continue;
    const dim = w || 3;
    if (addInsert(id, "Tungaloy", dim, dim * 0.8)) count++;
  }

  report['Tungaloy_Turning'] = count;
  totalAdded += count;
  console.log(`  Tungaloy Turning: +${count} (from ${turnObjs.length}+${threadObjs.length}+${grooveObjs.length} objects)`);
}

// ===== TUNGALOY US (drills) =====
{
  const content = fs.readFileSync(path.join(dataDir, 'tungaloy-us-tool-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'TUNGALOY_US_TOOLS');
  let count = 0;
  for (const obj of objs) {
    const desig = getField(obj, 'designation');
    const dc = getField(obj, 'cutting_diameter_mm');
    if (!desig || !dc || dc <= 0) continue;
    const id = `TUS-${desig}`;
    if (existingIds.has(id)) continue;
    const ds = getField(obj, 'shank_diameter_mm') || dc;
    const oal = getField(obj, 'overall_length_mm') || dc * 5;
    const loc = getField(obj, 'flute_length_mm') || dc * 2;
    if (addTool(id, "Tungaloy", "drill", dc, ds, oal, loc, 2)) count++;
  }
  report['Tungaloy_US'] = count;
  totalAdded += count;
  console.log(`  Tungaloy US: +${count} (from ${objs.length} total objects)`);
}

// ===== GLOBAL CNC (toolholders - bushings, BMT, VDI) =====
{
  const content = fs.readFileSync(path.join(dataDir, 'global-cnc-tool-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'GLOBAL_CNC_TOOLS');
  let count = 0;
  for (const obj of objs) {
    const pn = getField(obj, 'partNumber');
    if (!pn) continue;
    const id = `GCNC-${pn}`;
    if (existingIds.has(id)) continue;
    const type = getField(obj, 'type') || 'holder';
    const subType = getField(obj, 'subType') || '';

    // Extract dimension from part number where possible
    let dim = 0;
    const mmMatch = pn.match(/(\d+)MM/i);
    const inchMatch = pn.match(/\.([\d]+)/);
    const numMatch = pn.match(/\b(\d{2,3})\b/);
    if (mmMatch) dim = parseInt(mmMatch[1]);
    else if (inchMatch) dim = parseFloat('0.' + inchMatch[1]) * 25.4;
    else if (numMatch && parseInt(numMatch[1]) <= 50) dim = parseInt(numMatch[1]);

    if (dim <= 0) dim = 25; // default holder dimension

    const oal = dim * 4;
    const loc = dim * 1.5;
    if (addTool(id, "Global CNC", "holder", dim, dim, oal, loc, 0, [
      { zone: "body", z_start: 0, z_end: r(loc), diameter: r(dim * 1.2) },
      { zone: "shank", z_start: r(loc), z_end: r(oal), diameter: r(dim) }
    ])) count++;
  }
  report['Global_CNC'] = count;
  totalAdded += count;
  console.log(`  Global CNC: +${count} (from ${objs.length} total objects)`);
}

// ===== SGS TOOLS =====
{
  const filePath = path.join(dataDir, 'sgs-tool-catalog.ts');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Try multiple array names
    let objs = extractObjects(content, 'SGS_TOOLS');
    if (objs.length === 0) objs = extractObjects(content, 'SGS_CATALOG');
    if (objs.length === 0) {
      // Try to find any exported array
      const arrMatch = content.match(/export\s+const\s+(\w+)\s*(?::[^=]*)?\s*=\s*\[/);
      if (arrMatch) objs = extractObjects(content, arrMatch[1]);
    }
    let count = 0;
    for (const obj of objs) {
      const desig = getField(obj, 'partNumber') || getField(obj, 'designation') || getField(obj, 'sku');
      const dc = getField(obj, 'diameter_mm') || getField(obj, 'cutting_diameter_mm') || getField(obj, 'DC');
      if (!desig || !dc || dc <= 0) continue;
      const id = `SGS-${desig}`;
      if (existingIds.has(id)) continue;
      const ds = getField(obj, 'shank_diameter_mm') || getField(obj, 'DCONMS') || dc;
      const oal = getField(obj, 'overall_length_mm') || getField(obj, 'OAL') || dc * 5;
      const loc = getField(obj, 'flute_length_mm') || getField(obj, 'LU') || dc * 2;
      const type = getField(obj, 'type') || 'end_mill';
      const fc = getField(obj, 'flute_count') || getField(obj, 'NOF') || 4;
      if (addTool(id, "SGS", type, dc, ds, oal, loc, fc)) count++;
    }
    report['SGS'] = count;
    totalAdded += count;
    console.log(`  SGS: +${count} (from ${objs.length} total objects)`);
  }
}

// ===== ADDITIONAL TOOLS (Flash, MA Ford, Korloy, YG-1, Rapidkut, Generic) =====
// These should already be covered but let's check for stragglers
{
  const content = fs.readFileSync(path.join(dataDir, 'additional-tool-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'ADDITIONAL_TOOLS');
  let count = 0;
  for (const obj of objs) {
    const desig = getField(obj, 'designation');
    const mfr = getField(obj, 'manufacturer');
    const dc = getField(obj, 'cutting_diameter_mm');
    if (!desig || !mfr || !dc || dc <= 0) continue;
    // Use same ID scheme as existing
    const prefix = mfr === 'Flash' ? 'FLH' : mfr === 'MA Ford' ? 'MAF' : mfr === 'Korloy' ? 'KOR' : mfr === 'YG-1' ? 'YG1' : mfr === 'Rapidkut' ? 'RPK' : mfr === 'Accupro' ? 'ACC' : 'GEN';
    const id = `${prefix}-${desig}`;
    if (existingIds.has(id)) continue;
    const ds = getField(obj, 'shank_diameter_mm') || dc;
    const oal = getField(obj, 'overall_length_mm') || dc * 5;
    const loc = getField(obj, 'flute_length_mm') || dc * 2;
    const type = getField(obj, 'type') || 'end_mill';
    const fc = getField(obj, 'flute_count') || 4;
    if (addTool(id, mfr, type, dc, ds, oal, loc, fc)) count++;
  }
  report['Additional'] = count;
  totalAdded += count;
  console.log(`  Additional: +${count} (from ${objs.length} total objects)`);
}

// ===== RE-PROCESS existing catalogs that may have gaps =====
// AMPC
{
  const content = fs.readFileSync(path.join(dataDir, 'ampc-tool-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'AMPC_TOOLS');
  let count = 0;
  for (const obj of objs) {
    const pn = getField(obj, 'partNumber');
    if (!pn) continue;
    let dc = getField(obj, 'diameterMm');
    if (!dc) {
      const inch = getField(obj, 'diameterInch');
      if (inch) dc = inch * 25.4;
    }
    if (!dc || dc <= 0) continue;
    const id = `AMPC-${pn}`;
    if (existingIds.has(id)) continue;
    const oal = dc * 5;
    const loc = dc * 3;
    if (addTool(id, "Allied Machine", getField(obj, 'type') || 'drill', dc, dc, oal, loc, 2)) count++;
  }
  report['AMPC'] = count;
  totalAdded += count;
  console.log(`  AMPC: +${count} (from ${objs.length} total objects)`);
}

// Ingersoll
{
  const content = fs.readFileSync(path.join(dataDir, 'ingersoll-tool-catalog.ts'), 'utf8');
  let count = 0;

  const toolObjs = extractObjects(content, 'INGERSOLL_TOOLS');
  for (const obj of toolObjs) {
    const desig = getField(obj, 'designation');
    const dc = getField(obj, 'diameter_mm');
    if (!desig || !dc || dc <= 0) continue;
    const id = `ING-${desig}`;
    if (existingIds.has(id)) continue;
    const ds = getField(obj, 'shank_diameter_mm') || dc;
    const oal = getField(obj, 'overall_length_mm') || dc * 5;
    const loc = getField(obj, 'cutting_length_mm') || dc * 2;
    const type = getField(obj, 'type') || 'end_mill';
    if (addTool(id, "Ingersoll", type, dc, ds, oal, loc, type.includes('mill') ? 4 : 2)) count++;
  }

  const insObjs = extractObjects(content, 'INGERSOLL_INSERTS');
  for (const obj of insObjs) {
    const code = getField(obj, 'code') || getField(obj, 'designation');
    const ic = getField(obj, 'ic_mm') || getField(obj, 'diameter_mm');
    if (!code || !ic || ic <= 0) continue;
    const id = `ING-INS-${code}`;
    if (existingIds.has(id)) continue;
    const th = getField(obj, 'thickness_mm') || ic * 0.3;
    if (addInsert(id, "Ingersoll", ic, th)) count++;
  }

  report['Ingersoll'] = count;
  totalAdded += count;
  console.log(`  Ingersoll: +${count} (from ${toolObjs.length}+${insObjs.length} objects)`);
}

// Zenit
{
  const content = fs.readFileSync(path.join(dataDir, 'zenit-tool-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'ZENIT_TOOLS');
  let count = 0;
  for (const obj of objs) {
    const code = getField(obj, 'code');
    if (!code) continue;
    const dMatch = obj.match(/D\s*:\s*([\d.]+)/);
    const dc = dMatch ? parseFloat(dMatch[1]) * 25.4 : 0;
    if (dc <= 0) continue;
    const id = `ZEN-${code}`;
    if (existingIds.has(id)) continue;
    const bMatch = obj.match(/B\s*:\s*([\d.]+)/);
    const cMatch = obj.match(/C\s*:\s*([\d.]+)/);
    const loc = bMatch ? parseFloat(bMatch[1]) * 25.4 : dc * 1.5;
    const oal = cMatch ? parseFloat(cMatch[1]) * 25.4 : dc * 4;
    const type = getField(obj, 'tool_type') || 'end_mill';
    if (addTool(id, "Zenit", type, dc, dc, oal, loc, type.includes('drill') ? 2 : 4)) count++;
  }
  report['Zenit'] = count;
  totalAdded += count;
  console.log(`  Zenit: +${count} (from ${objs.length} total objects)`);
}

// OSG
{
  const filePath = path.join(dataDir, 'osg-tool-catalog.ts');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const objs = extractObjects(content, 'OSG_TOOLS');
    let count = 0;
    for (const obj of objs) {
      const desig = getField(obj, 'designation') || getField(obj, 'partNumber');
      const dc = getField(obj, 'diameter_mm') || getField(obj, 'cutting_diameter_mm');
      if (!desig || !dc || dc <= 0) continue;
      const id = `OSG-${desig}`;
      if (existingIds.has(id)) continue;
      const ds = getField(obj, 'shank_diameter_mm') || dc;
      const oal = getField(obj, 'overall_length_mm') || dc * 5;
      const loc = getField(obj, 'flute_length_mm') || dc * 2;
      const type = getField(obj, 'type') || 'end_mill';
      const fc = getField(obj, 'flute_count') || (type === 'drill' ? 2 : type === 'tap' ? 3 : 4);
      if (addTool(id, "OSG", type, dc, ds, oal, loc, fc)) count++;
    }
    report['OSG'] = count;
    totalAdded += count;
    console.log(`  OSG: +${count} (from ${objs.length} total objects)`);
  }
}

// Guhring
{
  const filePath = path.join(dataDir, 'guhring-tool-catalog.ts');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const objs = extractObjects(content, 'GUHRING_TOOLS');
    let count = 0;
    for (const obj of objs) {
      const desig = getField(obj, 'designation') || getField(obj, 'partNumber') || getField(obj, 'orderCode');
      const dc = getField(obj, 'diameter_mm') || getField(obj, 'cutting_diameter_mm') || getField(obj, 'DC');
      if (!desig || !dc || dc <= 0) continue;
      const id = `GUH-${desig}`;
      if (existingIds.has(id)) continue;
      const ds = getField(obj, 'shank_diameter_mm') || getField(obj, 'DCONMS') || dc;
      const oal = getField(obj, 'overall_length_mm') || getField(obj, 'OAL') || dc * 5;
      const loc = getField(obj, 'flute_length_mm') || getField(obj, 'LU') || dc * 2;
      const type = getField(obj, 'type') || 'drill';
      const fc = getField(obj, 'flute_count') || getField(obj, 'NOF') || (type === 'drill' ? 2 : 4);
      if (addTool(id, "Guhring", type, dc, ds, oal, loc, fc)) count++;
    }
    report['Guhring'] = count;
    totalAdded += count;
    console.log(`  Guhring: +${count} (from ${objs.length} total objects)`);
  }
}

// Sandvik (original)
{
  const filePath = path.join(dataDir, 'sandvik-tool-catalog.ts');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const objs = extractObjects(content, 'SANDVIK_TOOLS');
    let count = 0;
    for (const obj of objs) {
      const desig = getField(obj, 'designation') || getField(obj, 'orderCode') || getField(obj, 'partNumber');
      const dc = getField(obj, 'diameter_mm') || getField(obj, 'cutting_diameter_mm') || getField(obj, 'DC');
      if (!desig || !dc || dc <= 0) continue;
      const id = `SDK-${desig}`;
      if (existingIds.has(id)) continue;
      const ds = getField(obj, 'shank_diameter_mm') || getField(obj, 'DCONMS') || dc;
      const oal = getField(obj, 'overall_length_mm') || getField(obj, 'OAL') || dc * 5;
      const loc = getField(obj, 'flute_length_mm') || getField(obj, 'LU') || dc * 2;
      const type = getField(obj, 'type') || 'end_mill';
      const fc = getField(obj, 'flute_count') || getField(obj, 'NOF') || 4;
      if (addTool(id, "Sandvik", type, dc, ds, oal, loc, fc)) count++;
    }
    report['Sandvik'] = count;
    totalAdded += count;
    console.log(`  Sandvik: +${count} (from ${objs.length} total objects)`);
  }
}

// Seco
{
  const filePath = path.join(dataDir, 'seco-tool-catalog.ts');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const objs = extractObjects(content, 'SECO_TOOLS');
    let count = 0;
    for (const obj of objs) {
      const desig = getField(obj, 'designation') || getField(obj, 'orderCode');
      const dc = getField(obj, 'diameter_mm') || getField(obj, 'cutting_diameter_mm') || getField(obj, 'DC');
      if (!desig || !dc || dc <= 0) continue;
      const id = `SEC-${desig}`;
      if (existingIds.has(id)) continue;
      const ds = getField(obj, 'shank_diameter_mm') || getField(obj, 'DCONMS') || dc;
      const oal = getField(obj, 'overall_length_mm') || getField(obj, 'OAL') || dc * 5;
      const loc = getField(obj, 'flute_length_mm') || getField(obj, 'LU') || dc * 2;
      const type = getField(obj, 'type') || 'end_mill';
      const fc = getField(obj, 'flute_count') || getField(obj, 'NOF') || 4;
      if (addTool(id, "Seco", type, dc, ds, oal, loc, fc)) count++;
    }
    report['Seco'] = count;
    totalAdded += count;
    console.log(`  Seco: +${count} (from ${objs.length} total objects)`);
  }
}

// CAMFIX
{
  const filePath = path.join(dataDir, 'camfix-tool-catalog.ts');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Try multiple array names
    let objs = extractObjects(content, 'CAMFIX_TOOLS');
    if (objs.length === 0) {
      const arrMatch = content.match(/export\s+const\s+(\w+)\s*(?::[^=]*)?\s*=\s*\[/);
      if (arrMatch) objs = extractObjects(content, arrMatch[1]);
    }
    let count = 0;
    for (const obj of objs) {
      const desig = getField(obj, 'designation') || getField(obj, 'partNumber') || getField(obj, 'orderCode');
      const dc = getField(obj, 'diameter_mm') || getField(obj, 'cutting_diameter_mm') || getField(obj, 'DC');
      if (!desig || !dc || dc <= 0) continue;
      const id = `CFX-${desig}`;
      if (existingIds.has(id)) continue;
      const ds = getField(obj, 'shank_diameter_mm') || getField(obj, 'DCONMS') || dc;
      const oal = getField(obj, 'overall_length_mm') || getField(obj, 'OAL') || dc * 5;
      const loc = getField(obj, 'flute_length_mm') || getField(obj, 'LU') || dc * 2;
      const type = getField(obj, 'type') || 'end_mill';
      if (addTool(id, "CAMFIX", type, dc, ds, oal, loc, 4)) count++;
    }
    report['CAMFIX'] = count;
    totalAdded += count;
    console.log(`  CAMFIX: +${count} (from ${objs.length} total objects)`);
  }
}

// ===== SUMMARY =====
console.log(`\n=== RESULTS ===`);
console.log(`Before: ${beforeCount}`);
console.log(`Added:  ${totalAdded}`);
const afterCount = existingData.tools.length;
console.log(`After:  ${afterCount}`);
console.log(`Coverage: ${afterCount} / 94177 = ${(afterCount / 94177 * 100).toFixed(1)}%`);

console.log(`\nPer-catalog breakdown:`);
for (const [cat, n] of Object.entries(report).sort((a, b) => b[1] - a[1])) {
  if (n > 0) console.log(`  ${cat}: +${n}`);
}

// Write output
existingData.total_tools = afterCount;
existingData.data_completeness = `${(afterCount / 94177 * 100).toFixed(1)}% of 94,177 catalog tools`;
existingData.tools.sort((a, b) => a.mfg.localeCompare(b.mfg) || a.dc - b.dc);
fs.writeFileSync(existingPath, JSON.stringify(existingData));
const sizeKB = Math.round(fs.statSync(existingPath).size / 1024);
console.log(`\nWrote ${existingPath}`);
console.log(`Final: ${afterCount} tools, ${sizeKB} KB`);
