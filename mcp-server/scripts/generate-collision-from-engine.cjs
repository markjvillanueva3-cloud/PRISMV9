#!/usr/bin/env node
/**
 * Generate collision data for new catalogs not covered by the Python script.
 * Merges into existing collision-avoidance-data.json.
 */

const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '..', 'src', 'data');

const existingPath = path.join(dataDir, 'collision-avoidance-data.json');
const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
const existingIds = new Set(existingData.tools.map(t => t.id));
console.log(`Existing collision data: ${existingData.tools.length} tools`);

// Helper: extract field value (handles both quoted and unquoted keys, with/without spaces)
function getField(obj, field) {
  // Try key:"value" and key: "value"
  const strMatch = obj.match(new RegExp(`["']?${field}["']?\\s*:\\s*"([^"]*)"`, 'i'));
  if (strMatch) return strMatch[1];
  // Try key:number and key: number
  const numMatch = obj.match(new RegExp(`["']?${field}["']?\\s*:\\s*([\\d.]+)`, 'i'));
  if (numMatch) return parseFloat(numMatch[1]);
  return null;
}

function r(v) { return Math.round(v * 100) / 100; }

function makeCollisionRecord(id, mfg, type, dc, ds, oal, loc, fc) {
  return {
    id, mfg, type,
    dc: r(dc), ds: r(ds), oal: r(oal), loc: r(loc), fc,
    zones: [
      { zone: "cutting", z_start: 0, z_end: r(loc), diameter: r(dc) },
      { zone: "shank", z_start: r(loc), z_end: r(oal), diameter: r(ds) }
    ]
  };
}

// Extract objects from array in TS content
function extractObjects(content, arrayName) {
  const pattern = arrayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(pattern + '\\s*(?::[^=]*)?=\\s*\\['));
  if (!match) { console.log(`  [WARN] Array "${arrayName}" not found`); return []; }
  // Find the [ that's part of "= [", not type annotation like "Tool[]"
  const eqPos = content.indexOf('=', match.index);
  const arrStart = content.indexOf('[', eqPos);
  let depth = 0;
  const objects = [];
  let objStart = -1;
  for (let i = arrStart; i < content.length; i++) {
    const ch = content[i];
    if (ch === '[') { depth++; }
    else if (ch === ']') { depth--; if (depth === 0) break; }
    else if (ch === '{') { if (depth === 1) objStart = i; }
    else if (ch === '}' && depth === 1 && objStart >= 0) { objects.push(content.substring(objStart, i + 1)); objStart = -1; }
  }
  return objects;
}

let added = 0;

// === INGERSOLL ===
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
    existingData.tools.push(makeCollisionRecord(id, "Ingersoll", type, dc, ds, oal, loc, type.includes('mill') ? 4 : 2));
    existingIds.add(id);
    count++;
  }

  const insObjs = extractObjects(content, 'INGERSOLL_INSERTS');
  for (const obj of insObjs) {
    const code = getField(obj, 'code') || getField(obj, 'designation');
    const ic = getField(obj, 'ic_mm') || getField(obj, 'diameter_mm');
    if (!code || !ic || ic <= 0) continue;
    const id = `ING-INS-${code}`;
    if (existingIds.has(id)) continue;
    const th = getField(obj, 'thickness_mm') || ic * 0.3;
    existingData.tools.push({
      id, mfg: "Ingersoll", type: "insert", dc: r(ic), ds: r(ic), oal: r(th), loc: r(th), fc: 1,
      zones: [{ zone: "cutting", z_start: 0, z_end: r(th), diameter: r(ic) }]
    });
    existingIds.add(id);
    count++;
  }
  console.log(`  Ingersoll: ${count} tools added (from ${toolObjs.length} tools + ${insObjs.length} inserts)`);
  added += count;
}

// === EMUGE ===
{
  const content = fs.readFileSync(path.join(dataDir, 'emuge-tool-catalog.ts'), 'utf8');
  const objs = extractObjects(content, 'EMUGE_TOOLS');
  let count = 0;
  for (const obj of objs) {
    const desig = getField(obj, 'designation') || getField(obj, 'partNumber');
    const dc = getField(obj, 'diameter_mm') || getField(obj, 'diameterMm');
    if (!desig || !dc || dc <= 0) continue;
    const id = `EMG-${desig}`;
    if (existingIds.has(id)) continue;
    const ds = getField(obj, 'shank_diameter_mm') || getField(obj, 'shankDiameterMm') || dc;
    const oal = getField(obj, 'overall_length_mm') || getField(obj, 'overallLengthMm') || dc * 5;
    const loc = getField(obj, 'flute_length_mm') || getField(obj, 'fluteLengthMm') || dc * 2;
    const type = getField(obj, 'type') || 'tap';
    existingData.tools.push(makeCollisionRecord(id, "EMUGE", type, dc, ds, oal, loc, type === 'drill' ? 2 : type === 'tap' ? 3 : 4));
    existingIds.add(id);
    count++;
  }
  console.log(`  EMUGE: ${count} tools added (from ${objs.length} objects)`);
  added += count;
}

// === AMPC ===
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
    existingData.tools.push(makeCollisionRecord(id, "Allied Machine", getField(obj, 'type') || 'drill', dc, dc, oal, loc, 2));
    existingIds.add(id);
    count++;
  }
  console.log(`  AMPC: ${count} tools added (from ${objs.length} objects)`);
  added += count;
}

// === ZENIT ===
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
    existingData.tools.push(makeCollisionRecord(id, "Zenit", type, dc, dc, oal, loc, type.includes('drill') ? 2 : 4));
    existingIds.add(id);
    count++;
  }
  console.log(`  Zenit: ${count} tools added (from ${objs.length} objects)`);
  added += count;
}

console.log(`  REGO-FIX: skipped (holders)`);
console.log(`  Global CNC: skipped (lathe toolholders)`);
console.log(`\nTotal added: ${added}`);

existingData.total_tools = existingData.tools.length;
existingData.tools.sort((a, b) => a.mfg.localeCompare(b.mfg) || a.dc - b.dc);
fs.writeFileSync(existingPath, JSON.stringify(existingData));
const sizeKB = Math.round(fs.statSync(existingPath).size / 1024);
console.log(`Updated collision-avoidance-data.json: ${existingData.tools.length} tools, ${sizeKB} KB`);
