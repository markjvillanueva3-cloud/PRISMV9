#!/usr/bin/env node
/**
 * build_index.mjs - MS0-T6: Build MASTER_EXTRACTION_INDEX_V2.json
 *
 * Reads MS0_RAW_SCAN.csv and MS0_CROSS_REFERENCE.json, produces a
 * comprehensive index of all 536 extracted PRISM modules with IDs,
 * complexity ratings, safety classes, and integration wave assignments.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = __dirname; // C:\PRISM\state

// ---------------------------------------------------------------------------
// 1. Read inputs
// ---------------------------------------------------------------------------
const csvPath = join(STATE_DIR, 'MS0_RAW_SCAN.csv');
const xrefPath = join(STATE_DIR, 'MS0_CROSS_REFERENCE.json');

const csvRaw = readFileSync(csvPath, 'utf-8').trim();
const xref = JSON.parse(readFileSync(xrefPath, 'utf-8'));
const mapping = xref.category_to_target_mapping;

// ---------------------------------------------------------------------------
// 2. Parse CSV rows
//    Format varies:
//      - Simple:  category|filename.js|name|lines|bytes|first_line
//      - SubCat:  category|subcategory|name|lines|bytes|first_line
//    Detect: if field[1] contains ".js", it is a filename (no subcategory).
//    Otherwise field[1] is a subcategory.
// ---------------------------------------------------------------------------
const csvLines = csvRaw.split('\n').filter(l => l.trim().length > 0);

console.log(`CSV lines read: ${csvLines.length}`);
if (csvLines.length !== 536) {
  console.warn(`WARNING: Expected 536 lines, got ${csvLines.length}`);
}

/**
 * Determine the cross-reference key for a given category + subcategory.
 *
 * Rules from the task spec:
 *   - engines  -> "engines/{subcategory}"  e.g. "engines/physics"
 *   - others   -> just the category        e.g. "algorithms", "materials"
 *
 * Special cases:
 *   - "engines" rows with NO subcategory (bare engine files):
 *     These are physics-adjacent files at engines root. We try matching
 *     by inspecting the filename for keywords; fallback to a sensible default.
 *   - "machines" has subcategories like CORE, ENHANCED, LEVEL5, or bare files.
 *     Cross-ref key is just "machines".
 *   - "materials" has subcategories like K_CAST_IRON, M_STAINLESS, P_STEELS,
 *     N_NONFERROUS, S_SUPERALLOYS, or bare files. Cross-ref key is "materials".
 *   - "materials_complete", "materials_enhanced", "materials_v9_complete" have
 *     their own top-level cross-ref keys.
 */
/**
 * For the 18 "bare" engine files (no subcategory in CSV), we classify them
 * by filename keywords into the correct engine sub-category so they get the
 * right safety_class and integration_wave from the cross-reference.
 */
const BARE_ENGINE_CLASSIFICATION = {
  // Physics engines (CRITICAL, Wave 1)
  'PRISM_CUTTING_PHYSICS':                  'physics',
  'PRISM_CUTTING_MECHANICS_ENGINE':         'physics',
  'PRISM_CUTTING_THERMAL_ENGINE':           'physics',
  'PRISM_HEAT_TRANSFER_ENGINE':             'physics',
  'PRISM_JOHNSON_COOK_DATABASE':            'physics',
  'PRISM_RIGID_BODY_DYNAMICS_ENGINE':       'physics',
  'PRISM_ADVANCED_KINEMATICS_ENGINE':       'physics',
  'PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE': 'physics',
  'PRISM_PHASE3_MANUFACTURING_PHYSICS':     'physics',

  // Vibration engines (CRITICAL, Wave 1)
  'PRISM_CHATTER_PREDICTION_ENGINE':        'vibration',
  'PRISM_VIBRATION_ANALYSIS_ENGINE':        'vibration',
  'PRISM_PHASE3_ADVANCED_SIGNAL':           'vibration',

  // Quality engines (HIGH, Wave 2)
  'PRISM_SURFACE_FINISH_ENGINE':            'quality',

  // Optimization engines (HIGH, Wave 2)
  'PRISM_PHASE1_SPEED_FEED_CALCULATOR':     'optimization',

  // CAD/CAM engines (MEDIUM, Wave 3)
  'PRISM_THERMAL_EXPANSION_ENGINE':         'cad_cam',
  'PRISM_THERMAL_MODELING':                 'cad_cam',
  'PRISM_TOOL_LIFE_ENGINE':                 'tools',
  'SPEED_FEED_UI':                          'business',
};

function getCrossRefKey(category, subcategory, name) {
  if (category === 'engines' && subcategory) {
    // subcategory is e.g. "ai_complete", "physics", "post_processor"
    return `engines/${subcategory}`;
  }
  if (category === 'engines' && !subcategory) {
    // Bare engine files - classify by name keywords
    const mapped = BARE_ENGINE_CLASSIFICATION[name];
    if (mapped) return `engines/${mapped}`;
    // Fallback: physics (most bare engines are physics-related)
    return 'engines/physics';
  }
  // For everything else (algorithms, materials, machines, formulas, etc.)
  // the cross-ref key is just the category name.
  return category;
}

// ---------------------------------------------------------------------------
// 3. Build module entries
// ---------------------------------------------------------------------------
const modules = [];

for (let i = 0; i < csvLines.length; i++) {
  const line = csvLines[i];
  // Split only the first 5 pipes (6 fields). The 6th field (first_line) may contain pipes.
  const parts = line.split('|');

  let category, subcategory, rawFilename, name, lines, bytes;

  // Detect if field[1] is a filename (.js suffix) or a subcategory
  const field1 = parts[1];
  const field1IsFile = field1.includes('.js');

  if (field1IsFile) {
    // Format: category|filename.js|name|lines|bytes|first_line
    category = parts[0];
    subcategory = null;
    rawFilename = parts[1];
    name = parts[2];
    lines = parseInt(parts[3], 10);
    bytes = parseInt(parts[4], 10);
  } else {
    // Format: category|subcategory|name|lines|bytes|first_line
    category = parts[0];
    subcategory = parts[1];
    name = parts[2];
    lines = parseInt(parts[3], 10);
    bytes = parseInt(parts[4], 10);
    rawFilename = name + '.js';
  }

  // Sequential ID: EXT-001 through EXT-536
  const id = `EXT-${String(i + 1).padStart(3, '0')}`;

  // Filename: ensure .js extension
  const filename = rawFilename.endsWith('.js') ? rawFilename : rawFilename + '.js';

  // Size in KB
  const sizeKb = Math.round((bytes / 1024) * 100) / 100;

  // Complexity: S (<200), M (200-500), L (500-1000), XL (1000+)
  let complexity;
  if (lines < 200) complexity = 'S';
  else if (lines <= 500) complexity = 'M';
  else if (lines <= 1000) complexity = 'L';
  else complexity = 'XL';

  // Build extracted path
  let path;
  if (category === 'engines' && subcategory) {
    path = `extracted/engines/${subcategory}/${filename}`;
  } else if (subcategory) {
    // materials/K_CAST_IRON, machines/CORE, etc.
    path = `extracted/${category}/${subcategory}/${filename}`;
  } else {
    path = `extracted/${category}/${filename}`;
  }

  // Cross-reference lookup
  const xrefKey = getCrossRefKey(category, subcategory, name);
  const xrefEntry = mapping[xrefKey];

  let safetyClass = 'MEDIUM';
  let integrationWave = 3;
  let mcpTargets = [];

  if (xrefEntry) {
    safetyClass = xrefEntry.safety_class;
    integrationWave = xrefEntry.integration_wave;
    mcpTargets = xrefEntry.mcp_targets || [];
  } else {
    console.warn(`  No cross-ref for key "${xrefKey}" (line ${i + 1}: ${name})`);
  }

  modules.push({
    id,
    name,
    filename,
    category,
    subcategory: subcategory || null,
    path,
    lines,
    size_kb: sizeKb,
    complexity,
    safety_class: safetyClass,
    integration_wave: integrationWave,
    mcp_targets: mcpTargets,
    wired_status: 'UNWIRED',
    feature_id: null
  });
}

// ---------------------------------------------------------------------------
// 4. Build summary statistics
// ---------------------------------------------------------------------------
const totalLines = modules.reduce((s, m) => s + m.lines, 0);
const totalSizeKb = Math.round(modules.reduce((s, m) => s + m.size_kb, 0) * 100) / 100;

function countBy(arr, field) {
  const counts = {};
  for (const item of arr) {
    const key = String(item[field]);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

const categories = countBy(modules, 'category');
const bySafetyClass = countBy(modules, 'safety_class');
const byIntegrationWave = countBy(modules, 'integration_wave');
const byComplexity = countBy(modules, 'complexity');

// ---------------------------------------------------------------------------
// 5. Write output
// ---------------------------------------------------------------------------
const output = {
  generated: '2026-02-23',
  version: '3.0',
  description: `Complete extraction inventory: ${modules.length} modules classified`,
  summary: {
    total_files: modules.length,
    total_lines: totalLines,
    total_size_kb: totalSizeKb,
    categories,
    by_safety_class: bySafetyClass,
    by_integration_wave: byIntegrationWave,
    by_complexity: byComplexity
  },
  modules
};

const outPath = join(STATE_DIR, 'MASTER_EXTRACTION_INDEX_V2.json');
writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

// ---------------------------------------------------------------------------
// 6. Print summary
// ---------------------------------------------------------------------------
console.log('\n=== MASTER_EXTRACTION_INDEX_V2.json Generated ===');
console.log(`Total modules: ${modules.length}`);
console.log(`Total lines:   ${totalLines.toLocaleString()}`);
console.log(`Total size:    ${totalSizeKb.toLocaleString()} KB`);

console.log('\n--- Category Distribution ---');
const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
for (const [cat, count] of sortedCats) {
  console.log(`  ${cat.padEnd(25)} ${String(count).padStart(4)}`);
}

console.log('\n--- Safety Class Distribution ---');
const safetyOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
for (const sc of safetyOrder) {
  console.log(`  ${sc.padEnd(12)} ${String(bySafetyClass[sc] || 0).padStart(4)}`);
}

console.log('\n--- Integration Wave Distribution ---');
for (const w of ['1', '2', '3', '4']) {
  console.log(`  Wave ${w}       ${String(byIntegrationWave[w] || 0).padStart(4)}`);
}

console.log('\n--- Complexity Distribution ---');
for (const c of ['S', 'M', 'L', 'XL']) {
  console.log(`  ${c.padEnd(4)}          ${String(byComplexity[c] || 0).padStart(4)}`);
}

console.log(`\nOutput written to: ${outPath}`);
